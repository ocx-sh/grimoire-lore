---
title: "Go modules — what a module declares and depends on (consolidation)"
topic: "go.mod/go.work directive policy, dependency hygiene, superseded modules, vulnerability triage, CI toolchain selection"
model: opus
id_family: GO-MOD
consolidates:
  - go-modules/directives-and-toolchain.md
  - go-modules/dependency-hygiene.md
  - go-gates/gate-commands.md (sections 4, 5, 7 only — tidy -diff, govulncheck formats, tool-directive leakage; GO-GATE owns the rest)
  - go-audit/exemplar-modules-and-release.md (sections 1, 2, 5)
  - go-audit/exemplar-quality-gates.md (sections 1, 3)
  - go-audit/config-inventory.md (sections 3, 5)
  - go-topic-map.md (section L rows M-L-01..19, M-I-01..02, M-K-04; conflicts 12 and 21; orchestrator decisions Q1, Q2)
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/go-modules/
date: 2026-09-26
---

# Go modules — what a module declares and depends on

All version claims hold for Go 1.27.1, golangci-lint 2.14.0 and govulncheck
v1.8.0 as installed on 2026-09-26. "Run" means the check was watched red on a
planted violation and green on a compliant twin. The consolidation's own runs
are listed as **C1–C8** under [Consolidation verification runs](#consolidation-verification-runs).
Dive runs are cited as **[DT n]** for directives-and-toolchain,
**[DH n]** for dependency-hygiene and **[GC §n]** for gate-commands.

## Verdict

1. **The `go` line depends on the code kind.** A library or the SDK declares the oldest supported release's `.0`, which is `go 1.26.0` today, or lower if its code needs less. A CLI declares the current release's `.0`, which is `go 1.27.0`. This is the owner's Q1 default and it binds. `go mod init` on 1.27.1 writes `go 1.27.1` ([DT 3]), so a freshly created library must be lowered by hand.
2. **Libraries and the SDK never carry a `toolchain` line.** A CLI carries exactly one, `toolchain go1.27.N` naming the latest patch, because that line is what makes its CI build releases with a patched stdlib. This resolves the conflict between the dives' "minority practice, avoid" and Q1's "unless it pins a security patch" (conflict 1 below).
3. **`go.work` is committed only in a multi-module repository, and every member module must build and test from its own root with `GOWORK=off`.** The directives dive said the opposite ("CI never builds with `GOWORK=off`"). go.dev says CI should not use `go.work`, so the dive is overturned (conflict 2).
4. **Nothing third-party enters a library's `replace` block.** A library or the SDK has no `replace` at all. A multi-module repository's replaces are local-path only. A vulnerability is never fixed with `replace`.
5. **The superseded-module table is enforced by one shared depguard deny list, not by prose.** Deprecations that depend on the `go` line (`google/uuid` → stdlib `uuid` at go ≥1.27, `automaxprocs` gone at go ≥1.25) are review items, because depguard cannot see the `go` line.
6. **The SDK's runtime import graph is stdlib-only.** This is checked with `go list -deps` on `.Module.Main`, which excludes test-only dependencies such as go-cmp by construction. The dependency-hygiene dive's check was wrong on both counts (conflict 3).
7. **govulncheck triage is reachability-first.** A finding with a trace blocks the release and is fixed by an upgrade. A finding without a trace is scheduled. Only text format gates the job.
8. **CI selects its Go version so that release binaries are built with the latest patch.** Libraries test on `[oldstable, stable]`. CLIs use `go-version-file`, which reads the `toolchain` line. `go-version-file` pointed at a bare `go 1.N.0` line installs exactly `1.N.0`, per setup-go's own docs (conflict 4).

## The ruleset

Each check family catches its rows mechanically. Rows 14–18 are reading heuristics, and each says why.

### GO-MOD — rows caught by the go command itself (`go build`, `go mod tidy -diff`, `go vet`)

| ID | Rule | Rationale (the failure it prevents) | Verification | Run | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-MOD-01 | Declare the `go` line by code kind. A library or SDK uses the oldest supported release's `.0` (`go 1.26.0` today) or lower, and never a patch-level floor. A CLI uses the current release's `.0` (`go 1.27.0`). Before lowering a floor, run `go vet ./...` so that `stdversion` names the first API that needs a higher line. | Since 1.21 the line is a hard minimum that refuses older toolchains ([DT 1]). A library at `go 1.27.1`, which `go mod init` writes ([DT 3]), forces every consumer onto 1.27.1. A floor below the APIs actually used breaks consumers on the older release. | Library floor: `v=$(go list -m -f '{{.GoVersion}}') && test -n "$v" && test "$(printf '%s\n1.26.0\n' "$v" \| sort -V \| tail -n1)" = 1.26.0`. Floor honesty: `go vet ./...` (stdversion), and on 1.27 `go test ./...` too. | yes: C1 (`floor-violation` exit 1 / `floor-ok` exit 0); [DT 4] (`stdversion` exit 1 / 0 under vet and test) | MUST | go 1.21 (hard floor); `go test` runs stdversion from 1.27 |
| GO-MOD-02 | Never write a `toolchain` line in a library or SDK. In a CLI, write exactly one line, `toolchain go1.27.N` with N the latest patch and strictly above the `go` line. Bump it with `go get toolchain@go1.27.N`, never by hand-editing. | A `toolchain` line only has an effect in the main module (go.dev/ref/mod), so in a library it is noise that goes stale. A hand-added line equal to the `go` line makes every `-mod=readonly` build fail with `updates to go.mod needed`. | `grep -n '^toolchain' go.mod`: any output in a library is the finding. `go mod tidy -diff` then catches a redundant line in any module. | yes: C2 (`lib-toolchain` grep exit 0 / `floor-ok` exit 1); C3 (`toolchain-redundant`: `go build` exit 1, `go mod tidy -diff` exit 1 / twin exit 0) | MUST | go 1.21 |
| GO-MOD-03 | Commit `go.sum`. Gate CI on `go mod tidy -diff`. Leave `-mod=readonly` as the build default and never set `-mod=mod` or `GOFLAGS=-mod=mod` in CI. | `-mod=mod` quietly repairs a stale `go.mod` in CI, so drift never fails a build. `-diff` fails without mutating the tree. | `go mod tidy -diff` (exit 0 with empty output is the pass). `go build -mod=readonly ./...`. `grep -rn -e '-mod=mod' .github Makefile` (empty is the pass). | yes: [GC §4] (`tidy-stale` exit 1 / `tidy-clean` exit 0); [DH 7] (`readonly-violation` exit 1 / clean exit 0) | MUST | `tidy -diff` go 1.23; readonly default go 1.16 |
| GO-MOD-04 | A `godebug` line in `go.mod` or `go.work` names only a setting that still exists. A setting removed by the running toolchain is either set to its final value or deleted. Pin runtime compatibility with `godebug` in `go.mod`, not with `GODEBUG=` in a Dockerfile or CI env. | From 1.27 the go command rejects a removed setting at its old value when it loads `go.mod`. A `GODEBUG=` env var naming a removed setting is silently inert at runtime. | `go build ./...`: the error `removed GODEBUG "<name>" set to old value` is the finding. | yes: [DT 5] (`asynctimerchan=1` exit 1 / `=0` exit 0) | MUST | directive go 1.23; rejection go 1.27 |
| GO-MOD-05 | Commit `go.work` only in a multi-module repository, never in a single-module repository, the SDK or a CLI. In a repository that commits one, CI also builds and tests every member module from its own root with `GOWORK=off`. A member that resolves a sibling only through `use` gets a local-path `replace` or a published version. Commit `go.work.sum` when the go command writes it; its absence is not a defect. | go.dev: CI "should generally not be allowed to use the go.work file so that they can test the behavior of the module as it would be used when required by other modules". A `use`-only sibling builds in the workspace and breaks for every consumer. | For each module root: `(cd <root> && GOWORK=off go build ./... && GOWORK=off go test ./...)`. For the single-module case: `find . -name go.work -not -path '*/vendor/*' -print` alongside a single `go.mod`. | yes: C4 (`gowork/modA` `GOWORK=off` exit 1 `missing go.sum entry` / `gowork-replaced/modA` exit 0; the workspace build wrote no `go.work.sum`) and [DT 6] | MUST | `go.work` go 1.18 |
| GO-MOD-06 | Every repository-wide gate (vet, golangci-lint, test, govulncheck, tidy) runs once per `go.mod` root, not once as `./...` at the repository root. | A nested module is invisible to the parent's `./...`, so the gate passes while it skips that module. | `find . -name go.mod -not -path '*/vendor/*' -not -path '*/testdata/*' -print0 \| xargs -r -0 -n1 dirname`: more than one line means a single root invocation is the finding. | yes: [DT 7] (`go list ./...` at root omits `sub`; inside `sub` it lists it) | MUST | — |

### GO-MOD — rows caught by grep over `go.mod`, or by depguard over imports

| ID | Rule | Rationale | Verification | Run | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-MOD-07 | A library or SDK `go.mod` contains no `replace`. A multi-module repository's `replace` targets are local paths only (`./`, `../`). Never answer a vulnerability or a bug with `replace X => fork`; upgrade instead, or fork under a new module path and change the imports. | `replace` applies only in the main module, so every consumer silently gets the real dependency ([DH 1]: `liba` prints `FORK…`, `consumer` prints `REAL`). | Library: `grep -n '=>' go.mod` (any output is the finding). Multi-module repository: `grep -nE '=>[[:space:]]*[^./[:space:]]' go.mod` (any output is a non-local swap). | yes: [DH 2] (library grep exit 0 / 1); C5 (`replace-monorepo-forkswap` exit 0 / `replace-monorepo-ok` exit 1; on the exemplars syncthing is red, etcd, kubernetes and terraform are green) | MUST | — |
| GO-MOD-08 | Configure one shared golangci-lint `depguard` rule, `superseded`, on `files: ["$all"]`, whose `deny` list holds every entry below with a `desc` naming the replacement: `github.com/pkg/errors`, `golang.org/x/xerrors` → stdlib `errors`/`%w` (1.13); `io/ioutil` → `io`/`os` (1.16); `golang.org/x/exp/slices`, `golang.org/x/exp/maps` → stdlib (1.21; deny these two packages, never all of `x/exp`); `github.com/golang/mock` → `go.uber.org/mock` (archived 2024-01-08); `gopkg.in/yaml.v2`, `gopkg.in/yaml.v3` → `go.yaml.in/yaml/v3` (go-yaml archived 2025-04-01); `github.com/ghodss/yaml` → `sigs.k8s.io/yaml`; `github.com/satori/go.uuid`; `github.com/hashicorp/go-multierror` → `errors.Join` (1.20). Use `sigs.k8s.io/yaml` only for types whose canonical tags are already `json:"…"`. | Models trained before 2021 reach for these first ([DH] AI-agent angle). depguard has no default deny list, so the list is the whole gate. | `golangci-lint run ./...` with the config above: a denied import exits 1 with its `desc`. | yes: C6 (`depguard-superseded-violation` exit 1 with 3 depguard issues: `pkg/errors`, `x/exp/slices`, `gopkg.in/yaml.v3` / `-clean` exit 0 with `0 issues`); [DH 6] | MUST | golangci-lint v2 config schema |
| GO-MOD-09 | Apply the deprecations that depend on the `go` line only above their floor, and only to their stated scope. Drop `github.com/google/uuid` for stdlib `uuid` when the main module is at go ≥1.27 and the code uses only `New`/`NewV4`/`NewV7`/`Parse`/`MustParse`/`String`/`Compare`. Keep it for `NewV6`, `NewMD5`, `NewSHA1` or the DCE family, which the stdlib does not provide. Delete `go.uber.org/automaxprocs` only when the main module is at go ≥1.25. A library never imports it. | The stdlib `uuid` surface is narrower: C7 read it from `$GOROOT/src/uuid/uuid.go:33-210`. An agent that swaps blindly invents `uuid.NewSHA1`. Container-aware `GOMAXPROCS` is a `GODEBUG` default keyed on the main module's `go` line (`containermaxprocs`, `Changed: 25`). | Reading heuristic, because depguard cannot see the `go` line: read `go list -m -f '{{.GoVersion}}'` before flagging. `go build ./...` fails at once on an invented stdlib symbol. | no (reading heuristic; source read in C7) | SHOULD | go 1.27 (uuid), go 1.25 (GOMAXPROCS) |

### GO-MOD — rows caught by `go list`

| ID | Rule | Rationale | Verification | Run | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-MOD-10 | The SDK's runtime import graph contains no package outside the stdlib and the SDK's own module. Test-only dependencies (go-cmp) are allowed. | This mirrors ocx-sdk-python's `dependencies = []` (config-inventory §3; owner Q2). Go has no declarative equivalent, so the graph has to be walked. | `out=$(go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}}{{end}}{{end}}' ./... \| sort -u); echo "$out"; test -z "$out"`. Without `-test`, `_test.go` imports are excluded. | yes: C8 (`sdk-runtime-dep` prints `github.com/google/uuid`, exit 1 / `sdk-testonly-dep` with a go-cmp test and an `internal/` subpackage prints nothing, exit 0) | MUST (SDK) | — |
| GO-MOD-11 | The SDK and libraries carry no `tool` directive. Their dev tools are pinned in the workflow (`go run pkg@vX.Y.Z` or a pinned download). A CLI may use `tool` for the generators and linters its contributors run. | A `tool` line is an ordinary `require` to MVS, so the tool's whole dependency tree lands in every consumer's `go list -m all` and govulncheck surface. | `grep -n -e '^tool[[:space:](]' go.mod`: any output in a library or the SDK is the finding. Leakage proof: `go list -m all` in a consumer. | yes: [GC §7] (the consumer's build list gains `x/text`, `x/mod`, `x/sync`, `x/tools`); the grep exits 0 on `gate-commands/tool-directive/lib` and 1 on `go-modules/floor-ok` (this consolidation) | MUST (SDK) / SHOULD (library) | `tool` go 1.24 |

### GO-MOD — rows caught by govulncheck

| ID | Rule | Rationale | Verification | Run | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-MOD-12 | Run `govulncheck ./...` (default `-scan symbol`, text format) as a blocking CI step once per module root. A finding with a call trace blocks the release and is fixed by upgrading to its `Fixed in:` version, never by `replace`. A finding with no trace is scheduled for the next dependency bump and does not block. A job that needs JSON or SARIF output adds its own content check, because those formats always exit 0. | Only 3 of 22 findings across 6 exemplars were reachable (modrel §2). A module-level gate produces about 7× noise, and a `replace` fix is invisible to consumers (GO-MOD-07). | `govulncheck ./...`: exit 3 means a finding; `Example traces found:` or `#1: file:line: … calls …` marks it reachable. `-scan module` takes no package pattern (exit 2 with `./...`). | yes: [DH 4] (`govuln-reachable` exit 3 with trace / `govuln-unreachable` exit 0); [GC §5] (text exit 3, json and sarif exit 0 on the same finding) | MUST | govulncheck v1.x |
| GO-MOD-13 | Audit the exact release artifact with `govulncheck -mode=binary` right before signing, as a second gate after source mode, never as a replacement for it. Use it as the only gate for upstream binaries the fleet mirrors. Expect over-reporting on `-s -w` builds: stripped binaries lose reachability. | Mirrored bazelbuild binaries are checked only by `github_asset_digest` today (`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24`). The stripped build reported 4 vulnerabilities to the normal build's 1. | `govulncheck -mode=binary <artifact>`: exit 3 means a finding. | partial: [DH 5] (normal and stripped both exit 3; no patched-binary green twin was run) | SHOULD | — |

### GO-MOD — release-time and CI-config rows (reading heuristics; the reason is given per row)

| ID | Rule | Rationale | Verification | Run | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-MOD-14 | When a module's first v2+ tag ships, change its `module` line and every self-import to the `/vN` suffix in the same change. Never commit `+incompatible` in a tag or in its own `module` line. Tag a nested module as `<dir>/vX.Y.Z`. | This is required by go.dev/ref/mod. Without the suffix, a v2 tag is unreachable by its path, or it resolves as `+incompatible`. | `grep -n '^module ' go.mod` against the highest release tag's major. This is a reading heuristic because tag/path consistency is a fact about the release history that one checkout cannot falsify. | no | MUST | — |
| GO-MOD-15 | Fix a bad published tag with `retract vX.Y.Z // <reason>` (or `retract [lo, hi]`) inside a new, higher tag. Never delete a tag, force-push, or re-tag the same version. | A retraction only takes effect once a higher version carries it, and the comment is the only text `go get -u` users see. A deleted tag stays in the proxy and the checksum database. | `go list -m -retracted -f '{{.Version}} {{.Retracted}}' <mod>@<bad>` after the new tag ships. | yes: [DH 3] (`Retracted=[]` before v1.0.2 / `Retracted=[published with a data-loss bug]` after; `@latest` moves to v1.0.2) | MUST | go 1.16 |
| GO-MOD-16 | CI selects Go so that a shipped binary gets the latest patch. Library and SDK test jobs use `go-version: [oldstable, stable]`. CLI jobs use `go-version-file: go.mod`, which reads the `toolchain go1.27.N` line from GO-MOD-02. Never point `go-version-file` at a `go 1.N.0` line that has no `toolchain` line for a job that builds a release binary. Never write a bare `go-version: '1.N'` without `check-latest: true`. Build jobs set `GOTOOLCHAIN=local` so that a version mismatch fails loudly instead of downloading. | setup-go docs: "If a patch version is specified, that specific patch version will be used"; `go-version-file` "uses the toolchain directive if present"; `stable`/`oldstable` "result in the same version as … check-latest". Stdlib CVEs are fixed only in point releases, for example CVE-2025-22871 in 1.23.8/1.24.2. | This is a reading heuristic because a GitHub Actions resolution cannot be executed locally. `grep -rn -A3 -e 'actions/setup-go' .github/workflows`, then check each hit against the three forbidden shapes above. The `GOTOOLCHAIN=local` refusal itself was run: [DT 1] (exit 1 / exit 0). | partial ([DT 1]–[DT 2] only) | MUST | setup-go v6 |
| GO-MOD-17 | Every Go repository has a `package-ecosystem: "gomod"` Dependabot block (or a Renovate `gomod` manager) with `groups:`, and a human reviews each bump. Passing CI is not review. | 2 of 24 Dependabot configs cover `github-actions` only (`uber-go/zap@4892335e05f1:.github/dependabot.yml`). go.dev/doc/security/best-practices asks for review before update. | `grep -n -e 'gomod' .github/dependabot.yml`: empty output is the finding. This is a reading heuristic because Dependabot cannot run locally. | no | SHOULD | — |
| GO-MOD-18 | A job that fetches private modules sets `GOPRIVATE=<fleet prefix>` (which implies `GONOPROXY` and `GONOSUMDB`) and never sets `GOAUTH=off`. | Without `GOPRIVATE`, private paths are sent to proxy.golang.org and sum.golang.org. `GOAUTH=off` disables the `netrc` default. | `grep -rn -e 'GOPRIVATE' -e 'GOAUTH' .github/workflows`. This is a reading heuristic because no private host was available. | no | CONSIDER | `GOAUTH` go 1.24 |

**MUST count: 14.** These are GO-MOD-01..08, 10, 11 (SDK), 12 and 14..16.

### Consolidation verification runs

All runs used `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`) under `fixtures/go-modules/`.

- **C1 Library floor.** `v=$(go list -m -f '{{.GoVersion}}') && test -n "$v" && test "$(printf '%s\n1.26.0\n' "$v" | sort -V | tail -n1)" = 1.26.0`. `floor-violation` (`go 1.27.1`) printed `go=1.27.1` and exited **1**. `floor-ok` (`go 1.26.0`) exited **0**. An earlier draft without `test -n` passed on empty output. The guard is part of the check.
- **C2 `toolchain` in a library.** `grep -n '^toolchain' go.mod`. `lib-toolchain` printed `5:toolchain go1.27.1` and exited **0** (the finding). `floor-ok` exited **1** (the pass).
- **C3 Redundant `toolchain`.** In `toolchain-redundant` (`go 1.27.1` plus `toolchain go1.27.1`), `go build ./...` failed with `go: updates to go.mod needed; to update it: go mod tidy` and exited **1**. `go mod tidy -diff` printed `-toolchain go1.27.1` and exited **1**. The twin `floor-violation` gave `go mod tidy -diff` exit **0**.
- **C4 `GOWORK=off` per member.** In `gowork/modA` (a `use`-only sibling), `env GOWORK=off go build ./...` failed with `missing go.sum entry for module providing package example.com/modB` and exited **1**. In `gowork-replaced/modA` (with `replace example.com/modB => ../modB`) the same command exited **0**. The workspace build `go build ./modA/... ./modB/...` exited **0** and wrote **no** `go.work.sum`.
- **C5 Non-local `replace`.** `grep -nE '=>[[:space:]]*[^./[:space:]]' go.mod` exited **0** on `replace-monorepo-forkswap` and **1** on `replace-monorepo-ok`. On the exemplars it exited **0** on `syncthing/syncthing@94c3c1cdef71:go.mod:101,104` and **1** on etcd, kubernetes and terraform.
- **C6 depguard `superseded`.** `golangci-lint run ./...` on `depguard-superseded-violation` exited **1** with `main.go:7:2: import 'golang.org/x/exp/slices' is not allowed from list 'superseded': stdlib slices (go1.21) (depguard)`, the matching `gopkg.in/yaml.v3` and `github.com/pkg/errors` lines, and `3 issues: * depguard: 3`. On `-clean` (stdlib `slices`, `go.yaml.in/yaml/v3`, `%w`) it exited **0** with `0 issues.`
- **C7 Stdlib `uuid` surface (a source read).** `$(go env GOROOT)/src/uuid/uuid.go` exports `UUID`, `Parse`, `MustParse`, `New`, `Nil()`, `Max()`, `String`, `MarshalText`, `AppendText`, `UnmarshalText`, `Compare`, `NewV4` and `NewV7`, and nothing else. `internal/godebugs/table.go` lists `containermaxprocs` and `updatemaxprocs` with `Changed: 25`.
- **C8 SDK runtime deps.** `out=$(go list -deps -f '{{with .Module}}{{if not .Main}}{{.Path}}{{end}}{{end}}' ./... | sort -u); test -z "$out"`. `sdk-runtime-dep` printed `github.com/google/uuid` and exited **1**. `sdk-testonly-dep` (whose `lib_test.go` imports go-cmp and whose `lib.go` imports `example.com/sdk/internal/proc`) printed nothing and exited **0**. `go list -deps -test` on the same module *does* list go-cmp. The dive's command (`grep -v "^${mod}$"`) flagged `example.com/sdk/internal/proc` on the clean module.

## Conflicts resolved

1. **When a `toolchain` line is warranted.** [DT] says it is a minority practice (5/35), added only when CI does not pin the patch another way, and never hand-added. Q1 says "no toolchain line unless it pins a security patch". **Resolved** by splitting on code kind. A library never has one, because it has no effect outside the main module. A CLI has one, and it names the latest patch, because under GO-MOD-16 that line is the mechanism that pins the patch CI builds releases with. This is the `cli/cli@9b031151a825:go.mod:3-5` / `etcd-io/etcd@7583cc6e7e27:go.mod` pattern (`go 1.27[.0]` plus `toolchain go1.27.1`). The line is written with `go get toolchain@…`, which answers [DT]'s "tool's own write" objection.
2. **`GOWORK=off` in CI.** [DT] §6 and its guidance candidate 5 say "CI never builds that tree with `GOWORK=off`". go.dev/ref/mod says "it is generally inadvisable to commit go.work files" and that CI "should generally not be allowed to use the go.work file". **Resolved for go.dev.** [DT]'s own run 6 (reproduced in C4) shows that a `use`-only sibling is a module that breaks for consumers. Building with `GOWORK=off` exposes that defect; it does not cause it. The measured practice is 4/35 committing `go.work`, all genuine monorepos, and each member builds standalone: etcd and kubernetes wire members with local replaces, and prometheus members require published versions (`prometheus/prometheus@270db2915054:documentation/examples/remote_storage/go.mod:12`). Committing `go.work` stays allowed in multi-module repositories (map conflict 21) only together with the per-member `GOWORK=off` leg.
3. **The SDK zero-dependency check.** [DH] §9 claims `go list -deps ./...` "includes `_test.go`-only imports too" and suggests a `tools.go`-style workaround. Its command also filters only the exact module path. **Both are wrong** (C8): without `-test`, test imports are excluded, and an `internal/` subpackage of the SDK is a false positive. **Resolved** with the `.Module.Main` template, which drops stdlib packages (nil `.Module`) and every package of the main module. The `tools.go` advice is dropped.
4. **`check-latest` scope and `go-version-file`.** [DT] candidate 9 prefers `go-version-file` everywhere and candidate 10 wants `check-latest` on release jobs only. [DH] candidate 9 wants `check-latest: true` on every job. **Neither holds in full.** setup-go's advanced-usage doc says a patch-bearing `go` line installs "that specific patch version", so `go-version-file` on the Q1 CLI line `go 1.27.0` builds releases with 1.27.0. `check-latest` resolves only `major` and `major.minor` selectors, so it cannot rescue an exact patch. **Resolved** as GO-MOD-16. Aliases for library matrices, `go-version-file` through a `toolchain` patch line for CLIs, and `check-latest` only when a bare `1.N` literal is kept. Violators are listed below.
5. **`go.work.sum` as a requirement.** [DT] candidate 5 requires it "always" and counts prometheus as the exception. go.dev: the go command writes it only for "hashes used by the workspace that are not in collective workspace modules' go.sum files". C4's workspace build wrote none. **Resolved:** commit it when it exists. prometheus is compliant and is removed from the violation column.
6. **M-L-03, `go mod init` writing `go 1.(N-1).0`.** The topic map took this premise from the go1.26 notes. [DT 3] measured `go 1.27.1` on 1.27.1, and golang/go#77653 and #77860 record the revert in 1.26.1. **Resolved for [DT]:** there is no N−1 line to keep. GO-MOD-01 applies instead, which means an agent must lower a library's freshly written `go 1.27.1`.
7. **Blanket `golang.org/x/exp` deny.** [DH] candidate 2 denies `golang.org/x/exp` wholesale. That module also ships packages that never graduated, such as `apidiff`, `mmap`, `ebnf` and `utf8string` (package listing of `golang.org/x/exp@v0.0.0-20250620022241-b7579e27df2b` in the local module cache). The 5/35 direct `x/exp` users (modrel §2) are not all slices/maps users. **Resolved:** deny only `x/exp/slices` and `x/exp/maps` (C6).
8. **Ownership of M-L-04 and M-L-09 against GO-GATE.** gate-commands wrote them as GO-GATE-COMMANDS-05 and -10. The map assigns both rows to GO-MOD (section L). **Resolved:** GO-MOD-03 and GO-MOD-11 own them. The GO-GATE consolidation should cite them rather than restate them. It keeps the govulncheck format trap as a gate-wiring detail, which GO-MOD-12 references.

## Applied to the exemplars and the future consumers

**Already satisfied by the strict libraries.** No `toolchain`, `replace` or `tool` line in `google/go-cmp@b133f1f1932e`, `stretchr/testify@87a7b9d57689`, `spf13/cobra@adbc8813901b`, `uber-go/zap@4892335e05f1`, `google/go-github@48d0a668cde8` or `oras-project/oras-go@cb6d6dc79f83` (grep count 0 on each root `go.mod`). Their low floors (go-cmp `go 1.21`, testify `1.17`) are GO-MOD-01's library shape. `grpc/grpc-go@acccf8cd101a:go.mod:46` (`retract [v1.74.0, v1.74.1]`) and `charmbracelet/bubbletea@d5bfd5c2ff74:go.mod:3` satisfy GO-MOD-15. `google/go-github@48d0a668cde8:go.mod:1` (`/v92`) and `etcd-io/etcd@7583cc6e7e27:go.mod:1` (`/v3`) satisfy GO-MOD-14. `cli/cli@9b031151a825` (`go.mod:3-5` plus `.github/workflows/go.yml:26` `go-version-file`) is the GO-MOD-02/16 CLI template.

**Violated by prominent exemplars.**

| Rule | Violation |
|---|---|
| GO-MOD-02 | `google/go-containerregistry@0c8bedb78437:go.mod:10` (`toolchain go1.26.6` in a module that ko and cosign import as a library); `bazel-contrib/rules_go@970e99d77c8b:go.mod:3` (`toolchain go1.26.7`) |
| GO-MOD-07 | `syncthing/syncthing@94c3c1cdef71:go.mod:101,104`: two module-to-module fork swaps, which disappear for anyone importing syncthing packages (C5) |
| GO-MOD-08 | `github.com/pkg/errors` at `tailscale/tailscale@6b3a45f14ef6:go.mod:100`, `restic/restic@5127c4abf921:go.mod:30` and `cockroachdb/pebble@13596f1e1cea:go.mod:25`; `gopkg.in/yaml.v3` at `cli/cli@9b031151a825:go.mod:68` and `caddyserver/caddy@54937914234b:go.mod:51`; `hashicorp/go-multierror` at `goreleaser/goreleaser@ff8de3d6c389:go.mod:40` and `aquasecurity/trivy@ae561f8cca36:go.mod:56` |
| GO-MOD-09 | 9/35 import `github.com/google/uuid` (modrel §2), all written before 1.27. Not a violation until their `go` line reaches 1.27. |
| GO-MOD-16 | `charmbracelet/bubbletea@d5bfd5c2ff74:.github/workflows/build.yml:12` reads `go-version-file: ./go.mod` against `go 1.26.0` with no `toolchain` line, so CI runs exactly 1.26.0. `oras-project/oras-go@cb6d6dc79f83:.github/workflows/release.yml:41-42` pairs `go-version-file` on `go 1.26.0` with `check-latest: true`, which is a no-op for an exact patch. 27/32 hard-code a literal `go-version:` (gates §3). |
| GO-MOD-17 | `uber-go/zap@4892335e05f1:.github/dependabot.yml` and `kubernetes-sigs/controller-runtime@d0127f7f66de` cover `github-actions` only |
| GO-MOD-06 | kubernetes (~34 `staging/src/k8s.io/*` modules), etcd, terraform and trivy carry nested modules that a root `./...` skips (shape §1). Their own CI iterates. The finding is for any wrapper that does not. |
| GO-MOD-12 | `ko-build/ko@fcaeb337b6bd` has reachable `GO-2026-6348` (grpc, `test/main.go:57:30`) and `GO-2026-6225` (`cmd/help/main.go:41:24`) at HEAD (modrel §2) |

**New commitments for the fleet.**

- **The OCX SDK for Go** takes GO-MOD-01 (`go 1.26.0`), GO-MOD-02 (no `toolchain` line), GO-MOD-07, GO-MOD-10 and GO-MOD-11 (no `replace`, no `tool` line, stdlib-only runtime, go-cmp for tests only), and GO-MOD-16 (`[oldstable, stable]` × three operating systems). Consequence: at a 1.26 floor the SDK cannot use 1.27's stdlib `uuid` or `encoding/json/v2`-only APIs. `stdversion` enforces this.
- **Go CLIs** take `go 1.27.0` plus `toolchain go1.27.N`, `go-version-file` in CI, `GOTOOLCHAIN=local`, depguard `superseded` (GO-MOD-08), per-module gates (GO-MOD-06), blocking govulncheck (GO-MOD-12), and a binary-mode audit of the signed artifact (GO-MOD-13).
- **Fleet mirrors** (`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24`, digest only) gain an optional `govulncheck -mode=binary` step (GO-MOD-13).
- **The `go-upgrade` skill** carries the procedures behind GO-MOD-01, 02, 04, 09, 12 and 16. **The `go-release` skill** carries GO-MOD-13, 14 and 15.

## AI-agent failure modes

Ranked by how often each is expected to bite. The first three follow from training data and fire on every new module.

1. **An agent copies the `go` line that `go mod init` wrote into a library.** It writes `go 1.27.1` into the SDK because that is what init produced. Check: the C1 floor test (GO-MOD-01).
2. **An agent reaches for pre-2021 modules**: `pkg/errors`, `io/ioutil`, `x/exp/slices`, `golang/mock`, `gopkg.in/yaml.v3`. Check: `golangci-lint run ./...` with depguard `superseded` (C6).
3. **An agent adds a `toolchain` line "to be safe"**, sometimes equal to the `go` line, which breaks every readonly build (C3). Check: `grep -n '^toolchain' go.mod` plus `go mod tidy -diff`.
4. **An agent "fixes" a dependency or a CVE with `replace X => fork`** in a library, where it silently does nothing for consumers ([DH 1]). Check: `grep -n '=>' go.mod`, or the non-local variant (C5).
5. **An agent wires CI with `go-version-file` on a bare `go 1.N.0` line** and believes `check-latest` keeps it patched. Check: the GO-MOD-16 reading heuristic on `actions/setup-go` hits.
6. **An agent runs one `./...` gate at the repository root** of a multi-module repository and reports it green. Check: the `find … -name go.mod` count (GO-MOD-06).
7. **An agent pipes govulncheck to `-format json` or `sarif`** and assumes the job still fails on a finding, or treats every module-level finding as release-blocking. Check: text-mode exit 3 and the trace block ([GC §5], [DH 4]).
8. **An agent invents stdlib `uuid` APIs** (`NewSHA1`, `Validate`), or removes `automaxprocs` under a `go 1.24` line. Check: `go build ./...`, then read the `go` line first (GO-MOD-09).
9. **An agent describes `retract` as un-publishing, or puts it inside the bad version's own `go.mod`.** Check: `go list -m -retracted` after the next tag ([DH 3]).
10. **An agent writes `GODEBUG=<removed>=old` in a Dockerfile**, which is silently inert, instead of the `go.mod` `godebug` line, which fails loudly. Check: `go build ./...` ([DT 5]).

## Open questions

**Owner decisions (defaults the program applies now):**
- **CLI patch cadence.** Default: the `go-upgrade` skill bumps `toolchain go1.27.N` within a week of each Go point release, via `go get toolchain@go1.27.N`. The alternative, `go-version: stable` without a `toolchain` line, gives up reproducible release builds.
- **Private modules.** Default: none are planned, so GO-MOD-18 stays CONSIDER. It moves to MUST the day a private fleet module exists.
- **Vendoring (M-L-12).** Default: fleet modules do not vendor (3/35 exemplars do). This is not researched further.

**Subareas that deserve another round:**
- **dependency-hygiene / Dependabot and toolchain.** Does Dependabot's `gomod` ecosystem open PRs for the `toolchain` directive and for `go` line bumps, and how does grouping interact with them? If it does, GO-MOD-16's patch cadence needs no skill step.
- **dependency-hygiene / binary mode.** Is govulncheck `-mode=binary` over-reporting on `-s -w` binaries documented behaviour? Also run it against the four mirrored bazelbuild binaries (bazelisk, buildifier, buildozer, unused-deps) to price GO-MOD-13 for the mirror pipeline.
- **directives / `ignore` and `go.work` `godebug`.** Should the fleet use the 1.25 `ignore` directive for docs and asset trees (1/35 today)? kubernetes puts `godebug default=go1.27` in `go.work:5`. Which wins over a member's `go.mod` `godebug` under `GOWORK=off` (the GO-MOD-05 leg)?
- **directives / nested-module release tagging.** Plant a nested module and confirm that `<dir>/vX.Y.Z` tags resolve through a local proxy, so GO-MOD-14 gains a run instead of a reading heuristic.

## Sub-artifacts

- [go-modules/directives-and-toolchain.md](go-modules/directives-and-toolchain.md): the `go`/`toolchain`/`godebug`/`ignore` lines, `GOTOOLCHAIN`, `go.work`, `/vN`, nested modules and setup-go, with 7 verification runs.
- [go-modules/dependency-hygiene.md](go-modules/dependency-hygiene.md): `replace` and `retract` mechanics, the superseded-module table, the YAML pick, govulncheck scan and binary modes, depguard, `-mod=readonly`, the SDK zero-dependency check, GOPRIVATE/GOAUTH and Dependabot, with 8 verification runs.
- [go-gates/gate-commands.md](go-gates/gate-commands.md) §4, §5, §7 (cited, owned by GO-GATE): `go mod tidy -diff`, govulncheck format exit codes, and `tool`-directive leakage.

## Key sources

- https://go.dev/ref/mod: the `go`, `toolchain`, `godebug`, `tool`, `ignore`, `replace`, `retract` and `go.work` semantics, including "inadvisable to commit go.work"
- https://go.dev/doc/toolchain: GOTOOLCHAIN and forward compatibility since 1.21
- https://go.dev/doc/godebug: GODEBUG defaults and the settings removed in 1.27
- https://go.dev/doc/go1.27: `stdversion` under `go test`, and rejection of removed GODEBUG settings
- https://github.com/golang/go/issues/77653: the revert of the `go mod init` N−1 default (backported by #77860)
- https://github.com/actions/setup-go/blob/main/docs/advanced-usage.md: `go-version-file` exact-patch semantics, `check-latest`, stable/oldstable
- https://go.dev/doc/modules/major-version: `/vN` mechanics
- https://go.dev/doc/modules/release-workflow: tagging, including nested modules
- https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck: `-scan`, `-mode`, exit codes, and "exits successfully if -format json/sarif"
- https://github.com/golang/govulncheck-action: the json/sarif exit-0 statement
- https://go.dev/doc/security/best-practices: review every dependency update
- https://go.dev/blog/container-aware-gomaxprocs: the automaxprocs supersession in 1.25
- https://github.com/go-yaml/yaml and https://pkg.go.dev/go.yaml.in/yaml/v3: the archive (2025-04-01) and its successor
- https://github.com/OpenPeeDeeP/depguard: deny-list schema (golangci v2 list form)

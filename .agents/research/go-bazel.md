---
title: "Bazel for Go (rules_go, Gazelle, go_deps, nogo): the BZL-GO depth file"
topic: "BZL-GO — rules/bazel-quality/go.md, framed 'if you adopt Bazel for Go' (owner Q7 default yes)"
model: opus
id_family: BZL-GO
consolidates:
  - go-bazel/rules-go-and-nogo.md
  - go-bazel/stamping-and-release.md
also_read:
  - go-audit/exemplar-modules-and-release.md (§6 Bazel for Go)
  - go-audit/config-inventory.md (§2 The Bazel set's Go gap)
  - go-audit/exemplar-quality-gates.md, exemplar-code-shape.md, exemplar-runtime-posture.md (no Bazel content; checked)
  - go-topic-map.md (section O rows M-O-01..11, Artifact set decision, wave-3 item 14)
  - go-gates.md, go-modules.md, go-release.md (GO-REL-05, Verdict 4), go-release/reproducible-builds-and-stamping.md (cited rule IDs)
  - rules/bazel-quality.md and rules/bazel-quality/{architecture,bzlmod,caching,flags,hermeticity,java,rust}.md (sibling IDs)
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-consolidation/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-revision/
date: 2026-09-26
revised: 2026-09-26
---

# Bazel for Go: the BZL-GO depth file

Versions this file binds to (measured 2026-09-26): Bazel 9.2.0 (bazelisk 1.28.1 via
`ocx.sh/bazelbuild/bazelisk`), rules_go 0.63.0, gazelle 0.54.0, Go 1.27.1 and 1.27.0 SDKs,
honnef.co/go/tools v0.8.1 (staticcheck 2026.2.x), golang.org/x/tools v0.50.0. Every run below
was executed in the consolidation fixture unless it says "dive run N", which points at
[the dive's Verification runs](go-bazel/rules-go-and-nogo.md#verification-runs), "release run N",
which points at [the release dive's Verification runs](go-bazel/stamping-and-release.md#verification-runs),
or "revision", which is the `go-bazel-revision/` fixture built for this revision.

## Verdict

1. **The gate of record doesn't change under Bazel. nogo is an extra layer, never a substitute.**
   `bazel run @rules_go//go -- vet ./...` (GO-GATE-02) and golangci-lint or staticcheck
   (GO-GATE-*) keep running on the same `go.mod`. The measured reasons:
   - `TOOLS_NOGO` at rules_go 0.63.0 omits four of go vet 1.27.1's 35 analyzers.
   - One of the four, `stdversion`, can't work under nogo at all (Verdict 9).
   - nogo can't host golangci-lint.
   - nogo can't apply fixes.

   This overrides the map's "nogo parity" framing. Parity is the wrong goal. Binds all code kinds.
2. **If a repo uses nogo, it registers it with `go_sdk.nogo` in the root `MODULE.bazel`.**
   The deps are `TOOLS_NOGO` plus `hostport`, `waitgroup` and the staticcheck SA analyzers
   that the go-quality MUSTs name. Never use `vet = True`, and never add `stdversion`.
   - A declared but unregistered `nogo()` builds planted violations green.
   - Both dogfood repos do exactly that under Bzlmod.
3. **The Go SDK comes from `go_sdk.from_file`, so the `go.mod` policy (GO-MOD-01/02) decides the SDK.**
   - **CLI:** the `toolchain go1.27.N` line gives the patched SDK.
   - **Library or SDK:** `from_file` resolves to the `.0` floor. A second
     `go_sdk.download` plus an `--@rules_go//go/toolchain:sdk_version` CI leg supplies the
     "stable" half of GO-MOD-16.
4. **Analyzer and tool modules never enter a library's or SDK's `go.mod`, even to feed nogo.**
   They go into a `dev_dependency = True` `go_deps.module(...)` proxy with their requirements
   listed by hand. This resolves the dive's tools.go/`tool`-directive advice against GO-MOD-11.
   A CLI may use `tool` (Gazelle ≥0.47.0 surfaces it as `GO_TOOLS`).
5. **The race lane is a command-line flag, `--@rules_go//go/config:race`.** The default
   `race = "auto"` silently runs a racy test without the detector (measured).
6. **A Bazel-built binary is audited as a binary.**
   - `go_deps` runs MVS over every Bazel module's `go.mod`, rules_go's own included. So what
     links (x/text v0.26.0) isn't what `go list -m all` says (a 2017 pseudo-version).
   - `debug.ReadBuildInfo` carries no `vcs.*` settings under rules_go.
   - A default `bazel build` (fastbuild) **strips**: rules_go 0.63.0 turns Bazel's
     `--strip=sometimes` default into link `-s -w` (`go/private/actions/link.bzl:188-189`). A
     stripped binary makes `govulncheck -mode=binary` over-report. The first consolidation's
     BZL-GO-11 red (GO-2026-5970) was exactly that over-report: the same tree built
     `--strip=never` scans clean (revision).

   CLI releases therefore stamp both the semver and the VCS revision through `x_defs` from
   `STABLE_*` keys only (BZL-GO-09, BZL-GO-14), build with an explicit `--strip=never`
   (BZL-GO-15, carrying GO-REL-05 into Bazel), and run `govulncheck -mode=binary` on that
   unstripped Bazel artifact (BZL-GO-11).
7. **The measured release recipe.** A checked-in `.bazelrc` holding
   `build:release -c opt --strip=never --stamp --workspace_status_command=tools/status.sh`,
   with `x_defs` referencing only `STABLE_*` keys, gives byte-identical binaries across two
   clones in differently named directories with separate output bases (revision:
   `sha256 402a7634…` in both, `with debug_info, not stripped`). The status script's path must
   carry a directory component. `%workspace%/…` and a bare `status.sh` (with or without `./`)
   fail on Bazel 9.2.0 (BZL-GO-09).
8. **Gazelle drift is gated by BZL-ARCH-12's `gazelle_test`, not the dive's bare `-mode=diff`.**
   The published sibling wins. `gazelle_test` was verified here for Go (exit 3 on drift, 0 when clean).
9. **Documented gap: nogo can't enforce GO-MOD-01's `go`-line floor.** Under rules_go 0.63.0,
   nogo hands analyzers `pass.Pkg.GoVersion()` equal to the **selected SDK's** version
   (`go1.27.1`), never the module's `go 1.26.0` line (release run 5, debug-analyzer probe).
   `passes/stdversion` in nogo's `deps` therefore can't fire, too-new API or not. The floor is
   enforced under Bazel only through BZL-GO-07's external `vet`, which caught the same plant.
   No rules_go issue was found for this (searched 2026-09-26). Re-run the probe on every
   rules_go bump.
10. **Scope.** Whether to adopt Bazel at all stays with the `bazel-adopt` skill (M-O-11): 0 of the
    33 non-dogfood exemplars build Go with Bazel. This file cites BZL-MOD, BZL-HERM, BZL-CACHE,
    BZL-TEST, BZL-FLAG, BZL-ARCH, BZL-LARK and BZL-CI rather than restating them.

## The ruleset

### BZL-GO

Sibling rules this file leans on, cited and not restated:
- BZL-MOD-10: `bazel mod tidy` only behind a diff gate.
- BZL-FLAG-28 and BZL-ARCH-11: a ruleset's current version comes from the BCR's
  `metadata.json`, never a snippet.
- BZL-ARCH-12: `gazelle_test` is the drift gate.
- BZL-ARCH-16: `config_setting` goes on `constraint_values` under `--platforms`.
- BZL-HERM-17/18 and BZL-CACHE-20: stable vs volatile status, and `--stamp` isn't a determinism control.
- BZL-RUST-13: the Rust twin of BZL-GO-09 (`{STABLE_...}` placeholders from the status command).
- BZL-FLAG-12/13: no `WORKSPACE` on a Bazel 9 pin.

Go-side IDs cited: GO-GATE-02/04/11, GO-MOD-01/02/11/12/13/16, GO-ERR-05/06, GO-REL-05
(`go-release.md`, CONSIDER: do not pass `-s -w` by default; triage a stripped scan against an
unstripped twin) and GO-REL-14.

#### A. Caught by reading `MODULE.bazel` and by `bazel run @rules_go//go -- version`

| ID | Rule | Rationale (failure prevented) | Verification | Watched red? | Sev | Floor |
|---|---|---|---|---|---|---|
| BZL-GO-01 | Declare the SDK with `go_sdk.from_file(go_mod = "//:go.mod")` (or `go_work =`), never `go_sdk.host()`. Treat the `toolchain` line, when present, as the version Bazel builds with, not the `go` line. | `host()` follows the OS package manager and breaks reproducibility on a host upgrade (rules_go `bzlmod.md` § Go SDKs, citing enola-dev/enola#713). A developer who reads the `go` line as authoritative misjudges the SDK. | `grep -rn --include=MODULE.bazel -e 'go_sdk.host(' .`: empty output passes. Then `bazel run @rules_go//go -- version` must print the `toolchain` line, or the `go` line when there is no `toolchain` line. | yes. The grep matched `planted-host/MODULE.bazel:6` (exit 0) and was silent on `bazel-go` (exit 1). Precedence was measured in dive run 1 (`go 1.27.0` + `toolchain go1.27.1` gives go1.27.1; without the toolchain line, go1.27.0), and here again (default `go version go1.27.0`). | MUST | rules_go 0.63.0 |
| BZL-GO-02 | Library or SDK: keep `from_file` for the floor and add `go_sdk.download(version = "1.27.N")` for the current stable patch. Run a CI leg with `bazel test --@rules_go//go/toolchain:sdk_version=1.27.N //...`. CLI: rely on GO-MOD-02's `toolchain` line, and never add a `download` tag to paper over a missing one. | GO-MOD-01 puts a library at `go 1.26.0`. Under Bazel that is the only SDK it builds and tests with, so GO-MOD-16's `stable` leg silently disappears. A Bazel-built binary without a `toolchain` line reported `go1.27.0` (`go version -m greet.bazel`). | `bazel run --@rules_go//go/toolchain:sdk_version=1.27.1 @rules_go//go -- version` must print the stable patch. The default invocation prints the floor. | yes (`sdk.log`). Default printed `go1.27.0`. With the flag it printed `go1.27.1` (exit 0), and a build with the flag succeeded (exit 0). | MUST (library, SDK) | rules_go 0.63.0 |
| BZL-GO-03 | Never hand-write a `use_repo(go_deps, …)` name. Run `bazel mod tidy` under BZL-MOD-10's diff gate. Names are reverse-domain with underscores (`rsc.io/quote` becomes `io_rsc_quote`, and `honnef.co/go/tools` becomes `co_honnef_go_tools`). | A guessed forward-order name, or a missing entry, is an unresolved-repository build break. Only direct dependencies of the root module need an entry. | `bazel mod tidy && git diff --exit-code MODULE.bazel`. Empty output passes. | yes, dive run 2. With `io_rsc_quote` deleted, the build failed with exit 1 (`no such package '@@[unknown repo 'io_rsc_quote' …`). `bazel mod tidy` restored the block verbatim and the build passed (exit 0). The `git diff` half was not run. | MUST | Bazel ≥7.1.1 |
| BZL-GO-04 | Library or SDK: declare analyzer or tool modules (for example `honnef.co/go/tools` for nogo) with a `use_extension(…, "go_deps", dev_dependency = True)` proxy and `go_deps.module(path, version, sum)`. List every one of their requirements by hand. Never add a `tools.go` blank import or a `tool` line to feed nogo. A CLI may use `tool`, which Gazelle ≥0.47.0 surfaces as `GO_TOOLS`. | A `require` leaks into every consumer's build list (GO-MOD-11). `//:go.mod` also picks the SDK (`bazel-contrib/rules_go@970e99d77c8b:MODULE.bazel:88-91`). `go_deps.module` does not walk the module's own `go.mod`. | Run GO-MOD-11's grep. Then `grep -c 'honnef.co/go/tools' go.mod` must print 0, and `bazel build` of a nogo-validated target must succeed. | yes (`dev.log`, `dev2.log`). Declaring only honnef failed with exit 1 (`unknown repo 'org_golang_x_exp_typeparams' requested from @@gazelle++go_deps+co_honnef_go_tools`). After adding `x/exp/typeparams`, the SA9010 plant failed as it should (exit 1, `timerbug.go:19:2: deferred return function not called (SA9010)`). The twins passed (exit 0), and `go.mod` held 0 honnef lines. `GO_TOOLS` was generated in dive run 10. | MUST (SDK) / SHOULD (library) | Gazelle ≥0.47.0 for `GO_TOOLS` |

#### B. Caught by building a planted violation under nogo

| ID | Rule | Rationale | Verification | Watched red? | Sev | Floor |
|---|---|---|---|---|---|---|
| BZL-GO-05 | If you use nogo, register it with `go_sdk.nogo(nogo = "//:<name>")` in the **root** `MODULE.bazel`. A `nogo()` target alone, or a `WORKSPACE` `go_register_nogo`, analyzes nothing under Bzlmod. | Only the root module's tag is honored (`bzlmod.md` § Configuring nogo). On Bazel 9 `WORKSPACE` is gone (BZL-FLAG-12), and on 8.x it is off by default. The build goes green over the violations. | `if grep -rqs --include='BUILD*' -e '^nogo(' "$d" && ! grep -qs -e 'go_sdk.nogo(' "$d/MODULE.bazel"; then echo FINDING; fi`. Empty output passes. | yes (`nogoreg.log`). Unregistered, the build of planted copylocks and waitgroup violations passed (exit 0). Registered, it failed with exit 1 (`lockbug.go:14:13: Bump passes lock by value … (copylocks)`). The script printed FINDING on `unreg/` and was silent on `bazel-go/`. | MUST (when nogo is used) | rules_go 0.63.0 |
| BZL-GO-06 | Build nogo's `deps` from three sources, and never write `vet = True`: <br>• `TOOLS_NOGO`; <br>• `@org_golang_x_tools//go/analysis/passes/hostport:go_default_library` and `…/waitgroup:go_default_library`, which are vet 1.27 analyzers that `TOOLS_NOGO` omits; <br>• the staticcheck analyzers the go-quality MUSTs name, as `@co_honnef_go_tools//staticcheck/sa9010` and `…/sa4023`. <br>Never add `…/passes/stdversion`: under rules_go 0.63.0 it is inert (Verdict 9). Re-derive the gap on every rules_go or Go bump. | `vet = True` adds exactly the 5 analyzers `go test` already runs. Beside `TOOLS_NOGO` it is a duplicate-label analysis error. `TOOLS_NOGO` includes `nilness` (GO-GATE-11) but lacks `cgocall` (commented out, rules_go#2396), `hostport`, `stdversion` and `waitgroup`. `stdversion` reads the package's Go version, and nogo reports the SDK's version for every package, so the analyzer can't tell a too-new call from a legal one. | Gap audit: `comm -23` of `go tool vet help` against the uncommented `passes/*` labels in `$(bazel info output_base)/external/rules_go+/go/def.bzl` (normalize `composite`→`composites` and `copylock`→`copylocks`). Today it prints `cgocall hostport stdversion waitgroup`. After this rule's additions, the accepted residue is `cgocall stdversion`, both covered by BZL-GO-07. Planted test: `bazel build` of a waitgroup violation. | yes (`build1.log`, `build2.log`). With `TOOLS_NOGO` alone, the `wgbug` plant built (exit 0), which is the gap. With `waitgroup` added it failed with exit 1 (`wgbug.go:10:10: WaitGroup.Add called from inside new goroutine (waitgroup)`). The twins built (exit 0). The `vet = True` + `TOOLS_NOGO` combination failed with a duplicate label in dive run 3. SA9010 went red and green in dive run 5 and here. `stdversion` in `deps` built a `bytes.CutLast` plant under `go 1.26.0` green (exit 0, should be red), and the debug probe printed `DEBUG GoVersion="go1.27.1"` (release run 5). | MUST (when nogo is used) | rules_go 0.63.0 × Go 1.27.1 |
| BZL-GO-07 | Keep the gate of record outside nogo: run `bazel run @rules_go//go -- vet ./...` (GO-GATE-02) and golangci-lint or staticcheck (GO-GATE-*) on the same `go.mod` in every Bazel-for-Go repo. Never treat a green `bazel build //...` as the vet or lint pass, and never wire golangci-lint into nogo. This external `vet` is the **only** Bazel-side route that enforces GO-MOD-01's `go`-line floor. | nogo misses `stdversion` (GO-MOD-01's floor check), can't make it work (Verdict 9), misses `cgocall`, and can't apply fixes (`nogo.rst`). The external `vet` runs the real `go` command, which reads `go.mod`. The only golangci-to-nogo bridge marks its golangci half "POC-only. Should NOT be used except for research purposes", has no `MODULE.bazel` and no BCR entry, and pins a staticcheck that predates SA9010 (sluongng/nogo-analyzer README, dive §8). Fixture note: plant a floor violation with an ordinary new API such as `bytes.CutLast` (Go 1.27). x/tools hard-excludes `testing/synctest` (and `encoding/json/v2`, `jsontext`) from `stdversion` (`internal/typesinternal/toonew.go`), so such a plant never goes red on any toolchain. | `bazel run @rules_go//go -- vet ./...`: exit 0 with empty output passes. | yes (`vet_bazel.log`). The `wgbug` plant failed with exit 1 (`WaitGroup.Add called from inside new goroutine`). The twin passed (exit 0). Release run 5: `bazel run @rules_go//go -- vet -stdversion ./pkg/newapi/...` on `go 1.26.0` + `toolchain go1.27.1` reported `newapi.go:9:15: bytes.CutLast requires go1.27 or later (file is go1.26)`, where nogo stayed green. | MUST | — |

#### C. Caught by the `bazel test` or `bazel build` invocation and the artifact

| ID | Rule | Rationale | Verification | Watched red? | Sev | Floor |
|---|---|---|---|---|---|---|
| BZL-GO-08 | Run the race lane as `bazel test --@rules_go//go/config:race //...` on the host platform. Set a per-target `race = "on"` only on a test that must always run raced. Never write `race`/`pure` as booleans. | `race` and `pure` are the strings `"on"`, `"off"` and `"auto"` (`rules.md`). `auto` follows the flag, so a plain `bazel test` silently runs racy code without the detector. This is the Bazel form of GO-GATE-04. Race needs cgo, and cross-compiling defaults to pure. | `grep -rn --include=BUILD.bazel --include=BUILD -e 'race = True' -e 'race = False' -e 'pure = True' -e 'pure = False' .`: empty output passes. Then the lane command must fail on a racy plant. | yes (`race.log`). `race = True` failed with exit 1 (`expected value of type 'string' for attribute 'race' … but got True (bool)`). The racy test with no flag PASSED (exit 0). With the flag it reported `WARNING: DATA RACE` and FAILED (exit 3). The fixed twin with the flag PASSED (exit 0). The grep matched `pkg/racebool` (exit 0) and was silent on `pkg/raceflag` (exit 1). | MUST | rules_go 0.63.0 |
| BZL-GO-09 | CLI: stamp **both** the semver and the VCS revision through `x_defs` (`"example.com/x/internal/version.Commit": "{STABLE_GIT_COMMIT}"`) from `--stamp` and a `--workspace_status_command`. Put the flag in the checked-in `.bazelrc` as a workspace-relative path **with a directory component** (`build:release --workspace_status_command=tools/status.sh`), or pass an absolute path. Never write `%workspace%/…`, and never a bare `status.sh` or `./status.sh`. Under Bazel, GO-REL-05's `ReadBuildInfo` half is empty. Never put `-X` into `gc_linkopts` or a wrapper script. | rules_go doesn't run the `go` command, so `debug.ReadBuildInfo` has no `vcs.*` settings and no `mod` line. `x_defs` is collected transitively and substitutes `{KEY}`. Key choice is BZL-GO-14. `*_test` targets are always unstamped (BZL-HERM-18). Bazel 9.2.0 runs the command through `/bin/sh -c` with the workspace root as its working directory (the script logged `cwd: …/base` on every run). It does **not** expand `%workspace%` for this flag, so the shell reads `%workspace%/…` as a job spec (`/bin/sh: line 1: fg: no job control`, exit 1). `./status.sh` is normalized to `status.sh`, which the shell looks up on `PATH` (exit 127). | Run the binary after `bazel run --config=release //cmd/x`: it must print the stamped value. With `--nostamp` it must print the literal default. Path form: `grep -rnE -e 'workspace_status_command[= ]+"?(%workspace%\|(\./)?[^/[:space:]"]+("\|[[:space:]]\|$))' .bazelrc`. Empty output passes. Separately, `grep -rn --include='BUILD*' --include='*.bzl' -e 'gc_linkopts.*-X' -e 'ldflags.*-X' .`: empty output passes. | yes. In dive run 8, `--stamp` printed `version: v9.9.9-bzlfix` and `--nostamp` printed `version: dev`. A probe here (`bi.log`) found 0 `vcs.*` settings under Bazel, against 3 under `go build` (`vcs.revision=6b3e612e8cd5…`). The `-X` grep matched `planted-ldflags/BUILD.bazel:6` (exit 0) and was silent on `bazel-go-devdeps/cmd` (exit 1). Path forms (revision, `wsc-forms.log`, `wsc-bazelrc.log`): `tools/status.sh` and `./tools/status.sh` exited 0 on the command line; `.bazelrc` `tools/status.sh` exited 0 from the root and from `cmd/greet/`, and `--nostamp` printed `version: dev`; `./status.sh` exited 1 (status 127); `.bazelrc` `%workspace%/tools/status.sh` exited 1 (`fg: no job control`). Release run 1 adds `status.sh` → 127 and `%workspace%/status.sh` → 1, the same after a server restart and under `ocx exec`. The path grep (`grep-plants.log`) matched `wsc-red1..3` (exit 0) and was silent on `wsc-green1..2` (exit 1). | MUST (CLI) | Bazel 9.2.0 |
| BZL-GO-10 | Cross-compile with `--platforms=@rules_go//go/toolchain:<goos>_<goarch>`, never with `GOOS`/`GOARCH` in the environment of a `bazel` invocation. | Bazel ignores the environment variables and builds the host binary with exit 0. The wrong-architecture artifact ships silently. | `bazel build --platforms=… //cmd/x`, then `file` on the output must name the requested OS and architecture. Separately, `grep -rn -e 'GOOS=' -e 'GOARCH=' .github/workflows` near `bazel` must be empty. | yes (`plat.log`). `GOOS=windows GOARCH=arm64 bazel build` exited 0 and `file` reported `ELF 64-bit LSB executable, x86-64`, which is the red. `--platforms=…:linux_arm64` gave `ARM aarch64`. `windows_amd64` gave `PE32+ … x86-64` in dive run 9. | MUST | rules_go 0.63.0 |
| BZL-GO-11 | Audit a Bazel-built binary's dependencies from the **unstripped** binary: `go version -m` and `govulncheck -mode=binary` on the `bazel-bin/…` artifact built with `--strip=never` (BZL-GO-15). Never audit them from `go list -m all` or from source-mode govulncheck alone. If a repo ships stripped anyway, scan the shipped artifact and triage every finding against a `--strip=never` twin built with otherwise identical flags (GO-REL-05). A finding only the stripped scan reports is a stripping artifact. | `go_deps` "performs MVS on all transitive Go dependencies of all Bazel modules" (`bzlmod.md`). rules_go 0.63.0's own `go.mod:27` raised x/text from the root's `v0.0.0-20170915032832-14c0d48ead0c` to `v0.26.0`: `go version -m` on the binary shows `v0.26.0` while `go list -m golang.org/x/text` shows the 2017 version. Source mode reports findings against the wrong version. A stripped binary lacks the symbols binary-mode reachability needs, so govulncheck reports every vulnerable symbol that is merely linked. | `file <artifact>` must say `not stripped`, then `govulncheck -mode=binary <artifact>`: exit 3 is a finding. This is GO-MOD-13's gate, promoted to mandatory for Bazel-built releases. | yes (revision, `bzlgo11-unstripped-red.log`). A plant calling `norm.NFC.Bytes`, built `--strip=never` with the 2017 pin in `go.mod`, linked `v0.26.0` and failed with exit 3 (`GO-2026-5970 Found in: golang.org/x/text@v0.26.0`). After a `go.mod` bump to v0.39.0 it passed (exit 0, `No vulnerabilities found.`). Strip artifact (revision, `bzlgo11-strip.log`): the original `greet` tree built by default was `stripped` and failed with exit 3 (GO-2026-5970). Built `--strip=never` it passed (exit 0, "doesn't appear to call these"). Release run 4 repeats this on a separate module. | MUST (CLI release) | govulncheck v1.x |
| BZL-GO-14 | A release binary's `x_defs` references only `STABLE_*` keys whose values are a pure function of the commit (BZL-CACHE-20). Never `{BUILD_TIMESTAMP}`, `{BUILD_HOST}`, `{BUILD_USER}` or an unprefixed custom key. Keep a timestamp out of the binary, or derive it from the commit (`STABLE_COMMIT_TIME`). | A volatile key breaks byte-for-byte reproducibility on the same source. `BUILD_HOST` and `BUILD_USER` are *stable* status keys but differ per machine, so "stable" doesn't mean reproducible. `--stamp` alone guarantees nothing (BZL-HERM-18). The trap hides until the key is used: an `x_defs` target the program never reads is dead-code-eliminated and leaves the bytes unchanged. | `grep -rnoE --include='BUILD*' --include='*.bzl' -e '\{[A-Z][A-Z0-9_]*\}' . \| grep -v '{STABLE_'`: empty output passes. Planted: build twice from two clones in differently named directories with separate `--output_base`; `sha256sum` of the outputs must match. | yes. Grep (revision, `grep-plants.log`): matched `{BUILD_TIMESTAMP}` and `{BUILD_HOST}` in `xdefs-red` (exit 0) and was silent on `xdefs-green` (exit 1). Double build, release run 2: the compliant twin was byte-identical (`9da13437…` default, `0c8adc9b…` opt + strip). The `{BUILD_TIMESTAMP}` twin, printed by `main`, gave `092740d7…` vs `e7d9c6bf…`. Revision: `-c opt --strip=never --stamp` gave `402a7634…` in both clones (`repro-unstripped.log`). | MUST (CLI release) | Bazel 9.2.0 |
| BZL-GO-15 | Set `--strip` explicitly in the release config, as `--strip=never` (GO-REL-05 carried into Bazel). Never rely on Bazel's `--strip=sometimes` default, and never assume `-c opt` strips. Check the shipped artifact with `file`. | `sometimes` means "strip if `--compilation_mode` is `fastbuild`" (Bazel user manual), which is Bazel's default mode. So a plain `bazel build //cmd/x` release strips, the GO-REL-05 violation, and a `-c opt` build doesn't. rules_go 0.63.0 turns strip into link `-s -w` (`go/private/actions/link.bzl:188-189`). Its only other `compilation_mode` hook in `go/private/` is a `dbg` config_setting (`BUILD.bazel:204`), so for pure Go, `-c opt` mainly toggles stripping. Unstripped release output stays reproducible (BZL-GO-14's revision run). | `file bazel-bin/<pkg>/<target>_/<target>` for the release invocation must contain `not stripped`. Config check: `grep -qE -e '--strip[= ]' .bazelrc \|\| echo FINDING`. | yes. Strip matrix (release run 3, re-checked on explicit `bazel-out/k8-{opt,fastbuild}` paths): default → `stripped`; `-c opt` → `not stripped`; `--strip=never` → `not stripped`; `--strip=always` → `stripped`; `-c opt --strip=never` → `not stripped`. The config grep (revision) printed FINDING for `strip-red/.bazelrc` and passed `strip-green/.bazelrc`. | SHOULD (CLI release) | Bazel 9.2.0, rules_go 0.63.0 |

#### D. Reading heuristics (doc-derived, not fixture-run)

| ID | Rule | Rationale | Verification | Watched red? | Sev | Floor |
|---|---|---|---|---|---|---|
| BZL-GO-12 | Fix one external module's BUILD generation with a per-module `go_deps.gazelle_override`, and upstream it to `default_gazelle_overrides.bzl`. Never use `go_deps.gazelle_default_attributes`. | `gazelle_default_attributes` "will overwrite #3 (which now must be applied manually by users)": it turns off the public registry overrides for **every** module (`bzlmod.md:319-340`). | `grep -rn --include=MODULE.bazel -e 'gazelle_default_attributes' .`: empty output passes. | no. This is a reading heuristic: the precedence order is a single-source primary read, and reproducing it needs a module that ships a registry override. | SHOULD | gazelle 0.54.0 |
| BZL-GO-13 | When a Go module's version looks wrong under Bazel, look in three places in order. <br>1. `bazel_dep` in `MODULE.bazel`: a Go module that a Bazel module provides is always that version. <br>2. `go_deps.config(check_direct_dependencies = …)`: the default is a printed warning, and `"error"` fails the build. <br>3. The rule-set modules' own `go.mod` (BZL-GO-11). <br>`replace` in `go.mod` is effective only in the root Bazel module. | A plain-`go` mental model has no answer for any of the three. The dive named the attribute `checks`, but the real attribute is `check_direct_dependencies` (gazelle 0.54.0 `internal/bzlmod/go_deps.bzl:400,418-423,928-934`). | Reading order as stated. For the config: `grep -rn --include=MODULE.bazel -e 'check_direct_dependencies' .`. | no, doc-derived (dive §6). Case 3 was measured under BZL-GO-11. | CONSIDER | gazelle 0.54.0 |

**MUST count: 12** (BZL-GO-01..11 and 14. 02, 04, 05, 06, 09, 11 and 14 are code-kind- or
nogo-conditional as marked. BZL-GO-15 is SHOULD because GO-REL-05, which it carries, is a
CONSIDER-level fleet choice. Its Bazel-specific half, "set `--strip` explicitly", is what the
SHOULD enforces.)

#### Dropped from the dives, with reason

- **Dive BZL-GO-05 (a grep for a golangci-to-nogo bridge).** Nothing can be planted, so it's folded into BZL-GO-07's rationale.
- **Dive BZL-GO-06 (`gazelle -mode=diff` as the CI step).** It contradicts the published BZL-ARCH-12, which wins. BZL-ARCH-12's `bazel test //:gazelle_test` was run here for Go (`gz.log`):
  - PASSED when in sync (exit 0);
  - FAILED with exit 3 once `pkg/version/extra2.go` was planted (`+ "extra2.go",`);
  - PASSED again after `bazel run //:gazelle`.
- **Version sourcing (M-O-01).** BZL-FLAG-28 and BZL-ARCH-11 own it. The Go-specific trap is failure mode 1 below.
- **Release dive candidate 1, "absolute path only" for the status command.** Overclaimed. The revision showed that a workspace-relative path with a directory component works from `.bazelrc` and from a subdirectory. The failures come from `./` normalization and from `%workspace%` not being expanded. Folded into BZL-GO-09 with the portable form.
- **Release dive candidate 3, "`-c opt --strip=always` for a release".** Contradicts GO-REL-05 and go-release Verdict 4 ("do not strip by default"). The fleet decision wins. The Bazel-specific finding, that the default strips and `-c opt` doesn't, became BZL-GO-15 with `--strip=never`.
- **Release dive candidate 6 (`testing/synctest` is never a stdversion witness).** Not Bazel-specific. It's kept as a fixture note under BZL-GO-07 and routed to GO-MOD-01's owner (go-modules) for its own floor-check fixtures. It gets no BZL-GO ID.

## Applied to the exemplars and the future consumers

**Satisfied by the two dogfood repositories (the only Bazel-for-Go exemplars, 2/35, per [modrel] §6):**
- BZL-GO-01:
  - `bazel-contrib/rules_go@970e99d77c8b:MODULE.bazel:35-38` uses `go_sdk.from_file(go_mod = "//:go.mod")`.
  - `bazelbuild/bazel-gazelle@63c9a3d2078f:MODULE.bazel:35` uses `go_deps.from_file(go_work = "//:go.work")`.
  - Neither root module calls `go_sdk.host()`.
- BZL-GO-04 pattern: `bazel-contrib/rules_go@970e99d77c8b:MODULE.bazel:86-101` keeps maintainer-tool dependencies out of `//:go.mod` through `dev_go_deps.module(...)`, "which is also used to pick the Go SDK version". This file generalizes that precedent.
- BZL-GO-08: `bazel-contrib/rules_go@970e99d77c8b:BUILD.bazel:108` wires `race = "//go/config:race"`, the flag route. No boolean `race`/`pure` attribute appears in either repo outside `tests/`.
- Gazelle directive census: `exclude` has 12 hits in rules_go and 18 in gazelle, and `resolve` has zero ([modrel] §6). The map's "stale `resolve` overrides" worry has no exemplar behind it.
- BZL-GO-09, -14 and -15 have no exemplar either way. Neither dogfood repo ships a stamped release CLI through Bazel (release dive, Exemplar evidence).

**Violated:**
- **BZL-GO-05, in both repos.** nogo is registered only through `WORKSPACE` `go_register_nogo`:
  - `bazel-contrib/rules_go@970e99d77c8b:WORKSPACE:22-24` registers `@//internal:nogo`.
  - `bazelbuild/bazel-gazelle@63c9a3d2078f:WORKSPACE:36-43` registers it too.
  - Neither root `MODULE.bazel` carries `go_sdk.nogo` (grep count 0 in each).
  - rules_go pins `.bazelversion` 9.2.0, where `WORKSPACE` no longer exists (BZL-FLAG-12). Its Bzlmod build runs no nogo.
  - gazelle pins 8.2.1 and runs nogo only on the `--noenable_bzlmod --enable_workspace` legs (`.bazelci/presubmit.yml:16-17`).
  - The BZL-GO-05 script prints FINDING on both roots.
- **BZL-GO-06.** `bazelbuild/bazel-gazelle@63c9a3d2078f:BUILD.bazel:41-46` is `nogo(vet = True, deps = [".../copylock"])`. That is 6 analyzers, against go vet's 35.
- **GO-MOD-02, carried into Bazel.** `bazel-contrib/rules_go@970e99d77c8b:go.mod:3` (`toolchain go1.26.7`), in a module others import, pins its own Bazel SDK to 1.26.7 through `from_file` ([go-modules] violated table).
- **BZL-ARCH-12, sibling rule.** bazel-gazelle's root `BUILD.bazel` ships only the `gazelle()` half (BZL-ARCH-12's own rationale).
- **Docs versus BCR.** The `bzlmod.md` example pins rules_go 0.57.0 and gazelle 0.45.0, while the BCR is at 0.63.0 and 0.54.0 (dive §1). An agent that copies the snippet is 6 and 9 minors stale.

**New commitments for the future consumers (only if they adopt Bazel, owner Q7):**
- **OCX SDK for Go** (stdlib-only runtime, GO-MOD-10/11):
  - BZL-GO-02: a `go 1.26.0` floor plus a `download`ed stable SDK and an `sdk_version` leg.
  - BZL-GO-04: staticcheck for nogo only through a dev `go_deps.module`.
  - BZL-GO-07: `bazel run @rules_go//go -- vet ./...` alongside golangci-lint. This is the SDK's only Bazel-side guard for its `go 1.26.0` floor.
- **Go CLIs in the ocx/grimoire mould:**
  - BZL-GO-01 with GO-MOD-02's `toolchain` line.
  - BZL-GO-08: the race flag on the Linux leg (GO-GATE-04).
  - BZL-GO-09: `x_defs` for both the semver and the commit, from `tools/status.sh` named in a checked-in `.bazelrc` `release` config. This is what makes `--version` meet GO-REL-14 under Bazel.
  - BZL-GO-14 and -15: `STABLE_*`-only keys and `--strip=never` in that same `release` config, so the artifact is reproducible and scans precisely.
  - BZL-GO-10: `--platforms` for the `<tool>-<goos>-<goarch>[.exe]` matrix.
  - BZL-GO-11: `govulncheck -mode=binary` on the unstripped Bazel artifact before signing.
- **Mirrored binaries.** Upstream bazelbuild Go binaries the fleet mirrors (bazelisk, buildifier and others) get no new rule. GO-MOD-13's binary-mode audit is already their only gate. If a mirrored binary is stripped, no `--strip=never` twin can be built from its source, so its findings are an upper bound (BZL-GO-11's strip-artifact measurement), not confirmed reachability.
- **Routing row and keywords for `rules/bazel-quality.md`, per the map:**
  - Row: "Writing a `go_*` target, running Gazelle for Go, repinning `go_deps`, wiring `nogo`, or stamping a Go release".
  - Keywords: `rules_go`, `gazelle`, `go_deps`, `nogo`, `x_defs`.
  - The measurement disclosure says Bazel 9.2.0 **was run**, unlike `java.md`.

## AI-agent failure modes

Ranked by how often an agent will hit each one: first-contact setup, then CI wiring, then release.

1. **Copies `bazel_dep` versions from the `bzlmod.md` example (0.57.0/0.45.0) or a dogfood `MODULE.bazel` (gazelle pins rules_go 0.59.0).** Check: `curl -s https://bcr.bazel.build/modules/rules_go/metadata.json` gives the newest non-yanked version (BZL-FLAG-28).
2. **Declares `nogo()` and assumes it runs.** It either never registers the target or registers it with `go_register_nogo` in `WORKSPACE`. Check: the BZL-GO-05 script. A planted copylocks violation must fail the build.
3. **Treats a green `bazel test //...` as the race lane.** `race = "auto"` without the flag runs no detector. Check: BZL-GO-08's lane command on a racy plant.
4. **Reads `TOOLS_NOGO` as "go vet" and drops the vet or golangci step.** Check: BZL-GO-06's `comm` gap audit and BZL-GO-07's `bazel run @rules_go//go -- vet ./...`.
5. **Writes `vet = True` "to be thorough", beside `TOOLS_NOGO` or instead of it.** Check: the duplicate-label analysis error, and `grep -rn --include='BUILD*' -e 'vet = True' .`.
6. **Adds `passes/stdversion` to nogo and believes the `go 1.26.0` floor is now enforced.** It builds green whether or not the code calls a too-new API. Check: BZL-GO-07's external `vet` on a `bytes.CutLast` plant.
7. **Adds `tools.go` or a `tool` line to a library to get staticcheck into nogo.** Check: GO-MOD-11's grep. The fix is BZL-GO-04's dev proxy.
8. **Copies the textbook `--workspace_status_command=%workspace%/status.sh` into `.bazelrc`, or "fixes" it to `./status.sh`.** Both fail the stamped build (exit 1). Check: the BZL-GO-09 path grep. The fix is `tools/status.sh`.
9. **Sets `GOOS`/`GOARCH` around `bazel build`.** The build exits 0 with a host binary. Check: `file` on the output (BZL-GO-10).
10. **Ports `-ldflags -X` into `gc_linkopts`, or trusts `ReadBuildInfo` for the commit.** Check: the BZL-GO-09 grep. Also, `go version -m` on the Bazel binary shows no `build vcs.*` lines.
11. **Stamps `{BUILD_TIMESTAMP}` or `{BUILD_HOST}` into the version string and assumes `--stamp` keeps the build reproducible.** Check: the BZL-GO-14 key grep.
12. **Ships a plain `bazel build //cmd/x` (stripped) or assumes `-c opt` strips.** Both are backwards for Go under Bazel. Check: `file` on the release artifact (BZL-GO-15).
13. **Audits a Bazel binary with `go list -m all` or source-mode govulncheck, or treats a stripped scan's count as final.** Check: `govulncheck -mode=binary` on the `--strip=never` `bazel-bin/…` artifact (BZL-GO-11).
14. **Writes `race = True` or `pure = True`, then "fixes" the type error with `"true"`.** Check: the BZL-GO-08 grep.
15. **Hand-types `use_repo` names in forward domain order (`rsc_io_quote`).** Check: `bazel mod tidy` plus `git diff --exit-code MODULE.bazel` (BZL-GO-03, BZL-MOD-10).
16. **Wires `gazelle -mode=diff` as a shell step and calls the drift gate done.** Check: `bazel test //:gazelle_test` (BZL-ARCH-12).
17. **Reaches for `go_sdk.host()` because it needs no version.** Check: the BZL-GO-01 grep.
18. **Uses `gazelle_default_attributes` to fix one module and silently disables every public override.** Check: the BZL-GO-12 grep.
19. **Plants a `testing/synctest` call to test a stdversion gate, sees green, and "fixes" working wiring.** x/tools excludes that package from the check on every toolchain. Check: use `bytes.CutLast` (BZL-GO-07 fixture note).

## Open questions

**Owner decisions (the program's default applies until changed):**
- **Is nogo mandatory in a Bazel-for-Go repo?**
  - Default: no. It is CONSIDER for monorepos where Bazel is the only build path.
  - `nogo.rst` itself calls it "more suitable for large code bases".
  - BZL-GO-05/06 bind only when nogo is used, and BZL-GO-07 binds always.
- **Q7 still gates the whole file.**
  - Default: yes, as `rules/bazel-quality/go.md` (≤200 lines) in bazel-quality 0.3.0.
  - It reopens `bazel-topic-map.md:797`.
  - On "no", this file stays as research.

**Another research round needed:**
- **bazel-go / `go_work` and #1797.** The gazelle dogfood uses `go_deps.from_file(go_work = …)`. The dependency-cycle divergence in bazelbuild/bazel-gazelle#1797 (open) was not fixture-run, and neither was the Windows runtime behavior of the `windows_amd64` artifact (compiled only).
- **bazel-go / release across `--platforms`.** BZL-GO-14's byte-identity was measured for the host `linux_amd64` only. Cross-built `darwin`/`windows` artifacts under `--strip=never --stamp` have not been double-built.

## Conflicts resolved

1. **Dive against measurement, on the nogo gap.** The dive said `TOOLS_NOGO` lacks `nilness`, so GO-GATE-11 is uncovered.
   - Measured: rules_go 0.63.0's `TOOLS_NOGO` has 39 passes and includes `nilness`.
   - The real gap against go vet 1.27.1's 35 is `cgocall hostport stdversion waitgroup`. A waitgroup plant builds green.
   - BZL-GO-06 names the real gap.
2. **Dive against published BZL-ARCH-12, on the drift gate.** The dive proposed `gazelle -mode=diff`. The sibling rule forbids it, and `gazelle_test` was verified here for Go. The sibling wins, and no BZL-GO ID is allocated for it.
3. **Dive against GO-MOD-11, on how staticcheck reaches nogo.** The dive proposed `tools.go` or a `tool` directive. For a library or SDK, that leaks a `require` to consumers.
   - Resolution: a dev-only `go_deps.module` (BZL-GO-04), measured, including the hand-listed transitive requirement.
   - CLIs keep `tool`.
4. **Dive, internally, on race: per-target `race = "on"` against the docs' flag.** Measured: `auto` without the flag runs a racy test green. The lane is the flag (BZL-GO-08), and per-target `"on"` is the exception.
5. **Dive against GO-MOD-01/16, on the library SDK.** The dive read the `.0`-floor SDK as matching wave-2 guidance. In fact it removes the `stable` test leg. Resolution: BZL-GO-02 adds an extra SDK plus `sdk_version`, both measured.
6. **GO-REL-05 against rules_go, on stamping.** `-X` plus `ReadBuildInfo` becomes `x_defs` for both the semver and the commit, because `ReadBuildInfo` has 0 `vcs.*` settings under Bazel (measured).
7. **The map against the audit against the dive, on version lag.** The map said gazelle's README lags its `MODULE.bazel`. The audit shows the opposite: the README's `WORKSPACE` snippet pins 0.62.0 while `MODULE.bazel` pins 0.59.0. The dive shows `bzlmod.md` lagging the BCR by 6 and 9 minors. None of them is current: only BCR `metadata.json` is (BZL-FLAG-28).
8. **The dive's `go_deps.config(checks = …)` against gazelle's source.** The attribute is `check_direct_dependencies`, and its default is a print.
9. **The dive's two doc-derived MVS divergences against a third, measured one (amended in revision).** `go_deps` MVS includes rules_go's own `go.mod`, so the binary links a different x/text than the source graph shows. That became BZL-GO-11, a MUST. The first consolidation also claimed the uplift "shipped a vulnerable x/text". That claim rested on a **stripped** binary. Unstripped, the same tree scans clean. The version divergence stands. The reachable-vulnerability claim is withdrawn, and a new unstripped plant now carries the red.
10. **The audit ("both repos declare a `nogo`") against registration.** Declared isn't registered. Under Bzlmod neither repo registers nogo, which is the BZL-GO-05 violation.
11. **The dive against the audit, on gazelle's SDK.** The dive said gazelle has "no `go_sdk` call". The audit said it has a dev `download`. Both are partial: `MODULE.bazel:18-23` uses `go_sdk` only for `use_repo`, and `:58-59` is `go_sdk_dev.download(version = "1.24.12")`.
12. **Release dive ("an absolute path is the only form that works") against the revision's re-measurement.** The dive's three failing forms are real, but its explanation (the action's working directory "is not the workspace root") is wrong. The script logged the workspace root as its working directory on every run. The causes are `./` normalization to a `PATH` lookup (127) and no `%workspace%` expansion for this flag (the shell's `fg: no job control`). `tools/status.sh` works from `.bazelrc` and from a subdirectory. BZL-GO-09 prints the portable checked-in form, and absolute paths stay allowed.
13. **Release dive (`--strip=always` for releases) against GO-REL-05 / go-release Verdict 4 (don't strip).** The fleet decision wins, giving BZL-GO-15 `--strip=never`. The dive's "`-c opt` … as any release should, for optimized code" is also unsupported for pure Go. rules_go 0.63.0 uses the compilation mode for stripping and `dbg` only (source read). The revision measured that the unstripped release stays byte-reproducible, so the fleet choice costs nothing in reproducibility.
14. **Release dive BZL-GO-11 twin clause against the fleet default.** The dive made twin triage the normal release path, because it assumed a stripped release. With BZL-GO-15, the shipped artifact is unstripped and its scan is authoritative. The twin clause applies only to a repo that strips anyway (GO-REL-05's own wording).
15. **Release dive candidate 2's verification ("no automatic check exists … reading heuristic") against the revision.** An automatic check does exist. The BZL-GO-14 key grep went red on a planted `{BUILD_TIMESTAMP}`/`{BUILD_HOST}` and green on the `STABLE_*` twin, so BZL-GO-14 is a MUST, not a heuristic. The dive's candidate also allowed any key "without that prefix" to be only volatile. `BUILD_HOST` and `BUILD_USER` are stable yet machine-specific, and the rule names them.

## Sub-artifacts

- [go-bazel/rules-go-and-nogo.md](go-bazel/rules-go-and-nogo.md) — the merged wave-3 dive. It covers `from_file` precedence, `use_repo` and `bazel mod tidy`, Gazelle directives, `GO_TOOLS`, override tiers, nogo wiring, the golangci bridge status, race and pure, `x_defs` stamping and `--platforms`, with 10 Bazel 9.2.0 fixture runs.
- [go-bazel/stamping-and-release.md](go-bazel/stamping-and-release.md) — the follow-up round. It covers `--workspace_status_command` path forms, reproducibility with stable versus volatile keys, the `-c opt`/`--strip` matrix, govulncheck on stripped versus unstripped Bazel binaries, and nogo `stdversion` inertness with a debug-analyzer probe.

Fixture record (first consolidation, `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-consolidation/`):

| Path | What it holds |
|---|---|
| `bazel-go/` | A copy of the dive fixture with the planted violations: `pkg/wgbug`, `pkg/racebool`, `pkg/raceflag`. |
| `bazel-go-devdeps/` | The BZL-GO-04/09/10/11 runs. |
| `planted-host/`, `planted-ldflags/`, `unreg/` | The grep plants. |
| `greet.bazel`, `gvc.bazel.txt` | The original BZL-GO-11 binary (`file`: `stripped`) and its scan, superseded as evidence (Conflict 9). |
| `tools_nogo_0.63.0.txt`, `vet_1.27.1.txt` | The gap-audit inputs. |

Fixture record (revision, `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-bazel-revision/`, copied from the release dive's `go-bazel-release/base/`):

| Path | What it holds |
|---|---|
| `tools/status.sh`, `.bazelrc`, `wsc-forms.log`, `wsc-bazelrc.log` | BZL-GO-09 path forms: command line, `.bazelrc`, invoked from a subdirectory, `--nostamp`, and `%workspace%`. |
| `grep-plants/` + `grep-plants.log` | Red/green plants for the BZL-GO-09 path grep, the BZL-GO-14 key grep and the BZL-GO-15 config grep. |
| `clones/alpha/`, `clones/zeta-other/`, `repro-unstripped.log` | BZL-GO-14/15: `-c opt --strip=never --stamp` double build, `sha256 402a7634…` in both. |
| `clones/alpha/cmd/normcall/`, `bzlgo11-unstripped-red.log`, `bzlgo11-strip.log` | BZL-GO-11: the unstripped reachable plant (exit 3, then exit 0 after the bump), and the stripped-versus-unstripped re-run of the original tree. |

Bazel was run via `ocx exec -- bazelisk` (first consolidation) and via the same bazelisk
1.28.1 binary resolved from the ocx package store (revision). Release-dive runs are logged
under `go-bazel-release/` and `stamping-and-release/`.

## Revision log

2026-09-26, folding in `go-bazel/stamping-and-release.md`:
- **BZL-GO-11, evidence corrected (overclaim fixed).** The watched red was a stripped-binary false positive. It is replaced by an unstripped reachable plant (exit 3, then 0 after the bump). The rationale changes from "shipped a vulnerable x/text" to "links a different x/text". The rule now scans the `--strip=never` artifact, and the GO-REL-05 twin triage applies only if a repo strips anyway.
- **BZL-GO-09, recipe settled.** Checked-in `.bazelrc` with a directory-bearing relative path (`tools/status.sh`), or an absolute path. `%workspace%/…` and a directory-less filename are forbidden. A path-form grep was added and watched red and green. The Floor is now Bazel 9.2.0. This corrects the release dive's "absolute only" and its working-directory explanation.
- **BZL-GO-06, amended.** Never add `stdversion`, which is inert under nogo (measured). The expected gap-audit residue is `cgocall stdversion`.
- **BZL-GO-07, amended.** Named as the only Bazel-side enforcement of GO-MOD-01's floor. Added the `vet -stdversion` watched red and the `testing/synctest` fixture note.
- **BZL-GO-14, new (MUST, CLI release).** `x_defs` references only `STABLE_*` keys. Key grep and double build, both watched red and green.
- **BZL-GO-15, new (SHOULD, CLI release).** Set `--strip=never` explicitly, because Bazel's default strips fastbuild, not opt. Strip matrix and config grep watched red and green.
- **Verdict:** item 1 gains the stdversion bullet. Item 6 is extended with the strip trap and the withdrawn red. Items 7 (release recipe) and 9 (documented gap: nogo can't see the `go` line) are new. The old 7 and 8 are renumbered to 8 and 10. These are Verdict items, not rule IDs.
- **Open questions:** removed nogo `stdversion`, release artifacts and `--workspace_status_command` path forms, which are all answered. Added release reproducibility across `--platforms`. `go_work`/#1797 stays open.
- **Conflicts 9 amended; 12-15 added.** **Failure modes** 6, 8, 11, 12 and 19 added, 13 widened, and the list renumbered. **MUST count** 11 → 12.

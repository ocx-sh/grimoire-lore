---
title: "Building and shipping Go binaries — consolidated GO-REL ruleset"
topic: "Release and distribution (map section N, M-N-01..12; skill row M-P-01)"
model: opus
id_family: GO-REL
consolidates:
  - go-release/reproducible-builds-and-stamping.md
  - go-release/distribution-and-provenance.md
  - go-release/buildvcs-topologies.md
date: 2026-09-26
revised: 2026-09-26
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-release-consolidation/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-release-consolidation/buildvcs-r2/
---

# Building and shipping Go binaries (GO-REL)

Target depth file: `rules/go-modules/release.md` (glob list in the
[map](go-topic-map.md) Artifact set decision), drawn on by the `go-release`
skill (M-P-01). Tool versions as measured 2026-09-26: Go 1.27.1, goreleaser
2.17.1, cosign 3.1.3, govulncheck v1.8.0, `golang.org/x/exp/cmd/gorelease@latest`.

Short keys: **[RB]** = [reproducible-builds-and-stamping](go-release/reproducible-builds-and-stamping.md),
**[DP]** = [distribution-and-provenance](go-release/distribution-and-provenance.md),
**[BV]** = [buildvcs-topologies](go-release/buildvcs-topologies.md),
**[modrel]** = [exemplar-modules-and-release](go-audit/exemplar-modules-and-release.md),
**[cfg]** = [config-inventory](go-audit/config-inventory.md), **[C]** = a
verification run by this consolidation (listed under "Consolidation runs").

## Verdict

1. **The two release problems stay separate (map conflict 17).** Binaries the fleet *builds* follow GO-REL. Binaries the fleet *consumes* are verified by the mirror's `github_asset_digest` plus GO-MOD-13's binary scan, and GO-REL does not restate that.
2. **A fleet CLI release (CLI):**
   - Assets are raw per-platform binaries named `<tool>-<goos>-<goarch>[.exe]` for linux, darwin and windows on amd64 and arm64, plus `checksums.txt` (Q4). They are built by goreleaser v2 with `-trimpath`, with `CGO_ENABLED=0` on every build id, and with no wall-clock input.
   - The proof is two checks: a double build that produces the same sha256, and `go version -m` on every artifact. Reading the config does not count.
3. **Stamp the version with a fallback, not with one mechanism (CLI).**
   - `-X main.version={{.Version}}` sets it when goreleaser builds.
   - When that is empty, fall back to `debug.ReadBuildInfo().Main.Version` (tag-derived since Go 1.24), so `go install` and plain builds also report the tag.
   - Stamp no build date: `vcs.time` already carries the commit time.
   - This settles [RB]'s MUST ("always both") against the 4/35 exemplars that use only `ReadBuildInfo`, [modrel] §4.
4. **Do not strip by default (CLI).** `-s -w` keeps `BuildInfo` but lowers `govulncheck -mode=binary` precision on the shipped artifact from 1 finding to 4 ([RB] §6). The fleet takes the 33% size cost (2.4 MB → 1.6 MB in the fixture) to get an exact-artifact scan that stays precise. This is a decision, not a survey result: 7/11 exemplars strip.
5. **Sign only in CI, keyless (CLI).** Use `actions/attest-build-provenance` over the binaries and cosign `sign-blob --bundle` over `checksums.txt`, both on the GitHub Actions OIDC token. Never use a stored key and never sign locally. That reaches SLSA Build L2, not L3 ([DP] §5).
6. **Gate what tools don't gate (CLI).** `goreleaser check` exits 0 on a config with no `version: 2`, so grep the config for it. Asset names are checked in `dist/checksums.txt`, never with `find dist`.
7. **Library and SDK releases:** `gorelease` against the previous tag blocks an incompatible change before the tag. `/vN` and `retract` stay with GO-MOD-14 and GO-MOD-15.
8. **Every workflow in every fleet Go repo SHA-pins `uses:`**, not only release workflows (all code kinds). This matches `rust-cargo` CI-02 and GRADLE-CI-09.
9. **No container image, Homebrew, Scoop or winget unless asked.** When an image is needed, build it with `ko`, not goreleaser `dockers:`.
10. **VCS stamping on fleet repository shapes is settled (go 1.27.1, [BV] + [C10]).**
    - **"Multiple VCS detected" cannot fire on any pure-git layout.** Submodules, independent nested git repos and git worktrees are all exempt. The error needs two *different* VCS tools, such as git plus svn (go1.27.1:src/cmd/go/internal/vcs/vcs.go:516-522).
    - **Git worktrees stamp fully**, including a tag-derived `Main.Version` (watched on 1.27.1, [C10] `d-wt.bin` → `v1.2.3`). The fleet's own `.agents/worktrees/<name>` flow needs no flag.
    - **The real hazard is a silent degrade, not an error.** In both failure shapes below, `go build` exits 0 and prints no warning:
      - *Nested git boundary:* a main package inside a submodule or an independent nested repo gets no `vcs.*` settings at all.
      - *Nested module with no `go.mod` at the git root* ([golang/go#74763](https://github.com/golang/go/issues/74763)): `vcs.revision` is present, but `Main.Version` is `(devel)`.
    - **GO-REL-03's published check passed an unstamped binary.** It is now fixed to assert that `vcs.revision` is present. GO-REL-14 covers the #74763 layout.
    - **The ban on `-buildvcs=false` stands.** No fleet shape needs it.
    - **Documented gap:** #74763 is open and unfixed from go1.25rc2 through 1.27.1 ([BV] §8). Until it is fixed, GO-REL-14 is the layout workaround. Re-run `buildvcs-r2/run.sh` on every new Go minor release, and relax GO-REL-14 only when the `c-auto.bin` build prints the tag.

## The ruleset

Severity counts: 9 MUST, 4 SHOULD, 1 CONSIDER (14 rules). Code kind is CLI unless the row
says otherwise. Every "watched" cell names the run where the check was seen
going red on a planted violation and green on its twin.

### GO-REL — caught on the built artifact (`sha256sum`, `go version -m`)

| ID | Rule | Rationale | Verification | Watched red/green | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-REL-01 | Build every release binary with `-trimpath`, and derive every `-X` value from the commit (`{{.Version}}`, `{{.FullCommit}}`). Never derive one from the clock (`{{.Date}}`, `{{.Now}}`, `{{time …}}`, `$(date)`). Stamp no build date at all, because `vcs.time` in `BuildInfo` already carries the commit time. | Without `-trimpath` the absolute checkout path is embedded (`strings` finds `…/clone-a-dirname/main.go`). A wall-clock `-X` value changes the bytes on every build. | Two clean clones of one commit into differently named directories. Build each with the release flags, then run `sha256sum`: the hashes must match. Config pre-check: `grep -n -E '\{\{ *(\.Date\|\.Now\|time ) *' .goreleaser.y*ml goreleaser.y*ml .config/goreleaser.y*ml 2>/dev/null` inside `ldflags`. Any hit is a finding. | yes: [RB] Verification runs `repro-builds/` (good `b71027588c41…` = `b71027588c41…`; no `-trimpath` `019adc98…` ≠ `1dc92fdf…`; wall-clock `-X` `585b601b…` ≠ `9f1ea24b…`), re-run by [C1] | MUST | go 1.13 (`-trimpath`) |
| GO-REL-02 | Set `CGO_ENABLED=0` explicitly on every release build id. Never inherit it from the runner. A build id that genuinely needs cgo sets `CGO_ENABLED=1` on that id only, with a comment naming the cgo-only dependency (cosign's pkcs11 variant shape). The `-race` job keeps `CGO_ENABLED=1` (GO-GATE-04). | An unset value resolves to `1` whenever a C compiler is on `PATH`. A pure `net` + `os/user` program then links dynamically, and the cross-arch build `CGO_ENABLED=1 GOOS=linux GOARCH=arm64` dies in `gcc_arm64.S` with exit 1 ([RB] §4-5). | Per artifact: `for b in dist/*_*/<tool>*; do go version -m "$b" \| grep -q -E 'CGO_ENABLED=0$' \|\| echo "NOT-STATIC $b"; done`. Any output is a finding. | yes: [RB] `cgo-net-osuser/` (unset → dynamically linked, `CGO_ENABLED=1`; explicit 0 → static); [C2] (loop prints `NOT-STATIC …unset-cgo.bin`; silent on 6/6 snapshot binaries) | MUST | — |
| GO-REL-03 | A release artifact is built from a clean, VCS-stamped tree. `go version -m` shows a 40-hex `vcs.revision`, `vcs.modified=false` and no `+dirty`. The main package, its module and the build's working directory sit in one git repository: never build a release binary from a package inside a submodule or an independent nested repository. Never pass `-buildvcs=false` to a release build, even when the toolchain's own error message suggests it. `.gitignore` any independent nested repository kept inside a release checkout. *(Revised 2026-09-26: the "VCS-stamped" half is now verified, and the nested-boundary clause is new.)* | A dirty build ships code no commit describes. `-buildvcs=false` removes `vcs.revision` and blinds this check. A main package inside a nested git boundary is built with **no** `vcs.*` settings under the default `-buildvcs=auto`: exit 0, no warning (go1.27.1:src/cmd/go/internal/load/pkg.go:2591-2601). A `-X` version then hides the loss (`a-inner-x.bin` prints `v1.2.3` with 0 `vcs.revision` lines). `-buildvcs=true` turns this into exit 1 with "…Use -buildvcs=false to disable VCS stamping". That advice is the one fix this rule forbids; the right fix is to move the package. An untracked nested repository makes the outer build `+dirty` even when nothing changed ([BV] §4). | `m=$(go version -m <artifact>); echo "$m" \| grep -q -E '^[[:space:]]*build[[:space:]]+vcs\.revision=[0-9a-f]{40}$' && ! echo "$m" \| grep -q -E '\+dirty\|vcs.modified=true'`: exit 0 passes, exit 1 fails. `grep -rn -e 'buildvcs=false' .goreleaser.y*ml Makefile .github/workflows`: any hit on the release path is a finding. Write test builds outside the checkout, or the output file itself makes the tree dirty ([BV] §7). | yes: [C11] (new check: `out-A-good.bin` exit 0, `out-A-dirty.bin` exit 1, `a-inner-auto.bin` exit 1, `a-inner-x.bin` exit 1, `a-outer.bin` / `d-wt.bin` exit 0). **The superseded check `grep -E '\+dirty\|vcs.modified=true'` did not go red on `a-inner-auto.bin`: grep exit 1, i.e. a pass on an unstamped binary ([C10]).** Dirty half: [RB] `out-A-dirty.bin`, re-run by [C3]. | MUST | go 1.18 (VCS stamping); `+dirty` in `Main.Version` go 1.24 |
| GO-REL-04 | Leave `GOAMD64` at `v1` and `GOARM` unset unless a named hardware target requires a level. Never raise a level "for performance" on a distributed binary. | A binary built at `v3` requires x86-64-v3 CPUs ([go.dev/wiki/MinimumRequirements](https://go.dev/wiki/MinimumRequirements)). The corpus pins `goamd64` in 1/11 configs and pins `goarm` only beside an arm32 matrix ([modrel] §7). | `go version -m <artifact> \| grep -E 'GOAMD64=v[2-4]'`: any output is a finding. | yes: [C4] (`tool-linux-amd64-v3` prints `build GOAMD64=v3`, exit 0; `-v1` twin empty, exit 1) | SHOULD | go 1.18 (`GOAMD64`) |
| GO-REL-05 | Do not pass `-s -w` by default. A repository that strips anyway runs GO-MOD-13's binary scan on the exact shipped artifact. It triages any finding that source-mode `govulncheck ./...` (GO-MOD-12) did not report against an unstripped twin built with identical flags minus `-s -w`. | Stripping keeps `BuildInfo` (`go version -m` is identical) but drops the symbol table that binary-mode reachability needs. The result is 4 findings stripped vs 1 unstripped on the same module. | `govulncheck -mode=binary <artifact>`: exit 3 with a finding count. Compare the count against the twin. | yes (the measurement): [RB] `strip-govuln/` (unstripped 1 finding / stripped 4, both exit 3), matching GO-MOD-13 | CONSIDER | govulncheck v1.x |
| GO-REL-14 | A Go CLI module that does not sit at its git repository's top level puts a `go.mod` at that top level. The root module path is the parent of the nested module path (`example.com/repo` → `example.com/repo/tools/mytool`), and the CLI is tagged `<dir>/vX.Y.Z` (GO-MOD-14). The alternative is to move the CLI into its own repository. This is the shape of a Go tool inside a Rust repository such as ocx or grimoire. Checking `-buildvcs=true` or the build's exit code does not prove the version is stamped. | [golang/go#74763](https://github.com/golang/go/issues/74763), open on 1.27.1: `goModPath(repoDir)` reads only the git root's `go.mod`, and without one the build jumps to `omitVCS` after it has already recorded `vcs.*` (go1.27.1:src/cmd/go/internal/load/pkg.go:2634-2637). `Main.Version` stays `(devel)` at a tag, with exit 0 even under `-buildvcs=true`. GO-REL-06's fallback then prints `(devel)`. A root `go.mod` whose path is unrelated to the nested path still gives `(devel)`. | Check out the `<dir>/vX.Y.Z` tag and build in the module dir with no `-X`: `go build -trimpath -o <out-outside-tree> .`. Then `go version -m <out> \| grep -c -E '^[[:space:]]*mod[[:space:]].*\(devel\)'` must print `0`. Reading pre-check: the nested `module` line equals the root `module` line plus `/` plus `git rev-parse --show-prefix`, without the trailing slash. | yes: [C10]/[C12] (no root `go.mod` → `c-auto.bin` count 1, `-buildvcs=true` exit 0, still `(devel)`; unrelated root path → `c-unrel.bin` count 1; parent/child paths + `tools/mytool/v1.2.6` → `c-fixed.bin` prints `v1.2.6`, count 0) | SHOULD | go 1.25 (regression; go 1.24 stamped a pseudo-version) |

### GO-REL — caught by running the binary

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-REL-06 | Provide `--version` (or `version`) with no network call. Declare `var version = ""`, set by `-X main.version={{.Version}}`. When it is empty, fall back to `debug.ReadBuildInfo().Main.Version`, then append the 12-character `vcs.revision`. Never ship a hard-coded `"dev"` default without that fallback, and never print `BuildInfo` or its `String()` raw. Release jobs check out with tags (`fetch-depth: 0`). The fallback yields the tag only when the module sits at the git root, or satisfies GO-REL-14. Anywhere else it yields `(devel)`. *(Caveat added 2026-09-26.)* | A `"dev"` default reports `dev` for every `go install mod@vX.Y.Z` and every plain build. A shallow clone without tags stamps a pseudo-version instead of the tag. A raw `BuildInfo` print dumps the whole dependency graph in an internal format. Git worktrees are not a hazard: the fallback prints the tag there ([C10] `d-wt.bin`). | Build at a tag with plain `go build -trimpath` (no `-X`), then `./tool --version \| grep -c -F vX.Y.Z` must print `1`. For a nested module the tag is `<dir>/vX.Y.Z`. Workflow: `grep -rn -A3 -e 'actions/checkout' .github/workflows/release*.yml` must show `fetch-depth: 0`. | yes: [C5] (fallback twin prints `v1.2.3 (b2e5837a2b08)`, count 1; `"dev"` twin prints `dev`, count 0; shallow `--no-tags` clone prints `v0.0.0-20260101000000-b2e5837a2b08`, tagged shallow clone `v1.2.3`). The same check went red on the #74763 layout ([C10] `c-auto.bin` → `(devel)`, count 0). | MUST | go 1.24 (tag-derived `Main.Version`); nested-module layout go 1.25+ needs GO-REL-14 |

### GO-REL — caught by grep over the goreleaser config and a snapshot build

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-REL-07 | Every goreleaser config starts with `version: 2`. Gate that with a grep, never with `goreleaser check`'s exit code. | goreleaser 2.17.1 `check` prints "yours is version: 0" and still **exits 0**. It fails only on YAML syntax errors ([DP] §2). | `grep -c -E '^version:[[:space:]]*2$' <config>` must print `1`. | yes: [DP] Verification runs §4, re-run by [C6] (both configs `check` exit 0; grep 1 vs 0) | MUST | goreleaser v2 |
| GO-REL-08 | Publish raw binaries, not archives: `archives: [{formats: [binary], name_template: "{{ .Binary }}-{{ .Os }}-{{ .Arch }}"}]`, `checksum.name_template: checksums.txt`, and `goos` linux/darwin/windows × `goarch` amd64/arm64. Tag releases `vX.Y.Z`, the mirror's `tag_pattern`. PR CI runs `goreleaser release --snapshot --clean` whenever release config changes, then asserts the six names. | The fleet mirror selects assets with anchored per-platform regexes and verifies them by `github_asset_digest` (`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:23-24`, `bazelisk/mirror.yml:16,28-36`). goreleaser's default `binary` name is `<bin>_<version>_<os>_<arch>`, which matches none of them. The snapshot needs no token or identity ([DP] §1). | `for p in linux-amd64 linux-arm64 darwin-amd64 darwin-arm64 'windows-amd64\.exe' 'windows-arm64\.exe'; do awk '{print $2}' dist/checksums.txt \| grep -c -E "^<tool>-$p\$"; done`: every line must print `1`. Read `checksums.txt` or `artifacts.json`, never `find dist` (the build path is `dist/<id>_<os>_<arch>_v1/<bin>`). | yes: [DP] runs §2-3, re-run by [C7] (snapshot exit 0 both; Q4 config `1 1 1 1 1 1`, default template `0 0 0 0 0 0`) | MUST | goreleaser v2 |
| GO-REL-09 | Emit a per-binary SPDX SBOM from goreleaser (`sboms: [{artifacts: binary}]`, syft). Never count it as covering a container image. | `rust-cargo` REL-04 pairs embedded dependency data with an SBOM. Go's embedded half is `BuildInfo`, and it survives `-s -w`. goreleaser's docs exclude images from SBOM cataloguing ([DP] §3). | Snapshot `dist/checksums.txt` lists `<tool>-<os>-<arch>.spdx.sbom.json` per platform. | green only: [C7] (6 `.spdx.sbom.json` documents; syft missing from `PATH` fails the snapshot with exit 1) | SHOULD | — |
| GO-REL-10 | Ship no container image unless one is asked for. When one is needed, build it with `ko build` (distroless static base, SPDX SBOM attached as an OCI referrer), not with goreleaser `dockers:`. | `dockers:` needs a Docker daemon and gets no SBOM. ko needs neither a Dockerfile nor a daemon ([DP] §3, [ko.build](https://ko.build/features/sboms/)). | Reading heuristic: `grep -n -E '^(dockers\|dockers_v2):' <config>`. A hit is a finding unless the owner asked for an image. | no (no Docker daemon in the sandbox) | SHOULD | — |

### GO-REL — caught by grep over `.github/workflows`

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-REL-11 | Sign in CI only, keyless:<br>- The release job declares `permissions: {contents: write, id-token: write, attestations: write}`.<br>- It runs `actions/attest-build-provenance` with `subject-path: dist/<tool>-*`.<br>- goreleaser `signs: [{cmd: cosign, artifacts: checksum, signature: "${artifact}.sigstore.json", args: [sign-blob, "--bundle=${signature}", "${artifact}", --yes]}]`.<br>Never commit or store a signing key or a long-lived publish token. Never use `--output-signature` or `--output-certificate`, which are deprecated in cosign 3.x. | Keyless signing outside CI blocks on an OAuth device flow that looks like a hang (`timeout 12 cosign sign-blob` → exit 124). A stored key signs malicious builds for as long as it leaks ([DP] §4-5; `rust-cargo` REL-04/06). | `grep -c -E 'id-token:[[:space:]]*write' .github/workflows/release*.yml` must be ≥1, and `grep -rn -e '--output-signature' -e '--output-certificate' -e 'COSIGN_PRIVATE_KEY' .github .goreleaser.y*ml` must be empty. After release: `gh attestation verify <asset> -R <owner>/<repo>` and `cosign verify-blob --bundle checksums.txt.sigstore.json --certificate-identity-regexp '^https://github.com/<owner>/<repo>/' --certificate-oidc-issuer https://token.actions.githubusercontent.com checksums.txt`. | partial: [DP] §7 (keyless hang exit 124; local-key `verify-blob` OK exit 0 / tampered exit 1). The keyless green path can only run under GitHub Actions OIDC, so the workflow grep is a reading heuristic by necessity. Q4 binds the choice. | MUST | cosign ≥2.3 (`--bundle`) |
| GO-REL-12 | Pin every `uses:` in every workflow of a fleet Go repository to a 40-hex commit SHA with a `# vX.Y.Z` trailer. This applies to lint and docs workflows too, not only release workflows. `./` local actions are exempt. | Tags are mutable, and GitHub calls a full SHA "the only way to use an action as an immutable release" ([secure-use](https://docs.github.com/en/actions/reference/security/secure-use)). Pinning does not track release status in the corpus (conflict 2 below). | `grep -rnE 'uses:[[:space:]]*[^.[:space:]][^[:space:]]*@' .github/workflows \| grep -vE '@[0-9a-f]{40}([[:space:]]\|$)'`: any output is a finding; exit 1 with empty output is the pass. | yes: [C8] (planted `actions/checkout@v7` printed, exit 0; all-SHA twin empty, exit 1) | MUST (all kinds) | — |

### GO-REL — caught by `gorelease` (library and SDK)

| ID | Rule | Rationale | Verification | Watched | Sev | Floor |
|---|---|---|---|---|---|---|
| GO-REL-13 | Before tagging a library or SDK, run `go run golang.org/x/exp/cmd/gorelease@<pinned> -base=<previous tag> -version=<next tag>`. A non-zero exit blocks the tag. The fix is a `/vN` major (GO-MOD-14) or restoring the API, never a minor bump. `gorelease` does not handle `retract`, which is GO-MOD-15. | An exported symbol removed in a minor release breaks every consumer on `go get -u`, and the tag is immutable once proxied. | The `gorelease` exit code, with `v1.1.0 is not a valid semantic version … There are incompatible changes.` on failure. | yes: [C9] (additive change → exit 0 "valid semantic version"; removed `Bye` → exit 1 "incompatible changes") | MUST (library, SDK) | — |

### Rules merged away or cited instead

- **Absorbed into GO-REL-02:** [RB] candidates 03 (scope CGO per build id) and 04 (cross-compile needs CGO=0). One per-artifact check catches all three.
- **Absorbed into GO-REL-01:** [RB] 09 (`CommitDate`), made stricter: stamp no date at all.
- **Absorbed into GO-REL-03:** [RB] 07 and 11; [BV] 1 (no wording change proposed, but the verification was replaced, see conflict 13); [BV] 3 (nested-boundary builds, without its `-buildvcs=false` escape); [BV] 6 (`.gitignore` nested repositories).
- **Absorbed into GO-REL-06:** [RB] 05, 06 and 14; [BV] 4 (worktrees confirmed, no rule change).
- **Absorbed into GO-REL-08:** [RB] 13 (the matrix), and [DP] 1, 2 and 4.
- **Absorbed into GO-REL-14:** [BV] 2 and 7.
- **Cited, not restated:**
  - [DP] 7 is GO-MOD-13.
  - [DP] 9 is GO-MOD-15.
  - Nested-module tags (`dir/vX.Y.Z`) are GO-MOD-14.
  - The race-job CGO rule is GO-GATE-04.
  - Source-mode `govulncheck` is GO-MOD-12.
- **Dropped:**
  - [RB] 08 (`mod_timestamp`): conflict 5 below.
  - [RB] 12 (multiple-VCS on Go ≥1.25): its premise is false for every git-only layout ([BV] §2, conflict 11). The real hazard it pointed at is GO-REL-14.
  - [BV] 5 ("multiple VCS detected" is a different error): this is diagnosis rather than a rule, so it became AI-agent failure mode 15.

## Conflicts resolved

1. **`goreleaser check` as the v2 gate.** Map row M-N-07 has `goreleaser check` validating the config, and the v2 migration post says `version: 2` is needed "to pass `goreleaser check`". [DP] measured that `check` exits 0 on a config with no `version:` key. [C6] re-ran it on goreleaser 2.17.1 and got exit 0 on both configs. **Resolved:** GO-REL-07 greps instead, because the tool's exit code does not enforce the rule.
2. **SHA-pinning scope.** [modrel] Smell 7 says pinning is bimodal by release status and should apply only to release-adjacent workflows. [DP] §9 says every workflow. [C8] ran the pin grep read-only over the exemplars: testify and go-cmp have no release workflow and show 0 unpinned refs, while `junegunn/fzf` ships goreleaser releases with 15 unpinned refs, including `release.yml:22,26,63`. So the correlation fails in both directions. **Resolved:** every workflow (GO-REL-12), which is also the published `rust-cargo` CI-02 / GRADLE-CI-09 scope.
3. **Version stamping mechanism.** [RB] candidate 05 says a MUST that `-X` and `ReadBuildInfo` are used together. [modrel] §4 counts 4/35 exemplars (rules_go, caddy, go-tools, x/tools) on `ReadBuildInfo` alone. **Resolved:** GO-REL-06 requires the fallback order, `-X` if set and otherwise `Main.Version`. Only the fallback serves `go install mod@vX`, and [C5] watched a `"dev"`-only binary built at a tag report `dev`.
4. **Which artifact the binary scan reads.** GO-MOD-13 says to scan the exact release artifact. [RB] candidate 10 says to scan the unstripped artifact. **Resolved:** fleet builds don't strip (GO-REL-05), so both are the same file. Where a repository strips, the exact artifact is scanned, because stripping over-reports rather than hides findings, and the unstripped twin is used only for triage.
5. **`mod_timestamp` as a reproducibility P0.** Map row M-N-01 says it matters. [RB] §2 traced it to a post-build `os.Chtimes`, which matters only inside archives. **Resolved:** under Q4's raw-binary format the asset's bytes don't carry the mtime, so no rule. A repository that ships archives against GO-REL-08 sets it; 3/12 goreleaser users do today ([modrel] §3).
6. **Build date: `{{.CommitDate}}` or none.** [RB] candidate 09 says to use `CommitDate`. **Resolved:** no date `-X` at all. `vcs.time=2026-01-01T00:00:00Z` is already embedded ([C5] `go version -m`), so a date `-X` only adds a way to break GO-REL-01.
7. **Mirrored binaries that fail `govulncheck`.** [DP] candidate 7 blocks the release. GO-MOD-13 (SHOULD) makes the scan the only gate for mirrored binaries. [DP] §6 measured 4/4 mirrored bazelbuild binaries failing: 53, 5, 5 and 7 stdlib findings, and the fleet has no rebuild path. **Resolved:** fleet-built binaries block on source-mode reachability (GO-MOD-12). Mirrored binaries report without blocking; see the open question.
8. **The CGO rules.** [RB] proposed three MUSTs (02/03/04), and two of them verify only by reading. **Resolved:** one rule (GO-REL-02), checked per artifact with `go version -m` ([C2]).
9. **SBOM.** Q4 lists no SBOM, while `rust-cargo` REL-04 is a MUST that includes one. **Resolved:** SHOULD (GO-REL-09). Go already embeds its dependency list in `BuildInfo`, the analogue of `cargo-auditable`, and it survives `-s -w` ([RB] §6).
10. **Citation fixes:**
    - [cfg] §5 and [DP] cite `mirror-base.yml:22-23`. The verify block is at lines 23-24 at `713abea9fbb8`, re-read here.
    - [modrel] §4 calls `-buildvcs=true` the default. The default is `auto` ([pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go), [RB] §1).
    - [BV] Summary calls the `-buildvcs=false` ban "GO-REL-11". It is GO-REL-03.
11. **"Multiple VCS detected" as a Go ≥1.25 monorepo hazard.** [RB] §7 and candidate 12 said nested VCS roots make the build fail, and advised budgeting for `-buildvcs=false`. The map (promotion list) repeated that the fleet's worktree layout might trip it. [BV] §2 read the 1.27.1 source: `vcsCmd == vcsGit && vcs == vcsGit` is an unconditional `continue` (go1.27.1:src/cmd/go/internal/vcs/vcs.go:516-521, re-read here). [BV] also saw the string in none of about 20 builds, and [C10] saw it in none of its runs either. **Resolved:** the error needs two different VCS tools, and no fleet shape has that. `GODEBUG=allowmultiplevcs=1` only governs that different-tool case, so it is not a remedy for `(devel)`.
12. **An escape hatch for main packages inside a nested git boundary.** [BV] candidate 3 would let such a build id pin `-buildvcs=false` with a comment. GO-REL-03 bans `-buildvcs=false`. **Resolved:** the ban stands, and the rule now forbids the layout instead. The escape hatch would ship a binary that no commit identifies. `auto` output and `false` output are identical there ([BV] §3), so the flag fixes nothing. Fleet submodules hold only vendored Rust crates under `external/` ([BV] §9), so no fleet build needs the hatch.
13. **Does GO-REL-03 need a change?** [BV] candidate 1 said no, because the ban on `-buildvcs=false` holds on every shape. [C10] ran GO-REL-03's published check, `grep -E '\+dirty|vcs.modified=true'`, on `a-inner-auto.bin`. That binary has no `vcs.*` settings at all, and the grep exited 1: a **pass**. The published check only asserted "not dirty", never "stamped", so it overclaimed the rule's "VCS-stamped" half. **Resolved:** the verification was replaced in place. The new check also requires a 40-hex `vcs.revision` ([C11]: red on the unstamped, `-X`-masked and dirty binaries, green on the clean, submodule-outer and worktree binaries).
14. **Does a root `go.mod` fix #74763, and does it yield the tag?** [BV] §5 fixed the layout only with a parent/child module path, and got a pseudo-version (`v1.2.4-0.…`), not the tag. It had tagged `tools/mytool/v2.0.0` on a module path without `/v2`, and GO-MOD-14 makes that tag invalid. [C12] tagged `tools/mytool/v1.2.6` and got exactly `v1.2.6`. An unrelated root path at `tools/mytool/v1.2.7` still gave `(devel)`. **Resolved:** GO-REL-14 requires the parent/child path and a valid `<dir>/vX.Y.Z` tag, and the fix does yield the tag.
15. **Worktree support "new in Go 1.27".** [BV] §2 attributes `.git`-file root detection to [golang/go#58218](https://github.com/golang/go/issues/58218), milestone Go1.27. The source comment cites that issue (go1.27.1:src/cmd/go/internal/vcs/vcs.go:571-572). This consolidation checked neither the milestone nor older toolchains. **Resolved:** worktree safety is claimed for go 1.27.1 only, the version fleet CLIs declare (Q1). No rule depends on older behaviour.

## Applied to the exemplars and the future consumers

**Satisfied by strict exemplars:**
- **Full recipe:** `goreleaser/goreleaser@ff8de3d6c389:.goreleaser.yaml:23,33,49-53` has `-trimpath`, `CGO_ENABLED=0`, commit-derived `-X` and `version: 2`. Its `.github/workflows/release.yml:29-30` is SHA-pinned, and it carries `signs:`. That covers GO-REL-01/02/07/11/12.
- **CGO exception shape:** `sigstore/cosign@907c3d899c0e:.goreleaser.yml:8,37-43` sets top-level `CGO_ENABLED=1` for the pkcs11 variant and overrides it back to 0 per build id. This is the shape GO-REL-02 permits.
- **Stamping:** `oras-project/oras@a0cd4de5cfcd:internal/version/version.go:17-26` is the curated semver var block. cli/cli, ko and oras print curated `--version` output, and none of them print raw `BuildInfo` ([modrel] §4). That covers GO-REL-06 in part.
- **v2 configs:** all 11 measured goreleaser configs carry `version: 2` ([modrel] §3; GO-REL-07 has not bitten the corpus).
- **Nested git boundary:** `dominikh/go-tools@6cb65e58a558:.gitmodules` is the corpus's only submodule, `website/themes/docsy`, a Hugo theme outside every Go package. This is the GO-REL-03 shape. No exemplar has the #74763 layout: every multi-module repository (4/35) keeps a root `go.mod` ([BV] Exemplar evidence). GO-REL-14 has not bitten the corpus.

**Violated:**

| Rule | Exemplar evidence |
|---|---|
| GO-REL-01 | `golangci/golangci-lint@032d962e0399:.goreleaser.yml:10`: `-X main.date={{.Date}}` (wall clock). |
| GO-REL-01 | `cli/cli@9b031151a825:.goreleaser.yml:32`: `-X …build.Date={{time "2006-01-02"}}`. The same file's build entries (lines 19-50) omit `-trimpath`; only the dev path `script/build.go:58` passes it. |
| GO-REL-02 | `cli/cli@9b031151a825:.goreleaser.yml:19-33`: the `macos` build id sets no `CGO_ENABLED`, so cgo is on implicitly. Its own triage workflow encodes the matrix as `"darwin amd64 1"` (`.github/workflows/dependabot-triage.lock.yml:474`). |
| GO-REL-05 | 7/11 goreleaser configs pass `-s -w`, e.g. `cli/cli@9b031151a825:.goreleaser.yml:32` and `junegunn/fzf@b1be3a8be1b8:.goreleaser.yml:33` ([modrel] §3). This is the corpus norm, which the program overrides deliberately. |
| GO-REL-08 | No exemplar ships the mirror shape. `junegunn/fzf@b1be3a8be1b8:.goreleaser.yml:87` names archives `{{ .ProjectName }}-{{ .Version }}-{{ .Os }}_{{ .Arch }}`, and goreleaser's default binary template is `_`-separated and versioned ([C7] red twin). Only bazelbuild's non-goreleaser releases match ([cfg] §5.1). |
| GO-REL-12 | `junegunn/fzf@b1be3a8be1b8:.github/workflows/release.yml:22,26,63` has `actions/checkout@v7`, `setup-go@v7` and `goreleaser-action@v7` in a release workflow. `urfave/cli@d1d810845dbc` has 10 unpinned refs, `syncthing/syncthing@94c3c1cdef71` has 62 and `restic/restic@5127c4abf921` has 16 ([C8]). |
| GO-REL-03, GO-REL-06 (consumed side) | The mirrored `buildifier`/`buildozer`/`unused-deps` were built with go1.20.3 and carry no module path or VCS stamp (`go version -m` shows only `go1.20.3 X:nocoverageredesign`, [DP] §6). The fleet cannot tell which commit it mirrors. |

**New commitments:**

| Consumer | Binding rules |
|---|---|
| **Go CLIs (ocx/grimoire mould)** | GO-REL-01..12. The `go-release` skill ships the Q4 `.goreleaser.yaml` from [DP] §1 with `-s -w` removed, plus a release workflow that is SHA-pinned, has `id-token: write`, uses `fetch-depth: 0`, and runs the snapshot + anchored-name job on PRs. Its artifact check is the revised GO-REL-03 (`vcs.revision` present). |
| **A Go tool inside a non-Go repository** (e.g. `tools/<name>/` in ocx or grimoire, which have no root `go.mod`) | GO-REL-14 in addition to the CLI set. Otherwise it gets a separate repository. The existing `external/` submodules there hold Rust crates and are outside any Go build ([BV] §9), so GO-REL-03's nested-boundary clause is already met. |
| **Go SDK** (stdlib-only library wrapping `ocx`) | GO-REL-12 and GO-REL-13. Tag hygiene per GO-MOD-14/15. No binaries, so GO-REL-01..11 and 14 do not apply. |
| **Fleet mirror** (consuming upstream Go binaries) | No GO-REL rule. `github_asset_digest` plus the GO-MOD-13 report (conflict 7). |

## AI-agent failure modes

Ranked by how often the corpus or the dives show them biting:

1. **A wall-clock value in `ldflags`** (`{{.Date}}`, `{{time …}}`, `$(date)`). Seen in 2 of the 8 goreleaser configs grepped here (golangci-lint, cli/cli). **Check:** the GO-REL-01 grep, then the double build.
2. **Treating `-s -w` as free, or dropping `govulncheck` because a stripped scan is noisy.** 7/11 configs strip. **Check:** grep `-s -w` in `ldflags`; GO-REL-05 twin triage.
3. **Assuming unset `CGO_ENABLED` means 0**, especially for cross builds. **Check:** the GO-REL-02 per-artifact `go version -m` loop.
4. **Keeping goreleaser's default archive and name template.** It is the corpus norm, and every exemplar config deviates from Q4. **Check:** the GO-REL-08 anchored counts over `checksums.txt`.
5. **Tag-pinned actions copied from READMEs** (`@v7`). Seen in 6+ exemplars. **Check:** the GO-REL-12 grep.
6. **Trusting `goreleaser check || exit 1` to catch a missing `version: 2`.** **Check:** the GO-REL-07 grep.
7. **Verifying asset names with `find dist -name '<tool>-linux-amd64'`**, which reports the asset missing on a correct snapshot. **Check:** read `dist/checksums.txt` or `dist/artifacts.json` ([DP] §1).
8. **`fmt.Println(debug.ReadBuildInfo())` or a bare `var version = "dev"`.** **Check:** GO-REL-06, running `--version` on a build at a tag.
9. **Stale cosign invocations** (`--output-signature`, `--tlog-upload=false`), or keyless signing run locally or in an agent sandbox, where it hangs. **Check:** the GO-REL-11 greps; wrap any dry run in `timeout`.
10. **Believing `sboms:` covers a `dockers:` image.** **Check:** GO-REL-10's `dockers:` grep.
11. **Raising `GOAMD64` "for speed".** **Check:** the GO-REL-04 `go version -m` grep.
12. **Treating `mod_timestamp` as a `go build` or `GOFLAGS` knob.** It is goreleaser's post-build `os.Chtimes` ([RB] §2). **Check:** `grep -rn -e 'GOFLAGS.*mod_timestamp' -e 'go build.*mod_timestamp' .` must be empty.
13. **Editing `retract` into the retracted version's own `go.mod`.** **Check:** GO-MOD-15's `go list -m -retracted`.
14. **Following the toolchain's "Use -buildvcs=false to disable VCS stamping" hint**, or treating a green build (`-buildvcs=true` included) as proof of stamping. The first ships a binary with no commit identity. The second misses #74763, which exits 0. An `-X` version on the same binary hides both. **Check:** the revised GO-REL-03 `vcs.revision` assertion and the GO-REL-14 `(devel)` count, both on the artifact.
15. **Reaching for `GODEBUG=allowmultiplevcs=1` or avoiding worktrees** after a `(devel)` report. Neither is related: the godebug only governs git-plus-another-VCS, and worktrees stamp fully on 1.27.1. Diagnose instead:
    - No `vcs.*` lines in `go version -m`: the package sits inside a nested git boundary (GO-REL-03).
    - `vcs.revision` present with `(devel)`: the #74763 layout (GO-REL-14).

    **Check:** `grep -c -F 'multiple VCS detected'` on the build's stderr must be non-zero before that godebug is considered at all.

## Open questions

**Owner decisions** (the program applies the default until told otherwise):
- **Mirrored upstream Go binaries with stdlib vulnerabilities** (4/4 today, 70 findings). *Default:* the mirror records the `govulncheck -mode=binary` result without blocking, and an upstream rebuild is requested. The alternative is blocking, which freezes `mirror-bazelbuild` entirely.
- **Double signing.** The GitHub attestation and the cosign bundle on `checksums.txt` both rest on the same Sigstore OIDC identity. *Default:* keep both, per Q4. The alternative is attestation only, which saves one step and one asset.
- **`-s -w` off by default** (Verdict 4). *Default:* off. Flip it if binary size becomes a real complaint.

**Another research round:**
- **release / cgo-on-darwin:** does `CGO_ENABLED=0` on darwin degrade DNS resolution (VPN or split-DNS resolvers) enough to justify cli/cli's darwin build with cgo on? The fleet cannot measure this without a macOS runner.
- **release / keyless-green-path:** run the GO-REL-11 workflow in a throwaway GitHub repository. Watch `gh attestation verify` and `cosign verify-blob` go green on the asset and red on a tampered copy, so the MUST gets a watched verification.

## Sub-artifacts

- [go-release/reproducible-builds-and-stamping.md](go-release/reproducible-builds-and-stamping.md): the flags for a byte-reproducible binary, CGO posture, the `-X` / `ReadBuildInfo` stamping recipe, the cross-compile matrix, and the `-s -w` cost to `govulncheck`. Includes double-build fixtures. Its §7 and candidate 12 ("multiple VCS detected" as a monorepo hazard) are superseded by [BV].
- [go-release/distribution-and-provenance.md](go-release/distribution-and-provenance.md): the Q4 asset shape through a goreleaser snapshot, the `goreleaser check` gap, cosign keyless vs local key, attestation and SLSA level, SBOM and ko, the mirror `govulncheck` audit, `retract` and `gorelease`, and SHA pinning.
- [go-release/buildvcs-topologies.md](go-release/buildvcs-topologies.md): how `setBuildInfo` compares three `vcs.FromDir` calls, and why git-on-git is exempt from "multiple VCS". It measures five layouts (plain clone, submodule, independent nested repo, #74763 nested module, worktree) under `auto`/`true`/`false`, and the fleet's own `.gitmodules`.

### Consolidation runs

Toolchain: Go 1.27.1 via `/home/mherwig/.cache/research-lang/go-tools/run.sh`; goreleaser 2.17.1; syft from ocx. Fixture root: `…/fixtures/go-release-consolidation/`. C1-C9 read the dive fixtures and re-ran them in place, never rebuilding them. C10-C12 used a fresh fixture, `buildvcs-r2/run.sh`, which rebuilds its own repositories under `work/` and writes binaries to `out/`, outside every repository.

| Run | What was run | Result |
|---|---|---|
| C1 | `sha256sum out-*-good.bin out-*-notrim.bin` in `reproducible-builds-and-stamping/repro-builds` | good `b71027588c41c7e3` ×2; notrim `019adc98623e5648` / `1dc92fdf0badfc0c` |
| C2 | The GO-REL-02 loop over `release-dist/dist/*_*/mytool*` (6 binaries) and over `cgo-net-osuser/unset-cgo.bin` | Silent on the 6 binaries; prints `NOT-STATIC …unset-cgo.bin`. Also `grep -c 'CGO_ENABLED=0$'`: 0 / exit 1 vs 1 / exit 0. |
| C3 | `go version -m out-A-{good,dirty}.bin \| grep -E '\+dirty\|vcs.modified=true'` | good exit 1; dirty exit 0 with `…c11396192dff+dirty` and `vcs.modified=true` |
| C4 | `go version -m cross-matrix/tool-linux-amd64-{v1,v3} \| grep -E 'GOAMD64=v[2-4]'` | v1 exit 1; v3 `build GOAMD64=v3`, exit 0 |
| C5 | `version-stamp/{good,bad}`: tag `v1.2.3`, `CGO_ENABLED=0 go build -trimpath` with no `-X` | good `v1.2.3 (b2e5837a2b08)`, count 1; bad `dev`, count 0 |
| C5 | Clones of the good twin: `git clone --depth 1 --no-tags` vs `--depth 1` | `v0.0.0-20260101000000-b2e5837a2b08` vs `v1.2.3` |
| C6 | `goreleaser check -f .goreleaser.yaml` / `-f .goreleaser-v1shaped.yaml` | exit 0 / exit 0, with the "yours is version: 0" warning; `grep -c -E '^version:[[:space:]]*2$'` gives 1 / 0 |
| C7 | `goreleaser release --snapshot --clean` with `.goreleaser-nosign.yaml` vs `.goreleaser-defaultname-violation.yaml` | Both exit 0; anchored counts `1 1 1 1 1 1` vs `0 0 0 0 0 0`. Without syft on `PATH` the snapshot fails with exit 1 (`exec: "syft": executable file not found`). |
| C8 | `sha-pin/{bad,good}`: the GO-REL-12 grep | bad prints `lint.yml:4: uses: actions/checkout@v7`, exit 0; good empty, exit 1 |
| C8 | The same grep read-only over exemplars | unpinned refs: urfave/cli 10, cobra 10, fzf 15, restic 16, syncthing 62; goreleaser, testify, go-cmp 0 |
| C9 | `gorelease/lib`: `v1.0.0` served from a `file://` GOPROXY, then `go run golang.org/x/exp/cmd/gorelease@latest -base=v1.0.0 -version=v1.1.0` | Additive change: exit 0, "v1.1.0 is a valid semantic version". Exported `Bye` removed: exit 1, "There are incompatible changes." |
| C10 | `bash buildvcs-r2/run.sh`. Shape (a): `outer` (`go.mod` at root, tag `v1.2.3`) plus submodule `external/sub` (package `cmd/subtool`, no `go.mod`). Shape (c): `mono` (no root `go.mod`, `tools/mytool/go.mod`, tags `v1.2.3` and `tools/mytool/v1.2.5`). Shape (d): worktree at `.agents/worktrees/feat`. All builds are `go build -trimpath` with no `-X` unless noted. | (a) `a-outer.bin` → `v1.2.3`, 1 `vcs.revision`. `a-inner-auto.bin` build exit 0 → `(devel)`, 0 `vcs.revision` lines; **old GO-REL-03 grep exit 1 (pass)**. `-buildvcs=true` → exit 1, `main package is in repository "<outer>/external/sub" but current directory is in repository "<outer>"` / `Use -buildvcs=false to disable VCS stamping.` With `-X main.version=v1.2.3` → prints `v1.2.3`, 0 `vcs.revision` lines. (c) `c-auto.bin` exit 0 → `(devel)` with 1 `vcs.revision`; `-buildvcs=true` exit 0, still `(devel)`; GO-REL-06 `grep -c -F v1.2.5` → 0. (d) `d-wt.bin` (`.git` is a `gitdir:` file) → `v1.2.3`. `multiple VCS detected` appeared in no output. |
| C11 | The revised GO-REL-03 check over `repro-builds/out-A-{good,dirty}.bin` and C10's `a-outer`, `a-inner-auto`, `a-inner-x`, `c-auto`, `d-wt` | exit 0, 1, 0, 1, 1, 0, 0 |
| C12 | C10 fix variants in `mono`. First, root `go.mod` `example.com/mono` + nested `example.com/mono/tools/mytool`, tag `tools/mytool/v1.2.6`. Second, nested path reverted to `example.com/mytool`, tag `tools/mytool/v1.2.7`. Then `go version -m <bin> \| grep -c -E '^[[:space:]]*mod[[:space:]].*\(devel\)'`. | `c-fixed.bin` prints `v1.2.6`, count 0. `c-unrel.bin` prints `(devel)`, count 1. `c-auto.bin` count 1. |

## Revision log

- 2026-09-26: GO-REL-03's verification was replaced in place. The old `+dirty` grep passed a binary with no VCS stamp at all ([C10]). The new check also asserts a 40-hex `vcs.revision` ([C11]).
- 2026-09-26: GO-REL-03's rule text was extended in place. It now forbids building release binaries from inside a submodule or an independent nested repository, forbids following the toolchain's `-buildvcs=false` hint, and requires `.gitignore` for nested repositories. The meaning of the ID is unchanged ("clean, VCS-stamped tree"). Source: [BV] §3-4 and candidates 3 and 6.
- 2026-09-26: GO-REL-06 gained a caveat. The `Main.Version` fallback yields the tag only at the git root, or under GO-REL-14. Its verification is unchanged: it went red on the #74763 layout ([C10]). Worktrees are confirmed safe.
- 2026-09-26: GO-REL-14 was added (SHOULD). It is the layout fix for golang/go#74763: a root `go.mod` with a parent/child module path and a `<dir>/vX.Y.Z` tag, watched red and green in [C12].
- 2026-09-26: Verdict 10 was added. It settles VCS stamping across fleet repository shapes and records #74763 as a documented gap with a re-run trigger.
- 2026-09-26: Conflicts 11-15 were added, and conflict 10 gained the [BV] GO-REL-11→03 citation fix. [RB] 12's drop reason moved from "not reproduced" to "premise false". [BV] candidates were mapped under "Rules merged away".
- 2026-09-26: AI-agent failure modes 14-15 were added. They cover the `-buildvcs=false` hint and exit code as proof, and the `allowmultiplevcs` and worktree misdiagnoses.
- 2026-09-26: The Open question "release / reproducible-builds" (multiple VCS, #74763) was removed as answered. Severity counts are now 9 MUST, 4 SHOULD, 1 CONSIDER. Frontmatter: [BV] was added to `consolidates`, with `revised:` and the `buildvcs-r2` fixture.

## Key sources

- [go.dev/blog/rebuild](https://go.dev/blog/rebuild): reproducibility technique vocabulary. It covers the Go distribution itself, not user binaries ([RB] Contested).
- [pkg.go.dev/cmd/go](https://pkg.go.dev/cmd/go): `-trimpath`, and `-buildvcs=auto|true|false`. VCS info is stamped only "if the main package, the main module containing it, and the current directory are all in the same repository".
- [pkg.go.dev/cmd/link](https://pkg.go.dev/cmd/link#hdr-Options): `-s`, `-w`, and the constant-only limit of `-X`.
- [pkg.go.dev/runtime/debug#BuildInfo](https://pkg.go.dev/runtime/debug#BuildInfo): `Main.Version` and the `vcs.*` settings.
- [go.dev/doc/go1.24](https://go.dev/doc/go1.24#go-command): tag-derived main-module version and `+dirty`.
- go1.27.1 `src/cmd/go/internal/vcs/vcs.go:516-522` (the nested-git exemption and the "multiple VCS detected" error) and `:574` (`vcsGitRoot.isRoot`, worktree `.git` files). `src/cmd/go/internal/load/pkg.go:2591-2613` (the package/module repository mismatch → `omitVCS`, or an error under `-buildvcs=true`) and `:2634-2637` (`goModPath(repoDir)` → `omitVCS`, the #74763 path). All read locally in the ocx-installed toolchain.
- [golang/go#74763](https://github.com/golang/go/issues/74763): a nested module with no root `go.mod` stamps `(devel)` since go1.25rc2. Open, Backlog, still reproduced on 1.27.1 ([BV] §8, [C10]).
- [golang/go#58218](https://github.com/golang/go/issues/58218): `.git` worktree files as git roots, as cited in the go1.27.1 source comment.
- [go.dev/doc/godebug](https://go.dev/doc/godebug): `allowmultiplevcs`, which covers different-VCS nesting only.
- [pkg.go.dev/net § Name Resolution](https://pkg.go.dev/net#hdr-Name_Resolution): when the cgo resolver is used.
- [goreleaser.com/customization/archive](https://goreleaser.com/customization/archive/): `formats: [binary]` and the default name template.
- [goreleaser.com/blog/goreleaser-v2](https://goreleaser.com/blog/goreleaser-v2/): the `version: 2` requirement.
- [goreleaser.com/customization/sbom](https://goreleaser.com/customization/sbom/): the SBOM scope, which excludes images.
- [docs.sigstore.dev/cosign/signing/overview](https://docs.sigstore.dev/cosign/signing/overview/): keyless signing (Fulcio, Rekor, OIDC).
- [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds): `attest-build-provenance` and `gh attestation verify`.
- [slsa.dev/spec/v1.0/levels](https://slsa.dev/spec/v1.0/levels): Build L2 vs L3.
- [pkg.go.dev/golang.org/x/exp/cmd/gorelease](https://pkg.go.dev/golang.org/x/exp/cmd/gorelease): the API-compatibility release gate.
- [docs.github.com secure-use](https://docs.github.com/en/actions/reference/security/secure-use): SHA pinning of actions.
- 2026-09-26 (authoring): GO-REL-11 attests via `subject-checksums: dist/checksums.txt` (N-15); GO-REL-01 rationale no longer claims `{{ .Date }}` changes the bytes (N-16).

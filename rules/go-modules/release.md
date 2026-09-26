---
title: Building, Stamping and Shipping Go Binaries
summary: The GO-REL family, covering reproducible release flags, CGO and VCS stamping checked on the artifact, the --version fallback, the nested-module stamping layout, goreleaser v2 asset shape and SBOM, container images via ko, keyless signing, and SHA-pinned workflows
---

# Building, Stamping and Shipping Go Binaries

Binds to Go 1.27.1, goreleaser 2.17.1, cosign 3.1.3, govulncheck v1.8.0 and syft
(measured 2026-09-26).

Owns everything between `go build` and a published release asset: the flags a
release binary is built with, what `go version -m` must show on it, how
`--version` finds its tag, the goreleaser config, container images, signing, and
the pinning of the workflows that do it. Does not own the module itself. The
`/vN` major and the `<dir>/vX.Y.Z` tag convention are `GO-MOD-14`, retracting a
bad tag is `GO-MOD-15`, and source-mode and binary-mode `govulncheck` are
`GO-MOD-12` and `GO-MOD-13`, all in `GO-MOD` (the go-modules index). The `-race`
job's cgo setting is `GO-GATE-04` in `GO-GATE` (the lint and CI gate, `gates.md`).
The API-compatibility gate before tagging a library or SDK is `GO-API-10` in
`GO-API` (package shape and the SDK surface, in the go-quality rule set). A
binary you consume rather than build is `GO-MOD-13`'s binary scan, never this file.
GO-REL-13 is retired in favour of GO-API-10, and its number is not reused.

Contents: [Dates and Floors](#dates-and-floors) ·
[Checked on the Built Artifact](#checked-on-the-built-artifact) ·
[Checked by Running the Binary](#checked-by-running-the-binary) ·
[Checked on the goreleaser Config and a Snapshot](#checked-on-the-goreleaser-config-and-a-snapshot) ·
[Checked on the Workflows](#checked-on-the-workflows) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Every floor below is toolchain-gated: the Go that builds the binary decides it,
not the `go` line.

- **go 1.13:** `-trimpath`. **go 1.18:** VCS stamping (`vcs.revision`,
  `vcs.modified`) and `GOAMD64`.
- **go 1.24:** `Main.Version` is derived from the VCS tag, with `+dirty` on a
  modified tree. Before 1.24 the `--version` fallback prints `(devel)`.
- **go 1.25 through 1.27.1:** [golang/go#74763](https://github.com/golang/go/issues/74763),
  open and unfixed on 2026-09-26. A nested module with no `go.mod` at the git root
  stamps `(devel)` with exit 0. GO-REL-14 is the layout workaround. Re-run its
  check on every new Go minor, and relax GO-REL-14 only when that build prints the tag.
- **go 1.27.1 only:** git worktrees stamp fully, tag included. Older toolchains were not measured.
- **goreleaser v2:** `version: 2` and `formats: [binary]`. **cosign 2.3 and later:**
  `sign-blob --bundle`. `--output-signature` and `--output-certificate` are
  deprecated in cosign 3.x.

**Pinned defaults** (default, and the adopter may override each once): raw
per-platform binaries plus `checksums.txt` (GO-REL-08), no `-s -w` (GO-REL-05),
a GitHub attestation plus a cosign bundle on `checksums.txt` (GO-REL-11), and no
container image unless one is asked for (GO-REL-10).

## Checked on the Built Artifact

Run after `goreleaser release --snapshot --clean`, or after any build that writes
`dist/<id>_<os>_<arch>*/`. Reading the config never counts as this check.

```bash
# artifact-check: any output is a finding, empty output is the pass
TOOL=mytool   # rename: your binary name
for b in dist/*/"$TOOL"*; do
  go version -m "$b" | grep -q -e 'CGO_ENABLED=0$' || echo "NOT-STATIC $b"
  go version -m "$b" | grep -q -E '^[[:space:]]*build[[:space:]]+vcs\.revision=[0-9a-f]{40}$' || echo "UNSTAMPED $b"
  go version -m "$b" | grep -q -e '+dirty' -e 'vcs.modified=true' && echo "DIRTY $b"
  go version -m "$b" | grep -q -e 'GOAMD64=v[2-4]' && echo "RAISED-GOAMD64 $b"
done

# devel-check (GO-REL-14): in the module dir, at its <dir>/vX.Y.Z tag, no -X.
# Prints 0 on the pass. 1 means Main.Version is (devel), the finding.
OUT=/tmp/devel-check.bin   # outside the checkout, or the output file dirties the tree
go build -trimpath -o "$OUT" .
go version -m "$OUT" | grep -c -E '^[[:space:]]*mod[[:space:]].*\(devel\)'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-REL-01 | Build every release binary with `-trimpath`, and derive every `-X` value from the commit (`{{.Version}}`, `{{.FullCommit}}`). Never derive one from the clock (`{{.Date}}`, `{{.Now}}`, `{{time …}}`, a shell `date`). Stamp no build date at all, because `vcs.time` in `BuildInfo` already carries the commit time. | Without `-trimpath` the absolute checkout path is embedded, and a wall-clock `-X` value (`{{.Now}}`, a shell `date`) changes the bytes on every build. Either one breaks byte-reproducibility. A date stamp only duplicates `vcs.time`, so the rule bans `{{.Date}}` too. | Double build: two clean clones of one commit into differently named directories, each built with the release flags, then `sha256sum` over both outputs. Differing hashes are the finding. Config pre-check: `grep -rn --include='*goreleaser*.y*ml' -e '{{ *\.Date' -e '{{ *\.Now' -e '{{ *\.CommitDate' -e '{{ *time ' .`, where a hit inside `ldflags` is the finding and empty output is the pass. | MUST |
| GO-REL-02 | Set `CGO_ENABLED=0` explicitly on every release build id. Never inherit it from the runner. A build id that genuinely needs cgo sets `CGO_ENABLED=1` on that id only, with a comment naming the cgo-only dependency. The `-race` job keeps `CGO_ENABLED=1` (GO-GATE-04). | Unset resolves to `1` whenever a C compiler is on `PATH`. A pure `net` plus `os/user` program then links dynamically, and the cross-arch build dies in `gcc_arm64.S` with exit 1. | `artifact-check`: a `NOT-STATIC` line is the finding. | MUST |
| GO-REL-03 | Build a release artifact from a clean, VCS-stamped tree: `go version -m` shows a 40-hex `vcs.revision`, `vcs.modified=false` and no `+dirty`. The main package, its module and the build's working directory sit in one git repository, so never build a release binary from a package inside a submodule or an independent nested repository. Never pass `-buildvcs=false` to a release build, even when the toolchain's own error message suggests it. `.gitignore` any independent nested repository kept inside a release checkout. | A dirty build ships code no commit describes. A main package inside a nested git boundary builds with **no** `vcs.*` settings under the default `-buildvcs=auto`, with exit 0 and no warning, and a `-X` version hides the loss. `-buildvcs=true` turns that into an error whose advice is the one fix this rule forbids. | `artifact-check`: an `UNSTAMPED` or `DIRTY` line is the finding. A "not dirty" grep alone passed an unstamped binary (measured 2026-09-26), so the `vcs.revision` assertion is required. Then `grep -rn -e 'buildvcs=false' .`, where any hit on the release path is the finding and empty output is the pass. | MUST |
| GO-REL-04 | Leave `GOAMD64` at `v1` and `GOARM` unset unless a named hardware target requires a level. Never raise a level for performance on a distributed binary. | A binary built at `v3` refuses to run on CPUs below x86-64-v3. | `artifact-check`: a `RAISED-GOAMD64` line is the finding. | SHOULD |
| GO-REL-05 | **pinned**: do not pass `-s -w` by default. A repository that strips anyway runs GO-MOD-13's binary scan on the exact shipped artifact, and triages any finding that source-mode `govulncheck ./...` (GO-MOD-12) did not report against an unstripped twin built with identical flags minus `-s -w`. | Stripping keeps `BuildInfo` but drops the symbol table that binary-mode reachability needs: 4 findings stripped against 1 unstripped on the same module (govulncheck v1.8.0, measured 2026-09-26). The size saving was 2.4 MB to 1.6 MB. | `grep -rn --include='*goreleaser*.y*ml' --exclude-dir=.github -e '-s -w' -e '-w -s' -e '^[[:space:]]*- -s[[:space:]]*$' -e '^[[:space:]]*- -w[[:space:]]*$' .` locates stripping, and empty output means the rule is met. On a hit, `govulncheck -mode=binary` on the artifact and on its twin (text format exits 3 on findings) and compare the counts. | CONSIDER |
| GO-REL-14 | A Go CLI module that does not sit at its git repository's top level puts a `go.mod` at that top level, whose module path is the parent of the nested one (`example.com/repo` for `example.com/repo/tools/mytool`), and tags the CLI `<dir>/vX.Y.Z` (GO-MOD-14). The alternative is moving the CLI into its own repository. This is the shape of a Go tool inside a Rust or Python repository. | golang/go#74763: without a root `go.mod` the build records `vcs.*` but leaves `Main.Version` at `(devel)` at a tag, exiting 0 even under `-buildvcs=true`. A root `go.mod` with an unrelated module path still gives `(devel)`. | `devel-check` prints `0` on the pass. Reading pre-check: the nested `module` line equals the root `module` line plus `/` plus `git rev-parse --show-prefix` without its trailing slash. A green build or `-buildvcs=true` proves nothing here. | SHOULD |

## Checked by Running the Binary

```bash
# version-check: prints 1 on the pass, 0 is the finding
VERSION=v1.2.3   # rename: the tag checked out (for <dir>/v1.2.3 the version is v1.2.3)
go build -trimpath -o /tmp/version-check.bin .   # plain build at the tag, no -X
/tmp/version-check.bin --version | grep -c -F "$VERSION"
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-REL-06 | Provide `--version` (or `version`) with no network call. Declare `var version = ""`, set by `-X main.version={{.Version}}`. When it is empty, fall back to `debug.ReadBuildInfo().Main.Version`, then append the 12-character `vcs.revision`. Never ship a hard-coded `"dev"` default without that fallback, and never print `BuildInfo` or its `String()` raw. Release jobs check out with tags (`fetch-depth: 0`). The fallback yields the tag only when the module sits at the git root or satisfies GO-REL-14, and `(devel)` anywhere else. | A `"dev"` default reports `dev` for every `go install mod@vX.Y.Z` and every plain build. A shallow clone without tags stamps a pseudo-version instead of the tag. A raw `BuildInfo` print dumps the whole dependency graph. Git worktrees are not a hazard (go 1.27.1). | `version-check` prints `1` on the pass. Then `grep -rn -e 'fetch-depth: *0' .github/workflows`, a presence check where empty output is the finding. | MUST |

```go
// wrong: every go install mod@vX.Y.Z and every plain build reports "dev"
var version = "dev"

// right: -X sets it in the release build, BuildInfo supplies the tag everywhere else
var version = ""

func versionString() string {
	v := version
	bi, ok := debug.ReadBuildInfo()
	if !ok {
		return v
	}
	if v == "" {
		v = bi.Main.Version
	}
	for _, s := range bi.Settings {
		if s.Key == "vcs.revision" && len(s.Value) >= 12 {
			v += " (" + s.Value[:12] + ")"
		}
	}
	return v
}
```

## Checked on the goreleaser Config and a Snapshot

`goreleaser release --snapshot --clean` needs no token and no signing identity.
It exits 1 when syft is missing from `PATH` and `sboms:` is set. Asset names live
in `dist/checksums.txt` or `dist/artifacts.json`. The build path is
`dist/<id>_<os>_<arch>_v1/<bin>`, so `find dist -name` reports a correct asset as missing.

```bash
# asset-names: every line must print 1, and a 0 is the finding
TOOL=mytool   # rename: your binary name
for p in linux-amd64 linux-arm64 darwin-amd64 darwin-arm64 'windows-amd64\.exe' 'windows-arm64\.exe'; do
  awk '{print $2}' dist/checksums.txt | grep -c -E "^$TOOL-$p\$"
done
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-REL-07 | Start every goreleaser config with `version: 2`. Gate that with a grep, never with `goreleaser check`'s exit code. | goreleaser 2.17.1 `check` prints "yours is version: 0" and still exits 0 (measured 2026-09-26). It fails only on YAML syntax errors. | `grep -rL --include='*goreleaser*.y*ml' --exclude-dir=.github -e '^version: *2$' .` lists configs that lack the line. Any output is the finding, and empty output is the pass. | MUST |
| GO-REL-08 | **pinned**: publish raw binaries, not archives. Set `archives: [{formats: [binary], name_template: "{{ .Binary }}-{{ .Os }}-{{ .Arch }}"}]`, `checksum.name_template: checksums.txt`, and `goos` linux, darwin, windows by `goarch` amd64, arm64. Tag releases `vX.Y.Z`. PR CI runs the snapshot whenever release config changes, then asserts the six names. | A downstream mirror or installer selects assets with anchored per-platform names and verifies them by GitHub's asset digest. goreleaser's default name is `<bin>_<version>_<os>_<arch>`, which matches none of them. | `asset-names`: six lines of `1` is the pass, and any `0` is the finding. | MUST |
| GO-REL-09 | Emit a per-binary SPDX SBOM from goreleaser (`sboms: [{artifacts: binary}]`, syft). Never count it as covering a container image. | Go's embedded dependency list is `BuildInfo`, which survives `-s -w`, and the SBOM is its shippable twin. goreleaser's docs exclude images from SBOM cataloguing. | `grep -c -e '\.spdx\.sbom\.json$' dist/checksums.txt` prints `6` on the pass, one per platform. A lower count is the finding. | SHOULD |
| GO-REL-10 | **pinned**: ship no container image unless one is asked for. When one is needed, build it with `ko build` (distroless static base, SPDX SBOM attached as an OCI referrer), not with goreleaser `dockers:`. | `dockers:` needs a Docker daemon and gets no SBOM. ko needs neither a Dockerfile nor a daemon. | `grep -rn --include='*goreleaser*.y*ml' -e '^dockers:' -e '^dockers_v2:' .`: a hit is the finding unless the owner asked for an image, and empty output is the pass. The ko path is unwatched (no Docker daemon in the measuring sandbox). | SHOULD |

## Checked on the Workflows

```bash
# pin-check: any output is a finding, and exit 1 with empty output is the pass
grep -rnE 'uses:[[:space:]]*[^.[:space:]][^[:space:]]*@' .github/workflows | grep -vE '@[0-9a-f]{40}([[:space:]]|$)'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-REL-11 | **pinned**: sign in CI only, keyless. The release job declares `permissions: {contents: write, id-token: write, attestations: write}` and runs `actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`. A `subject-path: dist/<tool>-*` matches only the SBOMs, because goreleaser 2.17.1 with `formats: [binary]` keeps each binary under `dist/<id>_<os>_<arch>_<variant>/` (measured 2026-09-26). goreleaser `signs:` runs cosign with `artifacts: checksum`, `signature: "${artifact}.sigstore.json"` and `args: [sign-blob, "--bundle=${signature}", "${artifact}", --yes]`. Never commit or store a signing key or a long-lived publish token. Never use `--output-signature` or `--output-certificate`. | Keyless signing outside CI blocks on an OAuth device flow that looks like a hang (`timeout 12 cosign sign-blob` exits 124). A stored key signs malicious builds for as long as it leaks. This reaches SLSA Build L2, not L3. | `grep -rn -e 'id-token: *write' .github/workflows` is a presence check, where empty output is the finding. `grep -rn --include='*.yml' --include='*.yaml' -e '--output-signature' -e '--output-certificate' -e 'COSIGN_PRIVATE_KEY' .`: any hit is the finding, and empty output is the pass. Documented gap: after release, `gh attestation verify` and `cosign verify-blob --bundle` are the end-to-end proof, unwatched on the keyless path because it only runs under GitHub Actions OIDC. | MUST |
| GO-REL-12 | Pin every `uses:` in every workflow of the repository to a 40-hex commit SHA with a `# vX.Y.Z` trailer, lint and docs workflows included, not only release workflows. `./` local actions are exempt. | Tags are mutable, and GitHub calls a full SHA the only immutable way to use an action. Unpinned refs appear in release and non-release workflows alike, so scoping by release status misses both ways. | `pin-check`: any output is the finding. | MUST |

## What Agents Get Wrong Here

1. **A wall-clock value in `ldflags`** (`{{.Date}}`, `{{time …}}`, a shell
   `date`). Popular exemplar configs do it, so it reads as normal. GO-REL-01.
2. **Treating `-s -w` as free**, or dropping `govulncheck` because the stripped
   scan is noisy. Most published configs strip. GO-REL-05.
3. **Assuming unset `CGO_ENABLED` means 0**, especially for cross builds. The
   runner's C compiler decides. GO-REL-02.
4. **Keeping goreleaser's default archive and name template.** Every copied
   config deviates from the pinned asset shape. GO-REL-08.
5. **Tag-pinned actions copied from READMEs** (`@v7`). GO-REL-12.
6. **Trusting `goreleaser check || exit 1` to catch a missing `version: 2`.** It
   exits 0. GO-REL-07.
7. **Verifying asset names with `find dist -name`**, which reports a correct
   snapshot's asset as missing. Read `dist/checksums.txt`. GO-REL-08.
8. **`fmt.Println(debug.ReadBuildInfo())` or a bare `var version = "dev"`.**
   GO-REL-06.
9. **Stale cosign flags** (`--output-signature`, `--tlog-upload=false`), or
   keyless signing run locally or in an agent sandbox, where it hangs. Wrap any
   dry run in `timeout`. GO-REL-11.
10. **Believing `sboms:` covers a `dockers:` image.** GO-REL-09, GO-REL-10.
11. **Raising `GOAMD64` for speed.** GO-REL-04.
12. **Treating `mod_timestamp` as a `go build` or `GOFLAGS` knob.** It is
    goreleaser's post-build file mtime, which only matters inside archives, so
    it earns no rule under the raw-binary default.
13. **Following the toolchain's "Use -buildvcs=false to disable VCS stamping"
    hint, or treating a green build as proof of stamping.** The first ships a
    binary no commit identifies. The second misses golang/go#74763, which exits
    0 even under `-buildvcs=true`, and an `-X` version hides both. GO-REL-03,
    GO-REL-14, checked on the artifact.
14. **Reaching for `GODEBUG=allowmultiplevcs=1`, or avoiding worktrees, after a
    `(devel)` report.** "Multiple VCS detected" needs two different VCS tools
    (git plus svn, say) and cannot fire on any git-only layout, submodules
    included. Diagnose from `go version -m` instead: no `vcs.*` lines means a
    nested git boundary (GO-REL-03), and `vcs.revision` present with `(devel)`
    means the #74763 layout (GO-REL-14).

# Release config templates

Read this when a repository has no goreleaser config or no release workflow
yet, or when reviewing one against the runbook. Both files are the pinned
defaults: raw per-platform binaries, `checksums.txt`, a per-binary SBOM, a
keyless cosign bundle and a build-provenance attestation. Rename `mytool` and
the module path to yours. Every version and commit SHA below was resolved on
2026-09-26, and the goreleaser file was run with goreleaser 2.17.1, Go 1.27.1
and syft 1.51.0.

Contents: [The goreleaser config](#the-goreleaser-config) ·
[The release workflow](#the-release-workflow) ·
[Two measured traps in these files](#two-measured-traps-in-these-files)

## The goreleaser config

Save as `.goreleaser.yaml` at the module root. goreleaser also finds
`.goreleaser.yml`, `goreleaser.y*ml` and `.config/goreleaser.y*ml`. The runbook's
commands name `.goreleaser.yaml`, so rename them if yours differs.

```yaml
version: 2
project_name: mytool

builds:
  - id: mytool
    binary: mytool
    env:
      - CGO_ENABLED=0
    flags:
      - -trimpath
    ldflags:
      - -X main.version={{ .Version }}
    goos: [linux, darwin, windows]
    goarch: [amd64, arm64]

archives:
  - id: mytool
    ids: [mytool]
    formats: [binary]
    name_template: "{{ .Binary }}-{{ .Os }}-{{ .Arch }}"

checksum:
  name_template: checksums.txt

sboms:
  - id: mytool-sbom
    artifacts: binary
    documents:
      - "{{ .ProjectName }}-{{ .Os }}-{{ .Arch }}.spdx.sbom.json"

signs:
  - cmd: cosign
    artifacts: checksum
    signature: "${artifact}.sigstore.json"
    args: [sign-blob, "--bundle=${signature}", "${artifact}", --yes]
```

What each block is for, by rule:

| Block | Why it is there | Rule |
|---|---|---|
| `version: 2` | goreleaser v2 schema. `goreleaser check` does not enforce it | GO-REL-07 |
| `env: CGO_ENABLED=0` on the build id | an unset value turns cgo on wherever a C compiler is on `PATH` | GO-REL-02 |
| `flags: -trimpath` | removes the checkout path from the bytes | GO-REL-01 |
| `ldflags` with only `main.version` | no date, no strip. Omitting the key is not neutral, see the traps below | GO-REL-01, GO-REL-05 |
| `formats: [binary]` and the dash template | the mirror-consumable names. `.exe` is appended on Windows automatically | GO-REL-08 |
| `sboms` over `binary` | an SPDX document per binary, named without the `.exe` that `{{ .Binary }}` would carry | GO-REL-09 |
| `signs` over `checksum` | one keyless bundle covers every asset through `checksums.txt` | GO-REL-11 |

A build id that genuinely needs cgo sets `CGO_ENABLED=1` on that id only, with
a comment naming the cgo-only dependency (GO-REL-02). No `dockers:` block: an
image, when one is asked for, comes from `ko build` (GO-REL-10). No
`mod_timestamp`: it changes file mtimes, not the bytes a raw-binary asset is
hashed over.

## The release workflow

Save as `.github/workflows/release.yml`. It runs only on a `v*` tag push.

```yaml
name: release
on:
  push:
    tags: ["v*"]
permissions: {}
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      attestations: write
    env:
      GORELEASER_CURRENT_TAG: ${{ github.ref_name }}
      GOTOOLCHAIN: local
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
      - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
        with:
          go-version-file: go.mod
      - uses: sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2
        with:
          cosign-release: v3.1.3
      - uses: anchore/sbom-action/download-syft@3ad7283483fc7af8ff2b4ea19663c2d5ca935e26 # v0.24.2
      - uses: goreleaser/goreleaser-action@f06c13b6b1a9625abc9e6e439d9c05a8f2190e94 # v7.2.3
        with:
          distribution: goreleaser
          version: v2.17.1
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2
        with:
          subject-checksums: dist/checksums.txt
```

| Line | Why it is there | Rule |
|---|---|---|
| every `uses:` at a 40-hex SHA with a `# vX.Y.Z` trailer | tags are mutable | GO-REL-12 |
| `id-token: write`, `attestations: write` | the OIDC identity keyless signing and attestation run on | GO-REL-11 |
| `fetch-depth: 0` | a tagless shallow clone stamps a pseudo-version instead of the tag | GO-REL-06 |
| `go-version-file: go.mod` | reads the CLI's `toolchain go1.27.N` line, so the release gets the patched stdlib | GO-MOD-16 |
| `GOTOOLCHAIN: local` | the build uses the toolchain setup-go installed and never downloads another one | GO-MOD-16 |
| `cosign-release: v3.1.3` | cosign-installer v4.1.2 defaults to v3.0.6 otherwise | GO-REL-11 |
| `download-syft` | the `sboms` block fails the release with exit 1 when syft is missing | GO-REL-09 |
| `version: v2.17.1` | the action's default `~> v2` floats across releases | GO-REL-07 |
| `GORELEASER_CURRENT_TAG` | picks the `vX.Y.Z` tag when a commit also carries a `<dir>/vX.Y.Z` tag | GO-REL-14 |
| `subject-checksums` | attests every published name, see the traps below | GO-REL-11 |

For a nested CLI (GO-REL-14), set `go-version-file: tools/mytool/go.mod` and add `workdir: tools/mytool` to the goreleaser-action `with:` block, and keep `.goreleaser.yaml` in `tools/mytool`. Rename the path.

This job alone sets `CGO_ENABLED=0`, through the goreleaser config. The PR
workflow's race job keeps `CGO_ENABLED=1` (GO-GATE-04), so never move the
setting to workflow level.

## Two measured traps in these files

**An omitted `ldflags` key strips the binary and stamps a date.** goreleaser
2.17.1 fills an absent `ldflags` with
`-s -w -X main.version={{.Version}} -X main.commit={{.Commit}} -X main.date={{.Date}} -X main.builtBy=goreleaser`
(read from the resolved `dist/config.yaml`, measured 2026-09-26). The build
succeeds, and the artifact check in step 7 of the runbook reports it
`STRIPPED`. Write the key out, even when its only value is the version.

**`subject-path: dist/mytool-*` attests the SBOMs, not the binaries.** With
`formats: [binary]`, goreleaser 2.17.1 leaves each compiled binary at
`dist/<id>_<os>_<arch>_<variant>/mytool` and records its published name only in
`dist/checksums.txt` and `dist/artifacts.json`. The one set of files at
`dist/mytool-*` is the `.spdx.sbom.json` documents (measured on a snapshot,
2026-09-26). `subject-checksums: dist/checksums.txt` attests every entry under
the name a consumer downloads, which is what `gh attestation verify` looks up by
digest.

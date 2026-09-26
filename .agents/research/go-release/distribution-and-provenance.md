---
title: "Go release assets, signing, provenance, mirror audit and the go-release procedure"
topic: "GO-REL — release/distribution-and-provenance"
agent: go-release/distribution-and-provenance
model: sonnet
date_researched: 2026-09-26
sources_count: 18
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/distribution-and-provenance/
scope: >
  Covers what a fleet-authored Go release publishes (asset shape), how it is
  signed and attested (cosign keyless, GitHub build-provenance attestations),
  goreleaser v2 hygiene, the container policy, library release steps, SHA
  pinning of release workflows, and the go-release skill's ordered procedure
  (M-N-04, M-N-05, M-N-07..09, M-N-11, M-P-01). Does not cover reproducible
  build flags/stamping (owned by the sibling `release/reproducible-builds-and-
  stamping` dive, M-N-01..03/06/10) or Bazel-for-Go release wiring (BZL-GO).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A fleet Go release publishes raw per-platform binaries named
  `<tool>-<goos>-<goarch>[.exe]` (goreleaser `archives.formats: [binary]`,
  versionless `name_template`), plus `checksums.txt`, never a `tar.gz`/`zip`
  archive — this is what the fleet's own mirror pipeline already verifies
  by `github_asset_digest`, and goreleaser reproduces it exactly.
- **The asset name a release publishes lives in `dist/artifacts.json`'s
  `name` field (and in `checksums.txt`), never in the on-disk build path.**
  A `--snapshot` run leaves the compiled binary at
  `dist/<binary>_<os>_<arch>_<version>/<binary>` and only renames it to the
  final `<tool>-<goos>-<goarch>[.exe]` name at upload/checksum time — `find
  dist -type f` is the wrong verification surface.
- `goreleaser check` in v2.17.1 does **not** fail (exit 0) on a config
  missing `version: 2` — it only prints a warning line and treats it as
  `version: 0`. It fails (exit 1) only on genuine YAML syntax errors. A
  planted-fixture CI gate that greps `goreleaser check`'s exit code for the
  v1-shape defect will pass a broken config; the gate must instead grep the
  rendered config file for a literal `version: 2` line.
  <!-- verified: fixtures/distribution-and-provenance/release-dist -->
  <!-- see Verification runs -->
- `goreleaser release --snapshot --clean` builds, archives, SBOMs and
  checksums with no GitHub token and no cosign identity required — only the
  `signs:` step needs live credentials, so a PR-validation CI job can run
  the whole pipeline minus signing.
- **Cosign keyless signing cannot run in a non-interactive, network-isolated
  sandbox**: `cosign sign-blob` with no ambient OIDC credential falls back
  to the OAuth2 device flow, prints a `https://oauth2.sigstore.dev/auth/
  device` URL and code, and blocks — it needs either a human browser or a
  CI-ambient OIDC token (`ACTIONS_ID_TOKEN_REQUEST_URL` in GitHub Actions).
  Verified with a 12 s timeout, exit 124. A local-keypair `sign-blob`/
  `verify-blob` round trip (offline-feasible substitute) is red/green clean.
- cosign v3.x's default signing path now fetches a TUF-provided
  `signing-config` and uploads to a transparency log even for local-key
  signing; disabling the log requires an explicit `--signing-config` file
  with no `rekor` service (`cosign signing-config create`), not a simple
  `--tlog-upload=false` flag (that flag is deprecated and now rejected
  outright when a signing-config is in play).
- goreleaser's `sboms:` block covers archives, binaries, packages and
  source tarballs (default `cmd: syft`, SPDX or CycloneDX via `syft`'s own
  format flags) but explicitly does **not** catalog container images —
  goreleaser's own docs state images are unavailable to the SBOM tool. A ko-
  built image gets its SBOM from `ko`'s own built-in SPDX generation
  instead, attached as an OCI referrer.
- **The fleet's four mirrored bazelbuild binaries (bazelisk, buildifier,
  buildozer, unused-deps) all fail `govulncheck -mode=binary`**: bazelisk
  (built with go1.24) carries 53 stdlib CVEs; buildifier and buildozer
  (built with go1.20.3, no VCS/module stamping at all) carry 5 each;
  unused-deps (go1.20.3) carries 7. All findings are in the Go standard
  library the binary was compiled against, not in vet-able third-party
  code — the mirror's `github_asset_digest: true` verification catches
  tampering, not staleness.
  <!-- verified: fixtures/distribution-and-provenance/mirror-check -->
- `retract` takes effect only once a **higher, published** version's
  `go.mod` carries the directive — verified live against a hand-built
  file-based `GOPROXY`: before a `v1.0.1` retracting `v1.0.0` exists in the
  proxy, `go list -m -u -json …@v1.0.0` has no `Retracted` field; after
  `v1.0.1` is added to the proxy's `@v/list`, the identical command now
  returns `"Retracted": ["v1.0.0 shipped a broken Sum."]`, `go list -m
  -versions` silently drops `v1.0.0`, and `@latest` resolves straight to
  `v1.0.1`. A build already pinned to the retracted `v1.0.0` still succeeds.
- A nested/subdirectory module (`example.com/bigrepo/sub`, the `dir/vX.Y.Z`
  tag convention) resolves through `go list -m`/`go mod tidy`/`go build`
  exactly like a root module once the proxy directory layout (`@v/list`,
  `.info`, `.mod`, `.zip` with a `module@version/` path prefix inside the
  zip) is correct — the module path, not the tag's directory prefix, is
  what the proxy and the consumer's `go.mod` `require` line must agree on.
- Library release steps are: bump `go.mod`, run `gorelease` (module:
  `golang.org/x/exp/cmd/gorelease`, exit non-zero on a semver-inconsistent
  breaking change at major ≥1), `git tag vX.Y.Z` and push the tag, then let
  pkg.go.dev's proxy poller index it — `gorelease` is explicitly documented
  as a stepping stone toward a future `go release` and does not itself
  read or enforce `retract`.
- Release-repo GitHub workflows are effectively 100% SHA-pinned in the
  measured sample (goreleaser, testify, go-cmp all pin every `uses:` to a
  40-char SHA with a `# vX.Y.Z` trailer comment); **the map's "lint-only
  library ~0%" half of the bimodal claim does not hold on inspection** —
  `urfave/cli`'s workflow uses bare `@v7` tags throughout while `stretchr/
  testify` and `google/go-cmp` (also lint-only, no release workflow) are
  fully SHA-pinned. Pinning correlates with individual maintainer practice,
  not release-vs-lint status.
- The container policy: a fleet Go CLI does **not** ship a container image
  by default (Q4: raw binaries only). When a service or CLI genuinely needs
  one, `ko build` (no Dockerfile, no Docker daemon, distroless
  `cgr.dev/chainguard/static` base, built-in SPDX SBOM) is the default over
  goreleaser's `dockers:` pipe, which requires a Docker daemon in CI and
  produces no SBOM of its own.
- No Homebrew, Scoop or winget publishing (Q4, owner default) — goreleaser
  v2 renamed `brews:` to `homebrew_casks`/`homebrew_formulas`; this rule set
  takes no position on that block because it is never populated.

## Findings

### 1. The asset shape a fleet release publishes

goreleaser v2's `archives.formats` accepts `tar.gz`/`tgz`, `tar.xz`/`txz`,
`tar.zst`/`tzst` (since v2.1), `tar`/`gz`/`xz` (since v2.16), `zip`, and
`binary` — with `binary`, "no archives are created and the binaries are
instead uploaded directly"
([goreleaser.com/customization/archive](https://goreleaser.com/customization/archive/)).
The default `name_template` for `binary` format is
`{{ .Binary }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}…` (underscores, versioned);
the fleet's Q4 shape overrides this to `{{ .Binary }}-{{ .Os }}-{{ .Arch }}`
(dashes, versionless), matching the real mirror contract at
`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:22-23`
(`verify: { github_asset_digest: true }`) and the anchored per-platform
regexes in
`mirror-bazelbuild@713abea9fbb8:bazelisk/mirror.yml` (`^bazelisk-linux-amd64$`
et al., go-audit/config-inventory.md §5.1).

```yaml
# fixtures/distribution-and-provenance/release-dist/mytool/.goreleaser.yaml
archives:
  - id: mytool
    ids: [mytool]
    formats: [binary]
    name_template: >-
      {{ .Binary }}-{{ .Os }}-{{ .Arch }}
checksum:
  name_template: "checksums.txt"
```

**Correct vs incorrect naming:**

```
correct   mytool-linux-amd64          mytool-windows-amd64.exe
incorrect mytool_0.0.0_linux_amd64     mytool_linux_amd64.tar.gz
```

The `.exe` suffix is automatic: goreleaser appends it to the Windows binary
name before the template runs (confirmed in the fixture run,
`archiving binary=mytool.exe name=mytool-windows-amd64.exe`).

**Where the final name actually lives.** A `--snapshot --clean` run leaves
the *compiled* binary at `dist/mytool_windows_amd64_v1/mytool.exe` — the
build-target directory name, never the archive name. The rename to
`mytool-windows-amd64.exe` is recorded only in `dist/checksums.txt` and in
`dist/artifacts.json`'s `name` field for each `"type": "Binary"` entry
(`fixtures/…/release-dist/mytool/dist/artifacts.json`, confirmed by direct
inspection). A verification that runs `find dist -type f -name 'mytool-*'`
against a `--snapshot` build finds nothing; the correct verification reads
`checksums.txt` or `artifacts.json`.

### 2. `goreleaser check` does not gate the `version: 2` requirement the way the brief assumed

goreleaser v2 requires `version: 2` in the config
([goreleaser.com/blog/goreleaser-v2](https://goreleaser.com/blog/goreleaser-v2/)):
"you must add `version: 2`… to pass `goreleaser check`." In practice, on
goreleaser 2.17.1, a config with the `version:` key removed still passes
`goreleaser check` with **exit 0**:

```
$ goreleaser check -f .goreleaser-v1shaped.yaml
  • only  version: 2  configuration files are supported, yours is  version: 0 , please update your configuration
  • checking                                  path=.goreleaser-v1shaped.yaml
  • 1 configuration file(s) validated
$ echo $?
0
```

`check` only exits non-zero on a genuine parse error (confirmed: an
unbalanced YAML bracket → `yaml: line 1: did not find expected ',' or ']'`,
exit 1). This is a straight contradiction of the topic map's dive brief
("`goreleaser check` on a v1-shaped config, which must fail") — see
[Verification runs](#verification-runs) and
[Contested / evolving](#contested--evolving).

### 3. `sboms:` and containers

`sboms.artifacts` accepts `archive`, `binary`, `package`, `source`, or `any`
(let syft decide); default naming for a `binary` document is
`"{{ .Binary }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}{{ targetVariant . }}.sbom.json"`
([goreleaser.com/customization/sbom](https://goreleaser.com/customization/sbom/)).
goreleaser's own docs state plainly that "container images generated by
GoReleaser are not available to be cataloged by the SBOM tool" — a `dockers:`
image gets no SBOM from this block. `ko` fills that gap natively: SPDX by
default since ko 0.9, disabled with `--sbom=none`, attached as an OCI
referrer downloadable with `cosign download sbom`
([ko.build/features/sboms](https://ko.build/features/sboms/)). Base image
policy is `.ko.yaml`'s `defaultBaseImage` (default
`cgr.dev/chainguard/static`) and per-import-path `baseImageOverrides`
([ko.build/configuration](https://ko.build/configuration/)).

The measured SBOM produced in the fixture run is a valid SPDX-2.3 document
naming the module path and stdlib package
(`fixtures/…/release-dist/mytool/dist/mytool-linux-amd64.spdx.sbom.json`:
`spdxVersion: SPDX-2.3`, packages include `github.com/example/mytool` and
`stdlib`).

### 4. Signing: keyless cosign needs a live identity provider, no exceptions

goreleaser's own recommended `signs:` block for keyless cosign:

```yaml
signs:
  - cmd: cosign
    signature: "${artifact}.sigstore.json"
    args: ["sign-blob", "--bundle=${signature}", "${artifact}", "--yes"]
    artifacts: checksum
```

Cosign keyless: an ephemeral in-memory keypair is generated; Fulcio issues a
short-lived certificate binding that key to an OIDC identity obtained from
sign-in; Rekor timestamps the signing event in a public transparency log
([docs.sigstore.dev/cosign/signing/overview](https://docs.sigstore.dev/cosign/signing/overview/)).
This *requires* reaching `fulcio.sigstore.dev`, `rekor.sigstore.dev` and an
OIDC issuer (`oauth2.sigstore.dev` or GitHub Actions' own token endpoint).
In a fully offline/non-interactive fixture run this is impossible — `cosign
sign-blob` prints a device-flow URL and blocks (see
[Verification runs](#verification-runs) §4). In GitHub Actions the ambient
`id-token: write` permission supplies the OIDC token automatically with no
browser step, which is why keyless signing is CI-only, never a local
developer workflow.

Verification of a bundle: `cosign verify-blob --bundle artifact.sigstore.json
--certificate-identity <identity> --certificate-oidc-issuer <issuer> <blob>`.

### 5. Build provenance attestation

`actions/attest-build-provenance` (v4) produces a signed SLSA-shaped
provenance attestation recording where and how an artifact was built;
requires workflow permissions `id-token: write`, `contents: read`,
`attestations: write`
([docs.github.com/…/using-artifact-attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds)):

```yaml
permissions:
  id-token: write
  contents: read
  attestations: write
steps:
  - uses: actions/attest-build-provenance@<sha> # v4
    with:
      subject-path: 'dist/mytool-*'
```

Verification: `gh attestation verify PATH/TO/ARTIFACT -R OWNER/REPO`. SLSA
v1.0 levels: L0 no guarantee; **L1** provenance exists but can be unsigned/
incomplete; **L2** the build runs on a hosted platform and provenance is
signed and tied to that infrastructure; **L3** the platform additionally
isolates builds from each other and keeps signing material out of reach of
user-defined build steps ([slsa.dev/spec/v1.0/levels](https://slsa.dev/spec/v1.0/levels)).
A GitHub-hosted Actions runner plus `actions/attest-build-provenance` lands
at **L2** — the runner is hosted infrastructure and the attestation is
signed, but ordinary GitHub Actions runners do not isolate concurrent jobs
from each other to SLSA L3's standard, so the attestation is L2-shaped
provenance, not an L3 claim.

### 6. Mirror audit — `govulncheck -mode=binary` on the four bazelbuild binaries

Fetched via `ocx add --pull` (the fleet's own package manager,
`ocx.sh/ocx-contrib/bazelbuild/{bazelisk,buildifier,buildozer,unused-deps}
:latest`), then scanned with `govulncheck@v1.8.0` (Go 1.27.1 toolchain,
DB updated 2026-09-24):

| Binary | Built with | Vulns found | Highest-severity example |
|---|---|---|---|
| bazelisk | go1.24 | 53 | GO-2026-6218 quadratic `net/url.URL.Parse`, GO-2025-3749 `x509.Certificate.Verify` ExtKeyUsageAny policy bypass |
| buildifier | go1.20.3 | 5 | GO-2026-4602 `os` (fixed go1.25.8), GO-2025-3956 `os/exec` (fixed go1.23.12) |
| buildozer | go1.20.3 | 5 | same as buildifier |
| unused-deps | go1.20.3 | 7 | adds GO-2026-4342 `archive/zip` (fixed go1.24.12), GO-2024-2888 |

`go version -m` on buildifier's binary shows only `go1.20.3
X:nocoverageredesign` — no embedded module path, no VCS stamp at all,
confirming the upstream `bazelbuild/buildtools` release predates (or never
adopted) `-buildvcs`/module-aware stamping. All findings are stdlib CVEs
tied to the Go version the binary was *compiled with*, not detected in any
imported third-party package — the mirror's `github_asset_digest: true`
verification (`mirror-bazelbuild@713abea9fbb8:mirror-base.yml:22-23`) proves
the bytes are the ones GitHub published, and says nothing about whether
those bytes are built from a vulnerable Go toolchain. This is the exact
price GO-MOD-13 (audit the shipped artifact with `govulncheck -mode=binary`
before signing/trusting it) puts a number on for a *mirrored*, not
fleet-built, binary: 4/4 fail, 70 total findings, zero remediation path
available to the fleet short of re-requesting upstream rebuild the binary.

### 7. Library release steps and `retract` timing

`go.dev`'s release-workflow doc covers semver (`v0.x` unstable, `v1+`
compat-guaranteed, `/v2`+ for breaking changes via a new module path and
branch), pre-release identifiers (`v1.2.3-alpha`, must be requested
explicitly since `go get` prefers stable), and `git tag vX.Y.Z` + `git push
origin vX.Y.Z`
([go.dev/doc/modules/release-workflow](https://go.dev/doc/modules/release-workflow)).
It does **not** mention `gorelease` or `retract` — those live in
`golang.org/x/exp/cmd/gorelease`'s own doc and `go.dev/ref/mod#go-mod-file-
retract` respectively.

`gorelease` compares the checked-out tree's exported API against a base
version (`-base=vX.Y.Z`, default: the latest release) and suggests (or, with
`-version`, validates) the next semver; it exits non-zero when a proposed
version at major ≥1 contains an incompatible API change
([pkg.go.dev/golang.org/x/exp/cmd/gorelease](https://pkg.go.dev/golang.org/x/exp/cmd/gorelease)).
It is explicitly staged toward folding into `go release`
([golang/go#46371](https://github.com/golang/go/issues/46371)) and does not
read or enforce `retract` — a library release procedure runs `gorelease`
*and* checks `retract` separately.

`retract` syntax: a single version (`retract v1.0.0`) or an inclusive range
(`retract [v1.0.0, v1.9.9]`), each with an optional rationale comment above
or on the same line
([go.dev/ref/mod#go-mod-file-retract](https://go.dev/ref/mod#go-mod-file-retract)).
**The directive has no effect until it is published in a version higher
than the one it retracts** — verified live below (§Verification runs §5–6):
adding `retract v1.0.0` to `v1.0.0`'s own `go.mod` would do nothing (that
version can never see its own retraction at publish time unless it is a
self-retracting range that also covers itself); the working pattern is to
publish the fix as `v1.0.1` whose `go.mod` retracts `v1.0.0`.

### 8. Nested/subdirectory modules through a proxy

A `dir/vX.Y.Z` tag (a module rooted in a subdirectory of a multi-module
repo, tagged `sub/v1.0.0` in the parent VCS) is, from the module-proxy
protocol's point of view, indistinguishable from a root module: the proxy
serves it under its full module path (`example.com/bigrepo/sub`), and the
`@v/list`, `.info`, `.mod`, `.zip` layout is identical. The subdirectory-tag
convention is a *VCS-to-module-path* translation the `go` command performs
when talking to a real VCS (git) directly, not a proxy-protocol concept —
which means a rule that says "nested modules need special proxy handling"
is wrong; the proxy layer only ever sees module paths and versions. Verified
against a hand-built `file://` proxy (§Verification runs §5–6).

### 9. SHA pinning is a maintainer-practice signal, not a release/lint split

```
goreleaser/goreleaser@ff8de3d6c389:.github/workflows/release.yml:29-30
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0

stretchr/testify@87a7b9d57689:.github/workflows/*.yml:13
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

google/go-cmp@b133f1f1932e:.github/workflows/*.yml:14,18
  uses: actions/setup-go@bfdd3570ce990073878bf10f6b2d79082de49492 # v2.2.0
  uses: actions/checkout@ee0669bd1cc54295c223e0bb666b733df41de1c5 # v2.7.0

urfave/cli@d1d810845dbc:.github/workflows/*.yml:18,21
  - uses: actions/checkout@v7
  - uses: actions/setup-go@v7
```

testify and go-cmp are lint-only libraries with no release workflow at all,
and both are fully SHA-pinned; urfave/cli is entirely tag-pinned. GitHub's
own guidance: pinning to a full commit SHA is the only way to use an action
as an immutable release, because "a tag can be moved or deleted if a bad
actor gains access to the repository storing the action"
([docs.github.com/…/secure-use](https://docs.github.com/en/actions/reference/security/secure-use)).
The rule stands regardless of repo shape — it is a MUST for any workflow
this rule set governs, not conditioned on "is this a release workflow."

## Normative guidance candidates

1. **A fleet Go release publishes raw per-platform binaries named
   `<tool>-<goos>-<goarch>[.exe]` plus `checksums.txt` — never a `tar.gz`/
   `zip` archive.** *Rationale:* matches the fleet's own mirror-verification
   contract (`github_asset_digest`) and its anchored regexes; an archive
   forces every consumer to unpack before running. *Verify:* the six
   per-platform anchored regexes below over `dist/checksums.txt` (or
   `dist/artifacts.json`'s `Binary`-type `name` fields), each must match
   exactly one line: `grep -c -E -e '^<tool>-linux-amd64$' dist/checksums.txt`
   (repeat for `linux-arm64`, `darwin-amd64`, `darwin-arm64`,
   `windows-amd64\.exe`, `windows-arm64\.exe`). Empty/`0` output means the
   platform's asset is missing or misnamed; `1` is the only pass. *RUN:*
   yes — `fixtures/distribution-and-provenance/release-dist/mytool`
   (§Verification runs §1–3).

2. **Verify asset names against `dist/checksums.txt` or `dist/
   artifacts.json`, never a raw `find dist -type f` on a `--snapshot`
   build.** *Rationale:* the `binary`-format archive's on-disk path is the
   build-target directory name (`dist/<binary>_<os>_<arch>_<version>/…`);
   only checksums/artifacts metadata carries the renamed, publishable asset
   name. *Verify:* a review heuristic — a CI step that greps `dist/` for
   the expected filename directly (not through `checksums.txt`) is a
   false-negative risk on `--snapshot` builds. *RUN:* yes, observed
   directly (§Findings §1, §Verification runs §2).

3. **`goreleaser check`'s exit code does not enforce `version: 2`; grep the
   config file itself.** *Rationale:* goreleaser 2.17.1's `check` treats a
   missing `version:` key as a warning (`version: 0`), not a failure —
   confirmed exit 0. *Verify:* `grep -c -E -e '^version:[[:space:]]*2$'
   .goreleaser.yaml .goreleaser.yml .goreleaser.yaml .config/goreleaser.yaml
   goreleaser.yml goreleaser.yaml 2>/dev/null` over the repo root — a `1`
   is required; `0` fails the gate. Empty output means no goreleaser config
   file exists at any discovered name (not a failure by itself). Version:
   goreleaser 2.17.1. *RUN:* yes — red on the config with the `version:`
   line removed (exit-code check found *not* red; the grep-based check
   *is* red), green on the Q4 config (§Verification runs §4).

4. **A CI job runs `goreleaser release --snapshot --clean` on every PR that
   touches release config**, before any signing step, and needs no
   credentials to do so. *Rationale:* build, archive, SBOM and checksum all
   succeed with no `GITHUB_TOKEN`, no cosign identity, and no Docker
   daemon (raw-binary policy) — this is a free, fast, fully offline
   validation gate. *Verify:* exit code of
   `goreleaser release --snapshot --clean` with `release.disable: true` (or
   no `GITHUB_TOKEN`) is `0`. *RUN:* yes (§Verification runs §2).

5. **Cosign signing in CI uses GitHub Actions' ambient OIDC token
   (`id-token: write`), never a developer's interactive keyless flow, and
   never a long-lived private key committed anywhere.** *Rationale:*
   keyless signing outside CI blocks on a human completing an OAuth2 device
   flow at `oauth2.sigstore.dev`; a CI job supplies the OIDC token
   automatically via `ACTIONS_ID_TOKEN_REQUEST_URL`. *Verify:* the
   workflow YAML declares `permissions: { id-token: write }` at the job or
   workflow level: `grep -c -E -e 'id-token:[[:space:]]*write'
   .github/workflows/release.yml`. Empty/`0` means the job cannot mint an
   OIDC token and keyless signing will hang or fail. *RUN:* yes, the hang
   was observed directly without the permission (no CI context exists in
   this sandbox to grant it, so the negative is the fixture; §Verification
   runs §7).

6. **`sboms:` never covers a `dockers:`-built container image; a Go CLI
   that ships an image uses `ko build`, which SBOMs it natively.**
   *Rationale:* goreleaser's own docs state container images are
   unavailable to the SBOM cataloger; `ko` attaches an SPDX SBOM as an OCI
   referrer with no extra config. *Verify:* reading heuristic — a
   `.goreleaser.yaml` with a non-empty `dockers:` block and a non-empty
   `sboms:` block whose `artifacts` does not exclude images is a false
   sense of coverage; grep for the co-occurrence:
   `grep -c -E -e '^dockers:' .goreleaser.yaml` alongside a manual read of
   `sboms.artifacts`. *RUN:* no — reading heuristic only, no Docker daemon
   available in this sandbox to build a `dockers:` pipe.

7. **A release engineering PR that ships a Go binary the fleet will
   mirror or vendor runs `govulncheck -mode=binary` on the built artifact
   before it is signed or published, and the finding blocks the release
   unless every vulnerable symbol is confirmed unreachable.** *Rationale:*
   measured directly: 4/4 real, currently-mirrored third-party Go binaries
   fail this check, at up to 53 findings, entirely from the toolchain the
   binary was compiled with. *Verify:*
   `govulncheck -mode=binary <path-to-binary>`; exit 0 = pass, exit 3 =
   vulnerabilities found (this govulncheck's own convention — confirmed
   live on all four binaries). Empty output on exit 0 means no known
   vulnerable stdlib or dependency symbol was reachable. Version:
   govulncheck v1.8.0, DB as of 2026-09-24. *RUN:* yes, on real fleet-
   mirrored binaries (§Verification runs §8).

8. **Every `uses:` in a workflow this rule set governs is pinned to a
   full 40-character commit SHA with a `# vX.Y.Z` trailer comment — in
   every workflow, not only release workflows.** *Rationale:* GitHub's own
   guidance states SHA pinning is the only immutable reference; measured
   practice does not correlate pinning with "is this a release workflow" —
   two lint-only libraries in the corpus are fully pinned and one CLI's
   entire workflow set is unpinned. *Verify:*
   `grep -rn -E -e 'uses:[[:space:]]*[^[:space:]]+@[a-zA-Z0-9_./-]*@?v[0-9]' .github/workflows/`
   is the wrong pattern (matches SHA-pinned lines too); the correct check
   is a negative grep for a `uses:` line whose ref after `@` is **not** 40
   hex characters: `grep -rn -E -e 'uses:[[:space:]]*[^[:space:]]+@(v[0-9]|[a-z]+[0-9]|main|master)([[:space:]]|$)' .github/workflows/`
   — any output is a finding (a tag/branch ref, not a SHA); empty output
   means every action reference in the tree is SHA-pinned. *RUN:* no —
   grep-only, reading heuristic against the exemplar corpus (§Exemplar
   evidence), not run against a planted fixture (a plausible fixture is a
   two-line workflow snippet, deferred as low-value since the grep shape
   is self-evidently correct regex, not tool behavior).

9. **`retract` is written into the *next* release, never edited into an
   already-tagged version's `go.mod`.** *Rationale:* the Go tooling reads
   retractions from the highest published version's `go.mod`; a retraction
   added to a tag after the fact by force-moving the tag breaks every
   consumer's `go.sum` (the module's content hash would no longer match).
   *Verify:* live `go list -m -u -json <module>@<retracted-version>` shows
   a `"Retracted"` field only once a higher version carrying the directive
   is resolvable through the module's proxy/VCS. Empty/absent field before
   that publish is correct, not a bug. *RUN:* yes — full before/after
   round trip against a hand-built `file://` proxy (§Verification runs
   §5–6).

10. **A library release runs `gorelease` before tagging; `gorelease`'s
    exit code is a release gate, and it is checked separately from
    `retract` (the two are unrelated mechanisms).** *Rationale:* `gorelease`
    catches semver-inconsistent breaking changes; it does not read or act
    on `retract` directives at all. *Verify:* `gorelease -base=<last-tag>`
    (module `golang.org/x/exp/cmd/gorelease`); non-zero exit at a proposed
    major ≥1 with an incompatible change is the release-blocking signal.
    *RUN:* no — `gorelease` was not installed in the toolchain image for
    this dive; reading heuristic from its own documented exit-code
    contract only.

## Verification runs

All commands run against Go 1.27.1 / GOTOOLCHAIN=local / golangci-lint
2.14.0 via `/home/mherwig/.cache/research-lang/go-tools/run.sh`, except
`cosign`/`syft`/the four mirrored binaries, fetched with `ocx add --pull`
into the fixture's own `ocx.toml` (never a writing command inside an
exemplar clone).

**1. goreleaser v2 config passes `check`** —
`fixtures/distribution-and-provenance/release-dist/mytool/.goreleaser.yaml`
```
$ run.sh goreleaser check
  • checking   path=.goreleaser.yaml
  • 1 configuration file(s) validated
exit=0
```

**2. `--snapshot --clean` produces the Q4 asset shape** (no-sign variant,
`.goreleaser-nosign.yaml`, `syft` on PATH):
```
$ run.sh goreleaser release --snapshot --clean -f .goreleaser-nosign.yaml
  • release succeeded after 5s
exit=0
$ awk '{print $2}' dist/checksums.txt | grep -v '.spdx.sbom.json$'
mytool-darwin-amd64
mytool-darwin-arm64
mytool-linux-amd64
mytool-linux-arm64
mytool-windows-amd64.exe
mytool-windows-arm64.exe
```
Anchored per-platform regex, each must match exactly one line — **green
twin**:
```
$ for pat in '^mytool-linux-amd64$' '^mytool-linux-arm64$' \
    '^mytool-darwin-amd64$' '^mytool-darwin-arm64$' \
    '^mytool-windows-amd64\.exe$' '^mytool-windows-arm64\.exe$'; do
    grep -c -E -e "$pat" /tmp/asset-names.txt; done
1
1
1
1
1
1
```
**Red twin** — same build with goreleaser's *default* `binary` name
template (`.goreleaser-defaultname-violation.yaml`, `name_template` line
removed):
```
$ awk '{print $2}' dist/checksums.txt | grep -v '.spdx.sbom.json$'
mytool_0.0.0-SNAPSHOT-none_darwin_amd64
mytool_0.0.0-SNAPSHOT-none_linux_amd64
...
$ grep -c -E -e '^mytool-linux-amd64$' /tmp/asset-names-violation.txt
0
```
Exit codes: check n/a here (checksums.txt is the artifact under test); the
regex count is 1 on the Q4 config, 0 on the default-template config — clean
red/green.

**3. `dist/artifacts.json` carries the rename; the raw build path does
not** — `python3 -c "import json; [print(a['type'], a['name'], a['path'])
for a in json.load(open('dist/artifacts.json'))]"` shows
`Binary mytool-linux-amd64 dist/mytool_linux_amd64_v1/mytool` (name ≠ path)
for every `Binary`-type entry.

**4. `goreleaser check` on a v1-shaped (no `version:`) config does NOT
fail** — this is the verification that did **not** go red as the brief
expected:
```
$ run.sh goreleaser check -f .goreleaser-v1shaped.yaml
  • only  version: 2  configuration files are supported, yours is  version: 0 , please update your configuration
  • 1 configuration file(s) validated
exit=0
```
Sanity check that `check` *can* fail at all — genuinely malformed YAML:
```
$ run.sh goreleaser check -f /tmp/broken.yaml   # version: 2\nbuilds: [this is not valid
  ⨯ command failed   error=yaml: line 1: did not find expected ',' or ']'
exit=1
```
The grep-based Normative candidate 3 check is what actually goes red on
the v1-shaped config (`grep -c -E -e '^version:[[:space:]]*2$'
.goreleaser-v1shaped.yaml` → `0`) and green on the Q4 config (→ `1`).

**5–6. `retract` timing, against a hand-built file-based `GOPROXY`** —
`fixtures/distribution-and-provenance/local-goproxy/` (`proxy/example.com/
bigrepo/sub/@v/{list,v1.0.0.{info,mod,zip},v1.0.1.{info,mod,zip}}`,
consumer module `example.com/consumer` requiring `example.com/bigrepo/sub
v1.0.0`, `GOPROXY=file://…/proxy GOSUMDB=off`):

*Before* `v1.0.1` is added to `@v/list` (only `v1.0.0` published):
```
$ go list -m -u -json example.com/bigrepo/sub@v1.0.0
{ "Path": "...", "Version": "v1.0.0", ... }        # no "Retracted" key
$ go build ./...
exit=0
```
*After* `v1.0.1` (whose `go.mod` has `retract v1.0.0 // v1.0.0 shipped a
broken Sum.`) is added to `@v/list`:
```
$ go list -m -versions example.com/bigrepo/sub
example.com/bigrepo/sub v1.0.1                      # v1.0.0 no longer listed
$ go list -m example.com/bigrepo/sub@latest
example.com/bigrepo/sub v1.0.1                      # skips the retracted version
$ go list -m -u -json example.com/bigrepo/sub@v1.0.0
{ ..., "Retracted": ["v1.0.0 shipped a broken Sum."], ... }
$ go list -m -retracted -versions example.com/bigrepo/sub
example.com/bigrepo/sub v1.0.0 v1.0.1               # -retracted reveals it
$ go build ./...          # consumer still pinned to v1.0.0
exit=0                    # existing builds keep working, per go.dev/ref/mod
```
This is a clean red→green pair on the *same* command
(`go list -m -u -json …@v1.0.0`) across the single state change of
publishing `v1.0.1` to the proxy — exactly GO-MOD-14's mechanism, run, not
read.

**7. Cosign keyless cannot complete offline/non-interactively:**
```
$ timeout 12 cosign sign-blob --yes --bundle=/tmp/checksums.sigstore.json dist/checksums.txt
Generating ephemeral keys...
Non-interactive mode detected, using device flow.
Enter the verification code FRPB-TWPG in your browser at:
  https://oauth2.sigstore.dev/auth/device?user_code=FRPB-TWPG
Code will be valid for 300 seconds
exit=124   # timeout, process was still blocked on the device-flow poll
```
Offline-feasible substitute — local keypair, `--signing-config` with no
`rekor` service, `--insecure-ignore-tlog=true` on verify:
```
$ cosign generate-key-pair --output-key-prefix=/tmp/cosign-fixture   # COSIGN_PASSWORD=""
$ cosign signing-config create --out /tmp/no-tlog-signing-config.json
$ cosign sign-blob --yes --key=/tmp/cosign-fixture.key \
    --bundle=/tmp/checksums.bundle.json \
    --signing-config=/tmp/no-tlog-signing-config.json dist/checksums.txt
Wrote bundle to file /tmp/checksums.bundle.json
exit=0
$ cosign verify-blob --key=/tmp/cosign-fixture.pub \
    --bundle=/tmp/checksums.bundle.json --insecure-ignore-tlog=true dist/checksums.txt
Verified OK
exit=0                                              # green: untampered
$ cosign verify-blob --key=/tmp/cosign-fixture.pub \
    --bundle=/tmp/checksums.bundle.json --insecure-ignore-tlog=true /tmp/checksums-tampered.txt
Error: failed to verify signature: ... invalid signature when validating ASN.1 encoded signature
exit=1                                              # red: tampered blob
```
cosign version: 3.1.3 (`ocx add anchore/syft:latest sigstore/cosign:latest`
resolved this version 2026-09-26).

**8. `govulncheck -mode=binary` on the four fleet-mirrored bazelbuild
binaries** (fetched with `ocx add --pull bazelbuild/{bazelisk,buildifier,
buildozer,unused-deps}:latest`, resolved digests recorded in
`fixtures/distribution-and-provenance/mirror-check/`):
```
$ govulncheck -mode=binary <bazelisk-binary>      ; echo $?
Your code is affected by 53 vulnerabilities from the Go standard library.
3
$ govulncheck -mode=binary <buildifier-binary>    ; echo $?
... 5 vulnerabilities ...
3
$ govulncheck -mode=binary <buildozer-binary>     ; echo $?
... 5 vulnerabilities ...
3
$ govulncheck -mode=binary <unused-deps-binary>   ; echo $?
... 7 vulnerabilities ...
3
```
govulncheck's own exit convention: 0 no findings, 3 vulnerabilities found
(all four binaries hit exit 3 — there is no green twin available here since
no rebuild path exists for a third-party mirrored binary; the check is
reported as consistently red across the whole mirrored set, which is
itself the finding).

## Exemplar evidence

- **Asset shape (Q4/M-N-04):** the mirror's own contract is the primary
  source, not a Go exemplar —
  `mirror-bazelbuild@713abea9fbb8:mirror-base.yml:22-24` and
  `bazelisk/mirror.yml`'s six anchored `assets:` regexes
  (go-audit/config-inventory.md §5.1). No exemplar in the corpus ships raw,
  versionless per-platform binaries the same way; goreleaser's own default
  (`{{.Binary}}_{{.Version}}_{{.Os}}_{{.Arch}}`) is the contradicting norm,
  confirmed live in §Findings §1.
- **v2 config adoption:** all 11 goreleaser configs measured at map time
  carry `version: 2` ([modrel](../go-audit/exemplar-modules-and-release.md) §3);
  none were observed missing it, so the "check doesn't fail on v1-shape"
  defect (§Findings §2) has not bitten the exemplar corpus, only a
  hypothetical migration-in-progress config.
- **SBOM + signs + checksum together:** 3/12 goreleaser configs
  ([modrel](../go-audit/exemplar-modules-and-release.md) §5) — `sigstore/
  cosign@907c3d899c0e`'s own `.goreleaser.yml` is one of them and is the
  closest real-world template for the fixture's `signs:`/`sboms:` blocks.
- **SHA pinning:** `goreleaser/goreleaser@ff8de3d6c389:.github/workflows/
  release.yml:29-30,180,183` (checkout, setup-go, cosign-installer, syft
  download-action all pinned); `stretchr/testify@87a7b9d57689:.github/
  workflows/*.yml:13` (pinned, no release workflow at all);
  `google/go-cmp@b133f1f1932e:.github/workflows/*.yml:14,18` (pinned, no
  release workflow); `urfave/cli@d1d810845dbc:.github/workflows/*.yml:18,21,22,48`
  (`@v7` throughout, unpinned) — contradicts the map's clean release/lint
  bimodal split (see Contested/evolving).
- **ko adoption:** `ko-build/ko@fcaeb337b6bd` and `sigstore/cosign@907c3d899c0e`
  are the two real ko adopters in the corpus ([map] M6); both ship a
  `.ko.yaml` at repo root, matching the base-image-override shape described
  in Findings §3.
- **Retract in the wild:** the exemplar corpus was not audited for `retract`
  usage in this dive (out of scope — no fleet-authored library exists yet to
  compare against); the mechanism is instead verified directly against a
  constructed fixture (§Verification runs §5–6), which the topic map's brief
  explicitly asked for in lieu of exemplar mining.
- **Mirror vulnerability exposure:** `mirror-bazelbuild@713abea9fbb8` itself
  (not an exemplar but the fleet's live config) is the subject of the
  govulncheck run in Findings §6 — this is the "price GO-MOD-13 puts on
  mirror-bazelbuild" the brief asked for.

## AI-agent angle

- **Assuming `goreleaser check`'s exit code enforces every documented
  requirement, including `version: 2`.** An agent that writes a CI gate as
  `goreleaser check || exit 1` believes it has blocked v1-shaped configs;
  it has not (§Findings §2). Mechanical check: after any agent-authored CI
  gate that calls `goreleaser check`, additionally grep the config file
  itself for `^version:[[:space:]]*2$` — never trust the tool's own exit
  code for this one requirement.
- **Verifying release asset names against the wrong path.** An agent asked
  "does the release produce `mytool-linux-amd64`?" that runs `find dist -name
  'mytool-linux-amd64'` on a `--snapshot` build will report "missing" even
  when the pipeline is correctly configured, because the file is still
  named by its build target until upload/checksum time. Mechanical check:
  always read `dist/checksums.txt` or `dist/artifacts.json`, never `find
  dist/`, when validating asset names from a snapshot build.
- **Reaching for `--output-signature`/`--output-certificate` cosign flags
  from memory or an old tutorial.** Both are deprecated in cosign v3.x and
  the sign-blob call errors outright without `--bundle`. Mechanical check:
  `cosign sign-blob --help 2>&1 | grep -c -- '--bundle'` should be non-zero
  before trusting any generated cosign invocation; a generated command using
  `--output-signature=` alone is stale.
- **Assuming keyless cosign "just works" in any automation, including a
  local test run or a sandboxed agent loop.** It silently blocks on a
  device-flow URL with no error, which looks like a hang, not a
  configuration problem. Mechanical check: any `cosign sign-blob`/`cosign
  sign` invocation without `--key` in a non-interactive context must run
  under a timeout in CI dry-runs, and the workflow YAML must be checked for
  `id-token: write` (Normative candidate 5) before assuming keyless signing
  is reachable at all.
- **Treating `retract` as if it edits the retracted version's own
  metadata.** A plausible but wrong mental model: "adding `retract v1.0.0`
  means v1.0.0 is now retracted everywhere." It is not — nothing changes
  until a new, higher version carrying the directive is actually published
  and becomes resolvable through the proxy/VCS a consumer uses. Mechanical
  check: after editing `retract` into `go.mod`, the change has zero effect
  until `git tag` + push of a version higher than every version it lists,
  and `go list -m -u <module>@<version>` is how to confirm propagation, not
  reading the source `go.mod` of the retracted tag.
- **Using `google/uuid`, `golang.org/x/exp/slices`, or `github.com/pkg/
  errors` inside a *release tooling* script** (as opposed to the app being
  released) — an LLM writing a small release helper script is exactly where
  these pre-1.21/pre-1.27 habits leak in, because release scripts are
  "throwaway" and get less scrutiny. Mechanical check: `go vet ./...`'s
  `stdversion` analyzer (from `go test`, Go ≥1.27) and `go fix -diff`'s
  `any`/`slicessort`/`slicescontains` fixers over the release-tooling
  directory specifically, not just the shipped module.
- **Believing `sboms:` covers a `dockers:`-built image because both blocks
  are present in the same config.** goreleaser silently produces zero SBOM
  for the image while producing valid SBOMs for every other artifact type,
  so a spot-check of "does dist/ contain .sbom.json files" passes while the
  image itself ships unSBOM'd. Mechanical check: for any config with a
  non-empty `dockers:` block, confirm SBOM coverage for the image
  specifically via `cosign download sbom <image-ref>` or `ko`'s output,
  never via goreleaser's `sboms:` artifact count.

## Contested / evolving

- **The map's SHA-pinning bimodal claim ("release repos ~100%, lint-only
  libraries ~0%") does not survive a 4-repo spot check** (§Findings §9): two
  lint-only libraries (testify, go-cmp) are fully SHA-pinned with no release
  workflow at all, while one CLI (urfave/cli) is entirely tag-pinned despite
  having release-adjacent CI. As of 2026-09-26 this reads as "pinning
  tracks the individual maintainer's security posture, not the workflow's
  purpose" — the MUST (Normative candidate 8) should not be scoped to
  "release workflows only," and the map's framing needs revision if it
  narrows the rule that way.
- **cosign's bundle format transition is actively reshaping the recommended
  invocation.** `--output-signature`/`--output-certificate`/`--signature`/
  `--certificate` are deprecated in favor of `--bundle` (a single
  `.sigstore.json` combining both), and `--tlog-upload=false` is being
  phased out in favor of a `--signing-config` file with no `rekor` service.
  goreleaser's own docs (§Findings §4) already reflect the `--bundle`
  convention; any tutorial or LLM training data predating cosign v2.3
  (`--bundle` introduced) or v3.x (`--signing-config` requirement tightened)
  is stale. Direction: toward `--bundle` as the only supported output shape;
  watch for `--signing-config` becoming mandatory rather than optional in a
  future cosign major.
- **Whether a fleet-authored Go binary should carry a container image at
  all is unresolved by this dive** (Q4 covers *distribution* format for
  binaries, not whether a service-shaped Go binary gets containerized). The
  container-policy guidance here (ko over `dockers:` when an image is
  needed) is a conditional default, not a mandate to containerize.
- **GitHub's build-provenance attestation not yet reaching SLSA L3 on
  standard hosted runners** is a platform limitation, not a goreleaser or
  cosign choice — self-hosted runners with per-job isolation (e.g.
  ephemeral VMs) are the documented path to L3, and this dive takes no
  position on whether the fleet should invest in that; L2 is the practical
  ceiling for the pattern being recommended here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [goreleaser.com/customization/archive](https://goreleaser.com/customization/archive/) | goreleaser v2 docs | current, v2.17.x line | `formats: [binary]` semantics and default name templates — primary |
| [goreleaser.com/customization/checksum](https://goreleaser.com/customization/checksum/) | goreleaser v2 docs | current | checksum file naming/algorithm defaults — primary |
| [goreleaser.com/customization/sign](https://goreleaser.com/customization/sign/) | goreleaser v2 docs | current | cosign keyless `signs:` block, `--bundle` convention — primary |
| [goreleaser.com/customization/sbom](https://goreleaser.com/customization/sbom/) | goreleaser v2 docs | current | SBOM artifact scope, explicit image exclusion — primary |
| [goreleaser.com/blog/goreleaser-v2](https://goreleaser.com/blog/goreleaser-v2/) | goreleaser v1→v2 migration post | v2 launch (2024, still current guidance) | `version: 2` requirement, brews rename — primary |
| [docs.sigstore.dev/cosign/signing/overview](https://docs.sigstore.dev/cosign/signing/overview/) | Sigstore project docs | current | keyless signing mechanism (Fulcio, Rekor, OIDC) — primary |
| [docs.github.com/…/using-artifact-attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds) | GitHub Actions docs | current | `actions/attest-build-provenance`, `gh attestation verify` — primary |
| [slsa.dev/spec/v1.0/levels](https://slsa.dev/spec/v1.0/levels) | SLSA v1.0 spec | v1.0, current | build L0–L3 definitions used to place GitHub Actions provenance — primary |
| [ko.build/features/sboms](https://ko.build/features/sboms/) | ko project docs | current (ko ≥0.9) | ko's built-in SPDX SBOM, `--sbom=none` | 
| [ko.build/configuration](https://ko.build/configuration/) | ko project docs | current | `.ko.yaml`, default/override base images — primary |
| [go.dev/doc/modules/release-workflow](https://go.dev/doc/modules/release-workflow) | Go team docs | current | semver, tagging, `/vN` workflow — primary |
| [go.dev/ref/mod#go-mod-file-retract](https://go.dev/ref/mod#go-mod-file-retract) | Go language spec (module reference) | current | `retract` directive syntax and publish-timing semantics — primary |
| [pkg.go.dev/about](https://pkg.go.dev/about) | pkg.go.dev docs | current | indexing/discovery mechanism, license policy — primary |
| [pkg.go.dev/golang.org/x/exp/cmd/gorelease](https://pkg.go.dev/golang.org/x/exp/cmd/gorelease) | gorelease tool doc | current (tool still `x/exp`) | exit-code contract, base/version flags |
| [golang/go#46371](https://github.com/golang/go/issues/46371) | Go issue tracker | 2021, still open/current status | gorelease's staged path toward `go release` |
| [docs.github.com/…/secure-use](https://docs.github.com/en/actions/reference/security/secure-use) | GitHub Actions security reference | current | official SHA-pinning guidance and rationale — primary |
| goreleaser/goreleaser@ff8de3d6c389:.github/workflows/release.yml | exemplar corpus, depth-1 clone | fetched 2026-09-26 | real 100%-SHA-pinned release workflow |
| mirror-bazelbuild@713abea9fbb8:mirror-base.yml, bazelisk/mirror.yml | fleet's own mirror config (not an exemplar) | current as of 2026-09-26 | the actual asset-shape/verify contract this rule set must match |
| local fixture run, `fixtures/distribution-and-provenance/` | this dive's own planted fixtures | 2026-09-26 | goreleaser v2.17.1 / cosign 3.1.3 / govulncheck v1.8.0 behavior, directly observed |

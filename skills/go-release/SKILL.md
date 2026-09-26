---
name: go-release
description: Ordered runbook for cutting a Go release, for a CLI shipped as raw per-platform binaries and for a library or SDK shipped as a module tag, from the tag and major-version decision through the gorelease API gate, the goreleaser v2 config gates and snapshot, version stamping, the per-binary artifact checks, the double-build reproducibility proof, keyless signing and build provenance, to verifying what was published and retracting a bad version. Use when tagging or releasing a Go module, CLI or SDK, writing or reviewing a .goreleaser.yaml or a Go release workflow, deciding a version bump or a /vN major, checking that a Go binary is reproducible or prints the right --version, verifying Go release assets, checksums.txt, a cosign bundle or a build-provenance attestation, or fixing a Go version that already shipped. Not for bumping the go or toolchain line or triaging a dependency, and not for mirroring someone else's Go binaries.
license: Apache-2.0
metadata:
  summary: Gate-ordered Go release procedure for CLIs and libraries, built around the permanence of a proxied tag, with its commands watched red and green on goreleaser 2.17.1 and Go 1.27.1
  keywords: go,golang,release,goreleaser,gorelease,semver,module,tag,retract,major-version,reproducible-builds,trimpath,cgo,buildvcs,version-stamping,checksums,cosign,sigstore,attestation,slsa,sbom,syft,govulncheck,github-actions
---

# go-release

## A proxied tag is permanent. Read this before step 1

Once anyone fetches a version through `proxy.golang.org`, the module zip stays
in the proxy and its hash stays in the checksum database. Deleting the tag,
force-pushing, or re-tagging the same version changes nothing for consumers.
The only remedy for a bad module version is a `retract` directive published in
a **higher** version (GO-MOD-15). A binary release is bound the same way: the
signed `checksums.txt` and the provenance attestations name the old digests.

Two consequences bind everything below.

- **There is no fix-the-release path, so do not design one.** A bad release is
  followed by a new version, never by a replaced tag or a re-uploaded asset.
- **Every gate runs before `git push origin <tag>`.** A defect found before the
  push costs a commit. A defect found after it costs a version number.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[The runbook](#the-runbook) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong here](#what-agents-get-wrong-here)

## Scope

| Code kind | Steps | Rule families it draws on |
|---|---|---|
| CLI shipped as binaries | 1, 2, 4 to 11 | GO-REL, GO-MOD-12 to 16, GO-GATE-01 |
| Library or SDK (no binaries) | 1, 2, 3, 9, 10, 11 | GO-API-10, GO-MOD-14, GO-MOD-15, GO-REL-12 |
| Go CLI in a subdirectory of a repository with no root `go.mod` | the CLI steps, plus the nested layout in step 5 | GO-REL-14 in addition |

Mirroring upstream Go binaries you did not build is out of scope. That is a
digest check plus GO-MOD-13's binary scan, and none of the build steps apply.

Tool versions, measured 2026-09-26 unless a line says otherwise: Go 1.27.1,
goreleaser 2.17.1, cosign 3.1.3, syft 1.51.0, govulncheck v1.8.0, gh 2.93.0,
`gorelease` from `golang.org/x/exp` at `v0.0.0-20260908205506-85c1c2202aba`.
The goreleaser config and the release workflow these steps assume are in
[references/release-config.md](references/release-config.md).

## Pinned defaults

These encode an agreed decision rather than a derived fact. Each is a default
the adopter may override once, for the whole repository. Marked **pinned** so a
later reader does not re-litigate them.

| Decision | Default (pinned) | Override looks like |
|---|---|---|
| Asset shape | Raw binaries named `<tool>-<goos>-<goarch>[.exe]` for linux, darwin and windows on amd64 and arm64, plus `checksums.txt`, built by goreleaser v2 | Archives, where no consumer selects assets by exact name |
| Signing | Keyless, in CI only: a cosign bundle over `checksums.txt` **and** a GitHub build-provenance attestation over every asset. Both rest on one OIDC identity | Attestation only, which drops one step and one asset |
| Stripping | No `-s -w`. The binary-mode vulnerability scan stays precise (1 finding unstripped, 4 stripped on one module) | Strip, and triage binary-scan findings against an unstripped twin (GO-REL-05) |
| Channels | GitHub release assets only. No container image, Homebrew, Scoop or winget until asked | An image built with `ko build`, never goreleaser `dockers:` (GO-REL-10) |
| Tool pins | goreleaser `v2.17.1`, cosign `v3.1.3`, `gorelease` at the pseudo-version above | Bumped through the upgrade procedure, never `latest` |
| SDK major version | An SDK wrapping a pre-1.0 CLI stays at v0, and its README recommends exact pinning | A `/v2` path once the wrapped CLI reaches 1.0 |

## The runbook

Run the steps in order. Steps 1 to 8 all exist to fail before anything is
pushed, signed or uploaded.

### 1. Decide the version and the tag

- A module at the repository root is tagged `vX.Y.Z`. A module in a
  subdirectory is tagged `<dir>/vX.Y.Z` (GO-MOD-14). The mirror-facing binary
  release tag is `vX.Y.Z` (GO-REL-08).
- A first `v2.0.0` or higher changes the `module` line and every self-import to
  the `/vN` suffix **in the same change** as the tag. Never ship a
  `+incompatible` version (GO-MOD-14).
- The size of the bump comes from step 3's API report, never from the size of
  the diff.

**Check (reading heuristic):** `grep -n '^module ' go.mod` against the major of
the tag you are about to cut. A `v2` or higher tag whose `module` line lacks
the matching `/vN` is the finding. It stays a reading heuristic because
tag-to-path consistency is a fact about the release history, which one checkout
cannot falsify.

### 2. Run the gate at the exact commit, then tag it locally

Run GO-GATE-01's ordered block from every `go.mod` root (GO-MOD-06), on the
commit the tag will point at, and require every step to exit 0. Text-mode
`govulncheck ./...` exiting 3 with a call trace blocks the release, and the
fix is an upgrade, never a `replace` (GO-MOD-12). A CLI's release job must
build with its `toolchain go1.27.N` line through `go-version-file` (GO-MOD-16).

**Check:** each step's exit status, then `git status --porcelain`. Any output
from the latter is the finding: a release built from that tree is `+dirty`.

Then tag that commit **locally** and do not push it until step 9. A library or SDK runs step 3 first and tags only once its report agrees with the version. Steps 5 and 8
build from the local tag.

```sh
TAG=v1.2.3 # rename. A nested CLI also creates tools/mytool/$TAG (step 5)
git tag -a "$TAG" -m "$TAG"
```

Until the push, a failed later step is fixed in a new commit: delete the local
tag with `git tag -d "$TAG"` and start again from step 2. After the push, that
is no longer allowed.

### 3. Library or SDK: run the API gate before the tag

GO-API-10 owns this gate. Commit first: `gorelease` refuses a tree with
uncommitted changes, printing `has uncommitted changes` with exit 1, which
reads like an API failure and is not one (measured 2026-09-26).

```sh
# From the module root, on the commit you will tag. Rename both versions.
BASE=v1.4.0 # the last published tag
NEXT=v1.5.0 # the tag you propose
go run golang.org/x/exp/cmd/gorelease@v0.0.0-20260908205506-85c1c2202aba -base="$BASE" -version="$NEXT"
```

- **v1 and above:** exit 0 with `is a valid semantic version` passes. Exit 1
  with `There are incompatible changes.` blocks the tag. The fix is restoring
  the API or a `/vN` major (step 1), never a minor bump.
- **v0:** `gorelease` exits 0 even on a removed symbol. Read the report
  instead: the same command piped into `grep -c -F '## incompatible changes'`
  prints `0` for a compatible change and `1` when anything was removed or
  changed. A `1` forces a minor bump plus a changelog line naming the break.
- Never gate on `apidiff`'s exit code, which is 0 on an incompatible change.
- `gorelease` does not read `retract`. Step 11 owns that.

A library skips steps 4 to 8 and goes to step 9.

### 4. CLI: gate the goreleaser config

Grep the config before running goreleaser at all. `goreleaser check` exits 0 on
a config with no `version:` key and on every clock template, so its exit code
is not the gate. It fails only on a schema error or a missing git remote
(`no remote configured to list refs from`).

| Check | Command | Pass | Rule |
|---|---|---|---|
| v2 schema | `grep -c -E '^version:[[:space:]]*2$' .goreleaser.yaml` | prints `1`. `0` is the finding | GO-REL-07 |
| `ldflags` written out | `grep -c -e '^ *ldflags:' .goreleaser.yaml` | one per build id. An omitted key makes goreleaser 2.17.1 strip the binary and stamp `main.date` | GO-REL-01, GO-REL-05 |
| No clock-derived value | `grep -n -e '{{ *\.Date' -e '{{ *\.Now' -e '{{ *time ' .goreleaser.yaml` | empty output. Any line is the finding | GO-REL-01 |
| No strip (pinned) | `grep -n -e '-s -w' .goreleaser.yaml` | empty output. Any line is the finding | GO-REL-05 |
| No image block | `grep -n -e '^dockers:' -e '^dockers_v2:' .goreleaser.yaml` | empty output, unless an image was asked for | GO-REL-10 |
| No stored key, no deprecated cosign flags | `grep -rn -e '--output-signature' -e '--output-certificate' -e 'COSIGN_PRIVATE_KEY' .github .goreleaser.yaml` | empty output. Any line is the finding | GO-REL-11 |

The clock grep matters even though step 8 exists. goreleaser 2.17.1 resolves
`{{ .Date }}` to the commit time, so a double build stays byte-identical with
it and cannot catch it (measured 2026-09-26). GO-REL-01 forbids it anyway:
`vcs.time` already carries the commit time, and a date `-X` is one more way to
break reproducibility. `{{ .Now }}` does change the bytes and step 8 catches it.

Then set `CGO_ENABLED=0` on every build id, and leave `GOAMD64` at `v1` (GO-REL-02,
GO-REL-04). Step 7 checks both on the built artifacts, where they can be proved.

### 5. CLI: stamp the version with a fallback

GO-REL-06 owns the rule. The shape: an empty `version` variable set by
`-X main.version={{ .Version }}`, falling back to the module version that
`go install` and a plain `go build` at a tag stamp since Go 1.24, followed by the
12-character revision.

Copy GO-REL-06's `versionString` snippet (go-modules `release.md`, Checked by Running the Binary).

Wire `versionString()` into the root command's `--version`. Never print
`debug.ReadBuildInfo()` raw, and never default `version` to `"dev"` without the
fallback. The release workflow checks out with `fetch-depth: 0`, or the build
stamps a pseudo-version instead of the tag.

**A CLI below the repository root** (a Go tool inside a Rust or Python
repository) stamps `(devel)` at its tag unless the layout follows GO-REL-14: a
`go.mod` at the repository root whose module path is the parent of the CLI's.
Then push two annotated tags on the one commit: `tools/mytool/vX.Y.Z` for the
Go stamp and `vX.Y.Z` for the binary release. Set `GORELEASER_CURRENT_TAG` to
the `vX.Y.Z` tag, as the reference workflow does. Handed the nested tag,
goreleaser 2.17.1 logs `invalid semantic version`, still exits 0, and stamps
`tools/mytool/vX.Y.Z` as the version (measured 2026-09-26).

**Check:** build the tag the way a user's `go install` does, then ask the
binary.

```sh
# In a clean checkout of step 2's local tag, from the main package's module directory.
TAG=v1.2.3 # rename. For a nested module, check out tools/mytool/v1.2.3 and keep TAG at the v1.2.3 part
CGO_ENABLED=0 go build -trimpath -o /tmp/mytool-at-tag .
/tmp/mytool-at-tag --version | grep -c -F "$TAG"
go version -m /tmp/mytool-at-tag | grep -c -E '^[[:space:]]*mod[[:space:]].*\(devel\)'
```

The first count must print `1` and the second `0`. A `"dev"` default prints
`0` on the first. A binary built outside the repository, or from a nested
module without the GO-REL-14 layout, prints `1` on the second. Write the output
outside the checkout: a file inside it makes the next build `+dirty`.

### 6. CLI: build a snapshot and check the asset names

```sh
goreleaser release --snapshot --clean --skip=sign
```

The snapshot needs no token and no signing identity. It needs `syft` on
`PATH`, or the `sboms` block fails it with exit 1. Skip signing locally:
keyless `cosign sign-blob` outside CI waits on a browser device flow and looks
like a hang.

The published names exist only in `dist/checksums.txt` and
`dist/artifacts.json`. The binaries themselves sit at
`dist/mytool_linux_amd64_v1/mytool` and similar, so `find dist -name 'mytool-*'`
reports a correct release as broken. Read the checksums file:

```sh
TOOL=mytool # rename to your binary
for p in linux-amd64 linux-arm64 darwin-amd64 darwin-arm64 'windows-amd64\.exe' 'windows-arm64\.exe'; do
  awk '{print $2}' dist/checksums.txt | grep -c -E "^$TOOL-$p\$"
done
```

Every line must print `1` (GO-REL-08). goreleaser's default binary template
prints six `0`s: it names assets `mytool_1.2.3_linux_amd64`, which no anchored
mirror pattern matches. Every platform must also have its
`mytool-<os>-<arch>.spdx.sbom.json` line (GO-REL-09).

### 7. CLI: inspect every built binary

`go version -m` reads what the toolchain recorded in the artifact. Reading the
config does not count as proof.

```sh
# Any output is a finding. Empty output is the pass.
TOOL=mytool # rename to your binary
find dist -type f \( -name "$TOOL" -o -name "$TOOL.exe" \) -print0 |
  xargs -r -0 -n1 sh -c '
    m=$(go version -m "$1")
    echo "$m" | grep -q -E "^[[:space:]]*build[[:space:]]+vcs\.revision=[0-9a-f]{40}$" || echo "UNSTAMPED $1"
    echo "$m" | grep -q -e "+dirty" -e "vcs.modified=true" && echo "DIRTY $1"
    echo "$m" | grep -q -E "CGO_ENABLED=0$" || echo "NOT-STATIC $1"
    echo "$m" | grep -q -E "GOAMD64=v[2-4]" && echo "RAISED-GOAMD64 $1"
    go tool nm "$1" >/dev/null 2>&1 || echo "STRIPPED $1"
    exit 0
  ' _
```

| Output | Meaning | Rule |
|---|---|---|
| `UNSTAMPED` | no 40-hex `vcs.revision`: built outside git, from a package inside a submodule or nested repository, or with `-buildvcs=false` | GO-REL-03 |
| `DIRTY` | built from a tree with uncommitted changes | GO-REL-03 |
| `NOT-STATIC` | a build id inherited cgo from the runner | GO-REL-02 |
| `RAISED-GOAMD64` | the binary refuses to start on older x86-64 CPUs | GO-REL-04 |
| `STRIPPED` | `-s -w`, including goreleaser's default `ldflags` | GO-REL-05 (pinned) |

Watched 2026-09-26: silent on all six snapshot binaries, and each label printed
once on a planted binary with that defect. An `UNSTAMPED` binary can still
print the right `--version` when `-X` supplies it, which is why this check reads
`vcs.revision` and never the version string. When the build toolchain prints
`Use -buildvcs=false to disable VCS stamping`, move the main package out of the
nested repository. That hint is the one fix GO-REL-03 forbids.

Then scan the exact artifact, as a second gate after step 2's source scan
(GO-MOD-13):

```sh
govulncheck -mode=binary dist/mytool_linux_amd64_v1/mytool
```

Exit 0 is the pass and exit 3 is a finding. Triage a finding the source scan
did not report before shipping.

### 8. CLI: prove reproducibility with a double build

Two clean clones of the tag, in directories with different names, built by the
real config. Identical checksums are the proof. The clones read the local tag
from step 2.

```sh
# From the repository root.
TAG=v1.2.3 # rename
SRC=$PWD
WORK=/tmp/double-build-$TAG
mkdir -p "$WORK"
git clone --quiet --branch "$TAG" "$SRC" "$WORK/clone-a"
git clone --quiet --branch "$TAG" "$SRC" "$WORK/clone-b-other-name"
(cd "$WORK/clone-a" && goreleaser release --snapshot --clean --skip=sign,sbom)
(cd "$WORK/clone-b-other-name" && goreleaser release --snapshot --clean --skip=sign,sbom)
cmp "$WORK/clone-a/dist/checksums.txt" "$WORK/clone-b-other-name/dist/checksums.txt"
```

`cmp` exiting 0 with no output passes GO-REL-01. Any difference is the finding.
Watched 2026-09-26: identical with the reference config, and different with
`-trimpath` removed or a `{{ .Now }}` value in `ldflags`. Skip the SBOMs here
because syft 1.51.0 writes a random document namespace and a creation time into
each one, so they never match across runs. The binaries must.


### 9. Push the tag and let CI sign and publish

```sh
TAG=v1.2.3 # rename. A nested CLI pushes both of its tags
git push origin "$TAG"
```

A library is done here, apart from step 10's proxy check. A CLI's tag push runs
the release workflow in
[references/release-config.md](references/release-config.md). That workflow
signs `checksums.txt` with a keyless cosign bundle and attests every asset
listed in it. Never sign on a laptop or in an agent sandbox, and never store a
signing key (GO-REL-11). Point `actions/attest-build-provenance` at
`subject-checksums: dist/checksums.txt`. With raw binaries, the glob
`dist/mytool-*` matches only the SBOM files, so a `subject-path` glob attests
the SBOMs and not one binary (measured on goreleaser 2.17.1, 2026-09-26).

**Check the workflow before the first tag:**

| Check | Command | Pass | Rule |
|---|---|---|---|
| OIDC permission | `grep -rn -e 'id-token: *write' --include='release*.yml' .github/workflows` | a line printed. Empty output is the finding | GO-REL-11 |
| Attestation covers the assets | `grep -rn -e 'subject-checksums: *dist/checksums.txt' --include='release*.yml' .github/workflows` | a line printed. Empty output is the finding | GO-REL-11 |
| Tags fetched | `grep -rn -A3 -e 'actions/checkout' --include='release*.yml' .github/workflows` | the block shows `fetch-depth: 0`. Empty output means no workflow named release*.yml exists: point the grep at the real release workflow. A reading heuristic | GO-REL-06 |
| Actions pinned | the command below the table | empty output | GO-REL-12 |

```sh
# Every uses: at a 40-hex SHA, local ./ actions exempt. Any output is a finding, empty output is the pass.
grep -rn -E -e 'uses:[[:space:]]*[^.[:space:]][^[:space:]]*@' .github/workflows |
  grep -v -E -e '@[0-9a-f]{40}[[:space:]]' -e '@[0-9a-f]{40}$'
```

The pin applies to every workflow in the repository, lint and docs included,
not only the release workflow.

### 10. Verify what was published

Download the release as a consumer would, then check names, bytes, signature
and provenance.

```sh
TAG=v1.2.3 REPO=example/mytool TOOL=mytool # rename all three
gh release download "$TAG" -R "$REPO" --dir "/tmp/verify-$TAG"
cd "/tmp/verify-$TAG"
for p in linux-amd64 linux-arm64 darwin-amd64 darwin-arm64 'windows-amd64\.exe' 'windows-arm64\.exe'; do
  gh release view "$TAG" -R "$REPO" --json assets --jq '.assets[].name' | grep -c -E "^$TOOL-$p\$"
done
sha256sum --check --ignore-missing checksums.txt
cosign verify-blob --bundle checksums.txt.sigstore.json \
  --certificate-identity-regexp "^https://github.com/$REPO/" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com checksums.txt
gh attestation verify "$TOOL-linux-amd64" -R "$REPO"
```

| Line | Pass | Finding |
|---|---|---|
| the name loop (GO-REL-08) | six `1`s | any `0`: the mirror's anchored pattern selects nothing |
| `sha256sum --check` | every asset `OK`, exit 0 | a `FAILED` line, or `no file was verified`, exit 1 |
| `cosign verify-blob` (GO-REL-11) | `Verified OK`, exit 0 | exit 1 on a tampered file or on an identity from another repository |
| `gh attestation verify` (GO-REL-11) | exit 0 | exit 1, `HTTP 404`, for bytes that no attestation covers |

Watched 2026-09-26 against public releases: the name loop printed six `1`s on
bazelisk v1.29.0 and six `0`s on goreleaser v2.17.1, which ships archives.
`sha256sum`, `cosign verify-blob` and `gh attestation verify` passed on
goreleaser v2.17.1's own assets and failed on a one-byte-appended copy.
`cosign verify-blob` also failed on the correct file under a wrong identity
pattern. Repeat the attestation line for each platform a consumer installs.

For a library, check that the proxy serves the tag:
`GOPROXY=https://proxy.golang.org go list -m example.com/mylib@v1.5.0` prints the
module and version with exit 0. Exit 1 with `unknown revision` means the tag
is not reachable yet.

### 11. A release went out wrong

- **A bad module version:** leave the tag in place. Publish a higher version
  whose `go.mod` carries `retract vX.Y.Z` with a one-line reason as its
  comment, or `retract [vLOW, vHIGH]` for a range. The comment is the only text
  `go get -u` users see (GO-MOD-15). A `retract` added to the bad version's own
  `go.mod` does nothing.
- **A bad binary:** ship the fix as a new patch version and run this procedure
  from step 1. Never re-upload assets under the published tag: the signed
  checksums and the attestations still name the old digests.

**Check** after the higher version is on the proxy:

```sh
MOD=example.com/mylib BAD=v1.5.0 # rename both
go list -m -retracted -f '{{.Version}} {{.Retracted}}' "$MOD@$BAD"
```

`v1.5.0 []` before, and `v1.5.0 [<your reason>]` once the retracting version
is served (watched 2026-09-26 through a local proxy).

## The MUST rows this procedure enforces

Merge-blocking rows, restated as findings so a review that runs this procedure
without the rule files loaded still reports them with the right ID. The
rationale and full verification live with the rule named by the ID.

| # | Finding | Rule |
|---|---|---|
| 1 | The gate block was not run, or not run from every `go.mod` root, on the commit that was tagged | GO-GATE-01, GO-MOD-06 |
| 2 | A reachable `govulncheck` finding shipped, or was answered with `replace` | GO-MOD-12 |
| 3 | The release job builds from a bare `go 1.N.0` line with no `toolchain` patch line behind `go-version-file` | GO-MOD-16 |
| 4 | An incompatible API change was tagged without a major bump at v1 and above, or without a minor bump and changelog line at v0 | GO-API-10 |
| 5 | A v2 or higher tag has no `/vN` in its module path, or a `+incompatible` version shipped | GO-MOD-14 |
| 6 | A bad version was deleted, force-pushed or re-tagged instead of retracted from a higher version | GO-MOD-15 |
| 7 | A release binary was built without `-trimpath`, or with a `-X` value derived from the clock | GO-REL-01 |
| 8 | A release build id inherits `CGO_ENABLED` instead of setting it | GO-REL-02 |
| 9 | A release binary has no 40-hex `vcs.revision`, is `+dirty`, or was built with `-buildvcs=false` | GO-REL-03 |
| 10 | `--version` prints a `"dev"` default, raw `BuildInfo`, or a pseudo-version from a tagless shallow checkout | GO-REL-06 |
| 11 | The goreleaser config lacks `version: 2` | GO-REL-07 |
| 12 | Assets are archives, or not named `<tool>-<goos>-<goarch>[.exe]`, or `checksums.txt` is missing | GO-REL-08 |
| 13 | Signing runs outside CI, uses a stored key or a deprecated cosign flag, or the release job lacks `id-token: write` | GO-REL-11 |
| 14 | A workflow `uses:` is not pinned to a 40-hex commit SHA | GO-REL-12 |
| 15 | `CGO_ENABLED=0` is set at workflow level, where it reaches the `-race` job | GO-GATE-04 |

## What agents get wrong here

Ranked by how often it bites.

1. **Keeps goreleaser's defaults.** The default binary template names assets
   `mytool_1.2.3_linux_amd64`, and an omitted `ldflags` key strips the binary
   and stamps a date. Both builds succeed.
2. **Trusts `goreleaser check || exit 1` to enforce `version: 2`.** It exits 0
   without it.
3. **Verifies asset names with `find dist -name 'mytool-*'`**, finds nothing,
   and "fixes" a correct config. The names live in `dist/checksums.txt`.
4. **Copies tag-pinned actions (`@v7`) from a README** into the release
   workflow.
5. **Runs keyless signing locally or in its own sandbox**, where it blocks on a
   device flow, then reaches for a stored key to get past it.
6. **Attests `subject-path: dist/mytool-*`**, which covers the SBOMs and none of
   the binaries.
7. **Treats a tag as editable:** deletes and re-pushes it, or puts `retract`
   into the bad version's own `go.mod`.
8. **Follows the toolchain's `-buildvcs=false` hint**, or reads a green build or
   a correct `--version` as proof of stamping. `-X` hides a missing
   `vcs.revision`.
9. **Sizes the bump by diff length**, gates on `apidiff`'s exit code, or reads
   `gorelease`'s exit 1 on a dirty tree as an API break.
10. **Declares `var version = "dev"`** or prints `debug.ReadBuildInfo()` raw.
11. **Includes the SBOMs in the reproducibility comparison**, sees them differ,
    and concludes the build is not reproducible, or drops `-trimpath` to chase
    it.

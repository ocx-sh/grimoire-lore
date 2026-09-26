# go-release

An ordered runbook for cutting a Go release, for a CLI shipped as raw
per-platform binaries and for a library or SDK shipped as a module tag, from
the tag decision through the API gate, the build and signing gates, to
verifying what was published and retracting a bad version. It is a list of
gates rather than a list of steps, for one reason.

```sh
grim add ghcr.io/ocx-sh/lore/go-release
```

Run it when tagging or releasing a Go module, CLI or SDK, writing or
reviewing a `.goreleaser.yaml` or a Go release workflow, deciding a version
bump or a `/vN` major, checking that a Go binary is reproducible or prints
the right `--version`, verifying release assets, `checksums.txt`, a cosign
bundle or a build-provenance attestation, or fixing a Go version that already
shipped.

## A proxied tag is permanent, and that is the whole design

Once anyone fetches a version through `proxy.golang.org`, the module zip
stays in the proxy and its hash stays in the checksum database. Deleting the
tag, force-pushing, or re-tagging the same version changes nothing for
consumers. The only remedy is a `retract` directive published in a higher
version, and a binary release is bound the same way: the signed
`checksums.txt` and the provenance attestations name the old digests.

Two consequences shape every step. There is no fix-the-release path, so the
skill does not let one be designed: an agent that meets the constraint only
after the ordered steps invents a rollback or a re-upload that cannot exist.
And every gate runs before `git push origin <tag>`, because a defect found
after the push costs a version number while a defect found before it costs a
commit.

## The order is the product

Eleven steps. The first eight all exist to fail before anything is pushed,
signed or uploaded: decide the tag, run the quality gate at the exact commit,
run the library API-compatibility check, grep the goreleaser config for what
its own `check` command does not enforce, stamp the version with a fallback,
build a snapshot and read the asset names from `checksums.txt` rather than
`dist/`, inspect every built binary with `go version -m`, and prove
reproducibility with a double build in two differently named clones. Only
then does the tag get pushed for CI to sign and publish, and the last two
steps verify what shipped and cover retracting what did not.

Two code kinds share most of the order: a CLI runs all eleven steps, a
library or SDK with no binaries skips the build and signing steps and goes
from the API gate straight to the proxy check.

## Gates a green command does not enforce

`goreleaser check` exits 0 on a config missing `version: 2` and on a
`{{ .Now }}` template, so its exit code is not the gate here. The skill greps
the config directly for the v2 key, for an omitted `ldflags` (which
goreleaser fills with a strip flag and a date stamp), for a clock-derived
value, and for a leftover `dockers:` block or deprecated cosign flag.
`gorelease`'s own exit code has the same trap in the other direction: it
exits 1 on a merely uncommitted tree, which reads like an API break and
is not one, and it exits 0 on a v0 module with a removed symbol, so a v0
check reads the report text instead of the exit code.

## Proof over reading

Every claim the runbook makes about a built artifact is checked on the
artifact, never on the config that was supposed to produce it. `go version -m`
reads the actual `vcs.revision`, `CGO_ENABLED` and `GOAMD64` a binary carries.
A double build of the same tag into two differently named directories
produces the same `checksums.txt` or it does not: matching config text is not
accepted as a substitute. Signing happens only inside CI, keyless, because a
local run blocks on a browser device flow that looks like a hang and invites
a stored key to work around it.

## Pinned decisions

Six decisions here encode an agreement rather than a derivation, and each is
a default an adopter overrides once for the repository: the asset shape (raw
binaries plus `checksums.txt`, not archives), keyless CI-only signing with
both a cosign bundle and a build-provenance attestation, no stripping (a
stripped binary drops `govulncheck -mode=binary` from one finding to four on
the same module), GitHub release assets only until a container image or
package manager is asked for, exact tool pins rather than `latest`, and an
SDK wrapping a pre-1.0 CLI staying at module major v0.

## What it refuses to do

It will not read a green `goreleaser check` as proof of the v2 schema, or
`find dist -name '<tool>-*'` as proof of asset names: both live in
`dist/checksums.txt`. It will not treat a correct `--version` string as proof
of VCS stamping, because a `-X` value can paper over a missing
`vcs.revision`. It will not sign outside CI or with a stored key, will not
attest a `dist/<tool>-*` glob that matches only the SBOMs and none of the
binaries, and will not follow the toolchain's own `-buildvcs=false` hint when
a build fails to stamp. It will not treat a bad tag as editable: the fix is a
retract in a higher version or a new patch release, never a delete, a
force-push, or a re-upload under the same coordinates.

## What it does not cover

Bumping the `go` or toolchain directive line and triaging a dependency stay
with `go-modules`. Mirroring someone else's already-built Go binaries is a
digest and binary-scan check, not a release procedure, and is out of scope
here. There is no Go equivalent of Gradle Plugin Portal publishing in this
skill. A container image, when asked for, is built with `ko`, not with
goreleaser's `dockers:` block.

## Siblings

The runbook restates fifteen merge-blocking findings, by rule ID, from the
`GO-REL` family plus the module and quality gates it draws on, so a review
that runs this procedure without the rule sets loaded still reports them
correctly. The rule text, rationale and full verification stay with those
rule sets. `go-modules` covers the version and tagging rules this skill tags
against. `go-gates` owns the ordered quality-gate block that step 2 runs
before any release commit is tagged.

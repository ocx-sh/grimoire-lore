# swift-release

An ordered runbook for cutting a Swift release. It covers a CLI or server shipped as static per-architecture Linux binaries, and a library or SDK shipped as a SwiftPM tag. It runs from the toolchain pin and the tag decision to the published assets, and it covers a release that went out wrong. It is a list of gates rather than a list of steps, for one reason.

```sh
grim add ghcr.io/ocx-sh/lore/swift-release
```

Run it when tagging or releasing a Swift package. Run it when writing a release workflow or `Dockerfile`, deciding a version bump, or building a static Linux binary with the Static Linux SDK. It also covers checksums, an SBOM, an attestation and a version that already shipped. It cites `swift-package` and `swift-quality` rule IDs and expects both installed.

## A pushed tag is permanent, and that is the whole design

SwiftPM has no `retract` and no yank. A consumer's `Package.resolved` pins a revision. Moving a tag leaves old consumers on the old commit and gives new consumers the new one. Both carry the same version, with exit 0 and no message. A binary release is bound the same way, because the published `checksums.txt` and the attestation name the old digests.

Two consequences shape every step. There is no fix-the-release path, so the skill does not let one be designed. A bad release is followed by the next patch version. And every gate runs before `git push origin TAG`, because a defect found before the push costs a commit and a defect found after it costs a version number.

## The order is the product

Twelve steps. Steps 1 to 9 exist to fail before anything is pushed. Step 10 is the only step that publishes, and it runs only when the owner asked for the release.

A library runs steps 1, 2, 3, 10, 11 and 12. A CLI runs 1, 2, 4 to 8, 10, 11 and 12. Step 9, a reproducibility proof and a container image, runs only on request.

The steps in order:

1. Decide the tag.
2. Pin the toolchain, run the gate at the exact commit, tag locally.
3. Library: the API gate and a publishability smoke test.
4. CLI: scan the scripts for known bad recipes.
5. CLI: stamp the version.
6. CLI: install the static SDK and build.
7. CLI: inspect the artifact, then run it.
8. CLI: strip, keep the twin, write the SBOM, assets and checksums.
9. On request only: the proof, the image and the CA bundle.
10. Push the tag and let CI attest.
11. Verify what was published.
12. Handle a release that went out wrong.

Build outputs go outside the checkout. An untracked file makes the SBOM version `TAG-modified`.

## What it does differently

Every claim about a built artifact is checked on the artifact. The path comes from `--show-bin-path` plus the build's own `--swift-sdk` flag, never from `.build/release`. Without the SDK flag it returns the host directory, which after a host build holds a glibc binary. The static recipe is `--swift-sdk <arch>-swift-linux-musl`, and `--static-swift-stdlib` is not it.

The API gate compares against the previous release tag, in a checkout that has the tags. Exit 1 has two meanings. `1 breaking change detected` blocks the tag. `Couldn't get revision` is a shallow clone and not an API break. A library is then proved by a throw-away consumer pinned at the local tag, which catches a leaked `path:` or `branch:` dependency.

The `linux-arm64` asset is built from the same recipe and ran under qemu on an x86_64 host. It is never executed on arm64 hardware, and the receipt labels it that way.

## What agents get wrong by default

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 with Static Linux SDK 0.1.0. The skill lists 15 patterns, ranked by how often each bites. The first is writing `swift build -c release --static-swift-stdlib` as the static build, which links on a toy and fails once Foundation is reachable. Others are copying `.build/release/tool`, setting `.swift-version` to `6.4` or `latest`, and passing the bundle id from `swift sdk list` to `--swift-sdk`.

Some are ported habits. `--locked` exits 64, a `retract` stanza does not exist, and `swift package generate-sbom` is not the release SBOM. `--sbom-spec` exists on 6.4 only. On 6.3.3 it exits 64, so the release job runs 6.4. Others are reporting a macOS, Windows or arm64 step from memory as if it ran.

## Pinned decisions

Five decisions encode an agreement rather than a derivation. Each is a default an adopter overrides once, for the whole repository.

Linux builds are static musl binaries from the Static Linux SDK. Assets are raw `tool-linux-amd64` and `tool-linux-arm64` plus `checksums.txt`. Tags are `vX.Y.Z`, annotated, in one form. Binaries are stripped and the unstripped twin stays a CI artifact, never a release asset. The SBOM is CycloneDX only.

## What it does not cover

macOS universal binaries and notarization, Windows, Android, Embedded and anything under Xcode have no rule behind them here, and the receipt says `unverified: read only`. Bumping tools versions and language modes is `swift-upgrade`. A crash in a built binary is `swift-diagnose`. A container image is built only when the owner asks.

## Siblings

The runbook restates 18 merge-blocking findings by rule ID, so a review that runs it without the rule sets loaded still reports them correctly. The rule text and verification stay with `swift-package`, whose SW-REL family this skill follows, and with `swift-quality`. Bundled with them as `swift-essentials`.

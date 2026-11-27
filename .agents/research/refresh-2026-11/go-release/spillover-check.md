---
title: go-release spillover check from the go-modules pair
target: go-release
date_researched: 2026-11-27
model: sonnet
sources_fetched: 7
---

# Spillover check for go-release

The go-modules pipeline sent one item to go-release. It has four parts, checked separately below. Evidence is in `.agents/research/refresh-2026-11/go-modules/goreleaser-cosign-ko-attest.md` and the decision file `.agents/research/refresh-2026-11/go-modules.md`. Every source below is a primary source (GitHub releases API, pull request metadata, go.dev release history). I could not run cosign: it is not installed here.

## Part 1: switch new configs to actions/attest, check the SHA

Verdict: confirmed by primary source.

- Source: https://github.com/actions/attest-build-provenance/releases (v4.2.2, 2026-08-06). Its note says: "As of version 4, `actions/attest-build-provenance` is simply a wrapper on top of `actions/attest`. Existing applications may continue to use the `attest-build-provenance` action, but new implementations should use `actions/attest` instead."
- SHA check, run 2026-11-27: `gh api repos/actions/attest/git/ref/tags/v4.2.2` returns commit `1e69f48acb82d1966a394da916b4c1698aa569d6` (type commit, not an annotated tag). actions/attest v4.2.2 was published 2026-08-04 (https://github.com/actions/attest/releases).

Affected text, `skills/go-release/references/release-config.md` line 115:
`      - uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2`

Also `skills/go-release/SKILL.md` line 316: "signing key (GO-REL-11). Point `actions/attest-build-provenance` at".

Smallest change: line 115 becomes `- uses: actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6 # v4.2.2` (inputs are unchanged, `subject-checksums` stays). SKILL.md line 316 names `actions/attest`. The wrapper still works, so this is guidance for new configs, not a defect.

## Part 2: rebuild and rescan trigger for binaries built on go1.27.3 or lower

Verdict: confirmed by primary source.

- Source: https://go.dev/doc/devel/release. go1.27.3 (released 2026-10-19) has "security fixes to the `crypto/x509` package". go1.27.4 (released 2026-11-10) has "security fixes to cgo, the `go` command, the compiler, the linker, and the `net/http` package". A release binary built on go1.27.3 or lower carries the standard library and compiler output from before those fixes.

Affected text: the target says nothing about rebuilding after a Go point release. The nearest text is `skills/go-release/SKILL.md` line 396-398: "- **A bad binary:** ship the fix as a new patch version and run this procedure from step 1. Never re-upload assets under the published tag: the signed checksums and the attestations still name the old digests." Line 91 covers `govulncheck ./...` for the module only.

Smallest change: add one bullet beside the "A bad binary" bullet: "- **Built on an older Go patch:** a published binary built on go1.27.3 or lower predates the go1.27.4 fixes (cgo, `go` command, compiler, linker, `net/http`). Rebuild it on the current patch toolchain, run `govulncheck -mode=binary` on the new binary, and ship it as a new patch version. Never replace assets under the old tag."

## Part 3: re-probe cosign 3.1.6 verify-blob --bundle after the predicate-type hardening

Verdict: could not confirm that any change is needed. The hardening itself is confirmed, its effect on `verify-blob` is not.

- Source: https://github.com/sigstore/cosign/releases/tag/v3.1.6 (2026-11-25), entry "Have cosign verify require https://sigstore.dev/cosign/sign/v1 predic… (#5253)". The pull request summary (https://github.com/sigstore/cosign/pull/5253, merged 2026-11-25) says: "Ensure that new bundles verified by `cosign verify` use the predicate type issued by `cosign sign`." That covers `cosign verify` on container images. Nothing in the release or the pull request mentions `verify-blob`, which verifies a blob and a bundle, not a predicate. The go-modules decision file (open question 8) also says the effect on `verify-blob` "is not shown". No cosign binary is available here, so I did not probe it.

Affected text, `skills/go-release/SKILL.md` lines 364-366:
`cosign verify-blob --bundle checksums.txt.sigstore.json \`
`  --certificate-identity-regexp "^https://github.com/$REPO/" \`
`  --certificate-oidc-issuer https://token.actions.githubusercontent.com checksums.txt`
and line 45: "goreleaser 2.17.1, cosign 3.1.3, syft 1.51.0, govulncheck v1.8.0, gh 2.93.0,". The target states cosign 3.1.3 measurements.

Smallest change: none until someone runs `cosign verify-blob` 3.1.6 on a real release bundle (a one-off probe, expect `Verified OK`). If it passes, bump the cosign pins in SKILL.md lines 45 and 62 and release-config.md line 106 and 127 to 3.1.6 and say the probe date. If it fails, fix the command in line 364.

## Part 4: require goreleaser 2.20.3 or later

Verdict: confirmed by primary source.

- Source: https://github.com/goreleaser/goreleaser/releases/tag/v2.20.3 (2026-11-20), Security: "GHSA-qx28-5g8c-9fw6: the snapshot version was embedded unescaped in generated Homebrew and AUR package files, which could lead to code execution when loaded. Affects `>= 2.0.0, <= 2.20.2`; fixed in v2.20.3. Upgrade to v2.20.3 or later." The go-modules decision file notes the pinned config uses neither Homebrew nor AUR, so the exposure is nil for this shape, but v2.20.3 is the latest release and also fixes `formats: [binary]` naming ("use the base name of the binary in formats: [binary]", #7320).

Affected text:
- `skills/go-release/SKILL.md` line 45: "goreleaser 2.17.1, cosign 3.1.3, syft 1.51.0, govulncheck v1.8.0, gh 2.93.0,"
- `skills/go-release/SKILL.md` line 62: "| Tool pins | goreleaser `v2.17.1`, cosign `v3.1.3`, `gorelease` at the pseudo-version above |"
- `skills/go-release/references/release-config.md` line 111: `          version: v2.17.1`

Smallest change: pin `v2.20.3` in those three places. The 2.17.1 measurements in the same files (for example SKILL.md line 318, 157, 186) were taken on 2.17.1. The go-modules artifact re-measured the layout, check exit codes and `subject-path` behaviour on 2.20.3 on 2026-11-27 and found them equal, except the arm64 build directory `_v8.0`. Either re-run those snapshot claims on 2.20.3 before bumping, or bump and state the 2.17.1 measurement date beside them.

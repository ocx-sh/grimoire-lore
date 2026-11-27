---
title: Release toolchain delta for GO-REL (goreleaser, cosign, syft, ko, attest, SLSA)
pair: go-modules
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 34
---

# Release toolchain delta for GO-REL, 2026-09-26 to 2026-11-27

This is a delta update of the existing go-release research. Anything marked "unchanged" stays exactly as written in `skills/go-modules-reference/release.md` and `rules/go-modules.md`.

Method note. Besides reading release notes and docs, the goreleaser claims were re-measured by running goreleaser 2.17.1 and 2.20.3 side by side in a scratch git repository (Go 1.27.4, syft 1.57.2, a `version: 2` config with `formats: [binary]`, six targets). The cosign claims were measured by running the cosign 3.1.3 and 3.1.6 release binaries. Those measurements are labelled "measured 2026-11-27" below.

## Contents

- [Summary](#summary)
- [Current versions on 2026-11-27](#current-versions-on-2026-11-27)
- [Findings, per claim](#findings-per-claim)
- [Exact lines that would change](#exact-lines-that-would-change)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- No goreleaser, cosign, syft or attest release in the window removed or renamed a flag or key that the GO-REL rules rely on. The only pure version-pin edits are the header numbers.
- goreleaser 2.17.1 is stale. Nine releases exist after it: 2.18.0, 2.18.1, 2.18.2, 2.18.3, 2.19.0, 2.20.0, 2.20.1, 2.20.2, 2.20.3. The latest is 2.20.3 (2026-11-20). Three of those (2.18.0, 2.18.1, 2.18.2) predate the baseline measurement date of 2026-09-26, so the baseline was already one minor behind when it was written.
- GO-REL-07 holds. `goreleaser check` 2.20.3 still prints "yours is version: 0" and exits 0 (measured 2026-11-27).
- The binary layout holds. `formats: [binary]`, the default name `<bin>_<version>_<os>_<arch>`, `dist/<id>_<os>_<arch>_<variant>/<bin>` and "subject-path dist/<tool>-* matches only SBOMs" behave identically on 2.17.1 and 2.20.3 (measured 2026-11-27). One precision fix is needed: the arm64 directory is `_v8.0`, not `_v1`.
- cosign is at 3.1.6 (2026-11-25). `--output-signature` and `--output-certificate` are still accepted but deprecated, and fail with "must specify --bundle with --new-bundle-format" unless `--bundle` is also given. `--tlog-upload=false` is deprecated and is rejected under the default signing config. Neither behaviour changed between 3.1.3 and 3.1.6.
- `actions/attest-build-provenance` is not deprecated, but since v4 (2026-02-25, before the window) it is only a wrapper over `actions/attest`, and its README says new implementations should use `actions/attest`. GitHub's own how-to now uses `actions/attest@v4`. Inputs and `subject-checksums` are unchanged.
- The SLSA claim stays at Build L2. GitHub's concept page still says attestations alone give "SLSA v1.0 Build Level 2", and L3 needs a reusable workflow. The newest SLSA spec is v1.2 and nothing in the window changed it.
- Three pre-existing inaccuracies surfaced during re-measurement. They are not upstream movement, but they are wrong in the current text: (a) the GO-REL-09 grep for `.spdx.sbom.json` prints 0 under the documented minimal config, because the default SBOM name ends in `.sbom.json`; (b) ko attaches its SBOM under the legacy `sha256-<digest>.sbom` tag, not as an OCI referrer; (c) the snapshot paragraph says `_v1` for every build directory.
- `gh attestation verify` got security fixes in gh 2.102.0 (2026-09-30): `--source-ref` is now case-sensitive and `--signer-workflow` is matched exactly. Nothing in GO-REL calls those flags today, but any adopter doing so should be on gh 2.102.0 or later.

## Current versions on 2026-11-27

| Tool | Baseline in the rule | Latest on 2026-11-27 | Date | Source |
|---|---|---|---|---|
| goreleaser | 2.17.1 (2026-07-26) | 2.20.3 | 2026-11-20 | [releases](https://github.com/goreleaser/goreleaser/releases) |
| cosign | 3.1.3 (2026-08-06) | 3.1.6 | 2026-11-25 | [releases](https://github.com/sigstore/cosign/releases) |
| syft | unversioned | 1.57.2 | 2026-11-16 | [releases](https://github.com/anchore/syft/releases) |
| ko | not stated | 0.19.1 (no release in the window) | 2026-06-29 | [releases](https://github.com/ko-build/ko/releases) |
| actions/attest-build-provenance | not stated | 4.2.2 (no release in the window) | 2026-08-06 | [releases](https://github.com/actions/attest-build-provenance/releases) |
| actions/attest | not stated | 4.2.2 (main has later commits, no release) | 2026-08-04 | [releases](https://github.com/actions/attest/releases) |
| gh CLI | not stated | 2.106.0 | 2026-11-25 | [releases](https://github.com/cli/cli/releases) |
| SLSA spec | v1.0 cited | v1.2 | before the window | [slsa.dev/spec](https://slsa.dev/spec/) |

Releases after goreleaser 2.17.1, all verified through the GitHub releases API:

| Release | Date | Relevant content for GO-REL |
|---|---|---|
| 2.18.0 | 2026-08-24 | ko templating for `local_domain`, `base_image`, `repositories`; "preflight checks" ([#6704](https://github.com/goreleaser/goreleaser/pull/6704)); release summary; Go 1.27 build; fix for `sign` with `artifacts: none` masking real failures |
| 2.18.1 | 2026-09-05 | `sign` warns when the signer writes no file, "this will be an error in v3" ([#6842](https://github.com/goreleaser/goreleaser/pull/6842)); `archive` reports stripped binary paths |
| 2.18.2 | 2026-09-17 | default SBOM and binary-signature names disambiguate every target variant via new `{{ targetVariant . }}` ([#7144](https://github.com/goreleaser/goreleaser/pull/7144), [#7091](https://github.com/goreleaser/goreleaser/pull/7091)); `check` counting fix ([#7081](https://github.com/goreleaser/goreleaser/pull/7081)); ko and dockers_v2 fixes |
| 2.18.3 | 2026-10-09 | dockers_v2 reports image config digest; docker lint fix |
| 2.19.0 | 2026-10-22 | `archive` zstd level and window; ko `linux_capabilities`; ko SPDX creator reports the real ko version; four `homebrew_casks.hooks.*` deprecations |
| 2.20.0 | 2026-11-04 | security fix: inline publishing SSH private keys could be written in cleartext to `dist/artifacts.json`; ko templates in `platforms` |
| 2.20.1 | 2026-11-11 | ko fixes (`..` main path, remote base image preference) |
| 2.20.2 | 2026-11-12 | security: redact Git publication and SBOM credentials ([#7303](https://github.com/goreleaser/goreleaser/pull/7303)); split checksums fix |
| 2.20.3 | 2026-11-20 | `formats: [binary]` records the base name of the binary when `binary:` contains a directory ([#7320](https://github.com/goreleaser/goreleaser/pull/7320)) |

## Findings, per claim

### 1. "goreleaser 2.17.1": changed

New fact: the latest is 2.20.3 (2026-11-20), with the nine releases listed above. Source: [goreleaser releases](https://github.com/goreleaser/goreleaser/releases), read through the GitHub API. The 2.20.0 and 2.20.2 security fixes concern credentials in `dist/artifacts.json` and SBOM output, so staying on 2.17.1 is not just cosmetic. Nothing in 2.18 to 2.20.3 removes a key used by the GO-REL rules.

### 2. GO-REL-07 "check prints 'yours is version: 0' and still exits 0": unchanged

Measured 2026-11-27 with goreleaser 2.20.3 and a repository that has an `origin` remote: a config without `version:` prints `only version: 2 configuration files are supported, yours is version: 0, please update your configuration`, then `1 configuration file(s) validated`, and exits 0. A config with `version: 1` behaves the same way and also exits 0. 2.18.2's check fix ([#7081](https://github.com/goreleaser/goreleaser/pull/7081)) concerns counting invalid deprecated configurations, not a missing version. The version-gating grep stays the right gate.

Measurement caveat worth one sentence in the rule: in a repository with no git remote, 2.20.3 `check` exits 1 with `scm releases: no remote configured to list refs from`, for any config including a `version: 2` one. A CI check on a fresh clone has a remote, so this does not weaken the rule, but a local experiment can mislead.

### 3. GO-REL-08 and GO-REL-11 layout claims: unchanged, one precision fix

Measured 2026-11-27 on both 2.17.1 and 2.20.3 with the same config (`formats: [binary]`, `name_template: "{{ .Binary }}-{{ .Os }}-{{ .Arch }}"`, `checksum.name_template: checksums.txt`):

- Both produce the six names `mytool-<os>-<arch>` (with `.exe` on Windows) in `dist/checksums.txt`.
- Both place the binaries in `dist/mytool_<os>_<arch>_v1/` for amd64 and `dist/mytool_<os>_<arch>_v8.0/` for arm64, not at `dist/mytool-linux-amd64`.
- Without a `name_template`, both produce `mytool_0.1.0-SNAPSHOT-<sha>_<os>_<arch>`, matching the default named in GO-REL-08.
- A `subject-path: dist/<tool>-*` therefore matches only the SBOM files, as claimed. Note that the SBOM files in the measurement are named `mytool_<version>_<os>_<arch>.sbom.json` (see claim 4), so the glob `dist/mytool-*` matches none of them under the default document name; the rule's claim holds in the weaker form "matches no binary".

The only upstream change touching this area is 2.20.3 ([#7320](https://github.com/goreleaser/goreleaser/pull/7320)): when `binary:` contains a directory (`binary: bin/foo`), the archive's recorded `Binary` is now the base name. Standard configs with a plain `binary:` are unaffected.

Precision fix, pre-existing and not caused by upstream: the snapshot paragraph in release.md says the build path is `dist/<id>_<os>_<arch>_v1/<bin>`. That is true for amd64 only. GO-REL-11 already writes `_<variant>`, which is correct. Harmonise to `_<variant>`.

### 4. GO-REL-09 SBOM claims: unchanged upstream, one pre-existing verification defect

- `sboms: [{artifacts: binary}]` with syft still works. Default args in the current docs are `$artifact --output spdx-json=$document --enrich all`. Measured: the document starts with `"spdxVersion":"SPDX-2.3"`. Source: [goreleaser.com/customization/sbom](https://goreleaser.com/customization/sbom/).
- "goreleaser's docs exclude images from SBOM cataloguing": unchanged. The page still says "Container images generated by GoReleaser are not available to be cataloged by the SBOM tool."
- Default document name for `artifacts: binary` is `{{ .Binary }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}{{ targetVariant . }}.sbom.json`. For default variants (amd64 `v1`, arm64 `v8.0`) `targetVariant` renders empty, so names are identical to before. A non-default `goamd64`, `goarm` or `goarm64` now yields a variant suffix (for example `app_1.0.0_linux_amd64v3.sbom.json`), a rename introduced by 2.18.2 ([#7091](https://github.com/goreleaser/goreleaser/pull/7091), [#7144](https://github.com/goreleaser/goreleaser/pull/7144)). GO-REL-04 pins `GOAMD64` to v1, so the rule's adopters are not affected.
- Pre-existing defect: the GO-REL-09 verification is `grep -c -e '\.spdx\.sbom\.json$' dist/checksums.txt` and says it prints 6. Measured on both 2.17.1 and 2.20.3 with the minimal config the rule itself prescribes, it prints 0, and `grep -c -e '\.sbom\.json$'` prints 6. The earlier fixture must have set `documents:` explicitly to a `.spdx.sbom.json` name. Either the rule adds that `documents:` line or the grep changes to `\.sbom\.json$`.
- syft moved from an unstated version to 1.57.2. Release notes for 1.54.0 to 1.57.2 show dependency and license-matching changes only, with no change to SPDX output flags or `--enrich`. Source: [syft releases](https://github.com/anchore/syft/releases).

### 5. GO-REL-10 `dockers:`, `dockers_v2:` and ko: unchanged upstream, two precision issues

- Key names. The `dockers:` key is listed as superseded by `dockers_v2` on the deprecations page, with no version tag and no date I could find (the page's own history shows the entry predates the window). `dockers_v2:` is current and has had no breaking change in 2.18 to 2.20.3, only fixes (2.18.0 annotation scopes, 2.18.2 build context and ARM64, 2.19.0 baseline CPU variants, 2.18.3 digest). Source: [deprecations](https://goreleaser.com/deprecations/), [dockers_v2](https://goreleaser.com/customization/dockers_v2/). The existing grep for `^dockers:` and `^dockers_v2:` stays correct.
- The rationale "`dockers:` needs a Docker daemon and gets no SBOM" is true for the legacy `dockers:` block. `dockers_v2` uses `docker buildx`, needs a Dockerfile and a multi-platform builder, and its `sbom` option is "Whether to create and attach a SBOM to the image", default true. That default was added in October 2025 (commits [#6201](https://github.com/goreleaser/goreleaser/pull/6201), [#6203](https://github.com/goreleaser/goreleaser/pull/6203)), so it predates the baseline and is not a window change. The rule should say `dockers:` explicitly, or acknowledge that `dockers_v2` does attach a buildx SBOM.
- ko base image. goreleaser's ko page and ko's own configuration page both say the default base is `cgr.dev/chainguard/static`, not Google distroless. The rule text says "distroless static base"; Chainguard static is distroless-style, but the exact name is `cgr.dev/chainguard/static`. Sources: [ko configuration](https://ko.build/configuration/), [goreleaser ko](https://goreleaser.com/customization/ko/). This was already the case at the baseline.
- ko SBOM attachment. ko docs say ko "generates and uploads an SBOM for every image it produces by default", SPDX format, disabled with `--sbom=none`, downloadable with `cosign download sbom`. They never say "OCI referrer". In ko source, `pkg/publish/default.go` pushes the SBOM to the ref returned by `ociremote.SBOMTag(digest)`, the legacy `sha256-<digest>.sbom` tag. ko's ROADMAP lists "support the OCI referrers API" as future work. The file was last touched 2026-03-19. So "SPDX SBOM attached as an OCI referrer" is inaccurate; it is attached under a tag. Sources: [ko SBOM docs](https://ko.build/features/sboms/), [default.go](https://github.com/ko-build/ko/blob/main/pkg/publish/default.go), [ROADMAP](https://github.com/ko-build/ko/blob/main/ROADMAP.md).
- ko window activity: no ko release since 0.19.1 (2026-06-29). On main, 2026-11-26 `fix(sbom): generate valid SPDX identifiers for Go modules`, 2026-10-01 migration of ko's own SLSA provenance to GitHub artifact attestations. Neither changes the rule. goreleaser's ko block gained `linux_capabilities` (2.19.0) and templates in `platforms` (2.20.0), neither relevant. The ko path remains unwatched in a sandbox with no Docker daemon, as the rule says.

### 6. cosign claims: unchanged, version bumped

- Version: 3.1.3 (2026-08-06) becomes 3.1.6 (2026-11-25). 3.1.4 (2026-10-20) is a large maintenance roll-up (including "Deprecate --use-signing-config", [#5056](https://github.com/sigstore/cosign/pull/5056), and `cosign bundle create-from-container`); 3.1.5 (2026-11-24) bumps sigstore/sigstore; 3.1.6 (2026-11-25) hardens verification (requires the `https://sigstore.dev/cosign/sign/v1` predicate type, checks local manifests against their digest). Source: [cosign releases](https://github.com/sigstore/cosign/releases). No removal of any flag appears in these notes or in the [CHANGELOG](https://github.com/sigstore/cosign/blob/main/CHANGELOG.md) (its newest entry is v3.0.5; the 3.1.x notes live only in the releases).
- `--output-signature` and `--output-certificate`: measured 2026-11-27 on cosign 3.1.6 and 3.1.3, both print `Flag --output-signature has been deprecated, please use --bundle to provide the output bundle location, which will include the signature` and then fail with `must specify --bundle with --new-bundle-format` when used without `--bundle`. They are deprecated, not removed, in the whole 3.1.x line. The rule's "deprecated in cosign 3.x" and "never use" stay correct. Both flags are hidden from `sign-blob --help` in 3.1.6.
- `sign-blob --bundle=${signature}` with `${artifact}.sigstore.json`: unchanged. goreleaser's current sign page still shows `args: ["sign-blob", "--bundle=${signature}", "${artifact}", "--yes"]`, `signature: "${artifact}.sigstore.json"`, `artifacts: checksum`, and says "Cosign uses the `--bundle` flag, which combines the certificate and signature into a single `.sigstore.json` file." Source: [goreleaser sign](https://goreleaser.com/customization/sign/).
- `--tlog-upload=false` (failure mode 9): measured on 3.1.3 and 3.1.6, identical. The flag prints `Flag --tlog-upload has been deprecated, prefer using a --signing-config file with no transparency log services` and then fails with `--tlog-upload=false is not supported with --signing-config or --use-signing-config`. So it is a stale flag that errors in 3.1.x with the default signing config. Unchanged since the baseline.
- Default bundle format and signing config: in 3.1.x the new bundle format and the TUF-provided signing config are the default. `--use-signing-config` is deprecated in 3.1.4 and later with the message "an offline signing flag will be added in the future; TUF will continue to provide a signing config by default if one is not provided manually". It was not deprecated in 3.1.3 (visible in its help). The GO-REL-11 args do not use it, so no YAML change follows. `--signing-config` still exists and requires `--bundle`.
- A related goreleaser change: since 2.18.1 ([#6842](https://github.com/goreleaser/goreleaser/pull/6842)) a `signs:` entry whose signer does not write its configured signature file produces `the signer did not write <path>: this will be an error in v3`. The pinned config writes `${signature}` through `--bundle`, so it is unaffected. A config that used `--output-signature` would have been caught by this too.

### 7. GO-REL-11 attest action, permissions, verify: unchanged in behaviour, upstream advice moved

- `actions/attest-build-provenance` is not archived and not deprecated, but its README states: "As of version 4, `actions/attest-build-provenance` is simply a wrapper on top of `actions/attest`. Existing applications may continue to use the `attest-build-provenance` action, but new implementations should use `actions/attest` instead." v4.0.0 shipped 2026-02-25, so this predates the window, but the baseline text still names only the wrapper. Sources: [attest-build-provenance README](https://github.com/actions/attest-build-provenance), [actions/attest README](https://github.com/actions/attest).
- Inputs: `subject-checksums` exists unchanged in `actions/attest` (one of `subject-path`, `subject-digest`, `subject-checksums`, at most one). The wrapper forwards the same inputs. Latest wrapper action.yml pins `actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6 # v4.2.2`, which gives a verified 40-hex SHA for GO-REL-12 if the rule moves to `actions/attest`. That SHA is read from the wrapper's action.yml, not independently confirmed as the v4.2.2 tag commit by tag lookup; verify with `gh api repos/actions/attest/git/ref/tags/v4.2.2` before committing it.
- Changes on `actions/attest` main in the window (no release): 2026-11-06 "fail when a literal subject-path entry matches no files", 2026-10-26 "preserve custom registry ports in storage records". Neither affects `subject-checksums`.
- Permissions: the actions/attest README block is `id-token: write`, `attestations: write`, `artifact-metadata: write`. GitHub's how-to example for binaries uses `id-token: write`, `contents: read`, `attestations: write`. `artifact-metadata: write` is only needed for the storage record, which requires `push-to-registry: true` (default false), so a checksum-subject release job does not need it. The rule's `contents: write` is required by goreleaser to create the release, not by the attestation, so the existing three-permission block remains correct for this workflow. Sources: [GitHub how-to](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations), [actions/attest README](https://github.com/actions/attest).
- `gh attestation verify`: interface unchanged; the doc example is still `gh attestation verify PATH -R OWNER/REPO`. gh 2.102.0 (2026-09-30) fixed two advisories in it: `--source-ref` compared case-insensitively ([GHSA-4mq3-hpgx-9cx8](https://github.com/cli/cli/security/advisories/GHSA-4mq3-hpgx-9cx8)) and `--signer-workflow` matched only by prefix ([GHSA-wjmr-j3rp-mh2g](https://github.com/cli/cli/security/advisories/GHSA-wjmr-j3rp-mh2g)). Source: [gh v2.102.0 release](https://github.com/cli/cli/releases/tag/v2.102.0).

### 8. "This reaches SLSA Build L2, not L3": unchanged

GitHub's artifact attestation concept page, fetched 2026-11-27, says attestations alone give "SLSA v1.0 Build Level 2" and that L3 requires isolating the build in a shared reusable workflow. The SLSA spec's latest version is v1.2 (Build Track and Source Track); nothing in the window changed Build L2 or L3. Sources: [GitHub concept page](https://docs.github.com/en/actions/concepts/security/artifact-attestations), [slsa.dev/spec](https://slsa.dev/spec/).

## Exact lines that would change

Only if the owner accepts the delta. Rules whose upstream did not move are not listed.

### release.md header and floors

```
- Binds to Go 1.27.1, goreleaser 2.17.1, cosign 3.1.3, govulncheck v1.8.0 and syft
- (measured 2026-09-26).
+ Binds to Go 1.27.1, goreleaser 2.20.3, cosign 3.1.6, govulncheck v1.8.0 and syft 1.57.2
+ (measured 2026-09-26, goreleaser and cosign re-checked 2026-11-27).
```

The same version string appears in the `rules/go-modules.md` header region (line 38 area, "goreleaser" in the toolchain sentence); update it in step. The "Go 1.27.1" and "govulncheck v1.8.0" numbers are outside this commission.

### GO-REL-07 rationale

```
- goreleaser 2.17.1 `check` prints "yours is version: 0" and still exits 0 (measured 2026-09-26).
+ goreleaser 2.17.1 and 2.20.3 `check` print "yours is version: 0" and still exit 0 (measured 2026-09-26 and 2026-11-27).
```

### Snapshot paragraph

```
- The build path is `dist/<id>_<os>_<arch>_v1/<bin>`, so ...
+ The build path is `dist/<id>_<os>_<arch>_<variant>/<bin>` (`_v1` for amd64, `_v8.0` for arm64), so ...
```

### GO-REL-09 verification (defect fix, either option)

```
- `grep -c -e '\.spdx\.sbom\.json$' dist/checksums.txt` prints `6` on the pass
+ `grep -c -e '\.sbom\.json$' dist/checksums.txt` prints `6` on the pass
```

The same grep would need updating anywhere the earlier fixtures used `.spdx.sbom.json`.

### GO-REL-10 rule and rationale

```
- build it with `ko build` (distroless static base, SPDX SBOM attached as an OCI referrer), not with goreleaser `dockers:`.
+ build it with `ko build` (base `cgr.dev/chainguard/static`, SPDX SBOM pushed under the image's `sha256-<digest>.sbom` tag, fetched with `cosign download sbom`), not with goreleaser `dockers:` (deprecated in favour of `dockers_v2:`, which needs a Dockerfile and buildx).
- `dockers:` needs a Docker daemon and gets no SBOM.
+ `dockers:` needs a Docker daemon and gets no SBOM; `dockers_v2:` needs buildx and a Dockerfile.
```

The grep block (`^dockers:` and `^dockers_v2:`) needs no change.

### GO-REL-11 workflow YAML

Current guidance names `actions/attest-build-provenance`. Upstream's recommendation is `actions/attest`. Equivalent step, with the permission block unchanged:

```yaml
permissions:
  contents: write
  id-token: write
  attestations: write
steps:
  - uses: actions/attest@<40-hex SHA> # v4.2.2
    with:
      subject-checksums: dist/checksums.txt
```

In the rule text replace "runs `actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`" by "runs `actions/attest` (the successor that `actions/attest-build-provenance` v4 wraps) with `subject-checksums: dist/checksums.txt`", and the 2.17.1 mention in the same cell with "goreleaser 2.17.1 and 2.20.3". The goreleaser `signs:` lines (`artifacts: checksum`, `signature: "${artifact}.sigstore.json"`, `args: [sign-blob, "--bundle=${signature}", "${artifact}", --yes]`) stay as they are. The command-2 grep for `--output-signature`, `--output-certificate` and `COSIGN_PRIVATE_KEY` stays as it is. Optionally add `--tlog-upload` to that grep, since it is a deprecated flag that errors under the default signing config; this is a candidate, not a requirement.

If the owner prefers not to switch actions, no YAML line changes at all, because the wrapper is supported.

### Failure mode 9

No change to flags. The wording "Stale cosign flags (`--output-signature`, `--tlog-upload=false`)" stays true; optionally add "both still accepted in cosign 3.1.6 with a deprecation notice, but they fail under the default signing config."

## Normative guidance candidates

1. Candidate (modify GO-REL-09 verification). Use `grep -c -e '\.sbom\.json$' dist/checksums.txt` for the six-document count, or add an explicit `documents:` line to the prescribed config. Rationale: the default document name ends `.sbom.json` on 2.17.1 and 2.20.3, so the current grep reports 0 on a correct snapshot. Verification: run `goreleaser release --snapshot --clean --skip=sign` on a six-target `formats: [binary]` fixture with syft on `PATH`, then run the grep; 6 is the pass.
2. Candidate (modify GO-REL-10). State the ko SBOM location as the `.sbom` tag and not an OCI referrer. Rationale: ko source uses `ociremote.SBOMTag`, and referrers support is a ROADMAP item. Verification: after `ko build`, `cosign download sbom <image@digest>` returns SPDX JSON; `crane ls <repo>` lists a `sha256-<digest>.sbom` tag. The ko path stays unwatched in the measuring sandbox, so say "documented, not measured".
3. Candidate (modify GO-REL-11). Prefer `actions/attest` over `actions/attest-build-provenance` for new configurations. Rationale: the wrapper's README says new implementations should use `actions/attest`, and GitHub's own how-to uses it. Verification: grep the workflows for `uses: actions/attest-build-provenance@` and flag it as a CONSIDER, not a MUST, since the wrapper stays supported.
4. Candidate (modify GO-REL-11 command-2 grep, optional). Add `--tlog-upload` to the forbidden-flag grep. Rationale: measured 2026-11-27 on cosign 3.1.3 and 3.1.6, it is rejected under the default signing config. Verification: the grep itself, `git ls-files ... | xargs grep -H -n -e '--tlog-upload' --`.
5. Candidate (documentation precision, no new rule). Change `_v1` to `_<variant>` in the snapshot paragraph, because arm64 builds land in `_v8.0`. Verification: `ls dist` after a snapshot.
6. Candidate (new, low priority). Any workflow that calls `gh attestation verify` with `--signer-workflow` or `--source-ref` requires gh 2.102.0 or later. Rationale: GHSA-4mq3-hpgx-9cx8 and GHSA-wjmr-j3rp-mh2g. Verification: `gh --version`; only relevant where adopters script these flags, which the current rule does not.

## AI-agent angle

- A model trained before 2026-09 will write goreleaser 2.17-era text and miss that `actions/attest` is the recommended action. It will happily emit `uses: actions/attest-build-provenance@v2` or `@v3` tag refs (GO-REL-12 catches the pin; a grep for `attest-build-provenance@` catches the action choice).
- It will write `grep spdx.sbom.json` style checks from memory. The mechanical check is to run the snapshot and count `.sbom.json` lines.
- It will assume `goreleaser check` now fails on a missing `version: 2`, because newer releases added "preflight checks". It does not. The mechanical check is the existing GO-REL-07 grep.
- It will claim ko attaches an "OCI referrer". The mechanical check is `crane ls` showing the `.sbom` tag, or `cosign download sbom`.
- It will keep `--tlog-upload=false` for "offline" signing. The mechanical check is the `--tlog-upload` grep above.

## Contested / evolving

- goreleaser v3 is flagged in docs ("will be an error in v3") for the signer-did-not-write-file case, and `docker_signs.artifacts` is slated for removal. No v3 date was found. Trend: `dockers` to `dockers_v2`, `brews` to `homebrew_casks`, cosign `--output-*` to `--bundle`. Watch as of 2026-11-27.
- cosign's offline signing story is in flux: `--use-signing-config` is deprecated with a promise of an offline signing flag later, and `--tlog-upload=false` is deprecated in favour of a signing config without transparency-log URLs. Any "offline signing" guidance should be revisited when that flag appears.
- ko referrers support is an open roadmap item. If it lands, the GO-REL-10 wording will flip back toward "referrer".
- `actions/attest` main has changes after the 4.2.2 tag (2026-11-06 subject-path matching strictness). The next release may change `subject-path` globbing behaviour, not `subject-checksums`.
- Could not determine: the exact date the goreleaser `dockers` entry became "deprecated" on the deprecations page (no version tag; page history shows no entry change inside the window). The goreleaser blog URL `blog/upgrading-to-cosign-v3/` returned 404, so no goreleaser-authored cosign v3 upgrade guide was read; the sign page, source PRs and measurements stand in for it.

## Sources

| URL | What it is | Date or era | Why worth reading |
|---|---|---|---|
| https://github.com/goreleaser/goreleaser/releases | goreleaser release list and bodies 2.18.0 to 2.20.3 (read via GitHub API) | 2026-08-24 to 2026-11-20 | Names every release after 2.17.1 |
| https://github.com/goreleaser/goreleaser/pull/7081 | check counting fix | merged 2026-09-06 | Confirms check change is not about `version:` |
| https://github.com/goreleaser/goreleaser/pull/7091 | SBOM per-variant names | merged 2026-09-06 | Default SBOM document name rule |
| https://github.com/goreleaser/goreleaser/pull/7144 | `targetVariant` template function | merged 2026-09-17 | Default SBOM and signature names |
| https://github.com/goreleaser/goreleaser/pull/7320 | `formats: [binary]` base name | merged 2026-11-15 | Only binary-archive behaviour change |
| https://github.com/goreleaser/goreleaser/pull/6842 | sign warns when no file written, error in v3 | merged 2026-08-30 | Signing config robustness |
| https://github.com/goreleaser/goreleaser/pull/6704 | preflight checks | merged 2026-08-03 | Ruled out as a `check` change |
| https://goreleaser.com/customization/sbom/ | SBOM docs | current 2026-11-27 | Default args, names, image exclusion |
| https://goreleaser.com/customization/sign/ | sign docs | current | Cosign `--bundle` example, v3 warning |
| https://goreleaser.com/deprecations/ | deprecation list | current | `dockers` superseded, no new relevant entries |
| https://goreleaser.com/customization/dockers_v2/ | dockers_v2 docs | current | buildx, Dockerfile, SBOM default |
| https://goreleaser.com/customization/ko/ | ko docs | current | Base image, sbom, new options |
| https://github.com/sigstore/cosign/releases | cosign releases 3.1.4 to 3.1.6 | 2026-10-20 to 2026-11-25 | Version and deprecations |
| https://github.com/sigstore/cosign/blob/main/CHANGELOG.md | cosign changelog | newest entry v3.0.5 | No removals recorded |
| cosign 3.1.3 and 3.1.6 release binaries (run locally) | measured flag behaviour | 2026-11-27 | Direct evidence on deprecated flags |
| goreleaser 2.17.1 and 2.20.3 release binaries (run locally) | measured check and dist layout | 2026-11-27 | Direct evidence on GO-REL-07, -08, -09 |
| https://github.com/anchore/syft/releases | syft releases 1.52.0 to 1.57.2 | 2026-09-17 to 2026-11-16 | Latest syft, no SPDX flag change |
| https://github.com/ko-build/ko/releases | ko releases | latest 2026-06-29 | No release in the window |
| https://ko.build/features/sboms/ | ko SBOM docs | current | No referrer claim |
| https://ko.build/configuration/ | ko configuration | current | Default base image |
| https://github.com/ko-build/ko/blob/main/pkg/publish/default.go | ko publish source | last changed 2026-03-19 | SBOM attached by `SBOMTag` |
| https://github.com/ko-build/ko/blob/main/ROADMAP.md | ko roadmap | current | Referrers listed as future work |
| https://github.com/actions/attest-build-provenance | wrapper README, action.yml, releases | v4.2.2, 2026-08-06 | Wrapper and successor statement |
| https://github.com/actions/attest | successor action README and commits | v4.2.2, main to 2026-11-06 | Inputs, permissions, recent changes |
| https://docs.github.com/en/actions/concepts/security/artifact-attestations | GitHub attestation concepts | current | L2 versus L3 statement |
| https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations | GitHub how-to | current | Permissions block, `actions/attest@v4`, verify command |
| https://slsa.dev/spec/ | SLSA specification index | v1.2 | Latest spec version |
| https://github.com/cli/cli/releases/tag/v2.102.0 | gh security release | 2026-09-30 | `gh attestation verify` fixes |
| https://github.com/cli/cli/releases | gh release list | latest 2026-11-25 | Current gh version |

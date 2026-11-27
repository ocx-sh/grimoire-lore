---
title: go-release refresh decision, spillover round
target: go-release
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/go-release/spillover-check.md
---

# go-release refresh decision, spillover round

The go-modules pair sent one item with four parts to the go-release skill. The first round of this refresh did not touch `skills/go-release/`, so every edit below builds on the committed text. Three parts are confirmed by primary sources and change the skill. One part is unconfirmed and changes nothing.

## Verdict

- Apply part 1. The reference release workflow names `actions/attest` at commit `1e69f48acb82d1966a394da916b4c1698aa569d6` (v4.2.2). The `actions/attest-build-provenance` v4.2.2 release note says that since v4 it only wraps `actions/attest` and that new implementations should use `actions/attest`. The tag ref resolves to that commit (type commit, re-read 2026-11-27). The action's `action.yml` at that commit still has the `subject-checksums` input, and its README says that with no `sbom-path` or predicate input it generates SLSA build provenance. The workflow's `with:` block therefore stays unchanged. Step 9 of the runbook names `actions/attest` and says an existing workflow may keep the wrapper.
- Apply part 2. A new bullet in step 11 covers a published binary built on an outdated Go patch. go.dev/doc/devel/release lists go1.27.3 (2026-10-19, security fixes to `crypto/x509`) and go1.27.4 (2026-11-10, security fixes to cgo, the `go` command, the compiler, the linker and `net/http`). The bullet's check is `go version <asset>`. The fix is a new patch version, never replaced assets.
- Apply part 4. The goreleaser pin moves from v2.17.1 to v2.20.3 in the pinned-defaults table, in the workflow's `version:` input and in the workflow's explanation table. The v2.20.3 release (2026-11-20) fixes GHSA-qx28-5g8c-9fw6, which affects 2.0.0 through 2.20.2. The pinned shape publishes no Homebrew or AUR file, so the exposure is nil, but the pin must not sit inside an advisory's affected range. The 2.17.1 measurements stay as they are. A sentence beside the tool-version list names what was re-run on 2.20.3 on 2026-11-27 (snapshot layout, `goreleaser check` exit codes, `subject-path` result) and says that the other goreleaser measurements were taken on 2.17.1 only. The reference file's header gives the resolve date of the two new pins.
- Decline part 3. cosign 3.1.6 hardened the predicate type that `cosign verify` requires. Neither the release note nor sigstore/cosign#5253 mentions `verify-blob`, and no one has run the probe. The cosign 3.1.3 pins and the `verify-blob` command in step 10 stay as they are.
- Bump: skill `minor`. The `actions/attest` guidance and the rebuild trigger are new guidance. No rule file changes, so the rule bump is `none`.

## Changed statements

The skill has no rule IDs. Step numbers and table rows keep their numbers and their meaning.

| Location | Old text | New text | Verification | Source |
|---|---|---|---|---|
| SKILL.md, tool-version paragraph | ends at the `gorelease` pseudo-version | adds: the pin is v2.20.3, which fixes GHSA-qx28-5g8c-9fw6. The snapshot layout, the check exit codes and the `subject-path` result matched on 2.20.3 on 2026-11-27. The other goreleaser measurements were taken on 2.17.1 only | a reading fact. The measured claims keep their 2.17.1 provenance | goreleaser v2.20.3 release, go-modules re-measurement 2026-11-27 |
| SKILL.md, Pinned defaults, Tool pins | goreleaser `v2.17.1` | goreleaser `v2.20.3` | the workflow's `version:` input reads `v2.20.3`, a reading check against the reference file | goreleaser v2.20.3 release |
| SKILL.md, step 9 | "Point `actions/attest-build-provenance` at `subject-checksums: dist/checksums.txt`." | "Point `actions/attest` at `subject-checksums: dist/checksums.txt`. `actions/attest-build-provenance` v4 only wraps it, so an existing workflow may keep the wrapper." | unchanged: the step 9 attestation grep matches `subject-checksums: *dist/checksums.txt` under either action, and step 10's `gh attestation verify` proves the attestation | attest-build-provenance v4.2.2 release note, actions/attest action.yml and README at `1e69f48` |
| release-config.md, header | every version and commit SHA was resolved on 2026-09-26 | the same, except that the `actions/attest` SHA and the goreleaser `v2.20.3` pin were resolved on 2026-11-27 | a reading fact | `gh api repos/actions/attest/git/ref/tags/v4.2.2`, goreleaser releases |
| release-config.md, workflow | `actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2` | `actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6 # v4.2.2` | GO-REL-12's pin grep in step 9 stays empty, because the ref is 40-hex | same as above |
| release-config.md, workflow | `version: v2.17.1` | `version: v2.20.3` | same as the Tool pins row | goreleaser v2.20.3 release |
| release-config.md, workflow table | `` `version: v2.17.1` `` row | `` `version: v2.20.3` `` row, with the same reason | same | same |

## New rules

There is no new rule ID. One new procedure bullet goes into step 11, beside "A bad binary":

- **A binary built on an outdated Go patch.** `go version <asset>` names the toolchain that built a published asset. A patch older than the current one with security fixes is the finding. On 2026-11-27, go1.27.3 or lower predates the go1.27.4 fixes. The remedy: move the `toolchain` line (GO-MOD-16), ship a new patch version from step 1, and scan the new binary in step 7. Never replace assets under the old tag.
- Verification: `go version mytool-linux-amd64` prints `mytool-linux-amd64: go1.27.N`. An `N` below the current security patch is the finding.

## Declined

- Part 3, the cosign 3.1.6 `verify-blob --bundle` re-probe. The hardening is confirmed only for `cosign verify` (sigstore/cosign#5253). No source says that `verify-blob` changed, and no probe was run. The cosign pins stay at v3.1.3 until someone runs `cosign verify-blob` 3.1.6 on a real release bundle.
- The step 4 cosign-flag grep does not get `--tlog-upload`. The go-modules round added that flag to GO-REL-11's command 2, but it was not part of this spillover item. It is a candidate for the next go-release round.
- The 2.17.1 measurement sentences (steps 4, 5 and 9, and both traps in release-config.md) and the `metadata.summary` provenance are not rewritten. They describe what was measured on 2.17.1, which stays true. The new paragraph sentence records the 2.20.3 re-run.

## Sources

- https://github.com/actions/attest-build-provenance/releases (v4.2.2, 2026-08-06): new implementations should use `actions/attest`.
- https://github.com/actions/attest/releases (v4.2.2, 2026-08-04). Tag ref read 2026-11-27: commit `1e69f48acb82d1966a394da916b4c1698aa569d6`. `action.yml` and README at that commit: `subject-checksums` input, and SLSA build provenance when no predicate input is given.
- https://go.dev/doc/devel/release, read 2026-11-27: the go1.27.3 and go1.27.4 entries.
- https://github.com/goreleaser/goreleaser/releases/tag/v2.20.3 (2026-11-20): GHSA-qx28-5g8c-9fw6, affects `>= 2.0.0, <= 2.20.2`.
- https://github.com/sigstore/cosign/releases/tag/v3.1.6 and https://github.com/sigstore/cosign/pull/5253: scope of the predicate-type hardening (declined part).
- The go-modules pair's goreleaser 2.20.3 re-measurement of 2026-11-27, as recorded in the spillover check.

## Revision log

1. SKILL.md tool-version paragraph: goreleaser v2.20.3 pin and the scope of its 2026-11-27 re-run added.
2. SKILL.md Pinned defaults: goreleaser pin v2.20.3.
3. SKILL.md step 9: `actions/attest` named, wrapper allowed for existing workflows.
4. SKILL.md step 11: new bullet for binaries built on an outdated Go patch.
5. release-config.md header: resolve date of the two new pins.
6. release-config.md workflow: `actions/attest` at `1e69f48`.
7. release-config.md workflow: goreleaser `version: v2.20.3`.
8. release-config.md workflow table: `version: v2.20.3` row.

### Edit list (spillover round)

1. File: `skills/go-release/SKILL.md`
   Find:
   ```
   `gorelease` from `golang.org/x/exp` at `v0.0.0-20260908205506-85c1c2202aba`.
   The goreleaser config and the release workflow these steps assume are in
   ```
   Replace with:
   ```
   `gorelease` from `golang.org/x/exp` at `v0.0.0-20260908205506-85c1c2202aba`.
   The goreleaser pin is v2.20.3, which fixes GHSA-qx28-5g8c-9fw6 (read
   2026-11-27). Re-run on 2.20.3 on 2026-11-27, the snapshot layout, the
   `goreleaser check` exit codes and the `subject-path` result matched 2.17.1.
   The other goreleaser measurements below were taken on 2.17.1 only.
   The goreleaser config and the release workflow these steps assume are in
   ```

2. File: `skills/go-release/SKILL.md`
   Find:
   ```
   | Tool pins | goreleaser `v2.17.1`, cosign `v3.1.3`,
   ```
   Replace with:
   ```
   | Tool pins | goreleaser `v2.20.3`, cosign `v3.1.3`,
   ```

3. File: `skills/go-release/SKILL.md`
   Find:
   ```
   signing key (GO-REL-11). Point `actions/attest-build-provenance` at
   `subject-checksums: dist/checksums.txt`. With raw binaries, the glob
   ```
   Replace with:
   ```
   signing key (GO-REL-11). Point `actions/attest` at
   `subject-checksums: dist/checksums.txt`. `actions/attest-build-provenance` v4
   only wraps it, so an existing workflow may keep the wrapper. With raw
   binaries, the glob
   ```

4. File: `skills/go-release/SKILL.md`
   Insert after the anchor:
   ```
     from step 1. Never re-upload assets under the published tag: the signed
     checksums and the attestations still name the old digests.
   ```
   Text to insert:
   ```
   - **A binary built on an outdated Go patch:** `go version mytool-linux-amd64`
     names the toolchain that built a published asset. A patch older than the
     current one with security fixes is the finding: on 2026-11-27, go1.27.3 or
     lower predates go1.27.4's fixes to cgo, the `go` command, the compiler, the
     linker and `net/http`. Move the `toolchain` line to the current patch
     (GO-MOD-16), ship a new patch version from step 1, and scan the new binary
     in step 7. Never replace assets under the old tag.
   ```

5. File: `skills/go-release/references/release-config.md`
   Find:
   ```
   the module path to yours. Every version and commit SHA below was resolved on
   2026-09-26, and the goreleaser file was run with goreleaser 2.17.1, Go 1.27.1
   and syft 1.51.0.
   ```
   Replace with:
   ```
   the module path to yours. Every version and commit SHA below was resolved on
   2026-09-26, except the `actions/attest` SHA and the goreleaser `v2.20.3` pin,
   resolved on 2026-11-27. The goreleaser file was run with goreleaser 2.17.1,
   Go 1.27.1 and syft 1.51.0.
   ```

6. File: `skills/go-release/references/release-config.md`
   Find:
   ```
             version: v2.17.1
             args: release --clean
   ```
   (exact text: ten spaces, `version: v2.17.1`, newline, ten spaces, `args: release --clean`)
   Replace with:
   ```
             version: v2.20.3
             args: release --clean
   ```
   (exact text: ten spaces, `version: v2.20.3`, newline, ten spaces, `args: release --clean`)

7. File: `skills/go-release/references/release-config.md`
   Find:
   ```
         - uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2
   ```
   (exact text: six spaces, then `- uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2`)
   Replace with:
   ```
         - uses: actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6 # v4.2.2
   ```
   (exact text: six spaces, then `- uses: actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6 # v4.2.2`)

8. File: `skills/go-release/references/release-config.md`
   Find:
   ```
   | `version: v2.17.1` | the action's default `~> v2` floats across releases | GO-REL-07 |
   ```
   Replace with:
   ```
   | `version: v2.20.3` | the action's default `~> v2` floats across releases | GO-REL-07 |
   ```

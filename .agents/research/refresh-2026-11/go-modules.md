---
title: go-modules delta refresh, 2026-09-26 to 2026-11-27
pair: go-modules
date: 2026-11-27
window_start: 2026-09-26
model: opus
consolidates:
  - .agents/research/refresh-2026-11/go-modules/go-toolchain-point-releases-and-1-28-cycle.md
  - .agents/research/refresh-2026-11/go-modules/golangci-lint-staticcheck-gosec.md
  - .agents/research/refresh-2026-11/go-modules/x-vuln-and-x-tools.md
  - .agents/research/refresh-2026-11/go-modules/goreleaser-cosign-ko-attest.md
  - .agents/research/refresh-2026-11/go-modules/github-actions-setup-go-dependabot.md
  - .agents/research/refresh-2026-11/go-modules/recent-shifts-go-modules.md
revises:
  - .agents/research/go-modules.md
  - .agents/research/go-gates.md
  - .agents/research/go-release.md
  - .agents/research/go-frame.md
---

# go-modules delta refresh

## Contents

- [Verdict](#verdict)
- [Changed rules](#changed-rules)
- [New rules](#new-rules)
- [Confirmed unchanged](#confirmed-unchanged)
- [Open questions](#open-questions)
- [Revision log](#revision-log)
- [Edit list](#edit-list)
- [Spillover round](#spillover-round)

## Verdict

- Move the golangci-lint pin from v2.14.0 to v2.15.0 (2026-10-16) in GO-GATE-08, in the gates.md floors, and in the rule's Severity defaults. v2.15.0 bundles staticcheck 2026.2.2 (2026-10-12), the first staticcheck that supports the export data format Go 1.27.2 changed. v2.14.0 bundles 2026.2.1, which predates that format. GO-MOD-02 and GO-MOD-16 already require the latest patch toolchain, which is now go1.27.4, so keeping v2.14.0 would leave the set contradicting itself. The source diff from v2.14.0 to v2.15.0 removes or renames no key or linter name the three shipped files use. The runtime probes were not re-run on v2.15.0, and the text says so.
- Bump every "binds to" header to Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2 and goreleaser 2.20.3, plus cosign 3.1.6 and syft 1.57.2 in release.md. Each header also records that its behaviour claims were measured on 2026-09-26 on the earlier versions. Keep govulncheck v1.8.0, gopls v0.23.0 and nilness@v0.49.0. Their newer releases change no behaviour (govulncheck v1.9.0 and v1.10.0 bump dependencies only), and the x/tools artifact says to bump them only together with a re-measure.
- Correct GO-GATE-14's G115 rationale and the matching comment in the three YAML files. securego/gosec#1187 was closed by securego/gosec#1189 on 2024-08-26, so citing it as a live defect is stale. The exclusion itself stays until the emptied-excludes probe runs. The bundled gosec is v2.29.0 in both golangci-lint versions, so the gosec roster did not move.
- Change the `desc` of the `gopkg.in/yaml.v2` and `gopkg.in/yaml.v3` depguard entries in all three files. go.yaml.in/yaml/v4 v4.0.0 shipped as stable on 2026-11-04, and the project says v2 and v3 are frozen with security fixes only. New code goes to v4. A drop-in swap still goes to go.yaml.in/yaml/v3, because v4 changes formatting defaults and unmarshaler signatures. The deny list keeps its 13 entries.
- Fix four GO-REL facts that the 2026-11-27 re-measurement showed to be wrong. (1) The GO-REL-09 grep for `\.spdx\.sbom\.json$` prints 0 under the rule's own minimal `sboms:` config, so it becomes `\.sbom\.json$`, which also matches the go-release skill's explicit `.spdx.sbom.json` names. (2) The snapshot paragraph says `_v1` for every build directory, but arm64 builds land in `_v8.0`. (3) ko's default base is `cgr.dev/chainguard/static`, and ko pushes its SBOM under the legacy `sha256-<digest>.sbom` tag, not as an OCI referrer. (4) A `subject-path: dist/<tool>-*` matches no binary, which is true under both SBOM naming schemes, while "only the SBOMs" is not.
- In GO-REL-11, name `actions/attest` as the attestation action, because the `actions/attest-build-provenance` README says that since v4 it only wraps `actions/attest` and that new implementations should use `actions/attest`. Existing workflows may keep the wrapper, so the go-release skill's example stays valid. Add `--tlog-upload` to the forbidden cosign flags and to command 2's grep: cosign 3.1.3 and 3.1.6 both reject `--tlog-upload=false` under the default signing config (measured 2026-11-27).
- Reword GO-REL-12's rationale. GitHub's current secure-use page no longer calls a full SHA "the only immutable way". It says to pin each action to a full-length commit SHA, and it names workflow lockfiles (GA 2026-10-28) as stronger protection for repositories that adopt them. The SHA rule and `pin-check` stay as they are. Whether a lockfile satisfies GO-REL-12 is an owner decision, listed under open questions.
- Re-date GO-MOD-16's setup-go evidence to v7.1.0, read 2026-11-27. The `go-version-file`, patch and `check-latest` semantics are unchanged. The rationale names go-command CVEs as well as stdlib CVEs, because go1.27.2 to go1.27.4 fixed a toolchain checksum bypass and cgo build-time code execution.
- Add one sentence to GO-MOD-17's rationale. Dependabot's gomod documentation says nothing about the `toolchain` line, so GO-MOD-02's bump stays manual. This closes the baseline's open question about Dependabot.
- Add no new rule. The goreleaser 2.20.0 and 2.20.3 advisories hit inline SSH-key publishing and Homebrew or AUR output, and the pinned GO-REL-08 shape uses neither, so the header bump to 2.20.3 is enough. depguard v2.3.0 has not reached golangci-lint yet. The x/crypto/openpgp deny entry has no successor that agents can be pointed to. Workflow lockfiles wait for an owner decision. The gh 2.102.0 fixes touch flags the rule never calls.
- Bump: rule `patch` (only corrected facts and dates). Reference skill `minor`: `actions/attest` and the `--tlog-upload` ban are new guidance, and so is the v4 successor in the depguard `desc`.

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| Rule header (no ID) | "Binds to Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and goreleaser 2.17.1 (measured 2026-09-26)." | "Binds to Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.8.0 and goreleaser 2.20.3 (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1, golangci-lint v2.14.0 and goreleaser 2.17.1)." | [go.dev/doc/devel/release](https://go.dev/doc/devel/release), [golangci-lint releases](https://github.com/golangci/golangci-lint/releases), [staticcheck 2026.2.2](https://github.com/dominikh/go-tools/releases/tag/2026.2.2), [goreleaser releases](https://github.com/goreleaser/goreleaser/releases) |
| GO-MOD-16 (rationale) | "stdlib CVEs are fixed only in point releases. `check-latest` cannot move an exact patch (setup-go v6, read 2026-09-26)." | "stdlib and go-command CVEs are fixed only in point releases (go1.27.4 fixed cgo build-time code execution). `check-latest` cannot move an exact patch (setup-go v7.1.0 docs, read 2026-11-27)." | [setup-go releases](https://github.com/actions/setup-go/releases), setup-go docs/advanced-usage.md, [go.dev/doc/devel/release](https://go.dev/doc/devel/release), [golang/go#82567](https://github.com/golang/go/issues/82567) |
| GO-MOD-17 (rationale) | "Configs that cover only `github-actions` leave every module bump unreviewed and unopened." | The same sentence, followed by: "Dependabot's gomod docs say nothing about the `toolchain` line, so GO-MOD-02's bump stays a manual step." | [Dependabot options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference), [supported ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories) |
| Severity defaults (no ID) | "golangci-lint v2.14.0 moved only through `go-upgrade`" | "golangci-lint v2.15.0 moved only through `go-upgrade`" | [v2.15.0 release](https://github.com/golangci/golangci-lint/releases/tag/v2.15.0) |
| GO-GATE-08 | "such as `version: v2.14.0` … Bump it only through the `go-upgrade` skill." Verification: "see block GO-GATE-08: any output is the finding." | "such as `version: v2.15.0` … Bump it only through the `go-upgrade` skill. On a Go 1.27.2 or later toolchain the pin is v2.15.0 or later." The rationale adds the staticcheck export-data sentence. The verification adds: "`golangci-lint version` below v2.15.0 on a go1.27.2 or later toolchain is the finding." | [staticcheck 2026.2.2](https://github.com/dominikh/go-tools/releases/tag/2026.2.2), [golang/go#82105](https://github.com/golang/go/issues/82105), [golangci-lint v2.15.0 go.mod](https://github.com/golangci/golangci-lint/blob/v2.15.0/go.mod) |
| gates.md header, floors and gaps (no ID) | v2.14.0 pin, go1.27.1, staticcheck 0.8.1, "Snapshots of golangci-lint v2.14.0" | The v2.15.0 pin, with the v2.14.0 measurement kept as provenance. The gap line says the snapshots have not been re-probed on v2.15.0 (errcheck moved from 1.20.0 to 1.30.0, gosec stayed at v2.29.0). | [compare v2.14.0...v2.15.0](https://github.com/golangci/golangci-lint/compare/v2.14.0...v2.15.0), [errcheck releases](https://github.com/kisielk/errcheck/releases) |
| GO-GATE-14 (rationale) | "G115 ignores prior bounds checks (securego/gosec#1187)." | "G115 flagged conversions that a prior bounds check guards (securego/gosec#1187, closed by securego/gosec#1189 in 2024-08 and not re-probed since), so it stays excluded until the emptied-excludes run shows it clean." | [securego/gosec#1187](https://github.com/securego/gosec/issues/1187), [securego/gosec#1189](https://github.com/securego/gosec/pull/1189) |
| GO-GATE-14 (YAML comment, three files) | "`- G115 # ignores prior bounds checks (securego/gosec#1187); re-review this list on every golangci-lint bump`" | "`- G115 # bounds-check false positives (securego/gosec#1187, closed by #1189 in 2024); kept until the emptied-excludes probe shows G115 clean; re-review this list on every golangci-lint bump`" | same |
| GO-MOD-08 (`desc` text of the two yaml entries, three files) | `"go-yaml archived 2025-04-01; use go.yaml.in/yaml/v3"` | `"go-yaml archived 2025-04-01; new code uses go.yaml.in/yaml/v4, a drop-in swap uses go.yaml.in/yaml/v3 (frozen)"` | [go-yaml v4.0.0](https://github.com/yaml/go-yaml/releases/tag/v4.0.0), [go-yaml README](https://github.com/yaml/go-yaml) |
| release.md header and floors (no ID) | "Binds to Go 1.27.1, goreleaser 2.17.1, cosign 3.1.3, govulncheck v1.8.0 and syft (measured 2026-09-26)." and "**go 1.25 through 1.27.1:** … open and unfixed on 2026-09-26." | "Binds to Go 1.27.4, goreleaser 2.20.3, cosign 3.1.6, govulncheck v1.8.0 and syft 1.57.2 (measured 2026-09-26 on Go 1.27.1, goreleaser 2.17.1 and cosign 3.1.3; goreleaser and cosign re-measured 2026-11-27)." and "**go 1.25 and later (measured through 1.27.1):** … open with no fix CL on 2026-11-27, so no point release carries a fix." | goreleaser and cosign binaries run 2026-11-27, [golang/go#74763](https://github.com/golang/go/issues/74763), [syft releases](https://github.com/anchore/syft/releases) |
| Snapshot paragraph (no ID) | "`dist/<id>_<os>_<arch>_v1/<bin>`" | "`dist/<id>_<os>_<arch>_<variant>/<bin>` (`_v1` for amd64, `_v8.0` for arm64)" | goreleaser 2.17.1 and 2.20.3 snapshot, measured 2026-11-27 |
| GO-REL-07 (rationale) | "goreleaser 2.17.1 `check` prints "yours is version: 0" and still exits 0 (measured 2026-09-26). It fails only on YAML syntax errors." | "goreleaser 2.17.1 and 2.20.3 `check` print "yours is version: 0" and still exit 0 (measured 2026-09-26 and 2026-11-27). It fails on YAML syntax errors, and in a clone with no git remote 2.20.3 exits 1 on every config, `version: 2` included, so a local exit 1 proves nothing either." | goreleaser 2.20.3 run 2026-11-27 |
| GO-REL-09 (verification) | "`grep -c -e '\.spdx\.sbom\.json$' dist/checksums.txt` prints `6` on the pass" | "`grep -c -e '\.sbom\.json$' dist/checksums.txt` prints `6` on the pass" | goreleaser 2.17.1 and 2.20.3 snapshot, measured 2026-11-27; [goreleaser SBOM docs](https://goreleaser.com/customization/sbom/) |
| GO-REL-10 | "build it with `ko build` (distroless static base, SPDX SBOM attached as an OCI referrer), not with goreleaser `dockers:`." Rationale: "`dockers:` needs a Docker daemon and gets no SBOM." | "build it with `ko build` (default base `cgr.dev/chainguard/static`, SPDX SBOM pushed under the image's `sha256-<digest>.sbom` tag and read back with `cosign download sbom`), not with goreleaser `dockers:` or `dockers_v2:`." Rationale: "`dockers:` needs a Docker daemon and gets no SBOM, and `dockers_v2:` needs a Dockerfile and a buildx builder." | [ko configuration](https://ko.build/configuration/), [ko SBOMs](https://ko.build/features/sboms/), [ko default.go](https://github.com/ko-build/ko/blob/main/pkg/publish/default.go), [dockers_v2](https://goreleaser.com/customization/dockers_v2/) |
| GO-REL-11 | "runs `actions/attest-build-provenance` … A `subject-path: dist/<tool>-*` matches only the SBOMs, because goreleaser 2.17.1 … (measured 2026-09-26)." and "Never use `--output-signature` or `--output-certificate`." | "runs `actions/attest` … (`actions/attest-build-provenance` v4 only wraps it, and an existing workflow may keep the wrapper). A `subject-path: dist/<tool>-*` matches no binary, only any SBOM named `<tool>-…`, because goreleaser 2.17.1 and 2.20.3 … (measured 2026-09-26 and 2026-11-27)." and "Never use `--output-signature`, `--output-certificate` or `--tlog-upload`." The rationale gains the measured cosign sentence, and command 2 gains `-e '--tlog-upload'`. | [attest-build-provenance README](https://github.com/actions/attest-build-provenance), [actions/attest](https://github.com/actions/attest), [cosign releases](https://github.com/sigstore/cosign/releases), cosign 3.1.3 and 3.1.6 run 2026-11-27 |
| GO-REL-12 (rationale) | "GitHub calls a full SHA the only immutable way to use an action." | "GitHub's secure-use guide says to pin each action to a full-length commit SHA." | [GitHub secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) |

Every changed row keeps its existing verification, except GO-GATE-08, GO-REL-09 and GO-REL-11, whose verifications change as listed. GO-GATE-08's added clause runs as `golangci-lint version`. GO-REL-09's grep was watched printing 6 on a six-target snapshot (2026-11-27). GO-REL-11's command 2 is a grep where any hit is the finding.

## New rules

None. The candidates that were considered and declined:

| Candidate | Why declined |
|---|---|
| goreleaser floor of 2.20.3 plus a ban on uploading `dist/` (GHSA-9422-8p9m-393x, GHSA-qx28-5g8c-9fw6) | Both advisories hit publishers (inline SSH keys, Homebrew, AUR) that the pinned GO-REL-08 shape never uses. The 2.20.3 header binding is enough. |
| Patch floor and rebuild trigger for release builds (go1.27.4) | GO-MOD-02 and GO-MOD-16 already require the latest patch. The rebuild trigger is a go-release procedure step (spillover). |
| depguard v2.3.0 prefix-match re-check | golangci-lint v2.15.0 still bundles depguard v2.2.1, so the change is not in the gate. It belongs on the go-upgrade checklist (spillover). |
| `golang.org/x/crypto/openpgp` deny entry | There is no successor an agent can be pointed to, and govulncheck already reports GO-2026-5932 on any import (GO-MOD-12). |
| Workflow lockfile as an alternative to GO-REL-12's SHA pin | This needs an owner decision, and the stale-check command is unknown. See open questions. |
| gh 2.102.0 or later for `gh attestation verify --signer-workflow` and `--source-ref` | The rule never calls those flags. |

## Confirmed unchanged

- GO-MOD-01 floors hold. Go 1.26 still gets point releases (go1.26.11 on 2026-11-10), so `go 1.26.0` for libraries and `go 1.27.0` for CLIs stand. Go 1.28 is scheduled for February 2027 and is not shipped.
- GO-MOD-04: the go1.27 notes still say the go command fails on a removed GODEBUG setting at an old value and accepts the final value. The 1.28 draft removes no setting.
- GO-MOD-05 and GO-MOD-11: neither the go1.27 notes nor the go1.28 draft change go.work or the `tool` directive. No new go.mod directive and no proxy or sumdb behaviour change shipped in the window.
- GO-MOD-08: depguard v2.2.1 is bundled in both golangci-lint versions, so the schema (`deny`, `files: ["$all"]`, `desc`) is unchanged. go.uber.org/mock, sigs.k8s.io/yaml and google/uuid are unchanged as successors. No x/exp package was promoted to the stdlib.
- GO-MOD-09: the stdlib `uuid` still lacks NewV6, NewSHA1 and NewMD5.
- GO-MOD-12 and GO-MOD-13: govulncheck v1.9.0 and v1.10.0 change go.mod and go.sum only. Text format still exits 3, JSON, SARIF and OpenVEX still exit 0, and `Example traces found:` is still printed. The over-reporting on stripped binaries is now documented upstream in the command's Limitations section, and its behaviour is unchanged.
- GO-MOD-18: `GOPRIVATE` still sets the defaults for `GONOPROXY` and `GONOSUMDB`.
- GO-GATE-01 step 10: yield is still only in gopls (v0.24.0 is current). It is not in the vet suite at x/tools v0.53.0 and not in golangci-lint v2.15.0's govet, and the message text is unchanged. The removal trigger has not fired.
- GO-GATE-03: `modernize` is still in the golangci-lint roster, so the ban keeps its target.
- GO-GATE-11: SA5011 is still disabled in staticcheck 2026.2.2, and `nilness/cmd/nilness@v0.49.0` still resolves.
- GO-GATE-16: every banned linter name still exists in v2.15.0, so the grep needs no change.
- GO-GATE-09, -15, -18, -22 and -23: no key, preset or linter name that the three files use was removed or renamed in v2.15.0. The `exhaustive` option renames do not touch `default-signifies-exhaustive`.
- GO-REL-07: `goreleaser check` 2.20.3 still prints "yours is version: 0" and exits 0 (measured).
- GO-REL-08: the six `mytool-<os>-<arch>` names and goreleaser's default name template are identical on 2.17.1 and 2.20.3 (measured).
- GO-REL-09: goreleaser's docs still exclude images from SBOM cataloguing. The output is still SPDX 2.3.
- GO-REL-11: the goreleaser `signs:` args (`sign-blob`, `--bundle=${signature}`, `${artifact}.sigstore.json`, `artifacts: checksum`) are unchanged. The three-permission block is still sufficient. Attestations alone still reach SLSA Build L2, not L3.
- GO-REL-12's `pin-check` grep stays correct for SHA-pinned repositories.
- golang/go#74763 is still open with no fix CL.
- GO-GATE-08 through golangci-lint-action: there is no action release after v9.3.0, so the `version:` input is unchanged.

## Open questions

1. **Workflow lockfiles and GO-REL-12.** GitHub's secure-use page says a committed `.github/workflows/actions.lock` "supersedes SHA pinning for repositories that adopt it" (GA 2026-10-28). The owner should decide whether a lockfile-onboarded repository may keep tag refs, which `pin-check` would then need to accept. The stale-lockfile check command was not found. This decision applies to every language pair's pinning rule.
2. **Runtime probes on v2.15.0 were not executed.** Five things still need a run: `config verify` exit 3 on a v1 file, `0 issues.` with exit 7, the GO-GATE-21 `--fix` allowlist, GO-GATE-20's `os.Open` close matching under errcheck 1.30.0, and whether G115 still produces bounds-check false positives on gosec v2.29.0. predeclared also changed: it was rewritten and now defaults to mode `shadow`, so its findings will differ.
3. **Go 1.28 (February 2027).** When it ships, 1.26 leaves support, and GO-MOD-01 moves libraries to `go 1.27.0` and CLIs to `go 1.28.0`. Three more items wait on it: `gotestjsonbuildtext` is due for removal "in Go 1.28 at the earliest", the vet analyzers `scannererr` and `sqlrowserr` may change GO-GATE-02's "12 of 35" count, and the floors and counts need a re-check.
4. **Not re-measured on go1.27.4.** The `go mod init` default (GO-MOD-01's rationale) and git-worktree stamping (release.md, "go 1.27.1 only").
5. **golang/go#74763's description.** The toolchain artifact's page summary calls #74763 a "multiple VCS detected" report with `-buildvcs=false` as the workaround. The baseline describes it as the nested-module `(devel)` defect, and release.md's failure mode 14 says multiple-VCS cannot fire on git-only layouts. Re-read the issue body before the next GO-REL-14 edit. Only the issue's state was used here.
6. **GO-MOD-18's `GOAUTH=off` clause** was not re-verified, because the go.dev/ref/mod entry was past the fetch limit.
7. **Stdlib `uuid` on master** also lists `Max`, `Nil` and the text-marshaling methods. If go1.27 ships them, GO-MOD-09's swap list could widen. Not confirmed against the 1.27 release docs.
8. **cosign 3.1.6** now requires the `https://sigstore.dev/cosign/sign/v1` predicate type in `cosign verify`. Whether this affects GO-REL-11's documented `cosign verify-blob --bundle` end-to-end proof is not shown.
9. **"Protecting against CVE-2026-98432"** (golang-announce, 2026-10-30): the body could not be read.

## Revision log

1. Rule header: bind line moved to Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2 and goreleaser 2.20.3, with 2026-09-26 provenance kept.
2. GO-MOD-16: setup-go evidence moved to v7.1.0 docs read 2026-11-27, and go-command CVEs named.
3. GO-MOD-17: rationale says Dependabot documents no `toolchain`-line handling.
4. Severity defaults: golangci-lint pin moved to v2.15.0.
5. gates.md header: bind line moved to the 2026-11-27 versions, with measurement provenance.
6. gates.md floors: golangci-lint v2.15.0 and staticcheck 0.8.2, with v2.14.0 kept as the measured build.
7. gates.md pinned defaults: v2.15.0.
8. GO-GATE-08: pin example v2.15.0, toolchain floor clause, staticcheck export-data rationale, version check.
9. GO-GATE-14: G115 rationale cites #1187 as closed by #1189.
10. gates.md documented gaps: snapshots marked as not re-probed on v2.15.0.
11. Three YAML files: G115 comment corrected.
12. Three YAML files: yaml.v2 and yaml.v3 `desc` names go.yaml.in/yaml/v4 for new code.
13. release.md header: goreleaser 2.20.3, cosign 3.1.6, syft 1.57.2, Go 1.27.4, with provenance.
14. release.md floors: #74763 open with no fix CL on 2026-11-27.
15. release.md snapshot paragraph: `_<variant>` build directory.
16. GO-REL-07: 2.20.3 measurement and the no-remote exit-1 caveat.
17. GO-REL-09: grep `\.sbom\.json$`.
18. GO-REL-10: Chainguard static base, `.sbom` tag, `dockers_v2:` named.
19. GO-REL-11: `actions/attest`, "matches no binary", 2.20.3 measurement, `--tlog-upload` banned with measured rationale and grep.
20. GO-REL-12: rationale quotes GitHub's current guidance.
21. Spillover round: GO-MOD-16 rationale names the go1.27.3 eMudhra intermediate denylist (GO-2026-6809), which reaches a shipped binary only on rebuild, judged by `go version -m`.

## Edit list

Apply in order. Each "find" string is verbatim and unique in its file. Paths are relative to the repository root.

1. `rules/go-modules.md`
   Find:
   ```
   the `go-quality` index routes those. Binds to Go 1.27.1,
   golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and goreleaser
   2.17.1 (measured 2026-09-26). "The SDK" is a stdlib-only library that wraps the
   ```
   Replace:
   ```
   the `go-quality` index routes those. Binds to Go 1.27.4,
   golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.8.0 and goreleaser
   2.20.3 (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1,
   golangci-lint v2.14.0 and goreleaser 2.17.1). "The SDK" is a stdlib-only library that wraps the
   ```

2. `rules/go-modules.md`
   Find:
   ```
   and stdlib CVEs are fixed only in point releases. `check-latest` cannot move an exact patch (setup-go v6, read 2026-09-26).
   ```
   Replace:
   ```
   and stdlib and go-command CVEs are fixed only in point releases (go1.27.4 fixed cgo build-time code execution). `check-latest` cannot move an exact patch (setup-go v7.1.0 docs, read 2026-11-27).
   ```

3. `rules/go-modules.md`
   Find:
   ```
   Configs that cover only `github-actions` leave every module bump unreviewed and unopened.
   ```
   Replace:
   ```
   Configs that cover only `github-actions` leave every module bump unreviewed and unopened. Dependabot's gomod docs say nothing about the `toolchain` line, so GO-MOD-02's bump stays a manual step.
   ```

4. `rules/go-modules.md`
   Find:
   ```
   v2.14.0 moved only through `go-upgrade`, the three shipped golangci-lint files,
   ```
   Replace:
   ```
   v2.15.0 moved only through `go-upgrade`, the three shipped golangci-lint files,
   ```

5. `skills/go-modules-reference/gates.md`
   Find:
   ```
   Binds to Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0, measured 2026-09-26.
   ```
   Replace:
   ```
   Binds to Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.8.0 and gopls v0.23.0, re-checked 2026-11-27. Behaviour was measured 2026-09-26 on Go 1.27.1, golangci-lint v2.14.0 and staticcheck 2026.2.1.
   ```

6. `skills/go-modules-reference/gates.md`
   Find:
   ```
   - **golangci-lint v2.14.0**, built with go1.27.1 (bundled staticcheck 0.8.1). The v2 schema is required, and a v1 file exits 3 on `config verify`.
   ```
   Replace:
   ```
   - **golangci-lint v2.15.0** (2026-10-16, bundled staticcheck 0.8.2, which is 2026.2.2 and the first to support the export data format Go 1.27.2 changed). The v2 schema is required, and a v1 file exits 3 on `config verify`. Measured on v2.14.0 (built with go1.27.1, bundled staticcheck 0.8.1). v2.15.0's source diff removes or renames no key or linter name the three files use.
   ```

7. `skills/go-modules-reference/gates.md`
   Find:
   ```
   golangci-lint stays at v2.14.0 and moves only through the `go-upgrade` skill.
   ```
   Replace:
   ```
   golangci-lint stays at v2.15.0 and moves only through the `go-upgrade` skill.
   ```

8. `skills/go-modules-reference/gates.md`
   Find:
   ```
   such as `version: v2.14.0` in `golangci-lint-action` or a versioned install. Never `latest` or `@latest`. Bump it only through the `go-upgrade` skill. | Linter rosters grow inside point releases, and a real gate went red on a new gosec rule with no config change. An unpinned gate changes verdicts without a commit. | see block GO-GATE-08: any output is the finding. |
   ```
   Replace:
   ```
   such as `version: v2.15.0` in `golangci-lint-action` or a versioned install. Never `latest` or `@latest`. Bump it only through the `go-upgrade` skill. On a Go 1.27.2 or later toolchain the pin is v2.15.0 or later. | Linter rosters grow inside point releases, and a real gate went red on a new gosec rule with no config change. An unpinned gate changes verdicts without a commit. v2.15.0 bundles staticcheck 2026.2.2, the first release that supports the export data format Go 1.27.2 changed, and v2.14.0 bundles 2026.2.1, which predates it. | see block GO-GATE-08: any output is the finding. `golangci-lint version` below v2.15.0 on a go1.27.2 or later toolchain is the finding. |
   ```

9. `skills/go-modules-reference/gates.md`
   Find:
   ```
   G115 ignores prior bounds checks (securego/gosec#1187).
   ```
   Replace:
   ```
   G115 flagged conversions that a prior bounds check guards (securego/gosec#1187, closed by securego/gosec#1189 in 2024-08 and not re-probed since), so it stays excluded until the emptied-excludes run shows it clean.
   ```

10. `skills/go-modules-reference/gates.md`
    Find:
    ```
    - **Snapshots of golangci-lint v2.14.0:** the `--fix` allowlist, errcheck's matching and the gosec roster.
    ```
    Replace:
    ```
    - **Snapshots of golangci-lint v2.14.0, not yet re-probed on v2.15.0:** the `--fix` allowlist, errcheck's matching (errcheck moved from 1.20.0 to 1.30.0) and the gosec roster (bundled gosec v2.29.0 in both).
    ```

11. `skills/go-modules-reference/golangci/baseline.golangci.yml`
    Find:
    ```
            - G115 # ignores prior bounds checks (securego/gosec#1187); re-review this list on every golangci-lint bump
    ```
    Replace:
    ```
            - G115 # bounds-check false positives (securego/gosec#1187, closed by #1189 in 2024); kept until the emptied-excludes probe shows G115 clean; re-review this list on every golangci-lint bump
    ```

12. `skills/go-modules-reference/golangci/cli.golangci.yml`
    Same find and replace as entry 11 (the line is byte-identical, eight leading spaces).

13. `skills/go-modules-reference/golangci/lib-sdk.golangci.yml`
    Same find and replace as entry 11 (the line is byte-identical, eight leading spaces).

14. `skills/go-modules-reference/golangci/baseline.golangci.yml`
    Find (twelve and fourteen leading spaces):
    ```
                - pkg: gopkg.in/yaml.v2
                  desc: "go-yaml archived 2025-04-01; use go.yaml.in/yaml/v3"
                - pkg: gopkg.in/yaml.v3
                  desc: "go-yaml archived 2025-04-01; use go.yaml.in/yaml/v3"
    ```
    Replace:
    ```
                - pkg: gopkg.in/yaml.v2
                  desc: "go-yaml archived 2025-04-01; new code uses go.yaml.in/yaml/v4, a drop-in swap uses go.yaml.in/yaml/v3 (frozen)"
                - pkg: gopkg.in/yaml.v3
                  desc: "go-yaml archived 2025-04-01; new code uses go.yaml.in/yaml/v4, a drop-in swap uses go.yaml.in/yaml/v3 (frozen)"
    ```

15. `skills/go-modules-reference/golangci/cli.golangci.yml`
    Same find and replace as entry 14 (byte-identical block).

16. `skills/go-modules-reference/golangci/lib-sdk.golangci.yml`
    Same find and replace as entry 14 (byte-identical block).

17. `skills/go-modules-reference/release.md`
    Find:
    ```
    Binds to Go 1.27.1, goreleaser 2.17.1, cosign 3.1.3, govulncheck v1.8.0 and syft
    (measured 2026-09-26).
    ```
    Replace:
    ```
    Binds to Go 1.27.4, goreleaser 2.20.3, cosign 3.1.6, govulncheck v1.8.0 and syft
    1.57.2 (measured 2026-09-26 on Go 1.27.1, goreleaser 2.17.1 and cosign 3.1.3;
    goreleaser and cosign re-measured 2026-11-27).
    ```

18. `skills/go-modules-reference/release.md`
    Find:
    ```
    - **go 1.25 through 1.27.1:** [golang/go#74763](https://github.com/golang/go/issues/74763),
      open and unfixed on 2026-09-26.
    ```
    Replace:
    ```
    - **go 1.25 and later (measured through 1.27.1):** [golang/go#74763](https://github.com/golang/go/issues/74763),
      open with no fix CL on 2026-11-27, so no point release carries a fix.
    ```

19. `skills/go-modules-reference/release.md`
    Find:
    ```
    `dist/<id>_<os>_<arch>_v1/<bin>`, so `find dist -name` reports a correct asset as missing.
    ```
    Replace:
    ```
    `dist/<id>_<os>_<arch>_<variant>/<bin>` (`_v1` for amd64, `_v8.0` for arm64), so `find dist -name` reports a correct asset as missing.
    ```

20. `skills/go-modules-reference/release.md`
    Find:
    ```
    goreleaser 2.17.1 `check` prints "yours is version: 0" and still exits 0 (measured 2026-09-26). It fails only on YAML syntax errors.
    ```
    Replace:
    ```
    goreleaser 2.17.1 and 2.20.3 `check` print "yours is version: 0" and still exit 0 (measured 2026-09-26 and 2026-11-27). It fails on YAML syntax errors, and in a clone with no git remote 2.20.3 exits 1 on every config, `version: 2` included, so a local exit 1 proves nothing either.
    ```

21. `skills/go-modules-reference/release.md`
    Find:
    ```
    `grep -c -e '\.spdx\.sbom\.json$' dist/checksums.txt` prints `6` on the pass, one per platform.
    ```
    Replace:
    ```
    `grep -c -e '\.sbom\.json$' dist/checksums.txt` prints `6` on the pass, one per platform (the default document name ends `.sbom.json`, measured 2026-11-27).
    ```

22. `skills/go-modules-reference/release.md`
    Find:
    ```
    build it with `ko build` (distroless static base, SPDX SBOM attached as an OCI referrer), not with goreleaser `dockers:`. | `dockers:` needs a Docker daemon and gets no SBOM.
    ```
    Replace:
    ```
    build it with `ko build` (default base `cgr.dev/chainguard/static`, SPDX SBOM pushed under the image's `sha256-<digest>.sbom` tag and read back with `cosign download sbom`), not with goreleaser `dockers:` or `dockers_v2:`. | `dockers:` needs a Docker daemon and gets no SBOM, and `dockers_v2:` needs a Dockerfile and a buildx builder.
    ```

23. `skills/go-modules-reference/release.md`
    Find:
    ```
    runs `actions/attest-build-provenance` with `subject-checksums: dist/checksums.txt`. A `subject-path: dist/<tool>-*` matches only the SBOMs, because goreleaser 2.17.1 with `formats: [binary]` keeps each binary under `dist/<id>_<os>_<arch>_<variant>/` (measured 2026-09-26).
    ```
    Replace:
    ```
    runs `actions/attest` with `subject-checksums: dist/checksums.txt` (`actions/attest-build-provenance` v4 only wraps it, and an existing workflow may keep the wrapper). A `subject-path: dist/<tool>-*` matches no binary, only any SBOM named `<tool>-…`, because goreleaser 2.17.1 and 2.20.3 with `formats: [binary]` keep each binary under `dist/<id>_<os>_<arch>_<variant>/` (measured 2026-09-26 and 2026-11-27).
    ```

24. `skills/go-modules-reference/release.md`
    Find:
    ```
    Never use `--output-signature` or `--output-certificate`. |
    ```
    Replace:
    ```
    Never use `--output-signature`, `--output-certificate` or `--tlog-upload`. |
    ```

25. `skills/go-modules-reference/release.md`
    Find:
    ```
    This reaches SLSA Build L2, not L3. |
    ```
    Replace:
    ```
    This reaches SLSA Build L2, not L3. cosign 3.1.3 and 3.1.6 accept `--output-signature` and `--tlog-upload=false` with a deprecation notice and then fail, the first without `--bundle` and the second under the default signing config (measured 2026-11-27). |
    ```

26. `skills/go-modules-reference/release.md`
    Find:
    ```
      | xargs -0 -r grep -H -n -e '--output-signature' -e '--output-certificate' -e 'COSIGN_PRIVATE_KEY' --
    ```
    Replace:
    ```
      | xargs -0 -r grep -H -n -e '--output-signature' -e '--output-certificate' -e '--tlog-upload' -e 'COSIGN_PRIVATE_KEY' --
    ```

27. `skills/go-modules-reference/release.md`
    Find:
    ```
    Tags are mutable, and GitHub calls a full SHA the only immutable way to use an action.
    ```
    Replace:
    ```
    Tags are mutable, and GitHub's secure-use guide says to pin each action to a full-length commit SHA.
    ```

After applying: `rules/go-modules.md` grows from 197 to 198 lines (under 200). gates.md and release.md add no lines beyond entry 17's one, and both keep their contents lines. Run `grep -rn -e '/home/mherwig' -e '.agents/research' rules/go-modules.md skills/go-modules-reference/` and expect no output. Then run `grep -rn -e 'setup-go v6' -e 'spdx\.sbom' -e 'OCI referrer' -e 'only immutable' rules/go-modules.md skills/go-modules-reference/` and expect no output.

## Spillover round

Input: the go-modules spillover check from go-quality, 2026-11-27 (2 confirmed, 0 unconfirmed, 1 already correct).

### Verdict

- Item 2 changes the target. GO-MOD-16's rationale names the go1.27.3 eMudhra intermediate denylist (GO-2026-6809). The Go blog says only a binary rebuilt on go1.27.3 or go1.26.10 rejects the compromised intermediates, and it tells readers to check the build toolchain with `go version -m`. The rule already requires the latest patch for release builds, so no rule ID, severity or check changes. The rationale gains the fact that makes the patch requirement matter for binaries that have already shipped. The text does not scope the fix to `crypto/tls` and `net/http` users. That scoping is go-quality's reading, and the primary sources say any rebuilt binary.
- Item 1 changes nothing. The Go, golangci-lint and staticcheck pins are already current in the rule, gates.md and release.md. govulncheck v1.8.0 and gopls v0.23.0 stay, as the first round decided: v1.9.0 and v1.10.0 change dependencies only, and those pins move only together with a re-measure.
- The rebuild procedure itself (when to cut a re-release) stays in the go-release skill, as the first round's New rules table says. This round adds a rationale fact, not a new rule.
- Bump: rule `patch` (one corrected rationale fact). Reference skill: no change.

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| GO-MOD-16 (rationale) | "stdlib and go-command CVEs are fixed only in point releases (go1.27.4 fixed cgo build-time code execution)." | "stdlib and go-command CVEs are fixed only in point releases (go1.27.4 fixed cgo build-time code execution; go1.27.3 added the eMudhra intermediate denylist, GO-2026-6809, which reaches a shipped binary only on rebuild, so judge a binary by `go version -m`, never by the host `go version`)." | [Go blog, eMudhra incident (2026-10-26)](https://go.dev/blog/emudhra-incident), [GO-2026-6809](https://pkg.go.dev/vuln/GO-2026-6809), [go.dev/doc/devel/release](https://go.dev/doc/devel/release) |

GO-MOD-16 keeps its verification (the GO-MOD-16 grep block, read for the three forbidden shapes). The added clause is checked on an artifact with `go version -m <binary>`: a `go1.27.0` to `go1.27.2` line (or below `go1.26.10` on 1.26) is the finding.

### New rules

None.

### Declined

| Item | Reason |
|---|---|
| Item 1: move govulncheck to v1.10.0 and gopls to v0.24.0 | Confirmed by primary source (pkg.go.dev version tabs), but the target is already true as written. The first round kept these pins on purpose until the govulncheck and gopls probes are re-run, and those runs have not happened. |
| Item 1: re-count "28 security fixes missing in 1.27.1" in the target | The target states no count. GO-MOD-02 and GO-MOD-16 already require the latest patch, and a count would go stale on the next point release. |
| Item 2: scope the rebuild to `crypto/tls` and `net/http` binaries | Secondary only. The Go blog speaks of any rebuilt binary, and the package scoping is go-quality's inference. |

### Edit list (spillover round)

Apply in order. Each "find" string is verbatim and unique in its file. Paths are relative to the repository root.

1. `rules/go-modules.md`
   Find:
   ```
   (go1.27.4 fixed cgo build-time code execution). `check-latest` cannot move an exact patch
   ```
   Replace:
   ```
   (go1.27.4 fixed cgo build-time code execution; go1.27.3 added the eMudhra intermediate denylist, GO-2026-6809, which reaches a shipped binary only on rebuild, so judge a binary by `go version -m`, never by the host `go version`). `check-latest` cannot move an exact patch
   ```

After applying: `rules/go-modules.md` stays at 198 lines, because the edit is inside one table cell. Run `grep -c -e 'GO-2026-6809' rules/go-modules.md` and expect `1`. Run `grep -rn -e '/home/mherwig' -e '.agents/research' rules/go-modules.md skills/go-modules-reference/` and expect no output.

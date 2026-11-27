---
title: go-modules delta, module, supply-chain and release ecosystem shifts (2026-09-26 to 2026-11-27)
pair: go-modules
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 34
---

# Delta: Go module, supply-chain and release ecosystem (2026-09-26 to 2026-11-27)

Scope: what rules/go-modules.md and skills/go-modules-reference/ do not mention at all, but that would need a new GO-MOD, GO-GATE or GO-REL rule or a deny-list entry. Source-level rules owned by go-quality are excluded. This is a delta against the baseline measured 2026-09-26, not a re-creation.

## Contents

1. Summary
2. Findings (claims at risk, each marked unchanged, changed or could not determine)
3. Ranked candidate additions
4. Considered and rejected
5. Coverage limits
6. Sources

## 1. Summary

- No new go.mod or go.work directive, and no module proxy or checksum database behaviour change, was accepted or shipped in the window. Go 1.28 draft notes (expected February 2027) list nothing under go.mod, go.work or modules.
- Every pinned version in the baseline snapshot is stale. Go 1.27.1 is now 1.27.4 (2026-11-10), golangci-lint v2.14.0 is v2.15.0 (2026-10-16), staticcheck 2026.2.1 is 2026.2.2 (2026-10-12), govulncheck v1.8.0 is v1.10.0, goreleaser 2.17.1 is 2.20.3 (2026-11-20).
- The strongest new finding is gate-side: staticcheck 2026.2.1, which golangci-lint v2.14.0 bundles, does not support the export data format of Go 1.27.2 and later, and crashes on generic methods. golangci-lint v2.15.0 bundles the fixed staticcheck.
- Two goreleaser security advisories landed in the window (the SSH key leak into dist/artifacts.json fixed in 2.20.0, and unescaped snapshot version in generated Homebrew and AUR files fixed in 2.20.3). The baseline pins 2.17.1, which is affected by both.
- Go 1.27.2 fixed a toolchain checksum bypass by a malicious GOMODPROXY (CVE-2026-94447), and 1.27.4 fixed ten cgo and go command code-execution issues. These strengthen GO-MOD-16 and GO-MOD-13 but need no new rule.
- go.yaml.in/yaml/v4 became stable on 2026-11-04, and the project says v2 and v3 are frozen with security fixes only. This changes the successor named in the GO-MOD-08 `desc` for the yaml entries.
- depguard v2.3.0 was tagged around 2026-10-27 with a new prefix-matching tree and stricter config validation. golangci-lint v2.15.0 still bundles depguard v2.2.1, so the change has not reached the gate yet.
- GitHub shipped workflow lockfiles (GA 2026-10-28), an alternative to the 40-hex SHA pin that GO-REL-12 mandates. pull_request_target is blocked by default in public repositories from 2026-12-02.
- The successors GO-MOD-08 names (go.uber.org/mock, sigs.k8s.io/yaml, github.com/google/uuid) show no relevant change. No further golang.org/x/exp package was promoted to the standard library in the window.
- No new governing linter in golangci-lint v2.15.0 (the release notes list no new linters). No govulncheck integration into the go command and no new Go release attestation format was found.

## 2. Findings

### 2.1 Version pins in the baseline

| Claim at risk | Status | Evidence |
|---|---|---|
| "Binds to Go 1.27.1" (rule header, measured 2026-09-26) | changed | Old: 1.27.1 (2026-09-01). New: 1.27.2 (2026-10-08, security in go command, crypto/tls, html/template, net/http, os), 1.27.3 (2026-10-19, crypto/x509), 1.27.4 (2026-11-10, security in cgo, go command, compiler, linker, net/http). 1.26 line is at 1.26.11. [release history](https://go.dev/doc/devel/release) |
| "golangci-lint v2.14.0", pinned default moved only through go-upgrade (rule, gates.md, GO-GATE-08 example) | changed | v2.15.0 released 2026-10-16. Bundled staticcheck moves from honnef.co/go/tools v0.8.1 to v0.8.2 (read from go.mod at each tag). Notes list no new linter. [releases](https://github.com/golangci/golangci-lint/releases), [changelog](https://golangci-lint.run/docs/product/changelog/) |
| "staticcheck 2026.2.1" | changed | 2026.2.2 released 2026-10-12: "Staticcheck now supports the updated export data format used by Go 1.27.2", plus SA4023 and SA1019 crash fixes. [release](https://github.com/dominikh/go-tools/releases/tag/2026.2.2) |
| "govulncheck v1.8.0" | changed (version only) | Tags v1.9.0 (commit 2026-10-11) and v1.10.0 (commit 2026-11-17); the commits between v1.8.0 and v1.10.0 are two "update golang.org/x dependencies" bumps. No behaviour change found. [golang/vuln compare](https://github.com/golang/vuln/compare/v1.8.0...v1.10.0) |
| "goreleaser 2.17.1" | changed | 2.18.0 (2026-08-24, before the window), 2.19.0 (2026-10-22), 2.20.0 (2026-11-04), 2.20.3 (2026-11-20). See candidate C3. [releases](https://github.com/goreleaser/goreleaser/releases) |
| "setup-go v6, read 2026-09-26" (GO-MOD-16) | changed | v7.0.0 was released 2026-07-16 (before the baseline date, so the baseline was already stale): ESM migration, runs on node24. v7.1.0 (2026-11-17) adds Go-native version syntax in go-version (`go1.21.5`, `go1.21rc2`), rc and beta versions in go.mod, and Go environment variables as outputs. Whether `check-latest` still cannot move an exact patch in v7: could not determine (release bodies only, README not read). [setup-go releases](https://github.com/actions/setup-go/releases) |
| cosign in GO-REL-11 | could not determine | cosign v3.1.4 to v3.1.6 (2026-10-20 to 2026-11-25) exist. v3.1.6 makes `cosign verify` require the predicate type `https://sigstore.dev/cosign/sign/v1`. Not shown whether `cosign verify-blob --bundle` (the documented end-to-end check) is affected. Re-probe through go-release. [cosign releases](https://github.com/sigstore/cosign/releases) |

### 2.2 go.mod, go.work, proxy and checksum database

| Claim at risk | Status | Evidence |
|---|---|---|
| GO-MOD-04 godebug removal behaviour from 1.27 | unchanged | The 1.27 notes still say the go command fails on a removed setting with an old value and accepts the final default. [go1.27](https://go.dev/doc/go1.27) |
| Any new go.mod or go.work directive for 1.28 | unchanged (none found) | The draft 1.28 notes have no go.mod, go.work or modules section content. Its go command section lists only the GOFIPS140=certified alias selecting FIPS module v1.26.0 and `GOAMD64=local`. [go1.28 draft](https://tip.golang.org/doc/go1.28) |
| Accepted or likely-accept cmd/go proposals touching modules | unchanged for rules | [golang/go#31866](https://github.com/golang/go/issues/31866) (do not download "modules" with no go.mod or *.go) is Proposal-Accepted but open, with a reviewer cc on 2026-10-02, not shipped. [golang/go#60338](https://github.com/golang/go/issues/60338) (GO${GOARCH}=local) and [#47308](https://github.com/golang/go/issues/47308) (Git LFS VCS qualifier) are open. [#26227](https://github.com/golang/go/issues/26227) (import path collision check) was closed not planned on 2026-10-08. [#42965](https://github.com/golang/go/issues/42965) was closed in May 2025, outside the window. |
| GO-MOD-18 GOAUTH guidance | unchanged | Open issues [#83290](https://github.com/golang/go/issues/83290) and [#83287](https://github.com/golang/go/issues/83287) (2026-11-22) say GOAUTH=git runs `git credential approve/reject` without setting the working directory. Open, not fixed, no rule change. |
| GO-MOD-15 and the checksum database | unchanged | Open issue [#82881](https://github.com/golang/go/issues/82881) (x/mod/sumdb: check record lines match the lookup request) is a hardening item, not behaviour change. No proxy or sumdb announcement was found on golang-announce for October and November 2026 (titles list below). |
| Toolchain download path (GOTOOLCHAIN, go.sum entries for golang.org/toolchain) | changed | Old text assumes a go.sum entry for the toolchain is authoritative. Fixed in 1.27.2 (2026-10-08): "We now ensure that golang.org/toolchain always goes to the network for the canonical checksum" (CVE-2026-94447, [#81834](https://github.com/golang/go/issues/81834), and the matching golang.org/fips140 issue [#81833](https://github.com/golang/go/issues/81833)). Affects GO-MOD-16's `GOTOOLCHAIN=local` advice only by reinforcing it. |
| Build-time code execution via cgo | changed | 1.27.4 (2026-11-10) fixed ten cgo and go command issues in one release, for example [#82567](https://github.com/golang/go/issues/82567) (CVE-2026-97043, escaped quotes in `//go:cgo_ldflag` bypass `#cgo LDFLAGS` validation), [#82570](https://github.com/golang/go/issues/82570), [#82572](https://github.com/golang/go/issues/82572), [#82575](https://github.com/golang/go/issues/82575). Building a third-party cgo package on 1.27.3 or lower can execute code at build time. |

golang-announce titles read for 2026-10-06 to 2026-11-10: the 1.27.2/1.26.9 pre-announcement, release and x/net advisories, the 1.27.3/1.26.10 release, the x/net pre-announcement and fix, "Protecting against CVE-2026-98432" (2026-10-30, body not reachable), and the 1.27.4/1.26.11 pre-announcement and release. [golang-announce](https://groups.google.com/g/golang-announce)

### 2.3 GO-MOD-08 superseded list and successors

| Claim at risk | Status | Evidence |
|---|---|---|
| gopkg.in/yaml.v2 and .v3 `desc` say "use go.yaml.in/yaml/v3" | changed | go.yaml.in/yaml/v4 v4.0.0 released 2026-11-04 as the first stable v4. README: "v2 and v3 remain stable. Their APIs are frozen, and their branches receive security fixes only. New features and routine bug fixes are developed in v4." v4 is designed to be highly compatible with v3, the module declares `go 1.18`, and `Unmarshal`, `Marshal`, `NewDecoder`, `NewEncoder` stay. The migration guide covers a changed formatting default, error presentation and custom unmarshaler signatures, so a swap from v3 to v4 is not import-path only. [v4.0.0](https://github.com/yaml/go-yaml/releases/tag/v4.0.0), [README](https://github.com/yaml/go-yaml) |
| go.uber.org/mock as successor of github.com/golang/mock | unchanged | go.uber.org/mock not archived, last push 2026-08-25, latest tag v0.6.0 (2025-08-18). github.com/golang/mock stays archived (since 2024-01). [uber-go/mock](https://github.com/uber-go/mock) |
| sigs.k8s.io/yaml as successor of github.com/ghodss/yaml | unchanged | Latest release v1.6.0 (2025-07-24), repository not archived. [kubernetes-sigs/yaml](https://github.com/kubernetes-sigs/yaml) |
| github.com/google/uuid and the stdlib `uuid` (GO-MOD-09) | unchanged | Go 1.27 notes say only "The new `uuid` package generates and parses UUIDs." google/uuid has no release since v1.6.0 (2024-01) and no push since 2024-11-14. The 1.27 notes give no API detail, so the symbol split in GO-MOD-09 is not re-verified here. [go1.27](https://go.dev/doc/go1.27) |
| go.uber.org/automaxprocs and hashicorp/go-multierror stay on the list | unchanged | automaxprocs not archived, last release v1.6.0 (2024-09-23). go-multierror pushed 2026-11-23, not archived. The reasons are stdlib-based (`GOMAXPROCS` container awareness since 1.25, `errors.Join`), not maintenance-based, so activity does not change the entries. |
| More golang.org/x/exp packages promoted to the stdlib | unchanged (none in window) | The x/exp commits in the window are the new `collection` tree (maps, sets, sorted maps; proposal [#80590](https://github.com/golang/go/issues/80590), open) and apidiff. In the standard library, `maps.Grow` ([#81698](https://github.com/golang/go/issues/81698)) was accepted 2026-11-23 and `maps.Same` ([#78456](https://github.com/golang/go/issues/78456)) is open. Neither supersedes an x/exp package the list denies. Pre-window gap, for the record: golang.org/x/exp/rand has been deprecated in favour of math/rand/v2 since 2025-02-07 and is not on the 13-entry list. |
| x/crypto/openpgp | not on the list | Proposal [#81227](https://github.com/golang/go/issues/81227) (isolate, tag, delete) was accepted and closed 2026-10-09; the package has been frozen since 2021 and carries vuln GO-2026-5932 ("unsafe by design"). There is no stdlib or x successor, only the third-party fork github.com/ProtonMail/go-crypto, which the Go team says it cannot endorse. See candidate C8. |

### 2.4 depguard and golangci-lint

| Claim at risk | Status | Evidence |
|---|---|---|
| GO-MOD-08 schema: list form `deny: [{pkg, desc}]`, `files: ["$all"]`, `desc` key | unchanged | golangci-lint v2.15.0 and v2.14.0 both bundle depguard v2.2.1 (read from go.mod). The golangci schema is unchanged. The depguard README on main still documents `$all` and `$test` file variables and `!` negation. [README](https://github.com/OpenPeeDeeP/depguard) |
| depguard behaviour (not yet in the gate) | changed upstream, not shipped in golangci-lint | The depguard repository gained v2.3.0 (tag commit 2026-10-27) with: a new compressed prefix tree where the longest matching entry wins; "Reject empty allow and deny packages (#122)", a config error such as `main: deny contains an empty package` instead of a panic; `$gostd` now exact standard packages; README now states every entry is a plain string prefix and `$` ends an exact match. The repository's GitHub releases page lists only v1.0.0 and v2.0.0, so v2.3.0 has no release notes; the above comes from commit titles, PR #122 and the README at the tag. [depguard commits](https://github.com/OpenPeeDeeP/depguard/commits/main), [PR #122](https://github.com/OpenPeeDeeP/depguard/pull/122) |
| golangci-lint v2.15.0 new linters | unchanged (none) | The changelog lists none. The `exhaustive` option set was renamed (`explicit-exhaustive-switch` and `explicit-exhaustive-map` become `explicit-exhaustive`, `check: map` becomes `mapliteral`, `ignore-enum-members` becomes `ignore-constants`, `ignore-enum-types` becomes `ignore-types`), and `exhaustive` is now a "slow" linter. The cli and lib-sdk files set only `default-signifies-exhaustive: false`, which is not in the renamed list, so they are unaffected. The gofumpt deprecation-log and gosec default notes carry no detail. [changelog](https://golangci-lint.run/docs/product/changelog/) |
| Go 1.28 vet (GO-GATE-01 step 2 runs `go vet ./...`) | unchanged for the gate (not shipped) | Draft 1.28 notes add vet analyzers `scannererr` and `sqlrowserr`. They change what `go vet ./...` reports, which is go-quality's source-level ground. No gate-config change. |
| `go fix` step (GO-GATE-01) | unchanged | [#73605](https://github.com/golang/go/issues/73605) (remove cmd/fix legacy functionality) closed 2025-09, outside the window. 1.27 adds modernizers `atomictypes`, `embedlit`, `slicesbackward`, `unsafefuncs`, removes `fmtappendf`, renames `waitgroup` to `waitgroupgo`. This predates the window (1.27.0 on 2026-08-19) and the baseline presumably covers it. |

### 2.5 Supply chain and release

| Claim at risk | Status | Evidence |
|---|---|---|
| GO-REL-12, a 40-hex SHA is the only pin | changed (a second mechanism exists) | GitHub Actions workflow lockfiles reached GA on 2026-10-28 (public preview 2026-10-14): `.github/workflows/actions.lock`, generated by the `gh actions-lock` extension, keeps readable tags or branches in workflows while running the locked commits, covers transitive dependencies, can be enforced by a "Require lockfile" policy, and Dependabot regenerates the entry in the same pull request. The page does not claim equivalence with SHA pinning. [lockfiles GA](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available) |
| Actions trigger hygiene | changed | `pull_request_target` is blocked by default in public repositories from 2026-12-02 (brownouts 2026-11-09 and 2026-11-16). Not a Go rule, but it affects Go release and lint workflows that use it. [changelog](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2) |
| GO-MOD-17 Dependabot | unchanged | The Dependabot reachability analysis (2026-10-28) supports JavaScript and TypeScript only, and the package firewall (2026-10-20, public preview) supports npm only. Neither covers Go. [reachability](https://github.blog/changelog/2026-10-28-prioritize-dependabot-alerts-with-reachability-analysis), [package firewall](https://github.blog/changelog/2026-10-20-github-package-firewall-in-public-preview) |
| GO-REL-11 keyless signing through Sigstore | unchanged | Sigstore blog 2026-11-16: the public Rekor instance disables uploads of several rarely used entry types, "cosign and SDK users are unaffected". 2026-10-02: Sigstore is accelerating post-quantum plans (no action yet). [Rekor hardening](https://blog.sigstore.dev/rekor-public-instance-hardening/), [PQC](https://blog.sigstore.dev/pqc-sigstore/) |
| GO-REL-11 `subject-path` claim and GO-REL-08 binary naming under goreleaser `formats: [binary]` | could not determine | goreleaser 2.20.3 lists "fix(archive): use the base name of the binary in formats: [binary] (#7320)". The baseline says 2.17.1 keeps each binary under `dist/<id>_<os>_<arch>_<variant>/` and names it by `name_template`. Whether 2.20.3 changes either needs a probe run, which a go-upgrade pass should do. [v2.20.3](https://github.com/goreleaser/goreleaser/releases/tag/v2.20.3) |
| Go release attestation format, reproducible-build verification tooling, govulncheck in the go command | unchanged (none found) | No Go blog post, release note or accepted proposal in the window covers any of the three. The accepted proposal [#82690](https://github.com/golang/go/issues/82690) (GOEXPERIMENT=vetfiles, accepted 2026-11-19) concerns analyzers in `go test`, an experiment only. The "eMudhra Key Disclosure Incident" post (2026-10-26) covers TLS certificate verification and says nothing about the module proxy, sumdb or Go release signing. [post](https://go.dev/blog/emudhra-incident) |

## 3. Ranked candidate additions

All items below are shipped upstream unless marked accepted-only. Verification commands were not run by this researcher.

### C1. golangci-lint v2.14.0 crashes staticcheck on Go 1.27.2 and later (GO-GATE family)

- Upstream change: Go 1.27.2 (2026-10-08) changed the compiler export data format. staticcheck 2026.2.1, which golangci-lint v2.14.0 bundles as honnef.co/go/tools v0.8.1, failed on generic methods; Go 1.27.4 (2026-11-10) fixed the compiler side ([golang/go#82105](https://github.com/golang/go/issues/82105), backport [#82106](https://github.com/golang/go/issues/82106)). staticcheck 2026.2.2 (2026-10-12) supports the new format; golangci-lint v2.15.0 (2026-10-16) bundles it.
- Status: shipped.
- Family: GO-GATE-08 (pin), with a new floor sentence.
- Draft rule: A module with a `go` line of 1.27 or higher, or any generic method, runs golangci-lint v2.15.0 or later (staticcheck 2026.2.2 or later) on a Go 1.27.2 or later toolchain; v2.14.0 is not a valid pin for those toolchains.
- Rationale: the baseline pin and its "moves only through go-upgrade" default predate the toolchain change, and the matrix leg `stable` moves to 1.27.4 on its own.
- Verification: `golangci-lint version` shows v2.15.0 or later (`grep -n 'version: v2' .github/workflows/*golangci*.yml`), and `golangci-lint run ./...` on a package with a generic method exits 0 on Go 1.27.4. Owner decision needed because GO-GATE-08 pins v2.14.0 as a recorded default; this is the upgrade evidence, to route through go-upgrade.

### C2. Patch floor for release builds and a rebuild trigger (GO-MOD-16, GO-MOD-13)

- Upstream change: security fixes in the go command and toolchain: toolchain checksum bypass CVE-2026-94447 (1.27.2, 2026-10-08), eMudhra intermediate distrust (1.27.3, 2026-10-19), cgo build-time code execution (1.27.4, 2026-11-10). Go's own advice: rebuild with the fixed release and scan shipped binaries with `govulncheck -mode=binary`. [emudhra post](https://go.dev/blog/emudhra-incident), [go.dev/doc/devel/release](https://go.dev/doc/devel/release)
- Status: shipped.
- Family: GO-MOD-16 (build jobs) and GO-MOD-13 (binary scan).
- Draft rule: Every release build runs on Go 1.27.4 or 1.26.11 or later, and a release binary built on 1.27.2 or lower is rebuilt and rescanned with `govulncheck -mode=binary` before its next publication.
- Rationale: a CLI `toolchain` line left at go1.27.1 (the baseline example) builds shipped binaries with the eMudhra-trusting TLS stack, and a build job compiling third-party cgo code can be made to execute code.
- Verification: `go version -m <binary>` shows `go1.27.4` or later, `grep -n '^toolchain' go.mod` shows `toolchain go1.27.4` or later, `govulncheck -mode=binary <binary>` exits 0.
- Note: the rule index already says "latest patch", so this is mostly a snapshot refresh plus the rebuild trigger. The numbers belong in go-upgrade, not as a hard-coded rule.

### C3. goreleaser floor of 2.20.3 and no artifacts.json upload (GO-REL family)

- Upstream change: v2.20.0 (2026-11-04) fixes inline publishing SSH private keys written in cleartext to `dist/artifacts.json` ([GHSA-9422-8p9m-393x](https://github.com/goreleaser/goreleaser/security/advisories/GHSA-9422-8p9m-393x)). v2.20.3 (2026-11-20) fixes the snapshot version embedded unescaped in generated Homebrew and AUR package files, "which could lead to code execution when loaded", affecting `>= 2.0.0, <= 2.20.2` ([GHSA-qx28-5g8c-9fw6](https://github.com/goreleaser/goreleaser/security/advisories/GHSA-qx28-5g8c-9fw6)). [v2.20.0](https://github.com/goreleaser/goreleaser/releases/tag/v2.20.0), [v2.20.3](https://github.com/goreleaser/goreleaser/releases/tag/v2.20.3)
- Status: shipped.
- Family: GO-REL-07 (config and version) or a new GO-REL entry.
- Draft rule: Pin goreleaser to 2.20.3 or later, and never publish `dist/artifacts.json`, `dist/metadata.json` or any `dist/` file other than the intended release assets from CI.
- Rationale: the baseline pin 2.17.1 is affected by both advisories, and an agent that uploads `dist/` as a workflow artifact can leak keys.
- Verification: `grep -n 'goreleaser' .github/workflows/*.yml` shows a `version:` of v2.20.3 or later; `grep -rn 'path: dist\b' .github/workflows` finding an upload of the whole directory is the finding.
- Caveat: the advisory affects the inline SSH key publisher path; a repository that signs keyless and publishes only to GitHub releases is not exposed to the first one, only to the second if it uses Homebrew or AUR publishing, which GO-REL-08 does not use. The floor is still cheap to state.

### C4. Yaml successor in the GO-MOD-08 `desc` strings (deny-list entry text)

- Upstream change: go.yaml.in/yaml/v4 v4.0.0 stable (2026-11-04). v2 and v3 are frozen, security fixes only.
- Status: shipped.
- Family: GO-MOD-08 (the `desc` of `gopkg.in/yaml.v2` and `gopkg.in/yaml.v3`).
- Draft rule: Change both `desc` strings to "go-yaml archived 2025-04-01; use go.yaml.in/yaml/v4 (new code) or go.yaml.in/yaml/v3 (frozen, drop-in)", and keep `go.yaml.in/yaml/v3` off the deny list.
- Rationale: an agent following the current desc installs a frozen module when a maintained one now exists, and a blind v3 to v4 swap changes formatting defaults and error shapes.
- Verification: `grep -n 'go.yaml.in/yaml/v3' skills/go-modules-reference/golangci/*.yml` returns only `desc` text; `golangci-lint run ./...` on a file importing `gopkg.in/yaml.v3` still reports `is not allowed from list 'superseded'`.
- Owner decision: the choice between recommending v4 for new code or keeping v3 as the pinned default is a "pinned"-style call. The three yaml sources agree that v4 is stable, so recommending v4 for new code is supported.

### C5. Workflow lockfiles as an alternative to SHA pinning (GO-REL-12), CONSIDER

- Upstream change: GitHub Actions workflow lockfiles GA 2026-10-28 (`.github/workflows/actions.lock`, `gh actions-lock`, Require lockfile policy).
- Status: shipped.
- Family: GO-REL-12.
- Draft rule: A workflow onboarded to a committed `actions.lock` that CI checks for staleness satisfies GO-REL-12 for its `uses:` lines; any workflow not onboarded keeps the 40-hex SHA pin.
- Rationale: an agent will otherwise rewrite readable tags to SHAs (or the reverse) in lockfile-managed repositories, and the rule's grep `pin-check` would flag the tag form.
- Verification: `test -f .github/workflows/actions.lock` plus the repository's stale-lockfile check exit 0; otherwise `pin-check` stands.
- Caveat: the GitHub page does not state that a lockfile equals SHA pinning, and the lockfile semantics (pinning of transitive actions, tag form still in the file) were read from one changelog page only. Hold as CONSIDER until a second source or a probe exists. Cross-pair: the same change applies to every language pair's pinning rule.

### C6. depguard v2.3.0 matching semantics, once golangci-lint bundles it (GO-MOD-08 verification), CONSIDER

- Upstream change: depguard v2.3.0 (tag 2026-10-27): prefix matching with longest-match wins, empty `pkg` rejected as a config error, `$gostd` exact. golangci-lint v2.15.0 still bundles v2.2.1.
- Status: shipped in depguard, not yet in golangci-lint (so not yet in the gate).
- Family: GO-MOD-08 verification, and go-upgrade.
- Draft rule: After any golangci-lint bump that raises depguard to v2.3.0 or later, `golangci-lint config verify` and a planted import of each of the 13 denied packages must still produce `is not allowed from list 'superseded'`, because every entry is a string prefix (`go.uber.org/automaxprocs` also denies `go.uber.org/automaxprocsx`).
- Rationale: the deny list was authored against v2.2.1 behaviour, and a prefix-tree rewrite can change which suggestion an import receives.
- Verification: a scratch file importing each denied path, `golangci-lint run` exits 1 for each.
- Not a new rule today; this is a go-upgrade checklist item.

### C7. setup-go v7 (GO-MOD-16 snapshot), CONSIDER

- Upstream change: v7.0.0 (2026-07-16, before the window but after nothing in the baseline) and v7.1.0 (2026-11-17, in the window) with native Go version syntax in `go-version`.
- Status: shipped.
- Family: GO-MOD-16.
- Draft rule: Replace the `setup-go v6` evidence with v7; add that `go-version: go1.27.4` (native syntax) is an exact patch like `1.27.4`, and a `go-version-file` pointing at a bare `go 1.27.0` line stays forbidden for release builds.
- Verification: the existing GO-MOD-16 grep block, plus reading each hit for the three forbidden shapes.
- Caveat: whether `check-latest` behaviour changed in v7 was not read (see 2.1).

### C8. x/crypto/openpgp deny entry, CONSIDER (likely reject)

- Upstream change: accepted 2026-10-09, [#81227](https://github.com/golang/go/issues/81227): carve out a module, tag it, delete the code from x/crypto. Not yet shipped (the deletion and tag are not confirmed in the window).
- Status: accepted only.
- Family: GO-MOD-08.
- Draft rule: Add `golang.org/x/crypto/openpgp` to `superseded` with a `desc` naming no stdlib successor.
- Why probably not: the list's admission bar is a replacement the agent can name, and the Go team does not endorse one. govulncheck already reports GO-2026-5932 on any import (GO-MOD-12). The list is also pinned at 13 entries ("never shorten") and adding entries is an owner decision.

## 4. Considered and rejected

- Go 1.27 release note items (JSON v2, SIMD, generic methods, mldsa, `go mod tidy` require-block merge): the first four are source-level (go-quality). The `go mod tidy` consolidation (go 1.27 and later merges duplicate require blocks) shipped on 2026-08-19, before the window and the baseline, and is not a window change.
- Go 1.28 items (GOFIPS140=certified alias, GOAMD64=local, vet analyzers, bootstrap needing Go 1.26.0): not shipped, no rule impact.
- GitHub supply-chain changelog items for npm and Dependabot (npm trusted publishing, Agent Package Manager, Python 3.15): not Go.
- eMudhra incident: handled under C2.
- Proposals on GOMIPS ISA levels, Git LFS qualifier and cgo without a C toolchain ([#81450](https://github.com/golang/go/issues/81450), open; its GOEXPERIMENT [#81662](https://github.com/golang/go/issues/81662) accepted and landed 2026-11-22): GO-REL-02 (explicit `CGO_ENABLED=0`) is unaffected until the proposal itself is accepted. Re-check at the next refresh.

## 5. Coverage limits

- The go.dev blog index was read for titles only; no post in the window concerns modules, proxy, sumdb or vet gate behaviour, so none beyond the eMudhra post was opened.
- The golang-announce bodies were not readable through the fetcher; only titles were. The 2026-10-30 post "Protecting against CVE-2026-98432" could not be opened and a web search found no record of that identifier, so its content is unknown.
- Go module mirror and checksum database announcements: no dedicated announcement page exists for the window; the check relies on golang-announce titles, the golang/go issue tracker searches and the x/mod issue list. Absence of evidence, not proof.
- Accepted and likely-accept proposals were read through GitHub issue searches by label and date, not through the proposal review minutes, so a proposal without the labels could be missed.
- GitHub changelog label pages were read by title; only the lockfile, pull_request_target, package firewall and reachability entries were opened.
- The goreleaser v2.18 and v2.19 announcements and the "Moving to Immutable Releases" blog post were not read in full. v2.19 notes show "graduate stable features out of experimental (#7126)" and v2.18 shows "preflight checks (#6704)", with unknown effect on the baseline configs.
- setup-go v7 README and breaking-change notes were not read.
- No command from the candidate verifications was executed.

## 6. Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://go.dev/doc/devel/release | Go release history | read 2026-11-27 | Dates and security scope of 1.27.1 to 1.27.4 |
| https://go.dev/doc/go1.27 | Go 1.27 release notes | 2026-08-19 | go command, godebug, uuid, vet notes |
| https://tip.golang.org/doc/go1.28 | Go 1.28 draft notes | draft, read 2026-11-27 | Nothing under go.mod, go.work, modules |
| https://go.dev/blog/ | Go blog index | titles 2026-09-02 to 2026-11-10 | Confirms no module or proxy post |
| https://go.dev/blog/emudhra-incident | eMudhra incident response | 2026-10-26 | Rebuild and binary-scan advice |
| https://groups.google.com/g/golang-announce | golang-announce titles | 2026-10-06 to 2026-11-10 | Security release cadence |
| https://github.com/golang/go/issues/81834 | CVE-2026-94447 toolchain checksum bypass | closed 2026-10-08 | go command fix text |
| https://github.com/golang/go/issues/82567 | CVE-2026-97043 cgo ldflag injection | closed 2026-11-11 | cgo build-time execution fix text |
| https://github.com/golang/go/issues/82105 | Export data crash with staticcheck | closed 2026-11-10 | Ties Go 1.27.2 and 1.27.4 to staticcheck |
| https://github.com/golang/go/issues/81227 | x/crypto/openpgp removal proposal | accepted 2026-10-09 | Deny-list candidate C8 |
| https://github.com/golang/go/issues/31866 | Do not download "modules" without go.mod or *.go | accepted, open | Accepted cmd/go modules proposal, not shipped |
| https://github.com/golang/go/issues/82690 | GOEXPERIMENT=vetfiles | accepted 2026-11-19 | Only vet-related acceptance in the window |
| https://github.com/golangci/golangci-lint/releases | golangci-lint releases | v2.15.0 2026-10-16 | Version and bundled tool bumps |
| https://golangci-lint.run/docs/product/changelog/ | golangci-lint changelog | 2026-10-16 | Linter and option changes |
| https://github.com/dominikh/go-tools/releases/tag/2026.2.2 | staticcheck release | 2026-10-12 | Go 1.27.2 export data support |
| https://github.com/OpenPeeDeeP/depguard | depguard repository, README and commits | v2.3.0 2026-10-27 | Matching semantics and validation |
| https://github.com/yaml/go-yaml/releases/tag/v4.0.0 | go.yaml.in/yaml v4.0.0 release notes | 2026-11-04 | Candidate C4 |
| https://github.com/goreleaser/goreleaser/releases | goreleaser release notes v2.19 to v2.20.3 | 2026-10-22 to 2026-11-20 | Two security advisories, naming fix |
| https://github.com/actions/setup-go/releases | setup-go releases | v7.1.0 2026-11-17 | GO-MOD-16 snapshot |
| https://github.com/sigstore/cosign/releases | cosign releases | v3.1.6 2026-11-25 | GO-REL-11 tooling drift |
| https://github.com/golang/vuln | govulncheck tags and compare | v1.10.0 2026-11-17 | Version drift only |
| https://github.com/dominikh/go-tools/releases | staticcheck release list | 2026-10-12 | Version check |
| https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available | GitHub changelog, lockfiles GA | 2026-10-28 | Candidate C5 |
| https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2 | GitHub changelog | 2026-11-02 | Workflow trigger policy |
| https://github.blog/changelog/2026-10-20-github-package-firewall-in-public-preview | GitHub changelog | 2026-10-20 | npm only, not Go |
| https://github.blog/changelog/2026-10-28-prioritize-dependabot-alerts-with-reachability-analysis | GitHub changelog | 2026-10-28 | JS and TS only, not Go |
| https://blog.sigstore.dev/rekor-public-instance-hardening/ | Sigstore blog | 2026-11-16 | Cosign unaffected |
| https://blog.sigstore.dev/pqc-sigstore/ | Sigstore blog | 2026-10-02 | Post-quantum plans, no action |
| https://github.com/uber-go/mock | go.uber.org/mock repository | pushed 2026-08-25 | Successor check |
| https://github.com/kubernetes-sigs/yaml | sigs.k8s.io/yaml repository | v1.6.0 2025-07-24 | Successor check |
| https://github.com/google/uuid | google/uuid repository | last push 2024-11-14 | Successor check |
| https://github.com/golang/exp | x/exp commit history | 2026-09-26 to 2026-11-24 | No package promoted to std |
| https://github.com/golang/go/issues/83290 | GOAUTH=git working directory issue | open 2026-11-22 | GO-MOD-18 context |

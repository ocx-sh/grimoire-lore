---
title: go-quality delta refresh decision, 2026-09-26 to 2026-11-27
pair: go-quality
date: 2026-11-27
window_start: 2026-09-26
model: opus
consolidates:
  - .agents/research/refresh-2026-11/go-quality/go-1-27-point-releases.md
  - .agents/research/refresh-2026-11/go-quality/go-1-28-cycle-experiments-fixers.md
  - .agents/research/refresh-2026-11/go-quality/golangci-lint-staticcheck-gosec.md
  - .agents/research/refresh-2026-11/go-quality/x-tools-gopls-vuln-exp.md
  - .agents/research/refresh-2026-11/go-quality/third-party-libraries.md
  - .agents/research/refresh-2026-11/go-quality/recent-shifts.md
revises:
  - .agents/research/go-language.md
  - .agents/research/go-network.md
  - .agents/research/go-io.md
  - .agents/research/go-cli.md
---

# go-quality delta refresh decision

This is a delta update of the go-quality pair against its 2026-09-26 baseline. It is not a re-creation. Every claim that the six delta artifacts did not show to have moved upstream stays exactly as written.

## Verdict

1. The rule file `rules/go-quality.md` is not edited. Its pinned tool versions (Go 1.27.1, golangci-lint v2.14.0, govulncheck v1.8.0, gopls v0.23.0) are stated as measured on 2026-09-26, which is still true, and the rule itself says they move only through the `go-upgrade` skill under GO-GATE-08 in `go-modules`. Moving them here, without re-running the watched verifications on the new versions, would break GO-CORE-02. The pin move is reported as spillover.
2. The reference skill gets five fact corrections, all in existing rows or existing "Dates and Floors" and "Documented Gaps" bullets. No rule ID is added, renumbered or retired.
3. GO-LANG-11 is changed in place: its byte-identity claim is false on the 1.27.1 toolchain it names for one input shape, a map key of named string kind that implements `MarshalText` (golang/go#81362, fixed in go1.27.2).
4. network.md's stdlib-facts bullet gains the 50 ms drain bound that the Go blog of 2026-10-14 states beside the 256 KiB figure.
5. io.md gains a toolchain floor for Windows: `Root.Mkdir` and `Root.MkdirAll` follow a junction out of the root before go1.27.2 and go1.26.9 (CVE-2026-56857). GO-IO-02 sends archive extraction through `root.MkdirAll`, and the measured toolchain 1.27.1 is below the fix.
6. cli-contract.md extends "re-run the fixtures on every cobra bump" to pflag bumps, because pflag v1.1.0 (2026-11-06) changed deprecation, unknown-flag and usage text, and names spf13/cobra#2528 as the nearest tracked `TraverseChildren` defect.
7. No new rule is added. The strongest candidate (check `Scanner.Err` and `Rows.Err` after a loop) is a bug class that existed unchanged at baseline; its only in-window upstream event is two Go 1.28 vet analyzers that are not released, and once 1.28 ships gate step 2 (`go vet ./...`) catches it with no rule edit. It is parked under open questions.
8. Bumps: the rule `none`, the reference skill `patch` (corrected facts only).

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| GO-LANG-11 (rationale cell, language.md) | "Only error text may differ, which GO-ERR-14 forbids matching. `nojsonv2` is slated for removal." | "Only error text may differ, which GO-ERR-14 forbids matching. One exception predates go1.27.2 ([golang/go#81362](https://github.com/golang/go/issues/81362)): earlier 1.27 toolchains call `MarshalText` on a map key of named string kind, which Go 1.26 and `nojsonv2` do not, so a golden holding such a map is generated on go1.27.2 or later. `nojsonv2` is slated for removal." | golang/go#81362 and the go1.27.2 release entry at go.dev/doc/devel/release, read in go-1-27-point-releases.md. Verification: the row's existing golden diff (default against `GOEXPERIMENT=nojsonv2`) goes red on 1.27.1 for such a map and is empty from go1.27.2 on. Severity stays SHOULD. |
| Stdlib-facts bullet (network.md, Dates and Floors; underpins GO-NET-10) | "`Close` lets a connection be reused when at most 256 KiB is unread," | "`Close` lets a connection be reused when at most 256 KiB is unread and it drains within 50 ms (an internal bound the Go blog of 2026-10-14 says may change)," | go.dev/blog/http-connection-reuse (2026-10-14), read in recent-shifts.md; the 256 KiB constant re-read in go1.27.4 `transport.go` in go-1-27-point-releases.md. Verification: `grep -n -e 'maxPostCloseRead' "$(go env GOROOT)/src/net/http/transport.go"` prints the byte and time bounds of the toolchain in use. |
| Behaviour floors (io.md, Dates and Floors; underpins GO-IO-02) | No statement of the Windows junction fix. | New bullet: on Windows, `Root.Mkdir` and `Root.MkdirAll` follow a junction out of the root before go1.27.2 and go1.26.9 (CVE-2026-56857), which includes the 1.27.1 these rows were measured on; a Windows build that extracts through GO-IO-02 uses go1.27.2, go1.26.9 or later. | go1.27.2 announcement (2026-10-08, oss-security mirror) at https://www.openwall.com/lists/oss-security/2026/10/08/9 and go/issue 81739 at https://github.com/golang/go/issues/81739, read in go-1-27-point-releases.md and recent-shifts.md. Verification: `go version -m <binary>` prints the build toolchain; a Windows binary below go1.27.2 (or go1.26.9 on the 1.26 line) that calls `Root.MkdirAll` is the finding. |
| Cobra-row bullet (cli-contract.md, Dates and Floors) | "Re-run the in-process tests on every cobra bump." | "Re-run the in-process tests on every cobra or pflag bump, since pflag v1.1.0 (2026-11-06) changed deprecation, unknown-flag and usage text." | spf13/pflag v1.1.0 release notes at https://github.com/spf13/pflag/releases/tag/v1.1.0, read in third-party-libraries.md. Verification: `go list -m github.com/spf13/cobra github.com/spf13/pflag` in the fixture module, compared with the versions the header names; a mismatch without a fixture re-run is the finding. |
| `TraverseChildren` gap bullet (cli-contract.md, Documented Gaps; supports GO-CLI-17) | "... has no upstream tracker**, and cobra's docs are silent, so GO-CLI-17 treats it as the CLI's problem regardless of intent." | Same sentence, followed by: "The nearest tracked defect, [spf13/cobra#2528](https://github.com/spf13/cobra/issues/2528) (open since 2026-10-15), is a second reason to leave it unset: `TraverseChildren` can run a subcommand named after `--` and discard the positional arguments." | spf13/cobra#2528, read in third-party-libraries.md. Verification: `gh api repos/spf13/cobra/issues/2528 --jq .state` prints `open`; GO-CLI-17's existing `TraverseChildren` grep is unchanged. |

## New rules

None. See Verdict item 7 and Open questions.

## Confirmed unchanged

- `go test` still runs 12 vet analyzers and `go vet` still runs the full suite on 1.27.4: `defaultVetFlags` and `cmd/vet/main.go` are byte-identical between go1.27.1 and go1.27.4, and `testinggoroutine` is still commented out on tip. GO-CORE-03's "runs 12 on 1.27.1" stands.
- network.md: `DefaultMaxIdleConnsPerHost = 2`, the 256 KiB unread limit, the 10-hop `defaultCheckRedirect`, and the absence of a per-`Read` body deadline, all re-read at go1.27.4.
- io.md GO-IO-05: `tarinsecurepath` and `zipinsecurepath` still default to permissive on go1.27.4 and on tip; no archive package changed in the window.
- security.md: `crypto/tls` defaults (TLS 1.2 floor, ML-KEM hybrids in the default key exchanges) are byte-identical at go1.27.4. The ML-DSA `signature_algorithms_cert` omission and the ECH fix do not touch them.
- cli-contract.md and concurrency.md: `signal.NotifyContext`'s cause is still an unexported string type at go1.27.4.
- observability.md: `nogreenteagc` is still accepted on 1.27.4 and on tip, with no removal date. The "forecast for removal in 1.27" clause is sourced from the Go 1.26 notes (go-observability consolidation), so the 1.28 artifact's failure to find it in the 1.27 notes is not a contradiction. The goroutine-leak profile is GA with no change.
- language.md: `nojsonv2` has no removal release; `encoding/json/v2` is declared stable in the 2026-11-04 blog post; x/tools `toonew.go` still exempts `encoding/json/v2` and `jsontext` from stdversion at v0.53.0, so non-negotiable 1 and GO-LANG-04 stand; `vet.Suite` still has no yield analyzer.
- Gate step 10: the gopls `yield` message is byte-identical at gopls v0.24.0 and `gopls check` still exits 0 with findings, so the grep needs no edit.
- govulncheck: exit 3 on findings in text mode, 0 in json and sarif, unchanged through v1.10.0. The command doc also names openvex as zero-exit, but the scanner source is byte-identical to v1.8.0, so this was already true at baseline and the GO-CORE-03 example list is left as written.
- golangci-lint: the `standard` five-linter set, the exclusion presets (`common-false-positives` still deletes G103 and G204), `exclusions.generated: lax`, and exit 7 on a logged error are unchanged in v2.15.0 and on main. gosec, testifylint, sloglint, errorlint and usetesting are bundled at the same versions.
- staticcheck: SA9010 still needs 2026.2 or later; SA1019 behaviour is unchanged in 2026.2.2.
- Fixer and modernizer names (`forvar`, `errorsastype`, `inline`, `newexpr`, `omitzero`, `atomictypes`, `waitgroupgo`) are all present on tip; `bloop` is still excluded from `go fix`; `synctest.Run` is still absent.
- errgroup `SetLimit` and `TryGo` are byte-identical at x/sync v0.25.0; gorelease is byte-identical; "never gate on apidiff's exit code" stands.
- cobra: no commit after 2026-07-11 and no release after v1.10.2 (2025-12-04, before the baseline, touching no cited row); spf13/cobra#1708 is still open; colorprofile still parses `NO_COLOR` with `strconv.ParseBool`, so GO-CLI-13's ban stands; termenv, go-cmp, goleak and go-containerregistry have no new tag; dependabot-core#13520 is still open.
- Go-line floors (`go 1.26.0` libraries and SDK, `go 1.27.0` CLIs) need no change before Go 1.28 ships.

## Open questions

- GO-ERR-05's `_test.go` blind spot for SA4023 was watched on staticcheck 2026.2.1. SA4023 was patched again in 2026.2.2 (bundled by golangci-lint v2.15.0). Re-run the planted fixture with `staticcheck -tests=true -checks SA4023 ./...` on 2026.2.2 when the pin moves, before keeping the sentence.
- Unchecked `bufio.Scanner.Err` and `sql.Rows.Err` after a loop: no rule covers it. Go 1.28 (about February 2027) adds the vet analyzers `scannererr` and `sqlrowserr`, which gate step 2 runs; `scannererr` is not in `go test`'s default set. Decide at the next full pass whether a reading heuristic is worth a GO-ERR-21 before 1.28.
- Coverage-profile duplication after a cached test result (golang/go#81824, open, go1.27.1): the percentage `go tool cover -func` prints is unaffected, so the 100% gate is not fooled; tools that reject duplicate blocks fail. Revisit when CL 840485 lands.
- MPTCP on Linux listeners (CVE-2026-98432, a kernel use-after-free): Go declined to change the 1.24 default and calls disabling it fragile. Not ruled; revisit if golang/go#82717 changes the default.
- Whether `testinggoroutine` flags `t.FailNow` inside `wg.Go` and `errgroup.Go` closures, so non-negotiable 8's "no tool checks the closure case" stays as written. The Go 1.28 `GOEXPERIMENT=vetfiles` route (golang/go#82464) may make it opt-in for `go test`; re-check at the final 1.28 notes.
- urfave/cli v3.14.0's exit code for an unknown command (GO-CLI-16 rationale quotes exit 3 for v3.13.0): could not be determined.
- The x/net advisories of 2026-10-08 and 2026-10-27, and `tracebacklabels`: could not be read.
- Go 1.28 forward items to re-check at release: `synctest.Subtest` for GO-TEST-11, `nosizespecializedmalloc` as a broken-pin example for GO-LANG-16, `Transport.CancelRequest` becoming a no-op, the combined HTTP/1 and HTTP/2 pool limits for GO-NET-03, and the `string(int)` language removal.

## Spillover

- go-modules (GO-GATE-08 and the `go-upgrade` skill): current releases are Go 1.27.4 (2026-11-10), golangci-lint v2.15.0 (2026-10-16, bundling staticcheck 2026.2.2 and revive 1.17.1), govulncheck v1.10.0 and gopls v0.24.0. The pinned Go 1.27.1 lacks 28 security fixes, including eight net/http fixes in 1.27.2, the `MaxBytesReader` server crash fixed in 1.27.4 (CVE-2026-97054) and the Windows `os.Root` junction fix; gate step 8 can go red on 1.27.1 for modules that reach those symbols. When the pin moves, the matching version strings in `rules/go-quality.md` (gate step 10 and the Pinned line, the Severity paragraph) and in every reference file's "Measured ... against" header move with it, and each watched verification is re-watched on the new version.
- go-modules (release builds): rebuild every binary that uses `crypto/tls` or `net/http` on go1.27.3 or later for the eMudhra intermediate denylist (GO-2026-6809), and judge it by `go version -m`, never by the host `go version`.
- go-observability consolidation: the "goleak has no transitive dependencies" wording is imprecise, since goleak v1.3.0's `go.mod` requires testify for its own tests. The published pair does not carry the claim, so no pair edit follows.

## Revision log

- language.md GO-LANG-11: byte-identity qualified for named string map keys with `MarshalText` before go1.27.2 (golang/go#81362).
- network.md Dates and Floors: 50 ms drain bound added beside the 256 KiB reuse limit (Go blog, 2026-10-14).
- io.md Dates and Floors: Windows `os.Root` junction floor added (CVE-2026-56857, go1.27.2 and go1.26.9).
- cli-contract.md Dates and Floors: fixture re-run extended to pflag bumps (pflag v1.1.0, 2026-11-06).
- cli-contract.md Documented Gaps: spf13/cobra#2528 named as the nearest `TraverseChildren` defect.
- Spillover round, rules/go-quality.md Pinned line: Go 1.27.4 and golangci-lint v2.15.0 (bundling staticcheck 2026.2.2), with the 2026-09-26 measurement on Go 1.27.1 and v2.14.0 kept as provenance.
- Spillover round, rules/go-quality.md Severity paragraph: the pinned golangci-lint default moves to v2.15.0.
- Spillover round, network.md header: "Binds to" moves to Go 1.27.4 and golangci-lint v2.15.0, with the earlier measurement kept as provenance.
- Spillover round, security.md header: "Binds to" moves to Go 1.27.4 and golangci-lint v2.15.0, with the earlier measurement kept as provenance.

## Edit list

1. File: `skills/go-quality-reference/language.md`
   Find:
   ```
   Only error text may differ, which GO-ERR-14 forbids matching. `nojsonv2` is slated for removal.
   ```
   Replace with:
   ```
   Only error text may differ, which GO-ERR-14 forbids matching. One exception predates go1.27.2 ([golang/go#81362](https://github.com/golang/go/issues/81362)): earlier 1.27 toolchains call `MarshalText` on a map key of named string kind, which Go 1.26 and `nojsonv2` do not, so a golden holding such a map is generated on go1.27.2 or later. `nojsonv2` is slated for removal.
   ```

2. File: `skills/go-quality-reference/network.md`
   Find:
   ```
   `Close` lets a connection be reused when at most 256 KiB is unread,
   ```
   Replace with:
   ```
   `Close` lets a connection be reused when at most 256 KiB is unread and it drains within 50 ms (an internal bound the Go blog of 2026-10-14 says may change),
   ```

3. File: `skills/go-quality-reference/io.md`
   Anchor (insert after this line):
   ```
     (toolchain 1.23+) protects only the leader pid, with no group-scoped pidfd.
   ```
   Insert:
   ```
   - Toolchain-gated on Windows (CVE-2026-56857): `Root.Mkdir` and
     `Root.MkdirAll` follow a junction out of the root before go1.27.2 and
     go1.26.9, which includes the 1.27.1 these rows were measured on. A Windows
     build that extracts through GO-IO-02 uses go1.27.2, go1.26.9 or later, and
     `go version -m <binary>` names the toolchain that built it.
   ```

4. File: `skills/go-quality-reference/cli-contract.md`
   Find:
   ```
   Re-run the in-process tests on every cobra bump.
   ```
   Replace with:
   ```
   Re-run the in-process tests on every cobra or pflag bump, since pflag v1.1.0 (2026-11-06) changed deprecation, unknown-flag and usage text.
   ```

5. File: `skills/go-quality-reference/cli-contract.md`
   Find:
   ```
   - **The `TraverseChildren` typo gap has no upstream tracker**, and cobra's docs are silent, so GO-CLI-17 treats it as the CLI's problem regardless of intent.
   ```
   Replace with:
   ```
   - **The `TraverseChildren` typo gap has no upstream tracker**, and cobra's docs are silent, so GO-CLI-17 treats it as the CLI's problem regardless of intent. The nearest tracked defect, [spf13/cobra#2528](https://github.com/spf13/cobra/issues/2528) (open since 2026-10-15), is a second reason to leave it unset: `TraverseChildren` can run a subcommand named after `--` and discard the positional arguments.
   ```

## Spillover round

Input: .agents/research/refresh-2026-11/go-quality/spillover-check.md (1 confirmed, 0 unconfirmed, 0 already correct), originating from the go-modules pair.

### Verdict

1. The one confirmed item is applied. The go-modules pair now binds Go 1.27.4, golangci-lint v2.15.0 and staticcheck 2026.2.2, and its GO-GATE-08 requires v2.15.0 or later on a go1.27.2 or later toolchain. go-quality's Pinned line and Severity paragraph still named Go 1.27.1 and golangci-lint v2.14.0, so the two sets contradicted each other.
2. This resolves Verdict item 1 of the first round, which held the pin move back for exactly this spillover. It does not contradict it: the first round's reason was that moving the pin must not pass off the 2026-09-26 measurements as new ones. Every edit below keeps that measurement as provenance and says the probes were not re-run.
3. Only pin statements move: the rule's Pinned line, the rule's Severity paragraph, and the two reference headers that say "Binds to" (network.md, security.md). Every "Measured 2026-09-26 against ..." header and every in-body "(golangci-lint v2.14.0, measured 2026-09-26)" or "staticcheck 2026.2.1" evidence clause is a provenance statement that is still true, and stays as written. A find-and-replace on those would turn them false.
4. Go moves to 1.27.4 together with golangci-lint, as in go-modules. The v2.15.0 pin exists because staticcheck 2026.2.2 is the first release that reads the export data Go 1.27.2 changed, so naming v2.15.0 beside Go 1.27.1 would be incoherent. govulncheck v1.8.0 and gopls v0.23.0 stay, matching go-modules, whose x/tools research says they move only with a re-measure.
5. No rule or step ID is added, renumbered or retired. The rule file grows by two lines, to 195 lines, under the 200-line budget.
6. Bumps: the rule `patch` (a pinned default's version string corrected), the reference skill `patch` (unchanged from the first round).

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| Pinned tool versions (rules/go-quality.md, after The Gate block; underpins GO-GATE-08 in go-modules) | "**Pinned** tool versions, measured 2026-09-26: Go 1.27.1, golangci-lint v2.14.0, govulncheck v1.8.0 and gopls v0.23.0, each installed at that exact version, never `latest`, and moved only through the `go-upgrade` skill (GO-GATE-08)." | "**Pinned** tool versions, re-checked 2026-11-27: Go 1.27.4, golangci-lint v2.15.0 (bundling staticcheck 2026.2.2), govulncheck v1.8.0 and gopls v0.23.0, each installed at that exact version, never `latest`, and moved only through the `go-upgrade` skill (GO-GATE-08). The behaviour the rows describe was measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0, and those probes were not re-run on the new pins." | See source rows S1 to S4. Verification: `go version` prints `go1.27.4` and `golangci-lint version` prints `v2.15.0`; any other version in the gate run is the finding. Watched on the pins named, 2026-11-27, by reading; the version commands themselves cannot be watched red without installing the old tools, so this is a reading check under GO-CORE-02. |
| Severity paragraph pinned defaults (rules/go-quality.md, Severity) | "golangci-lint v2.14.0 with its three files, and the `check` target." | "golangci-lint v2.15.0 with its three files, and the `check` target." | S1, S2. Verification: `grep -n -e 'golangci-lint v2.1' rules/go-quality.md` prints v2.15.0 on the Pinned and Severity lines and v2.14.0 only in the provenance clause; a v2.14.0 pin anywhere else is the finding. |
| network.md header ("Binds to" line) | "Binds to Go 1.27.1, golangci-lint v2.14.0 and go-containerregistry v0.22.1, measured 2026-09-26." | "Binds to Go 1.27.4, golangci-lint v2.15.0 and go-containerregistry v0.22.1 (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0)." | S1 to S4; go-containerregistry has no tag after v0.22.1 (first round, Confirmed unchanged). Verification: the line names the same Go and golangci-lint versions as the rule's Pinned line; a mismatch is the finding. |
| security.md header ("Binds to" line) | "Binds to Go 1.27.1 and golangci-lint v2.14.0 with its bundled gosec (measured 2026-09-26)." | "Binds to Go 1.27.4 and golangci-lint v2.15.0 with its bundled gosec (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0)." | S1 to S4; gosec is bundled at the same version in v2.14.0 and v2.15.0 (first round, Confirmed unchanged). Verification: as for network.md. |

Source rows:

| Row | Source | What it shows |
|---|---|---|
| S1 | https://github.com/golangci/golangci-lint/releases/tag/v2.15.0 (first-party release page, 2026-10-16) | v2.15.0 exists and its changelog bumps honnef.co/go/tools from 0.8.1 to 0.8.2. |
| S2 | https://raw.githubusercontent.com/golangci/golangci-lint/v2.15.0/go.mod | v2.15.0 requires honnef.co/go/tools v0.8.2, the 2026.2.2 line (the version mapping is from the go-modules research, not from the release page). |
| S3 | https://github.com/dominikh/go-tools/releases/tag/2026.2.2 (first-party release page, 2026-10-12) | "Staticcheck now supports the updated export data format used by Go 1.27.2." |
| S4 | https://go.dev/doc/devel/release (read in go-quality/go-1-27-point-releases.md) | go1.27.4, released 2026-11-10, is the current Go 1.27 patch release. |

### New rules

None.

### Declined

- Rewriting the "Measured 2026-09-26 against ... golangci-lint v2.14.0 ... staticcheck 2026.2.1" headers in testing.md, errors.md, io.md, api-design.md, cli-contract.md, concurrency.md, language.md and observability.md, and the "Every row was measured or read 2026-09-26" line in network.md and security.md: these are provenance statements that are still true, and the probes were not re-run on v2.15.0, so changing them would make them false.
- Rewriting in-body version evidence (errors.md GO-ERR-05, GO-ERR-06, GO-ERR-19 and the errorlint note; network.md GO-NET-01; concurrency.md GO-CONC-10; security.md G117 note; language.md GO-LANG-04 and the analyzer-gap line): each records what was watched on the earlier versions, which is still true.
- Moving govulncheck to v1.10.0 or gopls to v0.24.0: not part of the confirmed item, and go-modules keeps both at the earlier pins until a re-measure.
- GO-ERR-05's SA4023 `_test.go` blind spot on staticcheck 2026.2.2: the first round's open question stands. The sentence names 2026.2.1, which is still true; re-run the planted fixture on 2026.2.2 before extending it.

### Edit list (spillover round)

1. File: `rules/go-quality.md`
   Find:
   ```
   **Pinned** tool versions, measured 2026-09-26: Go 1.27.1, golangci-lint
   v2.14.0, govulncheck v1.8.0 and gopls v0.23.0, each installed at that exact
   version, never `latest`, and moved only through the `go-upgrade` skill
   (GO-GATE-08). Gate on each step's exit status, never on its stdout:
   ```
   Replace with:
   ```
   **Pinned** tool versions, re-checked 2026-11-27: Go 1.27.4, golangci-lint
   v2.15.0 (bundling staticcheck 2026.2.2), govulncheck v1.8.0 and gopls v0.23.0,
   each installed at that exact version, never `latest`, and moved only through
   the `go-upgrade` skill (GO-GATE-08). The behaviour the rows describe was
   measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0, and those probes
   were not re-run on the new pins. Gate on each step's exit status, never on its stdout:
   ```

2. File: `rules/go-quality.md`
   Find:
   ```
   golangci-lint v2.14.0 with its three files, and the `check` target.
   ```
   Replace with:
   ```
   golangci-lint v2.15.0 with its three files, and the `check` target.
   ```

3. File: `skills/go-quality-reference/network.md`
   Find:
   ```
   Binds to Go 1.27.1, golangci-lint v2.14.0 and go-containerregistry v0.22.1, measured 2026-09-26.
   ```
   Replace with:
   ```
   Binds to Go 1.27.4, golangci-lint v2.15.0 and go-containerregistry v0.22.1 (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0).
   ```

4. File: `skills/go-quality-reference/security.md`
   Find:
   ```
   Binds to Go 1.27.1 and golangci-lint v2.14.0 with its bundled gosec (measured 2026-09-26).
   ```
   Replace with:
   ```
   Binds to Go 1.27.4 and golangci-lint v2.15.0 with its bundled gosec (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1 and golangci-lint v2.14.0).
   ```

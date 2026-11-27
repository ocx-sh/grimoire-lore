---
title: Go toolchain point releases and the 1.28 cycle (delta, 2026-09-26 to 2026-11-27)
pair: go-modules
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 9
---

# Go toolchain delta for the go-modules pair

This is a delta update. Claims not listed here are unchanged. Page contents were read through the WebFetch tool, which summarizes pages with a small model, so exact wording below is the tool's rendering of each page.

## Verdicts per claim

### 1. "Binds to Go 1.27.1" and GO-MOD-02 "toolchain go1.27.N, N the latest patch"

Verdict: changed.
- Latest 1.27.N on 2026-11-27 is go1.27.4, released 2026-11-10. Latest 1.26.N is go1.26.11, released 2026-11-10. Source: [go.dev/doc/devel/release](https://go.dev/doc/devel/release).
- Releases in the window:
  - go1.27.2 (2026-10-08) and go1.26.9: security fixes in the go command, crypto/tls, html/template, net/http, net/textproto, os. Also fixes in vet and go fix.
  - go1.27.3 (2026-10-19) and go1.26.10: security fix in crypto/x509 only.
  - go1.27.4 (2026-11-10) and go1.26.11: security fixes in cgo, the go command, the compiler, the linker and net/http.
- The release page lists no CVE identifiers; it links to GitHub milestones. The header text in the rule, gates.md and release.md should read "Go 1.27.4".
- go1.27.1 (2026-09-01) predates the window and was not marked as a security release.

### 2. GO-MOD-01 floors

Verdict: unchanged for 1.26 as the oldest supported release.
- The release page states the policy: a major release is supported until two newer major releases are out. Go 1.26.x is still receiving point releases (go1.26.11 on 2026-11-10), so 1.26 is still supported.
- Go 1.28 is scheduled for February 2027, week 2 (freeze November week 4 2026, RC1 December week 2 2026). Source: [Go release cycle wiki](https://go.dev/wiki/Go-Release-Cycle). The dates are targets. When 1.28 ships, 1.26 leaves support and the library floor moves to go 1.27.0. This is pending, not shipped.

### 3. GO-MOD-01 rationale: `go mod init` on 1.27.1 writes `go 1.27.1`

Verdict: could not determine for 1.27.x and tip.
- [golang/go#77860](https://github.com/golang/go/issues/77860) is closed (2026-03-04, milestone Go1.26.1). It was fixed by CL 749948, which reverted the default go directive change on release-branch.go1.26. The issue page shows no later behavior change.
- The go1.27 release notes and the go1.28 draft notes do not mention a go mod init default change. Absence from the notes is not proof of unchanged behavior, so no new value is claimed.

### 4. GO-MOD-04: removed GODEBUG settings

Verdict: unchanged for the 1.27 claim, with one addition for 1.28.
- The go1.27 notes confirm the claim: go recognizes removed settings in go.mod godebug lines and //go:debug comments; at the final default value the build proceeds, at an old value the go command fails. Source: [go.dev/doc/go1.27](https://go.dev/doc/go1.27). The godebug page itself does not state this rule.
- Removed in 1.27: asynctimerchan, tlsunsafeekm, tlsrsakex, tls3des, tls10server, x509keypairleaf, gotypesalias. Source: [go.dev/doc/godebug](https://go.dev/doc/godebug).
- Scheduled for 1.28: gotestjsonbuildtext (set in Go 1.24) is marked "removed in Go 1.28 at the earliest", with no firm date. The 1.28 draft notes list no GODEBUG removals. Pending. x509sslcertoverrideplatform and fips140ems are planned for 1.31.
- The 1.28 draft notes add two new settings: memoryprofile and tlsupki. Source: [tip.golang.org/doc/go1.28](https://tip.golang.org/doc/go1.28).

### 5. gates.md vet and go test claims

Verdict: pending for the 1.28 tree, unchanged otherwise.
- "stdversion joined go test in 1.27" is confirmed by the go1.27 notes. The same notes say go fix renamed waitgroup to waitgroupgo, removed fmtappendf, and added atomictypes, embedlit, slicesbackward and unsafefuncs. If gates.md lists the Go 1.26 modernizers by name, check these renames. The printf analyzer now also flags `%w` with a pointer to an error type.
- The 1.28 draft adds two vet analyzers: scannererr (unchecked error after a bufio.Scanner.Scan loop) and sqlrowserr (unchecked error after an sql.Rows.Next loop). The draft does not say whether go test runs them, so the count "12 of 35" cannot be updated. Draft, not shipped.
- The 1.27.2 and 1.26.9 notes mention vet fixes (bug fixes), not new analyzers.

### 6. release.md: golang/go#74763 and worktree stamping

Verdict: unchanged for the issue, could not determine for worktree stamping.
- [golang/go#74763](https://github.com/golang/go/issues/74763) is still open, labeled NeedsInvestigation, milestone Backlog (moved to Go1.27 on 2026-03-19, removed 2026-04-08, back to Backlog 2026-04-15), assigned, no fix CL. It reports "multiple VCS detected" errors; the workaround is `-buildvcs=false`.
- The page does not say whether 1.27.4 or tip stamps (devel) in git worktrees. The claim "go 1.27.1 only: git worktrees stamp fully" is neither confirmed nor refuted for later patches. Run `go version -m` on a binary built in a worktree with go1.27.4 to settle it.

### 7. GO-MOD-09: stdlib uuid surface

Verdict: unchanged.
- The master docs list Max, MustParse, New, NewV4, NewV7, Nil, Parse, and the methods AppendText, Compare, MarshalText, String, UnmarshalText. NewV6, NewSHA1 and NewMD5 are absent. Source: [pkg.go.dev/uuid@master](https://pkg.go.dev/uuid@master). Max, Nil and the text methods exist and may be worth naming in the rule.

### 8. GO-MOD-11 tool directive and GO-MOD-05 go.work

Verdict: unchanged. Neither the go1.27 notes nor the go1.28 draft mention a change to either.

## Normative candidates

1. Rule: bump the version header and GO-MOD-02 example to go1.27.4. Rationale: the latest patch carries security fixes. Verification: `grep -rn "1\.27\.1" rules/go-modules.md skills/go-modules-reference/`.
2. Rule (conditional on 1.28 shipping): raise the library floor to go 1.27.0 and the CLI floor to go 1.28.0. Rationale: 1.26 leaves support when 1.28 ships. Verification: `grep -n "go 1.26.0" rules/go-modules.md`.
3. Rule (optional note): a go.mod godebug line naming gotestjsonbuildtext should be dropped before 1.28. Rationale: scheduled removal. Verification: `grep -rn "gotestjsonbuildtext" --include=go.mod .`.
4. No new GO-MOD rule is required by any 1.28 proposal found; the proposal list was not fetched (see gaps).

## Gaps

- The accepted-proposal list for the 1.28 cycle, go.dev/ref/mod and go.dev/doc/toolchain were not fetched. Search for a go.work or tool-directive proposal was therefore only covered through the 1.28 draft notes.
- The go mod init default on 1.27.4 and tip was not verified by running it.

## Sources

| URL | What | Date |
|---|---|---|
| https://go.dev/doc/devel/release | Point release table | read 2026-11-27 |
| https://tip.golang.org/doc/go1.28 | 1.28 draft notes | read 2026-11-27 |
| https://go.dev/doc/go1.27 | 1.27 release notes | read 2026-11-27 |
| https://go.dev/doc/godebug | GODEBUG history | read 2026-11-27 |
| https://go.dev/wiki/Go-Release-Cycle | 1.28 schedule | read 2026-11-27 |
| https://github.com/golang/go/issues/74763 | Worktree VCS stamping issue | read 2026-11-27 |
| https://github.com/golang/go/issues/77860 | go mod init backport | read 2026-11-27 |
| https://pkg.go.dev/uuid@master | uuid API | read 2026-11-27 |

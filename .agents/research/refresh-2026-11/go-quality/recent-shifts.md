---
title: Recent upstream shifts needing a new go-quality rule, 2026-09-26 to 2026-11-27
pair: go-quality
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 19
---

# Recent upstream shifts needing a new go-quality rule

This is a delta against the 2026-09-26 baseline. Everything not named here is unchanged. Web pages were read through WebFetch, which returns a small model's rendering of the page, so quoted wording is that rendering. Exclusions: go.mod directives, dependency hygiene, govulncheck triage and release builds belong to go-modules. Where a candidate touches that boundary it says so. The sibling file golangci-lint-staticcheck-gosec.md in this directory already covers linter and analyzer releases, so it is cited, not repeated.

## Table of contents

1. Summary
2. Findings (per area: changed, unchanged, none found)
3. Ranked candidate additions (eight)
4. Parked open questions
5. AI-agent angle
6. Contested / evolving
7. Sources

## Summary

- Eight candidates are ranked below. Two are bug-class gaps that exist today and need no new Go release: unchecked `bufio.Scanner.Err()` and `sql.Rows.Err()` after a loop (the pair never mentions either), and the Linux MPTCP default for listeners (CVE-2026-98432).
- Three candidates are patch-floor facts that attach to existing rows: `os.Root` junction escape on Windows (fixed in 1.27.2), the net/http hardening in 1.27.2 and 1.27.4, and the eMudhra trust denylist in 1.27.3. They do not need a new idiom, only an added floor sentence.
- Go 1.28 is not released (draft notes, targeted for February 2027 per the go-modules sibling file). Candidates drawn from it are marked forward-looking and must not be written as available today.
- No new stdlib API in the window supersedes an idiom the depth files teach. encoding/json/v2 is declared stable in the 1.27 blog post of 2026-11-04, which matches GO-LANG-04 and GO-LANG-11 as written.
- No new linter in the window mechanizes GO-LANG-08, GO-CONC-13, the t.FailNow-in-closure rule or GO-NET-06. golangci-lint v2.15.0 (2026-10-16) added none (sibling file).

## Findings

### 1. Claims at risk, with verdicts

| Claim in the pair | Verdict | Evidence |
|---|---|---|
| GO-NET-10: `Close` lets a connection be reused when at most 256 KiB is unread (go1.27.1) | changed, in detail only | The 2026-10-14 post says Transport now drains an unread HTTP/1 body "for up to 50 ms or 256 KB" and skips draining on `Connection: close`. The 256 KiB figure still holds. The 50 ms bound is new, and the post says the limits are internal and may change. Rule text stays valid; add the 50 ms bound to the rationale. [post](https://go.dev/blog/http-connection-reuse) |
| GO-OBS-12 goroutineleak profile caveats | unchanged | The 2026-09-02 post predates the window; its caveats (channel, select, sync types only; reachability hides leaks) match the row. [post](https://go.dev/blog/goroutine-leak-profiles) |
| GO-LANG-04 and GO-LANG-11 json/v2 | unchanged | The 2026-11-04 post: `encoding/json/v2` and `jsontext` are "stable and generally available in Go 1.27"; v1 is implemented on v2. [post](https://go.dev/blog/jsonv2) |
| GO-LANG-05 names `ReverseProxy.Director` to `Rewrite` as a manual rewrite | unchanged | Deprecation was accepted 2025-10-01 (issue 73161), before the window, calling Director "fundamentally insecure". [issue](https://github.com/golang/go/issues/73161) |
| Pair binds to Go 1.27.1 | changed (go-modules owns the pin) | Latest are 1.27.4 and 1.26.11 (2026-11-10). [release history](https://go.dev/doc/devel/release) |
| tracebacklabels default (go-observability, observability.md line 51) | could not determine | No fetched source in the window mentions it; the GitHub issue search was rate limited before that query ran. |
| FailNow in wg.Go and errgroup.Go closures needs an analyzer | could not determine | No accepted vet analyzer for it appears in the proposal minutes of the window or in the Go 1.28 draft notes. The search for a testinggoroutine change was rate limited. Treat as still a reading heuristic. |
| M-H-12 ServeMux patterns, M-H-13 net/netip | could not determine | Nothing in the window's minutes or 1.28 notes changes them. The 1.28 draft adds `net.IPMask`/`IPNet`/`HardwareAddr` text unmarshalling (proposal 29678, accepted 2026-11-04). |
| M-H-14 CrossOriginProtection | could not determine, two open issues | Issues 82752 and 82753 (2026-11-11/12, open) concern nil receiver and fail-fast behavior of `(*CrossOriginProtection).Handler`. No behavior change shipped. [82753](https://github.com/golang/go/issues/82753) was seen only as a search row. |
| M-H-14 ReverseProxy.Rewrite | unchanged | See Director row. A new open issue 82939 (2026-11-12) says ReverseProxy drops request trailer values; not read in detail. |
| go-testing coverage-scope on `go test -coverprofile` at 1.27 | changed, a new hazard | Issue 81824 (opened 2026-09-29, open, go1.27.1): after a cached test result and `go clean -testcache`, the profile contains duplicated blocks; `go tool cover -func` still shows a normal percentage, `count`/`atomic` hit counts inflate, and tools that reject duplicate blocks fail. A fix is proposed in CL 840485 / PR 81826. [issue](https://github.com/golang/go/issues/81824) |

### 2. Security releases in the window

Source for all rows: [go1.27.2 announcement](https://groups.google.com/g/golang-dev/c/DaXYwdKVkRA) (2026-10-08, 15 fixes), [go1.27.4 announcement](https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ) (2026-11-10, 12 fixes, 11 of them cgo and linker, owned by go-modules), [eMudhra post](https://go.dev/blog/emudhra-incident) (2026-10-26), and the vulnerability list at [pkg.go.dev/vuln](https://pkg.go.dev/vuln/list) (GO-2026-6848 to 6859 on 2026-11-11, GO-2026-6809 on 2026-10-21). The two announcements disagree with a third-party write-up on some CVE numbers; the announcement numbers are used.

- Guarded by existing rows once the toolchain floor is met, no new idiom: HTTP/2 server HPACK race (CVE-2026-97032), HTTP/2 Trailer memory exhaustion (CVE-2026-78659), HTTP/2 SETTINGS window CPU (CVE-2026-78669), HTTP/2 double flow-control refund (CVE-2026-78663), HTTP/2 transport malformed framing headers (CVE-2026-78660), HTTP/1 client desync after rejected CONNECT (CVE-2026-56866), HTTP/1 server parsing after a 2xx CONNECT (CVE-2026-94439), Range header with more than 200 ranges now ignored (CVE-2026-78667), multipart MIME header line read unbounded (CVE-2026-94440), ECH outer-extension memory exhaustion (CVE-2026-97031), html/template JavaScript context fixes (CVE-2026-94448, CVE-2026-97030), `MaxBytesReader` header race in the HTTP/1 server (CVE-2026-97054).
- Not guarded: `os.Root.Mkdir` and `MkdirAll` follow a junction out of the root on Windows (CVE-2026-56857, issue 81739, fixed in 1.27.2). GO-IO-02 teaches `os.Root` as the confinement and io.md says the Windows leg matters; the floor is not stated.
- Not guarded: the eMudhra intermediates. 1.27.3 and 1.26.10 block trust in certificates chaining to eight compromised intermediates; Linux uses Go's own verifier with no revocation check, so only the rebuilt binary is safe. Users must rebuild, not only upgrade. GO-2026-6809 (2026-10-21) records it.
- Not guarded: CVE-2026-98432 (announcement 2026-10-29). A Linux kernel use-after-free reachable through IPv4 TCP; a public exploit uses MPTCP listeners. Go changed nothing and calls disabling MPTCP a "fragile mitigation". Since Go 1.24 Linux listeners enable MPTCP by default. Mitigations: kernel patch first; `GODEBUG=multipathtcp=0`; `godebug multipathtcp=0` in go.mod; per socket `net.ListenConfig.SetMultipathTCP(false)`. [openwall post](https://www.openwall.com/lists/oss-security/2026/10/30/1). Go issue 82717 tracks it; read only through the post.
- The x/net advisories of 2026-10-08 and 2026-10-27 appeared only as golang-announce subjects; their content could not be read. Result: could not determine.

### 3. Go 1.28 draft (unreleased; every item forward-looking)

Source: [tip.golang.org/doc/go1.28](https://tip.golang.org/doc/go1.28).

- New vet analyzers `scannererr` (loop around `bufio.Scanner.Scan` without a scanner error check) and `sqlrowserr` (loop around `sql.Rows.Next` without an iteration error check).
- `net/http`: Transport pool rewritten, `MaxIdleConns`, `MaxIdleConnsPerHost` and `MaxConnsPerHost` now cover the combined HTTP/1 and HTTP/2 total; `Transport.CancelRequest` becomes a no-op (proposal 79040, accepted 2026-07-15); new `Server.HandleRequest`; `ProxyFromEnvironment` prefers lowercase proxy variables when both cases differ.
- `crypto/tls`: clients check server certificates against a local UPKI revocation cache, on by default when a cache is found; new `Config.UPKIRevocation`; `ErrUPKIRevoked`. `crypto/x509` parsers reject trailing data. The proposals (82402, 79043) are still open on GitHub as of their search rows.
- `testing/synctest.Subtest`; `sync.Counter`; `maps.Grow`; `regexp` iterator methods; `net/url.MustParse`; composite literals may omit the type wherever assignment context allows it (affects table-driven test style).
- `GOEXPERIMENT=vetfiles` (renamed 2026-10-31) guards running workspace-specified analyzers under `go test`; off by default until proposal 82464 is decided.
- Not in the draft: errors, context, os, os/exec, net/netip, iter, encoding/json, go fix modernizers.

### 4. Areas with nothing qualifying

- errors, context, os/exec, iter, log/slog, testing (beyond the above): none found. One 1.28 slog fix (`WithGroup("")` inserted an empty group in 1.27.1) is a bug fix, not an idiom change.
- GO-LANG-08 yield, GO-CONC-13 fan-out bounds, GO-NET-06 client Timeout mechanization: none found.
- New linters: none found (golangci-lint v2.15.0, [sibling file](golangci-lint-staticcheck-gosec.md)). gosec 2.30.0 adds G125 (url.JoinPath escaping) but is not yet bundled in golangci-lint.
- Conference talks: the Go team's 2026-11-10 birthday post is the only item read. It says assistants reproduce older training-data patterns and points to `go fix` modernizers and `//go:fix inline`. No GopherCon talk was fetched. Result: could not determine for talks.

## Normative guidance candidates

Ranked, at most eight. Severity uses the pair's MUST/SHOULD scale.

1. **Check the error after a Scan or Next loop.** Rule: after `for sc.Scan() { ... }` read `sc.Err()`; after `for rows.Next() { ... }` read `rows.Err()`; return it. Rationale: a read error or oversized token ends the loop exactly like EOF, so the program silently processes a truncated input. Source: Go 1.28 draft notes, vet `scannererr` and `sqlrowserr`, read 2026-11-27 (forward-looking for the analyzers; the rule is valid today). File: errors.md. Severity: MUST. Mechanical: from 1.28, `go vet ./...`; today a reading heuristic (grep `\.Scan()` and `\.Next()` and require `.Err()` in the same function), or golangci-lint `rowserrcheck`, which was not checked here. The pair has no existing hit for `Scanner.Err` or `rows.Err`.
2. **Pin the `os.Root` Windows junction fix.** Rule: GO-IO-02 states that on Windows `Root.Mkdir` and `Root.MkdirAll` need Go 1.27.2 or 1.26.9 or later, and a Windows-supported tool built earlier is a finding. Source: go1.27.2 announcement 2026-10-08, CVE-2026-56857, issue 81739. File: io.md. Severity: MUST. Mechanical: `go version -m <binary>` prints the build toolchain; `govulncheck -mode=binary <binary>` reports it. Boundary: the toolchain pin itself is go-modules.
3. **Declare the net/http patch floor for servers.** Rule: a service that exposes `net/http` is built with 1.27.4 or 1.26.11 or later; GO-SEC-05 and GO-NET rows cite the floor beside `MaxBytesReader`, Range, multipart and HTTP/2 limits. Source: go1.27.2 and go1.27.4 announcements, 2026-10-08 and 2026-11-10. File: network.md. Severity: SHOULD (rises to MUST for a binary facing untrusted clients). Mechanical: `govulncheck -mode=binary`, `go version -m`.
4. **Make the MPTCP choice explicit on Linux listeners.** Rule: every `net.ListenConfig` that serves untrusted clients calls `SetMultipathTCP` with a deliberate value, or the main module sets `godebug multipathtcp=0`; a listener never relies on the 1.24 default. Rationale: the 2026-10-29 kernel use-after-free is reachable through MPTCP listeners and Go declined to change the default. Source: the openwall post of 2026-10-30. File: network.md. Severity: SHOULD, with a note that the kernel patch is the real fix. Mechanical: grep `ListenConfig` and `net.Listen(` for a missing `SetMultipathTCP`; `grep -n multipathtcp go.mod`. The `go.mod` half touches go-modules; the listener half stays here.
5. **Rebuild after a trust-store security release.** Rule: after the eMudhra-style release a binary that uses `crypto/tls` or `net/http` is rebuilt with 1.27.3 or later, and a build is judged by `go version -m`, never by the host `go version`. Source: Go blog 2026-10-26, GO-2026-6809. File: security.md. Severity: SHOULD. Mechanical: `go version -m <path>`. Overlaps go-modules (release builds); keep only the one-line verification in security.md.
6. **Cover-profile duplication check in the coverage gate.** Rule: the 100% gate script run `go clean -testcache` (or `-count=1`) before `go test -coverprofile`, and fail if the profile has duplicate block lines. Source: issue 81824, opened 2026-09-29, still open. File: testing.md (the coverage block near line 191). Severity: SHOULD. Mechanical: `sort cover.out | uniq -d` must be empty. Fix is not released; revisit when CL 840485 lands.
7. **No `Transport.CancelRequest`.** Rule: cancel through the request context, never `Transport.CancelRequest`; it becomes a no-op in 1.28. Source: Go 1.28 draft notes and proposal 79040 (accepted 2026-07-15, before the window; first seen as a 1.28 behavior change in the window). File: network.md. Severity: SHOULD. Mechanical: `grep -rn 'CancelRequest('` empty (SA1019 will flag it once the deprecation marker is released; not confirmed). Forward-looking only for the no-op.
8. **Pool-limit meaning under 1.28.** Rule: GO-NET-03's `MaxIdleConnsPerHost` and `MaxConnsPerHost` numbers are re-derived when the `go` line passes 1.28, because they then count HTTP/1 and HTTP/2 together. Source: Go 1.28 draft notes. File: network.md. Severity: SHOULD, forward-looking. Mechanical: reading heuristic on the constructor named by GO-NET-06.

Not recommended: any json/v2, goroutineleak or ReverseProxy.Director addition; they are covered (rows above).

## Parked open questions

- go-concurrency FailNow in closures: still a reading heuristic, could not determine otherwise.
- go-testing coverage scope: new input is issue 81824 (candidate 6); the original three sub-questions are not answered by any source in the window.
- go-network M-H-12 to M-H-14: no upstream change for ServeMux patterns and netip; CrossOriginProtection has two open issues; `ReverseProxy.Rewrite` is settled by the 2025 Director deprecation.
- go-observability tracebacklabels: could not determine.

## AI-agent angle

- An agent trained before this window writes `for sc.Scan()` or `for rows.Next()` and ends the function; the compile and the tests pass. Check: candidate 1.
- An agent writes `&http.Server{...}` with `ListenAndServe` and a default Linux listener and never considers MPTCP. Check: candidate 4 grep.
- An agent copies `io.Copy(io.Discard, resp.Body)` or `CancelRequest` from old answers. The 2026-11-10 post says assistants reproduce older patterns; check with the GO-NET-10 grep and candidate 7 grep.
- An agent reports the host `go version` as proof a binary is patched. Check: `go version -m <binary>`.

## Contested / evolving

- MPTCP: the Go security team calls disabling it fragile and declines a default change (2026-10-29); the issue 82717 discussion could still change that.
- Cover profile duplication (81824) is open, so any gate written now may need a revision at the fix.
- Go 1.28 UPKI revocation is a draft note; the proposal 82402 was open when last seen.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://go.dev/blog/all | Go blog index | read 2026-11-27 | window post list |
| https://go.dev/blog/jsonv2 | json/v2 GA post | 2026-11-04 | json claim unchanged |
| https://go.dev/blog/emudhra-incident | eMudhra response | 2026-10-26 | candidate 5 |
| https://go.dev/blog/http-connection-reuse | HTTP/1 reuse | 2026-10-14 | GO-NET-10 detail |
| https://go.dev/blog/goroutine-leak-profiles | goroutineleak | 2026-09-02 | unchanged claim |
| https://go.dev/blog/17years | birthday and agents | 2026-11-10 | agent angle |
| https://go.dev/doc/devel/release | release history | read 2026-11-27 | 1.27.2 to 1.27.4 |
| https://groups.google.com/g/golang-dev/c/DaXYwdKVkRA | 1.27.2 announcement | 2026-10-08 | candidates 2, 3 |
| https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ | 1.27.4 announcement | 2026-11-10 | candidate 3 |
| https://groups.google.com/g/golang-announce | thread index | read 2026-11-27 | post subjects |
| https://www.openwall.com/lists/oss-security/2026/10/30/1 | CVE-2026-98432 protection | 2026-10-30 | candidate 4 |
| https://www.openwall.com/lists/oss-security/2026/10/08/9 | 1.27.2 mirror | 2026-10-08 | CVE cross-check |
| https://pkg.go.dev/vuln/list | vuln database list | read 2026-11-27 | GO-2026-6809, 6848 to 6859 |
| https://tip.golang.org/doc/go1.28 | 1.28 draft notes | read 2026-11-27 | candidates 1, 7, 8 |
| https://github.com/golang/go/issues/33502 (comments via gh api) | proposal minutes | 2026-09-30 to 2026-11-18 | accepted list |
| https://github.com/golang/go/issues/81824 | cover profile duplication | 2026-09-29 | candidate 6 |
| https://github.com/golang/go/issues/73161 | Director deprecation | 2025-10-01 | M-H-14 |
| https://github.com/golang/go/issues/80416 | ReverseProxy Upgrade fix | closed 2026-07-17 | M-H-14 context |
| https://github.com/golang/go/issues/82690, 82173, 79043, 82402 | vetfiles, form parsing, TLS profiles, UPKI | 2026-10 | forward-looking items |

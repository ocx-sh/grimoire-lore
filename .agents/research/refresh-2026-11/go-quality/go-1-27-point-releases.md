---
title: Go 1.27 point releases 1.27.2 to 1.27.4 against claims measured on go1.27.1
pair: go-quality
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 12
scope: Delta only. Covers go1.27.2, go1.27.3 and go1.27.4 (all released inside the window 2026-09-26 to 2026-11-27) and every claim in the go-quality pair that was measured on go1.27.1. Does not cover go.mod directive policy, govulncheck triage, or release builds (go-modules).
---

# Go 1.27 point releases against go1.27.1 claims

## Table of contents

1. Summary
2. Findings: current release and per-claim verdicts
3. Security fixes in the window
4. Normative guidance candidates
5. AI-agent angle
6. Contested / evolving
7. Sources

## Summary

- The current Go 1.27 patch release is go1.27.4, released 2026-11-10 ([release history](https://go.dev/doc/devel/release)). Between the baseline (go1.27.1, released 2026-09-01) and now there are three releases: go1.27.2 (2026-10-08), go1.27.3 (2026-10-19), go1.27.4 (2026-11-10).
- Every measured source-level claim at risk is unchanged. The comparison was done by diffing the go1.27.1 and go1.27.4 source files directly (tags fetched from raw.githubusercontent.com/golang/go) and by reading the compare list `go1.27.1...go1.27.4`.
- One claim needs a qualification: GO-LANG-11 (v1 JSON output byte-identical under the default and `nojsonv2`). On go1.27.1, Marshal called MarshalText on map keys of named string kind, a regression against Go 1.26 behavior. That was fixed in go1.27.2. The claim is true on 1.27.2 and later; on 1.27.1 it had at least that exception.
- Only one GODEBUG setting changed: a new `httpservecontentmaxranges` (default Range limit 200) arrived with go1.27.2. No GODEBUG default that the pair cites (`tarinsecurepath`, `zipinsecurepath`, TLS settings, `jsonv2`, `nogreenteagc`) moved.
- The pinned toolchain "Go 1.27.1" is now two security releases behind on net/http, os, crypto/tls and cmd/go. As a fact: go1.27.4 is current and fixes net/http and cgo/cmd/go issues that go1.27.1 has. The move itself is go-modules' GO-GATE-08 decision.

## Findings

### 1. Current release

go1.27.4, released 2026-11-10. Entry text: "includes security fixes to cgo, the `go` command, the compiler, the linker, and the `net/http` package, as well as bug fixes to the assembler, the compiler, the runtime, toolchain bootstrapping, and the `crypto/fips140`, `crypto/hkdf`, `crypto/rsa`, `crypto/tls`, and `net` packages." Source: [go.dev/doc/devel/release](https://go.dev/doc/devel/release). Tag commit: `7b2881024c95a11ddb86663a616340aa3a88b67f`.

Other entries in the window:
- go1.27.2 (2026-10-08): security fixes to the go command, crypto/tls, html/template, net/http, net/textproto and os; bug fixes include encoding/json, encoding/json/v2, vet, compress/flate, crypto/mlkem.
- go1.27.3 (2026-10-19): security fix to crypto/x509 only (CVE-2026-111943, "mitigation for security concerns with a specific Certificate Authority", [go.dev/issue/82345](https://github.com/golang/go/issues/82345)).

### 2. Claim-by-claim verdicts

| Claim (file) | Verdict | Evidence |
|---|---|---|
| "Pinned tool versions, measured 2026-09-26: Go 1.27.1" (rules/go-quality.md) | changed | Measurement date stays true, but go1.27.4 (2026-11-10) is current. The pin line should be re-measured or annotated with the successor. |
| "go vet ./... # 2 all 35 vet analyzers (go test runs 12)"; GO-CORE-03 "runs 12 on 1.27.1" | unchanged | `src/cmd/go/internal/test/test.go` `defaultVetFlags` and `src/cmd/vet/main.go` have an empty diff between go1.27.1 and go1.27.4. The 12 enabled flags are unchanged (the active `"-..."` lines in `defaultVetFlags`: atomic, bools, buildtag, directive, errorsas, ifaceassert and six more, 12 in total). go1.27.2 fixed [#81861](https://github.com/golang/go/issues/81861) (vet reported no diagnostics for a package earlier vetted as a dependency, a cache-key bug fixed by "cmd/go: include VetxOnly in the vet action ID"); this affects reliability of `go vet`, not the analyzer sets. The count 35 was not re-derived; I could not count the vet suite programmatically from main.go (it uses a different registration form), but the file is byte-identical, so the count is unchanged. |
| network.md "DefaultMaxIdleConnsPerHost = 2" | unchanged | go1.27.4 `src/net/http/transport.go:62`: `const DefaultMaxIdleConnsPerHost = 2`. |
| network.md "at most 256 KiB is unread" | unchanged | go1.27.4 `transport.go:2420`: `const maxPostCloseReadBytes = 256 << 10`; `server.go:1160`: `maxPostHandlerReadBytes = 256 << 10`. Note: `maybeDrainBody` now also discards trailers before draining (go1.27.2, [#81522](https://github.com/golang/go/issues/81522)); the limit itself did not move. |
| network.md "defaultCheckRedirect stops at 10 hops" | unchanged | go1.27.4 `src/net/http/client.go:846`: `if len(via) >= 10 { return errors.New("stopped after 10 redirects") }`. |
| network.md "no per-Read body deadline exists" | unchanged | No diff in `client.go`; no release note in 1.27.2-1.27.4 adds a body read deadline. Absence claim: could not be proven exhaustively from release notes alone, but the milestone titles list no such feature. |
| io.md GO-IO-05 "tarinsecurepath and zipinsecurepath still default to permissive in toolchain 1.27.1" | unchanged | go1.27.4 `src/internal/godebugs/table.go:63` and `:83` list `tarinsecurepath` and `zipinsecurepath` with no `Changed`/`Old` fields, identical to 1.27.1. No archive/tar or archive/zip file appears in the go1.27.1...go1.27.4 diff. |
| security.md "crypto/tls defaults on Go 1.27.1: minimum version TLS 1.2, and the default key exchanges already include the ML-KEM hybrids" | unchanged | `src/crypto/tls/defaults.go` has an empty diff; it still lists `X25519MLKEM768, SecP256r1MLKEM768, SecP384r1MLKEM1024, MLKEM1024`. `common.go` still sets the TLS 1.2 floor (`c.MinVersion == 0 && v < VersionTLS12`). Two crypto/tls edits in the window do not change these defaults: ML-DSA is omitted from `signature_algorithms_cert` ([#82536](https://github.com/golang/go/issues/82536), go1.27.4: "Omit ML-DSA from signature_algorithms_cert in Go 1.27 to work around non-compliant middleboxes"), and ECH outer extension references are validated (CVE-2026-97031, go1.27.2). |
| cli-contract.md and concurrency.md "NotifyContext's cause is an unexported string with no signal accessor (1.27.1 os/signal/signal.go)" | unchanged | `src/os/signal/signal.go` has an empty diff; go1.27.4 line 306 still reads `c.cancel(signalError(s.String() + " signal received"))` with an unexported `signalError`. |
| observability.md "The nogreenteagc opt-out ... is still accepted by 1.27.1"; GO-OBS-22 stamp "go1.27.1-X:nogreenteagc" | unchanged for acceptance; stamp text changed by definition | `src/internal/buildcfg/exp.go` has an empty diff; `GreenTeaGC: true` at line 86 in both tags, so the `nogreenteagc` GOEXPERIMENT negation is still accepted. Any stamp is toolchain-version specific, so the example becomes `go1.27.4-X:nogreenteagc` only if the pin moves. |
| language.md GO-LANG-11 "v1 output is byte-identical under the 1.27.1 default and nojsonv2" | changed (qualified) | go1.27.2 fixed [#81362](https://github.com/golang/go/issues/81362), "encoding/json: Marshal now honors MarshalText for string-kind map keys", described by the author as "a regression where MarshalText is called on map keys of string kind, when it previously it did not in Go 1.26" (commit "encoding/json: avoid calling MarshalText on named string map keys"). It also fixed [#81084](https://github.com/golang/go/issues/81084) (Unmarshal left ±Inf in the destination on float overflow) and [#81229](https://github.com/golang/go/issues/81229) (`UnsupportedValueError.Value` was not populated). So under the go1.27.1 default, v1 output differed from `nojsonv2` for named-string map keys that implement `encoding.TextMarshaler`. From go1.27.2 on, the claim holds again. `JSONv2: true` is still the build default in go1.27.4. |

### 3. GODEBUG movement

go1.27.4 `src/internal/godebugs/table.go` differs from go1.27.1 by exactly one line: `{Name: "httpservecontentmaxranges", Package: "net/http", Changed: 26, Old: "1"}`. The announcement says the setting sets the Range limit (default 200) and `GODEBUG=httpservecontentmaxranges=0` disables it ([oss-security, 2026-10-08](https://www.openwall.com/lists/oss-security/2026/10/08/9)). This is new behavior for `http.FileServer`, `ServeContent` and `ServeFile`; it is not a default the pair cites. No other GODEBUG default moved.

## Security fixes in the window

Scope filter: net/http, archive/tar, archive/zip, os, os/exec, crypto/tls, encoding/json (plus neighbors noted). Sources: [go1.27.2 announcement text](https://www.openwall.com/lists/oss-security/2026/10/08/9), [go1.27.4 announcement](https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ), issue titles read through the GitHub API.

go1.27.2 (2026-10-08):

| CVE | Package | Fix |
|---|---|---|
| CVE-2026-97032 | net/http | HTTP/2 server crash from a race in the HPACK encoder when a client changes the header table size |
| CVE-2026-78659 | net/http | HTTP/2 server memory exhaustion via many fields in Trailer headers |
| CVE-2026-56866 | net/http | HTTP/1 client connection desynchronization after a rejected CONNECT |
| CVE-2026-94439 | net/http | HTTP/1 server kept parsing HTTP after a 2xx CONNECT response (request smuggling) |
| CVE-2026-78669 | net/http | CPU exhaustion from repeated initial window size changes |
| CVE-2026-78660 | net/http | HTTP/2 transport accepted malformed framing headers (response smuggling behind a reverse proxy) |
| CVE-2026-78667 | net/http | No limit on Range header ranges (FileServer, ServeContent, ServeFile); adds GODEBUG `httpservecontentmaxranges` |
| CVE-2026-78663 | net/http | HTTP/2 server refunded flow control twice for reset streams |
| CVE-2026-97031 | crypto/tls | Malformed ECH outer extension references rejected (memory exhaustion) |
| CVE-2026-56857 | os | Windows: Root.Mkdir and Root.MkdirAll could follow a junction out of the root |
| CVE-2026-94440 | net/textproto, mime/multipart | Memory limit bypass parsing MIME headers |
| CVE-2026-94444, CVE-2026-94447 | cmd/go | fips140 and toolchain checksum bypass via malicious GOMODPROXY |
| CVE-2026-94448, CVE-2026-97030 | html/template | Template-literal and `yield` context escaping |

go1.27.3 (2026-10-19): CVE-2026-111943, crypto/x509 (not in the filter list; noted for completeness).

go1.27.4 (2026-11-10): CVE-2026-97054 net/http, HTTP/1 server crash when `MaxBytesReader` or `MaxBytesHandler` hits its limit while the handler writes headers (header race). Source diff confirms: go1.27.1 `server.go` set `Connection: close` unlocked in the limit path; go1.27.4 uses `requestBodyLimitHit atomic.Bool`. Eleven further fixes (CVE-2026-97033 to CVE-2026-97043) are cgo/linker/cmd/go build-time code execution issues; none touch the filter packages.

Not touched by any fix in the window: archive/tar, archive/zip, os/exec, encoding/json (json changes were regression fixes, not security).

## Normative guidance candidates

1. Rule: when the pair states a measured toolchain, state go1.27.4 as the current patch and keep "measured on 1.27.1" only for the source-line citations that are byte-identical. Rationale: all cited source lines are identical at 1.27.4, so the claims stay valid; only the pin is stale. Verification: `git diff --no-index` of the cited files between tags `go1.27.1` and `go1.27.4` is empty (as done here).
2. Rule: GO-LANG-11 gains the qualifier "from go1.27.2; go1.27.1 honored MarshalText on named string map keys under the v2-backed default". Rationale: avoids a false byte-identity claim for pins at 1.27.0 or 1.27.1. Verification: `go test` on a map with named string keys implementing `MarshalText`, run under default and `GODEBUG=jsonv2=0` / `GOEXPERIMENT=nojsonv2`, comparing output.
3. Rule: network.md may add that `http.FileServer`, `ServeContent` and `ServeFile` limit Range requests (default 200) from go1.27.2, tunable with `GODEBUG=httpservecontentmaxranges`. Rationale: a new knob that changes served responses. Verification: grep `httpservecontentmaxranges` in `src/internal/godebugs/table.go` of the pinned toolchain.
4. Rule: handlers using `http.MaxBytesReader` require toolchain >= go1.27.4. Rationale: CVE-2026-97054 is a server crash. Verification: `go version` and `govulncheck ./...` report no GO-2026 entry for CVE-2026-97054.
5. Rule: toolchain pin floor for services that serve HTTP/2 or the CONNECT method is go1.27.2. Rationale: eight net/http CVEs fixed there. Verification: `go version -m <binary>` shows go1.27.2 or later.

## AI-agent angle

- An agent copying the rule text will write "go1.27.1" into stamps and `toolchain` lines; the mechanical check is `grep -rn "go1.27.1" rules skills` after any pin decision.
- An agent may assume `nojsonv2` vs default json output are identical for every 1.27.x; the check is the map-key test in candidate 2.
- An agent may treat `tarinsecurepath`/`zipinsecurepath` as changed because of the 2026 security releases; they were not (empty diff).

## Contested / evolving

- Whether the pinned toolchain should move: the fact is that go1.27.4 is current with 28 security fixes across three releases (15 in 1.27.2, 1 in 1.27.3, 12 in 1.27.4), seven of them in the filter packages that the pair's rules cover, and 11 more in cgo build tooling. The decision belongs to go-modules GO-GATE-08.
- Could not determine: the exact count "35 vet analyzers" was not re-derived (source file unchanged); no per-Read body deadline absence was not exhaustively proven beyond the empty diff in `client.go` and the release notes.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://go.dev/doc/devel/release | Go minor release history (primary) | read 2026-11-27 | Release dates and package lists for 1.27.1 to 1.27.4 |
| https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ | golang-announce, Go 1.27.4 and 1.26.11 (primary) | 2026-11-10 | 12 CVEs with packages |
| https://www.openwall.com/lists/oss-security/2026/10/08/9 | oss-security copy of the Go 1.27.2 and 1.26.9 announcement (primary text) | 2026-10-08 | 15 CVEs and the new GODEBUG |
| https://github.com/golang/go/issues?q=milestone%3AGo1.27.2 | Go1.27.2 milestone (primary, read via API) | 2026-10 | Regression and bug list |
| https://github.com/golang/go/issues?q=milestone%3AGo1.27.3 | Go1.27.3 milestone (primary) | 2026-10 | Single x509 fix |
| https://github.com/golang/go/issues?q=milestone%3AGo1.27.4 | Go1.27.4 milestone (primary) | 2026-11 | Security and tls ML-DSA change |
| https://github.com/golang/go/compare/go1.27.1...go1.27.4 | Tag compare (primary) | 2026-11 | Proves empty diffs in cited files |
| https://github.com/golang/go/blob/go1.27.4/src/net/http/transport.go | go1.27.4 source, transport | 2026-11-10 | DefaultMaxIdleConnsPerHost, 256 KiB constant |
| https://github.com/golang/go/blob/go1.27.4/src/net/http/client.go | go1.27.4 source, client | 2026-11-10 | 10-redirect limit |
| https://github.com/golang/go/blob/go1.27.4/src/os/signal/signal.go | go1.27.4 source, signal | 2026-11-10 | NotifyContext cause |
| https://github.com/golang/go/blob/go1.27.4/src/internal/godebugs/table.go | go1.27.4 GODEBUG table | 2026-11-10 | New and unchanged GODEBUG entries |
| https://github.com/golang/go/blob/go1.27.4/src/cmd/go/internal/test/test.go | go1.27.4 source, defaultVetFlags | 2026-11-10 | The 12 go test vet flags |
| https://github.com/golang/go/issues/81362 | encoding/json MarshalText regression issue (primary) | 2026-10 | GO-LANG-11 qualification |

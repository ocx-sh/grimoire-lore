---
title: go-modules spillover check from go-quality, 2026-11-27
target: go-modules
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://go.dev/doc/devel/release
  - https://go.dev/blog/emudhra-incident
  - https://pkg.go.dev/vuln/GO-2026-6809
  - https://github.com/golangci/golangci-lint/releases/tag/v2.15.0
  - https://pkg.go.dev/golang.org/x/vuln?tab=versions
  - https://pkg.go.dev/golang.org/x/tools/gopls?tab=versions
  - https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ
  - https://groups.google.com/g/golang-dev/c/DaXYwdKVkRA
---

# go-modules spillover check

Origin: go-quality decision file `.agents/research/refresh-2026-11/go-quality.md` (Spillover section) and the delta artifacts `go-quality/go-1-27-point-releases.md` and `go-quality/recent-shifts.md`.

## Item 1: stale pins (Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.10.0, gopls v0.24.0; 28 security fixes missing in 1.27.1)

Verdict: confirmed by primary source for the versions and dates; the go-modules target is already correct for Go, golangci-lint and staticcheck, and deliberately keeps govulncheck and gopls at older pins.

Sources:
- https://go.dev/doc/devel/release (read 2026-11-27): go1.27.1 2026-09-01 (no security fixes listed), go1.27.2 2026-10-08, go1.27.3 2026-10-19, go1.27.4 2026-11-10 is the newest 1.27 entry.
- https://groups.google.com/g/golang-dev/c/DaXYwdKVkRA (2026-10-08): 15 security fixes. https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ (2026-11-10): 12 security fixes. go1.27.3 (2026-10-19) adds the one crypto/x509 fix (GO-2026-6809). 15 + 1 + 12 = 28, matching the item. The release page itself lists components, not counts, and I did not open a 1.27.3 announcement, so the "+1" is taken from the vuln entry.
- https://github.com/golangci/golangci-lint/releases/tag/v2.15.0: released October 16 (year not shown on the page); the changelog bumps honnef.co/go/tools 0.8.1 to 0.8.2, which is staticcheck 2026.2.2 (inferred, the page does not name it).
- https://pkg.go.dev/golang.org/x/vuln?tab=versions: v1.10.0 on 2026-11-17, v1.9.0 on 2026-10-11, v1.8.0 on 2026-09-08.
- https://pkg.go.dev/golang.org/x/tools/gopls?tab=versions: v0.24.0 on 2026-10-14, v0.23.0 on 2026-07-07.

Affected text in the target:
- `/home/mherwig/dev/ocx-sh/grimoire-lore/rules/go-modules.md` line 37-39: "Binds to Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.8.0 and goreleaser 2.20.3 (re-checked 2026-11-27; behaviour measured 2026-09-26 on Go 1.27.1, golangci-lint v2.14.0 and goreleaser 2.17.1)." Go, golangci-lint and staticcheck are already current.
- `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-modules-reference/gates.md` line 8: "Binds to Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.8.0 and gopls v0.23.0, re-checked 2026-11-27." Also line 39 "**gopls v0.23.0** carries the `yield` analyzer" and line 57 "gopls v0.23.0 on PATH". `release.md` line 8: "govulncheck v1.8.0".
- The `golangci/*.golangci.yml` headers say "Measured 2026-09-26, golangci-lint v2.14.0 built with Go 1.27.1." That is a measurement statement, true as written.

Decision already on file: `go-modules.md` decision says to keep govulncheck v1.8.0 and gopls v0.23.0 because v1.9.0 and v1.10.0 change only dependencies and the pins move only with a re-measure. The go-quality item is therefore correct on the facts and already acted on where the target could be made true without a re-measure.

Smallest change to be true on 2026-11-27: none required. Optional, only after re-running the govulncheck and gopls probes: change "govulncheck v1.8.0" to "govulncheck v1.10.0" and "gopls v0.23.0" to "gopls v0.24.0" in the three places above. Alternatively add the clause "(v1.10.0 and v0.24.0 are current; behaviour not re-measured)" to gates.md line 8.

## Item 2: rebuild crypto/tls and net/http binaries on go1.27.3 or later (eMudhra denylist, GO-2026-6809), judge by `go version -m`

Verdict: confirmed by primary source. The target says nothing about the eMudhra rebuild trigger.

Sources:
- https://go.dev/blog/emudhra-incident (dated 2026-10-26): Go 1.27.3 and 1.26.10, released October 19, contain the patch; "Binaries rebuilt with Go 1.27.3 and 1.26.10 will automatically reject certificates issued by the compromised eMudhra intermediates"; it advises `go version -m <path_to_your_binary>` to check the build toolchain. The post does not cite GO-2026-6809 by ID.
- https://pkg.go.dev/vuln/GO-2026-6809 (CVE-2026-111943, published 2026-10-21): crypto/x509 `Certificate.Verify` denylist; fixed in go1.26.10 and go1.27.3.
- Wording caveat: the post speaks of binaries rebuilt on those Go releases, not specifically of "crypto/tls and net/http" users. Scoping to those packages is go-quality's reading, since both verify through crypto/x509.

Affected text in the target: nothing mentions eMudhra, GO-2026-6809 or a rebuild trigger (grep of `rules/go-modules.md` and `skills/go-modules-reference/` returned no match). Nearest text, `rules/go-modules.md` line 143 (GO-MOD-16 rationale): "stdlib and go-command CVEs are fixed only in point releases (go1.27.4 fixed cgo build-time code execution)." The go-modules decision (line 77) deferred the rebuild trigger to the go-release skill as spillover.

Smallest change to make the target true: in the GO-MOD-16 rationale cell, extend the parenthesis to "(go1.27.4 fixed cgo build-time code execution; go1.27.3 added the eMudhra intermediate denylist, GO-2026-6809, which reaches a shipped binary only on rebuild, so judge a binary by `go version -m`, never by the host `go version`)". No rule ID, severity or check changes.

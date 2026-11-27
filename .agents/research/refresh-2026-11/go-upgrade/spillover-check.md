---
title: Spillover check for the go-upgrade skill (refresh 2026-11)
target: go-upgrade
date_researched: 2026-11-27
model: sonnet
sources_fetched: 14
---

# Spillover check: go-upgrade

Target files: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md and /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/references/probes.md.

Primary sources fetched: go.dev/doc/devel/release, go.dev/doc/godebug, go.dev/wiki/Go-Release-Cycle, tip.golang.org/doc/go1.28 (draft), the golangci-lint v2.15.0 release page and go.mod at that tag, pkg.go.dev version lists for govulncheck and gopls, the depguard v2.3.0 release page, dependabot-core issue 13520.

Pair disagreement to resolve first: the go-quality pair says to move the Go, golangci-lint, govulncheck and gopls pins. The go-modules decision file (go-modules.md) says to move Go and golangci-lint and to keep govulncheck v1.8.0, gopls v0.23.0 and nilness@v0.49.0 until a re-measure. The versions themselves are all confirmed. Which pins move is an owner decision, so the changes below separate "versions confirmed" from "move the pin".

## Item 1 (from go-quality): pins are stale

Item: Go 1.27.4, golangci-lint v2.15.0 (staticcheck 2026.2.2), govulncheck v1.10.0 and gopls v0.24.0 are current. Go 1.27.1 lacks 28 security fixes, so gate step 8 can go red.

Verdict: confirmed by primary source for the versions and dates. The count "28 security fixes" could not be confirmed: the release page lists fix categories, not a count.

Sources:
- https://go.dev/doc/devel/release: go1.27.1 2026-09-01 (no security fixes listed), go1.27.2 2026-10-08 ("security fixes to the `go` command, and the `crypto/tls`, `html/template`, `net/http`, `net/textproto`, and `os` packages"), go1.27.3 2026-10-19 (`crypto/x509`), go1.27.4 2026-11-10 (cgo, `go` command, compiler, linker, `net/http`).
- https://github.com/golangci/golangci-lint/releases/tag/v2.15.0: released 16 Oct. go.mod at the tag: `honnef.co/go/tools v0.8.2` (staticcheck 2026.2.2, the staticcheck release date 2026-10-12 comes from the go-modules artifact and was not re-fetched), `kisielk/errcheck v1.30.0`.
- https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck?tab=versions: v1.10.0 on Nov 17, 2026.
- https://pkg.go.dev/golang.org/x/tools/gopls?tab=versions: v0.24.0 on Oct 14, 2026.

Affected text in SKILL.md, Scope section: "dependency bump. Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0,
staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0 unless a line says
otherwise." This is a true statement of what was measured on 2026-09-26, so it is not false. The live pins are false as current values: "| golangci-lint pin | Exactly `v2.14.0`, bumped only through step A6 | Another exact version, never `latest` |", "| gopls pin for the `yield` step | `v0.23.0` |", and in step A3 "go get toolchain@go1.27.1   # CLI: the latest patch, strictly above the go line (GO-MOD-02)". Also "each watched red and green on Go 1.27.1 (measured 2026-09-26)" and the A7 text "`go1.27.1-X:nogreenteagc`".

Smallest change: in A3 replace `go1.27.1` with `go1.27.4` in the `go get toolchain@` line. Add the sentence "Re-checked 2026-11-27: Go 1.27.4, golangci-lint v2.15.0, staticcheck 2026.2.2, govulncheck v1.10.0, gopls v0.24.0; every probe and measured line below was run on the earlier versions." to Scope. Keep "Measured 2026-09-26" wording for the probes. Govulncheck and gopls pins: see item 3.

## Item 2 (from go-modules): move the golangci-lint pin to v2.15.0 and re-run the A6 probes

Item: SKILL.md line 59 says "Exactly v2.14.0"; move it to v2.15.0 and re-run the A6 probes on v2.15.0.

Verdict: confirmed by primary source that v2.15.0 is the newest release (16 Oct, https://github.com/golangci/golangci-lint/releases/tag/v2.15.0) and that errcheck moved 1.20.0 to 1.30.0, predeclared 0.2.2 to 0.3.0, staticcheck 0.8.1 to 0.8.2 (release notes and go.mod at the tag). The release notes give no behaviour detail for errcheck or predeclared. That the probes pass on v2.15.0 is not established: neither pair ran them (go-modules.md says "has not been executed"). Do not write "measured on v2.15.0" until they are run.

Affected text, SKILL.md "Pinned defaults" table: "| golangci-lint pin | Exactly `v2.14.0`, bumped only through step A6 | Another exact version, never `latest` |". Also the A6 probe list (P1 to P6) is already present and already says to run them on a bump: "Run the dated re-probes in [references/probes.md](references/probes.md) on the new version, before trusting its verdicts". probes.md lines 7, 71, 119, 145, 170, 245 say "Measured on v2.14.0" and line 7 "golangci-lint v2.14.0 (built with go1.27.1, bundled staticcheck 0.8.1)".

Smallest change: replace `v2.14.0` with `v2.15.0` in the pin row only after P1 to P6 are run on v2.15.0. Until then leave the pin and probes.md unchanged and add one line to A6: "On a move from v2.14.0 to v2.15.0, errcheck (1.20.0 to 1.30.0), predeclared (0.2.2 to 0.3.0) and staticcheck (0.8.1 to 0.8.2) change, so P2, P4 and P5 and the predeclared and `--fix` checks are mandatory." Note: the item names "predeclared shadow mode", "the superset check" and "gosec emptied-excludes including G115". P3 covers G304 only in the target ("P3, gosec with `excludes` emptied, including G304"); adding G115 to that line is a small true improvement, since GO-GATE-14 lists `G104`, `G115`, `G304`. No P-number covers a predeclared probe in the target's A6 list, so the item's predeclared probe has no home (the target says nothing on predeclared). Add it as a new P7 only if the owner wants the probe.

## Item 3 (from go-modules): checklist additions

Item parts, each checked separately.

3a. depguard v2.3.0 prefix-match re-check for the 13 superseded entries once golangci-lint bundles it.
Verdict: confirmed by primary source. https://github.com/OpenPeeDeeP/depguard/releases/tag/v2.3.0 (tagged 29 Oct; the go-modules artifact says tag commit 2026-10-27): prefix matching ("`go` now matches `go.opentelemetry.io/`"), longest match wins, empty allow or deny entry errors, `$gostd` expands to exact entries. golangci-lint v2.15.0 go.mod still has `github.com/OpenPeeDeeP/depguard/v2 v2.2.1`. The "13 superseded entries" count comes from the go-modules artifact and was not re-counted here.
Target: says nothing on depguard version drift. Related text in SKILL.md B3: "`golangci-lint run ./...` reports each import on GO-MOD-08's depguard `superseded` list with a `desc` naming the replacement."
Smallest change: add to A6 step 2 a bullet: "P7, after a bump that raises the bundled depguard to v2.3.0 or later (it is v2.2.1 in golangci-lint v2.15.0): run `golangci-lint config verify` and plant an import of each superseded package; each must still report the `superseded` list, because v2.3.0 matches by prefix with longest match winning."

3b. govulncheck v1.10.0, gopls v0.24.0 and nilness@v0.53.0 as bump candidates tied to a re-measure.
Verdict: confirmed by primary source for govulncheck v1.10.0 (2026-11-17) and gopls v0.24.0 (2026-10-14). The nilness x/tools v0.53.0 tag (2026-11-17) was not re-fetched here; the go-modules artifact cites the module proxy. "Dependency-only" for govulncheck v1.9.0 and v1.10.0 rests on a clone diff in the artifact, not re-run here.
Target: "| gopls pin for the `yield` step | `v0.23.0` |" and the Scope line naming govulncheck v1.8.0. The target does not name nilness.
Smallest change: in the gopls pin row, change the second column to "`v0.23.0` measured 2026-09-26; v0.24.0 (2026-10-14) is current, move it with a re-measure". In Scope, append "govulncheck v1.10.0 (2026-11-17) and gopls v0.24.0 (2026-10-14) are newer; bump only with a re-measure date."

3c. Go 1.28 floor move (libraries to go 1.27.0, CLIs to go 1.28.0) and gotestjsonbuildtext removal.
Verdict: partly confirmed by primary source. Go 1.28 is not released: https://tip.golang.org/doc/go1.28 says "Go 1.28 is not yet released." https://go.dev/wiki/Go-Release-Cycle gives February week 2 for the release, November week 4 freeze, December week 2 RC1; the wiki does not name 1.28, so the dates are inferred from the cycle and may shift. The support rule is stated at https://go.dev/doc/devel/release: "Each major Go release is supported until there are two newer major releases." So 1.26 leaves support when 1.28 ships, which makes the library floor 1.27.0 and the CLI floor 1.28.0 a derived, conditional consequence, not an upstream statement. gotestjsonbuildtext: https://go.dev/doc/godebug says "This setting will be removed in a future release, Go 1.28 at the earliest." The 1.28 draft notes do not mention it. So the item's "removal" is not scheduled for 1.28, only possible at its earliest; the item overstates it.
Target: A3 "go get go@1.27.0            # CLI: the current release's .0 (GO-MOD-01)", the library check `1.26.0` in "test "$(printf '%s\n1.26.0\n' "$v" | sort -V | tail -n1)" = 1.26.0", and the Pinned defaults row "The oldest supported release's `.0`, `go 1.26.0` today, or lower." The target says nothing on gotestjsonbuildtext; A2 covers "A `godebug` line in `go.mod` naming a setting the new toolchain removed fails the build".
Smallest change: add one sentence under the A3 library bullet: "When Go 1.28 ships (scheduled February 2027, not shipped on 2026-11-27) the oldest supported release becomes 1.27, so the library floor moves to `go 1.27.0` and the CLI line to `go 1.28.0`; change the `1.26.0` in the floor check at that time." Add to A2: "`gotestjsonbuildtext` is documented as removable in Go 1.28 at the earliest; drop a `godebug gotestjsonbuildtext=1` line before moving to a toolchain that removes it." Do not state the removal as scheduled.

3d. Note that Dependabot does not bump the toolchain line.
Verdict: target already correct. https://github.com/dependabot/dependabot-core/issues/13520 ("Bump Go toolchain directive in go.mod files") is open, last activity October 14, 2026 (a cross-reference only). The issue is a request, not a statement that Dependabot never does it, but it confirms no support is shipped.
Affected text, SKILL.md: "**Nobody else opens the toolchain PR.** Dependabot never opens a PR for the
  `toolchain` line alone ([dependabot-core#13520](https://github.com/dependabot/dependabot-core/issues/13520),
  open, read 2026-09-26)."
Smallest change: update "read 2026-09-26" to "read 2026-11-27" if the owner wants the date refreshed. No content change is needed.

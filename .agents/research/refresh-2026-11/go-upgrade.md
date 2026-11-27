---
title: go-upgrade spillover round, refresh 2026-11
target: go-upgrade
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/go-upgrade/spillover-check.md
---

# go-upgrade spillover round

Contents: [Verdict](#verdict) · [Changed statements](#changed-statements) ·
[New rules](#new-rules) · [Declined](#declined) · [Sources](#sources) ·
[Revision log](#revision-log) · [Edit list (spillover round)](#edit-list-spillover-round)

## Verdict

1. The first round left both skill files untouched, so every edit below builds on the 2026-09-26 text.
2. The pair disagreement on which pins move is already settled by the two rule-pair decisions of this refresh. Both go-modules and go-quality moved Go to 1.27.4 and golangci-lint to v2.15.0, and both kept govulncheck v1.8.0 and gopls v0.23.0 until a re-measure. GO-GATE-08 now requires v2.15.0 or later on a go1.27.2 or later toolchain, so a skill default of v2.14.0 would contradict the rule it enforces. The skill follows the rules.
3. The 2026-09-26 measurements stay as provenance. Every "Measured 2026-09-26" and "watched on Go 1.27.1" line is still a true statement of what was run, and the probes were not re-run on v2.15.0. The edits say so instead of rewriting those lines.
4. New guidance: one dated re-check for the depguard v2.3.0 prefix-matching change, and one sentence on the Go 1.28 floor move. Both are conditional on events that have not happened on 2026-11-27.
5. No step ID is added, renumbered or retired. P1 to P6 keep their numbers. The depguard re-check is an unnumbered dated re-check inside A6, following the pattern of A3, A4 and A5.
6. Budgets: SKILL.md grows from 398 to about 407 lines, probes.md from 248 to 251. Both keep their tables of contents.
7. Bump: `minor` for the skill, because the depguard re-check and the Go 1.28 note are new guidance.

## Changed statements

| Location | Old text | New text | Verification |
|---|---|---|---|
| SKILL.md, Scope | "Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0 unless a line says otherwise." | The same sentence, followed by the 2026-11-27 pins, the statement that no measured line was re-run on them, and the newer govulncheck and gopls releases that move only with a re-measure. | `go version` prints `go1.27.4` and `golangci-lint version` prints `v2.15.0` in the gate run; any other version is the finding (a reading check). |
| SKILL.md, Pinned defaults header | "Default (2026-09-26)" | "Default (re-checked 2026-11-27)" | The library and CLI rows still hold: Go 1.26 still receives point releases and Go 1.28 is unreleased, so `go 1.26.0` and `go 1.27.0` stand. |
| SKILL.md, golangci-lint pin row | "Exactly `v2.14.0`, bumped only through step A6" | "Exactly `v2.15.0` (bundling staticcheck 2026.2.2), bumped only through step A6. P1 to P6 were measured on v2.14.0 and not re-run on v2.15.0" | `golangci-lint version` prints `v2.15.0`; matches GO-GATE-08's own version check. |
| SKILL.md, gopls pin row | "`v0.23.0`" | "`v0.23.0`. v0.24.0 (2026-10-14) is newer and moves only with a re-measure" | `gopls version` prints `v0.23.0` in the gate's step-10 install (a reading check). |
| SKILL.md, A3 command block | "`go get toolchain@go1.27.1   # CLI: the latest patch, ...`" | "`go get toolchain@go1.27.4   # CLI: the latest patch, ...`" | `grep -e '^toolchain' go.mod` prints `toolchain go1.27.4` after the command in a CLI module. |
| SKILL.md, A6 step 2, P3 bullet | "P3, gosec with `excludes` emptied, including G304 (GO-GATE-14)." | "P3, gosec with `excludes` emptied, including G304, and G115, which stays excluded until this run shows it clean (GO-GATE-14)." | probes.md P3 already re-justifies every `G104`, `G115` or `G304` hit of the no-excludes run; GO-GATE-14's first-round rationale ties G115's exclusion to that run. |
| probes.md, header | "Measured 2026-09-26 against Go 1.27.1, golangci-lint v2.14.0 (built with go1.27.1, bundled staticcheck 0.8.1) and standalone staticcheck 2026.2.1." | The same sentence, followed by the v2.15.0 pin move, its bundled errcheck 1.30.0 and staticcheck 0.8.2, and that no probe was re-run on it. | Each probe's own "Measured on" line is the verification once run on v2.15.0. |

## New rules

| Location | Text | Verification |
|---|---|---|
| SKILL.md, A6, new dated re-check after step 4 (GO-MOD-08) | On every golangci-lint bump, read the bundled depguard version. v2.15.0 bundles v2.2.1. When a bump raises it to v2.3.0 or later (prefix matching, longest match wins, an empty entry errors), run `config verify` on all three files and plant one import of each `superseded` entry; each must still report its `desc`. | `go version -m "$(command -v golangci-lint)" \| grep -e 'OpenPeeDeeP/depguard'` prints the bundled version. Not watched; the version line comes from the v2.15.0 go.mod. |
| SKILL.md, A3 library bullet | When Go 1.28 ships (planned for February 2027, unreleased on 2026-11-27), 1.26 leaves support: the library floor becomes `go 1.27.0`, the CLI line `go 1.28.0`, and the `1.26.0` in the floor check changes with them. | The library floor check in A3, with `1.26.0` replaced, exits 1 on a `go 1.26.0` line. |

## Declined

- Item 1, "Go 1.27.1 lacks 28 security fixes": the release page lists fix categories, not a count. Unconfirmed, not written.
- Item 1, A7's `go1.27.1-X:nogreenteagc` example and the "watched red and green on Go 1.27.1" lines: true provenance of the 2026-09-26 measurement, and the A7 text marks the version string as an example ("such as"). Unchanged.
- Item 2, "the probes pass on v2.15.0": not established; neither pair ran them. The edits say the probes were not re-run.
- Item 2, a mandatory-probe line naming P2, P4 and P5 for the v2.14.0 to v2.15.0 move: A6 step 2 already requires every probe on every bump, so the line would repeat it.
- Item 2, a new predeclared probe (P7): the release notes give no behaviour detail for predeclared 0.3.0, and the rule sets name no predeclared fact for a probe to re-prove. Secondary only (the go-modules artifact), no rule to own it.
- Item 3b, nilness@v0.53.0: the tag was not re-fetched from a primary source, and the target does not name nilness.
- Item 3b, moving the govulncheck and gopls pins: both rule pairs kept them until a re-measure. Only the newer versions are recorded.
- Item 3c, `gotestjsonbuildtext` removal: go.dev/doc/godebug says "Go 1.28 at the earliest", not scheduled, and the 1.28 draft notes do not mention it. A2's removed-setting paragraph already covers any removed setting.
- Item 3d, Dependabot and the toolchain line: the target is already correct, and dependabot-core#13520 is still open with no shipped support. Upstream did not change, so the "read 2026-09-26" date stays.

## Sources

- https://go.dev/doc/devel/release: go1.27.2 (2026-10-08), go1.27.3 (2026-10-19) and go1.27.4 (2026-11-10) with security fixes; "Each major Go release is supported until there are two newer major releases."
- https://go.dev/wiki/Go-Release-Cycle: February release, November freeze, December RC1.
- https://tip.golang.org/doc/go1.28: "Go 1.28 is not yet released."
- https://go.dev/doc/godebug: `gotestjsonbuildtext` removal "Go 1.28 at the earliest".
- https://github.com/golangci/golangci-lint/releases/tag/v2.15.0 and its go.mod at the tag: `honnef.co/go/tools v0.8.2`, `kisielk/errcheck v1.30.0`, `OpenPeeDeeP/depguard/v2 v2.2.1`.
- https://github.com/OpenPeeDeeP/depguard/releases/tag/v2.3.0: prefix matching, longest match wins, empty entry errors, `$gostd` expansion.
- https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck?tab=versions: v1.10.0 on 2026-11-17.
- https://pkg.go.dev/golang.org/x/tools/gopls?tab=versions: v0.24.0 on 2026-10-14.
- https://github.com/dependabot/dependabot-core/issues/13520: open.
- This refresh's go-modules and go-quality decision files: the pin moves and the GO-GATE-08 and GO-GATE-14 changes.

## Revision log

1. SKILL.md Scope: 2026-11-27 pins added, 2026-09-26 measurement kept as provenance.
2. SKILL.md Pinned defaults: header re-dated, golangci-lint pin moved to v2.15.0, gopls row records v0.24.0 as newer.
3. SKILL.md A3: toolchain command moved to go1.27.4; Go 1.28 floor note added to the library bullet.
4. SKILL.md A6: P3 bullet names G115; depguard v2.3.0 dated re-check added.
5. probes.md header: v2.15.0 pin recorded as not yet probed.

### Edit list (spillover round)

1. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Find:
   ```
   staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0 unless a line says
   otherwise.
   ```
   Replace:
   ```
   staticcheck 2026.2.1, govulncheck v1.8.0 and gopls v0.23.0 unless a line says
   otherwise. Re-checked 2026-11-27: the pins are Go 1.27.4, golangci-lint v2.15.0
   and staticcheck 2026.2.2, and no probe or measured line below was re-run on
   them. govulncheck v1.10.0 (2026-11-17) and gopls v0.24.0 (2026-10-14) are newer
   than their pins, which move only with a re-measure.
   ```

2. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Find:
   ```
   | Decision | Default (2026-09-26) | Override looks like |
   ```
   Replace:
   ```
   | Decision | Default (re-checked 2026-11-27) | Override looks like |
   ```

3. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Find:
   ```
   | golangci-lint pin | Exactly `v2.14.0`, bumped only through step A6 | Another exact version, never `latest` |
   ```
   Replace:
   ```
   | golangci-lint pin | Exactly `v2.15.0` (bundling staticcheck 2026.2.2), bumped only through step A6. P1 to P6 were measured on v2.14.0 and not re-run on v2.15.0 | Another exact version, never `latest` |
   ```

4. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Find:
   ```
   | gopls pin for the `yield` step | `v0.23.0` | Drop the step once step A5's re-check says vet or golangci carries the analyzer |
   ```
   Replace:
   ```
   | gopls pin for the `yield` step | `v0.23.0`. v0.24.0 (2026-10-14) is newer and moves only with a re-measure | Drop the step once step A5's re-check says vet or golangci carries the analyzer |
   ```

5. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Find:
   ```
   go get toolchain@go1.27.1   # CLI: the latest patch, strictly above the go line (GO-MOD-02)
   ```
   Replace:
   ```
   go get toolchain@go1.27.4   # CLI: the latest patch, strictly above the go line (GO-MOD-02)
   ```

6. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Anchor (insert after):
   ```
     `[oldstable, stable]`, moves by itself (GO-MOD-16).
   ```
   Insert:
   ```
     When Go 1.28 ships (planned for February 2027, unreleased on 2026-11-27),
     1.26 leaves support: the library floor becomes `go 1.27.0`, the CLI line
     `go 1.28.0`, and the `1.26.0` in the floor check below changes with them.
   ```

7. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Find:
   ```
      - P3, gosec with `excludes` emptied, including G304 (GO-GATE-14).
   ```
   Replace:
   ```
      - P3, gosec with `excludes` emptied, including G304, and G115, which stays
        excluded until this run shows it clean (GO-GATE-14).
   ```

8. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/SKILL.md
   Anchor (insert after):
   ```
      add a preset, or disable `SA1019` repo-wide to reach green (GO-GATE-09,
      GO-LANG-05).
   ```
   Insert:
   ```

   **Dated re-check, every golangci-lint bump (GO-MOD-08).** Read the bundled
   depguard with `go version -m "$(command -v golangci-lint)" | grep -e 'OpenPeeDeeP/depguard'`.
   v2.15.0 bundles v2.2.1 (read from its go.mod, 2026-11-27). When a bump raises it
   to v2.3.0 or later, which matches by prefix with the longest match winning and
   errors on an empty entry, run `golangci-lint config verify` on all three files
   and plant one import of each `superseded` entry. Each must still report with its
   `desc`, and a missing report is the finding.
   ```

9. File: /home/mherwig/dev/ocx-sh/grimoire-lore/skills/go-upgrade/references/probes.md
   Find:
   ```
   go1.27.1, bundled staticcheck 0.8.1) and standalone staticcheck 2026.2.1.
   ```
   Replace:
   ```
   go1.27.1, bundled staticcheck 0.8.1) and standalone staticcheck 2026.2.1.
   The pin moved to golangci-lint v2.15.0 (bundled errcheck 1.30.0 and staticcheck
   0.8.2) on 2026-11-27, and no probe here was re-run on it: run every probe
   before trusting its verdicts.
   ```

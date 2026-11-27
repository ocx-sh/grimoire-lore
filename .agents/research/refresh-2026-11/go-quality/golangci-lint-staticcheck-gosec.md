---
title: golangci-lint, bundled linters, gosec and staticcheck delta, 2026-09-26 to 2026-11-27
pair: go-quality
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 14
---

# golangci-lint, bundled linters, gosec and staticcheck delta

Scope: a delta against the 2026-09-26 baseline. Only changes that touch a linter name, rule ID, preset, default or exit code cited by rules/go-quality.md and skills/go-quality-reference/ are listed. Nothing is written from memory; every fact below was read from the cited page or from the upstream raw file at the named tag.

## Summary

- Current golangci-lint release: v2.15.0, released 2026-10-16. It is the only release in the window. v2.14.0 (2026-09-24) is the pin cited today and is now one release behind. The default branch has unreleased dependency bumps up to 2026-11-24 and no v2.16.0 tag.
- Current staticcheck release: 2026.2.2, released 2026-10-12. golangci-lint v2.15.0 bundles it as honnef.co/go/tools v0.8.2 (v2.14.0 bundled v0.8.1).
- golangci-lint v2.15.0 still bundles gosec v2.29.0, testifylint v1.6.4, sloglint v0.12.0, errorlint v1.9.0 and usetesting v0.5.0. Only revive moved (1.17.0 to 1.17.1) and staticcheck (0.8.1 to 0.8.2).
- No linter was renamed, removed or newly default-enabled in v2.15.0. The builder file `pkg/lint/lintersdb/builder_linter.go` differs between v2.14.0 and main by a single line (an added `WithLoadForGoAnalysis()` on predeclared), so the `standard` group is unchanged.
- The exclusion presets (`comments`, `std-error-handling`, `common-false-positives`, legacy) are byte-identical between v2.14.0 and main (`pkg/config/linters_exclusions.go`). `common-false-positives` still contains G103 (EXC0006) and G204.
- Exit codes are unchanged: the iota block still ends `ErrorWasLogged` = 7.
- Pin-move recommendation, a fact for go-modules and not a config edit here: v2.15.0 is available and moves the staticcheck line from 2026.2.1 to 2026.2.2 and revive to 1.17.1.

## Findings

### 1. Versions

- golangci-lint v2.15.0, released 2026-10-16, with the full entry list in [CHANGELOG.md](https://github.com/golangci/golangci-lint/blob/main/CHANGELOG.md). Entries touching this pair: `gosec: improve concurrency default value`, `revive: from 1.17.0 to 1.17.1`, `staticcheck: from 0.8.1 to 0.8.2`, and a revive fix reading "the rules `context-keys-type`, `errorf`, `modifies-value-receiver`, `range-val-address`, `string-of-int`, `time-equal`, `time-naming`, `unexported-return`, `unhandled-error`, `var-declaration` are working (less randomly)". Other entries are unrelated linter bumps (errcheck 1.30.0, exhaustive 0.15.0 with deprecated options, wrapcheck, loggercheck and others).
- Bundled versions, read from go.mod at each tag: [v2.14.0](https://raw.githubusercontent.com/golangci/golangci-lint/v2.14.0/go.mod) has gosec 2.29.0, testifylint 1.6.4, revive 1.17.0, sloglint 0.12.0, errorlint 1.9.0, usetesting 0.5.0, staticcheck 0.8.1; [v2.15.0](https://raw.githubusercontent.com/golangci/golangci-lint/v2.15.0/go.mod) has the same except revive 1.17.1 and staticcheck 0.8.2.
- Default branch (not released): commit 2026-11-22 bumps gosec 2.29.0 to 2.30.0 ([#6887](https://github.com/golangci/golangci-lint/pull/6887)); exhaustive 0.17.1 and depguard 2.3.0 also pending. Release list checked via the GitHub releases API on 2026-11-27: latest is v2.15.0.
- staticcheck: [2026.2.2](https://github.com/dominikh/go-tools/releases/tag/2026.2.2), released 2026-10-12. Earlier: 2026.2.1 on 2026-08-21, 2026.2 on 2026-08-20.
- gosec: [v2.30.0](https://github.com/securego/gosec/releases/tag/v2.30.0), released 2026-10-23, after v2.29.0 (2026-08-26). Not bundled yet.
- testifylint: latest release is still v1.6.4 (2025-09-12). Master has unreleased commits (a `mock-expect` checker added 2026-06-21, `sync.WaitGroup.Go` goroutine-context handling 2026-06-24). Source: [releases](https://github.com/Antonboom/testifylint/releases).
- revive: v1.17.1 released 2026-10-07 ([releases](https://github.com/mgechev/revive/releases)).

### 2. Claim table

| Claim at risk | Status | Detail |
|---|---|---|
| go-quality.md "golangci-lint v2.14.0" pin | Changed (stale) | v2.15.0 released 2026-10-16. Pin-move fact for go-modules: v2.15.0 bundles staticcheck 0.8.2 (2026.2.2) and revive 1.17.1. |
| "five-linter standard set leaves off (noctx, containedctx, errorlint, nilerr, thelper, usetesting)" | Unchanged | `builder_linter.go` v2.14.0 vs main differs by one unrelated line; no linter gained or lost default status. The v2.15.0 changelog lists no default change. Not re-measured by running the binary (no Go toolchain in this sandbox). |
| "usetesting staying silent below go 1.24" | Unchanged | usetesting stays v0.5.0 in v2.15.0 and main. |
| "prints 0 issues. and exits 7 on a typecheck or wrong-root error" | Unchanged | [exitcodes.go](https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/exitcodes/exitcodes.go): Success, IssuesFound, WarningInTest, Failure, Timeout, NoGoFiles, NoConfigFileDetected, ErrorWasLogged (= 7). Only diff against v2.14.0 is the `ExitError.Error` receiver becoming a pointer. The docs say `issues-exit-code` default is 1. |
| `golangci-lint fmt --diff` | Could not determine | No changelog line in the window mentions `fmt`; not executed. Treat as unchanged. |
| GO-CORE-05 `exclusions.generated: lax` | Unchanged | [config docs](https://golangci-lint.run/docs/configuration/file/): default `strict`, options `strict`, `lax`, `disable`. |
| Non-negotiables 3 and 15 presets, "deletes every G103 and G204 finding" | Unchanged | Preset file identical at v2.14.0 and main; `common-false-positives` holds `G103: Use of unsafe calls should be audited` (EXC0006) and the G204 subprocess text. [source](https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/config/linters_exclusions.go). |
| GO-CORE-02 `comments` preset hides doc-comment findings | Unchanged | Same identical file; constant `ExclusionPresetComments = "comments"`. |
| security.md "gosec IDs bundled in golangci-lint v2.14.0" | Unchanged for v2.15.0 | v2.15.0 still bundles gosec 2.29.0, so G101, G103, G117, G120, G402, G404, G708 are as before. The pin sentence should name "v2.14.0 and v2.15.0" if the pin moves. Gosec 2.30.0 is unreleased in golangci-lint. |
| go-security open question, G701-G708 taint noise | Could not determine | No gosec release note in 2.29.0 or 2.30.0 addresses taint-rule noise broadly. Relevant 2.30.0 commits: G703 stopped treating Clean/Abs/PathEscape as sanitizers (#1723, in 2.29.0 per commit list, i.e. already bundled), "Skip taint call graphs when no sinks match" (#1745, performance only). |
| errors.md / api-design.md "bundled staticcheck 0.8.1, the 2026.2 line" | Changed | v2.15.0 bundles 0.8.2, which is staticcheck 2026.2.2. Still the 2026.2 line. |
| "SA9010 needs staticcheck 2026.2 or later" | Unchanged | [2026.2 release](https://github.com/dominikh/go-tools/releases/tag/2026.2): "One new check has been added. SA9010 flags statements of the form `defer foo()` where `foo` returns a function." |
| GO-ERR-05 SA4023 blind in `_test.go` | Could not determine | See section 3. |
| language.md SA1019 behaviour | Unchanged, one fix | 2026.2.2 only fixes a crash on composite literals of generic structs that set deprecated fields (issue 1821). No behaviour change. |
| language.md revive `time-equal` | Unchanged (possibly improved) | Rule exists and is named in the v2.15.0 revive fix as "working (less randomly)". Name and ID unchanged. |
| testing.md testifylint v1.6.4 checks | Unchanged | No release after v1.6.4. Unreleased master adds `mock-expect`. |
| io.md gosec G301/G302/G306 thresholds | Unchanged | `rules/fileperms.go` has the same structure at v2.29.0 and v2.30.0; the 2.30.0 `fileperms` commit (#1766) only resolves constant permission values. Threshold values not diffed line by line. |

### 3. SA4023 and the test-file blind spot

2026.2.2 ([notes](https://github.com/dominikh/go-tools/releases/tag/2026.2.2)) states that SA4023 "more accurately tracks the nilness of interface values across branches and when loading global variables", no longer assumes zero values of unconstrained type parameters are nil, and no longer crashes on calls into indirect dependencies (issue 1741). 2026.2.1 fixed two false positives (issues 1736 and 1737) and the 2026.2 notes say SA4023 "has been reimplemented ... may find new issues ... but also miss issues it has found before". Issue list read through the tracker: 1736, 1737, 1738, 1741, 1745, 1748 closed, 1746 open (panic with generic methods). No issue about SA4023 and `_test.go` files was found; no release note says the test-file behaviour changed. The sandbox has no Go toolchain, so the fixture in errors.md was not re-run against 2026.2.2. Verdict: could not determine. Because SA4023 was reimplemented and then patched twice, the measurement dated 2026-09-26 on 2026.2.1 is not valid evidence for 2026.2.2. Recommended action for the pair author: re-run the planted fixture with `staticcheck -tests=true -checks SA4023 ./...` on 2026.2.2 before editing the sentence.

### 4. Gosec 2.30.0 (not bundled, for the next golangci-lint release)

From the [v2.30.0 release](https://github.com/securego/gosec/releases/tag/v2.30.0) and `rules/rulelist.go`: new rule G125 "Detect unescaped elements in url.JoinPath calls" (#1777). G706 gets wider log/slog method coverage (#1795), which touches the go-observability angle once bundled. G404 now ignores non-cryptographic Shuffle calls (#1742). G402 checks TLS settings assigned through a `*tls.Config` (#1769). G112, G102, G602, G407 and G203 have false-positive fixes. A fix defaults `-concurrency` to GOMAXPROCS. G117 is still named "Potential exposure of secrets via JSON/YAML/XML/TOML marshaling". v2.14.0 re-enabled G407 (already in the baseline).

## Normative guidance candidates

1. Pin-move fact for go-modules: golangci-lint v2.15.0 (2026-10-16) is the current release; the pair's v2.14.0 mentions are stale. Rationale: staticcheck 2026.2.2 fixes two SA4023 false-positive classes and two crashes. Verification: `golangci-lint version` prints v2.15.0, and `grep -rn "v2.14.0" rules skills` finds every sentence that must move together with the pin.
2. When the pin moves, re-measure GO-ERR-05's `_test.go` blind spot on 2026.2.2 before keeping the sentence. Verification: the planted fixture command in errors.md, exit 0 means still blind.
3. Do not cite gosec 2.30.0 additions (G125, widened G706) as available through golangci-lint until a release bundles gosec 2.30.0. Verification: `curl -sL https://raw.githubusercontent.com/golangci/golangci-lint/<tag>/go.mod | grep securego`.

## AI-agent angle

An agent that reads upstream "latest" may write golangci-lint v2.16 or gosec G125 as available; both are unreleased through golangci-lint on 2026-11-27. Smallest check: the go.mod grep above. An agent may also keep "staticcheck 0.8.1" after a pin move; check with `golangci-lint version --verbose` or go.mod at the tag.

## Contested / evolving

SA4023 is in flux (reimplemented in 2026.2, patched in 2026.2.1 and 2026.2.2, issue 1746 open as of 2026-11-27), so any measurement of its blind spots is version-specific. testifylint has a year-old release and active unreleased master; its checker list may change at the next tag.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/golangci/golangci-lint/main/CHANGELOG.md | golangci-lint changelog | to 2026-10-16 | v2.15.0 entries |
| https://api.github.com/repos/golangci/golangci-lint/releases | release list | 2026-11-27 | latest tag |
| https://raw.githubusercontent.com/golangci/golangci-lint/v2.14.0/go.mod | bundled versions | 2026-09-24 | baseline |
| https://raw.githubusercontent.com/golangci/golangci-lint/v2.15.0/go.mod | bundled versions | 2026-10-16 | current |
| https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/config/linters_exclusions.go | preset names | main | presets |
| https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/lint/lintersdb/builder_linter.go | linter builder | main | standard set diff |
| https://raw.githubusercontent.com/golangci/golangci-lint/main/pkg/exitcodes/exitcodes.go | exit codes | main | exit 7 |
| https://golangci-lint.run/docs/configuration/file/ | config docs | 2026-11-27 | generated, presets, exit code |
| https://github.com/securego/gosec/releases/tag/v2.30.0 | gosec release | 2026-10-23 | G125, G706 |
| https://raw.githubusercontent.com/securego/gosec/v2.30.0/rules/rulelist.go | rule list | 2026-10-23 | rule IDs |
| https://github.com/dominikh/go-tools/releases/tag/2026.2.2 | staticcheck release | 2026-10-12 | SA4023, SA1019 fixes |
| https://github.com/dominikh/go-tools/releases/tag/2026.2 | staticcheck release | 2026-08-20 | SA9010, SA4023 reimplementation |
| https://github.com/Antonboom/testifylint/releases | testifylint releases | 2025-09-12 | no new release |
| https://github.com/mgechev/revive/releases | revive releases | 2026-10-07 | 1.17.1 |

Not fetched usefully: https://staticcheck.dev/changes/ (index only lists 2026.2 and 2026.1; point releases are on GitHub), https://golangci-lint.run/docs/linters/ (does not show the default set).

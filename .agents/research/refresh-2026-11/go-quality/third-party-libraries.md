---
title: go-quality delta, third-party libraries and trackers (2026-09-26 to 2026-11-27)
pair: go-quality
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 27
---

# go-quality delta: third-party libraries and trackers

Scope: a delta against the 2026-09-26 baseline. All data was read from the GitHub API (`gh api`) on 2026-11-27: release bodies, commit lists, `go.mod` files, issue and pull request metadata. Nothing was fetched from memory. Fixtures were not re-run, because no release note in the window names a behaviour change on a cited row.

## Summary

- No cited library shipped a release in the window that changes a watched behaviour. Two shipped releases at all: urfave/cli v3.14.0 (2026-10-02) and spf13/pflag v1.1.0 (2026-11-06).
- cobra has had no commit since 2026-07-11 and no release since v1.10.2 (2025-12-04). That release predates the baseline, so the baseline pin "cobra v1.10.1" was already one patch behind when written. v1.10.2 notes touch no cited row.
- cobra#1708 is still open. It gained a comment on 2026-11-21 that restates the same defect. Its proposed fix, [spf13/cobra#2002](https://github.com/spf13/cobra/pull/2002), is still open and unmerged.
- dependabot-core#13520 is still open, with no new comment since 2025-11-15.
- goleak is not archived. No release since v1.3.0. The `go.mod` at tag v1.3.0 requires testify (see the goleak section), which is a nuance for the "no transitive dependencies" wording.
- go-cmp has no release after v0.7.0. Unreleased commits on master add `cmpopts.EquateApproxDuration`.
- go-containerregistry v0.22.1 is still the latest tag. Master has later commits, none tagged.
- colorprofile has no release after v0.4.3. `envNoColor` still uses `strconv.ParseBool`, so GO-CLI-13's colorprofile ban stands.

## Findings

### 1. Current versions

| Library | Baseline pin | Latest tag now | Tag date | Archived | Source |
|---|---|---|---|---|---|
| spf13/cobra | v1.10.1 | v1.10.2 | 2025-12-04 | no | [releases](https://github.com/spf13/cobra/releases) |
| spf13/pflag | v1.0.10 | v1.1.0 | 2026-11-06 | no | [releases](https://github.com/spf13/pflag/releases) |
| urfave/cli v3 | v3.13.0 | v3.14.0 | 2026-10-02 | no | [releases](https://github.com/urfave/cli/releases) |
| muesli/termenv | v0.16.0 | v0.16.0 | 2025-02-21 | no | [releases](https://github.com/muesli/termenv/releases) |
| charmbracelet/colorprofile | v0.4.3 | v0.4.3 | 2026-03-09 | no | [releases](https://github.com/charmbracelet/colorprofile/releases) |
| uber-go/goleak | v1.3.0 | v1.3.0 | 2023-10-24 | no | [releases](https://github.com/uber-go/goleak/releases) |
| google/go-cmp | v0.7.0 | v0.7.0 | 2025-02-21 | no | [releases](https://github.com/google/go-cmp/releases) |
| google/go-containerregistry | v0.22.1 | v0.22.1 | 2026-09-04 | no | [releases](https://github.com/google/go-containerregistry/releases) |

### 2. cli-contract.md claims

**"Every cobra row was read against cobra v1.10.1 source ... Re-run the in-process tests on every cobra bump"**: changed, in a minor way.
- Old text: "cobra v1.10.1 (pflag v1.0.10)".
- New fact: the latest cobra is v1.10.2, dated 2025-12-04, which is before the 2026-09-26 baseline. Its notes list only a `gopkg.in/yaml.v3` to `go.yaml.in/yaml/v3` migration (doc generation only), CI fixes, a docs addition and two var-to-const refactors. No cobra behaviour row is touched. The cobra `go.mod` on master pins `github.com/spf13/pflag v1.0.9`, not v1.0.10, and master has no commits after 2026-09-26.
- Source: [cobra v1.10.2 release](https://github.com/spf13/cobra/releases/tag/v1.10.2), [cobra go.mod](https://github.com/spf13/cobra/blob/main/go.mod). Upstream change date: 2025-12-04.
- Verdict: the behaviour reading is unchanged. The version label is stale by one patch. The ruleset text "re-run on every bump" still applies when the pair moves its pin to v1.10.2.

**"pflag v1.0.10"**: changed. pflag v1.1.0 (2026-11-06) is a large release (30+ pull requests). Lines that touch behaviour cobra exposes or the pair cites:
- "fix: print to set destination, not hardcoded os.Stderr" ([#502](https://github.com/spf13/pflag/pull/502)). This touches the stream-routing area behind GO-CLI-20 and cobra#1708. It affects pflag's own `FlagSet` output, not `cobra.Command.Print`.
- "Report the flag name as typed in deprecation warnings" ([#500](https://github.com/spf13/pflag/pull/500)).
- "Extend `UnknownFlags` to `UnknownFlagsHandling` and introduce `PassUnknownFlagToArgs`" ([#440](https://github.com/spf13/pflag/pull/440)), and "honour deprecated `ParseErrorsWhitelist.UnknownFlagsHandling`" ([#507](https://github.com/spf13/pflag/pull/507)).
- "Show 'correct' explicit bool value syntax in help" ([#453](https://github.com/spf13/pflag/pull/453)), "Keep wrapping after an unbreakable usage word" ([#503](https://github.com/spf13/pflag/pull/503)), and "Replace raw stdlib parse errors in typed flag Set methods" ([#469](https://github.com/spf13/pflag/pull/469)). These change help and error text.
- Master after v1.1.0 adds "initialize default Usage function on NewFlagSet and Init" and short-flag fixes.
- The release body itself warns that anything breaking is unintentional and may come from reliance on undocumented behaviour.
- Cobra v1.10.2 still resolves pflag v1.0.9, so no cobra user gets v1.1.0 unless the module requires it explicitly. Any adopter who bumps pflag past v1.0.10 changes flag error and deprecation text and must re-run the fixtures.
- Source: [pflag v1.1.0 release](https://github.com/spf13/pflag/releases/tag/v1.1.0). Upstream change date: 2026-11-06.

**"spf13/cobra#1708 ... was open on 2026-09-26"**: changed in state detail, not in state. Still open, no label. New comment on 2026-11-21 by a user whose CLI calls `SetOut` and `SetErr` and finds the `MarkDeprecated` notice written to the Out writer ahead of JSON output, because `Command.ParseFlags` prints it with `c.Print`, which uses `OutOrStderr()`. The commenter asks for review of [cobra#2002](https://github.com/spf13/cobra/pull/2002), which is open and unmerged (last updated 2024-11-04). [cobra#1709](https://github.com/spf13/cobra/pull/1709) is closed unmerged. A new open PR [#2513](https://github.com/spf13/cobra/pull/2513) (2026-10-01) covers a related completion directive line when stderr is stdout. Source: [issue 1708](https://github.com/spf13/cobra/issues/1708). Date of the change: 2026-11-21.

**"colorprofile is pre-1.0. Re-check its NO_COLOR parsing on every bump"**: unchanged. No release after v0.4.3. Commits since 2026-03-09 are dependency bumps and "remove CODEOWNERS". The latest `env.go` still has `envNoColor` returning `strconv.ParseBool(env.get("NO_COLOR"))`, so `NO_COLOR=1` or `true` disables colour but a non-boolean value such as `yes` does not, which differs from the no-color.org "non-empty" rule that GO-CLI-13 uses. The contested-item text "If colorprofile's envNoColor becomes a non-empty check, GO-CLI-13's colorprofile ban relaxes" has not triggered. Source: [env.go](https://github.com/charmbracelet/colorprofile/blob/main/env.go), [commits](https://github.com/charmbracelet/colorprofile/commits/main).

**termenv v0.16.0**: unchanged. Latest tag. Master has only lint, CI and a go-colorful v1.3.0 bump (2025-09-22), all before the window. Source: [commits](https://github.com/muesli/termenv/commits/master).

**urfave/cli v3.13.0**: changed (new tag v3.14.0, 2026-10-02). Relevant lines under GO-CLI-16's "hardcodes exit 3 for an unknown command" and the "own exit" wording:
- "fix: restore Unwrap on the error returned by Exit" ([#2444](https://github.com/urfave/cli/pull/2444)).
- "Keep arguments after a bare dash" ([#2419](https://github.com/urfave/cli/pull/2419)).
- "fix: reject duplicate flag names" ([#2396](https://github.com/urfave/cli/pull/2396)).
- "Add urfave_cli_no_template build tag" ([#2441](https://github.com/urfave/cli/pull/2441)).
- No line mentions the unknown-command exit code. Whether exit 3 still holds in v3.14.0 is "could not determine"; the pair says "do not adopt urfave/cli v3", so the exposure is only the number quoted in the GO-CLI-16 rationale. Source: [v3.14.0 release](https://github.com/urfave/cli/releases/tag/v3.14.0).

**"The TraverseChildren typo gap has no upstream tracker"**: changed in wording. No issue about the unknown-subcommand typo case surfaced. A related, different defect is now tracked: [spf13/cobra#2528](https://github.com/spf13/cobra/issues/2528), open since 2026-10-15, "TraverseChildren can execute a subcommand after -- and discard positional arguments" (reproduced on Go 1.27.2 and pflag v1.0.9). It also supports the existing GO-CLI-17 advice to leave `TraverseChildren` unset. An older issue, [#1986](https://github.com/spf13/cobra/issues/1986) (MarkFlagRequired with TraverseChildren, 2023), exists. The typo gap itself: unchanged, no tracker found by two searches (`TraverseChildren unknown command`, `TraverseChildren legacyArgs`), both empty. Date of the new fact: 2026-10-15.

**GO-CLI-06, GO-CLI-17, GO-CLI-20, GO-CLI-21 behaviours** (SilenceErrors, SilenceUsage, SetOut, groups exiting 0 with help): unchanged. cobra has no commit or release in the window, and v1.10.2 notes do not touch them. The one adjacent change is pflag v1.1.0 (above), which cobra v1.10.2 does not pull in.

### 3. goleak (concurrency.md GO-CONC-11, go-quality.md non-negotiable 6)

- Not archived (`archived=false`). Last push 2026-09-15 (a test for elided frames with leading whitespace; no code change). No release after v1.3.0 (2023-10-24).
- The `go.mod` at tag v1.3.0 reads: `go 1.20`, `require github.com/stretchr/testify v1.8.0`, plus indirect `go-spew`, `kr/pretty`, `go-difflib`, `gopkg.in/check.v1`, `gopkg.in/yaml.v3`. So the module graph of v1.3.0 is not empty. The claim "no transitive dependencies" holds only in the sense that goleak's non-test code imports nothing outside stdlib; testify is a goleak test-only requirement that Go module graph pruning (go 1.17 and later) may keep out of an adopter's build but still lists in `go.sum` and `go.mod` verification data for an adopter on an older `go` line. I did not fetch goleak's source imports to confirm, so this is "could not determine" for the import claim.
- goleak master `go.mod` now requires testify v1.12.1 and indirect `go.yaml.in/yaml/v3 v3.0.5`. This is unreleased; it matters only if a v1.3.1 or v1.4.0 tag appears.
- Reopen condition in go-observability ("archived or gains dependencies"): not met by any tag. Watch for the next tag.
- Sources: [goleak repo](https://github.com/uber-go/goleak), [go.mod at v1.3.0](https://github.com/uber-go/goleak/blob/v1.3.0/go.mod), [go.mod on master](https://github.com/uber-go/goleak/blob/master/go.mod).

### 4. go-cmp (testing.md)

Unchanged for v0.7.0 as the pin. Master has unreleased commits from 2026-10-29: `cmpopts.EquateApproxDuration` (#410), a Go 1.26 semantics update, lazy regexp compile, and 2026-11-13 "allow different wrapper names" in `cmp/internal/funcion`. None is tagged. Source: [commits](https://github.com/google/go-cmp/commits/master). Do not cite `EquateApproxDuration` until a tag ships it.

### 5. go-containerregistry (network.md GO-NET-17)

Unchanged: v0.22.1 (2026-09-04) is the latest tag. Its notes (read for context) include "Reject non-canonical IP literals in all SSRF guards" and "remote: apply checkRedirectSSRF to writer-side HTTP clients", so the library now carries its own SSRF and redirect guards, relevant to GO-NET-05 style redirect rules but already inside the baseline version. Master after the tag adds `tarball: add ImageFromFS` (#2488, 2026-10-26), Go 1.27 test fixes, and dependency bumps. Source: [v0.22.1 release](https://github.com/google/go-containerregistry/releases/tag/v0.22.1), [commits](https://github.com/google/go-containerregistry/commits/main).

### 6. language.md GO-LANG-15

"Dependabot never opens a toolchain-only PR (dependabot-core#13520, open on 2026-09-26)": unchanged. [Issue 13520](https://github.com/dependabot/dependabot-core/issues/13520) "Bump Go toolchain directive in go.mod files" is open, last updated 2025-11-15, five comments, none from a maintainer announcing a fix. A reader asked for a fresh check should run `gh api repos/dependabot/dependabot-core/issues/13520 --jq .state`.

## Normative guidance candidates

1. Rule: when the pair next bumps its pinned versions, write "cobra v1.10.2 (pflag v1.0.9 as cobra resolves it)" in cli-contract.md and re-run the in-process fixtures. Rationale: v1.10.1 was already stale at baseline and cobra's go.mod pins pflag v1.0.9. Verification: `go list -m github.com/spf13/cobra github.com/spf13/pflag` in the fixture module, compared to the header line.
2. Rule: add to the cobra#1708 bullet that cobra#2002 is the proposed opt-in fix, still unmerged, and that the 2026-11-21 report shows `MarkDeprecated` notices landing on the Out writer once `SetOut` is called (consistent with GO-CLI-20). Rationale: a new, independent report raises the chance of a fix, and GO-CLI-20 depends on the current `OutOrStderr` behaviour. Verification: `gh api repos/spf13/cobra/pulls/2002 --jq .state` returns `open`.
3. Rule: add a one-line row note that pflag v1.1.0 changes deprecation, unknown-flag and usage text, so a module that requires pflag above v1.0.10 must re-run GO-CLI-06, GO-CLI-20 fixtures. Rationale: cobra v1.10.2 does not pull v1.1.0, but `go get -u` does. Verification: `go list -m -f '{{.Version}}' github.com/spf13/pflag` in the adopter module reports at least v1.1.0.
4. Rule: reword "goleak ... no transitive dependencies" to "goleak's non-test code imports only the standard library; its go.mod lists testify for its own tests". Rationale: the v1.3.0 `go.mod` lists testify and four indirect modules. Verification: `go list -deps go.uber.org/goleak@v1.3.0 | grep -v '^[a-z]*/\|^[a-z]*$'` (print non-stdlib imports) after a `go get`, or `go mod graph | grep goleak`.
5. Rule: keep GO-CLI-17's TraverseChildren ban and cite [cobra#2528](https://github.com/spf13/cobra/issues/2528) as supporting evidence; keep the sentence "typo gap has no upstream tracker" but name #2528 as the nearest related issue. Rationale: new open defect on the same flag. Verification: `gh api repos/spf13/cobra/issues/2528 --jq .state`.

## AI-agent angle

- An agent bumping `go get -u ./...` pulls pflag v1.1.0 and changes help and warning text with no compile error. Check: `git diff go.mod | grep pflag` followed by running the CLI fixture suite.
- An agent may copy go-cmp `EquateApproxDuration` from master docs into code pinned to v0.7.0, which fails to compile. Check: `go build ./...`.
- An agent reading goleak master `go.mod` may report testify v1.12.1 as the dependency of the pinned v1.3.0. Check: read `go.mod` at the tag, not on master.

## Contested / evolving

- cobra stream routing (`SetOut`, `SetErr`, deprecation notices): open since 2022, with a fresh 2026-11-21 report and an opt-in PR pending. Trend: likely an opt-in fix, not a default change, because maintainers require non-breaking changes ([jpmcb comment, 2023-07-21](https://github.com/spf13/cobra/issues/1708)).
- pflag is moving again after a year of quiet (v1.1.0, plus new master commits through 2026-11-20 including an API compatibility CI check). Expect a patch release.
- goleak: maintenance-only, master has unreleased dependency changes.

## Rows to re-watch

- GO-CLI-06, GO-CLI-20, GO-CLI-21: re-run only if the module's pflag goes above v1.0.10 or cobra above v1.10.2.
- GO-CLI-13 and GO-CLI-19: re-check at the next colorprofile tag (none yet).
- GO-CLI-16: urfave/cli v3.14.0 exit code for an unknown command is "could not determine"; the quoted "exit 3" for v3.13.0 stands unverified for v3.14.0.
- GO-CLI-17: add cobra#2528 as evidence.
- GO-CONC-11 and non-negotiable 6: reopen if goleak ships a tag after v1.3.0 or is archived.
- GO-TEST-02: no change needed.
- GO-NET-17: no change needed.
- GO-LANG-15: still true.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/spf13/cobra/releases/tag/v1.10.2 | cobra release notes | 2025-12-04 | latest cobra |
| https://github.com/spf13/cobra/blob/main/go.mod | cobra go.mod | read 2026-11-27 | pflag floor |
| https://github.com/spf13/cobra/issues/1708 | SetOut deprecation notices | updated 2026-11-21 | cited issue |
| https://github.com/spf13/cobra/pull/2002 | proposed opt-in fix | 2024-11-04 | still open |
| https://github.com/spf13/cobra/pull/1709 | earlier fix | 2023-07-19 | closed unmerged |
| https://github.com/spf13/cobra/issues/2528 | TraverseChildren defect | 2026-10-15 | new related issue |
| https://github.com/spf13/pflag/releases/tag/v1.1.0 | pflag release notes | 2026-11-06 | new release |
| https://github.com/spf13/pflag/commits/master | pflag master | 2026-11-20 | post-release changes |
| https://github.com/urfave/cli/releases/tag/v3.14.0 | urfave notes | 2026-10-02 | new release |
| https://github.com/muesli/termenv/commits/master | termenv commits | 2025-09-22 | no change |
| https://github.com/charmbracelet/colorprofile/blob/main/env.go | NO_COLOR parsing | read 2026-11-27 | ParseBool still |
| https://github.com/charmbracelet/colorprofile/commits/main | colorprofile commits | 2026-08-12 | deps only |
| https://github.com/uber-go/goleak/blob/v1.3.0/go.mod | goleak go.mod at tag | 2023-10-24 | dependency list |
| https://github.com/uber-go/goleak/blob/master/go.mod | goleak master go.mod | 2026-09-15 | unreleased deps |
| https://github.com/google/go-cmp/commits/master | go-cmp commits | 2026-11-13 | unreleased changes |
| https://github.com/google/go-containerregistry/releases/tag/v0.22.1 | gcr notes | 2026-09-04 | still latest |
| https://github.com/dependabot/dependabot-core/issues/13520 | toolchain bump issue | 2025-11-15 | still open |

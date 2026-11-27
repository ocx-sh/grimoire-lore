---
title: Delta research, git, lychee and LSP changes for the code-docs pair
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 9
---

# Delta, 2026-09-27 to 2026-11-27: git, lychee, LSP

This is a delta against the September 2026 research. Only changes are reported. Claims not listed here are unchanged, because no source in the window touches them.

## Current releases (version stamps)

| Tool | Baseline stamp | Current release | Date | Source |
|---|---|---|---|---|
| git | 2.54 | 2.56.1 (2.56.0 tagged 2026-09-28, 2.56.1 tagged 2026-10-26) | see sources | tag objects via the GitHub API, `Documentation/RelNotes/2.56.0.adoc` and `2.56.1.adoc` at the release tags |
| lychee | 0.24 | 0.24.2, released 2026-05-01, still the latest release; a `nightly` build of 2026-11-13 exists | no stable release inside the window | GitHub releases API for lycheeverse/lychee, `lychee-bin/CHANGELOG.md` (Unreleased section is empty) |
| LSP | 3.17 | 3.18.x is the current spec; 3.18.0 is dated 06/04/2026 in its change log (month first, matching the 3.17.0 entry 05/10/2022); 3.19 is under development | 3.18 predates the window | `_specifications/lsp/3.18/specification.md` on the gh-pages branch of microsoft/language-server-protocol |

Git 2.55.0 (tagged 2026-06-29) and 2.55.1 (tagged 2026-11-03) are also newer than 2.54. 2.55.1 and 2.56.1 are security-only releases (six CVEs, merged up from the maintenance branches). Their notes list no behaviour change to the commands below.

Verdict on stamps: the git stamp moves to "git 2.56" only if the author actually re-measures on 2.56. The measurements in linkage.md were taken on 2.54 and the research environment has git 2.43 only, so no re-measurement could be run here. Recommended wording that stays true: "Measured 2026-09-27 with ... git 2.54 and lychee 0.24; git 2.56.1 and lychee 0.24.2 are current as of 2026-11-27 and their release notes show no change to the commands used." The lychee stamp does not need to move: 0.24.2 is a patch release of the measured series and no stable release landed in the window.

## Per-claim verdicts

### linkage.md header: "Measured 2026-09-27 with ... git 2.54 and lychee 0.24"
Verdict: changed (git), unchanged (lychee).
- New fact: git 2.56.0 (tag dated 2026-09-28) and 2.56.1 (2026-10-26) are out. Lychee has no stable release after 0.24.2 (2026-05-01).
- Replacement wording: see the stamp verdict above.

### LNK-10: `--follow` on a missing path, and `git show` with a pathspec turning `R085` into `D`
Verdict: could not determine for exact behaviour; the text of the claim stays valid on the evidence found.
- Changed upstream: the git 2.56.0 release notes say: "git log --follow has been updated to better handle non-linear history, in which the path being tracked gets renamed differently in multiple history lines." Source: https://github.com/git/git/blob/v2.56.0/Documentation/RelNotes/2.56.0.adoc (git 2.56.0, tag dated 2026-09-28).
- This concerns merge history with divergent renames. Neither the 2.55.0, 2.55.1, 2.56.0 nor 2.56.1 notes mention a change to "--follow on a nonexistent path prints nothing and exits 0", nor to rename detection being lost when `git show` is given a pathspec. The notes alone cannot prove that the behaviour is unchanged, and the reading from 2.56 was not re-run, because only git 2.43 is installed here.
- Recommended action: keep LNK-10 as written. Optionally re-verify by running the LNK-10 trace on a git 2.56 binary before the next release; the rule's advice (never use `--follow` on a missing path, read the deleting commit's unfiltered rename map) remains correct in either case. If a re-check on 2.56 shows `--follow` now finds a rename for a vanished path, the sentence "prints nothing and exits 0" needs the qualifier "on git 2.54".
- Verification: `git log --follow --name-status -- <deleted path>` on a throwaway repository, with and without a merge that renames the path differently on two branches.

### Diff options relied on by the depth files
Verdict: unchanged for every option, with one caveat.
- `git diff -U0 --merge-base origin/main`, `--diff-algorithm=histogram`, `--color-moved=blocks`, `--word-diff=plain`, `git show -M --name-status`, `:(glob)` and `:(exclude,glob)` pathspec magic: none appears in a changed-behaviour line in the 2.55.0, 2.55.1, 2.56.0 or 2.56.1 notes (searched for diff, merge-base, color-moved, histogram, word-diff, pathspec, glob, exclude, rename, name-status).
- Related notes that do not change the commands: 2.55.0 says the "git diff" command line parser learned that a few options take only non-negative integers (affects nonsense values such as a negative context count, not `-U0`); 2.55.0 extends the `--word-diff` documentation with implementation detail (documentation only); 2.55.0 reworks `git log -L` onto the standard diff pipeline (not used by the pair); 2.56.0 contains pathspec performance and sparse-index fixes (no semantic change). Source: the same RelNotes files at the v2.55.0 and v2.56.0 tags.
- Caveat: the RelNotes list only user-visible changes the maintainers chose to write up; a pure bug fix without a note would not appear. No option was executed on 2.56.

### LNK-12: `lychee --no-progress --include-fragments`
Verdict: unchanged for released versions; one pending change on the unreleased nightly.
- Released 0.24.x: no flag removed or renamed. `--no-progress` and `--include-fragments` do not appear in a removal or rename line of 0.24.0, 0.24.1 or 0.24.2. 0.24.0 (2026-04-24) already added text-fragment checking (#2138) and hides the progress bar when input is stdin only (#1938); both predate the baseline.
- Nightly only (2026-11-13, not a stable release): "Remove deprecated flags from codebase" (#2208), legacy cookie format removal (#2215), MSRV 1.89, GitHub-style heading fragment generation (#2153), block-style heading attributes recognised (#2250), documentation extended for `--include-fragments` (#2281). The release page does not name which flags #2208 removes, so whether `--no-progress` or `--include-fragments` is among them is not known. Neither is described as deprecated in the pages read.
- Replacement wording: none now. Re-check when lychee 0.25 releases; heading-fragment matching will change there, which can alter which fragment links LNK-12 reports.
- Sources: https://github.com/lycheeverse/lychee/releases and https://raw.githubusercontent.com/lycheeverse/lychee/master/lychee-bin/CHANGELOG.md (read 2026-11-27).

### surfaces.md: "the LSP 3.17 hover result has no length field (read September 2026)"
Verdict: changed (version label only); the substance is unchanged.
- LSP 3.18 is the current spec (3.18.0 dated 06/04/2026, so it predates the baseline; the September text named an outdated version). The 3.18 `Hover` interface has exactly two members: `contents: MarkedString | MarkedString[] | MarkupContent` and an optional `range?: Range`. There is no length, truncation or verbosity field. The 3.18.0 change log has no hover entry. Spec 3.19 is a draft with an empty change log (heading "3.19.0 (mm/dd/yyyy)") and no hover entry. The only hover-related commit in the window changes the overview example types (microsoft/language-server-protocol PR 2309, 2026-09-10).
- Old text: "the LSP 3.17 hover result has no length field (read September 2026)".
- Replacement text: "the LSP 3.18 hover result has no length field (read November 2026; the 3.19 draft adds none)".
- Verification: `grep -n "interface Hover " ` in the 3.18 `language/hover.md`, or read the Hover Request section at https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/.

## Normative candidates

None. No upstream change in the window requires a new or changed rule. The two textual edits are the surfaces.md version label and, optionally, the linkage.md stamp (rationale and verification above).

## Not fetched or not determinable

- No git 2.56 binary was available, so no command was executed; every git verdict rests on release notes.
- The lychee nightly changelog entries come from the release page summary; the page did not state which flags #2208 removes.
- The exact LSP 3.18 finalisation date is the change-log label only; no announcement page was read.

---
title: Task and GitLab Runner delta, 2026-10-11 to 2026-11-27
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 7
---

# Task and GitLab Runner delta for ci.md

Scope: delta update only. Claims not listed as changed stay as they are. Everything below was read from the pages named in the Sources table on 2026-11-27. Where a fetch tool summarised a page rather than quoting it, that is said.

## Summary

- Task: no stable release exists in the window. v3.54.0 (dated 2026-10-01, before the window start) is still the newest stable release. Only an unreleased section and a `v3.55.0-nightly` pre-release (27 Nov) exist after it.
- The nightly and unreleased notes contain no mvdan/sh bump, no builtin coreutils change, no `platforms:` change and no `set`/pipefail change.
- GitLab Runner shipped v19.5.0 (2026-10-14), v19.6.0 (2026-11-17), v19.6.1 (2026-11-24) and patch releases on older lines. None documents a change to the errexit/pipefail prologue or to the Windows default shell. Two v19.6.0 entries touch the shell script generator behind feature flags and need a human reading (see claim 6).
- No SH-CI row needs the re-run the corpus scheduled, because no Task release exists to re-run against.

## Findings

### Task (claims 1 to 5)

1. Claim: ci.md line 9, "Task 3.45.4 to 3.54.0 (mvdan/sh 3.14.1 in 3.54.0)". Status: unchanged. The [Task CHANGELOG](https://raw.githubusercontent.com/go-task/task/main/CHANGELOG.md) heads with an "Unreleased" section, then "v3.54.0 - 2026-10-01", then "v3.53.1 - 2026-08-18". The [releases page](https://github.com/go-task/task/releases) lists `v3.55.0-nightly` (pre-release, 27 Nov) above v3.54.0. The v3.54.0 notes mention only "Refactored the execext package to use mvdan/sh's new BashOpts API" (#3035), not a version bump; the baseline figure 3.14.1 is not contradicted or re-confirmed by these pages (the go.mod was not read). Nightly: dependency updates are `golang.org/x/crypto` v0.59.0, `golang.org/x/net` v0.62.0 and `go-jose/v4` v4.1.6, with no mvdan/sh mention.
2. Claim: SH-CI-20 builtin coreutils list (`base64 cat chmod cp find gzip ls mkdir mktemp mv rm shasum tar touch xargs`) and "Task 3.45.3+". Status: unchanged. The CHANGELOG still carries the v3.45.3 entry "Task now includes built-in core utilities ...". No entry in v3.53.1, v3.54.0, the unreleased section or the nightly touches the set. The [schema reference page](https://taskfile.dev/docs/reference/schema) does not list the utilities, so the docs give no new list either way. The list itself was not re-derived from source in this delta; it stays as measured on 2026-10-11.
3. Claims: SH-CI-25 to SH-CI-27 (Windows developer runs, template output, `platforms:` negation rc 102, measured on 3.54.0). Status: unchanged. No release after 3.54.0. The nightly mentions "an `exeExt` platform variable" added to the docs, and a fsbroker bump that restores FreeBSD for watch mode; neither changes `platforms:` validation. The schema page still defines `platforms` as "Platforms where this task should run." with a GOOS example and says nothing on negation.
4. Claim: SH-CI-32 and SH-CI-17, `set: [pipefail]` at Taskfile, task or cmd level. Status: unchanged. The schema page lists `pipefail` ("Pipe failures propagate.") among `set` options and shows `set: [errexit, nounset, pipefail]`. No changelog entry in the window concerns `set`, `shopt` or `status:` scope. The go-task/task#2469 status (open, per ci.md) was not re-checked.
5. Claim: any ci.md text naming `task 3.51.1+` (SH-CI-26) or `Task 3.45.3`. Status: unchanged, no newer release to extend the scope.

Other v3.54.0 facts worth a reader's awareness, not touching a ci.md claim: user-cancelled tasks now exit 205 instead of 201; remote Taskfiles became default-enabled in v3.53.1; v3.53.1 added a per-command `timeout` (exit 124). ci.md SH-CI-20 quotes rc 201 for a missing executable; that value is a different code path (executable not found), and the 201-to-205 change is only for user cancellation, so the row stands.

### GitLab Runner (claim 6)

6. Claims: SH-CI-28 to SH-CI-30 and SH-CI-33 ("GitLab's runner sets errexit and pipefail", quoting for `script:`, Windows-runner jobs run PowerShell). Status: unchanged on what the release notes and docs state, with two caveats.
   - The [shell executors doc](https://docs.gitlab.com/runner/shells/) says: "PowerShell Core is the default shell for new runner registration on Windows", that this registration default applies only when `shell` is set in `config.toml`, that "The `docker-windows` and `kubernetes` executors default to PowerShell Desktop at runtime" and that "The `shell` executor defaults to PowerShell Core." It does not discuss `set -e` or pipefail. This supports SH-CI-33 (Windows jobs run PowerShell) as stated.
   - The [runner CHANGELOG](https://gitlab.com/gitlab-org/gitlab-runner/-/raw/main/CHANGELOG.md) (first 100000 characters read of 511222) lists v19.6.1 (2026-11-24, security fix and dependency updates), v19.6.0 (2026-11-17), v19.5.4 and v19.4.5 (2026-11-24), v19.5.3, v19.4.4, v19.3.6 (2026-11-05), v19.5.2, v19.4.3, v19.3.5 (2026-10-28), v19.5.1 (2026-10-22), v19.4.2 and v19.3.4 (2026-10-23), v19.5.0 (2026-10-14). No entry names errexit, pipefail or the prologue, and none changes the Windows default shell. v19.6.0 adds "Add support for Windows 11 26H2", "Escape all single-quote characters in PowerShell strings" (backported to 19.5.2, 19.4.3 and 19.3.5), "Fix PowerShell environment variable length for commit messages"; v19.5.0 deprecates the Windows legacy process strategy flag. These touch PowerShell quoting, relevant to SH-CI-33's PowerShell half only in that generated-script escaping is fixed on the runner side.
   - Caveat A, possible future shift in "stops at first failing line": the v19.6.0 entry "Skip the exit-code check after else and negated lines" ([MR !7553](https://gitlab.com/gitlab-org/gitlab-runner/-/merge_requests/7553)). The fetched MR page says it changes the concrete bash script generator behind the `FF_CONCRETE` and `FF_ENABLE_BASH_EXIT_CODE_CHECK` feature flags: with the flag on, the generator appends `_runner_exit_code=$?; if [ $_runner_exit_code -ne 0 ]; then exit $_runner_exit_code; fi` after each user line, and the MR makes that check skip `!`, `fi`, `done`, `until ... do` and bare `else` lines so it matches errexit. The page says `false && echo X` still aborts the job where errexit would continue (known gap). The page showed the MR as open (last edited 2026-10-20) while the changelog lists it under v19.6.0, so whether and where it shipped is **could not determine** from these pages. It is flag-gated either way, so the default behaviour ci.md describes is unchanged.
   - Caveat B: v19.6.0 "Honor the configured shell for concrete bash scripts" ([MR !7541](https://gitlab.com/gitlab-org/gitlab-runner/-/merge_requests/7541)). Per the fetched page, on the concrete path `shell = "sh"` now runs `sh` (before, bash was always preferred); `bash`, unknown and empty values prefer bash with an `sh` fallback; the page does not say anything on errexit or pipefail. The page showed an "Oct 08, 2026" date and no merged mark. Same flag-gated concrete path, so SH-CI-28's "dialect of the image's shell" advice is unaffected by default. "Resolve concrete shell names where legacy does" (!7776) is the same family.
7. Open question "does a combined `script:` block stop at the first failing line on a real runner": **could not determine** from sources. No doc or changelog entry states it, and the real-runner probe has not been run in this delta. The entries in Caveat A show the runner's own exit-code check is the mechanism under development, so the probe stays open and gains a flag-state dimension (`FF_ENABLE_BASH_EXIT_CODE_CHECK` on or off).

## Normative guidance candidates

1. No SH-CI row to change or add. Rationale: no upstream fact in the window contradicts any claim. Verification: re-read the Task CHANGELOG head for a version newer than v3.54.0 and the runner CHANGELOG for entries naming errexit, pipefail or "prologue".
2. Corpus scheduling note, not a rule: when a Task release newer than 3.54.0 appears, re-run `Taskfile.assoc.yml`, C12, the `platforms:` negation plant and the 68-name probe, covering SH-CI-17, SH-CI-18, SH-CI-20, SH-CI-25, SH-CI-26, SH-CI-27 and SH-CI-32. Verification: `task --version` output in the cell log matches the new release.
3. Optional wording for the shell-ci Open questions, if the owner wants it: add that GitLab Runner v19.6.0 lists the flag-gated bash exit-code check (`FF_ENABLE_BASH_EXIT_CODE_CHECK`) and that the combined-`script:` probe should record the flag state. Rationale: the changelog shows the mechanism is being changed. Verification: grep ci.md Open questions for `FF_ENABLE_BASH_EXIT_CODE_CHECK`.
4. Optional metadata edit: line 9 and SH-CI-28's scope "main as of 2026-10-11" can be dated 2026-11-27 only after the runner source is re-read; this delta read the changelog and two MR pages, not the source tree, so do not advance the date on that basis alone.

## AI-agent angle

- An agent may assume a newer Task (3.55) changed builtin utilities or pipefail scope. Nothing in the nightly notes supports it. Check: `task --version` against the pinned version in the cell log.
- An agent may state that the GitLab runner "now stops at the first failing line" or "now runs sh for `shell = sh`" as default behaviour. Both MRs are on the flag-gated concrete path. Check: grep the job log for the generated script and flag state.

## Contested / evolving

- Runner exit-code check (!7553): active development, `&&`/`||` lists not yet matched to errexit, status open or shipped unclear as of 2026-11-27.
- Task: v3.55.0 is only a nightly as of 2026-11-27; the next stable may carry more.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/go-task/task/releases | Task release page | v3.54.0 2026-10-01, nightly 2026-11-27 | newest release and pre-release notes |
| https://raw.githubusercontent.com/go-task/task/main/CHANGELOG.md | Task CHANGELOG | to 2026-11-27 | mvdan/sh, core utils history |
| https://taskfile.dev/docs/reference/schema | Task schema reference | current | `set`, `platforms` wording |
| https://gitlab.com/gitlab-org/gitlab-runner/-/raw/main/CHANGELOG.md | Runner CHANGELOG, first 100000 of 511222 characters | v19.5.0 to v19.6.1 | shell and Windows entries |
| https://docs.gitlab.com/runner/shells/ | Runner shells doc | current | Windows default shell |
| https://gitlab.com/gitlab-org/gitlab-runner/-/merge_requests/7553 | exit-code check MR | edited 2026-10-20 | errexit parity |
| https://gitlab.com/gitlab-org/gitlab-runner/-/merge_requests/7541 | configured-shell MR | edited 2026-10-08 | shell selection |

The seven sources are fewer than the twelve the full-research contract requires, which is expected for a delta commission; the builtin-coreutils docs page was not located (the schema page lists none) and GitLab's `script:` keyword docs were not fetched.

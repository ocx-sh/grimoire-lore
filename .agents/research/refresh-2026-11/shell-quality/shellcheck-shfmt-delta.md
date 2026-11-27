---
title: ShellCheck and shfmt delta, 2026-10-11 to 2026-11-27
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 9
---

# ShellCheck and shfmt delta

Scope: releases and changelogs of koalaman/shellcheck and mvdan/sh in the window 2026-10-11 to 2026-11-27, checked against the quoted claims of the shell-quality pair. This is a delta update, not a re-creation.

## Summary

1. No ShellCheck release after 0.11.0 exists. The releases feed lists v0.11.0 (2025-08-03) as the newest, and the tags feed agrees. Every ShellCheck claim tied to "0.11.0" stays true.
2. No shfmt release exists in the window. The newest is v3.14.1 (2026-09-06), which predates the window. v3.15.0 is unreleased (its changelog heading reads "2026-11-??").
3. ShellCheck master moved in the window (commits on 2026-10-28, 11-08, 11-10, 11-24, 11-27). The only changelog items newer than the baseline that touch the pair are extended-analysis=local and the exit/return diagnostics SC2339/SC2340/SC2341/SC3426, both unreleased.
4. The master-only facts the pair already records (SC2337 added, SC3040 pipefail relaxed, SC3003 removed) are all still unreleased. They are still master-only on 2026-11-27.
5. One text edit is warranted that is not window-caused: shfmt 3.14.0 (2026-08-28) added `--detect`, so "shfmt 3.13.1 has no `--detect`" is true only for 3.13.1 and misleads if read as "no shfmt has it".
6. Rule line 188 needs no new number.

## Findings

### 1. ShellCheck releases

The releases feed at https://github.com/koalaman/shellcheck/releases.atom lists as newest "Stable version v0.11.0", feed updated 2025-08-03; the releases page https://github.com/koalaman/shellcheck/releases shows the same top entry; the tags feed https://github.com/koalaman/shellcheck/tags.atom lists v0.11.0 first. Verdict: no release in the window and none since 0.11.0. No row needs a measured re-run.

### 2. ShellCheck master (unreleased), per https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md

Section "Git" (unreleased) lists: `--files-from`, `extended-analysis=local`, EditorConfig `shellcheck.*` keys, SC2337 (grep -q in pipelines under pipefail), SC2338, SC2339/SC2340/SC2341/SC3426 (exit/return validation), SC3040 "Support pipefail as specified in POSIX.1-2024", fixes to SC1072, SC2064, SC2114/SC2115, SC2317, and "Removed: SC3003 ... specified in POSIX.1-2024".

Commit dates from https://github.com/koalaman/shellcheck/commits/master/CHANGELOG.md.atom: SC2064 readonly (2026-10-28), SC1072 (2026-10-28 and merge 2026-11-08), SC2114 (2026-11-10), SC2317 (2026-11-24), exit/return diagnostics and extended-analysis=local (2026-11-27). Which of the other Git items predate the window could not be determined from the feed alone; they do not affect the pair's claims.

Wiki pages read from https://raw.githubusercontent.com/wiki/koalaman/shellcheck/: SC2337 exists and describes grep -q under pipefail; SC3040 has a `pipefail` section; SC3003 page still exists (describes it as undefined in POSIX sh); SC1103 still says zsh is unsupported ("One notable unsupported shell type is zsh"). The wiki is not versioned, so it tracks master, not 0.11.0.

### 3. shfmt releases

https://github.com/mvdan/sh/releases.atom: v3.14.1 (2026-09-06), v3.14.0 (2026-08-28), v3.13.1 (2026-04-06), v3.13.0 (2026-03-09), v3.12.0 (2025-07-07). Release page https://github.com/mvdan/sh/releases confirms: 3.13.0 introduces zsh parser and formatter support; 3.13.1 fixes zsh parsing and detects the variant from filenames such as `.zshrc`, not from shebangs; 3.14.0 adds `--detect` (find shell files by executable bit or shebang) and recognizes dash shebangs as POSIX for `-ln=auto`, plus more zsh syntax; 3.14.1 is a zsh prefix fix. None of the notes mention `-f` discovery changes (3.11.0's `-f=0` is output splitting only).

shfmt master changelog https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md, section "[3.15.0] - 2026-11-??", unreleased: `--block-next-line`, fallback EditorConfig at `$XDG_CONFIG_HOME/shfmt/editorconfig` with `case_indent` and `language_dialect` properties, "Reject `[[`, `select`, and `function` with `LangPOSIX`", more zsh constructs. Master commits run to 2026-11-25. Nothing here changes `-f` discovery or shebang-less dialect defaults in what was read.

### 4. Per-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| Rule line 188 "ShellCheck 0.11.0, shfmt 3.13.0 or newer" | unchanged | no release after 0.11.0; shfmt "or newer" still holds |
| Rule line 199 "measured on ShellCheck 0.11.0, shfmt 3.13.1" | unchanged | measurement record, still valid; 3.14.1 exists since 2026-09-06 but was not measured, pre-window |
| SH-CORE-07 "0.11.0 at default severity passes all six" | unchanged | no new release |
| ci.md SH-CI-16 "SC2337 ... only on unreleased master" | unchanged | still in the unreleased "Git" section |
| dialect.md SH-DIAL-08 "probe line raises SC3040 twice on 0.11.0", "Pin ShellCheck until an sh floor with `$'..'` exists" | unchanged | master relaxes SC3040 and removes SC3003 but no release carries it |
| gates.md SH-GATE-07 "SC3040 on 0.9.0 to 0.11.0" | unchanged | same |
| shell-errexit Open questions (master relaxes SC3040/SC3003, SC2337 unreleased, data-flow may change SC2310/SC2312 counts) | unchanged, with one addition | still accurate; master now also has `extended-analysis=local` (2026-11-27) and the exit/return diagnostics; effect on SC2310/SC2312 counts could not be determined without a master build |
| zsh.md SH-ZSH-13 SC1071 on zsh, `shell=zsh` rejected (SC1103) | unchanged | SC1103 wiki still says zsh unsupported |
| errors.md SH-ERR-33 "reads only the nearest rc and never merges" | could not determine for master | no changelog item changes rc lookup; master adds EditorConfig `shellcheck.*` keys, whose interaction with rc lookup is undocumented in what was read. Holds for 0.11.0 |
| gates.md line 7 "shfmt 3.12.0 to 3.14.1 (3.13.0 or newer for `.zsh`)" | unchanged | 3.14.1 is still newest release |
| dialect.md SH-DIAL-02 "shfmt 3.13.1 parses a shebang-less `.sh` as bash" | unchanged as written | 3.14.0 only adds dash shebang recognition; no shebang-less default change found. Not re-measured on 3.14.1: could not determine |
| dialect.md SH-DIAL-21 "shfmt 3.13.1 has no `--detect`" | changed | old text: 3.13.1 has no `--detect`; new fact: `--detect` exists from 3.14.0; source https://github.com/mvdan/sh/releases; upstream date 2026-08-28 (before the window, so the baseline may already know it; verify the row names a version, not "shfmt") |
| zsh.md SH-ZSH-12 advisory `shfmt -ln zsh`, `-f` discovery for zsh (3.13.0 or newer) | unchanged | no `-f` change in 3.13.1 to 3.14.1 notes |
| `.shellcheckrc` keys `enable=check-set-e-suppressed`, `enable=deprecate-which`, `external-sources=true`, `source-path=SCRIPTDIR` | unchanged | no key removed or renamed in master changelog; `deprecate-which` still listed in the older changelog entry |

## Normative guidance candidates

1. Rule: keep the pinned-tool sentence on line 188 at "ShellCheck 0.11.0, shfmt 3.13.0 or newer". Rationale: no new release exists in the window. Verification: `curl -sL https://github.com/koalaman/shellcheck/releases.atom | grep -m1 'Stable version'` prints v0.11.0.
2. Rule: where a row says shfmt "has no `--detect`", name the version range (3.13.1 and earlier; `--detect` from 3.14.0). Rationale: the bare 3.13.1 statement reads as a tool-wide absence. Verification: `shfmt --version` on 3.14.1 followed by `shfmt --help | grep -- --detect`.
3. Rule: re-measure the SC3040, SC3003 and SC2337 rows only when ShellCheck publishes a release newer than 0.11.0. Rationale: master facts are not testable on the pinned binary. Verification: the releases feed above shows a version other than v0.11.0.

## AI-agent angle

An agent reading the SC2337 or SC3040 wiki pages will assume the checks fire in the pinned 0.11.0 binary, because the wiki tracks master. Mechanical check: run `shellcheck --version` and a one-line probe (`set -o pipefail; cmd | grep -q x`) before citing the code.

## Contested / evolving

ShellCheck has been unreleased since 2025-08-03 while master gains substantial changes (SC3040/SC3003 relaxation, SC2337, extended-analysis=local). A 0.12.0 release would break the SH-DIAL-08, SH-GATE-07, SH-CI-16 and shell-errexit rows at once and would need measured re-runs of all four. shfmt 3.15.0 is imminent ("2026-11-??") with more zsh support and a stricter POSIX dialect (rejects `[[`, `select`, `function`); re-check SH-DIAL-02 and SH-ZSH-12 when it ships.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/koalaman/shellcheck/releases | releases page | read 2026-11-27 | newest is v0.11.0 |
| https://github.com/koalaman/shellcheck/releases.atom | release feed | 2025-08-03 newest | release evidence |
| https://github.com/koalaman/shellcheck/tags.atom | tag feed | read 2026-11-27 | confirms no newer tag |
| https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md | master changelog | master 2026-11-27 | unreleased items |
| https://github.com/koalaman/shellcheck/commits/master/CHANGELOG.md.atom | changelog commit dates | 2026-10-28 to 2026-11-27 | window dating |
| https://raw.githubusercontent.com/wiki/koalaman/shellcheck/SC2337.md (also SC3040, SC3003, SC1103) | wiki pages | read 2026-11-27 | per-code status |
| https://github.com/mvdan/sh/releases and releases.atom | shfmt releases | 3.14.1 2026-09-06 | release evidence |
| https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md | shfmt master changelog | 3.15.0 unreleased | upcoming changes |
| https://github.com/mvdan/sh/commits/master.atom | master commits | to 2026-11-25 | activity evidence |

Not fetched: wiki pages SC2310 and SC2312 (no changelog item names them), and the GitHub API (rate limited, so feeds and raw files were used instead).

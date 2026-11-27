---
title: shell-diagnose refresh decision (spillover round)
target: shell-diagnose
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/shell-diagnose/spillover-check.md
---

# shell-diagnose refresh decision (spillover round)

## Verdict

One confirmed spillover item from shell-quality changes the target. Two sentences in shell-diagnose still describe the `ubuntu-latest` move to Ubuntu 26.04 as a future event due by 2026-11-19. The actions/runner-images repository moved the label to 26.04 in its README on 2026-11-24 (PR 15381). Both sentences change in place. No rule or step ID changes, and no new rule is added. The patch is a factual correction, so the skill takes a patch bump.

The replacement text says "has pointed at 26.04", which matches what the primary source establishes: the README label moved. It does not claim that every runner already routes to 26.04, because PR 15381 is a documentation change and ran no routing tests. The wording matches the first-round text of SH-CI-15 in rules/shell-quality.md and skills/shell-quality-reference/ci.md ("`ubuntu-latest` has been ubuntu-26.04 since 2026-11-24"), so the skill does not contradict the rule it cites.

## Changed statements

1. skills/shell-diagnose/SKILL.md, lines 224 to 225.
   - Old: "`ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15, SHOULD), and a `shell: sh` step changes behaviour in that window."
   - New: "`ubuntu-latest` has pointed at 26.04 since 2026-11-24 (runner-images PR 15381; SH-CI-15, SHOULD), so a `shell: sh` step that passed on 24.04 can change behaviour."
   - Source: https://github.com/actions/runner-images/pull/15381, merged 2026-11-24.
   - Verification: `grep -rn "2026-11-19" skills/shell-diagnose/` returns no match, and `grep -n "since 2026-11-24" skills/shell-diagnose/SKILL.md` returns one match.

2. skills/shell-diagnose/references/symptom-text.md, line 36.
   - Old: "`ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15), so the text a CI log shows changes in that window."
   - New: "`ubuntu-latest` has pointed at 26.04 since 2026-11-24 (runner-images PR 15381; SH-CI-15), so the text a CI log shows for `sh` steps changed with that move."
   - Source: https://github.com/actions/runner-images/pull/15381, merged 2026-11-24.
   - Verification: `grep -n "since 2026-11-24" skills/shell-diagnose/references/symptom-text.md` returns one match.

## New rules

None.

## Declined

None. The spillover check holds one item, and it is confirmed by a primary source.

## Sources

- https://github.com/actions/runner-images/pull/15381 ("docs: associate ubuntu-latest with Ubuntu 26.04"), opened 2026-11-22, merged 2026-11-24. Primary source, from the actions/runner-images repository.

## Revision log

- 2026-11-27: spillover round. Two dated sentences about the `ubuntu-latest` move to 26.04 are corrected in place, aligned with the first-round SH-CI-15 text in shell-quality.

### Edit list (spillover round)

1. File: skills/shell-diagnose/SKILL.md
   - Find (verbatim):
     ```
     as a fact. `ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15, SHOULD), and a
     `shell: sh` step changes behaviour in that window. ShellCheck 0.11.0 finds it
     ```
   - Replace with:
     ```
     as a fact. `ubuntu-latest` has pointed at 26.04 since 2026-11-24 (runner-images
     PR 15381; SH-CI-15, SHOULD), so a `shell: sh` step that passed on 24.04 can
     change behaviour. ShellCheck 0.11.0 finds it
     ```

2. File: skills/shell-diagnose/references/symptom-text.md
   - Find (verbatim):
     ```
     `ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15), so the text a CI log shows changes in that window.
     ```
   - Replace with:
     ```
     `ubuntu-latest` has pointed at 26.04 since 2026-11-24 (runner-images PR 15381; SH-CI-15), so the text a CI log shows for `sh` steps changed with that move.
     ```

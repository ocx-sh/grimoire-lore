---
title: shell-diagnose spillover check
target: shell-diagnose
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/actions/runner-images/pull/15381
---

# Item 1: `ubuntu-latest` already moved to 26.04

Item (from shell-quality): SKILL.md line 224 and references/symptom-text.md line 36 still say `ubuntu-latest` moves to 26.04 by 2026-11-19. It has been 26.04 since 2026-11-24 (runner-images PR 15381).

Verdict: confirmed by primary source, with one caveat.

Source: https://github.com/actions/runner-images/pull/15381 ("docs: associate ubuntu-latest with Ubuntu 26.04"), the actions/runner-images repository itself. It states: opened 2026-11-22, merged 2026-11-24, moving the `ubuntu-latest` label in the README Available Images table from the Ubuntu 24.04 x64 row to the 26.04 x64 row. The planned completion date in issue 14748 was 2026-11-19. Caveat: the PR is a documentation change. It says the scheduled completion date alone does not verify rollout, and it ran no routing tests. So "the README label has pointed at 26.04 since 2026-11-24" is established; "every runner already routes to 26.04" is not. The originating decision file (.agents/research/refresh-2026-11/shell-quality.md) cites the same PR and date.

Affected text in the target, quoted verbatim:

- skills/shell-diagnose/SKILL.md, line 224 (continuing on 225): "`ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15, SHOULD), and a `shell: sh` step changes behaviour in that window."
- skills/shell-diagnose/references/symptom-text.md, line 36: "`ubuntu-latest` moves to 26.04 by 2026-11-19 (SH-CI-15), so the text a CI log shows changes in that window."

Smallest change that makes the target true on 2026-11-27:

- SKILL.md: replace the sentence with "`ubuntu-latest` has pointed at 26.04 since 2026-11-24 (runner-images PR 15381; SH-CI-15, SHOULD), so a `shell: sh` step that passed on 24.04 can change behaviour."
- symptom-text.md: replace the sentence with "`ubuntu-latest` has pointed at 26.04 since 2026-11-24 (runner-images PR 15381; SH-CI-15), so the text a CI log shows for `sh` steps changed with that move."

---
title: Spillover check for shell-quality
target: shell-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/actions/runner-images/issues/14748
  - https://github.com/actions/runner-images/pull/15381
  - https://raw.githubusercontent.com/actions/runner-images/main/README.md
---

# Spillover check for shell-quality

## Item 1 (from powershell-quality)

Item: "ubuntu-latest now maps to Ubuntu 26.04 (gradual migration over 1-2 months, runner-images issue 14748); any SH-CI text that equates ubuntu-latest with 24.04 or names hosted pwsh 7.6.6 is stale (images of 2026-11-16 carry pwsh 7.6.10). Runner prelude and epilogue are byte-identical, so SH-CI-11 and SH-CI-12 hold."

Evidence in the originating pair: .agents/research/refresh-2026-11/powershell-quality/actions-runner-and-images-pwsh.md (points (c) and (d), source list) and powershell-quality.md line 27.

Verdict: target already correct (ubuntu-latest half confirmed by primary source). The pwsh 7.6.10 image figure was not re-fetched here, because the target makes no hosted-image pwsh claim.

Sources:
- https://github.com/actions/runner-images/issues/14748 : primary. States rollout from 2026-10-19 over several weeks, planned end 2026-11-19. Commenters (not official) report ubuntu-latest already on 26.04 on 2026-11-15, so the README date is not the first day jobs landed on 26.04.
- https://github.com/actions/runner-images/pull/15381 : primary. "docs: associate ubuntu-latest with Ubuntu 26.04", merged 2026-11-24. A README table fix; the author notes the date alone does not prove the rollout finished.
- https://raw.githubusercontent.com/actions/runner-images/main/README.md : primary. Row "x64 | `ubuntu-latest` or `ubuntu-26.04`".

Affected target text, none of it stale:
- rules/shell-quality.md line 200: "`ubuntu-latest` has been 26.04 since 2026-11-24 (SH-CI-15)".
- skills/shell-quality-reference/ci.md SH-CI-15: "`ubuntu-latest` has been ubuntu-26.04 since 2026-11-24, and ubuntu-24.04 stays available by its explicit label." Its evidence cell already says "Runner-images PR 15381 moved the label in the README on 2026-11-24, after the announced 2026-11-19 rollout end."
- skills/shell-quality-reference/gates.md line 10: "`ubuntu-latest` has resolved to 26.04 (ShellCheck 0.11.0, shfmt 3.12.0) since 2026-11-24".
- skills/shell-quality-reference/dialect.md line 37: "# Kind: CI helper. Floor: bash 5.2 (pinned: ubuntu-24.04 runner)." This pins 24.04 explicitly, so it does not equate ubuntu-latest with 24.04.
- testing.md line 140 `runs-on: ubuntu-latest` is an example workflow with no version claim.
- Hosted pwsh: no hit for "7.6.6" in the target describes a hosted image. ci.md line 10 and emit.md line 9 list "pwsh 7.4.7 and 7.6.6" as the versions measured on 2026-10-11, which is a host measurement and stays true.
- SH-CI-11 and SH-CI-12 are unchanged and need no edit.

Smallest change to make the target true on 2026-11-27: none required. Optional precision only: the date 2026-11-24 is when the README label moved, and issue 14748 comments show jobs on 26.04 from about 2026-11-15, so "since 2026-11-24" could read "labelled 26.04 in the runner-images README since 2026-11-24". SH-CI-15 already says the README date in its evidence cell.

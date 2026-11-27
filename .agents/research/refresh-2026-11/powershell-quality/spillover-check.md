---
title: powershell-quality spillover check
target: powershell-quality
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle
  - https://api.github.com/repos/PowerShell/PowerShell/releases (gh api)
  - https://docs.zizmor.sh/release-notes/
  - https://api.github.com/repos/zizmorcore/zizmor/releases (gh api)
  - https://gitlab.com/gitlab-org/gitlab-runner/-/raw/main/CHANGELOG.md
  - https://github.com/axodotdev/cargo-dist/pull/2497
  - https://github.com/axodotdev/cargo-dist/releases
---

Evidence for all three items originates in refresh-2026-11/shell-quality/ (decision file refresh-2026-11/shell-quality.md) and refresh-2026-11/powershell-quality/.

## Item 1 (from shell-quality): pwsh 7.4 and 7.5 end of support 2026-11-10, 7.6 LTS to 2028-11-14, 7.7.0 stable since 2026-11-10

Verdict: target already correct (primary source confirms the facts, with one caveat).

- Primary: https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle (ms.date 2026-08-13, updated 2026-09-09) lists 7.4 (LTS) end of support 10-Nov-2026, 7.5 end of support 10-Nov-2026 and 7.6 (LTS) released 18-Mar-2026, end of support 14-Nov-2028. The page is stale on 7.7: it still shows 7.7 as preview with no dates.
- Primary: GitHub releases of PowerShell/PowerShell: v7.7.0 published 2026-11-10T20:18:47Z, prerelease false (v7.7.0-rc.1 was 2026-10-29); v7.6.10 published 2026-11-10.
- Not found: any published end-of-support date for 7.7 (the Learn table leaves it blank).
- Affected text, /home/mherwig/dev/ocx-sh/grimoire-lore/rules/powershell-quality.md line 163: "Dated end point: pwsh 7.4 and 7.5 reached end of support on 2026-11-10, so no `#Requires` floor names them and a 7.4.7 result is a measurement record, not a target. pwsh 7.7.0 shipped on 2026-11-10 with no published end-of-support date, so the floor stays 7.6 (LTS to 2028-11-14)."
- Other dated text, skills/powershell-quality-reference/gates.md line 8 and native.md line 8: "pwsh 7.4.7 (end of support 2026-11-10)". True.
- Smallest change: none. Optional: the gates.md line 47 note "pwsh 7.6.10 (image readmes of 2026-11-16...)" is consistent with the releases list.

## Item 2 (from shell-quality): zizmor 1.31.0 tree-sitter PowerShell grammar; GitLab Runner 19.6.0 escapes single quotes (backports 19.5.2, 19.4.3, 19.3.5)

Verdict: confirmed by primary source (both halves). Target says nothing on either point.

- zizmor: release notes https://docs.zizmor.sh/release-notes/ say 1.31.0 "uses a tree-sitter grammar for PowerShell" and fix the use-trusted-publishing audit for PowerShell blocks (issue #2444). Release date from the GitHub release https://github.com/zizmorcore/zizmor/releases/tag/v1.31.0: 2026-10-15.
- GitLab Runner: https://gitlab.com/gitlab-org/gitlab-runner/-/raw/main/CHANGELOG.md, v19.6.0 (2026-11-17): "Escape all single-quote characters in PowerShell strings [!7709]". Backports listed: v19.5.2, v19.4.3, v19.3.5, all dated 2026-10-28 ("Backport escaping of all PowerShell single-quote characters to 19-N-stable", !7710, !7711, !7712).
- Affected text: grep of /home/mherwig/dev/ocx-sh/grimoire-lore/rules/powershell-quality.md and skills/powershell-quality-reference/ finds no mention of zizmor, tree-sitter, or a GitLab Runner version. The only GitLab text is rules/powershell-quality.md line 137, "Writing the `.sh` half of a script pair, a workflow, a Taskfile or a GitLab job", which routes to shell-quality and is unaffected.
- Smallest change: none required. Neither fact changes a rule; they are upstream tool changes outside the target's claims. If the owner wants a trace, add one clause to line 162 area, for example "GitLab Runner 19.6.0 (and 19.5.2, 19.4.3, 19.3.5) escape all single quotes in generated PowerShell strings, so a runner older than those does not match this rule set's quoting measurements." Not recommended without a measurement.

## Item 3 (from shell-quality): cargo-dist PR 2497 still open, cargo-dist at 0.34.0, sh installer must not gate on a PowerShell PR

Verdict: confirmed by primary source. Target already correct (it never gates on the PR).

- https://github.com/axodotdev/cargo-dist/pull/2497 "Verify archive checksums in PowerShell installers": state open, not merged, created 2026-09-03.
- https://github.com/axodotdev/cargo-dist/releases: latest is v0.34.0, published 2026-11-02T05:56Z (release header dated 2026-11-01).
- Affected text: powershell-quality (rule and reference skill) contains no mention of cargo-dist or PR 2497; skills/powershell-quality-reference/security.md PS-SEC-01 and PS-SEC-03 state the checksum requirement for any `install.ps1` without naming cargo-dist. The cargo-dist statements live in the installer-script pair, already covered by refresh-2026-11/installer-script/spillover-check.md (item 1), which concludes no sh row waits on the PR.
- Smallest change for powershell-quality: none.

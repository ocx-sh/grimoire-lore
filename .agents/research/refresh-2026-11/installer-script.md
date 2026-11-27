---
title: installer-script refresh decision, spillover round, 2026-11-27
target: installer-script
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/installer-script/spillover-check.md
---

# installer-script refresh decision, spillover round

## Verdict

Three small in-place edits to skills/installer-script/SKILL.md, with no new rules and no new IDs. The spillover check carried three items, and primary sources confirm all three. The first round of this refresh did not change any file under the skill, so these edits build on the text as it was first published.

- Item 1 (cargo-dist PR 2497 and the 0.34.0 release). The skill is already correct. It ties only row 8, the PowerShell half, to the open upstream fix, and no sh row waits on it. The row 8 sentence now names the PR and records that the PR is still unmerged on 2026-11-27 and is not in 0.34.0. A reader can then re-check the state instead of guessing what "an open upstream fix" means. The "cargo-dist 0.33.0" labels stay, because they are true as measurements.
- Item 2 (Windows PowerShell 5.1 deprecated on 2026-11-17, KB5137172). The floor decision stays. The install.ps1 floor sentence now says that 5.1 is deprecated but still ships and gets security updates, so a model that reads the deprecation news does not move the floor to pwsh 7. The intro's "7.4 reaches end of support 2026-11-10" becomes past tense, because that date has passed.
- Item 3 (pwsh 7.7 is MSIX-only and registers per user). Declined. The skill does not install pwsh, and the kit preflight already reports a missing pwsh, which the skill says is never a pass.

## Changed statements

1. SKILL.md intro, the measurement record. "7.4 reaches end of support 2026-11-10" becomes "7.4 reached end of support on 2026-11-10". Verification: the date is in the past on 2026-11-27, and the sentence makes no other claim.
2. SKILL.md, install.ps1 steps, the floor sentence. A sentence is added: Windows PowerShell 5.1 was deprecated on 2026-11-17 (KB5137172), but it still ships in Windows and gets security updates, so it stays the floor. Verification: https://support.microsoft.com/help/5137172 states the deprecation, continued security updates, and that it stays enabled by default through Windows Server 2025 and Windows 11 26H2. Re-check that page before any later round moves the floor.
3. SKILL.md, Generated installers, the row 8 sentence. "has an open upstream fix" becomes "has an open upstream fix (cargo-dist PR 2497, still unmerged on 2026-11-27 and not in 0.34.0)". Verification: https://github.com/axodotdev/cargo-dist/pull/2497 shows the state Open. The 0.34.0 entry on https://github.com/axodotdev/cargo-dist/releases lists no installer or PowerShell checksum change. When the PR merges, re-render the installer with the release that contains it, re-run cargo-dist-audit.sh, and update row 8 and this sentence.

## New rules

None. No step, row or rule ID is added or renumbered.

## Declined

- Item 3, the pwsh 7.7 MSIX note ("a SYSTEM, service or scheduled-task host must install the 7.6 MSI or check `Get-Command pwsh` and refuse"). Declined because the skill installs no pwsh. Its only pwsh text is the kit preflight, which already reports a missing pwsh, and the skill says a missing interpreter is never a pass. Setting up the test host is outside the procedure. The "7.6 MSI is the all-users route" advice is also secondary: it comes from a comment the check did not fetch.
- Item 1, the optional clause "Measured on 0.33.0. 0.33.1 and 0.34.0 list no installer change but were not re-rendered." Declined because the skill already says to pin the generator version and to run the audit on the rendered file, which covers any version. The table header already says "measured", and the row 8 sentence now carries the one version fact that matters.
- Item 1, the cargo-dist-audit.sh line 3 comment "cargo-dist 0.33.0 template". Kept as is, because it is a true measurement label.
- Item 3, the receipt line "engines (5.1 build, 7.4 and 7.6 builds)". Kept as is. It is a record of which engines were run, and 7.4 going out of support does not make that record false.

## Sources

- https://github.com/axodotdev/cargo-dist/pull/2497: "Verify archive checksums in PowerShell installers", open, not merged, no reviews, last activity 2026-09-03.
- https://github.com/axodotdev/cargo-dist/releases: 0.34.0 on 2026-11-02 (tag 2026-11-01), 0.33.1 on 2026-10-21 and 0.33.0 on 2026-09-11. No release lists a PowerShell checksum change.
- https://support.microsoft.com/help/5137172, published 2026-11-17: Windows PowerShell 5.1 is deprecated, gets no new features, still gets security updates and remains in Windows.
- https://devblogs.microsoft.com/powershell/powershell-msi-deprecation/, published 2026-04-10: no MSI for 7.7 GA and later, and MSI continues for existing releases, including 7.6. Bears on the declined item 3 only.
- https://github.com/PowerShell/PowerShell/issues/27565: MSIX packages register per user only. Bears on the declined item 3 only.

## Revision log

- skills/installer-script/SKILL.md: the intro now says PowerShell 7.4 reached end of support on 2026-11-10, in the past tense.
- skills/installer-script/SKILL.md: the install.ps1 floor sentence adds the 5.1 deprecation (KB5137172) and the reason the floor stays.
- skills/installer-script/SKILL.md: the row 8 sentence names cargo-dist PR 2497 and its state on 2026-11-27.

### Edit list (spillover round)

1. File: skills/installer-script/SKILL.md
   Find:
   ```
   PowerShell 7.4.7 and 7.6.6 (7.4 reaches end of support 2026-11-10). macOS, BSD
   ```
   Replace with:
   ```
   PowerShell 7.4.7 and 7.6.6 (7.4 reached end of support on 2026-11-10). macOS, BSD
   ```

2. File: skills/installer-script/SKILL.md
   Find:
   ```
   The floor is Windows PowerShell 5.1, so write what 5.1 parses. Pwsh 7 is a
   second engine to test, not the target.
   ```
   Replace with:
   ```
   The floor is Windows PowerShell 5.1, so write what 5.1 parses. Pwsh 7 is a
   second engine to test, not the target. Windows PowerShell 5.1 was deprecated on
   2026-11-17 (KB5137172), but it still ships in Windows and gets security
   updates, so it stays the floor.
   ```

3. File: skills/installer-script/SKILL.md
   Find:
   ```
   release job wraps the rendered file. The PowerShell half (row 8) has an open
   upstream fix, so name the gap in the receipt and do not claim verification.
   ```
   Replace with:
   ```
   release job wraps the rendered file. The PowerShell half (row 8) has an open
   upstream fix (cargo-dist PR 2497, still unmerged on 2026-11-27 and not in
   0.34.0), so name the gap in the receipt and do not claim verification.
   ```

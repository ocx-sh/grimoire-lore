---
title: installer-script spillover check, 2026-11-27
target: installer-script
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/axodotdev/cargo-dist/pull/2497
  - https://github.com/axodotdev/cargo-dist/releases
  - https://support.microsoft.com/help/5137172
  - https://github.com/PowerShell/PowerShell/issues/27565
  - https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0
  - https://devblogs.microsoft.com/powershell/powershell-msi-deprecation/
---

# installer-script spillover check

Target files read: skills/installer-script/SKILL.md and the references directory. WebFetch summarises pages, so dates come from the fetched summaries.

## Item 1 (from shell-quality): cargo-dist PR 2497 still open, cargo-dist at 0.34.0, sh question must not wait on a PowerShell PR

Verdict: confirmed by primary source, and the target is largely already correct.

- PR 2497 "Verify archive checksums in PowerShell installers": open, not merged, no reviews, last activity 2026-09-03 (https://github.com/axodotdev/cargo-dist/pull/2497). Evidence file: refresh-2026-11/powershell-quality/installer-upstreams-cargo-dist-and-exemplars.md and shell-quality/emit-installer-test-toolchain.md.
- Releases page (https://github.com/axodotdev/cargo-dist/releases): 0.34.0 on 2026-11-02 (tag 2026-11-01), 0.33.1 on 2026-10-21, 0.33.0 on 2026-09-11. Notes cover dependencies, certificate lists and a macOS runner only. No PowerShell checksum change.
- The target never says "adopt cargo-dist once PR 2497 ships". It ties only row 8 (the PowerShell half) to the PR, which is correct. The sh rows 3 and 5 are not gated on it.

Affected text, SKILL.md:
- Table line: `| Either, generated (cargo-dist 0.33.0) | A release job renders it | Whatever the generator emits | Generated installers |`
- Row header: `| Row | Check | cargo-dist 0.33.0 template, measured |`
- `release job wraps the rendered file. The PowerShell half (row 8) has an open` / `upstream fix, so name the gap in the receipt and do not claim verification.`
- Also cargo-dist-audit.sh line 3: `# The static rows of the generated-installer checklist (cargo-dist 0.33.0 tem...`

Smallest change: the "0.33.0" statements are true as measurements. Add one clause in SKILL.md after the table, for example: "Measured on 0.33.0. 0.33.1 and 0.34.0 (2026-11-01) list no installer change but were not re-rendered, so re-render before relying on a row." Optionally name PR 2497 in the row 8 sentence ("open upstream fix, cargo-dist PR 2497, still open on 2026-11-27"). No sh row should wait on it.

## Item 2 (from powershell-quality): 5.1 deprecated 2026-11-17 (KB5137172) but stays the target

Verdict: confirmed by primary source.

- https://support.microsoft.com/help/5137172, published 2026-11-17: Windows PowerShell 5.1 is deprecated, gets no new features, still gets security updates and remains in Windows. Windows Server 2025 and Windows 11 26H2 are the last versions with it enabled by default; later it becomes a Feature on Demand. Removal will be announced in advance.
- The floor decision (5.1 stays) is therefore still right for every Windows that exists today.

Affected text, SKILL.md:
- `| `install.ps1`, hand-written | `irm URL \| iex`, `powershell -File` | Windows PowerShell 5.1 (pinned decision, adopter may override) | 0, 1, install.ps1 steps, kit |`
- `The floor is Windows PowerShell 5.1, so write what 5.1 parses. Pwsh 7 is a` / `second engine to test, not the target.`
The target says nothing about the deprecation.

Smallest change: append to the floor sentence: "Windows PowerShell 5.1 was deprecated on 2026-11-17 (KB5137172) but still ships and gets security updates, so it stays the floor." Also the intro line `Windows PowerShell 5.1.26100.9444` is a measurement record and is fine; the intro line `7.4 reaches end of support 2026-11-10` is now past tense (the date has passed), so write "reached end of support on 2026-11-10".

## Item 3 (from powershell-quality): pwsh 7.7 is MSIX-only and per user; bootstrap for SYSTEM or a service must use the 7.6 MSI or verify `Get-Command pwsh` fail-closed

Verdict: confirmed by primary source, with one precision note.

- https://devblogs.microsoft.com/powershell/powershell-msi-deprecation/, published 2026-04-10: from 7.7-preview.1 MSIX is the primary Windows installer, and MSI "isn't planned for future releases, including PowerShell 7.7 GA and beyond". MSI packages continue for existing releases, including 7.6.
- https://github.com/PowerShell/PowerShell/issues/27565 (opened 2026-06-05, open, last comment 2026-11-27): "MSIX packages register per-user only", which blocks SYSTEM and LocalSystem. The issue page does not itself say 7.7 is MSIX-only; the MSI deprecation post does.
- https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0 (10 Nov, year not shown on the page): ships `PowerShell-7.7.0.msixbundle`.
- The "7.6 MSI is the all-users route" advice comes from a Microsoft employee comment on the 7.7 GA blog post per the originating evidence (recent-shifts-powershell.md); I did not fetch that post, so that advice is secondary-level.

Affected text: SKILL.md says nothing on installing pwsh. The only pwsh mentions are the test-harness lines: `for t in pwsh; do command -v "$t" >/dev/null 2>&1 || echo "PREFLIGHT: $t miss...` and `engines (5.1 build, 7.4 and 7.6 builds)`. The skill's installers are not bootstrap installers for pwsh, so the risk is only for the kit's host.

Smallest change: add one sentence to the "Run the kit" or kit preflight text: "On Windows, pwsh 7.7 is MSIX-only and registers per user; a SYSTEM, service or scheduled-task host must install the 7.6 MSI or check `Get-Command pwsh` and refuse when it is absent." Optional, because the skill does not install pwsh. The `7.4 and 7.6 builds` engine list stays true (7.4 is out of support, so 7.6 alone is the supported pwsh floor).

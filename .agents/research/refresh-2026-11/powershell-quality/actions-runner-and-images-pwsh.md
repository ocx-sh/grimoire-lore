---
title: Actions runner and hosted images, PowerShell run-step delta
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 13
---

# Actions runner and hosted images, PowerShell run-step delta

Scope. Delta against shell-pwsh.md (revised 2026-10-11). Question: did the Actions runner or the hosted Windows and Ubuntu images change any fact the pair's PowerShell run-step rows state, between 2026-10-11 and 2026-11-27. SH-CI-11 and SH-CI-12 wording belongs to shell-quality and is not touched.

## Summary

- (a) Prelude and epilogue text: unchanged. `ScriptHandlerHelpers.cs` on main is byte-identical to the baseline commit 67f01c276e0a (both 87 lines, `diff` empty).
- (b) Env-file reader code: unchanged. `FileCommandManager.cs` on main is byte-identical to 67f01c276e0a (both 497 lines, `diff` empty). Both are `File.ReadAllLines(filePath, Encoding.UTF8)` for the path file and `File.ReadAllText` for the env files, and `File.Create(newPath).Dispose()` creates each file empty.
- (c) Preinstalled versions (images of 2026-11-16): pwsh 7.6.10 on windows-2025, ubuntu-24.04 and ubuntu-26.04 (baseline said 7.6.6); PSScriptAnalyzer 1.25.0 on all three; Pester 5.9.0 on all three, plus Pester 3.4.0 on Windows.
- (d) `windows-latest` still maps to Windows Server 2025 (labels `windows-latest`, `windows-2025`, `windows-2025-vs2026`). `ubuntu-latest` now maps to Ubuntu 26.04, no longer 24.04.
- Official docs still state the prelude and epilogue text verbatim.
- The open question "Hosted-runner readers" can be closed by a dispatch; proposal below. Nothing was run.

## Findings

### 1. Runner source versus baseline

Both files were fetched at the baseline SHA and at main and diffed locally (`curl` of raw.githubusercontent.com, then `diff`): no difference in either file. Main's `src/runnerversion` reads 2.338.0, the same as the baseline commit ("Prepare new runner version 2.338.0"). The releases page lists v2.338.0 (06 Oct), v2.338.1 (22 Oct, pre-release) and v2.338.2 (26 Oct, latest); none of the notes mention shell, PowerShell, env files, GITHUB_ENV or GITHUB_PATH. The only note is the runner's own Node 24 move, which is unrelated to this pair. The file's commit history (via the GitHub commits page) shows its newest changes, fb78489 (Jun 2026, background-step deferral) and 35e4585 (Jul 2026, `$GITHUB_ARTIFACTS`), are older than the baseline, so they are inside the emulated source already. The `utf8 with BOM` change (efffbae) dates from Jun 2023.

Sources: [ScriptHandlerHelpers.cs](https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs), [FileCommandManager.cs](https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/FileCommandManager.cs), [baseline commit](https://github.com/actions/runner/commit/67f01c276e0a), [runner releases](https://github.com/actions/runner/releases).

Caveat. One WebFetch summary of the main file said the path reader has no explicit BOM handling beyond `Encoding.UTF8` and the env reader uses the default `File.ReadAllText`. That matches what the pair already emulates, so no change.

### 2. Claims at risk

| Claim | Verdict | Evidence |
|---|---|---|
| errors.md PS-ERR-03: runner prepends `$ErrorActionPreference = 'stop'` and appends `if (Test-Path variable:\LASTEXITCODE) { exit $LASTEXITCODE }` | unchanged | Source: prelude `$ErrorActionPreference = 'stop'`; epilogue `if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }` (the claim abbreviates the `-LiteralPath` form; wording nit only, not a change). Docs repeat both ([workflow-syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), "Exit codes and error action preference"). |
| encoding.md PS-ENC-10: runner creates the files empty and reads them with BOM detection | unchanged | `InitializeFiles` does `TryDeleteFile` then `File.Create(newPath).Dispose()`; readers unchanged vs 67f01c276e0a. |
| encoding.md: readers are emulated from source, not observed on a hosted job | unchanged, still true | No hosted-job observation was made in this research. |
| gates.md PS-GATE-05: PSSA 1.25.0 on windows-2025 and ubuntu-24.04 beside pwsh 7.6.6 | changed (pwsh only) | PSSA 1.25.0 still on both. pwsh is now 7.6.10 on both (images 20261116.335.1 and 20261116.376.1). Upstream change date: between the baseline and 2026-11-16; the exact release was not pinned (runner-images release pages for 11 Oct to 22 Nov were not paged). Pester 5.9.0 present. |
| gates.md PS-GATE-08: built-in `-Command` wrapper closes stdin | could not determine | The template is unchanged (`-command ". '{0}'"` for pwsh and powershell). Stdin handling is process-launch code outside the two files diffed; not examined. |
| gates.md section C: a `windows-latest` job running `powershell` for installers | unchanged | `windows-latest` is still Windows Server 2025 ([runner-images README](https://github.com/actions/runner-images)). Windows PowerShell 5.1 is not listed in the readme fetch; no evidence it was removed. |
| rules/powershell-quality.md: `shell: powershell` is 5.1, `shell: pwsh` is 7.x | unchanged | Docs table: `powershell` is "PowerShell Desktop", `pwsh` is "PowerShell Core"; templates unchanged. |

### 3. Images

- windows-2025 readme: image 20261116.335.1, PowerShell Core 7.6.10, PSScriptAnalyzer 1.25.0, Pester 3.4.0 and 5.9.0. Latest release win25/20261124.341 (25 Nov) lists only AWSPowershell 5.0.337 to 5.0.343 as a PowerShell-module change. Source: [Windows2025-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md).
- ubuntu-24.04 readme: image 20261116.376.1, PowerShell 7.6.10, PSScriptAnalyzer 1.25.0, Pester 5.9.0. Source: [Ubuntu2404-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md).
- ubuntu-26.04 readme: image 20261116.202.1, same three versions. Source: [Ubuntu2604-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2604-Readme.md).
- Labels: `ubuntu-latest` and `ubuntu-26.04` map to Ubuntu 26.04; `ubuntu-24.04` stays separate; `windows-latest`, `windows-2025`, `windows-2025-vs2026` map to Windows Server 2025. The `-latest` migration "is gradual and happens over 1-2 months". Announcement: [issue 14748](https://github.com/actions/runner-images/issues/14748) (opened 2026-09-17, "ubuntu-latest label will use Ubuntu 26.04 in November 2026"); Ubuntu 26.04 GA [issue 14747](https://github.com/actions/runner-images/issues/14747) closed 2026-11-17. The windows-latest move to the VS 2026 image was [issue 14017](https://github.com/actions/runner-images/issues/14017), closed 2026-07-06, before the window. [Issue 15373](https://github.com/actions/runner-images/issues/15373) (2026-11-20) announces VS 2026 label deprecation in December; no change to the `windows-latest` to Server 2025 mapping. Windows notice: D: drive moves to ReFS on 2026-11-30 (not a PowerShell fact; noted for any file-I/O probe).
- Sources: [runner-images releases](https://github.com/actions/runner-images/releases), [issues](https://github.com/actions/runner-images/issues?q=label%3Aannouncement+latest).

### 4. Closing "Hosted-runner readers"

Yes, a dispatch can close it. Proposed throwaway workflow (not run), matrix over `windows-2025`, `ubuntu-24.04`, `ubuntu-26.04`, each running a `shell: pwsh` step and, on Windows, a `shell: powershell` step that:
1. Reads `$env:GITHUB_ENV` and `$env:GITHUB_PATH` and records `(Get-Item).Length` (expect 0, proves created empty).
2. Appends `NAME=value` with `[IO.File]::AppendAllText` using `UTF8Encoding($true)` and with `UTF8Encoding($false)`, and `Out-File -Encoding utf8 -Append` under 5.1.
3. In a following step, prints `$env:NAME` and `$env:PATH` segments, with a non-ASCII value (`caf` plus U+00E9), to see whether a BOM leaks into the first key.
4. Prints `$PSVersionTable.PSVersion`, `(Get-Module -ListAvailable PSScriptAnalyzer,Pester).Version`, and `[Console]::IsInputRedirected` plus a `[Console]::In.ReadToEnd()` timeout probe for PS-GATE-08.

Verification: the step log shows expected values; compare with the emulation in shell-pwsh.md.

## Normative guidance candidates

1. Change "pwsh 7.6.6" to "pwsh 7.6.10" in PS-GATE-05 and the shell-pwsh.md verdict (floor "runner images carry 7.6.6"). Rationale: both current images preinstall 7.6.10. Verify: `grep -rn "7\.6\.6" rules/powershell-quality.md skills/powershell-quality-reference/` then confirm each hit is either a host measurement (keep) or an image claim (update).
2. In PS-GATE-05 name `ubuntu-24.04` and `ubuntu-26.04` (or say "the `ubuntu-latest` image") with PSSA 1.25.0. Rationale: `ubuntu-latest` is now 26.04, so a claim keyed to 24.04 under-describes the `-latest` default. Verify: `grep -n "ubuntu-24.04" skills/powershell-quality-reference/gates.md`.
3. Optionally cite the epilogue with the full `-LiteralPath` text in PS-ERR-03. Rationale: exact source text; behaviour is identical. Verify: compare against `FixUpScriptContents` quote above.
4. Do not edit PS-ENC-10 or the reader notes; keep the "emulated, not observed" caveat until the dispatch in section 4 runs.

## AI-agent angle

- An agent may state the prelude from memory with a different wording or claim the runner appends `exit $LASTEXITCODE` unconditionally; check against the exact epilogue string.
- An agent may assume `ubuntu-latest` is 24.04; check the runner-images README label table.
- An agent may pin PSSA or pwsh to the old 7.6.6 on the basis of this pair's older text; grep for the version string.

## Contested / evolving

- `ubuntu-latest` migration to 26.04 is gradual over 1-2 months as of 2026-11-27; a given job may land on either image. Pin `ubuntu-24.04` or `ubuntu-26.04` where the version matters.
- VS 2026 Windows label deprecation announced for December 2026 (issue 15373); no effect on PowerShell facts.
- Not determined: the exact runner-images release that moved pwsh from 7.6.6 to 7.6.10; PS-GATE-08 stdin behaviour; presence of Windows PowerShell 5.1 in the current Windows readme (the fetch did not list it).

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs | Prelude, epilogue, shell templates | main, 2026-11-27 | Primary, diffed |
| https://raw.githubusercontent.com/actions/runner/67f01c276e0a/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs | Same at baseline | baseline | Diff base |
| https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/FileCommandManager.cs | Env-file reader | main | Primary, diffed |
| https://raw.githubusercontent.com/actions/runner/67f01c276e0a/src/Runner.Worker/FileCommandManager.cs | Same at baseline | baseline | Diff base |
| https://github.com/actions/runner/commit/67f01c276e0a | Baseline commit, "Prepare new runner version 2.338.0" | 2026-10 | Baseline identity |
| https://github.com/actions/runner/commits/main/src/Runner.Worker/FileCommandManager.cs | File history | to 2026-07-07 | No in-window commit |
| https://github.com/actions/runner/commits/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs | File history | last 2023-06-02 | No in-window commit |
| https://github.com/actions/runner/releases | Runner releases 2.338.0 to 2.338.2 | Oct 2026 | No shell changes |
| https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md | Software list | 20261116 | Primary |
| https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md | Software list | 20261116 | Primary |
| https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2604-Readme.md | Software list | 20261116 | Primary |
| https://github.com/actions/runner-images | Label table and migration notice | 2026-11 | Primary |
| https://github.com/actions/runner-images/releases | Image release notes | to 2026-11-25 | Primary, only newest page read |
| https://github.com/actions/runner-images/issues?q=label%3Aannouncement+latest | Latest-label announcements | 2026-11 | Primary |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | Shell table, exit codes section | 2026-11 | Primary doc |

Not fetched: the workflow-commands doc page (not needed once the source was diffed; its content depends on the same code), and GitHub API diffs (rate limited, replaced by local raw-file diff).

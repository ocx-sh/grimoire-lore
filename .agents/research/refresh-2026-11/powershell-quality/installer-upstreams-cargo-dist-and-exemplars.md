---
title: Installer upstreams cited by PS-SEC and PS-COMPAT, delta 2026-10-11 to 2026-11-27
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 8
---

# Installer upstreams cited by PS-SEC and PS-COMPAT, delta

Scope: this is a delta against the baseline `shell-installer.md` dated 2026-10-11. It covers only whether the evidence sentences about cargo-dist, the scoop installer and the pnpm installer are still true on 2026-11-27. The rules themselves are not in question.

## Summary

- cargo-dist PR 2497 (PowerShell checksum verification) is still open and unreviewed. No release contains it. PS-SEC-01 rationale: unchanged.
- cargo-dist shipped v0.33.1 (2026-10-21) and v0.34.0 (2026-11-01). The file `installer.ps1.j2` is byte-identical between v0.33.0 and v0.34.0. The installer still calls `Expand-Archive` with no hash check.
- cargo-dist issue 457 (TLS floor) is still open. Its last comment is dated 2024-04-30. Open question 5: unchanged.
- ScoopInstaller/Install: commit 1e2f334083d6 (2026-08-28) is still the newest commit on the default branch. PS-SEC-09 scoop sentence: unchanged.
- pnpm `install.ps1` gained two commits in the window (retry on transient download failure 2026-10-24, `PNPM_NO_MODIFY_PATH` 2026-10-28). Neither touched platform detection. The live script still prints `Platform could not be determined! Only Windows, Linux and MacOS are supported.` PS-COMPAT-11 sentence: unchanged.
- No evidence sentence needs rewriting. No exemplar needs swapping.

## Findings

### 1. cargo-dist releases and the ps1 template (PS-SEC-01)

Verdict: unchanged.

- Releases after 0.33.0, from the [releases page](https://github.com/axodotdev/cargo-dist/releases): v0.33.1 on 2026-10-21 and v0.34.0 (plus v0.34.0-prerelease.1) on 2026-11-01. The v0.33.1 notes say it "updates several dependencies", including certificate-list dependencies. Nothing about the PowerShell installer.
- I downloaded `cargo-dist/templates/installer/installer.ps1.j2` at tags v0.33.0 and v0.34.0 from raw.githubusercontent.com and diffed them: "Files are identical" (673 lines each). On v0.34.0 the only archive handling is `Expand-Archive -Path $dir_path -DestinationPath "$tmp"` at line 325, with no `Get-FileHash` or checksum comparison anywhere in the file.
- [PR 2497](https://github.com/axodotdev/cargo-dist/pull/2497), "Verify archive checksums in PowerShell installers", by zsol: state open, marked ready for review 2026-09-03, two commits pushed the same day, no reviews, no assignee, no later activity. It would verify SHA-256 from the build manifest before extraction and still skip archives without checksum metadata. It fixes issue 2397.
- Consequence: "cargo-dist's installer extracts straight after the download" is still true of the newest tag (v0.34.0). The sentence is written in the present tense, so it stays.
- Watch item: if PR 2497 merges, the sentence becomes false for the release that contains it. Even then the PR leaves unverified paths for manifests without checksums, so a dated form would be the right fix: "cargo-dist through 0.34.0 extracts straight after the download".

### 2. cargo-dist issue 457 (TLS floor, shell-installer.md Open question 5)

Verdict: unchanged.

- [Issue 457](https://github.com/axodotdev/cargo-dist/issues/457), "bump curl-sh exprs to tls 1.3?": state open, opened 2023-09-27 by Gankra, label feature request, milestone November 2023. The latest comments are dated 2024-04-30 (a proposal PR 978 to drop the TLS flag, and the maintainer's reply that the flags are inherited from rustup). Nothing newer than 2024-04-30 on the page.
- The ps1 template still has the "GitHub requires TLS 1.2" block at lines 642-643 on v0.34.0, identical to v0.33.0.
- The statement "open since 2023-09-27" remains accurate.

### 3. ScoopInstaller/Install (PS-SEC-09)

Verdict: unchanged.

- The [commit list](https://github.com/ScoopInstaller/Install/commits/master/) shows `1e2f334` ("fix: make InvocationName parameter optional", 2026-08-28) as the newest commit. Full SHA `1e2f334083d609986d8c8bc9e31ae8e87c39fab4`. No commit exists after it, so nothing in the window changed the script.
- The `break` idiom claim therefore still describes the cited commit and the current head, which are the same.
- Side note, not a change: the commits 2026-08-27 (a621092, 9ad51a7) guard dot-sourcing and honor the `CI` variable, all before the baseline date.

### 4. pnpm get.pnpm.io `install.ps1` (PS-COMPAT-11)

Verdict: unchanged.

- [History of install.ps1](https://github.com/pnpm/get.pnpm.io/commits/main/install.ps1) has these commits in the window: 2026-10-24 `d7df246` (retry a transient download failure, #75) and 2026-10-28 `7c26e54` (install without touching PATH when `PNPM_NO_MODIFY_PATH` is set, #80). Earlier ones (2026-10-05 `ea51ffb`, 2026-09-23, 2026-08-27, 2026-08-08, and so on) predate the window.
- I fetched the live script from https://get.pnpm.io/install.ps1 on 2026-11-27. Line 103 still reads `Write-Error "Platform could not be determined! Only Windows, Linux and MacOS are supported."`, guarded by `if ($null -eq $platform)`. Platform detection (lines ~60-90) is unchanged in kind: it sets `$platform` from `$PSVersionTable`, plus a musl check that is new in 2026 but not in the window. The two window commits add the retry helper (lines ~185-220) and the `PNPM_NO_MODIFY_PATH` block (lines ~367-371) only.
- I did not re-run the script on Fedora. The sentence records a measurement dated 2026-10-11 and says "was held red", so it is historical by construction and stays true. Whether the plant still reproduces on Fedora today is could not determine from reading alone; the code path that prints the message is intact.

## Normative guidance candidates

None. The rules are not in question and no evidence changed. Two optional, checkable edits, both only if the owner wants dated wording:

1. PS-SEC-01 rationale: write "cargo-dist through 0.34.0 extracts straight after the download". Rationale: pins the claim to a version so a future merge of PR 2497 does not silently falsify it. Verification: `grep -n "cargo-dist" skills/powershell-quality-reference/security.md` and compare against `gh pr view 2497 --repo axodotdev/cargo-dist --json state`.
2. Re-check trigger: re-run this delta when PR 2497 changes state or cargo-dist cuts v0.35. Verification: diff `installer.ps1.j2` between the tags and grep for `Get-FileHash`.

## AI-agent angle

An agent asked to refresh these sentences tends to assume "newer release means fixed" and rewrite them in the past tense. The mechanical check is to diff the template at the two tags and grep for `Get-FileHash`; a zero-hit grep on the newest tag means the claim stands.

## Contested / evolving

- PR 2497 is the one live change vector. It has had no activity since 2026-09-03, so merge before the next refresh is unlikely but possible.
- pnpm's installer is moving fast (signature verification of the pnpm 12 download landed 2026-08-08), so its Fedora behavior should be re-measured when PS-COMPAT-11 is next re-run, not inferred.
- Limitation: the GitHub API was rate limited from this host, so release, PR and commit data come from the rendered github.com pages. Template contents and the pnpm script come directly from raw files.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/axodotdev/cargo-dist/releases | cargo-dist release list | v0.33.1 2026-10-21, v0.34.0 2026-11-01 | Defines the post-baseline tags |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.34.0/cargo-dist/templates/installer/installer.ps1.j2 | ps1 installer template, newest tag | 2026-11-01 | Primary evidence: no hash check |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.ps1.j2 | same template at baseline tag | 0.33.0 | Diffed against v0.34.0, identical |
| https://github.com/axodotdev/cargo-dist/pull/2497 | Checksum-verification PR | open, last activity 2026-09-03 | Would falsify PS-SEC-01 if merged |
| https://github.com/axodotdev/cargo-dist/issues/457 | TLS 1.3 curl-sh issue | open, last comment 2024-04-30 | Open question 5 |
| https://github.com/ScoopInstaller/Install/commits/master/ | scoop installer history | newest 2026-08-28 | Confirms no change since 1e2f334 |
| https://github.com/pnpm/get.pnpm.io/commits/main/install.ps1 | pnpm installer history | latest 2026-10-28 | Window commits |
| https://get.pnpm.io/install.ps1 | live pnpm installer | fetched 2026-11-27 | Message still present at line 103 |

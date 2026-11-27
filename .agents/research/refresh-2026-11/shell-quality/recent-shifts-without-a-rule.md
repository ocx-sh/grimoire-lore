---
title: Recent shifts the shell-quality pair has no rule for
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 20
---

# Recent shifts the shell-quality pair has no rule for

This is a delta update of the 2026-10-11 corpus. Window: 2026-10-11 to 2026-11-27. Status vocabulary: unchanged, changed, could not determine. "Read only" means the source was read and nothing was run; no candidate below was measured by this research.

## Verdict

The window holds three real changes for the pair: the pwsh 7.4 and 7.5 end-of-support date has passed, `ubuntu-latest` is now 26.04, and zizmor 1.33.0 added a checkout audit. It holds no new bash, dash, busybox, direnv, mise, starship, zoxide or bats advisory, no new shell linter, no Austin Group item and no distro userland flip that the pair lacks. Three small scope edits are recommended. No new MUST rule is warranted.

## Dated end points

| Claim at risk | Status | Evidence |
|---|---|---|
| "pwsh 7.4 ends support 2026-11-10" (shell-quality.md line 200, emit.md line 10, ci.md line 10) | changed: the date passed. Old text: future tense "ends support". New fact: 7.4 (LTS) and 7.5 both reached end of support 10-Nov-2026; the supported lines are 7.6 (LTS, end of support 14-Nov-2028) and 7.7. | Microsoft Learn, PowerShell Support Lifecycle (page updated 2026-09-09; 7.4 row "16-Nov-2023, 10-Nov-2026"): https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle . PowerShell release list: 7.4.21 (13 Oct), 7.4.22 (25 Oct), 7.6.10 and stable 7.7.0 (10 Nov): https://github.com/PowerShell/PowerShell/releases |
| SH-EMIT-05 empty-value clause "binds while 7.4 (end of support 2026-11-10) or 5.1 (frozen) is in range" | changed in wording only. 7.4.22 is the last patch seen; no supported 7.x still drops an empty `$env:X`, because the corpus measured 7.6.6 keeping it (change landed in 7.5). The clause now binds for 5.1 and for any adopter that still ships 7.4. | Same sources; behaviour from emit.md SH-EMIT-05 (measured 2026-10-11). |
| SH-EMIT-07 "red on 7.4.7 and 7.6.6 only" | unchanged as a fact; floor changed. `ConvertFrom-Json` date coercion is not known to be fixed in 7.7.0. 7.7.0 (10 Nov) was not measured. 7.4 is out of support, so the rule's supported floor becomes 7.6. | Release list above. 7.7.0 behaviour: could not determine. |
| "`ubuntu-latest` moves to 26.04 by 2026-11-19" (shell-quality.md line 200, gates.md line 10) | changed: done. The runner-images README now lists "Ubuntu 26.04" with label "ubuntu-latest or ubuntu-26.04". Merged docs PR runner-images#15381 (2026-11-24) "associate ubuntu-latest with Ubuntu 26.04"; rollout issue #15233 opened 2026-11-03. | https://github.com/actions/runner-images/blob/main/README.md , https://github.com/actions/runner-images/issues?q=ubuntu-latest+26.04 |
| Ubuntu 26.04 image tooling (SH-CI-15, gates.md) | unchanged for bash 5.3.9, dash 0.5.12-12ubuntu3 and ShellCheck 0.11.0. New: the image carries GNU coreutils 9.5-1ubuntu2+0.0.0~ubuntu25 (not uutils), pwsh 7.6.10, image version 20261116.202.1. This settles SH-CI-15's open question "whether the runner image does [ship uutils] is unverified": the README lists a coreutils package, no uutils. shfmt is not listed, so the gates.md shfmt 3.12.0 figure for 26.04 could not be re-confirmed. | https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md |
| SH-CI-15 "rule expires 2026-11-19" | changed: the expiry date passed. The rule's remaining job is cleanup. | Sources above. The replacement row is for the runner-images brief. |

### Decision for the rule index "Dated end points" sentence

The sentence currently lists three items. Two have expired (pwsh 7.4, the 2026-11-19 `ubuntu-latest` move). Recommended replacement: drop both, keep "the fish 3.6.0 floor holds until 2028-06-30", and add pwsh 7.6 LTS end of support 2028-11-14 as the new PowerShell floor. Add a 24.04 end point only if the runner-images brief keeps a 24.04 leg; I did not research the 24.04 runner-image retirement date, so that is could not determine. Verification: `grep -n "Dated end points" rules/shell-quality.md` and confirm no date earlier than 2026-11-27 remains.

## New things, by question

### GitHub Actions
- 2026-11-02 changelog "pull_request_target blocked by default December 2": enforcement for public repositories on Free, Team and Enterprise Cloud moves to 2026-12-02, with brownouts 2026-11-09 and 2026-11-16, evaluate mode until then. The page says nothing about `run:` bodies. Not shell-body relevant; belongs, if anywhere, in the security pair. Source: https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/ . Read only.
- 2026-10-28 workflow lockfiles GA (`.github/workflows/actions.lock`, `gh actions-lock`, Require lockfile policy). It pins action commits and transitive dependencies, not `run:` content. The corpus pins actions by SHA already (testing.md); lockfiles are an alternative, not a shell rule. Source: https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/ . Read only.
- No change found to expression contexts, default `shell:`, or immutable actions that touches shell bodies. The changelog label page lists titles only; titles of nine entries (RHEL images GA 2026-11-19, ARM32 retirement 2026-11-12, agentic workflows GA, multi-cloud compute, Xcode 27 image) have no shell link. Body text of those entries was not opened: could not determine beyond titles.
- zizmor: v1.31.0 (15 Oct) switched to a tree-sitter grammar for PowerShell and fixed use-trusted-publishing misses "inside of PowerShell blocks"; v1.32.0 (2 Nov) nothing shell-related; v1.33.0 (22 Nov) added audit dangerous-checkout (only `actions/checkout`), lockfile awareness for impostor-commit and ref-confusion; v1.33.1 a `services:` fix. Years are inferred from the page footer. The pair binds zizmor 1.30.1. Sources: https://github.com/woodruffw/zizmor/releases , https://github.com/woodruffw/zizmor/releases/tag/v1.33.0 . Read only.
- GitLab: the 18.x notes ended at 18.11 and the line is now 19.x. I did not reach the 19.x release posts or the Runner changelog: could not determine. Nothing found on `script:` shell changes.

### CVEs and advisories
- oss-security October and November archives, filtered by name: no thread for bash, dash, busybox, direnv, mise, starship, zoxide, bats, sudo or coreutils. Shell-injection threads were all product bugs (Airflow CVE-2026-101031 on 2026-11-09 and CVE-2026-111422 on 2026-10-26, Kylin CVE-2026-108743 on 2026-10-16, xfs_admin CVE-2026-108472 on 2026-11-11). Source: https://www.openwall.com/lists/oss-security/2026/10/ and /2026/11/ . Only thread titles were read. The NVD was not queried: could not determine for a CVE not announced on oss-security.
- curl 8.23.0 (2026-10-14): 24 advisories, one High (CVE-2026-92392 HTTP/2 upload use-after-free), none about scripts or installers by title. CVE-2026-92390 (tool `-J` no-clobber bypass via 103 Early Hints, Low) is the only one near script use. The corpus does not use `curl -J` or `--remote-header-name` (grep of the pair). No rule needed. Source: https://curl.se/docs/security.html . Read only.
- Fedora 45 ships sudo 1.9.17-18.p2 for CVE-2026-96512 (classic sudo, not sudo-rs), from a secondary source (linuxsecurity.com). Not shell-body relevant.
- direnv 2.38.1 (6 Oct, before the window) escaped the direnv path in generated bash and quoted the PowerShell direnv.exe path; 2.38.2 (10 Oct) pixi manifest allow check. Both predate 2026-10-11 and the pair measured direnv 2.37.1. Possible effect: SH-EMIT-03 text says "direnv 2.37.1 ... double only U+0027". Whether 2.38.x closed the curly-quote gap is could not determine; it is the one stale claim worth a re-measure. Source: https://github.com/direnv/direnv/releases . Read only.

### Linters, formatters, test tools
- ShellCheck: latest is still 0.11.0. mvdan/sh: latest is v3.14.1 (06 Sep, before the window; the pair already binds 3.14.1 inside Task 3.54.0). bats-core: latest is v1.14.0 (21 Jul), the pair's pin. All unchanged. Sources: GitHub release pages of koalaman/shellcheck, mvdan/sh, bats-core/bats-core.
- No new or newly popular shell linter surfaced from the sources reachable. I did not run a dedicated discovery search (checkbashisms, posh, pre-commit hook layers): could not determine.

### POSIX and Austin Group
- The Austin Group changelog page returned "No Change Log information available". No interpretation affecting `pipefail`, `local`, `$'..'`, `read -d` or `find -print0` could be confirmed: could not determine. dialect.md verdicts are unchanged by this research.

### Distros
- Fedora 45 became current on 2026-11-03. Its uutils packaging is the pre-existing optional rust-coreutils path, not a default flip, and no default-shell or sudo-rs change was found. Release-notes pages themselves were not reached (secondary search results only). The Ubuntu 26.10 release notes URL returned 404: could not determine for Ubuntu 26.10 and Debian. The userland brief's uutils coverage stands.

## Candidate changes

| # | Change | File | Source and date | Basis |
|---|---|---|---|---|
| 1 | Rewrite the "Dated end points" sentence as above (remove two expired points, add pwsh 7.6 floor to 2028-11-14). | rules/shell-quality.md line 200 | MS Learn lifecycle; runner-images README, 2026-11 | read only. Verify: grep that no end point before 2026-11-27 remains. |
| 2 | Replace "(7.4 reaches end of support 2026-11-10)" with past tense "7.4 and 7.5 reached end of support 2026-11-10" in the binding lines. | emit.md line 10, ci.md line 10 | MS Learn lifecycle | read only. Verify: grep -n "7.4" on both files. |
| 3 | SH-EMIT-05 scope: keep the empty-value clause, change the trigger to "5.1 or any 7.x below 7.5 in range"; SH-EMIT-07 scope: supported floor is 7.6, add 7.7.0 to the re-measure list. | emit.md rows SH-EMIT-05, SH-EMIT-07 | PowerShell releases 2026-11-10 (7.7.0) | read only for 7.7.0. Re-run `RT` empty and `datelike` cases on 7.7.0 before claiming it. |
| 4 | SH-CI-15: mark expired, record that the 26.04 image lists GNU coreutils 9.5, not uutils. Reword to a cleanup row per the runner-images brief. | ci.md SH-CI-15, gates.md line 10 | runner-images README and Ubuntu2604-Readme, 2026-11-24 and image 20261116.202.1 | read only (README, no runner probed). |
| 5 | Optional: bump the zizmor pin note from 1.30.1 to 1.33.0 and mention dangerous-checkout and lockfile awareness. | ci.md header, shell body scope unchanged | zizmor v1.33.0, 2026-11-22 | read only. Not a new rule: the audits do not look at `run:` shell bodies. |
| 6 | Re-measure direnv 2.38.x against SH-EMIT-03's "doubles only U+0027" sentence. | emit.md SH-EMIT-03 evidence | direnv 2.38.1 and 2.38.2, 2026-10-06 and 10-10 | could not determine; needs `RT` run. |

No new rule: nothing in the window needs one. Not found anywhere: new `run:` expression contexts, a default `shell:` change, shell CVEs for the named tools, a POSIX interpretation, a new shell linter.

---
title: GitHub-hosted runner images, actionlint and zizmor - delta 2026-10-11 to 2026-11-27
pair: shell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 11
---

# Delta: runner images, actionlint, zizmor

This is a delta update. Only claims that the upstream sources changed are listed as "changed". All fetches happened on 2026-11-27 through a summarising fetch tool, so exact quotes were not verified against raw pages.

## Summary

- The `ubuntu-latest` move to Ubuntu 26.04 is effectively done: the runner-images README maps `ubuntu-latest` to 26.04 since 2026-11-24. The announcement issue is still open with no maintainer completion comment.
- 26.04 image 20261116.202.1: ShellCheck 0.11.0-2, bash 5.3.9, dash 0.5.12-12ubuntu3, Git 2.56.1. shfmt was not listed on the README page.
- 24.04 image 20261116.376.1 still ships ShellCheck 0.9.0-1, bash 5.2.21, dash 0.5.12-6ubuntu5.
- windows-2025 image 20261116.335.1 lists Bash 5.3.15(2) and Git 2.56.1.windows.1.
- actionlint has no release after 1.7.12 (2026-03-30). Nothing changed for SH-CI-05.
- zizmor moved from 1.30.1 to 1.33.1 (2026-11-22). The template-injection audit now also flags attacker contexts inside `fromJSON(...)` and `case(...)` values (1.32.0). Matrix, steps/needs severity and persona defaults: no change found.

## Findings

### 1. ubuntu-latest move (SH-CI-15, gates.md line 10, shell-quality.md line 200, SH-USER-09 tell 6)

Status: changed.
- Old text: "Until the `ubuntu-latest` move to 26.04 completes (rollout 2026-10-19 to 2026-11-19, rule expires 2026-11-19)".
- New fact: the announcement ([issue 14748](https://github.com/actions/runner-images/issues/14748)) said the rollout begins 2026-10-19 and completes by 2026-11-19. The issue is still open and pinned, and the visible thread has no maintainer completion statement. A user reported on 2026-11-15 that `ubuntu-latest` already resolved to 26.04. [PR 15381](https://github.com/actions/runner-images/pull/15381), merged 2026-11-24, moved the `ubuntu-latest` label to the 26.04 row of the README table (fixing [issue 15379](https://github.com/actions/runner-images/issues/15379)). The PR text warns its checks do not confirm rollout completion.
- Date of upstream change: 2026-11-24 (README), deadline 2026-11-19 passed.
- Decision: treat the move as finished. Retire SH-CI-15 as a time-boxed rule or rewrite it as a post-migration row: "`ubuntu-latest` is 26.04; pin `ubuntu-24.04` explicitly only to stay on bash 5.2.21 / ShellCheck 0.9.0". Remove "expires 2026-11-19". Rewrite gates.md line 10 to "`ubuntu-latest` resolves to 26.04 (ShellCheck 0.11.0, bash 5.3.9); `ubuntu-24.04` carries ShellCheck 0.9.0". Rewrite shell-quality.md line 200 likewise. SH-USER-09 and tell 6: drop the "may still resolve to 24.04" wording.
- Caveat: reported 26.04 regressions (Docker 29 containerd image store, pip/TLS failures, bubblewrap AppArmor) are not shell-quality claims.

### 2. Tool versions (SH-CI-15 rationale, gates.md line 10, SH-GATE-10, SH-GATE-33)

- 26.04, [README](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md): bash 5.3.9(1), dash 0.5.12-12ubuntu3, ShellCheck 0.11.0-2, Git 2.56.1. Rationale numbers unchanged. shfmt 3.12.0 on 26.04: could not determine (not listed on the README page).
- 24.04, [README](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md): bash 5.2.21, dash 0.5.12-6ubuntu5, ShellCheck 0.9.0-1. Unchanged. shfmt 3.8.0: could not determine (not listed).
- windows-2025, [README](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md): Bash 5.3.15(2)-release listed under runtimes; the page does not say it is the Git Bash binary. Git 2.56.1.windows.1. SH-GATE-10 and SH-GATE-33 "Git Bash 5.3.15": unchanged as far as listed; the Git Bash attribution could not be confirmed.

### 3. actionlint (ci.md line 8, SH-CI-05, gates.md line 242)

Status: unchanged. The [CHANGELOG](https://github.com/rhysd/actionlint/blob/main/CHANGELOG.md) and [releases](https://github.com/rhysd/actionlint/releases) show 1.7.12 (2026-03-30) as latest; it has no shell, shellcheck or matrix changes. Only the first 100000 characters of the changelog were read, but the latest entry is at the top. The `SHELLCHECK_OPTS` documentation dates from 1.6.27. "Skips ShellCheck on custom shell" is not contradicted.

### 4. zizmor (ci.md line 8, SH-CI-21, SH-CI-23, SH-CI-24)

Source: [zizmor releases](https://github.com/zizmorcore/zizmor/releases).
- ci.md line 8 old "zizmor 1.30.1": changed. Latest is 1.33.1 (2026-11-22); 1.31.0 and 1.31.1 on 2026-10-15, 1.32.0 on 2026-11-02, 1.33.0 and 1.33.1 on 2026-11-22.
- 1.32.0: template-injection now flags attacker-controllable contexts wrapped in `fromJSON(...)` and in `case(...)` values. Relevant to SH-CI-24 as a nearby detection gap now closed; whether dotted `matrix.item.field` is now flagged was not stated in the release notes: could not determine.
- 1.31.0: `dangerous-triggers` treats `issue_comment` as dangerous; `cache-poisoning` flags `cache-mode: write`. 1.33.0: new `dangerous-checkout` audit (actions/checkout only). None touch shell quality.
- Personas / `--min-severity medium` (SH-CI-21), `steps`/`needs` output severity (SH-CI-23): no change in the release notes. The [audits doc](https://docs.zizmor.sh/audits/#template-injection) was read only for its first 100000 characters; it states that pedantic and auditor personas flag all expansions. Default persona unchanged: could not determine beyond absence in release notes.
- Date of upstream change for the version bump: 2026-11-22.

### 5. SH-CI-07 attacker-controlled contexts

Status: unchanged. No new `github.event.*` context found in the [GitHub Actions changelog](https://github.blog/changelog/label/actions/) titles for the window (titles only were read). Related: "pull_request_target blocked by default December 2" (2026-11-02 post) and workflow lockfiles GA (2026-10-28) are not shell-quality claims.

## Normative guidance candidates

1. Rule: workflows that need bash 5.3 features or ShellCheck 0.11 behaviour may rely on `ubuntu-latest`; workflows that need the 24.04 toolchain pin `ubuntu-24.04`. Rationale: `ubuntu-latest` is 26.04. Verify: `grep -rn 'runs-on:.*ubuntu-latest' .github/workflows` against the stated need.
2. Rule: SH-CI-15 loses its expiry date (2026-11-19). Rationale: the date passed and README maps the label to 26.04. Verify: `grep -rn '2026-11-19' rules skills`.
3. Rule: pin the zizmor version in ci.md to 1.33.1 and note that `fromJSON(...)`/`case(...)` wrapped contexts are detected from 1.32.0. Rationale: new detection. Verify: `zizmor --version`.

## AI-agent angle

- An agent will keep writing "`ubuntu-latest` may still be 24.04" from older data. Check: grep for "may still resolve to 24.04".
- An agent will assume ShellCheck 0.9.0 on `ubuntu-latest`. Check: `shellcheck --version` in the job.

## Contested / evolving

- Migration completion is evidenced by a README change and user reports, not a maintainer announcement; the issue stays open. Re-check before hard-coding a "completed on" date.
- Whether newer zizmor detects the dotted-matrix miss needs a direct test (`zizmor` on a fixture with `${{ matrix.item.name }}`).

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/actions/runner-images/issues/14748 | ubuntu-latest migration announcement | 2026-10 to 2026-11 | schedule, status |
| https://github.com/actions/runner-images/pull/15381 | README relabel PR | 2026-11-24 | latest label moved |
| https://github.com/actions/runner-images/issues?q=ubuntu-latest+ubuntu-26.04 | issue search | 2026-11 | rollout issues |
| https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md | 26.04 README | 2026-11-16 image | tool versions |
| https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md | 24.04 README | 2026-11-16 image | tool versions |
| https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md | windows-2025 README | 2026-11-16 image | bash, Git |
| https://github.com/rhysd/actionlint/releases | actionlint releases | to 1.7.12 | no newer release |
| https://github.com/rhysd/actionlint/blob/main/CHANGELOG.md | actionlint changelog | 2026-03-30 latest | shell/matrix changes |
| https://github.com/zizmorcore/zizmor/releases | zizmor releases | to 1.33.1, 2026-11-22 | audit changes |
| https://docs.zizmor.sh/audits/#template-injection | audit doc | current | persona behaviour (partial read) |
| https://github.blog/changelog/label/actions/ | Actions changelog | 2026-10 to 2026-11 | titles only |

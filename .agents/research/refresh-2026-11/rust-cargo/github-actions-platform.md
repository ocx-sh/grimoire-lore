---
title: GitHub Actions platform and named actions, delta since 2026-08-01
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 22
---

# GitHub Actions platform and named actions: delta for rust-cargo

Scope: this is a delta update. The baseline research is `.agents/research/rust-tooling-ci.md` and `.agents/research/rust-ecosystem.md`, dated only to the month, so the question window opens on 2026-08-01 while the pair window is 2026-08-14 to 2026-11-27. Anything not listed as "changed" below is unchanged. Release pages on github.com show day and month without a year; every date below is read as 2026 because the pages list the 2026 releases and the footers read 2026. Where a fetched page was truncated or gave only titles, that is stated.

## Contents

1. Summary
2. Per-claim verdicts
3. New GitHub controls the rule does not mention
4. Normative guidance candidates
5. AI-agent angle
6. Contested and evolving
7. Sources

## Summary

- CI-01 `permissions: {}`: unchanged. The syntax is still documented verbatim.
- CI-02 SHA pinning: still correct as a floor, but the rule's rationale ("Tags are mutable") is now incomplete. GitHub's secure-use docs now say a workflow lockfile "supersedes SHA pinning for repositories that adopt it". Lockfiles reached GA on 2026-10-28.
- CI-03 `persist-credentials: false`: still valid and still needed. The default is still `true`. The reason text is stale for checkout v6 and later, which store credentials in a file under `$RUNNER_TEMP`, not in `.git/config`.
- Agents-get-wrong #6: current checkout major is v7 (v7.0.1, 2026-07-20). v3 is far behind.
- CI-09 `save-if`: unchanged. Still an input, default `true`. rust-cache v2.9.2 (2026-08-06) and v2.9.3 (2026-10-20) changed cleanup only.
- CI-11 `merge_group: { types: [checks_requested] }`: unchanged.
- CI-12 giraffate/clippy-action: still present, `reporter` still accepts `github-pr-check` and `github-pr-review`. Maintenance status could not be fully determined.
- CI-07 cargo-deny-action: the advisories-split pattern is still in the README, but not under the word "verbatim" in the sense of identical to the rule text: it is a matrix with `continue-on-error`.
- REL-04: the move to `actions/attest@v4` is confirmed. A new permission, `artifact-metadata: write`, is now listed as required by the attest README. The rule names only `attestations: write`.

## Per-claim verdicts

### CI-01 `permissions: {}` at top level: unchanged

The workflow syntax reference still reads "You can use the following syntax to disable permissions for all of the available permissions" followed by `permissions: {}`. No changelog entry in the window changed default token permissions or the syntax. The 2026 security roadmap (2026-03-26) lists no default-token change ("The post doesn't mention changes to the default token"). One related addition: zizmor 1.20.0 taught `excessive-permissions` about `artifact-metadata` and `models`, and 1.26.0 about `code-quality`, so new permission names exist that a per-job grant may need.
Evidence: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax ; https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/ ; https://docs.zizmor.sh/release-notes/ (page truncated at 100000 of 190936 characters).

### CI-02 pin to full SHA: changed (phrasing)

Old text: "Pin every `uses:` to a full 40-character commit SHA with a trailing `# vX.Y.Z` comment. Tags are mutable."
New facts:
- Workflow dependency lockfiles reached GA on 2026-10-28 (public preview 2026-10-14). `gh actions-lock` writes `.github/workflows/actions.lock`, covering direct and transitive actions. Workflows keep readable tag or branch references while Actions runs the locked commit. Free, Team and Enterprise Cloud plans. Enterprise, organization and repository admins get a "Require lockfile" policy. Dependabot regenerates the lock entry in the same PR. Source: https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available
- The secure-use docs now say a lockfile "is the strongest protection available, and supersedes SHA pinning for repositories that adopt it"; repositories that cannot adopt one should fall back to SHA pinning. Source: https://docs.github.com/en/actions/reference/security/secure-use
- The SHA-pinning enforcement policy is older than the window: https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/ (seen only as a search result title and snippet, not opened). I did not find a window entry that changes it.
- Immutable releases exist (a release's assets and tag cannot be changed once immutable, future releases only; docs page https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/preventing-changes-to-your-releases, seen as search result only). They protect only publishers who opt in, so a consumer cannot assume any given tag is immutable. They do not make tags trustworthy in general. The roadmap lists immutable releases for publishing workflows with no timeline.
Verdict: the MUST stays correct. Suggested rephrase: pin to a full SHA, or adopt a workflow lockfile and enforce it with the "Require lockfile" policy; a tag is trustworthy only when its publisher uses immutable releases, which a consumer cannot check cheaply. The `# vX.Y.Z` comment stays useful for Dependabot and review.
Date of upstream change: 2026-10-28.

### CI-03 `persist-credentials: false`: unchanged in default, reason text partly stale

The checkout `action.yml` on main: `persist-credentials` default `true`, description "Whether to configure the token or SSH key with the local git config", `runs.using: node24`. The README says that since v6 credentials are "stored in a separate file under $RUNNER_TEMP instead of directly in `.git/config`" and git fetch and push keep working. This v6 change predates the window (v6.0.1, 2025-12-02, added worktree support). So "stays in the git credential helper" is imprecise for v6 and v7 but the exposure to later steps remains, because the file is still readable on the runner. No 2026 release note mentions persist-credentials.
Window changes to checkout: v7.0.0 (2026-06-18) blocks checking out fork pull requests for `pull_request_target` and `workflow_run`; the new input `allow-unsafe-pr-checkout` defaults to `false`. v7.0.1 (2026-07-20) skips the unsafe PR check when the input is default. Backports: v2.8.0, v3.7.0, v4.4.0, v5.1.0, v6.1.0 (all 2026-07-20) add the same input and are marked breaking. GitHub also announced that `pull_request_target` is blocked by default in public repositories starting 2026-12-02 (brownouts 2026-11-09 and 2026-11-16).
Evidence: https://raw.githubusercontent.com/actions/checkout/main/action.yml ; https://raw.githubusercontent.com/actions/checkout/main/README.md ; https://github.com/actions/checkout/releases ; https://github.com/actions/checkout/releases/tag/v7.0.0 ; https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2
Verdict: keep the MUST. Reword the reason to "the token is written to disk under the runner temp directory and stays readable by every later step".

### What Agents Get Wrong #6, `actions/checkout@v3`: still stale, now more so

Current major is v7 (v7.0.1, 2026-07-20). The README example uses `@v7`. Maintenance releases still ship for v2 to v6, but those are security backports. Note that attest's own README example still uses `actions/checkout@v4`, and cargo-deny-action's README uses `@v4`, so agents copying upstream READMEs will get old majors. Suggested replacement example: "`actions/checkout@v3` or `@v4`; the current major is v7".
Evidence: https://github.com/actions/checkout/releases

### CI-09 rust-cache `save-if`: unchanged

`action.yml` lists `save-if` (default `true`, "if false, only restored"), `cache-bin` (default `true`), `cache-provider` (`github` or `warpbuild`), `runs.using: node24`. Releases in the window: v2.9.2 (2026-08-06) widened cleanup of `build/` and `.fingerprint/` to named targets and cdylib, rlib, dylib and staticlib targets, added Cargo v2 build-dir layout support, and scans `$CARGO_HOME/bin` on restore; v2.9.3 (2026-10-20) fixed cleanup timestamp pruning that stopped after the first entry. No change to cache-cap behaviour was found; the per-repo cap is GitHub's, not the action's. "Could not determine" whether GitHub changed the 10 GB default cap in the window; no fetched source mentioned it.
Evidence: https://raw.githubusercontent.com/Swatinem/rust-cache/master/action.yml ; https://github.com/Swatinem/rust-cache/releases

### CI-11 `merge_group: { types: [checks_requested] }`: unchanged

The merge-queue docs still say "You must use the merge_group event to trigger your GitHub Actions workflow" and "A merge_group webhook event of type checks_requested is dispatched"; without the trigger, required checks are never reported. The workflow syntax page's examples all use `types: [checks_requested]`.
Evidence: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue

### CI-12 giraffate/clippy-action: unchanged API, maintenance could not be determined

The README still documents `reporter` as "[github-pr-check,github-pr-review]", same as the reviewdog `-reporter` flag. Its example uses `giraffate/clippy-action@v1`. The Releases page listed a single pre-release, v1.0.0, published 10 Nov (2026 by the page footer), and the repository shows 47 commits and no archived notice. That is a recent release, which is positive maintenance evidence, but the releases page does not state a year and the commit dates were blank, so "still maintained" is likely, not proven. Note the oddity: a v1.0.0 listed as pre-release while the README example already uses `@v1`; a SHA pin must resolve to a commit, not rely on the `@v1` moving tag.
Evidence: https://github.com/giraffate/clippy-action ; https://github.com/giraffate/clippy-action/releases

### CI-07 cargo-deny-action advisories split: unchanged in substance

The README heading is "Recommended pipeline if using advisories, to avoid sudden breakages". The YAML is a matrix `checks: [advisories, bans licenses sources]` with `continue-on-error: ${{ matrix.checks == 'advisories' }}` under the comment "Prevent sudden announcement of a new advisory from failing ci:", running `EmbarkStudios/cargo-deny-action@v2` with `command: check ${{ matrix.checks }}`. If the rule claims it is "verbatim from upstream", that is accurate only for the matrix and `continue-on-error` mechanics; the README example runs on `ubuntu-22.04` and uses `actions/checkout@v4`, and it has no scheduled blocking run, so the schedule half of CI-07 is the rule's own addition. The releases page showed no releases, so no version or date could be determined.
Evidence: https://raw.githubusercontent.com/EmbarkStudios/cargo-deny-action/main/README.md

### REL-04 attestation step: changed

Old text: `attest-build-provenance@v3` with `attestations: write`.
New facts:
- `actions/attest-build-provenance` v4.0.0 (2026-02-25) became a thin wrapper over `actions/attest`; its README says "new implementations should use `actions/attest` instead". Latest wrapper release v4.2.2 (2026-08-06). v3.1.0 (2025-12-19) added artifact metadata storage records.
- `actions/attest` latest is v4.2.2 (2026-08-04); v4.2.0 (2026-07-16) added SHA-2 subject digest support and reading subjects from `GITHUB_ARTIFACTS_LIST`.
- The attest README now lists three permissions: `id-token: write`, `attestations: write`, `artifact-metadata: write` ("necessary to create the artifact storage record"). The rule names only `attestations: write`.
Evidence: https://github.com/actions/attest ; https://github.com/actions/attest/releases ; https://github.com/actions/attest-build-provenance/releases ; https://github.com/actions/attest-build-provenance
Date of upstream change: 2026-02-25 for the wrapper move (before the window, so the earlier research recorded it correctly); the `artifact-metadata` requirement date could not be determined.

## New GitHub controls the rule does not mention

1. Workflow dependency lockfiles and the "Require lockfile" policy (GA 2026-10-28). Adopt for repositories on a supported plan; keeps SHA pins but without hand-maintained pins.
2. `pull_request_target` blocked by default in public repositories from 2026-12-02, plus checkout v7 `allow-unsafe-pr-checkout`. A Rust release or CI workflow must not check out fork code under `pull_request_target`. Mention as a CI rule or in the injection section.
3. `artifact-metadata: write` for attestation jobs (above).
4. Immutable releases for the repository's own release publishing; and the SHA-pinning policy in the allowed-actions settings (2025-08-15, older than the window but absent from the rule).
5. zizmor 1.33.0 (2026-11-22) added `dangerous-checkout`, limited to `actions/checkout`; zizmor 1.30.0 added `self-repository`; 1.31.0 added `cache-mode` awareness to `cache-poisoning`. If the rule recommends zizmor, these are relevant. Release dates for 1.31 and 1.32 were not shown.
6. Not adoptable yet: native egress firewall for hosted runners (roadmap, public preview 6 to 9 months after March 2026); scoped secrets and policy-driven execution (roadmap). Check status before writing rules.

## Normative guidance candidates

1. Rule: CI-02 allows either full-SHA pins or an enforced workflow lockfile. Rationale: GitHub says a lockfile supersedes SHA pinning. Verification: grep `uses:` lines for `@[0-9a-f]{40}`, or check that `.github/workflows/actions.lock` exists and `gh actions-lock` reports no stale entries in CI.
2. Rule: attestation jobs grant `id-token: write`, `attestations: write` and `artifact-metadata: write`, and use `actions/attest`, not `attest-build-provenance`, in new workflows. Rationale: wrapper is a pointer to attest; attest README lists the third permission. Verification: grep for `uses: actions/attest@` and the three permission keys in the same job.
3. Rule: never run `actions/checkout` on a fork pull request ref under `pull_request_target` or `workflow_run`. Rationale: checkout v7 blocks it unless `allow-unsafe-pr-checkout: true`, and GitHub blocks `pull_request_target` by default on public repos from 2026-12-02. Verification: grep for `allow-unsafe-pr-checkout`; zizmor `dangerous-checkout` and `dangerous-triggers`.
4. Rule: reword CI-03 reason to "the token is written under `$RUNNER_TEMP` and stays readable by later steps". Rationale: v6 and later no longer write to `.git/config`. Verification: reviewer reads the rule text; count of `persist-credentials: false` equals checkout count (unchanged).
5. Rule: in the stale-version warning, name current majors, not just a stale example: checkout v7, attest v4, rust-cache v2. Verification: a script comparing `uses:` majors against a pinned table at refresh time.

## AI-agent angle

- Agents copy READMEs with old majors (`actions/checkout@v4` in the attest and cargo-deny-action READMEs). Check: grep the `# vX` comment against the current major table.
- Agents write `attest-build-provenance` from older training data and omit `artifact-metadata: write`. Check: job permissions grep above.
- Agents assume "SHA-pinned means safe" and skip lockfile or "Require lockfile"; harmless but missed. No mechanical check.
- Agents write `pull_request_target` workflows that check out `github.event.pull_request.head.sha`; check: zizmor `dangerous-checkout`.

## Contested and evolving

- SHA pins versus lockfiles: GitHub now positions the lockfile as the successor (2026-10-28), but it needs a supported plan and a CLI extension; trend is toward lockfiles, as of 2026-11. Immutable releases have no consumer-side verification, so they do not yet justify relaxing pins.
- giraffate/clippy-action is a single-maintainer action with one pre-release; trend unclear.
- The Actions changelog label page showed no September 2026 entries and showed titles only; absence of an entry there is not proof of absence of a change.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.blog/changelog/label/actions/ | Actions changelog index | 2026-10-01 to 2026-11-19 entries | Window overview (titles only) |
| https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available | Lockfile GA | 2026-10-28 | CI-02 |
| https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2 | Default block | 2026-11-02 | CI-03 neighbour |
| https://github.blog/changelog/2026-10-02-stateless-github-app-installation-tokens-rolled-out | App token format | 2026-10-02 | CI-01 negative check; GITHUB_TOKEN not mentioned |
| https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/ | Security roadmap | 2026-03-26 | Planned controls |
| https://docs.github.com/en/actions/reference/security/secure-use | Hardening reference | current | Lockfile supersedes SHA pinning |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | Syntax reference (first 100000 characters) | current | `permissions: {}`, merge_group |
| https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue | Merge queue docs | current | CI-11 |
| https://github.com/actions/checkout/releases | Checkout releases | 2026 | Current major v7 |
| https://github.com/actions/checkout/releases/tag/v7.0.0 | v7.0.0 notes | 2026-06-18 | Fork PR block |
| https://raw.githubusercontent.com/actions/checkout/main/action.yml | Checkout inputs | current | persist-credentials default |
| https://raw.githubusercontent.com/actions/checkout/main/README.md | Checkout README | current | Credential storage |
| https://github.com/Swatinem/rust-cache/releases | rust-cache releases | 2026-08-06, 2026-10-20 | CI-09 |
| https://raw.githubusercontent.com/Swatinem/rust-cache/master/action.yml | rust-cache inputs | current | save-if |
| https://github.com/giraffate/clippy-action | clippy-action README | current | reporter values |
| https://github.com/giraffate/clippy-action/releases | clippy-action releases | v1.0.0, 10 Nov | Maintenance |
| https://raw.githubusercontent.com/EmbarkStudios/cargo-deny-action/main/README.md | cargo-deny-action README | current | CI-07 |
| https://github.com/EmbarkStudios/cargo-deny-action | cargo-deny-action repo | current | No releases listed |
| https://github.com/actions/attest | attest README | current | Permissions |
| https://github.com/actions/attest/releases | attest releases | v4.2.2, 2026-08-04 | REL-04 |
| https://github.com/actions/attest-build-provenance | Wrapper README | current | Deprecation pointer |
| https://github.com/actions/attest-build-provenance/releases | Wrapper releases | v4.2.2, 2026-08-06 | REL-04 |
| https://docs.zizmor.sh/release-notes/ and https://github.com/zizmorcore/zizmor/releases | zizmor changelog | 1.29.0 (2026-08-01) to 1.33.1 (2026-11-22) | New audits |

Search-result-only (title and snippet, not opened): the 2025-08-15 SHA-pinning policy changelog and the immutable releases docs page.
The lockfile docs page at docs.github.com returned 404 at the URL tried.

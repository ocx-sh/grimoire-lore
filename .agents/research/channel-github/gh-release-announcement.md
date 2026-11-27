---
title: "GitHub Release as the release announcement: body contract, tag-to-release parity, Latest and immutability, Discussions"
program: product
sub_program: channels
topic: channel-github
worker: gh-release-announcement
date_researched: 2026-11-27
model: sonnet
sources_fetched: 25
scope: >
  Covers the GitHub Release as the fleet's only release announcement: body contract,
  generator lever (git-cliff template vs commit subjects), tag-without-Release check,
  Latest and pre-release flags, immutable releases, release notifications, per-release
  Discussions. Does not cover commit-message style (depends on existing catalog rules, named
  in finding 2) or release-note wording and tone (marketing-copy territory).
---

# GitHub Release as the release announcement

## Contents

1. Summary
2. Findings (1 Docs facts, 2 Fleet measurements, 3 Exemplar measurements, 4 Lever, 5 Tags without Releases, 6 Latest and pre-release, 7 Immutable, 8 Notifications and Discussions, 9 Reproduction failures)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- The GitHub Release body is the only announcement the fleet has: no repository has Discussions-linked releases, and no social channel exists. A release with a one-line compare-link body announces nothing.
- Fleet measurement (2026-11-27, last 10 releases per repo, 9 repos, 89 release bodies; 9 repos give 10+10+10+9+10+10+10+10+10): 0 of 89 bodies open with a prose summary sentence; ocx has 44 `**BREAKING**` lines (the audit says 45; one line fails to reproduce) and 0 Migration lines; grimoire has 5 `**BREAKING**` lines and 5 Migration lines; indexbot has 7 of 10 bodies under 100 characters (median 78).
- The lever is the generator template, not the commit subjects. grimoire's `cliff.toml` already renders a `**Migration:**` line from the Conventional Commits [`BREAKING CHANGE:` footer](https://www.conventionalcommits.org/en/v1.0.0/) (5 of 5, measured on the posted bodies, where it appears as the bullet right after the BREAKING bullet). ocx's template, owned by `ocx-sh/conventions`, has no such branch (0 of 44).
- git-cliff's [git config docs](https://git-cliff.org/docs/configuration/git) describe no scope-skip option. Skip internal scopes with a `commit_parsers` regex on the message, and set `protect_breaking_commits = true` so a breaking commit is never skipped. The regex form is an inference from the documented `message` field, to be proven with `git cliff --unreleased`.
- Body contract: summary sentence, then Breaking (each entry followed by a Migration line), then Keep a Changelog types, then a docs link. The summary sentence is a SHOULD because the 12 exemplar release pages were read by hand for their lead line and differ (only mise leads with a prose sentence and hugo with a prose motivation; uv, ruff, deno and atuin lead with a "Release Notes"/version heading; just leads with "Breaking"; see finding 3).
- dist (grimoire's release tool, the only fleet repo using it) builds the body from the changelog: tag-matched changelog section found, title replaced by the changelog title, body placed under a `## Release Notes` heading; no match means title = tag and no notes ([dist 0.32.0 `announce.rs`](https://docs.rs/crate/cargo-dist/0.32.0/source/src/announce.rs), [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html)). The grimoire workflow's `gh release create ... artifacts/*` publishes the body and assets in one command, which is why GH-REL-17 (immutable) needs a test before enabling.
- Every tag that ships to a registry MUST have a Release. Measured: catalog (16 tags, npm `@ocx-sh/catalog` 0.6.5 live), conventions (16, has `publish.yml`), devcontainer-features (2, has `release.yml`) are not internal, so the "internal repo exemption" does not apply to them. Gap total reproduces: catalog 16, conventions 16, indexer 29, devcontainer-features 2, ocx-mirror 1, www-setup 1, website 1.
- Latest: omit `--latest` unless backporting. All 9 measured repos have Latest equal to the newest tag. GitHub's own docs ([managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) vs [REST releases](https://docs.github.com/en/rest/releases/releases)) disagree on how Latest is chosen (finding 6); verify the result, do not assume it.
- Immutable releases went GA 2025-10-28 ([GitHub changelog](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/)). 0 of 34 grimoire releases are immutable; 5 of 12 exemplar projects (uv, ruff, cli, deno, mise) are immutable on all 10 sampled releases. Adoption needs a draft-then-publish workflow and burns tag names permanently ([immutable releases docs](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)), so enabling it is an owner decision.
- Discussions announcement per release: not recommended. 0 of 120 exemplar releases link a discussion; fleet has 0 linked of 34 in grimoire, the only repo with Discussions enabled; GitHub's [managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) page states no notification effect.
- Who a release notifies is only partly documented: watchers choose Custom > Releases ([configuring notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications)); recipients for drafts and pre-releases are undocumented. A plan must not assume either.
- `gh release view --json isLatest` fails (the field does not exist); use `gh release list --json isLatest`. The brief's command needed this correction.

## Findings

### 1. What GitHub's own documentation states (no document carries a date)

None of the GitHub Docs pages below shows a date or "last updated" stamp in the fetched text; each was fetched 2026-11-27. Dates are given where a dated second source exists.

| Fact | Source | Authority |
|---|---|---|
| `.github/release.yml` has `changelog.exclude.labels`, `changelog.exclude.authors`, and `changelog.categories[]` with required `title` and `labels`, optional per-category `exclude`. `*` is the catch-all, and the page says "`labels: '*'` is required to display a catchall category". The page does not state "first match wins". No limits stated. | [Automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) | platform |
| Up to 1000 assets per release; each file under 2 GiB; no limit on total size or bandwidth. Page does not mention pre-releases, Latest, discussions or immutability. | [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) | platform |
| Create steps include "This is a pre-release", "Set as latest release", "Create a discussion for this release" (needs Discussions enabled, category chosen). Unset Latest: "the latest release label will automatically be assigned based on semantic versioning". The page does not say anyone is notified. CLI: `gh release create TAG`. | [Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) | platform |
| Latest URLs: `https://github.com/OWNER/REPO/releases/latest` and `.../releases/latest/download/asset-name.zip`. Page does not say how Latest is chosen or whether pre-releases are excluded. | [Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) | platform |
| REST: "The latest release is the most recent non-prerelease, non-draft release, sorted by the `created_at` attribute"; `created_at` is the commit date. `make_latest` accepts `true`, `false`, `legacy` (default `true`); "Drafts and prereleases cannot be set as latest"; `legacy` picks by creation date and higher semver. `discussion_category_name` creates and links a discussion (invalid category: 404 on create). `generate_release_notes` prepends a supplied `body` to the generated notes. Release objects carry an `immutable` boolean. | [REST releases](https://docs.github.com/en/rest/releases/releases) | platform |
| Immutable: assets and tag locked after publish; title, notes, pre-release and latest flags stay editable; an attestation is generated; recommended flow is draft, attach all assets, publish; a deleted immutable release's tag name cannot be reused, nor in a new repository of the same name. | [Immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases) | platform |
| Immutable releases generally available 2025-10-28; enabled at repo or org level; existing releases stay mutable unless republished; disabling later does not un-lock releases made while enabled. | [GitHub changelog 2025-10-28](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/) | platform, dated |
| Verification: `gh release verify RELEASE-TAG` (checks the release exists and is immutable) and `gh release verify-asset RELEASE-TAG ARTIFACT-PATH`. No minimum `gh` version stated. | [Verifying the integrity of a release](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release) | platform |
| Watching: Custom offers "Releases" among event types; the page says nothing on recipients, pre-releases or drafts. Delivery: web inbox, mobile inbox, email; GitHub Mobile push does not list releases. | [Configuring notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications), [About notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-notifications) | platform |
| Discussions need an administrator to enable them; the about page says nothing about releases. | [About discussions](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions) | platform |

Specifications for the body format:

| Fact | Source | Authority |
|---|---|---|
| Keep a Changelog 1.1.0: "Changelogs are for humans, not machines"; one entry per version; types Added, Changed, Deprecated, Removed, Fixed, Security; `Unreleased` section; ISO 8601 dates; `[YANKED]` tag; "Using commit log diffs as changelogs is a bad idea: they're full of noise". Page shows 1.1.0; its embedded changelog's newest entry is 1.1.2 dated 2024-09-27. | [keepachangelog.com 1.1.0](https://keepachangelog.com/en/1.1.0/) | specification |
| Conventional Commits 1.0.0: breaking change is `!` before the colon, a footer `BREAKING CHANGE: <description>` (uppercase; `BREAKING-CHANGE` is a synonym), or both. | [conventionalcommits.org v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) | specification |
| SemVer 2.0.0: pre-release has lower precedence than its normal version; major version zero "Anything MAY change at any time"; deprecation requires a minor bump and removal should wait for a major. | [semver.org 2.0.0](https://semver.org/spec/v2.0.0.html) | specification |
| git-cliff: `commit_parsers` fields `message`, `body`, `footer`, `group`, `scope`, `skip`, `field`+`pattern`, `continue`; "The page doesn't describe a way to skip a scope"; `skip = true` drops the whole commit; `protect_breaking_commits = true` stops any parser skipping a breaking commit; `filter_unconventional` default `true`; `tag_pattern` is a regex such as `v[0-9].*`. Changelog options `header`, `body` (once per release), `footer`, `trim`. | [git-cliff git config](https://git-cliff.org/docs/configuration/git), [git-cliff changelog config](https://git-cliff.org/docs/configuration/changelog) | tool docs |
| dist (formerly cargo-dist), book: the Host + Announce step "Creates (or edits and undrafts) a GitHub Release", uploads artifacts and "Adds relevant release notes from your RELEASES/CHANGELOG". The book index does not define the parse format. | [dist book](https://axodotdev.github.io/cargo-dist/book/index.html) | tool docs |
| dist config: `create-release` ("If true, dist will create a new GitHub Release and generate a title/body for it based on your changelog"; false expects an existing draft); `github-release` (which stage creates the Release, value `announce` = announce step); `package.changelog` (relative path to the changelog file, used for release bodies); `display` / `display-name` (whether and how a package is named in release bodies). | [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html) | tool docs |
| dist 0.32.0 source: `compute_announcement_changelog` looks up the tag's version in the workspace (or package) changelog; on a match the announcement title is replaced by the changelog title and the body goes under a `## Release Notes` heading; on no match it logs "failed to find {version} in workspace changelogs, skipping changelog generation", the title stays the tag and no notes are added. `announcement_is_prerelease` follows the planned version's pre-release status. The parse rules for RELEASES/CHANGELOG live in `axoproject` and were not read. | [dist 0.32.0 announce.rs](https://docs.rs/crate/cargo-dist/0.32.0/source/src/announce.rs) | tool source |
| Fleet: grimoire pins `cargo-dist-version = "0.33.0"` with `hosting = "github"`; its `release.yml` ends `gh release create "$TAG" ... --notes-file notes.txt artifacts/*` with the body from `announcement_github_body`. | `dist-workspace.toml` and `.github/workflows/release.yml` in grimoire-rs/grimoire, read locally 2026-11-27 | measurement |

### 2. Fleet measurements (2026-11-27)

Commands (run from a scratch directory; `gh` authenticated):

```
gh release list -R $r -L 10 --json tagName,isLatest,isPrerelease,isDraft
gh release view $tag -R $r --json tagName,body,isImmutable,isPrerelease
```

Body statistics were computed with a short `python3 -I` script over the saved JSON: `BREAKING` lines are lines containing the string; Migration is the regex `\*\*Migration:?\*\*`; internal-scope bullets are bullets with `(test|ci|deps|release|claude|chore)` in parentheses or as a `**scope**` prefix; short is body length under 100 characters; summary-first is "first non-blank line is not a heading, bullet, quote or HTML", then inspected by hand.

| Repo | Releases sampled | Median body (chars) | Bodies with BREAKING | BREAKING lines | Migration lines | Internal-scope bullets | Bodies under 100 chars | Latest = newest tag | Immutable |
|---|---|---|---|---|---|---|---|---|---|
| ocx-sh/ocx | 10 | 6262 | 7 | 44 (audit: 45) | 0 | 26 | 0 | yes (v0.6.8) | 0 |
| ocx-sh/ocx-mirror | 10 | 1030 | 2 | 3 | 0 | 26 | 0 | yes (v0.6.5) | 0 |
| ocx-sh/indexbot | 10 | 78 | 0 | 0 | 0 | 0 | 7 | yes (v0.6.3) | 0 |
| ocx-sh/rules_ocx | 9 | 198 | 2 | 2 | 0 | 2 | 0 | yes (v0.5.1) | 0 |
| ocx-sh/www-setup | 10 | 824 | 0 | 0 | 0 | 6 | 1 | yes (v0.4.0) | 0 |
| ocx-sh/website | 10 | 453 | 0 | 0 | 0 | 5 | 0 | yes (v0.7.0) | 0 |
| grimoire-rs/grimoire | 10 | 5198 | 3 | 5 | 5 | 9 | 0 | yes (v0.17.0) | 0 (0 of 34 all releases) |
| grimoire-rs/indexer | 10 | 357 | 0 | 0 | 0 | 2 | 0 | yes (v0.8.0) | 0 |
| grimoire-rs/grimoire-vscode | 10 | 199 | 0 | 0 | 0 | 0 | 4 | yes (v0.5.0) | 0 |

Readings:

- Re-run 2026-11-27 for this repair (`gh release list -R $r -L 10`, then `gh release view $t -R $r --json tagName,body` per tag; gh 2.105.0): 10+10+10+9+10+10+10+10+10 = 89 bodies saved, 89 files. `**BREAKING**` lines: ocx 44, ocx-mirror 3, rules_ocx 2, grimoire 5. The 90 and 87 earlier in this artifact were counting errors; 89 is the count everywhere.
- Summary sentence: 0 of 89 bodies open with a prose summary. The heuristic flagged website (10, each starts with an install-pointer line such as ``npm: [@ocx-sh/theme@0.7.0](...) · grim skills: `ghcr.io/ocx-sh/lore/*:0.7.0` ``) and rules_ocx v0.5.0 (a blockquote stating "Requires Bazel ≥ 8.0.0 ... ocx ≥ 0.6.1"). Both are useful lead lines but not a "what changed for you" sentence. Audit claim confirmed.
- ocx-mirror v0.6.5 shows the same defect as ocx: two BREAKING bullets ("Dispatch releases ... from release.yml *(release)* **BREAKING**", "Follow the ocx exit-code collapse ... **BREAKING**") with no Migration line, and bullets scoped `(release)`, `(spec)`, `(artifacts)`, `(claude)`.
- ocx v0.6.8 body carries a `### Release` section whose single bullet is "V0.6.8" and a stray reference-link line `[0.6.8]: https://github.com/ocx-sh/ocx/compare/v0.6.7..v0.6.8` at the end, because the template's `footer` is emitted into the release body. The grimoire `cliff.toml` skips `^release`; the ocx one does not.
- website bodies are GitHub-generated ("What's Changed", raw PR titles with `feat(nav):` prefixes, `by @user in <url>`). No fleet repo has a `.github/release.yml` (`gh api repos/$r/contents/.github/release.yml` returns 404 for all 14 repos probed). The website repo therefore uses the default generated notes without categories.
- www-setup bodies embed commit hashes as links (`([1bf221a](...))`). The audit's 9 of 10 hash-shaped bodies was not re-run here.
- `cliff.toml` exists in 12 of 14 probed repos; `dist-workspace.toml` only in grimoire; the two repos with nothing (grim-gui, grim-mirror) have neither and no tags.
- Latest correctness: in all 9 repos the Latest-flagged release is the first row of `gh release list`, which is also the highest version. No pre-release appears in any of the 89 sampled rows.

Config models (from the audit, [`product-audit/config-inventory.md`](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/config-inventory.md), line 415): ocx treats the changelog as commit subjects; grimoire curates a second page per release; vscode uses a generic template. The template-owned header in ocx's `cliff.toml` ("ocx-baseline: template-owned file — change ocx-sh/conventions, then run task copier:update") means the fix for ocx and its siblings lives in `ocx-sh/conventions`, not in each repo.

### 3. Exemplar release pages (12 upstream CLIs, 2026-11-27)

Command: `gh api "repos/$r/releases?per_page=10"`, then a `python3 -I` script over the JSON (non-draft releases only). Repos come from [`exemplar-readmes.md`](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-readmes.md). "Breaking mention" is a case-insensitive substring match for "breaking"; "migrate/upgrade mention" matches `migrat|upgrad`; both are rough indicators.

| Project | Newest sampled | Median body (chars) | Opens with | Immutable (of 10) | Breaking mention | Migrate/upgrade mention | Linked discussion |
|---|---|---|---|---|---|---|---|
| astral-sh/uv | 0.13.10, 2026-11-24 | 8491 | "## Release Notes", then "Released on 2026-11-24." | 10 | 0 | 4 | 0 |
| astral-sh/ruff | 0.17.6, 2026-11-19 | 8339 | "## Release Notes" | 10 | 1 | 6 | 0 |
| cli/cli | v2.106.0, 2026-11-25 | 4077 | "## Security" (security release leads, advises update) | 10 | 0 | 2 | 0 |
| denoland/deno | v2.9.8, 2026-10-21 | 4437 | heading with version and date | 10 | 0 | 4 | 0 |
| jdx/mise | v2026.11.14, 2026-11-24 | 10856 | prose summary of the release in 2 sentences, then `## Added` | 10 | 1 | 6 | 0 |
| casey/just | 1.59.0, 2026-10-15 | 4334 | "### Breaking" first | 0 | 1 | 1 | 0 |
| biomejs/biome | 2.6.9, 2026-11-24 | 38128 | version heading | 0 | 2 | 5 | 0 |
| BurntSushi/ripgrep | 16.0.0, 2026-11-22 | 1258 | sponsorship line | 0 | 1 | 0 | 0 |
| evanw/esbuild | v0.28.2, 2026-08-08 | 3432 | bullet list | 0 | 3 | 2 | 0 |
| atuinsh/atuin | v18.25.1, 2026-11-20 | 8649 | "## Release Notes" | 0 | 0 | 1 | 0 |
| gohugoio/hugo | v0.170.1, 2026-11-17 | 4469 | prose (motivation for release) | 0 | 1 | 8 | 0 |
| go-task/task | nightly, 2026-11-27 | 1086 | "## Changelog" | 0 | 1 | 1 | 0 |

Readings:

- 0 of 120 sampled exemplar releases link a Discussion (`discussion_url` is null for all).
- 5 of 12 projects publish all 10 sampled releases as immutable; the larger Rust and Deno tools that adopted it did so within the 2025-10-28 to 2026-11-27 window. This is a count of the `immutable` field in the REST release object, not a statement about their reasons.
- Only mise (and, in prose form, hugo) lead with a plain sentence about the release; just leads with a "Breaking" section; cli leads with Security when a release is a security release. No exemplar is uniform, so "summary sentence first" is a convention to adopt, not an observed standard.
- Median body length of exemplars ranges 1086 to 38128 characters; the fleet's three smallest medians (78, 198, 199) are below every exemplar. This is a count, not a causal claim.

### 4. The lever: generator template or commit subjects

Evidence for the template as the lever:

- grimoire's `cliff.toml` lines 27-30 render `*(scope)*`, `**BREAKING**`, and, when a `commit.breaking_description` exists and differs from the subject, a `**Migration:** <description>` bullet. In the posted release bodies (measured; `gh release view v0.17.0 -R grimoire-rs/grimoire --json body`) the Migration bullet is a flush top-level bullet directly after the BREAKING bullet, not an indented sub-bullet, and the whole body sits under dist's `## Release Notes` heading. The result is 5 Migration lines for 5 BREAKING bullets with no change to commit style. The footer carrying that text is the Conventional Commits `BREAKING CHANGE:` footer ([spec item 12](https://www.conventionalcommits.org/en/v1.0.0/)).
- ocx's template lacks the Migration branch, so the same footer content would be dropped even if authors wrote it. Fixing the commit habit alone cannot work until the template renders it.
- The existing catalog rules that this depends on (commit-message style): the Conventional Commits rules in the language sets. No new commit rule is proposed. The only addition is that a breaking commit carries a `BREAKING CHANGE:` footer written as the migration instruction, which is an application of Conventional Commits item 12, not a new style.
- Internal scopes: git-cliff documents `skip = true` per parser but no scope-skip option. Candidate parser: `{ message = "^[a-z]+\\((test|ci|deps|release|claude)\\)", skip = true }` placed before the type parsers, plus `protect_breaking_commits = true`. Whether `message` includes the type and scope prefix is implied by the fleet's own `{ message = "^feat" }` parsers (the type is part of the matched message) but is not stated in the fetched docs; verify with `git cliff --unreleased`.
- Keep a Changelog states the generator is a poor source when it is a raw dump: "Using commit log diffs as changelogs is a bad idea: they're full of noise." The fleet's ocx body (`### Release - V0.6.8`) is the failure it describes.

Evidence against pure automation: Keep a Changelog and Conventional Commits disagree on whether notes are curated or derived (finding in Contested). A summary sentence and a Migration instruction are judgement text; a template cannot invent them. The template can only reserve the place and fail when absent.

Decision: the lever is the generator template (owned once, in `ocx-sh/conventions` for the ocx fleet), plus a pre-publish check on the rendered body. Commit subjects are the second lever only for the Migration text via the footer.

dist announcement: sourced in finding 1 (dist config reference and 0.32.0 `announce.rs`). dist does not template the body; it copies the matching changelog section under `## Release Notes`. So for grimoire the lever is the changelog generator (`cliff.toml`) and the changelog heading must match the tag version, or the body is empty and the title falls back to the tag. Not measured: a grimoire release whose changelog heading failed to match (no such release among the 10 sampled).

### 5. Tags without Releases

Commands:

```
gh release list -R $r -L 200 --json tagName -q length
gh api repos/$r/tags --paginate -q '.[].name' | wc -l
```

| Repo | Releases | Tags | Tag-only | Ships to a registry? Evidence |
|---|---|---|---|---|
| ocx-sh/catalog | 0 | 16 | 16 | Yes. `package.json` name `@ocx-sh/catalog`; `curl -s https://registry.npmjs.org/@ocx-sh/catalog` returns dist-tag `latest` 0.6.5; `.github/workflows/release.yml` exists |
| ocx-sh/conventions | 0 | 16 | 16 | Yes (inferred). `.github/workflows/publish.yml` exists; the latest tags v0.3.6, v0.3.5, v0.3.4. Registry target not read |
| ocx-sh/devcontainer-features | 0 | 2 | 2 | Yes (inferred). `.github/workflows/release.yml` exists; tag v1.0.1 commit message "chore(release): ocx 0.6.8, feature 1.0.1". Registry target not read |
| grimoire-rs/indexer | 12 | 41 | 29 | Yes. Published as `@grimoire-rs/indexer`; the 29 are older tags |
| ocx-sh/ocx-mirror | 14 | 15 | 1 | Yes (GitHub Release binaries) |
| ocx-sh/www-setup | 11 | 12 | 1 | Hosts the installer site |
| ocx-sh/website | 11 | 12 | 1 | Publishes `@ocx-sh/theme` to npm |
| ocx, indexbot, rules_ocx, grimoire, grimoire-vscode | = tags | = tags | 0 | |
| ocx-sh/index, e2e-index, grimoire-lore; grimoire-rs/grim-gui, grim-mirror | 0 | 0 | 0 | No tags: nothing to check. grim-gui was pushed 2026-11-26 per the audit and has no tag, release or download path |

Totals reproduce the audit: catalog 16, conventions 16, indexer 29, devcontainer-features 2, ocx-mirror 1, www-setup 1, website 1.

Reading: the audit's pattern 6 stands; the commission's caveat ("an internal tag-only repo may be correct") does not rescue any of the seven, because each ships a registry artifact or hosts an installer. "Tag-only is correct" would apply to a repository whose tags exist only for dependency pinning and which no user installs; none was found. Whether to backfill 16 or 29 old Releases is an owner decision (finding in must-not-decide): creating a Release on an old tag can notify watchers (undocumented, so unknown) and re-opens the immutability question.

### 6. Latest and pre-release rules

- GitHub's documents describe Latest three ways: managing-releases says an unset Latest is "assigned based on semantic versioning"; the REST endpoint says the latest is the most recent non-prerelease, non-draft by `created_at` (the commit date); `make_latest: legacy` uses creation date and higher semver; the REST default for `make_latest` is `true`. These do not agree on what happens when two releases are cut out of order (backport of 1.4.1 after 2.0.0). The gh CLI help for `gh release create --latest` reads "[automatic based on date and version]".
- Consequence: an install script pinned to `/releases/latest/download/<asset>` ([linking docs](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)) breaks when a backport steals Latest or when asset names change between releases. The linking page does not state Latest-selection rules, so the fleet cannot cite it for one.
- Pre-releases: the docs describe the flag as a notice that the release "is not ready for production and may be unstable" and the REST page says pre-releases cannot be Latest. SemVer 2.0.0 item 9 supplies the version form (`1.0.0-rc.1`) and lower precedence. The fleet has no pre-release in its last 90 releases, so there is no measured defect.
- Workflow default: release tooling should not pass `--latest=false` on a normal release and should set it explicitly on a backport; verify after publish.

### 7. Immutable releases

- Mechanism and dates in finding 1. Enabled per repo or org; "Once enabled, all new releases are immutable"; tag locked; attestation generated.
- Consequence for fleet release workflows: any workflow that creates a release and then uploads assets (cargo-dist style, `gh release create` followed by `gh release upload`) fails or needs rework once enabled; the documented pattern is draft, upload all assets, then publish. The fleet's own workflows were not read in this dive; the claim is a consequence of the documented lock, not a measured failure.
- Verification path: `gh release verify TAG` and `gh release verify-asset TAG FILE`.
- Cost: deleting an immutable release does not free its tag name ([immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)). A mis-tagged release forces a new version.
- Fleet state: 0 of 34 grimoire releases and 0 of the 9 repos' sampled releases are immutable. `isImmutable` is a field of `gh release view --json`.
- Exemplars: 5 of 12 (uv, ruff, cli, deno, mise).

### 8. Who a release notifies, and Discussions

- Documented: watchers can select Custom > Releases; delivery is web inbox, mobile inbox, email; mobile push excludes releases ([configuring notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications)). Not documented: who gets notified for pre-releases or drafts; whether "Create a discussion for this release" adds a second notification. The scout's row 17 caveat reproduces.
- Fleet state: only grimoire has Discussions enabled; `gh api "repos/grimoire-rs/grimoire/releases?per_page=100" --paginate -q '.[]|select(.discussion_url!=null)|.tag_name' | wc -l` prints 0, and the same for ocx. Other repos have Discussions off (`has_discussions` false), so the `discussion_category_name` / "Create a discussion for this release" option does not exist for them.
- Exemplars: 0 of 120 releases link a Discussion.
- Decision: not recommended as a required step. What it buys is undocumented; what it costs is a second thread to moderate per release and Discussions enabled on every repo. Optional only for a major release where the owner wants feedback in one place. Rationale is the absence of evidence in both directions: the docs make no promise and the exemplar sample shows no adoption, which is not proof it has no value (a count of presence is not an engagement measurement).

### 9. Figures from the brief or scouts that failed to reproduce

- Brief command `gh release view --json body,isLatest,isPrerelease`: `isLatest` is not a field of `gh release view` (available fields include `isDraft`, `isImmutable`, `isPrerelease`, `publishedAt`, `tagName`). Use `gh release list --json isLatest`.
- Scout row 14 says GitHub's docs "do not state how Latest is chosen, so the default is semver-based unless set". The managing-releases page does say it is "based on semantic versioning" while the REST page says `created_at`; scout row 14 is incomplete, not wrong.
- Audit figure "26 of 337 ocx bullets name an internal scope": my regex also counted 26 in ocx-mirror, which is plausible for a repo whose last ten releases have many `(release)` and `(spec)` bullets, but the ocx and ocx-mirror equality should be re-checked before the figure is quoted again.
- Other audit figures reproduced: grimoire 5 BREAKING / 5 Migration, indexbot 7 of 10 short bodies (median 78 characters), tag-only counts. Not reproduced: ocx 45 BREAKING lines (44 `**BREAKING**` lines measured on 2026-11-27). The "0 Migration" figure for ocx reproduces.

## Dated facts

Every limit, specification, policy and statistic the rules rely on. "Page date" is the date the source itself states; GitHub Docs pages carry none, so the fetch date 2026-11-27 stands in and is labelled as such. Authority: platform, specification, tool docs, or measurement (this dive, 2026-11-27, commands in findings 2, 3, 5, 8 and in the rules).

| Fact | Source URL | Page date | Authority |
|---|---|---|---|
| Up to 1000 assets per release; each file under 2 GiB; no total-size or bandwidth limit | https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases | none stated (fetched 2026-11-27) | platform |
| Latest is "the most recent non-prerelease, non-draft release, sorted by the `created_at` attribute"; `make_latest` true/false/legacy; drafts and pre-releases cannot be Latest | https://docs.github.com/en/rest/releases/releases | none stated (fetched 2026-11-27) | platform |
| Unset Latest is assigned "based on semantic versioning"; release creation offers pre-release, Latest and per-release Discussion options | https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository | none stated (fetched 2026-11-27) | platform |
| Latest-download URL forms `/releases/latest` and `/releases/latest/download/<asset>`; no selection rule stated | https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases | none stated (fetched 2026-11-27) | platform |
| `.github/release.yml` keys `changelog.exclude.labels`, `exclude.authors`, `categories[]`; `labels: '*'` required for a catch-all | https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes | none stated (fetched 2026-11-27) | platform |
| Immutable releases generally available 2025-10-28; repo or org level; existing releases stay mutable | https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/ | 2025-10-28 | platform |
| Immutable: assets and tag locked after publish; title, notes and flags editable; attestation generated; a deleted immutable release's tag name cannot be reused | https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases | none stated (fetched 2026-11-27) | platform |
| `gh release verify TAG` and `gh release verify-asset TAG FILE`; `gh release view --json` exposes `isImmutable` (gh 2.105.0, released 2026-11-17 per `gh --version`) | https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release | none stated (fetched 2026-11-27) | platform; the field list is a local measurement |
| Watchers choose Custom > Releases; recipients for pre-releases and drafts not documented; mobile push excludes releases | https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications | none stated (fetched 2026-11-27) | platform |
| Keep a Changelog 1.1.0 types, ISO 8601 dates, `[YANKED]`; "Using commit log diffs as changelogs is a bad idea" | https://keepachangelog.com/en/1.1.0/ | version 1.1.0 (page's newest changelog entry 1.1.2, 2024-09-27) | specification |
| Conventional Commits 1.0.0: `!` and `BREAKING CHANGE:` footer | https://www.conventionalcommits.org/en/v1.0.0/ | version 1.0.0 | specification |
| SemVer 2.0.0: pre-release lower precedence; major zero unstable | https://semver.org/spec/v2.0.0.html | version 2.0.0 | specification |
| git-cliff: `commit_parsers`, `skip`, `protect_breaking_commits`, `tag_pattern`; no scope-skip option | https://git-cliff.org/docs/configuration/git | none stated (fetched 2026-11-27) | tool docs |
| dist: `create-release`, `github-release` (announce stage), `package.changelog`, `display`, `display-name` | https://axodotdev.github.io/cargo-dist/book/reference/config.html | none stated (fetched 2026-11-27) | tool docs |
| dist 0.32.0: matched changelog section becomes the body under `## Release Notes`; no match leaves title = tag, no notes | https://docs.rs/crate/cargo-dist/0.32.0/source/src/announce.rs | dist version 0.32.0 (fleet pins 0.33.0) | tool source |
| 5 of 12 exemplar CLIs publish 10 of 10 sampled releases as immutable; 0 of 120 exemplar releases link a Discussion | `gh api "repos/$r/releases?per_page=10"` over the 12 repos of finding 3 | 2026-11-27 | measurement (REST fields `immutable`, `discussion_url`) |
| Fleet: 0 of 89 sampled bodies open with a prose summary; ocx 44 `**BREAKING**` lines, 0 Migration; grimoire 5 and 5; 65 Release-less tags in 7 repos; grimoire 0 of 34 immutable | commands in findings 2 and 5 | 2026-11-27 | measurement |

No vendor-statistics (adoption, download-count or engagement numbers) are used in any rule. Whether GitHub download counts may be reported was not sourced (owner table).

## Normative guidance candidates

Rules numbered GH-REL-n for cross-reference. Severity words per the commission.

1. **GH-REL-1 (MUST).** Every repository that publishes versioned artifacts MUST announce each version as a GitHub Release whose body is the user-facing changelog, and MUST NOT leave a release body empty or consisting only of a compare link. Rationale: the Release is the repository's release page ([About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)) and the only announcement channel the fleet has; indexbot ships 7 of 10 bodies as one 78-character `**Full Changelog**` line. Verify (tested on indexbot v0.6.3: prints 284 and fails the heading test): `gh release view TAG --json body -q .body | wc -c` is at least 200, and `gh release view TAG --json body -q .body | grep -cE '^#{2,3} '` is at least 1. Fail example: `**Full Changelog**: https://github.com/ocx-sh/indexbot/compare/v0.6.2...v0.6.3`.
2. **GH-REL-2 (SHOULD).** The body SHOULD open with one plain sentence stating what changed for the reader (what they can now do or must now do), before any heading. Rationale: 0 of 89 fleet bodies do (measured); mise does ([jdx/mise releases](https://github.com/jdx/mise/releases), read 2026-11-27). Verify: reading heuristic. Pass: "Cached tasks can now run in an experimental Linux sandbox." (mise v2026.11.14). Fail: "## [0.6.8] - 2026-11-15" followed by one bullet "Cascade repair points ...". Machine check (run over the 89 saved bodies, it flagged only the 10 website install-pointer lines and passed none as prose): first non-blank line does not start with `#`, `-`, `*`, `>`, `<`, `[`, `**` or a backtick. The 10 website lines are a false positive of the machine check (a pointer, not a summary); hand review stays the verdict.
3. **GH-REL-3 (MUST).** Body section order MUST be: summary sentence, Breaking, then Keep a Changelog types (Added, Changed, Deprecated, Removed, Fixed, Security) in that order, then a docs link. Empty sections omitted. A single wrapper heading `Release Notes` above all of them is allowed because dist emits it ([dist 0.32.0 announce.rs](https://docs.rs/crate/cargo-dist/0.32.0/source/src/announce.rs)). Rationale: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) type set; Breaking first because it is what changes a reader's action (just 1.59.0 leads with "### Breaking"). Today grimoire marks breaking entries inline (`**BREAKING**` inside `### Added`), so reaching this rule needs a template change. Verify: `grep -nE '^#{2,3} '` on the body returns headings only from {Release Notes, Breaking, Added, Changed, Deprecated, Removed, Fixed, Security} in the stated relative order; "Release", "Chore", "Miscellaneous", "What's Changed", "Documentation" fail (grimoire v0.17.0 has a `### Documentation` section and fails this check as of 2026-11-27).
4. **GH-REL-4 (MUST).** Every Breaking entry (a line carrying `**BREAKING**`) MUST be followed, as the next non-blank line, by a `**Migration:**` bullet (sibling or indented) stating the action a user takes, or `**Migration:** none required` plus a reason. Rationale: ocx 0 of 44, ocx-mirror 0 of 3, rules_ocx 0 of 2, grimoire 5 of 5 (measured 2026-11-27). Verify with this script, saved as `chk.sh` and run as `gh release view TAG --json body -q .body | ./chk.sh` (one output line per violation; no output is a pass): `awk 'function flush(){ if(pend){print "MISSING Migration after: " pend; pend=""} } /^[[:space:]]*$/ {next} { if(pend){ if($0 ~ /^[[:space:]]*[-*] \*\*Migration:?\*\*/){pend=""; next} else {flush()} } } /\*\*BREAKING\*\*/ {pend=$0} END{flush()}'`. Tested 2026-11-27 on five fixtures (breaking + indented migration: 0 violations; breaking + sibling migration: 0; breaking + other bullet: 1; breaking as last line: 1; breaking + blank + migration: 0) and on the 89 saved bodies: ocx 44 violations of 44, ocx-mirror 3 of 3, rules_ocx 2 of 2, grimoire 0 of 5. A first draft that required an indented sub-bullet flagged grimoire's 5 sibling-bullet Migration lines falsely; the sibling form is accepted.
5. **GH-REL-5 (MUST).** A breaking commit MUST carry a `BREAKING CHANGE:` footer ([Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)) whose text is the migration instruction, and the generator template MUST render it as the Migration bullet. Rationale: grimoire's `cliff.toml` lines 27-30 do this already (5 of 5); ocx's template does not. Verify: `grep -n 'breaking_description' cliff.toml` finds the Migration render branch; in the last 5 commits with `!` or a `BREAKING CHANGE` footer, `git log -1 --format=%B <sha> | grep -E '^BREAKING[ -]CHANGE: '` matches. Depends on the existing catalog Conventional Commits rules; proposes no new commit rule.
6. **GH-REL-6 (MUST).** The release generator MUST skip internal-only entries (scopes `test`, `ci`, `deps`, `release`, `claude`, `spec`, `artifacts` and types `chore`, `ci`, `style`, `test`, `build`) and MUST set `protect_breaking_commits = true`. Rationale: ocx 26 bullets with internal scopes; ocx-mirror shows `(claude)`, `(artifacts)`, `### Release - V0.6.8`; a breaking commit under an internal scope must still surface ([git-cliff docs](https://git-cliff.org/docs/configuration/git)). Verify: `grep -nE 'skip *= *true' cliff.toml` lists a parser for each internal type and the scope regex; `grep -n protect_breaking_commits cliff.toml` is `true`; last 10 release bodies return 0 for `grep -cE '\((test|ci|deps|release|claude)\)'`.
7. **GH-REL-7 (MUST).** The generator's `footer` and reference-link lines MUST NOT appear in the posted GitHub Release body. Rationale: ocx v0.6.8 body ends with a bare `[0.6.8]: https://github.com/...compare/...` line. Verify: `gh release view TAG --json body -q .body | grep -E '^\[[0-9][^]]*\]: https?://'` returns nothing.
8. **GH-REL-8 (SHOULD).** Release bodies SHOULD NOT contain commit-hash links, `by @author in <url>` attributions, or raw PR titles; use the same prose as the changelog. Rationale: www-setup bodies embed hash links; website bodies are default GitHub "What's Changed" output with `feat(nav):` prefixes ([generated notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)). Verify (tested over the saved bodies: 53 hash-link lines in www-setup, 24 attribution lines in website): `grep -cE '\[[0-9a-f]{7,40}\]\(https://github\.com/[^)]*/commit/'` and `grep -cE ' by @[A-Za-z0-9-]+ in https://'` over the body; both 0.
9. **GH-REL-9 (MUST).** A repository whose release body is GitHub-generated (no git-cliff or dist body; website today) MUST carry `.github/release.yml` with `changelog.exclude.labels` for noise and a `*` catch-all category, and the labels referenced MUST exist. Repositories whose body comes from git-cliff or dist are out of scope of this rule. Rationale: the fleet has no `.github/release.yml` in any of 14 probed repos (re-probed 2026-11-27 for ocx and website: HTTP error both); the docs make `labels: '*'` required for a catch-all ([generated notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)). Verify: `gh api repos/$r/contents/.github/release.yml` exits 0; `yq '.changelog.categories[].labels' .github/release.yml | grep -x '\*'`; each label appears in `gh label list`.
10. **GH-REL-10 (SHOULD).** The body SHOULD link the matching docs page or upgrade guide for any Breaking or Deprecated entry. Rationale: the audit found 0 of 10 ocx bodies link a docs page. Verify: each body with a Breaking entry contains `https://` to the project's docs host (`grep -E 'https://(ocx\.sh|grimoire\.rs)/'`).
11. **GH-REL-11 (MUST).** Every tag cut for a registry artifact or installer MUST have a GitHub Release. There is no file-based exemption: no fleet repo carries one (`grep -rIlF release-policy` over ocx-sh and grimoire-rs finds only this research and unrelated Bazel notes). A repository whose tags are not user-installable can be exempt only by an explicit owner instruction in the current task; an agent proposes, never grants (see the owner table). Rationale: seven fleet repos hold 65 Release-less tags (catalog 16, conventions 16, indexer 29, devcontainer-features 2, ocx-mirror 1, www-setup 1, website 1) and all ship artifacts or an installer. Verify (parity check, tested on ocx-sh/website 2026-11-27: prints `v0.4.0`, the one tag-only entry): `comm -23 <(gh api repos/$r/tags --paginate -q '.[].name' | sort) <(gh release list -R $r -L 1000 --json tagName -q '.[].tagName' | sort)` prints nothing. Backfilling existing old tags is an owner decision.
12. **GH-REL-12 (SHOULD).** A release skill SHOULD run the parity check after each publish: the new tag appears in `gh release list` within the same run. Rationale: it prevents the gap recurring after backfill. Verify: step output shows the tag in `gh release list -R $r -L 1 --json tagName`.
13. **GH-REL-13 (MUST).** The Latest flag MUST point at the highest non-prerelease version after every release. Do not pass `--latest=false` on a normal release; pass `--latest` explicitly only for a backport. Rationale: the docs disagree on how Latest is chosen ([managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) says semantic versioning; [REST releases](https://docs.github.com/en/rest/releases/releases) says most recent non-prerelease by `created_at`) and install scripts hard-link `/releases/latest/download/<asset>` ([linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)). Verify (tested on grimoire-rs/grimoire: both commands print v0.17.0): `gh release list -R $r -L 20 --json tagName,isLatest -q '.[]|select(.isLatest)|.tagName'` prints exactly one tag, and it equals `gh api repos/$r/tags --paginate -q '.[].name' | grep -v '[-]' | sort -V | tail -1`.
14. **GH-REL-14 (MUST).** Every asset name referenced by a documented `/releases/latest/download/<asset>` URL ([linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)) MUST exist in the Latest release. Rationale: install docs break silently when asset names change. Verify (tested: grimoire-installer.sh and grimoire-x86_64-unknown-linux-gnu.tar.gz both print 200): `curl -sIL -o /dev/null -w '%{http_code}' https://github.com/$r/releases/latest/download/<asset>` prints 200 for each name found by `grep -rhoE 'releases/latest/download/[^ )"`]+' README.md docs`. Placeholder names such as `ASSET` in prose are not assets.
15. **GH-REL-15 (MUST).** A release whose version carries a SemVer pre-release identifier (`-rc.1`, `-beta.2`) MUST be created with `--prerelease`; a release without one MUST NOT. Rationale: [SemVer 2.0.0 item 9](https://semver.org/spec/v2.0.0.html) and GitHub's pre-release flag semantics ([REST releases](https://docs.github.com/en/rest/releases/releases): pre-releases cannot be Latest). Verify (tested on grimoire, no mismatch in 20 releases): `gh release list -R $r -L 20 --json tagName,isPrerelease -q '.[]|[.tagName,.isPrerelease]|@tsv'` then `[[ $tag == *-* ]]` equals `isPrerelease`.
16. **GH-REL-16 (SHOULD).** Releases that ship binaries or install scripts SHOULD be created as draft, assets uploaded, then published, and the repository SHOULD enable immutable releases once that workflow is in place ([immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases), GA 2025-10-28 per the [GitHub changelog](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/)). Rationale: assets and tag become tamper-proof with an attestation; fleet 0 of 34 grimoire releases (`isImmutable` is false for v0.17.0); uv, ruff, cli, deno, mise adopt it. Verify: workflow lint: a `--draft` create step precedes `gh release upload`, then a publish step; `gh release verify TAG` ([verifying a release](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release)) exits 0; `gh release view TAG --json isImmutable -q .isImmutable` prints `true` (field exists in gh 2.105.0). Severity SHOULD because adoption burns tag names (owner decision, below). Note: grimoire's dist-generated `release.yml` creates the release and uploads `artifacts/*` in one `gh release create` call; whether that works with immutability on was not tested.
17. **GH-REL-17 (MUST).** A release workflow MUST NOT upload or replace assets after publish when immutable releases are on. Rationale: assets are locked at publish. Verify: no `gh release upload` or `gh release create ... <files>` after a publish step in a workflow with immutability on.
18. **GH-REL-18 (MUST NOT).** An agent MUST NOT claim that publishing a release notifies any set of people beyond "watchers who chose Custom > Releases", and MUST NOT assume pre-releases or drafts notify anyone. Rationale: docs state no recipients (finding 8). Verify: grep release or launch plans for `notif` and require the cited sentence form.
19. **GH-REL-19 (SHOULD NOT).** Do not require a Discussions announcement per release. If the owner opts in for a major release, create it with `gh release create --discussion-category <category>`, and only after confirming the repo has Discussions enabled (`gh api repos/$r -q .has_discussions` is `true`). Rationale: no measured adoption (0 of 120 exemplar releases, 0 of 34 grimoire), no documented benefit. Verify: reading heuristic; the release skill must not contain the flag by default.
20. **GH-REL-20 (MUST).** Version strings agree across tag, release title, changelog heading and registry version: tag `v1.2.3`, title `v1.2.3` or `1.2.3`, changelog `## [1.2.3] - 2026-11-27`, registry `1.2.3`. Rationale: mismatches break "latest" logic and trust (scout row 33). Verify: compare `git describe --tags --abbrev=0`, `gh release list -L 1 --json tagName`, the first `## [` line of `CHANGELOG.md`, and the manifest version in CI; all equal after stripping the leading `v`.
21. **GH-REL-21 (MUST).** Changelog dates MUST be ISO 8601 and a withdrawn release MUST be marked `[YANKED]` in the changelog. Rationale: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Verify (tested: 34 of 34 grimoire `CHANGELOG.md` version headings match): `grep -E '^## \[[0-9.]+\] - [0-9]{4}-[0-9]{2}-[0-9]{2}( \[YANKED\])?$' CHANGELOG.md` matches every `## [` heading.
22. **GH-REL-22 (SHOULD).** Release assets SHOULD stay under 2 GiB each and 1000 per release. Rationale: documented platform limits ([About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)). Verify (tested on grimoire v0.17.0: prints 21 and 13252404): `gh release view TAG --json assets -q '.assets|length, (map(.size)|max)'` returns at most 1000 and 2147483648.

### The release skill's pre-publish check

A release skill step runs, before `gh release create` (or before the publish step of a draft), these checks against the rendered body file `NOTES.md`:

1. Length at least 200 characters and at least one `##` or `###` heading (GH-REL-1).
2. First non-blank line is prose, not a heading, link or version header (GH-REL-2, advisory).
3. Headings subset and order (GH-REL-3).
4. Each `**BREAKING**` line is followed by a `**Migration:**` bullet (GH-REL-4, `chk.sh`).
5. No internal scopes or `### Release` section, no trailing reference-link lines, no hash links (GH-REL-6, 7, 8).
6. A docs link exists when any Breaking or Deprecated entry exists (GH-REL-10).
7. Tag form and `--prerelease` agree (GH-REL-15); `--latest` not passed except for a backport (GH-REL-13).

After publish: tag-to-Release parity (GH-REL-11/12), exactly one Latest equal to the highest stable version (GH-REL-13), Latest download URLs return 200 (GH-REL-14), and `gh release verify TAG` if immutability is on (GH-REL-16).

## What an agent must not decide alone

| Decision | Why it is the owner's |
|---|---|
| Backfill Releases for existing tag-only history (catalog 16, conventions 16, indexer 29, others) | Publishing a Release is public and can notify watchers, whose recipients are undocumented; old tags may need hand-written notes; with immutability on, a backfill is permanent |
| Declare a repository tag-only internal | Business call about who installs it; the agent may propose, not exempt |
| Enable immutable releases on a repo or org | Irreversible per release; a deleted immutable release keeps its tag name locked; changes every release workflow |
| Create a Discussions announcement for a release, or enable Discussions | Starts a moderated public space; the repo owner's community decision |
| Mark a release as Latest manually or as a pre-release | Chooses what every `/releases/latest/download` consumer receives |
| Write the Migration text for a breaking change with unclear user impact | Judgement about compatibility; the agent drafts, the maintainer confirms |
| Cut, edit or delete a published release or tag | Public and, once immutable, permanent |
| Whether to report download counts or other GitHub numbers publicly | Not sourced here; this dive did not fetch GitHub's stated semantics for asset download counts |

## AI-agent angle

Characteristic mistakes and the smallest mechanical check:

| Mistake | Check |
|---|---|
| Runs `gh release view --json isLatest` (does not exist; fails) and then "confirms" Latest from the release's own flags | Use `gh release list --json tagName,isLatest`; assert exactly one true |
| Lets `gh release create --generate-notes` or "What's Changed" stand as the announcement (raw PR titles, `by @user in URL`) | GH-REL-8 grep; require summary and Migration |
| Writes "BREAKING" in the bullet and no migration | GH-REL-4 `chk.sh` (tested) |
| Uploads assets after publish, then finds the tag locked on an immutable repo | GH-REL-17 workflow lint; `gh release verify` |
| Assumes `--latest=false` is needed, or passes it for a backport incorrectly | GH-REL-13: after publish, compare `isLatest` with highest stable tag |
| Assumes the docs promise notification to followers on pre-release | GH-REL-18 |
| Treats a tag push as a release (the tag alone creates no Release page) | GH-REL-11 `comm` parity check |
| Creates the Release before the registry publish finishes, announcing a version users cannot install | Order step: registry publish and `curl` of the registry version precede `gh release create` (reading heuristic; no source fetched) |
| Edits `cliff.toml` in a downstream repo marked "template-owned" | Check the first line for `template-owned`; change `ocx-sh/conventions` and run the stated update task |
| Writes `Added`-style headings inconsistently ("What's New", "Improvements") | GH-REL-3 heading-set grep |
| Treats `--latest` default as semver-only because the managing page says so | REST docs say `created_at`; verify, do not assume |

## Contested / evolving

- Curated vs derived notes. Keep a Changelog: "Changelogs are for humans, not machines" and a commit log diff "is a bad idea" ([source](https://keepachangelog.com/en/1.1.0/)); Conventional Commits builds the case for automatic generation from commit metadata ([source](https://www.conventionalcommits.org/en/v1.0.0/)); GitHub provides generated notes as the default release page ([source](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)). Resolution used here: a generated body is acceptable only with a template that groups, filters and renders migration text, plus a hand-written lead sentence. The exemplar sample is split: uv and ruff publish a generated "Release Notes" heading with PR links; mise writes prose.
- How Latest is chosen. Managing releases: semantic versioning ([source](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)); REST: most recent by `created_at` among non-prerelease, non-draft ([source](https://docs.github.com/en/rest/releases/releases)). Both are platform docs and neither is dated. Trend: unknown; the `legacy` option name suggests the selection logic changed at some point, but no source states when.
- Immutable releases: trend toward adoption by large CLIs (5 of 12 exemplars on all 10 samples) since the 2025-10-28 GA; the cost (permanent tag names, draft-first workflows) means some projects deliberately stay mutable. The sample cannot tell whether the 7 non-adopters decided against it or have not yet looked.
- Discussions per release: GitHub offers the option; the documentation describes nothing about effect; the exemplar sample (0 of 120) suggests low adoption. Absence of adoption is not evidence of low value.
- Summary sentence: mise and hugo lead with prose; uv, ruff, deno and atuin lead with a heading; just leads with Breaking. The convention proposed here is a judgement from the commission ("a summary sentence first"), not an observed standard. SHOULD, not MUST.
- dist (formerly cargo-dist) announcement behaviour: the book describes only "adds relevant release notes from your RELEASES/CHANGELOG"; the 0.32.0 source shows the `## Release Notes` wrapper. The parse rules sit in `axoproject`, unread. dist and git-cliff do not conflict for grimoire: cliff writes `CHANGELOG.md`, dist copies the section.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes | GitHub Docs, release.yml schema | undated, fetched 2026-11-27, platform | `*` catch-all and exclude syntax |
| https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases | GitHub Docs, release limits | undated, fetched 2026-11-27, platform | 1000 assets, 2 GiB limits |
| https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository | GitHub Docs, create release options | undated, fetched 2026-11-27, platform | Latest/pre-release/discussion checkboxes |
| https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases | GitHub Docs, latest URL forms | undated, fetched 2026-11-27, platform | `/releases/latest/download/` |
| https://docs.github.com/en/rest/releases/releases | GitHub REST, releases | undated, fetched 2026-11-27, platform | `make_latest`, `created_at` selection |
| https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases | GitHub Docs, immutable releases | undated, fetched 2026-11-27, platform | what locks and what stays editable |
| https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/ | GitHub changelog | 2025-10-28, platform | GA date and enablement scope |
| https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release | GitHub Docs, verify commands | undated, fetched 2026-11-27, platform | `gh release verify` forms |
| https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications | GitHub Docs, watching | undated, fetched 2026-11-27, platform | Custom > Releases; silent on recipients |
| https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-notifications | GitHub Docs, notification overview | undated, fetched 2026-11-27, platform | delivery channels |
| https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions | GitHub Docs, Discussions | undated, fetched 2026-11-27, platform | admin must enable |
| https://docs.github.com/en/discussions/guides/best-practices-for-community-conversations-on-github | GitHub Docs, Discussions guidance | undated, fetched 2026-11-27, platform | confirms docs say nothing on release announcements (fetched; negative result) |
| https://keepachangelog.com/en/1.1.0/ | Keep a Changelog 1.1.0 | page shows 1.1.0; embedded newest entry 2024-09-27, specification | types, dates, yanked, "not a git log" |
| https://www.conventionalcommits.org/en/v1.0.0/ | Conventional Commits 1.0.0 | 1.0.0, specification | `BREAKING CHANGE:` footer items 11-16 |
| https://semver.org/spec/v2.0.0.html | SemVer 2.0.0 | 2.0.0, specification | pre-release precedence, major zero |
| https://git-cliff.org/docs/configuration/git | git-cliff git config | undated, fetched 2026-11-27, tool docs | `commit_parsers`, `protect_breaking_commits` |
| https://git-cliff.org/docs/configuration/changelog | git-cliff changelog config | undated, fetched 2026-11-27, tool docs | `body`, `footer`, `trim` |
| https://axodotdev.github.io/cargo-dist/book/index.html, https://axodotdev.github.io/cargo-dist/book/reference/config.html, https://docs.rs/crate/cargo-dist/0.32.0/source/src/announce.rs | dist book, config reference, announcement source | undated book; source is dist 0.32.0, fetched 2026-11-27, tool docs | announce step, `create-release`/`github-release`, `## Release Notes` wrapper. The `book/ci/github.html` and `opensource.axo.dev` URLs did not yield content (redirect page; DNS failure) |
| https://github.com/astral-sh/uv/releases, https://github.com/astral-sh/ruff/releases, https://github.com/cli/cli/releases, https://github.com/denoland/deno/releases, https://github.com/jdx/mise/releases | exemplar release pages | read 2026-11-27 via `gh api` | immutable adopters; body shapes |
| https://github.com/casey/just/releases, https://github.com/biomejs/biome/releases, https://github.com/BurntSushi/ripgrep/releases, https://github.com/evanw/esbuild/releases, https://github.com/atuinsh/atuin/releases, https://github.com/gohugoio/hugo/releases, https://github.com/go-task/task/releases | exemplar release pages | read 2026-11-27 via `gh api` | non-immutable comparison set |
| https://registry.npmjs.org/@ocx-sh/catalog | npm registry metadata | 2026-11-27 | proves catalog ships (0.6.5) |
| Fleet repos via `gh api` / `gh release` (ocx-sh/*, grimoire-rs/*) | measurement | 2026-11-27 | commands listed in findings 2, 5, 8 |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md and config-inventory.md | audit | 2026-11 | figures re-checked above |

---
title: Release coverage - which repositories must publish a GitHub Release for every tag
program: product
sub_program: marketing
topic: marketing-release-announcements
worker: release-coverage
date_researched: 2026-11-27
model: sonnet
sources_fetched: 23
scope: >
  Covers which fleet repository classes must have a GitHub Release for every version tag, which are exempt, and the check that flags a tag with no release.
  Measured on the fleet (12 repos) and on 14 upstream repos through the GitHub API. Does not cover release-body content, git-cliff templates, breaking-change wording (sibling workers),
  or cross-channel announcement order (channels territory). Platform doc pages state no date; every one was fetched 2026-11-27.
---

# Release coverage

## Contents

1. Summary
2. Findings (1 fleet measurement, 2 who consumes the tags, 3 upstream practice, 4 platform mechanics, 5 the gap causes)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Re-measured 2026-11-27: the fleet has 4 repos whose tags have no Release at all or mostly none: `ocx-sh/catalog` 16 of 16 tags, `ocx-sh/conventions` 16 of 16, `ocx-sh/devcontainer-features` 2 of 2, `grimoire-rs/indexer` 29 of 41. Three more have one stray tag each (`ocx-mirror` v0.5.3, `website` v0.4.0) or a moving alias (`www-setup` `v0`). The numbers equal distribution-posture.md A7.
- Every one of the four gap repos is a versioned dependency that someone else pins: an npm package (`@ocx-sh/catalog`, pinned `^0.6.5` in `ocx-sh/index` and `0.6.3` in `ocx-sh/e2e-index`), a copier template plus Renovate preset (`ocx-sh/conventions`, 7 fleet repos hold `.copier-answers.yml` with `_src_path` pointing at it), an OCI feature set, and an indexer. They are not "internal tools with tags for bookkeeping".
- Tags are the machine contract and Releases are the human contract. The consumers read tags (copier, `git ls-remote --tags`, Renovate preset `#v0.3.5` refs). None of them needs a Release. The person who gets the update PR or runs `copier update` is the one with no notes.
- Decision: a repo MUST publish a GitHub Release for every stable semver tag when a downstream repo, package manager or user pins, updates to, or auto-updates from that tag. In the fleet that is every repo that tags, today, so `catalog`, `conventions`, `devcontainer-features` and `indexer` are non-compliant.
- Exempt: moving alias tags (`v0`, `v1`, `v1.4`); repos that carry no version tags (`grim-gui`, `grim-mirror`, `e2e-index`, `index`, `grimoire-lore`: 0 tags); tags created before the release workflow existed, listed in an allowlist file; pre-release tags may be Releases marked pre-release, never skipped.
- Upstream, 8 of 10 tag-bearing template and preset repos release every recent tag (newest 10 semver tags, 0 missing). The 2 that do not (`devcontainers/features` 295 tags, `devcontainers/templates` 112 tags, 0 Releases each) use namespaced per-component tags such as `template_alpine_3.1.0`; the fleet does not.
- GitHub says a Release is based on a Git tag and has its own notes; it does not require one per tag ([about releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)). The requirement comes from the consumer, not the platform.
- Renovate builds changelog text from GitHub Releases plus changelog files, so a repo with a `CHANGELOG.md` whose headings carry the version still reaches Renovate PRs ([Renovate changelogs](https://docs.renovatebot.com/key-concepts/changelogs/)). `catalog` and `conventions` have such files. The Release is still the only surface on the repo page and the only thing `releases/latest` can return.
- Without a Release, `releases/latest` answers 404: `gh api repos/ocx-sh/catalog/releases/latest` returned `Not Found` on 2026-11-27. Fleet code already calls `releases/latest` on other repos (`ocx-sh/conventions` `drift/check.py:153`), so adding a consumer of these repos' latest is blocked.
- The check is a 3-line script (finding 6): tags with three numeric components minus published release tags, minus an allowlist; run in the release workflow's last step and on a schedule. The same logic already exists once in the fleet at `ocx-sh/website` `.github/workflows/release.yml:163` (`gh release view "$TAG"`), pinned by `scripts/ci/release.test.ts:78`.
- The gaps are mostly history, not policy: `indexer` has Releases only from v0.5.8 (2026-09-28), after its release workflow was added; its 29 gap tags are v0.1.1 to v0.5.7. A baseline allowlist makes the check green on day one and red for any new gap.
- `catalog` and `conventions` already generate a Keep a Changelog `CHANGELOG.md` with git-cliff on release, so the Release body is a copy, not new writing: `git-cliff --latest --strip header` is the command `www-setup` already uses (`release.yml:43-49`).

## Findings

### 1. Measured gap on the fleet (re-run of A7)

Command (one line per repo, from distribution-posture.md A7, with drafts excluded):

```
gh api "repos/$r/tags?per_page=100" --paginate -q '.[].name' | sort            # tags
gh api "repos/$r/releases?per_page=100" --paginate -q '.[]|select(.draft==false)|.tag_name' | sort   # releases
comm -13 <releases> <tags>                                                     # tags with no release
```

| Repository | Tags | Releases | Tags without release | Which |
|---|---|---|---|---|
| ocx-sh/ocx | 38 | 38 | 0 | |
| grimoire-rs/grimoire | 34 | 34 | 0 | |
| grimoire-rs/grimoire-vscode | 21 | 21 | 0 | |
| ocx-sh/indexbot | 15 | 15 | 0 | |
| ocx-sh/rules_ocx | 9 | 9 | 0 | |
| ocx-sh/ocx-mirror | 15 | 14 | 1 | v0.5.3 (commit "release: v0.5.3", 2026-08-06; v0.5.2 released 2026-08-03, v0.5.4 on 2026-08-14) |
| ocx-sh/website | 12 | 11 | 1 | v0.4.0 (commit "chore(release): @ocx-sh/theme 0.4.0", 2026-11-10; v0.4.1 released the same day) |
| ocx-sh/www-setup | 12 | 11 | 1 | `v0`, a moving major alias force-pushed by `release.yml` ("Update major version tag"); not a version |
| ocx-sh/catalog | 16 | 0 | 16 | v0.1.0 to v0.6.5 |
| ocx-sh/conventions | 16 | 0 | 16 | v0.1.0 to v0.3.6 |
| ocx-sh/devcontainer-features | 2 | 0 | 2 | v1.0.0, v1.0.1 |
| grimoire-rs/indexer | 41 | 12 | 29 | v0.1.1 to v0.5.7; Releases start v0.5.8 on 2026-09-28 |
| grimoire-rs/grim-gui, grim-mirror, ocx-sh/index, e2e-index, grimoire-lore | 0 | 0 | 0 | no tags; nothing to release |

Re-run with the alias filter (`grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+'`, script `release-gap.sh` below) gives 0 for `www-setup`, 1 for `ocx-mirror`, 1 for `website`, 16, 16, 2 and 29. The reported A7 numbers are confirmed; one correction to the prior audit: `www-setup`'s one gap is an alias, not a missed release.

All four large-gap repos are public (`gh api repos/<r> -q .visibility` printed `public`).

### 2. Who consumes the tags of the gap repos

Commands: `git -C <repo> grep -nIE 'ocx-sh/conventions|@ocx-sh/catalog|ghcr.io/ocx-sh' -- ':!.agents'` across every fleet checkout under `/home/mherwig/dev`, plus `grep -rn '"@ocx-sh/catalog"' --include=package.json`.

| Repo | Consumer | Reads | Evidence |
|---|---|---|---|
| conventions | 7 fleet repos running `copier update` | git tags (`_commit: v0.3.5`, `v0.3.6`; two repos sit between tags: `v0.3.1-1-g723b544`, `v0.1.1-2-g8280d8f`) | `.copier-answers.yml` in `ocx`, `ocx-mirror`, `website`, `devcontainer-features`, `rules_ocx`; `_src_path: https://github.com/ocx-sh/conventions.git` |
| conventions | Renovate in `ocx`, `ocx-mirror`, `website`, `rules_ocx`, `devcontainer-features` | preset ref pinned to tag or SHA: `github>ocx-sh/conventions//renovate/default#v0.3.5` (`ocx-mirror/renovate.json`) | the preset is the only thing Renovate sees of this repo; Renovate shows a "release notes" box only from Releases or a changelog file |
| conventions | `scripts/adopt.sh:19` | `git ls-remote --tags --refs --sort=-v:refname "$src" 'v*'` | latest `v*` tag is the version adopted |
| conventions | `drift/check.py:155` | `gh api repos/ocx-sh/conventions/tags` for `latest_version` | drift check compares fleet to newest tag |
| conventions | `publish.yml:8` | on `tags: ['v*']` publishes the baseline rule and skill to `ghcr.io/ocx-sh/conventions` at the same version | so each tag is also an OCI package version that `grim` users resolve |
| catalog | `ocx-sh/index` (`"@ocx-sh/catalog": "^0.6.5"`), `ocx-sh/e2e-index` (`"0.6.3"`) | npm registry version, not git tag | `package.json:6` in both; `release.yml` publishes on `tags: v*` with npm provenance |
| devcontainer-features | devcontainer users: `ghcr.io/ocx-sh/devcontainer-features/ocx:1` | OCI tag, produced by the same tag | `README.md:16`; `release.yml` header says "detect -> prepare -> test -> publish (commit, tag, ghcr.io, verify)" |
| indexer | no fleet pin found | its own `release.yml:79` runs `gh release create "$TAG" --verify-tag` | the workflow was added after v0.5.7, so the 29 older tags predate any release lane |

Reading: every gap repo emits a version a person or bot upgrades to. For `conventions` the upgrade is a copier merge into seven repos' template-owned files, so a breaking change lands without a sentence of explanation unless the reader opens `CHANGELOG.md`. Release notes exist in `CHANGELOG.md` (`catalog/CHANGELOG.md` headings `## [0.6.5] - 2026-11-23`; `conventions/CHANGELOG.md` `## [0.2.2] - 2026-10-22`; both git-cliff, `cliff.toml` present) and only the copy to the Release is missing.

Repos with 0 tags (`grim-gui`, `grim-mirror`, `index`, `e2e-index`, `grimoire-lore`): `grim-mirror` README line 10 says "Source only, no releases" (exemplar-readmes.md:180). No downstream pins a version, so there is nothing a Release would announce.

### 3. Upstream practice, 10 tag-bearing repos that are not products

Method: for each repo, `gh api repos/<r>/tags --paginate` and `gh api repos/<r>/releases --paginate` (drafts excluded), then the newest 10 semver-shaped tags (`sort -V | tail -10`) compared with release tags. Run 2026-11-27. Repos are templates, hook sets, presets or config bases. All data is the GitHub API of the repo itself (platform data).

| Repo | Class | Tags | Releases | Tags without release (all time) | Newest 10 semver tags without release |
|---|---|---|---|---|---|
| [pre-commit/pre-commit-hooks](https://github.com/pre-commit/pre-commit-hooks) | hook set, consumed by tag `rev:` | 56 | 36 | 20 | 0 |
| [astral-sh/ruff-pre-commit](https://github.com/astral-sh/ruff-pre-commit) | hook mirror, consumed by tag | 432 | 184 | 248 | 0 |
| [scientific-python/cookie](https://github.com/scientific-python/cookie) | copier/cookiecutter template | 28 | 28 | 0 | 0 |
| [pawamoy/copier-uv](https://github.com/pawamoy/copier-uv) | copier template | 93 | 92 | 1 | 0 |
| [cookiecutter/cookiecutter-django](https://github.com/cookiecutter/cookiecutter-django) | cookiecutter template | 916 | 889 | 27 | 0 |
| [cjolowicz/cookiecutter-hypermodern-python](https://github.com/cjolowicz/cookiecutter-hypermodern-python) | template, dormant (newest tag 2022.6.3) | 23 | 20 | 3 | 0 |
| [sindresorhus/tsconfig](https://github.com/sindresorhus/tsconfig) | tsconfig base, npm | 26 | 22 | 4 (v0.1.0, v0.1.1, v0.2.0, v5.1.1) | 0 (1 in the first, unsorted run was an ordering artefact) |
| [copier-org/copier-templates-extensions](https://github.com/copier-org/copier-templates-extensions) | extension | 8 | 4 | 4 (0.1.0 to 0.3.0) | 0 |
| [devcontainers/features](https://github.com/devcontainers/features) | feature monorepo, OCI | 295 | 0 | 295 (tags like `feature_terraform_1.5.1`) | not applicable: no semver tags, per-feature namespaced |
| [devcontainers/templates](https://github.com/devcontainers/templates) | template monorepo, OCI | 112 | 0 | 112 (tags like `template_alpine_3.1.0`) | not applicable |

Four more upstream non-products carry no tags at all, so there is no tag to release: [tsconfig/bases](https://github.com/tsconfig/bases), [actions/starter-workflows](https://github.com/actions/starter-workflows), [github/gitignore](https://github.com/github/gitignore), [pypa/sampleproject](https://github.com/pypa/sampleproject) (tags=0, releases=0). [renovatebot/presets](https://github.com/renovatebot/presets) is archived with 0 tags.

Reading:

1. Single-version repos that others pin by tag release every tag in the recent window (8 of 8). The gaps they have are early-history tags (`0.1.0` to `0.3.0`, `ruff-pre-commit`'s older mirror tags) from before the habit, which is the shape of `indexer` here.
2. The only tags-only repos are monorepos with per-component namespaced tags (`feature_<name>_<ver>`). A Release per component tag would bury the Releases page, so GitHub Releases are not used and the registry carries the version. `ocx-sh/devcontainer-features` is not in that class: it tags one version `v1.0.1` for the whole set.
3. No upstream non-product repo with a plain `vX.Y.Z` or CalVer tag and active development stops releasing. That is the strongest signal for the fleet rule.

Limit of this sample: 10 repos are not a census, they were picked as the commission asks (templates, presets, config bases, hooks), and "newest 10 semver tags" ignores pre-release naming.

### 4. Platform mechanics that matter for coverage

- A Release is built on a tag and has its own date; both exist independently. "Releases are based on Git tags, which mark a specific point in your repository's history ... A tag date may be different than a release date" ([About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), platform, fetched 2026-11-27, no date on page). GitHub states no tag-per-release requirement.
- `https://github.com/<owner>/<repo>/releases/latest` is the stable link to the latest release ([Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases), platform). The page does not say how pre-releases or drafts behave.
- REST: "The latest release is the most recent non-prerelease, non-draft release, sorted by the `created_at` attribute", where `created_at` "is the date of the commit used for the release" ([REST releases](https://docs.github.com/en/rest/releases/releases#get-the-latest-release), platform). A repo with tags only returns 404 (measured: `gh api repos/ocx-sh/catalog/releases/latest` printed `Not Found`, HTTP 404, 2026-11-27). A consumer that calls `releases/latest` on a tags-only repo breaks, so a Release per tag is also the precondition for that call. Fleet rule SH-INST-17 (`.claude/rules/shell-quality/installers.md:110`) already steers installers to the redirect rather than the REST API, so the 404 shows as a failed redirect for these repos.
- Release notes can be hand-written or generated ("Generate release notes", [Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)). A Release can be created from an existing tag (step 4 "To use an existing tag, click the tag"), so backfilling old tags is possible without moving tags.
- Immutable releases lock the tag and assets once a Release is published: "Git tags cannot be moved", assets "cannot be modified or deleted", release notes and latest status stay editable ([Immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases), platform, no date stated on page). The protection applies to a published Release only, so a tag with no Release stays movable. That matters for `conventions`, whose consumers pin `#v0.3.5` in Renovate and `_commit` in copier: a movable tag under a pin is the supply-chain gap.
- Renovate: `github-tags` "allows lookup Git tags"; it does not need Releases ([github-tags datasource](https://docs.renovatebot.com/modules/datasource/github-tags/)). Release notes in PRs come from "Releases" metadata and common changelog file names, filtered to the versions in the PR; for changelog files "the section header should include the version" ([Renovate changelogs](https://docs.renovatebot.com/key-concepts/changelogs/), vendor-neutral tool docs). The page does not say what happens for a tags-only repo with no changelog file; the fleet repos have changelog files, so this is not fully proven for them. Rendered PRs were not inspected.
- copier: "will read all available Git tags, will compare them using PEP 440, and will check out the latest one before updating"; no mention of Releases ([copier updating](https://copier.readthedocs.io/en/stable/updating/)). Consequence for `conventions`: tagging is what releases it to adopters and a Release adds nothing mechanical; it adds the explanation. Also copier compares tags with PEP 440, so an alias tag such as `v0` is ignored or mis-ordered, supporting the alias exemption.

### 5. Why the gaps exist (cause class decides the fix)

| Cause | Repos | Evidence | Fix |
|---|---|---|---|
| No release step in the tag workflow | catalog, conventions, devcontainer-features | `git grep -nE 'gh release|action-gh-release|softprops'` in `.github`, `taskfile.yml`, `taskfiles`, `scripts` returns nothing; their tag workflows publish to npm or ghcr only | add a release job after the publish job |
| Release workflow added late | indexer | first Release v0.5.8 2026-09-28; `release.yml:79` has `gh release create` | allowlist legacy tags; backfill optional |
| Tag not meant as a product release | website v0.4.0 (theme-package bump) | commit subject "chore(release): @ocx-sh/theme 0.4.0" | either release it, or stop pushing a `vX.Y.Z` tag for the sub-package |
| Moving alias | www-setup `v0` | `release.yml` "Update major version tag" runs `git tag -f "$major"` | exempt by pattern |
| Unexplained | ocx-mirror v0.5.3 | no workflow-run history retrievable by tag; neighbours released | flag, then release by hand from the existing tag |

Where a Release workflow exists it already carries the pattern: `ocx-sh/website` `.github/workflows/release.yml:163-168` (`gh release view "$TAG"` guard, then `gh release create "$TAG" --verify-tag --title "$TAG" --generate-notes`); `ocx-sh/www-setup` `release.yml:43-56` (git-cliff `--latest --strip header` into `softprops/action-gh-release`). Neither workflow is for a repo in the gap class, so copying the www-setup pair is the smallest fix.

### 6. The check

Script, tested on all 12 fleet repos 2026-11-27 (outputs match section 1: 0, 1, 0, 0, 0, 16, 16, 2, 1, 0, 29, 0):

```bash
# release-gap.sh <owner/repo> : print every stable semver tag that has no published GitHub Release
r=$1
comm -13 \
  <(gh api "repos/$r/releases?per_page=100" --paginate -q '.[]|select(.draft==false)|.tag_name' | sort) \
  <(gh api "repos/$r/tags?per_page=100" --paginate -q '.[].name' | sort) \
| grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+'
```

Wrong: `gh release list --limit 30` as the release side; it silently truncates (A7 uses `--limit 300`), so a repo with more releases than the limit reports phantom gaps. Right: `--paginate` on the REST list, as above.

Two placements: (a) last step of the release workflow, `gh release view "$GITHUB_REF_NAME" >/dev/null` fails the run when the Release was not created (same as `website`); (b) a scheduled job runs the script above with a baseline file `.github/release-gap-baseline.txt` (legacy tags, one per line, subtracted with `grep -vxFf`), and fails on any output. (a) catches the new tag within the run; (b) catches tags pushed by hand, by other bots, or after a failed release job (a tag pushed by `GITHUB_TOKEN` triggers no other workflow, as the `devcontainer-features` release header notes).

## Normative guidance candidates

1. **MUST: publish one GitHub Release per stable version tag in every repository whose tag is pinned, resolved or auto-updated by a downstream repo, package manager or user.** Rationale: the tag reaches the consumer, the Release is the only place a human reads what changed, and `releases/latest` 404s without it. Verify: `bash release-gap.sh <owner/repo>` prints nothing (after baseline subtraction). Measured now: fails for `catalog`, `conventions`, `devcontainer-features`, `indexer`, `ocx-mirror`, `website`.
2. **MUST: classify a repo as "consumed" when any of these returns a hit: a `.copier-answers.yml` with `_src_path` naming it; a `renovate.json` `extends` entry naming it; a `package.json`, `pyproject.toml`, `Cargo.toml` or `ocx.toml` dependency on its package; a `uses: <owner>/<repo>@` line; a `ghcr.io/<owner>/<repo>` reference.** Rationale: coverage is judged by consumers, not by repo type. Verify: `gh search code "<owner>/<repo>" -L 30` and `git grep -nIE '<owner>/<repo>' -- ':!.agents'` across the fleet checkouts, as in finding 2.
3. **MUST: add the Release step to the same workflow that publishes the artifact (npm, ghcr, crates), after the publish job, with the body generated from `CHANGELOG.md` by `git-cliff --latest --strip header`.** Rationale: one trigger, one version, no hand step; reuses existing git-cliff config. Verify: `git grep -nE 'gh release create|action-gh-release|softprops' -- .github/workflows` returns a hit in the tag-triggered workflow, and its `needs:` includes the publish job.
4. **MUST: fail the release workflow when the Release does not exist at the end of the run.** Rationale: a tag pushed by `GITHUB_TOKEN` or a failed middle job leaves a tag with no Release and nothing flags it. Verify: the workflow ends with `gh release view "$GITHUB_REF_NAME" --repo "$GITHUB_REPOSITORY" >/dev/null`; a test pins it, as `ocx-sh/website` `scripts/ci/release.test.ts:78` does.
5. **MUST: run `release-gap.sh` on a schedule (weekly is enough) in each consumed repo, against a baseline file, and fail on any output.** Rationale: the in-workflow check cannot see a tag pushed outside the workflow. Verify: workflow file exists; `gh workflow run <name>` on a repo with a fake tag `v9.9.9` exits non-zero.
6. **MUST NOT count moving alias tags as version tags.** The check pattern requires three numeric components, so `v0`, `v1`, `v1.4` are ignored. Rationale: GitHub Action and similar repos force-push `v<major>`; copier compares tags with PEP 440. Verify: `echo v0 | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+'` prints nothing.
7. **MAY exempt a repo that has no version tag at all, and MUST start releasing the day its first version tag is pushed.** Rationale: `grim-gui`, `grim-mirror`, `index`, `e2e-index`, `grimoire-lore` have 0 tags; nothing is announced. A repo with no release and no tag must say so in its README ("Source only, no releases", `grim-mirror` README line 10). Verify: `gh api repos/<r>/tags -q length` prints 0 and the README states it (`grep -niE 'no releases|source only' README.md`).
8. **SHOULD list legacy tags that predate the release workflow in `.github/release-gap-baseline.txt`, with the date the lane began as a header comment; backfill is optional.** Rationale: `indexer`'s 29 legacy tags would otherwise keep the check red forever and teach agents to ignore it. Verify: `release-gap.sh` minus the baseline is empty; every baseline line is a tag older than the first Release (`gh release list --limit 1000 --json publishedAt -q 'min_by(.publishedAt)'`).
9. **SHOULD NOT push a `vX.Y.Z` tag for a sub-package or non-product version in a repo that also uses `vX.Y.Z` for its main release.** Rationale: `ocx-sh/website` v0.4.0 is a theme-package bump that looks like a product release and has no Release. Verify: `git tag --list 'v*'` against `gh release list`; use a namespaced tag such as `theme-v0.4.0` for the sub-package. Namespaced tags are then outside the pattern, which matches the upstream monorepo practice in finding 3.
10. **SHOULD enable immutable releases for every consumed repo that pins by tag (`conventions` first).** Rationale: a published immutable Release locks the tag and assets; a tag with no Release can still be moved under a consumer's pin. Verify: repository setting (GitHub "Preventing changes to your releases"); `gh api repos/<r> -q .` does not expose it as of this fetch, so the verification is a reviewer reading the setting. Needs owner approval (below).
11. **SHOULD NOT call `releases/latest` on a repo before the check passes for it.** Rationale: a tags-only repo answers 404. Verify: `gh api repos/<r>/releases/latest -q .tag_name` prints a tag, not `Not Found`.
12. **CONSIDER backfilling Releases for the legacy tags of `conventions` (v0.1.0 to v0.3.6) from `CHANGELOG.md` sections.** Rationale: `copier update` across several versions is the situation where a reader wants the intermediate notes; the content already exists. Verify: `release-gap.sh conventions` prints nothing without the baseline file. Cost is 16 API calls and no tag moves.

## Dated facts

| Fact | Value | Source | Date stated | Authority |
|---|---|---|---|---|
| GitHub Releases are based on Git tags; tag date and release date can differ | quoted | [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) | none on page; fetched 2026-11-27 | platform |
| Link for latest release is `<repo>/releases/latest` | quoted | [Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) | none; fetched 2026-11-27 | platform |
| REST "latest release" = newest non-prerelease, non-draft by `created_at` (commit date) | quoted | [REST releases](https://docs.github.com/en/rest/releases/releases#get-the-latest-release) | none; fetched 2026-11-27 | platform |
| Immutable releases lock tag and assets after publish; notes editable; attestation generated | quoted | [Immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases) | none; fetched 2026-11-27 | platform |
| copier picks the latest tag by PEP 440 | quoted | [copier updating](https://copier.readthedocs.io/en/stable/updating/) | none; fetched 2026-11-27 | tool authority |
| Renovate changelog sources are Releases plus changelog files | paraphrase | [Renovate changelogs](https://docs.renovatebot.com/key-concepts/changelogs/) | none; fetched 2026-11-27 | tool authority |
| Fleet gap counts (16, 16, 2, 29, 1, 1, alias) | measured | `gh api` on 12 repos, finding 1 | 2026-11-27 | platform data, own measurement |
| Upstream counts (10 repos) | measured | `gh api`, finding 3 | 2026-11-27 | platform data, own measurement |
| `gh api repos/ocx-sh/catalog/releases/latest` returns 404 | measured | same command | 2026-11-27 | platform data |
| indexer first Release v0.5.8 | 2026-09-28 | `gh release list -R grimoire-rs/indexer` | 2026-09-28 | platform data |

## What an agent must not decide alone

- Whether to backfill Releases for old tags (public history change, even if tag-safe): ask. Default recommendation: `conventions` yes, `indexer` no.
- Whether to enable immutable releases on a repo (it makes tags and assets permanent and blocks reuse of a deleted release's tag name): ask the owner.
- Which tags are "legacy" for the baseline file: the owner confirms the date the release lane began.
- Whether `website`'s `v0.4.0` and `ocx-mirror`'s `v0.5.3` should be released late, or the tags left: ask; creating a Release on a tag publishes text under the project name.
- Whether a repo that today has no tags should start tagging: that is a versioning-policy decision, not a coverage fix.
- Any Release body text that states a compatibility promise or a deprecation: owner decision (sibling worker covers the wording).

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Treats "tag pushed" as "released"; reports a release done after `git tag` and `git push --tags` | `bash release-gap.sh <r>` after the push; exit non-empty is a failure |
| Uses `gh release list` default (30 rows) to compare with tags and reports a false gap or a false clean | require `--paginate` REST form; grep scripts for `gh release list` without `--limit` |
| Treats an alias tag (`v0`, `v1`) as a missing release and creates a Release for it | tag pattern requires three numeric components |
| Creates a Release by hand with a body written from memory instead of the changelog | body must equal `git-cliff --latest --strip header` output; `diff <(gh release view v1.2.3 --json body -q .body) <(git cliff --tag v1.2.3 --latest --strip header)` |
| Declares a template or preset repo "not a product, no release needed" from its name | consumer grep (rule 2) decides, not the name; copier and Renovate pins are tag consumers |
| Deletes and recreates a tag to "fix" a missing release | forbidden for pinned tags; `gh release create <tag> --verify-tag` uses the existing tag |
| Pushes a release tag with `GITHUB_TOKEN` and assumes the tag-triggered workflow ran | workflow header in `devcontainer-features` says pushes with `GITHUB_TOKEN` trigger no workflows; check `gh run list --workflow release.yml -L 1` |

## Contested / evolving

- **Releases for every tag, or tags only for libraries.** For: pre-commit-hooks, copier-uv, cookiecutter-django, scientific-python/cookie all do it (finding 3), and consumers get notes in Renovate PRs. Against: the Renovate docs list changelog files as a source equal to Releases ([Renovate changelogs](https://docs.renovatebot.com/key-concepts/changelogs/)), and `devcontainers/features` and `templates` publish only tags (295 and 112) with the registry as the version surface. The fleet resolves it by class: single-version repos release; per-component namespaced tags may skip (rule 9). No source measures how many readers open the Releases page versus the changelog file.
- **Immutable releases.** The protection is real but applies after publishing, so it favours releases for pinned tags; the page states no date and no general-availability note, so whether it is default anywhere is unverified here.
- **Renovate on tags-only repos.** The changelog page does not say what happens when there are tags and a changelog file but no Release. Not tested on the fleet's own Renovate PRs.
- **`GITHUB_TOKEN` tag pushes** do not trigger workflows (stated in the fleet's own `devcontainer-features` `release.yml` header, not re-verified against GitHub docs in this pass).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases | GitHub docs, about releases (primary) | undated, fetched 2026-11-27 | tag/release relationship |
| https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases | GitHub docs, latest-release link (primary) | undated | `releases/latest` |
| https://docs.github.com/en/rest/releases/releases#get-the-latest-release | GitHub REST docs (primary) | undated | definition of latest, 404 case |
| https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases | GitHub docs, immutable releases (primary) | undated | tag lock needs a published Release |
| https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository | GitHub docs, managing releases (primary) | undated | create from existing tag, generate notes |
| https://docs.renovatebot.com/key-concepts/changelogs/ | Renovate docs (tool authority) | undated | changelog sources |
| https://docs.renovatebot.com/modules/datasource/github-tags/ | Renovate github-tags datasource (tool authority) | undated | tags need no Release |
| https://docs.renovatebot.com/modules/datasource/github-releases/ | Renovate github-releases datasource (tool authority) | undated | the other datasource; page silent on tags |
| https://copier.readthedocs.io/en/stable/updating/ | copier docs (tool authority) | undated | latest tag by PEP 440 |
| https://github.com/pre-commit/pre-commit-hooks | upstream repo, API data | 2026-11-27 | 56 tags, 36 releases, newest 10 all released |
| https://github.com/astral-sh/ruff-pre-commit | upstream repo, API data | 2026-11-27 | 432 tags, 184 releases |
| https://github.com/scientific-python/cookie | upstream repo, API data | 2026-11-27 | 28 of 28 |
| https://github.com/pawamoy/copier-uv | upstream repo, API data | 2026-11-27 | 92 of 93 |
| https://github.com/cookiecutter/cookiecutter-django | upstream repo, API data | 2026-11-27 | 889 of 916 |
| https://github.com/cjolowicz/cookiecutter-hypermodern-python | upstream repo, API data | 2026-11-27 | dormant template |
| https://github.com/sindresorhus/tsconfig | upstream repo, API data | 2026-11-27 | 22 of 26 |
| https://github.com/copier-org/copier-templates-extensions | upstream repo, API data | 2026-11-27 | early tags unreleased |
| https://github.com/devcontainers/features | upstream repo, API data | 2026-11-27 | 295 tags, 0 releases, namespaced |
| https://github.com/devcontainers/templates | upstream repo, API data | 2026-11-27 | 112 tags, 0 releases, namespaced |
| https://github.com/tsconfig/bases, https://github.com/actions/starter-workflows, https://github.com/github/gitignore, https://github.com/pypa/sampleproject | upstream repos with 0 tags, API data | 2026-11-27 | no tag, no release |
| `/home/mherwig/dev/ocx-sh/conventions` (`scripts/adopt.sh:19`, `drift/check.py:153-156`, `renovate.json`, `publish.yml:8`) | fleet code | read 2026-11-27 | tag consumers |
| `/home/mherwig/dev/ocx-sh/website/.github/workflows/release.yml:163`, `/home/mherwig/dev/ocx-sh/www-setup/.github/workflows/release.yml:43-56` | fleet code | read 2026-11-27 | existing release-step patterns |
| `.agents/research/product-audit/distribution-posture.md` (A7, lines 62, 274, 287, 420-427), `exemplar-readmes.md:180` | prior fleet audit | 2026-11 | baseline numbers |

Limits on sourcing: the marketing-topic-map scout files were not opened beyond the rows the commission names (none of them held release-coverage rows; the commission's starting rows are the audit files above). The GitHub docs pages state no publication date.

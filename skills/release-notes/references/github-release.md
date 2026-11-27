---
title: The GitHub Release object
summary: The rows for tag-to-Release coverage, the Latest flag, pre-release flags, asset names behind download links, draft-first immutable releases, one version string and notification claims
---

# The GitHub Release object

Owns what exists on GitHub after a tag: one Release per stable tag, the Latest
flag, the pre-release flag, the asset names that installers fetch, the
draft-first order that immutable releases require, one version string across
tag, title, changelog and registry, the route when a repository forbids editing
the changelog, and what a release may claim about notifications. The body of the
Release is `notes-template.md`. Building, signing and uploading the binaries is
the language release skills.

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[Rules](#rules) · [Verification details](#verification-details) ·
[Unverified](#unverified) · [What agents get wrong here](#what-agents-get-wrong-here)

## Dates and versions

GitHub Docs pages carry no date. The date given is the fetch date, 2026-11-27.

| Fact | Source | Re-check | Interval |
|---|---|---|---|
| A Release is separate from its tag. `releases/latest` returns 404 on a tags-only repository | [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) | `gh api "repos/$REPO/releases/latest"` on a tags-only repository | 12 months |
| copier picks the latest tag by PEP 440. Renovate reads Releases and changelog files | [copier](https://copier.readthedocs.io/en/stable/updating/), [Renovate](https://docs.renovatebot.com/key-concepts/changelogs/) | Re-read both pages | 12 months |
| Latest selection: "based on semantic versioning" in one page, the most recent non-prerelease by `created_at` in the other. | [managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository), [REST releases](https://docs.github.com/en/rest/releases/releases) | Re-read both pages, and test a backport on a scratch repository | 6 months |
| `/releases/latest/download/ASSET` is the stable download URL | [Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) | Re-read | 12 months |
| Immutable releases: after publishing, assets and tag are locked, and a deleted immutable release keeps its tag name locked permanently. Generally available 2025-10-28 | [immutable releases](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases), [changelog](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/), [verifying](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release) | Re-read. `gh release verify` on a repository once immutability is on | 12 months |
| Pre-releases have lower precedence and cannot be Latest | [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) item 9, [REST releases](https://docs.github.com/en/rest/releases/releases) | Re-read | 12 months |
| Notifications go only to watchers who chose Custom > Releases. The docs name no recipients for drafts or pre-releases | [configuring notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications) | Re-read | 12 months |

## Variables

`REPO` is `owner/repo`, `TAG` the tag, `PKG` the registry package name, `UA` a
descriptive client name, `CHECKS` is the `checks/` directory next to the skill's `SKILL.md` (the install path varies by client), and
`DRAFT` is a plan or post file. The two input files of `release_gap.py` come from
the commands in block MKT-REL-11.

## Rules

Severity comes from the consolidated ruleset on 2026-11-27. When a Verification
cell lists several checks, the rule passes only when every check passes.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-REL-11 | Publish one GitHub Release for every stable `vX.Y.Z` tag in every repository whose tag a downstream repository, package manager or user pins, resolves or auto-updates from. Create it in the workflow that publishes the artifact, after the publish job, and end that workflow with `gh release view "$TAG"`. Classify a repository as consumed by grepping its consumers, not by its name. | In four measured repositories 16 of 16, 16 of 16, 2 of 2 and 29 of 41 tags had no Release, and every one was pinned (copier source, Renovate preset, npm range, container-image feature references). 8 of 8 single-version upstream template and preset repositories release every recent tag. | see block MKT-REL-11. The workflow ends with `git grep -n -F -e 'gh release view' -- .github/workflows` | MUST |
| MKT-REL-12 | When a repository rule forbids editing `CHANGELOG.md`, the same rule names the route: the subject is the entry, and the `BREAKING CHANGE:`, `Deprecated:` and `Changelog:` trailers carry the rest. Delete any sentence saying the commit body is never read once the template reads footers. | A repository file said "renders one bullet per commit from its subject line alone — the body is never read". An agent that follows it never writes a migration footer, and MKT-REL-03 renders nothing. A contract ledger does not fill the gap: one measured ADR says the ledger adds no migration prose and that users learn about a break from the changelog through the commit subject. | see block MKT-REL-12. Measured 2026-11-27: it printed an agent-instruction file in two of five repositories and nothing in three | MUST |
| CH-GH-07 | After every publish, exactly one release is Latest, and it is the highest stable version. The workflow derives the flag. It passes `--latest` (`make_latest: true`) only when the new tag is the highest stable tag, and `--latest=false` for a backport. It never hard-codes either value for all stable releases. | GitHub's pages disagree on the default (Dates and versions). Install scripts follow `/releases/latest/download/ASSET`. Two measured workflows hard-code the flag for every stable release, so the first backport would take Latest from the newest release. | see block CH-GH-07. Pass needs all three checks: one Latest tag, that tag equal to the highest stable tag, and the workflow lint. Use `gh release list` here, because `gh release view --json isLatest` does not exist | MUST |
| CH-GH-08 | Every asset name in a documented `/releases/latest/download/ASSET` URL exists in the Latest release. Check this after each publish. | A renamed asset breaks every installer silently. | see block CH-GH-08. Placeholder names such as `ASSET` are skipped | MUST |
| CH-GH-09 | Create a release with `--prerelease` exactly when its version carries a SemVer pre-release identifier (`-rc.1`, `-beta.2`). | Pre-releases have lower precedence and cannot be Latest. Kept for the lint only: a competent model already maps a SemVer pre-release to `--prerelease`. | `python3 -I "$CHECKS"/release_gap.py` prints no CH-GH-09 line. By hand: see block CH-GH-09 | SHOULD |
| CH-GH-10 | In a repository with immutable releases on, create the release as a draft, upload every asset, then publish. Never upload or replace an asset after publishing, and never delete and re-push a published tag. Make a workflow draft-first before asking the owner to turn immutability on. | After publishing, the assets and the tag are locked, and a deleted immutable release keeps its tag name locked permanently. Generally available 2025-10-28. | Workflow lint, reading heuristic, see block CH-GH-10: a draft create comes before any upload, and a separate publish step comes last. No `gh release upload` comes after publishing. After publishing, `gh release verify "$TAG"` exits 0 and `gh release view "$TAG" --json isImmutable -q .isImmutable` prints `true`. Before immutability is on, pass needs the two lint checks. After it is on, pass also needs both post-publish checks | MUST |
| CH-GH-11 | Keep one version string across the tag, the release title, the changelog heading and the registry version, after stripping a leading `v`. Read the published version from the registry, not from the checked-in manifest. | A mismatch breaks Latest logic and installer pins. One measured package manifest said 0.6.0 while npm served 0.7.0. | see block CH-GH-11. The values must be equal | MUST |
| CH-GH-12 | Never claim that publishing a release notifies anyone beyond watchers who chose Custom > Releases. The only allowed claim is this exact sentence: `Publishing a release notifies only watchers who chose Custom > Releases.` Make no claim at all for drafts or pre-releases. Add no per-release Discussions thread unless the owner asks for one on a named release and the repository has `has_discussions` true. | The notification docs name only watchers who chose Custom > Releases, and state no recipients for drafts or pre-releases. 0 of 120 measured upstream releases link a Discussion. | see block CH-GH-12. Three checks, all must pass | MUST |

MKT-REL-17 is retired and CH-GH-29 is retired. Neither number is reused.

## Verification details

```sh
# MKT-REL-11: collect, then compare. Alias tags such as v0 never match the three-component pattern
gh api "repos/$REPO/tags" --paginate -q '.[].name' > tags.txt
gh release list -R "$REPO" -L 1000 --json tagName,isLatest,isPrerelease,isDraft > releases.json
python3 -I "$CHECKS"/release_gap.py --tags tags.txt --releases releases.json --baseline .github/release-gap-baseline.txt   # a missing baseline file counts as empty
# consumer check, across checkouts: who pins this repository
git grep -n -I -E -e "$REPO"
```

Use `--paginate` and `-L 1000`. `gh release list` returns 30 rows by default,
and a short list reports a false gap or a false clean. The baseline file lists
legacy tags that will never get a Release, one per line. Run the script in the
release workflow and weekly. To fix a missing Release, run
`gh release create "$TAG" --verify-tag` on the existing tag. Never delete and
re-push a pinned tag.

```sh
# MKT-REL-12: any output is the finding (the first lists files that forbid editing but name no footer route)
git grep -l -z -i -E -e '(never|not)[^.]{0,40}(edit|write|touch|hand)[^.]{0,40}CHANGELOG' -- AGENTS.md CLAUDE.md '.claude/rules/*.md' \
  | xargs -0 -r grep -L -e 'BREAKING CHANGE' --
git grep -n -F -e 'body is never read' -- AGENTS.md CLAUDE.md
```

```sh
# CH-GH-07: the first prints one tag, the second prints the highest stable tag; they must be equal
gh release list -R "$REPO" -L 20 --json tagName,isLatest -q '.[]|select(.isLatest)|.tagName'
gh api "repos/$REPO/tags" --paginate -q '.[].name' | grep -E -e '^v?[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1
# workflow lint, reading heuristic: each value comes from a version comparison, not a constant in the stable branch
git grep -n -E -e '--latest|make_latest' -- '.github/workflows/*.yml'
```

`release_gap.py` runs the first two checks from saved files and prints a
CH-GH-07 line when they disagree.

```sh
# CH-GH-08: the asset names the docs promise, then one request per name; each must print 200
git grep -h -o -E -e 'releases/latest/download/[A-Za-z0-9._-]+' -- README.md ':(glob)docs/**' ':(glob)site/**'
curl -s -I -L -o /dev/null -w '%{http_code}' "https://github.com/$REPO/releases/latest/download/$ASSET"
```

`release_gap.py --assets assets.json --docs README.md` does the same offline,
with `assets.json` from `gh release view "$LATEST" --json assets`. It skips an
all-upper-case name such as `ASSET`.

```sh
# CH-GH-09: the test [[ $tag == *-* ]] must equal isPrerelease on every row
gh release list -R "$REPO" -L 20 --json tagName,isPrerelease -q '.[]|[.tagName,.isPrerelease]|@tsv'
```

```sh
# CH-GH-10: reading heuristic. Line numbers show the order: draft create, uploads, then a separate publish
git grep -n -E -e 'gh release (create|upload|edit)|draft: *true|--draft|--draft=false' -- '.github/workflows/*.yml'
gh release verify "$TAG"
gh release view "$TAG" --json isImmutable -q .isImmutable
```

```sh
# CH-GH-11: all four values must be equal after stripping a leading v
git describe --tags --abbrev=0
gh release list -R "$REPO" -L 1 --json tagName -q '.[0].tagName'
grep -F -e '## [' CHANGELOG.md | head -1
curl -s "https://registry.npmjs.org/$PKG/latest" | jq -r .version
curl -s "https://pypi.org/pypi/$PKG/json" | jq -r .info.version
curl -s -A "$UA" "https://crates.io/api/v1/crates/$PKG" | jq -r .crate.max_version
```

```sh
# CH-GH-12 check 1 (and 2, for a draft or pre-release plan): any output is the finding
grep -n -i -E -e 'notif|followers will|everyone watching' "$DRAFT" | grep -v -F -e 'Publishing a release notifies only watchers who chose Custom > Releases.'
# CH-GH-12 check 3: empty, unless the owner approved a thread for a named release
git grep -n -E -e 'discussion-category|discussion_category_name' -- '.github/workflows/*.yml'
```

## Unverified

Documented gaps, not rules.

- How Latest resolves when a backport is published after a higher version with
  no flag, because the two GitHub pages disagree. Untested; this is why the
  workflow derives the flag and checks the result.
- Whether a single `gh release create ... assets` call succeeds with immutable
  releases on. Untested; CH-GH-10 asks for draft-first anyway.
- Immutability needs the owner's decision. An agent makes the workflow
  draft-first and never turns the setting on.

## What agents get wrong here

| Mistake | Caught by |
|---|---|
| Reports "released" after `git push --tags`, or judges a template or preset repository "not a product" | MKT-REL-11 |
| Compares tags with `gh release list` at its default of 30 rows | MKT-REL-11 (`-L 1000`, `--paginate`) |
| Deletes and re-pushes a pinned tag to "fix" a missing Release | MKT-REL-11, CH-GH-10 |
| Hard-codes `--latest` or `make_latest: true` | CH-GH-07 |
| Runs `gh release view --json isLatest`, which fails, then "confirms" Latest some other way | CH-GH-07 |
| Renames an asset and breaks `/releases/latest/download/ASSET` | CH-GH-08 |
| Uploads assets after publishing on an immutable repository | CH-GH-10 |
| Reads the version from a checked-in manifest that CI bumps at publish time | CH-GH-11 |
| Claims a release "notifies followers", or adds a Discussions thread to every release | CH-GH-12 |
| Follows a rule that says the commit body is never read, so writes no footer | MKT-REL-12 |

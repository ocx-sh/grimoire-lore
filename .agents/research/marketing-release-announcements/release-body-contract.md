---
title: Release body contract for git-cliff and cargo-dist generated GitHub releases
program: product
sub_program: marketing
topic: marketing-release-announcements
worker: release-body-contract
date_researched: 2026-11-27
model: sonnet
sources_fetched: 17
---

# Release body contract

Scope: the text of a GitHub Release body that git-cliff and cargo-dist generate, the commit-subject rules that feed it, the `cliff.toml` template, and how breaking changes and deprecations appear in it. Not covered: the `CHANGELOG.md` file format (docs-quality DOC-TYPE-37..41 own it), GitHub release mechanics (`release.yml` categories, the Latest flag, immutability; owned by the channels sub-program), and announcement venues (blog, social, email).

## Contents

1. Summary
2. Findings (F1 measurements, F2 where the text comes from, F3 hashes, F4 exemplars, F5 models, F6 breaking and deprecation, F7 deliverable decisions)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- The body is the CHANGELOG section for the tag, plus cargo-dist's install block. In the cargo-dist repos the `cliff.toml` template is therefore the release-body contract; fix the template and the body follows.
- The ocx template renders only the first line of each commit and never reads `breaking_description`, so a BREAKING bullet cannot carry a Migration line. Measured: 45 BREAKING bullets, 0 Migration lines in the last 10 ocx bodies.
- The grimoire template already renders `**Migration:**` from the `BREAKING CHANGE:` footer. Measured: 5 of 5 BREAKING bullets carry one. Adopt that template fleet-wide.
- The www-setup hashes are a template choice, not commit text: its `body` appends `([{{ commit.id | truncate(length=7) }}](.../commit/{{ commit.id }}))` to every bullet. Measured 104 hash-shaped words in 10 bodies. They are links, but the visible text is an opaque 7-hex string.
- 7 of 10 indexbot bodies are a single `**Full Changelog**: compare/vA...vB` line. This is GitHub's auto-generated form with nothing curated; it has no user-facing information.
- Zero fleet bodies open with a summary sentence. The upstream CLIs that curate (uv, ruff) open with a dated line and, for breaking releases, a prose paragraph that says who is affected ("We expect most users to be able to upgrade without making changes").
- uv puts every breaking change under a `### Breaking changes` heading with a bold title, what changed, and an opt-out or fix; the heading is the only breaking marker needed. The fleet's inline `**BREAKING**` flag after a bullet gives neither.
- The fleet over-flags breaking: ocx has 34 `type!:` subjects in its last 400 commits and 45 BREAKING bullets over 10 releases (about 4.5 a release), including changes a user would not call breaking. A flag used on every release stops being read.
- Internal scopes leak: 26 (ocx), 30 (ocx-mirror), 15 (grimoire), 3 (indexer), 4 (rules_ocx) bullets of 10 bodies each. The parser skips by type, not by scope, so `fix(test)` and `feat(claude)` pass through.
- Recommended model: grimoire's generated body (summary slot from the annotated tag message, grouped bullets, Migration under each BREAKING) plus a hand-written highlights block only on minor or breaking releases. Do not adopt the "never hand-write" model (vscode) or the "second curated page per release" model (grimoire's `changelog` skill) as the body.
- Commit hashes in the body: drop them. If a reference is wanted, link a pull request number, which a user can open and read.
- A compare-link-only body is a defect. A release with nothing user-facing should not be published as a GitHub Release, or its body must say "No user-facing changes" and name the reason.
- Deprecations have no category in the fleet templates (the parsers map only Added, Changed, Fixed, Documentation). Keep a Changelog says to list deprecations, removals and breaking changes "if you do nothing else"; add `Deprecated`, `Removed`, `Security` groups.
- Release-body length: uv and ruff bodies run 7,200 to 9,600 characters; the fleet's ocx body mean is 4.7 KB. Length is not the defect; the defects are missing orientation and missing migration.

## Findings

### F1. Measurements of the last 10 releases of each fleet repo

Commands (run 2026-11-27, `gh` authenticated):

```bash
for r in ocx-sh/ocx grimoire-rs/grimoire ocx-sh/ocx-mirror ocx-sh/www-setup grimoire-rs/indexer ocx-sh/rules_ocx ocx-sh/website grimoire-rs/grimoire-vscode ocx-sh/indexbot; do
  d=${r//\//__}; mkdir -p $d
  for t in $(gh release list -R $r --limit 10 --json tagName -q '.[].tagName'); do
    gh release view $t -R $r --json body -q .body > $d/$t.md; done; done
# per body f:
grep -v '^\s*$' $f | grep -vc 'Full Changelog'                      # 0 => compare-link-only
grep -v '^\s*$' $f | head -1                                        # first line starts with a letter => prose first line
grep -ci 'BREAKING' $f ; grep -c 'Migration' $f
grep -cE 'https://(grimoire\.rs|ocx\.sh)|\.md#' $f                  # docs link
grep -oE '\b[0-9a-f]{7,40}\b' $f | grep '[0-9]' | grep -c '[a-f]'   # hash-shaped words
grep -cE '^- .*\*?\((test|ci|deps|release|build|chore|lint|taskfile|claude|agents)\)' $f   # internal scope
```

| Repo | Bodies | Compare-link-only | Prose first line | BREAKING | Migration | Docs link | Hash-shaped words | Internal-scope bullets |
|---|---|---|---|---|---|---|---|---|
| ocx-sh/ocx | 10 | 0 | 0 | 45 | 0 | 0 | 0 | 26 |
| grimoire-rs/grimoire | 10 | 0 | 0 | 5 | 5 | 1 | 0 | 15 |
| ocx-sh/ocx-mirror | 10 | 0 | 0 | 3 | 0 | 0 | 0 | 30 |
| ocx-sh/www-setup | 10 | 0 | 0 | 0 | 0 | 0 | 104 | 0 |
| grimoire-rs/indexer | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| ocx-sh/rules_ocx | 9 | 0 | 1 | 2 | 0 | 0 | 0 | 4 |
| ocx-sh/website | 10 | 0 | 10 (a package line) | 0 | 0 | 0 | 0 | 0 |
| grimoire-rs/grimoire-vscode | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ocx-sh/indexbot | 10 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |

Reading: ocx, grimoire, indexbot and www-setup repeat the earlier audit ([distribution-posture.md](../product-audit/distribution-posture.md): 45 and 0, 7 of 10, 9 of 10 with 2 to 26 hash-shaped words). New here: ocx-mirror has 30 internal-scope bullets and 3 BREAKING bullets with 0 Migration; rules_ocx has 2 BREAKING with 0 Migration. "Prose first line" for website is a package-coordinates line (`npm: @ocx-sh/theme@0.1.1 · grim skills: ...`), not a summary of what changed. The one rules_ocx hit is a prose line I did not classify further. The ocx-mirror internal count is a regex hit on trailing `*(scope)*`; examples read in the bodies: "Move the crate-wide env lock into src/test_support.rs *(test)*", "Sync the module map with the new layout *(claude)*".

Commit-side measurement in the ocx clone (`git log --format=%s -n 400 | grep -cE '^[a-z]+(\([^)]*\))?!:'` prints 34; `git log --format=%B -n 400 | grep -c '^BREAKING CHANGE'` prints 5). So 34 subjects are marked breaking with `!`, only 5 of the last 400 commits carry a `BREAKING CHANGE:` footer, and the ocx template could not render those footers even if every one had one.

### F2. Where the body text comes from

| Repo family | Source of the body | Evidence |
|---|---|---|
| ocx, grimoire (cargo-dist) | The version's section of `CHANGELOG.md`, then cargo-dist's install and download blocks | cargo-dist `compute_announcement_changelog` calls `changelog_for_version` on the workspace or package changelog and `announcement_github` pushes `## Release Notes` then the entry, then install and download sections ([announce.rs](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/cargo-dist/src/announce.rs), read 2026-11-27). If no entry is found the code logs "failed to find {version} in workspace changelogs, skipping changelog generation" and the body has no Release Notes section. |
| ocx (extra path) | `git-cliff --unreleased --tag "$GIT_TAG" --strip header` | `ocx-sh/ocx/.github/workflows/release.yml:439` |
| www-setup | `git-cliff --latest --strip header` piped to `softprops/action-gh-release` as `body:` | `ocx-sh/www-setup/.github/workflows/release.yml:44-58` |
| website, indexbot | GitHub's generated notes (`## What's Changed` plus compare link) | body shape in the F1 sample |
| cargo-dist config | `package.changelog` sets the file; with `create-release = true` dist "generate[s] a title/body for it based on your changelog"; no config key accepts free body text, except `create-release = false` where the draft release carries the body | [cargo-dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html), fetched 2026-11-27 |

Consequence: in cargo-dist repos the body cannot be edited by a workflow step without leaving cargo-dist's path. The two levers are the commit subjects (and footers) and the `cliff.toml` template. For a hand-written highlights block the supported routes are the annotated tag message through the template (F7) or `create-release = false` with a draft; the second is a release-mechanics decision that belongs to channels.

GitHub REST `generate_release_notes` is a separate path: "If body is specified, the body will be pre-pended to the automatically generated notes" ([GitHub REST: releases](https://docs.github.com/en/rest/releases/releases), fetched 2026-11-27). That is how website and indexbot get the compare-link form.

### F3. Where the hashes enter the www-setup bodies

Not commit text. The template does it. `ocx-sh/www-setup/cliff.toml` `body` ends each bullet with:

```
{{ " " }}([{{ commit.id | truncate(length=7, end="") }}]({{ self::remote_url() }}/commit/{{ commit.id }}))
```

and prefixes ` by @{{ commit.remote.username }}`. The measured line is `- Bootstrap setup.ocx.sh as installer-script host by @michael-herwig ([1bf221a](https://github.com/ocx-sh/setup.ocx.sh/commit/1bf221af...))`. The count command from the F1 block gives 104 across 10 bodies, 18 8 8 6 6 22 26 0 2 8 per body per [distribution-posture.md](../product-audit/distribution-posture.md).

The `commit.id` field is documented as "the commit hash" ([git-cliff template context](https://git-cliff.org/docs/templating/context), fetched 2026-11-27, page shows git-cliff v2.14.0); `commit.remote` fields (`username`, `pr_author`, `pr_title`, `pr_number`, `pr_labels`) exist when a remote integration returns the commit. So the template can emit `commit.remote.pr_number` as `[#N](.../pull/N)` instead, which is what the upstream CLIs show.

Same template: the repo URL is also written as `ocx-sh/setup.ocx.sh` in rendered links while the repository is `ocx-sh/www-setup` (`[remote.github] repo = "www-setup"`). The rendered link target `github.com/ocx-sh/setup.ocx.sh/commit/...` appears in the measured body; whether it redirects is not checked here. I did not resolve the redirect.

### F4. Exemplar release bodies

Commands: `gh release list -R <repo> --limit 5 --exclude-pre-releases` then `gh release view <tag> -R <repo> --json body,publishedAt`, run 2026-11-27; vendor project data.

| Project | Newest dated | Body size (chars) | Structure | Summary sentence | Breaking section | References | Hashes in body |
|---|---|---|---|---|---|---|---|
| astral-sh/uv | 0.13.10, 2026-11-24 | 7,205 to 9,611 (5 bodies) | `## Release Notes`, `Released on <date>.`, `###` categories (Enhancements, Python, Preview features, Performance, Bug fixes, Documentation, Other changes), `## Install uv X`, download table, attestation block | 1 of 3 patch bodies read (a security advisory line); every minor body read has one | `### Breaking changes` on minors | PR numbers as links | 0 |
| astral-sh/ruff | 0.17.6, 2026-11-19 | 6,858 to 9,558 | same Astral template | not checked per body | none in the 5 patch bodies read | PR links | 0 |
| denoland/deno | v2.9.8, 2026-10-21 | 1,052 to 5,853 | one heading, then raw `type(scope): subject (#PR)` lines | no | none in 5 bodies read | `(#36450)` as plain text, not link | 0 |
| oven-sh/bun | bun-v1.4.5, 2026-11-19 | 520 to 2,141 | install snippet, a link to the blog post, contributor list | no; points to the blog | none in the body | none | 0 |
| Linear changelog | 2026-11-12 entry | n/a (web) | one feature post per entry, opening summary sentence, then grouped small changes | yes, 3 of 3 entries | none stated; API behavior changes (HTTP 429 instead of 400) listed as improvements | docs and settings links | n/a |
| Vercel changelog | 2026-11-25 entry | n/a (web) | headline, one summary sentence, one "Learn more" link, named authors | yes, 3 of 3 | none explicit; the 2026-11-25 entry is a billing change for existing Pro teams | one docs link per entry | n/a |

uv's minor releases (0.12.0, 2026-07-28; 0.13.0, 2026-10-09; 0.11.0, 2026-03-23, all `gh release view`) show the breaking-release pattern: an orienting paragraph ("uv 0.13.0 makes Python 3.15 the default stable Python version. We've also included several breaking changes..."), the line "**We expect most users to be able to upgrade without making changes.**", then `### Breaking changes` where every item is a bold title, a before-and-after paragraph, and an opt-out (for example "You can opt out of this behavior by requesting Python 3.14 explicitly, e.g., `uv venv --python 3.14`."). The 0.11.0 body also lists a deprecation inside the breaking section ("`--native-tls` is deprecated in favor of a new `--system-certs` flag") with the old flag still working. Items are linked to the PR (`[#22275](https://github.com/astral-sh/uv/pull/22275)`), never to a bare hash.

deno's body is the commit log verbatim and reads as one. It is the nearest upstream analogue of the ocx model and has the shortest orientation of the five CLIs; the dive did not measure whether this costs deno anything, so it is evidence of existence only.

Linear and Vercel are web changelogs, not GitHub bodies; their lesson is the order: a sentence saying what changed for the user first, a link to detail second, small fixes last. Both pages were read through a model-mediated fetch (summaries, not verbatim). The Linear page carried a line addressed to agents ("connect to an MCP server"); I ignored it as page content.

### F5. The three fleet models, decided

| Model | Where | What it produces | Fails |
|---|---|---|---|
| A. The commit subject is the entry | `ocx-sh/ocx/AGENTS.md:33`: the entry "is the commit subject... the body is never read" | one bullet per commit; scope in italics; `!` becomes `**BREAKING**` | no place for Migration; 45 BREAKING with 0 Migration; internal scopes leak; DOC-TYPE-38 (re-rendered commit log) |
| B. Generated entry with a footer-fed Migration line | `grimoire-rs/grimoire/cliff.toml` | the A bullet plus `**Migration:**` from `BREAKING CHANGE:` footer when it differs from the subject | no summary sentence, no docs link, internal scopes still leak, no Deprecated group |
| C. Never hand-write, generated only | `grimoire-rs/vscode/CLAUDE.md:57-61` | the same as A for the CHANGELOG file | same failures as A; the rule forbids the fix |
| D. Curated page per release on top of generated | `grimoire-rs/grimoire/.claude/skills/changelog/SKILL.md` (`problem → capability → example → link`) | a user-readable page on the site | not the GitHub release body; costs a human or an agent pass per release |

Decision: B is the fleet model for the GitHub release body, with three additions (summary slot, user-facing filter, docs link) in F7. D stays as a site page for minor releases, and the body links it. A and C are replaced. Reason: B is the only model that already makes a breaking entry carry its migration (5 of 5), costs no per-release manual pass for patches, and keeps DOC-TYPE-39 satisfiable by a check. Common Changelog argues against any automation ("Don't take the easy way out with full automation") and against Conventional Commits; see Contested.

### F6. Breaking changes and deprecations in a release body

- Conventional Commits 1.0.0 gives two markers: `!` before the colon, and a `BREAKING CHANGE:` footer. With `!` "the commit description SHALL be used to describe the breaking change", and `BREAKING-CHANGE` is synonymous with `BREAKING CHANGE` ([spec](https://www.conventionalcommits.org/en/v1.0.0/), items 12, 13, 16, fetched 2026-11-27).
- git-cliff exposes `commit.breaking` (true for `!` or a `BREAKING CHANGE:` footer) and `commit.breaking_description` ("the explanation of the breaking change, expected in the `BREAKING CHANGE` footer. If that's missing, the `message` is expected to describe it") ([context](https://git-cliff.org/docs/templating/context)). `protect_breaking_commits = true` keeps a breaking commit from being dropped by a `skip` parser ([git options](https://git-cliff.org/docs/configuration/git)). Neither fleet cliff.toml sets it, so `chore!: ...` is dropped silently from the notes. The ocx and www-setup configs skip `chore` before checking `breaking`; www-setup sets `protect_breaking_commits = false` explicitly.
- Keep a Changelog 1.1.0: "When people upgrade from one version to another, it should be painfully clear when something will break." and "If you do nothing else, list deprecations, removals, and any breaking changes in your changelog." ([keepachangelog.com](https://keepachangelog.com/en/1.1.0/), page undated, version 1.1.0). Common Changelog: prefix with `**Breaking:**` and list breaking changes first in their category ([common-changelog.org](https://common-changelog.org/), undated).
- Upstream practice (uv, F4): heading plus before/after plus opt-out. Reading heuristic for a Migration line: it names what the reader must change, the replacement, and the version or date from which the old form stops working. Pass: grimoire's "`GRIM_RATING_HOST` is removed, and `--token-host` no longer requires `--token-stdin`" says what; "Move support files into a skill and require it from the rule with grim.requires.skills.<name>" says the replacement. Fail: restating the subject ("Ocx update reports which bindings moved...").
- A removal date is a human decision; the machine form for HTTP APIs is RFC 9745 `Deprecation: @<unix>` plus `Link: rel="deprecation"`, with `Sunset` not earlier than `Deprecation` ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html), March 2025). A CLI has no header; the release body is the notice channel, so a `Deprecated` group entry must carry the replacement and the planned removal version.
- Kubernetes and GitHub REST notice windows are in the scout row [lifecycle-email.md](../marketing-topic-map/lifecycle-email.md) #25 (not re-fetched here; I cite them from the scout and rely on them only as examples that a window is stated, never as a number for the fleet).

### F7. Decisions the deliverable requires

**D1. Release-body sections (top to bottom).**

1. A heading with version and ISO date (cargo-dist writes `## Release Notes`; keep it).
2. One summary sentence, fed by the annotated tag message: what a user can now do or must now do, under 30 words, no hype adjective. Absent only on a patch release made of fixes, where it states "Fixes N bugs; no behavior changes you need to act on."
3. For a release with breaking changes: a `### Breaking changes` block first, one item per breaking commit: the subject, then `**Migration:**` from the footer, then a docs link when a page exists.
4. `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`, only those that are non-empty (Keep a Changelog 1.1.0 names; DOC-TYPE-37 already requires the exact spelling).
5. User-facing bullets only: no `test`, `ci`, `deps` (unless user-visible), `release`, `build`, `chore`, `lint`, `taskfile`, `claude`, `agents` scope.
6. A docs link when the release adds or changes a documented command, flag or setting.
7. cargo-dist's install and download blocks stay as generated.

**D2. Commit-subject rules that feed the sections.**

- Subject = `type(scope): imperative user-facing sentence`, written for a reader of release notes, under 72 characters. The scope is a user-facing area (a command, a package kind), never a directory or a tooling name.
- A subject whose change is invisible to a user uses `chore:`, `ci:`, `test:`, `build:` or `style:` (all skipped).
- `!` or `BREAKING CHANGE:` footer only when a user must change something to keep working. The footer holds the Migration text: what to change, replacement, version.
- `deprecate(scope):` or a `Deprecated` footer for deprecations (needs a parser, below).

**D3. `cliff.toml` template changes** (adopt `grimoire-rs/grimoire/cliff.toml` as the base; proposed, not executed because `git-cliff` is not installed on this machine, so syntax is checked only against the documented field names):

```toml
[git]
protect_breaking_commits = true            # a breaking chore!: must not vanish
commit_parsers = [
  { field = "scope", pattern = "^(test|ci|deps|release|build|chore|lint|taskfile|claude|agents)$", skip = true },
  { message = "^feat",     group = "Added" },
  { message = "^fix",      group = "Fixed" },
  { message = "^deprecate", group = "Deprecated" },
  { message = "^remove",   group = "Removed" },
  { message = "^sec",      group = "Security" },
  { message = "^(refactor|perf)", group = "Changed" },
  { message = "^doc",      group = "Documentation" },
  { message = "^(chore|ci|style|test|build|release)", skip = true },
]
```

Order matters in `commit_parsers`; the first match applies unless `continue = true` ([git options](https://git-cliff.org/docs/configuration/git)). Scope-skip precedes group assignment so `fix(test)` is dropped; with `protect_breaking_commits = true` a breaking one survives. The scope matcher uses `field = "scope"` with `pattern` (a bare `scope =` key is an override field, not a matcher); the page documents `field` and `pattern` for any commit context field. Run it before merging.

Body changes: from grimoire's `body`, (a) keep the `**Migration:**` line; (b) add before the groups `{% if message %}{{ message | trim }}{% endif %}` where `message` is the release field "the annotated tag message" ([context](https://git-cliff.org/docs/templating/context)); (c) replace the 7-char hash suffix with `{% if commit.remote.pr_number %} ([#{{ commit.remote.pr_number }}](https://github.com/<owner>/<repo>/pull/{{ commit.remote.pr_number }})){% endif %}` or drop it; (d) render breaking commits in a leading group, filtered by `commit.breaking`.

**D4. Ban on compare-link-only bodies.** A body whose only line is `**Full Changelog**: ...` is invalid. If git-cliff produces no user-facing entries for the tag, either do not cut a GitHub Release for that tag or emit "No user-facing changes." plus the reason (for example "dependency updates only"). 7 of 10 indexbot bodies are this line; the cheapest fix is a cliff template for indexbot and the same rule.

**D5. Rule on hashes.** No hash-shaped word in a body, as visible text. A reference is a pull-request link whose text is `#N`, or nothing. Neither upstream CLI measured prints a hash in the notes (uv, ruff, deno, bun: 0 in 20 bodies read).

**D6. Model adopted.** B with the additions above, and D (a curated page) for minor and breaking releases. A and C are retired.

## Normative guidance candidates

| # | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| RB-1 | Every release body MUST contain at least one user-facing entry or the sentence "No user-facing changes." with a reason; never only a compare link. | A body with no information gives the reader nothing to act on; 7 of 10 indexbot bodies. | `gh release view <tag> --json body -q .body \| grep -v '^\s*$' \| grep -vc 'Full Changelog'` prints a number above 0 | MUST |
| RB-2 | Every BREAKING bullet MUST be followed by a `**Migration:**` line naming what to change, the replacement and the version. | A breaking entry with no migration sends the reader to the diff; ocx 45 of 45 lack one. Same intent as DOC-TYPE-39. | for each `BREAKING` line, the next non-blank line matches `Migration:`; script: `awk '/BREAKING/{b=NR} /Migration:/{if(b==NR-1)ok++} END{print ok, c}'` compared with `grep -c BREAKING`; counts must be equal | MUST |
| RB-3 | A breaking commit MUST carry a `BREAKING CHANGE:` footer holding the migration text, and the template MUST render `commit.breaking_description`. | The ocx template never reads the body, so the footer is dropped. | `git log -n 50 --format=%B \| grep -c '^BREAKING CHANGE'` is at least the count of `!:` subjects (`grep -cE '^[a-z]+(\([^)]*\))?!:'`); `grep -c breaking_description cliff.toml` is at least 1 | MUST |
| RB-4 | The body MUST open with one summary sentence of at most 30 words stating what a user can now do or must do. | Nothing in any fleet body orients the reader; Linear and Vercel entries all open with one; uv's minor releases open with one. | reading heuristic: the first non-heading line is a sentence not starting `-`, `*` or `[`. Pass: "uv 0.13.0 makes Python 3.15 the default stable Python version." Fail: `npm: @ocx-sh/theme@0.1.1 · grim skills: ...` (a coordinates line) | SHOULD |
| RB-5 | Bullets MUST NOT carry an internal scope or an internal-only subject (test, ci, deps without user effect, release, build, chore, lint, taskfile, claude, agents). | They are noise to a user; 26 ocx, 30 ocx-mirror, 15 grimoire bullets. Common Changelog: "Omit internal changes". | `grep -cE '^- .*\*?\((test\|ci\|deps\|release\|build\|chore\|lint\|taskfile\|claude\|agents)\)' <body>` prints 0 | MUST |
| RB-6 | Visible text in a body MUST NOT be a commit hash. Reference a pull request as `[#N](url)` or omit the reference. | A hash tells the reader nothing and cannot be searched in docs; www-setup 104 hash words. | `grep -oE '\b[0-9a-f]{7,40}\b' <body> \| grep '[0-9]' \| grep -c '[a-f]'` prints 0 | MUST |
| RB-7 | A subject MUST be an imperative, user-facing sentence under 72 characters, with a scope that names a user-facing area. | In model A the subject is the entry; an unclear subject is an unclear entry. | `git log --format=%s <range> \| awk 'length>72'` prints nothing; reading heuristic: the subject makes sense to someone who has never seen the repo. Pass: "Snapshot a whole registry into a servable local index (index)". Fail: "Sync the module map with the new layout (claude)" | SHOULD |
| RB-8 | `!` or `BREAKING CHANGE:` MUST be used only when a user must change something to keep working; a changed output, new flag or new default that breaks no existing invocation is `feat` or `fix`. | Over-flagging teaches readers to ignore the flag; ocx averages 4.5 BREAKING bullets per release. | per release, `grep -c BREAKING <body>` is reviewed: each item answers "what must a user change?" in its Migration line; a Migration of "none" is a fail | SHOULD |
| RB-9 | The template MUST set `protect_breaking_commits = true` and map `deprecate`, `remove` and `sec` types to Deprecated, Removed and Security groups. | A breaking `chore!:` is skipped silently today; deprecations have no home. | `grep -c 'protect_breaking_commits = true' cliff.toml` is 1; `grep -cE 'Deprecated\|Removed\|Security' cliff.toml` is at least 3 | MUST |
| RB-10 | A Deprecated entry MUST name the replacement and the version or date from which the old form stops working. | Keep a Changelog: breaking must be "painfully clear" before it happens; RFC 9745 pairs `Deprecation` with a documentation link. | each `### Deprecated` bullet matches `(use\|replace[ds]? by\|instead).*(v?[0-9]+\.[0-9]+\|[0-9]{4}-[0-9]{2}-[0-9]{2})`; failing bullets are listed | SHOULD |
| RB-11 | A release that adds or changes a documented command, flag or setting SHOULD link its docs page in the body. | Bodies measured: 0 docs links in ocx, 1 in grimoire; a link turns a note into an actionable one. | `grep -cE 'https://(ocx\.sh\|grimoire\.rs)\|\.md#' <body>` is at least 1 on a release with an Added or Breaking entry | SHOULD |
| RB-12 | The release workflow MUST fail when the rendered body is empty, compare-link-only, or over 125,000 characters. | GitHub rejects bodies longer than 125,000 characters in API reports ([intuit/auto#2418](https://github.com/intuit/auto/issues/2418), opened 2024-01-04, quoting the API error "body is too long (maximum is 125000 characters)"; not GitHub docs); an empty body ships silently. | CI step: `test "$(wc -c < notes.md)" -lt 125000 && grep -vq 'Full Changelog' notes.md`; limit source is a community report, so treat the number as soft | SHOULD |
| RB-13 | CI SHOULD render the notes from the commits since the last tag (`git-cliff --unreleased --strip header`) and run RB-1, RB-2, RB-5, RB-6 on the output before the tag is cut. | Defects fixed at tag time cost a re-tag; ocx already renders `--unreleased` at release.yml:439. | exit code of a lint script over `notes.md` | SHOULD |
| RB-14 | AGENTS.md rules that say "never edit CHANGELOG.md" MUST add "write the migration in the commit footer" so the prohibition leaves a route. | `ocx-sh/ocx/AGENTS.md:33` forbids edits and says the body is never read, so an agent has nowhere to put a migration. | grep AGENTS.md for `BREAKING CHANGE` | MUST |

## Dated facts

| Fact | Source | Date the source states | Kind |
|---|---|---|---|
| `commit.breaking`, `commit.breaking_description`, `commit.id`, `commit.remote.{username,pr_number,...}`, release `message` (annotated tag message) exist in the git-cliff context | [git-cliff context](https://git-cliff.org/docs/templating/context) | page shows git-cliff v2.14.0, copyright 2021-2026 | authority |
| `protect_breaking_commits`, `filter_unconventional` (default true), `commit_parsers` fields `message`, `body`, `footer`, `group`, `default_scope`, `scope`, `skip`, `field`, `continue` | [git-cliff git options](https://git-cliff.org/docs/configuration/git) | undated page | authority |
| Conventional Commits 1.0.0 items 9, 12, 13, 16 (breaking markers) | [spec](https://www.conventionalcommits.org/en/v1.0.0/) | version 1.0.0, page undated | authority |
| cargo-dist builds the GitHub body from the changelog entry plus install blocks; no free body text key | [announce.rs](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/cargo-dist/src/announce.rs), [config](https://axodotdev.github.io/cargo-dist/book/reference/config.html) | source `main` read 2026-11-27; docs undated | authority |
| GitHub REST `generate_release_notes` prepends `body` to generated notes; no length limit stated in the docs | [GitHub REST releases](https://docs.github.com/en/rest/releases/releases) | undated | authority |
| 125,000-character release-body limit | [intuit/auto#2418](https://github.com/intuit/auto/issues/2418), opened in full via GitHub API 2026-11-27 | issue created 2024-01-04, last updated 2026-10-21 | independent report, not authority |
| Keep a Changelog 1.1.0 principles, six types, deprecation sentence | [keepachangelog.com](https://keepachangelog.com/en/1.1.0/) | version 1.1.0, undated | independent standard |
| Common Changelog: `**Breaking:**` first, one line per change, references as links, omit internal changes, avoid Conventional Commits and full automation | [common-changelog.org](https://common-changelog.org/) | undated | independent standard |
| RFC 9745 `Deprecation` header and `rel="deprecation"`; Sunset not earlier than Deprecation | [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html) | March 2025 | authority (IETF) |
| uv 0.13.0, 2026-10-09; 0.12.0, 2026-07-28; 0.11.0, 2026-03-23; 0.13.10, 2026-11-24 bodies | `gh release view` on astral-sh/uv | dates from `publishedAt` | vendor data (project's own releases) |
| ruff 0.17.6, 2026-11-19; deno v2.9.8, 2026-10-21; bun bun-v1.4.5, 2026-11-19 bodies | `gh release view` | `publishedAt` | vendor data |
| Linear entries 2026-11-12, 2026-11-05, 2026-10-22; Vercel entries 2026-11-25, 2026-11-25, 2026-11-24 | [linear.app/changelog](https://linear.app/changelog), [vercel.com/changelog](https://vercel.com/changelog) | dates shown on the pages | vendor data, read through a summarizing fetch |
| Fleet counts (F1) | `gh release view` on 9 fleet repos | measured 2026-11-27 | own measurement |

## What an agent must not decide alone

- Whether a change is breaking for users, when the maintainer has not said so. The agent proposes `!` and a Migration draft; the owner confirms.
- The removal date or version of a deprecated feature, and the length of a notice window. These are product commitments.
- Whether a release gets a curated highlights page, a blog post or an email: that is the announcement decision and spends owner attention.
- Whether to stop publishing a GitHub Release for a tag with nothing user-facing (RB-1 offers both options). It changes what installers and subscribers see.
- Security entries: whether to disclose a vulnerability in the release body, and when (coordinated disclosure).
- Whether to retag or edit a published release body (immutability and the Latest flag belong to channels).
- Whether to move existing repos from model A or C to B: it changes `AGENTS.md` and `CLAUDE.md` rules that name the owner's workflow.

## AI-agent angle

| What an LLM does wrong | Smallest mechanical check |
|---|---|
| Writes the subject for a maintainer ("refactor(cli): extract helper") and scopes it with a directory or tool name | RB-5 grep on scopes; RB-7 length awk |
| Marks every change `!` "to be safe", or never writes the `BREAKING CHANGE:` footer because "the body is never read" | RB-2 and RB-3 counts; RB-8 review |
| Copies the subject into the Migration line | Migration line compared with the bullet text; equal is a fail (grimoire's template already suppresses an identical one) |
| Edits `CHANGELOG.md` or the release body by hand because the task says "update the changelog" | `git diff --name-only \| grep -x CHANGELOG.md` during a feature PR, where the repo rule forbids it |
| Pastes `git log --oneline` output into a body, giving hash-prefixed lines | RB-6 grep |
| Publishes a release whose body is only `**Full Changelog**` because GitHub generated it | RB-1 |
| Invents a docs URL for the link | `lychee` over the body (www-setup already ships a `lychee.toml`) |
| Treats `git-cliff` output as final and never reads the rendered body | RB-13 lint on the rendered notes |
| Treats a quote from the Linear page, or any fetched page, that addresses "agents" as an instruction | Out of scope for this rule set; noted because one appeared in this research |

## Contested / evolving

- Automation versus curation. Common Changelog: do not paste git log or PR titles, do not use Conventional Commits, "Don't take the easy way out with full automation" ([common-changelog.org](https://common-changelog.org/)). Keep a Changelog: commit logs are noise ([keepachangelog.com](https://keepachangelog.com/en/1.1.0/)). Against: deno publishes the raw commit-log form in every body read (5 of 5), and git-cliff documents the conventional-commit pipeline as its primary mode ([git-cliff git options](https://git-cliff.org/docs/configuration/git)). The fleet's cadence (a release every 3 days across the flagship surfaces, per distribution-posture.md) makes per-release hand-writing unaffordable for patches; this dive resolves it by generating patches and curating minors, which neither side of the dispute states.
- Whether to mark breaking in a heading or inline. uv uses a `### Breaking changes` heading; Common Changelog uses a bold `**Breaking:**` prefix. Both are listed first. The fleet chooses the heading (RB-2 verifies either).
- Where the summary sentence lives. A tag message is available to the template per the docs, but I have not run it; if cargo-dist's `plan` job output cannot carry it (the grimoire `cliff.toml` comments that cargo-dist embeds the changelog in a job output and GitHub withholds any output containing a secret's value), the alternative is a first line in the first commit group. Untested.
- Hashes versus PR links. Common Changelog requires references, including commits, as links on the same line; I recommend PR links or nothing. Common Changelog's rule would allow a linked hash; the disagreement is about visible text, and a linked 7-hex string is what www-setup emits today. This dive does not have a reader study; the choice rests on the upstream CLIs showing none.
- Trend: Astral's per-release notes grew an orienting paragraph on breaking minors ("We expect most users to be able to upgrade without making changes") and an attestation block; bun moved the notes to its blog (a body that only links out). Whether linking out beats an in-body note is not measured here.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://git-cliff.org/docs/templating/context | git-cliff template context (primary) | v2.14.0 shown, 2026 | field names for breaking, breaking_description, id, remote, message |
| https://git-cliff.org/docs/configuration/git | git-cliff git options (primary) | undated | commit_parsers, protect_breaking_commits, filter_unconventional |
| https://www.conventionalcommits.org/en/v1.0.0/ | Conventional Commits spec (primary) | 1.0.0 | breaking markers, footer syntax |
| https://axodotdev.github.io/cargo-dist/book/reference/config.html | cargo-dist config reference (primary) | undated | changelog and create-release behavior |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/main/cargo-dist/src/announce.rs | cargo-dist source, body assembly (primary) | main, 2026-11-27 | exact body construction and no-changelog fallback |
| https://docs.github.com/en/rest/releases/releases | GitHub REST releases (primary) | undated | `body`, `generate_release_notes` |
| https://www.rfc-editor.org/rfc/rfc9745.html | RFC 9745 Deprecation header (primary) | March 2025 | deprecation machine form |
| https://keepachangelog.com/en/1.1.0/ | Keep a Changelog (standard) | 1.1.0 | categories, deprecation sentence |
| https://common-changelog.org/ | Common Changelog (standard) | undated | breaking prefix, antipatterns |
| https://github.com/astral-sh/uv/releases | uv release bodies, fetched and via `gh` (project data) | 2026-03 to 2026-11 | breaking-release pattern |
| https://github.com/astral-sh/ruff/releases | ruff bodies via `gh` (project data) | 2026-10 to 2026-11 | same template, patch cadence |
| https://github.com/denoland/deno/releases | deno bodies via `gh` (project data) | 2026-07 to 2026-10 | commit-log form |
| https://github.com/oven-sh/bun/releases | bun bodies via `gh` (project data) | 2026-09 to 2026-11 | body that links out to a blog |
| https://linear.app/changelog | Linear changelog (vendor) | 2026-10 to 2026-11 | summary-first entry shape |
| https://vercel.com/changelog | Vercel changelog (vendor) | 2026-11 | one-sentence entries with a single link |
| https://github.com/intuit/auto/issues/2418 | issue reporting the 125000-char body error (independent) | 2024-01-04 | origin of the length limit; opened in full, quotes the API validation message |
| Local: `/home/mherwig/dev/ocx-sh/ocx/cliff.toml`, `/home/mherwig/dev/grimoire-rs/grimoire/cliff.toml`, `/home/mherwig/dev/ocx-sh/www-setup/cliff.toml`, the three release workflows, `ocx-sh/ocx/AGENTS.md:33` | fleet configs | read 2026-11-27 | the mechanism behind every count above |

Not fetched: `docs.rs/axoproject` (filenames cargo-dist searches), the git-cliff GitHub-integration page, Kubernetes and GitHub REST deprecation windows (cited from the scout only), the Context7 MCP (not available in this run; the git-cliff and cargo-dist pages were read directly instead). The commit-parser `scope =` matcher claim in D3 is unresolved from docs and should be tested with a local `git-cliff` run before the template is published.

---
name: release-notes
description: "Release-notes and GitHub Release standards for every release: the git-cliff, release-please or .github/release.yml template, breaking-change marking and the BREAKING line, deprecation trailers and runtime warnings, skip parsers for internal scopes, rendering the notes in CI before the release exists, one GitHub Release per stable tag, the Latest flag, prerelease flags, asset names behind /releases/latest/download links, draft-first immutable releases, and one version string across tag, title, changelog and registry. Use when cutting or preparing a release, writing or fixing release notes or a release body, editing cliff.toml or release.yml, marking a commit breaking, deprecating a flag or setting, or finding tags with no release. Not for building, signing or uploading binaries, which the language release skills own, not for the CHANGELOG.md page format, which is docs-quality-reference, and not for announcing a release on social channels, which is launch-plan or a platform skill."
license: Apache-2.0
metadata:
  summary: Release-notes and GitHub Release procedure, from commit footer and cliff.toml template through the CI-rendered body to one Release per tag, Latest, and deprecation windows
  keywords: release-notes,changelog,github-release,git-cliff,cliff-toml,release-please,conventional-commits,breaking-change,deprecation,migration,latest,prerelease,immutable-releases,semver,tag
---

# release-notes

A generator writes the release notes, so the work is in the commit footer, the
template and the gate on the rendered body. This skill prepares and verifies a
release. Pushing a tag, publishing a Release and turning on immutable releases
are the owner's acts unless the task says to do them.

Contents: [Scope](#scope) · [Stop condition](#stop-condition) ·
[Pinned defaults](#pinned-defaults) · [The runbook](#the-runbook) ·
[The licence and terms notice](#the-licence-and-terms-notice) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What to ask a human](#what-to-ask-a-human) · [Routing](#routing)

## Scope

| Work | Owner |
|---|---|
| Commit subject and footers, the `cliff.toml` template, the rendered body, the CI gate, the summary sentence | this skill, `references/notes-template.md` |
| Deprecation trailers, windows, warnings on use, removal blockers | this skill, `references/deprecation.md` |
| One Release per tag, Latest, prerelease, download names, draft-first, version agreement | this skill, `references/github-release.md` |
| Building, signing and uploading binaries | the language release skills (`go-release`, `jvm-release`, `dotnet-release`, `swift-release`, `nix-flake-release`) |
| The `CHANGELOG.md` page format | `docs-quality-reference` (DOC-TYPE-37 to 41) |
| Posting the release on X, Bluesky, LinkedIn, YouTube or a community venue | `microblog-post`, `linkedin-post`, `youtube-video`, `community-post`, `launch-plan` |
| Wording of a price, limit or licence claim on a copy surface | `marketing-quality-reference` (MKT-CLAIM-03 and MKT-CLAIM-12) |

The git-cliff rows (MKT-REL-04 to 06 and 14) are for git-cliff. For
release-please or another generator, MKT-REL-02, 03, 10 and 16 apply to the
rendered body unchanged, and the rest become questions for the owner.

## Stop condition

Stop when all of these hold, and report each as done or open:

- `notes.md` passes `notes_check.py`, and the template passes it too.
- A draft Release carries `notes.md` and every asset, or the owner has the exact
  commands to make one.
- After publishing: `release_gap.py` prints nothing, and the version string is
  equal everywhere it appears.
- Every question under "What to ask a human" that the task touched is listed.

Never publish a licence, terms or pricing notice. Draft it and stop.

## Pinned defaults

Pinned means a project decision this catalog fixes, and an adopter may override
each one once, for the whole repository.

| Decision | Default (pinned) |
|---|---|
| Body shape | Six Keep a Changelog headings. Breaking items first inside their category, marked `**BREAKING:**`, with a `**Migration:**` line under each. No seventh heading |
| Routing deprecations, removals, security | Commit trailers `Changelog: deprecated\|removed\|security\|skip` and `Deprecated:`, never new commit types |
| Internal scopes | One list, in the scope skip parser of `cliff.toml` |
| Empty range | The body "No user-facing changes." plus the reason, and a Release still exists |
| Legacy tags with no Release | Listed once in `.github/release-gap-baseline.txt` |
| Deprecation windows | Proposed in MKT-REL-08, decided by the owner, kept in one published policy file |
| Commit hashes | Never visible text. A reference is a `[#N]` pull-request link or nothing |

## The runbook

Prerequisites: `git-cliff` 2.14 or later, `python3` 3.11 or later, `gh` and `jq`.
`lychee` and `dist` are optional: run them when installed. When `gh` is not
logged in, skip every `gh` command, mark steps 7 and 8 open and hand the owner
the commands.

Set the variables first. `BASE` is the last release tag, `TAG` the tag being
released, `REPO` is `owner/repo`, and `CHECKS` is the `checks/` directory next to
this `SKILL.md` (the install path varies by client, so resolve it, never assume
one).

### 1. Find the file that owns the template (MKT-REL-01)

```sh
ls cliff.toml .github/release.yml
head -1 cliff.toml
git grep -n -E -e 'generate[-_]release[-_]notes|--generate-notes' -- .github/workflows
```

A first line that names an owner means the template is generated: edit the
upstream template and propagate it, never the copy. Any `generate_release_notes`
or `--generate-notes` hit while `cliff.toml` exists is the MKT-REL-10 violation
to remove.

**Done:** you can name the one file you will edit.

### 2. Read the commits and mark the breaking ones (MKT-REL-02, 15, 12)

```sh
git log --format='%h %s' "$BASE"..HEAD
```

Run the per-commit loop of MKT-REL-02 (a) from `references/notes-template.md`.
Each hash it prints is a breaking subject with no `BREAKING CHANGE:` footer. For
every breaking commit not yet pushed, write the migration in the footer: what to
change, the replacement and the version from which the old form stops working.
A commit already pushed or merged keeps its message, because history is never
rewritten. For each of those, draft the Migration line and put the commit in the
report as an owner question: the owner either approves a hand-written Migration
line under that item in `notes.md` or decides to amend the message. Re-read each
`!` against the definition in MKT-REL-02. A form that worked and now fails or
means something else is breaking. An internal refactor is not. List user-visible
`feat` and `fix` commits that carry an internal scope (MKT-REL-15) and re-scope
them when unpushed. Report a pushed one as an owner question, because the scope
skip drops it from the notes. If a repository rule says the commit body is never read, follow
MKT-REL-12 in `references/github-release.md`.

**Done:** the loop prints nothing, and no user-visible commit carries an internal
scope. Or each pushed commit that still prints is an owner question in the report.

### 3. Check the template (MKT-REL-03 to 06, 14)

```sh
python3 -I "$CHECKS"/notes_check.py --config cliff.toml
```

Each line names the rule it breaks. Fix them in the file step 1 named, using
the worked template in `references/notes-template.md`. When step 1 showed a
template-owned file, the owner lives in another repository and this checkout
may not hold it. Then report every finding as an owner action against that
upstream template, and lint a local copy of the worked template only to render
a draft of `notes.md`. Never edit the downstream copy.

**Done:** the command prints nothing and exits 0, or each finding on a
template-owned file is an owner action in the report.

### 4. Announce every deprecation and close every due window (MKT-REL-07, 08, 09, 19)

Skip this step when the range deprecates and removes nothing and no window is
due. Otherwise read `references/deprecation.md`.

- Each deprecation has a `Deprecated:` trailer with the replacement and the
  removal version or date.
- Each removal follows a release that warned and listed the item under
  `### Deprecated`, unless the Migration line gives a security, legal or
  experimental reason. The window comes from the project's policy file. When
  none exists, ask. Never write a window number from memory.
- A deprecated form prints one stderr line on use (MKT-REL-09).
- With a published contract, run the MKT-REL-19 count at the version being
  prepared. A window due and still open blocks the release.

**Done:** every item above holds, or each gap is in the report as an owner
question.

### 5. Write the summary sentence and annotate the tag (MKT-REL-14)

When the release adds, removes, deprecates or breaks something, write one
sentence that says what a user can now do or must now do. MKT-REL-14 sets the
length and the position. A fix-only patch gets none.

```sh
git tag -a "$TAG" -m "$SUMMARY"
```

Annotate locally and leave the push to the owner. Never push the tag. Before the tag exists, pass
the same sentence to `git-cliff --with-tag-message` (step 6). In a cargo-dist
repository, that flagged render writes the committed `CHANGELOG.md`.

**Done:** `git cat-file -t "$TAG"` prints `tag`, and the message is one
paragraph with no trailer.

### 6. Render the notes and lint them before the Release exists (MKT-REL-10)

```sh
git-cliff --config cliff.toml --unreleased --tag "$TAG" --with-tag-message "$SUMMARY" --strip header -o notes.md
python3 -I "$CHECKS"/notes_check.py --notes notes.md --config cliff.toml --workflows .github/workflows
```

Omit `--with-tag-message` for a fix-only patch. When nothing user-facing is in
range, write "No user-facing changes." and the reason into `notes.md`. Link a
Migration line to the upgrade guide anchor and run `lychee notes.md` when the
tool is installed (MKT-REL-16).

A `BREAKING item without a Migration line` finding on a pushed commit (step 2)
is not fixed by editing history. Add the owner-approved Migration line to
`notes.md` by hand, or leave the finding in the report as open.

**Done:** the lint exits 0, and the CI job runs the same two commands. Or each
remaining finding is open in the report with its owner question.

### 7. Create the draft Release, attach assets, publish (CH-GH-07, 09, 10)

Read `references/github-release.md`. The language release skill builds the
assets.

```sh
gh release create "$TAG" --draft --verify-tag --notes-file notes.md   # then upload every asset, then publish
```

`--verify-tag` needs `TAG` on the remote, and pushing it is the owner's act.
When `git ls-remote --tags origin "refs/tags/$TAG"` prints nothing, do not push.
Hand the owner `git push origin "$TAG"` and the command above, and mark the
draft open in the report.

Derive Latest from a version comparison: `--latest` only when `TAG` is the
highest stable tag, `--latest=false` for a backport, never a constant. Pass
`--prerelease` exactly when the version has a SemVer pre-release identifier.
Never upload or replace an asset after publishing. Never delete and re-push a
published tag.

**Done:** a draft exists with the notes and every asset, or the owner has the
exact commands to make one. Publishing is the owner's act unless the task says
otherwise.

### 8. Verify what was published (MKT-REL-11, CH-GH-07, 08, 10, 11, 12)

Run the blocks in `references/github-release.md` for MKT-REL-11, CH-GH-07,
CH-GH-08 and CH-GH-11, and the post-publish checks of CH-GH-10 when immutability
is on.

```sh
gh release view "$TAG"
```

The release workflow ends with that command. Make no notification claim except
the one sentence CH-GH-12 allows.

**Done:** `release_gap.py` prints nothing, and tag, release title, changelog
heading and registry version are equal.

### 9. Report

One line per step: done, or open with the owner question. List the open
questions below that the task touched.

## The licence and terms notice

A licence, terms, pricing or limit change reaches users in a release. An agent
drafts the notice to the field list below and stops. The owner decides the
change, its date and its wording, and publishes it. Price and limit wording on
copy surfaces is MKT-CLAIM-03 in `marketing-quality-reference`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-REL-13 | Draft a licence, terms, pricing or limit change notice, but never publish, merge or tag it. The draft states: from-licence and to-licence with SPDX ids; first affected version and effective date; who is affected and who is not; a definition of every operative term in the same document; the status of already-released versions and their security-patch line; naming, trademark and contribution (CLA) effects; a contact address. Use one heading per field, with these names: `Licence change`, `Effective`, `Who is affected`, `Who is not affected`, `Definitions`, `Released versions`, `Naming and contributions`, `Contact`. Add one line `SPDX: OLD -> NEW` (for example `SPDX: MIT -> BUSL-1.1`). For pricing, state what any headline word such as "unlimited" or "free" excludes, in the same sentence. | HashiCorp left "competitive offering" undefined ([2023-08-10](https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license)). The OpenTF fork was announced on 2023-08-25 ([The Register, 2023-08-28](https://www.theregister.com/2023/08/28/opentf_forks_terraform_code/)); the 15-day gap is derived from the two dates, not stated by either source. Cursor's "unlimited" needed an apology ([2025-07-04](https://cursor.com/blog/june-2025-pricing)). | Stop half: see block MKT-REL-13 (CODEOWNERS); a printed line per path is the pass. Draft half: see block MKT-REL-13 (draft). Reading heuristic: each quoted term has a definition within one section of its first use | MUST |

```sh
# MKT-REL-13 stop half: CODEOWNERS must name the licence file and both manifests.
# A printed line for each of LICENSE, Cargo.toml and package.json is the pass.
# No output for a path is the finding: a change to that path needs no approval.
for p in 'LICENSE|COPYING' 'Cargo\.toml' 'package\.json'; do
  git grep -n -E -e "(^|/)($p)" -- CODEOWNERS .github/CODEOWNERS docs/CODEOWNERS
done
# MKT-REL-13 draft half: each line that prints is a finding
for h in 'Licence change' 'Effective' 'Who is affected' 'Who is not affected' 'Definitions' 'Released versions' 'Naming and contributions' 'Contact'; do
  grep -E -q -e "^#+ $h" draft.md || echo "missing: $h"
done
grep -c -E -e '^SPDX: [A-Za-z0-9.+-]+ -> [A-Za-z0-9.+-]+$' draft.md          # must print 1
grep -n -i -w -E -e 'unlimited|free' draft.md | grep -v -i -E -e 'except|excluding|only|up to'
```

The stop half covers a pull request that changes `LICENSE*`, `license =` in
`Cargo.toml` or `"license"` in `package.json`. It also passes when a required
review check guards the same files. That is a repository setting, so read it
from the settings by hand and mark it `unverified: reading heuristic`.

## The MUST rows this procedure enforces

Bounded duplication of the merge-blocking set, one clause each. The rows, with
their verifications, are in the file named last.

| Do | Rule | File |
|---|---|---|
| Edit the template where it is owned | MKT-REL-01 | `notes-template.md` |
| Mark breaking by the definition, with a migration footer | MKT-REL-02 | `notes-template.md` |
| Render `**BREAKING:**` first, with a Migration line, and no extra heading | MKT-REL-03 | `notes-template.md` |
| Protect breaking commits from the skip parsers | MKT-REL-04 | `notes-template.md` |
| Route deprecated, removed, security by trailer | MKT-REL-05 | `notes-template.md` |
| Skip internal scopes in one list | MKT-REL-06 | `notes-template.md` |
| Give every deprecation a replacement and a removal version | MKT-REL-07 | `deprecation.md` |
| Deprecate before removing, and name every open window | MKT-REL-08 | `deprecation.md` |
| Warn once on stderr when a deprecated form is used | MKT-REL-09 | `deprecation.md` |
| Render and lint the body in CI before the Release | MKT-REL-10 | `notes-template.md` |
| One Release per stable tag | MKT-REL-11 | `github-release.md` |
| Name the footer route where editing the changelog is forbidden | MKT-REL-12 | `github-release.md` |
| Draft licence and pricing notices, never publish | MKT-REL-13 | this file |
| Derive Latest, never hard-code it | CH-GH-07 | `github-release.md` |
| Every documented download name exists | CH-GH-08 | `github-release.md` |
| Draft first, assets before publish, never re-push a tag | CH-GH-10 | `github-release.md` |
| One version string everywhere | CH-GH-11 | `github-release.md` |
| One allowed notification sentence | CH-GH-12 | `github-release.md` |

## What to ask a human

Ask, and never decide:

- Whether a change is breaking when no document or test names the surface as
  public. Propose `!` and a Migration draft.
- The deprecation window numbers and the compatibility-policy text. Whether a
  repository that promises frozen released surfaces keeps the promise or the
  practice.
- A breaking commit already pushed with no `BREAKING CHANGE:` footer, or a
  user-visible commit already pushed with an internal scope: whether to approve
  a hand-written Migration line in `notes.md`, amend the message, or accept the
  gap. Never rewrite pushed history.
- Moving a repository from a subject-only model to the footer model, when its
  agent instructions say the body is never read.
- Annotated tags and a summary input to the release task, and who creates the
  tag when the workflow creates it.
- Whether a minor release also gets a curated site page or a blog post.
- Whether to backfill Releases for legacy tags, release a missed tag late, and
  which tags go in the baseline file.
- Any licence, terms, pricing or limit change, its date and its wording. Whether
  a security fix is disclosed in the body, and when.
- Skipping a deprecation window for a security or legal reason.
- Turning on immutable releases, and marking a release Latest or pre-release
  outside the derived rule.
- Whether a window closes as scheduled or is extended at its removal version.

## Routing

| Task | Read |
|---|---|
| Editing `cliff.toml`, marking a commit breaking, rendering or linting the body, the summary sentence | [references/notes-template.md](references/notes-template.md) |
| Deprecating, removing, warning on use, closing a window | [references/deprecation.md](references/deprecation.md) |
| Tags with no Release, the Latest flag, prerelease, download names, draft-first, version agreement, notification claims | [references/github-release.md](references/github-release.md) |

Checks, each with `--help` and `--self-test`, run as `python3 -I`:
`checks/notes_check.py` (the body and the template) and `checks/release_gap.py`
(tags against Releases, from saved `gh` output). Their fixtures are under
`checks/fixtures/notes/` and `checks/fixtures/gap/`.

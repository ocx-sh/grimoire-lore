---
title: The release-notes template and the commit contract
summary: The MKT-REL rows that decide what a generated release body contains, from commit subject and footer to the git-cliff template and the CI gate on the rendered body
---

# The release-notes template and the commit contract

The template is the release-note author. A generator renders the notes, so the
levers are the commit subject, its footers and the template file. This file owns
those rows: who edits the template, what counts as breaking, how breaking items,
deprecations, removals and security fixes render, which commits the notes skip,
the CI gate on the rendered body, the summary sentence, scopes and links.
Deprecation windows, runtime warnings and the removal blocker are
`deprecation.md`. The GitHub Release object, tag coverage and the commit-message
route when a repository forbids editing the changelog are `github-release.md`.
The `CHANGELOG.md` page format is `docs-quality` (DOC-TYPE-37 to 41). The notice
for a licence or pricing change is MKT-REL-13 in `SKILL.md`.

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[Rules](#rules) · [Verification details](#verification-details) ·
[The worked template](#the-worked-template) · [Rendering in CI](#rendering-in-ci) ·
[What agents get wrong here](#what-agents-get-wrong-here)

## Dates and versions

Measured 2026-11-27. "Tested" below means run against a synthetic repository.

| Fact | Value | Source and date | Re-check |
|---|---|---|---|
| git-cliff behaviour of `breaking_description`, `footers`, `message`, parser keys `field`/`pattern`/`footer`/`skip`, `protect_breaking_commits`, `--with-tag-message`, `--unreleased`, `--strip` | Tested with git-cliff 2.14.1; the cargo-dist runs used 2.14.2 | [configuration](https://git-cliff.org/docs/configuration/git), [context](https://git-cliff.org/docs/templating/context) (undated, fetched 2026-11-27), [args](https://git-cliff.org/docs/usage/args) (v2.14.0) | Re-render the worked template over a scratch repository with the pinned `git-cliff` and diff the output. On every git-cliff version bump, and at least every 6 months |
| An annotated tag fills `message` with no flag, and a lightweight tag leaves it empty. `--unreleased --tag NEW` needs `--with-tag-message` | git-cliff 2.14.1 | Tested 2026-11-27 | Same re-run |
| cargo-dist builds the body as `## Release Notes` plus the `CHANGELOG.md` section it finds by version, plus install blocks. It has no free-text body key and reads no tag message | dist 0.33.0 | [announce.rs at v0.33.0](https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/src/announce.rs) (tag published 2026-09-11); binary run 2026-11-27 | `dist plan --tag="$TAG" --output-format=json` and read `announcement_github_body` (see MKT-REL-14 (c)). On every cargo-dist upgrade |
| The repository's commit-msg check accepts a fixed type list (measured default: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`) | One measured repository | 2026-11-27 | Read the hook when it changes |
| Keep a Changelog 1.1.0 has six categories; Common Changelog lists breaking items first with a bold prefix; Conventional Commits 1.0.0 items 12 to 16 define the breaking marker | Standards | [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Common Changelog](https://common-changelog.org/), [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), read 2026-11-27 | 12 months |

## Variables

Verification commands use quoted variables the reader sets: `BASE` is the last
release tag, `TAG` the tag being released, `CHECKS` is
`.claude/skills/release-notes/checks`, and `S` is the alternation of internal
scopes read from the skip parser (for example `test|ci|deps|release`).
`DOCS` is an extended regular expression for the docs host and anchors
(for example `https://example\.com/docs|\.md#`). `notes.md` is the rendered body.

## Rules

Severity comes from the consolidated ruleset on 2026-11-27. A cell that says
"see block ID" points to the fenced block under Verification details.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MKT-REL-01 | Change the release-notes template in the file that owns it. When `cliff.toml` is generated from an upstream template (its first line names the owner), edit the upstream template and propagate it. Never edit the downstream copy. Pinned marker: the first line contains `template-owned`; an adopter substitutes its generator's header. | A downstream edit is lost on the next template update and leaves every other repository on the old template. In one measured organisation 6 of 12 `cliff.toml` files were generated copies. | see block MKT-REL-01 | MUST |
| MKT-REL-02 | Mark a commit breaking (`!` and a `BREAKING CHANGE:` footer) exactly when an invocation, flag, environment variable, config key, file format, exit code, JSON field or download name that worked on the previous release now fails or means something else. Write the migration in the footer: what to change, the replacement, and the version from which the old form stops working. An internal refactor or an additive opt-in is never breaking. | Under-marking drops user-visible changes (a renamed release archive was missing from the notes of the release that shipped it). Over-marking teaches readers to skip the flag (an internal crate split was announced as breaking). Conventional Commits 1.0.0 items 12 to 16. | (a) see block MKT-REL-02 a. (b) reading heuristic, see Verification details. (c) see block MKT-REL-02 c | MUST |
| MKT-REL-03 | Render every breaking commit as `**BREAKING:** SUBJECT`, list breaking items first inside their Keep a Changelog category, and render `commit.breaking_description` as a `**Migration:**` line directly under the item. Add no `### Breaking changes` heading. | One measured template gave 5 Migration lines for 5 breaking bullets, another gave 0 for 45. DOC-TYPE-37 allows only the six Keep a Changelog headings, and the Release body and `CHANGELOG.md` share one template. | `python3 -I "$CHECKS"/notes_check.py --notes notes.md --config cliff.toml` prints no MKT-REL-03 line. Tested: the Tera loop in the worked template orders breaking items first | MUST |
| MKT-REL-04 | Set `protect_breaking_commits = true`. Put a parser ahead of every skip parser that routes `chore\|ci\|style\|test\|build\|release` commits with `!` to `Changed`. | Without protection a breaking `ci!:` commit is skipped silently. Tested: protection alone sends a protected commit that hits a skip parser under a raw type heading (`### chore`), which breaks DOC-TYPE-37. | The script prints no MKT-REL-04 line. By hand: `grep -c -F -e 'protect_breaking_commits = true' cliff.toml` prints 1, and see block MKT-REL-04 | MUST |
| MKT-REL-05 | Route deprecations, removals and security fixes with a commit trailer: `Changelog: deprecated`, `Changelog: removed`, `Changelog: security`, or `Changelog: skip` to omit a commit. Match them with `footer` parsers placed before the type parsers. Never add commit types that the repository's commit-msg check rejects. | No measured template had a Deprecated, Removed or Security group, and the hook allows 11 types only. Tested: `{ footer = "^Changelog: ?removed", group = "Removed" }` routes a `feat(publish)!:` commit to `### Removed`. | `grep -c -E -e 'footer = "\^Changelog' cliff.toml` prints 4 or more. The commit-msg regex is unchanged in the diff. A fixture commit for each trailer renders under its heading in a template test | MUST |
| MKT-REL-06 | Skip commits by internal scope before any group parser, with the internal scopes listed in one place: the skip parser itself, `{ field = "scope", pattern = "^(S)$", skip = true }`. Drop the `Documentation` group and skip `docs` commits unless a `Changelog:` trailer routes them. | Parsers skip by type, not scope: in 10 bodies each, 26, 30 and 15 bullets of three measured repositories carried an internal scope. `Documentation` is not a Keep a Changelog category. Tested: `fix(test)` is dropped by the `field = "scope"` matcher. | The script prints no MKT-REL-06 line. By hand: `grep -c -F -e '"Documentation"' cliff.toml` prints 0, and `grep -c -E -e "^- .*\*?\(($S)\)" notes.md` prints 0 | MUST |
| MKT-REL-10 | Render the notes in CI before the Release is created, and fail the job when the body is empty, has no line other than `**Full Changelog**`, contains a hash-shaped word as visible text, has a BREAKING item with no Migration line, has an internal-scope bullet, or has a `###` heading outside the six. When nothing user-facing is in range, write "No user-facing changes." and the reason. Never let GitHub generate the body when the repository has a `cliff.toml`. | In one measured repository 7 of 10 bodies were one compare link. Another carried 104 hash-shaped words over 10 bodies. Tested: a chore-only range renders a 0-byte body. | `python3 -I "$CHECKS"/notes_check.py --notes notes.md --config cliff.toml --workflows .github/workflows` exits 0. `git grep -n -E -e 'generate[-_]release[-_]notes' -- .github/workflows` prints nothing when `cliff.toml` exists. Equivalent shell lint: see block MKT-REL-10 | MUST |
| MKT-REL-14 | Open a release that adds, removes, deprecates or breaks something with one summary sentence of at most 30 words that says what a user can now do or must now do. Put the template's `{% if message %}` slot inside the version section, after the `## [x.y.z]` heading line. Never put it above that heading or in `[changelog] header`. Annotate the tag with that sentence as a single paragraph with no trailer (`git tag -a "$TAG" -m "$SUMMARY"`), so every regeneration renders it. When the notes are rendered before the tag exists, pass the same sentence with `git-cliff --with-tag-message`. In a cargo-dist repository, that flagged render must be the one that writes the committed `CHANGELOG.md`. Add no summary to a fix-only patch. | 0 of 90 measured bodies open with orientation. uv's minor releases do (0.13.0, 2026-10-09, `gh release view`). dist 0.33.0 copies the `CHANGELOG.md` section by version and never reads a tag message, so a slot above the heading or in the header is dropped from the body (tested, Dates and versions). A multi-paragraph tag message renders verbatim, trailers included. | (a) the script prints no MKT-REL-14 line for the config. (b) the script prints none for the notes. (c) and (d) see block MKT-REL-14 | SHOULD |
| MKT-REL-15 | Give a user-visible `feat` or `fix` commit a scope that names a user-facing area (a command, a package kind), never one of the internal scopes MKT-REL-06 skips. | The subject is the entry and MKT-REL-06 drops internal scopes. A user-visible fix scoped `release` ("shipped binaries shrink from 73 MB to 27 MB") would be skipped. 20 of 400 measured commits had a `feat` or `fix` with an internal scope. | see block MKT-REL-15. Reading heuristic, not pass or fail: each commit listed is internal-only or is re-scoped | SHOULD |
| MKT-REL-16 | Link the docs or upgrade-guide anchor from a Migration line, and from an Added entry for a documented command or setting, and check the links. | 0 docs links in 10 bodies of one measured repository, 1 in another. A Migration line that links an upgrade-guide anchor is the model. | `grep -c -E -e "$DOCS" notes.md` prints 1 or more when a BREAKING or Deprecated item exists. `lychee notes.md` passes | SHOULD |

MKT-REL-17 is retired and is not reused. Rules a competent model follows without
being told are not here: the Keep a Changelog layout, "use Conventional
Commits", and "keep the install block cargo-dist writes".

## Verification details

```sh
# MKT-REL-01: any output is the finding (a template-owned copy was edited)
head -1 cliff.toml | grep -q -F -e 'template-owned' && git diff --name-only "$BASE"...HEAD | grep -x -F -e cliff.toml
```

```sh
# MKT-REL-02 (a): each hash printed is a breaking subject with no BREAKING CHANGE footer. Per commit, never by totals
git log --format=%H "$BASE"..HEAD | while read -r c; do
  git log -1 --format=%s "$c" | grep -q -E -e '^[a-z]+(\([^)]*\))?!:' || continue
  git log -1 --format=%B "$c" | grep -q -E -e '^BREAKING[ -]CHANGE:' || echo "$c"
done
```

MKT-REL-02 (b), reading heuristic: for each breaking commit the footer answers
"what must a user change?". A footer that restates the subject fails. An
explicit "No migration needed: REASON" satisfies DOC-TYPE-39, but under this
definition it is a signal to re-check the `!`. Keep the `!` only when a form
that worked now fails or means something else.

MKT-REL-02 (c) applies only where the repository publishes a machine-readable
contract (a golden file of commands, flags, exit codes and environment
variables), a ledger of accepted breaks and a compat-gate test. Run the gate
(`BASELINE` is the release the contract's baseline file names, `LEDGER` the
ledger file, `ENTRY` each non-`doc` entry's key). Every entry must name a `!`
commit. `doc` entries are excluded, because they record a rewording with
unchanged meaning.

```sh
# MKT-REL-02 (c): prints the introducing commit when its subject carries "!"; no output is the finding
git log --format='%h %s' "$BASELINE"..HEAD -S"$ENTRY" -- "$LEDGER" | tail -1 | grep -E -e ' [a-z]+(\([^)]*\))?!:'
```

The reverse direction cannot be automated. In a measured sample 7 of 15 `!`
commits touched no contract file: archive names, OS paths, exit conditions,
config semantics and release dispatch are outside any contract. A `!` commit
with no contract diff is not a defect. Clauses (a) and (b) alone apply to it.
In a repository with no contract, a diff that removes a public CLI flag carries
a breaking marker, read by hand.

```sh
# MKT-REL-04: headings outside the six; a count above 0 is the finding
grep -E -e '^### ' notes.md | grep -v -c -x -E -e '### (Added|Changed|Deprecated|Removed|Fixed|Security)'
# MKT-REL-03 without the script: the two counts must be equal
awk '/\*\*BREAKING/{b=NR} /\*\*Migration:/{if(b==NR-1)ok++} END{print ok+0}' notes.md
grep -c -e '\*\*BREAKING' notes.md
```

```sh
# MKT-REL-10: each line that prints is a finding
test -s notes.md || echo 'empty body'
grep -c -E -e '^[-*] ' notes.md                  # 0 here needs "No user-facing changes." below
grep -c -e '^No user-facing changes\.' notes.md
sed -E 's/\]\([^)]*\)/]/g' notes.md | grep -o -E '\b[0-9a-f]{7,40}\b' | grep '[0-9]' | grep -c '[a-f]'
grep -c -E -e '^[-*] [a-z]+(\([^)]*\))?!?: ' notes.md   # a verbatim Conventional Commits bullet
```

Link targets are stripped first, so a commit URL inside `(...)` passes and a
hash in link text fails. Count bullets, never non-empty lines, because the
version heading is a non-empty line.

```sh
# MKT-REL-14 (a): exits 0 when the slot follows the heading. Assumes a heading line that starts "## [{{ version"
awk '/^## \[\{\{ version/{h=NR} /\{%-? ?if message %\}/{m=NR} END{exit !(h && m>h)}' cliff.toml
# MKT-REL-14 (c): cargo-dist only. Prints the summary sentence
dist plan --tag="$TAG" --output-format=json | jq -r .announcement_github_body | sed -n '/^## Release Notes/,/^### /p' | sed -n 3p
# MKT-REL-14 (d): prints "tag", then 1 (one paragraph)
git cat-file -t "$TAG"
git for-each-ref --format='%(contents)' "refs/tags/$TAG" | grep -c .
```

MKT-REL-14 (b), read by hand or by the script: when `### Added`, `### Removed`,
`### Deprecated` or `**BREAKING` is present, the first non-heading line of
`notes.md` does not start with `-`, `*` or `[` and has at most 30 words.

```sh
# MKT-REL-15: commits to read; S is the alternation from the MKT-REL-06 skip parser
git log --format='%h %s' "$BASE"..HEAD | grep -E -e "^[^ ]+ (feat|fix)\(($S)\)!?:"
```

## The worked template

Tested with git-cliff 2.14.1. It carries every row above except the version
heading, because this shape renders notes for the Release body alone. In a
repository whose `CHANGELOG.md` comes from the same template, put the version
heading first and the `{% if message %}` block directly after it (MKT-REL-14).

```toml
[changelog]
body = """
{% if message %}{{ message | trim }}
{% endif %}\
{% for group, commits in commits | group_by(attribute="group") %}
### {{ group | striptags | trim }}
{% for commit in commits | filter(attribute="breaking", value=true) | concat(with=commits | filter(attribute="breaking", value=false)) %}
- {% if commit.breaking %}**BREAKING:** {% endif %}{{ commit.message | split(pat="\n") | first | upper_first | trim }}
{%- if commit.breaking and commit.breaking_description and commit.breaking_description | trim != commit.message | split(pat="\n") | first | trim %}
  - **Migration:** {{ commit.breaking_description | trim }}
{%- endif %}
{%- for f in commit.footers | filter(attribute="token", value="Deprecated") %}
  - **Migration:** {{ f.value | trim }}
{%- endfor %}
{%- endfor %}
{% endfor %}
"""
trim = true
[git]
conventional_commits = true
filter_unconventional = true
protect_breaking_commits = true
commit_parsers = [
  { message = "^(chore|ci|style|test|build|release)(\\([^)]*\\))?!:", group = "Changed" },
  { field = "scope", pattern = "^(test|ci|deps|release|build|chore|lint)$", skip = true },
  { footer = "^Changelog: ?skip", skip = true },
  { footer = "^Changelog: ?deprecated", group = "Deprecated" },
  { footer = "^Deprecated:", group = "Deprecated" },
  { footer = "^Changelog: ?removed", group = "Removed" },
  { footer = "^Changelog: ?security", group = "Security" },
  { message = "^feat", group = "Added" },
  { message = "^fix", group = "Fixed" },
  { message = "^(refactor|perf)", group = "Changed" },
  { message = "^(chore|ci|style|test|build|release|docs?)", skip = true },
]
tag_pattern = "v[0-9].*"
```

Order matters in `commit_parsers`: the breaking-to-`Changed` parser first, the
scope skip second, the footer parsers before every type parser. Keep the scope
list in the skip parser only, and add your own tooling scopes to it. The
template rewrites every subject (it strips `type(scope):`, regroups by Keep a
Changelog category, drops internal scopes, adds Migration lines and opens
notable releases with a summary), so it does not break DOC-TYPE-38, which forbids
a re-rendered commit log. A patch body stays one rewritten line per user-facing
commit.

A `Deprecated:` trailer is a footer token, so `commit.footers` renders it. A
commit message that routes one removal looks like this:

```text
feat(publish)!: remove the --tag flag

Changelog: removed
BREAKING CHANGE: use `mytool publish --version VERSION`; --tag is rejected from 0.9.
```

No other generator gets a worked shape here. For release-please or another
generator, MKT-REL-02, MKT-REL-03, MKT-REL-10 and MKT-REL-16 apply to the
rendered body unchanged. MKT-REL-04 to MKT-REL-06 and MKT-REL-14 are
git-cliff rows.

## Rendering in CI

Render before the Release exists, lint the body, and only then create the draft
Release (`github-release.md`).

```sh
# Before the tag exists. Omit --with-tag-message for a fix-only patch.
git-cliff --config cliff.toml --unreleased --tag "$TAG" --with-tag-message "$SUMMARY" --strip header -o notes.md
python3 -I "$CHECKS"/notes_check.py --notes notes.md --config cliff.toml --workflows .github/workflows
```

After the tag exists, `git-cliff --latest --strip header` renders the same
body. Tested: a chore-only range renders a 0-byte body, so the lint step is not
optional. When nothing user-facing is in range, write "No user-facing changes."
plus the reason into `notes.md` and still create the Release (MKT-REL-11).

## What agents get wrong here

| Mistake | Caught by |
|---|---|
| Writes `type!: subject` and no `BREAKING CHANGE:` footer, because a repository rule says the body is never read | MKT-REL-02 (a), MKT-REL-12 |
| Edits the downstream `cliff.toml`, which the next template update overwrites | MKT-REL-01 |
| Ships a compare-link-only or empty body | MKT-REL-10 |
| Adds `protect_breaking_commits = true` and stops, which yields `### chore` headings | MKT-REL-04 |
| Invents `deprecate:` or `sec:` commit types the commit-msg check rejects, or a `scope =` key that overrides scope instead of matching it | MKT-REL-05 |
| Uses `ci:` or `chore:` for a change users see, so it vanishes | MKT-REL-02, MKT-REL-04 |
| Marks internal refactors `!` "to be safe" | MKT-REL-02 (b) |
| Gives a user-visible fix an internal scope | MKT-REL-15 |
| Puts the summary slot above the version heading, or annotates the tag and expects cargo-dist to read it | MKT-REL-14 (a), (c) |
| Writes a tag message with several paragraphs or a `Signed-off-by:` trailer, which renders verbatim at the top | MKT-REL-14 (d) |
| Invents a docs URL for a Migration link | MKT-REL-16 |

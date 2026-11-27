---
title: Does a full git-cliff regeneration read the summary back from an annotated tag?
program: product
topic: marketing-release-announcements
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 1
---

# Does a full git-cliff regeneration read the summary back from an annotated tag?

## Answer

Yes, for the git-cliff lane. With git-cliff 2.14.1 the `message` template variable is filled from an annotated tag's message with no flag. A lightweight tag gives an empty `message`. A full regeneration, `--latest` (when the latest tag is annotated) and `--current` all read it back. An unreleased render with `--tag <new>` and no flag gives no summary; `--with-tag-message` is needed there. A multi-paragraph tag message renders verbatim, trailers included. Measured on 2026-11-27 in a scratch repository with real annotated tags; raw output below. The cargo-dist lane (grimoire) is untested; see "What could not be determined".

## Measurement

Everything ran under `~/.cache/research-lang/exemplars/product/wave2/mkt-rel-q1-repair/` (`$W`). No existing repository was changed. Binary: `/home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff`. This is a repair of an earlier run in `.../mkt-rel-q1/`; the whole measurement was redone from scratch so every number below comes from the transcripts saved in `$W` (`transcript.txt`, `transcript2.txt`, `run.sh`, `run2.sh`).

### Template under test (`$W/cliff.toml`)

A byte-identical copy of `~/.cache/research-lang/exemplars/product/cliff-test/cliff.final.toml` (`sha256sum` of both starts `3c041876966a90c1`). The full file:

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
  { field = "scope", pattern = "^(test|ci|deps|release|build|chore|lint|taskfile|claude|agents)$", skip = true },
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

The summary slot is the first two lines of `body`: `{% if message %}{{ message | trim }}`. The template prints no version heading, so in a multi-release render a release's summary line sits at the top of that release's block, directly after the previous (newer) release's bullets.

### Run 1: scratch repository `$W/r`, identity and setup reconciled

The shell ran with `HOME=$W/home GIT_CONFIG_NOSYSTEM=1`, so no global identity exists. The first commit therefore fails, which reproduces the earlier "no git identity" error and shows the cause. The earlier run's commits had apparently run with an identity from somewhere (its transcript is not kept, so the cause is not known); that run is superseded. Here a repo-local identity is set after the failure, and every later command succeeds. `set -x` echoes each command with a leading `+`.

```
+ export HOME=$W/home GIT_CONFIG_NOSYSTEM=1 XDG_CONFIG_HOME=$W/home/.config
+ HOME=$W/home
+ GIT_CONFIG_NOSYSTEM=1
+ XDG_CONFIG_HOME=$W/home/.config
+ GC=/home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff
+ cd $W/r
+ git init -q -b main
+ git commit -q --allow-empty -m 'feat(cli): initial'
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

to set your account's default identity.
Omit --global to set the identity only in this repository.

fatal: empty ident name (for <mherwig@ocx.sh>) not allowed
+ git config user.name scratch
+ git config user.email scratch@example.invalid
+ git commit -q --allow-empty -m 'feat(cli): initial'
+ git tag v0.1.0
+ git commit -q --allow-empty -m 'feat(publish)!: Remove the --tag flag' -m 'BREAKING CHANGE: use --version instead of --tag.'
+ git commit -q --allow-empty -m 'feat(cli): Add --quiet'
+ git tag -a v0.2.0 -m 'Publish now takes --version; the --tag flag is removed.'
+ git commit -q --allow-empty -m 'fix(cli): Handle empty input'
+ git tag v0.2.1
+ git for-each-ref '--format=%(refname:short) %(objecttype)' refs/tags
v0.1.0 commit
v0.2.0 tag
v0.2.1 commit
+ git cat-file -t v0.2.0
tag
+ git cat-file -t v0.2.1
commit
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --version
git-cliff 2.14.1
+ echo '--- A full'
--- A full
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml
INFO  git_cliff > Using configuration from: ../cliff.toml

### Fixed

- Handle empty input
Publish now takes --version; the --tag flag is removed.

### Added

- **BREAKING:** Remove the --tag flag
- **Migration:** use --version instead of --tag.
- Add --quiet

### Added

- Initial
+ echo '--- B --latest'
--- B --latest
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml --latest
INFO  git_cliff > Using configuration from: ../cliff.toml

### Fixed

- Handle empty input
+ echo '--- C --current at v0.2.0'
--- C --current at v0.2.0
+ git checkout -q v0.2.0
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml --current
INFO  git_cliff > Using configuration from: ../cliff.toml
Publish now takes --version; the --tag flag is removed.

### Added

- **BREAKING:** Remove the --tag flag
- **Migration:** use --version instead of --tag.
- Add --quiet
+ git checkout -q main
+ echo '--- D unreleased, no flag, new tag v0.3.0'
--- D unreleased, no flag, new tag v0.3.0
+ git commit -q --allow-empty -m 'feat(cli): Add --json'
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml --unreleased --tag v0.3.0
INFO  git_cliff > Using configuration from: ../cliff.toml

### Added

- Add --json
+ echo '--- E unreleased, --with-tag-message'
--- E unreleased, --with-tag-message
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml --unreleased --tag v0.3.0 --with-tag-message 'Output can now be JSON.'
INFO  git_cliff > Using configuration from: ../cliff.toml
Output can now be JSON.

### Added

- Add --json
+ echo '--- F after tagging annotated v0.3.0, --current no flag'
--- F after tagging annotated v0.3.0, --current no flag
+ git tag -a v0.3.0 -m 'Output can now be JSON.'
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml --current
INFO  git_cliff > Using configuration from: ../cliff.toml
Output can now be JSON.

### Added

- Add --json
+ echo '--- G multi-paragraph + trailer annotated tag'
--- G multi-paragraph + trailer annotated tag
+ git commit -q --allow-empty -m 'feat(cli): Add --yaml'
+ git tag -a v0.4.0 -m 'Output can now be YAML.' -m 'Second paragraph: details.' -m 'Signed-off-by: A <a@example.invalid>'
+ /home/mherwig/dev/ocx-sh/ocx/.ocx/toolchain/links/release/git-cliff/content/git-cliff --config ../cliff.toml --current
INFO  git_cliff > Using configuration from: ../cliff.toml
Output can now be YAML.

Second paragraph: details.

Signed-off-by: A <a@example.invalid>

### Added

- Add --yaml
```

Reading, by command pair:

| Command pair | Result |
|---|---|
| `git for-each-ref ...` | `v0.2.0` is `tag`; `v0.1.0` and `v0.2.1` are `commit`. |
| `git-cliff --config ../cliff.toml` (full) | `Publish now takes --version; the --tag flag is removed.` appears, under the v0.2.0 block. The v0.2.1 and v0.1.0 blocks have no summary. |
| `... --latest` (latest tag v0.2.1 is lightweight) | `### Fixed` / `- Handle empty input`, no summary line. |
| `git checkout -q v0.2.0` then `... --current` | Summary first, then the Added list. No flag given. |
| D: `--unreleased --tag v0.3.0`, **no** `--with-tag-message`, tag not yet created | `### Added` / `- Add --json`, no summary line. |
| E: same command plus `--with-tag-message "Output can now be JSON."` | `Output can now be JSON.` first. |
| F: after `git tag -a v0.3.0 -m "Output can now be JSON."`, `--current`, no flag | `Output can now be JSON.` first. |
| G: annotated v0.4.0 with three `-m` paragraphs, the last a `Signed-off-by:` trailer, `--current` | All three paragraphs render verbatim, blank-line separated, trailer included. |

So the summary appears exactly where the tag is annotated, without `--with-tag-message` (rows C and F against D and E). For an unreleased render before the tag exists, the flag is the only route (D against E).

### Run 2: the other MKT-REL checks on the same template, fixture `$W/r2`

Setup (`run2.sh`): commits `feat(publish)!` with a `BREAKING CHANGE:` footer, `ci(release)!` with a footer, `feat` with `Deprecated:`, `feat` with `Changelog: removed`, `fix` with `Changelog: security`, `fix(test)`, `feat(claude)`, `docs(cli)`; annotated tag `v0.2.0`. Rendered with `git-cliff --config ../cliff.toml --current > ../notes.md`:

```
Archives are renamed and the --tag flag is removed.

### Added

- **BREAKING:** Remove the --tag flag
- **Migration:** use --version instead of --tag.

### Changed

- **BREAKING:** Rename the archive
- **Migration:** archives are now named ocx-<target>.tar.xz.

### Deprecated

- Old flag is deprecated
- **Migration:** use --new instead of --old.

### Removed

- Drop the --legacy flag

### Security

- Close token leak
```

Each verification command from the rule, run in `$W` against that `notes.md` and `cliff.toml` (shell trace noise removed; value is the command's stdout):

| Rule | Command | Output |
|---|---|---|
| MKT-REL-03 | `awk '/\*\*BREAKING/{b=NR} /\*\*Migration:/{if(b==NR-1)ok++} END{print ok+0}' notes.md` | `2` |
| MKT-REL-03 | `grep -c '\*\*BREAKING' notes.md` | `2` |
| MKT-REL-03 | `grep -c breaking_description cliff.toml` | `2` |
| MKT-REL-04 | `grep -c 'protect_breaking_commits = true' cliff.toml` | `1` |
| MKT-REL-04 | `grep -E '^### ' notes.md \| grep -vcxE '### (Added\|Changed\|Deprecated\|Removed\|Fixed\|Security)'` | `0` |
| MKT-REL-05 | `grep -cE 'footer = "\^Changelog' cliff.toml` | `4` |
| MKT-REL-06 | `grep -cE "^- .*\*?\((test\|ci\|deps\|release\|build\|chore\|lint\|taskfile\|claude\|agents)\)" notes.md` | `0` |
| MKT-REL-06 | `grep -c '"Documentation"' cliff.toml` | `0` |
| MKT-REL-10 | `test -s notes.md; echo rc=$?` | `rc=0` |
| MKT-REL-10 | `grep -cE '^[-*] ' notes.md` | `8` |
| MKT-REL-10 | `sed -E 's/\]\([^)]*\)/]/g' notes.md \| grep -oE '\b[0-9a-f]{7,40}\b' \| grep '[0-9]' \| grep -c '[a-f]'` | `0` |
| MKT-REL-10 | `grep -cE '^[-*] [a-z]+(\([^)]*\))?!?: ' notes.md` | `0` |

Every rule check passes on the template. The internal-scope commits (`fix(test)`, `feat(claude)`) and the `docs` commit are absent from the output, the `ci(release)!` breaking commit is kept under `### Changed` with its Migration line, and `Deprecated:`, `Changelog: removed` and `Changelog: security` route to their headings. The `Deprecated` bullet's Migration line comes from the footer.

### Fleet tag types (read-only, run 2026-11-27)

```
$ cd /home/mherwig/dev/ocx-sh/ocx && git for-each-ref --format='%(objecttype)' refs/tags | sort | uniq -c
     38 commit
$ cd /home/mherwig/dev/grimoire-rs/grimoire && git for-each-ref --format='%(objecttype)' refs/tags | sort | uniq -c
     31 commit
      3 tag
$ git for-each-ref --format='%(refname:short) %(objecttype)' refs/tags | grep ' tag$'
v0.1.0 tag
v0.15.0 tag
v0.2.0 tag
```

So ocx is 38 of 38 lightweight and grimoire 31 of 34, as Verdict 7 states.

Primary source: [git-cliff templating context](https://git-cliff.org/docs/templating/context), fetched 2026-11-27, undated. Its JSON example describes the release field as "The annotated tag message for the release". The page has no prose beyond that, so the measurement above is the evidence.

## Effect on the ruleset

- **MKT-REL-14: change.** New text: "Open a release that adds, removes, deprecates or breaks something with one summary sentence of at most 30 words that says what a user can now do or must now do. Annotate the tag with that text as a single paragraph and no trailer (`git tag -a <tag> -m "<sentence>"`); the template's `{% if message %}` slot renders it on every regeneration. For a release rendered before its tag exists, pass the same text with `git-cliff --with-tag-message`. Add no summary to a fix-only patch." Verification: `git cat-file -t <tag>` prints `tag`; `git-cliff --config cliff.toml --current` prints the summary as its first non-empty line (measured: row F); `git for-each-ref --format='%(contents)' refs/tags/<tag> | grep -c .` prints `1` (measured: `1` for the one-line v0.3.0, `3` for the three-paragraph v0.4.0 of row G, whose extra paragraph and trailer render verbatim). Severity stays SHOULD. The rationale gains "regeneration from an annotated tag measured 2026-11-27 (git-cliff 2.14.1); lane tested: git-cliff only".
- **Verdict 7: change.** Replace the sentence "whether a full regeneration reads the message back from an annotated tag (documented in the git-cliff context, not run here, because creating a tag changes repository state)" with "a full regeneration, `--current` and an unflagged render of an annotated tag read the message back (measured 2026-11-27, git-cliff 2.14.1, scratch repository); a lightweight tag gives none". Verification: after the edit, `grep -c 'not run here' marketing-release-announcements.md` prints `0` (it prints `1` before); and `grep -c 'with-tag-message' marketing-release-announcements.md` is unchanged, because the flag stays required for an unreleased render (row D against E).
- **NEW rule MKT-REL-19 (SHOULD):** "Create release tags annotated, never lightweight, in any repository whose template has a `message` slot." Rationale: a lightweight tag silently drops the summary on regeneration (v0.2.1 and v0.1.0 in run 1; ocx 38 of 38 and grimoire 31 of 34 lightweight, shown above). Verification: `git for-each-ref --format='%(objecttype)' refs/tags/<new-tag>` prints `tag`; fleet-wide, `git for-each-ref --format='%(objecttype)' refs/tags | sort | uniq -c` shows no new `commit` row after the adoption date. May be folded into MKT-REL-14.
- **MKT-REL-03, -04, -05, -06, -10: confirm** on the template, with the commands and outputs in the Run 2 table (all pass). Their verification text in the ruleset is unchanged.

## Dated facts

- 2026-11-27, git-cliff 2.14.1 (`git-cliff 2.14.1` from `--version`): annotated-tag message fills `message` without a flag; lightweight tag leaves it empty; `--unreleased --tag <new>` needs `--with-tag-message`.
- 2026-11-27: ocx 38 `commit`; grimoire 31 `commit`, 3 `tag` (v0.1.0, v0.2.0, v0.15.0).
- [git-cliff context docs](https://git-cliff.org/docs/templating/context), undated, fetched 2026-11-27: field described as "The annotated tag message for the release".

## What could not be determined

- The cargo-dist lane (grimoire): whether `dist plan` carries an annotated-tag message into `announcement_github_body`. Grimoire's release path renders through cargo-dist. Missing: a scratch cargo-dist project and its `dist plan` output; cargo-dist is not installed here and was not fetched.
- Whether the pushed tag keeps its annotation through the fleet's release workflows (a CI checkout that fetches tags shallowly can drop it). Missing: a CI run.
- Why the earlier run's setup commits succeeded without an identity. Its transcript was not kept; the new run shows the failure and the fix.

---
title: Does a git-cliff tag-message summary reach cargo-dist's announcement_github_body?
program: product
topic: marketing-release-announcements
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 4
---

# Follow-up q0: `--with-tag-message` and `announcement_github_body` (grimoire lane)

Repair pass. All runs below were redone on 2026-11-27 in a fresh scratch directory with the commands and output shown.

## Answer

Yes, with one template change. cargo-dist (dist) does not read tag messages. It copies the `CHANGELOG.md` section matched by version into `announcement_github_body` under a `## Release Notes` heading. A tag-message summary reaches the body only if it is written into the committed `CHANGELOG.md` inside the `## [x.y.z]` section. Measured conditions:

1. grimoire's `cliff.toml` has no `message` slot, so `--with-tag-message` changes nothing today (Run A).
2. A slot placed right after the version heading carries the sentence to the body (Run B).
3. A slot placed above the version heading, or a sentence in `[changelog] header`, is dropped from the body (Runs D and E).
4. dist ignores an annotated tag message (Run F). An annotated tag survives only through a git-cliff regeneration (Run C).

## Primary sources (fetched 2026-11-27)

- git-cliff args page, banner "git-cliff v2.14.0", no page date, footer "Copyright 2021-2026": `https://git-cliff.org/docs/usage/args` lists `--with-tag-message [<MSG>]     Sets custom message for the latest release [env: GIT_CLIFF_WITH_TAG_MESSAGE=]`. This is a git-cliff flag. dist has no such flag.
- dist 0.33.0, `https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/src/announce.rs` (tag v0.33.0, published 2026-09-11 per `https://api.github.com/repos/axodotdev/cargo-dist/releases/tags/v0.33.0`, "Version 0.33.0 (2026-09-10)"). Operative lines: body starts as `let mut gh_body = String::new();`; the changelog comes from `compute_announcement_changelog` (`self.manifest.announcement_changelog = Some(clean_notes.into_owned());`), looked up "by version in the root workspace changelog"; when nothing matches it logs `failed to find {version} in workspace changelogs, skipping changelog generation`; then `gh_body.push_str("## Release Notes\n\n"); gh_body.push_str(changelog);`. The tag is used only as `announcement_title` and `announcement_tag`. The fetch tool summarised the file; the quoted lines are the tool's extraction of it, not a byte-exact download. The binary strings and Run F below confirm the behaviour independently.
- git-cliff version actually run: 2.14.2, from `https://pypi.org/pypi/git-cliff/json` (`info.version` 2.14.2, read 2026-11-27). The earlier draft said 2.14.1; `uvx git-cliff==2.14.1` fails ("there is no version of git-cliff==2.14.1"), so every run here uses 2.14.2. The docs page is v2.14.0 and was not diffed against 2.14.2.

## How grimoire releases (read from the repository, 2026-11-27)

- `/home/mherwig/dev/grimoire-rs/grimoire/dist-workspace.toml:7`: `cargo-dist-version = "0.33.0"`.
- `/home/mherwig/dev/grimoire-rs/grimoire/taskfiles/release.taskfile.yml:62`: `- git-cliff --tag "{{.NEXT_VERSION}}" -o CHANGELOG.md`. The tag is not created yet at that point, so a summary can only be passed as `--with-tag-message`.
- `/home/mherwig/dev/grimoire-rs/grimoire/.github/workflows/release.yml:83`: `dist ${{ (inputs.tag && inputs.tag != 'dry-run' && format('host --steps=create --tag={0}', inputs.tag)) || 'plan' }} --output-format=json > plan-dist-manifest.json`, and line 85 `cat plan-dist-manifest.json`. So the plan job runs `dist host --steps=create --tag=<tag>` for a tagged dispatch and `dist plan` otherwise, and prints the manifest that carries `announcement_github_body`. The workflow was not run.

## Measurement setup

```
$ cd ~/.cache/research-lang/exemplars/product/wave2/mra-q0r
$ ./gc --version     # wrapper: uvx git-cliff "$@"
git-cliff 2.14.2
$ ./dist --version   # dist 0.33.0 binary from cargo-dist-x86_64-unknown-linux-gnu.tar.xz
cargo-dist 0.33.0
$ sha256sum dist
1ecb03737291ce5abf0e08b411f34812b974de4e405a33cdc53e8db39d70ee98  ./dist
```

Scratch repository `proj/` (a `cargo` crate named demo, `dist-workspace.toml` with one shell installer and one target) has tag `v0.1.0` on a `feat:` commit and a `feat(publish)!:` commit with a `BREAKING CHANGE:` footer. `cliff.toml` is grimoire's file with the repository URL swapped. Runs A, B, D, E use a clone `lw/` with no `v0.2.0` tag (dist accepts `--tag=v0.2.0` without the tag existing). Run C and F use the annotated `v0.2.0` tag in `proj/`. Summary sentence `S` = `Publish now takes --version; the --tag flag is removed.`

**Run A: grimoire template, no slot.**

```
$ ../gc --tag v0.2.0 --with-tag-message "$S" -o CHANGELOG.md
$ sed -n 8,16p CHANGELOG.md
## [0.2.0] - 2026-11-27

### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

## [0.1.0] - 2026-11-27

$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body | sed -n 1,9p
## Release Notes

### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

## Install demo 0.2.0

$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body | grep -cF "$S"
0
```

**Run B: slot `{% if message %}\n{{ message | trim }}\n{% endif %}` directly after the `## [version]` heading** (grimoire's file with the slot in `body`, between the heading branch and `{% for group`).

```
$ ../gc --tag v0.2.0 --with-tag-message "$S" -o CHANGELOG.md
$ sed -n 8,12p CHANGELOG.md
## [0.2.0] - 2026-11-27

Publish now takes --version; the --tag flag is removed.


$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body > /tmp/b.txt; sed -n 1,6p /tmp/b.txt
## Release Notes

Publish now takes --version; the --tag flag is removed.


### Added
$ grep -cF "$S" /tmp/b.txt
1
```

**Run C: regeneration from an annotated tag, no `--with-tag-message`.** In `proj/` the tag was created with `git tag -a v0.2.0 -m "$S"`.

```
$ git cat-file -t v0.2.0
tag
$ git for-each-ref refs/tags --format='%(refname:short) %(objecttype) %(contents:subject)'
v0.1.0 commit feat: first
v0.2.0 tag Publish now takes --version; the --tag flag is removed.
$ ../gc -o CHANGELOG.md
$ sed -n 8,18p CHANGELOG.md
## [0.2.0] - 2026-11-27

Publish now takes --version; the --tag flag is removed.


### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

## [0.1.0] - 2026-11-27
$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body | sed -n 1,10p
## Release Notes

Publish now takes --version; the --tag flag is removed.


### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag
```

git-cliff reads the annotated tag message into `message` by itself (slot present), so a regeneration keeps the summary.

**Run D: slot above the version heading** (inside `body`, before `## [version]`).

```
$ ../gc --tag v0.2.0 --with-tag-message "$S" -o CHANGELOG.md
$ sed -n 6,20p CHANGELOG.md
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Publish now takes --version; the --tag flag is removed.

## [0.2.0] - 2026-11-27

### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

## [0.1.0] - 2026-11-27

### Added

$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body > /tmp/d.txt; sed -n 1,9p /tmp/d.txt
## Release Notes

### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

## Install demo 0.2.0

$ grep -cF "$S" /tmp/d.txt
0
```

The sentence is in `CHANGELOG.md` but not in the body.

**Run E: the sentence as static text in `[changelog] header`** (after `# Changelog`).

```
$ ../gc --tag v0.2.0 -o CHANGELOG.md
$ sed -n 1,16p CHANGELOG.md
# Changelog

Publish now takes --version; the --tag flag is removed.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-27

### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body > /tmp/e.txt; sed -n 1,9p /tmp/e.txt
## Release Notes

### Added

- --tag removed *(publish)* **BREAKING**
- **Migration:** use --version instead of --tag

## Install demo 0.2.0

$ grep -cF "$S" /tmp/e.txt
0
```

**Run F: dist ignores the tag message.** Clone `an/` of `proj/` (annotated `v0.2.0` kept), `cliff.toml` without the slot, `CHANGELOG.md` regenerated.

```
$ git cat-file -t v0.2.0
tag
$ ../gc -o CHANGELOG.md
$ sed -n 8,12p CHANGELOG.md
## [0.2.0] - 2026-11-27

### Added

- --tag removed *(publish)* **BREAKING**
$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body | grep -cF "$S"
0
```

The tag carries the sentence (`git tag -n` printed `v0.2.0          Publish now takes --version; the --tag flag is removed.`), yet the body lacks it.

**Binary strings (corroboration, not proof).**

```
$ strings dist | grep -ciE 'tag message|tag_message|with-tag'
0
$ strings dist | grep -E 'Found CHANGELOG at|find a suitable changelog entry'
Found CHANGELOG at 
-couldn't find a suitable changelog entry for 
$ strings dist | grep -ciE 'annotated|tag_body|tag annotation'
0
```

The two strings show dist looks a section up by version in a CHANGELOG file; no string refers to a tag message.

**MKT-REL-14 verification command, run on Run B's output** (the committed `CHANGELOG.md` of Run B regenerated first):

```
$ ../dist plan --tag=v0.2.0 --output-format=json | jq -r .announcement_github_body | sed -n '/^## Release Notes/,/^### /p' | sed -n 3p
Publish now takes --version; the --tag flag is removed.
```

Line 3 is the sentence (line 1 `## Release Notes`, line 2 blank).

**MKT-REL-19 static placement check**, run against the three `cliff.toml` variants:

```
$ awk '/^## \[\{\{ version/{h=NR} /\{%-? ?if message %\}/{m=NR} END{exit !(h && m>h)}' cliff.slot.toml;   echo $?
0
$ awk ... cliff.above.toml;  echo $?
1
$ awk ... cliff.header.toml; echo $?
1
```

Exit 0 only for the slot placed after the heading line (Run B variant); the Run D and Run E variants exit 1. The check assumes the heading line begins `## [{{ version` as in grimoire's file.

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| MKT-REL-14 | **change** | Replace the sentence "Tested for the git-cliff lane only (Verdict 7); the cargo-dist lane is unverified, so in a cargo-dist repository the agent asks before relying on it." with: "Tested for both lanes on 2026-11-27 (git-cliff 2.14.2, dist 0.33.0). In a cargo-dist repository the summary reaches `announcement_github_body` only through the committed `CHANGELOG.md`: pass it as `git-cliff --with-tag-message` in the task that writes `CHANGELOG.md`, with a `{% if message %}` slot placed after the version heading in `cliff.toml`. Where the workflow creates the tag (grimoire), the tag cannot be annotated first, so the CHANGELOG entry is the only carrier." Rationale line gains: "dist reads the CHANGELOG section by version and does not read tag messages (dist `announce.rs` v0.33.0; Run F)." |
| MKT-REL-14 verification | **change** (adds one runnable check) | Add: in a repository with `dist-workspace.toml`, `dist plan --tag=<new tag> --output-format=json \| jq -r .announcement_github_body \| sed -n '/^## Release Notes/,/^### /p' \| sed -n 3p` is a non-empty line of at most 30 words, when any of `### Added`, `### Removed`, `### Deprecated` or `**BREAKING` is present. (Line 3 is the first line after the blank following the heading; run on Run B's output, printed the sentence.) |
| MKT-REL-03, -10 (grimoire lane) | **confirm** | The Decay row "`dist plan` output's `announcement_github_body` contains the rendered section" is confirmed by Runs A and B. |
| NEW MKT-REL-19 | **new**, SHOULD | Rule: in a cargo-dist repository, put the `message` slot inside the version section, after the `## [x.y.z]` heading, never in `[changelog] header` or above the heading. Rationale: dist selects the section by version heading; text above it is not in the section and is dropped (Runs D and E: sentence in `CHANGELOG.md`, absent from the body). Verification, both must pass: (a) `awk '/^## \[\{\{ version/{h=NR} /\{%-? ?if message %\}/{m=NR} END{exit !(h && m>h)}' cliff.toml` exits 0 (slot after the heading line); (b) `dist plan --tag=<tag> --output-format=json \| jq -r .announcement_github_body \| grep -cF "<the summary sentence>"` prints 1. |

## Dated facts

| Fact | Source | Date |
|---|---|---|
| dist 0.33.0 exists; grimoire pins it | `https://api.github.com/repos/axodotdev/cargo-dist/releases/tags/v0.33.0`; `/home/mherwig/dev/grimoire-rs/grimoire/dist-workspace.toml:7` | published 2026-09-11; read 2026-11-27 |
| `--with-tag-message [<MSG>]` is a git-cliff flag ("Sets custom message for the latest release") | `https://git-cliff.org/docs/usage/args` (v2.14.0 banner) | fetched 2026-11-27 |
| git-cliff current on PyPI is 2.14.2; 2.14.1 is not installable via `uvx` | `https://pypi.org/pypi/git-cliff/json` | fetched 2026-11-27 |
| dist builds the body as `## Release Notes\n\n` + the changelog section found by version; no tag message used | `https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/src/announce.rs` | tag v0.33.0, fetched 2026-11-27 |
| grimoire writes CHANGELOG.md with `git-cliff --tag ... -o CHANGELOG.md` | `/home/mherwig/dev/grimoire-rs/grimoire/taskfiles/release.taskfile.yml:62` | read 2026-11-27 |
| grimoire's plan job runs `dist host --steps=create --tag=<tag>` (tagged) or `dist plan`, and prints `plan-dist-manifest.json` | `/home/mherwig/dev/grimoire-rs/grimoire/.github/workflows/release.yml:83,85` | read 2026-11-27 |

## What could not be determined

- Behaviour on a real GitHub Actions run. The measurements used local `dist plan`. The workflow uses `dist host --steps=create` for tagged runs, a different subcommand from `plan`; it was not run (needs a push and a dispatch, outside this task's limits). Same manifest field per `announce.rs`, but not observed.
- Whether the secret-masking collision named in grimoire's `cliff.toml` comment can hit a summary sentence. It depends on the repository's secret values, which were not read. Keep summary sentences free of auth-scheme prose.
- Whether dist's CHANGELOG parser tolerates a summary containing a `##` heading. Not tested; the rule caps the summary at one sentence.
- Whether the git-cliff docs differ between v2.14.0 (docs page) and 2.14.2 (run). The flag worked identically in Runs A to D.
- `announce.rs` was read through the fetch tool's extraction, not downloaded byte for byte.

## Sources

| URL | What | Date |
|---|---|---|
| https://api.github.com/repos/axodotdev/cargo-dist/releases/tags/v0.33.0 | dist 0.33.0 release metadata | published 2026-09-11, fetched 2026-11-27 |
| https://github.com/axodotdev/cargo-dist/releases/download/v0.33.0/cargo-dist-x86_64-unknown-linux-gnu.tar.xz | binary used for `dist plan` (downloaded in an earlier run; the binary and its sha256 are shown above) | 2026-09-11 |
| https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/src/announce.rs | body assembly | fetched 2026-11-27 |
| https://git-cliff.org/docs/usage/args | `--with-tag-message` | v2.14.0 page, fetched 2026-11-27 |
| https://pypi.org/pypi/git-cliff/json | git-cliff version 2.14.2 | fetched 2026-11-27 |

Measured against vendor tooling in `~/.cache/research-lang/exemplars/product/wave2/mra-q0r/` only. No tag, commit or file was created in any existing repository.

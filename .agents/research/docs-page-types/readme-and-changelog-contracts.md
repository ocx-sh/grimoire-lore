---
title: README and CHANGELOG contracts
topic: readme-and-changelog-contracts
group: docs-page-types
agent: research-lang-scout
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 13
scope: >
  What a README, a CHANGELOG, and a CONTRIBUTING file each owe as a declared
  page type: required content, forbidden content, and the exact check. Closes
  the wave-1 gap where the shipped glob includes root *.md and 6 of 23 fleet
  surfaces are README-only, but no DOC-TYPE rule and no doc_type value covers
  any of the three. Also closes changelog-migration-link (map line 218,
  dropped from both wave 1 and its deferred list). Does not cover the
  declaration mechanism's syntax (owned by page-type-set-and-declaration.md,
  cross-cutting commission declaration-key-unification) or landing/reference
  contracts (owned by sibling files in this group).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The glob already claims these files; nothing governs them](#1-the-glob-already-claims-these-files-nothing-governs-them)
   2. [Three canonical README templates converge on the same core](#2-three-canonical-readme-templates-converge-on-the-same-core)
   3. [Fleet measurement: 15 READMEs over 100 lines, what each opens with](#3-fleet-measurement-15-readmes-over-100-lines-what-each-opens-with)
   4. [Nine external READMEs, and one counter-example](#4-nine-external-readmes-and-one-counter-example)
   5. [Keep a Changelog 1.1.0, verbatim](#5-keep-a-changelog-11-verbatim)
   6. [The fleet already runs a Keep-a-Changelog convention, half-credited](#6-the-fleet-already-runs-a-keep-a-changelog-convention-half-credited)
   7. [changelog-migration-link: the fleet's real practice is inline, not a link](#7-changelog-migration-link-the-fleets-real-practice-is-inline-not-a-link)
   8. [CONTRIBUTING: one convergent shape, measured on 20 fleet files](#8-contributing-one-convergent-shape-measured-on-20-fleet-files)
   9. [README is not landing](#9-readme-is-not-landing)
3. [Normative guidance candidates — readme](#normative-guidance-candidates--readme)
4. [Normative guidance candidates — changelog](#normative-guidance-candidates--changelog)
5. [Normative guidance candidates — contributing](#normative-guidance-candidates--contributing)
6. [DOC-PLAIN / DOC-TYPE applicability table](#doc-plain--doc-type-applicability-table)
7. [AI-agent angle](#ai-agent-angle)
8. [Contested / evolving](#contested--evolving)
9. [Open questions](#open-questions)
10. [Sources](#sources)

## Summary

- **Ship the contract. Do not exclude these files from the glob.** The Good
  Docs Project ships README as a first-class Core Pack template, GitHub's
  community-profile checklist treats README, CONTRIBUTING and a changelog as
  the health files it checks for, and this fleet already runs 15 READMEs over
  100 lines, 11 root CHANGELOG.md files, and 20 CONTRIBUTING.md files with a
  real, convergent, mostly-uncredited convention nobody has written down.
- **README is not landing.** The wave-1 classifier's own fallback rule files
  all 6 README-only repos as `doc_type: landing` because a README renders at
  a docs root the same way an `index.md` does (`docs-shape.md` §0, §2). A
  README never gets DOC-TYPE-10 through DOC-TYPE-16 by that shortcut; it is a
  third declared type with its own contract, whether or not the repo also has
  a separate landing page.
- **Three canonical README templates (Good Docs, Make a README, GitHub) name
  the same handful of obligations** in different words: what it is, why it
  matters, how to install/run it, where to get help, who owns it, what
  license covers it. None of the three mandates a fixed order beyond
  description-first.
- **The measured fleet violation this contract exists to catch is real and
  already shipped**: `axios`'s README (a widely-used library, fetched
  2026-09-05) opens with two sponsor-tier tables before any project
  description reaches the reader — the exact failure mode "description
  first" is meant to prevent, on a library with 100k+ downloads/week, not a
  hypothetical.
- **Keep a Changelog 1.1.0's category list is `Added, Changed, Deprecated,
  Removed, Fixed, Security`**, in that order, and 11 of 11 fleet
  `CHANGELOG.md` files use a subset of it (`Added`, `Changed`, `Fixed` only —
  `Deprecated`/`Removed`/`Security` appear zero times fleet-wide, because the
  fleet's `git-cliff` commit-parser groups don't map any conventional-commit
  type to them).
- **The fleet already runs a Keep-a-Changelog-shaped convention half in the
  open, half hidden.** 9 of 11 root CHANGELOG.md files explicitly cite
  `keepachangelog.com/en/1.1.0/`; the other 2 (`www-setup`, `setup-ocx`) use
  its exact template sentence ("All notable changes to this project will be
  documented in this file") with no citation. Separately,
  `ocx/.claude/agents/worker-doc-writer.md:57-60` hand-encodes the same
  `Added/Changed/Fixed/Removed` vocabulary as an authoring instruction, also
  uncredited, with no `Deprecated`/`Security` and no check that any of it
  matches what ships.
- **`changelog-migration-link` (map line 218) is real, but the fleet's actual
  practice is not a link to a separate migration guide** — it is an inline
  **Migration:** paragraph inside the same breaking-change entry. Checked
  directly against `grimoire/CHANGELOG.md` (13 `**BREAKING**` entries) and
  `grimoire-indexer/CHANGELOG.md` (10 entries): 0 of 23 carry a markdown link
  to a separate page; 23 of 23 carry inline migration prose. The rule this
  fleet needs is "every breaking entry states its migration inline or links
  one," not "every breaking entry links one" — the map's original framing
  would fail a fleet that is already doing the harder, better thing.
- **CONTRIBUTING converges on one shape across every fleet instance
  checked**: Prerequisites → build/setup → running tests → commit
  conventions → a before-you-submit checklist. Ocx, grimoire and
  grimoire-vscode's files (107, 118, 176 lines) name these five phases in
  the same order independently.
- **License is the one obligation this fleet already satisfies almost
  everywhere.** 14 of 15 README-over-100-lines repos declare or link a
  license; the one gap (`grimoire-lore`, this program's own repo) has
  neither a License section nor a LICENSE file.

## Findings

### 1. The glob already claims these files; nothing governs them

`docs-frame.md`'s shipped glob includes root `*.md`, which matches
`README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` in every repo. Wave 1's
seven consolidations mention "README" exactly once, as a path fragment in
`ocx-sdk-python`'s Sybil test glob (`docs-machine-readers-and-prior-art.md`).
`docs-shape.md` §0 independently confirms 6 of the fleet's 23 documentation
surfaces are README-only, with no `docs/` or `website/` tree at all
(`grimoire-components`, `grimoire-index`, `setup-grimoire`, `setup-ocx`,
`vscode-ocx`, `www-setup`). For those 6, the README is the entire product
documentation, not a front door to something larger. Nothing in the shipped
132-rule set states what any of the three files owes or forbids.

### 2. Three canonical README templates converge on the same core

[The Good Docs Project's README template](https://www.thegooddocsproject.dev/template/readme)
(Core Pack, re-fetched 2026-09-05) lists, in order: logo/badges, project
name, table of contents, description, who the project is for, dependencies,
install/configure/run/troubleshoot instructions, contributing guidelines,
additional documentation links, how to get help, and terms of use (license).
It explicitly marks reordering and section removal as normal, and states
"avoid the passive voice."

[Make a README](https://www.makeareadme.com/) (re-fetched 2026-09-05) gives a
near-identical list — name, description, badges, visuals, installation,
usage, support, roadmap, contributing, authors, license, project status —
and adds two things Good Docs doesn't: "use examples liberally, and show the
expected output if you can," and "too long is better than too short."

[GitHub's own README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
(re-fetched 2026-09-05) is looser — what it does, why it's useful, how to
get started, where to get help, who maintains it — and separately documents
[the community-profile checklist](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
(re-fetched 2026-09-05): README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, a
security policy, an issue template, and a pull-request template are the
seven files it checks for and reports on.

None of the three sources disagrees with either of the others. All three put
the plain-language description before anything else that is optional
(badges, visuals, a table of contents). None gives a numeric threshold for
anything. Good Docs and GitHub both separate "what it does" from "who it's
for" as two distinct obligations; Make a README folds them together.

### 3. Fleet measurement: 15 READMEs over 100 lines, what each opens with

Command, deduped by `git remote get-url origin` (worktree checkouts of the
same remote excluded, matching `docs-shape.md`'s method):

```bash
for f in /home/mherwig/dev/*/README.md; do wc -l < "$f"; done | sort -rn
```

15 distinct repos, by remote, carry a README over 100 lines (`ocx-catalog`
sits at exactly 100 and is excluded as a boundary case, not "over"):

| Repo (remote) | Lines | Opens with | Badges before prose? | License section/file |
|---|---:|---|---|---|
| `ocx-sh/rules_ocx` | 303 | H1, plain description paragraph | No | Yes |
| `ocx-sh/www-setup` | 206 | centered logo, H1, description | No | Yes |
| `grimoire-rs/grimoire-vscode` | 204 | centered logo, H1, description | No | Yes |
| `ocx-sh/vscode-ocx` | 192 | centered logo, H1, description | No | Yes |
| `ocx-sh/setup-ocx` | 190 | centered logo, H1, bold tagline | Yes (3 badges) | Yes |
| `grimoire-rs/indexer` | 173 | H1, plain description, docs link | No | Yes |
| `grimoire-rs/index` | 169 | H1, plain description | No | Yes |
| `grimoire-rs/components` (GitLab) | 165 | H1, plain description, a table | No | Yes |
| `ocx-sh/grimoire-lore` | 160 | H1, plain description | No | **No** |
| `ocx-sh/ocx-mirror-sdk` | 135 | H1, badges immediately, then description | Yes (3 badges) | Yes |
| `ocx-contrib/mirror-bazelbuild` | 114 | H1, plain description | No | Yes |
| `ocx-sh/find_ocx` | 112 | H1, plain description | No | Yes |
| `grimoire-rs/grimoire` | 110 | centered logo, H1, bold tagline | Yes (4 badges) | Yes |
| `grimoire-rs/setup-grimoire` | 107 | centered logo, H1, bold tagline | Yes (4 badges) | Yes |
| `ocx-sh/ocx-mirror` | 104 | centered logo, bare H1, no tagline | No | Yes |

Two clean patterns emerge, both correct: 7 of 15 open with a plain H1 and a
description paragraph and no image at all; 8 of 15 open with a centered logo
above the H1, three of which also stack a badge row before the description
reaches the reader. Every one of the 15 states its description in the first
paragraph — no fleet instance buries it. Separately, 9 of 9 repos that run a
real generator-backed docs site (`ocx`, `ocx-catalog`, `grimoire-indexer`,
`ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-mirror`, `ocx-mcp`, `ocx-indexbot`,
`grimoire`) link their README to that site — confirmed directly for all 9,
not sampled. 14 of 15 declare or link a license; `grimoire-lore` is the one
gap, in this program's own repository.

### 4. Nine external READMEs, and one counter-example

Fetched directly (`raw.githubusercontent.com`, 2026-09-05), not from a
summary:

| Project | Kind | Opens with | Install location | Docs link |
|---|---|---|---|---|
| [uv](https://github.com/astral-sh/uv) | CLI | H1, 3 badges, one-sentence description, *then* a benchmark image | `## Installation`, 2nd heading | `docs.astral.sh/uv` |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | CLI | setext H1, full description paragraph, *then* badges | `### Installation`, 10th heading | `GUIDE.md`, `FAQ.md` |
| [fd](https://github.com/sharkdp/fd) | CLI | H1, badges, translation links, 3-sentence description | `## Installation`, 7th heading | none separate |
| [bat](https://github.com/sharkdp/bat) | CLI | centered logo, badges, one-sentence description, all in one block | `## Installation`, 7th heading | none separate |
| [jq](https://github.com/jqlang/jq) | CLI | H1, one-paragraph description, no badges | `## Installation`, 2nd heading | `jqlang.org` |
| [requests](https://github.com/psf/requests) | library | H1, 5 badges, bold one-sentence description, *then* a runnable code example | inline in prose, before any heading | `requests.readthedocs.io` |
| [axios](https://github.com/axios/axios) | library | **two sponsor-tier tables**, *then* logo, *then* one-line description | `## Installing`, several headings down | website + docs links |

Description-before-badges and description-before-image are both real,
common patterns (ripgrep, jq); badges-before-description is also real and
common (uv, fd, bat, requests) and not itself a defect — a badge row is
metadata, not content, and a reader's eye skips it. The one real defect is
axios: non-project content (sponsor logos, in two full tables) precedes the
description that says what the library even is. This is the fetched,
verbatim counter-example the "description before anything that is not
metadata" rule exists to catch, on a library most JavaScript developers
already trust — it is not a strawman.

Install-command placement varies by register: CLI tools that lead with "why
use this" (ripgrep, fd, bat) put installation well down the page, after
features and a demo; CLI tools that lead with the command itself (uv, jq)
put it second. Neither placement is wrong. What is constant across all 7:
every one has an install section or command *somewhere* in the file, and
every one is reachable from the table of contents or the first screenful of
links when one exists.

### 5. Keep a Changelog 1.1.0, verbatim

Re-fetched [keepachangelog.com/en/1.1.0/](https://keepachangelog.com/en/1.1.0/)
2026-09-05. Seven guiding principles, the fourth stated as its opening line:
"Changelogs are for humans, not machines." The fixed category list, in the
spec's own order:

> `Added` for new features. `Changed` for changes in existing functionality.
> `Deprecated` for soon-to-be removed features. `Removed` for now removed
> features. `Fixed` for any bug fixes. `Security` in case of vulnerabilities.

Structural requirements: a header stating "All notable changes to this
project will be documented in this file," an `## [Unreleased]` section kept
at the top to track upcoming changes, version headings shaped
`## [1.0.0] - 2017-06-20` (bracketed version, hyphen, ISO 8601 date), newest
version first. Explicit don'ts: never use a raw commit-log diff as the
changelog ("they contain excessive noise"), never omit deprecations, never
use a regionally ambiguous date format, never document some releases and
skip others.

### 6. The fleet already runs a Keep-a-Changelog convention, half-credited

11 root `CHANGELOG.md` files measured directly
(`rules_ocx`, `www-setup`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx`,
`grimoire-indexer`, `ocx-mirror-sdk`, `find_ocx`, `grimoire`, `ocx-mirror`,
`ocx-catalog`):

- 11 of 11 use `### Added` / `### Changed` / `### Fixed` category headings,
  spelled exactly as the spec states them. 0 of 11 ever produce `Deprecated`,
  `Removed`, or `Security` — every one of these files is generated by
  `git-cliff`, and none of the fleet's `cliff.toml` commit-parser configs
  maps any conventional-commit type to those three groups. The three unused
  categories are a config gap, not a content violation; a rule that fails a
  file for never using `Security` would fail every changelog in this fleet
  including the ones doing everything else right.
- 9 of 11 cite `keepachangelog.com/en/1.1.0/` by name and link
  (`ocx/cliff.toml`'s header template is one of them, confirmed by direct
  read: *"The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)... and this project adheres to [Semantic Versioning]"*).
  2 of 11 (`www-setup`, `setup-ocx`) use the spec's own template sentence —
  "All notable changes to this project will be documented in this file" —
  verbatim, with no citation anywhere in the file.
- Separately, `ocx/.claude/agents/worker-doc-writer.md:57-60` hand-encodes
  the same category vocabulary as an authoring instruction: *"Format:
  `### [version] - YYYY-MM-DD` with `#### Added/Changed/Fixed/Removed`
  sections. Breaking changes marked **Breaking:** prefix. Each entry links to
  relevant doc sections."* This never names Keep a Changelog, never lists
  `Deprecated` or `Security`, and states "each entry links to relevant doc
  sections" with nothing that checks whether those links resolve. This is
  the exact claim wave 1's map made (`config-inventory.md`, cited at map line
  218) and it is confirmed against the primary file, not summarized from it.
  Note this is a different artifact from `ocx/cliff.toml`, which is fully
  and correctly credited — the credited convention governs what the
  generated file looks like; the uncredited one governs what a writing agent
  is told to produce by hand. Both exist in the same repository.
- Only 1 of 11 (`vscode-ocx`) carries a live `## [Unreleased]` heading at
  measurement time. This is not a violation of the other 10 — `git-cliff`
  collapses `Unreleased` into a dated version heading at release time and
  regenerates an empty one only once new commits land, so a point-in-time
  snapshot with no pending changes correctly has none. **A check that fails
  a changelog for lacking `## [Unreleased]` would misfire on every repo
  between a release and its next merged commit** — this must not ship as a
  static per-commit check; it belongs to a release-time or CI-cadence check
  instead, or not at all.

### 7. changelog-migration-link: the fleet's real practice is inline, not a link

Directly measured against `grimoire/CHANGELOG.md` (13 `**BREAKING**`
entries) and `grimoire-indexer/CHANGELOG.md` (10 entries), 23 total: every
single one carries an adjacent `**Migration:**` paragraph in plain prose
stating what changed and what a consumer does about it. Example
(`grimoire/CHANGELOG.md:749-750`):

> Collapse access modes to online/offline *(access)* **BREAKING**
> **Migration:** the `--remote` flag and `GRIM_REMOTE` environment variable
> are removed. Online resolution (always fresh) is now the default; no flag
> is needed. Use `--offline` for cache-only behaviour.

Zero of the 23 entries carry a markdown link (`grep -c 'BREAKING.*\[.*\]('`
returns 0 on both files) to a separate migration-guide page. Two entries
reference another file by bare name inside the migration prose
(`grimoire-indexer/CHANGELOG.md:97`: *"`README.md` carries the migration
note"*; `grimoire/CHANGELOG.md:513`: *"Design record:
.claude/artifacts/adr_mcp_percall_scope_fetch_render.md"*) — both unlinked,
neither resolvable by a link checker as written. One entry states there is
no migration at all (`grimoire/CHANGELOG.md:686`: *"No migration is
provided (provisional project)"*), which is a valid, checkable answer, not a
gap.

This overturns the map's framing. `docs-topic-map.md` line 218 asks "does
each breaking-change entry link to a migration guide" — the honest fleet
answer is that it should not have to. Inline migration prose next to the
entry it explains is *more* discoverable than a separate linked page (no
extra click, no separate page to keep in sync, no dead-link risk), and Keep
a Changelog's own founding principle — "for humans, not machines" — favors
exactly this shape. The rule that fits the measured evidence is: **every
entry marked breaking states its migration path**, either as inline prose
in the same entry or as a link to a separate guide when the change is large
enough to need one — and *when* a link is used, it must resolve, checked by
DOC-NAV-08's resolver (`docs-navigation-search.md`), reused rather than
reinvented. The two bare-filename references measured above would fail
under "any file-path mention inside a Migration note must be a real
markdown link," which is the one part of this fleet's practice that is
worth tightening rather than just codifying.

### 8. CONTRIBUTING: one convergent shape, measured on 20 fleet files

20 `CONTRIBUTING.md` files exist fleet-wide
(`find /home/mherwig/dev -maxdepth 2 -iname CONTRIBUTING.md | wc -l`). Three
checked in full (`ocx`, 107 lines; `grimoire`, 118 lines; `grimoire-vscode`,
176 lines) name the same five phases, in the same order, independently:
Prerequisites → build/dev-setup → running tests → commit conventions →
a before-you-submit checklist. `grimoire-vscode`'s file additionally names
"Verify before you commit" as its own heading between setup and testing,
which is the same phase under a different label. None of the three opens
with anything but a plain H1 and, in two of three, a one-line Prerequisites
list — no marketing content, no badges, consistent with CONTRIBUTING being
addressed to someone already committed to the project, not a first-time
visitor being sold on it. Only 2 of the 15 READMEs measured in §3
(`grimoire-vscode`, `vscode-ocx`) carry an inline `## Contributing` section
in addition to the separate file; the other 13 either link out or say
nothing inline. `grimoire-lore` (this program's own repository) is the one
measured case of an inline "Contributing a package" section with **no**
separate `CONTRIBUTING.md` file at all — the inverse gap from most of the
fleet.

### 9. README is not landing

`docs-shape.md`'s page-type classifier (§2) is an ordered substring match
that falls back to `landing/index` for anything at a root `index` or
`README` path. Its own author states this is "a path heuristic, not a
content parse" with a "known blind spot" — this is that blind spot, made
concrete: all 6 README-only repos in the fleet inventory
(`grimoire-components`, `grimoire-index`, `setup-grimoire`, `setup-ocx`,
`vscode-ocx`, `www-setup`) are recorded as `landing=1 (README-only)` in
`docs-shape.md` §2's per-repo table. Under DOC-TYPE-01/02's declaration
rule this stops happening automatically once the six get a real
declaration — but only if `readme` is a registered enum value distinct from
`landing`, because a README and a landing page fail different obligations.
A landing page's DOC-TYPE-11 wants a runnable command or a CTA link before
its first `##`; a README's own equivalent obligation (§ Normative guidance
candidates below) is looser, because a README is read on GitHub/GitLab's
own renderer, not a site with its own hero-and-CTA layout convention, and a
repo can have both a README and a separate landing page saying different,
complementary things (17 of 23 fleet repos do). Conflating the two types
would either loosen the landing contract to fit README's register or
tighten README's register to fit landing's — both wrong. They stay two
values in the enum.

## Normative guidance candidates — readme

1. **A README's plain-language description of what the project is and does
   must appear before any content that is not itself descriptive metadata**
   (a logo, a badge row, a table of contents). Sponsor tables, funding
   appeals, translation-link rows, and feature lists all count as
   non-metadata content that must come after, not before. — *Rationale*:
   Good Docs, Make a README, and GitHub's own guidance all lead with
   description; the fetched axios README is the measured, real counter-case
   this exists to catch. — *Verify*: strip a leading centered-image block,
   a contiguous run of badge-only lines, and a table of contents; the next
   non-blank line must be prose of at least one sentence, and it must
   precede the first `<table>` or `|---|` markdown table in the file. —
   **measured** (axios, fetched 2026-09-05) plus **codified** (Good Docs
   Core Pack, re-fetched 2026-09-05).
2. **A README must name or link the one action that gets a new reader from
   zero to using the project**: an install command, a dependency-manager
   snippet (`pip install`, `npm install`, a Bazel `bazel_dep`, a GitHub
   Actions `uses:` line), or — when the project is not directly installable
   (a data repo, a docs site, a marketplace-distributed editor extension) —
   an explicit link to wherever that happens. — *Rationale*: this is
   README's version of a landing page's reachable-action contract
   (DOC-TYPE-11), generalized past "one command" because this fleet's own
   READMEs cover CLI installs, Bazel/CMake integration snippets, GitHub
   Action `uses:` lines, and marketplace links, and a single fenced-shell-
   block check would false-positive-fail all but the CLI case. —
   *Verify*: `grep` for a fenced code block anywhere in the file under a
   heading matching `/install|quick.?start|usage|get(ting)? started/i`, OR a
   markdown link whose visible text matches the same pattern. — *Evidence*:
   **measured**, already satisfied by 15 of 15 fleet READMEs over 100 lines
   and by all 7 fetched external CLI/library READMEs (§3, §4).
3. **A README must link to the project's own full documentation site when
   one exists**, rather than growing a second copy of it. — *Rationale*:
   duplicated content forks into two answers the moment either side is
   edited once without the other; a link keeps one source of truth. —
   *Verify*: for a repo whose `docs-shape.md`-style generator scan finds a
   `mkdocs.yml`, `.vitepress`, or `book.toml`, the README must contain a
   link whose host matches that generator's configured deploy target. —
   *Evidence*: **measured**, already satisfied 9 of 9 in this fleet (§3).
4. **State or link a license.** — *Rationale*: Good Docs's "Terms of Use,"
   Make a README's "License," and GitHub's community-profile checklist all
   name this as a required health file, and it is the fleet's own,
   near-universal norm already. — *Verify*: a `## License` heading, or a
   `LICENSE`/`LICENSE.md` file in the repo root plus a mention of it in the
   README. — *Evidence*: **measured**, 14 of 15 fleet READMEs already
   satisfy this; the one gap is this program's own repository
   (`grimoire-lore`), named here rather than smoothed over.
5. **State who the project is for, in one sentence or through
   task-labelled links**, distinct from stating what it does. — *Rationale*:
   Good Docs and GitHub both name this as separate from the description;
   a reader can know exactly what a tool does and still not know whether
   they are the intended user. — *Verify*: reading heuristic — a reviewer
   checks whether the first paragraph or the immediately following one
   names a reader role, a prerequisite ("if you already use X"), or a
   problem the reader has. `unverified: reading heuristic`. — *Evidence*:
   **argued** — no fleet measurement exists for this specific sentence
   because §3's 15 READMEs were not individually re-read for it; ships at
   CONSIDER, not MUST or SHOULD, until that measurement is done.
6. **Never publish placeholder text.** — *Rationale/Verify/Evidence*:
   identical to DOC-TYPE-14, unchanged; scope simply extends to
   `doc_type: readme`.
7. **A README must not be scoped by DOC-TYPE-10 through DOC-TYPE-16 (the
   landing family).** — *Rationale*: finding 9 — a README is read on a
   forge's own renderer under different structural constraints than a
   generator-rendered landing page, and a repo may carry both, each saying
   something different. — *Verify*: the landing-family checks' `applies to`
   column must read `landing`, never `landing, readme` or the union of the
   two — a scope-exclusion, not a runtime check. — *Evidence*: **measured**
   (`docs-shape.md` §2's own misclassification, cited verbatim in finding 9).

## Normative guidance candidates — changelog

1. **Category headings, where used, must be spelled exactly as Keep a
   Changelog states them**: `Added`, `Changed`, `Deprecated`, `Removed`,
   `Fixed`, `Security` — never a synonym (`Bugfixes`, `Breaking`, `Updates`)
   in the heading itself. A project is never required to produce all six;
   most of this fleet's tooling structurally cannot produce `Deprecated`,
   `Removed`, or `Security` without a commit-parser config change, and a
   rule demanding all six would fail every changelog in the fleet. —
   *Rationale/Evidence*: **normative** (spec, re-fetched 2026-09-05) for the
   spelling; **measured** (finding 6, 0 of 11 fleet files ever produce the
   other three, traced to a `cliff.toml` config gap, not a content defect)
   for why "all six" would be the wrong bar. — *Verify*: every `### `-level
   heading inside a version section matches the fixed list case-for-case,
   or is `Unreleased`/a bare version heading.
2. **Never let a changelog be a re-rendered commit log**: a version section
   must contain human-facing change descriptions, not raw commit subjects
   or hashes. — *Rationale*: Keep a Changelog's own explicit don't. —
   *Verify*: reading heuristic — flag a version section where every line
   matches a Conventional Commits type prefix (`feat:`, `fix:`, `chore:`)
   verbatim with no rewrite. `unverified: reading heuristic`. — *Evidence*:
   **normative** (spec states this directly), check **argued** (no
   canonical source specifies the grep; this program's own construction).
3. **Every entry marked as a breaking change must state its migration path**:
   inline prose in the same entry describing the concrete change and what a
   consumer does, an explicit "no migration needed" statement, or a
   markdown link to a separate migration guide for a change too large to
   state inline. Any file-path mention inside that statement must be an
   actual markdown link, not a bare filename. — *Rationale*: this fleet's
   own, already-good practice (finding 7) — 23 of 23 measured breaking
   entries already carry inline migration prose; the gap is only the two
   bare-filename references that should be real links. — *Verify*: for
   every line matching `\*\*BREAKING\*\*` (or the project's own equivalent
   marker), the next 1-3 lines must contain either `[Mm]igration` prose of
   at least one sentence, an explicit "no migration" statement, or a
   markdown link `\[.*\]\(.*\)`. Where a link is present, resolve it with
   the same checker DOC-NAV-08 specifies (`docs-navigation-search.md`) —
   reused, not reinvented. A bare filename with no `[...]( ...)` wrapper
   inside a migration statement fails. — *Evidence*: **measured** (finding
   7, `grimoire/CHANGELOG.md`, `grimoire-indexer/CHANGELOG.md`, 23 entries,
   0 links, 23 inline statements, 2 bare-filename mentions). Closes
   `changelog-migration-link` (map line 218).
4. **`## [Unreleased]` presence must never be checked as a static, per-commit
   gate.** — *Rationale*: finding 6 — a `git-cliff`-style generator
   correctly omits it between a release and the next merged commit; 10 of
   11 fleet files have none right now for exactly that reason, and every
   one of them is compliant. — *Verify (negative)*: no check in `checks/`
   may fail a build for a missing `Unreleased` heading; if this signal is
   wanted at all, it belongs to a release-preparation step (does the
   *about-to-be-tagged* version's content currently sit under
   `Unreleased`?) or a scheduled staleness check, never a per-page lint. —
   *Evidence*: **measured** (finding 6, 10 of 11 fleet files, all compliant
   despite the absence).
5. **Credit the format when the project follows Keep a Changelog.** — 9 of
   11 fleet files already do; the 2 that don't (`www-setup`, `setup-ocx`)
   use the spec's own template sentence uncredited, which reads as an
   invented convention to a maintainer who has never seen the source. —
   *Rationale*: matches this program's own DOC-TYPE-06 citation
   requirement for borrowed language elsewhere in the ruleset — borrowing a
   template sentence and dropping its citation is the same defect whether
   the borrowed thing is an analogy or a changelog header. — *Verify*:
   `grep -L 'keepachangelog.com'` over files whose header sentence matches
   the spec's own wording (`grep -l "All notable changes to this project"`)
   — a match on the second grep with no match on the first fails. —
   *Evidence*: **measured** (finding 6, 2 of 11 fleet files).

## Normative guidance candidates — contributing

1. **A CONTRIBUTING file states, in order: prerequisites, how to build/set
   up a working copy, how to run the tests, the project's commit-message
   convention, and a checklist to run through before opening a change.** —
   *Rationale*: three fleet instances converge on exactly this order,
   independently authored (finding 8) — not a single template copied
   three times, three separate files agreeing. — *Verify*: five heading-
   pattern matches in file order (`/prereq/i`, `/build|setup|install/i`,
   `/test/i`, `/commit/i`, `/before|checklist|submit/i`); report which
   phases are missing rather than a single pass/fail, since a thin project
   may legitimately skip one. — *Evidence*: **measured** (3 of 3 fleet
   files checked in full; 20 exist fleet-wide, not all read).
2. **Never open a CONTRIBUTING file with marketing or onboarding-sell
   content** — no logo block, no feature pitch, no badge row. — *Rationale*:
   its reader has already decided to contribute; re-selling the project
   wastes the one thing they came for. — *Verify*: the first heading-level
   element must be Prerequisites or an equivalent setup step, never an
   image or a badge line. — *Evidence*: **measured** (3 of 3 fleet files
   checked open exactly this way).

## DOC-PLAIN / DOC-TYPE applicability table

| Rule | readme | changelog | contributing | Disposition |
|---|---|---|---|---|
| DOC-TYPE-01, 02 (declare, no path inference) | applies | applies | applies | Unchanged mechanism. Enum needs three new values — feeds `declaration-key-unification` directly, does not resolve it alone. |
| DOC-TYPE-10..16 (landing family) | **excluded** | excluded | excluded | Carve-out (finding 9): README is a distinct type, never scoped by the landing family regardless of a repo's fallback classifier. |
| DOC-TYPE-14 (no placeholder) | applies | applies | applies | Unchanged. |
| DOC-TYPE-15 (trust claim needs a link) | applies | n/a | n/a | Unchanged — this is exactly where a README's "10-100x faster" register lives; uv's own README already links its claim (§4). |
| DOC-PLAIN-01 (no em/en dash, semicolon, curly quote) | applies | applies | applies | Unchanged. |
| DOC-PLAIN-02, 03 (sentence/paragraph length) | applies | applies (list items) | applies | Unchanged; changelog entries are short list items and pass this vacuously in practice. |
| DOC-PLAIN-05, 06 (Flesch reading ease) | applies | **carve-out** | applies | Changelog entries are engineering shorthand by design ("Wrap list reports in an items envelope") — dense, not badly written. Exempt `doc_type: changelog` the same way DOC-PLAIN-11 already tries to and currently cannot (no enum value exists yet). |
| DOC-PLAIN-07 (identifiers in code spans) | applies | applies | applies | Unchanged, and directly useful — changelog entries are full of flag and field names. |
| DOC-PLAIN-09 (no unverifiable claim) | applies | applies | applies | Unchanged. |
| DOC-PLAIN-11 (no time-relative words) | applies | **exempt** | applies | Registers the `changelog` value the rule's existing "all except changelog" clause already names but cannot enforce today — this is the fix, not a new carve-out. |
| DOC-PLAIN-12 (no marketing superlatives) | applies | n/a | n/a | Unchanged; already satisfied when paired with DOC-TYPE-15 (a superlative needs a link) — uv's "extremely fast" is the passing instance, not a violation, because it links `BENCHMARKS.md`. |
| DOC-PLAIN-13 (real headings, no skipped levels) | applies | applies | applies | Unchanged. |
| DOC-TYPE-04, 05 (reference tone, opinions only in explanation) | n/a | n/a | n/a | Neither rule's `applies to` includes these three types; no carve-out needed, just confirm the scope column never grows to include them. |

## AI-agent angle

- **Writes the README last, from memory of what the project "should" say**,
  producing a generic pitch instead of the actual install command and the
  actual docs-site URL — the opposite failure from axios's sponsor-table
  problem, but the same root cause (content decided before the one fact a
  reader needs). *Check*: candidate 2 above, run against the real
  `pyproject.toml`/`Cargo.toml`/`package.json`/generator config rather than
  an assumed install method.
- **Copies a changelog category name from memory instead of the spec**
  (`Bugfixes` instead of `Fixed`, `Breaking Changes` as a heading instead of
  a per-entry marker) — training data carries many changelog dialects, and
  an agent asked to "add a changelog entry" has no signal which one this
  project committed to. *Check*: candidate 1 above (changelog), scoped to
  the six exact spellings.
- **States a migration as a vague forward pointer** ("see the docs for
  migration steps") instead of the concrete before/after this fleet's own
  entries already write. *Check*: candidate 3 above (changelog) — the
  1-3-line lookahead for real migration prose, not just the word
  "migration" appearing somewhere on the page.
- **Re-explains the whole project inside CONTRIBUTING** because "be
  thorough" reads as "restate the pitch," producing the marketing-open
  defect candidate 2 (contributing) exists to catch.
- **Skips the citation when borrowing Keep a Changelog's own template
  sentence**, because the sentence is common enough in training data to
  feel like public-domain boilerplate rather than a named specification —
  this fleet's own `www-setup` and `setup-ocx` are living proof an agent (or
  a human copying one) already did this. *Check*: candidate 5 above
  (changelog).

## Contested / evolving

- **Whether "who is this for" needs its own sentence or is satisfied
  structurally**, the way `landing-page-contract.md` §5 resolved the same
  question for landing pages via task-labelled links instead of prose. This
  file ships candidate 5 (readme) at CONSIDER rather than resolving it the
  same way, because the landing resolution rested on a direct fleet
  measurement (`ux-observability-posture.md` §7, `ocx-catalog`'s task-keyed
  grid) that has no README-specific equivalent yet. A future round could
  re-run that same measurement against the 15 READMEs in §3 specifically.
- **Whether a badge row before the description is ever itself a defect.**
  This file's position (finding 1, candidate 1) is that it is not — 8 of 15
  fleet READMEs and 4 of 7 fetched external READMEs do it, with no measured
  reader-harm evidence found anywhere in this research program's corpus.
  Treat metadata-before-content as settled-fine; treat non-metadata-content-
  before-description (axios's sponsor tables) as the actual, narrower
  target. A stricter reading that bans any badge row before the first
  sentence would fail the majority of well-regarded fleet and external
  instances measured here.
- **Whether `Deprecated`/`Removed`/`Security` should ever become a MUST for
  this fleet specifically.** Not resolved here — it depends on whether any
  fleet project ships a security fix or a deprecation cycle worth flagging,
  which is a product decision, not a docs one. Finding 6 states only that
  demanding all six categories today would be miscalibrated against every
  measured instance.

## Open questions

### Needs a human decision

1. **Does `grimoire-lore` — this program's own repository — add a LICENSE
   file as part of adopting this contract?** It is the one measured gap in
   §3 (14 of 15 satisfy candidate 4; this repo does not). Fixing it is out
   of this research file's scope, but shipping a rule that immediately
   fails the repo generating it is worth the owner's attention.
2. **Does CONTRIBUTING get a full contract in this program, or a thinner one
   than README and changelog?** The brief for this commission named
   CONTRIBUTING as "do the same for," but the measured fleet evidence (3
   files read in full of 20 that exist) is thinner than README's (15 read)
   or changelog's (11 read). The two candidates shipped here are the
   confident ones; a deeper pass reading more of the 20 fleet files could
   surface more before this becomes a MUST-heavy contract rather than the
   two SHOULD-level candidates shipped here.

### Deserves another research round

- **`readme-audience-sentence-measurement`** — candidate 5 (readme) ships at
  CONSIDER specifically because no one has gone back through the 15 fleet
  READMEs in §3 and scored each one against "does it name who this is for."
  That measurement would let the rule move to SHOULD or MUST honestly,
  the way `page-type-set-and-declaration.md` §6 did for the type-mixing
  check.
- **`readme-vs-landing-cross-link-contract`** — 17 of 23 fleet repos have
  both a README and a separate landing page. Neither this file nor the
  landing contract states whether one must link to the other, or what
  happens when they say materially different things about the same
  project. Named, not resolved.
- **`contributing-fleet-wide-measurement`** — only 3 of the fleet's 20
  `CONTRIBUTING.md` files were read in full for this research. A full pass
  would either confirm the five-phase shape at higher confidence or reveal
  fleet instances that break it.

## Sources

| URL | What it is | Why worth reading |
|---|---|---|
| https://www.thegooddocsproject.dev/template/readme | Good Docs Project README template (Core Pack) | The 11-section canonical structure this contract's README candidates are checked against |
| https://www.makeareadme.com/ | Make a README | A second, independently-worded template converging on the same core, plus "too long beats too short" |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes | GitHub README guidance | The forge's own minimal list (what/why/how to start/help/maintainers) and file-location precedence |
| https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories | GitHub community-profile checklist | Names README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue/PR templates as the health files GitHub itself checks for |
| https://keepachangelog.com/en/1.1.0/ | Keep a Changelog 1.1.0 | The exact six-category list, the Unreleased convention, and the explicit don'ts, verbatim |
| https://github.com/astral-sh/uv | uv README (fetched raw) | CLI exemplar: badges-then-description, install as the 2nd heading, a linked benchmark claim |
| https://github.com/BurntSushi/ripgrep | ripgrep README (fetched raw) | CLI exemplar: description before badges, install deferred past feature content, external GUIDE.md/FAQ.md |
| https://github.com/sharkdp/fd | fd README (fetched raw) | CLI exemplar: badges plus translation links before a 3-sentence description |
| https://github.com/sharkdp/bat | bat README (fetched raw) | CLI exemplar: centered logo/badge/description as one block, install deferred |
| https://github.com/jqlang/jq | jq README (fetched raw) | CLI exemplar: no badges at all, documentation link as the 2nd heading |
| https://github.com/psf/requests | requests README (fetched raw) | Library exemplar: 5 badges, one-sentence description, then a runnable example before any prose |
| https://github.com/axios/axios | axios README (fetched raw) | Library counter-example: two sponsor tables precede the project description entirely |
| `ocx/.claude/agents/worker-doc-writer.md:57-60` | fleet primary source | The uncredited Keep-a-Changelog-shaped authoring instruction this research confirms against the file directly |

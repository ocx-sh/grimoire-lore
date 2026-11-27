---
title: Product program — phase 7 authoring plan (UX, marketing, channels)
program: product
date: 2026-11-27
status: ready for authoring
inputs: product-frame.md, ux-topic-map.md, marketing-topic-map.md, channel-topic-map.md, product-resume/selection-*.json, product-resume/wave1-result-*.json, the 23 consolidations, product-audit/, product-owner-decisions.md
units: product-resume/authoring-units.json
---

# Product program — authoring plan

This plan turns the 23 consolidated rulesets into 21 publishable artifacts. It
decides the artifact list, the globs, which rule IDs sit in each rule body and
which depth file holds every other one, the skill descriptions and outlines, the
collisions with the existing catalog, the bundles, the catalog entries, and the
authoring units that write all of it in parallel.

Rule IDs are stable. Counts and some severities move while the wave-2 revision
edits the consolidations in place, so this plan names families and IDs, never
frozen counts. Every authoring worker re-reads its source consolidations when it
writes, and the consolidation's severity at that moment is authoritative.

Contents: [Decisions](#decisions) · [Artifact table](#artifact-table) ·
[What was measured](#what-was-measured) · [Authoring contract for every unit](#authoring-contract-for-every-unit) ·
[Rule specs](#rule-specs) · [Skill specs](#skill-specs) ·
[Collision table](#collision-table) · [Bundles](#bundles) ·
[Catalog entries](#catalog-entries) · [Units](#units)

## Decisions

1. **Two rules, not four.** `ux-quality` and `marketing-quality` are the only
   rules. Each has a reference skill. The proposed `site-discoverability` rule
   is merged into `marketing-quality`, because its globs (`astro.config.*`,
   `mkdocs.yml`, site head config) are the same files that carry the MKT-POS
   site description, and same glob means same rule. The proposed
   `channel-publishing` rule becomes a skill (decision 3).
2. **`marketing-copy` is renamed `marketing-quality`.** It now owns claims,
   positioning drift, the first screen, voice and discoverability, not copy
   alone, and the name follows the catalog's `<domain>-quality` index
   convention beside `docs-quality` and `ux-quality`.
3. **The channel boundary is a skill that every channel skill requires.** A rule
   on `marketing/**` or `**/*.post.md` is a filename guess. Scoped rules fire on
   read, not on create, and a post draft is a new file. Rules also reach only
   four clients. So `channel-publishing` ships as a skill with a strong
   description, each platform skill requires it through `grim.requires.skills`,
   and each platform skill repeats the five boundary MUSTs in a few lines
   (bounded duplication, as for review skills).
4. **Three UX skills beside the rule, not four.** The CLI and agent surfaces have
   no glob the rule can reach (their source is `.rs`, `.go`, `.py`, `.ts`), so
   they need description-triggered skills: `ux-cli` (UX-CLI plus the CLI rows of
   UX-TEXT and UX-ACT) and `ux-agent-interfaces` (all of UX-AGENT plus the agent
   rows of UX-ACT). The proposed `ux-ai-reference` is dropped: UX-AI governs
   chat and model-output UI written in `.tsx`, `.vue` and `.html`, which the
   rule's glob reaches, so it is one depth file of `ux-quality-reference`.
   `ux-review` is the on-demand procedure.
5. **Release notes are one skill, separate from the launch.** The proposed
   `release-announcement` becomes `release-notes` and absorbs the GitHub Release
   mechanics CH-GH-07 to CH-GH-12. A release happens every time; a launch is
   rare, and CH-LAUNCH-07 forbids treating a routine release as one. The word
   "announcement" is dropped because it collides with `launch-plan`'s trigger.
6. **Microblogs get their own skill.** `microblog-post` (CH-MB) ships as a
   skill, not a section of `launch-plan`. A routine release post on X, Bluesky,
   Mastodon or Threads never triggers a launch skill.
7. **Community health moves to GitHub.** CH-COM-16 to CH-COM-20 (Discussions,
   issue-chooser routes, `SUPPORT.md`, code-of-conduct contacts) ship in
   `github-presence`, next to CH-GH-06 (the organisation `.github` repository),
   where a user editing those files looks. `community-post` keeps the venues
   and chat rows.
8. **One dated facts file per platform skill.** Each platform skill ships
   `references/facts.md`: a Markdown table in the CH-CORE-12 registry format
   (`id, platform, fact, value, url, source_date, verified, refresh_days,
   provenance, expect`). `channel-publishing/checks/facts_check.py` validates
   every such file and fails when `verified + refresh_days` is past
   (CH-CORE-13). The catalog's own `task artifacts` runs it, so a stale fact
   turns catalog CI red and the stated cadence is enforced, not hoped for.
   Multi-topic reference skills (`ux-quality-reference`,
   `marketing-quality-reference`) carry a "Dates and versions" section at the
   top of each depth file instead.
9. **Two bundles.** `ux-essentials` (the build side) and `product-essentials`
   (marketing and channels, the sell side). grim refuses nested bundles, so the
   proposed `ux-essentials` inside `product-essentials` cannot exist. Marketing
   and channels stay in one bundle because every channel skill cites the
   MKT-CLAIM policy for numbers and claims in a draft (frame correction 10).
10. **Scripts are Python 3.11 stdlib where the check is static.** A check that
    needs a rendered browser page is a Node module on Playwright with exact
    pinned versions, because UX-VERIFY-02 already fixes Playwright and one
    browser dependency is cheaper than two. The research's puppeteer-core
    scripts are ported to Playwright. A check that needs a platform's own
    counter library (twitter-text, `@atproto/api`) is a Node module. Node
    modules are shipped and documented but not self-tested in catalog CI. Every
    Python script has fixtures and `--self-test`.
11. **The gate scripts live in the reference skill, not in `ux-review`.** The
    owner asked for `ui-matrix.mjs` and `wcag22-ids.txt` "in the UX review
    skill". They ship in `ux-quality-reference/checks/` instead, because
    UX-VERIFY-13 runs the matrix after every markup change, from the rule.
    `ux-review` requires `ux-quality-reference` and runs the same files. The
    owner's precondition (ship them before the ruleset is published) holds.
12. **MKT-SEO-19 (`llms.txt`) does not ship.** `docs-quality` DOC-AGENT-04
    already owns `llms.txt`, and the two rows disagree on the trigger. Two
    contradicting rules are worse than one. The owner's alignment decision is
    left open (see the collision table).
13. **Owner-gated cross-edits are listed, not applied**, except two that the
    research names as publishing preconditions: the `docs-quality.md:184-186`
    pointer and the DOC-PLAIN-08 exemption for AI-feature disclosure. A third,
    the analytics deferral in `docs-instrument` and DOC-OBS-16, is applied as a
    precondition clause only, because the catalog otherwise contradicts itself
    on whether a page-analytics script may be added (MKT-MEAS-01).
14. **Pending owner decisions do not change severities.** Every row ships at the
    severity its consolidation states when the worker writes it. A row whose
    severity waits on an owner decision says so in one clause.

## Artifact table

21 artifacts: 2 rules, 2 reference skills, 15 skills, 2 bundles.

| # | Name | Kind | Verdict versus the proposals |
|---|---|---|---|
| 1 | `ux-quality` | rule | Kept (UX map). Glob widened to `.css` and `.scss` so focus, contrast and motion edits in stylesheets load it |
| 2 | `ux-quality-reference` | reference skill | Kept, and absorbs the proposed `ux-ai-reference` depth for human-facing AI features |
| 3 | `ux-cli` | skill | Renamed from `ux-cli-reference`. Model-invoked by description, because no rule glob reaches CLI source |
| 4 | `ux-agent-interfaces` | skill | New. Split out of the proposed `ux-ai-reference`: all of UX-AGENT plus UX-ACT-18 to 28 |
| 5 | `ux-review` | skill | Kept (UX map), now the on-demand procedure over all three UX artifacts |
| 6 | `ux-essentials` | bundle | Kept, as a top-level bundle (nesting is invalid) |
| 7 | `marketing-quality` | rule | Merged: the proposed `marketing-copy` plus `site-discoverability`, renamed (decisions 1, 2) |
| 8 | `marketing-quality-reference` | reference skill | Renamed from `marketing-copy-reference`, and adds the discoverability depth |
| 9 | `positioning-brief` | skill | Kept (frame, marketing map) |
| 10 | `release-notes` | skill | Renamed from `release-announcement`, and absorbs CH-GH-07 to 12 (decision 5) |
| 11 | `marketing-review` | skill | Kept (marketing map). Replaces the frame's `landing-page` |
| 12 | `marketing-measurement` | skill | Kept (marketing map) |
| 13 | `channel-publishing` | skill | Changed from rule to a required shared skill (decision 3) |
| 14 | `github-presence` | skill | Kept, and absorbs CH-COM-16 to 20, loses CH-GH-07 to 12 |
| 15 | `linkedin-post` | skill | Kept. Required by the owner |
| 16 | `youtube-video` | skill | Kept. Required by the owner |
| 17 | `microblog-post` | skill | New, out of the proposed `launch-plan` section (decision 6) |
| 18 | `terminal-demo` | skill | Kept (channel map) |
| 19 | `community-post` | skill | Kept, minus community health |
| 20 | `launch-plan` | skill | Kept (frame, channel map) |
| 21 | `product-essentials` | bundle | Narrowed to marketing plus channels (decision 9) |

Dropped: `site-discoverability` (merged into 7), `ux-ai-reference` (split into 2
and 4), `release-announcement` and `marketing-copy` (renamed), the frame's
`landing-page` (a checklist in `marketing-review`), the `channel-publishing`
rule (now a skill), and the nested `ux-essentials` membership.

### Where every ID family goes

| Family | Artifact and file |
|---|---|
| UX-A11Y-01 to 11 | `ux-quality-reference/widgets.md` |
| UX-A11Y-12 to 21 | `ux-quality-reference/focus-and-colour.md` |
| UX-A11Y-22 to 27 | `ux-quality-reference/motion-and-announcements.md` |
| UX-A11Y-28 to 34 | `ux-quality-reference/page-structure.md` |
| UX-A11Y-35, UX-STATE-28 to 33 | `ux-quality-reference/editor-extensions.md` |
| UX-STATE-01 to 19, 34 | `ux-quality-reference/states.md` |
| UX-STATE-20 to 27 | `ux-quality-reference/forms.md` |
| UX-TEXT, all but 05, 07, 12, 23 | `ux-quality-reference/text.md` |
| UX-TEXT-05, 07, 12, 23 | `ux-cli/references/terminal-output.md` |
| UX-ACT-01 to 11 | `ux-quality-reference/actions.md` (01 owns the T0 to T3 tiers every surface cites) |
| UX-ACT-12 to 17 | `ux-cli/references/destructive-commands.md` |
| UX-ACT-18 to 28 | `ux-agent-interfaces/references/tool-approval.md` |
| UX-AI | `ux-quality-reference/ai-features.md` |
| UX-AGENT-01 to 07, 09 to 14 | `ux-agent-interfaces/references/machine-output.md` |
| UX-AGENT-15 to 24, 26 | `ux-agent-interfaces/references/mcp-servers.md` |
| UX-AGENT-25 | `ux-agent-interfaces/references/tool-approval.md` |
| UX-VERIFY-01 to 17, 24 to 32 | `ux-quality-reference/verification.md` |
| UX-VERIFY-18 to 23 | `ux-review/SKILL.md` |
| UX-CLI-01 to 13, 28, 30 | `ux-cli/references/help-and-recovery.md` |
| UX-CLI-14 to 19 | `ux-cli/references/first-run.md` |
| UX-CLI-20 to 27, 29 | `ux-cli/references/terminal-output.md` |
| MKT-CLAIM-01 to 10, 18, 19 | `marketing-quality-reference/claims.md` |
| MKT-CLAIM-11 to 17, 20 to 26 | `marketing-quality-reference/trust-claims.md` |
| MKT-POS | `marketing-quality-reference/positioning.md` |
| MKT-PAGE | `marketing-quality-reference/first-screen.md` |
| MKT-VOICE | `marketing-quality-reference/voice.md` |
| MKT-SEO, all but 19 | `marketing-quality-reference/discoverability.md` |
| MKT-MEAS | `marketing-measurement` |
| MKT-REL | `release-notes/references/notes-template.md` and `deprecation.md` |
| CH-GH-07 to 12 | `release-notes/references/github-release.md` |
| CH-CORE | `channel-publishing/SKILL.md` |
| CH-GH-01 to 06, 13 to 32; CH-COM-16 to 20 | `github-presence` |
| CH-COM-01 to 15, 21 to 24 | `community-post` |
| CH-LI | `linkedin-post` |
| CH-YT | `youtube-video` |
| CH-MB | `microblog-post` |
| CH-VID | `terminal-demo` |
| CH-LAUNCH | `launch-plan` |

Retired IDs stay retired and are listed in no table. Where a family is split
across two artifacts, each artifact names the other half in its siblings line.

### Known duplicate rows

Each pair is resolved by the worker that owns the first-named ID, after it
re-reads both rows. Where they say the same thing, the narrower row is retired as
"merged into" the broader one. Where they differ by surface, both ship and each
names the other.

| Pair | Resolution |
|---|---|
| UX-A11Y-03 and UX-STATE-20 (control labels) | UX-A11Y-03 owns the label. UX-STATE-20 keeps only a form-specific clause, or is merged |
| CH-GH-06 and CH-COM-18 (organisation `.github` repository) | Both land in `github-presence`. One row owns the repository, the other only `SUPPORT.md` |
| CH-GH-25 and MKT-MEAS-17 (GitHub traffic archive) | CH-GH-25 owns it. MKT-MEAS-17 is merged unless it carries a site-side clause |
| CH-COM-08, CH-LAUNCH-05, CH-LI-14, CH-GH-27 (vote, star and engagement asks) | Each keeps its venue scope. `launch-plan` cites CH-COM-08 for community venues instead of restating it |
| MKT-CLAIM-24, MKT-MEAS-14, CH-GH-23 (popularity counts) | MKT-CLAIM-24 owns a count on a copy surface, CH-GH-23 owns the reporting form, MKT-MEAS-14 owns the ban on calling a count users |
| UX-A11Y-25 and CH-VID-13 (motion over 5 s) | Both ship. CH-VID-13 covers platform video and cites UX-A11Y-25 for pages |

## What was measured

Glob liveness, run read-only on 2026-11-27 against the fleet and the exemplar
corpus, pruning `node_modules`, `.agents`, `target`, `dist`, `build`, `.git`,
`.cache`, `.venv` and `site-packages`:

```sh
cd /home/mherwig/dev
f(){ find . \( -name node_modules -o -name .agents -o -name target -o -name dist -o -name .git -o -name .cache -o -name .venv -o -name site-packages -o -name build \) -prune -o -type f "$@" -print; }
for e in astro tsx jsx vue svelte html css scss; do f -name "*.$e" | wc -l; done
# then the same with -name for each manifest, config and record name below,
# and the same function (without the fleet-only prunes) under
# ~/.cache/research-lang/exemplars/product
```

| Glob | Fleet files (repos) | Exemplar files (repos) | Owner |
|---|---|---|---|
| `**/*.astro` | 192 (5) | 611 (3) | ux-quality |
| `**/*.tsx` | 11 (1) | 4,827 (5) | ux-quality |
| `**/*.jsx` | 0 | 188 (1) | ux-quality |
| `**/*.vue` | 0 | 26 (1) | ux-quality |
| `**/*.svelte` | 0 | 9 (1) | ux-quality |
| `**/*.html` | 360 (9) | 1,391 (25) | ux-quality |
| `**/*.css` | 101 (8) | 1,409 (9) | ux-quality |
| `**/*.scss` | 0 | 342 (2) | ux-quality |
| `**/README.md` | 178 (18) | | marketing-quality |
| `**/CHANGELOG.md` | 21 (13) | | marketing-quality |
| `**/Cargo.toml` | 47 (6) | | marketing-quality |
| `**/package.json` | 224 (13) | | marketing-quality |
| `**/pyproject.toml` | 13 (9) | | marketing-quality |
| `**/astro.config.*` | 11 (7) | 17 (3) | marketing-quality |
| `**/mkdocs.yml` | 60 (14) | 67 (2) | marketing-quality |
| `**/robots.txt` | 4 (4) | 15 (2) | marketing-quality |
| `**/_headers` | 1 (1) | 4 (2) | marketing-quality |
| `**/pages/index.astro` | 3 (3) | | marketing-quality |
| `**/cliff.toml` | 13 (13) | 22 (3) | marketing-quality |
| `**/docusaurus.config.*`, `**/next.config.*` | 0 | 3 (1) each | marketing-quality |
| `.github/release.yml` | 0 | 0 | marketing-quality (GitHub reads it by name) |
| `**/*.cast` | 23 (3) | 117 (5) | none (terminal-demo description) |
| `**/*.tape` | 0 | 23 (2) | none (terminal-demo description) |
| `positioning.toml`, `voice.toml`, `claims.toml`, `crawler-policy.toml`, `channels.yml` | 0 | 0 | new commitments the sets define |
| `llms.txt` | 0 | 1 (1) | docs-quality, not globbed here |

Every UX glob is a file extension, so none can be a filename guess, and every
one matches real files in at least one tree. The marketing globs are names a
build tool requires (`Cargo.toml`, `package.json`, `pyproject.toml`,
`astro.config.*`, `mkdocs.yml`, `cliff.toml`, `.github/release.yml`,
`_headers`, `robots.txt`, `pages/index.*` routing) or records the set itself
pins. No single tree carries all of them, so the catalog checks both rules
without a root, for the reason the CSS and docs steps already give.

Existing rule bodies, measured with the validator's own split (frontmatter
excluded): `css-theming` 198 lines, `docs-quality` 190, `typescript-quality`
144. That is why `css-theming` is not edited and the `docs-quality` edit
replaces lines in place.

## Authoring contract for every unit

Every unit follows these, on top of the `ai-config-authoring`,
`grim-authoring` and `research-lang` references
(`.claude/skills/research-lang/references/rule-distillation.md`,
`validation.md`).

- **Portability.** Nothing published names a fleet repository, product, host or
  path: no `ocx`, `grim-gui`, `@ocx-sh/theme`, `ocx.sh`, `grimoire.rs`,
  `grimoire-rs/`, `/home/`, `.agents/research`, or a dive-local ID (`UXA-`,
  `GHSV-`, `LO#`, `FSC-`, `PS-`, `N1`). Use `mytool` for a CLI, `example.com`
  for a host, and translate every dive-local ID to its consolidated ID. The one
  exception is the catalog's own install line (`grim add ghcr.io/ocx-sh/lore/<name>`)
  and the `repository:` field. Fleet measurements become rationale numbers
  without the fleet's name ("in 17 measured repositories").
- **Pinned house conventions** from the research (`.agents/positioning.toml`,
  `.agents/voice.toml`, `claims.toml`, `crawler-policy.toml`, `channels.yml`,
  `docs/consequential-actions.md`, the 1000 ms show-delay, `Consequence:` help
  lines, the `focus-ok:` marker) ship marked **pinned**, as defaults an adopter
  overrides once.
- **Every shipped row** keeps its ID, a one-line rationale, a verification and a
  severity. A verification is a command in the portable dialect
  (`rule-distillation.md` § Verification Commands: git-fed file lists, portable
  grep, no `rg`, no `$(...)` in a cell, piped commands in a fenced block labelled
  with the ID), a shipped script, or a named reading heuristic marked
  `unverified: reading heuristic`.
- **Depth files** carry no `paths`, have a table of contents when over 100
  lines, open with a "Dates and versions" section (tool versions, standard
  versions, fetch dates, and the event that forces a re-check), and never link
  another depth file. Cross-artifact references are by artifact name and rule
  ID only.
- **Severity** comes from the consolidation at write time (decision 14).
- **Budgets.** Rule body under 200 lines. SKILL.md body under 500 lines. Any
  file over 100 lines has a table of contents. Description under 1,024
  characters, one line, third person, a "Use when" clause, negative scope, and
  no workflow summary.
- **Scripts.** Python 3.11 standard library, `#!/usr/bin/env python3`, a PEP 723
  header with `requires-python = ">=3.11"`, exit 0 clean, 1 findings, 2 usage,
  `--self-test` over its own fixtures under `checks/fixtures/<topic>/`, run as
  `python3 -I`. Node modules pin exact versions in a header comment and print
  them in their output.
- **Each unit runs** `python3 .claude/skills/research-lang/scripts/check-artifacts.py
  --forbid /home/mherwig --forbid .agents/research <its paths>` and its own
  scripts' `--self-test` before reporting done. It edits no file outside its
  `files` list.

## Rule specs

### ux-quality

```yaml
paths:
  - "**/*.astro"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
summary: The interface quality index for web pages, docs sites, apps and editor webviews — the gate, the non-negotiables, and where the accessibility, state, text, action and AI-feature depth lives
keywords: ux,accessibility,a11y,wcag,aria,focus,contrast,keyboard,screen-reader,forms,loading,empty-state,error-state,microcopy,alt-text,confirmation,dialog,reduced-motion,axe,playwright,ai-disclosure,vscode-webview
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
metadata:
  grim.requires.skills.ux-quality-reference: "./ux-quality-reference:0"
```

What the globs match: every component, page, template and stylesheet in the
five markup frameworks plus plain HTML, which includes MkDocs `overrides/` and
built output. It does not load on Markdown (docs-quality's) or on `.ts`. A VS
Code extension's host code is `.ts`, so the `typescript-quality` routing table
gains a pointer row (collision table). Co-loads with `css-theming` on all eight
globs and with `typescript-quality` on `.tsx` and `.jsx`, declared in Siblings.

Body outline (under 200 lines):

1. One paragraph: traps, not a design system; scope (rendered pages, docs sites
   included, MkDocs overrides only); what it does not own (tokens, cascade and
   forced-colors mechanics are `css-theming`; Markdown content is `docs-quality`).
2. **The gate** (UX-VERIFY-01's ordered steps): static lint, the axe fixture over
   every route and scheme, the rendered matrix, the page-structure check, the
   red-demo run, with the pinned axe-core and Playwright versions and "list each
   step under `ran:` or `did not run:`".
3. **Non-negotiables**, about 18 rows, each citing its IDs:
   - native buttons and links, no bogus `href` (UX-A11Y-01, 02)
   - a programmatic name for every control, icon-only controls named, name starts
     with the visible text (UX-A11Y-03, 04, 05)
   - every visual state in markup; native `<dialog>`; no forbidden ARIA; custom
     widgets only to the APG contract (UX-A11Y-07, 08, 10, 11)
   - never remove a focus indicator without a replacement; 3:1 indicator; nothing
     sticky hides focus (UX-A11Y-12, 13, 14)
   - 4.5:1 and 3:1 text contrast, non-text boundary contrast, never colour alone
     (UX-A11Y-15, 16, 19)
   - 24 by 24 px targets (UX-A11Y-20)
   - announcements through a live container, `role="alert"` only for errors,
     pause control on motion over 5 s, no flashing (UX-A11Y-22, 23, 25, 26)
   - `lang` and a non-empty title per template, consistent repeated chrome across
     a set of pages (UX-A11Y-28, 32, 33)
   - loading, empty and error branch per async view; empty only after settle; a
     failure never looks empty; the error names its class and one recovery
     (UX-STATE-01, 02, 03, 04)
   - a pending flag before the first await; a deadline on every wait
     (UX-STATE-08, 14)
   - never an error only in a toast (UX-STATE-17)
   - never disable submit for invalidity; field errors next to the field; one
     focus move after a failed submit; never discard input (UX-STATE-21, 23, 24, 25)
   - error text states what failed, quotes the input, gives an available next
     step, states only checked causes, suggests only things that exist
     (UX-TEXT-01, 02, 03, 04)
   - every `<img>` has `alt`; no `(s)` plurals; status strings name subject and
     outcome (UX-TEXT-20, 25, 30)
   - a confirmation awaits its result, never labelled OK, Yes or Confirm, never
     focuses the destructive control first, shows exact content and destination
     (UX-ACT-04, 05, 07, 09)
   - model output never loads a network image or renders raw HTML; AI disclosure
     is visible real text (UX-AI-09, 10, 01, 02)
   - silencing the gate is an owner decision (UX-VERIFY-10)
   - never claim accessibility or conformance, never cite a Lighthouse score as
     evidence, name "WCAG 2.2 Level AA" only to select tests (UX-VERIFY-24, 25, 30)
4. **Where the depth is**: a task-worded routing table to the eleven depth files,
   plus rows to `ux-cli` (writing CLI help or terminal output), `ux-agent-interfaces`
   (JSON output, MCP tools, agent approvals), `marketing-quality` (editing a
   page's `<head>`, title, description, canonical or Open Graph tags),
   `css-theming` (tokens, theming, forced colours), `docs-quality` (Markdown
   content) and `ux-review` (grading an untouched page). It names the skill and
   gives `.claude/skills/ux-quality-reference/<file>`.
5. **Severity**, the pinned list, and "Not studied" (commerce flows and
   deceptive patterns, real assistive-technology runs, field data).
6. **Siblings**: `css-theming` (co-loads on all eight globs; it owns the cascade
   that delivers a focus ring or a contrast pair, this set owns the outcome),
   `typescript-quality` (TS-WEB-06 is the static JSX lint this gate runs),
   `docs-quality`, `marketing-quality`, the three UX skills.

### marketing-quality

```yaml
paths:
  - "README.md"
  - "**/README.md"
  - "CHANGELOG.md"
  - "**/CHANGELOG.md"
  - "Cargo.toml"
  - "**/Cargo.toml"
  - "package.json"
  - "**/package.json"
  - "pyproject.toml"
  - "**/pyproject.toml"
  - ".agents/positioning.toml"
  - ".agents/voice.toml"
  - "claims.toml"
  - "crawler-policy.toml"
  - "**/astro.config.*"
  - "**/mkdocs.yml"
  - "**/docusaurus.config.*"
  - "**/.vitepress/config.*"
  - "**/next.config.*"
  - "**/robots.txt"
  - "**/_headers"
  - "**/pages/index.astro"
  - "**/pages/index.tsx"
  - "**/pages/index.mdx"
  - "**/pages/index.md"
  - "**/app/page.tsx"
  - "**/cliff.toml"
  - ".github/release.yml"
summary: The marketing-surface index — the positioning record every pitch surface must match, the claims that need an evidence record, the first screen, voice and AI authorship, head metadata and crawler policy, and where the depth lives
keywords: marketing,positioning,messaging,tagline,value-proposition,claims,evidence,testimonials,open-source,licence,landing-page,hero,readme,seo,open-graph,canonical,robots-txt,ai-crawlers,structured-data,release-notes,analytics
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
metadata:
  grim.requires.skills.marketing-quality-reference: "./marketing-quality-reference:0"
```

Each glob is its own `paths:` item, root names included, because MKT-POS-12
requires that shape and `positioning_check.py globs` verifies it. No brace
alternation (Cursor splits on every comma). What they match: every README and
CHANGELOG, every Rust, npm and Python manifest (their `description` and
`keywords` fields are governed surfaces), the set's own records, the site
configs that hold the production origin and site description, the robots and
header files, the routed `/` page in Astro, Next and Markdown-routed
generators, and the two release-notes configs. Co-loads with `docs-quality` on
README, CHANGELOG, `mkdocs.yml` and the generator configs, with
`ux-quality` and `css-theming` on `pages/index.astro`, and with the packaging
rules on manifests, all declared in Siblings. The cost of loading on every
manifest edit is accepted: the measured top failure is a fresh tagline per file
(61 one-liners for 17 repositories). The body's first paragraph says that a
manifest edit that touches neither `description` nor `keywords` needs only
non-negotiable 3.

Body outline (under 200 lines):

1. One paragraph: scope (copy surfaces: README first screen, the pitch page,
   manifest and repository descriptions, site head, release bodies; docs pages
   stay `docs-quality`'s); the precedence that docs-quality governs a page both
   sets read, and MKT-PAGE adds requirements only on pitch surfaces.
2. **The gate**: `claims_lint.py`, `positioning_check.py drift`, `head_check.py`
   on built output, `live_site_check.py` after deploy, run order and exit codes.
3. **Non-negotiables**, about 20 rows:
   - read the positioning record before editing a governed surface, and draft
     one through `positioning-brief` when it is missing (MKT-POS-03, 01)
   - never change the sentence, category or object noun while the record is
     unreviewed (MKT-POS-04)
   - manifest description, README tagline line and home meta and Open Graph
     description equal the record's sentence; drift check in CI (MKT-POS-08, 11)
   - never type an enumerated list of kinds, clients or platforms; never a
     forbidden variant or a `do_not_say` entry (MKT-POS-10, 07, 09, 13)
   - a claims-pattern hit on a copy surface needs a live evidence record
     (MKT-CLAIM-01, 02, 05)
   - never a price, limit, quota or plan name without a record (MKT-CLAIM-03)
   - no statistic from memory; a performance figure links its method page
     (MKT-CLAIM-07, 06)
   - rewrite an unrecorded claim as a mechanism; never delete a limitation
     statement (MKT-CLAIM-08, 10)
   - "open source" only for OSI-approved licences; one licence everywhere;
     "free" with its meaning (MKT-CLAIM-11, 12, 13)
   - no compliance or certification wording; named human sign-off on security
     commitments (MKT-CLAIM-14, 16)
   - "AI-powered" only for shipped AI; AI accuracy claims need a record
     (MKT-CLAIM-18, 19)
   - no invented quote, name, rating or logo; exact words; connection disclosed
     (MKT-CLAIM-20, 21, 22)
   - popularity counts as a dated number with a link; no incentive tied to a
     rating (MKT-CLAIM-24, 26)
   - first-screen rules only on `doc_surface: pitch` and a releasing repository's
     README; no "stable" or "production-ready" claim; an archived README says so
     (MKT-PAGE-01, 09, 10)
   - never gate on an AI-detector score, never humanize, never state who or what
     wrote a page, never invent the author's past (MKT-VOICE-01, 02, 14, 06)
   - recordings and screenshots only from real runs; no generated media of a
     real person or product (MKT-VOICE-17, 16)
   - absolute https origin, one canonical, unique title, own description, Open
     Graph set on the built page; never a Google character limit that Google
     never set (MKT-SEO-01 to 06)
   - crawler policy recorded and checked live after every deploy; never overstate
     a crawler control; no misleading structured data or date bumps
     (MKT-SEO-15, 16, 17, 18, 21, 23)
   - no analytics script, pixel or beacon without an owner-approved decision
     record, and no campaign tags on owned links (MKT-MEAS-01, 09), routed to
     `marketing-measurement`
   - editing `cliff.toml` or `.github/release.yml`: the release-notes template
     rules (MKT-REL-01, 03, 04), routed to `release-notes`
4. **Where the depth is**: task-worded rows to the six depth files, and to
   `positioning-brief`, `release-notes`, `marketing-measurement`,
   `marketing-review`, `github-presence` (repository About text, topics),
   `docs-quality` and `ux-quality`.
5. **Severity**, pinned list (the records' locations and schemas, `doc_surface`,
   the refresh_by defaults), "Not studied" (pricing pages, paid tiers, service
   offer pages, pre-registered A/B results).
6. **Siblings**: `docs-quality` (co-load, precedence, DOC-TYPE-10 to 15,
   DOC-PLAIN-01, 08, 12, DOC-AGENT-04), `ux-quality`, the packaging rules, the
   marketing and channel skills.

## Skill specs

Descriptions below are the trigger wording each unit starts from; the unit
tightens them and keeps them under 1,024 characters. Every skill's frontmatter
carries `license`, `metadata.summary`, `metadata.keywords` and, where listed,
`grim.requires.skills.<name>: "./<name>:0"`.

### ux-quality-reference

- Description: "Depth files and checks scripts behind the ux-quality rule, loaded on
  demand. Use when the ux-quality rule routes you to a depth file or a checks
  script, or when a task cites a UX-A11Y, UX-STATE, UX-TEXT, UX-ACT, UX-AI or
  UX-VERIFY rule ID the index only summarises."
- `claude.user-invocable: "false"`. SKILL.md is a thin file list (the
  `go-quality-reference` shape) plus the `checks/` paragraph with
  `CHECKS=.claude/skills/ux-quality-reference/checks`.
- Depth files: `widgets.md`, `focus-and-colour.md`, `motion-and-announcements.md`,
  `page-structure.md`, `editor-extensions.md`, `states.md`, `forms.md`,
  `text.md`, `actions.md`, `ai-features.md`, `verification.md`. Portable rows
  of the fleet's six design-system skills (one focus ring, accessible names,
  the images-blocked test, never hand-draw an icon) land in the matching file
  as rows with consolidated IDs, never as new IDs.
- Checks (Python unless marked):
  - `page_structure.py`: on built HTML, `lang`, title, one `main`, one `h1`,
    skip link, and repeated header and nav identical across pages
    (UX-A11Y-28 to 33, UX-VERIFY-04).
  - `axe-fixture.mjs` (Node, Playwright plus `@axe-core/playwright`, exact pins):
    the one shared fixture with the exact tag set, `incomplete` asserted,
    best-practice results kept apart (UX-VERIFY-02, 03, 05, 06, 09).
  - `ui-matrix.mjs` (Node, Playwright): reflow and zoom horizontal scroll, Tab
    walk, focus-ring pixel diff with the ancestor pass (UX-VERIFY-13 to 17).
  - `wcag22-ids.txt`: the WCAG 2.2 success-criterion list the review and
    UX-VERIFY-18, 19 and 30 read.
  - `focus_outline.py`: a focus selector that removes the outline with no
    replacement in the same rule and no `focus-ok:` marker (UX-A11Y-12).
  - `wcag_contrast.py`: contrast of custom-property colour pairs in both schemes
    (UX-A11Y-15, 16).
  - `scan_wv.py`: unnamed controls and hex colours in webview template literals
    (UX-A11Y-03, 04, 35).
  - `focus_diff.mjs`, `colour_only.mjs` (Node, Playwright): rendered focus
    indicator contrast and colour-only state cues (UX-A11Y-13, 19).
  - `text_scan.py`: emoji, `please` and `oops` in product strings (the MUST
    subset of UX-TEXT-17), `(s)` plurals (UX-TEXT-25), bare "here" and "Learn
    more" link text (UX-TEXT-16), byte-unit labels (UX-TEXT-28).
  - `actions_scan.py`: confirmation labels `OK`, `Yes`, `Confirm`, `Continue`
    and "Are you sure", and a confirmation component with a default confirm
    label (UX-ACT-05, 06).
  - `model-output-cases.json`: the adversarial inputs (remote image, reference
    image, raw HTML, `javascript:` link) a renderer regression test feeds
    (UX-AI-12).
- Sources: all eight UX consolidations.

### ux-cli

- Description: "Interaction standards for command-line tools and terminal UIs:
  bare invocation and help layout, --version output, unknown-command
  suggestions, global flag position, shell completion offers, the installer's
  last line, first-run messages for a missing config, colour and animation per
  stream, TUI parity and linear mode, terminal error wording, and --dry-run,
  --force and typed confirmation on destructive commands. Use when writing or
  reviewing a CLI's help text, usage or error message, version flag, typo
  suggestion, progress spinner, NO_COLOR or CLICOLOR handling, install script
  output, or a command that deletes, overwrites or publishes. Not for exit-code
  tables, stdout and stderr routing or signal handling, which the language rule
  sets own, and not for JSON output read by scripts or agents, which is
  ux-agent-interfaces."
- `claude.user-invocable: "false"`; requires `ux-quality-reference` (UX-TEXT
  shared error rows and the UX-ACT-01 tiers).
- SKILL.md outline (under 250 lines): scope and what the language sets keep;
  the non-negotiable MUSTs (UX-CLI-01, 02, 08, 09, 11, 12, 14, 15, 16, 20, 21,
  22, 24, 26; UX-TEXT-05, 07, 12; UX-ACT-12, 13, 14, 15, 17); the
  `cli_matrix.py` command; a task-worded routing table to the four reference
  files; pinned defaults (the 60-line root help, decorative-colour allow file,
  animation opt-out name); siblings.
- References: `help-and-recovery.md`, `first-run.md`, `terminal-output.md`,
  `destructive-commands.md`.
- Check: `checks/cli_matrix.py` (Python): runs a binary under bare invocation,
  `-h` with an empty `HOME` and no config, `--version`, a typo, a global flag
  after the subcommand, closed stdin, a pipe, `NO_COLOR`, `CLICOLOR_FORCE` and
  `TERM=dumb` (colour and cursor-motion escapes per stream), and a repeated
  `--dry-run` of each command the inventory marks T1 or above (UX-CLI-01 to 13,
  20 to 22, UX-ACT-12 to 16).
- Sources: `ux-cli-interaction`, `ux-interface-text`, `ux-consequential-actions`.

### ux-agent-interfaces

- Description: "Standards for interfaces whose caller is a program or an AI agent:
  --format json and --json machine output, schema_version, bounded list output,
  JSON Lines events, error envelopes with a class slug and a retry verdict, MCP
  server tool names, descriptions, input and output schemas, isError results and
  tool counts, and approval of agent tool calls by consequence tier, including
  annotation hints, write gating, approval prompts, injection-safe approval and
  the lethal-trifecta check. Use when building or reviewing an MCP server or
  tool, a CLI's JSON output mode, an SDK or editor extension that parses a CLI's
  JSON, an agent's permission or auto-approve configuration, or an agent call to
  a CLI that must capture its streams. Not for human-readable help and error
  text, which is ux-cli, and not for chat interfaces shown to people, which the
  ux-quality rule set covers."
- `claude.user-invocable: "false"`; requires `ux-quality-reference` (UX-ACT-01
  tiers).
- SKILL.md outline: scope; the MUSTs (UX-AGENT-01, 03, 04, 05, 06, 09, 11, 12,
  13, 14, 15, 18, 20; UX-ACT-18, 19, 21, 22, 23, 24, 25, 26, 28); the two check
  commands; routing to three references; the pending owner decisions on the
  envelope and exit 69 versus 75, stated once; siblings (`ux-cli`, the language
  CLI contracts, `code-docs` SRF for text that renders into tool lists).
- References: `machine-output.md`, `mcp-servers.md`, `tool-approval.md`.
- Checks (Python): `mcp_tools_check.py` reads a saved `tools/list` result and
  checks names, input-property descriptions, `required`, `enum`, the tool
  count, description checklist heuristics and result size (UX-AGENT-18 to 22,
  26). `json_output_check.py` runs a command in machine mode across a success,
  a not-found and a usage error and checks exactly one JSON document on stdout,
  `schema_version` and the error fields (UX-AGENT-01, 03, 04, 09).
- Sources: `ux-agent-facing-interfaces`, `ux-consequential-actions`, `ux-ai-features` (UX-AI-13 boundary wording only, cited).

### ux-review

- Description: "On-demand UX and accessibility review of a web page, docs site,
  app view, editor webview or CLI against the ux-quality, ux-cli and
  ux-agent-interfaces rule sets, with every finding tagged by evidence class and
  a separate needs-human-review list. Use when someone asks to review, audit,
  test or check accessibility, a11y, WCAG, keyboard or screen-reader behaviour,
  contrast, focus, zoom and reflow, loading and error states, or a CLI's help
  and first run, or asks whether a page or a change is accessible. Not for
  fixing findings unless asked, and not for marketing copy or claims, which is
  marketing-review."
- User-invocable; requires `ux-quality-reference` and `ux-cli`.
- SKILL.md outline (under 300 lines, `docs-review` shape): stop condition (every
  target has findings or `clean`; no conformance verdict ever); pick targets
  (named pages, built routes from the router, or the branch diff); load the rule
  and only the routed depth files; run the ladder (lint, axe fixture, matrix,
  page structure, static scans, `cli_matrix.py` for a CLI); the human pass
  (UX-VERIFY-18, 19); report shape (UX-VERIFY-20 to 23: evidence classes and
  their verbs, finding fields, Findings versus Needs human review, the
  gate-facts block); the MUST list repeated in a few lines as the hedge against
  the rule not having fired; the 2,000-line diff refusal.
- No references and no scripts of its own.
- Sources: `ux-verification-claims`, plus the MUST lists of the other seven UX topics.

### marketing-quality-reference

- Description: "Depth files and checks scripts behind the marketing-quality rule,
  loaded on demand. Use when the marketing-quality rule, marketing-review or
  positioning-brief routes you to a depth file or a checks script, or when a task
  cites an MKT-CLAIM, MKT-POS, MKT-PAGE, MKT-VOICE or MKT-SEO rule ID the index
  only summarises."
- `claude.user-invocable: "false"`. Thin file list plus `checks/`.
- Depth files: `claims.md`, `trust-claims.md`, `positioning.md` (including the
  record schema and the surface match table), `first-screen.md` (including the
  `doc_surface` declaration and the interim precedence over DOC-TYPE-10 to 15),
  `voice.md` (including the `voice.toml` schema and the DOC-PLAIN-01 boundary),
  `discoverability.md` (head set, sitemaps, robots, AI-crawler policy, banned
  tactics; MKT-SEO-19 omitted with a one-line pointer to DOC-AGENT-04).
- Checks (Python): `claims_lint.py` (MKT-CLAIM-01, 02, 03, 05: pattern hits on
  added lines against `claims.toml` markers and records, expired records);
  `positioning_check.py` (MKT-POS-02, 07 to 12: record schema, surface drift,
  the `globs` subcommand); `head_check.py` (MKT-SEO-01 to 10, 21 to 25 on built
  output); `live_site_check.py` (MKT-SEO-11 to 17 against the public host,
  including named bot user agents); `shingle.py` (MKT-SEO-24 template share).
- Sources: `marketing-claims-evidence`, `marketing-positioning-record`,
  `marketing-first-screen-copy`, `marketing-voice-ai-authorship`,
  `marketing-discoverability`.

### positioning-brief

- Description: "The single positioning record for a software product or service:
  audience and non-target, the category and object nouns, the one product
  sentence, the alternatives a buyer uses today, forbidden variants and
  do-not-say entries, and its owner review state. Use when someone asks for
  positioning, a value proposition, a tagline, a one-liner, an elevator pitch,
  messaging, a target audience or ideal customer, a category or competitor
  framing, or when the marketing-quality rule finds no positioning record before
  an edit to a README, manifest description or site head. Not for writing page
  copy from an existing record, which the marketing-quality rule governs, and
  not for sequencing a launch, which is launch-plan."
- User-invocable; requires `marketing-quality-reference` (schema in
  `positioning.md`).
- SKILL.md outline (under 200 lines): stop condition (a record at the pinned path
  with `status = "unreviewed"` and every required field, plus the owner
  questions); evidence first (README, manifests, docs home, About text, issues,
  the existing one-liners and their count); the field-by-field procedure with
  MKT-POS-05, 06, 07 and 14 as the checks; component repositories and `parent`
  (MKT-POS-16); optional `voice.toml` draft (MKT-VOICE-08); the owner questions
  an agent never answers; running `positioning_check.py` on the draft.
- No scripts of its own.
- Sources: `marketing-positioning-record`, `marketing-voice-ai-authorship`.

### marketing-review

- Description: "On-demand review of marketing surfaces against the
  marketing-quality rule set: a README first screen, a pitch or home page, the
  manifest and repository descriptions, claims and their evidence records,
  endorsements and popularity counts, open-source and licence wording,
  positioning drift, maturity lines, head metadata and AI-authorship markers.
  Use when someone asks to review, check or audit a landing page, a home page or
  hero, a README pitch, a tagline, product copy, a claim such as fast, secure or
  free, a testimonial, or a pull request that touches marketing copy. Not for
  accessibility or interface review, which is ux-review, and not for
  documentation pages, which is docs-review."
- User-invocable; requires `marketing-quality-reference`.
- SKILL.md outline (under 150 lines, `docs-review` shape): stop condition; pick
  targets; load the index and the routed depth files; run the scripts in order;
  the landing checklist (hero, status line, proof, calls to action, in that
  order, short); the AI-marker pass reported as warnings only (MKT-VOICE-01);
  report format; the MUST list in a few lines.
- Sources: the five marketing-quality consolidations.

### marketing-measurement

- Description: "Rules for measuring a site, docs, README or campaign without
  breaking consent law or misreporting a number: whether an analytics script,
  pixel or beacon may be added at all, cookieless and consent-exemption claims,
  privacy-statement drift, UTM and campaign tagging, metric definitions, AI
  answer citations, and A/B test pre-registration. Use when someone proposes
  adding analytics (Plausible, Umami, GoatCounter, Fathom, PostHog, Google
  Analytics, Cloudflare Web Analytics), a tracking pixel, UTM parameters, a
  metrics dashboard or report, a growth number on a page, or an A/B test. Not
  for GitHub stars, clones or download counts, which is github-presence, and not
  for head tags or robots.txt, which the marketing-quality rule set covers."
- User-invocable.
- SKILL.md outline (under 300 lines): the decision record first (MKT-MEAS-01:
  pinned path `.agents/decisions/measurement.md`); collection rules; the
  consent-exemption conditions; tagging; reporting and the five metric fields;
  A/B pre-registration; what an agent asks a human.
- References: `collection.md` (MKT-MEAS-01 to 07), `reporting.md` (MKT-MEAS-08 to
  20), `facts.md` (law and vendor facts in the CH-CORE-12 format, refresh 90
  days; 30 days for any fact within 60 days of an effective date).
- Checks (Python): `inventory_check.py` (MKT-MEAS-01, 03, 05, 06: third-party
  script and beacon hosts in built HTML against the decision record and the
  privacy statement); `utm_check.py` (MKT-MEAS-08 to 10).
- Sources: `marketing-measurement`.

### release-notes

- Description: "Release-notes and GitHub Release standards for every release: the
  git-cliff, release-please or .github/release.yml template, breaking-change
  marking and the BREAKING line, deprecation trailers and runtime warnings, skip
  parsers for internal scopes, rendering the notes in CI before the release
  exists, one GitHub Release per stable tag, the Latest flag, prerelease flags,
  asset names behind /releases/latest/download links, draft-first immutable
  releases, and one version string across tag, title, changelog and registry.
  Use when cutting or preparing a release, writing or fixing release notes or a
  release body, editing cliff.toml or release.yml, marking a commit breaking,
  deprecating a flag or setting, or finding tags with no release. Not for
  building, signing or uploading binaries, which the language release skills
  own, not for the CHANGELOG.md page format, which is docs-quality, and not for
  announcing a release on social channels, which is launch-plan or a platform
  skill."
- User-invocable.
- SKILL.md outline (under 350 lines): scope and the split with the language
  release skills; the order (commit subjects, template, render in CI, draft
  release, assets, publish, Latest check); the MUSTs (MKT-REL-01 to 13, CH-GH-07,
  08, 10, 11, 12); the licence and terms notice that an agent drafts and never
  publishes (MKT-REL-13); routing.
- References: `notes-template.md` (MKT-REL-01 to 06, 10, 14 to 16; cliff.toml
  and release.yml worked shapes), `deprecation.md` (MKT-REL-07 to 09, 18),
  `github-release.md` (MKT-REL-11, 12, CH-GH-07 to 12).
- Checks (Python): `notes_check.py` (MKT-REL-03, 04, 06, 10 on a rendered body
  and on `cliff.toml`); `release_gap.py` (MKT-REL-11, CH-GH-07, 08: tags with no
  Release, Latest equals the highest stable, documented
  `/releases/latest/download/<asset>` names exist; reads `gh` JSON output).
- Sources: `marketing-release-announcements`, `channel-github`.

### channel-publishing

- Description: "The boundary every public channel shares: an agent drafts and a
  named human posts, which venues get only a fact sheet, why Stack Overflow gets
  nothing, owner-commissioned automation on X, Bluesky, Threads, Mastodon and
  Discord, platform label fields for AI use and sponsorship, disclosure before
  the fold, publishing-credential scans, the dated platform-facts registry, and
  the channels.yml inventory of the accounts a project may link. Use when
  drafting or reviewing any public post, upload, listing or announcement for a
  social, video or community platform, adding a social link or badge to a
  README or site, wiring a webhook or bot that posts, or editing channels.yml.
  For a specific platform, linkedin-post, youtube-video, microblog-post,
  community-post and launch-plan each require this skill."
- `claude.user-invocable: "false"`; required by every platform skill.
- SKILL.md outline (under 450 lines, with a table of contents): the boundary
  (CH-CORE-01 to 05); labels and placement (06 to 09); credentials (10);
  the facts registry format and intervals (11 to 15); the channel inventory
  (17 to 19); the check commands; claims in drafts follow MKT-CLAIM when
  `marketing-quality` is installed, and otherwise carry a `source:` line per
  number; what an agent asks a human.
- References: `registry-format.md` (the column grammar, `expect` patterns, the
  provenance classes, the weekly re-fetch job of CH-CORE-14),
  `channels-inventory.md` (the `channels.yml` schema and worked example).
- Checks: `facts_check.py` (Python; CH-CORE-12, 13: column grammar and
  staleness of any `facts.md` it is given); `channels_check.py` (Python; CH-CORE-17
  to 19 plus the inbound-link check over READMEs and built pages);
  `factsheet_check.py` (Python; CH-CORE-03 fixed key set); `boundary_check.py`
  (Python; CH-CORE-01, 02, 10: posting endpoints and publishing-secret names in
  workflows and scripts); `gitleaks-channels.toml` (CH-CORE-10 rules to merge).
- The 25 seed registry rows in the consolidation go to the platform skills'
  `facts.md`, not here.
- Sources: `channel-agent-boundary`.

### Platform skills: shared shape

Each of `linkedin-post`, `youtube-video`, `microblog-post`, `terminal-demo`,
`community-post`, `launch-plan` and `github-presence`:

- requires `channel-publishing` (`grim.requires.skills.channel-publishing: "./channel-publishing:0"`);
- repeats the five boundary MUSTs that apply to it in a short block near the top,
  citing CH-CORE IDs;
- ships `references/facts.md` in the CH-CORE-12 format, seeded from the
  consolidation's dated facts and the matching seed rows, and states its refresh
  cadence in SKILL.md: "Every row carries `refresh_days`: 180 for hard limits,
  90 for policy, API fields and label triggers, 30 for prices. `facts_check.py`
  fails on the first overdue row; re-fetch it, never extend the date";
- writes a draft or package to a file and never posts, uploads, submits or
  schedules.

| Skill | Facts cadence floor | Manual rows |
|---|---|---|
| `linkedin-post` | 90 days | Yes: LinkedIn bars crawlers, so its rows are re-read by a human (CH-LI-18) |
| `youtube-video` | 90 days | No |
| `microblog-post` | 90 days (30 for X pricing) | No |
| `terminal-demo` | 180 days (90 for the player version) | No |
| `community-post` | 90 days; venue rules are also re-read on the day (CH-COM-02) | No |
| `launch-plan` | 30 days; venue rules re-read on plan day (CH-LAUNCH-13) | No |
| `github-presence` | 180 days (90 for API and policy rows) | No |

### github-presence

- Description: "GitHub and package-registry presence for a software project: the
  repository About line, homepage, topics and social preview, the organisation
  profile README, community files (Discussions, issue-template routes,
  SUPPORT.md, code-of-conduct contacts), registry listings on crates.io, npm,
  PyPI, the VS Code Marketplace, Homebrew taps and GHCR image labels, README
  images and links that registries reuse, and reporting stars, downloads, clones
  and traffic without inflating them. Use when setting a repository description
  or topics, adding a social preview image, editing package keywords,
  description or repository fields, setting up Discussions or SUPPORT.md,
  submitting to homebrew-core, or quoting a GitHub or download number. Not for
  release notes or the GitHub Release object, which is release-notes."
- References: `repo-card.md` (CH-GH-01 to 06, 30), `registry-listings.md`
  (CH-GH-13 to 22), `numbers.md` (CH-GH-23 to 28, 31, 32), `community-health.md`
  (CH-COM-16 to 20), `facts.md`.
- Checks (Python): `repo_card_check.py` (CH-GH-01 to 05, 30 through
  `gh repo view --json`), `registry_manifest_check.py` (CH-GH-13 to 19 on the
  manifests), `community_check.py` (CH-COM-17 to 19).
- Sources: `channel-github`, `channel-communities`.

### linkedin-post

- Description: "LinkedIn posts for a software product, written for a named person
  rather than a company Page: the goal and metric header, the first three lines,
  the length limit, link placement and link cards with their Open Graph tags,
  document posts, image alt text, polls, engagement-bait patterns, sponsorship
  and AI-use disclosure, and dated LinkedIn facts. Use when someone asks for a
  LinkedIn post, a LinkedIn announcement of a release or launch, a carousel or
  document post, a company Page update, or a review of a LinkedIn draft. Not for
  posting, scheduling or automation, which LinkedIn bans and channel-publishing
  forbids, and not for X, Bluesky or Mastodon posts, which is microblog-post."
- SKILL.md outline (under 350 lines): the draft file and its header (CH-LI-21,
  02); the boundary block (CH-LI-01); first-hand content and sources (07, 08,
  15); length, lines 1 to 3 and link placement (03, 06, 09, 10); visuals,
  document posts, alt text and polls (11, 12, 19, 22); bait and engagement-pod
  bans (13, 14); disclosure (04, 16, 17); person versus Page (20); facts and
  the manual re-read protocol (18).
- References: `facts.md`.
- Check: `li_draft_check.py` (Python): header keys, body length counted as the
  largest of code points, UTF-16 units and graphemes, the lines-1-to-3 budget,
  bait patterns, alt text present, disclosure line placement. The body limit
  needs no grapheme library, because UTF-16 units are never fewer than code
  points or graphemes; the lines-1-to-3 grapheme budget uses a stdlib
  approximation of UAX #29 that the script labels as such.
- Sources: `channel-linkedin`, `channel-agent-boundary` (label rows).

### youtube-video

- Description: "YouTube upload standards for a software product's channel: the
  upload manifest, title and description limits, the one destination link,
  hashtags, chapter timestamps, thumbnail format, private-first uploads,
  made-for-kids, language, altered-or-synthetic and paid-placement fields,
  automatic dubbing, the channel record, Shorts pilots, series numbering, audio
  licensing, end screens, and reporting views by their definitions. Use when
  preparing a YouTube upload or Short, writing a video title, description or
  chapters, setting up or auditing a channel, uploading through the YouTube Data
  API, or reporting YouTube numbers. Not for recording terminal footage, which
  is terminal-demo, and not for thumbnail or hook craft, which no check here can
  measure."
- SKILL.md outline (under 400 lines): the manifest and its linter first (CH-YT-01);
  metadata limits and chapters (02 to 08); upload state and labels (09 to 11);
  the channel record and read-only access (12 to 14); what to publish and the
  Shorts pilot (15 to 24); measurement thresholds (25 to 28).
- References: `manifest.md` (the manifest schema with a worked example),
  `facts.md`.
- Check: `yt_manifest_check.py` (Python; CH-YT-01 to 10, 16, 20, 22 to 24).
- Sources: `channel-youtube`, `channel-agent-boundary` (YouTube label rows).

### microblog-post

- Description: "Release and announcement posts for X, Bluesky, Mastodon and
  Threads: each platform's own length counter, URLs written in full, link cards
  and facets, alt text, one post versus a thread, duplicate text across
  accounts, Mastodon verification links and the fediverse creator tag, and dated
  platform facts. Use when someone asks for a tweet or X post, a Bluesky post, a
  toot or Mastodon post, a Threads post, a thread announcing a release, or a
  check of a post's length. Not for LinkedIn, which is linkedin-post, and not for
  bot or scheduled posting, which needs an owner-commissioned automation row in
  channel-publishing."
- References: `facts.md`.
- Checks: `mb_count.mjs` (Node: twitter-text `parseTweet`, `@atproto/api`
  `RichText`, the Mastodon URL reservation, Threads emoji bytes; exact pinned
  versions; CH-MB-01 to 06); `mb_check.py` (Python; CH-MB-07 to 09, 13, 16, 22:
  one release URL, full `https://` URLs, alt text, thread length, similarity
  between accounts).
- Sources: `channel-microblog`.

### terminal-demo

- Description: "Terminal demos and screencasts that are reproducible, legible and
  safe to publish: asciinema casts, VHS tapes, GIFs, SVG or PNG stills and
  platform video rendered from a committed scenario that runs the real product,
  column geometry for phones and docs columns, idle gaps, palette contrast,
  pause controls, captions and transcripts, flashing limits, secret and identity
  scrubbing, and text-normalised drift checks. Use when recording, re-recording,
  embedding or reviewing a terminal demo, a .cast or .tape file, a README GIF or
  CLI screenshot, or a video built from terminal footage. Not for the docs-page
  player and tooltip rules, which docs-quality owns."
- References: `pipeline.md` (per-surface render pipeline and tool pins, CH-VID-01
  to 07), `facts.md` (platform video specs, the player version).
- Checks (Python): `cast_check.py` (CH-VID-07, 08, 10, 11, 17, 21 to 23: header
  `env`, no input events, column count, idle gaps, clears per second, identity
  strings, normalised diff); `cast_contrast.py` (CH-VID-12). The secret scan is
  `gitleaks` on the flattened text (CH-VID-20), documented, not shipped.
- Sources: `channel-terminal-video`.

### community-post

- Description: "Hacker News, Lobsters, Reddit, Stack Overflow, dev.to, Hashnode
  and Discord or Matrix chat for a software project, as fact sheets and
  checklists for the human who posts, never paste-ready text where a venue bans
  generated content: venue contracts read on the day, account gates, Show HN
  eligibility and title checks, one submission per URL, no vote requests, Stack
  Overflow as support only, cross-posting, and chat as a secondary channel. Use
  when someone wants to post a Show HN, submit to Lobsters, share on a
  subreddit, answer on Stack Overflow, cross-post to dev.to or Hashnode, or
  announce in a Discord or Matrix server. Not for planning a multi-venue launch,
  which is launch-plan, and not for GitHub Discussions or SUPPORT.md, which is
  github-presence."
- References: `facts.md` (venue contracts and gates).
- Check: `venue_check.py` (Python; CH-COM-06 Show HN title, CH-COM-08 vote-ask
  patterns on team surfaces, CH-COM-24 search-visibility claims).
- Sources: `channel-communities`, `channel-agent-boundary`.

### launch-plan

- Description: "Launch planning across venues for a software product: the
  readiness gate (a published release and a link target that resolves), venue
  admission from each venue's own scope sentence, at most one community venue
  per day with a named human on duty, a launch reason versus a routine release,
  the order of tag, canonical record and venues, Product Hunt maker rules, one
  numeric launch goal, and the human steps no agent may take. Use when someone
  plans a launch, a launch week, a 1.0 announcement, a Product Hunt or Show HN
  day, or a newsletter push, or asks when and where to announce. Not for routine
  release notes, which is release-notes, and not for writing the individual
  posts, which the platform skills cover."
- SKILL.md outline (under 350 lines): readiness gate (CH-LAUNCH-01 to 03);
  venue admission and rules on plan day (04, 13); the calendar (06, 08, 10);
  launch reason (07); canonical record (09); the goal field (11, citing CH-GH-23
  and 32 instead of dive-local IDs); human steps and Product Hunt (12, 14, 15);
  which platform skill writes each venue's package.
- References: `facts.md`.
- Checks (Python): `link_target_check.py` (CH-LAUNCH-02, 15: every venue URL
  resolves through a public resolver to a 200 with no login wall);
  `plan_check.py` (CH-LAUNCH-05, 06, 07, 11 on the plan file).
- Sources: `channel-launch`, `channel-communities`, `channel-github` (signal ids).

## Collision table

Who owns what, and the exact cross-edits. "Applied" edits are done by the
integration unit. "Owner-gated" edits are listed for a later change and are not
made now.

| # | Concern | Owner | What the new sets do | Cross-edit |
|---|---|---|---|---|
| 1 | Page-level accessibility of rendered docs pages: alt text, contrast, keyboard order, table semantics, sidebar, search widget | `ux-quality` | Own it | Applied: `rules/docs-quality.md:184-186`, replace the "governed nowhere" bullet in place (same line count) with a pointer: the rendered page belongs to `ux-quality`, an image written in Markdown still needs an `alt` (UX-TEXT-20), and the terminal player and tooltip stay in `examples.md` |
| 2 | AI-authorship badges on pages (DOC-PLAIN-08) versus an AI feature's required disclosure (UX-AI-01, 02) | `docs-quality` for authorship, `ux-quality` for product disclosure | UX-AI ships only with the exemption | Applied: `skills/docs-quality-reference/plain-english.md:79` (DOC-PLAIN-08 row) gains an exemption for an element carrying `data-ai-disclosure` and for a `<!-- ai-disclosure -->` block; `checks/prose.py` badge arm (the DOC-PLAIN-08 block near lines 66 and 177) skips them, with a planted fixture and a self-test case |
| 3 | Whether a page-analytics script may be added (docs-instrument step 7, DOC-OBS-16) | `marketing-measurement` (MKT-MEAS-01 to 04) | Own the precondition | Applied: one precondition clause at `skills/docs-instrument/SKILL.md:221`, at the head of "Analytics vendors" in `skills/docs-instrument/references/reader-signals.md:69-71`, and in the DOC-OBS-16 verification cell at `skills/docs-quality-reference/observability.md:64`: satisfy MKT-MEAS-01 to 04 first (an owner-approved decision record, and no client script before consent where the audience requires it) |
| 4 | VS Code extension UI written in `.ts` (notifications, progress, input boxes, modals, webviews) | `ux-quality` (`editor-extensions.md`) | Own the user-facing surface; `typescript-quality` keeps the host mechanics | Applied: `rules/typescript-quality.md`, one routing row inserted after line 131: "Writing what an extension's user sees — a notification, a progress indicator, an input box, a modal or webview markup — `ux-quality` (sibling set: its `editor-extensions.md`)" |
| 5 | Help, version, typo, first-run, palette, animation and confirmation behaviour of a CLI versus its streams, exit codes, TTY detection and signals | `ux-cli` / language CLI contracts | `ux-cli` owns the first list and cites the second | Applied: one sentence appended to the scope paragraph of each `cli-contract.md`: `go-quality-reference` line 8, `rust-quality-reference` lines 3-7, `python-quality-reference` lines 3-8, `swift-quality-reference` lines 11-16, `typescript-quality-reference` lines 8-13: "Help layout, `--version`, typo suggestions, first-run messages, colour palette and animation choices, error wording and destructive-command confirmations are the `ux-cli` skill's; machine output for scripts and agents is `ux-agent-interfaces`'." |
| 6 | Error envelope fields, `conflict` exit code, exit 69 versus 75 (Rust CLI-04, Swift SW-CLI-29, Go and Rust exit-69 rows) | Language sets | UX-AGENT-04, 09(c), 10 ship at the consolidation's severity, which waits on owner decisions 1 to 4 | Owner-gated: `rust-quality-reference/cli-contract.md:37`, `go-quality-reference/cli-contract.md:27` and the CLI-04 envelope |
| 7 | The installer's last success line | `ux-cli` (UX-CLI-14) | Own it | Applied: `skills/installer-script/SKILL.md:55-58`, one clause: "What its last success line says is UX-CLI-14 in the `ux-cli` skill." |
| 8 | Completion registration per shell | `shell-integration` Step 6 (SH-EMIT-33 to 39) | UX-CLI-13 and 30 cite it | None |
| 9 | Text that renders into help, schemas and MCP tool lists | `code-docs` SRF (what it must not contain, length caps) | UX-CLI-05, 06 and UX-AGENT-19, 20 own what it must contain; they cite SRF-03 | None |
| 10 | Landing contract for `doc_type: landing` (DOC-TYPE-10 to 15), adoption claims, superlatives on docs pages (DOC-PLAIN-12) | `docs-quality` | MKT-PAGE scopes by `doc_surface`; MKT-CLAIM applies to copy surfaces; docs-quality governs a page both read | Owner-gated: CR-1 to CR-4 in `docs-quality` (`landing_check.py`, DOC-TYPE-10 and 13, the `doc_surface` key in `doc_declaration.py` and `strip_prose.py`, built-route scanning). Until they land, `first-screen.md` defines `doc_surface` itself and states the interim precedence |
| 11 | Punctuation ban (DOC-PLAIN-01) | `docs-quality` on files its checker reads | MKT-VOICE-03 covers copy outside them; UX-TEXT-23 covers CLI output | None |
| 12 | `llms.txt` (DOC-AGENT-04) | `docs-quality` | MKT-SEO-19 does not ship | Owner-gated: align DOC-AGENT-04's trigger with MKT-SEO-19's consumer condition, or leave it |
| 13 | Zero-result search beacon (DOC-NAV-10) | `docs-quality` (SHOULD, pinned) | No edit; whether it falls under consent law is the measurement consolidation's open question 4 | Owner-gated |
| 14 | CHANGELOG.md page format (DOC-TYPE-37 to 41) | `docs-quality` | `release-notes` owns the template and the Release body, and cites | None |
| 15 | Recording rules (DOC-EX-11 to 13), player and tooltip (DOC-EX-15 to 17, 34) | `docs-quality` (DOC-EX-13 pinned wins) | `terminal-demo` and `ux-quality` cite, never restate | None |
| 16 | Tokens, theming, dark mode, forced-colors mechanics (CSS-A11Y-01) | `css-theming` | `ux-quality` cites CSS-A11Y-01 and owns the contrast and focus outcomes | None. `css-theming`'s body is 198 lines, so the overlap is declared on the `ux-quality` side only. The theme-version currency row the UX map proposed for `css-theming` (map row M263) is left to that set's next revision |
| 17 | Static JSX accessibility lint (TS-WEB-06) | `typescript-quality` | UX-VERIFY-12 runs it, cites it | None |
| 18 | Building, signing and uploading release artifacts | Language release skills | `release-notes` owns the notes and the Release object | None |
| 19 | Skill and descriptor wording | `ai-config-authoring`, `grim-authoring` | UX-AGENT-19 applies to MCP tool descriptions only | None |
| 20 | The fleet's six design-system skills | Outside the catalog | Their portable rows are absorbed into `ux-quality-reference` | None (read-only) |

Version bumps for the applied edits, all patch: `docs-quality` 0.4.0 to 0.4.1,
`docs-quality-reference` 0.1.0 to 0.1.1, `docs-instrument` 0.1.2 to 0.1.3,
`typescript-quality` 0.3.0 to 0.3.1, `go-quality-reference`,
`rust-quality-reference`, `python-quality-reference`,
`swift-quality-reference` and `typescript-quality-reference` 0.1.0 to 0.1.1,
`installer-script` 0.1.0 to 0.1.1. No existing bundle's member set changes, so
no existing bundle is bumped.

## Bundles

| Bundle | Members | Why |
|---|---|---|
| `ux-essentials` | rule `ux-quality`; skills `ux-cli`, `ux-agent-interfaces`, `ux-review` | Every repository with an interface. `ux-quality-reference` arrives through the rule's requirement and is not listed |
| `product-essentials` | rule `marketing-quality`; skills `positioning-brief`, `release-notes`, `marketing-review`, `marketing-measurement`, `channel-publishing`, `github-presence`, `linkedin-post`, `youtube-video`, `microblog-post`, `terminal-demo`, `community-post`, `launch-plan` | Every repository with a public pitch. Channel skills cite the MKT-CLAIM policy, so they never ship without it |

Shape: copy `bundles/docs-essentials.toml` exactly (top-level `summary`,
`keywords` as one string, `description`, `license`, `repository`, the
"MEMBERS CARRY NO TAG" comment block, same-directory relative members such as
`ux-quality = "./ux-quality"`). Each file carries a comment saying why the split
is two bundles and why there is no umbrella (nested bundles are invalid, and a
union bundle is a second name for two).

## Catalog entries

### publish.toml

Appended at the end, three commented blocks, entry shape copied from the docs
set:

```toml
# The UX set: one index rule plus three skills. `ux-quality` loads on markup and
# stylesheet extensions and routes to eleven depth files by task. `ux-cli` and
# `ux-agent-interfaces` are skills because no rule glob reaches CLI or MCP
# source; `ux-review` is the on-demand trigger.
[rules.ux-quality]
version = "0.1.0"
description = { readme = "docs/ux-quality.md", logo = "assets/lore-ux.svg" }

[skills.ux-quality-reference]
version = "0.1.0"
description = { readme = "docs/ux-quality-reference.md", logo = "assets/lore-ux.svg" }
# ... ux-cli, ux-agent-interfaces, ux-review, [bundles.ux-essentials]

# The marketing set ... [rules.marketing-quality], [skills.marketing-quality-reference],
# positioning-brief, release-notes, marketing-review, marketing-measurement

# The channel set ... channel-publishing, github-presence, linkedin-post,
# youtube-video, microblog-post, terminal-demo, community-post, launch-plan,
# [bundles.product-essentials]
```

Every new entry starts at `version = "0.1.0"`. UX entries use
`assets/lore-ux.svg`; marketing and channel entries use
`assets/lore-product.svg`. The integration unit adds two original glyphs,
`assets/glyphs/ux.svg` and `assets/glyphs/product.svg` (24 by 24 viewBox, a
single path, no third-party brand mark: no LinkedIn, YouTube or GitHub logo),
and derives the marks with `scripts/make-mark.py ux assets/glyphs/ux.svg` and
`scripts/make-mark.py product assets/glyphs/product.svg`. The applied cross-edit
bumps from the collision table land in the same change.

### docs/ companions

One per artifact, 21 files. Rules and procedural skills copy the
`docs/go-quality.md` and `docs/go-upgrade.md` shape (what it is, the install
line, what loads it, the measured failures it answers, what it does not cover,
siblings). Reference skills copy `docs/go-quality-reference.md` (11 lines, "add
the rule, not the skill"). `ux-cli`, `ux-agent-interfaces` and
`channel-publishing` say they are installed by the bundle or pulled in by the
skills that require them. Bundles copy `docs/go-essentials.md` (member table,
"why two bundles"). Companions follow the same portability rule as the
artifacts.

### taskfile.yml

Appended to the `artifacts` task's `cmds`, after the code-docs steps:

```yaml
      #
      # The UX, marketing and channel sets are checked WITHOUT a root, for the
      # CSS and docs reason. ux-quality globs one extension per markup or
      # stylesheet language; marketing-quality globs names a build tool requires
      # and records the set itself defines. Measured 2026-11-27: the fleet has no
      # .jsx, .vue, .svelte or .scss file and no positioning, claims or
      # crawler-policy record yet, so liveness against any one root reports dead
      # globs the rules correctly cover. `--forbid` keeps workstation paths, the
      # research corpus and the fleet's own hosts and package names out of
      # artifacts written for any team.
      - "{{.PY}} .claude/skills/research-lang/scripts/check-artifacts.py --forbid '/home/mherwig' --forbid '.agents/research' --forbid 'research-lang/exemplars' --forbid 'ocx.sh' --forbid 'grimoire.rs' --forbid 'grimoire-rs/' --forbid 'ocx-sh/ocx' --forbid 'ocx-sh/website' --forbid '@ocx-sh/' --forbid 'grim-gui' rules/ux-quality.md rules/marketing-quality.md skills/ux-cli skills/ux-agent-interfaces skills/ux-review skills/positioning-brief skills/release-notes skills/marketing-review skills/marketing-measurement skills/channel-publishing skills/github-presence skills/linkedin-post skills/youtube-video skills/microblog-post skills/terminal-demo skills/community-post skills/launch-plan"
      #
      # Every Python check in these sets carries fixtures and --self-test. The
      # .mjs checks need a browser or a platform's counter library and are not
      # run here.
      - |
        for s in skills/ux-quality-reference/checks/*.py skills/ux-cli/checks/*.py skills/ux-agent-interfaces/checks/*.py skills/marketing-quality-reference/checks/*.py skills/marketing-measurement/checks/*.py skills/release-notes/checks/*.py skills/channel-publishing/checks/*.py skills/github-presence/checks/*.py skills/linkedin-post/checks/*.py skills/youtube-video/checks/*.py skills/microblog-post/checks/*.py skills/terminal-demo/checks/*.py skills/community-post/checks/*.py skills/launch-plan/checks/*.py; do
          {{.PY}} "$s" --self-test || exit 1
        done
      #
      # Platform facts go stale on a date (CH-CORE-13). This fails when any row
      # is past verified + refresh_days, which is the refresh cadence each
      # platform skill states. Re-fetch the row; never move the date.
      - "{{.PY}} skills/channel-publishing/checks/facts_check.py skills/*/references/facts.md"
```

## Units

21 authoring units run in parallel (order 1), then one integration unit
(order 2). File sets are disjoint: verified by script over
`product-resume/authoring-units.json` (104 paths in 22 units; every path was
compared against every other unit's, with a trailing-slash entry treated as a
directory prefix; zero overlaps, no duplicate path, and all 21 artifacts are
owned by some unit). Each unit's
`spec` names its heading below.

### Unit: ux-quality-index

Writes `rules/ux-quality.md` (rule spec above), the reference skill's SKILL.md,
`verification.md`, and the gate checks (`page_structure.py`, `axe-fixture.mjs`,
`ui-matrix.mjs`, `wcag22-ids.txt`, fixtures under `checks/fixtures/verify/`).
Reads all eight UX consolidations for the non-negotiables, but writes only
UX-VERIFY rows in depth. The routing table names the depth files the other UX
units write, by the names fixed in this plan.

### Unit: ux-a11y-depth

Writes `widgets.md`, `focus-and-colour.md`, `motion-and-announcements.md`,
`page-structure.md`, and `focus_outline.py`, `wcag_contrast.py`,
`focus_diff.mjs`, `colour_only.mjs`, fixtures under `checks/fixtures/a11y/`.
Source `ux-a11y-authoring`. Ports the puppeteer-core scripts to Playwright.

### Unit: ux-states-text-depth

Writes `states.md`, `forms.md`, `editor-extensions.md`, `text.md`,
`scan_wv.py`, `text_scan.py`, fixtures under `checks/fixtures/states/` and
`checks/fixtures/text/`. Sources `ux-interface-states`, `ux-interface-text`,
`ux-a11y-authoring` (UX-A11Y-35 only). Omits UX-TEXT-05, 07, 12 and 23, which
`ux-cli` writes.

### Unit: ux-actions-ai-depth

Writes `actions.md` (UX-ACT-01 to 11, with the tier table every surface cites),
`ai-features.md` (all of UX-AI, with the AI Act dates as an `expires:`-style
re-check line), `actions_scan.py`, `model-output-cases.json`, fixtures under
`checks/fixtures/actions/`. Sources `ux-consequential-actions`, `ux-ai-features`.

### Unit: ux-cli

Writes `skills/ux-cli/` (skill spec above). Sources `ux-cli-interaction`,
`ux-interface-text`, `ux-consequential-actions`.

### Unit: ux-agent-interfaces

Writes `skills/ux-agent-interfaces/`. Sources `ux-agent-facing-interfaces`,
`ux-consequential-actions`.

### Unit: ux-review

Writes `skills/ux-review/`. Source `ux-verification-claims`, plus the MUST
lists of the other UX topics. Refers to checks and files by the names in this
plan.

### Unit: marketing-quality-index

Writes `rules/marketing-quality.md`, the reference SKILL.md, `claims.md`,
`trust-claims.md`, `claims_lint.py` with fixtures under `checks/fixtures/claims/`.
Reads all five marketing-quality consolidations for the non-negotiables.

### Unit: marketing-positioning-voice-depth

Writes `positioning.md`, `first-screen.md`, `voice.md`, `positioning_check.py`
with fixtures under `checks/fixtures/positioning/`. Sources
`marketing-positioning-record`, `marketing-first-screen-copy`,
`marketing-voice-ai-authorship`.

### Unit: marketing-discoverability-depth

Writes `discoverability.md`, `head_check.py`, `live_site_check.py`,
`shingle.py`, fixtures under `checks/fixtures/seo/`. Source
`marketing-discoverability`. MKT-SEO-19 is omitted (decision 12).

### Unit: marketing-procedures

Writes `skills/positioning-brief/` and `skills/marketing-review/`. Sources
`marketing-positioning-record`, `marketing-voice-ai-authorship`,
`marketing-first-screen-copy`, `marketing-claims-evidence`.

### Unit: marketing-measurement

Writes `skills/marketing-measurement/`. Source `marketing-measurement`.
Resolves the MKT-MEAS-17 and CH-GH-25 pair by reading both.

### Unit: release-notes

Writes `skills/release-notes/`. Sources `marketing-release-announcements`,
`channel-github` (CH-GH-07 to 12 only).

### Unit: channel-publishing

Writes `skills/channel-publishing/`. Source `channel-agent-boundary`. Its
`facts_check.py` is the format every platform unit writes against, so its
column grammar is exactly CH-CORE-12; platform units write against that row and
do not wait for this unit.

### Unit: github-presence

Writes `skills/github-presence/`. Sources `channel-github` (all but CH-GH-07 to
12), `channel-communities` (CH-COM-16 to 20).

### Unit: linkedin-post

Writes `skills/linkedin-post/`. Sources `channel-linkedin`,
`channel-agent-boundary` (LinkedIn seed rows and label rows).

### Unit: youtube-video

Writes `skills/youtube-video/`. Sources `channel-youtube`,
`channel-agent-boundary` (YouTube seed rows and label rows).

### Unit: microblog-post

Writes `skills/microblog-post/`. Sources `channel-microblog`,
`channel-agent-boundary` (X, Bluesky, Threads and Mastodon seed rows).

### Unit: terminal-demo

Writes `skills/terminal-demo/`. Source `channel-terminal-video`.

### Unit: community-post

Writes `skills/community-post/`. Sources `channel-communities` (all but
CH-COM-16 to 20), `channel-agent-boundary` (venue seed rows).

### Unit: launch-plan

Writes `skills/launch-plan/`. Sources `channel-launch`, `channel-communities`,
`channel-github` (signal ids for the goal field).

### Unit: integration

Runs after every order-1 unit. Writes `publish.toml`, `taskfile.yml`, the two
bundles, the 21 `docs/` companions, the two glyphs and two marks, and every
applied cross-edit in the collision table (rows 1, 2, 3, 4, 5, 7), with their
version bumps. Then runs `task artifacts`, every new script's `--self-test`,
`grim publish --dry-run` if `grim` is on the path, and the trigger evals of
`validation.md` (three should-trigger phrasings and one should-not neighbour per
skill), and reports each skill whose description failed. It edits no file an
order-1 unit wrote, except to report a defect back.

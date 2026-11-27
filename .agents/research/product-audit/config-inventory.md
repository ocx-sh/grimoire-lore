---
title: Config inventory — AI-agent configuration touching UX, accessibility, copy, docs and marketing
program: product (ux + marketing)
worker: grounding / config-inventory
date_researched: 2026-11-27
model: sonnet
sources_fetched: 0
---

# Config inventory

Scope: every AI-agent configuration file under `/home/mherwig/dev` and every
rule, skill and bundle in this catalog worktree that touches interface, UX,
accessibility, visual design, copy, README, release notes, SEO, social or
marketing. This axis is local-only. No external page was fetched, so
`sources_fetched` is 0. Where a config cites an external standard (WCAG,
Keep a Changelog, GOV.UK), the citation is quoted as the config states it and
is not re-verified here.

`W` below is `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product`.
`F` is `/home/mherwig/dev`. All paths in the tables are relative to `F` for the
fleet and to `W` for the catalog.

## Method and reproduction

Everything is re-runnable from these commands. `S` is any scratch directory.

```bash
# 1. every candidate config file, excluding node_modules, target, .git, worktrees, .venv
cd /home/mherwig/dev
find . \( -name node_modules -o -name target -o -name .git -o -path '*/.agents/worktrees' -o -name .venv \) -prune -o \
  \( -name CLAUDE.md -o -name AGENTS.md -o -name GEMINI.md -o -name .cursorrules -o -name copilot-instructions.md \
     -o -path '*/.claude/rules/*' -o -path '*/.claude/skills/*' -o -path '*/.claude/agents/*' -o -path '*/.claude/commands/*' \
     -o -path '*/.cursor/*' -o -path '*/.github/instructions/*' -o -path '*/.agents/skills/*' -o -path '*/.agents/rules/*' \) \
  -type f -print > $S/cfg.txt
# 2. content hash, to separate installed copies from distinct files
xargs -d '\n' md5sum < $S/cfg.txt | cut -c1-32 | sort -u | wc -l
# 3. term sweep (example: accessibility vocabulary), distinct contents only
grep -lE 'WCAG|prefers-reduced-motion|aria-label|axe|screen reader' $(cat $S/cfg.txt) | xargs -d '\n' md5sum | awk '!s[$1]++{print $2}'
```

Headline counts (command in each row):

| Measure | Value | Command |
|---|---|---|
| Config files after excluding research, retro, plans, ADR, goals, review, specs and `.claude/artifacts` | 3,123 | step 1 plus `grep -v` of those directories, then `wc -l` |
| Distinct contents among them | 918 | step 2 |
| `CLAUDE.md` files / `AGENTS.md` files | 27 / 11 | `grep -c '/CLAUDE.md$'` and `'/AGENTS.md$'` on the list |
| Top-level `.claude/rules/*.md` files, all repos | 270 | `grep -cE '/\.claude/rules/[^/]+\.md$'` |
| Distinct rule file names | 88 | same, `xargs -n1 basename \| sort -u \| wc -l` |
| `SKILL.md` files / distinct skill names | 335 / 68 | `grep -c '/SKILL.md$'`; `dirname \| xargs -n1 basename \| sort -u \| wc -l` |
| `.cursor`, `.cursorrules`, `copilot-instructions.md`, `GEMINI.md`, `.github/instructions` | 0 | `find . ... -name '.cursor' -o -name copilot-instructions.md -o -name GEMINI.md` |
| Catalog rules / skill directories / bundles | 25 / 50 / 13 | `ls $W/rules/*.md \| wc -l`; `ls -d $W/skills/*/ \| wc -l`; `ls $W/bundles \| wc -l` |

Rough share of UX, copy and docs guidance. Distinct rule names touching the
domain are 12 of 88: `css-theming`, `docs-quality`, `docs-style`,
`quality-cli-help`, `quality-design-tokens`, `subsystem-website`,
`subsystem-site`, `subsystem-site-client`, `subsystem-web`, `product-context`,
`update-docs`, `workflow-release`. Distinct skill names touching it are 12 of
68: the six `ocx-theme-*`, `docs`, `docs-plan`, `docs-review`,
`docs-instrument`, `changelog`, `prepare-release`. The list is a hand
selection from the name sweep, so the percentages (14 percent of rule names,
18 percent of skill names) are approximate.

Key structural fact: the fleet is mostly installed copies. `docs-quality.md`
exists in 11 repos in two versions (12,376 B in `grimoire-rs/grim-gui` and
`grimoire-rs/grim-mirror`, 11,832 B in the other nine; catalog worktree is
12,376 B). Command: `md5sum` over `$F/*/*/.claude/rules/docs-quality.md`.

## A. Catalog (this worktree)

Everything here is portable by construction. Activation column: `path` = rule
frontmatter `paths:` globs; `skill` = loads on description match or by
requirement from a rule.

| Artifact | Size | Activation | Touches |
|---|---|---|---|
| `rules/css-theming.md` | 16,214 B | path, 24 globs incl. `**/*.css`, `**/*.tsx`, `**/*.html`, `**/*.astro` (`rules/css-theming.md:2-26`) | tokens, cascade layers, dark parity, forced-colors, focus |
| `skills/css-theming-reference/` | `rules.md` plus 11 per-framework files | skill, required by the rule (`metadata.grim.requires.skills`) | 15 non-negotiables, `CSS-*` IDs |
| `rules/docs-quality.md` | 12,376 B | path, 10 globs (`**/*.md`, `**/*.mdx`, `**/*.rst`, `**/*.adoc`, generator configs) (`rules/docs-quality.md:2-12`) | page types incl. landing, readme, changelog; plain English; marketing superlatives |
| `skills/docs-quality-reference/` | page-types 34,566 B, plain-english 17,118 B, examples 24,144 B, plus navigation, observability, machine-readers, checks (7 scripts) | skill, required by the rule | 159 `DOC-*` rows |
| `skills/docs-plan`, `docs-review`, `docs-instrument` | `docs-review/SKILL.md` 3.6 KB | skill (description trigger) | discovery, on-demand grading, CI wiring |
| `rules/typescript-quality.md` plus `skills/typescript-quality-reference/browser.md` | 12,253 B; 191 lines | path, 7 globs | `TS-WEB-06` a11y lint at `error`, `TS-WEB-09` entry-chunk budget |
| `skills/rust-quality-reference/tui.md` | 201 lines | skill, loaded "whenever anything under a `tui/` module is in play" (`tui.md:5`) | 29 `TUI-*` rows, terminal interaction and feedback |
| `skills/{rust,go,python,typescript,swift}-quality-reference/cli-contract.md` | rust 181, go 239, python 206, typescript 161, swift 320 lines (`wc -l`) | skill | streams, colour, prompts, progress, help text (`CLI-12`) |

Counts: `grep -cE '^\| DOC-' skills/docs-quality-reference/*.md` gives
page-types 54, examples 30, navigation 32, observability 18, plain-english 18,
machine-readers 7, total 159. `grep -cE '^\| TUI-' skills/rust-quality-reference/tui.md`
gives 29. `grep -c 'TS-WEB-' skills/typescript-quality-reference/browser.md` gives 36
mentions, 14 rules (TS-WEB-01 to 14).

### Digest of normative content, catalog

All quotes verbatim.

**docs-quality** (`rules/docs-quality.md`, `skills/docs-quality-reference/`)

- Scope: "a merge gate for documentation, expressed as counted limits and
  runnable scripts. It is not a voice, a template, or an opinion about how a
  page should read" (`rules/docs-quality.md:22-24`).
- Landing (`page-types.md:128-133`): DOC-TYPE-10 "Hold a landing page's lead-in
  positioning prose to one sentence"; DOC-TYPE-11 runnable command or link menu
  "before word 150" (fail); DOC-TYPE-12 "Cap a landing page at two button-style
  calls to action"; DOC-TYPE-13 state who the docs are for (unverified:
  reading heuristic); DOC-TYPE-14 "Never publish placeholder text" (`lorem
  ipsum`, `placeholder text`, `TODO: write`, `coming soon`); DOC-TYPE-15
  "Never state an adoption, popularity or trust claim without a link to its
  source".
- README (`page-types.md:143-147`): plain-language description before any
  non-descriptive content (DOC-TYPE-32), name the one zero-to-using action
  (-33), link the docs site (-34), state a license (-35), "State who the
  project is for, separately from what it does" (-36, CONSIDER).
- Changelog (`page-types.md:148-152`): Keep a Changelog headings exactly
  (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`), "never
  require all six" (-37); "Never let a version section be a re-rendered commit
  log" (-38, SHOULD, unverified: reading heuristic); never gate on `##
  [Unreleased]` (-40); credit keepachangelog.com when the template sentence is
  used (-41).
- Prose (`plain-english.md`): DOC-PLAIN-01 no "em dashes, en dashes,
  semicolons or curly quotes"; -02 "Split any prose sentence longer than 25
  words"; -03 paragraph at most 5 sentences; -05 Flesch reading ease 50 or
  above (skip pages under 300 prose words); -08 remove chatbot artifacts and
  AI badges; -10 vocabulary tells gated on density, default 3 per 1,000 words,
  "uncalibrated"; -11 no time-relative words ("currently", "latest");
  -12 marketing superlatives list `powerful`, `seamless`, `revolutionary`,
  `game-chang`, `supercharge`, `unlock`, `empower`, `cutting-edge`, `robust`,
  `effortless`; -14 sentence-case headings (unverified); -15 "Write every link
  inline and never as a reference-style definition"; -22 `AI assistance:
  yes|no|partial` key in the PR body.
- Accessibility in this set is narrow: DOC-EX-15 no autoplay (WCAG 2.2.2),
  DOC-EX-16 keep the player's controls, DOC-EX-34 tooltip keyboard-reachable
  and Escape-dismissible (WCAG 1.4.13) (`examples.md:73,74,98`). The rule
  states its own hole: "Page-level accessibility is governed nowhere here. Alt
  text, contrast, keyboard order, table semantics, the sidebar and the search
  widget are out of scope" (`rules/docs-quality.md:184-186`), and "the
  marketing wordlist have no measured false-positive rate" (`:187-188`).
- Machine readers: DOC-AGENT-04 `llms.txt` "as a recommended index, never as
  the required agent-readability mechanism" (`machine-readers.md:21`).
- Rollout: "Enforce at error on changed files from the first commit. Warn whole
  tree until the backfill lands" (`rules/docs-quality.md:95-99`).

**css-theming** (`rules/css-theming.md`, `skills/css-theming-reference/rules.md`)

- 15 non-negotiables (`rules/css-theming.md:90-104`). UX-relevant: CSS-TOK-01
  "Any appearance value written as a literal is unreachable by the consumer";
  CSS-TOK-03 a colour token missing from either scheme "silently pins to the
  other's value"; CSS-A11Y-01 `forced-colors` overrides everything and "SVG
  `fill` is not touched at all, so icons need `CanvasText`" (rule row
  `rules.md:48`).
- Gate: four scripts over the built CSS (`outside-layers.mjs`,
  `literal-colours.mjs`, `dark-parity.mjs`, plus a build) (`:66-72`).
- Declared holes: Firefox and WebKit untested, every measurement is "Chromium
  151.0.7922.34"; VS Code webviews not probed (`:166-176`).
- Not covered: contrast ratios, focus order, motion preferences, typography
  scale, spacing. Sweep: `grep -rli 'prefers-reduced-motion' $W/rules $W/skills`
  returns 3 files, none a rule.

**TS-WEB-06** (`skills/typescript-quality-reference/browser.md:78`): "Run a
static accessibility lint in the same invocation as the rest of the lint, at
`error`: `eslint-plugin-jsx-a11y` for JSX, `eslint-plugin-vuejs-accessibility`
for SFCs, or Biome's `a11y` group". Marked as an adopter-overridable default.

**TUI** (`tui.md`): TUI-17 Ctrl-C always quits; TUI-18 "`Esc` cancels the
current mode/overlay/filter and steps back one level; it never exits the
process"; TUI-20 arrows and vim keys; TUI-21 "both a persistent
context-relevant key-hint bar in the primary view and a full `?` help
overlay"; TUI-22 "Colour is never the only channel for meaning"; TUI-23
feedback ladder "under ~1 s nothing, 1-10 s an indeterminate spinner, past ~10 s
a determinate progress indicator **and** a cancel path"; TUI-24 resize and
minimum size; TUI-25 mouse capture off by default.

**CLI contract** (`rust-quality-reference/cli-contract.md:123-138`): CLI-01
result to stdout, everything else to stderr; CLI-07 colour via
`anstream`/`colorchoice` plus `--color auto|always|never`; CLI-08 progress to
stderr, suppressed when not a TTY or `CI` set; CLI-09 never prompt without a
TTY, ship `--yes`/`--no-input`; CLI-12 "A `///` on a clap-facing surface
states the user contract and nothing else: ASCII only, short help ≤ ~70
chars"; CLI-16 "Print something within ~100 ms for any command doing network
I/O" (CONSIDER). These are already covered and out of scope for new sets.

### Catalog term sweep (counts of files, all of `rules/ skills/ bundles/`)

Command pattern: `grep -rliE '<term>' $W/rules $W/skills $W/bundles --include='*.md' --include='*.toml' --include='*.py' | grep -v checks/fixtures | wc -l`.

| Term | Files | Reading |
|---|---|---|
| `WCAG` | 1 | `examples.md` only |
| `accessib` | 12 | docs-quality, css-theming, browser.md, csharp language |
| `aria-` | 1 | one file |
| `prefers-reduced-motion` | 3 | none is a rule |
| `prefers-color-scheme` | 0 | dark mode is covered only as `light-dark()` and token parity |
| `focus-visible` | 0 | no focus-ring rule |
| `alt text` | 7 | docs navigation, page-types |
| `landing` | 23 | mostly `docs-quality` |
| `og:image`, `Open Graph`, `meta description`, `canonical`, `JSON-LD`, `SEO` | 42 | noise: `canonical` matches "canonical JSON" in the Rust, Go and C# sets. No rule on titles, descriptions, social cards |
| `marketing`, `positioning`, `copywrit`, `tone of voice`, `LinkedIn`, `YouTube` | 7 | all are the wordlist or "not a voice" disclaimers |
| `empty state`, `loading state`, `skeleton`, `spinner` | 11 | TUI and TS runtime, not design guidance |
| `i18n`, `localiz` | 7 | encoding and formatting, not UI |

## B. Fleet: UX, copy, docs and marketing configuration

Rows are distinct contents. "Copies" is the number of repos holding the same
bytes (`md5sum`). Activation was read from frontmatter.

| Path (first copy) | Size | Copies | Activation | Subject |
|---|---|---|---|---|
| `ocx-sh/ocx/.claude/rules/quality-cli-help.md` | 7,333 B, 145 L | 1 | path `crates/ocx_cli/src/**` | CLI help text |
| `ocx-sh/ocx/.claude/rules/docs-style.md` | 9,998 B, 194 L | 1 | path `website/**` | docs narrative, links, terms |
| `grimoire-rs/grimoire/.claude/rules/docs-style.md` | 3,990 B, 125 L | 1 | path `docs/**` | same, shorter |
| `grimoire-rs/grim-mirror/.claude/rules/docs-style.md` | 2,120 B, 69 L | 1 | path `docs/**`, `README.md` | same, shortest |
| `ocx-sh/ocx/.claude/rules/subsystem-website.md` | 9,690 B, 116 L | 1 | path `website/**` | Starlight site: budgets, sidebar, styling |
| `ocx-sh/ocx/.claude/skills/docs/SKILL.md` plus 3 references | 3,828 B plus 10,331 B | 1 | skill | OCX docs workflow, vocabulary, terminal frames |
| `grimoire-rs/grimoire/.claude/skills/docs/SKILL.md` | 1,694 B | 1 | skill | Grimoire docs workflow |
| `ocx-sh/website/skills/ocx-theme-{components,deploy,icons,quality,setup,theming}` | 157,752 B across 6 SKILL.md and 12 references (`ls ocx-sh/website/skills/*/references/*.md | wc -l`) | 6 dirs at source, installed as 12 dirs each in `devcontainer-features` and `rules_ocx` (`.agents` and `.claude`) | skill (description trigger), bundle `ocx-theme` | the `@ocx-sh/theme` design system for agents |
| `ocx-sh/website/AGENTS.md` | 11,678 B | 1 | always-on (`CLAUDE.md` imports it) | theme repo contract: icons, assets, budgets, Zag |
| `ocx-sh/catalog/.claude/rules/quality-design-tokens.md` | 3,548 B, 66 L | 1 | path `src/site/**/*.astro` | tokens consumed, never minted |
| `ocx-sh/catalog/.claude/rules/subsystem-site.md`, `subsystem-site-client.md` | 13,227 B; 8,938 B | 1 each | path `src/site/**`; `src/site/client/**` | catalog site pages, islands, skip link, copy buttons |
| `grimoire-rs/grim-gui/.claude/rules/subsystem-web.md` | 2,678 B, 52 L | 1 | path `src/**`, `index.html` | GUI front end: CSP, `textContent`, three states |
| `grimoire-rs/vscode/CLAUDE.md` | 4,006 B | 1 | always-on | webview UI: lit-html, codicons per kind, empty states |
| `ocx-sh/ocx/.claude/rules/product-context.md` (and 5 variants) | 14,431 B; 3,152 to 7,933 B | 6 distinct, one per repo | path e.g. `website/**`, `.agents/{plans,adr,specs,research}/**`, 4 agent files | positioning, differentiators, "why not" rebuttals |
| `grimoire-rs/grimoire/.claude/skills/changelog/SKILL.md` | 4,705 B | 1 | skill, `user-invocable`, triggers "changelog page", "release notes" | site changelog from `CHANGELOG.md` |
| `grimoire-rs/grimoire/.claude/skills/prepare-release/SKILL.md` | 6,802 B | 1 | skill | release prep incl. breaking markers |
| `ocx-sh/ocx/.claude/rules/workflow-release.md`, `AGENTS.md:33` | 20,386 B | 1 | path `CHANGELOG.md` and release files | changelog is commit subjects |
| `grimoire-rs/grimoire/.agents/specs/design_brief_landing_page.md` | 8,441 B | 1 | none: a spec, not config, but the only written claim policy | landing-page claim limits |
| `grimoire-rs/grimoire/.agents/release_notes_callouts_next.md` | 3,289 B | 1 | none | staged release-note bullets |
| `ocx-sh/www-setup/.claude/rules/update-docs.md` | 4,182 B | 1 | none declared | keep README and site docs in sync |

Installed from this catalog, per repo (`grep -E 'docs-essentials|css-theming|ocx-theme' <repo>/grimoire.toml`;
16 `grimoire.toml` files outside test fixtures, `find . ... -name grimoire.toml | grep -v 'test/\|fixtures' | wc -l`):
`docs-essentials` in 10 (`grim-mirror`, `grim-gui`, `devcontainer-features`,
`rules_ocx`, `www-setup`, `ocx-mirror`, `catalog`, `conventions`, `ocx`,
`website`), absent in 6 (`grimoire`, `indexer`, `indexbot`, `index`, `arcana`,
`grimoire-lore`). `css-theming` in 2 (`grimoire-rs/indexer`, `ocx-sh/website`).
`ocx-theme` in 2 (`ocx-sh/devcontainer-features`, `ocx-sh/rules_ocx`).
`grimoire-rs/grimoire` has no `docs-*` line in its `grimoire.toml` yet holds
`.claude/rules/docs-quality.md` directly, because it is the source repo of the
rule's origin set.

### Digest of normative content, fleet

**CLI help** (`ocx-sh/ocx/.claude/rules/quality-cli-help.md`)

- "`///` on a clap surface states the user contract. Nothing else." (`:25`)
- Short help "One imperative line... Target <= ~70 chars. No trailing period"
  (`:37`); long help "Complete US-English sentences" with a docs link (`:38`).
- Forbidden in help text, Block tier (`:69-86`): section or clause references,
  ADR or code-path references, "Dates and build timestamps", "Migration
  history" ("formerly ..."), "Implementation jargon", incorrect behaviour.
- Block: "Non-ASCII byte in help" (`:94-96`). Warn: more than 2 inline examples
  (`:101`), tautological help, `-file`/`-path` suffix on input flags
  (`:106-109`).
- Gates: `cli_help_text_is_ascii`, `cli_help_text_has_no_internal_references`,
  `test_completion_ascii.py` (`:123-128`).
- Portable: the one rule, two-tier help, forbidden provenance, flag defaults and
  env-var note. Repo-specific: clap, crate path, test names. Already in
  catalog as `CLI-12`.

**Docs narrative** (`ocx-sh/ocx/.claude/rules/docs-style.md`, with weaker twins)

- Every `##` opens with idea, problem, solution (`:14-20`). "No sales pitch or
  marketing open. 'One identifier. All platforms. No hash list.' — avoid."
  (`:22`). Twins: `grimoire docs-style.md:29`, `grim-mirror docs-style.md:26-27`.
- "Always search internet before writing comparisons or analogies" (`:46`);
  "Every external tool mentioned must hyperlink — every occurrence" (`:50`).
- Headers: short, "Bad: `### Automatic Detection of Platform`... Good: `###
  Auto-Detection`" (`:37-39`); custom anchor on every heading (`:40`).
- Terms: product is "**OCX** in prose; `ocx` is only the command"; a test
  fails a bare lowercase `ocx` (`:87`). One term per concept, decisions table in
  `.claude/skills/docs/references/vocabulary.md` (`:81`).
- Callouts: `:::note`, `:::tip`, `:::caution`, `:::danger` with usage table
  (`:108-113`).
- Link syntax: "Use reference-style links — **never inline `[text](url)` in
  body**" (`:129`).
- Never record a cast whose output is a `--help` dump (`:160-168`). Reference
  pages: intro at most two sentences, description at most two sentences, one
  fenced block, one See line (`:174-185`).
- Portable: narrative order, no marketing opener, hyperlink every tool, short
  headings, one-term-per-concept, callout taxonomy. Repo-specific: product-name
  casing, component names, Starlight callouts, test paths.

**Site design system** (`ocx-sh/devcontainer-features/.agents/skills/ocx-theme-*`, identical to `ocx-sh/website/skills/`)

- Bar: "Lighthouse 100 in performance, accessibility, best practices and SEO,
  and a first paint that is final" (`ocx-theme-quality/SKILL.md:12-13`).
- Budgets table (`:37-47`): HTML 14,200 B gzip; script before input 11 KiB;
  script after interaction 64 KiB; Pagefind 58 KiB; total transfer 126 KiB;
  font 42,000 B; stylesheet 38 KiB; DOM 800 elements; JS heap 4 MiB. "A budget
  goes up only with a written reason in the commit" (`:54-55`).
- Gates (`:20-28`): axe on each page "with menus and dialogs open", "Any
  violation" blocks; images-blocked layout test; lazy hydration; lychee.
- Colour: "Coral is the only interactive colour"; "Small text on light uses
  `accent-fg`. Coral on white fails contrast below 18px"
  (`ocx-theme-theming/references/design-rules.md:9,17-18`; SKILL non-negotiables
  3 and 4, `ocx-theme-theming/SKILL.md:33,38`).
- Type: "UI density 13px, prose 15.5px... Nothing below 15px outside the UI
  scale" (`design-rules.md:40-43`); mono for identifiers, sans for sentences
  (`:33`).
- Shape: "Square corners; 2px at most on large surfaces"; "Shadows only on floating
  surfaces" (`:49,56`).
- Focus: "One focus ring... Never remove an outline without drawing this ring
  instead" (`ocx-theme-theming/SKILL.md:41-44`).
- Components: "An accessible name is required, and the types enforce it"
  (`ocx-theme-components/SKILL.md:39`); `variant="primary"` once per view (`:52`).
- Assets: reserved box on every image; "The page must look identical with
  images blocked"; inline SVG icons at 2 KB or less (`design-rules.md:71-77`).
- Icons: "An agent never draws, redraws or edits icon paths"
  (`design-rules.md:85`; `ocx-theme-icons/SKILL.md:16-23`; `ocx-sh/website/AGENTS.md:46`).
- Fonts: "only the theme's two families at 400 and 600, upright only" (`quality:83`).
- Portable: the do/don't structure, accent-only-interactive, one focus ring,
  tokens only, images-blocked test, never-draw-icons, budgets as a counted table.
  Repo-specific: every `--ocx-*` name, coral, Zag, `frag/` pages, `ocx-site check`.

**Website subsystem** (`ocx-sh/ocx/.claude/rules/subsystem-website.md`)

- "Each page is gated at 900 DOM elements and 100 in four Lighthouse
  categories" (`:83`). "Every element that pops, expands, collapses or moves
  animates entry and exit." (`:94`). "never hardcode colors — light/dark
  switches through the variables" (`:93`). Install page "fits one screen" (`:87`).

**Catalog site** (`ocx-sh/catalog/.claude/rules/quality-design-tokens.md`)

- "A hex, `rgb()`/`rgba()` or named colour in a `.astro` `<style>` block is
  **Block-tier**" with the grep `rg -n '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/site
  --glob '*.astro'` (`:26-29`); the 24px WCAG 2.5.8 target stays "a commented
  literal naming why" (`:22-23`).

**GUI** (`grimoire-rs/grim-gui/.claude/rules/subsystem-web.md:26-35`)

- Invariants are security and structure only: CSP-clean page, `textContent`
  only, three error states with literal strings ("`grim not found`", "`grim
  failed (exit <code>)`"), render is a pure function, no framework. No rule on
  layout, keyboard, focus, contrast, empty or loading states, or theming. The
  whole front end is `src/main.ts` 22 lines, `src/view.ts` 32 lines,
  `src/styles.css` 7 lines (`grep -c ''`).

**VS Code extension** (`grimoire-rs/vscode/CLAUDE.md:38-45,65-70`)

- "Webview UI renders through lit-html templates — ALWAYS." (`:38`). "theme
  tokens only (`--vscode-*`), codicons per kind (skill=sparkle, rule=law,
  agent=agent, mcp=mcp, bundle=package...), null metadata renders as 'Not
  provided', empty panels are omitted." (`:66-70`).

**Positioning** (`product-context.md`, 6 variants)

- Canonical identity file: "Read when reasoning about project direction...
  doc narratives, competitive positioning" (`ocx-sh/ocx/.../product-context.md:26`).
  Holds key differentiators (`:67-78`), a competitive matrix and "Why not just
  `docker pull`?" rebuttals (`:84-105`), and an update protocol ("Stale
  positioning degrade every downstream decision", `:161`). Loads only on
  `website/**` and agent-config paths.

**Claim policy** (`grimoire-rs/grimoire/.agents/specs/design_brief_landing_page.md:101-118`)

- A "Do not say" list: no translation claim for skills, no drift-detection or CI
  claim ("`grim status` is a report, not a gate"), no registry scale ("12
  packages, all first-party"), "Adoption, users, companies, headcount, logos,
  testimonials. None.", "Star counts, 'trusted by', social proof of any kind",
  and "Marketing register generally." Hard bar: "The bar: ten seconds"
  (`:40-42`). This is the only file in the fleet that states what a landing page
  must not claim, and it is a one-off design brief under `.agents/specs/`, which
  loads in no session by itself.

**Release notes** (three conflicting models, see section D)

- `grimoire-rs/grimoire/.claude/skills/changelog/SKILL.md`: "what a user can do
  now that they could not before, why it matters, and which doc page shows how";
  per feature "problem → capability → example → link"; "User's words, not commit
  subjects (DOC-TYPE-38). No hype adjectives; the example makes the case."
  (`:90-91`); "Drop `Changed` refactors, CI, tests, internal docs, AI-config
  work".
- `ocx-sh/ocx/AGENTS.md:33`: "The changelog entry is the commit subject... the
  body is never read".
- `grimoire-rs/vscode/CLAUDE.md:57-61`: "**Never hand-write `CHANGELOG.md`**...
  A changelog edit in a diff is a bug, not a courtesy."

## C. Portable versus repo-specific

| Claim | Portable | Evidence |
|---|---|---|
| Tokens only, never literals, both colour schemes | yes | `CSS-TOK-01/03`; `ocx-theme-theming/SKILL.md:24`; `quality-design-tokens.md:26` |
| One focus ring on `:focus-visible`, never remove an outline unreplaced | yes | `ocx-theme-theming/SKILL.md:41` |
| Colour never the only channel | yes | `TUI-22` (terminal only); not stated for GUI or web |
| Accessible name required on every icon-only control | yes | `ocx-theme-components/SKILL.md:39`, `ocx-theme-icons/SKILL.md` |
| axe run with overlays open, any violation blocks | yes | `ocx-theme-quality/SKILL.md:27` |
| Images-blocked layout test, reserved boxes | yes | `ocx-theme-quality/SKILL.md:72-75` |
| Agent never draws icon paths | yes, and a rare agent-specific guard | `ocx-theme-icons/SKILL.md:16-23` |
| No marketing opener, no superlatives (list of 10) | yes | `DOC-PLAIN-12`; `docs-style.md:22` |
| Landing: one-sentence lead, action before word 150, at most 2 CTAs, no unlinked social proof | yes | `DOC-TYPE-10..15` |
| A claims list per product ("do not say") | yes, as a pattern; the content is repo-specific | `design_brief_landing_page.md:101-118` |
| Help text states the user contract only, ASCII | yes | `quality-cli-help.md:25,94` |
| Budgets: HTML 14,200 B, 126 KiB total, 800 DOM, Lighthouse 100 x 4 | no, calibrated to one Astro/Starlight theme | `ocx-theme-quality/SKILL.md:37-47` |
| Coral, 13 px UI, 15.5 px prose, 0 to 2 px radius, no shadows on static surfaces | no, one brand | `design-rules.md` |
| Product name casing `OCX` versus `ocx` | no | `docs-style.md:87` |
| Reference-style links only | contested; contradicts the catalog | section D |
| Codicon per artifact kind | no | `vscode/CLAUDE.md:66` |

## D. Contradictions between configs

1. **Link syntax: catalog versus three fleet rules.** `DOC-PLAIN-15` (installed
   in 11 repos, `plain-english.md:104`) says "Write every link inline and never
   as a reference-style definition". `ocx-sh/ocx/.claude/rules/docs-style.md:129`,
   `grimoire-rs/grimoire/.claude/rules/docs-style.md:105` and
   `grimoire-rs/grim-mirror/.claude/rules/docs-style.md:66` each say the exact
   opposite ("never inline"). The `changelog` skill (`:91`) repeats "Reference-style
   links only". `grim-mirror` states the intent ("Mechanical checks live in
   `docs-quality.md`; this rule carries the voice", `:11-12`) but still contradicts
   a mechanical check. Measured in `grimoire-rs/grimoire/docs/src/content/docs/*.md`:
   1,277 inline links and 778 reference definitions
   (`cat ... | grep -oE '\]\([^)]+\)' | wc -l`; `grep -cE '^\[[^]]+\]: '`), so
   the tree follows neither rule fully.
2. **Changelog: curated versus commit log.** `DOC-TYPE-38` (SHOULD) says never
   re-render a commit log. `ocx-sh/ocx/AGENTS.md:33` makes the commit subject the
   changelog entry, which is that pattern by design. `grimoire-rs/grimoire` hand
   curates a second page per release (`changelog/SKILL.md`) on top of the
   generated file. `grimoire-rs/vscode/CLAUDE.md:57` forbids hand edits.
   Three repos, three release-notes models.
3. **Same skill, different numbers, vendored.** `ocx-theme-quality` in
   `devcontainer-features` (theme 0.7.0) says total transfer 126 KiB
   (`:43`), "best of 3" (`:23`); `rules_ocx` (theme 0.5.0) says 147 KiB
   (`:43`), "judged on its median run" (`:83`). Inside the 0.7.0 copy, `:85` still
   cites "the 147 KiB budget" while its own table says 126 KiB. Commands:
   `diff` of the two `SKILL.md` files; `grep -n 'KiB'`.
4. **DOM budget: 900 versus 800.** `ocx-sh/ocx/.claude/rules/subsystem-website.md:83`
   "gated at 900 DOM elements"; `ocx-theme-quality/SKILL.md:46` "DOM elements |
   800". Different surfaces (site versus theme content page), but neither states
   which wins for a consumer that also loads the theme skills.
5. **Docs voice: three rules, one outline, three lengths.** The idea, problem,
   solution narrative is word-for-word shared across `docs-style.md` in 3 repos
   (194, 125 and 69 lines). Only the 194-line OCX copy has the terminology,
   callout and cast rules. A change to the shared core must be made three times.
6. **Positioning loads where READMEs are not.** `product-context.md` paths are
   `website/**` (ocx) or `.agents/**` and `docs/**` (grimoire). The README,
   which `DOC-TYPE-31` brings into docs-quality scope, edits under none of them,
   so positioning guidance does not load for a README edit. Only `grim-mirror`
   puts `README.md` in a style rule's `paths:`.
7. **Page-level accessibility.** The catalog states it is governed nowhere
   (`rules/docs-quality.md:184`) while two fleet skills (`ocx-theme-quality`)
   and one rule (`quality-design-tokens.md:22`) already hold concrete a11y
   gates. No catalog artifact routes to them because they are not in the catalog.

Measured fleet drift against `docs-quality` (installed version, read-only):

```bash
cd /home/mherwig/dev/grimoire-rs/grimoire
python3 -I .claude/rules/docs-quality/checks/prose.py --root docs/src/content/docs   # rc=1, 2,378 findings
#   1,260 DOC-PLAIN-01, 793 DOC-PLAIN-02, 158 DOC-PLAIN-03, 164 DOC-PLAIN-11, 1 each of -05, -12, -13
cd /home/mherwig/dev/ocx-sh/ocx
python3 -I .claude/rules/docs-quality/checks/prose.py --root website/src/content/docs # rc=1, 670 findings
#   507 DOC-PLAIN-01, 71 DOC-PLAIN-02, 60 DOC-PLAIN-03, 29 DOC-PLAIN-11, 2 -05, 1 -12
```

Declaration coverage is complete: 116 of 116 OCX docs pages and 45 of 45
Grimoire docs pages carry `doc_type:` (`grep -rl 'doc_type:' ... | wc -l` against
`find ... -name '*.md*' | wc -l`). Prose rules are warnings by design, so
findings do not block (`rules/docs-quality.md:195-198`), but 1,260 em-dash
findings in one tree says the punctuation ban is not followed by the repos that
installed it.

## E. Gaps: surfaces with no guidance at all

Sweep command (fleet): `bash terms.sh` over the config list with `grep -lE`;
counts are files, "distinct" is distinct by `md5sum`.

| Surface | Fleet files mentioning it | Reading |
|---|---|---|
| LinkedIn, YouTube, Hacker News, Product Hunt, Reddit, Mastodon, Bluesky, Twitter | 0 | no social or video channel guidance anywhere |
| newsletter, email | 1 | not guidance |
| tone of voice, voice and tone, microcopy | 0 | the only voice rule is "no sales pitch" |
| tagline, value proposition | 1 | not guidance |
| testimonial, social proof, "trusted by" | 27 files, 5 distinct | all are `DOC-TYPE-15` and its fixtures, plus the claim policy in the landing brief |
| analytics, Plausible, Umami, Matomo | 84 files, 13 distinct | docs reader signals (`observability.md`, `docs-instrument`), not marketing measurement |
| SEO: title, meta description, Open Graph, structured data | content guidance: 0 | only mechanism: theme adds `@astrojs/sitemap`, `robots.txt` (`ocx-theme-setup/SKILL.md:245-248`); catalog has `test/acceptance/seo.test.ts` (`quality-design-tokens.md:48`) |
| Brand: wordmark, logo, naming | 8 distinct files | `OCX` versus `ocx` casing and the icon registry; no logo-use, no colour-of-brand rule outside `ocx-theme` |
| Responsive layout, breakpoints | 1 line | "Breakpoints are not tokens" (`quality-design-tokens.md:44`) |
| Motion | 1 line | `subsystem-website.md:94` "animates entry and exit"; no reduced-motion rule |
| Forms, validation, error and empty-state wording | 0 for web and GUI | TUI feedback ladder only; `vscode/CLAUDE.md:68-69` "Not provided", "empty panels are omitted" |
| Onboarding, first-run | 108 files, 24 distinct | all docs "first-steps" tier or TUI, not product onboarding |
| Internationalisation of UI | 28 files, 7 distinct | encoding and Windows console, not translation of UI |
| Desktop GUI design (`grim-gui`) | 0 | front end is 22 + 32 + 7 lines, no UX rule beyond security |
| README voice and structure | `docs-quality` mechanics only | `DOC-TYPE-32..36`; no voice, no badge or demo-GIF policy; README of VS Code extension is 17,748 B with no rule |
| GitHub release body, repo "About", topics, social preview image | 0 | `ocx-sh/rules_ocx/.claude/rules/release.md` is a 13-line procedure |
| Competitor comparison pages | 0 rules | only the internal matrix in `product-context.md:84` |
| AI-disclosure rules (public content) | 1 (`DOC-PLAIN-22`) | PR body only; none for marketing posts |
| Cursor, Copilot, Gemini config | 0 files | the fleet is Claude-only plus `.opencode` in `ocx-sh/website`; the catalog distributes to ten clients but the fleet exercises one |

UI surface sizes (source files, command `find <repo> ( -name node_modules -o -name target -o -name .git -o -name dist ) -prune -o -type f ( -name '*.astro' -o -name '*.tsx' -o -name '*.css' -o -name '*.vue' -o -name '*.svelte' ) -print | wc -l`):
`ocx-sh/website` 186, `grimoire-rs/vscode` 40, `grimoire-rs/indexer` 32,
`ocx-sh/catalog` 25, `grimoire-rs/grimoire` 11, `ocx-sh/index` 7, one each in
`ocx`, `www-setup`, `grim-gui`. Only `ocx-sh/website` (186 files) has substantial
UX configuration. `grimoire-rs/vscode` (40 files) and `ocx-sh/catalog` (25)
have a few lines each. `ocx-sh/catalog` and `ocx-sh/www-setup` list `@ocx-sh/theme`
in `package.json` (`^0.5.0` and a pinned git commit) and install none of the six
`ocx-theme-*` skills (`grimoire.toml` shows the bundle only in `devcontainer-features`
and `rules_ocx`); `ocx-sh/ocx/website` pins `0.6.0` and also installs none. Seven
packages wear the theme at four versions: 0.5.0 (`catalog`, `rules_ocx`), 0.6.0
(`ocx`), 0.7.0 (`devcontainer-features`), a git commit (`www-setup`), plus
`workspace:*` in the source repo
(`grep -E '"@ocx-sh/theme"' $(find . -name package.json -not -path '*/node_modules/*')`).

## Smells

Ranked by how much each costs an agent that follows it without a human.

1. **A strong UI contract lives outside the catalog and is stale where installed.**
   The six `ocx-theme-*` skills (157,752 B) hold the only real design-system
   guidance with counted budgets, a11y gates and a never-draw-icons guard, but
   they are published from `ocx-sh/website`, not from this catalog, installed in
   2 of 7 theme-wearing packages, and diverge across copies (126 vs 147 KiB,
   best-of-3 vs median).
2. **Direct contradiction on link syntax** between an installed gate rule
   (`DOC-PLAIN-15`) and three repo rules plus a skill. An agent obeying the
   nearer rule fails the gate it also carries.
3. **Vendored numbers rot.** Budgets, versions and line references are copied
   into consumer skills; one copy contradicts itself (`:85` versus `:43`).
4. **Positioning and claim policy load almost never.** `product-context.md` is
   path-scoped to `website/**` and `.agents/**`; the claim "do not say" list is a
   spec under `.agents/specs/` that no session loads. READMEs and release bodies
   are written without either.
5. **The GUI has security rules and no UX rules.** `grim-gui/subsystem-web.md`
   is seven invariants about CSP and `textContent`; layout, focus, keyboard,
   contrast, empty and loading states are unspecified for the one desktop
   surface.
6. **Mechanical gates exist, but the fleet does not pass them and they are
   warnings.** 2,378 and 670 prose findings in two trees; nothing blocks.
7. **Style rules duplicated three times at three lengths.** `docs-style.md`
   shares an outline across `ocx`, `grimoire` and `grim-mirror`; drift is
   guaranteed.
8. **The shared core is written in compressed prose.** `ocx` `docs-style.md`
   drops articles ("Every `##` section open with two-three short paragraphs",
   `:14`), while `docs-quality` demands plain English. The rule models a voice
   the gate would flag.
9. **Heavy files with weak activation.** `docs-quality.md` loads on every markdown
   file, including READMEs and changelogs, then tells the agent to "skip agent
   config without comment" (`:27-30`). `css-theming.md` loads on all `.tsx` and
   `.html` edits (24 globs) with a 16 KB body.
10. **Hole in the accessibility story is declared but unowned.** "Page-level
    accessibility is governed nowhere here" (`docs-quality.md:184`) while
    Lighthouse accessibility 100 is a fleet gate.
11. **Release-note models disagree** (three repos, three models) with no shared
    rule on voice or audience.

## Patterns worth encoding

Each is already in the fleet or catalog, checkable, and changes what an agent
does.

1. **Do/don't pairs with a named rule ID and a generic-rule pointer**
   (`ocx-theme-theming/references/design-rules.md`): each design rule is one
   sentence, a Do, a Don't, and a pointer to the generic `CSS-*` ID.
2. **Counted budgets as a table with a stated cause per number**
   (`ocx-theme-quality/SKILL.md:37-47`): the number, the reason it sits there,
   and "goes up only with a written reason in the commit".
3. **The images-blocked test** as the check for "layout is stable" (`:72-75`).
4. **Never-draw-icons**: an agent-specific prohibition with a defined fallback
   ("No licensed source exists? Ask the owner") (`ocx-theme-icons/SKILL.md:16-23`).
5. **A per-product "do not say" list with the reason for each line**
   (`design_brief_landing_page.md:101-118`), each tied to a verifiable fact
   (exit code of `grim status`, package count).
6. **Verbatim verified copy blocks**: strings "checked against actual CLI
   behaviour. Do not paraphrase the technical ones" (`:44-47`), plus "every command
   verified to exit 0 in this exact order" (`:65`).
7. **Landing counts** (`DOC-TYPE-10..15`): one-sentence lead, action before word
   150, at most 2 CTAs, no placeholder text, no unlinked adoption claim.
8. **User-facing help states the contract only** with grep-able forbidden
   provenance (`quality-cli-help.md:69-86`) and tests walking the clap tree.
9. **Changelog entries are user outcomes with a doc link, and an item with no
   doc page is reported as a docs gap** (`changelog/SKILL.md` step 4).
10. **Colour is never the only channel** (`TUI-22`), generalised from terminal to
    GUI and web.
11. **Positioning file with an update protocol and named readers** (`product-context.md:161-173`):
    names which agents must re-read it and which events stale it.
12. **Block-tier literal-colour grep with a stated "no automated gate" caveat**
    (`quality-design-tokens.md:26-29`).

## What this contradicts in the frame

The frame is `.agents/research/product-frame.md`.

1. **"The fleet has no marketing surface worth measuring beyond READMEs" (one
   of the falsifiers) is confirmed.** Zero fleet configuration mentions LinkedIn,
   YouTube, Hacker News, Product Hunt, Reddit or any social channel; zero mention
   tone of voice or microcopy. The marketing guidance in the fleet is a claim
   policy in one spec, positioning files in six repos, a landing-page counts rule
   and release-note procedures. The exemplar corpus must carry social and video
   grounding.
2. **The frame says UX is "not covered" apart from css-theming and docs-quality;
   that undercounts.** A substantial UX and design-system guidance set already
   exists outside the catalog: six `ocx-theme-*` skills (157,752 B), the theme
   repo `AGENTS.md`, `quality-design-tokens.md`, `subsystem-website.md`, a
   `vscode` webview section, plus CLI help and TUI interaction rules in the
   catalog. The intended `ux-quality` rule must absorb or route to these; the
   frame's candidate table does not mention them.
3. **The frame lists the GUI as a surface for the adopters. It is a three-file
   stub.** `grim-gui/src` is 22, 32 and 7 lines of code and style (`grep -c ''`).
   A GUI rule is more speculative than the frame implies; the VS Code extension
   (40 UI source files) is the larger GUI surface and the frame omits it. The
   frame also omits the catalog's own Astro site (`ocx-sh/catalog/src/site`, 25
   files) and `ocx-sh/index`.
4. **Hypothesis "UX for CLI and GUI shares too little to live in one rule" is
   supported.** CLI and TUI interaction rules already sit in the language sets
   (`CLI-*`, `TUI-*`) with no GUI counterpart, and the web guidance is a different
   artifact family (CSS, Astro, Lighthouse).
5. **Frame list of Astro sites (7) and MkDocs sites (3) is correct.**
   `find` for `astro.config.*` and `mkdocs.yml` returns exactly those (seven
   Astro, three MkDocs, one Vite).
6. **New fact the frame lacks: conflicting guidance exists and a new rule will
   collide with it on first install.** Link syntax is the proven case. Any new
   `marketing-copy` rule that governs "no hype" or heading case will meet
   `docs-style.md` (three repos) and `DOC-PLAIN-12/14`; the set must declare
   ownership and add the Vale-style single-owner rule (`DOC-PLAIN-20`) to the new
   sets.
7. **New fact: the catalog distributes to ten clients but the fleet has zero
   `.cursor`, Copilot or Gemini config files.** The fleet validates only the
   Claude and `.opencode` paths, so a published artifact's non-Claude behaviour
   is untested here.

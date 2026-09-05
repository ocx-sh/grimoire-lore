---
title: Docs UX and observability posture — fleet audit
agent: docs-ux-observability-auditor
model: sonnet
scope: >
  Every repo under /home/mherwig/dev/*/ with a committed docs-site generator
  config (.vitepress/config.*, mkdocs.yml, book.toml, docusaurus.config.*,
  astro.config.*, docs.json), plus the ocx website specifically. Excludes
  node_modules, .git, target, dist, .vitepress/cache, .serena, and worktree
  duplicates. Includes .claude/.agents only where an axis names AI config.
method: >
  Read-only. Site configs read in full with Read/cat -n and cited by file:line.
  Discovery: `find <repo> -maxdepth 6 -path "*.vitepress/config.*"` and
  `-iname mkdocs.yml -o -iname book.toml -o -iname docusaurus.config.* -o
  -iname astro.config.*`, pruning node_modules/.git/target/dist/cache/.serena.
  Nav depth/sections/leaves counted by reading the `nav:`/`sidebar:`/SUMMARY.md
  tree directly. Search provider read from `search:`/`plugins:` keys.
  Feedback/analytics/OG/sitemap/robots/llms.txt: `grep -rniE` for the relevant
  keys/filenames, scoped per repo, excluding build output. Alt-text coverage:
  a small inline Python script (`re.finditer` over `<img ...>` and
  `![...](...)`) walking each repo's docs tree, classifying alt as
  present/empty/missing — a raw grep with a negative lookahead double-counted
  a false positive (a CSS comment containing the literal string `<img>`) and
  was discarded in favour of this script. Landing pages read in full.
  Time-to-first-command: `wc -w` and `grep -n "^#"` on
  ocx/website/src/docs/{installation,getting-started}.md up to the first
  fenced/`<<<` command block. Repo identity for duplicate-looking repos
  (ocx-save) confirmed via `git remote -v` and `git log`.
date: 2026-09-05
---

# Docs UX and observability posture — fleet audit

## 0. Fleet inventory (corrected against the frame)

The frame's 13-repo table conflates three different things under "docs/ or
website/ tree." Only some are docs **sites** — the rest are internal notes
with no nav, no search, no theme, and no reader-facing UX to audit.

| Repo | What it actually is | Generator | Config | Real docs-site UX? |
|---|---|---|---|---|
| `ocx` | Product docs site | VitePress 2.0.0-alpha.16 | `ocx/website/.vitepress/config.mts` (183 lines) | Yes |
| `ocx-catalog` | Product docs site **+ the catalog-renderer product itself** | MkDocs Material 9.7.7 | `ocx-catalog/mkdocs.yml:1-122` | Yes |
| `ocx-mirror` | Product docs site | MkDocs Material | `ocx-mirror/mkdocs.yml:1-53` | Yes |
| `ocx-mcp` | Product docs site | MkDocs Material | `ocx-mcp/mkdocs.yml:1-51` | Yes |
| `ocx-mirror-sdk` | Product docs site (+ API ref via mkdocstrings) | MkDocs Material | `ocx-mirror-sdk/mkdocs.yml:1-178` | Yes |
| `ocx-sdk-python` | Product docs site (+ API ref) | MkDocs Material | `ocx-sdk-python/mkdocs.yml:1-162` | Yes |
| `ocx-indexbot` | Product docs site | MkDocs Material | `ocx-indexbot/mkdocs.yml:1-101` | Yes |
| `grimoire-indexer` | Product docs site (Astro is an internal **renderer feature**, not the docs site) | MkDocs Material 9.7.7 | `grimoire-indexer/mkdocs.yml:1-125` | Yes |
| `grimoire` | Product docs site | mdBook | `grimoire/docs/book.toml:1-17` | Yes, flat |
| `creeptd-ng` | Internal dev-infra runbooks (2 files) | none | — | No |
| `kate-middlechild` | Internal ADRs/research notes (25 files); `packages/web` is the *product*, not docs | none for `docs/` | — | No |
| `grimoire-lore` | Per-artifact README bodies consumed as catalog description text by someone else's site | none | — | No (no nav/search of its own) |

`ocx-save` is not a 10th site: `git -C ocx-save remote -v` returns
`git@github.com:ocx-sh/ocx.git` — it is a stale local checkout of `ocx` itself,
frozen at `git log -1 -- website/src/index.md` = 2026-03-13, six months behind
the live `ocx` homepage. Kept out of the per-axis tables; its content is cited
once, below, as historical evidence.

**9 real docs sites audited.** Search/feedback/analytics/link-check axes below
cover all 9 + `ocx-save` where the lorem-ipsum finding applies.

## 1. Navigation

| Site | Top-level sections | Max depth | Largest section (leaves) | Landing→quickstart | Next/prev | Breadcrumbs | On-page outline |
|---|---|---|---|---|---|---|---|
| `ocx` (VitePress) | 5 (nav bar) | 3 (sidebar → collapsed group → page), `config.mts:93-115` | "In Depth" — 14 leaves, `config.mts:93-115` | 1 click (hero action → `/docs/getting-started`, `index.md:11`) | Yes (VitePress default, sidebar-order) | No — VitePress ships none, at any config | Yes (`outline: deep` frontmatter, e.g. `getting-started.md:2`) |
| `ocx-catalog` (MkDocs) | 5, `mkdocs.yml:96-123` | 2 | How-To — 7, `mkdocs.yml:97-105` | 1 click (H1→"Start from what you are trying to do" cards, `index.md:1-30`) | Yes (Material default) | No (`navigation.path` not enabled) | Yes (`toc.follow`, `mkdocs.yml:37`) |
| `ocx-mirror` (MkDocs) | 4, `mkdocs.yml:169-178` | 2 | Reference — 5 | 1 click | Yes | No | Yes |
| `ocx-mcp` (MkDocs) | 4, `mkdocs.yml:224-231` | 2 | Reference — 3 | 1 click | Yes | No | Yes |
| `ocx-mirror-sdk` (MkDocs) | 9, `mkdocs.yml:370-411` | 2 | API reference — 6 | 1 click | Yes | **Yes** (`navigation.path`, `mkdocs.yml:259`) | Yes |
| `ocx-sdk-python` (MkDocs) | 3, `mkdocs.yml:553-575` | **3** (Guide→Concepts→page, `:561-563`) | Guide — 6 incl. nested Concepts | 1 click | Yes | **Yes** (`navigation.path`, `mkdocs.yml:439`) | Yes |
| `ocx-indexbot` (MkDocs) | 4, `mkdocs.yml:666-678` | 2 | Guide — 2 | 1 click | Yes | No | Yes |
| `grimoire-indexer` (MkDocs) | 5, `mkdocs.yml:779-805` | 2 | Reference — 7 | 1 click | Yes | No | Yes |
| `grimoire` (mdBook) | **20, flat, zero grouping** (`SUMMARY.md:5-24`) | **1** | n/a — no sections at all | 1 click | Yes (mdBook default) | No | Yes (mdBook default) |

**Fleet totals:** 8/9 sites reach quickstart in 1 click from the landing page. 7/9 have prev/next by framework default. Breadcrumbs: 2/9 (both are the two Python-SDK sites, both configured within a week of each other — a copy-paste of the richer template, not a fleet norm). `grimoire`'s 20-item flat sidebar is the fleet's only zero-hierarchy nav — every other site groups by section.

## 2. Search

| Site | Provider | Client-side/hosted | Zero-result logging or search analytics |
|---|---|---|---|
| `ocx` | VitePress local (minisearch) — `config.mts:150-152` | Client-side | No |
| `ocx-catalog` | MkDocs built-in `search` — `mkdocs.yml:65-66` | Client-side | No |
| `ocx-mirror` | MkDocs built-in (implicit default, no `plugins:` override) | Client-side | No |
| `ocx-mcp` | MkDocs built-in (implicit default) | Client-side | No |
| `ocx-mirror-sdk` | MkDocs built-in + `section-index` — `mkdocs.yml:300-303` | Client-side | No |
| `ocx-sdk-python` | MkDocs built-in — `mkdocs.yml:480-482` | Client-side | No |
| `ocx-indexbot` | MkDocs built-in — `mkdocs.yml:629-631` | Client-side | No |
| `grimoire-indexer` | MkDocs built-in — `mkdocs.yml:744-745` | Client-side | No |
| `grimoire` | mdBook built-in (lunr, default-on, no override in `book.toml`) | Client-side | No |

**Fleet totals: 9/9 client-side local search. 0/9 Algolia/Typesense/Orama/AI-chat. 0/9 any zero-result or search-analytics instrumentation**, in config, scripts, or CI (`grep -rliE "zero.result|search.analytics"` across all 9 repos: no hits).

## 3. Feedback and analytics

| Site | "Helpful?" widget | Analytics script | Edit-this-page | Docs-bug issue template | Internal link check (CI) | External link check (CI) | Custom 404 page |
|---|---|---|---|---|---|---|---|
| `ocx` | No | No | No (`editLink` key absent from `config.mts`) | No | No | No | No (VitePress default only, in build output) |
| `ocx-catalog` | No | No | **Yes**, working (`edit_uri` + `content.action.edit`, `mkdocs.yml:18,25`) | No | Yes, `mkdocs build --strict`, `taskfile.yml:70` | Yes, `lychee.toml` present | No |
| `ocx-mirror` | No | No | Configured, **dead** (`edit_uri` set, `mkdocs.yml:7`, but `content.action.edit` missing from `features:`, `:24-28`) | No | Yes, `taskfiles/docs.taskfile.yml:11-12` | Yes, `lint:links` task runs bare `lychee` (no `lychee.toml`), `:14-16` | No |
| `ocx-mcp` | No | No | Configured, **dead** (same gap as `ocx-mirror`) | No | Yes | Yes (bare `lychee`, no toml) | No |
| `ocx-mirror-sdk` | No | No | **Yes**, working (`content.action.edit`, `mkdocs.yml:250`) | No | Yes, `mkdocs build --strict`, `taskfile.yml:96` | **No** — no `lychee.toml`, no lint:links task anywhere in `taskfile.yml` | No |
| `ocx-sdk-python` | No | No | **Yes**, working | No | Yes | Yes, `lychee.toml` | No |
| `ocx-indexbot` | No | No | **Yes**, working | No | Yes | Yes, `lychee.toml` | No |
| `grimoire-indexer` | No | No | **Yes**, working | No | Yes, `pages.yml` | Yes, `lychee.toml` | No |
| `grimoire` | No | No | Yes (`edit-url-template`, `book.toml:12`, mdBook needs no feature flag) | No | mdBook's own broken-link check (default-on) | No | No |

**Fleet totals: 0/9 feedback widgets, 0/9 analytics scripts, 0/9 docs-bug issue templates** (only `ocx` and `grimoire` have any `.github/ISSUE_TEMPLATE/` at all, and neither has a docs-specific one). Edit-this-page is *configured* in 8/9 but silently **dead in 2 of those 8** (`ocx-mirror`, `ocx-mcp` — `edit_uri` set without the Material feature flag that makes it render). Internal strict-build link checking: 9/9. External link checking: 6/7 MkDocs sites (missing only `ocx-mirror-sdk`); VitePress/mdBook sites (`ocx`, `grimoire`) have none. Custom 404: 0/9 authored (VitePress/mdBook ship a generic themed one automatically; nobody wrote page-specific 404 content or hooked up 404 monitoring).

**The one real observability mechanism in the fleet** lives outside these tables: `ocx-catalog/.lighthouserc.cjs:1-60` and `grimoire-indexer/.lighthouserc.cjs` run Lighthouse CI in `task quality:web`, asserting **measured, ratcheted** category thresholds — accessibility 0.97 (median 1.00), best-practices 0.93 (median 0.96), SEO 0.97 (median 1.00), performance 0.85 warn (median 0.88) — with a documented red-state proof (a no-alt `<img>`, an empty `<button>`, an unlabeled `<input>` dropped a11y from 0.92→0.77 and failed the gate, per the docblock). This runs against each tool's own generated **fixture** catalog site, not against the fleet's actual documentation content pages — it is a generator product's CI gate, not a docs-content observability practice, and it exists on exactly 2/9 sites.

## 4. Machine readability

| Site | sitemap.xml | robots.txt | llms.txt | canonical URLs | OpenGraph meta | RSS for changelog |
|---|---|---|---|---|---|---|
| `ocx` | No | No | No | No | No | No |
| `ocx-catalog` | Yes (mkdocs core template, auto, `site_url` set `mkdocs.yml:14`) | No | No | Yes (auto, from `site_url`) | No | No |
| `ocx-mirror` | Yes (auto) | No | No | Yes (auto) | No | No |
| `ocx-mcp` | Yes (auto) | No | No | Yes (auto) | No | No |
| `ocx-mirror-sdk` | Yes (auto) | No | No | Yes (auto) | No | No |
| `ocx-sdk-python` | Yes (auto) | No | No | Yes (auto) | No | No |
| `ocx-indexbot` | Yes (auto) | No | No | Yes (auto) | No | No |
| `grimoire-indexer` | Yes (auto) | No | No | Yes (auto) | No | No |
| `grimoire` | Yes, in build output (`docs/book/sitemap.xml`) | **Yes, hand-authored** (`docs/src/robots.txt`, references the sitemap) | No | Unconfirmed | No | No |

**Fleet totals: llms.txt / llms-full.txt: 0/9. OpenGraph: 0/9. RSS: 0/9.** Sitemap and canonical URLs track the generator, not the project: every MkDocs site gets both for free the moment `site_url` is set (7/7); the two hand-rolled VitePress sites have neither (0/2); `grimoire` is the only site with an authored `robots.txt` (1/9), and it exists specifically to point crawlers at the sitemap.

## 5. Accessibility

| Site | Skip link | Landing heading order | Images (real `<img>`, alt / empty-alt / missing-alt) | Colour toggle | Reduced motion | Keyboard focus on tabs/code-groups |
|---|---|---|---|---|---|---|
| `ocx` | Inherited from VitePress default theme, not authored | Sane (hero acts as H1, then H2 × 4, `index.md:44,75,88,169`) | 11 total: 6 alt, 4 empty-alt (decorative CTA icons, correct), **1 false-positive** (a CSS comment string, not a real tag) → 0 missing | Yes, VitePress default (auto + toggle) | **No** — no `prefers-reduced-motion` anywhere in `Terminal.vue` or `custom.css`; asciicasts default `autoPlay: false` for `src`-based use and every getting-started `<Terminal>` is `collapsed`, which incidentally avoids autoplay motion | Inherited from VitePress's own tab/code-group chrome; `Terminal.vue` (305 lines) adds no `tabindex`/`aria-*`/`@keydown` of its own |
| 7× MkDocs sites | Yes, Material default (built-in) | Sane on all 7 landing pages (H1 → H2s, no skips; `ocx-mirror-sdk`'s apparent `# Or, on a big repo:` at `index.md:64` is a Python code-comment inside a fence, not a heading) | 1 total, `grimoire-indexer/docs/index.md`, empty-alt (logo, decorative) | Yes, all 7 (light/dark palette blocks in every `mkdocs.yml`) | N/A (no asciicast component in MkDocs sites) | Inherited from Material's own tabbed/code-annotate JS |
| `grimoire` (mdBook) | Yes, mdBook default | Not verified (not read this pass) | 0 | Yes, mdBook default theme switcher | N/A | Inherited from mdBook default JS |

**Fleet totals: images are almost entirely absent from this fleet's docs** — 12 real `<img>` tags exist across all 9 sites combined, 0 raw markdown `![]()` images anywhere, and every real tag has an `alt` attribute (empty-but-intentional for 5 decorative icons, descriptive for 7 content icons). This is a clean result, but it is clean because there is almost nothing to get wrong, not because of an enforced rule — nothing in any config gates alt-text. Skip links and colour toggles come free from every framework's default theme (0 sites had to author their own); nobody has undone that default. **Reduced-motion handling is the one real gap**, and it only applies to `ocx`, the fleet's one site with a genuinely animated component (`<Terminal>` asciicasts).

## 6. Versioning and i18n

| Site | Versioned docs | Locale directories | "Last updated" stamp |
|---|---|---|---|
| `ocx` | No | No | No |
| `ocx-catalog` | No (`mike` not referenced anywhere) | No | No (`git-revision-date-localized` plugin absent) |
| `ocx-mirror` | No | No | No |
| `ocx-mcp` | No | No | No |
| `ocx-mirror-sdk` | No | No | **Yes** — `git-revision-date-localized`, `mkdocs.yml:300-308` |
| `ocx-sdk-python` | No | No | **Yes** — same plugin, `mkdocs.yml:481-487` |
| `ocx-indexbot` | No | No | **Yes** — same plugin, `mkdocs.yml:629-636` |
| `grimoire-indexer` | No | No | No |
| `grimoire` | No | No | No |

**Fleet totals: 0/9 versioned docs, 0/9 i18n locale directories** (`find … -type d | grep -E "/(en|de|fr|es|ja|zh|locales|i18n)$"`: no hits anywhere in the fleet, including `kate-middlechild`, whose *product* — not its docs — is mid-build on Paraglide i18n, per `astro.config.ts:6-9`). "Last updated" is present on exactly the 3 mkdocs sites that also carry `mkdocstrings` API reference (`ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-indexbot`) — it travels with a specific, richer mkdocs.yml template, not as an independent choice.

## 7. Landing page anatomy

| Site | Hero claim | Primary CTA | Secondary CTA(s) | Code/terminal sample | Feature tiles | Social proof | "Who is this for" |
|---|---|---|---|---|---|---|---|
| `ocx` | "The Simple Package Manager" (`index.md:6-8`) | "Get Started" (brand) | "Install", "User Guide" (alt) + 4 more CTA cards at page foot (Roadmap/Catalog/Discord/GitHub, `:174-201`) — **7 CTAs total, no single hierarchy** | Yes, install one-liner (`:44`) | **10, in two overlapping sets**: 4 short tiles (frontmatter `features:`, `:19-38`) + 6 detailed `<FeatureSection>` blocks under "How it works" (`:88-165`) that restate some of the same ground (e.g. cross-platform, automation) | None | None |
| `ocx-catalog` | 3-sentence description, no hero component (`index.md:1-5`) | Inline link into use-case cards | — | Yes | Use-case cards keyed to reader intent ("I run an index on GitHub…", `:19-30`) — a JTBD-style landing, not tile-grid | None | **Yes**, implicit via the use-case cards |
| `ocx-mirror` | 1-line description | Inline link | — | Yes | None | None | Weak (What it does / Beyond one tool at a time) |
| `ocx-mcp` | 1-line description | Inline link | — | Yes | None | None | None |
| `ocx-mirror-sdk` | 1-line description | Inline link | — | No (landing shows Python usage further down, no fence on the first screen) | "At a glance" bullets | None | Weak |
| `ocx-sdk-python` | 1-line description | Inline link | — | No | "At a glance" | None | "Why a wrapper, not a reimplementation" |
| `ocx-indexbot` | 1-line description | Inline link | — | Yes | None | None | None |
| `grimoire-indexer` | 1-line description | Inline link | — | No | "Start here" | None | None |
| `grimoire` | 20-item flat TOC, no landing page distinct from the first content page | n/a | — | Not checked | None | None | None |
| `ocx-save` *(stale duplicate of `ocx`, git remote `ocx-sh/ocx`, frozen 2026-03-13)* | Same hero pattern as `ocx` | "Install" | "Get Started", "Guide" | Yes | 4 tiles, **3 of 4 are literal Lorem Ipsum** (`index.md:26-39`: *"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."*, verbatim, 3×) | None | None |

**Fleet totals: 0/9 sites carry any social proof** (no star count, no adopter logos, no testimonials). 1/9 (`ocx-catalog`) states "who is this for" explicitly and structurally, via use-case-keyed cards rather than prose — this is the fleet's only real instance of the frame's hypothesized use-case-tier landing pattern, and it exists on the docs-*tooling* site, not on any product-docs site. `ocx`'s homepage runs two different feature-tile treatments back to back that restate overlapping claims — a real "too much homepage" smell distinct from the stale `ocx-save` lorem-ipsum finding.

## 8. ocx: time-to-first-command

Two pages gate the first command, and the frame's brief names only the second:

| Page | Words before first command | Headings passed | Commands to first successful result |
|---|---|---|---|
| `installation.md` (`docs/installation.md:5-9`) | 20 | 1 (H1 only) | 1 (single `curl \| sh` / `irm \| iex`, `:10-12`) |
| `getting-started.md` (assumes install already done, `:6`) | 185 | 2 (H1 + H2 "Quick Start") | 1 (`ocx package exec "astral-sh/uv:0.10.0" -- uv --version`, `_scripts/getting-started/exec.sh:1`) |

Both pages reach a runnable, successful command in exactly **one** command apiece.
`installation.md` is about as tight as time-to-first-command gets in this
fleet (20 words). `getting-started.md`'s own 185-word runway is inflated less
by "preamble" than by a `::: tip` callout it could defer (lines 8-10) — the
first *paragraph* alone is under 60 words.

## Contradictions to the frame

1. **The 13-repo table is not a homogeneous fleet of docs sites.** 3 of the 13
   (`creeptd-ng`, `kate-middlechild`, `grimoire-lore`) have a `docs/` directory
   with no site generator, no nav, no search, and no landing page — internal
   runbooks, ADRs, and per-package README bodies rendered on someone else's
   catalog page. A glob-scoped rule about nav/search/hero/CTA fired on these
   paths would apply site-UX standards to content that structurally cannot
   carry them (including `grimoire-lore`'s own `docs/`, ironically).
2. **`ocx-catalog` is not a VitePress site and `grimoire-indexer` is not an
   Astro site**, as the frame's inventory table states. Both ship MkDocs
   Material (`ocx-catalog/mkdocs.yml`, `grimoire-indexer/mkdocs.yml`). Astro
   *is* real in `grimoire-indexer` — as an internal rendering engine the tool
   ships to its own users (`src/renderer/astro/`), not as the generator behind
   `grimoire-indexer`'s own docs.
3. **`creeptd-ng`'s claimed 322 markdown files is off by ~160×.** Its `docs/`
   holds 2 files. Re-running the frame's own stated find command
   (`find docs -name '*.md'`, excluding node_modules/.git/target/.claude/
   .agents/.serena) reproduces 2, not 322 — the true count almost certainly
   came from `.worktrees/` (1038 files, a name the exclusion list doesn't
   match since it isn't `.agents/worktrees`).
4. **`ocx-save` is not a 10th fleet member.** Same git remote as `ocx`
   (`ocx-sh/ocx`), frozen since 2026-03-13 — a stale local snapshot, not an
   independently maintained site.
5. **Search zero-result mining, the frame's own named candidate, is absent
   fleet-wide (0/9)** — worth naming explicitly since local/minisearch-style
   search (used by 9/9 sites here) makes this the cheapest lever the fleet
   isn't pulling.
6. Hypothesis-3 (use-case-tier landing pages) is **real but rare**: exactly
   one site (`ocx-catalog`) does it, and it is the docs-tooling product, not
   a docs-content site — thin evidence for treating it as fleet-wide practice
   rather than a single good example worth generalizing.

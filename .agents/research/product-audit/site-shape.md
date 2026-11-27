---
title: Site shape of the OCX and Grimoire fleet (grounding audit)
program: product (ux + marketing), phase 1 grounding wave
worker: site-shape (grounding worker)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 5
method: Local read-only measurement of /home/mherwig/dev plus 5 fetched exemplar pages (section 8, the only external claims). Every number sits next to the command that produced it. Paths are relative to /home/mherwig/dev. Built dist/ directories were read where they exist; they may lag the source. Repair pass 2026-11-27 re-ran every command; corrections are listed in section 9.
---

# Site shape of the fleet

Scope: the axis is measured shape (sites, nav, components, tokens, landing section order, headline and CTA counts, clicks to install, cross-site consistency). Section 6 is cross-site consistency evidence only; it makes no best-practice claim. 10 documentation sites the frame names, plus the sites found beyond it (3 catalog-rendered sites, 1 desktop GUI). All numbers are as of the working trees on 2026-11-27.

## 1. Inventory: framework, theme, size

Commands (run from /home/mherwig/dev):
- Versions: `grep -nE '"(astro|@astrojs/starlight|@ocx-sh/theme)"' <site>/package.json`
- Content pages: `find <site>/src/content/docs -type f \( -name '*.md' -o -name '*.mdx' \) | wc -l`
- Own components / layouts: `find <site>/src -name '*.astro' -path '*components*' | wc -l` (and `*layouts*`)
- MkDocs pages: `find <site>/docs -name '*.md' | wc -l`

| Site (URL base) | Framework and theme | Content pages | Own .astro components | Own layouts | Landing distinct from docs |
|---|---|---|---|---|---|
| ocx-sh/website/site (`/`) | Astro 7.3.5 range + Starlight ^0.42.5 + `@ocx-sh/theme` workspace (0.6.0) (site/package.json:11-13, astro.config.mjs:4-5) | 5 md/mdx, plus 6 fragment pages in src/pages (4 `frag/` astro + robots + shell-fragment) | 1 (Landing.astro) | 0 own, 2 in theme | Yes: splash, `src/content/docs/index.mdx:4` |
| ocx-sh/ocx/website (`/docs/`) | Astro 7.4.12 + Starlight 0.42.6 + theme 0.6.0 (package.json:13-15) | 116 | 0 | 0 | No: `index.mdx` is a docs page titled "Get started with OCX" (index.mdx:2) |
| ocx-sh/catalog/docs (`/apps/catalog/`) | Astro ^7.3.5 + Starlight >=0.42.0 <0.43 + theme ^0.5.0 (package.json:13-15) | 24 | 0 | 0 | No: `index.mdx` is a docs page with a LinkCard grid (index.mdx:29-55) |
| ocx-sh/www-setup/site (`/install/`) | Astro 7.3.5 + Starlight 0.42.4 + theme pinned to a git SHA `e86b830` (package.json:15) | 7 | 1 (Cast.astro) | 0 | n/a: the whole site is the install page |
| ocx-sh/devcontainer-features/site (`/integrations/devcontainer/`) | Astro 7.3.5 + Starlight 0.42.4 + theme 0.7.0 (package.json:14) | 22 | 0 | 0 | No: `index.md:5` tagged `doc_type: landing`, content is a snippet plus link lists |
| ocx-sh/rules_ocx/site (`/integrations/bazel/`) | Astro 7.3.5 + Starlight 0.42.4 + theme 0.5.0 (package.json:15) | 0 committed; 12 generated from ../docs by `site/scripts/port-docs.mjs:1` (output gitignored) | 0 | 0 | No |
| grimoire-rs/grimoire/docs (grimoire.rs) | Astro 7.4.13 + Starlight 0.43.1 + own theme.css, no `@ocx-sh/theme` (package.json:18-19, astro.config.mjs:92) | 45 (+ `public/start.html`, hand-written, outside Astro: `wc -w` = 4,503 raw tokens including markup; tag-stripped text = 1,856 words via `python3 -I` removing script/style blocks then `<[^>]+>`; 4,503 is withdrawn as a word count) | 8 | 0 | Yes: `src/pages/index.astro`, splash (index.astro:40) |
| ocx-sh/ocx-mirror (GitHub Pages) | MkDocs Material, default palette (mkdocs.yml:9-23) | 10 | n/a | n/a | No: `docs/index.md` |
| ocx-sh/indexbot (GitHub Pages) | MkDocs Material, default palette (mkdocs.yml:12-41) | 9 | n/a | n/a | No |
| grimoire-rs/indexer (GitHub Pages) | MkDocs Material, `deep purple` primary and accent (mkdocs.yml:41-42) | 23 | n/a | n/a | No |

Stack facts:
- Starlight versions in use: 0.42.4 (3 sites), 0.42.5 range, 0.42.6, 0.43.1, `>=0.42.0 <0.43` — 5 distinct specifiers across 7 Astro sites.
- Astro versions: 7.3.5 (3 pinned), `^7.3.5` (2), 7.4.12, 7.4.13.
- `@ocx-sh/theme` is consumed at 5 distinct specifiers by 6 sites: `workspace:*`, `0.6.0`, `0.7.0`, `0.5.0`, `^0.5.0`, git SHA (command: `grep -n '"@ocx-sh/theme"' ocx-sh/*/site/package.json ocx-sh/ocx/website/package.json ocx-sh/catalog/docs/package.json`).
- Per-site page counts, run verbatim: `for s in ocx-sh/website/site ocx-sh/ocx/website ocx-sh/catalog/docs ocx-sh/www-setup/site ocx-sh/devcontainer-features/site; do echo $s $(find $s/src/content/docs -type f \( -name '*.md' -o -name '*.mdx' \) | wc -l); done` gave 5, 116, 24, 7, 22; `find grimoire-rs/grimoire/docs/src/content/docs -type f \( -name '*.md' -o -name '*.mdx' \) | wc -l` gave 45; `for s in ocx-sh/ocx-mirror ocx-sh/indexbot grimoire-rs/indexer; do find $s/docs -name '*.md' | wc -l; done` gave 10, 9, 23.
- Components/layouts, run verbatim: `for s in <the 7 astro sites>; do echo $s $(find $s/src -name '*.astro' -path '*components*' | wc -l) $(find $s/src -name '*.astro' -path '*layouts*' | wc -l); done` gave website/site 1/0, ocx/website 0/0, catalog/docs 0/0, www-setup 1/0, devcontainer-features 0/0, rules_ocx 0/0, grimoire/docs 8/0.
- Theme specifiers, run verbatim: `grep -n '"@ocx-sh/theme"' ocx-sh/*/site/package.json ocx-sh/ocx/website/package.json ocx-sh/catalog/docs/package.json` gave `workspace:*` (website/site/package.json:12), `0.6.0` (ocx/website:14), `0.7.0` (devcontainer-features:14), `0.5.0` (rules_ocx:15), `^0.5.0` (catalog/docs:14), `github:ocx-sh/website#e86b83...` (www-setup:15).
- Built output pages (stale-able): `find <dist> -name '*.html' | wc -l` gives 13 (website/site/dist), 3 (devcontainer-features/site/dist), 49 (grimoire/docs/dist), 30 (ocx-sh/index/dist). ocx/website has no dist.

Counts are lower than the content count where the sidebar is explicit: ocx/website has 117 `page('` entries (`grep -c "page('" ocx-sh/ocx/website/astro.config.mjs`) for 116 files; grimoire has 45 `slug:` entries (`grep -c "slug:" grimoire-rs/grimoire/docs/astro.config.mjs`) for 45 files. Sidebar and file set match within 1.

## 2. Navigation depth and item count

Commands: ocx/website leaves = `grep -c "page('" ocx-sh/ocx/website/astro.config.mjs` = 117 (the earlier `~118` was an estimate, withdrawn). Other leaf counts are the `nav:` lists printed by `sed -n 57,68p ocx-sh/ocx-mirror/mkdocs.yml` (11 entries incl. Home and Contributing), `sed -n 89,101p ocx-sh/indexbot/mkdocs.yml`, `sed -n 95,120p grimoire-rs/indexer/mkdocs.yml`. Sidebar read from astro.config.mjs / sidebar.mjs / mkdocs.yml; depth counted as nesting levels from the sidebar root to the leaf page.

| Site | Top-level groups | Leaf items | Max depth | Source |
|---|---|---|---|---|
| ocx/website | 4 groups + 1 page (Glossary) | 117 | 4 (Look things up > Reference > Command line > page) | astro.config.mjs:53-200 |
| catalog/docs | 4 autogenerated + Home | 24 | 2 | astro.config.mjs:24-29 |
| www-setup | 4 groups | 7 | 2 | sidebar.mjs:3-8 |
| devcontainer-features | 6 groups | 22 | 2 | astro.config.mjs:13-20 |
| rules_ocx | 4 groups + 2 pages | 17 | 3 (Reference > Rules and macros > page) | astro.config.mjs:16-45 |
| website/site | 2 links (Integrations, Apps) | 2 | 1 | astro.config.mjs:33-36 |
| grimoire/docs | 4 groups | 45 | 2 | astro.config.mjs:145-215 |
| ocx-mirror | 5 entries (1 section) | 11 | 2 | mkdocs.yml:57-68 |
| indexbot | 5 entries (3 sections) | 9 | 2 | mkdocs.yml:89-101 |
| indexer | 5 entries (4 sections) | 23 | 2 | mkdocs.yml:95-120 |

Observations:
- The shared top navigation is not per-site. It is one JSON file, `ocx-sh/website/packages/theme/src/nav.json`: 232 lines (`wc -l`). Counts from `python3 -I -c "import json;d=json.load(open('ocx-sh/website/packages/theme/src/nav.json'));print({k:len(v) for k,v in d.items() if hasattr(v,'__len__') and not isinstance(v,str)})"`: sections 3, hubs 3, claims 13, entries 17, actions 2, footer 4 (footer at nav.json:226-231: discord, roadmap, security, team). `grep -c '"planned": true' nav.json` = 8 (lines 93,111,129,138,147,156,165,192). `grep -c '"path"' nav.json` = 13 (lines 53-65).
- 3 of the 13 path claims name repos that are not in /home/mherwig/dev/ocx-sh: ocx-sdk-python, find_ocx, marketing (nav.json claims). Their pages could not be measured.
- The two sibling MkDocs sites under ocx-sh (ocx-mirror, indexbot) are not in nav.json claims; their nav entries are `"planned": true` (nav.json, ids `mirror`, `indexbot`). They are linked from ocx/website only by an external link (`mirror.yml`, astro.config.mjs:196).
- grimoire.rs has its own header with 5 links (index, docs, changelog, vscode, source) (src/components/Header.astro:26-39) and a footer nav with 45 anchors, 45 distinct, in the built page (`python3 -I` regex `<nav class="footer-nav".*?</nav>` over grimoire-rs/grimoire/docs/dist/index.html, then count of `<a `). The earlier 24 came from a source comment (FooterNav.astro:6, "24 hrefs") that is stale; 45 is measured and withdraws it.

## 3. Components and layouts: what is shared

Commands:
- Theme size: `find ocx-sh/website/packages/theme/src -name '*.astro' | wc -l` = 102; `find ... -name '*.astro' -path '*components/ui/*' | wc -l` = 42; `find ... -name '*.astro' -path '*starlight/*' | wc -l` = 18; layouts: `Fragment.astro`, `Shell.astro`.
- Usage per site: `grep -rhoE '@ocx-sh/theme/(components|layouts)/[A-Za-z/]+\.astro' <site>/src | sort -u | wc -l` (distinct) and `grep -rlE '@ocx-sh/theme/(components|layouts)/' <site>/src | wc -l` (files). Output: website/site 19/11, ocx/website 9/70, www-setup 5/5, catalog/docs, devcontainer-features, rules_ocx 0/0. Per-site lists via `... | sort | uniq -c | sort -rn`: www-setup = Tabs, TabItem, ShellSession (2 each), Terminal, HubGrid (1 each); ocx/website = ShellSession 66, Terminal 21, Tabs 10, TabItem 10, Tree, TreeNode, TreeDescription 7 each, InstallCommand 3, PlatformIcons 1; website/site = Fragment layout 4, Skeleton, ShellSession, HubGrid, Deferred 2 each, plus 14 singletons (Tag, CommandBar, Button, Avatar, TileGrid, Tabs, TabItem, ScrollStage, ScrollReveal, ScrollProgress, ScrollFade, KeyValueTable, InstallBar, FeatureSection).

| Consumer | Distinct theme components imported | Files importing |
|---|---|---|
| website/site | 19 | 11 |
| ocx/website | 9 (ShellSession 66 uses, Terminal 21, Tabs 10, Tree 7) | 70 |
| www-setup | 5 | 5 |
| catalog/docs | 0 (uses Starlight's CardGrid and LinkCard, index.mdx:5) | 0 |
| devcontainer-features | 0 | 0 |
| rules_ocx | 0 | 0 |
| grimoire/docs | n/a: own 8 components, none from the theme | n/a |

- Of the 102 theme components, 9 are used by ocx/website (the largest site), 19 by the only landing. The rest are used by no mdx page measured here.
- Starlight chrome is shared through the `ocxTheme()` plugin on 6 of 6 ocx-sh Starlight sites (`grep -n "ocxTheme" ocx-sh/*/site/astro.config.mjs ocx-sh/ocx/website/astro.config.mjs ocx-sh/catalog/docs/astro.config.mjs`).
- Duplication, by file name: `find ocx-sh grimoire-rs -name '*.astro' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.astro/*' | awk -F/ '{print $NF}' | sort | uniq -d` listed CommandBar, FooterNav, Fragment, Header, PainRouter, Sidebar, SiteFooter, SiteHeader, ThemeProvider, ThemeSelect, TwoColumnContent, WaysIn plus route-file names. Line counts, `wc -l` per path: theme CommandBar.astro (components/ui/) 176, indexer CommandBar.astro 66; theme SiteHeader.astro 175, indexer SiteHeader.astro 85; theme SiteFooter.astro 45, indexer SiteFooter.astro 70, grimoire/docs SiteFooter.astro 95. A further 95-line SiteFooter under grim-gui/target/.container-cache is a cargo checkout of the grimoire docs, not a separate implementation. md5 was not re-run; every pair differs in line count, so no pair is byte-identical:

| Component | Implementations | Lines | md5 identical |
|---|---|---|---|
| CommandBar.astro | theme `components/ui/` (176 lines) and indexer `renderer/astro/components/` (66 lines) | 176 / 66 | No |
| SiteHeader.astro | theme (175) and indexer (85) | 175 / 85 | No |
| SiteFooter.astro | theme (45), indexer (70), grimoire/docs (95) | 45 / 70 / 95 | No (3 copies, 3 hashes) |
| Header.astro, ThemeProvider.astro, ThemeSelect.astro | grimoire/docs and the theme/Starlight overrides | n/a | No |

Zero byte-identical copies, but 3 re-implementations of the install command bar and the site chrome. grimoire/docs says so itself: "the five links and the mark are duplicated ... Extract if a third bar appears" (grimoire-rs/grimoire/docs/src/components/Header.astro:20-25); the indexer is a third bar.
- IA is copied: `ocx-sh/catalog/docs` and `grimoire-rs/indexer/docs` share the same four sections (how-to, reference, explanation, ops) and 12 identical relative paths (command: `comm -12` of the two sorted `find ... -name '*.md*'` lists: index, how-to/index, how-to/quickstart, reference/cli, reference/config-schema, reference/output-layout, ops/known-limitations, ops/troubleshooting, explanation/security-and-trust-model, and 3 more section indexes).
- Catalog-rendered sites: ocx-sh/catalog/src/site has 18 components, 1 layout, 4 pages (`find ocx-sh/catalog/src -name '*.astro'` = 23); grimoire-rs/indexer/src/renderer/astro has 10 components, 1 layout, 5 pages (16 files). They are two separate renderers of the same kind of site (a package catalog), one on `@ocx-sh/theme` (catalog/package.json:58), one on its own tokens (`--grim-*`, indexer styles/tokens.css:31-193).

## 4. Design tokens: shared or divergent

Commands: `grep -cE "^\s*--ocx-[a-z0-9-]+:" ocx-sh/website/packages/theme/src/tokens.css`; accent values from `grep -nE "accent[a-z-]*:"` in each token file.

| Family | Token file | Custom properties | Accent (light / dark) | Modes |
|---|---|---|---|---|
| ocx.sh (6 Starlight sites) | theme `src/tokens.css:19-` | 258 declarations, 200 unique `--ocx-*` | coral `#ff6047` / same token, `--ocx-color-accent-fg #ce1c00` for small text (tokens.css:34-36) | light + dark, `data-theme` (tokens.css:17,252) |
| grimoire.rs docs | `src/styles/theme.css` | 53 (`grep -cE "^\s*--[a-z0-9-]+:" grimoire-rs/grimoire/docs/src/styles/theme.css`) | `#9184d9` dark (theme.css:35; light accent block at theme.css:103) | dark only (ThemeProvider.astro:1-3, theme.css:15-17) |
| grimoire indexer catalog | `renderer/astro/styles/tokens.css` | 72 (`grep -cE "^\s*--grim-[a-z0-9-]+:" grimoire-rs/indexer/src/renderer/astro/styles/tokens.css`) | `#6d4fc4` light, `#a58cf0` dark (tokens.css:39,192) | light + dark |
| indexer MkDocs | Material palette | none own | `deep purple` | light + dark |
| ocx-mirror, indexbot MkDocs | Material palette | none own | Material default (indigo) | light + dark |
| grim-gui | `src/styles.css` | 0 (7 lines, hard-coded `#555`) | none | none |

Within Grimoire: 3 different purple accents across 3 sites (`#9184d9`, `#6d4fc4`/`#a58cf0`, Material "deep purple") and 3 token namespaces (`--sl-*`, `--grim-*`, Material). Within OCX: 1 token package, 6 consumers, but 5 distinct version specifiers.

## 5. Landing pages

Only 2 sites have a landing page distinct from their docs: ocx.sh (`/`) and grimoire.rs. Every other site opens on a docs page; its home page is either an install page, a snippet plus a goal list, or a card grid.

Measurement commands: word counts are `len(s.split())` in `python3 -I` on the literal strings printed by `sed -n 38,46p ocx-sh/website/site/src/components/Landing.astro` and `sed -n 75,90p grimoire-rs/grimoire/docs/src/pages/index.astro` (meta: `sed -n 1,6p` of ocx index.mdx, `sed -n 36,40p` of grimoire index.astro). Anchor, button, h1, h2 counts: `python3 -I` with `re.sub(r'(?s)<(script|style).*?</\1>','',t)` then `re.findall(r'<a [^>]*href="([^"]*)"',t)`, `<button`, `<h1`, `<h2` over `ocx-sh/website/site/dist/index.html` and `grimoire-rs/grimoire/docs/dist/index.html` (dist may lag source). Output: ocx.sh a 42, distinct 28, button 18, h1 1, h2 6; grimoire a 72, distinct 54, button 2, h1 2, h2 2. Word counts output: ocx h1 4, lead 29, title 5, description 13; grimoire h1 6, lede 33, description 19.

### 5.1 ocx.sh (ocx-sh/website/site/src/components/Landing.astro)

Section order (line ranges in Landing.astro):
1. Hero, 34-67: tag, h1, lead, InstallBar, 4 text links, terminal session (deferred fragment), scroll cue.
2. "The drift" problem stage, 69-87: a scroll-scrubbed `ScrollStage` of 3 cards, finale with `ocx add` command.
3. Four pillars, 89-139: 01 one lock, 02 no new infrastructure (6-registry tile grid), 03 integrations (tabs), 04 supply chain (session).
4. Call to action, 141-158: h2, InstallBar, 2 buttons, pre-release note (155).

There is no proof section: no stars, logos, quotes, users or benchmark numbers (`grep -ciE "stars|trusted|used by|customers|testimonial" Landing.astro landing-content.ts index.astro landing.ts` = 0 for all four). The only trust cues are the 6 registry names (landing-content.ts:35-42) and the line "ocx is in early development" (Landing.astro:155).

| Measure | Value | Evidence |
|---|---|---|
| h1 | 4 words: "Same tools. Every machine." | Landing.astro:38-42 |
| Lead | 29 words | Landing.astro:43-46 |
| Page title / meta description | 5 / 13 words | index.mdx:2-3 |
| h2 count | 6 (dist) | dist/index.html |
| Above the fold, in the hero | 5 actions: install command (copy), get started, catalog, learn, github; the header adds install button, GitHub icon, search, 3 nav items | Landing.astro:47-53; nav.json actions and sections |
| CTAs in the page body (excluding header and footer) | 12: hero 5, stage command 1, registry command 1, hub link 1, verification link 1, closing InstallBar 1, 2 buttons | Landing.astro:47-53,84,105,115,132,148-155 |
| Anchors / distinct / buttons (built) | 42 / 28 / 18 | `python3 -I` regex over website/site/dist/index.html |
| Primary CTA | The install command, which appears twice (47 and 148) | Landing.astro |
| Clicks from home to a working install command | 0: the command is in the hero; 1 click to copy it. 5 shells offered by a picker, PowerShell preselected on Windows | InstallBar.astro:21-33; install-shells.mjs:5-22 |

The hero command is `curl -fsSL https://setup.ocx.sh/sh | sh` (install-shells.mjs:6); the landing's `ocx add` commands (Landing.astro:84,105) work only after it.

### 5.2 grimoire.rs (grimoire-rs/grimoire/docs/src/pages/index.astro)

Section order: header (Header.astro), hero with demo cast (index.astro:75-103), "ways in" band of 3 tiles (WaysIn.astro; landing.ts entryPaths), "pain router" of 8 cards (PainRouter.astro; landing.ts routerCards), site footer and 24-link footer nav. No features section, no install section, no closing call to action, no proof.

| Measure | Value | Evidence |
|---|---|---|
| h1 | 6 words: "A lockfile for your AI-agent config." | index.astro:77 |
| Lede | 33 words | index.astro:78-82 |
| Meta description | 19 words | index.astro:38 |
| h2 count | 2 ("ways in", "start from what you want to do"); 1 extra `h1` | dist/index.html (2 `<h1>` elements: the site title "Grimoire" and the hero) |
| Above the fold, in the hero | 3 CTAs: Install grim, Open the index, Create your own; plus header: 5 links and search | index.astro:83-87; Header.astro:26-39 |
| CTAs in the body | 14 (3 hero + 3 tiles + 8 router cards) | index.astro, landing.ts |
| Anchors / distinct / buttons (built) | 72 / 54 / 2 | dist/index.html |
| Clicks from home to a working install command | 1 (Install grim -> /installation.html). The page opens with ocx install: 2 commands (`curl -fsSL https://setup.ocx.sh/sh | sh`, then `ocx --global add grimoire/cli`). The direct installer `curl ... https://setup.grimoire.rs/sh | sh` sits below, under "Install script" | installation.md:14-80 |
| Install command on the landing | None | index.astro |

### 5.3 Docs-page homes (not landings)

| Home | Install visible on home | Clicks to a working install command | Evidence |
|---|---|---|---|
| ocx/website `/docs/` | Yes (`<InstallCommand />`) | 0 | index.mdx:10-12 |
| www-setup `/install/` | Yes, 5-shell tab set | 0 | index.mdx:18-70 |
| catalog/docs | Yes (`npm install --save-dev @ocx-sh/catalog`) | 0, but a 5-card goal grid precedes it | index.mdx:29-61 |
| devcontainer-features | Config snippet, not an install command | 0 | index.md:10-18 |
| rules_ocx | `MODULE.bazel` snippet | 0 | rules_ocx/docs/index.md:7-21 |
| ocx-mirror | `ocx --global add ocx.sh/ocx/mirror`, needs ocx first, not linked to the install page | 0 | docs/index.md:21-27 |
| indexbot | `uv tool install ocx-indexbot` | 0 | docs/index.md:25-29 |
| indexer | No; `npx @grimoire-rs/indexer init` is on the Quickstart | 1 | docs/how-to/quickstart.md:3-7 |

Opening sentence of two docs homes: ocx/website 16 words (index.mdx:8); devcontainer-features 23 words (index.md:8). These are plain descriptions; none states a differentiator.

## 6. Convention shared across the fleet

- Page-type tags (`grep -rlE 'doc_type:' <site>/src` per site, re-run): ocx/website 116 of 116, catalog/docs 24 of 24, devcontainer-features 22 of 22, www-setup 7 of 7, website/site 5 of 5, grimoire/docs 45 of 45; the 3 MkDocs sites 0 (`grep -rlE 'doc_type:' $s/docs | wc -l` = 0, 0, 0). Earlier counts for rules_ocx, grimoire-lore and index/site were not re-run and are dropped.
- Landing-tagged pages: `grep -rlE 'doc_type: landing' <six site src dirs> | wc -l` = 11 across 6 sites (per-site split not re-run). Only 2 are true landings (5.1, 5.2).
- Lighthouse budgets: 4 sites carry `lighthouse.budgets.mjs` (devcontainer-features, ocx/website, rules_ocx, www-setup); website/site and grimoire/docs do not (`ls ocx-sh/*/site/lighthouse.budgets.mjs ocx-sh/ocx/website/lighthouse.budgets.mjs grimoire-rs/grimoire/docs/lighthouse.budgets.mjs` lists 4 files and reports grimoire's missing). grimoire/docs has instead `landing_check.py`, `check_urls.py`, `theme_check.sh` (`ls grimoire-rs/grimoire/docs`).
- Landing content as data: grimoire keeps every landing string in `src/data/landing.ts` with a test (`landing.test.ts`) and a Python reader (`landing_check.py`); ocx.sh keeps session text in `landing-content.ts` with `landing.test.ts`.

## 7. grim-gui

`grimoire-rs/grim-gui` is a Tauri 2 shell with a plain TypeScript front end. Measured: `wc -l grimoire-rs/grim-gui/src/*` = 152 (main.test.ts 55, main.ts 22, styles.css 7, view.test.ts 36, view.ts 32) lines in total including 2 test files; production source is 61 lines (view.ts 32, main.ts 22, styles.css 7). It has 1 view that prints `grim <version>` or `grim not found` (view.ts:19-31). 0 components, 0 design tokens, 0 dark mode, 0 headings, hard-coded `#555` (styles.css:6). The README states it: "Status: skeleton ... Screens ... are not built yet" (README.md:10-13).

## 8. External exemplars: landing section order (fetched 2026-11-27)

Purpose: test whether the earlier assumed order (hero / proof / features / install / call-to-action) is a norm. Method: WebFetch of each page with a prompt asking for section order, proof and CTAs; summaries are model-produced, so counts are indicative.

| Page | Sections in order | Install in hero | Proof section | Hero CTAs |
|---|---|---|---|---|
| [docs.astral.sh/uv](https://docs.astral.sh/uv/) | title, highlights, installation, projects, scripts, tools, python versions, pip interface, learn more | No (own Installation section, 3rd) | none | 0 |
| [mise.jdx.dev](https://mise.jdx.dev/) | hero, showreel, what mise manages, 5 feature sections, closing "prep your station" | Yes (`curl -fsSL https://mise.run \| sh`) | none; "1,000+ tools in the registry" is availability, not adoption | 2 |
| [vite.dev](https://vite.dev/) | hero, logo strip, features, ecosystem, stats and testimonials, open source, closing CTA | Yes (npm create tabs) | logo strip right after hero; stats and testimonials mid-page | 2 |
| [bun.sh](https://bun.sh/) | hero, 4 benchmarks, tools, APIs, case studies, comparison table, release note, closing CTA | Yes (tabs) | logo strip about a third down; testimonials lower half | 2 (4 with header Install and banner) |
| [NN/g homepage principles](https://www.nngroup.com/articles/homepage-design-principles/) (15 Mar 2024) | prescribes no section order; says rank content by importance, put the most important above the fold, "if everything is emphasized, nothing stands out", CTA labels must be specific | | | |

Result: of 4 product pages, 2 (uv, mise) have no proof section; 2 (vite, bun) have one, at different positions. Only vite has the shape hero, proof, features, closing CTA; mise has no proof and uv has no closing CTA. No fetched source states a fixed hero / proof / features / install / CTA order. That order is a hypothesis for the exemplar-corpus workers, not a finding.

## 9. Corrections made in the repair pass

- Footer nav of grimoire.rs: 45 anchors measured, replacing 24 (stale source comment).
- `start.html`: 1,856 text words, replacing 4,503 (raw token count).
- website/site files importing theme components: 11, replacing 7.
- ocx/website sidebar leaves: 117, replacing the estimate ~118.
- Contradiction 5 and Smells 2-3 re-based on section 8.
- Section 6 dropped counts that were not re-run (rules_ocx, grimoire-lore, index/site doc_type; per-site landing split).

## Smells

Ranked by how much an agent that follows the current fleet would copy a defect.

1. Two landings, eight docs homes. 8 of 10 documentation sites open on a docs page with no positioning, no proof and no single call to action (section 5.3). ocx-sh/rules_ocx, devcontainer-features and ocx-mirror open on a snippet, so a visitor who does not already know ocx cannot tell what it is for. An agent asked to "write the home page" has 2 exemplars and 8 counterexamples in the fleet.
2. grimoire.rs landing has no install command and no closing call to action (uv has no hero CTA either, so absence alone is not a proven defect, section 8); install is 1 click away and starts with a different product's installer (installation.md:14-24). 14 body CTAs and 72 anchors compete; the hero has 3 equal-looking CTAs (index.astro:83-87). Primary CTA is a link, not a command.
3. No proof on either landing: 0 grep matches for stars, trusted, used by, customers, testimonial (section 5). Whether that is a defect is open: 2 of 4 fetched exemplars (uv, mise) also have none, 2 (vite, bun) do (section 8). ocx.sh ends with "early development" (Landing.astro:155).
4. Theme version drift: 6 consumers, 5 specifiers (0.5.0, ^0.5.0, 0.6.0, 0.7.0, git SHA), 5 Starlight specifiers. A token change in the theme reaches a site only after a manual bump. The catalog site is on `^0.5.0` while the theme is at 0.7.0 (section 1).
5. Three independent implementations of CommandBar, SiteHeader and SiteFooter (zero md5 matches), with a comment promising extraction "if a third bar appears" (grimoire Header.astro:20-25) that the indexer has already met.
6. Three accents and three token namespaces inside the Grimoire family; the OCX family has one token file but MkDocs sites ocx-mirror and indexbot do not use it (section 4). 4 of 10 sites have no tokens of their own.
7. grimoire.rs landing renders 2 `<h1>` elements (dist/index.html), and a hand-written 1,856-word `public/start.html` sits outside the build, the link checker and the sidebar (astro.config.mjs:231, README.md:11).
8. Dark-only grimoire.rs ships an unused light palette (theme.css:91-103) while indexer and OCX offer both; the same family disagrees on whether light mode exists.
9. grim-gui has no interface to measure: 1 view, 0 tokens, 0 components.
10. 8 of 17 nav entries are `planned: true` (nav.json). The nav advertises what does not exist yet; 3 claimed section repos are absent from the fleet checkout.

## Patterns worth encoding

Each is already present in the fleet, is measurable, and changes what an agent writes.

1. Install command in the hero, copy-able, with shell detection: 0 clicks to a working command (ocx.sh InstallBar, install-shells.mjs:5-22). Check: the landing's first section contains a fenced or CommandBar command that runs without a prior install of another product.
2. One data file for landing copy plus a test that reads the rendered output (grimoire `landing.ts` + `landing_check.py`; ocx.sh `landing-content.ts` + `landing.test.ts`). Check: every landing string has one source; a test greps the build for each.
3. Page-type tag on every page (`doc_type`, 230 files) with a landing type. Check: exactly 1 `doc_type: landing` per site, and it is the home page.
4. Hero headline of 4 to 6 words with a 29 to 33 word subhead and 3 to 5 hero actions (ocx.sh 4/29/5, grimoire 6/33/3). These two are the only measured landings; treat as observed range, not a norm.
5. Navigation as one data file with claims per path and a schema (`nav.json`, `nav.schema.json`): cross-site header from data, not copy.
6. Build-time budgets (`lighthouse.budgets.mjs` on 4 sites) and structure checks (`check-anchors.mjs` asserting every page is in the sidebar, www-setup/site/sidebar.mjs:1-2; `landing_check.py`). Check: every site has a budget file and a page-in-nav check.
7. Pain-first routing instead of a feature list (grimoire `routerCards` pain strings, PainRouter.astro:5-10): 8 cards, each one sentence of reader pain, one target page.
8. Diataxis-shaped sidebar (how-to, reference, explanation, ops; catalog, indexer; ocx/website's Start / Guides / Publish / Look things up) — covered by docs-quality, skip.

## What this contradicts in the frame

1. "Astro sites ... grimoire-rs/grimoire/docs" and "MkDocs sites": confirmed, but the frame lists 7 Astro and 3 MkDocs sites as marketing surfaces. Only 2 have a landing page. The other 8 are docs, install or reference sites. The frame's falsifier "the fleet has no marketing surface worth measuring beyond READMEs" is half true: there are 2 marketing surfaces, not 10. READMEs and the exemplar corpus carry the rest.
2. "Desktop or web GUI: grimoire-rs/grim-gui (Vite)": it is a 61-line skeleton with one view and no tokens (section 7). It cannot ground `ux-quality` for graphical interfaces. The only measurable GUIs in the fleet are the catalog-rendered sites (ocx-sh/catalog 18 components, grimoire-rs/indexer 10 components). UX grounding for a GUI must come from those two and from the exemplar corpus.
3. The frame omits 3 web surfaces found: the catalog renderer (ocx-sh/catalog/src, plus index.ocx.sh at ocx-sh/index), the indexer renderer (grimoire-rs/indexer/src/renderer, plus index.grimoire.rs), and the lore site (ocx-sh/grimoire-lore, `index.config.json`, 88 md files in docs). These are the closest the fleet has to product UI (package grid, detail page, install card).
4. The frame treats `css-theming` as covering tokens. The measured gap is not mechanics but drift: 5 theme version specifiers, 3 accents and 3 namespaces across the Grimoire sites, 0 shared tokens between the families. A rule that is checkable here is "a consumer's theme dependency matches the current published version", not "tokens exist".
5. The frame's "landing page is both an interface and a piece of marketing" holds. The earlier claim that the fleet inverts a "usual" order is withdrawn: fetched exemplars (section 8) show no single order and NN/g prescribes none. Measured facts only: ocx.sh has no proof section, grimoire.rs has no install or closing CTA. Whether those matter must come from the exemplar corpus.
6. The frame lists `ocx` and `grim` installers as one surface. Measured: ocx has one install page (`/install/`, 5 shells) with 0 clicks from every site home; grim's install page tells the reader to install ocx first (installation.md:14-24), and its direct installer is the third option. That is a UX finding about the onboarding chain, not about the installer script.

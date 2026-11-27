---
title: "UX-A11Y page structure and cross-site consistency (ux-a11y-authoring / page-structure-and-consistency)"
program: product
sub_program: ux
topic: ux-a11y-authoring
worker: page-structure-and-consistency
agent: deep-dive researcher
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
sources_count: 24
scope: |
  Covers: page-level accessibility minimum per page template (landmarks, headings, skip link, lang, title), whether the sites under ocx.sh form one WCAG "set of web pages", what 3.2.3, 3.2.4 and 3.2.6 then demand of the chrome, how a navigation entry for a page that does not exist may render, and which checks run on sources versus built pages.
  Does not cover: extracting the duplicated chrome and the theme-version currency check (routed: M261, M263), widget keyboard contracts (native-widgets-and-keyboard), colour contrast, content-level Markdown rules (docs-quality).
  Measurement caveat: ocx.sh is not publicly reachable from this host (HTTP 401 and a certificate mismatch on 2026-11-27), and no built output exists for /docs/ or /install/. Those two are inferred from the shared Starlight template, not measured.
---

# Page structure and cross-site consistency

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Every rendered page template needs: a valid `lang` on `<html>`, a descriptive `<title>`, exactly one `<main>`, exactly one `<h1>`, one top-level banner and one contentinfo, labelled navs, and a skip link whose target exists. WCAG itself requires only the first, second and a bypass mechanism; the rest is house policy backed by axe best-practice rules and APG.
- WCAG 2.4.1 accepts landmarks or headings as the bypass mechanism, and Lighthouse passes the audit with a skip link, a heading or a landmark ([Lighthouse](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)). A skip link is therefore never enforced by the score: require it by house rule and check it separately.
- Measured (table in Findings 3): Starlight, catalog and Material templates meet the minimum except the points named there; the 2 hand-written pages `start.html` and `privacy.html` on grimoire.rs have no `<main>` and no skip link, and the grimoire.rs landing has 2 `<h1>`.
- Cause of the double `<h1>`: Starlight renders the frontmatter title as `<h1 id="_top">` through `PageTitle`; a splash page that also writes its own hero `<h1>` has two. ocx.sh avoids it by putting `id="_top"` on its own landing `<h1>` (Landing.astro:38).
- Catalog package pages emit a second `<h1>` when the package README contains a top-level heading (kitware/cmake, mitchellh/packer, regclient/regsync in the built catalog). Rendered user Markdown must demote headings.
- The sites that wear the shared ocx.sh shell (root, /docs/, /install/, /catalog/, /integrations/*, /apps/*) are one "set of web pages" under the WCAG definition: same purpose, same organisation. 3.2.3, 3.2.4 and 3.2.6 apply to their chrome as one unit.
- grimoire.rs and index.grimoire.rs share an organisation and purpose and are one set; their headers use different labels for the same function (`index` vs `packages`, `source` vs `github`), which is a 3.2.4 risk.
- ocx-mirror and indexbot sit on a different origin with Material chrome and share no navigation with ocx.sh, but the same organisation and purpose. WCAG's own subdomain example turns on different navigation and different authors; here only the navigation differs. This is contested; treat as in-set for identification and ask the owner.
- The 8 `planned: true` entries render as non-links everywhere. On the hub pages they carry a visible "planned" tag (good). In the mega menu and the shell fragment all 8 render as `<span class="ocx-mega__link">` with the label only: no "planned" in the accessible name, 0 occurrences of the word in `index.html` and `nav.html`. That is a 1.3.1/4.1.2 gap by house policy and a style trap, not a WCAG failure by itself.
- Rule for entries that do not exist: in persistent navigation omit them; on hub or roadmap pages render a non-link with the word "planned" in text; never an `<a href="#">` or an `aria-disabled` link.
- Two `<a>` elements in one ocx.sh header share the visible name `catalog` and point to different URLs (`/catalog/` and `/apps/catalog/`). 2.4.4 and 3.2.4 both want same name, same target.
- Material for MkDocs emits the skip link only when the page has a table of contents (`page.toc | first is defined`), so a page with no headings has no skip link.
- Checks that need the built page: `<h1>` count, landmark count, heading order, skip-link target, title uniqueness, nav order. Checks that run on `.astro` and `.html` sources: `lang`, `<title>`, forbidden `href="#"`, native-element role overrides, hard-coded `<h1>` inside components that sit on Starlight pages.
- Ownership: ux-quality owns templates, chrome and the rendered page; docs-quality owns Markdown content and its headings.

## Findings

### 1. What WCAG 2.2 actually requires at page level

| SC | Level | Text (verbatim) | Source date |
|---|---|---|---|
| 1.3.1 Info and Relationships | A | "Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text." | Understanding page updated 09 March 2026 |
| 2.4.1 Bypass Blocks | A | "A mechanism is available to bypass blocks of content that are repeated on multiple web pages." | 09 February 2026 |
| 2.4.2 Page Titled | A | "Web pages have titles that describe topic or purpose." | 09 March 2026 |
| 2.4.6 Headings and Labels | AA | "Headings and labels describe topic or purpose." | 09 March 2026 |
| 3.1.1 Language of Page | A | "The default human language of each web page can be programmatically determined." | 09 March 2026 |
| 3.2.3 Consistent Navigation | AA | "Navigational mechanisms that are repeated on multiple web pages" "occur in the same relative order each time they are repeated, unless a change is initiated by the user." | 28 June 2026 |
| 3.2.4 Consistent Identification | AA | "Components that have the same functionality within a set of web pages are identified consistently." | 04 October 2026 |
| 3.2.6 Consistent Help | A | help mechanisms repeated across a set of pages "occur in the same order relative to other page content, unless a change is initiated by the user." | 09 March 2026 |

Sources: [WCAG 2.2 Recommendation of 12 December 2024](https://www.w3.org/TR/WCAG22/), [1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html), [2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html), [2.4.2](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html), [2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html), [3.1.1](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html), [3.2.3](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html), [3.2.4](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html), [3.2.6](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html).

What the primary sources do and do not say, which decides what is MUST and what is house policy:

- 2.4.1 lists skip links (G1, G123, G124) and landmarks plus headings (ARIA11, H69) as sufficient techniques. Landmarks alone can satisfy it. The page does not say a skip link must be visible on focus ([2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)).
- 2.4.6 applies only when headings exist; the page "doesn't mention" an `<h1>` requirement or level skips ([2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html)). "Exactly one `<h1>`" is therefore not WCAG; it is the axe best-practice rule `page-has-heading-one` plus house policy.
- The WAI headings tutorial says "Skipping heading ranks can be confusing and should be avoided where possible" and allows skips when closing a subsection ([WAI headings, updated 04 May 2017](https://www.w3.org/WAI/tutorials/page-structure/headings/)). It is old; the rule is advice, not a criterion.
- 3.1.1: the page names H57 (`lang` on `<html>`) and does not define the tag format; the ACT rule "HTML page lang attribute has valid language tag" implies a valid tag ([3.1.1](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)).
- 2.4.2 gives no uniqueness requirement; its examples use a "Specific Topic | Site Section | WAI | W3C" pattern ([2.4.2](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html)).

### 2. Landmarks: APG and axe

The APG maps `header` and `footer` to `banner` and `contentinfo` only when the context is `body`; inside `article`, `aside`, `main`, `nav` or `section` they are not landmarks. Each page "should have one `main` landmark". A role that appears more than once needs "a unique label", except that two `navigation` landmarks with identical link sets may share one label. Do not put the role in the label ("Site Navigation" is read as "Site Navigation Navigation"). Unlabelled landmarks are acceptable only if the role is used once. All perceivable content should sit in a landmark ([APG landmark regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/), page carries no date; footer reads "Copyright © 2026"). The WAI regions tutorial (updated 24 March 2026) says the same about `header`/`footer` inside `article`/`section` ([WAI regions](https://www.w3.org/WAI/tutorials/page-structure/regions/)).

The rules a build can run, from axe-core 4.14 (rule-descriptions, pulled from the repository) and Deque University's 4.11 listing:

| Rule ID | Impact | Kind | Maps to |
|---|---|---|---|
| `bypass` | serious | WCAG | 2.4.1 |
| `document-title` | serious | WCAG | 2.4.2 |
| `html-has-lang`, `html-lang-valid` | serious | WCAG | 3.1.1 |
| `link-name` | serious | WCAG | 2.4.4, 4.1.2 |
| `landmark-one-main`, `page-has-heading-one`, `region`, `landmark-unique`, `landmark-no-duplicate-banner`, `landmark-banner-is-top-level`, `heading-order` | moderate | best practice | none |
| `skip-link` (a skip link needs a focusable target) | moderate | best practice | none |
| `empty-heading` | minor | best practice | none |

Sources: [axe-core 4.14 rule-descriptions](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md), [Deque University axe 4.11 list](https://dequeuniversity.com/rules/axe/html/4.11). `bypass` passes on a heading, a skip link or a landmark; `skip-link` is best practice only. Lighthouse computes its accessibility score from a weighted subset of axe rules (bypass weight 7, html-has-lang 7, document-title 7, heading-order 3, one main 3) and excludes best-practice and manual audits ([Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring), undated; it points at axe-core 4.11). Consequence: a `minScore: 1` Lighthouse gate does not catch a missing skip link, a second `<h1>`, `region` violations or inconsistent chrome.

### 3. Measurement: per template, built output

Commands (run from `/home/mherwig/dev`; the measuring script was a throwaway standard-library `python3 -I` HTMLParser pass over each `dist` HTML file; the one-line equivalents are in the Normative section as verification). Built outputs and their ages: `ocx-sh/website/site/dist` (written 2026-11-16), `ocx-sh/index/dist` (2026-11-23), `grimoire-rs/grimoire/docs/dist` (2026-11-24), `ocx-sh/devcontainer-features/site/dist`. Live pages fetched 2026-11-27 with `curl -s`: grimoire.rs, index.grimoire.rs, grimoire-rs.github.io/indexer, ocx-sh.github.io/ocx-mirror and /indexbot.

| Template (site, example) | pages | `lang` | `<h1>` | `<main>` | banner / contentinfo | skip link | heading skips |
|---|---|---|---|---|---|---|---|
| ocx.sh Starlight page (apps, integrations, team, 404) | 4 | `en` | 1 | 1 | 1 / 1 | `#_top`, target present | 0 |
| ocx.sh landing (`index.html`) | 1 | `en` | 1 (own `<h1 id="_top">`) | 1 | 1 / 1 | `#_top`, target present | 0 |
| ocx.sh fragments (`frag/*`, 6 pages) | 6 | `en` | 0 | 0 | none | none | n/a; `noindex`, 0 in `sitemap-0.xml` (`grep -c 'frag/' sitemap-0.xml`) |
| ocx.sh shell fragment (`_shell/v1/<rev>/nav.html`) | 1 | none | 0 | 0 | one `<nav>` | none | n/a |
| Catalog home and 404 (ocx-sh/index) | 2 | `en` | 1 (visually hidden) | 1 (`id="main"`) | 1 / 1 | `.ocx-skip` to `#main` | 0 |
| Catalog docs pages (17) | 17 | `en` | 1 | 1 | 1 / 1 | `.ocx-skip` to `#docs-content`, target present | 0 |
| Catalog package pages (11) | 11 | `en` | 1 on 8, 2 on 3 | 1 | 1 / 1, plus a `<header class="identity">` inside `<main>` (not a banner) | `.ocx-skip` to `#main` | 0, but `<h2>` "Search" precedes the `<h1>` |
| grimoire.rs Starlight pages (45) | 45 | `en` | 1 | 1 | 1 / 2 `<footer>` elements | `#_top` | 0 |
| grimoire.rs landing | 1 | `en` | **2** | 1 | 1 / 2 `<footer>` elements | `#_top` | 0 |
| grimoire.rs hand-written `start.html`, `privacy.html` | 2 | `en` | 1 | **0** | 1 / 1 | **none** | 0 |
| index.grimoire.rs (live, home) | 1 | `en` | 1 | 1 | 1 / 1; a single unlabelled `<nav>` | **none** | 0 |
| ocx-mirror, indexbot, indexer docs (live, Material) | 3 | `en` | 1 | 1 | 1 / 1 | `.md-skip` | not measured |
| ocx.sh `/docs/`, `/install/` | not measured | inferred `en` | inferred 1 | inferred 1 | inferred 1 / 1 | inferred `#_top` | no dist; ocx.sh returned HTTP 401 and a certificate mismatch on 2026-11-27 |

Commands behind the grimoire.rs lines (run in `grimoire-rs/grimoire/docs/dist`, re-run against the live pages with the same result for `start.html`, `privacy.html` and the home page): `grep -L '<main' $(find . -name '*.html')` lists `privacy.html` and `start.html`; `for f in $(find . -name '*.html'); do n=$(grep -o '<h1[ >]' $f | wc -l); [ $n -ne 1 ] && echo $f $n; done` lists `./index.html 2`; `grep -L '<html[^>]*lang="[a-z]' $(find . -name '*.html')` lists nothing.

Other measured facts:

- Starlight's nav landmarks are labelled through `aria-label` or `aria-labelledby` ("Main", "ocx sections", "On this page"), so no unlabelled `<nav>` on a Starlight page. The label `ocx sections` is used twice on one page (header and mobile copy) with different link sets, against the APG rule that identical labels need identical content (`apps/index.html`, `grep -o '<nav[^>]*>' apps/index.html`).
- The catalog home page title is the bare string `ocx.sh`; `title` on other catalog pages follows `<name> | ocx.sh`. A page titled only with the site name fails the intent of 2.4.2 ("describe topic or purpose") on the home page.
- Material places the skip link only when the page has a ToC: `{% if page.toc | first is defined %}` in `base.html` ([Material base.html, master](https://raw.githubusercontent.com/squidfunk/mkdocs-material/master/src/templates/base.html)); its target is the first ToC anchor. The measured Material pages carry it (`href="#ocx-mirror"`).
- ocx-mirror's `mkdocs.yml` omits `theme.language`; Material's default is `en` ([Material language](https://squidfunk.github.io/mkdocs-material/setup/changing-the-language/), listed as 2025-11-11 on the page), and the live page has `lang="en"`. Setting it explicitly costs one line and survives a default change.

### 4. One set of web pages, or several

Definition, verbatim: "collection of web pages that share a common purpose and that are created by the same author, group or organization". Notes: different language versions are different sets. The glossary examples: a publication split across pages is one set; checkout pages with a different template are not part of the product-page set; and a blog on a sub-domain such as `blog.example.com` "has different navigation and different authors" from `example.com` ([WCAG 2.2 glossary](https://www.w3.org/TR/WCAG22/), fetched in two slices; the third example was paraphrased by the fetch tool, so its wording is not verbatim). The 3.2.6 page adds that different sets on one site may place help differently, though consistency is recommended, and that a page with no help mechanism does not violate it ([3.2.6](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html)). The 3.2.3 page says sub-navigation menus and inserted or removed items do not break "same relative order" ([3.2.3](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html)).

Decision for the fleet, applying both tests (purpose, organisation) and noting the evidence of shared chrome:

| Group | Origin | Organisation | Shared chrome | Set |
|---|---|---|---|---|
| ocx.sh root, /docs/, /install/, /catalog/ (ocx-sh/index), /integrations/devcontainer/, /integrations/bazel/, /apps/* | ocx.sh | ocx-sh | one `nav.json`, one `ocxTheme()` plugin, one `_shell` fragment (`SHELL_DIR "/_shell/v1/"`) | **one set** |
| grimoire.rs (Starlight pages, `start.html`, `privacy.html`) | grimoire.rs | grimoire-rs | own `Header.astro`, own footer, hand-written pages | **one set** (the hand-written pages are inside it; see order check below) |
| index.grimoire.rs | index.grimoire.rs | grimoire-rs | own `Base.astro` chrome | same set as grimoire.rs by the definition (same author, one purpose); different chrome |
| grimoire-rs.github.io/indexer (MkDocs) | github.io | grimoire-rs | Material default | contested, see Contested |
| ocx-sh.github.io/ocx-mirror, /indexbot (MkDocs) | github.io | ocx-sh | Material default; linked from ocx.sh only as external links | contested, see Contested |
| ocx.sh vs grimoire.rs | different | different organisations, different products | none | **separate sets** |

What 3.2.3, 3.2.4 and 3.2.6 then require inside the ocx.sh set, and what was measured:

- 3.2.3, order. The header link order is the same on the ocx.sh landing, an ocx.sh Starlight page and the catalog pages: `ocx, docs, catalog, [hub links], Bazel, CMake, GitHub Actions, Python, public index, catalog, lore, Shorts, Podcasts, install, GitHub`. The footer is `discord, roadmap, security, team` on ocx.sh and the same four plus a fifth, `catalog json`, on the catalog. An item appended at the end keeps relative order, so this passes. Measured in the built outputs of 2026-11-16 and 2026-11-23, so a rebuild may differ. No `/docs/` or `/install/` page was measured.
- 3.2.3, grimoire.rs. Header: `index, docs, changelog, vscode, source` on Starlight pages and `index, docs, vscode, source` on `start.html` and `privacy.html`. The omitted item keeps relative order, which passes. The footer is 45 anchors on Starlight pages and 4 (`documentation, stability, privacy, Apache-2.0`) on the hand-written pages; the 4 appear in the same relative order in the 45. Passes. The header version label also differs by whitespace (`grimoire.rs0.17.0` after tag stripping vs `grimoire.rs 0.17.0`), which only matters if it changes the accessible name.
- 3.2.4, names. Within one ocx.sh header, `catalog` appears twice with different targets (`/catalog/` and `/apps/catalog/`) and `docs`/`install` appear twice with the same target (header and mobile copy). Same name with different targets is the opposite of identification by function; rename one, for example `catalog` and `catalog app`. Between grimoire.rs (`index`, `source`) and index.grimoire.rs (`packages`, `github`) the package list and the repository link carry different names. Pick one label per function.
- 3.2.6, help. The only help mechanism in the fleet's chrome is the `discord` footer link on ocx.sh (and the catalog), first in the footer on both. grimoire.rs has no help item. A page without a help mechanism does not violate 3.2.6, so adding Discord to the catalog is consistent and omitting it from grimoire.rs is not a failure. Rule: if a help link exists anywhere in a set, put it in the same footer position on every page that has a footer.
- User-initiated change is exempt: collapsing the nav on mobile or a theme toggle does not break any of the three.

### 5. Navigation entries for pages that do not exist

Measured on `ocx-sh/website/packages/theme/src/nav.json` (232 lines) and the built `ocx-sh/website/site/dist` of 2026-11-16: `grep -c '"planned": true' nav.json` gives 8, matching the audit. The rendering code is `HubGrid.astro:43-60` and `EcosystemMenu.astro:85-91`. Schema rule C-006 forces "an entry has an href iff it is not planned" (`registry.mjs:170`), so none of the 8 can be a link.

| id | label | hub | Hub page render (`integrations/index.html`, `apps/index.html`) | Mega menu and `_shell/.../nav.html` render | Links to |
|---|---|---|---|---|---|
| gradle | Gradle | integrations | `<div class="ocx-card ocx-card--planned">` with `<span ... class="ocx-ui-tag">planned</span>` | `<span class="ocx-mega__link">Gradle</span>` | nothing |
| gitlab-ci | GitLab CI | integrations | same | same | nothing |
| java | Java | integrations | same | same | nothing |
| mirror-sdk | Mirror SDK | integrations | same | same | nothing |
| vscode | VS Code | integrations | same | same | nothing |
| mirror | ocx-mirror | apps | same | same | nothing |
| indexbot | indexbot | apps | same | same | nothing |
| mcp | ocx-mcp | apps | same | same | nothing |

Accessible names: on hub pages the card text reads "Gradle planned plugin Toolchain provisioning for Gradle builds."; the word "planned" is in the accessibility tree and the element is not focusable. In the mega menu the name is `Gradle`, a list item between real links; the description `<span class="ocx-mega__preview" aria-hidden="true">` is hidden and the `aria-describedby` is set only on real links. `grep -c planned site/dist/index.html site/dist/_shell/v1/*/nav.html` gives 0 and 0. A screen-reader user hears 8 static names mixed in with 9 link names, with no cue. A sighted user sees the missing arrow icon only, because `.ocx-mega__link` styles both. The word `planned` must reach text; colour or a dashed border alone fails 1.4.1 ([Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), updated 16 September 2025: "Color alone cannot convey state").

Source basis for the rule. MDN: an `<a>` without `href` has the generic role and "you should only use a hyperlink for navigation to a real URL"; bogus `href` values (`#`, `javascript:void(0)`) "convey incorrect semantics to assistive technologies" ([MDN a, modified 28 Oct 2026](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)). MDN's page does not cover `aria-disabled` on links. 4.1.2 requires name, role and state of custom components to be programmatically determinable ([4.1.2, updated 02 November 2026](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)); it does not mention disabled links. 2.4.4 does not address unavailable links ([2.4.4, updated 04 October 2026](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)). The fleet rule below is therefore house policy built on those texts, not a criterion.

### 6. Template overrides: where the guarantees live

- Starlight: override through `components` in `starlight()`. `SkipLink` is "hidden until keyboard focus" at the top of `<body>`; `PageTitle` is the page's `<h1>`, and "Implementations should ensure they set `id="_top"` on the `<h1>` element as in the default implementation"; `PageFrame`, `Header`, `Footer`, `Sidebar` and `Hero` are separate overrides. An override must import and render the default and forward named slots ([Starlight overrides reference](https://starlight.astro.build/reference/overrides/), [overriding components](https://starlight.astro.build/guides/overriding-components/); neither page states a date). Inference, not stated by the docs: replacing `PageTitle` without `id="_top"` breaks the skip link target.
- Material for MkDocs: `theme.custom_dir: overrides`; a file with the same path as a theme file replaces it (`overrides/partials/footer.html`); blocks such as `header`, `footer`, `content`, `htmltitle`, `site_nav`, `tabs` are overridable through `overrides/main.html` extending `base.html`; `{{ super() }}` keeps the original. The page lists no skip block ([Material customization](https://squidfunk.github.io/mkdocs-material/customization/), undated). The skip link comes from `base.html` itself. None of the three Material sites has `custom_dir` (`grep -n custom_dir ocx-sh/ocx-mirror/mkdocs.yml ocx-sh/indexbot/mkdocs.yml grimoire-rs/indexer/mkdocs.yml` is empty), so they cannot have received the ocx.sh header without adding an override, and that override is where the 3.2.3 duty would land.
- Starlight sites pass 3.1.1 without work because `lang="en"` comes from the locale defaults; all 70+ measured pages carry it. The risk is outside the template: the three hand-written HTML pages and any new non-route file.

## Normative guidance candidates

Severity key: MUST = a WCAG A/AA criterion or a measured defect; SHOULD = best-practice rule or house policy with a measured violation; CONSIDER = no measured violation. Verification commands run from the site's build output directory (`dist`) unless stated.

| ID | Rule | Rationale | Sev | Verification |
|---|---|---|---|---|
| PS-01 | Set a valid BCP 47 `lang` on `<html>` of every page template, including hand-written HTML in `public/`. | 3.1.1 (A); screen-reader pronunciation. | MUST | `grep -L '<html[^>]*lang="[a-z]' $(find . -name '*.html')` lists nothing; axe `html-has-lang`, `html-lang-valid`. |
| PS-02 | Give every page a non-empty `<title>` that names the page topic and ends with the site name; the home page title must say what the site is, not only its name. | 2.4.2 (A); intent says "describe topic or purpose". | MUST | `grep -L '<title>[^<]\+' $(find . -name '*.html')` lists nothing; reading heuristic: pass `Yank a Version \| ocx.sh`, fail `ocx.sh` (catalog home today). |
| PS-03 | Render exactly one `<main>` per page, containing the page's primary content, and put all other perceivable content in a landmark (`header`, `nav`, `aside`, `footer`). | APG: one main; 2.4.1/1.3.1 landmark technique; axe `landmark-one-main`, `region`. | MUST | `for f in $(find . -name '*.html'); do [ $(grep -o '<main[ >]' $f \| wc -l) -ne 1 ] && echo $f; done`; fails today on grimoire.rs `privacy.html`, `start.html`. Exempt: pages marked `noindex` that are fragments (PS-12). |
| PS-04 | Render exactly one `<h1>` per page. On Starlight a page title already renders an `<h1 id="_top">`: a splash or hero must not add a second; either use `h2` or make the hero heading the only one and give it `id="_top"`. | axe `page-has-heading-one`; one title for orientation. WCAG does not require it ([2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html)). | SHOULD | `for f in $(find . -name '*.html'); do n=$(grep -o '<h1[ >]' $f \| wc -l); [ $n -ne 1 ] && echo $f $n; done`; fails today on grimoire.rs `index.html` (2). |
| PS-05 | Do not skip heading levels downward (`h2` then `h4`) and do not pick a level for its size; style headings with CSS. Closing a subsection with a higher-level heading is allowed. | WAI headings tutorial; axe `heading-order`; 1.3.1 (A) needs real heading markup. | SHOULD | axe `heading-order`; heuristic: list `h[1-6]` in order and flag a step greater than +1; pass `h1,h2,h2,h3,h2`, fail `h1,h3`. |
| PS-06 | Rendered user content (a package README, release notes) must have its headings demoted so that the page keeps one `<h1>` and the page's own sections stay above the content. Place any heading that sits before the `<h1>` in source order (the catalog's "Search" `<h2>`) after it or remove it. | Measured: 3 of 11 catalog package pages have 2 `<h1>`; the `<h2>` "Search" precedes the `<h1>` on all 11. | SHOULD | The PS-04 loop on a built package page; `grep -o '<h[1-6]' kitware/cmake/index.html \| head -3` shows `h2 h1 h2` today. |
| PS-07 | Make the skip link the first focusable element on every template that repeats a header or navigation, link it to an id that exists, and keep it hidden until focus. Hand-written standalone pages that carry the site header are templates too. | 2.4.1 (A) accepts landmarks alone, but Lighthouse `bypass` passes on a heading, so the skip link is the only mechanism a gate can require; axe `skip-link` needs a focusable target. | MUST (templates with repeated chrome) | `grep -Li 'class="[^"]*skip' $(find . -name '*.html')` lists only `noindex` fragments; for each match `href="#X"` check `grep -c 'id="X"'` is 1. Fails today: grimoire.rs `privacy.html`, `start.html`; index.grimoire.rs home. |
| PS-08 | Render at most one `banner` and one `contentinfo` landmark, at top level; give a unique accessible name to every other repeated landmark; two navs with the same name must have identical link sets. Name them without the role word. | APG landmark regions; axe `landmark-unique`, `landmark-no-duplicate-banner`. | SHOULD | axe rules above; `grep -o '<nav[^>]*>' f` shows a label on each nav when more than one exists. Today: `ocx sections` is used for two navs with different links. |
| PS-09 | Within one set of web pages keep repeated navigation and help items in the same relative order on every page; inserting or omitting an item is allowed, reordering is not. | 3.2.3 (AA), 3.2.6 (A). | MUST | Extract the ordered `href` list of header, footer and help items per template, take the intersection of items and diff its order: `python3 -I` over two built files comparing `re.findall(r'<a[^>]*href="([^"]*)"', header_html)` filtered to the common set; any inversion fails. Today: no inversion on the 2 built ocx.sh sets or on grimoire.rs. |
| PS-10 | Within one set, give one visible and accessible name to one function and one function to one name: no two links in a header with the same text and different targets, no two names for the package list or the repository link. | 3.2.4 (AA), 2.4.4 (A). | MUST | Parse header, footer and mega-menu `<a>` text and `href`; fail on a duplicate text with two different hrefs; today `catalog` -> `/catalog/` and `/apps/catalog/`. Heuristic: pass `catalog` and `catalog app`, fail `catalog` and `catalog`. |
| PS-11 | A nav or card entry for a page that does not exist must render as non-link text with the word "planned" in its accessible text (visible on pages, programmatic in menus), or be omitted. In persistent navigation (header, mega menu, drawer, sidebar) omit it; on hub, roadmap or status pages render the card. Never use `<a href="#">`, `href=""`, a link to a 404, or `aria-disabled` on a link for it. | 4.1.2, 1.4.1; MDN: hyperlink only for real URLs. House policy; 8 entries violate the text half today in the menu. | SHOULD | `grep -c 'ocx-mega__link">' nav.html` minus anchors with href equals 0 in menus; `grep -E '<a[^>]*href="(#\|)"' $(find . -name '*.html')` empty; for each `data-planned="true"` element `grep -c planned` in its subtree is >= 1. |
| PS-12 | Partial pages that are served by URL but are not pages (`frag/*`, `_shell/*`) must be `noindex`, absent from the sitemap, and carry `lang`; they are exempt from PS-03, PS-04, PS-07. | Measured: 6 fragments plus `nav.html`; the fragments are `noindex` and not in `sitemap-0.xml`; `nav.html` has no `lang` and no robots signal. | SHOULD | `grep -L 'noindex' $(find frag _shell -name '*.html')` lists nothing; `grep -c 'frag/' sitemap-0.xml` is 0. Today `_shell/v1/*/nav.html` is not marked. |
| PS-13 | When overriding a Starlight component keep `id="_top"` on the page `<h1>`, render the default component inside the override and forward named slots; when overriding a Material partial keep `{{ super() }}` and the `base.html` skip link and `<main>`. | Starlight docs: `PageTitle` must set `id="_top"`; Material emits the skip link and `<main>` from `base.html`. | MUST | Source: `grep -n 'id="_top"' src/components/*.astro` when `PageTitle` is overridden; build then PS-07; for Material `grep -n 'block' overrides/main.html` and a built page still has `md-skip`. |
| PS-14 | Pin `theme.language` (Material) and the locale (Starlight) in config rather than relying on defaults. | The default is `en` today; a default can move. | CONSIDER | `grep -n 'language:' mkdocs.yml`; Starlight `defaultLocale` or `locales` in `astro.config.mjs`. Today ocx-mirror omits it. |
| PS-15 | Treat sites that share an organisation and purpose, and that link to each other as parts of one product, as one set: apply PS-09 and PS-10 across them, or document in the site's CLAUDE.md that they are separate sets and why. Do not decide a new subdomain is a separate set on your own. | WCAG's own subdomain example needs both different navigation and different authors. | MUST | Reading heuristic: both tests of the glossary (shared purpose, same organisation) answered in writing for each site pair; any "no" on a pair needs an owner decision (see below). |
| PS-16 | Run source checks at authoring time and built-page checks in CI; do not rely on one for the other (table below). | Starlight injects the `<h1>`, skip link, landmarks and `lang` at build; sources show none of them. | SHOULD | Presence of both tiers in each site's task or lighthouse config: `ls lighthouse.budgets.mjs` exists on 4 of 6 ocx-sh/grimoire sites today. |

Checks by tier (answers the commission's last question):

| Check | On `.astro` / `.html` / `.mdx` source | Only on built page |
|---|---|---|
| `lang` present | yes for hand-written `public/*.html` and custom layouts (`grep -L '<html[^>]*lang=' file`) | needed for Starlight and Material, where the template writes it |
| `<title>` present | yes for hand-written pages; `title:` frontmatter on Markdown | uniqueness and non-empty after template (`<title>` composed at build) |
| `<h1>` count | only in a component that is not placed on a Starlight page; unreliable otherwise | yes (grimoire.rs landing: source shows one `<h1>`, built page has 2) |
| Heading order | partial, within one file | yes (composed from components, Markdown and page title) |
| Landmarks, one `<main>`, banner/contentinfo count | hand-written pages only | yes |
| Skip link and target | hand-written pages only | yes (target `id` exists) |
| Nav order, names, help position | no (the lists come from `nav.json` and theme components) | yes (intersect and diff, PS-09/PS-10) |
| `href="#"`, `aria-disabled` link, `role` on native element | yes (`grep -rnE 'href="#?"' src`) | also yes, after rendering |
| Planned-entry rendering | `nav.json` data plus component source (C-006) | yes (what the menu actually emits, PS-11) |
| Colour contrast, focus visibility, target size | not here | built pages in a browser (outside this commission) |

Ownership, one line each:

- ux-quality owns the page templates, the shared chrome, the skip link, landmark and heading structure, the planned-entry rendering, and every check on the rendered page (PS-01 to PS-14, PS-16).
- docs-quality owns the Markdown content: its heading levels inside the body (no `#` in the body when the page title is the `<h1>`), link text, and page types; it does not own anything the template generates.

## Dated facts

| Fact | URL | Date the source states | Kind |
|---|---|---|---|
| WCAG 2.2 is a W3C Recommendation, 12 December 2024 | https://www.w3.org/TR/WCAG22/ | 12 December 2024 | authority |
| "set of web pages": shared purpose and same author, group or organisation; different language versions are different sets | https://www.w3.org/TR/WCAG22/ | 12 December 2024 | authority |
| 3.2.3 Consistent Navigation, AA, same relative order; sub-navigation insertion allowed | https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html | updated 28 June 2026 | authority |
| 3.2.4 Consistent Identification, AA; "consistent" is not "identical"; "Search"/"Find" for one function fails | https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html | updated 04 October 2026 | authority |
| 3.2.6 Consistent Help, A; no duty to provide help; pages without help do not fail | https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html | 09 March 2026 | authority |
| 2.4.1 Bypass Blocks, A; skip links and landmarks/headings both sufficient | https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html | 09 February 2026 | authority |
| 2.4.2, 2.4.6, 3.1.1, 1.3.1: texts and techniques above | links in Findings 1 | 09 March 2026 each | authority |
| APG: one `main`, unique labels for repeated roles, header/footer are landmarks only in `body` context | https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/ | no date on page (footer "Copyright © 2026") | authority |
| WAI: heading ranks "should be avoided where possible" to skip | https://www.w3.org/WAI/tutorials/page-structure/headings/ | 04 May 2017 | authority, old |
| WAI: `header`/`footer` inside `article`/`section` get no landmark role | https://www.w3.org/WAI/tutorials/page-structure/regions/ | 24 March 2026 | authority |
| axe-core 4.14 rule set: `bypass` WCAG A serious; `landmark-one-main`, `page-has-heading-one`, `region`, `heading-order`, `skip-link` best practice, moderate | https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md | repository head, version 4.14 as inferred from rule links | tool vendor (Deque) data |
| axe 4.11 list on Deque University; `link-name` maps to 2.4.4 and 4.1.2 | https://dequeuniversity.com/rules/axe/html/4.11 | no release date; footer "2013-2026" | tool vendor data |
| Lighthouse accessibility score = weighted axe audits, bypass 7, html-has-lang 7, document-title 7, heading-order 3, one main 3; best-practice and manual audits excluded | https://developer.chrome.com/docs/lighthouse/accessibility/scoring | no date; links axe 4.11 | tool vendor (Google) data |
| Starlight `SkipLink` hidden until focus; `PageTitle` must keep `id="_top"` | https://starlight.astro.build/reference/overrides/ | no date | framework docs |
| Material emits the skip link only if `page.toc` is non-empty; `<html lang>` from `lang.t('language')` | https://raw.githubusercontent.com/squidfunk/mkdocs-material/master/src/templates/base.html | master at fetch time 2026-11-27 | framework source |
| Material `theme.language` default `en` | https://squidfunk.github.io/mkdocs-material/setup/changing-the-language/ | page lists 2025-11-11 and 2016-02-04, unlabelled | framework docs |
| MDN: `<a>` without `href` has generic role; hyperlink only for real URLs | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a | modified 28 Oct 2026 | independent reference |
| 4.1.2 updated; 1.4.1 updated; 2.4.4 updated | links in Findings 5 | 02 Nov 2026; 16 Sep 2025; 04 Oct 2026 | authority |
| Fleet counts: 8 planned entries, 17 entries, built dist ages 2026-11-16 / 11-23 / 11-24, grimoire.rs live 2026-11-27 | local, commands in Findings 3 and 5 | measured 2026-11-27 | first-party measurement |

## What an agent must not decide alone

- Whether a new subdomain, a GitHub Pages docs site, or a sibling product belongs to an existing site's set (PS-15). The answer changes whether 3.2.3 and 3.2.4 bind it. Ask the owner; the glossary gives the test, not the verdict.
- The conformance target (WCAG 2.2 A, AA or AAA), and the legal basis the organisation claims (accessibility statement, EN 301 549, regional law). This research gave the criteria text only; it did not fetch any statute.
- Whether to ship a nav entry for an unreleased product at all. "Planned" is a marketing and roadmap decision (promising a Gradle plugin that does not exist), not a rendering choice. The agent decides how it renders once the owner says it may appear.
- Whether to extract the shared chrome into one component or one `_shell` fragment for every site (routed to M261) and whether the MkDocs sites adopt the ocx.sh header (needs a `custom_dir` override). Report the 3.2.3 and 3.2.4 consequence, then ask.
- What help channel exists and which one is primary (Discord, issues, email). 3.2.6 fixes position, not content.
- Page titles and the site name used in them when they are brand names.

## AI-agent angle

| Typical mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| Adds a hero `<h1>` to a Starlight splash page, producing 2 `<h1>` | training data shows single-page HTML where `<h1>` is the hero; Starlight's title `<h1>` is invisible in the source | PS-04 loop on the built page |
| Uses `<a href="#">` or `<a>` with `aria-disabled="true"` for a "coming soon" item | common in component libraries | `grep -rnE '<a[^>]*(href="#?"\|aria-disabled)' src` |
| Renders a planned item with the same class as a link, differing only by missing icon or colour | styles the visual, forgets the accessible name | PS-11: `grep -c planned` in the item's subtree |
| Adds `<main>` inside another component, or wraps a Starlight page in a second `<main>` | copies page-level boilerplate into a component | PS-03 count equals 1 |
| Adds a header and footer inside `<main>` or `<article>` and counts them as banner/contentinfo | does not know the context rule | PS-08; axe `landmark-banner-is-top-level` |
| Adds `role="navigation"` to `<nav>`, `role="main"` to `<main>` | redundant ARIA habit | `grep -rnE '<(nav\|main\|header\|footer)[^>]*role=' src` empty |
| Gives two navs the same `aria-label` with different contents, or "Main Navigation" | copy-paste | PS-08 |
| Hand-writes a standalone page in `public/` without `<main>`, skip link or the header | the page is outside the framework, so no template adds them | PS-01, PS-03, PS-07 on every file in `public/*.html` |
| Reorders or renames header items "for clarity" on one site | does not know the set | PS-09, PS-10 against the sibling site's built header |
| Replaces `PageTitle` and drops `id="_top"` | override docs example omits it | PS-13 grep, then PS-07 |
| Uses the site name as the entire page title | easy default | PS-02 heuristic |
| Writes a README with a top-level `#` and the catalog renders it as a second `<h1>` | Markdown habit | PS-06 on built package pages |
| Treats a green Lighthouse accessibility score as proof the page structure is fine | score excludes best-practice audits | run axe-core with best-practice tags and the PS loops |

## Contested / evolving

- Is a skip link required when landmarks exist? 2.4.1 lists landmarks (ARIA11) and headings (H69) as sufficient ([Understanding 2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)); the axe `bypass` rule passes on a heading, skip link or landmark ([axe rules](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)). The house position (skip link required) is stricter than WCAG; the case for it is that keyboard users cannot jump to a landmark without assistive technology, a point the fetched sources do not make, so treat it as house policy.
- One `<h1>` per page. The WAI tutorial shows a single `<h1>` and does not forbid more; axe flags absence only. HTML allows several. The fleet rule of exactly one is a house choice with a measured bug behind it (the grimoire.rs landing).
- Are ocx-mirror and indexbot (github.io, Material) in the ocx.sh set? For: same organisation (ocx-sh) and one product purpose, and ocx.sh nav links to them. Against: the glossary's subdomain example turns on different navigation and different authors; here the navigation differs and the author does not, so the example does not settle it. No source in the 24 fetched settles it. Position taken: in-set for 3.2.4 naming (a `GitHub` or `docs` link must be named the same), out of scope for 3.2.3 order until an owner decides.
- Grimoire: grimoire.rs and index.grimoire.rs share an organisation but have different header labels; the second links to the first. By the definition they are one set; the 3.2.3 order test passes, the 3.2.4 naming test is at risk. No source gives a threshold for how similar names must be (3.2.4 says "consistent, not identical").
- Whether dropping `aria-disabled` link advice is right: MDN's anchor page does not cover it, and the fetched WCAG pages are silent on disabled links. Position taken (non-link plus text) follows MDN's "hyperlink only for real URLs" and is conservative; a source that endorses `aria-disabled` links with a documented pattern was not found in this pass.
- Trend: WCAG Understanding pages for 2.4.x, 3.2.x and 4.1.2 were all revised between September 2025 and November 2026 (dates in the Dated facts table); WCAG 2.2 itself is unchanged since 12 December 2024. Re-fetch before copying a wording into a published rule.

## Sources

Primary (authority, standard, or the framework's own docs/source): 1 to 14. Independent or tool-vendor: 15 to 21.

| # | URL | What it is | Date/era | Why worth reading |
|---|---|---|---|---|
| 1 | https://www.w3.org/TR/WCAG22/ | WCAG 2.2 Recommendation, normative text and glossary | 12 December 2024 | the definition of "set of web pages" and the SC texts |
| 2 | https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html | Understanding 3.2.6 | 09 March 2026 | help order, no duty to provide help |
| 3 | https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html | Understanding 3.2.3 | 28 June 2026 | relative order, sub-nav exception |
| 4 | https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html | Understanding 3.2.4 | 04 October 2026 | same function, same name |
| 5 | https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html | Understanding 2.4.1 | 09 February 2026 | techniques G1, G123, G124, ARIA11, H69 |
| 6 | https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html | Understanding 1.3.1 | 09 March 2026 | real headings and landmarks |
| 7 | https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html | Understanding 2.4.2 | 09 March 2026 | title content |
| 8 | https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html | Understanding 2.4.6 | 09 March 2026 | no `<h1>` or skip-level requirement |
| 9 | https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html | Understanding 3.1.1 | 09 March 2026 | `lang` technique H57 |
| 10 | https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/ | APG landmark regions | undated, 2026 footer | one main, unique labels, context rule |
| 11 | https://starlight.astro.build/reference/overrides/ | Starlight overrides reference | undated | `SkipLink`, `PageTitle` `id="_top"` |
| 12 | https://starlight.astro.build/guides/overriding-components/ | Starlight override guide | undated | default render and slot forwarding |
| 13 | https://squidfunk.github.io/mkdocs-material/customization/ | Material template overrides | undated | `custom_dir`, blocks, partials |
| 14 | https://raw.githubusercontent.com/squidfunk/mkdocs-material/master/src/templates/base.html | Material `base.html` | master, 2026-11-27 | skip link condition, `<main>`, `lang` |
| 15 | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html | Understanding 1.4.1 | 16 September 2025 | state not by colour alone |
| 16 | https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html | Understanding 4.1.2 | 02 November 2026 | custom component name, role, state |
| 17 | https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html | Understanding 2.4.4 | 04 October 2026 | link text and same name, different target |
| 18 | https://www.w3.org/WAI/tutorials/page-structure/headings/ | WAI headings tutorial | 04 May 2017 | heading rank advice (old) |
| 19 | https://www.w3.org/WAI/tutorials/page-structure/regions/ | WAI regions tutorial | 24 March 2026 | header/footer context, nav labels |
| 20 | https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md | axe-core rule list (vendor data) | head, 4.14 | rule IDs, impact, best-practice flag |
| 21 | https://dequeuniversity.com/rules/axe/html/4.11 | Deque axe 4.11 rule list (vendor data) | 2013-2026 footer | WCAG mapping per rule |
| 22 | https://developer.chrome.com/docs/lighthouse/accessibility/scoring | Lighthouse scoring (vendor data) | undated | what the score does not cover |
| 23 | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a | MDN `<a>` | modified 28 Oct 2026 | placeholder and fake-button links |
| 24 | https://squidfunk.github.io/mkdocs-material/setup/changing-the-language/ | Material language setting | page lists 2025-11-11 | default `en` |

Fetch failures: `https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md` returned HTTP 503 (the raw URL above worked instead). `https://ocx.sh/`, `/docs/`, `/install/`, `/catalog/` returned HTTP 401 with a certificate mismatch from this host, so no live ocx.sh page was measured. The WCAG 2.2 Recommendation page is 269,706 characters; characters 0 to 200,000 were read in slices, and the last 69,706 were not (the commission's text and glossary lay inside the part read). The fetch tool truncated quotes at 125 characters, so the glossary's blog-subdomain example is paraphrased, not verbatim.

Local measurements: `ocx-sh/website/packages/theme/src/nav.json`, `HubGrid.astro`, `EcosystemMenu.astro`, `registry.mjs`; built outputs named in Findings 3; `product-audit/site-shape.md` sections 3 and 4 and smells 4, 5, 7 and 10 as the starting rows (scout rows FC26, PR55, AX5, AX29, PR30 and M038, M055, M260 to M262 were not found by id in `ux-topic-map/*.md`; the commission's own descriptions were used).

---
title: Page Structure, Landmarks and Consistent Chrome
summary: The UX-A11Y-28 to 34 rows, covering lang and title per template, landmarks and their names, one h1 per built page, the skip link, consistent navigation across a set of pages, and entries for pages that do not exist
---

# Page Structure, Landmarks and Consistent Chrome

Owns the document skeleton of a rendered page and the chrome shared by a set of pages: `lang`, the title, landmarks, headings, the skip link, the order and names of repeated navigation, and what navigation shows for a page that does not exist. Rows bind built output, because a framework injects most of this structure and a source grep cannot see it. A Starlight or Material page gets its `<h1>`, skip link, landmarks and `lang` at build time. Neighbours: heading levels inside a Markdown body are `docs-quality`. Whether a nav entry for an unreleased product may appear at all is a roadmap and messaging decision, and a page title made of brand names is copy (`marketing-quality`). The head's description, canonical and Open Graph tags are `marketing-quality`. The gate that runs axe and the page-structure script across every route is `UX-VERIFY`.

Contents: [Dates and Versions](#dates-and-versions) · [Setup](#setup) · [Document Skeleton](#document-skeleton) · [Landmarks and Headings](#landmarks-and-headings) · [Skip Link](#skip-link) · [Consistency Across a Set](#consistency-across-a-set) · [Planned Entries](#planned-entries) · [Decisions That Stand](#decisions-that-stand) · [Ask the Owner First](#ask-the-owner-first) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27 unless a row says otherwise.

- **WCAG 2.2** Recommendation of 2024-12-12. Understanding pages: [3.1.1 language of page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html) and [2.4.2 page titled](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html) (undated), [2.4.1 bypass blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html) 2026-02-09, [3.2.3 consistent navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) 2026-06-28, [3.2.4 consistent identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html) 2026-10-04, [2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html) (undated). A "set of web pages" is a shared purpose plus the same author or organisation ([WCAG 2.2 glossary](https://www.w3.org/TR/WCAG22/)). Refresh every 6 months.
- **WebAIM Million 2026** (updated 2026-03-30, annual): missing `lang` on 13.5% of home pages ([source](https://webaim.org/projects/million/)).
- **axe-core 4.14.1.** `landmark-one-main`, `region`, `landmark-no-duplicate-banner`, `page-has-heading-one` and `heading-order` sit in the best-practice table with no WCAG tag ([rule descriptions](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md), fetched 2026-11-27). That is why UX-A11Y-29 and UX-A11Y-31 are SHOULD. Lighthouse's `bypass` audit passes on a single heading, and Lighthouse excludes best-practice audits ([scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring), undated). Refresh at each axe minor release.
- **APG** [landmark regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) (Copyright 2026, undated). Refresh every 12 months.
- **Frameworks.** [Starlight overrides](https://starlight.astro.build/reference/overrides/) (undated) say an override "should ensure they set `id="_top"`". Material's [`base.html`](https://raw.githubusercontent.com/squidfunk/mkdocs-material/master/src/templates/base.html) emits the skip link only inside `{% if page.toc | first is defined %}` (master, fetched 2026-11-27). Refresh at each major or minor framework upgrade: run `grep -n 'toc | first' base.html` in the installed Material and re-read the Starlight page.
- **Measured counts** were taken 2026-11-27 on built pages of two documentation frameworks and a catalog site. A hero heading added a second `<h1>` to a Starlight landing page. 3 of 11 catalog package pages had 2 `<h1>` (a README's `#`), and the "Search" `h2` came before the `h1` on all 11. Two hand-written standalone pages had no `<main>` and no skip link. The catalog home `<title>` was the bare site name. 8 planned entries rendered as label-only spans. One header link text pointed to two targets, and the same two functions carried different labels on two sibling sites.

## Setup

`BUILD` is the build output directory. Built pages are untracked, so the file list comes from `find`.

```sh
CHECKS=.claude/skills/ux-quality-reference/checks
built() { find "$BUILD" -type f -name '*.html' -print0; }
built | awk 'END { if (NR == 0) print "canary: nothing listed" }'
# count of PAT per file; prints the files where it is not exactly one (fragments marked noindex are exempt)
count_one() { built | PAT="$1" xargs -0 -r awk 'FNR == 1 { if (NR > 1 && n != 1) print prev, n; prev = FILENAME; n = 0 } { n += gsub(ENVIRON["PAT"], "&") } END { if (NR > 0 && n != 1) print prev, n }'; }
```

`page_structure.py` checks the same facts on the built tree: `python3 -I "$CHECKS"/page_structure.py "$BUILD"` exits 1 on a finding and prints the rule ID and severity of each. `--must-only` reports MUST rules only, and `--sitemap` reads the page list from a sitemap. It covers `lang`, the title, one `main`, one `h1`, the skip link and repeated chrome across pages (UX-A11Y-28, UX-A11Y-29, UX-A11Y-31, UX-A11Y-32 and UX-A11Y-33, with the page list of `UX-VERIFY-04`). It does not read UX-A11Y-30 or UX-A11Y-34. The searches below need no script and say what each one proves.

## Document Skeleton

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-28 | Set a valid BCP 47 `lang` on `<html>` and a non-empty `<title>` that names the page's topic, followed by the site name, in every page template. Templates include hand-written standalone pages and served fragments. A home-page title says what the site is, not only its name. | 3.1.1 and 2.4.2 (Level A). Missing `lang` is on 13.5% of home pages (WebAIM). | See block UX-A11Y-28: both lists must print nothing. Reading heuristic, unverified: a title "Yank a Version" followed by the site name passes, and the bare site name fails. | MUST |

```sh
# UX-A11Y-28: pages with no lang; any file printed is a finding
built | xargs -0 -r grep -L -E -e '<html[^>]*lang="[a-z]' --
# UX-A11Y-28: pages with no non-empty title; any file printed is a finding
built | xargs -0 -r grep -L -E -e '<title>[^<]+' --
```

```html
<!-- UX-A11Y-28 and UX-A11Y-29: the skeleton every page template carries -->
<html lang="en"><title>Yank a Version - Example</title>
<body><a class="skip-link" href="#main">Skip to content</a>
<header>...</header><nav aria-label="Site">...</nav><main id="main"><h1>Yank a Version</h1>...</main><footer>...</footer></body></html>
```

## Landmarks and Headings

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-29 | Render exactly one `<main>` per page and put all other perceivable content in a landmark. Render at most one top-level `banner` and one top-level `contentinfo`. A `<header>` or `<footer>` inside `article`, `aside`, `main`, `nav` or `section` is not a landmark. Fragments marked `noindex` are exempt. | WCAG requires no landmark count, and ARIA11 is one sufficient technique, not a requirement. The matching axe rules are best practice, so this is **house policy**. 2 hand-written pages had no `<main>`. | See block UX-A11Y-29: the list holds only fragments. Also axe `landmark-one-main`, `region` and `landmark-no-duplicate-banner`. | SHOULD |
| UX-A11Y-30 | When a landmark role appears more than once, give each instance a unique name, and leave the role word out of it ("Site", not "Site navigation"). Two navs share a name only when their link sets are identical. | APG landmark regions. One built page used the label `sections` for two navs with different link sets. | See block UX-A11Y-30: every `nav` carries a label when there is more than one. Also axe `landmark-unique`. | SHOULD |
| UX-A11Y-31 | Render exactly one `<h1>` per built page. On Starlight the page title is already `<h1 id="_top">`, so a hero heading is an `h2`, or it is the only `<h1>` and carries `id="_top"`. Demote headings in rendered user content (a README, release notes) so the page keeps one `<h1>` and its own sections stay above that content. Never skip a level downward, and never pick a level for its size. | axe `page-has-heading-one` and `heading-order` are best practice, and 2.4.6 does not require a single `<h1>`, so this is **house policy** backed by measured bugs. | See block UX-A11Y-31: the list prints nothing. A heading-order list must not step by more than +1. | SHOULD |

```sh
# UX-A11Y-29: pages whose main count is not one; the list holds only fragments
count_one '<main[ >]'
# UX-A11Y-30: every nav tag; with more than one per page, each needs a label (aria-label or aria-labelledby)
built | xargs -0 -r grep -H -o -E -e '<nav[^>]*>' --
# UX-A11Y-31: pages whose h1 count is not one
count_one '<h1[ >]'
```

## Skip Link

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-32 | On every template that repeats a header or navigation, make a skip link the first focusable element, hidden until it gets focus, pointing at an id that exists. Hand-written standalone pages that carry the site header count as templates. When overriding Starlight's `PageTitle`, keep `id="_top"` and render the default inside the override. When overriding a Material partial, keep `{{ super() }}`. Material emits its skip link only when the page has a table of contents. | **House policy, MUST.** WCAG 2.4.1 passes with landmarks alone, but Lighthouse `bypass` passes on a single heading, so only a direct check can require a mechanism. Both frameworks ship a skip link, and the violations were measured: no skip link on 3 standalone pages. Unmeasured for Material pages without a table of contents. | See block UX-A11Y-32: only fragments are listed. Each printed `href="#X"` needs exactly one `id="X"` in the same page. Also axe `skip-link`. | MUST |

```sh
# UX-A11Y-32: pages with no skip-link class; the list holds only fragments
built | xargs -0 -r grep -L -i -E -e 'class="[^"]*skip' --
# UX-A11Y-32: the skip anchors and their targets; confirm one id per printed target in the same page
built | xargs -0 -r grep -H -o -i -E -e '<a[^>]*(class="[^"]*skip[^"]*"[^>]*href="#[^"]*"|href="#[^"]*"[^>]*class="[^"]*skip)' --
```

```html
<!-- UX-A11Y-31 on Starlight: the title is already the h1, so the hero is an h2 -->
<main><h1 id="_top">Example</h1><section class="hero"><h2>Ship faster</h2></section></main>
```

## Consistency Across a Set

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-33 | Within one set of web pages, keep repeated navigation and help items in the same relative order on every page (inserting or omitting an item is allowed, reordering is not). Give one function one name, and one name one function: no two links in the chrome share a text and point to different targets, and no function carries two labels across the set. Whether a new site or subdomain belongs to an existing set is an owner question: until the owner answers, apply this rule as if the site is in the set. | 3.2.3 (AA), 3.2.4 (AA) and 3.2.6 (A). A set is a shared purpose plus the same author or organisation (WCAG 2.2 glossary). | The four steps below. Reading heuristic, unverified: `catalog` plus `catalog app` passes, and `catalog` twice fails. | MUST |

1. Extract the ordered `(text, href)` list of the header, footer and any mega menu from two built pages per site in the set. Intersect the lists and diff the order. Any inversion fails.
2. Fail on any text that maps to two different hrefs.
3. Resolve every href to an absolute URL, then fail on any URL that carries two different link texts across the set. This catches `index` against `packages` when both point at the same package list.
4. Record the function-to-URL map once per set, because two different URLs for one function are not visible to steps 1 to 3.

`page_structure.py` automates the order check and the one-text-two-targets check, and it leaves out page-specific navs (breadcrumb, table of contents, pagination). Steps 3 and 4 are yours: run the script first, then resolve the hrefs and record the function map by hand.

## Planned Entries

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-34 | Leave an entry for a page that does not exist out of persistent navigation (header, mega menu, drawer, sidebar). On a hub, roadmap or status page, render it as non-link text whose visible and accessible text contains the word "planned". Never use `href="#"`, `href=""`, a link to a 404 page, or an `aria-disabled` link for it. Never write a new disabled link. | 4.1.2 and 1.4.1. A non-link entry that differs from links only by a missing icon has no cue for a screen-reader user or a colour-blind user. MDN says to use a hyperlink only for a real URL. **House policy.** Primer says never disable a link, and AIH says remove `href` and calls `aria-disabled` on `a[href]` NOT RECOMMENDED, so an existing `role="link"` plus `aria-disabled` link with no `href` is left alone but never copied. | See block UX-A11Y-34: no hit is the pass. Then for each element rendered from a planned entry, `grep -c planned` in its subtree is at least 1, and persistent navigation holds none. | SHOULD |

```html
<!-- UX-A11Y-34 wrong: a link to a page that does not exist -->
<li><a href="#">Gizmo</a></li>
<!-- UX-A11Y-34 right, on a hub page: text that says it is planned, and no link -->
<li class="card card--planned">Gizmo <span class="tag">planned</span></li>
```

```sh
# UX-A11Y-34: any hit is a finding
built | xargs -0 -r grep -H -n -E -e '<a[^>]*href="(#)?"' --
```

## Decisions That Stand

- **Sites that share a purpose and an organisation form one set**, so their shared chrome binds 3.2.3 and 3.2.4 as one unit. A hosted-docs site on a third-party framework is in the set for naming and out of it for order until the owner decides.
- **A skip link is required even where landmarks alone would pass 2.4.1.** The mechanism is checkable and the landmark count is not, so the rule requires the one a gate can test.
- **Structure is checked on the build.** A source file shows a template, not the `<h1>`, the landmarks or the skip link a framework injects, so a rule here that a source grep could answer is one the build answers better.

## Ask the Owner First

- **Set membership.** Ask whether a new subdomain, a hosted-docs site or a sibling product belongs to an existing set (UX-A11Y-33).
- **Whether a nav entry for an unreleased product appears at all.** You decide only how it renders (UX-A11Y-34). The question is a roadmap and marketing decision, and the owner has not answered it for the 8 planned entries measured.
- **The label to use for a shared function** across sibling sites, and for two links that share a name and point to different targets.
- **Whether a hosted-docs site on a different framework joins the set for order** (3.2.3). It may need a Material `custom_dir` header override.
- **A change to a shared template package** that five sites consume. It alters every consumer.

## What Agents Get Wrong Here

1. **Adding a hero `<h1>` to a Starlight page**, which already renders one (UX-A11Y-31).
2. **Hand-writing a page in `public/` with no `<main>` and no skip link**, because no template wraps it (UX-A11Y-29, UX-A11Y-32).
3. **Overriding `PageTitle` and dropping `id="_top"`**, which breaks the skip-link target (UX-A11Y-32).
4. **Overriding a Material partial without `{{ super() }}`**, or assuming every Material page has a skip link (UX-A11Y-32).
5. **Renaming or reordering header items "for clarity" on one site of a set** (UX-A11Y-33).
6. **Writing `<a href="#">` for an entry whose page does not exist yet**, or an `aria-disabled` link (UX-A11Y-34).
7. **Rendering a planned entry as a label-only span** that differs from links only by a missing icon (UX-A11Y-34, UX-A11Y-19 in the focus and colour depth file).
8. **Titling the home page with the bare site name** (UX-A11Y-28).
9. **Reading source instead of built output.** A source grep cannot see a framework's injected `<h1>`, landmarks or skip link, so every row here is checked on the build (UX-A11Y-29, UX-A11Y-31, UX-A11Y-32).
10. **Treating a green Lighthouse run as proof of structure.** It excludes the best-practice audits and passes `bypass` on a single heading (UX-A11Y-32).

---
title: css-theming recent shifts, 2026-08-30 to 2026-11-27
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 27
---

# css-theming: shifts the pair does not mention

This is a delta against the existing pair (rules/css-theming.md and skills/css-theming-reference/). Baseline text is Chromium 151, tailwindcss 4.3.3, and the Not Studied list as it stands. Nothing below was written from memory. Fetched pages were read through a summarising fetch tool, so every claim carries its source URL; a few pages failed and are listed at the end.

**Verdict: no shift in the window forces a new MUST rule. Two items justify an edit now (a re-probe note for Tailwind, and a Not Studied line for scoped registries). The rest are Not Studied lines.**

## Ranked list

### 1. Container style queries are now cross-engine, with `attr()` inside them (Not Studied line, probe first)

- Shift: Firefox announced default-on style queries for Firefox 151 (intent to ship dated 2026-04-13, before the window). In the window, Firefox 155 (released 2026-09-01) added `attr()` in any property with typed values and fallbacks, usable inside container style queries. MDN documents range syntax (`style(--n >= 3)`) and warns that plain and range forms can differ (`style(--n: 3)` false but `style(--n = 3)` true for `calc(6/2)`).
- Sources: https://groups.google.com/a/mozilla.org/g/dev-platform/c/WpRW4SetBL8 ; https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/155 ; https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@container
- Fills: the Not Studied hole "container style queries" (rules/css-theming.md line 184); would extend CSS-TOK-03 (a token read through `style()` still needs both scheme branches) and CSS-CAS-01..05 (does a style query see layered vs unlayered custom properties the same way).
- Readiness: Not Studied line only. Nobody has measured how a style query resolves a custom property across layers or a consumer's unlayered `:root` override. MDN's own Baseline label could not be determined (the compat table did not load). The main shift predates the window; only `attr()` is new.
- Verification when promoted: probe `@layer a{:root{--x:1}} :root{--x:2}` with `@container style(--x: 2)` in Chromium, Firefox and WebKit; grep built CSS for `@container style(`.

### 2. Scoped custom element registries now ship in all three engines (Not Studied line, add a Shadow DOM row note)

- Shift: Firefox 159 (released 2026-10-27, in window) enables `customElementRegistry` on Document, Element and ShadowRoot and the `CustomElementRegistry()` constructor by default. Chrome's blog (2026-03-09) lists Chrome and Edge 146 and Safari 26 as already shipping. A shadow root can now carry its own element definitions, so the tag that gets upgraded (and therefore styled by `:host`, `::part()` and `adoptedStyleSheets`) depends on which registry the root uses.
- Sources: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/159 ; https://developer.chrome.com/blog/scoped-registries ; https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/156 (flag, Nightly, 2026-09-15)
- Fills: gap in skills/css-theming-reference/web-components.md and the Shadow DOM row of the surface table; not a CSS-* rule.
- Readiness: Not Studied line. No theming consequence is established yet, only that the mechanism is now portable.
- Verification when promoted: register the same tag name in two registries and check which one's `::part()` rule applies in a test page.

### 3. Tailwind 4.3.4 and 4.3.5 changed `@scope` handling (re-probe, edit the claim's version note now)

- Shift: 4.3.4 (2026-11-02) makes `@scope` variants wrap the generated utilities instead of nesting inside them, and wraps declarations placed directly inside `@scope` in `:where(:scope)`. 4.3.5 (2026-11-06) changes escape and trailing-`;` parsing only. The pair measured 4.3.3 (tailwind.md); tailwind.md has no `@scope` text of its own.
- Source: https://github.com/tailwindlabs/tailwindcss/releases
- Extends: CSS-CAS-05 (`@scope` is outranked by layers). Wrapping `:scope` in `:where()` changes specificity of those declarations, so any measured tuple involving Tailwind-generated `@scope` output is stale until re-run.
- Readiness: ready to add a one-line "measured at 4.3.3; 4.3.4 changed `@scope` variant output" note. Do not change the rule text until re-measured.
- Verification: rebuild the Tailwind fixture at 4.3.5 and diff the emitted `@scope` blocks and the (a,b,c) specificity against 4.3.3.

### 4. Colour-derivation and light-dark additions reached Baseline (CONSIDER-level note, Not Studied line)

- Shift: web.dev's September roundup (published 2026-10-02) lists as Baseline newly available: `alpha()` relative colour (Chrome 151/152, Firefox 155, Safari 27), `<image>` values inside `light-dark()` (Chrome 150, Firefox 150, Safari 27), and the `revert-rule` keyword (Chrome 148, Firefox 150, Safari 27). The roundup's Chrome version for `alpha()` (151) disagrees with the Chrome 152 release notes (2026-08-25); trust the release notes.
- Sources: https://web.dev/blog/web-platform-09-2026 ; https://developer.chrome.com/release-notes/152
- Extends: CSS-TOK-01 (a derived value via `alpha(from var(--brand) / ...)` keeps the token live, where a Sass `rgba()` bakes a literal) and CSS-TOK-03 (the `light-dark()` exception now also covers images, and the `dark-parity` skip must still skip `light-dark(`). `revert-rule` is a possible override escape hatch next to layers; its interaction with layers is unmeasured.
- Readiness: wording only for CSS-TOK-01/03; `revert-rule` is a Not Studied line.
- Verification: `grep -n "light-dark(" <built.css>` stays skipped by scripts/dark-parity.mjs; probe `revert-rule` inside and outside `@layer`.

### 5. DTCG format has a new community-group draft (stays Not Studied)

- Shift: the 2025.10 stable version (announced 2025-10-28) is before the window. The draft at designtokens.org/TR/drafts is dated 2026-09-08 and is organised as three modules (Format, Color, Resolver). Whether it changes the alias or component-tier model could not be determined, because the page only links the modules; the page itself says not to implement the draft.
- Sources: https://www.designtokens.org/ ; https://www.designtokens.org/TR/drafts/
- Fills: the Not Studied hole "DTCG format".
- Readiness: Not Studied line, and add the version note "stable 2025.10, draft 2026-09-08". No rule.
- Verification: read the Resolver module for how modes/themes select token sets before writing anything.

### 6. Qwik 2 reached release candidate (stays Not Studied)

- Shift: `@qwik.dev/core@2.0.0-rc.0` was reported published 2026-10-01 (a secondary source; the GitHub page I could open only starts at rc.5, 2026-11-09). Docs still carry a "v2 beta" banner. `useStyles$()` is documented as global, lazy-loaded and non-reactive; `useStylesScoped$()` scopes selectors and needs `:global()` for slotted children; the scoped-style class prefix changed to a lightning-bolt symbol in alpha.7 (before the window). Whether 2.0 stable shipped could not be determined.
- Sources: https://qwik.dev/docs/core/styles/ ; https://github.com/QwikDev/qwik/releases
- Fills: Not Studied hole "Qwik `useStyles$`".
- Readiness: Not Studied line plus a version note. Wait for 2.0 stable before writing a row.

## Checked and rejected (do not add)

- `if()`, `@function`, `:has-slotted`: MDN still marks all three "Limited availability", not Baseline. One fetch summary of the Safari 27 release notes claimed Safari 27 ships `if()`, `@function`, `contrast-color()`, `:has-slotted` and style queries; that summary was built from a title line only, and WebKit's own feature post (via search) lists none of them, so the claim is not accepted. `contrast-color()`'s MDN page returned 404; status could not be determined.
- Chrome 153 (2026-09-08) and 154 (2026-09-22) CSS items (single-axis overflow, `scroll-axis-lock`, `scroll-marker-group`, `text-decoration-inset`, `font-width` descriptor) have no theming consequence. Chrome 152 added Reference Target for shadow DOM (2026-08-25, one week before the window; ARIA, not styling).
- Firefox 156 to 158 (2026-09-15, 09-29, 10-13): `at-rule()` in `@supports` (157) is a possible gate for `@scope` fallbacks; `named-feature()`, `random()`, `corner-shape` are experimental. No theming rule.
- Safari 27.0: customizable select, `:heading`, `no-clamp` for `progress()`; no theming mechanism found. Release date not confirmed.
- Angular 22 (selectorless) is dated May to June 2026 by secondary sources, outside the window; not verified against angular.dev (403).
- Interop 2027: proposals opened 2026-09-03, closed 2026-09-23; the web.dev posts name no CSS proposals. Interop 2026 score pages did not load.
- Vue 3.6 / Vapor: sources conflict (rc.10 on 2026-10-07 versus an unreliable "released" claim); could not determine.

## Claim status

| Claim at risk | Status |
|---|---|
| Not Studied: container style queries | changed: Firefox ships (151, announced 2026-04-13); `attr()` in style queries Firefox 155, 2026-09-01. Still unprobed locally |
| Not Studied: `:has-slotted` | unchanged: MDN limited availability |
| Not Studied: `exportparts` relaying | could not determine: no source found |
| Not Studied: Qwik `useStyles$` | changed: Qwik 2 RC, see item 6 |
| Not Studied: DTCG | changed: draft 2026-09-08, see item 5 |
| Tailwind measured at 4.3.3 | changed: 4.3.4 `@scope` output, 2026-11-02 |
| CSS-CAS-05 `@scope` outranked by layers | unchanged as a spec fact; Tailwind-generated tuples need re-probe |
| Chromium 151 as measurement engine | unchanged in kind; Chrome stable is now 154 or later, Firefox 159 |

## Failed fetches

web.dev Baseline digests for September and October (only August digest exists in the feed as of 2026-09-28); WebKit blog posts (502); Chrome 155 notes (404); Angular blog (403); Interop 2026 and 2027 GitHub pages (503 or empty); caniuse and MDN compat tables (did not render). Interop 2026 progress is therefore could-not-determine.

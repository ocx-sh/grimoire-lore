---
title: "Native widgets first, and the keyboard and name contract when a custom widget is unavoidable"
program: product
sub_program: ux
topic: ux-a11y-authoring
worker: native-widgets-and-keyboard
date_researched: 2026-11-27
model: sonnet
sources_fetched: 23
scope: "Covers: when an agent must use a native HTML element, the ARIA an agent must never write, the keyboard contract for dialog, tabs, combobox, listbox, menu button, disclosure, switch and toolbar, the accessible-name rule for icon controls, links versus buttons, and a measured inventory of custom widgets in ocx-sh/website/packages/theme and grimoire-rs/vscode/src/views (host-side providers) and grimoire-rs/vscode/src/webview (the rendered templates). Does not cover: the wording of names (UX-TEXT), focus styling, page landmarks and headings, colour contrast. Scout rows AX9 to AX13 etc. were not re-read by ID (the topic-map files do not carry those row IDs in a greppable form); the commission text and primary sources were used instead. Repair pass 2026-11-27: ARIA in HTML now read in full, APG Menu fetched, axe-core and eslint-plugin-jsx-a11y rule names fetched, per-widget inventory added."
---

# Native widgets first, and the keyboard and name contract

## Table of contents

1. Summary
2. Findings (1 WebAIM ranking, 2 The ARIA contract, 3 Native-first list, 4 ARIA never-write list, 5 Keyboard contract per pattern, 6 Names and links versus buttons, 7 VS Code webview, 8 Fleet inventory, 9 ocx-theme rows)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Native element first. Missing form labels (51%), empty links (46.3%) and empty buttons (30.6%) are three of the six error categories that make up 96% of detected errors on 1,000,000 home pages ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30, data from February 2026, independent study). All three are authoring faults an agent can prevent mechanically.
- Pages with ARIA averaged 59.1 errors against 42.0 without it; 82.7% of home pages used ARIA (same source). The report says this is a correlation, not proof of cause. The rule for agents still holds: ARIA is a liability unless the pattern needs it.
- "A role is a promise": a role adds no keyboard behaviour or styling, so the author must write all of it ([APG Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)). An agent that writes `role="button"` on a `div` owns Enter, Space, focus order and forced-colours mapping.
- Use `<dialog>` with `showModal()`: the browser gives inert background, top layer, focus into the dialog, and Esc ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), page modified 2026-11-10, Baseline widely available since March 2022).
- Use `popover` and `popovertarget` for non-modal overlays, and `command`/`commandfor` for declarative open and close. Both are Baseline 2025 (Popover since January 2025, Invoker Commands since December 2025; [MDN Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), [MDN Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)). Invoker Commands does not document `aria-expanded` handling; set it yourself.
- Use `<details>`/`<summary>` for disclosure. ARIA in HTML says no role is needed on `summary` and that a redundant `role=button` can cause cross-platform issues ([ARIA in HTML, W3C Recommendation 2026-08-11](https://www.w3.org/TR/html-aria/)).
- Use `<input type="checkbox" role="switch">` for a switch; never `aria-checked` on a native checkbox (MUST NOT, [ARIA in HTML](https://www.w3.org/TR/html-aria/), 2026-08-11).
- Link to go somewhere, button to do something. Never `href="#"`, never `role="link"` on a `div`, never `role="button"` on an `a` ([Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/), undated).
- Icon-only control: visible text is preferred; otherwise visually hidden text or `aria-label`; the icon is `aria-hidden="true"` and `focusable="false"`; the name must start with any visible text (Primer).
- A menu role is for application-style action menus only; a list of navigation links is a disclosure with links, not `role="menu"`. Neither the [APG menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) page nor the [APG menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) page states a rule for when to choose a menu (both read 2026-11-27, Copyright 2026, undated); the "Navigation Menu Button" example is the nearest guidance. The rule is this catalog's decision, not an APG quote.
- Toolbar only for 3 or more controls, with one tab stop and arrow keys inside ([APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/), Copyright 2026, undated).
- Listbox cannot hold interactive children (links, buttons, checkboxes); use grid for that ([APG listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)).
- Measured (section 8, command `/home/mherwig/.cache/research-lang/exemplars/product/scan_wv.py`): the VS Code webview has 72 `<button>` in templates; 6 carry `aria-label`, 46 have text, 19 have no text and only a `title`, 1 has no name at all. `title` does yield a name as the last fallback ([Accname 1.2 Working Draft 2026-11-04](https://www.w3.org/TR/accname-1.2/)) but MDN calls it "highly problematic" for touch and keyboard users ([MDN title](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title), modified 2026-10-01). 4 text inputs and 1 select in the settings view have no label association, 3 `<a href="#">` are buttons in link clothing, and 1 `div role="button" tabindex="0"` has a hand-written Enter/Space handler. The theme has 0 click handlers on non-interactive elements in its sources.
- The `ocx-theme-*` rows that become catalog rules: names required on icon controls, axe with overlays open, no ARIA menu for link lists, native `<details>`. Component names, budgets and Zag mechanics stay in the fleet.

## Findings

### 1. Ranking input: WebAIM Million 2026

Source: [WebAIM Million 2026](https://webaim.org/projects/million/) (independent study of 1,000,000 home pages, updated 2026-03-30, February 2026 crawl).

| Rank | Error | Share of home pages |
|---|---|---|
| 1 | Low contrast text | 83.9% |
| 2 | Missing alternative text | 53.1% |
| 3 | Missing form input labels | 51% |
| 4 | Empty links | 46.3% |
| 5 | Empty buttons | 30.6% |
| 6 | Missing document language | 13.5% |

The six account for 96% of all detected errors. The commission's claim ("missing labels, empty links and empty buttons are three of the six") is confirmed. Contrast and alt text are the other two top items and belong to sibling workers. This worker orders its native-first list by what the three widget-related errors need: label, link, button (section 3).

Percentages are from [WebAIM Million 2026](https://webaim.org/projects/million/) (independent study, updated 2026-03-30). Automated detection finds only part of real failures; the percentage is a floor on problems (the report measures what automation detects; I did not fetch a statement quantifying the undetected share, so no number is claimed).

### 2. The ARIA contract

- The APG states "No ARIA is better than Bad ARIA" and "A role is a promise": assigning `role="button"` to a `div` promises keyboard behaviour the browser will not supply ([APG Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/); page carries only "Copyright 2026", no revision date).
- `aria-label` replaces what assistive technology announces; users hear only the label, not the link text (same page).
- ARIA in HTML ([W3C Recommendation 2026-08-11](https://www.w3.org/TR/html-aria/); previous Recommendation 2021-12-09), read in full across two fetches (characters 0 to 100,000 and 100,000 to 172,550). Authors should not set `role` or `aria-*` values that match implicit semantics. Rows that matter for agents:
  - `button` (implicit `button`): allowed roles checkbox, combobox, gridcell, link, menuitem, menuitemcheckbox, menuitemradio, option, radio, separator, slider, switch, tab, treeitem. So `role="treeitem"` on a `<button>` is allowed; a redundant `role="button"` is not ("Specifying this role is unnecessary", section 3.2).
  - `a` with `href`: allowed button, checkbox, menuitem, menuitemcheckbox, menuitemradio, option, radio, switch, tab, treeitem; `aria-disabled="true"` is NOT RECOMMENDED. So `<a href role="option">` (fleet `CommandPalette.astro`) is permitted by the spec.
  - `a` without `href`: any role, "though generic SHOULD NOT be used"; naming prohibited.
  - `input type=checkbox`: roles menuitemcheckbox, option, switch, or button with aria-pressed; authors MUST NOT use `aria-checked` on it (same MUST NOT for `type=radio`).
  - `details`: only `group`, NOT RECOMMENDED. `summary`: no role when it is the summary of its parent `details`.
  - `dialog`: `alertdialog` allowed; plain `dialog` allowed but NOT RECOMMENDED.
  - `select` (drop-down): `menu` allowed, `combobox` NOT RECOMMENDED.
  - `ul` and `ol`: `list` is the implicit role, so an explicit `role="list"` is redundant; the spec text read says some user agents drop list semantics when markers are removed, and practitioners keep `role="list"` on a styled `ul` (see Contested).
  - Native attribute plus its ARIA twin (`required`/`aria-required`, `readonly`/`aria-readonly`, `placeholder`/`aria-placeholder`, `disabled`/`aria-disabled` on `option`): SHOULD NOT use both; contradicting values MUST NOT.
  - `aria-hidden` (section 4.2): authors MAY use it on elements that allow global ARIA attributes "with the exception of focusable elements and the body element".

### 3. Native-first list, ordered by the WebAIM ranking

Format: use X, never hand-build Y. Percentages: [WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30, independent study.

| Order | Need | Use | Never hand-build | Why |
|---|---|---|---|---|
| 1 | Form field name (RS17 rank 3, 51%) | `<label for>` or wrapping `<label>` around `<input>`, `<select>`, `<textarea>` | `placeholder` as the only name, `aria-label` on an input that has visible text | Visible label gives name, click target and voice control |
| 2 | Navigate (rank 4, 46.3%) | `<a href="real-url">text</a>` | `div`/`span` click handler, `href="#"`, `role="link"`, `location.href` | Primer: links "must" be `a`; ARIA replicas not allowed |
| 3 | Act (rank 5, 30.6%) | `<button type="button">text</button>` | `div role="button" tabindex="0"` plus key handler | A native button supplies Enter, Space, focus, forced-colours |
| 4 | Modal | `<dialog>` + `showModal()` or `command="show-modal"` | `div role="dialog" aria-modal` plus focus trap | Browser supplies inert, top layer, initial focus, Esc ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)) |
| 5 | Non-modal overlay | `popover` + `popovertarget` or `command="toggle-popover"` | `div` with `display` toggled by JS | Top layer, light dismiss, Esc ([MDN Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)) |
| 6 | Show/hide section | `<details><summary>` | `div role="button" aria-expanded` | ARIA in HTML: `role=button` on `summary` redundant |
| 7 | On/off | `<input type="checkbox" role="switch">` with label; or `<button aria-pressed>` for a toggle button | `div role="switch" aria-checked` | APG switch accepts native checkbox using `checked` |
| 8 | Choice from fixed list | `<select>` | `role="combobox"` + `listbox` for fewer than needing filter | Native select gets platform picker and type-ahead |
| 9 | Radio / checkbox group | `<fieldset><legend>` + native inputs | `role="radiogroup"` + divs | Native grouping |
| 10 | Tabular data | `<table>` with `<th scope>` | `div role="grid"` | Native semantics |
| 11 | Lists | `<ul>/<ol>/<li>` | `role="list"`/`listitem` on divs | Native semantics |

Custom widgets (tabs, combobox, menu, listbox, toolbar) have no native element in HTML. Build them only when no row above meets the need, and then follow the keyboard contract in section 5.

### 4. ARIA never-write list, with Detect lines

| # | Never write | Why | Detect |
|---|---|---|---|
| N1 | `role="button"`, `role="link"`, `role="checkbox"`, `role="switch"` on a `div`/`span` | Role is a promise; no behaviour supplied | `grep -rnE '<(div\|span)[^>]*role="(button\|link\|checkbox\|switch)"'`; eslint `jsx-a11y/prefer-tag-over-role` (exists, but is not in the plugin's recommended preset, so enable it explicitly) and axe `aria-allowed-role` (best-practice, minor). axe `nested-interactive` is about controls nested inside controls and does not detect this |
| N2 | click/keydown handler on a non-interactive element | Keyboard and screen reader users cannot reach it | `grep -rnE '<(div\|span\|li\|p)[^>]*(onclick\|on:click\|@click)'`; eslint `jsx-a11y/click-events-have-key-events`, `jsx-a11y/no-static-element-interactions` |
| N3 | A role equal to the implicit role (`<button role="button">`, `<nav role="navigation">`, `<a href role="link">`) | ARIA in HTML: redundant | `grep -rnE '<(button\|nav\|ul\|ol\|img\|header\|footer\|main\|dialog)[^>]* role="(button\|navigation\|list\|img\|banner\|contentinfo\|main\|dialog)"'`; eslint `jsx-a11y/no-redundant-roles`. Exception: `role="list"` on a `ul` with `list-style: none` (documented) |
| N4 | `aria-checked` on `input type=checkbox` | MUST NOT (ARIA in HTML) | `grep -rnE '<input[^>]*type="checkbox"[^>]*aria-checked'` |
| N5 | `aria-label` on an element that already has visible text, when the label does not start with that text | Replaces the name; voice control fails (Primer) | Reading heuristic: pass `<button aria-label="Save draft">Save</button>`; fail `<button aria-label="Submit form">Save</button>` |
| N6 | `href="#"`, `href="javascript:..."` | A button disguised as a link | `grep -rnE 'href="(#\|javascript:[^"]*)"'`; eslint `jsx-a11y/anchor-is-valid` |
| N7 | `role="menu"`/`menuitem` for a list of links or site navigation | Menu role implies application-style arrow-key model; nav lists are disclosure + links (APG menu-button "Navigation Menu Button" example; theme `Menu.astro` rule "disclosure navigation, Tab order, no ARIA menu") | `grep -rn 'role="menu"'` then check items are actions, not `<a href>` |
| N8 | `role="listbox"`/`option` containing links, buttons or checkboxes | APG: listbox gives no accessible way to present interactive children; use grid | `grep -rn 'role="option"'` then inspect children |
| N9 | `aria-modal="true"` on a dialog that does not block outside interaction | APG: can seriously harm some assistive technology users | Reading heuristic: open the dialog, press Tab 10 times, focus must stay inside and the page behind must be inert; [APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) |
| N10 | `aria-hidden="true"` on a focusable element, or on an ancestor of one | Focus lands on a hidden control | axe rule `aria-hidden-focus` ("Ensure aria-hidden elements are not focusable nor contain focusable elements", serious, WCAG 4.1.2 tags) and [ARIA in HTML 4.2](https://www.w3.org/TR/html-aria/) |
| N11 | `aria-disabled="true"` on `a href` | NOT RECOMMENDED (ARIA in HTML); link still navigates | `grep -rnE '<a[^>]*href[^>]*aria-disabled'` |
| N12 | `tabindex` greater than 0 | Breaks natural order | `grep -rnE 'tabindex="?[1-9]'`; axe rule `tabindex` (best-practice, serious); eslint `jsx-a11y/tabindex-no-positive` |
| N13 | `role="toolbar"` on fewer than 3 controls | APG: toolbar only for 3 or more | Count controls in the element; [APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) |
| N14 | `aria-expanded`/`aria-controls` on controls that do not toggle anything | A false state | Reading heuristic: pressing the control must change visible content |
| N15 | A label that changes with state on a switch | APG: "critical" the switch label stays the same | Reading heuristic: pass label "Dark mode"; fail "Turn on dark mode" / "Turn off dark mode" |

Detect-tool provenance (fetched 2026-11-27): axe rule IDs `button-name`, `link-name`, `label`, `label-content-name-mismatch`, `nested-interactive`, `aria-hidden-focus`, `tabindex`, `aria-allowed-role`, `select-name`, `aria-dialog-name` exist in axe-core 4.14.1 ([rule-descriptions.md, raw develop branch](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md); the github.com blob URL returned HTTP 503; the file carries no date). eslint rules `click-events-have-key-events`, `no-static-element-interactions`, `no-noninteractive-element-interactions`, `no-redundant-roles`, `anchor-is-valid`, `interactive-supports-focus`, `tabindex-no-positive`, `label-has-associated-control`, `aria-role` are in the recommended preset, while `prefer-tag-over-role` and `control-has-associated-label` are not ([eslint-plugin-jsx-a11y README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y); the page shows no version or date). The plugin lints JSX; whether it covers `.astro` or lit `html` templates was not verified, so the `grep` commands are the primary check for the fleet.

### 5. Keyboard contract per pattern

Used only when a native element cannot do the job. All from the linked APG page, read 2026-11-27 (each page carries only "Copyright 2026"; no revision date).

| Pattern | Keys | Roles and properties |
|---|---|---|
| Dialog ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)) | Focus moves inside on open; Tab and Shift+Tab cycle within the dialog; Esc closes; focus returns to the opener on close (or a logical element if it no longer exists) | `role="dialog"`, `aria-modal="true"` only if truly modal, `aria-labelledby` the visible title (or `aria-label`); `aria-describedby` optional, omit for structured content. Initial focus: first focusable, or a `tabindex="-1"` static element for long content, or the least destructive action for irreversible steps. The APG page does not mention native `<dialog>` |
| Tabs ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)) | Tab enters the active tab; Left/Right move between tabs and wrap (Up/Down only if vertical); Space/Enter activate unless activation follows focus; Home/End optional; Delete optional | `tablist` (labelled), `tab` with `aria-controls`, active `aria-selected="true"`, `tabpanel` with `aria-labelledby`; roving `tabindex`; panel gets `tabindex="0"` if it holds no focusable first element. Automatic activation only when panels show without noticeable latency |
| Combobox ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)) | Down Arrow into popup; Up optional; Esc dismisses popup; Enter accepts selected suggestion; Alt+Down opens without moving focus (optional) | `role="combobox"` on the input, `aria-expanded`, `aria-controls` (needed while visible), popup `listbox`/`tree`/`grid`/`dialog`, `aria-haspopup` when not listbox, DOM focus stays on the input and `aria-activedescendant` points into the popup, `aria-autocomplete` none/list/both. Select-only variant has no text entry |
| Listbox ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)) | Up/Down move focus; Home/End strongly recommended above 5 options; type-ahead recommended; multi-select Space toggles, Shift+arrows, Ctrl+A | `listbox`, `option` direct children (or inside `group` with a name), `aria-selected` or `aria-checked` not both, `aria-multiselectable`, `aria-setsize`/`aria-posinset` for dynamic loading |
| Menu button ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)) | Enter/Space open and focus first item; Down opens to first, Up opens to last (optional). Keys inside the open menu: next row | Button with `aria-haspopup="menu"`, `aria-expanded`, optional `aria-controls`; container `role="menu"` |
| Menu, open ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/menu/)) | Enter activates the item and closes the menu (opens a submenu and focuses its first item if there is one); Space optional, same, but on `menuitemcheckbox` and `menuitemradio` it toggles without closing; Down/Up move to next/previous item, wrap optional; Home/End move to first/last when wrapping is not supported; printable character moves to the next item starting with it (optional); Esc closes the menu and returns focus to the opener; Tab and Shift+Tab leave the menu, close all menus and do not move among items; Right opens a submenu, Left closes it and returns to the parent item | Roles `menu`/`menubar` with `menuitem`, `menuitemcheckbox`, `menuitemradio`; `aria-labelledby` the controlling button; `aria-orientation` defaults to vertical; `aria-checked` on checkable items; `aria-disabled="true"` items stay focusable; a parent item has `aria-haspopup` and `aria-expanded`. The page states no rule for choosing a menu over other patterns and shows no date |
| Disclosure ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)) | Enter and Space toggle | Button with `aria-expanded`; `aria-controls` optional. Prefer native `<details>` |
| Switch ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)) | Space toggles; Enter optional | `role="switch"` with `aria-checked`; native `input type=checkbox` uses `checked`; label never changes with state; group with `fieldset`/`legend` |
| Toolbar ([APG](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)) | One tab stop; Left/Right (or Up/Down if vertical) move; Home/End optional; wrap optional | `role="toolbar"`, `aria-label` or `aria-labelledby`, `aria-orientation="vertical"` when vertical; only for 3 or more controls; roving tabindex; avoid arrow-key-consuming controls except a last textbox |

### 6. Names, links and buttons

From [Primer links and buttons](https://primer.style/accessibility/design-guidance/links-and-buttons/) (undated; design-system authority, GitHub):

- Link for destination, button for action. Link antipatterns: open a dialog, save, delete, submit. Button antipatterns: navigate, download.
- Name sources in order: visible text, `sr-only` text, `aria-labelledby` to visible text, `aria-label`.
- The name must start with the visible text (voice control).
- Icon-only: visually hidden text plus the icon with `aria-hidden="true"` and `focusable="false"` (SVG), `alt=""` for raster.
- Do not put role words ("tab", "button") or state in names; names unique in lists (ten buttons named "Edit" fail).
- New tab: avoid `target="_blank"`; if needed say so in visible link text.
- Disabled: never disable a link; prefer `aria-disabled="true"` over `disabled` on buttons so they stay focusable, and explain why; never disable submit buttons.

The `title` attribute and names. Primer does not list `title` as a name source. The accessible-name algorithm does use it, as the last fallback: "if the current node has a Tooltip attribute, return its value", only when nothing earlier (labelledby, `aria-label`, native label, content) produced a result ([Accname 1.2, W3C Working Draft 2026-11-04](https://www.w3.org/TR/accname-1.2/), step 2I). Deque's axe `button-name` page lists `<button title="Title"></button>` among passing examples ([Deque, axe 4.14](https://dequeuniversity.com/rules/axe/4.14/button-name), undated), so axe does not flag a title-only button. MDN says the `title` attribute is "highly problematic" for touch-only users, keyboard users, screen reader and magnifier users, and for people with fine motor or cognitive concerns, because of inconsistent support ([MDN title](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title), modified 2026-10-01). Decision: a title-only icon control is named but fragile; this catalog requires `aria-label` or hidden text and detects title-only buttons by grep, not by axe.

### 7. VS Code webview guidance

[VS Code webview UX guidelines](https://code.visualstudio.com/api/ux-guidelines/webviews) (first-party; page dated 11/25/2026 in the fetch): "Ensure your views follow accessibility guidance (color contrast, ARIA labels, keyboard navigation)"; use webviews only when the VS Code API cannot do it; "Use command actions in the toolbar and in the view"; "Ensure all elements in the view are themeable". The page gives no keyboard-specific instruction beyond that sentence. So inside a webview the whole contract of this file applies and there is no framework-provided keyboard layer. Use native controls first because the extension host gives nothing.

### 8. Fleet inventory (measured)

Scope note: the commission named `grimoire-rs/vscode/src/views`. That directory holds the host-side providers (`sidebar.ts`, `details.ts`, `settings.ts` and others). It builds only the page shell in `views/html.ts` (strict CSP, `lang="en"`, `<div id="root">`). Every interactive element is rendered by `grimoire-rs/vscode/src/webview` (`render.ts`, `settings/render.ts`, `details/main.ts`, `sidebar/main.ts`), so the inventory uses `src/webview` and checks `src/views` for markup (`grep -lE '<button|<input|<select|<a ' views/*.ts` returns no file other than the shell).

Commands run in `/home/mherwig/dev/ocx-sh/website/packages/theme/src` and `/home/mherwig/dev/grimoire-rs/vscode/src/webview`. The webview counts come from `/home/mherwig/.cache/research-lang/exemplars/product/scan_wv.py`, which scans every `.ts` file, finds each `<button|input|select|a|summary|vscode-*` open tag with a `${}`-aware tokenizer (so multi-line tags and `=>` inside templates are handled) and classifies it by `aria-label`, body text, `title`.

#### 8.1 Aggregate counts

| Measure | Command (abbreviated) | Theme (`ocx-sh`) | Webview (`grimoire-rs`) |
|---|---|---|---|
| Click handler on non-interactive element | `grep -rnE '<(div\|span\|li\|p)[^>]*(onclick\|on:click\|@click)' .` | 0 | 3 elements carry `data-action` without being a control: `span.revalidate-icon` (`render.ts:1953`), `span.header-repo` (`render.ts:1986`), `div.member-box role=button` (`render.ts:1745`) |
| `role=button\|link\|checkbox\|switch` on `div`/`span` | `grep -rnE '<(div\|span)[^>]*role="(button\|link\|checkbox\|switch)"' .` | 0 | 1 (`render.ts:1745`, conditional: only when `m.repo` is set) |
| Redundant roles | regex for implicit role pairs (N3) | 2 `role="list"` on `ul` (`TileGrid.astro:23`, `ui/TagGroup.astro:97`): the documented list-style exception, not defects | 0 |
| `href="#"` or `javascript:` | `grep -rnE 'href="(#\|javascript:[^"]*)"' .` | 0 | 3, all `<a href="#" data-action=...>` acting as buttons (`render.ts:1408`, `1432`, `1523`) |
| Empty `<a>`/`<button>` with no name at all | theme: `grep -rnE '<(a\|button)[^>]*>\s*</(a\|button)>'`; webview: scan_wv.py class `UNNAMED` | 0 (one-line form only) | 1 `button.chip-remove` (`settings/render.ts:137`, glyph `codicon-close`, no `aria-label`, no `title`) |
| Icon-only button named only by `title` | scan_wv.py class `title-only` | not measured (names enforced by the `label` prop type, see 8.2) | 19 of 72 `<button>` (6 `aria-label`, 46 with text, 19 `title` only, 1 unnamed) |
| `<input>`/`<select>` with no label association | scan_wv.py class `UNNAMED`, then excluding tags wrapped in `<label>` (`settings/render.ts:563,575`) | 0 inspected: `Input.astro` requires `label: string` (`Input.astro:16`) | 4 inputs (`settings/render.ts:102`, `108`, `139`, `487`) and 1 `<select>` (`settings/render.ts:87`); each sits in `div.settings-row` whose title is a `<span class="row-title">` with no `for`/`aria-labelledby` |
| `tabindex` greater than 0 | `grep -rnE 'tabindex="?[1-9]'` | 0 | 0 |
| `role="menu"` | `grep -rn 'role="menu'` | 0 | 0 (menus are `div.card-menu` of `button.menu-item`, no `aria-haspopup`; `grep -c aria-haspopup render.ts sidebar/main.ts details/main.ts` gives 0, 0, 0) |
| `aria-checked` on native checkbox | `grep -rnE '<input[^>]*checkbox[^>]*aria-checked'` | 0 | 0 |
| Native `<dialog>` | `grep -c '<dialog'` | 0 in `Dialog`, `AlertDialog`, `ConfirmDialog`, `Drawer`; `@zag-js/dialog` 1.44.0 dist contains `trapFocus`, `ariaHidden`, `aria-modal`, `role: "dialog"` and no `showModal` (`grep -ohE 'showModal\|aria-modal\|trapFocus\|ariaHidden' dist/*.mjs`) | not applicable |
| Native popover / invoker | `grep -rn 'commandfor\|popovertarget' components` | 13 hits: `Breadcrumbs`, `Menu`, `SiteHeader`, `EcosystemMenu`, `Tooltip`, `Popover` | not applicable |
| `<img>` without `alt` | `grep -rnP '<img(?![^>]*\balt)'` | 3 hits: 2 comments, 1 multi-line tag (`LogoTile.astro:46`) not inspected, not counted | not measured |
| Third-party web components | `grep -rhoE '<vscode-[a-z-]+' .` | not applicable | `vscode-button` 4, `vscode-checkbox` 4, `vscode-progress-bar` 2, `vscode-progress-ring` 2, `vscode-icon` 1, `vscode-radio` 1, `vscode-radio-group` 1, `vscode-textfield` 1 (`@vscode-elements/elements` 2.5.1, `package.json`) |

The diagnosis "the fleet ships many hand-built widgets without names" is half right. The theme types names in (`label` props, `iconOnly` requires `aria-label`: `ToggleButton.astro:18`) and has no non-interactive click handlers. The webview has the defects: 19 title-only icon buttons, 1 unnamed button, 5 unlabelled settings controls, 3 `href="#"`, 1 `div role="button"`, and menus that are not exposed as menus or as disclosures. An earlier version of this file reported 29 title-only buttons; that figure counted buttons that also have text. The corrected figure is 19.

#### 8.2 Per-widget inventory, ocx-sh theme

Source: the `.astro` and `.mjs` files named in each row (read for markup, `role`, `aria-*` and `keydown` handlers) plus a key-name grep of `@zag-js/<machine>` 1.44.0 `dist/*.mjs` in `packages/theme/node_modules/@zag-js` (`grep -rhoE '(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|Escape|Enter|Space|Tab|PageUp|PageDown|Backspace|Delete)\b'`). The key grep proves the machine references those keys; it is not a conformance run, and `End` also matches non-key text in several machines. Rows for Zag-backed widgets say "Zag" because Zag generates the roles through `api.get*Props()`.

| Widget (file) | Element | Role | Name source | Keyboard handling |
|---|---|---|---|---|
| Dialog, AlertDialog, ConfirmDialog (`ui/Dialog.astro`, `dialog.zag.mjs`) | `div` content in a positioner | `dialog` (`alertdialog` for AlertDialog), `aria-modal` from Zag | `aria-labelledby` the title id (`dialog.zag.mjs:21`); close button `aria-label="Close"` (`dialog.zag.mjs:24`) | Zag dialog: Esc, focus trap, siblings `aria-hidden`; not native `<dialog>` |
| Drawer (`ui/Drawer.astro`) | `div` on Zag drawer | Zag | close `Button iconOnly aria-label="Close"` (`Drawer.astro:58`) | Zag drawer: Esc |
| Popover (`ui/Popover.astro`) | Zag popover | Zag | trigger text; not inspected further | Zag popover: Esc |
| Menu (`ui/Menu.astro`) | `<nav popover aria-label>` holding `ul > li > a[href]`; trigger `Button popovertarget` | none (comment `Menu.astro:3-4`: disclosure navigation, not `role=menu`) | `aria-label={label}` on the nav, trigger text | native popover: Tab order, light dismiss, Esc |
| ActionMenu (`ui/ActionMenu.astro`) | Zag menu; context target `div tabindex="0"` (`ActionMenu.astro:62`) | `menu`, `menuitem` from Zag | `aria-label` when `context` (`ActionMenu.astro:45`) | Zag menu: Enter, Space, Arrows, Home, End, Tab |
| EcosystemMenu, SiteHeader (`EcosystemMenu.astro`) | `<nav popover>` with `ul > li > a` | none | nav named by its trigger via `aria-labelledby` from Zag navigation-menu (`EcosystemMenu.astro:38`); column links `aria-label` (`:69`) | popover without JS; Zag navigation-menu with JS |
| Tabs, TabItem (`Tabs.astro:61-63`) | Zag `button` triggers in a `div` list | `tablist`, `tab`, `tabpanel` from Zag | trigger content | Zag tabs: Arrows, Home, End |
| Combobox (`ui/Combobox.astro`) | `<input>` + `ul` content; clear `Button iconOnly` (`:111`) | Zag combobox, listbox | `label` via `Input`; clear button `aria-label` | Zag combobox: Arrows, Home, End, Enter, Esc |
| CommandPalette (`ui/CommandPalette.astro`, `command-palette-session.mjs`, `command-palette.mjs`) | `<input role="combobox">` (`:113`), `ul role="listbox"` (`:137`), results `<a href role="option">`, status `p role="status"` | combobox, listbox, option | input `aria-label={label}`, listbox `aria-label={resultsLabel}`, trigger `aria-label` + `aria-haspopup="dialog"` + `aria-expanded` (`:85-87`), close `aria-label={closeLabel}` | hand-written ArrowDown/ArrowUp with wrap and Enter (`command-palette-session.mjs:188-192`); open with Ctrl or Cmd+K and `/` (`command-palette.mjs:81-85`); dialog Esc from Zag. No Home/End |
| Select (`ui/Select.astro`) | `<button>` trigger + visually hidden native `<select>` | Zag select | `label` prop | Zag select: Enter, Space, Arrows, Home, End |
| List (`ui/List.astro`) | Zag listbox / async-list; status `p role="status"` | listbox | `label` | Zag listbox: Arrows, Home, End, Space, Enter, Esc |
| Choice: checkbox, radio, switch (`ui/Choice.astro:45-67`) | native `<input>` inside `<label>` | native; `role="switch"` when `type==='switch'` (`:62`), no `aria-checked` | text in the wrapping `<label>` | native |
| RadioGroup (`ui/RadioGroup.astro`) | hidden native radio inputs on Zag | `radiogroup` | `label` prop is the group name (`RadioGroup.astro:19`) | Zag radio-group |
| Slider (`ui/Slider.astro`) | hidden `<input>` per thumb on Zag | `slider` | `label` prop; `aria-label` for multiple thumbs (`:68`) | Zag slider: Arrows, Home, End, PageUp, PageDown (plus `slider.zag.mjs:43` handler) |
| ToggleGroup (`ToggleGroup.astro`) | `<button>` per item | `group` with `aria-pressed` buttons, or radio group | group `aria-label={label}` (`:25`); icon-only items `aria-label` (`:62`) | Zag toggle-group: Arrows, Home, End, Tab |
| ToggleButton (`ui/ToggleButton.astro`) | native `<button aria-pressed>` | button (pressed) | text, or `iconOnly` type requires `aria-label` (`:18`) | native |
| CycleButton (`ui/CycleButton.astro`) | native `<button>` | button | `aria-label` = `${label} (click for ${next})` (`:60`): the name changes with state | native |
| Accordion, Collapsible (`AccordionItem.astro`, `Collapsible.astro`) | `<button>` trigger on Zag; native `<details>` for the no-JS case | Zag accordion/collapsible | trigger text | Zag accordion: Arrows, Home, End |
| Tooltip, Hint (`Tooltip.astro:21-24`, `ui/Hint.astro`) | `<button aria-describedby>` + `<span popover="manual" role="tooltip">` | `tooltip` | trigger text or `aria-label` (Hint requires one `<button>` or `<a>`, `Hint.astro:40`) | Esc closes (`tooltip.mjs:111-112`) |
| Tree, TreeView (`Tree.astro`, `tree-view.zag.mjs`) | `summary`/rows | Zag tree-view | node text | Esc clears, Enter and Space select (`Tree.astro:41-46`); Zag tree-view: Arrows, Home, End |
| TagGroup, Tag, TagsInput (`ui/TagGroup.astro:97`, `ui/Tag.astro:49`, `ui/TagsInput.astro`) | `ul role="list" tabindex="-1"`; remove `<button>`; Zag tags-input | list (the styled-list exception) | `aria-labelledby={labelId}`; remove button `aria-label={removeLabel}` | Backspace and Delete remove a tag (`tag-group.mjs:34`); Zag tags-input: Enter, Esc, Delete, Backspace, Arrows |
| SearchField (`ui/SearchField.astro:34-47`) | `<input type="search">` in a `Label` group | native | `Label`; clear `aria-label` | Esc clears (`search-field.mjs:24`) |
| Input, number stepper (`ui/Input.astro:82-89`) | native `<input>` + two `Button iconOnly` | native | required `label: string` prop; stepper `aria-label="Decrease"` / `"Increase"`, `tabindex=-1` | native arrow keys on `type=number` |
| DataTable (`ui/DataTable.astro:94-109`) | `<button data-ocx-sort>` in `th`; scroll `div` | `region`, `aria-sort` on the header | `aria-label={caption}` on the region | native buttons; region `tabindex="0"` |
| Breadcrumbs (`ui/Breadcrumbs.astro:41-47`) | `<nav>`; overflow `<button popovertarget>` | `navigation` | `aria-label={label}`; `aria-label="Show N more"` | native popover |
| Pagination, Toc (`pagination.zag.mjs:26`, `Toc.astro:36-48`) | `<a>` | disabled link: `role="link"` + `aria-disabled="true"` | link text | native links; Esc closes the mobile `<details>` (`toc-elements.mjs:61-62`) |
| Terminal controls (`Terminal.astro:107-118`) | `Button iconOnly`, `<input type="range">` | button, slider | `aria-label="Play"`, `aria-label="Seek"` | native |
| Not inspected: Toast, Clipboard, CopyButton, CopyMenu, Sidebar, Popover internals | | | | name and key behaviour not read |

#### 8.3 Per-widget inventory, VS Code webview

Source: `grimoire-rs/vscode/src/webview` (read for each element named). No framework keyboard layer exists in a webview; all keys are hand-written in `sidebar/main.ts`, `details/main.ts`, `settings/main.ts`.

| Widget (file:line) | Element | Role | Name source | Keyboard handling |
|---|---|---|---|---|
| Result tree (`render.ts:1019`, `:927`, `:627`) | `div role="tree"` > `button.tree-node role="treeitem" aria-expanded`; group header `button aria-expanded` | `tree`, `treeitem` (allowed on `button` per ARIA in HTML) | tree `aria-label`; node text | roving `tabindex` (`sidebar/main.ts:993-1000`); Left/Right expand and move (`treeKeyAction`, `main.ts:1066`); Up/Down/Home/End/PageUp/PageDown (`navTarget`, `model.ts:2046`); Enter/Space native on buttons |
| Card and compact row (`render.ts:483`, `:601`) | `div` | `article` when in a windowed list, `aria-setsize`, `aria-posinset`, `aria-level` | `aria-label` from `rowLabel(...)` | `tabindex` from the row model; Enter and Space open details (`main.ts:1055`) |
| Split install button (`render.ts:320`, `:1550`, `:1563`, `:1586`, `:1598`) | two `<button>`: `split-main` (text) + `split-arrow` | button | arrow: `title` only ("Install options", "More options") | native Enter/Space; no `aria-haspopup` or `aria-expanded` |
| Card menu, context menu, scope menu (`render.ts:343-364`, `:1611`; `sidebar/main.ts:973`; `details/main.ts:82-86`) | `div.card-menu` of `button.menu-item`; separators `div.menu-separator` | none | item text | Esc closes (`sidebar/main.ts:982-987`, `details/main.ts:362`); closes on window blur; no arrow keys, no focus move on open, Tab walks the buttons |
| Icon buttons (`render.ts:334`, `:465`, `:532`, `:551`, `:594`, `:1611`, `:1987`, `:1990`; `settings/render.ts:71`, `:231`, `:232`, `:241`, `:246`, `:430`) | `<button><span class="codicon ...">` | button | `title` only (19 buttons in total with the split arrows) | native |
| Chip remove (`settings/render.ts:137`) | `<button><span class="codicon-close">` | button | none | native |
| Member box (`render.ts:1745`; `details/main.ts:366-380`) | `div.member-box` | `role="button"` when `m.repo`, `tabindex="0"` | inner text | hand-written Enter and Space call `click()` with `preventDefault` |
| Filter chips and tabs (`render.ts:642`, `:1252`, `:1836`; `settings/render.ts:120`, `:684`) | `<button aria-pressed>` | toggle button; the "tabs" are `aria-pressed` buttons, not `role="tab"` | text | native buttons, Tab between them, no arrow keys |
| Detail tabs (`render.ts:2007-2033`) | `<button class="tab" data-tab>`; disabled ones use native `disabled` + `title` | none (no `tablist`, no `aria-selected`) | text | native buttons |
| Sort control (`render.ts:1117-1119`) | `div role="group" aria-label` + `<button aria-label title aria-disabled>` + `<select aria-label="Sort by">` | group | `aria-label` on each | native |
| Search (`render.ts:1146`) | `<vscode-textfield placeholder>` + `<vscode-icon label="Clear search">` | library | placeholder; no `aria-label`/`label` attribute on the textfield. Whether `@vscode-elements/elements` 2.5.1 maps the placeholder to a name was not verified | library |
| Settings controls (`settings/render.ts:84-110`, `:139`, `:487`) | `<select>`, `<input type=text>`, `<input type=number>`, chip `<input>` | native | none: 5 controls without label association (title in `span.row-title`); `:494` has `aria-label="Add ${field} pattern"`, `:565` and `:577` sit in `<label>` | native |
| Toggles and radios (`settings/render.ts:79-82`, `:428`, `:570`) | `<vscode-checkbox toggle>`, `<vscode-radio-group aria-label="Registry type">` | library renders inner `role="switch"` (source comment, not verified in the library) | text, `aria-label` | library |
| Resource links (`render.ts:1408`, `:1432`, `:1523`) | `<a href="#" data-action>` | link | text | native; activation by script, URL does not load without script |
| Status (`render.ts:1219-1221`) | `div role="status" aria-live`, `span role="alert"` | status, alert | text | none |

### 9. Which `ocx-theme-*` rows are absorbed into the catalog

From `/home/mherwig/dev/ocx-sh/website/skills/ocx-theme-*` (157,752 B across six skills, per the config-inventory audit):

| Row | Absorb? | Reason |
|---|---|---|
| Accessible name required on every icon-only control (`ocx-theme-components/SKILL.md:39`, `ocx-theme-icons`) | Yes, as UXA-NAME rule | Generic; matches RS17 empty-button error |
| axe run on each page with menus and dialogs open, any violation blocks (`ocx-theme-quality/SKILL.md:27`) | Yes, as the verification for the whole set | Generic and tool-neutral if reworded |
| Menu is disclosure navigation with links, no ARIA menu (`overlays-disclosure.md:87-88`) | Yes (N7) | Generic |
| Native `<details>` where no JS is needed (`SKILL.md:148`) | Yes | Generic |
| `aria-disabled` on a link drops `href` (`actions-forms.md:20`) | Yes, with the Contested note | Matches ARIA in HTML; differs from Primer |
| `variant="primary"` once per view, `Hint` around an icon button | No | Brand and component API |
| Zag lazy hydration, DOM and byte budgets, Lighthouse 100 | No | One theme's calibration (config-inventory audit line 392) |
| Component names (`ui/Button.astro` etc.) | No | Fleet-specific |

## Normative guidance candidates

Each rule: imperative, rationale with its source link and the date the source states, severity, verification. Short names: WebAIM = [WebAIM Million 2026](https://webaim.org/projects/million/) (updated 2026-03-30, independent study); AIH = [ARIA in HTML](https://www.w3.org/TR/html-aria/) (W3C Recommendation 2026-08-11); APG pages carry only "Copyright 2026".

1. **UXA-NAT-01 (MUST)** Use a native `<button type="button">` for every action and a native `<a href>` with a real URL for every navigation. Rationale: empty links on 46.3% and empty buttons on 30.6% of 1,000,000 home pages ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30). Verify: `grep -rnE '<(div|span)[^>]*(onclick|on:click|role="(button|link)")'` returns 0; eslint `jsx-a11y/click-events-have-key-events` and `jsx-a11y/no-static-element-interactions` ([rule list](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), recommended preset) on JSX; `jsx-a11y/prefer-tag-over-role` must be enabled by hand.
2. **UXA-NAT-02 (MUST)** Give every `<input>`, `<select>`, `<textarea>` a programmatic label, preferably a visible `<label>`. Rationale: 51% of home pages have a missing form label ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30); placeholder is not a label. Verify: axe `label` and `select-name` ("Ensure every form element has a label", critical; [axe-core 4.14.1 rule list](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md), undated); `grep` each `<input` for a matching `label for`, a wrapping `<label>`, `aria-label` or `aria-labelledby`; in the webview `python3 -I scan_wv.py` class `UNNAMED` for inputs must be 0 after excluding `<label>`-wrapped tags.
3. **UXA-NAT-03 (MUST)** Open modal dialogs with `<dialog>` and `showModal()` (or `command="show-modal"` with `commandfor`). Rationale: the browser supplies inert background, top layer, initial focus and Esc ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), modified 2026-11-10, Baseline widely available since March 2022). Verify: `grep -rnE 'role="(dialog|alertdialog)"'` appears only with a documented reason; open, Tab 10 times, Esc, check focus returns to the opener. A library dialog (the fleet's Zag dialog does not call `showModal`) is acceptable only when that Tab, Esc and focus-return check passes.
4. **UXA-NAT-04 (SHOULD)** Use `popover` and `popovertarget` or `command="toggle-popover"` for non-modal overlays. Rationale: top layer and light dismiss without a script ([MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), Baseline 2025, page undated in the fetch). Verify: no `div` toggled by `style.display` in the overlay code path; with `command`, confirm `aria-expanded` is set by hand because [MDN Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) (modified 2026-01-19) states no ARIA behaviour. Check the project's browser-support policy first; Invoker Commands is Baseline only since December 2025.
5. **UXA-NAT-05 (MUST)** Use `<details><summary>` for show/hide content when no script behaviour is needed. Rationale: AIH ([2026-08-11](https://www.w3.org/TR/html-aria/)) lists no role for `summary` of its `details` and calls `role=button` redundant; `details` accepts only `group`, NOT RECOMMENDED. Verify: `grep -rnE '<summary[^>]*role='` returns 0 and `grep -rnE '<details[^>]*role='` returns 0.
6. **UXA-NAT-06 (MUST)** Implement a switch as `<input type="checkbox" role="switch">` with a label, never with `aria-checked`. Rationale: AIH ([2026-08-11](https://www.w3.org/TR/html-aria/)) says authors MUST NOT use `aria-checked` on `input type=checkbox`; the [APG switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) page accepts a native checkbox and says the label must not change with state. Verify: `grep -rnE '<input[^>]*checkbox[^>]*aria-checked'` returns 0; label text identical in both states.
7. **UXA-ARIA-01 (MUST)** Do not write a `role` equal to the element's implicit role. Rationale: AIH section 3.2 and the redundant-role note, [W3C Recommendation 2026-08-11](https://www.w3.org/TR/html-aria/). Verify: pattern N3 grep or `jsx-a11y/no-redundant-roles` ([recommended preset](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)); axe `aria-allowed-role` (best-practice, minor; [axe-core 4.14.1](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)). Exception: `role="list"` on a `ul` whose markers are removed.
8. **UXA-ARIA-02 (MUST)** If a custom widget is unavoidable, implement the full APG keyboard contract in section 5 and state in the PR which native element was rejected and why. Rationale: "ARIA roles do not cause browsers to provide keyboard behaviors or styling" ([APG Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), Copyright 2026, undated). Verify: a test that sends each documented key and asserts focus and state (tabs: Left, Right, Home, End, Tab into the panel; menu: Down, Up, Esc returns focus to the opener, Tab closes).
9. **UXA-ARIA-03 (MUST NOT)** Do not use `role="menu"`/`menuitem` for navigation links; use a disclosure button with links. Rationale: the [APG menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) keyboard model (Down/Up move, Tab leaves and closes, character jump) is an application-menu model, and the fleet's own theme rule makes link lists disclosure navigation (`Menu.astro:3-4`); the APG gives no explicit rule, so this is a catalog decision (Copyright 2026, undated). Verify: `grep -rn 'role="menu"'` then check that every item is an action, not `<a href>`.
10. **UXA-ARIA-04 (MUST NOT)** Do not put interactive children inside `role="option"`. Rationale: the [APG listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) page (Copyright 2026, undated) says a listbox gives no accessible way to present interactive children; use grid. An `<a href role="option">` where the link itself is the option is allowed by AIH ([2026-08-11](https://www.w3.org/TR/html-aria/)). Verify: `grep -rn 'role="option"'` then inspect children.
11. **UXA-ARIA-05 (MUST)** Set `aria-modal="true"` only on a dialog that is actually modal. Rationale: [APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (Copyright 2026, undated) warns that a wrong value can harm assistive-technology users; `showModal()` sets it ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), modified 2026-11-10). Verify: N9 heuristic.
12. **UXA-ARIA-06 (MUST NOT)** Do not put `aria-hidden="true"` on or around a focusable element. Rationale: AIH 4.2 excludes focusable elements ([2026-08-11](https://www.w3.org/TR/html-aria/)). Verify: axe `aria-hidden-focus` (serious; [axe-core 4.14.1](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)).
13. **UXA-ARIA-07 (SHOULD)** Use `role="toolbar"` only for 3 or more controls, with one tab stop and a roving tabindex. Rationale: the [APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) page (Copyright 2026, undated) says to use it "only if the group contains 3 or more controls". Verify: count controls in the element; Tab leaves the toolbar in one press.
14. **UXA-ARIA-08 (MUST)** A hand-built menu implements the open-menu keys: Down/Up move, Esc closes and returns focus to the opener, Tab closes all menus without moving among items, Enter activates and closes, and the button has `aria-haspopup="menu"` and `aria-expanded`. Rationale: [APG menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) and [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) (Copyright 2026, undated). A group of buttons that pops open without these keys is a disclosure, not a menu: do not give it `role="menu"`. Verify: key-sending test from UXA-ARIA-02; `grep -c aria-expanded` on the trigger code. Fleet baseline: the webview card menu fails this (section 8.3).
15. **UXA-NAME-01 (MUST)** Give every icon-only control an accessible name by visually hidden text or `aria-label`, and mark the icon `aria-hidden="true"` (SVG also `focusable="false"`). Rationale: empty buttons on 30.6% of home pages ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30); [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/) (undated) gives this recipe; `title` is only the last fallback in the name algorithm ([Accname 1.2 Working Draft 2026-11-04](https://www.w3.org/TR/accname-1.2/), step 2I) and MDN calls it "highly problematic" for touch and keyboard users ([MDN title](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title), modified 2026-10-01). Verify: axe `button-name`, `link-name` (critical and serious, WCAG 4.1.2; [axe-core 4.14.1](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)); axe passes a title-only button, so also run `python3 -I scan_wv.py` style detection or `grep -oE '<button[^>]*>' | grep -v aria-label` and inspect each remaining button for text content. Title-only is a finding, not a pass.
16. **UXA-NAME-02 (MUST)** When a control has visible text, the accessible name must start with that text. Rationale: voice control ([Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/), undated). Verify: axe `label-content-name-mismatch` (serious, WCAG 2.5.3, exists in [axe-core 4.14.1](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)) or the N5 pass/fail heuristic.
17. **UXA-NAME-03 (SHOULD)** Names for repeated controls are unique in context ("Edit settings", not ten "Edit"). Rationale: [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/) (undated). Verify: collect all names from the accessibility tree and flag duplicates among peers. Fleet baseline: `grep -rn 'title="Manage"' src/webview | wc -l` gives 3 and `grep -rn 'title="More options"' src/webview | wc -l` gives 3 identically named icon buttons (section 8.3).
18. **UXA-LINK-01 (MUST)** Link when the control goes somewhere, button when it does something; no `href="#"`. Rationale: [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/) (undated). Verify: N6 grep returns 0 (fleet baseline: 3 hits in the webview); `jsx-a11y/anchor-is-valid` ([recommended preset](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)); each `<a>` has a URL that loads without script.
19. **UXA-LINK-02 (SHOULD)** Do not disable links. If a navigation target is unavailable, remove the control or render it as text with an explanation. Rationale: [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/) (undated); AIH says `aria-disabled="true"` on `a href` is NOT RECOMMENDED ([2026-08-11](https://www.w3.org/TR/html-aria/)). Verify: `grep -rnE '<a[^>]*aria-disabled'` returns 0 (see Contested for the O'Hara variant).
20. **UXA-BTN-01 (SHOULD)** Prefer `aria-disabled="true"` over `disabled` on buttons that a user may need to discover, and explain why in nearby text; never disable a submit button. Rationale: [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/) (undated), one design-system view (see Contested). Verify: search `<button[^>]*disabled` on form submit; confirm a visible reason exists. Needs handler code that blocks activation, because `aria-disabled` does not.
21. **UXA-TEST-01 (MUST)** Run an automated accessibility engine (axe or equivalent) with menus, popovers and dialogs open and treat violations as failures. Rationale: label, link and button name errors are automatically detectable and are three of six categories making 96% of errors ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30). Verify: CI log shows the engine ran against open overlay states (fleet precedent `ocx-theme-quality/SKILL.md:27`).
22. **UXA-WEBVIEW-01 (MUST)** Inside a VS Code webview, apply rules UXA-NAT-01 to UXA-LINK-02 in full; add commands for actions that the VS Code command system can host. Rationale: the guideline asks for ARIA labels and keyboard navigation and supplies no framework layer ([VS Code webview UX guidelines](https://code.visualstudio.com/api/ux-guidelines/webviews), page dated 11/25/2026 in the fetch). Verify: the grep checks above on the webview source; `python3 -I scan_wv.py` classes `UNNAMED` and `title-only` are both 0 (fleet baseline: 1 and 19).

## Dated facts

| Fact | Source and URL | Source date | Type |
|---|---|---|---|
| 1,000,000 home pages analysed; low contrast 83.9%, missing alt 53.1%, missing form labels 51%, empty links 46.3%, empty buttons 30.6%, missing language 13.5%; six categories are 96% of errors | [WebAIM Million](https://webaim.org/projects/million/) | updated 2026-03-30; data February 2026 | Independent study |
| 82.7% of home pages used ARIA (excluding landmarks); 133,589,803 ARIA attributes; pages with ARIA averaged 59.1 errors vs 42 without; report states correlation is not causation | same | same | Independent study |
| ARIA in HTML is a W3C Recommendation; earlier Recommendation 2021-12-09; latest change listed 2025-09-22 | [W3C ARIA in HTML](https://www.w3.org/TR/html-aria/) | 2026-08-11 | Authority |
| MUST NOT use `aria-checked` on `input type=checkbox`; NOT RECOMMENDED `aria-disabled` on `a href` | same | 2026-08-11 | Authority |
| `<dialog>` Baseline widely available since March 2022; `showModal()` exposes `aria-modal="true"`; Esc closes a modal; `closedby` attribute values any / closerequest / none | [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | page modified 2026-11-10 | Reference (MDN) |
| Popover API Baseline 2025, available since January 2025; always non-modal | [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) | undated in fetch | Reference |
| Invoker Commands Baseline 2025, available since December 2025; built-in commands seen: `toggle-popover`, `hide-popover`, `show-modal`, `close`; custom commands start with `--`; page states nothing about ARIA | [MDN Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) | page modified 2026-01-19 | Reference |
| APG patterns: dialog, tabs, combobox, menu button, disclosure, switch, toolbar, listbox keyboard and roles (section 5) | [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) pages linked in section 5 | footer "Copyright 2026"; no revision date | Authority |
| Toolbar "only if the group contains 3 or more controls" | [APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | undated | Authority |
| VS Code webview guideline text on accessibility, themeability and when to use webviews | [VS Code](https://code.visualstudio.com/api/ux-guidelines/webviews) | dated 11/25/2026 on the fetched page | Platform |
| ARIA in HTML read in full (172,550 characters, two fetches): `button` allows `treeitem`, `tab`, `switch` and others; `ul`/`ol` `list` role redundant; `aria-hidden` excludes focusable elements | [W3C ARIA in HTML](https://www.w3.org/TR/html-aria/) | 2026-08-11 | Authority |
| APG Menu pattern: keys in an open menu; no statement on choosing a menu over other patterns | [APG menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) | footer "Copyright 2026"; no revision date | Authority |
| Accessible name computation, step 2I: tooltip attribute is the last fallback | [Accname 1.2](https://www.w3.org/TR/accname-1.2/) | Working Draft 2026-11-04 (not a Recommendation) | Authority (draft) |
| `title` attribute "highly problematic" for touch, keyboard, screen reader, magnifier users | [MDN title](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title) | modified 2026-10-01 | Reference (MDN) |
| axe-core 4.14.1 rules: `button-name` critical, `link-name` serious, `label` critical, `label-content-name-mismatch` serious, `nested-interactive` serious, `aria-hidden-focus` serious, `tabindex` serious (best-practice), `aria-allowed-role` minor (best-practice) | [axe-core rule-descriptions.md](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md) | undated; develop branch, `package.json` version 4.14.1 | Vendor tool documentation (Deque) |
| Deque `button-name` page lists `<button title="Title"></button>` among passing examples | [Deque University](https://dequeuniversity.com/rules/axe/4.14/button-name) | undated | Vendor data (Deque) |
| eslint-plugin-jsx-a11y: `prefer-tag-over-role` and `control-has-associated-label` are not in the recommended preset; the other rules named in section 4 are | [README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | no version or date shown | Community tool documentation |
| `@zag-js/dialog` 1.44.0 uses `role: "dialog"`, `aria-modal`, `trapFocus`, `ariaHidden`, no `showModal` | `packages/theme/node_modules/@zag-js/dialog/dist/*.mjs`, command in section 8.1 | installed version 1.44.0 | Local measurement |
| Primer links and buttons rules | [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/) | undated | Design-system authority (GitHub) |
| Disabled-link technique `role="link"` + `aria-disabled` without `href` | [Scott O'Hara](https://www.scottohara.me/blog/2021/05/28/disabled-links.html) | published 2021-05-28, updated 2022-01-29 | Independent practitioner (editor of ARIA in HTML) |

## What an agent must not decide alone

- Whether a keyboard shortcut (for example Ctrl/Cmd+K, `/`) may be bound globally: conflicts with browser, screen reader and VS Code keybindings are a product decision. Ask.
- Whether to drop support for browsers without Invoker Commands (Baseline since December 2025) or Popover: a browser-support policy is the owner's. Ask before removing a fallback.
- Whether a disabled-looking control may be disabled at all (Primer: only when the user can fix the cause): the product's flow decides. Ask when the cause is not obvious.
- Whether to replace an existing custom widget with a native one when that changes the brand look: a brand decision. Propose, do not apply.
- Whether to claim conformance (WCAG level, VPAT, "accessible") in copy: a legal decision. Never write the claim.
- Whether a custom widget is justified when no native element fits: write the reasoning in the PR, and ask if the widget is new to the product.

## AI-agent angle

| Likely mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| `<div class="btn" onClick=...>` or `<div role="button" tabindex="0">` | Common in training data | N1/N2 greps; `jsx-a11y/no-static-element-interactions` |
| Adds `role="button"` to `<button>`, `role="navigation"` to `<nav>` | "Make it accessible" reflex | N3 grep |
| `aria-label` on everything, including elements with visible text | Treats ARIA as the accessibility step | N5 heuristic; axe `label-content-name-mismatch` |
| Icon button named only by `title` | Looks right in a hover test, and axe `button-name` passes it | UXA-NAME-01 grep: buttons without `aria-label` and without text; the webview has 19 |
| `aria-hidden` on a decorative wrapper that contains a link | Copy of icon pattern | axe `aria-hidden-focus` |
| Writes a focus trap with `keydown` for a `div` dialog | Pre-`<dialog>` idiom | `grep -rn 'role="dialog"'` and `grep -rn 'focus-trap\|focusTrap'` |
| `role="menu"` on a site nav dropdown | Menu names in design systems | N7 |
| `href="#"` on a control that opens something | Old jQuery idiom | N6; the webview has 3 |
| Opens a custom "menu" as a `div` of buttons, no `aria-expanded`, no arrow keys, no focus move | Looks like a menu, skips the Menu keyboard contract | UXA-ARIA-08 key-sending test; `grep -c aria-expanded` on the trigger |
| Writes a label-less `<input>` in a settings row with the title in a `<span>` | Title and control are visually adjacent | axe `label`; scan_wv.py class `UNNAMED` |
| `aria-checked` on a native checkbox switch | Copies the div-switch recipe | N4 |
| Adds `aria-expanded` to a `commandfor` button and forgets to update it | Invoker Commands is new and its page says nothing about ARIA | Test: after click, `aria-expanded` flips |
| Hallucinated attributes, for example `popover="modal"`, `role="modal"`, `aria-role` | Plausible names | HTML validator (`html-validate`/Nu checker) |

## Contested / evolving

- **Disabled links.** Primer: never disable a link or remove its `href` ([Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/)). ARIA in HTML: to communicate a disabled link remove `href`, and `aria-disabled` on `a href` is NOT RECOMMENDED ([W3C](https://www.w3.org/TR/html-aria/), 2026-08-11). Scott O'Hara: removing `href` and adding `role="link"` plus `aria-disabled="true"` is the way when you must, but he regards disabling links as probably not a good idea ([2021-05-28, updated 2022-01-29](https://www.scottohara.me/blog/2021/05/28/disabled-links.html)). The fleet's `Link.astro` does the O'Hara technique. Decision here: default to not disabling (UXA-LINK-02); where the fleet component does, it is consistent with the W3C text.
- **`aria-disabled` versus `disabled` on buttons.** Primer prefers `aria-disabled` so the button stays focusable; native `disabled` is what ARIA in HTML and most reference text assume for native buttons (the search snippet for O'Hara's page said "for native buttons use the disabled property"; I did not fetch a second source). Treat Primer's position as one credible design-system view; the rule is SHOULD for that reason.
- **`title` as an accessible name.** The name algorithm accepts it as the last fallback ([Accname 1.2 Working Draft 2026-11-04](https://www.w3.org/TR/accname-1.2/)) and axe passes it ([Deque](https://dequeuniversity.com/rules/axe/4.14/button-name)); MDN calls it "highly problematic" for touch, keyboard and assistive-technology users ([MDN title](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title), 2026-10-01). Decision: title-only icon controls are findings, because the names are not available on touch or by keyboard; the catalog's verification is a grep, not axe. The accname document is a Working Draft, so the fallback order may change.
- **Menu versus disclosure for action groups.** No APG page says when to choose `role="menu"`; teams split between menu semantics for any popup list and disclosure for link lists. The catalog follows the fleet theme rule (link lists are disclosure navigation) and requires the full Menu key contract only if `role="menu"` is written.
- **Automatic versus manual tab activation.** APG offers both and recommends automatic only without latency ([APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)); no single default is mandated.
- **Native `<dialog>` versus library dialogs.** MDN says custom dialogs must replicate default focus, Esc handling, inerting and labelling; the APG page does not mention `<dialog>` at all. Trend: native, as of 2026-11. The fleet's Zag-based dialogs were not tested in this run.
- **Invoker Commands and `interestfor`.** Both are new (Baseline December 2025 and newer); the MDN Popover page lists interest invokers without a Baseline label in the extract. Treat `interestfor` as not yet safe for default use.
- **`role="list"` on styled lists.** ARIA in HTML says redundant, then notes that some user agents drop list semantics without markers; practitioners keep the role. Decision: allowed on a `ul` with `list-style: none`.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://webaim.org/projects/million/ | Annual automated audit of 1,000,000 home pages | 2026-03-30 (Feb 2026 data) | Ranking input; independent study |
| https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/ | APG Read Me First | Copyright 2026, undated | "A role is a promise", no ARIA beats bad ARIA (primary) |
| https://www.w3.org/TR/html-aria/ | ARIA in HTML, W3C Recommendation (read in full, 172,550 chars in two fetches) | 2026-08-11 | Redundant roles, allowed roles per element (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | APG dialog pattern | 2026 | Keyboard, focus on open and close (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | APG tabs pattern | 2026 | Keys, roles, activation (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ | APG combobox pattern | 2026 | Editable vs select-only (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/listbox/ | APG listbox pattern | 2026 | Cautions on interactive children (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/ | APG menu button pattern | 2026 | Opening keys; no menu-vs-link rule (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/menu/ | APG menu and menubar pattern | Copyright 2026, undated | Keys inside an open menu (primary) |
| https://www.w3.org/TR/accname-1.2/ | Accessible Name and Description Computation 1.2 | Working Draft 2026-11-04 | `title` as last-fallback name (primary, draft) |
| https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title | MDN title attribute | modified 2026-10-01 | Accessibility concerns of `title` |
| https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md | axe-core rule descriptions, version 4.14.1 | undated | Verified rule IDs and severities (vendor) |
| https://dequeuniversity.com/rules/axe/4.14/button-name | Deque `button-name` rule page | undated | Title-only button passes axe (vendor) |
| https://github.com/jsx-eslint/eslint-plugin-jsx-a11y | eslint-plugin-jsx-a11y README | no date shown | Verified rule names and recommended preset |
| https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ | APG disclosure pattern | 2026 | Minimal contract (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/switch/ | APG switch pattern | 2026 | Native checkbox as switch, label stability (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/ | APG toolbar pattern | 2026 | 3-control threshold (primary) |
| https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog | MDN dialog element | modified 2026-11-10 | Native modal behaviour, `closedby` |
| https://developer.mozilla.org/en-US/docs/Web/API/Popover_API | MDN Popover API | Baseline 2025 | Native non-modal overlay |
| https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API | MDN Invoker Commands API | modified 2026-01-19 | `command`/`commandfor`; no ARIA stated |
| https://primer.style/accessibility/design-guidance/links-and-buttons/ | Primer (GitHub) links and buttons | undated | Name and link/button rules |
| https://code.visualstudio.com/api/ux-guidelines/webviews | VS Code webview UX guidelines | page dated 11/25/2026 | First-party webview rules |
| https://www.scottohara.me/blog/2021/05/28/disabled-links.html | Scott O'Hara on disabling links | 2021-05-28, updated 2022-01-29 | The other side of the disabled-link dispute |

Local evidence (read, not URLs). Measurement script: `/home/mherwig/.cache/research-lang/exemplars/product/scan_wv.py`. `/home/mherwig/dev/ocx-sh/website/skills/ocx-theme-components/SKILL.md`, `.../references/overlays-disclosure.md`, `.../references/actions-forms.md`, `/home/mherwig/dev/ocx-sh/website/skills/ocx-theme-quality/SKILL.md`, `/home/mherwig/dev/grimoire-rs/vscode/src/webview/render.ts`, `.../details/main.ts`, `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/config-inventory.md`.

Not done: no real axe run was executed against the fleet; the Zag dialog and menu behaviour was not exercised, only their source was grepped for key names; `@vscode-elements/elements` 2.5.1 name mapping (textfield placeholder, checkbox toggle `role="switch"`) was not verified; Toast, Clipboard, CopyButton, CopyMenu, Sidebar and Popover internals in the theme were not read; whether eslint-plugin-jsx-a11y covers `.astro` or lit templates was not verified; the github.com blob URL for the axe rule list returned HTTP 503 and the raw file was used.

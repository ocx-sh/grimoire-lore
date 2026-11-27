---
title: Native Widgets, Names and ARIA Refusals
summary: The UX-A11Y-01 to 11 rows, covering native buttons and links, accessible names, state exposed in markup, native dialog and details, the ARIA refusal list, and the APG key contract a custom widget owns
---

# Native Widgets, Names and ARIA Refusals

Owns the choice of element and the accessible name: what an action, a link, a field, an icon button, a dialog and a disclosure are made of, which ARIA an agent never writes, and what a custom widget must implement. Rows bind every `.astro`, `.tsx`, `.jsx`, `.vue`, `.svelte` and `.html` file, built output, and markup written as template literals in `.ts` files (an editor webview). Neighbours: focus rings, contrast, target size and focus visibility are `UX-A11Y-12` to `UX-A11Y-20`, `UX-A11Y-36` and `UX-A11Y-37` (focus and colour depth file). Live regions and motion are `UX-A11Y-22` to `UX-A11Y-27` (motion and announcements depth file). Headings, landmarks and skip links are `UX-A11Y-28` to `UX-A11Y-34` (page structure depth file). The wording of a name is `UX-TEXT`. Which states a view has is `UX-STATE`. Static JSX lint is `TS-WEB-06` in `typescript-quality`. The gate that runs axe is `UX-VERIFY`.

Contents: [Dates and Versions](#dates-and-versions) · [Setup](#setup) · [Native Elements and Names](#native-elements-and-names) · [State, Dialogs and Details](#state-dialogs-and-details) · [The ARIA Refusal List](#the-aria-refusal-list) · [Custom Widgets](#custom-widgets) · [Decisions That Stand](#decisions-that-stand) · [Ask the Owner First](#ask-the-owner-first) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27 unless a row says otherwise. Each source below is re-read when its refresh event fires.

- **WCAG 2.2** is a W3C Recommendation of 2024-12-12 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). The Understanding pages linked per row were revised between 2025-09 and 2026-11 and carry their own dates. Refresh every 6 months: fetch each linked page and diff levels, thresholds and listed techniques.
- **ARIA in HTML (AIH)** is a W3C Recommendation of 2026-08-11 ([AIH](https://www.w3.org/TR/html-aria/)). Refresh every 12 months: re-read the `button`, `a`, `input type=checkbox`, `summary`, `details` and `dialog` rows.
- **APG patterns** (Copyright 2026, undated pages, [patterns index](https://www.w3.org/WAI/ARIA/apg/patterns/)) fix the key table of UX-A11Y-11 and the toolbar and listbox thresholds. Refresh every 12 months: re-read each linked keyboard section.
- **Accname 1.2** is a Working Draft of 2026-11-04 ([Accname 1.2](https://www.w3.org/TR/accname-1.2/)). It accepts `title` as the last fallback name. Refresh every 6 months: check step 2I and the document status.
- **axe-core 4.14.1** ([rule descriptions](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md), fetched 2026-11-27) passes a button named only by `title` ([Deque button-name](https://dequeuniversity.com/rules/axe/4.14/button-name)). Refresh at each axe minor release (about every 6 months): re-run a `<button title="x"></button>` fixture through axe.
- **eslint-plugin-jsx-a11y** ([README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), undated): `prefer-tag-over-role` is outside the `recommended` preset. Refresh every 6 months.
- **Platform support:** `<dialog>` is Baseline since March 2022 ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), modified 2026-11-10). Popover is Baseline since January 2025 ([MDN Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)). Invoker Commands is Baseline since December 2025 and its page states no ARIA behaviour ([MDN Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API), modified 2026-01-19). `interestfor` is not Baseline. Refresh every 6 months: re-read the Baseline badges and check whether `command` now sets `aria-expanded`.
- **Live-region note:** `role="alert"` plus `aria-live="assertive"` double-speaks on iOS VoiceOver ([MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions), 2026-09-11). Refresh every 12 months. If the note disappears, keep UX-A11Y-10 row 10i anyway, because the stack is redundant.
- **Prevalence** figures come from [WebAIM Million 2026](https://webaim.org/projects/million/) (updated 2026-03-30, annual): empty links 46.3%, empty buttons 30.6%, missing form labels 51%, and 59.1 detected errors on pages with ARIA against 42.0 without. The study labels the ARIA figure a correlation.
- **Measured counts** in the rationale cells were taken 2026-11-27 in one editor webview: 72 `<button>` elements, 19 named only by `title`, 1 with no name.

## Setup

Every block below assumes this setup. `markup` lists tracked and untracked markup files, including `.ts` files that hold template literals. The canary prints a line when the list is empty, because an empty list reads as a pass.

```sh
CHECKS=.claude/skills/ux-quality-reference/checks
markup() { git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.astro' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.html' ':(glob)**/*.ts' ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/*.d.ts'; }
markup | awk 'END { if (NR == 0) print "canary: nothing listed" }'
```

Each `grep` block matches one line at a time. A tag split across lines escapes it, so run the JSX lint rules named in the row as well. Axe rules run on the built or rendered page through the gate's shared fixture (`UX-VERIFY`).

## Native Elements and Names

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-01 | Use a native `<button type="button">` for every action and a native `<a href>` for every navigation. Never attach a click or key handler, `data-action`, `role="button"`, `role="link"`, `role="checkbox"`, `role="switch"` or `tabindex="0"` to a `div`, `span`, `li` or `p`. | A role gives no keyboard behaviour, focus or forced-colours mapping. Empty links and empty buttons are on 46.3% and 30.6% of home pages ([WebAIM Million 2026](https://webaim.org/projects/million/)). | See block UX-A11Y-01: no hit is the pass. On JSX also run `jsx-a11y/no-static-element-interactions`, `click-events-have-key-events` and `prefer-tag-over-role`, and enable the last one by hand. | MUST |
| UX-A11Y-02 | Give every `<a>` a URL that loads without script. Never write `href="#"`, `href=""` or `href="javascript:..."`. A control that opens, toggles, saves or deletes is a button. | A bogus `href` "conveys incorrect semantics" ([MDN a](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a), modified 2026-10-28). | See block UX-A11Y-02: no hit is the pass. On JSX also run `jsx-a11y/anchor-is-valid`. | MUST |
| UX-A11Y-03 | Give every `<input>`, `<select>` and `<textarea>` a programmatic label. Prefer a visible `<label for>` or a wrapping `<label>`. A placeholder is never the name. A title `<span>` placed beside the control is not a label: link it with `aria-labelledby` or turn it into a `<label>`. | Missing labels are on 51% of home pages (WebAIM). 5 of the webview's settings controls were named by a neighbouring `<span>`. | axe `label` and `select-name` on the rendered page. On template literals run `scan_wv.py` (see block UX-A11Y-03): class `UNNAMED` must not appear and the exit is 0. | MUST |
| UX-A11Y-04 | Name every icon-only control with visually hidden text or `aria-label`. Mark the icon `aria-hidden="true"`, and add `focusable="false"` on SVG. Never rely on `title` as the only name. | axe passes a title-only button and Accname accepts `title` as a last fallback, yet [MDN calls it](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title) "highly problematic" for touch and keyboard users (modified 2026-10-01). A green axe run proves nothing here. 19 of 72 webview buttons were title-only. | axe `button-name` and `link-name`, then see block UX-A11Y-04: read each hit, and a `title` with no other name source is a fail. On template literals run `scan_wv.py`: classes `UNNAMED` and `title-only` must not appear. | MUST |
| UX-A11Y-05 | When a control has visible text, start its accessible name with that text. Pass: `<button aria-label="Save draft">Save</button>`. Fail: `aria-label="Submit form"` on a button whose visible text is "Save". | Voice-control users speak the visible text (WCAG 2.5.3, [Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/)). | axe `label-content-name-mismatch`, plus the pass and fail reading above. | MUST |
| UX-A11Y-06 | Give repeated peer controls names that are unique in context: "Manage cmake", not three buttons named "Manage". | A list of identical names in the accessibility tree cannot be told apart (Primer). | See block UX-A11Y-06: every line printed is a duplicate name to inspect. | SHOULD |

```sh
# UX-A11Y-01: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e '<(div|span|li|p)[^>]*(onclick|on:click|@click|data-action=|role="(button|link|checkbox|switch)")' --
# UX-A11Y-02: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e 'href="(#|javascript:[^"]*)?"' --
# UX-A11Y-03, template literals: TEMPLATES is the directory that holds them; a UNNAMED line is a finding
python3 -I "$CHECKS"/scan_wv.py "$TEMPLATES" | grep -F -e UNNAMED
# UX-A11Y-04: every button tag with no aria-label; read each one for a text child or hidden text
markup | xargs -0 -r grep -H -o -E -e '<button[^>]*>' -- | grep -v -F -e aria-label
# UX-A11Y-04, template literals: a UNNAMED or title-only line is a finding
python3 -I "$CHECKS"/scan_wv.py "$TEMPLATES" | grep -F -e UNNAMED -e title-only
# UX-A11Y-06: a printed line is a name used more than once across the listed files
markup | xargs -0 -r grep -H -o -E -e '(title|aria-label)="[^"]+"' -- | sed 's/^[^:]*://' | sort | uniq -d
```

UX-A11Y-04 is the one rule where axe and the intent disagree. When the two conflict, the grep wins.

```html
<!-- wrong: named only by title, so axe stays green -->
<button title="Close"><svg viewBox="0 0 16 16"><path d="M2 2l12 12"/></svg></button>
<!-- right: a real name, and the icon hidden from the tree -->
<button type="button" aria-label="Close"><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"><path d="M2 2l12 12"/></svg></button>
<!-- wrong: the span only looks like a label -->
<span>Port</span><input id="port">
<!-- right -->
<label for="port">Port</label><input id="port">
```

## State, Dialogs and Details

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-07 | Expose every visual state in markup. Pressed is `aria-pressed` with a stable name. Checked is a native `checked`, or `aria-checked` on `role="switch"`, and never `aria-checked` on a native checkbox. Selected is `aria-selected` inside a real `tablist`, or `aria-pressed` or `aria-current` on plain buttons. Expanded is `aria-expanded` on the trigger. A control that changes its name with its state carries no `aria-pressed`. A switch label never changes with state. | 4.1.2 ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html), 2026-11-02), [APG button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and [APG switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/). AIH says `aria-checked` on a native checkbox is MUST NOT. A rename with no `aria-pressed` is valid APG, so the error is mixing the two. | See block UX-A11Y-07. Then a test clicks each control and asserts the state string flips between `"true"` and `"false"`. | MUST |
| UX-A11Y-08 | Open a modal with `<dialog>` and `showModal()`, or with `command="show-modal"` plus `commandfor`. Set `aria-modal="true"` only on a dialog that makes the page behind it inert. Accept a library dialog that does not call `showModal()` only when a test proves four things: Tab and Shift+Tab stay inside, Esc closes, focus returns to the opener, and the background is inert. | The browser supplies the inert background, the top layer, initial focus and Esc ([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)). A false `aria-modal` harms assistive-technology users ([APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)). | See block UX-A11Y-08: every hit needs a documented reason. Then run the key test: open, press Tab 10 times, press Esc, and check `document.activeElement` is the opener. | MUST |
| UX-A11Y-09 | Use `<details>` and `<summary>` for show and hide content that needs no script, with no `role` on either element. Use `popover` with `popovertarget`, or `command="toggle-popover"`, for non-modal overlays. When `command` drives the overlay, set and update `aria-expanded` yourself. Check the project's browser-support policy before adopting Invoker Commands. | AIH calls `role="button"` on `summary` redundant. Invoker Commands is Baseline since December 2025 and its page states no ARIA behaviour. | See block UX-A11Y-09: no hit is the pass, and no overlay is toggled through `style.display`. A click test flips `aria-expanded` on every `commandfor` trigger. | SHOULD |

```sh
# UX-A11Y-07 a: aria-checked on a native checkbox; any hit is a finding
markup | xargs -0 -r grep -H -n -E -e '<input[^>]*checkbox[^>]*aria-checked' --
# UX-A11Y-07 b: a class that toggles a state with no ARIA state on the same line; read each hit (reading heuristic)
markup | xargs -0 -r grep -H -n -E -e 'class="[^"]*(active|selected|open)' -- | grep -v -E -e 'aria-(pressed|selected|current|expanded)'
# UX-A11Y-07 c: a name and a pressed state on one element; any hit is a finding
markup | xargs -0 -r grep -H -n -E -e 'aria-label[^>]*aria-pressed' -e 'aria-pressed[^>]*aria-label' --
# UX-A11Y-08: each hit needs a documented reason
markup | xargs -0 -r grep -H -n -E -e 'role="(dialog|alertdialog)"' -e 'aria-modal' -e 'focus-?trap' --
# UX-A11Y-09: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e '<(summary|details)[^>]*role=' --
```

```js
// UX-A11Y-08: the native route. The browser supplies the inert background, Esc and focus return.
opener.addEventListener('click', () => dialog.showModal());
```

## The ARIA Refusal List

**UX-A11Y-10** is one instruction with ten detectors. The rows below are its enumerated forms. Each row has its own command, and any row that fails fails the rule. The ID is stable, so a review cites `UX-A11Y-10` and names the row.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-10 | Never write ARIA that ARIA in HTML or the APG forbids. The ten forms are rows 10a to 10j below. | "No ARIA is better than Bad ARIA" ([APG Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), Copyright 2026). Each row is a MUST NOT, NOT RECOMMENDED or "only if" in AIH or in the linked APG pattern. | The detector in each row. See block UX-A11Y-10 and the three in-page snippets below it. | MUST NOT |

| Row | Never write | Detect |
|---|---|---|
| 10a | A `role` equal to the element's implicit role (`<button role="button">`, `<nav role="navigation">`, `<main role="main">`). Exception: `role="list"` on a `ul` with `list-style: none`. | grep in block UX-A11Y-10 returns nothing; `jsx-a11y/no-redundant-roles` |
| 10b | `aria-hidden="true"` on a focusable element or on an ancestor of one. | axe `aria-hidden-focus` reports 0 |
| 10c | `tabindex` greater than 0. | grep in block UX-A11Y-10 returns nothing; axe `tabindex` |
| 10d | `role="menu"` or `menuitem` on site navigation or any list of links. A navigation dropdown is a disclosure button plus links. | grep in block UX-A11Y-10 returns nothing (a link that carries a menu-item role is the navigation-menu signature) |
| 10e | A hand-built group of popup buttons given `role="menu"` without the full menu keys of UX-A11Y-11. | The key test of UX-A11Y-11 |
| 10f | A link, button or checkbox inside `role="option"`. Use a grid. `<a href role="option">`, where the link is the option, is allowed by AIH. | Query Q1 returns 0 on the built page |
| 10g | `role="toolbar"` on fewer than 3 controls ([APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)). | Query Q2 returns 0 on the built page |
| 10h | `aria-expanded` or `aria-controls` on a control that toggles nothing. | Test T1 passes on every page that has an `[aria-expanded]` control |
| 10i | `aria-live="assertive"` on an element that already has `role="alert"` (double speech on iOS VoiceOver, MDN live regions, 2026-09-11). | grep in block UX-A11Y-10 returns nothing |
| 10j | An invented attribute or value: `role="modal"`, `aria-role`, `popover="modal"`. | `html-validate` over the built `.html` files reports no `aria-*` or `attribute-allowed-values` error (no version is pinned here: use the one your project pins), or the Nu checker reports none |

```sh
# UX-A11Y-10 row 10a: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e '<(button|nav|main|header|footer|dialog|img)[^>]*role="(button|navigation|main|banner|contentinfo|dialog|img)"' --
# UX-A11Y-10 row 10c: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e 'tabindex="?[1-9]' --
# UX-A11Y-10 row 10d: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e '<a[^>]*href[^>]*role="menuitem' -e 'role="menuitem[a-z]*"[^>]*href' --
# UX-A11Y-10 row 10i: any hit is a finding
markup | xargs -0 -r grep -H -n -E -e 'role="alert"[^>]*aria-live' -e 'aria-live[^>]*role="alert"' --
# UX-A11Y-10 row 10j: BUILD is the build output directory; a printed error line is a finding
find "$BUILD" -type f -name '*.html' -print0 | xargs -0 -r npx html-validate
```

Run the three snippets through Playwright `page.evaluate`, or paste them into DevTools, on the built page.

```js
// Q1 (10f): interactive descendants of an option. The option itself is excluded.
document.querySelectorAll('[role=option] :is(a[href], button, input, select, textarea)').length
// Q2 (10g): toolbars with fewer than 3 controls.
[...document.querySelectorAll('[role=toolbar]')]
  .filter((t) => t.querySelectorAll('button, a[href], input, select, [tabindex]').length < 3).length
// T1 (10h): every expandable control flips its state and its target's visibility.
for (const el of document.querySelectorAll('[aria-expanded]')) {
  const target = document.getElementById(el.getAttribute('aria-controls') || el.getAttribute('popovertarget')
    || el.getAttribute('commandfor') || '') || el.nextElementSibling;
  const before = [el.getAttribute('aria-expanded'), target?.checkVisibility()];
  el.click(); await new Promise((r) => setTimeout(r, 50));
  const after = [el.getAttribute('aria-expanded'), target?.checkVisibility()];
  if (before[0] === after[0] || before[1] === after[1]) console.log('FAIL 10h', el.outerHTML.slice(0, 80));
  el.click();
}
```

T1 is a heuristic where no `aria-controls`, `popovertarget` or `commandfor` names the target, because it then checks the next sibling. A FAIL there is a lead to inspect, not a verdict.

## Custom Widgets

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-11 | Write a custom widget (tabs, combobox, listbox, menu, tree, toolbar) only when no native element fits. State in the pull request which native element you rejected and why. Implement every required key of the APG pattern in the table below, and ship a test that sends each key. | "ARIA roles do not cause browsers to provide keyboard behaviors" (APG Read Me First). A component library's widgets are not exempt: key names found by grep are not a key test. | A key-sending test per pattern that asserts `document.activeElement` and the state attributes after each key. With no such test the rule fails. | MUST |

| Pattern | Required roles and keys (APG pages read 2026-11-27) |
|---|---|
| [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | `tablist`, `tab`, `tabpanel`, `aria-selected`, roving `tabindex`. Left and Right move and wrap. Tab moves into the panel. Automatic activation only when the panel shows without latency. |
| [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | `role="combobox"` on the input, `aria-expanded`, `aria-controls`, `aria-activedescendant`. Down opens or moves. Esc dismisses. Enter accepts. DOM focus stays on the input. |
| [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | `option` children. Up and Down. Home and End strongly recommended above 5 options. Type-ahead recommended. |
| [Menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) and [Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) | Trigger has `aria-haspopup="menu"` and `aria-expanded`. Enter, Space and Down open and focus the first item. Down and Up move. Enter activates and closes. Esc closes and returns focus to the trigger. Tab closes all menus. |
| [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | A button with `aria-expanded`. Enter and Space toggle. |
| [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) | Space toggles. The label is stable. |
| [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | One tab stop, arrows inside, 3 or more controls. |

A component library that wraps these patterns (one measured library, `@zag-js` 1.44.0, supplies dialog, menu, tabs, combobox, select, slider, tree and accordion machines) needs the same key test before a new view reuses it. That dialog library does not call `showModal()`, so UX-A11Y-08's four-part test applies to it first. No key test of either has been run, so both rows are unmeasured on that library.

## Decisions That Stand

- **A control that renames itself and carries no `aria-pressed` is valid.** A button that cycles through several states (a theme switch, "Mode (click for dark)") cannot express that with `aria-pressed`. APG allows a changing label when `aria-pressed` is absent. UX-A11Y-07 forbids only the mix of the two, and it forbids a changing label on a `role="switch"`.
- **`aria-disabled` versus `disabled` on a button** is a form-state decision (`UX-STATE`: never pre-disable a submit button). It is not a widget-semantics row.
- **A title attribute is a tooltip, not a name.** Accname lists it as the last fallback and axe passes it. This catalog fails it anyway, and the grep decides.
- **Severity follows the WCAG level.** A and AA rows are MUST. AAA rows are SHOULD or CONSIDER. Where a row departs from that, it says **house policy** in its rationale.

## Ask the Owner First

- **Replacing an existing library widget with a native element when the look changes.** Propose the change. Do not apply it.
- **A global keyboard shortcut** such as `/` or Ctrl or Cmd plus K. It conflicts with browser, screen-reader and editor bindings.
- **Adopting Invoker Commands or `interestfor`.** Ask for the browser-support policy first, and keep the fallback until the owner drops it.
- **Whether a real screen-reader pass (NVDA, VoiceOver) is required** before release of a new custom widget.

## What Agents Get Wrong Here

1. **Naming an icon button with only `title`**, because hovering shows a tooltip and axe stays green (UX-A11Y-04).
2. **Putting a field's title in a `<span>` beside the input.** It looks labelled and is not (UX-A11Y-03).
3. **Writing `<a href="#">` or a `div` with a click handler for an action**, then hand-writing Enter and Space (UX-A11Y-01, UX-A11Y-02).
4. **Building a `div role="dialog"` with a `keydown` focus trap** instead of `<dialog>.showModal()` (UX-A11Y-08).
5. **Stacking `role="alert"` and `aria-live="assertive"` "for compatibility"** (UX-A11Y-10 row 10i).
6. **Adding `role="menu"` to a navigation dropdown**, or a menu role on a popup of buttons with no arrow keys (UX-A11Y-10 rows 10d and 10e, UX-A11Y-11).
7. **Swapping a label to "Unmute" and also setting `aria-pressed`** (UX-A11Y-07).
8. **Writing redundant roles** (`<nav role="navigation">`) and an `aria-label` on elements that already show text, which breaks label-in-name (UX-A11Y-05, UX-A11Y-10 row 10a).
9. **Treating a green axe run as proof.** axe passes a title-only name, and it cannot send a key (UX-A11Y-04, UX-A11Y-11).
10. **Hiding a native checkbox at zero size behind a custom box** so it looks right. Focus then lands on a control nobody can see (UX-A11Y-37 in the focus and colour depth file, with UX-A11Y-03 and UX-A11Y-04).

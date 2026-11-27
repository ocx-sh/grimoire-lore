---
title: "UX-A11Y: accessibility authoring (consolidated)"
topic: ux-a11y-authoring
program: product
sub_program: ux
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: UX-A11Y
consolidates:
  - ux-a11y-authoring/native-widgets-and-keyboard.md
  - ux-a11y-authoring/focus-contrast-target-size.md
  - ux-a11y-authoring/announcements-and-motion.md
  - ux-a11y-authoring/page-structure-and-consistency.md
  - ux-a11y-authoring/followup-q0.md
  - ux-a11y-authoring/followup-q1.md
  - ux-a11y-authoring/followup-q2.md
revision: 2
grounding:
  - product-audit/ui-code-posture.md
  - product-audit/site-shape.md
  - product-audit/config-inventory.md
  - product-audit/exemplar-design-systems.md
---

# UX-A11Y: accessibility authoring

The question this topic decides: which accessibility properties an agent must
build into interface code and page templates by default, and which ARIA and
custom widgets it must refuse to write.

## Contents

1. [Verdict](#verdict)
2. [Boundaries with the rest of the catalog](#boundaries-with-the-rest-of-the-catalog)
3. [The ruleset](#the-ruleset)
4. [Applied to the fleet](#applied-to-the-fleet)
5. [AI-agent failure modes](#ai-agent-failure-modes)
6. [What an agent must ask a human](#what-an-agent-must-ask-a-human)
7. [Decay](#decay)
8. [Open questions](#open-questions)
9. [Sub-artifacts](#sub-artifacts)
10. [Key sources](#key-sources)
11. [Appendix: check scripts](#appendix-check-scripts)
12. [Revision log](#revision-log)

## Verdict

1. **The default is the native element, and ARIA is a refusal list, not a toolbox.** An agent uses
   `<button>`, `<a href>`, `<label>`, `<dialog>`, `<details>`, `popover` and native inputs. It writes a
   custom widget only when no native element fits, and then it owns the whole APG keyboard contract
   (UX-A11Y-11). "A role is a promise" ([APG Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), undated, Copyright 2026).
   Pages with ARIA averaged 59.1 detected errors against 42.0 without. The study labels this a
   correlation ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30, independent study).
2. **The first targets are the failures automation already counts.** These are low-contrast text
   (83.9% of home pages), missing form labels (51%), empty links (46.3%), empty buttons (30.6%) and
   missing `lang` (13.5%) (same WebAIM source). Rules UX-A11Y-01 to -05, -15 and -28 cover them.
3. **A `title` attribute is not an accessible name for this catalog, even though axe passes it.**
   The name algorithm accepts `title` as the last fallback ([Accname 1.2](https://www.w3.org/TR/accname-1.2/), Working Draft 2026-11-04).
   Deque's `button-name` page lists `<button title>` as a pass ([Deque](https://dequeuniversity.com/rules/axe/4.14/button-name)).
   MDN calls `title` "highly problematic" for touch and keyboard users ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title), modified 2026-10-01).
   Decision: a control named only by `title` is a finding. It is detected by grep, because axe stays green on it.
4. **Severity follows the WCAG level, with three deliberate exceptions.** A and AA criteria are MUST.
   AAA criteria are SHOULD or CONSIDER. That matches the catalog's precedent in DOC-EX-17
   (`skills/docs-quality-reference/examples.md:75`). The exceptions are house policy, and each is
   stated as such. (a) A skip link is MUST on every template with repeated chrome: WCAG accepts
   landmarks alone, but no gate can require them in its place (UX-A11Y-32). (b) Reduced motion
   (2.3.3, AAA) rises to MUST only where the codebase already has a duration-token layer, because a
   literal duration there breaks an existing contract (UX-A11Y-27). (c) In a VS Code webview, every
   colour comes from a `--vscode-*` variable (UX-A11Y-35). WCAG does not require theme variables.
   The platform guideline asks that every element be themeable, and a literal colour cannot follow
   a high-contrast theme. Structure rules that rest only on axe best-practice rules (one `<main>`,
   one `<h1>`: UX-A11Y-29, -31) are SHOULD, not MUST.
5. **Contrast is gated on WCAG 2 ratios, computed unrounded, per theme and per surface.** APCA is
   not a gate. The WCAG 3 draft of 2026-04-08 has selected no contrast algorithm, and the earliest
   plausible final date is about 2030 ([Roselli, April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)).
6. **Focus rules check for a missing replacement, not for the string `outline: none`.** All 16
   theme sites that remove the outline draw a replacement (`ui-code-posture.md` §2), so "never
   write `outline: none`" would be a false rule for this codebase. A drawn ring is not enough on
   its own: the focused control must also be visible when focus arrives (UX-A11Y-36). Wave 2
   measured five Tab stops in three containers at an effective opacity below 0.1 on the built
   sites. A scroll position or a mouse hover fades each container in.
7. **Targets are measured on the rendered hit box, against 24×24 CSS px (AA).** The token is not
   the measure. 44×44 is AAA, and an agent must never call it AA.
8. **Announcements write text into a live region that already exists.** They never move focus and
   never create the region in the same step. `alert` is for errors only. The fleet theme switch's
   pattern, a name that changes with state and carries no `aria-pressed`, is valid APG. The error is
   mixing that pattern with `aria-pressed`.
9. **Page structure is checked on the built page, because the frameworks inject it.** Starlight
   and Material write the `<h1>`, the skip link, the landmarks and `lang` at build time. A source
   grep cannot see the double `<h1>` that a hero adds to a Starlight page.
10. **The ocx.sh family is one WCAG "set of web pages", and so are grimoire.rs plus
    index.grimoire.rs.** So 3.2.3 and 3.2.4 bind their shared chrome as one unit. The github.io
    Material sites are in the set for naming and out of it for order until the owner decides.
11. **A VS Code webview gets no accessibility layer from the platform.** The whole ruleset applies
    inside it, plus theme variables and a high-contrast test (UX-A11Y-35). The extension's webview
    holds most of the fleet's measured widget defects.
12. **Some rules bind with no fleet measurement behind them.** These are UX-A11Y-08, -11 (the theme's
    Zag widgets), -14, the `--vscode-focusBorder` clause of -35, -22 (copy button) and -32
    (Material). Each is labelled *unmeasured* in "New commitments". Its severity rests on the WCAG
    or APG source alone, and the first key or scroll test either confirms it or records a
    violation. No fleet count backs these rules yet.
13. **Every check this ruleset names is either a command, or it is labelled a reading heuristic.**
    The scripts the checks need are inlined in the
    [Appendix](#appendix-check-scripts). They are not paths in a local cache. A check that runs on
    a simulated reader or on a heuristic says so in its rule. Wave 2 ran the two source and
    browser heuristics on Primer and Radix (followup-q1). Neither `focus_outline.py` nor the first
    `colour_only.mjs` separates a pass from a fail on its own, so both are lead generators. The
    pass condition of UX-A11Y-12 is now the triaged end state: every FAIL row is fixed or carries
    a `focus-ok:` comment. Appendix A6 is replaced by the measured alpha-blending version.
14. **Wave 2 left these gaps on record. They are findings, not open questions.**
    - Focus checks. No oracle exists for UX-A11Y-12: no Tab-and-diff pass ran on a built Primer
      or Radix Storybook. The 82% precision of the improved check (A7) was tuned on the same
      corpora, so it is an upper bound. Three false positives remain in every selector-based
      version: a wrapper in another file draws the ring, and only the markup links the two.
    - Colour checks. `colour_only_v2.mjs`, like the script it replaces, tests the state element only. A cue drawn on the parent
      (Primer NavList: tint and bar on the `li`) is reported as INFO, and the INFO text is wrong
      there. Validation state set by a `data-*` attribute on a wrapper is not seen.
    - Visibility of focus (UX-A11Y-36). It was measured in headless Chrome only, with no Firefox,
      no Safari, no real device and no real assistive technology. Calling an invisible focused
      control a 2.4.7 failure is this catalog's reading. The W3C text does not name the case.
    - Announcements (UX-A11Y-22). No real or virtual reader was run in wave 2. Neither ARIA22 nor
      ARIA19 says whether a region created together with its text is announced. The rule now
      rests on their "exists before the message" tests, not on a claim about speech.

### Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| C1 | focus-contrast-target-size says the VS Code extension has "no UI code in the measured corpora", so its webview rule is design-only. native-widgets-and-keyboard measured 72 `<button>` in `grimoire-rs/vscode/src/webview` | The webview is a real, measured surface. UX-A11Y-35 binds now | The first dive looked at `src/views`, which builds only the shell (`views/html.ts`). The markup is rendered in `src/webview`. Re-checked 2026-11-27: `render.ts:1745`, `settings/render.ts:137` and `render.ts:1408,1432,1523` are as the dive reports |
| C2 | native-widgets lists the CycleButton name `${label} (click for ${next})` (`CycleButton.astro:60`, `cycle-button.mjs:34`) as a name that changes with state, and its N15 forbids that on a switch. announcements-and-motion calls it the valid APG "rename, no `aria-pressed`" branch | Valid. Satisfied, not violated | N15 is about `role="switch"`. CycleButton is a `<button>` that cycles through `states`, so `aria-pressed` cannot express it. [APG button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) allows a changing label as long as `aria-pressed` is absent. UX-A11Y-07 forbids only the mix |
| C3 | Disabled links. Primer says never disable a link ([Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/)). ARIA in HTML says remove `href` and calls `aria-disabled` on `a[href]` NOT RECOMMENDED ([AIH](https://www.w3.org/TR/html-aria/), 2026-08-11). O'Hara: `role="link"` plus `aria-disabled` without `href` when you must ([O'Hara](https://www.scottohara.me/blog/2021/05/28/disabled-links.html), updated 2022-01-29). page-structure: non-link text with "planned" | An agent never writes a new disabled link. A target that does not exist is omitted or rendered as text (UX-A11Y-34). The existing theme Pagination/Toc technique (`role="link"` plus `aria-disabled`, no `href`) is left alone | Not writing the link removes the dispute. The existing technique matches the W3C text, so rewriting it buys nothing |
| C4 | Gray-4 border on the Grimoire secondary button (`index.astro:198`, 2.69:1) is "FAIL as a control boundary" in `ui-code-posture.md` §4. The focus dive measured it as decorative because the button has a text label | Not a violation. It becomes one only on a control whose boundary is its only cue | [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) (2026-10-04) requires contrast for the visual information needed to identify the component. The text does that here |
| C5 | Reduced-motion severity. announcements-and-motion proposes MUST. DOC-EX-17 sets SHOULD with "AAA caps the severity" | SHOULD, rising to MUST where a duration-token layer exists | Keeps the catalog consistent. The MUST case is a regression against a contract the codebase already enforces (`tokens.css:353`), which is checkable and costs nothing |
| C6 | One live region per page (the commission) versus the component-local regions the theme uses (14 lines, at least 7 components) | No count rule. Each region must exist at load. Transient toasts go through one pre-existing announcer | ARIA22 and MDN require only that a region pre-exist. No source mandates a count. The dive's "more than 3 per page" threshold had no source and is dropped |
| C7 | Gate tier and checker choice: axe in the PR gate (focus rule 18), axe with overlays open (UXA-TEST-01), checks split into source and built tiers (PS-16) | Moved to UX-VERIFY (topic-map rows M001 to M008). Here, each rule names its check. Where and when the check runs is not decided here | `ux-topic-map.md` gives automated coverage and the rendered-interaction matrix to UX-VERIFY. Two topics owning one gate would diverge |
| C8 | `aria-disabled` versus `disabled` on buttons (UXA-BTN-01, Primer) | Dropped here. Owned by the forms topic (`ux-interface-states/form-state-machine.md`, never pre-disable a submit button) | That is a form-state decision, not a widget-semantics one |
| C9 | forced-colors fallback (focus rule 15) duplicates CSS-A11Y-01 (`rules/css-theming.md:104`) | Not restated. UX-A11Y-12 requires an outline-based indicator, which survives forced colours, and cites CSS-A11Y-01 for the mechanism | css-theming already owns the mechanism: `box-shadow` is suppressed |
| C10 | Skip link. WCAG 2.4.1 passes with landmarks alone ([Understanding 2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html), 2026-02-09). page-structure proposes MUST | MUST, as declared house policy, on templates with repeated chrome | Lighthouse `bypass` passes on a single heading ([Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)), so only a direct check can require a mechanism. Both frameworks ship a skip link, and the violations are measured |

## Boundaries with the rest of the catalog

Each line names something this topic does not restate:

- Already in the catalog. TS-WEB-06 is the static a11y lint for JSX, Vue and Biome
  (`skills/typescript-quality-reference/browser.md:78`). DOC-EX-15, -16 and -17 cover player
  autoplay, player controls and player reduced motion. DOC-EX-34 covers the keyboard contract for
  tooltips (1.4.13) (`skills/docs-quality-reference/examples.md:73-75,98`). CSS-A11Y-01 covers the
  forced-colors mechanism. docs-quality owns heading levels inside a Markdown body.
- UX-VERIFY owns gate tiers, axe configuration, what a Lighthouse 100 proves, the rendered
  matrix, and every conformance claim.
- UX-STATE owns which states exist (loading, empty, error) and the focus moves around forms. This
  topic owns only how a state is announced.
- UX-TEXT owns the wording of names and announcements.
- Cross-territory, marketing: whether a nav entry for an unreleased product may appear at all is a
  roadmap and messaging decision. Page titles made of brand names are marketing copy.

## The ruleset

Severity: MUST blocks a merge. SHOULD is a finding that needs a recorded reason to waive. CONSIDER
is advisory. "From" lists the dive-local IDs that were merged. Check commands run from the
repository root (source checks) or from the build output directory (built-page checks, marked
*built*). AIH = [ARIA in HTML](https://www.w3.org/TR/html-aria/), W3C Recommendation 2026-08-11.
WebAIM = [WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30.

### Native elements and names

**UX-A11Y-01 (MUST).** Use a native `<button type="button">` for every action and a native
`<a href>` for every navigation. Never attach a click or key handler, `data-action`,
`role="button|link|checkbox|switch"` or `tabindex="0"` to a `div`, `span`, `li` or `p`.
*Why:* a role gives no keyboard behaviour, focus or forced-colours mapping. Empty links and empty
buttons are on 46.3% and 30.6% of home pages (WebAIM).
*Verify:* `grep -rnE '<(div|span|li|p)[^>]*(onclick|on:click|@click|data-action=|role="(button|link|checkbox|switch)")' src` returns 0.
On JSX, also run `jsx-a11y/no-static-element-interactions`, `click-events-have-key-events` and
`prefer-tag-over-role`. The last one is not in the recommended preset, so enable it explicitly
([README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)).
*From:* UXA-NAT-01, N1, N2.

**UX-A11Y-02 (MUST).** An `<a>` carries a URL that loads without script. Never write `href="#"`,
`href=""` or `href="javascript:…"`. A control that opens, toggles, saves or deletes is a button.
*Why:* a bogus `href` "conveys incorrect semantics" ([MDN a](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a), modified 2026-10-28).
*Verify:* `grep -rnE 'href="(#|javascript:[^"]*)?"' src` returns 0. Also `jsx-a11y/anchor-is-valid`.
*From:* UXA-LINK-01, N6.

**UX-A11Y-03 (MUST).** Give every `<input>`, `<select>` and `<textarea>` a programmatic label.
Prefer a visible `<label for>` or a wrapping `<label>`. A placeholder is never the name. A title
`<span>` placed visually next to the control is not a label either: link it with `aria-labelledby`
or turn it into a `<label>`.
*Why:* missing labels are on 51% of home pages (WebAIM).
*Verify:* axe `label` and `select-name` on the built or rendered page. On template literals (lit
`html`), check each control for `id` with a matching `label for`, a wrapping `<label>`,
`aria-label` or `aria-labelledby`. The scanner `scan_wv.py` ([Appendix A3](#a3-scan_wvpy-ux-a11y-03--04--35)), run as
`python3 -I scan_wv.py` from the template directory, must report 0 for class `UNNAMED` after
`<label>`-wrapped tags are excluded.
*From:* UXA-NAT-02.

**UX-A11Y-04 (MUST).** Name every icon-only control with visually hidden text or `aria-label`.
Mark the icon `aria-hidden="true"`, and also `focusable="false"` on SVG. Never rely on `title` as
the only name.
*Why:* see Verdict 3. axe passes a title-only button, so this rule must be checked by grep.
*Verify:* axe `button-name` and `link-name`. Then list buttons with no `aria-label` and no text
content: `grep -oE '<button[^>]*>' -r src | grep -v aria-label`, and inspect each one. A `title`
with no other name source is a fail. On template literals, `python3 -I scan_wv.py` (Appendix A3)
must report 0 for class `title-only` and 0 for `UNNAMED`.
*From:* UXA-NAME-01.

**UX-A11Y-05 (MUST).** When a control has visible text, its accessible name starts with that text.
Pass: `<button aria-label="Save draft">Save</button>`. Fail: `aria-label="Submit form"` on a
button whose visible text is "Save".
*Why:* voice-control users speak the visible text (WCAG 2.5.3,
[Primer](https://primer.style/accessibility/design-guidance/links-and-buttons/)).
*Verify:* axe `label-content-name-mismatch`, plus the pass/fail heuristic above.
*From:* UXA-NAME-02, N5.

**UX-A11Y-06 (SHOULD).** Give repeated peer controls names that are unique in context, for
example "Manage cmake" rather than three "Manage".
*Why:* a list of identical names in the accessibility tree cannot be told apart (Primer).
*Verify:* collect peer names from the accessibility tree, or grep `title="…"`/`aria-label="…"` per
template, and flag duplicates.
*From:* UXA-NAME-03.

### State, dialogs and custom widgets

**UX-A11Y-07 (MUST).** Expose every visual state in markup.
- Pressed: `aria-pressed` with a stable name.
- Checked: a native `checked`, or `aria-checked` on `role="switch"`. Never `aria-checked` on a
  native checkbox: AIH says MUST NOT.
- Selected: `aria-selected` inside a real `tablist`, or `aria-pressed` or `aria-current` on plain
  buttons.
- Expanded: `aria-expanded` on the trigger.
A control that changes its name with its state carries no `aria-pressed`. A switch label never
changes with state.
*Why:* 4.1.2 ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html),
2026-11-02); [APG button](https://www.w3.org/WAI/ARIA/apg/patterns/button/); [APG switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/).
*Verify:*
- `grep -rnE '<input[^>]*checkbox[^>]*aria-checked' src` returns 0.
- Every element whose class toggles `active`, `selected` or `open` also toggles an ARIA state.
  Grep each such `class=…active` for a sibling `aria-(pressed|selected|current|expanded)`.
- No handler sets both `aria-label` and `aria-pressed`.
- A test clicks the control and asserts the state string flips (`"true"`/`"false"`).
*From:* UXA-NAT-06, N4, N14, N15, A11Y-ANN-9, A11Y-ANN-10.

**UX-A11Y-08 (MUST).** Open a modal with `<dialog>` and `showModal()`, or with
`command="show-modal"` plus `commandfor`. Set `aria-modal="true"` only on a dialog that really
makes the page behind it inert. A library dialog that does not use `showModal()` is acceptable
only when a test proves four things: Tab and Shift+Tab stay inside, Esc closes, focus returns to
the opener, and the background is inert.
*Why:* the browser supplies inert background, top layer, initial focus and Esc
([MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog),
modified 2026-11-10, Baseline since March 2022). A false `aria-modal` harms AT users
([APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)).
*Verify:* `grep -rnE 'role="(dialog|alertdialog)"|aria-modal|focus-?trap' src` returns hits only
with a documented reason. Then run the key test: open, press Tab 10 times, press Esc, and check
`document.activeElement` is the opener.
*From:* UXA-NAT-03, UXA-ARIA-05, N9.

**UX-A11Y-09 (SHOULD).** Use `<details>`/`<summary>` for show/hide content that needs no script,
with no `role` on either element. Use `popover` with `popovertarget` (or
`command="toggle-popover"`) for non-modal overlays. When `command` drives the overlay, set and
update `aria-expanded` yourself. Check the project's browser-support policy before adopting
Invoker Commands.
*Why:* AIH calls `role=button` on `summary` redundant. Popover has been Baseline since January
2025 ([MDN Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)). Invoker
Commands has been Baseline since December 2025, and its page states no ARIA behaviour
([MDN Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API),
modified 2026-01-19).
*Verify:* `grep -rnE '<(summary|details)[^>]*role=' src` returns 0. No overlay is toggled through
`style.display`. A click test flips `aria-expanded` on every `commandfor` trigger.
*From:* UXA-NAT-04, UXA-NAT-05.

**UX-A11Y-10 (MUST NOT).** Never write ARIA that ARIA in HTML or the APG forbids. The rows below
list the ten forms this takes. The rule is one instruction, and the rows are its enumerated
detectors. Each row has its own command, and any row that fails fails the rule.

| Row | Never write | Detect (command) |
|---|---|---|
| 10a | A `role` equal to the element's implicit role (`<button role="button">`, `<nav role="navigation">`, `<main role="main">`). Exception: `role="list"` on a `ul` with `list-style: none` | `grep -rnE '<(button\|nav\|main\|header\|footer\|dialog\|img)[^>]*role="(button\|navigation\|main\|banner\|contentinfo\|dialog\|img)"' src` returns 0; `jsx-a11y/no-redundant-roles` |
| 10b | `aria-hidden="true"` on a focusable element or on an ancestor of one | axe `aria-hidden-focus` reports 0 |
| 10c | `tabindex` greater than 0 | `grep -rnE 'tabindex="?[1-9]' src` returns 0; axe `tabindex` |
| 10d | `role="menu"`/`menuitem` on site navigation or any list of links. A nav dropdown is a disclosure button plus links | `grep -rnE '<a[^>]*href[^>]*role="menuitem\|role="menuitem[a-z]*"[^>]*href' src` returns 0 (a link carrying a menu-item role is the nav-menu signature) |
| 10e | A hand-built group of popup buttons given `role="menu"` without the full menu keys (UX-A11Y-11) | the key test in UX-A11Y-11 |
| 10f | Links, buttons or checkboxes inside `role="option"`. Use a grid. `<a href role="option">`, where the link is the option, is allowed by AIH | query Q1 below returns 0 on the built page |
| 10g | `role="toolbar"` on fewer than 3 controls ([APG toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)) | query Q2 below returns 0 on the built page |
| 10h | `aria-expanded` or `aria-controls` on a control that toggles nothing | test T1 below passes on every page that has an `[aria-expanded]` control |
| 10i | `aria-live="assertive"` on an element that already has `role="alert"` (double speech on iOS VoiceOver, [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions), 2026-09-11) | `grep -rnE 'role="alert"[^>]*aria-live\|aria-live[^>]*role="alert"' src` returns 0 |
| 10j | Invented attributes or values: `role="modal"`, `aria-role`, `popover="modal"` | `npx html-validate <built .html files>` reports no `aria-*`/`attribute-allowed-values` error, or the Nu checker reports none |

Run the queries and the test in the page through Playwright or Puppeteer `page.evaluate`, or paste
them into DevTools:

```js
// Q1 (10f): interactive descendants of an option. The option element itself is excluded.
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

T1 is a heuristic where no `aria-controls`, `popovertarget` or `commandfor` names the target: it
then checks the next sibling. A FAIL there is a lead to inspect, not a verdict.
*Why:* "No ARIA is better than Bad ARIA" (APG Read Me First). Each row is a MUST NOT, NOT
RECOMMENDED or "only if" in AIH or the APG pattern linked in the row.
*From:* UXA-ARIA-01, -03, -04, -06, -07, N3, N7, N8, N10, N12, N13, A11Y-ANN-4.

**UX-A11Y-11 (MUST).** Write a custom widget (tabs, combobox, listbox, menu, tree, toolbar) only
when no native element fits. State in the PR which native element was rejected and why. Implement
every required key in the APG pattern, and ship a test that sends each key.

| Pattern | Required keys and roles (from the linked APG page, read 2026-11-27, Copyright 2026, undated) |
|---|---|
| [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | `tablist`/`tab`/`tabpanel`, `aria-selected`, roving `tabindex`. Left/Right move and wrap. Tab moves into the panel. Automatic activation only when the panel shows without latency |
| [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | `role="combobox"` on the input, `aria-expanded`, `aria-controls`, `aria-activedescendant`. Down opens or moves. Esc dismisses. Enter accepts. DOM focus stays on the input |
| [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | `option` children. Up/Down. Home/End strongly recommended above 5 options. Type-ahead recommended |
| [Menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) + [Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) | trigger `aria-haspopup="menu"` + `aria-expanded`. Enter/Space/Down open and focus the first item. Down/Up move. Enter activates and closes. Esc closes and returns focus to the trigger. Tab closes all menus |
| [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | button with `aria-expanded`. Enter and Space toggle |
| [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) | Space toggles. The label is stable |
| [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | one tab stop, arrows inside, 3 or more controls |

*Why:* "ARIA roles do not cause browsers to provide keyboard behaviors" (APG Read Me First).
*Verify:* a key-sending test per pattern that asserts `document.activeElement` and the state
attributes after each key. If no test exists, the rule fails.
*From:* UXA-ARIA-02, UXA-ARIA-08.

### Focus

**UX-A11Y-12 (MUST).** Never remove a focus indicator without drawing a replacement. Write focus
styles on `:focus-visible`, not bare `:focus`. The default recipe is
`outline: 2px solid <token>; outline-offset: 2px`. A replacement may move to an ancestor through
`:has(<child>:focus-visible)` or `:focus-within`. It must be an outline or a border change, never
a `box-shadow` alone, because forced colours suppress `box-shadow` (CSS-A11Y-01). `all: unset`
and `all: initial` on a focusable element remove its outline too, so they need the same
replacement. When a wrapper in another file draws the ring, put
`/* focus-ok: ring drawn by <selector> in <file> */` directly before the removing rule.
*Why:* 2.4.7 (AA), failure F78
([Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html),
2026-10-04). The 2px default comes from 2.4.13, which is AAA, so it is a recipe and not the floor.
On radix-ui/website, 37 of 88 `all: unset` rules are on controls whose only focus style is a
`box-shadow` (followup-q1).
*Verify:* two scripts generate leads. Neither is a gate on its own (followup-q1).
1. `python3 -I focus_outline.py <source dirs>` ([Appendix A1](#a1-focus_outlinepy-ux-a11y-12)).
   It reads `.css` files and `<style>` blocks. For each `outline: none|0` on a selector with
   `:focus`, `:focus-visible` or `:focus-within`, it looks in the same file for one of three
   replacements. (a) The same rule, or a focus rule on the same base selector, sets a non-`none`
   outline or a border. (b) A `:has(…:focus…)` rule names the element and draws an outline or a
   border. (c) A `:focus-within` rule on an ancestor draws one. The ancestor is found by
   descendant selector or by BEM `block__element` naming. Measured on Primer and Radix: 30 FAIL,
   of which 11 are real (precision 37%). It misses `.scss`, CSS nesting and `all: unset` (recall 11
   of 52). 14 of its 19 false positives are the `:focus:not(:focus-visible)` mouse-focus idiom.
2. `V3=1 node focus_outline_v2.mjs <root>` ([Appendix A7](#a7-focus_outline_v2mjs-ux-a11y-12)).
   It uses PostCSS, resolves nesting and reads `.scss`. It skips `:not(:focus-visible)` and
   `::-webkit-*` sub-parts, accepts a ring on `::before`/`::after`, and checks `all: unset|initial`.
   Measured on the same corpora: 17 FAIL on the outline class, 14 real, recall 14 of 14. Its
   precision of 82% was tuned on those corpora, so it is an upper bound. It does not read
   `<style>` blocks and has no BEM branch: on the fleet theme it flags `field.css:188`, which A1
   passes by BEM naming.
Run `python3 -I focus_outline.py --selftest` and A7 on its nine-case fixture first. Then run both
scripts and triage the union of FAIL rows. Either fix each row, or put a
`/* focus-ok: <reason> */` comment directly before the rule. The reason names the drawing
selector and file (`grep -rn '<selector>' <file>` must hit), or says why focus shows another way.
A listbox whose highlighted option shows focus through `aria-activedescendant` is one such case.
An element that cannot take focus (`fieldset`, `p`, a heading) is another. The rule passes when A1
exits 0 and A7 prints no `FAIL` row. Pass: `command-bar.css:141-143` with `:124-127`. Fail: a
lone `button:focus{outline:none}`. Scope limit: an `outline: none` with no focus pseudo-class is
not seen. One such case is the asciinema player's `pre.ap-term-text`. UX-A11Y-13's browser pass
catches those.
*From:* focus rules 1, 2, 4, 15.

**UX-A11Y-13 (MUST).** The focus indicator reaches 3:1 against the colour it sits on, in every
theme and on every surface. For a ring drawn inside the element (negative `outline-offset`), that
surface is the element's own background. Every element with `tabindex="0"`, including scrollable
`pre` blocks and embedded players, must show a visible change when focused.
*Why:* 1.4.11 (AA). An author-modified ring loses the user-agent exemption
([Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html),
2026-10-04).
*Verify (built, in a browser):* Tab through each page at 1280 and 390 px. Pixel-diff the focused
element and a 40px frame against its blurred state with
`PAD=40 node focus_diff.mjs <url> <theme> <width> '<regex>'` ([Appendix A5](#a5-focus_diffmjs-ux-a11y-13)). A stop
that changes 0 pixels is a lead, not a verdict. Resolve it with two reads. (1) Read the computed
style of the element and of its ring owner. `outline-style: none`, no `box-shadow` and no border
change mean a missing ring, which fails this rule. (2) Read the effective opacity of the element
and all its ancestors when focus arrives, with `focus_opacity.mjs` (UX-A11Y-36). A value below
0.99 means an invisible stop, which fails UX-A11Y-36. Pass `clip` to the screenshot in page
coordinates (`rect + scrollX/scrollY`), never in viewport coordinates. A stop that passes both
reads and still shows 0 pixels is a harness artefact (followup-q0). Then compute the
ring colour against `getComputedStyle(el).backgroundColor` (negative offset) or against the
parent background. Fail below 3.0, unrounded. Run
`THEMES=light,dark node measure.mjs <base-url> <page,page> out.json` ([Appendix A4](#a4-measuremjs-ux-a11y-13--20)) and read
`focus[].ringRatio` and `ringOwn`.
*From:* focus rules 3, 19.

**UX-A11Y-14 (MUST).** Every `position: sticky|fixed` header, footer or banner comes with
`scroll-padding-top` or `scroll-padding-bottom` on the scroller, set to at least the bar's height.
*Why:* 2.4.11 (AA) fails when a focused element is entirely hidden. C43 is the sufficient
technique and F110 the failure
([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html),
2026-06-15).
*Verify:* `grep -rnE 'position:\s*(sticky|fixed)' src`. For each hit, `grep -rn 'scroll-padding' src`
must hit. Then Tab to the last link under the bar: it must be at least partly visible.
*From:* focus rule 5.

### Contrast and colour

**UX-A11Y-15 (MUST).** Normal text reaches 4.5:1 and large text (18pt, or 14pt bold) reaches 3:1
against its real background. Check every theme and every surface the text sits on (page, card,
code block, panel). Blend alpha or `color-mix(… N%, transparent)` text onto its ground before
computing. Compare unrounded: 4.499 fails. Placeholder, hint, caption and syntax colours are in
scope. Disabled controls are exempt.
*Why:* 1.4.3 (AA) ([Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
2026-10-04). Low contrast is on 83.9% of home pages (WebAIM).
*Verify:* write every text token × surface token × theme as a line `<fg> <bg> <label>` in
`pairs.txt`. Then `python3 -I wcag_contrast.py 4.5 < pairs.txt` ([Appendix A2](#a2-wcag_contrastpy-ux-a11y-15--16)) must exit
0. For large-text pairs the threshold is 3. The script blends `#rrggbbaa` alpha onto the ground
and compares unrounded. A text pair missing from the list is a finding. The fleet's own pair list,
with the hex values read from its token files, is `contrast.py` in
`product-audit/ui-code-posture.md` Appendix C.
*From:* focus rules 6, 7.

**UX-A11Y-16 (MUST).** When a boundary or indicator is the only thing that identifies a control,
give it 3:1 against its ground. Examples: an input's border, a checkbox mark, a radio dot, the
glyph of an icon-only button. Borders on controls that carry a text label are exempt (C4).
*Why:* 1.4.11 (AA).
*Verify:* `python3 -I wcag_contrast.py 3 < borders.txt` (Appendix A2), with each
`--border-control`-class token on each surface, exits 0. `#767676` on white passes (4.542); `#aaa`
fails (2.323).
*From:* focus rule 8.

**UX-A11Y-17 (CONSIDER; was MUST NOT, demoted in revision 1, and absorbs UX-A11Y-21).** The
gates are the WCAG 2 ratios (UX-A11Y-15, -16) and the 24×24 hit box (UX-A11Y-20). Treat an APCA
Lc value, a WCAG 3 draft value and a 44×44 target as advisory extras. Print an Lc value next to
the WCAG 2 ratio when it helps. Size primary and frequent controls to 44×44 under
`@media (pointer: coarse)` when it helps. Never report any of these as a pass over a failing WCAG 2
ratio, and never call 44 px an AA requirement.
*Why:* see Verdict 5 and Verdict 7. The APCA library describes itself as beta
([apca-w3](https://github.com/Myndex/apca-w3), 0.1.9, 2022). 2.5.5 is AAA
([Understanding 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html),
2026-09-06). No fleet surface is touch-first, and no fleet violation of either half was measured.
*Verify:* `grep -rnE 'apca|APCA' <check script>` hits only advisory output. Grep the agent's prose
for "44" next to "AA".
*From:* focus rules 9, 11.

**UX-A11Y-18 (SHOULD).** Declare `color-scheme` on any page that sets its own colours, matching
the scheme it paints.
*Why:* without it, the user-agent canvas, scrollbars and form controls render for a light canvas
under dark author colours. Measured: grim-gui `.hint #555` is 7.46:1 on white and 2.51:1 on a
dark canvas (`ui-code-posture.md` §4).
*Verify:* `grep -rn 'color-scheme' src` hits the root rule. Where it is absent, compute ratios on
both canvases.
*From:* focus rule 17.

**UX-A11Y-19 (MUST).** Pair every colour-coded state with a second, non-colour cue: a text word, a
differently shaped icon, a pattern, a position, or `aria-invalid` plus a visible message. This
covers error, success, warning, selected, required, planned and chart series. Links inside running
text keep an underline. The alternative is 3:1 against the surrounding text plus a non-colour cue
on hover and focus (G183).
*Why:* 1.4.1 (Level A) ([Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html),
updated 2025-09-16). The page counts a lightness difference as a cue "as long as the difference in
relative luminance between the colors leads to a contrast ratio of 3:1 or greater".
*Verify (built, in a browser):*
- `WAIT=load CHR=<chrome> node colour_only_v2.mjs <url> …` ([Appendix A6](#a6-colour_only_v2mjs-ux-a11y-19)) exits 0.
  Exit 1 means at least one FAIL. Exit 2 means a page failed to load, and that run proves
  nothing. It runs in light and dark.
  It pairs each element in a state with a peer of the same tag and the same classes without that
  state. A state is a class token such as `active`, `selected`, `error` or `planned`, or
  `aria-current`, `aria-pressed`, `aria-selected` or `aria-invalid`. The script reports FAIL when
  the pair differs in colour and in nothing else. Nothing else means no font, decoration, border
  width or style, outline, background image, child element, or pseudo-element `content`,
  `background-color`, `width` or `height`. A colour pair counts as a cue only when both colours
  are first blended onto the page background (alpha applied) and the ratio is at least 3. A pair
  with no visual difference on the element itself is reported as INFO. INFO is a lead: read the
  parent, because a cue drawn on the parent `li` is not seen. States that script sets after load
  are not seen, nor is a state set by a `data-*` attribute on a wrapper. Before you rely on it,
  run it on the R1 to R4 fixture in A6: it must print exactly two FAIL lines per colour scheme
  (R1 and R3), no INFO line, and exit 1.
- Prose links: axe `link-in-text-block` (WCAG 1.4.1, tag `wcag2a`, axe-core 4.14) reports no
  violation. `grep -rnE 'text-decoration:\s*none' src` on selectors that match prose links (`p a`,
  `.prose a`, `.sl-markdown-content a`) finds none without a replacement cue.
- Form errors: every `[aria-invalid="true"]` has an `aria-describedby` or `aria-errormessage` that
  resolves to an element with non-empty text.
*From:* focus rules 13, 14.

### Target size

**UX-A11Y-20 (MUST).** Every pointer target has a rendered hit box of at least 24×24 CSS px, or a
recorded exception: spacing, inline, an equivalent control, user-agent default, or essential.
Measure the rendered box, not the token or the glyph. Enlarge the hit area with padding, a
wrapping `<label>` or a pseudo-element.
*Why:* 2.5.8 (AA). Under the spacing exception, a 24px circle centred on each undersized target
must not intersect any other target or circle
([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
2026-11-02).
*Verify (built):* get `getBoundingClientRect()` for every `a[href], button, input, select, summary, [tabindex], label`
at 1280 and 390 px. For each box under 24, run the circle test. Two undersized neighbours need a
centre distance of at least 24. An undersized target needs a gap of at least `12 − size/2` to a
full-size neighbour. Each remaining box needs a named exception. Run
`node measure.mjs <base-url> <page,page> out.json` ([Appendix A4](#a4-measuremjs-ux-a11y-13--20)) and read `small[]`: an
entry with a non-null `spacingFail` and no recorded exception fails.
*From:* focus rules 10, 12, 20.

**UX-A11Y-21 (retired in revision 1).** Folded into UX-A11Y-17, which now carries the 44×44
advice and the "never call 44 px AA" guard. Do not reuse this number.

### Announcements and motion

**UX-A11Y-22 (MUST).** Announce a discrete result by writing text into a container that holds
`role="status"`, or `role="alert"` for errors (UX-A11Y-23), and that is present and empty in the
initial markup. Results include copied, saved, N results, done loading and failed to load. Never
create the region and fill it in one step. When script must create it, set the text in a later
task. Never move focus only to announce. Do not announce expand, collapse, tab selection or a
dialog that takes focus: their ARIA state already does that.
*Why:* 4.1.3 (AA) ([Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html),
2026-10-04). [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) (updated
2026-01-12) test 1: "Check that the container destined to hold the status message has a role
attribute with a value of status before the status message occurs." For errors,
[ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19) (updated 2026-04-27): "The error
container must be present in the DOM on page load for the error message to be spoken by most
screen readers." Neither page says whether a role added together with its content is announced.
Both quotes were checked in the raw HTML on 2026-11-27, and the phrase "announced reliably" is on
neither page (`curl -sSL <url> | grep -ci 'announced reliably'` prints 0 for both).
*Verify:*
- For each handler that changes visible status text, `grep -nE 'role="(status|alert)"|aria-live'`
  finds the container in the same component or in the page announcer.
- Error containers. List each element that renders an error message, for example
  `grep -rnE 'class="(error-state|row-error)"' <webview> | grep -v 'role="alert"'` in the fleet
  webview. The check passes only when the list is empty, or when each hit sits inside a wrapper
  with `role="alert"` that renders in every state of the component and starts empty. An error
  element that carries `role="alert"` on its own line is created with its content. It fails
  ARIA19 test 1. Fix it by rendering the wrapper unconditionally and writing the text into it.
- Status containers. For each `grep -rnE 'role="status"'` hit, read the template and confirm the
  element renders in every state of the component, not only on one branch.
- Fail patterns: `insertAdjacentHTML(…role="status"…>text<`, and `createElement` followed by
  `role` and `textContent` in one block.
- Harness (simulated): the region's `textContent === ''` before the update. The harness source is
  in the repository, in the section "Harness source" of
  [announcements-and-motion.md](ux-a11y-authoring/announcements-and-motion.md#harness-source).
  The section holds the full `announce.test.mjs` and states the `vitest.config.mjs` settings
  (`environment: 'jsdom'`, `include: ['announce.test.mjs']`). Save both into one directory, copy
  the theme's `cycle-button.mjs` beside them as `cycle-button.copy.mjs`, and replace the absolute
  `W` path with a repo-relative one. Then run
  `npm i -D vitest jsdom @guidepup/virtual-screen-reader` and `npx vitest run`. The dive's
  working copy under `~/.cache/…/ux-announce-harness/` is gone: `ls` on 2026-11-27 reports
  "No such file or directory". Neither revision 1 nor wave 2 re-ran the harness. Its spoken output is
  virtual-reader output and is labelled UNVERIFIED against real readers. The DOM-contract
  assertions do not depend on the virtual reader.
*From:* A11Y-ANN-1, -2, -7, -8, -11.

**UX-A11Y-23 (MUST).** Use `role="alert"` only for errors and time-critical messages, and
`role="status"` for success and progress. Never put `aria-live="assertive"` on success or on
content that is not time-sensitive. When focus moves to an error summary, the summary needs no
`role="alert"` as well (cross-reference: forms, UX-STATE).
*Why:* the 4.1.3 page lists `alert` or `assertive` on unimportant content as a failure.
*Verify:* `grep -rnE 'role="alert"|aria-live="assertive"' src`. Read each hit against the message
its handler writes. A message of "saved", "copied", "done" or a count is a fail.
*From:* A11Y-ANN-3, A11Y-ANN-5.

**UX-A11Y-24 (SHOULD).** To announce identical text twice, clear the region and set the text
again in a later task. Never suppress the repeat.
*Why:* a region whose text does not change is not re-announced. The fleet documents this gap in
its own source (`command-bar.mjs`, comment on `say`).
*Verify (harness, simulated):* set the text, clear it, `await setTimeout(0)`, set the same text,
and expect two `polite:` entries. The harness source and how to run it are under UX-A11Y-22. This
is virtual-reader output: label it UNVERIFIED against real readers. A source check that needs no
harness: each handler that may repeat a message assigns `''` to the region before it sets the
text in a later task (`setTimeout`, `requestAnimationFrame` or `await`).
*From:* A11Y-ANN-6.

**UX-A11Y-25 (MUST).** Movement, blinking, scrolling or auto-updating content that starts by
itself and runs more than 5 seconds beside other content has a visible pause, stop or hide
control. Never put `animation-iteration-count: infinite` on a decorative element. Video starts
only on the user's action.
*Why:* 2.2.2 (Level A) ([Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
A lone loading indicator is exempt. DOC-EX-15 already covers recording players.
*Verify:* `grep -rnE 'infinite|autoplay|setInterval\(' src`. Each hit must be a lone loader,
removed under `reduce`, or placed beside a control whose name matches `/pause|stop|hide/i`.
*From:* A11Y-ANN-15.

**UX-A11Y-26 (MUST NOT).** Never write an effect that alternates luminance or saturated red more
than three times in any one second. If an effect cannot be shown to be under the threshold, use a
static badge or a single slow fade.
*Why:* 2.3.1 (Level A), seizure risk. The normative limit is 0.006 steradians. 341×256 px on a
1024×768 screen is only an estimate
([Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html),
updated 2025-09-17). The page defines a flash as "a pair of opposing changes in relative
luminance". Content passes with "no more than three general flashes and / or no more than three
red flashes within any one-second period". The 0.34 s in the check is derived, not sourced. A
keyframe cycle that goes A to B and back is one flash per iteration, so more than three per second
means a duration under 1/3 s (0.333 s). The check rounds up to 0.34 s for margin. With
`animation-direction: alternate`, one iteration is half a flash, so the true limit is under
1/6 s. A 0.34 s threshold flags those too, which errs toward flagging.
*Verify (heuristic):* `grep -rnE '@keyframes' -A12 src`. Flag keyframes that swap `opacity`,
`background`, `filter` or `color` between near-opposite values with a repeating
`animation-duration` under `0.34s`. This check is a heuristic. It cannot see a duration set
through `var(--…)`, a Web Animations call, a `setInterval` that toggles a class, or video. For
those, `git grep -nE "animation-duration:\s*var\(|\.animate\(|setInterval\("` lists the sites to
read. Its silence does not prove a pass.
*From:* A11Y-ANN-16.

**UX-A11Y-27 (SHOULD; MUST in a codebase that has a reduced-motion token layer).** Gate every
motion that moves, scales, rotates, pans or parallax-scrolls. Use one of three mechanisms:
`@media (prefers-reduced-motion: no-preference)`, an opacity-only replacement under `reduce`, or a
duration custom property that a `reduce` block sets to `0s`. Never bypass an existing token layer
with a literal duration. In script, read `matchMedia('(prefers-reduced-motion: reduce)')` and
listen for `change`. This covers Web Animations, `requestAnimationFrame` and smooth
`scrollIntoView`. Feature-detect `document.startViewTransition` and skip it under `reduce`. In a
VS Code webview, also honour the `vscode-reduce-motion` body class. Do not write a blanket
`* { animation: none !important }`: reduce means replace, and loaders and focus feedback must
survive.
*Why:* 2.3.3 is AAA, technique C39
([Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html),
2025-09-16). MDN shows a replacement, not removal
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), modified
2026-06-10). The body class is from the
[VS Code webview guide](https://code.visualstudio.com/api/extension-guides/webview) (2026-11-25).
Severity: see C5.
*Verify:*
- `git grep -nE '(animation|transition)\s*:' -- '*.css' '*.astro' '*.svelte' '*.vue' '*.tsx'`. Each
  hit passes if it sits in a `no-preference` block, uses a `var(--…duration…)` that a `reduce`
  block zeroes, or animates only `opacity`/`color`/`background-color`.
- Literal timings that bypass the token layer: `grep -rnE 'transition:\s*[^;]*[0-9.]+m?s' src | grep -v 'var(--'`.
- `git grep -nE "\.animate\(|requestAnimationFrame|behavior: ?'smooth'|startViewTransition"`. Each
  file with a hit must also hit `prefers-reduced-motion`, and `startViewTransition` also
  `typeof document.startViewTransition`.
*From:* A11Y-ANN-12, -13, -14, -17, -20.

### Page structure and consistency

**UX-A11Y-28 (MUST).** Every page template sets a valid BCP 47 `lang` on `<html>` and a non-empty
`<title>` that names the page's topic, followed by the site name. Templates include hand-written
`public/*.html` pages and served fragments. A home-page title says what the site is, not only its
name.
*Why:* 3.1.1 and 2.4.2 (Level A)
([3.1.1](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html),
[2.4.2](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html)). Missing `lang` is on
13.5% of home pages (WebAIM).
*Verify (built):* `grep -L '<html[^>]*lang="[a-z]' $(find . -name '*.html')` and
`grep -L '<title>[^<]\+' $(find . -name '*.html')` both list nothing. Reading heuristic for titles:
`Yank a Version | ocx.sh` passes, a bare `ocx.sh` fails.
*From:* PS-01, PS-02, PS-12 (lang part).

**UX-A11Y-29 (SHOULD, house policy; was MUST, demoted in revision 1).** Render exactly one
`<main>` per page, and put all other perceivable content in a landmark. Render at most one
top-level `banner` and one top-level `contentinfo`. A `<header>`/`<footer>` inside `article`,
`aside`, `main`, `nav` or `section` is not a landmark. Fragments marked `noindex` are exempt.
*Why:* [APG landmark regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/). WCAG
does not require a landmark count. ARIA11 is one sufficient technique for 1.3.1 and 2.4.1, not a
requirement ([Understanding 2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)).
The axe rules `landmark-one-main`, `region` and `landmark-no-duplicate-banner` are all in the
"Best Practices" table, tagged `best-practice` with no WCAG tag
([axe-core rule-descriptions](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md),
4.14, fetched 2026-11-27). Severity therefore matches UX-A11Y-31, which is the same kind of rule
(Verdict 4).
*Verify (built):* `for f in $(find . -name '*.html'); do [ $(grep -o '<main[ >]' $f | wc -l) -ne 1 ] && echo $f; done`
lists only fragments. Also axe `landmark-one-main`, `region` and `landmark-no-duplicate-banner`.
*From:* PS-03, PS-08 (count part).

**UX-A11Y-30 (SHOULD).** When a landmark role appears more than once, give each instance a unique
name, and leave the role word out of it ("Site", not "Site navigation"). Two navs share a name
only when their link sets are identical.
*Why:* APG landmark regions.
*Verify (built):* `grep -o '<nav[^>]*>' f` shows a label on each `nav` when there is more than one.
Also axe `landmark-unique`.
*From:* PS-08 (naming part).

**UX-A11Y-31 (SHOULD).** Render exactly one `<h1>` per built page. On Starlight, the page title is
already `<h1 id="_top">`. A hero heading is therefore an `h2`, or it is the only `<h1>` and carries
`id="_top"`. Demote headings in rendered user content (a README, release notes) so that the page
keeps one `<h1>` and its own sections stay above that content. Never skip a level downward, and
never pick a level for its size.
*Why:* axe `page-has-heading-one` and `heading-order` (best practice).
[2.4.6](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html) does not require a
single `<h1>`. That makes this house policy, backed by measured bugs.
*Verify (built):* `for f in $(find . -name '*.html'); do n=$(grep -o '<h1[ >]' $f | wc -l); [ $n -ne 1 ] && echo $f $n; done`
lists nothing. A heading-order list must not step by more than +1.
*From:* PS-04, PS-05, PS-06.

**UX-A11Y-32 (MUST, house policy).** On every template that repeats a header or navigation, make
a skip link the first focusable element, hidden until it gets focus, pointing at an id that
exists. Hand-written standalone pages that carry the site header count as templates. When
overriding Starlight's `PageTitle`, keep `id="_top"` and render the default inside the override.
When overriding a Material partial, keep `{{ super() }}`. Material emits its skip link only when
the page has a table of contents.
*Why:* see C10. [Starlight overrides](https://starlight.astro.build/reference/overrides/) says
implementations "should ensure they set `id="_top"`". Material's
[`base.html`](https://raw.githubusercontent.com/squidfunk/mkdocs-material/master/src/templates/base.html)
has `{% if page.toc | first is defined %}` (master, fetched 2026-11-27).
*Verify (built):* `grep -Li 'class="[^"]*skip' $(find . -name '*.html')` lists only fragments. For
each `href="#X"` on a skip link, `grep -c 'id="X"'` is 1. Also axe `skip-link`.
*From:* PS-07, PS-13.

**UX-A11Y-33 (MUST).** Within one set of web pages:
- Keep repeated navigation and help items in the same relative order on every page. Inserting or
  omitting an item is allowed; reordering is not.
- Give one function one name, and one name one function. No two links in the chrome may share a
  text and point to different targets. No function may carry two labels across the set.
Whether a new site or subdomain belongs to an existing set is not decided here. It is an owner
question (see "What an agent must ask a human", Set membership). Until the owner answers, apply
this rule as if the site is in the set. (Revision 1 moved this clause out of the MUST. It had no
pass or fail.)
*Why:* 3.2.3 (AA), 3.2.4 (AA), 3.2.6 (A)
([3.2.3](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html), 2026-06-28;
[3.2.4](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html), 2026-10-04).
A "set" means a shared purpose plus the same author or organisation
([WCAG 2.2 glossary](https://www.w3.org/TR/WCAG22/)).
*Verify (built):*
- Extract the ordered `(text, href)` list of the header, footer and mega-menu from two built pages
  per site in the set. Intersect them and diff the order: any inversion fails.
- Fail on any text that maps to two different hrefs (bullet 2, first half).
- Resolve every href to an absolute URL, then fail on any URL that carries two different link
  texts across the set (bullet 2, second half). This catches `index` against `packages` when both
  point at the same package list. Two different URLs for one function are not visible to this
  check, so record the function-to-URL map once per set.
- Reading heuristic: `catalog` plus `catalog app` passes; `catalog` twice fails.
*From:* PS-09, PS-10, PS-15.

**UX-A11Y-34 (SHOULD).** Leave an entry for a page that does not exist out of persistent
navigation (header, mega menu, drawer, sidebar). On a hub, roadmap or status page, render it as
non-link text whose visible and accessible text contains the word "planned". Never use
`href="#"`, `href=""`, a link to a 404 page, or an `aria-disabled` link for it.
*Why:* 4.1.2 and 1.4.1. A non-link entry that differs from links only by a missing icon has no
cue for a screen-reader user or a colour-blind user. MDN says to use a hyperlink only for a real
URL. This is house policy (C3).
*Verify (built):* for each element rendered from a `planned: true` entry, `grep -c planned` in its
subtree is at least 1. In persistent navigation, the count of non-anchor `…__link` items is 0.
`grep -E '<a[^>]*href="(#|)"'` is empty.
*From:* PS-11, UXA-LINK-02.

### Editor webviews

**UX-A11Y-35 (MUST; the colour clause is house policy; the focus-colour clause is SHOULD).**
Inside a VS Code webview:
- MUST: apply UX-A11Y-01 to -34 in full.
- MUST, house policy: take every colour from a `--vscode-*` variable. A hex value may appear only
  as a `var()` fallback.
- MUST: test the webview in the `vscode-high-contrast` theme.
- SHOULD, until a rendered webview confirms the variable: draw focus from
  `var(--vscode-focusBorder)`.
*Why:* the platform adds no keyboard or naming layer. Its guideline asks views to "follow
accessibility guidance (color contrast, ARIA labels, keyboard navigation)" and to "Ensure all
elements in the view are themeable"
([VS Code webview UX](https://code.visualstudio.com/api/ux-guidelines/webviews), updated
2026-11-25). The colour clause is house policy. WCAG does not require theme variables. The
platform's "themeable" guideline is the source, and a literal colour cannot follow a
high-contrast theme (Verdict 4c). For `focusBorder`, the VS Code source builds each webview
variable as `'vscode-' + entry.id.replace('.', '-')`
([themeing.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/webview/browser/themeing.ts),
main, fetched 2026-11-27). That gives `--vscode-focusBorder`. The fleet webview already uses it at 9
sites (`grep -rn 'var(--vscode-focusBorder' src/webview --include='*.css' | wc -l`, run
2026-11-27). No one has read its computed value in a rendered webview, so the clause stays SHOULD
until someone does.
*Verify:*
- Colour: `grep -rnE '#[0-9a-fA-F]{3,8}\b' src/webview --include='*.css' | grep -v 'var(--vscode-' | grep -vE ':[0-9]+:\s*(/\*|\*)'`
  returns 0. The last filter drops comment lines.
- Names: run `python3 -I scan_wv.py` (Appendix A3) in `src/webview`. Classes `UNNAMED` and
  `title-only` must both be 0.
- High contrast: `git ls-files | xargs grep -ln 'vscode-high-contrast'` lists a test file. That
  test renders the webview with that body class and runs the UX-A11Y-15 and -16 checks on it.
- Focus colour (SHOULD): every focus rule found by `focus_outline.py` (Appendix A1) that draws an
  outline or border uses `var(--vscode-focusBorder)`.
*From:* UXA-WEBVIEW-01, focus rule 16. Revision 1 dropped the dive's "expose actions as commands"
clause. It had no check, and the platform text ("Use command actions in the toolbar and in the
view") is about toolbar placement, not accessibility.

### Visibility of the focused control

**UX-A11Y-36 (MUST; added in revision 2).** A control that can take keyboard focus is visible
whenever it has focus. A container that a scroll position, a hover or an animation fades,
translates or reveals must show its focused descendants at full opacity. Use one of three fixes:
- Add `:focus-within { opacity: 1; transform: none; }` to the container.
- Make the visible state the default and let motion only enhance it.
- Make the hidden controls `inert` until they are revealed.
Never fix it by writing the scroll variable on `focusin`, because the scroll code overwrites it.
*Why:* 2.4.7 (AA) requires "a mode of operation where the keyboard focus indicator is visible"
([WCAG 2.2](https://www.w3.org/TR/WCAG22/#focus-visible), Rec 2024-12-12). Its purpose is "to help
a person know which element has the keyboard focus"
([Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), updated
2026-10-04). A ring on a control at opacity 0 cannot do that. Calling this a 2.4.7 failure is the
reading of this catalog and of followup-q0, not W3C text. Measured in followup-q0 on ocx.sh: the
finale trigger takes focus at effective opacity 0 at default motion, in both themes, at 1280 and
390 px. The `:focus-within` fix gives opacity 1 and survives a scroll away and back. The `focusin`
fix reverts to 0 when the user scrolls back.
*Verify (built, in a browser):* `CHR=<chrome> node focus_opacity.mjs <url> …`
([Appendix A8](#a8-focus_opacitymjs-ux-a11y-36)) exits 0 at default motion. It Tabs through every
stop in light and dark, at 1280 and 390 px. After each Tab it waits 300 ms, then multiplies
`opacity` over the element and its ancestors. A product below 0.99, or `visibility: hidden` or
`content-visibility: hidden` on the chain, is a FAIL. The output names the outermost fading
ancestor (`low`). Run it again with `MOTION=reduce`, which must also exit 0. Exit 2 means a page
failed to load. Static pre-check that lists candidate containers:
`grep -rnE 'opacity:\s*(0\s*(;|!|$)|var\()|scroll-timeline|animation-timeline' src`, then check
each container for focusable descendants. On the fleet theme it lists 66 lines, among them
`ScrollStage.astro:117` and `ScrollFade.astro:24` (run 2026-11-27). Scope limit: `clip-path`, a zero-size clip and an off-screen
position are not seen. A stop that passes here and still shows 0 changed pixels in
`focus_diff.mjs` needs a reading.
*From:* followup-q0 (new rule; it closes the default-motion branch that UX-A11Y-27 does not cover).

### Dropped, with reason

| Dive ID | Why dropped |
|---|---|
| UXA-TEST-01, focus rule 18, PS-16 | Gate placement goes to UX-VERIFY (C7) |
| UXA-BTN-01 | Goes to the forms topic (C8) |
| focus rule 15 | Restates CSS-A11Y-01 (C9). Its behavioural part is folded into UX-A11Y-12 |
| PS-12 (`noindex` and sitemap) | That is SEO, so marketing. Only the `lang` part is kept, in UX-A11Y-28 |
| PS-14 (pin `theme.language`) | Low yield. No measured harm, and the default is `en` |
| A11Y-ANN-18 (run the virtual reader everywhere) | A verification method, used inside UX-A11Y-22 and -24. Whether a real screen-reader pass is required is an owner decision |
| A11Y-ANN-19 (document every animation) | No behaviour change that can be checked |
| A11Y-ANN-7 (one-region count heuristic) | Its threshold had no source (C6) |
| UXA-WEBVIEW-01 "expose actions as commands" (was in UX-A11Y-35) | No check separates pass from fail, and the platform source is about toolbar placement (revision 1) |
| UX-A11Y-21 as a separate ID | Retired. Its content now sits in UX-A11Y-17 (revision 1) |

## Applied to the fleet

Paths: `T:` = `ocx-sh/website/packages/theme/src/`, `W:` = `grimoire-rs/vscode/src/webview/`,
`G:` = `grimoire-rs/grimoire/docs/`. All rows were measured on 2026-11-27 in the dive or audit
named.

### Violated

| Rule | Evidence | Source |
|---|---|---|
| UX-A11Y-01 | `W:render.ts:1745` is a `div.member-box` with `role="button" tabindex="0"` and a hand-written Enter/Space handler (re-read 2026-11-27). `W:render.ts:1953` and `:1986` are `span`s carrying `data-action` | native-widgets §8.1, §8.3 |
| UX-A11Y-02 | `W:render.ts:1408`, `:1432` and `:1523` are `<a href="#" data-action>`. The first two open a URL, so the fix is a real `href`. The third opens details, so it becomes a `<button>` | native-widgets §8.1 |
| UX-A11Y-03 | Five settings controls have no label association: `W:settings/render.ts:87` (`select`) and `:102`, `:108`, `:139`, `:487` (inputs). Each title is a `span.row-title`. `W:render.ts:1146` is a `vscode-textfield` named only by its placeholder (library mapping not verified) | native-widgets §8.1, §8.3 |
| UX-A11Y-04 | 19 of 72 webview buttons are named only by `title`, for example `W:render.ts:334`, `:465`, `:594` and `W:settings/render.ts:71`. `W:settings/render.ts:137` `button.chip-remove` has no name at all | native-widgets §8.1 (scan_wv.py) |
| UX-A11Y-06 | `title="Manage"` appears 3 times and `title="More options"` 3 times in `W:` | native-widgets UXA-NAME-03 |
| UX-A11Y-07 | The webview detail tabs (`W:render.ts:2007-2033`) mark the selected tab with only the `active` class: no `tablist`, no `aria-selected`, no `aria-pressed`. The card, context and scope menu triggers (`W:render.ts:320`, `:334`, `:1550`) open a menu with no `aria-expanded` (`grep -c aria-expanded render.ts` gives 2 in the whole file, re-run 2026-11-27) | native-widgets §8.3; re-checked |
| UX-A11Y-13 | Grimoire docs scrollable code blocks: `outline: 3px solid rgb(18,45,66)` at offset −3px on `rgb(27,29,44)` is 1.18:1 (computed values). The asciinema terminal `pre.ap-term-text` (tabindex 0) is confirmed by three separate readings. (1) 0 pixels change on focus. (2) The recorded computed style is `outline-style: none`, no `box-shadow`, `border` 0px. (3) In source, `G:public/asciinema-player.css:111-124` sets `outline: none` on `div.ap-term pre.ap-term-text` with no condition, and the file has 0 `:focus` rules (`grep -c ':focus' public/asciinema-player.css` gives 0, run 2026-11-27). The second `ocx-cmdbar__trigger` (0 pixels) is not a ring defect: its ring is drawn. It is a UX-A11Y-36 violation, listed below | focus-contrast §1 (headless Chromium); `ux-a11y-fcts/grim.json` focus records; source re-read in revision 1; followup-q0 |
| UX-A11Y-15 | `G:public/start.html:256` is text at 45% alpha, 3.91:1 | ui-code-posture §4 |
| UX-A11Y-18 | `grimoire-rs/grim-gui/src/styles.css` declares no `color-scheme`. `.hint #555` is 2.51:1 if the webview paints dark | ui-code-posture §1, §4 |
| UX-A11Y-20 | On the OCX team page, the sidebar links "Overview" and "Get in touch" are 236×23.6 px, stacked with gap 0 (circles overlap by 0.38 px). The Grimoire `sl-anchor-link` heading anchors at 390 px are 16.5×24 and 14.1×20.4, touching the heading link | focus-contrast §3 |
| UX-A11Y-22 | grim-gui renders its error view with no live region. `grep -rnE 'role=\|aria-live\|aria-busy' src index.html` in `grim-gui` at `edda90d` (2026-11-26) prints nothing. The error branch is `src/view.ts:23-30`, mounted by `src/main.ts:11-23`. The webview at `grimoire-rs/vscode` `9230dcd` (2026-11-24) has 3 live elements. (1) `W:render.ts:1219`, `role="status"` with `aria-live` and `aria-busy`, added in `2c9c56c` (2026-10-18). It renders only on the paging branch (`W:render.ts:1190-1197`), so it is created in the same render that fills it. (2) `W:render.ts:1221`, `role="alert"` on the paging failure. (3) `W:settings/render.ts:522`, `role="alert"` on the add-registry error, created with its content. The page-level error states have no live region: `W:render.ts:1177` (results), `:2049` (details) and `W:settings/render.ts:656` (settings). Nor do the settings row errors `:181` and `:346`. The error-container grep in the Verify prints these 5 hits | ui-code-posture smell 1; `ux-interface-states/empty-error-notification.md`; followup-q2 (re-measured 2026-11-27) |
| UX-A11Y-36 | `focus_opacity.mjs` (Appendix A8) on the built pages, run 2026-11-27, exit 1, 30 FAIL lines. (1) ocx.sh `index.html`: the second `ocx-cmdbar__trigger` sits in `.ocx-stage__finale` at opacity 0 (`T:components/ScrollStage.astro:111-118`, written per frame by `T:components/ui/scroll.mjs:170`). It fails in light and dark, at 1280 px (scroll y 1002) and at 390 px (y 1136). (2) ocx.sh `index.html` at 390 px only: a `button` in `.ocx-fade.lp-hero__term` has effective opacity 0.066 at scroll y 411 (`T:components/ScrollFade.astro:24`, `opacity: var(--ocx-fade-o, 1)`). (3) Grimoire docs `index.html` and `quickstart.html`, all four theme and width runs: the asciinema Play, Keyboard shortcuts and Fullscreen buttons have opacity 0. `div.ap-control-bar` is `opacity: 0` (`G:public/asciinema-player.css:171-188`) and shows only under `.ap-hud`. A probe found `ap-hud` still absent 3 s after Tab. With `MOTION=reduce`, ocx.sh `index.html` exits 0 (0 FAIL, 32 or 33 stops). `apps/` and `integrations/` give 0 FAIL. The player is vendored, and DOC-EX-16 owns player controls. The finding is listed here because the rule catches it | followup-q0 (finale, with the `:focus-within` fix verified); revision 2 (full run) |
| UX-A11Y-24 | `T:components/ui/command-bar.mjs:128-131`: a second copy inside the 2 s window writes the same text and is not re-announced, as the source comment itself says | announcements §2 |
| UX-A11Y-28 | The catalog home `<title>` is the bare `ocx.sh`. `site/dist/_shell/v1/<rev>/nav.html` has no `lang` | page-structure §3; ui-code-posture §3 |
| UX-A11Y-29 (SHOULD finding) | `G:public/start.html` and `G:public/privacy.html` have no `<main>` (`grep -c '<main'` gives 0 and 0, re-run 2026-11-27) | page-structure §3 |
| UX-A11Y-35 (high-contrast test) | No tracked file in `grimoire-rs/vscode` mentions `vscode-high-contrast` (`git ls-files \| xargs grep -ln 'vscode-high-contrast'` lists nothing, run 2026-11-27) | revision 1 |
| UX-A11Y-30 | The nav label `ocx sections` is used for two navs with different link sets (`apps/index.html`) | page-structure §3 |
| UX-A11Y-31 | The grimoire.rs landing has 2 `<h1>`: the Starlight title plus `G:src/pages/index.astro:77`. 3 of 11 catalog package pages have 2 `<h1>` (README `#`), and the "Search" `h2` comes before the `h1` on all 11 | page-structure §3; ui-code-posture §3 |
| UX-A11Y-32 | There is no skip link on `G:public/start.html`, `G:public/privacy.html` or the index.grimoire.rs home | page-structure §3 |
| UX-A11Y-33 | In the ocx.sh header, `catalog` points to both `/catalog/` and `/apps/catalog/`. grimoire.rs uses `index`/`source` where index.grimoire.rs uses `packages`/`github` for the same functions | page-structure §4 |
| UX-A11Y-34 | All 8 `planned: true` entries render in the mega menu and in `nav.html` as `<span class="ocx-mega__link">` with the label only. `grep -c planned` on `index.html` and `nav.html` gives 0 and 0 | page-structure §5 |

### Satisfied

| Rule | Evidence |
|---|---|
| UX-A11Y-01, -03, -04 (theme) | 0 click handlers on non-interactive elements in `T:`. `Input.astro:16` requires `label: string`. `ToggleButton.astro:18` types `iconOnly` to require `aria-label` (native-widgets §8.2) |
| UX-A11Y-07 (theme) | `ui/Choice.astro:62` is a native checkbox with `role="switch"` and no `aria-checked`. CycleButton uses the rename branch with no `aria-pressed` (C2). The webview filter chips use `aria-pressed` buttons (`W:render.ts:642`) |
| UX-A11Y-09 | `ui/Menu.astro:3-4` is disclosure navigation in a `<nav popover>` with links, and no `role="menu"`. 13 `popovertarget`/`commandfor` uses |
| UX-A11Y-10 | 0 `tabindex>0`, 0 `aria-checked` on native checkboxes, 0 `role="menu"` in both corpora. The 2 `role="list"` hits (`TileGrid.astro:23`, `ui/TagGroup.astro:97`) are the documented styled-list exception |
| UX-A11Y-11 (webview tree) | `W:render.ts:1019` `role="tree"` uses roving `tabindex` (`sidebar/main.ts:993-1000`), Left/Right (`main.ts:1066`) and Up/Down/Home/End/PageUp/PageDown (`model.ts:2046`) |
| UX-A11Y-12 | All 16 theme `outline: none` sites draw a replacement. `command-bar.css:141-143` is replaced at `:124-127`, confirmed in a browser. `G:public/start.html:90-91` restores the ring on `:focus-visible` (focus-contrast §1; ui-code-posture §2). Script run in revision 1, `python3 -I focus_outline.py <dir>` (Appendix A1), on 2026-11-27. In `T:` it found 8 focus-selector removals: 7 PASS. It flagged `components/ui/overlay.css:96` (`.ocx-ui-select__list:focus-visible`), the active-descendant listbox whose source comment at `:95` says "the highlighted row shows it". In `W:` it found 3: 2 PASS. It flagged `sidebar/sidebar.css:355` (`.result-summary:focus`), a `role="status" tabindex="-1"` line that is focused from script (`render.ts:1219`, `sidebar/main.ts:870`) and is not in the Tab order. Both flagged sites are reviewed exceptions. Each needs the `focus-ok:` comment before the script exits 0. `G:public`, `G:src` and `grim-gui/src` give exit 0. Revision 2 ran `V3=1 node focus_outline_v2.mjs <dir>` (Appendix A7) on the same trees on 2026-11-27. `T:` gave `{"PASS":6,"FAIL":2}`: `overlay.css:96` as above, and `components/ui/field.css:188` (`.ocx-ui-input-group__input:focus-visible`). The second is a false positive of A7: the ring is drawn by `.ocx-ui-input-group:focus-within` (`field.css:158`), which A1 links by BEM naming. `W:` gave `{"PASS":2,"FAIL":1}`, `sidebar.css:355` as above. `G:public`, `G:src` and `grim-gui/src` printed no row, because A7 reads no `<style>` blocks. The triage list for the fleet is therefore 3 rows, each a `focus-ok:` comment |
| UX-A11Y-13 (OCX) | Every OCX focus stop draws a ring of 5.17:1 (light) or 5.83:1 (dark). Grimoire's user-agent ring is 15.17:1 |
| UX-A11Y-15, -16 (OCX theme) | Every ocx text token passes on bg, surface and surface-subtle in both themes (minimum 4.93). `border-control` is 3.3 (light) and 3.67 (dark). The coral 2.79 is never used for text or focus in light mode (ui-code-posture §4) |
| UX-A11Y-19 | `T:components/ui/field.css:60-62` pairs the danger border with error text and `aria-invalid`. `T:base.css:171` keeps the underline on prose links. The alpha-blending `colour_only_v2.mjs` (Appendix A6) was run in revision 2 on 2026-11-27 with `WAIT=load`, against the built `index.html`, `apps/index.html` and `integrations/index.html` of ocx.sh and `index.html` and `quickstart.html` of the Grimoire docs, light and dark. It exited 0 with 0 FAIL, the same result as the first script in revision 1. It gave 1 INFO item (one line per scheme, on `quickstart.html`): the Grimoire header's `aria-current` "docs" link has the same computed style as "index" (`Header.astro:84`, no `aria-current` style). The current page therefore has no visual cue at all. That is not a 1.4.1 failure, and it is a UX-STATE or UX-TEXT question |
| UX-A11Y-23 | `W:settings/render.ts:518-522` uses `role="alert"` for save failures. `Deferred` shows its error as `role="alert"` (`Could not load this.` plus Retry). Re-confirmed in followup-q2: both webview `role="alert"` uses carry error text only, loading uses `aria-live="off"` plus `aria-busy`, and `grep -rnE 'aria-live="?assertive\|assertive' src/webview` exits 1 with no output |
| UX-A11Y-25, -26 | The only infinite animation is the vendored asciinema loader (`G:public/asciinema-player.css:440`), a lone loading indicator. No flashing keyframes. `W:` `details.css:1366` is a 2 s opacity fade, run once |
| UX-A11Y-27 | `T:tokens.css:353` zeroes every duration under `reduce`. 0 literal `transition` timings bypass the token (`cd T && grep -rnE 'transition:\s*[^;]*[0-9.]+m?s' . \| grep -v 'var(--ocx-duration' \| wc -l` gives 0, run 2026-11-27). `starlight/theme-toggle.mjs:22` feature-detects and gates `startViewTransition`. Grimoire's 14 `transition:` lines change colour only |
| UX-A11Y-28, -29, -32 (Starlight and catalog) | All 70+ measured Starlight pages have `lang="en"`, one `<main>` and a `#_top` skip link. The catalog uses `.ocx-skip` with its target present |
| UX-A11Y-33 (order) | No order inversion in the ocx.sh header or footer across the landing, Starlight and catalog pages. No inversion on grimoire.rs |
| UX-A11Y-34 (hubs) | Hub cards render `ocx-card--planned` with a visible "planned" tag as non-focusable text (`HubGrid.astro:43-60`) |

### New commitments (unmeasured: the rule binds from now on on its WCAG or APG source alone)

Every row here is **unmeasured** (Verdict 12). No row is evidence that the fleet passes or fails
the rule.

| Rule | Commitment |
|---|---|
| UX-A11Y-08 (unmeasured) | The theme's `Dialog`, `AlertDialog`, `ConfirmDialog` and `Drawer` sit on `@zag-js/dialog` 1.44.0, which uses no `showModal`. They need the Tab, Esc, focus-return and inert test before any new dialog reuses them |
| UX-A11Y-11 (theme Zag widgets; unmeasured) | Tabs, ActionMenu, Combobox, Select, List, Slider, Tree and Accordion are backed by Zag key handlers that were found by grep, not by a test. Each needs a key-sending test |
| UX-A11Y-14 (unmeasured) | Sticky headers on the Starlight and catalog templates were not measured against `scroll-padding` |
| UX-A11Y-20 (theme Choice; measured in a harness copy of `tokens.css` and `choice.css`, not on a built page) | The `Choice` label row renders 16, 19.5 or 22.75 px tall depending on inherited line-height, always under 24. Add `min-height: 24px` to the label, or require gaps of at least 8, 4.5 or 1.25 px. The change lands in the shared theme, so ask first (see the Ask list) |
| UX-A11Y-35 (focus-colour clause; unmeasured in a rendered webview) | Revision 1 ran the colour scan in full: 0 hex outside comments. The 5 raw hits are all in the comment block `W:settings/settings.css:3-8`. `var(--vscode-focusBorder)` is used at 9 sites. Its computed value in a rendered webview has not been read. The high-contrast test is missing and is listed under Violated |
| UX-A11Y-22 (copy button; unmeasured) | `CopyButton.astro` relies on the page toaster to announce, which was not exercised. Verify that the toaster region exists at load |
| UX-A11Y-32 (Material; unmeasured) | The ocx-mirror, indexbot and indexer pages without a table of contents would have no skip link. Pages with one carry `.md-skip` |

## AI-agent failure modes

Ranked by how often each bites. The basis is WebAIM prevalence plus the fleet's measured counts.
Each is grouped by the mechanism that produces it, and the rule that catches it is in brackets.

**Mechanism A: the result looks right visually, and the agent reasons from pixels.**
1. Names an icon button with only `title`, because hovering shows a tooltip and axe stays green.
   19 in the webview. [04]
2. Puts the field title in a `<span>` beside the input, so it looks labelled and is not. 5 in the
   webview. [03]
3. Checks contrast on the page background only. It misses cards, code blocks, alpha text and the
   ring on an element's own background: 3.91 and 1.18 measured. [13, 15]
4. Sizes a target by its glyph or token, not by its rendered box. The stacked rows are 23.6 px. [20]
5. Lets a planned or disabled item differ from its siblings only by colour or a missing icon.
   8 entries. [19, 34]

**Mechanism B: training-data idioms that predate the platform features.**
6. Writes `<a href="#">` or a `div` with a click handler for actions, then hand-writes Enter and
   Space. 3 + 1 in the webview. [01, 02]
7. Builds a `div role="dialog"` with a `keydown` focus trap instead of `<dialog>.showModal()`. [08]
8. Copies `outline: none` from a CSS reset without a replacement, or puts the ring on `:focus` and
   then deletes it because mouse clicks show it. [12]
9. Stacks `role="alert"` and `aria-live="assertive"` "for compatibility". [10, 23]

**Mechanism C: the "make it accessible" reflex adds ARIA.**
10. Puts `role="alert"` on every toast, including "Copied". [23]
11. Puts `role="menu"` on a nav dropdown, or a menu role on a popup of buttons with no arrow keys.
    [10, 11]
12. Swaps the label to "Unmute" and also sets `aria-pressed`. [07]
13. Writes redundant roles (`<nav role="navigation">`) and `aria-label` on elements that already
    show text, breaking label-in-name. [05, 10]

**Mechanism D: structure the framework injects is invisible in source.**
14. Adds a hero `<h1>` to a Starlight page, which already renders one. Measured on the grimoire.rs
    landing. [31]
15. Hand-writes a page in `public/` with no `<main>` and no skip link, because no template wraps
    it. 2 pages. [29, 32]
16. Overrides `PageTitle` and drops `id="_top"`, which breaks the skip-link target. [32]
17. Renames or reorders header items "for clarity" on one site of a set. [33]

**Mechanism E: timing and state that no static view shows.**
18. Creates the live region and writes the text in the same function, or renders the region
    only on the branch that has a message. 1 status and 1 alert in the webview are created with
    their content, and 5 error states have no region. [22]
19. Re-sets identical text into an unchanged region and assumes it is announced again. [24]
20. Calls `startViewTransition` or a JS animation with no reduced-motion path, or "fixes" motion
    with a blanket `animation: none !important` that also kills loaders. [27]
23. Fades a container in by scroll position or hover and leaves its controls in the Tab order.
    The ring is drawn, but the control is at opacity 0 when focus arrives. Reduced motion hides
    the defect, because there the container is visible. 5 stops in 3 containers. [36]

**Mechanism F: false assurance from a checker.** This feeds every mechanism above.
21. Treats a green axe run, a Lighthouse 100 or a virtual screen-reader log as proof. axe passes
    title-only names. Lighthouse excludes best-practice audits, so it misses the skip link, a
    second `<h1>` and `region`. The virtual reader does not model the iOS double speech. [04, 31,
    32; gate policy in UX-VERIFY]
22. Accepts an APCA pass over a WCAG 2 fail, or calls 44 px an AA requirement. [17]

## What an agent must ask a human

- **The conformance target and any public claim** (WCAG level, VPAT, "accessible" in copy). The
  agent never writes the claim. The legal basis belongs to UX-VERIFY's conformance-targets-law.
- **Set membership.** Ask whether a new subdomain, a github.io docs site or a sibling product
  belongs to an existing set (UX-A11Y-33). Open today for ocx-mirror, indexbot and indexer.
- **Whether a nav entry for an unreleased product appears at all.** The agent decides only how it
  renders (UX-A11Y-34). The question is a roadmap and marketing decision.
- **Brand colours or a brand focus ring that fail 3:1 or 4.5:1.** Propose a passing alternative
  and ask.
- **Changes to the shared theme package** (`@ocx-sh/theme`, consumed by five sites), for example
  the `Choice` `min-height` or the `.ocx-stage__finale:focus-within` fix (UX-A11Y-36). A change
  there alters every consumer. The same holds for the vendored asciinema player in the Grimoire
  docs: a fix there diverges from upstream.
- **Global keyboard shortcuts** (`/`, Ctrl/Cmd+K). They conflict with browser, screen-reader and
  VS Code bindings.
- **The browser-support policy** before adopting Invoker Commands, Baseline since December 2025,
  or `interestfor`, not yet Baseline, or before dropping a fallback.
- **Use of an "essential" or "equivalent control" exception** (2.5.8, 2.2.2, 2.3.3). Record it and
  ask.
- **Replacing an existing library widget with a native one when the look changes.** Propose; do
  not apply.
- **Whether a real screen-reader pass (NVDA, VoiceOver) is required before release** for a new
  announcement pattern.
- **Grimoire docs being dark-only.** This is a documented decision (`G:src/components/ThemeProvider.astro:1-18`),
  not a WCAG failure. Do not "add OS theme support" there without asking.

## Decay

| Fact a rule rests on | Rules | Source and date | Refresh | How to re-check |
|---|---|---|---|---|
| WebAIM prevalence figures (83.9 / 53.1 / 51 / 46.3 / 30.6 / 13.5 %; ARIA 59.1 vs 42.0) | Verdict 1-2, 01-04, 15, 28 | [WebAIM Million](https://webaim.org/projects/million/), 2026-03-30 | 12 months (annual report, February crawl) | Re-read the ranking table. Re-rank the failure modes if the order changes |
| WCAG 2.2 criteria texts and Understanding pages (revised between 2025-09 and 2026-11) | 12-16, 19-20, 22-29, 33, 36 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/), Rec 2024-12-12; Understanding pages dated per rule | 6 months | Fetch each linked Understanding page and diff the levels, thresholds and listed techniques and failures |
| ARIA in HTML allowed-role table and MUST NOTs | 07, 09, 10 | [AIH](https://www.w3.org/TR/html-aria/), Rec 2026-08-11 | 12 months | Re-read the `button`, `a`, `input type=checkbox`, `summary`, `details` and `dialog` rows |
| Accname: `title` as the last fallback (Working Draft) | Verdict 3, 04 | [Accname 1.2](https://www.w3.org/TR/accname-1.2/), WD 2026-11-04 | 6 months | Check step 2I and the document's status |
| axe passes a title-only button; axe rule IDs and impacts | 03, 04, 05, 10, 29-32 | [axe-core rule-descriptions](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md) (4.14.1); [Deque button-name](https://dequeuniversity.com/rules/axe/4.14/button-name) | each axe minor release (about 6 months) | Grep the rule list for each ID. Re-run a `<button title="x"></button>` fixture through axe |
| eslint-plugin-jsx-a11y: which rules are in `recommended` | 01, 02 | [README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), undated | 6 months | Check that `prefer-tag-over-role` is still outside the preset |
| APG patterns, keys and thresholds (toolbar 3+, listbox Home/End above 5) | 10, 11 | APG pattern pages, Copyright 2026, undated | 12 months | Re-read each linked pattern's keyboard section |
| Popover Baseline (Jan 2025), Invoker Commands Baseline (Dec 2025), no ARIA handling for `command`; `interestfor` not Baseline | 08, 09 | [MDN Popover](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API); [MDN Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API), 2026-01-19 | 6 months | Re-read the Baseline badges. Check whether `command` now sets `aria-expanded` |
| iOS VoiceOver double speech for `alert` plus `assertive` | 10, 23 | [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions), 2026-09-11 | 12 months | Re-read the note. If it is removed, keep the rule anyway: the stack is redundant |
| WCAG 3 contrast algorithm unselected | Verdict 5, 17 | [Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html), 2026-04 (draft of 2026-04-08) | 12 months | Check the latest WCAG 3 editor's draft for a selected algorithm |
| VS Code webview body classes, `--vscode-*` mapping, `focusBorder`, "themeable" guideline | 27, 35 | [webview guide](https://code.visualstudio.com/api/extension-guides/webview), 2026-11-25; [webview UX](https://code.visualstudio.com/api/ux-guidelines/webviews), 2026-11-25; [Theme Color](https://code.visualstudio.com/api/references/theme-color), undated; [themeing.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/webview/browser/themeing.ts), main, fetched 2026-11-27 | 6 months | Re-read the theming section and the `replace('.', '-')` line. Read `getComputedStyle(document.documentElement).getPropertyValue('--vscode-focusBorder')` in a rendered webview. A non-empty value promotes the focus-colour clause of 35 to MUST |
| Flash definition and the 0.34 s derivation | 26 | [Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), updated 2025-09-17 | with WCAG | Re-read the definition of "flash". If it is no longer "a pair of opposing changes", redo the derivation |
| Lightness counts as a cue at 3:1 | 19 (`colour_only_v2.mjs`) | [Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), updated 2025-09-16 | with WCAG | Re-read the "significant difference in lightness" paragraph |
| ARIA22 test 1 ("before the status message occurs") and ARIA19 ("present in the DOM on page load") | 22 | [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), updated 2026-01-12; [ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19), updated 2026-04-27; both read in raw HTML 2026-11-27 | 12 months | `curl -sSL <url> \| sed 's/<[^>]*>//g' \| grep -iE 'before the status message\|present in the DOM'`. If either test text changes, re-word the Why of 22 |
| Check scripts in the Appendix | 03, 04, 12, 13, 15, 16, 19, 20, 35, 36 | this artifact; A1 to A5 revision 1; A6 replaced and A7, A8 added in revision 2 | each Chromium, puppeteer-core or PostCSS major | Run each script's self-test or fixture (A1 `--selftest`, A6 R1 to R4, A7 F1 to F9, A8 O1 to O5). Re-run them on the fleet |
| Precision and recall of the focus and colour checks on Primer and Radix | Verdict 13-14, 12, 19 | followup-q1; primer/react and primer/css at 2026-11-25, radix-ui/themes at 2026-04-11, radix-ui/website at 2026-10-07 | when a check script changes | Re-run A1, A7 and A6 on the same four repositories, and compare with followup-q1's tables |
| Starlight `PageTitle` `id="_top"`; Material skip link only with a table of contents | 31, 32 | [Starlight overrides](https://starlight.astro.build/reference/overrides/), undated; Material `base.html` master, fetched 2026-11-27 | each major or minor framework upgrade | `grep -n 'toc | first' base.html` in the installed Material. Read the Starlight overrides page |
| Fleet measurements in "Applied" | all rows | dists built 2026-11-16 to 11-24; sources read 2026-11-27. Wave 2 pins: `grimoire-rs/vscode` `9230dcd` (2026-11-24), `grim-gui` `edda90d` (2026-11-26). The ocx.sh `ScrollStage.astro` and `scroll.mjs` were read in the working tree of the sibling checkout, not in a release | each rebuild, at least quarterly | Re-run the commands cited in the rows |
| Virtual reader logging (`polite:`/`assertive:` is undocumented behaviour) | 22, 24 | `@guidepup/virtual-screen-reader` 0.33.0 (npm 2026-09-20) | each release of the tool | Re-run the harness probes |

Rules that rest on no moving fact (01, 02, 05, 06, 25, 29, 33) need re-checking only
when WCAG itself changes. Revision 2 took 12 off this list, because its Verify now rests on the
measured precision of A1 and A7.

## Open questions

**Subareas that deserve another round**

1. Which static checker can enforce UX-A11Y-01 to -10 on `.astro` files and on lit `html` template
   literals in the webview, given that `eslint-plugin-jsx-a11y` covers JSX only and the fleet
   lints neither? (This overlaps UX-VERIFY M004; this round must name the rules each tool catches.)
2. Do the Zag 1.44 dialog, menu, tabs, combobox and select machines in the theme pass a
   key-sending test against the APG contract (UX-A11Y-08, -11)? Grep found key names only.
3. Does `@vscode-elements/elements` 2.5.1 map a `vscode-textfield` placeholder or `label` to an
   accessible name, and does `vscode-checkbox toggle` really render `role="switch"`? Answer it
   with a rendered webview and the accessibility tree.
4. How do NVDA plus Firefox and VoiceOver plus Safari (macOS and iOS) handle the patterns that only
   the virtual reader has tested? Those are: a region revealed by removing `hidden`, repeated
   identical text, `aria-atomic`, and `role="alert"` injected with content.
5. How do the theme and the webview render under Windows High Contrast and `forced-colors`, where
   only the CSS source has been read so far?
Questions 6 and 7 were answered in wave 2 (followup-q0 and followup-q1). Their numbers are not
reused.

8. Can one focus check combine A1's `<style>`-block reading and BEM branch with A7's fixes (a)
   to (f), and what are its precision and recall against an oracle? The oracle is a Tab-and-diff
   pass on built Primer and Radix Storybooks and on the radix-ui/website demos. Until then the
   two scripts stay lead generators (UX-A11Y-12, Verdict 14).
9. Does UX-A11Y-36 hold outside headless Chrome? Run `focus_opacity.mjs` in Firefox and WebKit,
   and run the `:focus-within` fix with OS-level smooth scrolling, on every page of ocx.sh, not
   only `index.html`.

**Owner decisions**

- The WCAG conformance target for each site and for the extension. It sets whether AAA rules
  (UX-A11Y-17's 44×44 advice, the 2px recipe in -12, -27) stay at SHOULD or CONSIDER.
- Whether ocx-mirror, indexbot and indexer join the ocx.sh set for 3.2.3 order, which would need a
  Material `custom_dir` header override.
- Whether the 8 planned entries stay in persistent navigation at all. UX-A11Y-34 says omit them.
- The label to use for each shared function across grimoire.rs and index.grimoire.rs (`index` or
  `packages`, `source` or `github`), and for the two `catalog` links on ocx.sh.
- Whether to fix the `Choice` hit area in the shared theme (it affects all five consumers) or per
  site.
- Whether reduced motion becomes MUST fleet-wide. That would deviate from the DOC-EX-17 severity
  convention.

## Sub-artifacts

- [native-widgets-and-keyboard.md](ux-a11y-authoring/native-widgets-and-keyboard.md) covers the
  native-first list, the ARIA refusal list, APG keyboard contracts, name rules, and the per-widget
  inventory of the theme and the VS Code webview (scan_wv.py).
- [focus-contrast-target-size.md](ux-a11y-authoring/focus-contrast-target-size.md) covers focus,
  text and non-text contrast, colour-only cues and target size, with headless-Chromium
  measurements of focus rings and hit boxes on the built sites.
- [announcements-and-motion.md](ux-a11y-authoring/announcements-and-motion.md) covers live-region
  roles and timing, toggle state exposure, reduced motion, view transitions, autoplay and
  flashing. It includes a Guidepup virtual-reader harness (simulated output).
- [page-structure-and-consistency.md](ux-a11y-authoring/page-structure-and-consistency.md) covers
  per-template landmarks, headings, skip link, `lang` and title, the "set of web pages" decision,
  3.2.3, 3.2.4 and 3.2.6 across the sites, and planned nav entries.
- [followup-q0.md](ux-a11y-authoring/followup-q0.md) (wave 2) explains the 0-pixel cmdbar
  trigger: an ancestor at opacity 0 when focus arrives. It verifies the `:focus-within` fix and is
  the source of UX-A11Y-36.
- [followup-q1.md](ux-a11y-authoring/followup-q1.md) (wave 2) gives precision and recall of
  `focus_outline.py` and `colour_only.mjs` on Primer and Radix. It also holds the measured
  prototypes behind Appendix A6 and A7.
- [followup-q2.md](ux-a11y-authoring/followup-q2.md) (wave 2) re-measures the webview and grim-gui
  live regions, and corrects the ARIA22 quote in UX-A11Y-22.

## Key sources

| URL | Why |
|---|---|
| https://webaim.org/projects/million/ | The prevalence ranking behind the rule order (independent study, 2026-03-30) |
| https://www.w3.org/TR/html-aria/ | Allowed roles per element and the ARIA MUST NOTs (W3C Recommendation 2026-08-11) |
| https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/ | "A role is a promise"; no ARIA beats bad ARIA |
| https://www.w3.org/WAI/ARIA/apg/patterns/ | The keyboard contracts for each custom widget |
| https://www.w3.org/TR/accname-1.2/ | `title` as the last-fallback name (Working Draft 2026-11-04) |
| https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog | Native modal behaviour and Baseline status |
| https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | 3:1 for controls and focus; the user-agent exemption (2026-10-04) |
| https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | 24 px and the spacing-circle exception (2026-11-02) |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | Role mapping and the `alert` overuse failure (2026-10-04) |
| https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22 | The region must exist before the message (2026-01-12) |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions | Timing, atomic, iOS double speech (2026-09-11) |
| https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html | One name per function within a set (2026-10-04) |
| https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/ | One main, unique landmark labels, the context rule |
| https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html | Why WCAG 2 stays the contrast gate |
| https://code.visualstudio.com/api/ux-guidelines/webviews | The platform asks for, and does not supply, accessibility in webviews (2026-11-25) |

## Appendix: check scripts

These are the scripts the Verify lines name. They are inlined here so that an adopting agent can
run them without the research cache. When this topic is published as a rule plus a reference
skill, each script ships in that skill's `checks/` directory under the name given in its heading,
and the rule text cites it by that path. The browser scripts need Node 20 or later,
`npm i -D puppeteer-core`, and `CHR` set to a Chromium or `chrome-headless-shell` binary. Serve a
built site read-only with `python3 -m http.server <port>` in its `dist`. Run Python with `-I`.

### A1. focus_outline.py (UX-A11Y-12)

Written in revision 1. Self-test: `python3 -I focus_outline.py --selftest` prints `selftest ok`.
Fleet results are in "Applied to the fleet", UX-A11Y-12.

```python
"""UX-A11Y-12 check: an outline removed on a focus selector needs a replacement in the same file.

Usage: python3 -I focus_outline.py <dir> [<dir> ...]   (exit 1 when any FAIL)
       python3 -I focus_outline.py --selftest
Scans *.css and <style> blocks in *.astro, *.html, *.svelte, *.vue.
shortcut: regex CSS parser (no nesting syntax beyond @-blocks), upgrade to a PostCSS plugin if a codebase uses CSS nesting.
"""
import re, sys, pathlib

FOCUS = re.compile(r':focus(-visible|-within)?\b')
REMOVE = re.compile(r'(?<![-\w])outline(-style)?\s*:\s*(none|0(px)?)\s*(!important)?\s*(;|$)|(?<![-\w])outline-width\s*:\s*0(px)?\s*(;|$)')
DRAW = re.compile(r'(?<![-\w])outline(-style|-width)?\s*:\s*(?!none\b|0(px)?\s*(;|$))[^;]+|(?<![-\w])border(-[a-z]+)?-color\s*:|(?<![-\w])border(-(top|right|bottom|left))?\s*:\s*(?!none\b|0\b)[^;]+')

def rules(css):
    # A comment holding "focus-ok:" right before a rule records a reviewed exception.
    css = re.sub(r'/\*(.*?)\*/', lambda m: ' __FOCUSOK__ ' if 'focus-ok:' in m.group(1) else ' ', css, flags=re.S)
    out, stack, start = [], [], 0
    for i, ch in enumerate(css):
        if ch == '{':
            stack.append(css[start:i].strip()); start = i + 1
        elif ch == '}':
            body = css[start:i]; start = i + 1
            sel = stack.pop() if stack else ''
            if '{' not in body and not sel.startswith('@'):
                out.append((sel, body))
    return out

def split_list(sel):
    parts, depth, cur = [], 0, ''
    for ch in sel:
        depth += ch == '('; depth -= ch == ')'
        if ch == ',' and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
    return parts + [cur]

def last_class(sel):
    m = re.findall(r'\.[\w-]+', re.split(r'[\s>+~]+', sel)[-1] if sel else '')
    return m[0] if m else ''

def base(sel):
    s = re.sub(r':not\(:focus(-visible)?\)', '', sel)
    s = FOCUS.sub('', s)
    return re.sub(r'\s+', ' ', s).strip()

def check(css, name='<css>'):
    rs = [(s.replace('__FOCUSOK__', '').strip(), b, '__FOCUSOK__' in sel) for sel, b in rules(css) for s in split_list(sel)]
    results = []
    for sel, body, exempt in rs:
        if not FOCUS.search(sel) or not REMOVE.search(body):
            continue
        if exempt:
            results.append(('EXEMPT', name, sel, 'focus-ok comment')); continue
        if DRAW.search(REMOVE.sub('', body)):
            results.append(('PASS', name, sel, 'same rule draws')); continue
        b = base(sel); last = re.split(r'[\s>+~]+', b)[-1] if b else ''
        ok = None
        for s2, b2, _ in rs:
            if not DRAW.search(REMOVE.sub('', b2)):
                continue
            if FOCUS.search(s2) and base(s2) == b and not REMOVE.search(b2):
                ok = s2; break
            if last and ':has(' in s2 and FOCUS.search(s2) and last in s2:
                ok = s2; break
            if ':focus-within' in s2 and base(s2) and (b.startswith(base(s2) + ' ')
                    or (last_class(base(s2)) and last_class(b).startswith(last_class(base(s2)) + '__'))):
                ok = s2; break  # descendant selector, or BEM block__element naming
        results.append(('PASS' if ok else 'FAIL', name, sel, ok or 'no replacement in file'))
    return results

def files(root):
    for p in pathlib.Path(root).rglob('*'):
        if 'node_modules' in p.parts or not p.is_file():
            continue
        if p.suffix == '.css':
            yield p, p.read_text(errors='replace')
        elif p.suffix in ('.astro', '.html', '.svelte', '.vue'):
            t = p.read_text(errors='replace')
            blocks = re.findall(r'<style[^>]*>(.*?)</style>', t, flags=re.S)
            if blocks:
                yield p, '\n'.join(blocks)

def selftest():
    assert check('button:focus{outline:none}')[0][0] == 'FAIL'
    assert check('a:focus-visible{outline:none;box-shadow:0 0 0 2px red}')[0][0] == 'FAIL'
    assert check('a:focus{outline:0}a:focus-visible{outline:2px solid blue}')[0][0] == 'PASS'
    assert check('.f:has(.t:focus-visible){outline:var(--ring)} .t:focus-visible{outline:none}')[0][0] == 'PASS'
    assert check('.x:focus-visible{outline:none;border-color:var(--c)}')[0][0] == 'PASS'
    assert check('.g:focus-within{border-color:blue} .g__in:focus-visible{outline:none}')[0][0] == 'PASS'
    assert check('/* focus-ok: active option draws it */ .l:focus-visible{outline:none}')[0][0] == 'EXEMPT'
    assert check('.s:is(:focus-visible, [data-open]){outline:none;border-color:red}')[0][0] == 'PASS'
    print('selftest ok')

if __name__ == '__main__':
    if sys.argv[1:] == ['--selftest']:
        selftest(); sys.exit(0)
    bad = 0
    for root in sys.argv[1:]:
        for p, css in files(root):
            for r in check(css, str(p)):
                print(*r, sep='\t'); bad += r[0] == 'FAIL'
    sys.exit(1 if bad else 0)
```

### A2. wcag_contrast.py (UX-A11Y-15, -16)

Written in revision 1. It runs a self-check on import (`#767676` on white is 4.54).
`printf '#767676 #ffffff\n#aaa #fff\n' | python3 -I wcag_contrast.py 4.5` prints
`PASS 4.542` and `FAIL 2.323` and exits 1.

```python
"""UX-A11Y-15/-16 check: WCAG 2 contrast for colour pairs, unrounded, alpha blended onto the ground.

Usage: python3 -I wcag_contrast.py 4.5 < pairs.txt   (exit 1 when any pair fails)
pairs.txt: one pair per line, "<foreground> <background> [label]", colours as #rgb, #rrggbb or #rrggbbaa.
"""
import sys

def rgba(h):
    h = h.lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h)
    v = [int(h[i:i + 2], 16) for i in range(0, len(h), 2)]
    return v[:3], (v[3] / 255 if len(v) == 4 else 1.0)

def lum(rgb):
    lin = [c / 255 for c in rgb]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in lin]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]

def ratio(fg, bg):
    (f, a), (b, _) = rgba(fg), rgba(bg)
    f = [a * x + (1 - a) * y for x, y in zip(f, b)]
    hi, lo = sorted((lum(f), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)

assert abs(ratio('#767676', '#ffffff') - 4.54) < 0.01 and ratio('#aaa', '#fff') < 3

if __name__ == '__main__':
    need, bad = float(sys.argv[1]), 0
    for line in sys.stdin:
        parts = line.split()
        if len(parts) < 2 or parts[0].startswith('//'):
            continue
        r = ratio(parts[0], parts[1])
        ok = r >= need  # unrounded: 4.499 fails 4.5
        bad += not ok
        print('PASS' if ok else 'FAIL', f'{r:.3f}', *parts)
    sys.exit(1 if bad else 0)
```

### A3. scan_wv.py (UX-A11Y-03, -04, -35)

This is the dive's scanner, verbatim. It tokenises open tags in `.ts` template literals (it is
aware of `${}`) and classes each control by `aria-label`, body text, `title` or nothing. Run it from the
template directory. In `grimoire-rs/vscode/src/webview` on 2026-11-27 it printed
`('button', 'title-only') 19` and `('button', 'UNNAMED') 1`, which reproduces native-widgets §8.1.
`--list <tag>` prints each hit.

```python
import re,glob,sys
def open_tag(s,i):
    d=0;j=i
    while j<len(s):
        c=s[j]
        if s.startswith('${',j): d+=1;j+=2;continue
        if c=='}' and d: d-=1
        elif c=='>' and d==0: return s[i:j+1],j+1
        j+=1
    return s[i:],len(s)
out=[]
for f in sorted(glob.glob('**/*.ts',recursive=True)):
    if f.endswith('.d.ts'): continue
    s=open(f).read()
    for m in re.finditer(r'<(button|input|select|textarea|a|vscode-button|vscode-icon|summary)\b',s):
        tag=m.group(1)
        t,end=open_tag(s,m.start())
        close=s.find('</%s>'%tag,end)
        body=s[end:close] if close>0 and close-end<600 else ''
        text=re.sub(r'<[^>]*>','',re.sub(r'\$\{[^}]*\}','X',body)).strip()
        line=s[:m.start()].count('\n')+1
        out.append((f,line,tag,t,text))
import collections
c=collections.Counter()
for f,l,tag,t,text in out:
    al='aria-label' in t or ' label=' in t
    ti=bool(re.search(r'\stitle=',t))
    kind='aria-label' if al else ('text' if text else ('title-only' if ti else 'UNNAMED'))
    c[(tag,kind)]+=1
    if '--list' in sys.argv and tag in sys.argv[2:]: print(f,l,tag,kind,repr(text[:30]),re.sub(r'\s+',' ',t)[:110])
for k,v in sorted(c.items()): print(k,v)
```

### A4. measure.mjs (UX-A11Y-13, -20)

This is the dive's browser pass. It is verbatim except for the first line: the dive imported
puppeteer-core from an absolute path in a fleet checkout. It writes per page and theme: `small[]`
(boxes under 24 px with the spacing-circle result), `borders[]` (control border contrast) and
`focus[]` (up to 60 Tab stops with the computed outline, `ringRatio` against the parent ground
and `ringOwn` against the element's own background). Smoke run in revision 1:
`THEMES=light node measure.mjs http://127.0.0.1:8803/ index.html m.json` on the built ocx.sh gave
2 records (desktop and mobile), 32 controls, 29 focus stops and 13 small boxes on the first.

```js
import puppeteer from 'puppeteer-core';
const [,, base, pagesArg, outName] = process.argv;
const pages = pagesArg.split(',');
const browser = await puppeteer.launch({executablePath:process.env.CHR, headless:true, args:['--no-sandbox']});
const results = [];
for (const theme of (process.env.THEMES||'light,dark').split(',')) for (const [vw,vh,label] of [[1280,800,'desktop'],[390,844,'mobile']]) for (const p of pages) {
  const page = await browser.newPage();
  await page.setViewport({width:vw,height:vh});
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}]);
  await page.evaluateOnNewDocument((t)=>{try{localStorage.setItem('starlight-theme',t);localStorage.setItem('theme',t);}catch(e){}}, theme);
  try { await page.goto(base+p,{waitUntil:'networkidle0',timeout:30000}); } catch(e){ results.push({theme,label,p,error:String(e)}); await page.close(); continue; }
  await page.evaluate((t)=>{document.documentElement.dataset.theme=t; document.documentElement.style.colorScheme=t;}, theme);
  await new Promise(r=>setTimeout(r,300));
  const data = await page.evaluate(()=>{
    const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
    const rgba=c=>{cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;
      // canvas premultiplies; re-read alpha via drawing on transparent
      return [d[0],d[1],d[2],d[3]/255];};
    const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};
    const Lm=([r,g,b])=>.2126*lin(r)+.7152*lin(g)+.0722*lin(b);
    const ratio=(a,b)=>{const x=Lm(a),y=Lm(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
    const over=(f,b)=>{const a=f[3];return [0,1,2].map(i=>f[i]*a+b[i]*(1-a))};
    const bgOf=el=>{const stack=[];for(let e=el;e;e=e.parentElement){const c=rgba(getComputedStyle(e).backgroundColor);if(c[3]>0)stack.push(c);if(c[3]>=1)break;}
      let b=[255,255,255];if(!stack.length||stack[stack.length-1][3]<1){b=rgba(getComputedStyle(document.documentElement).colorScheme.includes('dark')?'#000':'#fff').slice(0,3);} 
      for(let i=stack.length-1;i>=0;i--)b=over(stack[i],b);return b;};
    const sel='a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"]),[role=button],[role=tab],[role=checkbox],[role=switch]';
    const els=[...document.querySelectorAll(sel)].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],[inert]')&&!e.closest('.sr-only')||false});
    const rects=els.map(e=>{const r=e.getBoundingClientRect();return {e,r}});
    const out={n:els.length,small:[],focus:[],borders:[],bgnote:null};
    // inline detection: element is within a text block with other text content
    const isInline=e=>{if(e.tagName!=='A')return false;const p=e.closest('p,li,dd,td,blockquote,h1,h2,h3,h4,h5,h6');if(!p)return false;const t=(p.textContent||'').trim().length-(e.textContent||'').trim().length;return t>3&&getComputedStyle(e).display==='inline';};const dispInline=e=>getComputedStyle(e).display==='inline';
    rects.forEach(({e,r},i)=>{
      const w=r.width,h=r.height;
      if(w<24||h<24){
        const cx0=r.left+w/2,cy0=r.top+h/2;let conflict=null;
        for(let j=0;j<rects.length;j++){if(j===i)continue;const o=rects[j].r;if(rects[j].e.contains(e)||e.contains(rects[j].e))continue;
          const oUnder=o.width<24||o.height<24;
          // distance from circle centre to other rect (or to other circle if undersized)
          let d;
          if(oUnder){const ox=o.left+o.width/2,oy=o.top+o.height/2;d=Math.hypot(cx0-ox,cy0-oy)-24;/* circle-circle: need centre dist>=24 */d=Math.hypot(cx0-ox,cy0-oy)-24;}
          else{const dx=Math.max(o.left-cx0,0,cx0-o.right),dy=Math.max(o.top-cy0,0,cy0-o.bottom);d=Math.hypot(dx,dy)-12;}
          if(d<-0.01){conflict={tag:rects[j].e.tagName+'.'+(rects[j].e.className||'').toString().slice(0,30),d:+d.toFixed(2)};break;}
        }
        out.small.push({tag:e.tagName.toLowerCase(),cls:(e.className||'').toString().slice(0,50),txt:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,30),w:+w.toFixed(1),h:+h.toFixed(1),inline:isInline(e),dispInline:dispInline(e),spacingFail:conflict});
      }
    });
    // borders of form controls
    document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea,button').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width)return;const s=getComputedStyle(e);const bw=parseFloat(s.borderTopWidth);const bc=rgba(s.borderTopColor);const bg=bgOf(e.parentElement||e);
      const fill=rgba(s.backgroundColor);out.borders.push({tag:e.tagName.toLowerCase(),cls:(e.className||'').toString().slice(0,40),bw,border:bw>0?+ratio(over(bc,bg),bg).toFixed(2):null,fillVsGround:fill[3]>0?+ratio(over(fill,bg),bg).toFixed(2):null});});
    return out;
  });
  // keyboard focus pass
  const fo=[];
  await page.mouse.click(1,1);
  for(let i=0;i<60;i++){
    await page.keyboard.press('Tab');
    const f=await page.evaluate(()=>{
      const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
      const rgba=c=>{cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255];};
      const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};
      const Lm=([r,g,b])=>.2126*lin(r)+.7152*lin(g)+.0722*lin(b);
      const ratio=(a,b)=>{const x=Lm(a),y=Lm(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
      const over=(f,b)=>{const a=f[3];return [0,1,2].map(i=>f[i]*a+b[i]*(1-a))};
      const bgOf=el=>{const stack=[];for(let e=el;e;e=e.parentElement){const c=rgba(getComputedStyle(e).backgroundColor);if(c[3]>0)stack.push(c);if(c[3]>=1)break;}
        let b=[255,255,255];if(!stack.length||stack[stack.length-1][3]<1){b=getComputedStyle(document.documentElement).colorScheme.includes('dark')?[0,0,0]:[255,255,255];}
        for(let i=stack.length-1;i>=0;i--)b=over(stack[i],b);return b;};
      const e=document.activeElement;if(!e||e===document.body)return null;
      const s=getComputedStyle(e);const bg=bgOf(e.parentElement||e);
      const ow=parseFloat(s.outlineWidth),os=s.outlineStyle,oo=parseFloat(s.outlineOffset);
      let ringRatio=null,ringBg=bg;const ownBg=bgOf(e);
      if(os!=='none'&&ow>0){const oc=rgba(s.outlineColor);ringRatio=+ratio(over(oc,bg),bg).toFixed(2);var ringOwn=+ratio(over(oc,ownBg),ownBg).toFixed(2);}
      const sh=s.boxShadow;
      return {tag:e.tagName.toLowerCase(),cls:(e.className||'').toString().slice(0,40),txt:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,24),outline:os==='none'?'none':`${ow}px ${os} off${oo}`,outlineColor:s.outlineColor,ringRatio,ringOwn:(typeof ringOwn==='undefined'?null:ringOwn),ownBg:ownBg.map(Math.round).join(','),boxShadow:sh==='none'?null:sh.slice(0,80),border:s.borderTopWidth+' '+s.borderTopColor,bg:bg.map(Math.round).join(',')};
    });
    if(!f)break; fo.push(f);
  }
  results.push({theme,label,p,...data,focus:fo});
  await page.close();
}
await browser.close();
import fs from 'node:fs';fs.writeFileSync(outName,JSON.stringify(results,null,1));
console.log('done',results.length);
```

### A5. focus_diff.mjs (UX-A11Y-13)

This is the dive's `diff.mjs`, verbatim except for the first line, and renamed here. Usage:
`PAD=40 node focus_diff.mjs <url> <light|dark> <width> '<regex on tag.class|text>'`. It prints
the changed pixel count of each matching stop, focused against blurred. Re-run in revision 1 on
the built ocx.sh `index.html`, light, 1280: the three `ocx-cmdbar__trigger` stops gave 2124, 0
and 1858 changed pixels. followup-q0 explains the 0: the ancestor `.ocx-stage__finale` is at
opacity 0 when focus arrives (UX-A11Y-36). This script passes `clip` in page coordinates
(`r.y+scrollY`), which is correct. A viewport-coordinate clip photographs the wrong region.

```js
import puppeteer from 'puppeteer-core';
const [,,url,theme,vw,pred]=process.argv;
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:+vw,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}]);
await p.evaluateOnNewDocument((t)=>{try{localStorage.setItem('starlight-theme',t);localStorage.setItem('theme',t)}catch(e){}},theme);
await p.goto(url,{waitUntil:'networkidle0'});
await p.evaluate((t)=>{document.documentElement.dataset.theme=t},theme);
await p.mouse.click(1,1);
const seen=new Set();
for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');
  const info=await p.evaluate((pred)=>{const e=document.activeElement;if(!e||e===document.body)return null;const k=e.tagName.toLowerCase()+'.'+(e.className||'').toString()+'|'+e.textContent.trim().slice(0,20);const m=new RegExp(pred).test(k);const r=e.getBoundingClientRect();return {k,m,r:[r.x+scrollX,r.y+scrollY,r.width,r.height]}},pred);
  if(!info)break; if(!info.m||seen.has(info.k))continue; seen.add(info.k);
  let [x,y,w,h]=info.r;
  const clip={x:Math.max(0,x-(+process.env.PAD||10)),y:Math.max(0,y-(+process.env.PAD||10)),width:Math.min(w+2*(+process.env.PAD||10),1250),height:Math.min(h+2*(+process.env.PAD||10),700)};
  const f=await p.screenshot({clip,encoding:'base64',captureBeyondViewport:true});
  await p.evaluate(()=>document.activeElement.blur());
  const u=await p.screenshot({clip,encoding:'base64',captureBeyondViewport:true});
  const res=await p.evaluate(async(a,b)=>{const ld=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data};const A=await ld(a),B=await ld(b);let n=0;const cols={};for(let i=0;i<A.length;i+=4){if(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2])>30){n++;const k=A[i]+','+A[i+1]+','+A[i+2]+'<-'+B[i]+','+B[i+1]+','+B[i+2];cols[k]=(cols[k]||0)+1}}return {changed:n,total:A.length/4,top:Object.entries(cols).sort((a,b)=>b[1]-a[1]).slice(0,3)}},f,u);
  console.log(theme,vw,url.split('/').slice(3).join('/'),info.k.slice(0,60),JSON.stringify(res));
  // refocus for next tab progression
  await p.evaluate(()=>{});
}
await b.close();
```

### A6. colour_only_v2.mjs (UX-A11Y-19)

Replaced in revision 2. This is the prototype `colour_only_v2.mjs` from followup-q1, verbatim. It
replaces revision 1's `colour_only.mjs`, which read an `rgba()` colour as opaque and missed a
tint-only state (Radix docs side nav: 1.34:1 real, 3.27 scored). The changes: alpha is blended
onto the backdrop before the 3:1 test; a pseudo-element's `background-color`, `width` and `height`
count as a cue; a navigation error prints `ERROR` and exits 2. Always run it with `WAIT=load`. Its
default `networkidle2` still timed out on third-party pages, and `load` plus 1.5 s loaded 20 of 20
(followup-q1). Measured: 0 FAIL on 10 Primer pages; 1 real FAIL item on 10 Radix pages; 0 FAIL and
1 INFO item on the 5 fleet pages (revision 2). Usage:
`WAIT=load CHR=<chrome-headless-shell> node colour_only_v2.mjs <url> [<url> ...]`.

Fixture, saved as `fixture.html`. Expected: R1 and R3 FAIL, R2 and R4 silent. Run in revision 2:
`WAIT=load node colour_only_v2.mjs file://$PWD/fixture.html` printed `FAIL light … LI|row "Tabs" vs
"Overview"`, `FAIL light … A|nav "Blog" vs "Docs"`, the same two lines for dark,
`colour-only state pairs: 4`, and exited 1. `node colour_only_v2.mjs http://127.0.0.1:59999/`
exited 2.

```html
<!doctype html><meta charset="utf-8"><title>colour-only fixture</title>
<style>
body{background:#fff;color:#111;font:16px sans-serif}
ul{list-style:none;padding:0;margin:8px}
li.row{padding:6px 10px;color:#111;background:transparent}
li.row.is-current{background:rgba(0,68,255,.176)}                       /* R1: tint only: expected FAIL (about 1.34:1) */
a.tab{display:inline-block;position:relative;padding:6px 12px;color:#111;text-decoration:none}
a.tab::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:transparent}
a.tab.is-selected::after{background:#c33}                               /* R2: bar in a pseudo-element, content "" on both: expected silent */
a.nav{display:inline-block;padding:6px 12px;color:#0b4f9c;text-decoration:none}
a.nav.is-active{color:#8a2d1f}                                         /* R3: hue-only text change, lightness close: expected FAIL */
b.k{display:inline-block;padding:6px 12px;font-weight:400}
b.k.is-current{font-weight:700}                                         /* R4: weight change: expected silent */
</style>
<ul><li class="row">Overview</li><li class="row is-current">Tabs</li></ul>
<nav><a class="tab" href="#">Code</a><a class="tab is-selected" href="#">Issues</a></nav>
<nav><a class="nav" href="#">Docs</a><a class="nav is-active" href="#">Blog</a></nav>
<div><b class="k">One</b><b class="k is-current">Two</b></div>
```

```js
// Prototype of colour_only.mjs with the UX-A11Y-19 changes: alpha blended onto the backdrop, pseudo-element background/width/height counted as a cue,
// networkidle2 + 30 s timeout, exit 2 on a navigation error (exit 1 = FAIL found, 0 = none).
import puppeteer from 'puppeteer-core';
const urls = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: process.env.CHR, headless: true, args: ['--no-sandbox'] });
let fails = 0, navErr = 0;
for (const url of urls) for (const scheme of ['light', 'dark']) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const W = process.env.WAIT || 'networkidle2';
  try { await p.goto(url, { waitUntil: W, timeout: 30000 }); if (W === 'load') await new Promise((r) => setTimeout(r, 1500)); } catch (e) { navErr++; console.log('ERROR', scheme, url, String(e.message).split('\n')[0]); await p.close(); continue; }
  const rows = await p.evaluate(() => {
    const TOK = /(^|[-_])(active|selected|current|error|danger|success|warning|invalid|planned|checked|disabled)($|[-_])/;
    const isState = (e) => [...e.classList].some((c) => TOK.test(c)) ||
      e.getAttribute('aria-current') || ['aria-pressed', 'aria-selected', 'aria-invalid'].some((a) => e.getAttribute(a) === 'true');
    const key = (e) => e.tagName + '|' + [...e.classList].filter((c) => !TOK.test(c)).sort().join(' ');
    const CUE = ['font-weight', 'font-style', 'text-decoration-line', 'text-decoration-style', 'border-top-style',
      'border-top-width', 'border-bottom-style', 'border-bottom-width', 'border-left-width', 'outline-style',
      'outline-width', 'background-image', 'list-style-type', 'text-transform'];
    const PS = ['content', 'background-color', 'width', 'height'];
    const sig = (e) => {
      const s = getComputedStyle(e);
      const pseudo = ['::before', '::after'].map((x) => { const q = getComputedStyle(e, x); return PS.map((k) => q.getPropertyValue(k)).join('/'); }).join('|');
      return { css: CUE.map((k) => s.getPropertyValue(k)), pseudo, kids: [...e.children].map((c) => c.tagName + (c.getAttribute('aria-hidden') ? '-h' : '')).join(',') };
    };
    const rgba = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const a = m.length > 3 ? +m[3] : 1; return [+m[0], +m[1], +m[2], a]; };
    const backdrop = (e) => { let acc = [255, 255, 255]; const chain = []; for (let n = e; n; n = n.parentElement) chain.push(n);
      for (const n of chain.reverse()) { const c = rgba(getComputedStyle(n).backgroundColor); if (c) acc = acc.map((v, i) => c[i] * c[3] + v * (1 - c[3])); } return acc; };
    const blend = (c, under) => { const q = rgba(c); if (!q) return null; return under.map((v, i) => q[i] * q[3] + v * (1 - q[3])); };
    const lum = (rgb) => { const [r, g, bl] = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
    const ratio = (x, y) => { if (!x || !y) return 1; const a = lum(x), z = lum(y); return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05); };
    const lightCue = (e, q) => ['color', 'background-color', 'border-bottom-color'].some((k) =>
      ratio(blend(getComputedStyle(e).getPropertyValue(k), backdrop(e)), blend(getComputedStyle(q).getPropertyValue(k), backdrop(q))) >= 3);
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const all = [...document.body.querySelectorAll('*')].filter(vis);
    const peers = new Map();
    for (const e of all) if (!isState(e)) { const k = key(e); if (!peers.has(k)) peers.set(k, e); }
    const out = [];
    for (const e of all.filter(isState)) {
      const peer = peers.get(key(e));
      if (!peer) continue;
      const a = sig(e), z = sig(peer);
      const differs = a.pseudo !== z.pseudo || a.kids !== z.kids || a.css.some((v, i) => v !== z.css[i]);
      const colourDiff = ['color', 'background-color', 'border-bottom-color', 'outline-color'].some((k) => getComputedStyle(e).getPropertyValue(k) !== getComputedStyle(peer).getPropertyValue(k));
      if (!differs && !lightCue(e, peer)) out.push({ kind: colourDiff ? 'FAIL' : 'INFO', el: key(e), text: (e.textContent || '').trim().slice(0, 30), peer: (peer.textContent || '').trim().slice(0, 30) });
    }
    return out;
  });
  for (const r of rows) { fails += r.kind === 'FAIL'; console.log(r.kind, scheme, url, r.el, JSON.stringify(r.text), 'vs', JSON.stringify(r.peer)); }
  await p.close();
}
await b.close();
console.log('colour-only state pairs:', fails);
process.exit(navErr ? 2 : fails ? 1 : 0);
```

### A7. focus_outline_v2.mjs (UX-A11Y-12)

Added in revision 2. This is the prototype `focus_v2.mjs` from followup-q1, verbatim, published
under this name. Always run it with `V3=1`, which turns on fixes (e) and (f). It needs Node 20 or
later and `npm i -D postcss postcss-scss postcss-nested`. It scans one root per run. It prints
one tab-separated row per finding and the counts on stderr, and it sets no exit code: the pass
condition is that no row starts with `FAIL`. It does not read `<style>` blocks, and it has no BEM
ancestor branch (see UX-A11Y-12).

Fixture: save the two files below in a directory `ffix`, then run `V3=1 node
focus_outline_v2.mjs ffix`. Revision 2 run: FAIL for `.bare:focus`, `.nest:focus`, `.bs`
(`all:unset, box-shadow only`) and `.scss-bare:focus`; PASS for `.ring:focus-visible` (replacement
`a.css:4 .ring:focus-visible::after`) and `.ok`; EXEMPT for `.dlg:focus`; no row for F1 and F8.
The stderr line was `{"FAIL":4,"PASS":2,"EXEMPT":1}`.

```css
/* ffix/a.css */
.mouse { &:focus:not(:focus-visible) { outline: 0; } }               /* F1 expect: skipped (no line) */
.bare:focus { outline: none; }                                        /* F2 expect: FAIL no replacement */
.ring:focus-visible { outline: none; }
.ring:focus-visible::after { outline: 2px solid blue; }               /* F3 expect: PASS (pseudo-element ring) */
.nest { padding: 0; &:focus { outline: none; } }                      /* F4 expect: FAIL (nesting resolved, selector is .nest:focus) */
.bs { all: unset; }
.bs:focus-visible { box-shadow: 0 0 0 2px red; }                      /* F5 expect: FAIL box-shadow only */
.ok { all: unset; }
.ok:focus-visible { outline: 2px solid blue; }                        /* F6 expect: PASS */
/* focus-ok: container focused by script */
.dlg:focus { outline: none; }                                         /* F7 expect: EXEMPT */
.in::-webkit-datetime-edit-day-field:focus { outline: none; }         /* F8 expect: skipped (vendor sub-part) */
```

```scss
/* ffix/b.scss */
.scss-bare { &:focus { outline: 0; } }                                /* F9 expect: FAIL (.scss scanned) */
```

```js
// Prototype of focus_outline.py with fixes (a)-(d). Node + postcss so nesting resolves. Not the shipped script.
// (a) skip selectors containing :not(:focus-visible)/:not(:focus); (b) resolve nesting; (c) look for the replacement in every file under the root;
// (d) scan .scss, treat all:unset/initial, outline:transparent, outline-color:transparent as removals; all:unset on a plain class counts too.
import fs from 'fs'; import path from 'path';
import postcss from 'postcss'; import scss from 'postcss-scss'; import nested from 'postcss-nested';
const root = process.argv[2];
function* walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) { if (e.name==='node_modules'||e.name==='.git') continue; const p=path.join(d,e.name); if (e.isDirectory()) yield* walk(p); else if (/\.(css|scss)$/.test(e.name)) yield p; } }
const FOCUS=/:focus(-visible|-within)?\b/;
const split=(s)=>{const o=[];let d=0,c='';for(const ch of s){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&d===0){o.push(c.trim());c=''}else c+=ch}o.push(c.trim());return o};
const V3=process.env.V3==='1';
const base=(s)=>s.replace(V3?/::(before|after)\b/g:/$^/,'').replace(/:not\(:focus(-visible)?\)/g,'').replace(/:focus(-visible|-within)?\b/g,'').replace(/:where\(\)|:is\(\)/g,'').replace(/\s+/g,' ').trim();
const removes=(d)=>{const r=[];for(const [k,v0] of Object.entries(d)){const v=v0.trim();
  if(k==='outline'&&/^(none|0(px)?|transparent)\s*(!important)?$/.test(v))r.push(k+':'+v);
  if(k==='outline-style'&&v==='none')r.push(k+':'+v); if(k==='outline-width'&&/^0(px)?$/.test(v))r.push(k+':'+v);
  if(k==='outline-color'&&/^transparent$/.test(v))r.push(k+':'+v); if(k==='all'&&/^(unset|initial)$/.test(v))r.push('all:'+v);} return r};
const draws=(d)=>Object.entries(d).some(([k,v])=>(k==='outline'&&!/^(none|0(px)?|transparent)/.test(v.trim()))||(k==='outline-style'&&v.trim()!=='none')||/^border(-(top|right|bottom|left))?(-color)?$/.test(k)&&!/^(none|0)/.test(v.trim())||(k==='outline-color'&&!/transparent/.test(v)));
const rules=[];
for (const f of walk(root)) { const src=fs.readFileSync(f,'utf8'); let r;
  try{ r=postcss([nested()]).process(src,{from:f,syntax:scss}).root }catch(e){ console.error('PARSEERR',f,String(e).slice(0,60)); continue }
  r.walkRules(ru=>{ if(ru.parent&&ru.parent.type==='atrule'&&/keyframes/.test(ru.parent.name)) return; const d={}; ru.each(n=>{if(n.type==='decl')d[n.prop]=n.value});
    const prev=ru.prev(); const ok=prev&&prev.type==='comment'&&/focus-ok:/.test(prev.text);
    for (const s of split(ru.selector)) rules.push({f:path.relative(root,f),line:ru.source?.start?.line,s,d,ok}); });
}
const counts={};
const emit=(v,r,kind,ev)=>{counts[v]=(counts[v]||0)+1;console.log([v,kind,r.f+':'+r.line,r.s.slice(0,90),ev].join('\t'))};
for (const r of rules) { const rem=removes(r.d); if(!rem.length) continue;
  const isFocus=FOCUS.test(r.s); const plainUnset=!isFocus&&rem.length===1&&rem[0].startsWith('all:')&&!/:/.test(r.s);
  if(!isFocus&&!plainUnset) continue;
  if(isFocus&&/:not\(:focus(-visible)?\)/.test(r.s)){ continue } // (a) mouse-focus idiom
  if(V3&&isFocus&&/::-webkit-/.test(r.s)) continue; // (e) vendor sub-part pseudo-element of an input: the root draws the ring
  if(r.ok){emit('EXEMPT',r,rem[0],'focus-ok');continue}
  const rest={...r.d}; delete rest.outline; delete rest['outline-style']; delete rest['outline-width']; delete rest['outline-color']; delete rest.all;
  if(isFocus&&draws({...rest, ...(/^outline/.test(rem[0])?{}:{})})&&Object.keys(r.d).some(k=>/^(border|outline)/.test(k)&&!rem.some(x=>x.startsWith(k+':')))){emit('PASS',r,rem[0],'same rule draws');continue}
  const b=base(r.s); const last=b.split(/[\s>+~]+/).pop();
  const hit=rules.find(x=>x!==r&&FOCUS.test(x.s)&&!/:not\(:focus(-visible)?\)/.test(x.s)&&draws(x.d)&&!removes(x.d).length&&(base(x.s)===b||(x.s.includes(':has(')&&last&&x.s.includes(last))||(x.s.includes(':focus-within')&&base(x.s)&&(b.startsWith(base(x.s)+' ')))));
  if(hit) emit('PASS',r,rem[0],'replacement '+hit.f+':'+hit.line+' '+hit.s.slice(0,50));
  else { const sh=rules.some(x=>FOCUS.test(x.s)&&base(x.s)===b&&x.d['box-shadow']); emit('FAIL',r,rem[0],(plainUnset?'all:unset, ':'')+(sh?'box-shadow only':'no replacement')) }
}
console.error(JSON.stringify(counts));
```

### A8. focus_opacity.mjs (UX-A11Y-36)

Written in revision 2 from the `probeM.mjs` method of followup-q0. That probe was tied to one
selector, and this version checks every Tab stop. Usage: `CHR=<chrome-headless-shell> node
focus_opacity.mjs <url> [<url> ...]`, with optional `THEMES`, `WIDTHS`, `MOTION=reduce` and
`STOPS`. Exit 0 means every stop is visible, 1 means at least one FAIL, 2 means a page failed to
load. Fixture, saved as `opacity.html`. Expected: O2 FAIL, O1, O3 and O5 pass, and O4 is not a
stop. Run in revision 2: `THEMES=light WIDTHS=1280 node focus_opacity.mjs file://$PWD/opacity.html`
printed one FAIL line, for "O2 in opacity-0 container" with `"eff":0` and `"low":"DIV.fade"`, then
`stops … 4` and `invisible focus stops: 1`. It exited 1. `node focus_opacity.mjs
http://127.0.0.1:59999/` exited 2. Fleet results are in "Applied to the fleet", UX-A11Y-36.

```html
<!doctype html><html lang="en"><title>fixture</title>
<style>.fade{opacity:0}.fixed{opacity:0}.fixed:focus-within{opacity:1}.vh{visibility:hidden}</style>
<button>O1 visible</button>
<div class="fade"><button>O2 in opacity-0 container</button></div>
<div class="fixed"><button>O3 container fixed with focus-within</button></div>
<div class="fade" inert><button>O4 inert, not a stop</button></div>
<button>O5 visible</button>
</html>
```

```js
// UX-A11Y-36 check: every Tab stop is visible when it has focus (effective opacity and visibility).
// Usage: CHR=<chrome-headless-shell> node focus_opacity.mjs <url> [<url> ...]
//   env: THEMES=light,dark  WIDTHS=1280,390  MOTION=no-preference|reduce  STOPS=120
// Exit 0 = every stop visible, 1 = at least one FAIL, 2 = a page failed to load.
// shortcut: reads computed opacity, visibility and content-visibility only; clip-path, a zero-size clip and an off-screen
// position are not seen. Upgrade with a pixel diff (focus_diff.mjs) when a stop passes here but shows 0 changed pixels.
import puppeteer from 'puppeteer-core';
const urls = process.argv.slice(2);
const env = (k, d) => (process.env[k] || d).split(',');
const b = await puppeteer.launch({ executablePath: process.env.CHR, headless: true, args: ['--no-sandbox'] });
let fails = 0, errs = 0;
for (const url of urls) for (const theme of env('THEMES', 'light,dark')) for (const vw of env('WIDTHS', '1280,390')) {
  const p = await b.newPage();
  await p.setViewport({ width: +vw, height: 800 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme },
    { name: 'prefers-reduced-motion', value: process.env.MOTION || 'no-preference' }]);
  await p.evaluateOnNewDocument((t) => { try { localStorage.setItem('starlight-theme', t); localStorage.setItem('theme', t); } catch (e) {} }, theme);
  try { await p.goto(url, { waitUntil: 'load', timeout: 30000 }); await new Promise((r) => setTimeout(r, 1500)); }
  catch (e) { errs++; console.log('ERROR', theme, vw, url, String(e.message).split('\n')[0]); await p.close(); continue; }
  await p.mouse.click(1, 1);
  let n = 0;
  for (let i = 0; i < +(process.env.STOPS || 120); i++) {
    await p.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 300)); // let scroll-driven styles settle
    const o = await p.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      if (e.__fo) return { again: true }; e.__fo = 1; // back at a stop already seen: the Tab order wrapped
      let eff = 1, hidden = null;
      for (let a = e; a; a = a.parentElement) {
        const s = getComputedStyle(a); eff *= parseFloat(s.opacity);
        if (!hidden && (s.visibility === 'hidden' || s.contentVisibility === 'hidden')) hidden = a.tagName + '.' + String(a.className).slice(0, 40);
      }
      let low = null; // the outermost ancestor that lowers opacity, to name the container to fix
      for (let a = e; a; a = a.parentElement) if (parseFloat(getComputedStyle(a).opacity) < 1) low = a.tagName + '.' + String(a.className).slice(0, 40);
      return { k: e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 40) + '|' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24),
        eff: +eff.toFixed(3), hidden, low, sy: Math.round(scrollY) };
    });
    if (!o || o.again) break; n++;
    if (o.eff < 0.99 || o.hidden) { fails++; console.log('FAIL', theme, vw, url, JSON.stringify(o)); }
  }
  console.log('stops', theme, vw, url, n);
  await p.close();
}
await b.close();
console.log('invisible focus stops:', fails);
process.exit(errs ? 2 : fails ? 1 : 0);
```

## Revision log

Revision 1, 2026-11-27, after an adversarial check. No rule was renumbered. One rule was retired
(21), and no new IDs were added.

- UX-A11Y-29: MUST demoted to SHOULD, labelled house policy. WCAG needs no landmark count, and
  `landmark-one-main`, `region` and `landmark-no-duplicate-banner` are axe best-practice rules
  (rule-descriptions, fetched 2026-11-27). This matches -31. Verdict 4 now says so.
- UX-A11Y-35: split by clause. The colour clause stays MUST, now as declared house policy (Verdict
  4c), grounded in the platform's "Ensure all elements in the view are themeable". The
  `--vscode-focusBorder` clause is now SHOULD until a rendered webview confirms it. The name is
  confirmed in VS Code source (`themeing.ts`). The "expose it as a command" clause was dropped
  because it had no check. The hex grep now filters comment lines. The full scan gives 0. A
  high-contrast test was found missing and is listed as Violated.
- UX-A11Y-12: the prose Verify was replaced by `focus_outline.py` (Appendix A1), with a
  self-test, a `focus-ok:` exemption marker and a stated scope limit. Fleet run recorded in
  Satisfied.
- UX-A11Y-19: the greyscale reading check was replaced by `colour_only.mjs` (Appendix A6), a
  computed-style diff against stateless peers that counts 3:1 lightness as a cue, per
  Understanding 1.4.1. axe `link-in-text-block` and an `aria-invalid` message check were added.
  Fleet run: 0 FAIL, 1 INFO.
- UX-A11Y-33: the "never decide set membership yourself" clause was moved out of the MUST to the
  ask-a-human list, because it had no pass or fail. A reverse check was added for bullet 2's second
  half: one URL with two link texts.
- UX-A11Y-22, -24: the Verify no longer cites the missing cache directory
  `~/.cache/…/ux-announce-harness/`. It cites the in-repo harness source in
  announcements-and-motion.md "Harness source", with setup steps, and labels results simulated
  and not re-run in this revision. -24 gained a source check that needs no harness.
- UX-A11Y-03, -04, -13, -15, -16, -20, -35: the cache-only scripts were inlined in the Appendix
  (`scan_wv.py`, `measure.mjs`, the dive's `diff.mjs` as `focus_diff.mjs`). A generic
  `wcag_contrast.py` was added, because the audit's `contrast.py` has the fleet's pairs hard-coded.
  -13 no longer says that `measure.mjs` does the pixel diff. `focus_diff.mjs` does it.
- UX-A11Y-26: the Why now derives 0.34 s from the WCAG flash definition (1/3 s per full cycle,
  rounded up; 1/6 s with `alternate`). The Verify is labelled a heuristic and names what it cannot
  see.
- UX-A11Y-17, -21: folded into one CONSIDER note at 17 (17 was MUST NOT). 21 is retired, and its
  number is not reused. Failure mode 22 and the owner-decision line now cite 17. UX-A11Y-02, -03
  and -04 were kept because each has a measured webview violation. UX-A11Y-05 was kept at MUST:
  it is Level A (2.5.3) and has an axe rule, but no fleet violation is measured.
- UX-A11Y-10: each refusal row now has an ID (10a to 10j) and a runnable detector. Row 10f gained
  query Q1, 10g query Q2, and 10h test T1, all tested on a fixture in revision 1. 10d gained a grep
  for links carrying `menuitem`. 10j names the `html-validate` command. The rule stays one ID,
  because citations use it.
- New commitments: every row is labelled *unmeasured*, and Verdict 12 lists them. Their severity
  is the WCAG or APG level, not a fleet count. The -35 row now records the full colour scan.
- UX-A11Y-13 Applied row: the asciinema `pre.ap-term-text` is now confirmed three ways (pixels,
  computed style, source `asciinema-player.css:111-124` with 0 `:focus` rules). The second
  `ocx-cmdbar__trigger` is explicitly not cited. The Verify now treats a 0-pixel stop as a lead
  until the computed style confirms it. Open question 6 was narrowed to the cmdbar trigger, and
  Open question 7 was added for the new scripts.
- Verdict 13 added: every check is a command or is labelled a heuristic. Decay table: added
  `themeing.ts`, the flash definition, the 1.4.1 lightness clause and the scripts.

Revision 2, 2026-11-27, folding the wave-2 follow-ups. No rule was renumbered, retired or demoted.
One rule was added (36). No severity changed on an existing rule.

- 2026-11-27, UX-A11Y-36 (new, MUST), from followup-q0: a focused control must be visible. The
  0-pixel cmdbar trigger is a real defect: its container `.ocx-stage__finale` is at opacity 0 when
  focus arrives, at default motion, in both themes and at both widths. The `:focus-within` fix was
  verified; the `focusin` fix reverts on scroll. Revision 2 wrote `focus_opacity.mjs` (Appendix
  A8), checked it on a fixture, and ran it on 5 fleet pages: 2 more containers fail (the
  ScrollFade hero at 390 px, the asciinema control bar). Violated row, Verdict 6, failure mode 23
  and the shared-theme ask were added.
- 2026-11-27, UX-A11Y-13, from followup-q0: the Verify no longer calls a 0-pixel stop
  unexplained. It resolves such a stop with two reads (computed ring, effective opacity) and
  requires page-coordinate clips. The Applied row cites the cmdbar trigger under 36, not 13.
  Appendix A5's note was updated.
- 2026-11-27, UX-A11Y-12, from followup-q1: the rule gained the `all: unset|initial` clause and
  the cross-file `focus-ok: ring drawn by <selector> in <file>` comment. The Verify now calls
  `focus_outline.py` a lead generator (precision 37%, recall 11 of 52 on Primer and Radix). It
  adds the measured prototype as `focus_outline_v2.mjs` (Appendix A7, with its nine-case fixture).
  The pass condition is the triaged end state: A1 exits 0 and A7 prints no FAIL row. Severity
  stays MUST: after triage the end state is checkable. Revision 2 ran A7 on the fleet and found
  1 false positive (`field.css:188`), caused by its missing BEM branch.
- 2026-11-27, UX-A11Y-19, from followup-q1: a colour pair counts as a cue only after alpha
  blending. A pseudo-element's `background-color`, `width` and `height` count as a cue. Appendix
  A6 is replaced by the measured `colour_only_v2.mjs` (exit 2 on a load error, run with
  `WAIT=load`) and its R1 to R4 fixture. Revision 2 re-ran it on the fixture (4 FAIL lines,
  exit 1) and on the 5 fleet pages (0 FAIL, exit 0). The Satisfied row was updated.
- 2026-11-27, UX-A11Y-22, from followup-q2: the Why quoted a phrase, "may not be announced
  reliably", that is not on the ARIA22 page. This revision confirmed that by `curl` on the raw
  HTML. The Why now quotes ARIA22 test 1 and ARIA19, and says that neither page states what
  happens when a role is added with its content. The Verify gained the error-container and
  status-container checks. The Applied row was re-measured: 3 live elements at `9230dcd`, and
  the status region renders on the paging branch only. Failure mode 18 was updated.
- 2026-11-27, UX-A11Y-23, from followup-q2: Satisfied row re-confirmed; no text change.
- 2026-11-27, Open questions 6 and 7 removed as answered (followup-q0, followup-q1). Questions 8
  (one merged focus check against an oracle) and 9 (36 outside headless Chrome) were added.
  Verdict 13 was extended and Verdict 14 added for the documented gaps.
- 2026-11-27, Decay: ARIA22/ARIA19 row and Primer/Radix precision row added. The scripts row
  now covers A6 to A8, the WCAG row now covers 36, and the fleet row pins the wave-2 commits.
  Frontmatter: the three follow-ups are added to `consolidates`, and `revision: 2` was added.

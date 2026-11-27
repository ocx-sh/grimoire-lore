---
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
---

# UX Quality

Traps, not a design system. Every line names a mistake generated interface code
makes by default: a `div` that takes clicks, a ring removed and never replaced, an
empty state shown while the fetch is still running, a toast that carries the only
copy of an error, a "WCAG compliant" sentence after one green run. Scope is
rendered pages: web apps, docs sites (MkDocs `overrides/` included), built HTML and
editor webviews. Design tokens, the cascade and forced-colours mechanics are
`css-theming`. Markdown content is `docs-quality`. This rule installs with the
eight globs above and loads on a component, template or stylesheet edit, never on
Markdown and never on `.ts`.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

## The Gate

Run it after every change to markup, CSS or script of a rendered page, against a
served production build in a real browser. Never jsdom, never a dev server. The
scripts are in the `ux-quality-reference` skill (`CHECKS=.claude/skills/ux-quality-reference/checks`). `DIST` is the build output directory,
`BASE` the URL it is served at. `routes.txt`, `a11y-baseline.json` and `states.json` do not
exist on a first run: `verification.md` Setup says how to create each, so do that before step 3.

```sh
npx eslint .                                                                        # 1 static lint: TS-WEB-06 for JSX, astro/jsx-a11y for .astro (UX-VERIFY-12)
python3 -I "$CHECKS"/page_structure.py --sitemap "$DIST"/sitemap-0.xml --page-list routes.txt "$DIST"   # 2 lang, title, main, h1, skip link, consistent chrome
node "$CHECKS"/axe-fixture.mjs "$BASE" --routes routes.txt --states states.json --baseline a11y-baseline.json   # 3 axe: every route, every scheme, every open state
node "$CHECKS"/ui-matrix.mjs "$BASE" matrix.json / ROUTE...                         # 4 reflow, zoom, schemes, forced colours, reduced motion, Tab walks
node "$CHECKS"/axe-fixture.mjs --red-demo                                           # 5 only when the gate config changed: the gate must go red on a planted defect
```

**Pinned** tool versions, re-checked 2026-11-27: axe-core 4.14.1, `@axe-core/playwright`
4.14.1, `playwright-core` 1.63.0, installed at those exact versions and moved only
together with the committed needs-review baseline (UX-VERIFY-06). The fixture calls
axe with exactly five tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
(UX-VERIFY-02). `best-practice` results stay in their own set (UX-VERIFY-09).

Step 3 asserts on `incomplete` as well as violations (UX-VERIFY-03). Step 4 blocks
only on its objective checks: horizontal scroll, scheme and forced-colours failures,
unnamed stops, a walk that never wraps, lost focus. Its clipped-text, focus-ring and
obscured-focus checks are advisory and go to Needs human review, because no human has
labelled their firings (UX-VERIFY-13). Steps 3 and 4 block every pull request that
touches interface code (UX-VERIFY-07). List every step under `ran:` or `did not run:`
with the reason (UX-VERIFY-01), and fix and re-run until the first run's findings are gone.
On an Astro repository, `npx eslint --print-config <an .astro file> | grep -c astro/jsx-a11y`
printing 0 means step 1 checks no accessibility rule: list it under `did not run:`.

An interface change is done when the report names each command, its exit status, the
tool versions, the routes and schemes it covered, and what no automated step decides.
A green gate covers at most 21 of 55 A and AA criteria, none completely (the count and
its date are the first row of `verification.md` Dates and Versions). Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge within the scope it names. IDs resolve through
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale and
verification.

| # | Rule | ID |
|---|---|---|
| 1 | Use a native `<button type="button">` for every action and `<a href>` for every navigation. No click handler, `role="button"`, `role="link"` or `tabindex="0"` on a `div`, `span` or `li`. Never `href="#"`, `href=""` or `javascript:`. | UX-A11Y-01, UX-A11Y-02 |
| 2 | Give every input, select and textarea a programmatic label, never a placeholder alone. Name an icon-only control with hidden text or `aria-label` and mark its icon `aria-hidden`. A control's accessible name starts with its visible text. | UX-A11Y-03, UX-A11Y-04, UX-A11Y-05 |
| 3 | Expose every visual state in markup (`aria-pressed`, `aria-expanded`, `aria-current`, native `checked`). Open a modal with `<dialog>` and `showModal()`. Never write ARIA that the spec forbids. Build a custom widget only when no native element fits, to the APG contract, with a test that sends every required key. | UX-A11Y-07, UX-A11Y-08, UX-A11Y-10, UX-A11Y-11 |
| 4 | Never remove a focus indicator without drawing a replacement, on `:focus-visible`, at 3:1 against what it sits on. A sticky or fixed bar never hides a focused control (`scroll-padding`). A fade, translate or reveal never leaves a focused control invisible. | UX-A11Y-12, UX-A11Y-13, UX-A11Y-14, UX-A11Y-36 |
| 5 | Normal text 4.5:1, large text 3:1, and a boundary or indicator that identifies a control 3:1, in every theme and on every surface. Pair every colour-coded state with a second cue. | UX-A11Y-15, UX-A11Y-16, UX-A11Y-19 |
| 6 | Give every pointer target a rendered hit box of at least 24 by 24 CSS px, or a recorded exception. | UX-A11Y-20 |
| 7 | Announce a result by writing text into a `role="status"` container that is present and empty in the initial markup. Use `role="alert"` for errors only. Give movement or auto-updating content that runs over 5 s a visible pause control. Never flash more than three times in any second. | UX-A11Y-22, UX-A11Y-23, UX-A11Y-25, UX-A11Y-26 |
| 8 | Set `lang` and a non-empty `<title>` in every page template. Make a skip link the first focusable element wherever a header or navigation repeats. Keep repeated navigation in the same relative order on every page of a set. | UX-A11Y-28, UX-A11Y-32, UX-A11Y-33 |
| 9 | In a VS Code webview, apply every UX-A11Y rule and test it in the `vscode-high-contrast` theme. (SHOULD, house policy: take every colour from a `--vscode-*` variable; report a miss, do not block on it.) In extension code, validate a formatted `showInputBox` value, show a wait of 1 s or more on a native progress surface, and show at most one notification per user action. | UX-A11Y-35, UX-STATE-28, UX-STATE-29, UX-STATE-31 |
| 10 | Give every view that reads an async source a loading, an empty and an error branch. Show empty copy only after the fetch has settled with zero items. A failure never looks like an empty view. An error names its problem class and offers one recovery control. | UX-STATE-01, UX-STATE-02, UX-STATE-03, UX-STATE-04 |
| 11 | Set a local pending flag before the first `await` of an async handler. Give every network or child-process wait a deadline and a visible failure path. | UX-STATE-08, UX-STATE-14 |
| 12 | Never put an error, or a fact the user needs to finish the task, only in a toast or an auto-dismissing notice. | UX-STATE-17 |
| 13 | Never disable a submit control because the form is invalid. Put each field error as text next to its field, tied by `aria-describedby`. Move focus exactly once after a failed submit. Never discard what the user typed. Set a standard `autocomplete` token on every field that collects data about the user. | UX-STATE-21, UX-STATE-23, UX-STATE-24, UX-STATE-25, UX-STATE-27 |
| 14 | An error message says what failed and quotes the offending input, gives a next step that exists in the product, states only causes the code checked, and suggests only commands, flags and settings that exist. | UX-TEXT-01, UX-TEXT-02, UX-TEXT-03, UX-TEXT-04 |
| 15 | Give every `<img>` an `alt` attribute. Never write `(s)` plurals. A status string names its subject and its outcome. Label a byte size by the base the code divides by. | UX-TEXT-20, UX-TEXT-25, UX-TEXT-30, UX-TEXT-28 |
| 16 | A confirmation awaits its result before it mutates. It never labels the confirm button `OK`, `Yes`, `Confirm` or `Continue`, never starts focus on the destructive control, and shows the exact content and destination built from resolved values. | UX-ACT-04, UX-ACT-05, UX-ACT-07, UX-ACT-09 |
| 17 | Model output never triggers a network image load and never renders raw HTML. An AI disclosure is visible text in the accessibility tree, not an icon or a tooltip. | UX-AI-09, UX-AI-10, UX-AI-01, UX-AI-02 |
| 18 | Silencing the gate is an owner decision: disabling an axe rule, excluding an element, raising a baseline or skipping a matrix row needs the owner's approval in the pull request. | UX-VERIFY-10 |
| 19 | Never claim accessibility or conformance ("accessible", "WCAG compliant"), never cite a Lighthouse score as evidence, never draft a conformance statement or a sentence about a legal regime. Write "WCAG 2.2 Level AA" only to name the test set. | UX-VERIFY-24, UX-VERIFY-25, UX-VERIFY-30, UX-VERIFY-31 |
| 20 | Say lab or field for every performance number. Start a sentence about what users did or felt with "hypothesis:" unless a session, query or run ID and n back it. Banner any synthetic-user output. | UX-VERIFY-27, UX-VERIFY-28, UX-VERIFY-29 |

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep: these files do not point at each other. Depth files and checks
scripts ship in the `ux-quality-reference` skill this rule requires; load it, or read
`.claude/skills/ux-quality-reference/<file>` (`~/.claude/skills/` when installed globally).

| Doing… | Read |
|---|---|
| Writing a button, link, dialog, menu, tabs, combobox, disclosure or toggle, adding `role` or `aria-*`, or building a custom widget (UX-A11Y-01 to 11) | [ux-quality-reference/widgets.md](../skills/ux-quality-reference/widgets.md) |
| Styling focus, setting a text, border or state colour, sizing a hit target, adding a sticky header, declaring `color-scheme`, or fading or revealing a container that holds focusable controls (UX-A11Y-12 to 21, 36, 37) | [ux-quality-reference/focus-and-colour.md](../skills/ux-quality-reference/focus-and-colour.md) |
| Announcing a result (copied, saved, N results), adding a live region, an animation, autoplay, parallax or a flashing effect, or gating motion on reduced-motion (UX-A11Y-22 to 27) | [ux-quality-reference/motion-and-announcements.md](../skills/ux-quality-reference/motion-and-announcements.md) |
| Writing a page template, layout or navigation: `lang`, title, landmarks, headings, a skip link, repeated chrome, or a link to a page that does not exist yet (UX-A11Y-28 to 34) | [ux-quality-reference/page-structure.md](../skills/ux-quality-reference/page-structure.md) |
| Writing what an editor extension's user sees: a notification, progress, input box, modal, status-bar item or webview panel (UX-A11Y-35, UX-STATE-28 to 33) | [ux-quality-reference/editor-extensions.md](../skills/ux-quality-reference/editor-extensions.md) |
| Fetching data and rendering loading, empty, error, partial or stale states, a progress indicator, a skeleton, a refresh, a retry, a toast or a banner (UX-STATE-01 to 19, 34) | [ux-quality-reference/states.md](../skills/ux-quality-reference/states.md) |
| Writing a form field, its label, validation, required marker, submit button, error summary or `autocomplete` (UX-STATE-20 to 27, 35, 36) | [ux-quality-reference/forms.md](../skills/ux-quality-reference/forms.md) |
| Writing an error message, warning, button label, link text, status string, `alt` text, plural, date or number format, or a setting description (UX-TEXT) | [ux-quality-reference/text.md](../skills/ux-quality-reference/text.md) |
| Adding a delete, overwrite, publish, send or other action that is hard to undo, writing a confirmation dialog, or classifying an action by tier T0 to T3 (UX-ACT-01 to 11) | [ux-quality-reference/actions.md](../skills/ux-quality-reference/actions.md) |
| Building a chat, assistant, summary or any view that shows model output: disclosure, labels, Markdown rendering, links, citations, tool-call states, streaming, memory (UX-AI) | [ux-quality-reference/ai-features.md](../skills/ux-quality-reference/ai-features.md) |
| Finishing an interface change, configuring axe or the matrix, wiring the gate into CI, or writing a report or PR sentence about accessibility, performance or users (UX-VERIFY-01 to 17, 24 to 32) | [ux-quality-reference/verification.md](../skills/ux-quality-reference/verification.md) |
| Writing CLI help, `--version`, error lines or terminal colour and animation | `ux-cli` (skill) |
| Writing JSON output for scripts, an MCP server's tools, or an agent's approval prompt | `ux-agent-interfaces` (skill) |
| Editing a page's `<head>`: title, description, canonical, Open Graph tags | `marketing-quality` (sibling rule) |
| Defining tokens, theming, dark mode or forced-colours styles | `css-theming` (sibling rule: CSS-A11Y-01) |
| Writing Markdown docs pages | `docs-quality` (sibling rule) |
| Grading an untouched page or a pull request against these rules, and the report shape and human pass (UX-VERIFY rules 18 to 23) | `ux-review` (skill) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the commit
body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned** or "house policy" encode an agreed decision rather than a
derivable fact: the 1000 ms show-delay for loading indicators, `Consequence:` lines in
T2 and T3 help, the T0 to T3 action tiers and the `docs/consequential-actions.md`
inventory, the `data-ai-disclosure` marker, the `focus-ok:` marker, a skip link on every
template that repeats chrome, one `<main>` and one `<h1>` per page, the pinned axe and
Playwright versions, the `matrix-labels.csv` header, and the `SIMULATED (synthetic
user)` banner. Each is a default an adopter may override once, in its config or in the
inventory file, never per call site. Overriding one is a decision recorded with its
reason, ignoring one is a violation, and re-arguing one in a pull request is not a
review comment.

Not studied here: commerce flows and deceptive patterns (checkout, cancellation,
consent banners), real assistive-technology runs (an agent requests them and never
records them), field performance data, and matrix behaviour in WebKit and Firefox.
Keep the Block list short enough that a blocked change is unusual.

## Siblings

- **`css-theming`**: co-loads on all eight globs. It owns the cascade that delivers a
  focus ring or a contrast pair, and forced-colours mechanics (CSS-A11Y-01). This set
  owns the outcome: a ring that is visible, a pair that reaches its ratio.
- **`typescript-quality`**: co-loads on `.tsx` and `.jsx`. TS-WEB-06 is the static JSX
  accessibility lint that step 1 of the gate runs. Extension host code is `.ts`, so
  its routing table points to `editor-extensions.md`.
- **`docs-quality`**: Markdown content, landing-page structure and the rendered docs
  page's prose. A rendered docs page's accessibility is this rule's.
- **`marketing-quality`**: a page's head tags, claims and first screen.
- **`ux-cli`, `ux-agent-interfaces` and `ux-review`**: the CLI, machine-output and
  on-demand review procedures over the same rule IDs. The skills cite these IDs and never
  restate them.

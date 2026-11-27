---
title: Focus, contrast, target size and colour-only cues (visual accessibility floors for agent-written CSS and components)
program: product
sub_program: ux
topic: ux-a11y-authoring
worker: focus-contrast-target-size
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
scope: Visual accessibility floors an agent must meet in CSS and components. Covers WCAG 2.2 criteria 2.4.7, 2.4.11, 2.4.13, 1.4.3, 1.4.11, 1.4.1, 2.5.8 and 2.5.5, the GOV.UK focus pattern, Primer control sizes, the APCA and WCAG 3 status, and WebAIM Million 2026. Measured against the OCX theme and Grimoire docs. Not covered - token architecture (css-theming), ARIA and widget refusals (sibling worker). Scout rows were followed by ID: the IDs are file prefix plus the row number of the Candidate topics table (AX = accessibility.md, CS = codified-systems.md, CG = canonical-guides.md, PI = patterns-ia.md, RS = research-measurement.md, PR = practitioner.md, FC = failure-corpus.md); see Scout rows followed.
---

# Focus, contrast, target size and colour-only cues

## Contents
1. Summary
2. Findings (1 focus, 2 contrast, 3 target size, 4 colour-only cues, 5 editor webviews, 6 measurements)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Prevalence: low-contrast text is the most common detected failure, on 83.9% of home pages ([WebAIM Million 2026](https://webaim.org/projects/million/), analysis February 2026, updated 2026-03-30; independent study). Contrast is the default check, not an edge case.
- Focus: 2.4.7 (AA) requires a visible keyboard focus indicator; failure technique F78 covers styling that removes it ([Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), updated 2026-10-04). Removing `outline` is legal only with a replacement.
- Focus contrast: the indicator needs 3:1 against adjacent colours (1.4.11); unmodified browser defaults are exempt ([Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), updated 2026-10-04).
- Focus thickness: a solid 2 CSS px outline is the simplest way to meet 2.4.13, which is AAA, so a 2px ring is a good default but not an AA requirement ([Understanding 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html), updated 2026-10-04).
- Sticky UI: 2.4.11 (AA) fails only when a focused component is entirely hidden by author content; the sufficient technique is CSS `scroll-padding` (C43), failure F110 ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), updated 2026-06-15).
- Text contrast: 4.5:1 normal text, 3:1 for 18pt or 14pt bold; the ratio is not rounded (4.499 fails) ([Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), updated 2026-10-04).
- Non-text contrast: 3:1 for the visual information that identifies a control and its states; an input whose border is the only cue needs a 3:1 border (`#767676` passes on white, `#AAA` fails). Disabled controls are exempt.
- Target size: 24x24 CSS px at AA (2.5.8) with five exceptions; 44x44 is AAA (2.5.5) ([2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), updated 2026-11-02; [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), updated 2026-09-06).
- Colour-only: 1.4.1 (Level A) forbids colour as the only means of conveying information; inline links distinguished by colour alone need 3:1 against surrounding text (G183) ([Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), updated 2025-09-16).
- APCA is not part of any standard: WCAG 3's 2026-04-08 editor's draft has no contrast algorithm selected, and the earliest plausible final date is 2030 ([Roselli, April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)). Gate on WCAG 2 ratios.
- Measured: of 88 contrast pairs in the OCX theme and Grimoire docs, 7 fail; all ocx theme text tokens pass in both themes (minimum 4.93). Failures sit in Grimoire (borders, one 45% alpha label) and in grim-gui's dark-canvas case.
- Measured: `command-bar.css:141-143` is a legitimate `outline:none`; the ring moves to the parent field via `:has()` at lines 124-127.
- Measured in a browser (headless Chromium, built sites, 2026-11-27): the Grimoire docs focus ring on scrollable code blocks is 1.18:1 against its own background and the asciinema terminal `pre` has no visible focus change; every other focus stop in the OCX landing pages shows a 5.17 (light) or 5.83 (dark) ring, some drawn on the parent card.
- Measured: the OCX `Choice` label row renders 16, 19.5 or 22.75 px tall depending on inherited line-height (`normal`, 1.5, 1.75), always under 24; stacked rows qualify only with a gap of at least 8, 4.5 or 1.25 px.
- Measured: no control token is at 44; the 16px choice box, 18px kbd and 20px chip are below the 24px AA floor; the token is a floor, the rendered hit box is what counts (section 3).
- VS Code webviews: use `--vscode-*` variables and test in `vscode-high-contrast`; the platform adds `vscode-reduce-motion` and `vscode-using-screen-reader` body classes ([VS Code webview guide](https://code.visualstudio.com/api/extension-guides/webview), page dated 2026-11-25).

## Findings

### 1. Focus

**Requirement chain.** 2.4.7 Focus Visible (AA): "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible" ([source](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)). F78 (styling outlines and borders so the indicator is removed or hidden) fails 1.4.11, 2.4.7 and 2.4.13; F55 (script that removes focus on arrival) fails 2.1.1, 2.4.7, 2.4.13 and 3.2.1. The page does not name `outline: none` literally, so a lint must test for "removed without a replacement", not for the string.

**Contrast of the indicator.** 1.4.11: a focus indicator must reach 3:1 against adjacent colours; if outside the component, against the background behind it; browser defaults are exempt only if the author has not adjusted them ([source](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).

**Thickness and change (AAA).** 2.4.13: indicator area at least that of a 2 CSS px perimeter of the unfocused component, and 3:1 between the same pixels focused and unfocused; exempt when the user agent draws it and the author does not modify it or its background ([source](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)). It is AAA, so it is a design default, not a conformance floor.

**Not obscured.** 2.4.11 (AA): focused component not entirely hidden by author-created content. C43 `scroll-padding` is the listed technique; F110 is the failure (sticky header or footer fully hides the focused element). Partial obscuring passes at AA. Properly built modal dialogs pass; non-persistent popups pass if they close on use or blur ([source](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)). The page does not mention `scroll-margin`, so the rule below names `scroll-padding` only.

**Reference pattern.** GOV.UK builds focus from two colours so it holds on any background: yellow plus black, a thick black bottom border on links, a yellow outline plus thicker black border on inputs; it targets 1.4.11 on every background colour used. It exposes `govuk-focused-text`, `$govuk-focus-width` and `govuk-functional-colour(focus)`; the page gives no numeric width and no date ([source](https://design-system.service.gov.uk/get-started/focus-states/); the authority is a government design system). Lesson for agents: one ring colour on a variable background is fragile; either pick a colour that passes 3:1 against every background it appears on, or use a two-tone ring.

**Trace of `command-bar.css:141-143`** (measured, command below in section 6). The trigger rule `outline: none` on `:focus-visible` is paired with `.ocx-cmdbar__field:has(.ocx-cmdbar__trigger:focus-visible) { outline: var(--ocx-focus-ring); outline-offset: var(--ocx-focus-offset-inset); }` at lines 124-127. Replacement exists; no defect. The earlier audit's "I did not trace its replacement" is closed. Correct and incorrect shapes:

```css
/* WRONG: removed, nothing replaces it (F78) */
.btn:focus-visible { outline: none; }

/* RIGHT 1: adjust, never remove */
.btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

/* RIGHT 2: removed on the child, ring on the parent (the OCX command bar) */
.field:has(.trigger:focus-visible) { outline: 2px solid var(--focus); }
.trigger:focus-visible { outline: none; }

/* RIGHT 3: forced-colors keeps a visible ring where author colours are overridden */
@media (forced-colors: active) { .input:focus { outline: 2px solid; } }
```

**Browser measurement of focus rings (new, 2026-11-27).** Method: headless Chromium (Playwright's `chromium_headless_shell` 1255 driven by puppeteer-core 24.43.1), built `dist` of the Grimoire docs and the OCX site served read-only on localhost, Tab through up to 60 stops per page at 1280 and 390 px, read `outline` computed values, then pixel-diff a screenshot of the focused element (with 10 to 60 px padding, `captureBeyondViewport`) against the same element after `blur()`. OCX switched between themes through `data-theme` plus `prefers-color-scheme`; the ring colour is the same unmodified token.

| Surface | Measured | Result |
|---|---|---|
| OCX landing, apps, integrations, team, both themes | focus ring `#ce1c00` (light) and `#ff6047` (dark) against the page: 5.17 and 5.83 on every stop that draws a ring | pass |
| OCX `ocx-cmdbar__trigger` (two of three) and `ocx-ui-select__control` | outline `none` on the trigger, ring painted on the parent: 988 to 2014 pixels change on focus | pass; confirms the parent-ring pattern |
| OCX team link cards (`astro-gonnatam`) | the link's own `outline` is `none`, the card draws the ring: 1164 pixels change in a 40px frame | pass |
| OCX second `ocx-cmdbar__trigger` ("ocx add ocx.sh/node") | 0 pixels change within 40px; reason not found (element is on screen at y 677) | unresolved, an agent or human must look; not scored as a defect |
| Grimoire docs, all pages, desktop and mobile | computed `color-scheme: dark`, background `#161826`; the site is dark-only; default `outline: 1px auto`, drawn two-tone `#eee` plus `#101010` (pixel sample), 15.17 against the page | pass (UA default, exempt by 1.4.11 and strong anyway) |
| Grimoire docs scrollable code blocks (`pre`, tabindex 0 added by the code-block renderer) at 390 px, pages quickstart, commands, settings, team-ci | `outline: 3px solid rgb(18,45,66)`, `outline-offset: -3px` on a block whose own background is `rgb(27,29,44)`: ring against its ground 1.18:1; 2726 and 3008 pixels change but at that contrast | fail 1.4.11 (author-modified ring, so the default exemption is lost) |
| Grimoire docs asciinema terminal (`pre.ap-term-text`, tabindex 0) on index, quickstart, browse | `outline: 3px none`; 0 pixels change within 60px of the terminal | fail 2.4.7 (keyboard stop with no visible indicator) |

Discarded: an early run forced `light` on the Grimoire docs through script and reported ring 1.08:1 on all stops; that came from a forced scheme the site does not support (the unforced run shows `color-scheme: dark` in both OS schemes), so the light numbers are invalid and were removed.

### 2. Contrast

Pairs to check, thresholds from [1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html):

| Pair | Threshold | Note |
|---|---|---|
| body and muted text on every surface it sits on (page, card, code block, panel) | 4.5:1 | placeholder, hint, caption and alpha-blended text count; blend alpha onto the real ground first |
| text 18pt or 14pt bold and above | 3:1 | still use 4.5 for small UI labels |
| input, select, textarea border against the page, when the border is the only cue | 3:1 | `#767676` on white passes, `#AAA` fails |
| checkbox, radio, toggle state indicator against its fill | 3:1 | |
| focus ring against the background behind the component, in each theme | 3:1 | check both themes and any coloured surface |
| icon-only control glyph, chart marks that carry meaning | 3:1 | decorative and text-labelled graphics exempt |
| inline link against surrounding text, when colour alone marks it | 3:1 | plus 4.5:1 against the page (G183) |
| disabled controls, logotypes, pure decoration | none | exempt; do not exploit the exemption for text that carries information |

Ratios are not rounded; a script must compare with `>= 4.5`, not `round(v,1) >= 4.5`.

**Measured (88 pairs; command in section 6).** All ocx theme text tokens pass 4.5:1 on bg, surface and surface-subtle in both themes (minimum 4.93). Failing pairs: Grimoire text at 45% alpha on `#161826` 3.91; Grimoire `gray-4` border 2.69 and 2.55 on panel; `gray-5` card hairline 1.76 (decorative unless it is the only cue); ocx light coral `#ff6047` on `#f6f7f9` 2.79 as non-text (theme already substitutes `accent-fg #ce1c00` 5.17 for text and focus in light); grim-gui `.hint #555` on a dark canvas 2.51 (7.46 on white; no `color-scheme` declared). The rerun reproduced the audit's 7 FAIL lines.

**Borders in the Grimoire docs (browser).** The search `button` has `border: 1px rgb(63,66,77)` on `#161826`: 1.76:1; it carries a text label, so the border is decorative and passes 1.4.11; a bordered control with no label would fail. Computed from `getComputedStyle` in the unforced dark scheme, same run as the focus rings.

**APCA is not a gate.** The repository states beta status (library 0.1.9, July 2022; base algorithm 0.0.98G-4g, February 2021), says standards incorporating it "are still developmental", and describes WCAG 2 math as inaccurate and APCA as "being evaluated" ([apca-w3](https://github.com/Myndex/apca-w3), vendor or author repository, non-normative). Roselli reports that the WCAG 3 editor's draft of 2026-04-08 marks contrast as Exploratory with the algorithm "yet to be determined", APCA was removed in 2023, and advises keeping WCAG 2 ratios ([Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html), independent expert, secondary). An agent may report Lc as advisory; it must not accept an APCA pass over a WCAG 2 fail.

### 3. Target size

**AA floor.** 2.5.8: pointer targets are at least 24x24 CSS px unless an exception applies: spacing (a 24px circle centred on the undersized target's bounding box intersects no other target or circle), equivalent control on the same page, inline (in a sentence or constrained by text line-height), user-agent control not modified by the author, essential ([source](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). **AAA.** 2.5.5: 44x44 with equivalent, inline, user-agent and essential exceptions, no spacing exception ([source](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)).

**Design-system data.** Primer control sizes: xsmall 24px, small 28, medium 32, large 40, xlarge 48; coarse-pointer stacks widen gaps (large and medium 0.75rem coarse vs 0.5rem fine; small 1rem vs 0.5rem). Primer's page gives no minimum-target guidance and no date ([Primer size](https://primer.style/product/primitives/size/); design-system authority). So the smallest Primer control equals the AA floor; no Primer control is 44.

**Per-surface floor decided here** (a design decision derived from the sources, flagged as such):

| Surface | Floor | Preferred |
|---|---|---|
| Web, pointer-only desktop documentation and marketing | 24x24 CSS px hit area, exceptions as stated | 32px for primary controls |
| Touch and coarse pointer (`@media (pointer: coarse)`) | 24x24 is the AA conformance floor; use 44x44 as the agent default for primary and frequent controls | 44px (AAA target; also what Primer's `--base-size-44` token exists for, though Primer does not state it as a rule) |
| VS Code webview | same as web desktop: 24x24 hit area; keyboard-first, so also require visible focus and theme variables | 28-32px |

Hit area, not glyph: padding, pseudo-element or a wrapping `<label>` can supply the area. Inline links in prose are exempt; a standalone link in a nav list is not.

**Measured rendered sizes (control tokens, `tokens.css:187-194`)**:

| Token | px | vs 24 | Rendered use |
|---|---|---|---|
| `--ocx-control-choice` | 16 | below | checkbox and radio box; wrapped by label, hit area not measured here, label row must carry it |
| `--ocx-control-xs` | 18 | below | `kbd` (not a target), PlatformIcons, tree-view toggle width (`TreeView.astro:154`) |
| `--ocx-control-sm` | 20 | below | chip; tree row `min-height` (`TreeView.astro:128`) |
| `--ocx-control-md` | 28 | pass | header tool |
| `--ocx-control-lg` | 30 | pass | install button, panel item |
| `--ocx-control-xl` | 32 | pass | search trigger |
| `--ocx-control-2xl` | 38 | pass | field, button md |
| `--ocx-control-3xl` | 42 | pass | field, button lg |

None reaches 44. A token is a floor (`min-height`, `inline-size`), not the rendered hit box; the rendered boxes are measured in "Rendered hit boxes" below.

**Spacing exception, restated from the normative text** ([2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), updated 2026-11-02): undersized targets (under 24 by 24 CSS px) qualify when "a 24 CSS pixel diameter circle is centered on the bounding box of each" and "the circles do not intersect another target or the circle for another undersized target". The page gives no padding value; it works from these cases: 24x24 passes alone; 20x20 buttons with 4px gaps pass; 20x20 with no gap fail; two rows of 16px-tall buttons 1px apart fail; a 16x16 control touching a large target fails and passes with a 4px gap. The arithmetic follows from the circle (radius 12): two same-size undersized neighbours need centre distance of at least 24, so edge-to-edge gap >= 24 minus size along that axis (16px: 8px; 18px: 6px; 20px: 4px, matching the page's 20px/4px example); an undersized target beside a full-size (24px or larger) target needs gap >= 12 minus half its size (16px: 4px, matching the page's 4px example). The page does not say whether padding counts as target size; it advises enlarging "the active target area without increasing the visible target size", so the hit area is the measured unit.

**Rendered hit boxes (measured).** Harness: copy of `tokens.css` and `choice.css` from the theme package, real `Choice` markup (`label.ocx-ui-choice > input + span.box + span.label`), 13px text, headless Chromium; three inherited line-heights because the consumer decides it.

| Context | Label row height | Box | Spacing gap needed between stacked rows (24 minus height) |
|---|---|---|---|
| `line-height: normal` | 16 px | 16x16 | 8 px |
| `line-height: 1.5` (`--ocx-lh-body`) | 19.5 px | 16x16 | 4.5 px |
| `line-height: 1.75` | 22.75 px | 16x16 | 1.25 px |

So the 16px token is never the hit box (the label row is), but the row is under 24 in all three contexts and a stacked form needs the gaps above or a `min-height: 24px` on the label. Other sub-24 tokens: `--ocx-control-xs` 18 is the `kbd` (not a target) and the tree icon column; `--ocx-control-sm` 20 is `min-height` of list items, tree rows and list-footer buttons, which are floors: those rows add `padding` 4px (`List.astro:215`) and text padding-block 4px (`TreeView.astro`), so they render near 27px (derived from CSS, not rendered here). Loader, ProgressCircle, Avatar, Skeleton and LogoTile use 20px for non-interactive graphics (exempt, not targets).

**Rendered sizes on the built pages (measured, both sites).** Every focusable element (`a[href], button, input, select, textarea, summary, [tabindex]`) at 1280 and 390 px wide, Chromium headless shell, built `dist` served read-only on localhost (commands in section 6). The circle test above was run on every undersized one.

| Site | Viewport | Controls | Undersized | Spacing-circle failures | Notes |
|---|---|---|---|---|---|
| Grimoire docs (7 pages, dark) | desktop | 76 to 953 per page | 1362 | 15 (all inline text links in prose) | sidebar and nav links 156x22 and 234x22 pass by the circle test (gaps) |
| Grimoire docs (7 pages, dark) | mobile 390 | 1841 | 1323 | 40: 7 are `sl-anchor-link` heading anchors (16.5x24 and 14.1x20.4) touching the heading link, the rest inline text links 16px tall | block-level (non-inline) failures: 7, all heading anchors |
| OCX landing, apps, integrations, team (light and dark identical) | desktop | 21 to 32 per page | 36 block, 7 display-inline | 8 flagged; 6 of them are artefacts (hidden `select` 1x1 and the brand link overlapping the skip link that is visually hidden until focus); 2 real: team sidebar links "Overview" and "Get in touch" 236x23.6 stacked with gap 0, circles overlap by 0.38 px | footer links 20.4 high and nav links 18.8 high pass by spacing |
| OCX | mobile | | 29 block | 6 flagged, same causes | |

Reading: the inline exception covers the Grimoire prose links, which the heuristic only partly identified (a link in a table cell or list item reads as non-inline here); each "inline" call is a DOM heuristic and a human or agent must confirm it, which is exactly the rule-10 record. The real, exception-free findings are the 23.6px stacked sidebar links (0.4px short, marginal) and the heading-anchor links on narrow viewports.

### 4. Colour plus a second cue

1.4.1 (Level A): colour must not be the only means of conveying information, indicating an action, prompting a response or distinguishing a visual element. Sufficient techniques listed for text and backgrounds: G14, G205, G182, G183 ([source](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)). The page does not mention underline.

**Measured in the OCX theme.** Status colour on text or icon: `toast.css:60-72` colours the icon svg by type (success, warning, error) but pairs it with an icon glyph and title text (second cue present, glyph shape not verified per type); `AlertDialog.astro:47-53` same four tones; `field.css:60-62` danger border on `aria-invalid`, backed by error text that "says how to fix it" (`Input.astro:22`) and `aria-invalid` itself (non-visual cue). `field.css:154-155` danger border on an input group: same. Prose links: `base.css:171` underline kept (thickness `--ocx-border-width`, colour a tint), so links are not colour-only. Counter: `base.css:66,537,765,946` set `text-decoration: none` on header and card links; those are navigational chrome or block cards, not inline text, but each needs a position or shape cue (not verified). grim-gui has one colour line (`styles.css:6`) and no status colours.

**Rule shape.** State = colour + (icon with distinct shape, or text word, or pattern, or position, or underline). Never just red/green. Error text must be present, not only a red border.

### 5. Editor webviews

VS Code adds `vscode-light`, `vscode-dark`, `vscode-high-contrast` to the webview `body`, exposes `--vscode-*` colour variables (`editor.foreground` becomes `var(--vscode-editor-foreground)`), says to "always test your webview in high-contrast mode", and adds `vscode-using-screen-reader` and `vscode-reduce-motion` body classes; its theming and accessibility sections do not cover focus styling ([guide](https://code.visualstudio.com/api/extension-guides/webview), platform authority, page date 2026-11-25). Consequence: a webview must not hard-code hex colours (the hard-coded `#555` in grim-gui, a Tauri app not a VS Code webview, shows the failure mode); it must draw focus with `--vscode-focusBorder`. Verified on the [VS Code Theme Color reference](https://code.visualstudio.com/api/references/theme-color) (platform; page undated, first 100000 of 126025 characters read): `focusBorder` is "Overall border color for focused elements. This color is only used if not overridden by a component.", the page states "Theme colors are available as CSS variables in webviews", and the guide's mapping (`editor.foreground` becomes `var(--vscode-editor-foreground)`) gives the name `--vscode-focusBorder` (no dot to convert). `contrastBorder` and `contrastActiveBorder` ("extra border around elements ... for greater contrast") are "usually set for high-contrast themes", so a webview should also draw a `var(--vscode-contrastBorder)` border on controls when set. The name is derived from the documented mapping and not confirmed by an rendered webview; no webview exists in the fleet corpus to run. The fleet's VS Code extension has no UI code in the measured corpora (audit section 0), so this is design rule only.

### 6. Measurements (commands)

Run from `/home/mherwig/dev`. `contrast.py` is lines 343-383 of `grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/ui-code-posture.md`, saved outside the repos.

| Measurement | Command | Result |
|---|---|---|
| contrast pairs, all | `python3 -I contrast.py \| wc -l` | 88 rows |
| failing pairs | `python3 -I contrast.py \| grep FAIL` | 7 lines (listed in section 2) |
| trace command-bar focus | `sed -n 120,150p ocx-sh/website/packages/theme/src/components/ui/command-bar.css` | ring on `.ocx-cmdbar__field:has(...)` lines 124-127; `outline:none` lines 141-143 |
| control tokens | `sed -n 183,196p ocx-sh/website/packages/theme/src/tokens.css` | 16, 18, 20, 28, 30, 32, 38, 42 |
| token uses below 24 | `grep -rnE 'control-(choice\|xs\|sm)\b' ocx-sh/website/packages/theme/src --include='*.css' --include='*.astro'` | choice.css:40-41, base.css:87,188, Kbd, PlatformIcons, TreeView, progress-circle |
| status colour | `grep -rnE '[^-]color: *var\(--ocx-color-(success\|danger\|warning)' ocx-sh/website/packages/theme/src --include='*.css' --include='*.astro'` | 11 hits: toast, AlertDialog, field, CopyButton, command-bar, prose-code-copy, starlight |
| invalid state | `sed -n 56,70p .../components/ui/field.css` | border-colour change; focus border wins over error border while focused |
| underline in prose | `sed -n 171,175p .../base.css` | underline retained |

| Browser pass (focus, hit boxes, borders) | `THEMES=dark node measure.mjs http://127.0.0.1:8801/ index.html,quickstart.html,commands.html,browse.html,settings.html,guides/team-ci.html,concepts.html grim.json` and `node measure.mjs http://127.0.0.1:8802/ index.html,apps/index.html,integrations/index.html,team/index.html ocx.json` with `CHR` set to the Playwright `chrome-headless-shell`; servers `python3 -m http.server 8801` in `grimoire-rs/grimoire/docs/dist` and `8802` in `ocx-sh/website/site/dist` | section 3 and focus tables |
| Focus pixel diff | `PAD=40 node diff.mjs <url> <theme> <viewport> '<regex of tag.class|text>'` | per-element changed pixel counts |
| Hit-box harness | copy of `tokens.css` and `choice.css`, three line-heights, `getBoundingClientRect` | 16, 19.5, 22.75 px |
| Spacing circle test | in `measure.mjs`: circle of radius 12 on each undersized target centre; against a full-size neighbour the rect-to-centre distance minus 12 must be >= 0, against an undersized neighbour centre distance minus 24 >= 0 | spacing failures |

The scripts live in `~/.cache/research-lang/exemplars/product/ux-a11y-fcts/` (outside the repositories; missing shared libraries for the headless shell were unpacked from Ubuntu `.deb` files into `libs/` there).

Not measured: the VS Code extension (no UI code in the corpora, so rule 16 is a design rule only); Windows high-contrast and `forced-colors` rendering; touch hit areas on a real device; the Grimoire docs `pre` ring on desktop widths (not scrollable there, so no ring stop appeared); the unresolved cmdbar trigger; HTML pages beyond those listed. The `inline` classification is a DOM heuristic.

## Scout rows followed

IDs are file prefix plus Candidate-topics row number, matched by reading the rows (a literal grep for the IDs finds nothing).

| ID | Row (short) | What it fed here |
|---|---|---|
| AX6 | sticky or fixed chrome breaks focus visibility; fix `scroll-padding-top` | rule 5 |
| AX7 | minimum target and spacing exception on dense dev UIs | section 3, rule 10 |
| AX21 | colour as the only carrier of status in CLI and GUI | rule 13; the CLI half belongs to the CLI sibling topic |
| AX31 | both themes pass 4.5:1 and 3:1 | section 2 measured pairs |
| CS1 | which target size applies to which surface (24 CSS px, 44 px, 44 pt, 48 dp, Windows 40x40) | per-surface table; Apple, Material and Windows figures are scout data and not fetched here |
| CS2 | when a sub-24 target is compliant | section 3 spacing restatement |
| CS3 | spacing required between adjacent controls per system | section 3 (Apple's 60 pt visionOS and 12 pt padding are scout data, not fetched) |
| CS12 | WCAG 2 ratio, APCA or both | rule 9 |
| CS13 | what a focus indicator looks like and is never hidden behind | rules 1 to 5 |
| CS14 | `:focus-visible` versus `:focus` | rule 2 |
| CG3 | touch target 1 cm, 2 mm spacing (NN/g 2019-05-05) | contested: physical size versus CSS px, not fetched |
| CG4 | dead pixels at control edges (Tog) | not used; low severity, undated |
| CG17 | colour alone: add a secondary cue, test colour-blind | rule 13 |
| PI8 | 24x24 where agents break it | section 3 measured |
| PI10 | focus not obscured by sticky headers, cookie bars, toasts | rule 5 |
| RS4, RS5, RS25, RS34 | research-method rows (card sort, task wording, synthetic users, decay) | out of scope for this worker; named only |
| RS17 | Core Web Vitals do not guarantee ranking | out of scope, marketing and measurement siblings |
| PR28, PR29, PR31 | practitioner rows; not about this subtopic when read | not used |
| FC1 | low-contrast text 83.9% of pages | summary, rule 6 |
| FC21 | 58 `outline: none` lines in the fleet, skip link on 17.1% of pages | rule 1 Detect line; the fleet count is the scout's, not rerun here |
| FCf1 | failure-corpus fleet table | read for FC21 only |
| M039 to M044 | the commission lists them but the scout files carry no M-prefixed rows (recent-shifts.md has a numbered table, rows 39 and 40 of other files are unrelated); not followed, stated here | none |

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER.

1. **MUST** never remove a focus indicator without a replacement. Rationale: 2.4.7, F78. Verify: in every rule that sets `outline: none` or `outline: 0` on `:focus` or `:focus-visible`, the same file must also contain either (a) a rule on the same element setting a non-`none` `outline`, `border-color` change, `box-shadow` or `background` change in a focus state, or (b) a `:has(<selector>:focus-visible)` or `:focus-within` rule on an ancestor with a visible `outline` or `border-color`. Detect line: flag `outline:\s*(none|0)` only when no sibling replacement matches; do NOT flag when one exists. Pass: `command-bar.css:141-143` with `:124-127`. Fail: lone `button:focus { outline: none }`.
2. **MUST** style focus with `:focus-visible`, not bare `:focus`, for outlines that would show on mouse click; restore a visible state for keyboard. Rationale: designers delete rings because mouse clicks show them; `:focus-visible` shows the ring for keyboard stops only, which removes the reason to delete it (2.4.7). Verify: grep `:focus\s*{` rules that set `outline` and check a `:focus-visible` counterpart.
3. **MUST** give the focus indicator at least 3:1 contrast against the adjacent colour in every theme and on every surface it appears on. Rationale: 1.4.11. Verify: run the contrast script on `--focus` against each surface token in light and dark; fail below 3.0 unrounded. Pass: ocx light focus `#ce1c00` 5.17 on bg. Fail: coral `#ff6047` on `#f6f7f9` 2.79.
4. **SHOULD** draw the ring as a solid 2px or thicker outline with offset, not a 1px border change only. Rationale: 2.4.13 (AAA) area test; GOV.UK uses a thick two-tone state. Verify: grep `outline:\s*[2-9]px` or the ring token; a 1px focus is a SHOULD finding.
5. **MUST** make sticky headers, footers and banners keep focused elements at least partly visible. Rationale: 2.4.11, F110. Verify: any `position: sticky|fixed` bar must come with `scroll-padding-top` or `scroll-padding-bottom` on `html` (or the scroller) at least equal to the bar height; test by tabbing through the last link under a sticky footer.
6. **MUST** meet 4.5:1 for normal text and 3:1 for large text (18pt, or 14pt bold) against its real background, unrounded, in each theme. Rationale: 1.4.3; the top web failure. Verify: for every `color` token paired with a background token, compute WCAG ratio; `>= 4.5` required. Resolve alpha by blending onto the ground first (the 45% Grimoire label at 3.91 is the fail example).
7. **MUST** check placeholder, hint, caption, disabled-adjacent and syntax-highlight colours with the same 4.5:1 rule (disabled itself exempt). Rationale: 1.4.3 applies to all text that carries information, and these are the pairs agents skip (the Grimoire 45% alpha label measured 3.91 and the grim-gui `.hint` 2.51 on its dark canvas). Verify: include them in the pair list; a pair absent from the list is a finding.
8. **MUST** give a control whose boundary is its only identifier a 3:1 boundary against its ground; and state indicators (check, radio dot) 3:1. Rationale: 1.4.11. Verify: compute `--border-control` vs the surface; flag `#aaa`-class borders on white. Decorative card borders are exempt if the card has visible content.
9. **MUST NOT** gate on APCA or any WCAG 3 draft value. Rationale: no algorithm selected in the 2026-04-08 editor's draft. Verify: the contrast check script imports no APCA package and accepts only WCAG 2 ratios; Lc may be printed as advisory.
10. **MUST** make every pointer target at least 24x24 CSS px or qualify for a stated exception. Rationale: 2.5.8. Verify: for each interactive element with computed hit box under 24px, record which exception applies (spacing circle clear of neighbours, inline in text, equivalent control on the page, user-agent default, essential); no recorded exception is a fail. Command idea: Playwright `locator.boundingBox()` over `a, button, input, select, [role=button], [tabindex]` at 1280px and 390px viewports.
11. **SHOULD** set 44x44 hit areas for primary and frequent controls under `@media (pointer: coarse)` (or `any-pointer: coarse` for hybrid devices). Rationale: 2.5.5 AAA; Primer widens gaps for coarse pointers. Verify: grep for `pointer: coarse` blocks; the fleet theme has one (`prose-code-copy.css:32`), so expect findings.
12. **SHOULD** extend a small visual control to a larger hit area with padding, a wrapping `<label>` or a pseudo-element, not by enlarging the glyph. Rationale: 2.5.8 measures the target, not the glyph, so a 16px box inside a 24px row passes without changing the design; measured: the OCX label row is 16, 19.5 or 22.75 px, so a `min-height: 24px` is needed. Verify: for the 16px choice box, the label row's computed height is at least 24px (`getBoundingClientRect().height >= 24`).
13. **MUST** pair every colour-coded state (error, success, warning, selected, required, chart series) with a second cue: text word, distinct icon shape, pattern, position or underline. Rationale: 1.4.1 Level A. Verify: for each `color`/`border-color`/`background` in a status selector, a sibling text node, `aria-invalid`+visible message, or a differently shaped icon exists; reading heuristic: view the page in greyscale; a state must still be distinguishable. Pass: `field.css` danger border plus error text. Fail: red border and no message.
14. **MUST** keep an underline (or another non-colour cue, or 3:1 against surrounding text) on links inside running text. Rationale: 1.4.1 (Level A) forbids colour alone; the page lists G183 (3:1 against surrounding text) as the sufficient alternative. Verify: grep `text-decoration:\s*none` on selectors that match `p a`, `.prose a`, `li a` inside article content; those without a replacement cue are findings.
15. **MUST** put a forced-colors fallback on any state drawn only with `box-shadow`, `background` or `border-color`, since those are overridden. Rationale: in forced-colors mode the browser forces `box-shadow` to none and replaces `color`, `background-color`, `border-color` and `outline-color` with system values ([MDN forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors), last modified 2026-04-20, documentation, first 100000 of 131826 characters read), so a ring drawn only with a shadow vanishes for the users who rely on the mode. Verify: `@media (forced-colors: active)` rule with a real `outline` or system-colour border exists for each; the OCX theme has `forced-colors` in 28 files (audit), use as precedent.
16. **MUST** in a VS Code webview read colours from `--vscode-*` variables, never hex, draw focus from `var(--vscode-focusBorder)` (documented: "Overall border color for focused elements"), and test `vscode-high-contrast`. Rationale: the user's theme, including high-contrast, decides the colours; a hard-coded hex cannot meet 3:1 on every theme (1.4.11, 1.4.3). Verify: grep the webview CSS for `#[0-9a-fA-F]{3,8}` outside a fallback (`var(--vscode-x, #fff)` allowed); require a high-contrast screenshot test.
17. **SHOULD** declare `color-scheme` on any page that sets colours, so UA canvas and defaults follow the theme. Rationale: without it the UA ring, scrollbars and form controls render for a light canvas on a dark page; the Grimoire docs declare `dark` and keep its UA ring at 15.17, while grim-gui `.hint #555` fails on a dark canvas (2.51). Verify: grep for `color-scheme` in the root rule; compute ratios on both canvases when absent.
18. **SHOULD** run axe or Lighthouse accessibility in the PR gate, not only a nightly tier (the website repo's axe runs on cron and labelled PRs only). Rationale: axe covers a necessary condition for about 21 of 55 A and AA criteria and none of target-size by default (accessibility scout headline 2, vendor-tool data), so a nightly-only run lets the checkable failures reach main. Verify: workflow file for `axe` or `lighthouse` on `pull_request`; automated tools find only part of the failures, so rules 1-17 still need the lint above.
19. **MUST** give a keyboard-focusable scroll container (`pre`, code block, terminal player, `tabindex="0"`) a ring that is 3:1 against its own background, not the page's. Rationale: 1.4.11; measured: Grimoire docs `pre` ring `rgb(18,45,66)` on `rgb(27,29,44)` is 1.18:1, and the asciinema terminal has no visible change at all (2.4.7). Verify: after Tab, compare focused and blurred screenshots of the element and its 40px frame (changed pixels above zero), and compute the ring colour against `getComputedStyle(el).backgroundColor` when `outline-offset` is negative, against the parent background otherwise.
20. **SHOULD** give each stacked 16 to 22 px row or label a `min-height: 24px` or a gap of at least 24 minus its height. Rationale: 2.5.8 spacing circles; the 23.6px stacked sidebar links measured 0.38px short. Verify: rendered `getBoundingClientRect()` over `a, button, label` at 390 px and 1280 px, then the circle test (centre distance of two undersized neighbours at least 24, to a full-size neighbour at least 12 from its edge).

## Dated facts

| Fact | Value | Source | Source date | Kind |
|---|---|---|---|---|
| Home pages with detected WCAG failures | 95.9% (94.8% in 2025) | [WebAIM Million](https://webaim.org/projects/million/) | updated 2026-03-30, analysis Feb 2026 | independent study |
| Average detected errors per page | 56.1 (51 in 2025) | same | same | independent study |
| Low-contrast text prevalence | 83.9% of pages (79.1% in 2025) | same | same | independent study |
| Missing alt text | 53.1% of pages; 16.2% of images | same | same | independent study |
| Missing form labels | 51% of pages; 33.1% of inputs | same | same | independent study |
| Empty links / buttons | 46.3% / 30.6% of pages | same | same | independent study |
| ARIA use and errors | 82.7% of pages use ARIA; 59.1 errors with vs 42 without (correlation, source warns not necessarily causal) | same | same | independent study |
| 1.4.3 thresholds | 4.5:1; 3:1 large; no rounding | [Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 2026-10-04 | authority (W3C) |
| 1.4.11 threshold | 3:1; focus indicators included; defaults exempt | [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 2026-10-04 | authority |
| 2.4.7 Focus Visible | AA; F78, F55 failures | [Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | 2026-10-04 | authority |
| 2.4.11 Focus Not Obscured (Min) | AA; C43 scroll-padding; F110 | [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | 2026-06-15 | authority |
| 2.4.13 Focus Appearance | AAA; 2px perimeter area, 3:1 change | [Understanding 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) | 2026-10-04 | authority |
| 2.5.8 Target Size (Min) | AA; 24x24 CSS px; 5 exceptions | [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | 2026-11-02 | authority |
| 2.5.5 Target Size (Enhanced) | AAA; 44x44; 4 exceptions | [Understanding 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | 2026-09-06 | authority |
| 1.4.1 Use of Color | Level A; G183 3:1 for colour-only links | [Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | 2025-09-16 | authority |
| WCAG 3 contrast algorithm | not selected; Exploratory; APCA removed 2023; final not before about 2030 | [Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) | April 2026 (draft of 2026-04-08) | independent expert |
| apca-w3 status | library 0.1.9 beta (2022-07-03); algorithm 0.0.98G-4g (2021-02-15) | [apca-w3](https://github.com/Myndex/apca-w3) | 2022 | author repository |
| Primer control sizes | 24, 28, 32, 40, 48 px | [Primer size](https://primer.style/product/primitives/size/) | undated | design system |
| GOV.UK focus | yellow plus black, 1.4.11 target, no numeric width | [GOV.UK focus states](https://design-system.service.gov.uk/get-started/focus-states/) | undated | government design system |
| VS Code theme color reference | `focusBorder`: "Overall border color for focused elements. This color is only used if not overridden by a component."; theme colors available as CSS variables in webviews | [Theme Color](https://code.visualstudio.com/api/references/theme-color) | undated page | platform |
| forced-colors overrides | `box-shadow` none; colour, background, border and outline colours replaced | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) | 2026-04-20 | documentation |
| VS Code webview theming | body classes and `--vscode-*` variables | [VS Code guide](https://code.visualstudio.com/api/extension-guides/webview) | 2026-11-25 | platform |

## What an agent must not decide alone

- Brand colours that fail 4.5:1 or 3:1: propose a passing alternative and ask; a logotype is exempt only where the brand guidelines require the low contrast, which is a brand decision.
- Dropping an accessibility target tier (for example choosing AAA 44px on a dense table, or accepting AA-only): conformance level and any legal commitment (procurement, regulation) are owner decisions; legal exposure not researched here.
- Relying on the "essential" exception of 2.5.8 or the "equivalent control" exception: record it and ask.
- Adopting APCA or a custom contrast metric: ask, and document it against WCAG 2 as Roselli advises.
- Removing a focus ring design (for example a brand-specific ring colour that fails 3:1 on some surfaces).
- Changing theme defaults that affect every consumer of the shared theme package (a fleet-wide change).

## AI-agent angle

| Typical mistake | Mechanical check |
|---|---|
| Writes `button:focus { outline: none }` for looks, from older resets | Rule 1 Detect line; fail only when no replacement |
| Uses `:focus` and shows rings on mouse click, then removes them | Rule 2 grep |
| Picks a brand accent for the ring without computing contrast on light surfaces (coral 2.79:1) | Rule 3 script over both themes |
| Treats `opacity: .5` or `color-mix` alpha text as free; 45% alpha gave 3.91:1 | Rule 6, blend before compute |
| Rounds 4.49 to 4.5 | Compare unrounded in the script |
| Sizes an icon button by its glyph (16 or 20px) | Rule 10 bounding-box test |
| Believes 44px is an AA requirement, or that 24px suffices for touch comfort | Rule 10 vs 11, severity labelled |
| Marks errors with red alone, or removes the underline for style | Rules 13, 14 greyscale heuristic and grep |
| Trusts APCA Lc from a tool as a pass | Rule 9 |
| Hard-codes hex in a VS Code webview or Tauri page, no `color-scheme` | Rules 16, 17 |
| Passes axe and declares done, though axe cannot judge colour-only cues, hit areas or ring contrast on all surfaces | Rule 18 plus rules 3, 10, 13 as separate checks |

## Contested / evolving

- **APCA vs WCAG 2 contrast.** APCA's author states WCAG 2 math "does not accurately model human visual perception" and that APCA is being evaluated as a replacement ([apca-w3](https://github.com/Myndex/apca-w3)); Roselli reports APCA is not in the WCAG 3 draft, no algorithm is selected, and advises meeting WCAG 2 ratios and documenting any APCA-only decision ([Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)). Trend: unresolved to at least 2030. Decision here: WCAG 2.
- **24px AA floor vs 44px.** W3C sets 24 at AA and 44 at AAA ([2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)); Primer ships a 24px smallest control while carrying a 44px base token, without stating a rule ([Primer](https://primer.style/product/primitives/size/)). The 44px default for touch here is a judgement; other platform guides (Apple, Material) were not fetched and are not cited.
- **Focus appearance.** 2.4.13 is AAA in WCAG 2.2; GOV.UK's thick two-tone pattern exceeds the AA floor. Whether to adopt it fleet-wide is a design choice.
- **Partial obscuring.** 2.4.11 allows partial obscuring; the AAA sibling forbids it. Agents should avoid obscuring where cheap.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html | W3C Understanding 2.4.7 (primary) | updated 2026-10-04 | AA focus floor, F78, F55 |
| https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | W3C Understanding 2.4.11 (primary) | updated 2026-06-15 | sticky UI, C43, F110 |
| https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html | W3C Understanding 2.4.13 (primary) | updated 2026-10-04 | AAA 2px area and 3:1 change |
| https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | W3C Understanding 1.4.3 (primary) | updated 2026-10-04 | text thresholds, no rounding |
| https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | W3C Understanding 1.4.11 (primary) | updated 2026-10-04 | UI, focus, border 3:1 |
| https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html | W3C Understanding 1.4.1 (primary) | updated 2025-09-16 | colour-only rule, G183 |
| https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | W3C Understanding 2.5.8 (primary) | updated 2026-11-02 | 24px and five exceptions |
| https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html | W3C Understanding 2.5.5 (primary) | updated 2026-09-06 | 44px AAA |
| https://design-system.service.gov.uk/get-started/focus-states/ | GOV.UK focus states (primary, design system) | undated | two-tone focus pattern |
| https://primer.style/product/primitives/size/ | Primer size primitives (primary, design system) | undated | control size scale |
| https://code.visualstudio.com/api/references/theme-color | VS Code theme colour reference (primary, platform) | undated | `focusBorder`, `contrastBorder`, webview CSS variables |
| https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors | MDN forced-colors (documentation) | last modified 2026-04-20 | box-shadow forced to none, overridden colours |
| https://code.visualstudio.com/api/extension-guides/webview | VS Code webview guide (primary, platform) | page date 2026-11-25 | theme variables, high contrast |
| https://github.com/Myndex/apca-w3 | APCA reference library (non-normative, author repo) | 2022 release | algorithm status |
| https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html | Roselli on WCAG 3 contrast (secondary, independent) | April 2026 | why WCAG 2 stays the gate |
| https://webaim.org/projects/million/ | WebAIM Million 2026 (independent study) | updated 2026-03-30 | prevalence data |

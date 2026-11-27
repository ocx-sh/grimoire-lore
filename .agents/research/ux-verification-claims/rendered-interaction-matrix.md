---
title: "Rendered-interaction matrix: what an agent runs after a UI change, and what it may claim"
program: product
sub_program: ux
topic: ux-verification-claims
worker: rendered-interaction-matrix
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
scope: "Covers the minimum rendered and interactive pass (viewport/zoom, colour scheme, forced colours, reduced motion, Tab walk), the CI versus review-skill split, the human screen-reader pairs, and the claims an agent may make. Excludes token contrast values (css-theming), the axe configuration (automated-a11y-coverage dive) and page landmarks (UX-A11Y page-structure-and-consistency)."
---

# Rendered-interaction matrix

## Table of contents

1. Summary
2. Findings (1 matrix, 2 WCAG pass conditions, 3 measurement, 4 CI versus review split, 5 human pass, 6 claims)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources
9. Appendix: the script (`checks/ui-matrix.mjs`) in full, and the commands

Scout row ids RS16, RS28, FC21, CS15, CS17, AX16 and M008-M010, M049 could not be resolved: `grep -nE 'RS16|RS28|FC21|CS15|CS17|AX16' .agents/research/ux-topic-map/*.md` returned no line. The commission text and the primary sources were used instead. The script is embedded in the appendix because this worker may write only this one file; the lead must commit it to the skill's `checks/` folder.

## Summary

- Static checks cannot see reflow, zoom clipping, hidden focus, or motion. Eight matrix rows, reported as ten rows per route (reflow 320, zoom 200 %, zoom 400 %, light, dark, forced colours, reduced motion, and three Tab walks), catch them in one Playwright script that took 57 s for three pages against the production build (25.4 s, 14.1 s, 12.8 s) and 72.6 s against the Astro dev server on this machine.
- Matrix (10 report rows per route): 320 CSS px reflow, 200 % and 400 % zoom, light, dark, forced colours, reduced motion, and a Tab walk run three times (desktop, 400 % zoom, forced colours).
- Zoom is emulated by shrinking the viewport: WCAG states 320 CSS px equals a 1280 px window at 400 % zoom ([Understanding 1.4.10, updated 04 Oct 2026](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)). Playwright documents no zoom option ([newContext](https://playwright.dev/docs/api/class-browser#browser-new-context)).
- Pass for reflow and zoom: no horizontal document scroll, and no text clipped by `overflow` that was not already clipped at 1280 px.
- Pass for the Tab walk: every interactive stop has a non-empty accessible name, a pixel-visible focus indicator, is not entirely hidden by other content, and the walk wraps within 120 stops with at most one focus-lost stop.
- On the three real pages, `/integrations/` and `/apps/` pass all 10 conditions. `/` fails 6: new clipped text at 320/640/400 %, one focusable control with `outline-style: none` and no visible indicator at desktop, and unresolved indicator findings at 400 % zoom.
- CI runs all ten report rows on the changed routes (about 13 s per page on a production build; 14-25 s on the dev server). The review skill runs the same script plus the judgement items a script cannot decide: focus order, name quality, modal exits, partial obscuring.
- Human screen-reader pass: JAWS+Chrome and NVDA+Chrome on desktop, VoiceOver+Safari on iOS. Trigger: a new interaction pattern, or a release. An agent cannot run it and must ask.
- Claims ladder: an agent may say "script passed N conditions on pages P in browser B". It may not say "accessible", "WCAG conformant" or "works with screen readers". The [WebAIM Million 2026](https://webaim.org/projects/million/) (updated 30 Mar 2026) states: "Absence of detected errors does not indicate that a page is accessible or conformant."
- WebAIM survey 11 (Jul-Aug 2026) replaced survey 10 (Dec 2023-Jan 2024): JAWS rose from 40.5 % ([survey 10](https://webaim.org/projects/screenreadersurvey10/)) to 55.0 % ([survey 11](https://webaim.org/projects/screenreadersurvey11/)) as primary desktop reader; GOV.UK's pair list still cites the 2016 survey.

## Findings

### 1. The matrix

| # | Condition | How the script sets it | Pass condition | WCAG basis | Time per page |
|---|---|---|---|---|---|
| 1 | Reflow 320 | viewport 320x1024 | `documentElement.scrollWidth <= clientWidth + 1`; no newly clipped text vs 1280 baseline; viewport meta does not block zoom (`user-scalable=no`, `maximum-scale=1`) | 1.4.10 AA | 0.16-1.0 s |
| 2 | Zoom 200 % | viewport 640x360 (1280x720 divided by 2) | same as 1 | 1.4.4 AA, 1.4.10 | 0.16-0.33 s |
| 3 | Zoom 400 % | viewport 320x180 (1280x720 divided by 4) | same as 1 | 1.4.10 AA | 0.16-0.47 s |
| 4 | Light / dark | `colorScheme` option on a new context | body background luminance above 0.5 in light, below 0.2 in dark (proves the scheme switch took effect; contrast values belong to css-theming) | none (project) | 0.2-0.45 s each |
| 5 | Forced colours | `forcedColors: 'active'` | `matchMedia('(forced-colors: active)')` true; no visible text element whose computed colour equals its effective background | WCAG 1.4.11, 2.4.7 (indicator survives) | 0.19-0.28 s |
| 6 | Reduced motion | `reducedMotion: 'reduce'` vs `'no-preference'` | zero running infinite animations after 1.2 s under `reduce`; `scroll-behavior` is not `smooth` | 2.3.3 AAA (not AA) | 2.4 s (two loads plus 1.2 s waits) |
| 7 | Tab walk, desktop 1280x720 | 120 `Tab` presses max; stop when the first element recurs | per stop: interactive role has a name; indicator visible by pixel difference of a focused versus blurred screenshot; not entirely hidden (3x3 `elementFromPoint` grid, all nine miss means hidden); at most 1 stop with focus on `body`; walk closes | 2.4.7 AA, 2.4.11 AA, 2.1.2 A, 4.1.2 A | 1.5-5.5 s |
| 8 | Tab walk, 400 % zoom and forced colours | same, at 320x180 and with forced colours | same | 2.4.11 (sticky header at 180 px high), 2.4.7 | 1.5-5.5 s each |

Playwright facts used: `page.emulateMedia` accepts `colorScheme` (v1.9), `reducedMotion` (v1.12), `forcedColors` (v1.15), `contrast` (v1.51) ([Playwright Page API](https://playwright.dev/docs/api/class-page#page-emulate-media)); context options default to `forcedColors: 'none'`, `reducedMotion: 'no-preference'`, viewport 1280x720 ([BrowserContext options](https://playwright.dev/docs/api/class-browser#browser-new-context)).

### 2. What the WCAG pages say a pass is

- 1.4.10 Reflow (AA): "without loss of information or functionality, and without requiring scrolling in two dimensions" at 320 CSS px wide (vertical content) or 256 CSS px high (horizontal content); exception for content needing two-dimensional layout ([Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), updated 04 Oct 2026). The 256 px height case (1280x1024 at 400 %) is not in the script; it matters only for horizontally scrolling layouts.
- 1.4.4 Resize Text (AA): text resizable "up to 200 percent without loss of content or functionality" using at least one user-agent text-scaling mechanism; ACT rule "Zoomed text node is not clipped with CSS overflow" supports checking ([Understanding 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), updated 06 Sep 2026). The script's clipped-text delta mirrors that ACT rule in spirit but is a heuristic, not the ACT rule.
- 2.4.7 Focus Visible (AA): "a mode of operation where the keyboard focus indicator is visible"; failures F55 (script removes focus) and F78 (outline or border removed) ([Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), updated 04 Oct 2026).
- 2.4.11 Focus Not Obscured (Minimum) (AA): the focused component must not be "entirely hidden due to author-created content"; partial overlap passes; sticky header/footer and cookie banners are the failure (F110); sufficient technique C43 (`scroll-padding`) ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), updated 15 Jun 2026). The script's "full" bucket mirrors this; its "partial" bucket is a review hint only.
- 2.1.2 No Keyboard Trap (A): focus must be movable out using only the keyboard, or users told how; Esc is a common exit ([Understanding 2.1.2](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html), updated 18 May 2026). The script detects a runaway walk (cap 120) only; it does not test modal exit by Escape.
- 2.3.3 Animation from Interactions is Level AAA ([WCAG 2.2 Recommendation, 12 Dec 2024](https://www.w3.org/TR/WCAG22/)). Reduced-motion checking is therefore a SHOULD, not a conformance claim.

### 3. Measurement on three real pages

Pages: `/`, `/integrations/`, `/apps/` of the built `ocx-sh/website/site` (consumes `@ocx-sh/theme`), served read-only from `site/dist` by `python3 -m http.server 4399`. The commission asked for the theme's dev build; the table above is production build output. Repair re-run on the Astro dev server (`npx astro dev --port 4398` in `ocx-sh/website/site`, stopped afterwards): same verdicts. `/` fails the same 6 rows (reflow-320, zoom-200, zoom-400, tabwalk-desktop, tabwalk-zoom400, tabwalk-forced); `/integrations/` and `/apps/` pass all 10; total 72.6 s (`time node ui-matrix.mjs http://127.0.0.1:4398 out-dev.json / /integrations/ /apps/`). Tab walks on `/` took 9.1-10.5 s on the dev server against 1.5-5.5 s on production output, so CI should use a built preview. Browser: Chromium build 1255 from the Playwright cache; `playwright-core` 1.63.0 from `ocx-sh/website/node_modules`; about 30 missing system libraries (libnspr4, libnss3, libX11 and others, found with `ldd`) were side-loaded from `apt-get download` into the scratch directory (no root). Run from the scratch directory with `LD_LIBRARY_PATH` and `PW_CHROMIUM` set (commands in the appendix).

| Page | Reflow 320 | Zoom 200 | Zoom 400 | Light/Dark | Forced | Reduced motion | Tab desktop | Tab 400 % | Tab forced | Wall time |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | FAIL: new clip in `section.lp-hero`, `div.ocx-cmdbar__field` | FAIL: `section.lp-hero` | FAIL: same as 320 | pass/pass | pass | pass (22 infinite animations under no-preference, 0 under reduce) | FAIL: 1 no-indicator stop | FAIL: 11 flagged, 4 partly obscured | FAIL: 1 no-indicator stop | 25.4 s |
| `/integrations/` | pass | pass | pass | pass/pass | pass | pass | pass (21 stops + 1 wrap) | pass (4 partly obscured) | pass | 14.1 s |
| `/apps/` | pass | pass | pass | pass/pass | pass | pass | pass | pass (3 partly obscured) | pass | 12.8 s |

Total for the three pages in one process: 57.06 s (`time node ui-matrix.mjs ...`). Per-condition times: layout and scheme conditions 0.16-1.0 s; Tab walks 1.5-5.5 s. An earlier run with a cycle-detection bug took 97 s (the walk looped three laps); the cycle fix cut it to 47-57 s.

Specific results on `/`:

- Tab desktop: `button.ocx-cmdbar__trigger` ("Copy Add command") reports computed `outline: none 3px off=2px`, and the focused versus blurred screenshots are byte-identical. This is style-level evidence of no outline; whether another cue exists outside the 6 px clip margin was not examined.
- Tab at 400 % zoom: 11 stops flagged with no indicator although their computed outline is `solid 2px`. A probe placed the "get started" link at y=161 of a 180 px viewport (`elementFromPoint` returns that link) but a viewport screenshot shows blank background there, so the hero content appears visually absent while focus is on it. The cause was not isolated (`ScrollStage.astro` is the only theme file that defines `ocx-stage__pin`). Treat these 11 as unresolved, not as confirmed failures; a human must look.
- All three pages: 0 empty-named interactive stops; 1 focus-lost stop per lap (the wrap through the document/browser chrome), which the rule allows.
- 400 % zoom, `/integrations/` and `/apps/`: 3-4 stops are partly covered (sticky header at 180 px high). WCAG 2.4.11 passes partial overlap; this is a review hint.
- Script false-positive history, so adopters do not repeat it: visually hidden `.sr-only` spans (1x1 px, `overflow: hidden`) were counted as clipped text; unnamed focusable `pre` (scrollable code region, role `generic`) was counted as an unnamed control; one wrap-around stop on `body` was counted as lost focus. All three are fixed in the appendix script.

### 4. CI versus review skill

| Item | CI | Review skill | Reason |
|---|---|---|---|
| All 10 report rows (matrix rows 1-8) on the routes the diff touches, plus `/` | yes, fail the job on any FAIL | rerun locally before claiming | about 13 s per page; deterministic enough to gate |
| `partlyObscured` count | report only | judge sticky-header cases against 2.4.11 text | partial overlap is allowed |
| Focus order matches reading order | no | yes (read the printed stop list) | script lists order; meaning needs judgement |
| Accessible-name quality ("Copy" versus "Copy Add command") | name present only | yes | non-empty is not meaningful |
| Modal and menu exit by Escape, focus return | no | yes, plus Playwright test per widget | script cannot know which widgets exist |
| Text-only resize (browser font-size setting) | no | CONSIDER | viewport shrink approximates page zoom, not text-only scaling |
| Real screen-reader pass | no | no: human, see section 5 | agents cannot run JAWS or VoiceOver |
| Safari/WebKit and Firefox Tab behaviour | no | no | the page [Playwright input](https://playwright.dev/docs/input) says nothing about browser differences; unverified |

### 5. Human screen-reader pass

Latest data: WebAIM survey 11, Jul-Aug 2026, 1,780 valid responses, uncontrolled sample ([WebAIM survey 11](https://webaim.org/projects/screenreadersurvey11/)); survey 10 was Dec 2023-Jan 2024, 1,539 responses ([WebAIM survey 10](https://webaim.org/projects/screenreadersurvey10/)).

| Pair | Survey 11 | Survey 10 | Platform |
|---|---|---|---|
| JAWS + Chrome | 31.2 % | 24.7 % | Windows |
| NVDA + Chrome | 17.3 % | 21.3 % | Windows |
| JAWS + Edge | 17.0 % | 11.4 % | Windows |
| NVDA + Firefox | 9.1 % | 10.0 % | Windows |
| NVDA + Edge | 5.4 % | 5.0 % | Windows |
| JAWS + Firefox | 5.0 % | 2.6 % | Windows |
| VoiceOver + Safari | 4.3 % | 7.0 % | macOS |
| VoiceOver + Chrome | 1.6 % | 2.0 % | macOS |

Primary desktop reader: JAWS 55.0 %, NVDA 32.9 %, VoiceOver 6.5 %, Narrator 0.4 %; mobile: VoiceOver 72.2 %, TalkBack 29.5 % (both from [WebAIM survey 11](https://webaim.org/projects/screenreadersurvey11/), Jul-Aug 2026; respondents may use several mobile readers; the page notes the sample is uncontrolled).

GOV.UK requires at least: JAWS 2019+ with Chrome or Edge, NVDA with Chrome/Firefox/Edge, VoiceOver iOS with Safari, TalkBack with Chrome, Windows Magnifier or Apple Zoom, Dragon 15+ with Chrome; Firefox with JAWS/NVDA/Dragon is "other prioritised" ([GOV.UK, updated 24 May 2022](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies)). The table "is based on the 2016 survey" per that page. It says to test "throughout development, especially when you introduce a significant feature or make any major change".

Decision for the fleet: human minimum is NVDA+Chrome and JAWS+Chrome (Windows; 48.5 % of respondents between them by the table above) plus VoiceOver+Safari on iOS (mobile). Add NVDA+Firefox for release candidates. Trigger it on: a new widget pattern (dialog, menu, tabs, combobox, live region, custom control), a new flow, or a release, not on every PR. The agent's job is to list what a human must test and ask; it never records a pass.

### 6. What an agent may claim

| Evidence | Allowed claim | Forbidden claim |
|---|---|---|
| Script green on pages P | "ui-matrix passed 10 conditions on P in Chromium build X at date D" | "accessible", "WCAG 2.2 AA conformant", "works at 400 % zoom" (only the pages run) |
| axe green (other dive) | "axe reported no violations for rule set R" | "no accessibility issues" |
| Human pass logged with names and dates | "NVDA 20xx.x + Chrome N pass on flow F, tester T, date D" | extrapolating to other pairs |
| Nothing run | "not verified" | any claim |

Sources: the Playwright docs say "automated testing cannot detect all types of WCAG violations" and "many accessibility problems can only be discovered through manual testing" ([Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), undated, Copyright 2026). The WebAIM Million 2026 (Feb 2026 data, updated 30 Mar 2026) says "Absence of detected errors does not indicate that a page is accessible or conformant" and found 95.9 % of 1,000,000 home pages with detected WCAG 2 failures ([WebAIM Million](https://webaim.org/projects/million/)). GOV.UK: "you'll miss some issues if you only do automated testing" and run tests "every time you add a new feature" in public beta ([GOV.UK testing for accessibility, updated 29 Oct 2024](https://www.gov.uk/service-manual/helping-people-to-use-your-service/testing-for-accessibility)).

## Normative guidance candidates

1. **RIM-1 (MUST).** After any change to markup, CSS or JS of a rendered page, run `node checks/ui-matrix.mjs <base> <out.json> <route>...` against a served build of every touched route and read the printed PASS/FAIL lines. Rationale: static checks cannot see reflow, hidden focus or motion. Verify: the JSON report exists and has 10 rows per route; exit code 0.
2. **RIM-2 (MUST).** Fail a route if `scrollWidth > clientWidth + 1` at 320x1024, 640x360 or 320x180. Rationale: WCAG 1.4.10 and 1.4.4 at AA. Verify: rows `reflow-320`, `zoom-200`, `zoom-400` have `hscroll: false`.
3. **RIM-3 (MUST).** Fail a route if text is clipped by `overflow` at 320/640 px in an element that was not clipped at 1280 px. Rationale: loss of content at zoom (1.4.4; F102 for disappearing content). Verify: `newClipped` is empty; confirm by screenshot when non-empty because the check is a heuristic.
4. **RIM-4 (MUST).** Never ship `user-scalable=no` or `maximum-scale=1`. Rationale: blocks zoom (1.4.4, ACT rule ["Meta viewport allows for zoom", b4f0c3](https://act-rules.github.io/rules/b4f0c3), last modified 23 Jun 2022). Verify: `grep -rEn 'user-scalable\s*=\s*no|maximum-scale\s*=\s*1' src/ public/` returns nothing; the script's viewport check.
5. **RIM-5 (MUST).** In the Tab walk, every interactive stop (link, button, textbox, checkbox, radio, combobox, switch, tab, menuitem, searchbox, slider, spinbutton, option) has a non-empty accessible name read from the CDP accessibility tree. Rationale: 4.1.2; the [WebAIM Million 2026](https://webaim.org/projects/million/) (Feb 2026 data, updated 30 Mar 2026; independent study, WAVE-detected only) finds empty links on 46.3 % and empty buttons on 30.6 % of home pages. Verify: `unnamed` is empty.
6. **RIM-6 (MUST).** In the Tab walk, every stop shows a visible focus indicator (pixel difference between focused and blurred screenshot of the element plus 6 px margin) and is not entirely hidden (all nine sample points of its rect hit another element). Rationale: 2.4.7 and 2.4.11. Verify: `noRing` and `fullyObscured` are empty; for a flagged stop, read the computed `outline` printed beside it and fix with `:focus-visible { outline: ... }` or `scroll-padding-top` (C43).
7. **RIM-7 (MUST).** Run the Tab walk three times: 1280x720, 320x180, and forced colours. Rationale: sticky headers occupy most of a 180 px viewport; forced colours remove box-shadow indicators. Verify: rows `tabwalk-desktop`, `tabwalk-zoom400`, `tabwalk-forced` present.
8. **RIM-8 (MUST).** The walk must close (the first element recurs) within 120 stops with at most one stop on `body`. Rationale: 2.1.2 trap or focus loss. Verify: `capped: false` and `lost <= 1`.
9. **RIM-9 (SHOULD).** Under `reducedMotion: 'reduce'` no infinite animation runs and `scroll-behavior` is not `smooth`. Rationale: users who set the OS preference; WCAG 2.3.3 is AAA. Verify: row `reduced-motion` `reduce.infinite == 0`; `grep -rn 'scroll-behavior:\s*smooth' src/` has each hit inside `@media (prefers-reduced-motion: no-preference)`.
10. **RIM-10 (SHOULD).** Under `forcedColors: 'active'` no visible text equals its background and no author rule disables `forced-color-adjust` on text. Rationale: system colours replace authored colours ([MDN forced-colors, modified 20 Apr 2026](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors)). Verify: `invisibleText: 0`; `grep -rn 'forced-color-adjust:\s*none' src/` reviewed per hit (the `/` page has 22 elements with it).
11. **RIM-11 (MUST).** Report counts and page lists, never a conformance word. Rationale: a script run proves only the conditions it checks on the pages it loaded; the [WebAIM Million 2026](https://webaim.org/projects/million/) says absence of detected errors does not indicate a page is accessible or conformant, and [Playwright](https://playwright.dev/docs/accessibility-testing) says automated testing cannot detect all types of WCAG violations. Allowed sentence: "ui-matrix passed N of 10 conditions on routes R in Chromium build B on date D". Verify: reading heuristic; pass example "ui-matrix passed 10/10 on /integrations/ and /apps/"; fail example "the page is WCAG AA accessible".
12. **RIM-12 (MUST).** Do not state a screen-reader result an agent did not obtain from a named human with product, version and date. Rationale: an AX-tree read is not a screen-reader run; output and widget behaviour differ per product and version, and [GOV.UK](https://www.gov.uk/service-manual/helping-people-to-use-your-service/testing-for-accessibility) says you will miss issues with automated testing alone. Verify: any "works with NVDA/JAWS/VoiceOver" sentence has a tester and date beside it, else remove.
13. **RIM-13 (SHOULD).** Add a human screen-reader pass (NVDA+Chrome, JAWS+Chrome, VoiceOver+Safari iOS) when a diff adds or changes a dialog, menu, tabs, combobox, live region, custom widget or flow, and at release. Rationale: [WebAIM survey 11](https://webaim.org/projects/screenreadersurvey11/) shares; GOV.UK requires tests on significant features. Verify: the review output lists "human AT pass needed" for those diffs.
14. **RIM-14 (SHOULD).** CI runs all 10 report rows on touched routes and `/`; the review skill reruns them and judges focus order, name quality, modal exit and partial obscuring. Rationale: the script is deterministic and about 13 s per page (measured), so it gates; focus order, name quality, modal exit and partial overlap need judgement the script cannot make (section 4). Verify: CI job step exists; skill checklist names the four judgement items.
15. **RIM-15 (SHOULD).** Re-pick the screen-reader pairs from the newest WebAIM survey when a newer survey than 11 exists. Rationale: survey 11 moved JAWS from 40.5 % to 55.0 % in under three years, so a pair list pinned to old data goes stale (GOV.UK's list still cites the 2016 survey). Verify: `curl -s https://webaim.org/projects/ | grep -o 'screenreadersurvey[0-9]*' | sort -u` shows no number above 11.
16. **RIM-16 (CONSIDER).** Add a text-only resize run (root font size at 200 %) and the 256 px-high horizontal-scroll case. Rationale: neither is covered by viewport shrink. Verify: not yet implemented.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Says "responsive" after resizing once to 375 px | RIM-2 at 320x1024, 640x360, 320x180; read `hscroll` |
| Declares "accessible" after axe passes | RIM-11 wording check; grep the final message for `accessible|compliant|conformant` without a script row beside it |
| Treats `outline: none` plus `box-shadow` as safe | RIM-6 pixel diff; forced-colours walk (box-shadow disappears) |
| Uses `page.setViewportSize` and calls it "zoom 400 %" without stating 320x180 | the report prints the viewport; matrix row names viewport |
| Reads `getComputedStyle(...).outline` only | RIM-6 pixel diff caught 11 `solid 2px` stops that were not visibly present at 400 % on `/` (cause unresolved) |
| Counts the wrap-around `body` stop as a failure, or ignores a real focus loss | RIM-8: allow exactly 1 |
| Reads accessible names from an unverified source (for example `textContent`) | take the name from CDP `Accessibility.getPartialAXTree` or `ariaSnapshot` (`toMatchAriaSnapshot` listed from 1.49 in the [release notes](https://playwright.dev/docs/release-notes)) |
| Assumes headless Chromium Tab behaviour equals Safari | not verified by any source fetched; keep the human VoiceOver+Safari pass |
| Reports "works with NVDA" from the AX tree | RIM-12 |

## Contested / evolving

- **Which pairs a human must test.** GOV.UK lists JAWS, NVDA, VoiceOver iOS, TalkBack, magnifiers and Dragon, built on 2016 data ([GOV.UK, 24 May 2022](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies)). WebAIM survey 11 shows JAWS 55.0 % of primary desktop use against 40.5 % in survey 10 ([survey 11](https://webaim.org/projects/screenreadersurvey11/), [survey 10](https://webaim.org/projects/screenreadersurvey10/)); the survey is uncontrolled and skews to screen-reader users who answer WebAIM. This worker keeps both Windows readers because they are the two most-used and NVDA is free. Trend: JAWS+Edge rising (11.4 % to 17.0 %), VoiceOver+Safari falling (7.0 % to 4.3 %), but the macOS sample is small.
- **Is viewport shrink a valid zoom test?** WCAG states the equivalence for 1.4.10 only ([Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)); for 1.4.4 it says any user-agent text-scaling mechanism qualifies ([Understanding 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)), so text-only scaling is a distinct path the script does not run. Playwright documents no zoom option, so no source was found endorsing either approach for 1.4.4.
- **Pixel-diff versus computed-style focus detection.** Computed style missed (or falsely cleared) cases and pixel diff flagged 11 stops on `/` that the computed style says have a solid outline. Either the hero is visually hidden while focused (a real bug) or the screenshot clip misses it (a script limit). Unresolved; a human must view `/` at 320x180 with Tab.
- **Reduced motion.** WCAG 2.3.3 is AAA, yet the OS preference is widely set; this catalog treats it as SHOULD. Trend: unchanged.
- **Release-note facts are undated.** Playwright's release-notes page gave versions (latest 1.65; 1.65 changes accessible-name computation so non-rendered text is excluded) but no dates; the installed version here is 1.63.0.

## What an agent must not decide alone

- Whether to accept a failing condition as an exception (for example `ScrollStage` pinning on `/`): a design owner decides.
- Any statement of legal conformance (EAA, ADA, Section 508, EN 301 549, WCAG level claims in an accessibility statement): a human with legal responsibility decides.
- Which assistive-technology pairs the product commits to support publicly.
- Whether to remove a decorative animation or change a brand-defining hero to pass reflow or reduced motion.
- Whether to buy JAWS or other licences, and who the human testers are.

## Dated facts

| Fact | Source | Date stated | Type |
|---|---|---|---|
| 1.4.10: 320 CSS px (vertical) and 256 CSS px (horizontal) with no two-dimensional scroll; 320 px equals 1280 px at 400 % | [W3C Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | updated 04 Oct 2026 | authority |
| 1.4.4: 200 % text resize without loss of content | [W3C Understanding 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) | updated 06 Sep 2026 | authority |
| 2.4.7 AA; failures F55, F78 | [W3C Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | updated 04 Oct 2026 | authority |
| 2.4.11 AA; "entirely hidden"; F110; C43 | [W3C Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | updated 15 Jun 2026 | authority |
| 2.1.2 A | [W3C Understanding 2.1.2](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html) | updated 18 May 2026 | authority |
| WCAG 2.2 is a Recommendation and does not supersede 2.0/2.1; 2.3.3 is AAA | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 12 Dec 2024 | authority |
| Survey 11: 1,780 responses; JAWS 55.0 %, NVDA 32.9 %, VoiceOver 6.5 %; JAWS+Chrome 31.2 % | [WebAIM survey 11](https://webaim.org/projects/screenreadersurvey11/) | Jul-Aug 2026 | independent study |
| Survey 10: 1,539 responses; JAWS 40.5 %, NVDA 37.7 %; JAWS+Chrome 24.7 % | [WebAIM survey 10](https://webaim.org/projects/screenreadersurvey10/) | Dec 2023-Jan 2024 | independent study |
| WebAIM Million 2026: 95.9 % of 1,000,000 home pages with detected failures; 56.1 errors per page; empty links 46.3 %; empty buttons 30.6 % | [WebAIM Million](https://webaim.org/projects/million/) | Feb 2026 data, updated 30 Mar 2026 | independent study (WAVE-detected only) |
| GOV.UK required AT combinations | [GOV.UK](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) | updated 24 May 2022 (first published 26 Oct 2017) | authority (UK government) |
| GOV.UK: audit before public beta; test each new feature in public beta | [GOV.UK testing for accessibility](https://www.gov.uk/service-manual/helping-people-to-use-your-service/testing-for-accessibility) | updated 29 Oct 2024 | authority |
| `emulateMedia`: colorScheme v1.9, reducedMotion v1.12, forcedColors v1.15, contrast v1.51 | [Playwright Page API](https://playwright.dev/docs/api/class-page#page-emulate-media) | undated | tool vendor docs |
| `forced-colors` Baseline widely available since Sep 2022 | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors) | modified 20 Apr 2026 | independent reference |
| Playwright 1.65 latest listed; aria snapshot API history | [release notes](https://playwright.dev/docs/release-notes) | undated | tool vendor docs |

## Sources

| URL | What | Date/era | Why worth reading |
|---|---|---|---|
| https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | Understanding 1.4.10 | 04 Oct 2026 | pass condition, zoom equivalence |
| https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html | Understanding 1.4.4 | 06 Sep 2026 | pass condition, ACT rules |
| https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html | Understanding 2.4.7 | 04 Oct 2026 | failures F55, F78 |
| https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | Understanding 2.4.11 | 15 Jun 2026 | "entirely hidden" definition |
| https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html | Understanding 2.1.2 | 18 May 2026 | trap definition |
| https://www.w3.org/TR/WCAG22/ | WCAG 2.2 Recommendation | 12 Dec 2024 | level of 2.3.3 |
| https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies | GOV.UK AT list | 24 May 2022 | required pairs |
| https://www.gov.uk/service-manual/helping-people-to-use-your-service/testing-for-accessibility | GOV.UK testing cadence | 29 Oct 2024 | automated is not enough |
| https://webaim.org/projects/screenreadersurvey11/ | WebAIM survey 11 | Jul-Aug 2026 | current pair shares |
| https://webaim.org/projects/screenreadersurvey10/ | WebAIM survey 10 | Dec 2023-Jan 2024 | trend baseline |
| https://webaim.org/projects/ | WebAIM project index | 2026 | shows survey 11 exists |
| https://webaim.org/projects/million/ | WebAIM Million 2026 | 30 Mar 2026 | no-detected-errors caveat |
| https://playwright.dev/docs/api/class-page#page-emulate-media | Playwright emulateMedia | 1.63-1.65 era | exact option names |
| https://playwright.dev/docs/api/class-browser#browser-new-context | Playwright context options | 1.63-1.65 era | defaults |
| https://playwright.dev/docs/accessibility-testing | Playwright a11y testing | 2026 | what automation cannot catch |
| https://playwright.dev/docs/input | Playwright input | 2026 | no browser-difference note |
| https://playwright.dev/docs/aria-snapshots | ARIA snapshots | 2026 | name/role assertions |
| https://playwright.dev/docs/release-notes | Release notes | to 1.65 | API timeline |
| https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors | MDN forced-colors | 20 Apr 2026 | forced-color-adjust semantics |

Primary: the six W3C pages, two GOV.UK pages and MDN are authority or reference sources; WebAIM (4 pages) are independent studies; the six Playwright pages are tool-vendor documentation.

## Appendix: commands and script

Measurement commands (run from a scratch directory that has `node_modules` linked to `ocx-sh/website/node_modules`):

```bash
cd ocx-sh/website/site/dist && python3 -m http.server 4399 &
export LD_LIBRARY_PATH=<dir with side-loaded libnspr4, libnss3 ...>/usr/lib/x86_64-linux-gnu
export PW_CHROMIUM=$HOME/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome
time node ui-matrix.mjs http://127.0.0.1:4399 out.json / /integrations/ /apps/
```

`ui-matrix.mjs` (commit as `checks/ui-matrix.mjs`; needs `playwright-core` (tested with 1.63.0); exit 0 when all conditions pass):

```js
#!/usr/bin/env node
// Rendered-interaction matrix: one script, 10 report rows per route, JSON report.
// usage: node ui-matrix.mjs <baseUrl> <out.json> <path> [<path>...]
// needs: playwright-core (any 1.51+), a Chromium build, a running dev/preview server.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const [base, out, ...paths] = process.argv.slice(2);
if (!base || !out || paths.length === 0) {
  console.error('usage: ui-matrix.mjs <baseUrl> <out.json> <path>...');
  process.exit(2);
}
const MAX_STOPS = 120;
const INTERACTIVE = new Set(['link', 'button', 'textbox', 'checkbox', 'radio', 'combobox', 'switch', 'tab', 'menuitem', 'searchbox', 'slider', 'spinbutton', 'option']);
const t0 = Date.now();
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const report = [];

// Browser zoom Z% on a 1280x720 window == viewport (1280/Z*100) x (720/Z*100) CSS px (WCAG 1.4.10 note 1).
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  zoom200: { width: 640, height: 360 },
  zoom400: { width: 320, height: 180 },
  reflow320: { width: 320, height: 1024 },
};

async function ctxPage(vp, media = {}) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'no-preference', ...media });
  const page = await ctx.newPage();
  return { ctx, page };
}

const overflowProbe = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const wide = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 && !el.closest('pre, table, [data-allow-2d], .expressive-code, svg')) {
      wide.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`);
    }
  }
  const clipped = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (!/(hidden|clip)/.test(cs.overflowX + cs.overflowY)) continue;
    if (!el.textContent.trim()) continue;
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
      if (el.clientHeight > 1 && el.clientWidth > 1 && !/sr-only/.test(el.className) && cs.textOverflow !== 'ellipsis') clipped.push(`${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''}`);
    }
  }
  return { scrollW: de.scrollWidth, clientW: vw, hscroll: de.scrollWidth > vw + 1, wide: [...new Set(wide)].slice(0, 6), clippedText: clipped.length, clippedList: [...new Set(clipped)] };
};

async function baselineClipped(url) {
  const { ctx, page } = await ctxPage(VIEWPORTS.desktop);
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(overflowProbe);
  await ctx.close();
  return new Set(r.clippedList);
}

async function layoutCondition(url, name, vp, media, base0) {
  const { ctx, page } = await ctxPage(vp, media);
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(overflowProbe);
  const meta = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.content ?? null);
  await ctx.close();
  const newClipped = r.clippedList.filter((c) => !base0.has(c));
  const pass = !r.hscroll && newClipped.length === 0 && !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(meta ?? '');
  return { cond: name, pass, ms: Date.now() - s, viewport: meta, newClipped, ...r };
}

const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

async function schemeCondition(url, scheme) {
  const { ctx, page } = await ctxPage(VIEWPORTS.desktop, { colorScheme: scheme });
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/[\d.]+/g).map(Number);
    return { bg, rgb: m.slice(0, 3), dataTheme: document.documentElement.dataset.theme ?? null, scheme: getComputedStyle(document.documentElement).colorScheme };
  });
  const L = lum(r.rgb);
  await ctx.close();
  const pass = scheme === 'dark' ? L < 0.2 : L > 0.5;
  return { cond: `scheme-${scheme}`, pass, ms: Date.now() - s, bg: r.bg, bgLuminance: +L.toFixed(3), dataTheme: r.dataTheme };
}

async function forcedCondition(url) {
  const { ctx, page } = await ctxPage(VIEWPORTS.desktop, { forcedColors: 'active' });
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const matches = matchMedia('(forced-colors: active)').matches;
    const optOut = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).forcedColorAdjust === 'none').length;
    const eff = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba?\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
    const same = [];
    for (const el of document.querySelectorAll('body a, body button, body p, body h1, body h2, body h3, body li, body span')) {
      if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).color === eff(el)) same.push(el.tagName.toLowerCase());
    }
    const iconOnlyNoBorder = [...document.querySelectorAll('button, [role=button]')].filter((b) => {
      const cs = getComputedStyle(b);
      return !b.textContent.trim() && cs.borderTopStyle === 'none' && cs.outlineStyle === 'none';
    }).length;
    return { matches, optOut, invisibleText: same.length, iconOnlyNoBorder };
  });
  await ctx.close();
  return { cond: 'forced-colors', pass: r.matches && r.invisibleText === 0, ms: Date.now() - s, ...r };
}

async function motionCondition(url) {
  const probe = () => document.getAnimations().filter((a) => a.playState === 'running').map((a) => ({ inf: a.effect?.getComputedTiming().iterations === Infinity, dur: a.effect?.getComputedTiming().duration }));
  const res = {};
  for (const mode of ['no-preference', 'reduce']) {
    const { ctx, page } = await ctxPage(VIEWPORTS.desktop, { reducedMotion: mode });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const a = await page.evaluate(probe);
    res[mode] = { running: a.length, infinite: a.filter((x) => x.inf).length };
    res.scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    await ctx.close();
  }
  return { cond: 'reduced-motion', pass: res.reduce.infinite === 0 && res.scrollBehavior !== 'smooth', ms: 0, ...res };
}

async function tabWalk(url, label, vp, media) {
  const { ctx, page } = await ctxPage(vp, media);
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(page);
  const stops = [];
  let first = null;
  for (let i = 0; i < MAX_STOPS; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return { body: true };
      const r = el.getBoundingClientRect();
      const vw = innerWidth, vh = innerHeight;
      const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, vw), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, vh);
      let hit = 0, total = 0;
      if (x1 > x0 && y1 > y0) for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) {
        total++;
        const h = document.elementFromPoint(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy);
        if (h && (h === el || el.contains(h))) hit++;
      }
      const cs = getComputedStyle(el);
      window.__ids ??= new WeakMap(); window.__n ??= 0; if (!window.__ids.has(el)) window.__ids.set(el, ++window.__n); const key = window.__ids.get(el);
      return { key, tag: el.tagName.toLowerCase(), hit, total, inView: x1 > x0 && y1 > y0, focusVisible: el.matches(':focus-visible'),
        outline: `${cs.outlineStyle} ${cs.outlineWidth} off=${cs.outlineOffset}`, cls: (typeof el.className === 'string' ? el.className.split(' ')[0] : ''), y: Math.round(scrollY), rect: { x: Math.max(r.left - 6, 0), y: Math.max(r.top - 6, 0), w: Math.min(r.width + 12, vw), h: Math.min(r.height + 12, vh) } };
    });
    if (info.body) { stops.push({ i, lost: true }); continue; }
    if (first === null) first = info.key; else if (info.key === first) break;
    const { result: object } = await cdp.send('Runtime.evaluate', { expression: 'document.activeElement' });
    const ax = await cdp.send('Accessibility.getPartialAXTree', { objectId: object.objectId, fetchRelatives: false });
    const n = ax.nodes[0];
    const name = (n?.name?.value ?? '').trim();
    const role = n?.role?.value ?? '';
    let ring = null;
    if (info.inView && info.rect.w > 0 && info.rect.h > 0) {
      const clip = { x: info.rect.x, y: info.rect.y, width: Math.max(info.rect.w, 1), height: Math.max(info.rect.h, 1) };
      const on = await page.screenshot({ clip, animations: 'disabled' });
      await page.evaluate(() => { window.__ae = document.activeElement; window.__ae.blur(); });
      const off = await page.screenshot({ clip, animations: 'disabled' });
      await page.evaluate(() => window.__ae.focus()); // script refocus keeps :focus-visible after keyboard use in Chromium
      ring = !on.equals(off);
    }
    stops.push({ i, cls: info.cls, outline: info.outline, y: info.y, tag: info.tag, hit: info.hit, total: info.total, role, name, nameEmpty: name === '', ring, obscured: info.total > 0 && info.hit === 0 ? 'full' : (info.hit < info.total ? 'partial' : 'none'), inView: info.inView, focusVisible: info.focusVisible });
  }
  await ctx.close();
  const real = stops.filter((x) => !x.lost);
  const res = {
    cond: `tabwalk-${label}`, ms: Date.now() - s, stops: real.length, lost: stops.filter((x) => x.lost).length,
    unnamed: real.filter((x) => x.nameEmpty && INTERACTIVE.has(x.role)).map((x) => `${x.tag}#${x.i}`),
    noRing: real.filter((x) => x.ring === false && x.obscured !== 'full').map((x) => `${x.tag}.${x.cls}#${x.i}:${x.name.slice(0, 24)} [${x.outline}] y=${x.y}`),
    fullyObscured: real.filter((x) => x.obscured === 'full').map((x) => `${x.tag}#${x.i}:${x.name.slice(0, 24)}`),
    partlyObscured: real.filter((x) => x.obscured === 'partial').length,
    capped: real.length >= MAX_STOPS,
    first: real.slice(0, 3).map((x) => x.name),
  };
  res.pass = res.unnamed.length === 0 && res.noRing.length === 0 && res.fullyObscured.length === 0 && res.lost <= 1 && !res.capped;
  return res;
}

for (const p of paths) {
  const url = new URL(p, base).href;
  const ps = Date.now();
  const rows = [];
  const base0 = await baselineClipped(url);
  rows.push(await layoutCondition(url, 'reflow-320', VIEWPORTS.reflow320, {}, base0));
  rows.push(await layoutCondition(url, 'zoom-200', VIEWPORTS.zoom200, {}, base0));
  rows.push(await layoutCondition(url, 'zoom-400', VIEWPORTS.zoom400, {}, base0));
  rows.push(await schemeCondition(url, 'light'));
  rows.push(await schemeCondition(url, 'dark'));
  rows.push(await forcedCondition(url));
  rows.push(await motionCondition(url));
  rows.push(await tabWalk(url, 'desktop', VIEWPORTS.desktop, {}));
  rows.push(await tabWalk(url, 'zoom400', VIEWPORTS.zoom400, {}));
  rows.push(await tabWalk(url, 'forced', VIEWPORTS.desktop, { forcedColors: 'active' }));
  report.push({ path: p, totalMs: Date.now() - ps, rows });
}
await browser.close();
const summary = { base, totalMs: Date.now() - t0, pages: report };
writeFileSync(out, JSON.stringify(summary, null, 2));
let fail = 0;
for (const pg of report) for (const r of pg.rows) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${pg.path.padEnd(16)} ${r.cond.padEnd(18)} ${r.ms}ms`);
  if (!r.pass) fail++;
}
console.log(`total ${summary.totalMs}ms, ${fail} failing conditions`);
process.exit(fail ? 1 : 0);
```

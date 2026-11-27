---
title: "Announcements and motion: live regions, toggle state, reduced motion, autoplay and flashing"
program: product
sub_program: ux
topic: ux-a11y-authoring
worker: announcements-and-motion
date_researched: 2026-11-27
model: sonnet
sources_fetched: 17
---

# Announcements and motion

Scope: how agent-written UI announces discrete state changes, exposes toggle state, and handles motion, autoplay and flashing. Out of scope and left to siblings: streaming output (UX-AI conversation mechanics), the announced words (UX-TEXT), cross-territory items named once at the end. Scout rows M045-M048, AX17, AX18, PI9, CS10, CS11, CS39, RS11, PR35 and FC22 were not separately re-read: the grep over `ux-topic-map/*.md` returned no matching lines in the form tried, so the primary sources were fetched directly and nothing here depends on those rows.

## Table of contents

1. Summary
2. Findings (live regions; toggles; reduced motion; view transitions; autoplay and flashing; fleet measurements; harness)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Harness source
9. Sources

## Summary

- Use `role="status"` for success, results, progress summaries and waiting states; use `role="alert"` only for errors that need interruption. WCAG lists `alert` or `aria-live="assertive"` on unimportant content as a failure ([WCAG 4.1.3 Understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), page updated 2026-10-04, authority).
- The live region must exist, empty, in the initial markup, before the update. W3C technique ARIA22 tests exactly this ([ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), updated 2026-01-12, authority).
- A region injected already holding text is not announced (the `alert` role excepted). Measured with the Guidepup virtual reader: `[]` spoken; see Finding 1.4.
- Do not stack `aria-live="assertive"` on `role="alert"`: MDN reports double speaking in VoiceOver on iOS ([MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions), modified 2026-09-11, reference documentation). The virtual reader does not model that bug (Finding 1.4).
- Toggles expose state in one of two ways: a stable accessible name plus `aria-pressed` (button) or `aria-checked` (switch). A name that changes with state must not also carry `aria-pressed` ([APG button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), authority).
- Measured: the fleet theme switch renames itself on click ("Light mode (click for Dark mode)" to "Dark mode (click for Light mode)"), carries no `aria-pressed` and has no live region. It follows the APG "rename, no pressed" branch and is valid, but it is the pattern an agent copies wrongly.
- Reduced motion: wrap motion in `@media (prefers-reduced-motion: no-preference)` or zero duration tokens under `reduce`. Fades may stay; scaling and panning are the vestibular triggers ([MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), modified 2026-06-10, reference documentation).
- WCAG 2.3.3 (Animation from Interactions) is Level AAA, not AA ([Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), updated 2025-09-16). Severity of the reduced-motion rule is a project decision, which this program sets to MUST for movement and autoplay and SHOULD for the rest.
- Counting `prefers-reduced-motion` blocks undercounts: the theme zeroes every duration through tokens in one block (`tokens.css:353`), so the Detect line must read the token layer, not just count blocks.
- Autoplay: motion that starts automatically, lasts more than 5 seconds and sits beside other content needs pause, stop or hide (2.2.2, Level A, [Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)).
- Flashing: no more than three flashes in any one second unless below the general and red thresholds (2.3.1, Level A, [Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)).
- Fleet gaps measured: Grimoire docs has 14 `transition:` and 1 `animation:` declarations, 0 reduced-motion blocks; the VS Code extension webview has 1 `animation:` (a 2-second fade) and 0 reduced-motion blocks.
- `@guidepup/virtual-screen-reader` 0.33.0 (npm modified 2026-09-20) does log live-region mutations as `polite: <text>` and `assertive: <text>`, which its README does not document. It is a simulation: every spoken-output claim stays UNVERIFIED against a real screen reader.

## Findings

### 1. Live regions

**1.1 Which role for which event.** WCAG 4.1.3 (Level AA) requires status messages to be programmatically determinable "through role or properties" without moving focus. Its technique mapping ([Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), fetched 2026-11-27, page dated 2026-10-04):

| Event | Technique | Role |
|---|---|---|
| Action result, app state, success | ARIA22 (+G199) | `status` |
| Input error, suggestion, warning | ARIA19 | `alert` or a live region |
| Sequential updates (chat, build output) | ARIA23 | `log` |
| Progress | ARIA25 (live region), ARIA27 (`ariaNotify`) | `progressbar` / `status` |
| Dialog that takes focus | none needed | already announced |

Exceptions that need no live region: a change of context; expand/collapse and tab selection (covered by 4.1.2 name-role-value); search result lists themselves, though a summary such as "18 results returned" is a status message.

**1.2 No `alert` for success.** The page names as a failure using `role="alert"` or `aria-live="assertive"` on content that is not important or time-sensitive. MDN agrees: `assertive` "should only be used for time-sensitive/critical notifications" because it interrupts speech ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)). Technique ARIA19 itself says nothing about success messages, so the success prohibition rests on the 4.1.3 failure text, not on ARIA19.

**1.3 Region before update.** ARIA22 test 1: the container has `role="status"` before the message appears; adding the role together with the content "may not be announced reliably" ([ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), updated 2026-01-12). ARIA19 requires the empty `role="alert"` container to exist on load, with `aria-atomic="true"` so iOS VoiceOver re-reads after a second failure ([ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19), updated 2026-04-27). MDN: start with an empty region, give assistive technology time to expose it, and when creating it in script defer the content to a later task with `setTimeout()`; put it in initial markup where possible. MDN's `role="alert"` exception: injected with content, it is generally still announced.

ARIA22 says `role="status"` implies `aria-live="polite"` and `aria-atomic="true"` but recommends an explicit `aria-atomic="true"` because some environments do not treat it as atomic. MDN recommends a redundant `aria-live="polite"` on `log` and `status` for compatibility, and warns that `aria-live="off"` does not silence a region reliably.

**1.4 What the virtual reader showed.** Tool: `@guidepup/virtual-screen-reader` 0.33.0 (`npm view @guidepup/virtual-screen-reader version time.modified` returned `0.33.0` and `2026-09-20T19:50:52Z`; the GitHub README page shows no version). The README says it should "not replace but augment" screen reader testing and does not mention live regions. Measured behaviour with jsdom 31.0.1 and Vitest 5.1.2 (probes in the harness below, `spoken-log.json`):

| Probe | Mutation after reader start | Logged by the tool |
|---|---|---|
| `<p role=status>` | text set to "Saved" | `polite: Saved` |
| `<p role=alert>` | text set | `assertive: Failed` |
| `<p role=alert aria-live=assertive>` | text set | `assertive: Failed` once (no double; the iOS double-speak MDN describes is a real-reader bug and is not modelled) |
| `role=status` inserted already holding text | insert | nothing (matches MDN and ARIA22) |
| `<p role=status hidden>` then `hidden` removed | attribute removed | `polite: Saved` (a pre-existing region that becomes visible does announce in this tool) |
| `<p aria-live=off>` | text set | nothing |
| `aria-live=polite aria-atomic=true`, one child changed | child text change | `polite: Count: 2` (whole region, atomic honoured) |

UNVERIFIED label: every row is the tool's model of announcement. None has been checked against NVDA, JAWS or VoiceOver. The `hidden` row in particular may differ in real readers.

### 2. State exposure for toggles

APG button pattern: a toggle button sets `aria-pressed`; the label must stay the same when state changes ("critical"); a mute button stays "Mute"; if the design swaps "Mute" to "Unmute", the button should not use `aria-pressed` ([APG button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), copyright 2026, no stated date). APG switch: role `switch`, `aria-checked="true|false"`, native `input[type=checkbox]` uses `checked` instead, and "it is critical the label on a switch does not change when its state changes" ([APG switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), copyright 2026, no stated date). Space toggles; Enter is optional.

Measured fleet markup (built `ocx-sh/website/site/dist/index.html`, extracted by the harness): theme toggle `<button data-ocx-theme="true" aria-label="Light mode (click for Dark mode)" data-value="light">`. `cycle-button.mjs:34` rewrites the name to `` `${label} (click for ${next})` ``. After a real `onClick` the name is "Dark mode (click for Light mode)", `aria-pressed` is absent and no live region fires. Spoken log (UNVERIFIED): `button, Light mode (click for Dark mode)`. This is the APG-compatible "name changes, no `aria-pressed`" branch; it is acceptable because the name carries state, but a screen reader user gets no announcement after activation beyond focus re-reading, and agents commonly mix both branches (renamed label plus `aria-pressed`), which APG forbids.

Copy button (story page `examples/starlight/dist/stories/copy-button/default`): `aria-label="Copy install command"` is stable, so the visible "copy" to "copied" swap (indicators toggled with `hidden`) is invisible to assistive technology. The reader log shows "copy" then "copied" only because it walks the text; the button name does not change. No live region sits in the component; the source comment says it "asks the page toaster" for the confirmation (`CopyButton.astro`), so the announcement depends on the toaster region, which this run did not exercise (UNVERIFIED).

Command bar: `<span class="ocx-cmdbar__status" role="status"></span>` is empty in initial markup (good), `command-bar.mjs:128-131` sets `status.textContent` and clears it after 2000 ms. The source carries a comment that a second copy inside the 2 s window keeps the same text and is not announced again. That is an unfixed announcement gap (same text into an unchanged region), and the tool run confirms a single `Copied install command` per update, with 0 double announcements (`doubled: 1` in the log is one phrase, not a duplicate).

### 3. Reduced motion

- `prefers-reduced-motion` values: `no-preference` (false) and `reduce` (true); Baseline widely available since January 2020 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), modified 2026-06-10). MDN's own example swaps scaling `pulse` for an opacity-only `dissolve`: reduce means "removes, reduces, or replaces", not "none". Chrome's view-transition guide makes the same point: reduced motion "doesn't mean no motion" ([Chrome](https://developer.chrome.com/docs/web-platform/view-transitions/same-document), last updated 2024-09-25, vendor documentation).
- Primer: wrap CSS transitions and animations in `@media (prefers-reduced-motion: no-preference)`; in JavaScript read `window.matchMedia('(prefers-reduced-motion: reduce)')` on load and listen for changes; document each animation's purpose, duration and whether users can pause it ([Primer](https://primer.style/accessibility/design-guidance/motion-and-animation/), no date on the page, design-system authority for GitHub).
- Carbon: durations `duration-fast-01` 70 ms, `fast-02` 110 ms, `moderate-01` 150 ms, `moderate-02` 240 ms, `slow-01` 400 ms, `slow-02` 700 ms; "Always provide alternatives for interface state transitions"; the page does not mention `prefers-reduced-motion`, and its checklist range of 90-120 ms for micro-interactions contradicts its own 70 and 150 ms tokens ([Carbon](https://carbondesignsystem.com/elements/motion/overview/), updated 2026-08-12, design-system authority). Treat Carbon as a source for durations only, not for the reduced-motion rule.
- WCAG 2.3.3 Animation from Interactions: Level AAA; motion animation triggered by interaction must be disableable unless essential; technique C39 (CSS `prefers-reduced-motion`) and SCR40 (script) are sufficient ([Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), updated 2025-09-16). "Essential" means removal would fundamentally change the information or function; the page's example is an animation preview in an authoring tool.

Fleet token pattern worth encoding: `ocx-sh/website/packages/theme/src/tokens.css:353` zeroes `--ocx-duration-fast|enter|base|moderate|slow` under `reduce`, and `starlight/theme-toggle.mjs:22` reads `--ocx-duration-moderate` and skips `startViewTransition` when it is 0. One block governs every consumer of the tokens. A literal `transition: 0.3s` bypasses it.

### 4. View transitions

MDN: same-document transitions start with `document.startViewTransition()`; cross-document ones opt in with the `@view-transition` at-rule and use `pageswap` and `pagereveal` events ([MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), modified 2026-09-28). The page says transitions that keep old and new content in the DOM can cause loss of reading position, focus confusion and "strange live region announcement behavior". The fetched extract of that page did not mention `prefers-reduced-motion`. Chrome's guide gives the opt-out: inside `@media (prefers-reduced-motion)`, set `animation: none !important` on `::view-transition-group(*)`, `::view-transition-old(*)` and `::view-transition-new(*)`; feature-detect `startViewTransition` and run the update directly when absent; treat the transition as an enhancement. Support (badges on that page, no release dates stated): same-document Chrome 111; types and `view-transition-class` Chrome 125, Edge 125, Firefox 144, Safari 18.

Fleet: 6 view-transition hits, all in the theme (`theme-toggle.mjs:22`, `starlight.css:508`, `Shell.astro:146`). The toggle gates on a zeroed token and feature-detects the API; it does not use the Chrome `animation: none` rule because the duration is already 0. Both approaches pass; only a script that reads the token (or the media query) is a valid Detect.

### 5. Autoplay and flashing

- 2.2.2 Pause, Stop, Hide, Level A: moving, blinking or scrolling content that starts automatically, lasts more than five seconds and appears with other content needs a mechanism to pause, stop or hide. Auto-updating content needs the same or a frequency control, with no five-second allowance. Exempt: essential motion, and a loading animation that is the only thing on the page ([Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), fetched 2026-11-27).
- Primer stricter on minor animation: stop after 5 seconds and hold a static end state; video opt-in rather than autoplay; visible Pause control near long-running motion; animated GIFs cannot meet this without a replacement.
- 2.3.1 Three Flashes or Below Threshold, Level A: no more than three flashes in any one-second period unless below the general and red flash thresholds. General flash: a pair of opposing luminance changes of 10% or more of maximum with the darker state below 0.80. Pass also if the combined flashing area is at most 0.006 steradians. W3C describes 341 by 256 pixels as an estimate of a 10-degree field on a 1024 by 768 screen; Primer states the same size as a rough area ([Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), fetched 2026-11-27). The normative limit is the steradian value; the pixel rectangle is an estimate.
- Primer: never flash saturated red; if the limits cannot be guaranteed, do not flash.

### 6. Fleet measurements

All run 2026-11-27 from `/home/mherwig/dev`. Pattern `animation:` and `transition:` match declarations, not `transition-property` or custom properties.

| Corpus | `animation:` | `transition:` | `transition: all` | view-transition | `prefers-reduced-motion` |
|---|---|---|---|---|---|
| Theme `ocx-sh/website/packages/theme/src` | 6 | 122 | 0 | 6 | 16 |
| ocx.sh landing `ocx-sh/website/site/src` | 0 | 0 | 0 | 0 | 0 |
| Grimoire docs `grimoire-rs/grimoire/docs` (`src`, `public`) | 1 | 14 | 0 | 0 | 0 |
| VS Code `grimoire-rs/vscode` (`src`, minus `src/test`) | 1 | 0 | 0 | 0 | 0 |

Commands: `cd ocx-sh/website && git grep -ohE 'animation:' -- packages/theme/src | wc -l`; the same with `'transition:'`, `'transition: *all'`, `'view-transition|startViewTransition'`, `'prefers-reduced-motion'`; `git grep -ohE ... -- src public` in `grimoire-rs/grimoire/docs`; `git grep -ohE ... -- src ':!src/test'` in `grimoire-rs/vscode`. A multi-line `transition:` value counts once.

Readings:
- Grimoire docs: the one `animation:` is `public/asciinema-player.css:440`, an `ap-loader-rotation 1s linear infinite` spinner, unguarded (a vendored player; only the loading animation, which 2.2.2 exempts as a lone element). The 14 `transition:` lines are the hover-colour class noted in the grounding audit. With 0 reduced-motion blocks this is a gap in the strict rule, low harm in practice because the movement is colour.
- VS Code webview: `details.css:1366` `animation: revalidate-fade 2s ease forwards`, an opacity fade, no `reduce` block. Fade-only, so it passes the MDN "replace with opacity" reading; the rule is still unmet in form.
- The theme's 16 mentions cover 14 distinct `@media` or script guards plus the token block. The token block makes the 122 `transition:` lines compliant only if each reads a `--ocx-duration-*` token: `cd ocx-sh/website/packages/theme/src && grep -rnE 'transition:\s*[^;]*[0-9.]+m?s' . | grep -v 'var(--ocx-duration' | head` should return only deliberate literals (not executed in this run; Detect line below does it).
- Live regions in the theme: 14 `aria-live|role="(status|alert)"` lines (`cd ocx-sh/website && git grep -nE 'aria-live|role="(status|alert)"|role=.(status|alert)' -- packages/theme/src | wc -l`, from the grounding audit). In the VS Code webview: 5 lines (`git grep -nE 'aria-live|role="(status|alert)"' -- src ':!src/test'`), notably `render.ts:1219` `role="status" tabindex="-1" aria-live="polite"` with `aria-busy` while loading, and `settings/render.ts:518-522` `role="alert"` for save failures, which is the error-gets-alert pattern.
- The theme owns several component-local `role="status"` regions (CommandBar, CommandPalette, List, Loader, DataTable, DependencyExplorer count, Popover fill) rather than one per page. Whether that violates "one region per page" is Contested below.

### 7. Harness

Directory `~/.cache/research-lang/exemplars/product/ux-announce-harness/` (outside the repo). Install: `npm i -D vitest jsdom @guidepup/virtual-screen-reader` (resolved vitest 5.1.2, jsdom 31.0.1, virtual-screen-reader 0.33.0). Copy `ocx-sh/website/packages/theme/src/components/ui/cycle-button.mjs` into the directory as `cycle-button.copy.mjs` first (vite-node refuses imports outside its root). Run `npx vitest run`: 14 tests pass. The harness mounts real built HTML from the theme (`site/dist/index.html`, `examples/starlight/dist/stories/copy-button/default/index.html`), activates the theme switch through the real `onClick`, simulates the copy indicator swap and the command-bar `say()` update, and writes `spoken-log.json`. It does not execute Zag clipboard, so copy activation is simulated by DOM mutation (what the source comments say Zag does), not driven by a real click. Full source in section 8. The tool does log live-region output, so the DOM-contract fallback is used as a second layer, not a replacement. All spoken text is UNVERIFIED against real screen readers.

## Normative guidance candidates

IDs are local (A11Y-ANN-n); the consolidator assigns catalog IDs.

1. **A11Y-ANN-1 (MUST).** Announce a discrete result (copied, saved, applied, N results, progress) by writing text into an existing `role="status"` container; never move focus to announce it. Rationale: WCAG 4.1.3 AA. Verify: for each handler that changes visible status text, `grep -rnE 'role="status"|aria-live' <component>` must find a container in the same component or the page announcer; reading heuristic: pass `<p role="status"></p>` in markup, `el.textContent = 'Saved'` in script; fail a `<div class="toast">Saved</div>` appended with no role, or `el.focus()` to a message.
2. **A11Y-ANN-2 (MUST).** Put the live region in the initial markup, empty; never create it and fill it in one step, and when script must create it, defer the text to a later task. Rationale: ARIA22 test 1, MDN. Verify: harness DOM contract (`role`, container present and `textContent === ''` before the update) and the probe "injected with text" logging nothing; grep fail pattern `insertAdjacentHTML\([^)]*role="status"[^)]*>[^<]+<` or `createElement` followed by `role` and `textContent` in one block.
3. **A11Y-ANN-3 (MUST).** Use `role="alert"` only for errors or time-critical messages; use `role="status"` for success. Never use `aria-live="assertive"` on success or on content that is not time-sensitive. Rationale: WCAG 4.1.3 failure text. Verify: `grep -rnE 'role="alert"|aria-live="assertive"'` and read each hit against its handler; fail if the message text is "saved", "copied", "done" or a count.
4. **A11Y-ANN-4 (MUST NOT).** Do not add `aria-live="assertive"` to an element that already has `role="alert"`. Rationale: MDN: double speaking in VoiceOver on iOS. Verify: `grep -rnE 'role="alert"[^>]*aria-live|aria-live[^>]*role="alert"'` returns nothing.
5. **A11Y-ANN-5 (SHOULD).** Add `aria-atomic="true"` to a status region whose message is a sentence built from parts (counts), and a redundant `aria-live="polite"` on `status` and `log`. Rationale: ARIA22 and MDN compatibility notes. Verify: harness probe `aria-atomic` case logs the whole string; grep each `role="status"` for `aria-atomic`.
6. **A11Y-ANN-6 (SHOULD).** To announce the same text twice, clear the region, then set the text in a later task; do not suppress the repeat. Rationale: the fleet's command bar documents a missed repeat inside its 2 s window (`command-bar.mjs`, comment on `say`). Verify: UNVERIFIED on real readers; harness: set text, clear, `await setTimeout(0)`, set same text, expect two `polite:` entries.
7. **A11Y-ANN-7 (SHOULD).** Route transient action feedback through one page-level announcer rather than one region per message; component-local `status` regions are allowed for persistent summaries (result count, loading state). Rationale: single, pre-registered region is the most reliable; the commission's one-region rule. Verify: built-page count `grep -oE 'role="status"|aria-live="[a-z]+"' dist/**/*.html | wc -l` per page; more than 3 on a page is a flag for review, not a failure (threshold is a heuristic of this dive, not a sourced limit).
8. **A11Y-ANN-8 (MUST NOT).** Do not use a live region to announce expand/collapse, tab selection, or a dialog that takes focus. Rationale: WCAG exceptions; 4.1.2 owns them. Verify: reading heuristic: a region whose text repeats "opened" or "expanded" fails; the state must be `aria-expanded`/`aria-selected`.
9. **A11Y-ANN-9 (MUST).** A two-state control exposes state as either (a) stable name + `aria-pressed` (button) or (b) stable name + `aria-checked` on `role="switch"` or a native checkbox. Never set `aria-pressed` and change the name on the same control. Rationale: APG button and switch pages. Verify: grep handlers that call both `setAttribute('aria-label'` and `aria-pressed`; harness: assert `name` identical before/after `onClick` when `aria-pressed` is present, `aria-pressed` toggles `"true"`/`"false"` as strings.
10. **A11Y-ANN-10 (SHOULD).** Prefer a native `<input type="checkbox">` for on/off settings over `role="switch"` or an `aria-pressed` button unless the design needs a push-button look. Rationale: APG treats the three as often interchangeable; native carries keyboard and state free. Verify: `grep -rnE 'role="switch"'` hits are reviewed against a native alternative.
11. **A11Y-ANN-11 (MUST).** When a visible label swaps ("copy" to "copied") keep the control's accessible name stable and announce the result through a status region (A11Y-ANN-1); the visible swap alone is not an announcement. Rationale: an `aria-label` override hides the swapped text. Verify: harness copy case: the button name is the same before and after, and a `role="status"` receives text on success.
12. **A11Y-ANN-12 (MUST).** Every CSS `animation` and `transition` that moves, scales, pans, rotates or parallax-scrolls an element is either inside `@media (prefers-reduced-motion: no-preference)`, replaced with an opacity-only change under `reduce`, or reads a duration custom property that a `reduce` block sets to `0s`. Rationale: WCAG 2.3.3 (AAA) and C39; this program sets MUST because vestibular harm is the failure mode. Verify Detect: `git grep -nE '(animation|transition)\s*:' -- '*.css' '*.astro' '*.svelte' '*.vue' '*.tsx'` ; for each hit, pass if the line sits in a no-preference block, uses `var(--<token>)` and `git grep -n 'prefers-reduced-motion: reduce' -- <token file>` shows the token zeroed, or animates only `opacity`/`color`/`background-color`; otherwise fail. Also `git grep -nE 'transition:\s*[^;]*[0-9.]+m?s' | grep -v 'var(--'` lists literal timings that bypass the token layer.
13. **A11Y-ANN-13 (MUST).** JavaScript-driven animation (Web Animations, `requestAnimationFrame`, scroll-linked effects, `scrollIntoView({behavior:'smooth'})`) reads `matchMedia('(prefers-reduced-motion: reduce)')` at start and listens for `change`. Rationale: Primer. Verify: `git grep -nE "\.animate\(|requestAnimationFrame|behavior: ?'smooth'"` and for each file `git grep -n 'prefers-reduced-motion' <file>` must hit.
14. **A11Y-ANN-14 (MUST).** `document.startViewTransition` is feature-detected, falls back to running the update directly, and is skipped (or its `::view-transition-*` animation set to `none`) under `reduce`. Cross-document `@view-transition` needs the same `reduce` rule. Never leave a view transition as the only way a change is communicated. Rationale: Chrome guide; MDN live-region warning. Verify: `git grep -nE 'startViewTransition|@view-transition'` and require `typeof document.startViewTransition` plus a reduced-motion or token check in the same file; fail a bare `document.startViewTransition(` call.
15. **A11Y-ANN-15 (MUST).** No auto-starting movement, blinking, scrolling or auto-updating content beyond 5 seconds beside other content without a visible pause, stop or hide control; no `animation-iteration-count: infinite` on decorative elements; autoplay video is opt-in. Rationale: WCAG 2.2.2 A. Verify: `git grep -nE 'infinite|autoplay|setInterval\(' -- <ui sources>`; every hit is either a lone loading indicator, removed under `reduce`, or sits beside a control whose name matches `/pause|stop|hide/i`.
16. **A11Y-ANN-16 (MUST NOT).** Do not write a flashing effect: nothing alternates luminance or saturated red more than three times in any second. Where an effect cannot be proven under the threshold, use a static badge or a slow low-contrast fade. Rationale: WCAG 2.3.1 A (seizure). Verify: `git grep -nE '@keyframes' -A12` and flag keyframes that toggle `opacity`, `background(-color)`, `filter` or `color` between near-opposite values with `animation-duration` under 0.34s repeating; reading heuristic: period of one cycle under one third of a second repeating = fail. Pass: 2s fade once, forwards.
17. **A11Y-ANN-17 (SHOULD).** Do not use animation to carry information; if unavoidable, add a text alternative next to it. Rationale: Primer. Verify: reading heuristic: remove the animation, the meaning remains in text.
18. **A11Y-ANN-18 (SHOULD).** Run the announce harness (DOM contract + virtual reader log) on every component that owns an announcement; label spoken output as simulated, and require a real screen reader pass for new announcement patterns before release. Rationale: the tool's README says it augments real testing; this run confirms it does not model the iOS double-speak bug. Verify: harness exits 0; PR text records the real-reader pass or states it was not done.
19. **A11Y-ANN-19 (CONSIDER).** Record, per animation, its purpose, duration and whether it can be paused, as a code comment or design note. Rationale: Primer's documentation request. Verify: grep each `@keyframes` for an adjacent comment.
20. **A11Y-ANN-20 (CONSIDER).** Avoid `transition: all`; list the properties transitioned. Rationale: agent practice; measured 0 uses in the fleet, so the rule costs nothing to keep. No external source cited. Verify: `git grep -nE 'transition:\s*all|transition-property:\s*all'` returns nothing.

## Dated facts

| Fact | Value | Source | Date stated | Type |
|---|---|---|---|---|
| 4.1.3 Status Messages | Level AA; techniques ARIA19, ARIA22, ARIA23, ARIA25, ARIA27; failure for `alert` or `assertive` on unimportant content | [Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | updated 2026-10-04 | authority (W3C) |
| ARIA22 | container must have `role="status"` before the message; role implies polite and atomic, add `aria-atomic="true"` | [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) | 2026-01-12 | authority |
| ARIA19 | empty `role="alert"` container on load; `aria-atomic="true"` for iOS VoiceOver repeats | [ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19) | 2026-04-27 | authority |
| 2.3.3 Animation from Interactions | Level AAA; techniques C39, SCR40 | [Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | updated 2025-09-16 | authority |
| 2.2.2 Pause, Stop, Hide | Level A; 5 seconds | [Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | no date shown in the fetched text | authority |
| 2.3.1 Three Flashes | Level A; 3 per second; 10% luminance, darker state below 0.80; 0.006 steradians; 341x256 px is an estimate on 1024x768 | [Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) | no date shown in the fetched text | authority |
| 2.5.8 Target Size (Minimum) | Level AA; 24x24 CSS px (cross-reference only) | [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | no date shown | authority |
| `prefers-reduced-motion` | Baseline widely available since January 2020 | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | modified 2026-06-10 | reference documentation |
| Live regions guidance, iOS double speak | alert + assertive double-speaks in VoiceOver iOS | [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) | modified 2026-09-11 | reference documentation |
| View Transition API | same-document and cross-document; live-region oddity warning | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | modified 2026-09-28 | reference documentation |
| View transition support | same-document Chrome 111; Chrome/Edge 125, Firefox 144, Safari 18 for types and classes | [Chrome](https://developer.chrome.com/docs/web-platform/view-transitions/same-document) | page updated 2024-09-25 (support badges may be newer) | vendor documentation |
| Primer motion | 5 s stop for minor animation; 3 flashes per second; 341x256 px | [Primer](https://primer.style/accessibility/design-guidance/motion-and-animation/) | no date | design-system authority (GitHub) |
| Carbon motion tokens | 70, 110, 150, 240, 400, 700 ms | [Carbon](https://carbondesignsystem.com/elements/motion/overview/) | updated 2026-08-12 | design-system authority (IBM) |
| `@guidepup/virtual-screen-reader` | 0.33.0, modified 2026-09-20 | `npm view @guidepup/virtual-screen-reader version time.modified` | 2026-09-20 | package registry (tool authors) |

## What an agent must not decide alone

- Whether an animation is "essential" to a function, which exempts it from reduced-motion and pause rules. Ask.
- Whether a design should contain a flashing, strobing or high-contrast pulsing effect at all. Default is no; a brand request for it goes to a human.
- Which WCAG level the product claims (2.3.3 is AAA). Ask before declaring or dropping a conformance claim.
- Whether to ship a user-facing in-app "reduce motion" setting beyond the OS preference (a product decision with a settings-surface cost).
- Whether a brand motion spec (durations, easing, hero animation) overrides the reduced-motion rule. The rule wins unless the owner decides otherwise.
- Wording of announcements (UX-TEXT); announcement politeness for a new, ambiguous event type (status or alert) where the severity is a product call, such as "sync failed in the background".
- Whether a real screen-reader pass is required before a release; that is a quality-bar decision.

## AI-agent angle

| Typical agent mistake | Smallest mechanical check |
|---|---|
| Adds `role="alert"` (or `aria-live="assertive"`) to every toast, including "Copied" | A11Y-ANN-3 grep, read the message text |
| Creates the live region and writes the text in the same function; works visually, silent in readers | A11Y-ANN-2 grep; harness "injected with text" probe logs `[]` |
| Stacks `role="alert"` and `aria-live="assertive"` "for compatibility" | A11Y-ANN-4 grep (old advice; MDN now documents the iOS double speak) |
| Swaps a button's text/label to "Unmute" and also sets `aria-pressed` | A11Y-ANN-9 handler grep |
| Uses `aria-pressed` on a control whose visible state is shown only by colour or glyph, with a stale `aria-pressed` after async failure | harness: toggle, assert `aria-pressed` string flips and reverts on failure |
| Treats the visible "copy" to "copied" swap as an announcement | A11Y-ANN-11: stable name, status region receives text |
| Writes `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }` and thinks done, which also kills essential loaders and focus feedback | review: reduce should replace, not delete (MDN, Chrome); allow-list the loader |
| Adds a hero `animation: ... infinite` with no control | A11Y-ANN-15 grep for `infinite` |
| Calls `document.startViewTransition` without feature detection, or with no reduce path | A11Y-ANN-14 grep |
| Counts `prefers-reduced-motion` blocks to claim compliance while durations come from tokens (or reverse) | Detect line in A11Y-ANN-12 reads the token layer |
| Trusts the virtual reader's log as proof of what users hear | label UNVERIFIED; A11Y-ANN-18 |
| Uses `setTimeout` clear and sets same text for re-announce in the same tick | A11Y-ANN-6 harness test |

## Contested / evolving

- **One region per page versus component-local regions.** The commission asks for one region per page. The fleet theme owns 14 live-region lines across at least seven components. Sources (ARIA22, MDN) require only that each region pre-exist; none mandates a single region. This dive recommends one page announcer for transient feedback and allows local regions for persistent summaries; the opposing view is that many regions are harmless if each is present at load. As of 2026-11-27 no source resolves the count.
- **Visible-state toggle naming.** The fleet's "Light mode (click for Dark mode)" pattern (state plus next action in the name) satisfies the APG rename branch; APG's preferred branch keeps the name fixed and uses `aria-pressed`. Both are APG-compatible; mixing them is the error. Not a settled preference.
- **Reduce means replace versus remove.** MDN and Chrome say replace with gentler motion; Primer says wrap in `no-preference`, which removes. Both pass C39 when movement is gone. Trend: opacity-only replacements.
- **Reduced-motion severity.** WCAG places 2.3.3 at AAA; Primer lists it among its referenced criteria. Carbon's motion page (updated 2026-08-12) does not mention `prefers-reduced-motion` at all and contradicts its own micro-interaction duration range. This program's MUST is a project decision, not a WCAG AA requirement.
- **Virtual reader fidelity.** The README claims augmentation only; the observed `polite:` and `assertive:` logging is undocumented there and could change between releases (0.33.0 recorded). Real-reader behaviour for `hidden` toggling, `aria-atomic` and repeated identical text differs across NVDA, JAWS and VoiceOver and was not tested.

## Cross-territory (named, not pursued)

- UX-AI conversation mechanics: streaming-output announcement (`aria-live` with token streams, `role="log"`) belongs there.
- UX-TEXT: the announced strings ("Copied install command").
- Checklist for dark-mode contrast, touch targets (2.5.8 AA, 24x24 px), focus rings: other a11y dives.

## Harness source

File `announce.test.mjs` (also `vitest.config.mjs` with `environment: 'jsdom'`, `include: ['announce.test.mjs']`). Output `spoken-log.json`. To commit under the skill's `checks/` folder, replace the absolute `W` path with a repo-relative one.

```js
// Harness: real built markup from the ocx theme, real cycle-button.mjs click handler, Guidepup virtual screen reader.
import { readFileSync } from 'node:fs';
import { describe, it, expect, afterEach } from 'vitest';
import { pathToFileURL } from 'node:url';
import { virtual } from '@guidepup/virtual-screen-reader';

const W = '/home/mherwig/dev/ocx-sh/website';
const T = `${W}/packages/theme/src`;
const grab = (html, re) => html.match(re)?.[0] ?? '';
const landing = readFileSync(`${W}/site/dist/index.html`, 'utf8');
const copyPage = readFileSync(`${W}/examples/starlight/dist/stories/copy-button/default/index.html`, 'utf8');
const toggle = grab(landing, /<button data-ocx-theme[\s\S]*?<\/button>/);
const copy = grab(copyPage, /<div class="ocx-copy [\s\S]*?<\/button><\/div>/);
const cmdbarStatus = grab(landing, /<span class="ocx-cmdbar__status"[^>]*><\/span>/);
const cmdbarBtn = grab(landing, /<div[^>]*data-zag-root="clipboard"[\s\S]*?<\/button><\/div>/);
const log = [];
const speak = async (container) => {
  await virtual.start({ container });
  let n = 0; while ((await virtual.lastSpokenPhrase()) !== 'end of document' && n++ < 80) await virtual.next();
  const l = await virtual.spokenPhraseLog(); await virtual.stop(); return l;
};
afterEach(() => { document.body.innerHTML = ''; });

describe('markup was extracted', () => {
  it('found all three', () => { expect(toggle).toBeTruthy(); expect(copy).toBeTruthy(); expect(cmdbarStatus).toBeTruthy(); });
});

describe('theme switch (real cycle-button.mjs onClick)', () => {
  it('DOM contract: exposes state via aria-pressed or changes name?', async () => {
    document.body.innerHTML = `<main>${toggle}</main>`;
    const { onClick } = await import('./cycle-button.copy.mjs');
    const b = document.querySelector('[data-ocx-theme]');
    const before = { name: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), role: b.getAttribute('role') };
    onClick({ target: b });
    const after = { name: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') };
    log.push({ case: 'theme-switch', before, after });
    // record, do not assert the verdict: a rename on click AND no aria-pressed is the finding
    expect(before.name).not.toBe(after.name);
    expect(after.pressed).toBeNull();
    expect(document.querySelector('[role=status],[aria-live]')).toBeNull(); // nothing announces the change
  });
  it('spoken log (UNVERIFIED fidelity)', async () => {
    document.body.innerHTML = `<main>${toggle}</main>`;
    log.push({ case: 'theme-switch spoken', spoken: await speak(document.body) });
  });
});

describe('copy button markup', () => {
  it('DOM contract: stable name, indicator swap by hidden, no live region of its own', async () => {
    document.body.innerHTML = `<main>${copy}</main>`;
    const b = document.querySelector('button');
    const done = document.querySelector('.ocx-copy__done');
    expect(b.getAttribute('aria-label')).toBe('Copy install command');
    expect(done.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('[aria-live],[role=status],[role=alert]')).toBeNull();
    const idle = await speak(document.body);
    document.body.innerHTML = `<main>${copy}</main>`;
    document.querySelector('.ocx-copy__done').removeAttribute('hidden'); // what zag does on success
    document.querySelector('[data-part=indicator]:not(.ocx-copy__done)').setAttribute('hidden', '');
    log.push({ case: 'copy', idle, afterCopy: await speak(document.body) });
  });
});

describe('command bar status region', () => {
  it('DOM contract: region present before update, role=status, text set then cleared', async () => {
    document.body.innerHTML = `<main><div class="ocx-cmdbar">${cmdbarBtn}${cmdbarStatus}</div></main>`;
    const s = document.querySelector('.ocx-cmdbar__status');
    expect(s.getAttribute('role')).toBe('status');
    expect(s.textContent).toBe('');
    expect(s.hasAttribute('aria-live')).toBe(false);   // implicit polite only
    expect(s.hasAttribute('aria-atomic')).toBe(false); // implicit atomic only (status role)
    s.textContent = 'Copied install command'; // command-bar.mjs:128-131 `say()`
    await new Promise((r) => setTimeout(r, 10));
    const spoken = await speak(document.body);
    log.push({ case: 'cmdbar', spoken, doubled: spoken.filter((p) => /Copied install command/.test(p)).length });
  });
});

describe('live-region change while the virtual reader is running', () => {
  it('does the tool log a dynamic live-region update at all?', async () => {
    document.body.innerHTML = `<main><button>x</button>${cmdbarStatus}</main>`;
    await virtual.start({ container: document.body });
    const n0 = (await virtual.spokenPhraseLog()).length;
    document.querySelector('.ocx-cmdbar__status').textContent = 'Copied install command';
    await new Promise((r) => setTimeout(r, 50));
    const l = await virtual.spokenPhraseLog();
    await virtual.stop();
    log.push({ case: 'dynamic-update-logged', before: n0, after: l.length, log: l });
    expect(l).toContain('polite: Copied install command'); // the tool logs live-region mutations as 'polite: <text>'
  });
});

describe('tool fidelity probes (what the tool can and cannot show)', () => {
  const probe = async (name, html, mutate) => {
    document.body.innerHTML = `<main>${html}</main>`;
    await virtual.start({ container: document.body });
    const n0 = (await virtual.spokenPhraseLog()).length;
    mutate(document.querySelector('main'));
    await new Promise((r) => setTimeout(r, 50));
    const l = (await virtual.spokenPhraseLog()).slice(n0);
    await virtual.stop();
    log.push({ case: `probe:${name}`, announced: l });
    return l;
  };
  it('status text change', async () => expect(await probe('status', '<p role=status></p>', (m) => (m.querySelector('p').textContent = 'Saved'))).toEqual(['polite: Saved']));
  it('alert', async () => log.push({ alert: await probe('alert', '<p role=alert></p>', (m) => (m.querySelector('p').textContent = 'Failed')) }));
  it('alert + aria-live=assertive (VoiceOver iOS double-speaks per MDN)', async () => log.push({ both: await probe('alert+assertive', '<p role=alert aria-live=assertive></p>', (m) => (m.querySelector('p').textContent = 'Failed')) }));
  it('region injected WITH text', async () => log.push({ injected: await probe('injected-status', '', (m) => m.insertAdjacentHTML('beforeend', '<p role=status>Saved</p>')) }));
  it('hidden toggled to visible', async () => log.push({ hidden: await probe('hidden-attr', '<p role=status hidden>Saved</p>', (m) => m.querySelector('p').removeAttribute('hidden')) }));
  it('aria-live=off', async () => log.push({ off: await probe('off', '<p aria-live=off></p>', (m) => (m.querySelector('p').textContent = 'x')) }));
  it('aria-live polite, aria-atomic true, partial change', async () => log.push({ atomic: await probe('atomic', '<p aria-live=polite aria-atomic=true>Count: <span>1</span></p>', (m) => (m.querySelector('span').textContent = '2')) }));
});

it('writes log', async () => {
  const { writeFileSync } = await import('node:fs');
  writeFileSync('spoken-log.json', JSON.stringify(log, null, 1));
});
```

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 2.2 Understanding 4.1.3 | 2026-10-04 | role mapping, failure on `alert` overuse (primary) |
| https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22 | Technique role=status | 2026-01-12 | region-before-message test (primary) |
| https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19 | Technique role=alert for errors | 2026-04-27 | iOS atomic note (primary) |
| https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | Understanding 2.3.3 | 2025-09-16 | AAA level, C39 (primary) |
| https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | Understanding 2.2.2 | not shown | 5-second rule (primary) |
| https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html | Understanding 2.3.1 | not shown | flash thresholds (primary) |
| https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | Understanding 2.5.8 | not shown | cross-reference only (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/switch/ | APG switch pattern | copyright 2026 | stable label, `aria-checked` (primary) |
| https://www.w3.org/WAI/ARIA/apg/patterns/button/ | APG button (toggle) pattern | copyright 2026 | `aria-pressed` and label rule (primary) |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions | MDN live regions | 2026-09-11 | timing, atomic, iOS double speak |
| https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | MDN prefers-reduced-motion | 2026-06-10 | replace not remove |
| https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API | MDN View Transition API | 2026-09-28 | same vs cross-document, live-region warning |
| https://developer.chrome.com/docs/web-platform/view-transitions/same-document | Chrome view-transitions guide | 2024-09-25 | reduced-motion opt-out, support versions (vendor) |
| https://primer.style/accessibility/design-guidance/motion-and-animation/ | Primer motion and animation | undated | concrete limits and docs request |
| https://carbondesignsystem.com/elements/motion/overview/ | Carbon motion | 2026-08-12 | duration tokens; no reduced-motion rule |
| https://github.com/guidepup/virtual-screen-reader | Virtual screen reader README | undated; version not on page | augment-not-replace statement, API |
| https://registry.npmjs.org/@guidepup/virtual-screen-reader (via `npm view`) | package metadata | 2026-09-20 | version 0.33.0 |

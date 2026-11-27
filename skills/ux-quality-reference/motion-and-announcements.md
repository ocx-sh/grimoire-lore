---
title: Live Regions, Motion and Flashing
summary: The UX-A11Y-22 to 27 rows, covering status and alert announcements through a live region that exists before its text, repeated messages, pause controls on moving content, the three-flash limit, and reduced motion
---

# Live Regions, Motion and Flashing

Owns how a result is announced and how movement is gated: the live-region roles and their timing, what `role="alert"` is for, repeated text, auto-playing and infinite motion, flashing, and `prefers-reduced-motion`. Rows bind components, stylesheets and scripts that write status text or animate. Neighbours: which states a view has (loading, empty, error) and the focus moves around forms are `UX-STATE`. The wording of a message is `UX-TEXT`. Recorded-terminal player autoplay, controls and reduced motion are `DOC-EX-15`, `DOC-EX-16` and `DOC-EX-17` in `docs-quality`. Platform video motion over 5 seconds is `CH-VID-13` in `terminal-demo`, which cites UX-A11Y-25 for pages. Token layers and the `reduce` block mechanics are `css-theming`. A focused control hidden by a scroll-driven fade is UX-A11Y-36 (focus and colour depth file).

Contents: [Dates and Versions](#dates-and-versions) · [Setup](#setup) · [Announcements](#announcements) · [Motion and Flashing](#motion-and-flashing) · [Decisions That Stand](#decisions-that-stand) · [Ask the Owner First](#ask-the-owner-first) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27 unless a row says otherwise.

- **WCAG 2.2** Recommendation of 2024-12-12. [4.1.3 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) 2026-10-04, [2.2.2 pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) (undated), [2.3.1 three flashes](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) updated 2025-09-17, [2.3.3 animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) 2025-09-16 (AAA, technique C39). Refresh every 6 months with WCAG.
- **ARIA22** ([technique](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), updated 2026-01-12) and **ARIA19** ([technique](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19), updated 2026-04-27). Both quotes in UX-A11Y-22 were checked in the raw HTML on 2026-11-27, and the phrase "announced reliably" is on neither page. Neither page says whether a region created together with its text is announced. Refresh every 12 months: `curl -sSL <url>`, strip tags, and grep for "before the status message" and "present in the DOM". If either test text changes, re-word the rationale of UX-A11Y-22.
- **MDN** [live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) 2026-09-11 (the iOS VoiceOver double-speech note) and [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) modified 2026-06-10 (it shows a replacement, not removal). The [VS Code webview guide](https://code.visualstudio.com/api/extension-guides/webview) (2026-11-25) documents the `vscode-reduce-motion` body class. Refresh every 6 months.
- **Flash definition.** 2.3.1 defines a flash as "a pair of opposing changes in relative luminance", and content passes with no more than three general flashes and no more than three red flashes in any one-second period. The 0.34 s threshold of UX-A11Y-26 is derived, not sourced. Re-read the definition with WCAG. If it is no longer "a pair of opposing changes", redo the derivation.
- **Simulated readers.** A run through `@guidepup/virtual-screen-reader` 0.33.0 (npm 2026-09-20) logs `polite:` and `assertive:` lines by undocumented behaviour. Label any such output UNVERIFIED against real readers. It does not model the iOS double speech. No real screen reader and no virtual reader was run against these rows, so UX-A11Y-22 rests on the "exists before the message" tests of ARIA22 and ARIA19, not on a claim about speech.
- **Measured counts** were taken 2026-11-27 in one editor webview and one desktop-app shell: 3 live elements, 1 status created in the render that fills it, 1 alert created with its content, and 5 error states with no live region.

## Setup

```sh
motion() { git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.css' ':(glob)**/*.scss' ':(glob)**/*.astro' ':(glob)**/*.svelte' ':(glob)**/*.vue' ':(glob)**/*.html' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.ts' ':(glob)**/*.js' ':(glob)**/*.mjs' ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/*.d.ts'; }
motion | awk 'END { if (NR == 0) print "canary: nothing listed" }'
```

Every `grep` block matches one line at a time. A tag split across lines escapes it, so read the template of each handler too.

## Announcements

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-22 | Announce a discrete result by writing text into a container that holds `role="status"`, or `role="alert"` for errors (UX-A11Y-23), and that is present and empty in the initial markup. Results include copied, saved, N results, done loading and failed to load. Never create the region and fill it in one step: when script must create it, set the text in a later task. Never move focus only to announce. Do not announce expand, collapse, tab selection or a dialog that takes focus, because their ARIA state already does that. | 4.1.3 (AA). ARIA22 test 1: "Check that the container destined to hold the status message has a role attribute with a value of status before the status message occurs." ARIA19: "The error container must be present in the DOM on page load for the error message to be spoken by most screen readers." | See block UX-A11Y-22: the checks and the fail patterns. Then the DOM contract in the snippet below it. Results from a virtual reader are UNVERIFIED. | MUST |
| UX-A11Y-23 | Use `role="alert"` only for errors and time-critical messages, and `role="status"` for success and progress. Never put `aria-live="assertive"` on success or on content that is not time-sensitive. When focus moves to an error summary, the summary needs no `role="alert"` as well (the focus move itself is `UX-STATE`). | The 4.1.3 page lists `alert` or `assertive` on unimportant content as a failure. | See block UX-A11Y-23: read each hit against the message its handler writes. A message of "saved", "copied", "done" or a count is a fail. | MUST |
| UX-A11Y-24 | To announce identical text twice, clear the region and set the text again in a later task. Never suppress the repeat. | A region whose text does not change is not re-announced. One shipped announcer documents this gap in its own source comment. | Unverified: reading heuristic. Each handler that may repeat a message assigns `''` to the region, then sets the text in a later task (`setTimeout`, `requestAnimationFrame` or `await`). Simulated test: set the text, clear it, wait one task, set the same text, and expect two announcements. | SHOULD |

```sh
# UX-A11Y-22: every handler that changes visible status text must find a container in its component or the page announcer
motion | xargs -0 -r grep -H -n -E -e 'role="(status|alert)"' -e 'aria-live' --
# UX-A11Y-22: error elements with no alert role on the same line; the pass is an empty list, or each hit inside a wrapper
# that renders in every state of the component and starts empty. Read the template of each hit
motion | xargs -0 -r grep -H -n -E -e 'class="[^"]*error[^"]*"' -- | grep -v -F -e 'role="alert"'
# UX-A11Y-22: fail patterns, a region built and filled in one step. Any hit is a finding
motion | xargs -0 -r grep -H -n -E -e 'insertAdjacentHTML\(.*role="(status|alert)"' --
# UX-A11Y-23: read each hit against the message it announces
motion | xargs -0 -r grep -H -n -E -e 'role="alert"' -e 'aria-live="assertive"' --
```

```html
<!-- wrong: the region is created with its text -->
<script>box.insertAdjacentHTML('beforeend', '<p role="status">Saved</p>')</script>
<!-- right: the region is in the initial markup and empty; script writes the text later -->
<p role="status" id="announcer"></p>
<script>announcer.textContent = 'Saved'</script>
```

```js
// UX-A11Y-24: announce the same text twice by clearing, then writing in a later task
announcer.textContent = '';
setTimeout(() => { announcer.textContent = text; }, 0);
```

Status containers: for each `role="status"` hit, read the template and confirm the element renders in every state of the component, not only on one branch. A `createElement` followed by `role` and `textContent` in one block is the same fail pattern as the `insertAdjacentHTML` grep, and no grep sees it. The DOM contract holds without a virtual reader. Run it in a browser test, before and after the action:

```js
// UX-A11Y-22 DOM contract. Before the action: every live region exists and is empty. After it: the one you expect holds the text.
[...document.querySelectorAll('[role=status], [role=alert], [aria-live]')].map((r) => ({ el: r.outerHTML.slice(0, 60), text: r.textContent }))
```

The check passes only when the region is in the list before the action with empty `text`, and holds the message after it. A region that appears only after the action fails UX-A11Y-22.

## Motion and Flashing

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-25 | Give movement, blinking, scrolling or auto-updating content that starts by itself and runs more than 5 seconds beside other content a visible pause, stop or hide control. Never put `animation-iteration-count: infinite` on a decorative element. Start video only on the user's action. | 2.2.2 (Level A). A lone loading indicator is exempt. `DOC-EX-15` already covers recording players. | See block UX-A11Y-25: each hit must be a lone loader, removed under `reduce`, or beside a control whose name matches the pattern pause, stop or hide. | MUST |
| UX-A11Y-26 | Never write an effect that alternates luminance or saturated red more than three times in any one second. When you cannot show an effect to be under the threshold, use a static badge or a single slow fade. | 2.3.1 (Level A), seizure risk. The normative limit is 0.006 steradians, and 341 by 256 px on a 1024 by 768 screen is only an estimate. A cycle from A to B and back is one flash, so more than three per second means a duration under 1/3 s (0.333 s), rounded up to 0.34 s for margin. With `animation-direction: alternate` one iteration is half a flash, so the true limit is under 1/6 s, and 0.34 s errs toward flagging. | Heuristic, see block UX-A11Y-26. It cannot see a duration set through `var(--...)`, a Web Animations call, a `setInterval` that toggles a class, or video. Its silence does not prove a pass. | MUST NOT |
| UX-A11Y-27 | Gate every motion that moves, scales, rotates, pans or parallax-scrolls, by one of three mechanisms: `@media (prefers-reduced-motion: no-preference)`, an opacity-only replacement under `reduce`, or a duration custom property that a `reduce` block sets to `0s`. Never bypass an existing token layer with a literal duration. In script, read `matchMedia('(prefers-reduced-motion: reduce)')` and listen for `change`. This covers Web Animations, `requestAnimationFrame` and smooth `scrollIntoView`. Feature-detect `document.startViewTransition` and skip it under `reduce`. In a VS Code webview also honour the `vscode-reduce-motion` body class. Do not write a blanket `* { animation: none !important }`: reduce means replace, and loaders and focus feedback must survive. | 2.3.3 is AAA (technique C39), so the rule is SHOULD. It rises to MUST where the codebase already has a reduced-motion token layer, because a literal duration there breaks a contract the codebase enforces (**house policy**). MDN shows a replacement, not removal. | See block UX-A11Y-27: three searches. Each hit passes if it sits in a `no-preference` block, uses a `var(--...duration...)` that a `reduce` block zeroes, or animates only `opacity`, `color` or `background-color`. | SHOULD (MUST where a reduced-motion token layer exists) |

```sh
# UX-A11Y-25: each hit is a lone loader, removed under reduce, or beside a pause, stop or hide control
motion | xargs -0 -r grep -H -n -E -e 'infinite' -e 'autoplay' -e 'setInterval\(' --
# UX-A11Y-26 (heuristic): repeating animations; read the keyframes (about 12 lines) and the duration of each hit.
# Flag a swap of opacity, background, filter or color between near-opposite values with a duration under 0.34s
motion | xargs -0 -r grep -H -n -E -e 'animation[^;]*infinite' -e 'animation-iteration-count:[[:space:]]*(infinite|[4-9]|[1-9][0-9])' --
# UX-A11Y-26: sites the heuristic cannot read; each is a place to read by hand
motion | xargs -0 -r grep -H -n -E -e 'animation-duration:[[:space:]]*var\(' -e '\.animate\(' -e 'setInterval\(' --
# UX-A11Y-27: every animation and transition declaration; apply the pass test per hit
motion | xargs -0 -r grep -H -n -E -e '(animation|transition)[[:space:]]*:' --
# UX-A11Y-27: literal timings that bypass a token layer; any line printed is a finding where a layer exists
motion | xargs -0 -r grep -H -n -E -e 'transition:[[:space:]]*[^;]*[0-9.]+m?s' -- | grep -v -F -e 'var(--'
# UX-A11Y-27: a file that animates in script must also test the media query; any file printed is a finding
motion | xargs -0 -r grep -l -E -e '\.animate\(' -e 'requestAnimationFrame' -e "behavior: ?'smooth'" -e 'startViewTransition' -- \
  | tr '\n' '\0' | xargs -0 -r grep -L -F -e 'prefers-reduced-motion' --
# UX-A11Y-27: a file that calls startViewTransition must also feature-detect it; any file printed is a finding
motion | xargs -0 -r grep -l -F -e 'startViewTransition(' -- | tr '\n' '\0' | xargs -0 -r grep -L -F -e 'typeof document.startViewTransition' --
```

```css
/* UX-A11Y-27: a duration token that one reduce block zeroes, and no literal duration beside it */
:root { --dur: 200ms; }
@media (prefers-reduced-motion: reduce) { :root { --dur: 0s; } }
.panel { transition: transform var(--dur) ease; }
```

No script backs this file, because each row rests on a search the author reads. The two `grep -L` pipelines list the files that lack the test, so judge them by their output and never by their exit status (`grep -L` through `xargs` inverts on busybox).

## Decisions That Stand

- **No count rule for live regions.** Component-local regions are fine. Each region must exist at load, and transient toasts go through one pre-existing announcer. ARIA22 and MDN require only that a region exist before the message, and no source mandates a count. A "more than 3 per page" threshold had no source and was dropped.
- **Reduced motion is SHOULD, rising to MUST only where a token layer exists.** 2.3.3 is AAA, so the general severity matches `DOC-EX-17`. The MUST case is a regression against a contract the codebase already enforces, which a search checks at no cost.
- **A source or harness check of speech is not a speech test.** The rows rest on the DOM contract (the region exists and is empty first), because no real reader was run.

## Ask the Owner First

- **Whether reduced motion becomes MUST everywhere.** It would deviate from the severity `docs-quality` sets for player reduced motion (`DOC-EX-17`).
- **Using the "essential" exception** of 2.2.2 or 2.3.3. Record it in the pull request and ask.
- **Whether a real screen-reader pass (NVDA with Firefox, VoiceOver with Safari on macOS and iOS) is required** before release of a new announcement pattern. Four patterns have only simulated output: a region revealed by removing `hidden`, repeated identical text, `aria-atomic`, and `role="alert"` injected with content.
- **A vendored or shared player and its control bar.** A fix there diverges from upstream.

## What Agents Get Wrong Here

1. **Creating the live region and writing the text in the same function**, or rendering the region only on the branch that has a message. 5 error states had no region at all (UX-A11Y-22).
2. **Putting `role="alert"` on every toast**, including "Copied" (UX-A11Y-23).
3. **Writing identical text into an unchanged region** and assuming it is announced again (UX-A11Y-24).
4. **Calling `startViewTransition` or a JavaScript animation with no reduced-motion path**, or "fixing" motion with a blanket `animation: none !important` that also kills loaders (UX-A11Y-27).
5. **Putting `infinite` on a decorative element** with no pause control (UX-A11Y-25).
6. **Treating a virtual-reader log as proof of speech.** It is simulated output, and it does not model the iOS double speech (UX-A11Y-22).
7. **Stacking `role="alert"` and `aria-live="assertive"`** (UX-A11Y-10 row 10i, UX-A11Y-23).
8. **Moving focus to announce a result.** A live region announces without moving focus (UX-A11Y-22).
9. **Trusting the keyframe grep as a flash test.** It misses variable durations, script toggles and video (UX-A11Y-26).

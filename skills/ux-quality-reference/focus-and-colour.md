---
title: Focus, Contrast, Colour and Target Size
summary: The UX-A11Y-12 to 21 rows plus UX-A11Y-36 and 37, covering focus indicators that must exist and stay visible, sticky bars, WCAG 2 contrast ratios, colour-only cues, target size, and the lead generators that check them
---

# Focus, Contrast, Colour and Target Size

Owns whether a keyboard user can see where focus is, whether text and controls reach their contrast ratios, whether a state has a cue besides colour, and whether a pointer target is big enough. Rows bind stylesheets, components and built pages. Neighbours: the cascade, tokens, dark mode and the forced-colors mechanism that deliver a ring or a colour pair are `CSS-A11Y-01` in `css-theming`, and this file owns only the outcome. The element choice and names are `UX-A11Y-01` to `UX-A11Y-11` (widgets depth file). Reduced motion is `UX-A11Y-27` (motion and announcements depth file). The editor-webview colour and focus-colour clause is `UX-A11Y-35` (editor extensions depth file). Which gate runs these checks, and what a Lighthouse score proves, is `UX-VERIFY`. Four checks here are lead generators, not gates: `focus_outline.py`, `focus_diff.mjs`, `colour_only.mjs` and `focus_opacity.mjs` print rows to triage, and a row is not a verdict until it is read.

Contents: [Dates and Versions](#dates-and-versions) · [Setup](#setup) · [Focus Indicators](#focus-indicators) · [Contrast and Colour](#contrast-and-colour) · [Target Size](#target-size) · [Visibility of the Focused Control](#visibility-of-the-focused-control) · [Gaps on Record](#gaps-on-record) · [Ask the Owner First](#ask-the-owner-first) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27 unless a row says otherwise.

- **WCAG 2.2** Recommendation of 2024-12-12. Understanding pages and their dates: [1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) 2025-09-16, [1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) and [2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) 2026-10-04, [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) 2026-06-15, [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) 2026-11-02, [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) 2026-09-06. Refresh every 6 months: fetch each page and diff levels, thresholds and listed techniques and failures.
- **No W3C text names an invisible focused control.** Neither 2.4.7 (and its failures F55 and F78) nor 2.4.11 mentions opacity, `visibility` or a revealed container. Calling it a 2.4.7 failure is this catalog's reading, and 2.4.11 is a weaker second reading. Re-check when either page changes, or when a Working Group interpretation or a failure technique appears.
- **WebAIM Million 2026** (updated 2026-03-30, annual): low-contrast text on 83.9% of home pages ([source](https://webaim.org/projects/million/)). Re-rank the rows if the order changes.
- **WCAG 3 contrast** has no selected algorithm in the 2026-04-08 draft, and the earliest plausible final date is about 2030 ([Roselli, April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)). The `apca-w3` library calls itself beta (0.1.9, 2022). Refresh every 12 months.
- **Lightness counts as a cue** at 3:1 under 1.4.1 (page updated 2025-09-16). Re-read the "significant difference in lightness" paragraph with WCAG.
- **Scripts:** Python 3.11 standard library for `focus_outline.py` and `wcag_contrast.py`. Node 20 or later and `playwright` 1.57.0 for the three `.mjs` checks, which print the Playwright and engine versions they ran with. The three `.mjs` fixtures ran on 2026-11-27 in Chromium 159.0.8154.6. The `focus_opacity.mjs` fixtures also ran in Firefox 144.0.2 and WebKit 26.0 (the Playwright WPE build, not Safari) under the script's previous wrapper, with the same verdicts. Re-run the fixtures at each Chromium, Firefox, WebKit or Playwright major.
- **Measured precision.** `focus_outline.py` in its first shape (no nesting, no `.scss`, no `all: unset`, no mouse-focus skip) gave 30 FAIL rows on two public design-system repositories, 11 real (precision 37%), and found 11 of 52 real removals. 14 of its 19 false positives were the `:focus:not(:focus-visible)` mouse-focus idiom, which this version skips. A prototype with those fixes and PostCSS nesting measured 17 FAIL rows, 14 real (82%, tuned on the same repositories, so an upper bound). This version is the merge of the two and has no measurement of its own. Repositories: primer/react and primer/css at 2026-11-25, radix-ui/themes at 2026-04-11, radix-ui/website at 2026-10-07.

## Setup

```sh
CHECKS=.claude/skills/ux-quality-reference/checks
styles() { git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.css' ':(glob)**/*.scss' ':(glob)**/*.astro' ':(glob)**/*.svelte' ':(glob)**/*.vue' ':(glob)**/*.html' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(exclude,glob)**/node_modules/**'; }
styles | awk 'END { if (NR == 0) print "canary: nothing listed" }'
```

`SRC` is the source directory, `URL` a served build, `BUILD` the build directory. Serve a build read-only with `python3 -m http.server`. The browser scripts need `npm i -D --save-exact playwright@1.57.0` and `npx playwright install chromium`, and read `ENGINE` (`chromium`, `firefox` or `webkit`) and an optional `BROWSER` executable.

## Focus Indicators

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-12 | Never remove a focus indicator without drawing a replacement. Write focus styles on `:focus-visible`, not bare `:focus`. The default recipe is `outline: 2px solid <token>; outline-offset: 2px`. A replacement may move to an ancestor through `:has(<child>:focus-visible)` or `:focus-within`. It must be an outline or a border change, never a `box-shadow` alone. `all: unset` and `all: initial` on a focusable element remove its outline too, so they need the same replacement. When a wrapper in another file draws the ring, write `/* focus-ok: ring drawn by <selector> in <file> */` directly before the removing rule (**pinned** marker, adopters may rename it once). | 2.4.7 (AA), failure F78. The 2px default comes from 2.4.13 (AAA), so it is a recipe and not the floor. Forced colours suppress `box-shadow` (`CSS-A11Y-01`). On a public design-system site 37 of 88 `all: unset` rules sit on controls whose only focus style is a `box-shadow`. | `focus_outline.py`, see block UX-A11Y-12. Triage every FAIL row: fix it, or add a `focus-ok:` comment whose reason names the drawing selector and file, or says why focus shows another way. The rule passes when the script exits 0. | MUST |
| UX-A11Y-13 | Give the focus indicator 3:1 against the colour it sits on, in every theme and on every surface. For a ring drawn inside the element (negative `outline-offset`), that surface is the element's own background. Every element with `tabindex="0"`, including scrollable `pre` blocks and embedded players, must show a visible change when focused. | 1.4.11 (AA). An author-modified ring loses the user-agent exemption. | Tab through each page at 1280 and 390 px with `focus_diff.mjs`, see block UX-A11Y-13. A ZERO or LOW row is a lead: resolve it with the two reads below. | MUST |
| UX-A11Y-14 | Give every `position: sticky` or `position: fixed` header, footer or banner a `scroll-padding-top` or `scroll-padding-bottom` on the scroller, set to at least the bar's height. | 2.4.11 (AA) fails when a focused element is entirely hidden. C43 is the sufficient technique and F110 the failure. Unmeasured: no sticky bar was tested against `scroll-padding`. | See block UX-A11Y-14: each hit needs a `scroll-padding` hit. Then Tab to the last link under the bar: it must be at least partly visible. | MUST |

```sh
# UX-A11Y-12: exit 1 prints FAIL rows to triage; exit 0 is the pass. SRC is the source directory
python3 -I "$CHECKS"/focus_outline.py "$SRC"
python3 -I "$CHECKS"/focus_outline.py --self-test
# UX-A11Y-13: a ZERO or LOW row needs a read; exit 0 is a clean walk. URL is a served page
PAD=40 ENGINE=chromium node "$CHECKS"/focus_diff.mjs "$URL" light 1280
PAD=40 ENGINE=chromium node "$CHECKS"/focus_diff.mjs "$URL" dark 390 'button'
# UX-A11Y-14: list sticky and fixed bars, then the scroll-padding rules that answer them
styles | xargs -0 -r grep -H -n -E -e 'position:[[:space:]]*(sticky|fixed)' --
styles | xargs -0 -r grep -H -n -F -e 'scroll-padding' --
```

`focus_diff.mjs` prints ZERO for a stop that changed 0 pixels, and LOW for a drawn ring under 3.0 against the surface it sits on (the element's own background when the offset is negative). Run `fixtures/a11y/focus_diff.html` first: D1 prints ok, D2 prints ZERO, D3 prints LOW, and the exit is 1.

The recipe, the shape that fails, and the fix for UX-A11Y-36:

```css
/* right: ring on :focus-visible, drawn outside the box, mouse focus left alone */
.btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
/* wrong: a reset with a shadow-only ring, which forced colours drop */
.btn { all: unset; }
.btn:focus-visible { box-shadow: 0 0 0 2px var(--ring); }
/* UX-A11Y-36 fix: a scroll-revealed container shows its focused descendant */
.stage__finale:focus-within { opacity: 1; transform: none; }
```

**Reading a 0-pixel stop (UX-A11Y-13).** A stop that changes 0 pixels is a lead. Resolve it with two reads. (1) Read the computed style of the element and of its ring owner: `outline-style: none`, no `box-shadow` and no border change mean a missing ring, and that fails this rule. (2) Read the effective opacity and the box of the element at the moment focus arrives, with `focus_opacity.mjs` (UX-A11Y-36 and UX-A11Y-37). A box of zero width or height is a third cause of a 0-pixel diff. A stop that passes both reads and still shows 0 pixels is a harness artefact. Pass `clip` in page coordinates (rect plus scroll), never viewport coordinates, which photograph the wrong region, and `focus_diff.mjs` already does. Scope limit of UX-A11Y-12: an `outline: none` with no focus pseudo-class and no `all` reset is not seen, and the browser pass of UX-A11Y-13 catches it. Pass example: a `:focus-visible` rule with `outline: none` whose ring a `:has()` rule draws. Fail example: a lone `button:focus { outline: none }`. UX-A11Y-35 asks a VS Code webview to draw the ring from `--vscode-focusBorder`.

## Contrast and Colour

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-15 | Reach 4.5:1 for normal text and 3:1 for large text (18pt, or 14pt bold) against its real background. Check every theme and every surface the text sits on (page, card, code block, panel). Blend alpha text and `color-mix(... N%, transparent)` text onto its ground before computing. Compare unrounded: 4.499 fails. Placeholder, hint, caption and syntax colours are in scope. Disabled controls are exempt. | 1.4.3 (AA). Low contrast is on 83.9% of home pages (WebAIM). Text at 45% alpha measured 3.91:1. | `wcag_contrast.py 4.5` over a pair list, see block UX-A11Y-15. A text pair missing from the list is a finding. | MUST |
| UX-A11Y-16 | When a boundary or indicator is the only thing that identifies a control, give it 3:1 against its ground. Examples: an input's border, a checkbox mark, a radio dot, the glyph of an icon-only button. A border on a control that carries a text label is exempt. | 1.4.11 (AA). The label already identifies the control, so its border is decoration. | `wcag_contrast.py 3` over the boundary tokens on each surface, see block UX-A11Y-15. `#767676` on white passes (4.542) and `#aaa` fails (2.323). | MUST |
| UX-A11Y-17 | Treat an APCA Lc value, a WCAG 3 draft value and a 44 by 44 px target as advisory extras. The gates are the WCAG 2 ratios (UX-A11Y-15, UX-A11Y-16) and the 24 by 24 px hit box (UX-A11Y-20). Print an Lc value next to the WCAG 2 ratio when it helps. Size primary and frequent controls to 44 by 44 under `@media (pointer: coarse)` when it helps. Never report any of these as a pass over a failing WCAG 2 ratio, and never call 44 px an AA requirement. | Verdict: WCAG 3 has no selected algorithm and `apca-w3` is beta. 2.5.5 (44 px) is AAA. UX-A11Y-21 is retired into this row. | See block UX-A11Y-17: hits are allowed only in advisory output. Reading heuristic, unverified: scan the agent's prose for "44" next to "AA". | CONSIDER |
| UX-A11Y-18 | Declare `color-scheme` on any page that sets its own colours, matching the scheme it paints. | Without it the user-agent canvas, scrollbars and form controls render for a light canvas under dark author colours. Measured: a hint colour of 7.46:1 on white was 2.51:1 on a dark canvas. | See block UX-A11Y-18: the root rule must hit. Where it is absent, compute ratios on both canvases. | SHOULD |
| UX-A11Y-19 | Pair every colour-coded state with a second, non-colour cue: a text word, a differently shaped icon, a pattern, a position, or `aria-invalid` plus a visible message. This covers error, success, warning, selected, required, planned and chart series. Links inside running text keep an underline. The alternative is 3:1 against the surrounding text plus a non-colour cue on hover and focus (G183). | 1.4.1 (Level A). The Understanding page counts a lightness difference as a cue when the relative luminance of the two colours gives 3:1 or more. | `colour_only.mjs`, axe `link-in-text-block`, the grep and the in-page snippet in block UX-A11Y-19. | MUST |

UX-A11Y-21 is retired and its number is not reused.

```sh
# UX-A11Y-15: pairs.txt lines are "<foreground> <background> <label>"; a FAIL line or exit 1 is a finding
python3 -I "$CHECKS"/wcag_contrast.py 4.5 < pairs.txt
python3 -I "$CHECKS"/wcag_contrast.py 3 < large-text-pairs.txt
# UX-A11Y-16: boundary tokens on each surface
python3 -I "$CHECKS"/wcag_contrast.py 3 < borders.txt
# UX-A11Y-17: a hit is allowed only in advisory output
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.py' ':(glob)**/*.mjs' ':(glob)**/*.js' | xargs -0 -r grep -H -n -i -F -e apca --
# UX-A11Y-18: the root rule must hit
styles | xargs -0 -r grep -H -n -F -e 'color-scheme' --
# UX-A11Y-19: exit 1 is a FAIL row, exit 2 is a page that failed to load and proves nothing
WAIT=load ENGINE=chromium node "$CHECKS"/colour_only.mjs "$URL"
# UX-A11Y-19: prose-link underline removals; read each hit for a replacement cue
styles | xargs -0 -r grep -H -n -E -e 'text-decoration:[[:space:]]*none' --
```

```js
// UX-A11Y-19 form errors, run on the built page: the count must be 0
[...document.querySelectorAll('[aria-invalid="true"]')].filter((el) => {
  const ids = (el.getAttribute('aria-describedby') || el.getAttribute('aria-errormessage') || '').split(/\s+/);
  return !ids.some((id) => id && document.getElementById(id)?.textContent.trim());
}).length
```

`pairs.txt` holds every text token against every surface token in every theme, with the flattened background hex (the script reads the background as opaque and blends a foreground alpha onto it). `colour_only.mjs` pairs each element in a state with a peer of the same tag and classes without it, and prints FAIL when the pair differs in colour and in nothing else. INFO means no visible difference on the element itself: read the parent, because a cue drawn on the parent (a tint and a bar on the `li`) is not seen, and the INFO text is wrong there. It does not see states set after load, or a state set by a `data-*` attribute on a wrapper. Run it with the fixture before relying on it: `fixtures/a11y/colour_only.html` must print exactly two FAIL lines per scheme (the tint-only row and the hue-only link) and exit 1.

## Target Size

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-20 | Give every pointer target a rendered hit box of at least 24 by 24 CSS px, or a recorded exception: spacing, inline, an equivalent control, user-agent default, or essential. Measure the rendered box, not the token or the glyph. Enlarge the hit area with padding, a wrapping `<label>` or a pseudo-element. | 2.5.8 (AA). Under the spacing exception a 24 px circle centred on each undersized target must not intersect another target or circle. Measured: stacked sidebar links of 236 by 23.6 px with a gap of 0. | Run the snippet in block UX-A11Y-20 at 1280 and 390 px. A printed entry with a clash and no recorded exception fails. | MUST |

```js
// UX-A11Y-20, run on the built page at 1280 and 390 px. Prints targets under 24 px whose spacing circle clashes.
const sel = 'a[href], button, input:not([type=hidden]), select, summary, [tabindex], label';
const els = [...document.querySelectorAll(sel)].map((e) => ({ e, r: e.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0);
const inline = (e) => e.tagName === 'A' && getComputedStyle(e).display === 'inline' && !!e.closest('p, li, dd, td, blockquote');
els.filter(({ r }) => r.width < 24 || r.height < 24).map(({ e, r }) => {
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let clash = null;
  for (const { e: o, r: q } of els) {
    if (o === e || o.contains(e) || e.contains(o)) continue;
    const small = q.width < 24 || q.height < 24;
    const d = small ? Math.hypot(cx - (q.left + q.width / 2), cy - (q.top + q.height / 2)) - 24
      : Math.hypot(Math.max(q.left - cx, 0, cx - q.right), Math.max(q.top - cy, 0, cy - q.bottom)) - 12;
    if (d < -0.01) { clash = o.tagName.toLowerCase() + ' ' + d.toFixed(2); break; }
  }
  return { el: e.tagName.toLowerCase() + ' ' + (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 24), w: +r.width.toFixed(1), h: +r.height.toFixed(1), inline: inline(e), clash };
}).filter((x) => x.clash && !x.inline)
```

Two undersized neighbours need a centre distance of at least 24. An undersized target needs a gap of at least 12 minus half its size to a full-size neighbour. Name each remaining exception in the pull request. A checkbox label row inside a shared component was measured at 16 to 22.75 px tall in a harness copy, not on a built page, so treat a shared control's height as unmeasured until you run the snippet.

## Visibility of the Focused Control

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-36 | Make every control that can take keyboard focus visible whenever it has focus. A container that a scroll position, a hover or an animation fades, translates or reveals must never leave a focused descendant invisible. Fix it one of three ways, each restoring full opacity: add `:focus-within { opacity: 1; transform: none; }` to the container, make the visible state the default and let motion only enhance it, or make the hidden controls `inert` until revealed. Never fix it by writing the scroll variable on `focusin`, because the scroll code overwrites it. A partial dim that leaves the control and its ring plainly visible is not a failure of this rule (a mock-up at 0.8, logos at 0.85). | 2.4.7 (AA) requires "a mode of operation where the keyboard focus indicator is visible", and a ring on a control at opacity 0 cannot show where focus is. This is the catalog's reading of 2.4.7, not W3C text. Measured: a finale trigger took focus at effective opacity 0 at default motion, in both themes, at 1280 and 390 px. The `:focus-within` fix gave 1 and survived a scroll away and back, and the `focusin` fix reverted to 0 on scroll back. | `focus_opacity.mjs` plus the crop review, see block UX-A11Y-36. The FAIL rows are leads. The pass condition is the triaged end state, not the exit code. | MUST |
| UX-A11Y-37 | Give every focusable element a box of non-zero width and height, or a visible proxy that shows its focus. Never leave a focusable `a`, `button`, `input` or `div[tabindex]` at zero width or zero height, such as an empty hidden anchor or a hidden checkbox whose custom box draws no ring. Take such an element out of the Tab order with `hidden`, `inert`, or `tabindex="-1"` plus `aria-hidden`, or give its proxy a ring through `:has(input:focus-visible)` or a sibling selector. | 2.4.7 (AA): a focus indicator that cannot be seen is not visible. This is the catalog's reading. Measured on ten public pages: the only invisible focused controls in any of three engines were zero-size boxes (an empty anchor, and nine hidden file-tree inputs). Fixing the name does not draw the missing ring, and fixing the box does not name the control, so UX-A11Y-03, UX-A11Y-04 and this rule all stand. Unmeasured on any first-party site. | `focus_opacity.mjs`, see block UX-A11Y-36: no LEAD row, or every LEAD row passes the same crop triage. | SHOULD |

```sh
# UX-A11Y-36 and UX-A11Y-37: candidate containers first. Each hit needs a check for focusable descendants
styles | xargs -0 -r grep -H -n -E -e 'opacity:[[:space:]]*(0[[:space:]]*(;|!|$)|var\()' -e 'scroll-timeline' -e 'animation-timeline' --
# Lead generator: run at default motion, then again with MOTION=reduce. SHOTS holds one crop per FAIL, LEAD, PROXY and INFO row
mkdir -p "$SHOTS" && ENGINE=chromium SHOTS="$SHOTS" node "$CHECKS"/focus_opacity.mjs "$URL"
ENGINE=chromium MOTION=reduce SHOTS="$SHOTS" node "$CHECKS"/focus_opacity.mjs "$URL"
```

**What the rows mean.** By default the script Tabs through every stop in light and dark, at 1280 and 390 px. After each Tab it waits until the opacity product over the element and its ancestors agrees across two reads 150 ms apart, for at most 2 s, then prints one row per stop that is not a pass.

| Row | Meaning |
|---|---|
| FAIL | The product is below 0.5, or `visibility: hidden` or `content-visibility: hidden` is on the chain. A lead for UX-A11Y-36. |
| LEAD | The box is zero-width or zero-height. A lead for UX-A11Y-37. |
| PROXY | A radio or checkbox that would be FAIL or LEAD, but one of its labels has a box and a product of at least 0.99. No action. |
| INFO | A product from 0.5 to 0.99. Open the crop only when it shows no ring, and that look is a UX-A11Y-13 matter. |

Exit 1 means at least one FAIL or LEAD row. Exit 2 means a page failed to load, and that run proves nothing. **FAIL and LEAD rows are leads. The pass condition is the crop review, a reading heuristic that no command decides.** Open the crop that `SHOTS` saved for every FAIL and LEAD row at the moment of focus. Then fix the stop, or record it as visible. A record is one line in the pull request: the row, the crop path and the reason. The number of those lines equals the script's `rows needing triage` count. Do not read the opacity alone: controls at 0.8 and 0.85 were plainly visible, and the first version of this check (a 0.99 threshold) flagged 13 or 14 visible controls per engine on ten public pages and caught none of the invisible ones.

Run the fixtures before relying on the script (`ENGINE=chromium THEMES=light WIDTHS=1280` on each file). `opacity.html` must print FAIL for O2 and O10, LEAD for O6, PROXY for O7 and O9 and INFO for O8, and exit 1. `scroll.html` must print one FAIL (S2), and `NOSETTLE=1` must add a false FAIL for S4. The LEAD check has a measured false positive: a logo anchor with a 0 by 0 box and a drawn ring is a visible LEAD, which is why UX-A11Y-37 is SHOULD.

## Gaps on Record

- **No oracle exists for UX-A11Y-12.** No Tab-and-diff pass ran on a built design-system Storybook. Three false-positive kinds remain in every selector-based version: a wrapper in another file draws the ring and only the markup links the two.
- **UX-A11Y-19 tests the state element only.** A cue drawn on the parent is reported as INFO.
- **UX-A11Y-36 and UX-A11Y-37 were tuned on the pages they were measured on.** The ten-page round ran at 1280 px, light, default motion only: not at 390 px, not in dark, not with `MOTION=reduce`. WebKit crashed on one page in every attempt. No real device, no Safari, no real assistive technology. The round had no positive for the opacity-0 class that UX-A11Y-36 was written for. A scripted demo that holds a low plateau still prints one false FAIL (0.2), and `clip-path` and off-screen positions are not read.

## Ask the Owner First

- **Brand colours or a brand focus ring that fail 3:1 or 4.5:1.** Propose a passing alternative and ask.
- **A change to a shared theme or design-system package** (a `min-height` on a shared checkbox label, a `:focus-within` fix on a shared stage). It alters every consumer. The same holds for a vendored player: a fix there diverges from upstream.
- **Using an "essential" or "equivalent control" exception** for target size. Record it and ask.
- **A dark-only site.** If a site documents that decision, do not add OS theme support without asking.
- **The conformance target.** It decides whether the AAA advice in UX-A11Y-17 and the 2px recipe in UX-A11Y-12 stays at CONSIDER or SHOULD.

## What Agents Get Wrong Here

1. **Checking contrast on the page background only.** It misses cards, code blocks, alpha text and the ring on the element's own background (UX-A11Y-13, UX-A11Y-15).
2. **Sizing a target by its glyph or token**, not by its rendered box (UX-A11Y-20).
3. **Copying `outline: none` from a reset**, or putting the ring on `:focus` and deleting it because mouse clicks show it (UX-A11Y-12).
4. **Drawing the ring as a `box-shadow` after `all: unset`.** Forced colours drop it (UX-A11Y-12).
5. **Letting a planned or disabled item differ from its siblings only by colour or a missing icon** (UX-A11Y-19).
6. **Fading a container in by scroll position or hover and leaving its controls in the Tab order.** The ring is drawn, but the control is at opacity 0 when focus arrives, and reduced motion hides the defect (UX-A11Y-36).
7. **Treating an opacity reading as the verdict.** A threshold near 1 flags every design-time dim, and no opacity value sees a zero-size box (UX-A11Y-36, UX-A11Y-37).
8. **Accepting an APCA pass over a WCAG 2 fail**, or calling 44 px an AA requirement (UX-A11Y-17).
9. **Reading a green axe run or a Lighthouse 100 as proof.** Neither sees a ring, a colour-only cue or a hidden stop. `UX-VERIFY` owns what a score proves.
10. **Fixing UX-A11Y-36 by writing the scroll variable on `focusin`.** The scroll code overwrites it when the user scrolls back.

---
title: css-theming delta - shipping engines and CSS specs, 2026-08-30 to 2026-11-27
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 27
---

# css-theming: engines and CSS specs delta

This is a delta against the corpus measured on Chromium 151.0.7922.34. Nothing below
re-measures anything. Every fact is read from a release note, spec draft, web-features
page or tracker page fetched on 2026-11-27. Where a fetch tool summarised a page, the
summary is marked as such and confidence is stated.

## Summary

- Current stable Chromium is 158. Chromium 151 is seven milestones old. The pin can stand as
  dated evidence, with a one-line re-measure note.
- No engine release in the window changed `:host-context()`, `@scope` semantics,
  forced-colors suppression, SVG fill/stroke under forced colors, or `@property`
  validation, as far as the release notes read show. Safari 27.0 fixed one `@scope`
  regression for slotted elements.
- `light-dark()` reached Baseline Widely Available on 2026-11-13. The corpus projection is
  confirmed.
- `@scope` is Baseline Newly available since 2026-03-24 (Safari 26.4), not "around March
  2026 after Firefox 146" in a looser sense. Dates are now exact.
- No cheap cross-engine check was newly created in the window, but one already exists:
  Playwright can run the existing probe against Firefox and WebKit.
- One spec movement needs attention: the `@property` editor's draft now says all three
  descriptors are optional. No shipped engine behaviour change was found.

## Findings per claim at risk

### 1. Chromium pin (rules/css-theming.md line 56 and Not Studied)

Status: **unchanged text, add a note**.

- Stable channel is Chromium 158. Latest stable build read: 158.0.8127.88, published
  2026-11-23. First 158 stable build: 158.0.8127.36 on 2026-11-17. Milestone 158 schedule
  lists stable_date 2026-11-17. Sources: Chromium Dash
  [releases](https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux&num=3),
  [schedule](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=158).
- Milestone 159 is at stable_cut (due 2026-12). Milestone 156 is in extended support.
  [fetch_milestones](https://chromiumdash.appspot.com/fetch_milestones).
- Chrome 152 to 158 release notes were read from chromestatus
  ([152](https://chromestatus.com/release-notes/152),
  [153](https://chromestatus.com/release-notes/153),
  [154](https://chromestatus.com/release-notes/154),
  [155](https://chromestatus.com/release-notes/155),
  [156](https://chromestatus.com/release-notes/156),
  [157](https://chromestatus.com/release-notes/157),
  [158](https://chromestatus.com/release-notes/158)). None mentions `:host-context`,
  `@scope`, forced-colors, `forced-color-adjust`, `@property`, `light-dark` or media
  query `var()`. CSS items are unrelated (scroll-axis-lock, `alpha()`, `random()`,
  `text-decoration-inset`, anchor-valid, `::highlight(*)`, media-element pseudo-classes).
- Limit: a release note lists new features, not every behaviour fix. Absence from notes is
  not proof of identical behaviour. That is why the note below says "not re-measured".

Candidate wording change (one clause): "Chromium 151.0.7922.34 was current when measured
(2026-08); stable is Chromium 158 as of 2026-11-27; no release note for 152-158 mentions
the measured features; not re-measured."

### 2. `:host-context()` (web-components.md line 91)

Status: **unchanged**.

- CSSWG: the editor's draft css-shadow-1 (dated 2026-04-28) still defines
  `:host-context( <compound-selector> )` in section 3.2.3 and has no removal note. The
  corpus said the CSSWG removal "has not reached the shipping engine". The fetched draft
  does not show a removal either, so that sentence should read "the removal has not
  reached the editor's draft either as of 2026-11-27". Source:
  [css-shadow-1](https://drafts.csswg.org/css-shadow-1/). Confidence: medium, the
  fetch was a summarised read of one page, and an earlier CSSWG removal resolution would
  live in the issue tracker, which the tool could not search (the issue search page
  returned no `:host-context` title match).
- web-features: not Baseline. Chrome 54, Edge 79. Firefox and Safari not supported.
  Labelled "discouraged". [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/host-context/).
- Firefox bug 1082060: RESOLVED WONTFIX, last change 2024-03-01, so no movement in the
  window. [Bugzilla REST](https://bugzilla.mozilla.org/rest/bug/1082060).
- Firefox 156 to 161 release notes and Safari 27.0 notes contain no `:host-context`
  item.
- WebKit "anti-pattern" stance: not re-fetched (the WebKit blog index returned 502). Could
  not determine whether it changed. Safari 27.0 has no support item, so nothing suggests it did.

### 3. `@scope` (CSS-CAS-05; Not Studied bullet)

Status: **unchanged for mechanics, dates made exact**.

- Baseline Newly available since 2026-03-24. Chrome 143 (2025-12-02), Edge 143, Firefox
  146 (2025-12-09), Safari and iOS 26.4 (2026-03-24). Expected Widely Available
  2028-09-24. [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/scope/).
- Safari 27.0, released 2026-09-14: "Fixed a regression where `@scope` styles did not apply
  to slotted elements in web components" (bug 171383788). This is a fix, not a change of
  proximity or donut-hole semantics.
  [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md).
  The same line appears in the [WebKit WWDC26 post](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27/)
  dated 2026-06-08.
- Firefox 157 added `@supports at-rule(@scope)`. This is a detection hook, not a semantic
  change. [Firefox 157](https://www.firefox.com/en-US/firefox/157.0/releasenotes/).
- All three engines now ship `@scope`. The single-engine caveat is still true for the
  measurements, but "likeliest to differ" is now testable in every engine (see
  decision 4). The corpus wording "after Firefox 146" is consistent: Firefox 146 shipped
  it, Safari 26.4 completed Baseline.

### 4. Forced colors (CSS-A11Y-01)

Status: **unchanged**.

- css-color-adjust-1 is a Candidate Recommendation Snapshot dated 2026-10-30. It says
  `box-shadow` and `text-shadow` compute to `none`, and its Issues Index still says forced
  colors mode needs further work on which properties are overridden, `background-image`
  and SVG `fill`/`stroke` handling. So the spec itself does not settle the two details the
  rule asserts as measured. [css-color-adjust-1](https://drafts.csswg.org/css-color-adjust-1/).
  Confidence: medium (summarised read).
- No Chrome 152-158, Firefox 156-161 or Safari 27.0 note read mentions forced-colors or
  `forced-color-adjust`. Safari 27.0 notes were read in two chunks; the first 100000
  characters had no forced-colors item and the tail was only unrelated sections.
- Baseline: `forced-colors` Widely Available since 2025-03-12.
  [web-features](https://web-platform-dx.github.io/web-features-explorer/features/forced-colors/).
  This feature page covers the media query, not the property list.
- The rule text stays accurate as "measured in Chromium 151". The spec marks the
  `background-image` and SVG points as open, which supports keeping the single-engine caveat.

### 5. `light-dark()` (CSS-TOK-03)

Status: **changed (projection confirmed, now fact)**.

- Old text: projected Baseline Widely Available on 2026-11-13.
- New fact: Widely Available since 2026-11-13. First support Chrome 123 (2024-03-19),
  Edge 123, Firefox 120 (2023-11-21), Safari 17.5 (2024-05-13).
  [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/light-dark/).
  The explorer page states the date; the low-date arithmetic (30 months after Safari 17.5)
  is the fetch tool's inference and matches.
- Upstream change date: 2026-11-13.
- Safari 27.0 added `<image>` values in `light-dark()` (bug 172290840). That is a
  separate capability from colour values and does not affect the rule.
  [Safari 27 notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md).
- css-color-5 editor's draft is dated 2026-11-14; its section 7 "Reacting to the used
  color-scheme" still ties `light-dark()` to the used scheme. The tool did not read the
  section body, so "follows the cascaded `color-scheme`" stays measured-in-Chromium, spec
  consistent in title only. [css-color-5](https://drafts.csswg.org/css-color-5/).
- Safari 27.0 also fixed several iframe `color-scheme` and `prefers-color-scheme`
  repaint/propagation bugs. These touch embedding (surface-meta-and-embeds), not the
  cascaded-property claim.

### 6. `@property` (CSS-VAR-01)

Status: **spec text possibly changing; engine behaviour not shown to change. Could not determine whether to alter the rule.**

- The Houdini editor's draft dated 2026-11-27 says, per the fetch tool's quoted reading,
  "all of the descriptors are optional" and "When omitted, it matches the behavior of an
  unregistered custom property"; defaults are `syntax: "*"`, `inherits: true`,
  `initial-value` = guaranteed-invalid. It also says an invalid `initial-value` descriptor
  is "invalid and ignored" without invalidating the rule.
  [css-properties-values-api-1](https://drafts.css-houdini.org/css-properties-values-api-1/).
  Two fetch passes returned the same result. Confidence: medium; I did not see the raw
  text.
- This matches the open CSSWG issue
  [#13211](https://lists.w3.org/Archives/Public/public-css-archive/2025Dec/0263.html)
  "`@property` descriptors should be optional whenever possible" (Dec 2025; March 2026
  follow-up favouring unregistered-property defaults). A search summary found no recorded
  resolution and said MDN and Servo still treat `inherits` as required. So spec draft and
  shipping engines may now disagree. I did not find a shipping engine release that
  implements optional descriptors. No chromestatus or Firefox note in the window lists one.
- Corpus claim "must declare syntax, inherits and initial-value or the whole rule is
  discarded": true for the engine measured (Chromium 151) and for MDN as indexed. It
  is at risk of becoming wrong at the spec level. Baseline for `@property` could not be
  checked: the web-features page URL I tried returned 404.
- Media query `var()` (CSS-TOK-02): css-conditional-5 editor's draft dated 2026-11-10
  defines `media()` in `@when` with no `var()` option, and `env()` in `@supports` takes
  an `<ident>` only. [css-conditional-5](https://drafts.csswg.org/css-conditional-5/).
  Only the first 100000 of 293285 characters were read, so this supports, but does not
  prove, "a media condition cannot read a var()". The open question stays open as
  engine-unmeasured. Firefox 161 added nested substitution functions inside `var()`,
  `attr()` and `env()` (primary arguments only). That is about var() arguments, not
  media conditions. [Firefox 161](https://www.firefox.com/en-US/firefox/161.0/releasenotes/).

## Decisions requested by the commission

1. **Current stable Chromium.** 158 (158.0.8127.88, 2026-11-23). The 151 pin stands as
   dated evidence. Add the one-clause re-measure note above. No sign that anything measured
   moved.
2. **Engine changes to the measured features.**
   - `:host-context()`: none.
   - `@scope`: none semantically. Safari 27.0 slotted-element regression fix.
   - Forced-colors suppression and SVG: none found.
   - `@property` validation: no engine change found; spec draft proposes optional
     descriptors (CSSWG #13211). Re-measure candidate.
3. **`light-dark()` Widely Available.** Yes, 2026-11-13.
4. **Cheap Firefox/WebKit check.** Not newly created, but all three engines now ship
   `@scope` (Safari since 26.4), so the existing Playwright probe (r2/engine-forced-colors,
   Playwright 1.62.1 per the corpus) can be run with its Firefox and WebKit projects after
   `npx playwright install firefox webkit`. I did not fetch Playwright's current browser
   versions, so the pinned engine versions are not verified here. Cost: install plus
   one run of the existing harness. Adding one `@media (min-width: var(--x))` case and one
   `@property` empty-rule case to the same run settles both open questions.

## Normative guidance candidates

1. Rule: when a measured claim names an engine version, name the stable version at refresh
   time beside it. Rationale: readers cannot tell staleness otherwise. Verification: grep
   `Chromium 151` in rules and skills; each hit sits near a dated clause.
2. Rule: CSS-TOK-03 may say `light-dark()` is Baseline Widely Available (since 2026-11-13)
   and drop "projected". Rationale: fact now. Verification: grep `light-dark` in
   rules.md for "projected".
3. Rule: CSS-CAS-05 may state `@scope` ships in Chrome 143, Firefox 146, Safari 26.4
   (Baseline Newly available 2026-03-24) while keeping "measured in Chromium only".
   Rationale: removes the vague "around March 2026". Verification: grep `Baseline` near
   `@scope` in rules.md.
4. Rule: CSS-VAR-01 should add "the Houdini draft is moving toward optional descriptors
   (CSSWG #13211); declare all three anyway". Rationale: declaring all three is correct
   under both the old and the proposed spec. Verification: grep `@property` rules for
   `syntax`, `inherits` and `initial-value` together.
5. Rule: web-components.md should reword "the CSSWG removal has not reached the shipping
   engine" to match what the draft shows (still defined in css-shadow-1 as of 2026-04-28).
   Rationale: the old sentence implied a pending removal that the draft does not show.
   Verification: re-read css-shadow-1 section 3.2.3.

## AI-agent angle

- An agent trained before 2026 will call `light-dark()` "newly available" and avoid it.
  Check: grep generated CSS for a fallback pair added only for `light-dark`.
- An agent may assume `@scope` is Chromium-only and add a Firefox fallback. Check:
  `@supports at-rule(@scope)` is available in Firefox 157+, but Baseline makes it
  unnecessary for current engines.
- An agent may treat `@property` descriptors as optional because the new draft says so.
  Check: any `@property` block missing `syntax`, `inherits` or `initial-value`.

## Contested / evolving

- `@property` descriptor optionality: open CSSWG #13211, draft already edited, engines
  unchanged as far as read. Watch.
- Forced colors: css-color-adjust-1 issues index still lists `background-image` and SVG
  handling as unsettled. Engines may diverge.
- `:host-context()`: Chromium keeps it, others do not; draft keeps it. Stable.

## Could not determine

- WebKit's current "anti-pattern" wording (WebKit blog returned 502).
- Whether CSSWG recorded a `:host-context()` removal resolution (issue search not
  readable).
- web-features Baseline status of `@property` (URL returned 404).
- Chrome 152-158 full behaviour-fix lists (release notes list features only).
- Safari 27.0 notes: the first 100000 characters and the final chunk were read, the full
  text was not verified line by line by me. Items were extracted by the fetch tool.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://chromiumdash.appspot.com/fetch_milestones | Chromium milestone table | 2026-11-27 | stable is 158 |
| https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux&num=3 | stable builds | 2026-11 | 158.0.8127.88 |
| https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=158 | schedule | 2026-11 | stable 2026-11-17 |
| https://chromestatus.com/release-notes/152 to /158 (7 pages) | Chrome release notes | 2026-08 to 2026-11 | no measured-feature changes |
| https://www.firefox.com/en-US/firefox/156.0 to 161.0/releasenotes/ (6 pages) | Firefox release notes | 2026-09 to 2026-11 | no measured-feature changes |
| https://whattrainisitnow.com/api/firefox/releases/ | Firefox release dates | 2026-11 | 156 to 161 dates |
| https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md | Safari 27.0 notes | 2026-09-14 | @scope fix, light-dark image |
| https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27/ | WebKit Safari 27 post | 2026-06-08 | @scope fix |
| https://web.dev/blog/web-platform-10-2026 | web platform roundup | 2026-10 | Baseline changes, none relevant |
| https://web-platform-dx.github.io/web-features-explorer/features/light-dark/ | Baseline | 2026-11-13 | Widely Available |
| https://web-platform-dx.github.io/web-features-explorer/features/scope/ | Baseline | 2026-03-24 | Newly available |
| https://web-platform-dx.github.io/web-features-explorer/features/host-context/ | Baseline | 2026-11 | not Baseline, discouraged |
| https://web-platform-dx.github.io/web-features-explorer/features/forced-colors/ | Baseline | 2025-03-12 | Widely Available |
| https://bugzilla.mozilla.org/rest/bug/1082060 | Firefox host-context bug | 2024-03-01 | WONTFIX |
| https://drafts.csswg.org/css-shadow-1/ | CSS Shadow ED | 2026-04-28 | host-context still defined |
| https://drafts.csswg.org/css-color-adjust-1/ | CR snapshot | 2026-10-30 | forced colors open issues |
| https://drafts.csswg.org/css-color-5/ | ED | 2026-11-14 | light-dark |
| https://drafts.csswg.org/css-conditional-5/ | ED | 2026-11-10 | no var() in media() |
| https://drafts.css-houdini.org/css-properties-values-api-1/ | ED | 2026-11-27 | descriptors optional |
| https://lists.w3.org/Archives/Public/public-css-archive/2025Dec/0263.html | CSSWG #13211 | 2025-12 | optional descriptors proposal |

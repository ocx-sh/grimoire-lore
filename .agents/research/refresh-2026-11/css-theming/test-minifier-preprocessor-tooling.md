---
title: css-theming delta - DOM emulators, browser driver, minifiers, preprocessors
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 16
---

# css-theming delta: test and build tooling, 2026-08-30 to 2026-11-27

This is a delta update of the baseline research (pins: happy-dom 20.12.0, jsdom 30.0.1, Playwright 1.62.1, esbuild 0.28.2, cssnano 9.0.1, lightningcss 1.33.0, Parcel 2.16.4, dart-sass 1.103.1, less 4.9.0). Nothing outside the window is re-derived. Where a claim could be checked cheaply, I ran it against the new versions in a scratch directory (not in the repo).

Scope: the four decisions in the commission. Not covered: Tailwind, framework compilers, or any claim outside the css-theming gate and Preprocessors section.

## Contents

- [Summary](#summary)
- [Decisions](#decisions)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [What I could not determine](#what-i-could-not-determine)
- [Sources](#sources)

## Summary

- CHANGED: jsdom 31.0.0 (2026-11-05) added cascade-layer support to its new integrated style engine. The baseline sentence "jsdom 30.0.1 ... applies none of it" is true only for jsdom up to 30.1.3. The absolute ban "no DOM emulator may ever test a layered cascade" is no longer literally true for jsdom 31 and needs a rewrite.
- UNCHANGED: happy-dom has no `@layer` support through 21.0.4 (2026-10-20). Both failure modes reproduce on 21.0.4 and on 20.12.0.
- UNCHANGED: Playwright `newContext({forcedColors:'active'})` still exists and is documented through 1.65.1 (2026-11-13). `page.setContent()` is still documented as `document.write()`.
- UNCHANGED: esbuild 0.28.2, lightningcss 1.33.0 and Parcel 2.16.4 have no release in the window. Their `@layer` behavior reproduces as written.
- UNCHANGED in behavior, CHANGED in version: cssnano went 9.0.1 to 10.0.0 (2026-11-26). It still keeps a bare `@layer` statement. 10.0.0 rejects the string preset name `'default'`.
- SWC: no CSS minifier added to `@swc/core`. But the baseline sentence "swc has no CSS minifier at all" is too strong: the standalone `@swc/css` package (last release 2023-07-24) has `minifySync` and keeps the statement.
- Sass and Less: dart-sass 1.108.2 and less 4.9.1. No release changed `@use`/`@forward` order, `@import` order or nesting. No Dart Sass 2.0 shipped. The `@import` deprecation is still active.

## Decisions

### D1. Did either emulator add `@layer` cascade support?

- happy-dom: NO. Latest is 21.0.4. Verdict "unchanged" for the happy-dom sentence; bump the pin from 20.12.0 to 21.0.4.
- jsdom: YES. Latest is 31.0.1. Introduced in 31.0.0 on 2026-11-05. This forces a rewrite of the absolute ban.

Old text (rules/css-theming.md and gate.md):

> "jsdom 30.0.1 parses `@layer` into correct `CSSLayerStatementRule` and `CSSLayerBlockRule` objects and its computed-style engine then ignores every declaration inside any layer."

New fact: jsdom 31.0.0 replaced its CSS parsing, selector matching and computed-style code with a new integrated implementation whose release note lists cascade layers. jsdom 31.0.1 (2026-11-13) keeps it. Probes in section 1.1 show layered declarations applied with correct layer order.

Exact sentences to amend:

1. Heading and lead of gate.md "No DOM emulator, for a layered cascade, ever". Proposed replacement lead: "No DOM emulator tests a layered cascade, with one narrow exception. happy-dom (checked to 21.0.4) and jsdom up to 30.1.3 cannot. jsdom 31.0.0 and later implements cascade layers, but the gate still requires a real browser, because a passing emulator run is not evidence about forced-colors, shadow-DOM Context, or anything the emulator was not measured on."
2. The jsdom bullet. Proposed: "jsdom up to 30.1.3 parses `@layer` into correct `CSSLayerStatementRule` and `CSSLayerBlockRule` objects and its computed-style engine ignores every declaration inside any layer. jsdom 31.0.0 (2026-11-05) and later applies layers; re-verify with the controls in CSS-GATE-02 before trusting it."
3. The ban in rules/css-theming.md ("no DOM emulator may ever test a layered cascade"): same re-scoping. Whether to keep the ban absolute as policy (a real browser is the only Tier 2 engine) or to relax it for jsdom 31 is a direction decision for the owner. My recommendation is to keep the Tier 2 requirement but stop asserting that an emulator "cannot", because an agent that tries jsdom 31 will see the claim fail and distrust the rest of the gate.

### D2. Did any minifier change how it handles `@layer` statements?

NO behavior change. Per tool:

- esbuild: no release in the window (latest 0.28.2, npm modified 2026-08-08). Its CHANGELOG "Unreleased" has no CSS or layer entry. Unchanged.
- lightningcss: no release in the window (latest 1.33.0, npm modified 2026-07-20). Unchanged.
- Parcel: latest `2.16.4` unchanged. New prereleases `3.0.0-alpha.1` to `3.0.0-alpha.4` (2026-11-03 to 2026-11-25) exist; they are not `latest` and I did not test them.
- cssnano: 9.0.1 to 10.0.0. The CHANGELOG in the window contains many layer fixes (keep empty named `@layer` blocks, keep an earlier duplicate block that declares a layer, keep a duplicate `@import`, `mergeIdents` keeps layers apart when an `@import` exists). None deletes or reorders a bare `@layer a, b;` statement. The changelog says "An emptied named `@layer` stays, since it may fix the layer order." Probe: the same source through cssnano 9.9.0 and 10.0.0 (default and advanced presets) printed `@layer base,theme;@layer theme{...}@layer base{...}`. Statement kept, order kept.

Amend only the version pin and add one operational note. Old: "cssnano 9.0.1". New: "cssnano 9.9.0 and 10.0.0". Note for the gate: cssnano 10.0.0 throws `Option "preset" must be a preset imported from cssnano` for `preset: 'default'`; pass `import preset from 'cssnano/presets/default'`.

### D3. Did swc gain a CSS minifier?

NO in `@swc/core`. Latest 1.16.22 (2026-11-05). `npx swc in.css -o out.css` still exits cleanly and writes 0 bytes (reproduced). `@swc/core` exports no CSS function.

But the baseline sentence is imprecise and should be narrowed. Old: "`swc` has no CSS minifier at all - it exits clean and writes a 0-byte file." New fact: the separate npm package `@swc/css` 0.0.28 (published 2023-07-24, unchanged since) exports `minify`, `minifySync`, `transform`, `transformSync`. `minifySync(Buffer)` on `@layer a,b;` plus two blocks printed `@layer a,b;@layer b{.x{color:red}}@layer a{.x{color:blue}}`: statement kept, order kept. Proposed sentence: "The swc CLI and `@swc/core` have no CSS minifier: they exit clean and write a 0-byte file for a `.css` input. The standalone `@swc/css` package (last release 2023-07-24) does minify and keeps the statement; it is stale and takes a Buffer, not a string." This correction is pre-window; the window itself changed nothing.

### D4. Did any Sass or Less release change import or nesting semantics, or deprecate cited syntax?

NO. Verdict "unchanged" for every cited claim.

- dart-sass: 1.103.1 to 1.108.2 (releases 1.104.0 on 2026-09-03 through 1.108.2 on 2026-11-11; main is 1.109.0-dev). Window changes are: color NaN and negative-zero serialization (1.104.0), first-class modules `meta.load()` and `meta.css()` (1.105.0), escape-code normalization fixes marked "potentially breaking" (1.106.0, partly undone in 1.108.0), `--fatal-deprecation` selectors including `dart-sass-2` (1.107.0), and a pending `color-opacity` deprecation (1.109.0-dev). Nothing touches `@use`/`@forward` ordering, `@import`, or nesting. No Dart Sass 2.0.0 exists on npm (latest is 1.108.2). The `@import` deprecation (name `import`) is still a deprecation, not a removal; 1.107.0 uses it in its own example. 2.0.0 will make `color-functions` an error.
- less: 4.9.0 to 4.9.1 (2026-09-02). Only change: "fix: error when a mixin call is used as a property value" ([#4478](https://github.com/less/less.js/pull/4478)). Deprecation warnings for numeric-leading variable names and dynamic `@charset` came in 4.8.0 (2026-07-22), before the window.
- Probe on dart-sass 1.108.2 and less 4.9.1: `$brand:#ff0000; .c{color:$brand;--brand:#ff0000}` compiles to `.c{color:red;--brand:#ff0000}`. `@use "a";@use "b"` and the reverse order give `@layer a;...@layer b` versus `@layer b;@layer a;...`: entry-file order fixes first appearance, as claimed. `.nav{ul{li{a{}}}}` compiles to `.nav ul li a`. `.card,.card-alt#legacy{.title{}}` compiles to `.card .title,.card-alt#legacy .title` (Sass duplicates selectors; native nesting uses `:is()`). Less: a variable used before a later redeclaration in the same block resolves to the later value (`x: 2`).

Amend only the pins: "dart-sass 1.103.1" to "dart-sass 1.108.2", "less 4.9.0" to "less 4.9.1". The `@import` order claim for Less and the `@use`/`@forward` claim stay verbatim.

## Findings

### 1. jsdom 31 applies cascade layers

1.1 Probes run against `jsdom` installed from npm in a scratch directory. Expected values are what a conforming engine computes.

| Case | 30.0.1 | 30.1.0 | 30.1.3 | 31.0.0 | 31.0.1 |
|---|---|---|---|---|---|
| `@layer a{p{color:red}}` only | black | black | black | red | red |
| `@layer a,b; @layer b{green} @layer a{p#x red}` (later layer wins) | black | black | black | green | green |
| unlayered `p` blue vs layered `p.c` red | blue | blue | blue | blue | blue |

Additional 31.0.1-only checks, all correct against the spec: layered `!important` beats unlayered `!important`; earlier layer wins under `!important`; nested layer `a.b` loses to layer `a`'s own rules; an anonymous layer loses to unlayered rules; `@layer b,a;` ahead of blocks makes `a` win; a bare statement followed by an unlayered rule does not corrupt it.

1.2 Release notes ([jsdom releases](https://github.com/jsdom/jsdom/releases), read via WebFetch and summarized by the fetch tool, not quoted from the page directly): v31.0.0 (5 Nov) "Changed CSS parsing, selector matching, and computed styles to use a new integrated implementation"; the list "includes cascade layers, nesting, `@scope`, custom-property substitution and registration through `@property`"; "CSS serialization and computed values can differ from previous releases." v30.1.0 to v30.1.3 (17 Sep to 15 Oct) mention getComputedStyle fixes and no `@layer`. v31.0.1 (13 Nov): performance and misc fixes. I could not fetch the repo's raw Changelog file (the paths 404), so the exact wording is the fetch tool's paraphrase plus my probes, which are the stronger evidence.

1.3 The package source agrees: `jsdom@31.0.1` `lib/jsdom/living/css/rules/order.js` and `definitions.js` carry layer-ordering logic and `CSSLayerBlockRule`/`CSSLayerStatementRule` implementations.

1.4 Date of upstream change: 2026-11-05 (31.0.0).

### 2. happy-dom still has no `@layer`

2.1 `happy-dom@21.0.4` `lib/css/rules/` contains no layer rule class, and `grep -rli layer lib/css` returns nothing. The rules present are condition, container, font-face, grouping, keyframe(s), media, scope, style, supports.

2.2 Behavior probe, identical on 20.12.0 and 21.0.4:

| Source | cssRules.length | computed color |
|---|---|---|
| `@layer a{p{color:red}}` | 0 | empty |
| `@layer a,b; p{color:blue}` | 0 | empty |
| `@layer a,b; @layer a{...} p{color:blue}` | 1 | blue |
| `p{color:blue}` | 1 | blue |

The "bare statement corrupts the parse of every rule after it" claim holds: the second row loses the unlayered rule that follows the statement. (The third row is a partial recovery: later rules survive once a block intervenes. Say "can corrupt", not "every rule after it", if the author wants exactness. In row 2 it is the only rule and it is lost.)

2.3 Window releases ([happy-dom releases](https://github.com/capricorn86/happy-dom/releases), fetch-tool summary; I could see v20.14.2 to v21.0.4 only, 20.12.1 to 20.14.1 were on later pages): v20.14.2 (9 Sep) fixed a regression where not all CSS variables were resolved in `getComputedStyle()`; v21.0.0 (11 Oct, breaking) disables CSS and iframe file loading by default (`enableCSSFileLoading` replaces `disableCSSFileLoading`); none mention layers. Inline `<style>` still parses at 21.0.4 (probe above).

### 3. Playwright

3.1 Releases in the window: 1.63.0 (2026-09-04), 1.64.0 (2026-10-07), 1.64.1, 1.65.0 (2026-11-05), 1.65.1 (2026-11-13). Release notes ([release-notes-js.md](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/release-notes-js.md)) for these show no change to `forcedColors` on `newContext`. 1.63 adds standalone `TestOptions.reducedMotion`, `TestOptions.forcedColors` and `TestOptions.contrast` for the test runner (`test.use({forcedColors:'active'})`). 1.65 breaking changes: actions wait for non-inert elements, sharded no-tests failure, cookie matching, TS class fields. 1.63 breaking: `screen` forwarded from device descriptors. None affects the css-theming gate.

3.2 Docs ([emulation.md](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/emulation.md), [params.md](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/api/params.md)): `forcedColors` "Emulates `'forced-colors'` media feature, supported values are `'active'`, `'none'`... Defaults to `'none'`." `page.emulateMedia` changes it for one page. The docs call it emulation of the media feature. The baseline rule says it "drives the real mode, not a mock"; that came from a measured 30-assertion round (system-colour replacement, `box-shadow` none, SVG fill untouched), which I could not re-run (see below). Suggest softening to "Playwright's `forcedColors:'active'` context option, measured in Chromium to apply the UA forced-colors rewrite" rather than "real mode", if the author wants to match the vendor wording.

3.3 `page.setContent` ([class-page.md](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/api/class-page.md)): "This method internally calls document.write(), inheriting all its specific characteristics and behaviors." Unchanged. The one-window-reuse pitfall stands, and `page.setContent` is still not documented as creating a fresh document.

3.4 Pin: Playwright 1.62.1 to 1.65.1. Chromium in 1.65 is 158.0.8127.18; Firefox 159.0; WebKit 27.2.

### 4. Minifiers

4.1 Re-measured today with `esbuild@0.28.2` and `lightningcss@1.33.0` on `@layer b,a; @layer a{.x{color:blue}} @layer b{.x{color:red}}`:

- esbuild: `@layer b,a;@layer a{.x{color:#00f}}@layer b{.x{color:red}}` (statement kept).
- lightningcss: `@layer b{.x{color:red}}@layer a{.x{color:#00f}}` (statement deleted; blocks reordered so `b` comes first).

This matches the baseline matrix. Parcel 2.16.4 uses the same lightningcss engine and has no release in the window; not re-run.

4.2 cssnano 10.0.0 changelog (read in full for the window, [CHANGELOG.md](https://raw.githubusercontent.com/cssnano/cssnano/master/packages/cssnano/CHANGELOG.md)): major changes are removal of reading `env` and `stats` from PostCSS process options, "one options object for presets, plugins and browser targets", and one `cssnano-host` plugin per preset. Layer-related entries all add protections (listed in D2). Verified: preset names as strings no longer work.

### 5. Preprocessors

5.1 Dart Sass window changelog ([CHANGELOG.md](https://raw.githubusercontent.com/sass/dart-sass/main/CHANGELOG.md)) read in full from 1.109.0-dev down to 1.104.0. Details in D4. Note for the rule author: `--fatal-deprecation=dart-sass-2` (1.107.0) is the supported way to find what Sass 2.0 will break; `sass.deprecations.dartSass2` is the JS API equivalent.

5.2 Less changelog ([CHANGELOG.md](https://raw.githubusercontent.com/less/less.js/master/CHANGELOG.md)): only 4.9.1 falls in the window.

## Normative guidance candidates

1. Rule: In gate.md and rules/css-theming.md, replace "jsdom 30.0.1 ... ignores every declaration inside any layer" with the versioned form (jsdom up to 30.1.3 ignores layers; 31.0.0 and later applies them). Rationale: the old sentence is false against the current release and an agent can falsify it in one probe. Verification: `grep -n "jsdom 30.0.1" rules/css-theming.md skills/css-theming-reference/gate.md` returns nothing; the text names 31.0.0 and 2026-11-05 (or just 31.0.0).
2. Rule: Re-scope "no DOM emulator may ever test a layered cascade" to "no DOM emulator is accepted as the Tier 2 engine; happy-dom cannot, jsdom 31 can for layer order but is unverified for forced-colors and shadow-DOM Context". Rationale: keeps the safety intent without a false absolute. Owner decision needed on whether to relax (see D1). Verification: reviewer reads Tier 2 text for a claim about an emulator that a one-line probe contradicts; and `grep -n "ever" skills/css-theming-reference/gate.md` shows no absolute about jsdom.
3. Rule: Keep the CSS-GATE-02 controls (inverted expectation, dead selector, identity values) and add that an emulator result is accepted only with the same controls. Rationale: a jsdom 31 "pass" can still be an unrelated false pass. Verification: the harness contains an inverted case and a dead-selector case.
4. Rule: Bump pins to happy-dom 21.0.4, jsdom 31.0.1, Playwright 1.65.1, cssnano 9.9.0 or 10.0.0, dart-sass 1.108.2, less 4.9.1; keep esbuild 0.28.2, lightningcss 1.33.0, Parcel 2.16.4. Rationale: pins are stated as measured at a version. Verification: `grep -n -E "happy-dom|jsdom|Playwright|cssnano|dart-sass|less [0-9]" rules/css-theming.md skills/css-theming-reference/gate.md`.
5. Rule: Narrow "swc has no CSS minifier at all" to the `@swc/core` CLI and mention `@swc/css`. Rationale: the standalone package exists and works. Verification: `grep -n "swc" skills/css-theming-reference/gate.md`.
6. Rule: In any cssnano example or script, use an imported preset object, not `'default'`. Rationale: cssnano 10 throws on the string. Verification: `grep -rn "preset: *['\"]" scripts skills 2>/dev/null` returns nothing.
7. Rule: Optionally soften "drives the real mode" to match the vendor wording "emulates the forced-colors media feature". Rationale: the vendor doc says emulate; the measured round says the UA rewrite applied. Verification: reading heuristic on CSS-A11Y-01 text.

## AI-agent angle

- Agents trained before 2026-11 "know" that jsdom ignores layers and will refuse jsdom 31 or, worse, trust a jsdom 30 pass for a layered rule. Smallest check: the one-line probe in 1.1 against the installed jsdom version, plus the dead-selector control.
- Agents write `cssnano({preset:'default'})`. It fails on 10.0.0 with a clear error. Check: run the build once.
- Agents pin an old Playwright in new fixtures. Check: lockfile grep.
- Agents assume `swc` can minify CSS with `@swc/core`. Check: output file size after the build is greater than 0.

## Contested / evolving

- jsdom 31 layer support is new (3 weeks old at the research date) and its release note says computed values "can differ from previous releases". Trend: emulators are converging on real cascade features, so the "no emulator" line should become a measured, versioned statement rather than an absolute. As of 2026-11-27.
- Parcel 3 alphas (2026-11) may change the Parcel row; the baseline row covers 2.x only.
- Dart Sass 2.0 is announced but not released; `@import` removal and global-function removal land there. Re-check at the next refresh.

## What I could not determine

- Playwright forced-colors behavior on 1.65.1 was not re-run. The Chromium headless shell downloaded but failed to launch: `error while loading shared libraries: libnspr4.so` (no system libraries, no sudo). The claim stays "unchanged by docs and release notes", not "re-measured".
- happy-dom releases 20.12.1 to 20.14.1 were not visible on the releases page I could fetch (pagination). The package source at 21.0.4 and the probes cover the end state, which is what the claim needs.
- GitHub API was rate-limited (HTTP 403, unauthenticated limit exhausted), so I used the npm registry for release dates and `raw.githubusercontent.com` for changelogs.
- jsdom's raw Changelog file could not be fetched (404 at the paths tried); the release-page summary and package probes stand in.
- Parcel 3.0.0 alphas not tested.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://registry.npmjs.org/happy-dom | version and publish times | to 2026-10-20 | proves 21.0.4 is the latest, none after |
| https://registry.npmjs.org/jsdom | version and publish times | to 2026-11-13 | 31.0.0 on 2026-11-05 |
| https://registry.npmjs.org/playwright | version and publish times | to 2026-11-13 | 1.63 to 1.65.1 dates |
| https://registry.npmjs.org/esbuild , /lightningcss , /parcel | publish times | none in window | proves no release |
| https://registry.npmjs.org/cssnano | version and publish times | to 2026-11-26 | 9.0.1 to 10.0.0 |
| https://registry.npmjs.org/@swc/core , /@swc/css | version and publish times | 2026-11-05 ; 2023-07-24 | swc status |
| https://registry.npmjs.org/sass , /less | version and publish times | to 2026-11-11 ; 2026-09-02 | pins |
| https://github.com/jsdom/jsdom/releases | release notes 30.1.0 to 31.0.1 | 2026-09 to 2026-11 | layer support announcement |
| https://github.com/capricorn86/happy-dom/releases | release notes 20.14.2 to 21.0.4 | 2026-09 to 2026-10 | no layer entry; CSS loading default |
| https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/release-notes-js.md | release notes 1.63 to 1.65 | 2026-09 to 2026-11 | forcedColors and breaking changes |
| https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/emulation.md | emulation doc | current | forcedColors wording |
| https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/api/params.md | context option doc | current | forcedColors definition |
| https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/api/class-page.md | Page.setContent doc | current | document.write wording |
| https://raw.githubusercontent.com/sass/dart-sass/main/CHANGELOG.md | Dart Sass changelog | to 1.109.0-dev | D4 |
| https://raw.githubusercontent.com/less/less.js/master/CHANGELOG.md | Less changelog | to 4.9.1 | D4 |
| https://raw.githubusercontent.com/cssnano/cssnano/master/packages/cssnano/CHANGELOG.md | cssnano changelog | to 10.0.0 | D2 |
| https://raw.githubusercontent.com/evanw/esbuild/main/CHANGELOG.md | esbuild changelog | Unreleased only | no CSS entry |
| npm tarballs `happy-dom@21.0.4`, `jsdom@31.0.1` | package source, probed locally | 2026-10 and 2026-11 | primary evidence for D1 |

---
title: css-theming delta refresh decision, 2026-08-30 to 2026-11-27
pair: css-theming
date: 2026-11-27
window_start: 2026-08-30
model: opus
consolidates:
  - .agents/research/refresh-2026-11/css-theming/engines-and-css-spec.md
  - .agents/research/refresh-2026-11/css-theming/test-minifier-preprocessor-tooling.md
  - .agents/research/refresh-2026-11/css-theming/angular-and-material.md
  - .agents/research/refresh-2026-11/css-theming/vite-sfc-frameworks.md
  - .agents/research/refresh-2026-11/css-theming/tailwind-v4.md
  - .agents/research/refresh-2026-11/css-theming/react-meta-frameworks-and-css-in-js.md
  - .agents/research/refresh-2026-11/css-theming/web-components-vscode-tokens.md
  - .agents/research/refresh-2026-11/css-theming/recent-shifts.md
revises:
  - .agents/research/css-theming.md
  - .agents/research/css-theming/build-minifiers.md
  - .agents/research/css-theming/round2-gate.md
  - .agents/research/css-theming/corrections.md
  - .agents/research/css-theming/build-css-modules.md
  - .agents/research/css-theming/surface-component-libs.md
  - .agents/research/css-theming/surface-meta-and-embeds.md
  - .agents/research/css-theming/svelte.md
  - .agents/research/css-theming/build-vue-vitepress.md
  - .agents/research/css-theming/vscode-webview.md
  - .agents/research/css-theming/web-components.md
  - .agents/research/css-theming/angular.md
---

# css-theming delta refresh decision

## Contents

- Verdict
- Changed rules
- New rules
- Confirmed unchanged
- Open questions
- Revision log
- Edit list

## Verdict

- The pair is updated in place, not rewritten. Every rule ID keeps its number and meaning. No new rule ID is added. Three rules change in place: CSS-GATE-01, CSS-API-01 and CSS-VAR-01.
- The DOM-emulator claim is corrected, and the policy stays. jsdom 31.0.0 (2026-11-05) applies cascade layers, as the package source and a probe at 31.0.1 show. The text "jsdom 30.0.1 applies none of it" is now true only up to 30.1.3. Tier 2 still requires a real browser and never accepts an emulator as the engine. The text no longer claims that every emulator "cannot", because an agent can disprove that with one jsdom 31 probe and would then distrust the rest of the gate. happy-dom still has no `@layer` support through 21.0.4. The "corrupts every rule after it" wording becomes "drops the rule that follows it", because a probe shows that rules after an intervening layer block survive.
- The Turbopack CSS Modules class shape is corrected. From Next 16.4.0 (2026-10-06), production builds emit `[hash]_[local]` (`.BEMHdq_page` was measured at 16.4.6). The long `name-module___hash__name` form applies only to 16.3 and earlier and to dev builds. This changes the rule's surface table, css-modules.md and CSS-API-01.
- These factual corrections are applied to depth files: the Svelte hash (filename only when a filename is known), the Shoelace archive date (2026-05-14, not 2026-08-28), the `@swc/css` package, the VitePress `--vp-*` count (alpha.21 declares 21 more), the Emotion error text (the minified identifier is bundler-dependent), the `:host-context()` portability sentence, and the VS Code toolkit deprecation and archive dates.
- New guidance is added to depth files. Panda 2.x silently emits no `_dark` CSS without `@pandacss/preset-base`. Since 22.1.6, Angular's custom-property namespacer also rewrites `@property` rules and style bindings, and it reaches library components. `ExperimentalIsolatedShadowDom` is not yet a measured fix. Angular nested rules are scoped since 22.2.0, which was not measured. `@stylexjs/unplugin` documents `useCSSLayers`. The Houdini draft makes `@property` descriptors optional, but no engine follows it.
- Version stamps are added where a source re-read or re-run confirmed a claim: Chromium stable 158, dart-sass 1.108.2 and less 4.9.1, cssnano 10.0.0, `@angular/cli` 22.3.0, Angular Material 22.3.0, Next 16.4.6, styled-components 6.7.0, VS Code 1.148.0, VitePress alpha.21 and Vue 3.6 rc. A measured pin is never relabelled to a version that was not measured.
- tailwind.md, astro.md tuples, SKILL.md and the rule's Non-Negotiables table stay as they are. The Tailwind artifact reports no change. Astro gets one hedge on `is:inline` minification.
- Bumps: the rule gets a patch bump (corrected facts only). The reference skill gets a minor bump (new guidance in css-in-js.md and angular.md, plus a new clause in CSS-VAR-01).
- Budgets are kept. The rule body grows from 198 to 199 lines. css-modules.md reaches exactly 100 lines, so it still needs no table of contents. vscode-webview.md reaches 99 lines. The other files that grow past 100 lines already have a table of contents (angular.md, css-in-js.md, web-components.md and gate.md).

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| CSS-GATE-01 (statement, point 3) | "**no DOM emulator may ever test a layered cascade** — not "with caution", not "works for simple cases"." | "**no DOM emulator is ever the engine for a layered-cascade assertion** — not "with caution", not "works for simple cases", and not jsdom 31 because it now passes a layer probe." | jsdom 31.0.0 and 31.0.1 npm tarballs (`lib/jsdom/living/css/rules/order.js`), probe table; https://github.com/jsdom/jsdom/releases |
| CSS-GATE-01 (Measured) | "happy-dom 20.12.0 has zero `@layer` support and a bare layer statement corrupts every rule after it; jsdom 30.0.1 parses `@layer` correctly and applies none of it." | "happy-dom 20.12.0 and 21.0.4 have zero `@layer` support, and a bare layer statement drops the rule after it; jsdom 30.0.1 to 30.1.3 parse `@layer` correctly and apply none of it. jsdom 31.0.0 (2026-11-05) applies layer order in a 2026-11-27 probe, but nobody has measured it on forced colors or shadow-DOM Context, and its own release note says computed values can differ from earlier releases." | happy-dom 21.0.4 tarball and probe; https://registry.npmjs.org/happy-dom ; https://registry.npmjs.org/jsdom |
| CSS-API-01 (statement and Measured) | "a CSS Modules hash is path-derived and its whole SHAPE changes with the bundler"; "the CSS Modules hash shape differs by bundler" | "... changes with the bundler, and within Turbopack at Next 16.4"; "... differs by bundler, and Next 16.4.6's Turbopack emits `.BEMHdq_page` where 16.3.3 emitted `.page-module___8aEwW__page`" | https://github.com/vercel/next.js/pull/97944 ; https://github.com/vercel/next.js/releases/tag/v16.4.0 ; next@16.4.6 build |
| CSS-VAR-01 (statement, verification) | "it MUST declare `syntax` and `inherits`, and `initial-value` unless `syntax:"*"`, or the whole rule is silently discarded with no error."; "a matching `@property` registration." | adds: "The Houdini editor's draft now makes all three descriptors optional (CSSWG #13211, unresolved); no shipping engine was found following it on 2026-11-27, so keep declaring them."; verification: "a matching `@property` registration declaring `syntax`, `inherits` and `initial-value`." | https://drafts.css-houdini.org/css-properties-values-api-1/ (ED 2026-11-27, summarised read, medium confidence); https://lists.w3.org/Archives/Public/public-css-archive/2025Dec/0263.html ; Chrome 152 to 158 and Firefox 156 to 161 release notes |

Text changes outside a rule ID (rule index and depth files) are listed in the Revision log and the Edit list.

## New rules

None. The candidate rules in the delta artifacts are absorbed into existing rules or depth-file text:

- "Name the stable engine beside a measured engine version" is absorbed as a one-clause stamp in the rule index.
- "Match on compiled output, never on a remembered CSS Modules shape" is already the CSS-API-01 verification ("grep your own tests ... for a literal generated hash"). It gets the 16.4 fact.
- "Panda v2 needs `@pandacss/preset-base` for `_dark`" is a depth fact under the existing Panda trap. It is not a new rule.
- "Do not install `provideCssVarNamespacing` with Angular Material unchecked" stays a depth note. The interaction is unmeasured, and it is already listed under Not Studied.
- "Use an imported cssnano preset object" is dropped. cssnano 10 fails loudly with a clear error, and no script in the pair uses the string preset.

## Confirmed unchanged

- `:host-context()`: still Chromium-only. The css-shadow-1 ED (2026-04-28) still defines it, and Firefox bug 1082060 is still WONTFIX. Only the "CSSWG removal" wording changes, because the removal could not be confirmed.
- `@scope` mechanics (CSS-CAS-05): no semantic change in any engine. Safari 27.0 fixed a regression for slotted elements. The rule names no Baseline date, so there is no edit.
- Forced colors (CSS-A11Y-01): no engine note mentions it. css-color-adjust-1 (CR 2026-10-30) still lists SVG and `background-image` as open issues. Playwright `forcedColors:'active'` still exists through 1.65.1. The docs call it emulation, while the measured round saw the UA rewrite, so there is no edit.
- `light-dark()` became Baseline Widely Available on 2026-11-13. The pair never stated a projection, so there is no edit.
- `page.setContent()` is still documented as `document.write()`, so the fresh-page requirement in CSS-GATE-02 stands.
- esbuild 0.28.2, lightningcss 1.33.0 and Parcel 2.16.4 had no release in the window, and the minifier matrix reproduces. cssnano 10.0.0 still keeps the bare statement.
- Sass `@use`/`@forward` order, Less `@import` order, Sass nesting, and Less lazy scoping were all re-probed at dart-sass 1.108.2 and less 4.9.1 and hold.
- Angular: the Emulated tuples, mount-order layer flip, `addHost` copy, `::ng-deep` stance, `--global--` escape, `%NS%` placeholder and `externalRuntimeStyles` routing are unchanged. The renderer package diffs unchanged at 22.3.0.
- Material 22.3.0: 91/91 `None`, zero `--mdc-*`, and `mat.*-overrides()` is still the contract.
- Astro 7.4.13: the `scopedStyleStrategy` default is still `attribute`, and `image.responsiveStyles` is still `false`. View-transition layer placement has no changelog entry.
- Vue 3.5.46: the `:deep()`, `:slotted()` and `v-bind()` mechanics are unchanged. VitePress alpha.21 still opens with `@layer __vitepress_base`, and 1.6.4 has no `@layer`.
- Svelte 5.59.2: the `css` option is still only `'injected' | 'external' | fn`, unused-selector deletion stands, and the `:where()` compound shape stands.
- Tailwind 4.3.5: no changelog entry touches layers, Preflight `[hidden]`, `@theme inline`, `@theme static`, breakpoints or the `:where()` dark recipe.
- Next: `experimental.inlineCss` and `experimental.cssChunking` are unmoved at 16.4.6. Both opposite `:global` errors reproduce. Nuxt 4.7.0 and React Router 8.5.3 have no CSS Modules change.
- styled-components 6.7.0 still uses stylis 4.3.6 and `stylisPlugins`, and still has no `exports` field. StyleX 0.19.2 keeps `useCSSLayers` default `false` and the `:not(#\#)` padding. vanilla-extract 1.21.3 has no layer-name change.
- Lit 3.3.3 had no release in the window. Web Awesome 3.15.0 removed no CSS property, part or slot.
- VS Code 1.148.0: `@layer vscode-default` (count 1) is unchanged, as are `setProperty` injection, the stale sweep on `documentElement` only, the HC-light class pair, the reduce-motion and screen-reader classes, and the `data-vscode-theme-name` deprecation. `@vscode-elements/elements` is still 2.5.1.
- Style Dictionary 5.8.0 still has `outputReferences = false`. DTCG stable is still 2025.10. The pair cites no draft date.

## Open questions

- **A gate false pass found during the refresh.** This gap existed before the window. A minifier shortens `#ff0000` to `red`: the dart-sass 1.108.2 probe output was `color:red`, and esbuild and lightningcss pick the shorter spelling. `literal-colours.mjs` matches only hex and functional colours, so a baked-in named colour passes CSS-TOK-01's gate. The owner should decide whether to add a named-colour alternation with an allowlist (`transparent`, `currentColor`, system colours). This refresh does not change it.
- **Re-measure candidates.** Nothing here is relabelled until it is measured:
  - Playwright forced colors at 1.65.1. The browser could not launch (`libnspr4.so`).
  - Stencil `scoped:true` at 4.45.5. The scope-css layer and container fixes landed in 4.45.0 and 4.45.2.
  - Tailwind at 4.3.5. The `@scope` variant wrapping and the Safari-gated `@property` fallback changed in 4.3.4.
  - Astro `is:inline` under vite 8.3 or later, which minifies HTML style tags.
  - The VitePress alpha.21 `--vp-*` count by the baseline method.
  - vanilla-extract 1.21.3 `layer()` naming.
  - The `@stylexjs/unplugin` default for `useCSSLayers`.
  - Angular Material × `provideCssVarNamespacing()`.
  - Whether `ExperimentalIsolatedShadowDom` skips `addHost`.
  - Angular nested-rule tuples since 22.2.0.
  - Whether jsdom 31 handles shadow-DOM Context.
- **Cross-engine.** All three engines now ship `@scope`. The existing Playwright probe could run its Firefox and WebKit projects. Adding a `@media (min-width: var(--x))` case and an empty `@property` case to that run would settle two engine questions at once.
- **Not Studied additions with no measured consequence yet:** container style queries across layers, scoped custom element registries, and the `revert-rule` keyword next to layers.
- **Could not determine (blocked fetches):**
  - WebKit's current `:host-context()` stance (the blog returned 502).
  - Whether the CSSWG recorded a `:host-context()` removal resolution.
  - The `@property` Baseline status (404).
  - The Vite `build.cssMinify` default.
  - Whether 2.0 stable shipped for Qwik.
- **Watch next refresh:** styled-components 7.0, which removes inline server `<style>` tags and changes tie order. Also Panda 2.x ordering changes, Parcel 3, Dart Sass 2.0, Vue 3.6 / Vapor, VitePress 2.0 and Stencil 5.

## Revision log

1. Rule index: the emulator paragraph now accepts no DOM emulator as the engine and versions the happy-dom and jsdom facts.
2. Rule index: the Chromium 151 line gets the stamp "stable 158 at 2026-11-27, not re-measured".
3. Rule index: the Sass/Less bullet notes the re-probe at dart-sass 1.108.2 and less 4.9.1.
4. Rule index: the CSS Modules (Turbopack) surface row gains the Next 16.4 shape.
5. Rule index: Not Studied gains scoped custom element registries and notes that style queries are now cross-engine.
6. rules.md CSS-VAR-01: the Houdini draft clause is added, and the verification names all three descriptors.
7. rules.md CSS-API-01: the Next 16.4 hash-shape change is added to the statement and the Measured note.
8. rules.md CSS-GATE-01: the emulator ban is restated as an engine policy, and the Measured note is versioned.
9. gate.md Tier 2: the ban still holds where an emulator passes a layer probe.
10. gate.md emulator section: versioned happy-dom and jsdom bullets, plus a jsdom 31 bullet.
11. gate.md: the Angular CLI Node range now covers 22.1.6 through 22.3.0.
12. gate.md minifier matrix: cssnano now reads 9.0.1 to 10.0.0.
13. gate.md minifier matrix: the swc sentence is narrowed to the CLI and `@swc/core`, and `@swc/css` is named.
14. angular.md: a provenance note that the 22.3.0 renderer diffs unchanged.
15. angular.md: the CLI range covers 22.1.6 through 22.3.0, and 22.3.0 only warns on odd or newer majors.
16. angular.md: the namespacer covers `@property` rules and style bindings since 22.1.6, and it reaches library components.
17. angular.md: nested rules are scoped since 22.2.0 (unmeasured).
18. angular.md: `ExperimentalIsolatedShadowDom` is not yet a measured fix.
19. angular.md: the Material package scan was repeated at 22.3.0.
20. css-modules.md: provenance now includes the Next 16.4.6 rebuild.
21. css-modules.md: a table row for the Turbopack shape from Next 16.4.
22. css-modules.md: the hash-shape paragraph names three shapes.
23. css-modules.md: the `inlineCss` key is unmoved at 16.4.6.
24. css-in-js.md: the styled-components RSC claim was re-checked at 6.7.0 on Next 16.4.6.
25. css-in-js.md: the Emotion error is quoted without the minified identifier.
26. css-in-js.md: `@stylexjs/unplugin` documents `useCSSLayers`.
27. css-in-js.md: Panda 2.x needs the base preset for `_dark`.
28. svelte.md: the hash derives from the filename alone when the filename is known.
29. vue.md: a provenance note on VitePress 2 alpha and Vue 3.6 rc.
30. vue.md: the `--vp-*` count is scoped to the measured builds.
31. web-components.md: the `:host-context()` portability sentence now rests on fetched facts.
32. web-components.md: the Shoelace archive date is 2026-05-14, the `label` deprecation is v3.11.0, and the v3.15.0 `*__base` deprecations are added.
33. vscode-webview.md: a provenance note that the source was re-read at 1.148.0.
34. vscode-webview.md: the toolkit is dated deprecated 2025-01-01 and archived 2025-01-06.
35. astro.md: the `is:inline` "unminified" claim is hedged against vite 8.3 or later.

## Edit list

Each entry gives a file, a Source line with the URLs behind the claim, the exact text to find (it occurs once in that file), and the exact replacement. Fences are `~~~~`.

### 1. rules/css-theming.md

Source: https://github.com/jsdom/jsdom/releases ; https://registry.npmjs.org/jsdom ; https://registry.npmjs.org/happy-dom ; https://github.com/capricorn86/happy-dom/releases

Find:
~~~~text
**Before trusting any tuple or layer claim, read the BUILT artifact for your own
surface — and know that no DOM emulator can test a layered cascade.** happy-dom
20.12.0 has zero `@layer` support: a layer block parses to `cssRules.length ===
0`, and a bare `@layer a, b;` statement corrupts the parse of every rule *after*
it in the same sheet. jsdom 30.0.1 parses `@layer` into correct CSSOM objects
and applies none of it. Either way the assertion passes or fails for reasons
unrelated to your CSS. Read [gate.md](../skills/css-theming-reference/gate.md) before wiring
anything.
~~~~
Replace:
~~~~text
**Before trusting any tuple or layer claim, read the BUILT artifact for your own
surface — and never accept a DOM emulator as the engine for a layered cascade.**
happy-dom (20.12.0 to 21.0.4) has zero `@layer` support: a layer block parses to
`cssRules.length === 0`, and a bare `@layer a, b;` statement drops the rule that
follows it. jsdom up to 30.1.3 parses `@layer` and applies none of it. jsdom
31.0.0 (2026-11-05) applies layer order, but nobody has measured it on forced
colors or shadow-DOM Context. Read [gate.md](../skills/css-theming-reference/gate.md) before wiring
anything.
~~~~

### 2. rules/css-theming.md

Source: https://chromiumdash.appspot.com/fetch_milestones ; https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux&num=3 ; https://chromestatus.com/release-notes/158

Find:
~~~~text
Every measured claim comes from Chromium 151.0.7922.34 and real production
builds at the versions each depth file names. Firefox and WebKit were not
tested. Where a claim is spec-derived rather than measured,
[rules.md](../skills/css-theming-reference/rules.md) says so on the rule.
~~~~
Replace:
~~~~text
Every measured claim comes from Chromium 151.0.7922.34 (stable was 158 at the
2026-11-27 refresh; its release notes touch none of it; not re-measured) and real
production builds at the versions each depth file names. Firefox and WebKit were
not tested. Where a claim is spec-derived, [rules.md](../skills/css-theming-reference/rules.md) says so on the rule.
~~~~

### 3. rules/css-theming.md

Source: https://registry.npmjs.org/sass ; https://registry.npmjs.org/less ; https://raw.githubusercontent.com/sass/dart-sass/main/CHANGELOG.md ; https://raw.githubusercontent.com/less/less.js/master/CHANGELOG.md

Find:
~~~~text
- `$brand: #ff0000` interpolated into a declaration compiles to `color:#ff0000`
  — reproduced in dart-sass 1.103.1 and less 4.9.0. `--brand` survives. A
  breakpoint or z-index IS a legitimate `$var`: no consumer override path
  through a media condition could ever exist.
~~~~
Replace:
~~~~text
- `$brand: #ff0000` interpolated into a declaration compiles to `color:#ff0000`
  — reproduced in dart-sass 1.103.1 and less 4.9.0; still baked in at 1.108.2
  and 4.9.1. `--brand` survives. A breakpoint or z-index IS a legitimate `$var`:
  no consumer override path through a media condition could ever exist.
~~~~

### 4. rules/css-theming.md

Source: https://github.com/vercel/next.js/pull/97944 ; https://github.com/vercel/next.js/releases/tag/v16.4.0

Find:
~~~~text
| CSS Modules (Turbopack) | `.name-module___hash__name` (0,1,0) | no |
~~~~
Replace:
~~~~text
| CSS Modules (Turbopack) | `.hash_name` (0,1,0) from Next 16.4; `.name-module___hash__name` before, and in dev | no |
~~~~

### 5. rules/css-theming.md

Source: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/159 ; https://developer.chrome.com/blog/scoped-registries ; https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/156

Find:
~~~~text
  locally runnable — plus **Style Dictionary's `outputReferences`**, the **DTCG
  format**, **Qwik `useStyles$`**, and **container style queries**.
~~~~
Replace:
~~~~text
  locally runnable — plus **Style Dictionary's `outputReferences`**, the **DTCG
  format**, **Qwik `useStyles$`**, **container style queries** and **scoped
  custom element registries**, both now shipping in all three engines.
~~~~

### 6. skills/css-theming-reference/rules.md (CSS-VAR-01 statement)

Source: https://drafts.css-houdini.org/css-properties-values-api-1/ ; https://lists.w3.org/Archives/Public/public-css-archive/2025Dec/0263.html

Find:
~~~~text
or the whole rule is silently discarded with no error.<br>*Measured:* missing → fallback;
~~~~
Replace:
~~~~text
or the whole rule is silently discarded with no error. The Houdini editor's draft now makes all three descriptors optional (CSSWG #13211, unresolved); no shipping engine was found following it on 2026-11-27, so keep declaring them.<br>*Measured:* missing → fallback;
~~~~

### 7. skills/css-theming-reference/rules.md (CSS-VAR-01 verification)

Source: https://drafts.css-houdini.org/css-properties-values-api-1/ ; https://lists.w3.org/Archives/Public/public-css-archive/2025Dec/0263.html

Find:
~~~~text
For every published hook whose fallback is load-bearing there is a matching `@property` registration.
~~~~
Replace:
~~~~text
For every published hook whose fallback is load-bearing there is a matching `@property` registration declaring `syntax`, `inherits` and `initial-value`.
~~~~

### 8. skills/css-theming-reference/rules.md (CSS-API-01 statement)

Source: https://github.com/vercel/next.js/pull/97944 ; https://github.com/vercel/next.js/releases/tag/v16.4.0

Find:
~~~~text
a CSS Modules hash is path-derived and its whole SHAPE changes with the bundler;
~~~~
Replace:
~~~~text
a CSS Modules hash is path-derived and its whole SHAPE changes with the bundler, and within Turbopack at Next 16.4;
~~~~

### 9. skills/css-theming-reference/rules.md (CSS-API-01 Measured)

Source: https://github.com/vercel/next.js/pull/97944 ; https://github.com/vercel/next.js/releases/tag/v16.4.0

Find:
~~~~text
the CSS Modules hash shape differs by bundler;
~~~~
Replace:
~~~~text
the CSS Modules hash shape differs by bundler, and Next 16.4.6's Turbopack emits `.BEMHdq_page` where 16.3.3 emitted `.page-module___8aEwW__page`;
~~~~

### 10. skills/css-theming-reference/rules.md (CSS-GATE-01 statement)

Source: https://github.com/jsdom/jsdom/releases ; https://registry.npmjs.org/jsdom ; https://registry.npmjs.org/happy-dom ; https://github.com/capricorn86/happy-dom/releases

Find:
~~~~text
(3) A DOM emulator: **no DOM emulator may ever test a layered cascade** — not "with caution", not "works for simple cases".
~~~~
Replace:
~~~~text
(3) A DOM emulator: **no DOM emulator is ever the engine for a layered-cascade assertion** — not "with caution", not "works for simple cases", and not jsdom 31 because it now passes a layer probe.
~~~~

### 11. skills/css-theming-reference/rules.md (CSS-GATE-01 Measured)

Source: https://github.com/jsdom/jsdom/releases ; https://registry.npmjs.org/jsdom ; https://registry.npmjs.org/happy-dom ; https://github.com/capricorn86/happy-dom/releases

Find:
~~~~text
*Measured:* happy-dom 20.12.0 has zero `@layer` support and a bare layer statement corrupts every rule after it; jsdom 30.0.1 parses `@layer` correctly and applies none of it.
~~~~
Replace:
~~~~text
*Measured:* happy-dom 20.12.0 and 21.0.4 have zero `@layer` support, and a bare layer statement drops the rule after it; jsdom 30.0.1 to 30.1.3 parse `@layer` correctly and apply none of it. jsdom 31.0.0 (2026-11-05) applies layer order in a 2026-11-27 probe, but nobody has measured it on forced colors or shadow-DOM Context, and its own release note says computed values can differ from earlier releases.
~~~~

### 12. skills/css-theming-reference/gate.md

Source: https://github.com/jsdom/jsdom/releases ; https://registry.npmjs.org/jsdom ; https://registry.npmjs.org/happy-dom ; https://github.com/capricorn86/happy-dom/releases

Find:
~~~~text
relationship. **No DOM emulator, ever** — see below; that direction is absolute.
~~~~
Replace:
~~~~text
relationship. **No DOM emulator, ever** — see below; that direction is absolute,
even for an emulator that now passes a layer probe.
~~~~

### 13. skills/css-theming-reference/gate.md

Source: https://github.com/jsdom/jsdom/releases ; https://registry.npmjs.org/jsdom ; https://registry.npmjs.org/happy-dom ; https://github.com/capricorn86/happy-dom/releases

Find:
~~~~text
- **happy-dom 20.12.0** has zero `@layer` support anywhere in its CSS parser
  source (a case-insensitive search for `layer` over `src/css/` returns nothing). An `@layer` block
  parses to `cssRules.length === 0`. Worse, a bare `@layer a, b;` statement
  corrupts the parse of every rule *after* it in the same sheet — so a false
  pass can arrive from an entirely unrelated rule.
- **jsdom 30.0.1** parses `@layer` into correct `CSSLayerStatementRule` and
  `CSSLayerBlockRule` objects and its computed-style engine then ignores every
  declaration inside any layer. One uncontested layered rule computes
  identically to no CSS at all.

Either way the assertion passes or fails for reasons unrelated to your CSS.
~~~~
Replace:
~~~~text
- **happy-dom 20.12.0 and 21.0.4** (the latest on 2026-11-27) have zero `@layer`
  support anywhere in their CSS parser (a case-insensitive search for `layer`
  over the CSS source returns nothing at either version). An `@layer` block
  parses to `cssRules.length === 0`. Worse, a bare `@layer a, b;` statement
  drops the unlayered rule that follows it in the same sheet (rules after an
  intervening layer block survive) — so a false pass can arrive from an
  unrelated rule.
- **jsdom 30.0.1 through 30.1.3** parse `@layer` into correct
  `CSSLayerStatementRule` and `CSSLayerBlockRule` objects, and the computed-style
  engine then ignores every declaration inside any layer. One uncontested layered
  rule computes identically to no CSS at all.
- **jsdom 31.0.0 (2026-11-05) and later** replaced the style engine and apply
  layer order correctly in a probe at 31.0.1. That still does not make jsdom the
  engine: a pass says nothing about forced colors, shadow-DOM Context, or any
  feature it was not measured on, and its release note warns that computed values
  can differ from earlier releases. A probe in it needs the CSS-GATE-02 controls
  like any other.

On happy-dom and on jsdom 30 the assertion passes or fails for reasons unrelated
to your CSS.
~~~~

### 14. skills/css-theming-reference/gate.md

Source: https://registry.npmjs.org/@angular/cli/22.3.0 ; https://angular.dev/reference/versions

Find:
~~~~text
Pin Node while you are here: `@angular/cli` 22.1.6 requires
`^22.22.3 || ^24.15.0 || >=26.0.0` and refuses Node 24.14.0 outright.
~~~~
Replace:
~~~~text
Pin Node while you are here: `@angular/cli` 22.1.6 through 22.3.0 require
`^22.22.3 || ^24.15.0 || >=26.0.0` and refuse Node 24.14.0 outright.
~~~~

### 15. skills/css-theming-reference/gate.md

Source: https://registry.npmjs.org/cssnano ; https://raw.githubusercontent.com/cssnano/cssnano/master/packages/cssnano/CHANGELOG.md

Find:
~~~~text
cssnano 9.0.1 never touch the statement.
~~~~
Replace:
~~~~text
cssnano 9.0.1 to 10.0.0 never touch the statement.
~~~~

### 16. skills/css-theming-reference/gate.md

Source: https://registry.npmjs.org/@swc/core ; https://registry.npmjs.org/@swc/css

Find:
~~~~text
`swc` has no CSS minifier at all — it
exits clean and writes a 0-byte file.
~~~~
Replace:
~~~~text
The swc CLI and `@swc/core` have no CSS
minifier — given a `.css` file they exit clean and write 0 bytes. Only the
standalone `@swc/css` package minifies (last release 2023-07-24), and it keeps
the statement.
~~~~

### 17. skills/css-theming-reference/angular.md

Source: https://raw.githubusercontent.com/angular/angular/main/CHANGELOG.md ; https://registry.npmjs.org/@angular/core

Find:
~~~~text
CLI 22.1.6, plus live Chromium reads against a local server. Not built:
~~~~
Replace:
~~~~text
CLI 22.1.6, plus live Chromium reads against a local server. The 22.3.0 renderer
package (2026-11-18) diffs unchanged in its style logic; nothing was rebuilt at
22.3.0. Not built:
~~~~

### 18. skills/css-theming-reference/angular.md

Source: https://registry.npmjs.org/@angular/cli/22.3.0 ; https://github.com/angular/angular-cli/blob/main/CHANGELOG.md

Find:
~~~~text
`@angular/cli` 22.1.6 requires `^22.22.3 || ^24.15.0 || >=26.0.0` and refuses
Node 24.14.0 outright.
~~~~
Replace:
~~~~text
`@angular/cli` 22.1.6 through 22.3.0 require `^22.22.3 || ^24.15.0 || >=26.0.0`
and refuse Node 24.14.0 outright. From 22.3.0, an odd interim major or a major
above the highest range runs with a warning instead.
~~~~

### 19. skills/css-theming-reference/angular.md (insertion)

Source: https://angular.dev/guide/components/styling ; https://github.com/angular/angular/blob/main/CHANGELOG.md (22.1.6 entry)

Anchor:
~~~~text
Tokens declared in a GLOBAL stylesheet are not rewritten — so a theme file and a
component's `var()` read can silently disagree about the name.
~~~~
Insert after the anchor:
~~~~text

Since 22.1.6 (2026-09-09), after the build measured here, the rewrite also covers
`@property` rules and `[style.--x]` bindings. A static `style="--x:…"` attribute
is not rewritten. The rewrite reaches compiled library components too, so
installing `provideCssVarNamespacing()` in an app can silently disconnect a
library's component styles from a global theme file.
~~~~

### 20. skills/css-theming-reference/angular.md (insertion)

Source: https://raw.githubusercontent.com/angular/angular/main/CHANGELOG.md (22.2.0 entries) ; https://angular.dev/guide/components/styling

Anchor:
~~~~text
is silently downgraded to `None`** and its elements carry no scope attribute at
all.
~~~~
Insert after the anchor:
~~~~text

The table covers flat rules only. Since 22.2.0, native nested rules are scoped
too, and a nested selector under an `::ng-deep` parent is not. That output was
not measured.
~~~~

### 21. skills/css-theming-reference/angular.md (insertion)

Source: https://angular.dev/guide/components/styling ; `ViewEncapsulation` in `@angular/core@22.3.0` `types/core.d.ts` via https://registry.npmjs.org/@angular/core

Anchor:
~~~~text
re-injected into every ShadowDom component. Shadow DOM blocks outside PAGE
styles; it does not block Angular's own shared styles.
~~~~
Insert after the anchor:
~~~~text

The only mode documented as strictly isolating is
`ViewEncapsulation.ExperimentalIsolatedShadowDom`, experimental since 21.0.
Whether it skips the `addHost` copy was not measured, so do not recommend it as
the fix yet.
~~~~

### 22. skills/css-theming-reference/angular.md

Source: https://github.com/angular/components/blob/main/guides/theming.md ; https://raw.githubusercontent.com/angular/components/main/CHANGELOG.md ; https://registry.npmjs.org/@angular/material

Find:
~~~~text
## Angular Material 22.1.4

The public contract is the Sass
~~~~
Replace:
~~~~text
## Angular Material 22.1.4

A package scan at 22.3.0 (2026-11-18) still finds 91/91 components `None` and
zero `--mdc-*` names.

The public contract is the Sass
~~~~

### 23. skills/css-theming-reference/css-modules.md

Source: https://github.com/vercel/next.js/releases/tag/v16.4.0 ; https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss ; next@16.4.6 build

Find:
~~~~text
16.3.3, Nuxt 4.5.2, React Router 8.3.1. The webpack-path `:global` error and the
`cssChunking` values carry over from documentation reading.
~~~~
Replace:
~~~~text
16.3.3, Nuxt 4.5.2, React Router 8.3.1. The `cssChunking` values carry over from
documentation reading. Next 16.4.6 was rebuilt on 2026-11-27 for the hash
shape, both `:global` errors (webpack path included) and the `inlineCss` key.
~~~~

### 24. skills/css-theming-reference/css-modules.md

Source: https://github.com/vercel/next.js/pull/97944 ; https://github.com/vercel/next.js/releases/tag/v16.4.0

Find:
~~~~text
| Next / Turbopack | `.page-module___8aEwW__page` | (0,1,0) |

Both bare.
~~~~
Replace:
~~~~text
| Next ≥16.4 / Turbopack | `.BEMHdq_page` | (0,1,0) |
| Next ≤16.3 / Turbopack, and dev builds | `.page-module___8aEwW__page` | (0,1,0) |

All bare.
~~~~

### 25. skills/css-theming-reference/css-modules.md

Source: https://github.com/vercel/next.js/pull/97944 ; https://github.com/vercel/next.js/releases/tag/v16.4.0

Find:
~~~~text
`_name_hash_n` versus `name-module___hash__name`. A regex written against one
silently misses the other.
~~~~
Replace:
~~~~text
`_name_hash_n` (Vite), `hash_name` (Turbopack from Next 16.4.0) and
`name-module___hash__name` (Turbopack before 16.4, and in dev). A regex written
against one silently misses the others.
~~~~

### 26. skills/css-theming-reference/css-modules.md

Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss ; next@16.4.6 `dist/server/config-shared.js`

Find:
~~~~text
`experimental.inlineCss` is still the exact, unmoved key at 16.3.3
(`next/dist/server/config-shared.js`, default `false`).
~~~~
Replace:
~~~~text
`experimental.inlineCss` is still the exact, unmoved key at 16.3.3 and 16.4.6
(`next/dist/server/config-shared.js`, default `false`).
~~~~

### 27. skills/css-theming-reference/css-in-js.md

Source: https://github.com/styled-components/styled-components/releases ; styled-components 6.7.0 `package.json` via https://registry.npmjs.org/styled-components

Find:
~~~~text
- **styled-components 6.5.3** has no `react-server` export condition and detects
  the RSC environment internally: a plain Server Component with no directive
  anywhere builds clean on Next 16.3.3/Turbopack and SSRs
~~~~
Replace:
~~~~text
- **styled-components 6.5.3** has no `react-server` export condition (nor has
  6.7.0) and detects the RSC environment internally: a plain Server Component
  with no directive anywhere builds clean on Next 16.3.3/Turbopack (6.7.0 on
  16.4.6 too) and SSRs
~~~~

### 28. skills/css-theming-reference/css-in-js.md

Source: next@16.4.6 scratch build (measured 2026-11-27); https://registry.npmjs.org/@emotion/react

Find:
~~~~text
- **Emotion 11.14.x** throws `TypeError: n.createContext is not a function` at
  module evaluation in the identical scenario, and works only once `"use client"`
  is added.
~~~~
Replace:
~~~~text
- **Emotion 11.14.x** throws `TypeError: <id>.createContext is not a function`
  at module evaluation in the identical scenario, and works only once
  `"use client"` is added. The minified `<id>` is `n` on Next 16.3.3 and `f` on
  16.4.6, so match on `createContext is not a function`.
~~~~

### 29. skills/css-theming-reference/css-in-js.md

Source: https://raw.githubusercontent.com/facebook/stylex/main/packages/@stylexjs/unplugin/README.md ; https://stylexjs.com/docs/api/configuration/babel-plugin/

Find:
~~~~text
babel-plugin's `useLayers` (`bundler.js:69`).
~~~~
Replace:
~~~~text
babel-plugin's `useLayers` (`bundler.js:69`). `@stylexjs/unplugin` documents the
same `useCSSLayers` key, without a stated default; no unplugin build was run.
~~~~

### 30. skills/css-theming-reference/css-in-js.md (insertion)

Source: https://panda-css.com/docs/get-started/upgrading-to-v2 ; https://github.com/chakra-ui/panda/releases/tag/%40pandacss%2Fdev%402.0.0

Anchor:
~~~~text
`[data-theme="dark"]`, so an agent toggling `data-theme` ships a dark mode that
never activates.
~~~~
Insert after the anchor:
~~~~text

**Panda 2.x** (npm `latest` since 2.0.0, 2026-09-29) no longer adds
`@pandacss/preset-base` automatically. Without
`presets: ['@pandacss/preset-base', '@pandacss/preset-panda']`, `_dark` raises
only an `unknown_condition` warning and emits no CSS at all, so the dark rule
silently vanishes. With the presets it compiles to `.dark …` as above (measured
at 2.6.0).
~~~~

### 31. skills/css-theming-reference/svelte.md

Source: https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/validate-options.js ; https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/phases/2-analyze/index.js ; https://svelte.dev/docs/svelte/svelte-compiler ; https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/CHANGELOG.md

Find:
~~~~text
`.svelte-<hash>` derives from (filename, style content). Renaming or moving a
file rotates every hash it emits. Never pin one — see CSS-API-01.
~~~~
Replace:
~~~~text
`.svelte-<hash>` derives from the filename alone whenever the compiler knows it
(the default `cssHash`, since 5.38.9); only a `compile()` call with no filename
hashes the style content. Renaming or moving a file rotates every hash it emits;
editing its styles does not. Never pin one — see CSS-API-01.
~~~~

### 32. skills/css-theming-reference/vue.md

Source: https://raw.githubusercontent.com/vuejs/vitepress/main/CHANGELOG.md ; https://raw.githubusercontent.com/vuejs/core/v3.6.0-rc.17/CHANGELOG.md ; https://registry.npmjs.org/vitepress

Find:
~~~~text
vitepress 1.6.4, vitepress 2.0.0-alpha.19. `ocx-catalog`'s own layer-contract
tests were read, not executed — never cite them as passing.
~~~~
Replace:
~~~~text
vitepress 1.6.4, vitepress 2.0.0-alpha.19. `ocx-catalog`'s own layer-contract
tests were read, not executed — never cite them as passing. On 2026-11-27
VitePress 2.0 is still alpha (alpha.21; npm `latest` is 1.6.4) and Vue 3.6 /
Vapor is still a release candidate. Their changelogs touch nothing below except
the token count; none was rebuilt.
~~~~

### 33. skills/css-theming-reference/vue.md

Source: https://registry.npmjs.org/vitepress (npm pack of 1.6.4, 2.0.0-alpha.19, 2.0.0-alpha.21) ; https://raw.githubusercontent.com/vuejs/vitepress/main/CHANGELOG.md

Find:
~~~~text
Both lines ship exactly 228 distinct `--vp-*` properties in two tiers: numbered
~~~~
Replace:
~~~~text
The measured builds (1.6.4 and 2.0.0-alpha.19) both shipped exactly 228 distinct
`--vp-*` properties; 2.0.0-alpha.21 (2026-10-25) declares 21 more in source, so
recount at your version. They come in two tiers: numbered
~~~~

### 34. skills/css-theming-reference/web-components.md

Source: https://web-platform-dx.github.io/web-features-explorer/features/host-context/ ; https://bugzilla.mozilla.org/rest/bug/1082060 ; https://drafts.csswg.org/css-shadow-1/

Find:
~~~~text
  and ship a portability bug. The CSSWG removal has not reached the shipping
  engine — treat it as "works where you will test it, absent where your users
  are". Firefox/WebKit unverified this round.
~~~~
Replace:
~~~~text
  and ship a portability bug. It is Chromium-only: web-features marks it
  discouraged, Firefox closed its bug WONTFIX, and Safari does not ship it —
  treat it as "works where you will test it, absent where your users are".
  Firefox/WebKit unverified this round.
~~~~

### 35. skills/css-theming-reference/web-components.md

Source: https://github.com/shoelace-style/shoelace ; https://github.com/shoelace-style/webawesome/releases/tag/v3.15.0 ; https://registry.npmjs.org/@awesome.me/webawesome

Find:
~~~~text
(`--sl-*` → `--wa-*`, repo archived 2026-08-28), removed
`--wa-accordion-divider-color` in v3.9.0, and deprecated the `label` part in
v3.12.0. Pinning any single hook name is a live risk.
~~~~
Replace:
~~~~text
(`--sl-*` → `--wa-*`, Shoelace repo archived 2026-05-14), removed
`--wa-accordion-divider-color` in v3.9.0, deprecated the `label` part in
v3.11.0 (restated in the 3.12.0 notes), and deprecated a batch of `*__base`
parts in v3.15.0 (2026-11-17). Pinning any single hook name is a live risk.
~~~~

### 36. skills/css-theming-reference/vscode-webview.md

Source: https://code.visualstudio.com/updates ; https://raw.githubusercontent.com/microsoft/vscode/1.148.0/src/vs/workbench/contrib/webview/browser/pre/index.html

Find:
~~~~text
> own `engines.vscode` before acting on it.
~~~~
Replace:
~~~~text
> own `engines.vscode` before acting on it. Source re-read at tag 1.148.0
> (stable 2026-11-25): no line behind these claims changed since 1.104.0.
~~~~

### 37. skills/css-theming-reference/vscode-webview.md

Source: https://github.com/microsoft/vscode-webview-ui-toolkit

Find:
~~~~text
`data-vscode-theme-kind`. `@vscode/webview-ui-toolkit` is archived (last push
2024-09-24) — target `@vscode-elements/elements` or hand-rolled elements.
~~~~
Replace:
~~~~text
`data-vscode-theme-kind`. `@vscode/webview-ui-toolkit` was deprecated 2025-01-01
and archived 2025-01-06 (last push 2024-09-24) — target `@vscode-elements/elements`
or hand-rolled elements.
~~~~

### 38. skills/css-theming-reference/astro.md

Source: https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md ; https://github.com/vitejs/vite/pull/23183 ; https://docs.astro.build/en/guides/styling/

Find:
~~~~text
where authored, surviving `compressHTML`. The consequence worth stating is that
~~~~
Replace:
~~~~text
where authored, surviving `compressHTML` (measured on vite 8.2.2; vite 8.3.0
began minifying HTML `<style>` tags, and whether that reaches `is:inline` is
unmeasured). The consequence worth stating is that
~~~~

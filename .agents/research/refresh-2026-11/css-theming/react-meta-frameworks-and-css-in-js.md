---
title: Delta 2026-08-30 to 2026-11-27 - React meta-frameworks and CSS-in-JS libraries
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 17
---

# Delta: React meta-frameworks and CSS-in-JS libraries

## Scope

This is a delta against the baseline research and the depth files `skills/css-theming-reference/css-modules.md` and `css-in-js.md`. It covers Next.js, Nuxt, React Router, vanilla-extract, StyleX, styled-components, Emotion and Panda. Where upstream did not change, the existing text stays. Release dates come from the npm registry `time` field (`npm view <pkg> time`). Where a claim could be tested cheaply it was re-measured in a scratch project with the new version; those measurements are marked "re-measured".

## Summary

- One claim is now wrong: the Turbopack CSS Modules class shape is no longer `.name-module___hash__name`. Next 16.4.0 (2026-10-06) changed it, and 16.4.6 re-measured emits `.BEMHdq_page`.
- No config key moved out of `experimental`. `experimental.inlineCss` and `experimental.cssChunking` are unchanged in key, default and values. No Next 17 shipped; npm `latest` is 16.4.6 and 16.5.0 is only a preview.
- Both opposite `:global` build errors reproduce unchanged on Next 16.4.6.
- No library changed its default output in a way that falsifies a depth-file claim. styled-components 6.7.0 and Emotion 11.14.0 behave as claimed.
- Pins to bump (versions only, text otherwise holds): Next 16.3.3 to 16.4.6, Nuxt 4.5.2 to 4.7.0, React Router 8.3.1 to 8.5.3, StyleX 0.19.0 to 0.19.2, vanilla-extract 1.21.2 to 1.21.3, styled-components 6.5.3 to 6.7.0, Panda 1.12.0 to either 1.12.3 (v1 line) or 2.6.0 (v2, with a new preset requirement).
- Open question answered: the StyleX bundler plugins do document `useCSSLayers`.

## Findings by claim

### css-modules.md

**1. "three `next build` runs at 16.3.3, Nuxt 4.5.2, React Router 8.3.1" - unchanged as history, pins stale.**
Latest versions at 2026-11-27: Next 16.4.6 (2026-11-09), Nuxt 4.7.0 (2026-11-23), React Router 8.5.3 (2026-11-24). The "reproduced from" sentence stays true of what was measured; if the file is re-measured it should name the new versions. Nuxt 4.7.0 release notes list only inline-style and Vite link fixes ([v4.7.0](https://github.com/nuxt/nuxt/releases/tag/v4.7.0)). React Router 8.4.0 to 8.5.3 has one CSS entry, a dev-only critical-CSS collection fix in 8.5.0 ([CHANGELOG](https://raw.githubusercontent.com/remix-run/react-router/main/CHANGELOG.md)). Neither touches CSS Modules output.

**2. Turbopack hash shape `.name-module___hash__name` - CHANGED.**
- Old text: Next / Turbopack emits `.page-module___8aEwW__page`; the shape is `name-module___hash__name`.
- New fact: from Next 16.4.0 Turbopack uses Lightning CSS's `[hash]_[local]` pattern in non-dev builds. Re-measured on `next@16.4.6` with `.page{color:red}` in `app/p.module.css`: `.BEMHdq_page{color:red}`. The hash is derived from the full file path; the long form is kept only in dev "to aid in debugging".
- Source: [vercel/next.js#97944](https://github.com/vercel/next.js/pull/97944), merged 2026-08-27 into canary; shipped in [v16.4.0](https://github.com/vercel/next.js/releases/tag/v16.4.0) (2026-10-06, "Turbopack now shortens CSS module class names").
- Consequence: the table row `Next / Turbopack | .page-module___8aEwW__page` must read `.BEMHdq_page` for Next 16.4+, and the sentence "`_name_hash_n` versus `name-module___hash__name`" must say the long shape applies to Next up to 16.3.x and to dev builds. The core point (hash shape is bundler- and version-specific, so a regex written against one misses the other) is strengthened. The shape is also still specificity (0,1,0).
- The same point feeds CSS-API-01 in rules.md ("the CSS Modules hash shape differs by bundler"): still true, add "and by Next minor".

**3. `experimental.inlineCss` "exact, unmoved key ... default `false`" - unchanged.**
Re-measured in `next@16.4.6`: `dist/server/config-shared.js` has `inlineCss: false` under `experimental`, and `config-schema.js` has `inlineCss: z.boolean().optional()` under the experimental object. The docs page still carries the Experimental badge and `experimental: { inlineCss: true }` ([inlineCss docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss), lastUpdated 2026-03-03). Only the pin "16.3.3" changes.

**4. `cssChunking` values - unchanged, with one addition.**
The docs ([cssChunking](https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking), lastUpdated 2026-07-15, before the window) still say: `true` default, both bundlers; `false` webpack only; `'strict'` webpack only; `'graph'` Turbopack only. The key is still `experimental.cssChunking` (default `true` in `config-shared.js` at 16.4.6). Addition: `'graph'` also accepts an object `{ type: 'graph', requestCost, weightDistribution }` (defaults 20000 and 0.1). The depth file does not mention the object form, so it can stay silent or add one clause. No claim in it is falsified.

**5. The two opposite `:global` errors - unchanged (re-measured).**
- Turbopack, `:global{color:blue}` bare block in a `.module.css`: build fails, "Parsing CSS source code failed ... Ambiguous CSS module class not supported". Same on 16.4.6.
- Turbopack, `:global(.a){...}` fully-global rule: compiles clean (as before).
- Webpack (`next build --webpack`), `:global(.a){...}`: `Syntax error: Selector ":global(.a)" is not pure (pure selectors must contain at least one local class or id)`. Same on 16.4.6.
Note for the cited claim: the Turbopack message text names "Ambiguous CSS module class", so a grep on the message should key on that phrase.

### css-in-js.md

**6. "vanilla-extract 1.21.2 and StyleX 0.19.0" - versions stale, no behaviour change.**
- vanilla-extract `@vanilla-extract/css` 1.21.3 (2026-10-08): three patch items only (`deepmerge` replaced by `deepmerge-ts`, class-name search index built lazily, `modern-ahocorasick` bump). Nothing about `layer()`, `@layer` or names ([CHANGELOG](https://raw.githubusercontent.com/vanilla-extract-css/vanilla-extract/master/packages/css/CHANGELOG.md)).
- StyleX 0.19.1 (2026-09-15) and 0.19.2 (2026-11-11/12) are patches. 0.19.2 keeps custom property rules inside `@layer`, fixes `positionTry` duplication, and fixes unplugin injection issues ([CHANGELOG](https://raw.githubusercontent.com/facebook/stylex/main/CHANGELOG.md)). No StyleX 0.20 or 1.0 exists; npm `latest` is 0.19.2.

**7. "styled-components 6.5.3 ... stylis 4.3.6 and `stylisPlugins`" - pin stale, claims hold.**
Latest stable is 6.7.0 (2026-11-24); 6.6.0 was 2026-10-12; a 7.0.0 prerelease line exists (`test` tag, 2026-11-26) but is not `latest`. 6.7.0 still depends on `stylis` 4.3.6 (`npm view styled-components@6.7.0 dependencies`), even though stylis 4.4.0 was published 2026-04-19. `stylisPlugins` on `StyleSheetManager` still works; 6.7.0 adds `configureServerStyles({ stylisPlugins })` for server components and fixes concurrent requests losing `stylisPlugins` ([releases](https://github.com/styled-components/styled-components/releases)). Output changes in 6.7.0: `fontSizeAdjust`, `hyphenateLimitChars`, `initialLetter`, `mathDepth`, `shapeImageThreshold` and `maskBorder*` numbers now render unitless, which changes class hashes for components using them; irrelevant to the depth file's measured case.

**8. styled-components "no `react-server` export condition", builds clean in a Server Component - unchanged (re-measured).**
`package.json` of both 6.5.3 and 6.7.0 has no `exports` field at all (so no `react-server` condition). A Server Component with `styled.div` and no directive builds clean on `next@16.4.6` Turbopack with 6.7.0. Watch item: the 7.0 prerelease notes remove inline server `<style>` tags and `stylisPluginRSC` and require a style registry for server styles, so the "SSRs `<style data-styled="">` inline" sentence is a 6.x statement and would not hold at 7.x. 7.0 is not stable, so no change now.

**9. Emotion 11.14.x throws `createContext` TypeError without "use client" - unchanged (re-measured).**
No Emotion release in the window; `@emotion/react` latest is still 11.14.0 (2024-12-09). On `next@16.4.6`, `@emotion/react@11.14.0` with a `css` prop in a Server Component fails at "Collecting page data": `TypeError: f.createContext is not a function`. Same error, different minified identifier (`f` instead of `n`). The depth file should quote `createContext is not a function` without the minified letter, since the letter is bundler-dependent.

**10. StyleX `useCSSLayers` default false, `:not(#\#)` padding at default - unchanged; key name unchanged.**
- `@stylexjs/postcss-plugin` README: `useCSSLayers` boolean, default `false`, "switches Stylex from using `:not(#\#)` to using `@layers`" ([README](https://raw.githubusercontent.com/facebook/stylex/main/packages/@stylexjs/postcss-plugin/README.md)).
- The babel-plugin docs describe the underlying `useLayers` (default `false`, `boolean | { before, after, prefix }`) and state that bundler plugins "expose this as `useCSSLayers`" ([docs](https://stylexjs.com/docs/api/configuration/babel-plugin/)).
- No `useCSSLayers` or `:not(#\#)` appears in the 0.19.1 or 0.19.2 changelog entries.
- Open question answered (positive): `@stylexjs/unplugin` documents `useCSSLayers` ("boolean, emit CSS layers") as the only layers option, shared across its bundlers ([unplugin README](https://raw.githubusercontent.com/facebook/stylex/main/packages/@stylexjs/unplugin/README.md)). The README does not state a default, so the postcss-plugin's `false` cannot be assumed for it without a build. The key name is the same on both plugins. What remains unmeasured: an actual webpack, rollup or Vite build with `@stylexjs/unplugin`, and whether the unplugin default matches. Treat as "documented, not measured".

**11. vanilla-extract `layer()` emits a hashed name - could not determine for 1.21.3, no upstream sign of change.**
The 1.21.3 changelog lists no layer or naming change, and the 1.21.2 identifier change (dots to underscores in debug identifiers) predates the window. No build of 1.21.3 was run. Keep the claim, pin it to 1.21.2 as measured.

**12. Panda `_dark` compiles to `.dark` - unchanged on 1.12.x per baseline; re-measured true on 2.6.0, with a new setup requirement.**
Panda 2.0.0 shipped 2026-09-29 (ESM-only, Node 22+, Rust engine) and `latest` is now 2.6.0 (2026-11-19); the v1 line continues as 1.12.3 (2026-11-19, tag `v1`). On 2.6.0 with a minimal config, `_dark` produced `unknown_condition`, a warning and no CSS, until `presets: ['@pandacss/preset-base', '@pandacss/preset-panda']` was set. With presets, output is `.dark .dark\:c_blue { ... }`. The upgrade guide states `@pandacss/preset-base` is no longer added automatically ([upgrade guide](https://panda-css.com/docs/get-started/upgrading-to-v2), [2.0.0 notes](https://github.com/chakra-ui/panda/releases/tag/%40pandacss%2Fdev%402.0.0)). Other v2 output changes that matter to this file: variables are now set through `@property`, selectors of equal specificity sort by text not source order, and the universal variable reset is gone. The depth file's Panda claim is pinned to 1.12.0 and stays correct for 1.x; the v2 note is new information.

### rules.md

**13. CSS-CAS-01 (StyleX at plugin default pads to (2,1,0)-(3,1,0); runtime CSS-in-JS appends to head) - unchanged.** The StyleX default and padding text are unchanged (finding 10). Runtime-injection behaviour is unchanged on styled-components 6.7.0. The 7.0 prerelease changes tie-breaking (globals first, wrapping components win ties), so the "win ties from position" wording is a 6.x statement.

**14. CSS-API-01 (hashed names, `layer('components')` emitted `@layer uan7er0`, CSS Modules hash shape differs by bundler) - one edit.** The CSS Modules sentence stays true but is now also version-dependent (finding 2). The vanilla-extract layer sentence is not contradicted (finding 11). The styled-components `sc-` id claim was not re-tested.

## Normative guidance candidates

1. **Re-state the CSS Modules hash-shape fact as version-specific.** Rule: when a gate or a test matches a CSS Modules class, match on the compiled output of the pinned bundler version, never on a literal shape; Next Turbopack emits `[hash]_[local]` from 16.4.0 and `name-module___hash__name` before. Rationale: the shape changed in a minor release inside one bundler. Verification: grep the repo's tests, docs and gate scripts for `-module___` and for a hard-coded `_[A-Za-z0-9]{6}_` regex; each hit must be justified by a pinned Next version.
2. **Add the `cssChunking` object form to the reference only if the depth file lists config shapes.** Rationale: it is the one new option shape in the window. Verification: `grep -n "requestCost" skills/css-theming-reference/css-modules.md`.
3. **Quote the Emotion failure as `createContext is not a function`.** Rationale: the minified identifier differs per bundler (`n` versus `f`). Verification: `grep -n "n.createContext" skills/css-theming-reference/css-in-js.md` returns nothing after the edit.
4. **State the StyleX layers key for every bundler plugin.** Rule: `useCSSLayers` is the key on `@stylexjs/postcss-plugin` and is documented on `@stylexjs/unplugin`; the default is documented as `false` only for the postcss plugin. Rationale: the open question is answered in documentation but not measured. Verification: `grep -rn "useCSSLayers" <consumer repo>` shows the key set where the repo claims consumer overridability; a built stylesheet contains `@layer priority1`.
5. **Scope the styled-components RSC sentences to 6.x.** Rationale: the 7.0 prerelease removes inline server `<style>` tags and requires a registry. Verification: `npm ls styled-components` reports a 6.x version before the "builds clean, SSRs inline style" sentence is relied on.
6. **Panda: add "v2 needs `@pandacss/preset-base` for `_dark`".** Rationale: without it `_dark` is an `unknown_condition` warning and emits nothing, a silent loss of the dark rule. Verification: `panda cssgen` diagnostics count is 0 and `grep -c '\.dark' out.css` is above 0.

## AI-agent angle

- An agent trained before 2026-10 writes the Turbopack hash as `name-module___hash__name`; the check is to read the built CSS (`find .next -name '*.css' -not -path '*/cache/*'`), never a remembered shape.
- An agent upgrading Panda to `latest` gets 2.x, where a copied v1 config silently drops `_dark` (warning only) and needs Node 22; the check is `panda cssgen` diagnostics.
- An agent assumes `experimental.inlineCss` or `cssChunking` graduated with Next 16.4; it did not. The check is `grep -n "inlineCss\|cssChunking" node_modules/next/dist/server/config-shared.js`.
- An agent assumes styled-components 7 is current; `latest` is 6.7.0 and the 7.0 line is a prerelease.

## Contested / evolving

- styled-components 7.0 (prerelease as of 2026-11-26) reworks server styles, ordering and `@layer` first-appearance behaviour; the depth file's RSC and layer sentences will need a re-check when it goes stable.
- Panda 2.x is on a fast release cadence (2.0.0 to 2.6.0 in eight weeks) and moved variable and selector ordering; the 1.12.x pin is now a deliberate choice, not "latest".
- Next 16.5.0 is at `preview.0` (2026-11-26, canary 70). Nothing in the window says CSS config keys will move, but graduation was not checked in the 16.5 canary notes.
- Not determined: vanilla-extract `layer()` naming on 1.21.3 (no build run); StyleX `@stylexjs/unplugin` default for `useCSSLayers` (undocumented); the Next 16.4.1 to 16.4.6 patch notes and the second half of the React Router changelog were not read; only the 16.4.0 notes and the re-measured behaviour back the Next claims.

## Pins to bump

| Pin | Old | New | Behaviour-changing? |
|---|---|---|---|
| Next | 16.3.3 | 16.4.6 | yes (hash shape) |
| Nuxt | 4.5.2 | 4.7.0 | no |
| React Router | 8.3.1 | 8.5.3 | no |
| vanilla-extract css | 1.21.2 | 1.21.3 | no |
| StyleX | 0.19.0 | 0.19.2 | no |
| styled-components | 6.5.3 | 6.7.0 | no (stylis stays 4.3.6) |
| Emotion | 11.14.x | 11.14.0 (unchanged) | no |
| Panda | 1.12.0 | 1.12.3 (v1) or 2.6.0 (v2) | v2 yes |

A pin may only be bumped in the depth files after the corresponding measurement is repeated at the new version; the re-measurements above cover Next 16.4.6, styled-components 6.7.0, Emotion 11.14.0 and Panda 2.6.0 for the cited claims only.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/vercel/next.js/pull/97944 | PR shortening Turbopack CSS module names | merged 2026-08-27 | primary, the hash-shape change |
| https://github.com/vercel/next.js/releases/tag/v16.4.0 | Next 16.4.0 notes | 2026-10-06 | primary, shipping release |
| https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss | inlineCss docs | updated 2026-03-03 | primary, key location |
| https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking | cssChunking docs | updated 2026-07-15 | primary, values and bundlers |
| https://registry.npmjs.org (via `npm view next time`, dist-tags) | Next release dates and tags | to 2026-11-27 | primary, no Next 17 |
| next@16.4.6 scratch build | re-measurement of hash, `:global` errors, config keys, styled-components and Emotion RSC | 2026-11-27 | primary, measured |
| https://github.com/nuxt/nuxt/releases/tag/v4.7.0 | Nuxt 4.7.0 notes | 2026-11-23 | primary |
| https://raw.githubusercontent.com/remix-run/react-router/main/CHANGELOG.md | React Router 8.4.0 to 8.5.3 | 2026-09 to 2026-11 | primary |
| https://raw.githubusercontent.com/facebook/stylex/main/CHANGELOG.md | StyleX 0.19.1, 0.19.2 | 2026-09-15, 2026-11-11 | primary |
| https://raw.githubusercontent.com/facebook/stylex/main/packages/@stylexjs/postcss-plugin/README.md | `useCSSLayers` default | current main | primary |
| https://raw.githubusercontent.com/facebook/stylex/main/packages/@stylexjs/unplugin/README.md | unplugin options | current main | primary, answers open question |
| https://stylexjs.com/docs/api/configuration/babel-plugin/ | `useLayers` and bundler key mapping | current | primary |
| https://raw.githubusercontent.com/vanilla-extract-css/vanilla-extract/master/packages/css/CHANGELOG.md | vanilla-extract 1.21.3 | 2026-10-08 | primary |
| https://github.com/styled-components/styled-components/releases | styled-components 6.7.0 and 7.0 prerelease | 2026-11-24 | primary |
| styled-components@6.5.3 and 6.7.0 tarballs (`npm pack`) | package.json has no `exports` | 2026-11-27 | primary, measured |
| https://github.com/chakra-ui/panda/releases/tag/%40pandacss%2Fdev%402.0.0 | Panda 2.0.0 notes | 2026-09-29 | primary |
| https://panda-css.com/docs/get-started/upgrading-to-v2 | Panda 2 upgrade guide | current | primary |
| @pandacss/dev@2.6.0 scratch build | `_dark` output | 2026-11-27 | primary, measured |

Attempted and failed: the GitHub REST releases API (rate limit exceeded), the styled-components changelog on `main` (covered only up to 6.4.1), and `unpkg.com/.../CHANGELOG.md` (404). Releases pages were used instead.

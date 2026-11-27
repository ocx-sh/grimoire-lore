---
title: Delta research, Astro / Vue / VitePress / Svelte / Vite emitted CSS shapes
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 22
---

# Delta: what changed 2026-08-30 to 2026-11-27 for the Vite-based SFC surfaces

This is a delta against the baseline research. Anything marked "unchanged" means no primary source in the window contradicts the depth-file text. Nothing here was built: every verdict comes from changelogs, registry metadata, docs pages, upstream source files and the published npm tarballs. A "fresh build" is needed wherever the claim is about bytes a production build emits.

GitHub's REST API was rate-limited during the run (shared quota), so release notes were read from the raw `CHANGELOG.md` files on the default branch plus npm registry metadata, not from the release pages.

## Contents

1. Summary
2. Newest stable versions
3. Claims at risk, per framework
4. Pins to bump versus claims to re-confirm by build
5. Normative guidance candidates
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- No emitted shape, default or layer behaviour listed in the commission was changed in the window, except two items: the VitePress `--vp-*` count and the Svelte hash description (see below).
- Astro newest stable is 7.4.13 (2026-11-18); baseline 7.2.9 was published 2026-08-27. `scopedStyleStrategy` default is still `'attribute'`, `image.responsiveStyles` default is still `false`.
- `@astrojs/compiler-rs` moved 0.4.0 to 0.5.3. Two entries touch scoping markup: 0.5.0 (2026-09-22) merges the scope class into component `className` for the `class` and `where` strategies, and 0.5.3 (2026-11-09) stops injecting legacy `astro-<hash>` classes into spread attributes under `attribute`. Neither changes the CSS selector tuples in the table.
- Vue newest stable is 3.5.46 (2026-11-20). Vue 3.6 (Vapor) has NOT shipped stable: `3.6.0-rc.17` was published 2026-11-27. No 3.6 rc entry changes scoped-CSS, `:deep()`, `:slotted()` or `v-bind()` mechanics.
- VitePress 2.0 has NOT gone stable. Newest is `2.0.0-alpha.21` (2026-10-25); `latest` on npm is still 1.6.4. `@layer __vitepress_base` is unchanged in alpha.21.
- The "exactly 228 distinct `--vp-*` properties on both lines" claim is stale for 2.x: alpha.21 declares 21 more `--vp-*` properties than alpha.19 by the same counting method.
- Svelte newest stable is 5.59.2 (2026-11-25); `@sveltejs/vite-plugin-svelte` 7.3.2 (2026-11-23). The `css` option is still only `'injected' | 'external' | fn`; no layer option exists.
- The Svelte hash sentence is inaccurate in the baseline and was never true of the current code: the default `cssHash` hashes the filename when one is known, and the style content only when the filename is `(unknown)`. This predates the window (svelte 5.38.9).
- Vite newest stable is 8.4.0 (2026-11-26). 8.3.0 (2026-09-10) added "minify style tag" for HTML. Astro 7.4.13 now requires `vite ^8.3.8`, so any fresh build is no longer on the baseline 8.2.2.

## Findings

### 1. Newest stable versions and baseline pins

| Package | Baseline pin | Newest stable at 2026-11-27 | Date | Note |
|---|---|---|---|---|
| astro | 7.2.9 | 7.4.13 | 2026-11-18 | 7.2.9 was 2026-08-27 per npm registry |
| `@astrojs/compiler-rs` | 0.4.0 | 0.5.3 | 2026-11-09 | astro 7.4.13 depends on `^0.5.3` |
| vite | 8.2.2 | 8.4.0 | 2026-11-26 | 8.2.2 was 2026-08-20; astro 7.4.13 needs `^8.3.8`, vitepress alpha.21 needs `^8.3.4` |
| vue | 3.5.42 | 3.5.46 | 2026-11-20 | 3.6.0-rc.17 is a pre-release (dist-tag `rc`) |
| vitepress 1.x | 1.6.4 | 1.6.4 | 2025-08-05 | still npm `latest` |
| vitepress 2.x | 2.0.0-alpha.19 | 2.0.0-alpha.21 | 2026-10-25 | dist-tag `next`; not stable |
| svelte | 5.57.0 | 5.59.2 | 2026-11-25 | 5.57.0 was 2026-08-28 |
| `@sveltejs/vite-plugin-svelte` | 7.3.0 | 7.3.2 | 2026-11-23 | peer `vite ^8.0.0-beta.7 \|\| ^8.0.0` |

Sources: [npm astro](https://registry.npmjs.org/astro), [npm vue](https://registry.npmjs.org/vue), [npm vitepress](https://registry.npmjs.org/vitepress), [npm svelte](https://registry.npmjs.org/svelte), [npm vite-plugin-svelte](https://registry.npmjs.org/@sveltejs/vite-plugin-svelte), [npm vite](https://registry.npmjs.org/vite), [npm compiler-rs](https://registry.npmjs.org/@astrojs/compiler-rs), [astro 7.4.13 manifest](https://registry.npmjs.org/astro/7.4.13).

### 2. Astro (skills/css-theming-reference/astro.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "astro 7.2.9 / vite 8.2.2 / compiler-rs 0.4.0" | changed (pins only) | Newest are 7.4.13 / 8.4.0 (astro pulls `^8.3.8`) / 0.5.3. Table 1. |
| `scopedStyleStrategy` table, `attribute` default | unchanged | The config reference still lists default `'attribute'` with values `where`, `class`, `attribute`; descriptions "causing no specificity increase" for `where`, "+1 specificity increase" for `class` and `attribute`. [Config reference](https://docs.astro.build/en/reference/configuration-reference/), read 2026-11-27. Selector shape (`.foo[data-astro-cid-x]`, `.foo.astro-x`, `.foo:where(.astro-x)`) is not restated by the docs; the astro styling guide still shows `h1[data-astro-cid-hhnqfkh6]`. [Styling guide](https://docs.astro.build/en/guides/styling/). |
| Compiler-rs scoping side effects | changed (markup, not CSS) | 0.5.0 (2026-09-22): "`scopedStyleStrategy` values that emit a scope class (`class` and `where`) now merge the scope class into a component's `className` prop". 0.5.3 (2026-11-09): "Prevent legacy `astro-<hash>` classes from being injected into spread attributes when `scopedStyleStrategy` is set to `attribute`." 0.4.1 (2026-09-15): "`:global()` not being stripped ... when nested inside `:has()`, `:is()`, `:where()` or `:not()`" is fixed. [compiler-rs changelog](https://raw.githubusercontent.com/withastro/compiler-rs/main/packages/compiler/CHANGELOG.md). |
| `@layer astro.images` needs `image: { responsiveStyles: true }`, default `false` | unchanged | Config reference: `image.responsiveStyles` default `false`, "Whether to automatically add global styles for responsive images." The page does not mention `@layer astro.images`. Astro 7.3.x entry: "Fixes `image.responsiveStyles` emitting invalid `object-position` CSS values for same-axis keyword pairs" (patch, no default change). [astro changelog](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/CHANGELOG.md). Line numbers cited in the depth file (`defaults.js:24`, `vite-plugin-assets.js:172`) were not re-checked; the file path I tried on `main` returned nothing, so those citations should be re-read at 7.4.13. |
| view-transition `@layer astro` needs `transition:*`, lands in inline `<style>` | unchanged by changelog, re-confirm by build | 7.3.x entries: "Improves serialization of transition animation values in generated CSS" and "Fixes custom View Transition direction names that are not valid CSS identifiers"; 7.4.x: "Fixes `transition:name` styles missing in dev ...". These touch generated values and dev, not the layer, the trigger, or the inline placement. |
| `is:inline` behaviour (unbundled, unminified) | unchanged by Astro, one Vite risk | The styling guide still describes `is:inline` raw CSS as "read directly from disk without being bundled or optimized by Astro". Vite 8.3.0 (2026-09-10) added "minify style tag" ([#23183](https://github.com/vitejs/vite/pull/23183), merged 2026-08-21, description only "Minify style tag in HTML"). Astro renders its own HTML so this probably does not reach `is:inline`, but the PR text does not say, so "unminified" must be re-measured on a build. |

Other Astro entries in the window that touch CSS but not the claims: 7.4.x "Fixes duplicate CSS loading for hydrated islands that share modules"; "Fixes scoped styles of unused Astro components being included in the build when re-exported from a barrel file"; "Fixes spreading an object onto an element with scoped styles changing that object" (a `class` grew per render). The last one means spread plus scoped styles had a bug in `class` growth before 7.4.x; `attribute` strategy output is unaffected.

### 3. Vue (skills/css-theming-reference/vue.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "vue 3.5.42 + vite 8.2.2, vitepress 1.6.4, vitepress 2.0.0-alpha.19" | changed (pins only) | Table 1. |
| `:deep()`, `:slotted()` (`-s` suffix), `v-bind()` inline-style mechanics | unchanged | The SFC CSS features page still states: `.a :deep(.b)` becomes `.a[data-v-f3f3eg9] .b`; `v-bind()` "will be compiled into a hashed CSS custom property ... applied to the component's root element via inline styles". [SFC CSS features](https://vuejs.org/api/sfc-css-features.html). The page does not show the `-s` suffix, so that detail rests on the baseline build, not on this read. 3.5.43 to 3.5.46 compiler-sfc entries are type resolution and warning fixes; the only CSS-variable entries are SSR and teleport coverage fixes (3.5.46: "inject css vars into the content of keep-alive and teleport", "inject css vars through root loops and fragments"). [vue changelog](https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md). |
| Vue 3.6 (Vapor) shipped and changed scoped CSS? | not shipped; no scoped-CSS change in rc | `3.6.0-rc.17` published 2026-11-27; npm dist-tags `alpha 3.6.0-alpha.7`, `beta 3.6.0-beta.17`, `rc 3.6.0-rc.17`, `latest 3.5.46`. Across rc.6 (2026-08-28) to rc.17 the changelog has no scoped, `:deep`, `:slotted` or layer entry; Vapor entries on CSS are runtime `v-bind()` plumbing ("expose $props, $attrs and $slots to css v-bind", "resolve `<style module>` bindings in templates", "apply css vars through vapor root children"). [3.6 changelog at v3.6.0-rc.17](https://raw.githubusercontent.com/vuejs/core/v3.6.0-rc.17/CHANGELOG.md). The SFC docs page does not mention Vapor or `@layer`. |
| VitePress table: 1.x unlayered, 2.x `@layer __vitepress_base` | unchanged | 1.6.4 is still `latest`, still 2025-08-05. In the alpha.21 npm tarball, `dist/client/theme-default/styles/base.css` starts `@layer __vitepress_base {` and that is the only `@layer` in the package; the alpha.19 tarball is identical on that point. The 1.6.4 tarball has no `@layer`. Method: `npm pack vitepress@<v>` then grep. |
| VitePress 2.0 stable? | no | Newest is `2.0.0-alpha.21` (2026-10-25), dist-tag `next`. alpha.20 (2026-09-04) and alpha.21 changelogs are bug fixes plus two features: "add support for asset sharding" and "native rtl support". [vitepress changelog](https://raw.githubusercontent.com/vuejs/vitepress/main/CHANGELOG.md). |
| "Both lines ship exactly 228 distinct `--vp-*` properties" | changed (2.x only, count method differs) | Counting `--vp-*` declarations in the theme-default source and dist of each npm tarball with one regex: 1.6.4 = 223, 2.0.0-alpha.19 = 223, 2.0.0-alpha.21 = 244. This regex gives 223, not 228, so it is not the baseline method (the baseline counted built output); only the differences are comparable. alpha.21 adds 21 declared properties over alpha.19: `--vp-badge-{caution,important,note}-{bg,border,text}` (9), `--vp-c-orange-{1,2,3,soft}` (4), `--vp-direction-mark`, `--vp-direction-multiplier`, `--vp-icon-external-link`, `--vp-local-nav-divider-color`, `--vp-nav-backdrop-filter`, `--vp-nav-col-offset`, `--vp-nav-divider-color`, `--vp-nav-home-bg-color`. None removed. So the equal-count sentence can only be kept for 1.6.4 vs alpha.19; against alpha.21 it is false. |

### 4. Svelte (skills/css-theming-reference/svelte.md)

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "svelte 5.57.0 / vite 8.2.2 / vite-plugin-svelte 7.3.0" | changed (pins only) | Table 1. |
| `css` option is only `'injected' \| 'external' \| fn`, no layer setting | unchanged | Compiler docs list `css: 'injected' \| 'external' \| ((options: { filename: string }) => 'injected' \| 'external')` default `'external'`, `cssHash`, `cssOutputFilename`; "None" for any layer option. `validate-options.js` on `main` rejects everything but `"external"` and `"injected"` ("css should be either "external" (default, recommended) or "injected""). [Compiler docs](https://svelte.dev/docs/svelte/svelte-compiler), [validate-options.js](https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/validate-options.js). The preprocess remedy stands. |
| Deletion of unused selectors, `css_unused_selector` warning | unchanged | `warnings.js` on `main` still defines `css_unused_selector` ("Unused CSS selector"); the CSS transform still prunes unused selectors (`state.code.remove(...)`, `/* (unused) ` comment in dev). Window fix 5.58.1 (2026-11-20): "ignore commas in comments when removing unused CSS selectors". The scoped-styles docs page does not mention unused-selector removal, so the evidence is source, not prose. [warnings.js](https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/warnings.js), [css transform](https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/phases/3-transform/css/index.js). |
| Hash derived from (filename, style content) | wrong in baseline (not a window change) | Default `cssHash` in `validate-options.js`: `` `svelte-${hash(filename === '(unknown)' ? css : (filename ?? css))}` ``. Svelte changelog 5.38.9: "generate CSS hash using the filename (#16740)". So with a real filename the hash does not depend on style content; content is used only when the filename is `(unknown)` (for example `compile()` without `filename`). The docs say "`svelte-${hash(filename ?? css)}`". The scoped-styles page still says "based on a hash of the component styles (e.g. `svelte-123xyz`)", which is out of date relative to the source. Consequence for the depth file: "renaming or moving a file rotates every hash" is right; "editing the style rotates the hash" is wrong when a filename is present. |
| `svelte-package` runs the preprocessor | unchanged (limited evidence) | `@sveltejs/package` 3.0.x entries: "exit after packaging when preprocessors leave resources running" (3.0.2), "transform import aliases into relative imports" (3.0.0). Preprocessing is still part of packaging; the changelog entries are undated in the file, so I cannot place them in the window. |
| Scope class specificity, `:where(.svelte-x)` for later compounds | unchanged | Scoped-styles docs: "specificity increase of 0-1-0"; "after the first occurrence it is added with `:where(.svelte-xyz123)`". Window changelog entries on CSS are comment-handling and global-CSS fixes only (5.57.1 "preserve global CSS in components without scopable elements"; 5.57.3/5.58.x "escape comment terminators in all commented-out CSS"; "treat `<!--` and `-->` in `<style>` as CSS tokens"). [svelte changelog](https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/CHANGELOG.md). |

vite-plugin-svelte 7.3.1 and 7.3.2 changelogs contain no CSS entry (inspector deprecation, build stats logging, a Vite+ inspector fix). [changelog](https://raw.githubusercontent.com/sveltejs/vite-plugin-svelte/main/packages/vite-plugin-svelte/CHANGELOG.md).

### 5. Vite (shared)

Window releases 8.2.2 to 8.4.0, CSS-related entries only. [vite changelog](https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md).

| Version (date) | Entry | Bearing on depth files |
|---|---|---|
| 8.3.0 (2026-09-10) | "css: minify style tag" (#23183) | Possible effect on inline `<style>` in HTML; re-measure `is:inline` and view-transition `<style>` on Astro. |
| 8.4.0 (2026-11-26) | "css: skip emitting empty CSS files" (#24059) | A build with only empty CSS emits no `.css`; gates that assert a CSS file exists need a re-run. |
| 8.4.0 | "migrate to `dev.sourcemap.css` from `css.devSourcemap`" (#23765) | Config rename, dev only. |
| 8.3.x / 8.4.0 | "dedupe CSS of inlined common chunks when `cssCodeSplit: false`" (#24168), "reject CSS entrypoints when `build.cssCodeSplit: false`" (#23112), "no-externalize by default even for SSR" (#24075) | Chunking edge cases. Not layer or shape. |
| 8.3.x | "resolve imported preprocessors from their file path with lightningcss" (#23688) | No default change. |

No entry in the window changes the `cssMinify` default, the lightningcss default, or adds layer handling. The claim "Vite 8 minifies CSS with ..." (whatever css-modules.md and rules.md assume) is neither confirmed nor refuted: I did not fetch the Vite `build.cssMinify` docs page, so that default is "could not determine" from this run.

### 6. rules/css-theming.md surface table

Rows for Astro, Vue, VitePress 1.x and 2.x, and Svelte 5: no shape or layer text needs to change. The only candidates are the pin figures if the table quotes versions (re-check), and the VitePress 2.x row if it says "stable" or "2.0" without "alpha".

## Pins to bump versus claims to re-confirm by build

Bump only (upstream facts unchanged):
- astro 7.2.9 to 7.4.13; compiler-rs 0.4.0 to 0.5.3; vite 8.2.2 to 8.4.0 (or state the range astro/vitepress pull); vue 3.5.42 to 3.5.46; vitepress 2.0.0-alpha.19 to alpha.21 (1.6.4 stays); svelte 5.57.0 to 5.59.2; vite-plugin-svelte 7.3.0 to 7.3.2.
- Add one sentence to vue.md: Vue 3.6 / Vapor is at `3.6.0-rc.17` and was not evaluated.
- Add one sentence to vue.md: VitePress 2.0 remains alpha (`next` dist-tag).

Text to correct without a build:
- svelte.md hash sentence: filename only when a filename is known, style content only for `(unknown)` filenames (source cited above). Also reword the "Renaming ... rotates" paragraph accordingly.
- vue.md "Both lines ship exactly 228": restrict to 1.6.4 vs alpha.19 or restate as "223 to 244 depending on line and alpha". The exact figure needs the baseline's counting method, which I do not have.

Fresh build needed to re-confirm:
- Astro: `is:inline` unminified and byte-for-byte (Vite 8.3.0 minify style tag); view-transition `@layer astro` still inline and outside bundled CSS; `@layer astro.images` still opt-in at 7.4.13 (re-read `defaults.js` line and `vite-plugin-assets.js` line); the three `scopedStyleStrategy` shapes under compiler-rs 0.5.3 (especially the `class` and `where` merge into `className` and the spread change).
- VitePress 2.x alpha.21: distinct `--vp-*` count by the baseline's own method; `@layer __vitepress_base` still first in built CSS.
- Vue: nothing needs rebuilding for 3.5.x; a 3.6 build is only needed if a Vapor surface is added.
- Svelte: no emitted-shape claim needs rebuilding; a single `grim`-style build confirms the hash does not change when only style content changes, which would settle the correction above empirically.

## Normative guidance candidates

1. Quote the `--vp-*` count only with its counting method and the exact VitePress version. Rationale: the count moved from 223 to 244 across two alphas by one method. Verify: `npm pack vitepress@<v>`, then `grep -rhoE '(^|[ ;{])--vp-[a-zA-Z0-9-]+\s*:' package/dist/client/theme-default package/src/client/theme-default | tr -d ' ;{:' | sort -u | wc -l`.
2. State the Svelte scope hash as "a function of the filename; content only when the filename is unknown". Rationale: the default `cssHash` is `hash(filename === '(unknown)' ? css : (filename ?? css))`. Verify: read `packages/svelte/src/compiler/validate-options.js` for the `cssHash` default.
3. Do not call VitePress 2 "stable" in any rule row; use "2.0.0-alpha.N". Rationale: npm `latest` is 1.6.4 and `next` is `2.0.0-alpha.21`. Verify: `npm view vitepress dist-tags`.
4. A gate that requires a built CSS file must tolerate Vite 8.4's "skip emitting empty CSS files". Rationale: #24059. Verify: grep the gate for an unconditional `dist/**/*.css` existence assertion.
5. Re-measure Astro `is:inline` after any Vite bump at or above 8.3.0. Rationale: Vite now minifies HTML style tags and the Astro interaction is undocumented. Verify: build a page with an `is:inline` block containing newlines and compare bytes in `dist/**/*.html`.

## AI-agent angle

- An agent will say VitePress 2.0 is released because training data pre-dates the alphas. Check: `npm view vitepress dist-tags`.
- An agent will say Svelte has a `css: 'layer'` or `cssLayer` option or that Vue 3.6 changes scoped CSS. Neither exists in the window sources. Check: grep the compiler docs and `validate-options.js` for `layer`.
- An agent will tell users that editing a Svelte style rotates the class hash. Check: `cssHash` default in `validate-options.js`.
- An agent will pin `vite 8.2.2` because the depth file says so; astro 7.4.13 requires `^8.3.8`, so the lockfile will resolve higher. Check: `npm view astro@7.4.13 dependencies.vite`.

## Contested / evolving

- Vue 3.6 / Vapor: in release-candidate churn (rc.17 on the research date, roughly weekly rc cuts). Its scoped-CSS output could still move before a stable tag. As of 2026-11-27 no scoped-CSS change.
- VitePress 2.0: still alpha, about 6-10 weeks between alphas (alpha.19 2026-08-02, alpha.20 2026-09-04, alpha.21 2026-10-25). Theme variable set is still growing (+21 in two alphas).
- Astro compiler-rs: now on 0.5.x with scoping-related changes in minor releases; the `class` and `where` strategies are the ones being touched.
- Vite HTML style-tag minification: introduced 2026-09-10; unclear whether it reaches framework-rendered HTML.

## Sources

| URL | What it is | Date / era | Why read |
|---|---|---|---|
| https://raw.githubusercontent.com/withastro/astro/main/packages/astro/CHANGELOG.md | astro changelog | to 2026-11-18 | window entries 7.2.10 to 7.4.13 |
| https://raw.githubusercontent.com/withastro/compiler-rs/main/packages/compiler/CHANGELOG.md | compiler-rs changelog | 0.4.1 to 0.5.3, 2026-09 to 2026-11 | scoping changes |
| https://docs.astro.build/en/reference/configuration-reference/ | Astro config reference | live 2026-11-27 | defaults for `scopedStyleStrategy`, `image.responsiveStyles` |
| https://docs.astro.build/en/guides/styling/ | Astro styling guide | live | `is:inline`, `is:global`, cid output |
| https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md | vue 3.5.x changelog | to 2026-11-20 | CSS-var fixes |
| https://raw.githubusercontent.com/vuejs/core/v3.6.0-rc.17/CHANGELOG.md | vue 3.6 rc changelog | rc.6 to rc.17 | Vapor status |
| https://vuejs.org/api/sfc-css-features.html | Vue SFC CSS docs | live | `:deep`, `:slotted`, `v-bind()` |
| https://raw.githubusercontent.com/vuejs/vitepress/main/CHANGELOG.md | vitepress changelog | alpha.20, alpha.21 | stability, theme changes |
| https://registry.npmjs.org/vitepress (and `npm pack` of 1.6.4, alpha.19, alpha.21) | npm metadata and tarballs | 2026-11-27 | layer and `--vp-*` count |
| https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/CHANGELOG.md | svelte changelog | 5.57.1 to 5.59.2 | CSS entries |
| https://svelte.dev/docs/svelte/svelte-compiler | CompileOptions docs | live | `css`, `cssHash` |
| https://svelte.dev/docs/svelte/scoped-styles | scoped styles docs | live | specificity, hash wording |
| https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/validate-options.js | option validation source | main | `css` values, `cssHash` default |
| https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/phases/2-analyze/index.js | analyze phase source | main | `cssHash` call site |
| https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/warnings.js | warnings source | main | `css_unused_selector` |
| https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/compiler/phases/3-transform/css/index.js | CSS transform source | main | unused selector pruning |
| https://raw.githubusercontent.com/sveltejs/vite-plugin-svelte/main/packages/vite-plugin-svelte/CHANGELOG.md | plugin changelog | 7.3.1, 7.3.2 | no CSS entry |
| https://raw.githubusercontent.com/sveltejs/kit/main/packages/package/CHANGELOG.md | `@sveltejs/package` changelog | undated head | `svelte-package` preprocessing |
| https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md | vite changelog | 8.2.2 to 8.4.0 | CSS entries |
| https://github.com/vitejs/vite/pull/23183 | Vite "minify style tag" PR | merged 2026-08-21 | description only |
| https://registry.npmjs.org/astro/7.4.13 | astro manifest | 2026-11-18 | dependency ranges |
| https://registry.npmjs.org/ (astro, vue, svelte, vite, vite-plugin-svelte, compiler-rs) | npm registry metadata | 2026-11-27 | publish dates, dist-tags |

Not fetched: Vite `build.cssMinify` / `css.transformer` docs page, the 7.4.13 `defaults.js` and `vite-plugin-assets.js` line numbers, any Vapor docs page. Verdicts depending on them are marked "re-confirm" or "could not determine" above.

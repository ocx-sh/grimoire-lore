# Build probe — Astro (round 2 — reproduced from a fresh scaffold, independent of round-1's grimoire-indexer probe)

Round-2 evidence. Everything below was produced by running a real production
build and reading the emitted bytes; a claim with no artifact behind it is
marked `unverifiable` rather than restated from documentation.

- **Versions installed:** astro@7.2.9, vite@8.2.2, @astrojs/compiler-rs@0.4.0, bun@1.3.10 — read from node_modules/*/package.json in the fresh scaffold (not package.json ranges). Round 1's own compiler probe used astro@7.1.4/vite@8.1.5/compiler-rs@0.3.1 inside grimoire-indexer; behavior matches across both version sets.

## Reproduce

```sh
mkdir -p <scratchpad>/r2/astro && cd <scratchpad>/r2/astro
bunx create-astro@latest . --template minimal --no-install --no-git --skip-houston
bun install
author src/components/Probe.astro with 4 style blocks: plain .foo{color:red}, @layer probe { .bar{color:blue} }, <style is:global>.g{color:green}</style>, <style is:inline>.i{color:purple}</style>; src/pages/index.astro imports and renders it
bun run astro build   # default config: scopedStyleStrategy 'attribute', image.responsiveStyles false
edit astro.config.mjs -> scopedStyleStrategy:'class', rebuild
edit astro.config.mjs -> scopedStyleStrategy:'where', rebuild
revert to attribute; add astro:assets <Image layout="constrained"> + astro.config image:{responsiveStyles:true}, rebuild
separately: revert image config; add astro:transitions <ClientRouter/> plus transition:name/transition:animate="fade" on one element, rebuild (default config)
cat dist/index.html after each build — this scaffold is a single small page so Astro inlines the bundled CSS into <head><style> rather than emitting a separate .css asset file
cd /home/mherwig/dev/grimoire-indexer && npm run build   # tsc + template copy only, exit 0
npx vitest run test/renderer/build.test.ts   # runs a real astro build() against a fixture site in a temp dir and asserts on the emitted CSS asset
```

Artifacts inspected:

- `r2/astro/dist/index.html` (session scratch)
- `r2/astro/src/components/Probe.astro` (session scratch)
- `r2/vitest-full.txt` (session scratch)
- /tmp/probe-attribute.html
- /tmp/probe-class.html
- /tmp/probe-where.html

## Emitted selectors

| Authored | Emitted | Specificity | Notes |
|---|---|---|---|
| `.foo{color:red} (default scopedStyleStrategy)` | `.foo[data-astro-cid-v5njgcdl]{color:red}` | (0,2,0) — one class + one bare attribute selector, not wrapped in :where() | Confirms round-1's claim exactly. Seen verbatim in dist/index.html of a real `astro build`. |
| `.foo{color:red} (scopedStyleStrategy:'class')` | `.foo.astro-v5njgcdl{color:red}` | (0,2,0) — two classes | Confirmed; element gets class="foo astro-v5njgcdl". |
| `.foo{color:red} (scopedStyleStrategy:'where')` | `.foo:where(.astro-v5njgcdl){color:red}` | (0,1,0) — identical to the unscoped .foo; :where() contributes zero | Confirmed. Default strategy is 'attribute' (no scopedStyleStrategy key set in astro.config.mjs) — the (0,2,0) tuple is the one that matters most. |
| `@layer probe { .bar{color:blue} }` | `@layer probe{.bar[data-astro-cid-v5njgcdl]{color:#00f}}` | (0,2,0) inside the layer, same as an unlayered scoped rule — layer membership doesn't change the tuple, only cascade-layer precedence | Survived a full production build (minified: 'blue'->'#00f') under all three scopedStyleStrategy values, with the scope hook landing correctly inside the at-rule in every case (verified attribute/class/where builds all show the layer wrapper intact). |
| `<style is:global>.g{color:green}</style>` | `.g{color:green}` | (0,1,0) — no scope hook appended | Landed in the SAME merged <style> block as the scoped rules (still goes through Astro's CSS asset pipeline/bundling), confirming round-1's is:global claim. |
| `<style is:inline>.i{color:purple}</style>` | `<style>\n.i {\n  color: purple;\n}\n</style>  (separate <style> tag, placed exactly where the component renders in the body)` | (0,1,0), irrelevant to override contract since it's positional not layered | NOT merged into the head bundle, NOT minified, rendered byte-for-byte as authored — confirms round-1's is:inline claim including the previously-unverified 'byte-for-byte survival through compressHTML' point (compressHTML defaults true in this build and the block still came through with its original newlines/indentation). |
| `astro:assets <Image layout="constrained"> WITHOUT `image:{responsiveStyles:true}` in astro.config.mjs (the schema default)` | `(nothing — no @layer astro.images appears anywhere in dist/index.html)` | n/a | CORRECTS round-1: merely using <Image> does not trigger the layer. node_modules/astro/dist/core/config/schemas/defaults.js:24 sets responsiveStyles:false by default; the virtual module that emits @layer astro.images (assets/vite-plugin-assets.js:172) is only imported when config.image.responsiveStyles is true. |
| `astro:assets <Image layout="constrained"> WITH image:{responsiveStyles:true} set explicitly` | `@layer astro.images{:where([data-astro-image]){height:auto}:where([data-astro-image=full-width]){width:100%}:where([data-astro-image=constrained]){max-width:100%}[data-astro-image-fit=fill]{object-fit:fill}...[data-astro-image-pos=center-right]{object-position:center right}}` | each rule inside ranges from (0,0,1) for the :where()-wrapped ones to (0,1,0) for the plain attribute-selector ones | Only appears with the opt-in config flag AND a layout prop on the Image, landing in the same bundled/inlined <style> block as author component CSS (so it does compete for first-appearance order against an unnamed project @layer, as round-1's critique warned) — but the trigger condition round-1 stated ('if the site uses <Image>') is too broad; the accurate trigger is the responsiveStyles config flag. |
| `astro:transitions <ClientRouter/> + transition:name/transition:animate="fade" on one element (default config, no responsiveStyles)` | `a SEPARATE <style> tag (not merged into the head bundle) containing: [data-astro-transition-scope="astro-v5paxn7m-1"] { view-transition-name: hero; }@layer astro { ::view-transition-old(hero) {...} ::view-transition-new(hero) {...} ... }` | n/a (pseudo-element/attribute selectors inside the layer) | Confirms round-1's claim that @layer astro (view-transition animation CSS) is emitted inline in the page HTML, not the bundled CSS asset — refines it further: merely including <ClientRouter/> is NOT enough; it requires an actual transition:name/transition:animate directive on a specific element to fire runtime.server/transition.js's per-element renderTransition(), which is what pushes the <style> tag. |

## Cascade-layer survival

| Question | Answer |
|---|---|
| Author can wrap in `@layer` | True |
| Survived the production build | True |
| Scope hook still lands inside | True |
| Minifier | cssMinify:true (boolean) in astro's vite-build-config.js:35, which per round-1's own reproduced refutation resolves to lightningcss in this Vite major (8.2.2) — colour minification observed here (color:blue -> color:#00f) is consistent with that. |

dist/index.html, attribute strategy: @layer probe{.bar[data-astro-cid-v5njgcdl]{color:#00f}} — sits inside the same single merged <style> tag as .foo[data-astro-cid-v5njgcdl]{color:red} and .g{color:green}. Reproduced identically under class (@layer probe{.bar.astro-v5njgcdl{color:#00f}}) and where (@layer probe{.bar:where(.astro-v5njgcdl){color:#00f}}) strategies. The scope hook (attribute/class/:where()) is correctly nested INSIDE the @layer block in every case, not hoisted out or dropped.

## Findings

| Claim | Status | Evidence |
|---|---|---|
| Default scopedStyleStrategy 'attribute' compiles .foo to .foo[data-astro-cid-<hash>], specificity (0,2,0), not :where()-wrapped | **confirmed** | Verbatim dist/index.html from a real `astro build`: .foo[data-astro-cid-v5njgcdl]{color:red} |
| scopedStyleStrategy 'class' -> .foo.astro-<hash>, also (0,2,0); 'where' -> .foo:where(.astro-<hash>), (0,1,0) | **confirmed** | dist/index.html for each of three separate rebuilds with astro.config.mjs scopedStyleStrategy set to each value |
| An author @layer wrapper survives production build with the scope hook landing correctly inside it, under all three scopedStyleStrategy values | **confirmed** | @layer probe{.bar[data-astro-cid-v5njgcdl]{color:#00f}} and its class/where equivalents, in each of the three builds' dist/index.html |
| is:global disables scoping but the block still passes through Astro's CSS asset pipeline (bundled alongside scoped styles); is:inline renders verbatim, unbundled, unminified, exactly where authored | **confirmed** | dist/index.html: .g{color:green} sits inside the same merged head <style> tag as the scoped rules; the is:inline block appears as a separate, unminified <style>\n.i {\n  color: purple;\n}\n</style> in the body, byte-identical to the source |
| Astro emits @layer astro.images into the bundled CSS asset whenever a site uses an image component | **refuted** | A build with <Image layout="constrained"> under default config (image.responsiveStyles: false, the schema default at node_modules/astro/dist/core/config/schemas/defaults.js:24) emits NO @layer at all beyond the author's own @layer probe. Only setting image:{responsiveStyles:true} in astro.config.mjs makes @layer astro.images appear — the virtual module that generates it (assets/vite-plugin-assets.js:172) is gated behind that config flag, not behind Image usage per se. |
| @layer astro (view-transition animation CSS) is emitted inline in the page HTML rather than the bundled CSS asset | **confirmed** | A separate, unbundled <style> tag containing @layer astro { ::view-transition-old(hero){...} ::view-transition-new(hero){...} } appeared only after adding an actual transition:name/transition:animate directive on an element — <ClientRouter/> alone (no per-element transition directive) produced zero @layer astro anywhere in the build. |
| grimoire-indexer's own test claims 3 characters remain outside @layer grimoire in its production build | **refuted** | test/renderer/build.test.ts:897 asserts `expect(outsideLayers(bundledCss).trim()).toBe("")` — an exact empty string, zero characters, not three. Ran the full suite (`npx vitest run test/renderer/build.test.ts`, real astro build() against the repo's fixture site): Test Files 1 passed (1), Tests 53 passed (53), including this exact assertion. `npm run build` itself (tsc + template copy) produces no dist/*.css at all — the only real bundled-CSS artifact in this repo comes from the vitest-driven fixture build, and it is empty outside the layer, not 3 bytes. |

## Overturns round 1

- **Was:** Astro's own generated CSS is starting to adopt layers for itself: withastro/astro#17141 wraps Astro's generated responsive-image CSS in `@layer astro.images` so it always loses to unlayered author/consumer CSS ... [and round-1's critique round, corrected]: 'A rule must say: your project's single layer is not the only layer in the output; if the site uses <Image> or view transitions, check first-appearance order'<br>**Now:** Astro emits @layer astro.images into the bundled CSS asset whenever a site uses an image component

## Build failures

- None of the Astro scaffold/build steps failed. `npm run build` in grimoire-indexer succeeded (exit 0) but is a TS-compile + template-copy step, not a full site build — it produces no dist/*.css, so the '3 characters outside @layer' claim could not be checked against that command's output directly; the vitest suite (which does run a real astro build() on a fixture) was used instead and gives the authoritative number: 0.

## What belongs in the annex

- Default scopedStyleStrategy is 'attribute': .foo -> .foo[data-astro-cid-<hash>], (0,2,0), never :where()-wrapped.
- class strategy: .foo.astro-<hash>, also (0,2,0). where strategy: .foo:where(.astro-<hash>), (0,1,0) — ties an unscoped consumer selector, so only here does source order decide (per-file, not project-wide, since strategy is a single astro.config value).
- @layer <name>{ ... } wrapped around a component <style> block survives a real production build unchanged, in every scopedStyleStrategy, with the scope hook correctly nested inside the at-rule — this is the mechanism a consumer-override contract can rely on.
- is:global keeps a block in Astro's CSS asset pipeline (bundled with scoped styles) but strips scoping; is:inline exits the pipeline entirely — unbundled, unminified, rendered byte-for-byte exactly where authored in the HTML.
- @layer astro.images is NOT emitted just because a project uses <Image> — it requires the explicit opt-in astro.config.mjs image:{responsiveStyles:true} (schema default is false) plus a layout prop on the image. Do not warn agents about this collision unless that flag is set.
- @layer astro (view-transition CSS) is not emitted by including <ClientRouter/> alone — it requires an actual transition:name/transition:animate directive on a specific element, and lands in its own inline <style> tag outside the main bundled CSS, so a bundled-CSS-only layer check can miss it entirely.
- grimoire-indexer's own build.test.ts asserts exactly 0 characters escape @layer grimoire in its fixture's bundled CSS (53/53 tests passed) — any published claim of '3 characters' for this repo is wrong and must not be repeated.

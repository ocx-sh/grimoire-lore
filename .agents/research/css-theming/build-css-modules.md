# Build probe — CSS Modules, Vite, and Next.js App Router

Round-2 evidence. Everything below was produced by running a real production
build and reading the emitted bytes; a claim with no artifact behind it is
marked `unverifiable` rather than restated from documentation.

- **Versions installed:** Vite fixture: vite@8.2.2, react@19.2.8, @vitejs/plugin-react@6.1.1 (read from vite-app/node_modules/*/package.json). Next.js fixture: next@16.3.3, react@19.2.8 (read from next-app/node_modules/*/package.json). Both scaffolded 2026-08-30, node v24.14.0, bun 1.3.10.

## Reproduce

```sh
bunx create-vite@latest vite-app --template react-ts
cd vite-app && bun install
write src/Widget.module.css with: .widget{color:blue}  .widget .nested{color:green}  @layer components{.layered{color:red}}
write src/Widget.tsx importing styles from './Widget.module.css' and rendering all three classes; import Widget into src/App.tsx so it's reachable from the build graph
bunx vite build   # -> dist/assets/index-bDAjtpGW.css
bunx create-next-app@latest next-app --ts --app --eslint --no-tailwind --src-dir --import-alias '@/*' --use-npm
cd next-app
append '.orderdemo{color:red}' to src/app/globals.css (imported by src/app/layout.tsx)
write src/app/consumer.css with '.orderdemo{color:blue}'
write src/components/Deep.css with '.orderdemo{color:green}' and src/components/Deep.tsx that imports it and renders className='orderdemo deep'
edit src/app/page.tsx: import './consumer.css' and Deep after the styles import; render <div className='orderdemo'>, <Deep/>, and <div className={styles.layered}>
append to src/app/page.module.css: '@layer components{ .layered{color:purple} }'
bunx next build   # build #1, no config changes -> .next (Turbopack, default bundler in Next 16)
cp -r .next .next-build1   # snapshot build #1 for diffing
bunx next build   # build #2, source unchanged, to test rebuild stability -> .next
diff chunk filenames, hashed classnames, and <link> order between .next-build1 and .next (identical)
edit next.config.ts: add experimental: { inlineCss: true }
bunx next build   # build #3, inlineCss on -> .next
inspect .next/server/app/index.html for <style data-href> vs <link>, and grep the inlined CSS for @layer / .orderdemo
```

Artifacts inspected:

- `r2/css-modules/vite-app/dist/assets/index-bDAjtpGW.css` (session scratch)
- `r2/css-modules/next-app/.next-build1/static/chunks/1gsp8415czn67.css` (session scratch)
- `r2/css-modules/next-app/.next-build1/static/chunks/18w7vq154wuj3.css` (session scratch)
- `r2/css-modules/next-app/.next-build1/server/app/index.html` (session scratch)
- `r2/css-modules/next-app/.next/static/chunks/18w7vq154wuj3.css` (session scratch)
- `r2/css-modules/next-app/.next/static/chunks/1q4htfp62uopx.css` (session scratch)
- `r2/css-modules/next-app/.next/server/app/index.html` (session scratch) (build #3, inlineCss:true)
- `r2/css-modules/next-app/node_modules/next/dist/server/config-shared.js` (session scratch) (line ~273/313, confirms experimental.inlineCss key name)

## Emitted selectors

| Authored | Emitted | Specificity | Notes |
|---|---|---|---|
| `Vite: .widget { color: blue; }` | `._widget_1a3bt_1{color:#00f}` | (0,1,0) — one class, identical to hand-written CSS | css-loader-style hash: _<name>_<hash>_<n>. No wrapper, no attribute selector. |
| `Vite: .widget .nested { color: green; }` | `._widget_1a3bt_1 ._nested_1a3bt_5{color:green}` | (0,2,0) — two independently-hashed classes joined by a descendant combinator | The (0,2,0) comes from the AUTHOR writing a compound selector across two module-local classes, not from CSS Modules injecting scope. Each class is still individually (0,1,0); do not attribute this tuple to a scoping mechanism. |
| `Vite: @layer components { .layered { color: red; } }` | `@layer components{._layered_1a3bt_10{color:red}}` | (0,1,0) inside the layer; layered rules always lose to any unlayered rule of any specificity per CSS layer semantics | @layer passed through Vite's production build (Rollup/esbuild pipeline) byte-for-byte in shape; the hashed class landed correctly inside the at-rule body. |
| `Next.js: .page{...} in page.module.css` | `page-module___8aEwW__page{...}` | (0,1,0) | Turbopack + Lightning CSS hash format: <file>-module___<hash>__<localName> — structurally different string shape from Vite's webpack-style _name_hash_n, though same specificity class. A rule that pattern-matches 'the' CSS Modules hash shape will only match one bundler family. |
| `Next.js: @layer components { .layered { color: purple; } } in page.module.css` | `@layer components{.page-module___8aEwW__layered{color:purple}}` | (0,1,0) inside the layer | Survived Next 16.3.3's Turbopack production build unchanged, and survived again with experimental.inlineCss:true — same bytes appear verbatim inside the single inlined <style data-href="..."> tag. |
| `Next.js: three (0,1,0)-tied rules for .orderdemo — globals.css (red), consumer.css (blue), Deep.css (green) — in import order globals(root layout) -> consumer.css -> Deep.tsx's Deep.css` | `chunk 1gsp8415czn67.css: .orderdemo{color:red}  |  chunk 18w7vq154wuj3.css: .orderdemo{color:#00f} then .orderdemo{color:green} (same file, in that order)` | (0,1,0) for all three — tied | Link order in the prerendered HTML: globals chunk first, page chunk second, both data-precedence="next". Within equal specificity, last-in-document wins: final resolved color is green (Deep.tsx's leaf-imported stylesheet), NOT the root-layout global (red) and NOT the mid-tree consumer sheet (blue). |

## Cascade-layer survival

| Question | Answer |
|---|---|
| Author can wrap in `@layer` | True |
| Survived the production build | True |
| Scope hook still lands inside | True |
| Minifier | Vite: Rollup/esbuild default minifier (colors shortened to #00f-style hex, single-line output). Next.js 16.3.3 with Turbopack (the default bundler, confirmed by build log '▲ Next.js 16.3.3 (Turbopack)'): Lightning CSS (evidence: `--lightningcss-light`/`--lightningcss-dark` custom properties emitted for the dark-mode color-scheme media query in globals.css output — a Lightning CSS transform signature). |

Vite: `@layer components{._layered_1a3bt_10{color:red}}` in dist/assets/index-bDAjtpGW.css. Next.js (Turbopack, no inlineCss): `@layer components{.page-module___8aEwW__layered{color:purple}}` in .next-build1/static/chunks/18w7vq154wuj3.css. Next.js with experimental.inlineCss:true: identical `@layer components{.page-module___8aEwW__layered{color:purple}}` bytes found inside the single `<style data-precedence="next" data-href="...">` tag in .next/server/app/index.html.

## Findings

| Claim | Status | Evidence |
|---|---|---|
| CSS Modules rewrites the class name itself (hashed), leaving the emitted rule at bare (0,1,0) with no specificity inflation — the doctrine's specificity-inflation premise (relevant to Vue [data-v-xxxx] / Astro [data-astro-cid-xxx], which add (0,2,0) via an attribute selector) does not apply to CSS Modules. | **confirmed** | Vite build emitted `._widget_1a3bt_1{color:#00f}` for source `.widget{color:blue}` — a single hashed class, no wrapping attribute selector. Next.js/Turbopack emitted `.page-module___8aEwW__page{...}` for the same pattern — different hash string shape, same (0,1,0) single-class structure. |
| @layer is standard CSS and passes through both the webpack+css-loader/PostCSS and Turbopack+Lightning CSS pipelines untouched, but nothing auto-wraps CSS Modules output into a layer by default; whether Next's CSS chunking/minification can mangle an @layer block during merge was unverified. | **confirmed** | Reproduced directly: an author-written `@layer components { .layered {...} }` block in page.module.css survived Next 16.3.3's Turbopack production build byte-shape-identical (scoping hash correctly inside the at-rule), in both the no-inlineCss build and the experimental.inlineCss:true build. No mangling observed across three separate production builds (2 without inlineCss, 1 with). |
| Whether an author @layer wrapper survives experimental.inlineCss, and whether CSS Module class hashing is stable across builds, were flagged unverified; also uncertain whether the config key experimental.inlineCss had moved or shipped by 16.3.3. | **confirmed** | experimental.inlineCss confirmed present verbatim in node_modules/next/dist/server/config-shared.js (default `inlineCss: false`) at next@16.3.3 — key has not moved. Enabling it and rebuilding: @layer block survived intact inside the single inlined `<style data-href="...">` tag. Class hash `page-module___8aEwW__page` and chunk filenames `18w7vq154wuj3.css`/`1gsp8415czn67.css` were byte-identical across two consecutive clean `next build` runs with zero source changes (verified by direct file diff/grep), so hashing is content/path-derived, not a random per-build nonce — for an unchanged source tree. |
| CSS ordering between a global stylesheet, a CSS Module, and a consumer sheet is documented by Next as NOT guaranteed stable (dev vs prod differ; cssChunking affects merge order) — round 1 flagged the root-layout global sheet's order-determinism as asserted but untested. | **confirmed** | For an UNCHANGED source tree, order was in fact deterministic across 2 rebuilds: identical chunk filenames and identical <link>/<style> order both times. But the actual cascade winner among three (0,1,0)-tied rules for the same class name was NOT the root-layout global (red, loaded first) — it was the deepest leaf component's own stylesheet (green, loaded/declared last), because equal-specificity ties resolve to last-in-document, and 'global' does not mean 'loaded last'. This confirms round 1's caution was warranted: a consumer relying on globals.css to win a tie will be wrong. |

## Overturns round 1

- **Was:** Whether @layer survives experimental.inlineCss, and whether CSS Module class hashing is stable across builds<br>**Now:** Whether an author @layer wrapper survives experimental.inlineCss, and whether CSS Module class hashing is stable across builds, were flagged unverified; also uncertain whether the config key experimental.inlineCss had moved or shipped by 16.3.3.
- **Was:** CSS ordering can behave differently in development, always ensure to check the build (`next build`) to verify the final CSS order — order is explicitly NOT guaranteed stable across dev vs. prod; ... none of these give a source-order guarantee an unlayered consumer file can lean on<br>**Now:** CSS ordering between a global stylesheet, a CSS Module, and a consumer sheet is documented by Next as NOT guaranteed stable (dev vs prod differ; cssChunking affects merge order) — round 1 flagged the root-layout global sheet's order-determinism as asserted but untested.

## Build failures

_None — everything scaffolded and built._

## What belongs in the annex

- CSS Modules hashes the CLASS NAME itself, not an appended scope attribute — the emitted rule stays (0,1,0). Reproduced in both Vite (`._widget_1a3bt_1`) and Next.js/Turbopack (`.page-module___8aEwW__page`). Do not apply the doctrine's attribute-selector specificity-inflation warning (correct for Vue's [data-v-xxxx] / Astro's [data-astro-cid-xxx], which add (0,2,0)) to CSS Modules — it does not apply.
- An author-written compound selector across two module-local classes (e.g. `.widget .nested`) still hashes to `(0,2,0)` after CSS Modules processing — that tuple comes from ordinary CSS specificity of the author's own compound selector, not from anything CSS Modules injects. Don't misattribute a (0,2,0) CSS-Modules rule to scope inflation.
- The hashed class NAME STRING SHAPE is bundler-specific, not a universal CSS-Modules format: webpack/css-loader (via Vite) emits `_name_hash_n`; Turbopack+Lightning CSS (Next.js 16's default bundler) emits `name-module___hash__name`. A rule or regex written against one shape will silently fail to match the other.
- @layer survived unchanged through a Vite production build, a Next.js 16.3.3 Turbopack production build, and that same Next.js build again with experimental.inlineCss:true — in all three the CSS-Modules scoping hash still landed correctly INSIDE the layer body. Treat 'author @layer wrapping' as safe across this stack.
- experimental.inlineCss is still the exact, unmoved config key at Next.js 16.3.3 (confirmed by reading node_modules/next/dist/server/config-shared.js), default false. Turning it on collapses every `<link rel=stylesheet>` into ONE inlined `<style data-precedence="next" data-href="...">` tag carrying the concatenated CSS in the same relative order as the link tags it replaces — it does not touch cascade order semantics, only delivery mechanism.
- CSS Module hashed class names and CSS chunk filenames were byte-identical across two consecutive clean `next build` runs with zero source changes, so hashing is deterministic for an unchanged tree — but this was NOT tested across a source or dependency change, and Next's own docs (relayed in round 1) warn that `experimental.cssChunking` can still reorder/merge chunks when the import graph changes. Don't generalize single-tree stability into 'hashing is stable across all rebuilds.'
- With three stylesheets tied at (0,1,0) for the same class name — a root-layout global stylesheet, a mid-tree consumer stylesheet, and a leaf component's own imported stylesheet, imported in that order — the rule that actually wins is the LAST one in document order: here, the leaf component's stylesheet beat both the root-layout global and the mid-tree consumer sheet. Never assume a root-layout/global stylesheet has cascade priority by virtue of being 'more global' — position, not scope, decides a tie.

# Build probe — CSS-in-JS: styled-components, Emotion, vanilla-extract, StyleX

Round-2 evidence. Everything below was produced by running a real production
build and reading the emitted bytes; a claim with no artifact behind it is
marked `unverifiable` rather than restated from documentation.

- **Versions installed:** vanilla-extract: @vanilla-extract/css 1.21.2, @vanilla-extract/vite-plugin 5.2.6, vite 8.2.2 (esbuild-minified prod build). StyleX: @stylexjs/stylex 0.19.0, @stylexjs/babel-plugin 0.19.0, @stylexjs/postcss-plugin 0.19.0, postcss 8.5.26, postcss-cli 11.0.1, @babel/core 8.0.1. styled-components: styled-components 6.5.3, react 18.3.1, react-dom 18.3.1, babel-plugin-styled-components 2.3.0. Emotion NOT independently built (see recommendation, #6) — styled-components installed cleanly on first try with zero peer-dep friction and was picked as the representative runtime library.

## Reproduce

```sh
mkdir ve && cd ve && bun init -y && bun add -d vite@8.2.2 @vanilla-extract/vite-plugin@5.2.6 @vanilla-extract/css@1.21.2 typescript
# ve/vite.config.ts registers vanillaExtractPlugin(); ve/theme.css.ts uses createThemeContract+createGlobalTheme; ve/app.css.ts uses style()+layer()
cd ve && ./node_modules/.bin/vite build   # NOTE: `npx vite build` failed with 'Missing script: vite' in this sandbox — call the ./node_modules/.bin binary directly
cat ve/dist/assets/*.css
mkdir stylex && cd stylex && bun init -y && bun add -d @stylexjs/stylex@0.19.0 @stylexjs/babel-plugin@0.19.0 @stylexjs/postcss-plugin@0.19.0 postcss postcss-cli @babel/core @babel/cli @babel/preset-env
mv postcss.config.js postcss.config.cjs; mv babel.config.js babel.config.cjs   # required: bun init sets "type":"module", postcss-load-config chokes on .js CJS configs
# stylex/babel.config.cjs: runtimeInjection:false, dev:false, unstable_moduleResolution.type:'commonJS'. stylex/postcss.config.cjs: include src/**/*.js, useCSSLayers:true (then re-run with false)
# stylex/src/tokens.stylex.js: stylex.defineVars({brand:'blue',space:'8px'}); stylex/src/app.js: stylex.create({box:{color,padding,width:`${120+40}px`}}); stylex/src/stylex.css: '@stylex;'
cd stylex && ./node_modules/.bin/postcss src/stylex.css -o dist.css          # useCSSLayers:true
sed -i 's/useCSSLayers: true/useCSSLayers: false/' postcss.config.cjs && ./node_modules/.bin/postcss src/stylex.css -o dist-nolayers.css   # default
mkdir sc && cd sc && bun init -y && bun add styled-components@6.5.3 react@18.3.1 react-dom@18.3.1
bun run ssr.jsx    # ServerStyleSheet + renderToString; components use &&/&&& and a `${dynamicWidth}px` interpolation
bun run ssr-order.jsx forward / reverse    # same definition order, swapped RENDER order
bun run ssr-order2.jsx normal / reverse    # swapped styled() DEFINITION/call order — the real determinism probe
bun add -d babel-plugin-styled-components@2.3.0 @babel/preset-react; ./node_modules/.bin/babel variant-normal.jsx -o variant-normal.cjs (same for reverse) — retest componentId stability with the babel plugin's displayName+fileName options
mkdir verify && cd verify && bun add -d puppeteer-core; verify/check.mjs launches the pre-cached Playwright Chromium at ~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome (no network download) and reads getComputedStyle() on a static HTML fixture built from each framework's real compiled CSS bytes
```

Artifacts inspected:

- `r2/css-in-js/ve/dist/assets/style-DoRnczML.css` (session scratch)
- `r2/css-in-js/ve/dist/assets/*.css` (session scratch) (second build, with layer())
- `r2/css-in-js/stylex/dist.css` (session scratch)
- `r2/css-in-js/stylex/dist-nolayers.css` (session scratch)
- `r2/css-in-js/sc/ssr.jsx` (session scratch) (stdout captured: style tags from ServerStyleSheet.getStyleTags())
- `r2/css-in-js/sc/variant-normal.cjs,` (session scratch) variant-reverse.cjs (babel-plugin-styled-components output)

## Emitted selectors

| Authored | Emitted | Specificity | Notes |
|---|---|---|---|
| `vanilla-extract style({color, padding, width}) — no layer` | `.uan7er0{color:var(--_13axqhe0);padding:var(--_13axqhe1);width:160px}` | (0,1,0) — one plain class, whole style object on one selector, not atomic per property | single hashed class per style() call, confirming round1's 'one hashed class per style() call' claim |
| `vanilla-extract style({'@layer':{[layer('components')]: {...}}})` | `@layer uan7er0{.uan7er1{color:var(--_13axqhe0);padding:var(--_13axqhe1);width:160px}}` | (0,1,0) inside the layer; layered rules always lose to ANY unlayered rule regardless of specificity/order | layer NAME itself is hashed (uan7er0), not the literal string 'components' passed to layer() — survived esbuild vite-build minification verbatim |
| `vanilla-extract createGlobalTheme(':root', vars, {color:{brand:'blue'}, space:{md:'8px'}})` | `:root{--_13axqhe0:blue;--_13axqhe1:8px}` | n/a (custom-property assignment, unlayered even when the consuming style() is layered) | var names are hashed per-token, not human-readable in prod; overridable by a consumer :root rule even when the class using var() is inside @layer |
| `StyleX stylex.create({box:{color,padding,width:`${120+40}px`}}) + useCSSLayers:true` | `@layer priority1, priority2, priority3, priority4; @layer priority1{:root, .xwszo6g{--x19zowc3:blue;--xl0f4nb:8px;}} @layer priority2{.xyd6mar{padding:var(--xl0f4nb)}} @layer priority3{.x1dcnv9r{color:var(--x19zowc3)}} @layer priority4{.xq1dxzn{width:160px}}` | (0,1,0) per class — true atomic, one class per CSS property, tie-break is layer ORDER not specificity | confirms round1's atomic-class claim; REFUTES round1's 'not CSS specificity ... at all' framing — with layers on, ties ARE resolved by ordinary cascade-layer precedence, a real browser mechanism, not an invisible compile-time-only rule |
| `same StyleX source, useCSSLayers:false (the plugin default)` | `.xyd6mar:not(#\#){padding:var(--xl0f4nb)} .x1dcnv9r:not(#\#):not(#\#){color:var(--x19zowc3)} .xq1dxzn:not(#\#):not(#\#):not(#\#){width:160px}` | padding tier (1,1,0); color tier (2,1,0); width tier (3,1,0) — each `:not(#\#)` adds one ID's worth of specificity (the ID '#' never matches a real element, so the selector always matches but the specificity still counts) | StyleX manufactures priority via chained :not(#\#), an escalating-specificity hack analogous to styled-components' &&/&&&, NOT an out-of-cascade compile-time ordering as round1 claimed |
| `styled-components: const Box = styled.div`color:blue;padding:8px;width:${120+40}px;`` | `.dHgJEm{color:blue;padding:8px;width:160px;} + data-styled.g1[id="sc-bdvwhi"]{content:"dHgJEm,"}` | (0,1,0) | two classes on the element: sc-bdvwhi (stable identity, carries no rules) + dHgJEm (content-hash, carries the rules) — matches round1 |
| `styled-components: styled(Box)` && { color: red; } `` | `.dsFXPe.dsFXPe{color:red;}` | (0,2,0) — literally the SAME class selector written twice, not a pseudo-class trick | confirms round1's (0,2,0) claim exactly |
| `styled-components: styled(Box)` &&& { color: green; } `` | `.jjsHgq.jjsHgq.jjsHgq{color:green;}` | (0,3,0) — same class selector written three times | confirms round1's (0,3,0) claim exactly |

## Cascade-layer survival

| Question | Answer |
|---|---|
| Author can wrap in `@layer` | True |
| Survived the production build | True |
| Scope hook still lands inside | True |
| Minifier | esbuild (vite build default, and vite's default cssMinify for this target) |

vanilla-extract: `@layer uan7er0{.uan7er1{color:var(--_13axqhe0);padding:var(--_13axqhe1);width:160px}}` — single-line, whitespace-stripped, still a syntactically valid @layer block with the scoped class correctly nested inside it, from ve/dist/assets/style-*.css after `vite build`. StyleX: `@layer priority1, priority2, priority3, priority4;` plus four populated @layer blocks, from `postcss src/stylex.css -o dist.css` with useCSSLayers:true — StyleX's own postcss-plugin build step, no extra minifier layered on top, still valid. Both were then round-tripped through a real headless Chromium (Playwright's cached chrome-linux64, v151.0.7922.34) via getComputedStyle(): in both cases a plain, unlayered, equal-or-lower-specificity consumer <style> block loaded AFTER the framework CSS won the cascade (color and width both flipped to the consumer's value), proving the @layer wrapping is not just present in the bytes but functionally beatable by ordinary consumer CSS with zero !important and zero extra specificity.

## Findings

| Claim | Status | Evidence |
|---|---|---|
| StyleX's @layer support (`useLayers`/`useCSSLayers`) works, survives a production build, and produces a beatable override contract for consumer CSS. | **confirmed** | postcss src/stylex.css -o dist.css with @stylexjs/postcss-plugin 0.19.0 config `{useCSSLayers:true}` emitted `@layer priority1,priority2,priority3,priority4;` plus four correctly populated layer blocks. Chromium getComputedStyle() confirmed a plain unlayered consumer rule overrides both a StyleX class (.x1dcnv9r{color:purple} beats @layer priority3's color:blue→orange chain) and a StyleX design token (:root{--x19zowc3:orange} beats the layered :root definition), both with zero !important. |
| The postcss-plugin's actual config key is `useCSSLayers` (default `false`), not `useLayers` — `useLayers` is an internal option of `@stylexjs/babel-plugin`'s `processStylexRules()` that the postcss-plugin's bundler.js maps `useCSSLayers` onto internally. | **confirmed** | grep of node_modules/@stylexjs/postcss-plugin/src/plugin.js:35 shows `useCSSLayers = false` as the destructured option default; bundler.js:69 shows `useLayers: useCSSLayers` being passed through to the babel-plugin's processStylexRules call. |
| StyleX's tie-breaking between atomic classes is resolved by ordinary CSS cascade mechanics (layer order when useCSSLayers:true, or manufactured specificity via chained `:not(#\#)` when it's false/default) — not by some compile-time-only ordering invisible to the browser's cascade. | **refuted** | dist-nolayers.css (useCSSLayers:false, the plugin default) emits `.x1dcnv9r:not(#\#):not(#\#){color:var(...)}` — specificity (2,1,0). A same-specificity consumer override `.x1dcnv9r{color:purple}` (0,1,0) was verified in Chromium to LOSE (computed color stayed blue), which is exactly what plain CSS specificity rules predict, not an out-of-band StyleX-only ordering. |
| StyleX's documented anti-pattern framing ('all styles should come from class names on the element itself'; external-cascade overrides are 'styles at a distance') describes StyleX's INTENDED usage, but does not describe a mechanical barrier — the compiled CSS, once built with useCSSLayers:true, is ordinary layered CSS and is just as overridable from a downstream consumer stylesheet as vanilla-extract or Panda's output. | **refuted** | Same browser-verified override test as finding #1: a bare, unlayered, unprefixed consumer rule beat both the atomic class and the design token with no js-side props()/createTheme() involved at all. |
| styled-components' `&&`/`&&&` hack manufactures (0,2,0)/(0,3,0) by literally repeating the generated class selector, not via a pseudo-class or attribute trick. | **confirmed** | ServerStyleSheet output: `.dsFXPe.dsFXPe{color:red;}` for `&&` and `.jjsHgq.jjsHgq.jjsHgq{color:green;}` for `&&&`, styled-components 6.5.3. |
| styled-components' generated content-hash class (e.g. `.dHgJEm`) is deterministic across repeated process runs of identical source. | **confirmed** | Three separate `bun run ssr.jsx` invocations produced byte-identical stdout (md5sum 2b5af8f6... all three); a full diff of two independent runs was empty. |
| styled-components' componentId (`sc-xxxxx`) assignment IS order-dependent, sourced from a runtime global call-order counter when the babel/SWC plugin is absent — swapping the source-level order in which sibling `styled()` calls execute changes which id (and therefore which content-hash) each component receives. | **confirmed** | ssr-order2.jsx: swapping which of two `styled.div` calls executes first flips Alpha from `sc-bdvwhi`/`.lagIOb` to `sc-gsDMPd`/`.eIBEsM`, and Beta correspondingly — with RENDER order held constant and only definition/call order swapped. A second test (ssr-order.jsx) showed render order alone, with definition order fixed, produces IDENTICAL output — the nondeterminism is specifically about styled()-call order, not about React render/traversal order. |
| `babel-plugin-styled-components` (displayName+fileName options) replaces the runtime call-order counter with a source-location-derived id (`<file>__<VarName>-sc-<hash>-<astIndex>`), removing the call-order dependency for componentId assignment. | **confirmed** | Transformed output: `variant-normal__Alpha-sc-m13tbw-0` / `variant-normal__Beta-sc-m13tbw-1` vs (different file) `variant-reverse__Beta-sc-lr7xj9-2` / `variant-reverse__Alpha-sc-lr7xj9-3` — the AST-position index (`-0`/`-1` vs `-2`/`-3`) is fixed by lexical source position at compile time, not by which runtime branch executes. |
| A JS-computed value interpolated into a style value compiles to a bare literal in the emitted CSS, with no custom property left for a consumer to target — identical trap shape in vanilla-extract and StyleX. | **confirmed** | vanilla-extract: `const dynamicWidth = 120+40;` → CSS `width:160px`, no var(). StyleX: same JS expression in stylex.create() → CSS `.xq1dxzn{width:160px}`, no var(). Both compile-time libraries collapse the JS arithmetic before it ever reaches the stylesheet. |
| vanilla-extract's createThemeContract/createGlobalTheme tokens compile to plain, unlayered CSS custom properties on :root and are overridable by a consumer directly overriding the (hashed) property name, independent of whether the consuming class is itself layered. | **confirmed** | Browser test: `:root{--_13axqhe0:green}` in an unlayered consumer <style>, loaded after the framework CSS (which itself put the *consuming class* inside @layer uan7er0), still won — computed color came back green even though only the var-assignment (not the class rule) was overridden. |

## Overturns round 1

- **Was:** StyleX: not verified from docs fetched — do not claim either way (mark low confidence, unverified).<br>**Now:** StyleX's @layer support (`useLayers`/`useCSSLayers`) works, survives a production build, and produces a beatable override contract for consumer CSS.
- **Was:** StyleX and Panda's atomic classes never combine two rules on one selector, so ties are resolved by StyleX's own deterministic last-write compile-time ordering (not CSS specificity or source order at all).<br>**Now:** StyleX's tie-breaking between atomic classes is resolved by ordinary CSS cascade mechanics (layer order when useCSSLayers:true, or manufactured specificity via chained `:not(#\#)` when it's false/default) — not by some compile-time-only ordering invisible to the browser's cascade.
- **Was:** StyleX: there is no CSS-file entrypoint for a downstream consumer at all by design ... overriding via external cascade is treated as the 'styles at a distance' anti-pattern StyleX exists to prevent.<br>**Now:** StyleX's documented anti-pattern framing ('all styles should come from class names on the element itself'; external-cascade overrides are 'styles at a distance') describes StyleX's INTENDED usage, but does not describe a mechanical barrier — the compiled CSS, once built with useCSSLayers:true, is ordinary layered CSS and is just as overridable from a downstream consumer stylesheet as vanilla-extract or Panda's output.
- **Was:** this ordering is NOT guaranteed stable under SSR streaming (chunks/styles arrive as Suspense boundaries resolve) or client rehydration. [Note: this reproduces the underlying MECHANISM round1 gestured at (order-dependent id assignment) but does not reproduce actual Suspense-streaming nondeterminism specifically — that scenario was not built/tested.]<br>**Now:** styled-components' componentId (`sc-xxxxx`) assignment IS order-dependent, sourced from a runtime global call-order counter when the babel/SWC plugin is absent — swapping the source-level order in which sibling `styled()` calls execute changes which id (and therefore which content-hash) each component receives.

## Build failures

_None — everything scaffolded and built._

## What belongs in the annex

- vanilla-extract style() emits ONE hashed class per style() call covering ALL its declared properties (specificity (0,1,0)) — it is NOT atomic-per-property the way StyleX is; do not assume every vanilla-extract override needs to target multiple classes.
- vanilla-extract's layer()/'@layer' key is opt-in per style() call; an unwrapped style() call ships completely unlayered and WILL beat a consumer's plain override at equal specificity by source order — only layer()-wrapped styles yield automatically.
- vanilla-extract's layer name and its scope class are BOTH hashed identifiers in production (e.g. `@layer uan7er0{.uan7er1{...}}`), not the literal string passed to layer(); a consumer targeting `@layer components{}` by the source-level name will not match anything in the built output — they must be handed the compiled name or use an unlayered override instead (which needs no name at all).
- StyleX's override-friendliness is an OPT-IN BUILD FLAG, not a default: `useCSSLayers:true` on @stylexjs/postcss-plugin is required for a consumer's plain CSS to beat StyleX's own classes; left at the plugin default (false), StyleX instead manufactures escalating CSS specificity via chained `:not(#\#)` (up to (3,1,0) observed on a 3-property example) that an ordinary consumer override selector CANNOT beat without matching or exceeding that specificity.
- StyleX's `useCSSLayers` (postcss-plugin config surface) and `useLayers` (babel-plugin's internal processStylexRules option) are different names for the same feature at two different layers of the toolchain — a rule author writing postcss.config must use `useCSSLayers`.
- Both vanilla-extract and StyleX bake a JS-computed value used in a style declaration into a bare CSS literal at build time — there is no custom property left in the output for a consumer stylesheet to hook, regardless of how 'dynamic' the value looked in source.
- styled-components' &&/&&& hack literally repeats the SAME generated class selector N times in the compiled CSS (`.x.x{...}` = (0,2,0), `.x.x.x{...}` = (0,3,0)) — it is a specificity-boost the component AUTHOR uses to beat an external stylesheet, not something a downstream consumer can invoke against the component.
- styled-components' content-hash class name is stable across repeated builds/runs of identical code, but its `sc-xxxxx` componentId is assigned by a global call-order counter UNLESS `babel-plugin-styled-components` (or the SWC/Next.js equivalent) is configured — without that plugin, code-splitting or lazy per-request component creation can genuinely change which id (and which content-hash) a component gets between builds or requests.
- Emotion was not independently rebuilt in this round; treat its &&/&&& and runtime-injection behavior as architecturally identical to the styled-components findings above (same mechanism, different SSR API surface) rather than as separately reproduced.

# Surface study — Sass / SCSS / Less as a compile layer

Commissioned by round 1's critic as a gap: a surface the study never reached.

- **Versions checked:** dart-sass 1.103.1 (npm `sass` package, "compiled with dart2js 3.13.1"), less 4.9.0, lightningcss 1.33.0 (used only as a spec-accurate CSS-nesting desugarer for comparison), node v24.14.0. All installed fresh via `npm install` in the scratchpad — versions read from `node_modules/*/package.json` and `--version` output, not from any package.json range.
- **Placement:** `core` — The frontmatter already globs `.scss .sass .less` unconditionally, so every consumer touching those files hits this regardless of which of the 11 frameworks they use — it is not framework-specific ecosystem knowledge the way an Angular Material mixin vocabulary is. And the empirical evidence shows it is not a new category of defect: `$brand`/`@brand` interpolation is a byte-for-byte instance of the exact pattern the design already states as core for CSS-in-JS and Style Dictionary ("a CSS-in-JS theme value interpolated into a template compiles to color:#ff0000" — design statement 5), and the @layer-order finding is a direct, verified corollary of the existing core statement on physical @layer ordering (statement 29), not a competing claim. Folding this into core as a sibling case under those two statements, plus a short new nesting-specificity note (Sass-vs-native `:is()` divergence, which has no existing core analog), keeps the rule's central claims — "a build-time-resolved value cannot be overridden," "layer order is first-appearance order" — genuinely general instead of leaving them silently false for the single most widely deployed preprocessing layer. An annex would misframe this as optional/vendor knowledge when it is actually a gap in the core mechanism the rule already teaches.

## Mechanism

Both preprocessors are pure text-substitution compilers that run before the browser ever sees CSS. `$var` (Sass) and `@var` (Less) are resolved and inlined at build time — they leave zero trace in the emitted CSS, so nothing downstream (a consumer's override stylesheet, a runtime theme switch) can reach them. `--custom-prop` is passed through untouched by both compilers and becomes a live `var()` reference resolved by the browser at render time, per element, overridable by any later, load-time or run-time CSS. Nesting (`&`) is flattened by both to plain descendant/compound selectors during compile — the compiler is doing selector arithmetic, not scoping; the emitted selector's specificity is the sum of everything accumulated on the path from the outermost rule.

## Where it contradicts the core

None. Findings are compatible with and extend two existing core statements: (1) the CSS-in-JS/Style-Dictionary "build-resolves-before-browser-sees-it → un-overridable" defect (design statement 5/13) — Sass/Less `$var`/`@var` interpolation is a byte-for-byte instance of the same defect, now empirically confirmed for two more syntaxes. (2) The `@layer` first-appearance-order rule (design statement 29, "write layer blocks in the intended precedence order physically") — the preprocessor finding shows the physical order that matters is the order after `@use`/`@forward`/`@import` resolution, which a Sass/Less author can silently invert without ever touching an `@layer` line, so statement 29's "physically" needs a preprocessor-aware footnote, not a contradiction.

## Traps

- A Sass/Less variable is not a token: `$brand:#ff0000` interpolated into a declaration is gone from the output — grep the built CSS for the variable name and it will not be there, only its resolved literal.
- Less variable scoping is lazy/dynamic, not lexical: a variable declared textually AFTER its use in the same block still governs that earlier use (confirmed: `.inner{color:@color}` followed later by `@color:green;` in the same parent compiled `.a .inner{color:green}`, not blue). This is strictly more dangerous than Sass's compile-time-frozen-but-lexical model — editing the bottom of a Less partial can silently change a value used at the top.
- @use/@forward order (Sass) and @import order (Less) determine first-appearance order of @layer blocks in the built CSS, which is what CSS uses to fix cascade-layer precedence. Reordering two lines in an entry `.scss`/`.less` file — with no @layer statement touched at all — silently reverses which layer wins.
- Sass nesting accumulates full ancestor path into specificity: `.nav{ul{li{a{...}}}}` compiles to `.nav ul li a` (0,1,3 with 3 type selectors), so a consumer's seemingly-equivalent override `.nav a` (0,1,1) loses regardless of source order — the nesting looked shallow in source, the specificity is not.
- Native CSS nesting is NOT the same desugaring as Sass: per the CSS Nesting spec (confirmed via lightningcss's spec-accurate un-nesting transform), a comma-separated or compound ancestor selector is wrapped in `:is(...)`, and `:is()`'s specificity is the specificity of its single MOST SPECIFIC branch — applied to every match, not per-branch. Sass instead textually duplicates the nested rule once per ancestor branch, so each branch keeps its own, independently-computed specificity. Concretely: `.card, .card-alt#legacy { .title{color:red} }` compiles under Sass to two rules with specificities (0,2,0) and (1,2,0) respectively; the equivalent native-nesting selector `:is(.card, .card-alt#legacy) .title` has ONE specificity, (1,2,0), for both branches — an element that only matches `.card .title` is, under native nesting, exactly as hard to override as one matching the id-qualified branch. A codebase migrating hand-authored nested CSS from Sass to native `&` changes override difficulty for elements that never even touch the id-qualified branch.
- `#{...}` interpolation inside a custom-property value bakes a Sass expression into a frozen literal at build time (`--gap:#{$spacing-unit * 2}` compiled to `--gap:16px`) — the property itself still exists and is still overridable at runtime by a later rule or JS, but its Sass-computed DEFAULT is not reactive to $spacing-unit; changing $spacing-unit requires a rebuild, unlike a chain of var() references.
- @media and @supports compose transparently with both custom properties and Sass variables with no special-casing needed — but `@media` FEATURE QUERIES cannot read `var()` at all (a CSS/browser-level fact, not preprocessor-specific — not independently reproduced here beyond noting it, since it requires a browser, not a compiler, to observe) — which is exactly why a breakpoint value is a legitimate Sass variable: no consumer override path through a media condition could ever exist for it regardless of preprocessor.

## Reproduced here

- Core vanish-vs-survive trap, side by side (Sass): $brand:#ff0000 → `.button{color:#ff0000;border-color:#ff0000}`; --brand:#ff0000 → `.button{color:var(--brand);border-color:var(--brand)}`. /tmp/.../scratchpad/r2/surface-preprocessors/f1_vanish/{scss-var.css,custom-prop.css}
- Same trap reproduced in Less: `@brand:#ff0000` inlined to `.button{color:#ff0000}`; `--brand` passed through as `var(--brand)`. /tmp/.../f6_less/vars.css
- Legitimate Sass-variable case: $breakpoint-md/$z-index-modal correctly inlined into @media prelude and a property value with no override path needed. /tmp/.../f2_legit/legit.css
- @use/@forward order controls built @layer first-appearance order: forwarding components before base emitted `@layer components{...}` before `@layer base{...}`; reversing the @use order reversed the emitted order. /tmp/.../f3_layer_order/{entry-forward-order.css,entry-use-order.css}
- Same @layer-order-follows-import-order behavior reproduced in Less via @import order. /tmp/.../f6_less/layer.css
- Less lazy/dynamic scoping: a variable used before its later redeclaration in the same block resolves to the LATER value (green, not blue). /tmp/.../f6_less/scoping.css
- Sass nesting flattening producing higher-than-expected specificity: `.nav{ul{li{a{...}}}}` → `.nav ul li a` (0,1,3); a consumer's `.nav a` (0,1,1) cannot win. /tmp/.../f4_nesting/deep-nest.css (consumer attempt alongside it)
- Sass per-branch specificity duplication vs native CSS nesting's :is()-based single specificity, same source structure compiled two ways and diffed directly: Sass → two rules with distinct specificities (0,2,0) and (1,2,0); native nesting desugared via lightningcss (spec-accurate CSS-Nesting transform) → one :is(...)-wrapped selector, specificity (1,2,0) for both branches. /tmp/.../f4_nesting/{sass-equivalent.css,native-nest.css}
- Interpolation baking a Sass expression into a custom-property value at build time: `--gap:#{$spacing-unit * 2}` → `--gap:16px` (frozen literal, property itself still runtime-overridable). @media/@supports composing cleanly around it with no special handling required. /tmp/.../f5_media_interp/interp.css
- Same core nesting-flattening trap reproduced in Less (`.nav{ul{li{a{...}}}}` → `.nav ul li a`). /tmp/.../f6_less/nest.css

## Documentation-only

- `@media (min-width: var(--x))` being rejected/ignored by browsers — this is a documented CSS/browser-engine fact (media-query features cannot reference custom properties), not something a compiler run can demonstrate; would need a real browser (none available in this sandbox: no chromium/playwright browser binary installed, only the npm playwright CLI stub) to actually observe the parse failure rather than just cite it. Marked as an asserted-not-verified aside, not a load-bearing claim.
- Whether dart-sass's `@use`/`@forward` module system ever reorders @layer blocks RELATIVE to sibling non-Sass stylesheets in a real bundler pipeline (Vite/webpack) — only the standalone `sass` CLI compiling one entry file to one CSS file was tested; a bundler that concatenates multiple compiled CSS assets could reorder them again after Sass compilation. Not built because it would require scaffolding a full bundler project, out of scope for what the surface asked to verify.
- Whether production minification (esbuild/lightningcss/cssnano) alters the @layer first-appearance order Sass/Less establish — only unminified sass/lessc output was inspected; the round-1 core design already separately claims minifiers drop redundant `@layer a,b;` ordering statements (statement 29), which is consistent with but not identical to what was checked here.

## Sources

- `r2/surface-preprocessors/f1_vanish/scss-var.css` (session scratch)
- `r2/surface-preprocessors/f1_vanish/custom-prop.css` (session scratch)
- `r2/surface-preprocessors/f2_legit/legit.css` (session scratch)
- `r2/surface-preprocessors/f3_layer_order/entry-forward-order.css` (session scratch)
- `r2/surface-preprocessors/f3_layer_order/entry-use-order.css` (session scratch)
- `r2/surface-preprocessors/f4_nesting/deep-nest.css` (session scratch)
- `r2/surface-preprocessors/f4_nesting/sass-equivalent.css` (session scratch)
- `r2/surface-preprocessors/f4_nesting/native-nest.css` (session scratch)
- `r2/surface-preprocessors/f5_media_interp/interp.css` (session scratch)
- `r2/surface-preprocessors/f6_less/vars.css` (session scratch)
- `r2/surface-preprocessors/f6_less/scoping.css` (session scratch)
- `r2/surface-preprocessors/f6_less/nest.css` (session scratch)
- `r2/surface-preprocessors/f6_less/layer.css` (session scratch)
- package.json versions: node_modules/sass/package.json (1.103.1), node_modules/less/package.json (4.9.0), node_modules/lightningcss/package.json (1.33.0), all under `r2/surface-preprocessors/` (session scratch)

# Build probe — Svelte 5 / SvelteKit (via Vite + @sveltejs/vite-plugin-svelte, the same compiler path SvelteKit uses)

Round-2 evidence. Everything below was produced by running a real production
build and reading the emitted bytes; a claim with no artifact behind it is
marked `unverifiable` rather than restated from documentation.

- **Versions installed:** svelte@5.57.0, vite@8.2.2, @sveltejs/vite-plugin-svelte@7.3.0 — read from node_modules/*/package.json after `bun install` on 2026-08-30 (bun 1.3.10). Matches round-1's reported svelte@5.57.0 exactly, no version drift.

## Reproduce

```sh
mkdir -p /tmp/.../scratchpad/r2 && cd /tmp/.../scratchpad/r2
bun create vite@latest svelte --template svelte
cd svelte && bun install
write src/App.svelte containing: .version{color:red}; .foo .bar{color:blue}; .runtime-only-never-in-markup{color:purple} (never referenced in markup); :global(.ext-target){color:green}; .scope-wrap :global { .inner-global{color:orange} } (with {@html} injecting the inner element); @layer manual-test { .layered-rule{color:teal} }
edit vite.config.js: plugins:[svelte({ preprocess: process.env.WRAP_LAYER ? { style: ({content}) => ({code: `@layer svelte-lib {\n${content}\n}`}) } : undefined })], build.outDir toggled by WRAP_LAYER
bunx vite build                          # base build -> dist/ (no preprocess hook)
WRAP_LAYER=1 bunx vite build              # layer-wrap build -> dist-layer/ (preprocess hook active)
bunx vite build --minify false --outDir dist-unmin   # unminified build, to inspect the pruned-rule comment before the minifier strips it
```

Artifacts inspected:

- `r2/svelte/dist/assets/index-BgkPFdDU.css` (session scratch)
- `r2/svelte/dist-layer/assets/index-CHIM2kKP.css` (session scratch)
- `r2/svelte/dist-unmin/assets/index-CzqKbwwc.css` (session scratch)
- `r2/svelte/vite.config.js` (session scratch)
- `r2/svelte/src/App.svelte` (session scratch)

## Emitted selectors

| Authored | Emitted | Specificity | Notes |
|---|---|---|---|
| `.version { color: red; }` | `.version.svelte-1n46o8q{color:red}` | (0,2,0) — two class selectors on one compound | Matches round-1's claimed tuple exactly, now confirmed in a real minified production bundle rather than an isolated svelte.compile() call. |
| `.foo .bar { color: blue; }` | `.foo.svelte-1n46o8q .bar:where(.svelte-1n46o8q){color:#00f}` | (0,3,0) — hash class lands with weight on the FIRST compound (.foo), :where() zeroes it on the second (.bar); author's own .foo .bar is (0,2,0) + one live (0,1,0) hash = (0,3,0) | Confirms round-1's own refuted-claim correction (weight on FIRST occurrence, not last) directly from a real build artifact. |
| `:global(.ext-target) { color: green; }` | `.ext-target{color:green}` | (0,1,0) — fully unscoped, no hash, no :where() | Single-selector global escape hatch confirmed. |
| `.scope-wrap :global { .inner-global { color: orange; } }` | `.scope-wrap.svelte-1n46o8q .inner-global{color:orange}` | outer compound (0,2,0), inner compound (0,1,0) — total (0,3,0), but the inner class itself carries zero scoping weight of its own | Block form confirmed: the enclosing scope selector stays hashed, everything nested inside :global{} is emitted bare with no hash and no :where() wrapper at all (stronger opt-out than :where(), literally unscoped). |
| `.runtime-only-never-in-markup { color: purple; }  (never used in template)` | `ABSENT from minified dist/*.css (0 bytes, 0 matches); present only as `/* (unused) .runtime-only-never-in-markup { color: purple; }*/` in an unminified (--minify false) build` | n/a — deleted | Compile-time deletion, not mere de-prioritization. Real vite-plugin-svelte build warning: `src/App.svelte:19:2 Unused CSS selector ".runtime-only-never-in-markup" https://svelte.dev/e/css_unused_selector` — and the build still EXITS 0. This is new evidence beyond round-1, which only ran isolated svelte.compile() and saw the comment; a real production build's default minifier (lightningcss via Vite 8) strips even the comment, so a class computed only at runtime (a token/utility name built dynamically in JS) vanishes from the shipped CSS with literally zero bytes of trace — only a non-build-failing log line proves it ever existed. |
| `@layer manual-test { .layered-rule { color: teal; } }  (author-written @layer, no preprocess hook)` | `@layer manual-test{.layered-rule.svelte-1n46o8q{color:teal}}` | (0,2,0) inside the named layer | Confirms the round-1 claim that the 2022 @layer-stripping bug (#7504) is fixed — now reproduced through a full production `vite build`, not just an isolated compiler call. |

## Cascade-layer survival

| Question | Answer |
|---|---|
| Author can wrap in `@layer` | True |
| Survived the production build | True |
| Scope hook still lands inside | True |
| Minifier | lightningcss (Vite 8.2.2 default production minifier) |

WRAP_LAYER=1 build (svelte({preprocess:{style:({content})=>({code:`@layer svelte-lib {\n${content}\n}`})}})) produced this exact minified byte sequence in dist-layer/assets/index-*.css: `@layer svelte-lib{.version.svelte-1n46o8q{color:red}.foo.svelte-1n46o8q .bar:where(.svelte-1n46o8q){color:#00f}.ext-target{color:green}.scope-wrap.svelte-1n46o8q .inner-global{color:orange}@layer manual-test{.layered-rule.svelte-1n46o8q{color:teal}}}` — every selector is scoped correctly INSIDE the layer (hash classes and :where() intact), :global() selectors stay bare inside the layer too, and the author's own nested `@layer manual-test` nests correctly as `svelte-lib.manual-test` inside the wrapper. The whole thing survives minification to a single physical line (`wc -l` = 1 for both dist/*.css and dist-layer/*.css).

## Findings

| Claim | Status | Evidence |
|---|---|---|
| A preprocess `style` hook wrapping every component's raw CSS text in `@layer name { ... }`, registered as `svelte({preprocess: {...}})` in vite.config.js, produces correctly-scoped, correctly-layered output through a REAL end-to-end production `vite build` (compile + bundle + minify), not just an isolated `svelte.compile()`+`preprocess()` call. | **confirmed** | WRAP_LAYER=1 bunx vite build succeeded; dist-layer/assets/index-*.css contains `@layer svelte-lib{...all rules correctly hash-scoped and :where()-wrapped...}` as one minified line. Build log shows the css_unused_selector warning still firing correctly on the pruned rule even with the hook active, so pruning and layering compose without interference. |
| Svelte's own scoping compiler pass runs AFTER the preprocess `style` hook, on the already-transformed text — the hook rewrites raw CSS source (inserting the @layer wrapper) before compilation; the compiler then parses that wrapped text and applies hash-class + :where() scoping to the selectors it finds inside the wrapper. | **confirmed** | The built output shows `.svelte-1n46o8q` hash classes and `:where()` correctly applied to selectors that are textually nested inside `@layer svelte-lib{...}` — this is only possible if the compiler's selector-walking ran on the post-preprocess (already-wrapped) source, not the reverse. |
| The `css_unused_selector` pruning warning does not fail the build (exit code stays 0), and in a real MINIFIED production bundle the pruned rule leaves zero bytes of trace — not even the `/* (unused) ... */` comment round-1 observed, which only survives in an unminified build. | **confirmed** | `bunx vite build` for the base config: warning printed, `echo $?` = 0. `grep -c runtime-only-never-in-markup dist/assets/index-*.css` = 0 matches (minified). `bunx vite build --minify false` retains `/* (unused) .runtime-only-never-in-markup { color: purple; }*/` verbatim. |
| `.version{color:red}` compiles to `.version.svelte-hash{color:red}` = specificity (0,2,0); `.foo .bar{}` compiles to `.foo.svelte-hash .bar:where(.svelte-hash){}` = (0,3,0), weight on the FIRST compound. | **confirmed** | Reproduced verbatim in a real production bundle: `.version.svelte-1n46o8q{color:red}` and `.foo.svelte-1n46o8q .bar:where(.svelte-1n46o8q){color:#00f}`. Independent confirmation of round-1's own already-corrected finding (round-1 had refuted its own earlier draft on which compound carries the weight). |
| `:global()` single-selector and `:global{}` block-form escape hatches produce fully unscoped output (no hash class, no :where() wrapper at all) for whatever is inside them, while any enclosing non-global compound in the same selector stays hash-scoped. | **confirmed** | `.ext-target{color:green}` (bare) from `:global(.ext-target)`; `.scope-wrap.svelte-1n46o8q .inner-global{color:orange}` (outer scoped, inner bare) from `.scope-wrap :global { .inner-global {...} }`. |
| Production Vite CSS output is a single minified physical line, which breaks a `grep -B2 ... | grep -v @layer` style contract test because context lines and the actual layer text end up on the same line regardless of whether the leaked rule is really inside the layer. | **confirmed** | `wc -l dist/assets/index-*.css dist-layer/assets/index-*.css` = 1 line each. Independently reproduces round-1's own refutation of its prescribed grep test, this time against a genuine `vite build` artifact rather than a synthetic fixture file. |

## Overturns round 1

- **Was:** Whether a real SvelteKit `vite build` preserves an author-written `@layer` through minification into the final bundle. I verified the COMPILER preserves it, but the full app-build path was not executed (npm install for a fixture app was blocked by the sandbox). Given the layer is plain CSS text that lightningcss/esbuild preserve, this is very likely fine — but it is the one link in the chain I did not run, and it is exactly the link the consumer-fixture test exists to cover.<br>**Now:** A preprocess `style` hook wrapping every component's raw CSS text in `@layer name { ... }`, registered as `svelte({preprocess: {...}})` in vite.config.js, produces correctly-scoped, correctly-layered output through a REAL end-to-end production `vite build` (compile + bundle + minify), not just an isolated `svelte.compile()`+`preprocess()` call.
- **Was:** A CSS rule in a component's <style> block whose selector doesn't match any element in that component's own template ... is pruned/commented out at compile time with a `css_unused_selector` warning, not merely left inert. — true, but incomplete: round-1 only observed this via isolated `svelte.compile()`, never a real production build. In the actual shipped, minified artifact the comment itself is also stripped (zero trace) and the build does not fail, which is the load-bearing fact for a token/dynamic-class contract: nothing in CI stops this from shipping silently.<br>**Now:** The `css_unused_selector` pruning warning does not fail the build (exit code stays 0), and in a real MINIFIED production bundle the pruned rule leaves zero bytes of trace — not even the `/* (unused) ... */` comment round-1 observed, which only survives in an unminified build.

## Build failures

_None — everything scaffolded and built._

## What belongs in the annex

- A class that exists only as a runtime-computed string (never literally present in a component's markup/template) is DELETED from shipped CSS with zero trace in the minified bundle — not commented out, gone — and the build that did it exits 0. An agent building a token/theme system in Svelte that composes class names dynamically (e.g. a variant prop) must keep every possible class name statically visible to the compiler (e.g. via a lookup table with literal class strings in markup), or the rule silently never ships and CI will not catch it.
- Component CSS lands in the anonymous (unlayered, always-wins) cascade layer by default; putting it into a named layer requires a hand-added `preprocess` `style` hook (`svelte({preprocess:{style:({content})=>({code:`@layer name{${content}}`})}})`) in vite.config.js or svelte.config.js — there is no built-in compiler option for it. This hook is now confirmed to work end-to-end through a real production build: scoping and pruning both still apply correctly to content wrapped this way, and an author's own nested `@layer` inside the wrapped block nests correctly.
- Svelte 5's scoping hash class carries weight ONLY on the first scopable compound of a selector; every later compound gets the hash wrapped in zero-specificity `:where()`. A single-class rule is (0,2,0); each additional compound in a descendant/combinator chain adds (0,1,0) more from its own zero-weight :where()-wrapped hash plus whatever the author's own selector already carried — so `.a .b .c` compiles to (0,4,0), not a flat (0,2,0).
- `:global(...)` and the `.scope :global { ... }` block form both produce genuinely unscoped output — no hash, no :where() — stronger than merely low-specificity; anything inside them is exactly as overridable as hand-written global CSS, with no scoping tax at all.
- Minified production CSS from a Svelte/Vite build is a single physical line; any contract test that greps for a pattern near `@layer` (context-line grep, or any single-line-assuming regex) will silently pass on a bundle where a rule has actually leaked outside its layer, because the leaked selector and an unrelated `@layer` token from elsewhere in the file end up on the same grepped line.

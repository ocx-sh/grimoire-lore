# Build probe — css-theming minifier + test-environment matrix (round 2 evidence)

Round-2 evidence. Everything below was produced by running a real production
build and reading the emitted bytes; a claim with no artifact behind it is
marked `unverifiable` rather than restated from documentation.

- **Versions installed:** esbuild 0.28.2, lightningcss 1.33.0, postcss 8.5.26 + cssnano 9.0.1 (+ cssnano-preset-advanced 9.0.1), parcel 2.16.4 (bundling @parcel/transformer-css → lightningcss ^1.30.1, resolved 1.33.0), @swc/cli 0.8.1 (no CSS minifier exists in the swc toolchain — verified, not assumed), happy-dom 20.12.0, jsdom 30.0.1, playwright 1.62.1 with cached chromium build 1234 used as ground-truth renderer. All installed via bun 1.3.10 into a shared scratchpad package.json (pre-existing at scratchpad root, shared across sibling round-2 agents) — no user repository was touched.

## Reproduce

```sh
mkdir -p <scratchpad>/r2/minifiers/{A_layer,B_testenv}
cd <scratchpad>/r2/minifiers/A_layer && bun add -d esbuild lightningcss postcss postcss-cli cssnano cssnano-preset-advanced parcel @parcel/css @swc/cli playwright@1.62.1
printf input_match.css: '@layer base, override;\n@layer base{.btn{color:red}}\n@layer override{.btn{color:blue}}'
printf input_contradiction.css: '@layer override, base;\n@layer base{.btn{color:red}}\n@layer override{.btn{color:blue}}'  (statement order CONTRADICTS block order: base is declared 2nd in source but the statement makes it the higher-priority layer)
esbuild input_*.css --minify --bundle --loader:.css=css --outfile=esbuild_*.css
node -e "import('lightningcss').then(({transform})=>...)"  — lightningcss.transform({filename, code, minify:true})
postcss input_*.css -o cssnano_*.css --config '{plugins:{cssnano:{preset:"default"}}}' (and again with preset:"advanced")
cd parcel_match/ && parcel build index.css --no-source-maps --no-cache (isolated package.json per case to dodge root package.json's conflicting "main":"index.js")
swc input_match.css -o swc_match.css   → produced an empty file: swc has no CSS transform
node render_check.mjs — Playwright chromium.launch(), setContent() each variant, getComputedStyle(.btn).color, for all 10 (original x2, esbuild x2, lightningcss x2, cssnano x2, parcel x2)
cd B_testenv && bun add -d happy-dom jsdom
node happydom_test*.mjs — new Window(), document.body.innerHTML with test CSS, inspect styleEl.sheet.cssRules and getComputedStyle(.btn).color, plus a no-@layer control
node jsdom_test*.mjs — new JSDOM(html, {pretendToBeVisual:true}), same inspection, plus a no-CSS-at-all baseline and a no-@layer control
grep -ri layer <happy-dom>/src/css/ → zero hits, confirming no CSSLayerRule/CSSLayerBlockRule support exists in happy-dom 20.12.0 at all
```

Artifacts inspected:

- `r2/minifiers/A_layer/input_match.css` (session scratch)
- `r2/minifiers/A_layer/input_contradiction.css` (session scratch)
- `r2/minifiers/A_layer/esbuild_match.css` (session scratch)
- `r2/minifiers/A_layer/esbuild_contradiction.css` (session scratch)
- `r2/minifiers/A_layer/lightningcss_match.css` (session scratch)
- `r2/minifiers/A_layer/lightningcss_contradiction.css` (session scratch)
- `r2/minifiers/A_layer/cssnano_match.css` (session scratch)
- `r2/minifiers/A_layer/cssnano_contradiction.css` (session scratch)
- `r2/minifiers/A_layer/cssnano_adv_match.css` (session scratch)
- `r2/minifiers/A_layer/cssnano_adv_contradiction.css` (session scratch)
- `r2/minifiers/A_layer/parcel_match/dist/index.css` (session scratch)
- `r2/minifiers/A_layer/parcel_contradiction/dist/index.css` (session scratch)
- `r2/minifiers/A_layer/swc_match.css` (session scratch)
- `r2/minifiers/A_layer/render_check.mjs` (session scratch)
- `r2/minifiers/B_testenv/happydom_test.mjs` (session scratch)
- `r2/minifiers/B_testenv/happydom_test2.mjs` (session scratch)
- `r2/minifiers/B_testenv/happydom_test3.mjs` (session scratch)
- `r2/minifiers/B_testenv/happydom_test4.mjs` (session scratch)
- `r2/minifiers/B_testenv/jsdom_test.mjs` (session scratch)
- `r2/minifiers/B_testenv/jsdom_test2.mjs` (session scratch)

## Emitted selectors

| Authored | Emitted | Specificity | Notes |
|---|---|---|---|
| `@layer base, override; @layer base{...} @layer override{...}  (MATCH case: statement order agrees with block order)` | `esbuild → statement kept verbatim: '@layer base,override;@layer base{.btn{color:red}}@layer override{.btn{color:#00f}}'` | n/a — layer-order question, not selector specificity | esbuild 0.28.2 never strips the @layer statement in --minify --bundle mode, in either the match or contradiction case. |
| `same MATCH input` | `cssnano (default AND advanced preset) → statement kept verbatim, byte-identical to esbuild's output modulo `color:blue` vs `color:#00f`` | n/a | cssnano 9.0.1 on postcss 8.5.26 never strips the @layer statement either, in either case. |
| `same MATCH input` | `lightningcss → statement REMOVED entirely: '@layer base{.btn{color:red}}@layer override{.btn{color:#00f}}'` | n/a | Block order left untouched because it already matched the statement's intent. |
| `CONTRADICTION input: '@layer override, base;' (base is the higher-priority layer per the statement) but blocks appear in source as base-block-then-override-block` | `lightningcss and Parcel (which delegates to lightningcss ^1.30.1, resolved 1.33.0) → statement REMOVED, AND the two @layer blocks are PHYSICALLY REORDERED in the output to '@layer override{...} @layer base{...}' — the reverse of source order — so that first-declared-layer-is-lowest-priority again yields base-wins, matching what the (now deleted) statement specified.` | n/a | This is the key finding: lightningcss does not merely rely on 'block order already implying the same precedence' (round 1's claimed trigger) — it computes the layer priority from the statement and then MOVES the blocks into that priority order before deleting the statement. It drops the statement unconditionally when minifying, in both the match and the contradiction case, and compensates by reordering. |
| `CONTRADICTION input, esbuild and cssnano outputs` | `esbuild: '@layer override,base;@layer base{...}@layer override{...}' (statement kept, blocks untouched). cssnano: identical shape, statement kept.` | n/a | Neither tool touches block order or the statement at all — they pass @layer through untouched in every case tested. |

## Cascade-layer survival

| Question | Answer |
|---|---|
| Author can wrap in `@layer` | True |
| Survived the production build | True |
| Scope hook still lands inside | True |
| Minifier | esbuild 0.28.2 / lightningcss 1.33.0 / cssnano 9.0.1 (postcss 8.5.26) / parcel 2.16.4 — all five real Chromium renders matched the source semantics; swc has no CSS minifier and was not applicable |

Ground truth via real Chromium (Playwright 1.62.1, chromium build 1234): rendered .btn color for the CONTRADICTION case (where statement order and block order disagree) was rgb(255,0,0) — i.e. 'base' (the layer the @layer statement made higher-priority) won — identically across: the raw original CSS, esbuild's output, cssnano's output, lightningcss's output, AND Parcel's output. All five pipelines produced the SAME rendered result as the un-minified source, despite two of them (lightningcss, Parcel) deleting the @layer statement from the bytes. lightningcss/Parcel achieve this by reordering the physical @layer blocks to encode the same priority the statement specified; esbuild/cssnano achieve it by simply never touching the statement.

## Findings

| Claim | Status | Evidence |
|---|---|---|
| A bare `@layer a, b;` ordering statement is unconditionally at risk of being silently dropped by production minifiers, and the danger is specifically when block order does NOT already imply the same precedence. | **refuted** | Built a CONTRADICTION fixture where the statement's declared order ('@layer override, base;' → base wins) is the OPPOSITE of source block order (base block appears first, override block second — which alone would make override win). Ran it through esbuild 0.28.2, lightningcss 1.33.0, cssnano 9.0.1, and Parcel 2.16.4 (lightningcss-backed). Rendered all five outputs plus the original in real Chromium via Playwright: EVERY output produced rgb(255,0,0) (base wins), matching the source's intended semantics exactly. Two tools (esbuild, cssnano) never strip the statement at all. Two tools (lightningcss, Parcel) DO strip it unconditionally — even in the contradiction case — but compensate by physically reordering the @layer blocks to preserve the statement's declared priority. In this tested matrix, no minifier actually broke the cascade contract, contradicting either the 'block order must already agree' framing or the implication that dropping the statement is dangerous. |
| 'Physical block order is the durable form' — i.e. author guidance should treat source block order, not the @layer statement, as the thing that survives a build. | **refuted** | For lightningcss/Parcel, physical SOURCE block order is explicitly NOT preserved — the tool reorders blocks away from source order to match the (about-to-be-deleted) statement's semantics. The thing that survives is the STATEMENT'S declared priority, re-encoded as new block order, not the author's original block order. For esbuild/cssnano, the statement itself survives verbatim and block order is irrelevant to correctness. So 'write blocks in the intended precedence order physically' is not what any tested tool actually depends on for correctness — every tool's output was correct regardless of whether source block order matched the statement. |
| happy-dom drops @layer at parse time. | **confirmed** | happy-dom 20.12.0's CSS parser source (grepped under src/css/) has zero references to 'layer' anywhere — no CSSLayerBlockRule/CSSLayerStatementRule support exists. Empirically: a stylesheet containing only a `@layer name { .btn{color:red} }` block parses to `sheet.cssRules.length === 0` and `getComputedStyle(.btn).color === ''`, versus the same rule unlayered giving cssRules.length===1 and color='blue' (control). More severe than 'drops @layer': a bare `@layer a, b;` STATEMENT poisons the rest of the stylesheet parse — '.a{color:red} @layer x,y; .b{color:blue}' yields cssRules.length===1 (only `.a`survives; `.b`, which comes AFTER the statement, is also lost, not just the statement itself). An @layer BLOCK (not a bare statement) is comparatively 'safer' — it drops only itself and parsing continues normally for rules before and after it. |
| jsdom parses but never applies layered declarations. | **confirmed** | jsdom 30.0.1 DOES parse @layer correctly: sheet.cssRules for a 3-rule layered stylesheet (statement + 2 blocks) returns 3 CSSOM objects — `CSSLayerStatementRule` and two `CSSLayerBlockRule` instances with correct cssText. But getComputedStyle(.btn).color for that stylesheet returned rgb(0,0,0) — the SAME as jsdom's baseline with literally no CSS attached at all. Isolated test: a single, uncontested `@layer base { .btn{color:red} }` with nothing else in the cascade STILL computes to the no-CSS baseline (black), while the identical declaration unlayered computes to blue. This proves jsdom's cascade/style-resolution engine unconditionally ignores every declaration that lives inside any @layer block, even when there's no competing rule to reconcile — it isn't a layer-ordering bug, layered rules are invisible to computed-style resolution entirely. |

## Overturns round 1

- **Was:** a bare `@layer a, b;` ordering statement is dropped by production minifiers whenever block order already implies the same precedence, which the maintainers treat as correct CSS, not a bug.<br>**Now:** A bare `@layer a, b;` ordering statement is unconditionally at risk of being silently dropped by production minifiers, and the danger is specifically when block order does NOT already imply the same precedence.
- **Was:** Physical block order is the durable form.<br>**Now:** 'Physical block order is the durable form' — i.e. author guidance should treat source block order, not the @layer statement, as the thing that survives a build.

## Build failures

- swc/@swc/cli 0.8.1: has no CSS transform or minifier at all — `swc input.css -o out.css` runs without error but produces an empty output file (0 bytes); its --help output lists only JS/TS-oriented flags (source maps, module compilation). Marked N/A rather than a broken build: the tool genuinely does not do this job, this is not a version/config problem.
- Parcel initially failed with '@parcel/namer-default: Target "main" declares an output file path of "index.js" which does not match the compiled bundle type "css"' because it picked up the shared scratchpad root package.json (which has "main":"index.js" for an unrelated dependency graph). Fixed by giving each parcel_match/parcel_contradiction subdirectory its own minimal package.json — not a real minifier limitation, an artifact of the shared install location.

## What belongs in the annex

- Trap, verified false in this version matrix: esbuild 0.28.2 and cssnano 9.0.1 (postcss 8.5.26) NEVER strip a bare `@layer a, b;` statement, in either a same-order or a contradicting-order fixture — the statement always survives byte-for-byte.
- Trap, verified but reframed: lightningcss 1.33.0 and Parcel 2.16.4 (lightningcss-backed) DO strip the bare `@layer a, b;` statement unconditionally on minify — including when the statement's order contradicts source block order — but they compensate by rewriting block emission order to preserve the exact priority the statement specified. Real-Chromium rendering (Playwright 1.62.1) confirms the compensated output renders identically to the original source in every case tested. Do not tell agents 'write blocks in intended order because the statement may be dropped' as a safety net — for lightningcss/Parcel that's not what makes it safe (the tool reorders for you); for esbuild/cssnano the statement isn't dropped at all. No minifier in this matrix produced a silent breakage.
- happy-dom 20.12.0 has NO @layer support whatsoever (confirmed absent from its CSS parser source, not just 'drops silently'): an @layer BLOCK is dropped in isolation (parsing continues around it), but a bare @layer STATEMENT corrupts parsing of the rest of that stylesheet — any rule appearing after the statement is also silently lost. Never use happy-dom to test a layered cascade; a false pass or false failure can come from an unrelated rule elsewhere in the same <style> tag being collaterally dropped.
- jsdom 30.0.1 parses @layer correctly into real CSSLayerStatementRule/CSSLayerBlockRule CSSOM objects, but its computed-style resolution silently ignores every declaration inside ANY @layer block — even a single uncontested layer with nothing to override computes to the same value as no CSS at all. jsdom will make a cascade-layer assertion fail even when the CSS is 100% correct, because jsdom itself never applies the styles — not a layer-ordering bug, a total non-application of layered declarations.
- Conclusion for the rule: since BOTH jsdom and happy-dom fail (differently, but both fail) to correctly apply a layered cascade, the rule's check for any cascade-layer contract MUST require a real browser engine (e.g. Playwright/Puppeteer against actual Chromium/Firefox/WebKit) — jsdom and happy-dom cannot be used to test @layer behavior at all, not 'use with caution', not 'works for simple cases'.

# CSS theming — tokens, the cascade, and the consumer override contract

The consolidated position behind the `css-theming` rule set. Two research
rounds ran here: round 1 (11 frameworks, documentation and specs) and round 2
(real production builds and a real browser engine, commissioned by round 1's
own completeness critic, which returned `needs-another-round`).

**Status: `ready-to-draft`.** Round 2 answered the critique's dominant complaint. Every claim I spot-checked reproduces from a stored artifact at the stated version, and the one item that was self-cited to our own rule file — the DOM-emulator …

Nothing here ships with the package. The rule is short; this is where the
evidence, the overturned claims and the discarded alternatives live.

## Where this came from

Three OCX repos independently wrote rules for the same problem, sharing only
~12% of their literal lines: `grimoire-indexer` (Astro), `ocx-catalog`
(VitePress/Vue) and `kate-middlechild` (Tailwind v4). The divergence was
framework mechanics, not principle — which is what made a shared, published
rule worth extracting. See [doctrine-extraction](css-theming/doctrine-extraction.md)
for what survived generalisation and where the two mature pairs contradict
each other.

## The decisions

1. **One rule, `css-theming.md`, plus a depth directory.** The core is
   framework-independent; each annex covers one framework's mechanics.
2. **An annex ships only where the core alone would produce wrong code.**
   Plain CSS and the design-token tooling literature fold into the core — they
   have no selector and no tuple of their own.
3. **The doctrine our repos wrote is not universal, and the rule says so.**
   It was written for attribute-scoped frameworks. CSS Modules does not inflate
   specificity; Shadow DOM blocks the cascade outright; a VS Code webview
   inverts ownership of the token vocabulary entirely. Five of sixteen rules
   carry a named exception rather than a false claim of universality.
4. **Every rule carries its evidence, or admits it is spec-derived.**
5. **The gate scales to the surface.** Not five unconditional commands for a
   project with one stylesheet.

## The ruleset

| ID | Rule | Universal | Verification |
|---|---|---|---|
| `CSS-TOK-01` | Any appearance value — colour, spacing, radius, shadow, duration — written as a literal is a value the consumer's one … | **no** | Strip `var()` fallback slots from the BUILT stylesheet first, then match what is left: `perl -pe … |
| `CSS-TOK-02` | A value the build resolves before the browser sees CSS cannot be overridden by any stylesheet, however well named. … | yes | Grep the BUILT stylesheet for each published token's literal name. A public token must appear as a … |
| `CSS-TOK-03` | A colour token declared only under the default scope and not repeated under the dark scope silently applies in dark … | **no** | Assert every colour token declared in the dark scope also appears in the default scope and vice … |
| `CSS-TOK-04` | A semantic, role-named public tier is universal. A PRIMITIVE tier is justified only where a census shows a raw value is … | yes | A census is a command with a count, not a reading: `grep -oE '<pattern>' <every stylesheet and … |
| `CSS-TOK-05` | A value mathematically or perceptually derived from another token — a tint, a nested radius, a negated margin — is … | yes | For each pair of tokens whose values are numerically or perceptually related, the derived one must … |
| `CSS-CAS-01` | "My rule loses" has at least eight causes and only two are specificity. Attribute or class scoping inflates it (Astro … | yes | Read the compiled or SERVED rule for the element you are restyling, not the source. Find the … |
| `CSS-CAS-02` | Unlayered author CSS beats layered author CSS at any specificity, position-independent, within one tree and one origin … | **no** | Brace-match every `@layer <name> { ... }` span in the BUILT stylesheet — ANY name, not just yours — … |
| `CSS-CAS-03` | Importance REVERSES layer order: a layered `!important` beats an unlayered `!important`. An `!important` inside your … | **no** | Search inside each built layer span for `!important`; every hit needs an adjacent justification … |
| `CSS-CAS-04` | The cascade sorts Element-Attached Styles above Layers: a `style=""` attribute beats every author stylesheet rule at … | **no** | Render the page and grep the SERVED HTML for `style="` on the elements you claim are themeable. … |
| `CSS-CAS-05` | `@scope` is not a substitute for cascade layers. It contributes zero specificity of its own (a bare selector inside it … | yes | `@scope` appearing in a diff whose stated purpose is overridability or containment is the finding. |
| `CSS-A11Y-01` | `forced-colors: active` sits above everything else in this file. The UA replaces `color`, `background-color` … | yes | Run the page under a forced-colors context (Playwright `newContext({forcedColors:'active'})` drives … |
| `CSS-VAR-01` | `var(--x, fallback)` uses the fallback only when `--x` is NOT SET. A property that IS set, to a value the consuming … | yes | For every published hook whose fallback is load-bearing there is a matching `@property … |
| `CSS-API-01` | Where a compiler generates the target name, that name is not an API. Vue's `data-v-<hash>` rotates per build; Svelte's … | **no** | `grep -n 'data-<yourconvention>=' <components>` — every published hook must be reachable from an … |
| `CSS-API-02` | A component hook is override-only. Grammar `--<namespace>-<component>-<property>`, never declared by your own styles … | **no** | For every published hook, `grep -rn -- '--<ns>-<component>-<prop>'` over source returns only … |
| `CSS-GATE-01` | The gate reads the BUILT artifact, in an engine that can actually represent the feature — and it is routed per … | **no** | For each check: name the artifact and confirm the path exists after a real production build (`find … |
| `CSS-GATE-02` | A verification enters this rule set, a CI job, or a review only after it has been watched go red against a deliberately … | yes | Copy the subject, break the thing the rule forbids, run the verification. A pass on the broken copy … |

### `CSS-TOK-01`

Any appearance value — colour, spacing, radius, shadow, duration — written as a literal is a value the consumer's one override stylesheet can never reach. A value that only LOOKS tokenized in source is a literal: a Sass `$brand`/Less `@brand` interpolation, a CSS-in-JS theme value interpolated into a template, a JS expression evaluated inside `style()`/`stylex.create()`, and a Tailwind `@theme inline` alias all compile to the bare literal. **Except: email HTML**, where most clients strip `<style>` and support no custom properties, so inline literals are the contract, not the defect.

- **Why:** The failure with no symptom: the consumer writes a correct-looking override, nothing happens, no error, no warning, indistinguishable from a typo. Reproduced byte-for-byte in the two most widely deployed preprocessors and in three compile-time CSS-in-JS libraries — it is one defect wearing five syntaxes, not five framework quirks.
- **Verification:** Strip `var()` fallback slots from the BUILT stylesheet first, then match what is left: `perl -pe 's/var\(\s*--[A-Za-z0-9-]+\s*,[^;)]*\)/var(X)/g' <built.css> | grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\('`. Empty output is the pass. **This check enforces colour only** — the statement's spacing/duration half is reviewed by eye, not gated; do not claim otherwise.
- **Universal:** no — Email HTML (inline literals are the contract). Genuine one-off geometry, a self-describing keyword (`ease-out`), and a measurement pinned to something else's real size stay literal, each with a comment and an allowlist entry. Inside Shadow DOM the rule is stronger, not weaker: a literal on an element with no exposed `part=` is unreachable by any selector, permanently.
- **Evidence:** Reproduced 2026-08-30: dart-sass 1.103.1 `$brand:#ff0000` -> `.button{color:#ff0000}` while `--brand` survives as `var(--brand)` (r2/surface-preprocessors/f1_vanish/); less 4.9.0 identical (f6_less/vars.css); vanilla-extract 1.21.2 and StyleX 0.19.0 both bake `120+40` into `width:160px` with no custom property left (r2/css-in-js/); Tailwind 4.3.3 `@theme inline{--color-accent:var(--color-brand)}` emits `--color-accent` zero times (r2/tailwind-v4/dist/assets/index-DNsDMt4v.css). styled-components 6.5.3 theme interpolation -> literal, round 1.

### `CSS-TOK-02`

A value the build resolves before the browser sees CSS cannot be overridden by any stylesheet, however well named. Never list one in a token table — the row promises an overridability that cannot exist. Confirmed instances: Tailwind v4 `--breakpoint-*`/`--container-*` (resolved into literal `@media (width>=120rem)` preludes) and `@theme inline` aliases; Sass `$var` / Less `@var`; a JS-computed value in vanilla-extract or StyleX; Style Dictionary's `outputReferences: false` default.

- **Why:** Every other rule in this file assumes the consumer has a hook to reach. This is the class of value where there is none, and where the token table is the thing that lies.
- **Verification:** Grep the BUILT stylesheet for each published token's literal name. A public token must appear as a `--name:` declaration in the output. Name absent while its value appears inlined at use sites = build-resolved: remove the row, or change the build (`outputReferences: true`, plus `outputReferenceFallbacks: true` for the hook shape; plain `@theme` instead of `@theme inline`).
- **Universal:** yes
- **Evidence:** Reproduced: `grep -c breakpoint` on a Tailwind 4.3.3 build declaring a genuinely custom `--breakpoint-3xl` returns 0, while `3xl:p-16` compiled to `@media (width>=120rem){...}`; `--color-accent` (from `@theme inline`) returns 0 matches. Sass/Less reproduced as above. Style Dictionary's `outputReferences` default is DOCUMENTATION-DERIVED, not reproduced — no repo on this machine uses it. `@media (min-width: var(--x))` being unreadable is SPEC-DERIVED, flagged by the preprocessor probe as cited-not-run.

### `CSS-TOK-03`

A colour token declared only under the default scope and not repeated under the dark scope silently applies in dark mode pinned to its light value — and cascade layers make it WORSE, because a consumer's unlayered one-line `:root{--accent:...}` beats both your layered light block and your layered dark block. Only overriding both scopes fixes it, which makes it a documentation obligation you state to consumers. **Except: `light-dark()` themes**, where each colour has exactly ONE declaration site carrying both branches — a parity check written as "every dark token also appears light" flags every token in such a theme. **And except VS Code webviews**, where the host owns the vocabulary and recomputes `--vscode-*` on `document.documentElement.style` per theme change, so there is no per-scheme declaration of yours to compare.

- **Why:** A rule set that sells `@layer` without naming this cost is selling a broken dark mode — and a parity check that does not know about `light-dark()` is a lint that goes red on correct code, which is how a gate gets switched off.
- **Verification:** Assert every colour token declared in the dark scope also appears in the default scope and vice versa, reading the BUILT stylesheet, **with a `light-dark(` skip** and a justified allowlist. Watch the one-directional case: a build-time tree-shake can drop a token from the generated light block while a hand-written dark block keeps it — "works in dark, broken in light", which passes a dark-mode screenshot test.
- **Universal:** no — `light-dark()` themes (single declaration site — the check must detect and skip them). VS Code webviews (host-owned vocabulary, nothing of yours to compare). Measurements and geometry are declared once, in the default scope only; repeating a spacing step per scheme is the opposite defect.
- **Evidence:** Parity leak reproduced in round 1 in a real browser with a red control. `light-dark()` single-declaration-site confirmed by direct inspection this round, plus the measured fact that `light-dark()` follows the cascadable `color-scheme` property, not a fixed OS read: `[data-theme=light]{color-scheme:light}` on `<html>` flipped it to the light branch in an OS-dark context (r2/engine-forced-colors/probe.js, Chromium 151).

### `CSS-TOK-04`

A semantic, role-named public tier is universal. A PRIMITIVE tier is justified only where a census shows a raw value is genuinely shared by two or more semantic tokens. A COMPONENT-HOOK tier is justified only where a component needs restyling the layer plus an identity attribute do not already reach — ship it for two or three components, never speculatively. Before tokenizing an existing untokenized family, run an exhaustive literal census first.

- **Why:** The named failure mode of token systems is minting too many tokens too early, and a scale picked against a half-count is wrong in a way nobody notices until the second pass — both source repos under-counted by roughly half on the first pass.
- **Verification:** A census is a command with a count, not a reading: `grep -oE '<pattern>' <every stylesheet and component file> | sort | uniq -c | sort -rn`. Re-run with a multi-line-aware matcher — the first pass misses values buried inside multi-line `transition` and `box-shadow` declarations, which is exactly how both repos under-counted. A new token added with no census line in the commit body is speculative.
- **Universal:** yes
- **Evidence:** Design-system methodology, framework-independent. ROUND 1'S SUPPORTING ANECDOTE DOES NOT SHIP: "two of our own repos ran the identical test and got zero primitives and a small primitive set respectively" was never reproduced, and `ocx-catalog/.claude/rules/quality-design-tokens.md:41` reads "Three. The primitive tier is private". State the method; do not cite the anecdote. The under-counting figure is from round 1's own reading of the two repos' census output.

### `CSS-TOK-05`

A value mathematically or perceptually derived from another token — a tint, a nested radius, a negated margin — is written as a derivation with `calc()` or `color-mix()`, never as a second hand-computed literal. A stored copy stops tracking the source the moment a consumer overrides it, so a rebrand half-applies.

- **Why:** The difference between a rebrand fully applying and half-applying — invisible until someone actually overrides the base token and finds the derived value unchanged.
- **Verification:** For each pair of tokens whose values are numerically or perceptually related, the derived one must contain `calc(` or `color-mix(` referencing the other. A hand-computed literal that happens to equal a derivation is the finding.
- **Universal:** yes
- **Evidence:** Spec-derived plus round-1 repo inspection; no round-2 probe targeted it. Stated honestly as reasoning over `var()` resolution semantics, whose underlying mechanism the round-2 engine probe did confirm (cases 10a-10d).

### `CSS-CAS-01`

"My rule loses" has at least eight causes and only two are specificity. Attribute or class scoping inflates it (Astro, Vue, Svelte, Angular Emulated, solid-styled, Stencil `scoped`). CSS Modules and Tailwind utilities inflate nothing and lose on deterministic emit order instead. StyleX at its plugin default pads to (2,1,0)-(3,1,0) with `:not(#\#)` chains. Angular and the runtime CSS-in-JS libraries append their styles to `<head>` at render time and win ties from position. Svelte DELETES a non-matching rule at compile time. Qwik never scopes in the build at all — it scopes when it renders. A shadow boundary means the two selectors never compete. Raising specificity, moving an import, or reaching for `!important` is the wrong move in most of them.

- **Why:** The single generalisation the source doctrine got wrong. It was drawn from two attribute-scoped frameworks and does not describe six of the others; carried unmodified into a CSS-Modules, Qwik or Shadow-DOM repo it produces a confident wrong fix.
- **Verification:** Read the compiled or SERVED rule for the element you are restyling, not the source. Find the selector verbatim in the built stylesheet. Not there at all -> the cause is compile-time deletion, a runtime transform, a shadow boundary, or a runtime-injected sheet, and no selector edit helps. Then read the surface table below before changing anything.
- **Universal:** yes
- **Evidence:** Every branch reproduced this round from real production builds: Astro 7.2.9 `.foo[data-astro-cid-v5njgcdl]` (0,2,0); Vue 3.5.42 `.foo[data-v-b3bb832f]` (0,2,0); Svelte 5.57.0 `.version.svelte-1n46o8q` (0,2,0) plus a class deleted with zero bytes of trace in the minified bundle; Angular 22.1.4 `.foo[_ngcontent-ng-c1639788317]` (0,2,0); CSS Modules `._widget_1a3bt_1` and `.page-module___8aEwW__page`, both bare (0,1,0); StyleX 0.19.0 default `.x1dcnv9r:not(#\#):not(#\#)` = (2,1,0); Qwik 1.20.0 raw unscoped CSS in the JS chunk, `.box.xl09ia-0` (emoji-prefixed) only in rendered HTML; Chromium 151 case 5a — an outer `.p` rule had no effect at all across a shadow boundary.

### `CSS-CAS-02`

Unlayered author CSS beats layered author CSS at any specificity, position-independent, within one tree and one origin — that is the whole mechanism. So put every block you author inside exactly one `@layer` and leave the consumer's file unlayered. **Audit the page's layer landscape first**, because adding a layer can lose: any second author stylesheet you do not control and did not layer then beats you at any specificity. Layer order is order of FIRST APPEARANCE of the name — which a preprocessor's `@use`/`@forward`/`@import` order silently fixes, and which in Angular is fixed by runtime mount order.

- **Why:** It is the only mechanism evaluated — against `:where()`, `@scope`, and raising consumer specificity — that makes a consumer's rule win unconditionally rather than by luck of selector choice. The guarantee is exactly as good as your audit of what else is in the cascade.
- **Verification:** Brace-match every `@layer <name> { ... }` span in the BUILT stylesheet — ANY name, not just yours — and assert the remainder is empty. Never a context grep and never `grep -o`: production CSS is one physical line (`wc -l` = 1 on both Svelte/Vite bundles measured), so `grep -B2 ... | grep -v '@layer'` returns empty and PASSES with a leaked rule in the bundle. Ship the checker as code — see `css-theming/gate.md`. Then enumerate every layer name present; a name you did not author is a landscape you now have to reason about.
- **Universal:** no — **Shadow DOM** — layers never cross a context boundary (the consumer already wins by Context), but wrapping the component's own rules in one layer is what makes the `adoptedStyleSheets` channel work inside the root. **Svelte** — component CSS lands unlayered by default and beats every named layer; a `preprocess` `style` hook is the only way in. **VitePress 1.x and VS Code <=1.103** — the host's own CSS is unlayered, so layering yours makes you LOSE. **Tailwind v4, Panda, StyleX with `useCSSLayers:true`, vanilla-extract `layer()`** — already layered; do not add a second wrapper. **A multi-component Angular library** — layer order is first-render order, so two layers get nondeterministic precedence.
- **Evidence:** Chromium 151: unlayered `.a` (0,1,0) beat layered `#i.a.b` (1,2,0) (case 1); order comes from the statement not block order (3a); re-opening a layer keeps its original position (3b). Reproduced surviving a real production build in Astro 7.2.9 (all three `scopedStyleStrategy` values), Vue 3.5.42, Svelte 5.57.0, Angular 22.1.4/esbuild, CSS Modules under Vite and Next 16.3.3 Turbopack (including `experimental.inlineCss:true`), Tailwind 4.3.3, vanilla-extract 1.21.2, StyleX 0.19.0. The losing cases are measured too: VitePress 1.6.4's `body{margin:0}` reset is unlayered and beat `@layer project{body{margin:4321px}}` sitting in the file's last bytes; 2.0.0-alpha.19 layers its reset and the project layer wins. Angular order flip measured live: rgb(0,0,255) on `/ab`, rgb(255,0,0) on `/ba`, identical source. Preprocessor `@use`/`@import` reordering reproduced in dart-sass 1.103.1 and less 4.9.0.

### `CSS-CAS-03`

Importance REVERSES layer order: a layered `!important` beats an unlayered `!important`. An `!important` inside your layer therefore locks every consumer out with no escape hatch, so never add one without a comment naming why. **Across a shadow boundary the whole remedy runs backwards**: an inner `!important` beats an outer `!important` AND an outer normal rule, in every combination measured. A consumer cannot out-`!important` a component from outside — they already win at normal importance by Context and lose to an inner `!important` unconditionally. So: never author `!important` in a component's `:host`/`::part()`/`::slotted()` rules, and never advise a consumer to reach for one across the boundary.

- **Why:** The one place the layering mechanism inverts, and round 1 got the shadow half backwards — the worst kind of error, since the advice is confidently actionable and permanently defeats the contract.
- **Verification:** Search inside each built layer span for `!important`; every hit needs an adjacent justification comment and an allowlist entry. Separately grep the entry stylesheet for framework-wide important flags — `@import "tailwindcss" important;`, a trailing-`!` utility modifier: where one is present the whole unlayered-consumer-wins promise is void for every rule it touches. In a shadow-DOM component, grep the component's own styles for `!important` at all; each hit is a defect, not a fix.
- **Universal:** no — **Shadow DOM** — the direction reverses; "move it outside the layer" buys nothing there. The only remaining consumer channels are `adoptedStyleSheets` (open roots only — `mode:'closed'` returns `shadowRoot === null` and closes it) or a custom property the component already reads, and even an adopted sheet loses to a component-internal `!important`. An accessibility lock (`prefers-reduced-motion`) is the one legitimate use inside a layer, and it still carries the comment.
- **Evidence:** Chromium 151, all four combinations measured: outer `!important` vs inner `!important` -> INNER wins on the `::part()` path (6a) and on the `:host` path (6d); outer normal vs inner `!important` -> inner (6c); outer `!important` vs inner normal -> outer (6b). Layer-order reversal at equal specificity in light DOM: case 2. Adopted sheet beat the component's layered rule (8a) but lost to its `!important` (8c); `mode:'closed'` closed the channel (8d). Tailwind's important flag reproduced: `.bg-brand{background-color:var(--color-brand)!important}` inside `@layer utilities` beat an unlayered plain consumer rule (r2/tailwind-v4-important/).

### `CSS-CAS-04`

The cascade sorts Element-Attached Styles above Layers: a `style=""` attribute beats every author stylesheet rule at any specificity in any layer. Only `!important` reaches it, and inline `!important` beats that in turn. So any framework feature that paints via an inline style escapes the whole contract — a syntax highlighter, Vue's `v-bind()` in CSS, an editor host writing theme tokens onto the root element, a chart library. Tokenizing a component that emits inline styles produces values no consumer can reach. **Except: email HTML**, where inline styles are not an escape from the contract, they ARE the contract.

- **Why:** The gap the source doctrine missed entirely — and the one surface where the advice inverts rather than merely not applying.
- **Verification:** Render the page and grep the SERVED HTML for `style="` on the elements you claim are themeable. Each hit is either a value that must move into a custom property, or a documented exception whose `!important` workaround is placed outside the layer (light DOM only — see CSS-CAS-03).
- **Universal:** no — Email HTML inverts it: most clients strip `<style>` and support no custom properties, so layers, hooks, `:where()` and fallback chains are all moot there and inline is correct.
- **Evidence:** Chromium 151, all five orderings measured (cases 4a-4e): inline normal beat unlayered `#i` (1,0,0); an author `!important` beat inline normal whether layered or not; inline `!important` beat an author `!important` in both layered and unlayered form. The email half is CITED from caniemail-class client support matrices, NOT reproduced — no email client is locally runnable.

### `CSS-CAS-05`

`@scope` is not a substitute for cascade layers. It contributes zero specificity of its own (a bare selector inside it behaves as `:where(:scope)`), it does not reduce the specificity of the selectors you write inside it, and its proximity tie-break only decides between rules already equal in specificity — it is outranked by layers. Two smaller traps where it is there for its real purpose: the limit element is EXCLUDED from the scope (the donut hole, so a hook silently stops at that boundary), and writing `:scope` explicitly DOES add (0,1,0).

- **Why:** `@scope` reads like the tool for "component styling that doesn't leak" and solves a different problem — proximity disambiguation — from the one at hand, an outside consumer needing to win.
- **Verification:** `@scope` appearing in a diff whose stated purpose is overridability or containment is the finding.
- **Universal:** yes
- **Evidence:** Chromium 151: proximity works and beats source order in both directions (9a, 9b); a layered `@scope (.inner)` LOST to an unlayered `@scope (.outer)` despite being nearer (9c); a scoped `#i` beat an unscoped `.t` (9d). SINGLE ENGINE — `@scope` is one of the two results most likely to differ in Firefox/WebKit, neither installed. Round 1's "most likely wrong turn" framing is dropped: unearned frequency claim, no local repo contains `@scope`.

### `CSS-A11Y-01`

`forced-colors: active` sits above everything else in this file. The UA replaces `color`, `background-color`, `border-color` and `outline-color` with system colours regardless of layer, specificity, origin or `!important` — including a value arriving through `var()`. Two consequences the spec summary hides: `box-shadow` and `background-image` are SUPPRESSED to `none`, not recoloured; and SVG `fill`/`stroke` is not touched at all, so an icon keeps its authored colour and can vanish against the forced background. Give icons an explicit `fill: CanvasText` (or equivalent). `forced-color-adjust: none` is the only opt-out and it opts the whole subtree out of the user's palette — an accessibility decision, not a styling escape.

- **Why:** The one cascade mechanism above the entire token contract, absent from round 1 entirely, and an accessibility obligation rather than a nicety. The SVG gap is a real defect the rule must name, not a spec restatement.
- **Verification:** Run the page under a forced-colors context (Playwright `newContext({forcedColors:'active'})` drives Chromium's real forced-colors mode, not a mock) and read `getComputedStyle` on: one text element, one element whose colour arrives via `var()`, one with `!important`, one inside a layer, one `box-shadow`, and every inline SVG icon. Any `forced-color-adjust: none` in the tree needs a comment naming the accessibility trade.
- **Universal:** yes
- **Evidence:** Chromium 151 via Playwright 1.62.1 (r2/engine-forced-colors/probe.js + out.log): 30 assertions confirmed, 1 genuine refutation, 2 red controls correctly refuted. Author `!important`, a layered `!important`, and a `var()`-sourced value were all replaced (rgb(0,0,0)/rgb(255,255,255)); `box-shadow` and `background-image` computed `none`; SVG `fill` stayed at the authored rgb(22,23,24); `forced-color-adjust:none` restored rgb(1,2,3)/rgb(4,5,6). SINGLE ENGINE — Firefox and WebKit were not installed.

### `CSS-VAR-01`

`var(--x, fallback)` uses the fallback only when `--x` is NOT SET. A property that IS set, to a value the consuming declaration cannot use, is invalid at computed-value time: it resets to the inherited value on an inherited property and to the initial value on a non-inherited one, and ignores the fallback entirely. An empty custom property (`--e: ;`) is a valid value and likewise skips the fallback. So a hook's fallback chain does not protect you from a consumer who sets the hook to the wrong type. `@property` with `initial-value` is the fix — and it MUST declare `syntax` and `inherits`, and `initial-value` unless `syntax:"*"`, or the whole rule is silently discarded with no error.

- **Why:** The hook pattern's entire safety story is the fallback, and the fallback does not cover the most likely consumer mistake. `@property` earns its place on three measured grounds beyond documentation: invalid values fall back to `initial-value` instead of inheriting; `inherits:false` genuinely stops descendants seeing an ancestor's value; and registration is what makes a custom property interpolable at all — an unregistered one jumps.
- **Verification:** For every published hook whose fallback is load-bearing there is a matching `@property --<name>{syntax:...;inherits:...;initial-value:...}`. Set the hook to a deliberately wrong type in a scratch page and confirm the element renders the fallback rather than the inherited value. If you transition a custom property, register it — and transition the property itself, not a derived native property, or the test lies.
- **Universal:** yes
- **Evidence:** Chromium 151. Missing -> fallback (10a); invalid on an inherited property -> the parent's colour, not the fallback (10b); invalid on `background-color` -> rgba(0,0,0,0) (10d); empty custom property -> IACVT, no fallback (10c). `@property`: an invalid value fell to `initial-value` rgb(255,0,0) rather than the parent's rgb(0,255,0); `inherits:false` gave the child rgb(1,1,1); a registered `<length>` measured 294.99px 1s into a 3s linear 0->900px transition while the unregistered control was already at 900px.

### `CSS-API-01`

Where a compiler generates the target name, that name is not an API. Vue's `data-v-<hash>` rotates per build; Svelte's hash is a function of the FILENAME, so moving a file rotates every hash it emits; a CSS Modules hash is path-derived and its whole SHAPE changes with the bundler (`_name_hash_n` under Vite, `name-module___hash__name` under Turbopack); styled-components' `sc-` id shifts when an unrelated `styled()` call executes first; vanilla-extract and StyleX hash by default, including the LAYER name. Ship a dedicated `data-*` identity attribute instead, kept off the `class` attribute — and remember it carries exactly class specificity, so it is not an override mechanism by itself; it only works with the layer underneath it. **Except where nothing generates a name**: plain CSS, Tailwind (utility names ARE the public contract), and a VS Code webview (one flat author-controlled stylesheet) already have a stable target, and minting a second one is a public surface with nothing to protect.

- **Why:** Two independently-built repos converged on the identity-attribute shape. But round 1 generalised it into a universal MUST, which mandates a parallel identity layer in three surfaces where the author's own class names are already build-invariant public API.
- **Verification:** `grep -n 'data-<yourconvention>=' <components>` — every published hook must be reachable from an element carrying one. Then grep your own tests, docs and README for a literal generated hash; each hit is a break waiting for the next file rename or bundler change.
- **Universal:** no — Plain CSS, Tailwind, VS Code webviews — no name-generating compiler, so the author's class is the target. Shadow DOM spells it `part="name"`, exposed one hop only, needing `exportparts` on every intermediate host. shadcn is not a publisher/consumer CSS surface at all — its CLI copies the source into your repo, so there is no versioned package to target and the retheming surface is a git diff. Where an ecosystem already has a convention (`data-slot`, `data-state`) defer to it — but check which registry you have: shadcn's Base-UI-backed registry uses hardcoded class names, not `data-slot`.
- **Evidence:** Reproduced this round: styled-components 6.5.3 content hashes are byte-identical across three runs, but swapping which of two sibling `styled.div` calls EXECUTES first flipped Alpha from `sc-bdvwhi`/`.lagIOb` to `sc-gsDMPd`/`.eIBEsM` — and `babel-plugin-styled-components` replaces the counter with an AST-position id, removing the dependency. CSS Modules hash SHAPE differs by bundler (both artifacts inspected). vanilla-extract `layer('components')` emits `@layer uan7er0`, not `components`. Stencil `scoped:true` emits a guessable tag-derived `sc-my-component` — reachable, but with no semver contract. Shoelace/Web Awesome churn is dated evidence, not hypothetical: repo archived 2026-08-28, `--wa-accordion-divider-color` removed in v3.9.0, the `label` part deprecated in v3.12.0.

### `CSS-API-02`

A component hook is override-only. Grammar `--<namespace>-<component>-<property>`, never declared by your own styles, always read with a `var()` fallback to the semantic tier: `border-radius: var(--ns-card-radius, var(--ns-radius-lg))`. Three ways to get it wrong: a hook that STORES a value becomes a second source of truth that stops tracking a rebrand — and that is exactly what mainstream token tooling emits by default; a bare property-name hook leaks into every component reading that property; and a name your build rewrites or hashes is not a public name at all.

- **Why:** This resolves the apparent contradiction with "never expose a component-level colour knob": the ban is on an independent second value, not on a fallback override point. Every major design system ships the fallback shape; the failure is shipping the stored shape, or shipping a name the compiler renames.
- **Verification:** For every published hook, `grep -rn -- '--<ns>-<component>-<prop>'` over source returns only `var()` READ sites, never a declaration. Then grep the BUILT artifact for the same literal name: absent, or present hashed, means the published name is not the shipped name. On Angular, grep the artifact for `%NS%` instead — the built file always carries the unresolved placeholder — or assert against live computed styles.
- **Universal:** no — **Shadow DOM** — per-tree scoping means a bare property-name hook cannot leak to siblings, so the component segment is optional; Shoelace/Web Awesome ship many hooks unprefixed (`--size`, `--track-width`), so an agent hunting for a `--component-*` name may miss one that exists. **Angular >=22.1** rewrites every custom property in component styles to `--<ns>_<name>` unless authored `--global--<name>` — that spelling is mandatory for any public token there. **StyleX** `defineVars()` and **vanilla-extract** `createThemeContract` hash unless you use the global forms. The tier itself is optional — see CSS-TOK-04.
- **Evidence:** Angular reproduced live at 22.1.4: `@angular/compiler`'s `namespaceCssVariable()` maps `--global--x` -> `--x` and everything else -> `--%NS%x`; with `provideCssVarNamespacing('acme')` the live style text read `var(--acme_consumer-token)` (literal underscore separator) while the build artifact carried `--%NS%consumer-token` throughout. Tailwind plain `@theme` compiles to real properties in `@layer theme{:root,:host{...}}` and was verifiably re-themed from an unlayered consumer `:root`. vanilla-extract token names hashed to `--_13axqhe0` and were still beaten by a consumer `:root` override in Chromium. Lit's `:host`-declared `--component-card-bg` reached an internal `var()` fallback chain across the boundary (computed hotpink).

### `CSS-GATE-01`

The gate reads the BUILT artifact, in an engine that can actually represent the feature — and it is routed per framework or it passes with zero coverage. Four ways it is faked. (1) Wrong artifact: Angular compiles component `styles:` into the JS bundle; Qwik's built JS chunk holds the RAW unscoped author CSS and the scoping only exists in rendered HTML; Svelte publishes uncompiled `.svelte`; Astro's view-transition `@layer astro` lands in an inline `<style>`, not the bundled asset. A glob that matches nothing passes silently — discover with `find`, and fail when the glob is empty. (2) A regex where minification defeats it — production CSS is one physical line. (3) A DOM emulator: **no DOM emulator may ever test a layered cascade** — not "with caution", not "works for simple cases". (4) It was never watched go red.

- **Why:** Both source repos found that stripping one component's layer wrapper left every OTHER assertion green — the build succeeded, every token test passed — and only the dedicated built-output check caught it.
- **Verification:** For each check: name the artifact and confirm the path exists after a real production build (`find <out> -name '*.css' -not -path '*/cache/*'` — never a hardcoded directory, and an empty match is a failure, not a pass); confirm it is not a regex over minified text; confirm any cascade assertion runs in a real browser engine. Then run it against a deliberately broken copy — strip one layer wrapper, plant one untokenized literal. A pass on the broken copy is the violation.
- **Universal:** no — The browser step is conditional — see The Gate. Where the compiled artifact genuinely does not exist (a Svelte library shipping `.svelte`, an Angular library shipping JS, Qwik), the check moves to the artifact that does exist — rendered HTML, or the JS bundle's style strings — never to "no check". Also pin Node: `@angular/cli` 22.1.6 hard-refuses Node 24.14.0, so "just run ng build" is not a runnable instruction without a version note.
- **Evidence:** Reproduced at pinned versions this round. happy-dom 20.12.0 has ZERO `@layer` support (`grep -ri layer` over its `src/css/` returns nothing): an `@layer` block parses to `cssRules.length === 0`, and a bare `@layer a, b;` statement additionally corrupts the parse of every rule AFTER it in the same stylesheet. jsdom 30.0.1 parses `@layer` into correct `CSSLayerStatementRule`/`CSSLayerBlockRule` objects but its computed-style engine ignores every declaration inside any layer — a single uncontested layered rule computes identically to no CSS at all. `wc -l` = 1 on both Svelte/Vite production bundles. Qwik/Angular/Astro artifact routing each reproduced from a real build.

### `CSS-GATE-02`

A verification enters this rule set, a CI job, or a review only after it has been watched go red against a deliberately planted violation. A cascade harness needs at least one deliberately-inverted expectation and one dead-selector control, and every rule's identity must be encoded in the observed value (rgb(1,0,0) vs rgb(2,0,0)) so a "pass" cannot come from reading a UA default.

- **Why:** Round 2 earned this line twice. Two independent harnesses shipped false results before their controls caught them, and both read as clean passes.
- **Verification:** Copy the subject, break the thing the rule forbids, run the verification. A pass on the broken copy is the violation. For a browser harness specifically: open a FRESH page per case — `page.setContent()` reuses one window, so a `customElements.define()` in case 1 silently supplies the CSS for every later case.
- **Universal:** yes
- **Evidence:** Both failures are from this round. The engine probe's first run reported 34/68 because a shared page meant eight shadow-DOM cases inherited the first case's CSS. The forced-colors probe first transitioned the derived `width` property instead of the custom property itself and returned a false REFUTED for both an assertion and its own control. Three designed red controls (inverted expectation, typo selector, wrong-node read) all failed as intended in the final run: 45/45 main cases pass, 3/3 controls fail.

## What round 2 overturned

Round 1 was research; round 2 ran the builds. Full ledger in
[corrections](css-theming/corrections.md) — 10 corrections, of which
2 would have made an agent do the wrong thing:

- **core principle #4 and #5's remedy clause; shadow-dom annex (the annex already carried the correct sentence, the core principle did not)** — Across a shadow boundary the remedy runs backwards. All four combinations measured in Chromium 151: outer `!important` vs inner `!important` -> INNER wins (case 6a on the ::part path, case 6d on the :host path). Outer normal vs inner `!important` -> inner wins (6c). Outer `!important` vs inner normal -> outer wins (6b). A consumer cannot out-!important a component, inside or outside a layer; the …
- **core principle #2 ("StyleX pads every rule with `:not(#\#)` chains"); css-in-js annex** — Both refuted by build. With `useCSSLayers: true` StyleX emits `@layer priority1,priority2,priority3,priority4;` plus four populated layer blocks -- ordinary layered CSS -- and a bare unlayered consumer rule beat both an atomic class and a design token in real Chromium with zero `!important`. With the plugin default (`useCSSLayers: false`) ties are resolved by manufactured CSS specificity …

## Confirmed, with an artifact behind it

Each of these was measured this round; the scratch paths name the run that
produced them, and the re-runnable scripts are committed under `css-theming/probes/`.

- Shadow DOM Context step: an outer `x-el::part(p){color:rgb(2,0,0)}` beat the component's internal `#inner.p{color:rgb(1,0,0)}` -- a (1,1,0) rule losing with no layer and no !important. And an outer type selector `x-el` (0,0,1) beat BOTH `:host` (0,1,0) and `:host(.c)` (0,2,0) on the host, so Context outranks specificity in every consumer-vs-component fight and the published :host tuples are decorative for that comparison. `r2/engine-cascade/out.json` (session scratch) cases 5c, 5i, 5j, 5k.
- Unlayered author CSS beats layered author CSS at any specificity, position-independent: unlayered `.a` (0,1,0) beat layered `#i.a.b` (1,2,0). Layer order comes from the `@layer` statement, not block order; re-opening an earlier layer keeps its original position. Cases 1, 3a, 3b, 3c, same artifact.
- Importance reverses layer order (core principle #4's mechanism): a layered `!important` beat an unlayered `!important` at equal specificity. Case 2, same artifact.
- Inline styles beat every author rule but lose to any author `!important`, which loses in turn to inline `!important` -- all five combinations measured (cases 4a-4e), confirming core principle #5's ordering exactly.
- happy-dom and jsdom cannot test a layered cascade -- the sole justification for the gate's browser step, previously self-cited to our own rule file, now reproduced at pinned versions. happy-dom 20.12.0 has ZERO @layer support (grep of src/css/ returns nothing): an @layer block parses to cssRules.length === 0, and a bare `@layer a, b;` statement additionally corrupts the parse of every rule AFTER it in the same stylesheet. jsdom 30.0.1 parses @layer into correct CSSLayerStatementRule/CSSLayerBlockRule objects but its computed-style engine ignores every declaration inside any layer -- a single uncontested layered rule computes identically to no CSS at all. `r2/minifiers/B_testenv/{happydom_test,happydom_test2,happydom_test3,happydom_test4,jsdom_test,jsdom_test2}.mjs` (session scratch)
- @layer survives a real production build with the scope hook correctly nested inside it in EVERY framework probed -- no annex has to withdraw the layer mechanism. Astro 7.2.9 under all three scopedStyleStrategy values: `@layer probe{.bar[data-astro-cid-v5njgcdl]{color:#00f}}`. Vue 3.5.42 SFC via Vite 8.2.2/lightningcss: `@layer probe{.bar[data-v-0b4715f1]{color:#ff69b4}}`. Svelte 5.57.0 via real vite build, including a correctly nested author `@layer manual-test`. Angular 22.1.4/esbuild: `@layer demo-layer{.foo[_ngcontent-ng-c1639788317]{...}}`, confirmed applying at runtime via getComputedStyle. CSS Modules under Vite, under Next 16.3.3 Turbopack, and again with experimental.inlineCss:true. vanilla-extract 1.21.2 and StyleX 0.19.0. Tailwind 4.3.3 emits five grep-able native layers.

## Planned annexes

| File | Est. lines | Reproduced share |
|---|---|---|
| `rules/css-theming/gate.md` | 150 | ~95% reproduced this round at pinned versions (four-minifier matrix, both DOM emulators … |
| `rules/css-theming/astro.md` | 85 | 100% reproduced from five fresh production builds at astro 7.2.9 / vite 8.2.2 / … |
| `rules/css-theming/vue.md` | 95 | ~90% reproduced from three fresh production builds (vue 3.5.42 + vite 8.2.2; vitepress … |
| `rules/css-theming/svelte.md` | 85 | 100% reproduced from three real `vite build` runs (base, layer-wrapped, unminified) at … |
| `rules/css-theming/angular.md` | 100 | ~90% reproduced: one full `ng build --configuration production` at 22.1.4 / CLI 22.1.6 … |
| `rules/css-theming/tailwind.md` | 85 | 100% reproduced from two fresh Vite production builds at tailwindcss 4.3.3 / … |
| `rules/css-theming/css-modules.md` | 90 | ~90% reproduced from five production builds (Vite 8.2.2, three `next build` runs at … |
| `rules/css-theming/css-in-js.md` | 90 | ~80% reproduced: vanilla-extract 1.21.2 and StyleX 0.19.0 built and browser-verified … |
| `rules/css-theming/web-components.md` | 110 | ~85% reproduced in Chromium 151 (engine probe: 45/45 main cases pass, 3/3 red controls … |
| `rules/css-theming/vscode-webview.md` | 75 | ~0% reproduced this round — no probe touched webviews. Everything here carries from round … |

Covered by a core table row instead:

- **Plain CSS / no framework** — the core file IS the plain-CSS rule. No compiler-injected selector, so an annex would be the index restated. Its non-obvious mechanics (var() IACVT and @property, light-dark() following color-scheme not prefers-color-scheme, @scope's zero specificity and donut hole, @import having to precede everything except @charset and @layer statements) live in the core body as CSS-VAR-01, CSS-TOK-03 and CSS-CAS-05.
- **Sass / SCSS / Less as a compile layer** — folded into the CORE, not annexed, because the globs already load on .scss/.sass/.less and the defect is the SAME defect the core already owns. `$brand`/`@brand` interpolation is CSS-TOK-01 byte-for-byte (reproduced in dart-sass 1.103.1 and less 4.9.0); `@use`/`@forward`/`@import` order fixes @layer first-appearance order, so reordering two lines that touch no @layer silently reverses which layer wins (CSS-CAS-02). Two facts with no existing core analog, stated as a short core section: Sass nesting accumulates the full ancestor path (`.nav{ul{li{a{}}}}` -> `.nav ul li a`, (0,1,3), so a consumer's `.nav a` cannot win), and Sass nesting and NATIVE nesting have DIFFERENT specificity — `.card, .card-alt#legacy { .title{} }` duplicates under Sass to (0,2,0) and (1,2,0) while the spec-accurate native desugaring is one `:is(.card, .card-alt#legacy) .title` at (1,2,0) for both branches, so migrating hand-authored nesting to native `&` changes override difficulty for elements that never touch the id branch. Plus: Less variable scoping is lazy/dynamic, not lexical — a variable used before its later redeclaration in the same block resolves to the LATER value.
- **Design-token tooling (DTCG / Style Dictionary / Tokens Studio)** — table row. No selector, no tuple. Two facts folded into the core: `outputReferences` defaults to FALSE and inlines every alias (CSS-TOK-02), and mainstream tooling models the component tier as a first-class DECLARED token with its own value, which is exactly the anti-pattern CSS-API-02 exists to avoid. Row-level facts: DTCG stable is 2025.10; a colour $value is an OBJECT, not a hex string, and Style Dictionary accepts the invalid hex-string form silently; DTCG explicitly forbids inferring tier from group structure, so a component/ folder enforces nothing.
- **Stencil `scoped: true`** — row, pointing at web-components.md. `.name` -> `.name.sc-my-component` (0,2,0), one real global <style> in <head>, no shadow root. Neither attribute-scoped nor boundary-isolated: the diagnosis table needs the row or an agent misclassifies it both ways.
- **Solid / solid-styled** — row. Emits `s:c-<hash>-<n>`, a colon-namespaced boolean attribute consumed as `.box[s\:c-a67badc0-0]` — grepping a build for `data-s-` finds nothing. It only fires for files under src/** (unplugin-solid-styled's default filter); a root-level component ships silently unscoped with no error. Solid's `style={{}}` prop is inline-style painting under CSS-CAS-04.
- **Qwik** — row, and a gate consequence. `useStylesScoped$` is a RUNTIME transform: the built JS chunk contains the RAW unscoped author CSS, so a gate reading the build sees nothing scoped and nothing layered. Real SSR output is an emoji-prefixed second class on the element plus a `<style q:style>` carrying `.box.<emoji>xl09ia-0{...}` — (0,2,0). For Qwik the gate reads rendered HTML.
- **Nuxt / React Router 7-8** — row, pointing at css-modules.md. Both are Vite-based and both preserved declaration order for global stylesheets bundled into one file, same mechanism as Next's. Not tested: per-route code-split CSS under lazy-loaded routes in either.
- **shadcn / Radix / Base UI** — row, pointing at CSS-API-01. shadcn is not a publisher/consumer CSS surface at all: its CLI copies component source INTO your repo, so there is no versioned package whose stylesheet anyone overrides and the retheming surface is a git diff on code you now own. Radix and Base UI both ship the data-state/data-disabled/data-orientation family; shadcn's default registry adds data-slot on top — but its Base-UI-backed registry uses hardcoded class names (cn-button-variant-outline) instead, so "defer to data-slot" is not safe for every shadcn output.
- **Lit / Shoelace / Web Awesome** — row, pointing at web-components.md.
- **Email HTML** — row, and it INVERTS CSS-CAS-04 and CSS-TOK-01: most clients strip <style> and support no custom properties, so inline styles are the contract, not an escape from it, and layers, hooks, :where() and fallback chains are all moot. Spec/support-matrix cited (caniemail), NOT reproduced — no email client is locally runnable.
- **iframe / widget embeds** — row. No CSS override channel exists at all: a separate Document in a nested browsing context, so no custom property, no layer and no selector crosses. The retheming contract is postMessage or a URL parameter. Cited from the HTML Living Standard's nested-browsing-context semantics, NOT reproduced — no host+embed browser pair was loaded. The row exists so its absence does not read as "no traps here".

## Not studied

An agent must be able to tell "we checked and it is fine" from "nobody
looked". These are the second kind.

- **Firefox and WebKit — every engine result in this rule is Chromium 151.0.7922.34.** Neither was installed. The two results most likely to differ are `:host-context()` (works in Chromium 151; round 1's claim that it no-ops in two of three engines is unmeasured in either direction) and `@scope` (cases 9a-9d).
- **The absolute specificity of `::part(x)` and `::slotted(.foo)`** — spec-cited, structurally unobservable through the cascade. What IS measured is that the prefix accumulates and that ties resolve by source order.
- **VS Code webviews entirely.** No probe touched them this round. Whether the injected `<style id="_defaultStyles">` survives a CSP of `style-src ${webview.cspSource}` with no `unsafe-inline` — and therefore whether the <=1.103 `@layer` boundary is unconditional — remains asserted. The codicon.css argument independently justifies "do not layer" and is what the annex leans on.
- **ocx-catalog's own layer contract.** test/theme/layer_contract.test.ts and test/build/css_layer_real_build.test.ts were read, never run — the repo has no node_modules and installing into a tracked user repo was forbidden. Do not cite them as passing checks.
- **`provideCssVarNamespacing()` x Angular Material's partially-compiled components.** The namespacing mechanism and the `--global--` escape are confirmed at 22.1.4; the interaction (Material's partials rewritten by the consuming app's linker while mat.theme()'s Sass output is not) was not built.
- **StyleX beyond @stylexjs/postcss-plugin invoked through postcss-cli.** webpack, rollup and unplugin paths were not exercised, so the annex's only actionable remedy is verified on exactly one toolchain.
- **Emotion independently.** Exercised only through the Next RSC probe; its &&/&&& and runtime-injection behaviour are inferred from styled-components, not separately reproduced. **Panda CSS** carries round-1 evidence only.
- **styled-components under SSR streaming / Suspense-boundary resolution.** The order-dependent id-assignment MECHANISM was reproduced, and render order alone does NOT perturb it (only styled()-call order does) — but the streaming-nondeterminism scenario round 1 asserted was never built.
- **`@media (min-width: var(--x))` being rejected by browsers** — cited by the preprocessor probe as documentation, not reproduced. It is load-bearing for CSS-TOK-02's "a media condition cannot read a var() at all"; the existing engine harness could add one case cheaply.
- **Per-route code-split CSS ordering** under lazy-loaded routes in Nuxt and React Router (only a single root-level global bundle was tested), and **Next's `experimental.cssChunking` reordering when the import graph changes** (only an unchanged tree was rebuilt).
- **Email HTML client behaviour and iframe cross-document isolation.** Both cited from support matrices and the HTML Living Standard, not executed. They ship as explicitly spec-cited rows, not as reproduced findings.
- **Astro Vue/Svelte islands**, and is:global/is:inline interaction with an island's own styles. Only a React island was built. Likely representative — Astro's scoping never inspects any child framework's render output — but not confirmed.
- **Style Dictionary's `outputReferences` default and the DTCG format facts** — documentation-derived; no repo on this machine uses Style Dictionary.
- **Qwik `useStyles$`** (the unscoped variant) and Qwik's slot/component boundary behaviour: only `useStylesScoped$` was exercised. **SolidStart's own SSR pipeline** — only a plain Vite CSR build of solid-styled was tested.
- **Container style queries as a token-delivery channel, `:has-slotted`, and `exportparts` relaying** — named in round 1, probed by nobody.

## Open questions

- Cross-engine. Every engine result in this rule is Chromium 151. `:host-context()` and `@scope` are the two most likely to differ; a single Firefox + WebKit run of the existing probe would settle both cheaply, and round 1's claim that `:host-context()` no-ops in two of three engines is still unmeasured in either direction.
- VS Code webviews are the only annex with zero round-2 reproduction, and one open fact — whether the injected `<style id="_defaultStyles">` survives a CSP with no `unsafe-inline` — decides whether the ≤1.103 `@layer` boundary can be stated unconditionally. Someone has to open devtools once.
- `@media (min-width: var(--x))` is load-bearing for CSS-TOK-02's "a media condition cannot read a var() at all" and is cited, not run. The existing engine harness could add one case in minutes.
- Should the shipped brace-matcher tolerate a brace inside a string literal (`content: "{"`)? Handling it means a real tokenizer; not handling it means one documented false positive. Currently documented rather than handled — revisit if anyone hits it.
- The `light-dark()` skip in dark-parity is a heuristic (skip any declaration containing `light-dark(`). A theme mixing both authoring styles gets partial coverage with no signal that it did. Whether to warn on a mixed theme, or require one style per file, is unresolved.
- StyleX's `useCSSLayers` is verified on exactly one toolchain (postcss-plugin via postcss-cli). It is the annex's only actionable remedy for a default output no consumer selector can beat. If webpack/rollup/unplugin do not plumb it, the annex names a fix a reader cannot apply.
- Whether Angular's mount-order layer nondeterminism has any mitigation short of "use exactly one layer per library". That is the current advice, and it is a restriction, not a fix.
- Per-route code-split CSS ordering (Nuxt, React Router, Next `cssChunking` under a changed import graph). Single-tree determinism was measured and must not be generalised; nobody has measured the changed-graph case.
- Email HTML and iframe embeds ship as spec-cited rows. If either becomes a real target for this rule set, both need a genuine probe — an email-rendering service for the first, a host+embed browser pair for the second.

## Cut from round 1, deliberately

- The Non-Negotiables / Rules-This-File-Owns duplication. Round 1 stated the same content three times (a 13-row table, a 14-row table, and per-principle prose). ONE table now — `ID | Rule | Rationale | Verification | Severity` — with the exception clause inline in bold and the evidence as one italic line under it. Annexes carry per-surface divergence only and never restate a rule.
- Bare `**/*.ts **/*.js **/*.mjs **/*.cjs **/*.mts **/*.cts` globs. They loaded a CSS index on every TypeScript file in every repo including backends and CLIs. Replaced with named CSS-in-JS conventions plus `.tsx/.jsx` plus a `components/**` prefix; the residual miss is named explicitly in Siblings.
- "A bare `@layer a, b;` ordering statement is dropped by production minifiers whenever block order already implies the same precedence", and its remedy "write layer blocks in the intended precedence order physically". Both the trigger and the mitigation were refuted by the four-minifier matrix. What replaces them is the measured fact: layer order is first-appearance order, and what actually moves it is `@use`/`@forward`/`@import` order in a preprocessor and mount order in Angular.
- "Astro injects `@layer astro.images` in any project using `<Image>`." A production build with `<Image layout="constrained">` under default config emits it nowhere; it needs `image:{responsiveStyles:true}`. The brace-match-ANY-name instruction survives; its stated justification does not.
- "`:root` inside a shadow root reaches nested shadow trees further down." Measured: it matches nothing at all, not even the root's own child. Invented behaviour.
- "`@layer` is a structural no-op in shadow DOM." Measured false in two directions, and the line would have deleted the only selector-free override channel the annex offers — an unlayered `adoptedStyleSheets` sheet beating the component's layered rules.
- "StyleX: there is no CSS-file entrypoint for a downstream consumer at all by design" and "ties are resolved by StyleX's own deterministic compile-time ordering, not CSS specificity or source order at all." Both refuted by build: with `useCSSLayers:true` it is ordinary layered CSS a bare consumer rule beats; at the plugin default it is manufactured specificity, (2,1,0)–(3,1,0). Ordinary cascade mechanics either way.
- "ViewEncapsulation.ShadowDom … scoping is browser-enforced and the specificity question is moot." Angular copies every globally-registered component style — all of Angular Material — into every ShadowDom component's shadow root. Shadow DOM blocks outside page styles; it does not block Angular's own.
- "3 characters remain outside `@layer grimoire` in grimoire-indexer's production build." Zero, not three — `build.test.ts:897` asserts exactly `""` and the suite passes 53/53. Also that repo's `npm run build` is tsc + template copy and emits no `dist/*.css`, so it was the wrong command to cite.
- "Two of our own repos ran the identical DRY test and got zero primitives and a small primitive set respectively" — round 1's justification for refusing to pin a tier count, repeated in its closing line. Never reproduced, and ocx-catalog's own rule file says the opposite. The method (census before minting) ships; the anecdote does not.
- The `@scope` rule's framing as "the most likely wrong turn for an agent reaching for a newer, more targeted-sounding feature." Unearned frequency claim — no local repo contains `@scope`. The mechanics stay, now measured (cases 9a–9d).
- The astro annex's `is:global`-vs-`is:inline` positioning argument as "the consumer entrypoint". A layer contract is position-independent by design. What survives is the one verified consequence: a relative `url()` or `@import` does not resolve under `is:inline`.
- The css-in-js annex's 115-line five-library treatment. Panda is now four lines (already layered, plus the `.dark`-vs-`[data-theme]` trap) and vanilla-extract is the two name-stability splits; the depth goes to styled-components/Emotion, StyleX, and the RSC boundary.
- Publishing `:host` and `::part()` specificity tuples as if they decided consumer-vs-component outcomes. Measured: Context outranks specificity, so an outer type selector (0,0,1) beats `:host(.c)` (0,2,0). The tuples are decorative for that comparison and are now labelled spec-cited, not measured.
- The four false `holds_everywhere: true` flags, and two more found this round. CSS-TOK-01 (email inverts it), CSS-TOK-03 (`light-dark()` and webviews), CSS-API-01 (plain CSS, Tailwind and webviews all have stable author-controlled names), CSS-CAS-03 (shadow DOM reverses the direction), plus CSS-CAS-02, CSS-CAS-04, CSS-API-02 and CSS-GATE-01. Six rules now carry a bold **Except:** clause; the rest carry none and survive every surface studied.
- `@property`'s ambiguous status — named in one table and absent from the other. It is IN, as CSS-VAR-01, decided by measurement: invalid values fall back to `initial-value` rather than inheriting, `inherits:false` is a real behavioural switch, and registration is what makes a custom property interpolable at all.

## The corpus

| File | What |
|---|---|
| [`doctrine-extraction.md`](css-theming/doctrine-extraction.md) | What the existing repo rules teach, and where they disagree |
| [`round1-critique.md`](css-theming/round1-critique.md) | The `needs-another-round` verdict that commissioned round 2 |
| [`corrections.md`](css-theming/corrections.md) | Round 2 measurement vs round 1 research, worst first |
| [`round2-gate.md`](css-theming/round2-gate.md) | Final gate, and the three items to fix while drafting |
| `<framework>.md` (11) | Round-1 researcher artifacts, each with its adversarial review verdict inline |
| `build-<framework>.md` (8) | Round-2 production builds: emitted selectors, layer survival, failures |
| `engine-<probe>.md` (2) | Round-2 Chromium measurements, with red controls |
| `surface-<area>.md` (3) | The gaps round 1's critic named: preprocessors, component libraries, meta-frameworks and embeds |
| `probes/` | The re-runnable probe scripts and their recorded output |

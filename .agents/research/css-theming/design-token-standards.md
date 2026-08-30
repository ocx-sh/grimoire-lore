# Design token standards & tooling (W3C DTCG format, Style Dictionary, Tokens Studio)

Round-1 researcher artifact, design-token-standards. Adversarially reviewed; the
**Review verdict** section below overrides the body wherever they disagree.

- **Versions checked:** DTCG Format Module: stable release 2025.10 (published 2025-10-28); a newer in-progress preview draft dated 2026-07-30 exists but is explicitly marked "do not implement." Style Dictionary: v5.x per styledictionary.com current docs (2026). Tokens Studio for Figma: current plugin docs, W3C-DTCG format mode vs legacy format, 2026.
- **Review verdict:** `needs-correction`
- **Annex recommended:** False — This target is the naming/tiering layer, not a scoping or rendering framework — it has no compiled component selector, no specificity tuple, and (by default) no cascade-layer behavior of its own to document, so the annex's usual payload ("X compiles to Y at specificity Z") is empty here. Its two load-bearing, would-get-it-wrong-without-the-rule findings — Style Dictionary's `outputReferences` default silently breaking the override chain, and mainstream tooling's declared (not override-only) component tier — are tooling-config facts that apply identically no matter which rendering framework consumes the emitted tokens. They belong as amendments to core doctrine points 1 and 4 (or a short note in the core file's index pointing at whichever build tool a repo uses), not as a seventh per-framework annex; a dedicated file would just restate the same two build-flag warnings under every framework's name, which is the discoverable-by-reading-the-config duplication the brief says doesn't belong.

## Scoping mechanism

Not applicable — this is not a rendering/scoping framework. DTCG defines a JSON token file format only (no CSS emission). Style Dictionary is a build tool: it reads token JSON/YAML and emits flat custom-property declarations wrapped in a selector (default `:root`); it applies no per-component scoping and has no knowledge of a "component" in the CSS/DOM sense. Tokens Studio is a Figma-side authoring plugin over the same JSON shape. None of the three participate in the cascade beyond emitting `--name: value;` lines.

## Emitted specificity

N/A — no selectors are compiled from component markup by any of these tools. Style Dictionary's built-in `css/variables` format emits everything under one `:root{}` block (specificity (0,1,0)), full stop; there is no per-component selector to have a tuple. Wrapping in a different selector or an `@layer` is possible only via `file.options.selector`/custom format functions, or the third-party `style-dictionary-utils` package's `css/advanced` format (`file.options.rules[].atRule`) — none of this ships by default.

## Cascade-layer support

No `@layer` support in Style Dictionary core. The built-in `css/variables` format only supports a `selector` wrap (default `:root`) and an `outputReferences` boolean — no `atRule`/layer option exists in the documented predefined formats (styledictionary.com/reference/hooks/formats/predefined/). `@layer` wrapping requires either a hand-written custom format function (Style Dictionary formats are plain JS callbacks — fully possible) or the third-party `style-dictionary-utils` package's `css/advanced` format, whose `file.options.rules[].atRule` accepts an at-rule string/array (documented for `@media`; usable for `@layer` the same way, unconfirmed by a first-party example — confidence low on the @layer-specific example, high on the atRule mechanism existing). DTCG and Tokens Studio have no opinion on layers at all — out of scope for both.

## Consumer override entry point

Not this layer's job. These tools produce the *source* stylesheet a downstream consumer overrides — they are upstream of the "where does a consumer's CSS go" question our core doctrine (points 2–3) answers. The only override-adjacent mechanism native to this tooling is `outputReferences`: with it `true`, a semantic token compiles to `var(--primitive-x)` (chain preserved, primitive is the real override point); with it `false` (the documented default), the value is inlined as a literal and the chain is gone in the compiled CSS — so the *existence* of a working override entrypoint for anything above the primitive tier depends entirely on this one build flag being set correctly.

## Token exposure

Idiomatic DTCG token: `{ "$value": "#3b82f6", "$type": "color", "$description": "...", "$extensions": { "com.vendor.foo": {...} } }`; composite types (shadow, typography, border, gradient, transition, strokeStyle) bundle sub-values under one `$value` object. References use `{group.token}` curly-brace syntax, resolving to the target's `$value`; a newer `$ref` JSON-Pointer form allows reaching into a sub-property of a composite token (e.g. `"#/colors/blue/$value/components/0"`). The contract file is the token JSON tree itself — there is no framework-native "one CSS file is the contract" convention the way our two repos' `tokens.css`/`quality-design-tokens.md` set one up; Style Dictionary's build output (e.g. `dist/css/variables.css`) is a *generated artifact* of that JSON, not hand-authored, and DTCG explicitly disclaims any tiering meaning in how tokens are grouped: **"Groups are arbitrary and tools SHOULD NOT use them to infer the type or purpose of design tokens"** (designtokens.org/tr/drafts/format/). Tokens Studio adds no built-in primitive/semantic/component structure either — Sets/Groups are pure user convention (docs.tokens.studio/manage-settings/token-format).

## Theme switching

No spec-level mechanism. Convention (not enforced by any of the three) is separate token sets per theme (e.g. a `light` and `dark` JSON tree) composed at build time into either separate files/selectors (Style Dictionary: one platform/file per theme, each with its own `file.options.selector`, e.g. `[data-theme="dark"]`) or Tokens Studio's Theme feature (compose multiple token sets into one exported theme). Confidence medium — not verified against a first-party worked example in this pass; matches the pattern both local repos (kate-middlechild `dark.css` under `[data-theme="dark"]`, grimoire-indexer `[data-theme="dark"]`) already use, so the tooling doesn't contradict, it just doesn't supply it.

## Testability

There is no "grep the compiled CSS for a rule outside the layer" equivalent here because there's no layer. The two checks this research surfaces instead: (1) build with `outputReferences:true` for every non-primitive tier, then grep the **compiled** CSS for a primitive's literal value appearing anywhere outside the primitive's own declaration — a hit proves a reference got inlined and the override chain is broken; (2) grep the compiled token stylesheet for a component-tier custom-property name that the doctrine says must be override-only — its *presence* as a declaration (not just a `var()` read site in component CSS) is the defect, mirroring quality-css-overrides.md's existing pattern ("a hook that stores a value instead of falling back is the defect") but checked against the token build's own output, not just component source.

## Where this contradicts the core doctrine

Point 4 (tiering) — mechanism divergence, not intent divergence: the dominant tooling (Style Dictionary, Tokens Studio) and naming literature (Rangle, Figma resource library) model ALL three tiers — including component — as first-class DECLARED tokens with real build-emitted values (e.g. `button-primary-bg` is built and shipped as an actual custom-property declaration that aliases a semantic token). Our doctrine's component-hook tier is the opposite: never declared by the theme, only read via `var(--hook, var(--semantic-fallback)))`. Neither literature nor tooling has a counterpart to "override-only, undeclared" — that pattern is specific to shipping CSS to a consumer who can only append a stylesheet, a use case the general token-tooling ecosystem (built for an org's own multi-platform design system, where the org controls every consumer) doesn't address. Points 2–3 (source order, cascade layers, specificity) — no contradiction, simply out of scope: DTCG/Style Dictionary/Tokens Studio operate upstream of the CSS cascade entirely and make no selector-scoping or specificity claims for core doctrine to conflict with. Points 1 and 5 — reinforced, not contradicted: `outputReferences` is a concrete mechanism-level illustration of point 1 (an unreferenced/inlined value is unreachable exactly the way an untokenized literal is), and the W3C mailing-list stance that token visibility is "very easy to manage... one only has to filter" but is NOT guaranteed by the spec is a stronger version of point 5 — even the standard's own authors treat enforcement as the consuming project's job, never the format's.

## Traps

- Treating a DTCG group/folder name (e.g. a `component/` subtree) as spec-enforced tiering — DTCG explicitly forbids tools from inferring type or purpose from groups; nothing polices the primitive/semantic/component boundary without a hand-written lint.
- Leaving Style Dictionary's `outputReferences` at its documented default (`false`) when building CSS — a semantic or component token that aliases another token gets the alias's *value* inlined as a literal instead of emitted as `var(--other-token)`, so overriding the referenced custom property no longer reaches anything downstream in the compiled file.
- Following the mainstream token-tooling tutorials (Style Dictionary examples, Tokens Studio guides, most naming-convention writeups) and declaring the component tier as a real token with its own `$value`, built and shipped as an actual declared custom property — standard practice in this literature, but exactly what our doctrine's override-only hook forbids: a declared `--button-primary-bg: #xxx` in the shipped stylesheet is a second value a consumer must fight, not an override point that falls through.
- Assuming Style Dictionary's built-in `css/variables` format wraps output in `@layer` because the core doctrine says everything framework-authored must be layered — it does not; the built-in format only supports a plain selector wrap, and cascade-layer output requires a custom format function or a third-party package.
- Assuming the format or build tool gives 'private primitive' tokens for free — visibility is achieved only by a Style Dictionary `filter` (or simply omitting a source file from the public platform's build); nothing in DTCG or Style Dictionary enforces or even represents public/private as a concept.
- Treating 'semantic = the stable layer' as universally true from day one — Rangle's token-maturity model notes semantic tokens are the *most* volatile layer early in a design system's life, before the design vocabulary has settled; the doctrine's 'semantic is public API' assumes a system that has already shipped, not a system still finding its names.

## Claims

| Claim | Confidence | Evidence |
|---|---|---|
| DTCG stable spec version is 2025.10, published 2025-10-28; a 2026-07-30 preview draft of the next revision exists and is explicitly marked not for implementation. | high | https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ ; https://www.designtokens.org/tr/drafts/format/ |
| DTCG tokens require `$value`; optional `$type`, `$description`, `$extensions` (reverse-domain-namespaced), `$deprecated`. Composite types: shadow, typography, border, gradient, transition, strokeStyle. References use `{group.token}` curly-brace syntax; a `$ref` JSON-Pointer form reaches into composite sub-values. | high | https://www.designtokens.org/tr/drafts/format/ |
| DTCG explicitly states groups are arbitrary and tools must not infer token type/purpose (i.e. tier) from them — there is no spec-level primitive/semantic/component concept or public/private visibility concept. | high | https://www.designtokens.org/tr/drafts/format/ (quoted: "Groups are arbitrary and tools SHOULD NOT use them to infer the type or purpose of design tokens.") |
| Style Dictionary's built-in `css/variables` format wraps output in `:root` by default and supports `options.outputReferences` (boolean, default `false`) to preserve `var()` chains instead of inlining resolved literals. | high | https://styledictionary.com/reference/hooks/formats/predefined/ |
| Style Dictionary core ships no `@layer`/at-rule wrapping option on its predefined CSS format; `@layer`-style wrapping is available via custom format functions or the third-party `style-dictionary-utils` package's `css/advanced` format (`file.options.selector`, `file.options.rules[].atRule`). | medium | https://github.com/lukasoppermann/style-dictionary-utils ; https://styledictionary.com/reference/hooks/formats/predefined/ (absence confirmed by omission) |
| Token visibility (public vs private/primitive) is achieved purely through Style Dictionary's `filter` hook or platform-scoped builds — no format or spec-level enforcement exists; this was an explicit, deliberate design choice discussed on the DTCG mailing list. | high | https://lists.w3.org/Archives/Public/public-design-tokens-log/2024Jan/0008.html ; https://styledictionary.com/reference/hooks/filters/ |
| Tokens Studio supports both a legacy (`value`/`type`) and W3C DTCG (`$value`/`$type`) format, and imposes no built-in primitive/semantic/component structure — Sets and Groups are user-organized. | medium | https://docs.tokens.studio/manage-settings/token-format |
| Dominant three-tier literature (primitive→semantic→component, reference downward only, name-by-role not value) matches our core doctrine's tier ordering, but its 'component token' is a first-class declared token with its own build-emitted value, not an undeclared override-only fallback read — a mechanism divergence from our hook doctrine. | medium | https://rangle.io/blog/developing-your-token-structure ; https://www.figma.com/resource-library/design-tokens/ ; general pattern confirmed across zeroheight/Netguru sources already cited in /home/mherwig/dev/ocx-catalog/.claude/artifacts/research_design_tokens_2026-08-24.md |
| Semantic tokens are described in maturity-model literature as the most volatile tier early in a system's life (not the most stable) — component token *names* are described as stable once a component API exists, because they alias rather than redefine. | medium | https://rangle.io/blog/developing-your-token-structure (quoted: "Semantic tokens are not strictly necessary at this stage as it's expected that the design language is still being developed, and therefore quite volatile." / "Component token names tend to be very stable.") |

## Review verdict

**Refuted:** "@layer wrapping requires either a hand-written custom format function ... or the third-party style-dictionary-utils package's css/advanced format" (layer_support; claim 5)

- Why wrong: Style Dictionary's BUILT-IN css/variables format documents `selector` as `string | string[]`, and the v5 implementation nests an array of selectors outermost-first via a plain `${selector} {` wrap. Passing `selector: ['@layer tokens', ':root']` therefore emits a cascade layer with zero custom code and no third-party dependency. The researcher inferred absence from the option NAME (`layer`) rather than testing the option that exists.
- Correction: Style Dictionary v5.5.2 CAN emit @layer from the built-in `css/variables` format: `options: { selector: ['@layer tokens', ':root'] }`. It is a selector-nesting side effect, not a first-party layer feature (nothing validates the at-rule string), so it deserves a one-line caveat — but the doctrine-point-3 mechanism is one config line away, not behind a custom format. style-dictionary-utils (v6.0.1, peerDeps style-dictionary ^5) remains a valid alternative, not a requirement.
- Evidence: Source read: /tmp/sdchk/node_modules/style-dictionary/lib/common/formats.js lines ~189-240 — `const selector = Array.isArray(options.selector) ? options.selector : ...` then `nestInSelector = (content, selector, indentation) => `${indentation}${selector} {\n` + content + ...`; grep for "layer" over that file returns 0 matches (so the researcher is right that no option is NAMED layer). Reproduced build with style-dictionary@5.5.2, /tmp/sdchk/out-layer.css:
@layer tokens {
  :root {
    --color-blue: #3b82f5;
    --color-brand: var(--color-blue);
    --button-bg: var(--color-brand);
  }
}
npm view style-dictionary version => 5.5.2; npm view style-dictionary-utils version peerDependencies => 6.0.1, {style-dictionary: ^5}.

**Refuted:** "The built-in css/variables format only supports a `selector` wrap (default `:root`) and an `outputReferences` boolean" (layer_support; emitted_specificity; claim 4)

- Why wrong: Incomplete to the point of being wrong, and the omission is load-bearing. The documented and implemented option set is showFileHeader, outputReferences (boolean OR function), outputReferenceFallbacks, usesDtcg, selector (string OR string[]), sort, formatting. `outputReferenceFallbacks` is the one first-party mechanism that emits exactly the `var(--x, <fallback>)` shape doctrine point 4 requires for a component hook, and the researcher never mentions it anywhere in the findings.
- Correction: State the full option set, and name `outputReferenceFallbacks: true` as the first-party way to emit fallback-bearing references. It is the closest thing in this toolchain to the hook pattern, and it is the single most useful fact this research could have carried into core doctrine.
- Evidence: https://styledictionary.com/reference/hooks/formats/predefined/ (css/variables option table). Source: /tmp/sdchk/node_modules/style-dictionary/lib/common/formats.js — `const { outputReferences, outputReferenceFallbacks, usesDtcg, formatting, sort } = options;`. Reproduced, /tmp/sdchk/out-refs-fallback.css: `--color-brand: var(--color-blue, #3b82f5);` and `--button-bg: var(--color-brand, #3b82f5);`

**Refuted:** override_entrypoint: "with it `false` ... the chain is gone in the compiled CSS — so the *existence* of a working override entrypoint for anything ABOVE the primitive tier depends entirely on this one build flag"

- Why wrong: Inverted. With outputReferences:false every tier is still emitted as its own declared custom property holding a literal; semantic and component properties remain fully overridable by a consumer. What breaks is the PRIMITIVE as an override point — overriding `--color-blue` reaches nothing, because nothing reads it any more. The researcher's own pitfall bullet #2 states this correctly; the override_entrypoint prose states the opposite. A published rule carrying the prose version would tell an agent to override the wrong tier.
- Correction: outputReferences:false costs you the primitive tier as an override point (and only that). Tiers at or above the point where a consumer injects a value stay overridable regardless of the flag. The flag governs whether an override PROPAGATES down the alias chain, not whether an entrypoint exists.
- Evidence: Reproduced, /tmp/sdchk/out-default.css (usesDtcg:true, outputReferences left at default): `--color-blue: #3b82f5; --color-brand: #3b82f5; --button-bg: #3b82f5;` — `--color-brand` and `--button-bg` are still real declarations a consumer can override; `--color-blue` is now read by nothing. Contrast /tmp/sdchk/out-refs.css: `--color-brand: var(--color-blue);`

**Refuted:** token_exposure: "Idiomatic DTCG token: { \"$value\": \"#3b82f6\", \"$type\": \"color\", ... }" (and claim 2's token shape)

- Why wrong: A plain hex string is not a legal color $value in the stable 2025.10 spec. The color type takes an object with `colorSpace` and `components` (optional `hex` fallback and `alpha`). The stable release announcement calls out exactly this change (Display P3, Oklch, CSS Color Module 4 spaces). Shipping the hex-string form as "idiomatic DTCG" in a published rule teaches an agent to write invalid tokens.
- Correction: Idiomatic 2025.10 color token: { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.23, 0.51, 0.96], "hex": "#3b82f6" } }. Note separately that Style Dictionary does NOT validate this — it happily builds a hex string — so the invalid form fails silently rather than loudly.
- Evidence: https://www.designtokens.org/tr/2025.10/format/ — color $value shown as {"colorSpace":"srgb","components":[1,0,0]}; "The value MUST follow rules and syntax for the chosen type as defined by this spec." https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ — "full support for Display P3, Oklch, and all CSS Color Module 4 spaces". Reproduced tolerance: /tmp/sdchk/tokens.json contained {"$type":"color","$value":"#ff0000"} and SD 5.5.2 emitted `--color-legacyhex: #ff0000;` with no error.

**Refuted:** Every DTCG claim (claims 1, 2, 3, and the token_exposure quote) cites https://www.designtokens.org/tr/drafts/format/ as its evidence, at confidence high

- Why wrong: That URL is the preview draft the researcher themselves flagged as not-for-implementation. Its own banner reads: "This is a preview. Do not attempt to implement this version of the specification. Do not reference this version as authoritative in any way." Sourcing a published rule set's spec facts from a document that forbids being cited as authoritative is a methodological defect, independent of whether the facts happen to be right.
- Correction: Re-cite all DTCG facts to https://www.designtokens.org/tr/2025.10/format/ (Final Community Group Report, 28 October 2025). I re-verified the groups quote, the composite-type list and $deprecated against that URL and they hold there verbatim — so the claims survive, the citations do not. Also note the trap for future readers: the drafts page is TITLED "2025.10" but dated 30 July 2026, so a version string alone does not tell you which document you are reading.
- Evidence: https://www.designtokens.org/tr/drafts/format/ status banner (fetched 2026-08-30): "This is a preview. Do not attempt to implement this version of the specification. Do not reference this version as authoritative in any way." vs https://www.designtokens.org/tr/2025.10/format/ header: "Design Tokens Format Module 2025.10 — Final Community Group Report — 28 October 2025".

**Refuted:** "a newer `$ref` JSON-Pointer form allows reaching into a sub-property of a composite token" (token_exposure; claim 2) — framed as a draft-era addition

- Why wrong: $ref is in the stable 2025.10 spec and support is mandatory, not newer/optional. The stable text reads "Tools MUST support JSON Pointer references as defined by RFC 6901, using the `$ref` property."
- Correction: $ref is normative in 2025.10: curly-brace {group.token} is the recommended form, JSON Pointer $ref is the MUST-support form. Drop "newer".
- Evidence: https://www.designtokens.org/tr/2025.10/format/ — "Tools MUST support JSON Pointer references as defined by RFC 6901, using the `$ref` property.", example `"alias": { "$ref": "#/base" }`.

**Refuted:** testability: "There is no 'grep the compiled CSS for a rule outside the layer' equivalent here because there's no layer."

- Why wrong: False twice over. (a) Style Dictionary emits a layer with a built-in option, as reproduced above. (b) Tailwind v4 — the token toolchain actually used in the owner's own kate-middlechild — emits `@theme` tokens inside `@layer theme` by DEFAULT and states the layer order explicitly at the top of the output. The layer test the doctrine's point 5 asks for is directly applicable to both.
- Correction: Drop the 'no layer, no layer test' framing. For a Tailwind v4 token build the layer test is free and should be asserted (`@layer theme, base, components, utilities;` present; no token declaration outside `@layer theme`). For a Style Dictionary build it is one option away. Keep the researcher's two other proposed greps (inlined-literal check, component-hook-declared check) — those are good and new.
- Evidence: Reproduced with tailwindcss 4.3.3 (/tmp/twchk): input `@import "tailwindcss"; @theme { --color-surface:#fffaf3; --color-ink:#2b2118; }` compiled to out.css line 2 `@layer theme, base, components, utilities;`, line 3 `@layer theme {`, lines 12-13 the two token declarations inside it, line 164 `@layer utilities {` with `.bg-surface { background-color: var(--color-surface); }`. Local: /home/mherwig/dev/kate-middlechild/packages/tokens/src/theme.css uses `@theme` + `@theme static` + `@custom-variant dark`.

**Refuted:** theme_switching evidence: "kate-middlechild `dark.css` under `[data-theme=\"dark\"]`" and "matches the pattern both local repos already use"

- Why wrong: That file does not exist. packages/tokens/src contains exactly one file, theme.css; the dark overrides live inside it under `[data-theme="dark"]`. The `dark.css` path comes from the rule file's INTENDED file structure table, which is stale relative to the shipped code — the researcher cited a planning document as if it were compiled ground truth, which is the exact failure the brief's local-ground-truth instruction exists to prevent.
- Correction: The selector pattern claim is right; the file path is wrong. Cite /home/mherwig/dev/kate-middlechild/packages/tokens/src/theme.css (single file, dark block inside) and /home/mherwig/dev/grimoire-indexer/src/renderer/astro/styles/tokens.css:153 `[data-theme="dark"] {`. Also flag that /home/mherwig/dev/kate-middlechild/.claude/rules/subsystem-tokens.md is now stale — it says "No packages/tokens code exists yet" while packages/tokens/src/theme.css is 307 lines.
- Evidence: `ls /home/mherwig/dev/kate-middlechild/packages/tokens/src/` => `theme.css` only. /home/mherwig/dev/grimoire-indexer/src/renderer/astro/styles/tokens.css:153 `[data-theme="dark"] {` and :18 comment "declared twice — `:root` and `[data-theme="dark"]`".

**Refuted:** pitfall 6 / claim 9: "Rangle's token-maturity model notes semantic tokens are the *most* volatile layer" / "Semantic tokens are described in maturity-model literature as the most volatile tier"

- Why wrong: The quoted sentence attributes volatility to the DESIGN LANGUAGE, not to semantic tokens as a tier, and it is scoped to Level 1 (pre-system) only: "Semantic tokens are not strictly necessary at this stage as it's expected that the design language is still being developed, and therefore quite volatile." The article never ranks tiers by volatility and never says semantic is the most volatile layer. The researcher's paraphrase promotes a Level-1 scoping note into a general claim that contradicts doctrine point 1, on evidence that does not support it.
- Correction: Either drop the pitfall or restate it accurately and narrowly: before a design vocabulary has settled, semantic token NAMES are still churning, so treating them as a frozen public API is premature — which is a caveat about WHEN to freeze the contract, not a claim that semantic is the least stable tier. Doctrine point 1 is untouched.
- Evidence: https://rangle.io/blog/developing-your-token-structure — verbatim: "Semantic tokens are not strictly necessary at this stage as it's expected that the design language is still being developed, and therefore quite volatile." (Level 1 section) and "Component token names tend to be very stable. Without the component layer, a token change in design would trigger a refactor for developers."

### Confirmed

- DTCG stable version is 2025.10, Final Community Group Report, dated 28 October 2025 — verified at https://www.designtokens.org/tr/2025.10/format/ and the 2025-10-28 W3C CG announcement. A preview draft exists at /tr/drafts/format/ dated 30 July 2026 and is explicitly marked do-not-implement. (Claim 1 CONFIRMED — but see refutation: the researcher cited the wrong one of these two URLs for everything.)
- The groups quote is verbatim and uses SHOULD NOT, not MUST NOT: "Groups are arbitrary and tools SHOULD NOT use them to infer the type or purpose of design tokens." Present in the STABLE 2025.10 document (appears twice). Claim 3 CONFIRMED, and the modal verb is correctly reported — worth noting the rule text should preserve SHOULD NOT exactly, since a rule that upgrades it to MUST NOT is quoting the spec falsely.
- DTCG composite types are exactly: strokeStyle, border, transition, shadow, gradient, typography. Verified against /tr/2025.10/format/.
- $deprecated is defined in stable 2025.10 for both tokens (5.2.4) and groups (6.3.1), accepting true / false / an explanatory string.
- Style Dictionary current version is 5.x — npm latest is 5.5.2 as of 2026-08-30 (npm view style-dictionary version). The version framing in the findings is correct.
- outputReferences defaults to false and inlines resolved literals. Reproduced: /tmp/sdchk/out-default.css emits `--color-brand: #3b82f5;` where the source token aliased {color.blue}; with outputReferences:true the same build emits `--color-brand: var(--color-blue);`. The pitfall bullet about this default is real and is the single most valuable tooling finding in the set.
- Style Dictionary core ships no option NAMED `layer` and no at-rule option — grep for "layer" over lib/common/formats.js in 5.5.2 returns 0 matches. (The narrow form of claim 5 holds; the conclusion drawn from it does not — see refutations.)
- style-dictionary-utils does ship a `css/advanced` format with `file.options.selector` and `file.options.rules[].atRule` (documented example is @media, not @layer). It is current and v5-compatible: npm shows 6.0.1 with peerDependencies { style-dictionary: ^5 }. The researcher's medium confidence on the mechanism can be raised to high; the @layer-specific example is still unexemplified upstream.
- `:root` has specificity (0,1,0). This is the only specificity tuple asserted anywhere in the findings and it is correct (pseudo-class, CSS Selectors L4).
- Style Dictionary performs no component scoping, emits no selectors derived from markup, and has no concept of a component in the DOM sense. Confirmed by reading the css/variables implementation — output is a flat variable list nested in the configured selector(s), nothing else.
- The mechanism divergence in `divergence_from_core` is real and reproducible: a component-tier token in Style Dictionary is built as a DECLARED custom property, not an undeclared override-only hook. My build emitted `--button-bg: var(--color-brand);` — a second value a consumer must fight, exactly as the divergence note argues. (The substance is confirmed by reproduction even though the Rangle citation offered for it does not actually address declaration.)
- Neither DTCG nor Style Dictionary represents public/private token visibility as a concept; the only lever is a filter hook or omitting a source file from a platform build. Consistent with the groups quote, which forbids inferring purpose from structure.

### Unverifiable

- Tokens Studio's legacy (`value`/`type`) vs W3C-DTCG (`$value`/`$type`) format modes, and the claim that Sets/Groups impose no built-in tiering — docs.tokens.studio was not fetched in this pass. Plausible and low-risk, but it stays at the researcher's stated medium confidence, not higher.
- That the public/private omission was "an explicit, deliberate design choice discussed on the DTCG mailing list" — the 2024Jan/0008.html archive link was not retrieved. The OUTCOME (no visibility concept in the spec) is independently confirmed; the intent behind it is not. Drop the intent framing from any published line.
- Tokens Studio's Theme feature as the composition mechanism for multi-theme builds — not verified against a first-party worked example. The Style Dictionary half of the theme_switching answer is mechanically sound (the `selector` option demonstrably accepts `[data-theme="dark"]`, same code path I exercised for @layer), but the Tokens Studio half is unverified.
- Known Style Dictionary caveat I could not confirm in the time available and did not test: with outputReferences:true, a per-theme platform build can emit `var(--x)` pointing at a token that is not declared in that output file, producing a dangling reference. If real, it interacts badly with the per-theme-file pattern the findings recommend. Confidence low — verify before it goes in a rule.

### On the annex call

Agree with annex_worth_it: false — but roughly half the stated rationale is built on refuted premises, so the reasoning must not be carried forward as written.

What survives: this target genuinely has no compiled component selector and no specificity tuple, so the annex's usual payload ("X compiles to Y at specificity Z") really is empty. A per-framework annex here would restate the same two or three build-flag warnings under every framework's name.

What does not survive: the rationale leans on "no cascade-layer behavior of its own" and (in layer_support) "@layer requires a custom format or a third-party package". Both are false. Style Dictionary 5.5.2 emits a layer from the built-in format via `selector: ['@layer tokens', ':root']`, and Tailwind v4.3.3 puts `@theme` tokens in `@layer theme` with no configuration at all — both reproduced locally. So the correct reason to skip the annex is "no selector, no tuple", never "no layer".

What should land in core instead — three lines, not a file:
1. If your token build emits CSS, wrap it in the project's layer. Style Dictionary: `options.selector: ['@layer tokens', ':root']` on css/variables. Tailwind v4 `@theme`: already `@layer theme`, assert it rather than add it.
2. Style Dictionary's outputReferences defaults to false — every alias is inlined as a literal, and the primitive tier stops being an override point. Set it true whenever a tier below the one you ship is meant to be overridable.
3. `outputReferenceFallbacks: true` is the first-party way to emit `var(--x, <literal>)` — the closest built-in analogue to the doctrine's hook fallback, and the fact the original research missed entirely.

One caution against padding core: 1 and 3 are Style-Dictionary-specific config, and no repo on this machine uses Style Dictionary (grep across grimoire-indexer, ocx-catalog, kate-middlechild, grimoire-vscode: zero hits). Only the Tailwind v4 half of point 1 is presently load-bearing for the owner. Ship the Tailwind line in core; keep the Style Dictionary lines to a single conditional clause, or leave them out until a repo actually builds tokens that way.

Not sound as written. The DTCG spec-fact layer is largely correct but sourced from a document that forbids being cited; the Style Dictionary layer contains one flatly false capability claim, one inverted piece of override reasoning, and a material omission; one local file path is fabricated; one literature citation is over-read.

Reproductions are in the scratch dirs and are re-runnable:
- /tmp/sdchk/ — style-dictionary@5.5.2, tokens.json + build.mjs, four compiled outputs (out-default.css, out-refs.css, out-refs-fallback.css, out-layer.css). out-layer.css is the decisive one.
- /tmp/twchk/ — tailwindcss@4.3.3, in.css + out.css showing `@layer theme, base, components, utilities;` and `@theme` tokens inside `@layer theme`.

Ranked by blast radius if published unchanged:
1. "@layer needs a custom format or a third-party package" — would send an agent to add a dependency for something one config line already does, and would justify skipping the layer entirely in a repo that couldn't take the dependency. This is the doctrine's central mechanism; getting it wrong here is the closest thing in this finding set to an inverted specificity tuple.
2. The inverted override_entrypoint prose — tells an agent to override the wrong tier.
3. The hex-string DTCG color example — teaches invalid tokens that Style Dictionary accepts silently.
4. Citing the do-not-implement draft as authoritative — the facts happen to hold, but the practice is the kind of thing that makes a rule wrong at the next spec revision.

Two things the research got genuinely right and new, worth keeping verbatim in core: the outputReferences default trap, and the observation that mainstream tooling models the component tier as a declared token — which I confirmed by reproduction (`--button-bg: var(--color-brand);` is emitted as a real declaration), and which is the sharpest available illustration of why the doctrine's override-only hook is a deliberate departure rather than a naming preference.

Missed entirely and worth adding: `outputReferenceFallbacks: true`, which emits `var(--color-brand, #3b82f5)` — the first-party mechanism nearest the doctrine's hook shape.

Stale-config side finding, unrelated to the review but cheap to fix: /home/mherwig/dev/kate-middlechild/.claude/rules/subsystem-tokens.md still says "No packages/tokens code exists yet" and describes a four-file layout, while packages/tokens/src/theme.css exists at 307 lines and is the only file there. That staleness is what produced the fabricated dark.css citation — an agent reading the rule as ground truth got a wrong answer, which is itself an argument for the rule set the owner is building.

## Sources

- https://www.designtokens.org/tr/drafts/format/
- https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- https://styledictionary.com/reference/hooks/formats/predefined/
- https://styledictionary.com/reference/hooks/formats/
- https://styledictionary.com/reference/hooks/filters/
- https://github.com/lukasoppermann/style-dictionary-utils
- https://lists.w3.org/Archives/Public/public-design-tokens-log/2024Jan/0008.html
- https://docs.tokens.studio/manage-settings/token-format
- https://rangle.io/blog/developing-your-token-structure
- https://www.figma.com/resource-library/design-tokens/
- /home/mherwig/dev/ocx-catalog/.claude/artifacts/research_design_tokens_2026-08-24.md
- /home/mherwig/dev/ocx-catalog/.claude/rules/quality-design-tokens.md
- /home/mherwig/dev/grimoire-indexer/.claude/rules/quality-design-tokens.md
- /home/mherwig/dev/kate-middlechild/.claude/rules/subsystem-tokens.md

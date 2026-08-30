# Doctrine extraction from the existing repo rules

What the two `quality-design-tokens.md` / `quality-css-overrides.md` pairs in
`grimoire-indexer` (Astro) and `ocx-catalog` (VitePress) actually teach, once
repo specifics are stripped. The two pairs share only ~12% of their literal
lines; this is what survives generalisation.

## Principles

### Untokenized value is a defect

Any appearance value (colour, spacing, radius, etc.) that is not exposed as a custom property is a value the consumer's single override stylesheet can never reach. Treat an untokenized appearance value as a defect, not a style choice — and never document a family as themeable when its declarations are still literals.

- **Why:** A downstream consumer's entire retheming surface is usually one injected/imported stylesheet loaded after the framework's own CSS. A literal baked into a component, a .ts constant, or generated config is invisible to that file.
- **Framework-independent:** True
- **Leaks:** None load-bearing — the 'one consumer stylesheet' shape (index.config.json's customCss, catalog.config.json's css) is repo-specific plumbing, but the principle (tokenize or it's unreachable) holds for any framework that lets a consumer inject a stylesheet after the author's own.
- **Source:** grimoire-indexer/quality-design-tokens.md, ocx-catalog/quality-design-tokens.md (identical framing, independently written)


### Component-scoped styles often out-rank a plain consumer selector regardless of source order

Many component-styling systems compile a scoped rule to a higher specificity than an ordinary class selector by appending an attribute or hashed-class selector — e.g. Astro's `.foo[data-astro-cid-xxx]` or Vue SFC's `.foo[data-v-xxx]`, both landing at (0,2,0) against a consumer's plain `.foo` at (0,1,0). Where that is true, the consumer loses in EITHER source order, and no injection-order care fixes it — verify the actual compiled specificity of your framework's scoping mechanism before assuming this.

- **Why:** This is the root cause that makes cascade layers necessary at all; getting the specificity tuple wrong (or assuming it's universal) inverts the whole contract.
- **Framework-independent:** False
- **Leaks:** This is the single biggest trap for a published rule: the exact mechanism and specificity varies wildly by framework. Vue and Astro both use an attribute selector appended to every rule (0,2,0 in this case). CSS Modules instead rewrites the CLASS NAME itself (hashed), so the resulting selector is still a bare class at (0,1,0) — no specificity bump, a different failure mode entirely (a class the consumer can't predict, not a class it can't beat). Shadow DOM sidesteps the page cascade altogether — a host-page selector cannot reach inside at all, regardless of specificity, which is a stronger and different barrier. Svelte's <style> scoping is attribute-selector-based like Vue/Astro. Tailwind utility classes are plain (0,1,0) classes with no scoping at all; the failure mode there is late-loaded utility source order, not specificity. Any published core rule must state the RISK ('your framework's scoped styles may out-rank consumer CSS') and defer the verified tuple to the per-framework annex.
- **Source:** grimoire-indexer/quality-css-overrides.md ('.version[data-astro-cid-3oqgkrws]', 0,2,0), ocx-catalog/quality-css-overrides.md ('.foo[data-v-<hash>]', 0,2,0) and its research doc's E1/E4 (real Chrome 148 verification; CSS-Modules/Shadow-DOM contrast is general web-platform knowledge, not covered by either repo)


### Cascade layers are the fix: one author layer, unlayered consumer

Ship every framework-authored style block inside a single `@layer <name>`, and leave the consumer's injected/imported stylesheet unlayered. Any unlayered author rule beats any layered rule at ANY specificity — this is the whole mechanism, and it lets the consumer write ordinary CSS and win with no `!important` and no specificity arms race.

- **Why:** It is the only mechanism, of everything evaluated (`:where()`, `@scope`, raising consumer specificity), that makes a consumer rule win unconditionally rather than by luck of selector choice.
- **Framework-independent:** True
- **Leaks:** The number and naming of layers (grimoire, ocx) is repo-specific. Whether the framework's own build pipeline can even emit CSS inside an @layer cleanly at all needs per-framework/per-bundler verification — Vue 3.5.41 SFC compileStyle was directly verified to preserve @layer wrapping with scope attributes landing correctly inside it; other frameworks' compilers were not tested by either source repo.
- **Source:** grimoire-indexer/quality-css-overrides.md, ocx-catalog/quality-css-overrides.md, ocx-catalog research_css_customization_api_2026-08-24.md (E1 real-Chrome-148 verification, E3 Vue SFC compile verification)
- **Check:** grep/inspect the COMPILED/bundled output for rule blocks outside the layer — see the 'verify against build output' principle below


### !important inside the author layer is a permanent lock

Layer order REVERSES for `!important`: a layered `!important` beats an unlayered `!important`. So an `!important` inside the framework's own layer locks every consumer out with no escape hatch at all — never add one without a comment naming why the consumer must be unable to override that declaration.

- **Why:** This is the one place the layering mechanism inverts, and getting it backwards silently defeats the entire override contract for that declaration, permanently.
- **Framework-independent:** True
- **Leaks:** None — this is native CSS cascade-layer semantics (Baseline, widely supported), not framework-specific. The two source repos' actual allowlisted exceptions (Shiki's inline-style workaround, a prefers-reduced-motion accessibility lock) are repo-local, but 'an a11y lock is a legitimate justified exception, an unexplained one is not' generalizes.
- **Source:** grimoire-indexer/quality-css-overrides.md, ocx-catalog/quality-css-overrides.md, ocx-catalog research (E1 table row 5, real-Chrome verified)


### Never rely on a bare @layer ordering statement

A standalone `@layer a, b;` declaration-order statement is dropped by common CSS minifiers whenever the physical block order already implies the same precedence. Never depend on it — write layer blocks in the actual intended precedence order in the source.

- **Why:** A rule that only 'works' via a statement the build's minifier silently strips is a rule that passes in dev and breaks in the shipped bundle with no error.
- **Framework-independent:** True
- **Leaks:** The specific minifiers verified (esbuild, lightningcss, both under Vite 8.2.2) and the specific GitHub issues cited (vite#22705, #23229, #22318) are tool-specific evidence, not universal proof — a different bundler/minifier should be independently verified before trusting this claim in its annex. The general defensive practice (physical order, don't depend on the statement) is safe to state as a framework-independent habit regardless.
- **Source:** ocx-catalog/quality-css-overrides.md, ocx-catalog research_css_customization_api_2026-08-24.md (E2, Vite maintainers' own not-a-bug closures)


### An identity attribute is not an override mechanism by itself

A stable attribute used purely for identification (name it whatever your convention is — both source repos independently chose `data-slot`) gives a consumer a predictable target to select, but it carries the SAME specificity as a class. It still loses to a scoped author rule without the layer underneath it. Keep identity attributes off the `class` attribute so class names stay free for the consumer's own use and free to be refactored without breaking anyone's selector.

- **Why:** Two independently-built repos converged on the identical shape (dedicated identity attribute, separate from styling classes, versioned as public API) — strong signal this generalizes, but it only works in combination with the layer; published alone it's a false promise.
- **Framework-independent:** True
- **Leaks:** The literal string `data-slot` is a convention (originating with shadcn/ui's 2025 Tailwind v4 upgrade), not a CSS or framework mechanism — some ecosystems already have their own accepted identity-attribute convention that a published rule should defer to rather than override. State the principle generically; let the framework annex name the convention already idiomatic there.
- **Source:** grimoire-indexer/quality-css-overrides.md ('Layer 2'), ocx-catalog/quality-css-overrides.md ('data-slot is the identity contract'), ocx-catalog research (shadcn/ui changelog, Radix/Ark data-state precedent)


### Token tiers are earned by evidence, not designed upfront

A semantic (public, role-named) tier is universal. A PRIMITIVE tier is justified only when a census shows a raw value is actually shared by 2+ semantic tokens (a real DRY need) — not speculatively. A COMPONENT-HOOK tier (public, override-only, never declared by default styles, read via var() fallback to the semantic tier) is justified only when a component genuinely needs independent restyling that layered rules + identity attributes don't already reach — start with 2-3 components, never ship it speculatively across the board.

- **Why:** The two source repos reached opposite headline answers (2 tiers vs 3) using the SAME underlying test, applied to their own token census — this is the real disagreement a published rule must resolve procedurally rather than by picking a fixed tier count.
- **Framework-independent:** True
- **Leaks:** None structural — this is a design-system methodology question, independent of any UI framework. The specific tier counts (2 vs 3) and specific evidence (grimoire-indexer's zero shared raw values; ocx-catalog's 4 shared status hues; kate-middlechild's Tailwind v4 case having no tier language at all, still pre-scaffold) are all repo-local outcomes of applying the same test.
- **Source:** grimoire-indexer/quality-design-tokens.md ('Two exist. A third is deliberately absent... no primitive tier'), ocx-catalog/quality-design-tokens.md ('Three... Primitive tier is private'), kate-middlechild/subsystem-tokens.md (semantic-groups-only, no tier taxonomy stated) — see contradictions


### A component hook, if it exists, is override-only and must fall through

Grammar: `--<namespace>-<component>-<property>`, never declared by the framework's default styles, always read with a var() fallback to the semantic tier (e.g. `border-radius: var(--ns-card-radius, var(--ns-radius-lg))`). The component segment in the name is mandatory — a bare property-name hook is safe only inside Shadow DOM (where it can't leak to sibling components); without Shadow DOM it leaks into every component that happens to read that property name. A hook that STORES its own value instead of falling through to the semantic tier is the anti-pattern: it becomes a second source of truth that stops tracking a rebrand.

- **Why:** This is the resolution to an apparent contradiction with 'never expose a component-level colour knob': the ban is on an independent second value, not on a fallback override point. SLDS, Ant Design, PrimeVue, MUI and Bootstrap all ship exactly this fallback shape.
- **Framework-independent:** True
- **Leaks:** The finest-grained-tier-churns warning cites SLDS's own component-hook tier being unsupported in its SLDS 2 rewrite as a cautionary precedent (external vendor claim from the research doc, dated 2026-08-24 — worth re-verifying at time of publish).
- **Source:** ocx-catalog/quality-design-tokens.md, ocx-catalog/quality-css-overrides.md, ocx-catalog research_css_customization_api_2026-08-24.md (SLDS/Spectrum/PrimeVue/Bootstrap grammar table, Ionic shadow-DOM warning)


### A colour token must be declared in every scheme/theme variant that exists

If a colour token is declared only under the default/light scope (e.g. :root) and not repeated under the dark scope selector ([data-theme="dark"], .dark, or equivalent), it silently applies in dark mode too, pinned to its light value. This is the WORST case for a consumer specifically: because the two scope selectors are equal specificity, source order decides — and the consumer's override stylesheet loads last, so their :root-only override wins in BOTH modes and takes dark mode down with it, even though @layer is in effect. Document and enforce: override both scopes for colour, always.

- **Why:** This is pure CSS cascade mechanics (two selectors of equal specificity, source order breaks the tie) and is independent of any component framework — it is also NOT fixed by cascade layers, since both the theme's dark declaration and the consumer's :root declaration can sit on the same (unlayered, in the consumer's case) side.
- **Framework-independent:** True
- **Leaks:** None load-bearing. The specific selector spelling ([data-theme="dark"] vs .dark) and toggle mechanism (attribute vs class, JS-driven vs OS prefers-color-scheme) are framework/repo choices for the annex, but the underlying cascade fact is universal.
- **Source:** grimoire-indexer/quality-design-tokens.md, ocx-catalog/quality-design-tokens.md, ocx-catalog/quality-css-overrides.md ('What layering does not fix'), ocx-catalog research_design_tokens_2026-08-24.md (D1, happy-dom-reproduced)


### Derive, don't store, related values

A value that is mathematically or perceptually derived from another token (a tint, a nested radius, a negated margin) should be written as a derivation from that token — calc(), color-mix() — never as a second hand-computed literal. A stored copy silently stops tracking the source token the moment someone overrides it.

- **Why:** This is the difference between a rebrand fully applying and 'half-applying' — a defect invisible until someone overrides the base token and finds the derived value unchanged.
- **Framework-independent:** True
- **Leaks:** None — calc() and color-mix() are native CSS (color-mix Baseline 2023), independent of any component framework. The narrow legitimate exception both repos independently identified (a tint whose base colour is NOT actually derivable from the token it's paired with, e.g. predates an accessibility correction) is worth keeping as a documented escape hatch, with a required comment.
- **Source:** grimoire-indexer/quality-design-tokens.md, ocx-catalog/quality-design-tokens.md, ocx-catalog research_design_tokens_2026-08-24.md (C3)


### Breakpoints cannot ever be tokens

A media-query condition cannot consume a var() custom property. A breakpoint value is therefore structurally excluded from the token system — never list one in a token reference table, since that promises a runtime overridability that cannot exist for that value.

- **Why:** This is a hard CSS-specification limit, not a design choice, and a published token table that includes a breakpoint anyway is actively misleading a consumer into writing an override that silently does nothing.
- **Framework-independent:** True
- **Leaks:** None — confirmed independently by all three source repos with identical reasoning; this is a spec-level fact about native CSS media queries, true as of today (2026-08-30) and not something any surveyed component framework changes.
- **Source:** grimoire-indexer/quality-design-tokens.md, ocx-catalog/quality-design-tokens.md, kate-middlechild/subsystem-tokens.md ('Breakpoints | Cannot be tokens')


### Don't over-tokenize; run the census before scaling a family

Before minting a new token: (1) does an existing token already carry this role — reuse it; (2) is it a derivation of an existing token — express it as one, don't mint a new name; (3) is the value genuinely one-off or pure geometry — inline it with a comment; (4) only then add a token, with its full-scheme coverage and its documentation row. Before tokenizing an EXISTING un-tokenized family, run an exhaustive literal-value census first — a partial census silently mis-selects the scale.

- **Why:** Both source repos independently hit the same failure: a first-pass census under-counted the real literal-value population by roughly half (missing multi-line declarations / an untokenized half-step family), and a scale had already been chosen against the wrong number by the time the gap was found.
- **Framework-independent:** True
- **Leaks:** None — this is a design-token-system methodology, not tied to any rendering framework.
- **Source:** grimoire-indexer/quality-design-tokens.md ('Don't over-tokenize', 120ms hidden by multi-line transition), ocx-catalog/quality-design-tokens.md (spacing census, 63 vs 106 actual shifts), ocx-catalog research_css_customization_api_2026-08-24.md (§2, 21/238 spacing coverage, 4n+2 half-step family)


### Not every property needs a token

A value that is genuinely fixed and used once, a keyword that already states its own behavior (e.g. an easing keyword like ease-out), or a geometric measurement tied to something else's real size, is legitimately left as a literal — with a comment saying why, and ideally an explicit allowlist entry so a NEW untokenized literal is a deliberate act, not an oversight.

- **Why:** The named failure mode of token systems is minting too MANY tokens too early; a rule that only ever says 'tokenize it' produces token bloat that means nothing.
- **Framework-independent:** True
- **Leaks:** None — general design-token discipline.
- **Source:** grimoire-indexer/quality-design-tokens.md ('Geometry is not rhythm', letter-spacing/focus-ring-width untokenized), ocx-catalog/quality-design-tokens.md (easing untokenized 'a keyword that already says what it does')


### @scope is not a substitute for cascade layers

The @scope at-rule contributes ZERO specificity of its own, and its 'proximity' tie-break mechanism only matters among rules that are ALREADY equal in specificity. A framework rule that out-ranks the consumer's rule outright (per the specificity-mismatch principle above) leaves no tie for @scope to break — it solves neither the overridability problem nor the dark-mode custom-property leak (inherited custom properties pass through scope boundaries untouched).

- **Why:** This is the most likely wrong-turn a well-intentioned agent takes reaching for a newer, more targeted-sounding CSS feature — @scope SOUNDS like the tool for 'component styling that doesn't leak,' but it solves a completely different problem (proximity disambiguation) than the one at hand (an outside consumer needing to win).
- **Framework-independent:** True
- **Leaks:** None — native CSS spec fact. Note it is comparatively new: Baseline in Firefox only as of December 2025 per the research doc, so browser-support caveats belong in a citation, not the claim itself.
- **Source:** grimoire-indexer/quality-css-overrides.md, ocx-catalog/quality-css-overrides.md, ocx-catalog research_css_customization_api_2026-08-24.md (Rejected: @scope, MDN + css-cascade-6 cites)


### Verify cascade-layer behavior against the real compiled build, never a DOM-emulation test runner alone

Common JS-based DOM emulation layers used by unit-test runners can silently misreport @layer behavior: one variant drops @layer blocks entirely at parse time (as if the layer never existed), another parses @layer into a correct object model but never actually applies the layered declarations when asked for computed style. Both produce a FALSE 'the layered rule lost / consumer rule won' result whether or not the real mechanism works. Any claim that cascade layers make a consumer's rule win must be demonstrated in a real browser engine or against the actual production build's emitted CSS — never asserted from a DOM-emulation-only unit test.

- **Why:** This is exactly the kind of vacuous-green test that looks like coverage but proves nothing — the single highest-value trap for an AI agent that reaches for the fastest, most familiar test tool without checking whether that tool can even represent the feature under test.
- **Framework-independent:** True
- **Leaks:** The specific tools and versions named (happy-dom v20 drops @layer at parse time; jsdom v29 parses it but never applies layered declarations in getComputedStyle) are version-bound findings from one research pass dated 2026-08-24 — re-verify at whatever versions are pinned before publishing this as a current fact; the underlying warning ('DOM emulation is not a real cascade engine, verify accordingly') is the durable, tool-independent part.
- **Source:** ocx-catalog research_css_customization_api_2026-08-24.md (E1), ocx-catalog/quality-css-overrides.md ('happy-dom drops @layer... jsdom parses... but never applies... vacuous green')


### The evidence gate belongs on the compiled/bundled output, not just source

A source-level grep or lint check can pass while a build step (minification, a framework's SFC/component compiler, a bundler's CSS extraction) strips a layer wrapper, drops an ordering statement, or otherwise changes the emitted cascade. The authoritative check reads the ACTUAL production CSS output after build — and that check should be demonstrably able to fail: strip one component's layer wrapper and confirm the check goes red before trusting that it can go green meaningfully.

- **Why:** Both source repos found that stripping a single component's layer wrapper left every OTHER assertion in their suite green (build still succeeds, every token test still passes) and only the dedicated build-output check caught it — proof the source-only checks alone were insufficient.
- **Framework-independent:** True
- **Leaks:** None as a methodology; the specific build tool invoked to produce that output (vitepress build, astro build, vite) is framework-specific plumbing for the annex.
- **Source:** grimoire-indexer/quality-css-overrides.md ('build.test.ts adds the half a source grep cannot fake'), ocx-catalog/quality-css-overrides.md ('the last one cannot be moved into vitest')


## Must not be published

- grimoire-indexer: --grim-* namespace, tokens.css path, @layer grimoire name, the 45-token/18-colour/9-space-step counts, the data-slot list (brand, catalog, package-card, version-pill, ...), --grim-color-kind-* runtime composition detail, VersionMenu.astro / Base.astro / index.config.json file names, style_contract.test.ts / build.test.ts file names, the specific spacing scale 2/4/6/8/12/16/24/32/48px
- ocx-catalog: --ocx-* namespace, @layer ocx name, styles/tokens/*.css path, catalog.config.json's css field, config_gen.ts's renderThemeShim, the 42/52-token counts, the specific data-slot / class-name census numbers (298 classes, 21 bare generic classes, 445 scoped selectors), --c-kw split into --ocx-color-keyword/--ocx-color-code-keyword, layer_contract.test.ts / component_hook_contract.test.ts / css_layer_real_build.test.ts / quality-css-cascade.mjs file and script names, the DetailPage.vue / route.ts / CAS-URL routing content (unrelated subsystem, not css-theming doctrine at all), the install-command / sanitization / composable-convention sections of subsystem-theme.md (out of scope for css-theming)
- kate-middlechild: packages/tokens path, --surface/--ink/--line/--accent/--region-* naming, the 10 Philippine regionKey values (ilocos-cordillera, central-luzon, ...), docs/design-manifest.md, the apply-design-tokens skill coupling, the Phase-0/R6/ADR-0001 project-management framing, task dev command
- The specific numeric findings from the research docs (D1-D4, C1-C5, the exact 4d0c2ff / 2026-08-24 commit-pinned measurements, the specific GitHub issue numbers vite#22705 etc.) belong as citations/evidence, not as doctrine text themselves
- Any repo's specific component names used as examples (package-card, keyword chip, version-pill, brand install rows) — the annex may need its OWN framework-appropriate examples, not these

## Where the two repos contradict each other

- Component-hook tier existence: grimoire-indexer states hooks are 'deliberately absent' and its README says so publicly, arguing that with the layer + data-slot already shipped a hook tier 'would reach nothing new.' ocx-catalog ships a component-hook tier as one of its three public tiers. This is a genuine disagreement on the DEFAULT recommendation, not just a difference in current inventory — the published rule should resolve it as a decision procedure (ship a hook only when demonstrated per-component need exists that the layer+identity-attribute combo doesn't already satisfy) rather than asserting either 'always absent' or 'always present' as the default.
- Primitive tier count: grimoire-indexer concludes it needs ZERO primitive tokens ('no raw value is shared by two semantic tokens'); ocx-catalog concludes it needs a small primitive tier (shared status hues, 3+ real callers). These are not actually contradictory in method — both apply the identical DRY test to their own census and get different answers — but a naive reading of 'the doctrine' could wrongly conclude either 'primitives always exist' or 'primitives never exist.' Must be stated as the test, not the answer.
- Depth of :where() discussion: ocx-catalog's overrides file discusses :where() as a genuine (SFC-safe, zero-specificity) alternative mechanism and explicitly argues why @layer is still preferred; grimoire-indexer does not mention :where() at all. Not a disagreement, but the published rule benefits from ocx-catalog's fuller reasoning (:where() zeroes out the framework's own internal ordering control too, which @layer does not) — worth carrying into the core doctrine rather than dropped as repo-local.
- kate-middlechild is a third, differently-shaped data point: it is Tailwind v4 @theme tokens, has NO component-scoped-style / cascade-layer-vs-consumer problem stated at all (Tailwind v4's compiled output is utility classes, not scoped component rules) and is still pre-scaffold/anticipatory. It neither confirms nor contradicts the tiering or layering doctrine — it simply doesn't reach that layer of the problem yet, which is itself useful evidence that the 'specificity trap' principle is genuinely framework-dependent: Tailwind's utility-class model may not need the layer/consumer-cascade fight the same way Vue/Astro scoped styles do, and the annex should treat 'utility-first frameworks' as a distinct case rather than assuming the same trap applies.

## On the scope split

Both source pairs split their doctrine into exactly two sibling files with the SAME cut: quality-design-tokens.md owns 'which values exist and what they're named' (the vocabulary/naming/tier/census problem), and quality-css-overrides.md owns 'how a consumer's rule is able to win' (the cascade/specificity/layer problem) — explicitly stated in both repos as 'a token can be perfectly named and still unreachable,' with different checks for each. This split is real, well-motivated, and survives generalization to other frameworks conceptually: it maps to two genuinely different failure classes (naming/API-surface mistakes vs. cascade-mechanics mistakes) that any framework can independently get wrong. HOWEVER it does not map onto the requested css-theming.md + css-theming/<framework>.md structure, because BOTH halves of that split are framework-independent (naming conventions and cascade-layer mechanics are universal CSS concepts) — the actual framework-dependent axis in this doctrine is narrower and orthogonal: it's specifically the SPECIFICITY TUPLE a given framework's scoped-style compiler emits (Astro/Vue's attribute-selector (0,2,0), vs CSS Modules' unchanged (0,1,0), vs Shadow DOM's total isolation, vs Tailwind's flat utility model with no scoping problem at all), plus any framework-specific gotchas in getting @layer to survive that framework's own build/compile step (verified for Vue 3.5.41 SFC compileStyle in the research; unverified for others). Recommended cut for THIS task: the core css-theming.md carries essentially the full combined doctrine from both sibling files (tokens-as-API, tiering-by-evidence, layer mechanics, !important reversal, identity attributes, don't-over-tokenize, @scope-is-not-a-substitute, verify-against-real-build) framed as universal traps — and each css-theming/<framework>.md annex carries ONLY: (1) that framework's actual verified scoped-style specificity tuple/mechanism (with compiled-output evidence), (2) any framework-specific @layer compilation gotchas, (3) that framework's idiomatic identity-attribute convention if one already exists, (4) framework-specific test-tooling traps for verifying cascade-layer behavior (e.g. which test runners in that ecosystem correctly apply @layer). Also worth carrying forward from typescript-quality's house style: an ID-per-rule table with MUST/SHOULD/CONSIDER (or Block/Warn) severity and a paired verification command, and a 'Where the Depth Is' routing table — here routing by FRAMEWORK rather than by topic, matching the task's explicit directive.

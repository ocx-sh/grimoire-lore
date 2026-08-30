# css-theming

Why a consumer's CSS override loses, the one cascade layer that fixes it, the
design-token contract, forced-colors, and ten framework depth files routed to by
task.

```sh
grim add ghcr.io/ocx-sh/lore/css-theming
```

Loads on the stylesheet dialects, the component file types that carry styles
(`.astro`, `.vue`, `.svelte`, `.tsx`, `.jsx`, the named CSS-in-JS conventions),
and the configs that decide how styles compile. The index is always present; a
depth file is read only when the work calls for it.

## It starts by assuming your test environment is lying

No DOM emulator can test a layered cascade. happy-dom 20.12.0 has zero `@layer`
support — a layer block parses to `cssRules.length === 0`, and a bare
`@layer a, b;` statement corrupts the parse of every rule *after* it in the same
sheet. jsdom 30.0.1 parses `@layer` into correct CSSOM objects and then applies
none of it: one uncontested layered rule computes identically to no CSS at all.

So the first instruction is not a rule about CSS. It is: read the *built*
artifact, in an engine that can represent the feature, and watch the check go
red before you trust it.

## The premise most CSS guidance gets wrong

"Scoped styles compile to an attribute selector that outranks your plain class,
so you need cascade layers" is true for Astro, Vue, Svelte and Angular — and
false for six other surfaces that this set measured:

| Surface | What actually happens |
|---|---|
| CSS Modules | hashes the identifier, not the selector — the rule stays at (0,1,0). No inflation, but "global" does not win a tie either: a leaf import beat a root-layout global |
| Shadow DOM | the two selectors never compete. The consumer already wins by Context — an outer type selector beat `:host(.c)`. But `!important` **reverses**: inner beats outer, always |
| Tailwind v4 | utilities sit inside native layers, so an unlayered consumer beats every utility — unless the `important` flag is on, which voids it |
| Svelte | component CSS lands in the anonymous bucket and beats every *named* layer. A `preprocess` hook is the only way in |
| VitePress 1.x | the theme reset is unlayered, so layering your own CSS makes you **lose** |
| VS Code webview | the host owns the vocabulary; no consumer stylesheet can structurally exist |

Five of the sixteen rules carry a named exception for exactly this reason. A
rule that claims to hold everywhere, and does not, produces a confident wrong
fix.

## What is in it

The index carries a three-tier gate, sixteen non-negotiables with an ID,
rationale, runnable verification and severity each, a preprocessor section, and
a table of what twenty-eight surfaces actually emit. Ten depth files carry the
per-framework divergence: the gate itself, Astro, Vue/VitePress, Svelte,
Angular, Tailwind, CSS Modules, CSS-in-JS, Web Components, and VS Code webviews.

The gate ships as code, not prose — a brace-matching layer checker (a context
grep silently passes on a one-line production bundle), a literal-colour check
that strips `var()` fallbacks *and* token declarations before matching, and a
dark-parity check that skips `light-dark()`. Each of those exclusions exists
because the naive version goes red on correct code, which is how a gate gets
switched off.

## Measured, or it says so

Every tuple was read out of a real production build, and every cascade claim was
measured in Chromium 151 with red controls that fail as designed. Where a claim
is spec-derived rather than reproduced — the absolute `::part()` tuple, email
client behaviour, the whole VS Code annex — the row says so in the file.

A "Not Studied" section names the fifteen specific holes, including that Firefox
and WebKit were never tested, so a reader can tell a gap from a clearance.

## What it does not cover

No design system, no palette, no component library opinion, no naming scheme
beyond the hook grammar. It names traps, not maps: what a particular design
system looks like is discoverable by reading it.

## Sibling

`typescript-quality` co-loads on `**/*.tsx` and `**/*.jsx` and does not overlap:
that set owns types, async, errors and lint wiring; this one owns what reaches
the stylesheet.

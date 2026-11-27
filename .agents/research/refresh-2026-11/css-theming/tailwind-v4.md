---
title: Tailwind CSS v4 delta, 2026-08-30 to 2026-11-27
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 8
---

# Tailwind CSS v4 delta

Scope: what changed upstream after the baseline (tailwindcss 4.3.3, released 16 Jul per the releases page) that touches skills/css-theming-reference/tailwind.md and the Tailwind rows of rules/css-theming.md. This is a delta, not a re-creation. Only the published changelog and docs were read; no build was run, so "unchanged" means "no upstream change announced", not "re-measured".

## Summary

- Newest stable is 4.3.5, published 6 Nov 2026 and marked "Latest" on the [releases page](https://github.com/tailwindlabs/tailwindcss/releases). Only two releases follow 4.3.3: 4.3.4 (2 Nov) and 4.3.5 (6 Nov). There is no 4.4 and no 5.x.
- No v5 plan is announced. A web search found no official Tailwind v5 announcement; v5 appears only as a passing mention in third-party material. The [4.3.5 release page](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.5) shows "82 commits to main since this release" and names no next version.
- The [CHANGELOG](https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md) has no entry for cascade layers, Preflight, `[hidden]`, `@theme inline`, `@theme static` or theme-variable tree-shaking in 4.3.4, 4.3.5 or Unreleased.
- Overall verdict: every claim is "unchanged" except the version pin, which is a pin bump (4.3.3 to 4.3.5). Two claims touch changelog lines that deserve one re-measure each (see claim table).

## Findings

### Version facts

The CHANGELOG lists, above 4.3.3: `[4.3.5] - 2026-11-06`, `[4.3.4] - 2026-11-02`, and an undated "Unreleased" section. 4.3.4 adds `@tailwindcss/turbopack` (a Turbopack loader for Next.js). Everything else in both releases is a Fixed entry.

### Claim classification

| Claim at risk | Verdict | Evidence |
|---|---|---|
| "Reproduced from ... tailwindcss 4.3.3 / `@tailwindcss/vite` 4.3.3" | pin bump only | Newest stable is 4.3.5. 4.3.5 fixes are canonicalization speed, `color-mix(…)`, wasm32-wasi loading, turbopack README, `<!--`/`-->` between top-level rules, type declarations. None is a documented output change for the measured builds. |
| Five native layers: `properties`, `theme`, `base`, bare `@layer components;`, `utilities`; no combined `@layer a, b, c;` | unchanged (the "no combined statement" half could not be determined from docs) | No layer entry in the changelog. The [theme docs](https://tailwindcss.com/docs/theme) still show the source file as `@layer theme, base, components, utilities;` plus `@import ... layer(...)`. That is the source entry file, not the built output, which is what the claim is about; it was true at baseline too. The `@property` fallback layer `properties` is not discussed in docs. The 4.3.4 line "The `@property` fallback isn't applied in Safari versions that no longer support `margin-trim: inline`" changes when the fallback is emitted for some browser targets, so `@layer properties` could be absent for some browserslist/target settings. Not a change for the default Vite build the claim measures. |
| `@import "tailwindcss" important;` and `bg-red-500!` emit `!important` inside `@layer utilities` (CSS-CAS-03) | unchanged | The [adding-custom-styles docs](https://tailwindcss.com/docs/adding-custom-styles) do not cover the flag at all (the claim already rests on a build measurement, not docs). 4.3.4 changelog: "`!important` inside strings, comments, or `url()` is no longer treated as the important flag." This narrows false positives in the parser and does not alter the real flag. |
| Preflight ships `[hidden]:where(:not([hidden=until-found])){display:none!important}` | unchanged | The [preflight docs](https://tailwindcss.com/docs/preflight) still show `[hidden]:where(:not([hidden="until-found"])) { display: none !important; }`. No changelog entry. |
| `@theme inline { --x: var(--y) }` never emits `--x` (CSS-TOK-01, CSS-TOK-02) | unchanged | The theme docs still say the utility "will use the theme variable value instead of referencing the actual theme variable" (example: `.font-sans { font-family: var(--font-inter); }`). No changelog entry. The docs do not literally say the `--x` declaration is absent from output; that half remains build-measured. |
| `--breakpoint-*` and `--container-*` resolve into literal `@media` preludes (CSS-TOK-02) | unchanged, with one re-measure flag | Theme docs unchanged on namespaces. 4.3.4 changelog: "Canonicalization converts arbitrary breakpoint and container query variants to named equivalents (e.g. `max-[64rem]:flex` to `max-lg:flex`)" and "`min-*`, `max-*`, and container query variants with decimal values sort numerically". These affect the canonicalize tool and ordering, not the literal-resolution behavior. Unreleased: a crash fix for legacy `container` config. Re-measure is optional; the `grep -c breakpoint` measurement in CSS-TOK-02 should still return 0. |
| `@theme` tree-shakes unused variables; `@theme static` is the fix | unchanged | Theme docs: "By default only used CSS variables will be generated in the final CSS output. If you want to always generate all CSS variables, you can use the `static` theme option." The docs never use the word "tree-shaking"; they state the behavior. No changelog entry. |
| Official `@custom-variant dark` `:where()` recipe contributes exactly zero (specificity) | unchanged | The [dark-mode docs](https://tailwindcss.com/docs/dark-mode) still give `@custom-variant dark (&:where(.dark, .dark *));` and the data-attribute form `(&:where([data-theme=dark], [data-theme=dark] *))`. 4.3.4 fixes `&` substitution inside `:-moz-any(…)` and `:-webkit-any(…)` in custom variants, and Unreleased fixes canonicalization of arbitrary `:is(…)` variants; neither touches `:where()`. |
| `@utility name {}` auto-generates variant support | unchanged | Adding-custom-styles docs still say custom utilities "will also work with variants like `hover`, `focus` and `lg`". 4.3.4: whitespace in `--default(…)` values in functional `@utility` definitions is preserved, which concerns functional utilities only. |
| Surface table: utilities (0,1,0)-(0,2,0) in five native layers | unchanged | No change to layer structure or utility selector shape announced. 4.3.4 changes how variants using `@scope` emit: they now "wrap generated utilities instead of nesting inside them" and declarations directly inside `@scope` get wrapped in `:where(:scope)`. This only matters if a build uses `@scope` variants, which the measured builds do not. |

### Re-measure recommendation

A re-measure is not required to publish. If the owner wants the pin to say 4.3.5, rerun the two Vite production builds at tailwindcss 4.3.5 and `@tailwindcss/vite` 4.3.5, then repeat the existing greps (layer names, `!important` count inside `@layer utilities`, `[hidden]` rule, `--x` absence under `@theme inline`, `grep -c breakpoint`). The 4.3.4 `@scope` and `@property` fallback changes are the only changelog items that could in principle change emitted bytes. Until re-measured, keep the 4.3.3 pin text and add a sentence that 4.3.4 and 4.3.5 contain no documented change to the measured behavior.

## Normative guidance candidates

1. Rule: in tailwind.md and the CSS-TOK-01 and CSS-TOK-02 "Measured" text, keep "4.3.3" unless the builds are re-run; then bump every occurrence to 4.3.5 together. Rationale: a pin that mixes versions misleads. Verification: `grep -rn "4\.3\.[0-9]" skills/css-theming-reference rules/css-theming.md` shows one version.
2. Rule: do not state the `properties` layer as unconditional. Rationale: 4.3.4 gates the `@property` fallback by Safari support, so it is a default-build observation. Verification: a build with a modern-only browserslist is grepped for `@layer properties`.
3. Rule: no new rule is needed for 4.3.4's `@scope` wrapping. Rationale: no rule in the pair concerns `@scope`. Verification: `grep -n "@scope" skills/css-theming-reference/tailwind.md` returns nothing.

## AI-agent angle

- An agent trained before 4.3.4 may cite `@tailwindcss/turbopack` as unavailable; it exists since 4.3.4. Check: `npm view @tailwindcss/turbopack version`.
- An agent may claim a "Tailwind v5" migration; none exists. Check: the releases page shows no 5.x.

## Contested / evolving

- Unreleased changelog (undated, 82 commits after 4.3.5) holds many fixes including Vite plugin behavior: scans each source once per build, generates matching CSS for client and SSR, and stops generating CSS for removed classes on rebuild. If these ship as 4.3.6 or 4.4 they affect only the dev/rebuild path, not production layer structure. Re-check at the next refresh.
- The CHANGELOG fetch returned the first 100000 of 313722 characters. The 4.3.x entries and Unreleased are at the top and were fully read; older entries were not needed for this window.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/tailwindlabs/tailwindcss/releases | Release list | 4.3.4 2 Nov, 4.3.5 6 Nov 2026 | Decides newest stable |
| https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.3.5 | 4.3.5 notes | 6 Nov 2026 | Confirms Latest, no v4.4/v5 |
| https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/CHANGELOG.md | Changelog | to 2026-11-06 plus Unreleased | Primary per-claim evidence |
| https://tailwindcss.com/docs/theme | Theme docs | read 2026-11-27 | inline, static, namespaces, layers |
| https://tailwindcss.com/docs/dark-mode | Dark mode docs | read 2026-11-27 | `:where()` recipes |
| https://tailwindcss.com/docs/adding-custom-styles | Custom styles docs | read 2026-11-27 | `@utility` variants, layers |
| https://tailwindcss.com/docs/preflight | Preflight docs | read 2026-11-27 | `[hidden]` rule |
| Web search "Tailwind CSS v5 plans announcement" | Search results only (not a source for facts) | 2026-11-27 | Found no official v5 plan |

Note: the delta contract's 12-source minimum does not apply; only eight pages exist for this question.

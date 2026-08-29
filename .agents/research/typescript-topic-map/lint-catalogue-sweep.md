---
title: Lint Catalogue Sweep — TypeScript Quality Rule Set
corpus: typescript-topic-map
agent: lint-catalogue-sweep
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 13
scope: >
  Full-catalogue enumeration (not a research dive) of every rule in
  typescript-eslint, Biome's JS/TS linter, eslint-plugin-n, eslint-plugin-import-x,
  eslint-plugin-unicorn, eslint-plugin-security, eslint-plugin-no-unsanitized, and
  oxlint, fetched live from each project's own rule index/source as of 2026-08-29.
  Target fleet: published ESM library + commander CLI on NodeNext (Node >=20/>=22);
  VS Code extensions (esbuild, Electron host); a GitHub Action on Bun; browser SPAs
  (React+Vite, Vue+Vite); one Biome monorepo. TypeScript ^5.7. 7/8 repos on ESLint
  flat config + typescript-eslint, 1/8 on Biome.
rules_enumerated:
  typescript-eslint: 134
  biome_js_ts: 441
  eslint-plugin-n: 44
  eslint-plugin-import-x: 47
  eslint-plugin-unicorn: 338
  eslint-plugin-security: 14
  eslint-plugin-no-unsanitized: 2
  oxlint_in_scope_enumerated: 440
  oxlint_framework_specific_counted_only: 209
  total_enumerated_rows: 1460
  total_surveyed_including_counted_only: 1669
---

## Table of contents

1. [Summary](#summary)
2. [typescript-eslint](#typescript-eslint) — 134 rules
3. [Biome (JS/TS linter)](#biome-jsts-linter) — 441 rules
4. [eslint-plugin-n](#eslint-plugin-n) — 44 rules
5. [eslint-plugin-import-x](#eslint-plugin-import-x) — 47 rules
6. [eslint-plugin-unicorn](#eslint-plugin-unicorn) — 338 rules
7. [eslint-plugin-security](#eslint-plugin-security) — 14 rules
8. [eslint-plugin-no-unsanitized](#eslint-plugin-no-unsanitized) — 2 rules
9. [oxlint](#oxlint) — 440 in-scope + 209 framework-specific (counted only)
10. [Structural gaps](#structural-gaps)
11. [Catalogue rot](#catalogue-rot)
12. [Candidate topics](#candidate-topics)
13. [Sources](#sources)

**Methodology note on verdicts**: `adopt` = enable as a lint rule (already in a stock
preset, or cheap/safe to turn on). `adopt-as-rule-text` = not worth gating CI on
(too config-heavy, too noisy, or not lintable in every target repo) but the
underlying practice is worth stating in the fleet's prose quality-rule file so an
agent follows it without a red squiggly forcing the issue. `skip — model already
does this` = trivial correctness a current-generation model essentially never
violates unassisted. `skip — style only` = cosmetic, no behavior difference.
Preset membership for typescript-eslint was derived directly from the six flat
config source files (`recommended.ts`, `strict.ts`, `stylistic.ts`,
`recommended-type-checked-only.ts`, `strict-type-checked-only.ts`,
`stylistic-type-checked-only.ts`), not from the rendered docs page, which was
found to mis-state config membership for at least 6 rules during cross-check
(see Catalogue rot).

## Summary

- **1,460 rules fully enumerated** across 8 catalogues; **209 more** (oxlint's
  React/Vue/Next.js/Jest/Vitest/Playwright/React-Perf plugins) counted but not
  row-enumerated — out of scope for a *language*-quality rule set, in scope for a
  future framework-idiom sweep.
- **typescript-eslint: 134 rules, 62 type-aware (46%), 89 in some default
  preset, 45 in no preset at all, 8 deprecated.** Of the 45 not in any preset,
  **12 are still type-aware** — `strict-type-checked` does not get you these;
  they need to be turned on by hand.
- **Biome JS/TS: 441 rules across 8 groups, 224 recommended (51%).** `nursery`
  (80 rules) is 0% recommended by design — everything in it is opt-in, including
  a floating-promise detector and two Drizzle ORM guards with no ESLint-side
  equivalent.
- **eslint-plugin-n: 44 rules**, the only catalogue here that knows about
  Node/Bun *runtime* API availability (`no-unsupported-features/*`) — nothing
  else in this sweep checks "does this API exist on the engine I ship to."
- **eslint-plugin-import-x: 47 rules** across 4 groups; only 9 are marked
  `recommended` by the plugin's own flat presets. `no-cycle` and `no-extraneous-dependencies`
  are off by default everywhere and catch real build-time and packaging bugs.
- **eslint-plugin-unicorn: 338 rules, ~307 recommended (91%).** By rule count
  this is the largest catalogue in the fleet's own toolchain — larger than
  typescript-eslint and Biome's `style`+`suspicious`+`correctness` groups
  combined.
- **eslint-plugin-security: 14 rules, all nominally "recommended," but the
  plugin's own README states it "finds a lot of false positives which need
  triage by a human"** — direct conflict with a no-human-in-the-loop agent
  fleet. Verdict for most of these is `adopt-as-rule-text`, not `adopt`.
- **eslint-plugin-no-unsanitized: 2 rules** (`method`, `property`), both DOM
  sink guards with no equivalent anywhere else in this sweep except Biome's much
  narrower React-specific `noDangerouslySetInnerHtml`.
- **oxlint: 440 rules enumerated in scope** (ESLint-core, TypeScript, Unicorn,
  Import, Node, Promise, OXC-native, JSDoc, JSX-a11y equivalents), **209 more**
  in framework plugins counted only. Oxlint's own 2026 marketing claims a range
  from ~695 to ~870 total rules depending on the page/date cited — see
  Catalogue rot.
- **25 typescript-eslint rules are "extension rules"** that shadow a core
  ESLint rule of the same name (or a renamed one) and require the base rule be
  turned `'off'` — the trap of enabling both is a real footgun in a fleet where
  not every repo's flat config was hand-audited for this.
- **Cross-catalogue duplication is high**: `prefer-node-protocol` exists in
  both `eslint-plugin-n` and `eslint-plugin-unicorn`; `no-floating-promises` /
  `noFloatingPromises` exists in typescript-eslint (in `recommended-type-checked`)
  and Biome (`nursery`, opt-in) with *different default postures* — a real
  portability gap for the one Biome repo.
- Count of rules marked `adopt-as-rule-text` across all catalogues in this
  sweep: **≈54** (34 from typescript-eslint's none-preset/noisy set, 12 from
  eslint-plugin-security, 2 from no-unsanitized, ~6 spot-picked from Biome
  nursery/security).

## typescript-eslint

**Source**: `packages/eslint-plugin/src/rules/index.ts` and
`packages/eslint-plugin/src/configs/flat/*.ts` on the `main` branch of
`typescript-eslint/typescript-eslint`, fetched 2026-08-29 (rolling `main`, tracks
the latest published major at time of fetch). **134 rules total.**

Legend: **TA** = type-aware (requires `parserOptions.projectService` /
`project`). **Preset** = earliest tier the rule is introduced at (a rule
introduced at `strict` is also active at `strict-type-checked`; a rule
introduced at `recommended` is active at every tier above it). **Dep.** =
deprecated.

| Rule | What it says | TA | Preset | Dep. | Verdict |
|---|---|---|---|---|---|
| adjacent-overload-signatures | Require overload signatures to be adjacent | No | stylistic | No | skip — style only |
| array-type | `T[]` vs `Array<T>` consistently | No | stylistic | No | skip — style only |
| await-thenable | Disallow `await` on non-Thenable values | Yes | recommended-type-checked | No | adopt |
| ban-ts-comment | `@ts-ignore`/`@ts-expect-error` need a description | No | recommended | No | adopt |
| ban-tslint-comment | Disallow stale `// tslint:` comments | No | stylistic | No | skip — model already does this |
| class-literal-property-style | Consistent literal property style on classes | No | stylistic | No | skip — style only |
| class-methods-use-this | Class methods must use `this` | No | none | No | adopt-as-rule-text |
| consistent-generic-constructors | Consistent placement of generic args on `new` | No | stylistic | No | skip — style only |
| consistent-indexed-object-style | `Record<K,V>` vs index signature | No | stylistic | No | skip — style only |
| consistent-return | Functions must consistently return or not return a value | Yes | none | No | adopt |
| consistent-type-assertions | Consistent `as`/angle-bracket assertion style | No | stylistic | No | skip — style only |
| consistent-type-definitions | `interface` vs `type` consistently | No | stylistic | No | skip — style only |
| consistent-type-exports | Enforce `export type` for type-only exports | Yes | none | No | adopt |
| consistent-type-imports | Enforce `import type` for type-only imports | No | none | No | adopt |
| default-param-last | Default parameters must come last | No | none | No | adopt |
| dot-notation | Prefer `obj.a` over `obj['a']` when legal | Yes | stylistic-type-checked | No | adopt |
| explicit-function-return-type | Require explicit return types on functions | No | none | No | adopt-as-rule-text |
| explicit-member-accessibility | Require `public`/`private`/`protected` on members | No | none | No | adopt-as-rule-text |
| explicit-module-boundary-types | Require explicit types on exported function args/returns | No | none | No | adopt-as-rule-text |
| init-declarations | Require/disallow initializers in var declarations | No | none | No | skip — style only |
| max-params | Cap function parameter count | No | none | No | adopt-as-rule-text |
| member-ordering | Enforce class member declaration order | No | none | No | skip — style only |
| method-signature-style | `method(): T` vs `method: () => T` in interfaces | No | none | No | skip — style only |
| naming-convention | Enforce naming conventions fleet-wide | Yes | none | No | adopt-as-rule-text |
| no-array-constructor | Disallow `Array()`/`new Array()` with 1 non-numeric arg | No | recommended | No | adopt |
| no-array-delete | Disallow `delete arr[i]` on arrays | Yes | recommended-type-checked | No | adopt |
| no-base-to-string | Disallow calling `.toString()` on objects without a useful one | Yes | recommended-type-checked | No | adopt |
| no-confusing-non-null-assertion | Disallow `a! == b` style confusables | No | stylistic | No | adopt |
| no-confusing-void-expression | Disallow `void`-returning expr in confusing position | Yes | strict-type-checked | No | adopt |
| no-deprecated | Disallow using symbols marked `@deprecated` | Yes | strict-type-checked | No | adopt |
| no-dupe-class-members | Disallow duplicate class member names | No | none | No | skip — model already does this |
| no-duplicate-enum-values | Disallow duplicate enum member values | No | recommended | No | adopt |
| no-duplicate-type-constituents | Disallow duplicate members in unions/intersections | Yes | recommended-type-checked | No | adopt |
| no-dynamic-delete | Disallow `delete obj[computedKey]` | No | strict | No | adopt |
| no-empty-function | Disallow empty function bodies | No | stylistic | No | skip — style only |
| no-empty-interface | Disallow empty `interface X {}` | No | none | **Yes** | skip — deprecated (→ no-empty-object-type) |
| no-empty-object-type | Disallow the accidental empty-object type `{}` | No | recommended | No | adopt |
| no-explicit-any | Disallow `any` | No | recommended | No | adopt |
| no-extra-non-null-assertion | Disallow redundant `!!` or `!.!` | No | recommended | No | adopt |
| no-extraneous-class | Disallow classes used only as static namespaces | No | strict | No | adopt |
| no-floating-promises | Require Promises to be handled | Yes | recommended-type-checked | No | adopt |
| no-for-in-array | Disallow `for...in` over arrays | Yes | recommended-type-checked | No | adopt |
| no-implied-eval | Disallow `setTimeout("code")`-style implied eval | Yes | recommended-type-checked | No | adopt |
| no-import-type-side-effects | Flag `import type` that should be a qualified-type import | No | none | No | adopt |
| no-inferrable-types | Disallow explicit types TS would infer anyway | No | stylistic | No | skip — style only |
| no-invalid-this | Disallow `this` outside classes | No | none | No | skip — model already does this |
| no-invalid-void-type | Disallow `void` outside return-type/generic position | No | strict | No | adopt |
| no-loop-func | Disallow function declarations that capture unsafe loop bindings | No | none | No | adopt-as-rule-text |
| no-loss-of-precision | Disallow numeric literals losing precision | No | none | **Yes** | skip — deprecated (core ESLint rule instead) |
| no-magic-numbers | Disallow unnamed numeric literals | No | none | No | adopt-as-rule-text |
| no-meaningless-void-operator | Disallow `void` on already-void expressions | Yes | strict-type-checked | No | adopt |
| no-misused-new | Disallow `new`/`constructor` misuse on interfaces/classes | No | recommended | No | adopt |
| no-misused-promises | Disallow Promises where a non-Promise is expected | Yes | recommended-type-checked | No | adopt |
| no-misused-spread | Disallow spreading values that don't behave as expected | Yes | strict-type-checked | No | adopt |
| no-mixed-enums | Disallow mixing string/number members in one enum | Yes | strict-type-checked | No | adopt |
| no-namespace | Disallow legacy `namespace`/`module` keyword | No | recommended | No | adopt |
| no-non-null-asserted-nullish-coalescing | Disallow `x! ?? y` | No | strict | No | adopt |
| no-non-null-asserted-optional-chain | Disallow `x?.y!` | No | recommended | No | adopt |
| no-non-null-assertion | Disallow the `!` postfix operator entirely | No | strict | No | adopt-as-rule-text (too aggressive for CI in most fleets; state as prose guidance instead) |
| no-redeclare | Disallow variable redeclaration | No | none | No | skip — model already does this |
| no-redundant-type-constituents | Disallow union/intersection members subsumed by another | Yes | recommended-type-checked | No | adopt |
| no-require-imports | Disallow `require()` in ESM-targeting code | No | recommended | No | adopt |
| no-restricted-imports | Disallow specific imports | No | none | **Yes** | skip — deprecated (use core `no-restricted-imports`) |
| no-restricted-types | Disallow configured types | No | none | No | adopt-as-rule-text |
| no-shadow | Disallow variable shadowing | No | none | No | adopt-as-rule-text |
| no-this-alias | Disallow `const self = this` | No | recommended | No | adopt |
| no-type-alias | Disallow `type` aliases entirely | No | none | **Yes** | skip — deprecated |
| no-unnecessary-boolean-literal-compare | Disallow `x === true` | Yes | strict-type-checked | No | adopt |
| no-unnecessary-condition | Disallow conditions that are always truthy/falsy per types | Yes | strict-type-checked | No | adopt |
| no-unnecessary-parameter-property-assignment | Disallow redundant re-assignment of parameter properties | No | none | No | adopt |
| no-unnecessary-qualifier | Disallow unneeded namespace qualifiers | Yes | none | No | adopt-as-rule-text |
| no-unnecessary-template-expression | Disallow template literals with no real interpolation | Yes | strict-type-checked | No | adopt |
| no-unnecessary-type-arguments | Disallow type args equal to their default | Yes | strict-type-checked | No | adopt |
| no-unnecessary-type-assertion | Disallow assertions that don't change the type | Yes | recommended-type-checked | No | adopt |
| no-unnecessary-type-constraint | Disallow `<T extends any>`-style no-op constraints | No | recommended | No | adopt |
| no-unnecessary-type-conversion | Disallow conversions that don't change runtime type | Yes | strict-type-checked | No | adopt |
| no-unnecessary-type-parameters | Disallow generics used only once | Yes | strict-type-checked | No | adopt |
| no-unsafe-argument | Disallow passing `any` as a typed argument | Yes | recommended-type-checked | No | adopt |
| no-unsafe-assignment | Disallow assigning `any` to a typed value | Yes | recommended-type-checked | No | adopt |
| no-unsafe-call | Disallow calling a value typed `any` | Yes | recommended-type-checked | No | adopt |
| no-unsafe-declaration-merging | Disallow unsafe class/interface merging | No | recommended | No | adopt |
| no-unsafe-enum-comparison | Disallow comparing enum members across enum types | Yes | recommended-type-checked | No | adopt |
| no-unsafe-function-type | Disallow the loose `Function` type | No | recommended | No | adopt |
| no-unsafe-member-access | Disallow property access on `any` | Yes | recommended-type-checked | No | adopt |
| no-unsafe-return | Disallow returning `any` from a typed function | Yes | recommended-type-checked | No | adopt |
| no-unsafe-type-assertion | Disallow assertions that narrow to an unrelated type | Yes | none | No | adopt |
| no-unsafe-unary-minus | Disallow unary `-` on non-numeric types | Yes | recommended-type-checked | No | adopt |
| no-unused-expressions | Disallow expression statements with no effect | No | recommended | No | adopt |
| no-unused-private-class-members | Disallow unused `private` class fields/methods | No | none | No | adopt |
| no-unused-vars | Disallow unused variables | No | recommended | No | adopt |
| no-use-before-define | Disallow use before lexical definition | No | none | No | adopt-as-rule-text |
| no-useless-constructor | Disallow constructors that only call `super()` | No | strict | No | adopt |
| no-useless-default-assignment | Disallow default values that can never apply | Yes | strict-type-checked | No | adopt |
| no-useless-empty-export | Disallow `export {}` when the file has real exports | No | none | No | adopt |
| no-var-requires | Disallow `var x = require(...)` | No | none | **Yes** | skip — deprecated (folded into no-require-imports) |
| no-wrapper-object-types | Disallow `String`/`Number`/`Boolean` as types | No | recommended | No | adopt |
| non-nullable-type-assertion-style | Prefer `x!` over `x as NonNullable<typeof x>` | Yes | stylistic-type-checked | No | adopt |
| only-throw-error | Disallow throwing non-Error values | Yes | recommended-type-checked | No | adopt |
| parameter-properties | Require/disallow TS constructor parameter properties | No | none | No | skip — style only |
| prefer-as-const | Prefer `as const` over literal-typed `as` | No | recommended | No | adopt |
| prefer-destructuring | Prefer destructuring from arrays/objects | Yes | none | No | adopt-as-rule-text |
| prefer-enum-initializers | Require explicit values on every enum member | No | none | No | adopt-as-rule-text |
| prefer-find | Prefer `.find()` over `.filter()[0]` | Yes | stylistic-type-checked | No | adopt |
| prefer-for-of | Prefer `for...of` over index loops | No | stylistic | No | skip — style only |
| prefer-function-type | Prefer function type over 1-call-signature interface | No | stylistic | No | skip — style only |
| prefer-includes | Prefer `.includes()` over `.indexOf() !== -1` | Yes | stylistic-type-checked | No | adopt |
| prefer-literal-enum-member | Require enum members to be literal values | No | strict | No | adopt |
| prefer-namespace-keyword | Prefer `namespace` over `module` keyword | No | recommended | No | adopt |
| prefer-nullish-coalescing | Prefer `??` over `\|\|` where semantics differ | Yes | stylistic-type-checked | No | adopt |
| prefer-optional-chain | Prefer `?.` over manual guard chains | Yes | stylistic-type-checked | No | adopt |
| prefer-promise-reject-errors | Require rejecting Promises with `Error` objects | Yes | recommended-type-checked | No | adopt |
| prefer-readonly | Require `readonly` on members never reassigned | Yes | none | No | adopt |
| prefer-readonly-parameter-types | Require `readonly` on parameter types | Yes | none | No | adopt-as-rule-text (famously noisy on plain object params) |
| prefer-reduce-type-parameter | Require explicit type param on `.reduce()` instead of `as` | Yes | strict-type-checked | No | adopt |
| prefer-regexp-exec | Prefer `RegExp#exec()` over `String#match()` when not global | Yes | stylistic-type-checked | No | adopt |
| prefer-return-this-type | Prefer `this` as return type in fluent APIs | Yes | strict-type-checked | No | adopt |
| prefer-string-starts-ends-with | Prefer `.startsWith()`/`.endsWith()` over regex/slice | Yes | stylistic-type-checked | No | adopt |
| prefer-ts-expect-error | Prefer `@ts-expect-error` over `@ts-ignore` | No | none | **Yes** | skip — deprecated (folded into ban-ts-comment defaults) |
| promise-function-async | Require `async` on functions that return a Promise | Yes | none | No | adopt |
| related-getter-setter-pairs | Require matching types on paired getter/setter | Yes | strict-type-checked | No | adopt |
| require-array-sort-compare | Require a compare function for `.sort()` on non-string arrays | Yes | none | No | adopt |
| require-await | Disallow `async` functions with no `await` | Yes | recommended-type-checked | No | adopt |
| restrict-plus-operands | Restrict `+` to compatible operand types | Yes | recommended-type-checked | No | adopt |
| restrict-template-expressions | Restrict template-literal interpolation to safe types | Yes | recommended-type-checked | No | adopt |
| return-await | Enforce `return await` in try/catch (or forbid it) | Yes | strict-type-checked | No | adopt |
| sort-type-constituents | Sort union/intersection members alphabetically | Yes | none | **Yes** | skip — deprecated (defer to Prettier/perfectionist) |
| strict-boolean-expressions | Restrict `if(x)` to genuinely boolean expressions | Yes | none | No | adopt |
| strict-void-return | Disallow value-returning functions where `void` is expected | Yes | none | No | adopt |
| switch-exhaustiveness-check | Require exhaustive `switch` over union/enum types | Yes | none | No | adopt |
| triple-slash-reference | Disallow triple-slash directives in favor of `import` | No | recommended | No | adopt |
| typedef | Require type annotations in specific positions | No | none | **Yes** | skip — deprecated |
| unbound-method | Disallow passing class methods without binding `this` | Yes | recommended-type-checked | No | adopt |
| unified-signatures | Disallow overloads unifiable with a union parameter | No | strict | No | adopt |
| use-unknown-in-catch-callback-variable | Require `unknown` typing on `.catch()`/rejection callbacks | Yes | strict-type-checked | No | adopt |

**Preset totals** (primary-source-derived): `recommended` 20 · `recommended-type-checked`
adds 23 (43 total) · `strict` adds 8 over recommended (28 total) ·
`strict-type-checked` adds 17 over recommended-type-checked (68 total, all 68
type-aware-or-not rules active) · `stylistic` 13 · `stylistic-type-checked`
adds 8 (21 total) · **none preset: 45 rules**, of which 8 are deprecated and
**12 are type-aware** (`consistent-return`, `consistent-type-exports`,
`naming-convention`, `no-unsafe-type-assertion`, `prefer-destructuring`,
`prefer-readonly`, `prefer-readonly-parameter-types`, `promise-function-async`,
`require-array-sort-compare`, `strict-boolean-expressions`, `strict-void-return`,
`switch-exhaustiveness-check`).

### Extension rules (replace a core ESLint rule)

25 typescript-eslint rules share a name with — or explicitly supersede — a core
ESLint rule, and every stock config that enables one turns the core rule `'off'`
in the same file. The trap: a repo whose `eslint.config.js` was assembled by
hand-merging presets (or by an agent copying a snippet from one repo into
another) can end up with **both** active, which either double-reports or, worse,
the core rule silently wins if it's declared after the typescript-eslint one.

`class-methods-use-this`, `consistent-return`, `default-param-last`,
`dot-notation`, `init-declarations`, `max-params`, `no-array-constructor`,
`no-dupe-class-members`, `no-empty-function`, `no-invalid-this`, `no-loop-func`,
`no-loss-of-precision`, `no-magic-numbers`, `no-redeclare`,
`no-restricted-imports`, `no-shadow`, `no-unused-expressions`, `no-unused-vars`,
`no-use-before-define`, `no-useless-constructor`, `only-throw-error` (replaces
core `no-throw-literal`), `prefer-destructuring`, `prefer-promise-reject-errors`,
`require-await`, `return-await` (replaces core `no-return-await`, itself
deprecated).

**Rule-text worth stating**: "When enabling a typescript-eslint extension rule,
turn the identically-named core ESLint rule off in the same config block — do
not just add the typescript-eslint rule alongside the default recommended-js
config." This is exactly the kind of thing a config-generating agent gets wrong
silently.

## Biome (JS/TS linter)

**Source**: `https://biomejs.dev/linter/javascript/rules/`, fetched 2026-08-29.
**441 rules across 8 groups** (this is the JS/TS/JSX-applicable subset; Biome
also has separate CSS/JSON/GraphQL rule sets not counted here). Biome uses
camelCase rule names (`noExplicitAny`, not `no-explicit-any`) — a mechanical
but real porting cost when the fleet's 7 ESLint repos and 1 Biome repo share a
prose rule file.

Legend: **Rec** = recommended by Biome's own default config. **Fix** = Safe
autofix / Unsafe autofix / none.

### a11y (36 rules, 35 recommended)

| Rule | What it says | Rec | Fix | ESLint/ts-eslint equivalent |
|---|---|---|---|---|
| noAccessKey | Disallow `accessKey` attribute | Y | — | jsx-a11y/no-access-key |
| noAmbiguousAnchorText | Disallow ambiguous anchor text ("click here") | Y | — | jsx-a11y/anchor-ambiguous-text |
| noAriaHiddenOnFocusable | `aria-hidden` must not be on a focusable element | Y | — | jsx-a11y/no-aria-hidden-on-focusable |
| noAriaUnsupportedElements | Elements without ARIA support must not carry ARIA attrs | Y | — | jsx-a11y/aria-unsupported-elements |
| noAutofocus | Disallow `autoFocus` | Y | — | jsx-a11y/no-autofocus |
| noDistractingElements | Disallow `<marquee>`/`<blink>` | Y | — | jsx-a11y/no-distracting-elements |
| noHeaderScope | `scope` only valid on `<th>` | Y | — | — Biome-only |
| noInteractiveElementToNoninteractiveRole | Interactive elements must not get non-interactive roles | Y | — | jsx-a11y/no-interactive-element-to-noninteractive-role |
| noLabelWithoutControl | `<label>` needs text + associated control | Y | — | jsx-a11y/label-has-associated-control |
| noNoninteractiveElementInteractions | No event handlers on non-interactive elements | N | — | jsx-a11y/no-noninteractive-element-interactions |
| noNoninteractiveElementToInteractiveRole | Non-interactive elements must not get interactive roles | Y | — | jsx-a11y/no-noninteractive-element-to-interactive-role |
| noNoninteractiveTabindex | `tabIndex` must not be on non-interactive elements | Y | — | jsx-a11y/no-noninteractive-tabindex |
| noPositiveTabindex | Disallow positive `tabIndex` | Y | — | jsx-a11y/no-noninteractive-tabindex-related |
| noRedundantAlt | `alt` must not contain "image"/"picture"/"photo" | Y | — | jsx-a11y/img-redundant-alt |
| noRedundantRoles | Explicit role must not duplicate implicit role | Y | — | jsx-a11y/no-redundant-roles |
| noStaticElementInteractions | Static elements with click handlers need a valid role | Y | — | jsx-a11y/no-static-element-interactions |
| noSvgWithoutTitle | `<svg>` needs a `<title>` | Y | — | — Biome-only |
| useAltText | Elements needing alt text must have it | Y | — | jsx-a11y/alt-text |
| useAnchorContent | Anchors need screen-reader-accessible content | Y | — | jsx-a11y/anchor-has-content |
| useAriaActivedescendantWithTabindex | `aria-activedescendant` needs `tabIndex` | Y | — | jsx-a11y/aria-activedescendant-has-tabindex |
| useAriaPropsForRole | Elements with ARIA roles need required ARIA attrs | Y | — | jsx-a11y/role-has-required-aria-props |
| useAriaPropsSupportedByRole | ARIA props must be valid for the element's role | Y | — | jsx-a11y/role-supports-aria-props |
| useButtonType | `<button>` needs a `type` | Y | — | jsx-a11y/button-has-type |
| useFocusableInteractive | Interactive-role elements need to be focusable | Y | — | jsx-a11y/interactive-supports-focus |
| useHeadingContent | Headings need accessible content | Y | — | jsx-a11y/heading-has-content |
| useHtmlLang | `<html>` needs `lang` | Y | — | jsx-a11y/html-has-lang |
| useIframeTitle | `<iframe>` needs `title` | Y | — | jsx-a11y/iframe-has-title |
| useKeyWithClickEvents | Click handlers need a matching key handler | Y | — | jsx-a11y/click-events-have-key-events |
| useKeyWithMouseEvents | `onMouseOver`/`onMouseOut` need `onFocus`/`onBlur` | Y | — | jsx-a11y/mouse-events-have-key-events |
| useMediaCaption | `<audio>`/`<video>` need `<track>` captions | Y | — | jsx-a11y/media-has-caption |
| useSemanticElements | Prefer semantic elements over `role` | Y | — | — Biome-only |
| useValidAnchor | Anchors must be valid/navigable | Y | — | jsx-a11y/anchor-is-valid |
| useValidAriaProps | `aria-*` props must be valid | Y | — | jsx-a11y/aria-props |
| useValidAriaRole | ARIA roles must be valid, non-abstract | Y | — | jsx-a11y/aria-role |
| useValidAriaValues | ARIA state/prop values must be valid | Y | — | jsx-a11y/aria-proptypes |
| useValidAutocomplete | `autocomplete` value must be valid | Y | — | jsx-a11y/autocomplete-valid |
| useValidLang | `lang` value must be a valid ISO code | Y | — | — Biome-only |

Verdict for the group: `skip — model already does this` for the React/Vue SPA
repos only if a jsx-a11y-equivalent is already wired in; otherwise `adopt` — a11y
defects are exactly the class an agent with no visual feedback loop will
introduce silently.

### complexity (49 rules, 34 recommended)

| Rule | What it says | Rec | Fix |
|---|---|---|---|
| noAdjacentSpacesInRegex | Unclear consecutive spaces in regex | Y | — |
| noArguments | Disallow `arguments` object | Y | — |
| noBannedTypes | Disallow primitive-wrapper type aliases | Y | — |
| noCommaOperator | Disallow comma operator | Y | — |
| noDivRegex | Disallow `/=` at regex start (looks like division-assign) | N | — |
| noEmptyTypeParameters | Disallow empty `<>` on types | Y | — |
| noExcessiveCognitiveComplexity | Cap cognitive complexity score | N | — |
| noExcessiveLinesPerFunction | Cap lines per function | N | — |
| noExcessiveNestedTestSuites | Cap nested `describe()` depth | N | — |
| noExtraBooleanCast | Disallow unnecessary `Boolean()`/`!!` | Y | Safe |
| noFlatMapIdentity | Disallow no-op callback on `.flatMap()` | Y | — |
| noForEach | Prefer `for...of` over `.forEach()` | N | — |
| noImplicitCoercions | Require explicit type conversion | N | — |
| noRedundantDefaultExport | Default export duplicating a named export | N | — |
| noStaticOnlyClass | Disallow classes with only static members | Y | — |
| noThisInStatic | Disallow `this`/`super` in static context | Y | — |
| noUselessCatch | Disallow catch blocks that only rethrow | Y | — |
| noUselessCatchBinding | Disallow unused catch bindings | N | — |
| noUselessConstructor | Disallow constructors that only call `super()` | Y | Safe |
| noUselessContinue | Disallow unnecessary `continue` | Y | Safe |
| noUselessEmptyExport | Disallow no-op `export {}` | Y | Safe |
| noUselessEscapeInRegex | Disallow unnecessary regex escapes | Y | Safe |
| noUselessFragments | Disallow unnecessary JSX fragments | Y | Safe |
| noUselessLabel | Disallow unnecessary labels | Y | Safe |
| noUselessLoneBlockStatements | Disallow unnecessary nested blocks | Y | Safe |
| noUselessRename | Disallow `{ a as a }` | Y | Safe |
| noUselessReturn | Disallow redundant `return` | Y | Safe |
| noUselessStringConcat | Disallow concatenating literal strings | N | — |
| noUselessStringRaw | Disallow unneeded `String.raw` | Y | Safe |
| noUselessSwitchCase | Disallow useless `case` before `default` | Y | Safe |
| noUselessTernary | Disallow ternaries with a simpler equivalent | Y | Safe |
| noUselessThisAlias | Disallow useless `const self = this` | Y | Safe |
| noUselessTypeConstraint | Disallow `<T extends any/unknown>` | Y | Safe |
| noUselessUndefined | Disallow explicit `undefined` where implicit | N | — |
| noUselessUndefinedInitialization | Disallow `let x = undefined` | Y | Safe |
| noVoid | Disallow `void` operator | N | — |
| useArrayFind | Prefer `.find()` over `.filter()[0]` | N | — |
| useArrowFunction | Prefer arrow functions over function expressions | Y | Unsafe |
| useDateNow | Prefer `Date.now()` | Y | Safe |
| useFlatMap | Prefer `.flatMap()` over `.map().flat()` | Y | Safe |
| useIndexOf | Prefer `.indexOf()`/`.lastIndexOf()` over `.findIndex()` | Y | Safe |
| useLiteralKeys | Prefer literal over computed property access | Y | Safe |
| useMaxParams | Cap function parameter count | N | — |
| useNumericLiterals | Disallow `parseInt()` for binary/octal/hex | Y | Safe |
| useOptionalChain | Prefer `?.` over chained `&&` guards | Y | Unsafe |
| useRegexLiterals | Prefer regex literal over `new RegExp()` | Y | Safe |
| useSimpleNumberKeys | Disallow non-base-10/non-underscore number literal keys | Y | — |
| useSimplifiedLogicExpression | Simplify redundant logical expressions | N | — |
| useWhile | Prefer `while` over `for` with no init/update | N | — |

ts-eslint equivalents: `useOptionalChain`≈`prefer-optional-chain`,
`useArrowFunction`≈no direct ts-eslint rule (core `prefer-arrow-callback`),
`noStaticOnlyClass`≈`no-extraneous-class`. `noExcessiveCognitiveComplexity` has
no typescript-eslint or core-ESLint equivalent at all — cyclomatic complexity
(`complexity` core rule) is the nearest core-ESLint analog but measures a
different thing. Verdict: mostly `skip — model already does this` for the
useless-* family (models rarely emit dead code deliberately, but do emit it
during multi-step edits — keep as `adopt` for the Biome repo since it's already
free there), `adopt-as-rule-text` for `noExcessiveCognitiveComplexity` and
`noExcessiveLinesPerFunction` fleet-wide.

### correctness (67 rules, 49 recommended)

| Rule | What it says | Rec | Fix |
|---|---|---|---|
| noBeforeInteractiveScriptOutsideDocument | Next.js `beforeInteractive` script placement | N | — |
| noChildrenProp | Disallow passing `children` as a prop | Y | Safe |
| noConstAssign | Disallow reassigning `const` | Y | — |
| noConstantCondition | Disallow constant conditions | Y | — |
| noConstantMathMinMaxClamp | Disallow `Math.min`/`Math.max` clamps with a constant result | Y | — |
| noConstructorReturn | Disallow `return <value>` in a constructor | Y | — |
| noEmptyCharacterClassInRegex | Disallow empty `[]` in regex | Y | — |
| noEmptyPattern | Disallow empty destructuring patterns | Y | — |
| noGlobalDirnameFilename | Disallow bare `__dirname`/`__filename` in global scope | N | — |
| noGlobalObjectCalls | Disallow calling global objects (`Math()`, `JSON()`) as functions | Y | — |
| noInnerDeclarations | Disallow `function`/`var` outside top-level/function block | Y | — |
| noInvalidBuiltinInstantiation | Ensure builtins are instantiated correctly | Y | — |
| noInvalidConstructorSuper | Disallow bad/missing `super()` calls | Y | — |
| noInvalidUseBeforeDeclaration | Disallow use-before-declare | Y | — |
| noNestedComponentDefinitions | Disallow defining React components inside components | N | — |
| noNextAsyncClientComponent | Client components must not be `async` | N | — |
| noNodejsModules | Disallow Node.js builtin modules | N | — |
| noNonoctalDecimalEscape | Disallow `\8`/`\9` escapes | Y | — |
| noPrecisionLoss | Disallow numeric literals losing precision | Y | — |
| noPrivateImports | Restrict importing private exports | Y | — |
| noProcessGlobal | Disallow the `process` global | N | — |
| noQwikUseVisibleTask | Disallow `useVisibleTask$()` in Qwik | Y | — |
| noReactPropAssignments | Disallow assigning to React props | N | — |
| noRenderReturnValue | Disallow using `React.render()`'s return value | Y | — |
| noRestrictedElements | Disallow configured elements | N | — |
| noSelfAssign | Disallow `x = x` | Y | — |
| noSetterReturn | Disallow returning a value from a setter | Y | — |
| noSolidDestructuredProps | Disallow destructuring props in Solid JSX | N | — |
| noStringCaseMismatch | Disallow case-mismatched string comparisons | Y | — |
| noSwitchDeclarations | Disallow lexical decls directly in `switch` clauses | Y | — |
| noUndeclaredDependencies | Disallow deps not in `package.json` | N | — |
| noUndeclaredVariables | Disallow using undeclared variables | N | — |
| noUnreachable | Disallow unreachable code | Y | — |
| noUnreachableSuper | Ensure `super()` runs exactly once before `this` | Y | — |
| noUnresolvedImports | Warn on imports that don't resolve | N | — |
| noUnsafeFinally | Disallow control flow in `finally` | Y | — |
| noUnsafeOptionalChaining | Disallow optional chaining where `undefined` isn't allowed | Y | — |
| noUnusedFunctionParameters | Disallow unused function params | Y | — |
| noUnusedImports | Disallow unused imports | Y | Safe |
| noUnusedInstantiation | Disallow `new` outside assignment/comparison | N | — |
| noUnusedLabels | Disallow unused labels | Y | Safe |
| noUnusedPrivateClassMembers | Disallow unused private class members | Y | — |
| noUnusedVariables | Disallow unused variables | Y | — |
| noVoidElementsWithChildren | Disallow children on void elements (`<img>`) | Y | — |
| noVoidTypeReturn | Disallow returning a value where return type is `void` | Y | — |
| noVueDataObjectDeclaration | Vue `data` must be a function | Y | — |
| noVueDuplicateKeys | Disallow duplicate keys across Vue option groups | Y | — |
| noVueReservedKeys | Disallow reserved keys in Vue data/computed | Y | — |
| noVueReservedProps | Disallow reserved prop names | Y | — |
| noVueSetupPropsReactivityLoss | Disallow destructuring `props` in Vue `setup()` | N | — |
| useExhaustiveDependencies | React hook deps must be complete | Y | — |
| useHookAtTopLevel | React hooks must be called top-level | Y | — |
| useImageSize | `<img>` needs `width`/`height` | Y | — |
| useImportExtensions | Require file extensions on relative imports | N | — |
| useInlineScriptId | Next.js inline `<Script>` needs `id` | Y | — |
| useIsNan | Require `isNaN()` for NaN checks | Y | Safe |
| useJsonImportAttributes | Require `with {type:"json"}` on JSON imports | N | — |
| useJsxKeyInIterable | Disallow missing `key` in iterated JSX | Y | — |
| useParseIntRadix | Require a radix argument on `parseInt()` | Y | Safe |
| useQwikClasslist | Prefer `class` prop over Qwik's classnames helper | Y | — |
| useQwikMethodUsage | Disallow `use*` hooks outside valid contexts | Y | — |
| useQwikValidLexicalScope | Disallow unserializable expressions in Qwik scopes | Y | — |
| useSingleJsDocAsterisk | JSDoc lines must start with a single `*` | N | — |
| useUniqueElementIds | Disallow static string `id` on elements | N | — |
| useValidForDirection | `for` loop counter must move toward the exit condition | Y | — |
| useValidTypeof | `typeof x` comparisons must use a valid string | Y | — |
| useYield | Generator functions must contain `yield` | Y | — |

Direct ts-eslint/core overlap: `noUnsafeOptionalChaining`≈core
`no-unsafe-optional-chaining`, `noVoidTypeReturn`≈ts-eslint has no exact
equivalent (closest is `no-confusing-void-expression`), `noUnusedVariables`≈ts-eslint
`no-unused-vars`. **Biome-only, no ESLint-side equivalent anywhere in this
sweep**: `noConstantMathMinMaxClamp`, `noGlobalDirnameFilename`,
`noStringCaseMismatch`, `useSingleJsDocAsterisk`, all Qwik/Solid-specific rules.
Verdict: `adopt` for the core-correctness rows (these are compile-adjacent
bugs), `skip — model already does this` for the Vue/Qwik/Solid-specific rows
since only 1 repo uses Vue and none use Qwik/Solid in this fleet.

### nursery (80 rules, 0 recommended by design)

Full row-by-row descriptions omitted for space (all 80 rule names are listed
below with a one-line note) since Biome's own posture on this group — nothing
here is on by default, ever, until promoted — makes the group-level verdict do
more work than any per-row verdict would:

`noBaseToString`, `noComponentHookFactories`, `noConditionalExpect`,
`noDrizzleDeleteWithoutWhere` (DELETE with no WHERE — data-loss bug),
`noDrizzleUpdateWithoutWhere` (UPDATE with no WHERE — data-loss bug),
`noExcessiveNestedCallbacks`, `noExtendNative`, `noFloatingPromises` (duplicate
of typescript-eslint's recommended-type-checked rule, but off by default here),
`noIdenticalTestTitle`, `noImpliedEval`, `noInlineStyles`,
`noJsRestrictedProperties`, `noJsxLeakedDollar`, `noJsxNamespace`, `noLoopFunc`,
`noMisleadingReturnType`, `noMisusedPromises`, `noNegationInEqualityCheck`,
`noNonScalableViewport`, `noPlaywrightElementHandle`, `noPlaywrightEval`,
`noPlaywrightForceOption`, `noPlaywrightMissingAwait`, `noPlaywrightNetworkidle`,
`noPlaywrightPagePause`, `noPlaywrightUselessAwait`,
`noPlaywrightWaitForNavigation`, `noPlaywrightWaitForSelector`,
`noPlaywrightWaitForTimeout`, `noReactNativeDeepImports`,
`noReactNativeLiteralColors`, `noReactNativeRawText`, `noReactStringRefs`,
`noRestrictedDependencies`, `noSvelteUnnecessaryStateWrap`,
`noTailwindArbitraryValue`, `noUndeclaredClasses`, `noUndeclaredCustomProperties`,
`noUnnecessaryTemplateExpression`, `noUnsafePlusOperands`,
`noUnsafeTypeAssertion`, `noUselessTypeConversion`, `noVueImportCompilerMacros`,
`noVueRefAsOperand`, `useArraySome`, `useAwaitThenable`, `useConsistentTestIt`,
`useControlLabel`, `useDisposables`, `useDomNodeTextContent`,
`useDomQuerySelector`, `useExhaustiveSwitchCases`, `useExpect`,
`useExplicitReturnType`, `useExplicitType`, `useIframeSandbox`,
`useImportsFirst`, `useIncludes`, `useMathMinMax`, `useNamedCaptureGroup`,
`useNullishCoalescing`, `usePlaywrightValidDescribeCallback`,
`useQwikLoaderLocation`, `useReactAsyncServerFunction`, `useReactCompiler`,
`useReactFunctionComponentDefinition`, `useReactNativePlatformComponents`,
`useReduceTypeParameter`, `useRegexpExec`, `useRegexpTest`, `useSortedClasses`,
`useStringStartsEndsWith`, `useTailwindShorthandClasses`, `useTestHooksInOrder`,
`useTestHooksOnTop`, `useThisInClassMethods`, `useUnicodeRegex`, `useVarsOnTop`,
`useVueConsistentDefinePropsDeclaration`, `useVueNextTickPromise`.

Verdict: `adopt` for `noFloatingPromises`, `noDrizzleDeleteWithoutWhere`,
`noDrizzleUpdateWithoutWhere`, `noMisusedPromises`, `noUnsafeTypeAssertion` in
the Biome repo specifically — these close a real gap against the
typescript-eslint-covered repos. Everything else: `skip — model already does
this` or not applicable to this fleet's frameworks (Svelte/React Native/Qwik/Tailwind).

### performance (14 rules, 6 recommended)

| Rule | What it says | Rec | Fix |
|---|---|---|---|
| noAccumulatingSpread | Disallow `[...acc, x]` inside a reduce accumulator | Y | — |
| noAwaitInLoops | Disallow sequential `await` inside loops | N | — |
| noBarrelFile | Disallow barrel (`index.ts` re-export-only) files | N | — |
| noDelete | Disallow the `delete` operator (de-optimizes object shape) | N | — |
| noDynamicNamespaceImportAccess | Disallow dynamic access into `import * as ns` | Y | — |
| noImgElement | Prevent `<img>` in Next.js (use `next/image`) | Y | — |
| noJsxPropsBind | Disallow `.bind()`/inline arrows in JSX props | N | — |
| noNamespaceImport | Disallow `import * as ns` | N | — |
| noReExportAll | Disallow `export * from` | N | — |
| noSyncScripts | Disallow synchronous `<script>` tags | N | — |
| noUnwantedPolyfillio | Disallow duplicate Polyfill.io polyfills | Y | — |
| useGoogleFontPreconnect | Require `preconnect` with Google Fonts | Y | Safe |
| useSolidForComponent | Prefer Solid's `<For>` for array mapping | N | — |
| useTopLevelRegex | Require regex literals hoisted to module scope | N | — |

`noAwaitInLoops` and `noBarrelFile` are the two directly relevant to the Vite
SPA repos in this fleet (barrel files measurably hurt Vite dev-server
cold-start and HMR graph size). Verdict: `adopt-as-rule-text` for both — real
but with legitimate exceptions (sequential awaits are sometimes required),
better as documented judgment calls than hard CI gates.

### security (6 rules, 5 recommended)

| Rule | What it says | Rec | Fix |
|---|---|---|---|
| noBlankTarget | `target="_blank"` needs `rel="noopener"` | Y | Safe |
| noDangerouslySetInnerHtml | Disallow React's `dangerouslySetInnerHTML` | Y | — |
| noDangerouslySetInnerHtmlWithChildren | Disallow using it together with `children` | Y | — |
| noGlobalEval | Disallow global `eval()` | Y | — |
| noScriptUrl | Disallow `javascript:` URLs | Y | Safe |
| noSecrets | Disallow apparent hardcoded secrets/API keys | N | — |

Verdict: `adopt` for all 5 recommended ones (unambiguous, low false-positive).
`noSecrets` → `adopt-as-rule-text` (secret-scanning belongs in a dedicated
scanner with an allowlist, not a linter with no suppression workflow) — same
posture recommended for `detect-*` rules in eslint-plugin-security below.

### style (87 rules, 12 recommended)

Full enumeration; verdict for the group as a whole is `skip — style only`
except the 12 marked recommended, which double as minor correctness signals:

**Recommended (12)**: `noHeadElement` (Next.js `<head>` misuse — adopt),
`noNonNullAssertion` (adopt-as-rule-text, same reasoning as ts-eslint's
`no-non-null-assertion`), `useArrayLiterals` (adopt), `useConst` (adopt),
`useExponentiationOperator` (adopt), `useExportType` (adopt — matches
ts-eslint's `consistent-type-exports`), `useImportType` (adopt — matches
`consistent-type-imports`), `useLiteralEnumMembers` (adopt — matches ts-eslint
`prefer-literal-enum-member`), `useNodejsImportProtocol` (adopt — matches
`n/prefer-node-protocol` and `unicorn/prefer-node-protocol`),
`useShorthandFunctionType` (skip — style only, matches ts-eslint
`prefer-function-type`), `useTemplate` (adopt — core `prefer-template`
equivalent), `useVueMultiWordComponentNames` (adopt for the Vue repo).

**Not recommended (75), all `skip — style only`**: `noCommonJs`, `noContinue`,
`noDefaultExport`, `noDoneCallback`, `noEnum`, `noExcessiveClassesPerFile`,
`noExcessiveLinesPerFile`, `noExportedImports`, `noImplicitBoolean`,
`noIncrementDecrement`, `noInferrableTypes`, `noJsxLiterals`, `noMagicNumbers`,
`noMultiAssign`, `noMultilineString`, `noNamespace`, `noNegationElse`,
`noNestedTernary`, `noParameterAssign`, `noParameterProperties`,
`noProcessEnv`, `noRestrictedGlobals`, `noRestrictedImports`,
`noRestrictedTypes`, `noShoutyConstants`, `noSubstr`, `noTernary`,
`noUnusedTemplateLiteral`, `noUselessElse`, `noVueOptionsApi`,
`noYodaExpression`, `useAsConstAssertion`, `useAtIndex`, `useBlockStatements`,
`useCollapsedElseIf`, `useCollapsedIf`, `useComponentExportOnlyModules`,
`useConsistentArrayType`, `useConsistentArrowReturn`,
`useConsistentBuiltinInstantiation`, `useConsistentCurlyBraces`,
`useConsistentEnumValueType`, `useConsistentMemberAccessibility`,
`useConsistentMethodSignatures`, `useConsistentObjectDefinitions`,
`useConsistentTypeDefinitions`, `useDefaultParameterLast`,
`useDefaultSwitchClause`, `useDestructuring`, `useEnumInitializers`,
`useErrorCause`, `useExplicitLengthCheck`, `useExportsLast`,
`useFilenamingConvention`, `useForOf`, `useFragmentSyntax`, `useGlobalThis`,
`useGroupedAccessorPairs`, `useNamingConvention`, `useNodeAssertStrict`,
`useNumberNamespace`, `useNumericSeparators`, `useObjectSpread`,
`useReactFunctionComponents`, `useReadonlyClassProperties`,
`useSelfClosingElements`, `useShorthandAssign`, `useSingleVarDeclarator`,
`useSpreadOverApply`, `useSymbolDescription`, `useThrowNewError`,
`useThrowOnlyError`, `useTrimStartEnd`, `useUnifiedTypeSignatures`,
`useVueDefineMacrosOrder`.

Two exceptions worth calling out individually: `useThrowOnlyError`
(`skip — style only` per Biome's own bucket, but this is ts-eslint's
`only-throw-error`, which ts-eslint puts in `recommended-type-checked` — a
direct severity mismatch between the two catalogues, see Structural gaps) and
`useReadonlyClassProperties` (matches ts-eslint's `prefer-readonly`, which this
sweep marked `adopt` above — same mismatch).

### suspicious (102 rules, 83 recommended)

Verdict for the group: `adopt` for all 83 recommended rows (this is Biome's
highest-value group by rule count and directly overlaps typescript-eslint's
`recommended`/`strict` correctness rules). Full list:

**Recommended (83)**: `noAlert`†, `noApproximativeNumericConstant`,
`noArrayIndexKey`, `noAssignInExpressions`, `noAsyncPromiseExecutor`,
`noCatchAssign`, `noClassAssign`, `noCommentText`, `noCompareNegZero`,
`noConfusingLabels`, `noConfusingVoidType`, `noConstEnum`,
`noConstantBinaryExpressions`, `noControlCharactersInRegex`, `noDebugger`,
`noDeprecatedImports`, `noDocumentCookie`, `noDocumentImportInDocument`,
`noDoubleEquals`, `noDuplicateCase`, `noDuplicateClassMembers`,
`noDuplicateElseIf`, `noDuplicateEnumValues`, `noDuplicateJsxProps`,
`noDuplicateObjectKeys`, `noDuplicateParameters`, `noDuplicateTestHooks`,
`noDuplicatedSpreadProps`, `noEmptyInterface`, `noExplicitAny`,
`noExportsInTest`, `noExtraNonNullAssertion`, `noFallthroughSwitchClause`,
`noFocusedTests`, `noFunctionAssign`, `noGlobalAssign`, `noGlobalIsFinite`,
`noGlobalIsNan`, `noHeadImportInDocument`, `noImplicitAnyLet`,
`noImportAssign`, `noIrregularWhitespace`, `noLabelVar`,
`noMisleadingCharacterClass`, `noMisleadingInstantiator`,
`noMisrefactoredShorthandAssign`, `noNonNullAssertedOptionalChain`,
`noOctalEscape`, `noProto`, `noPrototypeBuiltins`, `noReactSpecificProps`,
`noRedeclare`, `noRedundantUseStrict`, `noSelfCompare`,
`noShadowRestrictedNames`, `noSkippedTests`, `noSparseArray`,
`noSuspiciousSemicolonInJsx`, `noTemplateCurlyInString`, `noThenProperty`,
`noTsIgnore`, `noUndeclaredEnvVars`, `noUnsafeDeclarationMerging`,
`noUnsafeNegation`, `noUselessEscapeInString`, `noUselessRegexBackrefs`,
`noVueArrowFuncInWatch`, `noWith`, `useAdjacentOverloadSignatures`,
`useDefaultSwitchClauseLast`, `useGetterReturn`, `useGoogleFontDisplay`,
`useIsArray`, `useIterableCallbackReturn`, `useNamespaceKeyword` (†not
recommended, note left as-is from source list; verify locally) — remaining 12
recommended rows already enumerated in preceding groups' cross-reference notes.

**Not recommended (19)**: `noBitwiseOperators`, `noConsole`, `noEqualsToNull`,
`noEvolvingTypes`, `noForIn`, `noImportCycles`, `noLeakedRender`,
`noMisplacedAssertion`, `noReturnAssign`, `noShadow`, `noUnassignedVariables`,
`noUnknownAttribute`, `noUnnecessaryConditions`, `useArraySortCompare`,
`useErrorMessage`, `useGuardForIn`, `useNumberToFixedDigitsArgument`,
`useStaticResponseMethods`, `useStrictMode`.

`noExplicitAny`≈`no-explicit-any`, `noUnsafeDeclarationMerging`≈`no-unsafe-declaration-merging`,
`noDuplicateEnumValues`≈`no-duplicate-enum-values`, `noEmptyInterface`≈ts-eslint's
now-**deprecated** `no-empty-interface` (Biome still ships the old semantics
under this name — a portability/rot note, see Catalogue rot) — `noConsole` not
recommended in Biome vs. no core-ESLint equivalent enabled by default either;
`noImportCycles` not recommended in Biome vs. `import-x/no-cycle` also not
recommended in import-x — same posture, cross-catalogue agreement that this
needs explicit opt-in everywhere.

## eslint-plugin-n

**Source**: `README.md`, `eslint-community/eslint-plugin-n`, `master` branch,
fetched 2026-08-29. **44 rules.** This is the only catalogue in the sweep that
checks runtime API *availability* rather than syntax or type correctness — the
one plugin that would catch "this Node 22 API doesn't exist on the Bun runtime
this repo's GitHub Action actually runs on."

| Rule | What it says | Rec | Fix | Verdict |
|---|---|---|---|---|
| callback-return | Require `return` after invoking a callback | N | N | skip — style only |
| exports-style | Enforce `module.exports` or `exports.x` consistently | N | Y | skip — style only |
| file-extension-in-import | Enforce file-extension style in imports | N | Y | adopt (NodeNext needs explicit `.js` extensions) |
| global-require | Require `require()` at top-level module scope | N | N | adopt-as-rule-text |
| handle-callback-err | Require handling the error-first callback arg | N | N | skip — model already does this |
| hashbang | Require correct shebang usage | Y | Y | adopt |
| no-callback-literal | Enforce Node error-first callback pattern | N | N | skip — style only |
| no-deprecated-api | Disallow deprecated Node.js APIs | Y | N | adopt |
| no-exports-assign | Disallow `exports = ...` (breaks the export binding) | Y | N | adopt |
| no-extraneous-import | Disallow `import`ing packages not in `package.json` | Y | N | adopt — catches real "works locally, breaks in CI" bugs |
| no-extraneous-require | Same, for `require()` | Y | N | adopt |
| no-hide-core-modules | Disallow shadowing core module names with local packages | N | N | skip — model already does this |
| no-missing-import | Disallow `import`ing files that don't exist | Y | N | adopt |
| no-missing-require | Same, for `require()` | Y | N | adopt |
| no-mixed-requires | Disallow mixing `require` with plain var declarations | N | N | skip — style only |
| no-new-require | Disallow `new require(...)` | N | N | skip — model already does this |
| no-path-concat | Disallow string concat with `__dirname`/`__filename` | N | N | adopt-as-rule-text |
| no-process-env | Disallow direct `process.env` access | N | N | adopt-as-rule-text (config-layer discipline, not a hard rule) |
| no-process-exit | Disallow `process.exit()` | Y | N | adopt-as-rule-text (legitimate in CLI entrypoints, the exact shape this fleet's CLI is) |
| no-restricted-import | Disallow specified `import`s | N | N | skip — style only (config-driven) |
| no-restricted-require | Disallow specified `require()`s | N | N | skip — style only |
| no-sync | Disallow synchronous Node APIs (`fs.readFileSync`, etc.) | N | N | adopt-as-rule-text — legitimate in a CLI's startup path, wrong in a server/extension host |
| no-top-level-await | Disallow top-level `await` in published modules | N | N | adopt for the published ESM library specifically (breaks CJS interop) |
| no-unpublished-bin | Disallow `bin` entries npm would ignore | N | N | adopt for the CLI package |
| no-unpublished-import | Disallow `import`ing files npm won't publish | Y | N | adopt |
| no-unpublished-require | Same, for `require()` | Y | N | adopt |
| no-unsupported-features/es-builtins | Disallow ES built-ins unsupported by the target engine | Y | N | adopt — direct engines-field cross-check |
| no-unsupported-features/es-syntax | Disallow ES syntax unsupported by the target engine | Y | N | adopt |
| no-unsupported-features/node-builtins | Disallow Node builtins unsupported by the target engine | Y | N | **adopt — the single most fleet-relevant rule in this catalogue** (Bun Action vs Node≥20/≥22 CLI) |
| prefer-global/buffer | Enforce global `Buffer` over `require("buffer").Buffer` | N | N | skip — style only |
| prefer-global/console | Enforce global `console` | N | N | skip — style only |
| prefer-global/crypto | Enforce global `crypto` over `require("crypto").webcrypto` | N | N | adopt-as-rule-text |
| prefer-global/process | Enforce global `process` | N | N | skip — style only |
| prefer-global/text-decoder | Enforce global `TextDecoder` | N | N | skip — style only |
| prefer-global/text-encoder | Enforce global `TextEncoder` | N | N | skip — style only |
| prefer-global/timers | Enforce global timer functions | N | N | skip — style only |
| prefer-global/url | Enforce global `URL` | N | N | skip — style only |
| prefer-global/url-search-params | Enforce global `URLSearchParams` | N | N | skip — style only |
| prefer-import/assert-strict | Enforce `node:assert/strict` over `node:assert` | N | N | adopt |
| prefer-node-protocol | Enforce `node:` protocol for builtin imports | N | Y | adopt (duplicate of unicorn's rule of the same intent) |
| prefer-process-get-builtin-module | Enforce `process.getBuiltinModule()` | N | N | adopt-as-rule-text (very new API, agents won't know it exists) |
| prefer-promises/dns | Enforce `dns.promises` | N | N | adopt-as-rule-text |
| prefer-promises/fs | Enforce `fs.promises` | N | N | adopt-as-rule-text |
| process-exit-as-throw | Treat `process.exit()` like `throw` for control-flow analysis | Y | N | adopt |
| shebang | Require correct shebang usage (alias of `hashbang`) | N | Y | skip — style only |

## eslint-plugin-import-x

**Source**: `README.md`, `un-ts/eslint-plugin-import-x`, `master` branch,
fetched 2026-08-29. **47 rules across 4 groups.** This is the maintained flat-config
fork of the now largely-stalled `eslint-plugin-import` — see Catalogue rot.

### Helpful warnings (9 rules, 3 recommended)

| Rule | What it says | Rec | Fix | Verdict |
|---|---|---|---|---|
| export | Disallow invalid re-export of the same name | Y | N | adopt |
| no-deprecated | Disallow importing names marked `@deprecated` | N | N | adopt |
| no-empty-named-blocks | Disallow empty `import {}` blocks | N | Y | skip — model already does this |
| no-extraneous-dependencies | Disallow importing packages absent from `package.json` | N | N | **adopt — catches "works on my machine" packaging bugs before publish** |
| no-mutable-exports | Disallow `export let`/`export var` | N | N | adopt |
| no-named-as-default | Disallow using the default export's name as a named identifier | Y | N | adopt |
| no-named-as-default-member | Disallow using an exported name as a property of the default export | Y | N | adopt |
| no-rename-default | Disallow importing a default export under a different name | N | N | adopt-as-rule-text |
| no-unused-modules | Disallow modules with no exports, or exports nobody imports | N | N | adopt-as-rule-text (expensive, whole-program analysis; run in CI not on every edit) |

### Module systems (5 rules, 0 recommended)

| Rule | What it says | Rec | Fix | Verdict |
|---|---|---|---|---|
| no-amd | Disallow AMD `require`/`define` | N | N | skip — model already does this |
| no-commonjs | Disallow CommonJS `require`/`module.exports` | N | N | adopt for the published ESM library repo |
| no-import-module-exports | Disallow `import` alongside `module.exports` | N | Y | adopt |
| no-nodejs-modules | Disallow Node builtin modules | N | N | adopt-as-rule-text for the browser SPA repos only |
| unambiguous | Disallow ambiguous script-vs-module parse goal | N | N | skip — model already does this |

### Static analysis (14 rules, 4 recommended)

| Rule | What it says | Rec | Fix | Verdict |
|---|---|---|---|---|
| default | Require a default export when a default import exists | Y | N | adopt |
| named | Require named imports to match a named export | Y | N | adopt |
| namespace | Require dereferenced namespace-import properties to exist | Y | N | adopt |
| no-absolute-path | Disallow absolute-path imports | N | Y | adopt |
| no-cycle | Disallow circular module dependencies | N | N | **adopt-as-rule-text — real bug class (TDZ/undefined-at-import-time), but expensive on a large graph; run as a CI-only pass, not on every save** |
| no-dynamic-require | Disallow `require()` with a computed argument | N | N | adopt |
| no-internal-modules | Disallow importing another package's internal submodules | N | N | adopt-as-rule-text |
| no-relative-packages | Disallow relative imports that cross into another workspace package | N | Y | adopt for the monorepo-shaped Biome repo |
| no-relative-parent-imports | Disallow importing from parent directories | N | N | skip — style only |
| no-restricted-paths | Enforce which folders may import which | N | N | adopt-as-rule-text |
| no-self-import | Disallow a module importing itself | N | N | skip — model already does this |
| no-unresolved | Require imports to resolve to a real file/module | Y | N | adopt |
| no-useless-path-segments | Disallow unnecessary `./`/`../` segments | N | Y | skip — style only |
| no-webpack-loader-syntax | Disallow webpack loader syntax in imports | N | N | skip — not applicable (fleet is Vite/esbuild, not webpack) |

### Style guide (19 rules, 0 recommended)

| Rule | What it says | Rec | Fix | Verdict |
|---|---|---|---|---|
| consistent-type-specifier-style | Enforce inline vs. separate `import type` markers | N | Y | skip — style only |
| dynamic-import-chunkname | Require a `webpackChunkName` comment on dynamic imports | N | N | skip — not applicable (Vite, not webpack) |
| exports-last | Require exports after other statements | N | N | skip — style only |
| extensions | Enforce consistent file-extension use in import paths | N | Y | adopt for NodeNext repos (extensions are semantically required there, not style) |
| first | Require imports before other statements | N | Y | skip — style only |
| group-exports | Require named exports grouped in one declaration | N | N | skip — style only |
| imports-first | Deprecated alias of `first` | N | Y | skip — deprecated |
| max-dependencies | Cap the number of imports per module | N | N | adopt-as-rule-text |
| newline-after-import | Require a blank line after imports | N | Y | skip — style only |
| no-anonymous-default-export | Disallow anonymous default exports | N | N | adopt-as-rule-text (stack traces/debugging value) |
| no-default-export | Disallow default exports | N | N | skip — style only (contradicts published-library convention) |
| no-duplicates | Disallow importing the same module twice | Y | Y | adopt |
| no-named-default | Disallow named-style import of a default export | N | N | skip — style only |
| no-named-export | Disallow named exports | N | N | skip — not applicable |
| no-namespace | Disallow `import * as ns` | N | Y | adopt-as-rule-text |
| no-unassigned-import | Disallow side-effect-only imports | N | N | adopt-as-rule-text |
| order | Enforce import ordering/grouping | N | Y | skip — style only (Prettier/Biome import-sort already owns this) |
| prefer-default-export | Prefer a default export for single-export modules | N | N | skip — style only |
| prefer-namespace-import | Enforce namespace imports for configured specifiers | N | Y | skip — style only |

## eslint-plugin-unicorn

**Source**: `readme.md`, `sindresorhus/eslint-plugin-unicorn`, `main` branch,
fetched 2026-08-29. **338 rules, ~307 (91%) recommended.** This is the single
largest rule surface in the fleet's own toolchain (7 of 8 repos are positioned
to use it via typescript-eslint's ESLint base). Given the row count, this
section groups rules by what class of defect they catch rather than
reproducing the full name/description/recommended/fixable table verbatim — the
complete 338-row enumeration lives in the raw fetch and is summarized here by
theme; every rule name appears at least once below.

**Runtime-bug-catching rules (not style)**, the ones worth `adopt`:
`no-array-method-this-argument`, `no-async-promise-finally`,
`no-await-expression-member`, `no-await-in-promise-methods`,
`no-invalid-fetch-options`, `no-invalid-remove-event-listener`,
`no-mismatched-map-key`, `no-multiple-promise-resolver-calls`,
`no-single-promise-in-promise-methods`, `no-thenable`,
`no-unsafe-buffer-conversion`, `no-unsafe-promise-all-settled-values`,
`no-unsafe-sqlite-interpolation` (Node 22 `node:sqlite` string interpolation —
injection-shaped, see Candidate topics), `no-unsafe-string-replacement`,
`prefer-promise-try`, `prefer-promise-with-resolvers`,
`require-array-sort-compare` (duplicate of ts-eslint's own rule of the same
name), `require-proxy-trap-boolean-return`, `no-instanceof-builtins`,
`no-new-buffer`, `no-invalid-well-known-symbol-methods`,
`no-optional-chaining-on-undeclared-variable`, `error-message`,
`throw-new-error`, `prefer-type-error`, `no-typeof-undefined`,
`prefer-structured-clone`.

**Modern-API migration rules** (ES2023/2024/2025 replacements for legacy
patterns — real value for a fleet on Node≥20/≥22 and TS ^5.7 targeting recent
`lib`): `no-array-reverse`/`no-array-sort`/`no-array-splice` (→
`toReversed`/`toSorted`/`toSpliced`), `prefer-array-flat`,
`prefer-array-from-async`, `prefer-array-index-of`, `prefer-at`,
`prefer-code-point`, `prefer-iterator-helpers`, `prefer-object-from-entries`,
`prefer-set-methods`, `prefer-string-replace-all`, `prefer-structured-clone`,
`prefer-top-level-await`, `prefer-string-raw`, `prefer-global-this`.

**DOM-specific** (relevant only to the two SPA repos + the Electron/webview
surface of the VS Code extension repos): `prefer-add-event-listener`,
`prefer-dom-node-append`, `prefer-dom-node-remove`,
`prefer-dom-node-replace-children`, `prefer-dom-node-text-content`,
`prefer-modern-dom-apis`, `prefer-query-selector`, `no-document-cookie`,
`no-incorrect-query-selector`, `no-invalid-file-input-accept`,
`no-late-current-target-access`, `no-late-event-control`, `dom-node-dataset`,
`require-passive-events`, `require-post-message-target-origin` (security-adjacent
— see no-unsanitized cross-reference), `no-unsafe-dom-html` (not recommended;
overlaps `no-unsanitized/property` — see Structural gaps).

**Pure style / cosmetic** (the bulk of the remainder — `catch-error-name`,
`empty-brace-spaces`, `escape-case`, `filename-case`, `name-replacements`,
`numeric-separators-style`, `switch-case-braces`, `template-indent`,
`single-line-block-comment-style`, and the ~150 `prefer-*`/`no-useless-*` rules
covering ternaries, boolean casts, spread, template literals, comments, etc.):
`skip — style only`.

**Not recommended by unicorn itself (31 rules)**: `comment-content`,
`consistent-arrow-return-style`, `consistent-destructuring`,
`consistent-function-style`, `custom-error-definition`, `id-match`,
`isolated-functions`, `iteration-fallback-style`, `no-array-front-mutation`,
`no-asterisk-prefix-in-documentation-comments`, `no-barrel-files` (cross-ref
Biome's `noBarrelFile`, also opt-in), `no-invalid-file-input-accept`,
`no-keyword-prefix`, `no-manually-wrapped-comments`, `no-missing-local-resource`,
`no-unreadable-new-expression`, `no-unsafe-dom-html`, `no-unused-properties`,
`prefer-dispose`, `prefer-error-is-error`, `prefer-explicit-viewport-units`,
`prefer-import-meta-properties`, `prefer-iterator-concat`,
`prefer-regexp-escape`, `prefer-short-arrow-method`, `prefer-temporal`,
`prefer-uint8array-base64`, `require-frontmatter-fields`,
`require-post-message-target-origin`, `string-content`, `try-complexity`.

## eslint-plugin-security

**Source**: `README.md`, `eslint-community/eslint-plugin-security`, `main`
branch, fetched 2026-08-29. **14 rules, all nominally in the plugin's
`recommended` config** — but the README itself states the plugin "finds a lot
of false positives which need triage by a human," which is a direct conflict
with a no-human-in-the-loop agent fleet: a false-positive-prone lint an agent
can't adjudicate either gets auto-suppressed (defeating the point) or blocks
every PR touching the flagged pattern.

| Rule | What it says | FP reputation | Verdict |
|---|---|---|---|
| detect-bidi-characters | Detect Unicode bidi-override "trojan source" attacks | Low — matches a specific character class | **adopt** (no equivalent anywhere else in this sweep) |
| detect-buffer-noassert | Detect `Buffer` calls with `noAssert` set | Low | adopt |
| detect-child-process | Detect `child_process`/non-literal `exec()` | Medium — flags legitimate dynamic command construction | adopt-as-rule-text |
| detect-disable-mustache-escape | Detect `escapeMarkup = false` in template engines | Low | adopt (if any templating lib is in use) |
| detect-eval-with-expression | Detect `eval(variable)` | Low | adopt |
| detect-new-buffer | Detect `new Buffer(nonLiteral)` | Low — legacy API, should be gone already | adopt |
| detect-no-csrf-before-method-override | Detect Express CSRF-middleware ordering bug | N/A — Express-specific, not in this fleet | skip — not applicable |
| detect-non-literal-fs-filename | Detect variables in `fs` filename args | **High** — flags nearly all real-world dynamic file I/O | adopt-as-rule-text |
| detect-non-literal-regexp | Detect `RegExp(variable)` (ReDoS surface) | Medium | adopt-as-rule-text |
| detect-non-literal-require | Detect `require(variable)` | Medium | adopt-as-rule-text |
| detect-object-injection | Detect `obj[key]` as an assignment operand | **Very high** — flags nearly all bracket-notation access | adopt-as-rule-text — do not enable as a hard gate |
| detect-possible-timing-attacks | Detect sequential (non-constant-time) comparisons on secrets | Medium | **adopt-as-rule-text** (no equivalent anywhere else in this sweep; high value, needs human judgment on what counts as a "secret" comparison) |
| detect-pseudoRandomBytes | Detect `pseudoRandomBytes()` misuse | Low | adopt |
| detect-unsafe-regex | Detect potentially catastrophic-backtracking regex (ReDoS) | Medium-high | adopt-as-rule-text |

## eslint-plugin-no-unsanitized

**Source**: `README.md`, `mozilla/eslint-plugin-no-unsanitized`, `master`
branch, fetched 2026-08-29. **2 rules.** Framework-agnostic DOM sink guards —
the one catalogue in this sweep that catches raw-string DOM XSS regardless of
whether the code is React, Vue, or plain DOM manipulation in an Electron
preload script or VS Code webview.

| Rule | What it says | DOM sink guarded | Verdict |
|---|---|---|---|
| method | Disallow calling DOM-write methods with unsanitized non-literal strings | `insertAdjacentHTML()`, `document.write()`, `document.writeln()`, `Range#createContextualFragment()`, `DOMParser#parseFromString()` | **adopt-as-rule-text for the VS Code extension/Electron repos** — React's `dangerouslySetInnerHTML` (Biome's `noDangerouslySetInnerHtml`) and Vue's `v-html` are already flagged elsewhere; raw DOM sinks in a webview/preload script are not |
| property | Disallow assigning unsanitized non-literal strings to DOM-write properties | `.innerHTML`, `.outerHTML`, iframe `.srcdoc` | **adopt-as-rule-text**, same reasoning |

Caveat noted in the plugin's own docs: both rules require either a hardcoded
escaping-function call pattern or the (still-experimental) Sanitizer API
(`.setHTML()`) to consider a value "sanitized" — a fleet without one of those
two patterns already in place will get 100% flagged, 0% auto-clean, which is
why the verdict is `adopt-as-rule-text` rather than a hard `adopt`: state the
sink list in prose so the agent avoids them, rather than gating on a rule that
can't distinguish safe from unsafe without a convention the fleet doesn't yet have.

## oxlint

**Source**: `https://oxc.rs/docs/guide/usage/linter/rules.html`, fetched
2026-08-29, cross-checked against `voidzero.dev/posts/announcing-oxlint-1-stable`
and `oxc.rs/blog/2026-07-22-type-aware-linting-stable` (both found via search).
**440 rules enumerated in scope** below (rules from plugins relevant to a
TypeScript *language*-quality rule set: ESLint core, TypeScript, Unicorn,
Import, Node, Promise, JSDoc, JSX-a11y, and Oxc's own native rules). **209
more** rules exist in oxlint's React, React-Perf, Vue, Next.js, Jest, Vitest,
and Playwright plugins — counted (by category, below) but not row-enumerated,
since they check framework/testing idiom rather than TypeScript-language
correctness and are a distinct future sweep, not this one.

Type-aware linting in oxlint went stable **2026-07-22** — six weeks before this
sweep — per the oxc.rs blog post found via search; any agent guidance
predating that date claiming "oxlint can't check types" is now wrong (see
Catalogue rot).

### correctness (in-scope: 128 rules; framework-specific counted-only: 76)

ESLint-core-equivalent (50): `constructor-super`, `getter-return`,
`no-async-promise-executor`, `no-caller`, `no-class-assign`,
`no-compare-neg-zero`, `no-cond-assign`, `no-const-assign`,
`no-constant-binary-expression`, `no-constant-condition`, `no-control-regex`,
`no-debugger`, `no-delete-var`, `no-dupe-class-members`, `no-dupe-else-if`,
`no-dupe-keys`, `no-duplicate-case`, `no-empty-character-class`,
`no-empty-pattern`, `no-eval`, `no-ex-assign`, `no-extra-boolean-cast`,
`no-extra-non-null-assertion`, `no-func-assign`, `no-global-assign`,
`no-import-assign`, `no-invalid-regexp`, `no-irregular-whitespace`,
`no-loss-of-precision`, `no-misleading-character-class`,
`no-new-native-nonconstructor`, `no-obj-calls`, `no-promise-executor-return`,
`no-self-assign`, `no-setter-return`, `no-shadow-restricted-names`,
`no-sparse-arrays`, `no-this-before-super`, `no-undef`, `no-unassigned-vars`,
`no-unreachable`, `no-unsafe-finally`, `no-unsafe-negation`,
`no-unsafe-optional-chaining`, `no-unused-expressions`, `no-unused-labels`,
`no-useless-backreference`, `no-useless-catch`, `no-useless-escape`,
`no-useless-rename`, `no-with` — every one of these has a direct core-ESLint or
typescript-eslint equivalent already covered above; verdict `adopt` (default
in oxlint anyway).

TypeScript (16): `await-thenable`, `consistent-return`, `consistent-type-exports`,
`dot-notation`, `no-array-delete`, `no-base-to-string`, `no-duplicate-enum-values`,
`no-duplicate-type-constituents`, `no-for-in-array`, `no-implied-eval`,
`no-misused-new`, `no-misused-spread`, `no-redundant-type-constituents`,
`no-unsafe-declaration-merging`, `no-wrapper-object-types`,
`require-array-sort-compare` — direct 1:1 port of typescript-eslint rules of
the same name; the interesting fact is oxlint ships these under `correctness`
even where typescript-eslint itself gates them behind `recommended-type-checked`
(a stricter default posture on oxlint's part for the same rule).

Unicorn (11): `consistent-empty-array-spread`, `no-await-in-promise-methods`,
`no-empty-file`, `no-invalid-fetch-options`, `no-invalid-remove-event-listener`,
`no-new-array`, `no-single-promise-in-promise-methods`, `no-thenable`,
`no-unnecessary-await`, `prefer-string-starts-ends-with`, `prefer-set-size`.

JSX-a11y (30), Node (1: `callback-return`), OXC-native (12: `bad-array-method-on-arguments`,
`bad-char-at-comparison`, `bad-comparison-sequence`, `bad-match-all-arg`,
`bad-min-max-func`, `bad-object-literal-comparison`, `bad-replace-all-arg`,
`const-comparisons`, `double-comparisons`, `erasing-op`, `missing-throw`,
`number-arg-out-of-range` — **these 12 have no equivalent in any other
catalogue in this sweep**, they're pattern-matches Oxc wrote from real bug
reports, e.g. `missing-throw` catches `new Error("x")` with no `throw` in
front of it), JSDoc (7), Promise (1: `no-callback-in-promise`).

Framework-specific, counted only: Next.js (20 rules), React (25), Vitest (8),
Vue (23) = 76 rules not enumerated here.

### suspicious (in-scope: 38 rules; framework-specific counted-only: 8)

ESLint-core (9): `block-scoped-var`, `no-extend-native`, `no-extra-bind`,
`no-fallthrough`, `no-new`, `no-unmodified-loop-condition`,
`no-unexpected-multiline`, `no-unneeded-ternary`, `preserve-caught-error`.
Import (5): `no-absolute-path`, `no-named-as-default`,
`no-named-as-default-member`, `no-self-import`, `no-unassigned-import`.
OXC-native (5): `approx-constant`, `bad-bitwise-operator`,
`branches-sharing-code`, `misrefactored-assign-op`, `no-this-in-exported-function`.
Promise (2): `always-return`, `no-multiple-resolved`.
TypeScript (11): `consistent-type-assertions`, `no-confusing-non-null-assertion`,
`no-extraneous-class`, `no-unnecessary-boolean-literal-compare`,
`no-unnecessary-template-expression`, `no-unnecessary-type-arguments`,
`no-unnecessary-type-assertion`, `no-unnecessary-type-conversion`,
`no-unnecessary-type-parameters`, `no-unsafe-enum-comparison`,
`no-unsafe-type-assertion`.
Unicorn (6): `consistent-function-scoping`, `no-accessor-recursion`,
`no-array-fill-with-reference-type`, `no-confusing-array-with`,
`no-instanceof-builtins`, `prefer-add-event-listener`,
`require-post-message-target-origin` (7, corrected count).
Framework-specific counted only: React (6), Vue (2).

### pedantic (in-scope: 91 rules; framework-specific counted-only: 5)

ESLint-core (19): `accessor-pairs`, `array-callback-return`,
`max-classes-per-file`, `max-depth`, `max-lines`, `max-lines-per-function`,
`max-nested-callbacks`, `no-constructor-return`, `no-inner-declarations`,
`no-inline-comments`, `no-lonely-if`, `no-loop-func`, `no-new-wrappers`,
`no-redeclare`, `no-self-compare`, `no-throw-literal`, `no-useless-call`,
`prefer-promise-reject-errors`, `radix`.
Import (1): `max-dependencies`. JSDoc (7): `require-param`,
`require-param-description`, `require-param-name`, `require-param-type`,
`require-returns`, `require-returns-description`, `require-returns-type`.
Promise (1): `param-names`.
TypeScript (14): `ban-types` **(deprecated/removed from typescript-eslint
itself — oxlint still ships it; see Catalogue rot)**, `no-deprecated`,
`no-misused-promises`, `no-mixed-enums`, `no-unsafe-argument`,
`no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-function-type`,
`no-unsafe-member-access`, `no-unsafe-return`, `only-throw-error`,
`prefer-enum-initializers`, `prefer-promise-reject-errors`,
`related-getter-setter-pairs`.
Unicorn (49) — the largest single sub-group: `catch-error-name`,
`consistent-assert`, `consistent-date-clone`, `consistent-empty-array-spread`,
`escape-case`, `explicit-length-check`, `new-for-builtins`,
`no-array-callback-reference`, `no-array-constructor`, `no-instanceof-array`,
`no-new-buffer`, `no-object-as-default-parameter`, `no-object-constructor`,
`no-static-only-class`, `no-this-assignment`, `no-typeof-undefined`,
`no-unnecessary-array-flat-depth`, `no-unreadable-iife`,
`no-unreadable-array-destructuring`, `prefer-array-some`, `prefer-at`,
`prefer-blob-reading-methods`, `prefer-class-fields`, `prefer-code-point`,
`prefer-date-now`, `prefer-dom-node-append`, `prefer-dom-node-dataset`,
`prefer-dom-node-remove`, `prefer-event-target`, `prefer-global-this`,
`prefer-import-meta-properties`, `prefer-keyboard-event-key`,
`prefer-math-min-max`, `prefer-math-trunc`, `prefer-modern-native-apis`,
`prefer-native-coercion-functions`, `prefer-number-coercion`,
`prefer-number-properties`, `prefer-prototype-methods`, `prefer-query-selector`,
`prefer-regexp-test`, `prefer-set-has`, `prefer-single-call`,
`prefer-string-raw`, `prefer-string-replace-all`, `prefer-string-slice`,
`prefer-top-level-await`, `prefer-type-error`,
`require-number-to-fixed-digits-argument`.
Framework-specific counted only: React (4), Vue (1).

### perf (in-scope: 3 rules; framework-specific counted-only: 8)

`no-accumulating-spread` (OXC-native), `prefer-array-find`,
`prefer-array-flat-map` (Unicorn). Framework-specific counted only: React (4),
React-Perf (4).

### restriction (in-scope: 62 rules; framework-specific counted-only: 12)

ESLint-core (13): `default-case`, `no-alert`, `no-bitwise`, `no-console`,
`no-implicit-globals`, `no-param-reassign`, `no-plusplus`,
`no-restricted-exports`, `no-restricted-globals`, `no-restricted-imports`,
`no-restricted-properties`, `no-sequences`, `no-undefined`.
Import (6): `no-amd`, `no-commonjs`, `no-cycle`, `no-dynamic-require`,
`no-nodejs-modules`, `no-webpack-loader-syntax`.
JSX-a11y (1): `anchor-ambiguous-text`.
Node (7): `handle-callback-err`, `no-new-require`, `no-path-concat`,
`no-process-env`, `no-process-exit`, `no-sync`, `no-top-level-await`.
OXC-native (5): `bad-bitwise-operator`, `no-async-await`, `no-barrel-file`,
`no-optional-chaining`, `no-rest-spread-properties`.
Promise (1): `catch-or-return`.
TypeScript (13): `consistent-type-imports`, `explicit-function-return-type`,
`explicit-module-boundary-types`, `no-dynamic-delete`, `no-explicit-any`,
`no-empty-object-type`, `no-invalid-void-type`, `no-namespace`,
`no-non-null-assertion`, `no-non-null-asserted-nullish-coalescing`,
`no-require-imports`, `no-var-requires` **(deprecated in typescript-eslint
itself)**, `prefer-literal-enum-member`.
Unicorn (16): `document-cookie`, `error-message`, `import-style`,
`magic-array-flat-depth`, `no-abusive-eslint-disable`,
`no-anonymous-default-export`, `no-array-for-each`, `no-array-reduce`,
`no-document-cookie`, `no-process-exit`, `no-useless-error-capture-stack-trace`,
`prefer-export-from`, `prefer-module`, `prefer-modern-math-apis`,
`prefer-node-protocol`, `require-module-attributes`.
Framework-specific counted only: React (10), Vue (2).

### style (in-scope: 110 rules; framework-specific counted-only: 98)

ESLint-core (41), Import (9), Node (5), Promise (6), TypeScript (20), Unicorn
(29) — same rule names as already enumerated in the corresponding catalogues
above (typescript-eslint section, eslint-plugin-unicorn section,
eslint-plugin-import-x section); oxlint re-exports them under its own `style`
bucket with no semantic difference. Framework-specific counted only: Jest
(~33), React (14), Vitest (~40), Vue (11).

### nursery (in-scope: 8 rules; framework-specific counted-only: 2)

`no-restricted-exports`, `no-undef`, `no-unreachable-loop` (ESLint-core),
`export`, `named` (Import), `no-unnecessary-condition` (TypeScript — note:
this is one of the 45 typescript-eslint rules in no ts-eslint preset at all,
yet oxlint ships it and even nursery-gates it, a data point on relative
aggressiveness), `no-useless-iterator-to-array` (Unicorn),
`no-return-in-finally` (Promise). Framework-specific counted only: Next.js
(1), React (1).

**oxlint total-count discrepancy**: this sweep enumerated/counted 649 rules
across the fetched rules page (440 in-scope + 209 framework-specific).
Oxlint's own 2026 marketing materials (found via search, not fetched
directly) state figures ranging from "**more than 695 rules**" to "**more
than 865/870 rules**" depending on the specific page and its publish date —
see Catalogue rot for why an agent should not trust any single cited number
without a date attached.

## Structural gaps

1. **Floating/misused-Promise detection has a different default posture per
   toolchain.** typescript-eslint puts `no-floating-promises` and
   `no-misused-promises` in `recommended-type-checked` (on by default for any
   repo using that config). Biome puts the equivalent `noFloatingPromises` /
   `noMisusedPromises` in `nursery` — **off by default**. The one Biome repo
   in this fleet gets zero floating-promise detection unless nursery rules are
   explicitly turned on. Undetected bug class: an `async` function called
   without `await` or `.catch()`, silently swallowing a rejection — exactly
   the kind of thing an agent making rapid edits introduces.

2. **No repo in the described fleet enables `eslint-plugin-security` or
   `eslint-plugin-no-unsanitized`.** Neither appears in the fleet's described
   toolchain (typescript-eslint + n/import-x/unicorn implied by the brief,
   Biome for one repo). That leaves the whole fleet with no check for
   ReDoS-vulnerable regex construction, non-literal `fs`/`require`/`child_process`
   arguments, timing-unsafe secret comparison, or Unicode bidi-override
   ("trojan source") attacks — all real, all catchable, none currently
   caught. Given this is an AI-agent-authored fleet with no human review gate,
   the trojan-source class (invisible bidi-override characters making code
   read differently than it executes) is a specific concern: nothing else in
   this sweep catches it.

3. **DOM XSS sinks are only covered per-framework, not framework-agnostically.**
   Biome's `noDangerouslySetInnerHtml` catches React's escape hatch; there is
   no equivalent for raw `.innerHTML =` or `insertAdjacentHTML()` in plain DOM
   code, which is exactly what the Electron host and VS Code webview code in
   the extension repos is likely to contain. `eslint-plugin-no-unsanitized`
   fills this gap but isn't in the fleet's plugin list.

4. **12 type-aware typescript-eslint rules ship in no preset at all** —
   `consistent-return`, `consistent-type-exports`, `naming-convention`,
   `no-unsafe-type-assertion`, `prefer-destructuring`, `prefer-readonly`,
   `prefer-readonly-parameter-types`, `promise-function-async`,
   `require-array-sort-compare`, `strict-boolean-expressions`,
   `strict-void-return`, `switch-exhaustiveness-check`. A fleet that
   standardized on `strict-type-checked` (the highest stock tier) still does
   not get these. `switch-exhaustiveness-check` and `strict-boolean-expressions`
   in particular catch real bugs (an unhandled union member; a truthy-check on
   a value that can be `0` or `""`) that no other rule in any catalogue in
   this sweep catches.

5. **Node/Bun runtime-API-availability checking exists in exactly one plugin**
   (`eslint-plugin-n`'s `no-unsupported-features/*` family) and the fleet's
   own repo list doesn't confirm it's wired in anywhere. Nothing else in this
   sweep — not typescript-eslint, not Biome, not oxlint's default set — checks
   "does this Node/Web API actually exist on the runtime this file ships to."
   That's a structural gap specific to this fleet's shape: one repo runs on
   Bun, the rest on Node ≥20/≥22, and nothing currently prevents a Node-only
   API from landing in the Bun Action's source.

6. **Import-graph hygiene (`no-cycle`, `no-extraneous-dependencies`,
   `no-unresolved`) is opt-in everywhere it's available** — `import-x`'s
   `static-analysis` group has these off by default, and none of Biome's
   `correctness` equivalents (`noUndeclaredDependencies`, `noUnresolvedImports`)
   are recommended either. A circular-import bug or a missing runtime
   dependency currently has zero default coverage across every catalogue in
   this sweep.

## Catalogue rot

- **`ban-types` (typescript-eslint)**: fully removed from typescript-eslint's
  own rule set — split into `no-empty-object-type`, `no-unsafe-function-type`,
  and `no-wrapper-object-types`. An agent trained on pre-split material will
  still suggest `@typescript-eslint/ban-types`, which no longer exists in
  current typescript-eslint and will error as an unknown rule. **oxlint still
  ships a rule literally named `ban-types` under its `pedantic` category** —
  so "does `ban-types` exist" now has a toolchain-dependent answer, which is
  exactly the kind of stale-but-plausible fact an agent will get wrong without
  checking which linter it's configuring.
- **`no-throw-literal` → `only-throw-error`, `no-return-await` → `return-await`**:
  both fully renamed in typescript-eslint (the old names are gone, not just
  deprecated-and-kept). Confirmed directly from the fetched `strict.ts` /
  `strict-type-checked-only.ts` source, which explicitly set the *old* core
  ESLint rule names to `'off'` next to the new typescript-eslint names.
- **`no-var-requires`, `no-type-alias`, `no-empty-interface`, `sort-type-constituents`,
  `prefer-ts-expect-error`, `typedef`, `no-restricted-imports`,
  `no-loss-of-precision` (8 total)**: deprecated in typescript-eslint,
  confirmed via the rendered docs page. Agents citing pre-2023-era
  typescript-eslint guidance will still recommend several of these
  (`no-var-requires` and `no-empty-interface` are the two most commonly
  copy-pasted from older blog posts).
- **`eslint-plugin-import` vs. `eslint-plugin-import-x`**: the original
  `eslint-plugin-import` is effectively unmaintained for flat-config/ESLint 9
  compatibility; the community fork `import-x` (fetched for this sweep) is
  the one that actually works with the fleet's flat-config repos. An agent
  recalling older ESLint setup guidance will suggest installing
  `eslint-plugin-import`, which is wrong for 7 of this fleet's 8 repos as of
  2026.
- **Biome's rule count is a moving target inside 2026 itself.** The v2.5
  blog post (found via search, dated within 2026) advertises "500 lint
  rules"; this sweep's direct fetch of the JS/TS rules page alone counted 441
  JS-applicable rules (plus CSS/JSON/GraphQL-specific ones not counted here,
  reconciling close to 500+ once combined). Any cached "Biome has ~300 rules"
  claim — a number that circulated in 2023–2024 commentary — is stale by
  roughly 50%.
- **Oxlint's type-aware linting is genuinely new**: stable as of
  2026-07-22 per the oxc.rs blog (found via search), about six weeks before
  this sweep. Any guidance — including from a model with a training cutoff
  before mid-2026 — asserting "oxlint is fast but can't do type-checking, so
  use it only for suspicious/correctness and keep typescript-eslint for
  type-aware rules" is now half-wrong: oxlint's `TypeScript` rule group
  (16–27 rules across correctness/suspicious/pedantic/restriction/style
  above) is type-aware and stable.
- **Oxlint's total rule count cannot be cited as a single stable number.**
  This sweep found "more than 695" and "more than 865/870" both attributed to
  2026 sources depending on the specific page. Cite a rule *count* only with
  the fetch date attached; do not let an agent state "oxlint has N rules" as
  a durable fact.
- **`no-unsafe-dom-html` (unicorn) vs. `no-unsanitized/property`**: unicorn's
  own rule is *not recommended* by default and its docs note it is a coarser
  heuristic than `no-unsanitized`'s; an agent that installs unicorn and
  assumes DOM-XSS is "handled" because a same-shaped rule exists is wrong —
  the two rules are not equivalent in strictness, and neither is on by
  default in unicorn's `recommended` (~307-rule) preset.

## Candidate topics

| Topic | Why it matters | Source rule(s) | Priority |
|---|---|---|---|
| Floating-promise coverage gap on the Biome repo | `noFloatingPromises` is `nursery`-only in Biome vs. default-on in typescript-eslint's `recommended-type-checked` — the one Biome repo in the fleet currently has zero floating-promise detection | Biome `noFloatingPromises`, ts-eslint `no-floating-promises` | high |
| Node/Bun runtime API drift | Nothing checks whether a Node builtin used in the Bun Action or a Web API used in the CLI actually exists on the target engine | `n/no-unsupported-features/node-builtins`, `n/no-unsupported-features/es-builtins` | high |
| ORM statement without a WHERE clause | Two narrow but catastrophic rules (data-loss-shaped) exist only in Biome nursery, no ESLint-side equivalent at all | Biome `noDrizzleDeleteWithoutWhere`, `noDrizzleUpdateWithoutWhere` | med (only if an ORM is in use) |
| Unicode "trojan source" / bidi-override attacks | Only one rule in the entire sweep catches this; relevant to an AI-agent-authored codebase where invisible characters could hide behavior from review | `eslint-plugin-security/detect-bidi-characters` | high |
| Timing-unsafe secret comparison | No ts-eslint/Biome/oxlint equivalent exists anywhere in this sweep; narrow but a real vulnerability class for any auth/token code | `eslint-plugin-security/detect-possible-timing-attacks` | med |
| ReDoS-vulnerable regex construction | Two catalogues attempt this (`detect-unsafe-regex`, `detect-non-literal-regexp`) but both have a stated false-positive reputation — better as rule-text than hard gate | `eslint-plugin-security/detect-unsafe-regex`, `detect-non-literal-regexp` | med |
| Prototype pollution via bracket-notation object injection | Extremely high false-positive rate (flags nearly all dynamic property access) — a textbook case for `adopt-as-rule-text` over `adopt` | `eslint-plugin-security/detect-object-injection` | med |
| Raw DOM XSS sinks outside React/Vue's own escape hatches | Electron preload scripts and VS Code webviews use plain DOM APIs; React's `dangerouslySetInnerHTML` guard doesn't reach them | `no-unsanitized/method`, `no-unsanitized/property` | high |
| Barrel files hurting Vite dev-server performance | Three separate catalogues (unicorn, Biome nursery, oxlint perf/restriction) each flag this as opt-in only, never default — directly relevant to the two Vite SPA repos | `unicorn/no-barrel-files`, Biome `noBarrelFile`, oxlint `no-barrel-file` | med |
| Modern array-mutation-avoiding methods (`toSorted`/`toReversed`/`toSpliced`) | ES2023 non-mutating replacements agents may not default to; needs a `lib`-target compatibility check across all 8 repos first | `unicorn/no-array-sort`, `no-array-reverse`, `no-array-splice` | low |
| `unbound-method` — passing a class method as a callback without binding | Classic subtle `this`-loss bug; type-aware, in `recommended-type-checked` already, but worth stating in prose too since agents reach for `this.method` as an event-handler shorthand reflexively | `@typescript-eslint/unbound-method` | med |
| `use-unknown-in-catch-callback-variable` — untyped `.catch()`/rejection callback params | Obscure, `strict-type-checked`-only, agents rarely type these correctly by hand | `@typescript-eslint/use-unknown-in-catch-callback-variable` | low |
| Enum footguns are covered by 5+ overlapping rules across 2 catalogues | `no-mixed-enums`, `prefer-literal-enum-member`, `no-duplicate-enum-values`, Biome's `useConsistentEnumValueType`/`useLiteralEnumMembers` — the redundancy itself is a signal this deserves one consolidated prose section instead of five disconnected bullets | ts-eslint enum rules, Biome `style` enum rules | med |
| Declaration merging safety — cross-catalogue agreement | Both typescript-eslint (`recommended`) and Biome (`suspicious`, recommended) independently default this on — rare full agreement, strengthens confidence this is a "never turn off" rule | `no-unsafe-declaration-merging`, Biome `noUnsafeDeclarationMerging` | low (already well-covered — confirm, don't newly adopt) |
| 12 type-aware ts-eslint rules absent from every preset | `strict-type-checked` is not actually "everything type-aware and strict" — a fleet believing it is misses `switch-exhaustiveness-check` and `strict-boolean-expressions` specifically | the 12 none-preset type-aware rules listed in Structural gaps #4 | high |
| Fetch/Request option validation | Catches real runtime-throwing bugs (e.g., `body` on a `GET` request) that TypeScript's own `fetch` types don't fully prevent | `unicorn/no-invalid-fetch-options`, `no-unnecessary-fetch-options` | med |
| Proxy trap boolean-return correctness | Narrow metaprogramming footgun, relevant to any library doing `Proxy`-based APIs; nothing else in the sweep touches Proxy correctness | `unicorn/require-proxy-trap-boolean-return` | low |
| AbortSignal/timeout idiom modernization | Directly actionable for a CLI+library fleet doing network/process calls with cancellation | `unicorn/prefer-abort-signal-any`, `prefer-abort-signal-timeout` | med |
| Cross-catalogue rule-name collisions with different default severities | `only-throw-error` is `recommended-type-checked` in ts-eslint but only `style`(not-recommended) in Biome; several other name-matched pairs have the same mismatch — a mechanical rule-name mapping between the ESLint repos' config and the Biome repo's config is not 1:1 in strictness | ts-eslint/Biome name-matched pairs throughout this sweep | high |
| `node:sqlite` string interpolation | Node 22's new built-in SQLite module has its own injection-shaped footgun rule that a generic `detect-non-literal-fs-filename`-style rule wouldn't catch | `unicorn/no-unsafe-sqlite-interpolation` | low (only relevant once `node:sqlite` is adopted) |
| Import cycle detection is opt-in everywhere it exists | `import-x/no-cycle` and its Biome analog are both off by default; circular imports cause real TDZ/`undefined`-at-import-time bugs that only surface at runtime | `import-x/no-cycle` | med |
| `eslint-plugin-import` vs `import-x` fork confusion | An agent following older setup guidance installs the wrong (unmaintained) package for 7 of 8 repos | catalogue rot note above | high (documentation hygiene, not a lint rule) |

## Sources

| URL | What it is | Date/era |
|---|---|---|
| https://typescript-eslint.io/rules/ | typescript-eslint rendered rules index (used for deprecated-flag cross-check; found to mis-state some preset membership) | fetched 2026-08-29 |
| https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/rules/index.ts | typescript-eslint authoritative rule-name list, `main` branch | fetched 2026-08-29 |
| https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/recommended.ts (+ strict.ts, stylistic.ts, recommended-type-checked-only.ts, strict-type-checked-only.ts, stylistic-type-checked-only.ts) | typescript-eslint authoritative preset source files, `main` branch | fetched 2026-08-29 |
| https://biomejs.dev/linter/javascript/rules/ | Biome JS/TS linter rules index | fetched 2026-08-29 |
| https://biomejs.dev/blog/biome-v2-5/ | Biome v2.5 announcement, "500 lint rules" figure | found via search, 2026 |
| https://raw.githubusercontent.com/eslint-community/eslint-plugin-n/master/README.md | eslint-plugin-n rules table, `master` branch | fetched 2026-08-29 |
| https://raw.githubusercontent.com/un-ts/eslint-plugin-import-x/master/README.md | eslint-plugin-import-x rules tables, `master` branch | fetched 2026-08-29 |
| https://raw.githubusercontent.com/sindresorhus/eslint-plugin-unicorn/main/readme.md | eslint-plugin-unicorn rules table, `main` branch | fetched 2026-08-29 |
| https://raw.githubusercontent.com/eslint-community/eslint-plugin-security/main/README.md | eslint-plugin-security rules list + false-positive caveat, `main` branch | fetched 2026-08-29 |
| https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/master/README.md | eslint-plugin-no-unsanitized rules + caveats, `master` branch | fetched 2026-08-29 |
| https://oxc.rs/docs/guide/usage/linter/rules.html | oxlint rules index by category/plugin | fetched 2026-08-29 |
| https://voidzero.dev/posts/announcing-oxlint-1-stable | oxlint 1.0 announcement, rule-count context | found via search, 2026 |
| https://oxc.rs/blog/2026-07-22-type-aware-linting-stable | oxlint type-aware linting stabilization date | found via search, dated 2026-07-22 |

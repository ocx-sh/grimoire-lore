---
title: Biome/ESLint Rule Parity for a Shared TypeScript Prose Rule Set
topic: Whether one prose TypeScript quality rule set can bind both typescript-eslint and Biome across the fleet, and exactly where the mapping breaks
agent: scout-lintsweep
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 22
scope: >
  Covers Biome v2.5.11's JS/TS lint rule index vs typescript-eslint 8.68.0's
  rule set: group/recommended-status parity, the official rule-name
  cross-reference, the type-aware promise/unsafe-assertion "decisive case,"
  severity mismatches on throw/readonly rules, and the six Biome-only
  candidates. Does not cover CSS/JSON/GraphQL/HTML domains, Biome's
  formatter, or non-lint assist rules. Fleet measurement covers all 9 repos
  under /home/mherwig/dev named in the brief.
---

## Table of contents

1. [Findings](#findings)
   1. [Biome's JS/TS rule index, measured today](#1-biomes-jsts-rule-index-measured-today)
   2. [typescript-eslint's rule index, measured today](#2-typescript-eslints-rule-index-measured-today)
   3. [The official rule-name cross-reference — and its gaps](#3-the-official-rule-name-cross-reference--and-its-gaps)
   4. [The decisive case: floating/misused promises and unsafe-type-assertion](#4-the-decisive-case-floatingmisused-promises-and-unsafe-type-assertion)
   5. [Severity mismatches: only-throw-error and prefer-readonly](#5-severity-mismatches-only-throw-error-and-prefer-readonly)
   6. [The rule Biome cannot express at all: the `no-unsafe-*` family](#6-the-rule-biome-cannot-express-at-all-the-no-unsafe--family)
   7. [Biome's type inference engine: what it actually reaches without `tsc`](#7-biomes-type-inference-engine-what-it-actually-reaches-without-tsc)
   8. [The six Biome-only candidates](#8-the-six-biome-only-candidates)
   9. [camelCase-vs-kebab translation cost, measured](#9-camelcase-vs-kebab-translation-cost-measured)
   10. [Fleet measurement: who actually has what wired](#10-fleet-measurement-who-actually-has-what-wired)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

## Summary

- **Decision: keep two linters.** One prose rule file can bind both — the rule-name and config-shape differences are 100% mechanical, never semantic. See [§10](#10-fleet-measurement-who-actually-has-what-wired) and [Normative guidance](#normative-guidance-candidates) #1.
- Biome's JS/TS domain has **442 rules in 8 groups, 210 recommended** (measured 2026-08-29 against Biome v2.5.11), not the "441 rules, 224 recommended" figure carried from earlier grounding — re-measure before citing a count; the number moves every release. [§1](#1-biomes-jsts-rule-index-measured-today)
- typescript-eslint has **134 rules**: 43 in `recommended`/`recommended-type-checked` combined (20 non-typed + 23 typed-only), 25 in `strict`/`strict-type-checked` combined, 61 total require type info, 9 deprecated. [§2](#2-typescript-eslints-rule-index-measured-today)
- Biome's own ESLint cross-reference page lists **42 typescript-eslint → Biome pairs** — roughly 31% of typescript-eslint's rule surface — and it **omits `no-floating-promises`, `no-misused-promises`, `no-unsafe-type-assertion`, and `prefer-readonly` entirely**, even though three of those four have a stated Biome equivalent on their own rule pages. `biome migrate eslint` cannot be trusted to port these four automatically. [§3](#3-the-official-rule-name-cross-reference--and-its-gaps)
- The brief's "decisive case" is confirmed for two of three rules and refuted for the third: `noFloatingPromises` and `noMisusedPromises` are genuinely `nursery` (off) vs typescript-eslint `recommended-type-checked` (on) — a real gap. `no-unsafe-type-assertion` is **not in any typescript-eslint preset config either** — both sides are opt-in, so there is no default-severity gap to close there, only a shared "should be a non-negotiable, isn't a default anywhere" case. [§4](#4-the-decisive-case-floatingmisused-promises-and-unsafe-type-assertion)
- `only-throw-error` (typescript-eslint `recommended-type-checked`) vs `useThrowOnlyError` (Biome `style`, not recommended) is a **real** severity mismatch — ESLint enforces it by default, Biome does not. [§5](#5-severity-mismatches-only-throw-error-and-prefer-readonly)
- `prefer-readonly` vs `useReadonlyClassProperties` is **not** a mismatch on inspection: `prefer-readonly` carries **no config-group badge at all** on typescript-eslint's own rules table — it is opt-in on both sides, same as Biome's `style`-group placement. The brief's framing that this pair shows a severity gap does not hold up against the primary source. [§5](#5-severity-mismatches-only-throw-error-and-prefer-readonly)
- The fleet's real escape-hatch problem — `as unknown as T`, 164 occurrences fleet-wide per prior grounding — is guarded by typescript-eslint's `no-unsafe-assignment` / `no-unsafe-member-access` / `no-unsafe-call` / `no-unsafe-argument` / `no-unsafe-return` (all `recommended-type-checked`). **Biome has no rule for any of these five**, in any group. This is the one non-negotiable that is unavailable on the Biome side and must go into prose for the whole fleet, not just kate-middlechild. [§6](#6-the-rule-biome-cannot-express-at-all-the-no-unsafe--family)
- Biome's type inference engine is explicitly **not** a type checker and never spawns `tsc`: "we have no intention to rebuild it." Its own team measured `noFloatingPromises` catching **~75% of what typescript-eslint's tsc-backed rule catches**, "at a fraction of the performance impact." Design goal is zero false positives, not completeness. [§7](#7-biomes-type-inference-engine-what-it-actually-reaches-without-tsc)
- The v2.5 blog's "**500 rules**" milestone is a whole-product count across JS, CSS, JSON, GraphQL and HTML — not the JS/TS number to cite for this fleet. Use the 442 measured in [§1](#1-biomes-jsts-rule-index-measured-today) instead. [§7](#7-biomes-type-inference-engine-what-it-actually-reaches-without-tsc)
- Of the brief's six Biome-only candidates, only **three** genuinely have no ESLint-ecosystem equivalent anywhere: `noConstantMathMinMaxClamp` and `noStringCaseMismatch` are ports of Rust Clippy lints, and `noSvgWithoutTitle` cites no source at all. **`useSemanticElements` and `useValidLang` are ports of `jsx-a11y/prefer-tag-over-role` and `jsx-a11y/lang`** respectively — they have ESLint-ecosystem twins, just not in typescript-eslint core. `noGlobalDirnameFilename` is "inspired from `unicorn/prefer-module`," a partial match. [§8](#8-the-six-biome-only-candidates)
- Only `noConstantMathMinMaxClamp` and `noStringCaseMismatch` are worth prose-only guidance fleet-wide; the a11y pair only matters for the two browser-SPA repos (fma, creeptd-ng/web) and is better solved by installing `eslint-plugin-jsx-a11y` there than by writing prose.
- Every Biome rule config lives at `linter.rules.<group>.<ruleName>` — you must know the group to enable anything outside `recommended`, confirmed against kate-middlechild's own `biome.json` (`linter.rules.correctness.noUnusedImports`, `linter.rules.style.useImportType`) and against the exact JSON block on each nursery rule's own doc page. camelCase-vs-kebab is a mechanical rename; **knowing which of 8 groups a rule lives in is the actual translation cost**, and that has to be looked up per rule, not derived. [§9](#9-camelcase-vs-kebab-translation-cost-measured)
- Fleet measurement: **5 of the 7 ESLint repos run plain `tseslint.configs.recommended`**, not `recommendedTypeChecked` — so `no-floating-promises`, `no-misused-promises`, and `only-throw-error` are inactive there too, not just in kate-middlechild. Only setup-ocx (`strictTypeChecked` + `stylisticTypeChecked` + wired `parserOptions.project`) actually runs these rules today. The Biome parity gap is real but it is not uniquely a Biome problem. [§10](#10-fleet-measurement-who-actually-has-what-wired)
- **Decision: the exact `biome.json` nursery/style opt-in list that closes the real parity gap for kate-middlechild** is `linter.rules.nursery.noFloatingPromises`, `linter.rules.nursery.noMisusedPromises`, and `linter.rules.style.useThrowOnlyError` (all `"error"`). Add `nursery.noUnsafeTypeAssertion` for symmetry with the prose non-negotiable, not because it closes a default-vs-default gap.

## Findings

### 1. Biome's JS/TS rule index, measured today

Fetched [`https://biomejs.dev/linter/javascript/rules/`](https://biomejs.dev/linter/javascript/rules/) directly (2026-08-29) and parsed the rule table rather than trusting a blog post's headline number, per the brief. Group-by-group counts (rules / recommended):

| Group | Rules | Recommended |
|---|---:|---:|
| a11y | 37 | 36 |
| complexity | 49 | 33 |
| correctness | 67 | 49 |
| nursery | 80 | 0 |
| performance | 14 | 5 |
| security | 6 | 5 |
| style | 87 | 12 |
| suspicious | 102 | 70 |
| **Total** | **442** | **210** |

`nursery` is 0 recommended by construction: "Nursery rules require explicit opt-in via configuration on stable versions because they may still have bugs or performance problems (even if they are marked as recommended)" — [Biome linter overview](https://biomejs.dev/linter/). A nursery rule can carry an internal "intended to be recommended on promotion" flag, but the group itself is always excluded from the `recommended` preset on a stable release.

This supersedes the "441 rules, 224 recommended" figure carried into this brief from earlier grounding — Biome ships lint rules on every patch release (`v2.5.9` → `v2.5.11` in the twelve days before this research), so the count moves. Re-measure at the URL above rather than reusing either number going forward.

### 2. typescript-eslint's rule index, measured today

Fetched [`https://typescript-eslint.io/rules/`](https://typescript-eslint.io/rules/) (typescript-eslint 8.68.0, released 2026-08-24 per [GitHub releases](https://github.com/typescript-eslint/typescript-eslint/releases)) and parsed the rules table's config badges directly rather than the prose "100+ rules" claim on the page:

- **134 total rules.**
- **43 rules carry the `recommended` (✅) badge** — this single badge covers both the plain `recommended` config and the type-checked rules that only appear once you add `recommendedTypeChecked`. Split: 20 need no type info (plain `recommended`), 23 require type info (`recommendedTypeChecked`-only additions).
- **25 rules carry the `strict` (🔒) badge** — 8 non-typed, 17 typed (`strictTypeChecked`-only additions).
- **61 rules total require type information** (💭), independent of preset membership.
- **9 rules are deprecated** (💀).

Config → property-name mapping for flat config, confirmed against [typescript-eslint's shared-configs page](https://typescript-eslint.io/users/configs/): `tseslint.configs.recommended`, `.recommendedTypeChecked`, `.strict`, `.strictTypeChecked`, `.stylistic`, `.stylisticTypeChecked` — camelCase properties, hyphenated names only in prose/legacy `extends` strings.

### 3. The official rule-name cross-reference — and its gaps

Biome publishes an explicit ESLint→Biome rule-name table at [`https://biomejs.dev/linter/rules-sources/`](https://biomejs.dev/linter/rules-sources/), which is also what `biome migrate eslint` draws from ("Rule mappings: equivalent Biome rules for most ESLint rules," per the [migration guide](https://biomejs.dev/guides/migrate-eslint-prettier/)). The `typescript-eslint` section lists **42 explicit pairs** — about 31% of typescript-eslint's 134 rules — e.g.:

| typescript-eslint | Biome | Note |
|---|---|---|
| `no-explicit-any` | `noExplicitAny` | exact |
| `no-unused-vars` | `noUnusedVariables` | exact |
| `consistent-type-imports` | `useImportType` | (inspired) |
| `only-throw-error` | `useThrowOnlyError` | (inspired) |
| `prefer-optional-chain` | `useOptionalChain` | exact |
| `require-await` | `useAwait` | exact |

**Not present in that table at all**: `no-floating-promises`, `no-misused-promises`, `no-unsafe-type-assertion`, `prefer-readonly`. This is a genuine gap in Biome's own published cross-reference, not an oversight in this research — I fetched the raw table and it stops (alphabetically) at `require-await`, well before typescript-eslint's `restrict-plus-operands`, `strict-boolean-expressions`, `unbound-method`, etc. The most likely explanation: `noFloatingPromises` (Biome v2.0), `noMisusedPromises` (v2.1), and `useReadonlyClassProperties` (v2.1) all shipped after this table was last curated, and each one's own doc page states its typescript-eslint source independently (see [§4](#4-the-decisive-case-floatingmisused-promises-and-unsafe-type-assertion), [§5](#5-severity-mismatches-only-throw-error-and-prefer-readonly)) — the two sources have drifted apart.

Practical consequence: **could not establish whether `biome migrate eslint`'s internal mapping exceeds the published table** as of 2026-08-29 — I did not run the CLI against a fleet repo. Treat the published table as the floor: after running `biome migrate eslint --include-inspired` on any fleet repo, manually check `noFloatingPromises`, `noMisusedPromises`, `noUnsafeTypeAssertion`, and `useReadonlyClassProperties` were actually ported, because the documented source table gives no guarantee they are.

### 4. The decisive case: floating/misused promises and unsafe-type-assertion

| Rule | Biome group | Biome default | typescript-eslint config | typescript-eslint default | Gap? |
|---|---|---|---|---|---|
| `noFloatingPromises` | `nursery` (since v2.0.0) | off | `recommended-type-checked` | on | **Yes — real** |
| `noMisusedPromises` | `nursery` (since v2.1.0) | off | `recommended-type-checked` | on | **Yes — real** |
| `noUnsafeTypeAssertion` | `nursery` (since v2.5.9) | off | *not in any config* | off | **No — both opt-in** |

Sources: [`noFloatingPromises`](https://biomejs.dev/linter/rules/no-floating-promises/javascript), [`noMisusedPromises`](https://biomejs.dev/linter/rules/no-misused-promises/javascript), [`noUnsafeTypeAssertion`](https://biomejs.dev/linter/rules/no-unsafe-type-assertion/javascript) (Biome side); [`no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises/), [`no-misused-promises`](https://typescript-eslint.io/rules/no-misused-promises/), [`no-unsafe-type-assertion`](https://typescript-eslint.io/rules/no-unsafe-type-assertion/) (typescript-eslint side, config badges read directly off the rules table).

`no-unsafe-type-assertion`'s own doc page shows only an opt-in example (`"@typescript-eslint/no-unsafe-type-assertion": "error"` added directly to `rules`, not via an `extends`), confirming it is not part of `recommended`, `strict`, or any other preset. Its Biome sibling also carries no "Sources:" cross-reference on its own page — the two rules are same-name, same-intent, but **not formally linked** by either project; treat them as independently implemented, not guaranteed-identical.

Correct/incorrect pairs, both linters:

```ts
// wrong: promise is created and dropped — nothing observes rejection
function save(record: Record) {
  writeToDisk(record); // returns Promise<void>, never awaited/caught
}

// right
async function save(record: Record) {
  await writeToDisk(record);
}
```

```ts
// wrong: async callback handed to a sync-expecting API — no-misused-promises catches this
[1, 2, 3].forEach(async (n) => {
  await process(n);
});

// right
for (const n of [1, 2, 3]) {
  await process(n);
}
```

```jsonc
// biome.json — closes the gap for kate-middlechild
{
  "linter": {
    "rules": {
      "nursery": {
        "noFloatingPromises": "error",
        "noMisusedPromises": "error",
        "noUnsafeTypeAssertion": "error"
      }
    }
  }
}
```

```js
// eslint.config.js — already the default under recommendedTypeChecked/strictTypeChecked;
// add explicitly if the fleet repo hasn't adopted a type-checked preset (see §10)
{
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-unsafe-type-assertion": "error", // opt-in on this side too
  },
}
```

### 5. Severity mismatches: only-throw-error and prefer-readonly

| Rule | typescript-eslint config | Biome group / default | Verdict |
|---|---|---|---|
| `only-throw-error` | `recommended-type-checked` (✅, 💭, extension rule) | `style`, not recommended | **Real mismatch** — ESLint on by default, Biome off |
| `prefer-readonly` | *no config badge at all* (💭 only) | `style`, not recommended | **Not a mismatch** — both opt-in |

[`only-throw-error`](https://typescript-eslint.io/rules/only-throw-error/): "Extending `plugin:@typescript-eslint/recommended-type-checked`... enables this rule," and it is an extension rule that replaces core ESLint's `no-throw-literal`. Biome's [`useThrowOnlyError`](https://biomejs.dev/linter/rules/use-throw-only-error/javascript) states plainly: "This rule isn't recommended, so you need to enable it" — `style` group, `warning` severity by default even when enabled, sourced from both `no-throw-literal` and `@typescript-eslint/only-throw-error`.

[`prefer-readonly`](https://typescript-eslint.io/rules/prefer-readonly/) carries no ⚙️ config-group badge in the rules table at all — confirmed by reading the raw row: `<td class=attrCol_xNoP title="">` where every other config-bearing rule has `title=recommended` or `title=strict`. It is enabled the same way in both linters: by hand, project-by-project. Biome's [`useReadonlyClassProperties`](https://biomejs.dev/linter/rules/use-readonly-class-properties/javascript) (`style`, not recommended, unsafe fix, `information` severity) is therefore not weaker than its typescript-eslint twin — they are the same strength. The brief's premise that this pair shows an "adopt vs. style" severity gap does not survive a read of typescript-eslint's own table; correct the grounding here.

```jsonc
// biome.json — only-throw-error needs an explicit opt-in to match ESLint's default
{
  "linter": {
    "rules": {
      "style": {
        "useThrowOnlyError": "error"
      }
    }
  }
}
```

### 6. The rule Biome cannot express at all: the `no-unsafe-*` family

Searched Biome's full JS/TS rule index for every `no-unsafe-*` rule name: [`no-unsafe-declaration-merging`](https://biomejs.dev/linter/rules/no-unsafe-declaration-merging/javascript), `no-unsafe-finally`, `no-unsafe-negation`, `no-unsafe-optional-chaining`, `no-unsafe-plus-operands`, `no-unsafe-type-assertion`. None of these correspond to typescript-eslint's five `any`-flow rules, all `recommended-type-checked`:

| typescript-eslint rule | Biome equivalent |
|---|---|
| `no-unsafe-assignment` | **none** |
| `no-unsafe-member-access` | **none** |
| `no-unsafe-call` | **none** |
| `no-unsafe-argument` | **none** |
| `no-unsafe-return` | **none** |

Confirmed against both the [rules-sources cross-reference](https://biomejs.dev/linter/rules-sources/) (absent) and the full [JS rules index](https://biomejs.dev/linter/javascript/rules/) (no rule name is even close). This is the fleet's single most consequential gap: the established grounding for this program is that `as unknown as T` (164 occurrences, 84 of them in the two Mocha/Electron VS Code extensions, 79 in one 6,899-line file) is the fleet's real escape hatch — and this exact `no-unsafe-*` family is what typescript-eslint uses to catch `any` leaking through such casts into typed code. **kate-middlechild has zero mechanical way to catch this class of bug with Biome**, today, in any group, at any severity.

This is the one case where the brief's third question — "is any intended non-negotiable unavailable on one side, forcing it into prose for everyone" — has a clean yes. Bind the fleet with a prose rule ("never let a value typed `any` flow into a typed parameter, property, or return position without an explicit narrowing check") verified by `@typescript-eslint/no-unsafe-*` on the seven ESLint repos and by code review / a custom GritQL pattern on kate-middlechild, not by a Biome lint rule, because none exists.

### 7. Biome's type inference engine: what it actually reaches without `tsc`

Per Biome's [v2 announcement](https://biomejs.dev/blog/biome-v2/), Biome is "the *first* JavaScript and TypeScript linter that provides type-aware linting rules that doesn't rely on the TypeScript compiler" — it never shells out to `tsc`. Per the [Vercel partnership post](https://biomejs.dev/blog/vercel-partners-biome-type-inference/), the engine is explicitly bounded: "No. TypeScript's `tsc` is a complex and fully-featured type checker, and we have no intention to rebuild it," and the design goal is asymmetric — "what's most important is that we don't flag false positives... instances where our lint rules may think there's an issue" when none exists, i.e. false negatives (missed bugs) are the accepted cost, not false positives (noisy CI).

The only quantified number either source gives: Biome's own team measured `noFloatingPromises` "detect[ing] floating promises in about **75%** of the cases that would be detected by using `typescript-eslint`, at a fraction of the performance impact" ([v2 blog](https://biomejs.dev/blog/biome-v2/)) — with the caveat "your mileage may vary, as these early numbers are based on a limited set of use cases."

Enabling any `types`-domain rule (which `noFloatingPromises`, `noMisusedPromises`, and `noUnsafeTypeAssertion` all belong to) triggers Biome's project-wide Scanner: "When enabling rules that belong to this domain, Biome will scan the entire project," and "the scanning phase will have a performance impact on the linting process" — [domains reference](https://biomejs.dev/linter/domains/). No `tsconfig.json` is required to trigger this — the Scanner and inference engine are Biome-internal, not a wrapper around the TypeScript project graph.

The v2.5 blog's "surpassed **500 rules**" milestone ([source](https://biomejs.dev/blog/biome-v2-5/)) is a whole-product count across every domain Biome lints (JS/TS/JSX, CSS, JSON, GraphQL, HTML) — not the JS/TS number relevant to this fleet's 7 TypeScript-only repos plus kate-middlechild. Use the 442 figure from [§1](#1-biomes-jsts-rule-index-measured-today), measured directly against the JS rules index, not the blog's headline.

### 8. The six Biome-only candidates

| Rule | Group / recommended | Sources line on its own doc page | Verdict |
|---|---|---|---|
| [`noConstantMathMinMaxClamp`](https://biomejs.dev/linter/rules/no-constant-math-min-max-clamp/javascript) | correctness, recommended | "Same as `min_max`" (Rust Clippy) | No ESLint equivalent |
| [`noGlobalDirnameFilename`](https://biomejs.dev/linter/rules/no-global-dirname-filename/javascript) | correctness, not recommended | "Inspired from `unicorn/prefer-module`" | Partial equivalent (eslint-plugin-unicorn) |
| [`noStringCaseMismatch`](https://biomejs.dev/linter/rules/no-string-case-mismatch/javascript) | correctness, recommended | "Same as `match_str_case_mismatch`" (Rust Clippy) | No ESLint equivalent |
| [`noSvgWithoutTitle`](https://biomejs.dev/linter/rules/no-svg-without-title/javascript) | a11y, recommended | *none listed* | No ESLint equivalent |
| [`useSemanticElements`](https://biomejs.dev/linter/rules/use-semantic-elements/javascript) | a11y, recommended | "Same as `jsx-a11y/prefer-tag-over-role`" | **Has an equivalent** (eslint-plugin-jsx-a11y) |
| [`useValidLang`](https://biomejs.dev/linter/rules/use-valid-lang/javascript) | a11y, recommended | "Same as `jsx-a11y/lang`" | **Has an equivalent** (eslint-plugin-jsx-a11y) |

Only three of the six (`noConstantMathMinMaxClamp`, `noStringCaseMismatch`, `noSvgWithoutTitle`) are genuinely Biome-original with no ESLint-ecosystem counterpart anywhere. `useSemanticElements` and `useValidLang` are direct ports of `eslint-plugin-jsx-a11y` rules — neither fleet browser SPA (fma, creeptd-ng/web) currently has that plugin installed (`grep -l jsx-a11y` across both repos' `package.json` returns nothing), so the practical fix for those two repos is installing `eslint-plugin-jsx-a11y`, not prose.

Worth prose so the seven ESLint repos get the practice without the rule: **`noConstantMathMinMaxClamp`** ("don't call `Math.min`/`Math.max`/`.clamp()` with constant bounds where `min > max`, it silently returns the wrong constant every time") and **`noStringCaseMismatch`** ("don't compare a string against a case-differing literal after already normalizing case — the comparison can never match"). `noSvgWithoutTitle` only matters for repos that ship inline SVG in markup — none of the CLI or VS Code extension repos do; scope that one to fma and creeptd-ng/web only, and prefer installing jsx-a11y there too since it also covers `useSemanticElements`/`useValidLang`.

### 9. camelCase-vs-kebab translation cost, measured

Confirmed against kate-middlechild's own [`biome.json`](file:///home/mherwig/dev/kate-middlechild/biome.json) (lines 24–33): rules are nested three levels deep, `linter.rules.<group>.<ruleName>` —

```json
"linter": {
  "rules": {
    "preset": "recommended",
    "correctness": { "noUnusedImports": "error" },
    "style": { "useImportType": "error", "noNonNullAssertion": "warn" }
  }
}
```

— versus ESLint's flat `rules: { "@typescript-eslint/no-unused-vars": "error" }`. Every nursery rule's own "How to configure" section confirms the same shape (e.g. `noUnsafeTypeAssertion`'s doc page shows `linter.rules.nursery.noUnsafeTypeAssertion`). The camelCase rename itself is a pure mechanical transform (`no-floating-promises` → `noFloatingPromises`) that a script can do losslessly. **The actual cost is knowing which of the 8 groups a rule lives in** — that is not derivable from the rule name and must be looked up per rule (the `rules-sources` page, or each rule's own doc page, or `biome migrate eslint`'s own output). A single lookup table mapping `{eslint-rule-name → {biome-name, biome-group}}` for every rule the fleet requires removes this cost once, permanently — build it as a fixture, not a runtime lookup.

### 10. Fleet measurement: who actually has what wired

Read every `eslint.config.*` and `biome.json` in the fleet directly:

| Repo | Linter | Config tier | Type-checked rules active? |
|---|---|---|---|
| `ocx-catalog` | ESLint | `tseslint.configs.recommended` | No — plain, non-typed |
| `grimoire-indexer` | ESLint | `tseslint.configs.recommended` | No |
| `grimoire-vscode` | ESLint | `tseslint.configs.recommended` | No |
| `vscode-ocx` | ESLint | `tseslint.configs.recommended` | No |
| `fma` | ESLint | `tseslint.configs.recommended` | No |
| `setup-ocx` | ESLint | `...strictTypeChecked, ...stylisticTypeChecked` + `parserOptions.project` wired | **Yes** |
| `creeptd-ng/web` | *(none)* | `package.json` has a `"lint": "eslint src..."` script but **no `eslint` devDependency and no `eslint.config.js`** in the checked-out worktree — the config exists only in an uncommitted `.worktrees/web-lint` branch | N/A — broken today |
| `kate-middlechild` | Biome v2.4.0+ (`biome.json` schema pinned to 2.5.0) | `preset: "recommended"` + explicit `correctness`/`style` additions | No `nursery` rules enabled at all |

(File:line — `/home/mherwig/dev/ocx-catalog/eslint.config.js:27`, `/home/mherwig/dev/grimoire-indexer/eslint.config.js:12`, `/home/mherwig/dev/grimoire-vscode/eslint.config.mjs:18`, `/home/mherwig/dev/vscode-ocx/eslint.config.mjs:10`, `/home/mherwig/dev/fma/eslint.config.js:10`, `/home/mherwig/dev/setup-ocx/eslint.config.js:8-9,16-17`, `/home/mherwig/dev/creeptd-ng/web/package.json:9`, `/home/mherwig/dev/kate-middlechild/biome.json:24-33`.)

The headline consequence: **`no-floating-promises`, `no-misused-promises`, and `only-throw-error` are inactive in 5 of the fleet's 7 ESLint repos today**, not just absent from kate-middlechild's Biome config. kate-middlechild's async surface is non-trivial (127 `async`/`.catch(`-adjacent call sites across `packages/core/src` and `packages/web/src`, measured with `grep -rn`) — the risk this class of rule guards against is live there, not theoretical. Closing the parity gap in `biome.json` (per [§4](#4-the-decisive-case-floatingmisused-promises-and-unsafe-type-assertion)'s decision) puts kate-middlechild *ahead* of 5 of the 7 ESLint repos, not behind them; the fleet-wide fix is bumping those five to `recommendedTypeChecked` (blocked today by the peer-range/TS-7 constraint already established in prior grounding) as much as it is a Biome nursery opt-in.

setup-ocx also demonstrates the failure mode to warn against in prose: its `eslint.config.js:19-24` explicitly disables the entire `no-unsafe-*` family for `@actions/*` seams. That's a locally justified, scoped exception — but it is exactly the pattern an agent would copy wholesale into a repo that has no such seam, silently deleting the fleet's only defense against the `as unknown as T` escape hatch from [§6](#6-the-rule-biome-cannot-express-at-all-the-no-unsafe--family).

## Normative guidance candidates

1. **Keep typescript-eslint on the 7 ESLint repos and Biome on kate-middlechild; write one prose rule file, and maintain one `{eslint-name → {biome-name, biome-group}}` lookup fixture for every rule it requires.** Rationale: the two rule sets differ mechanically (name casing, config nesting), not semantically, for every rule that exists on both sides. Verify: the fixture file exists, is checked into the repo, and every rule named in the prose file has an entry (or an explicit "Biome cannot express this" marker, per #6 below).
2. **Enable `linter.rules.nursery.noFloatingPromises` and `linter.rules.nursery.noMisusedPromises` as `"error"` in kate-middlechild's `biome.json`.** Rationale: these are `recommended-type-checked` in typescript-eslint and `nursery` (off) in Biome — the one real default-severity gap in the "decisive case." Verify: `grep -A2 '"nursery"' biome.json` shows both keys set to `"error"`.
3. **Enable `linter.rules.style.useThrowOnlyError` as `"error"` in kate-middlechild's `biome.json`.** Rationale: `only-throw-error` is on by default in `recommended-type-checked`; `useThrowOnlyError` is `style`, off by default. Verify: same grep against the `style` block.
4. **Do not treat `noUnsafeTypeAssertion`/`no-unsafe-type-assertion` or `useReadonlyClassProperties`/`prefer-readonly` as parity gaps** — both pairs are opt-in on both linters. Enable them everywhere as a shared non-negotiable, but don't spend effort "closing a gap" that doesn't exist. Verify: this document's §4/§5 tables, re-checked against the live rule pages before citing a config-membership claim in any future revision.
5. **Write the `any`-flow prose rule ("no `any` may cross a typed boundary — parameter, property, or return — without an explicit narrowing check") as fleet-wide prose, not a Biome-lint-verified rule.** Rationale: Biome has no equivalent to typescript-eslint's `no-unsafe-assignment`/`-member-access`/`-call`/`-argument`/`-return` family, in any group, as of Biome v2.5.11. Verify on the 7 ESLint repos: `no-unsafe-*` set to `"error"` under a `*TypeChecked` config. Verify on kate-middlechild: no automated check exists — this is a code-review heuristic only; flag it explicitly as unenforced-by-tooling in the rule file itself so reviewers don't assume Biome catches it.
6. **Before enabling any `nursery`-group Biome rule fleet-wide, budget for the Scanner.** Rationale: `noFloatingPromises`/`noMisusedPromises`/`noUnsafeTypeAssertion` all belong to the `types` domain, which triggers a full-project scan with a stated, unquantified performance cost. Verify: time `biome check` before/after enabling, on kate-middlechild's actual package count (3 packages, 8.6k LOC) — if it regresses CI noticeably, say so in the rule file rather than silently eating the cost.
7. **Bump the 5 plain-`recommended` ESLint repos to `recommendedTypeChecked` (or `strictTypeChecked`, matching setup-ocx) before treating "Biome lacks parity" as the fleet's binding constraint.** Rationale: those 5 repos don't have `no-floating-promises`/`no-misused-promises`/`only-throw-error` active either — the gap is fleet-wide, not Biome-specific, and the ESLint side is blocked by the same peer-range constraint already established for this program (typescript pinned to `^6.0.x`), not by anything in this research. Verify: `grep -c TypeChecked eslint.config.*` across the fleet; today it returns non-zero only for setup-ocx.
8. **Never copy a scoped `no-unsafe-*` disable block (like setup-ocx's `@actions/*` carve-out) into a repo without the same justification.** Rationale: it is the fleet's only mechanical defense against the 164-occurrence `as unknown as T` escape hatch; a blanket copy silently removes that defense. Verify: any PR that disables `@typescript-eslint/no-unsafe-*` must cite the specific untyped third-party surface it's working around, in a comment next to the disable, not just in a commit message.
9. **Treat `biome migrate eslint`'s output as a starting point, not a finished mapping.** Rationale: its published source table omits `no-floating-promises`, `no-misused-promises`, `no-unsafe-type-assertion`, and `prefer-readonly` — four rules that matter to this fleet. Verify: after running the migration, `grep` the resulting `biome.json` for `noFloatingPromises`/`noMisusedPromises`/`noUnsafeTypeAssertion`/`useReadonlyClassProperties` explicitly; none will appear unless added by hand.
10. **Scope `noConstantMathMinMaxClamp` and `noStringCaseMismatch` to prose for the 7 ESLint repos; scope `noSvgWithoutTitle`/`useSemanticElements`/`useValidLang` to fma and creeptd-ng/web only, and prefer installing `eslint-plugin-jsx-a11y` there over writing prose for the two rules that already have an ESLint-ecosystem twin.** Rationale: the other four repos are CLIs, a GitHub Action, and VS Code extensions — no SVG-in-markup, no JSX a11y surface. Verify: `grep -l jsx-a11y package.json` across fma/creeptd-ng-web today returns nothing; that's the gap to close if the a11y rules matter to those two repos.

## AI-agent angle

- **An agent asked to "add Biome's equivalent of this ESLint rule" will reach for `biome migrate eslint`'s output or the `rules-sources` page and silently skip `noFloatingPromises`/`noMisusedPromises`/`noUnsafeTypeAssertion`/`useReadonlyClassProperties`, because none of the four appear there.** Smallest mechanical check: for any of these four rule names touched in a diff, `grep` the resulting `biome.json` to confirm the key was actually added — the migration tool's silence is not evidence the rule doesn't exist on the Biome side.
- **An agent will read `useReadonlyClassProperties`/`useThrowOnlyError` both sitting in Biome's `style` group and assume they're the same strength as their typescript-eslint counterparts.** They aren't the same as each other: `only-throw-error` is `recommended-type-checked` (on by default in ESLint), `prefer-readonly` is opt-in everywhere. Smallest check: before writing "Biome's `style` group ≈ ESLint's optional rules," read the specific typescript-eslint rule's own config badge — group name on one side never predicts default status on the other.
- **An agent enabling a `nursery` rule in `biome.json` will write it at the top level (`"linter": {"rules": {"noFloatingPromises": "error"}}`) instead of nested under the group** — this is the single most common Biome config mistake because ESLint's flat namespace trains the wrong reflex. Smallest check: `biome check` on the config; an ungrouped nursery-rule key is silently ignored, not an error, so a linter run showing zero new diagnostics after "enabling" the rule is the tell, not a config validation failure.
- **An agent will treat Biome's "500 rules" blog headline as directly comparable to typescript-eslint's rule count** when arguing linter capability. Smallest check: the number is whole-product (JS+CSS+JSON+GraphQL+HTML); the comparable JS/TS-only figure is the one measured in [§1](#1-biomes-jsts-rule-index-measured-today) against the live rules index, not any blog post.
- **An agent will assume enabling a `types`-domain Biome rule is free** because Biome markets itself on raw speed. Smallest check: the domain page states the Scanner does a full project scan with a real, if unquantified, performance cost the moment any `types`-domain rule is turned on — treat it as a budget line, not a freebie, same as flipping on `parserOptions.project` in ESLint.

## Contested / evolving

- **`noUnsafeTypeAssertion` is twelve days old as of this research** (shipped Biome v2.5.9, 2026-08-17; latest is v2.5.11, 2026-08-27, per [GitHub releases](https://github.com/biomejs/biome/releases)). Its interaction with `nursery`'s promotion path to `recommended` is unsettled — it could stabilize into `suspicious` or `style` within a few point releases, the way `useReadonlyClassProperties` did (introduced v2.1.0, still `style`/not-recommended eight point releases later). Trending: Biome ships type-domain nursery rules faster than it promotes them; budget for "opt-in nursery, indefinitely" as the default assumption, not "opt-in until the next minor."
- **Biome's type inference engine is an active, funded research effort (Vercel-sponsored), not a finished feature.** The 75%-parity figure for `noFloatingPromises` is explicitly self-described as preliminary ("your mileage may vary"). Trending: coverage should improve release over release, but there is no committed timeline or target percentage in any source read for this document — re-measure the parity claim before relying on it in a future revision, don't carry the 75% figure forward unchanged.
- **The Biome/typescript-eslint cross-reference table drifting out of sync with individual rule pages is itself evidence of a maintenance gap, not a stable feature.** As Biome adds more `types`-domain rules, expect more of them to ship without a corresponding `rules-sources` entry — treat that page as necessary-but-not-sufficient for any future rule-mapping decision, and always cross-check the individual rule's own "Sources:" line.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [biomejs.dev/linter/javascript/rules/](https://biomejs.dev/linter/javascript/rules/) | Biome JS/TS rule index (live table) | fetched 2026-08-29, Biome v2.5.11 | Ground truth for total/group/recommended counts — do not cite a blog number instead |
| [biomejs.dev/linter/rules-sources/](https://biomejs.dev/linter/rules-sources/) | Biome's official ESLint→Biome rule-name cross-reference | fetched 2026-08-29 | The exact 42-pair typescript-eslint mapping, and what it's missing |
| [biomejs.dev/linter/domains/](https://biomejs.dev/linter/domains/) | Biome docs: lint rule domains | fetched 2026-08-29 | Explains the Scanner trigger and cost for `types`-domain rules |
| [biomejs.dev/linter/](https://biomejs.dev/linter/) | Biome linter overview | fetched 2026-08-29 | Nursery group's own stated stability/opt-in policy |
| [biomejs.dev/guides/migrate-eslint-prettier/](https://biomejs.dev/guides/migrate-eslint-prettier/) | `biome migrate eslint` command docs | fetched 2026-08-29 | What the migration tool converts, and its stated caveats |
| [biomejs.dev/blog/biome-v2/](https://biomejs.dev/blog/biome-v2/) | Biome v2.0 announcement | fetched 2026-08-29 | Origin of type-aware linting without `tsc`; the 75%-parity `noFloatingPromises` figure |
| [biomejs.dev/blog/biome-v2-5/](https://biomejs.dev/blog/biome-v2-5/) | Biome v2.5 release notes | fetched 2026-08-29 | Source and true scope of the "500 rules" milestone |
| [biomejs.dev/blog/vercel-partners-biome-type-inference/](https://biomejs.dev/blog/vercel-partners-biome-type-inference/) | Vercel/Biome type-inference partnership post | fetched 2026-08-29 | "Not a full type checker," false-positive-averse design goal, stated explicitly |
| [biomejs.dev/linter/rules/no-floating-promises/javascript](https://biomejs.dev/linter/rules/no-floating-promises/javascript) | Biome rule doc | fetched 2026-08-29, since v2.0.0 | Group, recommended status, type-domain requirement |
| [biomejs.dev/linter/rules/no-misused-promises/javascript](https://biomejs.dev/linter/rules/no-misused-promises/javascript) | Biome rule doc | fetched 2026-08-29, since v2.1.0 | Same |
| [biomejs.dev/linter/rules/no-unsafe-type-assertion/javascript](https://biomejs.dev/linter/rules/no-unsafe-type-assertion/javascript) | Biome rule doc | fetched 2026-08-29, since v2.5.9 | Confirms nursery, no Sources cross-reference |
| [biomejs.dev/linter/rules/use-throw-only-error/javascript](https://biomejs.dev/linter/rules/use-throw-only-error/javascript) | Biome rule doc | fetched 2026-08-29, since v1.8.0 | style group, not recommended, warning severity |
| [biomejs.dev/linter/rules/use-readonly-class-properties/javascript](https://biomejs.dev/linter/rules/use-readonly-class-properties/javascript) | Biome rule doc | fetched 2026-08-29, since v2.1.0 | style group, not recommended — corrects the brief's severity-mismatch premise |
| [biomejs.dev/linter/rules/no-constant-math-min-max-clamp/javascript](https://biomejs.dev/linter/rules/no-constant-math-min-max-clamp/javascript) | Biome rule doc | fetched 2026-08-29, since v1.7.0 | Confirms Rust-Clippy origin, no ESLint equivalent |
| [biomejs.dev/linter/rules/use-semantic-elements/javascript](https://biomejs.dev/linter/rules/use-semantic-elements/javascript) | Biome rule doc | fetched 2026-08-29, since v1.8.0 | Confirms jsx-a11y equivalent exists — corrects the brief |
| [biomejs.dev/linter/rules/use-valid-lang/javascript](https://biomejs.dev/linter/rules/use-valid-lang/javascript) | Biome rule doc | fetched 2026-08-29, since v1.0.0 | Confirms jsx-a11y equivalent exists — corrects the brief |
| [typescript-eslint.io/rules/](https://typescript-eslint.io/rules/) | typescript-eslint rule index (live table) | fetched 2026-08-29, v8.68.0 | Ground truth for 134/43/25/61/9 counts, config badges |
| [typescript-eslint.io/users/configs/](https://typescript-eslint.io/users/configs/) | Shared config reference | fetched 2026-08-29 | Flat-config property names for each preset |
| [typescript-eslint.io/rules/no-unsafe-type-assertion/](https://typescript-eslint.io/rules/no-unsafe-type-assertion/) | typescript-eslint rule doc | fetched 2026-08-29 | Confirms not-in-any-preset, directly refutes the brief's assumption |
| [typescript-eslint.io/rules/only-throw-error/](https://typescript-eslint.io/rules/only-throw-error/) | typescript-eslint rule doc | fetched 2026-08-29 | Confirms recommended-type-checked membership |
| [typescript-eslint.io/rules/prefer-readonly/](https://typescript-eslint.io/rules/prefer-readonly/) | typescript-eslint rule doc | fetched 2026-08-29 | Confirms no-preset membership, refutes the brief's severity-gap framing |
| [github.com/biomejs/biome/releases](https://github.com/biomejs/biome/releases) | Biome release history | checked 2026-08-29 | Establishes v2.5.9/v2.5.11 dates for currency claims |
| [github.com/typescript-eslint/typescript-eslint/releases](https://github.com/typescript-eslint/typescript-eslint/releases) | typescript-eslint release history | checked 2026-08-29 | Establishes v8.68.0 date for currency claims |

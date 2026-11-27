---
title: Lint config pointer facts, delta check
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 9
---

# Lint config pointer facts, delta check (2026-08-29 to 2026-11-27)

Scope: only the three pointer sentences in "Editing a Lint Config" of rules/typescript-packaging.md. This is a delta against a 2026-08-29 baseline (typescript-eslint 8.68.0). Anything not listed as changed stays as it is.

## Summary

1. Sentence 1 (projectService): unchanged. The grep check stays valid. One opt-in addition is noted below.
2. Sentence 2 (consistent-type-imports, no-import-type-side-effects not in a preset): unchanged.
3. Sentence 3 (Biome project domain): the key spelling is unchanged. The "alone is a no-op" wording could not be confirmed and the changelog points the other way for at least one rule. See the finding.

## Findings

### 1. Type-aware rules need projectService (or project): unchanged

- typescript-eslint stayed on v8 throughout the window: 8.70.0 (Sep 7) to 8.74.0 (Nov 23). No v9. Source: [releases](https://github.com/typescript-eslint/typescript-eslint/releases).
- The parser docs for v8.74.0 still say `projectService` defaults to `false` and is required (with `project`) for rules that need type information. `project` is still accepted, and enabling both is an error. Source: [parser docs](https://typescript-eslint.io/packages/parser).
- New in v8.73.0 (Nov 16, 2026): opt-in `projectService.EXPERIMENTAL_backend: 'tsgo'`, for TypeScript >=7.1 native support. It sits under `projectService` and is not default-enabled. The docs state the tsgo backend does not support the legacy `parserOptions.project` and `parserOptions.programs`. Same two sources.
- Consequence for the grep check: the key `projectService` still appears literally in any config that wires type-aware linting, including the tsgo case. Empty grep output still means the type-aware rules are inert. Status: unchanged.
- Fixes in the window (8.70.0, 8.70.1, 8.71.1, 8.72.1) concern project-service internals only, not naming or defaults.

### 2. A preset does not supply consistent-type-imports / no-import-type-side-effects: unchanged

- Read the flat `recommended.ts`, `strict.ts` and `stylistic.ts` on main. Neither rule is in any of them. Sources: [recommended.ts](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/recommended.ts), [strict.ts](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/strict.ts), [stylistic.ts](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/stylistic.ts).
- Caveat: each file spreads `baseConfig` and `eslintRecommendedConfig`, whose contents the fetch did not show. Those two are parser and core-rule bases, so this is low risk, but it was not read directly. The type-checked variants were not read either. The shared-configs docs page ([configs](https://typescript-eslint.io/users/configs)) does not name either rule.
- The only related release note: v8.73.0 narrowed the report location of `consistent-type-imports`. It did not change preset membership.

### 3. Biome project domain: key unchanged, "no-op" wording not confirmable

- Key spelling unchanged: `linter.domains.project` with values `"recommended"`, `"all"`, `"none"`. Source: [domains page](https://biomejs.dev/linter/domains/). Latest Biome is CLI 2.6.9 (Nov 24, 2026); no Biome 3 found. Sources: [releases](https://github.com/biomejs/biome/releases), [CHANGELOG](https://raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md) (package version 2.6.9).
- The domains page says "When enabling rules that belong to this domain, Biome will scan the entire project" and that the project domain includes the module graph. It does not say whether naming a single rule, with no domain setting, makes the rule run.
- The changelog entry in 2.6.2 says of a rule that it "is now part of the `project` domain, so enabling it makes Biome scan your project." Earlier, the 2.2.0 scanner note says "if project rules were enabled, Biome's scanner would scan all dependencies". Both read as: enabling a project-domain rule triggers the scan, which is in tension with "a rule name alone is a no-op".
- Verdict: could not determine whether the sentence is still true. Nothing in the window renamed the key. The sentence may already have been over-strong at baseline, or it may describe a narrower case (for example a rule that stays inert until the domain index exists). A local test settles it: run `biome lint` on a two-file fixture with only the rule set to `error`, then again with `linter.domains.project` set, and compare diagnostics.

## Normative guidance candidates

1. Rule: keep sentence 1 and its grep unchanged. Rationale: no rename or default-on in the window. Verification: `git ls-files ... | xargs -0 -r grep -H -n -E -e projectService -e parserOptions --` as written.
2. Rule: optionally append "`projectService.EXPERIMENTAL_backend: 'tsgo'` (v8.73.0+) is an opt-in backend under the same key; the grep still applies." Rationale: agents may meet the new key and wonder if the check is stale. Verification: grep for `EXPERIMENTAL_backend` returns hits only alongside `projectService`.
3. Rule: keep sentence 2 unchanged. Verification: `npx eslint --print-config <file>` and search for both rule names in a preset-only config.
4. Rule: soften sentence 3 only if the local fixture test above shows the rule runs without the domain setting. Candidate wording: "Set `linter.domains.project` explicitly when relying on a project-domain rule; do not depend on the rule name alone to build the module graph." Verification: the fixture test.

## AI-agent angle

- An agent may report the tsgo backend as a replacement for `projectService`. Check: the `EXPERIMENTAL_backend` key lives inside `projectService`.
- An agent may add `parserOptions.project` together with `projectService`. That is an error per the parser docs. Check: grep both keys in one file.

## Contested / evolving

- tsgo backend for typescript-eslint is experimental as of Nov 2026 (needs a TypeScript 7.1 nightly). Watch for it becoming non-experimental.
- Biome project-domain activation semantics are documented loosely; the docs and changelog do not state the single-rule case explicitly.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/typescript-eslint/typescript-eslint/releases | typescript-eslint releases | 8.70.0 to 8.74.0, Sep to Nov 2026 | window changelog |
| https://typescript-eslint.io/packages/parser | parser docs, v8.74.0 | Nov 2026 | projectService, tsgo backend |
| https://typescript-eslint.io/users/configs | shared configs page | Nov 2026 | preset description |
| https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/recommended.ts | recommended preset source | main | rule list |
| https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/strict.ts | strict preset source | main | rule list |
| https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/configs/flat/stylistic.ts | stylistic preset source | main | rule list |
| https://biomejs.dev/linter/domains/ | Biome domains docs | Nov 2026 | key spelling, scan behavior |
| https://github.com/biomejs/biome/releases | Biome releases | 2.6.3 to 2.6.9, Oct to Nov 2026 | window changelog |
| https://raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md | Biome changelog, 2.6.9 | Nov 2026 | project-domain entries |

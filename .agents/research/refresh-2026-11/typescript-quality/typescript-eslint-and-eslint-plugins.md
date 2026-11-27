---
title: typescript-eslint, ESLint core and ESLint plugin delta, 2026-08-29 to 2026-11-27
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 22
---

# typescript-eslint, ESLint core and ESLint plugin delta

This is a delta update. Baseline: typescript-eslint 8.68.0 (released 2026-08-24), measured 2026-08-29. Everything not listed as changed below is unchanged.

## Summary

- Newest typescript-eslint tag is v8.74.0, released 2026-11-23. There is no v9 and no v9 announcement: the GitHub release list stops at 8.74.0 and npm `latest` is 8.74.0. The pin to restate in gate.md is 8.74.0.
- The `typescript` peer range is unchanged at `>=4.8.4 <6.1.0` (plugin and typescript-estree package.json at v8.74.0). It does not admit TS 6.1 or 7.x. v8.73.0 added an optional `@typescript/native` peer (`>=7.1.0-dev.20261009.1 || >=7.1.0-beta <7.1.0-dev`) and the experimental `projectService.EXPERIMENTAL_backend` option for TS 7.1 native parser support over IPC; the `eslint` peer is `^8.57.0 || ^9.0.0 || ^10.0.0`.
- Three rules were added, all type-aware, all in `strict-type-checked` and `all`: `no-generated-empty-object-type` (8.70.0), `no-unsafe-enum-assignment` (8.71.0), `no-unsafe-class-instance-assignment` (8.73.0).
- Counts at v8.74.0, counted from source (`requiresTypeChecking: true` in each `src/rules/*.ts`, preset membership from `src/configs/flat/*.ts`): 137 rules, 64 type-aware (was 61 at 8.68.0), 13 type-aware rules in no preset (unchanged, same 13 names), 45 rules in no preset at all (unchanged), 25 shadowing a core rule (unchanged).
- Only the type-aware total moves: gate.md "13 of the 61" becomes "13 of the 64".
- Every preset-membership claim at risk is still true at v8.74.0, with one addition: `no-misused-promises` gained a `checksConditionals.flagUnions` option, which does not change the "six sub-options" of `checksVoidReturn`.
- ESLint core is at v10.15.0 (2026-11-13). The v10 line is current, v9.39.5 is maintenance. Nothing in 10.10 to 10.15 touches a claim in this pair.
- One pre-existing error found, not caused by the window: security.md line 187 says `vue/no-v-html` "is already error in eslint-plugin-vue's recommended config". It is `"warn"` in `recommended`; `"error"` only in the `recommended-error` configs. browser.md "on by default" remains true (as a warning).

## Findings

### 1. Version and peer range

typescript-eslint releases 8.69.0 (2026-08-31) to 8.74.0 (2026-11-23) were read in full ([releases list](https://github.com/typescript-eslint/typescript-eslint/releases)). v8.74.0 `packages/eslint-plugin/package.json` has `"typescript": ">=4.8.4 <6.1.0"` and `"eslint": "^8.57.0 || ^9.0.0 || ^10.0.0"` ([source at tag](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/package.json)). typescript-estree carries the same range plus the optional `@typescript/native` peer ([source](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/typescript-estree/package.json), feature in [8.73.0](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0)). The compiler-side consequence is a separate brief.

### 2. Rule counts (method)

Shallow clones of tags v8.68.0 and v8.74.0 were analysed with a Python script: a rule is type-aware when its file matches `requiresTypeChecking:\s*true`; preset membership is every `'@typescript-eslint/<name>'` key in `configs/flat/{recommended,strict,stylistic}[-type-checked].ts`; "no preset" is absence from all six non-`all` presets. Shadowing is the intersection of the rule file names with the file names of `lib/rules` in ESLint v10.15.0, minus the `index` artifact.

| Measure | 8.68.0 | 8.74.0 |
|---|---|---|
| rule files with `createRule` | 134 | 137 |
| type-aware | 61 | 64 |
| type-aware in a type-checked preset | 48 | 51 |
| type-aware in `recommended-type-checked` | 23 | 23 |
| type-aware in no preset | 13 | 13 |
| all rules in no preset | 45 | 45 |
| shadow a core rule | 25 | 25 |

The 13 type-aware no-preset rules are identical at both tags: `consistent-return`, `consistent-type-exports`, `naming-convention`, `no-unnecessary-qualifier`, `no-unsafe-type-assertion`, `prefer-destructuring`, `prefer-readonly`, `prefer-readonly-parameter-types`, `promise-function-async`, `require-array-sort-compare`, `strict-boolean-expressions`, `strict-void-return`, `switch-exhaustiveness-check`.

Reconciling rules/typescript-quality.md "roughly fifty rules ... need a type checker and are off by default" with gate.md "61": the two numbers measure different things. 64 rules need a type checker; 51 of them are in some type-checked preset; roughly fifty is close to the preset-covered count, not the total. Recommended wording: say "64 rules need a type checker" in gate.md and "more than sixty" in the rule file, or keep "roughly fifty" only if the sentence means "off in the non-type-checked presets" and then name 51.

### 3. Preset-membership claims at v8.74.0

Source: [configs/flat/*.ts at v8.74.0](https://github.com/typescript-eslint/typescript-eslint/tree/v8.74.0/packages/eslint-plugin/src/configs/flat).

- `strict-void-return`: only in `all` (typed, no preset). Unchanged.
- `switch-exhaustiveness-check`: only in `all`. Unchanged.
- `method-signature-style`: only in `all`. Unchanged.
- `consistent-type-imports`, `no-import-type-side-effects`: only in `all`. Unchanged (the pair says verified on 8.61.0; now verified on 8.74.0). 8.73.0 narrowed the `consistent-type-imports` report location only.
- `ban-ts-comment`: in `recommended`, `strict`, both type-checked variants, and `all`. `descriptionFormat` is still an option (`boolean | 'allow-with-description' | { descriptionFormat: string }`). The pair's wording "not reliably in any preset" refers to the description-format setting, which no preset sets; unchanged.
- `no-floating-promises`: still in `recommended-type-checked`, `strict-type-checked`, `all`; default options still `ignoreVoid: true` ([source](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/src/rules/no-floating-promises.ts)). TS-ASYNC-02 unchanged.
- `no-misused-promises`: `checksVoidReturn` still has exactly six sub-options (`arguments`, `attributes`, `inheritedMethods`, `properties`, `returns`, `variables`), all defaulting true. New in 8.69.0: `checksConditionals.flagUnions` with values `'all' | 'strict' | 'none'`, default `'none'` ([source](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/src/rules/no-misused-promises.ts), [8.69.0](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.69.0)). "All six sub-options" stays correct, scoped to `checksVoidReturn`.
- Renames: `no-throw-literal` and `no-return-await` are absent, `only-throw-error` and `return-await` exist; `only-throw-error` is in the recommended and strict type-checked presets, `return-await` in `strict-type-checked`. Unchanged.

### 4. Project service and `allowDefaultProject`

- `DEFAULT_PROJECT_MATCHED_FILES_THRESHOLD = 8` and the option name `maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING` are unchanged ([createProjectService.ts](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/project-service/src/createProjectService.ts)).
- The `defaultProject` is still the literal `'tsconfig.json'`, and the not-found message still reads "Consider either including it in the tsconfig.json or including it in allowDefaultProject" ([source](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/typescript-estree/src/useProgramFromProjectService.ts)). TS-GATE-02 unchanged.
- Window changes that touch the project service without contradicting the pair: 8.72.1 uses one Program per tsconfig in single-run mode, 8.70.1 resolves symlinked paths when matching files to projects, 8.71.1 throttles cleanup when opening files, 8.70.0 clarifies the `parserOptions.project` error message. The 8.72.1 change is a performance change and may move the typed-lint cost figure; the "2.0-2.2x a bare tsc --noEmit" measurement was not re-run (see table).

### 5. ESLint core

Releases 10.10.0 (2026-09-04) to 10.15.0 (2026-11-13) contain only per-rule feature and fix commits (for example `no-invalid-this` handling of TS type assertions in 10.15.0, `no-shadow` import-kind in 10.15.0); none touch rules named in this pair. v10 is the current line and v9.39.5 (2026-07-10) is maintenance ([ESLint releases](https://github.com/eslint/eslint/releases)). The plugin peer range `^8.57.0 || ^9.0.0 || ^10.0.0` includes v10.

### 6. Plugins

- eslint-plugin-import-x: 4.18.0 (2026-11-06) and 4.18.1 (2026-11-09), both `extensions`-rule and loader fixes; 4.18.1 stops loading the optional `@typescript-eslint/utils` peer at runtime. README at 4.18.1 still documents `import-x/resolver-next` as flat-config only and `import-x/resolver` as the legacy-config setting ([README](https://github.com/un-ts/eslint-plugin-import-x), [releases](https://github.com/un-ts/eslint-plugin-import-x/releases)). TS-MOD-11 unchanged. The "inert against import-x >= 4.5.0" sentence was not re-verified: the README no longer states it, so it stays "could not determine" in this window (no change upstream found).
- eslint-import-resolver-typescript: latest 4.4.5 published 2026-06-01, before the window ([npm](https://www.npmjs.com/package/eslint-import-resolver-typescript)). Unchanged.
- eslint-plugin-security: 4.1.0 (2026-09-27) added the `detect-invisible-characters` rule, which is in `configs.recommended` at `warn`; 4.2.0 added TypeScript types; 4.2.1 fixes `RegExp()` without `new` in regexp rules ([releases](https://github.com/eslint-community/eslint-plugin-security/releases)). `security.configs.recommended` still exists (flat, name `security/recommended`) and still includes `detect-non-literal-regexp`, `detect-unsafe-regex`, `detect-child-process` at `warn`. README still says it "finds a lot of false positives which need triage by a human" ([package README at 4.2.1](https://www.npmjs.com/package/eslint-plugin-security)). TS-GATE-14 concession unchanged. security.md could mention the new recommended rule.
- eslint-plugin-regexp: 3.3.0 to 3.3.3 (2026-09-04 to 2026-11-01). `configs["flat/recommended"]` still exported in the 3.3.3 type definitions; 3.3.2 only added names to flat configs ([releases](https://github.com/ota-meshi/eslint-plugin-regexp/releases)). Unchanged.
- eslint-plugin-react: latest 7.37.5 (2025-04-03), no release in the window. `no-danger` absent from the recommended config (only `no-danger-with-children` is), checked in the 7.37.5 package `index.js`. Unchanged. `@eslint-react/eslint-plugin` did not displace it in the pair's usage but moved fast: 5.30.0 (2026-11-10) added an `all-type-checked` preset ([releases](https://github.com/Rel1cx/eslint-react/releases)); no claim in the pair names it.
- eslint-plugin-vue: 10.11.0 to 10.12.1 (2026-09-06 to 2026-11-09), new rules and options only. `vue/no-v-html` is `"warn"` in `flat/vue3-recommended` and `"error"` in `flat/vue3-recommended-error`, identical to 10.10.0 ([npm package 10.12.1 dist/configs](https://www.npmjs.com/package/eslint-plugin-vue)). browser.md "on by default" holds (as a warning); security.md line 187 "already error in ... recommended config" is wrong and was wrong at baseline.
- eslint-plugin-jsx-a11y: latest 6.10.2 (2024-10-26), no release. Unchanged.

## Claim table

| Claim | Verdict | Detail and source |
|---|---|---|
| gate.md "measured 2026-08-29 against typescript-eslint 8.68.0" | changed | Restate as measured 2026-11-27 against 8.74.0 for count claims; [v8.74.0](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.74.0), 2026-11-23 |
| TS-GATE-13 "25 rules shadow a core rule" and the two renames | unchanged | 25 at both tags; renames in place; [rules dir](https://github.com/typescript-eslint/typescript-eslint/tree/v8.74.0/packages/eslint-plugin/src/rules) |
| TS-GATE-15 "13 of the 61 type-aware rules ship in no preset" | changed | 13 of the 64; 3 new type-aware rules all in `strict-type-checked`; [configs](https://github.com/typescript-eslint/typescript-eslint/tree/v8.74.0/packages/eslint-plugin/src/configs/flat) |
| allowDefaultProject row, 8 files and option name | unchanged | [createProjectService.ts](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/project-service/src/createProjectService.ts) |
| TS-GATE-02 literal `tsconfig.json` discovery | unchanged | [useProgramFromProjectService.ts](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/typescript-estree/src/useProgramFromProjectService.ts) |
| typed-lint cost "2.0-2.2x a bare tsc --noEmit" | could not determine | Not re-measured; 8.72.1 ([release](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.72.1)) changed Program reuse in single-run mode, so the figure may have moved. Treat as a dated measurement |
| rules file "Roughly fifty rules need a type checker, off by default" | changed (reword) | 64 need a type checker, 51 of those are in a type-checked preset; align with gate.md |
| TS-ASYNC-01 `strict-void-return` only in `all` | unchanged | configs at v8.74.0 |
| TS-ASYNC-01 no-misused-promises "all six sub-options" | unchanged (clarify) | six `checksVoidReturn` options; new `checksConditionals.flagUnions` is separate |
| TS-ASYNC-02 `ignoreVoid: true` default | unchanged | [no-floating-promises.ts](https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/src/rules/no-floating-promises.ts) |
| types.md `switch-exhaustiveness-check`, `method-signature-style`, `ban-ts-comment` `descriptionFormat` | unchanged | configs at v8.74.0 |
| TS-MOD-19 consistent-type-imports and no-import-type-side-effects only in `all` | unchanged | re-verified on 8.74.0; change "8.61.0" to "8.74.0" if the sentence is touched |
| TS-MOD-11 `import-x/resolver-next` + `createTypeScriptImportResolver` | unchanged | [import-x README](https://github.com/un-ts/eslint-plugin-import-x) |
| TS-MOD-11 legacy settings "inert against import-x >= 4.5.0" | could not determine | not stated in current README; no upstream change found |
| `security.configs.recommended` | unchanged (one rule added) | `detect-invisible-characters` since [4.1.0](https://github.com/eslint-community/eslint-plugin-security/releases) |
| `regexp.configs["flat/recommended"]` | unchanged | 3.3.3 types |
| `react/no-danger` opt-in, in no recommended config | unchanged | react 7.37.5, no release in window |
| `vue/no-v-html` "on by default" | unchanged | `warn` in recommended |
| security.md line 187 "already error in recommended" | changed (pre-existing error) | `warn` in `recommended`, `error` only in `recommended-error`; not a window change |
| TS-GATE-14 security README false-positive concession | unchanged | README line 7 |

## Normative guidance candidates

1. Restate the pin as typescript-eslint 8.74.0 and the measurement date 2026-11-27 in gate.md, and use 64 / 13 / 45 / 25 as the counts. Rationale: counts move with every rule addition. Verification: re-run the counting script described above against the pinned tag (`grep -l 'requiresTypeChecking: true' packages/eslint-plugin/src/rules/*.ts | wc -l`).
2. Keep the "re-read the generated config source at your pinned tag" instruction. Rationale: 3 rules were added in 13 weeks, all landing in `strict-type-checked`, so strict users get new errors on upgrade. Verification: `grep -c "@typescript-eslint/" dist/configs/flat/strict-type-checked.js` before and after a bump.
3. Add one sentence to the dependency-bump guidance: a typescript-eslint minor can add rules to `strict-type-checked` (8.70.0, 8.71.0, 8.73.0 each did), so a bump of a strict-typed repo is a lint-triage event, not a no-op. Verification: run the lint on the bump commit and read new rule ids in the output.
4. Correct security.md line 187 to: `vue/no-v-html` is `warn` in eslint-plugin-vue `recommended` and `error` only in `recommended-error`; set it to `error` explicitly. Rationale: a warn does not fail a `--max-warnings 0`-less gate. Verification: `grep -n "no-v-html" node_modules/eslint-plugin-vue/dist/configs/flat/vue3-recommended.js`.
5. Optional: mention `security/detect-invisible-characters` (new in eslint-plugin-security 4.1.0) as part of `recommended` in the supply-chain or Trojan-source discussion, if the pair has one. Verification: `grep detect-invisible-characters node_modules/eslint-plugin-security/index.js`.

## AI-agent angle

- An agent trained before this window will list 61 type-aware rules and miss `no-unsafe-enum-assignment`, `no-generated-empty-object-type` and `no-unsafe-class-instance-assignment`; the smallest check is the grep in candidate 1.
- An agent will assume the peer range admits TypeScript 7; it does not (`<6.1.0`). Check: `npm view typescript-eslint@8.74.0 peerDependencies`.
- An agent will assume `vue/no-v-html` is an error in `recommended`; it is a warning. Check the grep in candidate 4.

## Contested / evolving

- TypeScript 7 native support: typescript-eslint 8.73.0 (2026-11-16) added an experimental `EXPERIMENTAL_backend` option; the stable peer range still stops below 6.1.0. Trend: experimental first, range widening later. As of 2026-11-27.
- `@eslint-react/eslint-plugin` is releasing near-daily (5.28 to 5.30 in five weeks) while `eslint-plugin-react` has had no release since 2025-04; this is a drift signal for any React claim, though no claim here names the former.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/typescript-eslint/typescript-eslint/releases | release list and notes 8.69.0 to 8.74.0 | 2026-08-31 to 2026-11-23 | version pin, new rules, project-service changes |
| https://github.com/typescript-eslint/typescript-eslint/tree/v8.74.0/packages/eslint-plugin/src/configs/flat | generated flat presets | 2026-11-23 | preset membership |
| https://github.com/typescript-eslint/typescript-eslint/tree/v8.74.0/packages/eslint-plugin/src/rules | rule sources | 2026-11-23 | type-aware count |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/package.json | plugin peers | 2026-11-23 | peer range |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/typescript-estree/package.json | estree peers | 2026-11-23 | native peer |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/project-service/src/createProjectService.ts | project service defaults | 2026-11-23 | threshold 8, default tsconfig |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/typescript-estree/src/useProgramFromProjectService.ts | not-found message | 2026-11-23 | TS-GATE-02 |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/src/rules/no-misused-promises.ts | rule source | 2026-11-23 | sub-options |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/src/rules/no-floating-promises.ts | rule source | 2026-11-23 | ignoreVoid |
| https://github.com/typescript-eslint/typescript-eslint/blob/v8.74.0/packages/eslint-plugin/src/rules/ban-ts-comment.ts | rule source | 2026-11-23 | descriptionFormat |
| https://registry.npmjs.org/typescript-eslint | npm dist-tags and times | 2026-11-27 | no v9 |
| https://github.com/eslint/eslint/releases | ESLint v10.10 to v10.15 | 2026-09-04 to 2026-11-13 | v10 status |
| https://github.com/eslint/eslint/tree/v10.15.0/lib/rules | core rule names | 2026-11-13 | shadowing count |
| https://github.com/un-ts/eslint-plugin-import-x/releases | import-x 4.18.x | 2026-11-06 to 2026-11-09 | resolver-next |
| https://github.com/eslint-community/eslint-plugin-security/releases | security 4.1.0 to 4.2.1 | 2026-09-27 to 2026-10-30 | recommended config |
| https://github.com/ota-meshi/eslint-plugin-regexp/releases | regexp 3.3.x | 2026-09-04 to 2026-11-01 | flat/recommended |
| https://github.com/vuejs/eslint-plugin-vue/releases | vue 10.11 to 10.12.1 | 2026-09-06 to 2026-11-09 | no-v-html |
| https://github.com/Rel1cx/eslint-react/releases | @eslint-react 5.30.0 | 2026-11-10 | react displacement check |
| https://registry.npmjs.org/eslint-plugin-react | version history | latest 2025-04-03 | no release |
| https://registry.npmjs.org/eslint-plugin-jsx-a11y | version history | latest 2024-10-26 | no release |
| https://registry.npmjs.org/eslint-import-resolver-typescript | version history | latest 2026-06-01 | no window release |
| npm tarballs eslint-plugin-security@4.2.1, eslint-plugin-vue@10.12.1 and 10.10.0, eslint-plugin-regexp@3.3.3, eslint-plugin-import-x@4.18.1, eslint-plugin-react@7.37.5 | package contents | 2026-11 | config membership read from shipped code |

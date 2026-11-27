---
title: Biome delta, v2.5.11 to v2.6.9, for the typescript-quality pair
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 21
---

# Biome delta, v2.5.11 to v2.6.9

This is a delta update. Anything not listed as changed stays as the baseline wrote it.

## Version pin

The latest Biome CLI release as of 2026-11-27 is `@biomejs/biome@2.6.9`, published 2026-11-24. The releases after 2.5.11 (published 2026-08-27) are 2.5.12 (2026-09-03), 2.5.13, 2.5.14, 2.5.15 (2026-09-30), 2.6.2 (2026-10-21), 2.6.3 (2026-10-24), 2.6.4, 2.6.5, 2.6.6, 2.6.7, 2.6.8 and 2.6.9. The GitHub release list has no 2.6.0 or 2.6.1 tag and no 3.0. The release page at https://github.com/biomejs/biome/releases carries no Biome 3.0. New pin text: "Biome v2.6.9 (2026-11-24)". The baseline "measured 2026-08-29 against v2.5.11" should read "re-measured 2026-11-27 against v2.6.9", with the baseline measurement noted where a claim was wrong from the start.

Method note: release bodies were read through `gh api /repos/biomejs/biome/releases` (all 12 releases after 2.5.11), and behavior was measured by installing `@biomejs/biome@2.5.11` and `@biomejs/biome@2.6.9` from npm (plus 2.5.15, 2.6.2 and 2.6.5 for the config test) and running them. Where a web page summary and a measurement disagree, the measurement is used and said so.

## Verdicts per claim

### 1. Version-bound header, gate.md
Changed. Old: "measured 2026-08-29 against ... Biome v2.5.11". New fact: current is v2.6.9 (2026-11-24). Source: https://github.com/biomejs/biome/releases

### 2. TS-GATE-09 and Biome block: "An ungrouped key is silently ignored, not a config error"
Changed, and it was wrong at the baseline too. Measured on 2.5.11, 2.5.15, 2.6.2, 2.6.5 and 2.6.9, every one of these shapes fails with `Found an unknown key` and `Biome exited because the configuration resulted in errors`:
- `linter.rules.noFloatingPromises` (ungrouped), also inside `overrides[].linter.rules`.
- `linter.rules.style.noFloatingPromises` (right name, wrong group).
- `linter.rules.nursery.useThrowOnlyError` (wrong group, the other direction).
- A misspelled key inside the correct group.

So no version floor exists: there is no version at which the key was silently ignored among those tested. Date of upstream change: none found (behavior identical from 2.5.11). The silent-ignore trap as written is gone or never existed in the tested shapes. Proposed rewrite of TS-GATE-09 rationale: "Biome validates rule keys against the group schema. A key written ungrouped or under the wrong group aborts every command with `Found an unknown key`, so the failure is loud. The real trap is the reverse of ESLint's flat namespace: look the group up per rule, and copy the name from the rule's own page." Verification: `biome lint --max-diagnostics=1 <file>` after the edit; a configuration error means the key sits in the wrong place; also run `biome check` once in CI, which fails on config errors. The "compare diagnostic count before and after" verification should be dropped or demoted to a secondary check that a rule actually fires on a known-bad fixture (for example `async function f(){}; f();` for `nursery.noFloatingPromises`). Sources: measurement above; group list printed by Biome itself: recommended, preset, a11y, complexity, correctness, nursery, performance, security, style, suspicious. One side effect to note: on 2.6.9 `preset` appears as a rules key next to `recommended`.

### 3. TS-GATE-10 and jsonc example: rule groups and severities
Group names did not change for these rules at 2.6.9. The 2.6.2 promotion of 59 nursery rules (https://github.com/biomejs/biome/releases, release 2.6.2, PR 12108) does not include any of them. Measured and read from rule pages:

| Rule | Group | Default severity | Domain | Since | Source |
|---|---|---|---|---|---|
| noFloatingPromises | nursery | information | types | v2.0.0 | https://biomejs.dev/linter/rules/no-floating-promises/ |
| noMisusedPromises | nursery | information | types | v2.1.0 | https://biomejs.dev/linter/rules/no-misused-promises/ |
| useThrowOnlyError | style | warning | none stated | v1.8.0, not recommended | https://biomejs.dev/linter/rules/use-throw-only-error/ |
| noUnsafeTypeAssertion | nursery | error | none stated on the page | v2.5.9 | https://biomejs.dev/linter/rules/no-unsafe-type-assertion/ |
| useReadonlyClassProperties | style | information | none stated | v2.1.0, not recommended | https://biomejs.dev/linter/rules/use-readonly-class-properties/ |

Verdict: unchanged for the group names (`nursery.noFloatingPromises`, `nursery.noMisusedPromises`, `style.useThrowOnlyError`). Note: the baseline text does not state default severities for the nursery rules; they are information, so setting `"error"` is a real change from default. Reproduced: `nursery.noFloatingPromises` fires on 2.5.11 and 2.6.9 (`lint/nursery/noFloatingPromises`).

Other behavior changes in the window that matter to this claim: 2.6.9 makes `noFloatingPromises` detect promises returned from generic class methods (PR 13184); 2.6.8 adds type narrowing for unwritten locals/parameters (PR 12145); 2.6.5 or earlier makes `noMisusedPromises` also report Promise-returning callbacks passed to `find` and `every`. These widen coverage only. Source: release bodies for 2.6.5, 2.6.8, 2.6.9.

### 4. "Biome's own team measures noFloatingPromises at ~75% of the tsc-backed rule's catch rate"
Could not determine. The rule page does not contain the figure, and no release note in the window mentions it. The window's notes show continuing coverage gains (above), so the figure may be stale. Recommend rewording to drop the number: "partial coverage of an unawaited promise beats none; the rule is nursery and its coverage grows release by release."

### 5. TS-GATE-12: `biome migrate eslint` and the rule-sources cross-reference "omits all four"
Changed in two parts.
- The published rules-sources page, https://biomejs.dev/linter/rules-sources/, still omits no-floating-promises, no-misused-promises, no-unsafe-type-assertion and prefer-readonly (grep of the fetched HTML: zero hits for each; only-throw-error appears). It also omits no-unsafe-return, although the new rule page for noUnsafeReturn lists the source. So the page is incomplete; unchanged.
- The migrate command does NOT omit all four. Measured on both 2.5.11 and 2.6.9 with a legacy `.eslintrc.json` containing all typescript-eslint rules: plain `biome migrate eslint --write` ports only `style.useReadonlyClassProperties` (so the baseline claim was wrong for that rule at 2.5.11). Adding `--include-inspired` also ports `style.useThrowOnlyError`. Adding `--include-nursery` also ports `nursery.noFloatingPromises` and `nursery.noMisusedPromises`, and on 2.6.9 `nursery.noUnsafeReturn`. `noUnsafeTypeAssertion` is not ported in any combination, on either version. (The two flags cannot be combined in one run in the form `--include-nursery --include-inspired` with the shell argument layout tried; run them as separate flags per the usage line `biome migrate eslint [--include-inspired] [--include-nursery]`.)
Proposed text: "The rule-sources page and a default `biome migrate eslint` run omit noFloatingPromises, noMisusedPromises and noUnsafeTypeAssertion; `--include-nursery` ports the first two, and noUnsafeTypeAssertion is never ported. useReadonlyClassProperties is ported by default." Verification: after migration, grep `biome.json` for the four names (existing block) and add the flag rerun. Sources: measurement; https://biomejs.dev/guides/migrate-eslint-prettier/ (documents only `--include-inspired`, so the guide is also stale on `--include-nursery`).

### 6. TS-GATE-11: "no equivalent to no-unsafe-assignment ... in any group, at any severity"
Changed, partly. A new rule exists: nursery `noUnsafeReturn`, added in 2.6.3 (2026-10-24, PR 12422), source `@typescript-eslint/no-unsafe-return`, domain types, default severity information. Source: https://biomejs.dev/linter/rules/no-unsafe-return/ and the 2.6.3 release body. Measured on 2.6.9: `return JSON.parse(x)`-style `any` returns are flagged by `lint/nursery/noUnsafeReturn`. Still absent (unknown key at 2.6.9, nursery group): `noUnsafeAssignment`, `noUnsafeMemberAccess`, `noUnsafeCall`, `noUnsafeArgument`; the pages for no-unsafe-assignment return 404. Other noUnsafe* rules in the window are unrelated (`noUnsafePlusOperands`, `noUnsafeSqliteInterpolation` in 2.6.9, `noUnsafeUnaryMinus`). New text: "Biome has no equivalent to no-unsafe-assignment, no-unsafe-member-access, no-unsafe-call or no-unsafe-argument at v2.6.9. no-unsafe-return has a nursery counterpart, `nursery.noUnsafeReturn` (since 2.6.3)." The "On Biome repos the standing check is a hand read" stays for the four missing ones; for returns add `nursery.noUnsafeReturn` to the Biome block and TS-GATE-10 set. Verification: `biome lint` on a fixture returning `any` shows `lint/nursery/noUnsafeReturn`.

### 7. TS-GATE-16: noExcessiveCognitiveComplexity and noExcessiveLinesPerFunction "off by default (15 and 50)"
Unchanged. Both complexity group, not recommended, default severity information, defaults 15 and 50. Sources: https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/ and https://biomejs.dev/linter/rules/no-excessive-lines-per-function/.

### 8. TS-GATE-10: "any `types`-domain rule triggers a full-project scan"
Unchanged. Domains page: Types "will scan the entire project, and it will enable the inference engine to resolve and flat types", with a performance warning. Project: "will scan the entire project." Source: https://biomejs.dev/linter/domains/. Neither is auto-enabled by dependency. Added note: 2.6.2 and 2.6.x rewrote inference to be on-demand, and 2.6.2 added `biome lint --profile-type-inference` to see which rule costs time; useful as the TS-GATE-10 timing verification.

### 9. modules.md TS-MOD-12: `project` domain rules and `suspicious.noImportCycles`
Unchanged. `noImportCycles`: suspicious, warning, project domain, not recommended, since v2.0.0 (https://biomejs.dev/linter/rules/no-import-cycles/). `noUndeclaredDependencies`: correctness, error, project, not recommended. `noUnresolvedImports`: correctness, error, project, not recommended. `noPrivateImports`: correctness, warning, project, recommended. Sources: https://biomejs.dev/linter/rules/no-undeclared-dependencies/, https://biomejs.dev/linter/rules/no-unresolved-imports/, https://biomejs.dev/linter/rules/no-private-imports/. Additions: nursery `noUnresolvedDefaultImport` (project domain, 2.6.7); `noUnresolvedImports` now reports default imports from `export *`-only modules (2.6.7) and stopped reporting names re-exported from CommonJS or non-JS files (2.6.8); `noUndeclaredDependencies` no longer reports imports resolved through `compilerOptions.paths` (2.6.7). These are behavior refinements; no wording change needed beyond optionally mentioning the paths fix.

### 10. TS-MOD-18: `useImportType` in `auto` style
Unchanged. Style group, warning, recommended, `style` option defaults to `auto`. 2.6.9 only fixes Astro templates. Source: https://biomejs.dev/linter/rules/use-import-type/.

### 11. TS-MOD-15: "Biome has no rule covering this shape at all"
Could not determine. The shape is not restated in the commission, and the window added many nursery rules (for example `noRedundantTypeConstituents`, `noDuplicateTypeConstituents`, `noMisusedSpread`, `noArrayDelete`, `noUselessDefaultAssignment`). The author of the pair should re-grep the 2.6.x release bodies for the specific shape before keeping the sentence.

### 12. observability.md TS-OBS-01: `suspicious/noConsole`
Unchanged. Suspicious, warning, not recommended. Source: https://biomejs.dev/linter/rules/no-console/. Not promoted or moved.

### 13. browser.md TS-WEB-06: Biome `a11y` group
Unchanged. The `a11y` group is still a valid key at 2.6.9 (listed in Biome's own known-keys output and used in the 2.6.2 release examples). New nursery a11y rule `noDisabledAttribute` (2.6.7). Source: release 2.6.7 body and the measured config error list.

## Normative candidates

1. Rewrite TS-GATE-09 as above. Rationale: the baseline claim is false and would send agents to count diagnostics instead of reading a hard error. Verification: `biome lint <file>` exits non-zero with `Found an unknown key` for a misplaced key; grep `Found an unknown key` in CI logs.
2. Add `nursery.noUnsafeReturn` (types domain, since 2.6.3) to TS-GATE-10 as SHOULD, overridable, with the same nursery caveat. Rationale: it is the first typescript-eslint `no-unsafe-*` counterpart. Verification: grep `noUnsafeReturn` in `biome.json`, and `biome lint` on a fixture returning `any`.
3. Reword TS-GATE-12 per verdict 5. Verification: `biome migrate eslint --include-nursery` into a scratch copy and grep the four names.
4. Drop the "~75%" figure from TS-GATE-10 unless a primary source is found.
5. Raise the version floor note on every claim that depends on a nursery rule: nursery rules can be renamed, promoted or removed in a minor release (2.6.2 promoted 59), so grep the group name in each verification block and state the version.

## Not fetched or not determinable

The CHANGELOG pages were truncated by the fetch tool; the GitHub release bodies were read in full instead. The Biome blog post for 2.6 (https://biomejs.dev/blog/biome-v2-6/) mentions the 59-rule promotion but nothing on config validation, migrate or type-aware rules. Rule-sources "domain" for `noUnsafeTypeAssertion`, `useThrowOnlyError`, `useReadonlyClassProperties`: pages state none.

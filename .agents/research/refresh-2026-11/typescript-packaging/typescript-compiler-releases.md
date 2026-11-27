---
title: TypeScript compiler releases, delta 2026-08-29 to 2026-11-27
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 5
---

# TypeScript compiler releases, delta 2026-08-29 to 2026-11-27

This is a delta update against the 2026-08-29 baseline. Anything not listed as changed stays as it is. Sources fetched: the npm registry (`npm view typescript dist-tags time`), the typescript-go GitHub releases page, the typescript-go repository README, the TypeScript devblog index with the 7.1 Beta announcement, and the TSConfig `strict` reference page. Behavior was also checked by running typescript 6.0.3, 7.0.2 and 7.1.0-beta through `npx` against throwaway tsconfig files in the scratchpad.

## Summary

There is no new stable release in the window. The npm `latest` tag is still 7.0.2 (published 2026-07-08). There is no 7.0.x patch after 7.0.2 and no 6.0.x release after 6.0.3 (2026-04-16). The only new line is TypeScript 7.1: `7.1.0-beta` published 2026-10-20, with nightly `7.1.0-dev.*` builds through 2026-11-27 (the `next` tag). The 7.1 Beta post says a release candidate follows "in about a month" and a final release "shortly thereafter"; it gives no date. So 7.1 is not stable as of 2026-11-27. Every claim at risk is unchanged. One upstream structural change: the typescript-go repository was archived on 2026-09-01 and development continues in microsoft/TypeScript.

## Claim-by-claim result

1. Compiler versions as of 2026-08-29 (TS 7.0 current stable, 6.0 a common floor): unchanged in substance. Stable is still 7.0.2, 6.0.3 is still the last 6.0 release. Only the stamp needs refreshing. Sources: npm dist-tags and time (`latest: 7.0.2`, `beta: 7.1.0-beta`, `rc: 7.0.1-rc`); https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ (Oct 20, 2026).

2. `strict: true` and its flag list: unchanged. The TSConfig reference (https://www.typescriptlang.org/tsconfig/#strict) still lists exactly nine flags: alwaysStrict, strictNullChecks, strictBindCallApply, strictBuiltinIteratorReturn (5.6), strictFunctionTypes, strictPropertyInitialization, noImplicitAny, noImplicitThis, useUnknownInCatchVariables. The 7.1 Beta post mentions no change to `strict`. The page warns that future versions may add checks under `strict`. Nuance, not new in the window: the page lists the `strict` default as `true` (a TS 6.0 default change), and `tsc --init` from 7.0.2 writes `"strict": true`. The page does not say what `tsc --init` wrote since 5.0, so that "since 5.0" wording could not be confirmed from this page: could not determine. The `--init` output from 7.0.2 also writes `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedSideEffectImports`, `moduleDetection: force`, `skipLibCheck`, `types: []`, `module: nodenext`, `target: esnext`. This is a possible follow-up for the shape table, not something that changed in the window.

3. Version-Gated Flags table, run against real compilers:
   - `importsNotUsedAsValues` on 6.0.3: `TS5102: Option 'importsNotUsedAsValues' has been removed ... Use 'verbatimModuleSyntax' instead.` Unchanged. On 7.0.2 and 7.1.0-beta the same key reports `TS5023: Unknown compiler option`, not TS5102. This is a small refinement: TS5102 is the 6.x code, and 7.x treats the key as unknown. Both are hard errors, so the rule's behavior holds; the "TS5102 and exit 2" text is accurate only for 6.0.
   - `moduleResolution: node10` on 6.0.3: `TS5107 ... deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption "ignoreDeprecations": "6.0" to silence this error`. Note that on 6.0.3, `ignoreDeprecations: "6.0"` does silence it. On 7.0.2 and 7.1.0-beta: `TS5108: Option 'moduleResolution=node10' has been removed`, and adding `"ignoreDeprecations": "6.0"` does not help (verified). Unchanged, with one nuance: 7.0.2 emits TS5108 directly; TS5107 is the 6.0 message, and the 6.0 escape does exist on 6.0. The table text "no ignoreDeprecations escape" holds for 7.x only.
   - `verbatimModuleSyntax` 5.0, `isolatedDeclarations` 5.5, `noUncheckedSideEffectImports` 5.6, `strictBuiltinIteratorReturn` 5.6, `erasableSyntaxOnly` 5.8: no release in the window changed them. Not re-fetched per flag; no release notes in the window mention them. Unchanged.
   - Legal values `node16`, `nodenext`, `bundler`: unchanged on 7.0.2 and 7.1.0-beta (`nodenext` and `bundler` accepted; `node16` accepted only with `module: node16`, otherwise TS5110). The rule could say `node16` pairs only with `module: node16`.

4. Unknown `compilerOptions` key is a hard error: unchanged under tsgo. Verified on 7.0.2 and 7.1.0-beta: `error TS5023: Unknown compiler option 'bogusKey'` for a `tsc -p` run. Caveat: `tsc --showConfig` does not report it; the error appears only on a real `tsc -p` run, so a verification built on `--showConfig` alone will not catch an unknown key.

5. `tsc --showConfig -p <tsconfig>` for TS-CFG-01, -03, -04, -05, -06: still supported on 7.0.2 and 7.1.0-beta, and it still prints implied values (`module: nodenext` printed `moduleResolution: nodenext` and `moduleDetection: force`). Two limits to record. It does not print the individual flags implied by `strict` (only `"strict": true`), so a check for `strictNullChecks` must read `strict`. It also does not validate: `moduleResolution: node10` printed as `"node"` and exit 0 on 7.0.2 with no TS5108 (the error needs a real compile). The 7.1 Beta post lists no change to `--showConfig`. The 7.1 Beta post also says the API `parseCommandLine` does not discover tsconfig or support `--project`; that is the programmatic API, not the CLI.

6. Shape table: no change found. Neither the 7.1 Beta post nor the compilers changed the meaning of `nodenext` or `bundler`/`esnext`. No change to defaults for `noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedModules`, `skipLibCheck`, `allowUnreachableCode`, `allowUnusedLabels`. The `--init` output in point 2 is the only new signal. Could not determine whether `allowUnreachableCode` and `allowUnusedLabels` defaults changed: no source states it, and the 7.1 Beta post says "No other default changes".

## New rows and notes for the Version-Gated Flags table

No new deprecation or removal scheduled for 7.x was found. The 7.1 Beta post lists "None mentioned" for deprecations and removals. New 7.1 items that are additions, not gated rows: `--target es2026` and `--lib es2026` stable; new CLI flag `--runExternalCode`; new top-level (outside `compilerOptions`) `contentMappers` key. The 7.1 Beta post also warns of stricter distributive conditional type checking and DOM lib changes, which can produce new type errors on upgrade.

## Normative candidates

- Replace the stamp "as of 2026-08-29" with "as of 2026-11-27". Rationale: the facts were re-verified on that date. Verification: `npm view typescript dist-tags` shows `latest` 7.0.2.
- Add a clause that TS 7.1 is in beta (7.1.0-beta, 2026-10-20) and not stable, so a rule must not assume 7.1 features. Rationale: pins that adopt `next` or `beta` get unreleased behavior. Verification: `npm view typescript dist-tags --json | jq .latest`.
- Reword the importsNotUsedAsValues row: TS5102 on 6.0, TS5023 unknown option on 7.x; both exit nonzero. Verification: `npx -p typescript@7.0.2 tsc -p <config> --noEmit`.
- Reword the moduleResolution row: 6.0 gives TS5107 and `ignoreDeprecations: "6.0"` silences it; 7.x gives TS5108 with no escape. Verification: `tsc -p <config> --noEmit`, check for TS5108.
- Add to TS-CFG verification text: `--showConfig` does not validate keys or removed values, so run `tsc -p <config> --noEmit` too. Verification: a config with a bogus key exits 0 under `--showConfig` and errors under `-p`.
- Optional: note typescript-go (`tsgo`) is archived since 2026-09-01; the compiler ships as `typescript` on npm. Source: https://github.com/microsoft/typescript-go README.

## Replacement stamp

"Compiler versions as of 2026-11-27: TS 7.0.2 is the current stable release (7.1 is in beta), 6.0.3 is a common working floor."

## Limits

The `typescript-go` releases page lists only v7.0.2 (2026-07-08) and a vsix test tag, with no release notes. The 7.0.0 and 7.0.1 notes, the per-flag TSConfig pages, and any microsoft/TypeScript release notes for 7.1 beta were not fetched. Flag-introduction versions (5.0 to 5.8) were not re-checked against flag pages since nothing in the window touches them.

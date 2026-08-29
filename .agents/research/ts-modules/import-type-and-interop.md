---
title: import type Discipline and ESM/CJS Interop for the AI-Agent TypeScript Rule Set
topic: ts-modules/import-type-and-interop
agent: research
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 13
scope: >
  Covers verbatimModuleSyntax (what it changes about emit, its relationship to
  isolatedModules, whether it should be a fleet floor), the deprecation/removal
  timeline of importsNotUsedAsValues/preserveValueImports, the CJS-format vs
  ESM-format traps under NodeNext/Node16, typescript-eslint's
  consistent-type-imports/no-import-type-side-effects, and whether
  eslint-import-resolver-typescript resolves NodeNext correctly. Measured
  against all nine fleet repos under /home/mherwig/dev, plus a live
  reproduction against real tsc 6.0.3 for every non-obvious compiler claim.
  Does not cover general moduleResolution selection (see resolution-per-shape.md),
  import-cycle/barrel/extraneous-dependency rules (see import-graph.md), or
  publish-time dual-CJS/ESM packaging (see publish-verification.md).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Three flags collapsed into one: the 5.0 → 5.5 → 6.0 timeline](#1-three-flags-collapsed-into-one-the-50--55--60-timeline)
   2. [What verbatimModuleSyntax actually changes about emit](#2-what-verbatimmodulesyntax-actually-changes-about-emit)
   3. [isolatedModules vs verbatimModuleSyntax: not the same enforcement](#3-isolatedmodules-vs-verbatimmodulesyntax-not-the-same-enforcement)
   4. [The CJS-format trap, both directions — one measured, one debunked](#4-the-cjs-format-trap-both-directions--one-measured-one-debunked)
   5. [Bundlers that erase types themselves: esbuild, Vite 8/Oxc](#5-bundlers-that-erase-types-themselves-esbuild-vite-8oxc)
   6. [The no-import-type-side-effects footgun: measured, one live instance](#6-the-no-import-type-side-effects-footgun-measured-one-live-instance)
   7. [consistent-type-imports is in no typescript-eslint preset but "all" — verified from the installed plugin](#7-consistent-type-imports-is-in-no-typescript-eslint-preset-but-all--verified-from-the-installed-plugin)
   8. [Fleet measurement: who actually has verbatimModuleSyntax — correcting the "2 of 13" baseline](#8-fleet-measurement-who-actually-has-verbatimmodulesyntax--correcting-the-2-of-13-baseline)
   9. [Empirical test: what breaks if the 7 non-flag repos turn it on](#9-empirical-test-what-breaks-if-the-7-non-flag-repos-turn-it-on)
   10. [eslint-import-resolver-typescript on NodeNext: settled, with a live fixture](#10-eslint-import-resolver-typescript-on-nodenext-settled-with-a-live-fixture)
   11. [The six rule files' claims, checked against the six tsconfigs](#11-the-six-rule-files-claims-checked-against-the-six-tsconfigs)
   12. [require()/import = require() in the fleet: measured zero](#12-requireimport--require-in-the-fleet-measured-zero)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **DECISION: `verbatimModuleSyntax` becomes a fleet floor for every NodeNext-resolution and Bundler-resolution repo (7 of 9), not for Node16 CJS-format repos without `"type": "module"` (vscode-ocx's shape) — verify per-shape, not blindly fleet-wide.**
- Measured directly against real `tsc` on 3 of 7 non-flag repos plus a filtered cross-check on a 4th: `grimoire-indexer` (NodeNext) → **0 errors**; `ocx-catalog` (NodeNext) → **0 verbatim-specific errors** (121 lines of output, all pre-existing missing-`@types/node` noise); `fma` app+node (Bundler) → **0 errors**; `grimoire-vscode` (Bundler) → **0 verbatim-specific errors**. `vscode-ocx` (Node16, no `"type":"module"`) → **62 errors**, 100% `TS1295`/`TS1287` from writing ES `import`/`export` syntax in a file `tsc` classifies as CommonJS-format.
- `verbatimModuleSyntax` replaced two confusing flags: `importsNotUsedAsValues` and `preserveValueImports`, both deprecated in TS 5.0, no-op as of 5.5, and **directly confirmed removed by running tsc 6.0.3**: `error TS5102: Option 'importsNotUsedAsValues' has been removed... Use 'verbatimModuleSyntax' instead.` ([source](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)).
- `isolatedModules` alone does **not** force `import type` on the import side — only on re-exports (`TS1205`). Directly measured: a plain `import { MyType } from "./types"` with `isolatedModules:true` and no `verbatimModuleSyntax` compiles clean (exit 0); adding `verbatimModuleSyntax` turns the same line into `TS1484`. Treat these as two different, non-overlapping guarantees, not a stronger/weaker pair.
- **Correction of a prior-wave established fact**: `verbatimModuleSyntax` is set in **3 repos, not 2** — `setup-ocx/tsconfig.json`, `kate-middlechild/tsconfig.base.json`, **and `creeptd-ng/web/tsconfig.json`** (present since commit `573db9fa`, 2026-05-30, three months before this dive). Effective count across the fleet's 13 real tsconfigs is **5 of 13** once inheritance is traced — `kate-middlechild/packages/core` inherits it from `tsconfig.base.json`, but **`kate-middlechild/packages/web` does not**, because it extends `astro/tsconfigs/strict` instead of the repo's own base, silently dropping the flag inside an otherwise-enforcing monorepo.
- The brief's premised "CJS trap" (`verbatimModuleSyntax` forbids `import x = require()` in an ESM-format file) **did not reproduce** against real tsc 6.0.3: `import x = require("./mod.cjs")` and `import x = require("some-npm-pkg")` both compile cleanly inside a `.mts` file with `verbatimModuleSyntax:true`, emitting a synthesized `createRequire` shim. This contradicts the literal example on the TypeScript modules reference page ([source](https://www.typescriptlang.org/docs/handbook/modules/reference.html)) — verify against your own pinned `tsc`, not the handbook text, before repeating this claim.
- The trap that **does** reproduce runs the other direction: writing ES `import`/`export` syntax in a file `tsc` classifies as CommonJS-format (no `"type":"module"`, module: Node16/NodeNext) is a hard error under `verbatimModuleSyntax` (`TS1295`/`TS1287`) — this is exactly vscode-ocx's shape and the reason its 62-error count above is structural, not a handful of stray imports.
- **`no-import-type-side-effects` catches a real, live bug pattern**: `import { type A, type B } from "mod"` under `verbatimModuleSyntax` emits `import {} from "mod"` — a bare side-effect import where none was intended (verified: real tsc 6.0.3 emit). Fleet-wide grep for the exact all-inline-type-specifier shape found **one live instance**: `grimoire-vscode/src/test/extension.test.ts:23` (`import { type GrimoireApi } from '../extension';`). It's harmless today only because `grimoire-vscode` doesn't have `verbatimModuleSyntax` set — turning the flag on there without fixing this line silently introduces a runtime side-effect import.
- **`consistent-type-imports` and `no-import-type-side-effects` are absent from every typescript-eslint preset except `all`** — verified by grepping the actual installed plugin's `dist/configs/flat/*.js` (v8.61.0, `vscode-ocx/node_modules/@typescript-eslint/eslint-plugin`): neither rule appears in `recommended`, `recommended-type-checked`, `strict`, `strict-type-checked`, `stylistic`, or `stylistic-type-checked`. `setup-ocx` uses `strictTypeChecked` + `stylisticTypeChecked` and still does not get either rule for free.
- None of the fleet's six ESLint-based repos wire `@typescript-eslint/consistent-type-imports` or `@typescript-eslint/no-import-type-side-effects` explicitly. Only `kate-middlechild` enforces import-type discipline via a linter, through Biome's `useImportType: "error"` (`kate-middlechild/biome.json:51`).
- `creeptd-ng/web` has `verbatimModuleSyntax: true` in its tsconfig but **no ESLint installed at all** — its `package.json` `"lint"` script (`eslint src --ext .ts,.vue`) references a binary that isn't a declared dependency. Compiler-only enforcement here; the `no-import-type-side-effects` footgun is uncaught by anything in this repo.
- `eslint-import-resolver-typescript` **does** resolve NodeNext's `.js`-on-disk-as-`.ts` rewrite correctly, closing the open question left by `import-graph.md` §5 — confirmed with a live fixture (`eslint-import-resolver-typescript@4.4.5` + `eslint-plugin-import-x@4.17.1`, current `import-x/resolver-next` + `createTypeScriptImportResolver` API): `import { helper } from './util.js'` resolving to `util.ts` reports clean, `import { missing } from './does-not-exist.js'` correctly reports `Unable to resolve path to module`.
- Fleet-wide `require(` count is effectively **zero in real code**, not one: the single grep hit fleet-wide (`kate-middlechild/packages/web/astro.config.ts:24`) is inside a `//` comment describing a third-party library's internals, and the only other `module.exports`/`require(` matches are string literals inside test fixtures (`ocx-catalog/test/sources/path.test.ts:45`). No `export =` or `import x = require()` exists in any fleet repo's real source.
- 254 `import type` sites fleet-wide (own count, all `.ts`/`.tsx`/`.vue`, excluding `node_modules`/`dist`/`out`/worktrees) — consistent with the prior-wave figure of 255.
- Six per-repo `.claude/rules/quality-typescript.md`-style files assert import-type discipline, but checked against the actual tsconfigs: **3 are accurate** (`setup-ocx`, `kate-middlechild`, `creeptd-ng`), **2 assert enforcement that does not exist** (`grimoire-vscode`, `vscode-ocx` — both claim `verbatimModuleSyntax: true` "forces" the rule; neither tsconfig has the flag), and **1 is honest about the gap** (`ocx-catalog` explicitly notes "not set, so... a convention, not enforced").
- For the two repos where the rule file is simply wrong (documentation drift, not absence of a rule), the fix is either to flip the flag on (it's free for both — Bundler-mode moduleResolution, 0 measured errors) or to correct the prose. Given the flag is free here, flip it on.

## Findings

### 1. Three flags collapsed into one: the 5.0 → 5.5 → 6.0 timeline

Before TypeScript 5.0, controlling type-only import/export emission required combining three separate, individually confusing options: `importsNotUsedAsValues` (added 3.8, forces `import type` when a value import is only used as a type, with `remove`/`preserve`/`error` modes), `preserveValueImports` (blocks TypeScript's default elision of imports that could theoretically have side effects), and `isolatedModules` (restricts what's *safe* for a single-file transpiler, but changes no emit behavior on its own) ([TS 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)).

TS 5.0 introduced `verbatimModuleSyntax` as a single replacement and **deprecated** the first two:

| Release | Status of `importsNotUsedAsValues`/`preserveValueImports` | Verified |
|---|---|---|
| 5.0 | Deprecated, still functional | [release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) |
| 5.5 | "No longer have any effect"; still legal to specify | [release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html) |
| 6.0 | Documented as becoming "an error to specify"; **directly reproduced**: `tsc 6.0.3` on a tsconfig setting either flag emits `error TS5102: Option 'importsNotUsedAsValues' has been removed. Please remove it from your configuration. Use 'verbatimModuleSyntax' instead.` (exit code 2) | this dive, `tsc --version` → `Version 6.0.3` |

Fleet check: zero occurrences of either flag in any of the 15 tsconfig files across the 9 repos (`grep -rn "importsNotUsedAsValues\|preserveValueImports"` → no matches). No agent-authored config is carrying the pre-5.0 pattern forward — good, but worth a permanent grep gate given the fleet's TS floor is pinned at `^6.0.x` where the flags are now a hard build failure, not a silent no-op.

### 2. What verbatimModuleSyntax actually changes about emit

The rule, once the flag is on, is deterministic: **what you write is what gets emitted**, with `type`-marked specifiers stripped and everything else left alone ([tsconfig reference](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax), [TS 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)):

```ts
// Erased entirely
import type { A } from "a";

// b and c/d rewritten: value kept, type specifiers stripped
import { b, type c, type d } from "bcd";
// →  import { b } from "bcd";

// All specifiers type-only — kept as an *empty* import, not dropped
import { type xyz } from "xyz";
// →  import {} from "xyz";
```

Before 5.0, whether `import { Car } from "./car"` survived emission depended on whether `Car` was a class, interface, or type alias — genuinely ambiguous to read from the import line alone. `verbatimModuleSyntax` removes that ambiguity: the presence of the `type` keyword, not the imported symbol's kind, decides elision.

### 3. isolatedModules vs verbatimModuleSyntax: not the same enforcement

These two flags are frequently conflated in prose (including two of the fleet's own rule files, finding 11) but enforce genuinely different things. Directly measured against real `tsc 6.0.3`, `module: ESNext`/`moduleResolution: bundler`, no other flags:

| Pattern | `isolatedModules` only | `+ verbatimModuleSyntax` |
|---|---|---|
| `export { MyType } from "./types"` (type re-export, no `export type`) | **`TS1205`**: "Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'." | same error (subsumed) |
| `import { MyType } from "./types"; const x: MyType = {...}` (type-only value import, no `import type`) | **Compiles clean** (exit 0) | **`TS1484`**: "'MyType' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled." |

`isolatedModules` alone protects re-exports; it says nothing about how types are *imported*. The gap between "isolatedModules is on" and "every type-only import is marked" is exactly what `verbatimModuleSyntax` closes — and it is a **real gap**: `grimoire-vscode` and `vscode-ocx` both have `isolatedModules: true` and neither has `verbatimModuleSyntax`, so nothing in either repo's compiler configuration currently enforces `import type` on the import side ([isolatedModules reference](https://www.typescriptlang.org/tsconfig/#isolatedModules)).

### 4. The CJS-format trap, both directions — one measured, one debunked

**Direction that reproduces**: `verbatimModuleSyntax` forbids writing ES `import`/`export` syntax in a file `tsc` classifies as **CommonJS-format** (under `module: node16`/`nodenext`, a `.ts`/`.cts` file whose nearest `package.json` lacks `"type": "module"`) ([modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)). This is exactly `vscode-ocx`'s shape:

```
$ grep '"type"' vscode-ocx/package.json   →  (no match — defaults to CommonJS)
$ vscode-ocx/node_modules/.bin/tsc -p tsconfig.json --noEmit --verbatimModuleSyntax
src/config.ts(1,13): error TS1295: ECMAScript imports and exports cannot be
  written in a CommonJS file under 'verbatimModuleSyntax'. Adjust the 'type'
  field in the nearest 'package.json'...
src/environment.ts(4,10): error TS1287: A top-level 'export' modifier cannot
  be used on value declarations in a CommonJS module when 'verbatimModuleSyntax'
  is enabled.
  ... (62 total: 42× TS1295, 20× TS1287)
```

`vscode-ocx`'s own `check-types` script is `tsc --noEmit` ([package.json:157]) — a real, separate CI-visible step, not just an editor squiggle, so these 62 errors are not a synthetic artifact of this test; they would fail the same way in the repo's own pipeline. `grimoire-vscode` sits on the same VS Code/Electron shape but uses `moduleResolution: Bundler`, not `Node16` — under Bundler resolution, TS does **not** classify per-file CJS/ESM format from `package.json`, so the same borrowed-`tsc` test against `grimoire-vscode/tsconfig.json` produces zero `TS1295`/`TS1287` errors (finding 9). **The trap tracks `moduleResolution: Node16`/`NodeNext` without `"type": "module"`, not "VS Code extension" as a category** — two repos on the same target platform land on opposite sides of this line purely from a `moduleResolution` choice.

**Direction that did not reproduce**: the brief's premised trap — `verbatimModuleSyntax` forbidding `import x = require()` in an ESM-format file — is shown as a hard error on the TypeScript modules reference page itself:

```ts
// @Filename: module.mts (ESM format)
import mod = require("./mod");        // ❌ Not allowed in ESM-format file
```
([source](https://www.typescriptlang.org/docs/handbook/modules/reference.html))

Directly reproducing this against real `tsc 6.0.3` (`module: NodeNext`, package.json `"type":"module"`, both a relative `.cjs` target and a bare npm-style CJS package target, with and without `verbatimModuleSyntax`):

```
$ cat a.mts
import x = require("./mod.cjs");
export const y = x;

$ tsc -p tsconfig.json --verbatimModuleSyntax    # tsconfig: module/moduleResolution NodeNext
$ echo $?
0
```

Emitting instead of `--noEmit` shows what happens: TS synthesizes a `createRequire` shim rather than erroring —

```js
// emitted a.mjs
import { createRequire as _createRequire } from "module";
const __require = _createRequire(import.meta.url);
const fs = __require("./mod.cjs");
export const x = fs;
```

This holds for both a relative CJS file and a bare CJS npm package specifier, and `verbatimModuleSyntax` makes no difference to either outcome. **Treat the handbook's `import mod = require(...)` example as describing intended/historical semantics, not the observed behavior of tsc 6.0.3 — re-verify against your own pinned compiler version before repeating this specific claim**; this fleet has zero occurrences of the construct either way (finding 12), so the practical stakes are low, but the claim as stated in the brief does not hold as measured.

### 5. Bundlers that erase types themselves: esbuild, Vite 8/Oxc

Both esbuild and Vite explicitly do not type-check; they transpile per-file and cannot distinguish a type-only name from a value name without `import type` ([esbuild TypeScript caveats](https://esbuild.github.io/content-types/#typescript-caveats)):

> "tools like esbuild and Babel (and the TypeScript compiler's `transpileModule` API) compile each file in isolation so they can't tell if an imported name is a type or a value" — esbuild's own recommendation is to enable `isolatedModules` for exactly this reason.

Vite 8 (current, v8.2.2 as fetched) now transpiles TypeScript through its **Oxc Transformer**, not esbuild — same constraint, explicitly documented: `isolatedModules` "must be set to `true`" because "Oxc Transformer... lacks type information," and `verbatimModuleSyntax`/`importsNotUsedAsValues` are both listed as options Vite respects during transpilation ([Vite TypeScript guide](https://vite.dev/guide/features.html#typescript)). Rolldown is Vite 8's underlying bundler (the successor project referenced in the same toolchain family); the constraint is identical for the same reason — no type information survives to the bundler layer.

Practical consequence for this fleet: `fma` (Vite) and `creeptd-ng/web` (Vite) both already need explicit `import type` correctness independent of any `tsc` flag, because Vite's own transform is the thing eliding the import at dev-server and build time — `verbatimModuleSyntax` on `tsc`'s side and Vite/Oxc's own per-file elision agree on the same rule, so turning the flag on for these repos changes nothing about runtime behavior; it only makes `tsc --noEmit` catch what the bundler would otherwise catch (or silently mis-elide) at build time.

### 6. The no-import-type-side-effects footgun: measured, one live instance

`no-import-type-side-effects` exists because `verbatimModuleSyntax`'s per-specifier textual rule has a sharp edge: an import where **every** specifier carries an inline `type` marker doesn't get dropped — it becomes an empty, side-effect-only import ([rule docs](https://typescript-eslint.io/rules/no-import-type-side-effects/)):

```ts
import { type A, type B } from "mod";
// verbatimModuleSyntax emits:
import {} from "mod";     // ← same runtime effect as `import "mod";`
```

Confirmed against real tsc 6.0.3 emit (not `--noEmit`): `import { type GrimoireApi } from "./extension"` compiles silently to `import {} from "./extension";` with **zero diagnostics** — `tsc` itself never flags this; only the ESLint rule does. It is also confirmed to be a `verbatimModuleSyntax`-specific artifact: the identical source, compiled with neither `isolatedModules` nor `verbatimModuleSyntax` set, has TypeScript's default whole-statement elision drop the import entirely (no side-effect remnant).

Fleet-wide grep for the exact all-inline-type shape (`import { type X[, type Y...] } from ...`, single line) found exactly one match:

```
grimoire-vscode/src/test/extension.test.ts:23:
    import { type GrimoireApi } from '../extension';
```

This line is harmless today because `grimoire-vscode`'s tsconfig has no `verbatimModuleSyntax`. It becomes a live bug — a silent side-effect import of `../extension` inside a test file — the day someone (plausibly an AI agent, since finding 11 shows this repo's rule file already *claims* the flag is set) flips the flag on without running `no-import-type-side-effects` first.

### 7. consistent-type-imports is in no typescript-eslint preset but "all" — verified from the installed plugin

Rather than trust rule-doc prose about preset membership, this was checked directly against the plugin actually installed in the fleet (`vscode-ocx/node_modules/@typescript-eslint/eslint-plugin@8.61.0`, `dist/configs/flat/*.js`):

```
$ grep -l "consistent-type-imports\|no-import-type-side-effects" dist/configs/flat/*.js
all.js
```

Neither rule appears in `base.js`, `recommended.js`, `recommended-type-checked.js`, `recommended-type-checked-only.js`, `strict.js`, `strict-type-checked.js`, `strict-type-checked-only.js`, `stylistic.js`, `stylistic-type-checked.js`, or `stylistic-type-checked-only.js` — **only `all.js`**. `setup-ocx` extends `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked` ([setup-ocx/eslint.config.js:11-12]) and still does not get either rule without an explicit line.

`consistent-type-imports` (default `prefer: "type-imports"`, `fixStyle: "separate-type-imports"`, `disallowTypeAnnotations: true`) provides an autofix and works with or without the compiler flag; `no-import-type-side-effects` exists specifically to catch the emit footgun in finding 6 and is described by its own docs as "essential" once `verbatimModuleSyntax` is on, "less useful" (but still fine) without it ([consistent-type-imports docs](https://typescript-eslint.io/rules/consistent-type-imports/), [no-import-type-side-effects docs](https://typescript-eslint.io/rules/no-import-type-side-effects/)). Note the one caveat both docs list: with `experimentalDecorators` + `emitDecoratorMetadata`, `consistent-type-imports` intentionally does not flag decorator-adjacent imports, because decorator metadata needs the runtime import present — irrelevant to this fleet (grep for `emitDecoratorMetadata` across all tsconfigs: no matches).

Biome's equivalent, `useImportType`, **is** on by default in the recommended preset (`"Available since": "v1.5.0"`, category "Recommended", `style: "auto"` intelligently keeps mixed value+type imports separate-vs-inline) ([Biome docs](https://biomejs.dev/linter/rules/use-import-type/)) — this is exactly what `kate-middlechild/biome.json:51` has wired (`"useImportType": "error"`), making it the only fleet repo enforcing this via a linter today.

### 8. Fleet measurement: who actually has verbatimModuleSyntax — correcting the "2 of 13" baseline

13 real tsconfigs (excluding `fma/tsconfig.json`, a references-only solution file with no `compilerOptions`, and `setup-ocx/tsconfig.eslint.json`, an include-only overlay that adds no compiler settings):

| tsconfig | `verbatimModuleSyntax` | How |
|---|---|---|
| `ocx-catalog/tsconfig.json` | — | not set |
| `ocx-catalog/tsconfig.theme.json` | — | extends above, doesn't add it |
| `grimoire-indexer/tsconfig.json` | — | not set |
| `grimoire-vscode/tsconfig.json` | — | not set (has `isolatedModules` only) |
| `vscode-ocx/tsconfig.json` | — | not set (has `isolatedModules` only) |
| `setup-ocx/tsconfig.json` | **✓** | literal |
| `fma/tsconfig.app.json` | — | not set |
| `fma/tsconfig.node.json` | — | not set |
| `creeptd-ng/web/tsconfig.json` | **✓** | literal — **since commit `573db9fa`, 2026-05-30** |
| `creeptd-ng/web/e2e/tsconfig.e2e.json` | **✓** | literal (standalone copy, not an `extends`) |
| `kate-middlechild/tsconfig.base.json` | **✓** | literal |
| `kate-middlechild/packages/core/tsconfig.json` | **✓** | inherited via `extends "../../tsconfig.base.json"` |
| `kate-middlechild/packages/web/tsconfig.json` | — | extends `"astro/tsconfigs/strict"` instead, **breaking the inheritance chain** |

A prior wave's established fact stated "set in exactly 2 of 13 real tsconfigs (`setup-ocx/tsconfig.json`, `kate-middlechild/tsconfig.base.json`)." Directly re-measured: **4 literal occurrences across 3 repos** (adds `creeptd-ng/web`, which has carried the flag for three months — `creeptd-ng/web` is explicitly one of the fleet's nine repos per this dive's own brief, not a later addition to the fleet), and **5 of 13 effective** once `extends` chains are traced. The one genuinely new finding beyond the correction: `kate-middlechild` is a Biome monorepo that enforces the flag fleet-wide via its base config, except in exactly the one package (`packages/web`, Astro) whose own tsconfig replaces the `extends` target — a single-package gap inside an otherwise-consistent monorepo, invisible unless you check each package's own `extends` line rather than trusting the base config's presence.

### 9. Empirical test: what breaks if the 7 non-flag repos turn it on

Local `tsc` binaries with installed dependencies exist for exactly 3 of the 9 repos (`grimoire-indexer` 6.0.3, `vscode-ocx` 6.0.3, `fma` 5.9.3); the other repos have no `node_modules` installed in this workspace snapshot. Where a real binary wasn't available, `vscode-ocx`'s tsc 6.0.3 was pointed at the target repo's own `tsconfig.json` (a cross-repo invocation is safe and read-only — it reads that repo's own source and tsconfig, only its *type* dependencies are missing, producing separately-identifiable `TS2591`/`TS2304`/`TS7006`-class noise that was filtered out to isolate `verbatimModuleSyntax`-specific codes):

| Repo | Shape | Method | `verbatimModuleSyntax`-specific errors |
|---|---|---|---|
| `grimoire-indexer` | NodeNext | own tsc 6.0.3 | **0** |
| `ocx-catalog` | NodeNext | borrowed tsc, filtered | **0** (121 lines of output, all missing-`@types/node` noise) |
| `fma` (app + node) | Bundler | own tsc 5.9.3 | **0**, both configs |
| `grimoire-vscode` | Bundler | borrowed tsc, filtered | **0** (2 unrelated `TS2688` missing-type-library errors only) |
| `vscode-ocx` | Node16, no `"type":"module"` | own tsc 6.0.3 | **62** (42× `TS1295`, 20× `TS1287` — see finding 4) |
| `kate-middlechild/packages/web` | Astro (extends `astro/tsconfigs/strict`) | not independently tested — Astro's own type infrastructure isn't installed in this snapshot; inferred low-risk by shape (Bundler-family resolution) but **unverified** | could not establish as of 2026-08-29 |

Six of seven testable/inferable non-flag repos land clean. The one exception is not "VS Code extensions are expensive" (grimoire-vscode, on the same platform, is free) — it's specifically `moduleResolution: Node16` combined with no `"type": "module"` in `package.json`. This is the single per-shape condition worth gating the rollout decision on, not the repo's product category.

### 10. eslint-import-resolver-typescript on NodeNext: settled, with a live fixture

`import-graph.md` §5 left this explicitly open ("Could not establish... this fleet's own two NodeNext repos don't yet have the plugin installed to observe it running"). Closed here with a live fixture — `eslint-import-resolver-typescript@4.4.5` + `eslint-plugin-import-x@4.17.1` (clears the `>=4.5.0` gate for the current `resolver-next` API), `typescript@6.0.3`, wired via the current API:

```js
// eslint.config.mjs
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
settings: {
  'import-x/resolver-next': [ createTypeScriptImportResolver({ project: './tsconfig.json' }) ]
}
```

Against a `module: NodeNext` fixture (`src/util.ts`, imported as `import { helper } from './util.js'` — the on-disk-`.ts`-resolved-via-`.js`-specifier convention this whole fleet uses):

```
$ eslint src/index.ts
src/index.ts
  2:25  error  Unable to resolve path to module './does-not-exist.js'  import-x/no-unresolved
✖ 1 problem
```

One error, for the one genuinely missing file; the real `./util.js` → `./util.ts` import, a Node builtin (`node:fs`), and a real npm package (`chalk`) all resolve cleanly with zero false positives. **`eslint-import-resolver-typescript` handles NodeNext resolution correctly today**, current version, current API. `eslint-plugin-import-x` is worth wiring specifically *for* this resolver integration (the legacy `eslint-plugin-import` fork's `settings['import/resolver']` shape still works but isn't the API this fixture used, and `import-graph.md` §1 already covers why `import-x` is the maintained fork).

### 11. The six rule files' claims, checked against the six tsconfigs

Six fleet repos carry a per-repo `.claude/rules/quality-typescript.md`-shaped file that discusses `import type`/`verbatimModuleSyntax`. Checked line-by-line against the actual tsconfig each file describes:

| Repo | Rule file | Claim | Actual tsconfig | Verdict |
|---|---|---|---|---|
| `ocx-catalog` | `.claude/rules/quality-typescript.md:125,165` | "`verbatimModuleSyntax` is not set... a convention, not enforced" | not set | **accurate** |
| `grimoire-vscode` | `.claude/rules/quality-typescript.md:110,157` | "`verbatimModuleSyntax: true` — forces `import type`... enforced" | **not set** | **drifted — false claim** |
| `vscode-ocx` | `.claude/rules/quality-typescript.md:108,156` | identical claim, identical wording | **not set** | **drifted — false claim** |
| `setup-ocx` | `.claude/rules/typescript.md:14,26` | "`verbatimModuleSyntax: true` — forces explicit `import type`" | set | **accurate** |
| `kate-middlechild` | `.claude/rules/quality-typescript.md:55` | "required by `verbatimModuleSyntax`" | set (base; not `packages/web`) | **accurate at repo level**, misses the one-package gap from finding 8 |
| `creeptd-ng` | `.claude/rules/quality-typescript.md:13` | lists `verbatimModuleSyntax` among enabled flags | set | **accurate** |

The two drifted files are identical in wording (`"verbatimModuleSyntax: true" — forces "import type" for type-only imports; what you write = what emitted`), suggesting one was copied to the other, or both generated from the same template, without either author checking the actual `tsconfig.json`. This is a stronger, more specific failure than "documented convention nobody enforces" — it's a rule file actively asserting a compiler guarantee that is not present, which is worse for an AI agent consuming the rule file at face value than no claim at all.

### 12. require()/import = require() in the fleet: measured zero

`require(` across every `.ts`/`.tsx`/`.vue` file in all 8 TS-bearing repos (excluding `node_modules`/`dist`/`out`/worktrees): **one textual match, fleet-wide**, and it is inside a `//` comment (`kate-middlechild/packages/web/astro.config.ts:24`, describing `react-dom/client`'s own internal CJS shim as background for an `optimizeDeps` workaround — not fleet code). `module.exports` has two matches: the same comment, and a string literal inside a test fixture (`ocx-catalog/test/sources/path.test.ts:45`, simulating a fake `node_modules` package for a resolver test). **Zero real `require()` calls, zero `export =`, zero `import x = require()` in any fleet repo's actual source.** The fleet is 100% pure-ESM-authored today; the CJS-format trap in finding 4 is a real risk only for repos that pick `moduleResolution: Node16` without `"type": "module"` — a resolution-selection consequence, not something any fleet repo's own authoring style is already fighting.

## Normative guidance candidates

1. **Set `verbatimModuleSyntax: true` on every repo whose `moduleResolution` is `NodeNext`/`Node16`-with-`"type":"module"` or `Bundler`.** Rationale: measured zero cost across every tested/filtered repo on these shapes (finding 9); it closes the real, measured gap where `isolatedModules` alone does not enforce `import type` on imports (finding 3). Verify: `tsc -p tsconfig.json --noEmit --verbatimModuleSyntax` (CLI override, no file edit needed) exits 0 before committing the tsconfig change.
2. **Do not set `verbatimModuleSyntax` on a repo using `moduleResolution: Node16` without `"type": "module"` in `package.json` until the module format is resolved.** Rationale: this is a structural conflict, not a lint-fixable one — 62 measured errors on `vscode-ocx`, 100% `TS1295`/`TS1287`, from ES import/export syntax in a file `tsc` classifies as CommonJS. Verify: `grep '"type"' package.json`; if absent and `moduleResolution` is `Node16`/`NodeNext`, either add `"type": "module"` first (and confirm the extension host / test runner tolerates it) or switch to `moduleResolution: Bundler`.
3. **Run `no-import-type-side-effects` alongside `verbatimModuleSyntax`, not instead of it.** Rationale: the compiler flag alone is silent on the all-inline-`type`-specifiers footgun (finding 6) — `tsc` emits `import {} from "mod"` with zero diagnostics. Verify: `@typescript-eslint/no-import-type-side-effects: "error"` in `eslint.config.*`; for Biome repos, `useImportType` already covers this (its `auto` style never produces an all-inline-type import in the first place).
4. **Do not assume any typescript-eslint preset (`recommended`, `strict`, `strict-type-checked`, `stylistic-type-checked`) includes `consistent-type-imports` or `no-import-type-side-effects`.** Rationale: verified directly against the installed plugin's own `dist/configs/flat/*.js` — both rules exist only in `all`. Verify: `grep -l "consistent-type-imports\|no-import-type-side-effects" node_modules/@typescript-eslint/eslint-plugin/dist/configs/flat/*.js` returns only `all.js`.
5. **For a repo that cannot take the compiler flag (finding 2's Node16-without-`"type":"module"` case, or any repo not ready to flip a build-breaking flag), wire `@typescript-eslint/consistent-type-imports: "error"` explicitly as the cheaper equivalent.** Rationale: it's autofixable, doesn't require a module-format migration, and catches the same import-side pattern `verbatimModuleSyntax` would (though not the export-side elision determinism). Verify: `eslint --fix` converts a plain type-only import to `import type`; re-run and confirm zero remaining violations.
6. **Trust the tsconfig, not the rule-file prose, when auditing whether import-type discipline is enforced.** Rationale: two of six fleet rule files assert `verbatimModuleSyntax: true` "forces" `import type` when the actual tsconfig has no such setting (finding 11) — identical wording in both, suggesting a copy/template that was never checked against the real config. Verify: for any rule file claiming a compiler-enforced guarantee, `grep <flag> tsconfig.json` (following `extends` chains) before accepting the claim.
7. **In an `extends`-chain monorepo, verify `verbatimModuleSyntax` (and any other base-level flag) survives every package's own `extends` line, not just the base config.** Rationale: `kate-middlechild/packages/web` silently drops the flag by extending `astro/tsconfigs/strict` instead of the repo's own `tsconfig.base.json` — a one-package gap invisible from the base config alone. Verify: for each package tsconfig in a monorepo, `tsc -p <path> --showConfig | grep verbatimModuleSyntax` to see the *resolved* value, not the literal file contents.
8. **Do not carry forward `importsNotUsedAsValues` or `preserveValueImports` from pre-5.0 training data or copied config.** Rationale: both are a hard `TS5102` build failure on TypeScript 6.0+, which is this fleet's pinned floor — not a warning, not a no-op. Verify: `grep -rn "importsNotUsedAsValues\|preserveValueImports" **/tsconfig*.json` returns nothing; if it does, `tsc -p <that config>` will already be failing the build.
9. **Do not repeat the TypeScript modules-reference claim that `import x = require()` is forbidden in an ESM-format file under NodeNext without re-verifying against the pinned compiler.** Rationale: measured directly against tsc 6.0.3, it compiles clean (`createRequire` synthesis), contradicting the handbook's own example (finding 4). Verify: the exact repro is in finding 4 — re-run it against whatever `tsc` version a given repo pins before asserting either way.
10. **Wire `eslint-import-resolver-typescript` via `import-x/resolver-next` + `createTypeScriptImportResolver(...)`, gated on `eslint-plugin-import-x >= 4.5.0`, for any repo running `import-x/no-unresolved` on a NodeNext codebase.** Rationale: confirmed correct against a live NodeNext `.js`→`.ts` fixture — the resolver is not a source of false positives for this fleet's dominant resolution convention. Verify: the fixture and exact commands are in finding 10.

## AI-agent angle

- **An agent enabling `verbatimModuleSyntax` will assume `isolatedModules` already covers imports, since both flags are usually mentioned together.** It doesn't — `isolatedModules` only forces `export type` on re-exports (`TS1205`), never `import type` on imports (finding 3). Smallest check: after adding `verbatimModuleSyntax`, run `tsc --noEmit` once before assuming the two flags were redundant; the new `TS1484` errors, if any, are the imports that were silently relying on default elision.
- **An agent asked to "fix the unused import warning" on a type-only import will reach for `import { type X }` (inline) rather than `import type { X }`.** Both are individually correct TypeScript, but an import where *every* specifier ends up inline-`type` collapses to a bare side-effect import under `verbatimModuleSyntax` (finding 6) — a bug the agent has no way to notice from the diff alone, since the broken behavior only appears in emitted JS the agent never reads. Smallest check: `no-import-type-side-effects` (or Biome's `useImportType` in `auto` mode, which never produces this shape) — a single ESLint rule catches every instance mechanically; grep can too (`import \{ type \w+(, type \w+)*\ ?\} from` with no non-`type` specifier).
- **An agent pattern-matching from pre-5.0 training data will emit `importsNotUsedAsValues`/`preserveValueImports` in a fresh tsconfig, especially when asked to "make type imports explicit."** These are a hard `TS5102` failure on this fleet's TS 6.0+ floor, not a deprecation warning — the build breaks immediately, but an agent that generates the tsconfig and moves on without running `tsc` won't see it. Smallest check: any tsconfig-generation or -editing task runs `tsc -p <file> --showConfig` (or a full build) once before considering the change done.
- **An agent copying a CJS-authoring pattern (`import x = require("y")`) into a new ESM-format `.ts` file under `module: esnext`/`es2022` (not `nodenext`) will hit a hard, immediate `TS1202`.** This one **does** reproduce reliably (unlike the NodeNext case in finding 4) — verified directly: `module: ESNext` + `import x = require(...)` → `error TS1202: Import assignment cannot be used when targeting ECMAScript modules.` Smallest check: this fails at `tsc` time on every fleet repo using a Bundler/ESNext `module` setting (5 of 9 repos), so any pre-commit or CI type-check catches it — the risk is specifically an agent that edits without ever invoking `tsc`, same failure mode already flagged in `resolution-per-shape.md`'s AI-agent section for the reverse (CJS-format-file) case.
- **An agent asked to "verify verbatimModuleSyntax is safe to enable" will run `tsc --noEmit` inside the target repo and declare success or failure — without checking *which* errors appeared.** On `vscode-ocx`, the 62 errors are 100% structural (`TS1295`/`TS1287`, wrong module format) and no amount of adding `type` keywords fixes them; on `ocx-catalog`, a naive cross-repo run produces 121 lines of output that look alarming but are entirely pre-existing missing-`@types/node` noise, unrelated to the flag. Smallest check: filter for the flag's actual error codes (`TS1484`, `TS1205`, `TS1287`, `TS1295`, `TS1202`) before concluding the flag itself is the problem — everything else is a different, pre-existing issue the flag merely surfaced by running a clean typecheck.

## Contested / evolving

- **Whether `import x = require()` is actually forbidden in an ESM-format file under NodeNext is unsettled between documentation and observed behavior, as of 2026-08-29.** The TypeScript modules reference page states it directly as a `❌ Not allowed` example; this dive's own reproduction against tsc 6.0.3 shows it compiling cleanly via a synthesized `createRequire` shim, with and without `verbatimModuleSyntax`, for both relative and bare-specifier CJS targets. Possible explanations not distinguishable from outside the compiler source: the handbook describes an intended/historical restriction later relaxed by the `createRequire`-synthesis feature without a correspondingly updated docs page, or the page's example is simplified/aspirational. **Could not establish which, as of 2026-08-29** — treat the compiler's actual behavior (test it) as authoritative over the handbook text for this specific question until independently reconciled.
- **The fleet's TypeScript versions are not yet uniformly on the `^6.0.x` floor** established as the target pin by prior waves: `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx` declare `^6.0.3`; `ocx-catalog` is on `^5.9.3`; `fma` on `^5.7.2`; `creeptd-ng/web` on `^5.7.0`; `kate-middlechild` on `^5.8.0`. `verbatimModuleSyntax` itself is stable and behaves identically across this whole range (shipped 5.0), so none of this dive's findings are version-gated by the split — but the `TS5102` hard-failure behavior for the two removed flags (finding 1) is specifically a 6.0+ behavior; repos still on 5.7–5.9 would see those flags silently no-op (5.5 behavior) rather than fail the build, a softer landing that disappears once each repo's own TS pin crosses 6.0.
- **Whether `kate-middlechild/packages/web`'s Astro-extends gap (finding 8) is a deliberate exception or drift** could not be established from the repo's own history or rule files within this dive's scope — `astro/tsconfigs/strict` is Astro's own recommended preset and may be load-bearing for `.astro` file type-checking in a way that can't simply add `verbatimModuleSyntax` on top without testing against the actual Astro toolchain (not installed in this workspace snapshot). Flagged as open, not resolved.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typescriptlang.org/tsconfig/#verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax) | Official TSConfig reference | current, fetched 2026-08-29 | Canonical current description of the flag and its relation to `isolatedModules` |
| [typescriptlang.org — TS 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) | Official release notes | TS 5.0 (introduced the flag) | The motivating problem (ambiguous elision), the exact before/after emit examples, deprecation of the two old flags |
| [typescriptlang.org — TS 5.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html) | Official release notes | TS 5.5 | Confirms `importsNotUsedAsValues`/`preserveValueImports` became no-ops, and previews the 6.0 error |
| [typescriptlang.org — TS 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) | Official release notes | TS 6.0 (fleet's pinned floor) | Direct check of what actually changed in 6.0 for modules — cross-checked against this dive's own `tsc` reproduction of `TS5102` |
| [typescriptlang.org — TS 3.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html) | Official release notes | TS 3.8 (origin of `import type`) | Where `import type`/`export type` syntax and `importsNotUsedAsValues` were first introduced, and why |
| [typescriptlang.org/docs/handbook/modules/reference.html](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | Official modules reference | current, fetched 2026-08-29 | `import x = require()` / `export =` rules per module format — this dive's own reproduction contradicts one specific example on this page (finding 4/Contested) |
| [typescriptlang.org/tsconfig/#isolatedModules](https://www.typescriptlang.org/tsconfig/#isolatedModules) | Official TSConfig reference | current, fetched 2026-08-29 | What `isolatedModules` alone actually restricts, cross-checked against real `tsc` behavior in finding 3 |
| [typescript-eslint.io/rules/consistent-type-imports](https://typescript-eslint.io/rules/consistent-type-imports/) | typescript-eslint rule docs | current, fetched 2026-08-29 | Options (`prefer`, `fixStyle`, `disallowTypeAnnotations`), the decorator-metadata caveat, relationship to the compiler flag |
| [typescript-eslint.io/rules/no-import-type-side-effects](https://typescript-eslint.io/rules/no-import-type-side-effects/) | typescript-eslint rule docs | current, fetched 2026-08-29 | The exact footgun this dive reproduced against real tsc emit in finding 6 |
| [github.com/import-js/eslint-import-resolver-typescript](https://github.com/import-js/eslint-import-resolver-typescript) | Primary README | current, fetched 2026-08-29 | Current `resolver-next`/`createTypeScriptImportResolver` API, used verbatim in this dive's live fixture (finding 10) |
| [esbuild.github.io/content-types/#typescript-caveats](https://esbuild.github.io/content-types/#typescript-caveats) | Official esbuild docs | current, fetched 2026-08-29 | Why per-file transpilers need explicit `import type`; esbuild's own `isolatedModules` recommendation |
| [vite.dev/guide/features.html#typescript](https://vite.dev/guide/features.html#typescript) | Official Vite docs | v8.2.2, fetched 2026-08-29 | Confirms Vite 8 transpiles via Oxc (not esbuild) with the same type-erasure constraint; which compiler options Vite actually respects |
| [biomejs.dev/linter/rules/use-import-type](https://biomejs.dev/linter/rules/use-import-type/) | Official Biome rule docs | v1.5.0+, fetched 2026-08-29 | Biome's equivalent to `consistent-type-imports`, on by default in `recommended` (unlike the typescript-eslint rule) — grounds `kate-middlechild`'s enforcement in finding 7 |

**Non-URL primary evidence**: every non-obvious compiler claim in this dive (findings 1, 3, 4, 6, and the Contested section) was independently reproduced against a real, locally-installed `tsc 6.0.3` (`vscode-ocx/node_modules/.bin/tsc`, this fleet's own pinned version) and, where noted, `tsc 5.9.3` (`fma/node_modules/.bin/tsc`) — exact commands and output are inline in the corresponding findings rather than repeated here.

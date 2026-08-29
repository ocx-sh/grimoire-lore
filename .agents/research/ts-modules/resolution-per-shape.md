---
title: Module resolution per package shape
topic: TypeScript moduleResolution / module selection (NodeNext vs Node16 vs Bundler vs frozen node18/node20 pins)
agent: scout (module-resolution research)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 12
scope: |
  Covers: how to choose `module`/`moduleResolution` per package shape (Node CLI,
  VS Code/Electron extension, Bun Action, browser SPA, Astro/Vite site), the
  `.js`-extension rule and what actually triggers it, `rewriteRelativeImportExtensions`
  and `allowImportingTsExtensions` as escape hatches, the node10 deprecation/removal
  timeline through TS 7.0, and Bun/esbuild's own condition-order answers.
  Does not cover: `paths`/`baseUrl` monorepo aliasing, declaration-file (`.d.ts`)
  publishing strategy, or non-resolution compiler options (strictness, emit).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The decision axis is "host", not "runtime" or "toolchain"](#1-the-decision-axis-is-host-not-runtime-or-toolchain)
   2. [The moduleResolution catalog, verified against the real compiler](#2-the-moduleresolution-catalog-verified-against-the-real-compiler)
   3. [node18/node20 are frozen `module` pins, not new resolution algorithms](#3-node18node20-are-frozen-module-pins-not-new-resolution-algorithms)
   4. [The `.js`-extension rule is triggered by module *format*, not by the moduleResolution name](#4-the-js-extension-rule-is-triggered-by-module-format-not-by-the-moduleresolution-name)
   5. [Escape hatches: rewriteRelativeImportExtensions (5.7) and allowImportingTsExtensions (5.0)](#5-escape-hatches-rewriterelativeimportextensions-57-and-allowimportingtsextensions-50)
   6. [node10/`node` is not just deprecated — TS 7.0 removed it outright](#6-node10node-is-not-just-deprecated--ts-70-removed-it-outright)
   7. [The fleet's four-way split, resolved](#7-the-fleets-four-way-split-resolved)
   8. [Case study: is vscode-ocx's Node16 + extensionless imports a live defect?](#8-case-study-is-vscode-ocxs-node16--extensionless-imports-a-live-defect)
   9. [The two VS Code extensions' disagreement: reasoned or drift?](#9-the-two-vs-code-extensions-disagreement-reasoned-or-drift)
   10. [Bun's and esbuild's own condition orders — a third and fourth answer](#10-buns-and-esbuilds-own-condition-orders--a-third-and-fourth-answer)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The axis that decides `moduleResolution` is **"host"** — whichever program actually reads your import specifiers before a JS engine runs the code — not "target runtime" and not "consumer toolchain" as separate abstractions; TypeScript's own handbook defines the term this way and it subsumes both. [theory.html](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- For a package that is `import`ed by code you don't control (a published library), treat the host as "the strictest resolver you can't rule out" and use `NodeNext` even if you personally build with a bundler — `bundler` mode is, in the TS team's own words, "infectious": it lets you ship specifiers that only work in bundlers. [Andrew Branch](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/), [theory.html](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- For a package that is never imported — its whole output always passes through one specific bundler before anything runs it (a VS Code extension, a browser SPA, an Astro theme) — `Bundler` is correct and buys nothing by being stricter.
- `moduleResolution` has exactly three live values in TypeScript 6.0.3 and 7.0.2: `node16`, `nodenext`, `bundler` (`node10`/`node`/`classic` still parse as `module` in some contexts but are gone or going from `moduleResolution`). Verified directly against both compilers, not from docs alone.
- `--module node18` and `--module node20` exist and are valid, but they are **not** separate resolution algorithms — verified empirically, both imply `moduleResolution: node16` (the *frozen* algorithm), never `nodenext`. Any doc or model that describes `moduleResolution: "node18"` as a setting is wrong; it isn't a legal value (`tsc` reports `TS6046`).
- `nodenext`/`node16` are the *only* correct `module` settings for code that Node.js itself will load — the handbook explicitly rules out `esnext` and `commonjs` for that case, even when every emitted file happens to be pure ESM or pure CJS. [theory.html](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- The relative-import `.js`-extension requirement under `node16`/`nodenext` is triggered by a file's **module format** (ESM vs CJS), not by the moduleResolution setting alone. Format comes from `.mts`/`.cts` extension or, for plain `.ts`, from the nearest `package.json`'s `"type"` field. A `.ts` file in a package with no `"type": "module"` is CJS-format, and CJS-format files under `node16`/`nodenext` do **not** need the extension. Verified directly against `tsc` 6.0.3 and 7.0.2.
- `vscode-ocx` declares `Node16` and has 11/11 relative imports missing `.js`, but `tsc --noEmit` (`check-types`, wired into its CI) passes with **zero errors** on both TS 6.0.3 and 7.0.2 — because its `package.json` carries no `"type": "module"`. It is not broken today, and it is not "masked by esbuild" either; the tsconfig setting is simply not doing the strict-checking work its name implies.
- That same non-work is fragile: adding `"type": "module"` to `vscode-ocx/package.json` (a very plausible future edit — every other Node-target repo in the fleet already carries it) would turn all 11 sites into `TS2835` errors overnight, with zero change to the esbuild build, which never cared about extensions either way.
- `grimoire-vscode`, `vscode-ocx`'s sibling extension, declares `ESNext`/`Bundler` — the setting that actually matches what resolves its specifiers (esbuild, always, before VS Code ever sees the file). The two extensions' disagreement is drift, not a documented split; nothing in either repo explains why one diverged.
- `setup-ocx` (Bun-authored GitHub Action, esbuild-bundled to `dist/*/index.js`) declares `nodenext` and is **fully compliant** — 18/18 relative imports carry `.js`. Its `esbuild.js` deliberately passes `platform: "node"` and `conditions: ["node", "import"]`, i.e. the bundler step was configured to imitate Node rather than to relax the rules Node would apply — this is the "strict-superset" pattern applied correctly, and it costs nothing extra given the code was already going to be written with real extensions.
- `allowImportingTsExtensions` only compiles when `noEmit`, `emitDeclarationOnly`, or `rewriteRelativeImportExtensions` is also set (`TS5096` otherwise, verified) — every fleet use of it (`fma`, `creeptd-ng/web/e2e`) already satisfies this via `noEmit: true`; no fleet violation exists.
- `rewriteRelativeImportExtensions` (TS 5.7, Nov 22 2024) rewrites `./foo.ts` → `./foo.js` at emit time so the same source runs unmodified under `tsx`/`ts-node`/Bun/Deno *and* compiles for distribution — it only rewrites relative, extensioned, non-declaration specifiers; `baseUrl`/`paths` and package `exports`/`imports` paths pass through untouched. No fleet repo uses it yet; it is a candidate for `ocx-catalog`/`grimoire-indexer` if they ever want to run source directly during dev without a build step.
- `node10`/`node` was deprecated in TS 6.0 (error `TS5107`, silenceable via `ignoreDeprecations: "6.0"`) and **hard-removed** in TS 7.0.2 (error `TS5108`, no escape hatch) — verified by installing and running 7.0.2 directly. No fleet repo uses it, so this is forward-looking, but any generated code or third-party template that still emits `"moduleResolution": "node"` will hard-fail the moment a repo upgrades past TS 6.
- Astro's `astro/tsconfigs/strict` preset (which `kate-middlechild/packages/web` extends) resolves, via `extends: "./base.json"`, to `moduleResolution: "Bundler"` — the preset-inherited leg of the fleet's four-way split is not drift, it is a correctly-chosen indirection consistent with every other browser-bundled package in the same monorepo. [astro base.json](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/tsconfigs/base.json)
- Bun's package.json `"exports"` condition order is `bun, node-addons, node, require, import, default` — confirmed against Bun's own docs, matching what the research brief already asserted — and Bun tolerates fully extensionless relative imports by design, unlike Node's own ESM loader. [Bun docs](https://bun.com/docs/runtime/modules)
- esbuild's `platform: "node"` (used by both `setup-ocx` and, implicitly, `vscode-ocx`/`grimoire-vscode`'s own extension-host target) auto-injects the `node` condition into its own conditional-exports matching, independent of whatever `moduleResolution` the accompanying `tsc` type-check uses — the bundler and the type-checker are two separate resolvers that happen to be configured, and should be verified, to agree. [esbuild docs](https://esbuild.github.io/api/#resolve-extensions)
- `ocx-catalog`'s `tsconfig.theme.json` is the fleet's only place a package legitimately needs *both* resolution modes: its CLI (`src`, excluding `src/theme`) has 89/89 relative imports correctly `.js`-suffixed under `NodeNext`; its VitePress theme (`src/theme`) has 128 extensionless relative/`.vue` imports under a separately-scoped `Bundler` config — required because NodeNext's resolver cannot resolve `.vue` specifiers at all, a hard technical blocker rather than a style choice.

## Findings

### 1. The decision axis is "host", not "runtime" or "toolchain"

The TypeScript handbook's "Modules — Theory" page defines the deciding concept explicitly, and it is neither "target runtime" nor "consumer toolchain" as independent axes — it is a single concept, *host*, that subsumes both:

> "Notice that all of these questions depend on characteristics of the _host_ — the system that ultimately consumes the output JavaScript (or raw TypeScript, as the case may be) to direct its module loading behavior, typically either a runtime (like Node.js) or bundler (like Webpack)."

and:

> "When a bundler consumes TypeScript inputs or outputs and produces a bundle, the bundler is the host, because it looked at the original set of imports/requires, looked up what files they referenced, and produced a new file or set of files where the original imports and requires are erased or transformed beyond recognition."

This is the resolution to the brief's "which axis decides" question: **ask what actually reads the import specifiers as you wrote them, last, before anything runs.** If a bundler rewrites/inlines them, the bundler is the host regardless of what eventually executes the bundle. If nothing intervenes — Node loads the files you emitted, one at a time, by path — Node is the host. [Source](https://www.typescriptlang.org/docs/handbook/modules/theory.html)

The same page is unambiguous that `esnext`/`commonjs` are wrong for Node-hosted code even when the emitted files are internally consistent:

> "Node.js's rules for module format detection and interoperability make it incorrect to specify `module` as `esnext` or `commonjs` for projects that run in Node.js, even if all files emitted by `tsc` are ESM or CJS, respectively. The only correct `module` settings for projects that intend to run in Node.js are `node16` and `nodenext`."

Andrew Branch (TypeScript team) adds the crucial complication for **published libraries**: your own build tooling is not the host that matters, because you don't control who consumes the package.

> "When writing a library, you would ideally check your code under _all possible_ library consumer compilation settings. Since this is impractical, you can instead use the strictest possible settings, since satisfying those tends to satisfy all others." … "`nodenext` is the right option for authoring libraries, because it prevents you from emitting ESM with module specifiers that _only_ work in bundlers but will crash in Node.js."

He is explicit that this is imprecise, not a guarantee, and recommends supplementing it: "When stronger guarantees of portability are needed, there is no substitute for runtime testing your output," with `tsc --noEmit` under multiple `module`/`moduleResolution` combinations as "a lower effort and reasonably good confidence booster." [Source](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) (Nov 14, 2023)

The handbook's own theory page independently reaches the same conclusion about `bundler` mode's asymmetric risk, calling it "infectious":

> "`moduleResolution: bundler` is infectious, allowing code that only works in bundlers to be produced. Likewise, `moduleResolution: nodenext` is only checking that the output works in Node.js, but in most cases, module code that works in Node.js will work in other runtimes and in bundlers."

**Net rule**: `NodeNext`/`Node16` is the safe default for anything with an unknown or plural downstream consumer (a published library, or — defensively — any package with a real `exports` surface even if lightly used). `Bundler` is correct only when you can show a *specific, unavoidable* reason the stricter mode fails — a hard technical blocker (can't resolve a non-JS specifier) or a guarantee that literally nothing but your one bundler will ever touch the file.

### 2. The moduleResolution catalog, verified against the real compiler

Verified directly (`tsc --moduleResolution bogus`) against both the fleet's oldest live compiler (6.0.3, installed from `vscode-ocx`'s own `devDependencies`) and the newest available (7.0.2, installed fresh):

```
error TS6046: Argument for '--moduleResolution' option must be: 'node16', 'nodenext', 'bundler'.
```

— identical on both versions. `node10` is conspicuously **not** offered as a valid value even in the error message (see §6). The handbook reference page's behavior table, cross-checked against this: [Source](https://www.typescriptlang.org/docs/handbook/modules/reference.html)

| Mode | Pairs with `module` | `paths`/`baseUrl` | package `exports` | Extensionless relative import |
|---|---|---|---|---|
| `nodenext` | `nodenext` (moving) | yes | yes | ESM: no · CJS: yes |
| `node16` | `node16`, `node18`, `node20` (frozen) | yes | yes | ESM: no · CJS: yes |
| `bundler` | `esnext`/`preserve` | yes | yes | always yes |
| `node10`/`node` | any (legacy) | yes | **no** | yes |

`node10` never understood `exports`/`imports` at all — a second, independent reason it is unsuitable for anything targeting a modern npm dependency graph, on top of being removed outright in 7.0.

### 3. node18/node20 are frozen `module` pins, not new resolution algorithms

The brief asked whether `--module node18`/`node20` are usable as frozen reference points distinct from the moving `nodenext` target. Verified with `tsc --module node18 --showConfig` on a bare project (no tsconfig to contaminate the implied defaults), on **both** 6.0.3 and 7.0.2:

```json
"module": "node18",
"moduleResolution": "node16",
```

```json
"module": "node20",
"moduleResolution": "node16",
```

```json
"module": "nodenext",
"moduleResolution": "nodenext",
```

So `node18` and `node20` are real, accepted `module` values (they exist as `ModuleKind.Node18`/`Node20` in `typescript.d.ts`), but they always imply the **frozen** `node16` resolution algorithm — never a `node18`/`node20`-specific one. There is no such thing as `moduleResolution: "node18"`; passing it produces `TS6046` immediately. This means "frozen `module` pin" and "moving `moduleResolution`" are not actually opposable per the brief's framing — the only way to get frozen *resolution* behavior is `node16` (or, equivalently, `module: node18`/`node20`, which silently select it). `nodenext` is the only setting, at either the `module` or `moduleResolution` layer, that moves with new TypeScript releases.

The handbook's theory page recommends the frozen pairing specifically for maximum library compatibility, ahead of bare `nodenext`:

> "Using `"module": "node18"` (along with the implied `"moduleResolution": "node16"`) is the best bet for maximizing the compatibility of the output JavaScript's module specifiers, since it will force you to comply with Node.js's stricter rules for `import` module resolution." [Source](https://www.typescriptlang.org/docs/handbook/modules/theory.html)

This is a real, citable disagreement with Andrew Branch's Nov 2023 post, which recommends plain `nodenext` without qualification — see [§ Contested/evolving](#contested--evolving).

`Node16` (as opposed to `node18`/`node20`/`nodenext`) is *also* a valid `module`/`moduleResolution` value in its own right, documented as "Node.js v16 specifically... frozen at Node.js v16 behavior." No fleet repo currently targets Node 16 at the runtime level — floors are `>=20`, `>=20.19`, `>=22.14`, and `>=24` — so a repo declaring bare `Node16` (as `vscode-ocx` does) is pinned four-plus majors behind its own stated floor, independent of whichever axis (Node vs bundler) turns out to be the right one for it (see §8).

### 4. The `.js`-extension rule is triggered by module *format*, not by the moduleResolution name

This is the single most consequential and least-documented mechanic for the fleet, and it required direct empirical verification because the handbook's compressed examples are easy to over-generalize from.

**Test, `tsc` 6.0.3 and 7.0.2, identical result on both:**

```ts
// src/main.ts
import { x } from './mod';   // no extension
```

```jsonc
// tsconfig.json
{ "compilerOptions": { "module": "NodeNext", "moduleResolution": "NodeNext" } }
```

With `package.json` = `{ "name": "test" }` (no `"type"` field):

```
$ tsc --noEmit -p .
(zero errors, exit 0)
```

With `package.json` = `{ "name": "test", "type": "module" }`:

```
$ tsc --noEmit -p .
src/main.ts(1,19): error TS2835: Relative import paths need explicit file
extensions in ECMAScript imports when '--moduleResolution' is 'node16' or
'nodenext'. Did you mean './mod.js'?
```

Nothing else changed between the two runs. The handbook's theory page explains the mechanism this reproduces:

> "Node.js understands both ES modules and CJS modules, but the format of each file is determined by its file extension and the `type` field of the first `package.json` file found... When the `module` compiler option is set to `node16`, `node18`, or `nodenext`, TypeScript applies this same algorithm to the project's _input_ files to determine the module kind of each corresponding _output_ file." [Source](https://www.typescriptlang.org/docs/handbook/modules/theory.html)

Concretely: a `.ts` file (not `.mts`/`.cts`) in a package whose nearest `package.json` has no `"type": "module"` is **CommonJS-format**. Under `node16`/`nodenext`, CJS-format files resolve relative specifiers with the same extension-optional, directory-index-capable algorithm as `require()` — regardless of whether the source uses `import` syntax or `require()` syntax, because the emitted output will itself be `require()`-based. Only ESM-format files (`.mts`, or `.ts`/`.js` under `"type": "module"`) enforce the extension.

This directly answers the brief's `vscode-ocx` question (see §8): its 11/11 extensionless relative imports are not a violation of `Node16` at all, because its `package.json` carries no `"type"` field.

### 5. Escape hatches: rewriteRelativeImportExtensions (5.7) and allowImportingTsExtensions (5.0)

**`allowImportingTsExtensions`** (TS 5.0, Mar 16 2023) lets source import `./mod.ts` directly (rather than `./mod.js`/extensionless), on the assumption that a downstream bundler or runtime — not `tsc`'s own emit — will make the specifier work. Verified precondition, `tsc` 7.0.2:

```
error TS5096: Option 'allowImportingTsExtensions' can only be used when one
of 'noEmit', 'emitDeclarationOnly', or 'rewriteRelativeImportExtensions' is set.
```

i.e. `tsc` refuses to let you emit a `.js` file that still contains a literal `.ts` import — you must either never emit (`noEmit`, the fleet's own pattern in `fma` and `creeptd-ng/web/e2e`, both already compliant), emit types only, or pair it with the next option so the extension gets rewritten on the way out. [Source](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)

**`rewriteRelativeImportExtensions`** (TS 5.7, Nov 22 2024) is the newer, complementary option: it rewrites `./foo.ts` → `./foo.js` (and `.mts`→`.mjs`, `.cts`→`.cjs`) at emit time, so the *same* source tree runs unmodified under `tsx`/`ts-node`/Bun/Deno/`node --experimental-strip-types` during development **and** compiles correctly for distribution — no more choosing between "imports that work in-place" and "imports that survive `tsc`". Only relative, extensioned, non-declaration specifiers are touched; `baseUrl`/`paths` aliases and package `exports`/`imports` map entries pass through untouched. [Source](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)

```ts
// written:
import * as foo from "./foo.ts";
// emitted:
import * as foo from "./foo.js";
```

No fleet repo uses `rewriteRelativeImportExtensions` today. It is a natural fit for `ocx-catalog`/`grimoire-indexer` if either wants a `tsx`-driven dev loop without a separate build step, but nothing in the fleet currently needs it — flagging as a candidate, not a gap.

### 6. node10/`node` is not just deprecated — TS 7.0 removed it outright

Verified by direct invocation, not inferred from docs:

**TS 6.0.3** (installed from `vscode-ocx`):
```
error TS5107: Option 'moduleResolution=node10' is deprecated and will stop
functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations":
"6.0"' to silence this error.
```

**TS 7.0.2** (installed fresh, the fleet's `typescript@latest`):
```
error TS5108: Option 'moduleResolution=node10' has been removed. Please
remove it from your configuration.
```

— and the `ignoreDeprecations: "6.0"` escape hatch that silenced it in 6.0 does **not** work in 7.0; the option is gone, not merely warned-about. No fleet repo uses `node10`/`node` today (all nine repos use `NodeNext`, `Node16`, or `Bundler`), so this is purely forward-looking, but it matters for anything that scaffolds new tsconfigs from memory or from an older template — see [§ AI-agent angle](#ai-agent-angle).

### 7. The fleet's four-way split, resolved

| Repo | Declared | Real host (build) | Verdict |
|---|---|---|---|
| `ocx-catalog` (CLI, `src` excl. theme) | `NodeNext` | plain `tsc` emit, Node loads files directly (`"build": "tsc"`) | Correct — 89/89 relative imports carry `.js` |
| `ocx-catalog` (`src/theme`, VitePress) | `Bundler` (`tsconfig.theme.json`) | Vite/VitePress, `.vue` SFCs | Correct and forced — NodeNext cannot resolve `.vue` at all; split is documented in-file |
| `grimoire-indexer` | `NodeNext` | plain `tsc` emit (`"build": "tsc -p ..."`) | Correct — 85/85 relative imports carry `.js` |
| `setup-ocx` | `nodenext` | esbuild bundle (`platform:"node"`, `conditions:["node","import"]`), runs under `using: node24` per `action.yml` | Correct — 18/18 relative imports carry `.js`; esbuild deliberately mirrors Node rather than relaxing it |
| `grimoire-vscode` | `ESNext`/`Bundler` | esbuild bundle, VS Code Extension Host, no `"type"` field | Correct — real host is the bundler, no external `import`ers |
| `vscode-ocx` | `Node16` | esbuild bundle, VS Code Extension Host, no `"type"` field | **Benign today, wrong-axis, fragile** — see §8/§9 |
| `fma` | `bundler`/`ESNext` | Vite | Correct — browser SPA, no non-bundler consumer |
| `creeptd-ng/web` (both configs) | `bundler`/`ESNext` | Vite | Correct — browser SPA + Playwright e2e, same reasoning |
| `kate-middlechild` (`core`, `tokens`, direct configs) | `bundler`/`ESNext` | tsup/Vite (Biome monorepo) | Correct |
| `kate-middlechild/packages/web` | `astro/tsconfigs/strict` → `base.json` = `Bundler`/`ESNext` | Astro build | Correct — preset-inherited, verified against Astro's own source, not drift |

Astro's `tsconfigs/base.json`, fetched directly from the package's GitHub source:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve"
  }
}
```
[Source](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/tsconfigs/base.json)

Eight of nine repos (counting `ocx-catalog`'s two configs and `kate-middlechild`'s packages as internally consistent units) land on the *correct* mode for their actual host with zero drift. The one exception is `vscode-ocx`.

### 8. Case study: is vscode-ocx's Node16 + extensionless imports a live defect?

**No.** Empirically confirmed by actually running the project's own `check-types` script (`tsc --noEmit`, the same command wired into its CI as `npm run check`) after installing its declared dependencies:

```
$ ./node_modules/.bin/tsc --version
Version 6.0.3
$ ./node_modules/.bin/tsc --noEmit
(zero errors, exit 0)
```

Reconfirmed on TS 7.0.2 by reproducing the same file/package.json shape in isolation (§4) — identical zero-error result. This settles the brief's "broken at runtime, or masked by esbuild bundling" question with a third answer: **neither.** It is not masked by esbuild — `tsc` never invokes esbuild and still passes — and it is not a runtime break either, because `Node16`'s extension rule is conditioned on ESM *format*, and `vscode-ocx/package.json` carries no `"type": "module"` (confirmed by direct `grep`), so every `.ts` file in the package is CJS-format and the rule simply does not apply (§4).

What it *is*: a tsconfig setting that is not exercising the check its name implies. `Node16` is supposed to be the stricter, Node-compatible mode; here it is accepting code that would fail the moment one line changed elsewhere in the file tree (`package.json`'s `"type"` field) that has nothing to do with the 11 import sites themselves. That is the fragility: every sibling Node-target repo in the fleet (`ocx-catalog`, `grimoire-indexer`, `setup-ocx`) already carries `"type": "module"`, so it is a highly plausible future edit — and it would turn `npm run check-types`/CI red across all 11 sites in one commit, with the esbuild `build` step (which never parsed extensions to begin with) completely unaffected. A check that only fails after an unrelated, easy-to-make edit is not doing useful work today.

### 9. The two VS Code extensions' disagreement: reasoned or drift?

**Drift, not a documented split.** Both extensions run inside the same host (VS Code's Extension Host process), both build with the same tool (`esbuild`, bundling to a single `dist/extension.js`), and neither has an `"exports"` field or any consumer that imports it as a library — nothing distinguishes their actual resolution needs. `grimoire-vscode`'s `ESNext`/`Bundler` config matches its real host (esbuild) exactly; `vscode-ocx`'s `Node16` does not, and nothing in either `tsconfig.json` or commit history (no comment, unlike `ocx-catalog`'s theme split) explains the divergence — contrast with `ocx-catalog/tsconfig.theme.json`, which spells out its reason for splitting in an inline comment. The absence of any such rationale in `vscode-ocx` is itself evidence this is unintentional drift rather than a considered choice.

Two equally valid fixes exist, and neither requires touching the 11 import sites' *runtime* behavior (esbuild resolves them either way):

- **Align with the sibling** (recommended, zero source changes): set `vscode-ocx/tsconfig.json` to `"module": "ESNext", "moduleResolution": "Bundler"`, matching `grimoire-vscode`. This makes the declared setting match the real host and removes the `"type": "module"` fragility entirely, since `Bundler` mode never requires the extension.
- **Make Node16 true** (stricter, more churn): add `.js` to all 11 relative imports, matching the pattern `setup-ocx` already follows for its own esbuild-bundled, Node-hosted Action. This is the "strict superset" choice (§1) and would also make the source directly runnable under plain Node or `tsx` without the bundler — a guarantee `vscode-ocx` does not currently need, since VS Code never runs the source directly.

Given `vscode-ocx` has no scenario (today or evidently planned) where anything but esbuild ever resolves its specifiers, the first fix is the smaller, sufficient one.

### 10. Bun's and esbuild's own condition orders — a third and fourth answer

Node.js's own documented condition order — most to least specific — is: `node-addons`, `node`, `import`, `require`, `module-sync`, `default` (with the community-standard `types` condition conventionally listed first when present). [Source](https://nodejs.org/api/packages.html)

Bun's documented order, fetched directly from Bun's own docs, matches the brief's framing exactly:

> Conditions checked, in order: `"bun"`, `"node-addons"` (unless `--no-addons`), `"node"`, `"require"` (if using `require()`), `"import"` (if using `import`), `"default"`. "Whichever of these conditions occurs first in the package.json determines the package's entrypoint."

Bun additionally tolerates fully extensionless relative imports, trying `.tsx, .jsx, .mts, .ts, .mjs, .js, .cts, .cjs, .json` and then the same list inside an `index` file — closer to bundler-style resolution than to Node's own ESM loader, even though Bun implements the rest of Node's algorithm for package lookups. [Source](https://bun.com/docs/runtime/modules)

For `setup-ocx` specifically, this creates a *third* potential authority (beyond `tsc`'s `nodenext` and esbuild's own resolver): `bun test` runs the `.ts` source directly, under Bun's own tolerant resolver, without invoking esbuild at all. Because the source is already fully `.js`-suffixed (satisfying the strictest of the three), all three agree — but this is worth stating explicitly as the reason "strict superset" is the right default whenever more than one resolver will ever touch the same source, which is exactly `setup-ocx`'s situation (type-checked, tested, *and* bundled, by three different tools).

esbuild's own condition handling is `platform`-driven, confirmed directly against esbuild's docs:

> "`platform: node`... automatically includes the `node` condition. This changes how the `exports` field in `package.json` files is interpreted to prefer node-specific code." (symmetric for `platform: browser` → `browser` condition.) [Source](https://esbuild.github.io/api/#resolve-extensions)

`setup-ocx`'s build script sets `platform: "node"` explicitly, so esbuild's own condition set (`node`, `import`/`require` depending on call site) already matches what `tsc`'s `nodenext` config checks — the redundant explicit `conditions: ["node", "import"]` in its `esbuild.js` is belt-and-suspenders, not compensating for a mismatch.

## Normative guidance candidates

1. **Rule**: A package that is `import`ed by code outside this repository (has a real `exports` surface consumers actually use, not just a `bin` entry) uses `moduleResolution: "NodeNext"` (or the frozen `"module": "node18"`/`"node20"` pairing, which implies `moduleResolution: "node16"`) — never `"bundler"`.
   **Rationale**: `bundler` mode is documented as "infectious" — it can produce specifiers that only work for a consumer who also happens to use a bundler, silently, with no compiler error.
   **Verify**: `grep -l '"exports"' */package.json` to find candidate library-shaped packages, then confirm `"moduleResolution"` in the matching `tsconfig.json` is not `"bundler"`.

2. **Rule**: A package whose entire output is always bundled by one specific tool before anything executes it (VS Code/Electron extension, browser SPA, static-site generator theme) uses `moduleResolution: "Bundler"` with `"module": "ESNext"` or `"preserve"`.
   **Rationale**: Matches the real host (§1); paying NodeNext's extension-discipline cost buys nothing when nothing but the bundler ever resolves the specifiers.
   **Verify**: Confirm the package has no `"exports"` field and its only entry point is consumed via a bundler config (Vite/esbuild/webpack config file), not `require`/`import` from another package.

3. **Rule**: Never set `"moduleResolution": "node10"` or `"node"` in any new or edited tsconfig.
   **Rationale**: Deprecated in TS 6.0 (`TS5107`), hard-removed in TS 7.0 (`TS5108`, no `ignoreDeprecations` escape) — verified directly against both compilers.
   **Verify**: `grep -rn '"moduleResolution"[[:space:]]*:[[:space:]]*"node"' --include=tsconfig*.json` across the repo (matches `"node"` and `"node10"`); should return nothing.

4. **Rule**: A Node-hosted package (CLI, server, Action bundled for a Node runtime) must declare `"type": "module"` in `package.json` if it declares `NodeNext`/`Node16` moduleResolution, or explicitly document why it deliberately stays CommonJS-format.
   **Rationale**: Without `"type": "module"`, `NodeNext`/`Node16`'s extension-discipline check is a no-op (§4, §8) — the tsconfig setting silently stops doing anything, which is exactly the `vscode-ocx` situation.
   **Verify**: For every `tsconfig.json` with `moduleResolution` in `{"NodeNext","Node16"}`, `grep '"type"' package.json` in the same package; flag any pairing of Node-resolution mode with a missing/non-`"module"` type field as worth a second look (not automatically wrong — CJS-format Node16/NodeNext is legal — but it means the extension check is currently inert).

5. **Rule**: Every relative import in a package declaring `NodeNext`/`Node16` with `"type": "module"` must carry an explicit `.js`/`.mjs`/`.cjs` extension.
   **Rationale**: Required by the ESM import algorithm under these modes (`TS2835` otherwise); verified directly.
   **Verify**: `grep -rn "from ['\"]\." src --include='*.ts' | grep -v '\.\(js\|mjs\|cjs\)['\"]'` should return nothing for such a package; or simply run `tsc --noEmit` — it is authoritative and free.

6. **Rule**: When two sibling packages share the same host (same runtime, same build tool, same "who consumes this" answer), their `module`/`moduleResolution` must match, or the difference must be commented in the diverging tsconfig explaining why.
   **Rationale**: An undocumented divergence between structurally identical packages (`vscode-ocx` vs `grimoire-vscode`) is the strongest available signal of drift rather than intent — `ocx-catalog`'s theme split shows what a *reasoned* divergence looks like (an inline comment naming the forcing constraint).
   **Verify**: Diff the `compilerOptions.module`/`moduleResolution` of tsconfigs across packages with structurally identical build tooling (same bundler, same deploy target); any mismatch needs either a fix or a comment.

7. **Rule**: `allowImportingTsExtensions: true` must be paired with `noEmit: true`, `emitDeclarationOnly: true`, or `rewriteRelativeImportExtensions: true` in the *same* config (directly or via `extends`).
   **Rationale**: `tsc` refuses to emit `.js` files containing literal `.ts` import specifiers otherwise (`TS5096`, verified).
   **Verify**: For every tsconfig with `allowImportingTsExtensions: true`, confirm one of the three companion flags resolves to `true` in the effective (post-`extends`) config — `tsc --showConfig` prints the resolved set directly.

8. **Rule**: Do not write or generate `"moduleResolution": "node18"` or `"node20"` — these are not valid `moduleResolution` values (only valid as `"module"` values, where they imply `moduleResolution: "node16"`).
   **Rationale**: `TS6046` rejects it outright; this is a documentation/mental-model trap, not a stylistic choice — verified against 6.0.3 and 7.0.2 directly.
   **Verify**: `grep -rn '"moduleResolution"[[:space:]]*:[[:space:]]*"node1[8]"\|"node20"' --include=tsconfig*.json`; should return nothing. If `"module": "node18"`/`"node20"` is used, the same config's `moduleResolution` (if explicit) must be `"node16"`, never `"nodenext"`.

## AI-agent angle

- **Hallucinated `moduleResolution` value**: a model asked to configure a "modern, Node 18/20-targeted" tsconfig will plausibly write `"moduleResolution": "node18"` or `"node20"`, extrapolating from the real, similarly-named `"module"` values. This compiles as `TS6046` — an immediate, loud failure, but only once someone runs `tsc`; an agent that only edits files without running the compiler afterward can ship this. **Check**: run `tsc --showConfig` (not just a syntax/JSON-schema check) after any tsconfig edit that touches `module`/`moduleResolution` — it prints the fully-resolved, implied values and would surface both an invalid value and an unexpected implied pairing in one command.
- **Stale `node10`/`node` from pretraining**: an agent trained on pre-2023 material (when `"node"` was the only Node-flavored `moduleResolution` value) will reach for `"moduleResolution": "node"` by habit. This still parses in TS 6.x (with a deprecation warning, easy to miss in noisy output) and hard-fails in TS 7.0. **Check**: `grep -rn 'moduleResolution.*"node"' --include=tsconfig*.json` — any hit that is not `"node16"`/`"node20"`/etc. (i.e., the bare four-letter value) is the deprecated/removed one.
- **"Just remove the extension" as a fix for a resolution error**: when an agent hits `TS2307: Cannot find module './foo.js'` while editing a `NodeNext`/ESM-format file, the path-of-least-resistance "fix" is to delete the `.js` suffix — which trades one error for `TS2835` (or, worse, for code that only fails at actual Node runtime if the agent is working from stale cached type information and doesn't re-run `tsc`). The correct fix depends on *why* the module wasn't found (wrong relative path vs. genuinely missing compiled output vs. wrong resolution mode for the host) — extension removal papers over exactly one of those three causes and actively breaks ESM-format Node targets. **Check**: before removing an extension to silence a resolution error, confirm via `tsc --showConfig` that the effective `moduleResolution` is `"bundler"` (where extensionless is legitimate) — if it's `"node16"`/`"nodenext"`, the fix is almost never to drop the extension.
- **Assuming `.js`-extension discipline transfers uniformly across a monorepo**: an agent fixing one package's extensionless imports may "helpfully" apply the same fix fleet-wide, flagging or rewriting `ocx-catalog/src/theme`'s 128 intentionally-extensionless (and `.vue`-including) specifiers, which are correct under that subtree's separate `Bundler`-mode config. **Check**: before bulk-editing import extensions, resolve the *effective* tsconfig for the specific file being touched (respecting `include`/`exclude` and any sibling `tsconfig.*.json` like `tsconfig.theme.json`) — not the repo's top-level `tsconfig.json` assumed to apply everywhere.
- **Copying a CommonJS-era interop pattern into a NodeNext/ESM-format file**: `import x = require("y")`/`export =` are legal under `NodeNext` only for genuinely CJS-format files (`.cts`, or `.ts` without `"type": "module"`); a model pattern-matching from CJS-era training data may emit these in an ESM-format `.ts` file, which is a hard TS error (`TS1288`/`TS1202`-class), not a runtime issue — **check**: this fails at `tsc` time, so any pre-commit or CI type-check catches it; the risk is specifically an agent that edits without ever invoking `tsc`.

## Contested / evolving

- **`nodenext` vs. `node18`/`node20` for library authoring**: Andrew Branch's Nov 2023 post recommends plain `nodenext` without qualification, framing it as "the right option for authoring libraries." The current handbook theory page (fetched Aug 2026, no publish date printed on the page itself) instead singles out `"module": "node18"` — the *frozen* pairing — as "the best bet for maximizing... compatibility," precisely because `nodenext`'s resolution behavior can shift under a library author without a corresponding source change. Both are official-adjacent TypeScript-team sources; they are not contradictory in outcome (both rule out `bundler` for libraries) but they disagree on which of the two Node-flavored options is the *better* default, and the more specific, currently-live guidance (theory.html) postdates and refines the blog post's simpler advice. As of 2026-08-29, no fleet repo needs to resolve this — none of `ocx-catalog`/`grimoire-indexer`/`setup-ocx` currently show any problem attributable to `nodenext`'s movement — so this is a candidate for later hardening (pin to `node20`, the highest frozen value that still exists), not a current defect.
- **`allowImportingTsExtensions` + `rewriteRelativeImportExtensions` as a dev-loop pattern**: this combination (write `.ts` imports, run directly via `tsx`/Bun in dev, let `tsc` rewrite them to `.js` for the real build) is new as of TS 5.7 (Nov 2024) and none of the fleet's build scripts use it yet — all Node-target repos in the fleet compile-then-run rather than run-source-directly during development. Whether this becomes the fleet's normal pattern is unsettled; it trades one extra compiler flag for eliminating the felt need for `ts-node`/watch-and-restart tooling, but changes nothing about production behavior, so adoption is a developer-experience call, not a correctness one.
- **`node10` removal timeline**: verified TS 7.0.2 hard-removes it; `could not establish as of 2026-08-29` whether any *intermediate* 6.x point release changed the deprecation's silenceability (only 6.0.3, the fleet's own installed version, and 7.0.2 were tested directly) — treat "still silenceable via `ignoreDeprecations` somewhere in the 6.x line" as unverified, not asserted either way.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typescriptlang.org — Modules: Theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html) | Official TS handbook page | Current (fetched 2026-08-29; no page-level publish date shown) | Defines "host" as the deciding concept; source of the node18/node16 library recommendation and the "bundler is infectious" line |
| [typescriptlang.org — Modules: Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | Official TS handbook page | Current | Full behavior table per moduleResolution mode; cross-checked against live `tsc`, mostly accurate but its module18/20-as-moduleResolution framing needed empirical correction (§3) |
| [Andrew Branch — "Is nodenext right for libraries that don't target Node.js?"](https://blog.andrewbran.ch/is-nodenext-right-for-libraries-that-dont-target-node-js/) | Individual blog, TypeScript team member | Nov 14, 2023 | The strongest, most-quoted counter-intuitive argument for `nodenext` even in bundler-consumed libraries; the brief's named required reading |
| [devblogs.microsoft.com — Announcing TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/) | Official TS team announcement | Mar 16, 2023 | Introduces `moduleResolution: bundler` and `allowImportingTsExtensions`, with rationale and constraints |
| [devblogs.microsoft.com — Announcing TypeScript 5.7](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/) | Official TS team announcement | Nov 22, 2024 | Introduces `rewriteRelativeImportExtensions`, with exact rewriting rules and example |
| [typescriptlang.org — TypeScript 4.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html) | Official TS release notes | 2022 (exact page date not printed; commonly cited as June 2022 but not confirmed on-page) | Origin of `node16`/`nodenext`, `.mts`/`.cts`, `moduleDetection` — the foundational release for this whole topic |
| [nodejs.org — Modules: Packages](https://nodejs.org/api/packages.html) | Official Node.js docs | Current | Canonical condition-order list (`node-addons`, `node`, `import`, `require`, `module-sync`, `default`) and the ESM-loader's mandatory-extension rule, independent of TypeScript |
| [bun.com — Module resolution](https://bun.com/docs/runtime/modules) | Official Bun docs | Current | Confirms Bun's `bun, node-addons, node, require, import, default` condition order and its extensionless-import tolerance |
| [esbuild.github.io — API: Resolve extensions / Conditions](https://esbuild.github.io/api/#resolve-extensions) | Official esbuild docs | Current | Confirms `platform: "node"`/`"browser"` auto-injects the matching condition, independent of any `tsc` config — the mechanism behind `setup-ocx`'s deliberate Node-mirroring build |
| [Astro — `tsconfigs/base.json`](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/tsconfigs/base.json) (+ `strict.json`) | Project source (GitHub, `main` branch) | Fetched 2026-08-29 | Resolves the preset-inherited leg of the fleet's split (`kate-middlechild/packages/web`) to `Bundler`/`ESNext`, confirming it is not drift |
| TypeScript 6.0.3 and 7.0.2 compilers, installed and run directly (`tsc --noEmit`, `--showConfig`, deliberately malformed flags) | Primary/empirical — the compiler itself | 2026-08-29 (7.0.2 is the fleet's own established `typescript@latest`; 6.0.3 matches `vscode-ocx`'s pinned `devDependency`) | Ground truth for the CJS-format masking (§4/§8), the node18/20→node16 pairing (§3), and the node10 deprecation-to-removal timeline (§6) — none of these were fully trustworthy from documentation summaries alone |
| Fleet repositories under `/home/mherwig/dev` (`ocx-catalog`, `grimoire-indexer`, `setup-ocx`, `vscode-ocx`, `grimoire-vscode`, `fma`, `creeptd-ng/web`, `kate-middlechild`) | Primary — actual production source | Snapshot, 2026-08-29 | Every fleet-specific claim in this report (extension-compliance counts, build scripts, `package.json` `"type"` fields, `action.yml` runtime) is read directly from these files, not inferred |

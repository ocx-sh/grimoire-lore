---
title: "esbuild-to-CJS Bundling vs. TypeScript's ESM Type-Checking"
topic: "What the esbuild bundle step silently changes about module semantics that tsc type-checks as ESM, for grimoire-vscode and vscode-ocx"
agent: scout-bundling
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 16
scope: >
  Covers: esbuild 0.28.1's `cjs` output-format behavior for top-level await, dynamic
  `import()`, `import.meta`, `__dirname`/`__filename`, and `require()` of an external
  ESM-only package, each verified by running the fleet's own installed esbuild/tsc
  binaries; which VS Code/Electron/Node version the extension host actually runs
  (measured against VS Code's own release-branch `package.json`); and the single
  `module`/`moduleResolution` pair both extensions should use, including a reversal
  of `ts-modules.md`'s open-question lean on that point. Builds on `ts-modules.md`
  (resolution axis, the extensionless-import trap, `vscode-ocx`'s "inert" `Node16`)
  without re-deriving it. Does NOT cover webview `iife` bundles' browser-side module
  semantics, or the extension-host process/crash model (`host-failure-modes.md`).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What actually drives the output: esbuild's own flags, not tsconfig `module`](#1-what-actually-drives-the-output-esbuilds-own-flags-not-tsconfig-module)
   2. [Top-level await: a build error, not a silent one](#2-top-level-await-a-build-error-not-a-silent-one)
   3. [Dynamic `import()` vs. static `import`: the compatibility matrix](#3-dynamic-import-vs-static-import-the-compatibility-matrix)
   4. [`import.meta` / `import.meta.url`: the one that is genuinely silent](#4-importmeta--importmetaurl-the-one-that-is-genuinely-silent)
   5. [`__dirname`/`__filename`: real, but bundle-directory-relative, not source-file-relative](#5-__dirname__filename-real-but-bundle-directory-relative-not-source-file-relative)
   6. [`require()` of an ESM-only package: gated on the Node inside *this year's* Electron](#6-require-of-an-esm-only-package-gated-on-the-node-inside-this-years-electron)
   7. [`vscode` itself: never on disk, always `external`](#7-vscode-itself-never-on-disk-always-external)
   8. [Full bundling vs. `--packages=external`: settled by `.vscodeignore`, not by taste](#8-full-bundling-vs-packagesexternal-settled-by-vscodeignore-not-by-taste)
   9. [Node16 vs. ESNext/Bundler: what tsc actually flags — the decision](#9-node16-vs-esnextbundler-what-tsc-actually-flags--the-decision)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **esbuild ignores tsconfig's `module`/`moduleResolution` entirely for emission** — it reads `paths`/`baseUrl`/JSX options from tsconfig but shapes output purely from its own `--format`/`--platform`/`--target` flags [[1]](https://esbuild.github.io/api/). Whatever `module` says, the shipped `dist/extension.js` is CJS because `esbuild.js` says `format: 'cjs'` on both repos (`grimoire-vscode/esbuild.js:79`, `vscode-ocx/esbuild.js:37`).
- **Top-level await + `format: 'cjs'` is a hard build error, not a silent transform** — verified against esbuild 0.28.1: `✘ [ERROR] Top-level await is currently not supported with the "cjs" output format` [[2]](https://esbuild.github.io/content-types/). Neither fleet extension has a top-level-await site today (measured: `grep -rn '^await \|^const.*= await'` in both `src/`, zero hits outside `test/`).
- **Dynamic `import()` of an `external` package is left as real, native `import()`** in esbuild's cjs output — never rewritten to `require()`. Verified: `await import("smol-toml")` survives bundling byte-for-byte when `smol-toml` is in `external`. This works regardless of Node version or whether the package ships CJS at all.
- **Static top-level `import` of an `external` package becomes a literal `require("pkg")`** — verified in the same build. If that package is ESM-only (no `require` export condition), this throws `Cannot find module` / `ERR_REQUIRE_ESM` **unless** the host Node supports `require(esm)`.
- **A fully-bundled (non-external) import — static or dynamic — never touches `require()` for that package at all.** esbuild parses and inlines the ESM source directly, so ESM-only npm packages that are *not* marked `external` are risk-free regardless of Node version (verified with a synthetic `"type":"module"`-only package, no `require` export).
- **`require(esm)` stabilized late and gradually**: added experimental in Node v22.0.0/v20.17.0; the `--experimental-require-module` flag was removed (default-on) in v23.0.0/v22.12.0/v20.19.0; the warning disappeared in v23.5.0/v22.13.0/v20.19.0; it left "experimental" status entirely only in **v25.4.0** [[3]](https://nodejs.org/api/modules.html). It always throws `ERR_REQUIRE_ASYNC_MODULE` if the required module (or its graph) uses top-level await, on any Node version.
- **The extension host you're actually shipping to is whatever Electron the user's installed VS Code pins — not the `engines.vscode` floor.** VS Code 1.135 (current stable, released 2026-08-04) pins `"electron": "42.8.1"` [[4]](https://github.com/microsoft/vscode/blob/release/1.135/package.json), which bundles **Node 24.18.1** [[5]](https://releases.electronjs.org/releases.json) — comfortably past the `require(esm)` threshold. VS Code 1.96.4 — the literal floor both `package.json`s declare (`"vscode": "^1.96.0"`) — pins Electron **32.2.6** [[6]](https://github.com/microsoft/vscode/blob/release/1.96/package.json), bundling **Node 20.18.1**, which sits *below* the 20.19.0 flag-removal line: `require()` of an ESM-only dependency on that floor throws outright.
- **`import.meta`/`import.meta.url` under `format: 'cjs'` is the one genuinely silent failure**: esbuild emits `var import_meta = {}` and only a build *warning* (`"import.meta" is not available with the "cjs" output format and will be empty`), never an error. Both fleet `esbuild.js` files set `logLevel: 'silent'` (`grimoire-vscode/esbuild.js:72`, `vscode-ocx/esbuild.js:45`) and the shared problem-matcher plugin only forwards `result.errors`, never `result.warnings` — so on the current config this warning is swallowed everywhere, and the only symptom is `undefined` at runtime.
- **`__dirname`/`__filename` are real (platform:`node`), but they resolve to the *bundle's output directory*, not each source file's original directory** — verified: two different source files bundled into one output both report the same `__dirname`, equal to the output file's directory. Code assuming "my own directory" per source file is wrong post-bundle.
- **The `vscode` module is never on disk — it's injected into the host's `require` cache at extension-load time** — VS Code's own bundling guide is explicit that it must stay `external` [[7]](https://code.visualstudio.com/api/working-with-extensions/bundling-extension); both configs already do this correctly (`grimoire-vscode/esbuild.js:83`, `vscode-ocx/esbuild.js:44`).
- **Full bundling is not a style choice here — `--packages=external` would ship a broken extension.** Both `.vscodeignore` files hard-exclude `node_modules/**` (`grimoire-vscode/.vscodeignore:11`, `vscode-ocx/.vscodeignore:11`) and both `package` scripts run `vsce package --no-dependencies`, which disables vsce's own dependency-inclusion detection (`vsce --help`: `--no-dependencies Disable dependency detection via npm or yarn`). Marking any real dependency `external` under this packaging setup ships a `.vsix` that throws `Cannot find module` on activation — a failure invisible to `check`, `build`, and `test`, caught only by installing the packaged `.vsix`.
- **`tsc --noEmit` under `Node16` catches two of these for free, before the build ever runs — `ESNext`/`Bundler` catches neither.** Measured directly against TypeScript 6.0.3: a file with `import.meta.url` and top-level `await`, compiled with the same "no `package.json` type field" condition both repos actually have, produces **`TS1470`** (`'import.meta' meta-property is not allowed in files which will build into CommonJS output`) and **`TS1309`** (`await` at top level in a CommonJS module) under `module: Node16` — and zero errors under `module: ESNext, moduleResolution: Bundler`.
- **Decision: both extensions should standardize on `module: Node16, moduleResolution: Node16`** — this reverses `ts-modules.md`'s lean ("align `vscode-ocx` to `Bundler`" — an *open question*, not an established finding, and one that document scoped to import-graph correctness rather than the bundling interaction found here). See [§9](#9-node16-vs-esnextbundler-what-tsc-actually-flags--the-decision) for the full argument.
- **`--packages=external` is wrong for both extensions; keep full bundling.** See [§8](#8-full-bundling-vs-packagesexternal-settled-by-vscodeignore-not-by-taste).
- Neither extension has a live defect from any of this today — every risky construct (`import.meta`, top-level await, an `external`-marked ESM-only runtime dependency) is currently **absent** from both `src/` trees (measured). This is a guardrail question for what an unsupervised agent writes *next*, not a bug report.

## Findings

### 1. What actually drives the output: esbuild's own flags, not tsconfig `module`

esbuild "can work directly with TypeScript files. However, esbuild simply strips off all type declarations without doing any type checks" [[7]](https://code.visualstudio.com/api/working-with-extensions/bundling-extension) — type checking is `tsc --noEmit`'s job, run as a separate script in both repos (`check-types`). esbuild's own docs describe reading tsconfig only for path remapping (`paths`/`baseUrl`), JSX configuration, and `useDefineForClassFields` [[1]](https://esbuild.github.io/api/) — never for `module` or `moduleResolution`. This was confirmed empirically: bundling identical source with `--format=cjs` produces byte-identical transform decisions (top-level-await rejection, `import.meta` warning, dynamic-`import()` preservation) irrespective of any tsconfig `module` setting, because esbuild's `cjs`/`esm`/`iife` choice comes only from its own `--format` flag.

**Practical consequence**: tsconfig's `module` value changes what *type-checks* as valid TypeScript. It has zero effect on what the shipped `dist/extension.js` actually contains, because esbuild — not `tsc` — performs all real emission in both fleet extensions (`grimoire-vscode/esbuild.js`, `vscode-ocx/esbuild.js`; `tsc --noEmit` never emits). The one exception is `vscode-ocx`'s test-compile step, covered in [§9](#9-node16-vs-esnextbundler-what-tsc-actually-flags--the-decision).

### 2. Top-level await: a build error, not a silent one

esbuild's content-types docs: "while transforming code containing top-level await is supported, bundling code containing top-level await is only supported when the output format is set to `esm`" [[2]](https://esbuild.github.io/content-types/). Verified directly against esbuild 0.28.1 (the version both `package.json`s pin: `grimoire-vscode/package.json:370`, `vscode-ocx/package.json:176`):

```
$ esbuild t3.js --bundle --format=cjs --platform=node --outfile=t3.out.js
✘ [ERROR] Top-level await is currently not supported with the "cjs" output format

    t3.js:1:10:
      1 │ const x = await Promise.resolve(1);
        ╵           ~~~~~
```

This is a **hard, unconditional build failure** — `npm run build` exits non-zero, and both repos' `esbuildProblemMatcherPlugin` forwards `result.errors` (`grimoire-vscode/esbuild.js`, `vscode-ocx/esbuild.js`), so it surfaces even with `logLevel: 'silent'`. It is not silent at runtime because it never reaches runtime: the build itself refuses. The only place it can bite unsupervised is if an agent writes it, `tsc --noEmit` passes (see §9 — under `ESNext`/`Bundler` it does), and the failure is deferred one script further than it needs to be.

Same restriction applies to the webview `iife` bundles (`format: 'iife'` in both `esbuild.js`s) — `iife` is not `esm` either, so top-level await in webview code fails the same way.

### 3. Dynamic `import()` vs. static `import`: the compatibility matrix

TypeScript's own handbook draws the same external/bundled distinction esbuild does, independently, for its `Node16`/`NodeNext` CommonJS emit: "CommonJS emit leaves dynamic `import()` calls untransformed, so CommonJS modules can asynchronously import ES modules" — contrasted explicitly with plain `--module commonjs`, where "Dynamic `import()` is transformed to a Promise of a `require()` call" [[8]](https://www.typescriptlang.org/docs/handbook/modules/reference.html). Neither fleet repo uses plain `commonjs`; `vscode-ocx` uses `Node16` so this only matters for its `tsc`-emitted test-compile path — see §9.

esbuild's own behavior for its cjs bundle output was verified directly (esbuild 0.28.1, `--platform=node`):

| import form | package marked `external`? | esbuild cjs output | risk |
|---|---|---|---|
| `await import('pkg')` | yes | `await import("pkg")` — **untouched, native** | none, any Node/package |
| `await import('./local.js')` | n/a (bundled) | `await Promise.resolve().then(() => (init_x(), x_exports))` — inlined lazy-init, not `require` | none |
| `import { f } from 'pkg'` | yes | `var import_pkg = require("pkg");` | **breaks** if `pkg` is ESM-only and host Node lacks `require(esm)` |
| `import { f } from 'pkg'` | no (bundled) | source inlined directly, no `require`/`import` of the package at all | none, any Node/package |

Correct vs. wrong for a genuinely optional/lazy ESM-only dependency you want to keep out of the bundle:

```js
// WRONG — becomes require("pkg") in the cjs bundle; throws on a host
// Node below the require(esm) threshold, or if pkg has top-level await.
import { parse } from 'pkg';

// RIGHT — esbuild leaves this as a real dynamic import(); works on any
// Node, any package shape, because it's never downgraded to require().
const { parse } = await import('pkg');
```

`vscode-ocx/src/test/schema.test.ts:14` already does the right thing (`await import('smol-toml')`), with the comment "smol-toml is ESM-only, load it dynamically from this CJS test module." That comment is now slightly stale — the installed `smol-toml@^1.3.1` ships a dual build with a `require` export condition (`node_modules/smol-toml/package.json`: `"exports": {"import": "./dist/index.js", "require": "./dist/index.cjs"}`) — so a plain `require('smol-toml')` would work too today. The dynamic-import choice is still correct defensively: it is safe whether or not the dependency stays dual-published.

### 4. `import.meta` / `import.meta.url`: the one that is genuinely silent

Verified against esbuild 0.28.1:

```
$ esbuild t5.js --bundle --format=cjs --platform=node --outfile=t5.out.js
▲ [WARNING] "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta]

    t5.js:1:12:
      1 │ console.log(import.meta.url);
        ╵             ~~~~~~~~~~~~

  You need to set the output format to "esm" for "import.meta" to work correctly.

$ node t5.out.js
undefined
```

The build **succeeds** — this is a warning, not an error — and the output silently becomes `undefined` at every call site. Both fleet `esbuild.js` files set `logLevel: 'silent'` (`grimoire-vscode/esbuild.js:72`; `vscode-ocx/esbuild.js:45`), and the shared problem-matcher plugin's `onEnd` handler only iterates `result.errors`, never `result.warnings` — so on the current config, nothing prints this warning anywhere: not the terminal, not the VS Code task's problem matcher, nothing. The only observable symptom is a runtime `undefined` (typically surfacing several calls downstream, e.g. inside `path.join(undefined, ...)` or `fileURLToPath(undefined)`).

Neither extension uses `import.meta` today (measured: `grep -rln 'import\.meta' src/` — zero hits, both repos). This is a dormant trap, not a live one — see [§9](#9-node16-vs-esnextbundler-what-tsc-actually-flags--the-decision) for why `grimoire-vscode`'s current tsconfig gives an agent no static warning before it becomes this runtime symptom, while `vscode-ocx`'s does.

### 5. `__dirname`/`__filename`: real, but bundle-directory-relative, not source-file-relative

`platform: 'node'` preserves real Node CJS globals in the output — no shim needed for first-party code. But bundling collapses many source files into one output file, and `__dirname` is a property of the *executing file*, not of each original `.ts`:

```
$ esbuild t7.js --bundle --format=cjs --platform=node --outfile=out/t7.out.js
// t7.js imports ./sub/inner.js, which itself reads __dirname
$ node out/t7.out.js
outer __dirname: …/scratchpad/esbuild-probe/out
inner __dirname: …/scratchpad/esbuild-probe/out
```

Both the top-level file and a nested module three directories deep report the **same** `__dirname` — the output file's directory (`out/`, i.e. in the real repos `dist/` for the host bundle, `out/test/` for `grimoire-vscode`'s bundled tests). Code in any bundled source file that does `path.join(__dirname, '../assets/foo.png')` assuming "relative to where I, this file, live on disk" gets the *bundle's* directory instead — silently wrong if the two don't coincide, silently right (by accident) if they do. `grimoire-vscode`'s 5 `src/test/*.test.ts` files that reference `__dirname`/`__filename` are all resolved relative to `out/test/` post-bundle, not `src/test/`, exactly as `vscode-ocx/src/test/schema.test.ts:9`'s comment already documents by hand (`"out/test/schema.test.js → repo root is two levels up"`) — the right instinct, worth turning into a rule so it isn't re-derived per file.

This same collapse applies to a *third-party* dependency's own `__dirname`/`import.meta.url`/`fs.readFileSync`-relative-to-itself usage once it is fully bundled rather than kept external — esbuild's own `--packages` docs name exactly these ("`__dirname`, `import.meta.url`, `fs.readFileSync`, and `*.node` native binary modules") as the node-specific features that break when bundling pulls a package's code out of its own directory [[1]](https://esbuild.github.io/api/#packages). Neither fleet extension has such a dependency today (zero `dependencies` in either `package.json`), so full bundling is unconditionally safe right now — but it is a real tension to flag for whoever adds the first one: a package that reads a file relative to its own `__dirname` (a native-binding loader, a bundled WASM/data file) needs to stay `external`, which conflicts with §8's "nothing in `external` may exist outside `vscode`/`mocha` because `node_modules` never ships" constraint. That collision, not either rule in isolation, is the thing to catch — see guidance rule 5.

### 6. `require()` of an ESM-only package: gated on the Node inside *this year's* Electron

Node's own docs give the `require(esm)` timeline plainly: "Added in: v22.0.0, v20.17.0" (experimental); flag removed (default-on) "v23.0.0, v22.12.0, v20.19.0"; no-warning-by-default "v23.5.0, v22.13.0, v20.19.0"; and the feature left "Stability: 1 — Experimental" status only in **v25.4.0** [[3]](https://nodejs.org/api/modules.html). The unconditional caveat: `require()`ing a module whose graph contains top-level await always throws `ERR_REQUIRE_ASYNC_MODULE`, on every Node version — dynamic `import()` is the only way to load such a module from CJS.

Verified locally (Node v24.14.0, above every threshold above): `require()` of a synthetic package (`"type":"module"`, no `require` export condition) bundled as `external` and statically imported **succeeds silently**, printing `"hi"` with no warning. On an older Node this exact bundle throws `Cannot find module` / `ERR_REQUIRE_ESM` instead (reproduced directly: marking `smol-toml` external and statically importing it in a build against a `node_modules` that doesn't expose it at all threw `Error: Cannot find module 'smol-toml'` — the same failure class a version-gated `require(esm)` miss produces).

Which Node is the extension host, concretely — measured, not assumed:

| VS Code | Electron pin | Node in that Electron | `require(esm)` without a flag? |
|---|---|---|---|
| 1.135 (current stable, released 2026-08-04) [[4]](https://github.com/microsoft/vscode/blob/release/1.135/package.json) | `42.8.1` | `24.18.1` [[5]](https://releases.electronjs.org/releases.json) | **Yes** — well past the v20.19.0/v22.12.0 line |
| 1.96.4 (the literal `"vscode": "^1.96.0"` floor both `package.json`s declare) [[6]](https://github.com/microsoft/vscode/blob/release/1.96/package.json) | `32.2.6` | `20.18.1` [[5]](https://releases.electronjs.org/releases.json) | **No** — below v20.19.0, needs `--experimental-require-module` |

Neither `esbuild.js` nor `package.json` sets that flag in either repo (measured: no occurrence of `experimental-require-module` anywhere in either tree). Practically: static `import` of an `external`, ESM-only, synchronous npm dependency works today because VS Code auto-updates and almost every real install runs well past 1.96 — but the `engines.vscode` floor the fleet actually *declares* does not guarantee it. This is dormant (neither repo has such a dependency today — both have zero `dependencies`, only `devDependencies`), but it is exactly the kind of thing an agent adding a first real runtime dependency would get wrong by reasoning from "Node supports `require(esm)` now" without checking which Node the declared floor implies.

### 7. `vscode` itself: never on disk, always `external`

VS Code's bundling guide states the module "does not exist on disk" — it is injected by the host at load time — and instructs bundler configs to "Exclude the `vscode` module from the bundle (since it's provided by the VS Code runtime)" [[7]](https://code.visualstudio.com/api/working-with-extensions/bundling-extension). Both fleet configs already do this correctly for the host bundle (`grimoire-vscode/esbuild.js:83`, `vscode-ocx/esbuild.js:44`) and for bundled tests (`grimoire-vscode/esbuild.tests.js:29`: `external: ['vscode', 'mocha']`). Nothing to fix here; recorded because it's the one divergence-shaped risk that's already closed and should stay that way (a normative rule below pins it so a future edit can't regress it silently).

### 8. Full bundling vs. `--packages=external`: settled by `.vscodeignore`, not by taste

esbuild's `packages: 'external'` "means that all package imports [are] considered external to the bundle, and are not bundled. Note that your dependencies must still be present at runtime" [[1]](https://esbuild.github.io/api/#packages) — the docs put the burden explicitly on the packager to ensure `node_modules` ships alongside the bundle.

Both fleet `.vscodeignore` files exclude it outright:

```
# grimoire-vscode/.vscodeignore:11, vscode-ocx/.vscodeignore:11
node_modules/**
```

And both `package` scripts run `vsce package --no-dependencies` (`grimoire-vscode/package.json:356`, `vscode-ocx/package.json:165`) — confirmed via the installed `vsce` binary itself: `--no-dependencies` "Disable dependency detection via npm or yarn," i.e. it turns off vsce's own fallback mechanism for including a dependency tree in the `.vsix`. Between the two, no path exists for `node_modules` to reach the packaged extension.

**Decision: full bundling (current behavior in both repos) is correct; `--packages=external` must not be adopted.** If it were, every `external`-marked package would compile clean, pass every check/build/test script (all of which run against the dev tree, where `node_modules` is present), and only fail at first use after a real user installs the `.vsix` — `Cannot find module '<pkg>'`, thrown from inside `activate()` or later, with no local repro path shorter than actually installing the packaged artifact. This is the single most silent of the divergences in this document because none of the fleet's existing tooling would catch it.

### 9. Node16 vs. ESNext/Bundler: what tsc actually flags — the decision

`ts-modules.md` already established, and this report does not re-derive: `moduleResolution` should default to `NodeNext`/`Node16` fleet-wide, with `Bundler` reserved for cases where "one specific bundler always intervenes AND no external consumer exists"; and `vscode-ocx`'s current `Node16`/`Node16` is *not* a live defect — the extensionless-import check it should in principle add is inert because neither `package.json` sets `"type"`. That document left one question explicitly to a human: **align `vscode-ocx` to `grimoire-vscode`'s `Bundler`, or make `Node16` "true"?** — leaning toward `Bundler` purely on convenience ("zero source changes... the fix is one line").

This research adds an axis that prior document's brief didn't cover — what each setting does or doesn't catch against the *actual* CJS output esbuild produces — and it reverses that lean. Measured directly (TypeScript 6.0.3, same "no `package.json` type field" condition both repos actually have):

```ts
// a.ts
console.log(import.meta.url);
const x = await Promise.resolve(1);
```

```
$ tsc --noEmit   # module: Node16, moduleResolution: Node16
a.ts(1,13): error TS1470: The 'import.meta' meta-property is not allowed in
  files which will build into CommonJS output.
a.ts(2,11): error TS1309: The current file is a CommonJS module and cannot
  use 'await' at the top level.

$ tsc --noEmit   # module: ESNext, moduleResolution: Bundler
(no errors)
```

Under `Node16`, `tsc --noEmit` — already the `check-types` step in both repos' `check`/`pretest` composite scripts (`vscode-ocx/package.json:157,161,163`) — rejects both constructs **before `esbuild` ever runs**, for free, because TypeScript reasons about the file's actual CJS-ness (no `"type": "module"` ⇒ CommonJS) the same way esbuild's `format: 'cjs'` does. Under `ESNext`/`Bundler`, TypeScript assumes the file is really going to ship as ESM and raises nothing — the only backstop left is esbuild itself, which is a hard error for top-level await (§2, loud, just one step later than necessary) but only a *suppressed warning* for `import.meta` (§4, because `logLevel: 'silent'` — fully silent end to end).

This is exactly the situation `ts-modules.md` didn't have in view: whether `Bundler` "always intervenes" is true for the *host bundle*, but esbuild's own transform behavior for these two constructs is identical to what `Node16`'s CJS emit would produce anyway (§1) — so `Bundler`'s permissiveness buys nothing here and specifically costs the two static checks above. And the "zero-friction" framing holds in the other direction too: because neither repo sets `"type": "module"`, switching `grimoire-vscode` to `Node16`/`Node16` doesn't newly require file extensions on relative imports (the same "inert" condition `ts-modules.md` already documented for `vscode-ocx` applies identically) — it is a pure gain, not a trade-off.

**Decision: both extensions should use `module: Node16, moduleResolution: Node16`.** Concretely: `vscode-ocx` keeps its current setting; `grimoire-vscode/tsconfig.json:3-4` changes from `"module": "ESNext", "moduleResolution": "Bundler"` to `"module": "Node16", "moduleResolution": "Node16"`. This is also the setting that matches the one place TypeScript's own emission is load-bearing today — `vscode-ocx`'s `compile-tests: tsc -p . --outDir out` (`vscode-ocx/package.json:162`) — where `Bundler` is not a safe choice at all: TypeScript would emit real ESM `import`/`export` syntax into extensionless `out/test/*.js` files that Node loads as CommonJS (no `"type": "module"`), a straight `SyntaxError: Unexpected token 'export'` the first time `npm test` runs. `grimoire-vscode` sidesteps this entirely by never letting `tsc` emit for tests (`esbuild.tests.js` bundles them instead, `grimoire-vscode/esbuild.tests.js:24`) — itself the direct result of an earlier ESM-only-dependency break the file's own header comment records (`lit-html is ESM-only, so the old tsc -p tsconfig.test.json CJS emit could no longer require() it`). One config, one reason, both repos: TypeScript should always describe the CJS reality esbuild is going to produce.

## Normative guidance candidates

1. **Set `module: "Node16"` and `moduleResolution: "Node16"` in both extensions' `tsconfig.json`.** Rationale: it is the only setting that (a) matches what the actual `dist/extension.js` is (CJS, per `esbuild.js`'s `format: 'cjs'`), and (b) turns `import.meta`/top-level-await into `tsc --noEmit` errors instead of a suppressed warning or a late build error. Verify: `tsc --showConfig | grep -E '"module"|"moduleResolution"'` prints `Node16`/`Node16` in both repos.

2. **Never write `import.meta` or `import.meta.url` in extension-host source (`src/extension.ts` and anything it imports).** Rationale: silently becomes `undefined` in the `cjs` bundle (§4), and the build warning is currently suppressed. Verify: `grep -rn 'import\.meta' src/` returns nothing; CI fails the build if it does (this is what rule 1 gets you for free once `Node16` is in place — `TS1470`).

3. **Never write top-level `await` in a file that ends up in a `format: 'cjs'`/`format: 'iife'` esbuild entry point** (host code or webview code). Rationale: unconditional esbuild build error (§2) — not a runtime risk, but a wasted round-trip an agent can avoid by knowing it up front. Verify: same `tsc --showConfig`/`Node16` check as rule 1 (`TS1309`) catches it before the build does.

4. **Prefer dynamic `import()` over static `import` for any dependency you intend to keep out of the bundle (`external`).** Rationale: esbuild leaves `external` dynamic imports as real `import()` regardless of Node version or whether the package is ESM-only or dual-published (§3); a static `import` of the same package becomes `require()`, which is Node-version- and package-shape-gated. Verify: for every entry in `esbuild.js`'s `external` array besides `"vscode"`/`"mocha"`, grep its call sites in `src/` and confirm none are static `import`/`import type` statements for a runtime (non-type-only) binding — `grep -rn "from '<pkg>'" src/` should show only `await import('<pkg>')` or `import type`.

5. **Do not add a package to `esbuild.js`'s `external` array unless you also change `.vscodeignore` and the `package` script to ship it.** Rationale: with `node_modules/**` excluded from both `.vscodeignore`s (`grimoire-vscode/.vscodeignore:11`, `vscode-ocx/.vscodeignore:11`) and `vsce package --no-dependencies` set, an externalized runtime dependency is silently absent from the `.vsix` — `Cannot find module` at activation, caught by nothing in `check`/`build`/`test` (§8). Verify: any name added to `external:` (beyond `vscode`, `mocha`) must correspond to either (a) a removed `node_modules/**` line in `.vscodeignore`, or (b) a decision to keep it fully bundled instead — the smallest check is a CI step that installs the packaged `.vsix` and runs a smoke activation.

6. **Never set `packages: 'external'`/`--packages=external` for either extension's host or test bundle.** Rationale: identical failure mode to rule 5, applied wholesale instead of per-package (§8). Verify: `grep -n "packages" esbuild.js` in both repos returns nothing.

7. **Keep `external: ['vscode']` (host bundle) and `external: ['vscode', 'mocha']` (test bundle) exactly as-is; never let a refactor drop it.** Rationale: the `vscode` module does not exist on disk (§7) — bundling it (or failing to mark it external) is a build-time resolution error, not silent, but worth pinning as a regression guard. Verify: `grep -n "external:" esbuild.js` in both repos includes `'vscode'`.

8. **Do not assume `__dirname`/`__filename` inside bundled code point at the original source file's directory — they point at the bundle's output directory.** Rationale: verified empirically (§5) — every source file folded into one `dist/extension.js` (or one `out/test/*.test.js`) shares one `__dirname`, equal to that output file's own directory. Verify by reading heuristic: any `path.join(__dirname, …)` in `src/` should be read as "relative to `dist/` (or `out/test/`)," not "relative to this `.ts` file" — flag any comment or reasoning that assumes otherwise.

9. **Treat `require()` of an `external`, ESM-only, non-type-only dependency as unsafe regardless of what today's Node supports**, unless the repo's `engines.vscode` floor is raised to a version whose pinned Electron ships `require(esm)` unflagged. Rationale: the current floor (`^1.96.0` → Electron 32.2.6 → Node 20.18.1) predates the v20.19.0 threshold (§6); relying on "Node 22+ supports this" reasons from the *current* host, not the declared minimum. Verify: cross-reference the repo's `engines.vscode` value against `https://raw.githubusercontent.com/microsoft/vscode/release/<version>/package.json`'s `devDependencies.electron`, then that Electron version's `node` field in Electron's release feed — a one-time lookup, revisit only when the floor is bumped.

10. **Keep `check-types` (`tsc --noEmit`) as a required step before `build` in both repos' `check`/`pretest` scripts — never let an agent "speed up CI" by dropping it.** Rationale: under rule 1's `Node16` setting, this is the step that actually catches `TS1470`/`TS1309` (§9); skipping it removes the only static gate these two constructs have. Verify: `check` and `pretest` scripts in both `package.json`s include `check-types` (`vscode-ocx/package.json:161,163` already do; confirm `grimoire-vscode/package.json` matches after rule 1 lands).

11. **Either stop setting `logLevel: 'silent'` in both `esbuild.js` files, or extend the shared problem-matcher plugin to also print `result.warnings`.** Rationale: `import.meta`'s build warning (§4) is the one construct that `Node16` (rule 1) does *not* fully close by itself for every case — a `.mjs`/ESM-file exception inside an otherwise-CJS tree, for instance, would still only warn, not error, and that warning is currently swallowed end to end. Verify: `grep -n "logLevel" esbuild.js` — if it says `'silent'`, confirm the `onEnd` handler in the same file also iterates `result.warnings`, not just `result.errors`.

12. **When bundling tests with `tsc` directly (not esbuild) — `vscode-ocx`'s `compile-tests` script — never switch that path's effective `moduleResolution` to `Bundler`.** Rationale: `Bundler` mode is meant for a workflow where a bundler is always the last thing to touch the code before it runs; `vscode-ocx`'s `tsc -p . --outDir out` is real, final emission that Node loads directly — `Bundler` there would emit ESM syntax into extensionless CJS-context `.js` files, a `SyntaxError` at `npm test` time (§9). Verify: any tsconfig used by a script whose output is *not* subsequently re-processed by esbuild must use `Node16`/`NodeNext`, never `Bundler` — grep each `package.json` script for `tsc -p`/`tsc --outDir` (real emission) vs. `tsc --noEmit` (checking only) and match the tsconfig accordingly.

## AI-agent angle

- **Reflexive `import.meta.url` + `fileURLToPath` for "get my own directory/URL" in what reads like a modern-ESM project.** An LLM sees `"module": "ESNext"` and writes the idiom it has seen thousands of times in real ESM codebases; under the current `grimoire-vscode` config it type-checks clean, builds with only a suppressed warning, and fails as a downstream `undefined`. Smallest check: `grep -rn 'import\.meta' src/` in CI, or — better — adopt rule 1 so it's a compile error the agent sees immediately, at the point it wrote the line.
- **Marking a newly-added dependency `external` "to keep the bundle small" without checking `.vscodeignore`.** This is the instinct an agent reasonably has when it sees a large package pulled into `dist/extension.js` — externalizing looks like the fix a general Node/bundler context would suggest. Here it silently produces a `.vsix` that can't find the module at runtime, because `node_modules/**` never ships (§8). Smallest check: rule 5/6's grep, or a one-line CI step that runs `vsce package --no-dependencies && unzip -l *.vsix | grep node_modules` and expects it empty (or every `external`-marked package present, if that policy ever changes).
- **Assuming `require()` "just works" for a new ESM-only dependency because Node 22+ (or "current Node") supports `require(esm)`.** True of the *current* Electron host (§6), not of the declared `engines.vscode` floor, and the agent has no way to know the floor's actual Node without doing the Electron-version lookup this document already did. Smallest check: rule 9 — or simpler, default to dynamic `import()` for anything not certain to be dual-published (rule 4), which sidesteps the Node-version question entirely.
- **"Helpfully" converging `vscode-ocx`'s tsconfig to match `grimoire-vscode`'s `ESNext`/`Bundler`** because the sibling repo already does it, `ts-modules.md` itself leans that way, and the diff looks smaller. This is the single most on-point trap this document exists to close: §9 shows the opposite direction is correct once the bundling interaction is in view. Smallest check: don't take "match the sibling" as sufficient — re-run the `tsc --noEmit` probe in §9 (or trust rule 1) before changing either tsconfig.
- **Auto-fixing an extensionless relative import by adding `.js`, assuming `Node16` always requires it.** Not this document's finding (covered in `ts-modules.md`), but adjacent enough to flag: the fix is only needed when `"type": "module"` is set, which neither `package.json` here has — check that field first, not the `moduleResolution` value alone.

## Contested / evolving

- **Direct disagreement with `ts-modules.md`'s open-question lean, as of 2026-08-29.** That document's own brief scoped it to import-graph/resolution correctness and explicitly deferred the choice to a human, leaning toward `Bundler` on convenience grounds. This document's brief covers the bundling interaction that lean didn't have — §9's measured `tsc --noEmit` result under `Node16` is the new evidence. Both documents live in this program; the consolidator should treat this reversal as the current answer to that open question, not as a contradiction to average away.
- **`require(esm)`'s stability is still moving.** Node's own docs mark it non-experimental only from **v25.4.0** [[3]](https://nodejs.org/api/modules.html) — a very recent line relative to VS Code 1.135's bundled Node 24.18.1, which predates that stabilization release. Functionally it already works (verified locally on Node 24.14.0, and the feature's flag-removal/no-warning milestones both land well before v25), but "stable" in the Node sense and "shipped in the extension host you're targeting" are two different claims worth keeping separate as Node 25.x propagates into future Electron/VS Code pins.
- **Whether esbuild will ever support top-level await for `cjs` output**: no roadmap statement found on esbuild's own docs pages either way — could not establish as of 2026-08-29. Treat the current restriction (§2) as durable, not as a version gap likely to close soon.
- **`import.meta` under `cjs` staying a warning rather than an error** is esbuild's long-standing, deliberate design (it degrades gracefully for code paths that don't execute `import.meta` at runtime even under a mismatched format) — no indication found that this is trending toward becoming a hard error. The mitigation available today is local (rule 1/11), not upstream.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [esbuild API docs — Build, Format, Packages](https://esbuild.github.io/api/) | esbuild official docs | esbuild 0.28.1 era (fleet's pinned version); no on-page revision date | Ground truth for `--format`, `--packages=external`, and what esbuild reads from tsconfig |
| [esbuild content types — JavaScript caveats](https://esbuild.github.io/content-types/) | esbuild official docs | esbuild 0.28.1 era | Exact top-level-await-under-bundling restriction and CJS/ESM interop notes |
| [VS Code: Bundling Extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension) | VS Code official extension-authoring guide | fetched 2026-08-29; page footer dated 8/26/2026 | Canonical esbuild config for a VS Code extension; states the `vscode`-external requirement explicitly |
| [VS Code: Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) | VS Code official docs | fetched 2026-08-29 | `vsce package` behavior context for the `.vscodeignore`/`--no-dependencies` argument in §8 |
| [TypeScript Handbook — Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | TypeScript official handbook | page states "Last updated: Aug 28, 2026" | Primary source for `Node16`/`NodeNext` CJS emit's dynamic-`import()` preservation vs. plain `commonjs`'s `require()` downlevel, and `require(esm)` interop |
| [Node.js docs — `require()`ing ES modules](https://nodejs.org/api/modules.html) | Node.js official API docs | fetched 2026-08-29 (current/latest docs) | Exact `require(esm)` version timeline and the `ERR_REQUIRE_ASYNC_MODULE` caveat |
| [VS Code `release/1.135` `package.json`](https://github.com/microsoft/vscode/blob/release/1.135/package.json) | VS Code source repo, release branch | 1.135, current stable as of 2026-08-29 | Pins the exact Electron version (`42.8.1`) the current extension host runs |
| [VS Code `release/1.96` `package.json`](https://github.com/microsoft/vscode/blob/release/1.96/package.json) | VS Code source repo, release branch | 1.96.4, 2024-11-27 — the fleet's declared `engines.vscode` floor | Pins the Electron version (`32.2.6`) at the floor both extensions actually declare |
| [Electron releases feed](https://releases.electronjs.org/releases.json) | Electron project's machine-readable release index | queried 2026-08-29; covers all Electron releases including 42.8.1 (2026-08-04) and 32.2.6 (2024-11-27) | Maps each pinned Electron version to its bundled Node.js version |
| [VS Code Updates](https://code.visualstudio.com/updates) | VS Code release-notes index | fetched 2026-08-29 | Established 1.135 as the current stable release to pin the Electron lookup against |
| Local `esbuild@0.28.1` binary (`vscode-ocx/node_modules/.bin/esbuild`) | Empirical tool probe, this research | run 2026-08-29 against the fleet's own pinned version | Ground truth for §§2–5: exact build errors/warnings and output for top-level await, dynamic/static `import`, `import.meta`, `__dirname` |
| Local `typescript@6.0.3` binary (`vscode-ocx/node_modules/.bin/tsc`) | Empirical tool probe, this research | run 2026-08-29 against the fleet's own pinned version | §9's decisive measurement: exact `TS1470`/`TS1309` under `Node16` vs. silence under `ESNext`/`Bundler` |
| Local `@vscode/vsce` binary `--help` output | Empirical tool probe, this research | vsce version as pinned by both repos' `devDependencies`; run 2026-08-29 | Confirms `--no-dependencies`'s exact meaning for §8 |
| `grimoire-vscode/esbuild.js`, `esbuild.tests.js`, `tsconfig.json`, `.vscodeignore`, `package.json` | Fleet source, read-only | current `main` as of 2026-08-29 | The actual host-bundle, test-bundle, and packaging configuration measured throughout |
| `vscode-ocx/esbuild.js`, `tsconfig.json`, `.vscodeignore`, `package.json`, `src/test/schema.test.ts` | Fleet source, read-only | current `main` as of 2026-08-29 | Same, for the sibling extension; source of the `smol-toml` dynamic-import example in §3 |
| [`ts-modules.md`](../ts-modules.md) (this research program, prior wave) | Internal prior-wave research artifact | 2026-08-29 | Establishes the resolution-axis rules and the `vscode-ocx` "inert `Node16`" finding this document builds on and, on one narrow point, revises |

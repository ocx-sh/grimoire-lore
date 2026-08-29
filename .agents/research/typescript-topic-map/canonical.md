---
title: TypeScript Canonical Topic Map
corpus: TypeScript Handbook, TS release notes 5.0-7.0, tsconfig reference, Effective TypeScript 2nd ed., type-challenges, Node.js docs, MDN, Bun docs, Deno docs
agent: typescript-topic-map scout
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 26
scope: |
  Landscape survey of canonical TypeScript sources to find topics an AI coding
  agent must be expert in while editing code with no human in the loop, across
  five fleet shapes (published ESM lib+CLI on NodeNext, VS Code extension
  host, Bun-run GitHub Action, browser SPAs w/ Vite+Connect-RPC, Biome
  monorepo), TS ^5.7 floor. Excludes topics the prior Rust/Python programs
  already settled generically (see frontmatter's parent brief); includes only
  the TS-specific instance or the place TS inverts the generic advice.
  Does not rank/select rules or write guidance prose — that is the next
  program phase's job.
---

## Table of contents

- [Summary](#summary)
- [Corpus walk](#corpus-walk)
  - [TypeScript Handbook](#typescript-handbook)
  - [TypeScript release notes, 5.0 → 7.0](#typescript-release-notes-50--70)
  - [tsconfig reference](#tsconfig-reference)
  - [Effective TypeScript, 2nd edition](#effective-typescript-2nd-edition)
  - [type-challenges](#type-challenges)
  - [Node.js official docs](#nodejs-official-docs)
  - [MDN](#mdn)
  - [Bun docs](#bun-docs)
  - [Deno docs](#deno-docs)
- [Candidate topics](#candidate-topics)
- [Sources](#sources)

## Summary

- **The single biggest fact this fleet must internalize: the ground moved out from under the stated ^5.7 floor.** TypeScript 6.0 shipped 2026-03-23 and flipped `strict`, `module` (→`esnext`), `target` (→`es2025`), and `types` (→`[]`) to new *defaults*; TypeScript 7.0 shipped stable 2026-07-08 as a full Go-native compiler rewrite ("Project Corsa") with no stable programmatic API until 7.1. A rule set anchored on 5.7 semantics will silently mis-describe the compiler most agents actually run today.
- **TS 7.0's missing programmatic API is a live landmine for the extension-host and monorepo shapes**: `ts-morph`, `typescript-eslint`, and any tool that imports the `typescript` package as a library may not yet track the Go rewrite — version-pin guidance is not optional here, it's load-bearing.
- **Decorators are two incompatible features wearing one keyword.** TC39 stage-3 decorators shipped stable in TS 5.0 with a different runtime shape (no `reflect-metadata`, different context object) than `experimentalDecorators` + `emitDecoratorMetadata`, which NestJS/TypeORM/Angular-style DI libraries still assume. Mixing them in one `tsconfig.json` is a silent trap, not a compile error.
- **`moduleResolution` is not one setting for this fleet — it is five, one per shape.** `bundler` (Vite SPAs), `nodenext`/`node20` (published CLI+lib and the Bun Action), and Bun's own `bun` export-condition resolution order (`bun, node-addons, node, require, import, default`) genuinely disagree about how the same `package.json` `exports` map resolves.
- **Node's native TypeScript execution is stable now (v23.6+ default, hardened v25.2/v24.12), but it is not "run any TypeScript."** It strips *erasable* syntax only — enums, non-type namespaces, parameter properties, and `import =` all hard-error (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). `--erasableSyntaxOnly` (TS 5.8) is the compile-time way to catch this before runtime does.
- **`using`/`await using` (TS 5.2, stage-3 stable) collides conceptually with VS Code's own `vscode.Disposable` protocol** — the extension host shape has two disposal idioms in play, and `using` doesn't know about the old one.
- **`satisfies`, `as const`, and a plain type annotation are three different inference outcomes**, not three notations for the same thing; this is one of the most-cited real-world TS mistakes and doesn't map to anything in Rust/Python's type systems.
- **Structural typing plus TS's `never`-based exhaustiveness checking is the TS-specific mechanism for what the prior programs called "type architecture."** The interesting TS content is *how* exhaustiveness is enforced (discriminant + `never` in the default branch), not that discriminated unions are good.
- **Two platform features shipped Baseline mid-corpus and are genuinely safe to recommend now: Iterator helpers (Baseline since March 2025) and `Array.prototype.at()` (since 2022).** One platform feature is still a trap: **Temporal is not Baseline as of 2026-08-29** — MDN marks it "Limited availability," so any agent reaching for it in production code needs a polyfill call-out, not a bare recommendation.
- **`WeakRef`/`FinalizationRegistry` are typed and callable but MDN explicitly disclaims them for anything but non-essential cleanup** — GC timing is non-deterministic across engines and versions; the type system gives no signal that this is dangerous.
- **The Bun Action and the Node-run library/CLI are a compatibility fault line, not a shared platform.** `bun test` vs `node:test` vs Vitest (SPA) means this one fleet runs three test runners with different global injection, mocking, and snapshot semantics — CI parity across them is a real open question, not settled by "testing discipline" from the prior program.
- **Declaration-file authoring for the published ESM library is its own discipline**: `isolatedDeclarations` (TS 5.5) forces explicit return types on every export for parallel/tooling-friendly `.d.ts` emit, and `exports` map ordering in `package.json` requires the `"types"` condition to come *first* or TypeScript silently picks the wrong `.d.ts`.
- **`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are both off under plain `strict`**, and both matter more than `strict` alone for this fleet's Connect-RPC/protobuf-generated-types and Vite-SPA-props shapes, where "missing key" and "present but undefined" are semantically different.
- **The Node permission model reached Stable in this window (v23.5/v22.13)** but does not propagate into `worker_threads` and is bypassed by symlinks and pre-opened file descriptors — a real defensive-posture nuance for the CLI/GitHub-Action shapes that "security posture" generically wouldn't surface.
- **type-challenges' difficulty curve is itself a signal**: nearly all "hard"/"extreme" challenges are recursive conditional types or string-literal parsing, meaning the type-level operations practitioners consider load-bearing cluster hard around recursion depth, distribution control, and template-literal parsing — exactly where TS's own compiler-performance advice (Effective TS Item 78, tail-recursive generics) applies.
- **Runtime binding is not a footnote for this fleet — it changes correct guidance per shape**: `AbortSignal.any()`/`.timeout()` composition, `structuredClone`, `worker_threads` transfer semantics, and the Node permission model are all Node/browser-specific; the extension host runs inside Electron's Node *and* has DOM types available where they normally wouldn't be, which is its own footgun.

## Corpus walk

### TypeScript Handbook

Fetched: [Handbook table of contents](https://www.typescriptlang.org/docs/handbook/intro.html) (2026-08-29).

**Get Started**: TS for the New Programmer · TypeScript for JS Programmers · TS for Java/C# Programmers · TS for Functional Programmers · TypeScript Tooling in 5 minutes.

**Handbook core**: The Basics · Everyday Types · Narrowing · More on Functions · Object Types.

**Type Manipulation**: Creating Types from Types · Generics · Keyof Type Operator · Typeof Type Operator · Indexed Access Types · Conditional Types · Mapped Types · Template Literal Types.

**Additional Handbook**: Classes · Modules.

**Reference**: Utility Types · Cheat Sheets · Decorators · Declaration Merging · Enums · Iterators and Generators · JSX · Mixins · Namespaces · Namespaces and Modules · Symbols · Triple-Slash Directives · Type Compatibility · Type Inference · Variable Declaration.

**Modules Reference** (its own sub-book): Introduction · Theory · Guides — Choosing Compiler Options · Reference · [ESM/CJS Interoperability](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html) (appendix — directly relevant to the CLI+library shape's dual publishing question).

**Declaration Files**: Introduction · Declaration Reference · Library Structures · Modules `.d.ts` · Module: Plugin · Module: Class · Module: Function · Global `.d.ts` · Global: Modifying Module · Do's and Don'ts · Deep Dive · Publishing · Consumption. (13 pages — this is the largest single reference sub-tree and maps directly to "declaration merging hygiene" and "`.d.ts` authoring" as candidate topics.)

**JavaScript**: JS Projects Utilizing TypeScript · Type Checking JavaScript Files · JSDoc Reference · Creating `.d.ts` Files from `.js` files.

**Project Configuration**: What is a tsconfig.json · Compiler Options in MSBuild · TSConfig Reference · tsc CLI Options · Project References · Integrating with Build Tools · Configuring Watch · Nightly Builds.

**What's New**: individual release-notes pages for every version 1.1 through 6.0/5.9 at fetch time (7.0 notes now published separately on devblogs, see below).

### TypeScript release notes, 5.0 → 7.0

Fetched directly: [5.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) · [5.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) · [5.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html) · [5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html) · [5.6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html) · [5.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html) · [5.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) · [5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) · [6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) · 7.0 status via [InfoQ](https://www.infoq.com/news/2026/08/typescript-7-released/) and [VS Magazine RC coverage](https://visualstudiomagazine.com/articles/2026/06/22/typescript-7-0-rc-moves-microsofts-go-rewrite-into-the-mainline-compiler.aspx).

- **5.0** (era: needs Node ≥10, ES2018 target minimum) — stable decorators; `const` type parameters; multi-`extends` tsconfig; enums become union-of-literal enums; `--moduleResolution bundler`; `--verbatimModuleSyntax` (deprecates `importsNotUsedAsValues`/`preserveValueImports`); `export type *`; JSDoc `@satisfies`/`@overload`; relational-operator implicit-coercion now an error.
- **5.2** — `using`/`await using` explicit resource management (`Symbol.dispose`/`Symbol.asyncDispose`, `DisposableStack`); decorator metadata (`Symbol.metadata`); mixed labeled/unlabeled tuple elements; array-union methods (`(string|number)[]` behavior for `string[]|number[]`); type-only imports with `.ts` extensions.
- **5.4** — narrowing preserved in closures after last assignment; `NoInfer<T>`; `Object.groupBy`/`Map.groupBy` typings; `--module preserve` (enables `require()` under `bundler` resolution); checked import attributes.
- **5.5** — **inferred type predicates** (functions returning a boolean tied to parameter refinement get an implicit `x is T`, huge for `.filter(Boolean)`-style code); constant-indexed-access narrowing (`obj[key]`); JSDoc `@import`; regex syntax checking; new `Set` methods (`union`/`intersection`/etc.); `--isolatedDeclarations`; `${configDir}` tsconfig template variable.
- **5.6** — disallowed always-truthy/nullish checks (catches `if (/regex/)`); iterator helper *types* (`IteratorObject`); `--strictBuiltinIteratorReturn`; region-prioritized editor diagnostics; `--noUncheckedSideEffectImports`; `--noCheck`.
- **5.7** — never-initialized-variable checks across function boundaries; `--rewriteRelativeImportExtensions` (rewrites `.ts`→`.js` on emit, relative paths only); ES2024 lib/target (`Object.groupBy`, `Promise.withResolvers`); **breaking**: all `TypedArray`s now generic over `ArrayBufferLike`; validated JSON import attributes under `nodenext`; V8 compile-cache use on Node 22.
- **5.8** — granular per-branch checking of conditional expressions inside `return`; `require()` of ESM under `nodenext` (mirrors Node 22); `--module node18` (frozen reference point, no `require()` of ESM); **`--erasableSyntaxOnly`** (errors on enums/namespaces/parameter properties/`import =` — direct compile-time guard for Node's type-stripping mode); `--libReplacement`.
- **5.9** — `import defer` (deferred module evaluation, only runs on first export access); minimal/prescriptive `tsc --init` output (defaults to `nodenext`/`esnext`/`strict`/`verbatimModuleSyntax`); `--module node20`; expandable-hover preview; **breaking**: `ArrayBuffer` no longer a supertype of `TypedArray`/Node `Buffer` (fixed via `@types/node` update or `.buffer`).
- **6.0** (shipped 2026-03-23) — defaults flip: `strict: true`, `module: "esnext"`, `target: "es2025"`, `types: []`, `rootDir` now the tsconfig directory. Removed: `target es5`, `downlevelIteration`, `moduleResolution node`/`classic`, `module amd|umd|systemjs|none`, `outFile`, `import ... asserts`. New: reduced context-sensitivity in generic method inference, `Map.getOrInsert()`/`getOrInsertComputed()`, `RegExp.escape()`, Temporal *type* declarations (ahead of runtime Baseline — see MDN below), `--stableTypeOrdering` (explicitly built to diff 6.0 vs 7.0 output).
- **7.0** (RC 2026-06-18, **stable 2026-07-08**) — full Go-native compiler/language-service rewrite ("Project Corsa," replacing the self-hosted "Strada" codebase); reported 7.7–11.9× faster full builds; inherits every 6.0 breaking change as a hard error; **no stable programmatic `typescript` package API — expected TS 7.1 at the earliest**, meaning `ts-morph`, `typescript-eslint`, and any tool that imports `typescript` as a library is on notice.

### tsconfig reference

Fetched: [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/) (2026-08-29). Full option enumeration by category:

- **Type Checking** (20): `allowUnreachableCode`, `allowUnusedLabels`, `alwaysStrict`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noImplicitAny`, `noImplicitOverride`, `noImplicitReturns`, `noImplicitThis`, `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `strict`, `strictBindCallApply`, `strictBuiltinIteratorReturn`, `strictFunctionTypes`, `strictNullChecks`, `strictPropertyInitialization`, `useUnknownInCatchVariables`.
- **Modules** (19): `allowArbitraryExtensions`, `allowImportingTsExtensions`, `allowUmdGlobalAccess`, `baseUrl`, `customConditions`, `module`, `moduleResolution`, `moduleSuffixes`, `noResolve`, `noUncheckedSideEffectImports`, `paths`, `resolveJsonModule`, `resolvePackageJsonExports`, `resolvePackageJsonImports`, `rewriteRelativeImportExtensions`, `rootDir`, `rootDirs`, `typeRoots`, `types`.
- **Emit** (21), **JavaScript Support** (3), **Editor Support** (2), **Interop Constraints** (8: incl. `isolatedDeclarations`, `verbatimModuleSyntax`), **Backwards Compatibility** (9, mostly deprecated pre-6.0), **Language and Environment** (13: incl. `experimentalDecorators`/`emitDecoratorMetadata` vs plain decorators, `useDefineForClassFields`), **Compiler Diagnostics** (9), **Projects** (6: composite builds), **Output Formatting** (3), **Completeness** (2), **Watch Options** (6).

Note: this page enumerates *option names*, not the 6.0/7.0 default flips — those are only documented in the release notes (above) and must be cross-referenced.

### Effective TypeScript, 2nd edition

Fetched: [danvk/effective-typescript README](https://github.com/danvk/effective-typescript/blob/main/README.md) (2026-08-29) — full 83-item TOC across 10 chapters, updated for TS 5.

1. **Getting to Know TypeScript** (1–5): relationship to JS, which compiler options you're using, codegen independent of types, structural typing, limiting `any`.
2. **TypeScript's Type System** (6–17): editor-as-oracle, types-as-sets, type-space vs value-space, annotations over assertions, object wrapper types, excess-property checking, whole-function-expression typing, `type` vs `interface`, `readonly`, DRY via generics, index-signature alternatives, numeric index signatures.
3. **Type Inference and Control Flow Analysis** (18–28): inferable types, per-variable-per-type discipline, narrowing, alias consistency, context in inference, evolving types, functional constructs for type flow, `async` over callbacks for type flow, classes/currying as inference sites.
4. **Type Design** (29–42): valid-states-only types, liberal-in/strict-out, no doc-comment type duplication, pushing `null` to the perimeter, unions-of-interfaces over interfaces-with-unions, precise string alternatives, optional-property limits, unifying vs modeling differences, imprecise-over-inaccurate, domain-language naming, anecdotal-data types.
5. **Unsoundness and `any`** (43–49): narrowest-scope `any`, precise `any` variants, hiding unsafe assertions, `unknown` over `any`, type-safe monkey-patching, soundness traps, type-coverage tracking.
6. **Generics and Type-Level Programming** (50–58): generics-as-functions-between-types, avoiding unneeded type params, conditional types over overloads, union-distribution control, template literal DSLs, testing types, how types display, tail-recursive generics, codegen as an escape hatch.
7. **TypeScript Recipes** (59–64): `never` exhaustiveness, iterating objects, `Record` for sync, rest/tuple for variadics, optional-`never` for XOR, branding for nominal typing.
8. **Type Declarations and `@types`** (65–71): devDependencies placement, three-versions problem, exporting public-API types, TSDoc, `this` typing in callbacks, mirroring types to sever deps, module augmentation.
9. **Writing and Running Your Code** (72–78): ECMAScript over TS-only features, source maps, runtime type reconstruction, DOM hierarchy, modeling the real environment, type-checking vs unit testing, compiler performance.
10. **Modernization and Migration** (79–83): modern JS, `@ts-check`+JSDoc, `allowJs`, module-by-module conversion, `noImplicitAny` as the finish line.

### type-challenges

Fetched: [type-challenges README](https://raw.githubusercontent.com/type-challenges/type-challenges/main/README.md) (2026-08-29). 1 warm-up, 13 easy, 104 medium, 55 hard, 17 extreme — 190 challenges total, numbered by submission order not difficulty. The shape of the curve is the signal: easy tier is single-utility-type reimplementation (`Pick`, `Readonly`, `Awaited`, `Exclude`, `Parameters`); medium is compound object/array/string manipulation (`Omit`, `DeepReadonly`, `Trim`, `Flatten`, currying); hard/extreme cluster almost entirely on **recursive conditional types, template-literal parsing, and arithmetic-in-the-type-system** (JSON parsers, query-string parsers, Sudoku, integer comparators) — i.e., exactly the territory where Effective TypeScript's "tail-recursive generics" and "compiler performance" items (57, 78) apply, and where TS's recursion-depth limits become a real production concern (large generated Connect-RPC types, deeply nested Zod-style schemas).

### Node.js official docs

Fetched: [ESM](https://nodejs.org/api/esm.html) · [TypeScript support](https://nodejs.org/api/typescript.html) · [Test runner](https://nodejs.org/api/test.html) · [Streams](https://nodejs.org/api/stream.html) · [worker_threads](https://nodejs.org/api/worker_threads.html) · [Permission model](https://nodejs.org/api/permissions.html) · [Security best practices](https://nodejs.org/en/learn/getting-started/security-best-practices) · [fs/promises](https://nodejs.org/api/fs.html#promises-api) (all fetched 2026-08-29).

- **ESM**: import-specifier types (relative/bare/absolute), `node:`/`data:` URL schemes, import attributes (`with { type: "json" }`, stable v23.1+), CJS↔ESM interop table (no `require`, `__dirname`, `NODE_PATH` in ESM; use `import.meta.filename`/`.dirname`/`.resolve()`/`.main`), `package.json` `"type"`/`"exports"`/`"imports"` fields, the ESM_RESOLVE algorithm, module customization hooks.
- **TypeScript support**: type stripping is **stable** (v25.2.0/v24.12.0; default-on since v23.6.0; the old `--experimental-transform-types` flag was *removed* in v26.0.0). Erasable-only — enums, runtime namespaces, parameter properties, import aliases, and decorators all hard-error. `.ts`→type follows `package.json` `"type"`; `.mts` always ESM, `.cts` always CJS; `.tsx` unsupported; no `tsconfig.json` support (no `paths`, no downleveling); `type` keyword required on type-only imports or stripping fails at runtime.
- **Test runner (`node:test`)**: subtests, rich `TestContext` (skip/todo/plan/waitFor/snapshot), built-in `mock` (functions, object methods, timers, `Date`), snapshot testing (`--test-update-snapshots`), reporters (spec/tap/dot/junit/lcov, multiple simultaneously), coverage via `--experimental-test-coverage` with per-line/branch/function thresholds and inline disable comments, watch mode, TypeScript files matched by default glob patterns unless `--no-strip-types`, tags (v26.2+) for filterable test selection.
- **Streams**: Readable/Writable/Duplex/Transform, `stream/promises` (`pipeline`, `finished`), `stream.compose()`, backpressure via `highWaterMark`/`drain`, async iteration (`for await`), Web Streams interop (`fromWeb`/`toWeb`), `addAbortSignal()`.
- **worker_threads**: vs `child_process` (isolated memory, higher overhead) vs `cluster` (network load-balancing); `MessageChannel`/`MessagePort`; structured-clone-cloneable vs transferable-object lists; `SharedArrayBuffer` for true shared memory; `markAsUntransferable`/`markAsUncloneable`; resource limits; `BroadcastChannel`; experimental `locks` API.
- **Permission model**: **Stable** as of v23.5.0/v22.13.0. Enforce mode (`--permission`, denies by default) vs audit mode (`--permission-audit`, logs only). Restricts fs read/write, net, child_process, worker, addons, WASI, FFI, inspector, OpenSSL store — each independently flagged. Runtime `process.permission.has()`/`.drop()` (irreversible). **Does not propagate to worker threads; symlinks and pre-existing file descriptors bypass it; not a sandbox against malicious code.**
- **Security best practices**: DoS via HTTP server config, DNS rebinding via inspector, sensitive-info exposure via package publication (`.npmignore`/`files`), HTTP request smuggling (`insecureHTTPParser`), timing attacks (`timingSafeEqual`, `scrypt`), supply-chain/malicious-module mitigations (`--ignore-scripts`, lockfiles, `npm ci`, `--min-release-age`), memory (`--secure-heap`), monkey-patching (`--frozen-intrinsics`, `Object.freeze(globalThis)`), **prototype pollution** (`Object.create(null)`, `Object.hasOwn()`, `--disable-proto`), uncontrolled search path (module resolution hardening), permission model, avoiding experimental features in production.
- **fs/promises**: `FileHandle` class, `readFile`/`writeFile`/`readLines`/`readableWebStream`, error codes (`ENOENT`/`EACCES`/`EISDIR`/`EEXIST`/`ENOTDIR`), `bigint` option on `stat()`, `AbortSignal` support on many methods, GC-based auto-close is unreliable — must explicitly close (a direct `using`/explicit-resource-management use case).

### MDN

Fetched: [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) · [WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) · [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) · [Array.prototype.at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at) · [Iterators and generators guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators) · Iterator-helpers Baseline status via [web.dev](https://web.dev/blog/baseline-iterator-helpers) (all checked 2026-08-29; structured-clone page returned 404 at the attempted URL — not independently re-verified, treat structured-clone coverage below as secondary).

- **AbortSignal**: `.abort()` (Baseline since 2018), `.timeout(ms)` and `.any([signals])` (composable cancellation — combine a caller's signal with a library-imposed timeout in one call).
- **WeakRef/FinalizationRegistry**: MDN explicitly warns cleanup timing is non-deterministic across engines/versions and "may happen much later than expected, or not at all" — sanctioned only for non-essential optimizations, never correctness-bearing cleanup.
- **Temporal**: still marked **"Limited availability"** on MDN as of 2026-08-29 — not Baseline, needs `@js-temporal/polyfill` or `temporal-polyfill` for production. TS 6.0 shipped *type* declarations for it ahead of runtime availability, which is exactly the kind of mismatch that misleads an agent skimming type definitions as a proxy for "this is safe to use."
- **Array.prototype.at()**: Baseline/widely available since March 2022 — safe to recommend unconditionally.
- **Iterator helpers** (`.map`/`.filter`/`.take`/`.drop`/`.reduce` on `Iterator.prototype`): Baseline "Newly available" since March 2025 (Chrome/Edge 122, Firefox 131, Safari 18.4) — safe to recommend as of this fleet's TS ^5.7+/current-runtime floor; lazy evaluation is the differentiator over `Array.from(iter).filter(...)`.

### Bun docs

Fetched: [bun test](https://bun.com/docs/cli/test) · [Bun.spawn](https://bun.com/docs/api/spawn) · [Module resolution](https://bun.com/docs/runtime/modules) (2026-08-29).

- **bun test**: Jest-compatible surface (lifecycle hooks, snapshots, mocking, watch mode) but built into the runtime; distinctive flags for CI at scale (`--no-isolate`, `--shard`, `--update-timings`); AI-agent-aware quiet output via `CLAUDECODE=1`/`AGENT=1` env vars — directly relevant since this fleet's own agents will run these tests.
- **Bun.spawn/spawnSync**: async/sync split (vs Node's `spawn`/`exec`/`fork`), unified stdio options object (accepts Response/ReadableStream/Blob directly), two IPC serialization modes (`"advanced"` JSC-only vs `"json"` for Bun↔Node interop), PTY support, cgroup integration on Linux, `AbortSignal` support.
- **Module resolution**: adds a `"bun"` export condition checked before `node`/`require`/`import`/`default`; resolves `.ts`/`.tsx` directly (checks TS extensions before `.js` when importing from `*.js`/`*.mjs`); permits `require()` of both CJS and ESM (ESM `require()` returns the namespace object) with the one restriction that top-level-`await` modules can't be `require()`d synchronously.

### Deno docs

Fetched: [Deno's Node.js compatibility](https://docs.deno.com/runtime/fundamentals/node/) (2026-08-29). Not a runtime target for this fleet, but its divergences sharpen what's genuinely Node-specific vs platform-standard: default-deny permissions (explicit `--allow-read`/`--allow-env` flags) vs Node's default-allow; `npm:` specifiers resolved from a global cache instead of `node_modules` by default; native TypeScript execution with **no config file** at all (contrast with Node's stripping, which still respects `package.json` `"type"`); its own export-condition order (`deno, node, import, module-sync, default`) — a third distinct resolution order alongside Node's and Bun's, underscoring that "module resolution conditions" genuinely differs per runtime rather than being one universal algorithm.

## Candidate topics

| topic | why it matters | source | already-covered? | priority | runtime |
|---|---|---|---|---|---|
| TS 6.0/7.0 default flips (strict/ESM/es2025/types:[]) vs the fleet's stated ^5.7 floor | Rules written against 5.7 defaults silently misdescribe the compiler most installs now run | TS 6.0/7.0 release notes | no | high | all |
| TS 7.0's missing stable programmatic API until 7.1 | `ts-morph`/`typescript-eslint`/codegen tools may lag the Go rewrite; version-pinning is load-bearing, not optional | TS 7.0 announcement | no | high | Node, extension host, monorepo tooling |
| Stage-3 decorators vs `experimentalDecorators`+`emitDecoratorMetadata` | Two incompatible runtime shapes under one keyword; DI libraries (NestJS/TypeORM) still assume the legacy one | Handbook Decorators; TS 5.0/5.2 notes | no | high | all |
| `moduleResolution` choice per fleet shape (`bundler` vs `nodenext`/`node20` vs Bun's own condition order) | Same `package.json` exports resolves differently per shape; this is 5 answers, not 1 | tsconfig reference; Bun modules docs; TS 5.8/5.9 notes | no | high | all (per-shape) |
| Node type stripping is erasable-syntax-only | Enums/namespaces/parameter-properties/decorators hard-fail at runtime; `--erasableSyntaxOnly` catches it at compile time | nodejs.org/api/typescript.html; TS 5.8 notes | no | high | Node |
| `using`/`await using` vs `vscode.Disposable` | Extension host now has two disposal idioms that don't know about each other | TS 5.2 notes; VS Code API (implied by fleet shape) | no | high | extension host, Node |
| `satisfies` vs `as const` vs plain annotation | Three distinct inference outcomes routinely conflated; no analogue in Rust/Python type systems | TS 5.0 notes; Effective TS | no | high | all |
| `never`-based exhaustiveness checking mechanism | TS-specific *mechanism* for discriminated-union safety, not just "use discriminated unions" | Effective TS Item 59; Handbook Narrowing | no | high | all |
| `isolatedDeclarations` + `.d.ts` authoring for the published library | Forces explicit return types on exports; enables parallel/tool-friendly declaration emit | TS 5.5 notes; Handbook Declaration Files | no | high | Node/library |
| `exports` map `"types"` condition ordering | Must be listed first or TS silently resolves the wrong `.d.ts` | Handbook Modules Reference; tsconfig reference | no | high | Node/library |
| `noUncheckedIndexedAccess` (off under plain `strict`) | Array/object index-access null-safety; matters for RPC-generated and dynamic-key code | tsconfig reference | no | high | all |
| `exactOptionalPropertyTypes` (off under plain `strict`) | "Missing key" vs "present but undefined" — protobuf/proto3-optional and React-props semantics diverge here | tsconfig reference | no | high | browser SPA, RPC |
| `verbatimModuleSyntax` under esbuild/Vite bundling | esbuild transpiles per-file with no type info; without this flag it can mis-erase or mis-keep type-only imports | TS 5.0 notes; Bun/Vite context | no | high | extension host, browser SPA |
| `AbortSignal.any()`/`.timeout()` composition and typing | New composable-cancellation platform API; typing `signal.reason` and optional-vs-required signal params is TS-specific | MDN AbortSignal | no | med | Node, browser |
| Temporal type declarations vs runtime Baseline status | TS 6.0 shipped *types* ahead of runtime support; MDN still marks it Limited availability as of 2026-08-29 | TS 6.0 notes; MDN Temporal | no | high | all |
| Iterator helpers vs collecting into an intermediate array | Now safe to recommend (Baseline since March 2025); lazy `.map/.filter/.take` avoids allocation on large collections | MDN/web.dev; TS 5.6 notes | no | med | Node ≥22, Bun, browser |
| WeakRef/FinalizationRegistry non-determinism | Typed and callable with no compiler warning that GC timing is unreliable; MDN explicitly disclaims correctness use | MDN WeakRef | no | med | Node, browser |
| Worker `postMessage` payload typing across the boundary | No compile-time check that what's sent matches what's received; needs a typed wrapper | nodejs.org/api/worker_threads.html | no | med | Node, extension host |
| `SharedArrayBuffer` vs transferable `ArrayBuffer` semantics | Shared (both threads see same memory) vs transferred (original becomes unusable) — easy to get backwards | nodejs.org/api/worker_threads.html | no | med | Node |
| Node permission model stable but not a sandbox | Doesn't propagate to worker_threads; symlinks/pre-opened fds bypass it — real gaps for CLI/Action shapes | nodejs.org/api/permissions.html | no | med | Node CLI, GitHub Action |
| Prototype pollution mitigation in TS-typed code | `Record<string,T>` doesn't reflect a null-prototype object; `Object.hasOwn()`/`Object.create(null)` typing implications | nodejs.org security best practices | no | high | all |
| `bun test` vs `node:test` vs Vitest parity across one fleet | Three test runners, three global-injection/mocking/snapshot models, in one codebase | Bun test docs; nodejs.org/api/test.html | no | high | Bun, Node, browser SPA |
| Declaration-emit ordering determinism (`--stableTypeOrdering`) | 6.0 added this specifically to diff 6.0-vs-7.0 emitted-union ordering; on-disk `.d.ts` stability matters for diffing published packages | TS 6.0 notes | no | med | Node/library |
| Recursive conditional types and compiler-performance cliffs | type-challenges' hard/extreme tier is almost entirely recursion/parsing; large generated types (Connect-RPC, Zod) hit real depth limits | type-challenges README; Effective TS Items 57/78 | no | med | all |
| Template literal types for DSL/string validation | TS-specific type-level string parsing, directly load-bearing for route/URL/query typing | Handbook Template Literal Types; type-challenges | no | med | all |
| Conditional type distribution control (naked vs wrapped type param) | Subtle, frequently-misused mechanism with no equivalent in the prior programs' languages | Handbook Conditional Types; Effective TS Item 53 | no | med | all/library authors |
| `const` type parameters vs manual `as const` | Removes a common ceremony pattern in generic library APIs | TS 5.0 notes | no | med | library authors |
| Declaration merging hygiene in a monorepo | Global augmentation from one package can silently affect sibling packages/tsconfig roots | Handbook Declaration Merging | no | med | Biome monorepo |
| Ambient `global.d.ts` scope leakage across multiple tsconfig roots | Easy to accidentally pollute global scope across monorepo package boundaries | Handbook Modules Theory | no | med | Biome monorepo |
| `structuredClone` vs `JSON.stringify`/`parse` for deep copy | Different survivor sets (functions/undefined/class instances); typing the generic return value | MDN (secondary — 404 on direct fetch) | no | med | all |
| React `jsx: react-jsx` vs Vue's JSX/SFC typing (`vue-tsc`) | Two entirely different type-checking pipelines under one fleet shape (Vite SPAs, React+Vue) | Handbook JSX; tsconfig reference | no | high | browser SPA |
| `vue-tsc` as a separate checker from `tsc` | Generic-component typing (`defineProps`/`defineEmits`) has its own quirks distinct from plain TS generics | (implied by fleet shape; not independently fetched this pass) | no | med | browser SPA (Vue) |
| Connect-RPC/protobuf-generated `.ts` as an extensibility seam | Generated code is a versioning/on-disk-format boundary; regenerate-vs-hand-edit discipline | (fleet-shape-specific; cross-ref Handbook Declaration Files) | no | high | browser SPA / RPC |
| Buffer/string encoding typing (`BufferEncoding` union) | The union type doesn't necessarily track every runtime-supported encoding; silent widening in wrapper functions | nodejs.org/api/fs.html (implied) | no | low | Node |
| `path` module posix/win32 divergence under the extension host | Electron/VS Code extension host commonly runs on Windows; path-vs-URL specifier confusion in ESM compounds this | nodejs.org/api/esm.html | no | med | extension host |
| Object/mapped-type key ordering vs runtime enumeration order | Integer-like keys get reordered by the runtime; mapped-type key order isn't guaranteed to match `for...in`/`Object.keys()` | Handbook Mapped Types | no | low | all |
| Import-attribute (`with { type: "json" }`) enforcement under `nodenext` | TS 5.7 made this required, not advisory — silent breakage migrating from earlier resolution modes | TS 5.7 notes; nodejs.org/api/esm.html | no | med | Node |
| `--module preserve`/`node18`/`node20` — pinning a resolution mode to Node's actual generation, not just "nodenext" | `nodenext` is explicitly a moving target; a Bun Action or extension host wants a frozen reference point instead | TS 5.4/5.8/5.9 notes | no | med | Node, Bun Action |
| Namespaces: type-only vs runtime, and 6.0's stricter `module` keyword | Legacy `module Foo {}` syntax for namespaces now errors in 6.0; type-only namespaces remain fine | TS 6.0 notes; Handbook Namespaces | no | low | library maintaining legacy code |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html) | TS Handbook full nav/TOC | current, TS 7.0 era | Primary curriculum map; every page title is a candidate topic |
| [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/) | tsconfig compiler-option reference | current | Full option enumeration by category; cross-ref against 6.0/7.0 default changes |
| [danvk/effective-typescript README](https://github.com/danvk/effective-typescript/blob/main/README.md) | Effective TypeScript 2nd ed. full 83-item TOC | 2nd ed., updated for TS 5 | Practitioner-vetted "what actually bites" list, chapter-organized |
| [type-challenges README](https://raw.githubusercontent.com/type-challenges/type-challenges/main/README.md) | 190-challenge type-level-programming corpus | ongoing/current | Difficulty curve shows where type-level operations concentrate |
| [TS 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) | official release notes | 2023 era (still current features) | Decorators, verbatimModuleSyntax, bundler resolution — floor-defining |
| [TS 5.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) / [5.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html) / [5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html) / [5.6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html) / [5.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html) / [5.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) / [5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) | official release notes, 2023–2026 | version-dated | `using`, isolatedDeclarations, inferred predicates, erasableSyntaxOnly — each is version-gated |
| [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) | official announcement | shipped 2026-03-23 | Default-flip release; the fleet's stated ^5.7 floor is now two majors behind current |
| [TypeScript 7.0 RC / stable coverage (VS Magazine, InfoQ)](https://www.infoq.com/news/2026/08/typescript-7-released/) | third-party but corroborated release coverage | RC 2026-06-18, stable 2026-07-08 | Go-native rewrite; no stable programmatic API until 7.1 — directly affects tooling in this fleet |
| [Node.js ESM docs](https://nodejs.org/api/esm.html) | official Node docs | current (Node ≥20/22 era) | CJS/ESM interop, package.json fields, resolution algorithm |
| [Node.js TypeScript support](https://nodejs.org/api/typescript.html) | official Node docs | stable as of v25.2/v24.12 | Type stripping is the Node-shape's primary TS execution model |
| [Node.js test runner](https://nodejs.org/api/test.html) | official Node docs | current | Direct competitor/complement to `bun test` and Vitest in this fleet |
| [Node.js streams](https://nodejs.org/api/stream.html) | official Node docs | current | Web Streams interop and async iteration are TS-typing-relevant |
| [Node.js worker_threads](https://nodejs.org/api/worker_threads.html) | official Node docs | current | Structured-clone/transfer typing gap across the postMessage boundary |
| [Node.js permission model](https://nodejs.org/api/permissions.html) | official Node docs | stable v23.5/v22.13 | Newly stable; real gaps (no worker propagation) matter for CLI/Action shapes |
| [Node.js security best practices](https://nodejs.org/en/learn/getting-started/security-best-practices) | official Node docs | current | Prototype pollution and supply-chain guidance, TS-typing angle is the gap |
| [Node.js fs/promises](https://nodejs.org/api/fs.html#promises-api) | official Node docs | current | FileHandle lifecycle is a direct `using`/explicit-resource-management case |
| [MDN AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) | MDN reference | current, `.any()`/`.timeout()` broadly supported | Composable cancellation, typing implications |
| [MDN WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) | MDN reference | current | Explicit non-determinism warning the type system doesn't surface |
| [MDN Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) | MDN reference | **Limited availability as of 2026-08-29** | Directly contradicts TS 6.0 shipping its types — a genuine trap |
| [MDN Array.prototype.at()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at) | MDN reference | Baseline since 2022 | Confirmed safe to recommend unconditionally |
| [Iterator helpers Baseline (web.dev)](https://web.dev/blog/baseline-iterator-helpers) | Baseline status blog | Baseline since March 2025 | Confirms iterator-helpers-vs-array-collection is now safe fleet-wide guidance |
| [Bun test docs](https://bun.com/docs/cli/test) | official Bun docs | current | The GitHub Action shape's test runner, distinct from Node's and Vitest's |
| [Bun.spawn docs](https://bun.com/docs/api/spawn) | official Bun docs | current | Divergence from Node's child_process API surface |
| [Bun module resolution docs](https://bun.com/docs/runtime/modules) | official Bun docs | current | Third distinct export-condition order in this fleet |
| [Deno Node compatibility docs](https://docs.deno.com/runtime/fundamentals/node/) | official Deno docs | current | Not a fleet target, but sharpens what's genuinely Node-specific by contrast |

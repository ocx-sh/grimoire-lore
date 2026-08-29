---
title: Explicit Resource Management in TypeScript
topic: "`using` / `await using`, Symbol.dispose, Symbol.asyncDispose, DisposableStack/AsyncDisposableStack, and the vscode.Disposable collision"
agent: research-lang (ts-resources)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 26
scope: |
  Covers TC39 explicit resource management mechanics and current stage; TypeScript's
  lib/target requirements and downlevel emission (verified empirically against tsc 6.0.3
  and esbuild 0.28.1); native support across Node/Bun/browsers; esbuild, Vite/Rolldown/Oxc
  lowering behavior; and the vscode.Disposable-vs-Symbol.dispose collision, grounded against
  all nine fleet repos. Does not cover the unrelated `using` proposal history pre-TC39-stage-3,
  general try/finally style, or non-JS resource-management idioms.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Where the proposal stands](#1-where-the-proposal-stands)
   2. [Core semantics](#2-core-semantics)
   3. [TypeScript: lib/target requirements and downlevel emission (verified empirically)](#3-typescript-libtarget-requirements-and-downlevel-emission-verified-empirically)
   4. [Native runtime support matrix](#4-native-runtime-support-matrix)
   5. [Bundler/transpiler lowering: esbuild, Vite/Rolldown/Oxc, Bun](#5-bundlertranspiler-lowering-esbuild-viterolldownoxc-bun)
   6. [The polyfill is mandatory — and ordering is load-bearing](#6-the-polyfill-is-mandatory--and-ordering-is-load-bearing)
   7. [The vscode.Disposable collision](#7-the-vscodedisposable-collision)
   8. [Fleet inventory: real candidates and their lifetime shapes](#8-fleet-inventory-real-candidates-and-their-lifetime-shapes)
   9. [DisposableStack / AsyncDisposableStack](#9-disposablestack--asyncdisposablestack)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Explicit Resource Management reached **TC39 Stage 4 (finished)** at the May 2026 meeting; publication in the ECMAScript spec is expected in 2027 — it is no longer merely "Stage 3," which is what most existing guidance (including TypeScript's own 5.2 docs) still describes it as.
- TypeScript has supported `using`/`await using` since **5.2** (Aug 2023); using it requires `"lib": [..., "ESNext.Disposable"]` (or the coarser `"ESNext"`) — omitting it fails with **TS2318** (`Cannot find global type 'Disposable'`) and **TS2550**, verified locally against typescript 6.0.3.
- **Native, unpolyfilled runtime support exists only on: Node.js ≥24.0.0 (V8 13.6), Chrome/Edge ≥134, Firefox ≥141, and Bun ≥1.0.23 (via Bun's own transpiler, not JSC's parser).** Safari has never shipped it, as of 2026-08-29. Every fleet repo except setup-ocx (Bun) sits below the native line today.
- **tsc downlevel-emits `using` for any target below `esnext`**, injecting `__addDisposableResource`/`__disposeResources` helpers; at `target: "esnext"` it emits the raw syntax completely unlowered — verified by compiling both ways locally.
- **esbuild lowers `using`/`await using` for any target other than `esnext`** (added in v0.18.7, July 2023 — ahead of TS 5.2's actual release); it explicitly does **not** polyfill `Symbol.dispose` itself, by esbuild's own stated design.
- Verified locally: **without a `Symbol.dispose` polyfill, both tsc- and esbuild-emitted `using` code throw a `TypeError` at the first execution of the `using` statement** — tsc's message is `"Symbol.dispose is not defined."`, esbuild's is `"Object not disposable"`. This fails loud, not silently — but it fails at *runtime*, invisibly to `tsc --noEmit`, so an untested code path ships broken.
- Vite is now **v8.2.2** with **Rolldown as the default bundler** (no longer the opt-in "rolldown-vite" package); its production build targets "Baseline Widely Available as of a fixed date per major release" (2026-01-01 for v8, ≈ mid-2023 browsers) — predating native `using` support, so lowering is mandatory in production builds.
- **Open, current defect: [oxc-project/oxc#25155](https://github.com/oxc-project/oxc/issues/25155)** (filed 2026-07-31, unresolved as of 2026-08-29) — Oxc, which replaced esbuild as Vite/Rolldown's syntax-lowering engine, treats any target engine *absent* from a feature's compat table as *supporting* that feature. Safari, iOS Safari, Samsung Internet, and Deno are absent from the `using`-lowering table, so `using` ships to them **completely unlowered** — a guaranteed `SyntaxError` in Safari, since Safari has never implemented the syntax. Directly relevant to fma and creeptd-ng/web if/when they move onto Vite 8/Rolldown/Oxc.
- `vscode.Disposable` is purely `{ dispose(): any }` — grepping the current `vscode.d.ts` source turns up **zero** occurrences of `Symbol.dispose`/`Symbol.asyncDispose`. `Disposable.from(...)` aggregates `dispose()`-shaped objects but does not await async dispose functions. There is no built-in bridge to the TC39 protocol.
- `fs/promises` `FileHandle` **does** implement `Symbol.asyncDispose` natively, and Node's own docs call GC-based auto-close "unreliable" — this is the fleet's cleanest, lowest-risk adoption target.
- The fleet currently has **zero** `using`/`Symbol.dispose`/`DisposableStack` usage anywhere (grep-confirmed) — this is a green-field decision, not a migration.
- `kate-middlechild`'s tsconfig sets `"target": "ESNext"` with no confirmed bundler-side lowering step — under the rule above, any `using` there ships as raw, unlowered syntax. Out of scope until that changes.
- Decision: **adopt, narrow scope** — "never hand-roll try/finally where the resource already implements (or can be trivially adapted to) a disposal protocol," not a blanket "prefer `using`." Requires a fleet-wide polyfill, excludes `kate-middlechild` for now, and keeps `vscode.Disposable`/`context.subscriptions` as a separate, bridged idiom rather than merging the two protocols.

## Findings

### 1. Where the proposal stands

Explicit Resource Management reached Stage 4 ("finished") at the **May 2026** TC39 plenary; the `tc39/proposals` finished-proposals list now carries it with publication expected in **2027**, and it no longer appears among Stage 0–3 proposals in the `tc39/proposals` README — confirmed by diffing both files directly ([finished-proposals.md](https://github.com/tc39/proposals/blob/main/finished-proposals.md), [README.md](https://github.com/tc39/proposals/blob/main/README.md)). The proposal repo itself ([tc39/proposal-explicit-resource-management](https://github.com/tc39/proposal-explicit-resource-management)) still headlines "Stage 3" text dated March 2023 — that page has not been updated to reflect the stage advance, which is worth flagging since it is the most commonly linked reference. Treat "Stage 3" language in any older blog post, esbuild changelog entry, or TypeScript doc as **historical** — accurate when written, superseded by the May 2026 advance.

### 2. Core semantics

`using` declares a fixed (`const`-like), block-scoped binding that invokes `value[Symbol.dispose]()` when control leaves the enclosing block — including on early `return` and on thrown exceptions, not just normal fall-through:

```ts
function doSomeWork() {
  using file = new TempFile(".some_temp_file");
  if (someCondition()) {
    return; // disposed here, before the return completes
  }
  // or disposed here, at end of scope
}
```

`await using` is the async counterpart: it calls `value[Symbol.asyncDispose]()` and awaits the result (falling back to `Symbol.dispose` if `Symbol.asyncDispose` is absent). It is legal in async function bodies and at module top level, but — unlike `using` — not in a plain `for...of`, only `for await...of`. ([TypeScript 5.2 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html); [MDN: using](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using))

Multiple resources dispose in **LIFO order** — last declared, first disposed:

```ts
function func() {
  using a = loggy("a");
  using b = loggy("b");
  { using c = loggy("c"); using d = loggy("d"); }
  using e = loggy("e");
} // disposal order: e, d, c, b, a
```

`null`/`undefined` bound to a `using`/`await using` variable is silently skipped (no call attempted) — this is what makes optional-resource patterns like `using lock = shouldLock ? acquireLock() : undefined;` safe.

If both the block body and a dispose call throw, the errors are **not** dropped — the first is wrapped in a new global `SuppressedError`:

```ts
try {
  using a = { [Symbol.dispose]() { throw new ErrorA("from disposal"); } };
  throw new ErrorB("from code");
} catch (e: any) {
  e.name;        // "SuppressedError"
  e.error.name;  // "ErrorA" — the disposal error
  e.suppressed.name; // "ErrorB" — the original, suppressed error
}
```

`DisposableStack`/`AsyncDisposableStack` exist for the aggregate/ad-hoc case where you don't want to define a class:

```ts
using cleanup = new DisposableStack();
const file = fs.openSync(path, "w+");
cleanup.defer(() => fs.closeSync(file));   // run on scope exit, LIFO
const other = cleanup.use(acquireOther()); // track an existing Disposable
```

Both provide `use()`, `adopt(value, onDispose)`, `defer(onDispose)`, `move()` (transfer ownership to a new stack), and `dispose()`/`disposeAsync()`. ([TypeScript 5.2 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html); [TC39 proposal repo](https://github.com/tc39/proposal-explicit-resource-management); [v8.dev feature page](https://v8.dev/features/explicit-resource-management))

### 3. TypeScript: lib/target requirements and downlevel emission (verified empirically)

TypeScript 5.2+ requires the `Disposable`/`AsyncDisposable` global types and the `Symbol.dispose`/`Symbol.asyncDispose` members on `SymbolConstructor`, which live in a separate lib file, `lib.esnext.disposable.d.ts`. Confirmed present via direct package inspection: `typescript@5.9.3` and `typescript@6.0.3` both ship `/lib/lib.esnext.disposable.d.ts` (checked via `unpkg.com/typescript@<version>/?meta`). **`typescript@7.0.2` ships no `lib/lib.*.d.ts` files of any kind** — the Go rewrite's npm package is a native binary (`bin/tsc`) plus compiled `dist/`, with nothing resembling the classic lib-file layout; where its type-checking library data now lives could not be established as of 2026-08-29. This is consistent with — but a stronger claim than — the established fact that TS 7.0 lacks a stable programmatic API until 7.1.

Reproduced locally against `typescript@6.0.3`:

```
# tsconfig with lib: ["ES2022"] only (no ESNext.Disposable), target ES2022
sample2.ts(1,21): error TS2550: Property 'dispose' does not exist on type 'SymbolConstructor'.
  Do you need to change your target library? Try changing the 'lib' compiler option to 'esnext' or later.
error TS2318: Cannot find global type 'Disposable'.
```

Adding `"ESNext.Disposable"` to `lib` (target left at `ES2022`) compiles cleanly and downlevel-emits:

```ts
// source
class TempFile implements Disposable {
  constructor(private path: string) {}
  [Symbol.dispose]() { console.log("cleanup", this.path); }
}
function doWork() {
  using file = new TempFile("a.txt");
}
```

```js
// tsc 6.0.3 output, target: "ES2022" (helpers shown in full — this is the real emitted code)
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        var dispose;
        if (async) { if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined."); dispose = value[Symbol.asyncDispose]; }
        if (dispose === void 0) { if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined."); dispose = value[Symbol.dispose]; }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        env.stack.push({ value, dispose, async });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) { /* … LIFO walk, wraps in SuppressedError … */ })(
    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) { /* polyfill */ }
);
function doWork() {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        const file = __addDisposableResource(env_1, new TempFile("a.txt"), false);
    }
    catch (e_1) { env_1.error = e_1; env_1.hasError = true; }
    finally { __disposeResources(env_1); }
}
```

Compiling the **same source** with `"target": "ESNext"` and `"lib": ["ESNext"]` emits the `using` statement **completely unlowered, verbatim**:

```js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
using x = { [Symbol.dispose]() { } };
```

**This is the load-bearing fact for the adopt/defer decision**: `target: "esnext"` does not mean "modern, safe" — it means "no lowering at all," so the emitted file contains syntax that a pre-native engine cannot even *parse* (a `SyntaxError` at load, not a missing-API error). `kate-middlechild` sets `"target": "ESNext"` fleet-wide with no confirmed bundler transform in front of it.

Neither `tsc --noEmit` (type-checking) nor the presence of `ESNext.Disposable` in `lib` verifies that a `Symbol.dispose` polyfill exists at *runtime* — that's a value-level concern the type checker cannot see. Both throw errors above are **runtime** errors, invisible to a type-check-only CI gate. See §6.

### 4. Native runtime support matrix

All version numbers below cross-checked against two independent sources: the raw [`@mdn/browser-compat-data` JSON for `DisposableStack`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/javascript/builtins/DisposableStack.json) and the compat table quoted inside [oxc-project/oxc#25155](https://github.com/oxc-project/oxc/issues/25155) (itself cross-checked against `@mdn/browser-compat-data@8.0.8`). Both agree exactly.

| Engine/runtime | First native version | Source |
|---|---|---|
| V8 / Chrome / Edge | 134 (V8 13.8) | [v8.dev](https://v8.dev/features/explicit-resource-management), MDN BCD |
| Firefox | 141 | MDN BCD, oxc#25155 |
| Node.js | **24.0.0** (V8 13.6, shipped as a `SEMVER-MAJOR` change, [nodejs/node#58154](https://github.com/nodejs/node/pull/58154)) | [nodejs.org v24.0.0 blog](https://nodejs.org/en/blog/release/v24.0.0) |
| Bun | 1.0.23 (Jan 16, 2024) for `using`/`Symbol.dispose`; 1.3.0 for `DisposableStack` | [Bun blog](https://bun.com/blog/bun-v1.0.23), MDN BCD |
| Deno | 2.2.10 | MDN BCD |
| Safari / iOS Safari | **never**, as of 2026-08-29 ("preview" channel only) | MDN BCD, oxc#25155 |
| Samsung Internet | 29.0 | MDN BCD |

Node.js 22.0.0 ships **V8 12.4.254.14** ([nodejs.org v22.0.0 blog](https://nodejs.org/en/blog/release/v22.0.0)) — well below the V8 13.6 threshold; the entire Node 22 LTS line lacks native support. Node 20 is already EOL (established fact). **Only `setup-ocx`'s `engines.node: ">=24"` clears the native floor**; every other repo's declared floor (`ocx-catalog` ≥20.19, `grimoire-indexer` ≥22.14, `grimoire-vscode`/`vscode-ocx` ≥20, browserslist-implied floors for the two SPAs) sits below it, and VS Code's Electron host (`engines.vscode: ^1.96.0`) is independently below the line too — VS Code's own [1.96 release notes](https://code.visualstudio.com/updates/v1_96) state the desktop app was, at that release, still *behind* Electron 33, itself well behind the Chromium-134 threshold.

### 5. Bundler/transpiler lowering: esbuild, Vite/Rolldown/Oxc, Bun

**esbuild** (bundles `grimoire-vscode` and `vscode-ocx`, pinned `^0.28.1` in both): support for `using`/`await using` landed in **v0.18.7** (July 2023 — notably *before* TypeScript 5.2 itself shipped; esbuild built it against the TS PR). Per the changelog: *"This release of esbuild adds support for transforming this syntax to target environments without support for `using` declarations (which is currently all targets other than `esnext`)."* Esbuild also explicitly disclaims polyfilling: *"you'll need to polyfill `Symbol.dispose` if it's not present before you use it. This is not something that esbuild does for you because esbuild only handles syntax, not APIs."* ([esbuild CHANGELOG-2023.md, v0.18.7](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2023.md)) A minifier bug that incorrectly inlined `using`/`await using` bindings (breaking disposal) was fixed in **v0.28.1** — the fleet's exact pinned version ([esbuild CHANGELOG.md](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md), [#4482](https://github.com/evanw/esbuild/issues/4482)). esbuild v0.22.0 separately updated `await using` lowering "to match TypeScript" after TypeScript 5.5 changed its semantics — evidence that the two implementations are actively tracked against each other, not independent.

**Verified locally** by compiling a `using` sample with `esbuild@0.28.1 --target=node20`, esbuild's emitted helper resolves `Symbol.dispose` differently from tsc's:

```js
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
```

Where tsc throws immediately if `Symbol.dispose` is absent (`"Symbol.dispose is not defined."`), esbuild instead falls back to the **global symbol registry** (`Symbol.for("Symbol.dispose")`) rather than the bare global. Because a disposable class's `[Symbol.dispose]()` method key is *not* rewritten through this helper — only the `using`-statement call site is — an unpolyfilled `Symbol.dispose` still produces a mismatch (class key becomes the literal string `"undefined"`, the call-site lookup uses a registry symbol) and esbuild's helper throws its own `TypeError("Object not disposable")`. **Both toolchains fail loud, not silently, when the polyfill is missing — but by different, non-interchangeable code paths.** See §6 for why this still matters.

**Vite / Rolldown / Oxc** (fma and creeptd-ng/web currently pin Vite `^6.0.5`/`^6.0.0`, which uses esbuild — the above esbuild findings apply to them *today*). Vite is now at **v8.2.2**, with **Rolldown as the default production bundler** — no longer the opt-in `rolldown-vite` package it was through Vite 7 ([v7.vite.dev/guide/rolldown](https://v7.vite.dev/guide/rolldown): "a temporary solution to gather feedback… eventually merge into the main Vite repository" — that merge is what shipped as Vite 8's default). Rolldown uses **Oxc**, not esbuild, for syntax lowering and minification ([vite.dev/guide/](https://vite.dev/guide/)). Vite 8's **dev server sets `esnext` as the transform target** deliberately (no lowering, relies on the browser under test natively supporting whatever syntax is authored); **production builds target "Baseline Widely Available browser versions as of a date fixed for each major release"** — 2026-01-01 for Vite 8, corresponding to roughly mid-2023 browser versions, which predates Chromium 134/Firefox 141 entirely. **Production builds must therefore lower `using`.**

Oxc's transformer does implement `using` lowering (internally: `ES2026ExplicitResourceManagement`) — but has an **open, current defect**: [**oxc-project/oxc#25155**](https://github.com/oxc-project/oxc/issues/25155), filed 2026-07-31, unresolved as of 2026-08-29. Root cause, quoted from the issue: `EngineTargets::has_feature` walks the *feature's* compat table looking for the target engine; if the engine (Safari, iOS Safari, Samsung Internet, Deno) isn't a key in that table at all, the loop falls through to the always-present `Engine::Es` entry and reports the feature "supported" — the opposite of the correct fail-safe. The issue's own reproduction:

```js
// npm i oxc-transform@0.142.0
import { transformSync } from 'oxc-transform'
const code = `using resource = acquire();`
for (const target of ['safari12','safari18','safari26','ios18','samsung23']) {
  const { code: out } = transformSync('input.mjs', code, { target, sourceType: 'module' })
  console.log(target, /\busing\s+resource\b/.test(out) ? 'NOT lowered' : 'lowered')
}
// actual: all five print "NOT lowered". Safari has never shipped `using`, at any version.
```

The issue notes Babel's equivalent `transform-explicit-resource-management` does **not** have this bug — Babel treats an engine absent from its table as *not* supporting the feature (fail-safe), the correct default. Directly relevant: any Vite 8/Rolldown/Oxc build whose browserslist/target includes Safari will ship unparseable `using` syntax to real Safari users, with no build-time warning.

**Bun** (runs `setup-ocx`, no bundler step — "untranspiled" per the brief, though Bun always runs code through its own built-in transpiler regardless of whether a separate bundling step exists). Support landed in **v1.0.23** (Jan 16, 2024): *"We've implemented a polyfill that will work in Bun, in Node.js, and in web browsers (based on esbuild's polyfill)… We have not implemented parser or AST support in JavaScriptCore, since we can use the transpiler for that for now."* JavaScriptCore itself has **partial native support — `Symbol.dispose`, `Symbol.asyncDispose`, and `SuppressedError` all exist natively in the JSC Bun embeds** ([Bun v1.0.23 blog](https://bun.com/blog/bun-v1.0.23)), so unlike Node/esbuild/tsc targets, **Bun needs no polyfill at all**. `bun:test`'s `mock`/`spyOn` gained `Symbol.dispose` support in **v1.3.9** (Feb 8, 2026) — recent, and a concrete `using mockedFn = spyOn(...)` pattern now available in tests.

### 6. The polyfill is mandatory — and ordering is load-bearing

Computed class member keys evaluate via `ToPropertyKey` at class-definition time, not lazily. Verified directly in Node:

```js
node -e '
const NoDispose = undefined;
class Foo { [NoDispose]() { return "orig"; } }
console.log(Object.getOwnPropertyNames(Foo.prototype)); // [ "constructor", "undefined" ]
console.log(new Foo()["undefined"]());                   // "orig"
'
```

If `Symbol.dispose` is `undefined` when a class body with `[Symbol.dispose]() {}` evaluates, the method is silently stored under the literal string key `"undefined"` — not an error, just the wrong key. Both tsc's and esbuild's downlevel helpers guard against the resulting mismatch by throwing (`"Symbol.dispose is not defined."` / `"Object not disposable"` respectively, §3/§5) rather than silently skipping disposal — this is good news for correctness, but it means:

- **The polyfill must run before *any* module in the graph defines a class with `[Symbol.dispose]`/`[Symbol.asyncDispose]`, not merely before the `using` statement executes.** ESM import order means transitively-imported modules' top-level class declarations can run before your entry file's own polyfill line, if the polyfill isn't the very first thing the entry module does.
- The idiomatic guard, `Symbol.dispose ??= Symbol('Symbol.dispose')`, is safe to run multiple times/places as long as every copy uses `??=` (not a bare `=`) — the first one to run wins and every later one becomes a no-op read.
- The failure mode when this goes wrong is a **thrown `TypeError` at the first `using` execution**, not a silent leak — but that's still a runtime failure invisible to `tsc --noEmit`, and only as good as the test coverage that actually executes the code path.

### 7. The vscode.Disposable collision

`vscode.Disposable`, from the current `vscode.d.ts` ([raw source](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts), grepped directly — `Symbol.dispose`/`Symbol.asyncDispose` occur **zero** times in the whole file):

```ts
export class Disposable {
  static from(...disposableLikes: { dispose: () => any }[]): Disposable;
  constructor(callOnDispose: () => any);
  dispose(): any;
}
```

This is a `dispose(): any` protocol with an **ownership model** — `context.subscriptions` is an array VS Code drains (calling `.dispose()` on every entry) when the extension deactivates. It has no `Symbol.dispose` member, and `Disposable.from`'s own doc comment states *"asynchronous dispose-functions aren't awaited"* — it doesn't even interoperate with `Symbol.asyncDispose`-style async cleanup on its own terms. TypeScript's structural typing means a `using` binding requires a value whose type actually has `[Symbol.dispose]` — a bare `vscode.Disposable` does not satisfy `Disposable` and **will not compile** under `using` without an adapter.

There is no built-in bridge in either direction, and v8.dev notes such bridging *"may happen in the future"* for web/platform APIs generally — it hasn't yet, and there is no evidence VS Code specifically is planning one. The two idioms have genuinely different lifetimes: `Symbol.dispose` is block/function-scoped; `context.subscriptions` is extension-session-scoped, drained once at deactivation. They should stay two idioms, bridged narrowly:

```ts
// the one shared adapter — everything else imports this, never re-implements it
function toDisposable(d: vscode.Disposable): vscode.Disposable & Disposable {
  return { dispose: () => d.dispose(), [Symbol.dispose]: () => d.dispose() };
}

// correct: extension-lifetime resource stays on context.subscriptions (existing pattern, 0 leaks)
context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(handler));

// correct: a vscode.Disposable consumed only within one function's scope
function runOnce() {
  using channel = toDisposable(vscode.window.createOutputChannel("tmp"));
  channel.dispose; // typed, and disposed automatically at scope exit
}
```

### 8. Fleet inventory: real candidates and their lifetime shapes

Grep-confirmed across all nine repos — zero existing `using`/`await using`/`Symbol.dispose`/`DisposableStack` usage anywhere. Real disposal-shaped call sites found, and whether their *lifetime* actually fits a block-scoped `using`:

| Site | Shape | `using`-shaped? |
|---|---|---|
| `ocx-catalog/src/build/engine.ts:123-124`, `cli/dev.ts:79,93`, `build/dev_worker.ts:183-202` — `try { … } finally { await scratchRoot.dispose(); }`, `await handle.close()` | resource acquired and disposed within one function | **yes** — textbook candidate |
| `fs/promises` `open()` call sites across `ocx-catalog`/`grimoire-indexer` (17 files import `fs/promises`) | `FileHandle` natively implements `Symbol.asyncDispose`; Node's own docs call GC-based auto-close "unreliable" | **yes**, cleanest fleet-wide target |
| `grimoire-vscode/src/extension.ts:653` — `setInterval` wrapped as `{ dispose: () => clearInterval(...) }`, pushed to `context.subscriptions` | lifetime is the whole extension session, until deactivate | **no** — correctly modeled today, do not "upgrade" to `using` |
| `grimoire-vscode`/`vscode-ocx` — dozens of `.dispose()` calls on panels, watchers, status bar items, event subscriptions (`views/details.ts`, `watchers.ts`, `project.ts`, test files) | almost all are `vscode.Disposable`-protocol, extension- or component-session-scoped | **mostly no** — needs the `toDisposable` adapter (§7) for the handful that are genuinely function-scoped (e.g. a temporary output channel in a single command handler); the rest correctly stay on `context.subscriptions` |
| `fma`/`creeptd-ng` WebGL/audio `dispose()` chains (`Renderer.ts`, `graph/runner.ts`, `AudioEngine.ts`) | resource is held across a component's mounted lifetime (disposed on unmount/effect cleanup), not within one function call | **no** — different lifetime shape than `using` fits; leave as-is |
| `child_process`/`execFile`/`spawn` sites (13 files across `grimoire-indexer`, `ocx-catalog`, `grimoire-vscode`, `vscode-ocx`) | Node's `ChildProcess` does not implement `Symbol.dispose`/`Symbol.asyncDispose` (not found in Node's own docs) | **no**, not without a hand-written adapter — lower priority than FileHandle |
| `vscode.OutputChannel` (`grimoire-vscode`: 10 files; `vscode-ocx`: 1) | mix of extension-session-scoped (kept in `context.subscriptions`) and short-lived diagnostic channels | **case-by-case** — apply the same lifetime test as any other `vscode.Disposable` |
| File watchers (`grimoire-vscode/src/watchers.ts`, `vscode-ocx/src/project.ts`) | rebuilt/torn down on workspace-folder change, not function-scoped | **no** |

### 9. DisposableStack / AsyncDisposableStack

MDN's own guidance is explicit about a leak window: register a resource with `.use()` in the **same statement** as acquisition, not on a separate line —

```ts
// good — no window for an inserted statement to leak the resource
using disposer = new DisposableStack();
const reader = disposer.use(stream.getReader());

// avoid — a resource acquired between these two lines and inserted later leaks
using disposer = new DisposableStack();
const reader = stream.getReader();
disposer.use(reader);
```

([MDN: DisposableStack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DisposableStack)) A `core-js` polyfill exists for `DisposableStack`/`AsyncDisposableStack` themselves (distinct from the bare `Symbol.dispose`/`Symbol.asyncDispose` polyfill, which is a two-line assignment) — not currently a fleet dependency; pull it in only if a repo needs the aggregate-cleanup shape below the native floor (§4), since the bare-symbol polyfill alone is enough for plain `using`/`await using` on a class that already implements the protocol.

## Normative guidance candidates

1. **Load a `Symbol.dispose`/`Symbol.asyncDispose` polyfill (`Symbol.dispose ??= Symbol('Symbol.dispose'); Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose');`) as the very first statement of every entry point, before adopting `using` anywhere in that repo.**
   Rationale: no fleet runtime floor has native support except Bun (§4); both tsc's and esbuild's downlevel emission throw a `TypeError` at the first `using` execution if it's missing or misordered (§6).
   Verify: grep each entry point (`src/extension.ts`, `src/cli/*.ts`, `bin/*`) for the polyfill assignment as the first executable statement; a smoke test that constructs and disposes one trivial resource and asserts no throw.

2. **Never bind a `vscode.*` factory result directly with `using` — go through the one shared `toDisposable` adapter.**
   Rationale: `vscode.Disposable` has no `Symbol.dispose` member (§7); this fails the type checker today, but the fleet's established escape hatch (`as unknown as T`, 164 occurrences per Wave 1) can paper over that check and silently defeat disposal.
   Verify: `grep -n 'using .* = vscode\.'` should only ever match calls wrapped in `toDisposable(...)`; grep for `using .*as unknown as` as a red flag.

3. **Keep exactly one `toDisposable` adapter per extension; never write an inline `{ [Symbol.dispose]: () => x.dispose() }` literal elsewhere.**
   Rationale: keeps the block-scoped-`using` vs. session-scoped-`context.subscriptions` boundary auditable in one place instead of reinvented per call site.
   Verify: grep for `\[Symbol\.dispose\]:` outside the adapter's own definition file.

4. **Extension-lifetime resources (anything meant to live until `deactivate`) stay on `context.subscriptions`; never wrap them in `using`.**
   Rationale: `using` disposes at end of the *enclosing block*, the wrong lifetime for `extension.ts:653`-style long-lived resources (§8); this is already correctly modeled fleet-wide (0 leaks per Wave 1) — don't regress it.
   Verify: reading heuristic — a `using`/`await using` binding whose value is later pushed to `context.subscriptions`, assigned to `this`, or returned from the function is a lifetime mismatch; flag any such pattern in review.

5. **`using`/`await using` only where the resource's lifetime IS the enclosing function or block — never for a value stored on a class field, ref, or returned.**
   Rationale: general form of rule 4; also catches the fma/creeptd WebGL-dispose-on-unmount pattern, which is component-lifetime, not function-scoped (§8).
   Verify: does the bound value get returned, assigned outside the block, or stored on `this`/a ref — any yes disqualifies it.

6. **Add `"ESNext.Disposable"` (or `"ESNext"`) to `lib` in any tsconfig before authoring `using`; `ocx-catalog`'s current `lib: ["ES2022"]` needs this change first.**
   Rationale: omitting it fails with **TS2318**/**TS2550**, verified locally on typescript 6.0.3 (§3).
   Verify: `tsc --noEmit` on a file with a trivial `using` statement — 0 errors confirms the lib is wired.

7. **Never set `target`/bundler-target to `esnext`/`ESNext` for code shipping to a runtime below the native line (§4) if that code uses `using`.**
   Rationale: verified locally — at `target: "esnext"`, both tsc and esbuild emit `using` completely unlowered; on an engine that can't parse the syntax that's a load-time `SyntaxError`, not a graceful degrade (§3).
   Verify: grep tsconfig/bundler config for `"target": "esnext"` (any case) combined with any `using ` usage in the same repo — an automatic fail.

8. **`kate-middlechild` is out of scope for `using` until its tsconfig target moves off `ESNext` or a confirmed bundler-side lowering pass is added.**
   Rationale: direct application of rule 7 — it is the one fleet repo currently on `"target": "ESNext"` fleet-wide with no bundler in front of tsc.
   Verify: re-check `tsconfig.base.json`'s `target` field before lifting this restriction.

9. **Before shipping `using` from `fma` or `creeptd-ng/web` on a Vite 8+/Rolldown/Oxc toolchain (they are on Vite 6 today, using esbuild), re-run the reproduction from [oxc#25155](https://github.com/oxc-project/oxc/issues/25155) against the project's actual browserslist/target and confirm the issue is resolved or the target excludes Safari.**
   Rationale: Oxc currently ships `using` completely unlowered to Safari/iOS Safari/Samsung Internet/Deno targets — silent at build time, a guaranteed `SyntaxError` for real users (§5).
   Verify: the issue's own repro script against the live `oxc-transform` version pinned by the project's Vite/Rolldown dependency; re-check issue status before each Vite major bump.

10. **On `ocx-catalog` and `grimoire-indexer` (the two repos where `tsc` itself emits JS), enable `"importHelpers": true` + a `tslib` dependency before adopting `using` broadly.**
    Rationale: verified locally — without it, every compiled file using `using` carries its own ~2KB copy of `__addDisposableResource`/`__disposeResources`; unbounded duplication as adoption spreads (§3).
    Verify: grep compiled `dist/` output for repeated `__addDisposableResource` function definitions across more than one file.

11. **Register a `DisposableStack`/`AsyncDisposableStack` member in the same statement as its acquisition — `disposer.use(acquire())`, never on a separate following line.**
    Rationale: MDN's own guidance — any code inserted between acquisition and `.use()` is a leak window if it throws (§9).
    Verify: grep for `.use(` calls whose argument is not itself a call/`new` expression on the same line.

12. **The rule is the narrow one: "never hand-roll `try/finally` where the resource already implements (or can be trivially adapted to) `Symbol.dispose`/`Symbol.asyncDispose`" — not a blanket "prefer `using` for anything disposable-shaped."**
    Rationale: a blanket rule would also pull in the fma/creeptd WebGL-dispose-on-unmount and vscode extension-session-scoped patterns that don't fit `using`'s lifetime (§8); the narrow rule targets exactly the real candidates (`ocx-catalog`'s `try/finally`+`.dispose()`/`.close()` sites, `FileHandle` opens).
    Verify: grep for `try {` … `} finally { … \.(close|dispose)\(\) }` co-occurrence; each hit is a genuine candidate only if the resource is both acquired and disposed inside the same function.

13. **Move `fs/promises` `open()` call sites from manual-close/try-finally to `await using`.**
    Rationale: `FileHandle` implements `Symbol.asyncDispose` natively; Node's own docs call the GC-based fallback unreliable and explicitly recommend explicit close (§8).
    Verify: grep for `fsPromises.open(` / `fs.promises.open(`/`fs.open(` (promisified) not immediately followed by `await using` in the same function.

## AI-agent angle

- **Assumes `using` "just works" once the tsconfig `lib` is set, with no runtime polyfill.** It compiles clean (the lib entry satisfies the type checker) and throws a `TypeError` at the *first execution* of that `using` statement on every fleet runtime below the native floor (§4, §6) — invisible to `tsc --noEmit`, and often invisible to test suites that don't exercise the exact code path (a rarely-hit error-cleanup branch, say). Mechanical check: don't gate CI on typecheck alone for any repo introducing `using` — add one smoke test per entry point that actually *executes* a `using` block, run against the repo's declared floor runtime, not just the developer's local (likely newer) Node/Bun.
- **Wraps a `vscode.Disposable`-shaped value directly in `using`.** Caught by the compiler today (no `Symbol.dispose` on `vscode.Disposable`, §7) — but the model's typical "fix" when a type error blocks it is an `as unknown as T` cast, the fleet's own most common escape hatch (164 occurrences, Wave 1). That cast defeats the check and produces a resource that silently never disposes. Mechanical check: `grep -n 'using .*as unknown as'` in any diff introducing `using`.
- **Hallucinates that `DisposableStack`/`Symbol.dispose` are available in browser code without checking the actual bundler target/browserslist.** Training data spans the entire 2023-2026 rollout where availability changed repeatedly; a model asked to "clean this up with `using`" for browser SPA code has no way to know from its own knowledge whether the project's *current* Vite/Oxc pin actually lowers the syntax for the project's real target list — that's a live, changing fact (§5), not something inferable from training data. Mechanical check: does the diff introduce `using`/`DisposableStack` without a corresponding check (or comment) confirming the target/browserslist and toolchain version were verified against §4/§5's thresholds.
- **Returns a value that was bound with `using` from the same function**, unaware that disposal fires *before* the return completes (the TS 5.2 docs' own example shows this is intended — "Automatically disposed before return"). A model porting a `try/finally` that returned the resource itself, mechanically converted to `using`, hands the caller an already-disposed object. Mechanical check: grep for `return \w+;` where `\w+` was declared via `using \w+ =` earlier in the same function — always wrong.
- **Assumes the whole fleet parses `using` uniformly**, missing that `grimoire-indexer`'s Node ≥22.14 floor is a `SyntaxError` at load, not a missing-API gap — Node 22 ships V8 12.4, which cannot parse the syntax at all if it reaches that engine unlowered (§4). Mechanical check: CI must actually *run* (not just typecheck) against the exact floor version declared in `engines.node`, not whatever Node the CI image happens to default to.
- **Mixes a sync `using` with a value whose only disposal method is `Symbol.asyncDispose`.** Usually caught by the type checker (`Disposable` requires `Symbol.dispose` specifically) — but only if `lib`/`target` are wired correctly per rule 6/7; if they aren't, the type error may present as a confusing unrelated message rather than pointing at the real cause. Mechanical check: same as rule 6's verify step — confirm `ESNext.Disposable` is in `lib` before trusting any type-checker silence around `using`.

## Contested / evolving

- **Stage 3 → Stage 4, May 2026** — genuinely recent as of this report; most existing write-ups (including TypeScript's own 5.2 handbook page and the TC39 proposal repo's own README) still describe it as Stage 3. Trend: settling, publication targeted for 2027; no indication the semantics themselves will change further, only formal status.
- **Oxc's Safari-lowering bug ([#25155](https://github.com/oxc-project/oxc/issues/25155)) is open and unresolved** as of 2026-08-29, filed less than a month prior. Root-caused, with a linked Rolldown PR ([#10564](https://github.com/rolldown/rolldown/pull/10564)) noted as surfacing it — active, in-progress area, not settled. Re-check before relying on Vite 8/Rolldown/Oxc for any browser-facing `using` code.
- **Whether tooling will rename `esnext.disposable` to a concrete-edition lib name now that the feature is Stage 4** — could not establish an announced timeline as of 2026-08-29; `typescript@6.0.3`'s lib file is still named `lib.esnext.disposable.d.ts`, unchanged since 5.2.
- **Node's decision to gate this behind a `SEMVER-MAJOR` flag, landing only in a new major (24) rather than being backported to 22 or 20 LTS** — signals runtime vendors are treating "new global symbols" as conservative territory. The going pattern (also true of Bun choosing to keep its own transpiler rather than wait on JSC's parser) is "ship early via transpilation, wait for the next major to trust the native path" — not "backport aggressively." Given Node 20 is already EOL and Node 22 lacks native support, expect this pattern (transpile now, native later) to hold for at least another LTS cycle across the fleet.
- **Whether the ecosystem converges on adapting existing disposal protocols (`vscode.Disposable`, RxJS `Subscription`, etc.) onto `Symbol.dispose`, or keeps them permanently separate.** v8.dev notes such integration "may happen in the future" for web platform APIs generally; no evidence of movement specific to VS Code's own API surface as of this report (§7) — current guidance (rule 2/3) assumes they stay separate, bridged narrowly, and that should be revisited if VS Code's own API ever adds native interop.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typescriptlang.org: TS 5.2 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) | Official TS docs | Aug 2023 (TS 5.2) | Canonical description of `using`/`await using`/`DisposableStack` syntax and the `lib`/`target` requirement |
| [typescriptlang.org: TS 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) | Official TS docs | 2026 (TS 6.0) | Confirms no changes to ERM support/requirements since 5.2 |
| [github.com/tc39/proposal-explicit-resource-management](https://github.com/tc39/proposal-explicit-resource-management) | TC39 proposal repo | authored 2018–2023, page text still says Stage 3 | Primary spec-level semantics (SuppressedError, disposal order, error aggregation) — note stage text is stale, see finished-proposals.md |
| [tc39/proposals finished-proposals.md](https://github.com/tc39/proposals/blob/main/finished-proposals.md) | TC39 official proposal tracker | current, May 2026 entry | Confirms Stage 4 status and May 2026 date, 2027 publication target |
| [tc39/proposals README.md](https://github.com/tc39/proposals/blob/main/README.md) | TC39 official proposal tracker (active proposals) | current | Cross-check: proposal absent from active Stage 0–3 list, confirming graduation |
| [MDN: `using` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) | MDN reference | current | Syntax rules (valid/invalid locations, TDZ, no destructuring), disposal-order example |
| [MDN: DisposableStack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DisposableStack) | MDN reference | current | The "register at acquisition, not after" leak-window guidance; core-js polyfill pointer |
| [MDN browser-compat-data: DisposableStack.json (raw)](https://raw.githubusercontent.com/mdn/browser-compat-data/main/javascript/builtins/DisposableStack.json) | Primary compat-data source | current | Exact version numbers: Chrome 134, Firefox 141, Node 24.0.0, Bun 1.3.0, Safari "preview" only |
| [v8.dev: Explicit Resource Management](https://v8.dev/features/explicit-resource-management) | V8 team feature page | shipped Chromium 134/V8 13.8 | Primary source for the V8/Chromium version the feature landed in |
| [nodejs.org: v24.0.0 blog](https://nodejs.org/en/blog/release/v24.0.0) | Official Node release notes | May 2025 (Node 24.0.0) | Confirms V8 13.6, `SEMVER-MAJOR` flag on enabling ERM ([nodejs/node#58154](https://github.com/nodejs/node/pull/58154)) |
| [nodejs.org: v22.0.0 blog](https://nodejs.org/en/blog/release/v22.0.0) | Official Node release notes | Apr 2024 (Node 22.0.0) | Confirms V8 12.4 — below the native-support threshold, no ERM mention |
| [nodejs.org: fs.html (FileHandle)](https://nodejs.org/api/fs.html#class-filehandle) | Official Node API docs | current | `filehandle[Symbol.asyncDispose]()` documented; GC-based auto-close explicitly called unreliable |
| [nodejs.org: previous-releases](https://nodejs.org/en/about/previous-releases) | Official Node release/LTS table | current | Node 20 EOL, 22 and 24 both Active LTS |
| [bun.com/docs/typescript](https://bun.com/docs/typescript) | Official Bun docs | current | Baseline TS-feature-support page (does not itself mention ERM — useful negative check) |
| [bun.com/blog](https://bun.com/blog) | Official Bun blog index | current | Located the v1.0.23 and v1.3.9 ERM-related entries |
| [bun.com/blog/bun-v1.0.23](https://bun.com/blog/bun-v1.0.23) | Official Bun release notes | Jan 16, 2024 | Primary source: Bun's own transpiler lowers `using`, JSC has partial native support, no polyfill needed |
| [esbuild CHANGELOG-2023.md](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2023.md) (v0.18.7/0.18.8) | Official esbuild changelog | Jul 2023 | Primary source for esbuild's lowering behavior, exact target rule ("all targets other than esnext"), and the explicit no-polyfill disclaimer |
| [esbuild CHANGELOG-2024.md](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2024.md) (v0.22.0) | Official esbuild changelog | 2024 | `await using` semantics updated to track TypeScript 5.5 |
| [esbuild CHANGELOG.md](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md) (v0.28.1) | Official esbuild changelog | current, fleet's pinned version | Minifier bug fix for incorrect `using` inlining — the exact version two fleet repos pin |
| [microsoft/vscode: vscode.d.ts (raw)](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts) | Primary API type source | current (main branch) | Ground truth: `Disposable` class shape, confirms zero `Symbol.dispose` references anywhere in the file |
| [code.visualstudio.com: v1.96 release notes](https://code.visualstudio.com/updates/v1_96) | Official VS Code release notes | Nov 2024 | Electron-version context for the fleet's `engines.vscode: ^1.96.0` floor |
| [v7.vite.dev/guide/rolldown](https://v7.vite.dev/guide/rolldown) | Official Vite docs (archived v7) | Vite 7 era | rolldown-vite's prior experimental/opt-in status, before becoming Vite 8's default |
| [vite.dev/guide/](https://vite.dev/guide/) | Official Vite docs (current) | current, Vite 8.2.2 | Confirms Rolldown is now default, Oxc replaces esbuild, dev-vs-prod target policy |
| [oxc.rs: transformer docs](https://oxc.rs/docs/guide/usage/transformer.html) | Official Oxc docs | current | Confirms Oxc's lowering pipeline exists (ES2026 → ES2015) though doesn't enumerate ERM specifically |
| [oxc-project/oxc#25155](https://github.com/oxc-project/oxc/issues/25155) | GitHub issue, primary/current | filed 2026-07-31, open | The standout current finding: Oxc fails to lower `using` for Safari/iOS/Samsung/Deno targets; exact root cause and repro |
| local verification (`typescript@6.0.3`, `esbuild@0.28.1`, node) | direct tool execution, not a URL | 2026-08-29 | Ground-truth for §3 and §5's emitted-code claims — compiled real samples and inspected the actual output rather than trusting summarized docs |

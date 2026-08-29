---
title: TypeScript defect corpus — landscape scout
corpus: defect-catalogue
agent: scout-defects
model: sonnet
date_researched: 2026-08-29
sources_count: 26
scope: >
  TypeScript-specific defects only (type system, ESM/CJS interop, async,
  numeric/temporal/text, VS Code extension host, AI-agent-authored code).
  Excludes generic error handling, generic testing discipline, CLI exit
  codes, generic dependency policy, generic CI gates — covered by the prior
  Rust/Python programs.
---

## Table of contents

1. [Summary](#summary)
2. [Defect catalogue](#defect-catalogue)
   1. [Type-system defects](#1-type-system-defects)
   2. [ESM/CJS interop defects](#2-esmcjs-interop-defects)
   3. [Async defects](#3-async-defects)
   4. [Numeric, temporal and text defects](#4-numeric-temporal-and-text-defects)
   5. [Recurring code-review objections](#5-recurring-code-review-objections)
   6. [VS Code extension defects](#6-vs-code-extension-defects)
   7. [AI-agent-specific TypeScript defects](#7-ai-agent-specific-typescript-defects)
3. [Candidate topics](#candidate-topics)
4. [Sources](#sources)

## Summary

- `any` is not a type, it is a hole that erases checking on everything it touches transitively — the fix is a narrow, justified `any` (or `unknown`) at the boundary, never a bare parameter type.
- Excess property checking only fires on object literals assigned directly; the identical object routed through a variable is not checked — a structural-typing exception, not a bug, and it means "assign through a temp" silently disables a real check.
- `strictFunctionTypes` deliberately does not check method parameters (bivariantly) because doing so would break common array/inheritance patterns TypeScript users rely on — a known, accepted unsoundness, not an oversight.
- `const enum` cannot be used in `isolatedModules` builds (Vite, esbuild, Bun, ts-jest single-file transpilation) because inlining requires whole-program knowledge a single-file transpiler doesn't have — prefer `as const` object literals or string unions.
- `noUncheckedIndexedAccess` is off by default, so every `obj[key]` and `arr[i]` access is typed as present even though nothing guarantees it — this is the single highest-leverage compiler flag this fleet does not universally enable.
- `Object.keys()` is typed `string[]`, not `(keyof T)[]`, on purpose — TypeScript's own maintainers rejected the stricter type because objects can carry extra runtime keys a static type can't rule out; treat any narrower usage as a manual, self-imposed unsoundness.
- `satisfies` validates against a type without widening the inferred type the way an annotation does — use it for config-shaped literals; use `as` only when you know more than the checker (and never as a substitute for validating unknown external data).
- `verbatimModuleSyntax` replaces `esModuleInterop`'s guesswork about which imports are type-only with an explicit rule: no `type` modifier means the import survives to runtime, full stop — the ambiguity it removes is exactly the ambiguity that produces "why did my side-effect import disappear" bugs.
- The single biggest TypeScript-specific defect class in this fleet's shape is ESM/CJS interop — `@arethetypeswrong/cli`'s own problem catalogue (11 codes) and `publint`'s rule set together are close to a complete taxonomy of it.
- `require()` of a true ESM package throws in Node before v22.12; a `nodenext`/`bundler`-resolution mismatch between a library's declared module kind and its actual runtime module kind ("masquerading") is invisible to `tsc` and only surfaces at `node` runtime or in `attw`.
- Passing an `async` function to `Array.prototype.forEach` produces a floating, unawaited promise per element — `forEach` never awaits its callback's return value, so thrown errors inside it are silently swallowed as unhandled rejections.
- `Promise.all` is fail-fast: the instant one promise rejects, `Promise.all` rejects, and *nothing waits for or observes the other in-flight promises' rejections* — they still fire `unhandledrejection` if nothing else is attached to them.
- `new Date('2026-01-01')` (bare ISO date, no time) parses as **UTC midnight**; `new Date('2026-01-01T00:00:00')` (with a time, no zone) parses as **local midnight** — a one-character difference in the string flips the returned instant by up to a day depending on the caller's timezone, and this is specified ECMA-262 behavior, not a browser bug.
- `Array.prototype.sort()` with no comparator sorts by converting elements to strings — `[80, 9].sort()` returns `[80, 9]` reversed from numeric order because `"80" < "9"` lexicographically.
- `toLocaleString()` / `localeCompare()` called with no locale argument fall back to the runtime's default locale (OS/env-derived), so identical code produces different formatted output on a CI runner than on a developer's laptop — always pass an explicit locale (or `'en-US'`/BCP-47 tag) in fleet code whose output must be deterministic.
- `.length` on a JS string counts UTF-16 code units, not codepoints or user-perceived characters — a single emoji with a skin-tone modifier or a ZWJ sequence can be 2–11 code units for what a user sees as one character; naive slicing can bisect a surrogate pair and corrupt the string.
- `JSON.stringify`/`JSON.parse` is lossy by design: `undefined` and functions vanish from objects (become `null` inside arrays), `Map`/`Set` serialize to `{}` with no error, `BigInt` throws `TypeError` unless it has a `toJSON`, and key order is only preserved for non-numeric-string keys (integer-like keys are always reordered first) — never use it as a deep-clone or cross-process value-transfer primitive without a schema-aware layer.
- VS Code's own guidelines single out the `*` activation event as the thing to avoid — every listed alternative (`onLanguage`, `onCommand`, `onStartupFinished`) exists specifically so the extension host doesn't pay startup cost for extensions the user isn't using yet.
- LLM-authored TypeScript's dominant error mode (measured, not anecdotal) is type errors the compiler already catches — the leverage for this fleet is less about teaching new type-system facts and more about ensuring the compiler and type-aware lints actually run in the loop before an agent calls a task done.

## Defect catalogue

### 1. Type-system defects

#### 1.1 `any` propagation with no boundary

**Mechanism**: `any` is not unioned or intersected like other types — any operation on an `any`-typed value produces `any` again, and it propagates through every assignment, return, and generic instantiation it touches until something re-annotates it. Effective TypeScript devotes five items (43–49) to this because narrowing its *scope* is the only real mitigation once it exists.

```ts
// wrong — the untyped edge is a parameter, so `any` infects the whole call graph
function process(data: any) {
  return data.items.map((x: any) => x.value);
}

// right — validate/narrow at the boundary, keep `unknown` until proven
function process(data: unknown) {
  if (!isPayload(data)) throw new Error("bad payload");
  return data.items.map((x) => x.value);
}
```

**Check**: `noImplicitAny` (compiler, catches only implicit occurrences) + `@typescript-eslint/no-explicit-any` for explicit ones; `grep -rn ': any\b'` as a coarse sweep.
**Category**: primary source (Effective TypeScript items, TypeScript Do's and Don'ts).
Source: [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html), [effectivetypescript.com item list](https://effectivetypescript.com/)

#### 1.2 Excess property checking only fires on fresh object literals

**Mechanism**: TypeScript is structurally typed — a type with more properties than required is normally assignable. But when an object *literal* is assigned or passed directly, TypeScript additionally checks it has no properties the target type doesn't declare. Route the same literal through an intermediate variable and the check disappears, because the variable's own (structural) type is now what's being compared.

```ts
interface Options { width: number }
function f(o: Options) {}

f({ width: 100, height: 50 }); // error: 'height' does not exist — excess property check

const opts = { width: 100, height: 50 };
f(opts); // no error — same shape, but not a fresh literal, so unchecked
```

**Check**: reading heuristic only — no lint flags "you assigned through a variable to dodge this." Code review: watch for a config object built once and passed to multiple typed sinks.
**Category**: primary source (TypeScript FAQ / handbook explanation of "freshness").
Source: [TypeScript FAQ](https://github.com/microsoft/TypeScript/wiki/FAQ)

#### 1.3 Method bivariance under `strictFunctionTypes`

**Mechanism**: `strictFunctionTypes` makes standalone function-typed *properties* contravariant in their parameters (a supertype of what's needed is not assignable). But *methods* (shorthand syntax, `foo(): void` inside an interface) are deliberately exempted and remain bivariantly checked. The TypeScript team's own reasoning: making methods strictly contravariant would reject extremely common, safe-in-practice patterns (e.g. `Array<Cat>` being usable where `Array<Animal>` methods are expected), and "having the latter not be the case would not be an acceptable type system in the vast majority of cases, so we have to take a correctness trade-off."

```ts
interface Handler {
  onEvent(e: MouseEvent): void; // method syntax — bivariant, unsound but allowed
}
type HandlerProp = {
  onEvent: (e: MouseEvent) => void; // property syntax — contravariant under strictFunctionTypes
};
```

**Check**: reading heuristic only, plus `@typescript-eslint/method-signature-style` (enforce property syntax everywhere to opt every callback signature *into* the stricter check).
**Category**: primary source, direct maintainer quote.
Source: [TypeScript FAQ — strictFunctionTypes](https://github.com/microsoft/TypeScript/wiki/FAQ)

#### 1.4 `readonly` is a compile-time-only guarantee, erased at any boundary

**Mechanism**: `readonly` on a property or `ReadonlyArray`/`readonly T[]` blocks reassignment through *that* typed reference only. Nothing in the emitted JS enforces it — a cast, a `JSON.parse` round-trip, or handing the value to untyped/JS-only code all erase the guarantee, and the underlying object is still mutable through any other reference to it.

```ts
function freeze(a: readonly number[]) {
  // a.push(1); // error — good
  (a as number[]).push(1); // right past it, no runtime error
}
```

**Check**: reading heuristic only for the erasure itself; `Object.freeze()` is the runtime complement when the guarantee must actually hold at the value, not just the type.
**Category**: primary source (Effective TypeScript item 14).
Source: [effectivetypescript.com](https://effectivetypescript.com/)

#### 1.5 `const enum` breaks under `isolatedModules`

**Mechanism**: `const enum` members are meant to be inlined at every use site at compile time, which requires the compiler to see the enum's *declaration*, not just its type, when compiling the *importing* file. Every tool that transpiles one file at a time without cross-file knowledge — esbuild, swc, Babel, Vite's dev-server transform, ts-jest's isolated mode — cannot do this inlining, so `isolatedModules: true` (required by all of the above) rejects `const enum` outright, or worse, silently strips the import and leaves a runtime `ReferenceError`. The TypeScript issue tracker's own deprecation thread quotes the ecosystem cost directly: "const enums cause enormous pain to the ecosystem (for example, 3+ year old lack of support by babel, plus all the linked issues)," and the claimed performance win was never substantiated — a linked benchmark showed it *regressed* performance in one engine.

```ts
// wrong under isolatedModules (Vite, esbuild, Bun, swc)
const enum Color { Red, Green, Blue }

// right — same call-site ergonomics, transpiles per-file safely
const Color = { Red: "Red", Green: "Green", Blue: "Blue" } as const;
type Color = (typeof Color)[keyof typeof Color];
```

**Check**: compiler error under `"isolatedModules": true` (already required by Vite/esbuild/Bun toolchains in this fleet) — `tsc --isolatedModules` surfaces it directly; `@typescript-eslint/no-restricted-syntax` on `TSEnumDeclaration[const=true]` as a lint-time gate.
**Category**: primary source (maintainer issue thread, direct quotes).
Source: [microsoft/TypeScript#41641](https://github.com/microsoft/TypeScript/issues/41641)

#### 1.6 `enum` reverse mapping and general enum discouragement

**Mechanism**: Numeric (non-const, non-string) enums emit a bidirectional lookup object at runtime — both `Color.Red === 0` and `Color[0] === "Red"` are valid — which doubles the emitted surface, is easy to get an invalid numeric value into (any `number` is assignable to a numeric enum type without narrowing), and doesn't tree-shake. String enums avoid the reverse mapping but still emit a runtime object and aren't structurally compatible with plain string literals, which usually matters more (data from JSON, a fetched config, etc. can't satisfy the enum type without an assertion). This is why the wider ecosystem — and Effective TypeScript's design chapter (`Prefer More Precise Alternatives to String Types`, `Use a Distinct Type for Special Values`) — has moved to union-of-literals or `as const` objects as the default.

```ts
// wrong — reverse mapping present, not structurally assignable from plain strings
enum Status { Active, Inactive }
function isActive(s: Status) { return s === Status.Active; }
isActive(0); // allowed — bare number silently accepted

// right — union of literals, no runtime emit needed, and JSON data satisfies it directly
type Status = "active" | "inactive";
```

**Check**: `@typescript-eslint/no-restricted-syntax` targeting `TSEnumDeclaration`; reading heuristic for "why" beyond that.
**Category**: primary source + widely-cited practitioner consensus.
Source: [TypeScript handbook — Enums](https://www.typescriptlang.org/docs/handbook/enums.html), [effectivetypescript.com](https://effectivetypescript.com/)

#### 1.7 `satisfies` vs annotation vs `as` — picking the wrong one

**Mechanism**: A type *annotation* (`const x: T = …`) checks and then widens/commits the variable's type to `T`, discarding the literal's narrower inferred shape. An `as` *assertion* performs no real checking at all beyond a loose compatibility test — it tells the compiler "trust me," which is exactly wrong for validating data whose shape you don't actually know (parsed JSON, `unknown` from a fetch). `satisfies` (TS 4.9+) checks the value against a type *without* changing the type the variable is inferred as, so `Record<string, Config>`-shaped objects keep their per-key literal types (useful for lookup, autocomplete, and exhaustiveness) while still being validated against the general shape.

```ts
type Route = { path: string; roles?: string[] };

// annotation — widens; obj.home.path is `string`, not "/" — literal type lost
const routes: Record<string, Route> = { home: { path: "/" } };

// satisfies — validated AND keeps the literal type of each entry
const routes2 = { home: { path: "/" } } satisfies Record<string, Route>;
```

**Check**: reading heuristic only (there is no lint rule that picks the "correct" one — it's a design judgment); `@typescript-eslint/no-unnecessary-type-assertion` catches a strict subset (an `as` that adds nothing).
**Category**: primary source (TS 4.9 release notes) + widely corroborated practitioner guidance.
Source: [TypeScript 4.9 release notes — satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)

#### 1.8 Index access without `noUncheckedIndexedAccess`

**Mechanism**: By default, TypeScript types `obj[key]` (index-signature access) and `arr[i]` as `T`, not `T | undefined`, even though nothing about the type system guarantees the key or index actually holds a value at runtime. This flag, added in TypeScript 4.1, makes every such access `T | undefined`, forcing an explicit check. It is off by default for backward compatibility, which means most codebases carry this hole invisibly.

```ts
interface Options { path: string; [propName: string]: string | number }
function f(o: Options) {
  o.yadda.toString(); // compiles today; `o.yadda` is `undefined` if the key is absent
}
// with noUncheckedIndexedAccess: 'o.yadda' is possibly 'undefined' — compile error
```

**Check**: `"noUncheckedIndexedAccess": true` in tsconfig — directly measurable per-repo with `grep noUncheckedIndexedAccess tsconfig.json`.
**Category**: primary source (TypeScript 4.1 release notes).
Source: [TypeScript 4.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html)

#### 1.9 `Object.keys()` typed as `string[]`, not `(keyof T)[]`

**Mechanism**: This is a deliberate, defended design choice, not an oversight — TypeScript's own maintainers rejected making `Object.keys` generic over `keyof T` because a value's static type doesn't rule out extra runtime properties (excess properties from a wider-typed source, prototype pollution, structural subtyping generally). A strongly-typed `Object.keys` would let `keyof T` be treated as *exhaustive*, which it isn't. Code that does `(Object.keys(obj) as (keyof typeof obj)[])` to work around this is *reintroducing* the exact unsoundness the maintainers avoided, on the code author's own authority instead of the compiler's.

```ts
interface Config { a: number; b: number }
const c: Config = { a: 1, b: 2 };
Object.keys(c); // string[], not ("a" | "b")[] — by design
```

**Check**: reading heuristic only; grep for `as (keyof` near `Object.keys(` as a targeted sweep for the workaround being reintroduced.
**Category**: primary source (maintainer comment on the tracker).
Source: [microsoft/TypeScript#38520](https://github.com/microsoft/TypeScript/issues/38520)

#### 1.10 `this` parameter erased, callback loses class-instance binding

**Mechanism**: A regular (non-arrow) method detached from its instance — passed as a bare callback (`element.addEventListener('click', obj.method)`, `array.map(obj.method)`) — loses its `this` binding at the call site, because in JS `this` is determined by how a function is *called*, not where it's defined; TypeScript's type checker does not track or warn about this by default because a function's declared `this` type (via a synthetic first parameter, e.g. `function f(this: Foo, …)`) is opt-in and rarely used outside declaration files.

```ts
class Widget {
  value = 1;
  // wrong — `this` is undefined/wrong when handed off as a bare reference
  onClick() { console.log(this.value); }
}
button.addEventListener("click", widget.onClick); // `this` is not `widget` inside onClick

// right — arrow class field captures `this` lexically at construction
class Widget2 {
  value = 1;
  onClick = () => console.log(this.value);
}
```

**Check**: `@typescript-eslint/unbound-method` flags exactly this pattern (a method reference used somewhere other than a direct call).
**Category**: primary source (TypeScript handbook, "More on Functions" — `this` parameters) + typescript-eslint's own rule rationale.
Source: [TypeScript handbook — this parameters](https://www.typescriptlang.org/docs/handbook/2/functions.html)

### 2. ESM/CJS interop defects

This is the richest defect vein for this fleet's shape (§1 in the fleet's published-library and GitHub-Action-on-Bun repos). `@arethetypeswrong/cli` ("attw") and `publint` between them are close to a complete taxonomy — most of the following are literally their problem codes, not derived heuristics.

#### 2.1 `attw`'s 11 problem codes (primary taxonomy)

| Code | Meaning | Mechanism |
|---|---|---|
| `NoResolution` | Import failed to resolve to type declarations or JS at all | Broken `exports` map or missing file |
| `UntypedResolution` | Resolved to JS but no type declarations found | `types`/`typings` field missing or excluded from `files` |
| `FalseCJS` | Types say CJS, but the JS is actually ESM | `.d.ts` written for `require()` shape but paired `.js` has `import`/`export` |
| `FalseESM` | Types say ESM, but the JS is actually CJS | Inverse of above — `.d.mts` paired with a CJS `.js` |
| `CJSResolvesToESM` | A `require()` call resolves to an ESM file | Errors in Node < 22.12; "the types and implementation are both ESM even though CJS was requested" |
| `NamedExports` | ESM named imports of CJS properties TS permits but Node can't always verify at runtime | Node uses static syntactic analysis to synthesize CJS named exports before execution; a computed/dynamic `exports.x = …` isn't detected |
| `FallbackCondition` | Types resolved only via the `"default"` fallback condition in `exports`, after failing an earlier condition | Package's `exports` map ordering doesn't match its actual capability |
| `CJSOnlyExportsDefault` | CJS module simulates a default export shape without the `__esModule` marker | Consumer's default-import interop breaks depending on their own interop settings |
| `FalseExportDefault` | Types use `export default` where the JS uses `module.exports =` | Type/runtime shape mismatch on the primary export |
| `MissingExportEquals` | JS sets both `module.exports` and `module.exports.default`, but types reflect only the latter | Hand-written or mis-generated `.d.ts` for a CJS package |
| `UnexpectedModuleSyntax` | Syntax found in a file is incompatible with the module kind package.json/extension declares | e.g. `import` syntax inside a file resolved as CJS by `"type"` field |
| `InternalResolutionError` | An import found *inside* a `.d.ts` fails to resolve | Broken relative import in the type declarations themselves |

**Check**: `attw --pack .` in CI on every publish — this is the mechanical check for the entire category.
**Category**: primary source (tool's own problem catalogue).
Source: [attw problem docs](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/CJSResolvesToESM.md), [attw.github.io](https://arethetypeswrong.github.io/)

#### 2.2 The `__esModule` double-default problem

**Mechanism**: Transpilers mark their CJS output of an ESM module with `exports.__esModule = true` so a default import can be synthesized correctly for *their own* transpiled modules while leaving genuine CJS modules alone. Node.js's native ESM-importing-CJS interop has no concept of this marker — it *always* synthesizes a default export for any CJS module, transpiled or not. A package built with a bundler's interop assumptions in mind (default export reachable at `mod.default`) then differs from what Node itself does when a consumer's code is run directly by `node` instead of through the same bundler.

```ts
// dependency/index.js (CJS, sets __esModule flag)
exports.__esModule = true;
exports.default = function doSomething() {};

// consumer, transpiled by bundler: works
import doSomething from "dependency"; doSomething();

// consumer, run directly by Node: fails — Node synthesizes its own default,
// so the real function is one level deeper
doSomething(); // TypeError: doSomething is not a function
doSomething.default(); // this is what Node actually gives you
```

**Check**: `attw`'s `CJSOnlyExportsDefault`/`FalseExportDefault` codes catch this at publish time; manually, `node -e "require('pkg')"` vs `node --input-type=module -e "import('pkg')"` comparison.
**Category**: primary source.
Source: [TypeScript handbook — ESM/CJS interop appendix](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html)

#### 2.3 Unreliable named exports from CJS under ESM import

**Mechanism**: When an ESM file does `import { hello } from "./pkg.cjs"`, Node statically (syntactically) scans the CJS file *before* running it to figure out which named exports to synthesize — it recognizes only a small set of literal patterns (`exports.x = …`, `module.exports.x = …`, `Object.defineProperty(exports, "x", …)`). Anything computed (`exports["a" + "b"] = …`, exports assigned in a loop, re-exported via a function call) is invisible to that static scan and silently missing from the named-export list, even though the same import works fine when transpiled instead of run natively.

```js
// named-exports.cjs
exports.hello = "world";
exports["worl" + "d"] = "hello"; // computed — invisible to Node's static scan

// consumer.mjs
import { hello, world } from "./named-exports.cjs";
// `hello` works; `world` is undefined (or a SyntaxError under strict named-import binding)
```

**Check**: `attw`'s `NamedExports` code; avoid computed CJS export assignment in anything published for ESM named-import consumption.
**Category**: primary source.
Source: [TypeScript handbook — ESM/CJS interop appendix](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html)

#### 2.4 `.js` extension omission under `NodeNext`/`node16` resolution

**Mechanism**: Node's native ESM resolver does not do extension inference — a relative import must include the literal extension of the file that will exist at runtime. TypeScript's `NodeNext`/`node16` module resolution modes intentionally mirror this and *require* the `.js` extension on a relative import even though the source file on disk is `.ts` — because the extension refers to the emitted output, not the input. Code written and type-checked under `moduleResolution: "bundler"` (which does infer extensions, matching how Vite/esbuild/webpack behave) silently drops this requirement, so a project moved from a bundler resolution mode to `NodeNext` (e.g. porting shared code into the Bun GitHub Action, or into `grimoire-indexer`/`ocx-catalog`'s CLI) fails at runtime on every relative import missing its extension, even though `tsc` under the old config was clean.

```ts
// wrong under NodeNext/node16 — resolves fine under "bundler", fails at runtime under Node ESM
import { helper } from "./helper";

// right
import { helper } from "./helper.js"; // refers to the emitted .js, not the .ts source
```

**Check**: compiler error under `"moduleResolution": "NodeNext"` (`Relative import paths need explicit file extensions...`); `@typescript-eslint/no-restricted-imports` can't detect this directly, but `tsc --noEmit` under the target resolution mode is the authoritative check — run it, don't just trust `moduleResolution: bundler` dev-time green.
**Category**: primary source.
Source: [TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html), [Node.js ESM docs referenced from attw](https://arethetypeswrong.github.io/)

#### 2.5 `verbatimModuleSyntax` closes the type-only-import-elision ambiguity

**Mechanism**: By default, `tsc` decides per-import whether to erase it from emitted JS based on whether anything imported is used only as a type — a decision that requires full type information and can differ between `tsc` and a single-file transpiler (esbuild, swc, Babel) that has no type information to make the same call with. This is precisely the same class of problem as §1.5 (`const enum`): a decision that needs whole-program knowledge, made in a toolchain that increasingly transpiles one file at a time. It also creates a silent side-effect hazard: `import "./setup"` for side effects is fine, but `import { Config } from "./setup"` where `Config` turns out to be type-only silently drops the import *and* any side effects that module had.

```ts
// ambiguous under default settings — is this import erased? depends on how `Car` is used
import { Car } from "./car";
export function drive(car: Car) {}

// verbatimModuleSyntax: explicit, no whole-program inference needed
import type { Car } from "./car"; // guaranteed erased
import { type Car, factory } from "./car"; // `Car` erased, `factory` kept
```

**Check**: `"verbatimModuleSyntax": true` in tsconfig — already load-bearing for the Bun GitHub Action per the fleet's frame; `@typescript-eslint/consistent-type-imports` enforces the explicit `type` modifier at lint time even before flipping the compiler flag fleet-wide.
**Category**: primary source.
Source: [TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)

#### 2.6 Dual-package hazard

**Mechanism**: A package published with both a CJS and an ESM build, resolved via `exports` conditions, can end up loaded *twice* — once via `require()` (CJS build) and once via `import` (ESM build) — inside a single process, if one dependency uses one form and another dependency (or the app itself) uses the other. Each build has its own module instance, so any module-level singleton state (a cache `Map`, a registry, a `class` used for `instanceof` checks) silently forks into two independent copies, and cross-comparisons (`instanceof`, referential equality, shared caches) fail unpredictably depending on load order.

**Check**: reading heuristic only — no static tool detects this because it depends on the whole dependency graph's resolution at runtime; `publint`'s exports-ordering rules reduce the odds by keeping resolution deterministic, but don't eliminate it. Avoid module-level mutable singleton state in anything dual-published.
**Category**: primary source (well-documented Node.js ecosystem hazard, referenced by attw's own design docs).
Source: [Node.js dual package hazard](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)

#### 2.7 `publint`'s exports-ordering and field rules

**Mechanism**: Node/bundlers resolve `exports` conditions in *declared order*, picking the first matching key — not the most specific one. A package that lists `"require"` before `"types"`, or `"default"` before a more specific condition, gets the wrong file for a chunk of its consumers even though every individual entry is individually correct. `publint` codifies the correct ordering as lint rules: `types` first (so `types` wins before a runtime condition consumes the match), `default` always last (true fallback semantics), and `module` before `require` (bundlers that respect `"module"` for tree-shaking should see it before the CJS fallback).

**Check**: `publint` run against the packed tarball in CI (already load-bearing for the fleet's published-library repos per the frame).
**Category**: primary source (tool's own rule set).
Source: [publint rules](https://publint.dev/rules)

### 3. Async defects

#### 3.1 `forEach(async …)` — the callback's promise is discarded

**Mechanism**: `Array.prototype.forEach` invokes its callback for each element and ignores the callback's return value entirely — it was designed before promises existed and has never been retrofitted to await anything. An `async` callback always returns a promise; `forEach` throws that promise away unused, so any rejection inside it becomes an unhandled rejection instead of a caught error, and any code *after* the `forEach` call runs before the async work has actually finished (the opposite of what the sequential-looking code implies).

```ts
// wrong — items processed with no ordering guarantee, errors unhandled, next line runs first
items.forEach(async (item) => { await save(item); });
console.log("done"); // fires before any save() has resolved

// right — sequential
for (const item of items) { await save(item); }

// right — concurrent, errors observed
await Promise.all(items.map((item) => save(item)));
```

**Check**: `@typescript-eslint/no-misused-promises` (with `checksVoidReturn`) flags an async function passed where a non-promise-returning callback is expected.
**Category**: primary source (typescript-eslint's own rule rationale).
Source: [typescript-eslint no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/)

#### 3.2 Floating promises generally

**Mechanism**: Any expression statement that evaluates to a promise, with no `await`, `.then`/`.catch`, `void`, or `return`, is a "floating" promise — created with nothing set up to observe its eventual rejection. If it rejects and nothing is attached, it becomes an unhandled rejection (process-crashing by default in Node ≥15, and cross-runtime-inconsistent — see §3.5).

```ts
// wrong
saveToDisk(data); // fire-and-forget by accident

// right — explicit intent either way
await saveToDisk(data);
void saveToDisk(data); // deliberately fire-and-forget, marked as such
```

**Check**: `@typescript-eslint/no-floating-promises` — this is the single most load-bearing type-aware lint rule for this defect family; it requires the type-checked ESLint config (parserOptions.project) to work at all.
**Category**: primary source.
Source: [typescript-eslint no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/)

#### 3.3 `Promise.all` fail-fast, sibling rejections still unhandled

**Mechanism**: `Promise.all` rejects as soon as *any* input promise rejects, and its own rejection is typically caught by the caller. But the other promises in the array keep running — if one of *them* also rejects later, and nothing besides the `Promise.all` wrapper was ever attached to it individually, that second rejection is unhandled at the process level regardless of whether the `Promise.all` call itself was caught.

```ts
// wrong — if b() rejects after a() already rejected, b()'s rejection is unhandled
try {
  await Promise.all([a(), b()]);
} catch (e) { /* only sees whichever rejected first */ }

// right when partial failure matters — observe every settlement
const results = await Promise.allSettled([a(), b()]);
```

**Check**: reading heuristic only — no lint distinguishes "fail-fast with unobserved siblings" from a legitimately all-or-nothing `Promise.all`; use `Promise.allSettled` whenever individual failures must be inspected rather than just failing the whole batch.
**Category**: primary source (MDN/spec-documented behavior), corroborated by practitioner write-ups.
Source: [typescript-eslint no-floating-promises examples](https://typescript-eslint.io/rules/no-floating-promises/)

#### 3.4 Unbounded concurrency from `Promise.all(arr.map(...))` over wire-sized input

**Mechanism**: `Promise.all(items.map(fn))` launches every call in `fn` *immediately and simultaneously* — there is no built-in concurrency cap. When `items` comes from an untrusted or unbounded source (a paginated API response, a directory listing, a user-supplied list), this can open thousands of concurrent connections/file handles at once, exhausting a connection pool, hitting a rate limit, or OOMing the process — the same code that works fine in a 5-item test fixture becomes a self-inflicted denial-of-service under real input.

**Check**: reading heuristic only; no lint rule counts array length statically. Code review: any `Promise.all(x.map(...))` where `x`'s length is not a fixed, small, code-controlled constant is a candidate for a concurrency limiter.
**Category**: reading heuristic only (widely corroborated practitioner pattern, not a tool-defined rule).

#### 3.5 Unhandled-rejection semantics differ across Node, Bun, and the browser

**Mechanism**: Node.js implements `unhandledRejection`/`rejectionHandled` as `EventEmitter` events on `process`; the browser and (per its own docs) other modern runtimes use the WHATWG `unhandledrejection`/`rejectionhandled` `Event`s on `globalThis` instead — a different API shape and a different default action. Bun tracks Node's `process.on('unhandledRejection', …)` surface (added after initially not supporting `process.on` at all) and defaults to terminating the process like Node — but ships test-runner integrations that specifically swallow rejections during test runs, which is a real behavioral divergence from a bare `bun run` execution of the same code. Code that relies on catching every unhandled rejection process-wide, tested only under `bun test`, can behave differently under plain `bun run` or under Node.

**Check**: reading heuristic only; if a global rejection handler is load-bearing (crash reporting, cleanup), verify its behavior under the actual runtime and invocation mode used in production, not just under the test runner.
**Category**: primary source (runtime issue trackers) + practitioner corroboration.
Source: [oven-sh/bun#429](https://github.com/oven-sh/bun/issues/429)

### 4. Numeric, temporal and text defects

#### 4.1 Bare-ISO-date strings parse as UTC; date-with-time strings parse as local

**Mechanism**: Per ECMA-262's Date Time String Format, a date-only string (`YYYY-MM-DD`) is interpreted as UTC midnight, while the same string with a time component and no explicit offset (`YYYY-MM-DDTHH:mm:ss`) is interpreted as *local* midnight. This is specified behavior, not a bug in any particular engine — but it means two strings that look like they describe "the same day" produce instants up to 24 hours apart depending purely on whether a time component is present and on the caller's timezone offset.

```ts
new Date("2026-01-01");          // UTC midnight — Dec 31 evening in US timezones
new Date("2026-01-01T00:00:00"); // local midnight — the date the caller actually meant
```

**Check**: reading heuristic only; grep for `new Date(` fed a bare `YYYY-MM-DD` string literal or variable of that shape. Prefer parsing with an explicit offset (`...T00:00:00Z` or a library) whenever the source string's timezone origin isn't controlled.
**Category**: primary source (spec-documented; cross-checked against current 2026 practitioner write-ups, not a stale pre-fix bug).
Source: [MDN Date reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

#### 4.2 `Array.prototype.sort()` with no comparator sorts lexicographically

**Mechanism**: Per spec, the default sort compares elements by first coercing them to strings and comparing UTF-16 code unit sequences. For an array of numbers this means `"80"` sorts before `"9"` because `'8' < '9'` as characters — numeric order is not the default and must be requested explicitly.

```ts
[80, 9].sort();               // [80, 9] — WRONG for numeric intent, "80" < "9" lexically
[80, 9].sort((a, b) => a - b); // [9, 80] — correct
```

**Check**: `@typescript-eslint/no-array-sort-mutation` doesn't catch this; ESLint core's `no-implicit-coercion` doesn't either — grep `\.sort\(\)` (no-argument call) as a coarse sweep, or eslint's own core rule set has no direct equivalent; treat as a reading heuristic for review, and prefer a lint that flags a bare `.sort()` call on anything not already known to be `string[]`.
**Category**: primary source.
Source: [MDN Array.prototype.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)

#### 4.3 `toLocaleString()`/`localeCompare()` without an explicit locale is machine-dependent

**Mechanism**: When called with no locale argument, both methods fall back to a runtime-determined default locale — derived from the OS region settings, the `LANG`/`ICU` environment, or (in Node) how ICU was built into the binary. The exact same code produces differently formatted numbers/dates, or differently ordered sort results, on a developer's laptop versus a CI runner versus a Docker image with a minimal locale set — a nondeterminism that is invisible in local testing and only surfaces as a flaky snapshot test or an inconsistent user-facing string in production.

```ts
(1234.5).toLocaleString();       // "1,234.5" or "1.234,5" or other, depending on runtime locale
"a".localeCompare("b");          // sort order can vary by runtime locale defaults

// right — deterministic regardless of host locale
(1234.5).toLocaleString("en-US");
"a".localeCompare("b", "en-US");
```

**Check**: reading heuristic only; grep for `.toLocaleString(` / `.localeCompare(` with no arguments as a coarse sweep.
**Category**: primary source (browser/runtime bug trackers documenting the environment-dependence directly).
Source: [Mozilla bug 769871 — toLocaleString/localeCompare per ECMA-402](https://bugzilla.mozilla.org/show_bug.cgi?id=769871)

#### 4.4 `.length` counts UTF-16 code units, not user-perceived characters

**Mechanism**: JS strings are sequences of UTF-16 code units. Any codepoint above U+FFFF (most emoji, many CJK extension characters) is stored as a surrogate *pair* — two code units for one codepoint — and `.length` counts units, not codepoints. Beyond that, what a user perceives as "one character" (a grapheme cluster) can span *multiple* codepoints entirely: a flag emoji is two regional-indicator codepoints, a skin-tone-modified emoji is two codepoints, a family emoji with zero-width joiners can be five. Naive indexing or slicing (`str.slice(0, 10)`, `str[i]`) can land in the middle of a surrogate pair or a joined cluster, producing a corrupted, unpaired surrogate that breaks downstream rendering or storage.

**Check**: reading heuristic only; `Array.from(str).length` (iterates by codepoint via the string iterator) fixes the surrogate-pair case but not the grapheme-cluster case — for true user-perceived-character correctness, `Intl.Segmenter` (`granularity: "grapheme"`) is the standards-track fix, no external dependency needed.
**Category**: primary source (spec/MDN-documented, corroborated by 2026-era practitioner analysis).
Source: [MDN String.fromCodePoint](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint)

#### 4.5 `JSON.stringify`/`JSON.parse` round-trip losses

**Mechanism**: `JSON.stringify` silently drops object properties whose value is `undefined` or a function (they simply don't appear in the output), but converts the *same* values to `null` when they occur inside an array (arrays can't have gaps in JSON, and `null` is the closest representable value). `Map` and `Set` instances serialize to `{}` — `JSON.stringify(new Map([["a",1]]))` produces `"{}"` — with no error or warning, because neither type has an intrinsic `toJSON`. `BigInt` throws a `TypeError` on serialization unless a `toJSON` method is added to its prototype. Key order is preserved for string keys in insertion order, except integer-index-like string keys, which are always sorted numerically first regardless of insertion order.

```ts
JSON.stringify({ a: undefined, b: () => {} }); // '{}' — both silently dropped
JSON.stringify([undefined, () => {}]);          // '[null,null]' — same values, different rule inside arrays
JSON.stringify({ m: new Map([["a", 1]]) });      // '{"m":{}}' — no error, data just gone
JSON.stringify({ n: 10n });                      // throws TypeError: Do not know how to serialize a BigInt
```

**Check**: reading heuristic only; never use `JSON.parse(JSON.stringify(x))` as a deep-clone primitive for values that might contain `Map`/`Set`/`BigInt`/`undefined` — use `structuredClone` (handles `Map`/`Set`/`Date`/typed arrays correctly, still can't handle `BigInt` inside `postMessage`-restricted contexts, still drops functions) or a schema-aware serializer instead.
**Category**: primary source (MDN, spec-documented).
Source: [MDN JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)

### 5. Recurring code-review objections

#### 5.1 "This needs `esModuleInterop`/`verbatimModuleSyntax`, not a workaround" (TypeScript ecosystem-wide)

The volume of linked issues and the eventual creation of `verbatimModuleSyntax` specifically to end this class of dispute (superseding `importsNotUsedAsValues` and `preserveValueImports`, both explicitly deprecated by it) is itself the strongest evidence this was a chronic, unresolved review friction point across the ecosystem rather than a one-off. See §2.5.
Source: [TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)

#### 5.2 "Don't add `const enum`, it breaks under isolatedModules"

The single most consequential, most-cited maintainer objection found in this research pass — see §1.5's full citation. The maintainers' own tracker records this as long-running enough that deprecation was proposed and is still under discussion years later, specifically because of the tooling-incompatibility cost this generates in every codebase that adopts it.
Source: [microsoft/TypeScript#41641](https://github.com/microsoft/TypeScript/issues/41641)

#### 5.3 "Use structural comparison, don't add a class just for `instanceof`"

TypeScript's own Do's and Don'ts page and FAQ repeatedly steer contributors away from boxed types and nominal-typing workarounds — `String`/`Number`/`Boolean`/`Object` wrapper types over primitives, and unnecessary class hierarchies where a structural interface would do — because they defeat the type system's actual comparison semantics. See §1.1.
Source: [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### 6. VS Code extension defects

#### 6.1 `*` activation event forces every extension to pay every user's startup cost

**Mechanism**: The `*` activation event activates an extension unconditionally as soon as VS Code starts, before the user has done anything that would need it. VS Code's own extension guidelines call this out explicitly as the thing to avoid, in favor of listing the precise activation events (`onLanguage:typescript`, `onCommand:...`, or `onStartupFinished` for genuinely startup-needed work that can tolerate being deferred until *after* the window is already responsive) that scope activation to only the users who need it, when they need it.

**Check**: `grep '"\*"' package.json` under the `activationEvents` array (note: modern `engines.vscode` ≥1.75 auto-generates most activation events from `contributes`, so an explicit `"*"` today is almost always a deliberate, reviewable choice rather than an accident).
**Category**: primary source, direct guideline quote.
Source: [VS Code activation events reference](https://code.visualstudio.com/api/references/activation-events)

#### 6.2 Blocking, synchronous work in the extension host

**Mechanism**: All extensions in a window share a single extension host process (unless explicitly running in a separate/worker extension host). Synchronous, CPU-heavy work in any one extension's activation or command handler blocks every other extension and UI-affecting request routed through that host, degrading the whole editor's responsiveness — not just the offending extension's own features. VS Code's own docs frame the constraint directly: the host exists specifically so that "misbehaving extensions should not impact the user experience," and lazy-loading via activation events is the primary mechanism for keeping any one extension's cost off the shared critical path.

**Check**: reading heuristic only; no static lint distinguishes "blocking" from "async" work across arbitrary VS Code API usage. Profile activation with the built-in `Developer: Show Running Extensions` view (shows per-extension activation time and background CPU) as the mechanical verification step in place of a lint.
**Category**: primary source.
Source: [VS Code extension host guide](https://code.visualstudio.com/api/advanced-topics/extension-host)

#### 6.3 Disposables never pushed to `context.subscriptions`

**Mechanism**: Every VS Code API registration that returns a `Disposable` (event listeners, registered commands, providers, watchers) must be disposed when the extension deactivates, or the registration leaks — continuing to fire, hold references, and consume memory for the lifetime of the window even after the extension logically "shuts down." Pushing the returned `Disposable` into `context.subscriptions` (an array VS Code itself disposes of automatically on deactivation) is the idiomatic and only reliably complete way to avoid manually tracking and disposing everything in a custom `deactivate()`.

```ts
// wrong — nothing disposes this on deactivate; listener keeps firing after teardown
vscode.workspace.onDidChangeTextDocument(handler);

// right
context.subscriptions.push(
  vscode.workspace.onDidChangeTextDocument(handler)
);
```

**Check**: reading heuristic only; grep for `vscode.*\.on\w+\(` / `vscode.\w+.register\w+\(` calls whose return value isn't assigned or pushed anywhere.
**Category**: primary source (idiom documented throughout the official extension samples and guidelines).
Source: [VS Code extension guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

### 7. AI-agent-specific TypeScript defects

#### 7.1 Type errors are the dominant LLM-generated-code failure mode

**Mechanism**: Measured (not anecdotal) analysis of LLM-authored code found that the large majority of compilation failures in generated TypeScript are type errors the compiler already catches given the right settings — meaning the highest-leverage single intervention for an agent-editing-code fleet is not teaching more type-system trivia but guaranteeing `tsc --noEmit` (and a type-checked lint pass) actually runs, and its output is actually read, before an agent reports a task complete.

**Check**: This is the mechanical check for essentially the whole type-system category (§1) at once — `tsc --noEmit` in the loop, not deferred to CI.
**Category**: measured (cited industry analysis, not a single tool's problem code); treat the specific "94%" figure as directional, not a load-bearing statistic — re-verify before quoting it externally.
Source: [How Type Safety Catches Most LLM Code Errors](https://medium.com/@michaelhenderson/how-type-safety-catches-94-of-llm-code-errors-db63337a1478)

#### 7.2 `async` callback passed to `Array.prototype.map`/`forEach` as a specifically observed agent mistake

**Mechanism**: Same root cause as §3.1, but called out repeatedly and specifically as an LLM-authored-code pattern in its own right: an agent asked to "process a list" reaches for `.map(async item => …)`, which typechecks fine (the callback's declared return type is legitimately `Promise<T>[]`) but produces an array of pending promises where the surrounding code expected resolved values — a defect `tsc` alone does not catch, only a type-aware promise lint or a runtime observation does.

**Check**: `@typescript-eslint/no-misused-promises`, same as §3.1 — but worth noting this defect passes `tsc --noEmit` cleanly, so §7.1's "run the compiler" leverage does not cover it; the type-aware ESLint config is the specific gate that does.
**Category**: measured (practitioner catalogue built specifically from analyzed AI-generated mistakes).
Source: [AI coding mistakes ESLint plugin](https://dev.to/pertrai1/i-analyzed-500-ai-coding-mistakes-and-built-an-eslint-plugin-to-catch-them-jme)

#### 7.3 Confident hallucination on thinly-represented APIs, silent bypass of language guarantees, swallowed errors

**Mechanism**: Reported as three recurring, distinct failure patterns in agent-generated code specifically (not a general human-authored-code observation): agents produce plausible-looking calls to APIs they've seen little training data for and get the shape subtly wrong; agents route around a type error with an `as`/`any` escape hatch rather than fixing the underlying mismatch (directly compounding §1.1 and §1.7's `as`-misuse defect); and agents wrap risky operations in a `try`/`catch` that logs or ignores the error rather than propagating or handling it, producing code that "works" in the demonstrated case while hiding the actual failure mode from whoever relies on it next.

**Check**: reading heuristic only — none of these three are individually a fixed pattern a lint rule can target generically; §1.1/§1.7's mechanical checks (`no-explicit-any`, `no-unnecessary-type-assertion`) catch the "escape hatch" variant specifically.
**Category**: measured (practitioner analysis of agent-generated code specifically).
Source: [Three patterns where agent-generated code quietly fails](https://medium.com/@michael.hannecke/three-patterns-where-agent-generated-code-quietly-fails-1b9735493468)

## Candidate topics

| Topic | Defect it prevents | Source | Already-covered? | Priority | Detectable by |
|---|---|---|---|---|---|
| Narrow `any` at boundaries, forbid bare `any` params | `any` propagation erasing checking transitively | Effective TS, TS Do's/Don'ts | no | high | `@typescript-eslint/no-explicit-any` |
| Excess-property-check "freshness" awareness | Config objects routed through a variable dodging the literal check | TS FAQ | no | med | reading heuristic |
| `strictFunctionTypes` method bivariance | Unsound method-parameter substitution accepted by design | TS FAQ (maintainer quote) | no | med | `method-signature-style` (opt-in) |
| `readonly` erasure at boundaries | False confidence that a type-level readonly is a runtime guarantee | Effective TS | no | low | reading heuristic; `Object.freeze` for real enforcement |
| Ban `const enum` fleet-wide | Runtime crash / build break under isolatedModules (Vite/esbuild/Bun) | microsoft/TypeScript#41641 | no | high | `isolatedModules` compiler error; eslint restricted-syntax |
| Discourage numeric/string `enum`, prefer union-of-literal / `as const` | Reverse-mapping bloat, unsound bare-number assignability, JSON-shape mismatch | TS handbook, Effective TS | no | high | eslint restricted-syntax on `TSEnumDeclaration` |
| `satisfies` for validated-but-narrow literals; `as` only as last resort | Wrong tool picked among annotation/satisfies/as, silently widening or bypassing checks | TS 4.9 release notes | no | high | reading heuristic; `no-unnecessary-type-assertion` |
| Enable `noUncheckedIndexedAccess` fleet-wide | Index/key access typed as present when it may be `undefined` | TS 4.1 release notes | partial (on in 4/6 fleet repos per frame) | high | tsconfig flag |
| Don't hand-widen `Object.keys()` result via `as` | Reintroducing unsoundness TS maintainers deliberately avoided | microsoft/TypeScript#38520 | no | low | grep `as (keyof` near `Object.keys(` |
| `unbound-method` for detached class methods | Lost `this` binding when a method is passed as a bare callback | TS handbook, typescript-eslint | no | med | `@typescript-eslint/unbound-method` |
| Run `attw --pack` in publish CI | The 11-code ESM/CJS interop defect family | attw problem docs | no | high | `attw` CLI |
| Run `publint` in publish CI | `exports` map ordering, missing `types` condition, format mismatches | publint rules | no | high | `publint` CLI |
| `.js` extension on relative imports under NodeNext | Runtime `ERR_MODULE_NOT_FOUND` despite clean `tsc` under bundler resolution | TS 5.0 notes, attw | no | high | `tsc --noEmit` under target `moduleResolution` |
| `verbatimModuleSyntax` + `import type` discipline | Ambiguous type-only import elision, dropped side-effect imports | TS 5.0 release notes | partial (load-bearing in Bun Action per frame; not fleet-wide) | high | tsconfig flag + `consistent-type-imports` |
| Avoid module-level mutable singletons in dual-published packages | Dual-package hazard forking singleton state across ESM/CJS instances | Node.js docs | no | med | reading heuristic |
| No `forEach(async …)` | Floating, unawaited per-element promise; errors silently swallowed | typescript-eslint | no | high | `no-misused-promises` |
| No floating promises generally | Unhandled rejection, ignored errors, out-of-order execution | typescript-eslint | no | high | `no-floating-promises` (type-aware) |
| `Promise.allSettled` when partial failure must be observed | Sibling promise rejections unhandled after `Promise.all` fails fast | MDN/spec | no | med | reading heuristic |
| Concurrency cap on `Promise.all(arr.map(...))` over wire-sized arrays | Unbounded concurrent requests/handles from untrusted-length input | practitioner corroboration | no | med | reading heuristic |
| Verify unhandled-rejection handling under actual runtime, not just test runner | Node/Bun/browser default-action divergence | oven-sh/bun#429 | no | low | reading heuristic |
| Reject bare-ISO-date-string parsing without explicit offset | UTC-vs-local instant flip on `new Date(...)` | ECMA-262 / MDN | no | high | grep `new Date\(` on bare `YYYY-MM-DD` literals |
| Require comparator on `.sort()` for non-string arrays | Lexicographic sort silently wrong for numbers | MDN | no | high | grep bare `\.sort\(\)` |
| Explicit locale on `toLocaleString`/`localeCompare` | Machine-dependent formatting/ordering (dev vs CI vs container) | Mozilla bugzilla / ECMA-402 | no | med | grep no-arg calls |
| `Intl.Segmenter` for user-perceived string operations | Surrogate-pair/grapheme-cluster corruption on slice/length | MDN | no | low | reading heuristic |
| Ban `JSON.parse(JSON.stringify(x))` as deep-clone | Silent loss of `undefined`/functions, `Map`/`Set`→`{}`, `BigInt` throw | MDN | no | med | grep the exact pattern; prefer `structuredClone` |
| `*` activation event ban in VS Code extensions | Every user pays every extension's startup cost | VS Code activation events docs | no | high | grep `"*"` in `activationEvents` |
| No blocking synchronous work in extension activation/commands | Whole extension host (all extensions) degraded by one bad actor | VS Code extension host docs | no | med | reading heuristic; `Show Running Extensions` |
| Push every `Disposable` to `context.subscriptions` | Listener/registration leak surviving deactivation | VS Code extension guidelines | no | high | grep unassigned `vscode.*on\w+(`/`register\w+(` |
| `tsc --noEmit` (and type-aware lint) gated before "done" | Majority of LLM-generated TS failures are compiler-catchable type errors | measured industry analysis | no | high | CI/agent-loop gate, not a new rule |
| Type-aware promise lints specifically (beyond bare `tsc`) | `.map(async …)` passes `tsc` clean but is still wrong | practitioner AI-mistake catalogue | no | high | `no-misused-promises`, `no-floating-promises` |
| Flag `as`/`any` used to silence a type error rather than fix the mismatch | Silent bypass of the language guarantee that caught a real bug | practitioner AI-mistake catalogue | partial (covered generically by §1.1/1.7 rules) | med | `no-explicit-any`, `no-unnecessary-type-assertion` |
| Method-signature style enforced everywhere (interfaces use property syntax) | Opts every callback into strictFunctionTypes' contravariant check | typescript-eslint | no | low | `method-signature-style` |
| Freshness-check bypass awareness (assign-through-variable pattern) | Same object shape, different type-checking outcome depending on how it's routed | TS FAQ | no | low | reading heuristic |
| No hand-authored `.d.ts` claiming `export default` for a `module.exports =` CJS file | `FalseExportDefault`/`MissingExportEquals` mismatch | attw problem docs | no | med | `attw` |
| Buffer/text-encoding default awareness at Node I/O boundaries | Silent mis-decoding when encoding isn't explicit (adjacent to §4.4) | (not separately fetched this pass — flag for follow-up) | no | low | reading heuristic |
| `structuredClone` over ad hoc serialization for internal deep-copy | Avoids §4.5's round-trip losses entirely for supported types | MDN (same source as 4.5) | no | med | grep `JSON.parse(JSON.stringify(` |
| Dual-package hazard awareness documented in packaging rule, not just CI | Publish-time defect (§2.1-2.7) vs. consumption-time defect (§2.6) are different failure moments | Node.js docs | no | med | reading heuristic |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [arethetypeswrong.github.io](https://arethetypeswrong.github.io/) | `attw` tool's own site | current, 2026-live tool | Primary taxonomy for the richest defect vein (ESM/CJS interop) |
| [attw problem docs — CJSResolvesToESM](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/CJSResolvesToESM.md) | tool's own problem-code documentation | current | Direct, maintained source for all 11 problem codes |
| [publint.dev/rules](https://publint.dev/rules) | `publint` tool's own rule reference | current | Complements attw with package.json/exports-map-specific rules |
| [TypeScript FAQ (wiki)](https://github.com/microsoft/TypeScript/wiki/FAQ) | Maintainer-authored FAQ | maintained, canonical | Direct maintainer reasoning on structural typing, strictFunctionTypes bivariance |
| [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) | Official handbook page | canonical, stable across versions | Concrete wrong/right pairs the team itself endorses for declaration authoring |
| [TypeScript handbook — ESM/CJS interop appendix](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html) | Official handbook, module system | current (post-5.x module docs rewrite) | The single best primary explanation of `__esModule`, named-export unreliability, esModuleInterop |
| [TypeScript 4.1 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html) | Official release notes | 4.1 (2020), flag still relevant/off-by-default in 2026 | Canonical `noUncheckedIndexedAccess` rationale and example |
| [TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) | Official release notes | 5.0 (2023), directly load-bearing for this fleet's Bun Action | `verbatimModuleSyntax` rationale, explicit vs inferred import elision |
| [TypeScript 4.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) | Official release notes | 4.9 (2022) | `satisfies` operator's own stated rationale |
| [TypeScript handbook — More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) | Official handbook | canonical | `this` parameter declaration mechanism |
| [microsoft/TypeScript#41641 — Deprecate const enum](https://github.com/microsoft/TypeScript/issues/41641) | Maintainer/community issue thread | opened 2020, still open/cited in 2026 | Direct quotes on why const enum is an ecosystem-wide pain point |
| [microsoft/TypeScript#38520 — Object.keys unsoundness](https://github.com/microsoft/TypeScript/issues/38520) | Maintainer issue thread (Anders Hejlsberg comment) | ongoing | Direct maintainer reasoning for a deliberately "wrong-looking" type |
| [typescript-eslint no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) | Tool's own rule docs | current, actively maintained | Canonical floating-promise defect definition and examples |
| [typescript-eslint no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) | Tool's own rule docs | current | `forEach(async …)` canonical example, checksVoidReturn rationale |
| [VS Code activation events reference](https://code.visualstudio.com/api/references/activation-events) | Official extension API docs | current | Direct guidance against `*`, rationale for `onStartupFinished` |
| [VS Code extension host guide](https://code.visualstudio.com/api/advanced-topics/extension-host) | Official extension API docs | current | Shared-process rationale for why blocking work matters |
| [VS Code extension guidelines](https://code.visualstudio.com/api/references/extension-guidelines) | Official extension API docs | current | General correctness/performance guideline index, `Disposable` idiom |
| [MDN Array.prototype.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) | Spec-grounded reference | current | Exact wording of the default lexicographic sort behavior |
| [MDN JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) | Spec-grounded reference | current | Exact round-trip loss behavior for undefined/Map/Set/BigInt |
| [MDN String.fromCodePoint](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint) | Spec-grounded reference | current | Codepoint vs code-unit distinction underlying §4.4 |
| [Mozilla bug 769871](https://bugzilla.mozilla.org/show_bug.cgi?id=769871) | Engine bug tracker | long-running (2012–), corroborates current behavior | Direct evidence of environment-dependent locale defaults |
| [oven-sh/bun#429](https://github.com/oven-sh/bun/issues/429) | Runtime issue tracker | opened pre-1.0, resolved; historical + current behavior both relevant | Primary source for Bun's unhandled-rejection API surface evolving to match Node |
| [How Type Safety Catches Most LLM Code Errors](https://medium.com/@michaelhenderson/how-type-safety-catches-94-of-llm-code-errors-db63337a1478) | Practitioner analysis, cites measured data | 2026 | Best available evidence for §7.1's "compiler is the highest-leverage gate" claim |
| [AI coding mistakes → ESLint plugin](https://dev.to/pertrai1/i-analyzed-500-ai-coding-mistakes-and-built-an-eslint-plugin-to-catch-them-jme) | Practitioner analysis with a built artifact | 2026 | Catalogue built specifically from analyzed AI-generated-code mistakes, not general practice |
| [Three patterns where agent-generated code quietly fails](https://medium.com/@michael.hannecke/three-patterns-where-agent-generated-code-quietly-fails-1b9735493468) | Practitioner analysis | 2026 | Names the three recurring silent-failure shapes in agent-authored code specifically |
| [effectivetypescript.com](https://effectivetypescript.com/) | Book's official companion site, full item TOC | 2nd ed., updated for TS 5 | Canonical, widely-cited item numbering used throughout §1's citations |

---
title: Faking vscode.* and Other Untestable Host APIs
topic: ts-extension-host/faking-vscode
agent: research
model: sonnet
date_researched: 2026-08-29
sources_count: 14
scope: >
  Covers the `as unknown as T` double-cast escape hatch for faking objects
  from an API with no official partial-mock helper — `vscode.*` in the two
  extension repos (grimoire-vscode, vscode-ocx), `fetch`/`Response` in
  ocx-catalog, and `window`/Pinia internals in creeptd-ng/web. Does not cover
  the fleet's `as unknown as T` at test boundaries unrelated to faking a host
  object (none found), nor VS Code proposed-API testing, nor `@vscode/test-web`.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What a real Extension Development Host actually gives you](#1-what-a-real-extension-development-host-actually-gives-you)
   2. [The real/fake-required split, read from vscode.d.ts itself](#2-the-realfake-required-split-read-from-vscodedts-itself)
   3. [Why `as unknown as T` is mechanically required — not just a habit](#3-why-as-unknown-as-t-is-mechanically-required--not-just-a-habit)
   4. [Three candidate patterns, evaluated against the same interface](#4-three-candidate-patterns-evaluated-against-the-same-interface)
   5. [A fleet fake that is 90% of the way there — and why it still casts](#5-a-fleet-fake-that-is-90-of-the-way-there--and-why-it-still-casts)
   6. [A community mock library's own answer](#6-a-community-mock-librarys-own-answer)
   7. [Banning the pattern at lint time](#7-banning-the-pattern-at-lint-time)
   8. [The pattern's other homes: fetch/Response and window](#8-the-patterns-other-homes-fetchresponse-and-window)
   9. [A fourth category that looks like the same problem and isn't](#9-a-fourth-category-that-looks-like-the-same-problem-and-isnt)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The fleet's two extension repos already run tests inside a real Extension Development Host (`@vscode/test-cli` + `@vscode/test-electron`, confirmed by `grimoire-vscode/.vscode-test.mjs`) — the casts are not a symptom of missing test infrastructure, they persist *despite* it.
- `vscode.Uri`, `vscode.EventEmitter`, and `vscode.Disposable` are real exported `class`es with public constructors and no host dependency ([vscode.d.ts §1439, §1712, §1753](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts)) — every fake of these is unnecessary; the fleet already constructs them for real in non-test code (`vscode-ocx/src/project.ts:43`, `:145-146`).
- `WebviewView`, `WebviewPanel`, and `GlobalEnvironmentVariableCollection` are `interface`s with **no exported constructor** — the only way to get a real one is `vscode.window.createWebviewPanel(...)` (spawns a real editor tab) or a live `resolveWebviewView` callback ([vscode.d.ts §11142, §11347](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts)) — faking these is the genuine, structural case.
- Empirically verified (typescript 7.0.2, `--strict`): a deliberately partial fake **cannot** be cast to the real interface with a single `as T` — TypeScript raises TS2352 ("neither type sufficiently overlaps... convert the expression to `unknown` first") unless the fake happens to already implement every member. The double-cast is not a lint-dodge; it is the only syntax TypeScript accepts for this shape.
- The TypeScript Handbook itself documents the two-step cast as the sanctioned way past TS2352 ("you can use two assertions, first to `any` (or `unknown`)...") — [Handbook, Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html). The rule to write is not "ban `as unknown as`"; it is "require it to live in exactly one place per faked interface."
- Empirically verified: the naive `fake<T>(partial: Partial<T>): T` helper (the pattern most likely to look like "the fix") gives **zero** compile-time protection — `fake<Foo>({ a: 'x' })` against `interface Foo { a: string; b(): number; c: boolean }` compiles clean with `b`/`c` entirely absent, because the `as T` inside the generic function body is checked against the unconstrained type parameter, not the real shape.
- Empirically verified: `{ ... } satisfies Partial<T>` at the fake's *definition* site does catch a typo'd property name and a wrong value/return type on any member you do provide (excess-property + assignability checks fire normally) — but it does **not** flag a newly-added required member on `T` (Partial makes it optional) and does **not** flag a method whose real parameter list grew (TypeScript's bivariant method-parameter check accepts a fake with fewer params than the real signature).
- The one pattern with real, provable "breaks the build when the real interface changes" behavior is **implementing the full shape with no assertion at all** — return-type-annotated as the real type, zero `as`. It is only practical when the surface is small (`vscode.window`-sized, not `vscode.WebviewView`-plus-`Webview`-sized).
- `vscode-ocx`'s existing `FakeCollection` class ([environment.test.ts:263](../../../vscode-ocx/src/test/environment.test.ts)) is a named, colocated, single-cast-site fake — the right shape — but still needs `as unknown as` because it implements only 4 of `GlobalEnvironmentVariableCollection`'s 9 real members (`get`, `forEach`, `delete`, `getScoped`, `Symbol.iterator` are missing per [vscode.d.ts §12894-13010](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts)). Naming the fake does not remove the cast; it only bounds it to one place.
- `jest-mock-vscode` (actively maintained, last push 2026-08-28, v4.13.0) shows the mixed answer in production: its `window` mock is fully typed as `typeof vscode.window` with **zero** cast; its `debug` namespace mock is a partial stub cast `as unknown as VSCode['debug']` — and the *overall* mock's declared type is `Omit<VSCode, NotImplemented>`, an explicit, named, checkable list of what is and is not mocked ([vscode-mock.ts](https://github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode-mock.ts)).
- `microsoft/vscode`'s own `eslint.config.js` bans a specific cast shape (`as sinon.SinonStub`) in its test files via `no-restricted-syntax` with a `TSAsExpression` AST selector, recommending a typed alternative in the message ([eslint.config.js:2963](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/eslint.config.js#L2963)) — this is the exact enforcement mechanism to generalize, not the blunt `@typescript-eslint/consistent-type-assertions: { assertionStyle: 'never' }`, which bans *all* assertions including legitimate DOM narrowing.
- Neither `grimoire-vscode/eslint.config.mjs` nor `vscode-ocx/eslint.config.mjs` currently enables `no-restricted-syntax`, `consistent-type-assertions`, or `no-unnecessary-type-assertion` — both use `tseslint.configs.recommended` only (not `recommended-type-checked`), consistent with the wave-1 finding that type-aware linting runs in 1 of 9 repos.
- The pattern is not vscode-specific: `ocx-catalog` has the same "partial fake cast to a real lib type" shape 57 times, but the faked type is `typeof fetch`/`Response` (e.g. `test/theme/composables/usePackageRoot.test.ts:37`), not `vscode.*` — any rule written here must name the pattern generically (a partial object cast to a real ambient/library interface), not just `vscode.*`.
- `creeptd-ng/web`'s `as unknown as Record<string, unknown>` casts on `window` (`main.ts:32-35`, `wasm/init.ts:129`, `bridge/eventContract.ts:117`) are a *different* problem wearing the same syntax: extending a real, live `window` with a custom property TypeScript doesn't know about. The correct fix is `declare global { interface Window { ... } }` module augmentation, not a cast — conflating this with the interface-faking rule would misfire.
- `creeptd-ng/web/e2e/editor.spec.ts:108-121`'s `as any` on Pinia's private `_s` map is a third, distinct category: reaching into a real running instance's undocumented internal field inside a `page.evaluate()` string-boundary, where no public type exists to assert to at all. It already carries the fleet's own justification-comment convention (`// E2E context only`) — a faking rule should not fire on it.
- `vitest`'s `vi.stubGlobal(name, value: unknown)` ([vi.stubGlobal docs](https://vitest.dev/api/vi.html)) removes the cast *syntax* for the `ocx-catalog`/`creeptd-ng` global-replacement cases and adds auto-restore via `vi.unstubAllGlobals()`, but its own signature takes `value: unknown` — it is a runtime-ergonomics improvement, not a conformance check. It does not substitute for `satisfies Partial<T>` on the value being stubbed in.

## Findings

### 1. What a real Extension Development Host actually gives you

`grimoire-vscode` and `vscode-ocx` both already run integration tests through `@vscode/test-cli` (grimoire-vscode `^0.0.15`, vscode-ocx `^0.0.12`; current published version `0.0.15` as of this research) driving `@vscode/test-electron` (`^3.1.0` in both). The official guide is explicit about what this buys you: tests run "inside a special instance of VS Code named the Extension Development Host, and have full access to the VS Code API" — as opposed to unit tests that run without a VS Code instance at all ([Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)). `grimoire-vscode/.vscode-test.mjs` confirms this is wired up for real: it opens a real `workspaceFolder`, raises Mocha's timeout to 30s specifically because "every test here drives a real VS Code," and gates coverage on `dist/extension.js`.

This matters for the central question: the 79 `as unknown as` casts in `grimoire-vscode/src/test/` are **not** compensating for a missing test harness. They exist because specific vscode objects have no real, cheaply-constructible instance even inside a genuine Extension Development Host.

### 2. The real/fake-required split, read from vscode.d.ts itself

Pulled directly from the fleet's own pinned `@types/vscode: ^1.96.0` ([vscode.d.ts @ tag 1.96.0](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts), 20,037 lines, verified present in both this tag and current `main` as of 2026-08-25):

| Type | Kind | Public constructor? | Verdict |
|---|---|---|---|
| `vscode.Uri` | `export class` (line 1415) | Yes (`Uri.file`, `Uri.parse`, etc.) | Real — construct it |
| `vscode.EventEmitter<T>` | `export class` (line 1753) | Yes, pure JS, no host needed | Real — construct it |
| `vscode.Disposable` | `export class` (line 1712) | Yes | Real — construct it |
| `vscode.WebviewView` | `export interface` (line 9830) | **None** — only produced by a live `resolveWebviewView` callback | Fake required |
| `vscode.WebviewPanel` | via `interface Webview` + panel wrapper | **None** — only from `window.createWebviewPanel(...)`, which opens a real editor tab (line 11142) | Fake required |
| `vscode.GlobalEnvironmentVariableCollection` | `export interface` extending `EnvironmentVariableCollection extends Iterable<...>` (line 12542/12894) | **None** — only from `context.environmentVariableCollection` | Fake required |

The fleet already gets this right where it matters: `vscode-ocx/src/project.ts:43` does `new vscode.EventEmitter<void>()` for real, and `:145-146` does `vscode.Uri.file(...)` for real — no cast, no fake, in production code. `grimoire-vscode/src/test/installStateUnknown.test.ts:201,400,452` does the same with `vscode.Uri.file(os.tmpdir())` in tests. The 79 casts in `extension.test.ts` are concentrated on exactly the interface-only, factory-produced types: `WebviewPanel`, `WebviewView`, `OutputChannel`, and `vscode.window` itself narrowed to a single method (`{ showErrorMessage: unknown }`) to sidestep faking the whole namespace.

### 3. Why `as unknown as T` is mechanically required — not just a habit

Verified directly against the TypeScript compiler (`typescript@7.0.2`, `--strict --noEmit`) using a minimal analogue of `GlobalEnvironmentVariableCollection`:

```ts
class FakeCollection {
  persistent = true;
  description: string | undefined;
  prepend(key: string, value: string): void { /* ... */ }
  append(key: string, value: string): void { /* ... */ }
  replace(key: string, value: string): void { /* ... */ }
  clear(): void { /* ... */ }
}

const c1 = new FakeCollection() as GlobalEnvCollection;          // ✗ TS2352
const c2 = new FakeCollection() as unknown as GlobalEnvCollection; // ✓ compiles
```

`c1` fails with:

```
error TS2352: Conversion of type 'FakeCollection' to type 'GlobalEnvCollection' may be a
mistake because neither type sufficiently overlaps with the other. If this was intentional,
convert the expression to 'unknown' first.
  Type 'FakeCollection' is missing the following properties from type 'GlobalEnvCollection':
  getScoped, [Symbol.iterator], get, forEach, delete
```

This is not an idiosyncrasy of this one interface — it is documented, general TypeScript behavior: "TypeScript only allows type assertions which convert to a more specific or less specific version of a type... Sometimes this rule can be too conservative... you can use two assertions, first to `any` (or `unknown`...), then to the desired type" ([Handbook, Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)). **The double-cast is TypeScript's own sanctioned escape hatch for exactly this shape of fake — it is not inherently a defect.** The defect is letting it appear inline, unnamed, at every call site instead of once per fake.

### 4. Three candidate patterns, evaluated against the same interface

All three were run through `tsc --strict --noEmit` (typescript 7.0.2) against a `Webview`/`WebviewView`-shaped pair of interfaces.

**(a) Generic `fake<T>(partial: Partial<T>): T` helper — compiles clean, protects nothing:**

```ts
function fake<T>(partial: Partial<T>): T {
  return partial as T;
}

interface Foo { a: string; b(): number; c: boolean; }
const f = fake<Foo>({ a: 'x' });   // compiles — b and c are simply absent
f.b();                              // throws at runtime; nothing caught it
```

This is the pattern most likely to look like "the fix" and is the **weakest** of the three. The `as T` inside the generic body is checked against the unconstrained type parameter `T`, not the caller's actual `Foo` — TypeScript performs no completeness check on `partial` at the call site at all. It also gives every fake in a file the *same* type-erasure hole, whereas today's inline casts at least each carry the concrete interface name in the source, greppable one at a time.

**(b) `satisfies Partial<T>` at the definition site, cast once at the injection boundary — catches drift on what you wrote, not on what you omitted:**

```ts
const fakeWebview = {
  cspSource: 'vscode-resource:',
  html: '',
  asWebviewUri: (uri: string) => uri,
  postMessage: (message: unknown) => Promise.resolve(true),
} satisfies Partial<Webview>;
```

Verified: a typo'd key (`cspSuorce`) is caught (TS2561, "did you mean..."); a wrong return type on a provided member (`postMessage` returning `boolean` instead of `Promise<boolean>`) is caught (TS2322). Verified **not** caught: adding a new required member to the real `Webview` (`Partial` makes it optional, so its absence is silent), and widening a provided method's real parameter list (TypeScript's bivariant method-parameter compatibility accepts a fake implementation with fewer parameters than the real signature — this is general TS structural typing, not a `satisfies` gap specifically, and no assertion-style pattern escapes it).

**(c) Full-shape implementation, return-typed as the real type, zero assertion — the only pattern proven to break the build on a new required member:**

```ts
// Window = typeof vscode.window (jest-mock-vscode's own pattern, see §6)
export function createWindow(...): Window {
  const window: Window = { /* every member */ };
  return window;   // no `as` anywhere
}
```

If the real interface gains a required member, the object literal itself fails to satisfy `Window` at the point of construction — this is TypeScript checking a literal against a nominal target type, the strongest check available. The cost is that every member must be provided, which is why this is only practical for `vscode.window`-sized surfaces, not for `WebviewView` + nested `Webview`.

### 5. A fleet fake that is 90% of the way there — and why it still casts

`vscode-ocx/src/test/environment.test.ts:263-279`:

```ts
class FakeCollection {
  persistent = true;
  description: string | vscode.MarkdownString | undefined;
  readonly ops: Array<{ kind: string; key: string; value: string }> = [];
  prepend(key: string, value: string): void { this.ops.push({ kind: 'prepend', key, value }); }
  append(key: string, value: string): void { this.ops.push({ kind: 'append', key, value }); }
  replace(key: string, value: string): void { this.ops.push({ kind: 'replace', key, value }); }
  clear(): void { this.ops.length = 0; }
}
```

used as `new FakeCollection() as unknown as vscode.GlobalEnvironmentVariableCollection` at 4 call sites (`:307`, `:333`, `:348`, `:367`, `:402`). This is already the right shape — a named class, one declaration, reused across every test in the suite — and it is a strictly better artifact than an inline object literal repeated per test. It still needs the double cast because `GlobalEnvironmentVariableCollection extends EnvironmentVariableCollection extends Iterable<[string, EnvironmentVariableMutator]>` and additionally declares `getScoped` (§2 table above); `FakeCollection` implements 4 of the interface's 9 real members. **Naming and colocating the fake does not remove the cast — it only bounds where the cast is allowed to appear**, which is exactly what a rule here should require, not eliminate.

### 6. A community mock library's own answer

`jest-mock-vscode` ([repo](https://github.com/streetsidesoftware/jest-mock-vscode), [package](https://www.npmjs.com/package/jest-mock-vscode)) is a real, actively maintained answer to this exact problem — latest release `4.13.0`, last repository push `2026-08-28` (the day before this research), one day before this report's date. Its design:

- The overall mock's declared type is `export type VSCodeMock = Omit<VSCode, NotImplemented>` where `NotImplemented` is an explicit, hand-maintained union of ~90 member names the library does not mock (`'authentication' | 'BranchCoverage' | ... | 'UIKind'`) ([vscode-mock.ts](https://github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode-mock.ts)). This is a named, greppable, compiler-checked *coverage manifest* — anyone can see exactly what is and is not faked, and TypeScript enforces that the returned object actually matches `Omit<VSCode, NotImplemented>`.
- Where a namespace is fully implemented, the return is typed as the literal real type with **no cast**: `export function createWindow(...): Window` where `type Window = typeof vscode.window` ([window.ts](https://github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode/window.ts)).
- Where a namespace is deliberately partial, the library reaches for exactly the fleet's own pattern — `const debug: VSCode['debug'] = { onDidTerminateDebugSession: eventStub(...), startDebugging: tf.fn(), registerDebugAdapterDescriptorFactory: tf.fn() } as unknown as VSCode['debug']` ([vscode-mock.ts](https://github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode-mock.ts)) — one cast, at one declaration, for one namespace.

Real classes the library re-exports rather than re-implements: `Uri`, `Position`, `Range`, `Disposable`, `EventEmitter`, and about 60 other value exports are imported from its own `./vscode/*` reimplementations of VS Code's *extHostTypes* (pure-logic classes with no host dependency) — the same "construct the real thing" answer as §2, at library scale.

### 7. Banning the pattern at lint time

`@typescript-eslint/consistent-type-assertions` ([docs](https://typescript-eslint.io/rules/consistent-type-assertions/)) has an `assertionStyle: 'never'` option that disallows type assertions entirely — but it disallows *all* of them, `as const` aside, including a legitimate single-level `e.target as HTMLInputElement`. It is syntactic (no type information required, cheap to run in the 8/9 repos without type-aware linting) but too blunt for general application code; it is a plausible fit only for a narrowly-scoped `overrides` block over a directory that should never need any assertion at all.

`@typescript-eslint/no-unnecessary-type-assertion` ([docs](https://typescript-eslint.io/rules/no-unnecessary-type-assertion/)) catches only *redundant* assertions (`3 as number`) — it requires type information (part of `recommended-type-checked`, not `recommended`) and by construction cannot flag `as unknown as T`, because that assertion does change the apparent type.

The precise, working mechanism is `no-restricted-syntax` with a custom AST selector — and `microsoft/vscode`'s own `eslint.config.js` already does exactly this, scoped to test files:

```js
// microsoft/vscode/eslint.config.js, files: ['src/**/test/**/*.ts', ...]
{
  selector: 'TSAsExpression[typeAnnotation.type="TSTypeReference"]' +
            '[typeAnnotation.typeName.type="TSQualifiedName"]' +
            '[typeAnnotation.typeName.left.name="sinon"]' +
            '[typeAnnotation.typeName.right.name="SinonStub"]',
  message: "Avoid casting with 'as sinon.SinonStub'. Prefer typed stubs from " +
           "'sinon.stub(...)' or capture the stub in a typed variable."
}
```

([eslint.config.js, pinned to commit `cd429513`](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/eslint.config.js#L2963)). The AST shape for the fleet's `X as unknown as Y` is a `TSAsExpression` whose `expression` is itself a `TSAsExpression` with `typeAnnotation.type === 'TSUnknownKeyword'` — selectable with the child combinator as `TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]`. This specific double-assertion selector was not found already in use anywhere searched (see §Contested); the single-assertion form above is the verified precedent for the *mechanism* (AST-selector banning of one cast shape, in test files, with a message naming the typed alternative), not a verbatim rule to copy.

Neither `grimoire-vscode/eslint.config.mjs` nor `vscode-ocx/eslint.config.mjs` currently has any of these three rules — both are `tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, prettier, { rules: { curly, eqeqeq, 'no-throw-literal', '@typescript-eslint/naming-convention' } })`, i.e. the syntactic-only recommended set. Adding a scoped `no-restricted-syntax` rule costs nothing in either repo's current setup — no type-aware linting is required.

### 8. The pattern's other homes: fetch/Response and window

`ocx-catalog` has the identical structural problem at a different interface: `globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({...}) })) as unknown as typeof fetch` (`test/theme/composables/usePackageRoot.test.ts:37`, and 10 more sites in the same file; 57 across the repo). The mock `Response`-shaped object provides `ok`/`status`/`json` and omits `headers`, `redirected`, `type`, `url`, `clone()`, `text()`, `blob()`, `arrayBuffer()`, `body`, `bodyUsed` — the exact same "genuinely partial, cast to a real ambient lib type" shape as `WebviewView`, just against `lib.dom.d.ts`'s `Response` instead of `vscode.d.ts`. Any rule written from this research must not be spelled `vscode\.` in its detection grep, or it will miss the fleet's largest single instance of the pattern by count.

`vitest`'s `vi.stubGlobal(name: string | number | symbol, value: unknown): Vitest` ([vi.stubGlobal](https://vitest.dev/api/vi.html)) — available in both `ocx-catalog` (vitest `^3.2.4`) and `creeptd-ng/web` (vitest `^4.1.7`) — replaces the manual `globalThis.fetch = ...` assignment and adds `vi.unstubAllGlobals()` auto-restore. It does not add a conformance check of its own (`value: unknown` accepts anything); pairing it with a `satisfies Partial<typeof fetch>`-checked mock factory gets the ergonomics of `vi.stubGlobal` and the typo/drift protection of §4(b) together.

`creeptd-ng/web`'s three `as unknown as Record<string, unknown>` casts on `window` (`main.ts:32,35`; `wasm/init.ts:129`; `bridge/eventContract.ts:117,177`) are not faking an interface at all — they are attaching a genuinely new property (`__e2e_router__`, `__vue_app__`, `creeptd_bevy_command`) to the real, live `window` object, which TypeScript's `lib.dom.d.ts` `Window` type does not declare. TypeScript has a dedicated mechanism for this that requires no cast:

```ts
// Correct — module augmentation, checked at every use, no cast:
declare global {
  interface Window {
    creeptd_bevy_command?: (json: string) => void;
  }
}
window.creeptd_bevy_command = mod.creeptd_bevy_command;

// Current — works, but re-widens to Record<string, unknown> at every site,
// losing the function's real signature for every later reader:
(window as unknown as Record<string, unknown>)["creeptd_bevy_command"] = mod.creeptd_bevy_command;
```

This is a distinct rule from the object-faking rule (§Normative guidance R6) — conflating the two would either miss this case (grep for `as unknown as vscode\.` never matches `Record<string, unknown>`) or misfire the object-faking rule's remedy (there is no interface to `satisfies Partial<>` against; `Window` augmentation is the fix, not a named fake factory).

### 9. A fourth category that looks like the same problem and isn't

`creeptd-ng/web/e2e/editor.spec.ts:108-121`, inside a Playwright `page.evaluate(() => { ... })` callback (serialized and executed in the real browser, outside any Node-side type information):

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E context only
const pinia = app.config.globalProperties["$pinia"] as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editorStore = pinia._s.get("editor") as any;
```

`_s` is Pinia's undocumented internal store registry — there is no public type to assert to, faked or real. This is not a fake of an interface; it is untyped access to a real, live instance's private field, already carrying an explanatory `eslint-disable` comment matching the fleet's own established justification-comment convention. A rule targeting "partial fake cast to a real interface" should not match this shape (no `Partial<T>`-shaped object literal exists here to `satisfies`), and should not be written broadly enough to demand a named fake factory where there is nothing to fake.

## Normative guidance candidates

1. **Never cast a genuinely constructible vscode type.** If `vscode.d.ts` declares it `export class` with a public constructor or static factory usable outside a live window (`Uri`, `EventEmitter`, `Disposable`, `Position`, `Range`, `Selection`), construct it for real; do not fake it.
   *Rationale:* zero cost to do the real thing; a fake buys nothing and can drift from the real class's behavior.
   *Verify:* `grep -rn 'as unknown as vscode\.\(Uri\|EventEmitter\|Disposable\|Position\|Range\|Selection\)' --include='*.ts' src/` — every hit is a violation with no legitimate reading.

2. **A fake of a factory-only vscode/lib interface (`WebviewView`, `WebviewPanel`, `GlobalEnvironmentVariableCollection`, `TreeView`, `Response`, ...) must be a single named, colocated function or class, not an inline object literal at each call site.**
   *Rationale:* bounds the cast to one declaration per faked interface instead of N; §5 shows the fleet already does this correctly for `FakeCollection` — codify the existing convention rather than let new fakes regress to inline literals.
   *Verify:* for every `as unknown as <Interface>` hit, walk up to the enclosing declaration — it must be a `function fake<Name>(...)` or `class Fake<Name>`, never a bare `const x = { ... } as unknown as ...` inside a test body. Reading heuristic; count of named-fake declarations should equal count of distinct faked interfaces, and inline literal casts should trend to zero over time.

3. **Every fake object's literal is checked with `satisfies Partial<RealType>` before the `as unknown as RealType` cast, even though the two are not equivalent.** The cast stays required (§3, §4b); `satisfies` is the cheap, no-runtime-cost layer that still catches a typo'd member name or a changed return type on any member the fake does provide.
   *Rationale:* free protection against the failure mode `satisfies` *can* catch (drift on what's already faked), at zero cost, without pretending it solves the failure mode it can't (a newly-required member going unnoticed).
   *Verify:* reading heuristic — every named fake factory's returned literal has a `satisfies Partial<vscode.X>` (or `Partial<typeof RealThing>`) annotation immediately before its final `as unknown as X`.

4. **When the faked surface is small enough to implement in full (roughly ≤10 members, no nested un-mockable type), implement it in full and return the literal real type with zero assertion — do not reach for a cast "just in case."**
   *Rationale:* only this shape (§4c, `jest-mock-vscode`'s `createWindow`) makes the build fail when the real interface gains a required member; the other two patterns cannot.
   *Verify:* reading heuristic on new fakes — if a fake's declared return type is the literal target interface and it has no `as` anywhere in its body, it is at rung 4 (strongest); presence of `as unknown as` marks it as rung 2/3 by necessity, not by omission.

5. **Do not adopt a bare `fake<T>(partial: Partial<T>): T` generic helper.**
   *Rationale:* empirically demonstrated (§4a) to accept an arbitrarily incomplete fake with zero compile-time signal — strictly worse than today's per-interface inline casts, which at least name the concrete interface at each site.
   *Verify:* `grep -rn 'function fake<T>' --include='*.ts' src/` — if this generic signature exists anywhere, it is the wrong shape; replace call sites with named, interface-specific factories (R2).

6. **Add a scoped `no-restricted-syntax` rule banning `X as unknown as Y` (`TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]`) everywhere except inside a file/directory whose name matches the fleet's fake-factory convention** (e.g. `**/test/fixtures/fake*.ts`, or a function-name convention `fake[A-Z]`), mirroring `microsoft/vscode`'s own `TSAsExpression`-selector precedent for banning `as sinon.SinonStub` in its test files.
   *Rationale:* syntactic (no type-aware linting needed — matches both `grimoire-vscode` and `vscode-ocx`'s current `tseslint.configs.recommended`-only setup), and forces every double-cast through the one designated shape (R2) instead of appearing inline anywhere in a test file.
   *Verify:* `eslint --rule '{"no-restricted-syntax":["error", {"selector": "TSAsExpression > TSAsExpression[typeAnnotation.type=\"TSUnknownKeyword\"]", "message": "..."}]}'` on the target files; or simply run the added rule and confirm 0 findings outside the allowed fake-factory paths.

7. **Do not adopt `@typescript-eslint/consistent-type-assertions` with `assertionStyle: 'never'` fleet-wide.**
   *Rationale:* bans all assertions including legitimate single-level narrowing (`e.target as HTMLInputElement`); R6's targeted selector gets the double-cast specifically without this collateral damage.
   *Verify:* if this rule is ever proposed, check it is scoped with `overrides`/`files` to a directory with no legitimate narrowing need, never applied at the repo root.

8. **`window`/`globalThis` property extension is not this rule's problem — route it through `declare global { interface Window { ... } }` instead of `as unknown as Record<string, unknown>`.**
   *Rationale:* §8 — a cast re-widens every later read of the property to `unknown`/`Record`, discarding the real function/value type for every reader after the assignment; augmentation is checked at every use with no cast at all.
   *Verify:* `grep -rn 'as unknown as Record<string, unknown>' --include='*.ts' src/` on `window`/`globalThis` — every hit should instead have a `declare global { interface Window { ... } }` block in a `.d.ts` (or a co-located augmentation file) declaring the property.

9. **Do not extend the faking rule to undocumented-internal access (e.g. `pinia._s`) inside a serialization boundary like Playwright's `page.evaluate()`.**
   *Rationale:* §9 — there is no public type to `satisfies Partial<>` against; the existing justification-comment convention (`// E2E context only` + `eslint-disable-next-line`) is already the fleet's correct answer for this different problem, and a faking rule that fires here just teaches agents to silence it, not to fix anything.
   *Verify:* reading heuristic — an `as any`/`as unknown` inside a `page.evaluate(() => {...})` callback, on a value with no corresponding public type anywhere in the codebase's or the library's `.d.ts` files, is out of this rule's scope; check it carries a justification comment (existing convention) instead of demanding a fake.

## AI-agent angle

- **Reflexive `as unknown as vscode.X` on objects that are actually real, constructible classes.** An LLM trained on a large corpus of extension-test code that predates or ignores this distinction will fake `Uri`/`EventEmitter`/`Disposable` the same way it fakes `WebviewView`, because the syntax looks identical and the model has no reason to check `vscode.d.ts` for a public constructor. **Mechanical check:** R1's grep — any `as unknown as vscode.\(Uri\|EventEmitter\|Disposable\|...\)` hit is unconditionally wrong; there is no case where the real constructor is unavailable.
- **Reaching for the generic `fake<T>(partial: Partial<T>): T` helper as "the clean solution."** This is the single most likely AI failure mode this research surfaces: the pattern *reads* as the disciplined, DRY fix (one helper, reused everywhere, `Partial<T>` "looks like" a completeness contract) and it compiles without complaint on an incomplete fake — §4a demonstrated this concretely (`fake<Foo>({ a: 'x' })` compiles clean with two of three members entirely missing). An agent proposing this pattern should be treated as having produced the *weakest* of the three candidates, not the strongest. **Mechanical check:** R5's grep for the generic signature; additionally, for any fake produced this way, `tsc --strict --noEmit` compiling clean is *not* evidence of correctness — only a runtime assertion in the calling test that every faked member was actually exercised is.
- **Believing `satisfies Partial<T>` alone makes a fake "safe against API drift."** An agent that reads the TS 4.9 release notes' pitch for `satisfies` (catching typos while preserving inference) may over-generalize it to "and therefore this fake will fail to compile when the real interface changes." §4b's empirical test disproves the newly-required-member case directly. **Mechanical check:** do not accept "I added `satisfies Partial<T>`" as a substitute for R4 (full-shape, zero-cast) when the surface is small enough to implement in full; `satisfies Partial<T>` is a floor, not a ceiling.
- **Hallucinated or outdated `vscode.*` constructors.** A model may write `new vscode.WebviewView(...)` or `new vscode.OutputChannel(...)` — neither has ever had a public constructor in any version this research checked (1.96.0 through current `main`, 2026-08-25). **Mechanical check:** `grep -rn 'new vscode\.\(WebviewView\|WebviewPanel\|OutputChannel\|GlobalEnvironmentVariableCollection\|TreeView\)' --include='*.ts' src/` — any hit is either a hallucinated API (won't compile, self-correcting) or, if it somehow compiles against a future API surface, worth a second look regardless.
- **Casting a mock `Response`/`fetch` and calling it "the vscode pattern is different."** §8 showed this is the fleet's actual highest-count instance of the exact same structural problem. An agent that scopes a new lint rule or convention to literally `vscode\.` in its detection grep will miss `ocx-catalog`'s 57 sites entirely. **Mechanical check:** any rule/grep written from this research must be interface-agnostic in its pattern (`as unknown as [A-Z]`-shaped target), not string-literal-scoped to `vscode`.

## Contested / evolving

- **The double-assertion `no-restricted-syntax` selector (R6) is a synthesized, not a found-in-the-wild, rule.** `microsoft/vscode`'s own `eslint.config.js` was confirmed (§7) to ban one *specific* cast shape (`as sinon.SinonStub`) with this mechanism, in test files, but a GitHub code search across `microsoft/vscode`, `microsoft/playwright`, and unauthenticated search of `typescript-eslint/typescript-eslint`'s own AST-spec source did not surface a published example of the more general `TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]` selector specifically banning double-assertion-through-`unknown` anywhere. The AST shape and the `no-restricted-syntax` mechanism are both independently verified (vscode.d.ts / typescript-eslint's own docs); the *composition* of the two into this exact selector is this report's construction, not a citation. Treat R6 as "should work, verify by running it against the fleet before trusting it in CI," not as "known-good, copy verbatim."
- **Whether `satisfies`-checked partial mocks are becoming the community default for host-API faking, or whether hand-written interface reimplementation (`jest-mock-vscode`'s approach) remains preferred, could not be established as of 2026-08-29** — this research's web-search budget was exhausted mid-session (session-wide cap reached before this topic's searches ran), so only primary-source pages reachable by direct URL/API fetch (official docs, npm/GitHub registries, and this report's own empirical `tsc` runs) were used; broader community-sentiment sources (blog posts, conference talks, Twitter/X discussion) that a full search pass would normally surface are absent here. What *is* established: `jest-mock-vscode` itself does not use `satisfies` anywhere in the sampled `vscode-mock.ts`/`window.ts` — it relies on typed return values and per-namespace `as unknown as` for partial namespaces, predating or simply not adopting the `satisfies`-at-definition layer this report recommends adding (R3). That combination (jest-mock-vscode's typed-return-or-cast structure, plus a `satisfies Partial<T>` layer under each cast) is this report's synthesis, not observed as a single existing convention anywhere sampled.
- **TypeScript 7.0's lack of a stable programmatic API until 7.1** (established by wave 1) means `typescript-eslint`'s type-aware rules cannot run against a TS-7-targeted project yet; every finding above that depends on `tsc`/type-aware linting was verified on TS 6.0.3-class (fleet's actual pinned versions) and 7.0.2 (latest) syntax-checking (`--noEmit`, no `--build`/language-service dependency), which does not require the missing programmatic API. This should still hold once 7.1 ships the API and type-aware linting becomes available fleet-wide; nothing here assumes otherwise, but it was not re-verified against 7.1 because 7.1 was not out as of 2026-08-29 and could not be checked.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [code.visualstudio.com/api/working-with-extensions/testing-extension](https://code.visualstudio.com/api/working-with-extensions/testing-extension) | Official VS Code docs, extension testing guide | Fetched 2026-08-29 | Primary source for "@vscode/test-cli + @vscode/test-electron give a real Extension Development Host"; the setup instructions match the fleet's own `@vscode/test-cli`/`@vscode/test-electron` config exactly |
| [github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts) | Official VS Code extension API type declarations, pinned to the fleet's own `@types/vscode` version | Tag 1.96.0 | Primary source for the real-vs-fake-required split (§2) — read directly, not summarized: confirms `Uri`/`EventEmitter`/`Disposable` are constructible classes and `WebviewView`/`GlobalEnvironmentVariableCollection` are constructor-less interfaces |
| [registry.npmjs.org/@vscode/test-cli](https://www.npmjs.com/package/@vscode/test-cli) | npm registry, official VS Code test CLI package | Latest `0.0.15`, checked 2026-08-29 | Confirms current version against fleet's pinned `^0.0.15`/`^0.0.12` |
| [registry.npmjs.org/@vscode/test-electron](https://www.npmjs.com/package/@vscode/test-electron) | npm registry, official VS Code Electron test runner package | Latest `3.1.0`, checked 2026-08-29 | Confirms current version against fleet's pinned `^3.1.0`/`3.1.0` |
| [github.com/streetsidesoftware/jest-mock-vscode](https://github.com/streetsidesoftware/jest-mock-vscode) | Community `vscode` mock library for Jest, actively maintained | Last push 2026-08-28, v4.13.0 | The most complete real-world precedent found for "what does a maintained vscode mock actually do" — read its source, not just its README |
| [github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode-mock.ts](https://github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode-mock.ts) | Source: the library's top-level mock assembly | main branch, 2026-08 | Shows the `Omit<VSCode, NotImplemented>` coverage-manifest type and the per-namespace `as unknown as VSCode['debug']` partial-cast pattern (§6) |
| [github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode/window.ts](https://github.com/streetsidesoftware/jest-mock-vscode/blob/main/src/vscode/window.ts) | Source: the library's `vscode.window` mock | main branch, 2026-08 | Shows the zero-cast, full-shape pattern (§4c) — `createWindow(...): Window` with `type Window = typeof vscode.window` |
| [typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) | Official TypeScript release notes, `satisfies` operator introduction | TS 4.9, still current guidance | Origin and rationale of `satisfies`; the fleet's TS versions (^5.7 through ^6.0.3) all postdate this |
| [typescriptlang.org/docs/handbook/2/everyday-types.html](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) | Official TypeScript Handbook, "Type Assertions" section | Current as of 2026-08-29 | Documents TS2352 and the sanctioned two-step `unknown`-then-`T` cast in the compiler's own words — direct confirmation this is intended behavior, not a loophole |
| [typescript-eslint.io/rules/consistent-type-assertions](https://typescript-eslint.io/rules/consistent-type-assertions/) | Official typescript-eslint rule docs | Current as of 2026-08-29 | Establishes the `assertionStyle: 'never'` option and why it's too blunt for this use case (§7, R7) |
| [typescript-eslint.io/rules/no-unnecessary-type-assertion](https://typescript-eslint.io/rules/no-unnecessary-type-assertion/) | Official typescript-eslint rule docs | Current as of 2026-08-29 | Establishes this rule requires type information and structurally cannot catch `as unknown as T` (it only catches no-op assertions) |
| [github.com/microsoft/vscode/blob/cd429513.../eslint.config.js#L2963](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/eslint.config.js#L2963) | Source: microsoft/vscode's own ESLint flat config, test-file override | Pinned to commit `cd429513`, 2026-08-29 | Real, in-production precedent for the exact enforcement mechanism recommended in R6 — a `no-restricted-syntax` + `TSAsExpression` selector banning one specific cast shape in test files, with a message naming the typed alternative |
| [vitest.dev/api/vi.html](https://vitest.dev/api/vi.html) | Official Vitest API docs, `vi` mocking utilities | Current as of 2026-08-29 | `vi.stubGlobal`'s signature (`value: unknown`) — relevant to the `ocx-catalog`/`creeptd-ng` `fetch`/`window` cases in §8; confirms it is an ergonomics tool, not a conformance check |
| Local, empirical: `typescript@7.0.2 --strict --noEmit` runs against three hand-written test files | Compiler behavior verified directly in this session, not read from a page | Verified 2026-08-29 against TS 7.0.2 (current latest) | Grounds §3 (TS2352 on single-cast), §4a (`fake<T>` gives zero protection), and §4b (`satisfies Partial<T>` catches typos/return-type drift, not new-required-members or arity) in actual compiler output rather than recalled behavior |

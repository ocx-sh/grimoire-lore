---
title: Typed Test Doubles for the Mocha/Electron Extension Repos
topic: ts-extension-host/typed-doubles-non-vitest
agent: research
model: sonnet
date_researched: 2026-08-29
sources_count: 22
scope: >
  Settles how grimoire-vscode and vscode-ocx (Mocha under @vscode/test-cli +
  @vscode/test-electron, Electron host) should build typed test doubles,
  given every surveyed Vitest-coupled library (vitest-mock-extended,
  @golevelup/ts-vitest) is structurally unusable there. Measures the 46
  `as unknown as` casts in grimoire-vscode/src/test/extension.test.ts
  directly (file:line), evaluates sinon, ts-mockito, testdouble.js, and
  @golevelup/ts-sinon against that measurement, and prices a production-seam
  alternative. Does not re-litigate the double-cast mechanism itself (TS2352,
  satisfies-catches-typos-not-arity) — that is settled in
  ts-extension-host/faking-vscode.md and is not re-derived here.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Correcting the cast count: 46 in this file, not 79](#1-correcting-the-cast-count-46-in-this-file-not-79)
   2. [Four categories, not one problem](#2-four-categories-not-one-problem)
   3. [vscode.d.ts is genuinely readonly-heavy — and that is not what forces the cast](#3-vscodedts-is-genuinely-readonly-heavy--and-that-is-not-what-forces-the-cast)
   4. [DeepPartial vs Partial, proven against the fleet's actual shape](#4-deeppartial-vs-partial-proven-against-the-fleets-actual-shape)
   5. [The library survey](#5-the-library-survey)
   6. [@golevelup/ts-sinon's createMock, verified empirically](#6-golevelupts-sinons-createmock-verified-empirically)
   7. [Category A already has a zero-cast, zero-helper answer: sinon.stub()](#7-category-a-already-has-a-zero-cast-zero-helper-answer-sinonstub)
   8. [The fleet already reuses its own fakes — inconsistently](#8-the-fleet-already-reuses-its-own-fakes--inconsistently)
   9. [Pricing candidate (e): the production seam](#9-pricing-candidate-e-the-production-seam)
   10. [Does the same pattern serve the Vitest repos?](#10-does-the-same-pattern-serve-the-vitest-repos)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **The brief's "79 double-casts in extension.test.ts" is imprecise — measured directly, the file has 46.** 79 is `grimoire-vscode`'s test-suite-*wide* total (summed across 13 files under `src/test/`, verified `46 + rest = 79`); 79 + `vscode-ocx`'s 5 = 84, which does match the established two-repo figure. Cite the file-level number as 46, not 79.
- **The 46 casts split into four structurally different problems, not one.** 26 are monkeypatch-stub casts on real, live vscode singletons (`window`, `commands`, `authentication`) done purely to narrow the type enough to reassign a method; 16 are structural fakes of constructor-less vscode interfaces (`WebviewPanel`×12, `WebviewView`×1, `OutputChannel`×3); 3 fake the app's own `ScopeService` class (which has a real constructor — this is a behavioral choice, not a structural necessity); 1 (`DescribeResult`) is an unrelated internal-fixture-type cast that isn't faking a host object at all.
- **Category A (26 casts) needs no fake and no helper at all — `sinon.stub(vscode.window, 'showErrorMessage')` type-checks with zero assertion**, verified against `@types/sinon`'s own `stub<T, K extends keyof T>(obj: T, method: K)` overload, which imposes no readonly constraint. This replaces every `const window = vscode.window as unknown as { showErrorMessage: unknown }; ... finally { window.showErrorMessage = original }` block in the file.
- **Category B+C (19 casts) is answered by `@golevelup/ts-sinon`'s `createMock<T>()`** — a Proxy + `sinon.stub()` deep auto-mock whose return type `DeepMocked<T> = {...} & T` needs no assertion at the call site at all. Verified empirically (`tsc --strict`, TS 7.0.2) against a `WebviewPanel`/`Webview`-shaped pair modeled on the real `vscode.d.ts@1.96.0`: compiles clean with zero `as`, and catches a typo'd nested member name (TS2561) the same way `satisfies Partial<T>` does in the sister report — automatically, with no extra annotation.
- **DECISION: adopt `sinon` + `@types/sinon` + `@golevelup/ts-sinon` as devDependencies in both `grimoire-vscode` and `vscode-ocx`; do not write a repo-local `fake<T>` helper.** `createMock<T>()` already *is* that helper, maintained, and it is the one candidate that removes the cast from **both** fault categories the file actually contains, not just the structural-fake half.
- **This is not "the same npm package as the Vitest repos," but it is the same pattern.** `@golevelup/ts-sinon` (sinon-backed) and `@golevelup/ts-vitest` (`vi.fn()`-backed) are sibling packages from the same author/monorepo, published the same day (2026-03-18), with the same `createMock<T>()` / `DeepMocked<T>` API shape — teach one idiom fleet-wide, install the runner-matched package per repo.
- **`ts-mockito`'s GitHub repo last received a code push on 2023-02-12** — 3.5 years stale as of this research, 91 open issues, not formally archived but not a credible pick for new adoption.
- **`testdouble.js`'s GitHub repo last received a code push on 2024-03-21** — 2.4 years stale, 35 open issues; more recent than ts-mockito but still dormant, and this research could not establish its ESM/CJS module-replacement mechanics from primary docs (pages 404'd) — staleness alone is enough to drop it without resolving that separately.
- **`sinon` itself is not dormant: its GitHub repo was pushed 2026-08-05**, 3 weeks before this research, and it is a direct devDependency of **`microsoft/vscode`'s own root `package.json`** (`sinon: ^12.0.1`, `@types/sinon: ^10.0.2`, verified by reading the file) — the brief's framing ("sinon, which VS Code's own samples use") is close but not quite right: a GitHub code search of `microsoft/vscode-extension-samples` for "sinon" returns **zero** hits; the real precedent is VS Code core's own test suite, not the samples repo.
- **`vscode.d.ts`'s `WebviewPanel` interface is genuinely readonly-heavy: 8 of its 9 data/event members are `readonly`, only `title` is mutable** (verified by reading `vscode.d.ts@1.96.0` lines 9682-9772). This does **not** cause the double-cast, though — `readonly` only blocks *post-construction* mutation; every candidate here builds the fake as one literal at construction time, which readonly never blocks. What forces the cast is structural incompleteness (missing members), independent of readonly.
- **`Partial<WebviewPanel>` cannot express the fleet's actual fake shape — proven, not asserted.** `tsc --strict` rejects `{ webview: { postMessage: ... } }` typed as `Partial<WebviewPanel>` with TS2739 ("missing `html`, `cspSource`") because `Partial` only makes the *top-level* `webview` key optional; once provided, it must be the full `Webview` shape. `DeepPartial<T>` (equivalently, `@golevelup/ts-sinon`'s `PartialFuncReturn<T>`) is what the nested-partial shape structurally requires, confirmed against the exact nesting the fleet already writes.
- **A real, previously-unmeasured duplication problem: the file already has a reusable `fakePanel()` helper (used correctly 21 times), yet 11 of the file's 12 `WebviewPanel` casts are rogue inline duplicates of that exact literal** that never call it (`extension.test.ts:2827,2890,2946,3251,4893,5246,5292,5346,5885` and two more), and a `vscode.authentication`+`vscode.window` pair at `:3015-3016` duplicates what the file's own `stubVoteEnvironment()` helper (`:5683-5684`) already does. The fix for this half of the problem is partly "use the helper that already exists," independent of which library is adopted.
- **`createMock<T>()` has a real, verified runtime footgun distinct from the compile-time gap it shares with any partial-mock pattern: an *unfaked, non-function* member (e.g. `panel.title: string`) does not come back as `undefined` — it comes back as a callable `sinon.stub()` function disguised as the property.** Verified by running the compiled output: `panel.title` printed as `undefined` only because `JSON.stringify` silently drops functions; a `.toUpperCase()` or template-string read of that same property would misbehave, not throw cleanly. Mitigation: still explicitly set any plain-data member the code under test actually reads; only omit members the SUT never touches.
- **Extracting a production seam (candidate e) would touch 17 production files across at least 6 vscode namespaces** (`window`, `commands`, `Uri`, `env`, `authentication`, `workspace` — measured via `grep`) **and would still not eliminate Category B** (`WebviewPanel`/`WebviewView` are still real vscode objects the port must hand back), so it buys less than the library fix at roughly an order of magnitude more migration cost. Not recommended as the fix for this problem; it remains a legitimate, separate architecture investment.
- **Net migration: 46 casts in `extension.test.ts` → 1** (only the unrelated `DescribeResult` fixture cast survives, and it was never a host-faking cast). `vscode-ocx`'s 5 `GlobalEnvironmentVariableCollection` casts → 0 the same way (`createMock<vscode.GlobalEnvironmentVariableCollection>()` replaces `FakeCollection`). The other 33 casts spread across `grimoire-vscode`'s remaining 12 test files (`79 - 46`) were not individually re-characterized in this pass — apply the same two-category triage there, but don't assume the 46/79 split generalizes without checking.

## Findings

### 1. Correcting the cast count: 46 in this file, not 79

The brief states `extension.test.ts` "is 6,899 lines with 79 double-casts." Measured directly (`grep -o "as unknown as" src/test/extension.test.ts | wc -l`, cross-checked with a whitespace-normalized regex scan to rule out a multi-line split the line-based grep might miss): **46**, not 79. `wc -l` on the file itself does confirm 6,899 lines — that part of the brief is accurate; the cast count attached to it is not.

Where 79 actually comes from: summing `as unknown as` per file across all of `grimoire-vscode/src/test/*.ts` gives exactly 79 (46 in `extension.test.ts`, plus 33 spread across 12 other files — `installStateUnknown.test.ts` 10, `settingsHost.test.ts` 6, `updateBadgeSpec.test.ts` 5, `watchers.test.ts` 2, `checkCache.test.ts` 2, `settingsModel.test.ts` 2, `grim.test.ts` 2, and 1 each in four more). Add `vscode-ocx`'s 5 (all in `src/test/environment.test.ts`, already characterized in `ts-extension-host/faking-vscode.md` §5 as the `FakeCollection` pattern) and the total is 84 — an exact match for the wave-2-established "84 of the fleet's 164... live in grimoire-vscode and vscode-ocx" figure. **The 79 in the brief is the whole-repo total, misattributed to the single file it also describes by line count.** Everything below is scoped to the file actually named in the brief; the other 33 `grimoire-vscode` casts were not individually re-walked here (see Summary's last bullet).

### 2. Four categories, not one problem

Reading every one of the 46 sites (`grep -n "as unknown as" src/test/extension.test.ts`, then the enclosing function/test for each) resolves into four distinct shapes:

| Category | Count | Faked target(s) | Why it's cast |
|---|---:|---|---|
| **A — real-singleton monkeypatch** | 26 | `vscode.window` (23), `vscode.commands` (1), `vscode.authentication` (2) | Not faking an object at all — reassigning one or two methods on the real, live singleton (`window.showErrorMessage = async () => ...`), then restoring the original in a `finally`. The cast exists only to narrow `vscode.window`'s type down to `{ showErrorMessage: unknown }` so the reassignment type-checks. |
| **B — constructor-less vscode interface** | 16 | `vscode.WebviewPanel` (12), `vscode.WebviewView` (1), `vscode.OutputChannel` (3) | Genuinely no way to construct a real instance outside a live editor tab (see `faking-vscode.md` §2) — a structural fake is the only option. |
| **C — app's own class, faked for behavior, not structure** | 3 | `ScopeService` | `class ScopeService` (`src/scopes.ts:402`) has a real, public constructor used in production code — this is faked to avoid the real class's side effects (it shells out to `grim`), not because no constructor exists. |
| **D — unrelated fixture-type cast** | 1 | `DescribeResult` (`extension.test.ts:4061`) | The app's own internal describe-document type (`src/grim.ts:179`), not a vscode host object. Widens a test-fixture helper's return type; not in scope for a host-faking rule. |

Example of Category A, verbatim (`extension.test.ts:1614-1622`, one of many near-identical bodies):

```ts
const window = vscode.window as unknown as { showErrorMessage: unknown };
const original = window.showErrorMessage;
const calls: string[][] = [];
window.showErrorMessage = async (message: string, ...items: string[]) => {
  calls.push([message, ...items]);
  return undefined;
};
try {
  await offerModifiedRefusal(scopes, 'global', 'update', { message: '...' });
} finally {
  window.showErrorMessage = original;
}
```

This is not "a partial fake of `vscode.window`" — it never constructs a new object. It monkeypatches one method on the real one. That distinction is why Category A and Category B need different fixes (§6, §7).

### 3. vscode.d.ts is genuinely readonly-heavy — and that is not what forces the cast

Read directly from `vscode.d.ts@1.96.0` (the fleet's own pinned `@types/vscode` tag):

| Interface | Line | Data/event members | `readonly` | Mutable |
|---|---:|---:|---:|---:|
| `Webview` | [9549](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts#L9549) | 6 | 2 (`onDidReceiveMessage`, `cspSource`) | 4 |
| `WebviewPanel` | [9682](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts#L9682) | 9 | **8** | 1 (`title`) |
| `WebviewView` | [9830](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts#L9830) | 8 | 5 | 3 (`title?`, `description?`, `badge?`) |
| `OutputChannel` | [7024](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts#L7024) | 8 (mostly methods) | 1 (`name`) | 7 |

`WebviewPanel` is the extreme case: only `title` can be assigned after construction. **This is not why the fleet needs `as unknown as`, though.** `readonly` blocks *reassigning a property on an already-typed value* — it does not block constructing an object literal that happens to satisfy the readonly member, and every fake in this file (and every candidate evaluated below) builds its fake as one literal at construction time. The double-cast exists because the literal is *structurally incomplete* (missing members TypeScript's own excess/insufficient-overlap check flags — TS2352, see `faking-vscode.md` §3), which is orthogonal to readonly. Readonly does explain a related, non-cast fact: the fleet cannot build these fakes incrementally (`const p = {}; p.webview = ...`) even if it wanted to — every fake here is necessarily a single-shot literal, which is exactly what `createMock<T>()`'s single-call signature also assumes (§6).

### 4. DeepPartial vs Partial, proven against the fleet's actual shape

The fleet's `fakePanel()` (`extension.test.ts:336-361`) nests one level: it provides `webview: { postMessage: ... }`, omitting `webview.html`, `webview.cspSource`, `webview.onDidReceiveMessage`, `webview.asWebviewUri`. Verified directly (`tsc --strict`, TS 7.0.2) that `Partial<T>` cannot express this:

```ts
interface Webview { html: string; postMessage(message: unknown): Promise<boolean>; cspSource: string; }
interface WebviewPanel { title: string; readonly webview: Webview; }

const p1: Partial<WebviewPanel> = {
  webview: { postMessage: (m: unknown) => Promise.resolve(true) },
};
```

```
error TS2739: Type '{ postMessage: (m: unknown) => Promise<boolean>; }' is missing the
following properties from type 'Webview': html, cspSource
```

`Partial<T>` only makes the *top-level* key (`webview`) optional; once you provide it, TypeScript demands the *full* nested `Webview` shape. A `DeepPartial<T>` (recurses into nested object types) is what the fleet's actual, already-written fakes structurally require — not a stylistic preference, a compiler-enforced fact for every nested `WebviewPanel`/`WebviewView` fake in the file. `@golevelup/ts-sinon`'s `PartialFuncReturn<T>` (§5, §6) is exactly this, with an extra branch that preserves callability on function-typed members recursively.

### 5. The library survey

| Library | Latest (npm) | Repo last push | Peer/runtime deps | Runs under Mocha/Electron? | Verdict |
|---|---|---|---|---|---|
| [`sinon`](https://registry.npmjs.org/sinon) | 22.1.0 | [2026-08-05](https://api.github.com/repos/sinonjs/sinon) | none required beyond Node | Yes — pure prototype/property replacement, no loader hooks, no browser/runner coupling. Already a devDependency of [`microsoft/vscode` itself](https://raw.githubusercontent.com/microsoft/vscode/main/package.json) (`sinon: ^12.0.1`) | **Adopt** |
| [`@types/sinon`](https://registry.npmjs.org/@types/sinon) | 22.0.0 | DefinitelyTyped, rolling | — | `stub<T,K extends keyof T>(obj,method)` [overload](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/sinon/index.d.ts) has no readonly constraint | **Adopt** |
| [`ts-mockito`](https://registry.npmjs.org/ts-mockito) | 2.6.1 | [2023-02-12](https://api.github.com/repos/NagRock/ts-mockito) | none | Framework-agnostic mechanically; `mock<T>()` on a bare interface works via a Proxy per its own [README](https://raw.githubusercontent.com/NagRock/ts-mockito/master/README.md) | **Reject — stale.** 91 open issues, no code push in 3.5 years. |
| [`testdouble`](https://registry.npmjs.org/testdouble) | 3.20.2 | [2024-03-21](https://api.github.com/repos/testdouble/testdouble.js) | none | Could not establish its ESM/CJS module-replacement mechanics from primary docs as of 2026-08-29 (its docs subpages returned 404 during this research) | **Reject — dormant.** 35 open issues, no code push in 2.4 years; staleness alone disqualifies it without resolving the mechanism question. |
| [`@golevelup/ts-sinon`](https://registry.npmjs.org/@golevelup/ts-sinon) | 2.0.0 | monorepo pushed [2026-08-26](https://api.github.com/repos/golevelup/nestjs) (2,740★) | peer `sinon@^21.x` only — zero runtime deps (verified [package.json](https://unpkg.com/@golevelup/ts-sinon@2.0.0/package.json)) | Yes — pure Proxy + `sinon.stub()`, no NestJS runtime coupling despite NestJS-flavored docs | **Adopt — the answer for Category B/C** |
| [`@golevelup/ts-vitest`](https://registry.npmjs.org/@golevelup/ts-vitest) | 4.0.0 | same monorepo, same day | — | Vitest-only (`vi.fn()`-backed) | Sibling for the Vitest repos, not usable here — see §10 |
| `vitest-mock-extended` | (established by prior wave for the Vitest repos) | — | requires `vi` global | **No** — Vitest-coupled, confirmed unusable under Mocha per the brief's own framing | Out of scope here |

`ts-mockito`'s interface-mocking syntax (`mock<FooInterface>()` with the interface as a *generic parameter*, not a constructor argument — verified from its README) is mechanically the right idea for a no-runtime-class interface like `WebviewPanel`; the project is simply not a credible dependency to add in 2026 with a 3.5-year-stale codebase and 91 open issues against it. `testdouble.js`'s core pitch (replace a real dependency, verify calls against real signatures) would also fit Category A, but the same staleness argument applies, and this research could not independently confirm — from primary sources — how its module-replacement mechanism behaves against a virtual, non-file-backed module like `vscode` inside an Electron extension host; that question was not resolved because it did not need to be.

### 6. @golevelup/ts-sinon's createMock, verified empirically

Read directly from the published package ([`lib/mocks.d.ts`](https://unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.d.ts)):

```ts
import { SinonStub } from 'sinon';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
    : unknown extends T[P] ? T[P]
    : DeepPartial<T[P]>;
};

export type PartialFuncReturn<T> = {
  [K in keyof T]?: T[K] extends (...args: infer A) => infer U
    ? (...args: A) => PartialFuncReturn<U>
    : DeepPartial<T[K]>;
};

export type DeepMocked<T> = {
  [Key in keyof T]: T[Key] extends (...args: infer A) => infer U
    ? SinonStub & ((...args: A) => DeepMocked<U>)
    : T[Key];
} & T;

export declare const createMock: <T>(partialObject?: PartialFuncReturn<T>, options?: MockCreationOptions) => DeepMocked<T>;
```

`DeepMocked<T>` intersects with `T` itself — the return value is typed as a **complete** `T`, so no `as unknown as T` is ever needed at the call site. Verified by compiling a `WebviewPanel`/`Webview`-shaped pair modeled on the real `vscode.d.ts` (readonly members included, `sinon@21`, `typescript@7.0.2`, `--strict`, `--module node16 --moduleResolution node16`):

```ts
import { createMock } from '@golevelup/ts-sinon';

interface Webview {
  readonly options: { enableScripts?: boolean };
  html: string;
  readonly onDidReceiveMessage: (listener: (e: unknown) => void) => { dispose(): void };
  postMessage(message: unknown): Promise<boolean>;
  asWebviewUri(uri: string): string;
  readonly cspSource: string;
}
interface WebviewPanel {
  readonly viewType: string;
  title: string;
  readonly webview: Webview;
  readonly active: boolean;
  readonly onDidDispose: (listener: () => void) => { dispose(): void };
  reveal(): void;
  dispose(): void;
}

const posts: unknown[] = [];
const panel = createMock<WebviewPanel>({
  webview: {
    postMessage: (message: unknown) => { posts.push(message); return Promise.resolve(true); },
  },
});
```

`tsc --strict` on this: **exit 0, zero `as` anywhere.** A typo'd nested key (`postMesage`) is caught automatically — no `satisfies` annotation needed:

```
error TS2561: Object literal may only specify known properties, but 'postMesage' does not
exist in type 'DeepPartial<Webview>'. Did you mean to write 'postMessage'?
```

Running the compiled output surfaces a genuine runtime caveat, read directly from [`lib/mocks.js`](https://unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.js)'s Proxy `get` handler: any accessed member not provided in the partial — **function or not** — is auto-vivified rather than left `undefined` or throwing. `panel.dispose()` (an unfaked method) returns `{}` (a nested mock proxy, not a thrown error); `panel.title` (an unfaked **plain string** member) is not `undefined` at all — it is a `sinon.stub()` **function** masquerading as the property (it printed as `undefined` under `JSON.stringify` only because `JSON.stringify` silently drops functions). Code that reads `panel.title.toUpperCase()` or interpolates `` `${panel.title}` `` expecting a string will misbehave, not fail loudly. **Mitigation, stated as a rule in §Normative:** still explicitly provide any plain-data member the code under test actually reads; only genuinely-unused members are safe to omit.

### 7. Category A already has a zero-cast, zero-helper answer: sinon.stub()

`@types/sinon`'s own overload (`stub<T, K extends keyof T>(obj: T, method: K)`) type-checks against `vscode.window` with **no cast of any kind** — `vscode.window` is a namespace-exported value; its members are ordinary (non-`const`) exports, so nothing about the type blocks `sinon.stub(vscode.window, 'showErrorMessage')`. This is a strictly better fit for Category A than `createMock<T>()`: Category A never wanted a *substitute* `window` object — it wants to replace one or two methods on the **real, live** singleton and get them back afterward, which is exactly [`sinon.stub`](https://sinonjs.org/concepts/stubs)'s and `.restore()`'s job (or [`sinon.replace`](https://sinonjs.org/concepts/fakes) + `sinon.fake` for the same effect). Pairing it with [`sinon.createSandbox()`](https://sinonjs.org/concepts/sandboxes) collapses every one of the file's hand-rolled `try { ... } finally { window.showErrorMessage = original }` blocks into one `afterEach(() => sandbox.restore())` for the whole suite:

```ts
// Before (extension.test.ts:1614-1622, one of ~18 near-duplicates):
const window = vscode.window as unknown as { showErrorMessage: unknown };
const original = window.showErrorMessage;
window.showErrorMessage = async (message: string) => { /* ... */ return undefined; };
try { /* test body */ } finally { window.showErrorMessage = original; }

// After — zero cast, restore handled once for the whole file:
const sandbox = sinon.createSandbox();
afterEach(() => sandbox.restore());
// ...
const errorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
/* test body */
assert.ok(errorStub.calledWith('demo is locally modified; rerun with --force'));
```

### 8. The fleet already reuses its own fakes — inconsistently

`fakePanel()` (`extension.test.ts:336-361`) is a real, working, single-cast helper, and it is used correctly — 21 call sites reuse it (`grep -n "fakePanel()"` confirms: `:3031, 3833, 3914, 4021, 4080, ...` through `:5131`). But `grep -n "as unknown as vscode.WebviewPanel"` finds **12** distinct cast declarations in the file, meaning **11 of them are rogue duplicates** of `fakePanel()`'s exact literal that never call it — verified by reading them directly (`:2827, :2890, :2946, :3251, :4893` reproduce the identical `{ title: '', iconPath: undefined, webview: { postMessage: (message) => {...} } }` shape character-for-character; `:5246, :5292, :5346, :5885` reproduce a simpler `{ title: '', iconPath: undefined, webview: { postMessage: () => Promise.resolve(true) } }` variant). The same pattern recurs at smaller scale: `:3015-3016`'s inline `vscode.authentication` + `vscode.window` pair duplicates exactly what the file's own `stubVoteEnvironment()` helper (`:5683-5684`) already centralizes. **Part of this problem was never "no good pattern exists" — it is that the good pattern exists and isn't consistently reached for.** This matters independently of which library is adopted (§AI-agent angle expands on why this specific failure mode is agent-characteristic).

### 9. Pricing candidate (e): the production seam

Measured directly: 17 production files under `src/` import `vscode` (`grep -rl "from 'vscode'" src --include='*.ts' | grep -v /test/`), spanning at least 6 distinct namespaces by call-site count — `vscode.commands` (`extension.ts` alone has 20 `registerCommand` calls, plus `executeCommand` in 4 more files), `vscode.window` (`showInformationMessage`/`showErrorMessage`/`showWarningMessage`/`showQuickPick` across 7 files), `vscode.Uri` (`parse`/`joinPath`/`file` across 4 files), `vscode.env.openExternal`, `vscode.authentication.getSession`, `vscode.workspace` (`getConfiguration`/`createFileSystemWatcher`/`openTextDocument`). A `GrimoirePort` interface narrow enough to fake in full (the sister report's rung-4 "implement completely, zero cast" pattern) would need on the order of 15-20 distinct methods and a rewrite of all 17 files to route through it instead of `import * as vscode`.

Critically, this **would not eliminate Category B**: `WebviewPanel`/`WebviewView` are handed to the extension *by* the host (`window.createWebviewPanel(...)`, a live `resolveWebviewView` callback) — a port can narrow what the extension *asks for*, but the panel/view object itself is still a real vscode type the port's fake implementation must produce or accept, so Category B's fake either moves inside the port's own fake implementation (still needing `createMock<WebviewPanel>()` or equivalent) or the port grows its own smaller "handle" type that then needs the exact same faking treatment one level removed. **Net: the seam is a real, legitimate architecture investment (it would reduce the file's total vscode-namespace surface and ease a future runtime swap), but it is not required to solve the cast problem this task was asked to settle, costs roughly an order of magnitude more (17 production files vs. 3 devDependencies + test-file-only edits), and does not fully subsume Category B on its own.** Not recommended as *the* fix.

### 10. Does the same pattern serve the Vitest repos?

Not the same npm package — `@golevelup/ts-sinon` requires `sinon`; the Vitest repos already have `vitest-mock-extended`'s `mock<T>()` established by a prior wave, and `@golevelup/ts-vitest` is `vi.fn()`-backed, not `sinon.stub()`-backed. What **is** shared: the exact same `createMock<T>(partial) → DeepMocked<T>` idiom, from the same author, the same monorepo, published the same day (2026-03-18) for both runners — confirmed by reading both packages' type declarations side by side (§5, §6). **The fleet correctly runs two packages, one pattern.** Document the idiom once (a normative rule, not per-repo prose); let each repo's `package.json` pick the runner-matched package. Do not attempt to force a single shared npm dependency across the Vitest and Mocha/Electron repos — that would mean either pulling `vitest`'s `vi` global into a Mocha/Electron suite (wrong test runner) or pulling `sinon` into repos that already have a working, established `vitest-mock-extended` answer (unnecessary churn against a decision a prior wave already made).

## Normative guidance candidates

1. **In `grimoire-vscode` and `vscode-ocx`, add `sinon`, `@types/sinon`, and `@golevelup/ts-sinon` as devDependencies; do not write a repo-local `fake<T>`/`mock<T>` helper.**
   *Rationale:* `createMock<T>()` already is that helper — maintained (§5), and the one candidate that answers both fault categories the file actually contains (§2), not just the structural-fake half.
   *Verify:* `package.json` lists all three; `grep -rn "function fake<\|function mock<" src/` in either repo returns nothing.

2. **Never cast a monkeypatch of a real vscode singleton. Use `sinon.stub(vscode.window, 'methodName')` (or `sinon.replace` + `sinon.fake`), restored via one file-level `sinon.createSandbox()` + `afterEach(() => sandbox.restore())`.**
   *Rationale:* §7 — `@types/sinon`'s typed overload needs no narrowing cast at all; this is strictly simpler than any fake, and collapses ~18 duplicated try/finally blocks into one teardown hook.
   *Verify:* `grep -rn "as unknown as { show\|as unknown as { execute\|as unknown as { getAccounts" --include='*.ts' src/` — every hit should be replaced; `grep -c "sandbox.restore()" src/test/*.ts` should show one `afterEach` per file that uses `sandbox.stub`.

3. **For any constructor-less vscode interface (`WebviewPanel`, `WebviewView`, `OutputChannel`, `GlobalEnvironmentVariableCollection`) or an app-internal class faked to avoid its real side effects (`ScopeService`), use `createMock<Interface>(partialOverrides)` — never a hand-written object literal cast with `as unknown as`.**
   *Rationale:* §6 — zero cast at the call site, automatic typo-catching on every provided member, and it is the exact `DeepPartial`-shaped override ergonomics these fakes already need (§4).
   *Verify:* `grep -rn "as unknown as vscode\.\(WebviewPanel\|WebviewView\|OutputChannel\|GlobalEnvironmentVariableCollection\)\|as unknown as ScopeService" --include='*.ts' src/` — target is 0 hits outside this migration's transition period.

4. **When migrating a fake with `createMock<T>()`, still explicitly provide every plain-data member (not just every function member) that the code under test actually reads.**
   *Rationale:* §6's verified footgun — an unfaked non-function member returns a callable stub disguised as the property, not `undefined`; only members the SUT genuinely never touches are safe to omit.
   *Verify:* reading heuristic — for each `createMock<T>({...})` call, cross-reference the SUT function under test against which plain-data members it reads; any gap is a latent bug, not a saved line.

5. **Before writing a new fake, `grep` for an existing helper with the same shape in the same file; do not write a fourth inline duplicate of a pattern that already has three.**
   *Rationale:* §8 — 11 of 12 `WebviewPanel` cast sites and a `stubVoteEnvironment`-shaped pair at `:3015-3016` are unforced duplicates of helpers already present in the same file; this is a discipline problem independent of which library is adopted.
   *Verify:* `grep -c "as unknown as vscode.WebviewPanel"` should trend toward 1 (only inside `fakePanel()`'s own definition) as duplicates are migrated to call it — or, post-migration to `createMock`, toward however many distinct `createMock<vscode.WebviewPanel>` factory functions exist, never one inline literal per test.

6. **Do not adopt `ts-mockito` or `testdouble.js` for new work in either repo.**
   *Rationale:* §5 — `ts-mockito`'s GitHub repo last received a code push 2023-02-12 (91 open issues); `testdouble.js`'s last push was 2024-03-21 (35 open issues). Both are mechanically plausible; neither clears a maintenance bar for a new 2026 dependency.
   *Verify:* neither appears in either repo's `package.json`; if proposed, check `pushed_at` via `gh api repos/<owner>/<repo>` before accepting.

7. **Do not attempt to unify the Vitest repos and the Mocha/Electron repos onto one shared npm mock package.** Teach the `createMock<T>() → DeepMocked<T>` idiom once, fleet-wide; let `vitest-mock-extended` (already established) or `@golevelup/ts-vitest` serve the Vitest repos and `@golevelup/ts-sinon` serve `grimoire-vscode`/`vscode-ocx`.
   *Rationale:* §10 — same author, same day, same API shape, different runtime primitive (`vi.fn()` vs `sinon.stub()`) tied to each repo's actual test runner; forcing one package would either bring the wrong runner's global into a suite or churn a prior wave's settled Vitest-repo decision for no gain.
   *Verify:* `grimoire-vscode`/`vscode-ocx` `package.json` never lists `vitest` or `vitest-mock-extended`; the Vitest repos' `package.json` never lists `sinon` or `@golevelup/ts-sinon`.

8. **Do not extract a production `vscode`-facing port/seam (candidate e) to solve the cast problem.**
   *Rationale:* §9 — 17 production files, ≥6 namespaces, and it still would not eliminate the `WebviewPanel`/`WebviewView` faking need on its own; roughly 10x the cost of the library fix for a strict subset of the benefit. Treat it as a separate, optional architecture decision if a different motivation (reducing vscode coupling generally) arises later.
   *Verify:* no PR should cite "fixing the double-casts" as sole justification for a `src/vscode/` port-interface refactor; if one is proposed for other reasons, re-check whether Category B fakes still exist inside the port's own implementation.

9. **When pinning `sinon`, use `^21.x`, not the newest `22.x`.**
   *Rationale:* `@golevelup/ts-sinon@2.0.0`'s only published version declares `peerDependencies: { sinon: "^21.x" }` (verified via its `package.json`); npm's latest `sinon` is `22.1.0`, which falls outside that peer range.
   *Verify:* `npm ls sinon @golevelup/ts-sinon` reports no peer-dependency warning after install.

## AI-agent angle

- **Treating the file's 46 casts as one homogeneous problem and reaching for one fix (usually a fake) for all of them.** §2's four categories need two different mechanisms (`sinon.stub` for A, `createMock` for B/C); an agent that fakes a *substitute* `window` object for what is actually a two-method monkeypatch on the real singleton (Category A) has both overcomplicated the test and introduced a class of bugs the sister report's own §4a already flags (an incomplete substitute silently missing real `window` behavior other code in the same test run depends on). **Mechanical check:** before writing any fake, grep the enclosing test for whether the code under it re-reads the faked object's *other*, unfaked members later in the same test — if yes, it needed a monkeypatch (Category A), not a substitute object (Category B).
- **Writing an 11th duplicate of `fakePanel()`'s literal instead of calling it.** §8 is exactly the failure mode an LLM completing "the next test in this file" from local context is prone to: the two or three nearest tests it can see in its context window used an inline literal (because *they* were also duplicates), so the model pattern-matches the local convention instead of grepping the whole file for an existing named helper. **Mechanical check:** before adding any `WebviewPanel`/`WebviewView`/`OutputChannel` fake, `grep -n "^function fake\|^function stub"` across the whole test file, not just nearby lines — call an existing match rather than writing a new literal.
- **Assuming `createMock<T>()`'s compile-clean result means the fake is behaviorally complete.** §6 showed a typo is caught but an unfaked plain-data member silently returns a live stub function, not `undefined` — an agent that sees `tsc --strict` pass on a migrated `createMock<WebviewPanel>({...})` call and stops there has not verified the SUT doesn't also read `panel.title` or `panel.active`. **Mechanical check:** for every migrated `createMock<T>()` call, diff the SUT function under test against the partial object's keys; any member the SUT reads that isn't in the partial is a gap regardless of what `tsc` says.
- **Reaching for `ts-mockito` because its `mock<FooInterface>()` syntax is the most textbook-Mockito-familiar shape in an LLM's training data, without checking the project's actual maintenance state.** §5's GitHub-API-verified `pushed_at: 2023-02-12` is the kind of fact a model trained on the library's still-widely-referenced README (last meaningfully updated years before its training cutoff) has no organic reason to surface. **Mechanical check:** before proposing any new test-mocking dependency, `gh api repos/<owner>/<repo>` for `pushed_at` and `open_issues_count`; treat "not archived" as insufficient evidence of health on its own.
- **Proposing the production-seam refactor (candidate e) as "the proper fix" because it reads as more architecturally sound than "add a mocking library."** §9's measured cost (17 files, ≥6 namespaces, doesn't fully subsume Category B) is the kind of scope an agent optimizing for architectural elegance in the abstract will underprice against a three-line `package.json` change that actually clears the stated goal. **Mechanical check:** before recommending a seam extraction to fix a casting complaint, count the production files that would need to change (`grep -rl "from 'vscode'" src --include='*.ts' | grep -v /test/ | wc -l`) and confirm in writing whether Category B fakes still exist after the refactor — if the count is >5 files and Category B doesn't fully disappear, the seam is not "the fix," it's a separate proposal.

## Contested / evolving

- **Whether `sinon.stub()`/`sinon.fake()` or a Proxy-based `createMock<T>()` is the "more modern" idiom is not settled community-wide** — sinon's own docs (`sinonjs.org/concepts/fakes`) now describe `sinon.fake()` as the *recommended* alternative to `sinon.stub()` "for most use cases," which is a shift within the sinon ecosystem itself, not a cross-library consensus; this report's Category A recommendation (`sandbox.stub()`) still works and was chosen for its direct fit with the fleet's existing try/finally-restore pattern, but `sinon.replace(obj, 'method', sinon.fake...)` is worth a second look if the fleet later standardizes on `fake` over `stub` fleet-wide.
- **Could not establish, as of 2026-08-29, whether `testdouble.js`'s module-replacement mechanism (`td.replace()`) would work at all against `vscode`'s virtual, non-file-backed module inside an Electron extension host** — its relevant docs subpages returned 404 during this research and the question was not pursued further once the repo's 2024-03-21 staleness alone was sufficient to drop it from consideration (§5, §Normative #6). If `testdouble.js` sees a maintenance revival, this specific mechanism question would need to be re-opened before it could be reconsidered.
- **`@golevelup/ts-sinon`'s runtime auto-vivification behavior on unfaked plain-data members (§6) is this report's own empirical finding, not a documented caveat in the package's own README** (which was not directly reachable during this research — `raw.githubusercontent.com/golevelup/ts-sinon/master/README.md` 404'd; the package now lives inside the `golevelup/nestjs` monorepo, and its exact current README path was not located). Treat the finding as verified against the published `2.0.0` source (`lib/mocks.js`, read directly) and the empirical `tsc`/`node` run in this session, not as a documented, first-party-acknowledged limitation.
- **This report evaluates only the two extension repos' *test-side* casts.** Whether `grimoire-vscode`'s or `vscode-ocx`'s *production* code should ever reach for the same `createMock`-style pattern (e.g. in a future integration-test layer that fakes `grim` CLI output rather than shelling out) was out of scope and not investigated.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts) | Official VS Code extension API type declarations, pinned to the fleet's own `@types/vscode` version | Tag 1.96.0 | Primary source for the exact readonly/mutable member counts on `Webview`/`WebviewPanel`/`WebviewView`/`OutputChannel` (§3), read directly line-by-line, not summarized |
| [registry.npmjs.org/sinon](https://registry.npmjs.org/sinon) | npm registry | Latest `22.1.0`, checked 2026-08-29 | Confirms current sinon version for the pin recommendation (§Normative #9) |
| [api.github.com/repos/sinonjs/sinon](https://api.github.com/repos/sinonjs/sinon) | GitHub repo metadata API | `pushed_at: 2026-08-05`, checked 2026-08-29 | Direct, structured evidence sinon is actively maintained, not just "not archived" |
| [github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/sinon/index.d.ts](https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/sinon/index.d.ts) | `@types/sinon` source, the actual `stub<T,K>` overload | Current as of 2026-08-29 | Establishes `sinon.stub(vscode.window, 'method')` needs zero cast — the entire basis for §7 and Normative #2 |
| [raw.githubusercontent.com/microsoft/vscode/main/package.json](https://raw.githubusercontent.com/microsoft/vscode/main/package.json) | microsoft/vscode's own root `package.json`, `main` branch | Checked 2026-08-29 | Corrects the brief's "VS Code's own samples use sinon" to the precise fact: VS Code *core* (`sinon: ^12.0.1`, `@types/sinon: ^10.0.2`), not the samples repo |
| GitHub code search, `q=sinon repo:microsoft/vscode-extension-samples` (via `gh api search/code`) | GitHub code search API | Checked 2026-08-29, `total_count: 0` | Direct disproof that `microsoft/vscode-extension-samples` itself uses sinon anywhere |
| [api.github.com/repos/NagRock/ts-mockito](https://api.github.com/repos/NagRock/ts-mockito) | GitHub repo metadata API | `pushed_at: 2023-02-12`, checked 2026-08-29 | The decisive maintenance-staleness fact for rejecting `ts-mockito` (§5, Normative #6) |
| [raw.githubusercontent.com/NagRock/ts-mockito/master/README.md](https://raw.githubusercontent.com/NagRock/ts-mockito/master/README.md) | ts-mockito's own README | Current file on `master`, checked 2026-08-29 | Confirms the `mock<FooInterface>()`-as-generic-parameter syntax for interface mocking (§5) — mechanically sound, project unmaintained |
| [api.github.com/repos/testdouble/testdouble.js](https://api.github.com/repos/testdouble/testdouble.js) | GitHub repo metadata API | `pushed_at: 2024-03-21`, checked 2026-08-29 | The decisive maintenance-staleness fact for rejecting `testdouble.js` (§5, Normative #6) |
| [registry.npmjs.org/testdouble](https://registry.npmjs.org/testdouble) | npm registry | Latest `3.20.2`, checked 2026-08-29 | Confirms testdouble.js is still published, just not actively developed |
| [api.github.com/repos/golevelup/nestjs](https://api.github.com/repos/golevelup/nestjs) | GitHub repo metadata API | `pushed_at: 2026-08-26`, checked 2026-08-29 | Establishes the monorepo housing both `@golevelup/ts-sinon` and `@golevelup/ts-vitest` is actively maintained (2,740★, pushed 3 days before this research) |
| [registry.npmjs.org/@golevelup/ts-sinon](https://registry.npmjs.org/@golevelup/ts-sinon) | npm registry | Latest `2.0.0`, published 2026-03-18, checked 2026-08-29 | Version and publish-date source for the primary recommendation |
| [unpkg.com/@golevelup/ts-sinon@2.0.0/package.json](https://unpkg.com/@golevelup/ts-sinon@2.0.0/package.json) | Published package manifest | `2.0.0` | Confirms zero runtime dependencies, `peerDependencies: sinon@^21.x` — the basis for Normative #9 and the "not actually NestJS-coupled" claim |
| [unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.d.ts](https://unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.d.ts) | Published TypeScript declarations | `2.0.0` | The exact `DeepPartial`/`PartialFuncReturn`/`DeepMocked`/`createMock` type definitions quoted verbatim in §6 |
| [unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.js](https://unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.js) | Published compiled source | `2.0.0` | The Proxy `get`-trap implementation that produces the auto-vivification runtime footgun documented in §6 |
| [registry.npmjs.org/@golevelup/ts-vitest](https://registry.npmjs.org/@golevelup/ts-vitest) | npm registry | Latest `4.0.0`, published 2026-03-18, checked 2026-08-29 | Confirms the Vitest sibling package's version and same-day publish, for the parity claim in §10 |
| [sinonjs.org/concepts/stubs](https://sinonjs.org/concepts/stubs) | Official sinon docs | Current as of 2026-08-29 | `sinon.stub(object, 'method')`'s documented semantics, cited in §7 |
| [sinonjs.org/concepts/sandboxes](https://sinonjs.org/concepts/sandboxes) | Official sinon docs | Current as of 2026-08-29 | `sinon.createSandbox()` / `sandbox.restore()` — the one-`afterEach` teardown pattern in §7's before/after example |
| [sinonjs.org/concepts/fakes](https://sinonjs.org/concepts/fakes) | Official sinon docs | Current as of 2026-08-29 | Documents sinon's own current preference for `fake` over `stub` "for most use cases" — the basis for the Contested/evolving note |
| [code.visualstudio.com/api/working-with-extensions/testing-extension](https://code.visualstudio.com/api/working-with-extensions/testing-extension) | Official VS Code extension testing guide | Current as of 2026-08-29 | Confirms the guide itself never mentions sinon or mocking, consistent with the correction in the Summary |
| Local, empirical: `typescript@7.0.2 --strict`, `sinon@21`, `@golevelup/ts-sinon@2.0.0` compiled and run against three hand-written test files | Compiler and runtime behavior verified directly in this session | Verified 2026-08-29 | Grounds §4 (`Partial<T>` rejects the fleet's nested-partial shape, TS2739), §6 (`createMock<T>()` compiles clean with zero cast, catches a typo via TS2561, and the runtime auto-vivification footgun on `panel.title`/`panel.dispose()`) in actual output, not recalled behavior |
| `grimoire-vscode/src/test/extension.test.ts`, `vscode-ocx/src/test/environment.test.ts`, both repos' `package.json`, and `grimoire-vscode/src/**/*.ts` (production) | Fleet source, read directly under `/home/mherwig/dev` | Measured 2026-08-29 | Every file:line count and category in §1, §2, §8, §9 is a direct read of these files, not a citation of the brief's own figures |


---
title: "async-void-handlers — the correct shape for async in a void-typed callback position"
topic: async-void-handlers
agent: async-void-handlers
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 16
scope: >
  Settles TS-ASYNC-03's missing "replacement shape": what an `async` function
  must look like when it is handed to a void-typed callback position — React
  event props, Vue template `v-on`/`@click` bindings, raw DOM
  `addEventListener`, `forEach`/`.map` callbacks, `setTimeout`/`setInterval` —
  and the exact mechanical/reading check for each, given 8 of 9 fleet repos
  run no type-aware linting. Does not cover top-level unhandled-rejection
  guards, `fetch`/Connect-RPC timeouts, or non-callback fire-and-forget `void`
  calls — see `ts-async/promise-observability.md` and
  `ts-async/cancellation-and-timeouts.md` for those.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Why this compiles at all: the void-return assignability quirk](#1-why-this-compiles-at-all-the-void-return-assignability-quirk)
   2. [`no-misused-promises`'s `checksVoidReturn`: what each sub-option actually catches](#2-no-misused-promisess-checksvoidreturn-what-each-sub-option-actually-catches)
   3. [`strict-void-return`: the new, stricter, autofix-carrying rule — and what it prescribes](#3-strict-void-return-the-new-stricter-autofix-carrying-rule--and-what-it-prescribes)
   4. [`useEffect(async …)` is the one case `tsc` already blocks, unconditionally](#4-useeffectasync--is-the-one-case-tsc-already-blocks-unconditionally)
   5. [React 18 vs React 19: Actions are the framework mechanism, and this fleet cannot use them yet](#5-react-18-vs-react-19-actions-are-the-framework-mechanism-and-this-fleet-cannot-use-them-yet)
   6. [Vue is the opposite case: `callWithAsyncErrorHandling` already wraps every template-bound handler](#6-vue-is-the-opposite-case-callwithasyncerrorhandling-already-wraps-every-template-bound-handler)
   7. [The DOM spec: `EventListener`'s return value is `undefined` by contract, and exceptions vs. rejections take different paths](#7-the-dom-spec-eventlisteners-return-value-is-undefined-by-contract-and-exceptions-vs-rejections-take-different-paths)
   8. [The fleet's three live violations, and its own three correct exemplars](#8-the-fleets-three-live-violations-and-its-own-three-correct-exemplars)
   9. [The maintainer's position: no per-callee leniency](#9-the-maintainers-position-no-per-callee-leniency)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **The prescribed shape, once and for all**: keep the outer function *non*-`async`; fire a self-catching `async` IIFE inside it, discarded with `void`. This is not a house style choice — it is verified as the literal autofix `@typescript-eslint/strict-void-return` offers (`suggestWrapInAsyncIIFE`, read from the installed `8.68.0` package source), and it is already the fleet's own idiom in 3 of 3 `useEffect` data-loads.
- `async () => {}` is assignable to a `void`-returning callback type by design, not by accident — TypeScript's own FAQ says a `void`-returning callback type means "I'm not going to look at your return value, if one exists," so `Promise<void>` passes the same way `Array#push`'s `number` return does. [github.com/Microsoft/TypeScript/wiki/FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-functions-returning-non-void-assignable-to-function-returning-void)
- `@typescript-eslint/no-misused-promises`'s `checksVoidReturn` has independent sub-options — `attributes` (JSX props), `arguments` (`forEach`/`.map`/`setTimeout` callbacks), `properties`, `returns`, `variables`, `inheritedMethods` — all default `true`; disabling any of them for convenience reopens exactly this hole. [typescript-eslint.io/rules/no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/)
- A brand-new rule, `@typescript-eslint/strict-void-return`, shipped in `@typescript-eslint/eslint-plugin@8.68.0` (2026-08-24, five days before this research) — verified by unpacking the published tarball — and it is the only one of the two with an autofix suggestion for this exact bug. It is **not** in `recommended`/`strict`/`*TypeChecked` — only in the `all` config — so it must be turned on explicitly.
- `useEffect(async () => {...})` is a hard `tsc` compile error, verified directly (`TypeScript 5.9.3`, `--strict`): `Type 'Promise<void>' is not assignable to type 'void | Destructor'`. This is the *one* framework-event position where the compiler alone — no lint, no type-aware config — already blocks the classic LLM mistake. `onClick`, `addEventListener`, `forEach`, `setTimeout` get no such protection.
- React's own docs model the fix for `useEffect` as "declare a named `async` function inside the (still-synchronous) effect and call it" — structurally the same shape as the IIFE, just named instead of anonymous. [react.dev/learn/synchronizing-with-effects](https://react.dev/learn/synchronizing-with-effects)
- React 19 (stable since 2024-12-05) adds a genuine framework mechanism — `useTransition`/`useActionState`/`<form action={...}>` "Actions" — with built-in pending state and Error Boundary integration for async event work. [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)
- **This fleet cannot use React 19's Actions today.** `fma` is locked to React `18.3.1` (`fma/package.json:19`, lockfile-confirmed), where `Promise`-returning event handlers get no framework help at all — React discards the return value and does nothing else with it.
- Vue is the mirror image: verified directly from Vue `3.5.42`'s runtime source, every template-bound handler (`@click="method"`, `v-on:click`) is invoked through `createInvoker` → `callWithAsyncErrorHandling`, which does `res.catch(err => handleError(err, instance, type))` whenever the handler returns a `Promise` — no wrapper needed for a *template*-bound async handler. [github.com/vuejs/core — `errorHandling.ts`](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/errorHandling.ts)
- That Vue safety net is inert without a receiver: `handleError` walks up `onErrorCaptured` hooks, then falls back to `app.config.errorHandler`, then falls back to a dev-mode rethrow / prod `console.error`. `creeptd-ng/web` has zero of either configured (confirmed by the earlier `promise-observability.md` sweep), so an async `@click` handler there is *safe from crashing* but still *silent to the user* — the gap is the missing error channel, not the handler shape.
- A raw DOM `addEventListener('click', async () => {...})` gets **none** of Vue's wrapping, because it bypasses Vue's compiler-generated `createInvoker` entirely — confirmed live at `ocx-catalog/src/theme/components/detail/ReadmePane.vue:126`, which is a genuine, framework-net-free violation.
- The fleet has exactly **three** live violations of TS-ASYNC-03's intent, and none are caught by its own literal grep for two of the three: `fma/src/library/LibraryPage.tsx:91` (inline, grep-catchable), `fma/src/player/PlayerPage.tsx:180` referencing the definition at `:119` (bare identifier, **not** grep-catchable), `ocx-catalog/src/theme/components/detail/ReadmePane.vue:126` (inline, grep-catchable, and framework-net-free per the point above).
- The fleet also already contains the correct shape three times over, in `useEffect`/`onMounted`-adjacent code: `fma/src/audio/sources/SpotifyPanel.tsx:18-26` is the gold-standard instance — non-`async` outer function, `void`-discarded inner `async` IIFE, internal `try`/`catch`. `PlayerPage.tsx:57-62` and `LibraryPage.tsx:30-39` use the same shape but skip the internal `try`/`catch` (a separate, already-known gap under TS-ASYNC's own `void`-is-not-a-handler rule).
- No mechanical check exists for the bare-identifier case in a repo without type-aware linting — a regex cannot resolve whether `onClick={onUseMic}`'s identifier was declared `async` without symbol resolution. Name the two-step reading procedure that replaces the lint: **Handler Identifier Trace**.
- A shared `handle(fn)`/`safeHandler(fn)` wrapper is over-engineering at this fleet's current size (≤3 live sites across two SPAs) — it is functionally identical to the inline IIFE plus an extra import; reconsider only if a single SPA's handler-site count crosses roughly a dozen with genuinely shared cross-cutting behavior (e.g., one toast call on every failure), which none does today.
- typescript-eslint's maintainer explicitly declined to add a per-callee escape hatch for this rule (even for the common `react-hook-form`'s `handleSubmit` case) in a closed 2024 issue — the rule is deliberately type-driven, not behavior-driven, and that stance is unchanged as of 2026-08-29. [github.com/typescript-eslint/typescript-eslint#9930](https://github.com/typescript-eslint/typescript-eslint/issues/9930)

## Findings

### 1. Why this compiles at all: the void-return assignability quirk

TypeScript's own FAQ states the rule directly: a function type whose return is annotated `void` accepts *any* function whose return type is "more," because "the fact that `doSomething` returns 'more' information than `callMeMaybe` is a valid substitution" — the canonical example given is `Array#push`, which returns a `number` but is happily assignable anywhere a `void`-returning callback is expected. The FAQ's summary line is exact: "a `void`-returning callback type says 'I'm not going to look at your return value, if one exists'." [github.com/Microsoft/TypeScript/wiki/FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-functions-returning-non-void-assignable-to-function-returning-void)

`Promise<void>` is exactly such a "more informative" return type relative to `void`, so `async () => {}` slides through the same hole `() => number` does. This is *why* `onClick={async () => {...}}`, `addEventListener('click', async () => {...})`, `forEach(async …)`, and `setTimeout(async …)` all compile clean at every `tsc --strict` level — verified earlier in this research program (`promise-observability.md:248-261`). It is a deliberate, decades-old design decision, not a bug TypeScript will ever close — so the fix has to live in linting or in code shape, never in waiting for the compiler to start rejecting it.

### 2. `no-misused-promises`'s `checksVoidReturn`: what each sub-option actually catches

`checksVoidReturn` defaults to `true` (all sub-options on). Read from the current docs: [typescript-eslint.io/rules/no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/)

| Sub-option | Catches |
|---|---|
| `arguments` | An `async` function passed as an argument whose parameter type is a void-returning function — `forEach(async value => {...})`, `setTimeout(async () => {...})`. |
| `attributes` | An `async` function passed as a JSX attribute expected to return `void` — `<button onClick={async () => {...}}>`, or (structurally, by the same type-driven mechanism, though the docs' own examples do not isolate this case) `addEventListener('click', async () => {...})`-shaped DOM assignments. |
| `properties` | An `async` function assigned to an object property typed to return `void`. |
| `returns` | A function that *returns* an `async` function where the outer function's declared return type is itself a void-returning function type. |
| `variables` | An `async` function assigned to a variable whose declared type is a void-returning function. |
| `inheritedMethods` | A class implementing/extending an interface whose method is typed `void`, overridden with an `async` (`Promise`-returning) implementation. |

```ts
// ❌ arguments
[1, 2, 3].forEach(async value => {
  await fetch(`/${value}`);
});

// ❌ attributes
document.addEventListener('click', async () => {
  await fetch('/');
});

// ❌ inheritedMethods
interface MySyncInterface { setThing(): void; }
class MyClass implements MySyncInterface {
  async setThing(): Promise<void> { /* ... */ } // still flagged
}
```

The message ids, read from the installed `8.68.0` package (`dist/rules/no-misused-promises.js:75-85`), are position-specific — `voidReturnArgument`, `voidReturnAttribute`, `voidReturnProperty`, `voidReturnReturnValue`, `voidReturnVariable`, `voidReturnInheritedMethod` — but the rule carries **no `hasSuggestions`/autofix** at all; it only reports. That absence is the direct cause of the problem this research was asked to fix: the rule correctly identifies the bug and offers nothing toward the correct replacement.

`no-misused-promises` (and therefore `checksVoidReturn`) ships inside typescript-eslint's own `recommendedTypeChecked` and `strictTypeChecked` configs — confirmed by grepping the installed package's `configs/flat/*.js`. `@vue/eslint-config-typescript@14.9.0` is a thin adapter that re-exports these same `typescript-eslint` configs (`vueTsConfigs.recommendedTypeChecked`, `.strictTypeChecked`, …) for `.vue` files — confirmed by unpacking the published tarball (`package/dist/index.mjs:16-20`) — so adopting it in `creeptd-ng/web` (which today has **no** lint config at all, `package.json:14` points `lint` at a nonexistent script) would extend this exact check to Vue template `@click` bindings too, once type info is wired.

### 3. `strict-void-return`: the new, stricter, autofix-carrying rule — and what it prescribes

`@typescript-eslint/strict-void-return` is new: verified present in `@typescript-eslint/eslint-plugin@8.68.0`, published 2026-08-24 (`npm view … time`), and absent from `8.67.x` and earlier by the changelog's feature entry — `"eslint-plugin: [strict-void-return] add fix suggestions (#12086)"` is itself the `8.68.0` entry, meaning even the *suggestion* capability is five days old as of this research. Its docs describe it as broader than `no-misused-promises`: "If you only care about promises, you can use the `no-misused-promises` rule instead" — implying `strict-void-return` is the generalization (any value-returning function in a void position, not just `Promise`-returning ones), with a default option `{ allowReturnAny: false }`.

Read directly from the installed rule source (`dist/rules/strict-void-return.js`), its message and suggestion ids are:

```js
messages: {
  asyncFunc: 'Async function used in a context where a void function is expected.',
  nonVoidFunc: 'Value-returning function used in a context where a void function is expected.',
  nonVoidReturn: 'Value returned in a context where a void return is expected.',
  suggestAddVoidOp: 'Add a void operator to discard the return value.',
  suggestWrapInAsyncIIFE: 'Wrap the function body in an async IIFE.',
}
```

`hasSuggestions: true`, and it requires type information (`requiresTypeChecking: true`), exactly like `no-misused-promises`. **This settles the shape question at the source**: when the tool that specializes in this exact bug offers an automatic fix, the fix it writes is "wrap the function body in an async IIFE" — i.e., turn

```ts
// flagged: asyncFunc
const onUseMic = async () => {
  try { /* ... */ } catch (e) { /* ... */ }
};
```

into

```ts
// suggestWrapInAsyncIIFE
const onUseMic = () => {
  void (async () => {
    try { /* ... */ } catch (e) { /* ... */ }
  })();
};
```

Critically, `strict-void-return` is **not** in `recommended`, `strict`, `recommendedTypeChecked`, or `strictTypeChecked` — grepping the installed package's `configs/flat/*.js` shows it present only in `configs/flat/all.js`. Adopting `strictTypeChecked` (the fleet's baseline per TS-ASYNC-01) does **not** turn this on; it must be added explicitly: `"@typescript-eslint/strict-void-return": "error"`.

### 4. `useEffect(async …)` is the one case `tsc` already blocks, unconditionally

Verified directly, `TypeScript 5.9.3`, `--strict`, against `fma`'s own installed `@types/react`:

```ts
useEffect(async () => {
  await Promise.resolve();
}, []);
```
```
error TS2345: Argument of type '() => Promise<void>' is not assignable to parameter of type 'EffectCallback'.
  Type 'Promise<void>' is not assignable to type 'void | Destructor'.
```

The same compile pass left the sibling `onClick={async () => { await Promise.resolve(); }}` line completely clean — zero errors. The difference: React's `EffectCallback` type is a **union**, `void | Destructor`, not a bare `void`. `Promise<void>` satisfies neither arm (it isn't callable, so it can't be a `Destructor`; and the FAQ's void-substitution rule does not rescue it inside a union the same way it rescues a bare `void` return position), so `tsc` rejects it outright — with no lint, no `parserOptions.project`, at any strictness level.

React's own docs model the *correct* fix as: keep the Effect callback synchronous, declare a named `async` function inside it, and call that function immediately — structurally the IIFE shape, just named instead of anonymous:

```js
useEffect(() => {
  let ignore = false;
  async function startFetching() {
    const json = await fetchTodos(userId);
    if (!ignore) setTodos(json);
  }
  startFetching();
  return () => { ignore = true; };
}, [userId]);
```
[react.dev/learn/synchronizing-with-effects](https://react.dev/learn/synchronizing-with-effects)

Practical upshot for TS-ASYNC-03: the `useEffect`/`onMounted` position never needs its own grep line — `tsc --noEmit` (already run in every repo) already forces the correct shape. The rule only needs to cover the *other* four positions, where the compiler stays silent.

### 5. React 18 vs React 19: Actions are the framework mechanism, and this fleet cannot use them yet

React 19 (stable 2024-12-05) added first-class support for async work triggered from user interaction — "Actions" — via `useTransition`, `useActionState`, and function props on `<form>`/`<input>`/`<button>`:

```js
// React 19 — useActionState
const [error, submitAction, isPending] = useActionState(
  async (previousState, formData) => {
    const error = await updateName(formData.get('name'));
    if (error) return error;
    redirect('/path');
    return null;
  },
  null,
);

return (
  <form action={submitAction}>
    <input type="text" name="name" />
    <button type="submit" disabled={isPending}>Update</button>
    {error && <p>{error}</p>}
  </form>
);
```

The blog post states the mechanism directly: "Actions provide error handling so you can display Error Boundaries when a request fails, and revert optimistic updates to their original value automatically." Pending state is tracked automatically; `useFormStatus`/`useOptimistic` compose with it. [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)

This is candidate (c) — a genuine framework-level mechanism — and, for a `<form>` submit specifically, it is the *better* answer than any hand-written wrapper: pending/error state come for free, and the error surfaces through the app's existing Error Boundary tree instead of nowhere.

**It does not apply to `fma` today.** `fma/package.json:19` pins `"react": "^18.3.1"`, and the installed lockfile confirms the resolved version is exactly `18.3.1` (`node_modules/react` → `"version": "18.3.1"`). Bare React 19 event props (`onClick`) still take *any* function typed `(event) => void` — Actions are a distinct, opt-in API surface (`useTransition`, `useActionState`, `<form action>`), not a change to what `onClick` itself accepts — so `fma` gets none of this until it both bumps to React 19 *and* migrates specific handlers onto `useTransition`/`useActionState`. Until then, every `fma` event handler is squarely in the "no framework net" case: shape (a) is the only option.

### 6. Vue is the opposite case: `callWithAsyncErrorHandling` already wraps every template-bound handler

Verified directly from Vue's own runtime source — both the published `vue@3.5.42` package (`dist/vue.esm-browser.js`, the fleet's own installed major/minor: `ocx-catalog` runs `^3.5.27`, `creeptd-ng/web` runs `^3.5.0`) and the current `main` branch on GitHub agree:

```ts
// packages/runtime-core/src/errorHandling.ts
function callWithAsyncErrorHandling(fn, instance, type, args) {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args);
    if (res && isPromise(res)) {
      res.catch(err => { handleError(err, instance, type); });
    }
    return res;
  }
  // ...
}
```
[github.com/vuejs/core — `errorHandling.ts`](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/errorHandling.ts)

Every DOM event bound through Vue's template compiler goes through `createInvoker`, and `createInvoker`'s dispatched call is `callWithAsyncErrorHandling(handler, instance, 5 /* NATIVE_EVENT_HANDLER */, [event])` — verified at `dist/vue.esm-browser.js:11846-11881` in the packed `3.5.42` tarball. So:

```vue
<!-- Vue 3, template-bound: SAFE with no wrapper needed -->
<button @click="handleDelete">delete</button>

<script setup lang="ts">
async function handleDelete() {
  await api.remove(id);   // a rejection here IS caught — see below
}
</script>
```

`handleError` (same file) walks the component's `onErrorCaptured` hooks first, then falls back to `instance.appContext.config.errorHandler` (`app.config.errorHandler`), then — only if *neither* exists — falls back to `logError`, which `throw`s in dev (surfacing as a new, still-unhandled rejection inside the `.catch()` callback, which the browser will still log) or `console.error`s in prod. Vue's own docs confirm the source list `onErrorCaptured`/`app.config.errorHandler` cover: "Component renders, Event handlers, Lifecycle hooks, `setup()` function, Watchers, Custom directive hooks, Transition hooks" — [vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler), [vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured) — neither page's prose calls out "promise rejections" by name, but the source above is unambiguous that the plumbing exists for exactly this case.

The catch: `creeptd-ng/web` wires **zero** `app.config.errorHandler` and zero `onErrorCaptured` (confirmed by this research program's earlier sweep, `promise-observability.md:398`). So today, an async `@click` handler in that app is *safe from crashing the tab* by construction, but a failure is still invisible to the player — it lands in the browser console only. The fix for that is wiring an error channel (already an open item under TS-ASYNC's own §10), not changing the handler shape.

This safety net is **structural to Vue's template compiler only**. `ocx-catalog/src/theme/components/detail/ReadmePane.vue:126` calls `document.createElement('button')` and `btn.addEventListener('click', async () => {...})` directly — a hand-rolled DOM API call that never passes through `createInvoker`, so `callWithAsyncErrorHandling` never runs. That callback has no internal `try`/`catch` either, so a rejection there becomes a genuine, framework-net-free unhandled promise rejection.

### 7. The DOM spec: `EventListener`'s return value is `undefined` by contract, and exceptions vs. rejections take different paths

The WHATWG DOM spec defines the callback interface with an `undefined` return type: `callback interface EventListener { undefined handleEvent(Event event); }` — there is no language anywhere in the spec that inspects or uses a listener's return value; whatever a listener returns (a `Promise` included) is simply discarded. [dom.spec.whatwg.org §2.7](https://dom.spec.whatwg.org/#callbackdef-eventlistener)

Two distinct failure paths exist for a listener body, and they matter for exactly this rule:

- **A synchronous `throw`** inside the listener's body is caught by the dispatch algorithm and routed through "report an exception" — i.e. surfaces as a global `error`/`window.onerror`-observable failure, immediately, during dispatch.
- **A rejected `Promise`** returned by an `async` listener does *not* go through that path at all — the listener already returned (a pending `Promise`) by the time it rejects, so dispatch has moved on. The rejection instead becomes an ordinary unhandled-rejection event on `globalThis`, governed by the HTML spec's cancelable `PromiseRejectionEvent`, whose only default action (if not canceled) is that the browser *may* log `event.reason` to the console — already established in this research program (`promise-observability.md`, finding 2).

This is the precise mechanism behind "an async DOM listener doesn't crash the page, but its failure is silent": the DOM spec's own exception-reporting step simply never sees it.

### 8. The fleet's three live violations, and its own three correct exemplars

**Violations** (grep for the TS-ASYNC-03 pattern plus manual identifier tracing):

| Site | Shape | Grep-catchable? | Framework net? |
|---|---|---|---|
| `fma/src/library/LibraryPage.tsx:91` | `onClick={async () => { await graphRepo.remove(r.id); await refresh(); }}` — inline, no `try`/`catch` | Yes | None (React 18, no boundary around this tree) |
| `fma/src/player/PlayerPage.tsx:180` → def. at `:119` | `onClick={onUseMic}`, where `onUseMic = async () => { try {...} catch {...} }` | **No** — bare identifier, `async` keyword is on a different line | Self-catches internally, but still a type-level violation |
| `ocx-catalog/src/theme/components/detail/ReadmePane.vue:126` | `btn.addEventListener('click', async () => { await clipboardCopy(...); ... })` — raw DOM call, no `try`/`catch` | Yes | None — bypasses Vue's `createInvoker` (§6) |

**Correct exemplars, already in the codebase** (all `useEffect`-adjacent, all shape (a)):

```ts
// fma/src/audio/sources/SpotifyPanel.tsx:18-26 — the gold standard: self-catching too
useEffect(() => {
  void (async () => {
    try {
      await maybeCompleteLogin();
      const t = await getValidToken();
      setAuthed(!!t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  })();
}, []);
```

`fma/src/player/PlayerPage.tsx:57-62` and `fma/src/library/LibraryPage.tsx:30-39` use the identical outer shape (non-`async` effect, `void`-discarded `async` IIFE) but omit the inner `try`/`catch` — correct at the *type* level (this is exactly what stops `tsc` from rejecting the `useEffect` call, §4) but still a gap under TS-ASYNC's separate `void`-is-not-a-handler rule, since an uncaught throw inside becomes an unhandled rejection with no framework net (React 18, no boundary).

A fourth, related-but-distinct pattern is worth flagging for the Handler Identifier Trace (rule 8 below): `LibraryPage.tsx:54`, `PlayerPage.tsx:178`, and `EditorPage.tsx:147` all bind `onChange={(e) => onImport(e.target.files?.[0])}`-shaped arrows, where the *inner* named function (`onImport`, `onPickFile`, `importJson`) is itself `async`. The outer arrow has an expression body, so it too returns `Promise<void>` — the same violation shape, one indirection deeper, and invisible to both the literal grep (no `async` token on that line) *and* a naive bare-identifier check (the JSX attribute's value isn't a bare identifier either — it's an inline non-`async` arrow that happens to return a promise). All three self-catch internally today, so they are not urgent, but they are the sharpest illustration of why this family needs type information, not a smarter regex, to close completely.

### 9. The maintainer's position: no per-callee leniency

A 2024 enhancement request asked `no-misused-promises` to allow whitelisting specific JSX attributes (motivated by `react-hook-form`'s `handleSubmit`, which the requester considered "safe" to hand directly to `onSubmit`). Maintainer `bradzacher` (typescript-eslint core team) rejected the premise outright:

> "The types are declared to accept a void returning function. So the rule is correct to report. Why is passing an async function in spite of the types correct? ... Why is this 'safe' when the types are not typed to accept a promise?"

The issue closed without a resolution after the requester didn't respond. [github.com/typescript-eslint/typescript-eslint#9930](https://github.com/typescript-eslint/typescript-eslint/issues/9930) The position is durable, not a one-off: the rule (and its newer sibling `strict-void-return`) checks the *type*, never the callee's actual behavior, and the team has declined to add an escape hatch for "trust me, this one self-catches" — which is exactly why `PlayerPage.tsx:180`'s self-catching `onUseMic` is still correctly flagged as a violation of the shape rule, even though it will never actually leak an unhandled rejection at runtime.

## Normative guidance candidates

1. **The replacement for TS-ASYNC-03's ban is a fixed shape, not a principle**: the outer function stays non-`async`; a `void`-discarded, self-catching `async` IIFE runs inside it.
   ```ts
   onClick={() => {
     void (async () => {
       try {
         await graphRepo.remove(r.id);
         await refresh();
       } catch (e) {
         setError(e instanceof Error ? e.message : String(e));
       }
     })();
   }}
   ```
   *Rationale*: this is the literal autofix `@typescript-eslint/strict-void-return` writes (`suggestWrapInAsyncIIFE`, verified from the installed `8.68.0` rule source), and the fleet's own `SpotifyPanel.tsx:18-26` is a live, correct instance of it.
   *Verify*: `no-misused-promises`/`strict-void-return` where TS-ASYNC-01 holds; otherwise rule 8's grep, plus the Handler Identifier Trace for bare references.

2. **A bare reference to an `async`-declared function may never be passed into a void-typed callback position — even one that already self-catches internally.** `onClick={onUseMic}` (`PlayerPage.tsx:180`/`:119`) is wrong regardless of `onUseMic`'s own `try`/`catch`, because nothing at the call site distinguishes a safe callee from an unsafe one, and typescript-eslint's own maintainer has explicitly declined to special-case "trust me" callees (§9).
   *Verify*: the Handler Identifier Trace (rule 8) — no single grep exists for this in an untyped repo.

3. **A DOM listener attached outside a template compiler (`element.addEventListener('...', async () => {...})`) must self-catch internally in addition to using shape 1 — it gets zero framework safety net.** `ReadmePane.vue:126` is the live counter-example: no receiver exists for a rejection there, Vue's own or otherwise.
   *Verify*: `rg -n "addEventListener\([^)]*async" src/` — every hit's callback body must contain `try`/`catch`.

4. **A Vue *template*-bound handler (`@click="method"`, not a raw `addEventListener` call) may be a plain `async` method with no wrapper — Vue's runtime already catches the rejection and routes it to `onErrorCaptured`/`app.config.errorHandler`, verified from Vue's own source.** This is conditional, not free: it requires one of those two to actually be configured, or the failure still only reaches the console.
   *Verify*: `grep -rn "app.config.errorHandler\|onErrorCaptured" src/` — currently zero hits in `creeptd-ng/web`; wiring one is a prerequisite tracked separately (`ts-async.md` §10), not part of this rule.

5. **`useEffect`/`onMounted`'s own callback must never be declared `async`.** Write a named `async` function inside the (still-synchronous) effect and call it immediately — React's own documented pattern — or use shape 1's anonymous IIFE.
   *Verify*: none needed for React — `tsc --noEmit` already rejects `useEffect(async () => {...})` unconditionally (verified, `TS2345`). This is the one position in this rule family where the compiler alone is sufficient.

6. **Do not add a shared `handle(fn)`/`safeHandler(fn)` wrapper utility at this fleet's current size.** It is functionally identical to shape 1 plus one more import, for ≤3 live sites across two SPAs today.
   *Verify*: `rg -c "void \(async \(\) =>" <spa>/src` per SPA — reconsider a shared wrapper only once one SPA's count crosses roughly a dozen sites that all need genuinely identical cross-cutting behavior (e.g., a single shared toast-on-failure call), which none does as of 2026-08-29.

7. **Where TS-ASYNC-01 holds, `checksVoidReturn` must stay fully enabled — never disable `attributes`/`arguments`/`variables` individually for convenience** — and when adopting type-aware linting anywhere, explicitly turn on `@typescript-eslint/strict-void-return: "error"` alongside `no-misused-promises`; it is not included by `strictTypeChecked`/`recommendedTypeChecked` as of `8.68.0` and is the only one of the two with an autofix suggestion for this bug.
   *Verify*: the flat config lists `strict-void-return` explicitly — its absence under `strictTypeChecked` means it is off, silently.

8. **In the 8 of 9 repos without type-aware linting, use a two-step procedure — name it the Handler Identifier Trace — because no single grep exists for the bare-reference case:**
   - Step 1 (mechanical, unchanged from TS-ASYNC-03): `rg -n 'on[A-Z]\w*=\{\s*async|addEventListener\([^)]*,\s*async|forEach\(async|\.map\(async|set(Timeout|Interval)\(\s*async' src/` must be empty (every `\.map\(async` hit must sit inside `Promise.all(`/`Promise.allSettled(` in the same expression).
   - Step 2 (reading, not mechanical): `rg -n 'on[A-Z]\w*=\{[A-Za-z_$][\w$]*\}' src/**/*.tsx` (React) / `rg -n '@[a-z]+="[A-Za-z_$][\w$]*"' src/**/*.vue` (Vue) lists every bare-identifier handler binding; for each captured name, `rg -n "(const|function) $NAME"` to its definition and check for the `async` keyword. Any hit is a violation of rule 2, full stop — no exception for a self-catching definition (§9).
   *Say so plainly*: step 2 has no mechanical replacement in an untyped repo — it requires symbol resolution, which is exactly what `no-misused-promises`/`strict-void-return` provide once type-aware linting is wired.

## AI-agent angle

- **The single most natural completion for "wire up a delete/save button" is `onClick={async () => {...}}` inline.** It compiles clean in every repo (§1), so a model gets no compiler signal and, in 8 of 9 repos, no lint signal either. Smallest check: `rg -n 'on[A-Z]\w*=\{\s*async'` — one line, zero tolerance.
- **A model asked to "clean up" or "extract" that same handler will often produce `const handleX = async () => {...}` and reference it by name — `onClick={handleX}`.** This *looks* like an improvement and is a common refactor an LLM volunteers unprompted, but it makes the violation invisible to the literal grep (no `async` token at the call site) while remaining exactly as wrong at the type level. This is the live `PlayerPage.tsx:180` shape. Only the Handler Identifier Trace (rule 8, step 2) catches it.
- **`useEffect(async () => {...})` is the one instinctive mistake that self-corrects.** A model will write it when asked for "load data on mount," `tsc` rejects it immediately with a specific, actionable message (`Type 'Promise<void>' is not assignable to type 'void | Destructor'`), and a model fixing that compile error typically lands on the correct named-inner-function or IIFE shape on its own — because the error message and React's own docs both point the same direction. No rule needs to police this position; verify it stayed fixed with a plain `tsc --noEmit`.
- **A model will assume "there's an ErrorBoundary/`app.config.errorHandler` somewhere, so this is covered" without checking.** False for React unconditionally (error boundaries never catch event-handler or async errors — established in `promise-observability.md`), and only conditionally true for Vue (§6) — and `creeptd-ng/web` has neither wired. Check: `grep -rln "ErrorBoundary\|componentDidCatch" <react-spa>/src` (expect zero, so the assumption is always false there) and `grep -rn "app.config.errorHandler\|onErrorCaptured" <vue-spa>/src` (expect zero today, so the assumption is false there too, for a different reason).
- **A model that internalizes "self-catching is enough" will treat `PlayerPage.tsx:119`'s `onUseMic` as already correct** because it does `try`/`catch` internally, and stop there. It is behaviorally safe but still fails the type-driven rule the tooling actually enforces (§9) — worth flagging explicitly in review since it is an easy, defensible-sounding false negative.
- **A model asked to fix "handle promise rejections in event handlers" is likely to reach for a shared `safeHandler()` utility unprompted** — it is the generically "correct-sounding" software-engineering answer. At this fleet's current volume (≤3 live sites, two SPAs) that is over-engineering; the smallest check that catches it is simply noticing a new cross-cutting utility file appear in a diff whose only callers are 1–2 handler sites (rule 6).

## Contested / evolving

- **`@typescript-eslint/strict-void-return` is genuinely new as of this research** — shipped in `8.68.0` (2026-08-24), five days before 2026-08-29, with its autofix suggestions landing in that same release (`#12086`). It is not yet in any preset config (`recommended`, `strict`, `*TypeChecked`) — only in `all` — so its trajectory is: watch for promotion into a default config in a future minor, but as of today it is opt-in-only and must be turned on by name. It is the more precise instrument for this exact bug (autofix included) and should be preferred over relying on `no-misused-promises` alone once a repo is type-aware.
- **React's answer has shifted structurally, not incrementally, with React 19's Actions** (stable since 2024-12-05) — the framework camp's position is now "solve it with a first-class API (`useTransition`/`useActionState`), not by disciplining every handler by hand." This fleet cannot act on that shift yet: `fma` is pinned to React `18.3.1`. Track it as a live decision gated on a future React major bump, not something to adopt today.
- **Vue never had this debate publicly the way React/typescript-eslint did** — `callWithAsyncErrorHandling` wrapping every template-bound handler has been part of Vue 3's reactivity system since 3.0, not a recent addition, so "is an async `@click` handler safe" was settled by Vue's own architecture from the start. The live open question for Vue is adoption-side only — whether `app.config.errorHandler` gets wired at all — not the handler shape.
- **The typescript-eslint maintainer team's stance against a per-callee escape hatch (§9) is unchanged since the issue closed in October 2024** and, if anything, has hardened: `strict-void-return`'s arrival generalizes the same no-exceptions philosophy to *all* value-returning functions in void positions, not just `Promise`-returning ones. No countervailing practitioner consensus toward loosening this was found as of 2026-08-29.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typescript-eslint.io/rules/no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) | Official rule docs | Current, `8.68.0` era | Defines `checksVoidReturn` and its six independent sub-options; the rule 8 of 9 fleet repos cannot run. |
| [typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) | Official rule docs | Current, `8.68.0` era | `ignoreVoid`/`ignoreIIFE` defaults; the sibling rule that governs the `void (async () => {...})()` shape itself. |
| [typescript-eslint.io/rules/strict-void-return](https://typescript-eslint.io/rules/strict-void-return) | Official rule docs | New — `8.68.0`, 2026-08-24 | The rule whose autofix (`suggestWrapInAsyncIIFE`) settles the "what shape" question directly. |
| `@typescript-eslint/eslint-plugin@8.68.0` npm tarball, `dist/rules/{no-misused-promises,strict-void-return}.js` + `dist/configs/flat/*.js` | Installed package source, inspected directly | Published 2026-08-24 | Ground truth for exact message ids, `hasSuggestions`, and which preset configs include which rule — more precise than the docs pages alone. |
| [github.com/typescript-eslint/typescript-eslint#9930](https://github.com/typescript-eslint/typescript-eslint/issues/9930) | Closed GitHub issue, maintainer thread | Opened/closed 2024 | Primary practitioner-vs-maintainer argument for a per-callee escape hatch, and the maintainer's explicit rejection of it. |
| [github.com/Microsoft/TypeScript/wiki/FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-functions-returning-non-void-assignable-to-function-returning-void) | Official TypeScript team FAQ | Current | The root-cause explanation for why this whole family of bugs compiles clean in the first place. |
| [react.dev/reference/react-dom/components/common](https://react.dev/reference/react-dom/components/common) | Official React docs | Current | Confirms event handler prop types are documented with no mention of `async`/`Promise` at all — the gap this research fills. |
| [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19) | Official React release blog | 2024-12-05 (React 19 stable) | The Actions/`useTransition`/`useActionState` mechanism — candidate (c) for React, unavailable to this fleet today. |
| [react.dev/learn/synchronizing-with-effects](https://react.dev/learn/synchronizing-with-effects) | Official React docs | Current | The documented "named async function inside a sync effect" pattern — same shape as the IIFE, applied to `useEffect` specifically. |
| [vuejs.org/guide/essentials/event-handling.html](https://vuejs.org/guide/essentials/event-handling.html) | Official Vue 3 docs | Current | Confirms Vue's own event-handling guide never discusses async/Promise handlers either — the doc gap mirrors React's. |
| [vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler) | Official Vue 3 docs | Current | The documented list of error sources `app.config.errorHandler` covers, including "Event handlers." |
| [vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured) | Official Vue 3 docs | Current | Same source list as `errorHandler`, component-local variant. |
| [github.com/vuejs/core — `errorHandling.ts`](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/errorHandling.ts) | Vue 3 runtime source, `main` branch | Current, cross-checked against the installed `vue@3.5.42` build | The actual mechanism (`callWithAsyncErrorHandling`, `createInvoker`) that makes Vue's docs claim true for async handlers specifically — not stated explicitly in the docs, verified in source. |
| [dom.spec.whatwg.org — `EventListener`](https://dom.spec.whatwg.org/#callbackdef-eventlistener) | WHATWG DOM Living Standard | Current | The spec-level contract: a listener's return value is `undefined`/ignored, and the "report an exception" path is for synchronous throws only. |
| `fma`, `ocx-catalog`, `creeptd-ng/web` source trees | This fleet's own code, read directly under `/home/mherwig/dev` | 2026-08-29 | Ground truth for the "three live instances" and the fleet's own three correct exemplars — a measurement beats a citation for a fleet-specific claim. |
| `vue@3.5.42` / `@vue/eslint-config-typescript@14.9.0` npm tarballs | Installed package sources, inspected directly | Published/current | Confirms the fleet's actual Vue runtime behavior and confirms `@vue/eslint-config-typescript` delegates to `typescript-eslint`'s own type-checked configs rather than defining its own promise rules. |

---
title: Unobserved promise rejections across the fleet's four runtime shapes
topic: ts-async-promise-observability
agent: promise-observability
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 14
scope: >
  What happens to an unobserved (unhandled) promise rejection in each of the
  fleet's four runtime shapes — Node CLI, Bun GitHub Action, VS Code extension
  host, browser SPA — and what a per-shape top-level guard and a `void`
  fire-and-forget rule should say. Does not cover fetch timeouts/AbortSignal,
  error-class taxonomy/`Error.cause`, or `Promise`-returning API design; those
  are separate research files.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Node.js: `unhandledRejection` is an `EventEmitter` event with a terminating default](#1-nodejs-unhandledrejection-is-an-eventemitter-event-with-a-terminating-default)
   2. [The browser: `unhandledrejection` is a cancelable `Event`, and cancellation is its only lever](#2-the-browser-unhandledrejection-is-a-cancelable-event-and-cancellation-is-its-only-lever)
   3. [Bun, verified by experiment: `bun run` mirrors Node, `bun test` catches but misattributes](#3-bun-verified-by-experiment-bun-run-mirrors-node-bun-test-catches-but-misattributes)
   4. [The VS Code extension host does not crash on a bare rejection — current source corrects the assumption](#4-the-vs-code-extension-host-does-not-crash-on-a-bare-rejection--current-source-corrects-the-assumption)
   5. [The fleet's own `void` rule, read off its two real gaps](#5-the-fleets-own-void-rule-read-off-its-two-real-gaps)
   6. [`forEach(async …)` and `.map(async …)` both pass `tsc --noEmit --strict` — verified](#6-foreachasync--and-mapasync--both-pass-tsc---noemit---strict--verified)
   7. [`Promise.all` vs `allSettled` vs `race`: the fleet's one exemplar and its stated reason](#7-promiseall-vs-allsettled-vs-race-the-fleets-one-exemplar-and-its-stated-reason)
   8. [The two CLIs' top-level guard: one `await`, a self-catching callee, no global listener](#8-the-two-clis-top-level-guard-one-await-a-self-catching-callee-no-global-listener)
   9. [The GitHub Action: `core.setFailed` is manual, and it runs under Node 24, not Bun](#9-the-github-action-coresetfailed-is-manual-and-it-runs-under-node-24-not-bun)
   10. [The two SPAs: React error boundaries and Vue's `errorHandler` do not catch this, and nothing fills the gap](#10-the-two-spas-react-error-boundaries-and-vues-errorhandler-do-not-catch-this-and-nothing-fills-the-gap)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Node.js terminates the process on an unobserved rejection by default, and has since **v15.0.0** (`--unhandled-rejections=throw`); this is `DEP0018`'s End-of-Life enforcement, not a warning any more. [nodejs.org/api/deprecations.html#dep0018](https://nodejs.org/api/deprecations.html#dep0018-unhandled-promise-rejections)
- `process` is a plain `EventEmitter`; `unhandledRejection` is one of its events, and Node's own default `unexpectedErrorHandler`-equivalent is "raise as uncaught exception" — attaching a listener is what *removes* the crash, not what adds one. [nodejs.org/api/process.html](https://nodejs.org/api/process.html#event-unhandledrejection)
- The browser's `unhandledrejection` is a **cancelable** `PromiseRejectionEvent` fired on `globalThis`; its only default action, if not canceled, is that the user agent *may* log `event.reason` to the console — there is no default action that terminates the tab or the app. [html.spec.whatwg.org §8.1.4.7](https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections)
- Verified by direct experiment (Bun 1.3.10, 2026-08-29): `bun run` matches Node's terminate-on-reject default exactly — crash, exit 1, no code after the rejection runs. `bun test` catches the rejection and fails **whichever test is executing when the rejection's microtask fires**, not necessarily the test that created it, then keeps running the rest of the suite; overall exit code 1.
- Current `microsoft/vscode` source (main branch) shows the shared extension host installs its **own** `process.on('unhandledRejection'/'uncaughtException')` guard, and routes both into an `ErrorHandler` that attributes the failure to the offending extension by stack-trace inspection and reports it — it does **not** crash the shared host process on a bare unhandled rejection. This corrects an assumption that such a rejection kills every extension's state until restart.
- `void` is safe fleet-wide exactly when the callee provably cannot reject: its whole body is wrapped in try/catch (self-catching), or a `.catch()` is chained onto that specific call before the `void`. Every real gap found is a `void` site missing both.
- Two real gaps, both matching the task's lead: `fma/src/audio/sources/SpotifyPlayer.ts:80` (`void getValidToken().then(...)`, no `.catch()`, and `getValidToken()` can reject) and `grimoire-vscode/src/extension.ts:507` (`void rebuildWatchers()`, an unguarded `async` arrow with no internal try/catch) — contrasted with the same file's `publishUpdateCount`/`checkForUpdates` (lines 601, 647), which fully self-catch and are safe to `void`.
- `array.forEach(async fn)` and `.map(async fn)` outside `Promise.all` both pass `tsc --noEmit --strict` cleanly (verified: TypeScript 5.9.3, exit 0) — only `@typescript-eslint/no-misused-promises` with `checksVoidReturn` catches the `forEach` shape.
- `@typescript-eslint/no-floating-promises` requires type-aware linting and, by default (`ignoreVoid: true`), treats `void expr` as fully handled regardless of whether the discarded promise can actually reject — it is a syntax check, not a "does this callee self-catch" check.
- Only 1 of 9 fleet repos (`setup-ocx`) has type-aware linting wired (`tseslint.configs.strictTypeChecked`, which includes both promise rules by default); it is also the only repo where `no-floating-promises`/`no-misused-promises` are structurally enforced today.
- The fleet's own coalescing-drain exemplar (`grimoire-vscode/src/extension.ts`, `refreshAll`, ~lines 185–210) answers "does one bad round poison the batch": per-round try/catch inside the drain loop, with an explicit comment that an earlier design let one throw discard every queued caller's promise.
- `Promise.allSettled` appears exactly once in fleet **production** code (`extension.ts:145`, inside `runRefresh`), with an inline comment giving the exact reason to prefer it over `Promise.all`: "one participant throwing must neither abort the others mid-round nor skip the self-heal below." Two further uses are test-only (`extension.test.ts:634`, `ocx-catalog/test/build/helpers.ts:94`). `Promise.race` appears nowhere fleet-wide.
- Every `.map(async …)` site fleet-wide (4 total, across `ocx-catalog`, `grimoire-vscode`) is correctly wrapped in `Promise.all(...)`; there are zero `forEach(async …)` sites — the AI-agent-characteristic bug is currently absent, so the rule's job is to keep it absent via a lint gate, not to fix existing code.
- Both CLIs (`ocx-catalog`, `grimoire-indexer`) use "one top-level `await`, self-catching callee" rather than a global `process.on('unhandledRejection')` listener: `ocx-catalog`'s bin wraps `await main()` in try/catch and remaps `CommanderError`s to a sysexits-derived exit code; `grimoire-indexer`'s `run()` wraps its own body around `program.parseAsync`, and its bin trusts that by design (its own comment: "the bin entry does nothing but call `run` and set `process.exitCode`").
- `setup-ocx` ships and **runs** its GitHub Action under Node 24 (`using: node24` in `action.yml`), even though Bun is its dev/build/test runtime (`bun scripts/build.ts`, `bun test`) — the production top-level guard people should read is Node's default-terminate semantics, wrapped by `run()`'s own try/catch into `core.setFailed`, not anything Bun-specific.
- React's official docs state explicitly that error boundaries do **not** catch async code, event handlers, or (by extension) promise rejections — only render errors. Vue's `app.config.errorHandler` catches render, event-handler, lifecycle, `setup()`, and watcher errors, but its own docs make no claim about unhandled promise rejections. Both fleet SPAs (`fma`, `creeptd-ng/web`) have zero `window.addEventListener('unhandledrejection', …)`, zero error boundaries, and zero `errorHandler` — a genuine, previously-unflagged gap for these two shapes.
- `Promise.all` vs `allSettled` vs a bounded/limited map is a judgment call gated on one question — must a sibling's rejection abort the others, or must every participant run regardless? — not a blanket rule; the fleet has zero instances of a concurrency-*limited* map (e.g. a semaphore/`p-limit` pattern) applied to error-tolerance rather than throughput, so that third axis is out of scope for a normative rule here.

## Findings

### 1. Node.js: `unhandledRejection` is an `EventEmitter` event with a terminating default

`process` is an instance of Node's `EventEmitter`, and `'unhandledRejection'` is one of its events — attaching a listener is ordinary `process.on('unhandledRejection', fn)`. The documentation is explicit that the *absence* of a listener is what crashes the process: "If an `'unhandledRejection'` event is emitted but not handled it will be raised as an uncaught exception." [nodejs.org/api/process.html#event-unhandledrejection](https://nodejs.org/api/process.html#event-unhandledrejection)

The exact behavior is controlled by `--unhandled-rejections=mode`, added in v12.0.0/v10.17.0, with the default changed to `throw` in **v15.0.0** (previously a warning was emitted). Fetched verbatim from the current docs:

> `throw`: Emit `unhandledRejection`. If this hook is not set, raise the unhandled rejection as an uncaught exception. **This is the default.**
> `strict`: Raise the unhandled rejection as an uncaught exception. If the exception is handled, `unhandledRejection` is emitted.
> `warn`: Always trigger a warning, no matter if the `unhandledRejection` hook is set or not, but do not print the deprecation warning.
> `warn-with-error-code`: Emit `unhandledRejection`. If this hook is not set, trigger a warning, and set the process exit code to 1.
> `none`: Silence all warnings.

[nodejs.org/api/cli.html#--unhandled-rejectionsmode](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode)

This is exactly `DEP0018`: runtime-deprecated since **v7.0.0**, End-of-Life (enforced, non-optional without the flag) since **v15.0.0**. [nodejs.org/api/deprecations.html#dep0018](https://nodejs.org/api/deprecations.html#dep0018-unhandled-promise-rejections) The fleet's own Node floors (`>=20`, `>=20.19`, `>=22.14.0`, `>=24`, per each `package.json`'s `engines.node`) are all comfortably past v15 — every Node-hosted shape in the fleet inherits the crash-by-default behavior with no override anywhere (`grep -rn "unhandled-rejections\|process.on('unhandledRejection'" ` across the fleet returns zero hits outside VS Code's own bundled source).

### 2. The browser: `unhandledrejection` is a cancelable `Event`, and cancellation is its only lever

The WHATWG algorithm ("notify about rejected promises", §8.1.4.7) fires a `PromiseRejectionEvent` named `unhandledrejection` at the global object for every still-unhandled promise in its "about-to-be-notified" list, **with `cancelable` initialized to `true`**:

> Let `notCanceled` be the result of firing an event named `unhandledrejection` at `global`, using `PromiseRejectionEvent`, with the `cancelable` attribute initialized to true, the `promise` attribute initialized to `p`, and the `reason` attribute initialized to `p.[[PromiseResult]]`. If `notCanceled` is true, then the user agent **may** report `p.[[PromiseResult]]` to a developer console.

[html.spec.whatwg.org §8.1.4.7](https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections)

That "may" is the entire default action — there is no browser-spec-defined behavior that terminates the page, aborts pending work, or crashes the tab. `event.preventDefault()` suppresses the console log; omitting a listener entirely just means the console log happens. `event.reason` / `event.promise` carry the rejection; a companion `rejectionhandled` event fires if a `.catch()` is attached *late* (after the `unhandledrejection` notification already fired), letting an observer retract a false-positive report. [MDN Window: unhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)

This is the sharpest cross-shape contrast in this report: **Node/Bun treat an unobserved rejection as fatal; the browser treats it as informational.** A rule written for one shape does not transfer to the other without restating its premise.

### 3. Bun, verified by experiment: `bun run` mirrors Node, `bun test` catches but misattributes

Bun's own docs page for `bun test` says nothing about `unhandledRejection` handling — fetched and confirmed silent on the topic, covering only per-test timeouts (default 5000 ms) and exit-code-on-failure. [bun.sh/docs/cli/test](https://bun.sh/docs/cli/test) The task brief describes a "documented to swallow" claim; no primary source for that claim was locatable this session (see [Contested / evolving](#contested--evolving)). What follows is what Bun 1.3.10 actually does, verified by running it.

**`bun run` (plain script execution) — matches Node's default exactly:**

```js
// run1.js
console.log("before");
Promise.reject(new Error("boom-run"));
setTimeout(() => console.log("after-timeout"), 50);
```

```
$ bun run1.js
before
1 | console.log("before");
2 | Promise.reject(new Error("boom-run"));
                       ^
error: boom-run
      at run1.js:2:20
Bun v1.3.10 (Linux x64)
$ echo $?
1
```

`after-timeout` never prints — the process is torn down before the timer fires, identical to Node's own `--unhandled-rejections=throw` behavior on the same script. A `process.on('unhandledRejection', …)` listener suppresses the crash in Bun exactly as it does in Node (verified: both runtimes print the handled reason, run the timer, and exit 0).

**`bun test` — catches the rejection, but attributes it to the wrong test if timing shifts it:**

```js
// test2.test.js
test("test that leaks a rejection past its own boundary", () => {
  setTimeout(() => {
    Promise.reject(new Error("leaked-after-test-returns"));
  }, 10);
  expect(1).toBe(1);
});

test("second test runs after, well past the 10ms", async () => {
  await new Promise((r) => setTimeout(r, 100));
  expect(2).toBe(2);
});
```

```
$ bun test test2.test.js
(fail) second test runs after, well past the 10ms [10.28ms]
error: leaked-after-test-returns
 1 pass
 1 fail
Ran 2 tests across 1 file. [18.00ms]
$ echo $?
1
```

The rejection was created inside the **first** test but its timer fires 10 ms later, while the **second** test's own `await` is pending — Bun's test runner attributes the failure to whichever test is on the stack when the rejection surfaces, not the one that created the promise. The suite does not abort; every test still runs, and the overall exit code is 1. This misattribution — not a swallow — is the real gotcha for a normative rule: a rejection created in test A but only observed during test B's `await` will fail B, not A, in the runner's report.

A synchronous, same-tick rejection (`Promise.reject(...)` with no timer, directly inside the test body) is caught and correctly attributed to its own test — verified separately.

Bun's environment here has no fleet-pinned version (`setup-ocx/bun.lock` and `package.json` carry no `engines.bun`/`packageManager` pin); 1.3.10 is simply what is installed in this research environment. Treat the exact numbers above as tied to that version, not as a fleet-locked guarantee.

### 4. The VS Code extension host does not crash on a bare rejection — current source corrects the assumption

The task brief's premise — an uncaught rejection terminates the shared host and kills every extension's state until restart — does not match current `microsoft/vscode` source. Fetched directly from the repo (`main` branch, no numbered release pinned by this read):

`src/vs/workbench/api/node/extensionHostProcess.ts` installs its own top-level guards before any extension activates:

```ts
// startExtensionHostProcess()
const unhandledPromises: Promise<any>[] = [];
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  unhandledPromises.push(promise);
  setTimeout(() => {
    const idx = unhandledPromises.indexOf(promise);
    if (idx >= 0) {
      promise.catch(e => {
        unhandledPromises.splice(idx, 1);
        if (!isCancellationError(e)) {
          console.warn(`rejected promise not handled within 1 second: ${e}`);
          if (reason) onUnexpectedError(reason);
        }
      });
    }
  }, 1000);
});
process.on('rejectionHandled', (promise) => { /* removes it from the pending list */ });
process.on('uncaughtException', function (err: Error) {
  if (!isSigPipeError(err)) onUnexpectedError(err);
});
```
[extensionHostProcess.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/node/extensionHostProcess.ts)

That `1000`-ms grace window is a deliberate late-catch allowance, structurally the same idea as the browser's `rejectionhandled` event. `onUnexpectedError` routes into `ErrorHandler.installFullHandler` (`src/vs/workbench/api/common/extensionHostMain.ts`), which walks the V8 stack trace to find which extension's file the error originated in, then reports it **per-extension**:

```ts
errors.setUnexpectedErrorHandler(err => {
  logService.error(err);
  const errorData = errors.transformErrorForSerialization(err);
  const extension = err instanceof ExtensionError ? err.extension
    : extensionErrors.get(err)?.extensionIdentifier;
  if (!extension) return;
  mainThreadExtensions.$onExtensionRuntimeError(extension, errorData);
  extensionTelemetry.onExtensionError(extension, err);
});
```
[extensionHostMain.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extensionHostMain.ts)

None of this rethrows or calls `process.exit`. The underlying `errors.ts` default handler (used only before this full handler installs, i.e. very early in boot) does `setTimeout(() => { throw e }, 0)` — but by the time any extension code runs, `installFullHandler` has already replaced it with the logging/attribution path above. [errors.ts](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/errors.ts)

**What this means for the rule:** the *architectural* risk the task's premise gestures at is real — every extension in a window does share one Node.js process, so a genuine process-level failure (native crash, stack overflow, OOM) does take every extension down together. But a plain unhandled promise rejection is not that failure mode: VS Code's own top-level guard converts it into a per-extension-attributed log entry and telemetry event, survivable indefinitely. The practical consequence for an extension author is different from "you must crash-proof the host" — it is "an unobserved rejection in your extension will be silently logged and blamed on you specifically, with no user-visible signal," which is a debuggability problem, not a stability one. `rebuildWatchers`'s gap (§5) is exactly this: no crash, just a `grim_home`-context feature quietly failing to arm, one log line deep in the Output panel nobody reads.

### 5. The fleet's own `void` rule, read off its two real gaps

Fleet-wide, `void ` fire-and-forget markers concentrate in the two extensions (20 in `grimoire-vscode/src/extension.ts`, plus more across `vscode-ocx`) and are otherwise almost absent — `ocx-catalog` has zero, `grimoire-indexer` has exactly one. Reading every site by what its callee actually does splits them cleanly into two groups.

**Safe — the callee cannot reject:**

```ts
// grimoire-vscode/src/extension.ts:601, self-catching body
const publishUpdateCount = async (): Promise<void> => {
  try {
    const snap = await scopes.snapshot();
    // ...
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`update count failed: ${message}`);
  }
};
void publishUpdateCount();   // safe: the try/catch above guarantees no rejection escapes
```

`checkForUpdates` (line 647) follows the identical shape. `grimoire-indexer/src/cli/dev.ts:60` reaches the same safety a different way — a `.catch()` chained onto the specific call before `void`:

```ts
void server.stop().catch(() => {}).finally(resolve);   // safe: .catch() absorbs any rejection
```

**Real gaps — the callee can reject and nothing catches it:**

```ts
// grimoire-vscode/src/extension.ts:507
const rebuildWatchers = async (): Promise<void> => {
  const known = scopes.cachedSnapshot()?.global?.context.grim_home;
  const ctx = await scopes.run<ContextInfo>(contextArgs(), 'global');   // can reject — no try/catch
  if (!ctx.ok) {
    output.appendLine(`watchers: global context probe failed (${ctx.message})`);
  }
  watchers.rebuild(/* ... */);   // can throw synchronously — still inside the async fn, still unguarded
};
void rebuildWatchers();
```

```ts
// fma/src/audio/sources/SpotifyPlayer.ts:80
getOAuthToken: (cb) => { void getValidToken().then((t) => { if (t) cb(t); }); },
```

`getValidToken()` (`fma/src/audio/sources/SpotifyAuth.ts`) can reject: it awaits `fetch(TOKEN_URL, …)` and does `if (!res.ok) throw new Error(...)` on a failed token refresh. The `.then()` chain has no second argument and no `.catch()`; `void` discards the promise `.then()` returns, so a token-refresh failure becomes a genuine unobserved rejection in the browser tab — logged to console per §2, but silently: the Spotify SDK's `getOAuthToken` callback never fires, playback quietly never starts, and nothing in the UI says why.

**The rule this reads off directly:** `void expr` is permitted if and only if `expr`'s promise cannot reject by construction — either the callee's entire body is wrapped in try/catch (self-catching), or a `.catch()` is chained onto that exact call before `void` is applied. `void` by itself documents *intent* ("this is deliberately unawaited") but attaches no handler — treating it as sufficient on its own is the mistake both gaps make.

### 6. `forEach(async …)` and `.map(async …)` both pass `tsc --noEmit --strict` — verified

```ts
function run(items: number[]): void {
  items.forEach(async (x) => { await doThing(x); });   // never awaited — forEach ignores return values
  items.map(async (x) => { await doThing(x); });        // never awaited either, unless the array itself is awaited
}
```

```
$ ./node_modules/.bin/tsc --noEmit --strict --target es2022 --lib es2022 forEachAsync.ts
$ echo $?
0
```
(TypeScript 5.9.3, matching the fleet's newest pinned `^5.9.3` in `ocx-catalog`.) Neither shape is a type error — `Array.prototype.forEach`'s callback is typed to return `void`, and an `async` function's return type (`Promise<void>`) is structurally assignable to `void` in TypeScript's callback-position bivariance, so this compiles clean at every strictness level. The only thing that flags it is `@typescript-eslint/no-misused-promises`'s `checksVoidReturn` (default `true`), which is type-aware and specifically targets "a `Promise`-returning function passed where a `void`-returning callback is expected":

Incorrect (per the rule's own docs):
```ts
[1, 2, 3].forEach(async value => {
  await fetch(`/${value}`);
});
```
Correct:
```ts
for (const value of [1, 2, 3]) {
  await doSomething(value);
}
```
[typescript-eslint.io/rules/no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/)

Fleet-wide, this specific bug shape is currently **absent** — every `.map(async …)` site (`ocx-catalog/src/build/pages.ts:213`, `ocx-catalog/test/build/engine_real_build.test.ts:94`, `grimoire-vscode/src/detailsCache.ts:190,235`) is wrapped in `Promise.all(...)`, and `grep -rn "forEach(async"` returns zero hits fleet-wide. The rule's job here is prevention, not remediation.

`checksVoidReturn` has independent sub-toggles (`arguments`, `attributes`, `properties`, `returns`, `variables`, `inheritedMethods`) that narrow which call *positions* it checks; all default `true`. `no-floating-promises` is the companion rule for a promise used as a bare statement — its own incorrect/correct pair:

```ts
// incorrect
returnsPromise().then(() => {});                 // no rejection handler
[1, 2, 3].map(async x => x + 1);                 // array of promises, not awaited/wrapped

// correct
returnsPromise().then(() => {}, () => {});       // handles both cases
await Promise.all([1, 2, 3].map(async x => x + 1));
```
[typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/)

Both rules require `parserOptions.project` (type-aware linting). Fleet-wide, exactly 1 of 9 repos (`setup-ocx`) has this wired — via `tseslint.configs.strictTypeChecked`, which pulls in both rules at their default (error) severity. `setup-ocx`'s own `void run();` top-level call (§9) is exactly the shape `no-floating-promises`'s default `ignoreVoid: true` was designed to permit.

### 7. `Promise.all` vs `allSettled` vs `race`: the fleet's one exemplar and its stated reason

`grimoire-vscode/src/extension.ts:145`, inside `runRefresh`, is the fleet's only production `Promise.allSettled` and carries an inline comment stating exactly why it was chosen over `Promise.all`:

```ts
// allSettled, not all: one participant throwing must neither abort the others
// mid-round nor skip the self-heal below (an install's refresh that arms the
// freshly-downloaded grim's watchers relies on it). Each rejection is logged,
// never silently swallowed.
const results = await Promise.allSettled([
  sidebar.refresh(options),
  details.refreshOpenPanels(options),
  settings.refreshOpenPanel(),
]);
for (const result of results) {
  if (result.status === 'rejected') {
    const reason: unknown = result.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    output.appendLine(`refresh participant failed: ${message}`);
  }
}
```

This is the fleet's answer to "must a sibling's failure abort the batch": here, no — each of the three panels is independent UI state, and letting one throw would deny the other two their refresh over an unrelated failure. `Promise.all` remains the fleet's default for everything else (34 total `Promise.all`/`allSettled`/`race` call sites fleet-wide; only this one, plus two test-file uses, choose `allSettled`). `Promise.race` appears nowhere. There is no bounded/concurrency-*limited* map pattern (a semaphore/`p-limit`-style gate) applied for error-tolerance reasons anywhere in the fleet — `ocx-catalog/src/build/pages.ts` does use a `Semaphore` inside a `Promise.all(...map(async …))`, but that gate is a concurrency cap on filesystem writes, not an error-isolation mechanism, and every task inside it still propagates its rejection through the outer `Promise.all` normally.

### 8. The two CLIs' top-level guard: one `await`, a self-catching callee, no global listener

Neither CLI uses `process.on('unhandledRejection', …)` (zero hits fleet-wide). Both instead rely on the fact that their entire execution is a single `await`ed call chain, closed with a synchronous try/catch at the bin entry:

```ts
// ocx-catalog/src/cli/index.ts — the actual #!/usr/bin/env node entry
try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = FAIL;
}
```
`main()` itself further separates commander's own already-reported errors from genuine ones:
```ts
// ocx-catalog/src/cli/main.ts
try {
  await program.parseAsync(argv as string[]);
} catch (err) {
  if (!(err instanceof CommanderError)) throw err;   // real errors keep propagating up to index.ts
  process.exitCode = err.exitCode === 0 ? OK : USAGE;
}
```

```ts
// grimoire-indexer/src/cli/index.ts — comment states the contract explicitly
// "Argument parsing and the single place errors become exit codes. The bin
//  entry (index.ts) does nothing but call `run` and set `process.exitCode`."
process.exitCode = await run(process.argv);
```
`run()` itself wraps its own body's `program.parseAsync` in try/catch and maps every error class to a `sysexits`-derived code before returning — so by the time `index.ts` awaits it, `run()` is a self-catching callee in exactly the §5 sense, and the bare `await` with no surrounding try/catch is correct, not a gap.

`ocx-catalog`'s exit codes (`src/cli/exit.ts`) are a concrete `sysexits.h`-derived convention worth citing as the pattern to preserve: `OK=0`, `FAIL=1`, `USAGE=64`, `DATA=65` ("schema/drift mismatch"), `UNAVAILABLE=69`. A bare Node crash from an unobserved rejection would report a generic non-zero code with a raw V8 stack trace instead of one of these — the value of the top-level try/catch is precisely that it keeps every failure inside this CLI's own vocabulary.

**The generalizable shape:** for a program whose entire execution is one `await`ed call, a top-level try/catch around that call is a complete guard *only as long as the codebase has zero un-self-caught `void` fire-and-forget calls* (verified true today for both CLIs — `ocx-catalog` has none, `grimoire-indexer`'s one instance already self-catches). A global `process.on('unhandledRejection')` listener would be pure defense-in-depth against a future regression of that invariant, not a substitute for enforcing it via lint (see [Normative guidance](#normative-guidance-candidates) #3).

### 9. The GitHub Action: `core.setFailed` is manual, and it runs under Node 24, not Bun

`setup-ocx/action.yml` declares `using: node24` — the Action itself executes under the Actions runner's bundled Node 24, not Bun, at production time. Bun is this repo's dev/build/test tool only (`"build": "bun scripts/build.ts"`, `"test": "bun test"` in `package.json`). The §3 Bun findings therefore describe local dev/CI-test behavior for this repo, not the Action's own runtime guard — that guard is Node's default terminate-on-unhandled-rejection (§1), same as the CLIs.

```ts
// setup-ocx/src/setup.ts
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(error.message);
  } else {
    core.setFailed("An unexpected error occurred");
  }
}
void run();
```

`@actions/toolkit`'s own README shows the identical manual pattern and states plainly that an unset status "will lead to a success" — nothing in the toolkit auto-wires an unhandled-rejection listener to `core.setFailed`:

```js
const core = require('@actions/core');
try {
  // Do stuff
} catch (err) {
  core.setFailed(`Action failed with error ${err}`);
}
```
[github.com/actions/toolkit — packages/core README](https://github.com/actions/toolkit/blob/main/packages/core/README.md)

This is the same self-catching-callee shape as §5/§8: `run()`'s own body fully absorbs every error into `core.setFailed`, so `void run();` at module scope is safe by the same rule that makes `void publishUpdateCount()` safe — not because GitHub Actions' runtime does anything special with unhandled rejections. Without that try/catch, an unhandled rejection here would crash under Node 24's default `throw` mode (§1) with a raw stack trace in the Action's log instead of a clean `::error::` annotation, and `core.setFailed` would never run.

### 10. The two SPAs: React error boundaries and Vue's `errorHandler` do not catch this, and nothing fills the gap

React's current docs are explicit and give the exact list of what an error boundary (`static getDerivedStateFromError` + `componentDidCatch`) does **not** catch:

> Error boundaries do not catch errors for: event handlers … server side rendering … errors thrown in the error boundary itself … **asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks)**; an exception is the `startTransition` function …

[react.dev/reference/react/Component](https://react.dev/reference/react/Component)

A promise rejection is exactly the excluded "asynchronous code" case — an error boundary around `<App />` will not see it. React's docs additionally note there is no function-component equivalent of a class-based error boundary and point to the third-party `react-error-boundary` package as the alternative, which is itself still scoped to render errors.

Vue's `app.config.errorHandler` catches a wider surface — component renders, event handlers, lifecycle hooks, `setup()`, watchers, custom directive hooks, transition hooks — but its own reference docs make no claim about unhandled promise rejections, and Vue's documented default behavior for an uncaught error is environment-split: **re-thrown in development** (can crash the app), **logged to console only in production**, gated by `app.config.throwUnhandledErrorInProduction`. [vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler) None of that surface is "a promise rejected with nothing awaiting it" — Vue's own reactive `watch`/`watchEffect` async errors are captured because Vue wraps the callback itself, not because a bare unobserved rejection is generically caught.

Fleet-wide: zero `ErrorBoundary`/`componentDidCatch`, zero `app.config.errorHandler`/`onErrorCaptured`, and zero `window.addEventListener('unhandledrejection', …)` in either `fma` or `creeptd-ng/web` (`grep -rln` across both trees, all patterns, returns nothing). `fma/src/main.tsx` mounts `<App />` directly with no boundary of any kind. This is a genuine gap for the two SPA shapes — not one of the task brief's pre-established "already clean" areas — and §5's `SpotifyPlayer.ts:80` gap is a live instance of exactly this: nothing downstream would have caught it even if it had been wrapped in a `<ErrorBoundary>`, because it never gets there.

## Normative guidance candidates

1. **`void expr;` is permitted only when `expr`'s promise cannot reject** — either the callee's entire body is wrapped in try/catch (self-catching), or a `.catch()` is chained onto that exact call before `void`. **Rationale:** `void` marks intent, not safety; `no-floating-promises`'s default `ignoreVoid: true` will not tell you the callee can still reject. **Verify:** for every `void <call>()` site, read the callee's full body for an unguarded `await`/throw with no surrounding try/catch and no `.catch()` on the chain (the check that finds `extension.ts:507` and `SpotifyPlayer.ts:80`); a `no-floating-promises` finding with `ignoreVoid: true` will not surface this on its own, so this is a reading heuristic, not a lint.
2. **A self-catching async function's body must convert every thrown/rejected value to a logged message before returning — never let it propagate past its own boundary.** **Rationale:** this is what makes `void fn()` safe at every call site fleet-wide (`publishUpdateCount`, `checkForUpdates`, both CLIs' `run()`, `setup-ocx`'s `run()`); it is the one pattern that repeats across all four shapes. **Verify:** grep the function body for a `try { ... } catch` (or `.catch(`) that wraps *every* `await`/throwing statement, not just the first one; a `try` that returns early without covering a later `await` in the same function is not self-catching.
3. **Where type-aware linting is available, turn on `@typescript-eslint/no-floating-promises` and `no-misused-promises` (`checksVoidReturn: true`) at error severity; where it is not (8 of 9 repos today), a `process.on('unhandledRejection', …)`/`window.addEventListener('unhandledrejection', …)` top-level backstop is defense-in-depth, not a substitute.** **Rationale:** these are the only two mechanical checks that catch a `.forEach(async …)`/floating-promise regression before it ships, and `tsc` alone (even `--strict`) does not (§6, verified); the fleet has zero instances of the bug today, so the rule's job is to keep it that way. **Verify:** `grep -c 'strictTypeChecked\|projectService\|parserOptions.*project' eslint.config.*` per repo — currently `1/9` (`setup-ocx`); `eslint . 2>&1 | grep -c 'no-floating-promises\|no-misused-promises'` should stay `0`.
4. **A CLI whose entire execution is one `await`ed call chain needs only a bin-level `try { await main(); } catch { … }` — provided nothing in that chain does an un-self-caught `void`.** **Rationale:** both fleet CLIs already do this (§8) and it is sufficient exactly because both currently have zero unguarded `void` sites; the guard's completeness is contingent on rule #1 holding, not independent of it. **Verify:** confirm the bin entry point has exactly one top-level `await` inside a try/catch, and cross-check with rule #1's grep for any `void` call in the same codebase.
5. **A GitHub Action's `main()`/`run()` must be the single self-catching function described in rule #2, ending every catch branch in `core.setFailed(...)`, with `void run();` (or an equivalent top-level `await`) as the only call site.** **Rationale:** the Actions toolkit does not auto-wire an unhandled-rejection-to-`setFailed` bridge (§9, confirmed against the toolkit's own README); without this, a rejection crashes under the Actions runner's Node default with a raw stack trace instead of a clean `::error::` annotation, and no exit-code contract is honored. **Verify:** the Action's entry file ends in `catch (error) { core.setFailed(...) }`; `grep -n "using: node" action.yml` to confirm which runtime the guard actually needs to survive under (do not assume it matches the repo's dev-time runtime, per §9).
6. **A VS Code extension's activation-time `void <asyncFn>()` calls must each be self-catching (rule #2) — do not rely on the extension host's own guard as your error handling.** **Rationale:** the host's guard (§4) prevents a *crash*, but it does not prevent a *silent feature failure*: it logs "rejected promise not handled within 1 second" to a channel almost nobody reads and attributes the error to your extension with no user-visible signal — exactly `rebuildWatchers`'s current failure mode. **Verify:** for every `void <call>()` at extension activation, confirm the callee's body matches rule #2; a passing `tsc --noEmit` proves nothing here (§6).
7. **In a browser SPA, do not reach for a React error boundary or Vue's `app.config.errorHandler` to catch a promise rejection — neither is designed to see it (§10, both official docs confirmed).** Install `window.addEventListener('unhandledrejection', …)` explicitly if the SPA wants any observability here at all; today, neither fleet SPA has either mechanism. **Rationale:** an LLM asked to "add error handling" around async UI code will very plausibly reach for the boundary/handler it already has in scope, producing code that silently does nothing for this specific failure class. **Verify:** `grep -rn "ErrorBoundary\|componentDidCatch\|errorHandler\|onErrorCaptured" src/` finding a hit is not evidence a rejection is handled; separately require `grep -rn "unhandledrejection" src/` to have at least one hit if the app makes any unguarded async calls.
8. **Choose `Promise.all` vs `Promise.allSettled` by one question: must one participant's rejection abort the others, or must every participant run to completion regardless?** Default to `Promise.all` (the fleet's own default, 34:1 over `allSettled` in production code); reach for `allSettled` only when siblings are independently-recoverable units of work and an early abort would deny the others their turn for an unrelated reason (`extension.ts:145`'s own stated rationale). This is a judgment call, not a lint-enforceable rule — do not write a lint for it. **Verify:** for a `Promise.allSettled` call, the surrounding code (or its own comment) should say, in effect, "each participant is independent and every rejection is logged, never silently swallowed" — if it instead just iterates results and does nothing with a `rejected` status, that is a strictly-worse `Promise.all` with extra steps, and the reviewer should ask why `allSettled` was chosen.
9. **`Promise.race` has zero legitimate uses fleet-wide today; treat a new one as a request for design review, not a routine merge.** **Rationale:** its only common legitimate use (a timeout race) is already the fleet's own separately-tracked fetch-timeout gap (13/14 fetch sites with no `AbortSignal`), and introducing `Promise.race` without also handling the loser's eventual settlement is a fresh unhandled-rejection source (the loser's promise, if it later rejects, has no `.catch()` unless the winner branch's code adds one). **Verify:** `grep -rn "Promise.race("` — any hit should have an accompanying reading pass confirming the losing branch's eventual settlement is still observed somewhere.
10. **`.map(async fn)` is permitted only inside `Promise.all(...)`/`Promise.allSettled(...)`; `.forEach(async fn)` is never permitted.** **Rationale:** `forEach` structurally discards every return value, so an `async` callback there can never be awaited by any mechanism — it is a strictly worse `.map(...)` with no upside; `tsc` alone will not catch either shape (§6, verified). **Verify:** `no-misused-promises` with `checksVoidReturn` (type-aware — see rule #3's rollout gate) is the mechanical check; absent that, `grep -rn "forEach(async" src/` should always return zero, and every `.map(async` hit should have `Promise.all(` or `Promise.allSettled(` within the preceding few lines.
11. **Do not add a blanket `process.on('unhandledRejection', () => {})` (or the equivalent bare `console.error`-and-continue pattern) as a response to a linter finding.** **Rationale:** this converts a compile-time-catchable bug into a runtime-silent one, defeats rule #3's lint gate's entire purpose, and — per §4's VS Code precedent — even sophisticated existing consumers that install a top-level guard still use it to *attribute and report*, never to swallow. **Verify:** any new `process.on('unhandledRejection'` / `window.addEventListener('unhandledrejection'` site should log with enough context to find the offending call site (stack, a request/extension id, etc.), not just the bare reason string.

## AI-agent angle

- **Reaching for a React `ErrorBoundary` or Vue `app.config.errorHandler` to "add error handling" around new async UI code.** Both are trained-on, idiomatic-looking patterns that compile and *look* like the right answer, and both officially do not catch promise rejections (§10). **Smallest check:** a boundary/handler addition in the same diff as a new unguarded `await`/`.then()` chain, with no accompanying `window.addEventListener('unhandledrejection', …)` or explicit `.catch()`, is very likely non-functional for the case it was added for — flag it in review.
- **`array.forEach(async fn)` for "run these concurrently."** It reads naturally as parallel-map idiom and passes `tsc --noEmit --strict` cleanly (§6, verified) — nothing in the type system stops it. **Smallest check:** `grep -rn "forEach(async"`; zero tolerance, no exceptions (rule #10).
- **`void` used to silence a linter or a red squiggle without checking whether the callee can reject.** `no-floating-promises`'s default `ignoreVoid: true` makes `void` look like "the fix" for any floating-promise warning, regardless of whether the callee self-catches (§5, §6) — an agent pattern-matching on "add `void` to make the warning go away" will happily paper over a real gap this way, and it is indistinguishable at a glance from a legitimate use (`rebuildWatchers` and `publishUpdateCount` look identical from the call site alone; the difference is entirely inside the callee). **Smallest check:** rule #1's reading heuristic — there is no lint for this distinction, so it needs a human/reviewer pass on every new `void <call>()` site, not just a green CI run.
- **Assuming a top-level `process.on('unhandledRejection', …)` (or a Bun/VS Code equivalent) is a complete safety net, so any `void` anywhere is fine.** It is not: Node's default listener-attached behavior only prevents a *crash* — it still requires the handler to do something useful with the reason, and per §4/§6 a well-designed guard (VS Code's own) still attributes and logs rather than silently continuing. An agent that adds a blanket handler and calls the task done has satisfied the letter of "don't crash" while producing exactly the failure mode rule #11 warns against. **Smallest check:** any new global rejection handler should be reviewed for what it *does* with the reason, not just whether it exists.
- **Assuming GitHub Actions' `@actions/toolkit` auto-wires unhandled rejections to `core.setFailed()`.** It does not (§9, confirmed against the toolkit's own README) — an agent that writes `void run();` without first verifying `run()`'s body ends every catch branch in `core.setFailed` will ship an Action that crashes with a raw Node stack trace on any unhandled rejection instead of a clean annotated failure. **Smallest check:** `grep -n "core.setFailed" <entry file>` should appear inside a `catch` block that wraps the entire top-level `run()`/`main()` body, not a partial one.
- **Assuming Bun's test runner behaves exactly like Node's plain script runner, or exactly like Jest/Vitest, for an unhandled rejection.** Neither assumption is safe: `bun test` catches and fails a test (unlike Node's plain-script crash, §1/§3) but attributes the failure to whichever test is executing when the rejection surfaces, which can be the *wrong* test if the rejection was created earlier and only rejects later via a timer (§3, verified) — an agent debugging a `bun test` failure by looking only at the failing test's own body, without also checking for a rejection created by a *sibling* test, will misdiagnose the bug. **Smallest check:** when a `bun test` failure's stack trace does not obviously originate in the failing test's own body, grep the same file (and any shared fixture/helper) for an unguarded `Promise.reject`/rejecting `async` call with no `await` in a *different* test.

## Contested / evolving

- **Bun's `bun test` "swallows unhandled rejections" claim: no primary source located as of 2026-08-29.** The task brief describes this as documented behavior; Bun's own `bun test` docs page is silent on the topic (§3, fetched directly), and this session's web-search budget was exhausted before a targeted search for the specific GitHub issue/changelog entry could run — only direct `WebFetch`/`curl` against known URLs remained available, and neither surfaced a "swallow" description. What was verified by direct experiment on Bun 1.3.10 is the opposite of a swallow: the runner catches the rejection and fails a test. Two readings are both plausible and neither is confirmed here: (a) the "swallow" behavior was real in an older Bun version and has since been fixed, or (b) the claim conflated a different, more specific scenario (e.g. a rejection whose microtask never gets a chance to run before the process exits, which was not reproduced in this session's tests) with the general case. Flag this for a follow-up pass with search access restored, or by reading Bun's release notes directly at `github.com/oven-sh/bun/releases` for `unhandledRejection`-related fix entries.
- **Node's `--unhandled-rejections` default has been stable and settled since v15.0.0 (2020)** — current docs show no further change since (§1); this axis is not evolving, unlike the Bun question above.
- **`no-floating-promises`'s `ignoreVoid: true` default is a known point of friction** — it accepts `void expr` as "handled" without checking whether the callee can reject, which is exactly the gap rule #1 has to fill manually (§5, §6). No documentation evidence found of an imminent default change; practice in this fleet (and the guidance in this report) is trending toward treating `void` as requiring a self-catching callee as an unwritten *convention* layered on top of the lint, since the lint itself does not enforce it — this is a manual-review requirement, not something a version bump of `typescript-eslint` is expected to close.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nodejs.org/api/process.html#event-unhandledrejection](https://nodejs.org/api/process.html#event-unhandledrejection) | Node.js official API docs | Current, fetched 2026-08-29 | Confirms `process` is an `EventEmitter`, `unhandledRejection` is its event, and "no listener → raised as uncaught exception" is the documented default. |
| [nodejs.org/api/cli.html#--unhandled-rejectionsmode](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode) | Node.js official CLI flag reference | Current; default changed in v15.0.0 (documented history table) | Exact verbatim text of all five modes (`throw`/`strict`/`warn`/`warn-with-error-code`/`none`) and which is default. |
| [nodejs.org/api/deprecations.html#dep0018](https://nodejs.org/api/deprecations.html#dep0018-unhandled-promise-rejections) | Node.js official deprecations list | Current; DEP0018 runtime-deprecated v7.0.0, End-of-Life v15.0.0 | Establishes the exact version boundary for "unhandled rejection is fatal by default." |
| [html.spec.whatwg.org §8.1.4.7](https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections) | WHATWG HTML Living Standard, primary spec text | Living standard, fetched 2026-08-29 | The actual algorithm: `unhandledrejection`'s `cancelable: true`, the "user agent may report" default action, and the `rejectionhandled` late-catch companion event. |
| [developer.mozilla.org — Window: unhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event) | MDN Web API reference | Current | `event.reason`/`event.promise` shape and `preventDefault()` semantics in plain terms, corroborating the spec text. |
| [typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) | Official typescript-eslint rule docs | Current, page banner v8.68.0 (fleet pins ^8.18.0–^8.67.0) | Exact incorrect/correct examples, the `ignoreVoid` default, and confirmation the rule requires type-aware linting. |
| [typescript-eslint.io/rules/no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) | Official typescript-eslint rule docs | Current, same v8.x line | `checksVoidReturn` and its sub-toggles; the exact `forEach(async …)` incorrect/correct pair used verbatim in this report. |
| [github.com/microsoft/vscode — extensionHostProcess.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/node/extensionHostProcess.ts) | Primary source, `main` branch (no numbered release pinned by this read) | Fetched 2026-08-29 | The extension host's own top-level `process.on('unhandledRejection'/'uncaughtException')` guards, including the 1000 ms late-catch grace window — direct correction of the "kills every extension" assumption. |
| [github.com/microsoft/vscode — extensionHostMain.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extensionHostMain.ts) | Primary source, `main` branch | Fetched 2026-08-29 | `ErrorHandler.installFullHandler`: per-extension attribution by stack-trace inspection, `$onExtensionRuntimeError` reporting — shows the failure is logged and blamed, not fatal. |
| [github.com/microsoft/vscode — errors.ts](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/errors.ts) | Primary source, `main` branch | Fetched 2026-08-29 | The `ErrorHandler` class and its default (pre-`installFullHandler`) `setTimeout(() => throw e, 0)` behavior, for completeness on what runs before the full handler installs. |
| [react.dev/reference/react/Component](https://react.dev/reference/react/Component) | Official React documentation | Current | Verbatim list of what an error boundary does *not* catch, explicitly including asynchronous code — the primary source for §10's core claim. |
| [vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler) | Official Vue 3 documentation | Current | `errorHandler` signature and captured-error surface (render/event/lifecycle/`setup`/watchers), and the dev-vs-production default-behavior split. |
| [github.com/actions/toolkit — packages/core/README.md](https://github.com/actions/toolkit/blob/main/packages/core/README.md) | Official GitHub Actions toolkit docs | Current, `main` branch | Confirms `core.setFailed` is a manual pattern with no auto-wired unhandled-rejection bridge, and shows the canonical try/catch example the fleet's own `setup-ocx` mirrors. |
| [bun.sh/docs/cli/test](https://bun.sh/docs/cli/test) | Official Bun documentation | Current | Establishes the documentation is silent on `unhandledRejection` handling in `bun test` — the reason §3's findings are experiment-derived rather than citation-derived, as the task required. |

Fleet code read (not web sources, cited inline in Findings by path:line): `grimoire-vscode/src/extension.ts`, `grimoire-vscode/src/detailsCache.ts`, `fma/src/audio/sources/SpotifyPlayer.ts`, `fma/src/audio/sources/SpotifyAuth.ts`, `fma/src/main.tsx`, `setup-ocx/src/setup.ts`, `setup-ocx/action.yml`, `setup-ocx/eslint.config.js`, `ocx-catalog/src/cli/index.ts`, `ocx-catalog/src/cli/main.ts`, `ocx-catalog/src/cli/exit.ts`, `ocx-catalog/src/build/pages.ts`, `grimoire-indexer/src/cli/index.ts`, `grimoire-indexer/src/cli/main.ts`, `grimoire-indexer/src/cli/dev.ts`, and each repo's `package.json`/`eslint.config.*`/`bun.lock`.

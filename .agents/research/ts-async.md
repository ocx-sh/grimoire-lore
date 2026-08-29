---
title: "TS-ASYNC — promises, cancellation, timeouts, per-runtime rejection semantics"
topic: ts-async
model: opus
consolidates:
  - ts-async/promise-observability.md
  - ts-async/cancellation-and-timeouts.md
  - ts-async/async-void-handlers.md
  - ts-async/unbounded-concurrency.md
grounded_in:
  - typescript-audit/runtime-posture.md
  - typescript-audit/config-inventory.md
  - typescript-audit/code-shape.md
  - typescript-audit/implemented-contracts.md
  - typescript-topic-map.md (section E, 14 rows)
date: 2026-08-29
revised: 2026-08-29
---

# TS-ASYNC

## Verdict

The fleet's async code is **structurally unobserved and structurally unbounded**, and
those are two separate problems with one shared cause: nothing mechanical checks either.

1. **Type-aware linting is the whole ballgame, and it is off in 8 of 9 repos.**
   `no-floating-promises` and `no-misused-promises` are the only mechanical checks for
   this entire family, both require `parserOptions.project`, and only `setup-ocx` has it
   (`config-inventory.md:85,91-112`). `tsc --strict` catches none of it — verified:
   `forEach(async …)` and `.map(async …)` both compile clean at every strictness level
   (`promise-observability.md:248-261`), because a `void`-returning callback type means
   "I will not look at your return value" and `Promise<void>` is a legal substitution
   (TypeScript's own FAQ; `async-void-handlers.md:59-63`). That is a design decision, not
   a bug that will be closed. Every other rule here is a reading rule because the lint
   that would replace it is not running.
2. **`void` is a comment, not a handler.** 98 `void` sites fleet-wide
   (`runtime-posture.md:60-62`). We adopt the strict form: `void expr` is legal only when
   `expr` provably cannot reject. `no-floating-promises`' default `ignoreVoid: true`
   accepts `void` unconditionally, so the lint — even where it runs — does not enforce this.
3. **A deadline is not optional, and `Promise.race` is not a deadline.** 13 of 14
   first-party `fetch()` sites carry neither (`runtime-posture.md:136-156`); both
   Connect-RPC transports omit `defaultTimeoutMs`. A signal-less `fetch` is not infinite —
   it is undici's undocumented ~10-minute worst case (`cancellation-and-timeouts.md:91-99`),
   which nobody chose. We require an explicit signal at every outbound call.
4. **Compose with the standard library.** `AbortSignal.any([caller, AbortSignal.timeout(ms)])`
   is one line and preserves which signal fired. Connect-ES hand-rolls this only because it
   predates the primitive; that excuse does not transfer to a fleet whose lowest relevant
   Node floor is 20.19 (`cancellation-and-timeouts.md:120-141`).
5. **Guards are per-shape, and the browser is the one with nothing.** Node and Bun terminate
   on an unobserved rejection; the browser logs to console and continues; the VS Code host
   logs, attributes the failure to your extension, and continues. Both SPAs have zero global
   handlers, zero boundaries. **Corrected by the follow-up:** a React `ErrorBoundary` still
   catches nothing here, but Vue is not symmetric — Vue's compiler routes every
   *template-bound* handler through `callWithAsyncErrorHandling`, which attaches a
   `.catch()` and so **prevents `unhandledrejection` from ever firing** for that handler
   (`async-void-handlers.md:202-238`, read from `vue@3.5.42` source). In a Vue SPA the
   global handler is therefore necessary but *not sufficient*: `app.config.errorHandler` is
   the only receiver that can see a failed `@click`. TS-ASYNC-10 now requires both.
6. **The replacement shape for an async event handler is settled, and it is not a
   principle — it is a fixed shape.** The outer function stays non-`async`; a
   `void`-discarded, self-catching `async` IIFE runs inside it. This is the literal autofix
   `@typescript-eslint/strict-void-return` writes (`suggestWrapInAsyncIIFE`, read from the
   installed `8.68.0` source) and the fleet's own idiom in 3 of 3 `useEffect` data-loads
   (`async-void-handlers.md:100-136,261-278`). `strict-void-return` shipped 2026-08-24, has
   the only autofix for this bug, and is **not** in `strictTypeChecked` — it must be named
   explicitly. TS-ASYNC-01 now names it.
7. **Concurrency: a blanket limiter rule was considered and rejected on measurement.**
   Fleet-wide there are 6 production `Promise.all`-over-a-variable-array sites. Exactly 2
   have a genuinely external array length, and **both are already bounded** at
   `Semaphore(16)`; the other 4 are local-fs-only with a hard or self-limiting cap
   (N ≤ 256) and a limiter there would be pure ceremony
   (`unbounded-concurrency.md:41-53,190-233`). The narrow rule that survives is scoped to
   the one shape this fleet has actually gotten wrong — a wire-decoded array driving
   per-element I/O — and it puts the bound **on the I/O, not on the `Promise.all` line**,
   which is what the fleet's own dated 2026-08-22 incident fix teaches
   (`unbounded-concurrency.md:152-188`).
8. **Where a sub-researcher proposed a rule with no mechanical or readable check, it is not
   here.** `CancellationToken` adoption, `Promise.all` vs `allSettled` as a general judgment
   call, `signal?` as a universal parameter convention, and a shared `safeHandler(fn)`
   utility were all dropped or folded — the first two are their families' business
   (`TS-HOST`, review), the third had no failing test, and the fourth is over-engineering at
   ≤3 live sites (`async-void-handlers.md:320-321`).

**Documented gaps — findings, not open questions:**

- **No mechanical check exists for the bare-identifier handler case in an untyped repo.**
  `onClick={onUseMic}` where `onUseMic` was declared `async` cannot be resolved by a regex;
  it needs symbol resolution, which is exactly what `no-misused-promises`/`strict-void-return`
  provide and 8 of 9 repos do not have. The replacement is a two-step *reading* procedure
  (TS-ASYNC-14's Handler Identifier Trace), and it will stay a reading procedure until
  TS-ASYNC-01 lands in that repo. The literal TS-ASYNC-03 grep misses 2 of the fleet's 3
  live violations (`async-void-handlers.md:251-280`).
- **No lint will ever catch an unbounded-but-observed `Promise.all`.** `no-floating-promises`'
  own docs make `await Promise.all([1,2,3].map(async …))` the *correct* example; the rule
  stops at "is the promise observed" and evaluates no resource bound. Turning on
  `strictTypeChecked` fleet-wide changes nothing here (`unbounded-concurrency.md:277-289`).
  TS-ASYNC-15/16 are reading heuristics by necessity, not by choice.
- **`useEffect(async …)` needs no rule** — it is the one position in this family `tsc`
  already rejects unconditionally (`TS2345`, verified at TypeScript 5.9.3 against `fma`'s own
  `@types/react`; `async-void-handlers.md:138-169`). `onClick`, `addEventListener`,
  `forEach`, `setTimeout` get no such protection.
- **React 19 Actions (`useTransition`/`useActionState`/`<form action>`) are the framework
  answer and this fleet cannot use them.** `fma` is lockfile-pinned to React `18.3.1`, where
  a `Promise`-returning event handler gets no framework help at all
  (`async-void-handlers.md:171-200`). Revisit on a React major bump, not before.
- **Whether the registry `walker.ts` fetches from enforces a server-side rate limit could
  not be established** (`unbounded-concurrency.md:311`). If one exists, `p-queue`'s
  `intervalCap` — rejected here as unneeded — becomes relevant for that one call site.

## The ruleset

**This topic owns `TS-ASYNC` exclusively.** Seventeen rules. Rules touching child-process
lifetime overlap `TS-RES` (`child-process-discipline`) and are scoped here to *bounding the
call*, not to disposing the process; the browser global-handler rule overlaps `TS-WEB` and is
scoped here to *promise rejections only*; the concurrency rules are scoped to *how many
operations run at once*, not to closing what they open. TS-ASYNC-01 is the promise-rule half
of `TS-TOOL-03` (which owns the type-checked-config wiring itself) and adds the specific rule
names and severities; `TS-TOOL-04` owns the dead-`lint`-script defect, not this topic.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **TS-ASYNC-01** | Wire type-aware linting and leave `@typescript-eslint/no-floating-promises` and `no-misused-promises` (`checksVoidReturn: true`, all six sub-options left on) at `error`. Add `@typescript-eslint/strict-void-return: "error"` by name — adopting `strictTypeChecked` does **not** enable it. | They are the only mechanical check in this family; `tsc --strict` catches none of it (`promise-observability.md:248-261`). `strict-void-return` (new in `8.68.0`, 2026-08-24) is the only one of the three carrying an autofix for the handler bug, and grepping the installed package shows it only in `configs/flat/all.js` (`async-void-handlers.md:100-136`). Disabling any `checksVoidReturn` sub-option for convenience reopens exactly this hole. | `npx eslint --print-config src/<any>.ts \| jq '.rules["@typescript-eslint/no-floating-promises"], .rules["@typescript-eslint/no-misused-promises"], .rules["@typescript-eslint/strict-void-return"]'` — all three must be `2`/`["error",…]`, not `null`. | MUST |
| **TS-ASYNC-02** | Write `void expr` only when `expr`'s promise cannot reject: either the callee's body wraps **every** `await` and throwing statement in try/catch, or a `.catch()` is chained onto that exact call before the `void`. This applies to a `void (async () => {…})()` IIFE too — the IIFE body needs the try/catch. | `void` marks intent and attaches nothing; `ignoreVoid: true` means even a running lint accepts it (`promise-observability.md:198-246`). The fleet has two `void`-IIFE handlers with the right *outer* shape and no inner catch (`async-void-handlers.md:278`). | `rg -n '^\s*void [a-zA-Z]' src/` and `rg -n 'void \(async' src/` (98 `void` sites fleet-wide), then read each callee/IIFE body: a `try` that does not cover a later `await` in the same function is not self-catching. No lint substitutes. | MUST |
| **TS-ASYNC-03** | Never pass an `async` function where a `void`-returning callback is expected — `forEach(async …)`, `onClick={async …}`, `addEventListener('…', async …)`, `setTimeout(async …)`. Replace with TS-ASYNC-14's shape. `.map(async …)` is permitted only inside `Promise.all(…)`/`Promise.allSettled(…)` in the same expression. **Scope exception:** a Vue *template*-bound handler (`@click="method"`) may be a plain `async` method — Vue's compiler routes it through `callWithAsyncErrorHandling`, verified in source — but only where TS-ASYNC-10's `app.config.errorHandler` is wired; a raw `addEventListener` inside a `.vue` file gets no such net. | The rejection has no reachable handler by construction, and it compiles clean (`promise-observability.md:248-261`); the fleet has three live instances in destructive/user-facing paths. The Vue carve-out is read from `vue@3.5.42`'s `createInvoker` → `callWithAsyncErrorHandling` (`async-void-handlers.md:202-238`), not inferred from docs. | `no-misused-promises`/`strict-void-return` where TS-ASYNC-01 holds. Otherwise **step 1 only** of TS-ASYNC-14's Handler Identifier Trace: `rg -n 'on[A-Z]\w*=\{\s*async\|addEventListener\([^)]*,\s*async\|forEach\(async\|\.map\(async\|set(Timeout\|Interval)\(\s*async' src/` must be empty, every `.map(async` hit sitting inside `Promise.all(`/`Promise.allSettled(`. **An empty step-1 grep is not compliance** — it misses a bare identifier and an arrow that forwards to an async callee (`walker.ts:708` is the same shape with no `async` token). Step 2 is mandatory. | MUST |
| **TS-ASYNC-04** | Give every outbound network call an explicit deadline: `fetch` gets `signal:`; `createConnectTransport({…})` gets `defaultTimeoutMs`. | A signal-less `fetch` inherits undici's undocumented 10s connect + 2×300s idle ceiling (`cancellation-and-timeouts.md:91-99`); an unset `defaultTimeoutMs` resolves to `undefined`, not a default (`cancellation-and-timeouts.md:246-275`). | `rg -n 'fetch\(' src/` — every hit's init object carries `signal:`. `rg -n 'createConnectTransport\(' src/` — every hit carries `defaultTimeoutMs`. | MUST |
| **TS-ASYNC-05** | When a subprocess needs an in-code bound, call `node:child_process.execFile`/`spawn` with `timeout` (and `signal`) — not `@actions/exec`. A workflow-level `timeout-minutes` is a backstop, not the bound. | `@actions/exec@^1.1.1`'s `ExecOptions` has no `timeout`/`signal`/`killSignal` field at all (verbatim interface, `cancellation-and-timeouts.md:279-296`); `timeout-minutes` is minute-granularity, kills the whole step, and lives in the consumer's YAML. | `rg -n 'exec\.exec\(' src/` — each hit must be justified in a comment or migrated. `rg -n 'execFile\(\|spawn\(' src/` — each hit's options carry `timeout:`. | MUST |
| **TS-ASYNC-06** | Compose a caller's signal with an internal deadline as `AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])`. Never hand-roll an `addEventListener('abort', …)` fan-in. A helper that makes an outbound call takes `signal?: AbortSignal` and composes it internally, unless it is provably an outermost leaf. | One stdlib line, and `.reason` propagates from whichever fired, so `TimeoutError` vs `AbortError` discriminates "we timed out" from "caller cancelled" with no bookkeeping (`cancellation-and-timeouts.md:101-141`, `164-186`). | `rg -n "addEventListener\(['\"]abort" src/` must be 0 outside vendored code. | SHOULD |
| **TS-ASYNC-07** | Never express a timeout as `Promise.race([op, delay])`. Any new `Promise.race` is a design review, not a routine merge. | Racing stops *awaiting*; it does not cancel — the socket/subprocess/RPC runs on, and the loser's later rejection is itself unobserved (`cancellation-and-timeouts.md:55`, `promise-observability.md:410`). `p-timeout`'s own maintainer recommends `AbortSignal.timeout()` instead. | `rg -n 'Promise\.race\(' src/` — currently 0 fleet-wide; must stay 0 absent a written rationale. | MUST |
| **TS-ASYNC-08** | A retry loop gives each attempt its own timeout, strictly shorter than the overall budget, and re-checks the caller's signal **before** backing off — a cancellation must stop the loop, not consume a retry. | Without a per-attempt bound the backoff machinery is unreachable: one hung attempt occupies the whole budget and attempt 2 never runs (`cancellation-and-timeouts.md:188-244`). Deadline propagation, per Google SRE. | For each retry loop: (a) the awaited I/O call receives a signal distinct from the loop counter; (b) the `catch` that decides to sleep-and-retry tests `signal?.aborted` first. Reading check — no lint exists. | MUST |
| **TS-ASYNC-09** | Narrow `signal.reason` at the point of observation — `reason instanceof Error ? reason : new Error(String(reason))` — before throwing, logging, or passing it on. | `AbortSignal.reason` is typed `any` in `lib.dom.d.ts` (verified at the fleet's own `typescript@6.0.3`, line 3395); `any` defeats every downstream check it touches, in a fleet with only 4 `any`s total (`cancellation-and-timeouts.md:143-162`). | `rg -n '\.reason\b' src/` — every hit is narrowed before use; `rg -n '\.reason\.' src/` must be 0. | SHOULD |
| **TS-ASYNC-10** | Every browser entry point registers `window.addEventListener('unhandledrejection', …)` that reports the rejection. A React error boundary does **not** substitute for it. **A Vue app must additionally set `app.config.errorHandler` (or `onErrorCaptured`) — the global handler alone does not cover it**, because Vue attaches its own `.catch()` to every template-bound handler, so those rejections never reach `unhandledrejection`. | React's docs exclude async/promise rejections from an error boundary's catch surface, and the browser's own default action is at most a console line (`promise-observability.md:386-398`). Vue's runtime source shows the opposite failure: `callWithAsyncErrorHandling` *does* catch, then falls through to a bare `console.error` in production when no `errorHandler` exists — a silent failure the global handler cannot see (`async-void-handlers.md:202-238`). Both SPAs have zero of all three today. | `rg -n "addEventListener\('unhandledrejection'" src/` ≥ 1 per browser entry point; **and** in a Vue app, `rg -n 'app\.config\.errorHandler\|onErrorCaptured' src/` ≥ 1. A hit for `ErrorBoundary\|componentDidCatch` is not evidence for either. | MUST (shape 4) |
| **TS-ASYNC-11** | A global rejection handler reports with enough context to locate the call site (reason + stack + an id). Never add one — and never add a bare `catch {}` — to silence a linter finding or a red squiggle. | This converts a compile-time-catchable bug into a runtime-silent one. Even VS Code's own host guard attributes and reports rather than swallowing (`promise-observability.md:148-196`). | `rg -n 'unhandledRejection\|unhandledrejection' src/` — read each handler body; an empty or bare-`console.error(reason)` body fails. | MUST |
| **TS-ASYNC-12** | A Node/Bun entry point's entire async execution is a single awaited call inside a try/catch that maps the error onto that runtime's failure channel — a named exit code for a CLI, `core.setFailed()` for an Action. Do not rely on the runtime's default terminate. | Node has terminated by default since v15 (DEP0018 EOL), so the default *works* but reports a raw V8 stack and a generic code instead of the CLI's `sysexits` vocabulary (`promise-observability.md:320-354`). `@actions/toolkit` wires no rejection→`setFailed` bridge (`promise-observability.md:356-384`). | The bin/entry file contains exactly one top-level `await` (or one `void <selfCatchingRun>()`) inside a try/catch; every catch branch ends in `process.exitCode = <named code>` or `core.setFailed(...)`. This guard is complete only while TS-ASYNC-02 holds. | MUST |
| **TS-ASYNC-13** | If you choose `Promise.allSettled`, handle every `rejected` result explicitly — log it, or fold it into the return. An `allSettled` whose rejected branch does nothing is a `Promise.all` with extra steps and a silent swallow. | Fleet default is `Promise.all` (34:1); the single production `allSettled` states its reason inline and logs every rejection (`promise-observability.md:295-318`). | `rg -n 'Promise\.allSettled\(' src/` — each hit's result loop has a `status === 'rejected'` branch that does something observable. | SHOULD |
| **TS-ASYNC-14** | The only permitted shape in a void-typed callback position is: a **non-`async` outer function** containing a `void`-discarded, **self-catching** `async` IIFE. It follows that a bare reference to an `async`-declared function (`onClick={onUseMic}`) is equally forbidden there, **even when that function self-catches internally** — nothing at the call site distinguishes a safe callee from an unsafe one, and typescript-eslint's maintainers have explicitly declined to add a per-callee escape hatch. An arrow whose expression body forwards to an `async` callee (`onChange={(e) => onImport(e.target.files?.[0])}`) is the same violation one indirection deeper. | This exact shape is the autofix `strict-void-return` emits (`suggestWrapInAsyncIIFE`, read from the `8.68.0` rule source) and is already the fleet's own idiom — `fma/src/audio/sources/SpotifyPanel.tsx:18-26` is a live, correct, self-catching instance (`async-void-handlers.md:100-136,261-278`). The no-exceptions stance is the maintainers' own, in [typescript-eslint#9930](https://github.com/typescript-eslint/typescript-eslint/issues/9930) (`async-void-handlers.md:282-288`). Do **not** introduce a shared `handle(fn)`/`safeHandler(fn)` utility for this: at ≤3 live sites across two SPAs it is the inline IIFE plus an import. | **Handler Identifier Trace.** Step 1: TS-ASYNC-03's grep. Step 2 (reading, no mechanical substitute in an untyped repo): `rg -n 'on[A-Z]\w*=\{[A-Za-z_$][\w$]*\}' src/**/*.tsx` and `rg -n '@[a-z]+="[A-Za-z_$][\w$]*"' src/**/*.vue` list every bare-identifier binding; for each name, `rg -n "(const\|function) $NAME"` and check for `async`. Any hit is a violation, no exception for a self-catching definition. Reconsider a shared wrapper only if one SPA's `rg -c 'void \(async \(\) =>' src` crosses ~12 sites with genuinely shared failure behaviour. | MUST |
| **TS-ASYNC-15** | An array decoded from a network response (`await res.json()`, `JSON.parse(<fetched bytes>)`) that drives per-element I/O must hit a concurrency bound — the fleet's `Semaphore`, or `p-limit` — somewhere in the call chain **before that element's first `fetch`/`fs.write*`/`spawn`**. The bound belongs on the I/O, not on the `Promise.all` line. This rule does **not** extend to arrays of code-controlled length or to local-fs-only loops with a hard cap; do not add a limiter there. | This is the one shape the fleet has actually gotten wrong: `walker.ts:339-354` carries a dated 2026-08-22 security-panel comment recording that the cache read ran *before* `semaphore.acquire()`, so a hostile index fanned out thousands of concurrent disk reads. The fix moved the gate to wrap the whole per-entry operation, three frames below the `Promise.all` a naive rule would inspect (`unbounded-concurrency.md:152-188`). 50,000 pending promises queued on `acquire()` are cheap; the sockets and fds are not. Node's global `fetch` has no ceiling of its own — undici's `Pool` defaults `connections: null`, explicitly unlimited. | Reading heuristic — no lint exists (`unbounded-concurrency.md:277-289`). For each `Promise.all(`/`Promise.allSettled(` over a variable-length array, trace the array to its source; if it is a `.json()`/`JSON.parse` result, grep the mapped callback **and everything it calls, one or two levels down** for `Semaphore\|acquire(\|pLimit\|new PQueue`, and confirm the *last* unguarded I/O call inside it is still inside the gate. A bound acquired, released, then followed by a fetch is not a bound. | MUST |
| **TS-ASYNC-16** | The same wire-decoded array gets an explicit upper bound on `arr.length`, checked before the fan-out, in addition to TS-ASYNC-15's concurrency bound. | Two independent layers: the concurrency bound limits how many run at once, the length cap limits how much total work one hostile or oversized response can demand at all. Neither substitutes for the other, and the fleet already does both at its one real risk site — `MAX_INDEX_ENTRIES = 50_000` throws before the loop starts (`unbounded-concurrency.md:152-165`). | For every site TS-ASYNC-15 flags, confirm a `length >` check (or equivalent) near where the array is decoded, distinct from the semaphore check. | MUST |
| **TS-ASYNC-17** | When a bound is needed and the repo has none: import the existing `Semaphore` if one is reachable, otherwise add `p-limit`. Not `p-queue`, not a fresh hand-rolled class. If `p-map` is used, `concurrency` is **always** passed explicitly. A new cap defaults to `16` unless a measured number says otherwise, and any other value carries a comment saying why. | `ocx-catalog` already has a tested, reused 25-line `Semaphore` (`mirror.ts` imports it rather than writing a second one). `p-queue`'s differentiators — `intervalCap`, priority, pause/resume — solve a problem no fleet dependency has today. **`p-map`'s `concurrency` defaults to `Infinity`**, so `pMap(arr, fn)` looks bounded and is not. `16` is already the fleet's number three times over (`PAGE_WRITE_CONCURRENCY`, `MAX_WRITE_CONCURRENCY`, `MAX_CONCURRENCY`), with `mirror.ts` citing a measured ~2.6x (`unbounded-concurrency.md:115-150,267-275`). | `rg -n 'pMap\(' src/` — every hit's options include `concurrency:`. A diff adding `p-queue` that only ever calls `.add(fn)` with a bare `concurrency` is `p-limit` with extra weight — reject. A new concurrency class in a repo that could import or `p-limit` instead is a design review. | SHOULD |

## Applied to the fleet

**Already satisfied — preserve:**

- TS-ASYNC-01 in `setup-ocx/eslint.config.js:9-16` (`strictTypeChecked` + `parserOptions.project: "./tsconfig.eslint.json"`) — the only repo of nine (`config-inventory.md:85,91-112`). Note it still lacks the new `strict-void-return` line.
- TS-ASYNC-03, map half: all 4 `.map(async …)` sites wrapped in `Promise.all` — `ocx-catalog/src/build/pages.ts:213`, `ocx-catalog/test/build/engine_real_build.test.ts:94`, `grimoire-vscode/src/detailsCache.ts:190,235` (`runtime-posture.md:97-103`). `forEach(async`, `setTimeout(async`, `setInterval(async`: 0 fleet-wide.
- TS-ASYNC-07: `Promise.race` = 0 in all eight repos (`code-shape.md:376-385`).
- TS-ASYNC-12: `ocx-catalog/src/cli/index.ts` (try/catch → `process.exitCode = FAIL`, `process.exit()` never called, comment at `index.ts:7-8` says why); `grimoire-indexer/src/cli/index.ts:9` + `src/cli/main.ts:66-94,236-240` (single `classify()` choke point); `setup-ocx/src/setup.ts` (`run()` fully caught → `core.setFailed`) and `setup-ocx/src/save-cache.ts:50` (`run().catch(reportPostFailure)`) — `implemented-contracts.md:104-117`, `runtime-posture.md:122-125`.
- TS-ASYNC-13: `grimoire-vscode/src/extension.ts:145` — the fleet's only production `allSettled`, with an inline rationale and a per-rejection `output.appendLine` (`promise-observability.md:295-318`). Its sibling `refreshAll` (`extension.ts:185-210`) is the per-round try/catch drain that makes the file's many `void refreshAll()` calls actually safe (`runtime-posture.md:483-490`).
- TS-ASYNC-05, partially: every raw-`execFile` wrapper already sets a timeout — `grimoire-vscode/src/grim.ts:597-628` (`timeout: options.timeoutMs ?? 120_000`, maxBuffer cap, EPIPE guard citing nodejs/node#40085), `grimoire-indexer/src/enrich/index.ts:64-70` (`timeout: TIMEOUT_MS`) — `runtime-posture.md:190-197`.
- TS-ASYNC-04, one site: `grimoire-indexer/src/validate/adapters/http.ts:96` — `signal: AbortSignal.timeout(30_000)`, the fleet's only `AbortSignal` anywhere (`code-shape.md:377,386`).
- TS-ASYNC-14, the gold standard: `fma/src/audio/sources/SpotifyPanel.tsx:18-26` — non-`async` outer, `void`-discarded `async` IIFE, internal try/catch (`async-void-handlers.md:264-276`).
- TS-ASYNC-15/16/17 at the fleet's only two wire-sized sites: `ocx-catalog/src/build/pages.ts:196-221` (`Semaphore(PAGE_WRITE_CONCURRENCY = 16)` inside the mapped callback) and `ocx-catalog/src/sources/walker.ts:339-354,697-708` (`Semaphore(16)` inside `loadOrFetch`, gating the cache read *and* the network leg, plus `MAX_INDEX_ENTRIES = 50_000` before the loop). `mirror.ts:11` imports the same `Semaphore` rather than writing a second one (`unbounded-concurrency.md:77-150`).

**Violated:**

| Rule | Site | What is wrong |
|---|---|---|
| TS-ASYNC-01 | `ocx-catalog/eslint.config.js:1-45`, `grimoire-indexer/eslint.config.js:1-24`, `grimoire-vscode/eslint.config.mjs:1-27`, `vscode-ocx/eslint.config.mjs:1-27`, `fma/eslint.config.js:1-30` | Plain `tseslint.configs.recommended`, no `parserOptions.project` — all three rules structurally unavailable (`config-inventory.md:81-87,113`). |
| TS-ASYNC-01 | `creeptd-ng/web/package.json:14` | `lint` script runs `eslint src --ext .ts,.vue` against a config that does not exist in this tree (only in an excluded worktree) — lint is dead, not merely untyped (`runtime-posture.md:53-58`, `422-426`). |
| TS-ASYNC-01 | `kate-middlechild/biome.json:36-44` | Biome has no promise-aware rule; 259 `await`s and **zero** `try {` blocks in the whole repo (`code-shape.md:383,389-392`). |
| TS-ASYNC-01 | `setup-ocx/eslint.config.js:9-16` | The one compliant repo still does not name `strict-void-return` — it is absent from `strictTypeChecked` and therefore off (`async-void-handlers.md:136`). |
| TS-ASYNC-02 | `fma/src/audio/sources/SpotifyPlayer.ts:80` | `void getValidToken().then(t => …)` — no `.catch()`, and `getValidToken()` throws on a failed token refresh. Playback silently never starts. |
| TS-ASYNC-02 | `grimoire-vscode/src/extension.ts:507` | `void rebuildWatchers()` — the one activation-time callee with no internal try/catch, next to two siblings that have one (`extension.ts:601,647`). |
| TS-ASYNC-02 | `fma/src/player/PlayerPage.tsx:57-62`, `fma/src/library/LibraryPage.tsx:30-39` | Correct TS-ASYNC-14 outer shape (`void (async () => …)()` inside a sync `useEffect`), **no inner try/catch** — a throw becomes an unhandled rejection with no React net (`async-void-handlers.md:278`). |
| TS-ASYNC-03 | `fma/src/library/LibraryPage.tsx:91` | `onClick={async () => { await graphRepo.remove(r.id); … }}` — a destructive action with no try/catch and zero user feedback on failure (`runtime-posture.md:84-91`). |
| TS-ASYNC-03 | `ocx-catalog/src/theme/components/detail/ReadmePane.vue:126` | `btn.addEventListener('click', async () => …)` — a hand-built DOM node inside a `.vue` file, so it bypasses Vue's `createInvoker` entirely and gets **no** framework net; a denied clipboard permission drops the toast into an unhandled rejection (`async-void-handlers.md:238`). |
| TS-ASYNC-03 | `grimoire-indexer/src/renderer/astro/components/Catalog.tsx:242` | Floating `.then()` with no `.catch()` on `navigator.clipboard.writeText` inside a sync handler (`runtime-posture.md:105-110`). |
| TS-ASYNC-14 | `fma/src/player/PlayerPage.tsx:180` → def. at `:119` | `onClick={onUseMic}` where `onUseMic` is `async`. Self-catches internally, still a violation, and **invisible to TS-ASYNC-03's grep** — only step 2 finds it. |
| TS-ASYNC-14 | `fma/src/library/LibraryPage.tsx:54`, `fma/src/player/PlayerPage.tsx:178`, `fma/src/editor/EditorPage.tsx:147` | `onChange={(e) => onImport(e.target.files?.[0])}` — non-`async` arrow with an expression body returning `Promise<void>`. All three self-catch today, so not urgent; invisible to both the grep and a naive bare-identifier check. |
| TS-ASYNC-04 | 13 of 14 fetch sites: `grimoire-vscode/src/installer.ts:228`; `ocx-catalog/src/theme/composables/{useImageIndex.ts:82,usePackageRoot.ts:138,141,useCatalog.ts:86}`, `.../detail/ReadmePane.vue:51`; `fma/src/audio/sources/{SpotifyAuth.ts:90,129,SpotifyPlayer.ts:99,109}`; `creeptd-ng/web/src/stores/useAuthStore.ts:115,145`; `ocx-catalog/src/sources/walker.ts` (`retryFetch`) | No `signal`, no timeout (`runtime-posture.md:143-156`). |
| TS-ASYNC-04 | `creeptd-ng/web/src/api/leaderboardClient.ts:16`, `lobbyClient.ts:36` | `createConnectTransport({baseUrl})` with no `defaultTimeoutMs` and no per-call `timeoutMs` anywhere — every RPC in the app is unbounded (`cancellation-and-timeouts.md:257-275`). |
| TS-ASYNC-05 | `setup-ocx/src/project.ts:136,144`, `setup-ocx/src/managed-config.ts:59` | `exec.exec()` — the API exposes no bound; only the consumer's `timeout-minutes` limits it. |
| TS-ASYNC-05 | `grimoire-vscode/src/installer.ts:242-251` | `extract()` (tar) sets no timeout while its sibling `runJson` in the same repo does — the pattern exists and was not copied (`runtime-posture.md:196`, `440-444`). |
| TS-ASYNC-08 | `ocx-catalog/src/sources/walker.ts:227-256` | `retryFetch`: 4 attempts, correct AWS Equal-Jitter backoff, and **no** signal on any attempt — one silent server holds the loop for undici's ~5-minute headers window and attempt 2 never runs. Also backs off on a cancellation. |
| TS-ASYNC-10 | `fma/src/main.tsx` | Zero `unhandledrejection` listeners, zero error boundaries (`runtime-posture.md:127-132`, `411-416`). |
| TS-ASYNC-10 | `creeptd-ng/web/src/main.ts` | Zero `unhandledrejection` **and** zero `app.config.errorHandler`/`onErrorCaptured`. The second is the worse half: Vue's own `.catch()` absorbs every template-bound handler rejection into a bare production `console.error`, which no global handler can see (`async-void-handlers.md:236`). |

**New commitments (nothing to violate yet — forward-looking):**

- TS-ASYNC-06: `AbortSignal.any` has 0 uses fleet-wide; there is also no hand-rolled abort fan-in to remove. The rule exists so the first composition written is the stdlib one rather than a copy of Connect-ES's workaround.
- TS-ASYNC-09: 0 `signal.reason` reads today. The rule is preventive and cheap, and it protects a fleet-wide `any` count of 4.
- TS-ASYNC-11: 0 global rejection handlers in production code (the only 2 hits are a test harness in `grimoire-vscode/src/test/rating.test.ts:277,290`). The rule constrains how the first one — most likely added under TS-ASYNC-10 — is written.
- TS-ASYNC-15/16/17 outside `ocx-catalog`: `vscode-ocx`, `setup-ocx`, `fma`, and `kate-middlechild` have **zero** `Promise.all`/`allSettled` call sites of any shape (`unbounded-concurrency.md:41`). Zero fleet repos depend on `p-limit`/`p-map`/`p-queue`. The rules constrain the first adoption, not existing code.

## Conflicts resolved

1. **Does an unobserved rejection kill the VS Code extension host?** `runtime-posture.md:126`
   says yes: "crashes that process — VS Code shows 'the extension host terminated
   unexpectedly'… killing every extension's state." `promise-observability.md:148-196`
   says no, and shows why: `microsoft/vscode`'s `extensionHostProcess.ts` installs its own
   `process.on('unhandledRejection')` with a 1000 ms late-catch grace window, and routes it
   into `ErrorHandler.installFullHandler`, which walks the stack to blame a specific
   extension and reports it — never rethrows, never `process.exit`.
   **Resolved for `promise-observability`**: it read current primary source; `runtime-posture`
   inferred from Node's documented default without checking whether the host overrides it.
   The rule's severity does not change, but its rationale does — and that matters, because
   the corrected rationale is *worse* for an extension author, not better: a rejection in
   `rebuildWatchers` produces no crash, no user-visible signal, and one line in an Output
   channel nobody reads, with telemetry attributing the failure to your extension. TS-ASYNC-02
   stays MUST for shape 2 on debuggability grounds, not stability grounds.

2. **Is `grimoire-vscode/src/extension.ts:507` a real violation or a cosmetic one?**
   `promise-observability.md:224-246` calls it a real gap (`scopes.run()` can reject);
   `runtime-posture.md:70-78,445-451` calls the practical risk "narrow" because
   `scopes.run()` (`scopes.ts:562`) does not reject in practice.
   **Resolved as a violation.** Two reasons. First, a rule an agent can only satisfy by
   re-deriving whether a transitive callee can reject is not a usable rule — TS-ASYNC-02 is
   deliberately a call-site invariant. Second, `watchers.rebuild(...)` on the following line
   can throw synchronously inside the same `async` function, which makes the callee
   rejectable regardless of `scopes.run()`'s behavior. Both audits agree it breaks a pattern
   the same file applies correctly twice; that is enough. The follow-up independently
   converged on the same principle from the maintainers' side: typescript-eslint declined a
   per-callee escape hatch for exactly this "trust me, it self-catches" argument
   (`async-void-handlers.md:282-288`).

3. **Priority of cancellation: modernisation or emergency?** The canonical-practice survey
   rated `AbortSignal.any`/`.timeout()` "med"; `runtime-posture.md:435-439` measured 13 of 14
   sites unbounded with a one-line fix already sitting in the fleet. The topic map already
   adjudicated this (`typescript-topic-map.md:128-134`, conflict 9) — **resolved for
   `runtime`: P0**. Carried forward: TS-ASYNC-04 is MUST, not SHOULD, and TS-ASYNC-06 is the
   *shape* rule beneath it rather than a modernisation nice-to-have.

4. **Does `bun test` swallow unhandled rejections?** The brief and topic-map row
   `rejection-semantics-per-runtime` carry that premise. `promise-observability.md:86-146`
   ran it: on Bun 1.3.10, `bun run` matches Node exactly (crash, exit 1, subsequent timers
   never fire), and `bun test` **catches** the rejection and fails a test — but attributes it
   to whichever test is executing when the rejection's microtask fires, not the one that
   created it. **Resolved: the premise is wrong; the real hazard is misattribution, not a
   swallow.** No `TS-ASYNC` rule follows from it (nothing about production code changes);
   it is a test-debugging caveat handed to `TS-TEST`. Marked as unconfirmed against an older
   Bun: no primary source for the original "swallow" claim was located, and `setup-ocx` pins
   no Bun version (`bun.lock`/`package.json` carry no `engines.bun` or `packageManager`).

5. **Does Vue's `app.config.errorHandler` catch a rejected async event handler?**
   `promise-observability.md:386-398` says no — Vue's reference docs "make no claim about
   unhandled promise rejections," so TS-ASYNC-10 was written to treat `errorHandler` as a
   non-substitute. `async-void-handlers.md:202-238` says yes for template-bound handlers, and
   shows the mechanism: `createInvoker` dispatches through `callWithAsyncErrorHandling`, which
   does `res.catch(err => handleError(err, …))` whenever the handler returns a promise —
   read from `vue@3.5.42`'s shipped build *and* `vuejs/core@main`, cross-checked.
   **Resolved for `async-void-handlers`**: a source read beats an inference from documentation
   silence. The consequence is not a relaxation. Because Vue attaches a real `.catch()`, the
   rejection is *handled* as far as the browser is concerned, so `unhandledrejection` never
   fires and `handleError` falls through to a bare `console.error` in production when no
   receiver is configured — which `creeptd-ng/web` is. TS-ASYNC-10 previously implied the
   global handler was a complete browser guard; it is not, in a Vue app. Rule amended in
   place. The scope is narrow: raw `addEventListener` inside a `.vue` file
   (`ReadmePane.vue:126`) never touches `createInvoker` and keeps no net at all.

Minor reconciliation, no adjudication needed: `promise-observability` counts `allSettled` as
"1 production + 2 test"; `code-shape.md:376-385` counts 2 in `grimoire-vscode` + 1 in
`ocx-catalog`. Same three sites, different partition — 3 total, 1 in production.

## AI-agent failure modes

Ranked by how often it bites, most frequent first.

1. **Adding `void` to make a floating-promise warning go away without reading the callee.**
   The highest-frequency failure in this family, because it is the *documented* fix
   (`ignoreVoid: true`) and because a safe `void` and an unsafe one are indistinguishable at
   the call site — `void rebuildWatchers()` and `void publishUpdateCount()` are visually
   identical; the difference lives entirely inside the callee. No lint separates them.
2. **`onClick={async () => {…}}` inline as the natural completion for "wire up a delete
   button."** It compiles clean in every repo and, in 8 of 9, draws no lint either.
3. **"Cleaning up" that same handler into `const handleX = async () => {…}` and referencing
   it by name.** This *looks* like an improvement, is a refactor an agent volunteers
   unprompted, and makes the violation invisible to every grep while staying exactly as wrong
   at the type level. It is the live `PlayerPage.tsx:180` shape. Only TS-ASYNC-14 step 2
   catches it.
4. **Writing `Promise.race([op, delay(ms)])` as "the" timeout.** It is the dominant
   pre-`AbortSignal` idiom in training data, compiles, reads correctly in review, and leaves
   the underlying socket/subprocess running until undici reaps it minutes later.
5. **Reaching for a React `ErrorBoundary` or Vue `app.config.errorHandler` when asked to
   "add error handling" to async UI code.** For React this is simply wrong — boundaries never
   catch it. For Vue the handler is *right but absent*, so an agent that assumes "there's an
   errorHandler somewhere" is wrong for a second, different reason. Check both, never assume.
6. **`array.forEach(async fn)` for "run these concurrently."** Reads as parallel-map idiom;
   `forEach` structurally discards every return value; `tsc --strict` says nothing.
7. **Reaching for `Promise.all(arr.map(async …))` as the reflexive "make it parallel" move
   without asking what `arr`'s length depends on.** Correct for a fixed-arity list of 2-3
   operations — the fleet's dominant use — and the same reflex applied to a
   network-response-sized array is TS-ASYNC-15's whole subject.
8. **Bounding the `Promise.all` line and declaring it done, while the real I/O happens three
   frames deeper.** This is `walker.ts`'s own pre-2026-08-22 bug. A semaphore acquired,
   released, and *then* followed by a fetch is not a bound.
9. **Hallucinating a `timeout` option where none exists** — `fetch(url, {timeout: 5000})`
   and `exec.exec(bin, args, {timeout: 30_000})`. TypeScript rejects both *as object
   literals* (`TS2353`), which is the only reason this is not higher — but the reflex fix is a
   cast, and a spread options object with an extra `timeout` key is dropped silently with no
   error at all.
10. **Adding a per-attempt timeout to a retry loop and stopping there** — not gating the
    backoff branch on `overallSignal?.aborted`. Compiles, passes a "does it time out" smoke
    test, and retries a caller-initiated cancellation three more times before surfacing it.
11. **Treating a global `unhandledRejection` handler as a complete safety net**, then writing
    `void` freely under its cover. Node's listener prevents a *crash*, nothing more; a handler
    that logs a bare reason string with no stack and no call-site id is a swallow with a log line.
12. **Volunteering a shared `safeHandler(fn)`/`handle(fn)` utility when asked to "handle
    promise rejections in event handlers."** It is the generically correct-sounding answer and,
    at ≤3 sites across two SPAs, it is the inline IIFE plus one import. Smallest check: a new
    cross-cutting utility file in a diff whose only callers are one or two handlers.
13. **Reaching for `p-queue` because its README reads as the professional choice**, or trusting
    `pMap(arr, fn)` to be bounded because the function is named after mapping. `p-map`'s
    `concurrency` default is `Infinity`.
14. **Calling `.message` on `signal.reason`.** It is typed `any`, so this type-checks even when
    `reason` is a `DOMException`, a string, or `undefined`, and only fails at runtime.
15. **Assuming `@actions/toolkit` bridges rejections to `core.setFailed`.** It does not; the
    result is an Action that dies with a raw Node stack trace instead of a `::error::`
    annotation, and never marks the step failed through its own contract.
16. **Assuming a green `tsc`/`eslint` run covers concurrency.** It does not and never will —
    `no-floating-promises`' own *correct* example is an unbounded `Promise.all(...map(async …))`.
17. **`AbortSignal.any(setOfSignals)` or varargs.** `lib.dom.d.ts` types it as
    `any(signals: AbortSignal[])`; `tsc` catches both immediately. Listed for completeness —
    it costs a compile, not a bug.

## Open questions

**Needs a human decision:**

1. **`creeptd-ng/web` has no lint config at all** and a `lint` script pointing at one that
   does not exist (`package.json:14`). TS-ASYNC-01 is unenforceable there until someone
   decides whether that repo adopts ESLint. The adoption path is now known and cheap —
   `@vue/eslint-config-typescript@14.9.0` is a thin adapter that re-exports typescript-eslint's
   own `recommendedTypeChecked`/`strictTypeChecked` for `.vue` files, verified by unpacking the
   tarball (`async-void-handlers.md:98`) — so this is a decision, not a research problem. It is
   also the repo with two unbounded Connect transports, two unbounded fetches, and no
   `app.config.errorHandler`.
2. **`kate-middlechild` is Biome-only**, and Biome's `noFloatingPromises` is a nursery rule.
   Accept that this family is advisory-only in that repo, or add ESLint alongside Biome for
   the type-aware rules? 259 `await`s and 0 `try {` blocks argue it matters.
3. **`grimoire-vscode` and `vscode-ocx` declare `engines.node: ">=20"`**, below
   `AbortSignal.any()`'s 20.3.0 floor. Almost certainly moot — an extension runs in the
   Electron host's bundled Node, not whatever satisfies `npm install`, and that host version
   could not be established. Node 20 is EOL anyway. Decide whether the `engines` bump rides
   with the EOL fix or with TS-ASYNC-06.
4. **Numeric timeout defaults.** `cancellation-and-timeouts.md:348` proposes ≤10s for an
   interactive/browser fetch, ≤30s for a CLI/CI validation fetch (matching the fleet's
   existing 30s), and a per-attempt bound meaningfully shorter than the retry budget. Ratify
   those three numbers, or the rules land as "some timeout" and get the wrong one. The
   concurrency counterpart is already ratified at `16` by fleet precedent (TS-ASYNC-17).

**Gaps to mark, not paper over:**

- **`async-lint-set`** (topic-map row, P2) is now half-decided: `strict-void-return` is
  settled and folded into TS-ASYNC-01. The other four — `require-await`,
  `promise-function-async`, `return-await`, `await-thenable` — remain undecided. All are
  type-aware, so all are off in 8 of 9 repos, and no one has chosen which TS-ASYNC-01 should
  turn on beyond the three named. Left open deliberately.
- **`promise-chaining-absent`** (P3): `await` has displaced `.then()` fleet-wide (1,855 : 11 in
  `ocx-catalog`). No rule written — the discipline is already universal, and a rule that
  changes no behaviour is not worth a slot.
- **`Readable.prototype.map(fn, {concurrency})`** is native, zero-dependency, and still
  Experimental (Stability 1) as of 2026-08-29, with no evidence of pending promotion
  (`unbounded-concurrency.md:310`). Watch, do not adopt — the array↔stream round-trip is more
  ceremony than a `p-limit` line for the array-in/array-out shape all 6 fleet sites have.

## Revision log

- **2026-08-29 — folded in `async-void-handlers.md` and `unbounded-concurrency.md`**, the two
  follow-up rounds the first consolidation commissioned. Both resolved; both moved out of
  Open questions. Rules 13 → 17.
- **TS-ASYNC-10 amended (overclaim fix).** It previously implied a `window` `unhandledrejection`
  listener was a complete browser guard and that Vue's `app.config.errorHandler` was merely a
  non-substitute. Source read of `vue@3.5.42` shows Vue attaches its own `.catch()` to every
  template-bound handler, so those rejections *never reach* the global handler and land in a
  production `console.error`. The rule now requires `app.config.errorHandler`/`onErrorCaptured`
  in a Vue app **in addition to** the global listener. Recorded as conflict 5.
- **TS-ASYNC-03 amended (verification was insufficient).** Its grep provably missed 2 of the
  fleet's 3 live violations. The verification now says so explicitly, is upgraded to the
  follow-up's step-1 pattern, and hands step 2 to TS-ASYNC-14. A scope exception for Vue
  *template*-bound handlers was added, conditional on TS-ASYNC-10 being wired; raw
  `addEventListener` inside a `.vue` file is explicitly excluded from that exception.
- **TS-ASYNC-01 extended.** `@typescript-eslint/strict-void-return` (shipped `8.68.0`,
  2026-08-24) added by name, because it is absent from `strictTypeChecked` and is the only rule
  of the three with an autofix for the handler bug. `checksVoidReturn`'s six sub-options are now
  named as must-stay-on. `setup-ocx` moves from fully-satisfied to partially-satisfied as a result.
- **TS-ASYNC-02 extended.** Now explicitly covers the `void (async () => {…})()` IIFE body,
  which is where the fleet's two newly-found gaps live (`PlayerPage.tsx:57-62`,
  `LibraryPage.tsx:30-39`).
- **TS-ASYNC-14 added (new).** The prescribed replacement shape TS-ASYNC-03 previously withheld,
  plus the bare-identifier ban and the Handler Identifier Trace. Sourced from
  `strict-void-return`'s own `suggestWrapInAsyncIIFE` autofix and typescript-eslint#9930.
- **TS-ASYNC-15/16/17 added (new).** The narrow concurrency ruleset. A blanket limiter rule was
  considered and **rejected on measurement** — 4 of 6 production sites would be false positives.
  15 bounds the I/O for wire-decoded arrays, 16 caps the array length as a second layer, 17
  picks the primitive and the number.
- **Verdict rewritten** for items 5, 6, 7 and gained a "Documented gaps" block: the untyped-repo
  bare-identifier gap, the no-lint-for-concurrency gap, `useEffect` already being compiler-clean,
  React 19 Actions being unavailable to this fleet, and the unestablished registry rate limit.
- **No ID was renumbered, retired, or reused.** TS-ASYNC-01..13 keep their numbers and meanings.

## Sub-artifacts

- [`ts-async/promise-observability.md`](ts-async/promise-observability.md) — what an unobserved
  rejection does in each of the fleet's four runtime shapes, the `void`-is-not-a-handler rule
  read off the fleet's two real gaps, and the per-shape top-level guard. Includes the direct
  Bun 1.3.10 experiment and the `microsoft/vscode` source read that corrects the extension-host
  crash assumption.
- [`ts-async/cancellation-and-timeouts.md`](ts-async/cancellation-and-timeouts.md) —
  `AbortSignal` composition, `signal.reason` typing, required-vs-optional signal parameters,
  timeout-inside-retry, and the per-surface mechanics for `fetch`, Connect-RPC, `@actions/exec`
  vs `child_process`, and VS Code's `CancellationToken`/`Disposable` split.
- [`ts-async/async-void-handlers.md`](ts-async/async-void-handlers.md) — the replacement shape
  TS-ASYNC-03 was missing, read off `strict-void-return@8.68.0`'s own autofix; the void-return
  assignability quirk that makes the whole family compile; `checksVoidReturn`'s six sub-options;
  the `useEffect` compile error; React 19 Actions; the Vue `callWithAsyncErrorHandling` source
  read that corrects TS-ASYNC-10; and the Handler Identifier Trace for untyped repos.
- [`ts-async/unbounded-concurrency.md`](ts-async/unbounded-concurrency.md) — every
  `Promise.all`-over-a-variable-array site in the fleet classified by where the array's length
  comes from, the dated 2026-08-22 `walker.ts` incident and what its fix teaches about *where*
  a bound belongs, and the p-limit/p-map/p-queue/`readable.map`/hand-rolled-`Semaphore`
  comparison behind TS-ASYNC-17.

## Key sources

| URL | Why it decided something here |
|---|---|
| [nodejs.org/api/cli.html#--unhandled-rejectionsmode](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode) | Verbatim text of all five modes and which is default — the basis for TS-ASYNC-12's "the default works but reports badly". |
| [nodejs.org/api/deprecations.html#dep0018](https://nodejs.org/api/deprecations.html#dep0018-unhandled-promise-rejections) | DEP0018 EOL at v15.0.0 — fixes the exact version boundary for "fatal by default". |
| [html.spec.whatwg.org §8.1.4.7](https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections) | `unhandledrejection` is cancelable and its only default action is "the UA *may* log" — why TS-ASYNC-10 exists at all. |
| [dom.spec.whatwg.org — `EventListener`](https://dom.spec.whatwg.org/#callbackdef-eventlistener) | A listener's return value is `undefined` by contract, and "report an exception" covers synchronous throws only — the mechanism behind "an async DOM listener fails silently". |
| [github.com/Microsoft/TypeScript/wiki/FAQ](https://github.com/Microsoft/TypeScript/wiki/FAQ#why-are-functions-returning-non-void-assignable-to-function-returning-void) | Why `async () => {}` is assignable to a `void`-returning callback by design — the root cause this whole family works around, and confirmation the compiler will never close it. |
| [typescript-eslint.io/rules/no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) | The `ignoreVoid: true` default — the single fact that makes TS-ASYNC-02 a reading rule rather than a lint. Its *correct* example is also an unbounded `Promise.all`, which settles TS-ASYNC-15's "no lint catches this". |
| [typescript-eslint.io/rules/no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) | `checksVoidReturn` and its six sub-toggles; the canonical `forEach(async …)` incorrect/correct pair behind TS-ASYNC-03. |
| [typescript-eslint.io/rules/strict-void-return](https://typescript-eslint.io/rules/strict-void-return) | The new (`8.68.0`, 2026-08-24) rule whose `suggestWrapInAsyncIIFE` autofix *is* TS-ASYNC-14's prescribed shape; absent from every preset config, hence named explicitly in TS-ASYNC-01. |
| [github.com/typescript-eslint/typescript-eslint#9930](https://github.com/typescript-eslint/typescript-eslint/issues/9930) | The maintainers rejecting a per-callee "trust me, it self-catches" escape hatch — why TS-ASYNC-14 forbids a bare reference to a self-catching `async` function. |
| [github.com/microsoft/vscode — extensionHostProcess.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/node/extensionHostProcess.ts) | The host's own `unhandledRejection` guard and 1000 ms grace window — primary source that resolved conflict 1. |
| [github.com/microsoft/vscode — extensionHostMain.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extensionHostMain.ts) | `installFullHandler`'s per-extension stack attribution — why a silent rejection is a debuggability problem, not a stability one. |
| [react.dev/reference/react/Component](https://react.dev/reference/react/Component) | Verbatim list of what an error boundary does *not* catch, including asynchronous code. |
| [react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19) | Actions/`useTransition`/`useActionState` — the framework mechanism this fleet cannot reach at React `18.3.1`. |
| [github.com/vuejs/core — errorHandling.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/errorHandling.ts) | `callWithAsyncErrorHandling`'s `res.catch(…)` — the source read that resolved conflict 5 and amended TS-ASYNC-10. |
| [vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler) | `errorHandler`'s capture surface and its dev-vs-production split — the receiver TS-ASYNC-10 now requires in a Vue app. |
| [developer.mozilla.org/.../AbortSignal/any_static](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static) | The canonical caller-signal + deadline composition example TS-ASYNC-06 prescribes verbatim. |
| [developer.mozilla.org/.../AbortSignal/timeout_static](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) | `TimeoutError` vs `AbortError` discrimination and "active time" semantics. |
| [raw.githubusercontent.com/nodejs/undici/.../api/Client.md](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Client.md) | The exact `connectTimeout`/`headersTimeout`/`bodyTimeout` defaults that make a bare `fetch` a ~10-minute worst case, not an infinity. |
| [raw.githubusercontent.com/nodejs/undici/.../api/Pool.md](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Pool.md) | `connections: null` = unlimited concurrent connections per origin — why the runtime provides no ceiling of its own, and TS-ASYNC-15 must. |
| [raw.githubusercontent.com/sindresorhus/p-map/main/readme.md](https://raw.githubusercontent.com/sindresorhus/p-map/main/readme.md) | `concurrency` defaults to `Infinity` — the fact behind TS-ASYNC-17's "always pass it explicitly". |
| [learn.microsoft.com/azure/architecture/patterns/bulkhead](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) | Names what the fleet's `Semaphore` is doing conceptually — a bulkhead, so one oversized batch degrades to slow rather than to starved. |
| [raw.githubusercontent.com/actions/toolkit/.../exec/src/interfaces.ts](https://raw.githubusercontent.com/actions/toolkit/main/packages/exec/src/interfaces.ts) | Verbatim `ExecOptions` — direct proof of no `timeout`/`signal`/`killSignal`, the basis for TS-ASYNC-05. |
| [nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback) | `timeout` + `signal` + `killSignal` on the primitive `@actions/exec` wraps but does not expose. |
| [github.com/connectrpc/connect-es — connect-transport.ts](https://github.com/connectrpc/connect-es/blob/main/packages/connect-web/src/connect-transport.ts) | `defaultTimeoutMs`'s precedence resolving to `undefined` when unset — the second half of TS-ASYNC-04. |
| [sre.google/sre-book/addressing-cascading-failures/](https://sre.google/sre-book/addressing-cascading-failures/) | Deadline propagation: one deadline set once, each attempt gets the remaining time — the argument behind TS-ASYNC-08. |
| [raw.githubusercontent.com/sindresorhus/p-timeout/main/readme.md](https://raw.githubusercontent.com/sindresorhus/p-timeout/main/readme.md) | The maintainer of the promise-race timeout library recommending `AbortSignal.timeout()` instead — TS-ASYNC-07's strongest citation. |

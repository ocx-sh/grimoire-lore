---
title: Cancellation and timeout composition for outbound calls
topic: ts-cancellation-timeouts
agent: dive-cancellation-timeouts
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 16
scope: >
  Covers AbortSignal composition (AbortSignal.any/.timeout, signal.reason typing,
  required-vs-optional signal parameters), timeout-vs-retry-vs-backoff interaction,
  and the per-surface timeout mechanics for global fetch(), Connect-RPC
  (connect-web), @actions/exec/child_process, and VS Code's CancellationToken vs.
  Disposable split — grounded in the fleet's 14 first-party fetch() sites,
  ocx-catalog's retry/jitter walker, creeptd-ng/web's two transport factories,
  setup-ocx's three exec sites, and grimoire-vscode's zero-CancellationToken
  extension host. Does not cover WebSocket/SSE long-lived-connection cancellation,
  database-driver timeouts, or non-TypeScript build-tool timeouts.
---

## Table of contents

1. [The fleet's fetch() inventory: one compliant line, and what it actually bounds](#1-the-fleets-fetch-inventory-one-compliant-line-and-what-it-actually-bounds)
2. [undici's silent floor: fetch() is loosely bounded, not unbounded](#2-undicis-silent-floor-fetch-is-loosely-bounded-not-unbounded)
3. [Composing a caller's signal with an internal deadline](#3-composing-a-callers-signal-with-an-internal-deadline)
4. [Typing `signal.reason`](#4-typing-signalreason)
5. [Should `signal` be required, optional, or absent on an internal helper](#5-should-signal-be-required-optional-or-absent-on-an-internal-helper)
6. [Timeout inside a retry loop: walker.ts as the case study](#6-timeout-inside-a-retry-loop-walkerts-as-the-case-study)
7. [Connect-RPC: defaultTimeoutMs, per-call override, both omitted fleet-wide](#7-connect-rpc-defaulttimeoutms-per-call-override-both-omitted-fleet-wide)
8. [@actions/exec has no timeout surface at all; execFile/spawn do](#8-actionsexec-has-no-timeout-surface-at-all-execfilespawn-do)
9. [VS Code: CancellationToken is shaped for request/response, not background work](#9-vs-code-cancellationtoken-is-shaped-for-requestresponse-not-background-work)

- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- Only 1 of the fleet's first-party `fetch()` sites sets a bound: `grimoire-indexer/src/validate/adapters/http.ts:96` passes `signal: AbortSignal.timeout(TIMEOUT_MS)` (`TIMEOUT_MS = 30_000`). Every other site — `grimoire-vscode/src/installer.ts:228`, all three `ocx-catalog/src/theme/composables/*.ts` fetches, and `ocx-catalog/src/sources/walker.ts`'s entire retry loop — passes no `signal` and no timeout at all.
- A bare `fetch()` is not *literally* infinite: Node's global fetch runs on undici's default `Agent`, whose `Client` defaults are `headersTimeout: 300_000` ms and `bodyTimeout: 300_000` ms (each independently reset per chunk), plus `connectTimeout: 10_000` ms — [undici docs](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Client.md). Worst case, one hung attempt can occupy the event loop for roughly 10 minutes before undici itself gives up. That is not a substitute for an explicit, tunable, short timeout — it is a silent, undocumented ceiling nobody at any of these call sites is relying on deliberately.
- `AbortSignal.any(signals)` (an array of signals in, one combined signal out; aborts with the reason of whichever input aborted first) is the standard-library composition primitive, Baseline 2024 in browsers and added in Node **v20.3.0 / v18.17.0** — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static), [Node docs](https://nodejs.org/api/globals.html#class-abortsignal).
- `AbortSignal.timeout(ms)` returns a signal that aborts with a `TimeoutError` `DOMException` after `ms` of *active* time (it does not tick while the process is suspended); added in Node **v17.3.0 / v16.14.0** — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static).
- `AbortSignal.reason` is typed `readonly reason: any` — verified directly in the fleet's own installed `typescript@6.0.3`'s `lib.dom.d.ts` at line 3395 (`grimoire-indexer/node_modules/typescript/lib/lib.dom.d.ts`). Anything read off `signal.reason` is `any` by default and will silently poison whatever it flows into.
- Two of the fleet's `engines.node` fields (`grimoire-vscode`, `vscode-ocx`: `"node": ">=20"`) are looser than the `AbortSignal.any()` floor (`20.3.0`). This is likely moot in practice — a VS Code extension runs inside the Electron extension host's bundled Node, not whatever satisfies `npm install`, and could not establish that host's exact bundled Node version as of 2026-08-29 — but the `engines` field itself does not prove the primitive is available.
- Even the one compliant site (`grimoire-indexer/http.ts`) has no caller-supplied cancellation input at all — `TIMEOUT_MS` is the only bound, hardcoded, with no way for a caller to cancel early or extend it. That is a legitimate, narrower design (see [§5](#5-should-signal-be-required-optional-or-absent-on-an-internal-helper)), not a gap, given the call shape (a one-shot CLI validation fetch with no surrounding cancellable operation).
- Connect-ES's own `runUnaryCall` does **not** use `AbortSignal.any()` to compose a caller signal with its deadline; it hand-rolls `createLinkedAbortController` (manual `addEventListener("abort", …)` fan-in with cleanup) because, per the library's own source comment, "we would simply use `AbortSignal.timeout()`, but it is not widely available yet" — [connect-es `signals.ts`](https://raw.githubusercontent.com/connectrpc/connect-es/main/packages/connect/src/protocol/signals.ts). That excuse no longer applies to this fleet's Node floors; new fleet code should prefer the native `AbortSignal.any()`/`.timeout()` pair over hand-rolled linking.
- Both `creeptd-ng/web` transport factories (`leaderboardClient.ts:16`, `lobbyClient.ts:36`) call `createConnectTransport({ baseUrl, … })` without `defaultTimeoutMs`. Per the library's own type, when `defaultTimeoutMs` is omitted it stays `undefined` and is only overridden per-call by an explicit `timeoutMs` — [`connect-transport.ts`](https://github.com/connectrpc/connect-es/blob/main/packages/connect-web/src/connect-transport.ts). Neither factory nor any call site sets a per-call `timeoutMs` either, so every RPC in this app runs with **no Connect-level deadline**, falling back to the browser's own (effectively unbounded, tab-lifetime) fetch behavior.
- `@actions/exec@^1.1.1`'s `ExecOptions` interface has **no** `timeout`, `signal`, or `killSignal` field — confirmed by reading the interface verbatim from source (`cwd`, `env`, `silent`, `outStream`, `errStream`, `windowsVerbatimArguments`, `failOnStdErr`, `ignoreReturnCode`, `delay`, `input`, `listeners`, nothing else) — [`interfaces.ts`](https://raw.githubusercontent.com/actions/toolkit/main/packages/exec/src/interfaces.ts). `setup-ocx`'s three call sites (`project.ts:136`, `project.ts:144`, `managed-config.ts:59`) therefore cannot bound their own subprocess in code at all.
- Node's own `child_process.execFile()` and `.spawn()` both accept `timeout` (ms, kills via `killSignal`, default `'SIGTERM'`) **and** `signal` (an `AbortSignal`) directly — [`execFile` docs](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback), [`spawn` docs](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options). `@actions/exec` is a thin wrapper over `child_process.spawn` that does not surface these two options to its caller.
- GitHub Actions' `timeout-minutes` exists at **both** job (`jobs.<job_id>.timeout-minutes`, default **360** minutes) and step level (`jobs.<job_id>.steps[*].timeout-minutes`, no default, same 360-minute ceiling) — [GitHub Actions workflow syntax](https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-syntax.md). So a workflow author *can* bound one of `setup-ocx`'s steps externally — but only at minute granularity, only from the consuming workflow's YAML, and with zero test coverage inside this repo; it is not a substitute for an in-code, unit-testable timeout on the Action's own subprocess calls.
- `ocx-catalog/src/sources/walker.ts`'s `retryFetch` retries up to `MAX_ATTEMPTS = 4` times with jittered exponential backoff (`RETRY_BASE_MS * 2 ** attempt * (0.5 + Math.random() * 0.5)`, algebraically AWS's "Equal Jitter" shape — [Brooker, AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)) — but **every** `fetchImpl(url, init)` call inside that loop carries no `AbortSignal` and no per-attempt timeout. A single hung TCP connection on attempt 1 blocks the retry loop from ever reaching attempt 2; the retry/backoff machinery is unreachable because nothing ever fails fast enough to trigger it.
- The canonical fix for a retry loop is not "add a timeout to each attempt" in isolation — Google's SRE book's deadline-propagation chapter argues for one overall deadline set once, with each layer/attempt getting the *remaining* time, not a fresh clock — [SRE Book, "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/). `walker.ts` has neither an overall deadline nor a per-attempt one today.
- VS Code's `CancellationToken` is the mechanism for operations VS Code itself hands you a request for and may cancel mid-flight (hover/completion/formatting providers, `lm.invokeTool()`, debug operations) — [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api#CancellationToken). It is not a general substitute for cancelling self-initiated background work.
- `grimoire-vscode` has **zero** `CancellationToken` usages and **zero** `vscode.window.withProgress` calls anywhere in `src/`. Every long-lived thing it owns (`prefetcher`, `checkScheduler`, `updateTimer`) is `setInterval`-driven and disposed via `context.subscriptions.push(...)` — which is the *correct* shape for self-scheduled background polling with no VS-Code-initiated request to cancel, not an avoidance of `CancellationToken`. It would become a gap only if the extension grows a user-triggered, potentially-slow foreground command (a "Refresh now") that should show a cancelable progress notification and currently doesn't.
- A `Promise.race([operation, delay])` timeout pattern does **not** cancel the underlying operation — it only stops *awaiting* it. The original `fetch`/subprocess/RPC keeps running, using sockets/CPU/memory, until it finishes or errors on its own. This is exactly why `sindresorhus/p-timeout`'s own README recommends native `AbortSignal.timeout()` over the library's promise-race helper: only a signal-based timeout can "notify the underlying operation to interrupt its work" — [`p-timeout` README](https://raw.githubusercontent.com/sindresorhus/p-timeout/main/readme.md).

## 1. The fleet's fetch() inventory: one compliant line, and what it actually bounds

| Site | Timeout/signal | Notes |
|---|---|---|
| `grimoire-indexer/src/validate/adapters/http.ts:96` | `signal: AbortSignal.timeout(TIMEOUT_MS)`, `TIMEOUT_MS = 30_000` | Only compliant site. No caller-supplied `signal` — see [§5](#5-should-signal-be-required-optional-or-absent-on-an-internal-helper). |
| `grimoire-vscode/src/installer.ts:228` | none; `redirect: 'follow'` | Downloads a release asset by URL; no size cap either, unlike the two compliant download-shaped fetchers below. |
| `ocx-catalog/src/theme/composables/usePackageRoot.ts:138,141` | none | Browser-side Vue composable, same-tab lifetime is the only implicit bound. |
| `ocx-catalog/src/theme/composables/useImageIndex.ts:82` | none | Same. |
| `ocx-catalog/src/theme/composables/useCatalog.ts:86` | none | Fetches a same-origin static asset (`/data/catalog/catalog.json`); lowest risk of the three, but still unbounded. |
| `ocx-catalog/src/sources/walker.ts` (`retryFetch`, `fetchOptionalAsset`) | none | See [§6](#6-timeout-inside-a-retry-loop-walkerts-as-the-case-study) — the more serious case, because it's wrapped in retry/backoff that never gets a chance to run. |

Contrast the two Node-side download functions directly — `grimoire-indexer/http.ts`'s `request()` (compliant) vs. `grimoire-vscode/installer.ts`'s `download()` (not):

```ts
// grimoire-indexer/src/validate/adapters/http.ts:87-97 — compliant
const response = await fetch(url, {
  headers: { "User-Agent": USER_AGENT, ...headers },
  method: options.method,
  body: options.body,
  redirect: "manual",
  signal: AbortSignal.timeout(TIMEOUT_MS),
});
```

```ts
// grimoire-vscode/src/installer.ts:227-228 — not compliant
async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'follow' });
```

`installer.ts`'s `download()` also has no response-size cap (unlike `readCapped`/`readBoundedBody` in the two compliant readers), and follows redirects rather than refusing them — that's a separate SSRF-shaped finding out of scope for this document, but it means the same call site is carrying two independent unbounded-input risks, not one.

## 2. undici's silent floor: fetch() is loosely bounded, not unbounded

Node's global `fetch()` dispatches through undici's default `Agent`, which is "the default dispatcher used by `request`, `stream`, and `fetch`" — [undici `Agent.md`](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Agent.md). An `Agent` is built from `Pool`→`Client`, and `Client`'s documented defaults are:

- `connectTimeout`: `10e3` (10,000 ms)
- `headersTimeout`: `300e3` (300,000 ms — 5 minutes)
- `bodyTimeout`: `300e3` (300,000 ms — 5 minutes, and this is a per-chunk idle timer, not a total-body-transfer timer)

— [undici `Client.md`](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Client.md).

So a call like `ocx-catalog/theme/composables/useCatalog.ts:86`'s `fetch('/data/catalog/catalog.json')` will eventually reject on its own — worst case around 10 seconds to connect plus up to 5 minutes of silence on headers plus up to 5 minutes of silence on the body. That is a real ceiling, but it is: (a) undocumented at every call site that relies on it, (b) far too loose for an interactive composable backing a UI, and (c) not something any of these call sites chose — it is inherited from undici's internal defaults, which are not part of the Fetch API surface and are invisible to anyone reading `fetch(url)` without already knowing undici internals. Treat "no explicit timeout" as "5-10 minutes worst case," never as "hangs forever" — but also never as acceptable.

## 3. Composing a caller's signal with an internal deadline

The standard-library shape, straight from MDN's own worked example:

```ts
// MDN's canonical composition pattern
const timeoutSignal = AbortSignal.timeout(5 * 60_000);
const combinedSignal = AbortSignal.any([callerSignal, timeoutSignal]);

try {
  const res = await fetch(url, { signal: combinedSignal });
} catch (e) {
  if (e.name === "TimeoutError") { /* our deadline fired */ }
  else if (e.name === "AbortError") { /* caller cancelled */ }
}
```

— [MDN `AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static). `AbortSignal.any(signals)` aborts as soon as any input signal aborts, and sets the combined signal's `.reason` to that input's own `.reason` — so the `e.name` discrimination above is exactly how a caller tells "I cancelled" apart from "the deadline fired," with zero extra bookkeeping.

**Where a real, mature library still hand-rolls this instead.** Connect-ES (`@connectrpc/connect@2.1.1`, used by `creeptd-ng/web`) does not call `AbortSignal.any()`. Its `runUnaryCall` builds the deadline with `createDeadlineSignal(timeoutMs)` (a plain `AbortController` + `setTimeout`) and links it to the caller's signal with a hand-written `createLinkedAbortController`:

```ts
// connectrpc/connect-es packages/connect/src/protocol/signals.ts (paraphrased structure, source verified)
export function createLinkedAbortController(
  ...signals: (AbortSignal | undefined)[]
): AbortController {
  const controller = new AbortController();
  const sa = signals.filter((s) => s !== undefined).concat(controller.signal);
  for (const signal of sa) {
    if (signal.aborted) { onAbort.apply(signal); break; }
    signal.addEventListener("abort", onAbort);
  }
  function onAbort(this: AbortSignal) {
    if (!controller.signal.aborted) controller.abort(getAbortSignalReason(this));
    for (const signal of sa) signal.removeEventListener("abort", onAbort);
  }
  return controller;
}
```

The source comment explains why: *"Ideally, we would simply use `AbortSignal.timeout()`, but it is not widely available yet"* — [`signals.ts`](https://raw.githubusercontent.com/connectrpc/connect-es/main/packages/connect/src/protocol/signals.ts). That constraint is historical, not current: this fleet's lowest Node floor for any repo touching this pattern (`setup-ocx`, `>=24`; `ocx-catalog`, `>=20.19`; both above the `20.3.0`/`18.17.0` floor for `AbortSignal.any()`) has no reason to reproduce Connect-ES's workaround in new fleet code — reach for the native composition shown above, not a hand-rolled linked controller, for anything written today.

## 4. Typing `signal.reason`

`AbortSignal.reason` is typed `readonly reason: any` in the DOM lib — verified directly at `grimoire-indexer/node_modules/typescript/lib/lib.dom.d.ts:3395` (this fleet's installed `typescript@^6.0.3`). MDN describes the runtime contract the same way: `undefined` while unaborted, a `DOMException` named `"AbortError"` if `abort()` was called with no argument, or "any JavaScript value" if one was passed — [MDN `AbortSignal.reason`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason). `AbortSignal.timeout()`'s own reason is a `TimeoutError` `DOMException` specifically — [MDN `AbortSignal.timeout()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static).

Because the type is `any`, nothing stops `signal.reason` from being thrown, logged, or compared without narrowing — and `any` propagates through anything it touches. Narrow it before it leaves the function that observed the abort:

```ts
// wrong — `any` leaks into the caller; a non-Error reason breaks `.message` access
} catch (err) {
  if (signal.aborted) throw signal.reason; // reason: any
}

// right — narrow once, at the boundary
} catch (err) {
  if (signal.aborted) {
    const reason: unknown = signal.reason;
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
}
```

## 5. Should `signal` be required, optional, or absent on an internal helper

Three shapes actually observed or reachable in this fleet, and when each is right:

- **Absent** — `grimoire-indexer/http.ts`'s `request()` today: a fixed internal `AbortSignal.timeout(TIMEOUT_MS)` only, no caller input. Correct *only* when the call site is the outermost boundary and there is no larger cancellable operation it could be part of — true for a one-shot CLI validation fetch, false the moment this function is called from inside anything with its own cancellation story (a batch validator, a watch-mode loop).
- **Optional, composed internally** — the shape to prefer for anything that isn't provably a leaf call:

  ```ts
  export async function request(
    url: string,
    options: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<HttpResponse> {
    const deadline = AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS);
    const signal = options.signal
      ? AbortSignal.any([options.signal, deadline])
      : deadline;
    const response = await fetch(url, { signal, /* … */ });
    // ...
  }
  ```

  This is Node's own convention for `child_process.execFile`/`.spawn` (`signal?: AbortSignal`, always optional, always composable with the built-in `timeout` option) — [Node `execFile` docs](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback). Making it optional costs nothing at existing call sites (every current caller keeps compiling unchanged) and unblocks the one caller that eventually needs to cancel early.
- **Required** — only justified when a function's entire contract *is* "do this until told to stop" and a missing signal would be a caller bug, not a convenience gap (an indefinite polling loop, a long-lived subscription). None of the fleet's current outbound-call helpers are that shape; none of the sites inventoried here should make `signal` required.

## 6. Timeout inside a retry loop: walker.ts as the case study

`ocx-catalog/src/sources/walker.ts`'s `retryFetch` is the fleet's only retry+backoff wrapper around a network call, and it is a clean illustration of the composition gap the brief asked about — because it currently has *no* timeout at any layer, not merely an uncombined one:

```ts
// ocx-catalog/src/sources/walker.ts:227-256 (elided for length; behavior preserved)
async function retryFetch(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit | undefined,
  acceptStatus: (status: number) => boolean,
  sleep: SleepFn,
): Promise<Response> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, ...NO_REDIRECT }); // no signal, ever
    } catch (err) {
      if (attempt < MAX_ATTEMPTS - 1) await sleep(backoffDelayMs(attempt));
      continue;
    }
    // ...
  }
}
```

`backoffDelayMs(attempt) = RETRY_BASE_MS * 2 ** attempt * (0.5 + Math.random() * 0.5)` with `RETRY_BASE_MS = 500` and `MAX_ATTEMPTS = 4` is algebraically AWS's "Equal Jitter" backoff shape (`temp/2 + random(0, temp/2)`, where `temp = base * 2^attempt`) from Marc Brooker's canonical post — [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/). The jitter math is fine. The problem is one layer out: because `fetchImpl` is called with no `AbortSignal`, a single attempt that never resolves or rejects (a server that accepts the TCP connection and then goes silent, inside undici's ~5-minute `headersTimeout` window) blocks the function for that entire window before the retry loop even gets a chance to back off and try attempt 2. The four-attempt budget is designed for *fast* failures (connection refused, 5xx) — it does nothing for a *slow* one.

Two changes compose correctly here, and both are needed together:

```ts
// per-attempt timeout, short relative to the overall retry budget
async function retryFetch(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit | undefined,
  acceptStatus: (status: number) => boolean,
  sleep: SleepFn,
  overallSignal?: AbortSignal,        // caller's own cancellation, still optional
  perAttemptTimeoutMs = 10_000,       // short: this is ONE attempt, not the whole op
): Promise<Response> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptSignal = overallSignal
      ? AbortSignal.any([overallSignal, AbortSignal.timeout(perAttemptTimeoutMs)])
      : AbortSignal.timeout(perAttemptTimeoutMs);
    try {
      const response = await fetchImpl(url, { ...init, ...NO_REDIRECT, signal: attemptSignal });
      // ...
    } catch (err) {
      if (overallSignal?.aborted) throw err; // caller cancelled — stop retrying, don't backoff-and-retry a cancellation
      if (attempt < MAX_ATTEMPTS - 1) await sleep(backoffDelayMs(attempt));
    }
  }
}
```

The second change — `if (overallSignal?.aborted) throw err` before backing off — matters independently: without it, a caller-cancelled operation gets *retried* up to three more times instead of stopping, because a `CancelledError`/`AbortError` looks like any other thrown error to the existing `catch`. This is the deadline-propagation principle from Google's SRE book applied at the smallest scale: "servers should check the deadline left... before attempting to perform any more work" — [SRE Book](https://sre.google/sre-book/addressing-cascading-failures/) — a retry loop is exactly a place that attempts more work, so it is exactly a place that must re-check before doing so.

## 7. Connect-RPC: defaultTimeoutMs, per-call override, both omitted fleet-wide

`ConnectTransportOptions.defaultTimeoutMs?: number` — "The timeout in milliseconds to apply to all requests. This can be overridden on a per-request basis by passing a `timeoutMs`." When omitted, the implementation's own precedence logic falls through to `undefined`:

```ts
// packages/connect-web/src/connect-transport.ts (paraphrased, source verified)
timeoutMs = timeoutMs === undefined
  ? options.defaultTimeoutMs   // undefined if the transport never set it
  : timeoutMs <= 0 ? undefined : timeoutMs;
```

— [`connect-transport.ts`](https://github.com/connectrpc/connect-es/blob/main/packages/connect-web/src/connect-transport.ts). Both `creeptd-ng/web` factories skip the field entirely:

```ts
// creeptd-ng/web/src/api/leaderboardClient.ts:16-20
const transport = createConnectTransport({
  baseUrl: import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:8080",
  // BFF pattern: session cookie sent automatically; no Authorization header.
});
```

```ts
// creeptd-ng/web/src/api/lobbyClient.ts:36-39
_transport = createConnectTransport({
  baseUrl: gatewayBaseUrl,
  // BFF pattern: session cookie is sent automatically.
});
```

Neither factory's call sites pass a per-call `timeoutMs` either (not shown, verified by grep across `src/`). Per Connect's own docs, a caller-provided `AbortSignal` is a separate, independent cancellation channel from `timeoutMs` — passing one does not imply a deadline, and vice versa — [Connect docs, cancellation and timeouts](https://connectrpc.com/docs/web/cancellation-and-timeouts/). So today, every RPC this app makes runs with no Connect-level deadline and no caller signal: cancellation and timeout are both entirely absent, not merely uncomposed.

## 8. @actions/exec has no timeout surface at all; execFile/spawn do

`@actions/exec@^1.1.1`'s complete `ExecOptions` interface, read from source:

```ts
// actions/toolkit packages/exec/src/interfaces.ts — verbatim
export interface ExecOptions {
  cwd?: string
  env?: {[key: string]: string}
  silent?: boolean
  outStream?: stream.Writable
  errStream?: stream.Writable
  windowsVerbatimArguments?: boolean
  failOnStdErr?: boolean
  ignoreReturnCode?: boolean
  delay?: number          // ms to wait for stdio streams to close AFTER exit — not a run-time bound
  input?: Buffer
  listeners?: ExecListeners
}
```

— [`interfaces.ts`](https://raw.githubusercontent.com/actions/toolkit/main/packages/exec/src/interfaces.ts). There is no `timeout`, `signal`, or `killSignal` field. `setup-ocx`'s three call sites all inherit this gap:

```ts
// setup-ocx/src/project.ts:136, :144 and managed-config.ts:59 — all unbounded
await exec.exec(ocxBin, pullArgs, { cwd: inputs.workingDirectory });
await exec.exec(ocxBin, ["--project", inputs.projectFile, "env", "--ci=github"], { cwd: /* … */ });
await exec.exec(ocxBin, args, { cwd: workingDirectory });
```

By contrast, `node:child_process.execFile()` and `.spawn()` both take `timeout` (ms; on expiry the child is killed with `killSignal`, default `'SIGTERM'`) and `signal` (`AbortSignal`) directly:

```ts
// Node's own documented pattern — execFile
const controller = new AbortController();
const child = execFile('node', ['--version'], { signal: controller.signal, timeout: 30_000 }, (error) => {
  console.error(error); // AbortError if aborted, or the timeout-kill error
});
```

— [`execFile` docs](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback), [`spawn` docs](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options). `@actions/exec` is a `child_process.spawn` wrapper that does not forward either option to its own caller — the gap is in the package's public interface, not in Node.

The only bound available today is external and coarse: GitHub Actions' `timeout-minutes`, settable at `jobs.<job_id>.timeout-minutes` (default **360** minutes if unset) or per-step at `jobs.<job_id>.steps[*].timeout-minutes` (no default, same 360-minute ceiling) — [GitHub Actions workflow syntax](https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-syntax.md). That bound lives in the *consuming* workflow's YAML, not in `setup-ocx`'s own tests, is minute-granularity, and kills the whole step (every action invocation in it), not the one hung `ocx` subprocess. It is a backstop, not a substitute for an in-code timeout on the three call sites themselves.

## 9. VS Code: CancellationToken is shaped for request/response, not background work

VS Code's `CancellationToken` "signals when VS Code requests that an ongoing operation stop" and shows up specifically on operations VS Code itself initiates and may need to interrupt — hover/completion/diagnostics/formatting providers, `lm.invokeTool()`, debug operations — [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api#CancellationToken). It is a parameter *VS Code hands you* for a *single request VS Code made*, not a general-purpose cancellation bus a extension reaches for on its own.

`grimoire-vscode/src/extension.ts` has zero `CancellationToken` usages anywhere in `src/` (confirmed by grep) and zero `vscode.window.withProgress` calls (the API that *would* hand the extension a token for a user-visible, cancelable, extension-initiated operation). Every long-lived piece of state it owns is interval/event-driven and lifecycle-managed through `context.subscriptions`:

```ts
// grimoire-vscode/src/extension.ts (line numbers as found)
context.subscriptions.push(prefetcher);          // 338
context.subscriptions.push(watchers);             // 479
context.subscriptions.push(checkScheduler);        // 554
context.subscriptions.push({ dispose: () => clearInterval(updateTimer) }); // 653
```

This is the right shape for what exists today: none of these are VS-Code-initiated requests with a natural cancellation point — they are self-scheduled background polling that should run until the extension deactivates, at which point `dispose()` (not cancellation) is the correct stop signal. Reach for `CancellationToken` only if/when the extension adds a *foreground*, user-triggered, potentially-slow command — something shown via `vscode.window.withProgress({ cancellable: true }, (progress, token) => …)` — which does not exist in this codebase today. Until then, the absence of `CancellationToken` here is a correct read of the API's intended shape, not an avoidance, and does not need a rule forcing its adoption — only a note for whoever adds the first foreground command.

## Normative guidance candidates

1. **Every outbound network call (`fetch`, an RPC client call, a subprocess spawn) sets an explicit timeout — never rely on the platform default.** Rationale: undici's fetch default is a silent 5-10 minute worst case ([§2](#2-undicis-silent-floor-fetch-is-loosely-bounded-not-unbounded)); Connect-ES falls back to the browser's unbounded default when `defaultTimeoutMs` is unset ([§7](#7-connect-rpc-defaulttimeoutms-per-call-override-both-omitted-fleet-wide)); `@actions/exec` has no bound of any kind ([§8](#8-actionsexec-has-no-timeout-surface-at-all-execfilespawn-do)). Verify: `grep -rn "fetch(" --include="*.ts" src/` and confirm every hit's options object carries `signal:`; for Connect-ES, `grep -rn "createConnectTransport(" src/` and confirm `defaultTimeoutMs` is set.
2. **Compose a caller signal with an internal deadline using `AbortSignal.any([callerSignal, AbortSignal.timeout(ms)])` — never a hand-rolled `addEventListener("abort", …)` fan-in.** Rationale: it's one line, standard library, and correctly propagates whichever signal's `.reason` fired first; Connect-ES's own hand-rolled version exists only because it predates broad `AbortSignal.timeout()` availability, a constraint this fleet's Node floors don't have ([§3](#3-composing-a-callers-signal-with-an-internal-deadline)). Verify: grep for `addEventListener("abort"` or `addEventListener('abort'` in first-party `src/` — any hit outside a vendored/third-party file is a candidate for replacement with `AbortSignal.any()`.
3. **Give every internal async helper an optional `signal?: AbortSignal` parameter unless it is a provable outermost leaf call with no larger cancellable context.** Rationale: optional costs nothing at existing call sites and is Node's own convention (`execFile`/`spawn`); required is only correct for "run until told to stop" contracts, which none of this fleet's outbound-call helpers are ([§5](#5-should-signal-be-required-optional-or-absent-on-an-internal-helper)). Verify: reading heuristic — does the function call another async function that itself could benefit from cancellation? If yes and it has no `signal` parameter, that's a finding.
4. **Never read `signal.reason` and use it un-narrowed** (throw it, log it, compare it) — narrow with `reason instanceof Error ? reason : new Error(String(reason))` at the point of observation. Rationale: `AbortSignal.reason` is typed `any` in `lib.dom.d.ts` (verified fleet-locally at `typescript@6.0.3`'s `lib.dom.d.ts:3395`); `any` silently defeats every downstream type check it touches ([§4](#4-typing-signalreason)). Verify: grep `\.reason\b` in `src/**/*.ts` and check each hit is immediately narrowed, not passed on raw.
5. **A retry loop must give each attempt its own short timeout, distinct from — and smaller than — its overall retry budget, and must stop retrying (not back off and retry again) when the caller's own signal is what aborted the attempt.** Rationale: `walker.ts`'s `retryFetch` has neither today, so a single hung attempt defeats the entire retry/backoff design by never reaching attempt 2 ([§6](#6-timeout-inside-a-retry-loop-walkerts-as-the-case-study)). Verify: for every retry loop wrapping an awaited I/O call, confirm (a) the awaited call receives a signal/timeout distinct from the loop's own iteration counter, and (b) the catch block distinguishes "caller cancelled" from "this attempt failed" before deciding whether to sleep-and-retry.
6. **Prefer `node:child_process.execFile`/`.spawn` over `@actions/exec` wherever a subprocess needs an in-code timeout or is cancellable.** Rationale: `@actions/exec@^1.1.1`'s `ExecOptions` has no `timeout`/`signal`/`killSignal` field at all — verified from source — while `execFile`/`spawn` have both natively ([§8](#8-actionsexec-has-no-timeout-surface-at-all-execfilespawn-do)). Verify: `grep -rn "@actions/exec\|exec\.exec(" src/` — every hit is a candidate; confirm each either has an external `timeout-minutes` bound the reviewer is comfortable relying on, or gets migrated.
7. **Set `defaultTimeoutMs` on every `createConnectTransport(...)` call; never leave it to fall back to `undefined`.** Rationale: Connect-ES's own precedence resolves an unset `defaultTimeoutMs` straight to `undefined` with no further fallback — the browser's own (practically unbounded) fetch behavior is what actually bounds the call ([§7](#7-connect-rpc-defaulttimeoutms-per-call-override-both-omitted-fleet-wide)). Verify: `grep -rn "createConnectTransport(" src/` and confirm `defaultTimeoutMs` appears in every call's options object.
8. **A `Promise.race([op, timeoutPromise])` pattern is a rejection to fix on sight — it does not cancel `op`.** Rationale: only a signal-based timeout actually interrupts the underlying operation; a raced promise leaves the original fetch/subprocess/RPC running to completion in the background regardless of who "won" the race, which is precisely why `p-timeout`'s own maintainer recommends the native `AbortSignal.timeout()` path instead ([Summary](#summary)). Verify: grep `Promise\.race\(\[` in `src/**/*.ts`; any hit racing an awaited I/O call against a `setTimeout`-based promise is a candidate for replacement.
9. **Do not introduce `CancellationToken` plumbing for extension-owned background/interval work; reserve it for operations VS Code itself initiates or a `withProgress({ cancellable: true })` foreground command.** Rationale: `CancellationToken` is documented and shaped for request/response operations VS Code hands you, not self-scheduled polling — `grimoire-vscode`'s current all-`Disposable` shape is correct for what it does today ([§9](#9-vs-code-cancellationtoken-is-shaped-for-requestresponse-not-background-work)). Verify: this is a "note, not a gate" — re-check only when a new foreground, user-triggered, potentially-slow command is added; at that point it should show `withProgress` with a token, not a fire-and-forget promise.
10. **State an explicit numeric default per call shape rather than "some timeout":** an interactive/browser-composable fetch backing UI, ≤10s; a CLI/CI validation fetch (`grimoire-indexer`'s existing 30s), ≤30s; a single retry attempt inside a retry loop, meaningfully shorter than the loop's own total budget (10s per attempt against a ~1-2 minute worst-case 4-attempt budget, for example) — never one flat constant reused for both "one attempt" and "the whole operation." Rationale: `walker.ts`'s gap in [§6](#6-timeout-inside-a-retry-loop-walkerts-as-the-case-study) exists precisely because no per-attempt number was ever chosen. Verify: reading heuristic — for any timeout constant, ask "is this bounding one attempt or the whole operation," and confirm the code actually enforces that scope, not the other one.

## AI-agent angle

- **Hallucinating a `timeout` option directly on `fetch()`.** `fetch()` has no `timeout` field — only `signal`. An LLM trained on older HTTP-client idioms (`axios`'s `timeout:`, XHR's `.timeout`) will confidently write `fetch(url, { timeout: 5000 })`, which TypeScript's `RequestInit` type will reject at compile time (a real, if minor, safety net) but which an agent might "fix" by casting to `any` instead of switching to `AbortSignal.timeout()`. Mechanical check: `grep -n "fetch(.*timeout:" src/**/*.ts` — any hit is either a bug or a cast-away-the-error.
- **Writing `Promise.race([fetch(url), delay(ms)])` as "the" timeout pattern.** This compiles, looks correct in review, and is the dominant pre-`AbortSignal.timeout()` idiom in training data — but it does not cancel the underlying `fetch`, so under load the "timed out" request keeps consuming a socket until undici's own 5-minute defaults eventually reap it (see [§2](#2-undicis-silent-floor-fetch-is-loosely-bounded-not-unbounded)). Mechanical check: `grep -n "Promise\.race(\[" src/**/*.ts`, inspect each hit for an awaited I/O call as one of the raced promises.
- **Hallucinating a `timeout`/`signal` option on `@actions/exec`'s `ExecOptions`.** An agent asked to "add a timeout to this exec.exec call" is very likely to write `exec.exec(bin, args, { timeout: 30_000 })` by analogy with `child_process.execFile` — this compiles to nothing (TypeScript will actually reject the excess property on an object literal, `error TS2353`, which catches it — but only for a literal; spreading an options object with an extra `timeout` key silently drops it instead of erroring). Mechanical check: after any agent-authored change touching `exec.exec(`, run `tsc --noEmit` and separately confirm by reading the diff that no `timeout`/`signal` key was added to a spread/variable-typed options object (which `tsc` would not catch).
- **Using `AbortSignal.any(someSet)` or `AbortSignal.any(signalA, signalB)` (varargs) instead of an array.** The DOM spec's own prose says "iterable," and an agent may pass a `Set<AbortSignal>` or spread arguments by analogy with `Promise.any`/`Array.of`-style varargs APIs. This fleet's shipped `lib.dom.d.ts` (`typescript@6.0.3`) types the parameter strictly as `any(signals: AbortSignal[]): AbortSignal` (verified at line 3422) — a `Set` needs `Array.from(...)` first, and varargs is a straight type error. Mechanical check: `tsc --noEmit` catches both immediately; no grep needed, but `grep -n "AbortSignal\.any(" src/**/*.ts` followed by eyeballing the argument shape is a fast pre-compile sanity pass.
- **Forgetting to compose a per-attempt timeout with the caller's own signal inside a retry loop, or composing them but forgetting to distinguish "caller cancelled" from "this attempt failed" before backing off.** An agent asked to "add a timeout" to a retry loop will very plausibly add the per-attempt `AbortSignal.timeout(ms)` shown in [§6](#6-timeout-inside-a-retry-loop-walkerts-as-the-case-study) and stop there, without also gating the backoff-and-retry branch on `overallSignal?.aborted`. The result compiles, passes a "does it time out" smoke test, and still retries three more times after a caller-initiated cancellation before ever surfacing it. Mechanical check: no lint catches this — the reading heuristic is "for every `catch` block inside a retry loop that decides whether to sleep-and-retry, does it check the caller's signal state before deciding," which has to be read, not grepped.
- **Assuming `signal.reason` is a typed `Error` and calling `.message` on it directly.** Because `reason` is `any` (verified, [§4](#4-typing-signalreason)), `signal.reason.message` type-checks even when `reason` is a plain string, a `DOMException`, or `undefined` — and only throws at runtime. An agent writing error-handling code around a caught abort will often write this without narrowing, because the type system gives it no signal (no pun intended) to do otherwise. Mechanical check: grep `\.reason\.message\b` or `\.reason\.` more broadly in `src/**/*.ts`, and confirm each is preceded by an `instanceof Error`/`typeof` narrow.

## Contested / evolving

- **Whether Connect-ES should migrate its internal `createLinkedAbortController`/`createDeadlineSignal` to native `AbortSignal.any()`/`.timeout()`.** The library's own source comment frames its current approach as a workaround for `AbortSignal.timeout()` "not... widely available yet" at time of writing — a constraint that has since resolved (Baseline 2024, Node ≥17.3/16.14 for `.timeout()`, ≥20.3/18.17 for `.any()`). As of 2026-08-29, could not establish whether `@connectrpc/connect`'s maintainers have an open issue or a newer major version tracking this migration — worth re-checking the next time this repo's `@connectrpc/connect` dependency is bumped past `^2.1.1`.
- **Whether `signal` should be required rather than optional on new async helpers, project-wide.** This document lands on "optional, composed internally" as the default ([§5](#5-should-signal-be-required-optional-or-absent-on-an-internal-helper)), matching Node's own `child_process` convention — but some teams and some newer TypeScript-first HTTP client designs (undici's own `Dispatcher.request()`, for instance) treat `signal` as a first-class, always-present part of the call shape rather than a bolt-on optional field, on the theory that an *optional* signal is one an agent or a rushed reviewer will simply never pass. Which convention wins is a matter of house style, not settled practice; this fleet has no existing convention to contradict, so "optional by default, required only for run-until-stopped contracts" is this document's recommendation, not an industry consensus.
- **`AbortSignal.any()`'s per-call listener/allocation overhead at high call volume.** MDN and Node's docs describe the composition behavior precisely but neither discusses performance at scale (thousands of composed signals per second) — a legitimate question for `ocx-catalog`'s walker (`MAX_CONCURRENCY = 16` concurrent fetches, potentially many more over a large index) that this document could not establish an answer to as of 2026-08-29. If it becomes a measured concern, the fallback is Connect-ES's own hand-rolled `createLinkedAbortController`-style approach, which avoids one intermediate `AbortController` allocation — trading readability for a micro-optimization that should be justified by a profile, not assumed.
- **Whether GitHub Actions' `timeout-minutes` should ever be treated as "good enough" for a subprocess bound instead of migrating off `@actions/exec`.** Practice is trending toward "no" for anything security- or reliability-sensitive (minute-granularity, kills the whole step not the one process, lives outside the package's own test suite) — but for a low-stakes, already-fast CLI call, some teams do treat the workflow-level bound as sufficient and skip the `execFile` migration. This document takes the stricter position (rule 6) because `setup-ocx` ships as a reusable Action other repos depend on, not a one-off internal script — a looser call might be defensible for a script with a single, known, internal caller.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [developer.mozilla.org/.../AbortSignal/any_static](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static) | MDN reference | Baseline 2024 | Canonical composition example (caller signal + timeout signal) this document's recommended pattern is drawn from. |
| [developer.mozilla.org/.../AbortSignal/timeout_static](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) | MDN reference | Baseline 2024 | Confirms `TimeoutError` vs `AbortError` discrimination and "active time" semantics. |
| [developer.mozilla.org/.../AbortSignal/reason](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason) | MDN reference | current | Runtime contract for `.reason`: default `DOMException("AbortError")`, otherwise whatever was passed. |
| [nodejs.org/api/globals.html#class-abortsignal](https://nodejs.org/api/globals.html#class-abortsignal) | Node.js official API docs | read 2026-08-29, versions through Node 26.x docs tree | Exact "Added in" versions for `.abort()`, `.timeout()`, `.any()` — grounds the fleet's Node-floor compatibility claims. |
| [nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback) | Node.js official API docs | current | `timeout`/`signal`/`killSignal` options verbatim — the primitive `@actions/exec` doesn't expose. |
| [nodejs.org/api/child_process.html#child_processspawncommand-args-options](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) | Node.js official API docs | current | Confirms `spawn()` (what `@actions/exec` wraps) has the same `timeout`/`signal` support as `execFile`. |
| [github.com/actions/toolkit .../exec/README.md](https://github.com/actions/toolkit/blob/main/packages/exec/README.md) | Official `@actions/toolkit` source repo | `^1.1.1` era | Points to the interface source; usage examples confirm no timeout-shaped option in normal use. |
| [raw.githubusercontent.com/actions/toolkit .../exec/src/interfaces.ts](https://raw.githubusercontent.com/actions/toolkit/main/packages/exec/src/interfaces.ts) | Primary source code | `^1.1.1` era | Verbatim `ExecOptions` interface — the direct proof there is no `timeout`/`signal` field. |
| [raw.githubusercontent.com/github/docs .../workflow-syntax.md](https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-syntax.md) | GitHub's own docs source | current | `timeout-minutes` at both job (default 360) and step level — the only external bound on `setup-ocx`'s subprocesses. |
| [connectrpc.com/docs/web/cancellation-and-timeouts/](https://connectrpc.com/docs/web/cancellation-and-timeouts/) | Official Connect-ES docs | `@connectrpc/connect@2.x` era | States `AbortSignal` and `timeoutMs` are independent cancellation channels — neither implies the other. |
| [github.com/connectrpc/connect-es .../connect-web/src/connect-transport.ts](https://github.com/connectrpc/connect-es/blob/main/packages/connect-web/src/connect-transport.ts) | Primary source code | `@connectrpc/connect-web@2.1.1` (fleet's pinned range) | `defaultTimeoutMs` field, doc comment, and the precedence logic that falls to `undefined` when unset. |
| [raw.githubusercontent.com/connectrpc/connect-es .../protocol/signals.ts](https://raw.githubusercontent.com/connectrpc/connect-es/main/packages/connect/src/protocol/signals.ts) | Primary source code | `@connectrpc/connect@2.1.1` era | `createLinkedAbortController`/`createDeadlineSignal` plus the source comment explaining why native `AbortSignal.timeout()` wasn't used historically. |
| [code.visualstudio.com/api/references/vscode-api#CancellationToken](https://code.visualstudio.com/api/references/vscode-api#CancellationToken) | Official VS Code API reference | `vscode@^1.96.0` era (fleet's pinned range) | Establishes `CancellationToken`'s intended shape: VS-Code-initiated request/response operations, not background work. |
| [raw.githubusercontent.com/nodejs/undici .../docs/api/Client.md](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Client.md) | Official undici docs | current | Exact default `headersTimeout`/`bodyTimeout`/`connectTimeout` values that silently bound a signal-less `fetch()`. |
| [raw.githubusercontent.com/nodejs/undici .../docs/api/Agent.md](https://raw.githubusercontent.com/nodejs/undici/main/docs/docs/api/Agent.md) | Official undici docs | current | Confirms `Agent` (built from the same `Client` defaults) is the dispatcher Node's global `fetch` actually uses. |
| [sre.google/sre-book/addressing-cascading-failures/](https://sre.google/sre-book/addressing-cascading-failures/) | Google SRE Book, official online edition | canonical, widely cited | Deadline-propagation principle: one deadline set once, each layer/attempt gets the *remaining* time — the argument behind rule 5. |
| [aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) | AWS Architecture Blog, Marc Brooker | canonical, widely cited | Names the "Equal Jitter" formula `walker.ts`'s `backoffDelayMs` implements. |
| [raw.githubusercontent.com/sindresorhus/p-timeout/main/readme.md](https://raw.githubusercontent.com/sindresorhus/p-timeout/main/readme.md) | Popular npm library README (sindresorhus) | current | Maintainer's own recommendation to prefer native `AbortSignal.timeout()` over a promise-race timeout, because only the signal-based approach actually interrupts the underlying operation. |

---
title: Process and timer lifecycle
topic: child_process invocation contracts (argv, timeout, maxBuffer, ENOENT, stdin EPIPE) and setTimeout/setInterval cleanup discipline, measured against one exemplar and its fleet-wide divergences
agent: scout-process-lifecycle
model: sonnet
date_researched: 2026-08-29
sources_count: 21
scope: child_process invocation (execFile/exec/execFileAsync/@actions-exec) and setTimeout/setInterval lifecycle across the nine-repo fleet. Does not cover fetch()/HTTP timeouts (separate research line), VS Code disposable→context.subscriptions hygiene (already clean, out of scope per brief), or tar/archive path-traversal ("zip slip") security — only the timeout/maxBuffer/timer-cleanup dimension of each site.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The exemplar: `grim.ts`'s `runJson`](#1-the-exemplar-gimts-runjson)
  2. [Node's child_process contract: the ground truth](#2-nodes-child_process-contract-the-ground-truth)
  3. [The stdin EPIPE race: nodejs/node#40085](#3-the-stdin-epipe-race-nodejsnode40085)
  4. [Divergence catalog](#4-divergence-catalog)
  5. [`kill()` does not reach a shell's descendants](#5-kill-does-not-reach-a-shells-descendants)
  6. [Timer lifecycle: three categories, one leak](#6-timer-lifecycle-three-categories-one-leak)
  7. [maxBuffer sizing](#7-maxbuffer-sizing)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- **The fleet's one correct wrapper is `grimoire-vscode/src/grim.ts:596-633` (`runJson`)**: `execFile` with an argv array (`shell: false`), a default `timeout: options.timeoutMs ?? 120_000`, an explicit `maxBuffer: 16 * 1024 * 1024`, ENOENT distinguished from a real exit-code failure, and a `child.stdin.on('error', () => {})` guard against a documented Node race. Every other fleet wrapper is missing at least one of these five elements — judge every child-process call site against this shape.
- Node's own defaults are permissive, not safe: `timeout` is **0 (disabled)** by default, `maxBuffer` is **1 MiB**, `killSignal` is `SIGTERM` — confirmed on [nodejs.org's `child_process` docs](https://nodejs.org/api/child_process.html). A call site that passes no options is not "using Node's safe default," it is opting into "runs until the OS kills it or the buffer overflows."
- `grimoire-vscode/src/installer.ts:242-251` (`extract()`, tar via `execFile`) sets **neither** `timeout` nor `maxBuffer` — one file away from `grim.ts`'s `runJson` in the *same repo*. Verdict: **defect**, not a justified difference. Nothing about extracting a checksum-verified tarball needs unbounded time, and this runs during the blocking extension-activation install flow.
- `vscode-ocx/src/ocx.ts`'s three `execFileAsync` call sites (`runEnv:105`, `runInit:141`, `runSubcommand:207`) set **no timeout at all**; two of three set `maxBuffer` (4 MiB), `runInit` sets neither. Verdict: **defect** — a hung `ocx env`/`ocx pull` blocks the extension host command indefinitely, with no recovery path for the user beyond reloading the window.
- `setup-ocx`'s three `@actions/exec` calls (`project.ts:136,144`, `managed-config.ts:59`) are a **justified difference**, confirmed by reading `@actions/toolkit`'s own source: `ExecOptions` has [no `timeout`/`signal` field](https://github.com/actions/toolkit/blob/main/packages/exec/src/interfaces.ts), and `ToolRunner` [never sends a kill signal under any condition](https://github.com/actions/toolkit/blob/main/packages/exec/src/toolrunner.ts) — its only internal "timeout" is a 10-second *post-exit* stdio-drain delay, unrelated to bounding a hung command. `exec()` also returns only `Promise<number>` — no `ChildProcess` handle is ever exposed to the caller, so there is literally nothing to `.kill()` even if a caller wanted to build its own timeout around it.
- **Do not abandon `@actions/exec` wholesale for `execFile`.** It buys real value the fleet already depends on (log-grouped output via `core.group`, `io.which`-based cross-platform PATH resolution) that a raw `execFile` replacement would have to reimplement. The right move, if a hard per-call bound is ever needed for one specific `ocx pull`/`ocx env` invocation, is a **scoped exception**: that one call bypasses `@actions/exec` for `execFile`/`execa` with a real timeout, the rest stay on `@actions/exec`.
- `ocx-catalog/src/sources/git.ts:20-38`'s `runGit` deliberately avoids `util.promisify(execFile)`, and the stated reason — that a `vi.mock('node:child_process')` replacement doesn't carry `execFile`'s non-enumerable `promisify.custom` implementation — **still holds today**, confirmed by reading [Node's own `child_process.js` source](https://github.com/nodejs/node/blob/main/lib/child_process.js): `execFile` really does attach `ObjectDefineProperty(execFile, promisify.custom, {…})` with `enumerable: false`. But the same function sets **no timeout** — an orthogonal gap the mockability rationale never claimed to cover. A slow or hostile git remote hangs `runGit` indefinitely.
- The stdin `EPIPE` race `grim.ts` guards against — [nodejs/node#40085](https://github.com/nodejs/node/issues/40085) — is **closed as "not planned."** Node core decided not to fix it upstream, which means the `child.stdin.on('error', () => {})` guard is a permanent requirement for every call site that writes to `child.stdin` on this Node line, not a stopgap waiting on a future patch.
- Timers split into exactly three categories, and only one is a leak. **(a) Awaited-as-sleep** (`setup-ocx/src/http-retry.ts:32`'s `sleep()`, kate-middlechild's `*.browser.test.tsx` polling helpers): resolves and is garbage-collected, nothing to clear, ever. **(b) Debounce/rearm** (`grimoire-indexer`'s `Base.astro:322-324` toast timer): correctly calls `clearTimeout(toastTimer)` before reassigning — the one example in the fleet that needs a paired clear and has it. **(c) Realm-destroyed** (`grimoire-vscode/src/webview/sidebar/main.ts:900-906`'s `setInterval`): needs no `clearInterval` because the webview's entire script context is destroyed, not just its DOM, confirmed independently by [VS Code's own webview guide](https://code.visualstudio.com/api/extension-guides/webview) and by the fleet's own `sidebar.ts:210-212`, which deliberately does *not* set `retainContextWhenHidden` for exactly this reason.
- **That reasoning does not transfer to a Node.js/extension-host-side `setInterval`.** That process keeps running after a webview panel disposes — VS Code's own guide gives its own cautionary example of exactly this: a background `setInterval` on the extension side "will continue to fire" and throw against a disposed webview unless the extension calls `onDidDispose` itself.
- `grimoire-indexer`'s `Base.astro:97` one-shot `setTimeout` (a 3-second UI failsafe, explicitly commented as deliberate) is the same safe shape as category (a): it fires once, deletes a data attribute, and nothing downstream depends on cancelling it early.
- Measured directly, correcting the fleet-wide "7/0" figure: `grimoire-indexer` has **4** `setTimeout` sites in product code (`Catalog.tsx:285`, `Base.astro:97,323-324,372`) plus **6** more in test-helper sleeps (`test/renderer/sort.test.ts`, `hydrate.test.tsx`) — 10 total, not 7 — and exactly **1** `clearTimeout`, correctly paired with the one debounce site. The count that matters isn't the raw tally, it's the shape: one paired rearm, the rest one-shot fires with nothing to clear.
- `child_process.kill()` [does **not** reach a shell-spawned grandchild](https://nodejs.org/api/child_process.html#subprocesskillsignal) — Node's own docs give the exact repro (`spawn('sh', ['-c', 'node -e "setInterval(...)"'])`, then `.kill()` leaves the inner `node` alive). None of the fleet's `execFile`/`execFileAsync` sites use `shell: true`, so this doesn't bite today — but it is the reason a future timeout on `runGit` (which invokes `git`, which can itself spawn an `ssh`/askpass helper) would still leave that helper alive on a kill; adding a timeout there closes the "hangs forever" gap without closing the "descendant survives the kill" gap.
- AbortController/`AbortSignal` support has existed on `child_process.exec`/`execFile`/`spawn` since Node v15.4-15.6 ([nodejs.org](https://nodejs.org/api/child_process.html)) and the whole fleet floors at Node ≥20 — it is safely available everywhere. It is used **exactly once** fleet-wide, and only for `fetch()` (`grimoire-indexer/src/validate/adapters/http.ts:96`), never for a `child_process` call. No fleet command today is user-cancellable mid-flight (no `vscode.CancellationToken` is ever threaded into a `runJson`/`execFileAsync` call) — not a defect (nothing currently promises cancellability), but the gap to close before promising it.
- `execa` (current major documented on its README/termination guide) goes further than anything in this fleet: `killDescendants` puts the subprocess in its own process group and signals the group; `forceKillAfterDelay` (default 5 s) escalates `SIGTERM`→`SIGKILL` automatically. Nothing in the fleet does process-group kill today — worth naming as "ahead of Node core, not yet adopted here," not as a fleet defect, since Node core itself doesn't do this either.
- The naive fix an LLM reaches for for `@actions/exec` — `Promise.race([exec.exec(...), timeoutPromise])` — **does not work**: racing a promise only stops *waiting*, it does not kill the still-running child, because `exec()` never hands back a process reference. This is the single highest-value mechanical check for this file: any `Promise.race` wrapping an `@actions/exec` call is a bug, full stop.

## Findings

### 1. The exemplar: `grim.ts`'s `runJson`

`grimoire-vscode/src/grim.ts:596-633`:

```typescript
export function runJson<T>(
  executable: string,
  args: string[],
  options: RunOptions = {},
): Promise<GrimResult<T>> {
  return new Promise((resolve) => {
    const fullArgs = withFlags(args, ['--format', 'json']);
    const child = execFile(
      executable,
      fullArgs,
      {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        timeout: options.timeoutMs ?? 120_000,
        maxBuffer: 16 * 1024 * 1024,
        shell: false,
      },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          resolve({ ok: false, kind: 'not-found' });
          return;
        }
        const exitCode = typeof child.exitCode === 'number' ? child.exitCode : 1;
        resolve(parseReport<T>(stdout, exitCode, stderr));
      },
    );
    if (options.stdin !== undefined) {
      // grim can refuse and exit BEFORE draining stdin (`rate` exits 64 on a
      // multi-line token, 80 on an empty one), and writing into a pipe whose
      // read end is gone throws an UNCAUGHT EPIPE without this listener —
      // nodejs/node#40085, still open, and not Windows-specific. The exit code
      // is the real signal, so the write error is dropped: the call still
      // resolves through parseReport as a failed vote, never as a crash.
      child.stdin?.on('error', () => {});
      child.stdin?.end(options.stdin);
    }
  });
}
```

Six things this gets right simultaneously, each independently absent from at least one other fleet wrapper (§4):

1. **Argv array, no shell** — `execFile(executable, fullArgs, …)` with `shell: false` explicit. Every positional is a separate array element; nothing is ever concatenated into a command string.
2. **A default timeout that can be overridden, never disabled** — `timeout: options.timeoutMs ?? 120_000`. Callers can raise or lower it via `RunOptions.timeoutMs`, but there is no code path that reaches Node's own `timeout: 0` default.
3. **An explicit `maxBuffer`** sized for the actual payload (grim's JSON catalog dumps), 16× Node's 1 MiB default.
4. **ENOENT is a distinct outcome**, checked via `(error as NodeJS.ErrnoException).code === 'ENOENT'` *before* falling through to exit-code handling — "grim isn't installed" and "grim ran and failed" are never conflated.
5. **Exit code is read from the child object, not assumed from `error`** — `typeof child.exitCode === 'number' ? child.exitCode : 1`, then handed to `parseReport` alongside `stdout`/`stderr` so a non-JSON stderr diagnostic is never silently dropped.
6. **The stdin EPIPE guard**, with the exact upstream issue cited inline as the source of truth for *why* the empty handler exists (§3).

### 2. Node's `child_process` contract: the ground truth

Read directly from [nodejs.org's `child_process` docs](https://nodejs.org/api/child_process.html) (current stable line):

| Option | Default | Applies to |
|---|---|---|
| `timeout` | `0` (disabled) — added v15.13.0 for `spawn`/`fork`, v0.11.12 for the sync methods | `exec`, `execFile`, `spawn` (with `killSignal`) |
| `killSignal` | `'SIGTERM'` | fired when `timeout` elapses |
| `maxBuffer` | `1024 * 1024` (1 MiB) — child is terminated and output truncated if exceeded | `exec`, `execFile` |
| `signal` | none (AbortSignal) — added v15.4.0 (`exec`), v15.5.0 (`spawn`), v15.6.0 (`fork`) | all spawning methods |
| `shell` | `false` — added v5.7.0 (`spawn`), v0.1.91 (`execFile`) | on Unix, enabling it invokes `/bin/sh`; on Windows, `process.env.ComSpec` |

Two behaviors matter more than the table:

**ENOENT vs. a real exit code are structurally different events.** A spawn failure (`ENOENT`, `EACCES`, a bad `cwd`) fires the `'error'` event / callback `error` *before* the process ever ran — there is no exit code, no stdout, no stderr to reason about. A non-zero exit is a process that ran and finished; it surfaces through the callback's `error.code` (the exit code) and `error.signal`, or through the `'exit'`/`'close'` events on the raw `ChildProcess`. Treating both as "the call failed, log `error.message`" — which several call sites effectively do by relying on a generic `catch` — throws away the distinction the exemplar's ENOENT branch exists specifically to preserve (§4: `runNotFound` vs. a real failure changes what the UI tells the user — "install grim" vs. "grim errored, see stderr").

**`shell: true` is a documented injection surface, and every fleet execFile-family call site correctly avoids it.** Node's own docs, quoted directly: *"If the `shell` option is enabled, do not pass unsanitized user input to this function. Any input containing shell metacharacters may be used to trigger arbitrary command execution."* Confirmed fleet-wide: `grep -rn "shell:\s*true"` across every repo in scope returns zero matches in application code. Nothing to fix here — a discipline to keep, not a gap.

### 3. The stdin EPIPE race: nodejs/node#40085

[The issue](https://github.com/nodejs/node/issues/40085), read directly: Node ≥16.7.0 introduced a regression where writing to a freshly-spawned child's `stdin` and closing it immediately can throw an **unhandled `EPIPE`** if the child has already closed its read end — reproducible with some binaries (`echo`) and not others (`cat`, `node --version`), on macOS and Linux, not Windows. **Status: closed as "not planned."** Node core is not going to fix this upstream. The only mitigation is caller-side: attach a no-op `'error'` listener to `child.stdin` *before* writing, which prevents the write's rejection from becoming an uncaught exception while leaving the real signal — the process's actual exit code — intact.

```typescript
// Correct (grim.ts's actual pattern):
child.stdin?.on('error', () => {});
child.stdin?.end(options.stdin);

// Wrong — compiles, passes review, throws in production the moment the
// child exits or refuses before draining stdin:
child.stdin?.end(options.stdin);
```

This guard is required **only** for call sites that write to `child.stdin` — none of `installer.ts`'s `extract()`, `vscode-ocx`'s three calls, or `ocx-catalog`'s `runGit` write to stdin, so they don't need it. `runJson` is the fleet's only stdin-writing call site (grim's `rate` subcommand reads a token off stdin so it never touches argv or env — see the security comment at `RunOptions.stdin`'s definition, `grim.ts:426-434`), and it is also the fleet's only site with the guard. Correct pairing, not a coincidence.

### 4. Divergence catalog

| Site | argv array | timeout | maxBuffer | ENOENT distinct | stderr captured | Verdict |
|---|---|---|---|---|---|---|
| `grim.ts:596-633` `runJson` | ✅ `execFile`, `shell:false` | ✅ `120_000` default | ✅ `16 MiB` | ✅ | ✅ | **exemplar** |
| `installer.ts:242-251` `extract()` | ✅ `execFile`, `shell:false` | ❌ none | ❌ none (1 MiB default) | ❌ (all errors → generic reject) | ✅ (`stderr` in thrown message) | **defect** |
| `ocx.ts:105` `runEnv` | ✅ `execFileAsync` | ❌ none | ✅ `4 MiB` | ✅ (`isNotFound(e)`) | ✅ (via `errorMessage(e)`) | **defect** (timeout only) |
| `ocx.ts:141` `runInit` | ✅ `execFileAsync` | ❌ none | ❌ none (1 MiB default) | ✅ | ✅ | **defect** (timeout + maxBuffer) |
| `ocx.ts:207` `runSubcommand` | ✅ `execFileAsync` | ❌ none | ✅ `4 MiB` | ✅ | ✅ | **defect** (timeout only) |
| `project.ts:136,144`, `managed-config.ts:59` `@actions/exec` | ✅ (array form) | ❌ **unavailable in the API** | N/A (streamed, not buffered) | N/A (`exec()` rejects on any spawn/exit failure alike) | ✅ (Actions log) | **justified difference** |
| `git.ts:27-38` `runGit` | ✅ `execFileCb`, `shell` not set (defaults false) | ❌ none | ❌ none (1 MiB default) | not distinguished (all errors reject with `stderr` attached) | ✅ (attached manually) | **defect** (timeout) / **justified** (promisify avoidance) |

**`installer.ts:242-251` — defect.**

```typescript
// installer.ts — no timeout, no maxBuffer, one file away from the exemplar
export function extract(archive: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('tar', ['-xf', archive, '-C', destDir], { shell: false }, (error, _out, stderr) => {
      if (error) {
        reject(new Error(`tar extraction failed: ${stderr || error.message}`));
      } else {
        resolve();
      }
    });
  });
}
```

`extract()` is called from `installGrim()` (`installer.ts:279-321`) as part of a fully-serial extension-activation install flow: fetch manifest → download archive → verify SHA-256 → extract → find the binary. Every prior step is already bounded (a `fetch()` naturally errors on a dead connection or completes; the checksum compare is synchronous). Extraction is the one step with no bound at all. A stalled `stageDir` write (slow/network-backed VS Code `storageDir`, a corrupt-but-checksum-passing archive that `tar` reads slowly) hangs `progress.report('Extracting…')` forever with no way for the user to recover short of reloading the window. The fix is mechanical: add the same `timeout`/`maxBuffer` fields `runJson` already uses, in the same file's sibling function's own repo.

**`ocx.ts` — three sites, one shape.** All three go through `execFileAsync = promisify(execFile)` (`ocx.ts:1-4`) and none pass `timeout`. `runEnv`/`runSubcommand` pass `maxBuffer: 4 * 1024 * 1024`; `runInit` passes neither:

```typescript
// runEnv — maxBuffer set, timeout not
const { stdout } = await execFileAsync(
  opts.executable,
  buildEnvArgs(opts.projectToml, opts.groups),
  { env: opts.env, maxBuffer: 4 * 1024 * 1024 },
);

// runInit — neither set
await execFileAsync(opts.executable, ['init'], { cwd: opts.cwd, env: opts.env });
```

Since `promisify(execFile)` still accepts the same options bag as the callback form (§5 below confirms this from Node's own source), adding `timeout` here is a one-line change per call site, not a refactor.

**`git.ts:27-38` — split verdict.** The promisify-avoidance reasoning is verified current (§5). The missing timeout is not excused by it — `runGit` invokes real network I/O (`clone`, `fetch`, `ls-remote` against a config-supplied remote) with no bound, and a hostile or merely slow remote hangs it exactly as unboundedly as `extract()` hangs on a slow filesystem.

**`@actions/exec` — justified, verified from source, not assumed.**

`ExecOptions` (`@actions/toolkit` `packages/exec/src/interfaces.ts`, read in full):

```typescript
export interface ExecOptions {
  cwd?: string;
  env?: {[key: string]: string};
  silent?: boolean;
  outStream?: stream.Writable;
  errStream?: stream.Writable;
  windowsVerbatimArguments?: boolean;
  failOnStdErr?: boolean;
  ignoreReturnCode?: boolean;
  delay?: number; // "How long in ms to wait for STDIO streams to close after
                   // the exit event... defaults to 10000" — NOT a run timeout
  input?: Buffer;
  listeners?: ExecListeners;
}
```

No `timeout`, no `signal`. `ToolRunner` (`packages/exec/src/toolrunner.ts`) spawns via `child_process.spawn()` internally, listens for `'error'` (catches spawn-time ENOENT-class failures the same way the exemplar does), and — critically — **never calls `.kill()` on the child under any code path**. Its own internal `this.timeout = setTimeout(ExecState.HandleTimeout, this.delay, this)` fires *after* the `'exit'` event, purely to stop waiting on stdio streams that haven't closed; it does not bound how long the process itself may run. `exec()` (`packages/exec/src/exec.ts`) returns `Promise<number>` only — the `ChildProcess` is never handed back to the caller. Published version confirmed at [registry.npmjs.org](https://registry.npmjs.org/@actions/exec/latest): **3.0.0**, no timeout/cancellation in its description or interface.

Consequence: there is no way to add a per-call timeout to an `@actions/exec` call without either (a) reimplementing it on top of `execFile`/`spawn` directly for that one call, or (b) a `Promise.race` that only stops *waiting* — the underlying process, with no handle exposed, keeps running regardless (§ AI-agent angle). (a) is the only real fix if a hard bound is ever needed; nothing in the read source suggests (b) would work, and the empirical shape of `ToolRunner` (no exposed process, no kill path) rules it out definitively rather than just making it awkward.

### 5. `kill()` does not reach a shell's descendants

[Node's own `subprocess.kill()` docs](https://nodejs.org/api/child_process.html#subprocesskillsignal), quoted directly, with their own example:

> On Linux, child processes of child processes will not be terminated when attempting to kill their parent. This is likely to happen when running a new process in a shell or with the use of the `shell` option of `ChildProcess`.

```javascript
const subprocess = spawn('sh', ['-c', `node -e "setInterval(() => {...}, 500);"`], {...});
setTimeout(() => { subprocess.kill(); }, 2000); // Does not terminate the inner node process.
```

This does not bite any fleet site *today* — every `execFile`/`execFileAsync` call in scope uses `shell: false` (Node's own default, and every site that specifies it explicitly agrees), so `kill()` targets the actual binary, not an intermediary shell. It matters for the recommended fix to `git.ts`'s `runGit`: `git clone`/`git fetch` over `ssh://` can themselves spawn an `ssh` (or `GIT_ASKPASS`) child process. Adding a `timeout` there closes "the call hangs forever," but a `kill()`-on-timeout still only reaches the `git` process itself — if `git` has already handed off to a hung `ssh`, that grandchild can survive the kill. Node's docs don't offer a built-in process-group primitive on the promise-returning path; the fix (spawn in a new process group, signal the group) is the same shape `execa`'s `killDescendants` automates (§7 of the summary, and [execa's termination guide](https://github.com/sindresorhus/execa/blob/main/docs/termination.md)) — worth naming as the next-step fix, not required for the timeout fix itself to be worth landing now.

### 6. Timer lifecycle: three categories, one leak

**(a) Awaited-as-sleep — never needs `clearTimeout`.**

```typescript
// setup-ocx/src/http-retry.ts:32
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
```

Called only from inside `withRetry`'s bounded `for (let i = 0; i < maxAttempts; i++)` loop (`http-retry.ts:53-`). The promise resolves, the timer fires exactly once and is done, the closure holding `resolve` is released. There is no owner to outlive and nothing external references the handle — `clearTimeout` would have nothing to accomplish. The same shape appears in every `kate-middlechild` `*.browser.test.tsx` occurrence (`await new Promise<void>((r) => setTimeout(r, 80))` as a settle-the-DOM helper) — a test process that exits shortly after makes this doubly safe, but the pattern is safe on its own terms even in a long-running process, because it is *awaited*, not fire-and-forget.

**(b) Debounce/rearm — clearTimeout is mandatory, and the fleet's one instance gets it right.**

```javascript
// grimoire-indexer Base.astro:311-324
let toastTimer;
function showToast(name, value) {
  ...
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
```

Without the `clearTimeout` on the line before reassignment, a second `showToast()` call inside the first timer's 2.6 s window would leave the *first* timer's callback still scheduled — it fires later and removes the `"show"` class out from under a toast that a third, more recent copy just re-armed, causing a fade that stops mid-flight or restarts wrong. This is the only site in the fleet with a stored handle re-assigned on a repeatable trigger, and it is the only site that pairs a `clearTimeout` with it.

**(c) Realm-destroyed — a live interval, correctly never cleared.**

```typescript
// grimoire-vscode/src/webview/sidebar/main.ts:900-906
// Lives for the webview's whole process lifetime, so it's never cleared.
setInterval(() => {
  if (footerTickRenders(state, refreshInFlight)) {
    state = { ...state, now: Date.now() };
    litRender(renderSidebarFooter(viewForTab(state, activeTab, installedQuery)), footerEl);
  }
}, 30_000);
```

This code runs *inside the webview's own script context* — not the extension host. Two independent sources confirm the realm itself, not just this one timer, is torn down: [VS Code's webview guide](https://code.visualstudio.com/api/extension-guides/webview) states webview content "is destroyed when the webview is moved into the background," and — without `retainContextWhenHidden` — scripts stop running rather than persisting; and the fleet's own `sidebar.ts:210-212` comment confirms the choice is deliberate: *"without retainContextWhenHidden VS Code disposes a hidden view and resolves a new one when it comes back, so leaving the flag set would fire the next boot's posts into a webview that is not listening."* `resolveWebviewView` is called fresh on every re-show, and `view.webview.html = webviewHtml(...)` (`sidebar.ts:215`) replaces the entire document — which, per the same guide, "is similar to reloading an iframe." A reloaded iframe's pending intervals are discarded by the browser/Electron runtime itself, atomically with the reload; there is no reachable `clearInterval` call that could run *after* the realm holding both the timer and the code that would clear it has already been torn down. The comment is correct, and no fix is needed.

**Where (c)'s reasoning stops applying.** The same guide gives its own cautionary counter-example for the *other* side of a webview integration — a `setInterval` living in the **extension host** (plain Node.js, not the webview's script realm) that pushes updates into `panel.webview.html`: *"if the user closes the panel, setInterval will continue to fire, which will try to update panel.webview.html, which of course will throw an exception."* The extension-host process does not get torn down when a webview panel disposes — it keeps running for the life of the extension. The guide's own fix is `onDidDispose`-triggered cleanup. None of the fleet's own timers are in this shape today (the one long-lived `setInterval` found is webview-side, category (c)), but it is the shape a future feature could easily land in by copy-pasting `main.ts:900-906`'s comment into the wrong file.

### 7. `maxBuffer` sizing

Node's 1 MiB default is a silent truncation point, not a crash: exceeding it terminates the child and truncates output rather than throwing something obviously diagnostic mid-run. The fleet's two explicit overrides are sized to their actual payload, not copy-pasted: `grim.ts` sets 16 MiB for grim's full JSON catalog dumps (`grim search`/`grim status` can emit large `{"items":[...]}` documents); `vscode-ocx`'s `runEnv`/`runSubcommand` set 4 MiB for `ocx env`/`ocx pull` output, which is smaller and more bounded by design (a project's toolchain env, not a full registry catalog). `runInit` and `git.ts`'s `runGit` inherit the 1 MiB default with no stated reasoning either way — for `runInit` (`ocx init`'s minimal stdout) this is very likely fine as-is; for `runGit` (`git clone`/`fetch` stderr on a large or slow transfer can be verbose) it is an unexamined assumption, not a verified-safe default.

## Normative guidance candidates

1. **Every child-process invocation that runs a real external command must set all of: argv array (never a shell string), an explicit `timeout`, an explicit `maxBuffer`, an exit-code check (or an explicit, named opt-out), captured `stderr`, and ENOENT handled as a distinct outcome from a real failure.** *Rationale*: this is exactly the exemplar's shape (`grim.ts:596-633`), and every fleet site missing one of these six has a concrete failure mode named in §4. *Verify*: for each `execFile(`/`execFileAsync(`/`spawn(` call site, confirm all six fields/behaviors are present — a reading checklist, not a single grep (no static check can confirm "is ENOENT handled distinctly" without reading the callback body).
2. **Never call `execFile`/`exec`/`spawn` with `shell: true` against a value that is not a fixed, hardcoded string.** *Rationale*: Node's own docs — unsanitized input plus an enabled shell is documented arbitrary-command-execution risk. *Verify*: `grep -rn "shell:\s*true"` across `src/` in every repo; today this returns zero matches — a "don't regress" rule, not a new fix.
3. **A call site that writes to `child.stdin` must attach `child.stdin.on('error', () => {})` before the first write.** *Rationale*: [nodejs/node#40085](https://github.com/nodejs/node/issues/40085) is closed as "not planned" — the EPIPE race is permanent, not a bug awaiting a patch. *Verify*: `grep -n "\.stdin\.end(\|\.stdin\.write(" src/**/*.ts`, then for each hit confirm an `.stdin.on('error', ...)` listener is attached on the same object before that call.
4. **`installer.ts`'s `extract()` must set `timeout` and `maxBuffer`, matching `grim.ts`'s `runJson` defaults in the same repo.** *Rationale*: it is the one child-process call in the extension's blocking activation-install path with no bound at all. *Verify*: `grep -n "execFile('tar'" src/installer.ts` then confirm the options object includes both fields — today it does not.
5. **`vscode-ocx/src/ocx.ts`'s three `execFileAsync` call sites must set `timeout`; `runInit` must additionally set `maxBuffer`.** *Rationale*: `promisify(execFile)` accepts the identical options bag as the callback form (confirmed from Node's own `child_process.js` source) — this is a same-shape, low-risk addition to each call's existing options object. *Verify*: `grep -n "execFileAsync(" src/ocx.ts` — each call's options object should include `timeout`; `runInit`'s should also include `maxBuffer`.
6. **`ocx-catalog/src/sources/git.ts`'s `runGit` must set `timeout`; keep its `execFileCb`-not-`promisify` shape as-is.** *Rationale*: the promisify-avoidance is a verified, still-current mockability requirement (§5) — do not "fix" it into `promisify(execFile)`, that would break the file's own `GIT_SHA_UNSUPPORTED` unit test's `vi.mock`. The missing timeout is the actual, unrelated gap. *Verify*: `grep -n "execFileCb(" src/sources/git.ts` — the options object passed (currently `{ cwd }` only) should include `timeout`.
7. **Do not add a `Promise.race`-based timeout wrapper around any `@actions/exec` call.** *Rationale*: `exec()` returns only `Promise<number>`, never a `ChildProcess` — racing a timer against it stops the caller from *waiting*, but does not kill the still-running process, which keeps consuming runner resources orphaned in the background. *Verify*: `grep -n "Promise.race" src/*.ts` in `setup-ocx` — any hit touching an `exec.exec`/`exec.getExecOutput` call is the finding, full stop, not a judgment call.
8. **If a hard per-call timeout genuinely becomes necessary for one `setup-ocx` command, that one call moves to `execFile`/`execa` directly — the rest of the file's `@actions/exec` calls stay as they are.** *Rationale*: `@actions/exec` earns its keep on the calls that don't need a bound (log grouping, PATH resolution); reimplementing all of it on raw `execFile` to gain a timeout only two calls might ever need is not a proportionate trade. *Verify*: a code-review heuristic — any new call added to `@actions/exec` that has previously hung in practice (check `gh issue list` / prior incident notes) is the trigger to make the scoped switch, not a blanket migration.
9. **A `setInterval`/fire-and-forget `setTimeout` (not awaited as a sleep) must either be paired with a stored-handle `clear*` call reachable from the same object's teardown path, or carry a comment naming which realm-teardown guarantee excuses it — and that guarantee must be independently true, not asserted.** *Rationale*: `main.ts:900-906`'s uncleared interval is correct *because* the webview's own script realm is destroyed atomically with it (VS Code's own docs, plus the fleet's own deliberate non-use of `retainContextWhenHidden`) — the comment states a fact that is independently checkable, not just a claim. *Verify*: for every `setInterval(`/bare `setTimeout(` (not `await new Promise(...setTimeout...)`) hit by `grep -rn "setInterval(\|setTimeout("`, confirm either (a) a `clear*` call exists on the same variable reachable from a dispose/unmount/teardown path, or (b) the file lives under a browser/webview entry point (not reachable from the extension host's `activate()`) *and* that context is confirmed non-retained (no `retainContextWhenHidden: true` anywhere in the panel/view registration).
10. **A debounce/rearm timer (a `setTimeout`/`setInterval` reassigned to the same variable on a repeatable trigger) must `clearTimeout`/`clearInterval` the previous handle before reassigning.** *Rationale*: skipping this leaves the *stale* timer's callback still scheduled, producing a race between old and new state exactly like the toast-fade bug this would cause if `Base.astro:322-324`'s `clearTimeout(toastTimer)` were removed. *Verify*: for every `let`/`var`-declared timer handle reassigned more than once in a file, confirm a `clear*` call on that variable precedes each reassignment after the first.
11. **Size `maxBuffer` deliberately for the expected payload; never leave it at Node's 1 MiB default for a command whose output isn't provably small.** *Rationale*: exceeding it silently truncates output and kills the child, which is a much harder failure to diagnose than an explicit, sized limit. *Verify*: for every `execFile`/`exec`/`execFileAsync` call, confirm `maxBuffer` is set explicitly (not relying on the default) unless the command's output is proven bounded (e.g. `ocx init`'s minimal stdout) — and that proof should be a comment, not silence.
12. **Do not add `AbortSignal`-based cancellation to a child-process call unless a real cancel trigger exists to wire it to.** *Rationale*: the mechanism is safely available fleet-wide (Node ≥15.4-15.6 API, fleet floors at Node ≥20) but adding it with no caller ever calling `.abort()` is dead code that looks like a feature. It becomes real guidance the moment any command gets a "Cancel" affordance (a VS Code `CancellationToken`, a second invocation superseding the first) — build it then, not speculatively now. *Verify*: `grep -rn "AbortController\|AbortSignal" src/` against `grep -rn "CancellationToken" src/` — a `signal:` option with no corresponding cancellation trigger anywhere in the same call chain is speculative and should be removed or justified.

## AI-agent angle

- **The `Promise.race`-around-`@actions/exec` anti-pattern.** An agent asked "add a timeout to this `exec.exec()` call" will very plausibly reach for `Promise.race([exec.exec(cmd, args, opts), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])`. It compiles, it type-checks, it even *appears* to work in a quick manual test (the caller's `await` does return early on timeout) — but the underlying process is still running, unreferenced, until it exits or the runner's own outer limit ends the job. **Check**: any `Promise.race`/`Promise.any` wrapping a call into `@actions/exec`'s `exec`/`getExecOutput` is wrong by construction — flag it unconditionally, don't evaluate case-by-case.
- **Assuming `promisify(execFile)`'s rejected error carries `stdout`/`stderr` "because that's just how promisified callbacks work."** It does, but only because `execFile` ships its own `[promisify.custom]` implementation that explicitly attaches `err.stdout`/`err.stderr` before rejecting (confirmed from Node's source, §5) — this is *not* the generic `util.promisify` behavior (a generically promisified error-first callback rejects with just the error argument, nothing extra attached). An agent porting this pattern to a different Node API that lacks its own `promisify.custom` will silently lose `stdout`/`stderr` on the rejection path. **Check**: for any newly-promisified Node callback API (not `child_process.exec`/`execFile`, which are known-good), verify by reading whether that specific function defines `[util.promisify.custom]` before assuming extra properties survive onto the rejected error.
- **Copying `main.ts:900-906`'s "never cleared, lives for the whole process" comment into extension-host code.** The reasoning is realm-specific (§6c) — it is correct for a webview's own script context and actively wrong for the Node.js extension host, where the process genuinely does outlive a single webview panel. An agent pattern-matching on the comment text without checking *which side* of the webview boundary the new code runs on will introduce a real leak while citing a real, but misapplied, precedent. **Check**: for any new `setInterval`/fire-and-forget `setTimeout` in a file under `src/webview/**`, confirm it's genuinely webview-side (imported only by other `webview/**` files, never by `extension.ts`/`activate()`); the same pattern anywhere else needs an explicit `dispose()`/`onDidDispose` pairing instead.
- **Reaching for `killSignal`/process-group options that don't exist on the promise-returning Node API an agent is already using.** `execa`'s `killDescendants`, `forceKillAfterDelay`, and `cancelSignal` are real, well-documented options — on `execa`, not on bare `child_process`. An LLM trained on both will sometimes hallucinate one of `execa`'s option names onto a raw `execFile`/`exec` call (e.g. `execFile(cmd, args, { killDescendants: true })`), which TypeScript will happily accept as excess-property-stripped-away noise on a loosely-typed options bag, and Node will silently ignore at runtime. **Check**: any options key on a call to `child_process.exec`/`execFile`/`spawn` that isn't in [the documented option list](https://nodejs.org/api/child_process.html) (`cwd`, `env`, `argv0`, `stdio`, `detached`, `uid`, `gid`, `serialization`, `shell`, `signal`, `timeout`, `killSignal`, `maxBuffer`, `encoding`, `windowsHide`, `windowsVerbatimArguments`) is either a typo or a hallucinated option from a different library's API.
- **Treating a non-zero exit code and a spawn failure as the same `catch` block.** A generic `try { await execFileAsync(...) } catch (e) { report(errorMessage(e)) }` (the shape all three `ocx.ts` call sites correctly avoid, via `isNotFound(e)`) is easy for an agent to write and looks complete, but collapses "the tool isn't installed" and "the tool ran and rejected the input" into one message — the exact distinction the exemplar's ENOENT branch exists to preserve. **Check**: any `catch` block around a child-process call that doesn't branch on `(error as NodeJS.ErrnoException).code === 'ENOENT'` (or an equivalent helper) before reporting a generic message is a regression from the exemplar's shape.

## Contested / evolving

- **`timeout:` (a bare duration) vs. `signal: AbortSignal.timeout(ms)` for bounding a child process.** Both work identically for a pure duration bound — Node's own `timeout` option has done this since v15.13.0, and nothing in the fleet needs the extra composability `AbortSignal` buys (combining a duration bound with an external cancel trigger via `AbortSignal.any([...])`, available on any Node the fleet already floors at). As of 2026-08-29, the fleet uses `AbortSignal` exactly once, for `fetch()`, never for `child_process` — there is no live disagreement in this fleet's own code to report, only an unexercised option. Trend to watch, not a decision to force: the moment any command needs *both* a duration bound and a user-triggered cancel, `signal` composes and a bare `timeout` number does not.
- **Whether `@actions/exec` will ever add native timeout/cancellation support.** Could not establish this from primary sources as of 2026-08-29 — the published version is 3.0.0 with no such option, and no roadmap or open-proposal document was read to confirm or rule out a future addition. Treat the "scoped exception via `execFile`/`execa`" guidance (rule 8) as durable, not as a stopgap for a fix assumed to be coming.
- **Process-group kill (`execa`'s `killDescendants`) vs. Node core's single-process `kill()`.** Node core has not added an equivalent built-in as of the current stable docs read for this report — `subprocess.kill()` remains single-process, with the shell-descendant caveat documented as a known, unaddressed limitation rather than a bug being tracked for a fix. `execa` fills this gap today as a userland library, not a Node-core feature. Whether to adopt `execa` fleet-wide for this reason alone is out of scope for this report (no fleet site currently spawns a process whose descendants matter enough to justify the dependency) — named here as the direction the ecosystem has moved, not as guidance to act on now.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html) | Primary Node.js API docs, current stable line | read 2026-08-29 | `timeout`/`maxBuffer`/`killSignal`/`signal` defaults and "Added in" versions, ENOENT vs. exit-code semantics, `shell` security warning — the single most load-bearing source in this report |
| [nodejs.org/api/child_process.html#subprocesskillsignal](https://nodejs.org/api/child_process.html#subprocesskillsignal) | Primary Node.js API docs | read 2026-08-29 | Verbatim confirmation that `kill()` does not reach a shell-spawned grandchild, with Node's own repro |
| [github.com/nodejs/node/issues/40085](https://github.com/nodejs/node/issues/40085) | Primary — Node core issue tracker | closed, "not planned" | The exact regression `grim.ts`'s stdin guard cites, and confirmation it is permanent, not pending a fix |
| [github.com/nodejs/node/blob/main/lib/child_process.js](https://github.com/nodejs/node/blob/main/lib/child_process.js) | Primary — Node core source, `main` branch | read 2026-08-29 | Confirms `execFile`'s `[promisify.custom]` implementation still exists and still attaches `stdout`/`stderr` onto a rejected error — the fact `git.ts`'s promisify-avoidance comment depends on |
| [nodejs.org/api/timers.html](https://nodejs.org/api/timers.html) | Primary Node.js API docs | read 2026-08-29 | `unref()`/`ref()`/`hasRef()` semantics and version history; confirms `clearTimeout`/`clearInterval` are the only cancellation mechanism Node exposes |
| [github.com/actions/toolkit/blob/main/packages/exec/src/interfaces.ts](https://github.com/actions/toolkit/blob/main/packages/exec/src/interfaces.ts) | Primary — `@actions/toolkit` source | read 2026-08-29 | The full, verbatim `ExecOptions` interface — proves no `timeout`/`signal` field exists |
| [github.com/actions/toolkit/blob/main/packages/exec/src/toolrunner.ts](https://github.com/actions/toolkit/blob/main/packages/exec/src/toolrunner.ts) | Primary — `@actions/toolkit` source | read 2026-08-29 | Proves `ToolRunner` never kills the process on any code path, and that its internal `delay`/timeout is a post-exit stdio-drain wait, not an execution bound |
| [github.com/actions/toolkit/blob/main/packages/exec/src/exec.ts](https://github.com/actions/toolkit/blob/main/packages/exec/src/exec.ts) | Primary — `@actions/toolkit` source | read 2026-08-29 | Proves `exec()`/`getExecOutput()` return only exit code / captured output, never a process handle — the basis for "`Promise.race` doesn't work" |
| [registry.npmjs.org/@actions/exec/latest](https://registry.npmjs.org/@actions/exec/latest) | Primary — npm registry metadata | read 2026-08-29 | Confirms published version 3.0.0, no timeout/cancellation in package metadata |
| [github.com/eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security/blob/main/docs/rules/detect-child-process.md) | Primary — ESLint plugin rule doc | read 2026-08-29 | `security/detect-child-process` — what it does and doesn't check (non-literal command strings; does not check timeout/maxBuffer, confirming those need a custom/organizational rule, not an off-the-shelf lint) |
| [github.com/sindresorhus/execa](https://github.com/sindresorhus/execa/blob/main/docs/termination.md) | Primary — `execa` maintainer docs | read 2026-08-29 | `timeout`, `cancelSignal`, `forceKillAfterDelay` (5 s default), `killDescendants` — the comparison point for "how far past Node core does a wrapper go," used to frame the Contested/evolving section, not as adoption guidance |
| [code.visualstudio.com/api/extension-guides/webview](https://code.visualstudio.com/api/extension-guides/webview) | Primary — VS Code official extension docs | read 2026-08-29 | Webview content lifecycle (destroyed on background/dispose without `retainContextWhenHidden`), and the official cautionary example of an extension-host `setInterval` outliving a disposed panel — the source that resolves the timer-lifecycle rule |
| `grimoire-vscode/src/grim.ts:596-633` (local, read in full) | This project's own code | current | The exemplar — every claim in §1 traces to this file |
| `grimoire-vscode/src/grim.ts:426-434` (local) | This project's own code | current | `RunOptions.stdin`'s doc comment — the security reasoning for why `runJson` is the only stdin-writing call site |
| `grimoire-vscode/src/installer.ts:242-321` (local, read in full) | This project's own code | current | `extract()` and its caller `installGrim()` — basis for the "blocking activation-install path" defect finding |
| `vscode-ocx/src/ocx.ts:1-220` (local, read in full) | This project's own code | current | All three `execFileAsync` call sites (`runEnv`, `runInit`, `runSubcommand`), `isNotFound`/`errorMessage` helpers |
| `ocx-catalog/src/sources/git.ts:1-80` (local, read in full) | This project's own code | current | `runGit`'s deliberate non-promisify comment, `assertNotOptionLike` argument-injection guard (adjacent but out of this report's scope) |
| `setup-ocx/src/project.ts:100-150`, `setup-ocx/src/managed-config.ts:1-60`, `setup-ocx/src/http-retry.ts:1-60` (local, read in full) | This project's own code | current | All three `@actions/exec` call sites, and the one legitimate `setTimeout`-as-sleep in the fleet |
| `grimoire-indexer/src/renderer/astro/components/Catalog.tsx`, `layouts/Base.astro` (local, read in full) | This project's own code | current | Every product-code `setTimeout`/`clearTimeout` in the repo, including the one correctly-paired debounce site |
| `grimoire-vscode/src/webview/sidebar/main.ts:880-925`, `src/views/sidebar.ts:195-225` (local, read in full) | This project's own code | current | The uncleared `setInterval` and the `resolveWebviewView`/`retainContextWhenHidden` reasoning that justifies it |
| `kate-middlechild/packages/web/src/islands/*.browser.test.tsx` (local, grepped and sampled) | This project's own code | current | Confirms the fleet-wide `setTimeout` count is dominated by awaited test-polling sleeps, not leak-shaped fire-and-forget timers |

---
title: "VS Code Extension Host Failure Modes"
topic: "Shared extension-host process model, crash/restart mechanics, and workspace-trust cross-checks for AI agents editing grimoire-vscode and vscode-ocx"
agent: scout-failure
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 20
scope: >
  Covers: what actually happens on an uncaught exception / unhandled rejection inside the
  extension host process on modern Node + VS Code (main @ 1.136.0, 2026-08-29); the real
  triggers for "the extension host terminated unexpectedly" and what state that restart
  destroys; activate()'s per-extension error isolation vs. a fire-and-forget promise escaping
  it; the responsiveness watchdog and Extension Bisect as the profiling/diagnosis path; and a
  worked, non-grep workspace-trust honesty cross-check applied to grimoire-vscode and
  vscode-ocx. Does NOT re-cover activation-event correctness, disposal, command
  declare/register parity, or OutputChannel logging — wave 1 measured those clean.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The shared extension host: one process, many extensions](#1-the-shared-extension-host-one-process-many-extensions)
   2. [What does NOT terminate the host: JS exceptions are caught, not fatal](#2-what-does-not-terminate-the-host-js-exceptions-are-caught-not-fatal)
   3. [What DOES terminate the host, and the crash-restart mechanics](#3-what-does-terminate-the-host-and-the-crash-restart-mechanics)
   4. [activate()'s per-extension isolation — and the leak when it fails partway through](#4-activates-per-extension-isolation--and-the-leak-when-it-fails-partway-through)
   5. [process.exit()/process.crash() are intercepted, not honored](#5-processexitprocesscrash-are-intercepted-not-honored)
   6. [The responsiveness watchdog: 3000ms, and what it drives](#6-the-responsiveness-watchdog-3000ms-and-what-it-drives)
   7. [Show Running Extensions + Extension Bisect: the profiling step standing in for a lint](#7-show-running-extensions--extension-bisect-the-profiling-step-standing-in-for-a-lint)
   8. [Activation events and onStartupFinished](#8-activation-events-and-onstartupfinished)
   9. [Workspace trust API surface](#9-workspace-trust-api-surface)
   10. [Workspace-trust honesty cross-check, applied to the fleet](#10-workspace-trust-honesty-cross-check-applied-to-the-fleet)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- The extension host is **one Node.js process shared by every extension in the window** — there is no per-extension process isolation; crash containment is per-*call*, not per-process. [[1]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/abstractExtensionService.ts#L943-L956)
- **A synchronous throw or a rejected `Promise` returned from `activate()` does NOT crash the host.** VS Code's `_callActivateOptional` wraps the call in try/catch, marks only that extension `activationFailed`, and every other extension keeps running. [[2]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extHostExtensionService.ts#L614-L629)
- **An uncaught exception or unhandled rejection anywhere else in extension code also does NOT crash the host in current VS Code.** The extension host process installs its own `process.on('unhandledRejection'|'uncaughtException', …)` that overrides Node's fatal default and routes the error to `onUnexpectedError` instead of letting the process die. [[3]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts#L397-L436)
- That contradicts the generic Node.js expectation: Node made `throw` (process-fatal) the *default* `--unhandled-rejections` mode in **v15.0.0** — the extension host deliberately opts out of that default for the whole process. [[4]](https://github.com/nodejs/node/blob/main/doc/api/cli.md#L3424-L3451)
- A fire-and-forget promise not returned/awaited from anywhere VS Code inspects (`void doWork()`, or a bare `doWork()` call) still surfaces: after a 1-second `rejectionHandled` grace period, it's reported via `onUnexpectedError`, serialized, sent to the main process, and re-reported there — visible telemetry/log noise, not silent, just not fatal. [[3]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts#L397-L423)
- **Real host termination** (`"The extension host terminated unexpectedly. Restarting…"`) is driven by the process actually exiting — native crash, OOM, IPC/socket disconnect timeout, or a remote version mismatch — never by a plain JS exception. [[1]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts#L149-L228)
- On restart, `_doStopExtensionHosts()` tears down the **entire** host before recreating it — every extension's in-memory state is lost together, including ones that had nothing to do with the crash. [[1]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/abstractExtensionService.ts#L887-L897)
- A crash tracker auto-restarts silently under a threshold; **3 crashes within 5 minutes** trips a blocking error prompt offering "Start Extension Bisect" instead of another silent restart. [[1]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts#L185-L225)
- `process.exit()` and `process.crash()` called *by extension code* are intercepted and turned into a `console.warn` — they do not actually exit the process outside the extension test harness. [[5]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts#L94-L118)
- The RPC layer marks the host **"Unresponsive" after 3000ms** without an acknowledgment — a distinct, non-fatal signal from a blocking synchronous call, surfaced in "Show Running Extensions" and via `onDidChangeResponsiveState`. [[6]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/rpcProtocol.ts#L119-L227)
- `Developer: Show Running Extensions` (CPU-profile record button in its title bar) plus `Help: Start Extension Bisect` (binary search, O(log N), over installed extensions) are the mechanical, no-lint-required diagnosis path for a slow or crash-looping extension. [[7]](https://github.com/microsoft/vscode/wiki/Performance-Issues) [[8]](https://code.visualstudio.com/blogs/2021/02/16/extension-bisect)
- If `activate()` throws or rejects **after** it has already called `context.subscriptions.push(...)` one or more times, those already-registered commands/listeners are never disposed — the `ActivatedExtension` wrapper (the only thing that ever calls `dispose(context.subscriptions)`) is constructed exclusively on the success path, so a partial failure leaks live registrations for the rest of the window's life. [[2]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extHostExtensionService.ts#L599-L612)
- `capabilities.untrustedWorkspaces.supported: "limited"` (used by both grimoire-vscode and vscode-ocx) grants the extension **zero automatic gating** beyond substituting user-level values for the exact keys listed in `restrictedConfigurations` — every other trust-sensitive operation is the extension author's sole responsibility. [[9]](https://code.visualstudio.com/api/extension-guides/workspace-trust)
- Fleet reading: grimoire-vscode has exactly one runtime `isTrusted` check (gating only the automatic update-check network round); `grimoire.updateAll`, `grimoire.initProject`, and `grimoire.installGrim` — the commands that actually materialize workspace-declared artifacts — carry **no** trust gate, in code or in a package.json `when` clause.
- Fleet reading: vscode-ocx's automatic `reloadOnce()` path correctly checks `vscode.workspace.isTrusted` before spawning; but its explicit `ocx.lock`/`ocx.pull`/`ocx.upgrade`/`ocx.init` commands spawn the same executable against workspace-controlled `ocx.toml` data with **no** trust check at all.
- Neither manifest uses the `isWorkspaceTrusted` when-clause context key anywhere — confirmed by grep against both `package.json` files.
- The workspace-trust cross-check cannot be one grep: it requires tracing every `registerCommand` handler forward to any spawn/exec/fs/module-resolution call, independent of whether the value involved came from a `restrictedConfigurations`-protected setting or from other workspace-derived data (a resolved manifest path, a `project.dir`, file content) that the manifest declaration says nothing about.
- `onStartupFinished` exists specifically so eager-activation extensions don't compete with `*`-activated ones for startup time; both fleet VS Code extensions already avoid `*` (grimoire-vscode uses `onStartupFinished` + 2 scoped events, vscode-ocx uses only `workspaceContains:**/ocx.toml`). [[10]](https://code.visualstudio.com/api/references/activation-events)

## Findings

### 1. The shared extension host: one process, many extensions

VS Code's advanced-topics page states the intent directly: the Extension Host exists to prevent extensions from "Impacting startup performance, Slowing down UI operations, [and] Modifying the UI," because "misbehaving extensions should not impact the user experience." [[1]](https://code.visualstudio.com/api/advanced-topics/extension-host) In the local/desktop configuration this is realized as a **single Node.js process** (`extensionHostProcess.ts`, launched via `bootstrap-fork`) that every non-web-worker extension in a window runs inside — there is no per-extension OS process. The isolation the guide promises is real but partial: it holds for *JS-level* misbehavior (§2) and does **not** hold for the process actually dying (§3), where every extension in that host goes down together regardless of which one caused it.

Confirming this from the crash-telemetry code: when the host exits, VS Code walks every extension whose `activationStarted` is true and reports the **whole list** as having been running at crash time — it has no way to attribute the crash to one extension, because they share the process:

```ts
// src/vs/workbench/services/extensions/common/abstractExtensionService.ts
if (activatedExtensions.length > 0) {
  this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. The following extensions were running: ${activatedExtensions.map(id => id.value).join(', ')}`);
}
```
[[1]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/abstractExtensionService.ts#L943-L956)

### 2. What does NOT terminate the host: JS exceptions are caught, not fatal

This is the central correction to a natural assumption. Node.js has made unhandled-rejection **fatal by default since v15.0.0** — before that it only warned:

> `v15.0.0`: Changed default mode to `throw`. Previously, a warning was emitted.
> `throw`: Emit `unhandledRejection`. If this hook is not set, raise the unhandled rejection as an uncaught exception. **This is the default.**

[[4]](https://github.com/nodejs/node/blob/main/doc/api/cli.md#L3424-L3451)

VS Code's extension host process deliberately opts the whole process out of that default. `extensionHostProcess.ts`'s `startExtensionHostProcess()` installs global handlers before doing anything else:

```ts
// src/vs/workbench/api/node/extensionHostProcess.ts — startExtensionHostProcess()
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
          if (e && e.stack) { console.warn(`stack trace: ${e.stack}`); }
          if (reason) { onUnexpectedError(reason); }
        }
      });
    }
  }, 1000);
});
process.on('rejectionHandled', (promise: Promise<any>) => { /* removes it from the pending list */ });
process.on('uncaughtException', function (err: Error) {
  if (!isSigPipeError(err)) { onUnexpectedError(err); }
});
```
[[3]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts#L397-L436)

`onUnexpectedError` is not a crash path — it's `errorHandler.onUnexpectedError(e)`, whose default action is `setTimeout(() => throw e, 0)`, but the extension host **replaces** that default via `errors.setUnexpectedErrorHandler(...)` in `extensionHostMain.ts`, redirecting every reported error to `mainThreadErrors.$onUnexpectedError(data)` — i.e. serialize it and hand it to the renderer/main process, which reports it again on its own side. [[11]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extensionHostMain.ts#L49-L156) [[12]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/browser/mainThreadErrors.ts) The net effect: **the process never rethrows, never exits, and every other extension keeps working.** The failure is reported (visible in logs/telemetry, likely a notification), not silent, but it is not fatal — either to the offending extension (unless the throw happened synchronously inside `activate()` itself, §4) or to the host.

### 3. What DOES terminate the host, and the crash-restart mechanics

Real host termination is driven by the OS-level process actually exiting. `abstractExtensionService.ts`'s `_onExtensionHostCrashed(extensionHost, code, signal)` fires off `processManager.onDidExit`, and the concrete `onTerminate(...)` call sites in `extensionHostProcess.ts` are protocol-level, not JS-exception-level:

- `'renderer disconnected for too long (1)'` / `(2)` — the IPC socket to the window went away and didn't reconnect within the grace window
- `'VSCODE_EXTHOST_IPC_SOCKET timeout'`
- `'renderer closed the socket'` / `'renderer closed the MessagePort'`
- `'received terminate message from renderer'` — an explicit, intentional shutdown
- `nativeExit(ExtensionHostExitCode.VersionMismatch)` — remote reconnection version skew

[[3]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts#L94-L347) Beyond these, an actual native crash (segfault in a native Node addon), an OS OOM-kill, or an external `kill` also exits the process and lands in the same handler.

The user-visible outcome depends on a crash tracker:

```ts
// src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts
if (this._localCrashTracker.shouldAutomaticallyRestart()) {
  this._notificationService.status(nls.localize('extensionService.autoRestart',
    "The extension host terminated unexpectedly. Restarting..."), { hideAfter: 5000 });
  this.startExtensionHosts();
} else {
  // … choices.push({ label: "Start Extension Bisect", run: () => commandService.executeCommand('extension.bisect.start') });
  this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash',
    "Extension host terminated unexpectedly 3 times within the last 5 minutes."), choices);
}
```
[[1]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts#L149-L228)

Below the threshold, VS Code silently restarts the whole host via `startExtensionHosts()`, which is preceded by `_doStopExtensionHosts()` — every extension that was activated is deactivated (best-effort, 5-second grace, see §4) and reconstructed from scratch. **State does not survive**: in-memory caches, debounce timers, file watchers, webview panel backing objects, and any promise in flight are all gone, for every extension in that host, not only the one that crashed.

### 4. activate()'s per-extension isolation — and the leak when it fails partway through

Contrary to §2/§3, `activate()` itself IS individually wrapped:

```ts
// src/vs/workbench/api/common/extHostExtensionService.ts — _callActivateOptional
try {
  const activateResult: Promise<IExtensionAPI> = extensionModule.activate.apply(globalThis, [context]);
  return Promise.resolve(activateResult).then((value) => value);
} catch (err) {
  return Promise.reject(err);
}
```

A synchronous throw *or* a rejected returned Promise both become a rejected Promise here, which propagates to `_activateExtension`'s failure branch: the extension's `activationFailed` flag is set, the error is logged with `_logExtensionActivationTimes(..., 'failure')`, and — critically — **no other extension is affected.** [[2]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extHostExtensionService.ts#L445-L629)

But this isolation has a real gap. `_callActivate`'s success path is the *only* place that wires up cleanup:

```ts
// src/vs/workbench/api/common/extHostExtensionService.ts — _callActivate
return this._callActivateOptional(...).then((extensionExports) => {
  return new ActivatedExtension(false, null, activationTimesBuilder.build(), extensionModule, extensionExports,
    toDisposable(() => {
      extensionInternalStore.dispose();
      dispose(context.subscriptions);   // <- only reachable on SUCCESS
    }));
});
```
[[2]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extHostExtensionService.ts#L599-L612)

`context.subscriptions` is the *same array object* passed into `activate()` — if the function has already run several `context.subscriptions.push(...)` calls (registering real commands, listeners, output channels) before it throws or its returned promise rejects, those registrations are live in VS Code's registries, but the `toDisposable(...)` wrapper that would ever call `dispose(context.subscriptions)` on them is never constructed, because the `.then` above never runs. The extension is reported "failed to activate" while some of its commands remain callable with no teardown path until the whole host restarts.

```ts
// WRONG shape — a mid-body throw leaks the two prior registrations
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.window.createOutputChannel('X'));   // registered
  context.subscriptions.push(vscode.commands.registerCommand('x.run', run)); // registered
  const cfg = JSON.parse(readManifestSync());     // throws on a malformed file
  context.subscriptions.push(vscode.commands.registerCommand('x.build', build));
}
```

```ts
// BETTER — anything that can throw runs before any subscriptions.push,
// or the throwable step is caught and what's already pushed is disposed first
export function activate(context: vscode.ExtensionContext) {
  const cfg = JSON.parse(readManifestSync());      // can throw — do it FIRST
  const output = vscode.window.createOutputChannel('X');
  context.subscriptions.push(output, vscode.commands.registerCommand('x.run', run),
    vscode.commands.registerCommand('x.build', build));
}
```

### 5. process.exit()/process.crash() are intercepted, not honored

`extensionHostProcess.ts` patches both before any extension code runs:

```ts
function patchProcess(allowExit: boolean) {
  process.exit = function (code?: number) {
    if (allowExit) { nativeExit(code); }
    else {
      const err = new Error('An extension called process.exit() and this was prevented.');
      console.warn(err.stack);
    }
  } as (code?: number) => never;
  (process as any).crash = function () {
    console.warn(new Error('An extension called process.crash() and this was prevented.').stack);
  };
}
```
[[5]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts#L94-L118) `allowExit` is only `true` when running under the extension **test** harness (`extensionTestsLocationURI` set); in a normal window, both calls are silently downgraded to a warning. An extension cannot terminate its own host, and code (human- or agent-written) that assumes `process.exit(1)` is a valid "abort activation" signal is wrong — it does nothing observable to the user.

### 6. The responsiveness watchdog: 3000ms, and what it drives

Distinct from crashing, `rpcProtocol.ts` tracks whether the *other side* of the RPC channel acknowledges messages within a fixed window:

```ts
private static readonly UNRESPONSIVE_TIME = 3 * 1000; // 3s
```
[[6]](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/rpcProtocol.ts#L119) If an outstanding RPC call isn't acknowledged before that deadline, `ResponsiveState` flips to `Unresponsive` and fires `onDidChangeResponsiveState`; `nativeExtensionService.ts` subscribes to this per host and logs `"Extension host (…) is unresponsive."` This does **not** kill anything — a long synchronous loop inside one extension's activation or command handler blocks the whole host's event loop (shared process, §1) and every other extension's RPC calls stall behind it until the loop finishes, at which point the state flips back to `Responsive`.

### 7. Show Running Extensions + Extension Bisect: the profiling step standing in for a lint

There is no lint that flags "this extension is slow" — the mechanical substitute is manual profiling via the Command Palette:

1. `Developer: Show Running Extensions` opens an editor listing every activated extension with its activation time and event.
2. The record control in that editor's title bar starts a CPU profile of the extension host; reproduce the slowdown, stop recording, and either open the saved `.cpuprofile`-renamed file directly in VS Code's built-in viewer, or rename it `.json` and load it into Chrome DevTools' Performance tab.
3. `Help: Start Extension Bisect` performs a binary search over installed extensions (`O(log N)` steps, PR-level command id `extension.bisect.start` — confirmed against the same id used internally by the crash-prompt code in §3) to isolate a crash- or slowdown-causing extension without manual one-by-one disabling.

[[7]](https://github.com/microsoft/vscode/wiki/Performance-Issues) [[8]](https://code.visualstudio.com/blogs/2021/02/16/extension-bisect) For an AI agent, "run `Developer: Show Running Extensions`, note the activation time / profile before and after your change" is the closest available proxy for a performance regression test.

### 8. Activation events and onStartupFinished

`onStartupFinished` is documented to fire "some time after VS Code starts up," specifically *after* every `*`-activated extension has finished activating, so it "will not slow down VS Code startup." The guidance is explicit about restraint: "use this activation event in your extension only when no other activation events combination works in your use-case." [[10]](https://code.visualstudio.com/api/references/activation-events) The `*` event itself is not marked deprecated on the current page, but its own description already frames it as the thing `onStartupFinished` exists to avoid.

Both fleet extensions already avoid `*`:

| Extension | activationEvents | Assessment |
|---|---|---|
| grimoire-vscode | `onStartupFinished`, `onWebviewPanel:grimoire.details`, `onUri` | eager work deferred past startup; two scoped events besides |
| vscode-ocx | `workspaceContains:**/ocx.toml` | narrowest possible — activates only where relevant |

(Confirmed by reading `package.json` in both repos directly — this was already established clean and is not re-derived here beyond the table.)

### 9. Workspace trust API surface

`capabilities.untrustedWorkspaces.supported` in `package.json` takes three shapes:

- `true` — the extension works fully in Restricted Mode; declare this only if it never executes workspace code or consumes workspace settings as execution parameters.
- `false` — VS Code does not activate the extension at all until the workspace is trusted (the extension has no responsibility for gating, because it simply doesn't run).
- `"limited"` — the extension activates and runs in Restricted Mode; some features work, others need trust, and **the extension owns every gate itself.** Add `restrictedConfigurations: [...]` naming setting IDs where VS Code should silently substitute the user-level value instead of any workspace-level override while untrusted.

At runtime: `vscode.workspace.isTrusted` (boolean, current state), `vscode.workspace.onDidGrantWorkspaceTrust` (fires once, mid-session, when the user trusts a previously-restricted workspace — never fires for "already trusted at open"), and the `isWorkspaceTrusted` context key for `when` clauses on commands/menus/views. [[9]](https://code.visualstudio.com/api/extension-guides/workspace-trust)

The one mechanism that requires *no* extension code at all is `restrictedConfigurations`: for keys listed there, VS Code's configuration service itself returns only the user-level value while untrusted — reading `vscode.workspace.getConfiguration(...).get('x')` for a listed key is already safe without an `isTrusted` check around the read. Everything else — spawning a process, resolving a module, reading a workspace file, passing workspace-derived arguments to a trusted binary — is not covered by that mechanism and needs an explicit gate.

### 10. Workspace-trust honesty cross-check, applied to the fleet

This is not a single grep — it's the six-step procedure below, worked against both manifests.

**Step 1 — read the declaration.** Both declare `"limited"`:

```jsonc
// grimoire-vscode/package.json
"untrustedWorkspaces": {
  "supported": "limited",
  "restrictedConfigurations": ["grimoire.path.executable", "grimoire.extraEnv"]
}
// vscode-ocx/package.json
"untrustedWorkspaces": {
  "supported": "limited",
  "restrictedConfigurations": ["ocx.path.executable", "ocx.extraEnv"]
}
```

**Step 2 — enumerate every configurable setting**, not just the ones in `restrictedConfigurations`, and grep every read site. Both extensions' `readConfig()` also read a `defaultScope`/`groups`-style setting and behavioral toggles that don't feed a spawn — those are correctly left out of `restrictedConfigurations`.

**Step 3 — trace config reads forward** to any `execFile`/`spawn`, `fs.*`, or module resolution. In both extensions, `config.executable` and `config.extraEnv` do reach `execFile(...)` — and both are listed, so VS Code's own substitution covers them. No gap here.

**Step 4 — grep every `registerCommand(` in `activate()`'s body and follow each handler to a spawn.** This is where both extensions diverge from their declaration:

- **grimoire-vscode**: `grimoire.updateAll`, `grimoire.initProject`, `grimoire.installGrim`, and `grimoire.refresh` (with `{ refresh: true }`, busting grim's cache) all eventually call into `grim.ts`'s `updateArgs()`/`initArgs()`/`addArgs()` builders and execute `grim`. `grim update` re-resolves floating tags and materializes whatever the workspace's `grimoire.toml`/lock declares — i.e. it fetches from a workspace-controlled registry reference. The only runtime trust check in the whole file (`mayCheck`) gates a *different*, lower-stakes path (the automatic `checkArtifactUpdates` network round), not these commands. Grep result: `grep -rn "isTrusted" src/` returns exactly one hit outside tests.
- **vscode-ocx**: the automatic path is correctly gated —
  ```ts
  if (!vscode.workspace.isTrusted) {
    status.set({ kind: 'trust-required' });
    return; // no spawn
  }
  ```
  — but `runProjectCommand` (backing `ocx.lock`, `ocx.pull`, `ocx.upgrade`, `ocx.clean`) and `runInitCommand` (`ocx.init`) call `runSubcommand`/`runInit` with `cwd: project.dir` and args built from `project.tomlPath` **without any `isTrusted` check**, reachable straight from the Command Palette. The code comment on `ocx.pull` says it literally "materializes tools" — installs whatever the workspace's `ocx.toml` names.

**Step 5 — check the background triggers too.** vscode-ocx's `locator.onDidChange` and `onDidChangeConfiguration('ocx')` listeners both route through the (correctly gated) `reload()`, so the automatic side is sound; the gap is specifically in the manually-invoked commands.

**Step 6 — cross-reference against the declared `when`-clause surface.** `grep -n "isWorkspaceTrusted" package.json` returns **zero matches in either manifest** — none of the above commands are hidden from the Command Palette in Restricted Mode either. A user can open an untrusted (and therefore, by definition, not-yet-vetted) folder and run "Grimoire: Update All" or "OCX: Pull" from the palette with no trust prompt in between.

**Verdict**: neither manifest is a *false* declaration of `"limited"` — both extensions do have trust-restricted operations, which is what `"limited"` is for. But `"limited"` on its own oversells what's covered: `restrictedConfigurations` fully protects the two keys it lists, and the automatic/background paths are honestly gated in vscode-ocx (not in grimoire-vscode beyond one check), while the single riskiest action in each extension — materializing artifacts/tools the workspace itself declares — is reachable from an untrusted workspace via the Command Palette with zero gate, in both.

## Normative guidance candidates

1. **Rule**: Run the six-step workspace-trust cross-check (§10) on every PR that adds or changes a `registerCommand`, a config-driven spawn, or the `capabilities.untrustedWorkspaces` block — not just at manifest-authoring time.
   **Rationale**: `restrictedConfigurations` only protects the literal keys it lists; every other spawn/exec/fs/module-resolution reachable from a command is the author's sole responsibility under `"limited"`, and nothing else enforces it.
   **Verify**: the procedure itself — grep every `registerCommand(`, trace each handler to any `execFile`/`spawn`/`fs.*`/`require`/`import()` call, confirm a runtime `isTrusted` check or an `isWorkspaceTrusted` when-clause guards it; cross-check `grep -n "isWorkspaceTrusted" package.json` is non-empty if any command needs hiding.

2. **Rule**: A command handler that spawns a process using workspace-derived data (a resolved manifest path, `cwd` inside the workspace, file content) must gate on `vscode.workspace.isTrusted` even when the executable path itself is `restrictedConfigurations`-protected.
   **Rationale**: protecting the executable path doesn't protect what that trusted binary is told to do — grimoire-vscode's `updateArgs()`/vscode-ocx's `ocx.pull` both feed workspace-declared data to an otherwise-safe binary.
   **Verify**: for each command found in step 1, confirm the specific handler — not a sibling automatic path — contains the check.

3. **Rule**: Every promise created in `activate()`, or in any callback it registers, that is not returned/awaited must terminate its own chain in `.catch(...)` (or be wrapped in a try/catch async IIFE) — treat this as a hard rule, not a "prefer."
   **Rationale**: it will not crash the host (§2), but it will still surface as a generic, context-poor error report through `onUnexpectedError` → `mainThreadErrors` a full second later, and the specific failure at its real call site is lost by the time anyone reads the report.
   **Verify**: `no-floating-promises` (typescript-eslint, type-aware) where type-aware linting is wired up; otherwise the manual heuristic `grep -n "void [a-zA-Z_$][a-zA-Z0-9_$.]*(" src/**/*.ts` followed by reading whether the named callee's own promise chain ends in `.catch`.

4. **Rule**: Never return a `Promise` from `activate()` that `await`s slow initialization (spawning a process, a network call, a filesystem scan). Return synchronously (or resolve immediately) and kick the slow work off as an already-`.catch`-guarded fire-and-forget call instead.
   **Rationale**: VS Code measures and waits on `activate()`'s returned promise (`activateResolveStart`/`Stop`) before considering the extension activated; a slow or hung awaited chain delays every caller of `extensions.getExtension(id).activate()` and any `onCommand`-triggered execution behind it.
   **Verify**: read `activate()`'s final `return` statement — flag any `await` on non-trivial work (spawn, fetch, fs) that isn't already running before the function's tail.

5. **Rule**: Order `activate()`'s body so any step that can throw (`JSON.parse`, config validation, path resolution) runs *before* the first `context.subscriptions.push(...)`, or wrap the throwable step in its own try/catch that disposes what was already pushed before rethrowing/logging.
   **Rationale**: `ActivatedExtension`'s disposal wrapper — the only thing that ever calls `dispose(context.subscriptions)` — is constructed exclusively on `activate()`'s success path (§4); a mid-body throw leaves earlier `push`ed commands/listeners live with no teardown until the whole host restarts.
   **Verify**: read `activate()` top-to-bottom; find the first `context.subscriptions.push`; everything after it must be provably non-throwing (plain `registerCommand`/`createOutputChannel`-style calls) or itself wrapped.

6. **Rule**: Never call `process.exit()` or `process.crash()` from extension code, including "abort activation on fatal config error" patterns.
   **Rationale**: both are intercepted and downgraded to `console.warn` outside the test harness (§5) — the call is a silent no-op from the extension author's point of view, and the intended abort never happens.
   **Verify**: `grep -rn "process\.\(exit\|crash\)(" src/ --include=*.ts | grep -v /test/`.

7. **Rule**: Prefer the narrowest activation event available; use `onStartupFinished` only when no scoped event (`onCommand`, `workspaceContains`, `onLanguage`, `onUri`, `onWebviewPanel`, …) covers the need, and never use `*`.
   **Rationale**: `onStartupFinished` exists precisely so eager extensions don't compete with `*`-activated ones for the startup window; `*` activates unconditionally on every window, trust status notwithstanding.
   **Verify**: read `package.json`'s `activationEvents` array; any `"*"` is an automatic finding; any `onStartupFinished` needs a one-line justification for why no narrower event fits.

8. **Rule**: Treat `Developer: Show Running Extensions` (with a before/after CPU-profile capture) as the required manual check for any change that adds work reachable from `activate()` or a hot listener (file watcher, config-change handler).
   **Rationale**: there is no lint for extension-host activation latency or blocking work; this command plus a captured profile is the only mechanical substitute available today.
   **Verify**: run the command, note the activation time entry, capture a profile exercising the changed path, and confirm no new long synchronous frame appears.

9. **Rule**: If a fix or feature is reported as "the extension host crashed" but the user's symptom is actually a hang or freeze (not a `"terminated unexpectedly"` notification), diagnose it as a responsiveness problem (§6, 3000ms threshold), not a crash — look for a long synchronous loop, not a thrown error.
   **Rationale**: crash and unresponsive are mechanically distinct signals (`onDidExit` vs. `onDidChangeResponsiveState`) with different causes and different fixes; treating a hang as a crash sends the fix in the wrong direction (adding a try/catch around something that never threw).
   **Verify**: check whether a `"terminated unexpectedly"` notification actually appeared; if not, the RPC channel never died — profile for a blocking synchronous call instead (§8).

10. **Rule**: Do not add or accept an agent-authored `process.on('uncaughtException'|'unhandledRejection', ...)` handler inside extension code on the theory that "without it, an error here will crash the shared host for everyone."
    **Rationale**: that premise is false in current VS Code (§2) — the host already installs its own handlers before any extension code runs; an extension-added handler is redundant at best and, if it does something host-specific like calling `process.exit`, is itself intercepted and neutered (§5).
    **Verify**: `grep -rn "process\.on(.unhandledRejection.\|process\.on(.uncaughtException." src/`; any hit in non-test extension code should be justified or removed.

## AI-agent angle

- **Reflexive global-crash-handler code from server-side Node training data.** A model trained heavily on Express/Fastify boilerplate reaches for `process.on('unhandledRejection', () => process.exit(1))`-style patterns out of habit. In this codebase that's not just unnecessary — the exit call is silently intercepted (§5) — so the "safety net" the agent thinks it wrote does nothing. **Check**: grep for `process.on(` and `process.exit(`/`process.crash(` in `src/` outside `test/`; any hit is a candidate for deletion, not a feature.

- **Treating a returned `Promise` from `activate()` as the "correct, robust" shape.** Generic async-bootstrap idioms favor "await everything before you're ready" — exactly backwards here (§4 rule 4): it delays activation completion and, if the awaited chain ever stalls on something requiring user interaction, the extension is stuck "Activating…" indefinitely with no timeout the extension author controls. **Check**: read the literal `return` statement of `activate()`; a returned promise chain containing anything beyond immediate service construction is a red flag.

- **Hallucinated or outdated command ids for host-restart flows.** A model may produce `workbench.action.reloadExtensionHost` or similar plausible-sounding but nonexistent ids. The real, current id — confirmed both in VS Code core (`RestartExtensionHostAction`) and in vscode-ocx's own working code — is `workbench.action.restartExtensionHost`. **Check**: any `executeCommand('workbench.action...')` string touching extension-host lifecycle should be grepped against `vscode.commands.getCommands()` output in a test, not trusted from memory.

- **Reimplementing `restrictedConfigurations` substitution by hand.** Not knowing VS Code already swaps in the user-level value for listed keys while untrusted, an agent may write bespoke code calling `.inspect(key)` and manually picking apart `.globalValue`/`.workspaceValue` — redundant, and a common source of subtly wrong scope handling (folder-level settings, multi-root workspaces) that the built-in mechanism already gets right. **Check**: grep for `.inspect(` near any config key that's already listed in `restrictedConfigurations`; question whether it's doing anything the platform doesn't already do.

- **Conflating `"limited"` with `false` for gating purposes.** An agent reasoning "the manifest already says untrustedWorkspaces is limited, so VS Code is handling it" and skipping a runtime `isTrusted` check on a new risky command entirely — `false` means VS Code refuses to even activate the extension until trust is granted (no author responsibility, because nothing runs); `"limited"` means the opposite: full activation, zero automatic gating beyond the literal `restrictedConfigurations` keys. **Check**: for every new command added under a `"limited"` declaration, require the step-4 trace in §10 as a PR checklist item, not a manifest read.

## Contested / evolving

- **Whether a config-driven env/PATH reload should auto-restart the extension host or prompt.** vscode-ocx's own code explicitly prompts by default (`promptRestart`, "Restart Extensions" / "Later") with an opt-in `config.restartAutomatic` escape hatch, reasoning that a restart tears down every extension's state (§3), not just the initiating one. This reads as the fleet's own considered position rather than a documented VS Code recommendation — **could not establish this as a documented VS Code trend as of 2026-08-29**; it is worth treating as the fleet's local convention, applied consistently, rather than citing it as external guidance.
- **The old "extension guidelines" performance dos-and-don'ts page appears to have been folded away.** `code.visualstudio.com/api/references/extension-guidelines` currently resolves to a UX-only guide (Containers/Items/Common UI Elements — Activity Bar, Sidebar, Status Bar, Command Palette, Notifications, etc.) with no activation, performance, or extension-host content; the one sentence about "misbehaving extensions should not impact the user experience" now lives only on the `advanced-topics/extension-host` page. Treat any older external guidance citing a dedicated "Extension Guidelines: Performance" section as historical; **could not locate its current equivalent as of 2026-08-29**.
- **The mechanical check for rule 3 (self-catching fire-and-forget) is a type-aware lint that the fleet mostly doesn't run.** `no-floating-promises` needs type-aware `typescript-eslint`, which wave 1 found wired up in exactly 1 of 9 fleet repos (two others' rule files claim it without the wiring). Until that gap closes, the check in this document has to stay a manual grep-and-read heuristic, not an enforced gate — worth revisiting once type-aware linting lands more broadly, since TS 6.x (four repos) already supports it today; only the TS 7.0-without-stable-API repos are blocked outright.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [code.visualstudio.com/api/advanced-topics/extension-host](https://code.visualstudio.com/api/advanced-topics/extension-host) | Official VS Code API docs | read 2026-08-29 | States the shared-process intent and the "misbehaving extensions should not impact the user experience" framing directly |
| [code.visualstudio.com/api/references/activation-events](https://code.visualstudio.com/api/references/activation-events) | Official VS Code API docs | read 2026-08-29 | Full activation-event list; `onStartupFinished` rationale and restraint guidance |
| [code.visualstudio.com/api/extension-guides/workspace-trust](https://code.visualstudio.com/api/extension-guides/workspace-trust) | Official VS Code API docs | read 2026-08-29 | `capabilities.untrustedWorkspaces`, `restrictedConfigurations`, `isTrusted`/`onDidGrantWorkspaceTrust`/`isWorkspaceTrusted` |
| [code.visualstudio.com/api/references/extension-guidelines](https://code.visualstudio.com/api/references/extension-guidelines) | Official VS Code API docs | read 2026-08-29 | Confirms current content is UX-only — the historical-guidance flag in Contested/evolving |
| [code.visualstudio.com/api/get-started/extension-anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy) | Official VS Code API docs | read 2026-08-29 | `activate()`/`deactivate()` lifecycle framing |
| [github.com/microsoft/vscode … abstractExtensionService.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/abstractExtensionService.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | `_onExtensionHostCrashed`, `_doStopExtensionHosts`, whole-host teardown on restart |
| [github.com/microsoft/vscode … nativeExtensionService.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | Exact "terminated unexpectedly" strings, crash tracker, 3-crashes/5-minutes threshold, Extension Bisect wiring |
| [github.com/microsoft/vscode … extensionHostProcess.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | `process.on('unhandledRejection'/'uncaughtException')` overrides; `process.exit`/`crash` interception |
| [github.com/microsoft/vscode … errors.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/base/common/errors.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | `onUnexpectedError`/`ErrorHandler` default behavior and override points |
| [github.com/microsoft/vscode … extensionHostMain.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extensionHostMain.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | Where the extension host overrides the default error handler to report to the main process instead of rethrowing |
| [github.com/microsoft/vscode … mainThreadErrors.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/browser/mainThreadErrors.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | Confirms serialized extension errors re-enter `onUnexpectedError` on the renderer side |
| [github.com/microsoft/vscode … extHostExtensionService.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extHostExtensionService.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | `_callActivateOptional`/`_callActivate` — per-extension activation isolation and the subscriptions-disposal leak on partial failure |
| [github.com/microsoft/vscode … rpcProtocol.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/rpcProtocol.ts) | VS Code source, `main` @ v1.136.0 | commit 2026-08-29 | Exact `UNRESPONSIVE_TIME = 3 * 1000` and `ResponsiveState` mechanics |
| [github.com/microsoft/vscode/wiki/Performance-Issues](https://github.com/microsoft/vscode/wiki/Performance-Issues) | Official VS Code repo wiki | read 2026-08-29 | `Developer: Show Running Extensions`, CPU-profile capture and analysis steps |
| [code.visualstudio.com/blogs/2021/02/16/extension-bisect](https://code.visualstudio.com/blogs/2021/02/16/extension-bisect) | Official VS Code blog | 2021-02-16 | Extension Bisect mechanics (binary search, O(log N)) — still the current tool, command id confirmed against live source |
| [nodejs.org/api/process.html#event-unhandledrejection](https://nodejs.org/api/process.html#event-unhandledrejection) | Official Node.js docs | read 2026-08-29 | Baseline Node behavior the extension host deliberately overrides |
| [github.com/nodejs/node … doc/api/cli.md](https://github.com/nodejs/node/blob/main/doc/api/cli.md) | Node.js source docs, `main` | read 2026-08-29 | Exact version citation: `--unhandled-rejections` default flipped to `throw` in v15.0.0 (PR #33021) |
| `/home/mherwig/dev/grimoire-vscode/{package.json,src/extension.ts,src/grim.ts,src/config.ts}` | Fleet source | in-repo, read 2026-08-29 | `capabilities.untrustedWorkspaces`, the single `isTrusted` check, ungated `updateAll`/`initProject`/`installGrim` |
| `/home/mherwig/dev/vscode-ocx/{package.json,src/extension.ts}` | Fleet source | in-repo, read 2026-08-29 | Correctly-gated automatic `reloadOnce`, ungated `ocx.lock`/`pull`/`upgrade`/`init` commands |
| `github.com/microsoft/vscode` (repo root) | VS Code source | commit `cd429513258458bcbe37b17fe714874197fe2adf`, 2026-08-29, `version: 1.136.0` | Pin for every source citation above — the exact commit read |

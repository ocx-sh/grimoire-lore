---
title: Delta - React, React Compiler, Vue, Vite/Rolldown, esbuild, size-limit, VS Code extension host and Electron
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 21
---

# Delta - frontend bundlers and the extension-host surface

## Table of contents

1. Summary
2. Findings (per claim at risk)
3. Normative guidance candidates
4. AI-agent angle
5. Contested / evolving
6. Sources

Scope: the window 2026-08-29 to 2026-11-27 only, for the claims in browser.md, async.md, resources.md and extension-host.md. Everything not named here is untouched. Method: npm registry `time` fields (publish dates), GitHub releases and raw files read with `gh api` / `curl`, and the vscode and vscode-docs repositories at main. Anything marked "could not determine" was not fetchable.

## Summary

- No claim at risk is contradicted. Eleven of twelve are unchanged; one (the TS-WEB-14 Vite clause) gains precision, and one (TS-WEB-09, size-limit) gains a new fact worth a clause.
- React 19.3.0 (2026-09-09) and 19.3.1 (2026-10-14) added no hook-based error boundary and no `forwardRef` removal. There is no React 20 release; `npm dist-tags` shows `latest` 19.3.1 and the highest canary is 19.3.0-canary.
- `babel-plugin-react-compiler` is still 1.0.0 (2025-10-07) with no newer version published; no rename.
- There is no Vite 9. Vite `latest` is 8.4.0 (2026-11-26). The current docs mark `build.rollupOptions` "Deprecated ... alias of `build.rolldownOptions`" and no longer say a removal is scheduled in the build-options page.
- Vite 8.4.0 still defaults `build.chunkSizeWarningLimit` to 500 (kB, uncompressed).
- `bundlesize` is still at 0.18.2, last modified 2024-03-15. Unchanged.
- Vue 3.5.46 (2026-11-20) runtime still routes handlers through `callWithAsyncErrorHandling`, which `.catch()`es promises. The Vue 3.6 line (Vapor) is at 3.6.0-rc.17 (2026-11-27), still not stable, and its Vapor runtime still imports and calls `callWithAsyncErrorHandling` for events.
- esbuild has published nothing since 0.28.2 (2026-08-08), which predates the baseline measurement date. The unreleased section of the changelog has no `import.meta` or `using` change.
- size-limit 14.0.0 (2026-09-15) moved `@size-limit/preset-small-lib` to rolldown by default; `latest` is 14.3.0 (2026-10-22).
- VS Code is now released weekly (1.136 on 2026-09-02 through 1.148 on 2026-11-25). None of those release notes mention a change to the extension-host unhandledRejection or process.exit handling, `localResourceRoots`, webview CSP guidance or Workspace Trust semantics.
- In `main`, `rpcProtocol.ts` still has `UNRESPONSIVE_TIME = 3 * 1000`, and `extensionHostProcess.ts` still intercepts `process.exit`, `process.crash` and registers `unhandledRejection`.

## Findings

### 1. React: TS-WEB-12 and TS-WEB-01 (errors.md item 9) - unchanged

- Old text: "On React >=19 (stable 2024-12-05) do not write forwardRef"; "React boundaries are class-only, there is no hook equivalent".
- Fact: React 19.3.0, 2026-09-09, adds `<ViewTransition />`, Fragment Refs, `browser()` in react-dom, Trusted Types integration, independent transition rendering ([release](https://github.com/react/react/releases/tag/v19.3.0), [post](https://react.dev/blog/2026/09/09/react-19-3)). Its only `forwardRef` mention is a bug fix ("Fix `useEffectEvent` to read the latest values in `forwardRef` and `memo` components"), which confirms `forwardRef` still exists and is not removed. No error-boundary API is in the notes. 19.3.1 (2026-10-14) is a Server Components transport fix only ([release](https://github.com/react/react/releases/tag/v19.3.1)). Patch backports 19.0.9, 19.1.10, 19.2.9 shipped the same day.
- Verdict: unchanged. Note: the repository moved from `facebook/react` to `react/react`; the old URL redirects.
- The 19.3 "Activity" fix "Prevent errors thrown inside a hidden Activity from escaping to the visible UI" is not a boundary API.

### 2. React Compiler: TS-WEB-13 - unchanged

`babel-plugin-react-compiler` dist-tag `latest` is 1.0.0, published 2025-10-07; no version has been published after that in the registry listing, and `react-compiler-runtime` is likewise 1.0.0 ([npm](https://registry.npmjs.org/babel-plugin-react-compiler)). No rename, no newer major. Unchanged.

### 3. Vite and Rolldown: TS-WEB-14 and TS-WEB-09 - precision gain

- No Vite 9 exists: `latest` is 8.4.0 (2026-11-26), with 8.3.x patches and maintenance backports (7.3.8, 6.4.6) on 2026-11-09 ([npm](https://registry.npmjs.org/vite), [releases](https://github.com/vitejs/vite/releases/tag/v8.4.0)).
- Old text: "`build.rollupOptions` still works through a compat layer scheduled for removal." New fact: the build-options docs at main now read for `build.rollupOptions`: "Type: RolldownOptions. Deprecated. This option is an alias of `build.rolldownOptions` option. Use `build.rolldownOptions` option instead." ([build-options.md](https://github.com/vitejs/vite/blob/main/docs/config/build-options.md)). It is an alias, not a conversion layer, and the page names no removal version. The migration guide still says `optimizeDeps.esbuildOptions`, `esbuild` and `build.minify: 'esbuild'` are deprecated "and will be removed in the future" ([migration.md](https://github.com/vitejs/vite/blob/main/docs/guide/migration.md)). Whether the Vite 8.0 text said "scheduled for removal" for `rollupOptions` specifically could not be determined from the current page alone.
- Decision: TS-WEB-14 does not need a Vite 9 clause, because there is no Vite 9 and no announced removal version. Suggested wording tweak only: "`build.rollupOptions` is a deprecated alias" instead of "compat layer scheduled for removal".
- TS-WEB-09: `build.chunkSizeWarningLimit` default 500, "compared against the uncompressed chunk size" - unchanged ([same page](https://github.com/vitejs/vite/blob/main/docs/config/build-options.md)).
- Rolldown 1.3.0 (2026-11-05) is a minor release adding experimental import attributes support and changing some defaults versus 1.2.16; its notes warn Vite 8.3.6 and earlier need changes to use it ([release notes](https://github.com/rolldown/rolldown/releases)). Vite pins its own rolldown, so a normal install is unaffected. Relevant only to TS-RES-04's Oxc/Rolldown note: oxc#25155 status was not re-checked (could not determine).

### 4. size-limit and bundlesize: TS-WEB-09 - new fact

- `bundlesize` still `latest` 0.18.2, last modified 2024-03-15 ([npm](https://registry.npmjs.org/bundlesize)). Unchanged.
- size-limit 14.0.0, 2026-09-15: "Moved to `rolldown` by default in `@size-limit/preset-small-lib`. Unified Node.js support across projects. Removed dependencies." ([release](https://github.com/ai/size-limit/releases/tag/14.0.0)). 14.3.0 on 2026-10-22 is the current latest. Consequence: a size-limit number recorded under 13.x (esbuild-based small-lib preset) is not comparable with a 14.x number; TS-WEB-09's "adopter records how it was measured" already covers it, but the record should now include the size-limit major.

### 5. Vue: TS-ASYNC-03 and the rejection table - unchanged, exception holds

- Old text: "Vue's compiler routes template handlers through callWithAsyncErrorHandling ... read from vue@3.5 runtime source". Fact at main: `callWithAsyncErrorHandling` calls the function and, if the result is a promise, attaches `res.catch(err => handleError(...))` ([errorHandling.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/errorHandling.ts)); `runtime-dom/src/modules/events.ts` still calls it for DOM event invokers (lines 132 and 141 at main).
- Vue 3.6 / Vapor, `minor` branch: `runtime-vapor/src/dom/event.ts` also imports and calls `callWithAsyncErrorHandling` (lines 9, 160, 268), and `runtime-dom` does the same, so the carve-out holds for Vapor event handlers as well. The 3.6 changelog contains only Vapor error-handling fixes (for example "handle errors from nested calls once", #16315), no behavior change ([CHANGELOG minor](https://github.com/vuejs/core/blob/minor/CHANGELOG.md)).
- Release state: `latest` 3.5.46 (2026-11-20); 3.6.0-rc.17 published 2026-11-27, still a release candidate. Version tag text "vue@3.5" stays accurate; optional clause: "also read at 3.6.0-rc.17 for Vapor". Not verified: a compiled `@click="a.b.c()"` inline-expression path in Vapor templates (could not determine).

### 6. esbuild: extension-host.md Bundle Semantics, TS-HOST-19, TS-RES-04 - unchanged

- esbuild versions: 0.28.1 (2026-06-11), 0.28.2 (2026-08-08); nothing since ([npm](https://registry.npmjs.org/esbuild)). The baseline measured 0.28.1 on 2026-08-29 although 0.28.2 existed; 0.28.2 fixes concern TS import aliases, CSS `&` minification, `--allow-overwrite`, top-level await in cycles and lowered logical assignment, none touching `import.meta` or `using` ([CHANGELOG](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md)). Unreleased entries: `es2026` accepted in tsconfig `target`, Deno publishing stopped, and a new error when code-splitting chunk names collide (#4411). Chunk-name collision is a new build error only for configs with a hash-less `chunkNames`; irrelevant to single-file extension bundles.
- Suggested edit: the "Measured ... esbuild 0.28.1" sentence may be re-dated against 0.28.2; the claims need no change. The `var import_meta = {}` warning text was not re-measured here (could not determine by reading only; the changelog shows no change).
- TS-RES-04 "At esnext both tsc and esbuild emit the syntax completely unlowered": changelog has a 0.28.x fix "Avoid inlining `using` and `await using` declarations" (#4482) in the minifier, which is consistent with unlowered output. Unchanged.

### 7. VS Code extension host: Read This First, TS-HOST-05, 07, 08, workspace trust - unchanged

- Releases in the window: 1.136 (2026-09-02) to 1.148 (2026-11-25) ([release notes dir](https://github.com/microsoft/vscode-docs/tree/main/release-notes)). Grepping 1.136-1.148 notes for localResourceRoots, webview CSP, Workspace Trust, extension host crash/unresponsive, process.exit and Electron finds only leak fixes (for example "memory leak in extension host ..." in 1.137, 1.139, 1.141, 1.142), a webview find fix (1.143), "Debug Extension Host: enable inspector on running extension host" (1.144) and webview cache cleanup (1.147). No default changed.
- 3000 ms: `rpcProtocol.ts` main: `private static readonly UNRESPONSIVE_TIME = 3 * 1000; // 3s`, check `if (Date.now() > this._unresponsiveTime)` ([source](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/rpcProtocol.ts)). Unchanged.
- Interception: `extensionHostProcess.ts` main still overrides `process.exit` ("An extension called process.exit() and this was prevented.") and `process.crash`, and registers `process.on('unhandledRejection', ...)` that forwards to `onUnexpectedError` ([source](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/node/extensionHostProcess.ts)). `patchProcess(!!initData.environment.extensionTestsLocationURI)` keeps the test-harness exception. Unchanged.
- TS-HOST-07: both the docs ("By default, webviews can only access resources in ... the extension's install directory ... the user's currently active workspace") and code agree: `getDefaultLocalResourceRoots` returns workspace folder URIs plus `extension.extensionLocation` ([extHostWebview.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostWebview.ts), [webview.md](https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/webview.md)). Unchanged. Docs last touched 2026-11-24 (editor-title actions section only).
- TS-HOST-08: webview.md still shows `script-src ${webview.cspSource}` as its baseline CSP example (line 1001). Unchanged.
- Workspace trust: docs still define `supported: 'limited'` with `restrictedConfigurations` ([workspace-trust.md](https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/workspace-trust.md)). Unchanged.

### 8. Electron - could not determine impact

npm shows Electron `latest` 45.5.0 (45.0.0 published 2026-10-21), `beta` 45.0.0-beta.7 and `alpha` 46.0.0-alpha.14 ([npm](https://registry.npmjs.org/electron)). Which Electron the VS Code release 1.148 ships was not determined (the `cgmanifest.json` entry read 43.8.13, which may be stale metadata and was not cross-checked). No claim at risk depends on the Electron version.

## Per-claim verdict table

| Claim | Verdict |
|---|---|
| TS-WEB-12 forwardRef | unchanged (React 19.3.1; no React 20) |
| TS-WEB-01 / errors.md 9 class-only boundary | unchanged |
| TS-WEB-13 compiler 1.0.0 2025-10-07 | unchanged |
| TS-WEB-14 rolldownOptions | unchanged; no Vite 9; docs now say "deprecated alias" |
| TS-WEB-09 500 kB, bundlesize 2024-03-15 | unchanged; add size-limit 14 note |
| TS-ASYNC-03 Vue exception | unchanged, also true for 3.6.0-rc.17 Vapor |
| esbuild 0.28.1 measurement, TS-HOST-19, TS-RES-04 | unchanged; 0.28.2 is the latest, no release in window |
| Unresponsive 3000 ms, unhandledRejection, process.exit | unchanged |
| TS-HOST-07, TS-HOST-08, trust "limited" | unchanged |
| Electron | could not determine (no claim depends) |

## Normative guidance candidates

1. Reword TS-WEB-14's second sentence to "`build.rollupOptions` is a deprecated alias of `build.rolldownOptions`." Rationale: current docs say "alias", name no removal. Verification: `git grep -n rollupOptions -- 'vite.config.*'` returns nothing on a `vite` dependency at `^8` or later (existing block).
2. Extend TS-WEB-09's "records how it was measured" with "including the `size-limit` major version." Rationale: 14.0.0 (2026-09-15) switched `preset-small-lib` from esbuild to rolldown, so numbers across 13 and 14 differ. Verification: reading heuristic, the recorded budget note names `size-limit` and its major; `git grep -n '"size-limit"' package.json` plus the lockfile entry.
3. Optional: add "Vapor (3.6 RC) verified 2026-11-27" to TS-ASYNC-03's source note. Rationale: keeps the carve-out evidence current. Verification: `grep -n callWithAsyncErrorHandling packages/runtime-vapor/src/dom/event.ts` in vuejs/core `minor`.
4. Optional: in extension-host.md's Bundle Semantics, change "Measured against esbuild 0.28.1" to name 0.28.2 only if the measurement is re-run. Rationale: 0.28.2 was already out on the measurement date. Verification: `npm ls esbuild` plus re-running the `import.meta` fixture and checking for `var import_meta = {}`.

## AI-agent angle

- A model trained before 2026-09 may assert React 20 or a `useErrorBoundary` hook exists; none exists in 19.3.x. Check: `git grep -n -E "useErrorBoundary|from 'react'.*ErrorBoundary"` outside `react-error-boundary` imports.
- A model may reach for `build.rollupOptions` or `optimizeDeps.esbuildOptions` out of habit. Check: the TS-WEB-14 grep, extended with `esbuildOptions`.
- A model may claim Vue 3.6 Vapor drops async-handler error routing; it does not as of rc.17. Check: the grep in candidate 3.
- A model may tell the owner "size-limit uses esbuild"; since 14.0.0 the small-lib preset uses rolldown. Check: `package.json` for `@size-limit/preset-small-lib` and its version.

## Contested / evolving

- Vue 3.6 (Vapor) is at rc.17 as of 2026-11-27; stable not released. Recheck at the next refresh.
- Rolldown 1.3.x exists but Vite 8.3.x pinned older Rolldown at the time of the 1.3.0 notice; Vite 8.4.0 (2026-11-26) bumps rolldown-related dependencies, exact pinned version not read.
- VS Code cadence changed to weekly releases (1.148 on 2026-11-25); the Sources lines in extension-host.md naming "monthly" iterations, if any, should say "weekly". Not verified in the file text.
- Electron 46 alpha is out; no extension API consequence found.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/react/react/releases/tag/v19.3.0 | React 19.3.0 release notes | 2026-09-09 | No hook boundary, forwardRef still present |
| https://react.dev/blog/2026/09/09/react-19-3 | React 19.3 release post | 2026-09-09 | Primary announcement |
| https://github.com/react/react/releases/tag/v19.3.1 | React 19.3.1 notes | 2026-10-14 | Patch, RSC transport only |
| https://registry.npmjs.org/react | npm publish dates and dist-tags | read 2026-11-27 | Proves no React 20 |
| https://registry.npmjs.org/babel-plugin-react-compiler | compiler package | 1.0.0 on 2025-10-07 | No rename or newer major |
| https://registry.npmjs.org/vite | Vite versions | latest 8.4.0 on 2026-11-26 | No Vite 9 |
| https://github.com/vitejs/vite/releases/tag/v8.4.0 | Vite 8.4.0 notes | 2026-11-26 | No rollupOptions removal |
| https://github.com/vitejs/vite/blob/main/docs/config/build-options.md | build options docs | main, read 2026-11-27 | Deprecated alias wording, 500 default |
| https://github.com/vitejs/vite/blob/main/docs/guide/migration.md | Vite migration guide | main | Deprecated-for-removal list |
| https://github.com/rolldown/rolldown/releases | Rolldown 1.3.0 notes | 2026-11-05 | Defaults changes, Vite caveat |
| https://github.com/evanw/esbuild/blob/main/CHANGELOG.md | esbuild changelog | 0.28.2, 2026-08-08 plus unreleased | No import.meta or using change |
| https://registry.npmjs.org/esbuild | esbuild publish dates | read 2026-11-27 | No release since 0.28.2 |
| https://github.com/ai/size-limit/releases/tag/14.0.0 | size-limit 14.0.0 notes | 2026-09-15 | Preset moved to rolldown |
| https://registry.npmjs.org/bundlesize | bundlesize package | modified 2024-03-15 | Stale confirmation |
| https://github.com/vuejs/core/blob/main/packages/runtime-core/src/errorHandling.ts | callWithAsyncErrorHandling source | main | The .catch behind TS-ASYNC-03 |
| https://github.com/vuejs/core/blob/minor/CHANGELOG.md | Vue 3.6 changelog | rc.17, 2026-11-27 | Vapor error-handling fixes only |
| https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/rpcProtocol.ts | RPC protocol source | main | 3 s unresponsive constant |
| https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/node/extensionHostProcess.ts | host process source | main | process.exit and unhandledRejection handling |
| https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostWebview.ts | webview default roots | main | localResourceRoots default |
| https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/webview.md | webview guide | main, touched 2026-11-24 | CSP baseline, default roots |
| https://github.com/microsoft/vscode-docs/tree/main/release-notes | VS Code 1.136-1.148 notes | 2026-09-02 to 2026-11-25 | Confirms no API default changed |
| https://registry.npmjs.org/electron | Electron versions | latest 45.5.0 | Surface check |

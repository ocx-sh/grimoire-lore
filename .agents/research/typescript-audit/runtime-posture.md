---
title: TypeScript fleet runtime posture audit
agent: runtime-posture-auditor
model: claude-sonnet-5
scope: >
  ocx-catalog, grimoire-indexer, grimoire-vscode, vscode-ocx, setup-ocx, fma,
  creeptd-ng (web/), kate-middlechild — .ts/.tsx/.js/.mjs/.cjs/.vue files only.
  Excluded: node_modules, dist, out, build, .agents/, .worktrees/,
  ocx-vscode-icons, coverage, .git, plus generated/vendor build output found
  during the audit and excluded on the same basis as dist/build:
  ocx-catalog/.lhci-site, ocx-catalog/.lighthouseci, ocx-catalog/site
  (mkdocs build), grimoire-vscode/.vscode-test, grimoire-indexer/.dev,
  creeptd-ng/web/playwright-report, creeptd-ng/web/test-results,
  kate-middlechild/docs/design-source/support.js (header: "GENERATED from
  dc-runtime/src/*.ts — do not edit"), creeptd-ng/web/public/wasm/*.js
  (wasm-bindgen output), kate-middlechild/archive/** (biome.json excludes it
  via `"!archive"` — dead prototype code, not built or linted).
method: >
  File universe: `find <repos> -type f \( -name "*.ts" -o -name "*.tsx" -o
  -name "*.js" -o -name "*.mjs" -o -name "*.cjs" -o -name "*.vue" \) -not
  -path "*/node_modules/*" ...` piped through the exclude list above, written
  to a scratch file and re-used as `$(cat files.txt)` for every grep below (so
  every count is `grep -n '<pattern>' $(cat files.txt) | wc -l` unless a
  narrower path is shown inline). Every finding was then read in context with
  `sed -n` to confirm it wasn't a false positive (e.g. `RegExp.prototype.exec`
  matching a `\bexec(\b` grep, or a Vue confirmation-toast handler that
  already wraps its body in try/catch). No code was modified; no build or
  test command was run.
---

# TypeScript fleet runtime posture

8 repos, 565 in-scope files (639 before dropping generated/vendor bundles —
see `scope` above). Findings below are grouped by the audit's 7 categories,
each with the reproducing command.

## 1. Promise discipline

**No repo enables type-aware promise linting except one.** `grep -rn
"no-floating-promises\|no-misused-promises" **/eslint.config.*` — 0 hits
fleet-wide; no config names these rules explicitly. But **`setup-ocx`** is
the only repo whose `eslint.config.js` extends `tseslint.configs
.strictTypeChecked` (`setup-ocx/eslint.config.js:15-16`, with `parserOptions
.project` wired to `tsconfig.eslint.json`) — `strictTypeChecked` pulls in
`no-floating-promises` and `no-misused-promises` by default and neither is
overridden off in that config's rules block, so setup-ocx alone has this
class of bug under CI. Every other repo (`ocx-catalog`, `grimoire-indexer`,
`grimoire-vscode`, `vscode-ocx`, `fma`) uses plain `tseslint.configs
.recommended` — syntactic only, no `parserOptions.project`, so these two
rules are structurally unavailable even if someone added them. `kate-
middlechild` uses Biome, whose linter has no promise-aware rule at all.

**`creeptd-ng/web` has no lint config in scope at all.** Its
`package.json:14` `lint` script is `eslint src --ext .ts,.vue` (legacy
non-flat-config CLI syntax), but no `.eslintrc*`/`eslint.config.*` exists
under `creeptd-ng/web` — the only one that exists lives in an excluded
worktree (`creeptd-ng/.worktrees/web-lint/web/eslint.config.js`). Running
`lint` in this repo today either fails outright or silently no-ops.

**The `void` marker is used deliberately and heavily** (98 occurrences via
`grep -n "^\s*void [a-zA-Z]" $(cat files.txt) | wc -l`), concentrated in the
two VS Code extensions (`grimoire-vscode/src/extension.ts` alone has 15+).
But `void` only marks a promise as intentionally not awaited — it does
**not** attach a rejection handler. Two real gaps found by inspection:

- `fma/src/audio/sources/SpotifyPlayer.ts:80` — `void getValidToken().then((t)
  => { if (t) cb(t); });`. If `getValidToken()` rejects, this is an unhandled
  rejection reaching the Spotify SDK's synchronous callback context; `void`
  does nothing for it. No `.catch`.
- `grimoire-vscode/src/extension.ts:507` — `void rebuildWatchers();` at
  activation. `rebuildWatchers` (`extension.ts:481-505`) has no internal
  try/catch, unlike its two activation-time siblings `checkForUpdates`
  (`extension.ts:602-641`, full try/catch, logs via `output.appendLine`) and
  `publishUpdateCount` (`extension.ts:571-599`, same). `scopes.run()`
  (`scopes.ts:562`) itself never rejects (`readConfig()` at its top is the
  only possible synchronous throw), so the practical risk is narrow, but it's
  a real inconsistency against a pattern the same file otherwise applies
  twice right next to it.

**`no-misused-promises`-shaped bugs** (async handler where a void-returning
callback is expected): `grep -n "on[A-Z][a-zA-Z]*={async" $(cat
files.txt)` and `grep -n "addEventListener([^)]*async" $(cat files.txt)`:

- `fma/src/library/LibraryPage.tsx:91` — `<button onClick={async () => {
  await graphRepo.remove(r.id); await refresh(); }}>delete</button>`. No
  try/catch; a failed `graphRepo.remove` (IndexedDB error) is an unhandled
  rejection with **zero user feedback** on a destructive action. Same file's
  own `void (async () => {...})()` IIFE convention (`LibraryPage.tsx:31`,
  also in `SpotifyPanel.tsx:19`, `PlayerPage.tsx:58`) shows the fleet knows
  the marker pattern; it just wasn't applied here, and even the marker
  wouldn't have added error handling.
- `ocx-catalog/src/theme/components/detail/ReadmePane.vue:126` —
  `addEventListener('click', async () => { await clipboardCopy(...); ... })`
  — no try/catch; a denied clipboard permission silently drops the "Copied"
  toast with an unhandled rejection in the console.

**`.map(async ...)` is used correctly everywhere found** — both instances
(`grimoire-vscode/src/detailsCache.ts:190,235`) are wrapped in `await
Promise.all(...)` with per-item `.catch()` inside, and
`ocx-catalog/src/sources/walker.ts:528-540` pushes `.then()`-wrapped
promises into a `tasks` array drained by a final `await Promise.all(tasks)`
— rejections propagate correctly, not floating. 0 instances of
`.forEach(async` or `setTimeout(async`/`setInterval(async` fleet-wide.

**One genuine floating `.then()` with no `.catch`:**
`ocx-catalog/src/theme/components/detail/CopyButton` in
`grimoire-indexer/src/renderer/astro/components/Catalog.tsx:242` —
`navigator.clipboard.writeText(command).then(() => { setCopied(true); ...
})` inside a plain (non-async) `onClick` handler — a denied/failed clipboard
write is an unhandled rejection with no UI feedback.

## 2. Unhandled rejection / top-level error handling

**Zero process-level `unhandledRejection`/`uncaughtException` handlers exist
anywhere in production code** (`grep -n "unhandledRejection\|uncaughtException"
$(cat files.txt)` — the only 2 hits are in
`grimoire-vscode/src/test/rating.test.ts:277,290`, a test harness listener
unrelated to the extension itself). Per-entry-point behavior:

| Entry point | Top-level guard | What an unhandled rejection actually does |
|---|---|---|
| `ocx-catalog` CLI (`src/cli/index.ts`) | `try { await main() } catch (err) { console.error(err); process.exitCode = FAIL }` | Caught, formatted, `exitCode=1` set (not `process.exit`, so buffered stdout isn't truncated) |
| `grimoire-indexer` CLI (`src/cli/index.ts` → `run()`) | No try/catch in `index.ts`, but `run()` (`src/cli/main.ts:236-238`) wraps `program.parseAsync` in try/catch and `classify()`s every error into an exit code — `run()` is designed to never reject | Same effective outcome as ocx-catalog, by internal discipline rather than a wrapper |
| `setup-ocx` main (`src/setup.ts`) | `run()` fully try/catch'd, `catch { core.setFailed(...) }`, then `void run();` | Never rejects; `core.setFailed` marks the Action step failed correctly |
| `setup-ocx` post (`src/save-cache.ts:50`) | `run().catch(reportPostFailure);` | Caught explicitly |
| `grimoire-vscode` / `vscode-ocx` extensions (`activate()`) | Synchronous `activate()`, async work fire-and-forget via `void x()` | On Node ≥15 default settings, an uncaught rejection in the extension host crashes that process — VS Code shows "the extension host terminated unexpectedly" and restarts it, killing every extension's state for that window until restart. Most of grimoire-vscode's `void`-called functions self-catch (see §1); `rebuildWatchers` is the one exception. |
| `fma` SPA (`src/main.tsx`) | None | No React `ErrorBoundary` anywhere (`grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" fma/src` — 0 hits). An uncaught render error white-screens the app with no fallback UI. |
| `creeptd-ng/web` SPA (`src/main.ts`) | None | No `app.config.errorHandler` set (`grep -rn "errorHandler" creeptd-ng/web/src` — 0 hits). Vue's default is to log to console and keep running for most errors, but there is no app-level reporting/fallback. |

Both browser SPAs (`fma`, `creeptd-ng/web`) have **no app-level error
boundary or global handler of any kind** — this is the fleet's biggest gap in
this category, precisely because it's invisible until a real user hits it.

## 3. Cancellation and timeouts

**First-party `fetch()` call sites: 14** (test/e2e helpers and generated
wasm/vendor bundles excluded — see `scope`). **Only 1 carries a timeout or
`AbortSignal`:**

- `grimoire-indexer/src/validate/adapters/http.ts:96` —
  `signal: AbortSignal.timeout(TIMEOUT_MS)`. ✅ the one exemplar.

Unbounded (no `AbortSignal`, no `timeout`), file:line:
- `grimoire-vscode/src/installer.ts:228` — `download()`, used for both the
  grim binary and the version-manifest fetch; a stalled connection hangs the
  "Install grim" flow indefinitely. (Content is sha256-verified after
  download — `installer.ts:293,297` — so a followed redirect can't smuggle
  an unverified binary, only hang the request.)
- `ocx-catalog/src/theme/composables/useImageIndex.ts:82`
- `ocx-catalog/src/theme/composables/usePackageRoot.ts:138,141`
- `ocx-catalog/src/theme/composables/useCatalog.ts:86`
- `ocx-catalog/src/theme/components/detail/ReadmePane.vue:51`
- `fma/src/audio/sources/SpotifyAuth.ts:90,129`
- `fma/src/audio/sources/SpotifyPlayer.ts:99,109`
- `creeptd-ng/web/src/stores/useAuthStore.ts:115,145`
- `grimoire-indexer/scripts/dev.mjs:138` (dev-only script, low stakes)

**Connect-RPC transports carry no client-side timeout.**
`createConnectTransport({...})` in both `creeptd-ng/web/src/api
/leaderboardClient.ts:16` and `.../lobbyClient.ts:36` omits `defaultTimeoutMs`
— every RPC call through these singletons relies on the server/browser
default, not a call-scoped bound. (`leaderboardClient.ts:16` also falls back
to `http://localhost:8080` when `VITE_API_BASE_URL` is unset — a dev-only
default, flagged under §5 for completeness.)

**`@actions/exec`'s `exec.exec()` (setup-ocx) has no timeout option in its
public API at all** (`setup-ocx/src/project.ts:136,144`,
`setup-ocx/src/managed-config.ts:59`) — unlike Node's own `execFile`, the
`@actions/exec` `ExecOptions` interface doesn't expose a per-call timeout, so
`ocx pull` / `ocx env` / `ocx config setup` can only be bounded by the
workflow's job-level `timeout-minutes`, not by the action itself.

**By contrast, every child-process wrapper built on raw `execFile` sets an
explicit timeout** — see §4/§5, this is a real fleet strength, just not
extended to `fetch`/`@actions/exec`.

No unbounded polling loops or missing `CancellationToken` plumbing were
found in the VS Code extensions; both extensions' long-lived work
(`Watchers`, `CheckScheduler`, `Prefetcher`) is registered as a `Disposable`
under `context.subscriptions` (§4) rather than modeled as a token-cancelled
loop, which is the idiomatic alternative for that shape of background work.

## 4. Resource cleanup

**Child processes — every site uses `execFile`/`spawn` with an argv array,
never a shell string** (`grep -n "execFile(\|execFileSync(\|execFileAsync(\|
spawn(" $(cat files.txt)`, manually filtered for `RegExp.exec` false
positives):

| Site | Timeout | Exit code checked | stderr captured |
|---|---|---|---|
| `grimoire-vscode/src/grim.ts:597-628` (`runJson`, the extension's core CLI bridge) | ✅ `timeout: options.timeoutMs ?? 120_000` | ✅ via `child.exitCode` | ✅, plus documented handling of the stdin-EPIPE race (nodejs/node#40085) at `grim.ts:619-624` | 
| `grimoire-indexer/src/enrich/index.ts:64-70` (`spawnGrim`) | ✅ `timeout: TIMEOUT_MS` | ✅ (promisified `execFile` rejects on non-zero exit) | via rejection |
| `vscode-ocx/src/ocx.ts:105,141,207` (`execFileAsync`) | — not shown to set timeout in the reviewed calls | ✅ (promisified rejects) | ✅ `stdout`/`stderr` both destructured |
| `ocx-catalog/src/sources/git.ts:29` (custom callback wrapper, deliberately not `promisify`'d — comment explains why, for mock-ability) | not observed | ✅ error path | ✅ attaches stderr itself |
| `grimoire-vscode/src/installer.ts:242-251` (`extract()`, tar) | ❌ **no timeout** — the one gap in an otherwise-disciplined set; sibling `runJson` in the same repo sets one | ✅ (`error` set on non-zero exit) | ✅ |
| `setup-ocx/src/project.ts:136,144`, `managed-config.ts:59` (`@actions/exec`) | ❌ not supported by the API (§3) | ✅ (`exec.exec` rejects/returns non-zero by default unless `ignoreReturnCode`) | not captured to a variable (goes to the step log by default) |

**Timers**: `setInterval`/`clearInterval` — 8 files use `setInterval`
fleet-wide (`grep -c "setInterval(" $(cat files.txt) | grep -v ':0'`). All
resolved on inspection:
- `grimoire-vscode/src/extension.ts:653` — the update-check timer is wrapped
  as `context.subscriptions.push({ dispose: () => clearInterval(updateTimer)
  })` — a raw timer folded into VS Code's disposable lifecycle. Good pattern,
  see §"Patterns worth encoding".
- `grimoire-vscode/src/webview/sidebar/main.ts:901` — a footer-clock
  `setInterval` with **no matching `clearInterval`**, but the comment at
  `main.ts:899` states this is deliberate: "Lives for the webview's whole
  process lifetime, so it's never cleared" — correct, since VS Code tears
  down the entire webview JS context on dispose. Not a leak; flagged only
  because the audit asked to check every timer.
- `fma/src/player/TransportBar.tsx`, `creeptd-ng/web/src/composables
  /useLobbyWsClient.ts`, `creeptd-ng/web/src/stores/useLobbyStore.ts` — all
  have matching `clearInterval` in the same file.

**VS Code `Disposable`s**: `grimoire-vscode/src/extension.ts` has 9
`context.subscriptions.push(...)` call sites covering all 23
`registerCommand`/`onDidChange*` registrations — several pushes take
multiple disposables per call (e.g. `extension.ts:655-674` registers 2
workspace listeners in one push, `extension.ts:678+` registers a run of
commands in one push), so the site-count mismatch is not a leak. Same
pattern in `vscode-ocx/src/extension.ts` (3 push sites, batched).

**File handles**: no raw `fs.open`/stream usage found needing manual close;
all file I/O goes through `fs/promises` one-shot calls
(`readFile`/`writeFile`/`rm`). `grimoire-vscode/src/detailsCache.ts` is the
one place doing multi-step file lifecycle (write-then-rename cache) and it's
handled well — see §"Patterns worth encoding".

## 5. Security-sensitive paths

**Command execution — 0 shell-interpolated `exec`/`execSync` calls found
across all 8 repos.** Every call site (table in §4) uses `execFile`/`spawn`
with an argv array; `ocx-catalog/src/sources/git.ts:6-12` even has a
comment stating the argv-array rule as a deliberate policy. This is a real,
verified "0 findings" result, not an absence of looking — see method.

**Path handling / archive extraction**: the only archive extraction in the
fleet is `grimoire-vscode/src/installer.ts:242` (`tar -xf archive -C
destDir` via system tar, no `--strip-components`, no explicit
zip-slip guard). Risk is low in practice: `archive` is always the
sha256-checksum-verified official grim release tarball
(`installer.ts:293-297` verifies before extraction), so a hostile archive
would first have to defeat the checksum. Still worth a containment check if
the checksum source (`RELEASE_BASE`/manifest fetch) is ever compromised —
belt-and-suspenders, not urgent. `path.join` appears 592 times fleet-wide;
spot checks on the wire-data-adjacent ones (`ocx-catalog/src/sources
/walker.ts`, `grimoire-indexer/src/validate/adapters/files.ts`) show
explicit containment checks (`realpath` + prefix comparison in
`files.ts:38,69`) — not exhaustively re-verified across all 592 sites.

**Deserialization**: `JSON.parse` appears 119 times; none of the ones
inspected skip validation — the fleet's dominant idiom is `JSON.parse` into
a schema-checked/`zod`-or-hand-validated shape immediately after (not
individually re-verified for all 119). **YAML**: `js-yaml`'s `yaml.load` is
used **only in test files** (`grimoire-indexer/test/cli/ci.test.ts` and
siblings, parsing the repo's *own* generated CI YAML for assertions) — 0
production YAML-parsing-of-untrusted-input found. **Prototype pollution**:
the fleet is unusually well-defended here — see §"Patterns worth encoding"
for `ocx-catalog/src/sources/types.ts:374-383` and `grimoire-indexer/src
/validate/core/metadata.ts:44`'s `FORBIDDEN_KEYS`. 0 hand-rolled recursive
deep-merge helpers found (`grep -ln "function deepMerge\|function merge("` —
0 hits).

**DOM sinks**: `dangerouslySetInnerHTML` — 0 hits anywhere (including
`fma`, the React app). `document.write` — 0 hits. `.innerHTML =` — 0 hits in
any in-scope, non-archived, non-generated file (the only hits are test
`document.body.innerHTML = ""` teardown calls, and
`kate-middlechild/archive/v0-prototype/js/app.js`, which `biome.json`
explicitly excludes via `"!archive"` — dead code, not built or served).
`v-html` — **exactly one call site fleet-wide**,
`ocx-catalog/src/theme/components/detail/ReadmePane.vue:155`, and it is
defense-in-depth by design: markdown-it renders with `html:false` (raw HTML
escaped before it ever reaches the sanitizer), then
`ocx-catalog/src/theme/utils/sanitize.ts` runs a real DOMPurify instance
(`createDOMPurify(window)`, lazily instantiated, isolated from any shared
default singleton) before the string reaches `v-html`, with an inline
`eslint-disable-next-line vue/no-v-html` comment justifying the single
exception. This is the strongest pattern in the whole audit.

**Secrets**: `setup-ocx/src/setup.ts:19` reads `core.getInput("github-token")`
(default `${{ github.token }}`) and threads it into `Authorization: Bearer
<token>` headers in `version.ts:51` and `download.ts:103` — **but never
calls `core.setSecret(token)`.** The built-in `GITHUB_TOKEN` is auto-masked
by the runner, so the default case is safe; but `github-token` is a
documented, overridable input (`action.yml:12-15`) — a workflow author who
passes a custom PAT here gets no masking from this action if that token ever
reaches a log line (debug output, a future error-message change, etc.).
One-line fix: `core.setSecret(token)` right after the `getInput` call.
0 other `process.env.<TOKEN|SECRET|PASSWORD|API_KEY>` reads found reaching a
log/error path.

**Network**: `rejectUnauthorized: false` / `NODE_TLS_REJECT_UNAUTHORIZED` —
0 hits fleet-wide. Non-test `http://` (not `localhost`) — 1 hit,
`grimoire-indexer/src/renderer/index.ts:468`, a **local dev-server preview
URL logged to the console** (`http://${host}:${port}`), correct as-is. Every
other `http://` occurrence is either a test fixture or, notably,
`ocx-catalog` actively **tests for and warns about** `http://` package
sources: `grimoire-vscode/src/webview/settings/render.ts:531` renders a
user-facing warning ("downgrades transport for everyone who clones the
project") and `ocx-catalog/test/sources/walker.test.ts:470` /
`grimoire-indexer/test/validate/registry.test.ts:43` exercise a redirect to
the AWS/GCP metadata IP (`169.254.169.254`) to confirm SSRF-via-redirect is
handled. Redirects: `installer.ts:228` follows redirects
(`redirect:'follow'`) with no host re-check, mitigated by the post-download
checksum (§ path handling above).

**Randomness**: `crypto.getRandomValues` — 1 use, correctly for a
security-relevant value: `fma/src/audio/sources/SpotifyAuth.ts:48`
(`randomString`, PKCE code-verifier generation for the OAuth flow). No
`crypto.randomUUID()` used anywhere in the fleet. `Math.random()` — 9
production+test uses; the two worth a note are id generators, not
security-relevant: `fma/src/editor/Palette.tsx:7` and
`fma/src/graph/builtinShaders.ts:6` — `Math.random().toString(36).slice(2,
8)` for local graph-node IDs in a client-only editor (no auth/session
boundary depends on these; a `crypto.randomUUID()` swap would only improve
collision odds, not security). `ocx-catalog/src/sources/walker.ts:170` uses
`Math.random()` correctly, for retry-backoff jitter.

## 6. Observability

**No repo uses a structured logger** (pino, winston, etc.) — 0 hits for any
such import fleet-wide. The fleet instead splits cleanly by runtime:

| Repo(s) | Logging idiom | console.* count (non-test) |
|---|---|---|
| `grimoire-vscode`, `vscode-ocx` | `vscode.OutputChannel.appendLine` exclusively — 0 `console.*` calls in either extension's `src/` | 0 |
| `setup-ocx` | `@actions/core.info/warning/setFailed` exclusively | 0 |
| `fma` | **nothing** — 0 `console.*` calls anywhere in `src/` | 0 |
| `ocx-catalog` | `console.*`, CLI-appropriate | 10 |
| `grimoire-indexer` | `console.*`, CLI-appropriate; 34 in `src/cli`, 7 in `src/enrich` | 50 |
| `creeptd-ng/web` | `console.*`; the real (non-e2e, non-generated) count is 10 in `src/`, mostly `console.warn` on `switch` exhaustiveness fallbacks (a genuinely good defensive idiom — see §"Patterns worth encoding") | 10 (139 raw, but 110 of those are e2e Playwright scripts under `web/e2e`, not runtime code) |
| `kate-middlechild` | mixed `console.*` | 21 |

`fma` having **zero** logging anywhere is its own finding: errors are
swallowed straight into UI state as strings (see next paragraph) with no
console trace at all — a bug that reproduces only intermittently is
undebuggable from a user's report since nothing was ever logged.

**Message-only `catch` (discards the stack)**: `grep -n "console\.error(.*\.
message)" $(cat files.txt)` plus a `String(err)` sweep (44 hits). The
highest-stakes instance is the catch-all branch of `grimoire-indexer`'s CLI
error classifier: `grimoire-indexer/src/cli/main.ts:89` —
`console.error(err instanceof Error ? err.message : String(err)); return
EXIT.failure;`. This is the branch for **unexpected** errors (everything
that isn't a known `CliError`/`CommanderError`/named validation error, which
are handled deliberately at `main.ts:73` and `main.ts:82-85` with `.message`
being the *correct* choice for user-facing validation text) — so this one
line is where a real bug in the tool would have its stack trace thrown away,
making a bug report un-debuggable from the CLI's own output.
`fma/src/player/PlayerPage.tsx:143` — `.catch((e) => setError(String(e)))`
is the same pattern in the browser: `String(e)` on an `Error` yields just
`"Error: message"`, no stack, ever, anywhere in that app (compounds with the
zero-console-logging finding above).

## 7. Time, locale, encoding

**`toLocaleString()`/`toLocaleDateString()` with no explicit locale — 1
hit**: `fma/src/library/LibraryPage.tsx:87` —
`{new Date(r.updatedAt).toLocaleString()}`. Non-deterministic display across
machines/OS locale; low severity since it's a single-user local-storage
list, but it is the literal pattern the checklist asks about, and it's the
*only* one — every other `.toLocale*` call in the fleet passes an explicit
locale.

**`localeCompare()` without an explicit locale is common and mostly
cosmetic** (`grimoire-vscode/src/webview/model.ts:984,1095` — sidebar/tree
label ordering; `ocx-catalog/src/theme/components/catalog/CatalogPage.vue
:219,297,313` and `PlatformMatrix.vue:42,54` — catalog display ordering;
`grimoire-indexer/src/renderer/astro/lib/catalog.ts:75` and
`Catalog.tsx:615` — published static-site ordering). These can differ
between a CI runner's locale and a maintainer's laptop, which for
`grimoire-indexer`'s renderer means a rebuild on a different machine could
reorder generated HTML with no content change — an annoyance for diff
review, not a security issue.

**One instance is a real correctness risk, not cosmetic**:
`ocx-catalog/src/theme/utils/version.ts:167,188,196` — `compareVersions()`'s
own docstring says "Mirrors the Rust `Ord` impl for `Version`" (a byte-wise,
locale-independent comparison by construction in Rust), but the JS port
compares `variant`/`prerelease`/`build` strings with bare `a.localeCompare
(b)` — locale-sensitive Unicode collation, not byte-ordinal comparison. For
most ASCII version/prerelease strings the two agree, but they are not
guaranteed to, and the function's own contract (parity with a specific Rust
`Ord`) is exactly the kind of invariant that locale-based collation can
silently violate on punctuation-heavy prerelease tags. Since this feeds
"latest version" ordering on the published catalog, a divergence would be a
silent wrong-latest-version bug, not a crash. Fix is mechanical: `a < b ? -1
: a > b ? 1 : 0` (or `.localeCompare(b, 'en')` at minimum) restores
byte-order-equivalent, machine-independent comparison.

**Clock choice is correct everywhere checked**: `fma/src/graph/runner.ts:38`
and `fma/src/render/Renderer.ts:36` use `performance.now()` for
render-loop elapsed time (correct — monotonic, immune to NTP/DST jumps);
`grimoire-indexer/src/renderer/astro/lib/catalog.ts:96` uses `Date.now()`
for a `timeAgo()` relative-time display (correct — that's inherently a
wall-clock/calendar computation, not a duration measurement). No instance
found of `Date.now()` misused for a duration/elapsed measurement.

**Encoding**: no `Buffer.from(x)` found with a bare single argument
outside test helpers; the one production hit
(`grimoire-indexer/src/validate/adapters/registry.ts:79`) chains
`.toString("base64")` immediately, encoding always explicit. Bare `.sort()`
(41 hits) is **not** flagged as a determinism risk — `Array.prototype.sort`'s
default comparator is UTF-16 code-unit comparison, which is deterministic
across machines (just not "natural"/human-friendly ordering); the real
determinism risk is locale-default `localeCompare()`, covered above.

## Ranked smells

1. **Neither browser SPA has an app-level error boundary or global error
   handler** (`fma/src/main.tsx`, `creeptd-ng/web/src/main.ts`) — blast
   radius: any uncaught render error or promise rejection reaches the user
   as a silent white-screen or console-only failure with zero recovery UI.
   Check: `grep -rn "ErrorBoundary\|componentDidCatch" fma/src` /
   `grep -rn "errorHandler" creeptd-ng/web/src` (both 0 hits).
2. **`compareVersions()`'s locale-collation comparison contradicts its own
   documented "mirrors Rust `Ord`" contract** — `ocx-catalog/src/theme/utils
   /version.ts:167,188,196` — silent wrong-"latest"-version risk on the
   published catalog. Check: `grep -n "localeCompare" ocx-catalog/src/theme
   /utils/version.ts`.
3. **`creeptd-ng/web`'s lint config doesn't exist in the tree that runs
   `npm run lint`** — the script (`package.json:14`) references a config
   that only lives in an excluded worktree; lint is effectively dead here.
   Check: `find creeptd-ng/web -iname "eslint.config.*"` — 0 hits outside
   `.worktrees`.
4. **`fma` has zero logging anywhere, and its one catch swallows the stack
   via `String(e)`** (`PlayerPage.tsx:143`) — a production bug in this app
   leaves literally no trace to debug from. Check: `grep -rn "console\." fma
   /src` — 0 hits.
5. **`setup-ocx` never calls `core.setSecret()` on the (overridable)
   `github-token` input** before threading it into `Authorization: Bearer`
   headers — `setup-ocx/src/setup.ts:19`, `version.ts:51`, `download.ts:103`.
   One-line fix. Check: `grep -n "setSecret" setup-ocx/src/*.ts` — 0 hits.
6. **13 of 14 first-party `fetch()` call sites carry no timeout/AbortSignal**
   (§3 table) — the one repo that got this right
   (`grimoire-indexer/src/validate/adapters/http.ts:96`) shows the fix is
   one line; it just wasn't propagated. Check: `grep -c "AbortSignal" $(cat
   files.txt)` vs `grep -c "fetch(" $(cat files.txt)`.
7. **`grimoire-vscode/src/installer.ts:242` `extract()` has no timeout**,
   unlike its sibling `runJson()` in the same repo (`grim.ts:604`,
   `timeout: 120_000`) — inconsistent application of a pattern the repo
   otherwise applies correctly. Check: `grep -n "timeout" grimoire-vscode
   /src/installer.ts grimoire-vscode/src/grim.ts`.
8. **`grimoire-vscode/src/extension.ts:507 rebuildWatchers()`** is called
   fire-and-forget (`void rebuildWatchers()`) without the internal try/catch
   its two activation-time siblings (`checkForUpdates`, `publishUpdateCount`)
   both have — narrow practical risk (`scopes.run()` doesn't reject in
   practice) but a real inconsistency. Check: `grep -n "try {" -A2
   grimoire-vscode/src/extension.ts | grep -B2 "rebuildWatchers\|
   checkForUpdates\|publishUpdateCount"`.

## Patterns worth encoding

1. **Argv-array child processes with a real timeout, exit-code check, and
   documented edge-case handling** —
   `grimoire-vscode/src/grim.ts:597-628` (`runJson`): `execFile` with
   `shell:false`, `timeout: options.timeoutMs ?? 120_000`, `maxBuffer`
   capped, ENOENT distinguished from a real failure, and a `child.stdin.on
   ('error', () => {})` guard with an inline citation of nodejs/node#40085
   for the EPIPE race. This is the shape every child-process wrapper in a
   rule set should be judged against.
2. **DOMPurify as a single, well-reasoned chokepoint for the fleet's one DOM
   sink** — `ocx-catalog/src/theme/utils/sanitize.ts` (isolated
   `createDOMPurify(window)` instance, lazy-built to survive SSR, layered
   under `markdown-it`'s `html:false`) feeding `ocx-catalog/src/theme
   /components/detail/ReadmePane.vue:155`'s single `v-html`, with the
   security rationale written into the module header rather than left
   implicit.
3. **`Object.create(null)` for a record keyed by remote/wire data** —
   `ocx-catalog/src/sources/types.ts:374-383` — explicitly dated
   ("Security panel (2026-08-22, S2)") comment explaining that a plain
   object literal would let a `"__proto__"` tag name silently swap the
   prototype instead of adding a key. `grimoire-indexer/src/validate/core
   /metadata.ts:44`'s `FORBIDDEN_KEYS = new Set(["__proto__", "constructor",
   "prototype"])` is the same threat model solved a second, independent way.
4. **`vscode.OutputChannel` instead of `console.*`, with zero exceptions** —
   both `grimoire-vscode` and `vscode-ocx` route every log line through
   `output.appendLine` (28 and 10 call sites respectively) and have 0
   `console.*` calls in extension source — the correct choice for a runtime
   where `console.log` is invisible to the user by default.
5. **A coalescing async drain loop that logs-and-continues per round instead
   of rejecting the whole queue** — `grimoire-vscode/src/extension.ts
   :185-210` (`refreshAll`): queued refresh requests merge into one
   in-flight `Promise.resolve().then(async () => { while (queued) { try {
   await runRefresh(next) } catch { output.appendLine(...) } } })`, with a
   comment explaining exactly why a per-round try/catch replaced an earlier
   design that let one bad round poison every caller queued behind it. This
   is what makes the file's many `void refreshAll()` call sites actually
   safe, not just marked-ignored.
6. **Correct clock per use case, cited side by side**: `performance.now()`
   for render-loop elapsed time (`fma/src/render/Renderer.ts:36`,
   `fma/src/graph/runner.ts:38`) vs `Date.now()` for wall-clock
   relative-time display (`grimoire-indexer/src/renderer/astro/lib
   /catalog.ts:96`, `timeAgo()`) — the fleet picks the right one every time
   this was checked, worth encoding as the two-line rule "duration →
   `performance.now()`, calendar delta → `Date.now()`".

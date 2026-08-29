---
title: "TypeScript in a VS Code Extension Host"
topic: ts-extension-host
model: claude-opus-5
consolidates:
  - ts-extension-host/host-failure-modes.md
  - ts-extension-host/webview-boundary.md
  - ts-extension-host/faking-vscode.md
  - ts-extension-host/extension-host-bundling.md
  - ts-extension-host/typed-doubles-non-vitest.md
date: 2026-08-29
revised: 2026-08-29
---

## Verdict

The extension host is a **shared Node process that never dies from your JavaScript**, and
every rule here follows from taking that literally rather than from server-Node reflexes.

1. **The crash story the fleet's own audit tells is false.** `typescript-audit/runtime-posture.md`
   line 126 asserts that an uncaught rejection in the extension host crashes the process and
   restarts every extension. VS Code's own `extensionHostProcess.ts` installs
   `process.on('unhandledRejection'|'uncaughtException')` before any extension code runs and
   routes the error to `onUnexpectedError` instead ([host-failure-modes §2]). **We resolve in
   favour of the source read**: the audit is wrong. The rules that depended on that rationale
   survive, but on a different one — a floating rejection surfaces one second later as a
   context-poor report with the real call site already lost. Getting this right matters because
   an agent that checks a false rationale deletes the rule with it.
2. **Therefore: no Node process-level machinery in extension code, ever.** `process.exit()` and
   `process.crash()` are intercepted and downgraded to `console.warn`; an agent-added global
   rejection handler is redundant with the one already installed.
3. **`activate()` ordering is a real correctness constraint, not style.** VS Code only wires up
   `dispose(context.subscriptions)` on `activate()`'s success path — a mid-body throw leaks every
   registration already pushed, for the life of the window.
4. **`"limited"` grants nothing.** `restrictedConfigurations` protects exactly the setting keys it
   names, and nothing else. Every other trust-sensitive path is the author's. Both fleet
   extensions ship Command-Palette-reachable commands that materialize workspace-declared
   artifacts with no trust gate. This is the topic's highest-severity finding.
5. **A message crossing the webview boundary is validated on receipt, full stop.** A shared `.ts`
   union is erased before anything runs; VS Code's own tutorial validates nothing and is the shape
   an agent reproduces.
6. **`as unknown as T` is not the defect; unbounded `as unknown as T` is — and most of the fleet's
   casts are not fakes at all.** *(Revised.)* Measured per site, 26 of `extension.test.ts`'s 46
   casts are monkeypatches of a real, live `vscode.window`/`commands`/`authentication` singleton,
   narrowed only so a method can be reassigned; `sinon.stub(obj, 'method')` type-checks those with
   **zero** assertion ([typed-doubles §7]). Of the rest, the structural fakes of constructor-less
   interfaces need no call-site cast either once `@golevelup/ts-sinon`'s `createMock<T>()` is
   present ([typed-doubles §6]). The "one named declaration per faked interface" rule
   (TS-HOST-14) is now the *fallback* for repos without that dependency, not the target state.
7. **We overturn `code-shape.md`'s own proposed fix, and the follow-up round confirms it.** That
   audit recommended isolating the double-cast behind `fake<T>(partial: Partial<T>): T`.
   `faking-vscode §4a` proved by compiler run that this helper gives *zero* compile-time
   protection. `typed-doubles §6` independently reaches the same place from the other side: do not
   write a repo-local helper, because a maintained one already exists whose parameter type
   (`PartialFuncReturn<T>`, a real `DeepPartial`) *does* check what you passed. The ban is on the
   naive generic, not on `createMock<T>` — see TS-HOST-16.
8. **Export-count/cohesion is deferred out of `TS-HOST`.** It is a judgment flag with no linter
   behind it and it is not extension-host-specific — it belongs to `TS-MOD` or nowhere.
9. **`satisfies Partial<T>` cannot express the fleet's actual fakes — the original rule overclaimed.**
   *(New, contradicts the pre-revision TS-HOST-15.)* `Partial<T>` makes only the *top-level* key
   optional; the moment a fake provides `webview: { postMessage }`, TypeScript demands the full
   nested `Webview` and raises **TS2739**. Verified against the exact shape `fakePanel()` already
   writes ([typed-doubles §4]). Every nested fake in the fleet is in this class, so the advice
   "annotate `satisfies Partial<RealType>` before the cast" was not merely weak, it does not
   compile. TS-HOST-15 is rewritten accordingly.
10. **The bundling gap is closed, and one prior lean is reversed.** esbuild ignores tsconfig
    `module`/`moduleResolution` entirely for emission — the shipped `dist/extension.js` is CJS
    because `esbuild.js` says so ([bundling §1]). Of the ESM constructs `tsc` would happily
    type-check, **exactly one is a silent runtime failure**: `import.meta`, which esbuild turns
    into `{}` under a *warning* that both repos' `logLevel: 'silent'` + errors-only problem-matcher
    swallow end to end ([bundling §4]). Top-level `await` is a hard build error ([bundling §2]);
    dynamic `import()` of an external package survives untouched; a *static* import of the same
    package becomes `require()` and is Node-version-gated ([bundling §3, §6]). The decisive
    finding: `module: Node16` makes `tsc --noEmit` reject both `import.meta` (TS1470) and
    top-level await (TS1309) before esbuild runs, and `ESNext`/`Bundler` catches neither —
    measured. **This reverses `ts-modules.md`'s open-question lean toward `Bundler`**
    ([bundling §9]); both extensions standardize on `Node16`/`Node16` (TS-HOST-18).
11. **`--packages=external` would ship a broken `.vsix`, and this is settled by packaging, not
    taste.** Both `.vscodeignore`s exclude `node_modules/**` and both `package` scripts run
    `vsce package --no-dependencies`, so anything marked `external` other than the host-injected
    `vscode` (and `mocha` in the test bundle) is simply absent at runtime — `Cannot find module`
    on activation, invisible to `check`, `build`, and `test` ([bundling §8]). TS-HOST-20.
12. **The Mocha/Electron test-double question is settled — and it collides with `TS-TOOL-10`.**
    `TS-TOOL-10` tells an agent to write "a repo-local `fake<T>()`" in the Mocha/Electron repos.
    `typed-doubles §5-§7` surveyed the field against the measured cast population and lands on
    `sinon` + `@types/sinon` + `@golevelup/ts-sinon` as devDependencies, with **no repo-local
    helper at all** — net 46 casts → 1 in `extension.test.ts`, 5 → 0 in `vscode-ocx`. Where the
    two families disagree, `TS-HOST-24`/`25` are the later and better-measured answer for these
    two repos; `TS-TOOL-10`'s Mocha branch needs amending by whoever owns that document. Flagged,
    not silently averaged.

**Documented gaps** (findings, not open questions):

- **`@golevelup/ts-sinon`'s auto-vivification is this program's own empirical finding**, read from
  the published `lib/mocks.js` Proxy `get` trap and confirmed by running the output: an *unfaked
  non-function* member such as `panel.title` comes back as a callable `sinon.stub()` masquerading
  as the property, not `undefined` ([typed-doubles §6]). It is not a documented upstream caveat
  and the package's current README could not be located. TS-HOST-26 exists because of this.
- **33 of `grimoire-vscode`'s 79 casts were never individually characterized.** The 46/79 split
  was measured only for `extension.test.ts`; the other 12 test files got the same two-category
  triage in principle and no per-site read in fact. Do not assume the ratio generalizes.
- **`testdouble.js`'s module-replacement mechanics against the virtual `vscode` module are
  unresolved.** Its docs pages 404'd; the question was dropped once a 2024-03-21 last-push settled
  the adoption question anyway. `TS-TOOL-16`'s never-add list bans `ts-mockito` but not
  `testdouble` — that list should gain it.
- **The `no-restricted-syntax` double-cast selector (TS-HOST-14's verify) is still unrun.** The
  follow-up round did not exercise it; the mechanism and the AST shape are each verified, their
  composition is this program's construction. Run it against both repos before it gates CI.

## The ruleset

**Family: `TS-HOST`** — this topic owns it outright, including the webview seam (the topic map
assigns "the webview boundary" to `TS-HOST`; `TS-WEB` is the browser-SPA family and is not
touched here). Rules apply to `grimoire-vscode` and `vscode-ocx`; `TS-HOST-13`–`16` are written
interface-agnostically because the same shape appears 57 more times in `ocx-catalog`.

### Trust

**TS-HOST-01 — MUST.** Gate every command handler that spawns a process, resolves a module, or
reads a file using workspace-derived data (a resolved manifest path, a `cwd` inside the
workspace, file content) on `vscode.workspace.isTrusted`, or hide it with an
`isWorkspaceTrusted` `when` clause — even when the executable path itself is listed in
`restrictedConfigurations`.
*Rationale*: `"limited"` grants zero automatic gating beyond substituting user-level values for
the exact keys listed; protecting the binary's path does not protect what the workspace tells that
binary to do.
*Verify*: `grep -n 'registerCommand(' src/` → for each handler, trace forward to any
`execFile`/`spawn`/`fs.*`/`require`/`import()`; confirm the *handler itself* (not a sibling
automatic path) contains the check. Cross-check `grep -n 'isWorkspaceTrusted' package.json` is
non-empty if any command needs hiding.

### Activation lifecycle

**TS-HOST-02 — MUST.** Order `activate()` so every step that can throw (`JSON.parse`, config
validation, path resolution) runs *before* the first `context.subscriptions.push(...)`; otherwise
catch it and dispose what was already pushed before rethrowing.
*Rationale*: `ActivatedExtension`'s disposal wrapper — the only caller of
`dispose(context.subscriptions)` — is constructed exclusively on the success path
([host-failure-modes §4]); a mid-body throw leaves earlier registrations live and un-disposable
until the host restarts.
*Verify*: read `activate()` top-to-bottom; find the first `context.subscriptions.push`; everything
after it must be a provably non-throwing registration call or itself wrapped.

**TS-HOST-03 — SHOULD.** Return from `activate()` without awaiting slow initialization (a spawn, a
fetch, a filesystem scan); start that work as an already-`.catch`-guarded fire-and-forget call.
*Rationale*: VS Code waits on the returned promise before considering the extension activated;
a stalled chain leaves the extension "Activating…" with no timeout the author controls.
*Verify*: read `activate()`'s literal `return`; flag any `await` on a spawn/fetch/fs call.

**TS-HOST-04 — MUST.** Every promise started in `activate()` or in a registered callback that is
not returned or awaited must terminate its own chain in `.catch(...)`. `void f()` marks intent; it
attaches nothing.
*Rationale*: it will not crash the host, but after a 1-second grace it is reported through
`onUnexpectedError` → `mainThreadErrors` as a generic error with the real call site gone.
*Verify*: `@typescript-eslint/no-floating-promises` where type-aware linting is wired (1 of 9
repos); otherwise `grep -n 'void [a-zA-Z_$][a-zA-Z0-9_$.]*(' src/**/*.ts` and read whether each
named callee's own body ends in a `.catch` or a `try`/`catch`.

**TS-HOST-05 — MUST NOT.** Do not call `process.exit()` / `process.crash()` from extension code,
and do not add `process.on('uncaughtException'|'unhandledRejection', …)` to it.
*Rationale*: both exit calls are intercepted and downgraded to a `console.warn` outside the test
harness, so the intended abort silently does nothing; the host already installs its own rejection
handlers before any extension code runs, so an added one is redundant at best.
*Verify*: `grep -rn 'process\.\(exit\|crash\)(\|process\.on(.\(unhandledRejection\|uncaughtException\)' src/ | grep -v /test/` — expect 0.

**TS-HOST-06 — MUST.** Do not compile extension-host code and webview code under one `lib`. Host
code gets `["ES2022"]`; webview code gets its own tsconfig with `DOM`/`DOM.Iterable`.
*Rationale*: a single `lib` including `DOM` hands `document`, `window`, and `fetch`-adjacent DOM
types to code running in Node with no DOM — the compiler accepts a call that throws at runtime.
*Verify*: `jq '.compilerOptions.lib' tsconfig*.json` — a config whose `include` covers both
`src/*.ts` and `src/webview/**` must not list `DOM`.

**TS-HOST-17 — CONSIDER.** For any change adding work reachable from `activate()` or a hot
listener (file watcher, config-change handler), capture a before/after profile via
`Developer: Show Running Extensions` and its title-bar record control.
*Rationale*: no lint measures activation latency or a blocking synchronous frame; the RPC layer
only flips to `Unresponsive` after 3000ms and kills nothing. This command is the only mechanical
substitute available.
*Verify*: run `Developer: Show Running Extensions`, note the activation-time entry, record a
profile over the changed path, confirm no new long synchronous frame; `Help: Start Extension
Bisect` (`extension.bisect.start`) for a crash loop.

### Webview boundary

**TS-HOST-07 — MUST.** Set `localResourceRoots` explicitly on every `createWebviewPanel` /
`resolveWebviewView`, to the narrowest directory the webview actually loads from.
*Rationale*: the default is not "nothing" — it is the extension install directory **plus the
user's entire active workspace**, `.env` and credential files included.
*Verify*: `grep -n 'createWebviewPanel(\|resolveWebviewView(' src/` — every options object must
carry a `localResourceRoots` key.

**TS-HOST-08 — MUST.** Every webview's HTML sets a `<meta http-equiv="Content-Security-Policy">`
starting from `default-src 'none'` with `script-src 'nonce-<per-render random>'`, produced by one
shared helper per repo.
*Rationale*: `script-src ${webview.cspSource}` (the docs' baseline) permits any script in the
webview's asset root; a nonce permits only the tag stamped for that render. A shared helper stops
sibling panels drifting apart.
*Verify*: `grep -n 'Content-Security-Policy' src/` in every file that assigns `webview.html`;
confirm one shared function/template, and that `script-src` reads `'nonce-`, not `${webview.cspSource}`.

**TS-HOST-09 — MUST.** Runtime-check a field read from `onDidReceiveMessage` /
`addEventListener('message', …)` before it reaches any privileged sink — a filesystem path, a CLI
argv slot, `vscode.env.openExternal`, `vscode.Uri.parse`, a DOM-write sink. This includes
union-typed enum fields: a `'project' | 'global'` string is exactly as unchecked at runtime as
`string`.
*Rationale*: type annotations are erased before the program runs, so the declared union constrains
only what the sender's compiled code may construct — not what a compromised, stale, or
version-skewed sender actually sends. VS Code's own tutorial validates nothing.
*Verify*: for each `case` in a message switch, confirm a regex test, `typeof`, `in`,
literal-membership check, or schema call precedes first use of the field. Reference shape already
in-repo: `settings.ts` `case 'openExternal': if (/^https?:/.test(message.url))`.

**TS-HOST-10 — SHOULD.** Keep `*ToHost` / `HostTo*` payload types JSON-shape-only — no class
instance, `Map`, `Set`, `Date`, or function type in any union member.
*Rationale*: the channel uses structured clone and *could* carry them, but VS Code documents the
contract as "any JSON serializable data"; a `Date` field would silently break a JSON-based mock,
a snapshot test, or a non-Electron webview host.
*Verify*: resolve every type inside a `*ToHost`/`HostTo*` union recursively; flag any `class`,
`Map<`, `Set<`, or `Date` reference.

**TS-HOST-11 — MUST.** Every `unsafeHTML(...)` (or equivalent framework "render trusted HTML"
directive) argument must trace to a string literal, the output of a markdown renderer constructed
with `html: false`, or an explicit sanitizer call — never directly to fetched, registry-, or
user-supplied text.
*Rationale*: lit's own docs state `unsafeHTML` is not a sanitizer and "must be
developer-controlled"; it uses `innerHTML` internally. The fleet's safety here lives entirely in
`createMarkdown()`'s `html: false`, a fact no lint verifies and which breaks silently if someone
flips it for an unrelated markdown feature.
*Verify*: `grep -n 'unsafeHTML(' src/` — trace each argument to (a) a literal, (b) an
`html: false` renderer factory, or (c) a `DOMPurify.sanitize`-class call; anything else is a
finding.

**TS-HOST-12 — CONSIDER.** Treat `eslint-plugin-no-unsanitized@^4.1.5` (`method` + `property`) as
required reading for any repo shipping a webview or preload script, not as a CI gate — and
document by hand that it does **not** cover `DOMParser#parseFromString()` or iframe `.srcdoc`.
*Rationale*: it is the only framework-agnostic guard for `.innerHTML`/`.outerHTML`/
`insertAdjacentHTML()`/`document.write[ln]()`/`createContextualFragment()`/`setHTMLUnsafe()`/
dynamic `import()`, but without an `escapeHTML` or Sanitizer-API convention it flags every dynamic
assignment — 100% red, 0% signal — and it does not list lit's `unsafeHTML`, the fleet's one real
sink. Peer dep is `eslint ^9 || ^10`; both extensions qualify.
*Verify*: `npm ls eslint-plugin-no-unsanitized`; separately
`grep -rn 'DOMParser\|\.srcdoc *=\|createContextualFragment(' src/` as the manual supplement for
the two sinks the plugin misses.

### Module and bundle semantics

Added by the `extension-host-bundling` round. `TS-TOOL` owns *which* bundler each repo shape uses
(decision (e): esbuild, keep); this section owns what that bundler changes about the code.

**TS-HOST-18 — MUST.** Both extensions set `"module": "Node16", "moduleResolution": "Node16"`.
Never set `Bundler` on a tsconfig whose output is real, final emission (`vscode-ocx`'s
`compile-tests: tsc -p . --outDir out`), and never "align" one extension to the other's `ESNext`/
`Bundler` because the sibling has it.
*Rationale*: esbuild reads none of this — `format: 'cjs'` in `esbuild.js` decides the output — so
the only thing `module` buys is what `tsc --noEmit` will reject. Measured on TS 6.0.3 with the
"no `package.json` type field" condition both repos actually have: `Node16` raises **TS1470** on
`import.meta` and **TS1309** on top-level await; `ESNext`/`Bundler` raises neither ([bundling §9]).
Neither repo sets `"type": "module"`, so this costs no `.js` import extensions — it is a pure gain,
and it reverses `ts-modules.md`'s open-question lean. On the `tsc`-emitting test path, `Bundler`
would emit ESM syntax into extensionless CJS-loaded files: `SyntaxError` on first `npm test`.
*Verify*: `npx tsc --showConfig | grep -E '"module"|"moduleResolution"'` prints `Node16`/`Node16`
in both repos; every tsconfig driving a `tsc -p`/`--outDir` script (real emission) is `Node16`/
`NodeNext`, never `Bundler`.

**TS-HOST-19 — MUST NOT.** Do not write `import.meta` (including `import.meta.url`) or a top-level
`await` in any file that reaches an esbuild entry point built with `format: 'cjs'` (host) or
`format: 'iife'` (webview).
*Rationale*: `import.meta` is the topic's one *genuinely silent* build divergence — esbuild emits
`var import_meta = {}` and a warning, and both repos' `logLevel: 'silent'` plus an errors-only
problem-matcher swallow that warning everywhere, leaving only a downstream `undefined`
([bundling §4]). Top-level await is loud (`✘ Top-level await is currently not supported with the
"cjs" output format`) but still a wasted round-trip an agent can avoid. Reach for `__dirname`
(subject to TS-HOST-22) or `path.join(context.extensionPath, …)` instead.
*Verify*: `grep -rn 'import\.meta' src/` returns nothing; with TS-HOST-18 in place both constructs
are compile errors (TS1470 / TS1309) at the moment they are written.

**TS-HOST-20 — MUST.** The host bundle's `external` stays exactly `['vscode']` and the test
bundle's exactly `['vscode', 'mocha']`. Never set `packages: 'external'` / `--packages=external`,
and never add a third name without changing `.vscodeignore` and the `package` script in the same
commit.
*Rationale*: `vscode` is injected into the host's `require` cache and never exists on disk, so it
must stay external. Everything else must stay *in* the bundle: `node_modules/**` is excluded by
both `.vscodeignore`s and `vsce package --no-dependencies` disables vsce's own dependency
inclusion, so an externalized dependency is simply missing from the `.vsix` — `Cannot find module`
at activation, which `check`, `build`, and `test` all pass because they run against the dev tree
([bundling §7, §8]). This is the most silent failure in this section.
*Verify*: `grep -n "external:\|packages" esbuild*.js` in both repos — `external` contains only
those names, `packages` appears nowhere. The only real gate is installing the packaged `.vsix` and
smoke-activating it.

**TS-HOST-21 — MUST.** Load any dependency you intend to keep out of the bundle with dynamic
`await import('pkg')`, never a static top-level `import`. Treat `require()` of an ESM-only package
as unsafe against the repo's *declared* `engines.vscode` floor, not against today's VS Code.
*Rationale*: esbuild leaves an external dynamic `import()` as a real native `import()` — safe on
any Node, any package shape — while a static import of the same package becomes a literal
`require("pkg")` ([bundling §3]). `require(esm)` only became flag-free in Node v20.19.0/v22.12.0,
and the declared floor `"vscode": "^1.96.0"` pins Electron 32.2.6 → **Node 20.18.1**, below that
line; current stable 1.135 pins Electron 42.8.1 → Node 24.18.1, above it ([bundling §6]). A module
whose graph uses top-level await throws `ERR_REQUIRE_ASYNC_MODULE` on *every* Node version.
`vscode-ocx/src/test/schema.test.ts:14` is the reference shape.
*Verify*: for every name in `external` beyond `vscode`/`mocha`,
`grep -rn "from '<pkg>'" src/` shows only `import type` or `await import('<pkg>')`. When raising
or relying on the floor, look up `microsoft/vscode`'s `release/<ver>` `package.json` →
`devDependencies.electron` → that Electron's `node` field in the Electron release feed.

**TS-HOST-22 — SHOULD.** Read every `__dirname`/`__filename` in bundled source as "the *output*
file's directory" (`dist/`, or `out/test/`), never "this `.ts` file's directory". A dependency that
reads a file relative to its own `__dirname`/`import.meta.url` cannot be bundled — and by
TS-HOST-20 it cannot be externalized either, so that combination needs a packaging decision, not a
one-line flag.
*Rationale*: verified — two source files three directories apart, folded into one bundle, report an
identical `__dirname` equal to the output file's own directory ([bundling §5]). `path.join(__dirname,
'../assets/x')` is then silently wrong, or accidentally right, depending on how the two trees line
up. `vscode-ocx/src/test/schema.test.ts:9` already documents this by hand per file.
*Verify*: reading heuristic — every `path.join(__dirname, …)` in `src/` is checked against the
bundle's output directory, not the source file's; prefer `context.extensionPath`/`extensionUri`
where a `vscode.ExtensionContext` is in hand.

**TS-HOST-23 — SHOULD.** An esbuild config that sets `logLevel: 'silent'` must have an `onEnd`
handler that prints `result.warnings` as well as `result.errors`.
*Rationale*: both repos silence esbuild and forward only errors, so every esbuild warning — the
`import.meta` one included — reaches no terminal, no problem matcher, and no CI log
([bundling §4]). TS-HOST-18 closes the common case statically, but a warning channel that is
muted by construction will swallow the next one too.
*Verify*: `grep -n "logLevel" esbuild*.js` — if `'silent'`, the same file's `onEnd` must iterate
`result.warnings`.

### Faking host APIs in tests

**TS-HOST-13 — MUST NOT.** Never fake a `vscode` type that `vscode.d.ts` declares as an
`export class` with a usable public constructor — `Uri`, `EventEmitter`, `Disposable`, `Position`,
`Range`, `Selection`. Construct the real one.
*Rationale*: these are pure-logic classes with no host dependency; a fake costs a cast and can
drift from real behaviour, and buys nothing.
*Verify*: `grep -rn 'as unknown as vscode\.\(Uri\|EventEmitter\|Disposable\|Position\|Range\|Selection\)' --include='*.ts' src/` — every hit is a violation with no legitimate reading.

**TS-HOST-14 — MUST.** *(Revised — scope narrowed.)* Where no mock library is present, a fake of a
factory-only interface (`WebviewView`, `WebviewPanel`, `GlobalEnvironmentVariableCollection`,
`TreeView`, `Response`, `typeof fetch`, …) is one named, colocated `function fakeX(...)` or
`class FakeX`, declared once and reused. No bare `const x = { … } as unknown as T` inside a test
body. In `grimoire-vscode`/`vscode-ocx` this is the **fallback**: TS-HOST-25's `createMock<T>()`
removes the cast entirely and is preferred. The rule still governs `ocx-catalog`'s 57
`fetch`/`Response` casts and any repo that has not taken the dependency.
*Rationale*: the double cast is TypeScript's own sanctioned escape hatch for a genuinely partial
fake (TS2352 rejects the single cast), so the rule bounds where it may appear rather than banning
it. `vscode-ocx`'s `FakeCollection` is already the correct shape.
*Verify*: ESLint `no-restricted-syntax` with selector
`TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]`, scoped to allow the
fake-factory path — syntactic, so it runs without type-aware linting. Mirrors
`microsoft/vscode`'s own `TSAsExpression`-selector ban on `as sinon.SinonStub`. Still unrun
against either repo — run it before trusting it in CI (see Verdict, documented gaps).

**TS-HOST-15 — SHOULD.** *(Rewritten — the original advice does not compile for nested fakes.)*
`satisfies Partial<RealType>` is valid only for a **flat** fake, one whose members are all
primitives or functions. The moment a fake nests a real interface — `{ webview: { postMessage } }`
against `WebviewPanel` — `Partial<T>` demands the *complete* nested type and the annotation itself
fails with **TS2739**. For nested fakes use a `DeepPartial`-shaped mechanism instead: TS-HOST-25's
`createMock<T>(partial)` takes `PartialFuncReturn<T>` and gets the same typo/return-type checking
(TS2561/TS2322) with no annotation at all. When the surface is small enough to implement in full
(roughly ≤10 flat members, no nested un-mockable type), implement it fully, annotate the return as
the real type, and use no assertion — that is still the only rung that breaks the build when the
real interface gains a required member.
*Rationale*: verified by compiler run ([typed-doubles §4]); `Partial<T>` is a one-level transform.
Even where it does apply, it never catches a newly-required member or a widened parameter list
(bivariance) — it is a floor, not a ceiling.
*Verify*: reading heuristic — a `satisfies Partial<…>` annotation exists only on flat fakes and
compiles; nested fakes go through `createMock<T>()`; a fake with a real-type return annotation and
no `as` in its body is at the strongest rung.

**TS-HOST-16 — MUST NOT.** Do not introduce a generic `fake<T>(partial: Partial<T>): T` helper —
and do not read this rule as banning `@golevelup/ts-sinon`'s `createMock<T>()`, which is a
different mechanism.
*Rationale*: verified by compiler run — `fake<Foo>({ a: 'x' })` against
`interface Foo { a: string; b(): number; c: boolean }` compiles clean with two of three members
absent, because the internal `as T` is checked against the unconstrained type parameter, not the
caller's type. `createMock<T>` does not have this hole: its parameter is `PartialFuncReturn<T>`
(a real `DeepPartial`, so excess-property and typo checks fire on what you pass) and its return is
`DeepMocked<T> = {…} & T`, so no call-site assertion is needed either ([typed-doubles §6]).
*Verify*: `grep -rn 'function fake<T>\|function mock<T>' --include='*.ts' .` — any hit is the wrong
shape.

**TS-HOST-24 — MUST NOT.** Never cast to monkeypatch a real `vscode` singleton. Replace a method on
`vscode.window`/`commands`/`authentication` with `sandbox.stub(vscode.window, 'showErrorMessage')`
from one file-level `sinon.createSandbox()` restored in a single `afterEach(() => sandbox.restore())`.
*Rationale*: `@types/sinon`'s `stub<T, K extends keyof T>(obj: T, method: K)` overload imposes no
readonly constraint and type-checks against `vscode.window` with **zero** assertion — these 26
sites never wanted a substitute object, they wanted two methods swapped on the live singleton and
put back ([typed-doubles §7]). The cast existed only to narrow the type enough to assign, and it
carries a real hazard: a substitute `window` silently loses every other member the same test run
still reads. It also collapses ~18 hand-rolled `try/finally` restore blocks into one hook.
*Verify*: `grep -rn "as unknown as { show\|as unknown as { execute\|as unknown as { getSession" --include='*.ts' src/` — expect 0; each test file using `sandbox.stub` has exactly one `sandbox.restore()` teardown.

**TS-HOST-25 — MUST.** For a constructor-less `vscode` interface (`WebviewPanel`, `WebviewView`,
`OutputChannel`, `GlobalEnvironmentVariableCollection`) or an app class faked to avoid its real
side effects, use `createMock<Interface>(partialOverrides)` from `@golevelup/ts-sinon` — no
call-site assertion, no repo-local helper. Add `sinon`, `@types/sinon`, `@golevelup/ts-sinon` as
devDependencies and pin `sinon` at `^21.x`.
*Rationale*: `DeepMocked<T>` intersects `T`, so the return type is already a complete `T`; verified
compiling clean with zero `as` against a `WebviewPanel`/`Webview` pair modelled on the real
`vscode.d.ts`, and catching a typo'd nested member (TS2561) automatically ([typed-doubles §6]).
`sinon` is a direct devDependency of `microsoft/vscode` itself and was pushed 2026-08-05;
`@golevelup/ts-sinon` is Proxy + `sinon.stub()` with zero runtime deps and no NestJS coupling
despite its docs. The peer range is `sinon@^21.x`, so npm's `22.1.0` is out of range.
*Verify*: `npm ls sinon @golevelup/ts-sinon` reports no peer warning;
`grep -rn 'as unknown as vscode\.\(WebviewPanel\|WebviewView\|OutputChannel\|GlobalEnvironmentVariableCollection\)' --include='*.ts' src/` → 0 outside the migration window.

**TS-HOST-26 — MUST.** In every `createMock<T>({…})` call, explicitly provide each **plain-data**
member the code under test reads — not just the function members. Omit only members the SUT never
touches.
*Rationale*: the Proxy `get` trap auto-vivifies *any* unprovided member, function or not. An
unfaked `panel.title` is a callable `sinon.stub()` wearing a string's name — `panel.title.toUpperCase()`
or `` `${panel.title}` `` misbehaves instead of failing loudly, and `JSON.stringify` hides it by
dropping functions. This is not documented upstream; it was read from `lib/mocks.js` and confirmed
by running the output ([typed-doubles §6]).
*Verify*: for each `createMock<T>()` call, diff the SUT's reads against the partial's keys; a
clean `tsc --strict` is not evidence here.

**TS-HOST-27 — SHOULD.** Before writing a fake, `grep` the whole test file for an existing
`function fake*`/`function stub*` of the same shape and call it. Do not add another inline copy of
a literal that already has a named helper.
*Rationale*: measured — `extension.test.ts` has a working `fakePanel()` used correctly at 21 sites,
and **11 of its 12** `WebviewPanel` cast declarations are character-for-character duplicates that
never call it; `:3015-3016` duplicates the file's own `stubVoteEnvironment()` the same way
([typed-doubles §8]). Half of this problem was never "no good pattern exists". It is the
characteristic failure of completing a file from nearby context.
*Verify*: `grep -n "^function fake\|^function stub" <file>` before adding a fake; the count of
inline fake literals per interface should trend to zero.

**Deliberately not written as rules** (measured clean, and generic enough that a model already gets
them right): `activationEvents` narrowness and the `"*"` ban; keeping `acquireVsCodeApi()`'s return
out of global scope; disposable→`context.subscriptions` parity; command declare/register parity;
`OutputChannel` over `console.*`; shell-injection avoidance. Also not written here because
`TS-TOOL` owns them: which bundler each shape uses (decision (e)), the committed-`dist/` drift
gate (`TS-TOOL-13`), and the never-add dependency list (`TS-TOOL-16` — which should gain
`testdouble`).

## Applied to the fleet

**Violated — TS-HOST-01 (MUST), both extensions.** `grimoire-vscode`'s `grimoire.updateAll`,
`grimoire.initProject`, `grimoire.installGrim` and `grimoire.refresh` reach `grim.ts`'s
`updateArgs()`/`initArgs()`/`addArgs()` and execute against workspace-declared
`grimoire.toml`/lock with no trust check; `grep -rn "isTrusted" src/` returns exactly one non-test
hit, gating only the automatic update-check network round. `vscode-ocx` gates its automatic
`reloadOnce()` path correctly but leaves `runProjectCommand` (`ocx.lock`/`pull`/`upgrade`/`clean`)
and `runInitCommand` (`ocx.init`) ungated with `cwd: project.dir`. `grep -n "isWorkspaceTrusted"
package.json` → **0 in both manifests** ([host-failure-modes §10]).

**Violated — TS-HOST-04 (MUST).** `grimoire-vscode/src/extension.ts:507` — `void rebuildWatchers();`
at activation, with no internal try/catch, while its two siblings `checkForUpdates`
(`extension.ts:602-641`) and `publishUpdateCount` (`extension.ts:571-599`) both self-catch and log
(`typescript-audit/runtime-posture.md` §1). One inconsistency, three lines apart.

**Violated — TS-HOST-06 (MUST).** `grimoire-vscode/tsconfig.json:2-21` is a single project with
`lib: [ES2022, DOM, DOM.Iterable]` covering both `src/*.ts` (extension host, Node, no DOM) and
`src/webview/**`. Its sibling `vscode-ocx/tsconfig.json:2-21` — which ships no webview — correctly
sets `[ES2022]` (`typescript-audit/config-inventory.md` §1).

**Violated — TS-HOST-09 (MUST).** `grimoire-vscode/src/views/settings.ts` guards exactly one case
(`openExternal`, scheme regex before `vscode.env.openExternal`); `switchScope`, `setValue`,
`addRegistry` and roughly fifteen other `SettingsToHost` cases pass `message.scope`/`key`/`value`
straight into argv builders on the declared type alone. Severity is behavioural, not RCE — every
builder feeds `execFile` with an argv array, confirmed shell-injection-free fleet-wide.

**Violated — TS-HOST-18 (MUST), one repo.** `grimoire-vscode/tsconfig.json:3-4` is
`"module": "ESNext", "moduleResolution": "Bundler"` — the setting under which `import.meta` and
top-level await both type-check clean. `vscode-ocx` is already `Node16`/`Node16` and needs no
change. Note this edit lands in the same file as TS-HOST-06's split.

**Violated — TS-HOST-23 (SHOULD), both repos.** `grimoire-vscode/esbuild.js:72` and
`vscode-ocx/esbuild.js:45` set `logLevel: 'silent'`, and the shared `esbuildProblemMatcherPlugin`'s
`onEnd` iterates only `result.errors` — the warning channel is muted end to end.

**Violated — TS-HOST-14/15/24/25/27.** 79 `as unknown as` in `grimoire-vscode/src/test/` across
**13** files — **46 in `extension.test.ts`** (the 6,899-line file), 33 across the other 12
(`installStateUnknown.test.ts` 10, `settingsHost.test.ts` 6, `updateBadgeSpec.test.ts` 5, then
2s and 1s) — plus 5 in `vscode-ocx` and 57 in `ocx-catalog`. *(Corrected: the pre-revision text and
the program brief both attributed the whole-repo 79 to the single file.)* Of the 46: 26 are
singleton monkeypatches (TS-HOST-24), 16 are structural fakes (TS-HOST-25), 3 fake the app's own
constructible `ScopeService`, 1 is an unrelated `DescribeResult` fixture cast that is not a host
fake at all and stays. 11 of the 12 `WebviewPanel` casts duplicate the file's own `fakePanel()`
(TS-HOST-27). No `satisfies Partial<>` exists anywhere in either extension — and per TS-HOST-15 it
could not have been added to the nested fakes anyway. **Partial pass**:
`vscode-ocx/src/test/environment.test.ts:263` `FakeCollection` is a named, colocated,
single-declaration fake reused at five call sites — TS-HOST-14's shape, and a one-line
`createMock<vscode.GlobalEnvironmentVariableCollection>()` replacement under TS-HOST-25.

**Violated — TS-HOST-12 (CONSIDER).** Neither extension has the plugin, and both
`quality-typescript.md` rule files describe ESLint as delivering "type-aware rules" while
`eslint.config.mjs` wires only the non-type-checked `recommended` preset with no
`parserOptions.project` (`typescript-audit/config-inventory.md` §6, line 252). The document claims
capability the config lacks — which is also why TS-HOST-04's verification degrades to a grep in 8
of 9 repos.

**Satisfied — TS-HOST-05.** Zero `process.on('unhandledRejection'|'uncaughtException')` and zero
`process.exit`/`crash` in either extension's production code; the only two fleet hits are a test
harness listener at `grimoire-vscode/src/test/rating.test.ts:277,290`
(`typescript-audit/runtime-posture.md` §2).

**Satisfied — TS-HOST-03.** `activate()` is synchronous in both; `vscode-ocx/src/extension.ts:29-32`
states the contract in its own docblock ("Keep this thin … the actual work happens lazily in
`reload`") and the code matches (`typescript-audit/implemented-contracts.md` §6).

**Satisfied — TS-HOST-07/08.** All three `grimoire-vscode` panels set
`localResourceRoots: [Uri.joinPath(extensionUri, 'dist', 'webview')]` — narrower than either
default clause — and route every `webview.html` through one `src/views/html.ts::webviewHtml()`
whose policy is `default-src 'none'` + `script-src 'nonce-…'`, stricter than the docs' baseline and
matching Microsoft's own `webview-sample`.

**Satisfied — TS-HOST-11.** `createMarkdown()`'s `markdown-it { html: false }` precedes both
`unsafeHTML` call sites (`src/webview/render.ts:77`, `src/webview/details/main.ts:174`), with a
narrow `data:image/svg+xml;base64,` carve-out in `validateLink` landing in `<img src>` context.

**Satisfied — TS-HOST-10/13/16.** Every `*ToHost`/`HostTo*` union is already JSON-shape-only;
`vscode-ocx/src/project.ts:43` and `:145-146` construct `EventEmitter`/`Uri` for real with no cast;
no generic `fake<T>` helper exists anywhere in the fleet.

**Satisfied — TS-HOST-19/20/22, and TS-HOST-21 dormant.** Zero `import.meta` and zero top-level
`await` in either `src/` outside tests; `external` is exactly `['vscode']` (host) and
`['vscode', 'mocha']` (`esbuild.tests.js:29`) with `packages` set nowhere; the 5
`__dirname`-referencing test files in `grimoire-vscode` and `vscode-ocx/src/test/schema.test.ts:9`
already reason in output-directory terms. TS-HOST-21 has nothing to bite yet: both `package.json`s
have **zero** runtime `dependencies`. Every one of these is clean by absence, not by a gate — which
is exactly the state a rule is for.

**Unmeasured — TS-HOST-02.** `implemented-contracts.md` §6 traced all 8 `context.subscriptions.push`
sites in `grimoire-vscode/src/extension.ts` (123, 338, 369, 470, 479, 554, 653, 655, 678) and all 3
in `vscode-ocx` and found zero disposal leaks — but nothing checked whether a throwable step sits
*after* the first push. Adopting TS-HOST-02 means running that read once per extension; it is a
commitment, not a confirmed pass.

**New commitments**: TS-HOST-06 (split the tsconfig), TS-HOST-10 (JSON-shape-only, currently true
by accident), TS-HOST-12 (plugin as rule text), TS-HOST-15 (the nested-fake mechanism), TS-HOST-17
(profile capture), TS-HOST-18 (one tsconfig edit in `grimoire-vscode`), TS-HOST-23 (unmute
warnings), TS-HOST-24/25/26 (three devDependencies and a 51-cast migration).

## AI-agent failure modes

Ranked by how often it bites in this codebase. Entries 14–19 were added by the follow-up round.

1. **Reaching for `fake<T>(partial: Partial<T>): T` as "the clean solution."** The single most
   likely failure this topic surfaced — it reads as DRY and disciplined, compiles silently on a
   fake missing two of three members, and would replace 164 casts that at least name their target
   interface. Treat an agent proposing it as having produced the weakest option, not the best.
   (TS-HOST-16.)
2. **Reproducing VS Code's own unvalidated tutorial switch.** `switch (message.command) { case
   'alert': showErrorMessage(message.text) }` — untyped, unguarded, and the shape the docs and
   every blog copying them teach. (TS-HOST-09.)
3. **Server-Node crash reflexes.** `process.on('unhandledRejection', () => process.exit(1))` from
   Express/Fastify training data. Both halves are inert here — the handler is redundant and the
   exit is intercepted — so the "safety net" does nothing while looking like diligence.
   (TS-HOST-05.)
4. **Conflating `"limited"` with `false`.** Reasoning "the manifest says untrustedWorkspaces is
   limited, so VS Code handles it" and skipping the gate on a new risky command. `false` means VS
   Code refuses to activate at all; `"limited"` means full activation with zero automatic gating.
   (TS-HOST-01.)
5. **Reflexive `as unknown as vscode.Uri` / `new vscode.WebviewView(...)`.** The first fakes a
   real, constructible class; the second is a hallucinated constructor that has never existed.
   Both come from treating every `vscode.*` symbol as one undifferentiated category.
   (TS-HOST-13.)
6. **Returning an awaited bootstrap promise from `activate()` as "the robust shape."** Generic
   async-bootstrap idiom, exactly backwards here. (TS-HOST-03.)
7. **Treating `unsafeHTML()` as the sanitized way to render HTML** — `dangerouslySetInnerHTML` /
   `v-html` muscle memory transplanted into lit, which documents the opposite. (TS-HOST-11.)
8. **Loosening an existing nonce CSP to `script-src ${webview.cspSource}`** because that is the
   docs' first example, silently regressing a stricter established policy. (TS-HOST-08.)
9. **Cargo-culting `event.origin` checks** into a webview message listener — looks like the
   standard fix, addresses a threat model that does not apply, and substitutes for the payload
   validation that does. (TS-HOST-09.)
10. **Believing `satisfies Partial<T>` makes a fake drift-proof.** It catches typos and wrong
    return types, not a newly-required member — and on a *nested* fake it does not even compile
    (TS2739). It is a floor, not a ceiling, and on most of this fleet's fakes it is not available
    at all. (TS-HOST-15.)
11. **Trusting a lint-rule catalogue for exact sink coverage.** This program's own
    `lint-catalogue-sweep.md` overclaims `no-unsanitized`'s defaults; reading
    `lib/rules/{method,property}.js` settles it in five minutes. (TS-HOST-12.)
12. **Diagnosing a hang as a crash.** "Extension host crashed" with no `terminated unexpectedly`
    notification is the 3000ms RPC `Unresponsive` signal — a blocking synchronous loop, not a
    thrown error. Adding a try/catch around something that never threw fixes nothing.
    (TS-HOST-17.)
13. **Reimplementing `restrictedConfigurations` by hand** with `.inspect(key)` and manual
    `globalValue`/`workspaceValue` picking, for keys the platform already substitutes correctly.
14. **Writing `import.meta.url` + `fileURLToPath` for "my own directory" because the tsconfig says
    `ESNext`.** The single most-trained ESM idiom, type-checking clean today, building with a
    warning nobody prints, failing as an `undefined` several frames downstream. (TS-HOST-19,
    TS-HOST-18.)
15. **Marking a new dependency `external` "to keep the bundle small."** The correct instinct in a
    general Node/bundler context, and here it ships a `.vsix` that throws `Cannot find module` on
    activation, past every local script. (TS-HOST-20.)
16. **Assuming `require()` of an ESM-only package is fine "because Node 22+ supports it."** True of
    the host the agent is running against, false of the `engines.vscode` floor the repo declares —
    and the agent has no way to see that floor's Node without the Electron lookup. (TS-HOST-21.)
17. **"Aligning" one extension's tsconfig to its sibling's `ESNext`/`Bundler`** because the diff is
    smaller and a prior artifact leaned that way. The correct direction is the opposite one, and
    the reason only appears once the esbuild interaction is in view. (TS-HOST-18.)
18. **Faking a substitute `vscode.window` for what is actually a two-method monkeypatch.** An agent
    that treats all 46 casts as one problem builds an object that silently lacks every other member
    the same test run reads. The tell: does the enclosing test re-read other members of the same
    object later? Then it wanted `sandbox.stub`, not a fake. (TS-HOST-24.)
19. **Writing the 12th inline copy of `fakePanel()`'s literal** because the two nearest tests in
    the context window did — and they were duplicates too. Grep the whole file, not the neighbours.
    (TS-HOST-27.) Adjacent: proposing the 17-file production-seam refactor as "the proper fix" for
    a casting complaint — measured at roughly 10x the cost of three devDependencies, and it does
    not eliminate the `WebviewPanel`/`WebviewView` fakes anyway ([typed-doubles §9]).

## Open questions

**For a human decision.**

- **Does TS-HOST-06 justify its build cost?** Splitting `grimoire-vscode` into a host tsconfig and
  a webview tsconfig is correct but touches esbuild config, `check-types`, and the coverage gate.
  The alternative — accept the shared `DOM` lib and rely on review — is a real choice, not an
  obvious loss. It now shares a file with TS-HOST-18's one-line `module`/`moduleResolution` edit,
  which lowers the marginal cost slightly but does not settle it.
- **Are the two extensions' ungated commands a bug to fix now, or a documented posture?**
  TS-HOST-01 is the topic's highest-severity finding and the fix is either a runtime `isTrusted`
  check in ~13 handlers or `isWorkspaceTrusted` `when` clauses in both manifests. Someone owns that
  call.
- **Does `TS-MOD` take the cohesion flag?** `webview-boundary §7` produced a defensible mechanical
  signal — ≥15 exports, ≥1 locally-declared type, ≥1 exported function whose signature references a
  type imported from another file — that correctly separated `model.ts` (94 exports, kitchen sink)
  from `grim.ts` (63, cohesive) and `protocol.ts` (40, wire contract, exempt). It is a review
  trigger, not a violation, no linter implements it, and it is not extension-host-specific. It is
  parked here rather than adopted.
- **Three devDependencies and a 51-cast migration, against a `TS-TOOL` rule that says otherwise.**
  TS-HOST-24/25 require `sinon` + `@types/sinon` + `@golevelup/ts-sinon` in both extensions, where
  `TS-TOOL-10` currently prescribes a repo-local `fake<T>()` for exactly these repos. Someone has
  to (a) approve the dependencies and the migration, and (b) amend `TS-TOOL-10`'s Mocha/Electron
  branch so the two rule sets do not contradict each other in an agent's context window.
- **Raise `engines.vscode`, or live with the floor?** `^1.96.0` implies Node 20.18.1, below the
  `require(esm)` line, which is the whole reason TS-HOST-21 is a MUST rather than a note. Raising
  the floor to a VS Code whose Electron ships Node ≥20.19 would relax it; keeping the floor keeps
  the constraint. Not a rule question — a support-matrix question.

## Revision log

- **2026-08-29 — folded in `extension-host-bundling.md` and `typed-doubles-non-vitest.md`**, the two
  rounds the first consolidation commissioned. Frontmatter `consolidates` extended; `revised:` added.
- **New rules TS-HOST-18…23 (module and bundle semantics).** `Node16`/`Node16` on both extensions
  (18), the `import.meta`/top-level-await ban (19), the `external`/packaging invariant (20),
  dynamic `import()` for anything kept out of the bundle plus the `require(esm)` floor (21),
  `__dirname` is the output directory (22), unmute esbuild warnings (23). Twelve normative
  candidates in the sub-artifact were merged to six: rules 2+3 became one (same format mismatch,
  same `Node16` verify), 5+6+7 became TS-HOST-20 (one invariant), 4+9 became TS-HOST-21, and 1+10+12
  became TS-HOST-18. Nothing dropped for space.
- **New rules TS-HOST-24…27 (test doubles).** `sinon.stub` for singleton monkeypatches (24),
  `createMock<T>()` for constructor-less interfaces (25), the auto-vivification mitigation (26),
  reuse-the-existing-helper (27).
- **TS-HOST-15 rewritten in place — it prescribed something that does not compile.** The original
  required `satisfies Partial<RealType>` before every fake's cast; `typed-doubles §4` proved by
  compiler run that `Partial<T>` cannot express a nested fake (TS2739), which is every
  `WebviewPanel`/`WebviewView` fake in the fleet. Now scoped to flat fakes, with `createMock`'s
  `PartialFuncReturn<T>` named as the nested mechanism. This is the round's most dangerous
  correction: the old text advised a build-breaking annotation while claiming it was free.
- **TS-HOST-14 narrowed in place.** Still governs `ocx-catalog` and any repo without the mock
  library, but is now explicitly the *fallback* in the two extensions, where TS-HOST-25 removes the
  cast entirely. Its unrun-selector caveat moved from Open questions into the Verdict as a gap.
- **TS-HOST-16 clarified in place.** Unchanged in force, but now states explicitly that it does not
  ban `createMock<T>()` and why the type mechanics differ — without this an agent reads TS-HOST-16
  as forbidding TS-HOST-25.
- **Verdict items 6 and 7 revised; items 9–12 and a documented-gaps block added.** Item 6 no longer
  claims the fleet's casts are all fakes (26 of 46 are monkeypatches); item 7 records that the
  follow-up reached the same anti-`fake<T>` conclusion independently.
- **Fleet cast counts corrected.** 79 spans **13** files, not 12, and the 6,899-line
  `extension.test.ts` holds **46** of them, not 79 — the pre-revision text and the program brief
  both misattributed the whole-repo total to the one file. Four-category breakdown and the 11
  rogue `fakePanel()` duplicates added.
- **Open questions closed:** the "esbuild/CJS bundling constraints were never dived" gap and the
  "deserves another round: `extension-host-bundling`" item — both answered, moved into the Verdict
  (items 10, 11). The `faking-vscode` search-budget gap narrowed to the single unrun-selector
  caveat, now a documented gap. Two new human decisions opened (the devDependency/`TS-TOOL-10`
  collision, and the `engines.vscode` floor).
- **Failure modes 14–19 appended** (existing 1–13 unchanged in number and meaning; 10 reworded for
  the TS-HOST-15 correction).
- **Cross-family note recorded, not acted on:** `TS-TOOL-16`'s never-add list should gain
  `testdouble` (2024-03-21 last push); `TS-TOOL-10`'s Mocha/Electron branch conflicts with
  TS-HOST-24/25. Neither document was modified.

## Sub-artifacts

- [host-failure-modes.md](ts-extension-host/host-failure-modes.md) — the shared-host process model
  read from VS Code source: what does and does not terminate the host, `activate()`'s isolation gap,
  the 3000ms responsiveness watchdog, and a six-step workspace-trust cross-check worked against
  both manifests.
- [webview-boundary.md](ts-extension-host/webview-boundary.md) — CSP, `localResourceRoots`,
  `asWebviewUri`, why a shared `.ts` message type guarantees nothing at runtime, the DOM-sink gap
  verified against `eslint-plugin-no-unsanitized`'s actual rule source, and the export-count
  cohesion question.
- [faking-vscode.md](ts-extension-host/faking-vscode.md) — which `vscode.*` types are constructible
  and which genuinely need a fake, three faking patterns evaluated by running the compiler, and the
  AST-selector mechanism for bounding the double cast.
- [extension-host-bundling.md](ts-extension-host/extension-host-bundling.md) — what esbuild's
  `format: 'cjs'` step changes about code `tsc` type-checks as ESM, each behaviour verified by
  running the fleet's own pinned esbuild and tsc: top-level await, dynamic vs. static `import()`,
  `import.meta`, `__dirname`, `require(esm)` against the declared `engines.vscode` floor, and the
  `Node16`-vs-`Bundler` decision that reverses `ts-modules.md`'s lean.
- [typed-doubles-non-vitest.md](ts-extension-host/typed-doubles-non-vitest.md) — the 46 casts in
  `extension.test.ts` read one at a time into four categories, `Partial` vs `DeepPartial` proven
  against the fleet's own fake shape, a maintenance-checked survey of sinon / ts-mockito /
  testdouble / `@golevelup/ts-sinon`, `createMock<T>()` verified by compiling and running it, and a
  priced rejection of the production-seam alternative.

## Key sources

| URL | Why |
|---|---|
| [code.visualstudio.com/api/advanced-topics/extension-host](https://code.visualstudio.com/api/advanced-topics/extension-host) | The shared-process intent, in Microsoft's own words |
| [vscode … extensionHostProcess.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/node/extensionHostProcess.ts) | The rejection/exception handler overrides and the `process.exit`/`crash` interception — the source that disproves the audit's crash claim |
| [vscode … extHostExtensionService.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/api/common/extHostExtensionService.ts) | `_callActivate` — per-extension isolation and the subscriptions leak on partial failure |
| [vscode … nativeExtensionService.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts) | Exact "terminated unexpectedly" strings, crash tracker, 3-crashes/5-minutes threshold |
| [vscode … rpcProtocol.ts](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/src/vs/workbench/services/extensions/common/rpcProtocol.ts) | `UNRESPONSIVE_TIME = 3 * 1000` — the hang-vs-crash distinction |
| [code.visualstudio.com/api/extension-guides/workspace-trust](https://code.visualstudio.com/api/extension-guides/workspace-trust) | `untrustedWorkspaces.supported`, `restrictedConfigurations`, `isTrusted`, `isWorkspaceTrusted` |
| [code.visualstudio.com/api/extension-guides/webview](https://code.visualstudio.com/api/extension-guides/webview) | CSP baseline, the `localResourceRoots` default scope, and the unvalidated message tutorial |
| [vscode-extension-samples/webview-sample](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/webview-sample/src/extension.ts) | Microsoft's own nonce-CSP helper — the pattern the fleet independently converged on |
| [developer.mozilla.org/…/Window/postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) | "Always verify the syntax of the received message" — even from a trusted sender |
| [typescriptlang.org/docs/handbook/2/basic-types.html](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) | Type annotations are erased and never affect runtime behaviour |
| [typescriptlang.org/docs/handbook/2/everyday-types.html](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) | TS2352 and the sanctioned two-step cast — the double cast is intended, not a loophole |
| [lit.dev/docs/templates/directives](https://lit.dev/docs/templates/directives/) | `unsafeHTML` is explicitly not a sanitizer and uses `innerHTML` |
| [no-unsanitized lib/rules/method.js](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/method.js) + [property.js](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/property.js) | Ground truth for default sink coverage — no `DOMParser`, no `srcdoc` |
| [vscode eslint.config.js#L2963](https://github.com/microsoft/vscode/blob/cd429513258458bcbe37b17fe714874197fe2adf/eslint.config.js#L2963) | In-production precedent for the `no-restricted-syntax` + `TSAsExpression` mechanism TS-HOST-14 uses |
| [github.com/streetsidesoftware/jest-mock-vscode](https://github.com/streetsidesoftware/jest-mock-vscode) | A maintained vscode mock's own answer: typed-return where full, one named cast where partial, `Omit<VSCode, NotImplemented>` as a coverage manifest |
| [vscode.d.ts @ 1.96.0](https://github.com/microsoft/vscode/blob/1.96.0/src/vscode-dts/vscode.d.ts) | The class-vs-interface split behind TS-HOST-13, and the readonly-member counts behind TS-HOST-15, at the fleet's pinned `@types/vscode` |
| [esbuild API docs](https://esbuild.github.io/api/) + [content types](https://esbuild.github.io/content-types/) | `--format`, `--packages=external`, what esbuild reads from tsconfig (not `module`), and the top-level-await-under-bundling restriction |
| [code.visualstudio.com/api/working-with-extensions/bundling-extension](https://code.visualstudio.com/api/working-with-extensions/bundling-extension) | The `vscode`-module-is-not-on-disk requirement behind TS-HOST-20 |
| [nodejs.org/api/modules.html](https://nodejs.org/api/modules.html) | The `require(esm)` version timeline and the unconditional `ERR_REQUIRE_ASYNC_MODULE` caveat behind TS-HOST-21 |
| [vscode release/1.135 package.json](https://github.com/microsoft/vscode/blob/release/1.135/package.json) + [release/1.96](https://github.com/microsoft/vscode/blob/release/1.96/package.json) + [Electron releases feed](https://releases.electronjs.org/releases.json) | Which Node the extension host actually runs — Electron 42.8.1/Node 24.18.1 today vs. Electron 32.2.6/Node 20.18.1 at the declared floor |
| [typescriptlang.org/docs/handbook/modules/reference.html](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | `Node16`/`NodeNext` CJS emit leaves dynamic `import()` untransformed — the independent confirmation of esbuild's split |
| [unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.d.ts](https://unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.d.ts) + [mocks.js](https://unpkg.com/@golevelup/ts-sinon@2.0.0/lib/mocks.js) | `PartialFuncReturn<T>`/`DeepMocked<T>` — why TS-HOST-25 needs no cast, and the Proxy `get` trap behind TS-HOST-26 |
| [@types/sinon index.d.ts](https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/sinon/index.d.ts) | `stub<T, K extends keyof T>(obj, method)` has no readonly constraint — the whole basis for TS-HOST-24 |
| [microsoft/vscode package.json](https://raw.githubusercontent.com/microsoft/vscode/main/package.json) | VS Code core itself devDepends on `sinon` — the real precedent (the samples repo has zero sinon hits) |

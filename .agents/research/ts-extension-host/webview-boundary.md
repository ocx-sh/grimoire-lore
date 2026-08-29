---
title: VS Code Webview Boundary — CSP, postMessage Trust, DOM Sinks, Cohesion
topic: webview-boundary
agent: general-purpose (sonnet)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 13
scope: >
  The extension-host↔webview seam in grimoire-vscode (the fleet's only repo
  shipping a VS Code webview; vscode-ocx has none). Covers: webview CSP
  (cspSource, localResourceRoots, asWebviewUri, why the sandbox is stricter
  than a browser page), the postMessage boundary and whether a shared .ts
  type is trustworthy at runtime, the raw-DOM-sink gap (eslint-plugin-
  no-unsanitized, verified against its actual v4.1.5 source, not just its
  docs), and the export-count/cohesion question for model.ts/protocol.ts/
  settings/model.ts vs grim.ts. Does not cover: general Electron main-process
  hardening, VS Code marketplace publishing/supply-chain, or non-webview
  extension surface (commands, tree views, debug adapters).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The webview sandbox and why it's stricter than a browser tab](#1-the-webview-sandbox-and-why-its-stricter-than-a-browser-tab)
   2. [CSP in a webview: cspSource, the baseline policy, and nonce vs. cspSource for scripts](#2-csp-in-a-webview-cspsource-the-baseline-policy-and-nonce-vs-cspsource-for-scripts)
   3. [localResourceRoots and asWebviewUri: the default is broader than assumed](#3-localresourceroots-and-aswebviewuri-the-default-is-broader-than-assumed)
   4. [The postMessage boundary: a shared .ts type is a compile-time promise, not a runtime guarantee](#4-the-postmessage-boundary-a-shared-ts-type-is-a-compile-time-promise-not-a-runtime-guarantee)
   5. [The raw-DOM-sink gap: eslint-plugin-no-unsanitized, verified against source](#5-the-raw-dom-sink-gap-eslint-plugin-no-unsanitized-verified-against-source)
   6. [lit-html's unsafeHTML: the fleet's one real DOM-sink call site](#6-lit-htmls-unsafehtml-the-fleets-one-real-dom-sink-call-site)
   7. [Export-count and cohesion: model.ts vs. grim.ts, measured](#7-export-count-and-cohesion-modelts-vs-grimts-measured)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

---

## Summary

- A webview's default local-resource access is **not** "nothing" — it's the extension's install directory **plus the user's entire active workspace**; every `createWebviewPanel`/`resolveWebviewView` call must set `localResourceRoots` explicitly, not rely on the default ([source](https://code.visualstudio.com/api/extension-guides/webview)).
- `localResourceRoots` "does not offer complete security protection on its own" — VS Code's own docs require pairing it with a CSP ([source](https://code.visualstudio.com/api/extension-guides/webview)); grimoire-vscode does both, correctly, in one shared `webviewHtml()` helper (`src/views/html.ts`) used by all three panels.
- A nonce-based `script-src 'nonce-…'` is strictly tighter than the docs' own baseline example (`script-src ${webview.cspSource}`) — the latter permits *any* bundled script in the webview's asset root to run, the former permits only the one script tag stamped with that render's nonce. grimoire-vscode already uses nonce, matching Microsoft's own `webview-sample` exactly ([sample](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/webview-sample/src/extension.ts)).
- TypeScript types are erased at compile time — "type annotations never change the runtime behavior of your program" ([TS Handbook](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)) — so a `MessageEvent<HostToSidebar>` annotation on a `window.addEventListener('message', …)` callback is a **compile-time cast the receiver never checks**, not a guarantee about what actually arrived.
- VS Code's own canonical tutorial code for `onDidReceiveMessage`/`addEventListener('message', …)` does **zero runtime validation** — it switches on `message.command`/`message.type` straight off `event.data` ([source](https://code.visualstudio.com/api/extension-guides/webview)). An agent trained on this tutorial reproduces the same unguarded pattern.
- MDN's `postMessage` security section states the general principle directly: "you still should **always verify the syntax of the received message**. Otherwise, a security hole in the site you trusted to send only trusted messages could then open a cross-site scripting hole in your site" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)) — this is the correct answer to "trust the declared type or validate on receipt," and it holds even though the extension-host↔webview channel isn't literally cross-origin `window.postMessage` (see §4 and Contested/evolving).
- grimoire-vscode already has one correct example of validate-on-receipt: `settings.ts`'s `case 'openExternal'` runtime-tests the URL scheme (`/^https?:/.test(message.url)`) before calling `vscode.env.openExternal` — every other `SettingsToHost`/`SidebarToHost` case trusts the declared type alone.
- `eslint-plugin-no-unsanitized` v4.1.5's actual rule source (not its README) covers, by default: `method` rule → `insertAdjacentHTML()`, `document.write()`, `document.writeln()`, `Range#createContextualFragment()`, `setHTMLUnsafe()`, dynamic `import()`; `property` rule → `.innerHTML`, `.outerHTML` **only** ([method.js](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/method.js), [property.js](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/property.js)).
- **Correction to this program's own earlier claim**: neither rule covers `DOMParser#parseFromString()` or iframe `.srcdoc` by default — confirmed by reading `defaultRuleChecks` in both rule files directly. This contradicts a table in this same corpus's `typescript-topic-map/lint-catalogue-sweep.md`, which lists both as covered. Treat the rule source as authoritative.
- `eslint-plugin-no-unsanitized`'s peer dependency is `"eslint": "^9 || ^10"` ([npm](https://registry.npmjs.org/eslint-plugin-no-unsanitized/latest)) — compatible with grimoire-vscode's `^10.8.0` and vscode-ocx's `^10.5.0`; there is no version blocker to installing it.
- Without a recognized escaping-function pattern (`escapeHTML` template-tag) or the still-experimental Sanitizer API, `no-unsanitized` flags **every** dynamic sink assignment — this is why the sibling lint sweep marked it `adopt-as-rule-text` rather than `adopt`: the fleet has neither convention in place, so a hard gate would be 100% red with 0% signal.
- lit-html's `unsafeHTML` directive is explicitly **not** a sanitizer: "must be developer-controlled and not include untrusted content... Untrusted content rendered with this directive could lead to cross-site scripting" ([lit.dev](https://lit.dev/docs/templates/directives/)) — it uses `innerHTML` internally.
- grimoire-vscode's actual `unsafeHTML(md.render(markdown))` call renders registry-supplied README/description text — content that is *not* developer-controlled by lit's own definition. It is made safe by a different mechanism: `markdown-it` configured `html:false` (raw HTML in the source is inert), not by anything `unsafeHTML` itself provides. `no-unsanitized` would still flag this call site by default (it doesn't know about markdown-it's trust boundary) — a documented false positive, not a bug to "fix."
- Raw export count alone is not a checkable cohesion signal: `grim.ts` has 63 exports and is architecturally sound (32 types + 31 functions, but every function operates on the file's own locally-declared types); `webview/model.ts` has 94 exports and mixes 16 locally-declared types with 78 functions that primarily consume 18 types **imported from a different file** (`./protocol`) — that cross-file-type-consumption-plus-local-type-declaration pattern is the actual, grep-approximable signal, not the count.
- `settings/model.ts` (42 exports) has the identical shape to `model.ts` — both files' own header comments describe them as one deliberate "pure view-model builder, decoupled from vscode/DOM" layer, which is a legitimate architectural rationale, not an accident. This is a genuine judgment call, not a clean pass/fail — the mechanical signal should trigger a **review**, not an automatic violation.
- No enumerated rule in this program's own 1,460-row ESLint/Biome/oxlint catalogue sweep checks "max exports per file" or "mixed type+function exports" — this stays prose guidance (`adopt-as-rule-text`), not a lint gate, unless a custom rule is written.
- `acquireVsCodeApi()`'s returned object must never leak into global scope — stated explicitly in VS Code's own docs ([source](https://code.visualstudio.com/api/extension-guides/webview)) and followed correctly everywhere in grimoire-vscode (each `main.ts` keeps it in a module-scope `const`, never assigns to `window`).
- `postMessage` payloads travel via the structured-clone algorithm, not JSON — richer than JSON (can carry `Map`, `Date`, typed arrays) but VS Code's own guidance narrows this back to "any JSON serializable data," and every `*ToHost`/`HostTo*` union in grimoire-vscode is already JSON-shape-only (string/number/boolean/array/plain-object leaves) — worth stating as an explicit constraint so it stays true.

---

## Findings

### 1. The webview sandbox and why it's stricter than a browser tab

VS Code's own extension guide states the core reason plainly: **"Webviews run in isolated contexts that cannot directly access local resources. This is done for security reasons."** ([source](https://code.visualstudio.com/api/extension-guides/webview)). Mechanically, a webview is implemented as an iframe-like "active frame" inside the Electron renderer — the docs' debugging section confirms this by name: Developer Tools exposes "the **active frame** environment... where the webview scripts themselves are executed," distinct from the editor's own frame ([source](https://code.visualstudio.com/api/extension-guides/webview)).

Three defaults make this stricter than an ordinary web page:

- **JavaScript is off by default.** `enableScripts: true` must be passed explicitly. A normal browser tab runs script by default; a webview does not.
- **Local file access is scoped, not ambient.** A webview cannot load `file:` URIs directly — it must go through `Webview.asWebviewUri()`, and only inside `localResourceRoots` (see §3).
- **The extension host is a separate process**, not a DOM context at all — it's Node.js, not Electron-renderer JS. The two sides don't share a JS heap, a `window`, or a call stack; the only channel between them is the message-passing API in §4. This is a stronger boundary than same-process iframe isolation: even a full webview compromise (arbitrary JS execution inside the iframe) cannot directly call into extension-host code — it can only *send messages* the host chooses to act on, which is exactly why what the host does with an incoming message (§4) is the entire remaining attack surface.

grimoire-vscode's own `src/views/{sidebar,details,settings}.ts` all pass `enableScripts: true` deliberately (needed — the webviews are lit-rendered SPAs) and pair it with an explicit, narrow `localResourceRoots` (§3) and a shared CSP (§2) — the "limit capabilities" pattern the docs recommend as the first security best practice ("if your webview does not need to run scripts, do not set `enableScripts: true`... set `localResourceRoots` to `[]` or the minimum needed") ([source](https://code.visualstudio.com/api/extension-guides/webview)).

### 2. CSP in a webview: cspSource, the baseline policy, and nonce vs. cspSource for scripts

VS Code's docs give this as the minimal-but-real baseline, added as a `<meta http-equiv="Content-Security-Policy">` tag at the top of the webview's `<head>`:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource}; style-src ${webview.cspSource};">
```

`${webview.cspSource}` is "a placeholder for a value that comes from the webview object itself" ([source](https://code.visualstudio.com/api/extension-guides/webview)) — it resolves to the internal `vscode-webview://<uuid>` origin VS Code assigns that specific panel instance, so the policy only allows resources VS Code itself is willing to serve through `asWebviewUri`, not an arbitrary origin. `default-src 'none'` "also implicitly disables inline scripts and styles" — the docs call extracting all inline `<script>`/`<style>` to external files a "best practice" for this reason.

grimoire-vscode's actual policy, built once in `src/views/html.ts::webviewHtml()` and shared by all three panels:

```
default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource};
img-src ${webview.cspSource} data:; script-src 'nonce-${scriptNonce}';
```

This is **stricter than the docs' own baseline** in one specific way: `script-src 'nonce-${scriptNonce}'` instead of `script-src ${webview.cspSource}`. `cspSource` permits any script VS Code would serve from that webview's asset root; a nonce permits only the exact `<script nonce="…">` tag generated for that render. Microsoft's own `webview-sample` uses the identical nonce pattern (`getNonce()`, 32-char random alphanumeric, `script-src 'nonce-${nonce}'`) ([sample source](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/webview-sample/src/extension.ts)) — grimoire-vscode's independent `crypto.randomBytes(16).toString('base64url')` nonce generator matches this convention, not the docs' simpler tutorial-only example.

One deliberate deviation worth noting, not flagging: `img-src ${webview.cspSource} data:` instead of the docs' `https:`. This is because `createMarkdown()` (§6) allowlists `data:image/svg+xml;base64,…` URIs for inline registry-logo SVGs — a narrower `data:` carve-out than a blanket `https:` allowance, and scoped correctly (an `<img src="data:...">` cannot execute embedded `<script>`, even inside an SVG payload, because it's rendered as a raster/vector image resource, not parsed as a document).

### 3. localResourceRoots and asWebviewUri: the default is broader than assumed

This is the least-obvious fact in the whole guide and worth stating precisely, because it inverts the usual assumption that webviews are locked down by default:

> "By default, webviews can only access resources in the following locations: Within your extension's install directory. Within the user's currently active workspace." ([source](https://code.visualstudio.com/api/extension-guides/webview))

That second clause is the surprise: **omitting `localResourceRoots` does not mean "nothing local is reachable" — it means "the entire open workspace folder is reachable,"** including any file in it: `.env`, credential files, anything. `asWebviewUri()` is the only sanctioned way to turn a local `file:` path into something the webview's CSP/`img-src`/`script-src` will actually load, and it respects whatever `localResourceRoots` is set to.

grimoire-vscode restricts this correctly in all three call sites (`src/views/{sidebar,settings,details}.ts`):

```ts
localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')]
```

— narrower than either default clause: not the whole extension install dir, not the workspace at all, just the one built-asset directory the webview actually needs. The docs' own caveat matters here too: **"`localResourceRoots` does not offer complete security protection on its own"** — pair it with CSP (§2), which grimoire-vscode does.

### 4. The postMessage boundary: a shared .ts type is a compile-time promise, not a runtime guarantee

**The direct answer this deliverable was asked to give: a message crossing the webview boundary must be validated on receipt. It may not be trusted on its declared type alone.** The reason is architectural, not stylistic:

TypeScript's type system is fully erased before anything runs: **"Type annotations never change the runtime behavior of your program... type annotations were completely erased"** ([TS Handbook](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)). `HostToSidebar`, `SidebarToHost`, `HostToDetails`, `DetailsToHost`, `HostToSettings`, `SettingsToHost` (all in `src/webview/protocol.ts` and `src/webview/settings/model.ts`) exist purely at compile time. At runtime, `window.addEventListener('message', (event: MessageEvent<HostToSidebar>) => { const message = event.data; … })` is exactly as unchecked as `(event: MessageEvent<any>)` — the generic parameter is a note to the compiler that is gone by the time the callback actually runs.

Two independent facts make this a real gap, not a theoretical one:

1. **The channel isn't closed against a compromised sender within the trust boundary.** The webview and the extension host share the same code today, but "the code that was compiled" and "the code that is running" are only the same thing if nothing on the webview side has been altered — by an XSS foothold (§5–6), a supply-chain compromise in a bundled dependency, a stale webview bundle talking to a newer/older extension host after a partial reload, or (for the details panel, which renders markdown from a `grim describe` call against a registry) a malicious registry entry finding some path into executing script inside the webview. Once *any* JS runs inside the webview's frame, it can call `vscode.postMessage(anything)` — the `.ts` union type provides no protection against that call, because nothing on the receiving end reads it back.
2. **MDN's `postMessage` security guidance says this directly, independent of origin-spoofing concerns**: "Having verified identity, however, you still should always verify the syntax of the received message. Otherwise, a security hole in the site you trusted to send only trusted messages could then open a cross-site scripting hole in your site." ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)) This is the generic-web framing (checking `event.origin` before this), but the "verify syntax even from a trusted sender" half applies unmodified to the extension-host↔webview channel — see the origin-check caveat in Contested/evolving.

**VS Code's own canonical tutorial code validates nothing.** From the same guide's message-passing walkthrough:

```ts
panel.webview.onDidReceiveMessage(
  message => {
    switch (message.command) {
      case 'alert':
        vscode.window.showErrorMessage(message.text);
        return;
    }
  },
  undefined,
  context.subscriptions
);
```

`message` here isn't even typed — it's inferred `any` from the callback signature, and `message.text` flows straight into `vscode.window.showErrorMessage()` with no check ([source](https://code.visualstudio.com/api/extension-guides/webview)). This is the exact shape an LLM trained on the doc reproduces (see AI-agent angle §1).

**grimoire-vscode's actual practice is mixed — one correct example, most others untyped-trust.** `src/views/settings.ts`'s message switch:

```ts
// CORRECT — runtime-validates the scheme before a privileged call
case 'openExternal':
  if (/^https?:/.test(message.url)) {
    void vscode.env.openExternal(vscode.Uri.parse(message.url));
  }
  return;
```

```ts
// TYPE-TRUSTED ONLY — message.scope is typed 'project' | 'global' but
// never runtime-checked against that literal set before use
case 'switchScope':
  await this.postState(panel, message.scope);
  return;

case 'setValue':
  await this.write(panel, message.scope, message.key, [
    configSetArgs(message.key, message.value),
  ]);
  return;
```

The `openExternal` case is the fleet's one instance of exactly the pattern this deliverable recommends generalizing: a runtime guard sits between the message field and the privileged host API it drives. `setValue`/`addRegistry`/`switchScope` and most of the other ~15 cases in `SettingsToHost` don't have an equivalent guard — they pass `message.scope`/`message.key`/`message.value`/`message.alias` straight into CLI-argv builder functions (`configSetArgs`, `registryAddArgs`, …). This is lower-severity than a raw shell/DOM sink because every one of those builders returns an argv array consumed by `execFile` (not shell-interpolated — confirmed clean fleet-wide, see project brief), so there's no command-injection path; the residual risk is behavioral, not RCE: an out-of-union `scope` string reaching a config-write call that assumes only two literal values.

### 5. The raw-DOM-sink gap: eslint-plugin-no-unsanitized, verified against source

`eslint-plugin-no-unsanitized` ships exactly two rules, `method` and `property`, described in its own README as: "we will disallow assignments (e.g., to innerHTML) as well as calls (e.g., to insertAdjacentHTML) without the use of a pre-defined escaping function" ([README](https://github.com/mozilla/eslint-plugin-no-unsanitized)). Current version, read directly from the npm registry: **4.1.5**, `peerDependencies: { "eslint": "^9 || ^10" }` ([npm](https://registry.npmjs.org/eslint-plugin-no-unsanitized/latest)) — both grimoire-vscode (`eslint@^10.8.0`) and vscode-ocx (`eslint@^10.5.0`) satisfy this; no version blocker.

**What is actually covered**, read from the rule source itself rather than the docs summary (`defaultRuleChecks` object in each file):

`lib/rules/method.js` ([source](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/method.js)):
```js
const defaultRuleChecks = {
    insertAdjacentHTML:     { properties: [1] },           // 2nd arg
    import:                 { properties: [0] },           // dynamic import()
    createContextualFragment:{ properties: [0] },
    write:                  { objectMatches: ["document"], properties: [0] },
    writeln:                { objectMatches: ["document"], properties: [0] },
    setHTMLUnsafe:           { properties: [0] },
};
```

`lib/rules/property.js` ([source](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/property.js)):
```js
const defaultRuleChecks = {
    innerHTML: {},
    outerHTML: {},
};
```

**Correction to this program's own earlier work.** `typescript-topic-map/lint-catalogue-sweep.md` (same corpus, same fetch date) states the `method` rule covers `Range#createContextualFragment()` **and `DOMParser#parseFromString()`**, and the `property` rule covers `.innerHTML`, `.outerHTML`, **and iframe `.srcdoc`**. Both `DOMParser#parseFromString()` and `.srcdoc` are absent from the actual `defaultRuleChecks` objects above, and absent from the plugin's own rule docs (`docs/rules/method.md`, `docs/rules/property.md` — neither mentions `DOMParser` or `srcdoc` anywhere) and from `lib/ruleHelper.js` (the shared matching logic both rules delegate to — no `srcdoc`/`parseFromString` string appears in its 581 lines). **Treat the rule source as authoritative: as of v4.1.5 (2026-08-29), neither `DOMParser#parseFromString()` nor iframe `.srcdoc` assignment is guarded by this plugin's default configuration.** A webview/preload file using either sink today gets no lint coverage from this plugin and needs a manual-review note instead (see Normative guidance §7).

**The plugin's own caveat, confirmed**: both rules require either a hardcoded `escapeHTML` template-tag call, or the Sanitizer API's `.setHTML()`, to consider an assignment "sanitized" — without one of those two conventions already in place, "foo.innerHTML = input.value" is flagged regardless of whether `input.value` is actually attacker-reachable. grimoire-vscode has neither convention. This is exactly why the lint sweep marked both rules `adopt-as-rule-text` rather than `adopt`: turning this on as a hard CI gate today would be a 100%-flagged, 0%-actionable result, because the codebase's one real dynamic-HTML sink (`unsafeHTML`, §6) isn't even in this plugin's sink list — `unsafeHTML()` is a lit-html directive call, not one of the six method names or two property names above, so this plugin wouldn't catch grimoire-vscode's actual risk surface even if enabled. Its value here is prospective — it's the one framework-agnostic guard for any future raw-DOM code in a webview or a `webview:` preload script, not a fix for the code that exists today.

### 6. lit-html's unsafeHTML: the fleet's one real DOM-sink call site

grimoire-vscode is on `lit-html@3.3.3`. `unsafeHTML` is documented plainly as unsafe-by-name, not sanitizing-by-name: "Renders a string as HTML rather than text... the string passed to `unsafeHTML` must be developer-controlled and not include untrusted content. Examples of untrusted content include query string parameters and values from user inputs... Untrusted content rendered with this directive could lead to cross-site scripting (XSS)... `unsafeHTML` uses `innerHTML` internally" ([lit.dev](https://lit.dev/docs/templates/directives/)).

Two real call sites, both in the same shape:

```ts
// src/webview/render.ts:77
return description ? html`${unsafeHTML(md.renderInline(description))}` : '';

// src/webview/details/main.ts:174
litRender(markdown ? unsafeHTML(md.render(markdown)) : nothing, element);
```

`description` and `markdown` here are registry-supplied text (a package's README/description, fetched via `grim describe`) — by lit's own definition of "untrusted content," this is exactly the case the directive's docs warn about. What actually makes it safe is a separate mechanism entirely: `src/webview/markdown.ts`'s `createMarkdown()` constructs `markdown-it` with `{ html: false }`:

```ts
export function createMarkdown(): MarkdownIt {
  const md = new MarkdownIt({ linkify: true });
  const defaultValidate = md.validateLink.bind(md);
  md.validateLink = (url) =>
    /^data:image\/svg\+xml;base64,/i.test(url.trim()) || defaultValidate(url);
  return md;
}
```

`html: false` makes any raw HTML embedded in the markdown source inert (rendered as escaped text, not parsed as tags) — so `unsafeHTML()` only ever receives HTML that `markdown-it` itself generated from markdown syntax (`<p>`, `<a href>`, `<code>`, …), never HTML the untrusted source wrote directly. The one addition, an svg-data-URI carve-out in `validateLink`, is scoped narrowly (exact regex match on the data-URI prefix) and lands in `<img src="…">` context (§2), which cannot execute embedded script even for an SVG payload.

This is a legitimate, working trust boundary — but it is invisible to any lint rule that only knows about `unsafeHTML` as a call site, `no-unsanitized` included (it doesn't even list `unsafeHTML` as a sink — see §5) and any future generic "no raw-HTML-directive" rule (`no-unsanitized` doesn't reach lit's directive API at all). The correctness of this pattern lives entirely in the fact that `createMarkdown()`'s `html:false` config precedes every `unsafeHTML()` call in the data flow — a fact no automated tool here currently verifies, and the kind of invariant that silently breaks if someone "fixes" `html: false` to `true` for an unrelated reason (e.g., to support a markdown feature that needs raw HTML) without re-auditing every `unsafeHTML()` caller.

### 7. Export-count and cohesion: model.ts vs. grim.ts, measured

Exact counts (python3 `re.match(r'^export ', line)` over each file, cross-checked against `typescript-audit/code-shape.md`'s independently-derived numbers — they match):

| file | LOC | total exports | `interface`/`type` | `function`/`const`/`class` |
|---|---:|---:|---:|---:|
| `src/webview/protocol.ts` | 722 | 40 | 39 | 1 |
| `src/webview/settings/model.ts` | 676 | 42 | 8 | 34 |
| `src/webview/model.ts` | 1,917 | 94 | 16 | 78 |
| `src/grim.ts` | 1,057 | 63 | 32 | 31 |

**A raw type/function ratio does not separate "cohesive" from "kitchen sink."** `grim.ts` is a near-even 32/31 split and is architecturally sound; `model.ts` is 16/78 and is a genuine kitchen sink (per `typescript-audit/code-shape.md`'s own prior verdict, confirmed here by re-reading the code); `settings/model.ts` is 8/34, same shape as `model.ts`. Ratio alone doesn't distinguish these — the real signal is **what the functions operate on**:

- `grim.ts`'s 31 functions (`parseReport`, `isRetryable`, `searchArgs`, `configSetArgs`, `registryAddArgs`, …) are argv-builders and result-parsers for the `grim` CLI's own wire contract, and every one of them consumes or produces types declared **in this same file** (`GrimResult`, `ActionReport`, `Scope`, …). It imports exactly one external symbol (`registryFieldKey`/`RegistryFieldState` from `./webview/protocol`). One concern: "how to call `grim` and read its output."
- `model.ts` imports **18 types from a different file** (`./protocol`: `CardVM`, `InstallVM`, `SidebarState`, `RegistryVM`, `ScopesVM`, …) and its 78 functions (`buildCards`, `groupCards`, `cardMenuEntries`, `viewForTab`, `hasClientDrift`, …) are primarily UI viewmodel/reducer logic built *on those imported types* — not on the 16 types (`WireSearchItem`, `ScopeStatus`, `CardMeta`, `TreeNode`, …) this file itself declares. Two concerns share one file: a small wire-decode layer, and a large viewmodel-transformation layer that happens to be independently testable but doesn't need to live in the same module as the decode layer.
- `settings/model.ts` has the identical shape (imports 14 types from `../protocol`, declares 3 of its own, 34 functions mostly transform the imported ones).

**One honest caveat**, because a fully mechanical verdict here would overclaim: `model.ts`'s and `settings/model.ts`'s own header comments state a deliberate rationale — *"Pure view-model builders and reducers. No vscode, no DOM — fully unit-testable"* / *"same split as webview/model.ts."* Keeping wire-decode and viewmodel-reduction together because both must stay dependency-free of `vscode`/DOM for testability is a real architectural argument, not an accident. Whether that argument justifies one 1,917-line, 94-export file (vs., say, splitting decode from reduction into two dependency-free files) is a genuine judgment call this research cannot settle mechanically — see Normative guidance §9 for how to turn this into a checkable **flag**, not a checkable **verdict**.

---

## Normative guidance candidates

1. **Never omit `localResourceRoots` on `createWebviewPanel`/`resolveWebviewView`; set it to the narrowest directory the webview actually needs.**
   *Rationale*: the undocumented-by-assumption default is the extension install dir **plus the entire active workspace** — omitting the option is not "locked down," it's "scoped to everything open in the editor."
   *Verify*: grep every `createWebviewPanel(` / `resolveWebviewView(` call site's options object for a `localResourceRoots` key; flag any that lack one.

2. **Every webview's HTML must set a `<meta http-equiv="Content-Security-Policy">` starting from `default-src 'none'`, built through one shared helper if more than one panel exists in the repo.**
   *Rationale*: CSP is the second half of the pair VS Code's docs require alongside `localResourceRoots`; a shared helper (as grimoire-vscode's `html.ts::webviewHtml()` already is) keeps three panels' policies from drifting apart.
   *Verify*: grep for `Content-Security-Policy` in every file that sets `webview.html = …`; confirm all call sites route through the same function/string template rather than each hand-writing a policy.

3. **Prefer `script-src 'nonce-<random-per-render>'` over `script-src ${webview.cspSource}` for the script directive.**
   *Rationale*: nonce permits exactly the one script tag generated for that render; `cspSource` permits any script VS Code would serve from the webview's asset root — nonce is strictly tighter and matches Microsoft's own `webview-sample`, not just the tutorial's simplified baseline.
   *Verify*: grep the CSP `content` string for `script-src`; flag `${webview.cspSource}` in that position, require `'nonce-'`.

4. **Never assign a field read from `onDidReceiveMessage`/`addEventListener('message', …)` directly into a privileged sink — a filesystem path, a shell/CLI argv slot, `vscode.env.openExternal`, `vscode.Uri.parse`, a DOM-write sink (§5–6) — without a runtime check on that field first.** A declared `.ts` union type is erased before the program runs and provides zero protection once anything inside the webview's frame is compromised or stale.
   *Rationale*: TypeScript type erasure ([TS Handbook](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)) + MDN's postMessage guidance ("always verify the syntax of the received message... even from a trusted sender").
   *Verify*: for each `case` in an `onDidReceiveMessage`/message-listener switch, confirm a runtime guard (regex test, `typeof`, `in`, literal-membership check, or a schema-validator call) appears before the first use of a message field in a privileged call — mirror the existing `case 'openExternal': if (/^https?:/.test(message.url))` pattern in `settings.ts` as the reference example.

5. **For every union-typed enum field crossing the boundary (`scope: 'project' | 'global'`, `kind: ArtifactKind`, …), runtime-check literal membership before using the value, not just its declared type.**
   *Rationale*: a 2-or-5-value string union is exactly as unchecked at runtime as `scope: string` — the type only constrains what the *sender's own compiled code* is allowed to construct, not what a compromised or stale sender actually sends.
   *Verify*: grep handler bodies for parameters typed against a small string-literal union (`Scope`, `ArtifactKind`, `Density`, `ViewMode`, `GroupKey`); confirm a literal-membership `if`/`switch` precedes first use, not just a type annotation.

6. **Route every webview→host "open a URL"/"open a path" bridge through an explicit scheme or path allowlist**, generalizing the one correct example already in the codebase (`settings.ts`'s `/^https?:/.test(message.url)` before `vscode.env.openExternal`).
   *Rationale*: this is the fleet's own working reference implementation of validate-on-receipt — codify it as the required shape for any new bridge of the same kind rather than leaving it as one unexplained special case.
   *Verify*: grep all call sites of `vscode.env.openExternal(` / `vscode.Uri.parse(` fed by a value originating in a message handler; confirm each is preceded by an explicit scheme/pattern test.

7. **Install `eslint-plugin-no-unsanitized` (`method` + `property`, `^4.1.5`) as `adopt-as-rule-text` — documented as required reading, not gated in CI — for any repo shipping a webview or Electron/VS Code preload script, and separately document by hand that it does *not* cover `DOMParser#parseFromString()` or iframe `.srcdoc`.**
   *Rationale*: it's the only framework-agnostic guard for `.innerHTML`/`.outerHTML`/`insertAdjacentHTML()`/`document.write()`/`document.writeln()`/`Range#createContextualFragment()`/`setHTMLUnsafe()`/dynamic `import()` — but a hard CI gate today would be 100% flagged with 0% signal (no `escapeHTML`/Sanitizer-API convention exists in this fleet), and it wouldn't even catch grimoire-vscode's one real sink (lit's `unsafeHTML`, which isn't in its sink list) or the two sinks this program previously believed it covered but doesn't.
   *Verify*: `npm ls eslint-plugin-no-unsanitized`; grep eslint config for `no-unsanitized/method` / `no-unsanitized/property`; separately grep source for `DOMParser` / `.srcdoc =` / `createContextualFragment(` (only the last is plugin-covered) as a manual supplement.

8. **Any `unsafeHTML(...)` call (or an equivalent framework "render trusted HTML" directive) must trace its argument to either a compile-time string literal or the output of an `html:false`-configured markdown renderer / a sanitizer call (e.g. `DOMPurify.sanitize()`) — never directly to a fetched/registry/user-supplied string.**
   *Rationale*: lit's own docs state `unsafeHTML` "must be developer-controlled" and is not a sanitizer; the fleet's actual safety property lives in `markdown-it`'s `html:false` config, which is invisible to any sink-name-based lint rule and will silently break if that config is ever changed without re-auditing every `unsafeHTML()` caller.
   *Verify*: grep for `unsafeHTML(`; for each call site, trace the argument expression back to either (a) a literal, (b) a call into a function whose `markdown-it`/similar instance is constructed with `html: false` in the same file or an imported factory, or (c) a `DOMPurify.sanitize`/equivalent call — flag anything that traces to neither.

9. **Treat a file with ≥15 exports, at least one locally-declared `interface`/`type`, and at least one exported function whose parameter or return type is imported from a *different* file's type declarations as a cohesion-review flag, not an automatic violation** — the reviewer then applies the reading heuristic: do the file's functions primarily transform types this file itself declares (cohesive, e.g. `grim.ts`), or types declared elsewhere that this file merely consumes for an unrelated purpose (kitchen-sink candidate, e.g. `model.ts`/`settings/model.ts`)? A file whose exports are *almost entirely* `interface`/`type` regardless of count (e.g. `protocol.ts`, 39/40) is exempt outright — it's a wire contract, not a mixed module.
   *Rationale*: raw export count is neither necessary (`protocol.ts` at 40 is fine) nor sufficient (`grim.ts` at 63 is fine, `model.ts` at 94 is not) for flagging cohesion; the type/function *ratio* is also insufficient (`grim.ts`'s near-even 32/31 split is fine, `settings/model.ts`'s 8/34 split isn't automatically bad either — its own header comment gives a legitimate rationale). Cross-file-type-consumption-plus-local-type-declaration is the one signal that correctly separated all four measured files in this sweep, and it's the honest limit of what's mechanically checkable here — see Contested/evolving.
   *Verify*: for each file above the export threshold, list its `import type { … } from './other-file'` symbols, then grep whether any exported function's signature references one of those symbols — if yes, and the file also has ≥1 locally-declared `interface`/`type`, flag for a one-paragraph human read of the file's own header comment and export list before deciding split-or-keep.

10. **`postMessage`/webview-message payload types (`*ToHost`, `HostTo*`) must stay JSON-shape-only** — no class instances, `Map`, `Set`, `Date`, or function types in a union member, even though the underlying channel uses structured clone and could technically carry them.
    *Rationale*: VS Code's own docs describe the contract as "any JSON serializable data," and every existing union in this codebase already honors that; stating it explicitly stops a future addition from silently depending on structured-clone-only behavior (e.g. a `Date` field) that a JSON-based mock, snapshot test, or future non-Electron webview host wouldn't preserve.
    *Verify*: for every type referenced inside a `*ToHost`/`HostTo*` union, confirm it resolves (recursively) to `string | number | boolean | null | undefined | array | plain object` — flag any `class`, `Map<`, `Set<`, or `Date` reference.

11. **`acquireVsCodeApi()`'s return value must be stored once in a module-scope binding and never assigned to `window.*`/`globalThis.*`.**
    *Rationale*: stated directly in VS Code's docs — "you must keep the VS Code API object private and make sure it is never leaked into the global scope" — because the object exposes `postMessage`/`getState`/`setState`, and calling `acquireVsCodeApi()` a second time throws, so a global leak also breaks any other module that needs it.
    *Verify*: grep for `window.vscode =`, `globalThis.vscode =`, or any property assignment of the `acquireVsCodeApi()` result onto `window`/`globalThis`; confirm each `main.ts` calls it exactly once into a top-level `const`.

---

## AI-agent angle

1. **Reproducing VS Code's own untyped tutorial switch.** The canonical doc example (`switch (message.command) { case 'alert': vscode.window.showErrorMessage(message.text); }`) does no validation and isn't even typed. A model trained on this doc (and the many blog posts that copy it) will generate the same shape for a new message case. *Smallest check*: for every `case` inside an `onDidReceiveMessage`/message-listener switch that reaches a privileged call (§ Normative 4), confirm at least one runtime guard precedes first use of a message field — absence is the signal, not any specific missing check.

2. **Cargo-culting `event.origin` checks that don't apply here.** Generic web `postMessage` guidance (MDN, most XSS checklists) leads with "always check `event.origin`." Applied literally to a VS Code webview's `window.addEventListener('message', …)`, this is boilerplate that doesn't do the intended job: the channel isn't literally cross-window `postMessage` to an arbitrary origin (see Contested/evolving) — VS Code's own guide never mentions `origin` in its message-passing section at all. A model adding `if (event.origin !== '…') return;` here without also validating the payload's *shape* has added a check that looks like the standard fix but doesn't cover the actual threat model (a compromised or stale same-webview sender, not a spoofed foreign origin). *Smallest check*: an `event.origin` comparison inside a VS Code webview's message listener is not, by itself, evidence a message is validated — confirm a separate shape/field check exists too.

3. **Treating `unsafeHTML()` (or `dangerouslySetInnerHTML`/`v-html` muscle memory transplanted into lit) as "the sanitized way to render HTML."** Models fluent in React/Vue idioms sometimes reach for the nearest same-shaped API in an unfamiliar framework and assume parity of safety guarantees. lit's docs explicitly say the opposite: `unsafeHTML` is not sanitizing, "must be developer-controlled." *Smallest check*: grep for new `unsafeHTML(` call sites and confirm the argument traces to a literal or an `html:false`-configured renderer output (§ Normative 8) — a call whose argument is a raw fetched/`await`ed string with no such trace is the failure signature.

4. **Citing `eslint-plugin-no-unsanitized` as covering `DOMParser#parseFromString()` and iframe `.srcdoc`.** This exact overclaim exists in this program's own sibling research document, written the same day — plausible evidence this is a broadly-circulated, plausible-sounding but wrong claim in training-adjacent material (blog posts describing the plugin's *intent* rather than its shipped `defaultRuleChecks`). *Smallest check*: don't trust a rule-catalogue summary for exact sink coverage — read `lib/rules/method.js` and `lib/rules/property.js`'s `defaultRuleChecks` object directly (5 minutes, settles it definitively) before stating what a lint rule does or doesn't catch.

5. **Assuming a `default: assertNever(message)` branch on a discriminated union provides runtime safety.** This is a real and useful compile-time exhaustiveness check (it guarantees every *type-known* case is handled), but it does nothing when the runtime value's `type`/`command` field is a string the union never declared — e.g. an older webview bundle talking to a newer extension host after a partial reload, or a malformed message from a compromised sender. `assertNever` throwing at runtime on an actually-unexpected value is a crash, not a caught, logged, or safely-ignored case. *Smallest check*: confirm the `default`/fallback branch of a message switch does something safe at runtime (log-and-ignore, or a typed error boundary) for an unrecognized string, not only `assertNever(message)` used purely as a compile-time tool masquerading as a runtime handler.

6. **Suggesting `script-src ${webview.cspSource}` because it's the doc's first example**, silently loosening an existing nonce-based policy to match the tutorial rather than the codebase's own established (and stricter) convention. *Smallest check*: before adding or editing a webview's CSP `content` string, diff it against the CSP already used by sibling panels in the same repo — a new/different `script-src` strategy from the established one is the signal.

---

## Contested / evolving

- **Whether `event.origin`/`event.source` checks are meaningful for the VS Code extension-host↔webview channel at all.** Generic `postMessage` guidance (MDN) is written for arbitrary cross-window messaging where an attacker can navigate a window to a hostile origin and intercept or spoof messages. VS Code's own webview guide never uses the word "origin" anywhere in its message-passing sections, and the debugging section frames the webview as a distinct "active frame" managed entirely by VS Code, not a general same-process iframe an attacker could redirect. Whether the underlying transport is even susceptible to the classic cross-origin-spoofing threat MDN describes — as opposed to the different threat (a compromised sender *inside* the trust boundary, §4) — **could not be established from the sources read as of 2026-08-29**; treat "verify message syntax on receipt" as the settled half of the guidance and "check event.origin" as inapplicable boilerplate for this specific channel, not a settled negative.
- **The Sanitizer API's maturity.** `eslint-plugin-no-unsanitized`'s recognition of `.setHTML()` as a sanitized pattern implies some level of platform support, but this sweep did not independently verify current (2026-08-29) cross-engine (Chromium/Electron, which is what a VS Code webview actually runs on) shipping status of the HTML Sanitizer API beyond the plugin's own passing mention. Treat the Sanitizer-API escape hatch as unverified for this fleet's actual runtime until checked directly against the Electron/Chromium version VS Code currently ships.
- **This program's internal disagreement on `no-unsanitized` coverage is itself unresolved as of this writing** — `typescript-topic-map/lint-catalogue-sweep.md` (same corpus, same fetch date) states broader coverage than the rule source supports (§5). This document's numbers come from reading `lib/rules/*.js` directly; the discrepancy should be reconciled before either document is treated as final program output.
- **Whether a numeric export-count threshold belongs in a lint-gated rule at all.** No rule in this program's own 1,460-row ESLint/Biome/oxlint enumeration (`lint-catalogue-sweep.md`) checks this. The trend in the broader ecosystem (Biome's `nursery` rules, oxlint's rapid rule growth) is toward more structural/architectural lint coverage generally, but "max exports per file" specifically was not found shipping in any surveyed linter as of 2026-08-29 — this stays a custom-rule-or-prose decision, not a "just turn on rule X" one.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [code.visualstudio.com/api/extension-guides/webview](https://code.visualstudio.com/api/extension-guides/webview) | VS Code's official webview extension guide | Fetched 2026-08-29 | Primary vendor doc: CSP baseline, `localResourceRoots` default scope, `cspSource`, `asWebviewUri`, the full (unvalidated) `postMessage`/`onDidReceiveMessage` tutorial, security best-practices section |
| [code.visualstudio.com/api/references/vscode-api](https://code.visualstudio.com/api/references/vscode-api) | VS Code API reference | Fetched 2026-08-29 | Canonical signatures for `Webview`/`WebviewOptions`/`WebviewPanel` (`cspSource`, `asWebviewUri`, `postMessage`, `onDidReceiveMessage`, `localResourceRoots`) |
| [github.com/mozilla/eslint-plugin-no-unsanitized](https://github.com/mozilla/eslint-plugin-no-unsanitized) | Plugin README, `main` branch | Fetched 2026-08-29 | States the two rules' intent, install command, escaping-function/Sanitizer-API caveat |
| [lib/rules/method.js](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/method.js) | Rule source, v4.1.5 | Fetched 2026-08-29 | Ground truth for default sink coverage — primary source, not a doc summary |
| [lib/rules/property.js](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/lib/rules/property.js) | Rule source, v4.1.5 | Fetched 2026-08-29 | Ground truth: only `innerHTML`/`outerHTML`, no `srcdoc` |
| [docs/rules/method.md](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/docs/rules/method.md) + [property.md](https://raw.githubusercontent.com/mozilla/eslint-plugin-no-unsanitized/main/docs/rules/property.md) | Plugin's own per-rule docs | Fetched 2026-08-29 | Confirms the docs also never mention `DOMParser`/`srcdoc` — not just an oversight in the source |
| [registry.npmjs.org/eslint-plugin-no-unsanitized/latest](https://registry.npmjs.org/eslint-plugin-no-unsanitized/latest) | npm registry metadata | Fetched 2026-08-29 | Exact version (4.1.5) and peer-dependency range (`eslint ^9 \|\| ^10`) |
| [developer.mozilla.org/…/Window/postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) | MDN Web API reference | Fetched 2026-08-29 | Authoritative: structured-clone (not JSON) serialization; "always verify the syntax of the received message" even from a trusted sender |
| [lit.dev/docs/templates/directives](https://lit.dev/docs/templates/directives/) | Lit 3 official docs | Fetched 2026-08-29 | `unsafeHTML`'s explicit non-sanitizing warning, matches grimoire-vscode's actual usage exactly |
| [typescriptlang.org/docs/handbook/2/basic-types.html](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) | TypeScript Handbook | Fetched 2026-08-29 | Authoritative statement that type annotations are erased and never affect runtime behavior — the core justification for validate-on-receipt |
| [vscode-extension-samples/webview-sample/src/extension.ts](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/main/webview-sample/src/extension.ts) | Microsoft's official webview-sample source | Fetched 2026-08-29 | Canonical `getNonce()`/nonce-CSP helper — the pattern grimoire-vscode independently converged on |
| [github.com/cure53/DOMPurify README](https://raw.githubusercontent.com/cure53/DOMPurify/main/README.md) | DOMPurify's own README | Fetched 2026-08-29 | De-facto standard HTML sanitizer (v3.4.14 per the doc), reference point for "if you must render untrusted HTML directly, use this, not a hand-rolled escaper" |
| `/home/mherwig/dev/grimoire-lore/.agents/research/typescript-audit/code-shape.md` | This research program's own prior fleet-wide code-shape sweep | Same corpus, 2026-08-29 | Established the 94/63/42/40 export counts and the model.ts-kitchen-sink / grim.ts-cohesive verdicts this document builds on and partially re-derives independently |

Fleet code read directly and cited above (not web sources, listed for traceability): `grimoire-vscode/src/views/{html,sidebar,settings,details}.ts`, `grimoire-vscode/src/webview/{model,protocol,markdown,render}.ts`, `grimoire-vscode/src/webview/settings/model.ts`, `grimoire-vscode/src/webview/{sidebar,settings,details}/main.ts`, `grimoire-vscode/src/grim.ts`, `grimoire-vscode/package.json`, `vscode-ocx/package.json`.

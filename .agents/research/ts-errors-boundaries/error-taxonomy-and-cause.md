---
title: "Error taxonomy and Error.cause across the fleet's boundary shapes"
topic: "ts-errors-boundaries"
agent: "research-lang"
model: "claude-sonnet-5"
date_researched: "2026-08-29"
sources_count: 15
scope: >
  Covers Error.cause mechanics (semantics, printing, serialization, structured-clone
  survival), the fleet's two-population error-contract split (typed-and-tested CLIs/Action
  vs. bare-throw everything-else), and whether/where a central error classifier is
  mandatory. Does not cover exit-code value assignment itself (see the exit-code/CI
  research track), retry/backoff policy, or user-facing error-message copywriting.
---

## Table of contents

1. [Error.cause: syntax, semantics, and TS support](#1-errorcause-syntax-semantics-and-ts-support)
2. [What util.inspect / console.error do with a cause chain](#2-what-utilinspect--consoleerror-do-with-a-cause-chain)
3. [What survives JSON serialization](#3-what-survives-json-serialization)
4. [What survives structured cloning across a worker or webview boundary](#4-what-survives-structured-cloning-across-a-worker-or-webview-boundary)
5. [AggregateError, Promise.all, and Promise.any](#5-aggregateerror-promiseall-and-promiseany)
6. [When a rethrow must carry a cause, and when re-deriving is correct](#6-when-a-rethrow-must-carry-a-cause-and-when-re-deriving-is-correct)
7. [The fleet's split: exemplar, anti-pattern, and the silent majority](#7-the-fleets-split-exemplar-anti-pattern-and-the-silent-majority)
8. [Matching by `.name` vs `instanceof`: the dynamic-import and minification mechanics](#8-matching-by-name-vs-instanceof-the-dynamic-import-and-minification-mechanics)
9. [What the other seven repos need: no exit code to classify to](#9-what-the-other-seven-repos-need-no-exit-code-to-classify-to)
10. [Is one central classifier mandatory?](#10-is-one-central-classifier-mandatory)

---

## Summary

- `new Error(msg, { cause })` is the only correct call shape — the second argument is an **options object**, never the cause value itself; this is the single most common hallucinated shape ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)).
- `cause` has been typed in TypeScript's lib since **TS 4.6**, gated on `--target es2022` or `--lib es2022` — every repo in the fleet already targets ES2022 or newer, so no tsconfig change is needed to use it anywhere ([TS 4.6 notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html)).
- `console.error(err)` and `util.inspect(err)` print the **entire** `.cause` chain automatically, nested, with no depth cap — verified locally through 6 levels in Node v24.14.0. Losing a cause is a choice made at the `throw` site, not at the log site.
- `JSON.stringify(err)` on a bare `Error` (or on an object containing one) prints **`{}`** — `message`, `stack`, `name`, and `cause` are all non-enumerable own properties and JSON.stringify only serializes enumerable ones. Verified locally. Any logger that does `JSON.stringify(err)` for a structured log line is silently dropping the entire error, cause included.
- The fix for structured logging is `JSON.stringify(err, Object.getOwnPropertyNames(err))` — a property-name allowlist as the replacer, which (verified locally) recurses correctly through the full cause chain because the same allowlist is re-applied at every nesting level.
- Crossing a `worker_threads` boundary (`structuredClone`, `postMessage`) or a VS Code webview boundary is destructive to error identity: a custom subclass's `name` is coerced to plain `"Error"` unless it is one of the 7 built-in names, `instanceof CustomClass` becomes `false`, and any custom field (e.g. `.code`) is dropped outright — verified locally against Node's `structuredClone` and against the WHATWG structured-clone algorithm's exact 7-name allowlist (`Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError`) ([WHATWG spec](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)).
- `AggregateError` does **not** survive `structuredClone` either — its name isn't in the 7-name allowlist, so it degrades to a plain `Error` and `.errors` is silently discarded. Verified locally.
- VS Code's webview `postMessage` is documented as JSON-serializable data only, not structured-clone data — an `Error` posted across that boundary without manual flattening arrives even more degraded than a worker boundary (message-only, at best) ([VS Code webview guide](https://code.visualstudio.com/api/extension-guides/webview)).
- `Promise.all` rejects with **only the first** rejection reason; the rest are silently dropped. It does **not** produce an `AggregateError` — that is `Promise.any`'s behavior, and only when *every* input rejects (the opposite use case: "succeed if any," not "report all failures") ([MDN Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all), [MDN Promise.any](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any)). Nothing built-in gives "run N independent things, report every failure together" for free — that requires `Promise.allSettled` plus a manually constructed `AggregateError`.
- The fleet has 62 `Promise.all` call sites and zero `Promise.any`/`AggregateError` usage (grepped fleet-wide, 2026-08-29); most are fine (all-or-nothing is the right semantics), but any site fanning out independently-reportable work is silently swallowing sibling failures.
- `grimoire-indexer/src/cli/main.ts:82-91` matches error classes by `.name` string, not `instanceof`, **because the defining modules (`config.js`, `data/index.js`, `renderer/index.js`) are deliberately dynamic `import()`s** inside `build.ts`/`dev.ts`/etc. — `main.ts` never holds a static class reference to test `instanceof` against, so name-matching isn't a style choice there, it's the only mechanism available without forcing an eager import of every subsystem at CLI startup.
- Name-matching is only safe when the name is an **explicit string literal** set in the constructor (`this.name = "ConfigError"`). Verified locally with `esbuild --minify`: a minified bundle renames `class ConfigError` to `class r`, so `err.constructor.name` becomes `"r"`, while `err.name` (the string literal) is untouched. `grimoire-vscode` and `vscode-ocx` both minify their production esbuild output, so this distinction is live there today, not theoretical.
- `ocx-catalog` repeats the same `instanceof ConfigError` / `instanceof BuildError` mapping logic **three times, inline** (`cli/build.ts`, `cli/dev.ts`, and the `ci` command inside `cli/main.ts`), each a hand-copy of the same two branches — this is the anti-pattern: not "multiple call sites," but multiple *inlined re-derivations* of the same mapping, which drift independently.
- `ocx-catalog/src/config/load.ts:466-467` catches a `JSON.parse` `SyntaxError` and throws `new ConfigError("INVALID_JSON", ...)` with **no `cause`**, discarding the only detail (`"Unexpected token ... in JSON at position N"`) a bug report would need. Concrete, fleet-real instance of the "must carry a cause" rule being violated today.
- `Error.cause` is mandatory on a rethrow **only when a `catch` block is wrapping an antecedent caught value** with a new, more specific message; it is meaningless (there is nothing to attach) when an error is raised directly from a validation check with no caught exception behind it — `ocx-catalog`'s `ConfigError` constructions for `UNKNOWN_KEY`/`MULTIPLE_ROOT`/etc. are correctly cause-less because nothing was ever caught to attach.
- `useUnknownInCatchVariables` (default under `strict`, TS 4.4+) means every fleet repo already types `catch (err)` as `unknown`, not `any` — confirmed via `strict: true` in all sampled tsconfigs and zero `catch (err: any)` opt-outs found fleet-wide. Any narrowing pattern recommended below is not optional style; it's what the compiler already requires.
- `@typescript-eslint/only-throw-error` (renamed from `no-throw-literal`) is the rule that would catch "thrown non-Error values" fleet-wide, but it lives only in the **type-checked** config tier and needs type information to work — it cannot be turned on where type-aware linting isn't wired, which per Wave 1 is 8 of 9 repos.
- `Object.setPrototypeOf(this, X.prototype)` inside an `Error` subclass constructor is a TS-2.1-era workaround for `--target es5`'s broken `new.target` handling — every fleet tsconfig targets ES2022 or later, so an LLM adding this pattern today is adding dead code ([TS wiki](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work)).
- Verdict on centralization: **mandatory as one classifier *function*, not necessarily one call site.** A single process-exit boundary (the two CLIs, the Action) gets exactly one call site, matching `grimoire-indexer`'s `classify()`. A repo with multiple independent outward-facing boundaries (a VS Code extension's N command handlers, an SPA's N fetch-error toasts) should still route every boundary through one shared classification function — reused from N call sites — never N inlined copies of the same `instanceof` ladder, which is what `ocx-catalog` already got wrong.

## Findings

### 1. Error.cause: syntax, semantics, and TS support

The only correct constructor shape is a second **options object** argument:

```javascript
// correct
throw new Error("connecting to database failed", { cause: err });

// wrong — cause is silently ignored; this is `err` treated as a message
throw new Error("connecting to database failed", err);
```

`cause` accepts **any** value, not only `Error` instances — MDN's own example passes a plain object (`{ code: "NonInteger", values: [p, q] }`) as a structured cause rather than an Error ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)). `cause` is a non-enumerable, writable, configurable own property, set only when explicitly passed — there is no default.

V8/Chrome shipped it in Chrome 93 (Aug 2021); TC39's proposal is Stage 4 ([tc39/proposal-error-cause](https://github.com/tc39/proposal-error-cause)); its two-line motivation is exactly the fleet's problem: "Catching an error and throwing it with additional contextual information is a common approach... What has been missing so far is a standard way to chain errors" ([v8.dev](https://v8.dev/features/error-cause)).

TypeScript typed it starting at **4.6**, gated behind `--target es2022`/`--lib es2022` ("the `cause` option on `new Error` can be used either with this new `--target` setting, or with `--lib es2022`" — [TS 4.6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html)). Fleet tsconfig targets, read directly:

| repo | `target` |
|---|---|
| ocx-catalog | ES2022 |
| grimoire-indexer | ES2023 |
| grimoire-vscode | ES2022 |
| vscode-ocx | ES2022 |
| setup-ocx | ES2022 |
| fma | ES2022 |
| kate-middlechild | ESNext |

Every sampled repo is already at or above ES2022 — **`cause` is typed everywhere in the fleet today; adopting it is a zero-config change.**

### 2. What util.inspect / console.error do with a cause chain

Verified directly (Node v24.14.0, `console.error`/`util.inspect` on a 6-level `new Error(msg, {cause})` chain): both print the **full** chain, nested under a `[cause]:` key, with no default depth cutoff — util.inspect's normal object-depth default (2) does not apply to the cause chain. Node also collapses duplicate stack-frame lines shared between an error and its cause (`... 2 lines matching cause stack trace ...`) to keep the printed chain readable. Node's own docs confirm the property and its constructor shape but the depth/truncation behavior above was confirmed by direct execution rather than found written down on the current docs page ([Node errors.html](https://nodejs.org/api/errors.html)); **could not establish which Node release first introduced the duplicate-frame collapsing, as of 2026-08-29.**

Practical consequence: **logging correctness is decided entirely at the `throw` site.** If a cause was attached, every terminal `console.error(err)` downstream gets it for free. If it wasn't, no amount of clever logging recovers it.

### 3. What survives JSON serialization

```javascript
const err = new Error("x", { cause: new Error("y") });
JSON.stringify(err);              // "{}"            <- verified
JSON.stringify({ err });          // '{"err":{}}'    <- verified
JSON.stringify(err, Object.getOwnPropertyNames(err)); // full chain <- verified
```

`message`, `stack`, `name`, and `cause` are all non-enumerable own properties of an `Error` instance, so a bare `JSON.stringify` — the reflex move for "structured logging" — serializes none of them. The fix, a property-name array as the replacer, was verified locally to recurse correctly: because the replacer array is a key allowlist re-applied at every nesting level (not just the top), `cause.cause.cause…` all come through as long as `"cause"`, `"message"`, and `"stack"` are in the allowlist array.

### 4. What survives structured cloning across a worker or webview boundary

The WHATWG structured-clone algorithm's Error handling recognizes **exactly seven names** — `Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError` — and coerces anything else (a custom subclass's name, or `"AggregateError"`) to plain `"Error"` before serializing ("If name is not one of ... then set name to 'Error'" — [WHATWG spec](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)). `cause` is not in the algorithm's normative field list; the spec instead leaves room for "any interesting accompanying data" as an implementation choice, which is where Node's (and browsers') observed cause-preservation lives.

Verified locally, three scenarios:

| scenario | `.name` survives? | `instanceof <Subclass>` | custom field (`.code`) | `cause` |
|---|---|---|---|---|
| plain `Error`, `structuredClone` | yes (`"Error"`) | n/a | **no** | yes |
| `TypeError`, `structuredClone` | yes (built-in) | yes | n/a | yes |
| custom `ConfigError extends Error`, `structuredClone` | **no** → `"Error"` | **no** → `false` | **no**, dropped | yes |
| `AggregateError`, `structuredClone` | **no** → `"Error"` | **no** → `false` | `.errors` **dropped** | yes |
| custom `ConfigError`, `worker_threads` `postMessage` | **no** → `"Error"` | **no** → `false` | **no**, dropped | yes |

The `worker_threads` case is doubly deceptive: `console.log`ing the received error prints `ConfigError: bad worker config` because that literal text is already baked into the cloned `.stack` string from before serialization — but `err.name` itself reads `"Error"`, `err instanceof ConfigError` is `false`, and `err.code` is `undefined`. Code that looks right in a log line is silently wrong at runtime.

VS Code's webview channel is a further step down: its own docs describe `postMessage()` as sending "any JSON serializable data," not structured-clone data ([VS Code webview guide](https://code.visualstudio.com/api/extension-guides/webview)) — combined with finding #3 above, an `Error` thrown inside a webview and handed straight to `postMessage` is at real risk of arriving as `{}` on the extension-host side, not merely a demoted plain `Error`.

**Rule this grounds:** any error that must cross a `worker_threads`, `postMessage`, or webview boundary needs to be **explicitly flattened to a plain data shape** on the sending side (`{ name, message, stack, cause? }`, cause recursed manually) and never relied on for `instanceof` or custom fields on the far side.

### 5. AggregateError, Promise.all, and Promise.any

```javascript
// Promise.all: rejects with ONLY the first reason. Verified + MDN-confirmed.
Promise.all([p1, p2, p3]).catch(e => { /* e is p1's OR whichever rejected first — not an AggregateError, siblings gone */ });

// Promise.any: the one that produces AggregateError — but only when ALL reject.
Promise.any([p1, p2, p3]).catch(e => {
  e instanceof AggregateError; // true, only reachable if every promise rejected
  e.errors;                    // array, same order as input
});
```

"It rejects when any of the input's promises rejects, with this first rejection reason" ([MDN Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)); "[Promise.any] rejects when all of the input's promises reject... with an AggregateError containing an array of rejection reasons" ([MDN Promise.any](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any)).

Neither built-in answers "run N independent things and report every failure" — that is `Promise.allSettled` plus a manual `new AggregateError(rejected.map(r => r.reason), "N of M tasks failed")`. Fleet-wide grep: 62 `Promise.all` sites, 0 `Promise.any`, 0 `AggregateError` construction. Most `Promise.all` sites are legitimately all-or-nothing (parallel reads that are all required); this is not a blanket "replace Promise.all" finding — it is a targeted one for any site whose siblings are independently actionable (e.g. "refresh N independent panels, report which ones failed" is exactly `grimoire-vscode/src/extension.ts`'s per-round refresh shape, currently handled with a manual try/catch-and-log loop rather than `allSettled`+`AggregateError`, which is a reasonable alternative but should be a deliberate choice, not a default).

### 6. When a rethrow must carry a cause, and when re-deriving is correct

```typescript
// MUST carry cause: a catch block re-throws a MORE SPECIFIC error in response
// to something it caught. The original is otherwise unrecoverable.
// ocx-catalog/src/config/load.ts:466-467, as written today — the bug:
try {
  parsed = JSON.parse(raw);
} catch {
  throw new ConfigError("INVALID_JSON", `invalid JSON in ${configPath}`);
  // SyntaxError's "Unexpected token ')', ...at position 41" is gone forever.
}

// the fix:
try {
  parsed = JSON.parse(raw);
} catch (err) {
  throw new ConfigError("INVALID_JSON", `invalid JSON in ${configPath}`, { cause: err });
}
```

```typescript
// Correct WITHOUT a cause: no antecedent exception exists to attach.
// ocx-catalog/src/config/errors.ts pattern, unmodified:
if (typeof raw[key] !== "string") {
  throw new ConfigError("INVALID_TYPE", `${key} must be a string`); // nothing was caught
}
```

The rule is not about message quality, it's about whether a `catch` clause is in scope: **a cause is mandatory wherever a `catch` block constructs a new error in response to what it caught**, unless the caught value is a known sentinel with zero diagnostic content (rare — e.g. an internal control-flow signal). It is meaningless, not merely optional, at a direct validation-failure `throw` with no caught value behind it.

### 7. The fleet's split: exemplar, anti-pattern, and the silent majority

**Exemplar** — `grimoire-indexer/src/cli/exit.ts` + `main.ts:66-94`:

```typescript
// exit.ts — one named, typed vocabulary
export const EXIT = { ok: 0, failure: 1, usage: 64, data: 65, unavailable: 69 } as const;
export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
export class CliError extends Error {
  readonly code: ExitCode;
  constructor(message: string, code: ExitCode = EXIT.failure) { super(message); this.name = "CliError"; this.code = code; }
}
```

```typescript
// main.ts:66-94 — one function, unknown -> ExitCode, called from exactly one place (main.ts:239)
function classify(err: unknown, gate = false): ExitCode {
  if (err instanceof CommanderError) { /* ... */ }
  if (err instanceof CliError) { /* ... */ }
  if (err instanceof Error && "code" in err && err.code === "ERR_MODULE_NOT_FOUND") { /* ... */ }
  if (err instanceof Error && ["IndexValidationError", "SiteConfigError", "RenderInputError"].includes(err.name)) { /* ... */ }
  console.error(err instanceof Error ? err.message : String(err));
  return EXIT.failure;
}
```

`gate` exists because CI once read a `validate` exit of 0 as "eligible for auto-merge" while `--help`/`--version` short-circuited to exit 0 for unrelated reasons — a fail-closed branch earned by a real incident, not defensive boilerplate.

**Anti-pattern** — `ocx-catalog`, the same `ConfigError`/`BuildError` mapping copy-pasted three times (`cli/build.ts:37-46`, `cli/dev.ts:97-106`, the `ci` action inside `cli/main.ts:44-49`):

```typescript
// repeated verbatim in three files
if (err instanceof ConfigError) { process.stderr.write(...); process.exitCode = DATA; return; }
if (err instanceof BuildError) { process.stderr.write(...); process.exitCode = err.code === "UNAVAILABLE" ? UNAVAILABLE : DATA; return; }
throw err;
```

The classes themselves are well-designed (a closed `ConfigErrorCode`/`BuildErrorCode` union each, deliberate two-value `BuildErrorCode` "not... a per-cause enum"). The defect is structural, not the taxonomy: three independent copies of the *mapping* will drift the moment one call site gains a fourth branch and the other two don't.

**The silent majority** — per Wave 1, the other seven repos have zero typed error classes and 75 bare throws; `Error.cause` usage is zero fleet-wide (grepped again this session, confirmed). A representative terminal catch, `grimoire-vscode/src/extension.ts:200-208`:

```typescript
try {
  await runRefresh(next);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  output.appendLine(`refresh failed: ${message}`);   // stack discarded
}
```

This is a defensible per-round isolation pattern (comment explains: one bad round shouldn't abort the drain) — the defect is narrow and mechanical: it logs `.message` only, to a channel a user can copy-paste into a bug report, and throws away the one thing (`.stack`) that would make that report actionable.

`setup-ocx` — the Action — has **no custom Error subclass at all**, and its contract is different in kind from the CLIs': one top-level `try`/`catch` (`src/setup.ts:112-119`) narrowing with `instanceof Error` and reporting through `core.setFailed(error.message)`. It is centralized (one call site) but not typed — worth stating precisely rather than folding it into "same as the CLIs."

### 8. Matching by `.name` vs `instanceof`: the dynamic-import and minification mechanics

`main.ts:82-91` matches by string name specifically because `build.ts`/`dev.ts`/etc. dynamically `import()` `config.js`, `data/index.js`, and `renderer/index.js` (confirmed: `grep -n 'import(' src/cli/*.ts` shows all three as `await import(...)` inside the subcommand modules, never as a static `import` in `main.ts`). `main.ts` has no class reference to test `instanceof` against without eagerly loading every subsystem at CLI startup — string-matching is the only mechanism available under that lazy-load constraint, not a stylistic alternative to `instanceof`.

The mechanism only stays sound if the matched string is an **explicit literal set in the constructor**, not a derived name. Verified with `esbuild --minify --bundle` on a two-line repro:

```typescript
export class ConfigError extends Error {
  constructor(m: string) { super(m); this.name = "ConfigError"; }
}
```
minifies to (real output):
```javascript
var r=class extends Error{constructor(n){super(n),this.name="ConfigError"}};
```
and at runtime: `err.name === "ConfigError"` (survives — string literal) but `err.constructor.name === "r"` (mangled). `grimoire-vscode/esbuild.js:69` and `vscode-ocx/esbuild.js:38` both set `minify: production` — this is a live constraint for those two repos specifically, not a hypothetical one.

**Takeaway:** `instanceof` is safe whenever the checking code holds a static reference to the class in the same module graph — minification doesn't break `instanceof`, only name-derived matching. Use `instanceof` by default; drop to an explicit `.name === "literal"` string match only at a deliberate lazy-load boundary, and never match on `.constructor.name`.

### 9. What the other seven repos need: no exit code to classify to

`grimoire-indexer`'s `ExitCode` taxonomy is a good fit for a CLI precisely because a CLI has exactly one outward-facing value per invocation: the process exit code. A VS Code extension (`grimoire-vscode`, `vscode-ocx`) and a browser SPA (`fma`, `creeptd-ng/web`) have **no equivalent single value** — there is no "exit code" a command handler, a webview message handler, or a fetch-error toast maps to. Porting `ExitCode`-shaped typed classes into those repos would be building a taxonomy with nowhere to plug in.

What those shapes need instead is uniform at the *mechanism* level, not the *vocabulary* level: a **bare `Error` (or a thin subclass only where a caller genuinely branches on identity) carrying a `cause`**, funneled through one shared boundary function per outward channel (a command's catch, a webview's message handler, a fetch wrapper) that does exactly what `classify()` does structurally — narrow with `instanceof`/name, log the full chain, and produce whatever that channel's outward value is (a `vscode.window.showErrorMessage` string, an `OutputChannel` line, a toast). `setup-ocx`'s single `catch` → `core.setFailed` is the closest existing fleet exemplar of this shape, minus the typed vocabulary, because an Action's outward value (its `setFailed` message) is also a single value per run — closer to the CLIs than to the extension/SPA case.

### 10. Is one central classifier mandatory?

Yes, as a **function**, reused at every boundary — not necessarily as one call site. The CLIs and the Action have exactly one outward-facing value per run, so one call site is correct there (`grimoire-indexer/main.ts:239`, `setup-ocx/setup.ts:112`). An extension or an SPA has *multiple* independent outward-facing boundaries (N commands, N message handlers, N fetch call sites) that legitimately need N call sites — but every one of those N call sites should call the *same* mapping function, the way `ocx-catalog` should have called one `mapEngineError(err)` from all three of `build.ts`/`dev.ts`/`main.ts`'s `ci` action instead of inlining the same two `instanceof` branches three times. The defect in `ocx-catalog` is duplication of logic, not the count of call sites — "one classifier, many callers" and "one classifier, one caller" are both compliant; "N copies of the classifier" is the anti-pattern this fleet already has evidence of.

## Normative guidance candidates

1. **Every custom `Error` subclass forwards its `options` parameter to `super()`.** Rationale: a class that swallows the second constructor argument silently blocks every caller from ever attaching a `cause`. Verify: grep every `extends Error` constructor for a call to `super(` that does not forward a second parameter — `grep -rn "class .* extends Error" -A3` then check the `super(` line takes 2 args (or spreads `arguments`/an `options` param).

2. **Any `throw new <ErrorClass>(...)` inside a `catch` block must pass `{ cause: <caught binding> }`**, unless the caught value is a known content-free sentinel. Rationale: this is the only place the original diagnostic exists; once the `catch` block returns, it's gone (§6). Verify: no off-the-shelf lint rule does this today (checked `eslint-plugin-unicorn`'s rule list — no cause-specific rule exists); write a project ESLint rule, or as a manual heuristic, grep for `catch \(` blocks containing a `throw new` that does not contain `cause` on the same or an adjacent line.

3. **Never `JSON.stringify(err)` (or an object containing one) for a structured log line.** Rationale: verified locally — this produces `{}`, silently. Verify: `grep -rn "JSON.stringify(.*err" src/` and check each hit either passes `Object.getOwnPropertyNames(err)` as the replacer, or the target isn't actually an Error.

4. **Any `Error` crossing a `worker_threads` `postMessage`, a VS Code webview `postMessage`, or any other structured-clone/JSON boundary must be explicitly flattened on the sending side** to `{ name, message, stack, cause? }` (cause recursed manually) and never `instanceof`-checked or read for custom fields on the receiving side. Rationale: verified locally — custom subclass identity, custom fields, and `AggregateError.errors` do not survive; only the 7 built-in error names, `message`, `stack`, and (as an implementation-defined extra) `cause` do. Verify: grep every `postMessage(` call in `grimoire-vscode`/`vscode-ocx` (webview channel) whose payload can be or contain an `Error`, and every `parentPort.postMessage`/`worker.postMessage` fleet-wide; confirm each either flattens first or never carries an Error.

5. **Match error identity with `instanceof` whenever the class is statically imported in the same module/bundle; drop to an explicit `err.name === "Literal"` string match only where the defining module is deliberately dynamically imported — and never match on `.constructor.name`.** Rationale: verified via `esbuild --minify` — a minified bundle mangles class names but leaves `this.name = "Literal"` string assignments untouched; `grimoire-vscode` and `vscode-ocx` minify production builds today. Verify: grep for `.constructor.name` fleet-wide (should be zero uses in error-matching context); for every `err.name === "X"` / `.includes(err.name)` site, confirm a comment states why static import was avoided (as `main.ts:82-84` already does) — a name-match with no such comment is a smell.

6. **One classification function per outward-facing boundary shape, reused from every call site that needs it — never re-inlined per caller.** Rationale: `ocx-catalog`'s three-times-repeated `instanceof ConfigError`/`BuildError` ladder is exactly the failure mode a fourth call site will silently miss. Verify: for any repo with 2+ `catch` blocks mapping the same error-class set to the same kind of outward value, confirm they call one shared function rather than each containing its own `if (err instanceof X)` ladder — `grep -c "instanceof ConfigError"`-style counts >1 across distinct files is the smell.

7. **A CLI or Action's single process-exit / `setFailed` boundary gets exactly one classifier call site** (model: `grimoire-indexer/main.ts`'s `classify()`, called once at line 239). Rationale: a second call site for the same mapping is how `ocx-catalog`'s drift happened. Verify: grep the exit-code-mapping function's name — it should appear exactly once as a call (excluding its own definition and tests).

8. **A terminal `catch` (one that logs and swallows rather than rethrowing or setting an exit code) must log `.stack` or a serialized cause chain, not `.message` alone**, unless the destination is deliberately end-user-facing text where a stack would be noise/leak internals — in which case log the full chain to a *separate* diagnostic channel (an `OutputChannel`, `console.error`) in addition to the short user message. Rationale: `grimoire-vscode/extension.ts:200-208`'s `error instanceof Error ? error.message : String(error)` into an `OutputChannel` — a channel a user pastes into a bug report — discards exactly the trace that report needs, at zero cost to fix. Verify: grep terminal `catch` blocks (ones with no `throw`/`return` of the error) for `.message` used without `.stack` appearing anywhere in the same block.

9. **Enable type-aware linting before turning on `@typescript-eslint/only-throw-error`.** Rationale: the rule needs type information to distinguish an `Error`-typed throw from a literal/`unknown`/custom non-Error class — it lives in `plugin:@typescript-eslint/recommended-type-checked`, not the non-type-checked tier — and per Wave 1 only 1 of 9 repos has type-aware linting wired at all. Verify: `only-throw-error` (or its old name `no-throw-literal`) appearing in an ESLint config without `parserOptions.project`/`projectService` set is a no-op; check both are present together.

10. **Do not add `Object.setPrototypeOf(this, X.prototype)` inside an `Error` subclass constructor.** Rationale: it's a TS-2.1-era `--target es5` workaround for broken `new.target` propagation ([TS wiki](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work)); every fleet tsconfig targets ES2022 or newer, where it's dead code an LLM adds from habit. Verify: `grep -rn "setPrototypeOf(this" --include="*.ts"` should return zero hits fleet-wide; any hit is removable directly (confirm target ≥ ES2015 first, which is already established fleet-wide).

11. **A `Promise.all` fan-out whose members are independently reportable failures (not "all-or-nothing") should use `Promise.allSettled` and construct an explicit `AggregateError` from the rejected reasons — do not assume `Promise.all` or `AggregateError` do this automatically.** Rationale: `Promise.all` rejects with only the first reason (verified + [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)); `Promise.any`'s `AggregateError` only fires when *every* input rejects, the opposite condition. Verify: at each of the fleet's 62 `Promise.all` sites, a reading heuristic — does the surrounding code treat "any one fails" as "the whole operation should fail identically regardless of which"? If not (the caller cares which of several independent things failed), it's a candidate for `allSettled`+`AggregateError`.

12. **VS Code extensions and browser SPAs do not need an `ExitCode`-shaped typed error taxonomy; they need one shared boundary-mapping function per outward channel (command handler / message handler / fetch wrapper), operating on bare `Error` + `cause`.** Rationale: there is no single outward "exit code" value in those shapes for a taxonomy to map into (§9); porting the CLI's typed-class pattern there would build vocabulary with nowhere to plug in. Verify: a reading heuristic at review time — does a proposed new `*Error` subclass in `grimoire-vscode`/`vscode-ocx`/`fma`/`creeptd-ng` get `instanceof`-branched on by more than one caller? If not, a bare `Error` with `cause` is sufficient and the subclass is unrequested taxonomy.

## AI-agent angle

| what an LLM characteristically gets wrong | why (trained-era idiom or plausible-looking hallucination) | smallest mechanical check |
|---|---|---|
| `new Error(msg, err)` instead of `new Error(msg, { cause: err })` | Looks like a plausible two-arg constructor; older Node-internal error constructors did take positional extra args | `grep -rn "new [A-Za-z]*Error([^,]*, [a-z]" --include="*.ts"` and inspect: is the 2nd arg an object literal with `cause`, or a bare value? |
| Adding `Object.setPrototypeOf(this, X.prototype)` in every custom `Error` subclass | Dead ES5-target workaround, still floating around in blog posts/training data (§ normative #10) | `grep -rn "setPrototypeOf(this" --include="*.ts"` — any hit given fleet-wide `target >= ES2015` is removable |
| `catch (err: any) { err.message }` reflexively | Pre-TS-4.4 idiom, when catch bindings really were `any` | `grep -rn "catch (.*: any)" --include="*.ts"` fleet-wide (currently zero — keep it that way; flag any new occurrence in review) |
| Assuming `JSON.stringify(err)` "just works" for a structured log call | Plausible-looking, silently wrong (§3) — no error, no warning, just an empty object | `grep -rn "JSON.stringify(.*\berr\b" --include="*.ts"` and confirm a replacer/serializer is present |
| Assuming `instanceof CustomClass` still works after an error crosses a `postMessage`/webview/worker boundary | The received value prints correctly (stack text is baked in) so it *looks* right in a console log even though `instanceof` and custom fields are gone (§4) | Any `instanceof <CustomErrorClass>` check whose operand arrived via `postMessage`/`parentPort`/webview message — these should be flagged for manual review; the fix is flattening at the boundary (normative #4) |
| Assuming `Promise.all` produces an `AggregateError`, or that `AggregateError` is `Promise.all`'s error type | Superficially plausible naming association; the actual owner is `Promise.any`, the opposite success condition (§5) | Any code reading `err instanceof AggregateError` after a `Promise.all(...).catch(...)` — that branch is dead; `Promise.all` never produces one |
| Matching error identity via `err.constructor.name` instead of `err.name` | Both "look" equivalent in an unminified dev run; only one survives `esbuild --minify` (§8, verified) | `grep -rn "\.constructor\.name" --include="*.ts"` in `grimoire-vscode`/`vscode-ocx` specifically (both minify production builds) — any hit used for error-type matching is a live bug in production, not a style nit |
| Writing a new `*Error` subclass with its own `ErrorCode` union for a single-boundary extension/SPA command | Copies the CLI taxonomy pattern without checking whether there's an outward value for it to map to (§9/#12) | At review: does more than one caller `instanceof`-branch on the new class? If not, it's unrequested taxonomy — a bare `Error`+`cause` covers it |

## Contested / evolving

- **`Error.isError()`** is a newer static method (branded check, correctly rejects duck-typed fakes and works across realms where `instanceof Error` fails) — verified present and functioning in Node v24.14.0 locally, but MDN currently marks it **"Limited availability"**, not yet Baseline ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError)), and it is **not documented** on the current Node `errors.html` API page despite existing at runtime — a real doc/runtime lag. Given the fleet's Node floor still includes EOL Node 20 in three repos (Wave 1), and given the exact minimum Node version that ships `Error.isError` could not be established as of 2026-08-29, this is a watch item, not yet a fleet-wide rule. Trending toward adoption as the cross-realm-safe replacement for `instanceof Error` — worth revisiting once it's Baseline and the fleet's Node floor clears 20.
- **`@typescript-eslint/only-throw-error`'s type-checked requirement** is itself a moving target relative to this fleet: it cannot be recommended as an immediate rule addition without first closing the Wave-1-established type-aware-linting gap (1/9 repos). Whether that gap closes fleet-wide is an open, larger decision outside this document's scope — flagged here because it directly gates normative guidance candidate #9.
- **Whether `Promise.allSettled` + manual `AggregateError` construction, versus a hand-written per-item try/catch-and-log loop (the pattern `grimoire-vscode/extension.ts` already uses), is the "right" default for independently-reportable fan-out** is a genuine judgment call this research does not resolve fleet-wide — both are defensible; the loop is simpler and already fleet-idiomatic, `allSettled`+`AggregateError` is more uniform but has zero current fleet precedent (0 `AggregateError` construction sites found). Recorded as contested rather than settled.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [developer.mozilla.org/.../Error/cause](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause) | MDN reference | current, as fetched 2026-08-29 | canonical syntax/semantics for the constructor's `cause` option, including the non-Error-value example |
| [developer.mozilla.org/.../Promise/all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) | MDN reference | current | exact wording that `Promise.all` rejects with only the first reason — decisive for normative #11 |
| [developer.mozilla.org/.../Promise/any](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any) | MDN reference | current | exact wording for when `AggregateError` is actually produced (all-reject case, not any-reject) |
| [developer.mozilla.org/.../Error/isError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError) | MDN reference | current, "Limited availability" | newest realm-safe identity check; grounds the Contested/Evolving entry |
| [nodejs.org/api/errors.html](https://nodejs.org/api/errors.html) | Node.js API docs | current (v26 docs branch, as fetched) | canonical `error.cause` constructor shape in Node; baseline for what's officially documented (and what isn't — `Error.isError` absent) |
| [nodejs.org/api/globals.html#structuredclonevalue-options](https://nodejs.org/api/globals.html#structuredclonevalue-options) | Node.js API docs | current | confirms Node's `structuredClone` defers to the WHATWG algorithm with no Node-specific Error caveats documented — grounds why the WHATWG spec (next row) is the real source of truth |
| [html.spec.whatwg.org/.../structured-data.html](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal) | WHATWG HTML Standard | living standard | the exact 7-name allowlist that explains every structured-clone Error finding in §4 |
| [v8.dev/features/error-cause](https://v8.dev/features/error-cause) | V8 blog | 2021, still current guidance | engine team's own motivation and first-party example for `cause`; V8 93+/Chrome 93 shipped 2021 |
| [github.com/tc39/proposal-error-cause](https://github.com/tc39/proposal-error-cause) | TC39 proposal repo | Stage 4 | primary spec-process source; distinguishes `cause` (depth) from `AggregateError` (breadth) and `SuppressedError` (concurrent failure during handling) |
| [code.visualstudio.com/api/extension-guides/webview](https://code.visualstudio.com/api/extension-guides/webview) | VS Code extension API docs | current | states the webview `postMessage` channel is JSON-serializable data, not structured-clone data — directly relevant to `grimoire-vscode`/`vscode-ocx` |
| [typescriptlang.org/.../typescript-4-4.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html) | TS release notes | TS 4.4, 2021 | introduces `useUnknownInCatchVariables`, on-by-default under `strict` — grounds why every fleet catch binding is `unknown` |
| [typescriptlang.org/.../typescript-4-6.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html) | TS release notes | TS 4.6, 2022 | the exact line confirming `cause` becomes usable/typed at `--target es2022`/`--lib es2022` |
| [typescript-eslint.io/rules/only-throw-error](https://typescript-eslint.io/rules/only-throw-error/) | typescript-eslint rule docs | current (renamed from `no-throw-literal`) | confirms the rule needs type information and lives in the type-checked config tier, gating normative #9 |
| [github.com/sindresorhus/eslint-plugin-unicorn#rules](https://github.com/sindresorhus/eslint-plugin-unicorn#rules) | eslint-plugin-unicorn README | current | surveys the closest existing lint coverage for Error shape/naming (`custom-error-definition`, `error-message`, `catch-error-name`, `prefer-error-is-error`) and confirms no rule enforces `cause` usage — grounds normative #2's "write a custom rule" verdict |
| [github.com/microsoft/TypeScript/wiki/Breaking-Changes](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work) | TypeScript wiki | TS 2.1, 2016, historical | the exact origin and exact wording of the `Object.setPrototypeOf` workaround this document identifies as dead code fleet-wide |

Additional evidence generated directly rather than fetched (not URL-bearing, so kept out of the table above but load-bearing throughout): local execution against Node v24.14.0 (`console.error`/`util.inspect`/`JSON.stringify`/`structuredClone`/`worker_threads` behavior, §§2-4) and a local `esbuild --minify --bundle` run (§8, class-name mangling vs. `this.name` literal survival) — both in `/tmp/claude-1000/.../scratchpad/cause-test.mjs`, `cause-test2.mjs`, `worker-test.mjs`, and `minify-test.ts` this session; and direct reads of `grimoire-indexer/src/cli/{exit,main}.ts`, `ocx-catalog/src/{cli/{build,dev,main}.ts,config/{errors,load}.ts,build/errors.ts}`, `grimoire-vscode/src/extension.ts` and `esbuild.js`, `vscode-ocx/esbuild.js`, and `setup-ocx/src/setup.ts` under `/home/mherwig/dev`.

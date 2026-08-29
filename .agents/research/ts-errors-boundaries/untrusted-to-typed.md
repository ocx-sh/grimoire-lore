---
title: "The Untrusted-to-Typed Crossing"
topic: "Where `unknown` becomes typed in TypeScript, and what is forbidden on either side"
agent: scout (untrusted-to-typed)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 19
scope: |
  Covers: the single legal crossing point from `unknown` to a typed value; the
  cast-after-parse anti-pattern and how to grep for it; Zod (.parse vs
  .safeParse, z.infer, Zod 3→4 breaking changes), Ajv (JSONSchemaType<T>,
  ValidateFunction<T> as type guard, its actual fleet role), and
  StandardSchemaV1 as the shared-helper contract; every concrete boundary in
  the nine-repo fleet (JSON.parse, fetch().json(), process.env, CLI args,
  ocx.toml/catalog.config.json, protobuf/Connect-RPC, webview postMessage,
  CustomEvent bridges) with real file:line evidence; the minimum SPA error
  surface (React error boundary, Vue app.config.errorHandler).
  Does NOT cover: type-aware lint rule wiring (separate research thread),
  Error.cause/error-class taxonomy (separate thread), or non-TS runtimes.
---

## Table of contents

1. [Findings](#findings)
   1. [The one crossing point](#1-the-one-crossing-point)
   2. [Zod: the throw/Result split, versions, and what broke in v4](#2-zod-the-throwresult-split-versions-and-what-broke-in-v4)
   3. [Ajv: compiled validators as type guards, and JSONSchemaType<T>'s ceiling](#3-ajv-compiled-validators-as-type-guards-and-jsonschematypets-ceiling)
   4. [StandardSchemaV1: the ~60-line contract a shared helper should accept](#4-standardschemav1-the-60-line-contract-a-shared-helper-should-accept)
   5. [The cast-after-parse anti-pattern, found in the fleet](#5-the-cast-after-parse-anti-pattern-found-in-the-fleet)
   6. [Boundary-by-boundary: what guards what, today](#6-boundary-by-boundary-what-guards-what-today)
   7. [The ajv verdict: two repos, two different dead ends](#7-the-ajv-verdict-two-repos-two-different-dead-ends)
   8. [The SPA floor: no error boundary, and in one case no trace](#8-the-spa-floor-no-error-boundary-and-in-one-case-no-trace)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

## Summary

- The crossing point is singular and mechanical: `unknown` becomes a typed value **only** at a call to `.safeParse()`/`.parse()` (schema library), a compiled Ajv `validate()` call, or a hand-written `x is T` predicate that inspects every field — never at an `as T` cast, a `const x: T = ...` annotation on an untyped RHS, or a callback parameter's type annotation, because none of the three run any code.
- The fleet already runs the correct pattern in one place end-to-end: `creeptd-ng/web/src/composables/useLobbyWsClient.ts` and `src/bridge/eventContract.ts` parse to `unknown`, then narrow with hand-written `x is T` predicates, under a house rule literally commented `// quality-core: validate at boundary` (`useLobbyWsClient.ts:220`).
- **Correction to prior scope**: `creeptd-ng/web` has **no Zod dependency at all** — `grep -rn zod` across the whole repo (root `package.json`, `web/package.json`, `pnpm-lock.yaml`) returns zero hits. Its boundary discipline is entirely hand-rolled type predicates plus Connect-RPC/protobuf codegen, not Zod.
- `kate-middlechild`'s own rule file mandates "Zod at every external boundary" ([`.claude/rules/quality-typescript.md:58`](/home/mherwig/dev/kate-middlechild/.claude/rules/quality-typescript.md)) but the repo has **zero actual `from "zod"` imports** — the mandate is aspirational, exactly the same "rule claims it, code doesn't do it" pattern already found for type-aware linting.
- Ajv is present in two repos and validates **zero bytes of real runtime data** in either: `ocx-catalog`'s `ajv` is a `devDependency` used only by `test/config/schema-agreement.test.ts` to check that the published JSON Schema (for editor autocomplete) agrees with the hand-rolled loader; `vscode-ocx`'s `ajv` is likewise dev-only, used only by `src/test/schema.test.ts`, and the extension has **no runtime TOML-parsing code path at all** — it shells out to the real `ocx` binary via `execFile` for every read of `ocx.toml` ([`src/ocx.ts`](/home/mherwig/dev/vscode-ocx/src/ocx.ts), [`src/project.ts`](/home/mherwig/dev/vscode-ocx/src/project.ts)).
- The cast-after-parse anti-pattern is real in the fleet, in three flavors: literal `as T` (`fma/src/audio/sources/SpotifyAuth.ts:96,138`), a typed `const` binding on an untyped RHS (`ocx-catalog/src/theme/composables/useCatalog.ts:89`, `useImageIndex.ts:84`), and no type at all (`ocx-catalog/src/theme/composables/usePackageRoot.ts:150`) — the middle form is the one an AI agent will not recognize as a cast, because no `as` keyword appears.
- `fma` is pinned to Zod 3 (`^3.23.8`) and its code reads `result.error.errors` — Zod 4 **removed `.errors` entirely**, replacing it with `.issues` with no back-compat shim; upgrading fma's zod without touching `importExport.ts:32` breaks the build.
- `fma`'s `Graph` domain type (`src/graph/types.ts`) is hand-maintained separately from `graphSchema` (`src/graph/schema.ts`), even though the schema already exports `z.output<typeof graphSchema>` as `GraphParsed` — `importGraphFile` casts the validated `result.data as Graph` instead of returning the schema-derived type, so the two can silently drift and TypeScript cannot catch it.
- `ocx-catalog/src/sources/walker.ts:701` casts `JSON.parse(...) as { packages: Record<string, string> }` and then trusts every value as a `string` with no per-entry check — a genuine narrow miss even inside an otherwise well-validated loader.
- `Response.json()` returns `Promise<any>` by TS's own lib types, so every one of the fleet's four `.json()` call sites that assign into a typed variable or cast (`useCatalog.ts`, `useImageIndex.ts`, both `SpotifyAuth.ts` sites) is exactly as unchecked as an explicit `as T` — only `creeptd-ng/web/src/stores/useAuthStore.ts:117` (`await res.json() as unknown`, then `isSessionPayload()`) does it correctly.
- `process.env` is read raw (`string | undefined`) with zero schema validation anywhere in the fleet — `grimoire-indexer/src/cli/validate.ts`, `setup-ocx/src/{managed-config,project,download}.ts` all destructure CI/env vars directly with no shape check.
- Protobuf/Connect-RPC (`creeptd-ng/web`) is a structurally different crossing point: `fromBinary`/`fromJson` on a `@bufbuild/protobuf` generated schema can never fail into "wrong shape" (fields are guaranteed their declared scalar type by construction), but proto3's **implicit field presence** means an absent field and an explicitly-zero field decode identically — the "validation" it gives is type-safety, not domain-validation (non-empty, in-range, etc.), which the fleet's own hand-written predicates still have to supply on top.
- StandardSchemaV1 is a real, narrow (`~standard.validate`) interface already implemented by Zod, Valibot, and ArkType; Zod's own docs point library authors at it explicitly: "if you're building a library that accepts user-defined schemas... look into Standard Schema" — it is the correct type for a **shared/cross-repo** validation helper's input parameter, never a reason to add a schema library to a repo that currently gets by with hand-written predicates.
- Zod 4 ships `z.toJSONSchema()` (available since 3.23.0) — for `ocx-catalog` specifically, if the loader were ever rewritten in Zod, the editor-autocomplete JSON Schema could be *generated* from the Zod schema instead of hand-maintained as a sibling file kept in sync by a test, which would delete the schema-agreement test's entire reason to exist.
- TypeScript 7.0.2 is npm `latest` as of this research; the fleet spans four `typescript` eras (`^6.0.3` ×4 repos, `^5.9.3` ocx-catalog, `^5.8.0` kate-middlechild, `^5.7.x` fma and creeptd-ng/web) — none has moved to 7.x, and typescript-eslint's own tracking issue says the native/Go compiler ("tsgo") "is not stable and is many months away... won't likely be the primary stable version... within the next ~1-2 major versions of typescript-eslint," partly because ESLint itself has no async-parser support yet and tsgo's API will almost certainly be async.
- React's current guidance: error boundaries **must be class components** (`static getDerivedStateFromError` + `componentDidCatch`); there is no hook equivalent, and the docs themselves point to the community `react-error-boundary` package as the practical alternative to hand-writing the class.
- Vue's `app.config.errorHandler` is a single global sink (`(err, instance, info) => void`) covering render, event-handler, lifecycle, `setup()`, watcher, custom-directive, and transition-hook errors — it is necessary but not sufficient for *recovery* (it doesn't redraw a fallback UI by itself; that still needs `onErrorCaptured` at a boundary component or app-level state driving a fallback render).
- `fma` has neither a React error boundary nor a single `console.*` call anywhere in `src/` — an uncaught render error there is a white screen with literally no trace, confirming the brief's claim exactly.
- `creeptd-ng/web` also has no `app.config.errorHandler` or `onErrorCaptured`, but is not silent — it has 10 `console.*` call sites, so an uncaught error still leaves *some* signal, just no recovery path and no monitoring hook.

## Findings

### 1. The one crossing point

The rule the rest of this document exists to justify: **`unknown` becomes a typed value at exactly one kind of statement — a call that runs validation code and returns/throws based on what it finds.** Three constructs satisfy this:

1. `schema.parse(x)` / `schema.safeParse(x)` (Zod, Valibot, ArkType, anything implementing [StandardSchemaV1](#4-standardschemav1-the-60-line-contract-a-shared-helper-should-accept))
2. `validate(x)` where `validate` is an Ajv-compiled `ValidateFunction<T>`
3. `function isT(x: unknown): x is T { ... }` — a hand-written predicate that actually inspects every field it claims to guarantee

Everything else that *looks* like a crossing is not one, because the compiler erases it before any code runs:

```ts
// NOT a crossing — these all compile to a no-op at runtime.
const a = raw as T;
const b: T = raw;                 // raw's static type was `any` or `unknown`
function h(msg: T) { ... }        // annotating a postMessage/event callback param
```

The fleet's own best example of the real pattern, `creeptd-ng/web`'s WebSocket decoder, states the rule as a repo convention in its own comment: *"Each known `kind` has its required fields checked; a malformed payload... is rejected and returns null rather than flowing null into branded-type fields (quality-core: validate at boundary)."* ([useLobbyWsClient.ts](/home/mherwig/dev/creeptd-ng/web/src/composables/useLobbyWsClient.ts), lines 210–245).

### 2. Zod: the throw/Result split, versions, and what broke in v4

`.parse(x)` throws `ZodError` on failure; `.safeParse(x)` returns `{ success: true, data } | { success: false, error }` and never throws — the async twins `.parseAsync()`/`.safeParseAsync()` exist only for schemas with async refinements/transforms ([zod.dev/basics](https://zod.dev/basics)). Types are derived, never hand-written: `type X = z.infer<typeof schema>`, with `z.input`/`z.output` splitting pre-/post-transform shapes when they diverge ([zod.dev/basics](https://zod.dev/basics)).

```ts
// Good — derives the type, uses safeParse for a recoverable boundary
const result = tokenSchema.safeParse(raw);
if (!result.success) return null;
type Token = z.infer<typeof tokenSchema>;

// Bad — hand-maintained type the schema could already produce (fma's own gap)
export type Graph = { /* ...independently authored, drifts silently... */ };
const g = validated.data as Graph;   // asserts equivalence TS never checks
```

Zod's current `latest` npm tag is **4.5.2** ([registry.npmjs.org/zod](https://registry.npmjs.org/zod), fetched 2026-08-29; a `4.5.0-canary.20260828T171753` prerelease in the same feed confirms the tag is current, not stale). Zod 4's error shape uses `.issues`, not `.errors` — the v4 changelog is explicit: *"This API was an alias for `.issues` in Zod v3 but has been removed. Use `.issues` instead"* ([zod.dev/v4/changelog](https://zod.dev/v4/changelog)), with no back-compat shim. `fma` is pinned to `zod@^3.23.8` and its `importExport.ts:32` reads `result.error.errors` — the Zod-3 name. That single line is the entire blocker to bumping fma's zod major version.

Zod 4 also ships `z.toJSONSchema()` (feature present since 3.23.0 per [zod.dev/json-schema](https://zod.dev/json-schema)) — relevant directly to the `ocx-catalog` ajv verdict below, since it lets one Zod schema be both the runtime validator and the source of a published JSON Schema, with no second hand-maintained file to keep in sync.

### 3. Ajv: compiled validators as type guards, and `JSONSchemaType<T>`'s ceiling

`ajv.compile(schema)` returns a `ValidateFunction<T>` that **is itself a type guard** — `if (validate(data))` narrows `data` to `T` in that branch, and `validate.errors` holds structured failure detail otherwise ([ajv.js.org/guide/typescript.html](https://ajv.js.org/guide/typescript.html)). `JSONSchemaType<T>` is the companion utility that forces a hand-written JSON Schema object to structurally match an existing TS type, so the schema and the type cannot drift apart undetected for the shapes it can express. Its documented ceiling: *"JSON Schema is more complex and so `JSONSchemaType` has limited support for type safe unions"* and, separately, *"due to current limitation of TypeScript, `JSONSchemaType` cannot verify that every element of the union is present"* — meaning an incomplete union schema can still type-check ([ajv.js.org/guide/typescript.html](https://ajv.js.org/guide/typescript.html)). Ajv's npm `latest` is **8.20.0** ([registry.npmjs.org/ajv/latest](https://registry.npmjs.org/ajv/latest), fetched 2026-08-29).

`ocx-catalog`'s own test file is a working illustration of ajv-as-conformance-checker, not ajv-as-runtime-validator — the 2020-12 draft build is required specifically for `$defs`:

```ts
// test/config/schema-agreement.test.ts — ajv used ONLY to check schema/loader agreement
import { Ajv2020 } from "ajv/dist/2020.js";
const ajv = new Ajv2020({ allErrors: true, strict: true });
validate = ajv.compile(schema);
// ...compared fixture-by-fixture against loadConfig()'s own hand-rolled accept/reject
```

### 4. StandardSchemaV1: the ~60-line contract a shared helper should accept

The spec is a single property, `~standard`, carrying `version` (currently `1`), `vendor`, optional `types`, and a `validate` function returning either `{ value } | { issues }` synchronously or as a `Promise` ([github.com/standard-schema/standard-schema](https://github.com/standard-schema/standard-schema)). Zod's own docs name the exact use case: *"If you're building a library that accepts user-defined schemas to perform black-box validation, you may not need to integrate with Zod specifically. Instead look into Standard Schema. It's a shared interface implemented by most popular validation libraries in the TypeScript ecosystem... including Zod."* ([zod.dev/library-authors](https://zod.dev/library-authors)).

```ts
// A shared helper coupled to no specific validator
import type { StandardSchemaV1 } from "@standard-schema/spec";

async function validateWith<S extends StandardSchemaV1>(
  schema: S,
  input: unknown,
): Promise<StandardSchemaV1.InferOutput<S>> {
  const result = await schema["~standard"].validate(input);
  if (result.issues) throw new Error(JSON.stringify(result.issues));
  return result.value;
}
```

This is the correct contract for code that is genuinely shared *across repos with different validator choices* (a future `@ocx/config-loader` package, say). It is **not** a reason to add a schema library where a repo currently gets by on hand-written predicates — `creeptd-ng/web`'s `isSessionPayload`/`isGameStatePayload` guards are five lines each and cost nothing; StandardSchemaV1 buys nothing until the shape being validated is complex enough (nested discriminated unions, refinements, cross-field rules) that hand-writing genuinely risks drift.

### 5. The cast-after-parse anti-pattern, found in the fleet

Three flavors, same defect — the compiler runs zero code between the untyped value and the name that claims a shape for it:

```ts
// Flavor 1 — literal `as T` (fma/src/audio/sources/SpotifyAuth.ts:114)
try { return JSON.parse(raw) as TokenBundle; } catch { return null; }
// catches JSON *syntax* errors only; a shape-wrong-but-parseable object
// (e.g. `{}`) sails through as a fully-typed TokenBundle.

// Flavor 2 — typed binding on an untyped RHS, no `as` in sight
// (ocx-catalog/src/theme/composables/useCatalog.ts:89)
const data: CatalogData = await resp.json();   // .json(): Promise<any>

// Flavor 3 — no type annotation at all, but the value still flows
// straight into app state (ocx-catalog/src/theme/composables/usePackageRoot.ts:150)
const data = await resp.json();
root.value = data;   // implicit `any`, unguarded
```

And inside an otherwise careful validator, a narrower version of the same gap — trusting a cast's *value* type after only checking its *container* shape:

```ts
// ocx-catalog/src/sources/walker.ts:701
const { packages } = JSON.parse(new TextDecoder().decode(indexBytes))
  as { packages: Record<string, string> };
// `entries.length` is checked against MAX_INDEX_ENTRIES right below —
// but nothing ever confirms a given `digest` value IS a string before
// it's handed to processPackage() and eventually `.slice("sha256:".length)`.
```

Contrast the two-line fix already live elsewhere in the *same file* — `collectCasRefs` parses to `unknown`, checks `typeof`, and only casts after the check:

```ts
// ocx-catalog/src/sources/walker.ts:450-454 — the safe half of the same file
const parsed: unknown = JSON.parse(new TextDecoder().decode(rootBytes));
if (typeof parsed !== "object" || parsed === null) { throw new Error(...); }
const obj = parsed as Record<string, unknown>;   // cast AFTER the check, not before
```

### 6. Boundary-by-boundary: what guards what, today

| Boundary | Guarded how, and where | Verdict |
|---|---|---|
| `JSON.parse` (local file config) | `ocx-catalog/src/config/load.ts` — hand-rolled `expect*` functions, field-by-field, closed-key-set enforcement (`expectExactKeys`) | Correct: parses to `unknown` (line 465), never casts before checking |
| `JSON.parse` (registry index/manifest, wire data) | `ocx-catalog/src/sources/{walker,types}.ts` — mixed: `types.ts:431` does it right (`unknown` → `validateRootShape`), `walker.ts:701` casts first | Mixed — see §5 |
| `JSON.parse` (WebSocket push) | `creeptd-ng/web/src/composables/useLobbyWsClient.ts:226` — `unknown` → per-`kind` field guards | Correct |
| `JSON.parse` (localStorage token) | `fma/src/audio/sources/SpotifyAuth.ts:114` — `as TokenBundle`, no shape check | Anti-pattern (§5, flavor 1) |
| `JSON.parse` (user-uploaded file) | `fma/src/library/importExport.ts:29-34` — untyped `parsed`, then `graphSchema.safeParse(parsed)` | Correct pattern, undermined by the `as Graph` cast on the *output* (see §2) |
| `fetch(...).json()` | `ocx-catalog`'s three theme composables — two typed-binding casts, one fully untyped; `fma`'s two `SpotifyAuth.ts` sites — literal `as` casts; `creeptd-ng/web/useAuthStore.ts:117` — `as unknown` then `isSessionPayload()` | 5 of 6 sites unguarded; 1 correct |
| `process.env` | `grimoire-indexer/src/cli/validate.ts` (`GITHUB_ACTIONS`, `GITLAB_CI`, `GITLAB_USER_LOGIN`, `GITLAB_USER_ID`, `GITHUB_EVENT_PATH`); `setup-ocx/src/{managed-config,project,download}.ts` (`OCX_MANAGED_CONFIG`, `GITHUB_WORKSPACE`, `RUNNER_TOOL_CACHE`) | No repo validates env through a schema anywhere; every site is a raw `string \| undefined` read with ad hoc `??`/truthiness fallbacks |
| CLI arguments (commander) | `ocx-catalog/src/cli/main.ts` — `.action(async (opts: { check?: boolean }) => ...)` | Type-annotated only, same as a `.json()` typed binding — commander does not runtime-validate against the annotation; a caller passing `--check=maybe` is not rejected by the type, only by whatever downstream code happens to check truthiness |
| `ocx.toml` on disk | `vscode-ocx` never parses it in TS at all — `src/ocx.ts`/`src/project.ts` only locate the file and shell out to the real `ocx` binary (`execFileAsync`) for every read; the ajv+schema pair exists solely for `src/test/schema.test.ts` | Dead weight, not merely untested (§7) |
| `catalog.config.json` on disk | `ocx-catalog/src/config/load.ts` (see row 1) | Correct, and the ONE deliberately runtime-validated config-file boundary in the fleet |
| protobuf/Connect-RPC | `creeptd-ng/web/src/api/{leaderboardClient,lobbyClient}.ts` via `createClient(Service, transport)`; wire decode via generated `fromBinary`/`fromJson` | Type-safe by construction (a string field is guaranteed a string) but NOT shape-validated for domain rules — proto3 implicit presence means an absent field and an explicit zero decode identically, per [protobuf.dev/programming-guides/field_presence](https://protobuf.dev/programming-guides/field_presence/) |
| webview `postMessage` | `grimoire-vscode/src/views/sidebar.ts:226` — `onDidReceiveMessage((message: SidebarToHost) => ...)`; webview side `src/webview/sidebar/main.ts:820` — `window.addEventListener('message', (event: MessageEvent<HostToSidebar>) => ...)` | Type-annotated only on both ends — no runtime guard confirms `message.type` before the handler switches on it; `vscode-ocx` has no webview at all, so this boundary doesn't exist there |
| Bevy/WASM `CustomEvent` bridge | `creeptd-ng/web/src/bridge/eventContract.ts:130-170` — `unknown` → `isGameStatePayload`/`isOutcomePayload` guards, with a `console.warn` on rejection | Correct |

### 7. The ajv verdict: two repos, two different dead ends

**`ocx-catalog`**: `ajv` is a `devDependency` (`"ajv": "^8.18.0"`, `package.json` line 84). It is deliberate and documented — the loader's own doc comment states the contract explicitly: *"hand-rolled — no ajv or other schema-validator dependency at runtime; `schema/catalog.config.schema.json` is a published sibling artifact for editor tooling and test-suite schema-validity checks, never loaded here"* ([load.ts:352-358](/home/mherwig/dev/ocx-catalog/src/config/load.ts)). `test/config/schema-agreement.test.ts` keeps the two definitions honest by running 26 fixtures through both the hand-rolled loader and an `Ajv2020` compile of the published schema, and explicitly documents every place the two are allowed to disagree (`LABEL_CONFLICT`, `PATH_ESCAPE`, `siteUrl` shape, unsafe `nav[].link` values — each because JSON Schema genuinely cannot express the rule). **Verdict: keep as-is.** This is the fleet's one example of ajv used correctly — as a conformance harness for a published schema artifact, not as the runtime validator, with the drift risk actively tested.

**`vscode-ocx`**: same dependency (`"ajv": "^8.17.1"`, devDependency), same kind of vendored schema (`schemas/ocx.toml.schema.json`), but **no agreement test** and **no runtime consumer of either artifact** — worse than the brief's framing, because there is no TypeScript code anywhere in `src/` that parses `ocx.toml` content at all; every operation on the file shells out to the real `ocx` binary (`src/ocx.ts` `execFileAsync`, `src/project.ts` locates the path only). **Verdict: delete `ajv`, `smol-toml`, and `schemas/ocx.toml.schema.json` from this repo, or delete `src/test/schema.test.ts`** — as it stands the test asserts that a JSON Schema *file* is internally self-consistent against a handful of fixtures, which is a real but disconnected fact about a document nothing in the extension ever loads. Following the ladder: if the goal is "the vendored schema doesn't silently rot," either wire it into a real consumer (there is none to wire it into today) or drop it — a schema-fixture test for a schema nothing runtime-reads is scaffolding for a validator that was never built.

### 8. The SPA floor: no error boundary, and in one case no trace

React error boundaries are class-only in the current docs — *"There is currently no way to write an Error Boundary as a function component"* — built from `static getDerivedStateFromError(error)` (choose fallback state) and `componentDidCatch(error, info)` (side-effect logging); the same page recommends the community package as the practical route: *"you don't have to write the Error Boundary class yourself... you can use `react-error-boundary` instead"* ([react.dev/reference/react/Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)). An error boundary catches render, lifecycle, and constructor errors in its subtree; it explicitly does **not** catch event handlers, async code outside `startTransition`, SSR errors, or errors in the boundary itself.

Vue's equivalent is `app.config.errorHandler: (err: unknown, instance: ComponentPublicInstance | null, info: string) => void`, catching errors from renders, event handlers, lifecycle hooks, `setup()`, watchers, custom directives, and transition hooks ([vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler)) — but it is a *sink*, not a *boundary*: it does not by itself repaint a fallback UI the way React's boundary does; recovery still needs either `onErrorCaptured` on a component that can locally swap its own render, or `errorHandler` driving some global "something broke" state a top-level component watches.

**fma**: `grep -rn "componentDidCatch\|ErrorBoundary" fma/src` → 0 hits. `grep -rn "console\." fma/src` → 0 hits. An uncaught render error is a white screen, and nothing — not even a dev-console line — records that it happened.

**creeptd-ng/web**: `grep -rn "errorHandler\|onErrorCaptured" creeptd-ng/web/src` → 0 hits. Same white-screen-on-uncaught-render-error exposure, but `grep -rn "console\." creeptd-ng/web/src` → 10 hits, so at least ad hoc logging exists elsewhere in the codebase (mostly in the WS/bridge decoders shown in §5-6) — the gap here is recovery, not visibility.

## Normative guidance candidates

1. **Rule**: Every value crossing from `unknown`/`any` into a typed binding must pass through `.safeParse()`, a compiled Ajv `validate()`, or a hand-written `x is T` predicate — never an `as T` cast, a typed `const` binding on an untyped RHS, or a typed callback parameter.
   **Rationale**: the compiler runs no code for any of the three forbidden forms; only a real function call can reject bad data before it's trusted.
   **Verify**: `grep -rn '\.json() as \|JSON\.parse(.*) as [A-Z]' --include='*.ts' --include='*.tsx' --include='*.vue'` for the explicit-cast flavor; for the invisible flavor, grep every `.json()` call site (`grep -rn '\.json()'`) and manually confirm the line assigning its result is either `unknown`/untouched or immediately passed to a guard — a `const x: SomeInterface = await resp.json()` with no guard call on the next line is the violation.

2. **Rule**: `Response.json()`'s result must never be bound with an explicit interface/type annotation and must never be cast — bind it `unknown` (or let it infer `any` and immediately hand it to a guard on the next line).
   **Rationale**: `.json(): Promise<any>`, so `const data: T = await resp.json()` is textually indistinguishable from safety but has the exact same zero runtime check as `as T`.
   **Verify**: `grep -rn ': [A-Z][A-Za-z]* = await .*\.json()'` — any match is a candidate; confirm the next 1-3 lines contain a `safeParse`/`validate`/`isX` call, or flag it.

3. **Rule**: A hand-written type predicate (`x is T`) must check every field of `T` it claims to guarantee — a predicate that checks a discriminant (`typeof o.kind === "string"`) and then casts the rest without checking is only as strong as its checked subset.
   **Rationale**: partial predicates give a false sense of exhaustive validation; `ocx-catalog/src/sources/walker.ts:701`'s `{ packages: Record<string, string> }` cast checks the container (`entries.length`) but never each value's type.
   **Verify**: for each `function isX(v: unknown): v is X`, diff the fields checked against `X`'s own member list; flag any member not covered by an explicit `typeof`/`instanceof`/nested-guard check.

4. **Rule**: A schema's derived type (`z.infer`/`z.output<typeof schema>`) is the type returned from a parse function — never re-cast the validated `result.data` to a separately hand-maintained interface.
   **Rationale**: two independently authored shapes for the same data can silently diverge; TypeScript's structural typing will not catch a missing/renamed field across an `as` cast.
   **Verify**: for every `schema.safeParse`/`.parse` call, check the function's return type annotation — it should reference `z.infer<typeof schema>` (or the schema's own exported output type), not a separately declared interface. Fleet example to fix: `fma/src/library/importExport.ts:34` returns `result.data as Graph` where `schema.ts` already exports `GraphParsed = z.output<typeof graphSchema>`.

5. **Rule**: Before bumping a `zod` major version in any repo, grep that repo for `.errors` (not `.issues`) on a `ZodError`/`safeParse` result.
   **Rationale**: Zod 4 removed `ZodError.errors` with no compatibility alias — code written against Zod 3 examples silently type-errors (or, if `noImplicitAny`/strict mode is loose enough, silently reads `undefined`) after the bump.
   **Verify**: `grep -rn '\.error\.errors\|result\.errors' --include='*.ts'` in any repo about to upgrade `zod`; confirm each hit is not a Zod-3-era `.errors` access before merging the bump. Fleet example: `fma/src/library/importExport.ts:32`.

6. **Rule**: A schema-validator dependency (ajv, zod, or otherwise) that has no runtime call site is dead weight — delete the dependency and its schema artifact, or delete the test that exercises it in isolation, but do not leave both standing disconnected from any real data flow.
   **Rationale**: a schema file validated only against its own test fixtures documents nothing about what the shipped code actually accepts; it can drift from the real accepted shape forever without any test catching it, because no test compares it to the real shape.
   **Verify**: for each `ajv`/`zod`/`valibot` entry in `package.json`, grep the non-test `src/` tree for an import; zero hits means the dependency (and any schema files it compiles) belongs in the next cleanup pass. Fleet example: `vscode-ocx`'s `ajv` + `schemas/ocx.toml.schema.json`.

7. **Rule**: Every SPA (React or Vue) must ship at minimum one top-level error boundary (React: a class with `getDerivedStateFromError`+`componentDidCatch`, or the `react-error-boundary` package; Vue: `app.config.errorHandler` paired with a component that can render a fallback state) plus at least one `console.error`/logging call inside the catch path.
   **Rationale**: without a boundary, an uncaught render error is a permanent white screen; without a `console.*` call inside the handler, it leaves no trace to debug from, dev tools or otherwise.
   **Verify**: `grep -rln 'componentDidCatch\|getDerivedStateFromError\|ErrorBoundary'` for a React repo, `grep -rln 'errorHandler\|onErrorCaptured'` for a Vue repo — zero hits fails the rule outright regardless of console usage. Fleet gaps: `fma` (React, 0 hits, also 0 `console.*` anywhere), `creeptd-ng/web` (Vue, 0 hits, but has other `console.*` usage).

8. **Rule**: `process.env.X` reads that feed a CI-platform-detection or config-loading path must be behind one narrow, named accessor per variable (even a two-line `function readEnvVar(name): string | undefined`) rather than inline `process.env.FOO` scattered across call sites — this is the minimum bar before any schema is worth adding.
   **Rationale**: today every env read in the fleet is an inline, unvalidated string read with ad hoc `??`/truthiness fallbacks (`grimoire-indexer/src/cli/validate.ts`, `setup-ocx/src/{managed-config,project,download}.ts`); centralizing first is the cheap, ladder-respecting step before reaching for a schema library for what may be five or six variables.
   **Verify**: `grep -rn 'process\.env\.' --include='*.ts'` outside test files; count distinct variable names touched inline vs. through a named accessor function.

9. **Rule**: Do not add Zod, Valibot, or any schema library to a repo whose boundaries are already covered by short (≤10-line) hand-written `x is T` predicates, unless a new boundary's shape genuinely needs unions, refinements, or cross-field rules that a predicate would make unreadable.
   **Rationale**: `creeptd-ng/web` proves the hand-rolled pattern works and costs zero dependencies; per the ladder (stdlib/no-new-dep before a library), a schema library is justified by shape complexity, not by boundary-count alone.
   **Verify**: before approving a `zod`/`valibot` addition, read the guard(s) it would replace — if each is a flat object with ≤6 primitive-typed fields and no nested unions, the addition is not justified; escalate only when a guard would need >1 level of nested discriminated-union checking to stay correct.

10. **Rule**: For any repo standardizing shared, cross-repo validation helper code (not a single repo's own boundary code), the helper's public signature accepts `StandardSchemaV1`, not a concrete `ZodType`/`ZodSchema`.
    **Rationale**: couples the helper to an interface every major validator already implements rather than to one library's major version (relevant given `fma` is stuck on Zod 3 while a shared helper written against Zod 4's types would not compile against it).
    **Verify**: grep the helper's exported function signatures for `import type { ZodType`/`z\.ZodSchema` (fails the rule) vs. `import type { StandardSchemaV1 } from "@standard-schema/spec"` (passes).

## AI-agent angle

- **`.json() as T` and `const x: T = await resp.json()` read as "already typed" to a model that pattern-matches on TypeScript syntax** — nothing in the syntax distinguishes them from a real cast-of-checked-data, and an agent asked to "fetch and use the config" will reach for the shortest form that satisfies `tsc`, which is exactly this anti-pattern. **Mechanical check**: after any agent-authored `fetch(...)` + `.json()`, grep the next 5 lines for a `safeParse`/`validate`/`is[A-Z]` call; absence is a reject.
- **A model trained on a Zod-3-heavy corpus will write `result.error.errors`** on a `safeParse()` failure branch, which is silently wrong (not a compile error necessarily, since `ZodError` in v4 may still carry other loosely-typed properties, but `.errors` itself no longer exists) against any repo pinned to Zod 4 — and the reverse mistake (writing `.issues` against a Zod-3-pinned repo like `fma`) equally breaks. **Mechanical check**: before accepting agent-generated Zod error-handling code, `grep package.json` for the pinned `zod` major and confirm `.issues` (v4) vs `.errors` (v3) matches it.
- **A model will hallucinate that Ajv validates at runtime just because it's a project dependency**, and write new code that imports the vendored JSON Schema and assumes some other part of the app already checks incoming data against it — as this research found is literally false for `vscode-ocx`'s `ocx.toml.schema.json`. **Mechanical check**: `grep -rln "from 'ajv'\|from \"ajv\""` outside `test/`/`src/test/` directories before trusting that a repo's data is ajv-validated anywhere real.
- **A model will confidently write `static getDerivedStateFromError` on a function component** (mirroring how every other modern React lifecycle concept has a hook equivalent) — there is none; React's own docs state this outright. **Mechanical check**: `grep -rn "function.*getDerivedStateFromError\|const.*getDerivedStateFromError"` — any non-class-method match is invalid code that will not compile as a lifecycle hook (it's just an inert static-looking function on a function component).
- **A model asked to "handle the postMessage" in a VS Code webview will annotate the event/message parameter's type and consider the boundary handled** (exactly what `grimoire-vscode`'s own sidebar code does today, at both ends) — the annotation compiles clean and looks identical to real validation. **Mechanical check**: grep every `onDidReceiveMessage((message: X)` and `addEventListener('message', (event: MessageEvent<X>)` call site fleet-wide; confirm the handler body's first statements narrow `message`/`event.data` with a runtime discriminant check (a `switch`/`if` on a literal string field checked with `typeof`), not just a `switch (message.type)` that trusts the annotation.
- **A model given "generate the JSON Schema for this Zod schema" or vice versa may not know `z.toJSONSchema()` exists** (a Zod-4-era, not Zod-3-era, capability — absent from most Zod-3-trained examples) and will instead hand-write a parallel JSON Schema file, recreating exactly the dual-maintenance problem `ocx-catalog`'s `schema-agreement.test.ts` exists to police. **Mechanical check**: before an agent hand-authors a new sibling JSON Schema file next to an existing Zod schema in a Zod-4-pinned repo, confirm `z.toJSONSchema()` genuinely cannot express the needed shape before accepting the hand-written duplicate.

## Contested / evolving

- **Whether ajv or Zod should be the fleet's single validator, if one is chosen at all**: as of 2026-08-29 there is no fleet-wide pressure either way — ajv's only live use is a dev-only conformance-test pattern (§7) and Zod's only live use is one SPA (`fma`) on a two-plus-year-old major version. The stronger, less contested direction (below) is: don't pick one library fleet-wide, converge shared *code* on `StandardSchemaV1` instead, and let each repo's own boundary complexity decide whether it needs a library at all (§9-10 above). This is the current direction Zod's own docs push library authors toward, and it sidesteps the Zod-3-vs-4 split entirely.
- **TypeScript 7.x adoption timing**: `typescript` npm `latest` is 7.0.2, but typescript-eslint's own tracking issue (read 2026-08-29) describes the native/Go compiler as "many months away" from being the primary stable target, blocked partly on ESLint itself lacking async-parser support that a Go-hosted TS server will almost certainly require. None of the fleet's four TS eras (`^6.0.3`, `^5.9.3`, `^5.8.0`, `^5.7.x`) has moved past 6.x; this is squarely a "not yet, and not clearly soon" situation, not a contested design opinion — could not establish a firmer timeline than the issue's own "1-2 major versions of typescript-eslint" as of 2026-08-29.
- **Whether `app.config.errorHandler`/an error boundary alone is "enough" for an SPA, versus pairing it with a dedicated crash-reporting SDK**: current Vue and React docs describe the mechanism but stop short of mandating a reporting backend; this research found no fleet repo with either the mechanism or a reporting SDK, so the fleet's gap (§8) is prior to this debate, not a participant in it.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/standard-schema/standard-schema](https://github.com/standard-schema/standard-schema) | Primary spec repo for StandardSchemaV1 | Current as of fetch, 2026-08-29 | Defines the exact `~standard.validate` shape a library-agnostic helper should accept |
| [zod.dev](https://zod.dev/) | Zod official docs, landing page | Zod 4, "4.5 was recently released" per page | Confirms Zod 4 is the current stable major and gives the top-level API shape |
| [zod.dev/basics](https://zod.dev/basics) | Zod official docs, core usage | Zod 4 | `.parse` vs `.safeParse` vs async twins, `z.infer`/`z.input`/`z.output`, verbatim |
| [zod.dev/library-authors](https://zod.dev/library-authors) | Zod official docs, library-authoring guidance | Zod 4 | Explicit endorsement of Standard Schema for library-agnostic validation |
| [zod.dev/error-customization](https://zod.dev/error-customization) | Zod official docs, error shape | Zod 4 | `ZodError.issues` shape (code/path/message) |
| [zod.dev/v4/changelog](https://zod.dev/v4/changelog) | Zod official migration/changelog | Zod 4 | Primary source for `.errors` → `.issues` removal (no back-compat), other breaking parse/coerce/default changes |
| [zod.dev/json-schema](https://zod.dev/json-schema) | Zod official docs, `z.toJSONSchema()` | Zod 4 (feature since 3.23.0) | Grounds the "generate, don't hand-maintain, the sibling JSON Schema" recommendation for `ocx-catalog` |
| [ajv.js.org/guide/typescript.html](https://ajv.js.org/guide/typescript.html) | Ajv official guide, TypeScript integration | Ajv 8.x docs | `ValidateFunction<T>` as type guard, `JSONSchemaType<T>`, its documented union-safety ceiling, verbatim quotes |
| [ajv.js.org/guide/getting-started.html](https://ajv.js.org/guide/getting-started.html) | Ajv official guide | Ajv 8.x docs | Confirms "install ajv version 8" as the current guidance baseline |
| [registry.npmjs.org/typescript/latest](https://registry.npmjs.org/typescript/latest) | npm registry API | Fetched 2026-08-29 | Primary confirmation `typescript@latest` = 7.0.2 |
| [registry.npmjs.org/ajv/latest](https://registry.npmjs.org/ajv/latest) | npm registry API | Fetched 2026-08-29 | Primary confirmation `ajv@latest` = 8.20.0 |
| [registry.npmjs.org/zod](https://registry.npmjs.org/zod) | npm registry API, full version/dist-tags feed | Fetched 2026-08-29 | Primary confirmation `zod@latest` = 4.5.2, with a same-week canary proving currency |
| [react.dev/reference/react/Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) | React official reference docs | Current React docs | Class-only error boundary requirement, exact lifecycle methods, what it does/doesn't catch, `react-error-boundary` pointer |
| [vuejs.org/api/application.html#app-config-errorhandler](https://vuejs.org/api/application.html#app-config-errorhandler) | Vue official API reference | Vue 3 current docs | `app.config.errorHandler` exact signature and coverage (render/event/lifecycle/setup/watcher/directive/transition) |
| [typescript-eslint.io/blog/announcing-typescript-eslint-v8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8) | typescript-eslint official blog | v8 announcement | Confirms typescript-eslint v8's own supported TS range, context for the TS-7 gap |
| [github.com/typescript-eslint/typescript-eslint/issues/10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) | typescript-eslint GitHub tracking issue, primary maintainer commentary | Read 2026-08-29 | Direct quote on tsgo/TS-7 stability timeline and the async-parser blocker |
| [devblogs.microsoft.com/typescript/announcing-typescript-native-previews](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/) | Official TypeScript team blog | Native/Go port announcement | Confirms the programmatic API layer was, at announcement, explicitly early-stage/unsettled |
| [protobuf.dev/reference/protobuf/proto3-spec](https://protobuf.dev/reference/protobuf/proto3-spec/) | Official Protocol Buffers language spec | Current proto3 spec | Confirms `optional` is an explicit modifier, points to the Field Presence guide |
| [protobuf.dev/programming-guides/field_presence](https://protobuf.dev/programming-guides/field_presence/) | Official Protocol Buffers programming guide | Current, notes Editions 2023+ change | Primary source for proto3 implicit-presence behavior (absent field == zero value) and how Editions changes it |

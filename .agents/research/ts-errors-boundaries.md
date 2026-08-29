---
title: "Errors and boundaries: what a throw must carry, and where `unknown` stops being unknown"
topic: "ts-errors-boundaries"
model: "opus"
consolidates:
  - "ts-errors-boundaries/error-taxonomy-and-cause.md"
  - "ts-errors-boundaries/untrusted-to-typed.md"
date: "2026-08-29"
---

## Verdict

1. **`Error.cause` is mandatory on every throw that originates inside a `catch` block**, and meaningless anywhere else. The fleet has zero uses across nine repos ([implemented-contracts.md:193-195](typescript-audit/implemented-contracts.md)), so every rethrow today destroys the only diagnostic that existed. It is a zero-config change: every fleet tsconfig targets ES2022+, where TS has typed `cause` since 4.6.
2. **A typed error class is earned, not default.** The two CLIs' taxonomy (105 of 115 typed throws) is correct because a CLI has exactly one outward value per run. An extension command handler, a webview message handler and a fetch-error toast have no such value — porting `ExitCode`-shaped classes there builds vocabulary with nowhere to plug in. Those shapes get bare `Error` + `cause`, funnelled through one shared boundary function.
3. **One classifier *function*, any number of callers; never N inlined copies.** `ocx-catalog` has the same `instanceof ConfigError`/`BuildError` ladder hand-copied into three files. That is the defect — not the call-site count, which is legitimately 1 for a CLI and N for an extension.
4. **`unknown` becomes typed at exactly one kind of statement: a call that runs code.** `.safeParse()`, a compiled Ajv `validate()`, or a hand-written `x is T` predicate. `as T`, a typed `const` on an untyped RHS, and a typed callback parameter are all erased before anything runs. The middle form is the dangerous one — no `as` keyword appears, so it reads as already-validated.
5. **The fleet does not standardise on a validator.** Ajv validates zero runtime bytes in both repos that depend on it; Zod lives in one SPA on a two-major-old pin. Shared cross-repo helpers take `StandardSchemaV1`; individual repos keep hand-written predicates until a shape genuinely needs nested unions or cross-field rules.
6. **Every verification in this ruleset is grep-based or a reading heuristic, never a type-aware lint rule.** `@typescript-eslint/only-throw-error` is the obvious tool and it is unavailable in 8 of 9 repos. A ruleset whose enforcement is blocked on an unwired lint tier does not enforce anything.
7. **`Error.isError()` is not adopted.** Present in Node 24 but MDN-"Limited availability", undocumented on Node's own errors page, and three repos still floor on EOL Node 20. `instanceof Error` stays.
8. **Conflict resolved — does the fleet validate after `JSON.parse`?** [runtime-posture.md:252-253](typescript-audit/runtime-posture.md) says "119 sites; none of the ones inspected skip validation". `untrusted-to-typed` produced four counterexamples at file:line ([fma SpotifyAuth.ts:114](/home/mherwig/dev/fma/src/audio/sources/SpotifyAuth.ts), [ocx-catalog walker.ts:701](/home/mherwig/dev/ocx-catalog/src/sources/walker.ts), useCatalog.ts:89, usePackageRoot.ts:150). **The scout wins**: "none inspected" is a sampling claim, and the counterexamples are named. The audit's own qualifier ("inspected") is what makes it a sampling claim, not a measurement.
9. **Conflict resolved — `Promise.allSettled` + manual `AggregateError`, or a per-item try/catch loop?** `error-taxonomy` recorded this as genuinely contested. **Resolved: neither is mandated.** The factual half is: `Promise.all` never produces an `AggregateError` (that is `Promise.any`, on the opposite condition), and a branch that checks for one after `Promise.all` is dead code. That ships as a rule. The style half does not.
10. **A `catch` that swallows and returns is exempt from the cause rule but not from the boundary rule.** `fma`'s `try { return JSON.parse(raw) as TokenBundle } catch { return null }` throws nothing, so TS-ERR-01 does not bind it — TS-ERR-10 does, twice over.

## The ruleset

Family: **`TS-ERR`** (error taxonomy, `Error.cause`, catch discipline, one classifier, boundary validation — per the topic map's family table). One rule is issued into **`TS-WEB`**, whose SPA error-surface P0 the topic map commissioned inside this topic but assigned to that family.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| **TS-ERR-01** | When a `catch` block throws a new error, pass the caught binding as `{ cause: err }` — `new XError(msg, { cause: err })`, options object, never a positional second argument. | The caught value is the only place the original diagnostic exists; once the block returns it is gone. | `grep -rn -A6 'catch (' --include='*.ts' --include='*.tsx'` and inspect every block containing `throw new` for `cause:` on the constructing call. Fleet baseline is 0 (`grep -rn '{ cause:' src/`). | MUST |
| **TS-ERR-02** | Every custom `Error` subclass takes an `options?: ErrorOptions` parameter and forwards it: `super(message, options)`. | A constructor that swallows the second argument permanently blocks every caller from attaching a cause — TS-ERR-01 becomes unimplementable downstream. | `grep -rn 'class .* extends Error' -A4 --include='*.ts'`; every `super(` must pass ≥2 arguments. | MUST |
| **TS-ERR-03** | Do not write `Object.setPrototypeOf(this, X.prototype)` in an `Error` subclass constructor. | A TS-2.1-era `--target es5` workaround for broken `new.target`; every fleet tsconfig targets ES2022+, where it is dead code an agent adds from training habit. | `grep -rn 'setPrototypeOf(this' --include='*.ts'` — must be 0. | MUST |
| **TS-ERR-04** | Never `JSON.stringify(err)` — or stringify an object containing one — for a log line. Use `JSON.stringify(err, Object.getOwnPropertyNames(err))` or a hand-flattened shape. | `message`, `stack`, `name` and `cause` are all non-enumerable; a bare stringify yields `{}` with no error and no warning. Verified locally. | `grep -rn 'JSON.stringify(.*\berr' --include='*.ts'`; each hit must pass a replacer or provably not be an Error. | MUST |
| **TS-ERR-05** | A terminal `catch` — one that logs and does not rethrow — logs `.stack` or the serialised cause chain, never `.message`/`String(err)` alone. If the destination is end-user text, log the full chain to a separate diagnostic channel as well. | `.message` alone discards the only trace a bug report could carry, at zero cost to fix. | `grep -rn 'err instanceof Error ? .*\.message\|String(err' --include='*.ts'`; for each, confirm `.stack` appears in the same block. Fleet baseline: 44 hits. | MUST |
| **TS-ERR-06** | Map errors to an outward value through **one shared function**, called from every site that needs it. Never re-inline the same `instanceof` ladder in a second file. | Three independent copies drift the moment one gains a fourth branch. | For any error class, `grep -rn 'instanceof <ClassName>' --include='*.ts' \| cut -d: -f1 \| sort -u` — more than one non-test file containing the *same* mapping is the violation. | MUST |
| **TS-ERR-07** | Match error identity with `instanceof` when the class is statically imported in the same module graph. Drop to `err.name === "Literal"` only at a deliberate dynamic-`import()` boundary, with a comment saying so. Never match `err.constructor.name`. | Verified with `esbuild --minify`: a minified bundle renames `class ConfigError` to `class r`, so `constructor.name` becomes `"r"` while a `this.name = "ConfigError"` string literal survives. Both VS Code extensions minify production output. | `grep -rn '\.constructor\.name' --include='*.ts'` — must be 0 in any error-matching context. Every `err.name ===` site needs an adjacent comment naming the lazy-load reason. | MUST |
| **TS-ERR-08** | An `Error` crossing a `worker_threads` `postMessage`, a VS Code webview `postMessage`, or any structured-clone/JSON channel must be flattened on the sending side to `{ name, message, stack, cause? }` with the cause recursed manually. Never `instanceof`-check or read a custom field on the receiving side. | The WHATWG structured-clone algorithm recognises exactly seven error names and coerces everything else — including `AggregateError` — to plain `"Error"`; custom fields and `.errors` are dropped. The received value still *prints* correctly because the class name is baked into the cloned `.stack` string, so the bug is invisible in a log. | `grep -rn 'postMessage(' --include='*.ts'`; for each payload that can carry an Error, confirm a flatten call precedes it. | MUST |
| **TS-ERR-09** | Do not introduce a new `*Error` subclass unless at least two call sites branch on its identity, or it carries a field a caller reads. Otherwise throw `Error` with a `cause`. | Copying the CLI taxonomy into a shape with no outward value to map to is unrequested vocabulary; five of nine repos correctly have none. | At review: `grep -rn 'instanceof <NewClass>'` — fewer than two non-test call sites means the class is not earned. | SHOULD |
| **TS-ERR-10** | A value crossing from `unknown`/`any` into a typed binding must pass through `.safeParse()`, a compiled Ajv `validate()`, or a hand-written `x is T` predicate. Never an `as T` cast, never a typed `const` on an untyped RHS, never a typed callback parameter. | The compiler emits no code for any of the three forbidden forms; only a real call can reject bad data. | `grep -rn 'JSON\.parse(.*) as [A-Z]\|\.json() as ' --include='*.ts' --include='*.tsx' --include='*.vue'` for the explicit flavour; then `grep -rn ': [A-Z][A-Za-z]* = await .*\.json()\|: [A-Z][A-Za-z]* = JSON\.parse'` for the invisible one. Any hit without a guard call within 3 lines is a violation. | MUST |
| **TS-ERR-11** | Bind `Response.json()` to `unknown` and hand it to a guard on the next line. Never annotate the binding with an interface, never cast it. | `.json()` returns `Promise<any>` by TS's own lib types, so `const data: T = await resp.json()` has exactly the runtime strength of `as T` while looking safe. | `grep -rn '\.json()' --include='*.ts' --include='*.tsx' --include='*.vue'`; the assigning line must be `unknown` or untyped, with a guard within 3 lines. | MUST |
| **TS-ERR-12** | A hand-written `x is T` predicate must check every field of `T` it claims to guarantee, including the element types inside a `Record`/array, not just the container. | A predicate that checks a discriminant and trusts the rest is only as strong as its checked subset, while reading as exhaustive validation. | For each `function isX(v: unknown): v is X`, diff the fields checked against `X`'s member list; any member with no `typeof`/`instanceof`/nested-guard check fails. | MUST |
| **TS-ERR-13** | A parse function returns the schema-derived type (`z.infer`/`z.output<typeof schema>`), never a re-cast of `result.data` to a separately hand-maintained interface. | Two independently authored shapes for the same data diverge silently; structural typing will not catch a renamed field across an `as`. | For every `.safeParse`/`.parse` call, the enclosing function's return type must reference the schema's own derived type. | SHOULD |
| **TS-ERR-14** | A message handler (`onDidReceiveMessage`, `addEventListener('message')`) narrows its payload with a runtime discriminant check before switching on it. A parameter type annotation is not validation. | Both ends of a webview channel accept anything the other side sends; the annotation compiles clean and looks identical to a real guard. | `grep -rn "onDidReceiveMessage((\|addEventListener('message'" --include='*.ts'`; the handler's first statements must contain a `typeof`/predicate check on the discriminant field. | MUST |
| **TS-ERR-15** | Before relying on a repo's data being schema-validated, confirm the validator has a non-test import. A validator dependency with no runtime call site validates nothing. | An agent reads `ajv` in `package.json` and writes new code assuming incoming data is already checked — false in both fleet repos that depend on it. | `grep -rln "from ['\"]ajv\|from ['\"]zod" --include='*.ts' src/ \| grep -v test` — zero hits means no data is validated by it anywhere. | SHOULD |
| **TS-ERR-16** | Do not write a branch that expects an `AggregateError` from `Promise.all`. `Promise.all` rejects with only the first reason; `AggregateError` comes from `Promise.any`, and only when every input rejects. To report every failure, use `Promise.allSettled` and construct the `AggregateError` explicitly. | The naming association is superficially plausible and the resulting branch is dead code that never runs. | `grep -rn -B10 'instanceof AggregateError' --include='*.ts'` — any hit preceded by a `Promise.all` is dead. | SHOULD |
| **TS-ERR-17** | Before bumping a `zod` major, grep the repo for `.errors` on a `ZodError`/`safeParse` result. Zod 4 removed it in favour of `.issues` with no compatibility alias. | A Zod-3-trained model writes `.errors` into a Zod-4 repo and the reverse; one line blocks an otherwise clean bump. | `grep -rn '\.error\.errors\|result\.errors' --include='*.ts'` in the repo, cross-checked against the `zod` major in `package.json`. | CONSIDER |
| **TS-WEB-01** | Every browser SPA ships one top-level error boundary — React: a class with `getDerivedStateFromError` + `componentDidCatch`, or `react-error-boundary`; Vue: `app.config.errorHandler` paired with a component that can render a fallback — and logs inside the handler. | Without a boundary an uncaught render error is a permanent white screen; without a log inside it there is no trace at all. React boundaries are class-only; there is no hook equivalent, and a model will confidently write one. | `grep -rln 'componentDidCatch\|getDerivedStateFromError\|ErrorBoundary' src/` (React) or `grep -rln 'errorHandler\|onErrorCaptured' src/` (Vue) — zero hits fails outright. | MUST |

## Applied to the fleet

**Violated**

| Rule | Site | What is wrong |
|---|---|---|
| TS-ERR-01 | `ocx-catalog/src/config/load.ts:466-467` | Catches `JSON.parse`'s `SyntaxError`, throws `ConfigError("INVALID_JSON", …)` with no cause — the `"Unexpected token … at position N"` is gone forever. Fleet-wide, 0 uses of `{ cause:` ([implemented-contracts.md:193-195](typescript-audit/implemented-contracts.md)). |
| TS-ERR-02 | `grimoire-indexer/src/cli/exit.ts:29` | `constructor(message: string, code: ExitCode = EXIT.failure) { super(message); … }` — no options parameter, so no caller of `CliError` can ever attach a cause. All 11 custom classes in the fleet are in this shape ([implemented-contracts.md:175-190](typescript-audit/implemented-contracts.md)). |
| TS-ERR-05 | `grimoire-indexer/src/cli/main.ts:89` | `classify()`'s catch-all — the branch for *genuinely unexpected* errors — logs `err.message` only. This is precisely where a real bug loses its stack ([runtime-posture.md:340-352](typescript-audit/runtime-posture.md)). |
| TS-ERR-05 | `grimoire-vscode/src/extension.ts:200-208`; `fma/src/player/PlayerPage.tsx:143` | `.message` into an OutputChannel a user pastes into a bug report; `setError(String(e))` in an app with zero `console.*` calls. 44 `String(err)`/message-only hits fleet-wide. |
| TS-ERR-06 | `ocx-catalog/src/cli/build.ts:36-47`, `cli/dev.ts:96-107`, `cli/main.ts:45-52` | The same `instanceof ConfigError`/`BuildError` → exit-code ladder, hand-copied three times. Currently identical; three copies is the drift, not the divergence. |
| TS-ERR-10 | `fma/src/audio/sources/SpotifyAuth.ts:96,114,138` | `JSON.parse(raw) as TokenBundle` and two `.json()` casts — a parseable-but-wrong `{}` sails through fully typed. |
| TS-ERR-10 / TS-ERR-11 | `ocx-catalog/src/theme/composables/useCatalog.ts:89`, `useImageIndex.ts:84`, `usePackageRoot.ts:150` | `const data: CatalogData = await resp.json()` (twice) and a bare untyped `data` flowing into app state. The invisible flavour — no `as` keyword appears anywhere. |
| TS-ERR-12 | `ocx-catalog/src/sources/walker.ts:701` | `as { packages: Record<string, string> }`; `entries.length` is bounded right below, but no value is ever confirmed to be a `string` before `.slice("sha256:".length)`. |
| TS-ERR-13 | `fma/src/library/importExport.ts:34` | Returns `result.data as Graph` while `schema.ts` already exports `GraphParsed = z.output<typeof graphSchema>`. |
| TS-ERR-14 | `grimoire-vscode/src/views/sidebar.ts:226` and `src/webview/sidebar/main.ts:820` | Both ends type-annotate only (`(message: SidebarToHost)`, `MessageEvent<HostToSidebar>`) and switch on the discriminant with no runtime check. |
| TS-ERR-15 | `vscode-ocx` — `ajv` devDependency + `schemas/ocx.toml.schema.json` | No runtime consumer of either; the extension never parses `ocx.toml` in TS at all, it `execFile`s the real `ocx` binary. Delete both, or delete `src/test/schema.test.ts`. |
| TS-ERR-17 | `fma/src/library/importExport.ts:32` | `result.error.errors` against `zod@^3.23.8` — the single line blocking a Zod 4 bump. |
| TS-WEB-01 | `fma/src/main.tsx`; `creeptd-ng/web/src/main.ts` | 0 hits for `ErrorBoundary`/`componentDidCatch` and 0 for `errorHandler`/`onErrorCaptured` respectively. `fma` additionally has 0 `console.*` calls anywhere in `src/` — a white screen with no trace. |

**Already satisfied**

- TS-ERR-03 — 0 `setPrototypeOf(this` hits fleet-wide; every tsconfig targets ES2022+.
- TS-ERR-06 — `grimoire-indexer/src/cli/main.ts:66-94`'s `classify()`, called from exactly one place (`main.ts:239`), is the exemplar. `setup-ocx/src/setup.ts:112-119` is the same shape for an Action's `core.setFailed`: one call site, one outward value — centralised, though not typed.
- TS-ERR-07 — `grimoire-indexer/src/cli/main.ts:82-91` name-matches deliberately and says why in a comment, because `config.js`/`data/index.js`/`renderer/index.js` are dynamic `import()`s inside the subcommand modules. 0 `.constructor.name` hits fleet-wide.
- TS-ERR-10 — three correct crossings, one of them two lines above a violation in the same file: `ocx-catalog/src/config/load.ts:465` and `src/sources/types.ts:431` and `walker.ts:450-454` (parse to `unknown`, `typeof` check, *then* cast); `creeptd-ng/web/src/composables/useLobbyWsClient.ts:226`, `src/stores/useAuthStore.ts:117` (`as unknown` → `isSessionPayload()`), `src/bridge/eventContract.ts:130-170`.
- TS-ERR-15 — `ocx-catalog` is exempt and documented: its `ajv` is a conformance harness for a published editor-tooling schema (`test/config/schema-agreement.test.ts`, 26 fixtures), with every permitted disagreement enumerated. This is the fleet's one correct use of ajv.
- TS-ERR-16 — 0 `AggregateError` sites fleet-wide across 62 `Promise.all` call sites. Nothing to fix; the rule is a guard against agent-introduced dead branches.

**New commitments (no fleet evidence either way)**

- TS-ERR-08 — no Error is currently known to cross a worker or webview boundary. The rule is prescriptive, grounded in local verification of `structuredClone`/`worker_threads` rather than in a fleet defect. See Open questions.
- TS-ERR-01/02 together are the largest single behavioural change: they touch all 11 custom classes and every `catch`-and-rethrow site in the two CLIs.
- TS-ERR-04 — 0 known `JSON.stringify(err)` sites; the fleet has no structured logger at all ([runtime-posture.md:322](typescript-audit/runtime-posture.md)), so this is a guard against the first one an agent writes.

## AI-agent failure modes

Ranked by how often it bites, most frequent first.

1. **`const x: T = await resp.json()` / `JSON.parse(raw) as T`.** The highest-frequency failure by a wide margin — 7 fleet sites, and the shortest form that satisfies `tsc`, which is exactly what an agent optimises for. Nothing in the syntax distinguishes it from a cast of already-checked data. Check: after any agent-authored `.json()`/`JSON.parse`, grep the next 5 lines for `safeParse`/`validate`/`is[A-Z]`.
2. **Wrapping in a try/catch that logs `.message` and continues.** Named by the topic map as one of three fleet-wide agent patterns, and present at 44 sites. The result compiles, runs, looks handled, and is undebuggable.
3. **Annotating a message-handler parameter and considering the boundary done.** Both ends of `grimoire-vscode`'s sidebar do exactly this today, so the agent is pattern-matching on real in-repo code.
4. **`new Error(msg, err)` instead of `new Error(msg, { cause: err })`.** A plausible-looking two-arg constructor; the cause is silently dropped, no error, no warning.
5. **`Object.setPrototypeOf(this, X.prototype)` in every custom Error subclass.** Pure training-data residue from the ES5 era; adds dead code to every class an agent writes.
6. **Assuming a dependency validates.** `ajv` in `package.json` → new code assumes incoming data is checked. Literally false for `vscode-ocx`.
7. **`JSON.stringify(err)` for a "structured log".** Silently yields `{}`.
8. **`err.constructor.name` for error matching.** Indistinguishable from `err.name` in an unminified dev run; a live production bug in the two minifying repos.
9. **`static getDerivedStateFromError` on a function component.** Every other React lifecycle concept has a hook equivalent; this one does not, and the docs say so outright.
10. **Zod `.errors` vs `.issues` mismatched against the repo's pin.** Bidirectional — a v4-trained model breaks `fma`, a v3-trained one breaks a v4 repo.
11. **`instanceof CustomError` after a `postMessage`.** The received value prints correctly (the class name is baked into the cloned stack string) while `instanceof` is `false` and custom fields are `undefined`.
12. **Expecting `AggregateError` out of `Promise.all`.** Least frequent, since the fleet has 0 sites, but the resulting branch is unreachable and no test will catch it.

## Open questions

**Needs a human decision**

1. **Are the two SPAs in scope for the ruleset at all?** TS-WEB-01 is the group's only P0, and the topic map flags that both SPAs are the fleet's least-invested repos — one has no CI and no AI config. If they are out of scope, TS-WEB-01 and three of the TS-ERR violation rows have no adopter.
2. **`process.env` as a boundary.** Zero validation fleet-wide; every read is an inline `string | undefined` with ad hoc `??` fallbacks (`grimoire-indexer/src/cli/validate.ts`, `setup-ocx/src/{managed-config,project,download}.ts`). The sub-artifact proposed "one named accessor per variable" as the cheap first step. **Deliberately not shipped as a rule** — for five or six variables it is a style preference with weak yield, and a rule with weak yield spends the enforcement budget. Owner decides whether the CI-detection path is load-bearing enough to earn one.
3. **TS-ERR-01/02 as a migration or as a going-forward rule.** Retrofitting an `options` parameter onto 11 classes and a cause onto every rethrow in the two CLIs is a real diff. Going-forward-only is defensible; say which.

**Routed elsewhere, not resolvable here**

- `@typescript-eslint/only-throw-error` would enforce a rule this document deliberately omits, and cannot run in 8 of 9 repos. It belongs to `ts-gate`/`type-aware-rollout`, not here.

**Deserves another round**

- **Subarea: error transport across the extension-host boundary (`grimoire-vscode`, `vscode-ocx`).** Question: *does any `Error` actually cross `sidebar.ts:226` or a `worker_threads` channel in these repos today, and what does the flattening helper look like as shipped code — including whether the webview's JSON-only channel (not structured clone, per VS Code's own docs) degrades it further to `{}`?* TS-ERR-08 is currently the ruleset's only rule with no measured fleet instance behind it; it is prescription, and it should either earn a defect or be downgraded to SHOULD.

**Gaps in the sub-artifacts, not papered over**

Both dives landed. Two facts inside `error-taxonomy-and-cause` are explicitly marked unestablished as of 2026-08-29: which Node release introduced duplicate-stack-frame collapsing in a printed cause chain, and the minimum Node version that ships `Error.isError`. Neither gates a rule — the second is why `Error.isError` is a watch item rather than a rule.

## Sub-artifacts

- [error-taxonomy-and-cause.md](ts-errors-boundaries/error-taxonomy-and-cause.md) — `Error.cause` mechanics verified by local execution (printing, JSON, structured clone, worker boundaries), the fleet's two-population split between typed CLIs and 75 bare throws, and the verdict that one classifier *function* — not one call site — is mandatory.
- [untrusted-to-typed.md](ts-errors-boundaries/untrusted-to-typed.md) — the single legal `unknown`→typed crossing, the three flavours of cast-after-parse found at file:line, per-boundary coverage across all nine repos, the two-repo ajv verdict, and the minimum SPA error surface.

## Key sources

| URL | Why it is here |
|---|---|
| [MDN — `Error.cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause) | Canonical options-object constructor shape; grounds TS-ERR-01. |
| [WHATWG HTML — StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal) | The exact seven-name allowlist that explains every structured-clone error finding; grounds TS-ERR-08. |
| [VS Code — webview guide](https://code.visualstudio.com/api/extension-guides/webview) | States the webview `postMessage` channel is JSON-serialisable data, not structured-clone data — a further degradation step. |
| [TypeScript 4.6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html) | `cause` becomes typed at `--target es2022`/`--lib es2022`; why adopting it is zero-config fleet-wide. |
| [TypeScript 4.4 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html) | `useUnknownInCatchVariables` under `strict` — why every fleet catch binding is already `unknown`. |
| [TypeScript wiki — Breaking Changes (extending built-ins)](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work) | The origin of the `Object.setPrototypeOf` workaround TS-ERR-03 forbids. |
| [MDN — `Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) | "rejects with this first rejection reason" — the decisive wording for TS-ERR-16. |
| [MDN — `Promise.any`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any) | Where `AggregateError` actually comes from, and under the opposite condition. |
| [MDN — `Error.isError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError) | "Limited availability" — grounds the decision not to adopt it. |
| [tc39/proposal-error-cause](https://github.com/tc39/proposal-error-cause) | Stage 4 spec source; separates `cause` (depth) from `AggregateError` (breadth). |
| [zod.dev/v4/changelog](https://zod.dev/v4/changelog) | `.errors` removed in favour of `.issues`, no shim — grounds TS-ERR-17. |
| [zod.dev/basics](https://zod.dev/basics) | `.parse` vs `.safeParse`, `z.infer`/`z.input`/`z.output` — grounds TS-ERR-10 and TS-ERR-13. |
| [zod.dev/library-authors](https://zod.dev/library-authors) | Zod's own steer toward Standard Schema for library-agnostic validation. |
| [github.com/standard-schema/standard-schema](https://github.com/standard-schema/standard-schema) | The `~standard.validate` contract a shared cross-repo helper should accept. |
| [ajv.js.org/guide/typescript.html](https://ajv.js.org/guide/typescript.html) | `ValidateFunction<T>` as a type guard, and `JSONSchemaType<T>`'s documented union ceiling. |
| [react.dev — Component (error boundaries)](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) | Class-only requirement and the `react-error-boundary` pointer; grounds TS-WEB-01. |
| [vuejs.org — `app.config.errorHandler`](https://vuejs.org/api/application.html#app-config-errorhandler) | Exact signature and coverage; why it is a sink, not a boundary. |
| [typescript-eslint.io — `only-throw-error`](https://typescript-eslint.io/rules/only-throw-error/) | Confirms the rule needs type information — why no verification here depends on it. |
| [protobuf.dev — field presence](https://protobuf.dev/programming-guides/field_presence/) | proto3 implicit presence: generated decode gives type-safety, not domain validation. |

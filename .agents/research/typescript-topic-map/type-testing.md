---
title: Type-Level Testing and Contract Testing for TypeScript
corpus: type-level testing, contract testing, and schema/type agreement tooling for TypeScript
agent: scout (type-testing)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 21
scope: |
  Covers expect-type, Vitest expectTypeOf/--typecheck, tsd, @ts-expect-error-as-test,
  arethetypeswrong/publint as contract TESTS, Standard Schema + zod/valibot/typebox/arktype
  schema-type agreement, typed-fake libraries (vitest-mock-extended, ts-mockito,
  @golevelup/ts-vitest, satisfies), Stryker mutation testing, and fast-check property
  testing — each grounded against what the nine-repo fleet already has installed.
  Does NOT re-enumerate typescript-eslint/Biome/oxlint rule catalogues (wave 1's job),
  and does not re-derive the fleet-wide cast count (used as directional context only).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- **Zero new dependencies are needed to start type-level testing in this fleet.** `expectTypeOf` ships inside `vitest` itself (Vitest [4.1.11](https://vitest.dev/guide/testing-types.html), npm-published 2026-08-28); four repos already run `tsc --noEmit`/`vue-tsc --noEmit` as a `check-types`/`typecheck` script, so `@ts-expect-error` test files ride that for free.
- **`expect-type` v1.4.0** (released 2026-06-25, [GitHub Releases](https://github.com/mmkal/expect-type/releases)) is the library Vitest embeds; use `.toExtend()` for assignability, `.toEqualTypeOf()` for identity, `.toBeAny()`/`.branded.inspect` to catch `any` leaking through — never `.toMatchTypeOf()`, deprecated since expect-type v1.2.0 (2025-02-28).
- **`tsd` (0.33.0, last published 2025-08-05, GitHub `pushed_at` also 2025-08-05, 54 open issues, not archived)** is over a year stale as of 2026-08-29 — real but slowing; it only matters for testing a package's *published `.d.ts`*, which is exactly the shape `ocx-catalog` and `grimoire-indexer` ship. Prefer Vitest's built-in `expectTypeOf`/`.test-d.ts` over adding `tsd` as a second type-test runner.
- **`@ts-expect-error` as a deliberate negative test** shipped in TypeScript 3.9 ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html), PR #36014, Josh Goldberg): unlike `@ts-ignore` it *fails the build* if the following line stops erroring, so it self-detects when a bug it was guarding against gets fixed or silently regresses. This is the cheapest possible type-level test — it needs nothing but `tsc`.
- **`satisfies`** (TypeScript 4.9, Nov 2022) already appears in `grimoire-vscode/src/views/details.ts` and `settingsGoldenCases.ts` — but it only works when the fake implements **every** required member of the target interface. For a 30-member interface like `vscode.WebviewPanel` where a test only needs 3 members, `satisfies` alone won't compile; that's precisely why the fleet reaches for `as unknown as` today.
- **The concrete replacement for the 164 `as unknown as T` casts**: `vitest-mock-extended`'s `mock<T>()` (v5.1.1, npm-modified 2026-08-02) or `@golevelup/ts-vitest`'s `createMock<T>()` (v4.0.0, npm-modified 2026-03-18) — both build a full `Proxy`-backed double for an arbitrary interface with zero casts, stubbing every unused member as a spy and letting the test override only what it checks.
- **`ts-mockito` is dead for this purpose**: last npm publish 2022-06-27, GitHub `pushed_at` 2023-02-12, 91 open issues, not archived but not moving — do not adopt.
- **`ocx-catalog` already has `@arethetypeswrong/cli` (^0.18.2) and `publint` (^0.3.14) in devDependencies but wired into no script** — they're dead weight today; wiring them into a `contracts` script is a one-line fix, not a new-tool adoption.
- **`arethetypeswrong` (attw) 0.18.5** (npm-modified 2026-07-09) checks a *packed tarball* against module-resolution modes: `attw --pack .` or `attw --pack . --profile node16`; it's a contract test for "does my package's shape work when someone else's bundler resolves it" — only relevant to `ocx-catalog` and `grimoire-indexer` (npm-published) and the three publishable `kate-middlechild` packages, not to the VS Code extensions, the GH Action, or the SPAs.
- **`publint` 0.3.24** (npm-modified 2026-08-19) has a programmatic API — `const { messages } = await publint({ pkgDir })` — that turns it from a lint into a genuine assertion: `expect(messages.filter(m => m.type === 'error')).toHaveLength(0)` inside a normal vitest test.
- **Zod's own docs (4.5.2, zod.dev/basics) explicitly warn that `satisfies z.ZodType<T>` is the WRONG contract test**: it "catches a missing required key, but extra keys, omitted optional keys, and a bare `z.any()` all slip through." Zod recommends `z.toZod<T>()` for exact schema-to-type equality instead.
- **Standard Schema v1** (`@standard-schema/spec` 1.1.0, npm-modified 2025-12-15) is a marker-property convention (`~standard`), not a testing tool. Direct inspection of shipped code confirms **Zod 4.5.2 and Valibot 1.4.2 both ship the `~standard` marker**; the same check on **ArkType 2.2.3 and `@sinclair/typebox` 0.34.52 files inspected found no `~standard` marker and no `@standard-schema` dependency** — their Standard Schema status could not be established as of 2026-08-29 and should not be assumed.
- **Only `fma` in this fleet uses a schema library** (`zod` ^3.23.8) — Standard Schema and runtime-schema contract testing is a one-repo concern today, not a fleet-wide one.
- **Mutation testing verdict: no, for now.** Stryker Mutator (`@stryker-mutator/core` 10.0.0, npm-modified 2026-08-14) has real Vitest support (`@stryker-mutator/vitest-runner`, since Stryker v7.0) and a TypeScript-aware checker that rejects non-compiling mutants before running tests — but its own docs illustrate incremental mode reusing "3731 of 3965 mutant result(s)" (~94%) only on *repeat* runs; the *first* full run on any repo pays the whole cost, and none of these nine repos are at a size or criticality (no published security-sensitive logic) where mutation testing's signal-to-cost ratio beats simply writing the missing type-level and `@ts-expect-error` tests first.
- **`fast-check` 4.9.0** (npm-modified 2026-07-08) plus **`@fast-check/vitest` 0.4.1** (npm-modified 2026-04-28) gives `test.prop([fc.string(), ...])(...)` directly inside Vitest — no adapter needed, agnostic of runner underneath. Worth it specifically for parsers/serializers (e.g. `parseDeclaredRefs`, `withGlobalFlag` in `grimoire-vscode/src/scopes`, or ocx-catalog's search/query parsing) — not for CRUD-shaped code.
- **A direct re-grep of `grimoire-vscode/src/test/extension.test.ts` today found 46 occurrences of the literal `as unknown as` pattern, not the 79 cited in the brief** — treat 79 as directionally correct (this file is still by far the fleet's worst offender) but re-verify the exact count before citing it in a published rule.
- **The decision this brief must settle, stated plainly**: adopt type-level testing, but narrowly — `@ts-expect-error` negative tests plus `expectTypeOf`/`.test-d.ts` files riding the `tsc --noEmit` scripts that already exist in 4+ repos, and `mock<T>()`/`createMock<T>()` to replace the `as unknown as` casts. Do not adopt `tsd` (redundant with Vitest), `ts-mockito` (dead), or Stryker (not yet worth the cost for this fleet).

## Findings

### 1. `expect-type` and Vitest's `expectTypeOf`

Vitest embeds `expect-type` directly: `expectTypeOf` is Vitest's re-export of the library, and Vitest's own testing-types guide is written against it ([Vitest Testing Types guide](https://vitest.dev/guide/testing-types.html), read at Vitest **4.1.11**, npm `time.modified` **2026-08-28**).

Matcher surface, confirmed from [vitest.dev/api/expect-typeof](https://vitest.dev/api/expect-typeof.html):
- `toEqualTypeOf` — type **identity**: both types must match exactly, including every optional/extra property.
- `toExtend` — **assignability** ("is-a"): `{a: 1, b: 1}` extends `{a: number}` without being equal to it. This is the matcher to reach for by default.
- `toMatchObjectType` — a stricter object-shaped check than `toExtend` that still allows extra properties, recommended over `toExtend` specifically for object literals.
- `toMatchTypeOf` — **deprecated since expect-type v1.2.0** (2025-02-28 per [expect-type releases](https://github.com/mmkal/expect-type/releases)); the docs say to use `toExtend` instead. A Vitest PR from 2025-08-09, "[docs: update Testing Types docs to use non-deprecated expect-type API](https://github.com/vitest-dev/vitest/pull/8397)," confirms Vitest's own docs were still catching up to this as recently as last year — any training-data-era LLM answer is likely to suggest the deprecated name.
- `toBeAny()`, `toBeUnknown()`, `toBeNever()`, and `.branded.inspect` — first-class **`any`-swallowing detection**. This is the gotcha the brief asks about: a function that's supposed to return `Foo` but actually infers `any` will pass a naive `toEqualTypeOf<Foo>()` check in some TS configurations because `any` is assignable to and from everything; `toBeAny()`/`branded.inspect` exist specifically to catch that silent hole.
- `.toBeCallableWith()`, `.parameter(n)`, `.returns` — function-shape assertions, directly useful for testing a fake's call signature without instantiating it.

**How it runs in CI**: add `--typecheck` to the vitest invocation (`vitest --typecheck` or `vitest typecheck`). Under the hood "Vitest uses `tsc --noEmit` or `vue-tsc --noEmit`, depending on your configuration, so you can remove these scripts from your pipeline" (exact quote from the guide). Type test files use the `*.test-d.ts` naming convention by default, configurable via `typecheck.include`; **Vitest does not execute these files — they are only statically analyzed by the compiler**, so `test.each`-style dynamic naming does nothing inside a type test. `assertType` is available as a lighter-weight sibling to `expectTypeOf` for simple `@ts-expect-error`-style checks, and can be included in `test.include` too so the same file gets both a compile-time and (where it has runtime assertions) a run-time check.

### 2. `tsd`

`tsd` v**0.33.0**, npm `time.modified` **2025-08-05**; GitHub API confirms `pushed_at: 2025-08-05` and `archived: false` with **54 open issues** ([github.com/tsdjs/tsd](https://github.com/tsdjs/tsd)). As of 2026-08-29 that's over a year with no publish — not abandoned, but not actively moving either.

API: `expectType<T>(expr)` (exact match), `expectAssignable<T>(expr)` (loose/assignability), `expectError(expr)`, `expectDeprecated(expr)`, `expectNever(expr)`. Tests live in `*.test-d.ts` files (the same convention Vitest adopted), run via `npx tsd`, which walks the project (or a configurable `test-d` directory) and type-checks each file with the TypeScript compiler.

**Niche**: `tsd` exists purely to test a package's **published `.d.ts` output** — the artifact a consumer's `node_modules` actually sees, as opposed to source `.ts`. That distinction matters for `ocx-catalog` and `grimoire-indexer`, the two npm-published CLIs, but even there Vitest's `--typecheck` running against the same `*.test-d.ts` files covers the same ground without a second test runner in the toolchain. Adopt `tsd` only if a repo starts publishing hand-authored `.d.ts` files independent of its `.ts` sources (not currently true anywhere in this fleet).

### 3. `@ts-expect-error` as a deliberate test

Shipped in **TypeScript 3.9** ([release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html), PR [#36014](https://github.com/microsoft/TypeScript/pull/36014) by Josh Goldberg). Exact behavior: "When a line is preceded by a `// @ts-expect-error` comment, TypeScript will suppress that error from being reported; but if there's no error, TypeScript will report that `// @ts-expect-error` wasn't necessary" — i.e. an unused `@ts-expect-error` directive is itself a compile error ("Unused '@ts-expect-error' directive").

This is why it's a **stronger test than a positive one** in the specific case of "does this API correctly reject a bad input at the type level": a positive `expectType<Foo>(goodCall())` only proves the happy path type-checks; it says nothing about whether `badCall()` was ever *supposed* to fail. `// @ts-expect-error` plus a self-policing "unused directive" failure proves both that the bad call fails today *and* that the test itself stays honest if the underlying type gets loosened later (the directive would then go unused and break the build) — a regression a purely-positive test suite would silently let through. `@ts-ignore`, by contrast, does nothing if the code becomes valid, so it rots silently.

### 4. `arethetypeswrong` and `publint` as tests, not lints

`@arethetypeswrong/cli` v**0.18.5**, npm-modified **2026-07-09** ([README](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md)). Run against a real packed tarball, not source: `attw --pack .` (packs the current directory first) or `attw cool-package-1.0.0.tgz` after `npm pack`, or `attw --from-npm <name>` against the published registry copy. CI-relevant flags read directly off the README: `--profile <strict|node16|esm-only>` selects which resolution modes must pass (failures outside the selected profile are ignored — this is the knob that turns attw from "every possible complaint" into "the complaints that matter for our target runtimes"), `--ignore-rules <rules...>` suppresses named problem categories, `--quiet`/`-q` silences stdout for scripted use, `--format json` for machine consumption. **`ocx-catalog` already has this at ^0.18.2 in devDependencies with no script calling it** — verified directly against the repo's `package.json`.

`publint` v**0.3.24**, npm-modified **2026-08-19** ([JS API docs](https://publint.dev/docs/javascript-api)). As a lint it's `npx publint`; as a **test** it's the programmatic API:
```js
import { publint } from 'publint'
import { test, expect } from 'vitest'

test('package has no publint errors', async () => {
  const { messages } = await publint({ pkgDir: '.' })
  expect(messages.filter(m => m.type === 'error')).toHaveLength(0)
})
```
This is what turns a linter into a contract test the CI pipeline gates on, rather than an advisory report a human has to remember to read. **`ocx-catalog` already has `publint` at ^0.3.14 in devDependencies with no script or test calling it either.**

Both tools apply only to packages a consumer actually installs from a registry — that's `ocx-catalog`, `grimoire-indexer`, and the non-private packages under `kate-middlechild/packages/{core,tokens,web}` (verified: none of the three carry `"private": true`). They're a no-op for the two VS Code extensions, the GitHub Action, and the two browser SPAs, none of which ship a `package.json` `exports` map anyone resolves against.

### 5. Runtime-schema-to-type contract testing

**Standard Schema v1** (`@standard-schema/spec` 1.1.0, npm-modified 2025-12-15; spec text at [standardschema.dev](https://standardschema.dev) and [github.com/standard-schema/standard-schema](https://github.com/standard-schema/standard-schema)) is a structural convention, not a runner: any conforming library exposes a `~standard` property carrying a `validate` function plus `types: { input, output }` markers, and `StandardSchemaV1.InferOutput<Schema>`/`InferInput<Schema>` let a consumer extract the static type generically across libraries. It does not itself test anything — it makes generic tooling (form libraries, RPC layers) able to accept "any Standard-Schema-shaped validator" instead of hand-writing an adapter per library.

Direct inspection of shipped dist code (not documentation, the actual bytes a `node_modules` install would contain) confirms:
- **Zod 4.5.2** — `~standard` present (4 occurrences in `v4/core/schemas.js` via unpkg).
- **Valibot 1.4.2** — `~standard` present (85 occurrences in `dist/index.cjs` via unpkg).
- **ArkType 2.2.3** and **`@sinclair/typebox` 0.34.52** — `~standard` **not found** in the primary entry files checked (`out/index.js` for ArkType, `build/cjs/index.js` for TypeBox), and neither lists `@standard-schema/spec` as a dependency. Could not establish their Standard Schema status as of 2026-08-29 — do not assume either implements it without re-checking their own docs directly.

**How you actually test schema-type agreement** (the brief's real question) — from Zod's own docs (**4.5.2**, [zod.dev/basics](https://zod.dev/basics)): the naive approach, `satisfies z.ZodType<Player>`, is explicitly called out as insufficient. Exact quote: "It catches a missing required key, but extra keys, omitted optional keys, and a bare `z.any()` all slip through" — demonstrated with an example where adding an unrequested `admin: z.boolean()` field passes `satisfies` silently. Zod's fix is `z.toZod<T>()`, which performs exact type equality rather than one-directional assignability. **This generalizes past Zod**: any `satisfies SchemaType<T>`-shaped check for any validation library has the same one-directional blind spot — assignability checks catch missing fields, never extra ones — so a genuine contract test needs a bidirectional/exact-equality check (`toEqualTypeOf`, not `toExtend`, in `expectTypeOf` terms) run in both directions: infer-from-schema-extends-hand-type AND hand-type-extends-infer-from-schema.

Fleet relevance: only `fma` depends on a schema library (`zod` ^3.23.8) today. This is a one-repo concern, not a fleet-wide pattern — treat it as low priority until a second repo adopts a schema library.

### 6. Fake/mock typing without casts

This is the section that most directly answers the measured defect (164 `as unknown as T` casts, 79 of them originally reported in `grimoire-vscode/src/test/extension.test.ts`, though a direct re-grep in this pass found **46** literal occurrences of that exact pattern in that file today — re-verify the 79 figure before it goes into a published rule).

Surveyed:
- **`ts-mockito` 2.6.1** — npm last published **2022-06-27**; GitHub `pushed_at` **2023-02-12**, 91 open issues, not formally archived but effectively stalled ([github.com/NagRock/ts-mockito](https://github.com/NagRock/ts-mockito)). Its API (`instance(mock(Foo))`, `when(...).thenReturn(...)`) is a Java-Mockito port that predates Vitest entirely — no reason to adopt it new in 2026.
- **`vitest-mock-extended` 5.1.1**, npm-modified **2026-08-02** ([github.com/eratio08/vitest-mock-extended](https://github.com/eratio08/vitest-mock-extended)). `mock<T>()` builds a fully-typed double of any interface — including one with 30 members like `vscode.WebviewPanel` — where every member not explicitly stubbed is auto-populated as a `vi.fn()` spy. No cast, anywhere:
  ```ts
  import { mock } from 'vitest-mock-extended';
  const panel = mock<vscode.WebviewPanel>();
  panel.webview.postMessage.mockResolvedValue(true);
  // panel is a real vscode.WebviewPanel to the type checker — every
  // member the test doesn't touch is still present as a callable spy.
  ```
- **`@golevelup/ts-vitest` 4.0.0**, npm-modified **2026-03-18**, README confirmed at [github.com/golevelup/nestjs/blob/master/packages/testing/ts-vitest/README.md](https://github.com/golevelup/nestjs/blob/master/packages/testing/ts-vitest/README.md). `createMock<T>()` — built on `Proxy`, same shape as `vitest-mock-extended`, NestJS-flavored origin (`ExecutionContext`, `Guards`) but generically typed: "if it has an interface, `@golevelup/ts-vitest` can mock it." Functionally near-identical to `vitest-mock-extended` for this fleet's purposes; pick one, don't install both.
- **Hand-rolled `fake<T>()` helper** — what the fleet already does today, just without the cast: a plain object literal typed as `Partial<T>` and widened only at the call site that needs the full `T`, OR (better) built on `vitest-mock-extended`'s `mock<T>()` and then overridden per-field. The existing `fakePanel()`/`fakeView()` helpers in `extension.test.ts` are structurally *already* this pattern — they build a literal with only the members the test touches. Swapping their `as unknown as vscode.WebviewPanel` tail for `mock<vscode.WebviewPanel>()` composed with the literal's explicit overrides removes the cast without changing the test's intent or its object shape.
- **`satisfies`-based approach** (TypeScript 4.9, Nov 2022, [release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)) — confirmed already in use in this fleet (`grimoire-vscode/src/views/details.ts`, `settingsGoldenCases.ts`). `satisfies` is the right tool when the literal genuinely implements every required member of the target type (e.g. a small config object) — but it does **not** solve the partial-fake problem: `satisfies` still requires all required properties to be present, so it cannot type-check `{ webview: { postMessage: ... } } satisfies vscode.WebviewPanel` when `WebviewPanel` has two dozen other required members. This is the specific reason the fleet has 164 casts instead of 164 `satisfies` expressions — the interfaces being faked are too large for `satisfies` alone, and `mock<T>()`/`createMock<T>()` exist precisely to bridge that gap.

### 7. Mutation testing

`@stryker-mutator/core` v**10.0.0**, npm-modified **2026-08-14**. Its TypeScript checker, `@stryker-mutator/typescript-checker` (same version 10.0.0, same date), is enabled via `"checkers": ["typescript"]` in `stryker.config.json` with a `tsconfigFile` pointer; it type-checks each mutant *before* running tests against it and marks type-invalid mutants `CompileError`, skipping the (much more expensive) test run for mutants that could never have passed anyway. A `prioritizePerformanceOverAccuracy` flag (default `true`) trades a small amount of report accuracy for speed ([stryker-mutator.io/docs/stryker-js/typescript-checker](https://stryker-mutator.io/docs/stryker-js/typescript-checker/)).

Vitest integration is real and current: `@stryker-mutator/vitest-runner` (v10.0.0, "available since v7.0" per its own docs) drives Stryker's mutant runs through an existing Vitest config (`testRunner: "vitest"`, `vitest: { configFile, dir, related }`); it forces single-threaded, bail-on-failure execution and disables Vitest's own coverage in favor of Stryker's per-mutant analysis ([stryker-mutator.io/docs/stryker-js/vitest-runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)).

**Cost**: Stryker's own incremental-mode docs give a concrete number from their example run — "3731 of 3965 mutant result(s)" reused across a re-run, roughly **94%** avoided — but that's the *second and later* run; incremental mode caches nothing on a first run, which pays the full mutant-times-test-suite cost regardless ([stryker-mutator.io/docs/stryker-js/incremental](https://stryker-mutator.io/docs/stryker-js/incremental/)).

**Verdict for this fleet: no, not yet.** None of the nine repos are at the scale (largest is `ocx-catalog` at 28.5k LOC) or risk profile (no repo ships security-critical logic to third parties at the level that would justify mutation-testing's per-run cost — these are CLI tooling, editor extensions, and internal apps) where a low line-coverage number is the likely failure mode. The fleet's own defect data (164 unchecked casts, zero type-level tests) points at a *type-safety* gap, not a *test-thoroughness* gap that mutation testing would surface — fix the former first with the near-zero-cost tools above; revisit Stryker only if line/branch coverage numbers plateau above ~90% and bugs keep landing anyway, which would indicate the existing tests aren't actually exercising the branches they claim to cover.

### 8. Property-based testing

`fast-check` v**4.9.0**, npm-modified **2026-07-08** ([fast-check.dev](https://fast-check.dev/docs/introduction/getting-started/)). Core API: `fc.assert(fc.property(fc.string(), fc.integer(), (s, n) => { ... }))`; "fast-check is agnostic of the test runner you rely on. It works with any test runner without needing any specific change" (exact quote). Direct Vitest ergonomics come from a separate, actively maintained adapter, **`@fast-check/vitest` v0.4.1**, npm-modified **2026-04-28** ([README](https://github.com/dubzzz/fast-check/blob/main/packages/vitest/README.md)):
```ts
import { test, fc } from '@fast-check/vitest';

// for all a, b, c strings: b is a substring of a + b + c
test.prop([fc.string(), fc.string(), fc.string()])(
  'should detect the substring',
  (a, b, c) => (a + b + c).includes(b),
);
```
It also ships a lighter "one-time random mode" (`test('...', ({ g }) => { const x = g(fc.string()); ... })`) that injects controlled randomness into an otherwise example-based test without full shrinking/property machinery — useful as a stepping stone.

**Where it pays off vs example-based tests**: parsers, serializers, and anything with an invariant that should hold across a wide input space rather than a specific example — `parseDeclaredRefs`/`withGlobalFlag` in `grimoire-vscode/src/scopes`, `ocx-catalog`'s search/query matching, or any round-trip (`serialize(parse(x)) === x`) code are exactly this shape. It's the wrong tool for CRUD-shaped code, UI event handlers, or anything whose correctness is "matches this one fixture," which is most of what these nine repos' test suites currently cover — so property-based tests should be added surgically to the handful of parser/serializer functions each repo has, not adopted as a blanket testing style.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt/keep/drop/watch | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| Vitest `expectTypeOf` (`expect-type`) | type-level assertions inside `.test-d.ts`, `--typecheck` | expect-type 1.4.0 (2026-06-25); Vitest 4.1.11 (2026-08-28) | mature, embedded in Vitest | **adopt** | zero new deps in the 3 repos that already run Vitest | ad-hoc "does this compile" eyeballing |
| `@ts-expect-error` negative tests | asserts a call/type *fails* to compile, self-invalidating if it stops failing | TS 3.9 (2020), still current | mature, language feature | **adopt** | needs only `tsc --noEmit`, already wired in 4 repos | nothing — currently unused as a test pattern anywhere in the fleet |
| `tsd` | tests published `.d.ts` output specifically | 0.33.0 (2025-08-05); repo stale 1yr+ | slowing, not dead | **watch** | Vitest `--typecheck` covers the same `.test-d.ts` files with no second runner | would-be `.d.ts`-specific test runner |
| `vitest-mock-extended` | `mock<T>()`, deep typed doubles via Proxy, no casts | 5.1.1 (2026-08-02) | active | **adopt** | direct, minimal-diff fix for the 46–164 `as unknown as` casts | `as unknown as T` object-literal fakes |
| `@golevelup/ts-vitest` | `createMock<T>()`, same shape as above | 4.0.0 (2026-03-18) | active | **watch** | functionally redundant with vitest-mock-extended — pick one, don't add both | n/a (alternative to the adopt row above) |
| `ts-mockito` | Mockito-style typed mocking | 2.6.1 (last publish 2022-06-27) | stalled | **drop** | 4+ years no publish, 91 open issues | nothing in this fleet uses it today — keep it that way |
| `arethetypeswrong` (attw) | packed-tarball module-resolution contract check | 0.18.5 (2026-07-09) | active | **adopt** (2 repos: ocx-catalog, grimoire-indexer) | already installed in ocx-catalog, unwired — one script away from a real gate | manual "does this resolve under bundler/node16" spot-checks |
| `publint` | package.json/exports shape lint, has a JS API | 0.3.24 (2026-08-19) | active | **adopt** (same 2 repos + kate-middlechild's 3 publishable packages) | already installed in ocx-catalog, unwired; JS API turns it into a real vitest assertion | manual package.json review |
| Standard Schema | `~standard` marker convention for schema/type interop | spec 1.1.0 (2025-12-15) | early but stable v1 | **watch** | zero-repo impact today (only `fma` uses a schema lib, and directly via zod, not through the spec) | nothing yet |
| `z.toZod<T>()` (Zod-specific) | exact schema↔type equality check | Zod 4.5.2 (2026-08-29) | mature (Zod docs' own recommendation) | **adopt if fma adds more zod schemas** | catches what `satisfies z.ZodType<T>` misses (extra/optional/`any` fields) | `satisfies z.ZodType<T>` as a contract test |
| Stryker Mutator | mutation testing, TS-checker + Vitest runner | core 10.0.0 (2026-08-14) | mature | **drop** (for now) | cost isn't justified at this fleet's scale/risk; fix the type-safety gap first | nothing — no repo runs it today |
| `fast-check` + `@fast-check/vitest` | property-based testing, `test.prop(...)` | fast-check 4.9.0 (2026-07-08); adapter 0.4.1 (2026-04-28) | mature | **adopt, narrowly** | pays off specifically on parser/serializer functions each repo already has | targeted example-based tests for parse/round-trip functions only |

## Normative guidance candidates

1. **Never write a fake for an interface with more members than the test touches using `as unknown as T`; use `mock<T>()` from `vitest-mock-extended` instead.**
   Rationale: `as unknown as T` defeats the type checker entirely — a renamed or removed member on the real interface produces no compile error on the fake.
   Verify: `grep -rn "as unknown as" **/*.test.ts` returns zero new hits in a diff; any surviving hits pre-date the rule and are tracked, not introduced.

2. **A schema-to-type contract check must use `toEqualTypeOf`/exact equality, never `satisfies SchemaType<T>` alone.**
   Rationale: `satisfies` only checks assignability one direction — it misses extra fields, omitted optionals, and `any`.
   Verify: reviewer heuristic — any `satisfies z.ZodType<...>` (or valibot/arktype equivalent) appearing as the *only* type check for a schema is a rule violation; require it be paired with `expectTypeOf<z.infer<typeof S>>().toEqualTypeOf<T>()` or `z.toZod<T>()`.

3. **Every negative-type-check (a case that must NOT compile) is written as `// @ts-expect-error` in a `.test-d.ts` file, never as a code comment explaining "this should error."**
   Rationale: `@ts-expect-error` self-invalidates (fails the build) if the guarded case stops erroring — a prose comment doesn't.
   Verify: `tsc --noEmit` (or the repo's existing `check-types`/`typecheck` script) exits non-zero on an unused directive; that's the enforcement, no extra tooling needed.

4. **`attw --pack . --profile node16` and a `publint({ pkgDir })` assertion are required CI gates on any repo whose `package.json` lacks `"private": true`.**
   Rationale: those are exactly the repos a third party's bundler resolves against; a resolution break there is a real user-facing incident.
   Verify: `grep -L '"private": true' */package.json` lists the repos that need this gate; `npm ls @arethetypeswrong/cli publint` confirms whether it's installed, and the CI workflow file must invoke both, not just install them (ocx-catalog currently fails this check).

5. **A new schema library dependency (zod/valibot/arktype/typebox) is only added alongside at least one `expectTypeOf`/`@ts-expect-error` test proving its inferred type matches the hand-written type it's replacing, if one existed.**
   Rationale: the whole point of a runtime validator is that its static type stays honest — an untested `z.infer<>` can silently drift from the shape the rest of the code assumes.
   Verify: reviewer heuristic — a PR adding `.infer`/`.Static`/`InferOutput` usage without a corresponding `.test-d.ts` change is incomplete.

## AI-agent angle

- **Suggests `toMatchTypeOf` instead of `toExtend`.** `toMatchTypeOf` was the standard matcher in most training-era documentation and blog posts; it's been deprecated since expect-type v1.2.0 (2025-02-28) and Vitest's own docs only caught up to recommending `toExtend` in an August 2025 PR. Mechanical check: `grep -rn "toMatchTypeOf" **/*.test-d.ts **/*.test.ts` — any hit is a stale suggestion, not a style choice.
- **Reaches for `satisfies T` to fix a giant interface fake and then silently falls back to a cast when it doesn't compile**, because `satisfies` requires every required member present and a partial `vscode.WebviewPanel` fake never will. Mechanical check: a diff that adds `satisfies` to an object literal with fewer explicit keys than the target interface's required-member count won't compile — `tsc --noEmit` catches this immediately, so the failure mode is self-limiting as long as the repo's `check-types` script actually runs before merge (verify it's in the PR-gating CI job, not just a local dev script).
- **Recommends `tsd` as "the" type-testing tool** because it's the oldest, most-blogged-about option, without checking that Vitest — already the fleet's test runner in 3+ repos — ships the same capability with zero extra dependency. Mechanical check: `npm ls tsd` after a suggested change; if it appears in a repo that already depends on `vitest`, ask why a second type-test runner was needed.
- **Proposes `ts-mockito` for typed mocking** — it's a recognizable, well-documented name from older Java-influenced TypeScript codebases, but has had no publish since 2022-06-27. Mechanical check: `npm view ts-mockito time.modified` before accepting any dependency-add PR that introduces it; a multi-year-stale date is a hard stop.
- **Writes a mutation-testing recommendation as a blanket "adds confidence" claim without a cost figure**, because Stryker's marketing surfaces are confident and the tool is genuinely well-built. Mechanical check: ask for the *first-run* wall-clock time on the actual repo (not the incremental-mode number, which only helps on run two-plus) before accepting a Stryker-adoption PR — if that number isn't in the PR description, the recommendation wasn't grounded in this repo's actual test-suite size.
- **Claims a schema library "implements Standard Schema" from memory rather than checking.** Standard Schema is young enough (spec v1, npm-modified 2025-12-15) that adoption is uneven and moving; ArkType and TypeBox's status could not be confirmed from their shipped code in this pass. Mechanical check: `grep -c '"~standard"' node_modules/<lib>/**/*.js` (or the library's own docs page, read fresh) before writing "X implements Standard Schema" into a rule or a PR description.

## Contested / evolving

- **`toMatchTypeOf` → `toExtend` migration**: settled in expect-type's own API (deprecated 2025-02-28) but still propagating through consumer docs and blog posts as of 2026-08-29 — Vitest's own guide only fixed its examples in an August 2025 PR. Trending: fully resolved within another release cycle or two; treat any doc or answer using `toMatchTypeOf` as stale today.
- **Standard Schema adoption breadth**: Zod and Valibot confirmed (verified directly against shipped code in this pass); ArkType and TypeBox unconfirmed. This is genuinely unsettled — not every schema library has committed, and the spec itself is only at v1.1.0 (npm-modified 2025-12-15), young enough that "who implements it" is a moving target rather than settled fact. Re-verify per-library before writing a rule that names specific libraries as compliant.
- **Whether mutation testing belongs in a standard TypeScript quality baseline at all**: Stryker's tooling quality and Vitest integration are no longer the blocker they once were (native runner support since v7.0) — the open question is purely cost-vs-benefit at small-to-medium repo scale, and that's a judgment call this brief settles as "not yet" for this specific fleet, not a general verdict against the tool.
- **`vitest-mock-extended` vs `@golevelup/ts-vitest`**: both solve the same problem the same way (Proxy-backed auto-mock); neither has a documented reason to prefer one over the other for a non-NestJS codebase, and this brief did not find published guidance settling it — pick one and be consistent, revisit only if one stops being maintained.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Does `vitest --typecheck` slow down the existing `test` script enough to need a separate CI job? | Determines whether type tests run on every `npm test` or need their own pipeline step | Vitest docs (this scout) | high | low |
| Should `.test-d.ts` files live next to source or in a dedicated `types-tests/` dir? | Affects `typecheck.include` config and discoverability | Vitest docs (this scout) | med | low |
| What's the exact diff-shape for replacing `extension.test.ts`'s 46 casts with `mock<T>()` — one PR or incremental? | Directly actionable from this brief's decision | fleet inspection (this scout) | high | low |
| Does `attw --profile node16` or `--profile esm-only` match what `ocx-catalog`/`grimoire-indexer` actually target? | attw's profile flag is meaningless without knowing the repo's real Node/bundler support matrix | attw README (this scout) | high | low |
| Is `publint`'s `strict` mode too aggressive for a VitePress-embedded theme package (`ocx-catalog/src/theme`)? | Theme packages often have unconventional exports that trip strict linting | publint docs (this scout, unconfirmed depth) | med | med |
| Should `fma`'s zod schemas get `.test-d.ts` coverage before or after any new schema library is added elsewhere? | Establishes the pattern before it needs to scale to a second repo | this scout | med | low |
| Does ArkType or TypeBox implement Standard Schema as of a later check? | Left unconfirmed in this pass; matters if either is ever considered for the fleet | this scout (gap) | low | high |
| What's the real first-run wall-clock cost of Stryker on `ocx-catalog` (largest repo, 28.5k LOC)? | The one number that would flip this brief's "no" verdict | not measured — would need an actual run | low | med |
| Should `vitest-mock-extended` or `@golevelup/ts-vitest` be the fleet standard? | Both work identically; an unpicked default means every repo picks independently | this scout (unsettled) | med | low |
| Does `@ts-expect-error` usage need a lint rule (e.g. requiring a trailing comment explaining why) to stay reviewable at scale? | 164-cast-scale problems recur if a new pattern is adopted without a norm | typescript-eslint's own `ban-ts-comment` rule (wave 1's rule catalogue, not re-derived here) | med | low |
| Is `fast-check`'s shrinking output actually legible for the fleet's config-parsing functions, or does it need custom arbitraries? | Property tests with bad shrinking produce unreadable failures, killing adoption | not tested against real fleet code | med | med |
| Should the `.test-d.ts` convention or a `*.type-test.ts` convention be used, given Vitest's default differs from tsd's `test-d/` directory default? | Naming consistency across repos that might use either tool | Vitest + tsd docs (this scout) | low | low |
| Does `grimoire-indexer`'s Astro/Preact rendering surface need its own typed-fake strategy distinct from `vscode.*`? | Different large-interface-fake problem (Astro's `AstroGlobal`, Preact component props) that this brief didn't survey | not covered (gap) | med | med |
| Is a mutation-testing "watch" trigger (e.g. re-evaluate at 40k LOC or first published security advisory) worth writing into a rule now? | Turns today's "no" into an actionable future trigger instead of a dead question | this scout (synthesis) | low | low |
| Does kate-middlechild's Biome-only toolchain (no ESLint, `tsc` present but not wired to lint) change how `@ts-expect-error` tests get enforced there? | Biome doesn't typecheck — the enforcement path is different from the other 8 repos | fleet inspection (this scout) | high | low |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [vitest.dev/guide/testing-types.html](https://vitest.dev/guide/testing-types.html) | Vitest's own type-testing guide | read 2026-08-29, Vitest 4.1.11 (npm-modified 2026-08-28) | primary source for `expectTypeOf`/`--typecheck`/`.test-d.ts` semantics |
| [vitest.dev/api/expect-typeof.html](https://vitest.dev/api/expect-typeof.html) | Vitest's `expectTypeOf` API reference | read 2026-08-29 | confirms full matcher list and the `toMatchTypeOf` deprecation note |
| [github.com/mmkal/expect-type](https://github.com/mmkal/expect-type) + [releases](https://github.com/mmkal/expect-type/releases) | expect-type repo and release history | v1.4.0 released 2026-06-25 | primary source for version/date and deprecation timeline (v1.2.0, 2025-02-28) |
| [github.com/tsdjs/tsd](https://github.com/tsdjs/tsd) + GitHub API metadata | tsd repo | v0.33.0, `pushed_at` 2025-08-05, 54 open issues | primary source establishing tsd's staleness as of 2026-08-29 |
| [typescriptlang.org — TS 3.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html) | official TS release notes | TS 3.9, 2020 | primary source for `@ts-expect-error` semantics and its difference from `@ts-ignore` |
| [typescriptlang.org — TS 4.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) | official TS release notes | TS 4.9, Nov 2022 | primary source for `satisfies` semantics and its assignability-without-widening behavior |
| [arethetypeswrong CLI README](https://raw.githubusercontent.com/arethetypeswrong/arethetypeswrong.github.io/main/packages/cli/README.md) | attw CLI's own README | v0.18.5 (npm-modified 2026-07-09) | primary source for exact command lines and flags (`--pack`, `--profile`, `--ignore-rules`) |
| [publint.dev/docs/javascript-api](https://publint.dev/docs/javascript-api) | publint's programmatic API docs | v0.3.24 (npm-modified 2026-08-19) | primary source turning publint into a real test assertion, not just a CLI lint |
| [standardschema.dev](https://standardschema.dev) + [spec README](https://raw.githubusercontent.com/standard-schema/standard-schema/main/packages/spec/README.md) | Standard Schema's own site and spec | spec v1.1.0 (npm-modified 2025-12-15) | primary source for the `~standard` marker convention and `InferOutput`/`InferInput` |
| [zod.dev/basics](https://zod.dev/basics) | Zod's own docs | Zod 4.5.2 (npm-modified 2026-08-29) | primary source: Zod's own warning that `satisfies z.ZodType<T>` is an incomplete contract test, and `z.toZod<T>()` as the fix |
| [github.com/eratio08/vitest-mock-extended](https://github.com/eratio08/vitest-mock-extended) | vitest-mock-extended repo | v5.1.1 (npm-modified 2026-08-02) | primary source for `mock<T>()` API and example |
| [github.com/golevelup/nestjs — packages/testing/ts-vitest/README.md](https://github.com/golevelup/nestjs/blob/master/packages/testing/ts-vitest/README.md) | `@golevelup/ts-vitest` README | v4.0.0 (npm-modified 2026-03-18) | primary source for `createMock<T>()` API and its Proxy-based mechanism |
| [github.com/NagRock/ts-mockito](https://github.com/NagRock/ts-mockito) + GitHub API metadata | ts-mockito repo | v2.6.1 (npm last publish 2022-06-27), `pushed_at` 2023-02-12 | primary source establishing ts-mockito as effectively unmaintained |
| [stryker-mutator.io/docs/stryker-js/typescript-checker](https://stryker-mutator.io/docs/stryker-js/typescript-checker/) | Stryker's TypeScript-checker docs | @stryker-mutator/typescript-checker 10.0.0 (npm-modified 2026-08-14) | primary source for config and the compile-error-mutant-skip mechanism |
| [stryker-mutator.io/docs/stryker-js/vitest-runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/) | Stryker's Vitest-runner docs | @stryker-mutator/vitest-runner 10.0.0, "since v7.0" | primary source for Vitest integration config and constraints |
| [stryker-mutator.io/docs/stryker-js/incremental](https://stryker-mutator.io/docs/stryker-js/incremental/) | Stryker's incremental-mode docs | read 2026-08-29 | primary source for the concrete "3731 of 3965 reused" cost example used in the mutation-testing verdict |
| [fast-check.dev/docs/introduction/getting-started](https://fast-check.dev/docs/introduction/getting-started/) | fast-check's own getting-started guide | fast-check 4.9.0 (npm-modified 2026-07-08) | primary source for core API and "agnostic of test runner" claim |
| [github.com/dubzzz/fast-check — packages/vitest/README.md](https://github.com/dubzzz/fast-check/blob/main/packages/vitest/README.md) | `@fast-check/vitest` README | v0.4.1 (npm-modified 2026-04-28) | primary source for `test.prop(...)` API and one-time-random mode |
| npm registry (`npm view <pkg> version time.modified`) | live npm registry metadata | queried 2026-08-29 | primary source for every version number and publish date cited in this document that isn't independently sourced from a project's own docs |
| GitHub REST API (`api.github.com/repos/<owner>/<repo>`) | live repo metadata (`pushed_at`, `open_issues_count`, `archived`) | queried 2026-08-29 | primary source for maintenance-status verdicts on tsd and ts-mockito |
| Direct fleet inspection (`/home/mherwig/dev/*/package.json`, `*/src/test/*.ts`) | the nine repos themselves | read 2026-08-29 | ground truth for what's already installed, already wired into scripts, and the actual cast pattern being replaced |

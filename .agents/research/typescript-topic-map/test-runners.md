---
title: "JS/TS test-runner landscape, 2026"
corpus: "Vitest, node:test, bun test, Playwright, Mocha + @vscode/test-cli, Jest"
agent: scout (subagent)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 29
scope: >
  Covers the six runner families the fleet's nine repos actually touch: version/date facts,
  breaking-change history, coverage/mocking/fake-timer/snapshot mechanics, ESM+TS-without-a-build-step
  behavior, and a per-fleet-shape adopt/keep/drop verdict. Does NOT re-enumerate rule catalogues
  (typescript-eslint/Biome/oxlint rule counts) — a prior wave already did that. Does not cover
  non-JS/TS test tooling (Lighthouse CI, buf/protobuf codegen checks) beyond noting where they sit
  outside the runners graded here.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Vitest](#1-vitest)
   2. [node:test](#2-nodetest)
   3. [bun test](#3-bun-test)
   4. [Playwright](#4-playwright)
   5. [Mocha + @vscode/test-cli](#5-mocha--vscodetest-cli)
   6. [Jest](#6-jest)
   7. [Assertion styles across runners](#7-assertion-styles-across-runners)
   8. [Snapshot discipline](#8-snapshot-discipline)
   9. [Fake timers across runners](#9-fake-timers-across-runners)
   10. [ESM + TypeScript without a build step](#10-esm--typescript-without-a-build-step)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- Vitest's current **stable** major is **4** (4.1.11 on npm, published 2026-08-18); **Vitest 5 is RC-only** (5.0.0-rc.3, 2026-08-28) — do not plan on v5 landing before it actually GAs.
- Vitest 4.0 (2025-10-22) removed `@vitest/browser` in favor of per-provider packages (`@vitest/browser-playwright` etc.) and renamed `workspace` → `projects`; Vitest 4.1 (2026-03-12) made Vitest consume the *installed* Vite instead of a bundled copy, so a Vite-8/Rolldown project's transform now flows straight into Vitest.
- Fleet reality: `ocx-catalog` is one full major behind (^3.2.4), `fma` is **two** majors behind (^2.1.8) — the worst-lagging repo in the fleet — while `grimoire-indexer` and `creeptd-ng/web` are current-ish on 4.1.x.
- V8 coverage is Vitest's **recommended default** and, "since v3.2.0", is documented as accuracy-equivalent to Istanbul while being faster — Istanbul is now a niche pick (Firefox/Bun environments only), not a general recommendation.
- `vi.mock` is hoisted above imports; anything the mock factory closes over from module scope needs `vi.hoisted()` or it breaks — Vitest's own docs state the hoisting but not `vi.hoisted()` on the mocking overview page, so this is a real footgun worth a lint check, not just tribal knowledge.
- `vi.useFakeTimers()` is built on `@sinonjs/fake-timers`; it does **not** fake `process.nextTick`/`queueMicrotask` by default — you must opt in via `toFake`.
- Node's `node:test` is Stability 2 (stable) since v20, but its coverage (`--experimental-test-coverage`), tag filtering (added v26.2), and global setup/teardown (added v24.0) are all still Stability 1 — it is not yet Vitest-parity tooling, it's a "good enough for a script" runner.
- Node type stripping (run `.ts` directly, no build) is default-on since **v22.18.0** and **v24.3.0**, went fully stable in **v24.12.0/v25.2.0**, and the flag was **removed entirely in v26.0.0** — but it only strips erasable syntax: `enum`/`namespace`/parameter-properties throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.
- `bun test` is Jest-API-compatible with exactly one documented gap (`.addSnapshotSerializer()` unimplemented); its own docs say "long term, Bun aims for complete Jest compatibility."
- `bun test` coverage has a real, undocumented-consequence trap: the `statements` threshold key is *accepted but never enforced*, and — found live in this fleet — **`setup-ocx/bunfig.toml` uses the wrong key names entirely** (`line`/`function`/`statement`, singular) against Bun's documented plural keys (`lines`/`functions`/`statements`), which very likely makes its coverage gate a silent no-op.
- Playwright's current stable is **1.62.0** (npm, released 2026-07-24); it just rebuilt component testing from scratch as a "stories and galleries" model *inside* `@playwright/test`, explicitly replacing the years-old `@playwright/experimental-ct-react`/`-vue` packages.
- Vitest's own docs are explicit that its browser mode gives **file-level** test isolation (one page per test *file*), while Playwright Test isolates **per test** — that's the real axis for choosing between them, not "which is newer."
- The official VS Code extension-testing guide (last updated 2026-08-26) still names `@vscode/test-cli` + `@vscode/test-electron` as the sanctioned path, "exclusively uses Mocha under the hood" for the quick-setup flow, and gives zero endorsement of Vitest or Jest as alternatives — the Electron host is the reason, not inertia.
- Mocha + `@vscode/test-cli` is the **one runner in this fleet with no native ESM/TS support at all** — confirmed in-repo: `grimoire-vscode/esbuild.tests.js` exists specifically because "lit-html is ESM-only, so the old `tsc` CJS emit can no longer `require()` it," and bundles every test file through esbuild before Mocha ever sees it.
- Jest is still actively maintained (30.5.0 on npm, Jest 30 shipped 2025-06-10, OpenJS Foundation project) but has **zero adoption** anywhere in this fleet — there is no gap to fill; it should stay out.
- `kate-middlechild` alone already runs **three** runners in one repo by test tier — `bun test` (packages/core, pure logic), Vitest **browser mode** via `@vitest/browser-playwright` (packages/web component tests), and Playwright (root, built-dist e2e + visual regression) — which means the brief's "four runners fleet-wide" undercounts the real per-repo multiplicity; `creeptd-ng/web` runs a second pair (Vitest unit + Playwright e2e) the same way.
- Every runner-shape mismatch found in this fleet is a **version-lag or config bug**, not a wrong tool choice: no repo has the wrong primary runner for its shape.

## Findings

### 1. Vitest

Current stable major is **4**, at **4.1.11** on the npm registry (published 2026-08-18). Vitest 5 exists only as a release candidate as of this writing: **5.0.0-rc.3**, published **2026-08-28** — one day before this research — with betas dating back to 2026-04-23 and the maintainer describing "no strict timeline… alignment with Vite releases preferred" ([GitHub discussion #9664](https://github.com/vitest-dev/vitest/discussions/9664)).

**Vitest 4.0** — [blog, 2025-10-22](https://vitest.dev/blog/vitest-4):
- Browser Mode graduated out of experimental status but now requires a separate provider package (`@vitest/browser-playwright`, `-webdriverio`, or `-preview`); the old `@vitest/browser` package is gone and `@vitest/browser/context` imports move to `vitest/browser`.
- `workspace`/`vitest.workspace.js` is replaced by `projects` living directly in `vitest.config.ts` ([migration guide](https://vitest.dev/guide/migration.html)).
- New `toMatchScreenshot` visual-regression matcher and `toBeInViewport`.
- Coverage: V8 provider overhauled for more accurate remapping; `coverage.all`, `coverage.ignoreEmptyLines`, and `coverage.experimentalAstAwareRemapping` are removed, and coverage now defaults to **only** files it actually collected on — `coverage.include` must be set explicitly ([migration guide](https://vitest.dev/guide/migration.html)).
- Pool architecture rewritten, dropping the `tinypool` dependency: `maxThreads`/`maxForks` → `maxWorkers`; `poolOptions` flattened.
- Default test-file exclusion narrowed to just `node_modules` and `.git` — directories like `dist`/`cypress` are no longer auto-excluded, so an explicit `test.include`/`test.dir` matters more than it used to.

**Vitest 4.1** — [blog, 2026-03-12](https://vitest.dev/blog/vitest-4-1):
- Vitest now runs against the **installed** Vite instead of a bundled copy — stated reason: "eliminating type inconsistencies in config files," and the practical effect is that a Vite-8/Rolldown project's own transform pipeline now reaches Vitest directly (this is consistent with `grimoire-indexer/vitest.config.ts`'s top-level `oxc: { jsx: {...} } }` key in this fleet, which is a Vite/Rolldown-level option surfaced through `defineConfig` from `vitest/config`, not a documented Vitest-specific key — [`vitest.dev/config/`](https://vitest.dev/config/) has no `oxc` entry).
- New test **tags** with `and`/`or`/`not`/wildcard filtering.
- Experimental `viteModuleRunner: false` to run tests against native Node imports instead of the module-runner sandbox.
- New `aroundAll`/`aroundEach` hooks, async-leak detection (`--detect-async-leaks`), and an **Agent reporter** explicitly built to "reduce token usage" for AI coding environments.

**Vitest 5 (RC, not GA)** — per the [maintainer discussion](https://github.com/vitest-dev/vitest/discussions/9664): `clearMocks` becomes **true by default** (a real behavior change to pre-test before upgrading); browser-mode locators (`getByRole()` etc.) switch `exact` to default `true`; `toHaveTextContent` becomes strict-equality instead of substring match, backed by a new `toMatchTextContent`; multi-runtime (Node/Deno/Bun) `projects` support is discussed but still proposal-stage.

**Browser mode** — [guide](https://vitest.dev/guide/browser/): three providers — Playwright (recommended; chromium/firefox/webkit, parallel execution), WebdriverIO, and a bare-bones "Preview" fallback using event simulation instead of CDP. Setup: `npx vitest init browser`, or manually install `@vitest/browser-playwright` alongside `vitest`. Vitest's own [Playwright-provider page](https://vitest.dev/guide/browser/playwright) states the key architectural fact for choosing between Vitest browser mode and Playwright Test itself: *"Unlike Playwright test runner, Vitest opens a single page to run all tests that are defined in the same file… isolation is restricted to a single test file, not to every individual test."*

**Coverage** — [guide](https://vitest.dev/guide/coverage.html): V8 is default and "the recommended option to use"; "coverage report accuracy is as good as with Istanbul (since Vitest v3.2.0)"; V8 needs no pre-instrumentation and has lower memory use, while Istanbul's only remaining edge is portability to non-V8 runtimes (Firefox, Bun) where V8 coverage doesn't work at all.

**`vi.mock` hoisting** — [guide](https://vitest.dev/guide/mocking.html): stated twice on the page, verbatim: *"a `vi.mock` call is hoisted to top of the file. It will always be executed before all imports."* `vi.hoisted()` is not documented on this overview page (it lives under the deeper `/guide/mocking/modules` doc), which means an agent skimming only the top-level mocking guide can easily miss it.

**Typechecking** — [guide](https://vitest.dev/guide/testing-types.html): `vitest --typecheck` shells out to `tsc` (or `vue-tsc`) and parses its output; by default it only treats `*.test-d.ts` files as type tests (configurable via `typecheck.include`). `expectTypeOf<T>()` gives fluent type assertions (`.toEqualTypeOf`, `.toExtend`, `.parameter(n)`); `assertType<T>()` is the simpler `@ts-expect-error`-based alternative. Files matched here are statically analyzed only, never executed — `test.each`/`test.for` dynamic names are not evaluated.

**Benchmarking** — [features guide](https://vitest.dev/guide/features.html): `vitest bench`, powered by Tinybench, is documented as **experimental**.

**Fake timers** — see [§9](#9-fake-timers-across-runners).

Fleet install snapshot (from each repo's own `package.json`, confirmed by reading the files directly, not npm):

| repo | vitest | notes |
|---|---|---|
| `ocx-catalog` | `^3.2.4` | one major behind current stable |
| `grimoire-indexer` | `^4.1.10` | current-ish (latest patch is 4.1.11) |
| `fma` | `^2.1.8` | **two** majors behind — worst in fleet |
| `creeptd-ng/web` | `^4.1.7` | current-ish |
| `kate-middlechild` (packages/web) | `^4.1.0` | current-ish, uses browser mode |

### 2. node:test

Read against the current Node docs (page reflects **v26.8.1**, the *Current* release line): [`nodejs.org/api/test.html`](https://nodejs.org/api/test.html). `node:test` itself is **Stability 2 (Stable)**, stable since v20.0.0.

- **Coverage**: Stability 1 (experimental). Enabled via `node --test --experimental-test-coverage`; reporters are `spec` (default), `tap`, `dot`, `junit`, and `lcov`. Programmatic thresholds (`lineCoverage`, `branchCoverage`, `functionCoverage`) are supported via the `run()` API. Inline suppression comments (`/* node:coverage disable */` / `ignore next`) were added in v22.3.0.
- **Mocking**: stable core feature — `mock.fn()`, `mock.method()`, `mock.getter()`/`.setter()`, `mock.module()`, `mock.property()`. Mock timers (`context.mock.timers`) landed in **v24.6.0+**.
- **Watch mode**: Stability 1 (experimental since v19.2.0), `node --test --watch`; explicitly **incompatible** with `--test-randomize`/`--test-random-seed`.
- **Snapshots**: added v22.3.0, finalized/stable **v23.4.0** — `t.assert.snapshot(value)`, regenerated via `--test-update-snapshots`.
- **Tags** (v26.2.0) and **global setup/teardown** (v24.0.0) are both still Stability 1 "early development."
- **TypeScript via type stripping**: see [§10](#10-esm--typescript-without-a-build-step) for the full mechanics; `node:test`'s default include globs already match `.ts`/`.mts`/`.cts` test-file patterns, so on a version where stripping is default-on, `node --test` picks up TypeScript test files with zero config.

What it still lacks against Vitest, concretely: no built-in browser mode, no coverage-provider choice (V8 only, and only experimental), no workspace/projects concept, no benchmarking, and its mocking/watch/tag/global-setup surface is materially newer and less battle-tested than Vitest's equivalents.

### 3. bun test

Read against Bun's docs, `bun v1.4.0` shown in the nav ([`bun.sh/docs/test/writing-tests`](https://bun.sh/docs/test/writing-tests); no page-level "last updated" timestamp).

- **Jest-API compatibility**: near-complete. The matcher list (`.toBe`, `.toEqual`, `.toContain`, `.toHaveProperty`, `.toThrow`, `.resolves`/`.rejects`, mock matchers, `.toMatchSnapshot`/`.toMatchInlineSnapshot`, etc.) is documented in full; the **only** stated gap is `.addSnapshotSerializer()`, with the docs stating the long-term goal is "complete Jest compatibility" (tracked at [oven-sh/bun#1825](https://github.com/oven-sh/bun/issues/1825)).
- **TypeScript**: no build step for running tests — Bun's runtime itself transforms TS/JSX natively (this is a full transform, not a stripper, so it does not share `node:test`'s enum/namespace restriction — see [§10](#10-esm--typescript-without-a-build-step)). Type-level assertions via `expectTypeOf` are documented as **no-ops at runtime**: `bunx tsc --noEmit` must be run separately to actually check them.
- **Coverage** ([`bun.com/docs/test/coverage`](https://bun.com/docs/test/coverage)): only two reporters, `text` and `lcov` — no HTML output built in (docs point to Codecov/Coveralls for that). `coverageThreshold` accepts `lines`, `functions`, and `statements` (all **plural**), but the docs explicitly flag that the `statements` metric, while accepted, **is not enforced**. Threshold enforcement is also gated on the `text` reporter being enabled outside `--parallel` runs — an `lcov`-only run "exits 0 regardless of threshold."
- **Mocking** ([`bun.sh/docs/test/mocks`](https://bun.sh/docs/test/mocks)): `mock.module(path, factory)` overrides both ESM and CJS caches, with live-binding updates on the ESM side; factory evaluation is lazy (only on actual import). To guarantee a mock replaces a module's *original* side effects (not just its exports) rather than merely shadowing them after the fact, Bun's docs point to `--preload`/`bunfig.toml`'s `[test].preload` array, run before any test file.
- **Divergence risk for a GitHub Action** (`setup-ocx`'s shape): fake-timer/date semantics differ from Jest in one specific, documented way — Bun's `Date` **constructor reference does not change** under fake time, "unlike Jest," which the docs frame as *preventing* certain bugs rather than causing them. Combined with Bun's TZ handling allowing the timezone to be changed multiple times at runtime (unlike Jest), this fleet's only GH-Action-on-Bun repo is on the safer side of both divergences.

**Live fleet finding**: `setup-ocx/bunfig.toml` sets
```toml
coverageThreshold = { line = 0.85, function = 0.85, statement = 0.85 }
```
against Bun's documented key names `lines` / `functions` / `statements` (plural, confirmed by two independent reads of [`bun.com/docs/test/coverage`](https://bun.com/docs/test/coverage)). Bun's docs do not say what happens on an unrecognized TOML key, but the mismatch is exact and total (all three keys are singular where the docs are plural), which is consistent with the threshold silently being treated as unset. **Verification a reviewer can run**: temporarily set a threshold above the repo's real coverage using the *correct* plural keys and confirm `bun test --coverage` now exits non-zero where it previously didn't.

### 4. Playwright

Current stable is **1.62.0**, published to npm **2026-07-24** (confirmed via the npm registry's `time` field for `@playwright/test`); a `1.63.0-alpha` prerelease channel is already publishing daily as of 2026-08-29, so 1.63 is imminent but not out.

- **Component testing** ([`playwright.dev/docs/test-components`](https://playwright.dev/docs/test-components)): rebuilt as a "stories and galleries" model living directly inside `@playwright/test` — the docs state this "replaces the experimental `@playwright/experimental-ct-react` and `@playwright/experimental-ct-vue` packages." A **story** wraps a component in one scenario (fixed props/mock data); `fixtures.mount()` navigates to a gallery and mounts a story by ID. This is a framework-agnostic model — Playwright does not own the dev-server/bundler integration the way its old `-ct-*` packages did; you bring your own. This model was introduced with **1.62** ([release notes](https://playwright.dev/docs/release-notes)), i.e. mid-2026 — recent enough that most existing tutorials and an LLM's training data likely predate it and still reference the retired `experimental-ct-*` packages.
- **Relationship to Vitest browser mode**: Playwright's own docs make no comparative statement; the deciding fact lives on Vitest's side (see [§1](#1-vitest)) — Playwright Test isolates every individual test, Vitest browser mode isolates only at the file level. Practically: pick Playwright when you need per-test isolation, real multi-browser matrices, or you're already testing a deployed/built artifact end-to-end; pick Vitest browser mode when component tests should live next to source, share the same Vite pipeline as the app, and run fast in a single page per file.
- **Trace/report tooling**: 1.60 exposed HAR recording as a first-class API (`tracing.startHar()`/`stopHar()`); recent releases improved trace-viewer step visualization, a redesigned network panel, and Cmd/Ctrl+F search in the trace's code editor. HTML reports now support timeline visualization when merging shard reports.
- **CI sharding** ([`playwright.dev/docs/test-sharding`](https://playwright.dev/docs/test-sharding)): `npx playwright test --shard=i/N` splits the suite; with `fullyParallel: true` the split happens at the individual-test level (more even); without it, splitting is per-file, so keeping test files small and even-sized matters. CI pattern: set `reporter: process.env.CI ? 'blob' : 'html'`, run a GitHub Actions matrix over `shardIndex`/`shardTotal`, then a separate job runs `npx playwright merge-reports --reporter html ./all-blob-reports`. **None of this fleet's Playwright users (`kate-middlechild`, `creeptd-ng/web`) currently shard** — both run as a single job.

Fleet install snapshot: `kate-middlechild` root `playwright@^1.52.0` and `packages/web`'s `@playwright/test@^1.52.0`; `creeptd-ng/web`'s `@playwright/test@^1.60.0` — all behind current 1.62.0, none urgently (neither uses the new component-testing model or HAR API yet).

### 5. Mocha + @vscode/test-cli

Read against the [official VS Code extension-testing guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension), stated as **last updated 2026-08-26** — three days before this research.

- Recommended install: `npm install --save-dev @vscode/test-cli @vscode/test-electron`. `@vscode/test-cli` gives quick setup and "exclusively uses Mocha under the hood"; `@vscode/test-electron` is what actually launches a real VS Code (Extension Development Host) to run inside.
- The docs explicitly leave a door open — "you can also replace Mocha with any other test framework that can be run programmatically" for advanced custom runners — but give **zero explicit endorsement of Vitest or Jest**, and no coverage-tooling guidance at all appears on the page.
- Config lives in a `.vscode-test.js/.mjs/.cjs` file via `defineConfig()`, with `files`, `version`, `workspaceFolder`, `extensionDevelopmentPath`, and a `mocha` sub-object as the documented keys.

**Fleet-confirmed facts** (read directly from the repos, not the docs):
- `grimoire-vscode/.vscode-test.mjs` sets `mocha.timeout: 30000` with an in-repo comment explaining *why*: the Mocha default (2s) "passed on Linux and timed out on a cold macOS runner" including inside `suiteTeardown` hooks that had no per-hook `this.timeout()` override. `vscode-ocx/.vscode-test.mjs` sets **no** `mocha.timeout` override at all — still on Mocha's 2s default, the exact gap `grimoire-vscode` already had to fix once.
- `vscode-ocx` pins `@vscode/test-cli@^0.0.12` and `@vscode/test-electron@3.1.0` (exact-pinned) against `grimoire-vscode`'s `@vscode/test-cli@^0.0.15`/`@vscode/test-electron@^3.1.0` (range) — version drift between the two extensions, no functional difference found.
- **This is the one runner in the fleet with no native ESM/TypeScript support.** `grimoire-vscode/esbuild.tests.js` exists specifically because Mocha's CJS-based loader inside the Electron extension host cannot `require()` an ESM-only dependency (`lit-html`); every `src/test/*.test.ts` file is bundled to CJS by esbuild before Mocha ever runs, and the repo's own comment records the exact history: *"lit-html is ESM-only, so the old `tsc -p tsconfig.test.json` CJS emit can no longer `require()` it — each `src/test/*.test.ts` is bundled by esbuild instead."* `vscode-ocx` (no ESM deps in its test surface) gets away with a plain `tsc -p . --outDir out` compile step instead — still a build step, just a cheaper one.
- Both extensions' tests use `node:assert` directly (`import * as assert from 'assert'`), matching that Mocha bundles no assertion library of its own — see [§7](#7-assertion-styles-across-runners).

### 6. Jest

[Jest's blog](https://jestjs.io/blog) confirms it is **actively maintained**, not legacy: **Jest 30** shipped **2025-06-10** ("Jest 30: Faster, Leaner, Better" — 37% faster runs, 77% lower memory use per the post), moved under the OpenJS Foundation in May 2022, and the post states an intent toward "more frequent major releases… for the next decade." The npm registry shows the current published version as **30.5.0**.

Jest 30 notably picked up `.mts`/`.cts` support and `jest.unstable_unmockModule()` for ESM — signs it is still chasing ESM parity rather than having solved it natively the way Vitest/bun test/`node:test` do by default.

**Zero adoption in this fleet.** No repo lists `jest` as a dependency. Given that every fleet shape already has a runner with equal-or-better native ESM/TS handling and lower setup cost (Vitest, bun test, or Mocha-for-Electron-specifically), there is no gap here for Jest to fill — see [§6 verdict](#tool-verdicts) and the [AI-agent angle](#ai-agent-angle) entry on this.

### 7. Assertion styles across runners

| runner | bundled assertion style | fleet's actual usage |
|---|---|---|
| Vitest | `expect()` (Jest-compatible + Chai extensions via `expect.assert`); `expectTypeOf` for types | `expect()` throughout (all vitest repos) |
| node:test | `node:assert` (strict via `assert.strict`); `t.assert.snapshot()` for snapshots | n/a — unused in fleet |
| bun test | `expect()` (Jest-compatible) | `expect()` (`setup-ocx`) |
| Playwright | its own **web-first** `expect()` — auto-retrying, async-aware (`toBeVisible`, `toHaveText`), semantically distinct from Jest's synchronous `expect` despite the same name | used as-is (`kate-middlechild`, `creeptd-ng/web`) |
| Mocha | **none bundled** — BYO | `node:assert` directly (both VS Code extensions, confirmed by reading the test files) |

The practical risk: Playwright's `expect` and Vitest/bun's `expect` share a name but not semantics (auto-retry vs. immediate assert) — copy-pasting a Playwright assertion into a Vitest browser-mode test (both exist side by side in `kate-middlechild/packages/web`) can silently stop retrying.

### 8. Snapshot discipline

- Vitest: `toMatchSnapshot()`/`toMatchInlineSnapshot()` plus the newer (v4.0) **visual** `toMatchScreenshot()`.
- bun test: `.toMatchSnapshot()`/`.toMatchInlineSnapshot()`, but no `.addSnapshotSerializer()` (see [§3](#3-bun-test)) — custom serialization for domain objects isn't available.
- node:test: `t.assert.snapshot(value)`, stable since v23.4.0, file-based, regenerated with `--test-update-snapshots`.
- Playwright: `toHaveScreenshot()` — pixel-diff visual regression, the only *visual* (not structural) snapshot mechanism among these six.

When snapshots become a liability: a broad `toMatchSnapshot()` over a large object or a whole rendered DOM tree turns into something nobody reads on diff — the update becomes a reflex (`--update`/`-u`) rather than a review. This fleet's own defensive pattern is worth calling out as the model: `kate-middlechild/playwright.config.ts` sets `expect.toHaveScreenshot: { maxDiffPixelRatio: 0.01 }` and constrains visual snapshots to `chromium-{light,dark}` only (no cross-browser visual matrix), explicitly trading completeness for stability against font-rendering/OS-level noise. Prefer narrow, named inline snapshots or direct property assertions over one giant object snapshot; reserve pixel snapshots for a small, curated set of components/pages and always set an explicit tolerance rather than trusting the default.

### 9. Fake timers across runners

| runner | implementation | what's faked by default | notable gotcha |
|---|---|---|---|
| Vitest | [`@sinonjs/fake-timers`](https://vitest.dev/api/vi.html#vi-usefaketimers) under `vi.useFakeTimers()` | `setTimeout`/`setInterval`/`clear*`/`setImmediate`/`clearImmediate`/`Date` | `process.nextTick`/`queueMicrotask` are **not** faked unless added via `toFake: [...]`; `nextTick` faking doesn't work under `--pool=forks` (works under `--pool=threads`) |
| node:test | native, `context.mock.timers` (added **v24.6.0+**) | opt-in per-API (`apis: ['setTimeout']` etc.) | newest of the three — least battle-tested |
| bun test | native `setSystemTime()` + Jest-compat `useFakeTimers()`/`useRealTimers()` | `Date.now()`, `new Date()`, `Intl.DateTimeFormat().format()` | **`Date` constructor reference itself is not swapped**, unlike Jest — the docs frame this as bug-preventing; TZ can be changed *multiple times at runtime* (`process.env.TZ = …`), which the docs explicitly say Jest cannot do |

### 10. ESM + TypeScript without a build step

| runner | native TS handling | native ESM | build step needed? |
|---|---|---|---|
| Vitest | full transform via the installed Vite (esbuild pre-v4.1, the project's own Vite/Rolldown pipeline from v4.1 on) | yes | none |
| node:test | **type stripping only** — erases annotations, does not compile; `enum`/`namespace`/parameter-properties throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; ignores `tsconfig.json`; no sourcemaps. Default-on: **v22.18.0**, **v24.3.0**; stable: **v24.12.0/v25.2.0**; flag removed: **v26.0.0** ([`nodejs.org/api/typescript.html`](https://nodejs.org/api/typescript.html)) | yes | none, *if* the source avoids non-erasable TS syntax |
| bun test | full native transform (handles enums, decorators — closer to `tsc`/`swc` than Node's stripper) | yes | none |
| Playwright | bundles/transforms test files internally | yes | none |
| Mocha + @vscode/test-cli | **none** | no (CJS-only loader under the Electron host) | **yes, always** — confirmed in-fleet via `grimoire-vscode/esbuild.tests.js` (see [§5](#5-mocha--vscodetest-cli)) |

## Tool verdicts

| tool | what it does | version + date | maturity | adopt / keep / drop / watch (this fleet) | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| Vitest 4.1 | Vite-native unit/integration/browser test runner | 4.1.11, 2026-08-18 (npm); v4.0 blog 2025-10-22, v4.1 blog 2026-03-12 | stable, mainstream default | **keep** (ocx-catalog, grimoire-indexer, fma, creeptd-ng/web) — but **upgrade** ocx-catalog (^3.2.4→^4.1) and fma (^2.1.8→^4.1, two-major jump) | native ESM/TS, zero build step, v8 coverage now Istanbul-equivalent accuracy | esbuild-only Vite unit testing, Jest for anything Vite-adjacent |
| Vitest 5 | next Vitest major | 5.0.0-rc.3, 2026-08-28 (not GA) | **RC, not stable** | **watch** — do not adopt until it GAs; pre-test `clearMocks: true` default and stricter browser-mode `exact` matching before upgrading | maintainer states no fixed date, tied to Vite releases | — |
| `@vitest/browser-playwright` | Vitest's Playwright-backed browser-mode provider | ships alongside vitest 4.x | stable (v4.0 graduated it out of experimental) | **keep** for `kate-middlechild/packages/web` | co-locates component tests with source, shares the app's Vite pipeline, file-level isolation is enough for pure components | old `@vitest/browser` string-provider config |
| `node:test` | Node's built-in test runner | Stable (Stability 2) since Node v20; docs reflect Node v26.8.1 | stable core, immature extras (coverage/tags/global-setup all Stability 1) | **watch** — not currently used anywhere in this fleet; only worth it for a zero-dependency internal script that never needs coverage thresholds, browser mode, or projects | free with Node, no dep, but genuinely behind Vitest/bun test on coverage & tooling maturity | nothing today — no fleet repo runs it |
| `bun test` | Bun's built-in, Jest-API-compatible runner | ships with Bun (docs show v1.4.0 in nav, no page date) | stable, near-complete Jest parity | **keep** (`setup-ocx`) — but **fix** the `coverageThreshold` key-name bug (`line`/`function`/`statement` → `lines`/`functions`/`statements`) | native to the Bun-based GH Action, zero extra deps, Jest-familiar API | Jest, `node:test` (for anything Bun-native) |
| Playwright | browser automation + test runner, e2e and (now) component testing | 1.62.0, 2026-07-24 (npm) | stable, actively evolving (new CT model just landed) | **keep** (`kate-middlechild`, `creeptd-ng/web`) — minor version bump recommended (both on 1.52/1.60), no runner change | per-test isolation, real multi-browser, the only real e2e/visual-regression story in the fleet | old `@playwright/experimental-ct-react`/`-vue` (component testing) |
| Mocha + `@vscode/test-cli` + `@vscode/test-electron` | the officially sanctioned VS Code extension test harness | `@vscode/test-cli` 0.0.12–0.0.15 in fleet; docs updated 2026-08-26 | stable, narrow-purpose | **keep** (`grimoire-vscode`, `vscode-ocx`) — no viable alternative for the Electron extension host per official guidance; sync `vscode-ocx`'s versions and `mocha.timeout` to `grimoire-vscode`'s | only sanctioned path for testing inside the real Extension Development Host | nothing — Vitest/Jest cannot drive the Electron host |
| Jest | general-purpose JS test runner | 30.5.0 on npm; Jest 30 released 2025-06-10 | stable, actively maintained (OpenJS Foundation) | **drop** (stay out) — zero fleet adoption and no shape it fits better than the incumbent | still chasing ESM parity (`unstable_unmockModule`) that Vitest/bun test/`node:test` already have natively | — |

## Normative guidance candidates

1. **Pin every repo's Vitest major to the current stable line (4.x) and re-audit at each new major, not each new minor.** *Rationale*: v3→v4 and (eventually) v4→v5 carry real breaking changes (coverage config, pool renames, mock-hoisting/spy semantics); silent drift compounds the eventual migration. *Verify*: `npm ls vitest --depth=0` in each repo; flag any version more than one major behind `npm view vitest version`.
2. **Every `bunfig.toml` `coverageThreshold` block must use the plural keys `lines`/`functions`/`statements`.** *Rationale*: Bun's docs confirm these are the only recognized keys; the singular form (as currently shipped in `setup-ocx`) is silently ignored. *Verify*: `grep -A1 coverageThreshold bunfig.toml` and confirm none of `line`, `function`, `statement` (singular) appear; then set a threshold above real coverage and confirm `bun test --coverage` exits non-zero.
3. **Every `.vscode-test.mjs` must set an explicit `mocha.timeout` above Mocha's 2000ms default.** *Rationale*: `grimoire-vscode` already hit this in CI (macOS cold-runner timeouts) and fixed it with `timeout: 30000`; `vscode-ocx` has not, and shares the same Electron-host-launch cost profile. *Verify*: read the `mocha` block in `.vscode-test.mjs`; absence of a `timeout` key is the failure state.
4. **A test file that references outer-scope variables inside a `vi.mock()` factory must wrap them in `vi.hoisted()`.** *Rationale*: `vi.mock` calls are hoisted above all imports; a closed-over `const` declared after the mock in source order is `undefined` at mock-factory execution time. *Verify*: an ESLint rule or grep for `vi.mock\(.*=>.*\{` bodies referencing identifiers not declared via `vi.hoisted()` or imported above the mock call — or, mechanically, temporarily reorder the mock below its referenced `const` and confirm the test still passes only when `vi.hoisted()` is used.
5. **Do not add `@playwright/experimental-ct-react`/`-vue` to any new repo.** *Rationale*: retired, replaced by the "stories and galleries" model built into `@playwright/test` since 1.62 (2026-07-24). *Verify*: `grep -r experimental-ct- package.json` across the fleet — any hit is stale.
6. **A component that needs pixel-level visual regression must set an explicit `maxDiffPixelRatio` (or equivalent tolerance) and constrain the browser/theme matrix — never rely on Playwright's or Vitest's screenshot-matcher defaults.** *Rationale*: font rendering and OS-level anti-aliasing differ across CI runners; `kate-middlechild`'s `maxDiffPixelRatio: 0.01` + chromium-only matrix is the fleet's only example that does this correctly. *Verify*: grep `toHaveScreenshot`/`toMatchScreenshot` call sites for a tolerance option; flag bare calls.
7. **Never add `jest` as a dependency in this fleet.** *Rationale*: zero existing adoption, and no fleet shape lacks a better-fitting native-ESM runner already (Vitest, bun test, or Mocha-for-Electron specifically). *Verify*: `grep -l '"jest"' */package.json` should always be empty; treat any hit as a review-blocking addition requiring justification.
8. **Do not adopt Vitest 5 in any repo until `vitest@5` shows a non-prerelease version on npm.** *Rationale*: as of 2026-08-29 it is RC-only (5.0.0-rc.3), with breaking mock/browser-matcher defaults still settling. *Verify*: `npm view vitest dist-tags.latest` — anything containing `-rc.`/`-beta.` is not GA.

## AI-agent angle

| what an LLM characteristically gets wrong | why it happens | the smallest mechanical check |
|---|---|---|
| Writes `jest.mock()`/`jest.fn()` inside a Vitest test file | Jest muscle memory; the APIs read almost identically | `grep -rn '\bjest\.' **/*.test.ts` in a repo whose only test dep is `vitest` — any hit is wrong |
| Adds `@vitest/browser` as a direct dependency on a v4+ project | that was the pre-v4.0 package name; the split into per-provider packages (`@vitest/browser-playwright`) is recent (2025-10-22) and easy to miss | `npm ls @vitest/browser` should be empty on vitest ^4; the correct dep is a `@vitest/browser-*` provider package |
| Suggests `@playwright/experimental-ct-react`/`-vue` for new component testing | those packages existed for years and are all over pre-2026-07 tutorials/training data; the replacement (built into `@playwright/test`) shipped with 1.62 mid-2026 | `grep -r experimental-ct- package.json` — any hit means stale guidance was followed |
| Writes `enum`/`namespace` in a file meant to run directly under `node --test` with no build step | Node's type stripping is easy to conflate with "full TypeScript support"; it explicitly is not | `node --test path/to/file.ts` — an `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` exit means the syntax choice was wrong for this runner |
| Uses singular threshold keys (`line`/`function`/`statement`) in `bunfig.toml`, mirroring Jest's/Istanbul's more common singular-ish naming conventions | Bun's plural convention (`lines`/`functions`/`statements`) isn't the obvious default to guess, and nothing errors when it's wrong | set threshold above real coverage with the *correct* plural keys and confirm `bun test --coverage` now fails where the singular-key version didn't |
| Assumes `vi.useFakeTimers()` fakes `process.nextTick`/`queueMicrotask` the way some other fake-timer libraries do by default | reasonable assumption from adjacent libraries; Vitest's sinon-backed default explicitly excludes these two | a test asserting microtask ordering right after `vi.useFakeTimers()` with no `toFake` override, that only passes because it happened not to depend on the excluded APIs — flip it to depend on them and watch it fail silently-wrong instead of erroring |
| Recommends adding Jest "as the standard" to a new 2026 TS project | Jest remains the most-documented/most-trained-on test runner historically | any new `"jest"` line in a `package.json` in this fleet should be treated as needing explicit justification, not accepted as a default |

## Contested / evolving

- **Vitest 5 timing**: RC-only as of 2026-08-29 (5.0.0-rc.3, 2026-08-28); GA date genuinely unannounced ("no strict timeline… aligned with Vite releases" per the maintainer's own discussion thread, comments through ~mid-2026). Trending toward release "soon" but not committed — do not plan migrations against a date.
- **V8 vs Istanbul coverage**: settled, not contested — Vitest's docs now claim v8 accuracy parity with Istanbul "since v3.2.0" (mid-2025), reversing years of "v8 coverage is close enough but not exact" folklore. Istanbul's remaining case is portability to non-V8 runtimes, not accuracy.
- **Playwright component testing vs. Vitest browser mode**: genuinely unsettled, and *recently* so — Playwright's CT model was rebuilt from the ground up in 1.62 (2026-07-24), which is barely a month old as of this research. `kate-middlechild` is this fleet's only real data point, and it resolved the tension by using *both* for different tiers (Vitest browser mode for co-located fast component tests, Playwright for whole-built-site e2e/visual diffing) rather than picking a winner — that split looks like where practice is trending for repos that have both a design-system layer and a shipped site, but it is too early to call it a consensus.
- **`node:test` maturity**: trending toward parity but not there — coverage, tags, and global setup/teardown are all still Stability 1 even on Node's *Current* release line (v26) as of 2026-08-29.
- **Multi-runner-per-repo as a pattern**: this research found it already happening in 2 of 9 repos (`kate-middlechild`: 3 runners; `creeptd-ng/web`: 2 runners), split strictly by test tier (logic vs. component vs. e2e) rather than by indecision — worth normalizing as intentional rather than flagging as fleet inconsistency.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| vitest-v5-adoption-timing | breaking mock/browser-matcher defaults; fleet must not chase a moving RC | [GH #9664](https://github.com/vitest-dev/vitest/discussions/9664) | high | high — GA could land any time |
| vitest-major-version-drift | `ocx-catalog` 1 major, `fma` 2 majors behind stable | fleet `package.json` reads | high | med |
| bun-coverage-threshold-key-bug | `setup-ocx`'s coverage gate is likely a silent no-op right now | fleet `bunfig.toml` + [Bun coverage docs](https://bun.com/docs/test/coverage) | high | low (a fix, not a trend) |
| playwright-ct-vs-vitest-browser-boundary | two overlapping "component test" stories, actively repositioning | [Playwright CT docs](https://playwright.dev/docs/test-components), [Vitest browser guide](https://vitest.dev/guide/browser/) | high | high |
| e2e-vs-component-test-boundary | where Playwright e2e should stop and in-source component tests should start, fleet-wide | `kate-middlechild`/`creeptd-ng/web` configs | high | high |
| visual-snapshot-tolerance-discipline | pixel snapshots without tolerance are inherently flaky across CI runners | `kate-middlechild/playwright.config.ts` | high | med |
| vi-mock-hoisting-footgun | closed-over vars in `vi.mock()` factories break without `vi.hoisted()` | [Vitest mocking guide](https://vitest.dev/guide/mocking.html) | med | low |
| node-test-runner-viability | is `node:test` ever the right call for a zero-dep internal script in this fleet | [`nodejs.org/api/test.html`](https://nodejs.org/api/test.html) | med | med — coverage/tags still Stability 1 |
| fake-timer-semantics-per-runner | sinon (Vitest) vs. native (node:test) vs. Bun's own Date-constructor-preserving model | [§9](#9-fake-timers-across-runners) | med | low |
| mocha-timeout-floor-consistency | `vscode-ocx` missing the timeout override `grimoire-vscode` already needed | fleet `.vscode-test.mjs` files | med | low |
| assertion-style-consistency | `node:assert` (Mocha) vs. `expect()` (Vitest/bun) vs. Playwright's async `expect()` sharing a name with different semantics | fleet test files | med | low |
| coverage-provider-choice | v8-vs-Istanbul accuracy gap has closed; fleet is already all-v8, so mostly a "don't regress" watch | [Vitest coverage guide](https://vitest.dev/guide/coverage.html) | low | low |
| ci-sharding-adoption | no fleet repo currently shards Playwright/Vitest runs; matters once suites grow | [Playwright sharding docs](https://playwright.dev/docs/test-sharding) | low | med — grows with suite size |
| vscode-test-cli-version-drift | `vscode-ocx` behind `grimoire-vscode` on `@vscode/test-cli`/`test-electron` pins | fleet `package.json` reads | low | low |
| jest-adoption-guardrail | keeping a sixth runner from entering the fleet by habit | [Jest blog](https://jestjs.io/blog) | low | low |
| type-stripping-for-zero-build-scripts | Node 26 removed the transform-types flag entirely; the stripping-only ceiling (`enum`/`namespace`) is a real authoring constraint if ever adopted | [`nodejs.org/api/typescript.html`](https://nodejs.org/api/typescript.html) | low | med — Node's own TS story is still moving |
| vitest-bench-adoption | `vitest bench` is still experimental; none of the fleet uses it, but perf-sensitive repos (`fma`'s WebGL work) might want it eventually | [Vitest features guide](https://vitest.dev/guide/features.html) | low | med |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [vitest.dev/guide/migration.html](https://vitest.dev/guide/migration.html) | Vitest 4.0 migration guide (primary) | current, v4.0-era | canonical breaking-changes list |
| [vitest.dev/blog](https://vitest.dev/blog) | Vitest blog index (primary) | current | dated list of major-version announcements |
| [vitest.dev/blog/vitest-4](https://vitest.dev/blog/vitest-4) | Vitest 4.0 announcement (primary) | 2025-10-22 | browser-mode/coverage/pool overhaul details |
| [vitest.dev/blog/vitest-4-1](https://vitest.dev/blog/vitest-4-1) | Vitest 4.1 announcement (primary) | 2026-03-12 | installed-Vite change, tags, Agent reporter |
| [github.com/vitest-dev/vitest/discussions/9664](https://github.com/vitest-dev/vitest/discussions/9664) | maintainer discussion on Vitest 5 (primary) | ongoing, read 2026-08-29 | only source for v5's planned breaking changes/timeline |
| [vitest.dev/guide/browser/](https://vitest.dev/guide/browser/) | Vitest browser-mode guide (primary) | current | providers, setup, browser support matrix |
| [vitest.dev/guide/browser/playwright](https://vitest.dev/guide/browser/playwright) | Vitest's Playwright-provider page (primary) | current | the file-vs-test isolation distinction vs. Playwright Test |
| [vitest.dev/guide/coverage.html](https://vitest.dev/guide/coverage.html) | Vitest coverage guide (primary) | current | v8-vs-Istanbul recommendation and accuracy claim |
| [vitest.dev/guide/mocking.html](https://vitest.dev/guide/mocking.html) | Vitest mocking guide (primary) | current | `vi.mock` hoisting statement |
| [vitest.dev/guide/testing-types.html](https://vitest.dev/guide/testing-types.html) | Vitest typecheck guide (primary) | current | `--typecheck`/`expectTypeOf` mechanics and limits |
| [vitest.dev/guide/features.html](https://vitest.dev/guide/features.html) | Vitest features overview (primary) | current | confirms `vitest bench` is experimental |
| [vitest.dev/api/vi.html#vi-usefaketimers](https://vitest.dev/api/vi.html#vi-usefaketimers) | Vitest API ref for fake timers (primary) | current | sinon backing, `toFake` opt-ins, `--pool=forks` gotcha |
| [vitest.dev/config/](https://vitest.dev/config/) | Vitest config reference (primary) | current | confirms `oxc` is not a documented Vitest-specific key |
| [nodejs.org/api/test.html](https://nodejs.org/api/test.html) | Node.js `node:test` API docs (primary) | reflects Node v26.8.1 | stability levels for coverage/mocking/watch/tags/snapshots |
| [nodejs.org/api/typescript.html](https://nodejs.org/api/typescript.html) | Node.js TypeScript/type-stripping docs (primary) | reflects current Node line | exact version table for default-on/stable/flag-removed |
| [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) | Node.js release schedule (primary) | current, read 2026-08-29 | confirms v22/v24 Active LTS, v20/v25 EOL, v26 Current |
| [bun.sh/docs/test/writing-tests](https://bun.sh/docs/test/writing-tests) | Bun test-runner docs (primary) | v1.4.0 in nav | Jest-compat matcher list, `expectTypeOf` no-op caveat |
| [bun.com/docs/test/coverage](https://bun.com/docs/test/coverage) | Bun coverage docs (primary) | current | exact threshold key names (`lines`/`functions`/`statements`), unenforced-`statements` caveat |
| [bun.sh/docs/test/mocks](https://bun.sh/docs/test/mocks) | Bun mocking docs (primary) | current | `mock.module()` live-binding/lazy-eval semantics, `--preload` |
| [bun.com/docs/test/time](https://bun.com/docs/test/time) | Bun fake-timer/date docs (primary) | current | `setSystemTime`, `Date`-constructor-preserved caveat, TZ handling |
| [playwright.dev/docs/release-notes](https://playwright.dev/docs/release-notes) | Playwright release notes (primary) | current, through 1.62 | component-testing rebuild, HAR API, trace-viewer changes |
| [playwright.dev/docs/test-components](https://playwright.dev/docs/test-components) | Playwright component-testing guide (primary) | current (1.62-era model) | explicit statement that this replaces `experimental-ct-*` |
| [playwright.dev/docs/test-sharding](https://playwright.dev/docs/test-sharding) | Playwright sharding guide (primary) | current | exact `--shard`/`merge-reports` commands |
| [code.visualstudio.com/api/working-with-extensions/testing-extension](https://code.visualstudio.com/api/working-with-extensions/testing-extension) | official VS Code extension-testing guide (primary) | "last updated 8/26/2026" | sanctioned tooling, Mocha-under-the-hood statement |
| [jestjs.io/blog](https://jestjs.io/blog) | Jest blog (primary) | Jest 30 post, 2025-06-10 | proves Jest is still maintained, gives 30.x facts |
| [mochajs.org/#assertions](https://mochajs.org/#assertions) | Mocha homepage (primary) | current | confirms Mocha bundles no assertion library |
| npm registry `vitest` package `time` field | package registry metadata (primary) | queried 2026-08-29 | ground truth for 4.1.11 (2026-08-18) and 5.0.0-rc.3 (2026-08-28) dates |
| npm registry `@playwright/test` package `time` field | package registry metadata (primary) | queried 2026-08-29 | ground truth for 1.60/1.61/1.62 exact release dates |
| npm registry `jest` package `time`/`version` fields | package registry metadata (primary) | queried 2026-08-29 | ground truth for 30.5.0 current version, 30.0.0 date |

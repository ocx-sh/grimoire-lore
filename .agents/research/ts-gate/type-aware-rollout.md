---
title: Type-Aware Linting Rollout
topic: typescript-eslint typed linting adoption across the ocx/grimoire fleet
agent: scout (ts-gate wave 3)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 15
scope: |
  Covers: projectService vs legacy `project`, allowDefaultProject mechanics,
  the fleet's one working reference implementation (setup-ocx), measured
  wall-clock cost of typed linting vs `tsc --noEmit`, and a rule-by-rule
  adoption ranking against measured fleet evidence (not the preset list).
  Does not cover: tsgolint/oxlint adoption (settled in wave 2), non-TS rules,
  or CI wiring beyond the lint/typecheck script split.
---

## Table of contents

1. [Findings](#findings)
   1. [projectService vs legacy `project`: the decision](#1-projectservice-vs-legacy-project-the-decision)
   2. [The out-of-project-file gap is universal, not an edge case](#2-the-out-of-project-file-gap-is-universal-not-an-edge-case)
   3. [Solution-style tsconfigs (fma) work with bare `projectService`](#3-solution-style-tsconfigs-fma-work-with-bare-projectservice)
   4. [Non-default-named sibling tsconfigs need a scoped `project` override](#4-non-default-named-sibling-tsconfigs-need-a-scoped-project-override)
   5. [setup-ocx read in full: the five `no-unsafe-*` disablements are noise-driven, and over-scoped](#5-setup-ocx-read-in-full-the-five-no-unsafe--disablements-are-noise-driven-and-over-scoped)
   6. [Measured cost: typed lint is ~2–2.2× bare `tsc --noEmit`, and duplicates it](#6-measured-cost-typed-lint-is-22222-bare-tsc---noemit-and-duplicates-it)
   7. [Rule value, ranked against measured fleet evidence](#7-rule-value-ranked-against-measured-fleet-evidence)
   8. [Thirteen type-aware rules ship in no preset — not twelve](#8-thirteen-type-aware-rules-ship-in-no-preset--not-twelve)
   9. [Rollout scope by shape](#9-rollout-scope-by-shape)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

## Summary

- Adopt `projectService: true` as the fleet default; it is typescript-eslint's own recommended option and needs no hand-built `tsconfig.eslint.json` for the common case ([parser docs](https://typescript-eslint.io/packages/parser/)).
- Every fleet repo's own `eslint.config.js` sits outside its main tsconfig's `include` — confirmed by reading all 7 in-scope repos' tsconfig `include` arrays — so `allowDefaultProject` is mandatory everywhere, not an edge case.
- Live-reproduced the failure fleet-wide: bare `projectService: true` throws `Parsing error: ... was not found by the project service` on `grimoire-indexer/test/*.test.ts`, `grimoire-indexer/vitest.config.ts`, and (borrowing tooling read-only) every file under `ocx-catalog/src/theme/**` (16 files) — exact fix is `allowDefaultProject` or a scoped `project` override, not a wholesale ignore.
- `ocx-catalog` (`tsconfig.json` + `tsconfig.theme.json`) and `creeptd-ng/web` (root config + `e2e/tsconfig.e2e.json`) both use a differently-named sibling tsconfig; `projectService` only auto-discovers files literally named `tsconfig.json` walking up directories — confirmed live for ocx-catalog — so both need an explicit `files`-scoped legacy `project` block for the sibling config, `projectService` alone will not find it.
- `fma`'s Vite-scaffold solution-style root (`tsconfig.json` with `"files": []` + `"references"`) works with bare `projectService: true` — measured live, zero parsing errors across `src/**`.
- setup-ocx (`/home/mherwig/dev/setup-ocx/eslint.config.js`) is the fleet's only wired reference, and it uses the **legacy** `project: "./tsconfig.eslint.json"`, not `projectService` — it hand-solved the out-of-project-file problem the way `projectService` was built to make unnecessary.
- Its five `no-unsafe-*` rules are turned off with an in-repo comment ("Action code talks to @actions/* which has a few any-typed seams") — that's noise-driven, not cost-driven — but the disablement applies repo-wide even though only 14 import sites across 9 files touch `@actions/*` (1,082 LOC total); copying the block wholesale propagates an over-broad suppression.
- Measured on `grimoire-indexer` (8,326 src LOC): `tsc --noEmit` = 1.94s wall; typed ESLint (`recommendedTypeChecked` + `projectService`) = 4.32s wall — 2.23×.
- Measured on `fma` (`src`, solution-style, 4,465 app LOC): `tsc --noEmit` (app project only) = 1.76s; typed ESLint over `src` = 3.54s — ~2.0×.
- Verdict: typed lint **duplicates** the six repos' existing `tsc --noEmit`/`vue-tsc --noEmit` scripts, it does not replace them — ESLint's typed rules build their own TS program independent of a separately invoked `tsc` process, and only report what specific rules probe for, not the full TSxxxx diagnostic set. Keep both.
- `ocx-catalog` and `grimoire-vscode` (the two named-largest repos) have no installed `node_modules` in this environment; direct timing wasn't possible without an `npm install` that would modify files outside this report, so their cost is an **estimate**, not a measurement — extrapolated from the two data points above, order of a few seconds for `tsc --noEmit` alone and roughly double that for typed ESLint, not tens of seconds.
- Live-firing `recommendedTypeChecked` against `fma/src` (real code, not synthetic) found 2 real `no-floating-promises` hits (`PlayerPage.tsx:71`, `:142`), 6 `no-misused-promises` hits (async handlers passed where a void return is expected — `SpotifyPanel.tsx`, `EditorPage.tsx`, `LibraryPage.tsx`, `PlayerPage.tsx`), 2 `no-unsafe-assignment`, 1 `no-implied-eval` (`transformers.ts:199`, a `Function` constructor call), and 3 `no-unnecessary-type-assertion` — all in `recommendedTypeChecked`, none requiring extra hand-picked rules.
- Rules that ship in **no** preset: 13, not 12 — enumerated from the generated config source at tag `v8.68.0`, not the rendered rules table (which under-counts). See §8 for the exact list and the diff against the brief's premise.
- `no-unsafe-type-assertion` (one of the 13) flags only single-step narrowing (`x as number`); its own docs give no example of the `x as unknown as T` double-cast the fleet actually uses 164 times — could not establish from the rule doc whether it catches that pattern, so verify the fleet's real escape hatch with `grep -rn "as unknown as "` regardless of which rules are on.
- `prefer-readonly-parameter-types` (another of the 13) is explicitly self-disqualifying: "This rule is very strict on what it considers mutable... skip this rule if your project does not attempt to enforce strong immutability guarantees of parameters" — none of the nine fleet repos do. Do not add it.
- `kate-middlechild` is out of scope entirely: it runs Biome (`biome.json`), has no `eslint.config.*` anywhere in the repo, and its `lint`/typecheck story is not ESLint's to change.
- `creeptd-ng/web` has no `eslint.config.*` file at all despite a `"lint": "eslint src --ext .ts,.vue"` script (a legacy-CLI flag flat config doesn't use) — it needs a baseline flat config built from scratch before a typed-linting decision even applies to it, plus the same sibling-tsconfig fix as ocx-catalog for `e2e/tsconfig.e2e.json`.

## Findings

### 1. projectService vs legacy `project`: the decision

**Decision: `projectService: true` fleet-wide, with an explicit `allowDefaultProject` list per repo, plus a scoped legacy `project` override block only where a repo has a non-default-named sibling tsconfig.**

typescript-eslint's own getting-started page states typed linting is enabled with two changes — a `TypeChecked`-suffixed preset, and `languageOptions.parserOptions.projectService: true` in flat config ([typed-linting](https://typescript-eslint.io/getting-started/typed-linting/)). The parser reference page states the rationale directly:

> "Simpler configurations: most projects shouldn't need to explicitly configure project paths or create tsconfig.eslint.jsons" and "Predictability: it uses the same type information services as editors, giving better consistency with the types seen in editors."
> — [typescript-eslint parser docs](https://typescript-eslint.io/packages/parser/)

That second point is not abstract for this fleet: setup-ocx's own working config is the counter-example (§5) — it hand-built a `tsconfig.eslint.json` specifically because it predates/avoids `projectService`. `projectService` is the option that lets a repo delete that file.

`projectService` accepts `true | false | ProjectServiceOptions`, with these object fields (read from the parser docs):

| Field | Default | Purpose |
|---|---|---|
| `allowDefaultProject` | — | Glob patterns for files outside any tsconfig that should still get a (default) type-checked pass. `"**"` is disallowed. A file cannot match both this and its nearest `tsconfig.json`. |
| `defaultProject` | `'tsconfig.json'` | The compiler options used *for files matched by `allowDefaultProject`* — not a general fallback. |
| `loadTypeScriptPlugins` | `false` | Off by default because TS plugins can start persistent watchers that block process exit. |
| `maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING` | `8` | A hard cap on how many files `allowDefaultProject` may match — the name itself is the warning. |

Source: [typescript-eslint parser docs](https://typescript-eslint.io/packages/parser/). Setting both `project` and `projectService` is an error per the same page.

### 2. The out-of-project-file gap is universal, not an edge case

Read every in-scope repo's tsconfig `include` array directly:

| Repo | Main tsconfig `include` | Repo-root `eslint.config.js` covered? |
|---|---|---|
| `ocx-catalog/tsconfig.json:12` | `["src"]` | No |
| `grimoire-indexer/tsconfig.json` | `["src"]` | No |
| `grimoire-vscode/tsconfig.json` | `["src"]` | No |
| `vscode-ocx/tsconfig.json` | `["src"]` | No |
| `fma/tsconfig.app.json` | `["src"]` | No |
| `creeptd-ng/web/tsconfig.json` | `["src/**/*.ts","src/**/*.vue","scripts/**/*.ts"]` | No |
| `setup-ocx/tsconfig.json` | `["src/**/*.ts"]` | No — solved by a **separate** `tsconfig.eslint.json` that hand-adds it (§5) |

None of the seven main tsconfigs include their own `eslint.config.js`. Reproduced the resulting failure live, twice:

```
$ eslint --config <scratch-config with bare projectService:true> .   # inside grimoire-indexer
.../test/smoke.test.ts
  0:0  error  Parsing error: .../test/smoke.test.ts was not found by the project
              service. Consider either including it in the tsconfig.json or
              including it in allowDefaultProject
```
11 files failed this way in `grimoire-indexer` alone (`test/**`, `vitest.config.ts`) — `grimoire-indexer/tsconfig.json` only includes `src`.

```
$ eslint --config <scratch-config> src   # against ocx-catalog, borrowed toolchain
.../src/theme/index.mts
  0:0  error  Parsing error: ... was not found by the project service ...
```
All 16 files under `ocx-catalog/src/theme/**` failed the same way — `ocx-catalog/tsconfig.json:12` explicitly `"exclude": ["src/theme"]`.

`grimoire-vscode` and `vscode-ocx` share the identical shape: both have a top-level `test/` directory sibling to `src/`, and both tsconfigs are `"include": ["src"]` only — the same class of failure will hit their Mocha suites on a bare flip.

**Practical consequence**: `allowDefaultProject` is not an edge-case knob for this fleet, it is a required part of every repo's migration, covering at minimum `["eslint.config.js"]` plus whatever config/test files sit outside `include` per repo (`vitest.config.ts`, `vite.config.ts` node half, `playwright.config.ts`, mocha `test/**`).

### 3. Solution-style tsconfigs (fma) work with bare `projectService`

`fma/tsconfig.json` is a Vite-scaffold "solution" file:

```json
{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }
```

typescript-eslint's docs don't call this pattern out explicitly (the `getting-started/typed-linting/monorepos` URL returned no fetchable content as of 2026-08-29 — could not establish what it says), so this was verified by direct measurement instead, per the brief's own priority rule. Ran `recommendedTypeChecked` + bare `projectService: true` against `fma/src` (fma's own installed `typescript-eslint@8.59.1`, satisfying its declared `^8.18.1`):

```
$ eslint --config <scratch-config> src
✖ 23 problems (23 errors, 0 warnings)   # all real rule hits, zero parsing errors
```

Zero `"not found by the project service"` errors. `projectService`'s directory walk correctly resolves through the root solution file to the two referenced projects for every `src/**/*.{ts,tsx}` file. **Conclusion: solution-style TS project references need no special handling under `projectService`.**

### 4. Non-default-named sibling tsconfigs need a scoped `project` override

`ocx-catalog` and `creeptd-ng/web` both pair a default-named root config with a sibling that isn't named `tsconfig.json`:

- `ocx-catalog/tsconfig.json` (excludes `src/theme`) + `ocx-catalog/tsconfig.theme.json` (`"extends": "./tsconfig.json"`, `"include": ["src/theme"]`) — the two `tsc` invocations in its `typecheck` script are separate, not project-referenced (`ocx-catalog/package.json:59`: `"tsc --noEmit && tsc -p tsconfig.theme.json"`).
- `creeptd-ng/web/tsconfig.json` (`include`: `src/**`, `scripts/**`) + `creeptd-ng/web/e2e/tsconfig.e2e.json` (`include`: `./**/*.ts`, `../playwright.config.ts`) — same shape, Playwright e2e specs and `playwright.config.ts` live entirely outside the root config's reach.

Per the parser docs (§1) and confirmed live for the ocx-catalog case (§2), `projectService`'s auto-discovery walks up directories looking only for a file literally named `tsconfig.json`; it has no config surface to add a second named file to that search. The fix is a `files`-glob-scoped block using the **legacy** `project` option for just the sibling tree, alongside a `projectService`-based default block for everything else:

```js
// correct: split by files, mix projectService and legacy project
export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: { allowDefaultProject: ["eslint.config.js"] }, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["src/theme/**"],
    languageOptions: {
      parserOptions: { project: "./tsconfig.theme.json", projectService: false, tsconfigRootDir: import.meta.dirname },
    },
  },
);
```
```js
// wrong: bare projectService, silently drops src/theme (16 files) to parsing errors
export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
);
```

### 5. setup-ocx read in full: the five `no-unsafe-*` disablements are noise-driven, and over-scoped

Full file, 54 lines, read directly (`/home/mherwig/dev/setup-ocx/eslint.config.js`):

```js
 1  // @ts-check
 2  import eslint from "@eslint/js";
 3  import tseslint from "typescript-eslint";
 4  import prettier from "eslint-config-prettier";
 5
 6  export default tseslint.config(
 7    {
 8      ignores: ["dist/", "coverage/", "node_modules/", "scripts/build.ts", "eslint.config.js"],
 9    },
10    eslint.configs.recommended,
11    ...tseslint.configs.strictTypeChecked,
12    ...tseslint.configs.stylisticTypeChecked,
13    {
14      languageOptions: {
15        parserOptions: {
16          project: "./tsconfig.eslint.json",
17          tsconfigRootDir: import.meta.dirname,
18        },
19      },
20      rules: {
21        // Action code talks to @actions/* which has a few any-typed seams.
22        "@typescript-eslint/no-unsafe-assignment": "off",
23        "@typescript-eslint/no-unsafe-member-access": "off",
24        "@typescript-eslint/no-unsafe-call": "off",
25        "@typescript-eslint/no-unsafe-argument": "off",
26        "@typescript-eslint/no-unsafe-return": "off",
27        ...
```

Three findings from this file, none available from the preset list alone:

1. **Line 16 uses the legacy `project` option, not `projectService`** — the fleet's only working reference implementation predates the recommended path. It also means `setup-ocx/tsconfig.eslint.json` (`include`: `src/**/*.ts`, `tests/**/*.ts`, `scripts/**/*.ts`, `eslint.config.js`) is exactly the hand-built workaround `allowDefaultProject` replaces (§1's quoted rationale). Migrating setup-ocx to `projectService` + `allowDefaultProject: ["eslint.config.js", "scripts/build.ts"]` would let it delete that extra tsconfig file.
2. **Line 8's `ignores` currently drops `scripts/build.ts` and `eslint.config.js` from linting entirely** — not just type-aware rules, *all* rules, including plain `no-unused-vars`. This is the exact scenario the brief named ("setup-ocx currently ignores both"), confirmed by direct read. `allowDefaultProject` is the fix that gets these files real coverage instead of none.
3. **The five `no-unsafe-*` rules are turned off for a stated, noise-driven reason** — the line-21 comment cites `@actions/*` "any-typed seams," not lint runtime cost; nothing in the file or its performance profile suggests a cost motive. But the block at lines 13–32 carries no `files` restriction, so it applies to every TS file the config touches. Measured: `@actions/*` is imported at exactly 14 call sites across 9 files (`grep -rn 'from "@actions/' src/`), against 1,082 total `src/` LOC. Copying this block wholesale into another repo — or even leaving it as-is here — silences all five rules fleet-wide (or repo-wide) for what is, by the repo's own accounting, a narrow surface. The lazy, correct fix is a `files`-scoped override naming just the 9 touching files, not a blanket rule-off.

### 6. Measured cost: typed lint is ~2–2.2× bare `tsc --noEmit`, and duplicates it

Docs claim: "if you're using type-aware linting, your lint times should be roughly the same as your build times" and "Running typed linting on a project is generally as slow as type checking that same project" ([performance troubleshooting](https://typescript-eslint.io/troubleshooting/typed-linting/performance/)). Measured directly, both are conservative — ESLint's own overhead sits on top:

| Repo | LOC (measured scope) | `tsc --noEmit` wall | Typed ESLint wall (`recommendedTypeChecked` + `projectService`) | Ratio |
|---|---|---|---|---|
| `grimoire-indexer` | 8,326 (`src/**/*.ts,tsx`) | 1.943s (`3.47s user, 0.33s sys, 195% cpu`) | 4.317s / 4.351s (two runs) | 2.23× |
| `fma` | 4,465 (`src` only; app project) | 1.764s | 3.542s (`src`, both referenced projects resolved) | 2.01× |
| `vscode-ocx` | 2,272 (`src`) | 0.776s | not run (no typed config to probe from) | — |

`ocx-catalog` (28.5k LOC) and `grimoire-vscode` (38.5k LOC) — the two repos the brief names as largest — have **no installed `node_modules`** in this environment; `npm install` would write files outside this report's scope and was not run. Direct measurement was not possible; the table above is the full measured set. **Estimate**, scaled from the measured LOC/time pairs above (roughly 0.0002s/LOC plus ~0.3–0.4s fixed process startup, a rough fit — `fma`'s framework/JSX overhead already deviates from it by ~0.4s, so treat this as order-of-magnitude, not precise): `tsc --noEmit` alone in the single-digit-seconds range for both, typed ESLint roughly double that. Neither is likely to reach tens of seconds at this LOC scale based on the measured curve, but this is explicitly an estimate, not a measurement.

**Duplicated, not replaced.** Six repos already run a separate typecheck script — confirmed by reading every `package.json`:

```
ocx-catalog:      "typecheck": "tsc --noEmit && tsc -p tsconfig.theme.json"
grimoire-indexer:  "typecheck": "tsc --noEmit"
grimoire-vscode:   "check-types": "tsc --noEmit"
vscode-ocx:        "check-types": "tsc --noEmit"
fma:               "typecheck": "tsc --noEmit"
creeptd-ng/web:    "typecheck": "vue-tsc --noEmit"
```

Turning on typed ESLint does not let any of these be dropped: the measured ratio (2.0–2.23×) shows the ESLint invocation costs *more* than the bare `tsc --noEmit` it's compared against, meaning it is doing that same program-build work again inside its own process, not reusing a result from the separately-invoked `tsc` CLI call — the two are different processes with no shared cache across a CI job's separate steps. Nor is it a diagnostic superset: typed rules only fire for the specific pattern each rule targets (an unsafe assignment, a floating promise), not TypeScript's full ~50-code diagnostic set (a plain type mismatch with no matching rule produces no ESLint output at all). **Keep both scripts; they check different things and neither subsumes the other's wall-clock cost.**

### 7. Rule value, ranked against measured fleet evidence

Ranked by what the fleet's own numbers back, not preset placement:

1. **`no-floating-promises` / `no-misused-promises`** (both `recommendedTypeChecked`) — highest measured value. 98 `void`-marker sites fleet-wide (wave 1/2 measurement) already show the pattern is *handled* in most places; live-firing against `fma/src` found the 2 real gaps directly: `PlayerPage.tsx:71` and `:142` are un-awaited promises with no `.catch`/`void`, and 6 more sites (`SpotifyPanel.tsx:73,91-93`, `EditorPage.tsx:140,147`, `LibraryPage.tsx:54,91`) pass an async handler where a void-returning one is expected (`no-misused-promises`'s `checksVoidReturn` default). This is exactly the class of bug an AI agent introduces when it reaches for `onClick={async () => ...}` without thinking about the return type.
2. **The five `no-unsafe-*` rules** (`recommendedTypeChecked`) — real, but narrower than the preset badge suggests once you exclude noise: 2 genuine `no-unsafe-assignment` hits in `fma` (`Inspector.tsx:260`, `importExport.ts:29`), both on `any`-typed values crossing an API boundary — the exact shape setup-ocx's comment describes, and the exact shape a repo-wide `off` would silently swallow.
3. **`no-unnecessary-type-assertion`** (`recommendedTypeChecked`) — 3 hits in `fma` alone (`Inspector.tsx:239`, `transformers.ts:62`, `importExport.ts:34`), each a leftover cast that no longer narrows anything. Cheap, mechanical, zero false-positive risk observed.
4. **`no-implied-eval`** (`recommendedTypeChecked`) — 1 real hit (`fma/src/graph/transformers.ts:199`, a `Function` constructor call). Low frequency but high severity when it fires; keep it on, expect near-zero noise.
5. **`unbound-method`, `require-await`, `await-thenable`, `only-throw-error`** (all `recommendedTypeChecked`) — not independently exercised in these runs (no hits surfaced in `fma`'s 23 problems), but they ride along with `recommendedTypeChecked` at no extra adoption cost — accepting the preset accepts these too.
6. **`no-unnecessary-condition`** (`strictTypeChecked`, one tier up) — not measured directly; adopt only where a repo also adopts `strictTypeChecked` (setup-ocx already does). Do not hand-pick it into a `recommendedTypeChecked` repo without the rest of `strict` — it has a documented history of firing on `noUncheckedIndexedAccess` interactions, and three fleet repos (`grimoire-vscode`, `vscode-ocx`, `creeptd-ng/web`) already set that compiler flag (`grimoire-vscode/tsconfig.json`, `vscode-ocx/tsconfig.json`, `creeptd-ng/web/tsconfig.json`), so verify on a real run before enabling rather than assuming.
7. **`restrict-template-expressions`** — already tuned by setup-ocx's own repo (`allowNumber`, `allowBoolean`, `allowNullish`) with a stated reason ("We use template literals over toString() for the error path", line 27) — reuse that override, don't take the strict-preset default's stricter version (`allowNumber:false` etc., per §8's config dump) fleet-wide without checking each repo's actual template-literal usage first.

### 8. Thirteen type-aware rules ship in no preset — not twelve

The brief's premise cites twelve. Read the actual generated config sources at the pinned tag `v8.68.0` (the same version typescript-eslint's docs site header showed) rather than the rendered rules table, which produced inconsistent counts across repeated fetches of the same page and is therefore not trustworthy for an exact enumeration:

- [`disable-type-checked.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/disable-type-checked.ts) turns off every type-checked rule that exists — **61 total**, matching the "59 of 61" tsgolint coverage figure from wave 2.
- [`recommended-type-checked-only.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/recommended-type-checked-only.ts) ∪ [`strict-type-checked-only.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/strict-type-checked-only.ts) (strict is a superset of recommended for every type-checked rule, confirmed by diffing the two files) = 40 distinct rules.
- [`stylistic-type-checked-only.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/stylistic-type-checked-only.ts) adds 8 more, disjoint from the 40.
- 40 + 8 = 48 covered by some preset. **61 − 48 = 13 rules in no preset at all:**

```
consistent-return                naming-convention              promise-function-async
consistent-type-exports          no-unnecessary-qualifier       require-array-sort-compare
no-unsafe-type-assertion         prefer-destructuring            strict-boolean-expressions
prefer-readonly                  prefer-readonly-parameter-types strict-void-return
                                                                  switch-exhaustiveness-check
```

Of these, only two have measurable fleet relevance right now:

- **`no-unsafe-type-assertion`** — its own doc's Incorrect/Correct examples ([rule page](https://typescript-eslint.io/rules/no-unsafe-type-assertion/)) only cover single-step narrowing (`f() as number` where `f()` returns `number | string`); no example shows a double-cast through `unknown`. Could not establish from the rule doc whether `x as unknown as T` — the fleet's actual, measured 164-occurrence escape hatch — trips this rule at all. Treat it as unproven for that pattern; verify with `grep -rn "as unknown as "` regardless of whether the rule is on.
- **`prefer-readonly-parameter-types`** — explicitly self-disqualifying per its own doc: *"This rule is very strict on what it considers mutable... skip this rule if your project does not attempt to enforce strong immutability guarantees of parameters."* ([rule page](https://typescript-eslint.io/rules/prefer-readonly-parameter-types/)). No fleet repo enforces parameter immutability today. Do not add it.

The remaining 11 (`consistent-return`, `consistent-type-exports`, `naming-convention`, `no-unnecessary-qualifier`, `prefer-destructuring`, `prefer-readonly`, `promise-function-async`, `require-array-sort-compare`, `strict-boolean-expressions`, `strict-void-return`, `switch-exhaustiveness-check`) were not independently measured against fleet code this wave; treat as low-priority, opt-in per repo rather than fleet-mandated.

### 9. Rollout scope by shape

| Shape | Repos | Status |
|---|---|---|
| CLI w/ stub facade | `ocx-catalog`, `grimoire-indexer` | In scope. `grimoire-indexer` is close to a direct `projectService` flip (single tsconfig, already has a `typecheck` script). `ocx-catalog` needs the §4 split config for `tsconfig.theme.json` first. |
| VS Code extension | `grimoire-vscode`, `vscode-ocx` | In scope, highest expected yield — the two repos hold 84 of the fleet's 164 `as unknown as T` casts (79 + 5, confirmed by direct grep, matching the wave-2 figure exactly) — but both need `allowDefaultProject` for `test/**` (§2) before flipping. |
| GitHub Action | `setup-ocx` | Already wired, on the legacy `project` path. Migrate to `projectService` + `allowDefaultProject` to delete `tsconfig.eslint.json`; re-scope the `no-unsafe-*` overrides to the 9 files that touch `@actions/*` (§5). |
| Browser SPA | `fma`, `creeptd-ng/web` | `fma` is close to ready — solution-style tsconfig already confirmed compatible (§3), just needs `allowDefaultProject` for `eslint.config.js`/`vite.config.ts`. `creeptd-ng/web` has **no `eslint.config.*` file at all** (its `package.json:14` `"lint": "eslint src --ext .ts,.vue"` uses a pre-flat-config flag) — needs a baseline config built before typed linting is even a question, plus the §4 split for `e2e/tsconfig.e2e.json`. |
| Biome monorepo | `kate-middlechild` | **Exempt.** `biome.json` present, no `eslint.config.*` anywhere in the repo — this is not typescript-eslint's decision to make. |

## Normative guidance candidates

1. **Every flat config that enables `projectService` must also set `allowDefaultProject` covering at least `["eslint.config.js"]`, plus any repo-specific out-of-tsconfig files (test dirs, `vitest.config.ts`, `playwright.config.ts`).**
   Rationale: confirmed by direct read that none of the fleet's main tsconfigs include their own `eslint.config.js` (§2); omitting this throws a hard parsing error on the very file that defines the lint config.
   Verify: `eslint .` with `projectService: true` and no `allowDefaultProject` on a repo whose tsconfig doesn't include `eslint.config.js` — a clean pass with zero `"was not found by the project service"` errors confirms coverage.

2. **A repo with a non-default-named sibling tsconfig (anything not literally `tsconfig.json`) needs a `files`-scoped block using legacy `project`, not a bare `projectService: true`.**
   Rationale: `projectService`'s auto-discovery only recognizes files named `tsconfig.json` walking up directories (parser docs, §1); confirmed live that `ocx-catalog/src/theme/**` (16 files, via `tsconfig.theme.json`) breaks under bare `projectService`.
   Verify: `find <repo> -iname "tsconfig*.json" | grep -v tsconfig.json$` — any hit means check whether that config's `include` overlaps a bare-`projectService` gap the way §4 shows.

3. **Solution-style root tsconfigs (`"files": []` + `"references"`) need no special-casing under `projectService`.**
   Rationale: measured directly on `fma` — zero parsing errors across `src/**` with bare `projectService: true` (§3).
   Verify: re-run the same probe after any tsconfig restructuring; a parsing error regression means the reference graph changed in a way `projectService` no longer resolves.

4. **Never disable a `no-unsafe-*` rule without a `files` scope naming the files that actually need the exemption.**
   Rationale: setup-ocx's own justification (`@actions/*` seams) covers 9 of its files; its actual disablement covers all of them (§5) — the config is more permissive than its own comment claims.
   Verify: for any `no-unsafe-*: "off"` block, check whether it carries a `files` array; if not, `grep -c` the stated reason's import/pattern against the files the block's scope actually covers and confirm the ratio isn't near-total-file-count-vs-few-uses.

5. **Both the `typecheck`/`check-types` script and typed ESLint stay — do not drop one to "save" the other's cost.**
   Rationale: measured typed ESLint costs *more* wall time than a bare `tsc --noEmit` on the same project (2.0–2.23×, §6), meaning it is not reusing that work, and it only surfaces what specific rules probe for, not TypeScript's full diagnostic set.
   Verify: `time npm run typecheck` vs `time npx eslint .` (typed config) on the same repo — if ESLint's time is *lower* than the bare tsc run, something is caching across them and this guidance should be revisited; the fleet's measured pattern (§6) says it won't be.

6. **Adopt `recommendedTypeChecked` (or `strictTypeChecked` where a repo already sets `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`) as the floor. Do not hand-pick individual type-aware rules outside a preset unless the fleet evidence in §7/§8 names them.**
   Rationale: every rule with a measured real hit this wave (`no-floating-promises`, `no-misused-promises`, the `no-unsafe-*` five, `no-unnecessary-type-assertion`, `no-implied-eval`) is already in `recommendedTypeChecked`; nothing outside a preset earned its keep against fleet code except the two named in §8, one of which (`prefer-readonly-parameter-types`) is a "do not add."
   Verify: diff a repo's `eslint.config.js` rules block against `recommendedTypeChecked`'s rule list (§8 config sources) — anything added should trace to a specific measured finding, not a general "more rules is safer" instinct.

7. **`grimoire-vscode` and `vscode-ocx` get type-aware linting before the CLI/SPA shapes, priority order aside — they hold 84 of the fleet's 164 `as unknown as T` casts.**
   Rationale: measured directly (§9 table); this is where `no-unsafe-*` has the most surface to find real problems, mirroring what actually turned up in `fma`.
   Verify: `grep -rn "as unknown as " <repo> --include='*.ts' --include='*.tsx' | grep -v node_modules | wc -l` before and after a rollout — a shrinking count over time is the adoption signal.

8. **`kate-middlechild` is out of scope for any typescript-eslint change.**
   Rationale: confirmed no `eslint.config.*` file exists anywhere in the repo; it runs Biome (`biome.json`) instead.
   Verify: `find kate-middlechild -iname "eslint.config*"` returns nothing.

## AI-agent angle

- **An agent asked to "enable type-aware linting" will reach for `projectService: true` alone and stop.** The smallest mechanical check: run the resulting config against the whole repo (not just `src/`) once — any `"was not found by the project service"` line means the config is incomplete, not that those files should be added to `.eslintignore`.
- **An agent fixing a `no-unsafe-*` violation reaches for `as unknown as T` rather than fixing the type.** That's the fleet's own measured pattern (164 occurrences) and it may not even be caught by `no-unsafe-type-assertion` (§8) — grep for the literal string after any type-aware rollout, independent of what the linter reports, since the linter may not be the backstop here.
- **An agent silencing a rule set that's "too noisy" will turn it off at the top of the file instead of scoping a `files` override.** setup-ocx's own reference implementation already made this mistake once (§5) — a config with `"@typescript-eslint/no-unsafe-*": "off"` and no adjacent `files:` array in the same block is the mechanical tell.
- **An agent copying setup-ocx as "the fleet's working example" will copy the `project: "./tsconfig.eslint.json"` line verbatim**, propagating the legacy path into a new repo instead of the now-recommended `projectService`. The check: does the new repo actually need a hand-built `tsconfig.eslint.json`, or would `allowDefaultProject` cover the same files with less config? For every repo measured this wave, the answer was the latter.
- **An agent given "async onClick handler" style React/Preact code will write `onClick={async () => ...}` without noticing the misused-promise.** This is not hypothetical — it is exactly what `fma`'s own code does today at 6 measured sites (§7 item 1). `no-misused-promises` catches this mechanically; nothing else in the fleet's current toolchain does (ESLint's non-typed rules can't see the return type).

## Contested / evolving

- **`getting-started/typed-linting/monorepos`** — the URL returned no fetchable content as of 2026-08-29 (two attempts, with and without trailing slash). Could not establish what current guidance says about monorepos beyond what was independently measured in §3–4. If this page exists under a different slug, it wasn't found this wave.
- **Whether `no-unsafe-type-assertion` catches `x as unknown as T`** — undetermined from the rule's own doc (§8); the rule is new enough (absent from all three presets, unlike its type-checked siblings) that its edge-case coverage isn't yet documented with examples. Worth re-checking against a future doc revision or a direct test run once a repo actually adopts it.
- **`strictTypeChecked`'s `no-unnecessary-condition` interacting with `noUncheckedIndexedAccess`** — flagged in §7 as needing a real run rather than blind adoption; not independently measured this wave, called out here so it isn't silently dropped from later work.
- **Where the `no-unsafe-*` rules land on the cost-vs-noise question fleet-wide** — settled for setup-ocx specifically (noise, §5), not established for `grimoire-vscode`/`vscode-ocx`, the two repos most likely to have `@vscode`-API-shaped `any` seams of their own (VS Code's own extension API types are looser in places than typical app code). Worth an early canary run before committing to "no exceptions" fleet-wide guidance for these two.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typescript-eslint.io/getting-started/typed-linting](https://typescript-eslint.io/getting-started/typed-linting/) | Official docs, primary | Read 2026-08-29, site shows v8.68.0 | The canonical two-step enable sequence and the exact flat/legacy config code blocks. |
| [typescript-eslint.io/troubleshooting/typed-linting/performance](https://typescript-eslint.io/troubleshooting/typed-linting/performance/) | Official docs, primary | Read 2026-08-29 | Source of the "lint time ≈ build time" claim this report measures against directly. |
| [typescript-eslint.io/packages/parser](https://typescript-eslint.io/packages/parser/) | Official docs, primary | Read 2026-08-29 | `projectService` option shape, `allowDefaultProject`/`defaultProject` semantics, the "simpler configurations" rationale quoted in §1. |
| [typescript-eslint.io/rules/no-unsafe-type-assertion](https://typescript-eslint.io/rules/no-unsafe-type-assertion/) | Official rule doc, primary | Read 2026-08-29 | Only rule doc checked for the `as unknown as T` question; settles what it does and doesn't demonstrate. |
| [typescript-eslint.io/rules/prefer-readonly-parameter-types](https://typescript-eslint.io/rules/prefer-readonly-parameter-types/) | Official rule doc, primary | Read 2026-08-29 | Self-disqualifying caveat quoted verbatim in §8. |
| [github.com/.../configs/flat/disable-type-checked.ts (v8.68.0)](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/disable-type-checked.ts) | Generated source, primary | Tag v8.68.0 | The authoritative full list of all 61 type-checked rules — more reliable than the rendered rules table, which gave inconsistent counts across repeated fetches. |
| [github.com/.../recommended-type-checked-only.ts (v8.68.0)](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/recommended-type-checked-only.ts) | Generated source, primary | Tag v8.68.0 | Exact rule membership of `recommendedTypeChecked`'s type-aware half. |
| [github.com/.../strict-type-checked-only.ts (v8.68.0)](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/strict-type-checked-only.ts) | Generated source, primary | Tag v8.68.0 | Exact rule membership of `strictTypeChecked`'s type-aware half; used to confirm strict ⊇ recommended. |
| [github.com/.../stylistic-type-checked-only.ts (v8.68.0)](https://github.com/typescript-eslint/typescript-eslint/blob/v8.68.0/packages/eslint-plugin/src/configs/flat/stylistic-type-checked-only.ts) | Generated source, primary | Tag v8.68.0 | Exact rule membership of `stylisticTypeChecked`'s type-aware half. |
| `/home/mherwig/dev/setup-ocx/eslint.config.js` | Fleet source, primary | Read 2026-08-29, repo HEAD | The fleet's only working type-aware config; read in full for §5. |
| `/home/mherwig/dev/ocx-catalog/tsconfig.json` + `tsconfig.theme.json` | Fleet source, primary | Read 2026-08-29, repo HEAD | The multi-tsconfig shape §4's decision is built on. |
| `/home/mherwig/dev/fma/tsconfig.json` (+ `.app.json`/`.node.json`) | Fleet source, primary | Read 2026-08-29, repo HEAD | The solution-style shape §3 measured against. |
| `/home/mherwig/dev/creeptd-ng/web/tsconfig.json` + `e2e/tsconfig.e2e.json` | Fleet source, primary | Read 2026-08-29, repo HEAD | Second confirmed instance of the §4 sibling-tsconfig shape; also surfaced the missing-`eslint.config.js` finding. |
| typescript-eslint docs site rules index (rendered table) | Official docs, secondary | Read 2026-08-29 | Cross-checked against the generated config sources; flagged in §8 as unreliable for an exact count — kept as a documented negative result, not used as evidence. |
| Live measurement runs (this session) | Primary, first-party | 2026-08-29 | `tsc --noEmit` and typed-ESLint timings on `grimoire-indexer`/`fma`, plus the `ocx-catalog`/`grimoire-indexer` parsing-error reproductions cited throughout §2–§6 — not a URL, the evidence itself. |

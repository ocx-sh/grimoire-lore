---
title: TypeScript codified practice — compiler flags, style guides, packaging and supply-chain rules
corpus: codified practice (style guides, compiler docs, linter rule lists, packaging tools, security checklists)
agent: landscape-scout
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 25
scope: >
  TypeScript-specific codified practice for a fleet of five shapes: published ESM library +
  commander CLI on NodeNext (Node >=20/>=22); VS Code extensions (esbuild-bundled, Electron
  host); a GitHub Action running on Bun; browser SPAs (React+Vite, Vue+Vite); a Biome monorepo.
  TypeScript ^5.7 floor. Excludes ground already covered by the prior Rust/Python programs:
  error taxonomies, testing discipline, security posture (generic), API design, CLI exit-code
  contracts, data modelling, observability, dependency policy, CI gates.
---

## Table of contents

1. [Summary](#summary)
2. [The compiler-flag catalogue](#the-compiler-flag-catalogue)
3. [Codified rule sets](#codified-rule-sets)
   - [TypeScript compiler-option catalogue (typescriptlang.org)](#a-typescriptlangorgtsconfig)
   - [`@tsconfig/*` shared bases](#b-tsconfigbases)
   - [`@total-typescript/tsconfig`](#c-total-typescripttsconfig)
   - [Google TypeScript Style Guide](#d-google-typescript-style-guide)
   - [TypeScript Deep Dive style guide](#e-typescript-deep-dive-style-guide-basarat)
   - [Microsoft TypeScript compiler-team coding guidelines](#f-microsoft-typescript-compiler-team-coding-guidelines)
   - [Node.js official security best practices](#g-nodejs-official-security-best-practices)
   - [OWASP Node.js Security Cheat Sheet](#h-owasp-nodejs-security-cheat-sheet)
   - [`publint` rule list](#i-publint-rule-list)
   - [`@arethetypeswrong/cli` problem list](#j-arethetypeswrongcli-problem-list)
   - [npm/GitHub supply-chain practice](#k-npmgithub-supply-chain-practice)
   - [`package.json` exports/imports specification](#l-packagejson-exportsimports-specification-nodejs)
   - [typescript-eslint typed-linting rule set](#m-typescript-eslint-typed-linting-rule-set)
   - [`eslint-plugin-security`](#n-eslint-plugin-security)
   - [Bun's TypeScript handling](#o-buns-typescript-handling)
4. [Candidate topics](#candidate-topics)
5. [Sources](#sources)

## Summary

- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `isolatedDeclarations`, `noUnusedLocals`/`noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `allowUnreachableCode`/`allowUnusedLabels` are **all outside `strict`** — every community tsconfig base independently re-adds a subset of exactly these, which is itself the signal that they're the checkable-but-not-default gap a fleet rule set should close.
- `noUncheckedSideEffectImports` defaults to `true` as of recent TypeScript releases (the fetched catalogue shows default `true`) — verify against the exact 5.7 changelog before asserting fleet-wide, because several `@tsconfig/*` bases still list it explicitly, implying it wasn't always on by default.
- Every community base that ships a strictness opinion (`@tsconfig/strictest`, Total TypeScript's presets, Bun's own recommended config) converges on the *same* five extra flags: `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes` (strictest only), `noFallthroughCasesInSwitch`, `noUnusedLocals`/`noUnusedParameters` — that convergence is strong evidence these are the fleet's missing floor, not house style.
- The measured fleet fact — `noUncheckedIndexedAccess` ON in 4 repos, OFF in the largest published library — mirrors a real split in the ecosystem: `@tsconfig/strictest` and Total TypeScript both turn it on, `@tsconfig/recommended` and `@tsconfig/node22` do not. A rule set should recommend it fleet-wide and flag the library as the outlier, not treat the split as settled practice.
- `verbatimModuleSyntax` is the flag that resolves the fleet's four-way module-resolution split at the *syntax* level even when `moduleResolution` itself can't be unified: it forces `import type`/`export type` to be explicit, which is a prerequisite both Total TypeScript's presets and Bun's recommended config independently set alongside `isolatedModules`.
- `erasableSyntaxOnly` (TypeScript 5.8+) is real for this fleet's Bun-based GitHub Action specifically — it exists to guarantee code is safe for runtime type-stripping (Node's `--experimental-strip-types`, Bun's native TS execution) and forbids `enum`, namespaces, and parameter properties. Confirm the fleet's floor is actually 5.8+ before adopting it as a blanket rule; the stated floor is only ^5.7.
- `isolatedDeclarations` (TypeScript 5.5+) is the flag that makes per-file declaration emit parallelizable and is a prerequisite for fast multi-package builds (relevant to the Biome monorepo shape); it requires every exported value to carry an explicit type annotation, which is a bigger migration cost than the other flags in this list.
- Node.js 20 (Iron) is EOL as of March 2026 per the official release schedule — the fleet's stated "Node >=20" floor for the published library includes a runtime already past end-of-life; this is a candidate finding, not a style question.
- `@tsconfig/node22` and `@tsconfig/bases`' `recommended.json` disagree on `module`/`moduleResolution` (`nodenext`/`node16` vs `commonjs`/implicit) and on `target` (`es2022` vs `es2016`) — direct evidence for the fleet's own four-way module-resolution split; a rule should state which axis (target Node runtime vs. bundler-consumed) governs the choice per repo shape.
- Google's TypeScript Style Guide bans `any`-suppressing patterns without a comment, bans default exports, bans namespaces, requires `interface` over `type` for object shapes, and requires `unknown` over `any`/`{}` for opaque values — these are all still current TypeScript idiom as of 2026 and are the highest-value "must"/"must not" items to port, because they're each independently checkable by `@typescript-eslint` rules.
- `no-default-export` (Google) directly conflicts with common Vite/React SPA convention (default-exported page/route components) — flag this as a per-shape exception rather than a blanket rule for this fleet.
- The Microsoft TypeScript-compiler-team guidelines are internal style for the compiler's own codebase (not a public API guide) and are dated relative to current idiom — most notably "use `undefined`, do not use `null`" contradicts TypeScript Deep Dive's "use `null` for Node-style APIs" and Google's context-dependent guidance; treat MS's guide as historical color, not a source of adoptable rules for this fleet.
- Whether type-aware linting (`recommended-type-checked`/`strict-type-checked`) is enabled anywhere in the fleet is the single highest-leverage unverified fact: roughly 56 of typescript-eslint's rules require type information, including `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-condition`, and the `no-unsafe-*` family — none of these fire without `parserOptions.project`/`projectService`, so if it's off anywhere, an entire class of runtime-correctness bugs (unhandled promise rejections, `any` leakage) is currently unchecked.
- `publint` and `@arethetypeswrong/cli` are the two tools that already automate nearly all of "packaging correctness" (exports ordering, `types` condition placement, dual CJS/ESM declaration mismatches) — a rule file should point at running them in CI rather than re-encode their checks as prose, since they're purpose-built linters for exactly this fleet's published-library shape.
- The `FalseCJS`/`FalseESM` class of arethetypeswrong problems is specifically about a single `.d.ts` misrepresenting a dual-format package — directly relevant to the fleet's published ESM library, which must ship format-specific declaration files (`.d.mts`/`.d.cts`) if it ever gains a CJS entry point.
- npm provenance (`--provenance`, Sigstore-backed) requires a cloud-hosted CI provider (GitHub Actions or GitLab CI) and cannot be generated from a self-hosted runner or locally — a fleet-wide publish rule should state this as a hard CI-topology constraint, not just a flag to pass.
- `npm ci` (not `npm install`), `--ignore-scripts`, and pinned versions (not ranges) with a committed lockfile are the three concrete, independently-checkable supply-chain controls that both Node.js's own security page and OWASP converge on — `--ignore-scripts` is the one most commonly missing in practice because it breaks native-addon postinstalls.
- `packageManager` + Corepack is the codified way to pin the package manager itself (not just dependencies); Corepack ships bundled with Node.js only through the 24.x line and is explicitly not distributed from Node 25 onward — a fleet using Corepack today has a forward-compatibility cliff to plan for.
- Dependabot's `groups` key and Renovate's `config:best-practices` preset (which adds Docker/GitHub-Actions digest pinning and dev-dependency pinning on top of `config:recommended`) are the two codified "don't hand-roll a bot config" defaults; recommend `config:best-practices` over bare `config:recommended` for anything publishing artifacts.
- Bun's own documented recommended tsconfig sets `moduleResolution: "bundler"`, `verbatimModuleSyntax: true`, `noEmit: true`, and `types: ["bun"]` — this is a fifth, Bun-specific point in the fleet's module-resolution split and is the correct baseline for the GitHub Action shape specifically, not a fleet-wide default.
- `exports` map rules (types condition first, `default` last, no bare paths, subpath patterns need matching extensions on both sides) are fully codified in Node's own docs and fully checked by `publint`; the "types first" convention is a community best-practice layered on top of Node's own resolution order, not a Node.js requirement itself — cite it as such.

## The compiler-flag catalogue

Full enumeration fetched from [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/). Table below covers **all flags in the Type Checking, Modules, Interop Constraints, and Language & Environment categories** (the categories the brief asked to prioritize), with migration-cost and fleet verdicts layered on top of the fetched defaults. Full Emit/Projects/Watch/Diagnostics/Output-Formatting/Completeness categories were fetched in full (see raw enumeration below the table) but are lower-priority for a rule file since they're mostly build-topology, not code-quality, choices.

| Flag | What it does | Implied by `strict`? | Default | Adopt for this fleet? | Migration cost |
|---|---|---|---|---|---|
| `noUncheckedIndexedAccess` | Adds `\| undefined` to indexed-access reads (`arr[i]`, `obj[key]`) | No | `false` | **Yes, fleet-wide.** Already on in 4/5 repos; the outlier library is the risk, not the norm. | Medium — every unguarded index read needs a narrow or `!`; mechanical but touches many call sites in older code. |
| `exactOptionalPropertyTypes` | `?:` means "may be absent," not "may be `undefined`" — `{a?: string}` rejects `{a: undefined}` | No | `false` | Yes for the library and CLI (public API surface benefits most); optional/lower priority for SPAs. | Medium-high — breaks any code that does `{...opts, a: opts.a ?? undefined}`-style spreading. |
| `noImplicitOverride` | Requires `override` keyword when overriding a base-class method | No | `false` | Yes, fleet-wide — pure addition, zero behavior change, catches silent base-class drift. | Low. |
| `noPropertyAccessFromIndexSignature` | Forces `obj['key']` instead of `obj.key` when the type only has an index signature | No | `false` | Yes for the library/CLI; skip for SPA/monorepo unless index signatures are common there. | Low-medium — mostly a find-and-replace once index-signature types are identified. |
| `noUncheckedSideEffectImports` | Errors on `import './x'` when `./x` can't be resolved/verified | No | `true` (per fetched catalogue) | Verify current default against the fleet's exact 5.7 patch; if on, no action needed. | N/A if already default-on. |
| `erasableSyntaxOnly` | Forbids TS syntax with runtime semantics (enums, namespaces, parameter properties) so the file can be stripped to JS with no compiler | No | `false` | **Bun Action shape only** — this is what makes Bun's native TS execution and Node's `--experimental-strip-types` safe. Not relevant to the bundled/esbuild shapes. | Low if the codebase avoids enums/param-properties already; high if it leans on them (common in NestJS-style DI, less likely here). |
| `verbatimModuleSyntax` | Preserves `import`/`export` syntax verbatim — forces explicit `import type`/`export type`, removes ambiguous elision | No | `false` | Yes, fleet-wide. Both Total TypeScript's presets and Bun's recommended config set it alongside `isolatedModules`; it's the one flag that makes the module-resolution split tractable at the syntax level. | Medium — every mixed value/type import needs splitting into `import type`. Codemod-able. |
| `isolatedDeclarations` | Requires every exported value to have an explicit type so `.d.ts` can be emitted per-file without a full program check | No | `false` | Yes for the published library (parallel/fast declaration emit matters most there) and the Biome monorepo (per-package builds). Skip for SPAs (no declaration emit) and the VS Code extension/Bun Action (bundled, not published as a library). | High — requires annotating every exported function's return type and every exported const's type across the whole public surface. |
| `noFallthroughCasesInSwitch` | Errors on a non-empty `case` that falls through without `break`/`return` | No | `false` | Yes, fleet-wide — pure bug-catcher, near-zero false positives. | Low. |
| `noImplicitReturns` | Errors when not all code paths in a function explicitly return a value | No | `false` | Yes, fleet-wide. | Low-medium — occasionally flags intentional `undefined`-returning branches; needs explicit `return undefined`. |
| `noUnusedLocals` / `noUnusedParameters` | Errors on unused local variables / function parameters | No | `false` / `false` | Recommend as a **lint** rule (`@typescript-eslint/no-unused-vars` with `argsIgnorePattern`) rather than a compiler flag — compiler-level unused-parameter errors are often too strict for interface-implementing methods and callback signatures. | Low if delegated to ESLint; medium if enabled at the compiler level (no ignore-pattern escape hatch). |
| `allowUnreachableCode` / `allowUnusedLabels` | `false` errors on unreachable code / unused labels; `true` silences; `undefined` (default) warns only in some tooling | No | `undefined` | Set explicitly to `false` (error) fleet-wide — leaving it `undefined` means editor-only warnings that CI won't catch. | Low. |
| `strict` | Umbrella for `alwaysStrict`, `noImplicitAny`, `noImplicitThis`, `strictBindCallApply`, `strictBuiltinIteratorReturn`, `strictFunctionTypes`, `strictNullChecks`, `strictPropertyInitialization`, `useUnknownInCatchVariables` | N/A | `true` since TS 5.0 `init` default | Already assumed as fleet floor. | N/A. |
| `isolatedModules` | Requires each file to be independently transpilable (no cross-file type-only imports without `import type`) | No | `false` | Yes, fleet-wide — required for esbuild (VS Code extension) and Bun (Action) shapes already; harmonize the other three shapes onto it too so behavior doesn't diverge by tool. | Low if `verbatimModuleSyntax` is adopted alongside it (they overlap in effect). |
| `resolvePackageJsonExports` / `resolvePackageJsonImports` | Whether `tsc` itself honors the package's `exports`/`imports` map during resolution | No | `true` for `node16`/`nodenext`/`bundler` moduleResolution | Fleet-wide once `moduleResolution` is harmonized; currently follows from each repo's existing `moduleResolution` choice. | None — inherited, not set directly. |

<details>
<summary>Full fetched enumeration, all categories (Emit, Projects, Watch, Diagnostics, Output Formatting, Completeness, Backwards Compatibility, JavaScript Support, Editor Support, root fields, Type Acquisition)</summary>

Fetched verbatim from [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/) — omitted from the priority table above because these are build-topology/tooling choices rather than code-quality rules a per-edit rule file would enforce. Notable items worth a one-line mention in a rule file if adopted:

- `skipLibCheck: true` — appears as a default recommendation in **every** community base fetched (`strictest`, `node22`, `recommended`, Total TypeScript). Treat as fleet-wide default; it trades a small correctness gap (won't catch bugs in third-party `.d.ts` files) for meaningfully faster builds, and every codified source agrees on it.
- `forceConsistentCasingInFileNames: true` — appears in `@tsconfig/bases` `recommended.json`; relevant given this fleet spans WSL/Linux and (for VS Code extension work) Windows/macOS dev machines — case-insensitive filesystems mask real bugs. Recommend fleet-wide.
- `declaration` / `declarationMap` / `declarationDir` — required for the published library shape only; not applicable to the SPA, VS Code extension, or Bun Action shapes (none publish `.d.ts`).
- `composite` / `incremental` / `tsBuildInfoFile` / project `references` — directly relevant to the Biome monorepo shape for cross-package incremental builds; worth a monorepo-specific subsection rather than a fleet-wide rule.
- `useDefineForClassFields` — defaults to `true` once `target` is ES2022+; matters if any repo still targets pre-ES2022 and relies on legacy class-field assignment semantics (TC39 class-fields vs. `Object.defineProperty`).

</details>

## Codified rule sets

### A. [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/)

The canonical compiler-option reference. Used as the source for the full catalogue above. Still correct as of 2026 (official, continuously updated docs) — checkable by: the compiler itself (`tsc --noEmit`).

### B. [`@tsconfig/bases`](https://github.com/tsconfig/bases)

Community-maintained shared base configs, one per target runtime/framework (node10 through node26, bun, deno, vite-react, etc.) plus a `strictest` and `recommended` base independent of runtime.

Extracted normative content (fetched raw JSON):

- `strictest.json`: `strict: true` plus `allowUnusedLabels: false`, `allowUnreachableCode: false`, `exactOptionalPropertyTypes: true`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noImplicitReturns: true`, `noPropertyAccessFromIndexSignature: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `isolatedModules: true`, `esModuleInterop: true`, `skipLibCheck: true`. — Still correct as of 2026 / already common model knowledge: **partially** (the specific flag list is exactly the "not implied by strict" gap most agents don't enumerate unprompted) / checkable by: `tsc`.
- `node22.json`: `module: "nodenext"`, `moduleResolution: "node16"` (not `"nodenext"` — a real inconsistency in the base itself, worth flagging), `target: "es2022"`, `types: ["node"]`, `lib: ["es2024", "ESNext.Array", "ESNext.Collection", "ESNext.Iterator"]`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`. — checkable by: `tsc`.
- `recommended.json`: `target: "es2016"`, `module: "commonjs"`, `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`, `strict: true`, `skipLibCheck: true`. — Notably **CommonJS-default and ES2016-target**, i.e. the oldest/most conservative of the three bases fetched; not a fit for this fleet's `NodeNext`-floor library. — checkable by: `tsc`.

Disagreement worth naming explicitly: `node22` targets `es2022`/`nodenext`; `recommended` targets `es2016`/`commonjs`. These are not reconcilable into one base — confirms the fleet's own four-way module-resolution split is an industry-wide unsolved problem, not a fleet hygiene failure.

### C. [`@total-typescript/tsconfig`](https://github.com/total-typescript/tsconfig)

Matt Pocock's opinionated preset set, split along two axes: `tsc`-only vs. bundler-consumed, and DOM vs. no-DOM. Fetched `tsc/no-dom/app.json` in full:

```json
{
  "esModuleInterop": true, "skipLibCheck": true, "target": "es2022",
  "allowJs": true, "resolveJsonModule": true, "moduleDetection": "force",
  "isolatedModules": true, "verbatimModuleSyntax": true,
  "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
  "module": "NodeNext", "sourceMap": true, "lib": ["es2022"]
}
```

- The pairing of `isolatedModules` + `verbatimModuleSyntax` is the author's explicit "make every file independently transpilable and unambiguous about type-only imports" stance — directly reusable rationale for adopting both flags fleet-wide. — Still correct as of 2026 / checkable by: `tsc`.
- The package's stated rationale ("no single recommended config works for everyone," split by tsc-vs-bundler and dom-vs-no-dom) is itself a codified argument for *this fleet's* per-shape tsconfig strategy rather than one shared base — cite this when justifying five separate profiles instead of one.

### D. [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

The most exhaustively "must"/"must not" style guide surveyed. Full normative extraction is embedded in the earlier fetch; highest-value items for this fleet, each marked for currency and enforceability:

- **Named exports only, no default exports** — still correct as general library/CLI advice as of 2026; **already common model knowledge**; checkable by `@typescript-eslint/no-default-export` or `import/no-default-export`. **Conflicts with SPA convention** (React/Vue route components commonly use default export) — scope this rule to the library/CLI shapes only.
- **No TypeScript `namespace`, no `require()`-style imports** — still correct; checkable by `@typescript-eslint/no-namespace` / `no-var-requires` (redundant once ESM-only).
- **Use `interface`, not `type`, for object shapes; `type` reserved for unions/intersections/aliases** — still correct and widely followed; checkable by `@typescript-eslint/consistent-type-definitions`.
- **Prefer `unknown` over `any`/`{}` for opaque values; narrow with a type guard before use** — still correct, arguably *more* relevant in 2026 given typed-linting adoption; checkable by `@typescript-eslint/no-explicit-any` plus manual review for `{}`.
- **Never use `@ts-ignore`/`@ts-nocheck`; `@ts-expect-error` only in tests, and only with a comment** — still correct; checkable by `@typescript-eslint/ban-ts-comment`.
- **`readonly` on properties never reassigned after construction** — still correct; checkable by `@typescript-eslint/prefer-readonly` (class-property variant) and `functional/prefer-readonly-type` if adopted.
- **Type/non-null assertions (`as`, `!`) are unsafe; prefer a runtime check; annotate rather than assert where possible** — still correct, and now reinforced by typed-linting's `no-unnecessary-type-assertion` and `no-non-null-assertion` — checkable by tool.
- **Always use triple-equals**, **always brace control-flow bodies**, **`switch` must have a `default`, no fallthrough** — dated in the sense that these are extremely well-established (pre-2020) conventions, not novel to Google's guide; already default in most shared ESLint configs (`eslint:recommended`, Biome's default rule set) — low incremental value to restate, high value to just confirm Biome enforces them (relevant for the monorepo shape).
- **Wrapper types (`String`, `Boolean`, `Number` as types or constructors) forbidden** — still correct; checkable by `@typescript-eslint/no-wrapper-object-types` / `unicorn/new-for-builtins`.

### E. [TypeScript Deep Dive style guide](https://basarat.gitbook.io/typescript/styleguide) (basarat)

Older (pre-2020 origin, still maintained) community guide. Notably **disagrees with Google on file naming** (camelCase files vs. Google's more nuanced rules) and **on null vs. undefined**: Deep Dive explicitly recommends `undefined` by default but says `null` is "conventional in Node.js" callback APIs — directly relevant to a fleet with a commander CLI likely to touch Node callback-style APIs. Also recommends `Foo[]` over `Array<Foo>` for simple element types, which **matches** Google's array-type guidance. — Still correct as of 2026 for the naming/null-vs-undefined split; **already common model knowledge** for the quotes/semicolons/indentation items (these are now handled by formatters, not manual style rules — flag as superseded by Prettier/Biome/dprint in this fleet, not something a rule file should restate). Checkable by: formatter config, not a lint rule, for the formatting items.

### F. [Microsoft TypeScript compiler-team coding guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)

**Caveat up front: this is the TypeScript compiler team's *internal* style guide for the `microsoft/TypeScript` codebase itself**, not general public API guidance, and several items are specific to the compiler's own architecture (diagnostic message numbering ranges 1000–7000, one-file-per-component for parser/scanner/emitter/checker). Extract only the items with general applicability:

- **"Use `undefined`. Do not use `null`."** — directly contradicts TypeScript Deep Dive's Node-callback exception and Google's context-dependent stance; this is the compiler team's own house rule, not industry consensus. **Do not port as-is** — the fleet has a Node CLI that will hit Node-style callback/`null`-returning APis.
- Function closures over classes in the core pipeline, immutable Nodes/Symbols/arrays by convention (not enforced by the type system) — architecture-specific to a compiler; not transferable.
- PascalCase types, camelCase functions/properties, no `I`-prefix on interfaces, no `_`-prefix on private properties — all **already common model knowledge** and consistent with Google's guide; low incremental value, safe to state briefly as confirmation rather than a new rule.

Overall verdict: **historical/context color, not a source of new adoptable rules** for this fleet — it predates several major TS releases and targets a codebase with a fundamentally different shape (a compiler, not an app/library fleet).

### G. [Node.js official security best practices](https://nodejs.org/en/learn/getting-started/security-best-practices)

Current official guidance (nodejs.org, continuously updated). Full checklist fetched; highest-relevance items for this fleet:

- **Supply-chain**: `--ignore-scripts` (flag or global config `ignore-scripts=true`), pin dependency versions (not ranges), lockfiles for direct *and* transitive deps, `npm ci` over `npm install` in CI, `npm audit` in CI, dependency cooldown via `min-release-age` (npm ≥11.10.0) to avoid just-published/compromised packages. — Still correct as of 2026, actively current guidance; checkable by: `npm ci` exit code, `npm audit --audit-level`, a lockfile-diff CI gate.
- **Publishing exposure**: `npm publish --dry-run` before every publish, `files` allowlist in `package.json` over relying on `.npmignore` blocklist. — Directly relevant to the published-library shape; checkable by: `publint`'s `FILE_NOT_PUBLISHED`/`USE_FILES` rules (see section I).
- **Permission Model** (`--permission`, `--allow-fs-read`, etc.) — relevant to the CLI/library shapes if they process untrusted input; not yet default-on, opt-in per-process flag, not a static-analysis-checkable rule.
- **Prototype pollution**: `Object.freeze(MyObject.prototype)`, `Object.hasOwn` over `hasOwnProperty`/`in`, avoid insecure recursive merges. — checkable by `eslint-plugin-security`'s `detect-object-injection` (partial) and manual review; `Object.hasOwn` checkable by `unicorn/prefer-object-has-own`.
- **Monkey-patching**: `--frozen-intrinsics`, `Object.freeze(globalThis)` — relevant to the VS Code extension (shared Electron host process) and any Action running third-party code.

### H. [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

Overlaps significantly with (G) but adds application-layer items not in Node's own doc:

- Request-size limits, event-loop-blocking avoidance, whitelist-based input validation, context-aware output escaping. — Not novel to TS specifically; largely "already covered" by the prior programs' security-posture ground, **except** the Node/JS-specific mechanics (ReDoS via regex, `eval`, `child_process.exec` with unsanitized input) which are checkable by `eslint-plugin-security` (see section N) and are genuinely TS/JS-specific.
- **`eslint-plugin-security` is explicitly recommended** — direct pointer to a concrete, adoptable lint plugin rather than prose rules.
- Cookie/header hardening (helmet, CSP, HSTS) — **not applicable** to any of the fleet's five shapes (no HTTP server shape in scope); explicitly out of scope, note and drop.

Still correct as of 2026 (OWASP cheat sheet series is actively maintained); checkable by: `eslint-plugin-security` for the code-pattern items, manual/architecture review for the header items (n/a here).

### I. [`publint` rule list](https://publint.dev/rules)

Fully automated packaging linter — 27 error-level rules, 14 warnings, 7 suggestions, all listed verbatim in the fetch above. Directly relevant to the published-library shape. Key rule families:

- Exports/imports ordering (`EXPORTS_DEFAULT_SHOULD_BE_LAST`, `EXPORTS_TYPES_SHOULD_BE_FIRST`, `EXPORTS_MODULE_SHOULD_PRECEDE_REQUIRE`) — directly enforces the same ordering rules as Node's own docs (section L) plus the community's "types first" convention.
- File-existence/publish-set correctness (`FILE_DOES_NOT_EXIST`, `FILE_NOT_PUBLISHED`, `USE_FILES`) — automates the "verify what you publish" guidance from Node's security page (section G).
- `USE_TYPE` (declare `"type"` in package.json to avoid module-syntax-detection startup overhead) — a real, checkable perf rule specific to how Node parses ambiguous `.js` files.

Verdict: **a rule file should say "run `publint` in CI on the library package," not restate its 48 rules as prose** — it's a purpose-built, actively maintained tool for exactly this problem. Still correct as of 2026; checkable by: the tool itself.

### J. [`@arethetypeswrong/cli` problem list](https://github.com/arethetypeswrong/arethetypeswrong.github.io)

12 distinct problems (full list: `CJSOnlyExportsDefault`, `CJSResolvesToESM`, `FallbackCondition`, `FalseCJS`, `FalseESM`, `FalseExportDefault`, `InternalResolutionError`, `MissingExportEquals`, `NamedExports`, `NoResolution`, `UnexpectedModuleSyntax`, `UntypedResolution`). Fetched `FalseCJS` in full: triggers when a single `.d.ts` claims to represent both a package's CJS and ESM entry points, causing TypeScript to synthesize a default export that doesn't exist at runtime (or vice versa) — "a golden rule of declaration files is that if they represent a module, they must represent *exactly* one JavaScript file." Fix: ship `.d.mts`/`.d.cts` split declaration files matched to `.mjs`/`.cjs` runtime files.

Directly relevant to the published-library shape *if or when* it ever adds a CJS entry point alongside its ESM ("published ESM library") — currently ESM-only per the brief, so this is a **preventive** rule (don't accidentally introduce a dual-format declaration mismatch), not a current violation. Still correct as of 2026; checkable by: the tool itself (`attw --pack`).

### K. npm/GitHub codified supply-chain practice

- **Provenance** ([npm docs](https://docs.npmjs.com/generating-provenance-statements)): requires npm ≥9.5.0, a cloud-hosted CI/CD provider (GitHub Actions or GitLab CI — **explicitly excludes self-hosted runners**), `id-token: write` permission, `--provenance` flag (or `publishConfig.provenance: true` / `NPM_CONFIG_PROVENANCE=true`). Backed by Sigstore (ephemeral certs, public transparency log). Consumers verify with `npm audit signatures`. Still correct/current as of 2026; checkable by: CI config review + `npm audit signatures` in the consuming pipeline.
- **`packageManager` + Corepack** ([nodejs/corepack](https://github.com/nodejs/corepack)): pins the package-manager version (yarn/npm/pnpm) in `package.json`, optionally with a hash for tamper-resistance. **Bundled with Node.js 14.19.0 through <25.0.0 only** — Corepack is explicitly being unbundled from Node 25 onward, so a fleet relying on it needs a migration plan (standalone install) before that floor is crossed. Directly relevant given the fleet's Node ≥20/≥22 floor is approaching that boundary. Checkable by: presence of `packageManager` field + `corepack enable` in CI setup.
- **Dependabot** ([GitHub docs](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)): `groups` (bundle related updates into fewer PRs), `ignore`, `versioning-strategy`, `cooldown` (delay before considering a newly published version — same intent as npm's `min-release-age`). Full option list fetched above.
- **Renovate** ([docs.renovatebot.com](https://docs.renovatebot.com/presets-config/)): `config:recommended` is the baseline; `config:best-practices` layers on Docker/GitHub-Actions digest pinning, dev-dependency pinning, and weekly lockfile maintenance — recommend the latter for any repo that publishes artifacts (the library, the Action). `config:js-lib` vs `config:js-app` split (pin everything except peer deps for apps; pin only dev deps and preserve semver ranges for libraries) maps directly onto this fleet's library-vs-SPA distinction.

Still correct/current as of 2026 for all four; checkable by: CI config presence + the tools' own dashboards.

### L. `package.json` exports/imports specification (Node.js)

Normative rules extracted from [nodejs.org/api/packages.html](https://nodejs.org/api/packages.html):

- Condition order is significance order (first match wins); `"default"` must be last.
- `"import"`/`"require"` are mutually exclusive per resolution.
- `"node-addons"` should precede `"node"` when both are used.
- Export targets must start with `./`; no path traversal (`..`, `node_modules` segments forbidden).
- `"imports"` field keys must start with `#` (private, package-internal subpath imports — distinct from `"exports"`).
- Once `"exports"` is defined, it fully encapsulates the package — unlisted subpaths throw `ERR_PACKAGE_PATH_NOT_EXPORTED`, including previously-reachable internal files.
- Subpath patterns (`"./features/*"`) do raw string replacement — matching extensions on both sides is the caller's responsibility, not enforced by Node.

The **"types condition first"** convention is *not* a Node.js requirement (Node doesn't know about a `types` condition) — it's purely a TypeScript-consumer convention that `publint`/`arethetypeswrong` and the community have converged on; state it as such rather than attributing it to Node's spec. Still correct/current as of 2026; checkable by: `publint`'s `EXPORTS_TYPES_SHOULD_BE_FIRST`.

### M. typescript-eslint typed-linting rule set

[typescript-eslint.io/getting-started/typed-linting](https://typescript-eslint.io/getting-started/typed-linting): typed linting requires `parserOptions.projectService: true` (modern) or `parserOptions.project` (legacy), and incurs a real performance cost because ESLint must build the TS program first. ~56 rules require type info (full list fetched above), including the fleet-critical ones:

- `no-floating-promises` / `no-misused-promises` / `await-thenable` — catch unhandled/mishandled async work; **cannot fire without type info**, meaning any repo without typed linting has zero coverage on this bug class regardless of how careful the code looks.
- `no-unsafe-assignment` / `no-unsafe-call` / `no-unsafe-member-access` / `no-unsafe-return` / `no-unsafe-argument` — the full `any`-leakage detection family; this is what actually enforces "don't let `any` escape a boundary," which `noImplicitAny` alone does not catch once `any` is explicit or inferred from an untyped third-party import.
- `no-unnecessary-condition` / `switch-exhaustiveness-check` — dead-branch and non-exhaustive-switch detection, directly relevant to the fleet's cross-shape need for exhaustive handling (union discrimination, error taxonomies — noted as "already covered" ground, but the *enforcement mechanism* for it is this specific rule, worth citing).

Verdict: given the brief's stated "unverified whether type-aware linting is enabled anywhere" fact, this is the **highest-priority single check** to add to the rule set — a fleet-wide requirement to set `projectService: true` plus `strict-type-checked`, with `no-floating-promises` and the `no-unsafe-*` family called out by name as non-negotiable. Still correct/current as of 2026 (actively maintained, this is the canonical linter for the ecosystem); checkable by: the tool itself, and its own config presence is checkable by grep for `projectService`/`project` in `eslint.config.*`.

### N. `eslint-plugin-security`

15 rules (full list fetched above from [github.com/eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)), covering `detect-child-process`, `detect-non-literal-fs-filename`, `detect-non-literal-regexp`, `detect-unsafe-regex` (ReDoS), `detect-eval-with-expression`, `detect-pseudoRandomBytes`, `detect-possible-timing-attacks`, `detect-bidi-characters` (Trojan Source attack). This is the concrete tool both Node's own security page and OWASP's cheat sheet point to — recommend by name rather than re-deriving equivalent prose rules. Still correct/current as of 2026 (actively maintained fork under eslint-community); checkable by: the plugin itself.

### O. Bun's TypeScript handling

[bun.com/docs/runtime/typescript](https://bun.com/docs/runtime/typescript): Bun **type-strips, does not type-check** — `tsc --noEmit` (or an editor) remains the actual type-checking step; Bun only removes TS syntax for execution. Bun's own recommended tsconfig: `moduleResolution: "bundler"`, `verbatimModuleSyntax: true`, `noEmit: true`, `types: ["bun"]`, `allowImportingTsExtensions: true`, `moduleDetection: "force"`, plus `strict`, `skipLibCheck`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride` as its "best practices" tier. Directly gives a ready-made, authoritative tsconfig baseline for the fleet's Bun-based GitHub Action shape. Still correct/current as of 2026 (official Bun docs); checkable by: `tsc --noEmit` as a required separate CI step (since `bun run` alone will silently execute code with type errors).

## Candidate topics

| Topic | Why it matters | Source | Already-covered? | Priority | Enforceable by |
|---|---|---|---|---|---|
| `noUncheckedIndexedAccess` fleet-wide adoption | Closes the measured 4-vs-1 split; single highest-leverage flag not implied by `strict` | [tsconfig](https://www.typescriptlang.org/tsconfig/), [strictest base](https://github.com/tsconfig/bases) | no | high | tool (tsc) |
| `verbatimModuleSyntax` + `isolatedModules` pairing | Resolves module-resolution split at the syntax level; prerequisite for Bun/esbuild shapes, should extend to all five | Total TS, Bun docs | no | high | tool (tsc) |
| Type-aware linting rollout (`projectService`, `strict-type-checked`) | Unverified fleet fact; unlocks `no-floating-promises`/`no-unsafe-*`, the actual `any`-leakage and unhandled-promise gate | typescript-eslint.io | no | high | lint |
| `erasableSyntaxOnly` for the Bun Action only | Guarantees the Action's TS is runtime-strippable; narrow, shape-specific | TS 5.8 release notes | no | med | tool (tsc) |
| `isolatedDeclarations` for the library + monorepo | Enables parallel/per-file `.d.ts` emit; real migration cost, real payoff for build speed | TS 5.5 release notes | no | med | tool (tsc) |
| `exactOptionalPropertyTypes` on public API surfaces | Distinguishes "absent" from "explicitly undefined" on exported types — a real API-design gap for the library/CLI | tsconfig, strictest base | partial (API design covered generically, this is the TS-specific mechanism) | med | tool (tsc) |
| `noPropertyAccessFromIndexSignature` | Forces explicit acknowledgment of dynamic property access; catches typo-prone dynamic access | tsconfig | no | low-med | tool (tsc) |
| `exports` map condition ordering (`types` first, `default` last) | Directly checkable, directly breaks consumers if wrong, applies to the published library | Node docs, publint | no | high | lint (publint) |
| Dual CJS/ESM declaration-file correctness (`FalseCJS`/`FalseESM`) | Preventive: the library is ESM-only today but this is the failure mode if that ever changes | arethetypeswrong | no | med | tool (attw) |
| `publint` in CI for the published library | Automates ~48 packaging checks that would otherwise be manual review | publint.dev | no | high | tool |
| npm provenance + CI topology constraint | Hard requirement (cloud CI only) that could silently fail on a misconfigured runner | npm docs | no | med | CI config review |
| `packageManager`/Corepack forward-compat cliff (unbundled from Node 25) | Time-bound risk given the fleet's Node ≥20/≥22 floor is approaching that line | nodejs/corepack | no | med | grep for `packageManager` field + Node version pin |
| `--ignore-scripts` + `npm ci` + pinned lockfile | Concrete, checkable supply-chain floor both Node's own page and OWASP converge on | Node.js security page, OWASP | partial (dependency policy covered generically; these are the specific commands/flags) | high | CI script / lockfile diff |
| Dependency cooldown (`min-release-age` / Dependabot `cooldown` / Renovate default) | Defends against just-published supply-chain compromise (a real, recent attack pattern) | npm docs, Dependabot docs, Renovate docs | no | med | config presence |
| `eslint-plugin-security` adoption | Concrete tool both official sources point to for JS/Node-specific vuln patterns (ReDoS, eval, timing attacks) | Node security page, OWASP | no | med | lint |
| Prototype pollution defenses (`Object.hasOwn`, frozen prototypes) | JS-specific vuln class with concrete, checkable mitigations | Node security page | no | med | lint (`unicorn/prefer-object-has-own`) partial |
| Node 20 EOL exposure | The fleet's stated Node ≥20 floor includes an already-EOL runtime as of March 2026 | nodejs.org release schedule | no | high | CI matrix / `engines` field review |
| `engines` field declaration | publint's `USE_ENGINES_NODE` suggestion; declares the actual supported floor, catchable by tooling | publint | no | med | lint (publint) |
| `types` in `package.json` vs. `exports["."].types` | Legacy top-level `types` field vs. modern conditional-exports `types` condition; affects `moduleResolution: bundler` consumers differently than `nodenext` | Node docs, arethetypeswrong | no | med | tool (attw) |
| `sideEffects: false` declaration for tree-shaking | publint's `USE_SIDE_EFFECTS`; matters specifically for the SPA-consumed library/CLI shared code | publint | no | low-med | lint (publint) |
| Encoding: source files must be UTF-8, ASCII-only whitespace | Boring-but-biting; Google's guide is explicit, easy to silently violate via editor/OS defaults | Google style guide | no | low | lint (`no-irregular-whitespace`) |
| Path handling: relative vs. absolute imports, cross-platform casing | `forceConsistentCasingInFileNames`; relevant given VS Code extension dev spans Windows/macOS/Linux | tsconfig, `@tsconfig/bases` | no | med | tool (tsc) |
| Time: no TS-specific codified guidance found — flag as a gap | Searched; no dedicated codified source surfaced beyond generic API-design (already covered) | — | yes (generic) | low | n/a |
| Ordering determinism: `switch-exhaustiveness-check`, `sort-type-constituents` | Union/enum exhaustiveness enforcement is the TS-specific mechanism for a generically-covered concern | typescript-eslint | partial | med | lint |
| Resource cleanup: no TS-specific codified source found beyond generic `using`/explicit-resource-management | TC39 stage-4 `using` declarations exist in TS 5.2+; worth a dedicated research pass, not covered here | — | no | low (flagged, not researched) | n/a |
| Cancellation: no TS-specific codified source found | Same as above — AbortController is runtime, not TS-specific; out of this corpus's scope | — | no | low (flagged) | n/a |
| On-disk format versioning: no TS-specific codified source found | Generic concern; no style guide in this corpus addresses it | — | yes (generic) | low | n/a |
| Declaration emit correctness (`declaration`, `declarationMap`, `isolatedDeclarations`) | Directly gates the published library's consumer experience (go-to-definition, type-checking downstream) | tsconfig, TS 5.5 notes | no | high | tool (tsc) |
| `import type`/`export type` consistency | Enforced by `verbatimModuleSyntax`; also independently lintable via `consistent-type-imports` | typescript-eslint, Google style guide | no | high | lint |
| Namespace/`require()` prohibition | Both Google and general ESM-era practice ban these; near-zero cost to enforce given the fleet is already ESM/NodeNext | Google style guide | no | med | lint |
| `readonly` on non-reassigned class properties/array types | Google's guide; catches accidental mutation, cheap to lint | Google style guide | no | med | lint |
| `any`-leakage across module boundaries | The actual enforcement mechanism (typed-linting `no-unsafe-*` family) for a generically-covered "type safety" concern | typescript-eslint | partial | high | lint |
| Bun's type-stripping vs. type-checking split | Bun executes untyped code silently; CI must run `tsc --noEmit` as a separate step or type errors ship | Bun docs | no | high | CI step presence |
| VS Code extension / Electron host TS constraints | Not covered by this corpus — no codified source specific to esbuild-bundled VS Code extensions surfaced; flag as a gap for a follow-up pass | — | no | med (flagged, not researched) | n/a |
| `sideEffects`/`exports` interplay with Vite's dev-vs-build resolution (`moduleResolution: "bundler"`) | Vite-consumed SPA shapes resolve differently than `nodenext`-targeting shapes; a real fourth axis in the fleet's split | Bun docs (parallel case), Node docs | no | med | tool (tsc) |
| `noUncheckedSideEffectImports` default-on verification | Brief calls out defaults as unverified elsewhere; this flag's default status should be confirmed against the fleet's exact TS patch version | tsconfig | no | low (verification task, not a rule) | tool |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typescriptlang.org/tsconfig](https://www.typescriptlang.org/tsconfig/) | Official TS compiler-option reference | Continuously updated, current 2026 | The canonical, exhaustive flag catalogue — primary source for the whole compiler-flag table |
| [github.com/tsconfig/bases](https://github.com/tsconfig/bases) | Community shared tsconfig bases repo | Actively maintained, 2026 | Shows what real orgs actually turn on beyond `strict`, per-runtime |
| [raw…/tsconfig/bases/main/bases/strictest.json](https://raw.githubusercontent.com/tsconfig/bases/main/bases/strictest.json) | Raw JSON, `@tsconfig/strictest` | current | Primary evidence for the "flags not implied by strict" convergence claim |
| [raw…/tsconfig/bases/main/bases/node22.json](https://raw.githubusercontent.com/tsconfig/bases/main/bases/node22.json) | Raw JSON, `@tsconfig/node22` | current | Shows the NodeNext/node16 moduleResolution split in a single official base |
| [raw…/tsconfig/bases/main/bases/recommended.json](https://raw.githubusercontent.com/tsconfig/bases/main/bases/recommended.json) | Raw JSON, `@tsconfig/recommended` | current | The conservative/CommonJS baseline, contrasts with node22 |
| [github.com/total-typescript/tsconfig](https://github.com/total-typescript/tsconfig) | Matt Pocock's opinionated tsconfig presets | current, popular in 2025-2026 community discourse | Explicit tsc-vs-bundler / dom-vs-no-dom split rationale, directly informs per-shape strategy |
| [total-typescript/tsconfig … tsc/no-dom/app.json](https://github.com/total-typescript/tsconfig/blob/main/tsc/no-dom/app.json) | Raw preset JSON | current | Concrete evidence for `isolatedModules` + `verbatimModuleSyntax` pairing |
| [google.github.io/styleguide/tsguide.html](https://google.github.io/styleguide/tsguide.html) | Google TypeScript Style Guide | continuously updated, but core content predates several TS releases (noted per-item above) | Largest, most opinionated "must"/"must not" corpus surveyed |
| [basarat.gitbook.io/typescript/styleguide](https://basarat.gitbook.io/typescript/styleguide) | TypeScript Deep Dive style guide | long-running community guide, origin pre-2020 | Disagrees with Google on null-vs-undefined in Node-callback contexts — useful contrast |
| [github.com/microsoft/TypeScript/wiki/Coding-guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines) | TS compiler team's internal style guide | dated, compiler-codebase-specific | Useful as a documented counter-example (its null/undefined stance conflicts with the rest of the corpus) |
| [nodejs.org/en/learn/getting-started/security-best-practices](https://nodejs.org/en/learn/getting-started/security-best-practices) | Official Node.js security guidance | continuously updated, current 2026 (references npm ≥11.10.0 `min-release-age`) | Primary source for supply-chain and runtime security items |
| [cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) | OWASP Node.js Security Cheat Sheet | actively maintained | Adds application-layer items and explicitly names `eslint-plugin-security` |
| [publint.dev/rules](https://publint.dev/rules) | publint's full rule list | current, actively maintained tool | Automates nearly all packaging-correctness checks; primary source for section I |
| [github.com/arethetypeswrong/arethetypeswrong.github.io/…/FalseCJS.md](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/FalseCJS.md) | are-the-types-wrong problem doc | current, actively maintained tool | Exact mechanics of the dual-format declaration-file failure mode |
| [github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/docs/problems](https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/docs/problems) | Directory listing of all 12 problem docs | current | Confirms full scope of what the tool checks |
| [docs.npmjs.com/generating-provenance-statements](https://docs.npmjs.com/generating-provenance-statements) | Official npm provenance docs | current 2026 | Primary source for the CI-topology hard constraint (no self-hosted runners) |
| [nodejs.org/api/packages.html](https://nodejs.org/api/packages.html) | Official Node.js packages/exports docs | current, versioned with Node releases | Primary spec source for `exports`/`imports` normative rules |
| [github.com/nodejs/corepack](https://github.com/nodejs/corepack) | Corepack README | current, notes unbundling from Node 25 | Primary source for the packageManager forward-compat cliff |
| [docs.renovatebot.com/presets-config/](https://docs.renovatebot.com/presets-config/) | Official Renovate preset docs | current 2026 | Primary source for `config:best-practices` vs `config:recommended` |
| [docs.github.com/…/configuration-options-for-the-dependabot.yml-file](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file) | Official GitHub Dependabot config docs | current 2026 | Primary source for `groups`/`cooldown` options |
| [typescript-eslint.io/getting-started/typed-linting](https://typescript-eslint.io/getting-started/typed-linting) | Official typescript-eslint typed-linting guide | current, actively maintained | Primary source for the type-aware linting setup and rule split |
| [typescript-eslint.io/rules](https://typescript-eslint.io/rules/) | Official typescript-eslint rules index | current | Source for the ~56-rule typed-only enumeration |
| [bun.com/docs/runtime/typescript](https://bun.com/docs/runtime/typescript) | Official Bun TypeScript docs | current 2026 | Primary source for the Bun-specific tsconfig baseline and type-stripping-vs-checking distinction |
| [github.com/eslint-community/eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) | eslint-plugin-security README | current, actively maintained fork | Full rule list for JS/Node-specific vulnerability lint patterns |
| [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) | Official Node.js release schedule | current 2026 | Source for the Node 20 EOL finding directly relevant to the fleet's stated floor |
| TypeScript 5.8 release notes (via search, [devblogs.microsoft.com/typescript/announcing-typescript-5-8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)) | Official TS release announcement | 2026 | Source for `erasableSyntaxOnly` rationale and Node `--experimental-strip-types` connection |
| TypeScript 5.5 release notes (via search, [typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)) | Official TS release notes | 2024, still current guidance | Source for `isolatedDeclarations` mechanics and parallel-build rationale |

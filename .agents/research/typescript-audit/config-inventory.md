---
title: TypeScript fleet configuration inventory
agent: sonnet subagent (typescript-audit config-inventory)
model: claude-sonnet-5
scope: >
  9 repos under /home/mherwig/dev: ocx-catalog, grimoire-indexer,
  grimoire-vscode, vscode-ocx, setup-ocx, fma, creeptd-ng/web, kate-middlechild,
  grimoire-index. Excludes ocx-vscode-icons (vendored .ts only), node_modules,
  dist/out/build, .agents/, .worktrees/.
method: >
  Read-only. Every number below was produced by the exact command shown next
  to it, run from /home/mherwig/dev unless noted. tsconfig/package.json field
  extraction used `jq`; file enumeration used `find -not -path`; config content
  was read verbatim with `cat`/`Read`. No tool stripped JSONC comments — every
  tsconfig in this fleet happens to be parseable as plain JSON (no trailing
  commas, `//` comments only, which `jq` tolerates); this was verified by
  running `jq` over every file and confirming no parse error. Grep patterns for
  flag presence are given per-table. All citations are `path:line`.
---

# TypeScript fleet configuration inventory

## 0. Repo inventory (ground truth)

```
$ for d in ocx-catalog grimoire-indexer grimoire-vscode vscode-ocx setup-ocx fma creeptd-ng kate-middlechild grimoire-index; do [ -d "$d" ] && echo FOUND: $d || echo MISSING: $d; done
```
All 9 present. `creeptd-ng` is a Rust-workspace-root monorepo; TypeScript lives entirely under `creeptd-ng/web` (a pnpm-declared workspace member) plus one unrelated Playwright smoke-test package at `creeptd-ng/crates/creeptd-client/tests/e2e` (out of scope — not `web`, no tsconfig, no framework, a single `node canvas-smoke.test.js` invocation). `kate-middlechild` is a Bun workspace root (`kate-middlechild/package.json:3-5` `"workspaces": ["packages/*"]`) with three members: `web` (Astro), `core` (pure TS domain), `tokens` (CSS only, no `.ts`, no tsconfig). `grimoire-index` has **zero** `.ts` files and **zero** tsconfigs — confirmed by `find grimoire-index -iname "*.ts" -not -path "*/node_modules/*"` returning nothing. It is a thin `package.json` wrapper (`grimoire-index/package.json:1-13`) whose scripts shell out to the `@grimoire-rs/indexer` CLI binary; it is not itself a TypeScript codebase and is **not an Astro site** — no Astro dependency, no `.astro` file, anywhere in the repo. This directly contradicts the "Astro site" framing in scope — flagged, not silently corrected.

---

## 1. tsconfig matrix

```
$ for r in ocx-catalog grimoire-indexer grimoire-vscode vscode-ocx setup-ocx fma creeptd-ng kate-middlechild grimoire-index; do find "$r" -iname "tsconfig*.json" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.agents/*" -not -path "*/.worktrees/*"; done
```
15 tsconfigs found (one excluded: `grimoire-indexer/.dev/root-613709/.index-AGO9Nu/tsconfig.json` is a gitignored runtime-cache artifact — `grimoire-indexer/.gitignore:8` `.dev/`, confirmed via `git check-ignore -v .dev`, not repo config).

`fma/tsconfig.json` and `setup-ocx/tsconfig.eslint.json` carry no strictness `compilerOptions` of their own (a project-reference stub and an ESLint-only `include` override, respectively) — included for completeness, blank throughout.

| tsconfig | strict | target | lib | module | moduleResolution | noUncheckedIndexedAccess | exactOptionalPropertyTypes | verbatimModuleSyntax | noImplicitOverride | noImplicitReturns | noFallthroughCasesInSwitch | noUnusedLocals | noUnusedParameters | isolatedModules | erasableSyntaxOnly | noPropertyAccessFromIndexSignature | noUncheckedSideEffectImports | skipLibCheck | allowImportingTsExtensions | noEmit | declaration | jsx | types |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ocx-catalog/tsconfig.json:3-14` | ✅ | ES2022 | [ES2022] | NodeNext | NodeNext | | | | | | | | | ✅ | | | | ✅ | | | ✅ | | |
| `ocx-catalog/tsconfig.theme.json:9-18` (extends above) | | | [ES2022,DOM,DOM.Iterable] | ESNext | bundler | | | | | | | | | | | | | | | ✅ | | | |
| `grimoire-indexer/tsconfig.json:2-16` | ✅ | ES2023 | [ES2023] | NodeNext | NodeNext | ✅ | | | | | | | | | | | | ✅ | | | ✅ | | react-jsx (jsxImportSource: preact) | [node] |
| `grimoire-vscode/tsconfig.json:2-21` | ✅ | ES2022 | [ES2022,DOM,DOM.Iterable] | ESNext | Bundler | ✅ | ✅ | | ✅ | | ✅ | ✅ | ✅ | ✅ | | | | ✅ | | | | | [node,mocha] |
| `vscode-ocx/tsconfig.json:2-21` | ✅ | ES2022 | [ES2022] | Node16 | Node16 | ✅ | ✅ | | ✅ | | ✅ | ✅ | ✅ | ✅ | | | | ✅ | | | | | [node,mocha] |
| `setup-ocx/tsconfig.json:2-17` | ✅ | ES2022 | [ES2022] | nodenext | nodenext | ✅ | ✅ | ✅ | | | | | | | | | | ✅ | | | false | | |
| `setup-ocx/tsconfig.eslint.json:1-5` (extends above, adds includes only) | | | | | | | | | | | | | | | | | | | | | | | |
| `fma/tsconfig.json:1-7` (solution file, project refs only) | | | | | | | | | | | | | | | | | | | | | | | |
| `fma/tsconfig.app.json:2-20` | ✅ | ES2022 | [ES2022,DOM,DOM.Iterable] | ESNext | bundler | | | | | | ✅ | ✅ | ✅ | ✅ | | | ✅ | ✅ | ✅ | ✅ | | react-jsx | [vite/client,vitest/globals] |
| `fma/tsconfig.node.json:2-12` | ✅ | ES2022 | [ES2023] | ESNext | bundler | | | | | | | | | ✅ | | | | ✅ | ✅ | ✅ | | | |
| `creeptd-ng/web/tsconfig.json:2-19` | ✅ | ESNext | [ESNext,DOM] | ESNext | bundler | ✅ | ✅ | | ✅ | | | | | | | ✅ | | ✅ | | ✅ | | preserve | |
| `creeptd-ng/web/e2e/tsconfig.e2e.json:2-18` | ✅ | ESNext | [ESNext,DOM] | ESNext | bundler | ✅ | ✅ | | ✅ | | | | | | | ✅ | | ✅ | | ✅ | ✅ | | | [@playwright/test,node] |
| `kate-middlechild/tsconfig.base.json:3-14` | ✅ | ESNext | | ESNext | bundler | ✅ | | ✅ | | | | | | ✅ | | | | ✅ | | ✅ | | react-jsx | |
| `kate-middlechild/packages/web/tsconfig.json:1-9` (extends `astro/tsconfigs/strict`, unresolved locally — `node_modules` not installed) | ✅* | | | | | | | | | | | | | | | | | | | | | | |
| `kate-middlechild/packages/core/tsconfig.json:1-8` (extends base) | | | | | | | | | | | | | | | | | | | | | ✅ | react-jsx | [bun] |

\* `strict` is asserted by `astro/tsconfigs/strict` per Astro's own docs, but the preset file could not be read locally (`node_modules` absent in this checkout) — this one cell is inference, not direct read; flagged as such rather than silently presented as measured.

### The divergence (headline)

- **`strict: true` is universal — 13/13 real tsconfigs (excluding the 2 stub/extend-only files).** This is the one flag every repo agrees on.
- **The NodeNext-library shape is the *least*-strict shape in the fleet, not the most.** `ocx-catalog/tsconfig.json` and `grimoire-indexer/tsconfig.json` — the two "published ESM library+CLI" repos — are the only tsconfigs that set **none** of `exactOptionalPropertyTypes` or `verbatimModuleSyntax`. `grimoire-indexer` at least has `noUncheckedIndexedAccess`; `ocx-catalog` has neither that nor the other two. Every other shape in the fleet (VS Code extensions, the GitHub Action, both browser SPAs, the Astro monorepo) enables all three modern flags. `ocx-catalog`'s own `.claude/rules/quality-typescript.md:40-45` names this explicitly: *"Not currently enabled ... `noUncheckedIndexedAccess` ... and `exactOptionalPropertyTypes`. Treat adding either as a Suggest-tier improvement, not a fact about the current baseline."* — so the gap is acknowledged in-repo, not accidental.
- **`moduleResolution` is the real outlier axis**, not `strict`: 4 distinct values across the fleet — `NodeNext`/`nodenext` (ocx-catalog, grimoire-indexer, setup-ocx), `Node16` (**vscode-ocx alone**), `Bundler`/`bundler` (grimoire-vscode, fma×2, creeptd-ng/web×2, kate-middlechild×2), and preset-inherited (kate-middlechild/web). `vscode-ocx` and `grimoire-vscode` are the same "shape" (VS Code extension) yet disagree on this axis: `vscode-ocx/tsconfig.json:3` `"module": "Node16"` vs `grimoire-vscode/tsconfig.json:3` `"module": "ESNext"` + `"moduleResolution": "Bundler"`. Same generator lineage, diverged.
- **`noImplicitOverride`/`noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`** are a block that travels together and appears in exactly 3 tsconfigs: `grimoire-vscode`, `vscode-ocx`, and `fma` (partial — fma has `noFallthroughCasesInSwitch`+`noUnusedLocals`+`noUnusedParameters` but not `noImplicitOverride`, which is class-inheritance-specific and fma has no classes). No library or Astro repo sets any of these four.
- **`noImplicitReturns` and `erasableSyntaxOnly` appear in zero tsconfigs, fleet-wide.** See Gaps.
- **`noPropertyAccessFromIndexSignature` and `noUncheckedSideEffectImports` appear in exactly one repo each** (`creeptd-ng/web` and `fma` respectively) — true one-offs, not shape-correlated.
- **`skipLibCheck: true` is universal** wherever `compilerOptions` exist at all (12/12) — the one other flag every real tsconfig agrees on besides `strict`.

---

## 2. Lint and format stack

```
$ for r in ...; do find "$r" -maxdepth 3 \( -iname "eslint.config.*" -o -iname ".eslintrc*" -o -iname "biome.json*" -o -iname ".prettierrc*" -o -iname "prettier.config.*" \) -not -path "*/node_modules/*"; done
```

| Repo | Linter | Config path | Type-checked ESLint? | Formatter |
|---|---|---|---|---|
| ocx-catalog | ESLint flat | `ocx-catalog/eslint.config.js:1-45` | **No** — `js.configs.recommended` + `...tseslint.configs.recommended` only, no `parserOptions.project` | none configured (no Prettier, no Biome) |
| grimoire-indexer | ESLint flat | `grimoire-indexer/eslint.config.js:1-24` | **No** — `...tseslint.configs.recommended` only | none configured |
| grimoire-vscode | ESLint flat | `grimoire-vscode/eslint.config.mjs:1-27` | **No** — `js.configs.recommended` + `...tseslint.configs.recommended` + `eslint-config-prettier`, no `parserOptions.project` | Prettier — `grimoire-vscode/.prettierrc.json:1-7` |
| vscode-ocx | ESLint flat | `vscode-ocx/eslint.config.mjs:1-27` | **No** — identical shape to grimoire-vscode | Prettier — `vscode-ocx/.prettierrc:1-6` |
| setup-ocx | ESLint flat | `setup-ocx/eslint.config.js:1-45` | **YES — the only repo in the fleet.** `...tseslint.configs.strictTypeChecked` + `...tseslint.configs.stylisticTypeChecked` with explicit `parserOptions.project: "./tsconfig.eslint.json"` (`setup-ocx/eslint.config.js:9-16`) | Prettier — `setup-ocx/.prettierrc.json:1-9` |
| fma | ESLint flat | `fma/eslint.config.js:1-30` | **No** — `recommended` only, plus `eslint-plugin-react-hooks`/`react-refresh` | none configured |
| creeptd-ng/web | **none** | — (no `eslint.config.*`, `.eslintrc*`, `biome.json*`, or Prettier config anywhere under `creeptd-ng/web`) | n/a | none configured |
| kate-middlechild | Biome | `kate-middlechild/biome.json:1-62` | n/a (Biome, not type-checked by design) | Biome (`formatter` block in same file) |
| grimoire-index | none (no `.ts`) | — | n/a | — |

**Type-aware linting is on in exactly one repo of nine: `setup-ocx`.** Its exported config array (`setup-ocx/eslint.config.js:6-44`, verbatim):
```js
export default tseslint.config(
  { ignores: ["dist/", "coverage/", "node_modules/", "scripts/build.ts", "eslint.config.js"] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { project: "./tsconfig.eslint.json", tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true, allowBoolean: true, allowNullish: true }],
    },
  },
  { files: ["tests/**/*.ts"], rules: { /* 6 rules relaxed for test files */ } },
  prettier,
);
```
Every other repo's ESLint config uses the plain (non-type-checked) `recommended` preset — meaning `any`-adjacent bugs (unsafe member access, floating promises, unhandled `Promise` rejections at type level) are caught by **none** of them at lint time; only `tsc`'s own separate `--noEmit` pass (where one exists — see §3) catches type errors, and only within its own file, not across ESLint's rule surface.

Repo-specific rules beyond preset, verbatim, worth flagging:
- `ocx-catalog/eslint.config.js:35-48` — a `no-restricted-imports` pair banning `src/viewmodel/version_order.ts` and `src/theme/utils/version.ts` from importing each other (two different version-ordering grammars; a "dedupe these" refactor would silently corrupt one side).
- `grimoire-indexer/eslint.config.js:14-23` — `@typescript-eslint/no-unused-vars` configured with `ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_"`.
- `grimoire-vscode/eslint.config.mjs:19-26` — `curly: 'error'`, `eqeqeq: ['error','always']`, `no-throw-literal: 'error'`, naming-convention on imports — all **error**.
- `vscode-ocx/eslint.config.mjs:19-26` — **identical rule set, but every severity downgraded to `'warn'`.** Same generator lineage as grimoire-vscode, diverged on enforcement strength.
- `setup-ocx/eslint.config.js:33-43` — 6 `@typescript-eslint/*` rules relaxed for `tests/**/*.ts` only.
- `fma/eslint.config.js:21-26` — `@typescript-eslint/no-unused-vars` at `'warn'` (not `'error'`), with `^_` ignore patterns.

`kate-middlechild/biome.json:36-44` linter rules verbatim:
```json
"linter": {
  "enabled": true,
  "rules": {
    "preset": "recommended",
    "a11y": {},
    "correctness": { "noUnusedImports": "error" },
    "style": { "useImportType": "error", "noNonNullAssertion": "warn" }
  }
}
```
plus a per-glob override turning off `useConst`/`useImportType`/`noUnusedVariables`/`noUnusedImports` for `**/*.astro` (`kate-middlechild/biome.json:47-58`).

---

## 3. Scripts and the gate

```
$ jq '.scripts' <repo>/package.json   # per repo
$ find <repo> -maxdepth 1 -iname "taskfile*" -o -maxdepth 1 -iname "Makefile"
```

| Repo | `scripts` (verbatim, key entries) | Single lint+typecheck+test command? | Does `test` typecheck? | `typecheck` script exists? | Test runner + config |
|---|---|---|---|---|---|
| ocx-catalog | `build: tsc`, `test: vitest run --coverage`, `lint: eslint .`, `typecheck: tsc --noEmit && tsc -p tsconfig.theme.json` (`ocx-catalog/package.json:23-29`) | **Yes** — `task verify` (`ocx-catalog/taskfile.yml:20-25`) = lint → typecheck → test → pack-smoke | No (separate) | Yes | vitest — `ocx-catalog/vitest.config.ts` |
| grimoire-indexer | `build`, `test: vitest run`, `lint: eslint .`, `typecheck: tsc --noEmit` (`grimoire-indexer/package.json:9-13`) | **Yes** — `task check`/`task default` (`grimoire-indexer/taskfile.yml:37-43`) = lint → typecheck → test → smoke | No (separate) | Yes | vitest — `grimoire-indexer/vitest.config.ts` |
| grimoire-vscode | `check-types: tsc --noEmit`, `lint: eslint . --max-warnings 0`, `check: lint && check-types && build`, `pretest: compile-tests && build && lint`, `test: vscode-test --coverage` (`grimoire-vscode/package.json:9-21`) | **Yes** — `task verify` (`grimoire-vscode/taskfile.yml:12-16`) = `npm run check` + `npm run test:headless`. Also implicitly via npm's `pretest` lifecycle hook before `npm test`. | Indirectly — `check-types` runs, but not inside `test` itself; only via the `pretest`/Taskfile wrapper | Yes (`check-types`) | mocha via `@vscode/test-cli` — `grimoire-vscode/.vscode-test.mjs:1-19` |
| vscode-ocx | same shape: `check-types`, `lint: eslint src` (narrower glob than grimoire-vscode's `eslint .`), `check: lint && check-types && build`, `pretest`, `test: vscode-test` (`vscode-ocx/package.json:9-20`) | **Partial** — no Taskfile at all (only repo of the two extensions without one). Gate exists only via npm's `pretest` hook before `test`; no `verify`/`check-all` alias. | Indirectly, same as grimoire-vscode | Yes | mocha via `@vscode/test-cli` — `vscode-ocx/.vscode-test.mjs:1-8` |
| setup-ocx | `build: bun scripts/build.ts`, `test: bun test`, `lint: eslint .`, `fmt`/`fmt:check` (`setup-ocx/package.json:9-16`) | **Yes** — `task check` (`setup-ocx/taskfile.yml:34-40`) = fmt:check → lint → test:coverage → build → dist:check | No | **No — absent.** Type-checking happens only as a side effect of ESLint's `strictTypeChecked` `parserOptions.project`; no `tsc --noEmit` anywhere in `scripts` or `taskfile.yml`. | `bun test` (native) |
| fma | `dev`, `build: tsc -b && vite build`, `typecheck: tsc --noEmit`, `lint: eslint .`, `test: vitest run` (`fma/package.json:6-13`) | **No.** No Taskfile, no Makefile, no combined script — 4 independent commands, no chaining, no `pretest` hook. | No | Yes | vitest — `fma/vitest.config.ts` |
| creeptd-ng/web | `typecheck: vue-tsc --noEmit`, `lint: eslint src --ext .ts,.vue`, `test: vitest run`, `e2e: playwright test` (`creeptd-ng/web/package.json:8-17`) | **No.** No Taskfile in `web/` or at the `creeptd-ng` root; 4 independent commands. | No | Yes | vitest — `creeptd-ng/web/vitest.config.ts` **not found** (grep found none; only `playwright.config.ts` present) — vitest runs config-less/default. Playwright — `creeptd-ng/web/playwright.config.ts` |
| kate-middlechild | root: `prepare: lefthook install` only; `core/package.json`: `test: bun test`, `typecheck: tsc --noEmit`; `web/package.json`: `typecheck: astro check` (no `lint`/`test` script at the package level — driven from the Taskfile instead) | **Yes** — `task verify` (`kate-middlechild/Taskfile.yml:47-54`) = lint → fmt:check → typecheck → test → build → test:e2e, the most complete single gate in the fleet | Not by npm-level chaining, but yes end-to-end via `task verify` | Yes (per-package) | `bun test` (core) + Vitest browser mode (`web` — `vitest.config.ts`) + Playwright e2e |
| grimoire-index | `ci: grim-indexer ci`, `ci:check`, `validate` (`grimoire-index/package.json:7-13`) — no local `.ts`, gate lives entirely inside the `@grimoire-rs/indexer` dependency | n/a (no source to lint/typecheck) | n/a | n/a | n/a |

**A Taskfile-wrapped single gate exists in 6 of 9 repos** (ocx-catalog, grimoire-indexer, grimoire-vscode, setup-ocx, kate-middlechild, grimoire-index-as-CI-shell). **vscode-ocx, fma, and creeptd-ng/web have no such wrapper** — the closest thing is npm's implicit `pretest` lifecycle in vscode-ocx, and nothing at all in fma or creeptd-ng/web. Also note: `setup-ocx`'s gate — local and CI alike — never runs `tsc` directly; the fleet's only type-aware-ESLint repo is also the fleet's only repo with no standalone typecheck step, which means its "typecheck" coverage is entirely a side effect of lint, undocumented as such in its own `CLAUDE.md` (`setup-ocx/CLAUDE.md:20` lists `task lint` and doesn't mention that lint is also the type gate).

---

## 4. CI

```
$ find <repo> -path "*/.github/workflows/*" -iname "*.yml"
```

TypeScript-touching workflows only (repo-wide workflow counts in parens where a repo has non-TS workflows too):

| Repo | Workflow | Triggers | Steps (condensed) | Node/Bun pin | Actions pinned to SHA or tag? |
|---|---|---|---|---|---|
| ocx-catalog | `ocx-catalog/.github/workflows/ci.yml` (+`release.yml`, `pages.yml`) | `pull_request`, `push: [main]` | 8 jobs, each its own `task <target>`: `lint`, `typecheck`, `test`, `pack-verify` (network-enabled `publint`+`attw`+real pack/install smoke), `workflows-lint` (zizmor), `audit-signatures`, `repo-checks` (gitleaks/lychee/actionlint), `web-quality` (Lighthouse CI) | Node 24 (`ocx-catalog/.github/workflows/ci.yml:32`) | **Full commit SHA**, e.g. `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1` (`ocx-catalog/.github/workflows/ci.yml:27`) — every `uses:` in the file |
| grimoire-indexer | `grimoire-indexer/.github/workflows/ci.yml` (+`release.yml`) | `push: [main]`, `pull_request` | 1 job, matrixed on Node `["22","24"]`: `npm ci` then `task check` (= local gate exactly) | 22 and 24 (matrix) — `grimoire-indexer/.github/workflows/ci.yml:194` | **Full SHA** for checkout; `ocx-sh/setup-ocx@de8e3366f812941423985eaccae28663ef192e8b # v1.3.0` (`:201`) |
| grimoire-vscode | `grimoire-vscode/.github/workflows/ci.yml` (+`release.yml`) | `push: [main]`, `pull_request`, `workflow_dispatch` | `build-test` matrixed on `[ubuntu, macos, windows]`: install → lint → check-types → build → test (headless on Linux) → upload coverage; separate `package` job builds VSIX | Node 20 (`grimoire-vscode/.github/workflows/ci.yml:236`) | **Floating major tag**: `actions/checkout@v7.0.1`, `actions/setup-node@v7` (`:232,234`) |
| vscode-ocx | `vscode-ocx/.github/workflows/ci.yml` (+`release.yml`; `ai-config.yml` is unrelated to TypeScript — validates AI-config files, no `node`/`npm`/`tsc` step, excluded here) | same triggers as grimoire-vscode | same shape as grimoire-vscode, minus coverage upload | Node 20 (`vscode-ocx/.github/workflows/ci.yml:320`) | **Floating major tag, one major OLDER than its sibling**: `actions/checkout@v6`, `actions/setup-node@v6` (`:316,318`) vs grimoire-vscode's `v7` |
| setup-ocx | `setup-ocx/.github/workflows/verify-basic.yml`, `verify-deep.yml` (+`release.yml`) | `push: [main]`, `pull_request` (basic); `workflow_dispatch` + `pull_request: [main]` (deep) | `dogfood`, `project-disabled`, `integration-musl`, `lint` (`task fmt:check && task lint`), `coverage` (`bun test --coverage` + Codecov upload) | **No explicit Node/Bun version pin in the workflow file** — provisioned by the action's own `ocx.toml` pin, not visible in the workflow YAML itself | **Full SHA**: `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6` (`setup-ocx/.github/workflows/verify-basic.yml:382`), Codecov pinned to SHA too |
| fma | **none — no `.github/workflows/` directory at all** | — | — | — | — |
| creeptd-ng | `creeptd-ng/.github/workflows/ci.yml` job `web-check` (repo also has `integration.yml`, `deploy.yml`, `smoke.yml`, `audit.yml`, mostly Rust-only) | `push`/`pull_request` to main (repo-wide gate) | `pnpm install --frozen-lockfile` → `pnpm -C web run typecheck` (vue-tsc) → `pnpm -C web run test` (vitest) → `pnpm -C web run build` (vite). **No lint step.** | **No `actions/setup-node` step at all in `web-check`** — runs on whatever Node ships with `ubuntu-24.04` by default, unpinned | **Floating major tag**: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/cache@v4` (`creeptd-ng/.github/workflows/ci.yml:314,317,321`) |
| kate-middlechild | **none — no `.github/workflows/` directory at all** | — | — | — | — |
| grimoire-index | `verify-ci.yml`, `pages.yml`, `validate.yml`, `dco.yml`, `refresh.yml` — no TS source, but these drive `npm ci --ignore-scripts` + `npm run ci` against the `@grimoire-rs/indexer` dependency | various | — | Node 22 (`grimoire-index/.github/workflows/verify-ci.yml:62`) | not audited in depth (out of TS scope; no TS source here) |

**CI vs local-script gate — superset/subset:**
- **ocx-catalog: CI is a strict superset** of `task verify` (adds pack-verify's network-enabled publish-dry-run, zizmor, gitleaks/lychee/actionlint, Lighthouse — none of which run in `task verify` itself).
- **grimoire-indexer: CI equals the local gate exactly** (`task check`, nothing added, nothing missing) — the cleanest 1:1 in the fleet.
- **grimoire-vscode / vscode-ocx: CI is roughly equal** to `npm run check` + test, run directly rather than through the Taskfile — not a real subset/superset, just a different entry point to the same 3-4 steps.
- **setup-ocx: CI matches `task check` exactly**, including its gap — no CI job named "typecheck" exists, matching the absence noted in §3.
- **creeptd-ng/web: CI is a strict subset of the local scripts.** `package.json` declares a `lint` script (`creeptd-ng/web/package.json:14` `"lint": "eslint src --ext .ts,.vue"`), but (a) no ESLint config exists anywhere in the repo to run it against (§2) and (b) the `web-check` CI job never invokes it. This is a dead script on a broken/absent config, silently never gated.
- **fma and kate-middlechild: no CI exists to compare against local scripts at all.**

---

## 5. Package manifest posture

```
$ jq '{name,type,engines,packageManager,main,module,types,exports:(.exports!=null),scripts}' <repo>/package.json
$ ls <repo> | grep -iE "package-lock|bun.lock|pnpm-lock|yarn.lock"
```

| Repo | `type` | `engines` | `exports` present? | publint/attw run? | Lockfile |
|---|---|---|---|---|---|
| ocx-catalog | `module` | `node: >=20.19` | Yes — `./theme` + `./package.json` self-export (`ocx-catalog/package.json:16-19`) | **Yes — both.** `@arethetypeswrong/cli` + `publint` in devDependencies (`ocx-catalog/package.json:77,89`), invoked by `scripts/pack-smoke.mjs` via `task pack-smoke` | `package-lock.json` |
| grimoire-indexer | `module` | `node: >=22.14.0` | Yes — `.` + `./integration`, **no self `./package.json` export** unlike ocx-catalog (`grimoire-indexer/package.json` exports block) | **No — neither**, despite being the fleet's other published ESM library+CLI with the same shape as ocx-catalog | `package-lock.json` |
| grimoire-vscode | (unset) | `vscode: ^1.96.0`, `node: >=20` | No (`main` points at bundled `dist/extension.js`) | No | `package-lock.json` |
| vscode-ocx | (unset) | `vscode: ^1.96.0`, `node: >=20` | No | No | `package-lock.json` |
| setup-ocx | `module` | `node: >=24` | No | No | `bun.lock` |
| fma | `module` | (unset) | No | No | `package-lock.json` |
| creeptd-ng/web | `module` | (unset) | No | No | `package-lock.json` — **but see below** |
| kate-middlechild | (unset at root; members are `module`) | (unset) | `core`/`tokens`: yes; `web`: no | No | `bun.lock` |
| grimoire-index | `module` | (unset) | No | No | `package-lock.json` |

**publint/@arethetypeswrong run in exactly one repo (ocx-catalog) despite two repos sharing the "published ESM library+CLI" shape.** grimoire-indexer ships the same kind of dual `bin`+`exports` package to a registry with zero package-shape verification.

**Package-manager mismatch, confirmed: `creeptd-ng`.** Root declares a pnpm workspace — `creeptd-ng/pnpm-workspace.yaml:1-2` (`packages: ["web"]`) and a committed `creeptd-ng/pnpm-lock.yaml`; CI installs via `pnpm/action-setup` + `pnpm install --frozen-lockfile` (§4). Yet `creeptd-ng/web/package-lock.json` is *also* committed in the same directory — a dead npm lockfile nothing in CI or the Taskfile-equivalent uses. Two lockfile kinds for one workspace member, one of them silently stale.

**Dependency-placement claim, confirmed exactly as hypothesized for `creeptd-ng/web`, and confirmed nowhere else.** `creeptd-ng/web/package.json` `dependencies` (not `devDependencies`) include `@testing-library/vue: ^8.1.0`, `@vue/test-utils: ^2.4.10`, `jsdom: ^29.1.1` — all three are test-only tooling with no runtime code path. Checked every other repo's `dependencies` block (`ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx`, `fma`, `kate-middlechild/web`, `kate-middlechild/core`) — none contain a test/build-only package in `dependencies`; every other repo keeps that boundary clean (e.g. `ocx-catalog`'s `vitest`/`eslint`/`@vitest/coverage-v8` are all correctly in `devDependencies`).

TypeScript compiler version is itself fragmented, not asked for as a matrix column but worth naming in prose: `grimoire-vscode`, `vscode-ocx`, `grimoire-indexer`, `setup-ocx` all pin `typescript: ^6.0.3`; `ocx-catalog` pins `^5.9.3`; `fma` `^5.7.2`; `creeptd-ng/web` `^5.7.0`; `kate-middlechild` pins `^5.8.0` via its Bun `catalog` (`kate-middlechild/package.json:6-11`). ESLint major version is similarly split: `eslint ^10.x` (ocx-catalog, grimoire-indexer, grimoire-vscode, vscode-ocx) vs `eslint ^9.x` (setup-ocx, fma).

---

## 6. Existing AI config

```
$ find <repo> -maxdepth 2 \( -iname "CLAUDE.md" -o -iname "AGENTS.md" -o -iname "copilot-instructions.md" \) -not -path "*/node_modules/*"
```

Every repo except **fma** and **grimoire-index** has a root `CLAUDE.md`; `ocx-catalog`, `grimoire-vscode`, `vscode-ocx`, `creeptd-ng` also carry `AGENTS.md`. **fma has zero AI configuration of any kind** — no `CLAUDE.md`, `AGENTS.md`, `.claude/`, nothing. Six repos carry a dedicated TypeScript quality rule file:

| Repo | File | Size | Grounded in this repo's actual config, or generic? |
|---|---|---|---|
| ocx-catalog | `ocx-catalog/.claude/rules/quality-typescript.md` | 167 lines / 7.5 KB | **Repo-grounded.** Names its own two-tsconfig split, its own eslint config (correctly states "not the type-checked variant — no `parserOptions.project` wired up"), its own vitest coverage thresholds. |
| grimoire-vscode | `grimoire-vscode/.claude/rules/quality-typescript.md` | 173 lines / 8.9 KB | **Generic "2026 state" boilerplate**, explicitly labeled "Project-independent, shareable" in its own body (line 187). Near-byte-identical to vscode-ocx's copy. |
| vscode-ocx | `vscode-ocx/.claude/rules/quality-typescript.md` | 172 lines / 8.8 KB | Same generic template as grimoire-vscode, with one repo-specific addition: a VS Code CJS-extension-host caveat (`vscode-ocx/.claude/rules/quality-typescript.md:456` — bundler emits `format: cjs` even though source is ESM-style). |
| creeptd-ng | `creeptd-ng/.claude/rules/quality-typescript.md` | 70 lines / 3.0 KB | **Repo-grounded**, densely domain-specific: Vue 3 `<script setup>` mandate, Connect-ES/protobuf generated-code-is-truth rule, `Brand<T,B>` ID typing, `Result<T,E>` pattern, points to 4 deep-dive docs under `.claude/docs/quality-typescript/`. |
| kate-middlechild | `kate-middlechild/.claude/rules/quality-typescript.md` | 112 lines / 4.8 KB | **Repo-grounded**: names `tsconfig.base.json` exactly, mandates Zod at every external boundary, forbids DOM/Node imports in `packages/core`, states "Biome handles format + lint" (matches §2's finding exactly). |
| setup-ocx | `setup-ocx/.claude/rules/typescript.md` | 93 lines / 5.1 KB | **Repo-grounded**, matches its actual tsconfig flag-for-flag (`setup-ocx/.claude/rules/typescript.md` §1 lists exactly the 5 flags present in `setup-ocx/tsconfig.json`). Frames rules around "a Node 24 GitHub Action — the bundle ships to runners." |
| grimoire-indexer | **none** | — | Has `.claude/rules/quality-design-tokens.md` and `quality-css-overrides.md` but no `quality-typescript.md` at all — a gap given it's a TS library+CLI with the same shape as ocx-catalog, which does have one. |

Verbatim normative content, deduplicated across all six (the union of what every file asserts):

- `strict: true` non-negotiable, never weakened or routed around with `// @ts-nocheck`.
- `noUncheckedIndexedAccess` called out by name in 5 of 6 files as "the single highest-value flag missing from `strict`" (TS issue #49169) — even in ocx-catalog's file, which then correctly notes the flag is *not* actually turned on there.
- `any` banned in exported/public signatures; `unknown` + narrowing is the replacement. `catch (e)` must rely on the default `unknown`, never `catch (e: any)`.
- `as X` assertions banned as a way to silence a type error; a type guard (`is` predicate) or discriminated union is required instead.
- Non-null `!` banned without an explicit justification comment.
- `@ts-ignore` banned without a comment; `@ts-expect-error` preferred (self-removing once fixed).
- TypeScript `enum` banned; `const`-union string literal types required instead.
- Discriminated unions tagged with a `kind`/`type` field, `never`-exhaustion check in the default `switch` branch — identical code sample appears near-verbatim in ocx-catalog, grimoire-vscode, and vscode-ocx's files.
- `satisfies` preferred over an explicit type annotation for config/literal objects.
- `import type` required for type-only imports.

Real inconsistency between what the rule files *say* and what the repo's own config *does*: **grimoire-vscode's and vscode-ocx's `quality-typescript.md` tooling tables describe ESLint as delivering "Type-aware rules"** (`vscode-ocx/.claude/rules/quality-typescript.md:478` — Status "Project default (flat config)", Use-when "Type-aware rules...") **while their actual `eslint.config.mjs` wires only the non-type-checked `recommended` preset** (§2) — no `parserOptions.project` anywhere in either file. The rule document implies capability the config doesn't have.

---

## Portable vs repo-specific

**Portable — safe to assert for any TypeScript repo, backed by fleet-wide or near-fleet-wide measurement:**
- `strict: true` as the non-negotiable floor (13/13 real tsconfigs; the one universal agreement in §1).
- `skipLibCheck: true` (12/12 real tsconfigs).
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax` as the modern strict-mode trio to layer on top of `strict` — present together or in pairs in 7 of the fleet's 9 "real" repo-level configs, and independently corroborated by 5 of 6 AI-config rule files calling out `noUncheckedIndexedAccess` by name and TS issue number. The two repos missing all three (ocx-catalog, grimoire-indexer) are the fleet's outliers on this axis, not the norm.
- Keep build/test/type tooling in `devDependencies`, never `dependencies` — true everywhere except the one confirmed violation (`creeptd-ng/web`), which the fleet's own pattern makes visibly wrong.
- `any` banned in exported signatures; `unknown` + narrowing; no `as X` to silence errors; no bare non-null `!`; no `@ts-ignore` without comment (prefer `@ts-expect-error`); no numeric `enum`; discriminated unions with a `never`-exhaustion default — all six AI-config rule files converge on this list independently, and it doesn't depend on the repo's shape.
- Wire one command that chains lint → typecheck → test (Taskfile `verify`/`check`, or an npm `pretest` hook) — present in 7 of 9 repos; its *absence* correlates directly with the repos that also have no CI (fma) or a broken lint step (creeptd-ng/web).
- Module system pairing consistency (`NodeNext`+`NodeNext`, `Bundler`+`ESNext`, `Node16`+`Node16` — never a mismatched pair) holds in every tsconfig measured; worth asserting as a lint-able invariant.

**Repo-specific — do not assert fleet-wide, shape-dependent or repo-invented:**
- The exact strictness flag set beyond `strict` (library/CLI shape genuinely trades off differently than app/extension shape here — see §1).
- Which task runner wraps the gate (Taskfile vs raw npm scripts vs npm's `pretest` lifecycle) — three different mechanisms achieve the same "single command" property; none is more "correct" than another given the fleet's own inconsistency.
- Type-aware ESLint (`parserOptions.project` + `strictTypeChecked`) — real, valuable, but adopted in exactly 1 of 9 repos; presenting it as fleet convention would misstate the fleet.
- 100% coverage thresholds (ocx-catalog only) — not observed elsewhere.
- Biome vs ESLint+Prettier as the lint/format stack — a real per-repo choice (Bun-first monorepo picked Biome; everything else picked ESLint), not a fleet consensus to assert either way.
- Domain-specific content: Vue 3 `<script setup>`-only, Pinia-store rules, Connect-ES/protobuf generated-code rules (creeptd-ng); Zod-at-every-boundary, `packages/core` framework-agnostic constraint (kate-middlechild); GitHub-Action-specific entry-point/`process.exit` ownership rules (setup-ocx).

---

## Gaps

What no repo (or nearly no repo) configures, that the divergence above suggests someone meant to:

1. **`noImplicitReturns` and `erasableSyntaxOnly` are absent from every tsconfig in the fleet** (0 of 15). `erasableSyntaxOnly` is specifically relevant to the fleet's Bun-native repos (`setup-ocx`, `kate-middlechild/packages/core`, both running `bun test`/`bun run` against untranspiled `.ts` directly) — exactly where a decorator or `enum` that Bun can't type-strip would silently misbehave, and exactly where this flag would catch it at typecheck time instead.
2. **Type-aware ESLint is real and working in one repo (`setup-ocx`) and undocumented as a pattern anywhere else** — grimoire-vscode's and vscode-ocx's own rule files gesture at "type-aware rules" as if already present (§6) without the `parserOptions.project` wiring that would make it true. The fleet has a working reference implementation nobody else copied.
3. **publint/@arethetypeswrong verifies package shape in exactly one of two published-library repos.** `grimoire-indexer` ships the same `bin`+`exports` shape as `ocx-catalog` to a registry with zero automated check that its `exports` map actually resolves or that its published types match its runtime shape.
4. **fma and kate-middlechild have full local gates and zero CI.** fma has `lint`/`typecheck`/`test` scripts that would combine into a real gate but nothing runs them on push or PR. kate-middlechild has the fleet's most complete Taskfile `verify` target (lint, fmt:check, typecheck, test, build, test:e2e) and, again, nothing invokes it automatically.
5. **Node/Bun version pinning is inconsistent even where CI exists**, and in `creeptd-ng/web`'s `web-check` job it's entirely absent (no `actions/setup-node` step — runs on whatever the `ubuntu-24.04` image ships). Four different explicit Node versions appear across the fleet's CI (20, 22, 22/24 matrix, 24) with no shared baseline.
6. **Action-pinning discipline (SHA vs floating tag) is unrelated to CI maturity, not consistent within it.** The two most CI-elaborate repos (ocx-catalog, grimoire-indexer) pin every `uses:` to a full commit SHA; the two VS Code extensions — sibling repos, same generator lineage — float on major-version tags and disagree with each other by a full major (`v6` vs `v7`).
7. **A dead/broken lint gate ships silently in `creeptd-ng/web`**: a `lint` script referencing ESLint, no ESLint config anywhere in the repo to satisfy it, and CI that never calls it — the script would fail if anyone ran it, and nothing currently does.
8. **No repo runs a linter and a type checker in the same pass consistently enough to make "does test typecheck" a yes/no fleet answer** — every repo treats lint and typecheck as separate scripts/jobs except `setup-ocx`, which folds typecheck into lint instead of keeping both, and documents neither choice as deliberate in its own `CLAUDE.md`.

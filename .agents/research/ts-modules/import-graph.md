---
title: Import-Graph Hygiene for the AI-Agent TypeScript Rule Set
topic: import-graph
agent: research
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 19
scope: >
  Covers cycle detection (import-x/no-cycle, Biome noImportCycles),
  extraneous/missing-dependency detection (no-extraneous-dependencies,
  Biome noUndeclaredDependencies), unresolved-import detection (no-unresolved,
  Biome noUnresolvedImports), monorepo package-boundary guards
  (no-relative-packages, Biome noPrivateImports), and barrel-file cost —
  measured against all nine fleet repos under /home/mherwig/dev. Does not
  cover general ESLint/Biome setup, non-import-graph rules, or bundler
  tree-shaking mechanics beyond what barrel-file cost requires.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The fork story: eslint-plugin-import vs eslint-plugin-import-x](#1-the-fork-story-eslint-plugin-import-vs-eslint-plugin-import-x)
   2. [no-cycle / noImportCycles: semantics and cost](#2-no-cycle--noimportcycles-semantics-and-cost)
   3. [no-extraneous-dependencies / noUndeclaredDependencies](#3-no-extraneous-dependencies--noundeclareddependencies)
   4. [no-unresolved / noUnresolvedImports — these are not the same check](#4-no-unresolved--nounresolvedimports--these-are-not-the-same-check)
   5. [Making resolution work: the TypeScript resolver and NodeNext](#5-making-resolution-work-the-typescript-resolver-and-nodenext)
   6. [Biome's project domain: everything is opt-in twice](#6-biomes-project-domain-everything-is-opt-in-twice)
   7. [Measured: cycles in the fleet — 4 found, all TDZ-safe today](#7-measured-cycles-in-the-fleet--4-found-all-tdz-safe-today)
   8. [Measured: extraneous and unresolved imports — zero real hits, five false-positive shapes](#8-measured-extraneous-and-unresolved-imports--zero-real-hits-five-false-positive-shapes)
   9. [The kate-middlechild boundary violation, and which guard actually fits](#9-the-kate-middlechild-boundary-violation-and-which-guard-actually-fits)
   10. [Barrel files: 12 files named index.ts, ~3 that are actually barrels](#10-barrel-files-12-files-named-indexts-3-that-are-actually-barrels)
   11. [dependency-cruiser as the CI-heavy alternative](#11-dependency-cruiser-as-the-ci-heavy-alternative)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Zero of the fleet's 9 repos currently run any import-graph rule — no `import-x`, no `eslint-plugin-import`, no Biome `project` domain rule is installed or enabled anywhere. This is a real, currently-uncovered gap, not a hypothetical.
- Install `eslint-plugin-import-x`, not `eslint-plugin-import`, in every ESLint repo in this fleet (7 of 8 ESLint repos are candidates; `creeptd-ng/web` has no working ESLint config on `main` at all — see Finding 1). `import-x` is the actively-developed fork; `eslint-plugin-import`'s own upstream README documents the maintainer declining the `exports`-field and flat-config feature requests that drove the fork ([source](https://github.com/un-ts/eslint-plugin-import-x)).
- `import-x/no-cycle` is real: madge found **4 circular dependencies, all in `grimoire-indexer`, zero elsewhere** — `data/index.ts ↔ enrich/checkpoint.ts ↔ enrich/index.ts` and `ratings/provider.ts ↔ provider_github.ts` / `↔ provider_gitlab.ts`.
- All 4 measured cycles are TDZ-safe today: every binding crossing a cycle edge is a hoisted `export function`/`export type`, or a `const` read only inside a deferred function body — never a `const` read during the importing module's own top-level evaluation. `grimoire-indexer`'s own source comments already document this constraint by hand (see Finding 7). The rule should still be turned on: it currently has nothing to enforce, but the discipline is manual and will silently break the first time someone adds an eager `const` across one of those two edges.
- `no-extraneous-dependencies` / Biome `noUndeclaredDependencies` would currently fire **zero times** fleet-wide — but only after excluding five real false-positive shapes this fleet actually hits: `@/`-prefixed path aliases, the `vscode` extension-host virtual module, `astro:content`-style virtual namespaces, `bun:test`, and Node.js package self-references via `package.json` `"exports"` (`@ocx-sh/catalog/theme` imported from inside `@ocx-sh/catalog` itself). See Finding 8 for exact hits and why each is not real.
- `no-unresolved` / Biome `noUnresolvedImports` also fire **zero times** fleet-wide, but a naive resolver check will misfire on two conventions this fleet uses: NodeNext's `./foo.js`-on-disk-as-`./foo.ts` extension rewriting, and Vite's `?raw`/`?url`/`?worker` query-suffixed asset imports (`./shaders/plasma.frag?raw`, `../assets/logo.svg?url`).
- Biome's `noUnresolvedImports` is **not** a path-resolution check the way ESLint's `no-unresolved` is — it warns when an import names an export that doesn't exist in an already-resolved module (`import { fooo } from "./foo.js"` when only `foo` is exported). Confusing the two by name is an easy, wrong assumption ([source](https://biomejs.dev/linter/rules/no-unresolved-imports/)).
- `noUndeclaredDependencies`, `noUnresolvedImports`, and `noImportCycles` all live in Biome's **`project` domain**, which is off unless `biome.json` sets `"linter": {"domains": {"project": "recommended"}}` — setting the rule under `linter.rules` alone without enabling the domain is a real, silent-failure-shaped trap ([source](https://biomejs.dev/linter/domains/)).
- The confirmed cross-package violation — `kate-middlechild/packages/core/src/map.test.ts:12` importing `../../web/src/data/ph-regions.geojson.json` — has **no clean off-the-shelf guard in this repo's own toolchain**: `import-x/no-relative-packages` is the right rule in spirit but this repo runs Biome, not ESLint; Biome's `noPrivateImports` governs JSDoc `@public`/`@package`/`@private` visibility tags within one package's folder tree, not cross-package relative paths in a workspace, and doesn't apply to a raw `.json` import at all. The practical fix is structural (move the fixture into `packages/core`'s own test tree), not a lint rule. See Finding 9.
- 12 files fleet-wide are literally named `index.ts`, but only **~3 are true re-export barrels**: `kate-middlechild/packages/core/src/index.ts` (a deliberate, heavily-used public-API barrel — 25 import sites via `@lutong/core`), `fma/src/render/index.ts` (a barrel with **zero callers** — dead weight, nothing imports through it), and `ocx-catalog/src/ci/index.ts` (a hybrid: partial re-export plus its own logic). The other 9 — including `grimoire-indexer/src/index.ts`, confirmed as the bare `export {}` stub — are subsystem main-files, CLI entry points, or router config that happen to be named `index.ts`, not aggregator barrels. Don't write a rule against the filename; write a rule (or note) against the re-export-fan-out pattern, and it will touch 3 files, not 12.
- At this fleet's current scale, madge's own "comparatively computationally expensive" cycle-detection caveat doesn't bite: measured wall time was under 750ms per repo (46–68 files), well inside an on-save budget. `no-cycle` and `noImportCycles` are every-edit-affordable **today** in this fleet; re-time before assuming that holds if any repo's file count grows an order of magnitude.
- `no-extraneous-dependencies` and `no-unresolved`/`noUnresolvedImports` both require a resolvable dependency tree — `node_modules` present (or Biome's equivalent resolution) — which **5 of 9 repos currently lack on a bare checkout** (`ocx-catalog`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx`, `kate-middlechild`). That's an operational precondition, not a tooling choice: these two rule families can only run every-edit in a repo an agent has already `npm install`ed into, and are otherwise CI-only by default.
- `eslint-import-resolver-typescript`'s current config surface is `import-x/resolver-next` with `createTypeScriptImportResolver(...)`, gated to `eslint-plugin-import-x@>=4.5.0` — the older object-literal `settings: { 'import/resolver': { typescript: {...} } }` form still works with legacy `eslint-plugin-import` but is the shape an LLM trained on older tutorials will reach for first even when targeting `import-x` ([source](https://github.com/import-js/eslint-import-resolver-typescript)).

## Findings

### 1. The fork story: eslint-plugin-import vs eslint-plugin-import-x

`eslint-plugin-import` is at **v2.32.0** on its `package.json` `version` field ([source](https://raw.githubusercontent.com/import-js/eslint-plugin-import/main/package.json)), and its repo does show a recent tag (`utils/v2.14.0`, a monorepo sub-package tag dated 2 Jul) — it is not abandoned. But `eslint-plugin-import-x`'s own README states plainly why it exists: the original plugin's maintainer declined feature requests including `package.json` `"exports"`-field support, and locked at least one such discussion ([source](https://github.com/un-ts/eslint-plugin-import-x)). `import-x` is at **v4.17.1** (released 28 Jun) and ships continuous fixes — the visible changelog entry for that release fixes extension-requirement handling for `.d.ts` package subpaths (e.g. `vitest/config`) ([source](https://github.com/un-ts/eslint-plugin-import-x/releases)).

Both plugins document flat-config (`eslint.config.js`) support today. The practical difference this fleet will hit is depth of TypeScript-era fixes and active issue triage, not a binary "flat config works / doesn't work" split — soften any blanket "import is unmaintained" claim to "import-x is the fork that gets the fixes; import declined the changes that produced it."

**Fleet-relevant consequence**: 7 of the 9 repos run ESLint flat config (`ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx`, `fma`, and — nominally — `creeptd-ng/web`); `kate-middlechild` runs Biome `^2.4.0`. **`creeptd-ng/web`'s `package.json` has a `"lint": "eslint src --ext .ts,.vue"` script but no `eslint.config.*` on `main` and no `eslint` package in its own `package.json` at all** — that script currently cannot run; an `eslint.config.js` exists only in an unmerged worktree branch (`.worktrees/web-lint`). Any import-graph guidance for that repo has a precondition: land base ESLint config first.

### 2. no-cycle / noImportCycles: semantics and cost

`import-x/no-cycle` — "Ensures that there is no resolvable path back to this module via its dependencies" — ignores type-only imports (Flow/TS) since they have no runtime effect, and offers `maxDepth` (cap search depth), `ignoreExternal` (skip `node_modules`, default `false`), and `allowUnsafeDynamicCyclicDependency` (suppress when a dynamic `import()` breaks the cycle at runtime). The doc calls the rule itself "comparatively computationally expensive" and explicitly suggests disabling it if you don't suspect cycles and want lint speed ([source](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-cycle.md)).

Biome's `noImportCycles` is the equivalent, in the `suspicious` group under the `project` domain, **available since Biome v2.0.0**, **not recommended by default**, with one option — `ignoreTypes` (default `true`, same type-only exemption as import-x). Biome's own doc repeats the performance caveat near-verbatim: "this rule is computationally expensive" ([source](https://biomejs.dev/linter/rules/no-import-cycles/)).

```js
// eslint.config.js — import-x/no-cycle, tuned for a fleet this size
{
  rules: {
    'import-x/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
  },
}
```

```json
// biome.json — noImportCycles requires the project domain first
{
  "linter": {
    "domains": { "project": "recommended" },
    "rules": { "suspicious": { "noImportCycles": "error" } }
  }
}
```

### 3. no-extraneous-dependencies / noUndeclaredDependencies

`import-x/no-extraneous-dependencies` flags a bare import that resolves to a package not listed in the nearest `package.json`'s `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, or `bundledDependencies`; internal (relative) imports are ignored by default. Each dependency-type flag (`devDependencies`, `optionalDependencies`, `peerDependencies`, `bundledDependencies`) defaults to `true` and can be narrowed to specific globs (e.g. only permit `devDependencies` imports from `**/*.test.ts`); `packageDir` takes a path or array of paths for monorepos so a package's imports are checked against its own manifest, not the workspace root's ([source](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-extraneous-dependencies.md)).

```js
// Fails: chalk isn't declared anywhere in this package's package.json
import chalk from 'chalk';

// Passes: node:fs is a builtin, ./util is relative (internal, ignored by default)
import fs from 'node:fs';
import { helper } from './util.js';
```

Biome's `noUndeclaredDependencies` is the equivalent — **since Biome v1.6.0**, `correctness` group, `project` domain, not recommended by default. It supports the same four dependency-type toggles (`devDependencies`, `peerDependencies`, `optionalDependencies`, `bundleDependencies`, each boolean-or-glob). Crucially, its documented exclusions are exactly the false-positive shapes this fleet hits: it "ignores internal imports (prefixed with `#` or `@/`) and protocol-based imports (`node:`, `bun:`, `jsr:`, `https:`)" — and it explicitly does **not** look at other manifests in a monorepo, only the closest `package.json` ([source](https://biomejs.dev/linter/rules/no-undeclared-dependencies/)).

That `@/`-alias exclusion is worth calling out for `import-x/no-extraneous-dependencies` too: it has **no** built-in alias exemption — a `@/`-style path alias (see `creeptd-ng/web`'s `tsconfig.json` `"@/*": ["./src/*"]` and matching `vite.config.ts` alias) will be misread as a scoped npm package (`@/api`, `@/types`, …) unless the resolver settings map it back to a relative path first (the TypeScript resolver, Finding 5, handles this — a bare `no-extraneous-dependencies` with no resolver configured will not).

### 4. no-unresolved / noUnresolvedImports — these are not the same check

`import-x/no-unresolved` does what its name says: "Ensures an imported module can be resolved to a module on the local filesystem, as defined by standard Node `require.resolve` behavior." It optionally checks `require()` (CommonJS) and AMD loaders, supports an `ignore` array of regexes for import specifiers to skip, `caseSensitive`/`caseSensitiveStrict` for filesystem case mismatches, and **requires a resolver** — the built-in Node resolver by default, or a plugin (`eslint-import-resolver-webpack`, `eslint-import-resolver-typescript`) for anything path-mapped ([source](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-unresolved.md)).

Biome's `noUnresolvedImports` is **not the same check**, despite the name. Its own doc: "Warn when importing non-existing exports. Importing a non-existing export is an error at runtime or build time" — it validates that a *named export exists inside an already-resolved module*, not that the import *path* resolves to a file on disk:

```js
// foo.js
export function foo() {}

// bar.js — Biome noUnresolvedImports FAILS this (fooo has no export named fooo)
import { fooo } from "./foo.js";

// bar.js — passes
import { foo } from "./foo.js";
```

It does not check dynamic `import()` or `require()`, doesn't fix automatically, and Biome's own doc notes TypeScript users typically already get this from `tsc` ([source](https://biomejs.dev/linter/rules/no-unresolved-imports/)). If the goal is "does this file path exist," `no-unresolved`/import-x is the tool; if the goal is "does this named export exist," Biome's `noUnresolvedImports` (or `tsc` itself) is; treating them as interchangeable substitutes across an ESLint-repo/Biome-repo split in the fleet will leave a gap either way.

### 5. Making resolution work: the TypeScript resolver and NodeNext

`eslint-import-resolver-typescript` is a separate package that teaches `import-x`/`import` to resolve TS files and `tsconfig.json` path mappings. Current config surface, for `import-x@>=4.5.0` (all repos in this fleet on a current toolchain would clear that bar):

```js
// eslint.config.js
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'

export default [{
  settings: {
    'import-x/resolver-next': [
      createTypeScriptImportResolver({ alwaysTryTypes: true, project: 'path/to/folder' }),
    ],
  },
}]
```

The older, still-supported-for-legacy-`eslint-plugin-import` form:

```js
// legacy shape — still works with eslint-plugin-import, not the resolver-next API
export default [{
  settings: {
    'import/resolver': {
      typescript: { alwaysTryTypes: true, project: 'path/to/folder' },
    },
  },
}]
```

([source](https://github.com/import-js/eslint-import-resolver-typescript))

Neither page documents NodeNext's `./foo.js`-on-disk-as-`./foo.ts` rewrite explicitly — could not establish from primary docs whether the TypeScript resolver handles this out of the box as of 2026-08-29. Empirically, in this fleet's own `ocx-catalog` and `grimoire-indexer` (both NodeNext, ESM), every `.js`-suffixed relative import correctly resolves to a same-named `.ts` file on disk with no `.js` file present anywhere — verified by direct filesystem check (Finding 8), not by running the ESLint rule end-to-end (both repos are missing `node_modules` or the plugin isn't installed yet). Treat "the TS resolver handles NodeNext `.js`→`.ts` correctly" as needing a live smoke test the first time this ships, not an assumption.

### 6. Biome's project domain: everything is opt-in twice

All three Biome rules this deliverable cares about — `noUndeclaredDependencies`, `noUnresolvedImports`, `noImportCycles` — belong to Biome's **`project` domain**, along with `noPrivateImports` (the one member of this group that *is* recommended), `useImportExtensions`, `useJsonImportAttributes`, `noDeprecatedImports`, and four nursery rules. The domain performs "project-level analysis" including "module graph for dependency resolution," and Biome's own doc is direct about the cost: "the scanning phase will have a performance impact on the linting process" ([source](https://biomejs.dev/linter/domains/)).

Enabling the domain is a separate config key from enabling the rule:

```json
{
  "linter": {
    "domains": { "project": "recommended" },
    "rules": {
      "correctness": { "noUndeclaredDependencies": "error", "noUnresolvedImports": "error" },
      "suspicious": { "noImportCycles": "error" }
    }
  }
}
```

Setting the three rules under `linter.rules` alone, without `linter.domains.project`, is very plausibly a silent no-op rather than an error — this is exactly the shape of mistake worth a mechanical check (grep `biome.json` for `"domains"` whenever any project-domain rule name appears in it).

Biome CLI's latest release is **v2.5.11** (27 Aug) ([source](https://github.com/biomejs/biome/releases)) — two days before this research. `kate-middlechild` pins `"@biomejs/biome": "^2.4.0"`; the caret range would resolve to 2.5.11 on a fresh install, so this is a lockfile-freshness note, not necessarily a stale pin.

### 7. Measured: cycles in the fleet — 4 found, all TDZ-safe today

`madge --circular --extensions ts,tsx <src>` (madge 8.0.0, via `npm exec --yes -- madge ...`) against every repo's source tree:

| Repo | Files scanned | Cycles found | Wall time |
|---|---|---|---|
| `ocx-catalog` (src) | 61 | 0 | 366ms |
| `grimoire-indexer` (src) | 46 | **4** | 396ms |
| `grimoire-vscode` (src) | 68 | 0 | 734ms |
| `vscode-ocx` (src) | 10 | 0 | 292ms |
| `setup-ocx` (src) | 10 | 0 | 276ms |
| `fma` (src, ts/tsx only) | 48 | 0 | 405ms |
| `kate-middlechild` (packages, ts/tsx) | 45 | 0 | 427ms |
| `creeptd-ng/web` (src, ts/tsx only) | 39 | 0 | 427ms |

`grimoire-indexer`'s 4 cycles, exactly as madge reports them:

```
1) data/index.ts > enrich/checkpoint.ts
2) data/index.ts > enrich/checkpoint.ts > enrich/index.ts
3) ratings/provider.ts > ratings/provider_github.ts
4) ratings/provider.ts > ratings/provider_gitlab.ts
```

Every binding crossing every one of those edges was traced by hand:

- `ratings/provider.ts` imports `githubProvider`/`gitlabProvider` (both `export function`) from `provider_github.ts`/`provider_gitlab.ts`, which import back `ForgeError`, `at`, `graphql`, `nodes`, `threadBody`, `stringAt` (all hoisted `function`/type exports) from `provider.ts`. The repo's own source comment on this exact cycle: *"ESM handles the cycle: everything crossing it is a hoisted function declaration, referenced only from inside a closure. A `const` read at module scope is the case that rule excludes, and `PAGE_SIZE` was one — see `paging.ts`, which is why it lives there and not here."* (`ratings/provider.ts`, inline comment). The one `const` that used to cross this boundary was deliberately moved to a third file to break the eager-read risk.
- `data/index.ts` imports `packCheckpoint` (`export function`) from `enrich/checkpoint.ts`, which imports `findMetadataFiles`/`namespaceOf` (both `export function`) from `data/index.ts` back, and `LOGO_EXT` (an `export const` regex), `clearCompanions`, `clearContents` (both `export function`) from `enrich/index.ts`, which imports `findMetadataFiles`/`namespaceOf` from `data/index.ts`, closing the loop. `LOGO_EXT` is the only `const` crossing a cycle edge in this pair — verified it is read only inside function bodies (`enrich/checkpoint.ts` lines 98 and 234, both inside function scope), never at either file's module top level.

Conclusion: **zero of the 4 measured cycles produce a TDZ or `undefined`-at-import-time hazard today**, because every `const` crossing a cycle edge is read lazily. This is fragile by construction, not by accident — the codebase already treats it as a rule to hand-enforce (see the `provider.ts` comment). `import-x/no-cycle` (or `noImportCycles`) turns that hand-enforced invariant into a mechanical one; today it would report the cycles as warnings with zero required code changes, and its value is preventing a *future* edit from reintroducing an eager `const` on either edge.

### 8. Measured: extraneous and unresolved imports — zero real hits, five false-positive shapes

A regex-based import scanner (not a full resolver — walks every `.ts`/`.tsx`/`.vue` file under each repo's source tree, matches `import`/`export … from`, dynamic `import()`, and `require()` specifiers, and checks bare specifiers against the nearest `package.json`'s combined dependency sets, and relative specifiers against the filesystem, including the NodeNext `.js`→`.ts`/`.tsx` swap) found, before filtering:

- 7 apparent "extraneous" hits, 6 fleet-wide after excluding `@/`-alias and self-reference — **all 6 false positives**: `@localSearchIndex` (VitePress's own virtual search-index module), `astro:content` (Astro's built-in virtual namespace, same shape as `node:`), `vscode` (×2, extension-host-injected module — present in `vscode-ocx/package.json` under `engines`, not `dependencies`), `bun:test` (×6 test files in `kate-middlechild`, Bun's builtin test module), and `@ocx-sh/catalog/theme` self-imported from inside `@ocx-sh/catalog` itself — legitimate per Node's self-reference rule (Finding "self-reference," sourced below): the package's own `package.json` `"exports"` maps `"./theme"` to `./src/theme/index.mts`.
- 96+ apparent "unresolved relative import" hits before fixing the checker to strip Vite's `?raw`/`?url`/`?worker` query suffixes before checking file existence, and to swap `.js`→`.ts`/`.tsx` for the NodeNext convention — **zero real hits remain** after both fixes. Every apparent miss was one of: a comment/JSDoc string that happens to contain the word "from" followed by a quoted string (e.g. `distinct from "absent"` in a doc comment — a scanner artifact, not a code issue), or a real asset import (`../../assets/ocx-logo.svg?url`, `./shaders/plasma.frag?raw`) whose target file exists once the query suffix is stripped.

**Practical consequence for rule configuration**, not just for this scan: any `no-extraneous-dependencies`/`noUndeclaredDependencies` config in this fleet needs an explicit ignore list — `vscode`, and (for Biome specifically, confirmed built-in) `@/`, `node:`, `bun:`, `jsr:`, `https:`. `import-x` has no built-in `@/`-alias exemption; that gap is closed by the TypeScript resolver (Finding 5), not by the rule itself. Any `no-unresolved` config needs `ignore: ['\\?raw$', '\\?url$', '\\?worker$']` (or equivalent) in Vite-based repos (`fma`, `creeptd-ng/web`, and `ocx-catalog`'s VitePress-based `site/`).

### 9. The kate-middlechild boundary violation, and which guard actually fits

Confirmed, single occurrence: `kate-middlechild/packages/core/src/map.test.ts:12` —

```ts
import geojson from "../../web/src/data/ph-regions.geojson.json";
```

`packages/core`'s own `src/index.ts` documents its contract: *"Public barrel: the ONLY import surface for packages/web and other consumers... Zero DOM / Astro / React / Node imports in this package."* This import runs that contract backwards — `core` reaching into `web`'s private source tree — though only from a test file; grepped the whole monorepo (`packages/**/*.ts*`) for any relative import crossing into a sibling package's `src/` and found no non-test occurrence.

Two candidate guards, neither a clean fit:

- **`import-x/no-relative-packages`** — "useful in a monorepo setup, where it's possible to import a sibling package using `../package` relative path, while direct `package` is the correct one" ([source](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-relative-packages.md)) — matches the *shape* of this violation exactly (a relative path reaching into a directory that is itself an npm workspace package), and is auto-fixable. But `kate-middlechild` runs **Biome**, not ESLint — this rule isn't in its toolchain at all. Even in an ESLint repo, the mechanical `--fix` (rewrite to `import geojson from '@lutong/web/...'`) wouldn't actually resolve: `web`'s `package.json` doesn't expose `src/data/*.json` through its `"exports"` map, so the fixed import would just move the failure to `no-unresolved`.
- **Biome's `noPrivateImports`** — governs JSDoc `@public`/`@package`/`@private`/`@access` visibility tags on *exported symbols within one package's folder tree* (same-folder-or-subfolder = allowed, different parent folder = restricted); it is the one `project`-domain rule that **is** recommended by default ([source](https://biomejs.dev/linter/rules/no-private-imports/)). It doesn't reach across `packages/core` → `packages/web` (those are two separate Biome-scanned packages, not folders within one), and it has no mechanism for tagging visibility on a raw `.json` file import — there's no export statement to attach a JSDoc tag to.

**Conclusion**: this fleet has no drop-in lint rule for "don't reach across a workspace package boundary via a relative path" in a Biome-only repo — that's a real gap in Biome's current rule set, not a configuration mistake. The correct fix here is structural: move `ph-regions.geojson.json` (or a copy/symlink of it) into `packages/core`'s own test-fixture tree, which also removes the only reason `core`'s tests currently reach outside the package. For any *ESLint*-toolchain repo in this fleet that later grows a workspace with multiple packages, `import-x/no-relative-packages` is the right rule to reach for — this fleet doesn't currently have an ESLint-toolchain monorepo with multiple `package.json`s to test it against.

### 10. Barrel files: 12 files named index.ts, ~3 that are actually barrels

Every file matching `**/index.{ts,tsx,mts}` under each repo's source tree (12 total, matching the number given in the brief):

| File | Lines | Re-export lines | What it actually is |
|---|---|---|---|
| `ocx-catalog/src/cli/index.ts` | 10 | 0 | CLI entry point, not a barrel |
| `ocx-catalog/src/theme/index.mts` | 43 | 0 | Single-purpose module (VitePress theme entry — matches `package.json` `"exports"["./theme"]`) |
| `ocx-catalog/src/ci/index.ts` | 48 | 1 | Hybrid: re-exports `CiError`/`CiErrorCode`, also defines `runCi()` itself |
| `grimoire-indexer/src/index.ts` | 8 | 0 | Confirmed `export {};` placeholder stub (see inline comment) |
| `grimoire-indexer/src/cli/index.ts` | 9 | 0 | CLI entry point |
| `grimoire-indexer/src/data/index.ts` | 181 | 0 | Subsystem main file — real classes/functions defined directly here |
| `grimoire-indexer/src/renderer/index.ts` | 487 | 1 (types only) | Subsystem main file — real logic, one `export type {...} from` at the bottom |
| `grimoire-indexer/src/enrich/index.ts` | 353 | 0 | Subsystem main file |
| `grimoire-indexer/src/validate/index.ts` | 294 | 0 | Subsystem main file |
| `fma/src/render/index.ts` | 3 | 2 | True barrel — **but zero callers**: `fma/src/graph/runner.ts` imports `Renderer.ts` directly, bypassing it entirely |
| `fma/src/graph/examples/index.ts` | 13 | 0 | Small aggregator array (2 example graphs), not a re-export barrel |
| `kate-middlechild/packages/core/src/index.ts` | 52 | 5 | True barrel, deliberate: "Public barrel: the ONLY import surface for packages/web" — 25 import sites across `packages/web` via `@lutong/core` (`package.json` `"exports"["."] = "./src/index.ts"`) |
| `creeptd-ng/web/src/router/index.ts` | 99 | 0 | Vue Router config, named `index.ts` by Vue Router convention, not a barrel |

Only `kate-middlechild/packages/core/src/index.ts` and `fma/src/render/index.ts` are re-export barrels in the sense the "barrel file cost" literature means — a file whose job is to fan out to sibling modules for import convenience. `ocx-catalog/src/ci/index.ts` is a partial case. The other 9 are `index.ts` used as a directory's *main file* (a legitimate, different convention — the file's job is to hold the subsystem's own logic, not to re-export it) or as framework-mandated config (Vue Router).

Consequence for the "does barrel cost bite the two Vite SPAs" question the brief raised: **measured, it mostly doesn't, in this fleet, today.** `fma`'s one true barrel has zero callers — no dev-server module graph is paying for it because nothing imports through it. `creeptd-ng/web` has no re-export barrel at all (its one `index.ts` is router config). The barrel-file dev-server/HMR cost that's real in this fleet lives in `kate-middlechild/packages/web` (Astro, not a raw SPA): 25 import sites go through `@lutong/core`'s 8-sibling-file barrel via the bare specifier `@lutong/core`, and several of those imports pull in only a single type (`import type { Locale } from "@lutong/core"`) — those specific imports are elidable at build time under `isolatedModules`/`verbatimModuleSyntax` since they're `import type`, but any of the 25 sites that import a *value* (`deriveDietary`, `filterDishes`, `sortDishes`, …) forces Vite's dev server to fetch and transform all 8 sibling files as separate module requests, not just the one function actually used.

### 11. dependency-cruiser as the CI-heavy alternative

`dependency-cruiser`'s built-in rules cover the same ground with a heavier, standalone (non-ESLint, non-Biome) analysis pass:

```json
{ "name": "no-circular", "severity": "warn", "from": { "pathNot": "^(node_modules)" }, "to": { "circular": true } }
```
```json
{ "name": "not-to-unresolvable", "severity": "error", "from": {}, "to": { "couldNotResolve": true } }
```

([source](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)) — its doc explicitly flags orphan detection specifically as having a performance cost ("Detecting orphans will have an impact on performance... it is something to keep in mind"), but does not document caching strategy or CI-vs-editor guidance in the rules-reference page fetched here — **could not establish dependency-cruiser's caching/perf story beyond that one line as of 2026-08-29**. Its practical niche versus `import-x`/Biome in this fleet: it runs independent of the linter, so it's a reasonable CI-only pass to add on top of (not instead of) an editor-facing `no-cycle`/`noImportCycles` rule for a fuller whole-graph report (it also draws dependency graphs, which neither ESLint nor Biome do) — but nothing in this fleet's current scale (≤193 files/package) demands reaching for a second tool; madge or the native lint rule already covers it in under a second (Finding 7).

## Normative guidance candidates

1. **In every ESLint-flat-config repo, install `eslint-plugin-import-x`, never `eslint-plugin-import`.** Rationale: `import-x` is the actively-fixed fork; `import`'s own upstream declined the feature requests (including flat-config-adjacent ones) that produced the fork. Verify: `grep -l '"eslint-plugin-import"' */package.json` fleet-wide should return nothing; `grep -l '"eslint-plugin-import-x"' */package.json` should match every ESLint repo that has import-graph rules enabled.
2. **Enable `import-x/no-cycle` (or Biome `noImportCycles`) as `error`, `ignoreExternal: true`, no `maxDepth` cap, in every repo.** Rationale: cheap at this fleet's scale (max measured 734ms/68 files) and the fleet's own code already treats cycle-safety as a hand-enforced invariant (Finding 7) — make it mechanical before an edit breaks it. Verify: run `npx madge --circular --extensions ts,tsx <src>` (or the lint rule itself) and confirm the cycle list matches what's committed as a known-and-audited exception, if any.
3. **Enable `import-x/no-extraneous-dependencies` (`packageDir` set per-package in monorepos) and Biome `noUndeclaredDependencies`, with an explicit ignore list: `vscode`.** Rationale: catches a real runtime-bug class (import a package you forgot to declare, install breaks in CI/on a clean clone) with zero fleet-wide noise once `vscode` is excluded (Biome auto-excludes `@/`, `node:`, `bun:`, `jsr:`, `https:` — `import-x` does not, and needs the TypeScript resolver wired for `@/`-style aliases, see #6). Verify: `grep -rn "^import-x/no-extraneous-dependencies\|noUndeclaredDependencies" eslint.config.* biome.json`; a clean run today is the baseline — any new failure is real.
4. **Do not enable `no-extraneous-dependencies`/`noUndeclaredDependencies` or `no-unresolved`/`noUnresolvedImports` as an every-edit rule in a repo without `node_modules` present.** Rationale: both need dependency resolution; 5 of 9 fleet repos (`ocx-catalog`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx`, `kate-middlechild`) currently lack `node_modules` on a bare checkout — the rule either silently no-ops or errors depending on tool, neither of which is "caught the bug." Verify: `test -d node_modules || echo "install first"` before trusting a green run of either rule.
5. **Wire `eslint-import-resolver-typescript` via the current `import-x/resolver-next` + `createTypeScriptImportResolver(...)` API (not the legacy `settings['import/resolver'].typescript` object), gated on `import-x >= 4.5.0`.** Rationale: without a resolver, `no-unresolved` either can't validate TS-only files/path aliases at all, or `no-extraneous-dependencies` misreads `@/`-style aliases as scoped npm packages. Verify: `eslint.config.*` contains `resolver-next` and `createTypeScriptImportResolver`, not a bare `'import/resolver': { typescript: ... }` object with no matching `import-x` version guard.
6. **In every Vite-based repo (`fma`, `creeptd-ng/web`, `ocx-catalog`'s `site/`), set `no-unresolved`'s `ignore` (or Biome equivalent) to skip `?raw`, `?url`, `?worker` suffixed specifiers.** Rationale: these are real, resolvable Vite conventions the checker will otherwise flag as unresolved. Verify: `grep -rn "\?raw'\|\?url'\|\?worker'" src` to enumerate what needs the ignore pattern, then confirm the rule config's `ignore` array covers each suffix used.
7. **When enabling any Biome `project`-domain rule (`noUndeclaredDependencies`, `noUnresolvedImports`, `noImportCycles`, `noPrivateImports`, …), set `linter.domains.project` in the same change.** Rationale: the rule name alone under `linter.rules` is very plausibly a silent no-op without the domain enabled — Biome scans the project only when the domain is on. Verify: `grep -A2 '"domains"' biome.json` shows `"project"` set whenever a project-domain rule name appears elsewhere in the file.
8. **Do not write a rule against the `index.ts` filename; if barrel cost matters, target the re-export-fan-out pattern specifically.** Rationale: 12 files fleet-wide are named `index.ts`; only ~3 are true re-export barrels, and one of those three has zero callers (dead code, not dev-server cost). A filename-based rule would flag 9 false positives (CLI entries, subsystem main files, router config) for every 1 real barrel. Verify (reading heuristic, not a lint): for each `index.ts`, count lines matching `^export\s.*\bfrom\b` — a file where that's most/all of its content is a barrel; a file with substantial non-re-export logic is a main file, not a barrel, regardless of its name.
9. **For `kate-middlechild/packages/core/src/map.test.ts:12`, relocate the fixture instead of reaching for a lint rule.** Rationale: neither `import-x/no-relative-packages` (wrong toolchain — this repo runs Biome) nor Biome `noPrivateImports` (wrong mechanism — governs JSDoc-tagged symbol visibility within one package, not cross-package relative paths, and doesn't apply to a `.json` import) is a clean fit; the fix that actually restores `core`'s "zero DOM/Astro/React/Node imports, zero cross-package reach" contract is moving `ph-regions.geojson.json` into `packages/core`'s own fixture tree. Verify: `grep -rn "\.\./\.\./\(web\|core\|tokens\)/" packages --include='*.ts*'` returns nothing.
10. **Treat `import-x/no-cycle`/`noImportCycles` as every-edit-affordable at this fleet's current scale; re-time before assuming that holds at 10x the file count.** Rationale: both tools' own docs call cycle detection "expensive," but measured wall time fleet-wide tops out at 734ms for the largest repo (68 files) — well inside an on-save budget; the caveat targets codebases with thousands of files, which none of these nine currently are. Verify: `time npx madge --circular --extensions ts,tsx <src>` per repo; re-evaluate the every-edit-vs-CI-only call if any repo crosses roughly 500 files.

## AI-agent angle

- **Installing `eslint-plugin-import` instead of `eslint-plugin-import-x`.** An agent trained on older tutorials defaults to the original package name. Mechanical check: `grep '"eslint-plugin-import"' package.json` (exact match, not `-x` suffix) in any repo where import-graph rules are being added.
- **Writing the legacy resolver settings shape (`settings: { 'import/resolver': { typescript: {...} } }`) against a modern `import-x` install.** It's the form that appears in most training-era examples; `import-x >= 4.5.0` wants `import-x/resolver-next` with `createTypeScriptImportResolver(...)` instead. Mechanical check: if `eslint-plugin-import-x` is in `package.json` at `^4.5.0` or newer, `grep "'import/resolver'"` in `eslint.config.*` should return nothing — that key belongs to the legacy plugin only.
- **Assuming Biome's `noUnresolvedImports` does what ESLint's `no-unresolved` does (file-path resolution).** They're both named around "unresolved" but check different things — named-export existence in an already-resolved module (Biome) versus can-this-path-be-found-on-disk (`import-x`). An agent reaching for "the Biome equivalent of `no-unresolved`" and expecting path-resolution coverage will get named-export-typo coverage instead and miss real broken paths. Mechanical check: read the Biome rule's own example fail case — if it's about a misspelled *export name*, not a misspelled *path*, this is the export check, not the path check.
- **Turning on a Biome `project`-domain rule by name alone and assuming it's active.** `noUndeclaredDependencies`/`noUnresolvedImports`/`noImportCycles` require `linter.domains.project` to be set separately from the rule itself; an agent that adds `"noImportCycles": "error"` under `linter.rules.suspicious` without touching `domains` has very plausibly shipped a no-op. Mechanical check: rule #7 above — `domains.project` must be present whenever a project-domain rule name is.
- **Flagging every `index.ts` as barrel-file debt.** An agent pattern-matching on filename alone, without reading each file's actual export shape, will misclassify CLI entry points, subsystem main files, and framework-mandated config files (Vue Router's own `index.ts`) as barrels needing to be split up. Mechanical check: rule #8's line-count heuristic — count `^export\s.*\bfrom\b` lines against total lines before recommending a split.
- **Treating a relative import that crosses into a sibling workspace package's directory as automatically fixable by switching to the package's bare specifier.** `import-x/no-relative-packages`'s `--fix` rewrites the specifier, but if the target file isn't in that package's `"exports"` map, the "fixed" import just fails resolution instead — Finding 9's `no-relative-packages` analysis is the concrete example. Mechanical check: before accepting an auto-fix for this rule, confirm the target path (or its parent barrel) actually appears in the target package's `package.json` `"exports"`.
- **Reading a cycle report and reflexively breaking it by making a `const` a `function`, or vice versa, without checking whether the value is read at module top level.** The distinction that actually matters for TDZ safety (Finding 7) is *when* the value is read, not what keyword declares it — a `const` read only inside a function body is exactly as safe as a hoisted function, and a `function` that happens to be invoked at module top level on the far side of a cycle can still fail. Mechanical check: for any binding crossing a reported cycle edge, grep for its usage sites and confirm none are outside a function/class body at the top level of the importing file.

## Contested / evolving

- **`eslint-plugin-import` vs `eslint-plugin-import-x` as "the" import plugin.** As of 2026-08-29, the fork (`import-x`) is the one receiving the fixes that matter for a current TypeScript/flat-config toolchain, and its own README documents specific declined-upstream feature requests as the reason it exists ([source](https://github.com/un-ts/eslint-plugin-import-x)) — but `eslint-plugin-import` is not archived and both document flat-config support today. This is a maintenance-velocity argument, not a "one plugin literally cannot run" argument; re-check before treating it as settled if `eslint-plugin-import` ships a major version bump.
- **Whether import-graph rules belong in the ESLint/Biome layer at all, versus a dedicated tool (`dependency-cruiser`) or a bundler-level check.** This fleet's evidence points toward "the lint-layer rule is enough, `dependency-cruiser` is additive" purely because of scale (Finding 11) — that calculus is explicitly file-count-dependent and could flip for a repo that grows past a few hundred files, or one that wants graph visualization dependency-cruiser provides and the lint rules don't.
- **Barrel files as an anti-pattern in general** is a live, evolving industry debate (bundler dev-server cost vs. package-boundary-API value) that this research deliberately did not resolve in the abstract — Finding 10 answers only what this fleet's 12 `index.ts` files actually are, and finds the abstract debate barely applies here because 9 of the 12 aren't re-export barrels in the first place.
- **Could not establish** dependency-cruiser's caching behavior or its authors' stated CI-vs-editor guidance beyond the one performance-cost sentence found in the fetched rules-reference page, as of 2026-08-29 — its docs site has more (a "getting started"/"performance" guide was not fetched in this pass) and should be read before recommending it for anything beyond an occasional CI pass.
- **Could not establish** whether `eslint-import-resolver-typescript` handles NodeNext's `.js`→`.ts` extension rewrite by design or by accident of how it delegates to `tsc`'s own module resolution — its docs page fetched here doesn't address it explicitly, and this fleet's own two NodeNext repos don't yet have the plugin installed to observe it running.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/un-ts/eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x) | Primary — `import-x` README | current | Origin story: why the fork exists, upstream's declined feature requests |
| […/eslint-plugin-import-x/docs/rules/no-cycle.md](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-cycle.md) | Primary — rule doc | current | Exact options (`maxDepth`, `ignoreExternal`, `allowUnsafeDynamicCyclicDependency`), perf caveat |
| […/eslint-plugin-import-x/docs/rules/no-extraneous-dependencies.md](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-extraneous-dependencies.md) | Primary — rule doc | current | Exact options incl. `packageDir` for monorepos |
| […/eslint-plugin-import-x/docs/rules/no-unresolved.md](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-unresolved.md) | Primary — rule doc | current | Resolver requirement, `ignore` option |
| […/eslint-plugin-import-x/docs/rules/no-relative-packages.md](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-relative-packages.md) | Primary — rule doc | current | The rule shape for the kate-middlechild boundary violation |
| [github.com/un-ts/eslint-plugin-import-x/releases](https://github.com/un-ts/eslint-plugin-import-x/releases) | Primary — release list | v4.17.1, 28 Jun | Confirms current version and active release cadence |
| [biomejs.dev/linter/rules/no-import-cycles](https://biomejs.dev/linter/rules/no-import-cycles/) | Primary — Biome docs | since v2.0.0 | `noImportCycles` semantics, `ignoreTypes` option, perf caveat |
| [biomejs.dev/linter/rules/no-undeclared-dependencies](https://biomejs.dev/linter/rules/no-undeclared-dependencies/) | Primary — Biome docs | since v1.6.0 | Confirms `@/`/`node:`/`bun:`/`jsr:`/`https:` are built-in exclusions |
| [biomejs.dev/linter/rules/no-unresolved-imports](https://biomejs.dev/linter/rules/no-unresolved-imports/) | Primary — Biome docs | since v2.0.0 | Establishes it checks named-export existence, not path resolution |
| [biomejs.dev/linter/rules/no-private-imports](https://biomejs.dev/linter/rules/no-private-imports/) | Primary — Biome docs | current | Confirms it's JSDoc-visibility-based, not workspace-boundary-based |
| [biomejs.dev/linter/domains](https://biomejs.dev/linter/domains/) | Primary — Biome docs | current | The `project` domain opt-in mechanism and its rule membership |
| [github.com/biomejs/biome/releases](https://github.com/biomejs/biome/releases) | Primary — release list | v2.5.11, 27 Aug | Current Biome version as of 2 days before this research |
| [raw.githubusercontent.com/import-js/eslint-plugin-import/main/package.json](https://raw.githubusercontent.com/import-js/eslint-plugin-import/main/package.json) | Primary — manifest | v2.32.0 | Confirms upstream's current version |
| [github.com/import-js/eslint-plugin-import/tags](https://github.com/import-js/eslint-plugin-import/tags) | Primary — tag list | Jul 2026 | Confirms upstream is not archived, just slower on the features that matter here |
| [github.com/import-js/eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | Primary — README | current | Its own claimed flat-config support, for balance against the fork narrative |
| [github.com/sverweij/dependency-cruiser rules-reference.md](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md) | Primary — docs | current | `no-circular`/`not-to-unresolvable` rule shapes for the CI-only-alternative discussion |
| [github.com/import-js/eslint-import-resolver-typescript](https://github.com/import-js/eslint-import-resolver-typescript) | Primary — README | current | Current `resolver-next` config shape vs legacy `settings` shape |
| [nodejs.org/api/packages.html#self-referencing-a-package-using-its-name](https://nodejs.org/api/packages.html#self-referencing-a-package-using-its-name) | Primary — Node.js docs | current | Confirms `@ocx-sh/catalog/theme` self-import is legitimate, not extraneous |
| [vite.dev/guide/assets.html](https://vite.dev/guide/assets.html) | Primary — Vite docs | current | Confirms `?raw`/`?url`/`?worker` are real, resolvable Vite conventions |

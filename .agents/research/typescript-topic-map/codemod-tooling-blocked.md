---
title: "Deterministic codemod tooling for TypeScript (2026)"
corpus: "grimoire-lore fleet: ocx-catalog, grimoire-indexer, grimoire-vscode, vscode-ocx, setup-ocx, fma, creeptd-ng/web, kate-middlechild"
agent: scout (codemod-tooling)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 24
scope: >
  Covers deterministic, no-human-review-per-site transform tooling for TypeScript/JS:
  ts-morph and the TS-compiler-API path, ast-grep, jscodeshift, ESLint --fix with a
  local fixable rule, oxlint's alpha JS plugins, and Biome --write with GritQL — their
  current versions, TS7/tsgo compatibility, exact command surfaces, and a verification
  rule for proving a transform changed only what it claimed. Does NOT cover rule
  catalogues (see lint-catalogue-sweep.md), general codemod philosophy or Rust-specific
  mechanics (see large-scale-ports/ai-assisted-large-refactors.md, whose findings this
  file applies rather than re-derives), or bundler/build tooling (see build-bundle.md).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [ts-morph: vendors its own compiler, decoupled from the repo's TypeScript](#1-ts-morph-vendors-its-own-compiler-decoupled-from-the-repos-typescript)
   2. [ast-grep: the syntax-only default](#2-ast-grep-the-syntax-only-default)
   3. [jscodeshift: alive, not a training-data trap](#3-jscodeshift-alive-not-a-training-data-trap)
   4. [ESLint --fix with a local fixable rule](#4-eslint---fix-with-a-local-fixable-rule)
   5. [oxlint's alpha JS plugins](#5-oxlints-alpha-js-plugins)
   6. [Biome --write with a GritQL plugin, for kate-middlechild](#6-biome---write-with-a-gritql-plugin-for-kate-middlechild)
   7. [The TS7 API gap and the @typescript/typescript6 shim](#7-the-ts7-api-gap-and-the-typescripttypescript6-shim)
   8. [The fleet's own site counts, and where N falls](#8-the-fleets-own-site-counts-and-where-n-falls)
   9. [When a codemod is correct at all: the mock&lt;T&gt; case](#9-when-a-codemod-is-correct-at-all-the-mockt-case)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- **`ts-morph@28.0.0`** (published 2026-04-12, [npm](https://www.npmjs.com/package/ts-morph)) is usable on **all 9 fleet repos today, at that pin, unconditionally** — it vendors its own TypeScript compiler build inside `@ts-morph/common@0.29.0` and has **no dependency or peerDependency on the host project's `typescript` package at all**; verified by extracting the published tarball and finding `dist/typescript.js` (8.8 MB) with `version = "6.0.2"` baked in.
- ts-morph's own `packages/ts-morph/package.json` and `packages/common/package.json` both pin `"typescript": "6.0.2"` as a **devDependency**, and ts-morph.com's setup docs document no option to inject a different compiler module — the 6.0.2 vendoring is a permanent architectural choice, not a temporary migration gap.
- Because ts-morph never reads the repo's installed `typescript`, the "does it work alongside TS7/`tsgo`" question is moot for ts-morph specifically: it works, but its type answers reflect TS 6.0.2 semantics regardless of what the repo declares — currently harmless since TS 7.0.2 is a same-language Go reimplementation, not a syntax superset.
- The Microsoft-published **`@typescript/typescript6@6.0.2`** alias package (maintained by `typescript-bot`/`jakebailey`/TS-team accounts, [npm](https://www.npmjs.com/package/@typescript/typescript6)) is real and wraps `typescript@^6` under `@typescript/old`, but nothing in this fleet needs it today — no repo has bumped `typescript` past `^6.0.3`, and ts-morph doesn't consult it anyway.
- **`ast-grep`** (CLI package `@ast-grep/cli@0.45.2`, published 2026-08-23, [npm](https://www.npmjs.com/package/@ast-grep/cli)) is the syntax-only default: tree-sitter-backed, needs no `typescript` npm install, supports `language: TypeScript` and `Tsx` natively with YAML `pattern`/`fix` rules, and its `-U/--update-all` plus `--json[=stream|compact]` give a machine-checkable match count separate from the applied diff.
- **`jscodeshift@17.4.0`** (published 2026-07-15, Meta/`facebook` org, [changelog](https://github.com/facebook/jscodeshift/blob/main/CHANGELOG.md)) is **actively maintained, not the training-data trap the brief hypothesized** — it shipped a TS-tagged-template parser fix in 17.3.0 and an iterator feature in 17.4.0, with commits as recent as 2026-08-28 (the day before this research). Built-in `--parser=ts|tsx` and recast-based format-preserving codegen remain intact.
- **`oxlint`'s JS plugin system** (`oxlint@1.80.0`, published 2026-08-24, [npm](https://www.npmjs.com/package/oxlint)) is explicitly **alpha** per its own docs ("JS plugins are currently in alpha, and remain under active development") and **does not yet support type-aware rules** — a hard blocker for any fixer touching the fleet's one type-aware-lint repo.
- **Biome's GritQL plugin system** (`@biomejs/biome@2.5.11`, published 2026-08-27, [GitHub releases](https://github.com/biomejs/biome/releases)) is the only deterministic option that needs **no `typescript` npm dependency at all** — relevant because `kate-middlechild` is the one fleet repo with none. `biome lint --write` applies only `fix_kind: "safe"` GritQL rewrites; unsafe ones need `--write --unsafe`.
- TypeScript's own programmatic-API gap remains open: `typescript@7.0.2` is still `latest` on npm and `7.1.0` has **not** shipped stable as of 2026-08-29 — the newest prerelease is `7.1.0-dev.20260829.1`, published the same day this research ran. typescript-eslint's published peer range is `>=4.8.4 <6.1.0` — it excludes not just TS7 but TS 6.1+ outright.
- A live re-grep of `as unknown as` across the fleet found **163 sites** (grimoire-vscode 79, ocx-catalog 56, creeptd-ng/web 10, fma 7, vscode-ocx 5, grimoire-indexer 5, kate-middlechild 1) — close to but not identical to the 164 cited elsewhere in this corpus, consistent with `type-testing.md`'s own note that the count drifts and should be re-verified before publication.
- The same grep shows a **clean gap in the fleet's measured site-count distribution**: nothing lands between 10 (creeptd-ng/web) and 46 (the single worst file, `grimoire-vscode/src/test/extension.test.ts`) — every real task this fleet has today falls unambiguously on one side of a threshold set inside that gap.
- **Decision: N = 12.** One above the largest sub-threshold cluster observed (10). Below N, a direct agent edit costs less than writing and verifying a rule file; at or above N, every fleet task observed today already clusters at 46+, so the threshold never has to arbitrate a genuinely close call.
- Isolated-declarations annotation work is a second, independent data point for the same conclusion: 88 exported-without-explicit-return-type sites in `ocx-catalog`, 89 in `grimoire-indexer` — both well above N=12, and both require **type inference**, not syntax matching, which routes them to ts-morph rather than ast-grep.
- The `as unknown as T` → `mock<T>()`/`fake<T>()` swap that motivated the 164-site framing is **not a safe bare codemod** even at that volume: `type-testing.md` establishes the fix requires per-site knowledge of which interface members the test actually touches, so a blind ast-grep rewrite that drops all field overrides compiles clean but silently changes what the mock returns.
- Verification rule: neither `git diff --stat` nor a clean `tsc`/`biome check` proves a transform touched only its claimed sites — both are satisfiable by an over-broad match. The check that isn't is a **match-count reconciliation**: an independent `grep -c` of the target pattern taken before the run must equal the tool's own reported match/fix count (ast-grep's `--json=compact | jq length`, jscodeshift's file-transformed summary), and the same grep after the run must return zero or a named residual.
- ESLint `10.9.1` (`eslint@9.x` in two SPAs) custom rules remain the right tool specifically when a fixed pattern must **never reappear**, not just be cleaned up once — a one-shot ast-grep run and a standing `meta.fixable` ESLint rule solve different problems and the choice doesn't depend on N.

## Findings

### 1. ts-morph: vendors its own compiler, decoupled from the repo's TypeScript

`ts-morph@28.0.0` was published 2026-04-12 ([npm](https://www.npmjs.com/package/ts-morph)), depending on `@ts-morph/common: ~0.29.0` and `code-block-writer: ^13.0.3`. `@ts-morph/common@0.29.0` itself lists exactly three dependencies — `minimatch`, `path-browserify`, `tinyglobby` — and **no `typescript` entry anywhere in its manifest**, dependency or peer ([registry metadata](https://www.npmjs.com/package/@ts-morph/common)).

Downloading and extracting the published `@ts-morph/common-0.29.0.tgz` tarball (2.1 MB compressed) shows why: it ships `dist/typescript.js` at 8.8 MB and `lib/typescript.d.ts` at 576 KB — a full vendored build of the TypeScript compiler, with `version = "6.0.2"` and `versionMajorMinor = "6.0"` baked into the bundled source. This matches the source repo exactly: both `packages/ts-morph/package.json` and `packages/common/package.json` on `dsherret/ts-morph` pin `"typescript": "6.0.2"` as a **devDependency** ([GitHub, fetched 2026-08-29](https://github.com/dsherret/ts-morph)).

ts-morph.com's setup docs, fetched directly, describe `compilerOptions`, `tsConfigFilePath`, `resolutionHost`, and `libFolderPath` as `Project` constructor options but **document no way to substitute a different TypeScript module** ([ts-morph.com/setup](https://ts-morph.com/setup/)) — confirmed by `ts-morph-common.d.ts`'s single fixed `import { ts } from "./typescript"`. This is a permanent architectural decoupling, not a stopgap: ts-morph does not care what `typescript` version (if any) is declared in the consuming repo's `package.json`.

Practical consequence for this fleet: `ts-morph@28.0.0` is installable and fully functional in **all nine repos today**, including the ones on `^5.7.x`/`^5.9.3` and the ones with no plan to touch `typescript` at all — because it never reads that dependency. The only way this stops being true is if a repo starts writing syntax TS 6.0.2 can't parse; TS 7.0.2 is documented as a same-language Go reimplementation for speed, not a syntax superset, so that risk is currently theoretical, not active.

`dsherret/ts-morph`'s repo was pushed 2026-08-28 — the day before this research — confirming the project is actively maintained, separate from the vendored-compiler-version question.

### 2. ast-grep: the syntax-only default

`@ast-grep/cli@0.45.2` was published 2026-08-23 ([npm](https://www.npmjs.com/package/@ast-grep/cli); [GitHub release](https://github.com/ast-grep/ast-grep/releases)), six days before this research. It needs no `typescript` npm install — it is a standalone Rust binary with bundled tree-sitter grammars.

Language support, fetched from ast-grep's own reference: `TypeScript` (aliases `ts`/`typescript`; extensions `.ts`, `.cts`, `.mts`) and `Tsx` (alias `tsx`; extension `.tsx`) are both first-class, with extension-to-language mapping overridable via `languageGlobs` ([ast-grep.github.io/reference/languages](https://ast-grep.github.io/reference/languages.html)).

Rule files are YAML with `id`, `language`, `rule` (required — atomic matchers `pattern`/`kind`/`regex`/`nthChild`/`range`; relational `inside`/`has`/`precedes`/`follows`; composite `all`/`any`/`not`/`matches`), and `fix` templated on captured metavariables:

```yaml
id: no-console-log
language: typescript
rule:
  pattern: console.log($MESSAGE)
fix: console.debug($MESSAGE)
```
([ast-grep.github.io/reference/rule](https://ast-grep.github.io/reference/rule.html))

The verification-relevant CLI surface, from `ast-grep run`/`ast-grep scan` references:

```bash
# preview a rewrite, no changes written
ast-grep run -p 'foo()' -r 'bar()' -l typescript

# apply, machine-readable per-match output for reconciliation
ast-grep run -p 'foo()' -r 'bar()' -l typescript -U --json=compact

# project-wide, config-driven
ast-grep scan --update-all --config sgconfig.yml
ast-grep scan --json=stream --rule check.yml src/
```
`-U/--update-all` applies without confirmation; `--json[=pretty|stream|compact]` emits one machine-readable record per match, which is the artifact a reviewer diffs against an independent pre-run occurrence count ([ast-grep.github.io/reference/cli/run](https://ast-grep.github.io/reference/cli/run.html), [.../cli/scan](https://ast-grep.github.io/reference/cli/scan.html)).

### 3. jscodeshift: alive, not a training-data trap

The brief flagged jscodeshift as a candidate for the same "confidently recommend a dead tool" failure class as `tsup`/`ts-prune`. The evidence does not support that: `jscodeshift@17.4.0` was published 2026-07-15, and the `facebook/jscodeshift` GitHub repo is not archived, was pushed 2026-08-28 (the day before this research), and carries 151 open issues — signals of an active, if not fast-moving, project ([GitHub repo metadata, fetched 2026-08-29](https://github.com/facebook/jscodeshift)).

The changelog shows substantive, not just dependency-bump, releases: 17.3.0 "Bumps recast to allow parsing of Typescript type arguments on tagged template literals," 17.4.0 adds an iterator implementation to `Collection` ([CHANGELOG.md](https://github.com/facebook/jscodeshift/blob/main/CHANGELOG.md)). The README confirms built-in TS support via `--parser=babel|babylon|flow|ts|tsx` (default `babel`), recast as the AST-to-AST engine specifically chosen to preserve original code style, and a `--dry`/`-d` flag plus `-p`/`--print` for previewing a transform without writing ([README.md](https://github.com/facebook/jscodeshift)).

The caveat that does hold: a jscodeshift transform is an arbitrary `.js` file calling an imperative API, not a declarative pattern/fix pair — harder for a reviewer to audit at a glance than an ast-grep YAML rule, and its own summary output ("N files transformed / M unmodified") is coarser than ast-grep's per-match JSON. That is a reason to prefer ast-grep as the default and keep jscodeshift as the escape hatch for transforms ast-grep's pattern language can't express (e.g., anything needing jscodeshift's full recast/Collection API), not a reason to avoid jscodeshift as abandoned.

### 4. ESLint --fix with a local fixable rule

`eslint@10.9.1` is current ([npm](https://www.npmjs.com/package/eslint)); the fleet runs `^10.9.0`/`^10.8.0`/`^10.5.0` in six repos and `^9.x` in the two SPAs. A custom rule declares itself fixable via `meta.fixable: "code"` (or `"whitespace"`), and supplies a `fix(fixer)` callback inside `context.report()` returning one fixing object, an array, or a generator. The fixer object exposes `insertTextAfter`/`insertTextBefore`/`remove`/`replaceText` and their `*Range` variants ([eslint.org/docs/latest/extend/custom-rules](https://eslint.org/docs/latest/extend/custom-rules)):

```js
context.report({
  node,
  message: "use X instead of Y",
  fix(fixer) {
    return fixer.replaceText(node, "X");
  },
});
```

`eslint --fix` then applies every reported fix in one pass, repo-wide, on every future violation — not just today's. This is the structural difference from ast-grep/jscodeshift: those are one-shot transforms; a fixable ESLint rule wired into the flat config's `rules` block and enforced in CI (`eslint .` without `--fix` as the gate) is a standing prevention mechanism. The two are complementary, not competing defaults.

### 5. oxlint's alpha JS plugins

`oxlint@1.80.0` was published 2026-08-24, five days before this research, following `1.79.0` on 2026-08-18 — a roughly weekly release cadence ([npm](https://www.npmjs.com/package/oxlint)). Its own docs state plainly: **"JS plugins are currently in alpha, and remain under active development."** ([oxc.rs/docs/guide/usage/linter/js-plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html))

The plugin shape is ESLint-compatible:

```js
const rule = {
  create(context) {
    return {
      CallExpression(node) { context.report({ message: "...", node }); },
    };
  },
};
export default { meta: { name: "plugin-name" }, rules: { "rule-name": rule } };
```
registered via `.oxlintrc.json`'s `jsPlugins` array (or `defineConfig({ jsPlugins: [...] })` in `oxlint.config.ts`), applied with `oxlint --fix` ([oxc.rs/docs/guide/usage/linter/config](https://oxc.rs/docs/guide/usage/linter/config.html), [.../writing-js-plugins](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html)).

The page's own "API Support" list confirms `Fixes` are implemented alongside AST traversal, selectors, scope analysis, and inline-disable directives. Its "Not supported yet" list is the load-bearing fact for this fleet: **"Lint rules that rely on TypeScript type-awareness"** and **"Custom file formats and parsers (e.g. Svelte, Vue, Angular)."** ([js-plugins.html](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)) The first blocks any fixer for the fleet's one type-aware-lint repo; the second blocks `creeptd-ng/web`'s `.vue` files outright.

### 6. Biome --write with a GritQL plugin, for kate-middlechild

`@biomejs/biome@2.5.11` published 2026-08-27 ([GitHub releases](https://github.com/biomejs/biome/releases)); the homepage banner independently confirms "v2.5" as current ([biomejs.dev](https://biomejs.dev/)). This is the only deterministic tool in this survey that needs **no `typescript` npm dependency at all** — relevant because `kate-middlechild` has none declared anywhere in its manifest.

Biome's linter supports GritQL plugins directly: "Biome Linter supports GritQL plugins. Plugins can match specific code patterns, report customized diagnostics, and suggest fixable rewrites." A `.grit` file, referenced from `biome.json`'s `"plugins"` array:

```grit
`$fn($args)` where {
    $fn <: `Object.assign`,
    register_diagnostic(span=$fn, message="Prefer object spread instead of `Object.assign()`")
}
```
([biomejs.dev/linter/plugins](https://biomejs.dev/linter/plugins))

GritQL itself is a structural pattern language — backtick code snippets, `$variable` captures, `where`/`<:` conditions — and supports a `language js(typescript,jsx)` declaration to target TS/TSX syntax specifically without needing the compiler ([biomejs.dev/reference/gritql](https://biomejs.dev/reference/gritql)). Fix application is explicit and safety-gated: **"With `--write`, Biome applies plugin rewrites marked with `fix_kind = 'safe'`."** An omitted `fix_kind` defaults to unsafe, requiring `--write --unsafe`. Neither docs page carries a maturity label (stable/experimental) for the plugin system itself — see [Contested/evolving](#contested--evolving).

Because `kate-middlechild` already runs Biome for its 526-rule linter, a GritQL plugin reuses an already-present tool; adding ast-grep there would be a net-new devDependency for a repo whose whole premise (per project context) is having none but Biome.

### 7. The TS7 API gap and the @typescript/typescript6 shim

`typescript@7.0.2` remains npm's `latest` dist-tag. `7.1.0` has not shipped stable as of 2026-08-29: the `next` tag points to `7.1.0-dev.20260829.1`, a prerelease published the same day as this research, continuing an unbroken chain of near-daily dev builds back to `7.1.0-dev.20260708.3` ([npm registry, queried 2026-08-29](https://www.npmjs.com/package/typescript)). Microsoft's own devblog on the native/Go rewrite states the API work is foundational, not finished: **"we are still in the early days of API design here"**, with `--build`, declaration emit, and several language-service features (auto-imports, find-all-references, rename) explicitly listed as not yet present in the native pipeline ([devblogs.microsoft.com/typescript/announcing-typescript-native-previews](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/)).

Confirming Wave 1's finding from the currently-published package: `typescript-eslint@8.68.0`'s peer range is `"typescript": ">=4.8.4 <6.1.0"` ([registry metadata, queried 2026-08-29](https://www.npmjs.com/package/typescript-eslint)) — it excludes not only TS7 but TS 6.1 and above outright, which is a tighter ceiling than "no TS7 support" alone would suggest.

`@typescript/typescript6@6.0.2` is a real, currently-maintained Microsoft package: its maintainer list includes `typescript-bot`, `jakebailey`, `andrewbranch`, and `microsoft1es` — TypeScript-team accounts, not a community shim — and its single dependency is `"@typescript/old": "npm:typescript@^6"`, i.e. it re-exports TS 6.x under a stable import path (`tsc6` bin included) so a project can keep TS6 addressable after `typescript` itself points at 7.x ([npm registry, queried 2026-08-29](https://www.npmjs.com/package/@typescript/typescript6)). Nothing in this fleet needs it today (§8), and ts-morph in particular never needs it (§1) — but it is the correct mechanism the day a repo's `typescript` dependency itself becomes `^7.x` while some other devDependency (a custom script calling `ts.createProgram`, most plausibly) still requires 6.x.

### 8. The fleet's own site counts, and where N falls

A live re-grep (2026-08-29) of `as unknown as` across every fleet repo:

| repo | sites |
|---|---|
| grimoire-vscode | 79 (46 in `src/test/extension.test.ts` alone) |
| ocx-catalog | 56 |
| creeptd-ng/web | 10 |
| fma | 7 |
| vscode-ocx | 5 |
| grimoire-indexer | 5 |
| kate-middlechild | 1 |
| setup-ocx | 0 |
| **total** | **163** |

163 is close to but not identical to the 164 figure this brief and `type-testing.md` both cite — `type-testing.md` itself flags this as a drifting number needing re-verification before it goes into a published rule, and this pass reproduces that instability rather than resolving it.

The distribution has a clean gap: nothing observed between 10 and 46. Every real per-repo task this fleet has today already sits unambiguously on one side of any threshold placed inside that gap.

A second, independent measurement — exported symbols lacking an explicit return type, the class of site `isolatedDeclarations` would flag — found 88 in `ocx-catalog/src` and 89 in `grimoire-indexer/src` (rough grep for `^export (async )?function` / `^export const .* =>`; an exact count needs `tsc --noEmit` with the flag enabled, per the existing normative rule in `build-bundle.md`). Both numbers land in the same above-gap cluster.

**N = 12**, chosen as one above the largest sub-threshold cluster (creeptd-ng/web's 10), not a round number and not the midpoint of the gap. Rationale: below 12 sites, writing a rule file, testing it, and reconciling its match count against an independent grep costs more reviewer and author attention than reading 12 diffs directly; at or above 12, this fleet's actual tasks already cluster at 46+, so the exact placement inside the 11–45 gap has never yet had to arbitrate a real close call — the number only needs to separate the two clusters correctly, which any value from 11 to 45 would do equally well; 12 is the smallest such value, erring toward tool use.

### 9. When a codemod is correct at all: the mock&lt;T&gt; case

`type-testing.md` (this corpus) already worked out the replacement for the 164/163 `as unknown as T` casts: `vitest-mock-extended`'s `mock<T>()` or `@golevelup/ts-vitest`'s `createMock<T>()`, both Proxy-backed doubles that stub every unused interface member automatically. It also establishes why `satisfies` alone can't do this: a partial fake for a 24-member interface like `vscode.WebviewPanel` can't satisfy a type requiring every member present.

That same finding is the sharpest available answer to this brief's "when is a codemod correct at all" question. The transform looks like a single mechanical pattern — replace `X as unknown as T` with `mock<T>(X)` — and at 163–164 sites it is well above N=12, the volume where this document otherwise says "use a tool, not an agent." But the fix is not actually syntax-preserving: each `fakePanel()`/`fakeView()`-style helper in `grimoire-vscode/src/test/extension.test.ts` already builds a literal with only the members that specific test touches, and swapping in `mock<T>()` with **zero** overrides silently changes what un-stubbed members return (an auto-generated spy, not the hand-picked value the original literal supplied) unless the transform preserves every field the original literal set as an explicit override.

This is exactly the class of transform `ai-assisted-large-refactors.md` (this corpus) already names: the mechanical part — find the cast, wrap the call — is a legitimate ast-grep or jscodeshift job; the correctness-determining part — which members must be carried forward as overrides — requires reading each site's usage, which a blind pattern/fix pair cannot do safely. The right decomposition is a codemod that performs the syntactic wrap and flags (rather than silently drops) every literal field it can't prove is redundant with the interface default, leaving those flagged sites for a human-or-agent judgment pass — not a single unsupervised `ast-grep scan -U` across all 163 sites, and not 163 individual from-scratch agent edits either.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt / keep / drop / watch | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| **ast-grep** (`@ast-grep/cli`) | tree-sitter structural search/replace, YAML rules, TS+TSX native | 0.45.2, 2026-08-23 | stable, active | **adopt** — default for any syntax-only fix at N≥12 sites | no `typescript` install needed, works in all 9 repos incl. kate-middlechild, `--json` gives a reconcilable match count | ad hoc `sed`/regex multi-file edits |
| **ts-morph** | TypeScript compiler-API wrapper for type-aware AST edits | 28.0.0, 2026-04-12 (vendors TS 6.0.2 via `@ts-morph/common@0.29.0`) | stable, active (repo pushed 2026-08-28) | **adopt** — for transforms needing resolved-type info (isolatedDeclarations annotations) | fully self-contained, no peer on repo's `typescript`, usable on all 9 repos at pin `^28.0.0` today | hand-written scripts against `ts.createProgram` directly |
| **jscodeshift** | imperative JS/TS codemod runner on recast (format-preserving) | 17.4.0, 2026-07-15 | stable, active (contra brief's hypothesis) | **watch/keep as escape hatch** — reach for it only when ast-grep's pattern language can't express the transform | harder to audit than a declarative rule; but genuinely maintained, not dead | one-off custom transform scripts written from scratch |
| **ESLint `--fix` + local rule** | fixable lint rule enforced continuously | eslint 10.9.1, 2026-08-24 | stable | **adopt** — for any pattern that must never reappear, independent of N | one-shot tools clean today's sites; a standing rule prevents tomorrow's | manual "grep for the bad pattern in review" habit |
| **oxlint JS plugins** | ESLint-compatible JS-authored rules with fixers, on the Rust linter | oxlint 1.80.0, 2026-08-24 | **alpha**, weekly churn | **watch** — do not wire into an unreviewed pipeline yet | own docs: no type-aware rules, no Vue/custom-parser support; blocks this fleet's exact needs | nothing yet — not a replacement for anything in production use |
| **Biome `--write` + GritQL plugin** | structural pattern/fix rules on Biome's Rust parser, no TS install needed | biome 2.5.11, 2026-08-27 (plugin system itself undated/unlabeled for maturity) | core stable; plugin maturity **undocumented** | **adopt for kate-middlechild specifically** | only tool here needing zero `typescript` dependency; repo already runs Biome | ast-grep, for the one repo where adding a new devDependency is the worse option |
| **`@typescript/typescript6`** | Microsoft-maintained alias keeping TS 6.x importable under a stable path | 6.0.2 | stable, actively maintained by TS team | **watch** — not needed by any fleet repo today | no repo has bumped `typescript` past `^6.0.3`; ts-morph doesn't consult it either | future need only, once a repo's primary `typescript` dep becomes `^7.x` |

## Normative guidance candidates

1. **Rule**: Default to ast-grep for any TS/TSX mechanical rewrite (rename, signature-preserving call rewrite, banned-API replacement) that needs no resolved-type information and touches ≥12 sites; below 12, a direct agent edit is cheaper than authoring and verifying a rule.
   *Rationale*: the fleet's own site-count distribution has a gap between 10 and 46 — every real task already falls unambiguously on one side of N=12.
   *Verify*: `ast-grep run -p '<pattern>' -l typescript --json=compact | jq length` reconciled against `grep -rc '<literal>' --include='*.ts' --include='*.tsx'` taken before the run.
2. **Rule**: Reach for ts-morph, not ast-grep, exactly when the transform's correct output depends on resolved type information (e.g. inferring a return type for `isolatedDeclarations`). Pin `ts-morph@^28.0.0`.
   *Rationale*: it vendors TypeScript 6.0.2 internally and has no peerDependency on the host repo's own `typescript` version, so it runs identically on all 9 fleet repos regardless of what each declares.
   *Verify*: `npm ls @ts-morph/common` reports `0.29.x`; `npm explain typescript` in the target repo shows no path through `ts-morph`.
3. **Rule**: For `kate-middlechild`, prefer a Biome GritQL plugin over adding ast-grep as a new devDependency whenever the fix is expressible in GritQL; escalate to ast-grep only when it isn't.
   *Rationale*: Biome is the one tool here needing zero `typescript` npm dependency, and the repo already runs it.
   *Verify*: the `.grit` file declares `fix_kind` explicitly (`"safe"` or `"unsafe"`, never left to the unsafe default); `biome lint --write` (or `--write --unsafe`) applies it cleanly.
4. **Rule**: Never accept `git diff --stat` plus a clean `tsc --noEmit`/`biome check` as proof a codemod touched only its claimed sites.
   *Rationale*: both are satisfiable by an over-broad match that happens to still compile.
   *Verify*: state three numbers in the PR — pre-run `grep -c` of the target pattern, the tool's own reported match/fix count, and post-run `grep -c` of the same pattern (expect 0 or a named residual) — all three must reconcile.
5. **Rule**: A fixable pattern that must never reappear belongs in an ESLint (or Biome/oxlint, once type-aware) rule with a fixer, regardless of today's site count.
   *Rationale*: a one-shot codemod cleans today's instances but enforces nothing about tomorrow's.
   *Verify*: the rule is listed at `"error"` in `eslint.config.js`'s `rules` block and CI runs `eslint .` (without `--fix`) as a gate.
6. **Rule**: A transform whose correctness depends on per-site *usage*, not per-site *syntax* (the `as unknown as T` → `mock<T>()` swap is the fleet's own example), is never a bare `ast-grep scan -U`/`jscodeshift -t` run across every site — the mechanical wrap is a codemod job, but every site where the tool can't prove the original literal's fields are redundant with the interface default must be flagged for a judgment pass, not silently transformed.
   *Rationale*: `type-testing.md` shows `mock<T>()` with dropped overrides compiles but changes what un-stubbed members return.
   *Verify*: every touched test still passes with its original assertions unmodified; any assertion loosened to accommodate an under-specified mock is treated as a defect, per the test-weakening control in `large-scale-ports/ai-assisted-large-refactors.md`.
7. **Rule**: Before adopting oxlint JS plugins or a Biome GritQL plugin as the fixer for a rule, confirm the rule needs no resolved-type information.
   *Rationale*: oxlint's own docs list type-aware rules as explicitly unsupported for JS plugins as of 2026-08-29; Biome's plugin-system maturity is undocumented on its own pages.
   *Verify*: read the tool's current "not yet supported" list immediately before writing the plugin, not after debugging a wrong fix.
8. **Rule**: Do not add `@typescript/typescript6` to any fleet repo today.
   *Rationale*: no repo has bumped `typescript` past `^6.0.3`, and ts-morph — the tool most likely to need it — never consults the host repo's `typescript` version at all.
   *Verify*: `grep '"typescript"' package.json` across the fleet shows no `^7` before this package is considered.

## AI-agent angle

- **Recommending jscodeshift as dead.** Its 2015-era Facebook-codemod fame plus the brief's own framing invites an agent to skip it as a training-data trap. It shipped `17.4.0` on 2026-07-15 with a real feature, not a dependency bump. *Check*: `npm view jscodeshift time --json | tail -3` (or the GitHub `pushed_at` field) before writing off any tool as abandoned — a stale-sounding name is not evidence of a stale registry entry.
- **Assuming ts-morph type-checks against the repo's own TS7/`tsgo` semantics.** An agent may claim ts-morph "will pick up your tsconfig's TS7 behavior" because it reads `tsConfigFilePath`. It doesn't touch the compiler version at all — it always parses with its vendored TS 6.0.2. *Check*: `npm ls @ts-morph/common` for the vendored version, or grep `@ts-morph/common`'s own `package.json` for a (nonexistent) `typescript` dependency, before trusting any claim about ts-morph reflecting a specific TS version's semantics.
- **Reaching for `sed`/regex instead of ast-grep for a TS-wide rename**, presented as equivalent. Silently matches identifiers inside string literals and comments — the same failure mode `large-scale-ports/ai-assisted-large-refactors.md` already names for Rust, unchanged for TypeScript. *Check*: grep the diff for hits inside `//`/`/* */` comments or string literals that shouldn't have moved; require the agent name which structural tool (ast-grep) it used.
- **Claiming an `oxlint --fix` JS-plugin rule is safe for a type-aware fix.** Oxlint's own docs list "Lint rules that rely on TypeScript type-awareness" as **not supported yet** for JS plugins. *Check*: read `oxc.rs/docs/guide/usage/linter/js-plugins.html`'s "Not supported yet" list before trusting a type-aware oxlint-plugin claim, not after a wrong fix ships.
- **Treating `git diff --stat` + a green `tsc`/`biome check` as proof a codemod changed only what it claimed.** Both are satisfiable by an over-broad match that happens to still compile. *Check*: require the three-number reconciliation (rule 4 above) — pre-count, tool-reported count, post-count — as a separate, explicit artifact, not folded into "the diff looks right and the build is green."
- **Treating the 164/163-site `as unknown as T` → `mock<T>()` swap as a pure syntactic codemod because the volume "obviously" calls for a tool.** The volume is real, but the correctness of each swap depends on which interface members that specific test touches — a fact ast-grep's pattern/fix pair cannot see. *Check*: sample several transformed sites and confirm each `mock<T>()` call still carries the same field overrides the original hand-built literal set; a `mock<T>()` with fewer overrides than the original literal had explicit fields is a silent behavior change, not a clean refactor.

## Contested / evolving

- **ast-grep vs. jscodeshift as the JS/TS codemod default.** ast-grep's declarative YAML is easier to audit before running (a reviewer can read the whole rule); jscodeshift's imperative transform can express things a pattern/fix pair can't, and this pass found it more actively maintained than its reputation suggests. Practice is trending toward declarative tools (ast-grep, Biome GritQL) as the default across the wider industry, per `large-scale-ports/ai-assisted-large-refactors.md`'s already-established synthesis — this file's fleet-specific contribution is confirming jscodeshift hasn't gone stale as the fallback.
- **Whether ts-morph's compiler-vendoring is a long-term liability.** No fleet repo has hit the seam yet (none run TS7 as primary), and no override mechanism was found in its current docs — this reads as a stable, deliberate design point, not a transitional one, but there is no successor tool in this survey built against the Go/native TS7 pipeline; that gap itself is worth re-checking whenever `typescript@7.1.0` actually ships stable.
- **oxlint JS plugins' pace.** `1.79.0` → `1.80.0` in six days, still explicitly alpha and "not subject to semantic versioning" per its own config docs — too early to standardize on for fixers, but moving fast enough that "watch" should mean an active recheck, not a one-time no.
- **Biome GritQL plugin maturity.** No stable/experimental/beta label was found on either `biomejs.dev/linter/plugins` or `biomejs.dev/reference/gritql`, in contrast to Biome's core linter/formatter, which is unambiguously stable at 2.5.11. Treat the plugin system's robustness as unverified until a maturity statement is published, even though it's the only viable option for `kate-middlechild`.
- **When TS 7.1 ships with a stable programmatic API.** As of 2026-08-29 it remains a daily dev prerelease (`7.1.0-dev.20260829.1`) with no stable tag — Wave 1's "no stable API until 7.1" holds, unresolved, with no announced date found in Microsoft's own devblog post.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Does TypeScript 7.1 ship a stable programmatic API, and do ts-morph/typescript-eslint adopt it? | unblocks type-aware tooling on the Go compiler fleet-wide | devblogs.microsoft.com, npm dist-tags | high | high |
| Does typescript-eslint widen its peer range past `<6.1.0` before this fleet needs to move past `^6.0.3`? | currently blocks even a TS 6.1 bump, not just TS7 | npm registry | high | high |
| Should ast-grep become a devDependency in all 9 repos, or stay an ad hoc `npx` invocation? | affects reproducibility of any future N≥12 fix | this file, §2/§8 | med | low |
| Does oxlint's JS-plugin alpha reach a point where it can replace a local ESLint fixable rule? | would consolidate lint+fix tooling onto one Rust binary | oxc.rs docs | med | high |
| Does oxlint ever add type-aware JS-plugin support? | would unblock the fleet's one type-aware-lint repo from oxlint fixers | oxc.rs docs | high | med |
| What is the fleet's true current `as unknown as` count, and how fast does it drift per PR? | 163 here vs. 164/79 elsewhere — the number moves | live grep, type-testing.md | med | high |
| Should the 88+89 `isolatedDeclarations` annotation sites be done via a ts-morph script or per-file agent passes? | needs type inference, not syntax matching — routes away from ast-grep | this file, §1/§8; build-bundle.md | high | low |
| Does `@typescript/typescript6` see real fleet use once any repo's `typescript` dep becomes `^7.x`? | currently inert, becomes load-bearing the day that happens | this file, §7 | low today | high once triggered |
| Does Biome's GritQL plugin system publish a documented maturity/version status? | currently unlabeled, unlike Biome core | biomejs.dev | med | med |
| Does jscodeshift's `--parser=ts` track new TS syntax as fast as `typescript` itself releases? | determines how long it stays a safe escape hatch | github.com/facebook/jscodeshift | low | med |
| Does the Vite 6→8 config-key rename interact with any codemod-tool choice, or stay a manual read-and-fix? | cross-references build-bundle.md's manualChunks/renamed-keys finding | build-bundle.md | low | low |
| Where should a fleet-shared ESLint fixable rule live — a repo-local plugin or a shared internal package? | affects how "rule 5" above scales across 9 repos | this file, §4 | med | low |
| Does ast-grep ever gain type-constrained matching, narrowing the gap with ts-morph's use cases? | would shrink the set of transforms that need ts-morph | ast-grep.github.io | med | med |
| Has any fleet task actually crossed N=12 yet, or is the threshold pre-emptive policy? | tests whether the threshold is load-bearing or theoretical | this file, §8 | high | low |
| Does Biome's `526`-rule linter (up from the previously catalogued 441) change which fixes belong to Biome vs. a GritQL plugin for kate-middlechild? | Biome's built-in rule count grew since Wave 1's catalogue pass | biomejs.dev homepage | low | med |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [npmjs.com/package/ts-morph](https://www.npmjs.com/package/ts-morph) | npm registry page/metadata | 28.0.0, 2026-04-12 | primary; current version, dependency graph |
| [npmjs.com/package/@ts-morph/common](https://www.npmjs.com/package/@ts-morph/common) | npm registry page/metadata | 0.29.0 | primary; proves no `typescript` dependency exists, source for the vendored-compiler finding |
| [ts-morph.com/setup](https://ts-morph.com/setup/) | official ts-morph setup docs | current, fetched 2026-08-29 | primary; confirms no compiler-override option is documented |
| [github.com/dsherret/ts-morph](https://github.com/dsherret/ts-morph) | source repo | pushed 2026-08-28 | primary; `package.json` devDependency pins, repo activity |
| [ast-grep.github.io/reference/languages](https://ast-grep.github.io/reference/languages.html) | official ast-grep language reference | current, fetched 2026-08-29 | primary; exact TS/TSX identifiers and extension mapping |
| [ast-grep.github.io/reference/rule](https://ast-grep.github.io/reference/rule.html) | official ast-grep rule-config reference | current, fetched 2026-08-29 | primary; YAML rule/fix syntax |
| [ast-grep.github.io/reference/cli/run](https://ast-grep.github.io/reference/cli/run.html) | official ast-grep CLI reference | current, fetched 2026-08-29 | primary; exact `-U`/`--json` flags for the verification rule |
| [ast-grep.github.io/reference/cli/scan](https://ast-grep.github.io/reference/cli/scan.html) | official ast-grep CLI reference | current, fetched 2026-08-29 | primary; project-wide scan/fix flags |
| [npmjs.com/package/@ast-grep/cli](https://www.npmjs.com/package/@ast-grep/cli) | npm registry page | 0.45.2, 2026-08-23 | primary; current version |
| [github.com/facebook/jscodeshift](https://github.com/facebook/jscodeshift) | source repo, README | pushed 2026-08-28 | primary; maintenance status, `--parser` flags, recast-based design |
| [github.com/facebook/jscodeshift/blob/main/CHANGELOG.md](https://github.com/facebook/jscodeshift/blob/main/CHANGELOG.md) | official changelog | through 17.4.0, 2026-07-15 | primary; substantive (not just dependency-bump) recent releases |
| [npmjs.com/package/jscodeshift](https://www.npmjs.com/package/jscodeshift) | npm registry page | 17.4.0, 2026-07-15 | primary; current version and publish date |
| [eslint.org/docs/latest/extend/custom-rules](https://eslint.org/docs/latest/extend/custom-rules) | official ESLint custom-rules docs | current, fetched 2026-08-29 | primary; `meta.fixable` and fixer API |
| [npmjs.com/package/eslint](https://www.npmjs.com/package/eslint) | npm registry page | 10.9.1, 2026-08-24 | primary; current version |
| [oxc.rs/docs/guide/usage/linter/js-plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) | official oxlint JS-plugin docs | current, fetched 2026-08-29 | primary; explicit alpha status, API-support/not-yet-supported lists |
| [oxc.rs/docs/guide/usage/linter/writing-js-plugins](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html) | official oxlint JS-plugin authoring guide | current, fetched 2026-08-29 | primary; exact plugin/rule API shape |
| [oxc.rs/docs/guide/usage/linter/config](https://oxc.rs/docs/guide/usage/linter/config.html) | official oxlint config docs | current, fetched 2026-08-29 | primary; `jsPlugins` config and `--fix` CLI usage |
| [npmjs.com/package/oxlint](https://www.npmjs.com/package/oxlint) | npm registry page | 1.80.0, 2026-08-24 | primary; current version and release cadence |
| [biomejs.dev/linter/plugins](https://biomejs.dev/linter/plugins) | official Biome plugin docs | current, fetched 2026-08-29 | primary; GritQL plugin syntax, `--write`/`fix_kind` semantics |
| [biomejs.dev/reference/gritql](https://biomejs.dev/reference/gritql) | official GritQL reference | current, fetched 2026-08-29 | primary; GritQL pattern syntax and language targeting |
| [github.com/biomejs/biome/releases](https://github.com/biomejs/biome/releases) | official release list | 2.5.11, 2026-08-27 | primary; current version and date |
| [npmjs.com/package/typescript](https://www.npmjs.com/package/typescript) | npm registry page/dist-tags | 7.0.2 latest; 7.1.0-dev.20260829.1 next | primary; proves TS 7.1 has not shipped stable as of 2026-08-29 |
| [npmjs.com/package/@typescript/typescript6](https://www.npmjs.com/package/@typescript/typescript6) | npm registry page | 6.0.2 | primary; confirms the alias shim is real and Microsoft-maintained |
| [devblogs.microsoft.com — Announcing TypeScript Native Previews](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/) | official Microsoft devblog | fetched 2026-08-29 | primary; native/Go compiler API status in the team's own words |

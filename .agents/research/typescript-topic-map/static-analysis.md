---
title: Static Analysis and Code-Health Tools for TypeScript
corpus: static-analysis (non-linter whole-program tools) for the TypeScript quality rule set
agent: scout (static-analysis)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 29
scope: |
  Covers whole-program static-analysis and code-health tools that are NOT lint-rule
  catalogues: dead-code/dependency hygiene (knip, ts-prune, depcheck), architecture
  enforcement (madge, dependency-cruiser), heavyweight scanners (SonarJS/SonarQube,
  CodeQL, semgrep), TypeScript compiler performance analysis (tsc tracing, project
  references, the TS 7 Go rewrite's effect on tooling), and build-time bundle/dead-code
  analysis (esbuild, Rolldown, rollup-plugin-visualizer, sonda, source-map-explorer).
  Does NOT re-enumerate ESLint/Biome/oxlint rule catalogues (prior scout's corpus).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [knip — dead code, unused exports/deps/files](#1-knip--dead-code-unused-exportsdepsfiles)
   2. [ts-prune — superseded, archived](#2-ts-prune--superseded-archived)
   3. [madge — circular-dependency visualization](#3-madge--circular-dependency-visualization)
   4. [dependency-cruiser — boundaries and cycles as CI gates](#4-dependency-cruiser--boundaries-and-cycles-as-ci-gates)
   5. [depcheck vs knip — dependency-hygiene hygiene](#5-depcheck-vs-knip--dependency-hygiene)
   6. [SonarJS / SonarQube — ESLint plugin vs full server](#6-sonarjs--sonarqube--eslint-plugin-vs-full-server)
   7. [CodeQL — taint tracking a linter cannot do](#7-codeql--taint-tracking-a-linter-cannot-do)
   8. [semgrep — a security grep, not a quality linter](#8-semgrep--a-security-grep-not-a-quality-linter)
   9. [TypeScript compiler performance analysis](#9-typescript-compiler-performance-analysis)
   10. [Bundle/dead-code analysis at build time](#10-bundledead-code-analysis-at-build-time)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- **knip is the single highest-value addition for this fleet.** It is the only tool that would have caught both measured wave-1 defects (the `export {}` stub entry points and unclear public/internal surface) directly, and it is under active weekly development (v6.33.0, published 2026-08-28) with 40M downloads/month ([knip.dev](https://knip.dev/)).
- **ts-prune and depcheck are both archived and both say so themselves.** ts-prune archived 2025-09-19, "maintenance mode," recommends knip ([GitHub](https://github.com/nadeesha/ts-prune)). depcheck archived, last npm publish 2023-10-17, knip's own docs list it as archived and recommend `knip --dependencies` in its place ([knip.dev/explanations/comparison-and-migration](https://knip.dev/explanations/comparison-and-migration)). Recommending either to an agent fleet in 2026 is a stale-tool mistake, not a judgment call.
- **Neither knip nor depcheck automatically flags a dependency sitting in the wrong `package.json` bucket** (runtime `dependencies` vs. test-only `devDependencies`). The closest automatable check is `knip --production --dependencies`, which excludes devDependencies and test entry points from the reachability graph, so a test-only package listed under `dependencies` shows up as "unused" ([knip.dev/reference/cli](https://knip.dev/reference/cli)) — verified against the fleet's actual defect (`creeptd-ng/web/package.json` lists `@testing-library/vue`, `@vue/test-utils`, `jsdom` under `dependencies`, confirmed by direct read).
- **dependency-cruiser can enforce the fleet's measured boundary violation today.** `kate-middlechild/packages/core/src/map.test.ts` imports `../../web/src/data/ph-regions.geojson.json` — a `core` file reaching into `web` — confirmed by direct grep. A `forbidden` rule with `from: { path: "^packages/core" }, to: { path: "^packages/web" }` and `severity: "error"` fails CI on exactly this pattern.
- **madge is architecturally stale.** Last npm publish 2024-08-05 (8.0.0); GitHub still gets pushes (2026-01-21) but no release has followed in two years, and dependency-cruiser's `no-circular` rule does the same job with CI-native exit codes and a config file, so madge is a visualization nicety, not a gate.
- **SonarJS's ESLint plugin and SonarQube-the-server are two different things an agent can conflate.** `eslint-plugin-sonarjs` (37 rules as a standalone plugin, now folded into the SonarJS monorepo, v4.2.0 published 2026-07-14) is lint-rule-shaped and belongs with the prior scout's catalogue. The full SonarQube/SonarCloud server (analyzer v13.8.0.44569, released 2026-08-28) adds duplication detection, a quality gate, and security hotspots — but PR decoration is a **paid Team-plan feature ($34/mo per seat)**, not in the free Community Build ([sonarsource.com/plans-and-pricing](https://www.sonarsource.com/plans-and-pricing/)). For nine repos with no PR-gate need beyond CI checks already running, standing up a server is not worth it.
- **CodeQL is free for this fleet specifically because the fleet is public.** All three sampled fleet repos (`ocx-sh/catalog`, `grimoire-rs/indexer`, `ocx-sh/setup-ocx`) are public on GitHub (`gh repo view --json isPrivate` confirms `false`), and GitHub Advanced Security/code scanning is free on all public repos, paid per active committer on private ones ([GitHub billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security)). CodeQL 2.26.3 (2026-08-19) shipped new Vue Composition API taint models (`ref`, `reactive`, `computed`, `useRoute()`) directly relevant to `creeptd-ng/web`.
- **semgrep's freely-runnable TypeScript ruleset is small and 100% security-shaped.** Fetching the actual ruleset (`semgrep --config p/typescript`) and counting rules directly yields **74 rules, every one tagged `category: security`** — no general code-quality or correctness rules in the unauthenticated set. It is a narrow XSS/JWT/crypto/injection scanner, not a linter substitute.
- **TypeScript 7.0 (GA 2026-07-08) breaks the trace-analysis toolchain's usual entry point for five of the fleet's six-on-TS6 repos only once they upgrade** — `@typescript/analyze-trace` and `--generateTrace` still work because they trace `tsc` itself, not the programmatic API, but typescript-eslint and ts-morph cannot run on TS 7 until the 7.1 API ships, so any tool depending on those (not analyze-trace) breaks first.
- **Project references (`composite` + `tsc -b`) are worth adopting for the two Astro/Vue/protobuf-heavy repos with the largest LOC (`ocx-catalog` 28.5k, `creeptd-ng/web` 19.7k) but are unlikely to pay off on the four repos under 10k LOC** — the incremental-build win scales with module-graph size, and TS 7's own 8–12x wall-clock speedup on full builds already narrows the case for splitting small repos.
- **Rolldown (the bundler now powering Vite 8+) does not document a stable, esbuild-metafile-equivalent analysis output as of 2026-08-29** — this is an honest gap, not a guess. `sonda` is the one bundle analyzer that explicitly supports Rolldown, Rspack, esbuild, webpack, Rollup, and Vite in one tool by reading final source maps rather than a bundler-specific metafile (v0.14.0, published 2026-07-05).
- **rollup-plugin-visualizer still works for the fleet today** (both `fma` and `creeptd-ng/web` are on Vite `^6.x`, still Rollup-backed) **but will silently stop reflecting reality the moment either repo upgrades to Vite 8**, since Vite 8 replaces Rollup with Rolldown as its bundler. This is a forward-looking landmine worth flagging now.
- **source-map-explorer is stale** (2.5.3, last published 2022-09-26, ~4 years) and functionally subsumed by sonda's source-map-based analysis; not worth adding net-new.
- **The decision this brief must settle: adopt knip and dependency-cruiser now; treat CodeQL as already-free-so-turn-it-on; leave SonarQube, madge, depcheck, ts-prune, semgrep, and source-map-explorer out.** See [Tool verdicts](#tool-verdicts) for the full table and the exact CI commands.

## Findings

### 1. knip — dead code, unused exports/deps/files

**Version read: 6.33.0, published 2026-08-28** (yesterday relative to this research date) via the npm registry API. GitHub: 12,138 stars, last push **2026-08-29** (today) — the most actively maintained tool in this entire corpus ([api.github.com/repos/webpro-nl/knip](https://api.github.com/repos/webpro-nl/knip)).

**What it detects.** Unused files, unused exports (including individual enum/namespace members), unused dependencies (split into `dependencies` vs. `devDependencies` as separate issue types), unlisted dependencies (used but missing from `package.json`), unlisted binaries, unresolved imports, duplicate exports, and (non-default) circular dependencies. 17 distinct issue types total ([knip.dev/reference/issue-types](https://knip.dev/reference/issue-types)).

**Scale claims from the vendor page** (read directly, not from a search snippet): 40 million downloads/month, 15,000+ public projects, 279 contributors, 150+ plugins covering Astro, Vitest, Next.js, Nx, Storybook, GitHub Actions, and more; adopters listed include Adobe, Anthropic, AWS, Cloudflare, ESLint, Microsoft, Shopify, and Vercel ([knip.dev](https://knip.dev/)). One testimonial on the same page: "Knip helped us delete ~300k lines of unused code at Vercel."

**Monorepo support — exact config shape** (`knip.json`), read from the docs:

```json
{
  "workspaces": {
    ".": { "entry": "scripts/*.js", "project": "scripts/**/*.js" },
    "packages/*": { "entry": "{index,cli}.ts", "project": "**/*.ts" },
    "packages/cli": { "entry": "bin/cli.js" }
  }
}
```

Knip discovers workspaces from `package.json#workspaces` (npm/Bun/Yarn/Lerna) or `pnpm-workspace.yaml`; the root-level `entry`/`project` keys are **ignored** once workspaces exist — they must move under the `"."` workspace ([knip.dev/features/monorepos-and-workspaces](https://knip.dev/features/monorepos-and-workspaces)). This is directly applicable to `kate-middlechild` (core/tokens/web) and would need this shape rather than the flat single-project config.

**False-positive profile.** Knip's own stance, quoted directly: "it's telling the truth about its module graph: it couldn't reach that code from an entry file" — i.e. most "false positives" are missing entry-point or plugin configuration, not bugs. The documented top-down fix order is: unused files → unresolved imports → unused exports → unused dependencies, because fixing files first collapses cascading downstream noise ([knip.dev/guides/handling-issues](https://knip.dev/guides/handling-issues)). Known real limitations, stated plainly in the FAQ: single-file dead code (no inter-file reference) can slip through; `.vue`/`.svelte` files need their real compilers to be fully understood; conflicting `tsconfig.json` files across workspaces can cause missed files; no Deno support, no programmatic API, no parallel workspace analysis ([knip.dev/reference/faq](https://knip.dev/reference/faq)).

**Exact CI usage.** Exit code `1` on any issue. The documented GitHub Actions job:

```yaml
- uses: actions/checkout@v6
- uses: actions/setup-node@v6
  with: { node-version: 24 }
- run: npm install --ignore-scripts
- run: npm run knip
```

Recommended flags for CI: `--cache` (stores under `./node_modules/.cache/knip`), and running knip twice — once in default mode, once with `--production` — to separate "genuinely dead" from "dead only in the shipped surface" ([knip.dev/guides/using-knip-in-ci](https://knip.dev/guides/using-knip-in-ci)).

**Direct relevance to this fleet's wave-1 finding.** `ocx-catalog` and `grimoire-indexer` both ship an `export {}` stub as their package entry point while being CLIs with commander. Knip's unused-exports detection against the *actual* CLI entry (the `bin` field, which knip's npm/CLI-aware resolution reads) rather than the stub `main`/`exports` field is exactly the mechanism that would surface "this package has no real public API" — the stub itself would show as reachable-but-empty, and any exports still hanging off the old library-style entry would show as unused.

### 2. ts-prune — superseded, archived

**Repository status, read directly from the GitHub API:** `archived: true`, last push **2025-09-19** ([api.github.com/repos/nadeesha/ts-prune](https://api.github.com/repos/nadeesha/ts-prune)). Last npm publish: **0.10.3, 2021-12-12** — nearly four years stale even before archival.

Knip's own comparison page states the equivalence directly: `ts-prune` ≈ `knip --include exports,types,nsExports,nsTypes`, and lists ts-prune's status as "Archived; recommends Knip" ([knip.dev/explanations/comparison-and-migration](https://knip.dev/explanations/comparison-and-migration)). ts-prune's own README says it is "now in maintenance mode... for new projects, knip is recommended." **Say it plainly: there is no scenario in this fleet where ts-prune should be reached for over knip.** It has narrower scope (exports only, no dependency or file analysis, no monorepo workspace model) and is not receiving updates.

### 3. madge — circular-dependency visualization

**Version read: 8.0.0, published 2024-08-05** — over two years old with no follow-up npm release, despite GitHub activity continuing (last push 2026-01-21, 126 open issues) ([npm registry](https://registry.npmjs.org/madge), [api.github.com/repos/pahen/madge](https://api.github.com/repos/pahen/madge)). Exact command: `npx madge --circular src/main.ts --ts-config tsconfig.json`.

Madge's value is a visual dependency graph and a circular-dependency finder for JS/TS/CSS-preprocessor imports. **For this fleet, dependency-cruiser's `no-circular` rule does the identical job as a CI gate with an exit code**, and dependency-cruiser is the actively-released tool (18.2.0, 2026-08-10 vs. madge's 2024-08-05). Madge remains a reasonable one-off for a human generating a graph image to *look at* a module structure, but it is not the tool that should sit in CI enforcing anything, and two fully-stale years on npm is reason enough not to add a new dependency on it now.

### 4. dependency-cruiser — boundaries and cycles as CI gates

**Version read: 18.2.0, published 2026-08-10.** GitHub: 7,112 stars, pushed 2026-08-21 ([npm registry](https://registry.npmjs.org/dependency-cruiser), [api.github.com/repos/sverweij/dependency-cruiser](https://api.github.com/repos/sverweij/dependency-cruiser)) — actively released, unlike madge.

**Exact rule shape**, read from the project's own rules reference:

```javascript
{
  "name": "rule-name",
  "comment": "optional description",
  "severity": "warn" | "error" | "info" | "ignore",   // defaults to "warn"
  "from": { /* path/pathNot conditions */ },
  "to": { /* path/pathNot/circular conditions */ }
}
```

Built-in circular check:

```javascript
{ "name": "no-circular", "severity": "warn",
  "from": { "pathNot": "^(node_modules)" }, "to": { "circular": true } }
```

Boundary-restriction pattern shown in the docs (same-tier siblings may not import each other, regex-group matched):

```javascript
{
  "name": "no-inter-ubc", "severity": "error",
  "from": { "path": "^src/business-components/([^/]+)/.+" },
  "to": {
    "path": "^src/business-components/([^/]+)/.+",
    "pathNot": "^src/business-components/$1/.+"
  }
}
```

**Applied to this fleet's measured violation.** Direct grep of the repo confirms: `kate-middlechild/packages/core/src/map.test.ts:12` reads `import geojson from "../../web/src/data/ph-regions.geojson.json";` — `packages/core` reaching directly into `packages/web`, even though `packages/core/src/index.ts` states in its own header comment "Public barrel: the ONLY import surface for packages/web and other consumers." The exact rule that fails CI on this specific violation:

```javascript
{
  name: "no-core-into-web",
  severity: "error",
  comment: "packages/core must not reach into packages/web; web depends on core, not the reverse",
  from: { path: "^packages/core" },
  to:   { path: "^packages/web" }
}
```

**tsconfig path-alias resolution.** `.dependency-cruiser.js` supports `options: { tsConfig: './tsconfig.json' }`, which makes dependency-cruiser honor `baseUrl`/`paths` from the referenced tsconfig — necessary for any of the fleet repos using path aliases (needs per-repo verification, not assumed) ([rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md), [cli.md](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md)).

**Exact CI commands.** Scaffold once: `depcruise --init` (interactive, writes `.dependency-cruiser.{c,m}js`). Gate in CI: `depcruise --config .dependency-cruiser.cjs src` — exits `0` on no violations, and with a non-zero code equal to the count of `error`-severity violations found ([cli.md](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md)).

### 5. depcheck vs knip — dependency hygiene

**Repository status, read directly:** `archived: true`, last push 2025-02-27 ([api.github.com/repos/depcheck/depcheck](https://api.github.com/repos/depcheck/depcheck)). Last npm publish: **1.4.7, 2023-10-17**. depcheck's own README states plainly: "its lack of updates means it may not work well with modern tooling and frameworks" ([raw README](https://raw.githubusercontent.com/depcheck/depcheck/main/README.md)). Knip's comparison page lists depcheck's status as "Archived; now recommends Knip," with the equivalence `depcheck` ≈ `knip --dependencies` ([knip.dev/explanations/comparison-and-migration](https://knip.dev/explanations/comparison-and-migration)).

**Which tool catches the fleet's measured defect (test libraries in `dependencies` instead of `devDependencies`)?** Confirmed by direct read of `creeptd-ng/web/package.json`: `@testing-library/vue`, `@vue/test-utils`, and `jsdom` are all listed under `"dependencies"`, none under `"devDependencies"`.

**Neither tool has a first-class "misplaced dependency" rule.** depcheck reports `unused.dependencies` and `unused.devDependencies` as separate arrays, plus a `using` lookup mapping each dependency to the files that reference it — a human has to notice that a `dependencies`-listed package's `using` entries are all `*.test.ts` files ([depcheck README](https://raw.githubusercontent.com/depcheck/depcheck/main/README.md)). Knip's issue types are similarly split (`Unused dependencies` vs. `Unused devDependencies` as distinct categories) but has no direct "wrong bucket" rule either ([knip.dev/reference/issue-types](https://knip.dev/reference/issue-types)).

**The actionable, automatable check is knip's `--production` mode**, quoted exactly from the CLI reference: `--production` will "Lint only production source files. This excludes: entry files defined by plugins; test files; configuration files; Storybook stories; **devDependencies from package.json**." Combined with `--dependencies` (a shortcut for `--include dependencies,unlisted,binaries,unresolved,catalog,catalogReferences`), running `knip --production --dependencies` excludes test files from the reachable-entry graph — so a package like `@testing-library/vue`, reachable only from `*.test.ts` files and listed under `dependencies` (not `devDependencies`), becomes unreachable from the production graph and is reported as an unused dependency ([knip.dev/reference/cli](https://knip.dev/reference/cli)). **Exact command: `knip --production --dependencies`.** A reviewer who sees a package flagged here that is *also* clearly a real dependency (imported outside tests) has found a misplacement, not a truly-unused package — this is a heuristic, not a direct classification, and should be documented as such in any rule that cites it.

### 6. SonarJS / SonarQube — ESLint plugin vs full server

Two genuinely different things share the "SonarJS" name, and an agent should not conflate them.

**`eslint-plugin-sonarjs` (the standalone package, v1.x)** was archived 2024-10-03. Its README states directly: "This repository contains `eslint-plugin-sonarjs` up to version `^1.0.0`. For versions `>=2.0.0` please go to the repository of the SonarJS analyzer" ([github.com/SonarSource/eslint-plugin-sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs)). The old v1 shipped 37 rules (10 bug, 27 code-smell). **The package itself is not dead** — publishing moved into the `SonarSource/SonarJS` monorepo, and npm shows **v4.2.0, published 2026-07-14** ([npm registry](https://registry.npmjs.org/eslint-plugin-sonarjs)). This is ESLint-plugin-shaped tooling and belongs conceptually with the prior scout's lint-catalogue corpus, not here — but an agent recommending "SonarJS" without distinguishing this from the server product is a common confusion worth naming explicitly.

**The full SonarQube/SonarCloud server** (analyzer package `SonarJS`, latest tagged release **13.8.0.44569, published 2026-08-28** — one day before this research — actively developed, with an open PR as of 2026-02-25 to support a Go-based JS/TS analyzer for TypeScript 7 compatibility) adds whole-program analysis a linter cannot: duplication detection across the codebase, a quality gate (pass/fail threshold on new-code coverage/duplication/issues), and "security hotspots" requiring human triage rather than auto-fail.

**Cost, read directly from SonarSource's own pricing page:** the free Community Build lets you "explore SonarQube using your private projects up to a maximum of 50k LoC," and **"Pull request analysis" is listed as a Team-plan feature at $34/month**, not in the free tier ([sonarsource.com/plans-and-pricing](https://www.sonarsource.com/plans-and-pricing/)). Community Build officially supports TypeScript among 20+ languages.

**Verdict for this fleet, stated plainly: not worth it.** Nine repos, several under 10k LOC, already have no PR-gate requirement beyond existing CI. Standing up a SonarQube server (self-hosted, unpaid) buys duplication detection and a quality-gate dashboard neither of which this fleet has asked for, at the cost of running and maintaining a server; paying for PR decoration ($34/mo × however many seats) for a nine-repo hobby-scale fleet is not proportionate. If duplication detection specifically becomes a stated goal later, re-evaluate — but that is a distinct, narrower ask than "adopt SonarQube."

### 7. CodeQL — taint tracking a linter cannot do

**Version read directly: 2.26.3, released 2026-08-19** — ten days before this research — with JavaScript/TypeScript-specific changes: new Vue Composition API flow models (`ref`, `shallowRef`, `toRef`, `reactive`, `computed`), `useRoute()` recognized as a client-side taint source tracking `query`/`params`/`path`/`fullPath`/`hash`, and improved `js/missing-rate-limiting` coverage for `@fastify/rate-limit` ([github.blog/changelog](https://github.blog/changelog/2026-08-19-codeql-2-26-3-improves-github-actions-queries-and-javascript-modeling/)). The `codeql/javascript-queries` pack lists **~292 queries** ([codeql.github.com/codeql-query-help/javascript](https://codeql.github.com/codeql-query-help/javascript/)) — categories no ESLint/Biome/oxlint rule reaches: cross-function taint tracking (SQL injection, command injection, path traversal, prototype pollution via data flow rather than syntax pattern), ReDoS, JWT verification gaps, and framework-aware sources/sinks (Angular DI, React state, and now Vue Composition API).

**Cost, read directly from GitHub's own billing docs:** "All public repositories have access to code scanning, secret scanning, and dependency review" at no charge; "You need to pay to use Advanced Security features in private repositories," billed per unique active committer (pushed in the last 90 days) either metered or via volume licensing ([docs.github.com/en/billing/.../github-advanced-security](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security)).

**Directly checked against this fleet:** `gh repo view ocx-sh/catalog --json isPrivate` → `false`; same for `grimoire-rs/indexer` and `ocx-sh/setup-ocx`. **The fleet is public, so CodeQL costs nothing to turn on** — this changes the calculus from "expensive tool, is it worth it" to "free tool that is currently off." The new Vue taint models are directly relevant to `creeptd-ng/web` (Vue 3 + Pinia + Connect-RPC).

**Setup cost is a `.github/workflows/codeql.yml` using `github/codeql-action` with `languages: javascript-typescript` — a five-minute add per repo, not a program.** This is squarely "adopt."

### 8. semgrep — a security grep, not a quality linter

Fetching the actual ruleset content directly (`curl https://semgrep.dev/api/registry/rulesets/typescript`, the same YAML `semgrep --config p/typescript` pulls) and counting rule IDs gives **74 rules**, and every single one carries `category: security` in its metadata (verified by grepping the fetched YAML: 74 `category:` lines, all `security`). Rules found in the fetched set include `jwt-none-alg` (JWT `alg: none` forgery), various `URLSearchParams`/`window.location` taint patterns, XXE, and NoSQL-injection heuristics.

Secondary reporting (not independently verified by a primary fetch of the registry UI, since `registry.semgrep.dev` did not resolve in this session's network) claims the full ruleset totals 316 rules with 242 gated behind a Semgrep Pro login — treat that larger figure as unverified; the 74-rule, security-only figure above is the one this research actually confirmed.

**Verdict: semgrep's freely-runnable TypeScript coverage is a narrow security scanner, not a code-quality tool, and has near-zero overlap with dead-code, dependency-hygiene, or architecture-boundary concerns.** Its niche is genuinely different from ESLint's: pattern-based taint/crypto/injection rules an AST-shaped linter rule is awkward at expressing. For a nine-repo fleet with no dedicated security-review process, CodeQL (free, already covers taint tracking, native to GitHub code-scanning UI) subsumes what the free semgrep ruleset offers, at lower operational overhead (no separate CLI/CI step to wire, no separate findings UI). Not worth adding both.

### 9. TypeScript compiler performance analysis

**`tsc --diagnostics` / `--extendedDiagnostics`, `--generateTrace`, and `@typescript/analyze-trace`.** Exact invocation, read from the TypeScript wiki: `tsc -p some_directory --generateTrace some_directory --incremental false` produces `trace.json` (a Chrome-tracing-format timeline across four phases: program construction, binding, checking — "where most TypeScript work occurs, look here first" — and emit) and `types.json` (referenced type detail). Critical caveat quoted directly: **"you have to use `tsc` specifically — building through a bundler that invokes TypeScript via the API will not work"** ([TypeScript-wiki/Performance-Tracing.md](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance-Tracing.md)).

`@typescript/analyze-trace` (**v0.11.1, published 2026-06-26**; GitHub last pushed 2026-07-02 — actively maintained) turns that trace into a ranked hot-spot tree:

```bash
tsc -p path/to/tsconfig.json --generateTrace traceDir
npm install --no-save @typescript/analyze-trace
npx analyze-trace traceDir
```

producing output like `Check file .../lib.dom.d.ts (899ms)` with nested `Compare types NNNN and NNNN` entries, and a specific callout for duplicate npm package versions loaded during type-checking ([typescript-analyze-trace README](https://github.com/microsoft/typescript-analyze-trace/blob/main/README.md)).

**Is trace analysis still the right tool given TypeScript 7's Go rewrite? Yes, with a caveat, established directly from this research (not re-deriving wave 1's version facts).** `--generateTrace` traces the `tsc` binary's own execution, not the (currently unstable) programmatic API — so it is unaffected by TS 7's missing 7.0 API and keeps working on both TS 6 and TS 7 alike. What breaks on TS 7 is anything built on `typescript-eslint` or `ts-morph`, both of which need the programmatic API and therefore **cannot run on TS 7.0 at all**, only on TS 6.x or the `@typescript/typescript6` compatibility shim, until TS 7.1 ships its "new (and different)" API ([devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)). Trace analysis is the one performance tool in this whole corpus that survives the Go rewrite unmodified.

**TS 7.0 numbers, read directly from the announcement post (release date 2026-07-08):**

| Project | TS 6 full build | TS 7 full build | Speedup |
|---|---|---|---|
| VS Code | 125.7s | 10.6s | 11.9x |
| Sentry | 139.8s | 15.7s | 8.9x |
| Bluesky | 24.3s | 2.8s | 8.7x |
| Playwright | 12.8s | 1.47s | 8.7x |
| tldraw | 11.2s | 1.46s | 7.7x |

Memory usage fell 6–26% across the same projects. New parallelization flags: `--checkers` (type-checker worker count, default 4), `--builders` (parallel project-reference builds), `--singleThreaded` (forces serial execution, useful for isolating a trace).

**Project references and `tsc -b`.** `composite: true` on a referenced project forces `declaration: true`, fixes `rootDir` to the tsconfig's directory, and requires every implementation file to be covered by `include`/`files`. `tsc -b` (aliases: `tsc --build`) finds all referenced projects, builds only out-of-date ones in dependency order, and behaves as if `noEmitOnError` were always on. `declarationMap: true` makes cross-project "Go to Definition"/"Rename" work in editors ([typescriptlang.org/docs/handbook/project-references](https://www.typescriptlang.org/docs/handbook/project-references.html)). TS 7's `--builders` flag specifically parallelizes this across referenced projects, which is new leverage for a monorepo like `kate-middlechild` once it moves to TS 7.

**Where this actually pays off in the fleet.** Given TS 7's own 8–12x full-build speedup, splitting a small repo (`fma` at 4.5k LOC, `vscode-ocx` at 2.3k LOC) into referenced sub-projects for incremental-build gains is very unlikely to be worth the added `composite`/`declaration` ceremony — the whole-program build is already fast. The candidates where project references could plausibly matter are the two largest repos, `ocx-catalog` (28.5k LOC) and `creeptd-ng/web` (19.7k LOC, plus generated Connect-RPC/protobuf code) — but this needs to be measured with `--extendedDiagnostics` on each repo's actual build, not assumed; this research did not run that measurement, since instructions were not to modify the fleet.

### 10. Bundle/dead-code analysis at build time

**esbuild's own output.** `esbuild app.js --bundle --analyze` prints a terminal-native bundle-composition breakdown; `esbuild app.js --bundle --metafile=meta.json` (or the JS API's `metafile: true` option) emits a JSON structure describing every input/output file's size and import graph for external tooling to consume ([esbuild.github.io/api/#metafile](https://esbuild.github.io/api/#metafile)). Directly relevant to `grimoire-vscode` and `vscode-ocx`, both esbuild-bundled per the fleet inventory.

**Rolldown**, the bundler `rolldown.rs`'s own homepage describes as "The unified bundler powering Vite 8+" with a Rollup-compatible API and esbuild feature parity (benchmark: 19k modules bundled in 1.61s, dated 2025-12-21) — **does not document a stable metafile or `--analyze`-equivalent output on its own site as of 2026-08-29.** This is an honest gap: the homepage and the guide path this research tried (`/guide/in-depth/build-analysis`) return 404, and no analysis-output section surfaced. Do not assume Rolldown ships esbuild-parity analysis tooling until that's independently confirmed.

**rollup-plugin-visualizer** (**v7.1.1, published 2026-08-14** — actively maintained) generates an interactive treemap/sunburst from a Rollup (or Vite-on-Rollup) build. It is Rollup-specific.

**sonda** (**v0.14.0, published 2026-07-05**) is the one tool in this category that is genuinely bundler-agnostic: its own site states it supports "Vite, Rollup, esbuild, webpack, Rolldown, and Rspack" by "analyz[ing] final source maps to capture tree-shaking and minification, not pre-build estimates," and can emit either an interactive HTML report or JSON "for automation and CI checks" ([sonda.dev](https://sonda.dev)).

**source-map-explorer** — **v2.5.3, last published 2022-09-26**, nearly four years stale — reads source maps to show space usage per original file; functionally overlapped and superseded by sonda's newer, actively-maintained, multi-bundler approach.

**Direct fleet check: both Vite-based repos are still pre-Rolldown.** `fma/package.json` pins `vite: ^6.0.5`; `creeptd-ng/web/package.json` pins `vite: ^6.0.0`. Neither is on Vite 8 yet, so **rollup-plugin-visualizer works correctly for both today**, but the moment either repo bumps to Vite 8, Rollup is replaced by Rolldown underneath Vite and rollup-plugin-visualizer stops reflecting the real bundle (it may still run against leftover Rollup-shaped output, or simply stop working, depending on how the two repos' build config reacts — this specific failure mode was not tested and should be verified at upgrade time, not assumed). This is a concrete, dated landmine: **flag the Vite 6→8 boundary as the trigger to swap rollup-plugin-visualizer for sonda**, not a "someday" migration.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt/keep/drop/watch | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| **knip** | dead files, unused exports/deps, monorepo-aware | 6.33.0, 2026-08-28 | very active (40M dl/mo) | **adopt** | only tool that catches the fleet's stub-entry-point + dead-export defect directly | ts-prune, depcheck, unimported |
| **dependency-cruiser** | forbidden-import rules, cycle detection, arch boundaries | 18.2.0, 2026-08-10 | active | **adopt** | enforces the measured core→web boundary violation as a CI gate today | madge (as a gate) |
| **CodeQL (GitHub code scanning)** | taint-tracking security queries | 2.26.3, 2026-08-19 | very active | **adopt** | free on this fleet's public repos; ~292 JS/TS queries incl. new Vue taint models | ad hoc manual security review |
| **ts-prune** | unused-export finder | 0.10.3, 2021-12-12 | archived 2025-09-19 | **drop** | superseded by knip, says so itself | — (superseded by knip) |
| **depcheck** | unused/missing dependency finder | 1.4.7, 2023-10-17 | archived | **drop** | superseded by knip `--dependencies`; can't distinguish misplaced deps either | — (superseded by knip) |
| **madge** | circular-dep graph + visualization | 8.0.0, 2024-08-05 | stale (no npm release in 2yr) | **drop** (as a CI gate) | dependency-cruiser's `no-circular` does the same job and is actively released | — (dependency-cruiser covers its CI role) |
| **SonarQube / SonarJS server** | duplication, quality gate, security hotspots | analyzer 13.8.0.44569, 2026-08-28 | active | **watch** | PR decoration is paid ($34/mo Team plan); server ops cost not justified for 9 small repos yet | — |
| **eslint-plugin-sonarjs** | ESLint plugin (bug/smell rules) | 4.2.0, 2026-07-14 | active | **out of scope here** | lint-rule-shaped; belongs to the prior scout's catalogue, not this corpus | — |
| **semgrep** | pattern-based security scanner | p/typescript: 74 rules (all security), fetched 2026-08-29 | active | **drop** | free ruleset is narrow and security-only; CodeQL already covers this ground for free | — |
| **@typescript/analyze-trace** | tsc compilation hot-spot analyzer | 0.11.1, 2026-06-26 | active | **watch** | valuable only once a repo's build is actually slow; run on-demand, not in every CI run | manual `console.time` profiling |
| **project references (`tsc -b`)** | incremental multi-project builds | TS handbook, current | stable, TS-native | **watch** | plausible payoff only on the 2 largest repos; needs measurement, not assumption, before adopting | monolithic single-tsconfig build |
| **sonda** | universal bundle analyzer (final source-map based) | 0.14.0, 2026-07-05 | active, cross-bundler | **watch** | the one bundle analyzer that survives a future Vite 8/Rolldown migration; not urgent while fleet is on Vite 6/esbuild | rollup-plugin-visualizer (once Vite 8 lands), source-map-explorer |
| **rollup-plugin-visualizer** | Rollup/Vite bundle treemap | 7.1.1, 2026-08-14 | active | **keep (conditionally)** | correct today (fleet is on Vite 6); breaks silently at the Vite 8 boundary — revisit then | — |
| **esbuild `--analyze`/`--metafile`** | bundler-native analysis output | esbuild docs, current | stable | **keep** | already built into the bundler `grimoire-vscode`/`vscode-ocx` use; zero setup cost | — |
| **source-map-explorer** | source-map-based size analysis | 2.5.3, 2022-09-26 | stale (~4yr) | **drop** | superseded by sonda; no reason to add a new stale dependency | — (sonda covers this) |
| **Rolldown native analysis** | bundler-native output for Rolldown | rolldown.rs, current | unclear | **could not establish as of 2026-08-29** | homepage and guide path do not document a stable metafile/analyze equivalent | — |

## Normative guidance candidates

1. **Run `knip` in CI on every repo; fail the build on any unused-export or unused-dependency issue in `src`.** Rationale: this is the direct fix for the wave-1 stub-entry-point defect. Verify: `npx knip` exits `1` on issues; check `.github/workflows/*.yml` for a `run: npx knip` (or `npm run knip`) step.
2. **In any workspace-style repo (`kate-middlechild`), configure knip's `workspaces` key per-package rather than relying on root-level `entry`/`project`.** Rationale: root-level entry/project keys are silently ignored once workspaces exist. Verify: `knip.json` (or `knip.config.ts`) has a `workspaces` object with a `"."` entry, not bare top-level `entry`/`project`.
3. **Add a `dependency-cruiser` forbidden rule for every package/directory boundary the architecture claims exists, and run it in CI with `depcruise --config ... src`.** Rationale: a boundary stated only in a comment (as in `packages/core/src/index.ts`'s "ONLY import surface" header) is not enforced. Verify: `.dependency-cruiser.{c,m}js` contains a `forbidden` rule whose `to.path` matches the disallowed target, `severity: "error"`; CI step exits non-zero on violation count.
4. **Enable `dependency-cruiser`'s `no-circular` rule wherever the fleet currently has no circular-dependency gate.** Rationale: import cycles are invisible to a linter and only show up as runtime `undefined` bugs or bundler warnings. Verify: rule named `no-circular` with `to: { circular: true }` present in the config; `depcruise --config ... src` run in CI.
5. **Do not add ts-prune, depcheck, or madge to any repo going forward; if present, replace with knip/dependency-cruiser.** Rationale: all three are stale or archived and their own maintainers point at the replacement. Verify: `grep -E '"(ts-prune|depcheck|madge)"' package.json` returns nothing (or if it does, migrate before adding new dependency-hygiene tooling).
6. **Run `knip --production --dependencies` as a distinct, separate CI check (not folded into the default `knip` run) to catch dependencies misclassified between `dependencies` and `devDependencies`.** Rationale: this is a heuristic, not a rule — its output needs a human glance, not an auto-fail, since it will also flag legitimately-unused production deps. Verify: a CI step runs `knip --production --dependencies` and a reviewer inspects the diff between that output and the default `knip --dependencies` output.
7. **Turn on GitHub code scanning (CodeQL) with `languages: javascript-typescript` on every public repo in the fleet.** Rationale: free on public repos, already-confirmed public, and covers taint-tracking classes (injection, XSS, ReDoS) no lint rule in the corpus reaches. Verify: `.github/workflows/codeql.yml` exists using `github/codeql-action/{init,analyze}`; the repo's Security tab shows a completed code-scanning run.
8. **Do not stand up a SonarQube server or add semgrep as a new CI step for this fleet.** Rationale: SonarQube's PR decoration is paid and its free-tier value (duplication, quality gate) is unrequested; semgrep's free TypeScript coverage (74 rules, 100% security) is a strict subset of what free CodeQL already covers. Verify: no `sonar-project.properties` and no `.semgrep.yml`/`semgrep ci` step added; if one exists, it should have an explicit stated reason beyond "more coverage."
9. **Before adding TypeScript project references (`composite`+`tsc -b`) to any repo, measure with `tsc --extendedDiagnostics` first; do not add on assumption.** Rationale: TS 7's own 8–12x full-build speedup likely erases the incremental-build case for repos under ~10k LOC. Verify: a recorded `tsc --extendedDiagnostics` "Files/Lines/Nodes" and total time exists for the repo before any `composite: true` is introduced.
10. **Treat the Vite 6→8 upgrade (Rollup→Rolldown swap) as the trigger to replace `rollup-plugin-visualizer` with `sonda` in `fma` and `creeptd-ng/web`, not something to migrate proactively today.** Rationale: rollup-plugin-visualizer is correct today (both repos on Vite ^6) but is Rollup-specific and will not reflect a Rolldown-backed build. Verify: `package.json`'s `vite` version — the moment it reads `^8`, `rollup-plugin-visualizer`'s continued correctness must be re-checked, and `sonda` is the pre-vetted fallback.

## AI-agent angle

- **An LLM will confidently recommend ts-prune, depcheck, or madge as "the standard tool" from training-data familiarity — all three are stale or archived as of this research.** Smallest mechanical check: `curl -s https://registry.npmjs.org/<pkg> | jq -r '.time[.["dist-tags"].latest]'` and flag anything with no publish in the last 12 months, or check `archived` via `gh api repos/<owner>/<repo> --jq .archived`.
- **An LLM will conflate "SonarJS" (the ESLint plugin) with "SonarQube" (the paid server product) and recommend "adding SonarJS" as if it were a lightweight lint addition** when the actual ask (duplication detection, quality gates) requires standing up a server and possibly paying for PR decoration. Smallest mechanical check: does the recommendation include a package name that starts with `eslint-plugin-` (lint-shaped, cheap) or does it describe a dashboard/server/quality-gate (SonarQube-shaped, not cheap) — if the prose says "Sonar" and also says "PR check" or "quality gate," verify against `sonarsource.com/plans-and-pricing` whether that specific feature is free.
- **An LLM will suggest `@typescript/analyze-trace` or `--generateTrace` as if they work through a bundler or ts-node-style invocation** — the tool's own docs are explicit that this only works when `tsc` itself runs the compilation, not a bundler calling the TS API internally. Smallest mechanical check: the recommended command must literally contain `tsc ... --generateTrace`, not `vite build`, `esbuild`, or any wrapper.
- **An LLM asked about "TypeScript 7 tooling compatibility" may state that typescript-eslint or ts-morph "already support TS 7"** — as of the 2026-07-08 GA, they cannot, because TS 7.0 ships with no stable programmatic API at all (7.1 is where a new API is expected). Smallest mechanical check: does the claim cite a specific typescript-eslint version and TS 7 compatibility together — if so, verify against typescript-eslint's own changelog/peerDependencies range for a TS 7 entry before trusting it.
- **An LLM will cite bundle-analysis benchmark numbers (bundle size deltas, build-time speedups) from a vendor's own marketing copy without noting the benchmark's shape** — e.g. Rolldown's "19k modules in 1.61s" figure is a specific, dated (2025-12-21) synthetic benchmark, not a general claim about this fleet's actual build times. Smallest mechanical check: does the cited number come with a project name, date, and hardware/methodology note — if it's a bare multiplier ("10x faster!") with no named benchmark, treat it as unverified until traced to source.
- **An LLM may recommend `--generateTrace`/analyze-trace as a blanket "add to CI" recommendation** — it is a diagnostic tool for an already-slow build, not a regression gate; running it in every CI invocation adds real wall-clock time for no automated pass/fail signal (there is no built-in threshold to fail on). Smallest mechanical check: does the CI YAML have a step that fails the build based on `analyze-trace` output — if not, it's monitoring-only and should be a manual/on-demand script, not a required CI gate.

## Contested / evolving

- **Whether Rolldown will ship its own esbuild-metafile-equivalent analysis output, or whether the ecosystem standardizes on sonda instead, is unresolved as of 2026-08-29.** Rolldown's own docs do not yet document one; sonda has moved fast to fill the gap (0.14.0 as of 2026-07-05) by working directly from source maps instead of a bundler-specific format. Watch which approach wins over the next two Vite major versions.
- **The TypeScript 7 programmatic-API gap (no stable API until 7.1) is actively closing but not closed.** As of the 2026-07-08 GA, typescript-eslint and ts-morph are both blocked from running on TS 7 at all; this is a temporary, dated state, not a permanent architectural fact — recheck typescript-eslint's changelog once 7.1 ships.
- **SonarQube Community Build's exact feature boundary (what's free vs. Team-plan-gated) is not fully documented on a single canonical page** — this research confirmed "Pull request analysis" is Team-tier ($34/mo) from the pricing page directly, but could not independently confirm from SonarSource's own docs (as opposed to third-party reviews) whether branch analysis is similarly gated in the Community Build as of 2026-08-29; treat that specific claim as unconfirmed.
- **The "correct" free/paid line for AI-driven code-quality tooling is shifting industry-wide** (SonarQube's own pricing page now advertises "AI-driven code fixes" as a paid-tier feature) — worth re-checking in 6–12 months whether vendor pricing tiers move features between free and paid as AI-assisted review becomes a differentiator.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Does knip's plugin for commander/CLI entry points correctly resolve `bin` as a real entry, avoiding false "unused" on CLI-only exports? | Directly determines whether adopting knip on `ocx-catalog`/`grimoire-indexer` needs extra config or works out of the box | fleet + knip.dev plugins | high | low |
| What does `knip --production --dependencies` report on each of the 9 repos right now (baseline before adoption)? | Needed to know the true size of the misplaced-dependency problem before writing a rule | fleet (unmeasured) | high | low |
| Does dependency-cruiser's tsConfig path-alias resolution work correctly against each repo's actual `paths` config? | The boundary rule is only as good as its module resolution; untested per-repo | fleet (unmeasured) + dependency-cruiser docs | high | low |
| Is `github/codeql-action` setup identical across a commander-CLI repo, a VS Code extension (Electron host), and a Vue SPA, or does each need distinct `languages`/`build-mode` config? | Determines whether "adopt CodeQL" is a 5-repo copy-paste or needs per-repo tuning | codeql docs (unread on this axis) | med | low |
| Does TS 7's `--builders` flag change the incremental-build case for `kate-middlechild`'s 3-package structure enough to justify project references there specifically? | Directly answers whether recommendation #9 applies to any fleet repo today | devblogs TS 7 announcement + fleet | med | med (TS 7 adoption still pending fleet-wide) |
| What is Rolldown's actual metafile/analysis story once it stabilizes past 2026-08? | Determines whether sonda remains necessary or Rolldown absorbs the need natively | rolldown.rs (gap noted) | med | high — explicitly unresolved |
| Does semgrep's Pro tier (242 gated rules per secondary source) add meaningfully more TypeScript-relevant coverage than the free 74, such that it would be worth paying for over CodeQL? | Unverified secondary claim; worth a primary-source follow-up before fully closing the door on semgrep | semgrep registry (partially verified) | low | low |
| Does SonarQube Community Build actually support branch analysis, or is that also Team-tier? | The "Contested/evolving" gap above — affects the SonarQube verdict's precision | sonarsource.com (partially read) | low | low |
| What's the actual wall-clock cost of running `knip` + `dependency-cruiser` in CI on the largest repo (`ocx-catalog`, 28.5k LOC)? | "Adopt" recommendations need a measured CI-minutes cost, not an assumption of "cheap" | fleet (unmeasured) | high | low |
| Do any of the fleet's Astro/Vue/Preact component files (`.astro`, `.vue`) cause knip false positives the FAQ warns about (non-standard exports needing real compilers)? | grimoire-indexer (Astro/Preact) and creeptd-ng/web (Vue) are exactly the shapes knip's FAQ flags as needing extra care | knip.dev/reference/faq + fleet | high | low |
| Does dependency-cruiser have an official plugin/preset for Astro or Vue SFC resolution, or does it need manual module-resolution config for those file types? | Same non-standard-file-type risk as above, for the boundary-enforcement tool specifically | dependency-cruiser docs (unread on this axis) | med | low |
| Once typescript-eslint gains TS 7 support (post-7.1), does its type-aware linting performance profile change enough to revisit the "type-aware linting enabled in 1 of 9 repos" finding from wave 1? | Ties this scout's TS-7 findings back to wave 1's central open question | wave 1 + devblogs TS 7 | med | high — explicitly pending an unshipped release |
| Is GitHub Advanced Security's free-for-public-repos policy stable, or has GitHub signaled any future change to that boundary? | The entire CodeQL "adopt, it's free" verdict rests on this policy holding | docs.github.com (read, but forward-looking stability unverified) | med | low-med |
| Does `esbuild --analyze`'s terminal output get consumed/archived anywhere useful in CI (vs. only being useful interactively)? | Determines whether "keep esbuild's built-in analysis" needs a CI-artifact step to actually be useful over time | esbuild docs (gap: not explored) | low | low |
| What replaces `@typescript/analyze-trace` if/when TS 7's native tracing format changes (the wiki itself warns "may change again")? | Forward risk on recommendation #9's supporting tool | TypeScript-wiki (explicit caveat read) | low | med |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [knip.dev](https://knip.dev/) | knip project homepage | current, read 2026-08-29 | primary stats: downloads, adopters, plugin count |
| [knip.dev/explanations/why-use-knip](https://knip.dev/explanations/why-use-knip) | knip rationale doc | current | primary: why comprehensive analysis beats single-purpose tools |
| [knip.dev/reference/faq](https://knip.dev/reference/faq) | knip FAQ | current | primary: documented false-positive causes and real limitations |
| [knip.dev/explanations/comparison-and-migration](https://knip.dev/explanations/comparison-and-migration) | knip vs. competitors | current | primary: direct status ("archived") of ts-prune/depcheck/madge-adjacent tools |
| [knip.dev/features/monorepos-and-workspaces](https://knip.dev/features/monorepos-and-workspaces) | knip monorepo config | current | primary: exact `workspaces` config shape used in this report |
| [knip.dev/guides/handling-issues](https://knip.dev/guides/handling-issues) | knip false-positive handling guide | current | primary: top-down fix order, ignore config keys |
| [knip.dev/guides/using-knip-in-ci](https://knip.dev/guides/using-knip-in-ci) | knip CI guide | current | primary: exact GitHub Actions yaml and exit-code behavior |
| [knip.dev/reference/cli](https://knip.dev/reference/cli) | knip CLI flag reference | current | primary: exact `--production` and `--dependencies` flag text used for the depcheck-replacement command |
| [knip.dev/reference/issue-types](https://knip.dev/reference/issue-types) | knip issue-type reference | current | primary: complete list of 17 issue categories |
| [github.com/nadeesha/ts-prune](https://github.com/nadeesha/ts-prune) (via GitHub API) | ts-prune repo | archived 2025-09-19 | primary: confirms archival date directly from API |
| [github.com/sverweij/dependency-cruiser/.../rules-reference.md](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md) | dependency-cruiser rules docs | current (main branch) | primary: exact forbidden-rule JSON shape, no-circular, boundary example |
| [github.com/sverweij/dependency-cruiser/.../cli.md](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md) | dependency-cruiser CLI docs | current | primary: `--init`, exit-code semantics, `tsConfig` option |
| [registry.npmjs.org](https://registry.npmjs.org/) (queried per-package) | npm registry API | live, queried 2026-08-29 | primary: exact latest version + publish date for knip, dependency-cruiser, madge, depcheck, ts-prune, rollup-plugin-visualizer, sonda, source-map-explorer, @typescript/analyze-trace, eslint-plugin-sonarjs |
| [api.github.com](https://api.github.com/) (queried per-repo) | GitHub REST API | live, queried 2026-08-29 | primary: `archived` flag and `pushed_at` for madge, dependency-cruiser, knip, depcheck, ts-prune, typescript-analyze-trace |
| [raw README, depcheck/depcheck](https://raw.githubusercontent.com/depcheck/depcheck/main/README.md) | depcheck README | current (archived repo) | primary: exact API shape (`unused.dependencies`, `.using`, `.missing`) |
| [github.com/SonarSource/eslint-plugin-sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs) | old standalone SonarJS ESLint plugin repo | archived 2024-10-03 | primary: confirms the plugin moved into the SonarJS monorepo at v2.0.0+ |
| [github.com/SonarSource/SonarJS/releases](https://github.com/SonarSource/SonarJS/releases) | SonarJS analyzer releases | latest 13.8.0.44569, 2026-08-28 | primary: confirms the full analyzer is actively released |
| [sonarsource.com/plans-and-pricing](https://www.sonarsource.com/plans-and-pricing/) | official SonarSource pricing page | current | primary: confirms PR analysis is a paid ($34/mo Team) feature |
| [docs.github.com/.../github-advanced-security](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security) | GitHub Advanced Security billing docs | current | primary: confirms free-for-public/paid-for-private code scanning policy |
| [codeql.github.com/codeql-query-help/javascript](https://codeql.github.com/codeql-query-help/javascript/) | CodeQL JS/TS query help index | current | primary: ~292-query count and category breadth |
| [github.blog/changelog/2026-08-19-codeql-2-26-3-...](https://github.blog/changelog/2026-08-19-codeql-2-26-3-improves-github-actions-queries-and-javascript-modeling/) | CodeQL 2.26.3 changelog | 2026-08-19 | primary: exact version/date and new Vue Composition API taint models |
| [semgrep.dev/api/registry/rulesets/typescript](https://semgrep.dev/api/registry/rulesets/typescript) | raw semgrep TypeScript ruleset YAML | live, fetched 2026-08-29 | primary: directly counted 74 rules, 100% `category: security` |
| [devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | official TS 7.0 announcement | 2026-07-08 (GA date) | primary: per-project speedup table, API-stability statement, new CLI flags |
| [typescriptlang.org/docs/handbook/project-references.html](https://www.typescriptlang.org/docs/handbook/project-references.html) | official TS handbook | current | primary: `composite`, `tsc -b`, `declarationMap` semantics |
| [github.com/microsoft/TypeScript-wiki/.../Performance-Tracing.md](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance-Tracing.md) | official TS performance-tracing wiki page | current | primary: exact `--generateTrace` command, phase breakdown, tsc-only caveat |
| [github.com/microsoft/typescript-analyze-trace/.../README.md](https://github.com/microsoft/typescript-analyze-trace/blob/main/README.md) | analyze-trace README | current | primary: exact install/run commands, hot-spot output shape |
| [esbuild.github.io/api/#metafile](https://esbuild.github.io/api/#metafile) | official esbuild API docs | current | primary: `--analyze`/`--metafile` exact commands |
| [sonda.dev](https://sonda.dev) | sonda project homepage | current | primary: cross-bundler support list, source-map-based methodology |
| [rolldown.rs](https://rolldown.rs) | Rolldown project homepage | current | primary: confirms Vite 8+ bundler role; absence of documented analysis output |

Fleet grounding (read directly, not cited as external URLs): `kate-middlechild/packages/core/src/map.test.ts` (boundary-violation import), `kate-middlechild/packages/core/src/index.ts` (barrel-boundary comment), `creeptd-ng/web/package.json` (misplaced test dependencies), `fma/package.json` + `creeptd-ng/web/package.json` (Vite `^6.x` pin), `gh repo view` output for `ocx-sh/catalog`, `grimoire-rs/indexer`, `ocx-sh/setup-ocx` (public visibility).

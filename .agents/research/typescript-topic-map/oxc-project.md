---
title: The oxc Project — Toolchain, tsgolint, and the TypeScript 7 Decision
corpus: oxc-project.github.io / oxc.rs, github.com/oxc-project/oxc + satellite repos, voidzero.dev, devblogs.microsoft.com/typescript
agent: topic-map (oxc-project scout)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 22
scope: |
  Covers oxlint (config, migration, plugins, editor integration), tsgolint/type-aware
  linting (mechanism, coverage, benchmarks, TS7 dependency), oxfmt's maturity, the
  parser/resolver/transformer/minifier and their downstream consumers, and oxc/VoidZero
  governance post-Cloudflare-acquisition. Does NOT re-enumerate oxlint's/Biome's/oxlint's
  rule catalogues (prior wave covered that) and does not benchmark this fleet's own repos —
  all speed numbers below are the project's or practitioners', not measured against
  ocx-catalog/grimoire-indexer/etc.
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

- **tsgolint requires TypeScript 7.0+ to run at all** — it cannot type-check a TS6 project, so it is not a drop-in replacement for typescript-eslint until a repo has already migrated to TS7. [[type-aware.html]](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- **typescript-eslint's own peer dependency hard-excludes TypeScript 7**: `@typescript-eslint/eslint-plugin@8.68.0` declares `typescript: >=4.8.4 <6.1.0` — this is an `npm install` failure, not a soft "unsupported" warning (verified via `npm view`, 2026-08-29).
- **tsgolint sidesteps TS7's API gap by design**: it never imports TypeScript's programmatic API — it drives `typescript-go` directly, so it is unaffected by TS7 shipping no stable API until 7.1. [[tsgolint README]](https://github.com/oxc-project/tsgolint)
- Type-aware linting graduated from alpha to **stable on 2026-07-22**, at **59 of typescript-eslint's 61 type-aware rules** (verified 61 is the current count on typescript-eslint.io, not 62). [[stable blog]](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)
- Measured speedup on 4 real repos: **12–18x** faster than ESLint+typescript-eslint (vscode 83.2s→6.96s, microsoft/typescript 27.2s→1.94s, typeorm 13.2s→0.75s, vuejs/core 12.3s→0.95s). [[stable blog]](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)
- Microsoft's own escape hatch for TS7-blocked tools is `npm install -D typescript@npm:@typescript/typescript6` — a compat shim that keeps typescript-eslint running by quietly giving it TS6 under an aliased name; it does **not** give you TS7's compiler speed for type-checking, it just avoids the hard break. [[TS7 announcement]](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- TypeScript 7.1 (the release expected to carry a new stable API) has **no announced ship date** — only a `7.1.0-dev.20260829.1` nightly exists as of today (`npm view typescript dist-tags`, checked 2026-08-29).
- Enable tsgolint with two commands: `npm add -D oxlint-tsgolint@latest`, then `oxlint --type-aware` (add `--type-check` for stricter diagnostics); config lives under root-only `options.typeAware`/`options.typeCheck` in `.oxlintrc.json`. [[type-aware.html]](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- oxlint (apps) is at **v1.80.0**, released **2026-08-24**; oxfmt at **v0.65.0**, same date; releases ship in lockstep roughly weekly. (`npm view oxlint/oxfmt`, [oxlint CHANGELOG](https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/CHANGELOG.md))
- oxfmt is **not** yet a full Prettier replacement: it still shells out to Prettier for languages it hasn't ported (e.g. Markdown), and "eliminate the Prettier dependency" is an **open, unfinished Q3 2026 goal** as of today. [[Q3 2026 plan]](https://github.com/oxc-project/oxc/issues/23976)
- `@oxlint/migrate` converts an ESLint v9/v10 **flat** config automatically (`npx @oxlint/migrate`, `--type-aware` variant); it cannot migrate local custom plugins or legacy `.eslintrc.*` (those need a flat-config conversion first). [[migrate-from-eslint.html]](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)
- `eslint-plugin-oxlint` exists purely to run ESLint and oxlint side by side during migration by turning off ESLint rules oxlint already covers; it version-locks to oxlint (`oxlint: ~1.80.0` peer dep, confirmed via `npm view`).
- Real-world numbers diverge sharply from the marketing "50-100x": one practitioner's full pipeline went 81s→2.5s (97% cut) on a large repo, but **smaller projects saw gains from -11% to -49%** — i.e. sometimes *slower* than ESLint. [[charpeni.com]](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt)
- The same practitioner hit an oxlint performance cliff (2.5s→38s) with 4+ JS-plugin names active, later root-caused to `eslint-plugin-react-compiler` specifically rather than plugin count in general. [[charpeni.com]](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt)
- JS-plugin support (custom rules, ESLint v9+-compatible API) is at **alpha since 2026-03-11**; it explicitly does **not** support authoring custom *type-aware* rules, and documents Windows OOM issues with WSL recommended as the workaround — relevant since this fleet's dev machine is WSL2. [[JS Plugins Alpha]](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha.html)
- Editor integration is one command everywhere: `oxlint --lsp`, with official VS Code/Zed/JetBrains extensions and generic LSP for the rest; type-aware linting works inside the editor too, gated by the same root `options.typeAware` (overridable per-editor). [[editors.html]](https://oxc.rs/docs/guide/usage/linter/editors.html)
- Downstream consumers confirmed from primary sources: Rolldown (parse/transform/minify), Nuxt (parsing), Nova/swc-node/knip (`oxc_resolver`), Preact/Shopify/ByteDance/Shopee (oxlint), and `tsdown` (`rolldown: ~1.2.0` direct npm dependency, checked 2026-08-29). [[oxc README]](https://github.com/oxc-project/oxc)
- **Governance changed materially in June 2026**: Cloudflare acquired VoidZero (the company behind Vite, Vitest, Rolldown, and Oxc) on 2026-06-04, with a public commitment that all five stay open source/vendor-agnostic, plus a $1M independent Vite ecosystem fund. VoidZero remains oxc.rs's listed "Primary Sponsor." [[Cloudflare blog]](https://blog.cloudflare.com/voidzero-joins-cloudflare/)
- tsgolint's origin: it was a prototype built by an outside contributor (@auvred) *inside* the typescript-eslint project; typescript-eslint's own maintainers declined to pursue it, and development continued under the Oxc org instead. This is a live rivalry, not a partnership. [[VoidZero preview post]](https://voidzero.dev/posts/announcing-oxlint-type-aware-linting)
- None of the fleet's 9 repos currently reference oxlint, oxfmt, or any `oxc-*` package (checked `package.json` across all repos, 2026-08-29) — this is a from-zero adoption decision, not an upgrade.

## Findings

### 1. oxlint — version, stability, configuration

Current release: **v1.80.0**, published 2026-08-24 (`apps_v1.80.0` tag, GitHub API timestamp `2026-08-24T13:39:23Z`; matches `npm view oxlint version`). Companion `oxfmt` ships the same day at v0.65.0, and crates (`crates_v0.147.0`) ship alongside — the whole toolchain releases together roughly weekly. [[releases]](https://github.com/oxc-project/oxc/releases)

Rule surface: "more than 865 rules" spanning ESLint core, TypeScript, React, Jest, Vitest, Import, Unicorn, and jsx-a11y ports. [[linter.html]](https://oxc.rs/docs/guide/usage/linter.html) (Exact per-plugin counts were enumerated by a prior scout and are intentionally not repeated here.)

Config file (`.oxlintrc.json`) top-level keys: `$schema`, `plugins`, `categories`, `env`, `extends`, `globals`, `ignorePatterns`, `rules`, `overrides`, `settings`, `jsPlugins`, `options`. The `options` object carries `typeAware`, `typeCheck`, `denyWarnings`, `maxWarnings`, `reportUnusedDisableDirectives`, `respectEslintDisableDirectives` — **`typeAware`/`typeCheck` are root-config-only**, not settable per `overrides` entry or in a nested config. [[config-file-reference.html]](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html)

ESLint-config migration: `npx @oxlint/migrate <eslint-flat-config-path>` (add `--type-aware` for TS projects). It reads an ESLint v9/v10 flat config, converts supported rules with severities/options intact, keeps file-scoped `overrides`, translates `globals.browser`-style declarations into oxlint's `env`/`globals`, and preserves root `ignore` patterns. It explicitly **cannot** migrate locally-authored custom ESLint plugins or legacy `.eslintrc.js`/`.json` (those must first be converted to flat config). [[migrate-from-eslint.html]](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)

`eslint-plugin-oxlint` is the interim dual-run bridge: install it to auto-disable ESLint rules oxlint already enforces, so both linters can run in CI without duplicate findings during a phased migration. It peer-depends on `oxlint: ~1.80.0` — the two packages are version-locked (`npm view eslint-plugin-oxlint peerDependencies`, checked 2026-08-29).

Node/programmatic API: not surfaced on the general usage docs page fetched; the project's primary interface is the CLI (`oxlint`) and the LSP (`oxlint --lsp`), not a documented Node API for embedding — treat "Node API" for oxlint itself as **could not establish as of 2026-08-29** beyond the LSP surface.

### 2. tsgolint / type-aware linting — the load-bearing question

**What it is.** tsgolint is a separate Go binary, not a feature bolted onto oxlint's Rust core. Architecture: oxlint (Rust) handles file traversal and syntax-only rules; tsgolint (Go) builds full TypeScript programs and executes the type-aware rule set, communicating results back to oxlint. It is powered by `typescript-go` (Microsoft's own Go port of the compiler) rather than embedding or shelling out to the JS `typescript` package — this is precisely why it is unaffected by TS7's missing programmatic API. [[type-aware.html]](https://oxc.rs/docs/guide/usage/linter/type-aware.html), [[tsgolint README]](https://github.com/oxc-project/tsgolint)

**Origin.** tsgolint began as an experimental prototype inside the *typescript-eslint* project, built by contributor @auvred. When typescript-eslint's maintainers chose not to pursue it, development moved to the Oxc org, where it became oxlint's type-aware backend. [[VoidZero preview, 2025-08-22]](https://voidzero.dev/posts/announcing-oxlint-type-aware-linting)

**Versioning.** tsgolint version numbers directly encode the TypeScript version they track plus a patch counter, e.g. `v7.0.2001` = TypeScript `7.0.2` + tsgolint patch `001`. When TypeScript bumps, the prefix changes and the patch resets. Current: `v7.0.2001`, published 2026-07-21 (GitHub API `2026-07-21T14:33:56Z`). [[tsgolint releases]](https://github.com/oxc-project/tsgolint/releases)

**Rule coverage.** 59 of typescript-eslint's 61 type-aware rules are implemented (verified 61 is the live count on typescript-eslint's own rules page, filtered to the 💭 type-information marker, checked 2026-08-29 — not 62). The two unimplemented rules are **not named** in any fetched doc, README, or changelog — treat as "could not establish as of 2026-08-29"; a team relying on a specific rule must diff tsgolint's rule list against their active config directly.

**Enabling it.**
```bash
npm add -D oxlint-tsgolint@latest
oxlint --type-aware
oxlint --type-aware --type-check   # adds stricter type-checking diagnostics
```
Config equivalent (root `.oxlintrc.json` or `oxlint.config.ts`):
```json
{ "options": { "typeAware": true, "typeCheck": true } }
```
Rule config uses the same names/options as typescript-eslint, under a `typescript/*` namespace, e.g. `"typescript/no-floating-promises": ["error", { "ignoreVoid": true }]`. [[type-aware.html]](https://oxc.rs/docs/guide/usage/linter/type-aware.html)

**Requirements and caveats.** TypeScript 7.0+ is a hard requirement (tsgolint cannot type-check a TS6 project). Some legacy `tsconfig` options are unsupported (`baseUrl` named explicitly). In monorepos, dependency packages must be pre-built so their `.d.ts` files exist on disk — tsgolint does not build them for you. Very large codebases can hit high memory usage; `options.typeAware`/`typeCheck` apply only at the root config. [[type-aware.html]](https://oxc.rs/docs/guide/usage/linter/type-aware.html)

**Benchmarks at stabilization (2026-07-22).** Measured against ESLint+typescript-eslint on 4 real repos:

| Repo | ESLint+typescript-eslint | tsgolint | Speedup |
|---|---|---|---|
| microsoft/vscode | 83.2s | 6.96s | 12x |
| microsoft/typescript | 27.2s | 1.94s | 14x |
| typeorm/typeorm | 13.2s | 0.75s | 18x |
| vuejs/core | 12.3s | 0.95s | 13x |

[[stable blog]](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)

Earlier preview-stage numbers (2025-08-22, when rule coverage was ~40 rules, well before the 59/61 "stable" milestone): napi-rs 144 files/1.0s, preact 245 files/2.7s, rolldown 314 files/1.5s, bluesky 1,152 files/7.0s — the same post claims some repos that "previously took 1 minute with typescript-eslint now finish in <10 seconds." [[VoidZero preview]](https://voidzero.dev/posts/announcing-oxlint-type-aware-linting)

**Editor support.** Works inside the LSP too (`oxlint --lsp`); VS Code setting `oxc.typeAware` overrides the root config's `options.typeAware` when explicitly set, otherwise inherits it. Requires `oxlint-tsgolint` installed locally regardless of CLI vs editor use. [[editors.html]](https://oxc.rs/docs/guide/usage/linter/editors.html)

### 3. TypeScript 7's API gap — the actual mechanism blocking typescript-eslint

TypeScript 7.0 shipped **2026-07-08** (GA), an 8-12x-faster Go-native compiler, but **"does not yet expose a stable programmatic API"** — 7.1 is expected to carry "a new (and different) API," with no ship date given. [[TS 7.0 announcement]](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

Microsoft names typescript-eslint explicitly as a tool blocked by this, and ships a compatibility escape hatch: `@typescript/typescript6`, installable as `npm install -D typescript@npm:@typescript/typescript6` (or the equivalent `package.json` alias `"typescript": "npm:@typescript/typescript6@^6.0.2"`). This lets a project keep TS7's own faster `tsc` binary side-by-side while typescript-eslint (and any other tool that imports `typescript` for its API) silently gets TS6 under the aliased name. It is a **stopgap that avoids install failure, not a way to get TS7's speed for type-checking** — the type-aware linter is still running a TS6-shaped compiler underneath. [[TS 7.0 announcement]](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

Confirmed independently at the package level: `@typescript-eslint/eslint-plugin@8.68.0`'s peer dependency is `typescript: >=4.8.4 <6.1.0` (checked via `npm view`, 2026-08-29) — this is an `npm install` failure on TS7, not a runtime warning. It also excludes TS 6.1+, meaning even a same-major bump beyond 6.0.x needs verifying against this ceiling.

As of today (2026-08-29), TypeScript's own npm dist-tags show `next: 7.1.0-dev.20260829.1` — a nightly build exists, but 7.1 has not shipped stable, so the API typescript-eslint would need to retarget does not exist yet in a released form (checked via `npm view typescript dist-tags`).

### 4. oxfmt — status and gaps

Beta announced **2026-02-24**: claims "100% of Prettier's JavaScript and TypeScript conformance tests" pass, framed as safe to "migrate from Prettier to Oxfmt with confidence that your code will be formatted identically" — for JS/TS specifically. [[oxfmt beta]](https://oxc.rs/blog/2026-02-24-oxfmt-beta)

Current version **v0.65.0**, released 2026-08-24 (same-day as oxlint 1.80.0). Supported languages listed: JavaScript, JSX, TypeScript, TSX, JSON, JSONC, JSON5, YAML, TOML, HTML, Angular, Vue, CSS, SCSS, Less, Markdown, MDX, GraphQL, Ember, Handlebars.

**What it does not yet do**: it still depends on Prettier itself for languages it hasn't natively ported (Markdown named explicitly), and the Q3 2026 (Jul-Sep) roadmap lists "complete porting Prettier functionality to eliminate the Prettier dependency" as an **open, in-progress** goal — not done as of today. Prettier-plugin support and further stability/perf work are also open. [[Q3 2026 plan]](https://github.com/oxc-project/oxc/issues/23976)

Net: oxfmt is a credible Prettier replacement for pure JS/TS today, but is **not yet a complete standalone formatter** — for a repo with Markdown/MDX docs (e.g. this fleet's VitePress/Astro sites), oxfmt is currently formatting some file types by delegating to Prettier under the hood, not by its own engine.

### 5. Custom rule authoring (JS plugins)

JS plugin support reached **alpha on 2026-03-11**, described as "ready for adoption in real world projects," with the team stating "almost the entirety of ESLint's plugin API" is now implemented, targeting ESLint v9+ plugin compatibility. Since an earlier 2025-10-09 preview, large parts of the plugin execution path were rewritten in Rust for "significant performance gains" (one example: token-API-heavy plugins up to 5x faster). [[JS Plugins Alpha]](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha.html)

Configuration: add the plugin's import specifier (local path, `eslint-plugin-foo`, or `@foo/eslint-plugin`) under `jsPlugins` in `.oxlintrc.json`, then reference its rules under `rules`. [[js-plugins docs, via search snippet]](https://oxc.rs/docs/guide/usage/linter/js-plugins)

Explicit limitations at alpha: **no support for authoring custom type-aware rules** (only the built-in typescript-eslint-equivalent rules get type information — a hand-written JS plugin rule cannot request it); limited support for Vue/Svelte/Angular custom file formats ("coming later this year" as of March 2026); and documented out-of-memory crashes specifically on Windows, with **WSL recommended as the workaround** — directly relevant since this fleet's environment is WSL2. [[JS Plugins Alpha]](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha.html)

### 6. Editor integration

Single mechanism everywhere: `oxlint --lsp`. Editor extensions require oxlint installed locally in the project (not globally) and shell out to that binary. Coverage: official VS Code extension (`oxc.oxc-vscode`, also works in Cursor), a Zed extension, a JetBrains plugin, and generic LSP config for Neovim/Emacs/Helix/Sublime. The extension applies fixes via a `source.fixAll.oxc` code action and validates config files against a JSON schema. Type-aware linting works through the same LSP path, gated by `options.typeAware` (root config) with a per-editor override (`oxc.typeAware` in VS Code settings). [[editors.html]](https://oxc.rs/docs/guide/usage/linter/editors.html)

### 7. The rest of the toolchain and its consumers

Six components ship from one repo: parser, transformer, minifier, resolver, oxlint (linter), oxfmt (formatter) — all Rust, MIT-licensed. [[oxc README]](https://github.com/oxc-project/oxc)

Confirmed downstream consumers, from the project's own README:
- **Rolldown** — uses Oxc for parsing, transformation, and minification. Current npm version `1.2.6` (checked 2026-08-29).
- **Nuxt** — uses Oxc for parsing.
- **Nova, swc-node, knip** — use `oxc_resolver` for module resolution.
- **Preact, Shopify, ByteDance, Shopee** — use oxlint for linting.

Additionally confirmed directly via npm registry metadata (not the README): **`tsdown`** (current `0.22.14`) depends on `rolldown: ~1.2.0` as a direct dependency — so any repo adopting `tsdown` for library builds pulls in Rolldown/Oxc transitively even without touching oxlint. Vite 8 (current `8.2.2`) replaced esbuild+Rollup with Rolldown as its sole bundler (established prior wave, corroborated here by the VoidZero/Cloudflare coverage below).

Homepage performance claims (oxc.rs, self-reported, not independently reproduced here): linter "50-100x faster than ESLint," formatter "30x faster than Prettier" / "3x faster than Biome," parser "3x faster than SWC" (26.3ms vs 84.1ms on their benchmark), resolver "28x faster than enhanced-resolve." Treat these as vendor benchmarks — see [AI-agent angle](#ai-agent-angle) for why practitioner numbers diverge. [[oxc.rs homepage]](https://oxc.rs)

### 8. Adoption and governance

VoidZero was founded by Evan You (creator of Vue and Vite) to unify Vite, Rolldown, Oxc, and Vitest into one coherent toolchain; it raised a $4.6M seed from Accel (2024) and a $12.5M Series A (October 2025).

**Cloudflare acquired VoidZero, announced 2026-06-04** — the entire VoidZero team, covering Vite, Vitest, Rolldown, Oxc, and the commercial Vite+ meta-bundler, joined Cloudflare. The public commitment: all five projects remain open source, vendor-agnostic, and community-governed, plus Cloudflare is funding a **$1M independent Vite ecosystem fund** for maintainers/contributors unaffiliated with either company. [[Cloudflare blog]](https://blog.cloudflare.com/voidzero-joins-cloudflare/)

Oxc's own homepage still lists **VoidZero as its "Primary Sponsor"** post-acquisition, with Persona (silver) and N-iX/Miro (bronze) as other sponsors — i.e. Cloudflare's ownership of VoidZero now sits one layer upstream of Oxc's funding, but the sponsorship relationship itself hasn't visibly changed shape. [[oxc.rs homepage]](https://oxc.rs)

### 9. What oxlint still cannot do, and the migration reputation

From a practitioner who migrated from Biome+Prettier (not ESLint) to oxlint+oxfmt: three Biome rules had no native oxlint equivalent at migration time — `noLeakedRender` (catches `{count && <Component/>}` falsy-render bugs), `noUndeclaredEnvVars` (typo'd env var references), `noSwitchDeclarations` (block-scoping in `switch` cases). Verdict: "you can usually live without these, or write a JS plugin for the high-value ones, but it's worth doing a rule audit before you commit." [[charpeni.com]](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt)

Same source's numbers: full pipeline 81s→2.5s (97% cut) on a large project, lint-only 3s→0.7s, format-only 2.9s→1.9s — but **smaller projects saw -11% to -49% "gains"** (i.e., regressions) due to fixed per-invocation overhead outweighing the win on small file counts. A separate performance cliff (2.5s→38s at 4+ active JS-plugin names) was later root-caused to one specific plugin (`eslint-plugin-react-compiler`), not plugin count itself. [[charpeni.com]](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt)

From an ESLint migration (ManoMano, ~500k LOC Next.js app, unplugged MacBook Air M2, cold ESLint cache): baseline ESLint 2m06s → 1m05s ESLint-remaining-rules + 11s oxlint running in parallel, roughly halving wall time while ESLint stayed in the loop for rules oxlint doesn't yet cover. [[ManoMano]](https://medium.com/manomano-tech/how-we-cut-lint-time-by-40-migrating-from-eslint-to-oxlint-f534be696840)

## Tool verdicts

| tool | what it does | version + date | maturity | adopt/keep/drop/watch (this fleet) | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| oxlint | Rust-native ESLint-compatible linter, 865+ rules | v1.80.0, 2026-08-24 | mature (weekly releases, migrate tooling, LSP) | **watch → pilot on one repo** | fast and config-portable, but real gains on this fleet's file counts (28-193 files) are unverified — practitioner data shows small repos can regress | ESLint (non-type-aware rules) |
| tsgolint / `oxlint-tsgolint` | type-aware linting backend, drives `typescript-go` directly | v7.0.2001, 2026-07-21 (stable blog 2026-07-22) | stable, TS7-only, 59/61 rule parity | **adopt, gated per-repo on that repo's TS7 migration** | only path to type-aware linting that survives TS7's API gap; not usable until a repo is actually on TS7 | typescript-eslint's type-aware rules, once TS7 lands |
| @typescript-eslint/eslint-plugin | type-aware linting on TypeScript's own API | v8.68.0; peer `typescript >=4.8.4 <6.1.0` | mature but structurally TS7-incompatible | **keep for now on the 6.0.3/5.x repos**, drop per-repo at TS7 cutover | still correct for repos not moving to TS7 yet; cannot even `npm install` against TS7 | n/a — this is the incumbent |
| `@typescript/typescript6` (Microsoft compat shim) | npm-alias package re-exporting TS6's API under TS7 | shipped alongside TS 7.0, 2026-07-08 | official stopgap, not a target state | **watch, use only as a bridge if a TS7 bump is forced before tsgolint is ready** | avoids an install break but forfeits TS7's compiler speed for type-checking | nothing — it's a compatibility patch |
| oxfmt | Rust formatter, JS/TS/CSS/JSON native, Markdown+ via Prettier fallback | v0.65.0, 2026-08-24 (beta announced 2026-02-24) | credible for JS/TS, incomplete elsewhere | **watch** | not done eliminating its own Prettier dependency (open Q3 2026 goal); fine for pure TS/JS repos, risky for the two VitePress/Astro doc sites | Prettier (partially) |
| `@oxlint/migrate` | converts ESLint v9/v10 flat config → `.oxlintrc.json` | n/a (docs-only, no version surfaced) | usable, has named gaps | **watch, run once when piloting** | mechanical for standard rules, silently drops local custom plugins and can't touch legacy `.eslintrc.*` | manual config translation |
| `eslint-plugin-oxlint` | disables ESLint rules oxlint already covers, for dual-run migration | v1.80.0 (locked to oxlint `~1.80.0`) | mature, narrow purpose | **watch, use only during an active migration window** | pure migration scaffolding, no value once cutover is complete | nothing standalone |
| oxlint JS plugins | write/run ESLint-v9-API-compatible custom rules in JS/TS | alpha since 2026-03-11 | alpha, WSL OOM caveat noted | **watch** | can't author custom type-aware rules yet; useful only if the fleet has repo-local ESLint plugins worth porting (none currently known) | custom ESLint plugin authoring |
| oxc VS Code extension | LSP-backed inline lint/format in editor | `oxc.oxc-vscode` on Marketplace | mature, mirrors CLI behavior | **watch/low-risk trial** | zero build-system risk (editor-only), useful reference while this fleet builds its own 2 VS Code extensions | ESLint/Prettier VS Code extensions |
| oxc parser/resolver/transformer/minifier | Rust primitives; not typically hand-invoked | crates v0.147.0 / oxc-parser 0.147.0, 2026-08-24 | mature, consumed transitively | **watch (indirect only)** | this fleet doesn't hand-roll a bundler; arrives automatically via Vite 8 / Rolldown / tsdown upgrades | Babel/esbuild internals inside those tools |
| Rolldown | Rust bundler, Rollup-API-compatible, built on oxc | v1.2.6 | production (Vite 8's default bundler) | **watch (indirect only)** | pulled in automatically by a Vite 8 bump; no direct action needed | esbuild+Rollup pairing inside Vite |

## Normative guidance candidates

1. **Do not enable `oxlint --type-aware`/`oxlint-tsgolint` on a repo still targeting TypeScript <7.0.** Rationale: tsgolint requires TS7+ and will not type-check a TS6 project. Verify: `npm ls typescript` shows `^7.x`, and `.oxlintrc.json`'s `options.typeAware` is only flipped on `true` after that.
2. **Do not attempt to keep `@typescript-eslint/*` type-aware rules running once a repo's `typescript` devDependency crosses into `7.x`** — the peer range forbids it. Rationale: `@typescript-eslint/eslint-plugin`'s peer dep is `>=4.8.4 <6.1.0`; installing against TS7 fails outright. Verify: `npm view @typescript-eslint/eslint-plugin peerDependencies` against the repo's actual `typescript` version before any bump.
3. **Treat `@typescript/typescript6` aliasing as a time-boxed bridge, not a resting state.** Rationale: it silently keeps type-checking on TS6 semantics while `tsc` itself runs TS7 — divergence risk grows the longer it's kept. Verify: grep `package.json` for `"typescript": "npm:@typescript/typescript6` and flag it as tech debt with an expiry note.
4. **Before enabling type-aware oxlint in any repo, diff tsgolint's implemented rule list against the repo's currently-enabled `@typescript-eslint/*` rules** to confirm none of the 2 unimplemented rules are load-bearing. Rationale: the 2 missing rules are undocumented by name. Verify: run `oxlint --type-aware --rules` (or equivalent listing flag) and diff rule IDs against `eslint.config.*`'s active typescript-eslint rule set.
5. **Run `@oxlint/migrate --type-aware` once per repo as a starting point, never as the final config** — hand-review anything involving local custom ESLint plugins. Rationale: the tool documents it cannot migrate local plugins or legacy `.eslintrc.*`. Verify: check the generated `.oxlintrc.json`'s `jsPlugins`/`rules` sections against the source `eslint.config.*` for every locally-defined plugin.
6. **Pilot oxlint on the largest repo first (ocx-catalog, 193 files/28.5k LOC), not the smallest**, before deciding fleet-wide. Rationale: practitioner data shows small-repo runs can be *slower* than ESLint (-11% to -49%) due to fixed overhead; the 50-100x/12-18x numbers are large-repo measurements. Verify: time `eslint .` vs `oxlint` on the same repo, cold and warm, before adopting.
7. **If adopting oxlint JS plugins, budget for WSL-specific OOM behavior** given this dev environment is WSL2. Rationale: the project's own alpha announcement documents Windows OOM issues with WSL as the stated workaround — meaning the failure mode is native-Windows-specific, but confirm memory headroom under WSL2 too before trusting it in CI. Verify: run the plugin-heavy config once locally under load before wiring into CI.
8. **Don't route Markdown/MDX formatting through oxfmt as a "no-Prettier" claim** for the two doc-site repos (ocx-catalog's VitePress, grimoire-indexer's Astro) until Q3 2026's Prettier-elimination work is confirmed shipped. Rationale: oxfmt's own roadmap lists this as open, not done, as of 2026-08-29. Verify: re-check [oxfmt's changelog](https://oxc.rs/blog) for a "Prettier dependency removed" entry before trusting Markdown output to differ from Prettier's.

## AI-agent angle

- **Recommending `typescript-eslint` + TS7 together as if they simply work.** An agent pattern-matching "typescript-eslint is the standard type-aware linter" will suggest bumping `typescript` to `^7.0.2` without checking the peer range. Mechanical check: `npm view @typescript-eslint/eslint-plugin peerDependencies` (or just attempt the install) before touching the `typescript` devDependency in any PR that also bumps typescript-eslint-adjacent packages.
- **Citing oxc's "50-100x faster" homepage number as this fleet's expected result.** That's a vendor benchmark on large repos; practitioner data shows -11% to -49% on small ones. Mechanical check: before claiming a speed win in a PR description, actually time `eslint .` vs `oxlint` on the target repo, not the vendor's number.
- **Suggesting tsgolint as a solution for a repo still on TypeScript 6.x.** tsgolint hard-requires TS7+; recommending it as a general typescript-eslint replacement without checking the repo's TS version is the single most likely mistake here, given the brief's own framing invites it. Mechanical check: `npm ls typescript` must show `7.x` before `oxlint-tsgolint` is added.
- **Treating `@typescript/typescript6` as if it gives TS7's compiler speed.** It doesn't — it's TS6 running under an alias so a TS7-incompatible tool doesn't break. An agent optimizing for "10x faster builds" might wire this in and declare victory. Mechanical check: confirm which binary actually runs type-checking (`tsc` from the aliased `typescript6` package vs the real `tsc` from `typescript@7`) — they are not the same compiler even though both are present.
- **Recommending oxfmt as a full Prettier drop-in for a repo with Markdown/MDX.** The 100%-conformance claim is scoped to JS/TS only; Markdown still round-trips through Prettier internally as of today. Mechanical check: re-read the [current oxfmt changelog](https://oxc.rs/blog) for an explicit "Prettier dependency removed" line dated after 2026-08-29 before trusting non-JS/TS output parity.
- **Assuming a rule name found in typescript-eslint's docs is automatically available under `typescript/*` in tsgolint.** 2 of 61 rules are unported and unnamed. Mechanical check: run `oxlint --type-aware` on the target repo and confirm the specific rule ID appears in its rule listing/diagnostics before relying on it, rather than assuming 1:1 parity from the "59/61" headline number.

## Contested / evolving

- **oxfmt's Prettier dependency**: actively being removed (Q3 2026 goal, open as of 2026-08-29). Trending toward full independence within this quarter — re-check before year-end.
- **tsgolint's rule-parity gap (59/61)**: trending toward closing, but the pace and the identity of the last 2 rules are undocumented. Re-check the tsgolint changelog periodically; each patch release (`v7.0.200x`) has been adding coverage.
- **TypeScript 7.1's stable programmatic API**: unresolved — only a dev nightly (`7.1.0-dev.20260829.1`) exists as of today, no ship date announced by Microsoft. This is the single biggest open variable for the whole decision in this brief; whichever way it resolves (soon vs. long delay) changes how urgent the tsgolint migration is for repos that haven't yet moved to TS7.
- **oxlint's small-repo performance**: contested between vendor benchmarks (50-100x, always large repos) and at least one practitioner report of net regressions on small codebases. No fleet-specific measurement exists yet.
- **JS plugin custom type-aware rules**: not supported as of the 2026-03-11 alpha; no announced date for when (or whether) this closes.
- **Cloudflare/VoidZero governance**: the open-source/vendor-neutral commitments are fresh (announced 2026-06-04) and untested by time — worth re-verifying in 6-12 months that the $1M ecosystem fund and community governance claims held.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Does tsgolint's 59/61 rule set cover this fleet's actually-enabled type-aware rules? | the 1 repo using `strictTypeChecked` may depend on one of the 2 unnamed missing rules | tsgolint README/changelog | high | high (gap is closing) |
| Should each repo's TS7 bump be sequenced before or after tsgolint adoption? | tsgolint literally cannot run pre-TS7; wrong order blocks nothing but wastes a cycle | type-aware.html | high | medium |
| Is TypeScript 7.1's stable API shipped yet, and does typescript-eslint retarget it? | flips the entire "adopt tsgolint" urgency if it lands soon with full parity | devblogs.microsoft.com, npm dist-tags | high | high |
| Does oxlint's real speedup on 28-193 file repos match vendor numbers or practitioner regressions? | small-repo data shows -11% to -49%; this fleet's repos are all in that small-to-mid range | charpeni.com | high | low |
| Has oxfmt dropped its Prettier dependency for Markdown/MDX yet? | affects the 2 doc-site repos (VitePress, Astro) directly | oxc Q3 2026 plan / oxfmt changelog | medium | high (explicit Q3 goal) |
| Which fleet repos can `@oxlint/migrate --type-aware` convert cleanly? | determines real migration cost per repo, not theoretical | migrate-from-eslint.html | high | low |
| Does oxlint's JS-plugin performance cliff still exist, or was it patched? | root-caused to one plugin; may already be fixed in a later release | charpeni.com + oxlint changelog | medium | medium |
| Do any fleet repos hit oxlint/plugin OOM issues under WSL2 specifically? | dev environment is WSL2; docs only confirm native-Windows OOM + WSL-as-workaround | JS Plugins Alpha blog | medium | medium |
| Is oxlint's editor LSP mode already compatible with what `grimoire-vscode`/`vscode-ocx` build on top of? | 2 of this fleet's repos ARE VS Code extensions; overlap/conflict risk with their own linting UX | editors.html | medium | low |
| Should `eslint-plugin-oxlint` be used as a time-boxed dual-run bridge, and for how long? | prevents "migration" from becoming a permanent two-linter steady state | oxc docs | medium | low |
| Can any fleet repo's local custom ESLint rules be ported 1:1 via oxlint JS plugins? | determines whether custom-rule authoring blocks a full ESLint retirement | JS Plugins Alpha blog | low (none currently known) | medium |
| Does adopting `tsdown` or bumping to Vite 8 pull in Oxc transitively even without touching oxlint? | changes the risk calculus — some Oxc exposure may arrive regardless of a lint decision | npm registry (tsdown deps) | medium | low |
| Does the Cloudflare acquisition of VoidZero introduce any near-term license/pricing risk for a fleet standardizing on oxc? | governance changed mid-2026; commitments are unverified by time yet | Cloudflare blog | low | medium |
| What exactly changes about `strictTypeChecked`'s semantics when porting to tsgolint's `typescript/*` namespace? | is it a named preset in oxlint, or must every rule be listed individually? | type-aware.html (unconfirmed either way) | medium | medium |
| Does typescript-eslint's peer-dep ceiling (`<6.1.0`) block a same-major bump to TS 6.1.x even without going to 7.0? | affects whether repos can inch forward without the TS7 cliff | npm registry (typescript-eslint peerDeps) | medium | low |
| Is there a fleet-specific benchmark of oxlint vs the currently-configured ESLint+plugins stack? | no such measurement exists yet; all numbers above are borrowed from other projects | (none — a gap) | high | low |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [oxc.rs/docs/guide/usage/linter/type-aware.html](https://oxc.rs/docs/guide/usage/linter/type-aware.html) | primary docs | current (2026-08-29) | canonical tsgolint mechanism, config, requirements |
| [oxc.rs/blog/2026-07-22-type-aware-linting-stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable) | primary blog | 2026-07-22 | the stabilization announcement with rule-parity and benchmark numbers |
| [voidzero.dev/posts/announcing-oxlint-type-aware-linting](https://voidzero.dev/posts/announcing-oxlint-type-aware-linting) | primary blog (VoidZero) | 2025-08-22 | earlier preview post; origin story (typescript-eslint declined tsgolint) and early benchmarks |
| [github.com/oxc-project/tsgolint](https://github.com/oxc-project/tsgolint) | primary repo README | current | versioning scheme, rule count, typescript-go integration confirmation |
| [github.com/oxc-project/tsgolint/releases](https://github.com/oxc-project/tsgolint/releases) (verified via `gh api`) | primary release history | through 2026-07-21 | exact version/date ground truth (caught a WebFetch date-parsing error) |
| [oxc.rs/docs/guide/usage/linter.html](https://oxc.rs/docs/guide/usage/linter.html) | primary docs | current | rule-plugin list, migrate tooling pointer, "865+ rules" claim |
| [oxc.rs/blog/2026-02-24-oxfmt-beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta) | primary blog | 2026-02-24 | oxfmt beta announcement, Prettier-conformance claim, supported languages |
| [oxc.rs/docs/guide/usage/linter/config-file-reference.html](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html) | primary docs | current | exact `.oxlintrc.json` schema including root-only `options.typeAware`/`typeCheck` |
| [oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html) | primary docs | current | `@oxlint/migrate` exact commands and named limitations |
| [github.com/oxc-project/oxc](https://github.com/oxc-project/oxc) | primary repo README | current | component list, confirmed downstream adopters (Rolldown, Nuxt, Nova, Preact, etc.) |
| [oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha.html](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha.html) | primary blog | 2026-03-11 | JS plugin alpha status, ESLint-API compatibility, WSL/Windows OOM caveat |
| [oxc.rs/docs/guide/usage/linter/editors.html](https://oxc.rs/docs/guide/usage/linter/editors.html) | primary docs | current | `oxlint --lsp` mechanism, editor coverage, type-aware-in-editor behavior |
| [github.com/oxc-project/oxc/issues/23976](https://github.com/oxc-project/oxc/issues/23976) | primary roadmap issue | Q3 2026 (Jul-Sep) | open/unfinished items: oxfmt Prettier removal, tsgolint TS7 stabilization work, 1.0 push |
| [oxc.rs](https://oxc.rs) | primary homepage | current | headline perf claims, sponsor list (VoidZero as Primary Sponsor) |
| [devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | primary (Microsoft) | 2026-07-08 | the actual TS7 API-gap statement, `@typescript/typescript6` shim, named-blocked-tools list |
| [typescript-eslint.io/rules/?=typeInformation](https://typescript-eslint.io/rules/?=typeInformation) | primary (typescript-eslint) | current (checked 2026-08-29) | ground truth for "61 type-aware rules," corrects the brief's "62" |
| [blog.cloudflare.com/voidzero-joins-cloudflare](https://blog.cloudflare.com/voidzero-joins-cloudflare/) | primary (Cloudflare) | 2026-06-04 | acquisition terms, open-source/vendor-neutral commitment, $1M ecosystem fund |
| [charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt) | practitioner report | 2026 | named rule gaps, real perf numbers including small-repo regressions, plugin-count cliff |
| [medium.com/manomano-tech/how-we-cut-lint-time-by-40-migrating-from-eslint-to-oxlint](https://medium.com/manomano-tech/how-we-cut-lint-time-by-40-migrating-from-eslint-to-oxlint-f534be696840) | practitioner report | 2026-07 | large-repo (~500k LOC) before/after numbers, dual-run approach in practice |
| npm registry (`npm view oxlint/oxfmt/oxlint-tsgolint/rolldown/vite/tsdown/@typescript-eslint/eslint-plugin/typescript`) | primary package metadata | checked 2026-08-29 | exact current versions, publish dates, and peer-dependency ranges — the hard evidence for the TS7 exclusion |
| [github.com/oxc-project/oxc CHANGELOG.md (oxlint package)](https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/CHANGELOG.md) | primary changelog | through v1.79.0 | dated, itemized feature/fix history confirming release cadence |

---
title: "Build tooling for TypeScript (2026)"
corpus: "grimoire-lore fleet: ocx-catalog, grimoire-indexer, grimoire-vscode, vscode-ocx, setup-ocx, fma, creeptd-ng/web, kate-middlechild"
agent: scout (build-bundle)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 19
scope: >
  Covers bundler/compiler choice and behavior for four fleet build shapes (VS Code
  extension, npm CLI, GitHub Action, browser SPA): Rolldown, Vite 8, esbuild, tsdown/
  tsup/unbuild, tsc emit vs bundler emit, bun build, source maps, dist drift, and the
  bundle-vs-don't-bundle tradeoff. Does NOT cover linting/formatting tools (Biome,
  oxlint — see other topic-map files) or test runners.
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

- Rolldown hit 1.0 stable on **2026-05-07**; current is **1.2.6 (2026-08-26)**, released weekly. [voidzero.dev](https://voidzero.dev/posts/announcing-rolldown-1-0)
- Vite 8.0 shipped **2026-03-12** with Rolldown as its *only* bundler (dev and build); current stable is **8.2.2**. [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8)
- Vite's own 19k-module benchmark: Rollup 40.10s → Rolldown 1.61s, ~25x. Real deployments: Linear 46s→6s, Beehiiv −64%, Ramp −57%, Mercedes-Benz.io −38%. [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8)
- `fma` and `creeptd-ng/web` are still on **Vite 6** (`^6.0.5` / `^6.0.0`) — two major versions behind; neither is on the `rolldown-vite` gradual-migration package either.
- esbuild is **not** dying: 0.28.2 shipped 2026-08-08, actively solo-maintained by Evan Wallace, now on trusted npm publishing, gained `es2026` target and ES2026 `with{type:'text'}` support this year. [CHANGELOG](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md)
- For a small, Node-target, CJS, fast-rebuild VS Code extension bundle, esbuild is still the right tool in 2026 — both fleet extensions build in well under a second and output 24–844 KB; Rolldown buys nothing here and adds a Rust toolchain dependency for no measurable win at this scale.
- tsup is **formally unmaintained**: its own README says "not actively maintained anymore, please use tsdown instead." [github.com/egoist/tsup](https://github.com/egoist/tsup)
- tsdown (Rolldown-powered, spiritual successor to tsup) is the ecosystem's converging choice for library/CLI bundling; current is v0.23.0-rc.1, with an automated `npx tsdown-migrate` path from tsup. [tsdown.dev/guide/migrate-from-tsup](https://tsdown.dev/guide/migrate-from-tsup)
- unbuild (UnJS) is still actively maintained (Nuxt/Nitro depend on it) but has **not** moved to Rolldown itself — it stays Rollup+esbuild-based and is experimenting with a separate, unstable "obuild" as its own Rolldown-based successor. [github.com/unjs/unbuild](https://github.com/unjs/unbuild)
- TypeScript 7.0.2 (Go rewrite, "Corsa") shipped **2026-07-08** with **no stable programmatic API** — typescript-eslint, ts-morph, Vue/Astro/Svelte/MDX/Angular tooling must stay on TS 6.x (or the `@typescript/typescript6` compat package) until 7.1, expected on TS's normal 3–4 month cadence. [devblogs.microsoft.com](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- Measured TS7 full-build speedups: VS Code 125.7s→10.6s (11.9x), Sentry 139.8s→15.7s (8.9x), Bluesky 24.3s→2.8s (8.7x); editor file-open latency improved ~13x. [devblogs.microsoft.com](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- `isolatedDeclarations` (TS 5.5+) requires every exported symbol's type to be resolvable without cross-file inference; violating code errors at typecheck time. `rolldown-plugin-dts` auto-selects `oxc` when it's on, `tsgo` when TS7 is the installed compiler, else `tsc`. [github.com/sxzz/rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)
- **Corpus correction to the brief:** setup-ocx does **not** use `bun build`. Its `scripts/build.ts` is a Bun-*run* script that calls the `esbuild` npm package to produce a Node-targeted CJS bundle; `action.yml` declares `using: node24`, which only runs plain JS, not a Bun-compiled binary. `bun build --compile` was never invoked anywhere in the fleet.
- `bun build --compile` (single-file executable) is real and documented, but it is the wrong tool for a `using: node24` GitHub Action — GitHub's JS-action runtime executes a Node script, not a standalone Bun binary, and `--compile` explicitly rejects `--target=node`. [bun.sh/docs/bundler/executables](https://bun.sh/docs/bundler/executables)
- **Corpus finding, not from the brief:** neither npm CLI (`ocx-catalog`, `grimoire-indexer`) is bundled at all — both build with bare `tsc` and ship raw compiled JS plus a real `node_modules` at install time.
- `grimoire-indexer` lists `astro` as a **runtime dependency** (for its Astro renderer) and its installed `node_modules` is **346 MB** — the strongest concrete argument in this fleet for adopting a bundler on the CLI shape.
- setup-ocx commits `dist/` and has **no CI step that rebuilds and diffs it** — the fleet's only reproducible-builds/dist-drift risk, currently unguarded.
- No source found states byte-reproducible bundler output is achieved or targeted by Rolldown, esbuild, tsdown, or Bun in 2026; treat "byte-reproducible" as **could not establish as of 2026-08-29** for any of them — the fleet's dist-drift practice must be a diff-and-fail check, not a byte-hash guarantee.

## Findings

### 1. Rolldown — foundation, stability, plugin compatibility, gaps

Rolldown reached **1.0 stable on 2026-05-07** ([voidzero.dev/posts/announcing-rolldown-1-0](https://voidzero.dev/posts/announcing-rolldown-1-0)) with a semver commitment: the public API is locked at `^1.0.0` with no planned breaking changes outside features explicitly marked experimental. The npm registry's current `dist-tags.latest` is **1.2.6**, published **2026-08-26**, with weekly releases visible back through 1.2.2 (2026-08-03) ([github.com/rolldown/rolldown/releases](https://github.com/rolldown/rolldown/releases)). Rolldown is built on **Oxc** — the same team's Rust parser/transformer/minifier — which VoidZero's own post describes as handling "the language work like parsing and minification" for Rolldown ([voidzero.dev](https://voidzero.dev/posts/announcing-rolldown-1-0)). Cloudflare acquired VoidZero (Vite/Vitest/Rolldown/Oxc) in mid-2026 with a stated open-source commitment.

Plugin compatibility: Rolldown implements Rollup's plugin API and Vite's own migration guide states "most existing Vite plugins work out of the box" ([vite.dev/guide/migration](https://vite.dev/guide/migration.html)). Concrete gaps, from the same migration guide:

- **No `format: 'system'` or `format: 'amd'` output** — anything still targeting SystemJS/AMD cannot move.
- **Oxc doesn't yet lower native (Stage-3 TC39) decorators** — projects need `@rolldown/plugin-babel` or `@rollup/plugin-swc` as a workaround. None of the fleet uses legacy `experimentalDecorators`, so this is currently moot but worth flagging if a repo adopts decorators.
- Still-experimental as of the 1.0 post: watch-mode rework, native `MagicString`, lazy barrel-file optimization.

### 2. Vite 8's migration to Rolldown (2026-03-12)

Vite 8.0 replaced the dual esbuild(dev)/Rollup(build) architecture with Rolldown for both, plus Oxc for JS minification/transforms and Lightning CSS for CSS minification by default ([vite.dev/guide/migration](https://vite.dev/guide/migration.html)). Concrete config changes:

- `build.rollupOptions` → `build.rolldownOptions`; `worker.rollupOptions` → `worker.rolldownOptions`.
- `optimizeDeps.esbuildOptions` → `optimizeDeps.rolldownOptions` (old name auto-converted with a deprecation warning; `esbuild.supported` has **no** Oxc equivalent).
- `esbuild` top-level config key → `oxc` (auto-converted, deprecated).
- `build.rollupOptions.output.manualChunks` **object form removed**; function form deprecated in favor of `codeSplitting`.
- `build.commonjsOptions` is now a no-op; `resolve.alias[].customResolver` removed (use a `resolveId` hook plugin instead).
- **Default minimum browser targets raised** to 2026-01-01 Baseline Widely Available: Chrome 107→111, Safari 16.0→16.4, Firefox 104→114, Edge 107→111.
- **CJS default-import interop behavior changed** — dev and build now agree; a `legacy.inconsistentCjsInterop: true` escape hatch exists for the old (inconsistent) behavior.
- JS API: `build()` now throws a `BundleError` (`Error & { errors?: RolldownError[] }`) instead of a raw error.

Migration path for large/complex projects: adopt the `rolldown-vite` npm package first (drop-in for Vite 7 semantics with Rolldown underneath) before jumping to `vite@8` directly ([vite.dev/guide/migration](https://vite.dev/guide/migration.html)). Both fleet SPAs (`fma` on Vite ^6.0.5, `creeptd-ng/web` on Vite ^6.0.0) have **not** taken this path and are two majors behind; a straight jump to Vite 8 skips the gradual `rolldown-vite` step entirely, which the docs frame as intended for "complex projects" specifically.

Performance, from Vite's own post: their 19,000-module benchmark went from 40.10s (Rollup) to 1.61s (Rolldown), ~25x; reported field numbers: Linear 46s→6s, Ramp −57%, Mercedes-Benz.io −38%, Beehiiv −64% ([vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8)).

### 3. esbuild — current state and fitness for a VS Code extension bundle

Current version **0.28.2**, published **2026-08-08**, fixing a tree-shaking bug tied to TypeScript import aliases ([GitHub releases via API](https://api.github.com/repos/evanw/esbuild/releases)). Prior releases: **0.28.1** (2026-06-11, a security fix — local dev server path traversal on Windows via backslash, GHSA-g7r4-m6w7-qqqr) and **0.28.0** (2026-04-02, added `with { type: 'text' }` import support and — per the changelog — a Go 1.26 toolchain upgrade and TypeScript-7-target support) ([CHANGELOG.md](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md)). Recent commit history shows continued active solo development by Evan Wallace, including an `es2026` build target added 2026-08-09 and dropping the Deno-registry publish path (deno.land/x went read-only) ([commit history](https://api.github.com/repos/evanw/esbuild/commits?path=CHANGELOG.md)). GitHub/npm's push toward trusted publishing means esbuild's npm packages are now built and signed by a CI-hosted VM rather than published manually — a supply-chain hardening, not a maintenance-health signal either way.

No source read states esbuild is being deprecated, sunset, or folded into the VoidZero toolchain; it continues as an independent project.

**For this fleet's VS Code extension shape specifically**: both `grimoire-vscode` and `vscode-ocx` build a small, Node-CJS-target, `vscode`-external bundle. Measured on disk: `vscode-ocx/dist/extension.js` is **24 KB**, `grimoire-vscode/dist/extension.js` (host bundle) is **844 KB**. esbuild's context/watch API (`esbuild.context(...).watch()`) is exactly what both `esbuild.js` scripts already use for incremental rebuilds, and esbuild's rebuild latency at this file count is sub-second. Rolldown would add a second Rust-toolchain dependency to the extension's devDependency graph, a plugin-API layer neither extension needs (no third-party Rollup/Vite plugins in use), and buys no measurable speed at KB-scale bundles where esbuild is already far below any perceptible threshold. **Verdict: keep esbuild for both VS Code extensions; no case to switch.**

### 4. tsdown vs tsup vs unbuild for library/CLI bundling

**tsup** (esbuild-powered) is explicitly unmaintained by its own author: the GitHub README reads "This project is not actively maintained anymore. Please consider using tsdown instead. Read more in the migration guide." ([github.com/egoist/tsup](https://github.com/egoist/tsup)). This is a first-party abandonment notice, not a community rumor.

**tsdown** (current: v0.23.0-rc.1) is the stated successor, Rolldown-powered, and positions itself as "the spiritual successor to tsup" with three claimed advantages: Rolldown's raw speed, a wider plugin surface (Rolldown + Rollup + unplugin plugins all work), and more built-ins (CSS, executable bundling, workspace mode, package validation) ([tsdown.dev/guide/faq](https://tsdown.dev/guide/faq)). Migration is a two-stage, tool-assisted process: `npx tsdown-migrate` installs tsdown v0.22.14 first (last version that still accepts tsup's option names with deprecation warnings), you resolve the warnings, then upgrade to `^0.23.0+`, which drops the compat shim ([tsdown.dev/guide/migrate-from-tsup](https://tsdown.dev/guide/migrate-from-tsup)).

**unbuild** (UnJS ecosystem — Nuxt, Nitro depend on it directly) remains actively maintained but has **not** adopted Rolldown for its own bundling: its README states it stays Rollup+esbuild-based and is "experimenting with `obuild` as the next next-gen successor based on rolldown" as a *separate*, unstable project ([github.com/unjs/unbuild](https://github.com/unjs/unbuild)). unbuild's differentiator is "stub mode" — developing a library without a watch process at all — which neither tsup nor tsdown offers.

**Declaration emit story**: tsdown's `dts` option auto-enables when `package.json` declares `types`/`typings` or a `types` export condition, and under the hood can use `rolldown-plugin-dts`, which requires **Rolldown ≥1.2.0** and **Node `^22.18.0 || ^24.11.0 || >=26.0.0`** ([github.com/sxzz/rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)). It picks a generator automatically: `oxc` (fast, needs `isolatedDeclarations: true`) when that compiler option is on, `tsgo` (experimental) when TypeScript 7 is the installed compiler, else falls back to plain `tsc` (TS 5.x/6.x, full compatibility including Vue/Volar). **Combined JS+`.d.ts` chunk output is ESM-only** — CJS packages need a separate `emitDtsOnly` pass, and `export =`/`import x = require(...)` syntax is explicitly flagged as unreliable to bundle.

**Neither fleet npm CLI uses any of these three tools today** — see Finding 6.

### 5. `tsc` for emit vs a bundler for emit

`isolatedDeclarations` (TypeScript 5.5+) requires that every exported symbol's type be resolvable from that file alone — no cross-file inference for function return types, class properties, or variable declarations lacking a literal-inferrable initializer ([typescriptlang.org/tsconfig#isolatedDeclarations](https://www.typescriptlang.org/tsconfig/#isolatedDeclarations)). Violations are compile errors, not warnings. The payoff is that `.d.ts` generation becomes embarrassingly parallel and can be done by a non-`tsc` tool (Oxc, in Rolldown's case) at Rust speed instead of running the full TypeScript type-checker.

TypeScript 7.0.2 shipped **2026-07-08** — a full Go rewrite ("Project Corsa") with 8–12x measured full-build speedups and **no stable programmatic API in 7.0** ([devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)). Measured, from the official post: VS Code 125.7s→10.6s (11.9x), Sentry 139.8s→15.7s (8.9x), Bluesky 24.3s→2.8s (8.7x), memory down 6–26% across tested codebases, editor file-open latency down ~13x (17.5s→1.3s). Until 7.1 ships (no fixed date; the team states "a fairly similar timeline to releases prior to 7.0 … every 3–4 months"), any tool that embeds the TypeScript compiler programmatically — typescript-eslint, ts-morph, and by extension Vue/MDX/Astro/Svelte/Angular's own tooling — must keep TS 6.x, or install the `@typescript/typescript6` compatibility package alongside a project otherwise on 7. This is why **five of the fleet's nine repos are still declaring `^6.0.3`** rather than jumping to `^7.0.2` — it is the correct, forced choice for any repo running typescript-eslint (all nine do) or ts-morph, not an oversight.

Practical implication for `tsc`-for-emit repos (`ocx-catalog`, `grimoire-indexer`): they get zero benefit from TS7's speedup today, because a TS7 upgrade would break their own linting via typescript-eslint. The correct sequencing is: adopt `isolatedDeclarations` now (works on TS 6.x, no compiler-version dependency) to cut declaration-emit time and get parallelizable output; defer the TS7 compiler jump until typescript-eslint ships 7.1 support.

### 6. `bun build` — production viability for a GitHub Action bundle

Bun's own docs recommend, for production deployment of a compiled executable: `bun build --compile --minify --sourcemap ./path/to/app.ts --outfile myapp`, optionally adding `--bytecode` to move JS-engine bytecode compilation from runtime to build time — the docs cite a "2x faster tsc start" example for bytecode compilation specifically ([bun.sh/docs/bundler/executables](https://bun.sh/docs/bundler/executables)). Sourcemaps under `--compile` are embedded zstd-compressed inside the binary and resolved automatically on error. N-API native addons (`.node` files) are supported via direct `require("./addon.node")`, with a caveat that tools like `@mapbox/node-pre-gyp` need the `.node` file required directly or it "won't bundle correctly." Cross-compilation targets cover linux/windows/darwin × x64/arm64, plus musl variants for Linux.

**Explicitly unsupported under `--compile`**: `--outdir`, `--public-path`, `--target=node`, `--target=browser` without an HTML entrypoint, and `--no-bundle` (Bun always bundles under `--compile`).

**Corpus correction**: the brief states "the fleet ships an Action built with [`bun build`]." That is not what the repo does. `setup-ocx/scripts/build.ts` is executed *by* Bun (`bun scripts/build.ts` in `package.json`'s `build` script) but the script itself calls the **esbuild npm package's JS API** (`esbuild.build({...})`) to produce a Node-CJS bundle targeting `node24`, then writes a `{"type":"commonjs"}` shim so the ESM-declaring root `package.json` doesn't reinterpret the output. `action.yml` declares `runs: { using: node24, main: dist/setup/index.js }` — GitHub's JS-action runtime, which executes the file with Node, not with Bun, and categorically cannot run a `bun build --compile` standalone binary (that mode is explicitly incompatible with `--target=node` per Bun's own docs above). `bun build --compile` appears nowhere in this repo. **Bun's actual role here is "fast script runner for a build script," not "the Action's bundler."** This is the right architecture for a `using: node24` action — a Bun-native binary would need a Docker or composite action instead, which setup-ocx correctly avoids — but it means the brief's framing needs correcting, not endorsing.

### 7. Source maps in production

Node's built-in `--enable-source-maps` flag (stable since Node 12.12, or `NODE_OPTIONS=--enable-source-maps`, or `module.setSourceMapsSupport()` programmatically since Node 22.14) maps a minified/bundled stack trace back to original TS source with reportedly negligible steady-state overhead; the main documented cost is at throw-time, not per-request ([search-derived, multiple sources agree; no single primary spec page fetched — treat the "negligible" claim as vendor-reported, not independently benchmarked in any source read]). Node's legacy alternative, the `source-map-support` package (evanw/node-source-map-support), remains the fallback path for Node versions before the native flag existed; the fleet's floor of Node 20 already has `--enable-source-maps` natively, so `source-map-support` is not needed as a dependency anywhere in this fleet.

Distinct guidance for CLI vs extension, cross-checked against practice: a CLI that ships to users should ship real (unminified-mapped) source maps and either bundle `--enable-source-maps` into its own shebang/`NODE_OPTIONS`, or document the flag, because "improve error diagnostics" beats the marginal parse cost of a maps file at CLI-invocation scale. Both fleet VS Code extensions already do this correctly: `esbuild.js` sets `sourcemap: !production` — maps ship in dev builds for the debugger, and are stripped for the marketplace `.vsix` (smaller package, no exposed source layout to end users, VS Code's own extension host doesn't consume external sourcemaps by default in production installs anyway).

### 8. Reproducible builds and dist drift

`setup-ocx` commits `dist/setup/index.js`, `dist/save-cache/index.js`, and per-directory `licenses.txt`/`package.json` shims directly to the repo (required, since GitHub Actions run the committed file, not a build step) — confirmed by reading the committed files and `action.yml`'s `runs.main: dist/setup/index.js`. **No workflow in `.github/workflows/` rebuilds `dist/` and diffs it against the committed copy** — `verify-basic.yml` dogfoods the action's *behavior* (runs it, checks outputs) but never runs `npm run build && git diff --exit-code dist/`. This is the standard pattern used by, e.g., GitHub's own `dependabot-action` (`check-dist.yml` workflow, found via GitHub Marketplace/Actions search) and the widely-copied `actions/typescript-action` template: build in CI, `git diff --exit-code`, fail if the committed `dist/` doesn't match a fresh build. No primary source read for this brief describes a way to get **byte-reproducible** output from esbuild, Rolldown, or Bun's bundler across machines/CI runs (nondeterministic ordering of parallel workers, embedded timestamps, and Rust-vs-Node minifier internals were not addressed by any source read) — treat byte-reproducibility as **could not establish as of 2026-08-29**; the achievable and standard bar is *behavioral* drift-detection (rebuild + diff), not cryptographic reproducibility.

### 9. Bundling vs not bundling a Node CLI

The two npm-distributed CLIs in this fleet are **not bundled at all**: `ocx-catalog`'s `build` script is bare `tsc` (plus a `postbuild` `chmod` step), and `grimoire-indexer`'s `build` script is `tsc -p tsconfig.json` plus asset copying — both ship raw per-file compiled JS and rely on npm's normal `node_modules` resolution at install time. This is the classic "don't bundle a published library/CLI" position (transparent `node_modules`, no bundler-introduced resolution bugs, debuggable stack traces without sourcemaps at all) — but it has a real, measured cost in this exact fleet: `grimoire-indexer` lists **`astro` as a runtime dependency** (not a devDependency — it needs Astro at runtime to render sites) and its installed `node_modules` measures **346 MB** on disk. That is the install-size cost every consumer of `npx grim-indexer` or `npm i -g grimoire-indexer` pays, unbundled. `ocx-catalog`'s dependency list (`commander`, `markdown-it`, `highlight.js`, `minisearch`, `dompurify`, `@vueuse/core`, `reka-ui`, two `@fontsource/*` packages) is smaller in dependency *count* but includes font-asset packages that are also non-trivial on disk unbundled.

No source read in this research measured Node CLI cold-start time bundled-vs-unbundled with a controlled benchmark; the closest data point found was a general (non-fleet, non-primary) claim that bundling+minifying can cut Node cold-start "up to 70%" and an unrelated Node-to-Bun CLI migration measuring 151ms→118ms (28%) — neither isolates the bundle/no-bundle variable cleanly, so **treat "how much bundling saves this specific fleet's CLI startup" as could not establish as of 2026-08-29**; the install-size number (346 MB) is the only fleet-specific, directly-measured cost found.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt/keep/drop/watch | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| Rolldown | Rust bundler, Rollup-plugin-API-compatible, Oxc-powered | 1.2.6 (2026-08-26); 1.0 stable 2026-05-07 | stable, semver-locked | **watch** (SPA shape only) | Right engine under Vite 8, but fleet SPAs haven't reached Vite 8 yet — nothing to adopt directly | esbuild+Rollup dual pipeline inside Vite |
| Vite 8 | dev server + build, single bundler = Rolldown | 8.2.2 stable; 8.0 released 2026-03-12 | stable | **adopt** (fma, creeptd-ng/web) | 10–30x measured build speedups, full plugin compat; fleet is 2 majors behind on `^6.x` | Vite 6/7's esbuild-dev + Rollup-build split |
| esbuild | Go bundler/minifier, JS+CJS/ESM/IIFE, watch API | 0.28.2 (2026-08-08) | stable, actively solo-maintained | **keep** (VS Code extensions, setup-ocx build step) | Sub-second at this KB scale; Rolldown adds a toolchain dep for zero measurable win here | nothing — still the right tool for this shape |
| tsup | esbuild-powered library bundler | last active per its own README notice | **unmaintained** (author's own words) | **drop** | README: "not actively maintained anymore … use tsdown instead" | superseded by tsdown |
| tsdown | Rolldown-powered library/CLI bundler, dts via rolldown-plugin-dts | v0.23.0-rc.1 | pre-1.0, fast-moving, ecosystem's stated successor to tsup | **adopt** (if fleet CLIs bundle) | tsup's own doc names it the successor; automated tsup migration tool exists | tsup; and, if adopted, the fleet's current bare-`tsc` CLI build |
| unbuild | Rollup+esbuild UnJS bundler with stub mode | actively maintained (UnJS-core dependency of Nuxt/Nitro) | mature, stable | **watch** | Hasn't moved to Rolldown itself (experimenting separately via `obuild`); no fleet UnJS dependency today | n/a for this fleet |
| rolldown-plugin-dts | `.d.ts` generation/bundling for Rolldown-based tools | requires Rolldown ≥1.2.0, Node ^22.18/^24.11/≥26 | early, actively developed | **watch** | ESM-only combined output, `export =` unreliable — check fleet's CJS/ESM shape before adopting | manual `tsc --declaration` pass, in Rolldown-based pipelines |
| `bun build --compile` | Bun's single-file standalone-executable compiler | current per bun.sh docs (Bun 1.3.10 installed in this env) | stable, documented, actively evolving | **not applicable** to setup-ocx | Incompatible with `--target=node`; GH Action here runs `using: node24`, not a Bun binary | nothing in this fleet — never actually used here |
| `bun` (as script runner) | executes `scripts/build.ts`, which calls esbuild | Bun 1.3.10 | stable | **keep** | Correctly used only as the runner; the actual bundler is esbuild | n/a |
| `tsc` (bare, for emit) | type-checks + emits per-file JS/`.d.ts` | TS ^5.9.3–^6.0.3 across fleet | stable | **keep, but add `isolatedDeclarations`** | Works today; 346 MB unbundled install size on grimoire-indexer is the concrete cost of *not* pairing it with a bundler | n/a |
| TypeScript 7 (`tsgo`, Corsa) | Go-native compiler, 8–12x faster full builds | 7.0.2 (2026-07-08) | stable runtime, **no stable programmatic API** | **watch** (blocked by typescript-eslint/ts-morph on all 9 repos) | Every fleet repo runs typescript-eslint; jump breaks linting until TS 7.1 ships an API | n/a — additive once unblocked |
| `--enable-source-maps` (Node) | native stack-trace remapping via sourcemap | stable since Node 12.12; `setSourceMapsSupport` since 22.14 | stable | **adopt** for both npm CLIs | Zero extra dependency, fleet's Node floor already supports it natively | `source-map-support` npm package |

## Normative guidance candidates

1. **Rule**: A `.github/*action.yml` JS action that is CI-executed by Node (`runs.using: nodeNN`) must never be built with `bun build --compile`.
   Rationale: `--compile` output is a standalone Bun binary, not a Node-runnable script; GitHub's JS-action runtime cannot execute it.
   Verify: `grep -q '^runs:' action.yml && grep -q 'using: node' action.yml` → then confirm the build script's bundler output format is CJS/ESM JS, not a Bun binary (`file dist/**/index.js` should say "JavaScript source", not an ELF/Mach-O/PE binary).

2. **Rule**: Any committed `dist/` for a GitHub Action must have a CI job that rebuilds from source and fails on diff.
   Rationale: an uncommitted-vs-committed drift silently ships stale/tampered code to every consumer of the Action.
   Verify: a workflow step running `npm run build && git diff --exit-code -- dist/` (or equivalent) exists and runs on every PR touching source files.

3. **Rule**: A repo running typescript-eslint (all nine fleet repos do) must not set `"typescript"` above `^6.x` until typescript-eslint publishes TS7 support.
   Rationale: TypeScript 7.0 has no stable programmatic API; typescript-eslint cannot run on it.
   Verify: `npm ls typescript-eslint` shows a version whose own `package.json` `peerDependencies.typescript` range includes `^7`; until then, `package.json`'s `typescript` devDependency stays `^6.x` or lower.

4. **Rule**: An npm-published CLI whose `dependencies` (not `devDependencies`) include a framework-sized package (Astro, a full UI framework, etc.) should bundle before publish, not ship raw `tsc` output with `node_modules`.
   Rationale: unbundled install size is a directly measured, user-facing cost (346 MB observed for grimoire-indexer today).
   Verify: `du -sh node_modules` after a clean `npm ci` on the published package tarball; if the number depends on a runtime dependency that only the CLI's own code touches (not each of its own consumers' code), that dependency is a bundling candidate, not a peer expectation.

5. **Rule**: A Node CLI or GitHub Action shipping compiled/minified JS must ship a source map and either enable `--enable-source-maps` in its own entrypoint or document the flag for consumers.
   Rationale: negligible-cost, native (Node ≥12.12), no new dependency; the alternative is unreadable minified stack traces in bug reports.
   Verify: entrypoint script or shebang sets `NODE_OPTIONS` / calls `module.setSourceMapsSupport(true)`, or the package's error-reporting docs name the flag explicitly.

6. **Rule**: Before enabling `isolatedDeclarations`, run `tsc --noEmit` with the flag on and read every resulting error as a required type annotation, not a lint nag to suppress.
   Rationale: it is a hard compiler gate (TS 5.5+), not advisory, and unblocks Oxc/rolldown-plugin-dts-speed declaration emit without waiting on TS7.
   Verify: `tsc --noEmit -p tsconfig.json` with `"isolatedDeclarations": true` set exits 0.

7. **Rule**: A Vite 6/7 repo migrating straight to Vite 8 must first check `build.rollupOptions`, `optimizeDeps.esbuildOptions`, and any `manualChunks` object/function usage against the Vite 8 migration guide's renamed/removed keys before upgrading — do not rely solely on the auto-conversion shim staying silent.
   Rationale: `esbuild.supported` has no Oxc equivalent, and `manualChunks` object form is removed outright, not deprecated.
   Verify: `grep -n "rollupOptions\|esbuildOptions\|manualChunks" vite.config.*` and hand-check each hit against the migration guide before running `vite@8` for the first time.

## AI-agent angle

- **Recommends `bun build` for any GitHub Action written in TypeScript, without checking `action.yml`'s `runs.using`.** An agent pattern-matches "Bun is in the repo → use `bun build --compile`" and misses that `--compile` output can't run under a Node-executed JS action. Mechanical check: read `action.yml`'s `runs:` block before touching the build script; if `using: node*`, the output must be plain JS, never a binary.
- **Recommends tsup for new library/CLI bundling** because it's the highest-download, most-familiar name in training data, missing that its own README now says it is unmaintained and points at tsdown. Mechanical check: `npm view tsup time.modified` vs `npm view tsdown time.modified` — or simply fetch the tsup GitHub README and grep for "not actively maintained."
- **Bumps `typescript` to `^7.x` "for the speed" without checking `typescript-eslint`'s peer range**, breaking every repo's lint step. Mechanical check: after any TypeScript major bump, run `npx eslint --version && npx eslint . --max-warnings 0` (or just `npm ls typescript-eslint`) before considering the bump done — a failure to resolve peer deps or a runtime crash on `typescript-eslint` is the tell.
- **Cites `esbuild.supported` as a working Vite 8 config key** because it worked in Vite 6/7 examples in training data; the key still parses (auto-converted) but silently loses meaning since Oxc has no equivalent. Mechanical check: `grep -n "esbuild:" vite.config.*` after any Vite-8 migration and manually diff against the migration guide's "no Oxc equivalent" list, since ESLint/TS won't flag a silently-ignored option.
- **Assumes Rolldown output is byte-reproducible across CI runs** and proposes a hash-based dist-drift check instead of a rebuild-and-diff one. Mechanical check: run the build twice in the same CI job and `diff` the two outputs before trusting any hash-pinning scheme — no source read for this brief confirms determinism across environments, only within one.
- **Suggests adding `source-map-support` as a dependency** for a CLI on Node ≥18, unaware the native `--enable-source-maps` flag (stable since Node 12.12) already covers it with zero new dependency. Mechanical check: `node -e "console.log(process.version)"` against the repo's floor — if ≥12.12 (every fleet repo qualifies), the npm package is redundant.

## Contested / evolving

- **Whether `manualChunks` (function form) should be used at all vs Rolldown's newer `codeSplitting` option** — Vite 8's migration guide deprecates the function form in favor of `codeSplitting` but doesn't remove it outright (unlike the object form, which is gone). As of 2026-08-29 this reads as "trending toward `codeSplitting`, not yet forced."
- **Whether `unbuild` will eventually fold into Rolldown-based `obuild` as its primary engine, or keep both** — the unbuild README frames `obuild` as a separate, experimental "next next-gen successor," not a stated replacement timeline. Direction is toward Rolldown across the whole UnJS-adjacent ecosystem, but no committed date was found.
- **Whether TypeScript 7.1's new programmatic API will look anything like TS 6's** — the official 7.0 announcement explicitly warns 7.1 ships "a new (and different) API," meaning typescript-eslint/ts-morph will need real porting work, not a drop-in bump. This is the single biggest unresolved variable for every "when can the fleet move to TS7" question in this corpus, and no date more specific than "3–4 months, similar to past cadence" was found as of 2026-08-29.
- **Byte-reproducible bundler output** — genuinely unaddressed in every primary source read for this brief (Rolldown, esbuild, tsdown, Bun docs). Either it's a solved-and-unremarked-upon problem, or it isn't a design goal for any of these tools yet; this research could not distinguish the two as of 2026-08-29.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| When does TS 7.1's new programmatic API land, and does typescript-eslint adopt it same-day? | Gates every repo's TS7 (and thus tsgo-speed builds) upgrade | devblogs.microsoft.com TS7 post | high | high — explicitly "3-4 months out" as of this writing |
| Should `fma` and `creeptd-ng/web` skip straight to Vite 8 or route through `rolldown-vite` first? | Vite's own guide recommends the gradual path for "complex" projects; both SPAs qualify (WebGL/Pinia/Connect-RPC) | vite.dev/guide/migration | high | medium |
| Does grimoire-indexer's `astro` runtime dependency belong in `dependencies` at all, or should the Astro renderer be optional/bundled? | Directly measured 346 MB unbundled install cost | repo package.json + `du -sh node_modules` | high | low — an architecture question, not a moving target |
| Should setup-ocx add a `git diff --exit-code dist/` CI gate? | Zero such gate exists today; this is the fleet's one unguarded reproducibility risk | repo `.github/workflows/*.yml` (absence) | high | low |
| Is `isolatedDeclarations` worth turning on now, ahead of any bundler change? | Works on today's TS 6.x, no compiler-version dependency, unlocks faster `.d.ts` emit later | typescriptlang.org/tsconfig | medium | low |
| Does Oxc's decorator-lowering gap affect any fleet repo now or on a near-term feature? | Currently moot (no `experimentalDecorators` in fleet) but would block a straight-to-Rolldown SPA move if adopted | vite.dev/guide/migration | low | medium |
| What replaces `build.commonjsOptions` behavior now that it's a no-op under Rolldown? | Silent no-op is a worse failure mode than a removed option (no error, just ignored) | vite.dev/guide/migration | medium | low |
| Is bytecode compilation (`bun build --compile --bytecode`) relevant to any *actual* fleet Bun use, given setup-ocx doesn't compile at all? | Prevents an agent from "fixing" setup-ocx toward a mode that can't run under `using: node24` | bun.sh/docs/bundler/executables + repo action.yml | medium | low |
| Should ocx-catalog/grimoire-indexer adopt tsdown, or is bare `tsc` correct for their size? | Directly answers the brief's "library/CLI bundling" question against the fleet's real (unbundled) baseline | tsdown.dev + repo package.json scripts | high | medium — tsdown is pre-1.0 and moving fast |
| Does Lightning CSS (Vite 8's new default CSS minifier) change anything for creeptd-ng/web's Vue SFC styles? | Not investigated in this pass — flagged only via the migration-guide summary, not independently verified | vite.dev/guide/migration (surface mention only) | medium | medium |
| What's the actual (not vendor-claimed) overhead of `--enable-source-maps` at CLI-invocation scale for ocx-catalog/grimoire-indexer? | Search-derived "negligible" claim was never independently verified against a primary benchmark in this pass | none fetched — gap | low | low |
| Is Rolldown's watch-mode rework stable enough yet for `fma`'s dev-server hot-reload path once it's on Vite 8? | Called out as still-experimental in Rolldown's own 1.0 post | voidzero.dev | medium | high |
| Does the fleet have any `format: 'system'` or `format: 'amd'` output anywhere that would hard-block a Vite 8 move? | Rolldown drops both formats outright; worth a one-time grep before any SPA migrates | vite.dev/guide/migration + fleet grep (not run this pass) | low | low |
| What happens to `vscode-ocx`/`grimoire-vscode`'s `esbuild.tests.js` test-bundle path if esbuild is ever retired fleet-wide? | Distinct build script from the main extension bundle; not inspected in this pass | repo file (not read this pass) | low | low |
| Should the fleet standardize on Oxc-based linting for TS7-only code once 7.1's API lands, replacing typescript-eslint entirely? | A genuinely open architectural question once the API-gate lifts; out of scope for build tooling narrowly but adjacent | inferred from TS7 API-gap finding | low | high |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8) | Vite's own 8.0 release announcement | 2026-03-12 | Primary source for the Rolldown migration, breaking changes, and Vite's own benchmark numbers |
| [vite.dev/guide/migration](https://vite.dev/guide/migration.html) | Vite 8 migration guide | current as of fetch, 2026-08 | Exact config-key renames, removed options, browser-target changes, CJS interop flag |
| [voidzero.dev/posts/announcing-rolldown-1-0](https://voidzero.dev/posts/announcing-rolldown-1-0) | VoidZero's Rolldown 1.0 announcement | 2026-05-07 | Primary source for Rolldown's stability commitment, Oxc relationship, roadmap gaps |
| [github.com/rolldown/rolldown/releases](https://github.com/rolldown/rolldown/releases) | Rolldown GitHub releases | fetched 2026-08-29, latest tag 2026-08-26 | Exact current version and release cadence |
| [registry.npmjs.org/rolldown](https://registry.npmjs.org/rolldown) | npm registry metadata for `rolldown` | fetched 2026-08-29 | Confirms `dist-tags.latest = 1.2.6` |
| [github.com/evanw/esbuild/blob/main/CHANGELOG.md](https://github.com/evanw/esbuild/blob/main/CHANGELOG.md) | esbuild's own changelog | fetched 2026-08-29 | Primary source for 0.28.x feature/fix content |
| [github.com/evanw/esbuild/releases](https://api.github.com/repos/evanw/esbuild/releases) (via GitHub API) | esbuild GitHub releases, structured | fetched 2026-08-29 | Authoritative publish dates: 0.28.2 (2026-08-08), 0.28.1 (2026-06-11), 0.28.0 (2026-04-02) |
| [api.github.com/repos/evanw/esbuild/commits](https://api.github.com/repos/evanw/esbuild/commits?path=CHANGELOG.md&per_page=3) | esbuild commit history | fetched 2026-08-29 | Confirms continued active solo maintenance into August 2026 |
| [tsdown.dev/guide/faq](https://tsdown.dev/guide/faq) | tsdown's own FAQ | fetched 2026-08-29, v0.23.0-rc.1 | Primary source for tsdown's positioning vs tsup, declaration-emit approach |
| [tsdown.dev/guide/migrate-from-tsup](https://tsdown.dev/guide/migrate-from-tsup) | tsdown's migration guide | fetched 2026-08-29 | Exact migration tool/steps, version gate (v0.22.14 → ^0.23.0+) |
| [github.com/egoist/tsup](https://github.com/egoist/tsup) | tsup's own repo/README | fetched 2026-08-29 | Primary, first-party abandonment notice pointing at tsdown |
| [github.com/unjs/unbuild](https://github.com/unjs/unbuild) | unbuild's own repo/README | fetched 2026-08-29 | Primary source: still Rollup+esbuild, `obuild` framed as a separate experiment |
| [github.com/sxzz/rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts) | rolldown-plugin-dts's own repo README | fetched 2026-08-29 | Exact version/Node requirements, three-generator auto-selection logic, ESM-only caveat |
| [typescriptlang.org/tsconfig/#isolatedDeclarations](https://www.typescriptlang.org/tsconfig/#isolatedDeclarations) | official TS compiler-option reference | fetched 2026-08-29 | Authoritative definition and requirements of `isolatedDeclarations` |
| [devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | official TypeScript 7.0 announcement | 2026-07-08 | Primary source for TS7 measured speedups and the no-programmatic-API gap |
| [bun.sh/docs/bundler/executables.md](https://bun.sh/docs/bundler/executables.md) | Bun's own docs for `--compile` | fetched 2026-08-29 | Primary source for production `bun build --compile` flags, unsupported-flag list, native-addon handling |
| `/home/mherwig/dev/setup-ocx/scripts/build.ts`, `action.yml`, `.github/workflows/*.yml` | this fleet's own source | read 2026-08-29 | Ground truth that setup-ocx uses esbuild-via-Bun-script, not `bun build --compile`, and has no dist-drift CI gate |
| `/home/mherwig/dev/{ocx-catalog,grimoire-indexer}/package.json` | this fleet's own source | read 2026-08-29 | Ground truth that both npm CLIs build with bare `tsc`, and grimoire-indexer's `astro` runtime dependency |
| `/home/mherwig/dev/{grimoire-vscode,vscode-ocx}/esbuild.js` + `dist/extension.js` sizes | this fleet's own source | read 2026-08-29 | Ground truth for esbuild config shape and measured output bundle sizes (24 KB / 844 KB) |

---
title: Web Performance Measurement Topic Map
corpus: Lighthouse / Lighthouse CI docs, web.dev Core Web Vitals + CrUX docs, Vite/Rolldown docs, VitePress/Astro docs, React Compiler + Vue reactivity docs, size-limit/bundlesize, npm registry, and the fleet's own wiring (ocx-catalog .lighthouserc.cjs, taskfile.yml, ci.yml)
agent: web-performance scout (typescript-topic-map)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 24
scope: |
  Web performance MEASUREMENT tooling and gating for the site-shipping and
  SPA members of the fleet: Lighthouse/LHCI, Core Web Vitals, CrUX/PSI,
  bundle-size budgets, VitePress/Astro SSG defaults, React Compiler/Vue 3.5
  reactivity, and image/font discipline. Excludes general TS language rules
  (covered by sibling scouts), server-side/API performance, and Electron
  perf for the VS Code extensions (no web-vitals surface there).
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [Lighthouse and Lighthouse CI](#1-lighthouse-and-lighthouse-ci)
  2. [Core Web Vitals as of 2026](#2-core-web-vitals-as-of-2026)
  3. [PageSpeed Insights / CrUX vs. lab testing](#3-pagespeed-insights--crux-vs-lab-testing)
  4. [Bundle-size budgets](#4-bundle-size-budgets)
  5. [Static-site-generator performance](#5-static-site-generator-performance)
  6. [Runtime performance for the SPAs](#6-runtime-performance-for-the-spas)
  7. [Image, font and asset discipline](#7-image-font-and-asset-discipline)
  8. [What ocx-catalog's existing LHCI wiring actually does](#8-what-ocx-catalogs-existing-lhci-wiring-actually-does)
- [Tool verdicts](#tool-verdicts)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Candidate topics](#candidate-topics)
- [Sources](#sources)

## Summary

- **`ocx-catalog`'s `@lhci/cli` is not a naive stub — it is already a mature, CI-enforced gate.** `.lighthouserc.cjs` asserts `categories:*` (not individual audits), thresholds are measured medians of 3 runs minus a margin, and a red state was proven with a deliberate a11y regression before being trusted. This is materially better than the median AI-agent default.
- **But the existing config's own docblock claims "measured category medians" while never setting `aggregationMethod`, so LHCI silently defaults to `"optimistic"` — the best of 3 runs, not the median** — a real, fixable gap between stated intent and actual gate behavior ([LHCI configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)).
- **`@lhci/cli` itself is stale: 0.15.1 published 2025-06-25, pinning `lighthouse@12.6.1` exactly, while standalone `lighthouse` is at 13.4.1 (2026-07-20).** 14 months with no release is a real risk signal for a tool this central to a CI gate.
- **INP is not part of the Lighthouse performance *score* at all** — the category weights (LCP 25% / TBT 30% / CLS 25% / FCP 10% / Speed Index 10%) have not changed since Lighthouse 10, and Lighthouse cannot synthesize real user interaction timing in a single-page lab run, so it uses TBT as a lab proxy for responsiveness instead ([Chrome for Developers, performance-scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)).
- **INP fully replaced FID as a Core Web Vital**, with good ≤200ms, needs-improvement 200–500ms, poor >500ms, at p75 ([web.dev/articles/inp](https://web.dev/articles/inp)). LCP good ≤2.5s, poor >4.0s ([web.dev/articles/lcp](https://web.dev/articles/lcp)). CLS good ≤0.1, poor >0.25 ([web.dev/articles/cls](https://web.dev/articles/cls)). No new Core Web Vital has been promoted — the set is still exactly LCP/INP/CLS ([web.dev/articles/vitals](https://web.dev/articles/vitals)).
- **CrUX explicitly requires enough real-user sample volume to be statistically significant, and Google does not disclose the number** ([developer.chrome.com/docs/crux/methodology](https://developer.chrome.com/docs/crux/methodology)). Every site this fleet ships (a package-index docs site, an internal indexer's docs site) is a low-traffic property that plausibly never clears that bar — meaning CrUX-based field gating is not an option for this fleet, only lab (Lighthouse) gating is, and lab gating's honest ceiling is a11y/SEO/best-practices, not a performance *score*.
- **Lighthouse's own guidance: the median of 5 runs is twice as stable as 1 run** — this is the primary justification for `numberOfRuns >= 3` and asserting on stable categories, not single jittery metrics ([GoogleChrome/lighthouse variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)).
- **`bundlesize` is dead**: last publish 0.18.2 on 2024-03-15, over two years stale as of 2026-08-29. `size-limit` is the maintained tool: 13.0.3 published 2026-07-30, active weekly.
- **Vite 8 (2026-03-12) replaced Rollup+esbuild with Rolldown, its single Rust bundler**, with `build.rollupOptions` renamed `build.rolldownOptions` (old name deprecated, still works via compat layer, scheduled for removal) — ([vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8), [vite.dev migration guide](https://vite.dev/guide/migration.html)). `build.chunkSizeWarningLimit` still defaults to 500kB, compared against *uncompressed* chunk size ([vite.dev/config/build-options.html](https://vite.dev/config/build-options.html)).
- **`fma`'s real production bundle already exceeds that default 500kB warning** — `assets/index-VpTlMCXO.js` measured 568K on disk in the committed `dist/` — a live, checkable fact in this fleet, not a hypothetical.
- **VitePress ships static HTML on first load and only hydrates the dynamic parts of each Markdown-as-Vue-component page** — the Vue compiler statically analyzes and strips the static parts from the JS payload ([vitepress.dev/guide/what-is-vitepress](https://vitepress.dev/guide/what-is-vitepress)). This is automatic; there is nothing for a rule to gate except "don't defeat it" (no top-level client-only escape hatches in content).
- **Astro ships zero client JS by default; `client:*` directives are an explicit, per-component opt-in** (`client:load`, `client:idle`, `client:visible`) ([docs.astro.build/en/concepts/islands](https://docs.astro.build/en/concepts/islands/)). A rule here is checkable: grep for `client:load` on anything that could instead be `client:visible`/`client:idle`.
- **React Compiler reached stable 1.0.0 on 2025-10-07** (`babel-plugin-react-compiler`, `react-compiler-runtime`, both on npm at 1.0.0) — it eliminates the *need* for manual `useMemo`/`useCallback`/`React.memo`, and supports React 17/18/19 (17/18 need the `react-compiler-runtime` package; 19 has the runtime built in) ([react.dev/learn/react-compiler](https://react.dev/learn/react-compiler), [react.dev/reference/react-compiler/target](https://react.dev/reference/react-compiler/target)). `fma` is on React 18.3.1 with zero manual memoization visible in package.json deps — it is Compiler-eligible today.
- **Vue 3.5 (still the current 3.x line, npm shows 3.5.42 as of this research) cut reactivity memory usage 56% and made deep-reactive array ops up to 10x faster**, plus stabilized reactive-props-destructure ([blog.vuejs.org/posts/vue-3-5](https://blog.vuejs.org/posts/vue-3-5)) — `creeptd-ng/web` is on `^3.5.0` and should already be getting this, no rule needed beyond "stay on 3.5+."
- **`size-limit`'s CI story is a `package.json` "size-limit" key plus a GitHub Action** (`andresz1/size-limit-action`), with `@size-limit/file` for a plain byte budget and `@size-limit/time` for execution-time budgets ([github.com/ai/size-limit](https://github.com/ai/size-limit)) — this is the natural fit for `fma` and `creeptd-ng/web`, not LHCI.
- **The decision this brief must settle, stated plainly: keep `@lhci/cli` in `ocx-catalog`, fix the `aggregationMethod` gap, do not chase field data, and do not add a numeric Lighthouse *performance* gate anywhere else in the fleet.** The one gate worth replicating to `grimoire-indexer` is the a11y/best-practices/SEO category pattern, not a performance score.

## Findings

### 1. Lighthouse and Lighthouse CI

`lighthouse` (the underlying audit engine) is at **13.4.1**, published **2026-07-20**, with the `13.x` line starting at 13.0.1 on **2025-10-22** (confirmed via `npm view lighthouse time --json` against the npm registry directly — the registry's own publish timestamps, not a blog's paraphrase). The Chrome for Developers scoring-weights page documents the performance category as five metrics — **FCP 10%, Speed Index 10%, LCP 25%, TBT 30%, CLS 25%** — and this table is unchanged from Lighthouse 10 through the current major; the page does not label a v13-specific weight change, and does not mention INP anywhere in the scoring model ([developer.chrome.com/docs/lighthouse/performance/performance-scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)). That absence is not an oversight: INP requires *real* user interaction over a session, which a synthetic single-page-load lab run cannot produce, so Lighthouse substitutes TBT (main-thread blocking time during load) as its lab proxy for responsiveness instead of trying to fake INP.

`@lhci/cli` — the CI wrapper this fleet already depends on — is at **0.15.1**, published **2025-06-25** (npm registry `time` field), and its own `package.json` pins `"lighthouse": "12.6.1"` exactly (`npm view @lhci/cli@0.15.1 dependencies`). That means the CI gate is running a Lighthouse audit engine roughly one major version and 14 months behind what `npx lighthouse` would give you standalone today. The `GoogleChrome/lighthouse-ci` repo shows no archive/deprecation banner and 1,002+ commits, but 216 open issues and no release in 14 months is a real staleness signal for a tool sitting on the critical path of a merge gate.

LHCI's own **assertion presets** ([configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)):
- `lighthouse:all` — asserts a perfect score on *every* audit; "recommended only for high-quality greenfield projects."
- `lighthouse:recommended` — perfect score on non-performance audits, warns under 90 on performance metrics.
- `lighthouse:no-pwa` — `lighthouse:recommended` minus PWA audits.

Category vs. audit assertions: `'categories:<categoryId>'` keys assert the aggregate category score and are unaffected by individual-audit assertions in the same category — this is the mechanism `ocx-catalog` already uses instead of the `lighthouse:no-pwa` preset's audit-by-audit list.

**Aggregation and flakiness, exact mechanics** (raw `configuration.md`, section `assertions`, quoted verbatim): *"When no options are set, the default options of `{"aggregationMethod": "optimistic", "minScore": 1}` are used."* The four `aggregationMethod` values are `median` (literal per-audit median across the collected runs), `optimistic` (the value most likely to pass), `pessimistic` (the value least likely to pass), and `median-run` (the single run judged overall "most representative," which — the docs explicitly warn — "differs from `median` because the audit you're asserting might not be the performance metric that was used to select the `median-run`"). **The default, when an assertion object omits `aggregationMethod`, is `optimistic`** — best-of-N, not median-of-N.

`numberOfRuns` defaults to 3; LHCI's variability guidance recommends 5 for anything with a bar high enough to be worth it, quoting Lighthouse's own upstream stability research: *"the median Lighthouse score of 5 runs is twice as stable as 1 run"* ([GoogleChrome/lighthouse variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)), which also lists hardware minimums (2 dedicated cores / 2GB RAM, 4 cores / 4-8GB recommended) and explicitly warns against running concurrent Lighthouse jobs on shared CI hardware — exactly the kind of noise source a shared GitHub Actions runner introduces.

Budgets: LHCI's `assert.budgetsFile` accepts the [budget.json](https://github.com/GoogleChrome/budget.json) format for resource-count/size constraints independent of audit scores — a second, complementary gating mechanism to category assertions, not currently used anywhere in the fleet.

### 2. Core Web Vitals as of 2026

The Core Web Vitals set is unchanged: **LCP, INP, CLS**, all three required to pass (at p75) for an overall "good" assessment ([web.dev/articles/vitals](https://web.dev/articles/vitals)). Exact thresholds, read directly off web.dev:

| Metric | Good | Needs improvement | Poor | Source |
|---|---|---|---|---|
| LCP | ≤ 2.5s | 2.5–4.0s | > 4.0s | [web.dev/articles/lcp](https://web.dev/articles/lcp) (last updated 2025-09-04) |
| INP | ≤ 200ms | 200–500ms | > 500ms | [web.dev/articles/inp](https://web.dev/articles/inp) |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 | [web.dev/articles/cls](https://web.dev/articles/cls) (last updated 2023-04-12) |

INP is confirmed as FID's full successor ("INP is the successor metric to First Input Delay (FID)"); web.dev/articles/vitals additionally notes INP moved "from experimental to pending status" in 2023 before full promotion. No fourth Core Web Vital has been added or is flagged as pending promotion on the current vitals overview page.

### 3. PageSpeed Insights / CrUX vs. lab testing

Field data (CrUX) is Google's own stated priority over lab data when both exist: *"If you have both field data and lab data for a given page, field data is what you should use to prioritize your efforts"* ([web.dev/articles/lab-and-field-data-differences](https://web.dev/articles/lab-and-field-data-differences)). But CrUX has a documented sample-size floor before a URL or origin is even included — the exact number is deliberately undisclosed to prevent gaming, per its own methodology page: *"An exact number is not disclosed, but it has been chosen to ensure that we have enough samples to be confident in the statistical distributions for included pages"* ([developer.chrome.com/docs/crux/methodology](https://developer.chrome.com/docs/crux/methodology)).

This is decisive for this fleet's honesty check. `ocx-catalog` and `grimoire-indexer` are internal-tooling docs sites — plausibly never crossing whatever undisclosed Chrome-user-sample floor CrUX requires. That means:
- PageSpeed Insights' field-data panel will likely show **"Origin/page does not have sufficient data"** rather than a number — this is not a hypothetical edge case for this fleet, it is the expected state.
- A lab-only Lighthouse score is *not* meaningless here by default — it's the only signal available — but it is only trustworthy for the categories the lab environment measures deterministically (a11y, SEO, best-practices structural checks) and much less trustworthy for the *performance* number, which the lab explicitly cannot validate against real users when there is no field data to cross-check it with.
- This directly supports keeping `performance` at `warn` (as `ocx-catalog` already does) rather than `error`: without field data, there's no independent way to know whether a lab performance regression means anything to a real visitor.

### 4. Bundle-size budgets

Two maintained-vs-dead tools, confirmed via npm registry `time` data:
- **`size-limit`**: 13.0.3, published 2026-07-30 — active, prior releases 13.0.1/13.0.2 within the same week (2026-07-24, 2026-07-28), i.e. currently shipping patches regularly.
- **`bundlesize`**: 0.18.2, published 2024-03-15 — the prior release before that was 0.18.1 in *2021*. Two-plus years stale as of 2026-08-29; treat as unmaintained.

`size-limit`'s configuration lives under a `"size-limit"` key in `package.json` (or `.size-limit.json`/`.js`/`.ts`), each entry a `{path, limit}` pair where `limit` can be a byte size (`"10 kB"`) or an execution-time budget (`"500 ms"`) via `@size-limit/time`. Plugin presets: `@size-limit/preset-app` (file+time), `@size-limit/preset-big-lib` (webpack+file+time), `@size-limit/preset-small-lib` (esbuild+file). CI wiring is `andresz1/size-limit-action`, which posts the size delta as a PR comment ([github.com/ai/size-limit](https://github.com/ai/size-limit)).

Vite/Rolldown's own signal is `build.chunkSizeWarningLimit`, default **500 (in kB)**, explicitly compared against the **uncompressed** chunk size, with the doc's own rationale citing execution cost over network cost: *"It is compared against the uncompressed chunk size as the JavaScript size itself is related to the execution time"* ([vite.dev/config/build-options.html](https://vite.dev/config/build-options.html), citing [v8.dev/blog/cost-of-javascript-2019](https://v8.dev/blog/cost-of-javascript-2019)). This is a *warning*, not a CI-failing gate — it prints to build stdout and exits 0.

Vite 8 (2026-03-12) renamed the bundler-passthrough option: `build.rollupOptions` → `build.rolldownOptions`, `worker.rollupOptions` → `worker.rolldownOptions`. The old names are deprecated but still function through a compatibility layer, "will be removed in the future" ([vite.dev/guide/migration.html](https://vite.dev/guide/migration.html)). None of the fleet's Vite configs were checked in this pass for which name they use — worth a follow-up grep before any TS/build rule references the option by name.

Real numbers from this fleet's own committed/built output (not hypothetical):
- `fma/dist/assets/index-VpTlMCXO.js` — **568K** on disk, already over Vite's own 500kB default warning threshold.
- `creeptd-ng/web/dist/assets/index-BPxSdK7k.js` — 248K main chunk (route chunks like `MatchView`/`LobbyView` are correctly code-split at 16K/16K); the 13M `creeptd_client_bg.wasm` is a one-time cached Bevy/WASM payload, a different budget category entirely (not a JS-execution-cost concern the way a hot chunk is).
- `ocx-catalog/.lhci-site` — 2.4M total site, 740K of that in JS across all pages combined — this is the realistic ceiling for "a docs site page's JS," an order of magnitude under the SPA numbers above.

A realistic budget split, grounded in those numbers rather than a generic rule of thumb: a **docs-site page** (VitePress/Astro) should budget in the tens-of-KB-per-page range for JS, since the SSG already strips most of it; an **SPA route chunk** (React/Vue) is reasonable in the 200–300K range per `creeptd-ng/web`'s own already-code-split output; a **single monolithic SPA bundle** like `fma`'s current 568K is the shape a budget should catch, not the shape it should bless.

### 5. Static-site-generator performance

**VitePress**: static HTML on first visit, SPA-style client navigation after ("the incoming page's content will be fetched and dynamically updated" rather than a full reload). Each Markdown page compiles to a Vue component, but "the Vue compiler is smart enough to separate the static and dynamic parts, minimizing both the hydration cost and payload size. For the initial page load, the static parts are automatically eliminated from the JavaScript payload" ([vitepress.dev/guide/what-is-vitepress](https://vitepress.dev/guide/what-is-vitepress)). This is fully automatic — there is no config knob a rule would check; the only thing a rule *can* check is that authors don't defeat it (e.g. wrapping otherwise-static content in a client-only Vue component for no reason).

Note the fleet's own peer dependency: `ocx-catalog` targets `"vitepress": "^2.0.0-alpha.18"` while npm's `latest` dist-tag for `vitepress` is still **1.6.4** and `next` is `2.0.0-alpha.19` (`npm view vitepress dist-tags`). The fleet is deliberately tracking the pre-release 2.x line, not the stable 1.x line — worth flagging to whoever owns that dependency choice, since alpha releases carry no stability guarantee on the performance characteristics described above.

**Astro**: zero client JS by default — "stripping out all client-side JavaScript automatically" is the framework's baseline for every component ([docs.astro.build/en/concepts/islands](https://docs.astro.build/en/concepts/islands/)). Interactivity is opt-in per component via `client:*` directives: `client:load` (immediate), `client:idle` (on browser idle), `client:visible` (on viewport entry) — the last two are strictly better for anything not above-the-fold or not needed at first paint. This is directly checkable: grep a repo's `.astro` files for `client:load` and ask, for each hit, whether `client:visible`/`client:idle` would serve. `grimoire-indexer`'s Astro+Preact integration was not checked for directive usage in this pass — that's the concrete follow-up a normative rule would run.

Astro 7 (released 2026-06-22 per its own blog) reports 15–61% faster builds via a "queued rendering system... ~2.4x faster" than the prior recursive approach, and a Rust-based Markdown processor that "shaved over a minute" off a 6,313-page docs-site build ([astro.build/blog/astro-7](https://astro.build/blog/astro-7/)). `grimoire-indexer` is on `"astro": "^7.1.4"` — inside the range that gets this, current npm `astro` latest is 7.2.9 (2026-08-27).

### 6. Runtime performance for the SPAs

**React Compiler**: stable **1.0.0**, both `babel-plugin-react-compiler` and `react-compiler-runtime` published **2025-10-07** (npm registry `time`, corroborated by react.dev's own blog listing "React Compiler v1.0" at the same date). It "automatically optimizes your React application by handling memoization for you, eliminating the need for manual `useMemo`, `useCallback`, and `React.memo`" ([react.dev/learn/react-compiler](https://react.dev/learn/react-compiler)). Version support: React 17, 18, and 19 all work; 19 has the runtime built in (`react/compiler-runtime`), 17/18 need the separate `react-compiler-runtime` package installed ([react.dev/reference/react-compiler/target](https://react.dev/reference/react-compiler/target)). `fma` is on React 18.3.1 with no `react-compiler-runtime`/`babel-plugin-react-compiler` in its `package.json` — it is compiler-eligible and not yet adopted. The practical consequence for any TS/React rule: "always memoize expensive computations with `useMemo`" is no longer universally correct advice once the compiler is in the build — it becomes correct only for code the compiler cannot see (dynamic requires, code outside the compiled scope) or in repos that haven't adopted it yet, like `fma` today.

**Vue reactivity**: Vue 3.5 (current npm `vue` latest is 3.5.42, still the 3.5 line as of this research) cut reactivity system memory usage by **56%** and made array reactivity tracking "up to 10x faster in some cases," plus stabilized reactive-props-destructure so components can use native JS default-value syntax instead of `withDefaults()` ([blog.vuejs.org/posts/vue-3-5](https://blog.vuejs.org/posts/vue-3-5)). `creeptd-ng/web` is on `"vue": "^3.5.0"` — already inside the range that gets these gains; no code change is needed to benefit, only staying current matters.

**Long tasks / INP debugging**: not independently re-verified beyond what's already established above (INP thresholds, TBT as the lab proxy) — Chrome DevTools' Performance panel long-task flagging and the INP breakdown (input delay / processing time / presentation delay) were not fetched from a primary source in this pass; **could not establish specifics beyond the INP threshold table above as of 2026-08-29.**

**`web-vitals` library**: npm registry shows current is **6.2.1**, published 2026-08-26 (three days before this research date — actively maintained). It reports LCP, INP, CLS, FCP, and TTFB via `onLCP`/`onINP`/`onCLS`/`onFCP`/`onTTFB` callbacks, with an explicit warning against calling these repeatedly per page load ("Each creates a `PerformanceObserver` instance and registers event listeners for the page's lifetime") ([github.com/GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals)). None of the four SPA/site repos in this fleet currently depend on `web-vitals` — there is no in-app field-data collection anywhere, which is consistent with finding 3 above (no meaningful CrUX volume) but does mean nobody would notice a real-user INP regression even if one occurred.

### 7. Image, font and asset discipline

Straight from web.dev's own LCP optimization guide ([web.dev/articles/optimize-lcp](https://web.dev/articles/optimize-lcp)):
- Preload the LCP image (`<link rel="preload">` or a `Link` header) when it's a CSS background image, since those aren't discovered by the browser's preload scanner.
- Set `fetchpriority="high"` on an `<img>` likely to be the LCP element; never lazy-load the LCP image itself.
- Prefer modern formats (AVIF/WebP) over legacy ones for compression.
- Set `font-display` to something other than `auto`/`block` so text stays visible during font load rather than blocking LCP.

What a build tool now does automatically vs. what still needs a decision, per the SSG findings above: VitePress and Astro both already strip unnecessary JS by default (finding 5) — that's automatic. Image format conversion, `fetchpriority`, `font-display`, and preload hints are **not** automatic in either SSG; they remain per-repo authoring decisions a rule could check for (presence of `fetchpriority="high"` near a hero/logo image, a `font-display` value in the committed `@font-face` CSS — `ocx-catalog` ships `@fontsource/ibm-plex-mono`/`@fontsource/ibm-plex-sans`, which bundle their own `font-display` values worth a one-time check rather than a recurring rule).

### 8. What ocx-catalog's existing LHCI wiring actually does

Read directly from `.lighthouserc.cjs`, `taskfile.yml`, and `ci.yml` in the repo (not a summary — this is the config as committed):

- CI runs it as a dedicated `web-quality` job on every push, via `task quality:web`, which builds the committed fixture index at `test/fixtures/quality-index/` into `.lhci-site/`, then runs `npx lhci autorun` (the *pinned* devDependency binary, deliberately not `npx --yes @lhci/cli` which would fetch an unpinned copy at run time — the taskfile's own comment is explicit about this).
- `numberOfRuns: 3`, `maxAutodiscoverUrls: 0` (audits every emitted page — index, 404, and one detail page per fixture package — rather than LHCI's default 5-page autodiscovery cap).
- Assertions are **category-level only**: `accessibility` and `seo` at `error, minScore: 0.97`; `best-practices` at `error, minScore: 0.93`; `performance` at `warn, minScore: 0.85`.
- The docblock states these thresholds are the *measured* category medians across 3 runs × 8 pages, minus a margin ≥0.03, and that the a11y assertion's red state was proven by a deliberate regression (a no-alt `<img>`, an empty `<button>`, an unlabeled `<input>`) that dropped a11y from 0.92 to 0.77 median, failing the gate with exit code 1, then reverted to confirm green.
- The docblock also explains, correctly, why category assertions were chosen over the `lighthouse:no-pwa` preset: that preset asserts individual audits (`color-contrast`, `link-name`, `unused-css-rules`, etc.) at error, several of which the shipped theme still legitimately fails (VitePress ships more CSS/JS than the landing page uses) and are out of scope; category assertions hold the line against *future* regressions without re-litigating every current audit.
- `puppeteer-core` is used for two things: locating a cached Chrome binary for `CHROME_PATH` (`$HOME/.cache/puppeteer/chrome/*/chrome-linux64/chrome`), and a *separate* script (`scripts/quality-css-cascade.mjs`) that checks a CSS `@layer` cascade contract with a real browser — not Lighthouse itself.

This is a well-reasoned, evidence-backed gate. The one real gap, established in finding 1: none of those `assert.assertions` entries set `aggregationMethod`, so despite the docblock's "measured medians" framing, LHCI is actually gating on the **optimistic** (best-of-3) run for every one of them. In practice this makes the gate *more* lenient than the docblock believes it to be — a real regression that only shows up in 2 of 3 runs would currently pass.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt/keep/drop/watch | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| `@lhci/cli` | CI wrapper: runs Lighthouse N times, aggregates, asserts against config | 0.15.1, 2025-06-25 (pins `lighthouse@12.6.1`) | mature but 14mo stale | **keep** (ocx-catalog only), fix `aggregationMethod` | already CI-enforced, category-level, proven red state — better than most fleets ship, but the pinned Lighthouse is a full major behind | ad-hoc manual Lighthouse-in-DevTools checks |
| `lighthouse` (standalone) | the audit engine LHCI wraps | 13.4.1, 2026-07-20 | active | n/a — not directly depended on | — | — |
| Core Web Vitals / `web-vitals` lib | field metric definitions + JS collector | thresholds current; lib 6.2.1, 2026-08-26 | active | **watch** — not adopted anywhere in fleet | no site in this fleet has traffic volume to make field data meaningful yet (finding 3) | — |
| PageSpeed Insights / CrUX | field-data dashboard over CrUX | n/a | active, but sample-gated | **drop as a gate** for this fleet | undisclosed but real sample-size floor these sites plausibly never clear | — |
| `size-limit` | byte/time budget, CI-gateable | 13.0.3, 2026-07-30 | active | **adopt** (fma, creeptd-ng/web) | maintained, config lives in package.json, has a ready-made GH Action | ad-hoc `du -h dist/` checks |
| `bundlesize` | byte budget, CI-gateable | 0.18.2, 2024-03-15 | dead | **drop / never adopt** | 2+ years no release, `size-limit` does the same job and is maintained | — |
| Vite `chunkSizeWarningLimit` | build-time chunk-size warning | default 500kB, uncompressed | stable, built-in | **keep as signal, not gate** | free, zero-config, but warns don't fail the build — pair with `size-limit` for an actual gate | — |
| `build.rollupOptions` → `rolldownOptions` | bundler passthrough config | renamed in Vite 8 (2026-03-12), old name deprecated | stable, migrating | **watch** — check fleet configs for the old name | still works via compat layer but scheduled for removal | `build.rollupOptions` (old name) |
| React Compiler (`babel-plugin-react-compiler`) | automatic memoization | 1.0.0, 2025-10-07 | stable | **adopt** (fma) | eliminates most manual `useMemo`/`useCallback`/`React.memo` need; fma is eligible today | manual `useMemo`/`useCallback`/`React.memo` discipline |
| Vue 3.5 reactivity | core reactivity engine | 3.5.42 current | stable, already in use | **keep current** | -56% memory, up to 10x faster array reactivity vs pre-3.5 — creeptd-ng/web already benefits, no action needed beyond staying ≥3.5 | Vue ≤3.4 reactivity internals |
| VitePress auto static/dynamic split | build-time hydration optimization | built into VitePress core | stable, automatic | **no action** | fully automatic; nothing to configure or gate | — |
| Astro islands (`client:*`) | opt-in per-component hydration | built into Astro core, v7.2.9 current | stable, automatic-by-default | **adopt a check**, not the mechanism itself | mechanism is already zero-JS-by-default; the rule is "don't misuse `client:load`" | — |

## Normative guidance candidates

1. **Rule**: Every `assert.assertions` entry in a `.lighthouserc.*` MUST set `aggregationMethod: 'median'` explicitly when the threshold was derived from a measured median.
   **Rationale**: LHCI's undocumented-in-practice default is `optimistic` (best-of-N), which silently makes a "measured median, minus margin" threshold easier to pass than intended.
   **Verify**: grep the config for every `assert.assertions` key; each `[level, {...}]` tuple must include `aggregationMethod`, or the file-level docblock must explicitly say it intends `optimistic` and why.

2. **Rule**: `numberOfRuns` in any LHCI config MUST be ≥3, and any threshold derivation comment MUST state how many runs and how the margin was chosen.
   **Rationale**: per Lighthouse's own variability research, single-run scores are half as stable as a 5-run median; an un-sourced threshold is unfalsifiable.
   **Verify**: `numberOfRuns` key present and ≥3 in `collect`; a nearby comment names the run count and margin (as `ocx-catalog`'s docblock already does — use it as the template).

3. **Rule**: Never assert an `error`-level Lighthouse `performance` category/audit on a repo with no CrUX field data to cross-check it against; use `warn` at most.
   **Rationale**: a lab-only performance score has no independent validation for a low-traffic site (finding 3); a11y/SEO/best-practices are structural checks the lab measures deterministically and don't have this problem.
   **Verify**: in `assert.assertions`, `categories:performance` (or any perf audit) must be at `warn`, never `error`, unless the repo's PageSpeed Insights origin/page shows real CrUX data.

4. **Rule**: A CI-gating byte budget (`size-limit` `package.json` key or `.size-limit.json`) is REQUIRED for every repo that ships a bundled SPA entry chunk (`fma`, `creeptd-ng/web`), with the main entry chunk limit set at or below Vite's own 500kB default warning.
   **Rationale**: Vite's `chunkSizeWarningLimit` already fires at build time but never fails CI; `fma`'s real committed output (568K) is already over that line with nothing stopping it.
   **Verify**: `"size-limit"` key exists in `package.json`, or a `.size-limit.json`/`.js`/`.ts` file exists, and CI runs `npx size-limit` (fails non-zero on breach) — not merely `vite build` and a human reading the warning.

5. **Rule**: An `.astro` file MUST NOT use `client:load` on a component that is not above-the-fold and not needed for first interaction; prefer `client:visible` or `client:idle`.
   **Rationale**: `client:load` defeats Astro's zero-JS-by-default model for no benefit when the component isn't immediately needed.
   **Verify**: `grep -rn 'client:load' '*.astro'`; each hit needs a one-line justification (above-the-fold / needed for first paint) or should switch directive.

6. **Rule**: Before adding `useMemo`/`useCallback`/`React.memo` to new React code in a repo that has adopted React Compiler, justify why the compiler can't see the call site (e.g., outside compiled scope, dynamic import boundary).
   **Rationale**: manual memoization is redundant and adds review noise once the compiler handles it; "always memoize" is stale advice post-1.0 (2025-10-07).
   **Verify**: check whether `babel-plugin-react-compiler`/`eslint-plugin-react-compiler` is in the repo's devDependencies; if yes, a new manual memoization call needs a comment explaining the exception.

7. **Rule**: `build.rollupOptions` in any Vite config on Vite ≥8 SHOULD be renamed to `build.rolldownOptions`.
   **Rationale**: the old name is deprecated and scheduled for removal; the compat layer works today but is not permanent.
   **Verify**: `grep -rn 'rollupOptions' vite.config.*` in any repo on `"vite": "^8"` or later; each hit should be `rolldownOptions` instead, or the repo is still on Vite <8 and the rule doesn't apply yet.

8. **Rule**: `@lhci/cli`'s pinned version SHOULD be re-checked against its own npm release history at least once per quarter; if it goes >18 months without a release while the standalone `lighthouse` package keeps advancing, escalate a decision to replace it with a hand-rolled `lighthouse` CLI + median/threshold script.
   **Rationale**: a CI gate built on an unmaintained wrapper around an actively-changing audit engine is a slow-motion drift risk, not an emergency today (14 months, not yet 18).
   **Verify**: `npm view @lhci/cli time --json | tail` (or equivalent) shows a release within the last 18 months.

## AI-agent angle

- **Recommending `bundlesize` instead of `size-limit`.** An LLM trained on older material will surface `bundlesize` as "the" bundle-budget tool since it was once the more commonly cited one; it has had one release since 2021 and none since March 2024. **Check**: `npm view bundlesize time.modified` (or the registry page) — if the last publish is >12 months old, treat any recommendation of it as stale training data, not current practice.
- **Asserting individual Lighthouse audits (`lighthouse:recommended`/`lighthouse:no-pwa` preset) instead of categories.** This is the textbook LHCI quickstart shape, and it's exactly what `ocx-catalog`'s own docblock explains *not* to do here, because the shipped theme legitimately fails several of those audits today for reasons out of scope (VitePress ships more CSS/JS than a landing page uses). An agent copying the quickstart preset onto this codebase would either red the build on day one or get talked into loosening thresholds until the gate is meaningless. **Check**: does the `.lighthouserc.*` use `preset: 'lighthouse:recommended'`/`'no-pwa'` with a long list of individually-loosened audit overrides? That shape is the red flag; category assertions with a small number of entries is the target shape.
- **Citing INP thresholds as if they apply to a Lighthouse *lab* score.** INP is a field/RUM metric; Lighthouse's performance category has never included it (finding 1). An agent asked to "improve the Lighthouse INP score" is chasing a metric that category doesn't measure. **Check**: does the requested change target a `categories:performance` audit list that includes `interaction-to-next-paint` or similar — if the audit ID doesn't appear in Lighthouse's own default-config audit list for the performance category, the request is malformed.
- **Recommending `useMemo`/`useCallback` reflexively in React code without checking for the Compiler.** Pre-2025-10 training data treats manual memoization as universally correct React practice. **Check**: is `babel-plugin-react-compiler` (or `eslint-plugin-react-compiler`) present in the repo? If yes, a fresh manual memoization suggestion should be challenged, not applied by default.
- **Suggesting a CrUX/PageSpeed Insights field-data gate for a low-traffic repo.** An agent that hasn't internalized finding 3 will suggest "just check PageSpeed Insights" as if it always returns a number. **Check**: does the target URL actually return CrUX data (PSI shows a field-data section) before building any gate around it, or is this a small/internal site where the field panel will say "insufficient data"?
- **Treating `build.rollupOptions` as the permanently-correct Vite config key.** Training data predating 2026-03-12 (Vite 8) will not know about the `rolldownOptions` rename. **Check**: `npm view vite version` — if the target repo is on Vite ≥8, prefer `rolldownOptions` in new config; `rollupOptions` still works but is deprecated.

## Contested / evolving

- **Whether `@lhci/cli` is still the right LHCI wrapper, or whether repos should move to calling `lighthouse` directly plus a hand-rolled aggregation script.** Not contested in public discourse as far as this pass established, but the underlying fact — 14 months without a release while `lighthouse` itself has shipped four minor versions since — is trending toward this becoming a real question. As of 2026-08-29: not yet urgent (18-month rule-of-thumb in guidance candidate 8), but worth re-checking every quarter.
- **`aggregationMethod` defaults.** LHCI's `optimistic` default is a genuinely debatable design choice (favor not-flaky-red over not-flaky-green), and this pass found no discussion in the docs of *why* `optimistic` was chosen as the default over `median`. Treat this as settled-by-the-tool, not settled-by-consensus — a repo that wants median-based gating must say so explicitly per assertion.
- **`build.rollupOptions` → `rolldownOptions` migration pace.** Vite 8 shipped 2026-03-12 (about 5.5 months before this research); the deprecated name still works. Whether the ecosystem (plugin authors, templates, Stack Overflow answers) has caught up to the new name was not established in this pass — expect continued confusion through at least early 2027 given how recent the rename is.
- **React Compiler adoption rate outside greenfield projects.** The compiler itself is stable (1.0.0, 2025-10-07), but this pass did not establish what fraction of existing React 18 codebases have actually turned it on (as opposed to merely being eligible, like `fma`). Trending toward wider adoption given the eslint plugin's `19.1.0-rc.2` version suggests active tightening, but "stable tool" and "adopted practice" are different claims — don't conflate them in a normative rule.

## Candidate topics

| topic | why it matters | source | priority | volatility (12mo) |
|---|---|---|---|---|
| Does `ocx-catalog`'s LHCI gate actually use median aggregation, or silently `optimistic`? | direct, fixable gap between stated and actual gate behavior | LHCI configuration.md | high | low — mechanical fix, won't drift |
| Is `@lhci/cli` healthy enough to keep pinning, given 14mo without release? | central to a merge gate; staleness compounds | npm registry, GH repo | high | medium — re-check quarterly |
| Should `grimoire-indexer` get the same a11y/SEO/best-practices LHCI pattern as `ocx-catalog`? | it's an Astro docs site with zero perf tooling today | fleet inspection | high | low |
| Should `fma`/`creeptd-ng/web` adopt `size-limit`, and at what byte ceiling? | fma's real bundle already exceeds Vite's own default warning | fleet inspection, size-limit docs | high | low |
| Is `fma` (React 18.3.1) a good candidate for React Compiler adoption? | eliminates manual memoization maintenance burden | react.dev | med | medium — depends on repo owner appetite |
| Does any fleet Vite config still use the deprecated `rollupOptions` name? | mechanical rename, low cost, avoids future breakage | vite.dev migration guide | med | high — compat layer removal date unknown |
| Does `grimoire-indexer`'s Astro output actually avoid `client:load` misuse? | not yet checked in this pass — file-level grep needed | docs.astro.build | med | low |
| Should any repo start collecting `web-vitals` field data even below CrUX's threshold, for internal trend-tracking? | nobody in the fleet has RUM data today; even sub-CrUX-threshold local collection beats nothing | web-vitals README | low | low |
| What's `ocx-catalog`'s actual reason for tracking VitePress `2.0.0-alpha.18` instead of stable `1.6.4`? | pre-release dependency on a perf-relevant SSG core, no stability guarantee | fleet package.json, npm dist-tags | med | high — alpha line by definition |
| Does `creeptd-ng/web`'s Playwright e2e suite already touch anything Lighthouse-shaped, or is there a path to reuse it for a perf check? | avoids a second, redundant headless-browser toolchain | fleet inspection (not completed this pass) | med | low |
| INP/long-task debugging workflow specifics (Performance panel breakdown) | brief called for this explicitly; not established from a primary source this pass | Chrome DevTools docs (unfetched) | med | low |
| Font-loading discipline check for `@fontsource/*` packages already in use | `font-display` values ship inside the package; worth a one-time audit, not a recurring rule | web.dev/optimize-lcp, fontsource packages | low | low |
| Whether `budget.json`-style LHCI budgets (resource counts) add value beyond category assertions | unused anywhere in fleet; a second gating primitive worth evaluating once | LHCI configuration.md | low | low |
| Should the VS Code extensions (`grimoire-vscode`, `vscode-ocx`) have ANY web-perf gate given they're Electron-hosted, not browser-served? | scope check — likely no, but worth stating explicitly rather than by omission | fleet inspection | low | low |
| Chrome version skew between `puppeteer-core` (24.43.1, pinned) and whatever GitHub Actions' runner preinstalls | affects reproducibility of measured LHCI thresholds across local vs CI | fleet package.json | low | medium |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) | LHCI's own config reference (raw, fetched directly) | current | source of the `aggregationMethod` default finding — the single most load-bearing fact in this report |
| [github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) | Lighthouse's own run-to-run variability guidance | current | source of "median of 5 runs is 2x as stable as 1" and hardware-noise guidance |
| [developer.chrome.com/docs/lighthouse/performance/performance-scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) | Chrome for Developers' scoring-weights page | current (labels Lighthouse 10 table, unchanged since) | authoritative weight percentages, confirms INP absent from the score |
| [web.dev/articles/vitals](https://web.dev/articles/vitals) | Core Web Vitals overview | last updated 2024-10-31 | confirms the current 3-metric set and INP's 2023 promotion history |
| [web.dev/articles/lcp](https://web.dev/articles/lcp) | LCP definition + thresholds | last updated 2025-09-04 | primary source for the 2.5s/4.0s LCP thresholds |
| [web.dev/articles/inp](https://web.dev/articles/inp) | INP definition + thresholds | current | primary source for the 200ms/500ms INP thresholds and FID succession |
| [web.dev/articles/cls](https://web.dev/articles/cls) | CLS definition + thresholds | last updated 2023-04-12 | primary source for the 0.1/0.25 CLS thresholds |
| [web.dev/articles/lab-and-field-data-differences](https://web.dev/articles/lab-and-field-data-differences) | Google's own lab-vs-field guidance | current | grounds the "field data > lab when both exist" and cold-cache caveats |
| [developer.chrome.com/docs/crux/methodology](https://developer.chrome.com/docs/crux/methodology) | CrUX methodology | current | confirms the undisclosed-but-real sample-size floor, central to the "wrong tool for this fleet" argument |
| [web.dev/articles/optimize-lcp](https://web.dev/articles/optimize-lcp) | LCP optimization playbook | current | source of the preload/fetchpriority/font-display/AVIF-WebP recommendations |
| [vite.dev/config/build-options.html](https://vite.dev/config/build-options.html) | Vite build config reference | current (Vite 8 line) | source of `chunkSizeWarningLimit` default and the uncompressed-comparison rationale |
| [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8) | Vite 8 release announcement | 2026-03-12 | source of the Rolldown-replaces-everything claim and adopter build-time numbers |
| [vite.dev/guide/migration.html](https://vite.dev/guide/migration.html) | Vite migration guide | current | source of the `rollupOptions` → `rolldownOptions` rename and deprecation status |
| [vitepress.dev/guide/what-is-vitepress](https://vitepress.dev/guide/what-is-vitepress) | VitePress's own intro/architecture page | current | source of the static-HTML-plus-selective-hydration claim |
| [docs.astro.build/en/concepts/islands](https://docs.astro.build/en/concepts/islands/) | Astro's own islands-architecture doc | current | source of the zero-JS-by-default and `client:*` directive semantics |
| [astro.build/blog/astro-7](https://astro.build/blog/astro-7/) | Astro 7 release blog | 2026-06-22 | source of the build-time performance numbers (15-61% faster, 2.4x rendering) |
| [github.com/GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) | web-vitals library README | current (v6 line) | source of the metric list and the "don't call repeatedly" usage warning |
| [react.dev/learn/react-compiler](https://react.dev/learn/react-compiler) | React Compiler intro | current | source of the memoization-elimination claim |
| [react.dev/reference/react-compiler/target](https://react.dev/reference/react-compiler/target) | React Compiler version-targeting reference | current | source of the React 17/18/19 support matrix and runtime-package requirement |
| [blog.vuejs.org/posts/vue-3-5](https://blog.vuejs.org/posts/vue-3-5) | Vue 3.5 release announcement | 2024-09-01 | source of the -56% memory / 10x array-reactivity numbers |
| [github.com/ai/size-limit](https://github.com/ai/size-limit) | size-limit README | current | source of the plugin/preset list and CI-wiring pattern |
| npm registry (`npm view <pkg> time --json` / `version` / `dependencies`) | package registry metadata, queried directly | 2026-08-29 | primary source for every version number and publish date in this report — not a blog's paraphrase |
| `/home/mherwig/dev/ocx-catalog/.lighthouserc.cjs`, `taskfile.yml`, `.github/workflows/ci.yml` | the fleet's own committed LHCI config | as of this research | the actual gate under discussion — read directly, not summarized from a ticket |
| `/home/mherwig/dev/fma/dist/`, `/home/mherwig/dev/creeptd-ng/web/dist/`, `/home/mherwig/dev/ocx-catalog/.lhci-site/` | the fleet's own committed/built output | as of this research | source of the real bundle-size numbers used in section 4, not hypothetical figures |

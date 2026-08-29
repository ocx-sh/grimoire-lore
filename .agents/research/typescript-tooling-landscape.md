---
title: TypeScript tooling landscape — consolidated verdict
topic: typescript-tooling-landscape
phase: 2.5 (addendum to the phase-3 topic map)
model: opus
consolidates:
  - typescript-topic-map/oxc-project.md
  - typescript-topic-map/test-runners.md
  - typescript-topic-map/type-testing.md
  - typescript-topic-map/static-analysis.md
  - typescript-topic-map/benchmarking.md
  - typescript-topic-map/web-performance.md
  - typescript-topic-map/build-bundle.md
  - typescript-topic-map/ci-supply-chain-tooling.md
  - typescript-topic-map/canonical.md
  - typescript-topic-map/practitioner.md
  - typescript-topic-map/codified.md
  - typescript-topic-map/lint-catalogue-sweep.md
  - typescript-topic-map/defects.md
  - typescript-topic-map/hardening.md
  - typescript-topic-map/recent-shifts.md
  - typescript-audit/code-shape.md
  - typescript-audit/config-inventory.md
  - typescript-audit/implemented-contracts.md
  - typescript-audit/runtime-posture.md
  - typescript-frame.md
date: 2026-08-29
tools_surveyed: 99
---

# TypeScript tooling landscape — consolidated verdict

Every claim below traces to a sub-artifact or a URL. Where two scouts
disagreed, the conflict is stated and resolved with a reason
([Conflicts resolved](#conflicts-resolved)). Where a scout could not
establish something, it is marked as a gap rather than smoothed over.

**Scope note on repo counts.** The audits measure **eight TypeScript-bearing
repos**; `grimoire-index` is the ninth directory and has zero `.ts` files and
zero tsconfigs (`config-inventory.md` §0). "1 of 9" figures inherited from the
frame are "1 of 8" against real TypeScript. Both denominators appear in the
sub-artifacts; this document uses eight and says so.

## Verdict

1. **The linter decision is not a linter swap. It is turning on the linting
   already installed.** Type-aware ESLint runs in exactly one repo of eight —
   `setup-ocx/eslint.config.js:15-16`. Everywhere else `no-floating-promises`,
   `no-misused-promises` and the `no-unsafe-*` family are *structurally
   unavailable*, not merely disabled (`runtime-posture.md` §1). That is the
   Monday change with the largest ratio of caught bugs to effort, and it costs
   nothing but CI seconds.
2. **Do not move any typescript-eslint repo past `typescript@^6.0.x`.**
   `@typescript-eslint/eslint-plugin@8.68.0`'s peer range is
   `>=4.8.4 <6.1.0` — an `npm install` failure on TS 7, and on TS 6.1 too
   (`oxc-project.md` §3). TS 7.0's absent programmatic API is the cause; 7.1 has
   no ship date, only a `7.1.0-dev.20260829.1` nightly.
3. **tsgolint is the right destination and the wrong thing to do today.** It
   drives `typescript-go` directly, so it is immune to the API gap, and it is
   stable at 59-of-61 rule parity since 2026-07-22 — but it *requires* TS 7,
   which no fleet repo runs. Adopt per-repo, gated on that repo's own TS 7
   migration, never fleet-wide on a date.
4. **Do not pilot oxlint on this fleet's speed claims.** The 12–18x numbers are
   measured on microsoft/vscode-scale repos. The one practitioner report
   covering small codebases records **regressions of −11% to −49%** from fixed
   per-invocation overhead ([charpeni](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt)),
   and every repo here is 10–193 files. If oxlint is piloted, it is on
   `ocx-catalog` (the largest) and with a stopwatch, not a citation.
5. **Four test runners is not a defect.** Each is the only correct choice for
   its shape: Mocha+`@vscode/test-cli` is the *only* sanctioned Electron-host
   path (VS Code's own guide, updated 2026-08-26); `bun test` is native to a Bun
   Action; Vitest owns anything Vite-adjacent; Playwright owns per-test-isolated
   e2e. The defects are version lag and two silent config bugs, not tool choice.
6. **The escape hatch is `as unknown as T`, not `any`.** `any` is 4 occurrences
   fleet-wide, `@ts-ignore` and `@ts-nocheck` are zero across ~130k LOC. The
   double-cast is **164** (`code-shape.md` §2). Every sampled instance fakes a
   `vscode.*` or `window` object in a test. The fix is one named helper per
   faked interface, not a lint rule against a pattern that has a legitimate
   cause.
7. **Keep Lighthouse CI in `ocx-catalog` and fix one line.** The config asserts
   categories (not audits), derives thresholds from measured medians, and proved
   its red state with a deliberate a11y regression — better than most fleets
   ship. But no assertion sets `aggregationMethod`, so LHCI silently gates on
   `optimistic` (best-of-3), contradicting the config's own docblock.
8. **Do not put a Lighthouse *performance* gate anywhere.** These are
   low-traffic sites that plausibly never clear CrUX's undisclosed sample floor,
   so a lab performance score has nothing to cross-check against. a11y/SEO/
   best-practices are deterministic lab checks and are the pattern worth copying
   to `grimoire-indexer`. The SPAs get `size-limit`, not LHCI.
9. **Bundlers: nothing is wrong, one thing is two majors stale.** esbuild stays
   for both extensions and the Action's build script. Bare `tsc` stays for both
   CLIs. The single bundler action is bumping `fma` and `creeptd-ng/web` from
   Vite ^6 to Vite 8 (Rolldown-only since 2026-03-12).
10. **Adopt `isolatedDeclarations` now, not `tsdown`.** It works on TS 6.x today,
    has no compiler-version dependency, and is the prerequisite for fast
    declaration emit later. `tsdown` is `v0.23.0-rc.1` — pre-1.0 — and neither
    CLI has a measured bundling complaint. `tsup` is formally unmaintained by its
    own author; that fact bans `tsup`, it does not mandate its successor.
11. **The fleet's biggest unforced cost is drift, and it has a native fix.**
    Five distinct CI Node states, action pins ranging from full-SHA to
    `setup-node@v6`-vs-`@v7` on sibling repos, four dependency-bot
    configurations across eight repos and none in five of them. One reusable
    workflow plus one shared Renovate preset (`extends: local>ocx-sh/…`) ends
    all of it from two files. Dependabot structurally cannot do this.
12. **Adopt the three free whole-program tools nobody is running:** `knip`
    (catches the stub-entry-point defect directly), `dependency-cruiser`
    (enforces the boundary `packages/core/src/index.ts` only asserts in a
    comment), and CodeQL (free — the repos are public, verified).
13. **Benchmarking: build nothing.** Zero benchmarks exist and no perf complaint
    exists. The only number worth ever gating is CLI cold-start via `hyperfine`,
    and only once someone complains.
14. **Say no to five well-marketed tools:** SonarQube (PR decoration is paid;
    server ops unearned at this scale), semgrep (74 free TS rules, 100%
    security — a strict subset of free CodeQL), Stryker (fix the type-safety gap
    first), Turborepo/Nx (3 packages, 8.6k LOC, below every published threshold).

## The toolchain

Sorted by verdict — adopt, keep, watch, drop — then by role. Version and date
are as sourced by the named sub-artifact; nothing here is a version this corpus
did not source.

| tool | role | version + date | verdict | replaces | for which fleet shape | effort |
|---|---|---|---|---|---|---|
| typescript-eslint `*TypeChecked` + `projectService` | type-aware lint | plugin 8.68.0 | **adopt** | syntax-only `recommended` | every ESLint repo (7 of 8 lack it) | low — config only |
| Vite 8 | SPA dev + build (Rolldown-only) | 8.2.2; 8.0 on 2026-03-12 | **adopt** | Vite 6's esbuild+Rollup split | browser SPAs (`fma`, `creeptd-ng/web`) | medium — 2-major jump, renamed keys |
| `isolatedDeclarations` | tsconfig flag | TS 5.5+ | **adopt** | cross-file inference in `.d.ts` emit | npm CLIs, publishable packages | medium — annotate every export |
| knip | dead files/exports/deps | 6.33.0, 2026-08-28 | **adopt** | ts-prune, depcheck, unimported | all | low per repo, config for the monorepo |
| dependency-cruiser | import boundaries + cycles | 18.2.0, 2026-08-10 | **adopt** | madge as a gate | monorepo + any layered repo | low — one rule per claimed boundary |
| CodeQL code scanning | taint tracking (~292 JS/TS queries) | 2.26.3, 2026-08-19 | **adopt** | ad hoc security review | all (public repos → free) | low — one workflow file |
| zizmor | GitHub Actions static analysis | 1.29.0 (1.30.0rc1) | **adopt** | manual workflow review | all CI'd repos | low — already runs in `ocx-catalog` |
| size-limit | byte/time budget, CI-gating | 13.0.3, 2026-07-30 | **adopt** | `du -h dist/`, bundlesize | browser SPAs | low — `package.json` key + one job |
| `vitest-mock-extended` `mock<T>()` | typed fakes, no cast | 5.1.1, 2026-08-02 | **adopt** | `as unknown as T` literals | Vitest repos only (see D) | medium — per call site |
| Vitest `expectTypeOf` / `.test-d.ts` | type-level tests | expect-type 1.4.0, 2026-06-25 | **adopt** | eyeballing "does it compile" | every Vitest repo — zero new deps | low |
| `@ts-expect-error` negative tests | self-invalidating type test | TS 3.9 language feature | **adopt** | prose comments saying "should error" | all — needs only `tsc --noEmit` | low |
| `@arethetypeswrong/cli` | packed-tarball resolution contract | 0.18.5, 2026-07-09 | **adopt** | manual resolution spot-checks | non-`private` packages | low — `ocx-catalog` has the reference impl |
| publint | package.json/exports lint (+ JS API) | 0.3.24, 2026-08-19 | **adopt** | manual manifest review | non-`private` packages | low |
| Renovate + shared org preset | dependency bot | preset syntax `local>org/repo` | **adopt** | 4 hand-rolled bot configs + 5 absences | all | medium once, one line per repo after |
| GH Actions reusable workflows | one `workflow_call` for N repos | native, 10-level nesting | **adopt** | 6 hand-maintained `ci.yml` blocks | all CI'd repos | medium — one new file |
| `actions/setup-node` `cache:` | package-manager download cache | v7 | **adopt** | hand-rolled `actions/cache` ×5 | all npm/pnpm CI | trivial — one line |
| release-please | Release-PR automation | Google-maintained | **adopt** | manual bump+CHANGELOG+tag | the 5 repos with a `release.yml` | low — config + existing publish job |
| `npm publish --provenance` / Trusted Publishing | supply-chain attestation | OIDC GA 2025-07-31 | **adopt** | long-lived `NPM_TOKEN` | npm-publishing repos | low — `permissions:` block |
| `--enable-source-maps` (Node) | native stack-trace remapping | stable since Node 12.12 | **adopt** | `source-map-support` package | npm CLIs | trivial |
| React Compiler | automatic memoization | 1.0.0, 2025-10-07 | **adopt** | manual `useMemo`/`useCallback`/`memo` | `fma` (React 18.3.1, eligible) | medium — build plugin |
| `fast-check` + `@fast-check/vitest` | property-based tests | 4.9.0 / 0.4.1 | **adopt, narrowly** | example-only parser tests | parser/serializer functions only | low, per function |
| tsgolint / `oxlint-tsgolint` | type-aware lint on `typescript-go` | v7.0.2001, 2026-07-21 | **adopt, gated on TS 7** | typescript-eslint type-aware rules | per repo, after its TS 7 bump | medium — config port + rule diff |
| hyperfine | whole-process CLI wall time | 1.20.0, 2025-11-18 | **adopt if ever gated** | ad-hoc `time` loops | the two npm CLIs | low — one command |
| typescript-eslint (v8, syntax + type-aware) | linter | 8.68.0, peer `<6.1.0` | **keep** | — | every ESLint repo, until its TS 7 cutover | none |
| Vitest 4.1 | unit/integration/browser runner | 4.1.11, 2026-08-18 | **keep** (upgrade 2 repos) | — | Vite-adjacent repos | medium for `fma` (2 majors) |
| `@vitest/browser-playwright` | Vitest browser provider | ships with vitest 4.x | **keep** | `@vitest/browser` string provider | `kate-middlechild/packages/web` | none |
| `bun test` | Jest-API runner, native TS | ships with Bun | **keep** (fix threshold keys) | — | `setup-ocx`, `kate-middlechild/core` | trivial fix |
| Playwright | e2e + component (stories model) | 1.62.0, 2026-07-24 | **keep** (minor bump) | `@playwright/experimental-ct-*` | SPA + monorepo e2e/visual | low |
| Mocha + `@vscode/test-cli` + `-electron` | Electron-host test harness | cli 0.0.12–0.0.15 in fleet | **keep** | — | both VS Code extensions | none — no alternative exists |
| esbuild | bundler for Node/CJS targets | 0.28.2, 2026-08-08 | **keep** | — | VS Code extensions, `setup-ocx` build | none |
| esbuild `--analyze` / `--metafile` | bundler-native analysis | current | **keep** | external analyzers | VS Code extensions | trivial |
| `bun` as script runner | executes `scripts/build.ts` | 1.4, 2026-08-20 | **keep** (validate before bumping) | — | `setup-ocx` | none |
| bare `tsc` for emit | per-file JS + `.d.ts` | ^5.9.3–^6.0.3 across fleet | **keep** | — | both npm CLIs | none |
| `@lhci/cli` | Lighthouse CI wrapper | 0.15.1, 2025-06-25 (pins lighthouse 12.6.1) | **keep**, fix `aggregationMethod` | manual DevTools runs | `ocx-catalog` only | trivial fix |
| Vite `chunkSizeWarningLimit` | 500kB uncompressed warning | built-in | **keep as signal, not gate** | — | SPAs | none |
| `rollup-plugin-visualizer` | Rollup/Vite treemap | 7.1.1, 2026-08-14 | **keep conditionally** | — | SPAs *until* the Vite 8 bump | none now |
| Vue 3.5 reactivity | −56% memory, 10x array tracking | 3.5.42 | **keep ≥3.5** | pre-3.5 internals | `creeptd-ng/web` | none |
| npm | package manager | 12.0.0, 2026-07-08 | **keep** | — | 6 repos | none; audit script reliance |
| pnpm | package manager | 11.0, 2026-04-28 | **keep**, bump 9→11 | — | `creeptd-ng` root | medium — `.npmrc`→`pnpm-workspace.yaml` |
| pnpm/bun workspaces alone | linking + script running | — | **keep** | Turborepo/Nx | `kate-middlechild` | none |
| VitePress auto static/dynamic split | build-time hydration cut | built-in | **keep** (nothing to configure) | — | `ocx-catalog` docs site | none |
| oxlint | Rust linter, 865+ rules | 1.80.0, 2026-08-24 | **watch** — pilot on the largest repo only | ESLint syntax rules | none yet | medium |
| oxfmt | Rust formatter | 0.65.0, 2026-08-24 | **watch** | Prettier (partially) | none — still delegates Markdown to Prettier | — |
| `@oxlint/migrate` | ESLint flat → `.oxlintrc.json` | docs-only, no version surfaced | **watch** — run once if piloting | manual translation | — | — |
| `eslint-plugin-oxlint` | dual-run bridge | locked to oxlint `~1.80.0` | **watch** — only inside a migration window | — | — | — |
| oxlint JS plugins | custom rules, ESLint v9 API | alpha since 2026-03-11 | **watch** | custom ESLint plugin authoring | none — no repo-local plugins exist | — |
| oxc VS Code extension | LSP lint/format in editor | `oxc.oxc-vscode` | **watch** — editor-only, zero build risk | ESLint/Prettier extensions | — | trivial |
| oxc parser/resolver/transformer/minifier | Rust primitives | crates 0.147.0, 2026-08-24 | **watch (indirect only)** | Babel/esbuild internals | arrives via Vite 8 / tsdown | none |
| Rolldown | Rust bundler, Rollup-API compatible | 1.2.6, 2026-08-26; 1.0 on 2026-05-07 | **watch (indirect only)** | esbuild+Rollup inside Vite | arrives with the Vite 8 bump | none |
| TypeScript 7 (`tsgo`) | Go compiler, 8–12x full builds | 7.0.2, 2026-07-08 | **watch** — blocked by the lint stack | TS 6 `tsc` | all typescript-eslint repos | blocked |
| `@typescript/typescript6` shim | npm-alias giving TS6's API under TS7 | shipped with TS 7.0 | **watch** — time-boxed bridge only | — | only if a TS 7 bump is forced early | low, but accrues debt |
| Vitest 5 | next major | 5.0.0-rc.3, 2026-08-28 | **watch** — RC, not GA | Vitest 4 | — | — |
| `node:test` | Node's built-in runner | Stability 2 since v20 | **watch** | — | zero-dep internal scripts only | — |
| tsdown | Rolldown library/CLI bundler | v0.23.0-rc.1 | **watch** — pre-1.0 | tsup; bare `tsc` if adopted | npm CLIs, eventually | medium |
| unbuild | UnJS Rollup+esbuild bundler | actively maintained | **watch** | — | none — no UnJS dependency | — |
| `rolldown-plugin-dts` | `.d.ts` for Rolldown pipelines | needs Rolldown ≥1.2.0 | **watch** — ESM-only combined output | manual `tsc --declaration` | — | — |
| project references (`tsc -b`) | incremental multi-project builds | TS-native | **watch** — measure first | single-tsconfig build | the 2 largest repos, maybe | medium |
| `@typescript/analyze-trace` | tsc hot-spot analysis | 0.11.1, 2026-06-26 | **watch** — on-demand, never a CI gate | `console.time` profiling | any repo with a slow build | low, ad hoc |
| sonda | bundler-agnostic bundle analyzer | 0.14.0, 2026-07-05 | **watch** — swap trigger is Vite 8 | rollup-plugin-visualizer, source-map-explorer | SPAs, at the Vite 8 boundary | low |
| SonarQube / SonarJS server | duplication, quality gate, hotspots | analyzer 13.8.0.44569, 2026-08-28 | **watch** — PR decoration is $34/mo | — | none | high |
| `eslint-plugin-sonarjs` | ESLint bug/smell rules | 4.2.0, 2026-07-14 | **watch** — belongs to the rule catalogue, not here | — | — | — |
| `@golevelup/ts-vitest` `createMock<T>()` | typed fakes via Proxy | 4.0.0, 2026-03-18 | **watch** — redundant with the adopt row | — | pick one, never both | — |
| Standard Schema | `~standard` interop marker | spec 1.1.0, 2025-12-15 | **watch** | per-library adapters | zero impact today (`fma` uses zod directly) | — |
| `z.toZod<T>()` | exact schema↔type equality | Zod 4.5.2 | **watch** → adopt if `fma` grows schemas | `satisfies z.ZodType<T>` | `fma` | low |
| `web-vitals` | RUM metric collector | 6.2.1, 2026-08-26 | **watch** | — | none — no site has the traffic | — |
| tinybench | microbenchmark harness | 6.1.4, 2026-08-28 | **watch** — never speculatively | benchmark.js | — | — |
| mitata | microbenchmark w/ DCE + GC control | npm 1.0.34, 2025-02-04 | **watch** — best DCE ergonomics, quiet repo | benchmark.js | — | — |
| Vitest `bench` | tinybench wrapper | Experimental across 3 majors | **watch** | — | — | — |
| github-action-benchmark | CI regression alerts | 1.22.1, 2026-05-06 | **watch** — 200% default threshold | result spreadsheets | — | — |
| CodSpeed | instrumentation-based CI perf | `@codspeed/vitest-plugin` | **watch** | wall-clock CI benchmarking | — | — |
| Bencher | bare-metal continuous benchmarking | 0.6.12, 2026-08-22 | **watch** — needs dedicated hardware | wall-clock CI benchmarking | — | — |
| Node SEA + V8 startup snapshot | skip re-running init per launch | stable in current Node | **watch** — measure before building | plain `node dist/cli.js` | npm CLIs | high |
| corepack | pins the package manager itself | unbundled from Node ≥25 | **watch** — forward landmine | — | any repo bumping to Node 25 | low, at bump time |
| `act` | local Docker Actions runner | no version stated on README | **watch / optional** | nothing — supplements real CI | — | — |
| Bun 1.4 (Zig→Rust rewrite) | runtime + package manager | 1.4, 2026-08-20 | **watch** — 9 days old at survey | Bun 1.3 | `setup-ocx`, `kate-middlechild` | validate before bumping |
| Astro `client:*` directive audit | opt-in hydration | Astro 7.2.9 | **watch → add a check** | — | `grimoire-indexer` | low |
| Jest | general test runner | 30.5.0; Jest 30 on 2025-06-10 | **drop** (stay out) | — | none — zero adoption, no gap | — |
| ts-prune | unused-export finder | 0.10.3, 2021-12-12; archived 2025-09-19 | **drop** | superseded by knip, says so itself | — | — |
| depcheck | dependency finder | 1.4.7, 2023-10-17; archived | **drop** | superseded by `knip --dependencies` | — | — |
| madge | circular-dep graph | 8.0.0, 2024-08-05 | **drop as a gate** | dependency-cruiser `no-circular` | — | — |
| semgrep | pattern security scanner | p/typescript: 74 rules, all security | **drop** | subset of free CodeQL | — | — |
| source-map-explorer | source-map size analysis | 2.5.3, 2022-09-26 | **drop** | superseded by sonda | — | — |
| tsup | esbuild library bundler | unmaintained per its own README | **drop** | tsdown (eventually) | — | — |
| bundlesize | byte budget | 0.18.2, 2024-03-15 | **drop / never adopt** | size-limit | — | — |
| benchmark.js | microbenchmark suite | 2.1.4, 2017-03-28; repo archived 2022-12-22 | **drop** | tinybench / mitata | — | — |
| ts-mockito | Mockito-style typed mocking | 2.6.1, last publish 2022-06-27 | **drop** | `mock<T>()` | — | — |
| tsd | tests published `.d.ts` | 0.33.0, 2025-08-05 | **drop** | Vitest `--typecheck` on the same files | — | — |
| Stryker Mutator | mutation testing | core 10.0.0, 2026-08-14 | **drop (for now)** | — | none — fix the type gap first | high |
| changesets | PR-based versioning | — | **drop for this fleet** | release-please | — | — |
| semantic-release | commit-driven release | — | **drop for this fleet** | release-please | — | — |
| Turborepo | monorepo task-graph cache | primary docs unreachable (gap) | **drop for this fleet** | plain workspace scripts | — | — |
| Nx | monorepo cache + affected + boundaries | — | **drop for this fleet** | plain workspace scripts | — | — |
| Dependabot | dependency bot | 3-day default cooldown, 2026-07-14 | **drop in favor of Renovate** | — | — | — |
| Yarn 4.x | package manager | 4.18.0, 2026-07-29 | **drop from consideration** | — | zero adoption | — |
| CrUX / PageSpeed Insights | field-data dashboard | sample-gated, floor undisclosed | **drop as a gate** | — | these sites never clear the floor | — |
| `@playwright/experimental-ct-react` / `-vue` | old component testing | retired at Playwright 1.62 | **drop / never add** | the built-in stories+galleries model | — | — |
| `@vitest/browser` (the package) | pre-v4 browser mode | gone at Vitest 4.0 | **drop / never add** | `@vitest/browser-*` providers | — | — |
| `bun build --compile` | standalone Bun executable | current per Bun docs | **not applicable** | nothing — never used here | incompatible with `runs.using: node24` | — |
| `source-map-support` (npm) | stack-trace remapping | — | **drop / never add** | native `--enable-source-maps` | — | — |
| Rolldown native bundle analysis | metafile equivalent | **could not establish, 2026-08-29** | **gap** | — | — | — |

## The five decisions

### (a) oxc / tsgolint versus typescript-eslint, given TS 7.0's missing programmatic API

**Decision.** Keep typescript-eslint on every repo, pin `typescript` at
`^6.0.x` or below while it is installed, and spend the effort on *enabling*
type-aware configs rather than replacing the linter. Adopt `oxlint-tsgolint`
per repo, gated on that repo's own TS 7 migration — never before. Treat oxlint
itself as watch, with one timed pilot on `ocx-catalog` if anyone wants a number.

**Evidence.** `@typescript-eslint/eslint-plugin@8.68.0` declares
`peerDependencies.typescript: >=4.8.4 <6.1.0` — a hard install failure on TS 7,
verified against `npm view` (`oxc-project.md` §3). TS 7.0 shipped 2026-07-08
with no stable programmatic API; 7.1 is expected to carry "a new (and
different)" one with no announced date ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)).
tsgolint sidesteps this by driving `typescript-go` directly rather than
importing the `typescript` package, and reached stable on 2026-07-22 at 59 of
typescript-eslint's type-aware rules ([oxc stable blog](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)) —
but it cannot type-check a TS 6 project at all. Meanwhile type-aware linting is
on in 1 of 8 repos (`config-inventory.md` §2), and `strictTypeChecked` is what
pulls in `no-floating-promises`/`no-misused-promises`
(`runtime-posture.md` §1). Enabling it is a config-only change against an
already-installed plugin.

**Migration cost.** Enabling type-aware configs: one config edit per repo plus
the error backlog it surfaces — real but bounded, and `setup-ocx` already shows
the shape including which `no-unsafe-*` rules it chose to relax
(`setup-ocx/eslint.config.js:33-43`). Adopting tsgolint per repo: a TS 7 bump,
`npm add -D oxlint-tsgolint`, `options.typeAware` in a root `.oxlintrc.json`
(root-only — it cannot be set per-`overrides`), plus a rule diff against the
repo's currently-enabled type-aware rules, because the two unported rules are
**not named in any doc**.

**What flips it.** TS 7.1 shipping a stable API *and* typescript-eslint
publishing a peer range that includes `^7` — then the tsgolint case weakens to
a pure speed argument and the fleet should re-measure rather than migrate.
Conversely, if 7.1 slips past ~2027 and a repo needs TS 7's compiler speed
badly enough, tsgolint becomes the forcing function for that repo alone.

### (b) Which test runner per shape, and whether four runners is a defect

**Decision.** Four runner families, assigned by shape, is correct and should be
written down as intentional. Vitest 4.1 for anything Vite-adjacent
(`ocx-catalog`, `grimoire-indexer`, `fma`, `creeptd-ng/web`,
`kate-middlechild/packages/web`); `bun test` for Bun-native code (`setup-ocx`,
`kate-middlechild/packages/core`); Mocha + `@vscode/test-cli` +
`@vscode/test-electron` for both extensions; Playwright for e2e and visual
regression. Jest stays out. `node:test` stays out.

**Evidence.** VS Code's own extension-testing guide (last updated 2026-08-26)
names `@vscode/test-cli`+`@vscode/test-electron` as the sanctioned path,
states it "exclusively uses Mocha under the hood," and endorses no alternative —
the Electron host is the reason, not inertia. Playwright isolates every
individual test; Vitest browser mode isolates only per *file* (Vitest's own
Playwright-provider page) — that is the real axis, and `kate-middlechild`
already resolves it by using both at different tiers. Jest has zero fleet
adoption and is still chasing ESM parity (`jest.unstable_unmockModule()`) that
Vitest, `bun test` and `node:test` have natively. `node:test`'s coverage, tags
and global setup/teardown are all still Stability 1 even on Node 26.

**The actual defects.** `fma` is on `vitest@^2.1.8` — two majors behind stable
4.1.11. `ocx-catalog` is on `^3.2.4` — one major. `setup-ocx/bunfig.toml` uses
singular threshold keys (`line`/`function`/`statement`) against Bun's documented
plurals, which very likely makes its coverage gate a silent no-op.
`vscode-ocx/.vscode-test.mjs` sets no `mocha.timeout`, still on Mocha's 2s
default — the exact gap `grimoire-vscode` already hit on a cold macOS runner and
fixed with `timeout: 30000`.

**Migration cost.** Two version bumps (one of them a two-major jump with
`clearMocks`, pool-option and coverage-config changes to absorb), and two
one-line config fixes.

**What flips it.** If a future Vitest gains a supported Electron-host driver,
the extension pair could collapse into the Vitest column — nothing else would.
Vitest 5 going GA changes the upgrade target, not the shape.

### (c) What replaces the 164 `as unknown as T` casts

**Decision.** No inline `as unknown as T` at a fake's call site. In Vitest
repos, `mock<T>()` from `vitest-mock-extended` (5.1.1) composed with the
literal's explicit overrides — zero casts. In the two Mocha/Electron
extensions, a repo-local `fake<T>()` helper per faked interface that contains
exactly one cast, replacing N inlined ones. Pick `vitest-mock-extended`, not
`@golevelup/ts-vitest`; never both.

**Evidence.** 164 double-casts fleet-wide, filtered for comments and string
literals (`code-shape.md` §2): 79 in `grimoire-vscode` (12 files, all under
`src/test/`), 57 in `ocx-catalog`, 10 in `creeptd-ng/web`, 7 in `fma`, 5 each in
`vscode-ocx` and `grimoire-indexer`, 1 in `kate-middlechild`. Every sampled
instance manufactures a fake `vscode.*` or `window` object — e.g.
`grimoire-vscode/src/test/installStateUnknown.test.ts:135`. `satisfies` cannot
help: it requires *every* required member present, and `vscode.WebviewPanel` has
dozens where a test touches three — that is precisely why the fleet reaches for
the cast (`type-testing.md` §6).

**The split the scouts missed, and why it matters.** `vitest-mock-extended`'s
`mock<T>()` populates unstubbed members as `vi.fn()` spies — it is a Vitest
package. The fleet's *worst* offender, `grimoire-vscode` with 79 casts, runs
**Mocha with `node:assert`**, not Vitest (`config-inventory.md` §3;
`test-runners.md` §5). `@golevelup/ts-vitest` has the same constraint. So the
recommended adopt does not reach 84 of the 164 casts. For those two repos the
answer is the helper pattern `code-shape.md` §2 already proposed — one named
`fake<T>()` containing the single cast — which is a smaller diff than
introducing a fifth test runner to get a mocking library.

**Migration cost.** `ocx-catalog`/`creeptd-ng/web`/`fma` (74 casts): one
dependency plus a mechanical per-site rewrite. `grimoire-vscode`/`vscode-ocx`
(84 casts): no new dependency, one helper module per repo, and the existing
`fakePanel()`/`fakeView()` helpers are structurally already this pattern minus
the consolidation.

**What flips it.** A maintained Mocha-compatible `mock<T>()` (or Microsoft
shipping an official `vscode` test-double package) would collapse both halves
into one adopt.

### (d) Whether Lighthouse CI earns its place in `ocx-catalog`, and what it should assert

**Decision.** Yes — keep it, in `ocx-catalog` only. Assert
`categories:accessibility` and `categories:seo` at `error`,
`categories:best-practices` at `error`, `categories:performance` at `warn` and
never `error`. Add `aggregationMethod: 'median'` to every assertion. Keep
`numberOfRuns` ≥3. Never assert individual audits. Replicate the a11y/SEO/
best-practices half — and only that half — to `grimoire-indexer`.

**Evidence.** The config is genuinely well-built: category-level assertions
chosen deliberately over the `lighthouse:no-pwa` preset (whose audit-by-audit
list the shipped VitePress theme legitimately fails), thresholds derived from
measured medians across 3 runs × 8 pages minus a ≥0.03 margin, and a proven red
state — a deliberate a11y regression dropped the score 0.92→0.77 and failed with
exit code 1 (`web-performance.md` §8). The gap: LHCI's documented default when
an assertion omits `aggregationMethod` is `optimistic` — *best*-of-N — so the
gate is currently more lenient than its own docblock claims, and a regression
appearing in 2 of 3 runs passes ([LHCI configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)).
Performance must stay at `warn` because CrUX has a real but undisclosed
sample-volume floor these low-traffic sites plausibly never clear
([CrUX methodology](https://developer.chrome.com/docs/crux/methodology)) —
there is no field data to cross-check a lab performance score against. INP is not
in Lighthouse's performance score at all; the weights are LCP 25 / TBT 30 /
CLS 25 / FCP 10 / SI 10.

**Migration cost.** One key per assertion. The `grimoire-indexer` replication is
a config file plus a CI job.

**What flips it.** `@lhci/cli` is 0.15.1 (2025-06-25) and pins
`lighthouse@12.6.1` exactly, while standalone `lighthouse` is 13.4.1
(2026-07-20) — 14 months stale. At 18 months with no release, replace it with
`lighthouse` directly plus a median/threshold script.

**And separately:** the SPAs do not get LHCI. They get `size-limit` (13.0.3),
because `fma`'s committed `dist/assets/index-VpTlMCXO.js` is 568K — already past
Vite's own 500kB `chunkSizeWarningLimit`, which warns and exits 0. `bundlesize`
is dead (one release since 2021) and must never be the tool reached for.

### (e) Which bundler per build shape

**Decision.**

| shape | bundler | verdict |
|---|---|---|
| VS Code extensions | esbuild 0.28.2 | keep — no case to switch |
| GitHub Action on Bun | esbuild, invoked from a Bun-run script | keep — and `bun build --compile` is categorically wrong here |
| Browser SPAs | Vite 8 (Rolldown) | adopt — bump from Vite ^6 |
| npm CLIs | bare `tsc` + `isolatedDeclarations` | keep the emitter, add the flag; `tsdown` stays watch |

**Evidence.** Both extension bundles are 24 KB and 844 KB, built with esbuild's
context/watch API at sub-second latency; Rolldown would add a Rust-toolchain
dependency and a plugin layer neither extension uses, for no measurable win
(`build-bundle.md` §3). esbuild is not dying — 0.28.2 shipped 2026-08-08 with
active solo maintenance and an `es2026` target. `setup-ocx/scripts/build.ts` is
a Bun-*run* script calling the esbuild npm API to emit a Node-CJS bundle;
`action.yml` declares `runs.using: node24`, which executes a Node script and
categorically cannot run a `--compile` binary (Bun's own docs: `--compile`
rejects `--target=node`). Vite 8 (2026-03-12) replaced esbuild+Rollup with
Rolldown as its sole bundler, with a 19k-module benchmark of 40.10s → 1.61s and
field reports of Linear 46s→6s; both SPAs are on `^6` with `rolldown-vite`
(the documented gradual path for complex projects) untaken. `tsup` is
unmaintained by first-party README notice; `tsdown` is its stated successor but
sits at `v0.23.0-rc.1`. `isolatedDeclarations` works on TS 5.5+ with no
compiler-version dependency and is the prerequisite for non-`tsc` declaration
emit later.

**Migration cost.** Vite 6→8 is the real one: `build.rollupOptions` →
`rolldownOptions`, `optimizeDeps.esbuildOptions` → `rolldownOptions`,
`esbuild:` → `oxc:`, `manualChunks` object form **removed outright**,
`build.commonjsOptions` now a no-op, browser targets raised to 2026-01-01
Baseline, and `esbuild.supported` has *no* Oxc equivalent (it parses and is
silently ignored). `isolatedDeclarations` costs one explicit type annotation per
export that currently relies on inference — a hard compiler error, not a warning.

**What flips it.** `grimoire-indexer` listing `astro` as a **runtime**
dependency, producing a **346 MB** installed `node_modules`, is the one real
argument in this fleet for bundling a CLI. But that is an architecture question
first — should the Astro renderer be a runtime dependency at all — and only a
bundler question second. Answer that, then revisit `tsdown` when it reaches 1.0.

## The ruleset

`TS-TOOL-nn`. Each rule is something an agent gets wrong without being told;
generic knowledge ("use `strict`", "run tests in CI", "pin your dependencies")
is deliberately absent. Verification is an exact command or config key.

**TS-TOOL-01 — MUST.** Do not raise a repo's `typescript` dependency above
`^6.0.x` while `typescript-eslint` is installed.
*Rationale:* the peer range is `>=4.8.4 <6.1.0` — an install failure on TS 7 and
on TS 6.1 alike, not a warning.
*Verify:* `npm view @typescript-eslint/eslint-plugin peerDependencies` compared
against the repo's declared `typescript` range, before the bump.

**TS-TOOL-02 — MUST.** Do not add `oxlint-tsgolint` or set
`options.typeAware` on a repo whose installed TypeScript is not `7.x`.
*Rationale:* tsgolint hard-requires TS 7 and cannot type-check a TS 6 project.
*Verify:* `npm ls typescript` shows `7.x` before `.oxlintrc.json`'s
`options.typeAware` is set to `true` (root config only — it is not settable per
`overrides`).

**TS-TOOL-03 — MUST.** Every ESLint repo enables a type-checked config
(`strictTypeChecked` or `recommendedTypeChecked`) with `projectService` or
`parserOptions.project` wired.
*Rationale:* `no-floating-promises`, `no-misused-promises`, `await-thenable` and
the `no-unsafe-*` family are structurally unavailable without it — adding the
rule names to a config that lacks the project wiring does nothing.
*Verify:* `grep -l "TypeChecked" eslint.config.*` in every ESLint repo, and
confirm a `parserOptions.project`/`projectService` key in the same file.

**TS-TOOL-04 — MUST.** A repo that declares a `lint` script must have a linter
config that script resolves, and CI must invoke that script.
*Rationale:* a lint script pointing at no config is a gate that reports nothing
and blocks nothing — the silent-pass class this program has now found in three
languages.
*Verify:* the `lint` script's config file exists on disk, and the CI job list
contains it. `creeptd-ng/web/package.json:14` fails both halves today.

**TS-TOOL-05 — MUST.** A `bunfig.toml` `coverageThreshold` uses the plural keys
`lines` / `functions` / `statements`, and never relies on `statements` alone.
*Rationale:* Bun's documented keys are plural; the singular forms are silently
ignored, and `statements` is accepted-but-never-enforced even when spelled
right.
*Verify:* `grep -A1 coverageThreshold bunfig.toml` contains no singular
`line`/`function`/`statement`. Prove enforcement once by setting a threshold
above real coverage and confirming `bun test --coverage` exits non-zero.

**TS-TOOL-06 — SHOULD.** Every `.vscode-test.mjs` sets an explicit
`mocha.timeout` above Mocha's 2000 ms default.
*Rationale:* the Extension Development Host's cold-start cost exceeds 2 s on CI
runners; `grimoire-vscode` already hit this on macOS and fixed it at 30000.
*Verify:* a `timeout` key inside the `mocha` block of `.vscode-test.mjs`; its
absence is the failure state.

**TS-TOOL-07 — MUST.** Every `assert.assertions` entry in a `.lighthouserc.*`
sets `aggregationMethod` explicitly.
*Rationale:* the default is `optimistic` — best-of-N — so a threshold derived
from a measured median silently gates on something easier than intended.
*Verify:* every `[level, {...}]` tuple in the config carries
`aggregationMethod`, or the file's docblock states it intends `optimistic` and
why.

**TS-TOOL-08 — SHOULD.** Never assert Lighthouse `categories:performance` at
`error` on a site with no CrUX field data; `warn` is the ceiling.
*Rationale:* a lab performance score with no field data has nothing to validate
it against; a11y/SEO/best-practices are deterministic lab checks and do not have
this problem.
*Verify:* `categories:performance` (and any performance audit) is at `warn`
unless PageSpeed Insights returns a real CrUX field panel for that origin.

**TS-TOOL-09 — SHOULD.** A repo that ships a bundled SPA entry chunk gates its
size with `size-limit` in CI, not with Vite's `chunkSizeWarningLimit`.
*Rationale:* `chunkSizeWarningLimit` prints to stdout and exits 0 — it has never
stopped anything; `fma`'s bundle is already past it.
*Verify:* a `"size-limit"` key in `package.json` (or a `.size-limit.*` file) and
a CI step running `npx size-limit`, which exits non-zero on breach.

**TS-TOOL-10 — MUST.** Never write `as unknown as T` at a fake's call site. One
named helper per faked interface holds exactly one cast — `mock<T>()` from
`vitest-mock-extended` in Vitest repos, a repo-local `fake<T>()` in
Mocha/Electron repos.
*Rationale:* an inlined double-cast means a renamed or removed member on the
real interface produces no compile error anywhere; 164 of them exist and 84 sit
in repos where the Vitest-based fix does not apply.
*Verify:* `grep -rn "as unknown as" '**/*.test.ts'` returns no *new* hits in a
diff; surviving hits are tracked, not introduced.

**TS-TOOL-11 — SHOULD.** A case that must NOT compile is written as
`// @ts-expect-error` in a type-test file, never as a prose comment.
*Rationale:* an unused `@ts-expect-error` is itself a compile error, so the test
self-invalidates when the guarded case stops failing. A comment rots silently,
and `@ts-ignore` does nothing at all.
*Verify:* the repo's existing `tsc --noEmit` / `check-types` script exits
non-zero on an unused directive — no extra tooling needed.

**TS-TOOL-12 — MUST.** Every package without `"private": true` runs `publint`
and `attw --pack` against a real packed tarball in CI.
*Rationale:* these are the repos a third party's bundler resolves against; an
`exports`-map or declaration-format break there is a user-facing incident that
`tsc` never sees.
*Verify:* `grep -L '"private": true' */package.json` lists the repos that need
the gate; the CI workflow must *invoke* both, not merely depend on them.
`ocx-catalog/scripts/pack-smoke.mjs:146-166` is the reference implementation.

**TS-TOOL-13 — MUST.** Any committed `dist/` is rebuilt from source and diffed
in the same CI gate; never verified by a byte hash.
*Rationale:* GitHub Actions execute the committed file, so drift ships stale or
tampered code to every consumer. Byte-reproducible bundler output could not be
established for esbuild, Rolldown, tsdown or Bun — a hash scheme would encode a
guarantee none of them make.
*Verify:* a gate that runs the build then `git diff --exit-code dist/`.
`setup-ocx/taskfile.yml:63-65` (chained at `:61`, invoked by
`verify-basic.yml:27`) is the reference.

**TS-TOOL-14 — MUST.** A GitHub Action declaring `runs.using: nodeNN` ships
plain JavaScript, never a `bun build --compile` binary.
*Rationale:* GitHub's JS-action runtime executes the file with Node; `--compile`
explicitly rejects `--target=node` and emits a standalone Bun binary.
*Verify:* read `action.yml`'s `runs:` block first; then
`file dist/**/index.js` must report JavaScript source, not ELF/Mach-O/PE.

**TS-TOOL-15 — SHOULD.** Every `uses:` in every workflow is pinned to a full
commit SHA with a trailing version comment, and `zizmor` runs on any
workflow-file change.
*Rationale:* floating major tags let a compromised action land silently, and the
fleet already disagrees with itself by a full major on the same action across
sibling repos.
*Verify:* `zizmor .github/workflows/` reports zero `unpinned-uses` findings; or
`grep -RE "uses: [A-Za-z0-9./_-]+@v[0-9]" .github/workflows/` returns nothing.

**TS-TOOL-16 — MUST.** Never add any of: `ts-prune`, `depcheck`, `madge` (as a
gate), `tsup`, `bundlesize`, `benchmark.js`, `ts-mockito`, `source-map-explorer`,
`source-map-support`, `jest`, `tsd`, `@playwright/experimental-ct-*`, or
`@vitest/browser`.
*Rationale:* every one is archived, formally unmaintained, or superseded by a
first-party replacement, and every one is what an LLM's training data
recommends. This single grep catches the most common tooling error an agent
makes on this fleet.
*Verify:* `grep -nE '"(ts-prune|depcheck|madge|tsup|bundlesize|benchmark|ts-mockito|source-map-explorer|source-map-support|jest|tsd)"' package.json`
plus `grep -rn "experimental-ct-\|@vitest/browser\"" package.json` — any hit is
review-blocking.

**TS-TOOL-17 — SHOULD.** Never cite a vendor speed multiplier as this fleet's
expected result; time both tools on the target repo before claiming a win.
*Rationale:* every headline number in this corpus is measured on repos one to
three orders of magnitude larger than these. The one small-repo data point shows
oxlint *regressing* 11–49%.
*Verify:* a PR description claiming a speed win carries a timed before/after on
the named repo, or the claim is removed.

**TS-TOOL-18 — SHOULD.** Run `knip` in CI on every repo, and run
`knip --production --dependencies` as a *separate*, advisory check.
*Rationale:* `knip` is the only tool that surfaces the stub-entry-point and
dead-export defect directly. The `--production` variant is a *heuristic* for
misplaced `dependencies`/`devDependencies` — it also flags legitimately-unused
production deps, so it needs a human glance, never an auto-fail.
*Verify:* a `run: npx knip` step exists (exit code 1 on issues); the
`--production --dependencies` run is a distinct step whose output is reviewed,
not gated. In a workspace repo, `knip.json` must use the `workspaces` key — a
root-level `entry`/`project` is silently ignored once workspaces exist.

**TS-TOOL-19 — SHOULD.** Every architectural boundary a repo claims in prose has
a `dependency-cruiser` `forbidden` rule at `severity: "error"`, plus
`no-circular`.
*Rationale:* a boundary stated only in a barrel file's header comment is not
enforced — `kate-middlechild` violates its own stated one today.
*Verify:* `.dependency-cruiser.{c,m}js` contains a rule whose `to.path` matches
the disallowed target; `depcruise --config … src` exits non-zero on violation.

**TS-TOOL-20 — SHOULD.** No repo runs a test runner more than one major behind
its current stable, and no repo adopts a prerelease.
*Rationale:* v3→v4 and v4→v5 each carry real breaking changes (coverage config,
pool renames, `clearMocks` default, browser-matcher strictness); silent drift
compounds the eventual migration.
*Verify:* `npm ls vitest --depth=0` per repo against
`npm view vitest dist-tags.latest`; any value containing `-rc.`/`-beta.` is not
GA and must not be adopted.

## Applied to the fleet

### Already satisfied — the reference implementations

| commitment | where it already holds |
|---|---|
| TS-TOOL-03 (type-aware lint) | `setup-ocx/eslint.config.js:15-16` — `strictTypeChecked` + `stylisticTypeChecked` with `parserOptions.project: "./tsconfig.eslint.json"`; the only repo in the fleet, and the model for the other seven |
| TS-TOOL-12 (package contract) | `ocx-catalog/scripts/pack-smoke.mjs:146-166,528-529` runs `publint` then `attw --pack` against a real tarball, driven by `task pack-smoke` and CI's `pack-verify` job |
| TS-TOOL-13 (dist drift) | `setup-ocx/taskfile.yml:63-65` `dist:check: git diff --exit-code dist/`, chained after `build` at `:61`, invoked by `.github/workflows/verify-basic.yml:27` |
| TS-TOOL-15 (SHA pinning + zizmor) | `ocx-catalog/.github/workflows/ci.yml:27` full-SHA-pins every `uses:`; a `workflows-lint` job already runs zizmor; `renovate.json` carries `{"matchManagers":["github-actions"],"pinDigests":true}` |
| TS-TOOL-06 (mocha timeout) | `grimoire-vscode/.vscode-test.mjs` sets `mocha.timeout: 30000` with an in-repo comment recording the cold-macOS-runner failure that caused it |
| visual-snapshot tolerance | `kate-middlechild/playwright.config.ts` sets `expect.toHaveScreenshot: { maxDiffPixelRatio: 0.01 }` and constrains to `chromium-{light,dark}` — the fleet's only correct pixel-snapshot config |
| suppression discipline | `kate-middlechild/packages/web/src/islands/` — 5 `biome-ignore` comments, every one carrying a stated reason; zero type-safety suppressions anywhere in the fleet (0 `@ts-ignore`, 0 `@ts-nocheck` across ~130k LOC) |
| source maps by build mode | both extensions' `esbuild.js` sets `sourcemap: !production` |

### Violated today

| violation | citation |
|---|---|
| Type-aware linting off in 7 of 8 repos — floating promises structurally uncatchable | `config-inventory.md` §2; `runtime-posture.md` §1 |
| Two rule files *claim* type-aware ESLint their configs do not wire | `vscode-ocx/.claude/rules/quality-typescript.md:478` and its `grimoire-vscode` twin, against `eslint.config.mjs` with no `parserOptions.project` |
| Bun coverage gate is almost certainly a silent no-op | `setup-ocx/bunfig.toml` — `coverageThreshold = { line = 0.85, function = 0.85, statement = 0.85 }`, singular against Bun's documented plurals |
| LHCI gates optimistically while its own docblock says median | `ocx-catalog/.lighthouserc.cjs` — no `aggregationMethod` on any assertion |
| A `lint` script with no config, never called by CI | `creeptd-ng/web/package.json:14` `"lint": "eslint src --ext .ts,.vue"`; no `eslint.config.*` anywhere under `web/`; the `web-check` job never invokes it |
| Test-only packages in runtime `dependencies` | `creeptd-ng/web/package.json` — `@testing-library/vue ^8.1.0`, `@vue/test-utils ^2.4.10`, `jsdom ^29.1.1`; the only such violation in the fleet |
| Two package managers in one repo | `creeptd-ng/pnpm-lock.yaml` + `creeptd-ng/pnpm-workspace.yaml:1-2` at root, `creeptd-ng/web/package-lock.json` in the member — one of them stale and used by nothing |
| Sibling extensions disagree by a full action major | `vscode-ocx/.github/workflows/ci.yml:316,318` `@v6` vs `grimoire-vscode/.github/workflows/ci.yml:232,234` `@v7`; and `vscode-ocx/eslint.config.mjs:19-26` downgrades every rule its sibling sets to `error` down to `warn` |
| No `mocha.timeout` in the sibling that has not been bitten yet | `vscode-ocx/.vscode-test.mjs` — still Mocha's 2 s default |
| Published package with zero shape verification | `grimoire-indexer` ships the same `bin` + `exports` shape as `ocx-catalog` with neither `publint` nor `@arethetypeswrong/cli` in `devDependencies` |
| Stated boundary not enforced | `kate-middlechild/packages/core/src/map.test.ts:12` imports `../../web/src/data/ph-regions.geojson.json`, against `packages/core/src/index.ts`'s own header — "Public barrel: the ONLY import surface" |
| Test-runner drift | `fma` `vitest@^2.1.8` (two majors); `ocx-catalog` `vitest@^3.2.4` (one major) |
| Unbudgeted SPA bundle already over the line | `fma/dist/assets/index-VpTlMCXO.js` — 568K, past Vite's own 500 kB warn threshold, with nothing failing |
| 164 inlined double-casts | `code-shape.md` §2 — 79 `grimoire-vscode`, 57 `ocx-catalog`, 10 `creeptd-ng/web`, 7 `fma`, 5 `vscode-ocx`, 5 `grimoire-indexer`, 1 `kate-middlechild` |
| Two repos with a full local gate and no CI at all | `fma` and `kate-middlechild` have no `.github/workflows/` directory; `kate-middlechild/Taskfile.yml:47-54` is the fleet's *most complete* gate and nothing invokes it |
| No dependency bot in five of eight repos | Renovate only in `ocx-catalog`; Dependabot in `grimoire-vscode`, `vscode-ocx`, `setup-ocx`; nothing in `grimoire-indexer`, `fma`, `kate-middlechild`, `creeptd-ng` — and the two Dependabot siblings have already drifted (`vscode-ocx` lacks `grimoire-vscode`'s `ignore:` block for the TS-7 peer conflict) |
| CI Node pinning is five distinct states, one of them absent | Node 24 (`ocx-catalog`), 22+24 matrix (`grimoire-indexer`), Node 20 (both extensions), no `actions/setup-node` step at all (`creeptd-ng` `web-check`), and no workflow-level pin (`setup-ocx`) |
| Vite two majors stale in both SPAs | `fma` `vite ^6.0.5`, `creeptd-ng/web` `vite ^6.0.0`; neither took the `rolldown-vite` gradual path |

### New commitments

`knip`, `dependency-cruiser`, CodeQL, fleet-wide `zizmor`, `size-limit` on the
two SPAs, one shared Renovate preset replacing four bot configs and five
absences, one reusable CI workflow replacing six hand-maintained Node/action
blocks, `isolatedDeclarations` on the two CLIs, `mock<T>()`/`fake<T>()` replacing
164 casts, `.test-d.ts` type tests riding the four existing `tsc --noEmit`
scripts, `release-please` on the five repos that already have a `release.yml`,
`--enable-source-maps` on both CLIs, and the Vite 6→8 bump.

## AI-agent failure modes

Ranked by how often each bites on this fleet.

1. **Recommending an archived tool as "the standard."** `ts-prune`, `depcheck`,
   `madge`, `tsup`, `bundlesize`, `benchmark.js`, `ts-mockito`,
   `source-map-explorer` — eight tools, all with the most training-text volume in
   their category and all superseded or archived, several of which say so in
   their own README. *Check:* `curl -s https://registry.npmjs.org/<pkg> | jq -r '.time[.["dist-tags"].latest]'`
   and reject anything with no publish in 12 months; `gh api repos/<o>/<r> --jq .archived`.
2. **Bumping `typescript` to `^7` "for the speed."** The peer range makes it an
   install failure, and `@typescript/typescript6` — the shim an agent reaches for
   next — gives TS 6 semantics under an alias while `tsc` runs TS 7, so it does
   *not* deliver the speed the bump was for. *Check:* run the repo's lint after
   any TypeScript major bump, before calling it done.
3. **Naming a superseded flag or package that still parses.** `@vitest/browser`
   (split into providers at v4.0), `@playwright/experimental-ct-*` (retired at
   1.62), `build.rollupOptions` (renamed at Vite 8), `esbuild.supported` (parses
   under Vite 8 and is silently ignored — Oxc has no equivalent),
   `esbuild:` (auto-converted to `oxc:` with a deprecation), `toMatchTypeOf`
   (deprecated at expect-type 1.2.0), singular `bunfig.toml` threshold keys.
   Every one fails *silently*. *Check:* after any migration, diff the config
   against the tool's own migration guide by hand — a linter will not flag an
   ignored key.
4. **Citing a benchmark whose shape does not match.** "50–100x faster than
   ESLint" is a vendor number on large repos; "12–18x" is measured on
   microsoft/vscode and typeorm; Rolldown's "19k modules in 1.61s" is a dated
   synthetic. This fleet's repos are 10–193 files, where the one small-repo
   report shows *regressions*. *Check:* a bare multiplier with no project name,
   date and hardware note is unverified until traced to source.
5. **Hallucinating a version, or an API, from training data.** `Bun.bench()` and
   `bun test --bench` do not exist — Bun's own docs point at mitata and
   hyperfine. "Bun 1.3" and "pnpm 10" are each at least one major stale.
   `@typescript-eslint` version claims paired with TS 7 compatibility are
   fabricated. *Check:* `npm view <pkg> version time.modified` before writing any
   version into config or prose.
6. **Writing a benchmark that measures nothing.** A `bench()` callback whose
   result is never consumed is a dead-code-elimination target; tinybench and
   Vitest `bench` will report a near-zero number and flag nothing (only mitata
   marks it with `!`). *Check:* the callback's value reaches an accumulator read
   after the loop, or `do_not_optimize()`.
7. **Setting a gate tight enough to be flaky, or loose enough to be theatre.**
   A 5–10% regression threshold on a GitHub-hosted runner manufactures a check
   nobody trusts (>30% run-to-run variance documented); `github-action-benchmark`'s
   own 200% default only catches 2x regressions. Same failure in the other
   direction: LHCI's `optimistic` default quietly loosens a "measured median"
   threshold. *Check:* name the runner class and the measured variance beside any
   threshold.
8. **Conflating a plugin with a platform.** "Add SonarJS" reads as a cheap lint
   addition; the duplication detection and quality gates the request actually
   wants require standing up SonarQube, with PR decoration behind a $34/mo tier.
   *Check:* if the recommendation says "Sonar" and also says "PR check" or
   "quality gate," verify the feature's tier before proposing it.
9. **Recommending a mocking or type-testing tool that cannot run in the target
   repo.** `vitest-mock-extended` needs Vitest; `expectTypeOf` needs Vitest;
   `tsd` duplicates a runner already installed. The fleet's worst cast
   concentration lives in a Mocha repo. *Check:* read the repo's actual test
   runner before proposing a runner-coupled library.
10. **Suggesting a whole-program tool as a blanket "add to CI."**
    `--generateTrace`/`analyze-trace` only works when `tsc` itself compiles (not
    through a bundler), has no threshold to fail on, and is a diagnostic for an
    already-slow build. *Check:* the proposed CI step must have a pass/fail
    signal, or it is a script, not a gate.
11. **Claiming Standard Schema conformance from memory.** Zod 4.5.2 and Valibot
    1.4.2 ship the `~standard` marker (verified in shipped bytes); ArkType 2.2.3
    and `@sinclair/typebox` 0.34.52 did not, and their status could not be
    established. *Check:* `grep -c '"~standard"' node_modules/<lib>/**/*.js`.
12. **Reporting `act` output as a CI pass.** `act`'s own docs make no
    runner-image fidelity claim. *Check:* never substitute for a required real CI
    run.

## Open questions

**Needs a human decision:**

- **Is `astro` correctly a runtime `dependency` of `grimoire-indexer`?** It
  produces a 346 MB installed `node_modules` for every `npx` consumer. This is an
  architecture call — optional peer, bundled, or accepted — and it gates whether
  the CLI-bundling question is even worth asking.
- **Do `fma` and `kate-middlechild` get CI, or is "local gates only" deliberate?**
  `kate-middlechild` has the fleet's most complete `verify` target and nothing
  invokes it. Either answer is defensible; the current state is neither.
- **Does `ocx-catalog` deliberately track `vitepress@^2.0.0-alpha.18`** while
  npm's `latest` is 1.6.4? An alpha dependency on a performance-relevant SSG core
  under a CI performance gate is a choice someone made and should confirm.
- **Which repo moves to TypeScript 7 first**, once one can? `creeptd-ng/web` and
  `kate-middlechild` are the only two not blocked by typescript-eslint — and
  `kate-middlechild` is on Biome, which has no promise-aware rule at all, so it
  would move to TS 7 with *less* type-aware coverage, not more.
- **Renovate fleet-wide, or Renovate plus Dependabot?** Retiring Dependabot
  avoids two bots opening competing PRs; keeping it is a redundant signal. One
  call, eight repos.

**Deserves another research round:**

| subarea | the question |
|---|---|
| **Typed test doubles for non-Vitest runners** *(highest value)* | What replaces `as unknown as vscode.*` in a **Mocha/Electron** repo? `vitest-mock-extended` and `@golevelup/ts-vitest` both require Vitest, and 84 of the fleet's 164 casts are in repos that cannot use either. Does a runner-agnostic Proxy-based `mock<T>()` exist, or is a hand-written `fake<T>()` genuinely the terminus? |
| **Fleet-measured lint and CI cost** | No measurement of `oxlint` vs the configured ESLint stack, or of `knip` + `dependency-cruiser` wall-clock, exists on any repo here. Every adopt/watch call in this document that turns on a speed argument is borrowed from someone else's hardware. |
| **Type-aware linting's real backlog** | Turning on `strictTypeChecked` in seven repos surfaces an unknown number of errors. What is the count per repo, and how many are genuine floating promises versus `no-unsafe-*` noise the fleet would relax anyway (as `setup-ocx` already did for six rules)? |
| **Astro and Vue false positives** | `knip`'s own FAQ warns `.vue`/`.astro` files need their real compilers; `grimoire-indexer` (Astro+Preact), `creeptd-ng/web` and `ocx-catalog` (38 `.vue` files) are exactly those shapes. Same question for `dependency-cruiser`'s SFC resolution. |
| **The shared-infrastructure design** | Does the Renovate preset and the reusable CI workflow live in one `ocx-sh/.github` repo or two? And what input surface does one workflow need to serve VitePress, Astro/Preact, esbuild+Electron, Bun, Vite+React and Vue+Playwright? |

**Explicit gaps carried from the scouts, not resolved here:** Rolldown's
metafile/analysis story (**could not establish, 2026-08-29** — homepage and
guide path 404); byte-reproducible bundler output for esbuild/Rolldown/tsdown/Bun
(**could not establish** — unaddressed by every primary source read);
Turborepo's own docs (fetch redirected, verdict rests on secondary sources — but
the verdict is "drop" either way); the identity of tsgolint's 2 unported rules
(named in no doc, README or changelog); ArkType and TypeBox's Standard Schema
status; oxlint's Node/programmatic API beyond the LSP.

**Scout landing status:** all eight tooling scouts and all six named wave-1
scouts landed. A seventh wave-1 scout not named in the brief,
`recent-shifts.md`, is also present in the directory and was read and consolidated.

## Candidate topics for the topic map

| slug | question | priority | which fleet shape | checkable by |
|---|---|---|---|---|
| `type-aware-lint-enablement` | What is the per-repo error backlog from turning on `strictTypeChecked`, and which `no-unsafe-*` relaxations are justified? | P0 | all ESLint repos (7 of 8) | `grep -l TypeChecked eslint.config.*`; error count per repo |
| `ts7-migration-sequencing` | Which repo crosses to TypeScript 7 first, and does tsgolint go before or after its lint cutover? | P0 | all | `npm ls typescript`; `@typescript-eslint` peer range |
| `typed-fakes-without-vitest` | What replaces `as unknown as T` in a Mocha/Electron repo where `mock<T>()` cannot run? | P0 | VS Code extensions (84 of 164 casts) | `grep -rn "as unknown as" '**/*.test.ts'` returns no new hits |
| `bun-coverage-threshold-keys` | Is `setup-ocx`'s coverage gate a no-op, and does the plural-key fix make it fail? | P0 | GitHub Action on Bun | set a threshold above real coverage; `bun test --coverage` must exit non-zero |
| `lhci-aggregation-method` | Does adding `aggregationMethod: 'median'` change `ocx-catalog`'s pass/fail on any current commit? | P0 | npm CLI + VitePress site | `grep aggregationMethod .lighthouserc.cjs` |
| `dead-lint-gate-creeptd` | Does `creeptd-ng/web` get an ESLint config, or does the dead `lint` script get deleted? | P0 | Vue SPA | config file exists and CI invokes the script |
| `fleet-reusable-ci-workflow` | What input surface does one reusable workflow need across six heterogeneous toolchains? | P0 | all CI'd repos | `grep -L "uses: ocx-sh/.*/.github/workflows/" */.github/workflows/ci.yml` empty |
| `renovate-shared-preset` | What is the concrete preset replacing four bot configs and five absences? | P0 | all | every repo's `renovate.json` is a one-line `extends`; no `dependabot.yml` remains |
| `vite8-migration-path` | Straight to Vite 8, or through `rolldown-vite` first, for a WebGL SPA and a Connect-RPC/protobuf SPA? | P1 | browser SPAs | `grep -n "rollupOptions\|esbuildOptions\|manualChunks" vite.config.*` |
| `vitest-major-drift` | What breaks when `fma` jumps `vitest` 2→4 and `ocx-catalog` 3→4? | P1 | Vitest repos | `npm ls vitest --depth=0` vs `npm view vitest dist-tags.latest` |
| `knip-on-astro-and-vue` | Do `.astro`/`.vue` files produce knip false positives that make the gate unusable? | P1 | Astro + Vue + VitePress repos | `npx knip` issue count, hand-triaged once per repo |
| `boundary-enforcement-monorepo` | Which boundaries does `kate-middlechild` actually claim, and does dependency-cruiser resolve its aliases? | P1 | Biome monorepo | `depcruise --config … src` exit code on the known `core→web` violation |
| `size-limit-ceilings` | What byte ceiling for `fma` (568K today) and `creeptd-ng/web` (248K main + split routes)? | P1 | browser SPAs | `npx size-limit` exits non-zero on breach |
| `isolated-declarations-cost` | How many exports in each CLI need an explicit annotation for `isolatedDeclarations`? | P1 | npm CLIs | `tsc --noEmit` with the flag on, error count |
| `publint-attw-replication` | Does `ocx-catalog`'s `pack-smoke.mjs` port to `grimoire-indexer` unchanged, and which `attw --profile` matches its real target matrix? | P1 | npm CLIs | `grep -L '"private": true' */package.json` vs the CI job list |
| `codeql-per-shape-setup` | Is `github/codeql-action` identical across a commander CLI, an Electron extension and a Vue SPA, or does each need distinct `build-mode`? | P2 | all public repos | `.github/workflows/codeql.yml` present; Security tab shows a completed run |
| `oxlint-fleet-benchmark` | Does oxlint beat the configured ESLint stack on a 193-file repo, cold and warm? | P2 | largest repo only | timed `eslint .` vs `oxlint` on `ocx-catalog` |
| `cli-cold-start-baseline` | What is the per-launch cost breakdown for the two CLIs — module resolution, commander init, or neither? | P2 | npm CLIs | `hyperfine --warmup 5 'node dist/cli.js --version'` |
| `astro-client-directive-audit` | Does `grimoire-indexer` misuse `client:load` where `client:visible`/`client:idle` would serve? | P2 | Astro site | `grep -rn 'client:load' '*.astro'`, one justification per hit |
| `react-compiler-adoption` | Is `fma` (React 18.3.1, zero manual memoization) worth compiling, and does that change the memoization rule text? | P3 | React SPA | `babel-plugin-react-compiler` in devDependencies |
| `release-please-config-shape` | Single-package `node` release-type, or manifest mode, per repo? | P3 | the 5 repos with a `release.yml` | `release-please-config.json` present; publish job unchanged |
| `stryker-revisit-trigger` | What measurable state — coverage plateau, LOC, a shipped advisory — should reopen the mutation-testing "no"? | P3 | all | a written trigger, not a re-argued verdict |

## Sub-artifacts

- [`typescript-topic-map/oxc-project.md`](typescript-topic-map/oxc-project.md) — oxlint, tsgolint, oxfmt and the TypeScript 7 API gap; the load-bearing brief behind decision (a).
- [`typescript-topic-map/test-runners.md`](typescript-topic-map/test-runners.md) — six runner families graded per fleet shape, plus the two live config bugs (Bun threshold keys, missing Mocha timeout).
- [`typescript-topic-map/type-testing.md`](typescript-topic-map/type-testing.md) — `expectTypeOf`, `@ts-expect-error`, typed fakes, `publint`/`attw` as tests, and the mutation-testing "no."
- [`typescript-topic-map/static-analysis.md`](typescript-topic-map/static-analysis.md) — knip, dependency-cruiser, CodeQL, semgrep, SonarQube, tsc tracing, and the bundle-analyzer landscape.
- [`typescript-topic-map/benchmarking.md`](typescript-topic-map/benchmarking.md) — how JS microbenchmarks lie, and why this fleet should build none of them.
- [`typescript-topic-map/web-performance.md`](typescript-topic-map/web-performance.md) — Lighthouse CI mechanics, Core Web Vitals, CrUX's sample floor, and bundle budgets.
- [`typescript-topic-map/build-bundle.md`](typescript-topic-map/build-bundle.md) — Rolldown, Vite 8, esbuild, tsdown/tsup/unbuild, `tsc` emit, and the Bun-Action correction.
- [`typescript-topic-map/ci-supply-chain-tooling.md`](typescript-topic-map/ci-supply-chain-tooling.md) — package managers, Renovate vs Dependabot, release tooling, reusable workflows, zizmor.

## Key sources

| URL | why it is load-bearing |
|---|---|
| [devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | The API-gap statement, the `@typescript/typescript6` shim, the named blocked tools, and the measured 8–12x build speedups. |
| [oxc.rs/docs/guide/usage/linter/type-aware.html](https://oxc.rs/docs/guide/usage/linter/type-aware.html) | Canonical tsgolint mechanism, exact enabling commands, and the root-config-only `options.typeAware` constraint. |
| [oxc.rs/blog/2026-07-22-type-aware-linting-stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable) | The stabilization announcement with rule-parity and the four-repo benchmark table. |
| [charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt](https://charpeni.com/blog/migrating-from-eslint-biome-prettier-to-oxlint-oxfmt) | The only source with small-repo oxlint numbers — the −11% to −49% regressions that gate decision (a). |
| [github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) | The `aggregationMethod` default (`optimistic`, not median) — the single most consequential fact in decision (d). |
| [developer.chrome.com/docs/crux/methodology](https://developer.chrome.com/docs/crux/methodology) | The undisclosed-but-real sample floor that makes field gating impossible for these sites. |
| [developer.chrome.com/docs/lighthouse/performance/performance-scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) | The category weights, and the confirmation that INP is absent from the lab score. |
| [vite.dev/guide/migration.html](https://vite.dev/guide/migration.html) | Exact renamed and removed Vite 8 config keys, including the ones that parse silently after losing meaning. |
| [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8) | The Rolldown-replaces-everything claim, dated, with field build-time numbers. |
| [bun.com/docs/test/coverage](https://bun.com/docs/test/coverage) | The exact plural threshold keys and the accepted-but-unenforced `statements` caveat. |
| [code.visualstudio.com/api/working-with-extensions/testing-extension](https://code.visualstudio.com/api/working-with-extensions/testing-extension) | Microsoft's own sanctioned Electron-host test path, updated 2026-08-26 — the reason Mocha stays. |
| [knip.dev/reference/cli](https://knip.dev/reference/cli) | The exact `--production --dependencies` semantics behind the misplaced-dependency heuristic. |
| [docs.renovatebot.com/config-presets](https://docs.renovatebot.com/config-presets/) | The `extends: local>org/repo` mechanism Dependabot structurally lacks — the whole Renovate case. |
| [github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/) | npm 12's script/git/remote defaults, which every npm repo hits on the next runner-image bump. |
| [github.com/nodejs/node/blob/main/doc/contributing/writing-and-running-benchmarks.md](https://github.com/nodejs/node/blob/main/doc/contributing/writing-and-running-benchmarks.md) | Node core's own benchmarking methodology — Welch's t-test, two-star significance, and why one run proves nothing. |
| [v8.dev/blog/retiring-octane](https://v8.dev/blog/retiring-octane) | The primary-source case study for a benchmark measuring the harness and regressing production. |

## Conflicts resolved

1. **"All nine repos run typescript-eslint" (`build-bundle.md` §5) vs. the config
   inventory.** `creeptd-ng/web` has no ESLint config anywhere (verified
   directly: no `eslint.config.*` under `web/`), and `kate-middlechild` uses
   Biome. **Six repos, not nine.** *Consequence:* the "don't bump past `^6.x`"
   rule binds six repos — and the two unbound ones are the fleet's only
   candidates for a first TS 7 move.
2. **"Five of nine repos declare `^6.0.3`" (`build-bundle.md` §5) vs. the
   measured table.** Four do: `grimoire-indexer`, `grimoire-vscode`,
   `vscode-ocx`, `setup-ocx` (`typescript-frame.md`; `config-inventory.md` §5).
   The measured table wins — it cites `package.json` reads.
3. **"`kate-middlechild` has no typescript dependency at all" (project brief) vs.
   `config-inventory.md` §5.** It has `typescript: ^5.8.0` at
   `kate-middlechild/package.json:8`, consumed by `packages/core` and
   `packages/web` via `catalog:`. Verified directly. **The brief is wrong.**
4. **"`ocx-catalog` has `attw` and `publint` installed but wired into no script"
   (`type-testing.md` §4) vs. `config-inventory.md` §5.** Both are wired:
   `scripts/pack-smoke.mjs:146-166,528-529` runs each against a real packed
   tarball, driven by `task pack-smoke` and CI's `pack-verify` job. **The
   type-testing scout is wrong.** *Consequence:* the rule is not "wire them up in
   `ocx-catalog`" but "replicate `ocx-catalog`'s gate to `grimoire-indexer`,"
   which genuinely has neither.
5. **"setup-ocx commits `dist/` and has no CI step that rebuilds and diffs it —
   the fleet's only unguarded reproducibility risk" (`build-bundle.md` §8) vs.
   the taskfile.** `setup-ocx/taskfile.yml:63-65` defines
   `dist:check: git diff --exit-code dist/`, chained after `build` at `:61` inside
   `task check`, which `.github/workflows/verify-basic.yml:27` invokes. **The
   build-bundle scout searched workflow YAML for an inline command and missed the
   Taskfile indirection.** The gate exists and runs. Its *byte-reproducibility*
   caveat still stands and is why TS-TOOL-13 forbids a hash-based variant.
6. **62 vs. 61 type-aware typescript-eslint rules.** `lint-catalogue-sweep.md`
   derives 62 from the six flat-config source files; `oxc-project.md` explicitly
   corrects to 61 from the live rules page filtered on the type-information
   marker, same date. Neither changes a decision: the parity gap is 2–3 rules,
   and because the unported ones are **unnamed in every doc**, a repo must diff
   tsgolint's actual rule list against its own enabled set rather than trust any
   headline ratio. **Resolved as: do not cite a ratio; run the diff.**
7. **"No Rust-based linter has closed the typed-linting gap as of 2026"
   (`practitioner.md`, citing Goldberg) vs. tsgolint stable at 59 rules
   (`oxc-project.md`).** Both are true in their own era: the gap is closed *only*
   for repos already on TypeScript 7, which is zero of eight. The practitioner
   claim remains correct for every repo in this fleet today, and stops being
   correct the moment any repo crosses to TS 7.
8. **"79 casts in one 6,899-line test file" (`typescript-frame.md`) vs. "46
   literal occurrences in `extension.test.ts`" (`type-testing.md`, re-grepped) vs.
   `code-shape.md` §2's own detail.** The reconciliation: **164 fleet-wide, 79 in
   `grimoire-vscode` across 12 files under `src/test/`, 46 of those in
   `extension.test.ts`.** The frame's "one file" framing is wrong; the totals hold.
9. **"Four runners fleet-wide" (brief) vs. "`kate-middlechild` alone runs three"
   (`test-runners.md`).** Both counts are right at different granularities.
   Resolved: **four runner *families* fleet-wide, assigned per shape; multiple
   runners per repo split by test tier is intentional and should be documented as
   such**, not flagged as inconsistency.
10. **"Adopt tsdown if fleet CLIs bundle" (`build-bundle.md` verdicts) vs. the
    same scout's finding that neither CLI has a measured bundling complaint.**
    Resolved toward **watch**: `tsdown` is `v0.23.0-rc.1`, the only fleet-specific
    evidence is `grimoire-indexer`'s 346 MB install, and that is an architecture
    question about a runtime `astro` dependency before it is a bundler question.
    `isolatedDeclarations` is the no-regret half and is adopted now.

---
title: "JS test-runner/bundler ruleset maintenance, editor support under rules_js, and the rules_ts/rules_js version floor"
slug: js-test-runners-bundlers-and-editor-support
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 25
primary_sources_count: 21
answers_for:
  - bazel-typescript.md
affects_rule_ids: [BZL-JS-06, BZL-JS-24, BZL-JS-25, NEW-JS-28, NEW-JS-29, NEW-JS-30, NEW-JS-31, NEW-JS-32]
---

# JS test-runner/bundler rulesets, editor support, and the rules_ts/rules_js floor

## Table of contents

- [Summary](#summary)
- [Answers](#answers)
  - [1. Which JS test-runner/bundler rulesets are maintained, and what does the fleet's actual runners map to?](#1-which-js-test-runnerbundler-rulesets-are-maintained-and-what-does-the-fleets-actual-runners-map-to)
  - [2. Editor and language-server support under rules_js](#2-editor-and-language-server-support-under-rules_js)
  - [3. rules_ts / rules_js version floor](#3-rules_ts--rules_js-version-floor)
  - [4. The "0 to 100%" partial-Bazelification question (M-K-15)](#4-the-0-to-100-partial-bazelification-question-m-k-15)
- [Proposed revisions](#proposed-revisions)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Not settled](#not-settled)
- [Sources](#sources)

## Summary

- No bundler/test ruleset checked (rules_jest, rules_esbuild, rules_swc, rules_webpack, rules_rollup, rules_vitest) uses the literal word "maintained" or "deprecated" in its README — the commission's binary framing doesn't exist as a label; you have to read release-date recency, `bazel_compatibility`, and open-issue count instead.
- Four of six are actively released as of 2026-09-05: rules_jest (v0.26.0, 2026-07-25), rules_esbuild (v0.27.0, 2026-08-07), rules_swc (v2.7.6, 2026-07-29), rules_webpack (v0.18.0, 2026-08-07). Two are stale: rules_rollup (v2.0.1, **2025-03-13**, 18 months old) and fremtind's community `rules_vitest` (v0.2.2, 2026-01-30, 7 months old).
- Only `rules_jest`'s `MODULE.bazel` declares `bazel_compatibility` (`>=7.0.0`); the other five declare none at all — absence here is the ecosystem norm, not a red flag on its own.
- `rules_js`'s own `/releases/latest` GitHub API call returns **v2.9.3** (an old 2.x-line patch published 2026-08-21, 110 minutes after v3.4.1) — an agent trusting that endpoint literally would report the wrong major. The current mainline is still **v3.4.1** (2026-03-02, unchanged), `bazel_compatibility = [">=7.6.0"]` on both the tag and `main`.
- `rules_ts` v3.10.1 (2026-08-21) remains the latest tag; `main` is 27 commits ahead and now carries `bazel_compatibility = [">=7.7.0"]` plus a raised `aspect_rules_js` floor (2.0.0 → 3.4.0) — still unreleased as of 2026-09-05. Neither the released nor the pending floor comes anywhere near the fleet's 8.7.0 pin.
- **Vitest has a real ruleset, not just a `js_test` wrapper**: `fremtind/rules_vitest` (`vitest_test` rule, forked from Aspect's own `rules_jest`) ships Bazel-aware test sharding, snapshot handling, and a config-merging layer — but it is community-run, not an Aspect first-party ruleset, with only 8 open issues resolved slowly and its own docs admitting an unresolved root cause ("we have not figured out why yet") for the same ESM-sandbox-escape bug BZL-JS-06 already flags (`aspect-build/rules_js#362`).
- What breaks under both `rules_jest` and `rules_vitest`, word-for-word in both projects' own troubleshooting docs: the test framework is "designed to run as a standalone long running application... This conflicts with Bazel" — **watch mode has no home under `bazel test`**. Config discovery also breaks: `vitest_test`'s `config` attribute accepts only `.js`/`.cjs`/`.mjs`, so a `vitest.config.ts` must be pre-transpiled. Vitest's own worker-pool concurrency collides with Bazel's test sharding and must be reconciled by the ruleset's `auto_configure_test_sequencer`.
- Fleet mapping: vitest (`ocx-catalog`, `grimoire-indexer`, `fma`, plus `creeptd-ng/web` — four packages, not three) → `fremtind/rules_vitest`, CONSIDER not MUST. `bun test` (`setup-ocx`, `kate-middlechild`) → **no path**, same non-path as `bun.lock` ingestion (BZL-JS-03) — no `rules_bun`/bun-test ruleset exists anywhere. `@vscode/test-electron` (`grimoire-vscode`, `vscode-ocx`) → **no path found**; no purpose-built ruleset exists, and a hand-rolled wrapper would fight Bazel's sandboxed, no-network-during-test model to launch a real Electron/VS Code process. Playwright (`creeptd-ng`'s e2e WASM smoke test) → **a path exists**: `mrmeku/rules_playwright` (on the BCR as `rules_playwright`, v0.5.4, 25 stars, actively pushed 2026-03-06) provides hermetic pinned-browser downloads, composed with `rules_js`'s `npm_link_all_packages` + `bin` wrapper around `@playwright/test`'s own CLI as a plain `js_test`.
- **Naming collision trap**: two unrelated GitHub projects are both named `rules_playwright` — `mrmeku/rules_playwright` (on the BCR, actively maintained) and `collider-bazel-extensions/rules_playwright` (0 stars, not on the BCR, a separate hermetic-browser project). An agent grepping "rules_playwright" without checking the BCR metadata could wire up the wrong one.
- Editor support: neither `docs/path_mapping.md` nor `docs/use_execroot_entry_point.md` addresses tsserver/IDE resolution at all — both are about Bazel-internal build-action path handling (cache-sharing across compilation modes, and exec-vs-target-platform entry points for `js_run_binary` tools respectively). The commission's file list missed the doc that actually answers this: **`docs/faq.md` § "Making the editor happy."**
- The real prescription (from `faq.md` plus `rules_ts`'s own example `tsconfig.json`): keep running `pnpm install` locally so a real `node_modules` exists at the source root (not a symlink, not `bazel run` of a link step), and use tsconfig's `paths` key for first-party workspace imports — rules_ts's own example file comments that `paths` is "for the editor to resolve packages within the workspace... this isn't needed for Bazel, since the package will be linked into `node_modules/@myorg`." **`npm_link_all_packages()` is not part of the editor story at all** — it only generates `//:node_modules/{package}` Bazel-graph targets that BUILD files consume; tsserver never sees them. TypeScript's `rootDirs` (plural) compiler option — named in the commission — is not mentioned anywhere in either ruleset's docs; only singular `rootDir`/`paths` are.
- M-K-15 (the "0 to 100%" partial-Bazelification cliff) remains fully unsettled. Aspect's own "Principles of a Bazel Migration" post argues for gradual, incremental adoption ("gradient ascent," "change one thing at a time") but states **no numeric coverage threshold**. No Canva, Wix, or Tinder source (checked via Aspect's blog index, Canva's and Wix's engineering blogs, and the BazelCon 2025 recap) measures a coverage percentage before cache benefit appears for a *JS* monorepo specifically. This confirms and hardens BZL-JS's existing "not settled, not faked" verdict.

## Answers

### 1. Which JS test-runner/bundler rulesets are maintained, and what does the fleet's actual runners map to?

**Question as commissioned:** *Which of aspect_rules_jest, aspect_rules_esbuild, aspect_rules_swc, aspect_rules_webpack, aspect_rules_rollup, rules_vitest (any), and rules_js's own js_test are maintained as of 2026-09-05: fetch each repo's latest release date, MODULE.bazel bazel_compatibility, rules_js floor, open-issue count, and whether the README says "maintained"/"deprecated". Then map the fleet's actual runners... to a Bazel path or to "no path"... Vitest under Bazel: is there a ruleset, or is it a js_test wrapper with the "bazel-out is cwd" and runfiles caveats; what breaks (watch mode, config discovery, threads)?*

**Findings**

Repo-level metadata, fetched 2026-09-05 (GitHub API `pushed_at`/`releases/latest`, and each project's `MODULE.bazel` on `main`):

| Ruleset | Repo | Latest tagged release | `bazel_compatibility` (main) | `aspect_rules_js` floor (main) | Open issues | README says "maintained"/"deprecated"? |
|---|---|---|---|---|---|---|
| `aspect_rules_jest` | [aspect-build/rules_jest](https://github.com/aspect-build/rules_jest) | v0.26.0 — 2026-07-25 | `>=7.0.0` | `3.0.1` | 20 | Neither word appears; "Many companies are successfully testing with rules_jest" + a paid-support link ([README](https://raw.githubusercontent.com/aspect-build/rules_jest/main/README.md)) |
| `aspect_rules_esbuild` | [aspect-build/rules_esbuild](https://github.com/aspect-build/rules_esbuild) | v0.27.0 — 2026-08-07 | none declared | `3.4.0` | 23 | Neither word; no caveat ([README](https://raw.githubusercontent.com/aspect-build/rules_esbuild/main/README.md)) |
| `aspect_rules_swc` | [aspect-build/rules_swc](https://github.com/aspect-build/rules_swc) | v2.7.6 — 2026-07-29 | none declared | `2.0.0` | 10 | Neither word; "Many companies are successfully building with rules_swc" ([README](https://raw.githubusercontent.com/aspect-build/rules_swc/main/README.md)) |
| `aspect_rules_webpack` | [aspect-build/rules_webpack](https://github.com/aspect-build/rules_webpack) | v0.18.0 — 2026-08-07 | none declared | `3.4.0` | 10 | Neither word; explicit self-caveat instead: "this repository is in early development and may still have breaking changes going forward" ([README](https://raw.githubusercontent.com/aspect-build/rules_webpack/main/README.md)) |
| `aspect_rules_rollup` | [aspect-build/rules_rollup](https://github.com/aspect-build/rules_rollup) | v2.0.1 — **2025-03-13** | none declared | `2.0.0` | 5 | Neither word, but the README still instructs readers to "copy the WORKSPACE snippet into your `WORKSPACE` file" ([README](https://raw.githubusercontent.com/aspect-build/rules_rollup/main/README.md)) despite the repo having a `MODULE.bazel` — doc rot, an 18-month-stale tag |
| `fremtind_rules_vitest` | [fremtind/rules_vitest](https://github.com/fremtind/rules_vitest) | v0.2.2 — 2026-01-30 | none declared | `2.0.0` | 8 | Self-describes as "forked from rules_jest by Aspect.dev" — community project, not an Aspect ruleset; same WORKSPACE-snippet doc rot as rules_rollup ([README](https://raw.githubusercontent.com/fremtind/rules_vitest/main/README.md)) |
| `js_test` | [aspect-build/rules_js](https://github.com/aspect-build/rules_js) (`js/defs.bzl:103`) | Ships inside rules_js 3.4.1 — 2026-03-02 | inherits rules_js's own `>=7.6.0` | is rules_js | (rules_js's own count, not separately tracked) | Core rules_js surface, actively maintained by construction |

Nothing here reads "maintained" or "deprecated" literally — checking for that string is a dead end. The usable signal is release recency plus doc-rot tells (a `WORKSPACE`-snippet instruction next to a `MODULE.bazel` is stronger evidence of neglect than any label). By that measure: `rules_jest`, `rules_esbuild`, `rules_swc`, `rules_webpack` are current (all released within five weeks of the 2026-09-05 era date); `rules_rollup` and `fremtind_rules_vitest` are stale.

`js_test` itself ([js/defs.bzl:103](https://raw.githubusercontent.com/aspect-build/rules_js/main/js/defs.bzl)) is confirmed to exist as a first-party rules_js rule — a thin `js_binary`-shaped wrapper that runs any Node entry point as a Bazel test, with no framework awareness.

**Vitest specifically.** There **is** a purpose-built ruleset — `fremtind/rules_vitest`'s `vitest_test` rule ([vitest_test.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/vitest_test.md)) — not merely `js_test` pointed at the vitest CLI. Its source ([vitest/private](https://github.com/fremtind/rules_vitest/tree/main/vitest/private)) includes `bazel_sequencer.mjs`, `bazel_snapshot_reporter.cjs`, `bazel_snapshot_resolver.mjs`, and `vitest_config_template.mjs` — real Bazel-sharding and snapshot-path integration, not a bare wrapper. It still inherits the `js_test` family's `bazel-out`-as-cwd and runfiles-relative-resolution model, because the underlying execution mechanism is unchanged from `rules_jest`, which it was forked from.

What breaks, confirmed from the ruleset's own docs:
- **Watch mode** — the `rules_jest` and `rules_vitest` troubleshooting docs use near-identical language: *"[Jest/Vitest] is designed to run as a standalone long running application, often having a slow startup time then running incrementally using caching for performance. This conflicts with Bazel which [is] designed for short-lived processes that can be run in parallel and cached."* ([rules_jest troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_jest/main/docs/troubleshooting.md); [rules_vitest troubleshooting.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/troubleshooting.md)). `bazel test` invokes a one-shot process; there is no `--watch` under that model.
- **Config discovery** — normal Vitest auto-discovers `vitest.config.*`/`vite.config.*` from the working directory. `vitest_test`'s `config` attribute accepts only `.js`, `.cjs`, `.mjs` — "TypeScript vitest configs should be transpiled before being passed to `vitest_test` with [rules_ts]" ([vitest_test.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/vitest_test.md)). Auto-discovery is replaced by an explicit label plus a generated wrapper config (`auto_configure_reporters`, `auto_configure_test_sequencer`) that layers Bazel-specific settings on top.
- **Threads/concurrency** — Vitest's own worker-pool concurrency collides with Bazel's independent test parallelism and sharding; the ruleset's troubleshooting doc names this directly ("Concurrency - Bazel sharding and Vitest concurrency... Vitest concurrency will be configured by `rules_vitest` to work optimally with Bazel actions and Bazel test sharding") and resolves it internally rather than leaving it to the user.
- **An open, admitted, root-cause-unknown bug**: `vite`, `vitest`, `react` (optional), `jsdom` (optional) "must be installed at root" — the maintainer's own words are *"We have not figured out why yet, but it seems to be an issue with [ESM imports under Bazel]"* (linking directly to [`aspect-build/rules_js#362`](https://github.com/aspect-build/rules_js/issues/362)) — the same open sandbox-escape issue BZL-JS-06 already tracks.

**Fleet mapping**, cross-checked against `bazel-audit/fleet-bazel-readiness.md`'s package table:

| Fleet runner | Packages | Bazel path |
|---|---|---|
| vitest | `ocx-catalog`, `grimoire-indexer`, `fma`, **and `creeptd-ng/web`** (four packages — the commission named three; `creeptd-ng/web` is a fourth vitest consumer per [fleet-bazel-readiness.md](../bazel-audit/fleet-bazel-readiness.md)'s package table) | `fremtind/rules_vitest`'s `vitest_test`, CONSIDER not MUST (community-run, sparse, one admitted unsolved bug) |
| `bun test` | `setup-ocx`, `kate-middlechild` | **No path.** No `rules_bun`/bun-test ruleset exists on GitHub or the BCR (checked via `gh search repositories`); this is the same non-path BZL-JS-03 already found for `bun.lock` ingestion — the repo has to convert to pnpm before any test runner question is reachable |
| `@vscode/test-electron` | `grimoire-vscode`, `vscode-ocx` | **No path found.** No purpose-built ruleset exists (checked GitHub search for "vscode-test"/"rules_vscode_test" bazel projects — only unrelated Microsoft/VMware repos surfaced). A hand-rolled `js_test`/`js_run_binary` wrapper would have to launch a real Electron/VS Code process that downloads its own binary at test time — structurally the same class of conflict as the framework-output-layout trap BZL-JS-26 already names, reasoned by mechanism, not verified against a documented case |
| Playwright | `creeptd-ng`'s e2e WASM smoke test (`crates/creeptd-client/tests/e2e/package.json`, per [fleet-bazel-readiness.md:173](../bazel-audit/fleet-bazel-readiness.md#L173) and frame correction 1) | **A path exists.** [`mrmeku/rules_playwright`](https://github.com/mrmeku/rules_playwright) — on the BCR as `rules_playwright` (v0.5.4, 25 stars, pushed 2026-03-06, 11 open issues) — provides hermetic, pinned, sha256-verified browser-binary downloads via a module extension; the actual test execution composes with `rules_js`'s `npm_link_all_packages()` + the generated `bin` wrapper around `@playwright/test`'s own CLI, run as a plain `js_test` |

**Naming trap**: a second, unrelated `rules_playwright` exists at [collider-bazel-extensions/rules_playwright](https://github.com/collider-bazel-extensions/rules_playwright) — 0 stars, not on the BCR, macOS support explicitly "validation pending," pinned to Playwright 1.49 only. An agent that finds this one first (e.g. via a generic GitHub search) and wires it up instead of the BCR-published `mrmeku/rules_playwright` gets an immature, narrower project under the same display name.

**Answer.** As of 2026-09-05, four of the six bundler/test rulesets (`rules_jest`, `rules_esbuild`, `rules_swc`, `rules_webpack`) show active-maintenance signals (releases within five weeks of the era date); `rules_rollup` and the community `fremtind_rules_vitest` are stale (18 and 7 months respectively) — none of the six literally says "maintained" or "deprecated," so that check must be replaced with a recency-plus-doc-rot heuristic. `js_test` is rules_js's own first-party, framework-agnostic test wrapper. Vitest has a real, Bazel-aware ruleset (not a bare `js_test` wrapper) in `fremtind/rules_vitest`, but it is community-maintained with an admitted unsolved bug shared with BZL-JS-06's open issue. Of the fleet's four actual runners, two have a real path today (vitest via the community ruleset, Playwright via `mrmeku/rules_playwright`) and two have no path at all (`bun test`, `@vscode/test-electron`).

### 2. Editor and language-server support under rules_js

**Question as commissioned:** *fetch raw rules_js docs/path_mapping.md, docs/use_execroot_entry_point.md, docs/troubleshooting.md and rules_ts docs on tsconfig paths and rootDirs. With node_modules under bazel-out, what does tsserver need... to resolve types and jump to definition; what does each doc prescribe; what does the Aspect blog say about IDE setup.*

**Findings**

All three named `rules_js` docs were fetched in full. **None of the three is about editor/tsserver support**:

- [`docs/path_mapping.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/path_mapping.md) documents Bazel's own `--experimental_output_paths=strip` feature — collapsing `bazel-out/<cfg>/bin` across compilation modes so identical actions can share a cache entry. It never mentions editors, tsserver, or IDEs.
- [`docs/use_execroot_entry_point.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/use_execroot_entry_point.md) documents the `use_execroot_entry_point` attribute on `js_run_binary` — whether a build-time tool (e.g. Next.js, Rspack) resolves its own sources from the exec-platform runfiles tree or the target-platform bin directory. This is about build-action tool invocation, not developer-facing IDE resolution.
- [`docs/troubleshooting.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md) covers the three-branch module-not-found diagnosis (already settled by BZL-JS-08) and cross-references `path_mapping.md`; it does not have an editor section either.

The document that actually answers the question — not in the commission's list, found by grepping the full `docs/` directory for "editor" — is **[`docs/faq.md` § "Making the editor happy"](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md)**, quoted here in full:

> Editors (and the language services they host) expect a couple of things:
> - third-party tooling like the TypeScript SDK under `<project root>/node_modules`
> - types for your first-party imports
>
> Since rules_js puts the outputs under Bazel's `bazel-out` tree, the editor doesn't find them by default.
>
> To get local tooling installed, you can continue to run `pnpm install` (or use whatever package manager your lockfile is for) to get a `node_modules` tree in your project. If there are many packages to install, you could reduce this by only installing the tooling actually needed for non-Bazel workflows, like the `@types/*` packages and `typescript`.
>
> To resolve first-party imports like `import '@myorg/my_lib'` to resolve in TypeScript, use the `paths` key in the `tsconfig.json` file to list additional search locations. This is the same thing you'd do outside of Bazel.

This directly answers the commission's parenthetical options: **none of "a symlinked node_modules at the source root," "`bazel run` of a link step," or "Aspect's `npm_link_all_packages` convention"** is the prescribed mechanism. The prescription is the mundane one — keep running `pnpm install` outside Bazel so a real `node_modules` exists at the source root, exactly as you would without Bazel at all. `npm_link_all_packages()` ([pnpm.md:29](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md)) is confirmed, by reading its own doc line, to generate `//:node_modules/{package}` **Bazel-graph targets** that `BUILD.bazel` files depend on — it has nothing to do with what tsserver resolves on disk; tsserver never sees a Bazel target.

`rules_ts`'s [`docs/tsconfig.md`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/tsconfig.md) adds the other half:

> Keep a `tsconfig.json` file at the root of your TypeScript sources tree, as an ancestor of all TypeScript files... This ensures that editors agree with rules_ts, and that you have minimal repetition of settings.

And, on the inline-dictionary `tsconfig` attribute (a generated config with no on-disk `tsconfig.json`):

> Remember that editors need to know some of the tsconfig settings, so if you rely exclusively on this approach, you may find that the editor skew affects development.

`rules_ts`'s own worked example, [`examples/simple/tsconfig.json`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/examples/simple/tsconfig.json), settles the `paths` mechanism with an inline comment:

```json
"paths": {
    "@myorg/*": ["../*"]
}
```
> // Path Mapping for the editor to resolve packages within the workspace.
> // Note that this isn't needed for Bazel, since the package will be "linked" into the
> // node_modules/@myorg folder.

**`rootDirs` (plural)** — the TypeScript compiler option named in the commission, which virtually merges multiple physical source directories into one program root, distinct from singular `rootDir` — does not appear anywhere in either ruleset's fetched docs. The one `rootDir`-adjacent guidance found is defensive, not editor-facing: `rules_ts`'s own [`docs/troubleshooting.md`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md) walks through the `TS6059 File ... is not under 'rootDir'` failure signature (already settled by BZL-JS-16/17) and recommends `--listFiles`/`--explainFiles`. Neither ruleset documents `rootDirs` as an editor-resolution technique; if a repo needs it, that is unguided territory for both projects as of 2026-09-05.

**The Aspect blog** — the full post index (81 titles) was fetched from [aspect.build/blog](https://aspect.build/blog/) and searched: **no post is dedicated to IDE/editor setup, tsserver, VSCode, or IntelliJ integration.** The closest adjacent posts, "Moving TypeScript code into a Bazel monorepo" and "Angular with Bazel," do not cover editor resolution either (confirmed by direct fetch of the former). The editor-setup guidance lives only in the ruleset's own `faq.md`/`tsconfig.md` docs, not in any blog post.

**Answer.** With `node_modules` under `bazel-out`, tsserver needs exactly two things, both delivered outside Bazel: a conventional `node_modules` at the source root from running `pnpm install` locally (for third-party types), and a `paths` entry in a real, committed root `tsconfig.json` (for first-party workspace-package imports) — confirmed by rules_js's own `faq.md` and rules_ts's own example config comment. `npm_link_all_packages` is unrelated to this — it is a Bazel-BUILD-graph mechanism the editor never touches. `path_mapping.md` and `use_execroot_entry_point.md`, both explicitly named in the commission, are Bazel build-action documents with no editor content at all; the commission's own file list missed `faq.md`, which is where this guidance actually lives. `rootDirs` (plural) is undocumented in both rulesets as of 2026-09-05.

### 3. rules_ts / rules_js version floor

**Question as commissioned:** *does the latest tagged rules_ts (check for anything after 3.10.1) declare bazel_compatibility, and does it raise the floor above 8.7.0? Same for rules_js after 3.4.1.*

**Findings**

`rules_ts`: no tag newer than **v3.10.1** (2026-08-21) exists — confirmed against `gh api repos/aspect-build/rules_ts/tags` (top five: v3.10.1, v3.10.0, v3.9.2, v3.9.1, v3.9.0). The tagged `MODULE.bazel` still declares no `bazel_compatibility` ([v3.10.1 MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_ts/v3.10.1/MODULE.bazel)). `main` is **27 commits ahead** of the v3.10.1 tag (`gh api .../compare/v3.10.1...main`) and now declares `bazel_compatibility = [">=7.7.0"]` plus a raised `aspect_rules_js` floor from `2.0.0` to `3.4.0` ([main MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_ts/main/MODULE.bazel)) — this remains unreleased as of 2026-09-05, confirming BZL-JS-10's finding still holds with no update needed.

`rules_js`: `gh api repos/aspect-build/rules_js/releases/latest` returns **v2.9.3** (published 2026-08-21T02:59:15Z), which is misleading — it is a patch on the old **2.x** line, published 110 minutes *after* v3.4.1 the same day, not a newer mainline release ([releases list](https://github.com/aspect-build/rules_js/releases)). The true current mainline tag is still **v3.4.1** (2026-03-02), unchanged since the wave-2 consolidation. Its `MODULE.bazel` declares `bazel_compatibility = [">=7.6.0"]` both at the [v3.4.1 tag](https://raw.githubusercontent.com/aspect-build/rules_js/v3.4.1/MODULE.bazel) and on [current `main`](https://raw.githubusercontent.com/aspect-build/rules_js/main/MODULE.bazel) — no floor change, released or pending.

Neither the released floors (`rules_js` ≥7.6.0; `rules_ts` none) nor the one pending, unreleased floor (`rules_ts` main's ≥7.7.0) approaches the fleet's Bazel 8.7.0 pin. There is no version-floor risk to the fleet's pin from either ruleset as of 2026-09-05.

**Answer.** Nothing has tagged past rules_ts 3.10.1 or rules_js 3.4.1. rules_ts's pending `bazel_compatibility = [">=7.7.0"]` and raised rules_js floor sit on `main` only, 27 commits past the last tag, unreleased. rules_js's own `/releases/latest` API is a trap — it names an old 2.x-line patch, not the current 3.x mainline, because GitHub's "latest" is whichever non-draft release published most recently by clock time, not by highest semver. Neither floor rises anywhere near 8.7.0; this question needs no rule change and no further re-check until either project actually tags a new release.

### 4. The "0 to 100%" partial-Bazelification question (M-K-15)

**Question as commissioned:** *find any measured account of a JS monorepo Bazelified incrementally (Canva's talks, Aspect posts, Wix, Tinder) and state whether a coverage threshold for cache benefit is documented anywhere or remains argued.*

**Findings**

Aspect's full blog index (81 posts, fetched from [aspect.build/blog](https://aspect.build/blog/)) was searched for incremental-migration content. Two candidates were fetched in full:

- **["Principles of a Bazel Migration"](https://aspect.build/blog/principles)** explicitly frames migration as incremental — "gradient ascent," "change one thing at a time," "introduce one type-check error code at a time" — and warns against deferring fixes ("Don't say 'we'll just leave a TODO here'"). It states **no numeric coverage threshold** anywhere; the framing implies benefits should accrue at every step rather than only after a critical mass, but this is methodology advice, not a measurement.
- **["Moving TypeScript code into a Bazel monorepo"](https://aspect.build/blog/moving-typescript-to-bazel-monorepo)** — itself marked "still a work-in-progress as of September 2022," four years stale at the 2026-09-05 era date — recommends a small-scale proof-of-concept dry run with one team first, but gives no percentage or cache-hit numbers for partial coverage.
- **["Monorepo Shared Green"](https://aspect.build/blog/monorepo-shared-green)** does not address partial/incremental adoption at all; it is about the CI "shared-green" operating model once Bazel is already the build system.
- **BazelCon 2025** — the recap post ([aspect.build/blog/bazelcon-2025](https://aspect.build/blog/bazelcon-2025)) names no Canva, Wix, or Tinder talk on incremental JS-monorepo adoption; the only Canva material found anywhere in this research program remains the already-cited `isolated_typecheck` talk (a full-adoption efficiency measurement at ~40,000 packages, not a partial-coverage study).
- **Canva's and Wix's own engineering blogs** were checked directly ([canva.dev/blog/engineering](https://www.canva.dev/blog/engineering/), [wix.engineering](https://www.wix.engineering/)) — neither surfaces any Bazel-specific post at all, incremental or otherwise, as of 2026-09-05.
- No Tinder JS-monorepo migration account was found; the only Tinder material in this research program is the unrelated CI-target-selection talk already cited by the frame (93% CI-time savings from `bazel-diff`, a caching/selection topic, not a coverage-threshold-for-partial-adoption topic).

**Answer.** No measured account — from Canva, Wix, Tinder, or Aspect itself — states a coverage threshold before cache or CI benefit appears for a partially Bazelified JS monorepo. The only primary-source position found is Aspect's own migration-principles post, which argues (without measuring) for a no-cliff, gradual-accrual model. This is argued evidence pointing one direction with zero counter-measurement found either, so M-K-15 stays exactly where BZL-JS left it: contested, unsettled, and not fit for a rule.

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| BZL-JS-06 | Add a fourth tracked issue to the same pattern: `aspect-build/rules_js#362` is also the open, admitted, unresolved root cause behind `fremtind/rules_vitest`'s "install vite/vitest/react/jsdom at root" workaround — cross-reference it so an agent debugging a vitest-under-Bazel failure lands on the existing rule instead of treating it as a new mystery. | [fremtind/rules_vitest troubleshooting.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/troubleshooting.md) | codified |
| BZL-JS-24, BZL-JS-25 | Both rules assume a bare `js_test`; note explicitly that a repo using `fremtind/rules_vitest`'s `vitest_test` rule instead gets its coverage/runfiles behavior from that ruleset's own `bazel_snapshot_reporter.cjs`/config layer, not from `js_test`'s defaults — the two verification greps (`kind(js_test, //...)`) will miss `vitest_test` targets entirely. | [vitest_test.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/vitest_test.md), [vitest/private source](https://github.com/fremtind/rules_vitest/tree/main/vitest/private) | measured |
| NEW-JS-28 | When wiring a vitest package into Bazel, default to `fremtind/rules_vitest`'s `vitest_test` as CONSIDER (not MUST): it is a real, Bazel-sharding-aware ruleset, but community-run with only 8 open issues moving slowly and one admitted, unresolved root-cause bug shared with BZL-JS-06. Verify: `curl -s https://raw.githubusercontent.com/fremtind/rules_vitest/main/MODULE.bazel \| grep 'version ='` and check the release date against the adoption date before pinning. Empty/absent MODULE.bazel = the fork has moved or been deleted, re-derive from scratch. | [fremtind/rules_vitest](https://github.com/fremtind/rules_vitest) | measured |
| NEW-JS-29 | Never wire a `bun test` suite or `@vscode/test-electron` suite to a Bazel target expecting an existing ruleset — neither exists as of 2026-09-05. Both require: convert `bun test` packages to pnpm first (same conversion `bun.lock` ingestion already needs, BZL-JS-01/03), and treat `@vscode/test-electron` as out of scope for Bazel entirely until a ruleset appears. Verify: `gh search repos "rules_bun" OR "bazel bun test"` and `gh search repos "vscode-test bazel"` — both returning no purpose-built ruleset is a pass for "no path exists," not a search failure. | `gh search repositories` runs 2026-09-05 (this document) | measured |
| NEW-JS-30 | For a fleet Playwright suite, route to `mrmeku/rules_playwright` (BCR name `rules_playwright`) for hermetic pinned-browser provisioning, never `collider-bazel-extensions/rules_playwright` — the two are unrelated projects sharing a display name, and only the former is on the BCR. Verify: `curl -s https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_playwright/metadata.json` (via `gh api repos/bazelbuild/bazel-central-registry/contents/modules/rules_playwright/metadata.json --jq .content \| base64 -d`) and confirm `"repository": ["github:mrmeku/rules_playwright"]`. A different repository string = wrong project, stop. | [BCR metadata.json](https://github.com/bazelbuild/bazel-central-registry/blob/main/modules/rules_playwright/metadata.json), [mrmeku/rules_playwright](https://github.com/mrmeku/rules_playwright) | measured |
| NEW-JS-31 | For editor/tsserver resolution of a `rules_js`/`rules_ts` repo, prescribe exactly two steps and no more: keep a real `node_modules` at the source root via a normal (non-Bazel) `pnpm install`, and set `paths` in a real, committed root `tsconfig.json` for first-party workspace imports. Explicitly reject `npm_link_all_packages()`, a `bazel run` link step, or a symlinked `node_modules` as the mechanism — none of them is what either ruleset's own docs prescribe. | [rules_js faq.md § Making the editor happy](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md), [rules_ts tsconfig.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/tsconfig.md), [rules_ts example tsconfig.json](https://raw.githubusercontent.com/aspect-build/rules_ts/main/examples/simple/tsconfig.json) | normative (ruleset's own docs) |
| NEW-JS-32 | Do not grep a ruleset's README for the words "maintained"/"deprecated" as a health check — none of the six bundler/test rulesets surveyed uses either word. Use release-date recency (compare `pushed_at`/latest tag date against the current era date) plus a doc-rot tell (a `WORKSPACE`-snippet instruction alongside an existing `MODULE.bazel` is a stronger staleness signal than any label). | Six READMEs grepped 2026-09-05, zero hits for either word (this document) | measured |

## AI-agent angle

An agent asked "is this ruleset maintained?" will search the README for the word and find nothing on any of the six — reading that as "unknown, proceed with caution" undersells real staleness (rules_rollup, 18 months) and oversells real currency (rules_esbuild, five weeks old) equally. The mechanical fix: always pull `pushed_at`/`releases/latest` via the GitHub API and compare against the research era date, never trust README prose alone.

A second, sharper trap: calling `gh api repos/<org>/rules_js/releases/latest` and reporting whatever tag comes back as "the current version." For `rules_js` specifically this returns an old 2.x patch release, not the 3.x mainline — an agent that reports "rules_js is now on 2.9.3" from that single call would be simply wrong. The check: always cross-reference against the full `/tags` or `/releases` list sorted by version, not just the `/latest` shortcut, whenever a ruleset maintains more than one active release line.

A third trap specific to this domain: two same-named projects (`rules_playwright`) exist under different GitHub orgs, and only one is BCR-published. The mechanical check is not "does this repo exist" but "does the BCR's own `metadata.json` for that module name point at this repo" — a five-second `gh api` call that a name-only grep would skip entirely.

## Contested / evolving

- Whether `fremtind/rules_vitest` should be treated as CONSIDER or as fully out-of-bounds for a serious adoption is a judgment call this document does not force — its own maintainer names an unsolved bug, but the ruleset is otherwise functional and Bazel-sharding-aware. NEW-JS-28 picks CONSIDER as the narrower, reversible default.
- Whether a hand-rolled `js_test` wrapper around plain `vitest` CLI (skipping the community ruleset entirely) is safer than depending on an 8-open-issue fork is not settled here — both paths carry real cost (lose Bazel-sharding integration vs. depend on a slow-moving fork), and no fleet package exercises either path today to measure against.

## Not settled

- **M-K-15** (partial-Bazelification coverage threshold) — would be settled by a primary measured account (a blog post, talk, or paper) from any organization that tracked cache-hit rate or CI time as a function of percentage-of-codebase-under-Bazel, specifically for a JavaScript/TypeScript monorepo. None was found in this round; the search covered Aspect's full blog index, Canva's and Wix's engineering blogs, and the BazelCon 2025 recap.
- **`rootDirs` (plural) under rules_ts** — would be settled by either ruleset publishing guidance on it, or by a fleet repo that actually needs it (none does today; `fma`'s multi-tsconfig setup with project references is the closest fleet shape and does not use `rootDirs`).
- **Whether `@vscode/test-electron` is truly a structural non-starter under Bazel, or merely unattempted** — this document's "no path" conclusion is reasoned by mechanism-analogy (network fetch + GUI process during a sandboxed test), not verified against a documented attempt or failure. A primary source (an issue, a blog post, or a working example) describing someone actually trying it would settle this either way.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [aspect-build/rules_jest](https://github.com/aspect-build/rules_jest) — [MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_jest/main/MODULE.bazel), [README.md](https://raw.githubusercontent.com/aspect-build/rules_jest/main/README.md), [troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_jest/main/docs/troubleshooting.md) | Ruleset source (raw, `main`) + GitHub API metadata | Checked 2026-09-05, latest tag 2026-07-25 | Primary: `bazel_compatibility`, rules_js floor, the verbatim "long running application... conflicts with Bazel" watch-mode caveat |
| [aspect-build/rules_esbuild MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_esbuild/main/MODULE.bazel) | Ruleset source (raw, `main`) | Checked 2026-09-05, latest tag 2026-08-07 | Primary: no `bazel_compatibility`, rules_js floor 3.4.0 |
| [aspect-build/rules_swc MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_swc/main/MODULE.bazel) | Ruleset source (raw, `main`) | Checked 2026-09-05, latest tag 2026-07-29 | Primary: no `bazel_compatibility`, rules_js floor 2.0.0 |
| [aspect-build/rules_webpack](https://github.com/aspect-build/rules_webpack) — [MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_webpack/main/MODULE.bazel), [README.md](https://raw.githubusercontent.com/aspect-build/rules_webpack/main/README.md) | Ruleset source (raw, `main`) | Checked 2026-09-05, latest tag 2026-08-07 | Primary: the explicit "early development... breaking changes" self-caveat |
| [aspect-build/rules_rollup](https://github.com/aspect-build/rules_rollup) — [MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_rollup/main/MODULE.bazel), [README.md](https://raw.githubusercontent.com/aspect-build/rules_rollup/main/README.md) | Ruleset source (raw, `main`) | Checked 2026-09-05, latest tag 2025-03-13 | Primary: the 18-month-stale tag and the WORKSPACE-snippet doc-rot tell |
| [fremtind/rules_vitest](https://github.com/fremtind/rules_vitest) — [MODULE.bazel](https://raw.githubusercontent.com/fremtind/rules_vitest/main/MODULE.bazel), [README.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/README.md), [troubleshooting.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/troubleshooting.md), [vitest_test.md](https://raw.githubusercontent.com/fremtind/rules_vitest/main/docs/vitest_test.md), [source tree](https://github.com/fremtind/rules_vitest/tree/main/vitest/private) | Ruleset source (raw, `main`) | Checked 2026-09-05, latest tag 2026-01-30 | Primary: the only vitest ruleset found; confirms it is a real rule, not a bare `js_test` wrapper, and names its own unsolved bug |
| [aspect-build/rules_js js/defs.bzl](https://raw.githubusercontent.com/aspect-build/rules_js/main/js/defs.bzl) | Ruleset source (raw, `main`) | Checked 2026-09-05 | Primary: confirms `js_test` at line 103, first-party and framework-agnostic |
| [aspect-build/rules_js docs/faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | Ruleset docs (raw, `main`) | Checked 2026-09-05 | Primary: the actual editor-support prescription — not in the commission's file list |
| [aspect-build/rules_js docs/path_mapping.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/path_mapping.md) | Ruleset docs (raw, `main`) | Checked 2026-09-05 | Primary: confirms this doc is about build-cache path collapsing, not editors |
| [aspect-build/rules_js docs/use_execroot_entry_point.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/use_execroot_entry_point.md) | Ruleset docs (raw, `main`) | Checked 2026-09-05 | Primary: confirms this doc is about `js_run_binary` tool entry points, not editors |
| [aspect-build/rules_js docs/pnpm.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md) | Ruleset docs (raw, `main`) | Checked 2026-09-05 | Primary: `npm_link_all_packages()`'s own doc line, confirming it only produces Bazel-graph targets |
| [aspect-build/rules_ts docs/tsconfig.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/tsconfig.md) | Ruleset docs (raw, `main`) | Checked 2026-09-05 | Primary: "editors agree with rules_ts" root-tsconfig guidance and the inline-dict editor-skew warning |
| [aspect-build/rules_ts docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md) | Ruleset docs (raw, `main`) | Checked 2026-09-05 | Primary: the `TS6059`/`rootDir` failure walkthrough; confirms no `rootDirs` (plural) content |
| [aspect-build/rules_ts examples/simple/tsconfig.json](https://raw.githubusercontent.com/aspect-build/rules_ts/main/examples/simple/tsconfig.json) | Ruleset worked example (raw, `main`) | Checked 2026-09-05 | Primary: the inline comment settling `paths` as an editor-only mechanism |
| [rules_ts v3.10.1 tag MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_ts/v3.10.1/MODULE.bazel) vs. [main MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_ts/main/MODULE.bazel) | Tag-vs-main diff (raw) | Checked 2026-09-05, main is 27 commits ahead | Primary: settles Q3 — the `bazel_compatibility`/floor bump is real but unreleased |
| [rules_js v3.4.1 tag MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_js/v3.4.1/MODULE.bazel) vs. [main MODULE.bazel](https://raw.githubusercontent.com/aspect-build/rules_js/main/MODULE.bazel) | Tag-vs-main diff (raw) | Checked 2026-09-05 | Primary: confirms no floor change, released or pending |
| [aspect-build/rules_js releases list](https://github.com/aspect-build/rules_js/releases) (GitHub API) | Release metadata | Checked 2026-09-05 | Primary: exposes the `/releases/latest` trap (v2.9.3 published after v3.4.1 the same day) |
| [mrmeku/rules_playwright](https://github.com/mrmeku/rules_playwright) — [README.md](https://raw.githubusercontent.com/mrmeku/rules_playwright/main/README.md), [MODULE.bazel](https://raw.githubusercontent.com/mrmeku/rules_playwright/main/MODULE.bazel) | Ruleset source (raw, `main`) + GitHub API metadata | Checked 2026-09-05, pushed 2026-03-06, latest tag v0.5.4 | Primary: the BCR-published, actively maintained Playwright path for the fleet's e2e suite |
| [Bazel Central Registry — modules/rules_playwright/metadata.json](https://github.com/bazelbuild/bazel-central-registry/blob/main/modules/rules_playwright/metadata.json) | BCR module metadata | Checked 2026-09-05 | Primary: settles the naming collision — confirms the BCR module is `mrmeku/rules_playwright`, not the collider-bazel-extensions project |
| [collider-bazel-extensions/rules_playwright](https://github.com/collider-bazel-extensions/rules_playwright) | GitHub API repo metadata | Checked 2026-09-05 | Primary (negative evidence): confirms the naming-collision trap — 0 stars, not on the BCR |
| [Aspect blog index](https://aspect.build/blog/) | Full post listing | Checked 2026-09-05 | Secondary (vendor blog): confirms no dedicated IDE/editor-setup post exists among 81 titles |
| [Aspect — "Principles of a Bazel Migration"](https://aspect.build/blog/principles) | Vendor blog post | Checked 2026-09-05 | Secondary: the only primary-ish position on incremental adoption found; argued, not measured |
| [Aspect — "Moving TypeScript code into a Bazel monorepo"](https://aspect.build/blog/moving-typescript-to-bazel-monorepo) | Vendor blog post, self-marked WIP since Sept 2022 | Checked 2026-09-05, content 4 years stale | Secondary: closest TS-migration-specific post; confirms no coverage-threshold numbers exist there either |
| [Aspect — BazelCon 2025 recap](https://aspect.build/blog/bazelcon-2025) | Vendor blog post | Checked 2026-09-05 | Secondary (negative evidence): confirms no Canva/Wix/Tinder incremental-migration talk is named |
| [bazel-audit/fleet-bazel-readiness.md](../bazel-audit/fleet-bazel-readiness.md) (internal) | Fleet grounding audit | 2026-09-05 | Primary (internal): the fleet's own runner-per-package table this document maps against |


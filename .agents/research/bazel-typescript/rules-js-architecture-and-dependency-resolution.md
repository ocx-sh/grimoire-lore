---
title: rules_js architecture and dependency resolution
topic: rules-js-architecture-and-dependency-resolution
group: bazel-typescript
family: BZL-JS
agent: bazel-wave2-dive-6.1
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 20
primary_sources_count: 16
settles: [M-K-04, M-K-05, M-K-06, M-K-07, M-K-08, M-K-09, M-K-12, M-K-13, M-K-14, M-K-16]
scope: >
  What adopting rules_js costs and why, at 3.4.1: the pnpm requirement, the
  bazel-out-as-cwd architecture and its BAZEL_BINDIR tax, npm lifecycle hooks
  as actions, the module-not-found diagnosis tree, phantom dependencies,
  bun.lock's non-path, the open ESM sandbox escape, npm-extract cache
  economics, and coverage caveats. Does NOT cover the ts_project
  typecheck-gate/transpiler story (rules-ts-typecheck-and-transpiler owns
  that: M-K-01/02/03/10/11) or Cargo/pyproject/package.json hygiene
  (rust-cargo/python-packaging/typescript-packaging own that).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Current version is `aspect_rules_js` **3.4.1** (2026-08-21); the floor for every claim below is **3.0.0** (2026-03-02), which deleted Bazel 6 support, WORKSPACE support, and pnpm <v9 support outright — a 1.x/2.x-era snippet hard-errors on 3.x.
- rules_js requires **pnpm specifically**, not npm or yarn, because pnpm's virtual store maps onto Bazel's external-repository model and pnpm's linker is expressible as discrete, cacheable Bazel actions — npm's and yarn's linkers are not.
- The architecture runs every Node tool with its **working directory inside `bazel-out`**, mimicking a pnpm layout there. This makes TypeScript's `rootDirs` resolution problem disappear, but forces every custom rule, macro, and `genrule` author to re-path inputs/outputs and carry `BAZEL_BINDIR` — the upstream Bazel core fix (`bazelbuild/bazel#15470`) is still open.
- `npm_translate_lock`'s only lockfile-shaped attributes are `pnpm_lock`, `npm_package_lock`, and `yarn_lock` — verified directly against the ruleset's own source. **There is no `bun_lock` attribute and no rules_js ingestion path for `bun.lock`.**
- "Module not found" is the most common rules_js failure and has exactly three remedies depending on where the `require` lives: add a first-party `data` dep, fix a genuine upstream under-declaration with `pnpm.packageExtensions`, or hoist a plugin-discovery tool with `public_hoist_packages`.
- rules_js will **not** support pnpm's phantom hoisting; setting `hoist: false` in `pnpm-workspace.yaml` makes most of these failures reproducible with plain pnpm outside Bazel — this is the cheapest pre-migration check available.
- npm lifecycle hooks (`preinstall`/`install`/`postinstall`/`prepare`) run as real, cacheable, remote-cacheable Bazel actions, not repository-rule side effects, with default `no-sandbox` execution requirements that can be overridden per package.
- The **ESM-imports-escape-the-sandbox** bug (`aspect-build/rules_js#362`) is still open, unfixed since 2022-08-05, and is listed verbatim on the README's own "Known issues."
- Caching `NpmPackageExtract` actions in a **cache-only, no-RBE** setup can be net-negative because remote caches fetch tree artifacts file-by-file; the ruleset's own troubleshooting doc offers `--modify_execution_info=NpmPackageExtract=+no-remote-cache` as an experiment and explicitly declines to prescribe a default.
- That same opt-out is the wrong move under RBE: extracted outputs must reach the remote CAS anyway, so disabling the cache there forces redundant re-extraction on every worker.
- Code coverage under `bazel coverage` has four sharp, documented caveats: it counts against the test's own `timeout`/`size` budget; code in the program's own `process.on('exit', …)` listener is invisible to it; it requires a runfiles tree (silently empty without `--enable_runfiles`); and first-party code repackaged via `npm_package` (rather than linked as a `js_library`) reports empty coverage by design.
- Frameworks that own their own output layout — Next.js `output: "standalone"`, Astro, SvelteKit dev codegen — assume a writable, non-symlinked `node_modules`/`src` tree and fail under rules_js's sandbox with a concrete tree-artifact symlink error, not a generic import error.
- As of 2026-09-05, rules_js ships **no migration guide at all**: `docs/migrate.md`, `migrate_2.md`, and `migrate_3.md` are all 404 on `main`, and the vendor's own hosted-docs redirect chain for "rules_js migration" dead-ends at that same 404. Any pre-migration checklist has to be assembled from `pnpm.md` and `troubleshooting.md`, not read off an upstream doc.
- Fleet check: 6 of 8 measured TypeScript packages use npm (map cleanly onto rules_js's pnpm-shaped resolution after conversion), 2 use bun (`setup-ocx`, `kate-middlechild`) with no ingestion path today.
- rules_ocx itself exercises zero `js_*`/`npm_*` targets; every finding here grounds on the ruleset's own docs/source and the practitioner corpus (fleet shape F), not on fleet code.
- Lockfile-kind-per-workspace hygiene (`package-lock.json` vs `pnpm-lock.yaml` matching `packageManager`) is `typescript-packaging`'s territory already — this dive does not re-derive it.

## Findings

### 1. Version floor: 3.4.1, with a hard break at 3.0.0

`aspect_rules_js` releases: **v2.0.0** published 2024-08-15, **v3.0.0** published 2026-03-02, **v3.4.1** published 2026-08-21 ([releases API](https://github.com/aspect-build/rules_js/releases)). The 3.0.0 "Primary Breaking Changes" are, verbatim from the release notes:

- `refactor: remove bazel6 support` ([#2458](https://github.com/aspect-build/rules_js/pull/2458))
- `refactor: remove WORKSPACE support` ([#2455](https://github.com/aspect-build/rules_js/pull/2455))
- `refactor: remove support for pnpm <v9` ([#2456](https://github.com/aspect-build/rules_js/pull/2456))

Minor breaking changes in the same release removed `npm_translate_lock(defs_bzl_filename)`, `npm_translate_lock(link_workspace)`, `npm_translate_lock(additional_file_contents)`, `npm_translate_lock(root_package)`, `npm_import(link_packages)`, the `prod`/`dev` npm_translate_lock args (replaced by `no_dev`), and every non-bzlmod repository-rule API ([v3.0.0 release notes](https://github.com/aspect-build/rules_js/releases/tag/v3.0.0)). 3.4.1 is a minor patch adding `npmrc` `tokenHelper` support and launcher performance work ([v3.4.1 release notes](https://github.com/aspect-build/rules_js/releases/tag/v3.4.1)). **Every claim below applies to 3.x on Bazel 8/9; a 1.x/2.x-era snippet with `WORKSPACE`, `bazel6`, or the removed attrs listed above hard-errors.**

### 2. Why pnpm specifically

The README states the design tension directly: two failed approaches preceded the current one — monkey-patching Node's `require` (compatibility nightmare, most npm packages assume vanilla resolution) and a runtime `npm link`-style linker (workable but forced every tool to run with Bazel's output folder as cwd anyway). rules_js settled on **always** running Node tools with cwd inside `bazel-out`, using a pnpm-style layout tool to build `node_modules` there ([README §Design](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md)). pnpm specifically, because its lockfile format already encodes exact resolutions and its **virtual store** — a content-addressed store plus a `node_modules/.pnpm` layout with real symlinks — is the one third-party layout whose construction decomposes cleanly into discrete, individually-cacheable Bazel actions (`npm_import` per package). npm's and yarn's linkers do not expose an equivalent seam ([`docs/pnpm.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md); corroborated independently by [failure-corpus.md §10](../bazel-topic-map/failure-corpus.md)).

### 3. The bazel-out-as-cwd decision: what it fixes, what it costs

**Fixes:** TypeScript's `rootDirs` path-mapping problem ([microsoft/TypeScript#37378](https://github.com/microsoft/TypeScript/issues/37378), which the README says "probably won't be solved") disappears because sources and outputs live together, exactly as they would running the tool outside Bazel. Sourcemaps and stack traces also come out looking normal.

**Costs:** "Bazel rules/macro authors (even `genrule` authors) must re-path inputs and outputs to account for the working directory under `bazel-out`, and must ensure that sources are copied there first. This forces users to pass a `BAZEL_BINDIR` in the environment of every node action." ([README §Design](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md)). The upstream Bazel core issue that would relieve this — exposing `ctx.var["BINDIR"]` to actions automatically — is `bazelbuild/bazel#15470`, **open since 2022-05-11, still open as of 2026-09-05**. `js_run_binary` sets `BAZEL_BINDIR` automatically; a custom rule invoking `js_binary` directly should use the `js_binary_lib.run_binary_action` helper in `js/libs.bzl` instead of a raw `ctx.actions.run`, to keep the re-pathing detail hidden.

```starlark
# WRONG — bypasses the helper, must hand-roll BAZEL_BINDIR and re-pathing
def _my_rule_impl(ctx):
    ctx.actions.run(
        executable = ctx.executable._my_js_tool,
        arguments = [ctx.file.src.path],   # breaks: cwd is bazel-out, not the source tree
        outputs = [ctx.outputs.out],
    )

# RIGHT — the helper carries BAZEL_BINDIR and re-pathing for you
load("@aspect_rules_js//js:libs.bzl", "js_binary_lib")

def _my_rule_impl(ctx):
    js_binary_lib.run_binary_action(
        ctx = ctx,
        js_binary = ctx.attr._my_js_tool,
        inputs = [ctx.file.src],
        outputs = [ctx.outputs.out],
    )
```

### 4. npm lifecycle hooks as cacheable actions

`preinstall`/`install`/`postinstall`/`prepare` hooks are modeled as real Bazel build actions (not repository-rule side effects), which is why their results can live in the remote cache and be shared between developers. Which hooks run per package is governed by `allowBuilds` (or `pnpm.onlyBuiltDependencies` for pnpm versions before **10.26**). Bazel-side, `lifecycle_hooks`, `lifecycle_hooks_exclude`, `lifecycle_hooks_envs`, and `lifecycle_hooks_execution_requirements` on `npm_translate_lock` let you filter and configure them per package; by default hooks run with the `no-sandbox` execution requirement (sandboxing overhead is skipped for performance), so a hook that specifically needs sandbox isolation to succeed must opt back in explicitly ([`docs/pnpm.md` §Lifecycles](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md)).

### 5. The three-branch diagnosis for "Module not found"

Per the ruleset's own troubleshooting guide, this is "the most common error rules_js users encounter," and the fix depends entirely on where the `require`/`import` originates ([`docs/troubleshooting.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md)):

1. **`require` in your own code** → add the missing package to the target's `data` (and to `package.json#dependencies`, since pnpm is strict about hoisting):
   ```starlark
   js_library(
       name = "requires_foo",
       srcs = ["config.js"],          # contains require('foo')
       data = [":node_modules/foo"],  # satisfies that require
   )
   ```
2. **`require` in third-party code, and it's a genuine upstream bug** (the package uses `foo` but doesn't declare it) → add a `pnpm.packageExtensions` entry in `package.json` and re-run `pnpm install`; rules_js only reads `pnpm-lock.yaml`, not `package.json`, so the extension has no effect until the lockfile is regenerated. The same class of bug is already catalogued in Yarn's [extensions database](https://github.com/yarnpkg/berry/blob/master/packages/yarnpkg-extensions/sources/index.ts); rules_js does not yet consume that database automatically (open feature request [`aspect-build/rules_js#1215`](https://github.com/aspect-build/rules_js/issues/1215), filed 2023-08-14, still open).
3. **It's a plugin-pattern tool** (eslint, prettier — discovers plugins by walking `node_modules` at runtime) → use `public_hoist_packages` on `npm_translate_lock`:
   ```starlark
   npm.npm_translate_lock(
       ...
       public_hoist_packages = {
           "eslint-config-react-app": [""],   # "" = lockfile is at the workspace root
       },
   )
   ```
   and still depend on the hoisted target explicitly (`data = ["//:node_modules/eslint-config-react-app"]`) — hoisting only changes the tree layout, not the dependency graph.

### 6. Phantom dependencies, and how to find them before migration

rules_js "does not and will not support pnpm 'phantom' hoisting which allows for packages to depend on undeclared dependencies. All dependencies between packages must be declared under rules_js" ([`docs/pnpm.md` §Hoisting](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md)). The doc's own recommendation doubles as the pre-migration check: add `hoist: false` to `pnpm-workspace.yaml` *before* touching Bazel, then run the full pnpm-based build/test suite. "With hoisting disabled, most import/require failures … will be reproducible with pnpm outside of Bazel" — meaning the whole class of migration-day surprise is discoverable with plain pnpm, at zero Bazel cost, and every failure maps directly onto one of the three branches in Finding 5.

### 7. `bun.lock`: confirmed, no ingestion path

`npm_translate_lock`'s attribute schema in the ruleset's own source has exactly three lockfile-shaped attributes:

```
$ grep -n 'attr\.' npm/private/npm_translate_lock.bzl | grep -i lock
180:        "npm_package_lock": attr.label(doc = """
231:        "pnpm_lock": attr.label(doc = "The `pnpm-lock.yaml` file, ...
341:        "yarn_lock": attr.label(doc = """
```
([`npm/private/npm_translate_lock.bzl`](https://raw.githubusercontent.com/aspect-build/rules_js/main/npm/private/npm_translate_lock.bzl), read in full). There is no `bun_lock` attribute, and a repo-wide search for open rules_js issues mentioning `bun.lock` returns zero results — confirmed by `gh api search/issues -f q='repo:aspect-build/rules_js bun.lock'` returning an empty item list on 2026-09-05, i.e. nobody has even filed a feature request. A bun-locked repo has no partial path into rules_js: it must fully migrate to pnpm (generate a real `pnpm-lock.yaml`, e.g. via `pnpm import` from an intermediate npm/yarn lockfile) before `npm_translate_lock` can see any of its dependencies.

### 8. The still-open ESM sandbox escape

README, verbatim, under "Known issues": "ESM imports escape the runfiles tree and the sandbox due to [`https://github.com/aspect-build/rules_js/issues/362`](https://github.com/aspect-build/rules_js/issues/362)." That issue was filed 2022-08-05 and is **still open** as of 2026-09-05 (`gh api repos/aspect-build/rules_js/issues/362 -q .state` → `open`). No workaround is documented in `docs/`; this is a standing hermeticity gap specific to ESM resolution, distinct from the general CommonJS `require` machinery the rest of this doc describes.

### 9. Caching `NpmPackageExtract`: when the opt-out wins

rules_js runs one `NpmPackageExtract` action per third-party package, producing tree artifacts. Most remote caches store tree artifacts file-by-file, so fetching a cached extraction can mean many small round trips. In a **cache-only setup with no remote execution**, this can be slower than just re-extracting the tarball locally — the exact scenario reported in [`aspect-build/rules_js#2715`](https://github.com/aspect-build/rules_js/issues/2715) (filed 2026-02-03; a repro showed a warm-remote-cache build at 10.2s critical-path 1.76s against a cold build at 123.9s — the win exists, but the *extraction* leg specifically was the reporter's complaint, addressed not by a code fix but by documenting the opt-out in [PR #2880](https://github.com/aspect-build/rules_js/pull/2880), closing the issue). The doc's own opt-out:

```
# Don't upload or fetch npm package extraction results; re-extract locally instead.
common --modify_execution_info=NpmPackageExtract=+no-remote-cache
```

The ruleset explicitly declines to set this as a default: "There is no setting that is right for everyone" ([`docs/troubleshooting.md` §Remote cache and npm package extraction](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md)). **It wins when**: no remote execution is configured, network round-trip cost to the cache exceeds local extraction cost (many small packages, high-latency cache), and CI runners have fast local disk. **It loses when**: RBE is configured (extracted outputs must reach the remote CAS regardless, so disabling the cache just forces redundant re-extraction on every remote worker) or Build without the Bytes (`--remote_download_minimal`) is combined with RBE, where keeping extraction cached is "most likely" wanted per the same doc.

### 10. Coverage: four specific caveats, not a blanket "coverage works"

Under `bazel coverage`, `js_test` produces its lcov report as the test exits, while V8 coverage data and instrumented sources are both still available; `_lcov_merger` only publishes it. Four documented, sharp caveats ([`docs/troubleshooting.md` §Code coverage](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md)):

1. **Counts against the test's own budget.** V8→lcov conversion time is proportional to the number of instrumented files; a test that sits near its `timeout` under `bazel test` may need a larger `size`/`timeout` to pass under `bazel coverage`.
2. **`exit` listeners are invisible.** The reporter registers via a `--require` preload, so it necessarily runs *before* any `process.on('exit', ...)` the test program itself registers; a preload can't register last, so this is inherent, not a bug to chase.
3. **Requires a runfiles tree.** Without one (`enable_runfiles = False`, the default on Windows without `--enable_runfiles`), the report is empty and the log carries the literal string `coverage report generator '...' not found; code coverage requires a runfiles tree`. The test itself still passes.
4. **`npm_package`-repackaged first-party code reports empty coverage by design.** `npm_package` produces a store *copy* with no link back to sources, so the executed file can't be mapped back; depend on first-party code under test as a `js_library`, not a repackaged `npm_package` ([#2933](https://github.com/aspect-build/rules_js/issues/2933)).

A separate, narrower note: a test framework that writes its own lcov to `$COVERAGE_OUTPUT_FILE` (jest via nyc, etc.) owns that report and rules_js won't overwrite it — *unless* `--experimental_split_coverage_postprocessing` is set (required for remote execution alongside `--experimental_fetch_all_coverage_outputs`), in which case Bazel discards the test's own report and publishes rules_js's instead. Rulesets in that situation (rules_jest) implement their own coverage support rather than relying on rules_js's.

### 11. Frameworks that own their own output layout

Next.js's `output: "standalone"` mode, Astro, and SvelteKit's dev-mode type codegen all assume a writable, real (non-symlinked) `node_modules`/`src` tree — an assumption rules_js's sandbox model does not honor. The concrete, measured failure for Next.js standalone under a plain `js_run_binary` ([`bazelbuild/examples#382`](https://github.com/bazelbuild/examples/issues/382), open since 2023-12-11):

```
ERROR: .../BUILD.bazel:21:5: Error while validating output TreeArtifact ...next.js/.next :
Failed to resolve relative path standalone/node_modules/is-even inside TreeArtifact
.../bazel-out/k8-fastbuild/bin/next.js/.next.
The associated file is either missing or is an invalid symlink.
```

This is the direct architectural corollary of Finding 3: a tool that writes into its own idea of `node_modules` (rather than reading rules_js's declared inputs and writing only declared outputs) breaks the moment its output crosses Bazel's tree-artifact validation. The fleet's own `kate-middlechild` package uses Astro today ([fleet §TypeScript](../bazel-audit/fleet-bazel-readiness.md)); adopting rules_js for it would hit exactly this class of failure, not a generic import error.

### 12. No shipped migration guide, as of 2026-09-05

The repository's `docs/` directory today contains only `README.md`, `faq.md`, `path_mapping.md`, `pnpm.md`, `troubleshooting.md`, and `use_execroot_entry_point.md` (`gh api repos/aspect-build/rules_js/contents/docs`, checked 2026-09-05) — no `migrate.md`, `migrate_2.md`, or `migrate_3.md`. All three return HTTP 404 on `main`. The vendor's hosted-docs migration link (`https://docs.aspect.build/guides/rules_js_migration/`, cited by prior scouting) redirects through `https://aspect.build/docs/guides/rules_js_migration/` to `https://github.com/aspect-build/rules_js/blob/main/docs/migrate.md`, which is also 404. This is consistent with the docs-cleanup commits visible in the 3.0.0 changelog (`cleanup(docs): remove rules_nodejs and rules_js 1.x migration`, [#2490](https://github.com/aspect-build/rules_js/pull/2490); `refactor(docs): remove content that's been moved to Aspect docs`, [#2729](https://github.com/aspect-build/rules_js/pull/2729)) — the content moved, then the destination itself went away. **Consequence: no upstream checklist exists to hand an adopting team; one must be assembled from `pnpm.md` §Hoisting and `troubleshooting.md`**, as this doc does in Decisions below.

## Decisions

**D1 — Recommend adopting rules_js for a repo not already on pnpm?** **No, not as a starting move.** Evidence: pnpm is a hard requirement (Finding 2), the migration is not "just point rules_js at your lockfile" — it requires first converting to pnpm (`pnpm import` from npm/yarn), disabling hoisting, and fixing every phantom dependency that surfaces, with **no upstream migration guide to follow** (Finding 12). The retraining and phantom-dependency-fix cost is real and paid *before* any Bazel benefit is visible, and (per the map's Conflict #2) a Bazel adoption that never actually runs in CI buys nothing at all. **Assumption named:** the target repo is being evaluated for rules_js on its own merits, not already migrating to Bazel for other reasons (Rust/Python) where the JS package is a minority slice of a broader monorepo migration — in that case the calculus shifts because the pnpm conversion cost is amortized against benefits the other languages already justify.

**D2 — The pre-migration checklist that finds phantom dependencies before migration day.** Built entirely from Findings 6 and 5, in order:
1. Convert the lockfile to pnpm (`pnpm import` if coming from npm/yarn) — do this once, outside Bazel.
2. Add `hoist: false` to `pnpm-workspace.yaml`.
3. Run `pnpm install` then the full existing build+test suite under plain pnpm (no Bazel involved yet).
4. Every failure is a phantom dependency; triage each with Finding 5's three-branch tree (first-party `data` dep / `pnpm.packageExtensions` / `public_hoist_packages` candidate — note which tools are plugin-pattern discoverers, e.g. eslint/prettier, ahead of time).
5. Only once that suite is green under plain pnpm with hoisting off, begin writing `npm_translate_lock` + `js_library`/`ts_project` BUILD targets.
**Evidence:** this is the documented, reproducible-outside-Bazel path the ruleset itself recommends (`docs/pnpm.md`), not an invented process. **Assumption named:** the team can actually run the full test suite under plain pnpm before any Bazel work starts — if the suite itself is broken or absent, this checklist has no signal to act on and the phantom-dependency risk moves entirely into the Bazel migration itself.

## Normative guidance candidates

| # | Rule | Rationale (failure it prevents) | Verification | Empty output reads | Severity | Bazel / ruleset | M-ID |
|---|---|---|---|---|---|---|---|
| 1 | Before adopting rules_js, confirm the repo's package manager is pnpm ≥9 (migrate first if not) — never wire `npm_translate_lock` against an npm/yarn-only repo without a real `pnpm-lock.yaml`. | rules_js's virtual-store model and action-decomposed linker only exist for pnpm; there is no partial path for npm/yarn beyond a one-shot `pnpm import`. | `test -f pnpm-lock.yaml && echo ok \|\| echo needs-migration` | Missing file = finding (unmigrated repo). | MUST | Bazel 7/8/9, rules_js ≥3.0.0 | M-K-05 |
| 2 | Pin `aspect_rules_js` ≥3.0.0 and reject any snippet that configures it via `WORKSPACE`, targets Bazel 6, or references pnpm <9. | 3.0.0 deleted Bazel 6, WORKSPACE, and pnpm<9 support outright (PRs [#2458](https://github.com/aspect-build/rules_js/pull/2458)/[#2455](https://github.com/aspect-build/rules_js/pull/2455)/[#2456](https://github.com/aspect-build/rules_js/pull/2456)); a training-data-era snippet hard-errors. | `grep -rn "aspect_rules_js" WORKSPACE* 2>/dev/null` | Pass — no WORKSPACE-based config found. | MUST | Bazel 8/9, rules_js ≥3.0.0 | M-K-05 |
| 3 | Every custom rule/macro/`genrule` that shells out to a JS/Node tool must go through `js_run_binary` or `js_binary_lib.run_binary_action`, never a raw `ctx.actions.run` on a JS binary. | rules_js always runs Node tools with cwd inside `bazel-out`; a raw `ctx.actions.run` doesn't set `BAZEL_BINDIR` or re-path inputs, producing spurious "file not found" failures. | `grep -rn "ctx.actions.run(" --include=*.bzl \| grep -v run_binary_action` (in custom `.bzl` files that also `load` a JS binary rule) | Pass — no raw calls bypass the helper. | MUST | Bazel 7/8/9, rules_js all 2.x/3.x | M-K-04 |
| 4 | Track `bazelbuild/bazel#15470` before claiming the `BAZEL_BINDIR` tax is fixed on any Bazel version. | The core-Bazel relief issue is open since 2022-05-11; an agent may assume a newer Bazel version already solved it. | `gh issue view 15470 -R bazelbuild/bazel --json state -q .state` | `OPEN` = pass (constraint still holds, as documented here); `CLOSED` = re-verify this whole finding. | SHOULD | Bazel 8/9 | M-K-04 |
| 5 | Set `hoist: false` in `pnpm-workspace.yaml` and run the full pnpm-based test suite before writing any `npm_translate_lock`/BUILD target. | Cheapest way to surface phantom dependencies rules_js will reject, at zero Bazel iteration cost — the ruleset's own documented pre-check. | `pnpm install` (with `hoist: false` set) then `pnpm -r test`/`pnpm -r build` | Green run = pass, but is not proof for every code path not exercised by the suite — name that caveat when reporting. | MUST | Bazel 7/8/9, rules_js all | M-K-08 |
| 6 | Classify every "Module not found" failure into exactly one of the three documented branches (first-party `data` dep / upstream `packageExtensions` / plugin `public_hoist_packages`) before applying a fix. | Guessing the wrong branch (e.g. reaching for `public_hoist_packages` when the fix is a `data` dep) widens the hoist surface and hides the real bug. | Reading heuristic: does the failing `require` originate in first-party `srcs` (branch a), or inside `node_modules/<pkg>` — check that package's own `package.json` for whether it should declare the missing name (branch b) or discovers plugins dynamically by string/glob at runtime (branch c). | N/A — heuristic, not a grep; no universal check exists. | MUST | Bazel 7/8/9, rules_js all | M-K-07 |
| 7 | Before hand-writing a `pnpm.packageExtensions` entry for an upstream under-declaration, check whether it's already catalogued in `yarnpkg/berry`'s extensions database. | rules_js does not auto-consume that database yet ([#1215](https://github.com/aspect-build/rules_js/issues/1215), open since 2023-08-14) — don't assume it's automatic. | `gh issue view 1215 -R aspect-build/rules_js --json state -q .state` | `OPEN` = still manual as documented here; `CLOSED` = re-check whether auto-consumption shipped. | CONSIDER | rules_js all | M-K-07 |
| 8 | Never point any `npm_translate_lock` lockfile attribute at a `bun.lock`, and don't invent a `bun_lock=` attribute — it doesn't exist. | Confirmed against the ruleset's own source: only `pnpm_lock`, `npm_package_lock`, `yarn_lock` are defined. A bun-locked repo has zero partial ingestion path. | `grep -n 'attr\.' npm/private/npm_translate_lock.bzl \| grep -i lock` (vendored source, or read on GitHub) | Absence of any `bun_lock` line = pass (confirms the constraint). | MUST | rules_js 3.4.1 (and prior) | M-K-06 |
| 9 | Treat the ESM-imports-escape-the-sandbox bug as a live, unresolved constraint — never document a "fix" for it. | On the ruleset's own "Known issues" list, tracked by [`#362`](https://github.com/aspect-build/rules_js/issues/362), open since 2022-08-05. | `gh issue view 362 -R aspect-build/rules_js --json state -q .state` | `OPEN` = pass (matches this finding); `CLOSED` = re-verify before repeating the claim. | MUST | rules_js all | M-K-13 |
| 10 | In a cache-only (no RBE) setup, measure `NpmPackageExtract` time in a build profile before assuming remote-cache reuse is a net win; if it dominates, opt out with `--modify_execution_info=NpmPackageExtract=+no-remote-cache` rather than accepting slow warm-cache builds silently. | Tree artifacts are fetched file-by-file by most remote caches; the ruleset's own doc names this as a possible net-negative and declines a universal default. | `bazel build --profile=/tmp/p.json …` then sum `NpmPackageExtract`-mnemonic duration via `bazel analyze-profile` or the JSON trace, with vs. without the flag. | No `NpmPackageExtract` entries in the profile = pass, exception doesn't apply. | CONSIDER | Bazel 7/8/9, rules_js all | M-K-12 |
| 11 | Never apply the `NpmPackageExtract=+no-remote-cache` opt-out in an RBE setup. | With remote execution, extracted outputs must land in the remote CAS regardless; disabling the cache forces redundant re-extraction on every remote worker, worse under BwoB (`--remote_download_minimal`). | `grep -l remote_executor .bazelrc*` and `grep -l "NpmPackageExtract=+no-remote-cache" .bazelrc*` — both present is the smell. | Both files absent for the flag = pass. | SHOULD | Bazel 7/8/9, rules_js all | M-K-12 |
| 12 | On Bazel 8+, ignore pnpm's `node_modules` via `ignore_directories(["**/node_modules"])` in `REPO.bazel`; do not rely on the deprecated Bazel-7.x-only `verify_node_modules_ignored` attribute as the sole guard on 8+. | Without either, Bazel's directory walk collides with pnpm's tree; a Bazel-7 snippet carried forward keeps the deprecated attribute and gets no protection on 8+. | `grep -n "ignore_directories" REPO.bazel` on a repo whose `.bazelversion` is ≥8. | Missing = finding (no ignore directive on a Bazel 8+ repo). | MUST | Bazel 8+ (7.x uses `verify_node_modules_ignored`) | M-K-05 |
| 13 | When a package needs lifecycle hooks beyond the pnpm default (`preinstall`/`install`/`postinstall`), explicitly review `lifecycle_hooks`/`lifecycle_hooks_exclude`/`lifecycle_hooks_execution_requirements` rather than trusting the default `no-sandbox` behavior for every package. | rules_js runs hooks as real Bazel actions with sandboxing off by default for performance; a hook that needs sandbox isolation to succeed, or is broken under Bazel, silently misbehaves unless configured. | `jq '.pnpm.onlyBuiltDependencies // .pnpm.allowBuilds' package.json` (or the lockfile's `allowBuilds`) cross-checked against `lifecycle_hooks*` overrides in `MODULE.bazel`. | No `onlyBuiltDependencies`/`allowBuilds` present = pass, nothing needs attention. | CONSIDER | rules_js all (pnpm ≥10.26 for `onlyBuiltDependencies` naming) | M-K-05 |
| 14 | Give `js_test` targets with many instrumented files a larger `size`/`timeout` under `bazel coverage` than under plain `bazel test`, or expect coverage-only timeouts. | V8→lcov conversion runs inside the test's own budget and scales with instrumented-file count; a test passing under `bazel test` can time out only under `bazel coverage`. | Run `bazel coverage //path:target`; check exit code and for a timeout-shaped failure absent under `bazel test`. | No timeout under coverage = pass. | SHOULD | rules_js all | M-K-16 |
| 15 | Depend on first-party code under test as a `js_library`, never as a repackaged `npm_package`, whenever that code's coverage matters. | `npm_package` produces a store copy with no link back to sources; coverage reports empty for it by design ([#2933](https://github.com/aspect-build/rules_js/issues/2933)), not by bug. | `bazel query 'kind(js_test, //...)'` then for each, `bazel query 'deps($t) intersect kind(npm_package, //...)'` — non-empty flags a target whose covered code may be an `npm_package`. | Empty = pass, no `npm_package` deps under a coverage-relevant test. | MUST (when coverage of that code is required) | rules_js all | M-K-16 |
| 16 | On Windows CI (or anywhere `enable_runfiles` may default false), verify runfiles are enabled before trusting a `bazel coverage` result for a `js_test`. | Coverage requires a runfiles tree to map V8 data to sources; without it the test still passes but reports empty coverage with a specific, greppable error. | Grep the coverage run's log for `code coverage requires a runfiles tree`. | Absent = pass. | SHOULD | rules_js all; Windows-specific | M-K-16 |
| 17 | Before wiring a framework with its own output-layout opinions (Next.js `output: "standalone"`, Astro, SvelteKit dev codegen) to a plain `js_binary`/`js_run_binary`, check its config for flags that write into `src/` or expect a writable, non-symlinked `node_modules`. | These tools fail under rules_js's sandbox with a concrete tree-artifact symlink-resolution error (measured in [`bazelbuild/examples#382`](https://github.com/bazelbuild/examples/issues/382)), not a generic import error — and no blanket fix exists. | Reading heuristic: grep the framework config for `output: "standalone"`, `outDir` pointing at `src`, or docs mentioning "requires a real node_modules". | N/A — heuristic; no single grep covers every framework. | SHOULD | rules_js all | M-K-14 |
| 18 | Choose one of the two documented shapes for a monorepo's shared `dist/` output explicitly (single root `BUILD` file, or per-package `dist` restructured under each package's own Bazel package) — don't improvise a third layout with genrule copy chains. | Bazel requires a package's outputs live under that package's own output tree; an arbitrary custom layout will not build, and the failure mode invites ever-more-complex copy-chain workarounds instead of a restructure. | Attempt the build; read the "output file … is not under this package's directory" error, and check which of the two shapes the BUILD layout follows. | N/A — structural decision, not a lint. | CONSIDER | Bazel 7/8/9, rules_js all | M-K-14 |
| 19 | Gate rules_js adoption on CI actually invoking `bazel build`/`bazel test` for the migrated packages, not just a local proof-of-concept. | Per the map's fleet-wide finding, 31.23% of Bazel projects with CI configured never invoke Bazel in that CI — a JS migration's pnpm-conversion and phantom-dependency-fix cost is sunk if CI doesn't end up running Bazel. | `grep -rl "bazel build\|bazel test" .github/workflows/` (or the CI system in use) scoped to the migrated package's path. | No match = finding — Bazel adopted, CI doesn't run it. | MUST | Bazel 7/8/9, rules_js all | — (go/no-go gate; ties to cross-family M-F-04) |

## Fleet evidence

- **8 TypeScript packages measured, 6 npm / 2 bun** — `ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `fma`, `creeptd-ng/web` use `package-lock.json`; `setup-ocx` and `kate-middlechild` use `bun.lock` ([bazel-audit/fleet-bazel-readiness.md:157-163](../bazel-audit/fleet-bazel-readiness.md)). This matches the brief's fleet claim exactly and confirms Rule 1's applicability: 6 of 8 need a pnpm conversion before rules_js is reachable at all, and 2 have no path today.
- **"`bun.lock`'s format is not what `rules_js`'s `npm_translate_lock` consumes"** — the audit's own conclusion, independently reached from measuring the fleet rather than reading rules_js's source ([bazel-audit/fleet-bazel-readiness.md:166](../bazel-audit/fleet-bazel-readiness.md)); this dive's Finding 7 corroborates it from the ruleset side.
- **`kate-middlechild` is the fleet's only bun *workspace*** (multiple packages, bun `catalog:` versions) and uses Astro for its `packages/web` build ([bazel-audit/fleet-bazel-readiness.md:163,265](../bazel-audit/fleet-bazel-readiness.md)) — the exact framework named in Finding 11's output-layout trap, making it the single fleet package most likely to hit that failure mode on a hypothetical migration.
- **`setup-ocx` and `kate-middlechild`'s pattern-table entries** both name "No `rules_js` bun-lockfile ingestion path" as the blocking gap ([bazel-audit/fleet-bazel-readiness.md:264-265](../bazel-audit/fleet-bazel-readiness.md)).
- **`rules_ocx` itself contributes zero direct evidence**: greps for `rules_js`, `js_library`, `js_binary`, `npm_translate_lock`, `pnpm`, `ts_project` across `config-inventory.md`, `starlark-code-shape.md`, and `build-contracts-and-ci-posture.md` return no ruleset usage — this dive is grounded on the rulesets' own docs/source and the practitioner corpus (fleet shape F), consistent with the map's framing that no fleet repo uses a language rule today.
- **Lockfile-kind hygiene is out of scope here by design**: `config-inventory.md:245` notes that if a Bazel repo also builds via `rules_js`/`rules_ts`, its `package-lock.json`/`pnpm-lock.yaml` choice matching `packageManager` is `typescript-packaging.md`'s territory (rule `TS-PKG-13`) already — covered by that set, not re-derived here.
- **Zero dual-build-system evidence**: `config-inventory.md:319` — "Dual-build-system migration (Cargo/uv/pnpm alongside Bazel) — zero mentions; nothing in the fleet runs two build systems side by side today," which is why Decision D1's "no, not as a starting move" default carries no fleet counter-evidence to weigh against it.

## AI-agent angle

1. **WORKSPACE-era `npm_install`/`yarn_install` macros** (from the unmaintained `build_bazel_rules_nodejs`, not rules_js) show up in training data as if current. Check: `grep -rn "npm_install\|yarn_install" WORKSPACE*` on a Bzlmod-only (Bazel 8/9) repo — any hit is a red flag; those macros belong to a project the README itself calls "now unmaintained."
2. **Removed 2.x/3.x `npm_translate_lock` attributes** (`prod=`, `dev=`, `defs_bzl_filename=`, `link_workspace=`, `additional_file_contents=`, `root_package=`) appear in older tutorials and get carried forward. Check: `grep -n "prod\s*=\|dev\s*=\|defs_bzl_filename\|link_workspace\|additional_file_contents\|root_package" MODULE.bazel` near an `npm.npm_translate_lock(...)` call — any hit hard-errors on ≥3.0.0.
3. **Inventing a `bun_lock=` attribute** on `npm_translate_lock` because "it's basically npm/yarn" — it isn't defined anywhere in the ruleset. Check: Rule 8's grep against the vendored `npm_translate_lock.bzl` source; absence of `bun_lock` in the attr list is the confirmation, not a gap in the check.
4. **Relying only on the deprecated `verify_node_modules_ignored` attribute on Bazel 8+** because a training-era example used it. Check: Rule 12's grep for `ignore_directories` in `REPO.bazel` on any repo whose `.bazelversion` is ≥8.
5. **Assuming the ESM sandbox escape (`#362`) or the `BAZEL_BINDIR` core issue (`#15470`) were "surely fixed by now"** because they're old. Check: `gh issue view <n> -R <owner>/<repo> --json state -q .state` before repeating either claim — both are open as of 2026-09-05.
6. **Wiring a framework with opinionated output codegen (Next.js standalone, Astro, SvelteKit) straight into a plain `js_binary`**, assuming rules_js's bazel-out-as-cwd trick makes any Node tool "just work." Check: Rule 17's reading heuristic — grep the framework's own config for `output: "standalone"` or equivalent before wiring it, rather than discovering the tree-artifact symlink failure at build time.

## Contested / evolving

- **Does partial/incremental Bazelification of a JS monorepo pay off (M-K-15)?** pow.rs argues there's a real "0 to 100%" cliff — Bazel requires full buy-in across a dependency chain before any caching benefit shows, because it can't see builds outside its own sandbox. Aspect's own migration materials (now largely moved off the rules_js repo entirely — see Finding 12) and the broader corpus's staged-migration accounts for other languages describe incremental success instead. **Unresolved as of 2026-09-05** — this dive does not settle M-K-15; it is the sibling map's own [Contested](../bazel-topic-map/language-pain-points.md) note, cited here because Decision D1 leans on the same tension (a partial JS migration inside a broader polyglot Bazel adoption may behave differently than a JS-only one).
- **The `NpmPackageExtract` cache opt-out is explicitly not a settled default.** The ruleset's own maintainers, in the issue thread that produced the current guidance, declined to bake in a repo-specific default and instead shipped a bazelrc snippet as a documented experiment ([#2715](https://github.com/aspect-build/rules_js/issues/2715) → [#2880](https://github.com/aspect-build/rules_js/pull/2880)). Trend: toward "measure your own cache-hit economics," not toward a universal flip.
- **No migration guide currently ships (Finding 12) — this looks like a recent regression, not a stable state.** The docs were consolidated onto Aspect's hosted site around the 2.0/3.0 cleanup ([#2490](https://github.com/aspect-build/rules_js/pull/2490), [#2729](https://github.com/aspect-build/rules_js/pull/2729)), and the hosted destination itself now 404s. Worth re-checking on any future dive — this could be restored, or could reflect an active shift of that content further into Aspect's paid Workflows offering.
- **`packageExtensions` vs. auto-consuming the yarnpkg extensions database** — the feature request ([#1215](https://github.com/aspect-build/rules_js/issues/1215)) has sat open since 2023-08-14 with no maintainer commitment visible in the issue thread; treat manual `packageExtensions` entries as the durable practice, not a stopgap about to be automated.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_js README.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md) | Ruleset's own README, `main` branch, fetched raw | current, 2026-09-05 | Primary: states the design tension, the bazel-out-as-cwd tradeoff, and "Known issues" verbatim |
| [rules_js docs/pnpm.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/pnpm.md) | Official pnpm-integration doc | current, 2026-09-05 | Primary: hoisting, `packageExtensions`, lifecycle hooks, lockfile-attr semantics |
| [rules_js docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md) | Official troubleshooting doc | current, 2026-09-05 | Primary: the three-branch module-not-found diagnosis, npm-extract cache economics, all four coverage caveats |
| [rules_js docs/faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | Official FAQ | current, 2026-09-05 | Primary: the shared-`dist/`-folder layout constraint, editor/tsconfig guidance |
| [npm/private/npm_translate_lock.bzl](https://raw.githubusercontent.com/aspect-build/rules_js/main/npm/private/npm_translate_lock.bzl) | Ruleset source, attribute schema | current, 2026-09-05 | Primary: ground truth that only `pnpm_lock`/`npm_package_lock`/`yarn_lock` exist — settles the bun.lock question by direct inspection |
| [v3.0.0 release](https://github.com/aspect-build/rules_js/releases/tag/v3.0.0) | GitHub release notes | 2026-03-02 | Primary: confirms the Bazel6/WORKSPACE/pnpm<9 removal and every 3.0 breaking attribute change |
| [v3.4.1 release](https://github.com/aspect-build/rules_js/releases/tag/v3.4.1) | GitHub release notes | 2026-08-21 | Primary: confirms 3.4.1 is current |
| [v2.0.0 release](https://github.com/aspect-build/rules_js/releases/tag/v2.0.0) | GitHub release notes | 2024-08-15 | Primary: the version-floor history the brief asked to confirm |
| [pow.rs — "Bazel is incompatible with JavaScript"](https://pow.rs/blog/bazel-is-incompatible-with-javascript/) | Practitioner dissent blog, fetched and stripped to text | 2024-10-13, revised ~18 months later | Argued (the brief's named "sharpest dissent"): node_modules duplication, the `src/`-write sandbox constraint, the sunk-cost framing — corroborates Finding 11 independently |
| [rules_js #2715](https://github.com/aspect-build/rules_js/issues/2715) | GitHub issue + comments | filed 2026-02-03, closed | Primary/measured: origin of the npm-extract cache-negative guidance, with real timing numbers and the PR that shipped the opt-out doc |
| [rules_js #362](https://github.com/aspect-build/rules_js/issues/362) | GitHub issue | open since 2022-08-05 | Primary: the ESM sandbox-escape tracking issue, confirmed still open |
| [bazel #15470](https://github.com/bazelbuild/bazel/issues/15470) | GitHub issue (core Bazel) | open since 2022-05-11 | Primary: the BAZEL_BINDIR core-Bazel relief request, confirmed still open |
| [rules_js #1215](https://github.com/aspect-build/rules_js/issues/1215) | GitHub issue | open since 2023-08-14 | Primary: confirms rules_js does not auto-consume the yarnpkg extensions database |
| [bazelbuild/examples #382](https://github.com/bazelbuild/examples/issues/382) | GitHub issue | open since 2023-12-11 | Primary/measured: exact error text for Next.js `standalone` output failing under rules_js's sandbox |
| `docs/migrate.md` / `migrate_2.md` / `migrate_3.md` on `main`, and the `docs.aspect.build` → `aspect.build` → GitHub redirect chain for "rules_js migration" | Negative-result check (all 404), performed 2026-09-05 | 2026-09-05 | Primary (absence as evidence): confirms no migration guide currently ships, driving Decision D2 |
| [language-rulesets-canonical.md §15-16](../bazel-topic-map/language-rulesets-canonical.md) | Wave-1 scout, internal | 2026-09-05 | Secondary: independent reading of the same primary docs, used as a cross-check, not a source of new facts |
| [failure-corpus.md §10](../bazel-topic-map/failure-corpus.md) | Wave-1 scout, internal | 2026-09-05 | Secondary: corroborates the pnpm-requirement rationale from a different angle (migration guide + pnpm.md) |
| [language-pain-points.md §1,5,7 + Contested](../bazel-topic-map/language-pain-points.md) | Wave-1 scout, internal | 2026-09-05 | Secondary: corroborates the framework-output-layout trap (Next.js/Astro/SvelteKit) and frames the incremental-adoption disagreement |
| [bazel-audit/fleet-bazel-readiness.md](../bazel-audit/fleet-bazel-readiness.md) | Fleet audit, internal | 2026-09-05 | Primary (fleet ground truth): the 8-package npm/bun measurement and the bun.lock-gap finding this dive corroborates |
| [bazel-audit/config-inventory.md](../bazel-audit/config-inventory.md) | Fleet audit, internal | 2026-09-05 | Primary (fleet ground truth): confirms zero rules_js usage in `rules_ocx` and that lockfile-kind hygiene is `typescript-packaging`'s territory |

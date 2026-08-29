---
title: CI, Dependency-Management and Release Tooling for a Nine-Repo TypeScript Fleet
corpus: "CI, dependency-management, and release tooling for a small multi-repo TypeScript fleet (npm/pnpm/yarn/bun, Renovate/Dependabot, changesets/semantic-release/release-please, Turborepo/Nx, reusable workflows, caching, act/zizmor)"
agent: scout (CI-supply-chain)
model: claude-sonnet-5
date_researched: 2026-08-29
sources_count: 22
scope: |
  Covers the TOOLS that implement supply-chain and CI policy for a nine-repo
  TypeScript fleet: package managers, dependency-update bots, release
  automation, monorepo task runners, reusable-workflow mechanics, CI caching,
  and workflow auditing tools — with versions/dates read directly from each
  project's own docs/changelog as of 2026-08-29, cross-checked against the
  fleet's actual `.github/workflows/*.yml` and lockfiles under `/home/mherwig/dev`.
  Does NOT re-cover security POLICY (provenance rationale, ignore-scripts
  rationale, SHA-pinning rationale, cooldown rationale) — that is a prior
  scout's corpus; this one covers the mechanisms that implement it.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Package managers in 2026](#1-package-managers-in-2026)
   2. [Renovate vs Dependabot](#2-renovate-vs-dependabot)
   3. [Release tooling](#3-release-tooling)
   4. [Monorepo tooling](#4-monorepo-tooling)
   5. [Reusable workflows and composite actions](#5-reusable-workflows-and-composite-actions)
   6. [CI caching](#6-ci-caching)
   7. [act and zizmor](#7-act-and-zizmor)
3. [Tool verdicts](#tool-verdicts)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Candidate topics](#candidate-topics)
8. [Sources](#sources)

## Summary

- The fleet's measured CI drift is real and worse than "four Node versions": `ocx-catalog`/`grimoire-indexer` pin Node 24 (`grimoire-indexer` also matrices 22), `grimoire-vscode`/`vscode-ocx` pin Node 20, `creeptd-ng`'s npm-ecosystem jobs pin **no** `node-version` at all — five distinct states, not four.
- Action pinning is genuinely inconsistent fleet-wide: `ocx-catalog`, `grimoire-indexer`, `setup-ocx` are full-SHA-pinned (`actions/checkout@3d3c42e…  # v7.0.1`); `grimoire-vscode` uses `actions/setup-node@v7`; `vscode-ocx` uses `actions/setup-node@v6` on the *same action* — a real major-version disagreement; `creeptd-ng` floats `@v4`/`@v5` throughout.
- Two repos have zero CI: `fma` and `kate-middlechild` have no `.github/workflows/` at all — matches the brief's "local gates and no CI" observation exactly.
- `creeptd-ng` runs **two package managers in one repo**: pnpm 9 at the root (`pnpm-lock.yaml`, driven by `pnpm/action-setup@v4`) and npm inside `creeptd-ng/web` (`package-lock.json`) — undiscovered until this scout checked lockfiles directly.
- Dependency-bot coverage is fleet-wide inconsistent: Renovate only in `ocx-catalog`; Dependabot in `grimoire-vscode`, `vscode-ocx`, `setup-ocx`; **nothing** in `grimoire-indexer`, `fma`, `kate-middlechild`, `creeptd-ng`.
- npm 12.0.0 shipped 2026-07-08 and now defaults `allowScripts` off, `--allow-git` to `none`, `--allow-remote` to `none` — a breaking-by-default change every fleet repo on npm will hit on next `npm ci` in a clean environment ([GitHub changelog](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/), [npm CLI v12 changelog](https://docs.npmjs.com/cli/v12/using-npm/changelog)).
- pnpm 11.0 (2026-04-28) turns on `minimumReleaseAge: 1440` (1 day) by default, plus `blockExoticSubdeps`/`strictDepBuilds` true — pnpm now ships Renovate/Dependabot-style cooldown as a package-manager-level default, no bot required ([pnpm 11.0 release notes](https://pnpm.io/blog/releases/11.0)).
- Dependabot's own equivalent — a default 3-day cooldown on version-update PRs — shipped 2026-07-14, no config needed, security updates exempt ([GitHub changelog](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/)).
- Renovate's `minimumReleaseAge` has no built-in default (must be set); Renovate's own docs recommend **14 days** when automerging third-party deps, paired with `internalChecksFilter: "strict"` ([Renovate docs](https://docs.renovatebot.com/key-concepts/minimum-release-age/)).
- Corepack is no longer bundled with Node.js starting at Node 25.0.0 — it shipped bundled from 14.19.0 up to (not including) 25.0.0; on Node 25+ it must be `npm install -g corepack` ([nodejs/corepack README](https://github.com/nodejs/corepack)). Every fleet repo still floors below Node 25, so this is a near-term, not current, risk.
- Bun 1.4 shipped 2026-08-20 — nine days before this brief — and is a full **Zig→Rust rewrite** adding `Bun.WebView`, `Bun.Image`, cron, JSON5/JSONL support ([bun.com/blog](https://bun.com/blog)). The brief's "Bun 1.3" framing is now one minor behind current; `setup-ocx` and `kate-middlechild` both run `bun.lock` `lockfileVersion: 1` (the pre-1.4 format) and should be checked against 1.4 before bumping.
- Reusable GitHub Actions workflows (`uses: owner/repo/.github/workflows/x.yml@ref`, triggered via `on: workflow_call`) are the direct, native fix for the fleet's Node-version and action-pin drift — up to 10 levels of nesting, `secrets: inherit` supported ([GitHub Actions docs](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)). The fleet already has the org (`ocx-sh`) and already ships one composite action (`ocx-sh/setup-ocx`) that four of six CI'd repos already consume — the reusable-workflow pattern is a small extension of infrastructure that already exists.
- `actions/setup-node`'s built-in `cache: npm|yarn|pnpm` wraps `actions/cache` for you, hashing the lockfile automatically; it caches the package-manager's *download* cache, not `node_modules` — for a from-scratch `npm ci` this is close to free and strictly simpler than hand-rolled `actions/cache` (current major: v7, per the action's own README) ([actions/setup-node README](https://github.com/actions/setup-node)).
- zizmor is the de-facto GitHub Actions workflow static analyzer; PyPI lists **1.29.0** as latest stable (as of the page read) with a **1.30.0rc1** pre-release, and it emits SARIF for GitHub code-scanning integration ([PyPI: zizmor](https://pypi.org/project/zizmor/), [zizmor.sh](https://zizmor.sh/)). It directly audits the exact things this fleet already gets wrong by hand (unpinned `uses:`, floating tags) — this is a "adopt now" candidate, not a "watch."
- Dependabot has **no** cross-repo/org-wide config primitive — `dependabot.yml` is strictly per-repository ([dependabot-core README](https://github.com/dependabot/dependabot-core/blob/main/README.md)); Renovate does, via a shared preset repo referenced with `extends: ["local>org/renovate-config"]` ([Renovate config-presets docs](https://docs.renovatebot.com/config-presets/)) — this is the single clearest tool-choice lever for fixing fleet-wide drift from one place.
- For a fleet whose "libraries" are CLIs with `export {}` stub entry points, changesets' PR-based changelog workflow and semantic-release's fully-automated commit-driven workflow both assume a package worth semver-negotiating as a dependency; release-please's release-PR model fits a CLI-shaped repo better because it separates "prepare a release" from "publish it," leaving publish as a plain CI step the fleet already owns via `ocx-sh/setup-ocx` ([release-please README](https://github.com/googleapis/release-please)).
- Turborepo/Nx both solve *task-graph caching across many interdependent packages*; `kate-middlechild` is one Biome monorepo (43 files/8.6k LOC, 3 packages: core/tokens/web) with no typescript dependency at all — below the threshold every source consulted gives for either tool paying for itself (commonly cited at "10+ packages" for Nx, "3+ devs coordinating tasks" for Turborepo); plain `bun`/`pnpm` workspace scripts are enough.
- `act` has no stated current version on its own front page (71.7k GitHub stars, install via `make install` from source or an install script) and its own docs steer limitation questions to a separate user guide — treat it as a smoke-test convenience, not a CI-fidelity guarantee ([nektos/act README](https://github.com/nektos/act)).

## Findings

### 1. Package managers in 2026

**npm 12.0.0** — released **2026-07-08** ([npm CLI v12 changelog](https://docs.npmjs.com/cli/v12/using-npm/changelog)). Breaking-by-default changes most relevant to CI:
- `allowScripts` defaults to **off**: `preinstall`/`install`/`postinstall` no longer run, including the implicit `node-gyp rebuild` for a package with a bare `binding.gyp` and no script.
- `--allow-git` defaults to `none`: git dependencies (direct or transitive) are not resolved unless explicitly allowed.
- `--allow-remote` defaults to `none`: remote tarball URLs are not resolved unless explicitly allowed.
- `npm-shrinkwrap.json` is no longer read at all — rename to `package-lock.json`.
- Migration path: on npm ≥11.16.0 the new defaults are available as warnings first; to adopt, run `npm approve-scripts --allow-scripts-pending`, review, and commit the resulting allowlist in `package.json` ([GitHub changelog announcement](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/)).
- Fleet impact: six of nine repos use npm (`ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `fma`, `creeptd-ng/web`). None currently pin an npm major in CI (`actions/setup-node` installs whatever the runner image ships or `latest` if unspecified) — a runner image update to npm 12 will silently start skipping install scripts fleet-wide, breaking anything relying on a native build step, with no error unless CI explicitly checks it.

**pnpm 11.0** — released **2026-04-28** ([pnpm 11.0 release notes](https://pnpm.io/blog/releases/11.0)). Key defaults and format changes:
- `minimumReleaseAge` defaults to **1440** (minutes = 1 day): newly published versions are not resolvable until 1 day old.
- `blockExoticSubdeps` now defaults `true`; `strictDepBuilds` defaults `true`; `verifyDepsBeforeRun` changed to `install`.
- Store format moved from many JSON files to a single SQLite database at `$STORE/index.db`.
- pnpm itself is now pure ESM, requiring **Node.js 22+** to run pnpm.
- Configuration moved out of `.npmrc`: only auth/registry settings stay there; everything else (`hoistPattern`, `nodeLinker`, `shamefullyHoist`, `catalog`/`catalogs`, `minimumReleaseAge`) now lives in `pnpm-workspace.yaml` or the global `~/.config/pnpm/config.yaml`; as of pnpm 11.22.0 certain machine-level settings are explicitly rejected (with warnings) if placed in a project-level `pnpm-workspace.yaml` ([pnpm-workspace.yaml docs](https://pnpm.io/pnpm-workspace_yaml)).
- Fleet impact: `creeptd-ng` root already runs pnpm — via `pnpm/action-setup@v4` pinned to version `"9"` in `ci.yml`. pnpm 9 predates all of the above; the repo is two majors behind pnpm's current supply-chain defaults, and its config is presumably still `.npmrc`-shaped.

**Yarn 4.x** — the brief's "4.10" reference is stale; the latest release read directly is **4.18.0, dated 2026-07-29** ([endoflife.date/yarn](https://endoflife.date/yarn)). Could not establish 4.10's exact date from primary changelog (the in-repo `CHANGELOG.md` served an outdated/truncated snapshot). No fleet repo uses Yarn (verified: no `yarn.lock` in any of the nine repos checked).

**Bun 1.3 → 1.4** — Bun 1.3 GA'd **2025-10-10** ([bun.com/blog/bun-v1.3](https://bun.com/blog/bun-v1.3)), then received in-2026 patches (1.3.12 on 2026-04-09/10, 1.3.13 on 2026-04-20, 1.3.14 on 2026-05-13). **Bun 1.4 shipped 2026-08-20** — a full engine rewrite from Zig to Rust, plus `Bun.WebView` (headless browser automation), `Bun.Image`, `Bun.markdown`, JSON5/JSONL support, and built-in cron ([bun.com/blog](https://bun.com/blog)). As of this brief's date (2026-08-29), 1.4 is current, not 1.3 — worth correcting upstream. Fleet impact: `setup-ocx` (`engines.node >=24`, `bun.lock`) and `kate-middlechild` (`bun.lock`, no TypeScript dep) both carry `lockfileVersion: 1`, the pre-1.4 format; a Bun bump should be validated against 1.4's Rust rewrite before merging, given how large that engine change is.

**Corepack / `packageManager`** — Corepack shipped bundled with Node.js from **14.19.0 up to (not including) 25.0.0**; Node 25+ does not include it, and the recommended path there is `npm install -g corepack` ([nodejs/corepack README](https://github.com/nodejs/corepack)). No fleet repo currently floors at Node 25 (`ocx-catalog`/`grimoire-indexer` are the highest at Node ≥20.19/≥22.14 in `engines`, CI runs Node 24) — corepack unbundling is a forward risk, not a live break, but any Node-25 bump needs an explicit corepack install step added to CI at the same time, or `packageManager` pinning silently stops being enforced.

**Standardization verdict**: the fleet already has three package managers in active CI use (npm ×6, pnpm ×1 [root of `creeptd-ng`], bun ×2) plus a fourth lockfile format hiding inside `creeptd-ng/web` (npm, mismatched with its own repo's root). Consolidating onto one manager fleet-wide is not "does it matter" in the abstract — it matters concretely for `creeptd-ng`, which is inconsistent *with itself*. For the other eight repos, matching manager to constraint (Bun for the two Bun-shaped repos already using it for speed/native-TS; npm elsewhere, since npm is what's already there and npm 12's script-blocking now closes most of the safety gap pnpm/Yarn used to have over it) is lower-effort than a fleet-wide migration and gets the safety win npm 12 already ships.

### 2. Renovate vs Dependabot

Both tools now ship a cooldown/minimum-age mechanism, but the ownership model differs sharply:

- **Dependabot cooldown**: default **3 days**, effective **2026-07-14**, applies to version-update PRs across all supported ecosystems on github.com (GHES 3.23+); requires **zero configuration**; security-update PRs bypass it entirely ([GitHub changelog](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/)).
- **Renovate `minimumReleaseAge`**: no stated built-in default in the docs read; must be explicitly set, e.g. `"minimumReleaseAge": "14 days"`, and Renovate's own guidance pairs it with `"internalChecksFilter": "strict"` when automerging third-party dependencies, specifically to prevent a branch being created — let alone merged — before the age check passes ([Renovate minimum-release-age docs](https://docs.renovatebot.com/key-concepts/minimum-release-age/)). For npm specifically, Renovate implements this by passing `--before=<date>` to npm during lockfile regeneration, so the cooldown is enforced at resolution time, not just PR-open time.
- **Multi-repo fleet management**: this is the decisive difference. Dependabot's `dependabot.yml` is strictly per-repository with no inheritance mechanism ([dependabot-core README](https://github.com/dependabot/dependabot-core/blob/main/README.md)) — the fleet's three Dependabot repos already show this: `grimoire-vscode` and `setup-ocx` both hand-carry near-identical `npm`/`github-actions` blocks, and `vscode-ocx`'s file has silently drifted (it lacks `grimoire-vscode`'s `ignore:` block for the `@types/node`/`typescript` TS-7 peer-conflict problem, so it will open PRs `grimoire-vscode` deliberately suppresses). Renovate instead supports a shared preset repo — conventionally named `renovate-config` — referenced from every consuming repo as `"extends": ["local>ocx-sh/renovate-config"]`, with named non-default presets addressable as `local>ocx-sh/renovate-config:security`, and versionable via `local>ocx-sh/renovate-config#v1.0.0` ([Renovate config-presets docs](https://docs.renovatebot.com/config-presets/)). Renovate also auto-discovers an org-level `renovate-config` repo during onboarding of any new repo in that org.
- **Action pinning**: `ocx-catalog`'s existing `renovate.json` already demonstrates the fix for the fleet's SHA-pin drift in one `packageRules` entry — `{"matchManagers": ["github-actions"], "pinDigests": true}` — which is exactly Renovate auto-converting a floating action tag to a SHA-pinned one with a version comment on every PR. This is the one config block that, applied fleet-wide via a shared preset, ends the "SHA-strict in two repos, floating elsewhere, two repos disagreeing by a major" problem in a single PR per repo.
- **Grouping**: `ocx-catalog`'s renovate.json groups all npm minor/patch bumps into one `npm minor/patch` PR while carving out `vitepress`/`vue` (alpha-channel, version-locked to each other) for individual review — a pattern Dependabot's `groups:` block can also express (seen in `grimoire-vscode`'s `dev-dependencies` group by `dependency-type`), but only per-repo, never fleet-wide from one source.

**Verdict**: Renovate is the tool that "fixes" the fleet's inconsistency, specifically because of the shared-preset mechanism Dependabot structurally lacks — not because its cooldown default is better (Dependabot's is actually more conservative-by-default: 3 days with zero config vs. Renovate needing an explicit 14-day recommendation). The concrete migration is: stand up `ocx-sh/renovate-config` seeded from `ocx-catalog`'s existing `renovate.json` (already has `pinDigests`, grouping, `lockFileMaintenance: schedule:weekly`), add `"minimumReleaseAge": "3 days"` (matching Dependabot's new default rather than the docs' 14-day automerge-specific recommendation, since the fleet does not currently automerge), then replace each repo's `renovate.json`/`dependabot.yml` with a one-line `{"extends": ["local>ocx-sh/renovate-config"]}`.

### 3. Release tooling

- **changesets**: PR-based — contributors run `changeset add`/`npx @changesets/cli`, a maintainer runs `changeset version` to bump semver and update changelogs, then `changeset publish` releases. Its own docs describe the model as originally built for "bolt monorepos" and explicitly designed to handle bumping dependent packages when a dependency changes ([changesets intro doc](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) — the doc itself flags it may be stale and points to changesets.dev). It assumes packages that get *consumed* by version number.
- **semantic-release**: fully commit-driven — Conventional Commits determine the next version, changelog, and publish, with no human version decision. Requires commit-message discipline across every contributor (and every AI agent committing to the repo) to be reliable.
- **release-please**: maintains a standing "Release PR" that accumulates changes and stays up to date as commits land; on merge it tags and cuts a GitHub Release. Its own README is explicit that it "does not handle publication to package managers" — publishing is a separate downstream CI step ([release-please README](https://github.com/googleapis/release-please)). It supports single-package Node repos directly via a `node` release-type, and multi-artifact repos via its manifest config.
- **`npm publish --provenance`**: requires npm CLI ≥9.5.0, runs on a GitHub-hosted runner, needs `permissions: { contents: read, id-token: write }` for OIDC, and produces a provenance attestation plus a publish attestation logged to a public transparency ledger; it can also be set via `NPM_CONFIG_PROVENANCE=true`, `.npmrc`, or `publishConfig.provenance` in `package.json` ([npm provenance docs](https://docs.npmjs.com/generating-provenance-statements/)). npm Trusted Publishing (OIDC-based, no long-lived token) is now GA and, when used, generates provenance automatically without the explicit flag ([GitHub changelog: npm trusted publishing GA](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)).

**Concrete answer for this fleet**: none of the nine repos are libraries in the sense any of these three tools optimize for — `ocx-catalog` and `grimoire-indexer` are explicitly noted (project context) as CLIs with `export {}` stub entry points, and `setup-ocx`/the two VS Code extensions/`fma`/`creeptd-ng/web` are not npm-consumed packages at all. semantic-release and changesets both spend their complexity budget on *semver negotiation between consuming packages* — a problem this fleet does not have, because nothing downstream imports these as libraries. **release-please fits**, specifically because it separates "decide there is a release" (Conventional-Commit-driven Release PR) from "publish it" (a plain CI job), and the fleet already has that CI job pattern in every `release.yml` it currently hand-maintains (`ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `setup-ocx` all already have a `release.yml`). Adopting release-please replaces the manual "bump `package.json`, write CHANGELOG, tag" step with an automated Release PR feeding the *existing* publish job — it does not require adding a new publish mechanism, and it does not assume anything is a library. Where OIDC provenance is not yet wired (worth checking per-repo — not verified against every fleet `release.yml` in this pass), pairing release-please's tag with `npm publish --provenance` (or Trusted Publishing where the target is npm) is the concrete two-tool combination.

### 4. Monorepo tooling

- **Turborepo**: fetch of `turborepo.com/docs` redirected to `turborepo.dev/docs` (no content captured in this pass — could not establish primary-source specifics beyond what secondary sources describe: task-graph caching with local+remote cache, minimal config surface, described across multiple secondary sources as "the most approachable" of the two, single job: fast task execution with caching).
- **Nx**: adds computation caching plus `nx affected` (only re-run what a diff touches), code generators, and tag-based module-boundary enforcement — a materially larger tool than Turborepo, justified by coordination overhead at package count, not line count.
- **pnpm workspaces alone**: links packages and runs scripts across them; no caching, no affected-detection, no generators.
- Secondary-source consensus (not independently re-verified against Nx/Turborepo's own docs in this pass — could not establish as of 2026-08-29 from primary sources given the Turborepo docs redirect): Nx starts paying for itself around **10+ packages** or when a dependency graph genuinely needs enforcement; Turborepo starts paying for itself once a team is coordinating **3+ developers'** tasks across packages with re-run costs worth caching.

**Fleet answer**: `kate-middlechild` is the one repo shaped like a monorepo in this fleet — 43 files/8.6k LOC across `core`/`tokens`/`web`, Biome + lefthook + Playwright, **no TypeScript dependency at all** (per project context). Three packages, no CI at all currently (confirmed: no `.github/workflows/` directory), and no measured task-runtime problem to cache against. This is below every threshold found for either Turborepo or Nx. **A plain "no" is the answer for this fleet**: `bun run --filter` or root-level scripts across the three packages via whatever workspace field is already in `kate-middlechild`'s `package.json`/`bun-workspaces` config is sufficient; neither tool's complexity is earned at 3 packages/8.6k LOC with zero measured cache-miss pain.

### 5. Reusable workflows and composite actions

GitHub Actions reusable workflows are a *job-level* `uses:`, distinct from a composite action's *step-level* `uses:`:

```yaml
# in the reusable workflow file, e.g. ocx-sh/.github/.github/workflows/ts-ci.yml
on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
    secrets:
      NPM_TOKEN:
        required: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

```yaml
# in each consuming repo's own workflow
jobs:
  ci:
    uses: ocx-sh/.github/.github/workflows/ts-ci.yml@<sha-or-tag>
    with:
      node-version: "24"
    secrets: inherit
```

Up to **10 levels** of workflow connection are permitted (top-level caller plus 9 nested reusable workflows), circular references are rejected, and `secrets: inherit` passes every caller secret through without enumerating them ([GitHub Actions reusable-workflows docs](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)).

**The fleet already has the exact infrastructure this needs, half-built**: `ocx-sh/setup-ocx` is a composite-adjacent JS action (`using: node24` per its own `action.yml`) already consumed by `ocx-catalog`'s six-job CI matrix, `grimoire-indexer`, `grimoire-vscode`(no — verified: `grimoire-vscode`/`vscode-ocx` do **not** currently call `ocx-sh/setup-ocx`, only `ocx-catalog`/`grimoire-indexer` do). What's missing is the *workflow*-level equivalent: a single `ts-ci.yml` reusable workflow in the `ocx-sh` org (or a dedicated `.github` repo) that pins Node version, action SHAs, and the `actions/setup-node` cache mode once, called with `with: node-version:` from every TS repo's `ci.yml`. This directly eliminates the four/five-way Node-version drift and the SHA-vs-floating-tag drift in one file, edited in one place, instead of six.

### 6. CI caching

`actions/setup-node`'s built-in `cache:` input (current major **v7** per the action's own README) wraps `actions/cache` internally but needs far less configuration: set `cache: npm` (or `yarn`/`pnpm`, pnpm support since setup-node **v6.10+**) and it hashes `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml` (or a repo-specified `cache-dependency-path`) into the cache key automatically. It caches the package manager's **global download cache**, not `node_modules` — a fresh `npm ci` still runs, but it resolves from the local cache instead of re-downloading every tarball ([actions/setup-node README](https://github.com/actions/setup-node)). Using `actions/cache` directly only earns its extra YAML when caching something `setup-node` doesn't know about — build output, a linter's own cache directory, a Playwright browser download — where a hand-written key (typically the OS + lockfile hash + tool-version) is genuinely needed. For plain `npm ci`/`pnpm install`/`bun install` on every fleet CI job, `setup-node`'s (or `pnpm/action-setup`'s own analogous input) built-in cache is strictly the smaller, sufficient mechanism; `creeptd-ng`'s `ci.yml` hand-rolls `actions/cache` for the pnpm store across five separate jobs with an identical `pnpm-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}` key — this is exactly the "adds a step, saves nothing extra" case the built-in cache would replace with one line per job.

### 7. act and zizmor

- **zizmor**: PyPI lists the latest stable release as **1.29.0**, with **1.30.0rc1** as a pre-release, both read directly from the package's own PyPI page ([PyPI: zizmor](https://pypi.org/project/zizmor/)). It's a Rust-based static analyzer for GitHub Actions/Dependabot/pre-commit YAML, run offline by default, that flags template-injection strings, hardcoded credentials, overscoped tokens, unpinned third-party actions, impostor commits, and risky triggers; it emits SARIF for direct GitHub code-scanning PR annotations, and offers "standard"/"pedantic"/"auditor" sensitivity personas ([zizmor.sh](https://zizmor.sh/)). Trail of Bits' own May 2026 writeup on hardening zizmor's YAML-anchor support frames it as the de-facto standard GitHub Actions auditor by mid-2026, in production use at CPython, curl, PyPI, Rust, Sigstore, Apache, Mozilla, and Google projects ([Trail of Bits blog](https://blog.trailofbits.com/2026/05/22/we-hardened-zizmors-github-actions-static-analyzer/)) — could not independently re-verify the specific "500+ trophy-case" / "38 audit rules" figures against a primary zizmor page in this pass (only surfaced via search snippet, not a fetched page).
- **act**: `nektos/act`'s own README does not state a current version number on its front page; installs via `make install` from source (Go ≥1.20) or a shell install script; 71.7k GitHub stars at time of read. It reads `.github/workflows/`, pulls/builds Docker images per job, and runs containers with environment/filesystem "configured to match what GitHub provides" — the README itself defers limitation and fidelity-gap details to a separate site (`nektosact.com`) rather than stating them inline ([nektos/act README](https://github.com/nektos/act)). Treat it as useful for catching YAML syntax errors and step-ordering mistakes before pushing, not as a substitute for the real Ubuntu/Windows/macOS-hosted runner images — Docker-based execution cannot faithfully reproduce a GitHub-hosted runner's exact toolchain versions.

**Verdict for this fleet**: zizmor is a clear adopt — it is a single `pip install zizmor` / `uvx zizmor` step or a dedicated `zizmor-action`, and it directly targets the fleet's own measured problems (unpinned `uses:` in `grimoire-vscode`/`vscode-ocx`/`creeptd-ng`, and would flag `vscode-ocx`'s `setup-node@v6` vs. `grimoire-vscode`'s `@v7` divergence as an unpinned-action finding in both). `act` is a "watch/optional" for local iteration convenience, not a fleet-wide gate — its own maintainers don't claim CI-fidelity parity.

## Tool verdicts

| tool | what it does | version + date | maturity | adopt / keep / drop / watch FOR THIS FLEET | why, in one line | what it replaces |
|---|---|---|---|---|---|---|
| npm | package manager / registry client | 12.0.0, 2026-07-08 | mature, breaking change just landed | keep | already the fleet default in 6/9 repos; npm 12's script-blocking closes most of the safety gap that used to favor pnpm | nothing — already primary |
| pnpm | package manager, workspaces | 11.0, 2026-04-28 | mature | keep (creeptd-ng root only), bump | `creeptd-ng` root pins pnpm 9 via `pnpm/action-setup@v4`, two majors behind pnpm's own supply-chain defaults | — |
| Yarn 4.x | package manager | 4.18.0, 2026-07-29 (4.10 unverifiable) | mature | drop from consideration | zero fleet adoption; no reason to introduce a fourth manager | — |
| Bun | JS runtime + package manager | 1.4, 2026-08-20 (Zig→Rust rewrite) | active, just had a major engine rewrite | keep (2 repos), validate before bump | `setup-ocx`/`kate-middlechild` both on pre-1.4 `bun.lock` format; the 1.4 rewrite is large enough to test explicitly before merging | — |
| corepack | package-manager version pinning via `packageManager` field | unbundled from Node ≥25.0.0 | stable, distribution model just changed | watch | fleet floors below Node 25 today; becomes a required explicit install step on any Node-25 bump | — |
| Renovate | dependency-update bot | config read via docs, org already runs it in `ocx-catalog` | mature | adopt fleet-wide | only tool with a shared-preset mechanism (`extends: local>org/renovate-config`) — the actual fix for cross-repo drift | Dependabot in the 3 repos that have it, nothing in the 5 that don't |
| Dependabot | dependency-update bot | 3-day default cooldown, 2026-07-14 | mature | drop in favor of Renovate, fleet-wide | strictly per-repo config, already visibly drifted between `grimoire-vscode` and `vscode-ocx` | superseded by Renovate above |
| changesets | PR-based versioning/changelog | — | mature | drop for this fleet | optimizes for consumer-facing semver negotiation the fleet's CLIs don't have | — |
| semantic-release | commit-driven fully automated release | — | mature | drop for this fleet | requires strict Conventional-Commit discipline fleet-wide including from AI agents; no clear payoff over release-please here | — |
| release-please | Release-PR based release automation | — | mature, Google-maintained | adopt | fits CLI-shaped repos: separates "decide a release" from "publish it," slots onto the fleet's existing hand-written `release.yml` publish jobs | the fleet's manual "bump version, write CHANGELOG, tag" step in each `release.yml` |
| `npm publish --provenance` / Trusted Publishing | supply-chain attestation on publish | OIDC GA 2025-07-31 | mature | adopt wherever npm-publishing | one `permissions:` block + one flag (or none, under Trusted Publishing); pairs directly with release-please's tag step | long-lived npm tokens in CI secrets, if any remain |
| Turborepo | monorepo task-graph caching | docs fetch redirected, not independently re-verified | mature | drop for this fleet | `kate-middlechild` (3 packages, 8.6k LOC) is below every threshold found for it earning its complexity | — |
| Nx | monorepo caching + affected + generators + boundaries | — | mature | drop for this fleet | same reasoning as Turborepo, more complexity for a smaller repo | — |
| pnpm/bun workspaces alone | package linking + script running across packages | — | mature | keep | sufficient for `kate-middlechild`'s 3-package shape with no CI even present yet | — |
| GitHub Actions reusable workflows | one `workflow_call` definition, called by `uses:` from N repos | up to 10 levels of nesting | mature, native GHA feature | adopt | the direct, native fix for the fleet's Node-version and action-pin drift; extends infrastructure (`ocx-sh` org, `setup-ocx`) that already exists | 6 independently hand-maintained `ci.yml` Node/action-pin blocks |
| `actions/setup-node` cache | wraps `actions/cache` for npm/yarn/pnpm download cache | v7 current per README; pnpm support since v6.10+ | mature | adopt / already partial | one line (`cache: npm`) replaces `creeptd-ng`'s 5x hand-rolled `actions/cache` block for the identical purpose | `creeptd-ng`'s repeated manual `actions/cache` steps |
| zizmor | GitHub Actions/Dependabot/pre-commit static analyzer | 1.29.0 stable / 1.30.0rc1 (PyPI) | mature, de-facto standard by mid-2026 | adopt | directly flags the fleet's own measured problems: unpinned `uses:`, action-version divergence, floating tags | ad hoc manual workflow review |
| `act` | local Docker-based GitHub Actions runner | version not stated on own README | mature, widely used | watch / optional | useful for pre-push smoke-testing workflow YAML; its own docs don't claim runner-image fidelity, so it's not a CI-parity substitute | nothing — supplements, doesn't replace, real CI |

## Normative guidance candidates

1. **Every fleet repo's `ci.yml` must call a single shared reusable workflow for its Node/TypeScript setup, not hand-roll `actions/checkout` + `actions/setup-node`.** Rationale: this is the direct, native mechanism that ends Node-version and action-pin drift at the source, in one file. Verify: `grep -L "uses: ocx-sh/.*/.github/workflows/" */.github/workflows/ci.yml` should return nothing once migrated.
2. **Every third-party `uses:` in every workflow file must be pinned to a full commit SHA with a version comment, no exceptions for "internal" org actions.** Rationale: this is already the fleet's own stated invariant in `ocx-catalog`'s `renovate.json` comment; `grimoire-vscode`/`vscode-ocx`/`creeptd-ng` violate it today. Verify: `zizmor .github/workflows/` reports zero `unpinned-uses` findings, or `grep -RE "uses: [a-zA-Z0-9./_-]+@v[0-9]" .github/workflows/` returns nothing (a floating tag, not a SHA).
3. **Dependency-bot configuration must live in one shared Renovate preset repo, referenced by every fleet repo as `{"extends": ["local>ocx-sh/renovate-config"]}`, never a hand-authored per-repo `renovate.json`/`dependabot.yml`.** Rationale: Dependabot has no cross-repo config primitive; per-repo Renovate configs will drift exactly the way `grimoire-vscode` and `vscode-ocx`'s `dependabot.yml` already have. Verify: every repo's `renovate.json` is a one-line `extends`; no repo carries a `dependabot.yml`.
4. **Set `minimumReleaseAge` (Renovate) or rely on Dependabot's built-in cooldown — never zero — on every fleet repo with a dependency bot.** Rationale: both npm (via Renovate `--before`) and pnpm 11 already default to enforcing this at the package-manager level; a bot without it is behind the ecosystem default. Verify: the shared Renovate preset's `minimumReleaseAge` key is present and non-zero; for pnpm repos, `pnpm config get minimumReleaseAge` returns ≥1440.
5. **`npm ci`/`npm install` steps in CI must not silently rely on install scripts running.** Rationale: npm 12.0.0 (2026-07-08) blocks install/postinstall scripts by default; any native-module or codegen step in a fleet repo that depends on them will start failing or silently no-op the moment a runner image ships npm 12. Verify: `npm pkg get dependencies` cross-checked against any package known to need `postinstall` (e.g. anything with `binding.gyp`), and confirm the repo has run `npm approve-scripts` and committed the resulting allowlist if any script is actually needed.
6. **A single package manager per repository, no exceptions.** Rationale: `creeptd-ng` currently runs pnpm at root and npm inside `web/`, which is two lockfiles, two caching strategies, and two sets of supply-chain defaults for reviewers to reason about. Verify: exactly one of `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`/`bun.lock` exists anywhere under the repo root (excluding `node_modules`).
7. **Monorepo task-graph tooling (Turborepo/Nx) is not added to `kate-middlechild` (or any fleet repo) without a measured, stated cache-miss cost first.** Rationale: no source consulted gives either tool a payoff below roughly 10 packages / multi-developer task-coordination pain; the fleet's one monorepo has 3 packages and no CI to measure against yet. Verify: before adding either dependency, the PR states the measured wall-clock cost being solved (a CI log excerpt), not just "monorepos usually want this."
8. **Release automation for CLI-shaped repos (the fleet's actual shape) uses release-please's Release-PR model feeding the repo's existing publish job, not changesets or semantic-release.** Rationale: changesets/semantic-release both spend complexity on consumer-facing semver negotiation this fleet's stub-export CLIs don't need. Verify: `release-please-config.json`/`.release-please-manifest.json` present, and the repo's `release.yml` publish job is unchanged except for triggering off the release-please tag.
9. **`actions/setup-node`'s built-in `cache:` input replaces any hand-rolled `actions/cache` step whose only purpose is the package manager's download cache.** Rationale: it's strictly less YAML for the identical effect; `creeptd-ng` currently repeats the pattern five times by hand. Verify: `grep -c "uses: actions/cache" .github/workflows/*.yml` is zero wherever `cache: npm|pnpm|yarn` is already set on the same job's `setup-node`/`pnpm/action-setup` step.
10. **`zizmor` runs as a CI gate on every workflow-file change, fleet-wide, emitting SARIF to code scanning.** Rationale: it catches exactly the class of defect this scout found by hand (unpinned actions, major-version divergence on the same action) automatically and continuously. Verify: a `.github/workflows/*.yml` diff in a PR triggers a `zizmor` job, and that job's SARIF output appears in the PR's code-scanning annotations.

## AI-agent angle

- **Recommending Yarn or npm-shrinkwrap patterns as current-best-practice**: an LLM trained before mid-2026 will reach for Yarn PnP or `npm-shrinkwrap.json` guidance that npm 12.0.0 (2026-07-08) has since made partly moot (`npm-shrinkwrap.json` is no longer read at all). Mechanical check: `grep -r npm-shrinkwrap` in any generated CI or docs — if it appears anywhere except a migration note, it's stale advice.
- **Suggesting `npm install` (not `npm ci`) in CI, or omitting `permissions:`/OIDC blocks around publish**: models tend to reach for the simplest historically-common pattern (a long-lived `NPM_TOKEN` secret) over Trusted Publishing/`--provenance`, because the OIDC pattern is newer than most training data's dominant examples. Mechanical check: `grep -r "NPM_TOKEN" .github/workflows/` — a hit alongside a `publish` step, with no `permissions: id-token: write` nearby, is the tell.
- **Recommending Dependabot's `groups:` block as a fleet-wide dedup mechanism**: an agent asked to "reduce fleet drift" may reach for Dependabot grouping (which it knows well) without surfacing that grouping is still per-repo — it does not solve the actual cross-repo config-drift problem the way Renovate's shared preset does. Mechanical check: ask "does this config live in one file consumed by every repo, or is it copy-pasted into N files?" — if N files, it isn't the fix, regardless of how good the grouping inside each file is.
- **Treating `act` output as equivalent to a real CI pass**: an agent may report "I ran it with `act` and it passed" as proof a workflow is correct; `act`'s own docs don't claim runner-image parity, and Docker-based execution differs from the actual `ubuntu-latest`/`macos-latest`/`windows-latest` images in installed toolchain versions. Mechanical check: a claim of "verified via act" should never substitute for a required real CI run before merge.
- **Suggesting Turborepo/Nx by default whenever a repo has more than one `package.json`**: pattern-matching "monorepo" to "needs a task runner" is a common LLM reflex; this brief's own fleet check found the opposite is true at `kate-middlechild`'s scale. Mechanical check: before either dependency is added, require a stated package count and a measured (not projected) CI wall-clock number in the PR description.
- **Citing "Bun 1.3" or "pnpm 10" as current** from memory: both are now one+ major behind (Bun 1.4 shipped 2026-08-20; pnpm 11.0 shipped 2026-04-28). Mechanical check: `bun --version`/`pnpm --version` output compared against the version actually referenced in generated advice or config comments — a mismatch means the advice predates a bump.

## Contested / evolving

- **Renovate vs. Dependabot as "the" fleet-wide answer**: genuinely trending toward Renovate for exactly the shared-preset reason found here, but this is a fast-moving area — Dependabot's cooldown default only shipped 2026-07-14, closing part of the gap that used to favor Renovate on that specific axis. As of 2026-08-29, the deciding factor remains cross-repo config sharing, which Dependabot still structurally lacks.
- **npm 12's script-blocking-by-default**: this landed 2026-07-08, seven weeks before this brief, and ecosystem-wide tooling (build steps relying on native postinstall) is still adjusting — expect friction reports to keep surfacing through Q4 2026 as more projects hit it on a clean CI runner image bump, not as a deliberate upgrade.
- **Bun's Zig→Rust rewrite (1.4, 2026-08-20)**: nine days old as of this brief. Too new to have a settled verdict on stability/regression risk for a fleet already depending on Bun in two repos — worth an explicit hold-and-watch rather than an immediate bump.
- **pnpm's move of configuration out of `.npmrc` into `pnpm-workspace.yaml`**: a real breaking reorganization as of pnpm 11.0 (2026-04-28), still being absorbed by tooling and guides written against the older `.npmrc`-centric model; `creeptd-ng`'s pnpm 9 config predates this entirely.
- **Corepack's unbundling from Node ≥25**: settled as a TSC decision, but its practical impact is still ahead of this fleet (no repo floors at Node 25 yet) — worth tracking as a "when we bump to Node 25" checklist item rather than an active concern today.

## Candidate topics

| topic | why it matters | source | priority for this fleet | volatility (12mo) |
|---|---|---|---|---|
| Does npm 12's script-blocking break any fleet repo's native/codegen build step? | Silent breakage risk on next runner-image bump, zero current CI signal for it | fleet CI files + npm 12 changelog | high | low (already shipped, stable going forward) |
| Should `creeptd-ng` collapse to one package manager (pnpm or npm) fleet-repo-internally? | Only repo running two package managers in one tree | direct repo inspection | high | low |
| What is the concrete Renovate shared-preset config that replaces all 4 existing bot configs + 5 missing ones? | The single highest-leverage fix identified in this brief | Renovate docs + fleet `renovate.json`/`dependabot.yml` | high | med (Renovate preset syntax evolves) |
| What does the fleet's first reusable-workflow file look like, concretely, for the 6 CI'd TS repos? | Direct fix for measured Node-version/action-pin drift | GitHub Actions docs + fleet ci.yml diffs | high | low (native GHA feature, stable) |
| Is `zizmor` worth gating on for this fleet's existing floating-tag violations, and at what persona (standard/pedantic/auditor)? | Concrete, cheap, catches exactly the fleet's measured problem | zizmor.sh + fleet workflow files | high | low |
| Does `fma` or `kate-middlechild` need CI at all, or is "local gates only" a deliberate, defensible choice given repo size? | Two repos with zero CI — brief flags this as a gap, but gap-vs-deliberate needs a call | fleet inspection | high | low |
| What CI checks should the shared reusable workflow actually run (lint/typecheck/test/build) given the fleet's five different toolchains (VitePress, Astro/Preact, esbuild+VS Code, Bun, Vite+React, Vue+Playwright)? | A single reusable workflow across 6 heterogeneous repos needs an input surface that fits all of them | fleet package.json scripts | high | med |
| Is release-please's manifest mode (multi-artifact) needed for any single fleet repo, or is single-package `node` release-type sufficient everywhere? | Determines config shape per repo | release-please README + fleet repo shapes | med | low |
| Does adopting Trusted Publishing (OIDC) remove any long-lived npm tokens currently stored as GitHub secrets in this org? | Direct supply-chain hardening, concrete and checkable | npm trusted-publishers docs + fleet secrets (not independently auditable from this pass) | med | low (GA, stable) |
| Should `setup-ocx`/`kate-middlechild` hold at Bun 1.3.x or validate against 1.4 before bumping? | 1.4 is a 9-day-old full engine rewrite | bun.com/blog + fleet bun.lock | med | high (very fresh release) |
| What CI job should validate that `packageManager`/corepack pinning still works once any repo bumps to Node 25? | Corepack unbundling is a forward landmine with no current trigger | nodejs/corepack README + fleet `engines` fields | low (no repo at Node 25 yet) | med (will become high once a bump happens) |
| Does the fleet's `ocx-sh/setup-ocx` composite action itself need a zizmor pass, given it's consumed by 4+ repos? | A shared action's own workflow-security posture propagates to every consumer | zizmor.sh + setup-ocx repo | med | low |
| Is `act` worth standardizing as a pre-push local check across the fleet, given its stated fidelity gap? | Convenience vs. false confidence trade-off | nektos/act README | low | low |
| Does Renovate's `pinDigests: true` (already in `ocx-catalog`) need `packageRules` scoping to avoid pinning *internal* org actions to a SHA that then can't float with an internal release cadence? | A real edge case once the shared preset pins `ocx-sh/setup-ocx` itself | Renovate docs + fleet setup-ocx versioning pattern | med | med |
| What is Turborepo's own stated remote-cache setup complexity, independently verified (not re-verified in this pass due to a docs redirect)? | This brief's Turborepo verdict rests partly on secondary sources | turborepo.dev/docs (unread in this pass) | low (verdict is "drop" regardless) | low |
| Does the fleet want a single `.github`-repo home for both the Renovate preset and the reusable CI workflow, or should they live separately? | Structural decision that shapes every future fleet repo's onboarding | GitHub reusable-workflow + Renovate preset docs | med | low |
| Should Dependabot be fully retired fleet-wide once Renovate's shared preset lands, or kept as a redundant second signal? | Avoids two bots opening competing PRs against the same dependency | Renovate/Dependabot docs | med | low |
| What does `grimoire-vscode`'s suppressed `@types/node`/`typescript` TS-7 peer-conflict `ignore:` block become once TS 7.1 ships a stable programmatic API (per Wave 1 finding)? | Directly time-bound: the ignore rule exists only because of a currently-true TS-7 limitation | fleet dependabot.yml + Wave 1 TS findings | med | high (TS 7.1 timeline is the trigger) |

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| [github.blog/changelog: npm v12 breaking changes](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/) | GitHub official changelog | 2026-06-09 | Primary announcement of npm 12's script/git/remote defaults and migration command |
| [docs.npmjs.com: npm CLI v12 changelog](https://docs.npmjs.com/cli/v12/using-npm/changelog) | npm's own CLI changelog | read 2026-08-29, describes 12.0.0 (2026-07-08) | Confirms exact GA date and full breaking-change list from npm itself |
| [docs.npmjs.com: generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/) | npm official docs | read 2026-08-29 | Exact `--provenance` command, permissions block, npm version floor |
| [github.blog/changelog: npm trusted publishing GA](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) | GitHub official changelog | 2025-07-31 | Confirms OIDC Trusted Publishing is GA, not experimental |
| [pnpm.io/blog/releases/11.0](https://pnpm.io/blog/releases/11.0) | pnpm's own release blog | 2026-04-28 | Primary source for `minimumReleaseAge: 1440` default and pnpm 11's other supply-chain defaults |
| [pnpm.io/pnpm-workspace_yaml](https://pnpm.io/pnpm-workspace_yaml) | pnpm official docs | read 2026-08-29 | Confirms the `.npmrc` → `pnpm-workspace.yaml` config migration in pnpm 11 |
| [github.com/nodejs/corepack](https://github.com/nodejs/corepack) | corepack's own README | read 2026-08-29 | Exact bundling range (14.19.0 up to, not including, 25.0.0) and post-unbundling install path |
| [bun.com/blog/bun-v1.3](https://bun.com/blog/bun-v1.3) | Bun's own release blog | 2025-10-10 | GA date and headline features for Bun 1.3 |
| [bun.com/blog](https://bun.com/blog) | Bun's blog listing | read 2026-08-29, latest post 2026-08-20 | Establishes Bun 1.4 (Zig→Rust rewrite) as current, correcting the brief's "1.3" framing |
| [endoflife.date/yarn](https://endoflife.date/yarn) | third-party version/EOL tracker | read 2026-08-29, latest 4.18.0 (2026-07-29) | Best available dated version table after Yarn's own changelog page returned a stale/incomplete snapshot |
| [docs.renovatebot.com: minimum release age](https://docs.renovatebot.com/key-concepts/minimum-release-age/) | Renovate official docs | read 2026-08-29 | `minimumReleaseAge` config syntax, `--before` npm mechanism, 14-day automerge recommendation |
| [docs.renovatebot.com: config presets](https://docs.renovatebot.com/config-presets/) | Renovate official docs | read 2026-08-29 | Exact `extends: local>org/repo` syntax for org-wide shared config — the decisive Renovate-vs-Dependabot fact |
| [github.blog/changelog: Dependabot default cooldown](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/) | GitHub official changelog | 2026-07-14 | Primary source for Dependabot's new 3-day zero-config cooldown default |
| [github.com/dependabot/dependabot-core README](https://github.com/dependabot/dependabot-core/blob/main/README.md) | Dependabot's own repo README | read 2026-08-29 | Confirms per-repo-only config model, no org-wide inheritance |
| [docs.github.com: reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows) | GitHub official Actions docs | read 2026-08-29 | Exact `uses:`/`workflow_call` syntax, secrets passing, 10-level nesting limit |
| [github.com/actions/setup-node README](https://github.com/actions/setup-node) | actions/setup-node's own README | read 2026-08-29 | Cache mechanism explanation, npm/yarn/pnpm support, current major (v7) |
| [zizmor.sh](https://zizmor.sh/) | zizmor's own project site | read 2026-08-29 | What it audits, SARIF/code-scanning integration, persona levels |
| [pypi.org/project/zizmor](https://pypi.org/project/zizmor/) | zizmor's PyPI package page | read 2026-08-29, latest 1.29.0 (1.30.0rc1 pre-release) | Authoritative current version number |
| [blog.trailofbits.com: hardening zizmor](https://blog.trailofbits.com/2026/05/22/we-hardened-zizmors-github-actions-static-analyzer/) | Trail of Bits engineering blog | 2026-05-22 | Independent confirmation of zizmor's de-facto-standard status and adoption by major OSS orgs |
| [github.com/googleapis/release-please README](https://github.com/googleapis/release-please) | release-please's own repo README | read 2026-08-29 | Confirms Release-PR model, explicit non-publishing scope, `node` release-type support |
| [github.com/changesets/changesets: intro doc](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) | changesets' own repo docs | read 2026-08-29 (doc flags itself as possibly stale) | Confirms the PR-based add/version/publish workflow and monorepo-first design intent |
| [github.com/nektos/act README](https://github.com/nektos/act) | act's own repo README | read 2026-08-29 | Install method, execution model, and the notable absence of a stated fidelity-gap disclosure |

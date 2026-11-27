---
title: Lockfile detection and package-manager pin, delta 2026-08-29 to 2026-11-27
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 14
---

# Lockfiles and the package-manager pin: delta

This is a delta update. Baseline: 2026-08-29, from typescript-topic-map/ci-supply-chain-tooling.md and typescript-tooling-landscape.md. Claims at risk are all in rules/typescript-packaging.md.

## Baseline correction

The baseline rated pnpm 11.0 as current. pnpm 12.0.0 was released on 2026-08-26, three days before the window opened (source: https://github.com/pnpm/pnpm/releases/tag/v12.0.0; the page shows day and month only, the year comes from the page footer). By 2026-11-27 pnpm 12.24.0 (2026-11-26) is current, and the 11.x line is still patched (11.29.0 on 2026-11-22). The pnpm 12 release notes were read in full for the questions below. The pnpm 12.0 changes are reported here because they sit on the same pair of claims, even though the release date precedes the window.

## Verdicts per claim

### 1. Frontmatter globs and the TS-PKG-13 lockfile list

| Item | Verdict | Evidence |
|---|---|---|
| `**/pnpm-lock.yaml` | unchanged | pnpm 12.19.0 added an experimental `lockfile.format: v13` setting. The file is still named `pnpm-lock.yaml`; it is written in a JSON-like syntax indented with tabs. https://github.com/pnpm/pnpm/releases/tag/v12.19.0 (2026-11, day not shown). Releases 12.20 to 12.22 only fix and extend v13, and 12.22.0 removes `dependenciesMeta` from it. https://github.com/pnpm/pnpm/releases |
| `**/yarn.lock` | unchanged | Yarn 4.18.1 (24 Sep) and 4.19.0 (21 Nov) release notes mention no lockfile change. No Yarn 5 exists on the releases page. https://github.com/yarnpkg/berry/releases |
| `**/bun.lock` | unchanged | Bun docs: `bun.lock` is the default text lockfile since Bun 1.2. https://bun.com/docs/install/lockfile |
| `bun.lockb` in the TS-PKG-13 list | unchanged, keep it | Bun 1.4.x release posts (1.4.0 on 2026-08-20 through 1.4.5 on 2026-11-19) announce no removal. The 1.4.4 post (2026-10-22) says auto-install still uses versions pinned in `bun.lock` or `bun.lockb`, and fixes `bun <file>.lockb` printing. https://bun.com/blog/bun-v1.4.4 and https://bun.com/blog. The docs page lists no automatic `bun.lockb` migration and shows only the manual path `bun install --save-text-lockfile --frozen-lockfile --lockfile-only` then delete `bun.lockb`. A stale `bun.lockb` can therefore still exist and still be read, so the detection entry stays. |
| `**/package-lock.json`, `**/npm-shrinkwrap.json` | could not determine for npm-shrinkwrap; no change seen for package-lock | No npm release notes for the window were fetched. The npm CLI v11 docs page (v11.21.3) was read only for `devEngines`. |
| New lockfile kinds | none | Bun 1.4.4 added migration of Yarn Berry `yarn.lock` into `bun.lock` (https://bun.com/blog/bun-v1.4.4). This adds an input, not a new lockfile kind. |

A new pnpm 12 behaviour matters for the pin, not for detection. A project that pins pnpm via `packageManager` or `devEngines.packageManager` gets the resolved pin written into `pnpm-lock.yaml` under `packageManagerDependencies`, and the file may gain a leading boot document (pnpm docs, https://pnpm.io/package_json). Still one file; the glob matches it.

### 2. TS-PKG-13 `packageManager` check

Verdict: changed. The check reads only the legacy field, and that is no longer enough.

- Corepack is not bundled with Node 25.0.0 and later (README, https://github.com/nodejs/corepack#readme). Corepack v0.36.0 (2026-08-28) added: use the range from `devEngines` when no `packageManager` is set (https://github.com/nodejs/corepack/releases). The README states that `devEngines.packageManager` is the fallback when the top-level `packageManager` is missing.
- `packageManager` is still honoured. pnpm treats it as the exact-version pin and tells people to use `devEngines.packageManager` for a range (https://pnpm.io/package_json). Yarn docs still describe `packageManager` as the field Corepack-style tools read (https://yarnpkg.com/configuration/manifest). npm, by contrast, documents only `devEngines.packageManager` and fails when its `name` is not `npm` (https://docs.npmjs.com/cli/v11/configuring-npm/package-json#devengines). Whether npm reads the legacy field: could not determine from that page.
- pnpm 12 writes either field. `pnpm add yarn@4` writes `"packageManager": "yarn@4.18.0"`; other managers go into `devEngines.packageManager` as a range, and only one of the two fields is kept (https://github.com/pnpm/pnpm/releases/tag/v12.0.0). Since 12.0.0-rc.6, `packageManager` may also name `npm`, `yarn` or `bun` (https://pnpm.io/package_json). Corepack itself only permits `yarn`, `npm`, `pnpm` in `packageManager`.
- Bun: the 1.4.x posts say nothing about either field. Bun is detected by its lockfile, not by a pin.

Old text: `jq -r '.packageManager // empty' package.json` must name the manager that produces the surviving lockfile.

Replacement expression (handles the legacy string, and `devEngines.packageManager` as an object or array of objects, which npm's docs allow):

```sh
jq -r '.packageManager // ((.devEngines.packageManager // empty) | if type=="array" then map(.name) | join(",") else .name end) // empty' package.json
```

Reading heuristic: the printed name (`pnpm@...`, `yarn@...`, `npm@...`, or a bare `name`) must be the manager that writes the surviving lockfile. If both fields exist and name different managers, that is a violation on its own. Empty output means no pin, which the rule treats as a finding for any repo that expects reproducible installs.

Rationale: a repo on Node 25+ using Corepack 0.36 with only `devEngines` reads as unpinned to the old command, a false positive. A repo whose pnpm 12 wrote the pin into `devEngines` after `pnpm add npm@11` has the same blind spot.

### 3. `pnpm-workspace.yaml` glob

Verdict: unchanged. The glob still matches the load-bearing file.

- pnpm 12.22.0 moves the global packages configuration into a `globalPackagesConfig` section of the global `config.yaml` (the global packages directory's own `pnpm-workspace.yaml` is still read, with a deprecation warning). 12.23.0 adds `PNPM_CONFIG_HOME` for the global `config.yaml` and `auth.ini`. Both are user-level files, not repo files, so they fall outside a repo glob. https://github.com/pnpm/pnpm/releases
- Project settings stay in `pnpm-workspace.yaml`. 12.24.0 accepts grouped forms of `overrides` and `catalog` there, and the old forms still work. pnpm 12.0.0 now reports unrecognised workspace settings and fails with `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` when the project's pinned pnpm is satisfied by the running one. 11.29.0 stops global commands loading `pnpm-workspace.yaml`, `.pnpmfile.cjs` or `.npmrc` from the working directory. None of these change the file name or location. https://github.com/pnpm/pnpm/releases/tag/v12.0.0
- Possible gap, outside the brief: pnpm still reads `.pnpmfile.cjs` and `.npmrc`; neither is in the glob list. Not new in this window.

## Candidate rule changes

1. TS-PKG-13 verification line: swap the `jq` expression for the one above. Rationale: Corepack 0.36 and pnpm 12 both treat `devEngines.packageManager` as a first-class pin. Verification: run the expression against a fixture with only `devEngines`, only `packageManager`, and both; it must print a name in the first two cases.
2. Optional wording in TS-PKG-13: state that under pnpm 12 the resolved pin is also recorded in `pnpm-lock.yaml`, so a lockfile and a manifest that disagree are stale. Verification: `grep -n packageManagerDependencies pnpm-lock.yaml`.
3. No glob change. Keep `bun.lockb` in the detection list.

## Sources not read or incomplete

- pnpm releases page: first 100000 characters read; the 11.x entries from 2026-08-29 to 2026-11-13 were not listed (page truncated), so any 11.x lockfile change in that span is unverified. The pnpm 12.0.0 notes were read in full.
- The pnpm CHANGELOG.md raw URL returned 404.
- pnpm settings page did not list `lockfile.format` values; default presumed off because the setting is labelled experimental (not stated).
- Bun 1.4.4 post: first 100000 of 137129 characters read.
- npm release notes for the window were not fetched.

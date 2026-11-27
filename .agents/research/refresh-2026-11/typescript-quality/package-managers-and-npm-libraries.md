---
title: Package-manager install controls and pinned npm library behaviour, delta 2026-08-29 to 2026-11-27
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 27
---

# Package-manager install controls and pinned npm library behaviour (delta)

Scope: only the claims at risk named in the commission. Anything not listed here is untouched. Several upstream changes below landed BEFORE the 2026-08-29 baseline but contradict the baseline text, so the existing rules were already stale when written. Those are marked "pre-window".

## Summary

- TS-SEC-13 and TS-SEC-14 are materially stale. npm 12 (12.0.0, 2026-07-08, pre-window) blocks dependency install scripts by default through `allowScripts`. pnpm 11.0.0 (2026-04-28, pre-window) shipped, made `minimumReleaseAge` default-on at 1440 minutes, and removed `onlyBuiltDependencies`.
- The TS-SEC-13 grep for `onlyBuiltDependencies` matches nothing in a pnpm 11 or 12 project. It must become `allowBuilds`.
- Yarn key is `npmMinimalAgeGate` and Bun key is `minimumReleaseAge`. The current TS-SEC-14 grep matches only Bun (and only by luck) and misses Yarn.
- Library claims: commander, execa, tree-kill, p-map, Connect-ES and Zod claims are unchanged in behaviour. `@actions/exec` has a 3.0.0 (2026-01-28) with the same missing fields.
- No commander major changed exit behaviour. Commander 15 (2026-05-29) is ESM-only and needs Node 22.12.

## Findings

### 1. TS-SEC-14, minimum release age per tool

Verdict: changed.

| Tool | Exact key | Unit | Default now | Source |
|---|---|---|---|---|
| npm 11.10+ and 12 | `min-release-age` in `.npmrc`; also `min-release-age-exclude` (12.0.0-pre.1) | days | `null` (off) in both v11 and v12 docs | [npm 12 config](https://docs.npmjs.com/cli/v12/using-npm/config), [CHANGELOG](https://raw.githubusercontent.com/npm/cli/latest/CHANGELOG.md) |
| pnpm 11 and 12 | `minimumReleaseAge` in `pnpm-workspace.yaml`; also `minimumReleaseAgeExclude`, `minimumReleaseAgeStrict` | minutes | `1440` (1 day), on by default | [pnpm v11.0.0 release](https://github.com/pnpm/pnpm/releases/tag/v11.0.0), [pnpm settings](https://pnpm.io/settings/dependency-resolution) |
| Yarn 4 | `npmMinimalAgeGate` in `.yarnrc.yml`; also `npmPreapprovedPackages` | number = minutes, or a duration string such as `1d` | `1d` default made in 4.15.0 (2026-05-19, pre-window); docs say `"1w"` on the yarnrc page, so the docs disagree with the release note | [yarnrc docs](https://yarnpkg.com/configuration/yarnrc), [Yarn 4.15.0](https://github.com/yarnpkg/berry/releases/tag/@yarnpkg/cli/4.15.0) |
| Bun | `minimumReleaseAge` under `[install]` in `bunfig.toml`; flag `--minimum-release-age`; `minimumReleaseAgeExcludes` | seconds, or unit strings (`3d`, `12 hours`) | `null` (off) per the bunfig docs table; the install doc shows `259200` in a block headed "default values". Could not determine from release notes (1.4.0 to 1.4.5 notes mention nothing) | [bunfig docs](https://bun.com/docs/runtime/bunfig), [bun install docs](https://bun.com/docs/pm/cli/install.md) |

Facts:
- pnpm 10.16.0 was released 2025-09-12 and pnpm 11.0.0 on 2026-04-28 ([release](https://github.com/pnpm/pnpm/releases/tag/v11.0.0)). "default-on from pnpm 11" is now fact, not forecast. pnpm 12.0.0 (2026-08-26) is current; 12.24.0 is the newest tag on 2026-11-26.
- pnpm 12 reports unrecognised workspace settings as `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` when the repo pins a satisfied pnpm version. A misspelled `minimumReleaseAge` now fails loudly ([v12.0.0 notes](https://github.com/pnpm/pnpm/releases/tag/v12.0.0)).
- Yarn `npmMinimalAgeGate` was added in 4.10.0 (2025-09-18). Per-scope gate in 4.17.0 (2026-06-15). Latest is 4.19.0 (2026-11-21).
- Bun accepts the setting since 1.3 (per a third-party source; not confirmed in a Bun primary note). Latest Bun is 1.4.5 (2026-11-19).
- Renovate has its own `minimumReleaseAge` (and `minimumReleaseAgeBehaviour`, `minimumReleaseAgePackageManager`) ([Renovate docs](https://docs.renovatebot.com/configuration-options/#minimumreleaseage)). Only the option names were visible; defaults could not be determined.

### 2. TS-SEC-13, install scripts

Verdict: changed.

- npm 12.0.0 (2026-07-08, pre-window, breaking): "Dependency lifecycle scripts are now blocked by default unless allowed by the root package's allowScripts policy." Flow: `npm install-scripts approve` then `npm rebuild` ([CHANGELOG](https://raw.githubusercontent.com/npm/cli/latest/CHANGELOG.md), [install-scripts doc](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts)). `allowScripts` keys are package specs (`pkg`, `pkg@1.2.3`) with `true` or `false`. npm 12 also defaults `allow-git` and `allow-remote` to `"none"`. The `allow-scripts` config key is only for one-off contexts (npx, exec, global).
- npm `ignore-scripts` still defaults to `false` and still means "npm does not run scripts specified in package.json files" ([config](https://docs.npmjs.com/cli/v12/using-npm/config)). On npm 11 (legacy, 11.21.3 docs) nothing changed. So `ignore-scripts=true` is still valid, but on npm 12 it is no longer the only gate.
- `npm run` gap: could not determine. The npm 12 docs do not mention `npm run` or root-package scripts; the changelog only says the root `preinstall` now runs before dependencies install. Keep the gap text, but flag it as unverified against npm 12.
- pnpm: `onlyBuiltDependencies`, `onlyBuiltDependenciesFile`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, `ignoreDepScripts` were REMOVED in pnpm 11.0.0 (2026-04-28). Replacement is `allowBuilds`, a map of package matcher to `true` or `false`, in `pnpm-workspace.yaml`. `strictDepBuilds` defaults `true` (install exits non-zero on unreviewed builds). `dangerouslyAllowAllBuilds` defaults `false`. pnpm 12.11.0 added a `permissions` entry whose `build` outranks `allowBuilds` ([pnpm build settings](https://pnpm.io/settings/build)). Migration: `pnpx codemod run pnpm-v10-to-v11`.
- Yarn: `enableScripts` defaults `false` for third-party packages; per-package override through `dependenciesMeta` ([yarnrc](https://yarnpkg.com/configuration/yarnrc)).
- Bun: dependency scripts do not run by default; allowlist is `trustedDependencies` in `package.json` (not bunfig). `install.ignoreScripts` in bunfig or `--ignore-scripts` skips all lifecycle scripts, including trusted and the project's own ([bun install docs](https://bun.com/docs/pm/cli/install.md)).

### 3. TS-CLI-04, commander

Verdict: unchanged; no version floor needed for exit behaviour.

- Latest is 15.1.0 (2026-11-07), a bug-fix release with deprecations of `storeOptionsAsProperties()` and `combineFlagAndOptionalValue()` ([release](https://github.com/tj/commander.js/releases/tag/v15.1.0)). 15.0.0 was released 2026-05-29: ESM-only, Node >=22.12.0, one breaking option-default change (only a lone `--no-*` sets default `true`). No exit or `exitOverride` change ([v15.0.0](https://github.com/tj/commander.js/releases/tag/v15.0.0)). Commander 14 gets security fixes to May 2027.
- Measured here on commander 15.1.0, Node v26.13.1, with `.exitOverride()`: `--version` throws CommanderError code `commander.version` exitCode 0; `--help` code `commander.helpDisplayed` exitCode 0; `--bogus` code `commander.unknownOption` exitCode 1. Without `.exitOverride()`, `parseAsync(['--version'])` printed `1.0.0` and the process exited 0 before the next line ran (no "RETURNED" line). Claim holds.
- Note: baseline text says "15.0.0 (2026-08-29)"; 15.0.0 shipped 2026-05-29. The 08-29 date is the measurement date. Reword to "measured on 15.0.0 and re-measured on 15.1.0 (2026-11-27)".

### 4. TS-RES-18 and TS-RES-17, execa and tree-kill

- execa: unchanged in shape. Current 10.2.1 (2026-10-23); 10.0.0 was 2026-07-17, 10.0.1 2026-07-31, 10.1.0 2026-10-06, 10.1.1 2026-10-13, 10.2.0 2026-10-18. `engines.node` is `>=22` (read from npm). Direct dependencies counted from `npm view`: 12 in both 10.0.1 and 10.2.1 (baseline said "~11 transitive"; that wording conflates direct and transitive, direct is 12; transitive total not measured). Still ESM-only per the package types. Option names `killDescendants`, `forceKillAfterDelay`, `cancelSignal`, `gracefulCancel` all still present in `types/arguments/options.d.ts` of 10.2.1.
- tree-kill: unchanged. Latest 1.2.2, created 2019-12-11, `time.modified` 2022-06-27, no deprecation flag ([npm registry](https://registry.npmjs.org/tree-kill)).

### 5. TS-ASYNC-05 and TS-RES-10, @actions/exec

Verdict: changed (wording), behaviour unchanged. A 2.0.0 (2025-12-09, pre-window) and 3.0.0 (2026-01-28, pre-window) exist; current is 3.0.0, `type: module`, dependency `@actions/io ^3.0.2`. Read from the 3.0.0 tarball: `ExecOptions` has `cwd, env, silent, outStream, errStream, windowsVerbatimArguments, failOnStdErr, ignoreReturnCode, delay, input, listeners`. No `timeout`, `signal` or `killSignal`. `toolrunner.js` contains no kill call; its `setTimeout` is the stream-close `delay` only. Replace "1.x" with "1.x through 3.0.0".

### 6. TS-ASYNC-17 and TS-ASYNC-04

- p-map: unchanged. Latest 7.1.1 (2026-10-11); source default is `concurrency = Number.POSITIVE_INFINITY` (read from 7.1.1 `index.js`). New 7.1.0 (2026-10-09) did not change it.
- Connect-ES: unchanged. Latest on npm read at 2.3.0 (2026-10-27); GitHub has v2.3.1 (2026-11-25), whose notes were not read. In 2.3.0 `transport.js`, `timeoutMs === undefined ? opt.defaultTimeoutMs : timeoutMs <= 0 ? undefined : timeoutMs`, and `defaultTimeoutMs?: number` has no default, so an unset value stays `undefined`. 2.3.0 adds a new `connectTimeoutMs` option ([v2.3.0](https://github.com/connectrpc/connect-es/releases/tag/v2.3.0)); that bounds connection establishment only, not the call.

### 7. TS-ERR-17 and Standard Schema

- Zod: unchanged. Latest 4.6.7 (2026-10-12); 4.6.0 was 2026-09-09. `ZodError` in `v4/classic/errors.d.ts` exposes `format()` and `flatten()`; no `errors` alias was found by grep. Rule still binds Zod 4.x; update the "checked" date to 2026-11-27 and version to 4.6.7. Note: the grep proved no `errors` member in the type file; it did not exercise runtime.
- Standard Schema: zod ships `StandardSchemaV1` in `v4/core/standard-schema.d.ts`; valibot 1.5.0 types contain `~standard`; arktype implements it through `@ark/schema` 0.56.9 (`standardSchema.d.ts`). `@standard-schema/spec` is at 1.1.0 and now also defines `StandardTypedV1` and `StandardJSONSchemaV1`; every spec declares `version: 1`. Claim holds.

## Normative guidance candidates

1. TS-SEC-14 rewrite. Rule: set a release-age gate in whichever manager the repo uses, with these exact keys: npm `min-release-age=<days>` (off by default, npm 11.10+); pnpm `minimumReleaseAge` (minutes, default 1440 from pnpm 11); Yarn `npmMinimalAgeGate` (default `1d` from 4.15); Bun `install.minimumReleaseAge` (seconds, or duration string). Rationale: a freshly published malicious version is the main supply-chain window, and only pnpm and Yarn gate by default. Verification: `grep -rnE 'min-release-age|minimumReleaseAge|npmMinimalAgeGate' .npmrc pnpm-workspace.yaml .yarnrc.yml bunfig.toml renovate.json* package.json 2>/dev/null`, and fail review if the manager in use has no match and is npm or Bun.
2. TS-SEC-13 rewrite. Rule: block dependency install scripts and allowlist explicitly. npm 12: `allowScripts` in `package.json` (default-deny); npm 11 and older: `ignore-scripts=true`. pnpm 11+: `allowBuilds` map, keep `strictDepBuilds` true. Yarn: `enableScripts: false`. Bun: `trustedDependencies`. Rationale: `onlyBuiltDependencies` is removed in pnpm 11 and a pnpm 11 project that still carries it gets no allowlist. Verification: `grep -rnE 'allowScripts|allowBuilds|trustedDependencies|ignore-scripts|enableScripts' package.json pnpm-workspace.yaml .npmrc .yarnrc.yml bunfig.toml`, and `grep -rn 'onlyBuiltDependencies\|neverBuiltDependencies\|ignoredBuiltDependencies' .` must return nothing on pnpm >= 11.
3. Add a version note to TS-SEC-13: `allow-git` and `allow-remote` default to `none` on npm 12, so git and tarball-URL dependencies now fail install until allowed. Verification: `grep -rnE 'allow-git|allow-remote' .npmrc`.
4. TS-CLI-04: keep as is; replace the measurement line with "commander 15.0.0 and 15.1.0 (re-measured 2026-11-27, Node 26)". Add a floor note: commander 15 requires Node >=22.12.0 and is ESM-only. Verification: `npm view commander@15 engines`.
5. TS-RES-10 and TS-ASYNC-05: change "@actions/exec@1.x" to "@actions/exec 1.x through 3.0.0". Verification: `grep -nE 'timeout|signal|killSignal' node_modules/@actions/exec/lib/interfaces.d.ts` returns nothing.

## AI-agent angle

- An agent trained before 2026 writes `onlyBuiltDependencies` for pnpm; on pnpm 11 and 12 it is ignored or reported as unrecognised. Check: grep from candidate 2.
- An agent writes `min-release-age` into `pnpm-workspace.yaml` or `minimumReleaseAge: 7` expecting days; pnpm's unit is minutes, Bun's seconds, npm's days. Check: read the unit in the table above.
- An agent assumes npm install runs dependency scripts. On npm 12 they are skipped and builds (native modules) fail silently until `npm install-scripts approve` then `npm rebuild`.
- An agent assumes "ignore-scripts" is the pnpm or Bun switch; pnpm uses `allowBuilds`, Bun `trustedDependencies`.

## Contested / evolving

- Yarn default for `npmMinimalAgeGate`: 4.15.0 made `1d` the default; 4.16.0 and 4.17.0 each fixed the docs default value, and the live yarnrc page still prints `"1w"`. Treat `1d` as the behaviour and the page as unreliable.
- Bun default: docs table says `null`, a "default values" block shows `259200`. Undetermined. A Bun pull request (#30529, open on the date seen) proposed a gated `2d` default for 1.4; not confirmed shipped.
- npm `min-release-age` default is `null` through 12.2.3; trend across pnpm and Yarn is default-on, npm has not followed.
- The `npm run` and root-scripts behaviour under npm 12 is undocumented in what was fetched.

## Sources

| URL | What | Date / era | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/npm/cli/latest/CHANGELOG.md | npm CLI changelog (first 100000 characters read) | to 12.2.3, 2026-11-11 | primary, min-release-age and allowScripts history |
| https://docs.npmjs.com/cli/v11/using-npm/config | npm 11 config | 11.21.3 | primary, defaults |
| https://docs.npmjs.com/cli/v12/using-npm/config | npm 12 config | npm 12 | primary, defaults |
| https://docs.npmjs.com/cli/v12/commands/npm-install-scripts | npm 12 install-scripts | npm 12 | primary |
| https://github.com/pnpm/pnpm/releases/tag/v11.0.0 | pnpm 11 release notes | 2026-04-28 | primary, default-on and removals |
| https://github.com/pnpm/pnpm/releases/tag/v12.0.0 | pnpm 12 release notes | 2026-08-26 | primary |
| https://pnpm.io/settings/dependency-resolution | pnpm settings | current | primary |
| https://pnpm.io/settings/build | pnpm build settings | current | primary |
| https://yarnpkg.com/configuration/yarnrc | Yarn config reference | current | primary |
| https://github.com/yarnpkg/berry/releases/tag/@yarnpkg/cli/4.15.0 | Yarn 4.15.0 notes | 2026-05-19 | primary, default change |
| https://bun.com/docs/runtime/bunfig | bunfig reference | 1.4 | primary |
| https://bun.com/docs/pm/cli/install.md | bun install docs | 1.4 | primary |
| https://docs.renovatebot.com/configuration-options/#minimumreleaseage | Renovate options | current | primary, partial read only |
| https://github.com/tj/commander.js/releases/tag/v15.0.0 | commander 15.0.0 notes | 2026-05-29 | primary |
| https://github.com/tj/commander.js/releases/tag/v15.1.0 | commander 15.1.0 notes | 2026-11-07 | primary |
| https://github.com/connectrpc/connect-es/releases/tag/v2.3.0 | Connect-ES 2.3.0 notes | 2026-10-27 | primary |
| https://github.com/standard-schema/standard-schema | Standard Schema spec repo | current | primary, spec version only |
| npm registry via `npm view` / `npm pack` (commander, execa, tree-kill, @actions/exec, p-map, @connectrpc/connect, zod, valibot, arktype, @ark/schema) | package metadata and tarball source reads | to 2026-11-27 | primary, exact option names and defaults |

Not fetched or failed: GitHub releases API through WebFetch (403; `gh api` used instead); Bun 1.4 release notes (no relevant text); execa and zod changelog pages (replaced by tarball reads); Connect-ES v2.3.1 notes.

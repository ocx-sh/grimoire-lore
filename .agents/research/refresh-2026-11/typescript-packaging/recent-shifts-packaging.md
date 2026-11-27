---
title: Recent shifts in TypeScript configuration and npm distribution, delta for rules/typescript-packaging.md
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 21
---

# Recent shifts: what rules/typescript-packaging.md does not yet say

This is a delta update, not a re-creation. The baseline is 2026-08-29. The question is which shifts between 2026-08-29 and 2026-11-27 would need a new TS-CFG or TS-PKG rule, beyond what the rule already says. Claims the rule already makes (exports condition order, pack-smoke, `engines.node`, `require(esm)` thresholds, publint and attw rule names) were not re-verified.

## Summary

- The supply-chain dust has partly settled. The publishing side moved a lot inside the window and is converging on one shape: trusted publishing (OIDC) plus staged publish with a maintainer 2FA approval. A thin, dated TS-PKG section is now justified for it.
- The install side (install scripts off by default, cooldowns) mostly landed before the window (npm 12 on 2026-07-08, Dependabot default cooldown on 2026-07-14). It is stable enough for a thin section that names the mechanism and defers the values.
- npm is targeting January 2027 to remove direct publishing with bypass-2FA tokens. That date is a target, not a fact; the rule must not hard-code it.
- No new package.json field or Node `type`/`imports`/`exports` semantics surfaced that a rule would bind. `devEngines` and Corepack could not be determined from the sources fetched.
- tsconfig: TypeScript 7.1 is in beta (2026-10-20). Its new `contentMappers` key and `--runExternalCode` flag are the only config shift. Wait for GA.
- publint shipped patch releases only, with no new rules. attw has had no release since 2026-05-29. Nothing superseded either tool.

## Findings

### 1. Publishing credentials: trusted publishing and staged publish (changed, inside window)

Existing rule text: TS-PKG-01 to TS-PKG-03 cover pack-smoke and `npm publish --dry-run`. The rule says nothing about how CI authenticates to the registry or how a version goes live.

Changed facts, each with its upstream date:

- 2026-09-03: configurations created after this date default to stage-only publishing; a package may hold up to 10 trusted publishers ([trusted publishers doc](https://docs.npmjs.com/trusted-publishers); title of the [2026-09-03 changelog](https://github.blog/changelog/2026-09-03-multiple-trusted-publishing-configurations-for-npm) was seen only in search results, not opened).
- 2026-09-18: a new granular token type, "Read and write (stage only)". `npm stage publish` replaces `npm publish`; npm rejects direct publish with that token, even one that bypasses 2FA. A maintainer approves the staged version with 2FA. npm is "targeting January 2027" to remove direct publishing through bypass-2FA tokens; no exact day is given ([changelog](https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation)). Requires npm CLI 11.15.0 or later and Node 22.14.0 or later ([staged publishing doc](https://docs.npmjs.com/staged-publishing)).
- 2026-09-30: an opt-in "Allow npm dist-tag" permission lets OIDC credentials move dist-tags. It is off by default ([changelog](https://github.blog/changelog/2026-09-30-opt-in-dist-tag-permissions-for-npm-trusted-publishing/)). Needs CLI 11.21.0 or later, or 12.2.0 or later ([trusted publishers doc](https://docs.npmjs.com/trusted-publishers)).
- 2026-10-02: an unvalidated trusted publishing configuration expires 48 hours after creation and becomes permanent after its first successful publish. npm now rejects OIDC tokens from `issue_comment` events, in addition to the earlier `pull_request_target` restriction ([changelog](https://github.blog/changelog/2026-10-02-unvalidated-npm-trusted-publishing-configurations-now-expire)).
- Provenance is generated automatically for GitHub Actions and GitLab CI/CD trusted publishes, not CircleCI, and only for public packages from public repositories. It can be turned off with `NPM_CONFIG_PROVENANCE=false` ([trusted publishers doc](https://docs.npmjs.com/trusted-publishers)). npm 12.2.3 documents `provenance` default `false` for token publishing ([npm config](https://docs.npmjs.com/cli/v12/using-npm/config)).
- OIDC cannot run `npm stage list`, `view`, `approve` or `reject`, nor `npm install`; dependency installs still need a read-only token. The doc recommends the account setting "Require two-factor authentication and disallow tokens" once trusted publishers exist. The doc does not say tokens are deprecated ([trusted publishers doc](https://docs.npmjs.com/trusted-publishers)).
- Yarn mirrors the shape: `yarn npm stage` arrived in 4.16.0 (2026-06-02) ([Yarn releases](https://github.com/yarnpkg/berry/releases)). Yarn dates carry no year on that page, so the year is inferred.

Could not determine: the exact January 2027 date; whether provenance is attached to a staged publish (the staging doc links to provenance docs without explaining the interaction). The Hacker News article on the October tightening returned HTTP 403.

### 2. Install-time scripts: npm 12 allowScripts (unchanged inside window; baseline gap)

npm 12 shipped on 2026-07-08, before the window, per [Socket](https://socket.dev/blog/npm-12) and [GCN](https://gcn.com/?p=23277) as surfaced in search results (not opened). Inside the window the documented state is npm 12.2.3:

- `allow-scripts` defaults to empty and `ignore-scripts` to `false`; `allow-git` defaults to `none` "as of npm 12" ([npm config](https://docs.npmjs.com/cli/v12/using-npm/config)).
- `npm approve-scripts` manages an `allowScripts` field in the project `package.json`. Entries are pinned (`pkg@1.2.3`, the default), name-only (`pkg: true`, via `--no-allow-scripts-pin`) or `false` (deny; always wins). The command fails with `EGLOBAL` under `--global` ([approve-scripts doc](https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts)).
- pnpm: `allowBuilds` plus `strictDepBuilds` (on by default) and `blockExoticSubdeps` (on by default) ([pnpm supply-chain page](https://pnpm.io/supply-chain-security)). In the window pnpm 11.28.13 made `approve-builds` fail in CI without a terminal, and 12.24.0 (2026-11-26) narrowed `pnpm approve` ([pnpm releases](https://github.com/pnpm/pnpm/releases)).
- Yarn: scripts disabled by default since 4.14.0 (2026-04-16, year inferred) ([Yarn releases](https://github.com/yarnpkg/berry/releases)).

Interaction with the existing rule: TS-PKG-01 installs the packed tarball with `--ignore-scripts`. That stays correct and is stricter than the new default. What the rule lacks is any statement about the fleet's own install allowlist.

### 3. Release cooldowns (unchanged inside window; stable enough to name)

- npm: `min-release-age` exists, default `null`, so no npm-level cooldown by default ([npm config](https://docs.npmjs.com/cli/v12/using-npm/config)).
- pnpm: `minimumReleaseAge` defaults to 1440 minutes (one day); `0` opts out ([pnpm supply-chain page](https://pnpm.io/supply-chain-security)). pnpm 12.23.0 (2026-11-22) added `--minimum-release-age` flags and a `referenceTime` setting; 11.28.13 fixed a bug where a registry change skipped the age and trust checks ([pnpm releases](https://github.com/pnpm/pnpm/releases)).
- Yarn: `npmMinimalAgeGate` default changed to one day in 4.15.0 (2026-05-19, year inferred); per-scope settings in 4.17.0 ([Yarn releases](https://github.com/yarnpkg/berry/releases)).
- Bun: the Bun blog for August to November names no cooldown change. Could not determine Bun's current default.
- Dependabot: version updates get a 3-day default cooldown with no `cooldown` block, effective 2026-07-14; security updates are exempt; `default-days: 0` opts out ([Dependabot options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference); date from the [GitHub changelog](https://github.blog/changelog/2026-07-14-dependabot-version-updates-introduce-default-package-cooldown/) seen in search results).
- Renovate: the `security:minimumReleaseAgeNpm` preset sets 3 days; the docs page does not say whether `config:best-practices` includes it, and it describes Renovate 45.1.1 ([Renovate security presets](https://docs.renovatebot.com/presets-security/)).

Verdict on the topic map's worry: the values still differ (null, 1 day, 1 day, 3 days, 3 days) and none moved to a shared number in the window, so values must stay deferred. The mechanism (one explicit cooldown per tool the fleet uses, with a security-update exemption) is stable.

### 4. package.json and Node semantics (nothing qualifies)

- The Node packages doc shows `type` syntax detection enabled by default since v22.7.0 and v20.19.0, and recommends always setting `type`. `#/` subpath imports allowed since v25.4.0 and v24.14.0. `module-sync` condition documented. Package maps are experimental from v26.4.0 ([Node packages doc](https://nodejs.org/api/packages.html)). None of this is dated inside the window by that page, and the rule's `require(esm)` row (TS-PKG-11) already covers the relevant line.
- `devEngines` and Corepack: the Node page does not cover them. Could not determine.
- Node release pages for September and October 2026 were not reached; only 11 to 26 November listings were seen (26.13.1 LTS, 24.22.3, 22.23.5, and 27.0.0 alphas) ([Node release blog](https://nodejs.org/en/blog/release)). Could not determine whether any release in the window changed package.json handling.

### 5. tsconfig (one beta item, wait)

- TypeScript 7.0 shipped 2026-07-08 (baseline). The typescript-go repository was archived on 2026-09-01 ([typescript-go releases](https://github.com/microsoft/typescript-go/releases)), so release notes now live in the main TypeScript blog.
- The TypeScript 7.1 beta (2026-10-20) adds `contentMappers` (a tsconfig key registering a package and extensions such as `.vue`) and a `--runExternalCode` CLI flag that `tsc` requires before executing a content mapper, since mappers are arbitrary executables. It also makes `es2026` a stable `--target` and `--lib`, and adds stricter distributive type-parameter checks ([7.1 beta announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/)).
- The announcement does not mention `isolatedDeclarations`, `extends`, `${configDir}`, default flips or deprecations. Could not determine from other sources; no 7.1 GA was found.

### 6. Publish-verification tooling (unchanged)

- publint 0.3.22 to 0.3.25 (13 August to 1 October, year inferred): adds npm 12 and pnpm 11 support, tolerates tarballs written by pnpm 12, checks `repository.url` without `repository.type`, `.ctsx` detection. No new rules announced; the two rule codes the rule names are untouched ([publint releases](https://github.com/publint/publint/releases)).
- attw: latest 0.18.3 on 2026-05-29, requires Node 20; no release in the window and no deprecation notice ([attw releases](https://github.com/arethetypeswrong/arethetypeswrong.github.io/releases)).

## Normative guidance candidates

Ranked. Fleet shape: the fleet publishes `bin` packages to npm from CI (shape 1 in the existing rule). Candidates 1 to 3 bind that shape.

1. **TS-PKG, adopt as a dated thin section: publish from CI with trusted publishing, stage-only.** Rule: the publish workflow authenticates by OIDC trusted publishing (`id-token: write`), publishes with `npm stage publish`, and holds no long-lived `NPM_TOKEN`/`NODE_AUTH_TOKEN` publish secret. Trigger events are `push`, `release` or `workflow_dispatch`, never `issue_comment` or `pull_request_target`. Rationale: bypass-2FA direct publish is slated for removal (target January 2027); stage-only configurations are the default for new trusted publishers since 2026-09-03; OIDC cannot approve, so a human 2FA step stays in the loop. Verification: `grep -n -E 'id-token: write' .github/workflows/*` must hit the publish workflow; `grep -n -E 'NPM_TOKEN|NODE_AUTH_TOKEN' .github/workflows/*` in a publish job is the violation; `grep -n -E 'issue_comment|pull_request_target'` in the same file is the violation; `grep -n 'npm stage publish'` must hit. Date every version number written into the rule (CLI 11.15.0, Node 22.14.0).
2. **TS-PKG, adopt as a dated thin section: dependency install scripts are allowlisted, not enabled.** Rule: do not set `ignore-scripts=false` or a wildcard `allow-scripts` to restore the old behaviour; commit the `allowScripts` map (or pnpm `allowBuilds`, Yarn `enableScripts` exceptions) and review it as a diff. Name-only `true` entries need a justification comment in the commit body. Rationale: npm 12 and Yarn 4.14 and pnpm all moved to default deny; an AI agent that hits a skipped-script warning characteristically loosens the setting. Verification: `jq -r '.allowScripts // {} | to_entries[] | select(.value==true) | .key' package.json` lists unpinned allows; `grep -rn -E 'ignore-scripts\s*=\s*false|allow-scripts\s*=\s*\*' .npmrc` is the violation.
3. **TS-PKG, adopt as a dated thin section: every automated updater and installer in the repo has an explicit cooldown, with values deferred.** Rule: name the mechanism per tool in use (`cooldown` in `.github/dependabot.yml`, `minimumReleaseAge` for pnpm, `npmMinimalAgeGate` for Yarn, `min-release-age` in npm config, Renovate `security:minimumReleaseAgeNpm`), never set a window to `0` without a stated reason, and never exempt more than a named allowlist. Do not write numbers into the rule; defaults differ by tool and were last checked 2026-11-27. Verification: `grep -n -E 'default-days:\s*0' .github/dependabot.yml`, `grep -n -E 'minimumReleaseAge:\s*0' pnpm-workspace.yaml .npmrc` empty means pass; for npm, `npm config get min-release-age` returning `null` is a finding to explain.
4. **TS-CFG, wait: tsconfig `contentMappers` requires an explicit reason.** Rule when adopted: a tsconfig that registers `contentMappers` names the package and the reviewing commit; CI never passes `--runExternalCode` unreviewed. Verification: `grep -rn -E 'contentMappers|runExternalCode' tsconfig*.json package.json .github`. Wait because 7.1 is beta and the fleet has no `.vue`-style content.

## AI-agent angle

- Agents trained before 2026 write `npm publish` with an `NPM_TOKEN` secret and `--provenance`; the current shape is OIDC plus `npm stage publish`. Catch: grep for `NODE_AUTH_TOKEN` in publish workflows.
- Agents hit a skipped-install-script warning and add `--ignore-scripts=false` or a blanket allow. Catch: the `.npmrc` grep in candidate 2.
- Agents assume a one-day cooldown is universal. npm's is `null`. Catch: `npm config get min-release-age`.

## Contested / evolving

- Direct publish removal for bypass-2FA tokens: target January 2027, as of 2026-09-18. Do not write the month into the rule without re-checking.
- Cooldown defaults differ across tools and are still being refined (pnpm added `referenceTime` on 2026-11-22). Trend: more tools default to one to three days; npm itself still `null`.
- Staged publish plus provenance interaction is undocumented as of 2026-11-27.

## Cases where nothing qualifies

- New package.json fields, `devEngines`, Corepack: nothing found; could not determine.
- `isolatedDeclarations`, `extends`, `${configDir}`, 7.x default flips: no source in the window mentions them.
- Publish-verification tools that supersede publint or attw: none. Both remain current.

## Sources

| URL | What it is | Date | Why |
|---|---|---|---|
| https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation | GitHub changelog, stage-only tokens | 2026-09-18 | Primary, credential shift |
| https://github.blog/changelog/2026-10-02-unvalidated-npm-trusted-publishing-configurations-now-expire | GitHub changelog, expiry and issue_comment | 2026-10-02 | Primary |
| https://github.blog/changelog/2026-09-30-opt-in-dist-tag-permissions-for-npm-trusted-publishing/ | GitHub changelog, dist-tag permission | 2026-09-30 | Primary |
| https://docs.npmjs.com/staged-publishing | npm docs, staged publishing | read 2026-11-27 | Primary |
| https://docs.npmjs.com/trusted-publishers | npm docs, trusted publishers | read 2026-11-27 | Primary |
| https://docs.npmjs.com/cli/v12/using-npm/config | npm 12.2.3 config reference | read 2026-11-27 | Primary, defaults |
| https://docs.npmjs.com/cli/v12/commands/npm-approve-scripts | npm approve-scripts doc | read 2026-11-27 | Primary |
| https://github.com/npm/cli/releases | npm CLI releases | 2026-11-17 | Primary, no relevant change |
| https://github.com/pnpm/pnpm/releases | pnpm releases | 2026-11-13 to 11-26 | Primary |
| https://pnpm.io/blog | pnpm release posts | 2026-11 | Primary |
| https://pnpm.io/supply-chain-security | pnpm supply-chain doc | read 2026-11-27 | Primary, defaults |
| https://github.com/yarnpkg/berry/releases | Yarn releases | 2026 | Primary, year inferred |
| https://bun.com/blog | Bun blog | 2026-08-20 to 11-19 | Primary, no supply-chain item |
| https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference | Dependabot options | read 2026-11-27 | Primary |
| https://docs.renovatebot.com/presets-security/ | Renovate security presets | read 2026-11-27 | Primary |
| https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ | TS 7.1 beta | 2026-10-20 | Primary |
| https://github.com/microsoft/typescript-go/releases | typescript-go releases | archived 2026-09-01 | Primary |
| https://nodejs.org/api/packages.html | Node packages doc | read 2026-11-27 | Primary |
| https://nodejs.org/en/blog/release | Node release list | 2026-11 | Primary, partial |
| https://github.com/publint/publint/releases | publint releases | 2026-08 to 10 | Primary |
| https://github.com/arethetypeswrong/arethetypeswrong.github.io/releases | attw releases | 2026-05-29 latest | Primary |

Search-only (not opened, used for dates marked above): the 2026-07-14 Dependabot changelog, the 2026-09-03 changelog, Socket and GCN on npm 12. Failed: Hacker News pages (HTTP 403), github.blog Dependabot label page (empty).

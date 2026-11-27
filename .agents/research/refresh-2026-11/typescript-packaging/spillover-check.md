---
title: typescript-packaging spillover check from typescript-quality
target: typescript-packaging
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.74.0
  - https://registry.npmjs.org/@typescript-eslint/typescript-estree/8.74.0
  - https://registry.npmjs.org/typescript (dist-tags)
  - https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation
  - https://tanstack.com/blog/npm-supply-chain-compromise-postmortem
  - https://raw.githubusercontent.com/npm/cli/latest/CHANGELOG.md
  - https://nodejs.org/dist/index.json
  - https://raw.githubusercontent.com/nodejs/Release/main/schedule.json
  - https://nodejs.org/en/about/previous-releases
  - https://github.com/tj/commander.js/releases/tag/v15.0.0
  - https://registry.npmjs.org/commander/15.0.0
---

Target file: /home/mherwig/dev/ocx-sh/grimoire-lore/rules/typescript-packaging.md (no reference skill). Origin pipeline: typescript-quality.

## 1. typescript-eslint 8.74.0 peer range and the optional @typescript/native peer

Verdict: confirmed by primary source (registry metadata). One sub-claim could not be confirmed on the release page: the GitHub release page for v8.74.0 (2026-11-23) does not mention the peer change. The registry record for `@typescript-eslint/typescript-estree@8.74.0` has `peerDependencies.typescript = ">=4.8.4 <6.1.0"` and an optional `@typescript/native` alias peer (`npm:typescript@>=7.1.0-dev.20261009.1 || >=7.1.0-beta <7.1.0-dev`). The `EXPERIMENTAL_backend` option (8.73.0, 2026-11-16) comes from the origin artifact's reading of the v8.73.0 release notes and was not re-fetched here. `npm view typescript dist-tags` on 2026-11-27: latest 7.0.2, beta 7.1.0-beta, next 7.1.0-dev.20261127.1. The 2026-10-20 beta date comes from the origin artifact (devblog) and is consistent with the target.

Target: says nothing about the typescript-eslint peer range. The only related text is the compiler-version note, "Compiler versions as of 2026-11-27: TS 7.0.2 is the current stable release (7.1 is in beta since 2026-10-20; assume none of its keys)", which is already correct. The `projectService` bullet ("need `parserOptions.projectService` (or `project`) wired") is also correct.

Smallest change: none required. The item belongs to the typescript-quality TS-TOOL-01 rule.

## 2. Staged publishing, stage-only tokens, and the TanStack case

Verdict: confirmed by primary source for stage-only tokens (GitHub changelog, 2026-09-18: npm CLI 11.15.0+, Node 22.14.0+). The TanStack case is also confirmed by primary source: the TanStack post-mortem (tanstack.com/blog/npm-supply-chain-compromise-postmortem) dates it 2026-05-11, 19:20 to 19:26 UTC, and reports 84 malicious versions across 42 `@tanstack/*` packages, `pull_request_target` plus cache poisoning plus OIDC token extraction from runner memory. The post says the publishes were authenticated through the OIDC trusted-publisher binding. It does not address provenance attestations directly, so "valid provenance" is inferred from the OIDC binding and is not stated by the primary source. The Socket glossary the origin used is secondary.

Target already states the staged-publishing facts. Verbatim from rules/typescript-packaging.md, TS-PKG-16: "A trusted publisher created after 2026-09-03 is stage-only by default, so the job runs `npm stage publish` and a maintainer approves the version with 2FA." and "Staged publishing needs npm CLI 11.15.0+ and Node 22.14.0+ (as of 2026-11-27)." The target does not mention the TanStack case or that valid OIDC authentication does not prove a benign publish.

Smallest change (optional): append to the TS-PKG-16 rationale, "Authenticated OIDC publishing is not proof of a benign publish: in the 2026-05-11 TanStack compromise a poisoned Actions cache let attacker code mint a publish token from runner memory and publish 84 versions through the trusted-publisher binding, which is why approval of the staged version is a human step." Staged publishing itself needs no change.

## 3. npm 12 defaults allow-git and allow-remote to none

Verdict: confirmed by primary source. npm CLI CHANGELOG, 12.0.0 (2026-07-08; first in 12.0.0-pre.1 on 2026-06-19): "allow-git and allow-remote now default to "none"" and "set them to "all" (or "root") to install git or user-supplied tarball-URL dependencies". (Only the first 100000 characters of the changelog were read; the entry was in that part.)

Target: says nothing on the point. A grep for git/tarball dependency text finds only `git ls-files` commands. TS-PKG-01 (install the packed tarball in a sandbox) and the dependency-placement rules do not mention git or tarball-URL dependencies.

Smallest change: none required for packaging correctness. If wanted, add one sentence to TS-PKG-01's rationale: "On npm 12 (2026-07-08) git and tarball-URL dependencies fail to install unless `allow-git` or `allow-remote` is set to `all` or `root`." The item is owned by typescript-quality TS-SEC-13.

## 4. Node 26 is LTS from 2026-10-28; Commander 15 is ESM-only with engines.node >=22.12.0

Verdict: confirmed by primary source. nodejs/Release schedule.json for v26 (codename Lithium): start 2026-05-05, lts 2026-10-28, maintenance 2027-10-20, end 2029-04-30. nodejs.org/dist/index.json marks v26.13.0 (2026-10-28) as the first Lithium LTS release. nodejs.org/en/about/previous-releases lists Node 26 as LTS and Node 25 as End-of-Life. Commander: the v15.0.0 release notes say "Commander 15 is ESM only" and require Node.js v22.12.0 or higher; the date is shown as 29 May without a year (2026 per the origin artifact). The registry record for commander@15.0.0 has `engines.node >=22.12.0` and `type: module`.

Target: TS-PKG-10 says "Node 20 reached end of life on 2026-04-30; its last release shipped 2026-03-24." It is correct and does not mention Node 26 LTS. The only Node 26 mention is in the type-stripped runtime row ("Node 26 removed `--experimental-transform-types`"), which is unaffected. Commander is not mentioned anywhere in the target.

Smallest change: append to the TS-PKG-10 rationale, "Node 26 entered LTS on 2026-10-28 (26.13.0); Node 25 is end of life." Commander needs no change in this rule (it belongs to typescript-quality TS-CLI-04).

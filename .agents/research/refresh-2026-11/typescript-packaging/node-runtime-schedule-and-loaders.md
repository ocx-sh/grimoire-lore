---
title: Node.js runtime schedule, require(esm) and type stripping delta
pair: typescript-packaging
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 7
---

# Node.js runtime schedule, require(esm) and type stripping: delta since 2026-08-29

Baseline: .agents/research/ts-modules/publish-verification.md (2026-08-29). This is a delta; anything not listed below is unchanged.

## Summary

- TS-PKG-10 EOL claim: partly changed. Node 20 is still EOL, but the date needs care. The schedule.json end date for v20 is 2026-04-30; 2026-03-24 is the date of the last v20 release (the "Last updated" column on the previous-releases page). Decide which meaning the rule wants.
- Line status today (2026-11-27): v20 EOL; v22 Maintenance LTS (end 2027-04-30); v24 Maintenance LTS since 2026-10-20 (end 2028-04-30); v26 "Lithium" Active LTS since 2026-10-28 (maintenance 2027-10-20, end 2029-04-30); v25 EOL (2026-06-01); v27 is Alpha.
- previous-releases URL is still the canonical schedule page.
- engines advisory claim: unchanged.
- TS-PKG-11 thresholds 20.19.0 / 22.12.0: still stand. Top-level await under require() is still rejected with ERR_REQUIRE_ASYNC_MODULE.
- Strip-types flag: obsolete as a requirement. Type stripping is on by default and Stable. The docs do not mention --experimental-strip-types at all.

## Findings

### 1. TS-PKG-10: EOL claim and URL

Status: changed (nuance on the date; line status table moved on).

Old text: "Node 20 reached EOL on 2026-03-24."

Facts read:
- [schedule.json](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json): v20 end 2026-04-30; v22 maintenance 2025-10-21, end 2027-04-30; v24 lts 2025-10-28, maintenance 2026-10-20, end 2028-04-30; v25 end 2026-06-01; v26 start 2026-05-05, lts 2026-10-28, maintenance 2027-10-20, end 2029-04-30.
- [previous-releases](https://nodejs.org/en/about/previous-releases): v20 shows EOL with "Last updated" Mar 24, 2026; v22, v24, v26 show LTS; v25 EOL; v27 Alpha (first released Oct 29, 2026). The page has no end-date column, only status and last-updated. The 2026-03-24 date in the rule is therefore the last v20 release, not the scheduled end. Both dates are before today, so the conclusion (v20 is EOL) holds.
- Changes inside the window: v24 entered Maintenance LTS on 2026-10-20; v26 entered Active LTS on 2026-10-28; v27 alpha started 2026-10-29 to 2026-11-12 (blog listing). The page states Node 27 onward follows an annual cycle (six months Current after six months Alpha, then LTS).
- The URL nodejs.org/en/about/previous-releases is still the canonical page; machine-readable source is the nodejs/Release schedule.json.

Suggested replacement wording: "Node 20 is end of life (scheduled end 2026-04-30, last release 2026-03-24). Node 22 and 24 are Maintenance LTS; Node 26 is Active LTS." Better still, state no dates and let the verification URL carry them, because lines change status twice a year.

### 2. TS-PKG-10: "engines.node is advisory-only without engine-strict"

Status: unchanged. [npm package.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines): "Unless the user has set the engine-strict config flag, this field is advisory only and will only produce warnings when your package is installed as a dependency." No Node or npm change to enforcement found.

### 3. TS-PKG-11: require(esm)

Status: unchanged. [modules docs](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require) History: v25.4.0 no longer experimental; v23.5.0, v22.13.0, v20.19.0 no experimental warning by default; v23.0.0, v22.12.0, v20.19.0 no longer behind --experimental-require-module. Added in v22.0.0, v20.17.0. No new backport or stability change beyond v25.4.0.

Note on exactness: the warning-free thresholds are 22.13.0 (not 22.12.0) and 20.19.0 for the "no warning" step; 22.12.0 and 20.19.0 are the "no flag" step. The rule says "unflagged and warning-free from exactly those versions", which is not quite right for 22.12.0: on 22.12.x the experimental warning is still emitted. This is a pre-existing imprecision the baseline already carried; the rule's floor of 22.12.0 is correct for "no flag". Suggest wording: "unflagged from 20.19.0 / 22.12.0, warning-free from 20.19.0 / 22.13.0".

Top-level await: still rejected. Docs: a require()'d module with top-level await anywhere in its graph throws ERR_REQUIRE_ASYNC_MODULE. [errors.md](https://raw.githubusercontent.com/nodejs/node/main/doc/api/errors.md): error code unchanged; changed in v26.5.0 and v24.20.0 (PR 64260) to add `requireStack` and `topLevelAwaitLocations` properties (the latter populated with --experimental-print-required-tla). This is additive diagnostics only. Date of that upstream change was not determined (the page gives versions, not dates).

### 4. Type stripping

Status: changed in meaning for the rule's "type-stripped runtime row".

[typescript docs](https://nodejs.org/api/typescript.html) History: v26.0.0 removed --experimental-transform-types; v25.2.0 and v24.12.0 type stripping Stable; v24.3.0 and v22.18.0 no experimental warning; v23.6.0 and v22.18.0 enabled by default; v22.7.0 added --experimental-transform-types. Stability: 2 - Stable. Added in v22.6.0. The only flag documented is --no-strip-types (to disable). --experimental-strip-types is not mentioned. [v26.0.0 release notes](https://nodejs.org/en/blog/release/v26.0.0) confirm the transform-types removal (PR 61803).

Per supported line: v22 (22.18.0 and later) unflagged, no warning, default on; Stable only from 24.12.0/25.2.0, so v22 is "enabled by default, no warning" but its docs label comes from the current page; v24 (24.12.0+) Stable; v26 Stable, transform flag removed. Below 22.18.0 / 24.3.0 the old flag or warning still applies, but those are outdated patch versions on supported lines. Node 20 never supported it.

Constraint that remains: only erasable TypeScript syntax runs; enums, namespaces and parameter properties need transformation, and the transform flag is gone in v26, so do not name it.

Recommended replacement for the strip-types row, naming behaviour rather than a flag: "Node 22.18+ / 24+ / 26 runs `.ts` files natively by erasing types (type stripping, on by default, no flag; disable with `--no-strip-types`). It runs erasable syntax only and does no type checking; `--experimental-transform-types` no longer exists as of Node 26." The rule should name the runtime behaviour and the version, not a flag.

## Normative guidance candidates

1. Rule text must not require `--experimental-strip-types`; describe type stripping as default-on from 22.18.0 / 24.3.0. Rationale: the flag is obsolete and an agent following it would pass a dead flag. Verify: `grep -n 'experimental-strip-types' rules/typescript-packaging.md` returns nothing.
2. Never cite `--experimental-transform-types`. Rationale: removed in v26.0.0. Verify: same grep for that flag name.
3. Split the 22.12.0 warning claim: "unflagged from 22.12.0, warning-free from 22.13.0". Verify: compare against the modules docs History table.
4. TS-PKG-10 states Node 20 EOL with the schedule.json end date 2026-04-30, or drops the date. Verify: `curl -s https://raw.githubusercontent.com/nodejs/Release/main/schedule.json | jq '.v20.end'`.

## AI-agent angle

- An LLM trained earlier will emit `node --experimental-strip-types` or `--experimental-transform-types`; check with the greps above.
- It will assume Node 20 is supported LTS or Node 25 is Current; check `jq` on schedule.json.
- It may claim require(esm) still experimental; check the History table.

## Contested / evolving

- Node 27 onward moves to an annual release cycle with Alpha then Current phases (per previous-releases page, as of 2026-11-27); the "even versions are LTS" mental model changes.
- Dual-publish guidance is converging on "just require() ESM"; no regression found.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/nodejs/Release/main/schedule.json | Release schedule data | read 2026-11-27 | Authoritative dates |
| https://nodejs.org/en/about/previous-releases | Status table | read 2026-11-27 | Canonical URL and status |
| https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require | require(esm) docs and History | read 2026-11-27 | Thresholds, TLA |
| https://nodejs.org/api/typescript.html | Type stripping docs and History | read 2026-11-27 | Flag status |
| https://raw.githubusercontent.com/nodejs/node/main/doc/api/errors.md | Error codes | read 2026-11-27 | ERR_REQUIRE_ASYNC_MODULE |
| https://nodejs.org/en/blog/release/v26.0.0 | v26.0.0 release notes | 2026-05 | Transform-types removal |
| https://nodejs.org/en/blog/release | Release post listing | read 2026-11-27 | Window releases (page 1 only; v26.13.1, v24.22.3, v22.23.5 on 2026-11-11; v27 alphas 2026-11-12 to 2026-11-26) |
| https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines | npm engines | read 2026-11-27 | engine-strict advisory claim |

Not checked: per-release blog posts for 22.x, 24.x, 25.x in Aug 29 to Nov 10 (only listing page 1 and v26.0.0 read); the exact dates of v26.5.0/v24.20.0.

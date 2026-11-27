---
title: TypeScript and JS tooling delta for the code-docs pair, 2026-09-27 to 2026-11-27
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 22
---

# TypeScript and JS tooling delta for code-docs

This is a delta update against research stamped 2026-09-27. Only changes are reported. Where a claim was checkable by running it, it was re-run on 2026-11-27 in a scratch project (Node 26.13.1, typescript 7.0.2 and 7.1.0-beta, vitest 5.1.2, commander 15.1.0, Stryker 10.1.1). Package dates come from `npm view <pkg> time --json`.

## Summary

- The TypeScript version stamp does not need to move. npm `latest` is still 7.0.2; 7.1.0-beta (2026-10-20) is a beta, and the RC is expected "in about a month" with no date.
- The Stryker workaround is not droppable, and it is now incomplete. `npx --yes` still fails with `ERR_MODULE_NOT_FOUND`. A project install also crashes on TypeScript 7 whenever a `tsconfig.json` exists: `TypeError: ts.parseConfigFileTextToJson is not a function`. This is a new failure mode to add.
- commander moved 14 to 15.1.0 (15.0.0 on 2026-05-29, before the window; 15.1.0 on 2026-11-07). The `helpInformation()` walk still works unchanged on 15.1.0.
- Vitest moved to 5.x (5.1.2, 2026-11-25). `npx vitest run -t "$NAME"` still works. Stryker's vitest-runner supports Vitest 5 from 10.1.0 (2026-10-23).
- Everything else is unchanged: typescript-eslint rule behaviour, TypeDoc (no release in the window), the two schema generators' existence, the VS Code and GitHub Action manifest keys.

## Verdicts per claim

### 1. guards.md "Measured 2026-09-27 against ... TypeScript 7.0.2"
Verdict: unchanged. `npm view typescript dist-tags` on 2026-11-27 gives `latest` 7.0.2, `beta` 7.1.0-beta, `next` 7.1.0-dev.20261127.1. The stamp stays at 7.0.2.
Optional addition: `npx tsc --noEmit` also exits 0 on 7.1.0-beta in the scratch project. 7.1 beta notes say distributive type parameters are stricter and DOM types changed, so a real project may see new errors there.
Source: https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ (2026-10-20); npm registry for `typescript`.

### 2. guards.md owner commands `npx tsc --noEmit` and `npx vitest run -t "$NAME"`
Verdict: unchanged. Both ran green on tsc 7.0.2, tsc 7.1.0-beta and vitest 5.1.2. `-t "add works"` ran 1 test and skipped the other.
Source: scratch run, 2026-11-27. Vitest 5.1.2 published 2026-11-25 (npm).

### 3. guards.md GRD-09 TypeScript row: `switch-exhaustiveness-check` "optional and needs typed linting first"
Verdict: unchanged. The rule source still sets `requiresTypeChecking: true` and is not listed in `configs/flat/strict-type-checked.ts` on main. typescript-eslint 8.71.0 (2026-09-28) only changed its literal-case sort order. Latest is 8.74.0 (2026-11-23).
Side facts: 8.73.0 (2026-11-16) added experimental `projectService.EXPERIMENTAL_backend` for TypeScript 7.1; the normal `typescript` peer range is still `<6.1.0` (from the sibling typescript-quality delta, not re-fetched here).
Sources: https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.71.0 ; https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0 ; https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/packages/eslint-plugin/src/rules/switch-exhaustiveness-check.ts

### 4. surfaces.md "typescript-go ... render the whole doc block on hover"
Verdict: could not determine. The 7.1 beta post says nothing about hover or JSDoc display, and no typescript-go release note about hover was found in the window. No change is evidenced; keep the claim, which was measured at 7.0.2.
Source: https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/

### 5. surfaces.md SRF-03 commander walk
Verdict: unchanged. `helpInformation()` on the program and on each `c.commands` entry, with `.description()` and `.summary()`, ran correctly on commander 15.1.0 with the test written in the TS example (vitest 5.1.2, ESM). commander 15.0.0 (2026-05-29, before the window) is ESM-only and needs Node 22.12 or newer; 15.1.0 (2026-11-07) has only fixes, including "preserve the help option's group when a conflicting flag is hidden". Nothing there changes the walk.
Optional note: a CommonJS test setup may need configuration for ESM-only commander 15; commander 14 is kept in security maintenance to May 2027.
Source: https://raw.githubusercontent.com/tj/commander.js/master/CHANGELOG.md

### 6. surfaces.md generator row "ts-json-schema-generator, typescript-json-schema"
Verdict: changed (maintenance status refined; both still exist, neither is archived).
- ts-json-schema-generator (vega): 2.10.0 published 2026-11-20, so it is actively maintained. Its peer range is `typescript >=5.9 <7`. A separate `native` dist-tag, `3.0.0-native.6` (2026-10-02, prerelease), describes itself as "native TypeScript 7 CLI" and has no `dependencies`. This is the successor for TypeScript 7, still a prerelease.
- typescript-json-schema (YousefED): latest 0.68.0 published 2026-07-14, last push 2026-07-14, not archived, `typescript ~5.9.3` as a dependency. It has no TypeScript 7 path and shows no activity in the window.
Replacement wording for the row: "ts-json-schema-generator (maintained; TypeScript 5.9 and 6 only, with a `native` prerelease for TypeScript 7), typescript-json-schema (quiet since 2026-07, pinned to TypeScript 5.9)". The detection rule is unchanged, since both read JSDoc.
Sources: `npm view ts-json-schema-generator` and `typescript-json-schema` (time, peerDependencies, dependencies, dist-tags); GitHub repo metadata for vega/ts-json-schema-generator and YousefED/typescript-json-schema.

### 7. surfaces.md SRF-04 "TypeDoc ... split at the first blank line and truncate nothing"
Verdict: unchanged, with one precision. TypeDoc has no release in the window (latest 0.28.20, 2026-07-05; its TypeScript peer range tops out at 6.0.x, so TypeDoc does not support 7). In 0.28.20 source, `Comment.getShortSummary(useFirstParagraph)` returns the `@summary` tag if present, else the text up to the first blank line (`\n\n`), or a code part containing a newline. No character truncation. It applies to module and namespace listing pages.
Optional addition to the row: TypeDoc honours an explicit `@summary` tag, which overrides the first-paragraph split.
Source: typedoc@0.28.20 package `dist/models.js` `getShortSummary` (read from the npm tarball); https://raw.githubusercontent.com/TypeStrong/typedoc/master/CHANGELOG.md

### 8. surfaces.md VS Code row: `contributes` command titles, `markdownDescription`, `enumDescriptions`
Verdict: unchanged. The contribution-points page still documents command `title`, setting `description`, `markdownDescription`, `enumDescriptions`, and `markdownEnumDescriptions` (takes precedence over `enumDescriptions` when both are set). It also documents `deprecationMessage` and `markdownDeprecationMessage`. No recent-change note was found; the last 4453 characters of the page were not read.
Optional addition: `markdownEnumDescriptions` and the deprecation messages are also user-visible strings.
Source: https://code.visualstudio.com/api/references/contribution-points

### 9. surfaces.md GitHub Action row: `action.yml` `description`, input and output `description`
Verdict: unchanged. Action `description`, `inputs.<id>.description` and `outputs.<id>.description` are all required keys. Input `deprecationMessage` also exists (a user-visible string logged as a warning). `runs.using` allows `node20`, `node24`, `composite`, `docker`.
Optional addition: add input `deprecationMessage` to the surfaces listed.
Source: https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax

### 10. routing.md RTE-06 Stryker workaround
Verdict: changed (the install advice holds, but a new failure mode exists, and the `npx --yes` failure is reconfirmed).
Old text: "install Stryker into the project (`npm install --no-save @stryker-mutator/core @stryker-mutator/vitest-runner`); `npx --yes` fails with `ERR_MODULE_NOT_FOUND: typescript`."
New facts, all from scratch runs on 2026-11-27 with Stryker 10.1.1 (published 2026-10-23, Node 22 or newer):
- `npx --yes @stryker-mutator/core run` still fails with `ERR_MODULE_NOT_FOUND`, raised in `ts-config-preprocessor.js` while importing `typescript`. The workaround cannot be dropped.
- Project install with typescript 6.0.3 and a `tsconfig.json`: runs, mutation score 100 on the sample.
- Project install with typescript 7.0.2 and a `tsconfig.json` present: crashes with `TypeError: ts.parseConfigFileTextToJson is not a function`. Same on 7.1.0-beta. With the `tsconfig.json` moved away, the run succeeds on 7.0.2.
- Upstream tracks this in open issues [6110](https://github.com/stryker-mutator/stryker-js/issues/6110) (TypeScript 7 migration strategy) and [6111](https://github.com/stryker-mutator/stryker-js/issues/6111) (tsconfig preprocessing relies on TypeScript 6 API), and open PR [6231](https://github.com/stryker-mutator/stryker-js/pull/6231) (opened 2026-09-25), which is not merged. The typescript-checker's TypeScript 7 support is experimental (10.0.0, 2026-08-14).
- Note: run the project-local binary, `./node_modules/.bin/stryker run`. A bare `npx stryker` after the `--no-save` install resolved the unrelated old `stryker` package in the scratch run.
- Vitest 5 support: vitest-runner 10.1.0 (2026-10-23) "support vitest v5"; peer `vitest >=2.0.0`. A Vitest 5 per-test filter bug (issue 6263, "every mutant survives with 0 tests run") is closed.
- The `vitest.configFile` advice was exercised with a config whose `include` named only the target test, and worked.
Replacement wording: "install Stryker into the project (`npm install --no-save @stryker-mutator/core @stryker-mutator/vitest-runner`) and run `./node_modules/.bin/stryker run`; `npx --yes` fails with `ERR_MODULE_NOT_FOUND: typescript`. On TypeScript 7 a `tsconfig.json` makes Stryker 10.1.1 crash with `ts.parseConfigFileTextToJson is not a function`: install `typescript@6` beside it with `--no-save` or run from a directory without a `tsconfig.json`. Set `mutate` ..." The remaining sentences stay.
Verification: the three commands above in a scratch project; the check is a Stryker run that prints a mutation score table rather than a stack trace.
Date of upstream change: 2026-10-23 (10.1.0 Vitest 5 support); the TS 7 gap is open as of 2026-11-27.
Sources: https://raw.githubusercontent.com/stryker-mutator/stryker-js/master/CHANGELOG.md ; the GitHub issue and PR pages above; `npm view @stryker-mutator/core peerDependencies dependencies`.

## Candidate normative changes

None new. The Stryker row in routing.md is a factual tool note, not a rule. If the owner wants a rule, the verification is the scratch run in verdict 10.

## Not determined

- Whether typescript-go hover output changed at 7.1 (verdict 4).
- The last 4453 characters of the VS Code contribution-points page (verdict 8).
- The date a Stryker release will fix the TypeScript 7 tsconfig crash.

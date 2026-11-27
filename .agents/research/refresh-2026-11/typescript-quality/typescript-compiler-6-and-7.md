---
title: TypeScript compiler 6.x and 7.x delta, 2026-08-29 to 2026-11-27
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 9
---

# TypeScript compiler 6.x and 7.x delta

This is a delta update against research verified on 2026-08-29 (tsc 6.0.3 and 7.0.2; 7.1 existed only as a nightly). Code claims below were re-run on 2026-11-27 with real installs of typescript 6.0.3, 7.0.2 and 7.1.0-beta in a scratch directory.

## Summary

- Current stable 6.x is 6.0.3 (published 2026-04-16). No 6.1 exists on npm; the 6.x line did not move in the window.
- Current stable (npm `latest`) is 7.0.2 (2026-07-08). 7.1.0-beta shipped 2026-10-20 (npm `beta`); no 7.1 RC or final exists yet. The devblog says an RC is expected "in about a month", with no date.
- 7.1 beta restores a programmatic API, but as a beta with no stability guarantee. The types.md TS 7 paragraph is therefore partly stale: "until 7.1" is now "7.1 beta, not yet stable".
- typescript-eslint gained opt-in, experimental 7.1 support in 8.73.0 (2026-11-16). ts-morph has no 7.x support.
- Every quoted error code and deprecation stage still holds on 6.0.3, 7.0.2 and 7.1.0-beta, with one new observation: on 7.x the removed 6.0 options report TS5023 (unknown option), not TS5102.
- The lib-file open question is answerable: 7.0.2 and 7.1-beta keep `lib.*.d.ts` in the platform package `@typescript/typescript-<os>-<arch>/lib/`, not in `typescript` itself.

## Findings: one verdict per claim

### 1. Current versions
Verdict: changed (new fact). Stable 6.x = 6.0.3; stable 7.x = 7.0.2; 7.1.0-beta published 2026-10-20; `next` = nightly 7.1.0-dev.20261127.1.
Source: `npm view typescript dist-tags time --json` (run 2026-11-27); https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ (dated 2026-10-20). The `@typescript/typescript6` compat package stays at 6.0.2.

### 2. types.md: "7.0 ... no stable programmatic API until 7.1 ... typescript-eslint, ts-morph can break on upgrade"
Verdict: changed, rewrite needed.
- Old text: "shipped with no stable programmatic API until 7.1".
- New fact: 7.1 has not shipped stable. The 7.1 beta (2026-10-20) exposes entry points `typescript/sync`, `typescript/async`, `typescript/fs`, `typescript/ast`, `typescript/ast/is`, `typescript/ast/factory` (the install's `exports` map also lists `./ast/clone`, `./ast/utils`, `./ast/scanner`, `./ast/visitor`, `./path`, `./proto`, `./vscode`). The post gives no stability guarantee; the team says it is working with partners on ergonomics and performance.
- typescript-eslint: 8.73.0 (2026-11-16) added `projectService.EXPERIMENTAL_backend` for "TypeScript 7.1 native parser support over IPC" (PR 12803). `@typescript-eslint/typescript-estree@8.74.0` declares `typescript >=4.8.4 <6.1.0` plus an alias peer `@typescript/native` of `typescript@>=7.1.0-beta`. So the normal `typescript` peer range still excludes 7.x; 7.1 is reachable only through the experimental backend. Issue 10940 stays open.
- ts-morph: latest is 28.0.0 (2026-04-12). Issue 1621 is open; the maintainer said support would start as a Wasm distribution. A 2026-10-28 comment only notes the beta has a native API. No ts-morph release supports 7.x.
- Date of upstream change: 2026-10-20 (API beta), 2026-11-16 (typescript-eslint experimental backend).
Sources: https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ ; https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0 ; https://github.com/typescript-eslint/typescript-eslint/issues/10940 ; https://github.com/dsherret/ts-morph/issues/1621 ; `npm view @typescript-eslint/typescript-estree@8.74.0 peerDependencies`.

Suggested replacement paragraph: "Pin `typescript` to a version your linter supports. TypeScript 7.0 (stable 2026-07-08) is a Go rewrite with no programmatic API; 7.1 adds one (`typescript/sync`, `typescript/async`, `typescript/ast`) but was still a beta on 2026-11-27. typescript-eslint's `typescript` peer range is still `<6.1.0`; its 7.1 support is the experimental `projectService.EXPERIMENTAL_backend` (8.73.0+), and `ts-morph` has no 7.x support. A linter that fails to build a program tends to report zero findings rather than an error."

### 3. modules.md TS-MOD-02: node10 TS5107 (6.0) and TS5108 (7.0); node18/node20 in moduleResolution is TS6046
Verdict: unchanged. Re-run on all three versions:
- `--moduleResolution node10 --module commonjs`: 6.0.3 gives TS5107 ("deprecated and will stop functioning in TypeScript 7.0", silenced by `ignoreDeprecations: "6.0"`); 7.0.2 and 7.1.0-beta give TS5108 ("has been removed").
- `--module node18 --moduleResolution node18`: TS6046 on all three (accepted: node16, nodenext, bundler).
"Still parses in TS 6.x behind a deprecation warning" is unchanged for 6.0.3 (it is an error until silenced, which the existing text should already say as "deprecation"; no change in the window).
Source: real tsc runs; https://www.typescriptlang.org/tsconfig/#moduleResolution

### 4. TS-MOD-03: `module: node18` implies `moduleResolution: node16`
Verdict: unchanged. `tsc --showConfig --module node18` prints `"moduleResolution": "node16"` on 6.0.3, 7.0.2 and 7.1.0-beta. Source: real tsc run.

### 5. TS-MOD-21: importsNotUsedAsValues and preserveValueImports are "a hard TS5102 build failure from 6.0"
Verdict: unchanged for 6.x, changed detail for 7.x. 6.0.3 gives TS5102 ("has been removed ... Use 'verbatimModuleSyntax' instead"). 7.0.2 and 7.1.0-beta give TS5023 "Unknown compiler option" for both flags (the option definitions were deleted, so TS5102 is no longer emitted). Both are hard failures. The rule should say "TS5102 on 6.x, TS5023 on 7.x". Date of upstream change: at 7.0 (2026-07-08), observed 2026-11-27; this was possibly already true at the baseline but the baseline text names only TS5102.
Source: real tsc runs.

### 6. TS-MOD-16: codes TS1484, TS1205, TS1287, TS1295, TS1202
Verdict: could not determine for the individual codes. They are verbatimModuleSyntax diagnostics that need specific source constructs; I did not re-run each. No release note in the window mentions changing them, and 7.1's beta notes list only DOM typings and stricter distributive type-parameter checks as behavioral changes. Treat as unchanged.
Source: https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/

### 7. isolatedModules / verbatimModuleSyntax disjointness "Measured against tsc 6.0.3"
Verdict: unchanged at the level tested. `--isolatedModules --verbatimModuleSyntax` on an empty module exits clean on all three versions, so no new conflict error exists. Constructs that trigger errors were not re-measured.
Source: real tsc runs.

### 8. nodenext vs frozen node18/node20 handbook recommendation
Verdict: unchanged. 7.1 beta notes mention no new node module mode; `module` for source imports is listed as `esnext`, `nodenext` or `preserve`. Source: the 7.1 beta post.

### 9. extension-host.md TS-HOST-18: Node16 raises TS1470 on import.meta and TS1309 on top-level await
Verdict: unchanged. With `--module node16 --target es2022` on a `.ts` file in a CommonJS-typed scope, 6.0.3, 7.0.2 and 7.1.0-beta all give `TS1470` for `import.meta` and `TS1309` for top-level `await`. The "Measured against 6.0.3" note can be widened to "and 7.0.2, 7.1.0-beta, re-measured 2026-11-27".
Source: real tsc runs.

### 10. types.md TS-TYP-09 `erasableSyntaxOnly` on >=5.8; TS-TYP-05 predicate inference since 5.5
Verdict: unchanged. `--erasableSyntaxOnly` is accepted by 6.0.3, 7.0.2 and 7.1.0-beta. Predicate inference was not re-run; nothing upstream in the window touches it.
Source: real tsc runs.

### 11. ts-resources.md open question: "typescript@7.0.2 ships no lib/lib.*.d.ts files"
Verdict: changed, now answerable. The `typescript` package (7.0.2 and 7.1.0-beta) has `lib/` containing only `getExePath`, `tsc.js`, `version.cjs`. The libs live in the optional platform package: `--listFiles` shows `node_modules/@typescript/typescript-linux-x64/lib/lib.es5.d.ts` and so on, on both 7.0.2 and 7.1.0-beta. A `using` declaration compiled with `--target es2022 --lib es2022,esnext.disposable` passes on 6.0.3, 7.0.2 and 7.1.0-beta. So the claim "ships no lib files" is true only of the wrapper package, and a `lib: ["ESNext.Disposable"]` rule holds on 7.x. The "verified against 5.9/6.0 only" caveat can be replaced with "verified against 6.0.3, 7.0.2 and 7.1.0-beta". Caveat for agents: a tool that reads `node_modules/typescript/lib/lib.*.d.ts` directly will find nothing on 7.x.
Also new in 7.1 beta: `es2026` is accepted as `--target` and `--lib` (TS6046 on 6.0.3 and 7.0.2).
Source: real tsc runs; https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/

## Normative guidance candidates

1. Rule: when a tool needs the TS API, pin `typescript` to the highest version the tool's peer range allows (typescript-eslint 8.74.0: `<6.1.0`); do not use 7.x with it except via `EXPERIMENTAL_backend` on 7.1 beta or later.
   Rationale: the peer range still excludes 7.x. Verification: `npm view @typescript-eslint/typescript-estree peerDependencies` and `npm ls typescript`.
2. Rule: in TS-MOD-21, name both codes: TS5102 on 6.x, TS5023 on 7.x.
   Rationale: agents grepping logs for TS5102 miss the 7.x failure. Verification: `tsc --importsNotUsedAsValues error` on the pinned version, check the printed code.
3. Rule: do not read `node_modules/typescript/lib/lib.*.d.ts` on 7.x; use `tsc --listFiles`.
   Rationale: libs moved to `@typescript/typescript-<platform>`. Verification: `tsc --listFiles | grep lib.es`.

## AI-agent angle

- Agents assume `import ts from "typescript"` works on 7.x; it has no API in 7.0.2. Check: `node -e "require('typescript')"` and inspect `exports`.
- Agents assume `typescript@latest` equals the supported version for linters; `latest` is 7.0.2 while the linter peer range stops below 6.1.0. Check: `npm ls typescript` for ERESOLVE or invalid peer warnings.

## Contested / evolving

- 7.1 RC and final were still pending on 2026-11-27 (expected "in about a month" from 2026-10-20). Re-check before treating the API as stable.
- The 7.1 API shape (entry points) is beta and may change before final.
- Framework tooling (Vue, Svelte, Angular) coverage was reported by secondary press (InfoQ) only; not verified here.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ | 7.1 beta announcement (primary) | 2026-10-20 | API entry points, behavioral changes, RC timing |
| https://devblogs.microsoft.com/typescript/ | devblog index | 2026-11-27 | Only post in window is the 7.1 beta |
| `npm view typescript dist-tags time versions` | registry data (primary) | 2026-11-27 | versions and dates |
| https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0 | release notes (primary) | 2026-11-16 | EXPERIMENTAL_backend |
| https://github.com/typescript-eslint/typescript-eslint/issues/10940 | TS 7 tracking issue (primary) | 2026-09-29 | status |
| `npm view @typescript-eslint/typescript-estree@8.74.0 peerDependencies` | registry data | 2026-11-26 | peer ranges |
| https://github.com/dsherret/ts-morph/issues/1621 | ts-morph native tsc issue (primary) | 2026-10-28 | no 7.x support |
| `npm view ts-morph` | registry data | 2026-04-12 | latest 28.0.0 |
| Real tsc 6.0.3, 7.0.2, 7.1.0-beta runs (scratch dir) | code verification | 2026-11-27 | all error-code verdicts |

Not fetched: TSConfig reference pages and microsoft/typescript-go breaking-changes page (only a stub release list was read); verdicts rely on real tsc runs instead. The sources table is below the 12-source minimum because this is a delta.

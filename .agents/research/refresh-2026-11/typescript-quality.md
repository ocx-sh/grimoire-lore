---
title: typescript-quality delta refresh decision, 2026-08-29 to 2026-11-27
pair: typescript-quality
date: 2026-11-27
window_start: 2026-08-29
model: opus
consolidates:
  - .agents/research/refresh-2026-11/typescript-quality/typescript-eslint-and-eslint-plugins.md
  - .agents/research/refresh-2026-11/typescript-quality/biome-2-5-to-current.md
  - .agents/research/refresh-2026-11/typescript-quality/typescript-compiler-6-and-7.md
  - .agents/research/refresh-2026-11/typescript-quality/node-runtime-and-web-platform.md
  - .agents/research/refresh-2026-11/typescript-quality/test-runners-and-type-testing.md
  - .agents/research/refresh-2026-11/typescript-quality/frontend-bundlers-and-extension-host.md
  - .agents/research/refresh-2026-11/typescript-quality/package-managers-and-npm-libraries.md
  - .agents/research/refresh-2026-11/typescript-quality/recent-shifts-not-yet-covered.md
revises:
  - .agents/research/ts-gate.md
  - .agents/research/ts-async.md
  - .agents/research/ts-modules.md
  - .agents/research/ts-resources.md
  - .agents/research/ts-extension-host.md
  - .agents/research/typescript-tooling-landscape.md
  - .agents/research/typescript-topic-map.md
---

# typescript-quality delta refresh decision

## Contents

- Verdict
- Changed rules
- New rules
- Confirmed unchanged
- Open questions
- Revision log
- Edit list
- Spillover round

## Verdict

- The pair is updated in place, not rewritten. Every existing rule ID keeps its number and meaning. One new rule is added: TS-GATE-20. The next free gate number is 20, because 17 to 19 are already allocated in the gate research consolidation.
- The Biome "silently ignored rule key" trap is withdrawn. Biome v2.5.11 through v2.6.9 abort every command with `Found an unknown key` when a rule key is ungrouped or in the wrong group. TS-GATE-09 keeps its rule but gets a new rationale and verification. The rule file intro, TS-CORE-02, the gate.md Biome intro, the jsonc example and agent item 4 are corrected to match.
- TS-SEC-13 and TS-SEC-14 are corrected in place. The upstream changes landed before the window (pnpm 11.0.0 on 2026-04-28, npm 12.0.0 on 2026-07-08, Yarn 4.15.0 on 2026-05-19), but they contradict the baseline text. The current TS-SEC-13 grep finds a key that pnpm 11 removed, and the TS-SEC-14 grep misses Yarn's key.
- The type-aware rule count moves from 61 to 64 at typescript-eslint 8.74.0. The rule file's "roughly fifty" becomes "more than sixty".
- Biome gains its first `no-unsafe-*` counterpart, `nursery.noUnsafeReturn`, in v2.6.3. TS-GATE-11's "no equivalent to no-unsafe-return" is corrected, and the new rule TS-GATE-20 asks for that rule at `"error"`.
- The TypeScript 7 paragraph in types.md is rewritten. TypeScript 7.1 is a beta with an API and no stability guarantee, and typescript-eslint reaches 7.1 only through an experimental backend.
- These small factual corrections are applied: TS-MOD-21 (TS5023 on 7.x), `vue/no-v-html` severity, `using` support in Safari, the nodejs/node#64406 stale label, the execa dependency count, `@actions/exec` through 3.0.0, the sinon 22 peer trap, Vitest 5 coverage globs and `Temporal` faking, the Mocha loader wording, `rollupOptions` as an alias, and the size-limit 14 preset change.
- Not adopted: agent and editor config files as a worm persistence channel, staged npm publishing, CI action SHA pinning, and an oxlint/tsgolint section. The first three are outside this pair's scope or rest on secondary sources. The oxlint/tsgolint material is not new: the baseline already decided it, and the decision lives in TS-TOOL-02 in the sibling pair. These items are listed as spillover.
- The rule gets a patch bump because it only corrects facts. The reference skill gets a minor bump because of the new rule TS-GATE-20.

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| Rule file intro | "Roughly fifty rules ... need a type checker"; "(or, in Biome, a rule key written outside its group) does not warn" | "More than sixty rules (64 at typescript-eslint 8.74.0)"; the Biome parenthetical is removed | typescript-eslint v8.74.0 rule sources and flat configs; Biome measurement at v2.5.11 to v2.6.9 |
| TS-CORE-02 (rationale) | "a rule inert for want of type information, a Biome key outside its group, a coverage block ..." | the Biome clause is dropped | Biome measurement, `Found an unknown key` |
| TS-CORE-03 (rationale) | "four rules absent after a Biome migration" | "rules absent after a Biome migration" | Biome migrate measurement: a default run ports `useReadonlyClassProperties` |
| gate.md version header | "measured 2026-08-29 against typescript-eslint 8.68.0 and Biome v2.5.11" | "re-measured 2026-11-27 against typescript-eslint 8.74.0 and Biome v2.6.9 (first measured 2026-08-29 ...); the typed-lint cost figure ... was not re-run" | typescript-eslint v8.74.0 release (2026-11-23); Biome v2.6.9 (2026-11-24) |
| TS-GATE-09 (rationale, verification) | "An ungrouped key is silently ignored — not a config error ... compare the diagnostic count" | the key is rejected with `Found an unknown key`; the verification becomes reading that error, then a planted violation that must fire | Biome measurement on 2.5.11, 2.5.15, 2.6.2, 2.6.5 and 2.6.9 |
| TS-GATE-11 (rationale) | no Biome equivalent to five `no-unsafe-*` rules, "at v2.5.11" | four are still missing at v2.6.9; `no-unsafe-return` has `nursery.noUnsafeReturn` since v2.6.3 | https://biomejs.dev/linter/rules/no-unsafe-return/ ; Biome 2.6.3 release body |
| TS-GATE-12 (rationale) | the migration "omits all four" | a default run ports `useReadonlyClassProperties`; `--include-nursery` adds the two promise rules; no flag ports `noUnsafeTypeAssertion`; the rule-sources page still omits all four | Biome migrate measurement on 2.5.11 and 2.6.9; https://biomejs.dev/linter/rules-sources/ |
| TS-GATE-15 (rationale) | "13 of the 61 type-aware rules" | "13 of the 64 type-aware rules" | typescript-eslint v8.74.0 rule sources |
| types.md TS 7 paragraph (sits above TS-TYP-01) | "shipped with no stable programmatic API until 7.1" | 7.1 adds an API but was still a beta on 2026-11-27; the typescript-eslint peer range is still `<6.1.0`, with only the experimental `EXPERIMENTAL_backend`; ts-morph has no 7.x support | https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/ ; typescript-eslint v8.73.0 release; ts-morph issue 1621 |
| TS-MOD-21 (rationale) | "a hard `TS5102` build failure from 6.0" | adds "on 7.x the options fail as `TS5023`" | tsc 7.0.2 and 7.1.0-beta runs |
| TS-SEC-13 | `ignore-scripts=true`, "the equivalent key in `bunfig.toml`", a pnpm allowlist; the grep includes `onlyBuiltDependencies` | the default-deny per-tool allowlists (`allowScripts` for npm 12, `allowBuilds` for pnpm 11, `trustedDependencies` for Bun), `ignore-scripts=true` for npm 11 and older, the removed pnpm keys as a second grep | npm CLI CHANGELOG 12.0.0; https://docs.npmjs.com/cli/v12/commands/npm-install-scripts ; https://github.com/pnpm/pnpm/releases/tag/v11.0.0 ; https://pnpm.io/settings/build ; https://bun.com/docs/pm/cli/install.md |
| TS-SEC-14 | "Yarn and Bun shipping their own flags in late 2025"; "npm and pnpm read `.npmrc`"; the grep misses Yarn | each tool's exact key, file and unit; pnpm on by default from 11.0.0, Yarn on by default from 4.15.0; the grep adds `npmMinimalAgeGate`; empty output is not a violation on pnpm 11+ or Yarn 4.15+ | https://github.com/pnpm/pnpm/releases/tag/v11.0.0 ; https://yarnpkg.com/configuration/yarnrc ; Yarn 4.15.0 release; https://bun.com/docs/runtime/bunfig ; https://docs.npmjs.com/cli/v12/using-npm/config |
| security.md lint block (TS-SEC-10 context) | "vue/no-v-html is already error in eslint-plugin-vue's recommended config" | sets `vue/no-v-html` to `"error"` explicitly, because it is only `warn` in `recommended` | eslint-plugin-vue 10.12.1 and 10.10.0 tarball `dist/configs` |
| resources.md `using` support line (above TS-RES-04) | "as of 2026-08-29 ... Safari has never shipped it." | "as of 2026-11-27 ... No stable Safari has shipped it — BCD lists it for the Safari 27.3 beta (2026-11-11)" | mdn/browser-compat-data `javascript/statements.json`, commit for Safari 27.3 beta (#31050) |
| resources.md nodejs/node#64406 sentence | "is open (filed 2026-07-10, no maintainer response)" | "is open but bot-labelled `stale` on 2026-11-20 (filed ...)" | https://github.com/nodejs/node/issues/64406 |
| TS-RES-18 (rationale) | "`execa@10.0.1` ... ~11 transitive deps" | "`execa@10.2.1` ... 12 direct dependencies" | `npm view execa@10.2.1` |
| TS-ASYNC-05 (rationale) | "`@actions/exec@1.x`'s `ExecOptions`" | "`@actions/exec`'s `ExecOptions` (1.x through 3.0.0)" | `@actions/exec@3.0.0` tarball `ExecOptions` |
| TS-HOST-25 (rule) | "peer range is `sinon@^21` (checked 2026-08-29)" | the same, checked 2026-11-27, plus: npm `latest` sinon is 22.x, so pin `sinon@^21` explicitly | `npm view @golevelup/ts-sinon peerDependencies`; `npm view sinon time` |
| TS-TEST-05 (rule, verification) | "On Vitest 4.0 and later (2025-10-22)" | "..., 5.x included"; verification adds a rerun after the Vitest 5 upgrade because glob matching changed | https://github.com/vitest-dev/vitest/releases/tag/v5.0.0 ; https://vitest.dev/guide/migration ; https://vitest.dev/config/coverage |
| testing.md runner table, Mocha cell | "it has no ESM or TS loader" | "it does not transpile TypeScript itself" | https://mochajs.org/explainers/typescript/ |
| testing.md agent item 8 (TS-TEST-06 context) | microtask APIs only | adds: Vitest 5 fakes `Temporal` by default | https://vitest.dev/guide/migration ; https://vitest.dev/blog/vitest-5.html |
| TS-WEB-14 (rule) | "still works through a compat layer scheduled for removal" | "is a deprecated alias of it, and Vite 8.4.0's docs name no removal version" | https://github.com/vitejs/vite/blob/main/docs/config/build-options.md |
| TS-WEB-09 (rule) | "records how it was measured" | adds: including the `size-limit` major, because 14.0.0 moved preset-small-lib to rolldown | https://github.com/ai/size-limit/releases/tag/14.0.0 |

## New rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| TS-GATE-20 | On Biome v2.6.3 or later, set `nursery.noUnsafeReturn` to `"error"`. Overridable, on the same nursery terms as TS-GATE-10. | It is Biome's first counterpart to a typescript-eslint `no-unsafe-*` rule (source `@typescript-eslint/no-unsafe-return`, `types` domain). Its default severity is `information`, so enabling it with `"on"` is weaker than this rule asks. It covers only the return position, so TS-GATE-11 still holds for the other four. | Block TS-GATE-20 greps `biome.json` for `noUnsafeReturn`. On v2.6.3 or later, empty output is the finding. To prove the rule fires, add `function f(x: string) { return JSON.parse(x); }` to a source file: it must report `lint/nursery/noUnsafeReturn`. | SHOULD |

## Confirmed unchanged

- typescript-eslint: still 25 extension rules that shadow a core rule, and the two renames still stand (TS-GATE-13). The `allowDefaultProject` threshold of 8 and the option name are unchanged. TS-GATE-02 still discovers only the literal `tsconfig.json`. `strict-void-return`, `switch-exhaustiveness-check`, `method-signature-style`, `consistent-type-imports` and `no-import-type-side-effects` are still only in `all`. `checksVoidReturn` still has six sub-options. `ignoreVoid: true` is still the default. ESLint v10 is the current line, and the plugin peer range admits it.
- Plugins: the import-x `resolver-next` wiring (TS-MOD-11), `security.configs.recommended` and its README false-positive concession (TS-GATE-14), `regexp.configs["flat/recommended"]`, `react/no-danger` (in no preset), and `vue/no-v-html` (on by default as a warning, per browser.md) are all unchanged.
- Biome: the groups for `noFloatingPromises`, `noMisusedPromises` and `useThrowOnlyError` are unchanged. The TS-GATE-16 defaults are still 15 and 50. A `types`-domain rule still triggers a full-project scan. The `project`-domain rules, `noImportCycles`, `useImportType` in `auto` style, `suspicious/noConsole` and the `a11y` group are all unchanged.
- TypeScript: TS5107 and TS5108 for `node10`, TS6046 for `node18` and `node20` in `moduleResolution`, `module: node18` implying `node16`, the TS1470 and TS1309 codes under Node16 (TS-HOST-18), and `erasableSyntaxOnly` were all re-run on 6.0.3, 7.0.2 and 7.1.0-beta. The 7.x lib files live in the platform package, and `lib: esnext.disposable` still works there.
- Node: exit semantics, flushing and EPIPE (measured on 24.14.0; nothing in the window changes them). The undici defaults, the `AbortSignal.any` floor, the child_process `timeout` and `maxBuffer` defaults, the node:test stability levels, unsupported type-stripping syntax, and `require(esm)` with `ERR_REQUIRE_ASYNC_MODULE` are unchanged. nodejs/node#40085 is still closed as not planned. oxc#25155 is still open, its fix PR is unmerged, and the dated text stays true.
- `Error.isError` is still not Baseline. Safari support exists only in Technology Preview, so the "not adopted" decision and its date stay.
- Libraries: commander exit behavior was re-measured on 15.1.0 and is unchanged. tree-kill is unchanged. The p-map concurrency default is unchanged. Connect-ES `defaultTimeoutMs` still has no default. Zod 4.6.7 still has no `.errors`. Standard Schema is still implemented by zod, valibot and arktype.
- Frontend: React 19.3.1 still has class-only boundaries and `forwardRef` (there is no React 20). The React Compiler is still 1.0.0. Vite's 500 kB uncompressed chunk default is unchanged. bundlesize is still stale. The Vue async-handler carve-out holds in 3.5.46 and in 3.6.0-rc.17 Vapor. esbuild has had no release since 0.28.2. The VS Code 3000 ms unresponsive constant, `process.exit` and `unhandledRejection` interception, the default `localResourceRoots`, the CSP baseline and Workspace Trust `limited` are all unchanged.
- Testing: the `nextTick`, `queueMicrotask` and `--pool=forks` faking limits, the rule that test-d.ts files never execute without `--typecheck`, the Bun `statements` and lcov-only threshold traps, the Playwright 1.62 component-testing replacement, the expect-type `toMatchTypeOf` deprecation, Mocha's 2000 ms default, and the TS-HOST-26 Proxy auto-vivification are all unchanged.

## Open questions

- TS-GATE-10 cites "~75% of the tsc-backed rule's catch rate". The fetched rule page and the release notes in the window do not state the figure. Nothing contradicts it, so it stays until a primary source is found or the figure is withdrawn.
- The typed-lint cost of 2.0 to 2.2 times was not re-measured after typescript-eslint 8.72.1 changed Program reuse in single-run mode.
- TS-TEST-08 says the browser runner "opens one page per test file". Vitest 5 deprecates `browser.isolate` and opens sessions adaptively. The new isolation model page returned 404, so the claim is unverified and is not changed.
- TS-TEST-04 has two unverified points. The Bun docs may say that no threshold check runs under `--parallel`, but the wording came through a summarising fetch. The claim that singular keys are "accepted and ignored" is not restated in the current docs.
- TS-MOD-11 says the legacy resolver settings are "inert against import-x >= 4.5.0". The current README no longer states this.
- TS-MOD-15 says "Biome has no rule covering this shape". The claim was not re-checked against the new nursery rules in 2.6.x.
- TS-SEC-13 claims an `npm run` gap. That gap is documented for `ignore-scripts` but not documented for npm 12 `allowScripts`.
- TS-SEC-14 defaults: Bun's `minimumReleaseAge` default is `null` in the bunfig table but `259200` in an install-doc block. For Yarn's `npmMinimalAgeGate`, the release note says `1d` and the docs page says `1w`. The rule text claims neither default value.
- TS-ASYNC-09: the `AbortSignal.reason` lib typing was not checked by any delta artifact.
- The Safari 27.3 stable release would set a Safari floor for `using`. Revisit at the next refresh.
- nodejs/node#64406 may auto-close around 2026-12-20. If it does, the resources.md sentence needs another edit.
- The two type-aware typescript-eslint rules that tsgolint does not port are still unnamed.

## Revision log

1. rules/typescript-quality.md: the type-aware count becomes more than sixty (64 at 8.74.0).
2. rules/typescript-quality.md: the false Biome silent-key clause is removed from the intro.
3. rules/typescript-quality.md: the Biome clause is dropped from TS-CORE-02's failure-mode list.
4. rules/typescript-quality.md: TS-CORE-03 drops the count "four" for the Biome migration.
5. gate.md: the version header becomes typescript-eslint 8.74.0 and Biome v2.6.9, and the cost figure is marked as not re-run.
6. gate.md: TS-GATE-15 becomes 13 of 64.
7. gate.md: the Biome intro states that misplaced keys are rejected loudly.
8. gate.md: the jsonc "wrong" comment names the real error.
9. gate.md: TS-GATE-09 gets a new rationale and verification.
10. gate.md: TS-GATE-12 gets the measured migrate behavior.
11. gate.md: the TS-GATE-11 rationale is corrected for `noUnsafeReturn`.
12. gate.md: new rule TS-GATE-20, with its row and its grep block.
13. gate.md: agent item 4 is corrected.
14. types.md: the TS 7 paragraph is rewritten for the 7.1 beta.
15. modules.md: TS-MOD-21 names TS5023 on 7.x.
16. security.md: `vue/no-v-html` is set to `"error"` explicitly in the lint block.
17. security.md: TS-SEC-13 is rewritten for npm 12, pnpm 11 and Bun default-deny.
18. security.md: TS-SEC-13 is split into blocks (1) and (2).
19. security.md: TS-SEC-14 gets the per-tool keys, files, units and defaults.
20. security.md: the TS-SEC-14 grep adds `npmMinimalAgeGate`.
21. security.md: two sources are added for the new allowlists.
22. resources.md: the `using` support line is corrected for the Safari 27.3 beta.
23. resources.md: the #64406 stale label is added.
24. resources.md: TS-RES-18 gets the execa version and dependency count.
25. async.md: TS-ASYNC-05 covers `@actions/exec` 1.x through 3.0.0.
26. extension-host.md: TS-HOST-25 gets the sinon 22 peer pin.
27. testing.md: TS-TEST-05 covers 5.x.
28. testing.md: TS-TEST-05 verification adds the Vitest 5 glob rerun.
29. testing.md: the Mocha table cell wording is corrected.
30. testing.md: agent item 8 adds `Temporal` faking.
31. browser.md: TS-WEB-14 describes `rollupOptions` as a deprecated alias.
32. browser.md: TS-WEB-09 records the size-limit major.
33. modules.md (spillover round): the TS-MOD-12 biome.json comment no longer claims the rule name alone is a no-op.
34. modules.md (spillover round): TS-MOD-12 gets the corrected scan mechanism in its rationale and moves from MUST to SHOULD.
35. modules.md (spillover round): agent item 6 is reworded to match the corrected TS-MOD-12.

## Edit list

Each entry gives a file, the exact text to find (it occurs once in that file), and the exact replacement. Fences are `~~~~` so the payload can contain triple backticks.

### 1. rules/typescript-quality.md

Find:
~~~~text
first.** Roughly
fifty rules, including the whole `no-unsafe-*` family,
~~~~
Replace:
~~~~text
first.** More than
sixty rules (64 at typescript-eslint 8.74.0), including the whole `no-unsafe-*` family,
~~~~

### 2. rules/typescript-quality.md

Find:
~~~~text
default**. A config without `parserOptions.projectService` (or, in Biome, a
rule key written outside its group) does not warn that those rules are
inert — it just never fires them, and inert is indistinguishable from clean.
~~~~
Replace:
~~~~text
default**. A config without `parserOptions.projectService` does not warn
that those rules are inert — it just never fires them, and inert is
indistinguishable from clean.
~~~~

### 3. rules/typescript-quality.md

Find:
~~~~text
a rule inert for want of type information, a Biome key outside its group, a coverage block whose keys the runner does not read.
~~~~
Replace:
~~~~text
a rule inert for want of type information, a coverage block whose keys the runner does not read.
~~~~

### 4. rules/typescript-quality.md

Find:
~~~~text
four rules absent after a Biome migration are each *the finding*
~~~~
Replace:
~~~~text
rules absent after a Biome migration are each *the finding*
~~~~

### 5. skills/typescript-quality-reference/gate.md

Find:
~~~~text
Version-bound claims below were measured 2026-08-29 against
typescript-eslint 8.68.0 and Biome v2.5.11. Rule group membership and preset
~~~~
Replace:
~~~~text
Version-bound claims below were re-measured 2026-11-27 against
typescript-eslint 8.74.0 and Biome v2.6.9 (first measured 2026-08-29 against
8.68.0 and v2.5.11); the typed-lint cost figure under One Command is the
2026-08-29 measurement and was not re-run. Rule group membership and preset
~~~~

### 6. skills/typescript-quality-reference/gate.md

Find:
~~~~text
13 of the 61 type-aware rules ship in no preset at all
~~~~
Replace:
~~~~text
13 of the 64 type-aware rules ship in no preset at all
~~~~

### 7. skills/typescript-quality-reference/gate.md

Find:
~~~~text
Caught by `biome lint` and by reading `biome.json`. The trap is that Biome
accepts a misplaced rule key without complaint: a "clean" run after an edit is
not evidence the edit took effect.
~~~~
Replace:
~~~~text
Caught by `biome lint` and by reading `biome.json`. Biome rejects a misplaced
rule key loudly — every command aborts with `Found an unknown key` — so the
trap is the group lookup, not silence: a rule's group cannot be derived from
its name.
~~~~

### 8. skills/typescript-quality-reference/gate.md

Find:
~~~~text
// wrong — silently ignored, no validation error, lint stays green
~~~~
Replace:
~~~~text
// wrong — every command aborts: "Found an unknown key"
~~~~

### 9. skills/typescript-quality-reference/gate.md

Find:
~~~~text
| An ungrouped key is silently ignored — not a config error. ESLint's flat rule namespace trains exactly the wrong reflex, so the tell is a lint run showing zero new diagnostics after "enabling" a rule, never a validation failure. | Run `biome lint` before and after the edit and compare the diagnostic count. An unchanged count means the key did not take. |
~~~~
Replace:
~~~~text
| Biome validates every rule key against its group: a key written ungrouped or under the wrong group aborts every command with `Found an unknown key` and `Biome exited because the configuration resulted in errors` (measured on v2.5.11 through v2.6.9). ESLint's flat rule namespace trains the wrong reflex, and the group is not derivable from the name — `noFloatingPromises` sits in `nursery`, `useThrowOnlyError` in `style`. | Run `biome lint` after the edit: a `Found an unknown key` error means the key sits in the wrong place. Then prove the rule fires on a planted violation — for `nursery.noFloatingPromises`, `async function f() {} f();` must report `lint/nursery/noFloatingPromises`. |
~~~~

### 10. skills/typescript-quality-reference/gate.md

Find:
~~~~text
| Biome's published rule-sources cross-reference — which the migration draws from — omits all four typescript-eslint counterparts, even though three name their source on their own rule page. The tool's silence is not evidence the rule has no equivalent. |
~~~~
Replace:
~~~~text
| A default `biome migrate eslint` run ports only `useReadonlyClassProperties` of the four; `--include-nursery` adds `noFloatingPromises` and `noMisusedPromises`; no flag ports `noUnsafeTypeAssertion` (measured on v2.5.11 and v2.6.9). Biome's published rule-sources cross-reference omits all four typescript-eslint counterparts, even though three name their source on their own rule page. The tool's silence is not evidence the rule has no equivalent. |
~~~~

### 11. skills/typescript-quality-reference/gate.md

Find:
~~~~text
Biome has no equivalent to `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-argument` or `no-unsafe-return` in any group, at any severity — confirmed against both its rule index and its cross-reference at v2.5.11.
~~~~
Replace:
~~~~text
Biome has no equivalent to `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call` or `no-unsafe-argument` in any group, at any severity — confirmed at v2.6.9. `no-unsafe-return` gained the nursery counterpart `noUnsafeReturn` in v2.6.3 (TS-GATE-20), which covers the return position only.
~~~~

### 12. skills/typescript-quality-reference/gate.md (insertion: new table row)

Find:
~~~~text
| see block TS-GATE-16 — a union; empty output is the finding. | SHOULD |
~~~~
Replace:
~~~~text
| see block TS-GATE-16 — a union; empty output is the finding. | SHOULD |
| TS-GATE-20 | On Biome v2.6.3 or later, set `nursery.noUnsafeReturn` to `"error"`. Overridable, on the same nursery terms as TS-GATE-10. | It is Biome's first counterpart to a typescript-eslint `no-unsafe-*` rule (source `@typescript-eslint/no-unsafe-return`, `types` domain), and its default severity is `information`, so enabling it with `"on"` is weaker than this rule asks. It covers the return position only; TS-GATE-11 still holds for assignment, member access, calls and arguments. | see block TS-GATE-20 — on Biome v2.6.3 or later, empty output is the finding. Then prove it fires: `function f(x: string) { return JSON.parse(x); }` in a source file must report `lint/nursery/noUnsafeReturn`. | SHOULD |
~~~~

### 13. skills/typescript-quality-reference/gate.md (insertion: new block)

Find:
~~~~text
-e noExcessiveCognitiveComplexity -e noExcessiveLinesPerFunction --
```
~~~~
Replace:
~~~~text
-e noExcessiveCognitiveComplexity -e noExcessiveLinesPerFunction --
```

```sh
# TS-GATE-20
git ls-files -z --cached --others --exclude-standard -- 'biome.json' | xargs -0 -r grep -H -n -E -e noUnsafeReturn --
```
~~~~

### 14. skills/typescript-quality-reference/gate.md

Find:
~~~~text
4. **Writing a Biome rule key ungrouped.** Silently ignored, no validation
   error, so the clean run afterwards reads as success.
~~~~
Replace:
~~~~text
4. **Writing a Biome rule key ungrouped, or under a group guessed from its
   name.** Biome aborts with `Found an unknown key`; look the group up on the
   rule's own page instead of guessing again.
~~~~

### 15. skills/typescript-quality-reference/types.md

Find:
~~~~text
**Pin `typescript` to a version your linter supports.** TypeScript 7.0 (stable
2026-07-08) is a Go rewrite that shipped with no stable programmatic API until
7.1 — typescript-eslint, `ts-morph`, and anything else importing `typescript`
as a library can break on upgrade, and a linter that fails to build a program
tends to report zero findings rather than an error.
~~~~
Replace:
~~~~text
**Pin `typescript` to a version your linter supports.** TypeScript 7.0 (stable
2026-07-08) is a Go rewrite with no programmatic API; 7.1 adds one
(`typescript/sync`, `typescript/async`, `typescript/ast`) but was still a beta
on 2026-11-27. typescript-eslint 8.74.0 still declares `typescript` as
`>=4.8.4 <6.1.0` and reaches 7.1 only through the experimental
`projectService.EXPERIMENTAL_backend` (8.73.0 and later), and `ts-morph` has no
7.x support. A linter that fails to build a program tends to report zero
findings rather than an error.
~~~~

### 16. skills/typescript-quality-reference/modules.md

Find:
~~~~text
and a hard `TS5102` build failure from 6.0 — reproduced on 6.0.3, exit 2. On a 6.x floor
~~~~
Replace:
~~~~text
and a hard `TS5102` build failure from 6.0 — reproduced on 6.0.3, exit 2. On 7.x the options no longer exist and fail as `TS5023` (unknown compiler option) instead — reproduced on 7.0.2 and 7.1.0-beta, so a log grep for `TS5102` alone misses it. On a 6.x floor
~~~~

### 17. skills/typescript-quality-reference/security.md

Find:
~~~~text
      // vue/no-v-html is already error in eslint-plugin-vue's recommended config
~~~~
Replace:
~~~~text
      "vue/no-v-html": "error",          // Vue trees only — warn in eslint-plugin-vue's recommended config, error only in recommended-error
~~~~

### 18. skills/typescript-quality-reference/security.md

Find:
~~~~text
| TS-SEC-13 | Install-time script execution is off by default (`ignore-scripts=true` in `.npmrc`, the equivalent key in `bunfig.toml`, an explicit built-dependency allowlist under pnpm), with any package that genuinely needs a build script named in an allowlist rather than the flag being dropped. State the documented gap wherever the setting is claimed: it suppresses `preinstall`/`install`/`postinstall`, but `npm start`, `npm test` and `npm run <name>` still execute the named script — only their own pre/post hooks are skipped. | Arbitrary code execution at `install` time is the largest npm supply-chain vector, and it runs before any test, lint or review sees the package. A reviewer who greps for the flag and stops has verified something narrower than they believe. | see block TS-SEC-13 — no hit is the violation; a hit set to `false` is the violation. A missing config file prints nothing, and for this check nothing is the violation, so it cannot pass quietly. | MUST |
~~~~
Replace:
~~~~text
| TS-SEC-13 | Install-time dependency script execution is off, with any package that genuinely needs a build script named in an allowlist rather than the gate being dropped. npm 12, pnpm 11 and Bun deny dependency scripts by default and allowlist in their own place: `allowScripts` in `package.json` (npm 12, filled by `npm install-scripts approve`), the `allowBuilds` map in `pnpm-workspace.yaml` with `strictDepBuilds` left `true` (pnpm 11), `trustedDependencies` in `package.json` (Bun). npm 11 and older need `ignore-scripts=true` in `.npmrc`; Yarn takes `enableScripts: false` in `.yarnrc.yml`. State the documented gap wherever `ignore-scripts` is claimed: it suppresses `preinstall`/`install`/`postinstall`, but `npm start`, `npm test` and `npm run <name>` still execute the named script — only their own pre/post hooks are skipped. | Arbitrary code execution at `install` time is the largest npm supply-chain vector, and it runs before any test, lint or review sees the package. The controls changed shape in 2026: pnpm 11.0.0 (2026-04-28) removed `onlyBuiltDependencies`, `neverBuiltDependencies` and `ignoredBuiltDependencies`, and npm 12.0.0 (2026-07-08) made dependency scripts default-deny, so a config still carrying the old pnpm keys configures nothing. A reviewer who greps for one flag and stops has verified something narrower than they believe. | see block TS-SEC-13 (1) and read each hit against the package manager and major version in use. A hit that re-enables scripts — `ignore-scripts=false`, `strictDepBuilds: false`, `dangerouslyAllowAllBuilds: true`, `enableScripts: true` — is the violation. On npm 11 or older, no `ignore-scripts=true` hit is the violation; a missing config file prints nothing, and there nothing is the violation, so it cannot pass quietly. On pnpm 11 or later, any output from see block TS-SEC-13 (2) is the violation. | MUST |
~~~~

### 19. skills/typescript-quality-reference/security.md

Find:
~~~~text
| TS-SEC-14 | A release cooldown is configured, so a version published minutes ago cannot be installed before anyone has looked at it. Every major package manager now has one as an install-time control, not just a PR gate: npm 11.10.0 (Feb 2026) `min-release-age`, pnpm 10.16 (Sep 2025) `minimumReleaseAge` (default-on from pnpm 11), with Yarn and Bun shipping their own flags in late 2025. Renovate's `minimumReleaseAge` gates the PR, which is a different layer — set both. **Pinned default the adopter may override**: the window is a project decision; the setting existing is not. | Malicious package versions rely on being consumed in the hours before takedown. The naming differs per tool and nothing propagates between them, so a repo that set it in one file is unprotected in the others. | see block TS-SEC-14 — empty output means the control is configured nowhere and is the violation. Verify the setting sits in the file the tool actually reads: npm and pnpm read `.npmrc`, Bun reads `bunfig.toml`, Renovate reads its own config. | SHOULD |
~~~~
Replace:
~~~~text
| TS-SEC-14 | A release cooldown is configured, so a version published minutes ago cannot be installed before anyone has looked at it. Every major package manager has one as an install-time control, not just a PR gate, each with its own key, file and unit: npm 11.10.0 (Feb 2026) `min-release-age` in `.npmrc`, in days, off by default; pnpm `minimumReleaseAge` in `pnpm-workspace.yaml`, in minutes, on by default at 1440 since pnpm 11.0.0 (2026-04-28); Yarn `npmMinimalAgeGate` in `.yarnrc.yml` (4.10.0 and later), on by default since 4.15.0; Bun `install.minimumReleaseAge` in `bunfig.toml`, in seconds or a duration string. Renovate's `minimumReleaseAge` gates the PR, which is a different layer — set both. **Pinned default the adopter may override**: the window is a project decision; the setting existing is not. | Malicious package versions rely on being consumed in the hours before takedown. The naming and the unit differ per tool and nothing propagates between them, so a repo that set it in one file is unprotected in the others, and a number copied between tools means something else — `7` is a week to npm and seven minutes to pnpm. | see block TS-SEC-14 — empty output means the control is configured nowhere and is the violation, except on pnpm 11 or later and Yarn 4.15 or later, whose defaults apply. Verify the setting sits in the file the tool actually reads: npm reads `.npmrc`, pnpm reads `pnpm-workspace.yaml`, Yarn reads `.yarnrc.yml`, Bun reads `bunfig.toml`, Renovate reads its own config. | SHOULD |
~~~~

### 20. skills/typescript-quality-reference/security.md

Find:
~~~~text
# TS-SEC-13
REPO=.    # the directory to search
git ls-files -z --cached --others --exclude-standard -- ":(glob)$REPO/**" | xargs -0 -r grep -H -n -E -e ignore-scripts -e onlyBuiltDependencies -e trustedDependencies --
~~~~
Replace:
~~~~text
# TS-SEC-13 (1)
REPO=.    # the directory to search
git ls-files -z --cached --others --exclude-standard -- ":(glob)$REPO/**" | xargs -0 -r grep -H -n -E -e ignore-scripts -e allowScripts -e allowBuilds -e strictDepBuilds -e dangerouslyAllowAllBuilds -e enableScripts -e trustedDependencies --
# TS-SEC-13 (2)
git ls-files -z --cached --others --exclude-standard -- ":(glob)$REPO/**" | xargs -0 -r grep -H -n -E -e onlyBuiltDependencies -e neverBuiltDependencies -e ignoredBuiltDependencies --
~~~~

### 21. skills/typescript-quality-reference/security.md

Find:
~~~~text
-e min-release-age -e minimumReleaseAge --
~~~~
Replace:
~~~~text
-e min-release-age -e minimumReleaseAge -e npmMinimalAgeGate --
~~~~

### 22. skills/typescript-quality-reference/security.md (insertion: sources)

Find:
~~~~text
- [npm config — `ignore-scripts`](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts) — the documented `npm run` gap
~~~~
Replace:
~~~~text
- [npm config — `ignore-scripts`](https://docs.npmjs.com/cli/v10/using-npm/config#ignore-scripts) — the documented `npm run` gap
- [npm 12 `install-scripts`](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts) and [pnpm build settings](https://pnpm.io/settings/build) — the default-deny allowlists that replaced `ignore-scripts` and `onlyBuiltDependencies`
~~~~

### 23. skills/typescript-quality-reference/resources.md

Find:
~~~~text
Native, unpolyfilled support, from MDN browser-compat-data as of 2026-08-29:
**Node ≥24.0.0, Chrome/Edge ≥134, Firefox ≥141, Bun ≥1.0.23, Deno ≥2.2.10.
Safari has never shipped it.** Node 22 ships V8 12.4 — below the line for that
~~~~
Replace:
~~~~text
Native, unpolyfilled support, from MDN browser-compat-data as of 2026-11-27:
**Node ≥24.0.0, Chrome/Edge ≥134, Firefox ≥141, Bun ≥1.0.23, Deno ≥2.2.10.
No stable Safari has shipped it** — BCD lists it for the Safari 27.3 beta
(2026-11-11), which is not a floor until 27.3 releases. Node 22 ships V8 12.4 — below the line for that
~~~~

### 24. skills/typescript-quality-reference/resources.md

Find:
~~~~text
is open (filed 2026-07-10, no maintainer response); its 2021 predecessor was
~~~~
Replace:
~~~~text
is open but bot-labelled `stale` on 2026-11-20 (filed 2026-07-10, no maintainer response); its 2021 predecessor was
~~~~

### 25. skills/typescript-quality-reference/resources.md

Find:
~~~~text
`execa@10.0.1` is ESM-only, `engines.node: ">=22"`, ~11 transitive deps.
~~~~
Replace:
~~~~text
`execa@10.2.1` is ESM-only, `engines.node: ">=22"`, 12 direct dependencies.
~~~~

### 26. skills/typescript-quality-reference/async.md

Find:
~~~~text
`@actions/exec@1.x`'s `ExecOptions` has no
~~~~
Replace:
~~~~text
`@actions/exec`'s `ExecOptions` (1.x through 3.0.0) has no
~~~~

### 27. skills/typescript-quality-reference/extension-host.md

Find:
~~~~text
whose peer range is `sinon@^21` (checked 2026-08-29).
~~~~
Replace:
~~~~text
whose peer range is `sinon@^21` (checked 2026-11-27) — npm `latest` sinon is 22.x, outside that range, so pin `sinon@^21` explicitly.
~~~~

### 28. skills/typescript-quality-reference/testing.md

Find:
~~~~text
| TS-TEST-05 | On Vitest 4.0 and later (2025-10-22), set `coverage.include` explicitly. |
~~~~
Replace:
~~~~text
| TS-TEST-05 | On Vitest 4.0 and later (2025-10-22), 5.x included, set `coverage.include` explicitly. |
~~~~

### 29. skills/typescript-quality-reference/testing.md

Find:
~~~~text
require it to appear at 0%. Missing from the report is the finding. |
~~~~
Replace:
~~~~text
require it to appear at 0%. Missing from the report is the finding. Rerun that live check after an upgrade to Vitest 5: 5.0.0 (2026-09-03) matches include globs relative to the project root and treats a pattern with no wildcard as a directory. |
~~~~

### 30. skills/typescript-quality-reference/testing.md

Find:
~~~~text
it has no ESM or TS loader, so test files need a bundle step before the runner sees them
~~~~
Replace:
~~~~text
it does not transpile TypeScript itself, so test files need a bundle step before the runner sees them
~~~~

### 31. skills/typescript-quality-reference/testing.md

Find:
~~~~text
8. **Assuming `useFakeTimers()` faked everything with a clock in it.** The
   two APIs it skips are the two a microtask-ordering test depends on.
~~~~
Replace:
~~~~text
8. **Assuming `useFakeTimers()` faked everything with a clock in it.** The
   two APIs it skips are the two a microtask-ordering test depends on. On
   Vitest 5.0 and later the default set also fakes `Temporal`; keep it native
   with `toNotFake: ['Temporal']`, which cannot be combined with `toFake`.
~~~~

### 32. skills/typescript-quality-reference/browser.md

Find:
~~~~text
`build.rollupOptions` still works through a compat layer scheduled for removal.
~~~~
Replace:
~~~~text
`build.rollupOptions` is a deprecated alias of it, and Vite 8.4.0's docs name no removal version.
~~~~

### 33. skills/typescript-quality-reference/browser.md

Find:
~~~~text
*(Default — the adopter picks the number and records how it was measured.)*
~~~~
Replace:
~~~~text
*(Default — the adopter picks the number and records how it was measured, including the `size-limit` major: 14.0.0 (2026-09-15) moved `@size-limit/preset-small-lib` from esbuild to rolldown, so numbers from 13.x and 14.x do not compare.)*
~~~~

## Spillover round

Input: `.agents/research/refresh-2026-11/typescript-quality/spillover-check.md` (2026-11-27), two items from the typescript-packaging pair: one confirmed, one already correct.

### Verdict

- TS-MOD-12 keeps its ID and its meaning: set `linter.domains.project` in the same change that enables a Biome `project`-domain rule. Its rationale is corrected in place. The claim that the rule name alone is "very plausibly a no-op" is false. A fixture run on Biome v2.6.9 reported `lint/suspicious/noImportCycles` on both files of a two-file cycle with the rule alone and with the domain set. Biome's domains page states that enabling a rule from the project domain makes Biome scan the entire project.
- TS-MOD-12 moves from MUST to SHOULD. The MUST rested only on the silent no-op, and the no-op does not happen. Its verification stays the same: the TS-MOD-12 (1) and (2) greps still find a project rule that is named without the domain.
- The biome.json comment above the TS-MOD-12 table and agent item 6 carried the same false mechanism. Both are corrected in place. Item 6 keeps its number, so items 7 to 14 are not renumbered.
- The typescript-eslint 8.73.0 `projectService.EXPERIMENTAL_backend: 'tsgo'` item needs no edit. types.md already names the backend, and the TS-TYP-01 and gate `projectService` greps still match under it.
- The rule file `rules/typescript-quality.md` is not touched, so the rule bump for this round is none. The reference skill gets a patch for this round. It already carries a minor bump from the first round for TS-GATE-20, and that minor bump stands.

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| TS-MOD-12 (rationale, severity) | "Biome builds the module graph only when the domain is on. The rule name under `linter.rules` alone ships a config that looks enforced and is very plausibly a no-op, with no error to say so."; MUST | Enabling a project-domain rule makes Biome scan the whole project, so the rule fires without the domain (measured for `noImportCycles` on v2.6.9; the other three were not measured). Setting the domain keeps that full-project scan visible in the config. SHOULD | Fixture run on 2026-11-27 with `@biomejs/biome@2.6.9`; https://biomejs.dev/linter/domains/ ; Biome CHANGELOG 2.6.2 section, https://raw.githubusercontent.com/biomejs/biome/main/packages/@biomejs/biome/CHANGELOG.md |
| modules.md biome.json comment (TS-MOD-12 context) | "the rule name alone is a no-op without the domain" | "name the domain; enabling a project rule already triggers the scan" | as for TS-MOD-12 |
| modules.md agent item 6 (TS-MOD-12 context) | "shipping a config that looks enforced and is very plausibly a no-op" | the rule fires, but the config does not say that a full-project scan now runs | as for TS-MOD-12 |

### New rules

None.

### Declined

- typescript-eslint 8.73.0 `projectService.EXPERIMENTAL_backend: 'tsgo'`: confirmed by primary sources (the v8.73.0 release, 2026-11-16, and https://typescript-eslint.io/packages/parser/#projectservice), but the target is already correct. types.md already names the backend from 8.73.0, and the `projectService` greps stay valid. No edit.
- Drop TS-MOD-12 entirely: not done. The rule still gives the config an explicit domain, and retiring it would break ID stability for no gain.

### Sources (spillover round)

| Change | Source | Kind |
|---|---|---|
| TS-MOD-12 rationale and severity, comment line, agent item 6 | Fixture run on 2026-11-27, `@biomejs/biome@2.6.9`, `src/a.ts` and `src/b.ts` importing each other. With only `linter.rules.suspicious.noImportCycles: "error"` set, and again with `linter.domains.project: "recommended"` added, each run reported "Found 2 errors" | primary (measurement) |
| same | https://biomejs.dev/linter/domains/ — "When enabling rules that belong to this domain, Biome will scan the entire project." | primary |
| same | Biome CHANGELOG, 2.6.2 section — "The rule is now part of the `project` domain, so enabling it makes Biome scan your project." | primary |

### Edit list (spillover round)

Each entry gives a file, the exact text to find (it occurs once in that file), and the exact replacement. Fences are `~~~~` so the payload can contain triple backticks.

#### S1. skills/typescript-quality-reference/modules.md

Find:
~~~~text
// biome.json — the rule name alone is a no-op without the domain
~~~~
Replace:
~~~~text
// biome.json — name the domain; enabling a project rule already triggers the scan
~~~~

#### S2. skills/typescript-quality-reference/modules.md

Find:
~~~~text
| Biome builds the module graph only when the domain is on. The rule name under `linter.rules` alone ships a config that looks enforced and is very plausibly a no-op, with no error to say so. | see block TS-MOD-12 (1) — a deliberate union; any hit demands that see block TS-MOD-12 (2) show `"project"`. | MUST |
~~~~
Replace:
~~~~text
| Enabling a rule from the `project` domain makes Biome scan the whole project, so the rule fires even without the domain — measured for `noImportCycles` on v2.6.9 (2026-11-27); the other three were not measured. Setting `linter.domains.project` in the same change keeps that full-project scan visible in the config instead of implied by one rule name. | see block TS-MOD-12 (1) — a deliberate union; any hit demands that see block TS-MOD-12 (2) show `"project"`. | SHOULD |
~~~~

#### S3. skills/typescript-quality-reference/modules.md

Find:
~~~~text
6. Enabling a Biome `project`-domain rule by name alone, shipping a config that
   looks enforced and is very plausibly a no-op.
~~~~
Replace:
~~~~text
6. Enabling a Biome `project`-domain rule by name alone. The rule fires, but
   the config does not say that a full-project scan now runs.
~~~~

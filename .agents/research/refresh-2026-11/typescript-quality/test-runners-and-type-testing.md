---
title: Test runners and type testing, delta 2026-08-29 to 2026-11-27
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 26
---

# Test runners and type testing: delta update

Scope: claims in `skills/typescript-quality-reference/testing.md` and `extension-host.md` that depend on Vitest, Bun's test runner, Playwright, expect-type, Mocha with the VS Code test CLI, and the sinon mocking stack. This is a delta against the baseline measured 2026-08-29. Anything marked "unchanged" was re-read at a primary source on 2026-11-27 and still holds. Nothing here is from memory.

## Contents

- Summary
- Findings per claim
- Normative guidance candidates
- AI-agent angle
- Contested and evolving
- Sources

## Summary

- Vitest 5.0.0 shipped 2026-09-03 and is `latest` (5.1.2, 2026-11-25). Vitest 4.1.12 (2026-10-15) is the last 4.x. The Vitest 4.0 claims in TS-TEST-05 are still true, but the rule should now say "4.0 and later, including 5.x".
- Vitest 5 did not bring `coverage.all` back. `coverage.include` still defaults to files imported during the run. Vitest 5 did change how include and exclude globs match (project-root relative, a pattern with no wildcard is a directory), so existing include lists need a re-read.
- Fake timers: the `nextTick`, `queueMicrotask` and `--pool=forks` statements are unchanged in the current docs. Vitest 5 additionally fakes `Temporal` by default.
- `vi.hoisted`, `vi.mock` and `vi.unmock` outside the top level now throw in Vitest 5 (previously a warning). That strengthens TS-TEST-09.
- Vitest 5 fails a test whose async assertion (`resolves`, `rejects`, `toMatchFileSnapshot`) is not awaited. This is a new safety net for the TS-TEST-02 family on the Vitest side only.
- Bun: both coverage traps are still documented as of the docs read on 2026-11-27 (statements not enforced; lcov-only run exits 0). No version floor is possible. Bun 1.4.1 through 1.4.5 shipped in the window; none fixes either trap. The docs add that the threshold check does not run under `--parallel`, a third nuance.
- Playwright: the 1.62 claim is confirmed by Playwright's own release notes (1.62.0, 2026-07-24, new stories and galleries component-testing model inside `@playwright/test`). The packages were then declared end-of-life in 1.63.0 (2026-09-04). The docs now state they "have been removed and are no longer published", yet `npm view` shows `@playwright/experimental-ct-react@1.62.1` still installs, which is the trap.
- expect-type: 1.4.0 (2026-06-25) is `latest`; no release in the window. `toMatchTypeOf` is still deprecated since 1.2.0 in the shipped typings.
- Mocha 12.0.0 went stable 2026-08-31 (12.0.3 on 2026-10-01). The 2000 ms default timeout is unchanged. `@vscode/test-cli` had no release in the window (latest 0.0.15, 2026-06-22) and still depends on `mocha ^11.7.6`, so the extension-host path does not run Mocha 12.
- `@golevelup/ts-sinon` is still 2.0.0 (2026-03-18) with peer `sinon: ^21.x`. The peer range did not move, but sinon 22.0.0 (2026-05-05) and 22.1.0 (2026-07-20) are already the npm `latest`, so a bare `npm i sinon` produces a peer conflict. The baseline text "checked 2026-08-29" stays true but is incomplete; the rule should pin `sinon@^21`.
- The TS-HOST-26 Proxy auto-vivification behaviour is unchanged (2.0.0 source re-read).

## Findings per claim

### 1. TS-TEST-05, Vitest coverage.include: UNCHANGED in substance, with a new nuance

- Vitest 5 has shipped: [v5.0.0, 2026-09-03](https://github.com/vitest-dev/vitest/releases/tag/v5.0.0). `latest` is 5.1.2 (2026-11-25), per `npm view vitest dist-tags`.
- Old text: "On Vitest 4.0 and later (2025-10-22), set `coverage.include` explicitly. v4.0 removed `coverage.all`".
- Current fact: the [coverage config page](https://vitest.dev/config/coverage) still documents `coverage.include` default as "Files that were imported during test run" and says "By default only files covered by tests are included." It does not mention `coverage.all`. So an untested file stays absent from the report unless it matches `include`. The rule's reasoning holds on 5.x.
- New in 5.0.0: [migration guide](https://vitest.dev/guide/migration) says include/exclude patterns are matched against each file's path relative to the project root, and a pattern with no glob wildcard is treated as a directory (`include: ['src']` equals `include: ['src/**']`). The release notes list this as breaking ("`include/exclude` globs too eager", [v5.0.0 notes](https://github.com/vitest-dev/vitest/releases/tag/v5.0.0)). The docs also recommend including file extensions in patterns.
- Verification in TS-TEST-05 (an `include` key exists; an unimported file shows at 0%) stays valid. Suggest adding "after a Vitest 5 upgrade, re-run the live check, because glob matching changed".
- Also new in 5.0.0: `coverage.thresholds.perFile` accepts an object; glob-pattern thresholds do not inherit the top-level `perFile` ([coverage page](https://vitest.dev/config/coverage)). Istanbul provider moved to `@vitest/istanbuljs` packages. Not needed by any current rule.

### 2. TS-TEST-06 fake timers: UNCHANGED, plus Temporal

- The [vi API page](https://vitest.dev/api/vi) still says "`vi.useFakeTimers()` does not automatically mock `process.nextTick` and `queueMicrotask`" and "Mocking `nextTick` is not supported when running Vitest inside `node:child_process` by using `--pool=forks`", supported with `--pool=threads`.
- New in 5.0.0: `@sinonjs/fake-timers` was updated (v15.4) and `Temporal` is now part of the default faked set; opt out with `toNotFake: ['Temporal']` ([migration guide](https://vitest.dev/guide/migration), [blog post](https://vitest.dev/blog/vitest-5.html)). Another 5.0 break: `clearMocks` defaults to true.
- Nuance for the rule text: `toFake` and `toNotFake` cannot be used together. A test that lists `toFake` for `nextTick` is unaffected by the Temporal change.

### 3. TS-TEST-09 vi.hoisted: CHANGED (stronger)

- Old text: `vi.mock` is hoisted; a factory must use `vi.hoisted()`; failure "surfaces as a mocking error far from the mistake".
- New fact: Vitest 5.0 throws when `vi.mock`, `vi.unmock` or `vi.hoisted` appear inside a function, block or `describe`/`test` callback; previously only a warning ([migration guide](https://vitest.dev/guide/migration); release note "Throw an error if hoistable methods are outside the top level scope", [v5.0.0](https://github.com/vitest-dev/vitest/releases/tag/v5.0.0), 2026-09-03). `vi.doMock` and `vi.doUnmock` are not hoisted and may be called anywhere.
- The [vi API page](https://vitest.dev/api/vi) still says imported variables cannot be accessed inside the `vi.hoisted` callback ("Cannot access '__vi_import_0__' before initialization").
- Effect: the existing rule is correct and now fails loudly in more cases. A reviewer-facing addition is possible (see candidate N3).

### 4. TS-TEST-11 test-d.ts never executed: UNCHANGED, one related fix

- [Testing types guide](https://vitest.dev/guide/testing-types) still says "Vitest doesn't run these files, they are only statically analyzed by the compiler" and typecheck is turned on by adding `--typecheck`. Default scope is `*.test-d.ts`, changeable with `typecheck.include`.
- Related 5.0.0 fix: "Prevent `vitest --typecheck` from reporting a false success when the `tsc` process crashes" ([v5.0.0 notes](https://github.com/vitest-dev/vitest/releases/tag/v5.0.0)). Another: "Unify typechecking and ast collection". Neither changes the rule. On Vitest 4.x before this fix a crashed `tsc` could read green; mention as a version note only.
- Bun "documents `expectTypeOf` as a runtime no-op": UNCHANGED. [Bun writing-tests docs](https://bun.com/docs/test/writing-tests): "These functions are no-ops at runtime", and to verify types run `bun check` or `bun test --check`. (The `bun test --check` flag is stated by the docs page; I did not run it.)

### 5. TS-TEST-08 browser mode "opens one page per test file": COULD NOT DETERMINE

- The Vitest browser guide page fetched says nothing about isolation, and the `config/browser/isolate` page returned 404 at both the site and the raw GitHub path on tag v5.1.2.
- What is known: the 5.0 migration guide says `browser.isolate` is deprecated and prints a warning ([migration guide](https://vitest.dev/guide/migration)). The [blog post](https://vitest.dev/blog/vitest-5.html) says browser sessions now open adaptively instead of `maxWorkers` sessions upfront. Neither source states what the new isolation model is. The old claim may still hold but cannot be confirmed from a primary source in this run.
- Recommendation: keep TS-TEST-08's verification (run file, then run one test alone), which is behaviour-based. Soften the rationale from "opens one page per test file" to "isolates per file at most, never per test", and re-verify after reading the Vitest 5 browser isolation docs.

### 6. TS-TEST-04 Bun thresholds: UNCHANGED (no version floor possible)

- [Bun coverage docs](https://bun.com/docs/test/code-coverage), read 2026-11-27 (banner shows Bun v1.4.5): keys `lines` and `functions` are plural; "Bun accepts a `statements` key but does not currently enforce it"; "a run with only `--coverage-reporter=lcov` currently exits 0 regardless of the threshold".
- New nuance in the same page: "Outside `--parallel`, the check runs only when the `text` reporter is enabled, which is the default." So `--parallel` is documented as a further case where threshold enforcement does not run. The page I fetched is summarised by the fetch tool, so confirm the exact wording when authoring.
- Claim that singular forms are accepted and ignored: the page does not mention singular forms at all, so this part cannot be re-confirmed from the docs. It was in the baseline and no source contradicts it; treat as "could not re-verify".
- Bun releases in the window: [1.4.1](https://bun.com/blog/bun-v1.4.1) (2026-09-04), 1.4.2 (2026-09-05), 1.4.3 (2026-10-10), 1.4.4 (2026-10-22), [1.4.5](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.5) (2026-11-19). The 1.4.1 post fixes `bun test --parallel --coverage` under-reporting function coverage across workers; it does not touch thresholds, lcov or `statements`. I read the 1.4.1 and 1.4.2 blog posts; the 1.4.3, 1.4.4 and 1.4.5 GitHub release bodies are blog pointers and I did not read their blog posts. No docs claim a fix.
- Decision: no Bun trap is documented as fixed, so no version floor. State the rule against the current docs and keep the "prove it red" verification.

### 7. Item 5, retired names: Playwright 1.62 claim CONFIRMED and refined; Vitest split unchanged

- Playwright: [v1.62.0](https://github.com/microsoft/playwright/releases/tag/v1.62.0), published 2026-07-24T21:55Z, "New component testing model": component testing moves to stories and galleries with a `mount` fixture. The [component testing docs](https://playwright.dev/docs/test-components) say there are no extra npm packages, the `@playwright/experimental-ct-*` packages "have been removed and are no longer published", config is plain `defineConfig` from `@playwright/test`, and `ctViteConfig`, `ctPort`, `ctTemplateDir` are gone. Apps still on the old packages should stay on 1.62 until migrated.
- [v1.63.0](https://github.com/microsoft/playwright/releases/tag/v1.63.0) (2026-09-04) Announcements: "The experimental `@playwright/experimental-ct-react`, `@playwright/experimental-ct-react17` and `@playwright/experimental-ct-vue` packages will no longer be updated." So the last published version is 1.62.1 (`npm view @playwright/experimental-ct-react dist-tags`: latest 1.62.1). The packages still install, which is why they remain an agent trap.
- Precision for the rule text: "replaced inside `@playwright/test` at 1.62" is correct (replacement shipped in 1.62.0, 2026-07-24). Add that the old packages stopped receiving updates at 1.63.0 (2026-09-04) and that `ct-svelte` and `ct-solid` also existed; the 1.63 notes name only react, react17 and vue, so do not claim the others.
- Vitest: the split of `@vitest/browser` into per-provider packages at 4.0 (2025-10-22) is baseline and not re-fetched from the 4.0 notes; nothing in the window contradicts it. New retirements in the window: `@vitest/browser-webdriverio` moved to the vitest-community organisation and is community-maintained; `@vitest/runner` and `@vitest/ws-client` are deprecated (still receive security fixes); `@vitest/expect` is bundled into `vitest`; "Inline `@vitest/runner` package, do not publish it anymore"; "Remove webdriverio package" ([migration guide](https://vitest.dev/guide/migration), [v5.0.0](https://github.com/vitest-dev/vitest/releases/tag/v5.0.0)). Whether the vitest-community move is the same package or a rename was not confirmed.
- Other new retirement worth item 5: Vitest 5 removes the `sequential` test/suite option in favour of `concurrent`, and removes `bench` as a top-level import.
- New Playwright item: 1.65.0 (2026-11-05) runs the test runner under Bun (`bunx --bun playwright test`), with caveats (no watch mode, `--tsconfig` ignored). Not a retirement. Relevant to TS-TEST-01 only if a Bun repo adds Playwright; Playwright does not become a Bun-native runner.

### 8. TS-TEST-12 expect-type: UNCHANGED

- No expect-type release in the window. `latest` is [1.4.0](https://github.com/mmkal/expect-type/releases/tag/v1.4.0) (2026-06-25; adds `thisParameter` overload support and `.branded.inspect`). I read the packaged 1.4.0 typings: `toMatchTypeOf` still carries `@deprecated Since v1.2.0 - Use either toMatchObjectType or toExtend instead`. 1.2.0 date 2025-02-28 confirmed from `npm view expect-type time`.
- README of 1.4.0 documents `.toExtend`, `.toEqualTypeOf`, `.toBeAny()`; a README section "Why is `.toMatchTypeOf` deprecated?" exists. Also note `.toMatchObjectType` exists as an alternative for object-shape checks; the rule names only `toExtend`.

### 9. TS-TEST-03 Mocha and the VS Code test CLI: UNCHANGED, one new fact

- Default timeout 2000 ms: confirmed in Mocha 12.0.3's own shipped config (`lib/mocharc.json` has `"timeout": 2000`) and `lib/runnable.js` (`this._timeout = 2000`). Unchanged.
- Mocha 12.0.0 went stable 2026-08-31 ([release](https://github.com/mochajs/mocha/releases/tag/v12.0.0)); 12.0.1 (2026-09-08), 12.0.2 (2026-09-17), 12.0.3 (2026-10-01). Node requirement `^20.19.0 || >=22.12.0`. The 12.0.0 stable notes list only fixes (the earlier rc line carried the breaking changes; I did not read the rc notes).
- "Has no ESM or TS loader": the [Mocha TypeScript explainer](https://mochajs.org/explainers/typescript/) says Mocha does not transpile or strip types itself; Node does type stripping, Mocha needs `--extension ts` for discovery, and heavier setups use a `--require` register loader. Rule text "no ESM or TS loader" is imprecise rather than wrong: Mocha has native ESM loading, and the claim that matters is that it does not transpile TS. Suggest rewording the table cell to "does not transpile TypeScript, so test files need a bundle step before the runner sees them".
- `@vscode/test-cli`: no release in the window; latest is 0.0.15 (2026-06-22) and it depends on `mocha ^11.7.6`. So a `.vscode-test.mjs` suite runs Mocha 11 regardless of the repo's own mocha version. `@vscode/test-electron` 3.1.0 was published 2026-07-24, before the window.
- I could not open a mochajs.org page quoting the 2000 ms default; the source proof is the Mocha source and shipped config.

### 10. TS-HOST-25 and TS-HOST-26 sinon stack: peer range UNCHANGED; new sinon major

- `npm view @golevelup/ts-sinon peerDependencies` returns `{ sinon: '^21.x' }`. Latest is 2.0.0 published 2026-03-18; nothing newer. The peer range did not move in the window.
- Gap in the baseline: sinon 22.0.0 was published 2026-05-05 and 22.1.0 on 2026-07-20; npm `latest` for sinon is 22.1.0. So at 2026-08-29 and today, an unpinned `sinon` install is outside ts-sinon's peer range. The rule's verification ("`npm ls sinon @golevelup/ts-sinon` reports no peer warning") fails on a fresh install unless sinon is pinned to `^21`. This is an existing omission rather than a change in the window, but it is the live behaviour.
- A sibling `@golevelup/ts-vitest` 4.0.1 shipped 2026-10-26 (GitHub release in the golevelup/nestjs repo). This is the Vitest-side deep-mock package; the rule currently names none. I did not read its README or peer range.
- TS-HOST-26: I extracted `@golevelup/ts-sinon@2.0.0` from npm and read `lib/mocks.js`. The `get` trap on `createMock` returns, for any property not present on the partial, a deep-mock stub (`createDeepMockProxy`), cached per property; only `inspect`, `then`, `Symbol.toPrimitive` and the util.inspect symbol return undefined. Plain-data members are therefore auto-vivified as callables exactly as the rule says. Unchanged.

## Normative guidance candidates

Each candidate is a proposed edit, with rationale and a verification. Items marked "optional" are suggestions rather than corrections.

- N1 (TS-TEST-05, wording). Rule: "On Vitest 4.0 and later (2025-10-22), including 5.x, set `coverage.include` explicitly, with extensions, and re-run the unimported-file check after a major upgrade." Rationale: Vitest 5.0.0 (2026-09-03) changed include/exclude matching (root-relative, wildcard-less pattern is a directory) but still defaults to loaded files only. Verification: the existing block TS-TEST-05, plus add a source file nothing imports and require it at 0% in the report.
- N2 (TS-HOST-25, version pin). Rule: pinned default stays `sinon` plus `@golevelup/ts-sinon`, but pin `sinon@^21` and say npm `latest` sinon is 22.x (22.0.0 2026-05-05) outside the peer range of ts-sinon 2.0.0 (2026-03-18). Rationale: otherwise `npm i sinon @golevelup/ts-sinon` yields a peer conflict. Verification: `npm ls sinon @golevelup/ts-sinon` shows no `ERESOLVE` or "invalid" and `npm view @golevelup/ts-sinon peerDependencies`.
- N3 (TS-TEST-09, optional addition). Add: on Vitest 5.0+, `vi.mock`, `vi.unmock` and `vi.hoisted` inside a function, block or `describe` callback throw; use `vi.doMock` there. Rationale: v5.0.0 breaking change (2026-09-03). Verification: grep for indented `vi.mock(` or `vi.hoisted(`; any hit not at column 0 is a violation on 5.x.
- N4 (TS-TEST-06, optional addition). Add one clause: on Vitest 5.0+ `vi.useFakeTimers()` also fakes `Temporal` by default; list `toNotFake: ['Temporal']` to keep it native, and `toFake` and `toNotFake` cannot be combined. Rationale: a test comparing `Temporal.Now` behaviour changes silently on upgrade. Verification: grep `Temporal` in test files that call `useFakeTimers`.
- N5 (TS-TEST-04, no version floor). Keep the Bun key rule. Add "and no threshold check runs under `bun test --parallel`" only after re-confirming the docs wording. Verification: the existing raise-one-threshold run, executed once with the exact flags CI uses.
- N6 (item 5 retired list). Reword the Playwright entry: "`@playwright/experimental-ct-*` (replaced inside `@playwright/test` at 1.62.0, 2026-07-24; frozen at 1.62.1 and declared no longer updated in 1.63.0, 2026-09-04; still installable)". Add Vitest 5 retirements: `@vitest/runner` (inlined, no longer published), the `sequential` test option, and `@vitest/browser-webdriverio` (moved to vitest-community). Verification: `npm view @playwright/experimental-ct-react dist-tags` shows latest 1.62.1; grep package.json for `experimental-ct`.
- N7 (TS-TEST-03 table cell). Replace "has no ESM or TS loader" with "does not transpile TypeScript". Rationale: the Mocha TypeScript explainer says Node strips types and Mocha only needs `--extension ts`. Verification: read the Mocha explainer.
- N8 (TS-TEST-08, soften). Hold the rule; weaken the rationale sentence until the Vitest 5 browser isolation behaviour is read from a primary source.
- N9 (optional, new). On Vitest 5, an unawaited `expect(...).resolves`, `.rejects` or `toMatchFileSnapshot` fails the test. Relevant to TS-TEST-02's reviewer notes for Vitest suites; keep TS-TEST-02 about Playwright's web-first `expect`, whose behaviour I did not re-check against 1.63 to 1.65 notes (nothing in those notes changes it).

## AI-agent angle

- An agent writing a Vitest 5 config from training data may still add `coverage.all: true` (removed in 4.0) or write `include: ['src']` believing it is a literal path; on 5.x it is a directory glob, which is correct, but on 4.x it is not. Mechanical check: `grep -n "all:" vitest.config.ts` and confirm an unimported file appears at 0%.
- An agent adds `vi.mock` inside a `describe` block (works with a warning on 4.x, throws on 5.x). Check: grep for indented `vi.mock(`.
- An agent installs `@playwright/experimental-ct-react@latest` and gets 1.62.1, a frozen package, alongside a newer `@playwright/test`. Check: `npm ls @playwright/test @playwright/experimental-ct-react` for a version mismatch.
- An agent runs `npm i sinon @golevelup/ts-sinon` and gets sinon 22 against a `^21.x` peer. Check: `npm ls sinon`.
- An agent sets Bun `coverageThreshold` with `statements` or a singular key and trusts a green run. Check: raise one threshold and watch the run fail.
- An agent believes `@vscode/test-cli` picks up the repo's Mocha 12. It bundles `mocha ^11.7.6`. Check: `npm ls mocha`.

## Contested / evolving

- Vitest 5 browser isolation is mid-transition (`browser.isolate` deprecated, adaptive session opening). As of 2026-11-27 I could not read the new documented model. Trend: fewer per-file guarantees may disappear or change; re-check at the next refresh.
- Bun coverage: trap docs are current as of Bun 1.4.5 (2026-11-19). The docs' own wording "currently" signals the traps may be fixed later; a version floor will be needed when that happens.
- Playwright component testing is new (1.62, 2026-07-24) and the migration doc tells users to stay on 1.62 until migrated; expect more change.
- Playwright running under Bun (1.65.0, 2026-11-05) is new and carries caveats; watch whether TS-TEST-01 needs a Bun plus Playwright note.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/vitest-dev/vitest/releases/tag/v5.0.0 | Vitest 5.0.0 release notes (primary) | 2026-09-03 | Full breaking-change list: hoisting throws, fake-timers/Temporal, coverage globs, typecheck false-success fix |
| https://vitest.dev/guide/migration | Vitest migration guide (primary) | current at 5.1.x | Coverage include semantics, Temporal, hoisting, browser, package retirements |
| https://vitest.dev/blog/vitest-5.html | Vitest 5 announcement (primary) | 2026-09 | Coverage and browser summary; does not mention isolation |
| https://vitest.dev/config/coverage | coverage config reference (primary) | current | `include` default and no `coverage.all` |
| https://vitest.dev/api/vi | vi API reference (primary) | current | nextTick, queueMicrotask, pool=forks, vi.hoisted |
| https://vitest.dev/guide/testing-types | Type testing guide (primary) | current | test-d.ts never run, `--typecheck` |
| https://bun.com/docs/test/code-coverage | Bun coverage docs (primary) | Bun 1.4.5 era | threshold keys, statements, lcov-only, parallel |
| https://bun.com/docs/test/writing-tests | Bun test docs (primary) | Bun 1.4.5 era | expectTypeOf runtime no-op |
| https://bun.com/blog/bun-v1.4.1 | Bun 1.4.1 release post (primary) | 2026-09-04 | Parallel coverage fix; no threshold change |
| https://bun.com/blog/bun-v1.4.2 | Bun 1.4.2 release post (primary) | 2026-09-05 | No test-runner coverage changes |
| https://github.com/oven-sh/bun/releases/tag/bun-v1.4.5 | Bun 1.4.5 release (primary) | 2026-11-19 | Latest; body is a pointer to blog, not read in detail |
| https://github.com/microsoft/playwright/releases/tag/v1.62.0 | Playwright 1.62.0 notes (primary) | 2026-07-24 | New component testing model |
| https://github.com/microsoft/playwright/releases/tag/v1.63.0 | Playwright 1.63.0 notes (primary) | 2026-09-04 | experimental-ct packages no longer updated |
| https://github.com/microsoft/playwright/releases/tag/v1.65.0 | Playwright 1.65.0 notes (primary) | 2026-11-05 | Runner under Bun |
| https://playwright.dev/docs/test-components | Component testing docs (primary) | current | Packages removed, migration |
| https://github.com/mmkal/expect-type/releases/tag/v1.4.0 | expect-type 1.4.0 release (primary) | 2026-06-25 | Latest; no change to deprecation |
| https://www.npmjs.com/package/expect-type (tarball 1.4.0 typings) | Shipped typings and README (primary) | 2026-06-25 | `toMatchTypeOf` deprecation since 1.2.0 text |
| https://github.com/mochajs/mocha/releases/tag/v12.0.0 | Mocha 12.0.0 release (primary) | 2026-08-31 | Stable v12; 12.0.1 to 12.0.3 also read |
| https://mochajs.org/explainers/typescript/ | Mocha TypeScript explainer (primary) | current | Mocha does not transpile TS |
| https://raw.githubusercontent.com/mochajs/mocha/v12.0.3/lib/mocharc.json | Mocha 12.0.3 default config (primary) | 2026-10-01 | `timeout: 2000` |
| https://www.npmjs.com/package/@vscode/test-cli | npm registry metadata (primary) | latest 0.0.15, 2026-06-22 | Depends on `mocha ^11.7.6` |
| https://www.npmjs.com/package/@golevelup/ts-sinon | `npm view` metadata and tarball source (primary) | 2.0.0, 2026-03-18 | Peer `sinon ^21.x`; Proxy `get` trap source |
| https://www.npmjs.com/package/sinon | `npm view sinon time` (primary) | 22.1.0, 2026-07-20 | Sinon 22 outside ts-sinon peer range |
| https://www.npmjs.com/package/vitest | `npm view vitest dist-tags/time` (primary) | 5.1.2, 2026-11-25 | Release dates and `latest` |
| https://www.npmjs.com/package/@playwright/experimental-ct-react | `npm view` metadata (primary) | latest 1.62.1 | Frozen but still installable |
| https://github.com/golevelup/nestjs/releases | golevelup monorepo releases (primary) | 2026-10-26 | `@golevelup/ts-vitest@4.0.1`; no ts-sinon release |

Not found: Vitest browser isolation documentation page (404 on `config/browser/isolate` at the site and on tag v5.1.2); a mochajs.org page quoting the 2000 ms default; Bun 1.4.3 to 1.4.5 blog posts (not read).

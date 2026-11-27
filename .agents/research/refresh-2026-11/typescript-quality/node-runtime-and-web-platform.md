---
title: Node.js, undici and web-platform compatibility delta for typescript-quality
pair: typescript-quality
date_researched: 2026-11-27
window_start: 2026-08-29
model: sonnet
sources_fetched: 22
---

# Node.js, undici and web-platform compatibility delta (2026-08-29 to 2026-11-27)

This is a delta update. Anything marked "unchanged" stays exactly as written in the pair. Sources are primary: the nodejs/node CHANGELOG files and doc/api markdown on main (fetched 2026-11-27), the nodejs/undici release list and docs on main, the mdn/browser-compat-data (BCD) files and commit log, web-features dist files, the GitHub API for the named issues, and Apple and WebKit pages.

## Releases in the window

- Node 24.x: 24.21.0 (2026-09-08), 24.22.0 (2026-10-14), 24.22.1 (2026-10-21), 24.22.2 (2026-10-28), 24.22.3 (2026-11-11). Node 24 is LTS.
- Node 26.x: 26.8.2 (2026-09-09), 26.9.0 (2026-09-16), 26.10.0 (2026-09-22), 26.11.0/26.11.1 (2026-10-07), 26.12.0 (2026-10-14), 26.12.1 (2026-10-21), 26.13.0 (2026-10-28), 26.13.1 (2026-11-11). The CHANGELOG now lists Node 26 as LTS and Node 25 as End-of-Life. Node 27.0.0-alpha builds exist from 2026-10-29, not a release.
- Node 22.x: 22.23.3 (2026-09-23) through 22.23.5 (2026-11-11).
- Undici: 8.10.2 (2026-09-04) through 8.13.1 (2026-11-20); the 7.x line reached 7.30.2 and 6.x reached 6.29.1.

I read the changelog sections of every 24.x and 26.x release in the window and searched them for exit, EPIPE, flush, stdout/stderr, child_process, require(esm), type stripping, test_runner, AbortSignal and dispose entries.

## Claim-by-claim verdicts

### cli-contract.md: exit and pipe-flush semantics
Verdict: unchanged (could not exercise empirically, changelog-level only).
- No entry in the 24.21 to 24.22.3 or 26.8.2 to 26.13.1 changelogs changes `process.exitCode`, `process.exit()` truncation, stdout/stderr flushing or EPIPE handling. The only matches are unrelated: `lib: set exit code on failed node:bench run()` (26.12.x), `src: fix --process-timeout message when exit waits`, `stream: fix Utf8Stream flush handling`, and a Node-internal test fix `test: handle EPIPE in closed channel test`.
- Current process.md still says `process.exitCode` is set by assignment or by the `process.exit()` argument, with the same documented examples. The "measured, Node 24.14.0" numbers were not re-measured; nothing in the window gives a reason to.
- The 24.14.0 measurement therefore stands. Optional low-cost re-measure on Node 26.13.1 if the owner wants it dated forward.

### async.md TS-ASYNC-04, TS-ASYNC-15 (undici defaults)
Verdict: unchanged.
- undici docs/docs/api/Client.md on main (2026-11-27): `bodyTimeout` default `300e3`, `headersTimeout` default `300e3`, `connectTimeout` default `10e3`.
- Pool.md: `connections` default `null` (unlimited). Source: https://github.com/nodejs/undici/blob/main/docs/docs/api/Pool.md
- Node bundles undici 8.12.x to 8.12.4 in 26.x and 7.30.x in 24.x, so the documented defaults hold across the window.

### async.md TS-ASYNC-06 (AbortSignal.any floor)
Verdict: unchanged. doc/api/globals.md still carries `added: v20.3.0, v18.17.0`. New in the window and worth a one-line note, not a rule change: `AbortSignal.any()` abort-propagation fix (PR 66014, 24.22.0 and 26.x) and a nested-composite leak fix (PR 66617, 26.12.1). Node docs also gained a note that `AbortSignal.any` accepts any iterable (PR 66123).

### async.md TS-ASYNC-09 (AbortSignal.reason typed any)
Verdict: could not determine. It is a TypeScript lib.dom.d.ts fact, not a Node or compat-data fact, so it is outside the sources assigned here; a TypeScript-release agent should own it.

### resources.md: child_process defaults
Verdict: unchanged. child_process.md on main: `timeout` default `0`, `maxBuffer` default `1024 * 1024`. A fix in 24.21 and 26.x (PR 65506, "clear timeout timer on spawn-time error too") changes only cleanup of the timer on a spawn error; it does not change defaults.

### resources.md: nodejs/node#64406 and #40085
Verdict: partly changed.
- #64406 (title: `child_process: add cross-platform subprocess.killTree([signal])`) is still open. Old text: "open (filed 2026-07-10, no maintainer response)". New fact: still open; labelled `stale` by the GitHub Actions bot on 2026-11-20 ("90 days of inactivity", auto-closes after 30 more days, so about 2026-12-20, unless activity resumes). Comments are from a non-maintainer contributor (2026-07-10, 2026-08-20) and the bot; a maintainer, trivikr, only added the `child_process` label on 2026-08-21. Still no maintainer design response. Source: https://github.com/nodejs/node/issues/64406. Recommended wording: "open, stale-labelled 2026-11-20, may auto-close about 2026-12-20; no maintainer response." This reinforces TS-RES-15's own group-kill requirement; no rule change.
- #40085 is unchanged: closed, state_reason `not_planned`, closed 2023-05-07 (GitHub API).

### resources.md: native `using` support table
Verdict: changed (Safari, Bun, Deno), with one beta caveat. Source: mdn/browser-compat-data `javascript/statements.json` and `javascript/builtins/DisposableStack.json` on main, commit "Updates for Safari 27.3 beta (#31050)" dated 2026-11-11.
- Node >=24.0.0, Chrome/Edge >=134, Firefox >=141: unchanged.
- Safari: BCD now records `using`, `await using` and DisposableStack as `safari: 27.3` and iOS mirrored. Safari 27.3 is a BETA as of 2026-11-27 (Apple release notes page title "Safari 27.3 Beta Release Notes"; WebKit blog shows 27.2 as the released version). Old text: "Safari has never shipped it." New fact: Safari has not shipped it in a stable release; it is in the Safari 27.3 beta per BCD (2026-11-11). Do not raise a Safari floor yet. Revisit when 27.3 releases.
- Bun: `using`/`await using` still `1.0.23`; DisposableStack is now recorded as `1.3.0` (BCD, commit 2025-12-12 "Add missing Bun compatibility data", so this is older than the window but newly noticed). The pinned "Bun >=1.0.23" applies to the statement only.
- Deno: `using` is recorded `1.37`, `await using` `2.2.10`, DisposableStack `2.2.10`. The pinned "Deno >=2.2.10" is correct for the whole feature and for `await using`; the `using` statement alone is older.
- Baseline: web-features `explicit-resource-management` is `baseline: false` (supports chrome/edge 134, firefox 141 only). Source: https://github.com/web-platform-dx/web-features
- Node 22 ships V8 12.4: not re-verified, no change expected.

### resources.md TS-RES-04: oxc#25155
Verdict: unchanged, still open. Issue state open, zero comments, last updated 2026-09-07, label `A-transformer`. The only linked fix, PR [#25169](https://github.com/oxc-project/oxc/pull/25169) "fix(compat): handle missing engine feature data", is open, not draft, mergeable_state `blocked`, last updated 2026-11-25. No Oxc or Vite version fixes it, so the Vite-8 clause cannot become a version floor. Current versions for reference: Oxc crates v0.160.0 (2026-11-23), oxlint 1.95.0, Vite 8.4.0 (2026-11-26). Suggested edit: change "(open as of 2026-08-29)" to "(open as of 2026-11-27; fix PR #25169 unmerged)". Note the nuance introduced by this window: with Safari 27.3 now in BCD, a lowering table that has Safari 27.3 but older Safari versions without data may still mis-handle older targets; the repro against the project's own browserslist remains the right check.

### errors.md: Error.isError watch item
Verdict: unchanged decision; progress noted. Not Baseline. web-features `is-error` dist: `baseline: false`, support chrome/edge 134, firefox 138 only. BCD `Error.isError`: Chrome 134, Firefox 138, Node 24.3.0, Deno 2.2, Bun 1.1.39 (partial: returns `false` for DOMException), Safari `preview`. BCD commit "Safari TP now supports Error.isError() fully (#30806)" on 2026-10-09 (WebKit commit 318930). Safari still has no stable release with it. errors.md should stay "not adopted"; update the date to 2026-11-27 and note Safari TP support as of 2026-10-09. Revisit trigger: web-features flips `is-error` to a Baseline status, which requires Safari stable first.

### testing.md and types.md: node:test stability, type stripping
Verdict: unchanged.
- doc/api/test.md on main: Test tags ("Stability: 1.0 - Early development"), Global setup and teardown (1.0 - Early development), Collecting code coverage (Stability: 1 - Experimental), mock.module (1.0). Node now uses a decimal stability scale; all three named features remain Stability 1.x. Node 26 is LTS.
- typescript.md on main still lists `Enum` declarations and `namespace` with runtime code as unsupported and says they raise `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; type stripping is "Stability: 2 - Stable". Sources: https://nodejs.org/api/typescript.html (via main markdown).

### extension-host.md TS-HOST-21: require(esm)
Verdict: unchanged. modules.md history: flag-free in v23.0.0 / v22.12.0 / v20.19.0 (PR 55085); experimental warning dropped v23.5.0 / v22.13.0 / v20.19.0; stable later (PR 60959). `ERR_REQUIRE_ASYNC_MODULE` is still thrown for top-level-await graphs (modules.md line ~317). No change.

## Normative candidates
None new. Suggested wording-only edits (no rule added or removed):
1. resources.md native `using` paragraph: replace "Safari has never shipped it" with "Safari has not shipped it in a stable release; BCD records it in the Safari 27.3 beta (2026-11-11)". Rationale: matches current BCD and keeps the floor honest. Verification: re-read `javascript/statements.json` in mdn/browser-compat-data for `using.support.safari`; when `27.3` is a released version in Safari release notes, flip the sentence.
2. TS-RES-04: change the oxc#25155 date to 2026-11-27 and name PR #25169. Rationale: the Vite-8 clause stays a conditional repro, not a floor. Verification: `gh api repos/oxc-project/oxc/issues/25155 --jq .state`.
3. resources.md #64406 sentence: add the stale label and auto-close date. Verification: `gh api repos/nodejs/node/issues/64406 --jq '[.state,(.labels|map(.name))]'`.
4. errors.md: refresh date and add Safari TP support (2026-10-09). Verification: `web-features is-error.yml.dist` shows `baseline: false`.

## Limits
- I did not run `node` to re-measure exit/pipe behavior; the verdict rests on changelogs and current process docs.
- Safari 27.3 stable release status was inferred from the BCD commit message ("27.3 beta"), the Apple release-notes page title and the WebKit blog listing; the page body of the Apple notes did not load, so the exact feature list in that beta is unconfirmed.
- TS-ASYNC-09 (lib.dom.d.ts typing) was not checked.

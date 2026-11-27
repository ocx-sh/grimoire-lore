---
title: Loading, progress and acknowledgement for web and webview UI (the feedback ladder)
program: product
sub_program: ux
topic: ux-interface-states
worker: loading-and-progress
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
scope: >
  Covers the feedback ladder for web pages and VS Code webviews: response-time budgets,
  which indicator for which wait, click acknowledgement, repeat-activation protection and
  status announcement. Aligned with CLI-16 and TUI-23. Excludes empty and error content
  (next dive), CLI progress (CLI-08) and native `window.withProgress` (editor-extension-surfaces).
  Fleet measurements are static reads plus browser timings of three real actions under emulated network throttling (see 1.5).
---

# Loading, progress and acknowledgement for web and webview UI

## Contents

- [Summary](#summary)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Dated facts](#dated-facts)
- [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- The only response-time model with a primary source is Nielsen's 0.1 / 1 / 10 s limits, from a 1993 book excerpt with a 2014 update ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)). It is a heuristic, not a CI gate. The measurable gate is INP: 200 ms good, 500 ms poor, at the 75th percentile ([web.dev](https://web.dev/articles/inp), updated 2025-09-02).
- Decide one ladder for web and terminal: under 1 s nothing but an acknowledgement on the control; 1 s to 10 s an indeterminate indicator; past 10 s a determinate indicator plus a cancel path. This is TUI-23 unchanged, with one added tier from Primer: prefer determinate from 3 s when progress is countable (Primer loading pattern, undated, fetched 2026-11-27: 1 to 3 s indeterminate, 3 to 10 s determinate if possible, [https://primer.style/product/ui-patterns/loading/](https://primer.style/product/ui-patterns/loading/); Nielsen 1 s and 10 s limits, 1993 with 2014 update, [https://www.nngroup.com/articles/response-times-3-important-limits/](https://www.nngroup.com/articles/response-times-3-important-limits/)).
- Measured 2026-11-27 (section 1.5, emulated Chromium throttling): on the Grimoire docs, search opens in 10 ms but shows no text until about 0.7 s ("Searching for install..."), and the first result lands at 2.27 s on Slow 4G and 6.93 s at 400 kbit/s with 400 ms latency.
- Acknowledgement deadline: the control itself changes visibly within 100 ms of activation, in the first paint after the event. Tog's 50 ms is undated and cited as a ceiling for "good enough", not a gate ([askTog](https://asktog.com/atc/principles-of-interaction-design/), 2014-03-05).
- Skeleton for a first load of a whole view (under 10 s), spinner for one module, progress bar for a process (upload, install). A frame-only skeleton is wrong ([NN/g skeletons](https://www.nngroup.com/articles/skeleton-screens/), 2023-06-04, reviewed 2026-09-02).
- Never replace content the user already sees with a skeleton on refresh. Keep it and show a refreshing cue. The fleet's sidebar already does this with a 1000 ms delay (`vscode/src/webview/sidebar/main.ts:1245-1258`); Primer and NN/g both put the first indicator at 1 s ([Primer, undated, fetched 2026-11-27](https://primer.style/product/ui-patterns/loading/), [NN/g, 2023-06-04, reviewed 2026-09-02](https://www.nngroup.com/articles/skeleton-screens/)).
- Double-submit rule: set a pending flag synchronously in the click handler, before the first `await` or `postMessage`; refuse a second activation while it is set; keep the initiating control focusable (`aria-disabled`, not `disabled`).
- The fleet's extension webviews wait for the host's `busy` message before they lock. That is a round trip during which a second click passes the guard. Measured, section 1.2.
- A network mutation also carries an idempotency key; the IETF header is still an Internet-Draft, version 09 dated 2026-11-21, expiring 2027-05-25, not an RFC ([IETF datatracker, fetched 2026-11-27](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/); re-checked in the repair pass).
- Announce pending, done and failed in a `role="status"` element that exists at page load (WCAG 4.1.3, AA, [W3C](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).
- A visual indicator alone fails 4.1.3. A spinner with `aria-hidden` and no status text is the common agent output.
- The topic map's "0 progress calls" for the extension is right for `window.withProgress` (0) but misleads: 11 `runWithStatusProgress` calls drive a status-bar spinner (1.2). The scout's "183 message calls" counts tests; non-test is 33.
- Vercel's guideline (vendor data, undated, re-fetched 2026-11-27) says a show-delay of about 150 to 300 ms and a minimum visible time of about 300 to 500 ms apply and that React `Suspense` does this automatically ([Vercel README](https://github.com/vercel-labs/web-interface-guidelines)). React's own page documents a 300 ms reveal throttle ("React reveals suspended content at most once every 300ms") and no show-delay ([React docs, undated, fetched 2026-11-27](https://react.dev/reference/react/Suspense)). Do not rely on it (section 3).
- One preprint (240 participants, between-subjects, US adults on Prolific, 2026-02-09, not peer-reviewed on the page fetched) found a 2 s time-to-first-token rated less thoughtful and useful than 9 s or 20 s ([arXiv:2604.06183](https://arxiv.org/abs/2604.06183)); this is no licence for an artificial delay (section 3, contested).

## Findings

### 1. What the fleet does (measured 2026-11-27)

#### 1.1 Inventory of async actions

Commands run from `/home/mherwig/dev`. Line cites are in the named repo.

| Surface | Async action | Indicator, when | Repeat activation blocked | Evidence |
|---|---|---|---|---|
| `grimoire-rs/grim-gui` | `invoke("grim_version")` on load | none; root empty until it resolves | n/a, no control | `src/main.ts:11-22`; `product-audit/ui-code-posture.md` section 1 |
| Theme search (`@ocx-sh/theme`) | lazy load of search machine and skin on trigger press | `aria-busy="true"` on the trigger until loaded | presses before load flip a `wanted` flag, so they are coalesced, not queued | `ocx-sh/website/packages/theme/src/starlight/Search.astro:100-112` |
| Theme `Deferred` fragments | `fetch(frag/...)` at idle or first input | exact-size skeleton in the HTML (so shown at 0 ms, before any wait), `aria-busy`, error state with Retry, 10 s timeout | n/a (not user-triggered) | `components/Deferred.astro:1-40`, `components/ui/fetch-html.mjs:8`, `components/ui/deferred.mjs:58-81` |
| Theme `fetch(` sites | 8 call sites (`dependency-explorer.mjs:95,391`, `term-tip.mjs:28`, `terminal.mjs:286`, `deferred-group.mjs:21`, `fetch-html.mjs:30`, `shell-swap.mjs:69,149`) | 3 of 8 pass `AbortSignal.timeout` (10 s or 15 s: `dependency-explorer.mjs:391`, `deferred-group.mjs:21`, `fetch-html.mjs:30`); the other 5 show no deadline at the call | n/a | `git -C ocx-sh/website grep -nE "\bfetch\(" -- packages/theme/src site/src` |
| VS Code details webview | 10 mutating actions (`install`, `uninstall`, `update`, `switch`, `pin`, `pick-version`, `init-project`, `install-grim`, `complete-install`, `vote`) | header goes inert (`busy` class), status-bar `$(sync~spin) Grimoire: <title>`; no in-page spinner | yes, but only after the host posts `busy` | `src/webview/actions.ts` (10 `true`, 22 `false`), `src/webview/details/main.ts:223`, `src/notify.ts:52-70` |
| VS Code sidebar webview | same mutating set; search (250 ms debounce) | refresh keeps painted results; after 1000 ms swaps the footer to a "refreshing" line | yes, after host `busy` | `src/webview/sidebar/main.ts:780,1193,1245-1258` |
| VS Code settings webview | about 19 `data-action`s, debounced text inputs (400 ms) with row `status = 'saving'` | per-row saving status | no guard: the file says "The settings webview runs its own dispatcher with no busy guard" | `src/webview/actions.ts` header comment, `src/webview/settings/main.ts:154,744` |

Commands:
`cd grimoire-rs/vscode && git grep -nE "postMessage" -- src/webview | wc -l` lists the 23 webview-to-host post sites (19 in `details/main.ts`, 2 in `settings/main.ts`, 2 in `sidebar/main.ts`);
`git grep -cE 'data-action="' -- src/webview/render.ts src/webview/settings/render.ts` gives 45 and 19;
`grep -cE ": true," src/webview/actions.ts` gives 10 and `: false,` gives 22.

#### 1.2 The guard has a round-trip gap

`webview/details/main.ts:221-226` refuses a mutating click only `if (busy !== null && isMutating(action))`. `busy` is set solely by the host's `{type:'busy'}` message (`main.ts:402-405`). The click handler itself posts `vscode.postMessage({ type: 'install', ... })` (`main.ts:243`) without setting `busy` locally. The host then posts `busy` back (`views/details.ts:876,947`). Between click and that message the guard is open, so two clicks inside one round trip both post. The sidebar has the same shape (`sidebar/main.ts:741,780`). The comment at `main.ts:34-40` records the intent (refuse "outright", not "dimmed") but not this window.

The host side does not serialise either: `runWithStatusProgress` refcounts concurrent runs (`notify.ts:52-70`: `refs++`, "concurrent runs show the latest title"), so a second mutation starts rather than being refused. I did not execute the extension; this is a code reading. To close the question, add a `host.install` call counter in a test and fire two `install` messages in one tick (the repo has `src/test/actions.test.ts` as the nearest harness).

Correction to the topic map: `git grep -nE "withProgress" -- src` returns 0 (matches the "0 progress" claim for the native API), but `git grep -nE "runWithStatusProgress\(" -- src ':!src/test' | wc -l` returns 11, so progress exists as a status-bar spinner. `git grep -nE "showInformationMessage|showWarningMessage|showErrorMessage" -- src | wc -l` returns 180 including tests and 33 with `':!src/test'`. The "183" figure in `ux-topic-map.md` rows M066 is a count that includes tests.

#### 1.3 What the fleet does well

- `Deferred` reserves the exact box (no layout shift), sets `aria-busy`, bounds the wait at 10 s, and offers Retry with the text `Could not load this.` (`Deferred.astro`, `fetch-html.mjs:8`). This matches [Primer](https://primer.style/product/ui-patterns/loading/) ("avoid layout shift when content arrives") and [NN/g](https://www.nngroup.com/articles/skeleton-screens/).
- The sidebar's refresh keeps content and delays the footer cue by 1000 ms, which equals the 1 s limit and avoids a flash. The same file's comment states the reason ("anything faster never shows it").
- `MUTATING_ACTIONS` with explicit `false` entries plus a drift test (`src/test/actions.test.ts`) is the only machine-checkable guard found in the fleet. It checks that every action is classified, not that the click path sets a local pending flag.
- Theme `Search.astro:108` puts `aria-busy` on the trigger while the machine loads: this is the acknowledge-the-click pattern for a lazy load. In the 1.5 run on the Grimoire docs the Ctrl+K path never set `aria-busy` on the trigger (dialog opened at 10 ms), so the pattern is not exercised by keyboard activation in that build.

#### 1.4 Gaps

- `grim-gui` has no loading state; its call is a local child process, so the wait is normally under 1 s, but a missing or slow `grim` leaves a blank root (`src/main.ts:11-13`).
- `git grep -nE "aria-busy|aria-live|role=.(status|alert)" -- src/webview src/views` in the extension returns 4 hits; the status-bar spinner is not exposed to a webview user's assistive technology, and the busy header has no status text in the page. Open a details panel in a screen reader to confirm; I did not.
- 5 of 8 theme `fetch(` sites show no deadline at the call (`dependency-explorer.mjs:95`, `term-tip.mjs:28`, `terminal.mjs:286`, `shell-swap.mjs:69,149`); a caller may bound them elsewhere, which I did not trace. A request without a timeout can show a spinner forever, which breaks the 10 s tier of the ladder.

#### 1.5 Timing three real actions under throttled network

Repair pass, 2026-11-27. The earlier run could not launch Chromium (`libnspr4.so` missing). Fix, no root needed: `apt-get download libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libxcb1 libasound2t64 libatspi2.0-0t64 libxau6 libxdmcp6 libxrender1 libdrm2 libwayland-server0 libxcb-randr0 libbsd0 libmd0 libxi6 libxtst6`, `dpkg -x` each into `~/.cache/research-lang/exemplars/product/chroot-libs/root`, then run Playwright's own `chrome-headless-shell` (build 1255, the one in `~/.cache/ms-playwright`) with `LD_LIBRARY_PATH` pointing there and `playwright-core` from `ocx-sh/website/node_modules`. `ldd` then reports no missing library.

Setup: the built Grimoire docs (`grimoire-rs/grimoire/docs/dist`, Astro Starlight with Pagefind search) served by `python3 -m http.server 8744`. Throttling is Chromium's CDP `Network.emulateNetworkConditions` with `Network.setCacheDisabled`, so the numbers include real round-trip latency, unlike the earlier `curl --limit-rate` payload test. Two profiles: "Slow 4G" (1.6 Mbit/s down and up, 150 ms latency, the Lighthouse Slow 4G values) and "slow custom" (400 kbit/s, 400 ms latency, my choice, not a named preset). One run per cell; no repeat, so treat figures as single observations. Timings are wall-clock from the Playwright call (`Date.now()` around the action), polled every 10 to 250 ms, so they carry that resolution; first paint was not read from a frame trace.

| Action | Slow 4G | 400 kbit/s, 400 ms | What the user sees in between |
|---|---|---|---|
| A. Press Ctrl+K (open search, first use) | dialog open 10 ms after the key | dialog open 10 ms | Dialog (an empty field and a "Clear" button) appears at once. The trigger has no `aria-busy` at any poll (`busyAt: null`), so the lazy-load acknowledgement noted in 1.1 is not what this build shows on the keyboard path. |
| B. Type "install" (first query, index chunk and fragments to fetch) | first result link at 2226 to 2266 ms | first result link at 6927 to 7218 ms | Blank dialog to about 0.2 s; text "Searching for install..." from about 0.7 s; a "42 results for install" count with dot placeholders at 2.0 s (Slow 4G) or 6.4 s; results after that. No `aria-busy`, `role=status` or `aria-live` element was found inside the dialog by the selectors `[aria-busy]` and `[role=status],[aria-live]`. |
| C. Click an internal link (`/introduction.html`) | response commit 291 ms, load 1271 ms, first contentful paint 1008 ms from navigation start | commit 567 ms, load 4298 ms, first contentful paint 3768 ms | Browser default (previous page stays until commit); no in-page indicator, none expected for a full navigation. |

Commands: scripts `t.mjs`, `t2.mjs`, `t3.mjs` in the session scratchpad (not part of the artifact); the core calls are `await pg.keyboard.press('Control+k')`, `await pg.keyboard.type('install',{delay:20})` and `await pg.waitForSelector('dialog[open] a[href]')`, and `pg.click('a[href="/introduction.html"]')` with `waitForNavigation({waitUntil:'commit'})`, then `performance.getEntriesByName('first-contentful-paint')`.

Reading against the ladder (Primer and NN/g thresholds in 2.2):

- Acknowledgement (rule UX-LOAD-1): pass for A; the control answers inside 100 ms even at 400 ms latency.
- Indicator by wait (UX-LOAD-2/3): B is a 2.3 s wait on Slow 4G (indeterminate tier) and 6.9 s on the slow profile (determinate-if-possible tier, 3 to 10 s). The widget shows text at about 0.7 s and a count with dots at 2 to 6 s, that is an indeterminate cue only; no counter exists (the number of results is not progress). This is Pagefind's own widget, not fleet code; I did not check whether a CSS-driven spinner is painted.
- Status announcement (UX-LOAD-9): the dialog exposes no `role=status`, `aria-live` or `aria-busy` by selector. A screen-reader check was not done; the `Searching for...` text may sit in a live region the selector missed (for example an ancestor). Verify with a screen reader before treating as a defect.
- Earlier payload figures retained for context: `pagefind-component-ui.js` 175488 B and the largest fragment 87762 B took 2.64 s and 1.64 s under `curl --limit-rate 50k`; `curl` gives a burst allowance to files under about 64 KB, so those two rows are the only valid ones from that method and the third (index chunk) is arithmetic only. The browser run above supersedes them.

### 2. Sources behind the ladder

#### 2.1 Response-time limits

[NN/g, Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/): dated 1993 (excerpt of *Usability Engineering*), with a 2014 update. 0.1 s: feels instantaneous, no feedback needed. 1.0 s: flow of thought stays unbroken; the 2014 update adds "For delays of more than 1 second, indicate to the user that the computer is working on the problem." 10 s: the attention limit; give "feedback indicating when the computer expects to be done"; the update adds "percent-done progress indicators should be used for operations taking more than about 10 seconds" with "a clearly signposted way for the user to interrupt the operation". For 2 to 10 s a busy cursor with a changing counter is suggested; "Most web browsers fail in providing useful progress bars."

[NN/g progress indicators](https://www.nngroup.com/articles/progress-indicators/), Sherwin, 2014-10-26: looped animation for about 2 to 10 s, percent-done for 10 s and above, and for shorter series ("Updating address 3 of 50"). A static "Loading…" is not recommended. A University of Nebraska-Lincoln study (no sample size or year in the article) found a moving bar raised satisfaction and willingness to wait by about 3 times. The article's body says 2 to 10 s and its conclusion 2 to 9 s: an internal inconsistency of one second.

[web.dev INP](https://web.dev/articles/inp), published 2022-05-06, updated 2025-09-02: good 200 ms or less, needs improvement to 500 ms, poor above 500 ms, at the 75th percentile of page loads. It counts click, tap and key press; it excludes scroll, hover and zoom. "The browser should present visual feedback in the next frame it paints." INP measures how long that next paint is blocked, "not the full downstream effects of network fetches". So INP gates acknowledgement, never loading.

[web.dev optimise INP](https://web.dev/articles/optimize-inp), 2023-05-19, updated 2025-09-02: in the handler update only what the next frame needs, defer the rest with `setTimeout` inside `requestAnimationFrame`, and yield right after a UI-updating callback. An interaction has three phases: input delay, processing duration, presentation delay.

[askTog](https://asktog.com/atc/principles-of-interaction-design/), Tognazzini, 2014-03-05: "Acknowledge all button clicks by visual or aural feedback within 50 milliseconds"; "Trap multiple clicks of the same button or object" because "people tend to press the same button repeatedly, causing things to be even slower". The 50 ms figure has no cited study on that page. [Laws of UX](https://lawsofux.com/doherty-threshold/) cites Doherty and Thadani, IBM Systems Journal, 1982, for 400 ms as the pace at which productivity "soars".

The three authorities nest cleanly: 0.1 s (Nielsen) and 50 ms (Tog) bound the control's own response; 200 ms (INP) is the measured field budget; 400 ms (Doherty) is the system-response budget. The ladder below uses 100 ms for the control, 200 ms as the field gate.

#### 2.2 Indicator by wait and scope

[NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) (2023-06-04, reviewed 2026-09-02): under 1 s neither spinner nor skeleton; about 2 to 10 s either; "Skeleton screens should be used with a wait time that's under 10 seconds"; progress bar "strongly recommended" past 10 s with "an explicit estimation of duration". Skeleton for a whole screen, spinner "on a single module, like a video or a card"; for uploads and downloads a skeleton "could even be confusing"; a frame-only skeleton "should not be used as a progress indicator"; shimmer "can ... create accessibility problems for some users".

[Primer loading](https://primer.style/product/ui-patterns/loading/) (undated; fetched 2026-11-27): under 1 s no loading state ("A flash could feel distracting and slow"); 1 to 3 s indeterminate; 3 to 10 s determinate if possible; over 10 s determinate, and "Treat as a background task if possible". Show items as they load. Place the indicator nearest the content it replaces. Replace a group of adjacent indicators with one. Use one announcement for a group of skeletons. Set `aria-busy="true"` on a live region while updating. The page's reduced-motion sentence is ambiguous (it says animated indicators "should not be disabled when for users that prefer reduced motion"); I treat it as unverified and do not turn it into a rule.

[Vercel web interface guidelines](https://github.com/vercel-labs/web-interface-guidelines) (README, no date or commit shown on the page; same text on [vercel.com/design/guidelines](https://vercel.com/design/guidelines)): "Show a loading indicator & keep the original label." "add a short show-delay (~150-300 ms) & a minimum visible time (~300-500 ms)." "`POST/PATCH/DELETE` complete in <500ms." This is a vendor's own guideline, not a study.

Where they overlap: all three put the first indicator at 1 s (NN/g, Primer) or earlier (Vercel 150-300 ms). The decision for the fleet is 1 s, matching TUI-23 and `sidebar/main.ts:1258`; the Vercel numbers apply to a spinner inside a control that the user just pressed, where the user is already waiting for a reply.

#### 2.3 Alignment with the catalog

From `skills/rust-quality-reference/tui.md:124`, TUI-23 (SHOULD): "Feedback scales with duration: under ~1 s nothing, 1–10 s an indeterminate spinner, past ~10 s a determinate progress indicator **and** a cancel path. Never a modal that blocks input for a state the user did not ask to confirm."
From `skills/rust-quality-reference/cli-contract.md:138`, CLI-16 (CONSIDER): "Print something within ~100 ms for any command doing network I/O". CLI-08 (MUST): progress draws to stderr and is suppressed off-TTY.

So the terminal already states 100 ms acknowledgement, 1 s first indicator and 10 s determinate-plus-cancel. The web ladder in this artifact takes the same three numbers. The one difference is that the web adds a Primer tier (3 s determinate when countable); TUI-23 does not, and it need not conflict: determinate is "if possible" and TUI-23's rule reads as a floor. Tell the consolidator to consider adding "from ~3 s when the work is countable" to TUI-23 for symmetry, but not to change CLI-16.

#### 2.4 Repeat activation

Three sources disagree on the mechanism, agree on the goal.

- Vercel README, "Submission rule": "Keep submit enabled until submission starts; then disable during the in-flight request," plus a spinner and an idempotency key.
- [Primer button accessibility](https://primer.style/product/components/button/accessibility/) (no date shown): do not remove the button or add `disabled`; add `aria-disabled="true"`; keep it focusable; include a visually hidden `aria-live="polite"` region present on page load whose message renders only while loading, such as "Saving profile". The Primer loading page (fetched through a summariser) says (re-fetched 2026-11-27) the button that starts the process "may not be semantically disabled using `aria-disabled`" and refers to the Button page, which says the opposite; the extraction may have dropped a word, so treat the pair as unreconciled (section 3).
- [GOV.UK button](https://design-system.service.gov.uk/components/button/) (most recent dated entry Jul 2026): `data-prevent-double-click="true"`, JavaScript only, "only if research shows users are often sending information twice"; also address it server-side; give loading information first; "Disabled buttons have poor contrast and can confuse some users".

[IETF idempotency-key draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/): `draft-ietf-httpapi-idempotency-key-header-09`, dated 2026-11-21, an Internet-Draft, not an RFC, expires 2027-05-25. Retry while the original runs: 409; reused key with a different payload: 422 when fingerprints exist; completed duplicate: respond as the original did.

#### 2.5 Status announcement

[WCAG 2.2 SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), Level AA, page updated 2026-10-04: status messages, including "the waiting state of an application" and "the progress of a process", must be "programmatically determinable ... without the user receiving focus". Techniques: ARIA22 `role=status`; ARIA23 `role=log` for sequential progress; ARIA19 `role=alert` for errors. [MDN aria-busy](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy) (last modified 2025-06-23): `aria-busy="true"` tells assistive technology to wait until a region is done changing; MDN's page gives no support data, so do not rely on it as the only signal that something is pending.

#### 2.6 Avoid flashing loaders over content already shown

[React `Suspense`](https://react.dev/reference/react/Suspense) (fetched 2026-11-27, undated): a boundary that re-suspends shows its fallback again "unless the update causing it was caused by `startTransition` or `useDeferredValue`"; transitions keep the old content and `useTransition` gives `isPending` for an inline cue; "React reveals suspended content at most once every 300ms". There is no show-delay.

#### 2.7 AI features

No NN/g article on AI response time was found. One preprint: [Tan, Messerschmidt, Yin, Nov, arXiv:2604.06183](https://arxiv.org/abs/2604.06183), 2026-02-09, time-to-first-token of 2, 9 and 20 s over two task types: interaction behaviour did not change with latency; the 2 s group rated outputs less thoughtful and less useful; waits were mostly read as the AI deliberating, with very long waits sometimes read as unreliability. Sample size is not in the abstract page I fetched. The ladder applies to AI calls with the clock starting at submit: acknowledge at 100 ms, an indeterminate indicator by 1 s, a stop control from the first indicator (the call is open-ended, so the 10 s tier's cancel path moves to 1 s).

### 3. Contested points with the decision taken

Sources for each side are in "Contested / evolving"; the decisions taken are:

| Question | Decision taken | Basis |
|---|---|---|
| First indicator at 150 to 300 ms (Vercel) or 1 s (Primer, NN/g)? | 1000 ms for a region or page indicator; an immediate non-spinner pending state on the pressed control. | [Primer](https://primer.style/product/ui-patterns/loading/): under 1 s no loading state; [NN/g](https://www.nngroup.com/articles/skeleton-screens/): under 1 s neither spinner nor skeleton; [Vercel](https://github.com/vercel-labs/web-interface-guidelines) is vendor data. Fleet sidebar and TUI-23 already use 1 s. The measurement in 1.5 shows a docs search with an empty dialog for 0.7 s, so the 1 s rule is not obviously wrong for it. |
| `disabled` or `aria-disabled` while submitting? | `aria-disabled` plus a synchronous guard on the initiating control. | [Primer button](https://primer.style/product/components/button/accessibility/), [GOV.UK button](https://design-system.service.gov.uk/components/button/). The Primer loading page says the button "may not be semantically disabled using `aria-disabled`" (re-fetched 2026-11-27), the opposite of the Button page; unresolved, so the guard is the load-bearing part. |
| Does `Suspense` supply show-delay? | No; state the delay in code. | [React docs](https://react.dev/reference/react/Suspense) document only a 300 ms reveal throttle and `startTransition` / `useDeferredValue` for already-revealed content; the Vercel README claims "does this automatically". |
| Where is the determinate boundary? | 10 s mandatory with cancel; prefer determinate from 3 s when countable. | [NN/g progress indicators](https://www.nngroup.com/articles/progress-indicators/) (body 2 to 10 s, conclusion 2 to 9 s) and [Primer](https://primer.style/product/ui-patterns/loading/). |
| Added latency for AI answers? | None without owner decision. | [arXiv:2604.06183](https://arxiv.org/abs/2604.06183): 2 s read as less thoughtful in one 240-participant study; not replicated. |


## Normative guidance candidates

IDs are working labels (UX-LOAD-n) for the consolidator, not final.

1. **UX-LOAD-1 (MUST). Acknowledge every activation on the control itself, in the first paint after the event.** Set the pending state synchronously in the handler, before any `await` or `postMessage`. Rationale: INP counts the next paint; a control that waits for the host or the network to change looks dead. Verify: in each handler for an async action, the first statement that is not argument parsing sets state (a class, `aria-disabled`, a signal); `grep -nB2 -A6 "addEventListener('click'"` and read: pass is a state write before `await`/`postMessage`; fail is `postMessage(...)` or `fetch(` as the first effect. Field gate: INP at 200 ms or less at p75 ([web.dev](https://web.dev/articles/inp)).
2. **UX-LOAD-2 (MUST). Do not show a spinner or skeleton for a wait under 1 s.** Delay the indicator 1000 ms from the start of the wait (the fleet's sidebar value) unless the wait is declared as 1 s or more in advance. Rationale: Primer ("Don't show a loading state" under 1 s, [Primer loading, undated, fetched 2026-11-27](https://primer.style/product/ui-patterns/loading/)) and NN/g (under 1 s neither spinner nor skeleton, [NN/g, 2023-06-04](https://www.nngroup.com/articles/skeleton-screens/)) both call a sub-second flash distracting; it matches TUI-23 and Nielsen's 1 s limit ([NN/g, 1993, updated 2014](https://www.nngroup.com/articles/response-times-3-important-limits/)). Verify: grep for a spinner or loading-state toggle set without a timer: `grep -nE "loading *= *true|setLoading\(true\)|isLoading" ` and read; pass shows `setTimeout(..., 1000)` or an `expected` declaration of at least 1 s; fail sets the state immediately. Exception: the in-control pending state of UX-LOAD-1 is not a spinner and is immediate.
3. **UX-LOAD-3 (MUST). Pick the indicator by scope and expected wait.** 1 to 3 s: indeterminate spinner (one module) or skeleton (a whole view's first load). 3 to 10 s: determinate if the work is countable, else indeterminate. Over 10 s: determinate with a cancel path, and a background task if the user can continue. Process tasks (upload, install, update-all) use a bar, never a skeleton. Rationale: the 1 s, 3 s and 10 s tier boundaries come from [Primer loading (undated, fetched 2026-11-27)](https://primer.style/product/ui-patterns/loading/), the skeleton-versus-spinner scope and bar-over-10 s rule from [NN/g skeleton screens (2023-06-04, reviewed 2026-09-02)](https://www.nngroup.com/articles/skeleton-screens/), and the 10 s determinate tier from [Nielsen (1993, updated 2014)](https://www.nngroup.com/articles/response-times-3-important-limits/) and TUI-23. Verify: each async call site declares (a comment or a prop) its expected-wait class, and the component matches it; a skeleton on an upload or install is a finding; a "determinate" bar whose value is not derived from a counter is a finding (UX-LOAD-7). Named heuristic: "A bar that moves on a timer, not on a count, is fake."
4. **UX-LOAD-4 (MUST). A skeleton occupies the exact box of the content and is never frame-only.** It carries placeholders for content (lines, cards), reserves the final size, and is replaced in place. Rationale: layout shift; NN/g "frame-display ... should not be used". Verify: a CLS check in the page test, or read the skeleton slot beside the real component for equal height; `Deferred.astro` (required `skeleton` slot) is the pass example; a skeleton that renders only header and footer is the fail.
5. **UX-LOAD-5 (MUST). On refresh, keep what is painted.** Do not swap a view that already has content for a skeleton or spinner; show a small refreshing cue after 1 s and mark stale content as such. Rationale: React transitions and the sidebar both avoid hiding revealed content. Verify: for each reload path, read that the old render survives until the new data arrives; fail is `setData(null)` or a `loading` branch that precedes the data branch on refetch. In React, the update that refetches is wrapped in `startTransition` or reads `useDeferredValue` ([React](https://react.dev/reference/react/Suspense)).
6. **UX-LOAD-6 (MUST). Refuse a repeat activation with a synchronous local flag, not a host or server round trip.** One in-flight guard per action: `if (pending) return; pending = true;` before the first await, cleared in `finally`. Rationale: Tog "Trap multiple clicks"; the fleet's measured gap (1.2). Verify: grep the handler for the flag and read that it is set before `postMessage`/`fetch`; an automated pass is a test that fires the activation twice in one tick and asserts one send: `host.send` called 1 time. For a webview the check goes beside `src/test/actions.test.ts`. A guard that is only `busy !== null` set by an inbound message fails.
7. **UX-LOAD-7 (MUST). Progress values come from counters, never from timers or constants.** Rationale: a bar not tied to work done misleads; [NN/g progress indicators, 2014-10-26](https://www.nngroup.com/articles/progress-indicators/) uses counts such as "Updating address 3 of 50" for determinate progress, and [Nielsen, 1993 updated 2014](https://www.nngroup.com/articles/response-times-3-important-limits/) asks for percent-done indicators for operations over about 10 s. Verify: `grep -nE "setInterval|setTimeout" ` in the same file as a progress `value`/`aria-valuenow`; fail is a value incremented in the timer callback with no count behind it; also `grep -nE "(value|aria-valuenow)=\{?['\"]?[0-9]+"` flags hard-coded percentages.
8. **UX-LOAD-8 (SHOULD). Keep the initiating control focusable while pending: `aria-disabled="true"` plus a guard, not the `disabled` attribute, and keep the original label.** Rationale: `disabled` drops focus and breaks keyboard flow ([Primer](https://primer.style/product/components/button/accessibility/)); Vercel keeps the label. Verify: `grep -nE "\.disabled *= *true|setAttribute\('disabled'" ` on a pending path is a finding unless a comment names why (a form whose fields are being submitted may disable the fields, per Primer loading); the guard of UX-LOAD-6 must still exist because `aria-disabled` blocks nothing by itself.
9. **UX-LOAD-9 (MUST). Announce pending, done and failed in a status element that exists at load.** `role="status"` (or `aria-live="polite"`), always in the DOM, text rendered only while the state holds; errors go to `role="alert"`. One announcement for a group of skeletons. Rationale: WCAG 4.1.3 AA; a spinner with no text fails it. Verify: `grep -rnE "role=.(status|alert)|aria-live" ` returns at least one hit in each view that has an async path; axe-core has no rule that proves a missing status message, so the check is a named reading heuristic: "Press the control with a screen reader; pass is a spoken 'Saving' within 1 s and a spoken result".
10. **UX-LOAD-10 (MUST). Give every network wait a deadline and a failure path.** `fetch` with `AbortSignal.timeout(n)`; a visible error with a Retry after at most 10 s for fragments (the fleet's value, `fetch-html.mjs:8`). Rationale: a spinner without a deadline is an infinite wait. Verify: `git grep -nE "\bfetch\(" ` and require `signal` in the same call; the fleet has 5 of 8 call sites that show none at the call (1.1).
11. **UX-LOAD-11 (MUST). Past 10 s, offer cancel; for an AI or other open-ended call offer stop from the first indicator.** Rationale: [Nielsen's 2014 update](https://www.nngroup.com/articles/response-times-3-important-limits/) asks for "a clearly signposted way for the user to interrupt the operation" past about 10 s, and TUI-23 (catalog) says the same for the terminal; for open-ended AI calls the wait has no known end, so stop is offered from the first indicator (the 2026 preprint [arXiv:2604.06183](https://arxiv.org/abs/2604.06183) found long waits sometimes read as unreliability). Verify: for each operation declared 10 s or more, grep for `AbortController` wired to a visible control; the review heuristic is "Can I leave this wait without killing the window?".
12. **UX-LOAD-12 (SHOULD). A network mutation carries an idempotency key and the server treats a repeat as a no-op.** Rationale: a client guard cannot stop a retry after a lost response; GOV.UK also says to fix it server-side. Verify: `grep -rnE "Idempotency-Key"` on POST/PUT/PATCH/DELETE clients, or a documented reason the endpoint is naturally idempotent. The header is still an Internet-Draft ([IETF datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/), version 09 dated 2026-11-21, expires 2027-05-25, re-fetched 2026-11-27): cite it as a draft and use the name only if the server supports it.
13. **UX-LOAD-13 (CONSIDER). Once shown, keep a spinner visible 300 to 500 ms** to avoid a flash. Rationale: a vendor guideline: "a minimum visible time (~300-500 ms)" ([Vercel web interface guidelines, vendor data, undated, re-fetched 2026-11-27](https://github.com/vercel-labs/web-interface-guidelines)), not a study. Because UX-LOAD-2 already delays to 1 s, this applies only to in-control spinners that appear at 150 to 300 ms. Verify: read for a `Math.max(0, min - elapsed)` before hiding.
14. **UX-LOAD-14 (SHOULD). Do not rely on a framework for show-delay.** State the delay in the code. Rationale: [React's Suspense page](https://react.dev/reference/react/Suspense) (undated, fetched 2026-11-27) documents only a 300 ms reveal throttle and opt-in `startTransition` / `useDeferredValue`, while the [Vercel README](https://github.com/vercel-labs/web-interface-guidelines) says Suspense "does this automatically"; the framework's own docs win. Verify: `grep -rn "Suspense"`: each boundary's fallback must be paired with a stated delay or a transition.
15. **UX-LOAD-15 (CONSIDER). Wrap long refresh in a background task** so the page stays usable past 10 s. Rationale: [Primer loading](https://primer.style/product/ui-patterns/loading/) (undated, fetched 2026-11-27) says over 10 s to treat the process as a background task if possible, so users keep working instead of staring at a bar; whether it is safe is an owner decision (see below). Verify: a reading heuristic, "Can I navigate away during this wait?".

### Detect lines (the four decisions)

- **Ladder:** every async call site shows an indicator of the right kind for its declared wait. Detect: for each `await fetch|invoke|postMessage` find the loading branch; flag a spinner on a whole-view first load, a skeleton on a process, a bar without a counter, a loading state without a 1000 ms timer, a call with no loading state and a declared wait of 1 s or more.
- **Acknowledgement deadline:** 100 ms to a visible change on the control. Detect: a state write precedes the first `await`/`postMessage` in the handler; field proxy INP p75 at 200 ms or less; a throttled run in which the control changes before the first network byte.
- **Double-submit:** Detect: a double-fire test (two activations in one tick, one send); grep for a flag set before the first async call; for forms see form-state-machine.
- **Missing state:** Detect: a view that has a data fetch and no `loading`, `error` or `empty` branch. Heuristic: for each async data source, three branches in the render function, named as such. (Empty and error contents belong to the next dive.)

## Dated facts

| Fact | Source | Date the source states | Kind |
|---|---|---|---|
| 0.1 s instantaneous, 1 s flow, 10 s attention; over 10 s percent-done with a signposted interrupt | [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/) | 1993 excerpt, update 2014 | independent authority (book excerpt) |
| Looped for about 2 to 10 s, percent-done for 10 s and over; a bar raised willingness to wait about 3 times (UNL study, no sample size, no year) | [NN/g progress indicators](https://www.nngroup.com/articles/progress-indicators/) | 2014-10-26 | independent authority; the study is cited, not reproduced |
| Under 1 s none; skeleton under 10 s; bar over 10 s with an explicit estimate; frame skeleton not a progress indicator | [NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) | 2023-06-04, reviewed 2026-09-02 | independent authority |
| Under 1 s none; 1 to 3 s indeterminate; 3 to 10 s determinate if possible; over 10 s determinate | [Primer loading](https://primer.style/product/ui-patterns/loading/) | no date on page; fetched 2026-11-27 | design system (vendor, GitHub) |
| INP: 200 ms good, 500 ms poor, p75; next-paint feedback | [web.dev INP](https://web.dev/articles/inp) | published 2022-05-06, updated 2025-09-02 | platform authority (Google) |
| Yield after UI update; three phases | [web.dev optimise INP](https://web.dev/articles/optimize-inp) | 2023-05-19, updated 2025-09-02 | platform authority |
| 50 ms click acknowledgement; trap repeat clicks | [askTog](https://asktog.com/atc/principles-of-interaction-design/) | 2014-03-05 | practitioner, no study cited |
| 400 ms Doherty threshold | [Laws of UX](https://lawsofux.com/doherty-threshold/) summarising Doherty and Thadani 1982 | 1982 | secondary summary of a study |
| show-delay 150 to 300 ms, minimum visible 300 to 500 ms, mutations under 500 ms | [Vercel guidelines](https://github.com/vercel-labs/web-interface-guidelines) | no date on page | vendor data (guideline, not a study) |
| WCAG 4.1.3 Status Messages, AA | [W3C Understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | updated 2026-10-04 | standard |
| `aria-busy` semantics | [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy) | modified 2025-06-23 | reference |
| Idempotency-Key header draft 09; 409 and 422 semantics | [IETF datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) | 2026-11-21 | standards draft (not an RFC) |
| React reveals suspended content at most once every 300 ms; no show-delay | [React docs](https://react.dev/reference/react/Suspense) | undated; fetched 2026-11-27 | platform/framework docs |
| 2 s TTFT rated less thoughtful and useful than 9 s and 20 s; N = 240 after exclusions, between-subjects, Prolific US adults (arXiv HTML, fetched 2026-11-27) | [arXiv 2604.06183](https://arxiv.org/abs/2604.06183) | 2026-02-09 (preprint, not peer-reviewed on the page I fetched) | independent study |
| GOV.UK prevent-double-click; avoid disabled buttons | [GOV.UK Design System](https://design-system.service.gov.uk/components/button/) | most recent change entry Jul 2026 (v6.4.0) | government design system |

## What an agent must not decide alone

- **An artificial or enforced delay** (to make an AI answer feel "considered", or a minimum spinner time beyond 500 ms). The preprint is one study and Laws of UX claims a trust effect for deliberate delay; ask. Default: no added delay.
- **Whether an operation is safe to cancel or run in the background** (partial install, half-written lock). Cancel semantics are a product and data-integrity decision; ask for the rollback contract.
- **Whether a mutation is idempotent on the server, and the key's retention window.** Ask the API owner; do not invent an `Idempotency-Key` header against a server that ignores it.
- **Which actions need confirmation versus a pending state** (destructive or paid). That belongs to confirmations-and-modals and, for money or legal acts, to the owner.
- **The expected-wait class of an operation** when no measurement exists. Measure it, or ask; do not guess a class and pick the ladder from it.
- **Legal copy in announcements** (consent, billing text) is a legal call.

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Sets `loading=true` after the `await` starts, or only in the host's reply, so the control looks dead for a round trip | UX-LOAD-1/6: a state write precedes the first `await`/`postMessage`; two-activation test |
| Uses a spinner for everything, including a whole page and an install | UX-LOAD-3 grep: spinner on a first load or process |
| Shows the spinner on every request, including 80 ms ones, which flashes | UX-LOAD-2: no loading state without a 1000 ms timer |
| Replaces the list with a skeleton on every refetch | UX-LOAD-5: old render survives; `startTransition` in React |
| Disables the button with `disabled` and drops focus; or uses `aria-disabled` and no guard, so a second click still fires | UX-LOAD-6 plus 8: both the flag and the attribute |
| Animates a progress bar on a `setInterval` | UX-LOAD-7 grep |
| Adds a spinner with no text and no live region, passing sight review and failing 4.1.3 | UX-LOAD-9 heuristic with a screen reader |
| Writes `fetch` with no timeout, so a stalled request spins forever | UX-LOAD-10 grep for `signal` |
| Trusts `Suspense` to delay or hold the fallback (Vercel's own text says so) | UX-LOAD-14: state the delay |
| Treats INP as the loading budget; INP is next-paint only | UX-LOAD-1 wording; INP excludes the fetch |
| Cites "NN/g 2014" for the 0.1/1/10 limits; they date from 1993 with a 2014 update | none needed; use the dated-facts line |
| Omits cancel on a long operation and a stop control on an AI call | UX-LOAD-11 grep for `AbortController` wired to a control |

## Contested / evolving

| Question | One side | Other side | Decision here |
|---|---|---|---|
| Time of the first indicator | Vercel (vendor): spinner after 150 to 300 ms, minimum 300 to 500 ms visible ([README](https://github.com/vercel-labs/web-interface-guidelines)) | Primer: under 1 s no state; NN/g: under 1 s none ([Primer](https://primer.style/product/ui-patterns/loading/), [NN/g](https://www.nngroup.com/articles/skeleton-screens/)) | 1000 ms for region and page indicators, matching TUI-23 and the fleet's sidebar; an immediate non-spinner pending state on the pressed control. Revisit if a throttled click-to-paint measurement shows users abandoning at 1 s; none exists. |
| `disabled` or `aria-disabled` while submitting | Vercel: "disable during the in-flight request" | Primer Button page: use `aria-disabled`, stay focusable; GOV.UK: avoid disabled buttons ([Primer](https://primer.style/product/components/button/accessibility/), [GOV.UK](https://design-system.service.gov.uk/components/button/)) | `aria-disabled` plus a guard on the initiating control (UX-LOAD-8); disabling the form's fields is allowed. The Primer loading pattern page itself says the starting button "may not be semantically disabled using `aria-disabled`" (re-fetched 2026-11-27) while its button page tells you to use it; I could not reconcile the two Primer pages and flag the pair. |
| Does `Suspense` supply show-delay and minimum time? | Vercel README says it does automatically | React's page shows a 300 ms reveal throttle and no show-delay ([React](https://react.dev/reference/react/Suspense)) | State the delay in code; trust the framework's own docs over the guideline. |
| 10 s tier boundary | NN/g progress-indicators conclusion: 2 to 9 s looped | Same article's body: 2 to 10 s; Primer: determinate from 3 s | 10 s for mandatory determinate plus cancel; 3 s for preferring determinate when countable. |
| Latency as a quality signal for AI | The preprint: a 2 s first token read as less thoughtful; Laws of UX: a deliberate delay can build trust | Vercel's guidance (found by search, not fetched) and everyday practice favour the shortest first token | No artificial delay without owner decision. One preprint (240 participants, between-subjects), not replicated. |
| Modern replacement for the 1993 limits | None found: web.dev INP replaces nothing, it measures next paint only | NN/g updated the page in 2014 only | Keep the 1993 limits as heuristic budgets; gate on INP only for acknowledgement. |
| Idempotency-Key | IETF draft 09, active | Not a standard; servers differ | Cite as draft; check the server. |
| Skeleton shimmer | NN/g: engaging | NN/g: also an accessibility risk | Static or slow pulse; remove under `prefers-reduced-motion` (WCAG 2.3.3 AAA is not required; this is a CONSIDER). I did not fetch 2.3.3, so no citation. |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.nngroup.com/articles/response-times-3-important-limits/ | Nielsen 0.1/1/10 s limits (primary) | 1993, update 2014 | Origin of the budget and the 2014 cancel clause |
| https://www.nngroup.com/articles/skeleton-screens/ | NN/g skeletons vs spinners vs bars (primary) | 2023-06-04, reviewed 2026-09-02 | The scope and time rules |
| https://www.nngroup.com/articles/progress-indicators/ | NN/g progress indicators | 2014-10-26 | Looped vs percent-done; study cited |
| https://primer.style/product/ui-patterns/loading/ | Primer loading pattern (primary, design system) | undated | Tables, accessibility, grouping |
| https://primer.style/product/components/button/accessibility/ | Primer button accessibility (primary) | undated | `aria-disabled` plus live region pattern |
| https://web.dev/articles/inp | INP definition and thresholds (primary) | 2022-05-06, updated 2025-09-02 | The measurable acknowledgement gate |
| https://web.dev/articles/optimize-inp | Optimising INP (primary) | 2023-05-19, updated 2025-09-02 | Yield after the UI update |
| https://github.com/vercel-labs/web-interface-guidelines | Vercel guidelines README (vendor guideline) | undated | Show-delay, submit, idempotency |
| https://vercel.com/design/guidelines | Same guidelines, site copy | undated | Confirms exact rule text |
| https://asktog.com/atc/principles-of-interaction-design/ | Tognazzini principles (practitioner) | 2014-03-05 | 50 ms and trap repeat clicks |
| https://design-system.service.gov.uk/components/button/ | GOV.UK button, double-click prevention (primary) | change log to Jul 2026 | The research-gated stance on double submit |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 4.1.3 Understanding (primary standard) | updated 2026-10-04 | The legal-grade announcement requirement |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy | MDN aria-busy (reference) | 2025-06-23 | Semantics and the absence of support data |
| https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ | IETF idempotency-key draft (primary, draft) | 2026-11-21 | Retry semantics and status codes |
| https://react.dev/reference/react/Suspense | React Suspense docs (primary) | undated | Transition and 300 ms reveal facts |
| https://lawsofux.com/doherty-threshold/ | Doherty threshold summary (secondary) | cites 1982 | Where the 400 ms figure comes from |
| https://arxiv.org/abs/2604.06183 | Preprint on LLM response latency (independent study) | 2026-02-09 | Only AI-specific latency evidence found |

Fleet and catalog files read: `skills/rust-quality-reference/tui.md:124` (TUI-23), `skills/rust-quality-reference/cli-contract.md:130,138` (CLI-08, CLI-16), `.agents/research/ux-topic-map.md` rows M058 to M061, `.agents/research/ux-topic-map/canonical-guides.md` rows 12, 13, 22, 23, `patterns-ia.md` rows 1, 2, `codified-systems.md` rows 8, 20, `ai-products.md` row 26, `.agents/research/product-audit/ui-code-posture.md`, and the fleet files cited inline.

Not fetched or not verifiable: the cross-territory note that CLS and Core Web Vitals sit with marketing's SEO dive is left there. The "CS8, CS20, PI1, PI2" scout rows did not exist under those exact IDs in the scout files (the scouts use numeric rows, matched above by content); the commission's row labels were mapped by question text.

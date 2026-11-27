---
title: Required view states and the non-modal message channel (empty, error, notification)
program: product
sub_program: ux
topic: ux-interface-states
worker: empty-error-notification
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
scope: The state matrix every data view must satisfy, empty-state contents kept apart from loading, the banner / inline / toast decision table with persistence and timeout rules, and how a review detects a missing state. Out of scope per the commission - error wording (UX-TEXT), VS Code native surfaces (editor-extension-surfaces), when a modal is justified (UX-ACT). Repair pass 2026-11-27 added forced states with screenshots (Finding 1) and source dates for every limit.
---

# Required view states and the non-modal message channel

## Contents

1. Summary
2. Findings (1 measured fleet matrix, 2 the state matrix, 3 loading vs empty, 4 empty contents, 5 channel decision, 6 detection)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- A data view has six states: loading, empty (split into first-use, no-results, cleared), error, partial, offline or stale, overflow. The two inputs (fetch settled or not, result count) must never collapse into one "no items" branch.
- "No items" copy while the fetch is unsettled is the named harm: users conclude the content does not exist and stop waiting ([NN/g, 2021-09-19](https://www.nngroup.com/articles/empty-state-interface-design/)).
- Show no loading indicator under 1 s, an indeterminate one at 1-3 s, a determinate one at 3 s or more, and a progress bar plus background run over 10 s ([Primer loading](https://primer.style/product/ui-patterns/loading/), page source last changed 2024-07-03; same 1 s and 10 s limits in [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/), published 1993-01-01, 2014 update).
- Add a show-delay of about 150-300 ms and a minimum visible time of about 300-500 ms to avoid flicker ([Vercel guidelines](https://vercel.com/design/guidelines), page carries no date).
- An empty state needs a heading (required), a one-line cause or purpose, and at most one primary action ([Primer](https://primer.style/product/ui-patterns/empty-states/), [Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/)). Never a dead end.
- Error and "unavailable" are not empty: never show a generic empty state where the user's own content should appear ([Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/)).
- Channel by durability, not by mood: field error -> inline at the field; page-wide persistent news -> banner; result of a user action -> inline near the trigger, or banner if the page changes; toast only when the same information is recoverable elsewhere.
- Toast: Primer says "not recommended" and cites WCAG 2.2.1, 1.3.2, 2.1.1, 4.1.3 ([Primer accessible notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages)); Carbon still ships it: persistent by default, with an optional 5 s auto-dismiss coded in ([Carbon](https://carbondesignsystem.com/components/notification/usage/), page source last changed 2025-06-30). Contested, see section 7.
- GOV.UK: one banner per page; banner and error summary never together; no banner for validation errors; success banner uses `role="alert"`, default uses `role="region"` ([GOV.UK](https://design-system.service.gov.uk/components/notification-banner/)).
- Announce dynamic states: `role="status"` or polite live region for progress and results, `role="alert"` for errors, and put the container in the DOM before injecting text ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [MDN, modified 2026-09-28](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role)).
- Measured, the fleet theme has the vocabulary (Deferred, List, DataTable, Skeleton) but DataTable has no error or loading branch and its zero-row copy claims a filter that does not exist; the VS Code webviews render error states as an unannounced bare `div` with no role and no retry (Finding 1).
- Detection is mechanical for three of six states: one fixture per state (the VS Code extension already keeps golden HTML per state), a grep for the fetch branch, and a live-region grep for announcements (axe did not flag the missing live region on any forced fixture, so axe is not the detector). Offline and partial need a named heuristic.

## Findings

### 1. Measured: the fleet's data views (2026-11-27)

Method note (repair pass, forced and screenshotted). Chromium could not start at first (missing `libnspr4` and ten other shared libraries); they were fetched with `apt-get download` and unpacked under `~/.cache/research-lang/exemplars/product/libs/x`, then `LD_LIBRARY_PATH` pointed at them. Two forcing methods follow.

1. Extension webviews: each golden fixture is wrapped with the real `X:webview/sidebar/sidebar.css`, loaded in headless Chromium at 320x400 px with Playwright (`node shoot.mjs <fixture names>`, script and command in the scratchpad), screenshotted to `~/.cache/research-lang/exemplars/product/ux-states-shots/<fixture>.png` (12 PNGs), and measured in the page: `document.querySelectorAll('[role=alert],[role=status],[aria-live],[aria-busy]').length`, count of `button,a[href]`, `innerText`, and axe-core (`@axe-core/playwright` from the website `node_modules`). The icon font is absent so codicon glyphs render as boxes; layout and copy are real. The fixtures are the extension's own rendered output, not a live run against a failing `grim`; a live forced failure (kill the CLI, go offline) was not done.
2. Theme: the Astro Container API renders the real `.astro` components through a Vite SSR server started from a scratch script outside the fleet (`node force.mjs`: `AstroContainer.renderToString(DataTable|List|Deferred, ...)` with rows, with zero rows, and as `Deferred`). The browser-side start failure (`import('./data-table.mjs')` rejecting) was reasoned from the render output plus the source at `T:components/ui/DataTable.astro:185-205`, not executed in a browser.

Paths: `T:` = `/home/mherwig/dev/ocx-sh/website/packages/theme/src/`; `X:` = `/home/mherwig/dev/grimoire-rs/vscode/src/`; `G:` = `X:test/fixtures/goldens/`. Gaps below are "absent in rendered markup" and, for the webviews, confirmed on a rendered screenshot.

Commands run (static pass): `cd T && git ls-files | grep -iE 'search|catalog|package|list|table|result|empty|deferred|skeleton'`; `grep -nEi 'loading|empty|error|offline|partial|overflow|aria-live|aria-busy|role="status"|skeleton|retry' <file>` per file; `cd X && git ls-files test/fixtures/goldens`; `grep -nE 'MAX_POST_CARDS *=' views/sidebar.ts`.

Forced-state results (the numbers below are the output of the commands above):

| Forced state | Result | Screenshot / output |
|---|---|---|
| `DataTable`, 2 source rows | both rows visible, empty row `hidden`, 1 live-region match (`role="status"`) | `DT-ROWS rows-hidden=0 empty-row-hidden=true live=1` |
| `DataTable`, 0 source rows | empty row visible with `No rows match the filter.`, no heading, no action. No filter exists, so the copy claims a search mismatch on a first-use state | `DT-ZERO <tr data-ocx-empty><td colspan="1">No rows match the filter.</td></tr>` |
| `List`, 0 items | `Nothing to show.` as a bare `<p>`, no heading, no action | `LIST-ZERO <p class="ocx-list__empty">Nothing to show.</p>` |
| `Deferred` | `aria-busy="true"`, skeleton `aria-hidden`, error block `hidden role="alert"` with `Could not load this.` and a Retry button | `DEFERRED` output |
| `results-error` | one line `grim exited with status 1`, 0 live regions, 0 controls, no retry | `results-error.png`; `live=0 controls=0` |
| `results-loading-with-default-registry` | skeleton only, `innerText` empty, 0 live regions: a screen reader gets nothing | `live=0 text=` |
| `results-browse-ready-empty` | `No artifacts found` / `Nothing matches “” across 1 registry.` / `Clear search` `Refresh catalog`; 2 controls, 0 live regions | `results-browse-ready-empty.png` |
| `browse-paged-partial`, `browse-paged-capped` | 1 live region each, 8 controls; text `Loading 4 of 12,000…` and `Showing 4 of 4+ in 2 registries` plus cause and remedy | PNGs of the same names |
| `details-error`, `settings-error` | raw `grim exited with status 1` (settings) or page rendered with `Not installed` (details); 0 live regions; `grep -oiE 'retry|try again'` over the three error fixtures returns nothing | PNGs; `details-error` also fails axe `color-contrast` in the wrapper |
| axe-core on all 7 states re-run | only `page-has-heading-one` everywhere (an artefact of wrapping a fragment, ignored) plus `color-contrast` on the two `details-*` fixtures; no rule detects the missing live region, so the grep is the check | `axe=` column of the run |

Correction to the earlier static read: the earlier file said a `DataTable` start failure shows zero rows with the empty row visible. Forcing the render shows the opposite. Rows are server-rendered and the empty row is `hidden` while rows exist, so a failed `import('./data-table.mjs')` leaves a complete but inert table: sort, filter and paging do nothing, and the failure goes only to `console.error`. The defect is a silent loss of interactivity with no message, not error-looking-like-empty. Rule 3 below uses the forced `webview` cases and `Deferred` instead of `DataTable` as its fleet example.

Theme (data views found: Deferred, DataTable, List async mode, Starlight Search; no package list or catalog renderer lives in the theme):

| View | Loading | Empty | Error | Partial | Offline | Overflow | Evidence |
|---|---|---|---|---|---|---|---|
| `Deferred` | yes: required skeleton slot, `aria-busy="true"`, skeleton `aria-hidden` | n/a (swap in fetched fragment) | yes: `role="alert"`, text `Could not load this.`, Retry button | no | not distinguished | n/a | `T:components/Deferred.astro:32-50` |
| `DataTable` | no loading branch (rows are server-rendered) | yes: hidden row, default `No rows match the filter.` (also shown with zero source rows), no action | no: start failure goes to `console.error` only; table stays visible but inert | no | n/a | yes: `overflow-x: auto` | `T:components/ui/DataTable.astro:58,139-141,198,235` |
| `List` (async) | partial: `role="status"` footer, `aria-busy` on content | yes: default `Nothing to show.`, no action | yes: Retry button | yes: cursor + Load more | not distinguished | yes: `overflow-x: auto` | `T:components/ui/List.astro:55,117-122,186,281` |
| Starlight search (Pagefind UI) | trigger `aria-busy` while module loads | not set by theme (Pagefind default copy; not verified) | failure to load logs `console.error`; shortcut disabled in `error` state | no | no | `overflow-wrap: anywhere` | `T:starlight/Search.astro:108,128`, `search.zag.mjs:111-113` |

Observations: `DataTable` and `List` empty copy is generic and action-free (`Nothing to show.`); `DataTable` swallows a start failure into the console: the table stays visible but sort, filter and paging are dead with no message (forced above). With zero source rows it says `No rows match the filter.` although no filter exists.

VS Code extension webviews (data views: sidebar results for Browse, Installed and Updates; details; settings). It keeps a golden HTML fixture per state (`git ls-files test/fixtures/goldens | wc -l` lists the set; the state names below are the fixture names):

| View | Loading | Empty | Error | Partial | Offline | Overflow | Fixture |
|---|---|---|---|---|---|---|---|
| Results (Browse, Installed, Updates) | skeleton lines, 0 `role`/`aria-*` | yes, per tab: `No artifacts found` + cause + `Clear search` / `Refresh catalog`; `Nothing installed.`; `Everything is up to date.` | `grim exited with status 1` in a bare `div.error-state`, 0 `role`, no retry control in markup | yes: `Loading 4 of 12,000…` with `aria-busy`, `role="status"`; capped: `Showing 4 of 4+ in 2 registries` + cause + remedy | no distinct state; footer `Catalog cache · synced 12 min ago` and `stale` flag | yes: `MAX_POST_CARDS` cap in `views/sidebar.ts:1389-1400` | `results-loading-with-default-registry`, `results-browse-ready-empty`, `results-error`, `browse-paged-partial`, `browse-paged-capped` |
| Results, no grim installed | n/a | n/a | yes, actionable: `grim was not found`, install button, setting named | n/a | n/a | n/a | `results-no-grim` |
| Details | skeleton plus `Checking…` per scope | n/a | raw `grim exited with status 1` over otherwise rendered page, 0 `role` | partial render is the design (page + error) | not distinguished | n/a | `details-skeleton-loading`, `details-error` |
| Settings | `.settings-loading` element, no text in fixture | `settings-ready-empty-registries` | bare `div.error-state`, 0 `role` | n/a | n/a | n/a | `settings-loading`, `settings-error` |

Defects found by reading the fixtures:

- `results-browse-ready-empty` renders `Nothing matches “” across 1 registry.` with an empty query. An empty catalog with no query is a first-use state and must not claim a search mismatch.
- Error text is the raw CLI status, `grim exited with status 1`, with no cause or next step, and no announcement (0 `role|aria-live|aria-busy` in `results-error`, `details-error`, `settings-error`, `results-loading-*`; `grep -cE 'role=|aria-live|aria-busy'`). Only `browse-paged-partial` and `browse-paged-capped` (1 match each) announce. Wording belongs to UX-TEXT; the missing announcement and the missing retry belong here.
- Strengths worth keeping as the house pattern: the loading, partial, capped and no-grim states exist as named fixtures; the capped state states cause and remedy (`Refresh to retry it`).

### 2. The state matrix

Combining [Vercel](https://vercel.com/design/guidelines) ("All states designed", "Empty, sparse, dense, & error states", short/average/very long content), [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) and [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/):

| State | Trigger (observable) | Must render | Indicator or channel |
|---|---|---|---|
| Loading | request in flight, none settled | indicator sized to the content it replaces, no layout shift | per wait table in 3 |
| Empty: first-use | settled, zero items, no filter or query active | heading, why empty, one primary action to create or add | empty-state block |
| Empty: no-results | settled, zero items, filter or query active | what was searched, how to widen (clear filter) | empty-state block, secondary link |
| Empty: cleared | settled, zero, user just removed the last item | short confirmation, optional undo | inline |
| Error | request rejected or malformed answer | cause class (network, permission, config, server), retry or fix path, user's own data not shown as empty | inline replace, `role="alert"` |
| Partial | some pages or sections loaded, rest pending or failed | what is shown vs what is missing, a way to retry the missing part | status line + per-section error |
| Offline / stale | known no connectivity, or data older than its freshness | that data is cached, its age, a refresh action | banner or footer line, `role="status"` |
| Overflow | content longer than the box, or more items than rendered | truncate or wrap, count of hidden items, a way to reach them | `overflow-wrap`, "Show N more", virtualization |

[Primer](https://primer.style/product/ui-patterns/degraded-experiences/) adds partial-failure rules: replace failed inline content with a short error plus warning icon; replace failed sections with a blank slate; hide counts and badges when data is unavailable; never render "undefined of undefined"; keep core-workflow buttons visible; never disable a control because of an availability issue.

The offline row has no primary source: a web.dev offline article returned 404 and Vercel's page has no offline or partial rule ([Vercel](https://vercel.com/design/guidelines)). The offline row rests on Primer's degraded-experiences page (global issue = warning banner) plus the fleet's own `synced N min ago` pattern. Treat it as the weakest row.

### 3. Loading versus empty, and the wait ladder

The sentence that matters: do not show a "no items" message while content is still loading; use a progress indicator while the process runs and the empty message only after it completes ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)). In code the rule is that the empty branch is gated on `settled && items.length === 0`, not on `items.length === 0` alone.

Wait ladder (merge of [Primer loading](https://primer.style/product/ui-patterns/loading/), [NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/), [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/), [Vercel](https://vercel.com/design/guidelines)):

| Wait | Indicator | Note |
|---|---|---|
| under 1 s | none | a flash reads as slower; Vercel: show-delay 150-300 ms, minimum visible 300-500 ms |
| 1-3 s | indeterminate: spinner for one module; skeleton for a full-page load | skeleton must mirror final content (no layout shift); NN/g: keep skeletons under 10 s; avoid frame-only skeletons (header and footer only) |
| 3-10 s | determinate if progress is knowable | Primer |
| over 10 s | progress bar with percent or step, cancel path, background run if possible | NN/g: "Anything above 10 seconds requires an explicit estimation of duration" |

Loading text ends in an ellipsis (`Loading…`, `Saving…`) per Vercel. Screen readers: one accessible name per indicator group, one announcement for a group of skeletons, `aria-busy="true"` while a live region updates, announce start, completion and failure, and announce the result count after filtering ([Primer loading](https://primer.style/product/ui-patterns/loading/)). Do not mark the submit button `aria-disabled` while loading; do not disable loading animation for reduced motion, keep it subtle (same page).

### 4. Empty-state contents

[Primer](https://primer.style/product/ui-patterns/empty-states/): types are not-yet-used, temporarily empty, error, first-time; heading required; description optional and non-redundant; primary action encouraged and limited to one; secondary action an optional text link; no playful tone or vague "There was a problem" in errors. [Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/): title short and ideally positive, body gives the next action, one action, no codes in error copy, no dead ends, remove table headers and footers because the empty state replaces the element, illustrations decorative with empty `alt`. [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/): three jobs, system status, learning cue, direct pathway; offer a primary button, a "Learn more" link, more than one path when useful (Loggly: add sources or load demo data).

Contents the rule can check, per empty subtype:

| Subtype | Heading | Body | Action |
|---|---|---|---|
| first-use | names the thing ("No packages yet") | what it is and how items arrive | one primary: create or add; optional learn-more, demo data |
| no-results | "No results for X" with the active query or filter | how to widen | `Clear filters` |
| error (data cannot be shown) | names the problem class | cause and fix or condition under which data appears | retry or fix; ranked if several |

Counter-case from the fleet: `Nothing to show.` has a heading-less body and no action, so it fails the first-use and no-results rows.

### 5. Channel decision: banner, inline, toast

Sources agree on a shared core and differ on toasts.

| Situation | Channel | Persistence | Timeout | Source |
|---|---|---|---|---|
| Field validation | inline at the field; on submit focus the first error | until fixed | none | [Vercel](https://vercel.com/design/guidelines), [Primer](https://primer.style/product/ui-patterns/notification-messaging/) |
| Several fields fail | field messages plus one summary (GOV.UK: error summary, not banner); Primer allows an added banner | until fixed | none | [GOV.UK](https://design-system.service.gov.uk/components/notification-banner/), Primer |
| Action failed, cause known | inline message beside the trigger (or banner at the top of the dialog) | until user acts or retries | none | Primer |
| Action failed, cause unknown, crucial | banner at top of the UI | until resolved | none | Primer |
| Success, outcome visible in the UI | none visually; announce to screen readers via `role="status"` | n/a | n/a | Primer ("sparingly"), [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) |
| Success, page changes after save | banner (unless the URL change already signals it) | removed on next page (GOV.UK) | none | Primer, GOV.UK |
| Success, page stays | inline message near the button | until next action | none | Primer |
| Service-wide or system news | banner above the content; one per page | system updates not dismissible until resolved | none | GOV.UK, Primer |
| Degraded section | replace the section content (blank slate) | while degraded | none | Primer degraded experiences |
| Long-running action, user may leave | banner for progress, then the product's notification system | until done | none | Primer |
| Transient confirmation recoverable elsewhere | toast (only if the product allows toasts) | optional | Carbon: persistent by default, optional 5 s auto-dismiss; must offer a no-timer path or another way to the information | Carbon, [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) |

Banner limits: GOV.UK allows one banner per page, placed before the `h1`, and notes users often miss banners. Carbon limits toast, inline and actionable text to two lines and one action; inline persists until dismissed or resolved. Dismissal: Primer says system updates cannot be dismissed until resolved; GOV.UK says more research is needed on banner dismissal. Severity pairs an icon with a colour and never colour alone ([Primer](https://primer.style/product/ui-patterns/notification-messaging/), GOV.UK heading "Success" or "Important").

Announcement mapping ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role)): `role="status"` for progress and success; `role="alert"` (equals `aria-live="assertive"` and `aria-atomic="true"`) for errors that do not move focus; alert on non-urgent content is a failure technique; if the user must close it, `alertdialog` (UX-ACT). The live container must exist before its text is injected, and repeating an identical message needs clear-then-set. A message that takes focus is a change of context and needs no live region.

### 6. How a review detects a missing state

No benchmark scores agent code for missing loading, error or empty states; the scout notes only practitioner advice ([failure-corpus row 16](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/ux-topic-map/failure-corpus.md)). Detection therefore rests on four cheap checks:

1. State fixtures. The extension already has them: one golden per state, named `<view>-<state>`. Rule: for each view file, list fixtures and diff against the six states. Command: `git ls-files '*fixtures*' | grep -E '<view>-(loading|empty|error|partial|offline|overflow)' | wc -l`.
2. Fetch-branch grep. Every async data hook needs a rejection branch in the same file: for each `fetch(`, `useQuery(`, `invoke(`, `await` on a list source, the file must contain `catch(`, `.catch`, `isError`, `error` in the render, and not only `console.error` (the `DataTable` defect: a failed start leaves an inert table with no message).
3. Announcement check. Every file rendering an error or loading state contains one of `role="alert"`, `role="status"`, `aria-live`, `aria-busy`; `grep -cE 'role=|aria-live|aria-busy' <render output>` of 0 on an error fixture fails.
4. Empty-vs-loading gate. Reading heuristic: find the expression that shows empty copy; it must reference a settled flag. Pass: `settled && items.length === 0 ? <Empty/> : …`. Fail: `items.length === 0 ? <Empty/> : <List/>` where `items` starts as `[]`.

## Dated facts

Date convention. "Page date" is a date the source prints. Primer, Carbon and Vercel pages print none; for Primer and Carbon the date given is the last commit touching the page's public source file (GitHub API `repos/<repo>/commits?path=<file>&per_page=1`, run 2026-11-27), labelled "source last changed". That is a modification date, not an authorship date, and a later typo fix can move it. Vercel's page has no public per-page source; the only dated Vercel artefact is the `vercel-labs/web-interface-guidelines` repository.

| Fact | Source | Date | Type |
|---|---|---|---|
| Do not show "no items" while loading; three guidelines (system status, learning cues, direct pathways); demo-data path | [NN/g empty states](https://www.nngroup.com/articles/empty-state-interface-design/) | page date 2021-09-19 | independent study |
| Under 1 s no indicator; 1-3 s indeterminate; 3-10 s determinate "if possible"; over 10 s determinate and background task; determinate "approximately 3 or more seconds" | [Primer loading](https://primer.style/product/ui-patterns/loading/) | source last changed 2024-07-03 (commit `827653b`) | authority (GitHub) |
| 0.1 s, 1 s, 10 s response-time limits | [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/) | published 1993-01-01, 2014 update to the web section | independent study |
| Skeletons under 10 s; skeletons for full pages, spinners for modules, progress bars for processes | [NN/g skeletons](https://www.nngroup.com/articles/skeleton-screens/) | 2023-06-04, reviewed 2026-09-02 | independent study |
| Show-delay about 150-300 ms and minimum visible time about 300-500 ms; "All states designed. Empty, sparse, dense, & error states"; virtualize large lists | [Vercel guidelines](https://vercel.com/design/guidelines) | page undated, fetched 2026-11-27 | authority (Vercel's own guideline) |
| "Large lists (>50 items): virtualize" | [Vercel web-interface-guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) line 86 | file last changed 2026-10-05 | authority (Vercel) |
| One banner per page, placed immediately before the `h1`; banner and error summary never together; no banner for validation errors; success banner `role="alert"`, default `role="region"`; dismissal needs more research | [GOV.UK notification banner](https://design-system.service.gov.uk/components/notification-banner/) | component introduced Nov 2020 (v3.10.0); placement guidance Sept 2021; `html` param Aug 2022 (v4.3.0) | authority (UK government) |
| Outage messages: 5 or fewer per page; do not show a generic empty state where user content should be; replace failed section with blank slate | [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) | source last changed 2024-07-11 (commit `60a6919`) | authority (GitHub) |
| System-update banners cannot be dismissed until resolved; success messaging used "sparingly"; banner at top of body; error decision flow including a modal for crucial errors | [Primer notification messaging](https://primer.style/product/ui-patterns/notification-messaging/) | source last changed 2024-12-04 (commit `a967d5b`) | authority (GitHub) |
| Empty state: primary text, optional secondary, "one primary link or action", vague "There was a problem" is frustrating | [Primer empty states](https://primer.style/product/ui-patterns/empty-states/) | source last changed 2025-02-05 (commit `051a9ae`) | authority (GitHub) |
| Toasts "not recommended"; must be extendable indefinitely (2.2.1); also 1.3.2, 2.1.1, 4.1.3 | [Primer accessible notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages) | page undated; its source file was not found in `primer/design` (searched the tree), so no commit date; fetched 2026-11-27 | authority (GitHub) |
| Toast: persists by default, can be coded to dismiss after five seconds, optional close button, must be reachable elsewhere; inline never auto-dismisses; two-line limit | [Carbon notification usage](https://carbondesignsystem.com/components/notification/usage/) | source last changed 2025-06-30 | authority (IBM) |
| Carbon empty-state pattern (title, body, one action, no dead end) | [Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/) | source last changed 2025-03-12 | authority (IBM) |
| 2.2.1 Timing Adjustable, Level A: turn off, adjust to 10x, or extend with 20 s warning and at least ten extensions; toast that disappears after 5 s is exempt when the same information is available another way (email Inbox example) | [WCAG 2.2 recommendation](https://www.w3.org/TR/WCAG22/) (Recommendation 2024-12-12); [Understanding 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) | 2024-12-12 normative; Understanding page "Updated 10 August 2026" | authority (W3C) |
| 4.1.3 Status Messages, Level AA: status messages "can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus" | [Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | normative 2024-12-12; page "Updated 04 October 2026" | authority (W3C) |
| `role="alert"` implies `aria-live="assertive"` and `aria-atomic="true"` | [MDN alert role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role) | modified 2026-09-28 | authority (MDN) |

## Normative guidance candidates

Source dates are in the Dated facts table; a bracketed date after a link repeats the key one. Each rule: severity word, imperative, Rationale, Verify.

1. MUST give every data view a loading, an empty and an error branch; SHOULD give partial, offline or stale, and overflow where data can be paged, cached or user-generated. Rationale: an ambiguous or blank panel hides system status, which [NN/g (2021-09-19)](https://www.nngroup.com/articles/empty-state-interface-design/) names as the first job of an empty state, and [Vercel](https://vercel.com/design/guidelines) asks that "all states" be designed. Verify: one fixture per state (Finding 6.1); fail a view whose fetch has no error branch.
2. MUST gate empty copy on a settled fetch. Rationale: [NN/g (2021-09-19)](https://www.nngroup.com/articles/empty-state-interface-design/) says a default "no items" message while content loads is a misleading status and users stop waiting. Verify: reading heuristic 6.4; pass `settled && n === 0`, fail `n === 0` with initial `[]`; render with a never-resolving fetch and assert no empty copy.
3. MUST NOT render an error as empty. Rationale: [Primer degraded experiences (source changed 2024-07-11)](https://primer.style/product/ui-patterns/degraded-experiences/) says that where a user created content, a generic empty state makes them think they suffered data loss. Verify: force a rejected fetch in a test; the output must contain the error marker, not the empty marker. Fleet cases: `results-error` shows a bare error line with no recovery (forced, Finding 1); `DataTable` start failure is silent and inert.
4. MUST pick the loading indicator by expected wait: none under 1 s, indeterminate at 1-3 s, determinate from about 3 s when progress is knowable, determinate plus background task over 10 s. Rationale: [Primer loading (source changed 2024-07-03)](https://primer.style/product/ui-patterns/loading/) says a flash under 1 s feels slower, and a determinate indicator needs about 3 s to be read; the 1 s and 10 s limits are the flow-of-thought and attention limits in [NN/g (1993)](https://www.nngroup.com/articles/response-times-3-important-limits/). Verify: count against the ladder in section 3; a hard-coded spinner on a call known to exceed 10 s, or any indicator on a call under 1 s, fails.
5. SHOULD add a show-delay of about 150-300 ms and a minimum visible time of about 300-500 ms to loading indicators. Rationale: the [Vercel guidelines (undated page)](https://vercel.com/design/guidelines) give these so a fast response never flashes a spinner; this is vendor guidance, not a measured threshold. Verify: grep for the delay constant or `Suspense` (which Vercel says does this automatically); absent on a sub-second call is a flicker risk.
6. MUST make the loading placeholder mirror the final box. Rationale: [NN/g skeletons (2023-06-04, reviewed 2026-09-02)](https://www.nngroup.com/articles/skeleton-screens/) says skeletons must resemble final content, and a mismatch shifts layout when content arrives. Verify: skeleton and content share dimensions or a reserved min-height; `Deferred` enforces a required `skeleton` slot (`T:components/Deferred.astro:33-34`).
7. MUST give every empty state a heading, one cause line, and at most one primary action; MUST NOT leave a dead end. Rationale: [Primer (source changed 2025-02-05)](https://primer.style/product/ui-patterns/empty-states/) encourages "one primary link or action", [Carbon (source changed 2025-03-12)](https://carbondesignsystem.com/patterns/empty-states-pattern/) says no dead ends, and [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/) calls the third job a direct pathway. Verify: empty-fixture snapshot contains heading and one `button` or `a`; two primaries fail; forced `LIST-ZERO` `Nothing to show.` fails.
8. MUST separate first-use from no-results: a no-results state names the active query or filter and offers to clear it; an unfiltered empty list never says "matches". Rationale: [Primer (source changed 2025-02-05)](https://primer.style/product/ui-patterns/empty-states/) distinguishes not-yet-used from temporarily empty, and claiming a search mismatch on a never-filled list tells the user the wrong cause. Verify: render with query `""` and zero items; the text must not contain `matches` or `match the filter`. Fleet counter-examples, both forced: `results-browse-ready-empty` (`Nothing matches “”`) and `DataTable` with zero rows (`No rows match the filter.`).
9. MUST have an error state name its class (network, permission, config, server), give a retry or fix path, and keep user-created content from being shown as absent. Rationale: [Primer empty states (2025-02-05)](https://primer.style/product/ui-patterns/empty-states/) calls "There was a problem" frustrating, and [Carbon (2025-03-12)](https://carbondesignsystem.com/patterns/empty-states-pattern/) forbids dead ends; an error with no action leaves the user stuck. Verify: error fixture contains an actionable element (`grep -oiE 'retry|try again|<button'`); wording quality goes to UX-TEXT. Fleet counter-example: three webview error fixtures return no match.
10. MUST announce loading, progress, result and error without moving focus: `role="status"` or a polite live region for progress and success, `role="alert"` for errors, container in the DOM before text is injected. Rationale: WCAG [4.1.3 (Level AA, Recommendation 2024-12-12)](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) requires status messages to reach assistive technology without focus. Verify: `grep -cE 'role="(status|alert)"|aria-live|aria-busy'` on each state fixture is at least 1. Axe passes the zero-announcement fixtures (forced run, Finding 1), so axe alone does not verify this. Fleet counter-example: all 6 loading and error fixtures measured score 0 (`results-error`, `details-error`, `settings-error`, `results-loading-with-default-registry`, `settings-loading`, `details-skeleton-loading`); only `browse-paged-partial` and `-capped` announce (1 each).
11. MUST NOT use `role="alert"` or `aria-live="assertive"` for non-urgent text. Rationale: [MDN (modified 2026-09-28)](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role) says alert interrupts the screen reader at once; the W3C lists assertive use for non-urgent content as a failure technique. Verify: grep `role="alert"` and read each; pass an error, fail a "Saved" message.
12. MUST put validation errors inline at the field, move focus to the first error on submit, and not use a banner for them. Rationale: [GOV.UK](https://design-system.service.gov.uk/components/notification-banner/) lists "use a notification banner to tell the user about validation errors" under Do not, because the error message and error summary components already carry it; a banner would duplicate and be missed. [Primer notification messaging (2024-12-04)](https://primer.style/product/ui-patterns/notification-messaging/) puts field validation inline. Verify: grep banner components in form files; an error summary plus a banner on one page fails.
13. MUST show at most one banner per page, placed immediately before the `h1`; combine messages or show the highest priority. Rationale: [GOV.UK](https://design-system.service.gov.uk/components/notification-banner/) says "Avoid showing more than one notification banner on the same page" and notes users miss banners. Verify: count banner components per rendered route (`grep -c`), more than 1 fails.
14. MUST NOT put information the user needs to finish the current task only in a banner or toast; put it in the content next to the cause, or in a dialog if it is crucial. Rationale: [Primer (2024-12-04)](https://primer.style/product/ui-patterns/notification-messaging/) places banners "in close proximity to where the interaction occurred" and uses a modal error dialog only when it is crucial to the main task; [Primer accessible notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages) warns that transient messages overload working memory. Verify: reading heuristic. Pass: "Card declined" beside the card field. Fail: the same text in a top-of-page banner while a form field is the cause. The dialog case belongs to UX-ACT.
15. MUST keep success feedback visually silent when the outcome is already visible, and still announce it. Rationale: [Primer (2024-12-04)](https://primer.style/product/ui-patterns/notification-messaging/) says to use success messaging "sparingly" and rely on interaction context, but that the state "must be conveyed to screen reader users" ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)). Verify: grep for a toast or banner on an action whose result is on screen; pair with a `role="status"` hit.
16. SHOULD NOT use toasts. If a product uses them, MUST: (a) let the content be reached again or kept until dismissed, (b) use at most two lines and one action, (c) include a dismiss control, (d) announce through a polite live region. Rationale: [Primer (page undated)](https://primer.style/accessibility/patterns/accessible-notifications-and-messages) says toasts are "not recommended" and need a way to extend them indefinitely; [W3C 2.2.1 (Understanding page updated 2026-08-10)](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) exempts a disappearing alert only when the same information is available elsewhere; [Carbon (2025-06-30)](https://carbondesignsystem.com/components/notification/usage/) adds the two-line and close-button limits. Verify: a toast with a timer and no other discovery path fails; grep `setTimeout` near `toast`.
17. MUST NOT auto-dismiss errors. Rationale: an error that vanishes on a tab switch cannot be acted on; [Carbon (2025-06-30)](https://carbondesignsystem.com/components/notification/usage/) says toasts that auto-dismiss need an alternative route to the same information, and [Primer](https://primer.style/accessibility/patterns/accessible-notifications-and-messages) warns about messages that "automatically dismiss themselves". Verify: grep for a timeout on error-severity notification code.
18. MUST keep system-update banners non-dismissible until the issue is resolved. Rationale: [Primer (2024-12-04)](https://primer.style/product/ui-patterns/notification-messaging/) states system updates "cannot be dismissed until the issue is resolved", because the condition still affects the user; [GOV.UK](https://design-system.service.gov.uk/components/notification-banner/) says dismissal needs more research, so this stays a product-owner call (see the ask list). Verify: a banner with a dismiss control and system severity fails.
19. MUST handle overflow: wrap or truncate long text (`overflow-wrap`, `line-clamp`, `min-w-0` on flex children) and virtualize lists over 50 items or show a count and "Show N more"; a capped list MUST say it is capped and why. Rationale: [Vercel web-interface-guidelines (file changed 2026-10-05)](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) lists both as a rule, because unbroken long strings and unbounded DOM size break layout and performance. The 50-item line is vendor guidance, not a measured limit. Verify: render a 500-character unbroken string and 5000 rows; no horizontal page scroll, bounded DOM node count. Fleet pattern to keep: `Showing 4 of 4+` plus remedy.
20. SHOULD, for stale or offline data, show its age and a refresh action. Rationale: [Primer degraded experiences (2024-07-11)](https://primer.style/product/ui-patterns/degraded-experiences/) puts a global issue in a warning banner so the user knows parts may be missing; a cached view with no age reads as current. Weakly sourced (Finding 2). Verify: fixture contains a timestamp and a refresh control. Fleet pattern: `Catalog cache · synced 12 min ago` (forced in `results-browse-ready-empty`, which also shows `The catalog was last synced 12 min ago` and `Refresh catalog`).
21. CONSIDER offering demo or sample data from a first-use empty state when setup is heavy. Rationale: [NN/g (2021-09-19)](https://www.nngroup.com/articles/empty-state-interface-design/) gives the Loggly add-source-or-load-demo pairing as a second path into the product; [Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/) allows onboarding empty states. Verify: reading heuristic; pass an empty first-use state with a "Load sample data" secondary action, fail a heavy-setup product with only "Create".

## What an agent must not decide alone

- Whether the product permits toasts at all (a design-system decision; Primer forbids, Carbon allows).
- Whether a banner is dismissible and for how long it persists, where GOV.UK itself says research is needed.
- Illustrations, tone and brand voice of empty states (marketing and brand).
- Whether stale data may be shown after an outage when the data is regulated, priced or security-relevant (legal, business).
- Choosing a retention or telemetry policy for error reporting that accompanies an error state (privacy).
- Choosing whether a failed action needs a modal (UX-ACT).

## AI-agent angle

| Characteristic mistake | Mechanical check |
|---|---|
| One `items.length === 0` branch used for both loading and empty | heuristic 6.4; render with a never-resolving fetch and assert no empty copy |
| `try { await … } catch (e) { console.error(e) }` with no UI state | grep `console.error` as the only statement in a `catch`; fixture for error must differ from empty |
| `Nothing here.` / `No data.` with no action, or "No results for """ with an empty query | rule 7 and 8 snapshots |
| Toast on every success, auto-dismissed in 3 s, no live region | grep toast helper calls; WCAG 2.2.1 rule 16 |
| `role="alert"` on everything, or injecting a new element with `role="alert"` already containing text (not announced) | [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role): container first, then text; browser test with a screen-reader assertion or axe |
| Spinner on every request, even sub-second | rule 4 and 5 ladder |
| Skeleton that is a generic grey box different from the content | rule 6 |
| Truncation absent: long user strings blow the layout | rule 19 stress render |
| Training data predates the Primer position that toasts are not recommended | rule 16 plus the "ask" list |

## Contested / evolving

- Toasts. Against: Primer says they are "not recommended", citing WCAG 2.2.1, 1.3.2, 2.1.1, 4.1.3 and banner blindness ([Primer accessible notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages), page carries no date), and lists banners and inline messages instead ([Primer notification messaging](https://primer.style/product/ui-patterns/notification-messaging/)). For, conditionally: Carbon documents toast as persistent by default with an optional five-second timeout, a close button and a two-line limit ([Carbon](https://carbondesignsystem.com/components/notification/usage/)); its own intro says toasts "disappear after a few seconds" while its Dismissal section says they "persist by default", so Carbon is internally inconsistent; WCAG 2.2.1 itself allows a timer when the same information is discoverable elsewhere ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)). This file takes the conservative side (rule 16), Primer's reading being the stricter and testable one.
- Skeleton versus spinner. [NN/g](https://www.nngroup.com/articles/skeleton-screens/) reserves skeletons for full-page loads and spinners for single modules; [Primer](https://primer.style/product/ui-patterns/loading/) allows skeletons for any large area. Rule 4 permits both and fixes the wait thresholds instead.
- Banner dismissal. GOV.UK says research is needed ([GOV.UK](https://design-system.service.gov.uk/components/notification-banner/)); Primer says system banners cannot be dismissed until resolved. Left to the product owner.
- Success banner role. GOV.UK uses `role="alert"` for the success variant to move focus; WCAG says alert is for errors and warnings and status for success ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)). Follow WCAG for non-page-load updates, GOV.UK only for its own component.
- Offline and partial states have no primary-source threshold; practice varies. Not benchmarked for AI code.

Cross-territory, one line each: error wording and next-step phrasing belong to UX-TEXT; modal error dialogs to UX-ACT; VS Code `showErrorMessage` and webview-vs-native choice to editor-extension-surfaces.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.nngroup.com/articles/empty-state-interface-design/ | NN/g empty states, Kaplan | 2021-09-19 | primary: loading vs empty |
| https://primer.style/product/ui-patterns/empty-states/ | Primer empty states | source changed 2025-02-05 | primary: required content |
| https://primer.style/product/ui-patterns/notification-messaging/ | Primer notification messaging | source changed 2024-12-04 | primary: channel decision flows |
| https://primer.style/product/ui-patterns/loading/ | Primer loading | source changed 2024-07-03 | primary: wait ladder, announcements |
| https://primer.style/product/ui-patterns/degraded-experiences/ | Primer degraded experiences | source changed 2024-07-11 | primary: partial failure |
| https://primer.style/accessibility/patterns/accessible-notifications-and-messages | Primer accessible notifications | undated (source file not found), fetched 2026-11-27 | primary: toast objections |
| https://design-system.service.gov.uk/components/notification-banner/ | GOV.UK notification banner | 2020-2022 changelog | primary: one banner, roles |
| https://vercel.com/design/guidelines | Vercel design guidelines | undated, fetched 2026-11-27 | primary: all states, delays |
| https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md | Vercel web interface guidelines | file changed 2026-10-05 | primary: overflow, empty rules |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 2.2 SC 4.1.3 | Recommendation 2024-12-12; page updated 2026-10-04 | primary: announcement |
| https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html | WCAG 2.2 SC 2.2.1 | Recommendation 2024-12-12; page updated 2026-08-10 | primary: toast timeouts |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role | MDN alert role | 2026-09-28 | primary: alert mechanics |
| https://www.nngroup.com/articles/response-times-3-important-limits/ | NN/g response times | 1993-01-01, 2014 update | study: 0.1/1/10 s |
| https://www.nngroup.com/articles/skeleton-screens/ | NN/g skeleton screens | 2023-06-04, reviewed 2026-09-02 | study: indicator choice |
| https://carbondesignsystem.com/components/notification/usage/ | Carbon notification | source changed 2025-06-30 | primary: toast/inline table |
| https://carbondesignsystem.com/patterns/empty-states-pattern/ | Carbon empty states | source changed 2025-03-12 | primary: empty subtypes |
| https://www.w3.org/TR/WCAG22/ | WCAG 2.2 Recommendation | 2024-12-12 | primary: SC 2.2.1 text |
| `/home/mherwig/dev/ocx-sh/website/packages/theme/src` and `/home/mherwig/dev/grimoire-rs/vscode/src` | local measurement of fleet views, forced with Astro Container and headless Chromium | 2026-11-27 | measured, commands in Finding 1; PNGs in `~/.cache/research-lang/exemplars/product/ux-states-shots/` |

Also read for dates and quotes (repair pass): Primer, Carbon and Vercel source files on GitHub (raw `.mdx`), the GitHub commits API for last-changed dates, and `carbon-design-system/carbon` `Notification.tsx` (a `timeout` prop defaulting to 0, i.e. no auto-dismiss). Not fetched: https://web.dev/articles/offline-ux (HTTP 404); Shopify Polaris banner page (301 to a generic index, not followed). Scout rows CG14, CD13, CS29, CS30, FC16, OC7, PI12, PI13, PI29 and M062-M064 could not be matched by id in the scout files (the ids are not printed there); their content was matched by topic instead: canonical-guides 14, codified-systems 29, failure-corpus 16, onboarding-conversion 6 and 7, patterns-ia 12.

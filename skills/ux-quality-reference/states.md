---
title: View States, Waits and Message Channels
summary: The UX-STATE rows for views and actions, owning the loading, empty, error, partial, capped and stale branches, the wait ladder, repeat activation, deadlines, cancel, idempotency, and which channel a message uses
---

# View States, Waits and Message Channels

Owns what a view, an async action and a message must render: the three branches of an async view, partial, capped and stale data, one wait ladder for web, webview and terminal, the pending state of a pressed control, deadlines, cancel, and the channel for each kind of message. Form fields and validation are UX-STATE-20 to 27, 35 and 36 (`forms.md`). VS Code surfaces are UX-STATE-28 to 33 (`editor-extensions.md`). Message wording is `text.md`. A modal is UX-ACT's. Live-region mechanics and motion are UX-A11Y-22 to 27. A VS Code webview is web UI, so every row here applies inside one.

Contents: [Dates and Versions](#dates-and-versions) · [Source Lists](#source-lists) ·
[View States](#view-states) · [Waits and Repeat Activation](#waits-and-repeat-activation) ·
[Message Channels](#message-channels) · [Calibration Instances](#calibration-instances) ·
[Ask the Owner](#ask-the-owner) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27. "Source date" is the date the page states about itself, or the date of its last source commit. Re-check a row on the event or interval in its last column.

| Fact | Source and source date | Rows | Re-check |
|---|---|---|---|
| Nielsen limits 0.1, 1 and 10 s; the interrupt clause past 10 s | [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/), 1993 with a 2014 update | 10, 15 | 24 months |
| Wait tiers, grouping, disabling controls while loading | [Primer loading](https://primer.style/product/ui-patterns/loading/), source 2024-07-03 | 09, 10 | 12 months, via the GitHub commits API for the file |
| Skeleton, spinner or bar by scope and wait | [NN/g skeletons](https://www.nngroup.com/articles/skeleton-screens/), 2023-06-04, reviewed 2026-09-02 | 10, 11 | 24 months |
| Pending control keeps `aria-disabled`, never `disabled` | [Primer button](https://primer.style/product/components/button/accessibility/), source 2024-10-28 | 09 | 12 months |
| Empty-state contents; degraded sections replaced in place | [Primer empty states](https://primer.style/product/ui-patterns/empty-states/) 2025-02-05; [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) 2024-07-11; [Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/) 2025-03-12 | 04, 06, 07, 34 | 12 months |
| Channel choice; toasts "not recommended" (Primer), persistent by default (Carbon) | [Primer notification messaging](https://primer.style/product/ui-patterns/notification-messaging/) 2024-12-04; [Primer accessible notifications](https://primer.style/accessibility/patterns/accessible-notifications-and-messages) undated; [Carbon notification](https://carbondesignsystem.com/components/notification/usage/) 2025-06-30 | 17, 18 | 12 months |
| Status messages (4.1.3, AA); timing adjustable (2.2.1, A) | [4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) updated 2026-10-04; [2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) updated 2026-08-10 | 05, 17 | 12 months, or at a WCAG 3 Candidate Recommendation |
| INP: 200 ms good, 500 ms poor, at p75; it measures the next paint, never loading | [web.dev INP](https://web.dev/articles/inp), updated 2025-09-02 | 08 | 12 months |
| React `Suspense` documents a 300 ms reveal throttle and no show-delay | [react.dev](https://react.dev/reference/react/Suspense), undated | 10, 12 | each React major |
| `Idempotency-Key` is Internet-Draft 09, dated 2026-11-21, expiring 2027-05-25 | [IETF draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) | 16 | by 2027-05; cite it as a draft |
| GOV.UK banner, button and validation guidance | [notification banner](https://design-system.service.gov.uk/components/notification-banner/); [button](https://design-system.service.gov.uk/components/button/); changelogs to 2026-07 | 09, 16, 19 | 12 months |
| Cancel and discrete progress exist only on the VS Code `Notification` progress location | [VS Code API](https://code.visualstudio.com/api/references/vscode-api.md), fetched 2026-11-27 | 15 | each engine bump |
| Toast defaults for error severity: `@immich/ui` 0.95.1 3000 ms, `svelte-sonner` 0.3.28 4000 ms, `vue-toastification` 2.0.0-rc.5 5000 ms, `react-hot-toast` 2.4.1 4000 ms, `@mantine/notifications` 9.6.0 4000 ms | package tarballs from registry.npmjs.org, fetched 2026-11-27 | 17 | when a lockfile moves, or 12 months |
| The 1 s indicator delay, the `not cancellable:` comment and the `<view>-<state>` fixture name | **pinned** house conventions, not measured thresholds | 01, 10, 15 | an adopter overrides once |

## Source Lists

A grep over a pathspec that lists nothing prints nothing, which reads as a pass. Run the canary first. Every block below feeds its search from the same git-fed lists: interface source (`.ts .tsx .jsx .vue .svelte .astro .html`, tests excluded) or fixtures (a `fixtures` or `goldens` directory).

```sh
# canary: any output means the source list is empty
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' ':(exclude,glob)**/*spec*' \
  | tr '\0' '\n' | awk 'END { if (NR == 0) print "canary: nothing listed" }'
```

## View States

"Fixture" means a rendered snapshot of one view in one state: a golden HTML file, a component render or a Playwright page. A zero count from a tag grep is not a pass where a helper or component renders the markup: list the elements and read the wrapper (see `forms.md` for the element scripts). `"$VIEW"` is the fixture stem of the view under test.

```sh
# UX-STATE-01: files that read async data, then the fixtures present for one view
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -l -E -e 'fetch\(' -e 'invoke\(' -e 'postMessage\(' -e 'useQuery\(' -e 'useSWR\(' --
git ls-files -- ':(glob)**/*fixtures*/**' ':(glob)**/*goldens*/**' | grep -c -E -e "$VIEW-(loading|empty|error)"
# UX-STATE-02: site locator. Empty tests and "No ... found" copy; read each file for the variable's initialiser, assignments and guard
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e '[.]length *(===?|<=?) *[01]' -e '![[:alnum:]_.]+\[0\]' -e '[Nn]o [[:alnum:] ]+ (found|yet)' --
# UX-STATE-03: a catch whose only effect is a console call, then a catch that returns an empty value (read the context lines)
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -A3 -E -e 'catch *\(' -- | grep -E -e 'console[.](error|warn|log)'
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -A2 -E -e '[.]catch\(\(\) *=> *(\{ *(return +)?)?(\[\]|null|undefined)' -e '[.]catch\(\(\) *=> *\{ *$' --
# UX-STATE-04: error fixtures with no button, link or retry text are listed
git ls-files -- ':(glob)**/*fixtures*/**' ':(glob)**/*goldens*/**' | grep -E -e '-error' | tr '\n' '\0' \
  | xargs -0 -r grep -L -i -E -e '<button' -e '<a href' -e 'retry' -e 'try again' --
# UX-STATE-05: loading, error and partial fixtures with no live region at all are listed; then every role="alert" in source
git ls-files -- ':(glob)**/*fixtures*/**' ':(glob)**/*goldens*/**' | grep -E -e '-(loading|error|partial)' | tr '\n' '\0' \
  | xargs -0 -r grep -L -E -e 'role="?(status|alert)' -e 'aria-live' --
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -F -e 'role="alert"' --
# UX-STATE-06: an empty fixture rendered with query "" must not say "match"
git ls-files -- ':(glob)**/*fixtures*/**' ':(glob)**/*goldens*/**' | grep -E -e '-empty' | tr '\n' '\0' \
  | xargs -0 -r grep -H -n -i -E -e 'match' --
# UX-STATE-07: paged source (filters data modules, not views), capped list, then the fixtures each one needs
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'hasNextPage|endCursor|nextPageToken|hasMorePages|per_page|pageInfo|nextPage|pageToken|[?&](page|offset)=' -e 'PAGE_SIZE|[Pp]age[Ss]ize|page_size|[Pp]aging' --
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e '[.]slice\(0, *([A-Z][A-Z_]{2,}|[0-9]{2,})\)' --
git ls-files -- ':(glob)**/*fixtures*/**' ':(glob)**/*goldens*/**' | grep -E -e "$VIEW-(partial|capped)"
# UX-STATE-34: age-field trigger. Read each hit: a value shown as data is not an age
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'syncedAt|lastSynced|lastFetched|fetchedAt|dataUpdatedAt|generatedTime|lastUpdate[[:alnum:]_]*' -e '[Ll]ast (updated|synced|refreshed)' --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-01 | Give every view that reads an async data source a loading, an empty and an error branch, each reachable in a fixture named `<view>-<state>` (**pinned** naming). | Agents write the happy path. A blank or ambiguous panel hides system status, an empty state's first job ([NN/g, 2021-09-19](https://www.nngroup.com/articles/empty-state-interface-design/)). | See block UX-STATE-01. A fixture count below 3 for a view fails. A fetch with no rejection branch in the same file fails (UX-STATE-03). | MUST |
| UX-STATE-02 | Show empty-state copy only after the fetch has settled with zero items. Never branch on `items.length === 0` alone while `items` starts as `[]`. | "No items" shown during loading makes users decide the content does not exist and stop waiting ([NN/g, 2021-09-19](https://www.nngroup.com/articles/empty-state-interface-design/)). | Follow the data variable from its initialiser to its assignments; block UX-STATE-02 only locates sites. Pass when (a) the empty branch sits under, or after an else of, a settled flag (loading, loaded, ready, `isPending`); (b) the unloaded state is a sentinel the empty test cannot match (`null`, `undefined`, an `Either` or `Result`) with its own branch; or (c) a route or page `load` awaits the data before the view renders. Fail when the variable starts as `[]` or `{}`, is assigned in an async callback or after an `await`, and none of (a) to (c) holds. Never judge only the expression that selects the empty branch: it false-failed 7 of 12 conformers. A file-level search for loading words passed a violator. The locator misses derived data, so also read every "No ... found" copy on a view that fetches. Then render with a fetch that never resolves and assert no empty text appears. That render step has not run on any codebase. | MUST |
| UX-STATE-03 | Render a failure as an error state. A failure must never look like an empty view, an unchanged but dead view, or a `console.error` only. | Where user content should appear, a generic empty state reads as data loss ([Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/), 2024-07-11). A dead control with no message is worse. | See block UX-STATE-03, then read each hit. A catch whose only effect is a console call fails. A catch that returns an empty value fails when the value reaches an empty-state or not-found branch; ignore `.catch(() => {})` on fire-and-forget calls. Expect noise: 47 files in one codebase, 0 to 19 in ten others. Force a rejected fetch in a test: the output holds the error marker and not the empty marker. | MUST |
| UX-STATE-04 | Make an error state name the problem class (network, permission, configuration, server or tool) and offer one recovery control: Retry, or the fixing action. | An error with no next step is a dead end ([Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/), [Primer](https://primer.style/product/ui-patterns/empty-states/)). `text.md` owns the wording. | See block UX-STATE-04. Any fixture it lists fails. | MUST |
| UX-STATE-05 | Announce pending, result and failure without moving focus. Use `role="status"` for progress and success, `role="alert"` only for errors and other urgent text. Put the container in the DOM at load and inject the text later. Give a group of skeletons one announcement. `aria-busy` announces nothing and never satisfies this row. | [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), AA. An `alert` on non-urgent text is a listed failure. A container inserted together with its text is often not announced ([MDN alert](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role), 2026-09-28). | In a component or Playwright test, find the element that holds the state text (the loading label, the error message, the partial summary): `el.closest('[role="status"],[role="alert"],[aria-live]')` must not be null. A live region elsewhere in the fixture does not count. Block UX-STATE-05 pre-filters golden files, then lists every `role="alert"`: one on a success or "Saved" message fails. axe does not prove this row: it passed every fixture that had no live region. | MUST |
| UX-STATE-06 | Give every empty state a heading that names the thing, one line on why it is empty or how items arrive, and at most one primary action. Keep first-use and no-results apart: a no-results state names the active query or filter and offers to clear it. An empty view with no query or filter never says "match". | [Primer](https://primer.style/product/ui-patterns/empty-states/) asks for a heading and "one primary link or action". [Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/) forbids dead ends. | See block UX-STATE-06: a hit fails. Each empty fixture contains a heading element and exactly one primary `button` or `a` (read it). | MUST |
| UX-STATE-07 | Where data is paged, capped or user-generated, add the states it needs. Partial: say what is shown and what is missing, and offer to retry the missing part. Overflow: wrap or truncate long strings with the full text reachable. A capped list says it is capped, with a count and a way to reach the rest. | [Primer](https://primer.style/product/ui-patterns/degraded-experiences/) bans "undefined of undefined" counts and asks that failed sections be replaced in place. The sample is 2 codebases with 1 confirmed literal cap. | See block UX-STATE-07. The paged grep filters data modules: read whether each match renders a partial list or only fetches (a `do ... while (hasNextPage)` loop shows no partial state). Never search the bare word `cursor`: it matched 254 lines of editor cursors. Drop slice hits on hashes, buffers and string truncation. The sliced array must reach a rendered list, and the view says it is capped with a count. The grep misses `.splice`, `.take` and a loop with `break`. A `<view>-partial` and `<view>-capped` fixture must exist where required. Any list view: a stress render with a 500-character unbroken string and 5000 rows shows no horizontal page scroll. | SHOULD |
| UX-STATE-34 | Where a view renders data read from a cache, show the data's age and a refresh action. | A cached view with no age reads as current. The only source is [Primer](https://primer.style/product/ui-patterns/degraded-experiences/); the rule has three conforming instances and no held-out violator in 12 codebases, so the check has not been shown to fail anything. | See block UX-STATE-34. The matched value must reach a rendered component, or the UI strings say "last updated". For each triggered view some fixture holds a timestamp or age phrase and a refresh control, or the data refreshes on an interval the user sees. Do not trigger on `staleTime`, `gcTime`, `cache`, `localStorage` reads or `updated_at`: refetch policy and preferences matched hundreds of lines with no rendered age. A query with `staleTime` over 60 s and no age is a candidate: note it, never fail it. A cache-age field under another name goes unseen. The rule does not say where the age appears. | CONSIDER |

## Waits and Repeat Activation

One ladder serves web, webview and terminal. It is the terminal ladder (TUI-23) plus a 3 s determinate tier that TUI-23 does not carry yet. An upload, install or update is a process: it gets a bar, never a skeleton. An AI or other open-ended call offers stop from its first indicator. Add no delay to make an answer feel considered: one unreviewed preprint (N = 240, [arXiv:2604.06183](https://arxiv.org/abs/2604.06183), 2026-02-09) does not justify one.

| Wait from activation | Region or page indicator | On the pressed control |
|---|---|---|
| 0 to 100 ms | none | a visible pending state in the first paint after the event |
| under 1 s | none | the pending state stays |
| 1 to 3 s | indeterminate: a skeleton for the first load of a whole view, a spinner for one module | pending |
| 3 to 10 s | determinate when the work is countable, else indeterminate | pending |
| over 10 s | determinate or staged progress, a cancel control, and a background task when the user can continue | pending |

```sh
# UX-STATE-08: reading check. A state write must precede the first await or postMessage
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -A8 -F -e "addEventListener('click'" --
# UX-STATE-09: each hit sits on a non-initiating field, or has a focus() call in the settle branch
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e '[.]disabled *= *true' -e "setAttribute\('disabled'" -e '[?]disabled=' -e '(^|[^[:alnum:]_])inert([^[:alnum:]_]|$)' --
# UX-STATE-10: loading flags, then every Suspense boundary
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'loading *= *true' -e 'setLoading\(true\)' -e 'isLoading' -e "phase: *'loading'" -e '<Suspense' --
# UX-STATE-12: a reload path that nulls or empties data before the fetch
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'set[[:alnum:]_]*\((null|\[\])\)' -e 'data *= *(null|\[\])' --
# UX-STATE-13: files that set a progress value, then timers in them, then hard-coded percentages
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -l -E -e 'aria-valuenow' -e 'progress[.]report' -e '<progress' -- \
  | tr '\n' '\0' | xargs -0 -r grep -H -n -E -e 'setInterval' -e 'setTimeout' --
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e '(value|aria-valuenow)=[{"]*[0-9]+' --
# UX-STATE-14: every fetch call; each passes signal, or its caller bounds it
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.mjs' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e '(^|[^[:alnum:]_.])fetch\(' --
# UX-STATE-15: deadlines; keep those over 10000
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e '_TIMEOUT_MS *= *[0-9_]+' -e 'AbortSignal[.]timeout\(' --
# UX-STATE-16: mutating requests; each has an Idempotency-Key nearby or a comment naming the server guarantee
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'method: *.(POST|PUT|PATCH|DELETE)' --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-08 | In the handler of every async action, set a local pending flag before the first `await`, `postMessage` or `fetch`. The flag changes the control visibly in the next paint and makes a second activation return at once. Clear it in `finally`. A guard that waits for a host or server message to set "busy" fails. | A control that waits for a round trip looks dead and accepts a second click ("Trap multiple clicks", [Tognazzini, 2014-03-05](https://asktog.com/atc/principles-of-interaction-design/)). [INP](https://web.dev/articles/inp) counts the next paint and never loading. | Contract test: replace the transport (`fetch`, `postMessage`, an IPC `invoke` or the project's send function) with a spy, fire the activation twice in the same tick, and assert the spy ran once. Reading check: block UX-STATE-08. Pass: a state write precedes the first `await` or `postMessage`. Fail: the guard is `busy !== null` and `busy` is set only by an inbound message. | MUST |
| UX-STATE-09 | While the action is pending, keep the initiating control focusable, with `aria-disabled="true"`, its original label plus a spinner or "Saving...". `disabled` or `inert` is allowed on the form's other fields. If the focused control is made `disabled` or `inert`, move focus back to a labelled anchor when the action settles. Never pre-disable for invalid input (UX-STATE-21). | `disabled` on the pressed button resets focus ([Primer button](https://primer.style/product/components/button/accessibility/)). The synchronous guard of UX-STATE-08 carries the safety, because the attribute alone blocks nothing. | See block UX-STATE-09. | SHOULD |
| UX-STATE-10 | Choose the indicator from the ladder above and write the **pinned** 1000 ms show-delay in code. A `Suspense` fallback does not count as a delay. A process shows a bar, never a skeleton. The pending state on the pressed control (UX-STATE-08) is exempt from the delay. | Under 1 s an indicator flashes and reads as slower ([Primer](https://primer.style/product/ui-patterns/loading/), [NN/g](https://www.nngroup.com/articles/skeleton-screens/)). React documents no show-delay. No measurement tested 1000 ms: it is a convention that makes the check decidable. | See block UX-STATE-10, then read each hit. Pass: the region indicator appears behind a `setTimeout(..., 1000)` or a named constant equal to 1000. A skeleton on an upload or install path fails. Each `Suspense` boundary pairs with a stated delay or a transition. | MUST |
| UX-STATE-11 | Make a skeleton take the exact box of the content it stands for, with content-shaped placeholders, never frame-only. The real content replaces it in place. | Layout shift when content arrives. A frame-only skeleton "should not be used" as a progress indicator ([NN/g](https://www.nngroup.com/articles/skeleton-screens/)). | CLS is 0 in the page test across the loading-to-ready swap. unverified: reading heuristic for the slot: it sits next to the component and has equal height or a reserved `min-height`. | MUST |
| UX-STATE-12 | On refresh, keep the content already painted. Show a refreshing cue after 1 s and mark stale content as stale. Never swap painted content for a skeleton or spinner. | Hiding revealed content is the flash that transitions exist to avoid ([React](https://react.dev/reference/react/Suspense)). | See block UX-STATE-12: a hit before the fetch on a reload path fails. In React the refetching update sits in `startTransition` or reads `useDeferredValue`. | MUST |
| UX-STATE-13 | Derive every determinate progress value from a counter of work done (bytes, items, steps), never from a timer or a constant. | A bar that moves on a timer is fake. Determinate progress shows counts ("Updating address 3 of 50", [NN/g, 2014-10-26](https://www.nngroup.com/articles/progress-indicators/)). | See block UX-STATE-13, then read: an increment inside a timer callback with no count behind it fails, and so does a hard-coded percentage. Untested: no codebase measured has a determinate bar. | SHOULD |
| UX-STATE-14 | Give every network or child-process wait a deadline and a visible failure path: `AbortSignal.timeout(n)` on `fetch`, a timeout on the process runner, and an error state with Retry when it fires. | A wait with no deadline is an indicator that can spin forever, which breaks the 10 s tier. | See block UX-STATE-14. Each call passes `signal`, or its caller is shown to bound it. A caller trace is needed: a direct grep cannot see it. | MUST |
| UX-STATE-15 | For any operation whose deadline exceeds 10 s: show determinate or staged progress, and offer a cancel control that stops the work. SHOULD: show a link to details or logs (only the VS Code page sources this clause, and a missing link does not fail the MUST). If cancelling is unsafe, put a `not cancellable: <reason, owner decision>` comment (**pinned**) at the call. An AI or other open-ended call offers stop from its first indicator. In VS Code use `window.withProgress` with `ProgressLocation.Notification`, `cancellable: true`, and a `token.onCancellationRequested` handler that kills the child process. | Past about 10 s Nielsen asks for percent-done and "a clearly signposted way for the user to interrupt" ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)). Cancel and discrete progress exist only on the `Notification` location. | See block UX-STATE-15, keep deadlines over 10000. Each wrapped call has `cancellable: true`, or an `AbortController` wired to a visible control plus a handler that stops the work, or the `not cancellable:` comment. | MUST |
| UX-STATE-16 | Make a network mutation safe to repeat on the server: send an idempotency key the server honours, or document why the endpoint is naturally idempotent. | A client guard cannot stop a retry after a lost response ([GOV.UK button](https://design-system.service.gov.uk/components/button/)). The header is still an Internet-Draft: cite it as one. | See block UX-STATE-16. Each hit has `Idempotency-Key` nearby or a comment naming the server-side guarantee. Untested on any codebase. | SHOULD |

## Message Channels

Choose the channel by how long the message must last, not by its tone. A modal is UX-ACT's call. Web products should not use toasts. Where they exist, a toast is never the only place an error or a needed fact appears.

| Situation | Channel | Lasts |
|---|---|---|
| Field validation | inline at the field, plus an error summary after submit | until fixed |
| An action failed | inline beside the trigger | until the user retries or acts |
| Success, and the outcome is visible | no visual message; announce through `role="status"` (VS Code: the inline state or `setStatusBarMessage`) | none |
| Success, and the page changes | a banner on the next page | that page |
| Service-wide or system condition | one banner, before the `h1` | until resolved |
| A section is degraded | the section's own error state | while degraded |
| Transient confirmation also available elsewhere | toast, only where the product allows toasts | optional timer |

```sh
# UX-STATE-17 step 1: the error reporters. A count of 0 is not a pass: search the project's own error helper by name
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'toast(Manager)?[.](error|danger)' -e 'toastError' -e 'toast\(' -e 'snackbar' -e 'showError[[:alnum:]_]*' -e 'addNotification' -e 'notifications[.]show' -e 'type: .error.' --
# UX-STATE-17 step 4: a timer near a toast or notification; read each hit
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -B3 -A3 -E -e 'setTimeout' -- | grep -i -E -e 'toast' -e 'notif' -e 'snackbar' -e 'flash'
# UX-STATE-18: message-only information calls added in a diff (VS Code); each user-triggered hit fails
git diff -U0 HEAD | grep -n -E -e '^[+].*showInformationMessage\([^,()]*\)'
# UX-STATE-19: banners per rendered route, printed as "count file" (a count over 1 fails; use the house component's tag or root class), then banners in form files
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/dist/**/*.html' ':(glob)**/build/**/*.html' ':(glob)**/site/**/*.html' \
  | xargs -0 -r awk 'FNR == 1 && NR > 1 { print n, name; n = 0 } FNR == 1 { name = FILENAME } { n += gsub(/<Banner([^[:alnum:]_]|$)|govuk-notification-banner"/, "&") } END { if (NR > 0) print n, name }' | awk '$1 > 1'
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*form*' \
  | xargs -0 -r grep -l -E -e '<Banner([^[:alnum:]_]|$)' -e 'govuk-notification-banner' --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-17 | Never put an error, or a fact the user needs to finish the task, only in a transient message. Never auto-dismiss an error. Where a product uses toasts at all, each toast has a dismiss control, at most two lines and one action, a polite announcement, and can be reached again somewhere else. | [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) exempts a timed message only when the information is available another way. [Carbon](https://carbondesignsystem.com/components/notification/usage/) sets the two-line and close-button limits. A `setTimeout` grep alone false-passed 5 of 7 violating codebases: the timer sat in a library default. | Block UX-STATE-17. (1) List the error reporters, then open the project's toast helper or notification mount. (2) Find the effective error duration: a per-call `timeout`, `duration`, `autoClose` or `sticky`, else the helper's default, else the library's default, read in the locked version's package tarball with file and line. Fail when error severity inherits a finite duration. Pass at `0`, `false`, `Infinity`, `-1` or `sticky: true`, whichever the library defines as no timeout. (3) If error severity is finite but every error also stays in a reachable history, report that it meets the WCAG rationale and breaks the sentence "Never auto-dismiss an error". Report both: which governs is an owner decision. (4) A timer on an error fails. Copy and "saved" confirmations are exempt. (5) A timed message with no other path to its content fails; a helper that toasts and writes `console.error` counts as no other path. The dismiss-control, two-line, polite and reached-again clauses have no tested check. | MUST |
| UX-STATE-18 | Do not show a visual message that only confirms an action whose result the user can already see (copy, add, create, store). On the web, announce through `role="status"`. In VS Code use the inline state change or `setStatusBarMessage(text, ms)`, never `showInformationMessage`. | "Only when absolutely necessary" ([VS Code notifications](https://code.visualstudio.com/api/ux-guidelines/notifications), 2026-11-25). Use success messaging "sparingly" ([Primer](https://primer.style/product/ui-patterns/notification-messaging/)). | See block UX-STATE-18 over the diff. On the web, a toast or banner on an action whose result is on screen fails. | MUST (new code) |
| UX-STATE-19 | Show at most one banner per page, placed before the `h1`, and render every banner through one named component (the design system's, or one house component whose name is recorded in its file header). Never use a banner for validation errors: they belong to the field and the error summary. | [GOV.UK notification banner](https://design-system.service.gov.uk/components/notification-banner/) says to avoid more than one and lists validation banners under "Do not". Users miss banners. | See block UX-STATE-19: the first command prints only routes whose count is over 1, so it prints nothing, and the form-file list is empty. A banner built outside the named component fails on reading. Untested on any codebase. | SHOULD |

## Calibration Instances

Open-source code read 2026-11-27, to check a procedure against a known answer before trusting its output on yours. Each is a file at a commit.

- UX-STATE-02 fail: Uptime Kuma `src/pages/ManageMaintenance.vue:17-21` at `d35c3fa` (`maintenanceList: {}`, no loaded flag). Fail: Open WebUI `src/lib/components/admin/Settings/Events.svelte:769-773` at `926f826`. Pass (a): Memos `PagedMemoList.tsx:251` at `78a8dc8`. Pass (b): Paperless-ngx `saved-views.component.html:79` at `26599c3`.
- UX-STATE-03 fail: Open WebUI `KnowledgeSelector.svelte:61-63` at `926f826`, where a failed search reads "No knowledge found".
- UX-STATE-07 fail: `microsoft/vscode-pull-request-github` `webviews/components/sidebar.tsx:357` at `c9891f1` caps an avatar list at 10 with no count.
- UX-STATE-17 fail: Immich `web/src/lib/utils/handle-error.ts:56` at `a608f8f`, Open WebUI `Toaster.svelte:24-27` at `926f826`, Linkwarden `pages/_app.tsx:82-90` at `24adcc1`, Homarr `packages/notifications/src/index.tsx:12-17` at `3ee454b`. Pass: Memos `web/src/lib/toast.ts:12` at `78a8dc8` (`timeout: 0`). Finite with a history: Paperless-ngx `toast.service.ts:94-100` at `26599c3` (step 3).
- UX-STATE-34 pass: Memos `ResourceStatsSection.tsx:40-58` (`generatedTime`), Uptime Kuma `StatusPage.vue:579-583` (`lastUpdateTime`), Homarr `widget-context-menu.tsx:429` (`dataUpdatedAt`).

## Ask the Owner

- Whether a long operation can be cancelled safely (a lock, half-written state). Until the owner answers, write the `not cancellable:` comment rather than a cancel that leaves partial state.
- Whether to remove existing confirmation toasts: UX-STATE-18 binds new code only.
- Whether the product allows toasts at all, and whether an error toast may time out when every error is kept in a reachable history.
- Whether a password, token or one-time-code field is cleared after a failed submit (UX-STATE-25's security call).
- Whether a mutation is idempotent on the server and how long a key lives. Never send an `Idempotency-Key` the server ignores.
- Any added delay, and the expected-wait class of an operation never measured: measure it or ask, never guess the class.
- Whether a system banner may be dismissed before the condition is resolved, and whether stale data may be shown after an outage when it is priced, regulated or security-relevant.

## What Agents Get Wrong Here

Ranked by how often each appears, grouped by mechanism.

1. **`catch (e) { console.error(e) }` with no UI state, or no `catch`** (UX-STATE-03, 01).
2. **One `items.length === 0` branch for both loading and empty** (UX-STATE-02).
3. **Generic empty copy, or "no results for ''" on an unfiltered list** (UX-STATE-06). **A raw tool message as the error, with no retry** (UX-STATE-04).
4. **The pending flag set after the `await`, or from the host's reply**, so two clicks both send (UX-STATE-08). **`fetch` with no timeout** (UX-STATE-14).
5. **Every refetch replaced by a skeleton** (UX-STATE-12). **A spinner on every request, even an 80 ms one** (UX-STATE-10). **Trusting `Suspense` to delay the fallback** (UX-STATE-10).
6. **A long operation with a spinner and no cancel, or a `cancellable` token never wired to stop the child** (UX-STATE-15).
7. **A spinner or error with no text and no live region.** It passes visual review and axe (UX-STATE-05). **`role="alert"` on everything, including "Saved"**, or a container injected with its text already inside.
8. **`disabled` on the pressed button, so focus falls to `body`** (UX-STATE-09).
9. **`showInformationMessage('Done')` after every command** (UX-STATE-18). **"Toasts are fine for errors"**, with a library default of 3 to 5 s (UX-STATE-17).
10. **A progress bar animated by `setInterval`** (UX-STATE-13). **A skeleton on an install or upload, or a frame-only skeleton** (UX-STATE-10, 11).
11. **Treating INP as the loading budget.** It measures the next paint only (UX-STATE-08). **Dating Nielsen's limits 2014.** They are from 1993, with a 2014 update.

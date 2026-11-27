---
title: Interface states, waits, messages and forms
topic: ux-interface-states
program: product
sub_program: ux
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: UX-STATE
consolidates:
  - ux-interface-states/loading-and-progress.md
  - ux-interface-states/empty-error-notification.md
  - ux-interface-states/form-state-machine.md
  - ux-interface-states/editor-extension-surfaces.md
  - ux-interface-states/followup-q0.md
  - ux-interface-states/followup-q1.md
  - ux-interface-states/followup-q2.md
---

# Interface states, waits, messages and forms

The question: which states must every view, async action and form render, with which indicator at which wait, and how does a rule detect a missing state?

## Verdict

1. **Every view with an async data source renders three states as separate branches: loading, empty and error.** Partial and overflow are added where the data is paged, capped or user-generated (UX-STATE-07). Stale is a CONSIDER where the view reads a cache (UX-STATE-34), because its sourcing is the weakest in this set. The detector is one fixture per state, not a reviewer's eye. The VS Code extension already keeps a golden HTML file per state (`grimoire-rs/vscode/test/fixtures/goldens/`, for example `results-error.html`, `results-browse-ready-empty.html`, `browse-paged-partial.html`). That naming, `<view>-<state>`, is the house pattern the rules require ([empty-error-notification.md §6](ux-interface-states/empty-error-notification.md#6-how-a-review-detects-a-missing-state)).
2. **axe is not the detector for missing announcements.** axe-core passed every forced loading and error fixture that has zero live regions ([empty-error-notification.md Finding 1](ux-interface-states/empty-error-notification.md#1-measured-the-fleets-data-views-2026-11-27)). So the announcement rules are verified by a grep on each state fixture, plus a screen-reader pass that UX-VERIFY owns.
3. **One wait ladder serves web, webview and terminal.** It is TUI-23 (`skills/rust-quality-reference/tui.md:124`) plus the 3 s determinate tier from Primer, pending CR-1, which asks the catalog to add that tier to TUI-23:

   | Wait from activation | Region or page indicator | On the pressed control |
   |---|---|---|
   | 0 to 100 ms | none | a visible pending state in the first paint after the event |
   | under 1 s | none | the pending state stays |
   | 1 to 3 s | indeterminate: a skeleton for the first load of a whole view, a spinner for one module | pending |
   | 3 to 10 s | determinate when the work is countable, else indeterminate | pending |
   | over 10 s | determinate or staged progress, a cancel control, and a background task when the user can continue | pending |

   An upload, install or update is a process. It gets a bar, never a skeleton. An AI or other open-ended call offers stop from its first indicator, because its end is unknown. Sources: [Nielsen, 1993 with a 2014 update](https://www.nngroup.com/articles/response-times-3-important-limits/), [Primer loading](https://primer.style/product/ui-patterns/loading/) (source file last changed 2024-07-03, by the GitHub commits API, run 2026-11-27), and [NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) (2023-06-04, reviewed 2026-09-02).
4. **Conflict: when does the first indicator appear? Decision: at 1000 ms.** empty-error-notification (its rule 5) took Vercel's show-delay of 150 to 300 ms and a minimum visible time of 300 to 500 ms. loading-and-progress took 1 s. 1 s wins: Primer and NN/g both say no indicator under 1 s, TUI-23 says the same, and the fleet sidebar already uses 1000 ms with a comment that gives the reason (`vscode/src/webview/sidebar/main.ts:1245-1258`). Vercel's numbers are vendor guidance with no study behind them ([Vercel guidelines](https://vercel.com/design/guidelines), undated, vendor data). The minimum visible time is dropped. A region indicator delayed to 1 s does not flash, and the pressed control already shows the pending state at once.
5. **Conflict: does React `Suspense` give a show-delay? Decision: no. State the delay in code.** The Vercel README says Suspense "does this automatically". React's own page documents only a reveal throttle ("at most once every 300ms") and opt-in `startTransition` / `useDeferredValue` ([React Suspense](https://react.dev/reference/react/Suspense), undated, fetched 2026-11-27). The framework's own documentation wins.
6. **Conflict: while a submit is in flight, `disabled` or `aria-disabled`? Decision: the synchronous guard is the MUST. `aria-disabled` on the initiating control is the SHOULD.** The dives split three ways. loading-and-progress said `aria-disabled` only (UX-LOAD-8). form-state-machine allowed `disabled` or `inert` (FORM-10). The design-system audit shows Polaris and Spectrum make pending imply native disabled (`product-audit/exemplar-design-systems.md`, "The disabled state is built four different ways"). The dive also flagged a Primer contradiction that it could not resolve. I read the Primer source files to settle it (`curl https://raw.githubusercontent.com/primer/design/main/content/components/button.mdx` and `.../content/ui-patterns/loading.mdx`, 2026-11-27). The button page is explicit: "don't remove the button from the DOM or pass the `disabled` attribute ... it would reset focus", and "it should get the attribute `aria-disabled="true"`" (source last changed 2024-10-28). The loading page allows you to "disable form controls after the user submits the form". Its next sentence ("may not be semantically disabled using `aria-disabled`") is a garbled cross-reference to that button section, not a contrary rule. So: `aria-disabled` on the pressed control, and `disabled` or `inert` allowed on the other fields. Whoever uses `disabled` or `inert` on the focused control must move focus back afterwards. The fleet's registry form does exactly that, and records why (`settings/render.ts:515-517`, `settings/main.ts:316-320`). The attribute alone blocks nothing, so the guard carries the safety.
7. **Conflict: cancel past 10 s, MUST or SHOULD? Decision: MUST, with a recorded escape.** loading-and-progress made cancel a MUST (UX-LOAD-11). editor-extension-surfaces made it a SHOULD, because cancelling a grim call mid-lock may leave partial state (its rule 7). Both are right, so the rule is checkable either way. An operation with a deadline over 10 s either offers cancel that stops the work, or carries a `not cancellable:` comment that names the owner decision. In VS Code the API leaves one surface for this. "Currently only ProgressLocation.Notification is capable of showing discrete progress" and only it shows a cancel button ([VS Code API](https://code.visualstudio.com/api/references/vscode-api.md), fetched 2026-11-27).
8. **Conflict: does the extension announce its errors? Decision: no, except on paging.** editor-extension-surfaces reported "`role="status"`/`role="alert"` live regions on the load and save errors". empty-error-notification measured 0 live regions on every error fixture. I read the source at `9230dcd`. The live regions at `src/webview/render.ts:1219,1221` belong only to `renderPartialSummary`, the paging footer. The full-view error states at `render.ts:1177`, `render.ts:2049` and `settings/render.ts:656` are bare `<div class="error-state">` elements, with no role and no retry. The only announced save error is the registry form (`settings/render.ts:522`). So both measurements are true, and the editor dive's summary overstated them.
9. **Conflict: the extension's message-call count. Decision: 30 real production calls (16 information, 9 warning, 5 error).** The topic map's 183 counts test stubs, and loading-and-progress's 33 counts lines that include 3 comments ([editor-extension-surfaces.md F3-F4](ux-interface-states/editor-extension-surfaces.md#f3-measurements-reproduced-checkout-grimoire-rsvscode-at-9230dcd-working-tree-clean-run-2026-11-27)).
10. **Conflict: validation timing. Decision: validate on submit by default. A non-empty field with a format rule may also validate on blur. Never validate on focus or on the first keystroke.** GOV.UK says do not validate on blur ([GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/)). NN/g says validate inline ([NN/g, reviewed 2024-12-12](https://www.nngroup.com/articles/errors-forms-design-guidelines/)). Smashing and Baymard say validate late, on blur ([Smashing 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/); [Baymard 2024-01-09](https://baymard.com/blog/inline-form-validation), vendor data). Submit-time judgement is the part all four accept. The primary source for it is GOV.UK: "Wait until they try to move to the next part of the service ... usually by clicking the 'continue' or 'submit' button", and "avoid validating the information in a field before the user has finished entering it", because "this sort of validation can cause problems - especially for users who type more slowly" (page undated, fetched 2026-11-27). The blur clause is the part three accept, so it is a permission (MAY), never a duty. UX-STATE-22 stays a SHOULD until a codebase shows a real premature error that its check catches. Its rewritten check ran on three codebases with real forms and found none (item 16).
11. **Conflict: toasts. Decision: web products SHOULD NOT use them. Where they exist, they are never the only place an error or a needed fact appears.** [Primer](https://primer.style/accessibility/patterns/accessible-notifications-and-messages) calls toasts "not recommended". [Carbon](https://carbondesignsystem.com/components/notification/usage/) ships them, persistent by default (source last changed 2025-06-30). [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) allows a timed message only when the same information is available elsewhere. VS Code notifications are a native surface with their own rules (UX-STATE-29 to 32), not web toasts.
12. **The non-modal channel is chosen by how long the message must last, not by its tone.**

    | Situation | Channel | Lasts |
    |---|---|---|
    | Field validation | inline at the field, plus an error summary after submit | until fixed |
    | An action failed | inline beside the trigger | until the user retries or acts |
    | Success, and the outcome is visible | no visual message; announce through `role="status"` (VS Code: the inline state, or `setStatusBarMessage`) | — |
    | Success, and the page changes | a banner on the next page | that page |
    | Service-wide or system condition | one banner, before the `h1` | until resolved |
    | A section is degraded | the section's own error state (blank slate) | while degraded |
    | Transient confirmation also available elsewhere | toast, only where the product allows toasts | optional timer |

    Sources: [Primer notification messaging](https://primer.style/product/ui-patterns/notification-messaging/) (source last changed 2024-12-04), [GOV.UK notification banner](https://design-system.service.gov.uk/components/notification-banner/), and [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) (source last changed 2024-07-11). A modal is UX-ACT's call.
13. **Surface scope.**
    - Webview HTML is web UI. Every web rule here applies to it, because VS Code gives a webview no accessibility or state handling ([VS Code webviews guideline](https://code.visualstudio.com/api/ux-guidelines/webviews), page date 2026-11-25).
    - Native VS Code surfaces (notification, status bar, quick pick, input box, tree view) inherit keyboard and accessibility from the editor. There the duty is surface choice, actions and progress (UX-STATE-15, 18, 28 to 33).
    - The CLI keeps CLI-08 and CLI-16. TUIs keep TUI-17 to TUI-25.
14. **How the rules load.** grim rules load on `paths` globs only. Nothing triggers on file content ([editor-extension-surfaces.md F7](ux-interface-states/editor-extension-surfaces.md#f7-how-the-rule-loads-on-extension-sources-answered-against-the-grim-rule-spec)). The web and webview rows go into `skills/ux-quality-reference/states.md`, required by the path-loaded `rules/ux-quality.md` (`ux-topic-map.md`, "Artifact set"). The VS Code rows (UX-STATE-28 to 33) need extension-only globs with no commas: `**/extension.ts`, `**/src/webview/**`, `**/src/views/**`, `**/.vscodeignore`. Their first body line is the content gate: "Applies when `package.json` has `engines.vscode`; otherwise stop."
15. **Dropped, with reasons.**
    - Server-side validation (FORM-02): competent models already do it.
    - "Error: " in the page title (FORM-16): the fleet has no full-page forms, so it gets no rule yet.
    - `type="number"` and `spellcheck` (FORM-13): only GOV.UK supports them, and the advice is contested for quantities.
    - Analytics on repeated errors (FORM-17): this is a research-methods question.
    - The minimum visible spinner time (UX-LOAD-13): see item 4.
    - "Leave no progress notification running" (editor rule 9): this is promise hygiene the API already enforces.
    - Quick-pick placeholders and titles (editor rule 13): low yield, and the fleet passes.
    - Status-bar colours (editor rule 12): folded into UX-STATE-29.
    - Webview hex colours (editor rule 18): css-theming owns them.
    - Reduced motion in webviews (editor rule 17): UX-A11Y owns it, with the decision in "Cross-territory" below.
    - Demo data in empty states (empty-error rule 21): product judgement with no check.
16. **What the wave-2 follow-ups settled, and the gaps they documented (all run 2026-11-27).**
    - **The UX-STATE-24 focus test separates a pass from a fail, with a fixed protocol** ([followup-q0.md](ux-interface-states/followup-q0.md), answered yes). In Google Chrome for Testing 159.0.8154.6, it scored 12 forms built to pass or fail and 4 mutations of the real registry form at `9230dcd` correctly. As first worded ("submit, then count"), it failed 11 of 12 forms, both correct ones included, because the focus move happens before a log started after the activation. A mouse click adds one `focusin` that the application did not cause, so a correct form reads 2. The Verify now fixes the order, the keyboard activation and the settle wait. A count-only check passes a form that sends focus back to the pressed button, so both clauses stay. Documented gaps: the test cannot see a missing error summary, so the summary grep stays required. Only Chromium ran; MDN says Safari does not focus a clicked button ([MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button), modified 2026-04-24). A full-page form with a reload and the live VS Code webview host did not run. The test shows where focus lands, not what a screen reader says. The blur clause of UX-STATE-24 needed its own test, now UX-STATE-35.
    - **The UX-STATE-27 check separates a pass from a fail on three codebases with real forms, so it is MUST** ([followup-q2.md](ux-interface-states/followup-q2.md), answered yes). These are open-source repositories, not fleet code: Gitea at `e77c1c2` (2026-11-27), 11 real fails among 26 hits, with passes at `signup_inner.tmpl:32,36`; Mastodon at `e639273` (2026-11-27), 3 real fails; Plausible at `06efc5e` (2026-11-26), 3 real fails. Where forms come from a helper (Haml `simple_form`, Phoenix `<.input>`), the `<input` grep returns 0 hits on Mastodon and one hidden field on Plausible. That zero is a false pass, so the Verify gained a helper-source branch, and the ruleset header gained one line for every tag grep. Documented gaps: the helper pattern is per framework and was not run on Vue or Svelte. One reader split the hits, with no second reader.
    - **The UX-STATE-26 check separates a pass from two fails after one added detector** (followup-q2). Plausible passes. Gitea fails through a bare CSS asterisk (`web_src/css/modules/form.css:213-216`) that no template grep sees. Mastodon fails because its two renderers mark the optional kind differently. The rule stays SHOULD, because the convention is the owner's choice.
    - **The UX-STATE-22 check now runs, but nothing has shown it catching a real violation** (followup-q2). The old Verify returned 0 on Gitea and Mastodon, a false pass, because Mastodon's handlers use its own `on(` helper and prettier-split calls. The rewritten Verify returns 10, 28 and 27 hits, and a full read found 0 premature errors. The rule stays SHOULD. Documented gap: whether `setCustomValidity` paints during typing needs the app running in a browser, which the follow-up could not set up.
    - **The UX-STATE-07 and UX-STATE-34 triggers were wrong, and the replacements are filters, not detectors** ([followup-q1.md](ux-interface-states/followup-q1.md), answered partly; `microsoft/vscode-pull-request-github` at `c9891f1`, Excalidraw at `dabd83c`). The bare token `cursor` matched 254 lines in Excalidraw, none of them paging, and in the PR extension 11 of 14 lines were editor cursors or CSS. The bare word `cache` matched 454 and 601 lines. The `.slice(0, CONSTANT)` grep is not noisy (1 and 3 hits), but it misses number literals, which found one silent avatar cap (`webviews/components/sidebar.tsx:357`). Both rules keep their severity. Documented gaps: the paging pattern matched 12 files in the PR extension, and only 2 of them render a "more" row, so tracing each module to its view stays a reading step. Capped-list recall is unknown (`.splice`, `.take` and a loop with `break` were not searched). The cache-age trigger finds an age field only when the code names it with one of its tokens (it misses `stateModifiedTime`). Neither second codebase had a stale-data view, so UX-STATE-34 still has one instance, the fleet's.
    - **The follow-up's paging tokens miss the fleet's own paging.** This revision measured that against `grimoire-rs/vscode` at `9230dcd`, read only, from the fleet root (the last command from the clone directory), so the UX-STATE-07 trigger keeps the page-size and paging tokens that find it:

      ```
      $ PG='hasNextPage|endCursor|nextPageToken|hasMorePages|per_page|pageInfo|nextPage|pageToken|[?&](page|offset)='
      $ PS='PAGE_SIZE|[Pp]age[Ss]ize|page_size|[Pp]aging'
      $ git -C grimoire-rs/vscode grep -nE "$PG" -- 'src/*.ts' ':!src/test' | wc -l
      0
      $ git -C grimoire-rs/vscode grep -nE 'cursor|nextPage|pageToken|[?&](page|offset)=' -- 'src/*.ts' ':!src/test' | wc -l
      4
      $ git -C grimoire-rs/vscode grep -nE "$PS" -- 'src/*.ts' ':!src/test' | wc -l
      111
      $ git -C grimoire-rs/vscode grep -lE "$PS" -- 'src/*.ts' ':!src/test' | wc -l
      9
      $ for d in prgh excal; do echo "$d $(git -C $d grep -nE "$PS" -- '*.ts' '*.tsx' ':!*test*' ':!*spec*' | wc -l)"; done
      prgh 18
      excal 3
      ```

      The 4 old-trigger hits in the fleet are a mouse cursor and CSS (`webview/render.ts:362,510,1816`, `webview/sidebar/main.ts:960`). The fleet names its paging `PagingState`, `SEARCH_PAGE_SIZE` and `BACKGROUND_PAGE_SIZE` (`catalog.ts:13-23`). In the PR extension, all 18 `PS` lines are page-size or paging-option code. In Excalidraw, the 3 lines are one WebAssembly memory constant, `WASM_PAGE_SIZE`, which is a false hit. The clones are the follow-up's own clones under `~/.cache/research-lang/exemplars/product/wave2/`.

## The ruleset

Severity: MUST, SHOULD, CONSIDER. "Fixture" means a rendered snapshot of one view in one state: a golden HTML file, a component render, or a Playwright page. `src` stands for the interface source root.

Untested rules. Rules 02, 13, 16, 17 and 19 have no instance in the fleet or in any codebase measured so far (see the "Applied to the fleet" table). Their Verify commands have not run against any codebase, so a false pass or a false fail is still possible. Rule 13 is SHOULD for that reason. Rule 35 has run only against forms built for the test (followup-q0), not against product code. Rules 22, 26 and 27 have no fleet instance, but their Verify commands ran on Gitea, Mastodon and Plausible (Verdict item 16). The checks for 26 and 27 separated a pass from a fail there, so 27 is MUST. The check for 22 found no real violation, so 22 stays SHOULD. Raise a rule to MUST only after a codebase with an instance shows that the check separates a pass from a fail.

Helper-generated markup. A grep for a tag (`<input`, `<label`, `disabled=`) finds nothing in a codebase whose forms come from a helper (Haml `simple_form`, Rails `f.input`, Phoenix `<.input>`, JSX field components). There, zero hits is not a pass: grep the helper calls instead. Measured: the UX-STATE-27 tag grep returned 0 on Mastodon, which has 200 `f.input` calls (followup-q2).

### A. View states

**UX-STATE-01 (MUST).** Give every view that reads an async data source a loading, an empty and an error branch, each reachable in a fixture named `<view>-<state>`.
- Rationale: agents write the happy path. A blank or ambiguous panel hides system status, which [NN/g (2021-09-19)](https://www.nngroup.com/articles/empty-state-interface-design/) names as an empty state's first job.
- Verify: for each view file with `fetch(`, `invoke(`, `postMessage(` or a query hook, run `git ls-files '*fixtures*' '*goldens*' | grep -cE '<view>-(loading|empty|error)'`. A result below 3 fails. A fetch with no rejection branch in the same file fails (UX-STATE-03).

**UX-STATE-02 (MUST).** Show empty-state copy only after the fetch has settled with zero items. Never branch on `items.length === 0` alone while `items` starts as `[]`.
- Rationale: "no items" shown during loading makes users decide the content does not exist and stop waiting ([NN/g, 2021-09-19](https://www.nngroup.com/articles/empty-state-interface-design/)).
- Verify: render with a fetch that never resolves and assert that no empty-state text appears. Reading check: the expression that selects the empty branch mentions a settled or status flag.

**UX-STATE-03 (MUST).** Render a failure as an error state. A failure must never look like an empty view, an unchanged but dead view, or a `console.error` only.
- Rationale: where user content should appear, a generic empty state reads as data loss ([Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/), source last changed 2024-07-11). A dead control with no message is worse.
- Verify: `grep -rnE -A3 'catch *\(' src | grep -B1 -A2 'console\.(error|warn|log)'`, then read each hit. A `catch` whose only effect is a console call fails. Force a rejected fetch in a test: the output contains the error marker and not the empty marker.

**UX-STATE-04 (MUST).** Make an error state name the problem class (network, permission, configuration, server or tool) and offer one recovery control: Retry, or the fixing action.
- Rationale: an error with no next step is a dead end ([Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/), source last changed 2025-03-12; [Primer empty states](https://primer.style/product/ui-patterns/empty-states/), 2025-02-05). UX-TEXT owns the wording.
- Verify: on each error fixture, `grep -ciE '<button|<a href|retry|try again' <fixture>` must be at least 1.

**UX-STATE-05 (MUST).** Announce pending, result and failure without moving focus.
- Use `role="status"` (polite) for progress and success, and `role="alert"` only for errors and other urgent text.
- Put the container in the DOM at load. Inject the text later.
- Give a group of skeletons one announcement, not one each.
- Rationale: [WCAG 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), Level AA (Understanding page updated 2026-10-04). An `alert` on non-urgent text is a listed failure. A container inserted together with its text is often not announced ([MDN alert role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role), modified 2026-09-28).
- `aria-busy` announces nothing. It never satisfies this rule on its own.
- Verify: on every loading, error and partial fixture, find the element that holds the state text (the loading label, the error message, the partial summary). In a component or Playwright test, `el.closest('[role="status"],[role="alert"],[aria-live]')` must not be null. A live region elsewhere in the fixture does not count, and neither does `aria-busy`. Pre-filter for golden files: `grep -cE 'role="?(status|alert)|aria-live' <fixture>` of 0 fails at once. `grep -rn 'role="alert"' src`, then read each hit: an alert on a success or "Saved" message fails. axe does not prove this rule (Verdict item 2).

**UX-STATE-06 (MUST).** Give every empty state a heading that names the thing, one line on why it is empty or how items arrive, and at most one primary action.
- Keep first-use and no-results apart. A no-results state names the active query or filter and offers to clear it.
- An empty view with no query or filter never says "match".
- Rationale: [Primer empty states](https://primer.style/product/ui-patterns/empty-states/) asks for a heading and "one primary link or action", and separates not-yet-used from temporarily empty. [Carbon](https://carbondesignsystem.com/patterns/empty-states-pattern/) forbids dead ends.
- Verify: render each empty fixture with query `""`. `grep -ciE 'match' <fixture>` must be 0. The fixture contains a heading element and exactly 1 primary `button` or `a`.

**UX-STATE-07 (SHOULD).** Where data is paged, capped or user-generated, add the states that data needs. (Stale data moved to UX-STATE-34.)
- Partial: says what is shown and what is missing, and offers to retry the missing part.
- Overflow: long strings wrap or truncate, with the full text reachable. A capped list says that it is capped, with a count and a way to reach the rest.
- Rationale: [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) bans "undefined of undefined" counts and asks that failed sections be replaced in place. On two second codebases, the old bare `cursor` trigger matched 254 lines in a canvas app with none of them paging, and 11 of 14 lines in an extension were editor cursors or CSS. Caps written as number literals also exist ([followup-q1.md](ux-interface-states/followup-q1.md)). The sample is 2 codebases with 1 confirmed literal cap, so the rule stays SHOULD.
- Verify. Each trigger decides which fixture is required:
  - Paged source: the view or its data module matches `grep -nE 'hasNextPage|endCursor|nextPageToken|hasMorePages|per_page|pageInfo|nextPage|pageToken|[?&](page|offset)=|PAGE_SIZE|[Pp]age[Ss]ize|page_size|[Pp]aging'`. Do not search for the bare word `cursor`: it matches text-editor and mouse cursors. This grep filters data modules; it does not find views. For each matched file, read whether it renders a partial list or only fetches. A `do { … } while (hasNextPage)` loop fetches every page and shows no partial state. A `<view>-partial` fixture must exist for each view that renders a list from a page source that can stop early.
  - Capped list: the render path matches `grep -nE '\.slice\(0, *([A-Z][A-Z_]{2,}|[0-9]{2,})\)'`. Drop the hits on hashes, buffers, versions and string truncation by reading. The sliced array must reach a rendered list. A `<view>-capped` fixture must exist, and the view must say that it is capped, with a count. Fleet pass: `X:views/sidebar.ts:1399-1400` (`MAX_POST_CARDS`, `Showing 4 of 4+`). Second-codebase fail: `webviews/components/sidebar.tsx:357` in `microsoft/vscode-pull-request-github` at `c9891f1` caps an avatar list at 10 with no count in the lines read. This grep does not find a cap written with `.splice`, `.take` or a loop with `break`.
  - Any list view: a stress render with a 500-character unbroken string and 5000 rows shows no horizontal page scroll.
  - Then `git ls-files '*fixtures*' '*goldens*' | grep -E '<view>-(partial|capped)'` must list each required fixture.

**UX-STATE-34 (CONSIDER).** Where a view renders data read from a cache, show the data's age and a refresh action. (Placed here beside UX-STATE-07, which held this clause before the revision.)
- Rationale: a cached view with no age reads as current. The only source is [Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) (source last changed 2024-07-11), which puts a global issue in a warning banner, plus the fleet's own `synced N min ago` pattern. The offline source the dive tried returned 404, so this is the weakest row in the state matrix ([empty-error-notification.md §2](ux-interface-states/empty-error-notification.md#2-the-state-matrix)).
- Verify: trigger: the view's data module matches `grep -nE 'syncedAt|lastSynced|lastFetched|fetchedAt|staleTime'`, and the matched value is rendered or reaches a rendered component (read each hit). Some fixture of that view then contains a timestamp or an age phrase and a refresh control. Do not trigger on `cache`, `globalState.get` or `localStorage.getItem`. On two second codebases, the bare word `cache` matched 454 and 601 lines, and the storage reads matched preferences, flags and drafts, not cached remote data ([followup-q1.md](ux-interface-states/followup-q1.md)). The trigger is weak. It finds a cache-age field only when the code names it with one of these tokens, and remote data stored under another name goes unseen (measured: `stateModifiedTime` in the PR extension's `issues/stateManager.ts`). Fleet hit: `X:catalog.ts:44,206` (`syncedAt`).

### B. Waits and repeat activation

**UX-STATE-08 (MUST).** In the handler of every async action, before the first `await`, `postMessage` or `fetch`, set a local pending flag. The flag must (a) change the control visibly in the next paint and (b) make a second activation return at once. Clear it in `finally`.
- A guard that waits for a host or server message to set "busy" fails.
- Rationale: a control that waits for a round trip looks dead and accepts a second click. "Trap multiple clicks" ([Tognazzini, 2014-03-05](https://asktog.com/atc/principles-of-interaction-design/)). [INP](https://web.dev/articles/inp) counts the next paint, with 200 ms at p75 as the field gate (updated 2025-09-02). INP measures acknowledgement only, never loading.
- Verify: a test replaces the transport (`fetch`, `postMessage`, the IPC `invoke`, or the project's send function) with a spy, fires the activation twice in the same tick, and asserts the spy was called exactly once. Fleet instance: a spy on the webview's `host.send`, in a test next to `X:test/actions.test.ts`. Reading check: `grep -nA8 "addEventListener('click'" src`. Pass: a state write precedes the first `await` or `postMessage`. Fail: the guard is `busy !== null`, where `busy` is set only by an inbound message.

**UX-STATE-09 (SHOULD).** While the action is pending, keep the initiating control focusable, with `aria-disabled="true"` and its original label plus a spinner or "Saving…".
- `disabled` or `inert` is allowed on the form's other fields.
- If the focused control is made `disabled` or `inert`, move focus back to a labelled anchor when the action settles.
- Never pre-disable for invalid input. That is UX-STATE-21.
- Rationale: `disabled` on the pressed button resets focus ([Primer button, source last changed 2024-10-28](https://primer.style/product/components/button/accessibility/)). The resolution is in Verdict item 6.
- Verify: `grep -nE "\.disabled *= *true|setAttribute\('disabled'|\?disabled=|\binert\b" src` on a pending path. Each hit either sits on a non-initiating field, or has a `.focus()` in the settle branch.

**UX-STATE-10 (MUST).** Choose the indicator from the ladder in Verdict item 3 (scope and expected wait), and write the 1000 ms show-delay in code.
- A `Suspense` fallback does not count as a delay.
- A process (upload, install, update-all) shows a bar, never a skeleton.
- The pending state on the pressed control (UX-STATE-08) is exempt from the delay.
- Rationale: under 1 s an indicator flashes and reads as slower ([Primer loading](https://primer.style/product/ui-patterns/loading/); [NN/g skeletons](https://www.nngroup.com/articles/skeleton-screens/)). React documents no show-delay ([React](https://react.dev/reference/react/Suspense)). The 1000 ms value is design-system guidance and Nielsen's 1 s limit, matched by TUI-23 and the fleet sidebar. No measurement in this program tested it, so it is a convention that makes the check decidable, not a measured threshold.
- Verify: `grep -rnE "loading *= *true|setLoading\(true\)|isLoading|phase: *'loading'" src`, then read each hit. Pass: the region indicator appears behind a `setTimeout(…, 1000)` (or a named constant equal to 1000). A skeleton component used on an upload or install path fails. `grep -rn '<Suspense' src`: each boundary pairs with a stated delay or a transition.

**UX-STATE-11 (MUST).** Make a skeleton take the exact box of the content it stands for, with content-shaped placeholders. It must never be frame-only, and the real content replaces it in place.
- Rationale: layout shift when content arrives. NN/g: a frame-only skeleton "should not be used" as a progress indicator ([NN/g skeletons](https://www.nngroup.com/articles/skeleton-screens/)).
- Verify: CLS is 0 in the page test across the loading-to-ready swap. Reading check: the skeleton slot sits next to the component and has equal height or a reserved `min-height`. Pass example: the required `skeleton` slot in `@ocx-sh/theme` `components/Deferred.astro:32-50`.

**UX-STATE-12 (MUST).** On refresh, keep the content already painted. Show a refreshing cue after 1 s and mark stale content as stale. Never swap painted content for a skeleton or spinner.
- Rationale: hiding revealed content is the flash that transitions exist to avoid ([React](https://react.dev/reference/react/Suspense)).
- Verify: on each reload path, `grep -nE 'set\w*\((null|\[\])\)|data *= *(null|\[\])' src` before the fetch fails. In React, the refetching update sits in `startTransition` or reads `useDeferredValue`. Pass example: `vscode/src/webview/sidebar/main.ts:1245-1258`.

**UX-STATE-13 (SHOULD; untested, see the note above).** Derive every determinate progress value from a counter of work done (bytes, items, steps). Never derive it from a timer or a constant.
- Rationale: a bar that moves on a timer is fake. [NN/g progress indicators (2014-10-26)](https://www.nngroup.com/articles/progress-indicators/) shows determinate progress as counts ("Updating address 3 of 50").
- Verify: in any file that sets a progress `value`, `aria-valuenow` or `progress.report({increment})`, `grep -nE 'setInterval|setTimeout'`, then read: an increment inside a timer callback with no count behind it fails. `grep -rnE '(value|aria-valuenow)=\{?["'\'']?[0-9]+' src` flags hard-coded percentages.

**UX-STATE-14 (MUST).** Give every network or child-process wait a deadline and a visible failure path: `AbortSignal.timeout(n)` on `fetch`, a timeout on the process runner, and an error state with Retry when it fires.
- Rationale: a wait with no deadline is an indicator that can spin forever, which breaks the 10 s tier.
- Verify: `git grep -nE '\bfetch\(' -- src`. Each call passes `signal`, or its caller is shown to bound it. Pass example: `@ocx-sh/theme` `components/ui/fetch-html.mjs:8,30` (10 s).

**UX-STATE-15 (MUST).** For any operation whose deadline exceeds 10 s:
- show determinate or staged progress;
- offer a cancel control that stops the work;
- (SHOULD) show a link to details or logs. Only the VS Code page sources this clause: "Show a link to see more details (like logs)" ([VS Code notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications), page date 2026-11-25). A missing link does not fail the MUST.
If cancelling is unsafe, put a `not cancellable: <reason, owner decision>` comment at the call. An AI or other open-ended call offers stop from its first indicator. In VS Code, this means `window.withProgress({location: ProgressLocation.Notification, cancellable: true})`, plus a handler on `token.onCancellationRequested` that kills the child process.
- Rationale: past about 10 s, Nielsen asks for percent-done and "a clearly signposted way for the user to interrupt" ([NN/g, 2014 update](https://www.nngroup.com/articles/response-times-3-important-limits/)). The VS Code API offers cancel and discrete progress only on `Notification` ([API](https://code.visualstudio.com/api/references/vscode-api.md), fetched 2026-11-27). The resolution is in Verdict item 7.
- Verify: list the deadlines with `grep -rnE '_TIMEOUT_MS *= *[0-9_]+|AbortSignal\.timeout\(' src` and keep those over 10000. Each wrapped call either has `cancellable: true` or an `AbortController` wired to a visible control, plus a handler that stops the work, or it has the `not cancellable:` comment.

**UX-STATE-16 (SHOULD).** Make a network mutation safe to repeat on the server. Either send an idempotency key that the server honours, or document why the endpoint is naturally idempotent.
- Rationale: a client guard cannot stop a retry after a lost response, and GOV.UK asks for server-side protection too ([GOV.UK button](https://design-system.service.gov.uk/components/button/)). The `Idempotency-Key` header is still an Internet-Draft, version 09, dated 2026-11-21, which expires 2027-05-25 ([IETF](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)). Cite it as a draft.
- Verify: `grep -rnE "method: *['\"](POST|PUT|PATCH|DELETE)" src`. Each hit has `Idempotency-Key` nearby or a comment that names the server-side guarantee.

### C. Message channels

**UX-STATE-17 (MUST).** Never put an error, or a fact the user needs to finish the task, only in a transient message (a toast or an auto-dismissing notice). Never auto-dismiss an error. Where a product uses toasts at all (SHOULD NOT, Verdict item 11), each toast:
- has a dismiss control;
- has at most two lines and one action;
- is announced politely;
- can be reached again somewhere else.
- Rationale: [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), Level A (Understanding page updated 2026-08-10), exempts a timed message only when the information is available another way. [Carbon](https://carbondesignsystem.com/components/notification/usage/) sets the two-line and close-button limits.
- Verify: `grep -rnE -B3 -A3 'setTimeout' src | grep -iE 'toast|notif|snackbar|flash'`. A timer on error severity, or a timed message with no other path to its content, fails.

**UX-STATE-18 (MUST for new code).** Do not show a visual message that only confirms an action whose result the user can already see (copy, add, create, store).
- On the web, announce it through `role="status"`.
- In VS Code, use the inline state change or `setStatusBarMessage(text, ms)`, never `showInformationMessage`.
- Rationale: "only when absolutely necessary" ([VS Code notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications), page date 2026-11-25). Use success messaging "sparingly" ([Primer notification messaging](https://primer.style/product/ui-patterns/notification-messaging/)).
- Verify: on the diff, `git diff -U0 | grep -nE '^\+.*showInformationMessage\((["'\''`][^"'\''`]*["'\''`])\)'` finds message-only calls. Each hit with a user-triggered cause fails. On the web, a toast or banner on an action whose result is on screen fails.

**UX-STATE-19 (SHOULD).** Show at most one banner per page, placed before the `h1`. Never use a banner for validation errors, which belong to the field and the error summary.
- Rationale: [GOV.UK notification banner](https://design-system.service.gov.uk/components/notification-banner/) says to avoid more than one and lists validation banners under "Do not". Users miss banners.
- Render every banner through one named component: the design system's (GOV.UK root class `govuk-notification-banner`, Primer React `Banner`) or one house component. Record its name in the component's own file header.
- Verify: on each rendered route, count that component: `grep -cE '<Banner\b|govuk-notification-banner"' <route output>` (substitute the house component's tag or root class). The count is at most 1. `grep -lE '<Banner\b|govuk-notification-banner' <form files>` must be empty. A banner built outside the named component fails on reading.

### D. Forms

**UX-STATE-20 (MUST).** Give every input, select, textarea and custom field element an accessible name from a visible `<label for>`, a wrapping `<label>` or `aria-labelledby`. Use `aria-label` only for search fields and icon-led controls. A placeholder is never the name.
- Rationale: [WCAG 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), Level A. 51% of home pages have unlabelled inputs ([WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30). UX-A11Y must not restate this rule. It cites this ID instead.
- Verify: `grep -rnE '<(input|textarea|select|vscode-textfield|vscode-text-area)\b' src | grep -vE 'type="(hidden|submit|button)"|aria-label=|aria-labelledby='`, then read each hit for an enclosing `<label>` or a `for` that matches its `id`. On built pages, axe `label` is a second check, not the only one.

**UX-STATE-21 (MUST).** Never disable a submit control because the form is invalid or incomplete. Leave it enabled, validate on press, and show the errors (UX-STATE-23, 24).
- Rationale: a disabled button cannot be focused, has low contrast and says nothing about what is wrong ([GOV.UK button](https://design-system.service.gov.uk/components/button/); [Silver, 2023-05-14](https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/), practitioner opinion). This is the tutorial pattern agents copy.
- Verify: `grep -rnE '(\?|:|\[)?disabled[^=]*= *["{]?\$?\{?[^}"]*!\s*\w*[Vv]alid|disabled=\{!\w*(valid|Valid|complete)' src` must return nothing. Pass: `?disabled="${saving}"`.

**UX-STATE-22 (SHOULD; no real violation found yet, see the note above).** Judge every field on submit. Never validate on focus, on the first keystroke of an empty field, or on a fixed-length value before it reaches full length.
- A non-empty field with a format rule may also validate on blur.
- Once a field shows an error, clear it on the keystroke that fixes it.
- Live validation is only for password strength, availability checks, character counts, and input that cannot become valid (a letter in a digits-only field).
- Rationale: GOV.UK says to wait for the submit and to "avoid validating the information in a field before the user has finished entering it", because it "can cause problems - especially for users who type more slowly" ([GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/), undated, fetched 2026-11-27). The blur clause is a MAY: the four sources disagree on it (Verdict item 10).
- Verify: `grep -rnE "(addEventListener|\bon)\(\s*['\"](focus|focusin|keydown|keyup|input)['\"]|^\s*['\"](focus|focusin|keydown|keyup|input)['\"],\s*$|oninput|onInput|onKeyUp|onFocus|onChange" src -A30 | grep -E 'setCustomValidity|aria-invalid|reportValidity|setError|error'`, then read each hit. The `\bon(` branch catches a project's own event helper, the line-only branch catches a prettier-split call, and `-A30` reaches an error set many lines below the event name. A handler on an empty field, or on the first keystroke, that sets a visible error or `aria-invalid="true"` fails, unless it is one of the listed live cases. A handler that only calls `setCustomValidity` and shows nothing until submit passes, with a comment. Blur handlers skip empty values (`if (!value) return`). Expect noise: 10, 28 and 27 hits on Gitea, Mastodon and Plausible, all read, 0 real violations. The old pipeline (`… | grep -i valid`) returned 0 on Gitea and Mastodon, a false pass ([followup-q2.md](ux-interface-states/followup-q2.md) Measurement 4).

**UX-STATE-23 (MUST).** Render each field error as text next to its field, after the label and hint. Tie it to the input with `aria-describedby`, and set `aria-invalid="true"` only after validation has failed. Never carry an error by colour, icon, tooltip or `title` alone.
- Rationale: [WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), Level A (updated 2026-11-02). Do not set `aria-invalid` on load ([MDN aria-invalid](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid), modified 2026-11-16).
- Verify: every element with an error class or `role="alert"` near a field has an `id` that appears in some input's `aria-describedby`. `grep -rn 'aria-invalid="true"' src` must not hit a static template, only a failure branch.

**UX-STATE-24 (MUST).** After a failed submit, move focus exactly once.
- A form with two or more fields first shows an error summary ("There is a problem") above the form. It lists each error as a link to its field and receives the focus.
- In a webview with no page reload, focus goes to the summary, the first invalid field, or a labelled `tabindex="-1"` anchor above the error.
- A blur error never moves focus. UX-STATE-35 carries the test for this clause.
- Rationale: [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/) (focus guidance clarified February 2025). The summary supplements field errors and never replaces them ([NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)).
- Verify: a test (Playwright or a DOM test) adds a `focusin` listener on `document`. It focuses the form's submit control, clears the log, and activates the control with the keyboard (Enter). Do not use a mouse click: it adds a focus event that the application did not cause. Do not start the log after the activation: a focus move made inside the submit handler is then lost, and correct forms fail. The test waits for the application's settle signal (the saving state cleared, or the error element present), then one animation frame. A fixed wait fails a late but correct form and passes a form that has not yet made a wrong second move. The failed submit comes from an invalid form. Where the submit control is disabled while the form is invalid (itself a UX-STATE-21 failure), it comes from a rejected host or server reply. Then assert both clauses: exactly one `focusin` was recorded, and `document.activeElement` is the error summary, the first invalid field in DOM order, or the labelled `tabindex="-1"` anchor. A count-only check passes a form that returns focus to the pressed button. Do not count `.focus()` calls in source; a helper called in a loop hides the real count. `grep -rnE 'error-summary|There is a problem' src` is non-empty for each form with two or more fields. The focus test cannot detect a missing summary, so this grep is not optional. Single-input surfaces (`showInputBox`, one-row commits) are exempt. Measured: this protocol scored 12 forms built to pass or fail, and 4 mutations of the fleet registry form, correctly in Chromium. Only Chromium ran ([followup-q0.md](ux-interface-states/followup-q0.md)).

**UX-STATE-35 (SHOULD; untested on product code, see the note above).** Never move focus from a blur or change handler. Show a field error found on blur beside the field, and leave focus where the user's next action put it. (Placed here beside UX-STATE-24, whose blur clause it tests.)
- Rationale: UX-STATE-24 states "A blur error never moves focus", but its submit test does not check it. A handler that refocuses the field it has just left traps a keyboard user. Measured on a built fixture: after Tab, a handler that refocuses the field records 2 `focusin` events and ends on the invalid field; a correct handler records 1, on the next field ([followup-q0.md](ux-interface-states/followup-q0.md), Measurement B, "Blur"). No external source was fetched for this rule. It rests on that measurement and on the GOV.UK clause cited by UX-STATE-22.
- Verify: a test types an invalid value into a field that has a blur rule, presses Tab, and asserts exactly one `focusin`, on the next focusable element in DOM order. Reading check: `grep -rnE "addEventListener\(['\"](blur|focusout|change)['\"]|onBlur|onChange|@blur|@change" src`, then read each hit. A `.focus()` or `.select()` call reachable from the handler fails.

**UX-STATE-25 (MUST).** Never discard what the user typed when a submit fails. Keep every value and every radio, checkbox and select state, except a secret field that the owner has decided to clear.
- Rationale: GOV.UK, in a January 2024 change: "Do not clear any form fields when showing the Error message component. Keep both passing and failing answers" ([GOV.UK error message](https://design-system.service.gov.uk/components/error-message/), fetched 2026-11-27), and "show them the page again, with the form fields as the user filled them in" ([GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/)). Supporting: [WCAG 3.3.7 Redundant Entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html), Level A (updated 2025-09-17), is about not asking again for information already given in the same process. Its Understanding page lists re-population after an error as a compliant example. It is not the origin of this rule.
- Verify: `grep -rnE 'form\.reset\(|\.reset\(\)|draft *= *(empty|default|initial|\{\})' src` must not hit a failure or `finally` path. Where users type into a web component, bind the `.value` property (`.value=` in lit), not the attribute.

**UX-STATE-26 (SHOULD).** Mark the minority kind of field in the label text: "(optional)" by default. Set the native `required` attribute on required controls. Never use colour or a bare asterisk as the only marker, and use one convention per product.
- Rationale: GOV.UK bans asterisks ([question pages](https://design-system.service.gov.uk/patterns/question-pages/)). NN/g accepts them ([NN/g, 2019-06-16](https://www.nngroup.com/articles/required-fields/)). The convention is the owner's choice, and the check is consistency.
- Verify, for the whole product:
  - `grep -rlE '\(optional\)' src` lists the files with optional markers.
  - `grep -rlE '\(required\)|>\s*\*\s*<|<abbr[^>]*>\*</abbr>' src` lists the files with required markers.
  - Both lists non-empty fails: the product uses two conventions.
  - A form with both required and optional fields, and with no hit in either list, fails.
  - Each field marked as required by the convention also has the `required` attribute (read each hit).
  - Run `grep -rnE "content: *[\"']\\*[\"']" --include='*.css' --include='*.scss' --include='*.sass' <css dirs>`. A hit on a required-field selector fails, unless the same label also carries a text marker. A marker made in CSS is invisible to the two lists above (Gitea: `web_src/css/modules/form.css:213-216`).
  - List every renderer of field labels (a component, a template helper, a CSS rule). Two renderers that mark the optional kind differently fail (Mastodon: the React wrapper writes "(optional)", the Haml renderer writes nothing).
  - Both lists carry false hits (template doc comments, wildcard documentation), so read each one. Reference instances: pass Plausible `ip_rules.ex:183`; fail Gitea `form.css:216`; fail Mastodon, two renderers ([followup-q2.md](ux-interface-states/followup-q2.md) Measurement 3).

**UX-STATE-27 (MUST).** Set a standard `autocomplete` token on every field that collects data about the user (name, email, username, passwords, one-time codes, address). Use `autocomplete="off"` only for CAPTCHA and one-time-token fields, with a comment. Never invent a token to defeat autofill.
- Rationale: [WCAG 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), Level AA (updated 2026-09-08). `off` does not stop password managers ([MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete), modified 2026-08-27).
- Verify, tag sources: `grep -rnE '<input[^>]*(type="(email|tel|password)"|name="(user_?name|uname|username|login|email|full_?name|phone|tel|address|street|city|postal|zip|country|otp|passcode)")' <template dirs> | grep -v 'autocomplete=' | grep -v '^<admin dir>'`. Read each hit. Keep those that collect data about the person using the form, not another service's credentials, a webhook field or a read-only value. Each kept hit fails. Then list `grep -rnE '<input[^>]*autocomplete="off"' <template dirs>`. Each hit on a field about the person needs a comment, or it fails.
- Verify, helper sources (Haml `simple_form`, Rails `f.input`, Phoenix `<.input>`, JSX field components): a count of 0 from the tag grep is not a pass. Run `grep -rlE '<person-data field helper pattern>' <view dir> | xargs grep -L autocomplete`, and read each file. Mastodon's pattern: `\b(f|ff|form)\.input :(username|email|display_name|current_password|password|password_confirmation|otp_attempt)\b`. Plausible's pattern: `f\[:(email|name|full_name|username|password)\]`. Then run `grep -rn "autocomplete: 'off'\|autocomplete=\"off\"" <view dir>` and read each hit, because one file can carry a token on one field and `off` on another.
- Reference instances (open-source code, read 2026-11-27, [followup-q2.md](ux-interface-states/followup-q2.md)): pass Gitea `templates/user/auth/signup_inner.tmpl:32,36` at `e77c1c2`; fail Gitea `signup_inner.tmpl:22,26`; fail Mastodon `app/views/auth/registrations/new.html.haml:24` at `e639273` (`off` on the sign-up username). The check found 11, 3 and 3 real fails on Gitea, Mastodon and Plausible.

### E. VS Code native surfaces

**UX-STATE-28 (MUST).** Give a `showInputBox` whose value has a format rule a `validateInput` that returns an `InputBoxValidationMessage` with Error severity for values that cannot work. Set `ignoreFocusOut: true` when the value is long, secret or costly to retype.
- Rationale: Error severity blocks accept natively ([vscode.d.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts), main, fetched 2026-11-27). Without it, a bad value fails later as a notification, and the typed text is lost.
- Verify: `git grep -n showInputBox -- src ':!src/test'`, then `grep -A12` at each hit for `validateInput` and `ignoreFocusOut`.

**UX-STATE-29 (MUST).** Show every host-side wait of 1 s or more on a native progress surface.
- For 1 to 10 s, and for background work, use one shared status-bar item labelled with the operation (`$(sync~spin) <Product>: <operation>`). Use theme colours only.
- Past 10 s, use UX-STATE-15.
- Rationale: the [status-bar guideline](https://code.visualstudio.com/api/ux-guidelines/status-bar) (page date 2026-11-25) recommends a loading-icon item for background work. It also says: do not add more than one item, and do not add custom colours.
- Verify: each `await` on `execFile`, the CLI runner, `fetch` or a download inside a command handler sits inside `withProgress` or the project's progress wrapper. `git grep -c createStatusBarItem -- src ':!src/test'` totals at most 1, unless a comment justifies more. `git grep -nE 'statusBarItem\.(color|backgroundColor)' -- src` shows only `new ThemeColor('statusBarItem.(error|warning)Background')`.

**UX-STATE-30 (SHOULD).** Give every `showWarningMessage` and `showErrorMessage` an action that resolves the problem, or "Show Output", unless no action exists.
- Rationale: the [notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications) shows warnings and errors with resolving actions.
- Verify: `git grep -nE 'show(Warning|Error)Message\([^,]*\)' -- src ':!src/test'` lists message-only calls. Each hit needs a comment explaining why no action exists.

**UX-STATE-31 (MUST).** Show at most one notification per user action. Route every notification that a watcher, timer or event listener can fire through a dedupe helper.
- Rationale: "Show one notification at a time", and do not "Send repeated notifications" ([notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications)).
- Verify: count the `show*Message` calls reachable on one command path; more than 1 fails. Each `show*Message` inside an `on*` listener callback goes through the dedupe helper (this fleet: `notifyError({dedupe: true})`).

**UX-STATE-32 (SHOULD).** Give every recurring, non-error, unsolicited prompt a "Do not show again" action or a stored throttle.
- Rationale: "Add a Do not show again option for every notification" ([notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications)).
- Verify: each prompt fired from activation or a timer has a `globalState.update(` or `workspaceState.update(` of a skip key, or a time throttle, in the same function.

**UX-STATE-33 (SHOULD).** Do not add a webview panel or webview view unless the native API cannot do the job. Each new `createWebviewPanel` or `registerWebviewViewProvider` carries a comment saying why. Each `retainContextWhenHidden: true` carries a comment saying why `getState` and `setState` do not work.
- Rationale: "Only use webviews when absolutely necessary" ([webviews guideline](https://code.visualstudio.com/api/ux-guidelines/webviews)). `retainContextWhenHidden` "has high memory overhead" ([webview guide](https://code.visualstudio.com/api/extension-guides/webview)).
- Verify: `git diff -U0 | grep -nE '^\+.*(createWebviewPanel|registerWebviewViewProvider|retainContextWhenHidden: *true)'`. Each hit has a comment within 3 lines above it.

### Change request against the catalog (owned there)

- **CR-1 (TUI-23, `skills/rust-quality-reference/tui.md:124`).** Add "prefer a determinate indicator from about 3 s when the work is countable", so that the web and terminal ladders read the same. CLI-16 and CLI-08 stay as they are ([loading-and-progress.md §2.3](ux-interface-states/loading-and-progress.md#23-alignment-with-the-catalog)).

## Applied to the fleet

Paths: `X:` = `grimoire-rs/vscode/src/` at `9230dcd` (committed 2026-11-24). `T:` = `ocx-sh/website/packages/theme/src/`. `G:` = `grimoire-rs/grim-gui/src/`. Evidence comes from the dives and `product-audit/ui-code-posture.md`. Lines marked "re-read" were confirmed against source on 2026-11-27.

| Rule | Status | Evidence |
|---|---|---|
| 01 | violated | `G:main.ts:11-22`: no loading branch, the root stays empty until `invoke` resolves (`ui-code-posture.md` §1). |
| 01 | satisfied, house pattern | The extension keeps one golden per state: `results-loading-*`, `results-browse-ready-empty`, `results-error`, `browse-paged-partial`, `browse-paged-capped`, `details-error`, `settings-error` (re-read `git ls-files \| grep goldens`). |
| 03 | violated | `T:components/ui/DataTable.astro:198` (re-read): a start failure goes to `console.error` only, and the table stays visible but inert. |
| 04 | violated | `X:webview/render.ts:1177`, `X:webview/render.ts:2049`, `X:webview/settings/render.ts:656` (re-read): bare `<div class="error-state">` with the raw text `grim exited with status 1`, no role and no retry. Fixtures: `results-error`, `details-error`, `settings-error`. |
| 04 | satisfied | `T:components/Deferred.astro:32-50`: `role="alert"`, `Could not load this.` and a Retry button. `X:webview/render.ts:1221`: paging failure with Retry. `results-no-grim`: install action. |
| 05 | violated | 6 fixtures score 0 on `grep -cE 'role=\|aria-live\|aria-busy'` (measured before `aria-busy` was dropped from the check; a 0 on the wider pattern is also a 0 on the narrower one): `results-error`, `details-error`, `settings-error`, `results-loading-with-default-registry`, `settings-loading`, `details-skeleton-loading`. `G:view.ts:23-30`: the error view has no role. |
| 05 | satisfied | `X:webview/render.ts:1219`: the paging summary uses `role="status"` with `aria-busy`. `X:webview/settings/render.ts:522`: `role="alert"` on the registry save error. |
| 06 | violated | `results-browse-ready-empty` renders `Nothing matches “” across 1 registry.` with an empty query. `T:components/ui/DataTable.astro:58`: the default `No rows match the filter.` also appears on a table with no filter. `T:components/ui/List.astro:55`: `Nothing to show.` with no heading and no action (re-read). |
| 07 | satisfied | `browse-paged-partial` (`Loading 4 of 12,000…`) and `browse-paged-capped` (`Showing 4 of 4+ in 2 registries`, with cause and remedy) exist (re-read `git ls-files \| grep goldens`). The capped trigger grep hits `X:views/sidebar.ts:1399-1400` (`MAX_POST_CARDS`, defined at `X:webview/protocol.ts:23`), which the capped fixture covers. The revised capped grep returns 7 lines in the extension. The other 5 (`X:gatePrompt.ts:171`, `X:views/sidebar.ts:505,940,1185,1287`) were not read in this revision. The revised paging trigger reaches the paged source through `PAGE_SIZE` and `[Pp]aging` (111 lines in 9 files). The follow-up's token list alone returns 0 lines here (Verdict item 16). |
| 34 | satisfied | The stale footer `Catalog cache · synced 12 min ago` with `Refresh catalog` renders in the `results-browse-ready-empty` fixture. There is no separate `-stale` fixture, and the CONSIDER rule does not need one. |
| 08 | violated | `X:webview/details/main.ts:223` (re-read) refuses a click only when `busy !== null`, and `busy` is set only by the host message (`main.ts:402-405`). `main.ts:243` posts `install` without setting a local flag. The sidebar has the same shape (`sidebar/main.ts:741,780`). The settings webview has no guard at all (`X:webview/actions.ts:21`: "busy guard, so nothing there is protected"). The host refcounts concurrent runs instead of refusing them (`X:notify.ts:52-70`). |
| 08 | partial | `X:webview/actions.ts` classifies all actions (10 `true`, 22 `false`) under a drift test. Keep it, and add the double-fire test. |
| 09 | partial | The registry form disables its submit button while saving and makes the form `inert`, which drops focus to `body`. It restores focus to `.form-title` (`X:webview/settings/render.ts:515-517`, `settings/main.ts:316-320`). That meets the focus clause. |
| 10, 12 | satisfied | `X:webview/sidebar/main.ts:1245-1258`: refresh keeps painted results and shows the footer cue after 1000 ms. |
| 11 | satisfied (by reading; CLS not measured) | `T:components/Deferred.astro:33-34` (re-read) throws when the `skeleton` slot is missing, and `:46-47` renders it. The "same box as the real content" claim is the file's own comment (`:3`); no CLS run checked it. |
| 14 | violated (needs a caller trace) | 5 of 8 theme `fetch(` sites show no deadline at the call: `dependency-explorer.mjs:95`, `term-tip.mjs:28`, `terminal.mjs:286`, `shell-swap.mjs:69,149`. Satisfied at `fetch-html.mjs:30`, `deferred-group.mjs:21` and `dependency-explorer.mjs:391`. |
| 15 | violated | `X:grim.ts:532-533` (re-read): `REFRESHING_TIMEOUT_MS = 420_000` and `NON_REFRESHING_TIMEOUT_MS = 120_000`. All 11 `runWithStatusProgress` sites (listed in row 29) show a status-bar spinner with no cancel, no stage and no percent, and none carries a `not cancellable:` comment. |
| 18 | violated (existing code, owner call) | 13 message-only information toasts confirm visible results: `X:extension.ts:261,824,844`, `X:views/details.ts:730,734,1014`, `X:views/ratingAuth.ts:91,104`, `X:views/settings.ts:547,561`, `X:views/sidebar.ts:518,522,675`. `setStatusBarMessage` has 0 uses. |
| 20 | violated | The settings text and number rows have no `<label>`; the title is a `<span class="row-title">` (`X:webview/settings/render.ts:93-109,177-193`). The sidebar search has only a placeholder (`X:webview/render.ts:1144`). So does the chip input (`settings/render.ts:139`). |
| 20 | satisfied | The registry form uses wrapping `<label class="form-field">` elements (`settings/render.ts:563-590`). `T:components/ui/SearchField.astro:14` (re-read) declares a required `label: string` prop, and `:29-31` renders it in `<Label for={id}>`. |
| 21 | violated | `X:webview/settings/render.ts:584` (re-read): `?disabled="${saving \|\| !addRegistryDraftValid(draft)}"`. Measured in the bundled webview: with an invalid draft, Enter in a field posts nothing and shows no error, so the user gets no feedback (`{"posted":0,"focusin":[],"submitDisabled":true,"alerts":0}`, followup-q0 Measurement C). |
| 23 | violated | `.row-error` at `settings/render.ts:181` has no `id`, and its input has no `aria-describedby` or `aria-invalid`. The registry error is a single line above the buttons, not next to the failing field (`settings/render.ts:518-523`). |
| 24 | partial | The focus clause is met. It was measured on 2026-11-27 against the bundled settings webview at `9230dcd`: one `focusin`, on `.form-title`, reached by a rejected host reply, because the disabled submit blocks an invalid submit (followup-q0 Measurement C; focus code at `settings/main.ts:316-320`). Removing the focus call, adding a second focus and sending focus to the submit button each failed the test. The summary clause is violated: the registry form has several fields (`settings/render.ts:563-590`) but shows one error line above the buttons (`settings/render.ts:518-523`), with no "There is a problem" summary and no links to fields. |
| 25 | satisfied | The draft is kept in `addRegistry.draft`, and `.value` property binding is used (`settings/render.ts:95-102`). |
| 28 | violated | `X:extension.ts:275-278` (re-read): the pin-tag `showInputBox` has a placeholder but no `validateInput`. |
| 28 | satisfied | `X:views/ratingAuth.ts:115-124`: `validateInput` and `ignoreFocusOut`. |
| 29 | satisfied | 11 `runWithStatusProgress` call sites (re-read, `grep -rn runWithStatusProgress src \| grep -v /test/`, imports and the definition at `X:notify.ts:52` excluded): `X:extension.ts:255,733`, `X:views/sidebar.ts:616`, `X:views/pickVersion.ts:46`, `X:views/hookPrompt.ts:104`, `X:views/forceRetry.ts:67`, `X:views/details.ts:878,948`, `X:views/switchReplacement.ts:80`, `X:views/staleLock.ts:75,141`. One `createStatusBarItem` (`X:notify.ts:37`), with the label `$(sync~spin) Grimoire: <title>` (`X:notify.ts:54`). |
| 30 | violated | `X:views/details.ts:895` (warning, no action) and `X:notify.ts:97` (shared `notifyError`, no action). |
| 31 | satisfied | `notifyError({dedupe})` over 5000 ms (`X:notify.ts:97`). The update check is throttled to once a day (`X:extension.ts:620`). |
| 32 | violated | The install-grim prompt `X:extension.ts:235` has no opt-out. The update prompt has `skippedVersion` (`extension.ts:652`). |
| 33 | owner decision | One webview view backs the whole sidebar (`X:extension.ts:481`, `registerWebviewViewProvider('grimoire.marketplace', sidebar)`, re-read). No comment above that call says why a native view was not used, and the extension's `CLAUDE.md:34-43` describes the webview layout without recording a reason. The rule binds new calls only (its Verify reads the diff), so the existing call is an owner decision, not a violation. `retainContextWhenHidden` is unused, and a comment says why (`X:views/sidebar.ts:316-318`): satisfied. |
| 22, 26, 27 | new commitment, checked on non-fleet code | The fleet has no instance. The Verify commands ran on Gitea, Mastodon and Plausible (followup-q2): 27 found 11, 3 and 3 real fails; 26 passed Plausible and failed Gitea and Mastodon; 22 returned 10, 28 and 27 hits with 0 real violations. |
| 35 | new commitment, untested on product code | The fleet has no blur validator. The check ran only on a built fixture (followup-q0, `blur.mjs`). |
| 02, 13, 16, 17, 19 | new commitment, untested | The fleet has no instance yet, so these Verify commands have not run against any codebase (the note under "The ruleset"; 13 is SHOULD for that reason). There are no determinate bars with values, no toasts, no banners, no network mutations from web UI, and no forms that collect user data (`form-state-machine.md` §1; `ui-code-posture.md`: "The only real forms in the fleet are the docs search box and Grimoire's wizard radios"). grim-gui (74 lines, 0 controls) is a skeleton. Its future screens start under these rules. |
| third-party | not fleet code | The Pagefind search dialog on the Grimoire docs shows text at about 0.7 s and its first result at 2.27 s on Slow 4G. Selectors found no live region ([loading-and-progress.md §1.5](ux-interface-states/loading-and-progress.md#15-timing-three-real-actions-under-throttled-network)). A screen reader must confirm this before anyone files it upstream. |

## AI-agent failure modes

No benchmark scores agent code for missing states ([empty-error-notification.md §6](ux-interface-states/empty-error-notification.md#6-how-a-review-detects-a-missing-state)). The rank below is a judgement. It combines how often each failure appears in the fleet measurements with the dives' AI-agent tables. Within each mechanism, the most frequent failure comes first.

**Mechanism 1: the agent writes the happy path only (most frequent).**
1. `catch (e) { console.error(e) }` with no UI state, or no `catch` at all. Fleet: `DataTable.astro:198`, grim-gui. Rules 03 and 01.
2. One `items.length === 0` branch serves both "loading" and "empty". Rule 02.
3. Generic empty copy (`Nothing to show.`, `No data.`) with no action, or "no results for """ on an unfiltered list. Fleet: 3 sites. Rule 06.
4. The error state shows the raw tool message and no retry. Fleet: 3 render sites. Rule 04.

**Mechanism 2: async ordering is modelled wrong.**
5. The pending state is set after the `await`, or from the host's reply, so two clicks both send. Fleet: details and sidebar webviews. Rule 08.
6. `fetch` with no timeout, so the spinner can run forever. Fleet: 5 of 8 sites. Rule 14.
7. Every refetch replaces the list with a skeleton. Rule 12.
8. A long operation gets a spinner and no cancel, or `withProgress` without `cancellable`, or a token that is never wired to stop the child process. Fleet: 420 s deadline. Rule 15.

**Mechanism 3: tutorial patterns copied from training data.**
9. Submit is disabled until `isValid`. Fleet: `settings/render.ts:584`. Rule 21.
10. `showInformationMessage('Done')` after every command. Fleet: 13 sites. Rule 18.
11. A placeholder serves as the label. Fleet: 2 sites. Rule 20.
12. Validation runs on every keystroke from the first character. Rule 22.
13. `form.reset()` or a draft reset in `finally` after a failed submit. Rule 25.
14. `autocomplete="off"` everywhere, "to stop browser prompts". Rule 27.

**Mechanism 4: correct to the eye, wrong to assistive technology.**
15. A spinner or error with no text and no live region. It passes visual review and axe. Fleet: 6 fixtures. Rule 05.
16. `role="alert"` on everything, including "Saved", or a container injected with its text already inside, so nothing is announced. Rule 05.
17. Error text with no `aria-describedby`, or `aria-invalid="true"` baked into the template. Fleet: `settings/render.ts:181`. Rule 23.
18. `disabled` on the pressed button, so focus falls to `body`. Rule 09.

**Mechanism 5: miscalibrated indicators.**
19. A spinner on every request, including 80 ms ones. Rule 10.
20. Trusting `Suspense` to delay the fallback, because Vercel's text says it does. Rule 10.
21. A progress bar animated by `setInterval`. Rule 13.
22. A skeleton on an install or upload, or a frame-only skeleton. Rules 10 and 11.

**Mechanism 6: stale or wrong beliefs (least frequent, cheapest to fix).**
23. "Toasts are fine for errors." Training data predates Primer's "not recommended". Rule 17.
24. Treating INP as the loading budget. INP measures next paint only. Rule 08 wording.
25. Dating Nielsen's limits "2014". They are from 1993, with a 2014 update.

## What an agent must ask a human

- **Whether a long grim operation can be cancelled safely** (lock, half-written state). Rule 15 rests on this. Ask the CLI owner. Until they answer, write the `not cancellable:` comment rather than a cancel that leaves partial state.
- **Whether to remove the 13 existing confirmation toasts.** Rule 18 binds only new code. An owner may want the toasts kept as a trust signal.
- **Whether the sidebar stays a webview view or becomes a tree view plus a welcome view.** This is an architecture decision (rule 33).
- **Whether the product allows toasts at all.** This is a design-system decision (Primer forbids them, Carbon allows them).
- **Which required or optional convention the product uses** (rule 26).
- **Whether a password, token or one-time-code field is cleared after a failed submit.** This is a security call (rule 25).
- **Whether a mutation is idempotent on the server, and how long a key is kept.** Ask the API owner. Never send an `Idempotency-Key` that the server ignores (rule 16).
- **Any added delay,** whether to make an AI answer feel considered or to keep a spinner visible past 500 ms. One preprint (N = 240, [arXiv:2604.06183](https://arxiv.org/abs/2604.06183), 2026-02-09, not peer-reviewed) is not enough to justify one. The default is no delay.
- **The expected-wait class of an operation that has never been measured.** Measure it, or ask. Do not guess a class and pick the indicator from the guess.
- **Whether a system banner can be dismissed before the condition is resolved.** GOV.UK says this needs more research.
- **The persistence scope of "Do not show again"** (rule 32).
- **Whether stale data may be shown after an outage** when it is priced, regulated or security-relevant.

## Decay

| Rule(s) | Moving fact | Source and date | Refresh | How to re-check |
|---|---|---|---|---|
| 15, 29 | Only `ProgressLocation.Notification` shows cancel and discrete progress | [vscode-api.md](https://code.visualstudio.com/api/references/vscode-api.md), fetched 2026-11-27 | each `engines.vscode` bump, at least every 6 months | `curl -s https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts \| grep -n 'only ProgressLocation.Notification'` |
| 18, 29-33 | VS Code UX guideline text (one notification at a time, Do not show again, one status-bar item, limit webviews) | five guideline pages, page date 2026-11-25 | 6 months | open each page, then grep for the quoted Do and Don't lines |
| 28 | `InputBoxValidationSeverity.Error` blocks accept | `vscode.d.ts`, main, fetched 2026-11-27 | each engine bump | `grep -n 'will not be able to accept'` on the same file |
| 06, 07, 09, 10, 34 | Primer loading, button, empty-state and degraded-experience text | source commits 2024-07-03, 2024-10-28, 2025-02-05, 2024-07-11 | 12 months | `curl -s "https://api.github.com/repos/primer/design/commits?path=content/ui-patterns/loading.mdx&per_page=1"` (same call for each file); re-read the file if the date moved |
| 17 | Primer "toasts not recommended", Carbon persistent-by-default | Primer page undated; Carbon source 2025-06-30 | 12 months | re-fetch both pages |
| 05, 17, 20, 23-25, 27 | WCAG 2.2 SC 4.1.3, 2.2.1, 3.3.1, 3.3.2, 3.3.7, 1.3.5 | Recommendation 2024-12-12; Understanding pages updated 2025-09 to 2026-11 | 12 months, or when WCAG 3 reaches Candidate Recommendation | check https://www.w3.org/TR/WCAG22/ status and the Understanding pages' "Updated" line |
| 08 | INP: 200 ms good, 500 ms poor, p75 | [web.dev](https://web.dev/articles/inp), updated 2025-09-02 | 12 months | re-fetch and read the threshold table |
| 10 | React Suspense: a 300 ms reveal throttle, no show-delay | [react.dev](https://react.dev/reference/react/Suspense), undated | each React major release | re-fetch and search "300ms" |
| 16 | `Idempotency-Key` is Internet-Draft 09 | IETF, 2026-11-21, expires 2027-05-25 | by 2027-05 | https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ — check RFC status |
| 19, 24, 25 | GOV.UK banner, error summary and error message guidance | changelog entries to Jul 2026 | 12 months | re-fetch and read the "Changes" sections |
| 10, 15 (ladder) | Nielsen 0.1, 1 and 10 s; NN/g skeleton scope | 1993 with a 2014 update; 2023-06-04, reviewed 2026-09-02 | 24 months | re-fetch; look for a revised article |
| 15 (AI stop) | AI latency perception | arXiv preprint 2026-02-09 | 6 months | search for a peer-reviewed version or a replication |
| Applied table | fleet counts at `9230dcd` and the theme tree, plus the registry-form focus run in Google Chrome for Testing 159.0.8154.6 | measured 2026-11-27 | each extension or theme release | re-run the commands in the dives' measurement sections and followup-q0 Measurement C |
| 24 (protocol) | Whether a mouse click focuses a button varies by browser; Safari does not, by design. The keyboard activation in the Verify avoids it | [MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button), modified 2026-04-24 | 12 months, or when the test first runs in Firefox or WebKit | re-fetch and search "Safari does not"; run followup-q0's `variants.mjs` in the new engine |
| 07, 22, 26, 27, 34 (calibration) | Hit counts and reference instances on second codebases: `vscode-pull-request-github` `c9891f1`, Excalidraw `dabd83c`, Gitea `e77c1c2`, Mastodon `e639273`, Plausible `06efc5e` | measured 2026-11-27 (Plausible commit 2026-11-26) | when a Verify pattern changes, or 12 months | clone at those commits with `--depth 1` and re-run the commands in followup-q1 and followup-q2 |

## Open questions

Needs another research round (as questions):
- **Live forced failure.** When `grim` is killed, missing or offline at runtime, do the extension's real views match their golden fixtures, and does any state render that has no fixture? The dives forced fixtures and components, never a live failing run.
- **Spoken output.** With NVDA or VoiceOver, what does a user actually hear for the webview loading states, the paging `aria-live` toggle, and the Pagefind search dialog? After a rejected registry save, does the user hear the focus target ("Add registry", a `generic` node) and the separate `role="alert"` error in a useful order (followup-q0 measured only where focus lands)? This is UX-VERIFY's live-region harness, applied to these states.
- **Optimistic updates and offline queues** (deferred row M070). How must an optimistic update show the pending, confirmed and rolled-back states, and how does a rule detect a missing rollback state?
- **A field gate for acknowledgement in webviews.** Webviews have no CrUX or INP field data. Which in-test measurement (event-to-paint in Playwright under CPU throttle) stands in for INP p75, and at what threshold?
- **Reduced motion inside VS Code webviews.** Does `@media (prefers-reduced-motion)` fire there, or only the `vscode-reduce-motion` body class? This is UX-A11Y's question. Whether a skeleton shimmer (rule 11) and the decorative fade can be switched off reliably depends on the answer.

Needs an owner decision: everything in "What an agent must ask a human". The first three items there block fleet fixes for rules 15, 18 and 33.

Cross-territory, one line each:
- Error wording and next steps belong to UX-TEXT, including the raw `grim exited with status 1`.
- Modal dialogs belong to UX-ACT.
- Reduced motion belongs to UX-A11Y, with this decision: decorative animation (`details.css:1366`) stops under `vscode-reduce-motion`, while a loading indicator keeps a subtle animation ([Primer loading source](https://raw.githubusercontent.com/primer/design/main/content/ui-patterns/loading.mdx), "should not be disabled ... kept as subtle as possible").
- Webview hex colours belong to css-theming.
- CLS as a ranking signal belongs to the marketing SEO dive.

## Sub-artifacts and key sources

Sub-artifacts:
- [ux-interface-states/loading-and-progress.md](ux-interface-states/loading-and-progress.md): the wait ladder, acknowledgement, double submit and status announcement, with throttled browser timings of three real actions.
- [ux-interface-states/empty-error-notification.md](ux-interface-states/empty-error-notification.md): the state matrix, empty-state contents and the channel table, with forced-state screenshots of the theme and the webviews.
- [ux-interface-states/form-state-machine.md](ux-interface-states/form-state-machine.md): labels, validation timing, error placement and focus, preserved input, submit state and `showInputBox`, with a fleet inventory of every form.
- [ux-interface-states/editor-extension-surfaces.md](ux-interface-states/editor-extension-surfaces.md): the VS Code surface table, the notification budget and native progress, with all 183 counted message lines classified and the rule-loading decision.
- [ux-interface-states/followup-q0.md](ux-interface-states/followup-q0.md): wave 2. The UX-STATE-24 focus test run on 12 built forms and on the fleet registry form, the recording protocol it needs, and the blur test behind UX-STATE-35.
- [ux-interface-states/followup-q1.md](ux-interface-states/followup-q1.md): wave 2. The UX-STATE-07 and UX-STATE-34 trigger greps run on a VS Code extension and a canvas app outside the fleet.
- [ux-interface-states/followup-q2.md](ux-interface-states/followup-q2.md): wave 2. The UX-STATE-22, 26 and 27 checks run on Gitea, Mastodon and Plausible.

Key sources:
1. https://www.nngroup.com/articles/response-times-3-important-limits/ — Nielsen, 1993 with a 2014 update: the 0.1, 1 and 10 s limits and the interrupt clause.
2. https://primer.style/product/ui-patterns/loading/ — the wait tiers, grouping and disabling controls during loading (source 2024-07-03).
3. https://primer.style/product/components/button/accessibility/ — loading button: `aria-disabled`, never `disabled`, and a live region present at load (source 2024-10-28).
4. https://www.nngroup.com/articles/skeleton-screens/ — skeleton, spinner or bar, by scope and wait (2023-06-04, reviewed 2026-09-02).
5. https://www.nngroup.com/articles/empty-state-interface-design/ — no "no items" while loading (2021-09-19).
6. https://primer.style/product/ui-patterns/empty-states/ and https://primer.style/product/ui-patterns/degraded-experiences/ — empty contents and partial failure.
7. https://primer.style/product/ui-patterns/notification-messaging/ — channel decision flows (source 2024-12-04).
8. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html — 4.1.3, Level AA (updated 2026-10-04).
9. https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html — 2.2.1, the condition for a timed message.
10. https://design-system.service.gov.uk/components/error-summary/ and https://design-system.service.gov.uk/patterns/validation/ — summary, focus, timing and preserved input.
11. https://design-system.service.gov.uk/components/button/ — avoid disabled buttons; protect against double submit on the server too.
12. https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html — 3.3.7, Level A (updated 2025-09-17).
13. https://code.visualstudio.com/api/ux-guidelines/notifications — VS Code notification rules (page date 2026-11-25).
14. https://code.visualstudio.com/api/references/vscode-api.md — `withProgress`, `ProgressLocation` and `setStatusBarMessage` (fetched 2026-11-27).
15. https://react.dev/reference/react/Suspense — no show-delay, a 300 ms reveal throttle.

## Revision log

Revision of 2026-11-27, after an adversarial check. No rule was renumbered or retired. One rule was added (UX-STATE-34).

- UX-STATE-24, Applied row: "satisfied" changed to "partial". The registry form has several fields (`settings/render.ts:563-590`) and no error summary, so only the focus clause is met.
- UX-STATE-24, Verify: the "exactly one `.focus()`" source count replaced by a test that records `focusin` events and checks `document.activeElement` after a failed submit. A helper or fallback branch made the count wrong in both directions.
- UX-STATE-05, Verify: `aria-busy` dropped from the pass condition, and the live region must sit on or around the element that holds the state text. `aria-busy` announces nothing, and an unrelated live region elsewhere passed the old grep. Rule text gained the line "`aria-busy` never satisfies this rule on its own".
- UX-STATE-07: narrowed to partial and overflow/capped, with a grep trigger per state (paged source, `.slice(0, CONSTANT)` cap) so "where they apply" is decidable. The stale clause moved out because its sourcing is the weakest in the set.
- UX-STATE-34 (new, CONSIDER): the stale-data clause from UX-STATE-07, with a cache-read trigger. Applied row added (satisfied by the `results-browse-ready-empty` footer).
- UX-STATE-26, Verify: replaced a check that could not fail with two `grep -rl` lists (optional markers, required markers). Both non-empty fails.
- UX-STATE-22: MUST demoted to SHOULD (untested in the fleet). Rationale now cites GOV.UK validation verbatim for the submit-time and never-premature parts (fetched 2026-11-27). The blur clause is stated as a MAY. Verdict item 10 updated to match.
- UX-STATE-10: the invented `expectedWaitMs >= 1000` pass condition removed. Rationale now says the 1000 ms value is a convention from guidance, not a measured threshold. Severity kept at MUST, because the fleet sidebar proves the check runs.
- UX-STATE-19: rule and Verify now tie the count to one named banner component (GOV.UK `govuk-notification-banner`, Primer React `Banner`, both confirmed on their pages 2026-11-27, or a house component). The old `data-banner` selector exists nowhere in the fleet.
- UX-STATE-27: MUST demoted to SHOULD (untested in the fleet). Verify grep extended with `name=` and `id=` patterns for name, username, address and code fields, with a read step for false hits.
- UX-STATE-08, Verify: made portable. A spy on the transport, fired twice in one tick, called once. The fleet's `host.send` test is now the instance, not the check.
- UX-STATE-15: the "link to details or logs" clause moved from MUST to SHOULD, with its only source cited ("Show a link to see more details (like logs)", VS Code notifications guideline, page date 2026-11-25).
- UX-STATE-13: MUST demoted to SHOULD (untested in the fleet).
- UX-STATE-25, Rationale: now leads with the GOV.UK January 2024 change, quoted from the error-message page (fetched 2026-11-27). WCAG 3.3.7 is described as supporting, not as the origin.
- Verdict item 3: "TUI-23 unchanged" corrected to "TUI-23 plus the 3 s determinate tier, pending CR-1". Verdict item 1 updated for UX-STATE-07 and 34.
- Ruleset header: added a note that rules 02, 13, 16, 17, 19, 22, 26 and 27 have no fleet instance, so their checks are untested. Applied row for those rules says "untested".
- Applied rows 11, 15, 20, 29 and 33: file:line evidence added from a re-read of the source at `9230dcd` and the theme tree (2026-11-27). Row 33 corrected: the extension's `CLAUDE.md` does not record a reason for the webview view, and `X:extension.ts:481` has no comment.
- Applied row 05: notes that the 6 zero counts were measured with the wider pattern, so they stand under the narrower check.
- Decay: UX-STATE-34 added to the Primer row.

Revision of 2026-11-27, wave 2, folding in followup-q0, followup-q1 and followup-q2. No rule was renumbered or retired. One rule was added (UX-STATE-35). One rule was promoted (UX-STATE-27). Nothing was removed from "Open questions": none of its five items was the subject of these follow-ups.

- 2026-11-27, UX-STATE-24, Verify (followup-q0.md): replaced with the measured protocol. Start the log before activation, activate from a focused submit control by keyboard, wait for the application's settle signal, then assert both clauses. As first worded, the test failed 11 of 12 built forms, both correct ones included, and a mouse click gave false fails. MUST and the rule text are unchanged. The summary grep is now marked as not optional.
- 2026-11-27, UX-STATE-24, Applied row (followup-q0.md): "no `focusin` test exists yet" replaced by the measured result (one `focusin`, on `.form-title`, via a rejected host reply; 3 mutations told apart). Status stays partial.
- 2026-11-27, UX-STATE-35 (new, SHOULD; followup-q0.md): never move focus from a blur or change handler, with a Tab test and a reading grep. UX-STATE-24's blur bullet now points to it. Applied row added (untested on product code). The follow-up's reading grep had broken shell quoting; it was fixed, and `focusout` and `change` were added to match the rule text.
- 2026-11-27, UX-STATE-21, Applied row (followup-q0.md): added the measured fact that an invalid draft gets no feedback at all. Severity unchanged.
- 2026-11-27, UX-STATE-07, Verify and Rationale (followup-q1.md, answered partly): the bare `cursor` token removed from the paging trigger. The follow-up's tokens were added, and so were `PAGE_SIZE|[Pp]age[Ss]ize|page_size|[Pp]aging`, because the follow-up's list returns 0 lines on the fleet's own paged source (measured in this revision, Verdict item 16). The capped grep now also accepts number literals and requires a visible count. Severity stays SHOULD. The gaps (module-to-view trace, capped-list recall) went to Verdict item 16.
- 2026-11-27, UX-STATE-34, Verify (followup-q1.md, answered partly): the trigger was narrowed to the age-field tokens `syncedAt|lastSynced|lastFetched|fetchedAt|staleTime`. `cache`, `globalState.get` and `localStorage.getItem` were removed (454 and 601 lines of noise). The rule now says the trigger is weak. Severity stays CONSIDER. The gap (age fields named otherwise; no second instance) went to Verdict item 16.
- 2026-11-27, UX-STATE-27 (followup-q2.md): SHOULD promoted to MUST. The check found real fails and passes on Gitea, Mastodon and Plausible. The Verify was replaced: a closed name list for tag sources, a helper-source branch, and an `off` listing. Reference instances were added. The rule text is unchanged.
- 2026-11-27, UX-STATE-26, Verify (followup-q2.md): added a CSS asterisk detector and a renderer-consistency step, with reference instances (Plausible pass; Gitea and Mastodon fail). Severity stays SHOULD.
- 2026-11-27, UX-STATE-22, Verify (followup-q2.md): replaced with a pipeline that finds a project's own `on(` helper, prettier-split calls and errors set up to 30 lines down. The old pipeline returned 0 on Gitea and Mastodon, a false pass. Severity stays SHOULD: 0 real violations in three codebases.
- 2026-11-27, ruleset header (followup-q2.md): the untested note was rewritten for 22, 26, 27 and 35. A "helper-generated markup" line was added: zero hits from a tag grep is not a pass where forms come from helpers. This applies to UX-STATE-20, 21 and 27.
- 2026-11-27, Verdict item 10 (followup-q2.md): the condition for UX-STATE-22 to return to MUST was restated. Verdict item 16 was added with what q0, q1 and q2 settled and their documented gaps.
- 2026-11-27, Applied table (followup-q1.md, followup-q2.md): row 07 gained the revised trigger counts on the fleet. The untested row was split into "22, 26, 27" (checked on non-fleet code), "35" and "02, 13, 16, 17, 19".
- 2026-11-27, Decay (followup-q0.md, followup-q1.md, followup-q2.md): rows added for the UX-STATE-24 protocol (browser focus-on-click, MDN 2026-04-24) and for the second-codebase calibration commits. The Applied-table row now names the browser build.
- 2026-11-27, Open questions (followup-q0.md): the screen-reader order of the registry form's focus target and its alert was added to "Spoken output".

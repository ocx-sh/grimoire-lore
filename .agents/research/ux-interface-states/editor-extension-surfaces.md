---
title: "VS Code extension surfaces: which native surface for which message and state"
program: product
sub_program: ux
topic: ux-interface-states
worker: editor-extension-surfaces
date_researched: 2026-11-27
model: sonnet
sources_fetched: 8
scope: "Covers VS Code native surfaces (notification, status bar, quick pick, views, progress, webview) and measures grimoire-rs/vscode at commit 9230dcd (committed 2026-11-24). Does not cover modal confirmations (UX-ACT) or indicators inside webview HTML (loading-and-progress). Fetched on 2026-11-27: the five VS Code UX guideline pages, the webview guide, the API reference (as .md, saved locally and read at setStatusBarMessage, withProgress, ProgressLocation, ProgressOptions), and the NN/g response-time page. Keyboard and screen-reader behaviour of the webviews was measured by grep of source, not run with assistive technology."
---

# VS Code extension surfaces

Repair pass 2026-11-27. Changes versus the first draft: URLs added inline to every rule; rule 3 dropped; retrieval dates added to every dated fact; all 183 counted calls classified and the 180 versus 183 gap explained; the load trigger (F7) checked against the grim rule spec; the three open items (notification wording, `setStatusBarMessage`, `withProgress`) read on the sources; keyboard and screen-reader measurements added (F8).

## Contents
1. Summary
2. Findings (F1 to F8)
3. Normative guidance candidates (19 rules)
4. Surface decision table, notification budget
5. AI-agent angle
6. Dated facts
7. What an agent must not decide alone
8. Contested
9. Not fetched or not verified
10. Sources

## Summary

- The map's "183 message calls" counts per-type matching lines in `src`, and 147 of the 180 distinct lines are test stubs. Production has 30 real calls (16 information, 9 warning, 5 error) on 33 lines. Zero test lines are real calls (F3, F4).
- The map's "0 `withProgress`" is true but misleading. The extension has its own progress surface, `runWithStatusProgress` in `src/notify.ts`, used at 11 call sites: a spinning status-bar item with a click-to-output command.
- That item has no percent, no cancel and no stage text. The default timeouts are 420 s (catalog-refreshing grim calls) and 120 s. NN/g says operations over about 10 s need percent-done and a signposted interrupt. That is the real gap.
- The VS Code API states that only `ProgressLocation.Notification` can show a cancel button or discrete progress. So the surface choice by wait length follows from the API, not taste.
- 13 of 30 production messages are information toasts with no action that confirm something the user just did and can see (clipboard copies, add, create, token stored). The guide says to notify only when "absolutely necessary".
- Webview views: the guide says "Limit the use of custom Webview Views". The extension contributes one view and it is a webview. That is an owner decision, not an agent defect.
- Webview quality is mostly sound: 368 `--vscode-*` references, hex values only as `var()` fallbacks, 27 `tabindex` uses, 16 focus-style rules, `role="status"`/`role="alert"` live regions on the load and save errors. Gaps: 0 reduced-motion handling while 1 animation exists; 0 high-contrast handling.
- A rule can detect a missing state by grep on source (rules 1, 2, 7, 8). A rule cannot load on package content: grim rules load on `paths` globs only (F7).

## Findings

### F1. VS Code guidance, by surface (retrieved 2026-11-27; every page shows 11/25/2026 near its end, unlabelled, so treat it as a page date, not an authored-on date)

- Notifications ([guide](https://code.visualstudio.com/api/ux-guidelines/notifications), platform). Do: "Respect the user's attention by only sending notifications when absolutely necessary"; "Add a **Do not show again** option for every notification"; "Show one notification at a time". Don't: "Send repeated notifications"; "Use for promotion"; "Ask for feedback on the first install"; "Show actions if there aren't any". The decision-tree image text reads "If you need to show multiple notifications try to combine them into one." Information example: "no additional actions and is purely informational". Warning example: "requires user input and shows actions to resolve the issue". Error example: "a failure notification with an action to resolve the issue". The page does not require actions on warnings and errors; it shows them in examples. Progress notification: "should be used as a last resort"; Do show a link to details such as logs, show stages, "Provide an action to cancel the operation (if applicable)", "Add timers for timed out scenarios"; Don't "Leave a notification running in progress". Modal: only when immediate interaction is needed; do not use it for messages that need no action.
- Status bar ([guide](https://code.visualstudio.com/api/ux-guidelines/status-bar), platform). Do: short text labels, primary items left. Don't: "Add custom colors", add more than one icon or more than one item "unless necessary". "Limit the number of items added, as other extensions contribute to the same area." Colored error or warning background: "Only use this pattern as a last resort." Background work: "it's recommended to show a Status Bar item with the loading icon"; if progress needs user attention, "we recommend moving to a progress notification".
- Quick picks ([guide](https://code.visualstudio.com/api/ux-guidelines/quick-picks), platform). Do: "Use the multi-step pattern for a series of basic inputs"; a title for multi-step quick picks. Don't: "Use inputs without a placeholder"; repeat existing functionality. "Avoid using quick picks for long flows with many steps". The page says nothing on progress indicators and does not give a "1/3" title format; the API has `step` and `totalSteps` fields ([API](https://code.visualstudio.com/api/references/vscode-api.md): "An optional current step count for multi-step input flows").
- Views ([guide](https://code.visualstudio.com/api/ux-guidelines/views), platform). Do: keep the number of views to a minimum; give each view an icon; use links instead of buttons in welcome views; "Limit the use of custom Webview Views". Don't: use welcome views for promotions; "Use custom Webview Views if not necessary". Progress can be shown in a view by referencing the view's ID.
- Webviews ([guide](https://code.visualstudio.com/api/ux-guidelines/webviews), platform). Do: "Only use webviews when absolutely necessary"; "Ensure all elements in the view are themeable"; "Ensure your views follow accessibility guidance (color contrast, ARIA labels, keyboard navigation)". Don't: promotions, wizards, opening on every window, "Open on extension updates (ask via a Notification instead)". These two accessibility and theming bullets are the page's only text on the subject; there is no keyboard section.
- Webview guide ([guide](https://code.visualstudio.com/api/extension-guides/webview), platform). VS Code adds a class to `body` for the theme (light, dark, high contrast); `vscode-using-screen-reader` and `vscode-reduce-motion` classes mark those user settings; "always test your webview in high-contrast mode"; `retainContextWhenHidden` "has high memory overhead and should only be used when other persistence techniques will not work"; `getState`/`setState` are the recommended persistence. The page does not cover keyboard or focus handling.
- API ([reference](https://code.visualstudio.com/api/references/vscode-api.md), platform; the local copy was read at the named members). `window.setStatusBarMessage(text: string, hideAfterTimeout: number): Disposable`, where the timeout is in milliseconds; overloads take a `Thenable` (`hideWhenDone`) or no timeout. `window.withProgress<R>(options: ProgressOptions, task: (progress: Progress<{increment: number, message: string}>, token: CancellationToken) => Thenable<R>): Thenable<R>`; "Note that currently only ProgressLocation.Notification is capable of showing discrete progress" and "currently only ProgressLocation.Notification is supporting to show a cancel button". `ProgressLocation.Window`: status bar, "Neither supports cancellation nor discrete progress", supports `$(name)` icons in the label. `ProgressLocation.Notification`: optional cancel button, infinite or discrete progress, no icons. `ProgressLocation.SourceControl`: no cancel, no discrete progress, no label. `ProgressOptions.cancellable?: boolean`.

### F2. Wait thresholds (NN/g)

[NN/g Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/) (Jakob Nielsen; published 1993 as an excerpt of Usability Engineering; a 2014 update note; independent authority; retrieved 2026-11-27). "0.1 second is about the limit for having the user feel that the system is reacting instantaneously"; "1.0 second is about the limit for the user's flow of thought to stay uninterrupted"; "10 seconds is about the limit for keeping the user's attention focused on the dialogue"; "percent-done progress indicators should be used for operations taking more than about 10 seconds"; the 2014 note adds "a clearly signposted way for the user to interrupt the operation".

### F3. Measurements, reproduced (checkout `grimoire-rs/vscode` at `9230dcd`, working tree clean, run 2026-11-27)

| Item | Map value | Reproduced | Command |
|---|---|---|---|
| Lines matching a `show*Message` in `src` | 183 | 180 lines (33 production + 147 test) | `git grep -nE 'show(Information\|Warning\|Error)Message' -- src \| wc -l` |
| Per-type counts, `git grep -c` summed | 33 / 70 / 80 = 183 | 33 / 70 / 80 = 183 (matches the map exactly) | `git grep -c showInformationMessage -- src`, same for Warning and Error |
| Why 183 differs from 180 | n/a | `-c` counts a line once per type. Three lines name more than one type: `src/test/grimLive.test.ts:279` (all three, `const DIALOGS = [...]`, +2) and `src/test/extension.test.ts:2508` (Warning and Error in a doc comment, +1). 180 + 3 = 183. Gap closed. | `git grep -nE 'show(Information\|Warning\|Error)Message.*show(Information\|Warning\|Error)Message' -- src` |
| Production lines: info / warning / error | n/a | 17 / 11 / 5 (33 lines) | `git grep -c show<Type>Message -- src ':!src/test'`, summed |
| Production real calls | n/a | 30 (16 / 9 / 5); the 3 non-calls are `installer.ts:110` and `webview/model.ts:2416,2546`, all comments | read by hand |
| Test lines | n/a | 147: 133 `extension.test.ts`, 12 `rating.test.ts`, 1 `grimLive.test.ts`, 1 `model.test.ts` | `git grep -cE 'show(Information\|Warning\|Error)Message' -- src/test` |
| `withProgress` | 0 | 0 | `git grep -cE withProgress -- src` |
| `runWithStatusProgress` calls (production) | not in map | 11 call sites (8 files) plus the definition `notify.ts:52` | `git grep -nE runWithStatusProgress -- src ':!src/test'`, minus imports and comments |
| `createStatusBarItem` | not in map | 1 (`notify.ts:37`), shared and refcounted | `git grep -n createStatusBarItem -- src ':!src/test'` |
| `setStatusBarMessage` | not in map | 0 | same pattern |
| `modal: true` production | 6 | 5 (`extension.ts:433`, `forceRetry.ts:61`, `grimInfo.ts:135`, `switchReplacement.ts:73`, `vote.ts:168`); the 6th is test-side | `git grep -nE 'modal: *true' -- src ':!src/test'` |
| `showQuickPick`/`createQuickPick` production | 31 | 3 (`auth.ts:227`, `pickVersion.ts:31,82`); the rest are tests | `git grep -nE 'showQuickPick\|createQuickPick' -- src ':!src/test'` |
| Webview references production | 60 | 10 lines | `git grep -nE 'createWebviewPanel\|WebviewView' -- src ':!src/test'` |
| `registerWebviewViewProvider` | n/a | 1 | same style |
| `retainContextWhenHidden` production | n/a | 1 line, a comment at `sidebar.ts:316` explaining why it is not used | `git grep -n retainContextWhenHidden -- src ':!src/test'` |
| `--vscode-*` references | n/a | 368 | `git grep -nE '\-\-vscode-' -- src ':!src/test' \| wc -l` |
| Hex colours outside a `var()` fallback | n/a | 0 seen in the first 15 matches; all were `var(--vscode-x, #hex)` | `git grep -nE '#[0-9a-fA-F]{3,8}\b' -- 'src/**/*.css' src/webview ':!src/test'` |
| `prefers-reduced-motion`, `vscode-reduce-motion` | n/a | 0 | `git grep -nE 'prefers-reduced\|reduce-motion' -- src ':!src/test'` |
| `high-contrast`, `forced-colors`, `vscode-using-screen-reader` | n/a | 0 | same style |
| CSS animations or transitions | n/a | 1 (`details.css:1366`, `revalidate-fade` 2 s); no `transition:` | `git grep -nE '@keyframes\|animation:\|transition:' -- 'src/**/*.css'` |

### F4. Classification of all 183 counted lines

**Test side (147 lines, 0 real calls).** Every test line is a stub, a type declaration, a restore or a comment. By my script over `git grep -hE 'show(Information|Warning|Error)Message' -- src/test`: 3 comments; 33 type declarations (`showXMessage: unknown;`, `as unknown as {...}`); 31 saves of the original (`const original = window.showXMessage`); 38 stub installs (`window.showXMessage = async ...`); 32 restores; 10 other (aliasing `warn: window.showWarningMessage`, `window['showWarningMessage'] = ...`, the `DIALOGS` array). Total 147. The map's count is therefore a count of mock plumbing, not of messages shown. The three multi-type lines of F3 are in this group.

**Production side (30 real calls, my reading of each site; `details.ts:734` and `sidebar.ts:522` were re-read with context this pass and are clipboard copies):**

| Class | Count | Sites | Better surface |
|---|---|---|---|
| Information with actions | 3 | `extension.ts:235` (install grim), `extension.ts:646` (update prompt), `grimInfo.ts:133` (modal, out of scope) | Keep. The update prompt has a `skippedVersion` opt-out (`extension.ts:652`); the install prompt has none. |
| Information, no action, confirms a user action | 13 | `extension.ts:261,824,844`; `details.ts:730,734,1014`; `ratingAuth.ts:91,104`; `settings.ts:547,561`; `sidebar.ts:518,522,675` | `setStatusBarMessage(text, ms)` (0 uses today) or the inline state change. The two "Copied ..." sites are clipboard writes the user triggered. |
| Warning with actions | 8 (4 modal) | `details.ts:745`, `hookPrompt.ts:92`, `ratingAuth.ts:48`, `staleLock.ts:61`; modal: `extension.ts:431`, `forceRetry.ts:59`, `switchReplacement.ts:70`, `vote.ts:165` | Keep. Modals out of scope (UX-ACT). |
| Warning, no action | 1 | `details.ts:895` | Add an action such as Show Output, or move to inline state. |
| Error with action | 4 | `forceRetry.ts:120`, `staleLock.ts:134`, `updateRefusal.ts:92,104` | Keep. |
| Error, no action | 1 | `notify.ts:97` (shared `notifyError`) | Candidate: add Show Output. Opt-in dedupe over 5000 ms exists. |

Totals: 16 information, 9 warning, 5 error = 30. Budget observed: no cap exists. The update check is throttled once per day (`DAY_MS`, `extension.ts:620`).

### F5. Long-running host operations and native progress

Every mutating grim call goes through `runWithStatusProgress` (status-bar spinner `$(sync~spin) Grimoire: <title>`, refcounted, latest title wins, also locks card buttons through `onBusyChange`).

| Operation | Site | Progress surface | Cancel | Percent or stage |
|---|---|---|---|---|
| Install grim (download, extract) | `extension.ts:255`, `installer.ts:299,308` | status-bar spinner "Installing grim"; stage text goes only to the output channel | none | none |
| Update all artifacts | `extension.ts:733` | status bar | none | title only |
| Install, update, uninstall, switch from sidebar and details | `sidebar.ts:616`, `details.ts:948` | status bar | none | none |
| Vote | `details.ts:878` | status bar | none | none |
| Force retry, hook prompt, stale lock, version pick, switch replacement | `forceRetry.ts:67`, `hookPrompt.ts:104`, `staleLock.ts:75,141`, `pickVersion.ts:46`, `switchReplacement.ts:80` | status bar | none | none |
| Catalog refresh and browse | `catalog.ts:232,536` | webview `phase:'loading'` post and skeleton, not host progress | none | none |
| Update-availability check | `extension.ts:614` | none (silent by design) | none | none |

Deadlines: `REFRESHING_TIMEOUT_MS = 420_000` and `NON_REFRESHING_TIMEOUT_MS = 120_000` (`src/grim.ts:532-533`). A call can run past 10 s and up to 7 minutes with a spinner and no way to stop it. The "reads as a dead button" comment in `notify.ts` shows the maintainers hit this for queued installs.

### F6. Webviews as web UI versus native surfaces

- The extension's own `CLAUDE.md` (local, owner's file, re-read 2026-11-27) mandates theme tokens only (`--vscode-*`, line 66), strict CSP (line 47), lit-html, a first-paint skeleton (line 41); "null metadata renders as 'Not provided', empty panels are omitted" (lines 69-70). It does not mention reduced motion, high contrast, focus management or the screen-reader class.
- A webview therefore inherits the web-UI rules (loading, empty, error, partial, stale; ARIA; keyboard; contrast), because VS Code supplies none of them inside a webview. Native surfaces (notification, quick pick, status bar, tree view, welcome view) inherit accessibility and keyboard behaviour from VS Code; the agent's duty there is surface choice, text and action choice.
- Gaps: `details.css:1366` runs a 2 s animation with no `vscode-reduce-motion` override; 0 high-contrast handling. These go to UX-A11Y.

### F7. How the rule loads on extension sources (answered against the grim rule spec)

grim rules scope by the `paths` frontmatter key only: "`paths` | list of strings | Glob patterns the rule auto-loads on; absent = always active" ([rule-spec.md](/home/mherwig/.cargo/git/checkouts/grimoire-16fcaa23000de496/82f4982/catalog/skills/grim-authoring/references/rule-spec.md), local, grim checkout 82f4982, retrieved 2026-11-27, no date stated). There is no content-based trigger. Client behaviour from the same file: Copilot comma-joins `paths` into `applyTo`; Cursor and Antigravity comma-join and split on every comma, so a glob must contain no comma; OpenCode and Junie drop `paths` with a warning and substitute a prose notice. The extension's `package.json` has `"engines": {"vscode": "^1.96.0"}` (line 8), which no glob can test.

Decision: scope the rule with path globs that only an extension has, and put the content gate in the first line of the rule body. Candidate globs, none with a comma: `**/extension.ts`, `**/src/webview/**`, `**/src/views/**`, `**/.vscodeignore`, `**/*.vsix`. First body line: "Applies when `package.json` has `engines.vscode`; otherwise stop." Pair it with a skill whose description names the trigger text ("VS Code extension, showInformationMessage, withProgress, webview view"), because skills load by description, which does cover content. A broader glob such as `src/**/*.ts` is rejected: it loads on every TypeScript project.

### F8. Webview keyboard and screen-reader measurements (grep of source; assistive technology not run)

| Item | Result | Command |
|---|---|---|
| `keydown` handlers | 4 files (`details/main.ts:361`, `settings/main.ts:855`, `sidebar/main.ts:982,1042`) | `git grep -nE keydown -- src ':!src/test'` |
| `tabindex` | 27 uses | `git grep -nE tabindex -- src ':!src/test' \| wc -l` |
| `:focus` or `:focus-visible` rules | 16 | `git grep -nE 'focus-visible\|:focus' -- src ':!src/test' \| wc -l` |
| `outline: none` or `0` | 3: `settings.css:244` replaced by `border-color: var(--vscode-focusBorder)`; `settings.css:340` on a borderless inner pattern input; `sidebar.css:356` on a status region that takes programmatic focus after Retry (commented) | `git grep -nE 'outline: *(none\|0)' -- src ':!src/test'` |
| Live regions | `render.ts:1219` `role="status"` with `aria-live` polite while loaded, off while loading, plus `aria-busy` while loading; `render.ts:1221` and `settings/render.ts:522` `role="alert"` for failures | `git grep -nE 'aria-live\|role="?(status\|alert)\|aria-busy' -- src ':!src/test'` |
| `role="progressbar"` | 0 | `git grep -c progressbar -- src` |
| `.focus()` calls | 9 | `git grep -nE '\.focus\(' -- src ':!src/test' \| wc -l` |
| Click handlers on non-interactive elements | 0 (`@click=` is not used; 4 `addEventListener('click'` lines in `src/webview`) | `git grep -nE '<(div\|span\|li\|tr\|td\|img\|p)[^>]*@click='` |
| ARIA or role attributes | 52 | `git grep -nE 'role=\|aria-' -- src/webview ':!src/test' \| wc -l` |

Reading: keyboard and live-region handling is deliberate and better than the generic webview baseline; the loading state is announced via `aria-busy`, not a progress role. The measurable gaps are reduced motion and high contrast. Screen-reader output was not tested.

## Normative guidance candidates

1. MUST NOT add a `show*Message` call whose only purpose is to confirm an action the user just triggered and can already see (copy, add, create, store). Rationale: the [notification guide](https://code.visualstudio.com/api/ux-guidelines/notifications) says to notify "only when absolutely necessary". Verify: list new `show*Message` sites; for each with no action argument and a user-triggered cause, require `setStatusBarMessage(text, hideAfterTimeout)` ([API](https://code.visualstudio.com/api/references/vscode-api.md): timeout in milliseconds) or the inline state change. Fail: `showInformationMessage('Copied share link')`. Pass: `setStatusBarMessage('Copied share link', 3000)`. Severity MUST for new code; existing sites go to the owner (see "must not decide alone").
2. SHOULD give every warning and error message an action that resolves it or opens the log (Show Output), unless no action exists. Rationale: the [notification guide](https://code.visualstudio.com/api/ux-guidelines/notifications) shows warnings and errors with actions and says not to show actions when there are none; it does not mandate them. Verify: grep each `showWarningMessage|showErrorMessage` call for items after the message; flag message-only calls. Today `details.ts:895` and `notify.ts:97` fail.
3. SHOULD NOT show more than one notification per user action; MUST combine multiple outcomes into one message. Rationale: the [notification guide](https://code.visualstudio.com/api/ux-guidelines/notifications): "Show one notification at a time" and "try to combine them into one". Verify: for each command handler, count `show*Message` reachable on one path; more than 1 fails.
4. MUST dedupe notifications that a background source or file watcher can fire repeatedly. Rationale: [guide](https://code.visualstudio.com/api/ux-guidelines/notifications) Don't "Send repeated notifications". Verify: every `showErrorMessage` reachable from an event listener or watcher goes through a dedupe helper (this repo: `notifyError({dedupe:true})`, 5000 ms).
5. SHOULD offer "Do not show again" on every recurring non-error notification. Rationale: the [guide](https://code.visualstudio.com/api/ux-guidelines/notifications) says "Add a Do not show again option for every notification". Verify: for each non-modal information or warning prompt that can recur, grep `globalState.update(` near it for a stored skip key; this repo has it for the update prompt only. Persistence scope is an owner decision.
6. MUST show host-side waits of 1 s or more on a native progress surface. Rationale: [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/): 1.0 s is the limit of uninterrupted flow of thought. Verify: for each `await` of `execFile`, the grim runner, `fetch` or a download inside a command handler, check it sits in `withProgress` or `runWithStatusProgress`; unwrapped fails.
7. SHOULD use `window.withProgress` with `ProgressLocation.Notification` and `cancellable: true` for any operation whose timeout exceeds 10_000 ms, reporting `{increment}` when total work is known and `{message}` for stages, and MUST kill or abandon the work when `token.onCancellationRequested` fires. Rationale: [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/) asks for percent-done and an interrupt beyond about 10 s, and the [API](https://code.visualstudio.com/api/references/vscode-api.md) says only `Notification` shows a cancel button or discrete progress. Verify: for each wrapped operation with a timeout above 10_000 ms, require `cancellable: true` and a handler that stops the child process. In this repo the 420 s default fails. SHOULD rather than MUST because cancel safety for grim is an owner decision (see below).
8. SHOULD use `ProgressLocation.Window` or a status-bar spinner for waits between 1 and 10 s and for background work, with a label that names the operation. Rationale: the [status-bar guide](https://code.visualstudio.com/api/ux-guidelines/status-bar) recommends a loading-icon item for background work and a progress notification when it needs attention. Verify: the label names the operation (`$(sync~spin) Grimoire: Installing grim` passes; a bare spinner fails).
9. MUST NOT leave a progress notification running after the operation settles. Rationale: [guide](https://code.visualstudio.com/api/ux-guidelines/notifications) Don't "Leave a notification running in progress"; the [API](https://code.visualstudio.com/api/references/vscode-api.md) ends progress when the callback's promise settles. Verify: the `withProgress` callback returns a promise that resolves or rejects in every branch (no un-awaited work, try/finally for cleanup).
10. SHOULD scope progress to the view that owns the wait using `{ viewId }` as the `ProgressLocation` when the work belongs to one view. Rationale: the [views guide](https://code.visualstudio.com/api/ux-guidelines/views) lets an extension "show progress in a view" by view ID. Verify: a `withProgress({location: {viewId}})` or an in-view loading state exists for view-owned loads. For a webview view, an in-webview state is the substitute (loading-and-progress dive).
11. MUST NOT add more than one status-bar item per extension unless justified in a comment. Rationale: [status-bar guide](https://code.visualstudio.com/api/ux-guidelines/status-bar) Don't "Add more than one item (unless necessary)". Verify: `git grep -c createStatusBarItem -- src ':!src/test'` totals at most 1; this repo: 1 (pass).
12. MUST NOT set custom colours on status-bar items. Rationale: [status-bar guide](https://code.visualstudio.com/api/ux-guidelines/status-bar) Don't "Add custom colors"; coloured error or warning backgrounds only "as a last resort". Verify: `git grep -nE 'statusBarItem\.(color|backgroundColor)|\.backgroundColor *=' -- src` shows only `new ThemeColor('statusBarItem.errorBackground'|'statusBarItem.warningBackground')`.
13. MUST give each quick pick a `placeHolder`, and a `title` when it is multi-step or has global buttons. SHOULD NOT build a flow of more than 3 quick-pick steps (the number 3 is this dive's proposal; the guide says "Avoid using quick picks for long flows with many steps"). Rationale: [quick-pick guide](https://code.visualstudio.com/api/ux-guidelines/quick-picks) Don't "Use inputs without a placeholder"; multi-step quick picks get a title. Verify: each `showQuickPick(` options object has `placeHolder`; each `createQuickPick` with `.step` set also sets `.title` and `.totalSteps` ([API](https://code.visualstudio.com/api/references/vscode-api.md)). `pickVersion.ts:31` has a placeholder.
14. SHOULD NOT contribute a webview view where a tree view or quick pick can do the job; adding one needs an owner decision. Rationale: [views guide](https://code.visualstudio.com/api/ux-guidelines/views) "Use custom Webview Views if not necessary" is a Don't; [webviews guide](https://code.visualstudio.com/api/ux-guidelines/webviews) "Only use webviews when absolutely necessary". Verify: count `registerWebviewViewProvider` and `createWebviewPanel` in the diff; each new one must carry a comment citing why the API cannot do it.
15. MUST NOT use a webview for wizards, promotions or update announcements; use a notification for the announcement. Rationale: [webviews guide](https://code.visualstudio.com/api/ux-guidelines/webviews) Don't use for wizards or promotions, and "Open on extension updates (ask via a Notification instead)". Verify: grep the webview entry points for onboarding steps, sponsor or upgrade text and `onDidChangeExtensions`-style update triggers.
16. MUST apply web-UI state rules (loading, empty, error, partial, stale; keyboard, contrast, labels) to webview HTML, and MUST NOT demand them of native surfaces. Rationale: VS Code supplies accessibility only for native surfaces; the [webviews guide](https://code.visualstudio.com/api/ux-guidelines/webviews) hands accessibility (contrast, ARIA labels, keyboard navigation) to the extension for webviews. Verify: the rule's scope line names `src/webview/**` and any `html.ts` template; a reviewer applies the native-surface table elsewhere.
17. MUST give any CSS animation in a webview a `vscode-reduce-motion` override, and MUST test in a high-contrast theme. Rationale: the [webview guide](https://code.visualstudio.com/api/extension-guides/webview) applies `vscode-reduce-motion` to `body` and says "always test your webview in high-contrast mode". Verify: every `@keyframes` or `animation:` in `src/webview/**/*.css` has a selector containing `vscode-reduce-motion` that sets `animation: none`: `git grep -nE 'animation:' -- 'src/**/*.css'` against `git grep -nE 'vscode-reduce-motion' -- 'src/**/*.css'`. Fails today at `details.css:1366`. Whether `@media (prefers-reduced-motion)` also fires inside a VS Code webview is not verified; use the class.
18. MUST use `--vscode-*` tokens for colour in webviews, with any hex only as a `var()` fallback. Rationale: [webviews guide](https://code.visualstudio.com/api/ux-guidelines/webviews) "Ensure all elements in the view are themeable". Verify: `git grep -nE '#[0-9a-fA-F]{3,8}\b' -- 'src/**/*.css'` minus lines containing `var(--vscode-` is empty. Passes today on the sampled lines.
19. SHOULD persist webview UI state with `getState`/`setState` and MUST comment any `retainContextWhenHidden: true`. Rationale: [webview guide](https://code.visualstudio.com/api/extension-guides/webview): `retainContextWhenHidden` "has high memory overhead and should only be used when other persistence techniques will not work". Verify: `git grep -n retainContextWhenHidden -- src`; every non-comment hit carries a comment naming why. This repo: 0 uses (a comment at `sidebar.ts:316` explains the choice).

Dropped from the first draft: "MUST NOT put actions on a pure information notice" (the old rule 3). It argued against itself: the update and install prompts carry actions and are decisions, so the [guide's](https://code.visualstudio.com/api/ux-guidelines/notifications) "purely informational" example is better read as a classification aid than as a rule. The classification is kept in F4 and in the decision table. Dropped also: the "welcome view is the empty state" rule, because the views page fetched this pass says only "use links instead of buttons" and "no promotions" in welcome views, and this extension contributes no tree view.

## Surface decision table (candidate for the rule)

| Message or state | Surface | Notes |
|---|---|---|
| Action succeeded and the user can see the result | none, or transient `setStatusBarMessage(text, ms)` | no toast |
| Action succeeded, result not visible (file written elsewhere) | status-bar message, or information notice | one line, no buttons |
| Wait 1 to 10 s, background | status-bar spinner with named operation | `ProgressLocation.Window`; no cancel, no percent |
| Wait over 10 s, or user-attention wait | `withProgress` Notification, cancellable, percent or stage | log link; stop work on cancel |
| Wait owned by one view | in-view loading state or `{viewId}` progress | skeleton for first paint |
| Failure the user must act on | `showErrorMessage` or `showWarningMessage` with an action | one per user action |
| Recurring background failure | deduped notice, or status-bar warning item | never repeat |
| Choice among a list, or a short series of basic inputs | quick pick (multi-step with title) | no long flows |
| Destructive or blocking confirmation | modal | out of scope: UX-ACT |
| Empty tree view | `viewsWelcome`, links over buttons | no promotion |
| Rich custom UI the API cannot give | webview view, as a last resort | owner decision |
| Persistent workspace-wide status | one status-bar item, left | one item |

## Notification budget (candidate)

At most 1 notification per user action; at most 1 unsolicited notification per session start; none for confirmations of visible results; none from a watcher without dedupe; each recurring prompt has "Do not show again" or a daily throttle. The qualitative parts come from the [notification guide](https://code.visualstudio.com/api/ux-guidelines/notifications) (one at a time, combine, no repeats, Do not show again). The numeric ceilings are this dive's proposal, not a platform number: no VS Code page states a limit on notification count, a timeout value or a character limit (checked on all five guideline pages 2026-11-27).

## AI-agent angle

- An agent defaults to `showInformationMessage('Done')` after every command. Check: rule 1.
- An agent wraps long work in `withProgress` with `Notification` and no `cancellable`, or no token handling so cancel does nothing. Check: rule 7.
- An agent adds a second spinner or a second status-bar item per feature. Check: rule 11.
- An agent writes a webview for a list a tree view can show. Check: rule 14.
- An agent writes `catch (e) { showErrorMessage(String(e)) }` with no action and no dedupe. Check: rules 2 and 4.
- An agent hard-codes hex colours in webview CSS. Check: rule 18.
- An agent writes `retainContextWhenHidden: true` to fix a flicker. Check: rule 19.
- Training data predates the 2026 guideline pages (all show 11/25/2026); fetch the current page before quoting.

## Dated facts

All rows retrieved 2026-11-27. "Page date" for VS Code pages is the unlabelled 11/25/2026 shown near the end of each page.

| Fact | Source | Source date | Type |
|---|---|---|---|
| Notify only when absolutely necessary; one at a time; Do not show again; no repeats; progress notification as last resort, with cancel and log link | [notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications) | page date 11/25/2026 | platform |
| One status-bar item, no custom colours, loading-icon item for background work | [status-bar guideline](https://code.visualstudio.com/api/ux-guidelines/status-bar) | page date 11/25/2026 | platform |
| Placeholder on every input, title for multi-step, avoid long flows | [quick-picks guideline](https://code.visualstudio.com/api/ux-guidelines/quick-picks) | page date 11/25/2026 | platform |
| Limit webview views; progress in a view by view ID; links over buttons in welcome views | [views guideline](https://code.visualstudio.com/api/ux-guidelines/views) | page date 11/25/2026 | platform |
| Webviews only when absolutely necessary; no wizards or promotions; themeable; accessibility is the extension's job | [webviews guideline](https://code.visualstudio.com/api/ux-guidelines/webviews) | page date 11/25/2026 | platform |
| `vscode-using-screen-reader` and `vscode-reduce-motion` body classes; test in high contrast; `getState`/`setState` over `retainContextWhenHidden` | [webview guide](https://code.visualstudio.com/api/extension-guides/webview) | page date 11/25/2026 | platform |
| `setStatusBarMessage(text, hideAfterTimeout: number)` in ms; `withProgress` signature; only `Notification` supports cancel and discrete progress; `ProgressOptions.cancellable` | [API reference](https://code.visualstudio.com/api/references/vscode-api.md) | no date on the `.md` page; compiled from `vscode.d.ts` on `main`, retrieved 2026-11-27 | platform |
| 0.1 s, 1 s, 10 s limits; percent-done beyond about 10 s; signposted interrupt | [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/) | 1993, 2014 update note | independent authority |
| grim rules scope by `paths` globs only | [rule-spec.md](/home/mherwig/.cargo/git/checkouts/grimoire-16fcaa23000de496/82f4982/catalog/skills/grim-authoring/references/rule-spec.md) | no date; grim checkout 82f4982 | owner's tool (local file) |
| Counts in F3, F8 | `grimoire-rs/vscode` at `9230dcd` | commit 2026-11-24, measured 2026-11-27 | measured here |
| Timeouts 420 s and 120 s | `src/grim.ts:532-533` | measured 2026-11-27 | measured here |

## What an agent must not decide alone

- Whether to replace the single webview view with a tree view plus welcome view (architecture and product decision).
- Whether to remove the 13 user-confirmation toasts; an owner may want them as a trust signal.
- Whether a long grim operation may be cancelled safely: grim serialises on a lock and a killed child can leave partial state; cancel semantics need the CLI owner. Rule 7 depends on this answer.
- "Do not show again" persistence scope (privacy and settings surface).
- Any notification that promotes, asks for a rating, or announces an update (the guide forbids promotion and first-install feedback requests).

## Contested

- Status bar versus notification for progress. The [notification guide](https://code.visualstudio.com/api/ux-guidelines/notifications) calls notification progress a "last resort" and the [status-bar guide](https://code.visualstudio.com/api/ux-guidelines/status-bar) prefers the status bar for background work; [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/) asks for percent-done and an interrupt beyond about 10 s, and the [API](https://code.visualstudio.com/api/references/vscode-api.md) gives that only to `Notification`. Resolution used here: status bar up to about 10 s, notification beyond, and only if cancelling is safe.
- Toast confirmations. The guide says "absolutely necessary" only; many extensions confirm every action, and no independent study on user preference was fetched. Treated as the platform's recommendation, not a measured effect.
- Webview views. The [views guide](https://code.visualstudio.com/api/ux-guidelines/views) says limit them; this extension's own `CLAUDE.md` chose a webview for a rich marketplace UI the tree API cannot give. Unresolved; owner decision.

## Not fetched or not verified

- Screen-reader output and live keyboard walk-through of the webviews were not run; F8 is source grep only.
- Whether `@media (prefers-reduced-motion)` also applies inside a VS Code webview was not checked; rule 17 uses the documented class.
- Whether the VS Code pages' 11/25/2026 is an authored or a build date is unknown; no page states a version or changelog.
- The "combine them into one" sentence was read from the decision-tree image text via a summarising fetch, not from running prose.

## Sources

External, all fetched 2026-11-27 (8):

| URL | What | Date | Why |
|---|---|---|---|
| https://code.visualstudio.com/api/ux-guidelines/notifications | notification guideline (platform) | 11/25/2026 | severity, actions, budget, progress |
| https://code.visualstudio.com/api/ux-guidelines/status-bar | status-bar guideline (platform) | 11/25/2026 | loading item, one item, colours |
| https://code.visualstudio.com/api/ux-guidelines/quick-picks | quick-pick guideline (platform) | 11/25/2026 | placeholder, multi-step |
| https://code.visualstudio.com/api/ux-guidelines/views | views guideline (platform) | 11/25/2026 | webview views, view progress |
| https://code.visualstudio.com/api/ux-guidelines/webviews | webview guideline (platform) | 11/25/2026 | when not to use, accessibility |
| https://code.visualstudio.com/api/extension-guides/webview | webview guide (platform) | 11/25/2026 | theme and motion classes, state |
| https://code.visualstudio.com/api/references/vscode-api.md | API reference (platform) | not stated | setStatusBarMessage, withProgress, ProgressLocation |
| https://www.nngroup.com/articles/response-times-3-important-limits/ | NN/g (independent) | 1993, 2014 note | wait thresholds |

Local reads (not counted in `sources_fetched`):

| Path | What | Date |
|---|---|---|
| /home/mherwig/dev/grimoire-rs/vscode (commit 9230dcd) | measured extension source, including its CLAUDE.md | commit 2026-11-24 |
| /home/mherwig/.cargo/git/checkouts/grimoire-16fcaa23000de496/82f4982/catalog/skills/grim-authoring/references/rule-spec.md | grim rule spec, `paths` | checkout 82f4982 |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/config-inventory.md (lines 63-65) | origin of the 33 / 70 / 80 counts behind the map's 183 | 2026-11-27 |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/ux-topic-map.md (M066) | the map baseline | 2026-11-27 |

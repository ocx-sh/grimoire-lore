---
title: Confirmations, undo and modal dialogs for consequential GUI actions
program: product
sub_program: ux
topic: ux-consequential-actions
worker: confirmations-and-modals
date_researched: 2026-11-27
model: sonnet
sources_fetched: 14
scope: GUI confirmation versus undo, when a modal is justified (web and VS Code), wording, default button, live and test separation, way-out rule, and a measurement of the Grimoire VS Code extension and the OCX theme. Out of scope: CLI and agent actions (next dives) and non-modal channels (UX-STATE).
---

# Confirmations, undo and modal dialogs

## Table of contents

1. Summary
2. Findings (1 measurement, 2 confirm versus undo, 3 modal criteria, 4 VS Code, 5 wording and buttons, 6 default focus, 7 live and test, 8 way out, 9 typed confirmation)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Prefer undo to confirmation for anything reversible; confirm only when the action is hard or impossible to reverse (NN/g, Raskin, Vercel agree).
- A confirmation dialog is a cost; used on routine actions it trains users to click through, so it is reserved for serious or irreversible consequences.
- The Hawaii false alert (FCC report, April 2018) is the canonical failure: one generic "Are you sure?" prompt, identical for test and live, no message preview, one person able to send.
- Name the object and the outcome in the dialog, and label buttons with verbs ("Overwrite", "Keep file"), never "OK", "Yes" or "Are you sure?".
- Do not default focus to the destructive button; APG says to consider focusing the least destructive action, NN/g says no default at all is probably best.
- A modal is justified only for: risk of lost work or an irreversible action, or input that blocks a user-started process. VS Code adds: never for messages needing no response, multi-step confirmation, or actions the user did not start.
- Measured: the extension has 5 production `modal: true` sites (not 6; the sixth match is a test comment). One is a read-only info panel and violates the VS Code "no response needed" rule.
- Measured: uninstall, remove-registry and clear-token run with no confirmation and no undo in the extension. Uninstall and remove registry are recoverable by reinstall or re-add; the missing treatment is a post-action notice with an Undo or re-add path, not a modal.
- The theme ships `ConfirmDialog` with `confirmLabel = 'Confirm'`, a primary button and no danger variant, and has zero production consumers. Defaults invite the generic-label failure.
- Live and test must be separated by environment (separate keys, data, visual cue), not by one dropdown in the same screen (FCC, Stripe).
- Every confirmation must have a way out that is the cheapest key (Esc) and maps to "do nothing" (APG; VS Code `isCloseAffordance`).
- Typed confirmation is for rare, severe, irreversible actions only (NN/g, GitHub repository delete); Raskin argues it is not reliable protection.
- A deep link or agent must never carry the consent: the extension's `/vote` and `/add-registry` handlers route every write through the modal, which is the correct design.
- A confirm can only confirm what the user can see; the FCC found the Hawaii prompt did not show the message to be sent.

## Findings

### 1. Measurement of the extension and the theme

Commands run from `/home/mherwig/dev/grimoire-rs/vscode/src`: `grep -rn 'modal: true' --include='*.ts' . | grep -v test` and `grep -rn "showWarningMessage\|showInformationMessage\|showErrorMessage" --include='*.ts' .`. Theme: `grep -rn "ConfirmDialog\|AlertDialog" /home/mherwig/dev/ocx-sh/website --include='*.astro'` excluding `examples`, `test` and `ui/` itself.

Result: 5 production modal sites. The commission said 6; the sixth `modal: true` match is a comment in `test/extension.test.ts:2512`. Where docs and code disagree, the code is authoritative.

| Site (file:line) | Action | Reversible? | Frequency | Needs a modal by NN/g criteria? | Wording | Buttons / default | Undo |
|---|---|---|---|---|---|---|---|
| `extension.ts:431-435` add-registry deep link | Writes registry to config; URI is attacker-supplied | Yes (remove registry), but consent from a hostile link is the issue | Rare | Yes, as a consent gate: not user-initiated in-product | Title "add registry `alias`?", detail names exact URL and scope | One action `Add Registry`, VS Code adds Cancel; verb label, names outcome | None after |
| `views/vote.ts:165-175` vote | Posts publicly under the user's forge account | Cast: no (public post); retraction exists | Occasional | Yes: public, hard to retract | Title "This posts publicly under your forge account." Detail names reference, provider, host | `Vote` (verb), Cancel auto | Retraction path exists but is waived of its modal |
| `views/forceRetry.ts:59-63` overwrite | Re-runs add or update with `--force`, discards local edits and, on update, pruned entries | No ("This cannot be undone" in detail, `forceRetry.ts:133`) | Rare, only after a refusal | Yes: lost work, irreversible | Title "overwrite `name`?", detail states what is discarded | `Overwrite` (verb) | None |
| `views/switchReplacement.ts:70-75` switch | Installs replacement, uninstalls old, per scope | Mostly (reinstall) | Rare | Marginal: reversible; a non-modal confirm or undo would fit | One sentence names both artifacts, scopes and both effects | `Switch` | None |
| `views/grimInfo.ts:133-138` grim info | Shows version and paths, offers Copy and Show Output | n/a (read-only) | On demand | No: VS Code says do not use modals for messages that need no response | n/a | `Copy`, `Show Output` | n/a |

Actions with no confirmation and no undo:

| Site | Action | Reversible? | Verdict |
|---|---|---|---|
| `views/sidebar.ts:448-456` and `views/details.ts:682-686` `uninstall` | `grim uninstall` or `remove` | Yes by reinstall; may delete local files | No modal needed; add a notice with an Install-again action |
| `views/settings.ts:203-205` `removeRegistry` | `grim registry rm` | Yes by re-add if alias and URL known | Same: notice with the removed alias and URL |
| `views/ratingAuth.ts:98-105` `clearRatingToken` | Deletes a stored secret | No (token cannot be re-read) but re-issuable at the forge | Palette command, deliberate, one line toast names host; acceptable |
| `views/hookPrompt.ts:92` and `views/staleLock.ts:61` | Non-modal toasts with named buttons | Varies | Compliant: non-modal, verb labels |

Searching for `undo|Undo` in non-test sources returned no hits: the extension has no undo mechanism.

Theme (`/home/mherwig/dev/ocx-sh/website/packages/theme/src/components/ui/`): `ConfirmDialog.astro` defaults `confirmLabel = 'Confirm'`, `cancelLabel = 'Cancel'`, confirm is `variant="primary"`, and its own header comment says "no danger variant exists"; `Button.astro:8` allows only `'primary' | 'secondary' | 'ghost'`. `AlertDialog.astro` sets `role=alertdialog` via Zag. Zero production consumers (only examples, stories and tests). The component is correct on ARIA role but its defaults produce the generic-label pattern, and focus order is Cancel then Confirm in DOM, so first focusable is Cancel (consistent with the least-destructive rule but unverified by test here).

### 2. Confirmation versus undo

- NN/g (Nielsen, published 2018-02-18, reviewed 2026-08-07): confirmation is for "actions with serious consequences"; "go to great lengths to provide undo"; repeated confirmation makes users ignore it. [source](https://www.nngroup.com/articles/confirmation-dialog/)
- Raskin (A List Apart, 2007-07-21): "Never use a warning when you mean undo"; users habituate; Gmail's undo plus trash is the model. Historical but still the origin of the principle. [source](https://alistapart.com/article/neveruseawarning/)
- Vercel guidelines (vendor guidance; page undated, fetched 2026-11-27): "Require confirmation or provide Undo with a safe window." [source](https://vercel.com/design/guidelines)
- WCAG 2.2 SC 3.3.4 (Level AA): for legal, financial or data-deleting submissions at least one of reversible, checked, or confirmed must hold. This is the accessibility-law form of the same rule. [source](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html)
- GitHub keeps some deleted repositories restorable for 90 days, a recovery window instead of only a prompt (vendor data; docs page undated, fetched 2026-11-27). [source](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository)

Decision table (severity tiers):

| Tier | Definition | Required treatment |
|---|---|---|
| T0 | Reversible, local, cheap (rename, toggle, uninstall of a reinstallable package) | Do it; show result with Undo or re-do action; no dialog |
| T1 | Reversible but costly, or affects shared state (switch artifact, remove registry) | Do it with Undo for a safe window, or one confirmation naming object and outcome if undo is impossible |
| T2 | Irreversible local loss (overwrite local edits, delete without trash) | Confirmation naming object and what is lost; verb button; non-destructive default |
| T3 | Irreversible external or public effect (public post, payment, send) | Modal-class confirmation that shows the exact content and destination; consider second approver |
| T4 | Rare, catastrophic, bulk (delete repository or account, "all") | T3 plus typed confirmation or another person; recovery window where feasible |

### 3. When a modal is justified (web and GUI)

NN/g (Fessenden, 2017-04-23): justified for critical warnings (risk of lost work, irreversible action), required input that blocks a user-started process, and complex workflows (a full page may be better). Criteria questions: is the error irreversible, is the dialog tied to the user's current goal, is it a high-stakes flow like checkout (avoid), does the decision need information the modal does not show (then it is the wrong element). Drawback: blocks the content the user may need to decide. [source](https://www.nngroup.com/articles/modal-nonmodal-dialog/) Note that a 2017 article is a long-standing but old source; the FCC and APG sources below corroborate it.

APG alertdialog: the container has `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` the title and `aria-describedby` the message; mark a dialog modal only when code blocks outside interaction and styling obscures it. No last-updated date on the page (footer 2026). [source](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)

APG modal dialog: Esc closes; Tab and Shift+Tab are trapped; for hard-to-reverse final steps "it may be advisable to set focus on the least destructive action". [source](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

GOV.UK: warning button only for serious destructive, hard-to-undo actions, used very sparingly; label describes action in sentence case ("Delete account"); do not rely on red alone; use a different style for the initial call to action and the warning button for the final confirmation. No update date on the page; the Button component's latest change is dated Jul 2026 (v6.4.0). [source](https://design-system.service.gov.uk/components/button/)

### 4. VS Code

- VS Code API (vscode.d.ts, main branch, fetched 2026-11-27): `MessageOptions.modal` "Indicates that this message should be modal."; `detail` is "rendered less prominent"; `MessageItem.isCloseAffordance` is "a hint for modal dialogs that the item should be triggered when the user cancels the dialog" and is ignored for non-modal messages. [source](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts)
- VS Code Notifications UX guidelines (dated 11/25/2026): modals "should be used with caution because a modal dialog blocks user interactions outside the dialog"; use only when immediate interaction is needed; do not use them to confirm multiple steps, to show messages that need no response, or for actions the user did not explicitly start; offer "Always"/"Never" or a remember-choice option where appropriate; do not show actions when there are none. [source](https://code.visualstudio.com/api/ux-guidelines/notifications)

Gap: I could not source from the API docs what a modal returns on Esc when no `isCloseAffordance` item exists, nor which button is focused first. Existing code treats any value other than the confirm label as cancel (`choice !== 'Overwrite'`), which is safe for both. The doc comment on `isCloseAffordance` is the only fetched statement. Treat default-focus in VS Code as unverified; test it in the Extension Development Host.

Consequences for the extension: the add-registry modal exists because the action was not started by the user (a URI), and VS Code says to avoid modals for actions the user did not start. Here the guideline's concern is reversed: the modal is the consent gate for an externally triggered write, which the extension comment calls out explicitly (`extension.ts:396-403`). That is a justified exception: external trigger plus a write plus attacker-supplied values means the dialog must name the exact URL, alias and scope, which it does. The grim-info modal has no such justification.

### 5. Wording and buttons

NN/g: restate the request and consequence; avoid "Are you sure you want to do this?"; avoid Yes/No; use outcome labels such as "Delete file" and "Keep file"; name the item, and for bulk actions the count. [source](https://www.nngroup.com/articles/confirmation-dialog/) [GOV.UK](https://design-system.service.gov.uk/components/button/): sentence-case verb labels. [Vercel](https://vercel.com/design/guidelines) (undated; fetched 2026-11-27): "Labels are clear & specific", "Save API Key" not "Continue".

[FCC](https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf) (final report, April 2018; text re-verified 2026-11-27 by extracting the PDF): the Hawaii prompt read "Are you sure that you want to send this Alert?", was identical for test and live, and did not allow reviewing the message text. HI-EMA's own recommended revision named the action (`Are you sure you want to send a "Real World Ballistic Missile Alert"`). [source](https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf)

Correct and incorrect:

```text
Incorrect: "Are you sure?"  [Yes] [No]
Correct:   title  "Overwrite `my-skill`?"
           detail "Reinstalling discards your local changes to `my-skill`. This cannot be undone."
           [Overwrite]   (Cancel via Esc)
```

The extension's `forceRetry.ts` and `vote.ts` modals match the correct form. `switchReplacement.ts` puts the whole question in the title and has no `detail`; acceptable but the verb `Switch` omits the object (see Rule 8).

### 6. Default button

[APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): consider focus on the least destructive action for irreversible steps. [NN/g](https://www.nngroup.com/articles/confirmation-dialog/): do not default to "Yes"; no default at all may be best. Apple HIG and Material 3 were attempted but the pages returned no body text; no claim from them is made here. Decision: the destructive control is never the focused or Enter-bound default; Cancel (or the non-destructive option) is the initial focus; where the framework fixes focus on the first action (VS Code), accept that and rely on verb labels and the Esc path.

### 7. Live and test separation

FCC: Hawaii's software offered an internal "Test missile alert" and the live "Missile alert" in one drop-down, on the same screen and credentials; industry practice is a separate user-selectable live domain at login or a separate application, with visual cues (watermark, colour). Recommendations: separate live from test environments, a prompt that names the specific alert, more than one credentialed person to validate high-impact alerts and all tests, and test messages that avoid "This is Not a Drill". [source](https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf)

Stripe (vendor data; docs page undated, fetched 2026-11-27): API objects in one mode are not accessible from the other, separate keys per mode, test card numbers valid only in sandboxes; the legacy test mode shares some settings with live mode, a documented hazard. [source](https://docs.stripe.com/test-mode)

### 8. Way out

[APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): Esc closes. VS Code: `isCloseAffordance` marks the item triggered on cancel ([vscode.d.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts)); an explicit Cancel is present. A retraction path matters ([FCC report](https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf)): the report states the false alert was followed by "38 minutes to issue a correction using EAS and WEA" (text extracted from the PDF 2026-11-27, report dated April 2018). For a public effect the correction path is itself a requirement. For a public effect the correction path is itself a requirement.

### 9. Typed confirmation

[NN/g](https://www.nngroup.com/articles/confirmation-dialog/): for the most dangerous rare actions require something unusual, such as typing a word; reserve it. [GitHub's repository delete flow](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository) (page undated; fetched 2026-11-27): Danger Zone, "I want to delete this repository", acknowledge warnings, type the repository name, then delete; "Some deleted repositories can be restored within 90 days of deletion" (same page). [Raskin](https://alistapart.com/article/neveruseawarning/) counters that typing distracts and does not reliably prevent loss. Net: typed confirmation fits T4 only, and typing the object name (not the word DELETE) forces the user to read which object.

## Normative guidance candidates

Each rule's severity is the leading keyword (MUST, MUST NOT, SHOULD); every rule below carries one, and the `Severity:` tag is repeated per rule for machine reading.

1. [Severity: MUST] MUST: Classify every destructive or externally visible action into tiers T0 to T4 (above) before designing its UI. Rationale: treatment follows consequence, not habit. Verify: the PR or spec lists each such action with tier, reversibility and treatment; reviewer greps changed files for `delete|remove|uninstall|overwrite|reset|force|publish|post` and checks each hit has a tier.
2. [Severity: MUST] MUST: Do not add a confirmation to a reversible action; give Undo or a re-do action in the result notice instead. Rationale: confirmation habituates (NN/g, Raskin). Verify: for each confirm dialog, answer "can the user recover within the product?"; if yes, fail. Fail example: modal before `uninstall` of a reinstallable artifact. Pass example: toast "Uninstalled `x`" with action `Install again`.
3. [Severity: MUST] MUST: Provide a confirmation for T2 and above. Rationale: WCAG 3.3.4 and Vercel. Verify: handler for each T2+ action awaits a confirmation result before issuing the mutation; unit test asserts the mutation is not called when the answer is cancel or dismissed (the extension tests already do this for overwrite and vote).
4. [Severity: MUST] MUST: Confirmation text names the object and the outcome, and for bulk actions the count. Rationale: NN/g; FCC. Verify: the dialog string contains the object identifier variable and a verb; grep fails on `Are you sure`, `Do you want to continue`, `Confirm?` as a whole message. Reading heuristic: cover the screen behind the dialog; can a reader say what will be lost?
5. [Severity: MUST] MUST: Button labels are verbs naming the action (`Overwrite`, `Delete account`), sentence case, never `OK`, `Yes`, `Confirm` or `Continue` for a consequential action. Rationale: NN/g, GOV.UK, Vercel. Verify: grep component call sites for `confirmLabel` omitted (default `Confirm`) and for `'Yes'`, `'OK'` as the confirm choice; the theme `ConfirmDialog` must require `confirmLabel` for consequential use.
6. [Severity: MUST] MUST: The destructive control is not the initially focused or Enter-default control where the framework allows setting it. Rationale: APG; NN/g. Verify: DOM test asserts `document.activeElement` after open is the cancel control or the title (`tabindex=-1`); for VS Code, manual check in the Extension Development Host, recorded in the PR.
7. [Severity: MUST] MUST: Every confirmation is dismissible with Esc and dismissal equals cancel. Rationale: APG; `isCloseAffordance`. Verify: test that `undefined` (dismiss) and the cancel value both result in no mutation; grep code for `choice !== '<ConfirmLabel>'` or `choice === '<ConfirmLabel>'` patterns (not `choice !== 'No'`, which treats dismiss as yes).
8. [Severity: SHOULD] SHOULD: Where a modal title carries the whole question, still put the object in the confirm label if the label would otherwise be ambiguous with another dialog (`Switch` is acceptable only because the title names both artifacts). Rationale: labels read out of context by screen readers and in logs. Verify: reviewer reads the button label alone; pass `Overwrite`, `Delete account`; fail `Switch`, `Go`.
9. [Severity: MUST] MUST (VS Code): Use `{ modal: true }` only for (a) an irreversible or lost-work action the user started, or (b) consent for a write or public effect triggered from outside the UI (URI, link, agent). Rationale: VS Code Notifications guideline. Verify: `grep -rn 'modal: true' --include='*.ts' src | grep -v test` and for each hit record which of (a) or (b) applies; zero unclassified hits. Fail: `grimInfo.ts:135` (read-only).
10. [Severity: MUST] MUST (VS Code): Do not use a modal for messages needing no response, for multi-step confirmation, or for an action the user did not start unless it is a consent gate under rule 9(b). Rationale: VS Code guidelines. Verify: same grep; a modal whose buttons are only informational (`Copy`, `Show Output`) fails.
11. [Severity: SHOULD] SHOULD (VS Code): Prefer a non-modal `showWarningMessage` with named actions for T1 and for repairs (stale lock, hook prompt) and a modal for T2 and above. Rationale: non-modal does not block the workbench. Verify: tier of each call site matches its modality in the audit table.
12. [Severity: MUST] MUST: A deep link, URI handler or agent call never itself authorises a write; a confirmation shown to the human, worded from the resolved parameters, does. Rationale: attacker-supplied input. Verify: handler tests assert the mutation is not invoked without the dialog result (existing in `extension.test.ts`); grep handler for a write call reachable before the `showWarningMessage` await.
13. [Severity: MUST] MUST: The confirmation shows the exact content or destination that will be affected (URL, scope, reference, host), not a paraphrase from untrusted input. Rationale: FCC found Hawaii's prompt offered no preview. Verify: the dialog builder takes the resolved values (as `addRegistryPrompt` does) and a test asserts the strings appear in `detail`.
14. [Severity: MUST] MUST: Live and test are separated by environment: distinct credentials or keys, no shared screen listing both, a persistent visual cue (colour, banner or watermark) for the non-live mode, and the confirm text states which mode. Rationale: FCC; Stripe. Verify: grep UI for a single selector listing test and live actions together; for an API, a test key must be rejected by live endpoints (Stripe-style) and vice versa.
15. [Severity: MUST] MUST: Test or drill messages never use the wording of a live one ("This is not a drill", "Real world"). Rationale: FCC recommendation. Verify: grep fixtures and templates for the phrases.
16. [Severity: MUST] MUST: Any action with a public or irreversible external effect (T3) has a documented correction path before launch. Rationale: Hawaii's 38-minute correction. Verify: spec names the retraction or correction mechanism; vote retraction is an example.
17. [Severity: SHOULD] SHOULD: T4 actions require typed confirmation of the object name, or a second person, and offer a recovery window where the platform can. Rationale: NN/g; GitHub. Verify: the confirm button is disabled until the typed value equals the object name; reviewer checks T4 list is under five items per product (frequent use makes it automatic).
18. [Severity: MUST NOT] MUST NOT: Use red or colour alone to signal severity. Rationale: GOV.UK. Verify: the destructive control carries a verb label and an icon or text; check with greyscale screenshot.
19. [Severity: SHOULD] SHOULD: Offer a "don't ask again" or remember-choice option for T1 confirmations that recur, never for T3 and T4. Rationale: NN/g customisation; VS Code guideline. Verify: setting key exists and T3 sites do not read it.
20. [Severity: SHOULD] SHOULD: A dialog component used for confirmation requires `title`, `confirmLabel` and a destructive variant, and renders `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`. Rationale: APG. Verify: grep `role="alertdialog"` and `aria-describedby` in the rendered HTML; component prop types make `confirmLabel` required.

## Dated facts

| Fact | Source | Date the source states | Source type |
|---|---|---|---|
| Confirm for serious consequences; offer undo; avoid yes/no; typed word for rare dangerous actions | [NN/g Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/) | Published 2018-02-18, last reviewed 2026-08-07 | Independent research firm |
| Modal criteria and drawbacks | [NN/g Modal and Nonmodal](https://www.nngroup.com/articles/modal-nonmodal-dialog/) | Published 2017-04-23 | Independent research firm |
| "Never use a warning when you mean undo" | [A List Apart](https://alistapart.com/article/neveruseawarning/) | 2007-07-21 | Practitioner essay |
| alertdialog requires role, `aria-modal`, `aria-labelledby`, `aria-describedby` | [APG alertdialog](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) | No update date; footer 2026 | Authority (W3C) |
| Esc closes; focus trap; consider least destructive focus | [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | No update date | Authority (W3C) |
| SC 3.3.4 Level AA: reversible, checked or confirmed | [WCAG 2.2 Understanding 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | Understanding page last updated 16 September 2025 (page-stated; fetched 2026-11-27) | Authority (W3C) |
| Warning button sparingly; verb label | [GOV.UK Design System Button](https://design-system.service.gov.uk/components/button/) | No date on section; Button last changed Jul 2026 (v6.4.0) | Platform authority |
| "Require confirmation or provide Undo with a safe window" | [Vercel guidelines](https://vercel.com/design/guidelines) | Page undated; fetched 2026-11-27 | Vendor guidance |
| Modal discouraged for no-response, multi-step or user-unstarted actions | [VS Code Notifications UX](https://code.visualstudio.com/api/ux-guidelines/notifications) | 11/25/2026 | Platform |
| `MessageOptions.modal`, `detail`, `isCloseAffordance` | [vscode.d.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts) | main, fetched 2026-11-27 | Platform |
| Hawaii false alert 2018-01-13; 38 minutes to correct; generic prompt; live and test in one menu; no second approver | [FCC PSHSB final report](https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf) | April 2018 | Regulator (primary) |
| Test and live objects inaccessible across modes; test cards valid only in sandboxes | [Stripe testing](https://docs.stripe.com/test-mode) | Page undated; fetched 2026-11-27 (sandbox/live isolation, test cards valid only in sandboxes, legacy test mode shares settings with live) | Vendor data |
| Some deleted repositories restorable within 90 days; typed repository name | [GitHub docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository) | Page undated; fetched 2026-11-27 | Vendor data |

## What an agent must not decide alone

- Whether a product action is T3 or T4 when it involves money, legal commitment, public speech or other people's data: the owner decides the tier.
- Retention and recovery windows (how long a deleted item stays restorable); they carry cost and legal consequences.
- Who may approve a high-impact action (second approver, role): organisational policy.
- Whether to wire "don't ask again" for any action touching external parties.
- Final wording of dialogs for legal, consent or privacy disclosures (for example the vote disclosure): brand and legal review.
- Removing an existing confirmation: requires the owner, because the original author may have had an incident behind it.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Generates `confirm('Are you sure?')` or `window.confirm` for every delete | grep `confirm(` and `Are you sure` in changed files |
| Adds a modal for a reversible action instead of Undo | Rule 2 reading check; list every new `modal: true` and require a tier |
| Treats `choice !== 'No'` as consent so Esc proceeds | grep `!== 'No'`; test dismiss path |
| Uses "OK/Cancel" or the component default `Confirm` | grep `confirmLabel` omitted; grep `'OK'` |
| Makes the destructive button primary, auto-focused or bound to Enter | DOM test for `activeElement` |
| Puts test and live in one dropdown or one flag | grep for a mode select next to the action list; require separate keys |
| Lets a deep link or tool call write without human dialog | handler test with no dialog result asserts no mutation |
| Uses a modal for informational output (as `grimInfo.ts`) | classify each modal under rule 9; informational buttons only means fail |
| Uses typed "DELETE" everywhere | count typed-confirm sites; more than a few means overuse |
| Relies on colour only (red) | greyscale screenshot check |

## Contested / evolving

- Undo versus confirmation: Raskin and NN/g agree undo is better where feasible; NN/g still keeps confirmation for irreversible actions, and Vercel allows either. Disagreement is only on where the line is. Trend (2026): undo with a window is the default for consumer UI; confirmation retained for T2 and above.
- Typed confirmation: NN/g endorses it for rare dangerous actions; Raskin argues effort distracts and does not reliably prevent loss. GitHub uses it for repository deletion with a 90-day restore for some repositories, so the practice of typing plus recovery is combined rather than chosen.
- Default focus: NN/g suggests no default may be best; APG says least destructive; neither is a rule for platforms where the framework fixes focus (VS Code). Unresolved: VS Code's first-button focus was not sourced.
- Modal in VS Code for external triggers: the guideline discourages modals for actions the user did not start, while security practice requires an in-product consent gate for externally triggered writes. The extension resolves this in favour of the modal. A non-modal toast with a button was not found in any source as an equivalent safety design.
- Apple HIG and Material 3 dialog guidance were not retrievable (pages returned no body). Cross-platform alignment on default button and destructive style is therefore unsourced here and left to a later pass.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://www.nngroup.com/articles/confirmation-dialog/ | NN/g confirmation dialog article | 2018-02-18, reviewed 2026-08-07 | Core criteria, wording, typed confirmation |
| https://www.nngroup.com/articles/modal-nonmodal-dialog/ | NN/g modal criteria | 2017-04-23 | When a modal is justified |
| https://alistapart.com/article/neveruseawarning/ | Raskin, undo over warnings | 2007-07-21 | Origin and habituation argument |
| https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/ | APG alert dialog (primary) | Undated, current 2026 | Roles and attributes |
| https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | APG modal dialog (primary) | Undated, current 2026 | Esc, trap, least destructive focus |
| https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html | WCAG 2.2 SC 3.3.4 (primary) | Page updated 2025-09-16 | Normative floor |
| https://design-system.service.gov.uk/components/button/ | GOV.UK warning button (primary) | Jul 2026 component change | Sparing use, verb label, two-step |
| https://vercel.com/design/guidelines | Vercel guidelines | Undated; fetched 2026-11-27 | Confirm or undo rule |
| https://code.visualstudio.com/api/ux-guidelines/notifications | VS Code UX guidelines (primary) | 11/25/2026 | When modal is allowed in VS Code |
| https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts | VS Code API typings (primary) | main, 2026-11-27 | `modal`, `detail`, `isCloseAffordance` |
| https://docs.fcc.gov/public/attachments/DOC-350119A1.pdf | FCC PSHSB final report on Hawaii false alert (primary) | April 2018 | Prompt, test and live, two-person findings |
| https://docs.stripe.com/test-mode | Stripe test mode and sandboxes (vendor) | Undated; fetched 2026-11-27 | Live and test separation |
| https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository | GitHub delete flow (vendor) | Undated; fetched 2026-11-27 | Typed confirmation and 90-day restore |
| https://docs.fcc.gov/public/attachments/DOC-350128A1.pdf | FCC commissioner statement on final report | 2018-04-10 | Confirms release date and 38-minute figure (statement only, not the report) |
| /home/mherwig/dev/grimoire-rs/vscode/src (see Findings 1) | Measured code | 2026-11-27 | The 5 modal sites and unconfirmed actions |
| /home/mherwig/dev/ocx-sh/website/packages/theme/src/components/ui/ConfirmDialog.astro | Measured theme component | 2026-11-27 | Defaults and missing danger variant |

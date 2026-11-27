---
title: Form state machine, labels, validation timing, error placement and focus, preserved input, submit state
program: product
sub_program: ux
topic: ux-interface-states
worker: form-state-machine
date_researched: 2026-11-27
model: sonnet
sources_fetched: 26
scope: Behaviour of forms and input controls on web pages, webviews and VS Code input boxes. Covers labels, validation timing, error placement and focus, preserved input, submit state, required and optional marking, autocomplete. Out of scope, by the commission - error message wording (UX-TEXT error-message-anatomy) and long-form or wizard design (deferred). Fetch count - all 26 URLs in Sources were opened in the 2026-11-27 repair pass (25 by web fetch; the vscode.d.ts GitHub page returned only chrome, so the raw file was read with curl); `sources_fetched: 26`. Known gap - the scout rows (CG5 and the others) were not found by ID in the scout files, so the work went straight to the primary sources the commission names.
---

# Form state machine

## Table of contents

1. Summary
2. Findings (1 fleet measurements, 2 labels, 3 validation timing, 4 error placement and focus, 5 preserved input, 6 submit state, 7 required and optional, 8 autocomplete and input types, 9 VS Code input boxes)
3. Normative guidance candidates
4. What an agent must not decide alone
5. AI-agent angle
6. Contested / evolving
7. Dated facts
8. Sources

## Summary

- Every input has a visible, programmatically associated label; a placeholder is never the label ([GOV.UK text input](https://design-system.service.gov.uk/components/text-input/), [NN/g placeholders, 2014, reviewed 2018](https://www.nngroup.com/articles/form-design-placeholders/)).
- Default timing: validate on submit and always run the server check. Add field-level validation on blur only for fields with a format rule, never on focus or first keystroke. Sources disagree on blur (see Contested); this rule picks the intersection that no source forbids ([GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/), [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/), [Smashing 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/), [Baymard 2024, vendor data](https://baymard.com/blog/inline-form-validation)).
- After a failed submit, show an error summary at the top, move focus to it, and put an error message next to each failing field ([GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/)).
- Each field error is linked to its input with `aria-describedby`; the input gets `aria-invalid="true"` only after validation fails, never on load ([MDN aria-invalid, modified 2026-11-16](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid)).
- Never clear the form on failure; keep what the user typed ([GOV.UK error message, change of January 2024](https://design-system.service.gov.uk/components/error-message/); WCAG 3.3.7 Redundant Entry, Level A, [updated 2025-09-17](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)).
- Do not disable the submit button because the form is invalid. [GOV.UK says to avoid disabled buttons](https://design-system.service.gov.uk/components/button/); [Adam Silver, 2023-05-14, gives the reasons](https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/). A button is disabled only while a submit is in flight, and then it shows progress.
- Mark optional fields with "(optional)" and never mark required fields with asterisks ([GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/)). [NN/g, 2019-06-16](https://www.nngroup.com/articles/required-fields/) and the [W3C WAI forms tutorial, 2019-07-27](https://www.w3.org/WAI/tutorials/forms/validation/) allow asterisks or "(required)". The rule: pick one convention per product, mark all fields of the minority kind, and also set `required`.
- Set `autocomplete` on every field that collects data about the user ([WCAG 1.3.5, Level AA, updated 2026-09-08](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html)). Do not use `autocomplete="off"` to dodge password managers ([MDN, modified 2026-08-27](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)).
- Fleet measurement: the VS Code settings webview pre-disables its submit button (`addRegistryDraftValid`), has no `aria-describedby` or `aria-invalid` anywhere, and its per-row errors have no `role="alert"` and no focus move. The one registry-form error does have `role="alert"` and a focus move to the form title.
- VS Code `showInputBox`: the extension's `pin` input has no `validateInput`; the rating-host input has it. `validateInput` with Error severity blocks Enter by itself ([vscode.d.ts, fetched 2026-11-27](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts)), so it is the correct native "do not accept yet" mechanism and it is not a pre-disabled button.

## Findings

### 1. Fleet measurements

Paths relative to `/home/mherwig/dev`. Date of measurement 2026-11-27, working trees as found. Inventory command (run from each source dir): `git ls-files | xargs grep -nE '<(form|input|textarea|select|button)\b|<label\b|aria-describedby|aria-invalid|\bdisabled\b|autocomplete|novalidate|\brequired\b'`.

| Form or input | Where | Label source | Validation trigger | Error placement | `aria-describedby` / `aria-invalid` | Focus after failed submit | Preserved input | Submit `disabled` logic |
|---|---|---|---|---|---|---|---|---|
| Add / edit registry form | `grimoire-rs/vscode/src/webview/settings/render.ts:563-590` | Wrapping `<label class="form-field">` with `<span class="form-label">` (good); locator also has a placeholder, as a hint only | Server round trip on submit; `addRegistryDraftValid` is client side, non-empty only (`model.ts:470`) | One `role="alert"` line above the buttons (`render.ts:518-523`), not next to a field | none / none (`grep -c 'aria-describedby\|aria-invalid' settings/render.ts` is 0) | Moves to `.form-title` (`tabindex="-1"`) after a rejected save (`settings/main.ts:316-320`) | Draft kept in state (`addRegistry.draft`); form is `inert` during save | `?disabled="${saving \|\| !addRegistryDraftValid(draft)}"` at `render.ts:584`: pre-disabled until alias and locator are non-empty. Violates the never-pre-disable rule below |
| Settings text and number rows | `settings/render.ts:93-109`, `renderRow` at `:177-193` | No `<label>`; the row title is a `<span class="row-title">`, so the input has no accessible name | Commit on `focusout` (`settings/main.ts:825-850`) and on `change`, i.e. validate on blur, then write | `.row-error` div under the control (`render.ts:181`); no `role` | none / only an `.error` CSS class | none (no `.focus()` call for rows) | Value kept; `.value` property binding keeps display in sync on revert (`render.ts:95-102`) | No submit button; each row commits itself |
| Chip add input, pattern add input | `settings/render.ts:139, 487-494` | Pattern input `aria-label="Add ${field} pattern"`; chip input has only `placeholder="Add separator…"` | Commit on `focusout` (`main.ts:831-846`) | Row error (client guard `isValidChip`) | none / none | Focus returned to the add box after commit (`focusPatternAdd`, `main.ts:300-308`) | Kept | none |
| Sidebar search | `grimoire-rs/vscode/src/webview/render.ts:1144` | `placeholder` only; `vscode-textfield` has no `label` or `aria-label` in the template | Live filter, no validation | n/a | none / none | n/a | `value="${state.query}"` | none |
| Sort select | `render.ts:1119` | `aria-label="Sort by"` | n/a | n/a | n/a | n/a | n/a | n/a |
| Rating vote | `render.ts:150-175` | Button with three explicit label texts for voted, not-voted, unknown | n/a (action, not a form) | n/a | `aria-pressed` | n/a | n/a | none |
| `showInputBox` pin tag | `grimoire-rs/vscode/src/extension.ts:275-278` | `prompt` text | None: no `validateInput`; a bad tag fails later in `grim add` and surfaces as a notification | notification | n/a | n/a | Box closes, input lost | n/a |
| `showInputBox` rating token | `src/views/ratingAuth.ts:79-86` | `title` and `prompt` | None needed | n/a | n/a | n/a | `ignoreFocusOut: true` so a stray click does not lose a pasted token | n/a |
| `showInputBox` rating host | `src/views/ratingAuth.ts:115-124` | `title`, `prompt`, `placeHolder` | `validateInput` per keystroke, returns a message for non-hosts | VS Code native | n/a | n/a | `ignoreFocusOut: true` | VS Code blocks Enter on Error severity |
| Theme search field and select | `ocx-sh/website/packages/theme/src/components/ui/SearchField.astro:14-39`, `Select.astro:9, 29` | `label` prop is required in the type; `hideLabel` defaults to true so the label is for assistive tech only, and the placeholder defaults to the label text | none | `Select` doc comment: pass `aria-invalid="true"` and "pair it with your own message" | `aria-*` forwarded to the trigger | n/a | n/a | n/a |
| Terminal seek range | `ocx-sh/website/packages/theme/src/components/Terminal.astro:111-120` | `aria-label="Seek"` | n/a | n/a | n/a | n/a | n/a | `disabled` until the cast loads, then enabled; legitimate (it is a control, not a submit) |
| `grim-gui` | `grimoire-rs/grim-gui/src` | 0 form controls | n/a | n/a | n/a | n/a | n/a | n/a (`grep -cE '<(button\|input\|select\|textarea\|label)\b' index.html src/*.ts` is 0, per `product-audit/ui-code-posture.md`) |
| Docs sites (Grimoire docs, ocx.sh landing) | `grimoire-rs/grimoire/docs/src`, `ocx-sh/website/site/src` | 0 forms; the Grimoire docs removes Starlight's theme `<select>` (`ThemeSelect.astro`) | n/a | n/a | n/a | n/a | n/a | n/a |

Reading: the fleet's only real submit form is the registry form. It has good label association, preserved draft, `role="alert"`, and a deliberate focus move, and it fails the never-pre-disable rule and field-level error association. The settings rows have no accessible name for their inputs, which matches the WebAIM finding that 51% of home pages have unlabeled inputs ([WebAIM Million 2026, last updated 2026-03-30, independent study](https://webaim.org/projects/million/)).

### 2. Labels

- GOV.UK: "All text inputs must have labels, and in most cases the label should be visible." Do not use placeholder text in place of a label, hint or example: it disappears on typing, not all screen readers read it, and default placeholder styles fail contrast 1.4.3 ([GOV.UK text input](https://design-system.service.gov.uk/components/text-input/), authority; the page lists changes up to June 2026).
- NN/g lists seven harms of placeholder-as-label: memory strain, hard to check work, hard to fix errors, keyboard disruption, lower visibility of filled fields, mistaken defaults, cleanup ([NN/g, published 2014-05-11, reviewed 2018-09-10](https://www.nngroup.com/articles/form-design-placeholders/), independent practitioner research firm).
- WCAG 3.3.2 Labels or Instructions (Level A): "Labels or instructions are provided when content requires user input." Technique H44 (`label` element) is sufficient on its own; F82 (phone field without a text label) is a listed failure ([W3C Understanding 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), authority).
- A visually hidden label is acceptable when the purpose is shown otherwise (a search field with icon and submit); the fleet's theme `SearchField` does this with `hideLabel`.

Correct and incorrect:

```html
<!-- correct -->
<label for="alias">Alias</label>
<input id="alias" name="alias" type="text" autocomplete="off">

<!-- incorrect: placeholder is the only name -->
<input name="alias" placeholder="Alias">
```

### 3. Validation timing

The sources split, so the table gives each position with its source.

| Source | Position | Date and kind |
|---|---|---|
| GOV.UK validation pattern | "Do not validate when the user moves away from a field." Wait until the user tries to move on; "avoid validating the information in a field before the user has finished entering it". Always validate server side; "Only add client side validation if you find a user need for it." ([page](https://design-system.service.gov.uk/patterns/validation/)) | No date stated; authority |
| NN/g form errors | "Ideally, all validation should be inline"; do not show errors until the user has finished the field and moved on ([article](https://www.nngroup.com/articles/errors-forms-design-guidelines/)) | Published 2019-02-03, reviewed 2024-12-12; independent research firm |
| Smashing, Vitaly Friedman | Late validation (on blur) "almost always performs better"; do not validate on focus of an empty field; validate empty fields on submit only; show at once only for input that "can't be right" (malformed VAT number, a letter in a digits-only code); "reward early, punish late" (validate at once while editing a field that already shows an error; wait for blur on a field that was valid); live validation for password strength, username availability, character count ([article](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)) | 2022-09-21; practitioner |
| Baymard | Avoid premature validation; validate on blur for most fields; for fixed-length input validate at full length; recheck on every keystroke once an error shows and clear it as soon as valid; 31% of sites in its e-commerce benchmark have no inline validation (the video summary says 32%) ([article](https://baymard.com/blog/inline-form-validation)) | 2024-01-09; vendor data (a commercial research firm selling audits) |
| W3C WAI forms tutorial | Use native input types and `pattern`; validate on the server too, since client-side validation "can also be easily bypassed" ([tutorial](https://www.w3.org/WAI/tutorials/forms/validation/)) | Updated 2019-07-27; authority |
| WCAG 3.3.1 Understanding | Native browser validation often moves focus to the first field in error, with generic messages and one error at a time; re-displaying a form with no text hint fails the criterion ([page](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)) | Updated 2026-11-02; authority |

State machine for one field, as the rule encodes it:

```
pristine --(blur, non-empty, rule fails)--> invalid
pristine --(blur, empty)------------------> pristine        (empty is judged on submit only)
pristine --(submit)-----------------------> invalid | valid
invalid  --(each keystroke, rule passes)--> valid            (reward early: error clears at once)
valid    --(blur, rule fails)-------------> invalid          (punish late)
any      --(focus alone, first keystroke)-> no change         (no premature validation)
```

### 4. Error placement and focus

- GOV.UK error summary: "Always show an error summary when there is a validation error, even if there's only one." Move keyboard focus to the summary (GOV.UK Frontend JavaScript does it; the page notes a February 2025 guidance change that says so). Title "There is a problem". Link each item to its field; for date inputs link to the first field with an error; for radios and checkboxes, the first option. `role="alert"` sits on a nested element, not the root, since GOV.UK Frontend v4.4.0 (November 2022), which fixed JAWS not reading the whole summary ([page](https://design-system.service.gov.uk/components/error-summary/), authority).
- GOV.UK error message: put the message in red after the question and hint text, next to the field; a red border on the field ties them together; a visually hidden "Error:" prefix is included; the example links hint and error to the input with `aria-describedby="national-insurance-number-hint national-insurance-number-error"` ([page](https://design-system.service.gov.uk/components/error-message/)).
- GOV.UK pattern: "add 'Error: ' to the beginning of the page `<title>`" ([validation pattern](https://design-system.service.gov.uk/patterns/validation/)).
- NN/g: keep the message next to the field; a summary "should supplement, not replace" field-level errors; do not use tooltips for errors; color alone is not enough, add an icon ([article](https://www.nngroup.com/articles/errors-forms-design-guidelines/)).
- WCAG 3.3.1 (Level A): the item in error is identified and the error is described in text; color may be added but does not replace text. WCAG 3.3.3 (Level AA): where a correction is known, suggest it, unless that would jeopardize security or purpose ([3.3.3](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html)).
- WCAG 4.1.3 (Level AA): a status message announced without focus uses `role="status"` or `role="alert"`. "A role of 'alert' is only necessary where a change of context does not take place" (a focus move is a change of context). Using `role="alert"` on content that is not important and time-sensitive is listed as a failure ([page](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).
- MDN `aria-invalid`: set it from validation, not on load; do not set `true` on empty required fields before a submit attempt ([page](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid), modified 2026-11-16).

Consequence for the rule. A field blur error, when the form uses blur validation, is announced by `aria-describedby` association plus `aria-invalid`; it does not move focus (focus is where the user is working). A failed submit moves focus once, to the summary or, when the surface has no page reload, to the first invalid field or to a labelled anchor above the error. The fleet's registry form already moves focus to its title anchor.

### 5. Preserved input

- GOV.UK validation pattern: "show them the page again, with the form fields as the user filled them in"; keeping information that failed validation avoids re-entry. The error-message page records the January 2024 change that added this ([pattern](https://design-system.service.gov.uk/patterns/validation/), [error message](https://design-system.service.gov.uk/components/error-message/)).
- WCAG 3.3.7 Redundant Entry (Level A, new in 2.2): re-populating a form after an error is the page's own compliant example; exceptions are essential re-entry, security, and input that is no longer valid ([page](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)).
- Exception that is a security choice, not a decision for the agent: password and token fields are commonly cleared on failure. Mark this as a decision (see "must not decide alone").
- Implementation hazard seen in the fleet: a controlled `value` attribute stops updating once the user types (dirty value flag); the registry code binds the `.value` property instead (`settings/render.ts:95-102`).

### 6. Submit state

- GOV.UK button: "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible. Only use disabled buttons if research shows it makes the user interface easier to understand." Double-click prevention is opt-in, only "if research shows that users are frequently sending information twice", and server side protection is still needed. On slow connections show a spinner or modal first ([button page](https://design-system.service.gov.uk/components/button/); authority; the page records `disabled` parameter changes of April 2023 and December 2023).
- Adam Silver, 2023-05-14 (practitioner opinion, no data shown): disabled buttons are low contrast, cannot be focused, give no feedback about what is wrong, feel broken after a partial fix, and users still click them ([article](https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/)). Smashing 2022 makes a stronger claim ("nearly 100% abandonment") without a source in the text; do not repeat that number.
- Opposing practitioner advice exists: a Smashing 2018 article recommends disabling the submit button with `disabled` until the form is valid ([article](https://www.smashingmagazine.com/2018/08/ux-html5-mobile-form-part-1/)); it is older and the newer sources above reverse it.
- Two different things share the word "disabled": (a) pre-disabling because the form is not yet valid, which the rule forbids; (b) disabling or `inert`-ing while a submit is in flight, which is allowed and needs a visible progress indicator. The fleet's registry form does (b) correctly (spinner and "Saving…") and (a) incorrectly.
- Where the tool genuinely cannot accept input (a native VS Code input box with an Error-severity message), the platform blocks Enter itself: "When using `InputBoxValidationSeverity.Error`, the user will not be able to accept the input"; Info and Warning still accept ([vscode.d.ts, microsoft/vscode main, fetched 2026-11-27](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.d.ts), platform source).

### 7. Required and optional marking

| Source | Rule | Date and kind |
|---|---|---|
| GOV.UK question pages | "in most contexts, add '(optional)' to the labels of optional fields"; for radios and checkboxes put it on the legend; "Never mark mandatory fields with asterisks." ([page](https://design-system.service.gov.uk/patterns/question-pages/)) | No date stated; authority |
| NN/g | Mark required fields even when most are required; asterisk is fine, red is expected but not needed, avoid low-contrast asterisks; marking optional fields is a "nice perk"; two-field login forms may omit it ([article](https://www.nngroup.com/articles/required-fields/)) | 2019-06-16; independent |
| W3C WAI forms tutorial | `required` attribute plus visible "(required)" text in the label; `aria-required="true"` is redundant where `required` is exposed ([tutorial](https://www.w3.org/WAI/tutorials/forms/validation/)) | 2019-07-27; authority |
| WCAG 3.3.2 | H90 (indicate required controls in the label or legend) is one sufficient technique; ARIA2 `aria-required` is advisory ([page](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)) | Authority |

The decision: a visible marker (text, not color alone) on the minority kind, plus the native `required` attribute on required controls. Because GOV.UK and NN/g disagree on the convention itself, that choice per product is a brand decision (see below); the check is only consistency.

### 8. Autocomplete and input types

- WCAG 1.3.5 (Level AA): the purpose of fields collecting information about the user can be programmatically determined; technique H98 is `autocomplete`. Fields not about the user (a transaction amount) are out of scope ([page](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html)).
- GOV.UK: in production use the `autocomplete` token if a relevant purpose exists; set `spellcheck="false"` on reference numbers, names and emails; do not use `type="number"` unless research shows a need (scroll-wheel increments, no feedback); use `inputmode="numeric"` for whole numbers ([page](https://design-system.service.gov.uk/components/text-input/)).
- MDN (modified 2026-08-27): tokens `username`, `current-password`, `new-password`, `one-time-code`, `email`; `autocomplete="off"` "will not prevent a password manager" in modern browsers, removes a feature many users depend on, and is for cases like CAPTCHA or one-time tokens; made-up values to defeat autofill fail 1.3.5 ([page](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)).
- Fleet: the registry alias and locator inputs are not about the user, so no token is needed there. The extension's rating token input uses `password: true` and `showInputBox` (not a web form).

### 9. VS Code input boxes

- `InputBoxOptions.validateInput(value)` returns a string, an `InputBoxValidationMessage` with a severity, or `undefined`, `null` or empty when valid. Error severity blocks accept; Warning and Info allow it. `ignoreFocusOut` keeps the box open when focus leaves ([vscode.d.ts, fetched 2026-11-27](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.d.ts)).
- The VS Code UX guidelines overview names quick picks for freeform input and notifications for errors but gives no validation rules ([page](https://code.visualstudio.com/api/ux-guidelines/overview), fetched 2026-11-27). The input-box rules here therefore rest on the API contract, not on a style guide.
- Fleet detection: `grep -rn 'showInputBox' src | grep -v test` returns `extension.ts:275` (no `validateInput`) and `views/ratingAuth.ts:79,115`; `grep -rn 'validateInput' src | grep -v test` returns one hit. Of three input boxes, one validates where a format rule exists (host), one has none because any string is valid (token), and one should (tag).

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER. Each Detect line is a command or heuristic an agent can run on a diff or a tree.

1. **FORM-01 (MUST). Every input, select, textarea and custom input element has a programmatic name from a visible `<label for>`, a wrapping `<label>`, `aria-labelledby`, or (only for search fields and icon-led controls) `aria-label`. A placeholder is not a name.** Rationale: [WCAG 3.3.2 (A)](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [GOV.UK text input](https://design-system.service.gov.uk/components/text-input/), [NN/g placeholders](https://www.nngroup.com/articles/form-design-placeholders/); 51% of home pages lack labels ([WebAIM Million 2026, updated 2026-03-30, independent study](https://webaim.org/projects/million/)).
   Detect: `grep -rnE '<(input|textarea|select)\b' src | grep -vE 'type="(hidden|submit|button)"|aria-label=|aria-labelledby=|id=|<label'` lists candidates; confirm each by reading whether an enclosing `<label>` exists. For custom elements, `grep -rn 'vscode-textfield\|<ocx-.*field' src` and check for a `label` or `aria-label` attribute. Fail example: `<vscode-textfield id="search" placeholder="Search artifacts…">`. Pass example: the same element with `aria-label="Search artifacts"`.
2. **FORM-02 (MUST). Always run server-side (or host-side) validation. Client-side validation is an addition, never a replacement.** Rationale: [W3C WAI forms tutorial, 2019-07-27](https://www.w3.org/WAI/tutorials/forms/validation/) and [GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/); client validation is bypassable.
   Detect: for each form handler, the same rule exists in code that runs outside the browser; `grep -rn 'novalidate' src` hits must be paired with a server or host check. Heuristic: a rule that only sits in `oninput` or `onblur` fails.
3. **FORM-03 (MUST). Default validation timing is on submit; every field is also re-judged at submit. Never validate on focus, on the first keystroke of an empty field, or on partial input of a fixed-length value before its full length.** Rationale: premature validation frustrates users ([Baymard 2024, vendor data](https://baymard.com/blog/inline-form-validation); [GOV.UK](https://design-system.service.gov.uk/patterns/validation/); [Smashing 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)).
   Detect: `grep -rnE "addEventListener\(['\"](focus|keydown|keyup|input)['\"]|oninput|onKeyUp|onFocus" src | grep -i valid` and read each hit: it must be an exception in FORM-04. Fail example: an `input` handler that sets `aria-invalid="true"` on an email after one character. Pass example: an `input` handler that only clears an existing error.
4. **FORM-04 (SHOULD). A field with a format rule MAY validate when the user leaves a non-empty field (blur). Exceptions that validate live: password strength, username availability, character counts, and input that cannot be right whatever follows (a letter in a digits-only field). Once an error shows, clear it on the keystroke that fixes it.** Rationale: [Smashing 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) and [Baymard 2024, vendor data](https://baymard.com/blog/inline-form-validation) agree; [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/) says inline; [GOV.UK](https://design-system.service.gov.uk/patterns/validation/) says do not (see Contested). The rule chooses blur because three of four sources allow it and the fourth allows it "if user research shows" a need.
   Detect: blur handlers (`focusout`, `blur`, `onBlur`) skip empty values (`grep -rn -A4 "focusout\|onblur" src` shows an early `if (!value) return`); error clearing on `input` exists where blur validation exists. If a product has user research against blur, the rule is overridden: record it in the form's source comment.
5. **FORM-05 (MUST). After a failed submit, show an error summary at the top of the form or page, titled in plain words ("There is a problem" is the GOV.UK form), listing each error as a link to its field. Show it even for one error.** Rationale: [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/); [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/) says a summary supplements and never replaces field errors.
   Detect: a failure path renders a container with `role="alert"` or receives focus and contains one `<a href="#fieldId">` per error: `grep -rnE 'error-summary|role="alert"' src` must be non-empty for every form with two or more fields. Single-field input boxes (VS Code `showInputBox`, one-row commits) are exempt and use FORM-06.
6. **FORM-06 (MUST). Each field error is rendered next to its field, after the label and hint, in text, and is associated with the input through `aria-describedby`. The input gets `aria-invalid="true"` only when validation has failed, never in the initial markup.** Rationale: [WCAG 3.3.1 (A)](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html); [MDN `aria-invalid`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid); [GOV.UK error message](https://design-system.service.gov.uk/components/error-message/); [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/) (no tooltips, no color-only).
   Detect: for every rendered error element, `grep -rn 'aria-describedby' src` shows an id match: heuristic - the error element's `id` appears in some input's `aria-describedby`. `grep -rn 'aria-invalid="true"' src` must not appear in static templates (only inside failure branches). Fleet fail example: `settings/render.ts:181` renders `.row-error` and the input has no `aria-describedby` or `aria-invalid`; fix by giving the error an `id` and the input `aria-describedby`.
7. **FORM-07 (MUST). A failed submit moves focus exactly once: to the error summary (web page), or to the first invalid field or a labelled `tabindex="-1"` anchor above the error (webview with no reload). A field-level blur error never moves focus.** Rationale: [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/); [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) says `role="alert"` is unnecessary where focus moves, and a non-urgent `role="alert"` is a listed failure.
   Detect: the failure branch contains `.focus()` on the summary or first invalid input; read for a second `.focus()` in the same branch. Fleet pass example: `settings/main.ts:316-320`, `focusRegistryForm()` runs after a rejected save. Fail example: a failed submit that only sets `aria-invalid` and leaves focus on the disabled-out `<body>`.
8. **FORM-08 (MUST). Never discard user input on failure. Keep every value (except a field the owner has decided to clear, see below), re-render the form with the values, and preserve selection state of radios, checkboxes and selects.** Rationale: [WCAG 3.3.7 (A)](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html); [GOV.UK error message, January 2024 change](https://design-system.service.gov.uk/components/error-message/).
   Detect: failure branch does not call `form.reset()`, `innerHTML = ''` on the form, or reassign draft state to its default: `grep -rnE 'form\.reset\(|reset\(\)|draft = (empty|default|\{\})' src`. In frameworks: the failure state keeps the draft object. Property binding check for web components: input `value` is set with the property binding where the user can type (`.value=` in lit).
9. **FORM-09 (MUST). Never set `disabled` on a submit control because the form is currently invalid or incomplete. Leave it enabled; validate on press and show FORM-05 and FORM-06.** Rationale: [GOV.UK button page](https://design-system.service.gov.uk/components/button/); [Silver 2023-05-14](https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/) reasons (not focusable, low contrast, no feedback). Practitioner opinion, no controlled data; the rule stays at MUST because every cited source on this point since 2022 agrees.
   Detect: `grep -rnE 'disabled\s*=\s*\{?!|:disabled="!|\[disabled\]="!?\w*(invalid|valid)|\?disabled="\$\{[^}]*(!|invalid|valid)' src` and `grep -rn '!.*[Vv]alid.*disabled\|disabled.*![A-Za-z]*[Vv]alid' src`. Fail example (this fleet): `?disabled="${saving || !addRegistryDraftValid(draft)}"` at `grimoire-rs/vscode/src/webview/settings/render.ts:584`. Pass example: `?disabled="${saving}"`.
10. **FORM-10 (MUST). While a submit is in flight the control may be disabled or the form `inert`, if a progress indicator is visible and the control re-enables on success or failure; the server must also reject a duplicate.** Rationale: [GOV.UK button page](https://design-system.service.gov.uk/components/button/) (double-click prevention needs server support and a spinner on slow connections).
    Detect: every `disabled = true` / `?disabled="${saving}"` is paired with a spinner or text change in the same element and with a reset path in `finally`: `grep -rn -B2 -A6 'saving\|submitting' src`; read for the reset. Pass example: `${saving ? html\`<span class="codicon codicon-loading codicon-modifier-spin"></span>Saving…\` : submitLabel}` at `render.ts:584`.
11. **FORM-11 (MUST). Mark the minority kind of field. Default convention: add "(optional)" to the label of optional fields; set the native `required` attribute on required controls; do not mark required fields with an asterisk alone. Use one convention per product.** Rationale: [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/); [W3C WAI](https://www.w3.org/WAI/tutorials/forms/validation/); [NN/g](https://www.nngroup.com/articles/required-fields/) (asterisk acceptable). The convention choice is the owner's (see below); presence and consistency are checkable.
    Detect: `grep -rnE '<(input|select|textarea)[^>]*\brequired\b' src` count versus the count of "(optional)" or "required" label text: `grep -rn '(optional)' src`. Heuristic: a form with a mix of required and optional fields and no marker on either fails. Per-product mismatch: both an asterisk-only and an "(optional)" convention in one product fails.
12. **FORM-12 (SHOULD). Set `autocomplete` to a standard token on every field that collects information about the user (name, email, username, passwords, one-time codes, address). Use `autocomplete="off"` only for CAPTCHA and one-time-token fields. Never invent token values to defeat autofill.** Rationale: [WCAG 1.3.5 (AA)](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html); [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete); [GOV.UK text input](https://design-system.service.gov.uk/components/text-input/).
    Detect: `grep -rnE '<input[^>]*type="(email|tel|password)"' src | grep -v autocomplete=` must be empty; `grep -rn 'autocomplete="off"' src` hits are justified in a comment. Fail example: `<input type="password" autocomplete="off">` on a login form. Pass example: `<input type="password" autocomplete="current-password">`.
13. **FORM-13 (SHOULD). Do not use `type="number"` for identifiers, codes, versions or counts users type; use `type="text"` with `inputmode="numeric"`. Set `spellcheck="false"` on references, names, emails and code-like values.** Rationale: [GOV.UK text input](https://design-system.service.gov.uk/components/text-input/) (scroll-wheel increments, no feedback on non-number entry).
    Detect: `grep -rn 'type="number"' src` and read each for whether it is a quantity. Fleet note: `settings/render.ts:108` uses `type="number" min="0"` for numeric settings; a quantity, acceptable, but see Contested.
14. **FORM-14 (MUST). In VS Code extensions, a `showInputBox` whose value has a format rule sets `validateInput` and returns an `InputBoxValidationMessage` with Error severity for values that cannot work; it sets `ignoreFocusOut: true` when the value is long, secret or costly to re-type.** Rationale: [the API contract](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts) blocks accept on Error severity, so there is no need for a disabled control, and a late failure becomes a notification with the typed value lost.
    Detect: `grep -rn 'showInputBox' src | grep -v test` and for each call `grep -A12` for `validateInput` and `ignoreFocusOut`. Fleet fail example: `grimoire-rs/vscode/src/extension.ts:275` (pin tag; no `validateInput`). Pass example: `views/ratingAuth.ts:115-124`.
15. **FORM-15 (MUST). Validation messages are text, not color or icon alone, and never live only in a tooltip, a `title` attribute or a toast that disappears.** Rationale: [WCAG 3.3.1 (A)](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html); [NN/g guideline 9, no tooltips](https://www.nngroup.com/articles/errors-forms-design-guidelines/).
    Detect: every error CSS class (`.error`, `.is-invalid`, `aria-invalid`) has a sibling text node in the markup. Reading heuristic: remove the stylesheet and read the page; if a field's error is no longer visible as words, it fails.
16. **FORM-16 (SHOULD). Add "Error: " at the start of the page `<title>` after a failed full-page submit.** Rationale: [GOV.UK validation pattern](https://design-system.service.gov.uk/patterns/validation/) (screen readers read the title first).
    Detect: failure branch sets `document.title` or renders `<title>` with `Error:`: `grep -rn "Error: " src | grep -i title`. Not applicable to webviews with no page title.
17. **FORM-17 (CONSIDER). After three or more occurrences of the same error in analytics or support logs, rewrite the message and review the field design.** Rationale: [NN/g guideline 10](https://www.nngroup.com/articles/errors-forms-design-guidelines/).
    Detect: a form with an analytics event for validation failure names the field and rule (`grep -rn 'validation_error\|form_error' src`); absent means not measured, so CONSIDER only.

## What an agent must not decide alone

- The required-versus-optional convention for a product (asterisk or "(optional)" or "(required)"): brand and house style; ask, then apply FORM-11 consistently.
- Whether a security-sensitive field (password, token, one-time code) is cleared or kept after a failed submit: a security and legal call; the default in FORM-08 keeps it only where the owner has agreed.
- Whether a field is gated by a law or contract (consent checkboxes, age or terms confirmations, data-minimisation of what is "required"): legal; never pre-tick and never decide that a consent field is optional.
- Whether to add client-side validation at all for a product that follows the GOV.UK stance (user-research gate): needs the owner's research or a decision.
- Whether the product's rule sets severity Warning (allow) or Error (block) for borderline input in a `validateInput`: it changes what users may do.
- Wording of messages: owned by UX-TEXT error-message-anatomy.

## AI-agent angle

| Typical mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| Disables the submit button until `isValid` | It is the most common pattern in tutorials and the 2018 Smashing advice; the agent copies it | FORM-09 grep: `grep -rnE 'disabled.*!?\w*[Vv]alid' src` |
| Placeholder as the only label | Looks cleaner in generated markup | FORM-01 grep for inputs without `id`, `aria-label`, `<label` |
| Validates on every keystroke from the first character | `oninput` is the shortest code | FORM-03 grep for `input` handlers that set errors |
| Sets `aria-invalid="true"` in the initial template or on empty required fields | Copies a "show error styling" example | grep static templates for `aria-invalid="true"` |
| Renders the error text but forgets `aria-describedby` | The visual layout looks right | FORM-06: each error `id` appears in an `aria-describedby` |
| Moves focus on every blur error, or never moves it after submit | Does not model focus as a single-owner resource | FORM-07: count `.focus()` calls in the failure branch (exactly one) |
| Resets the form on a failed submit (`form.reset()`, state reset in a `finally`) | Cleanup habit after a request | FORM-08 grep for `reset()` |
| Uses `role="alert"` on every error and also moves focus | Treats `role="alert"` as the accessible-error recipe | Check that one of the two applies (4.1.3: alert is unnecessary where focus moves) |
| Uses `autocomplete="off"` everywhere "to stop browser prompts" | Common snippet | FORM-12 grep |
| `type="number"` for codes and versions | Seems semantically right | FORM-13 grep |
| `showInputBox` without `validateInput` or `ignoreFocusOut` | The API's minimal call compiles | FORM-14 grep |

## Contested / evolving

- **Blur validation versus submit-only.** GOV.UK: "Do not validate when the user moves away from a field" and "Only add client side validation if you find a user need for it" ([GOV.UK](https://design-system.service.gov.uk/patterns/validation/)). NN/g: "Ideally, all validation should be inline" ([NN/g, reviewed 2024-12-12](https://www.nngroup.com/articles/errors-forms-design-guidelines/)). Smashing and Baymard: validate late (on blur), never prematurely ([Smashing 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/), [Baymard 2024](https://baymard.com/blog/inline-form-validation), vendor data). Trend since 2022: converging on "late, not premature"; GOV.UK stays the outlier because its audience is a government service with research per service. FORM-03 and FORM-04 take the overlap.
- **Disabled submit.** GOV.UK and Silver say avoid it; the 2018 Smashing article recommends it. No controlled study was found in the fetched sources, so both sides are practitioner or authority opinion. Trend: away from disabling.
- **Asterisk for required.** GOV.UK: never use asterisks; NN/g: asterisk is fine, mark required fields; W3C WAI: put "(required)" in the label. Unresolved; owner decision.
- **Summary plus inline versus inline only.** NN/g: a summary supplements, never replaces field errors. GOV.UK: summary always, plus field errors. WCAG 3.3.1 notes native validation exposes only one error at a time. No source says inline only is enough for multi-field forms.
- **`type="number"`.** GOV.UK avoids it for most input; for quantities the platform control is legitimate.
- **`role="alert"` versus focus.** WCAG 4.1.3 says alert is unnecessary where focus moves and a non-urgent alert is a failure; the GOV.UK error summary component nests `role="alert"` and moves focus as well. The rule keeps the focus move as the primary mechanism; the fleet's registry form uses both, and the file records why: "inert moved focus to body" (`settings/render.ts:515-517`).

## Dated facts

| Fact | URL | Date the source states | Source kind |
|---|---|---|---|
| WCAG 3.3.1 Error Identification, Level A; Understanding page updated | https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html | Updated 2026-11-02 | Authority |
| WCAG 3.3.2 Labels or Instructions, Level A | https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html | Updated 2026-11-02 | Authority |
| WCAG 3.3.3 Error Suggestion, Level AA | https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html | Updated 2026-03-09 | Authority |
| WCAG 3.3.7 Redundant Entry, Level A; re-population after error is a compliant example | https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html | Updated 2025-09-17 | Authority |
| WCAG 1.3.5 Identify Input Purpose, Level AA | https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html | Updated 2026-09-08 | Authority |
| WCAG 4.1.3 Status Messages, Level AA | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | Updated 2026-10-04 | Authority |
| GOV.UK error summary: focus moves to summary; February 2025 guidance clarification; `role="alert"` nested since GOV.UK Frontend v4.4.0 (November 2022) | https://design-system.service.gov.uk/components/error-summary/ | February 2025 and November 2022 (changes listed by the page) | Authority |
| GOV.UK error message: January 2024 change added guidance to keep entered information | https://design-system.service.gov.uk/components/error-message/ | January 2024 | Authority |
| GOV.UK button: `disabled` parameter changes | https://design-system.service.gov.uk/components/button/ | April 2023 (v4.6.0), December 2023 (v5.0.0) | Authority |
| GOV.UK text input: `inputmode="decimal"` advice change; hint text change | https://design-system.service.gov.uk/components/text-input/ | June 2026; October 2024 | Authority |
| 51% of home pages have missing form input labels; 33.1% of form inputs not properly labeled | https://webaim.org/projects/million/ | Last updated 2026-03-30; data from February 2026 | Independent study |
| 31% of sites in Baymard's e-commerce benchmark have no inline validation (video summary says 32%) | https://baymard.com/blog/inline-form-validation | Published 2024-01-09 | Vendor data |
| NN/g form errors: 10 guidelines, no statistics | https://www.nngroup.com/articles/errors-forms-design-guidelines/ | Published 2019-02-03; reviewed 2024-12-12 | Independent practitioner firm |
| NN/g placeholders | https://www.nngroup.com/articles/form-design-placeholders/ | Published 2014-05-11; reviewed 2018-09-10 | Independent practitioner firm |
| NN/g required fields | https://www.nngroup.com/articles/required-fields/ | Published 2019-06-16 | Independent practitioner firm |
| Smashing inline validation | https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/ | 2022-09-21 | Practitioner |
| Silver, disabled buttons | https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/ | 2023-05-14 | Practitioner opinion |
| W3C WAI forms validation tutorial | https://www.w3.org/WAI/tutorials/forms/validation/ | Updated 2019-07-27 (older; use for stable points only) | Authority |
| MDN `aria-invalid` | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid | Last modified 2026-11-16 | Reference |
| MDN `autocomplete` | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete | Last modified 2026-08-27 | Reference |
| VS Code `validateInput`, `InputBoxValidationSeverity.Error` blocks accept, `ignoreFocusOut` | https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.d.ts | Main branch fetched 2026-11-27 | Platform |

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://design-system.service.gov.uk/patterns/validation/ | GOV.UK validation pattern (authority; the URL in the commission). The sibling URL `/patterns/validate-answers/` returned 404 | No date stated | The only source that sets timing, server validation, preserved input, title prefix |
| https://design-system.service.gov.uk/components/error-summary/ | GOV.UK error summary (authority) | Changes to February 2025 | Focus and linking rules |
| https://design-system.service.gov.uk/components/error-message/ | GOV.UK error message (authority) | Changes to January 2024 | Placement and `aria-describedby` |
| https://design-system.service.gov.uk/components/text-input/ | GOV.UK text input (authority) | Changes to June 2026 | Labels, placeholder, autocomplete, input types |
| https://design-system.service.gov.uk/components/button/ | GOV.UK button (authority) | Changes to December 2023 | Disabled and double-click guidance |
| https://design-system.service.gov.uk/patterns/question-pages/ | GOV.UK question pages (authority) | No date stated | Optional marking, no asterisks |
| https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html | WCAG 3.3.1 (authority) | 2026-11-02 | Normative level A text and techniques |
| https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html | WCAG 3.3.3 (authority) | 2026-03-09 | Suggestions and the security exception |
| https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html | WCAG 3.3.2 (authority) | 2026-11-02 | Label technique list and F82 failure |
| https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html | WCAG 1.3.5 (authority) | 2026-09-08 | Scope of `autocomplete` duty |
| https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html | WCAG 3.3.7 (authority) | 2025-09-17 | Preserved input as a Level A rule |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 4.1.3 (authority) | 2026-10-04 | When `role="alert"` is right or a failure |
| https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html | WCAG 2.4.3 (authority) | 2026-10-04 | Does not cover focus to the summary; no rule drawn from it |
| https://www.w3.org/WAI/tutorials/forms/validation/ | W3C WAI forms validation tutorial (authority) | 2019-07-27 | `required`, server check |
| https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid | MDN `aria-invalid` | 2026-11-16 | Do not set on load |
| https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete | MDN `autocomplete` | 2026-08-27 | Tokens and the `off` caveat |
| https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.d.ts | VS Code API typings (platform) | Fetched 2026-11-27 | `validateInput` contract |
| https://code.visualstudio.com/api/ux-guidelines/overview | VS Code UX guidelines overview | Fetched 2026-11-27 | Confirms no input-validation guidance |
| https://www.nngroup.com/articles/errors-forms-design-guidelines/ | NN/g form errors | 2019, reviewed 2024 | Ten guidelines, inline vs summary |
| https://www.nngroup.com/articles/form-design-placeholders/ | NN/g placeholders | 2014, reviewed 2018 | Seven harms |
| https://www.nngroup.com/articles/required-fields/ | NN/g required fields | 2019 | Marking guidance |
| https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/ | Smashing inline validation | 2022 | Reward early, punish late; live exceptions |
| https://www.smashingmagazine.com/2018/08/ux-html5-mobile-form-part-1/ | Smashing 2018 (counter-position on disabled submit) | 2018-08-20 | Shows the older advice |
| https://baymard.com/blog/inline-form-validation | Baymard inline validation (vendor data) | 2024-01-09 | Premature validation findings |
| https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/ | Silver on disabled buttons (practitioner) | 2023-05-14 | Reasons list |
| https://webaim.org/projects/million/ | WebAIM Million (independent) | 2026-03-30 | Label failure rate |

Fleet files measured (read-only): `grimoire-rs/vscode/src/webview/settings/render.ts`, `settings/main.ts`, `settings/model.ts`, `src/webview/render.ts`, `src/extension.ts`, `src/views/ratingAuth.ts`, `ocx-sh/website/packages/theme/src/components/DependencyExplorer.astro`, `ui/SearchField.astro`, `ui/Select.astro`, `Terminal.astro`, `grimoire-rs/grimoire/docs/src/components/ThemeSelect.astro`. Cross-territory: none; the 183-message and 0-progress counts for the extension belong to loading-and-progress.

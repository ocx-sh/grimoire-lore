---
title: Forms, Labels, Validation and Autofill
summary: The UX-STATE rows for forms, owning field names, submit state, validation timing, error placement and focus, preserved input, required markers, autocomplete tokens and password tokens, with the element scripts that read whole tags
---

# Forms, Labels, Validation and Autofill

Owns the form rows of the UX-STATE family: UX-STATE-20 to 27, 35 and 36. UX-A11Y-03 states the accessible-name duty for any control, and UX-STATE-20 below owns the form check for it. Apply both and report one finding that cites UX-STATE-20. Error wording is `text.md`. The state rows for views, waits and channels are UX-STATE-01 to 19 and 34 (`states.md`). VS Code input boxes are UX-STATE-28 (`editor-extensions.md`). A modal is UX-ACT's.

Contents: [Dates and Versions](#dates-and-versions) · [Read Elements, Not Lines](#read-elements-not-lines) ·
[Labels and Submit State](#labels-and-submit-state) · [Validation and Focus](#validation-and-focus) ·
[Input, Markers and Autofill](#input-markers-and-autofill) · [Calibration Instances](#calibration-instances) ·
[Ask the Owner](#ask-the-owner) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27. `$CHECKS` is `.claude/skills/ux-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/ux-quality-reference/checks` when installed globally).

| Fact | Source and source date | Rows | Re-check |
|---|---|---|---|
| Labels or instructions (3.3.2, A); error identification (3.3.1, A); input purpose (1.3.5, AA); redundant entry (3.3.7, A) | WCAG 2.2 Understanding pages updated 2026-11-02 (3.3.1), 2026-09-08 (1.3.5), 2025-09-17 (3.3.7) | 20, 23, 25, 27 | 12 months, or at a WCAG 3 Candidate Recommendation |
| 51% of home pages have unlabelled inputs | [WebAIM Million 2026](https://webaim.org/projects/million/), updated 2026-03-30 | 20 | each yearly report |
| Autofill token list (64 field names plus `section-*`); a control with no `autocomplete` takes its form owner's setting | [HTML Standard, autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill), last updated 27 November 2026 | 27, 36 | 12 months |
| `off` does not stop password managers; invalid tokens "cannot match the field to any known purpose"; `new-password` versus `current-password` | [MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete), modified 2026-08-27 | 27, 36 | 12 months |
| Submit-time validation; do not validate before the user finishes; keep every answer; summary and focus | GOV.UK [validation](https://design-system.service.gov.uk/patterns/validation/) (undated, fetched 2026-11-27), [error summary](https://design-system.service.gov.uk/components/error-summary/) (focus guidance clarified February 2025), [error message](https://design-system.service.gov.uk/components/error-message/) (January 2024 change) | 22, 24, 25 | 12 months, read the "Changes" sections |
| Inline validation, on which the sources disagree | [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/) reviewed 2024-12-12; [Smashing, 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/); [Baymard, 2024-01-09](https://baymard.com/blog/inline-form-validation) (vendor data) | 22 | 12 months |
| No `aria-invalid` on load | [MDN aria-invalid](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid), modified 2026-11-16 | 23 | 12 months |
| Disabled submit buttons | [GOV.UK button](https://design-system.service.gov.uk/components/button/); [Silver, 2023-05-14](https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/) (practitioner opinion) | 21 | 12 months |
| Required markers: GOV.UK bans asterisks, NN/g accepts them | [question pages](https://design-system.service.gov.uk/patterns/question-pages/); [NN/g, 2019-06-16](https://www.nngroup.com/articles/required-fields/) | 26 | 12 months |
| A mouse click does not focus a button in Safari; the focus protocol ran only in Google Chrome for Testing 159.0.8154.6 | [MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button), modified 2026-04-24 | 24, 35 | 12 months, or the first Firefox or WebKit run |

## Read Elements, Not Lines

A tag grep (`<input`, `<label`, `disabled=`) finds nothing in a codebase whose fields are components (`<Input`, `<VInput`, `<PasswordInput`) or whose formatter puts one attribute per line, and nothing where a helper renders the markup (Haml `simple_form`, Rails `f.input`, Phoenix `<.input>`). Zero hits there is not a pass. On six Vue, Svelte and React codebases the tag grep returned 0, the per-file helper test passed 9 of 25 real failures, and the lowercase `grep -L autocomplete` flagged all 17 correct React fields (JSX writes `autoComplete`). List the elements, then read the wrapper's own defaults. A per-file test is not an element test: any other `autocomplete` in the file hides the field.

`form_fields.py` reads whole tags in any case, on one line or many, and has one subcommand per check: `unnamed` (UX-STATE-20), `elem` and `badtok` (UX-STATE-27) and `pwtok` (UX-STATE-36). Its tag and cue lists came from those six codebases. Add the project's own component names with `--tag NAME` before you trust a clean run: a project whose input is `<TextBox>` prints nothing until you do. A listing is a candidate. Read each element. The script exits 1 when it lists anything, and `python3 -I "$CHECKS"/form_fields.py --self-test` proves it still separates the fixtures.

```sh
# canary: any output means the form-source list is empty
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' ':(exclude,glob)**/*spec*' ':(exclude,glob)**/*stories*' \
  | tr '\0' '\n' | awk 'END { if (NR == 0) print "canary: nothing listed" }'
```

## Labels and Submit State

```sh
# UX-STATE-20: input-like elements with no evidence of an accessible name (aria-only means aria-label alone)
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' ':(exclude,glob)**/*spec*' ':(exclude,glob)**/*stories*' \
  | xargs -0 -r python3 -I "$CHECKS"/form_fields.py unnamed --
# UX-STATE-21: a submit control disabled by a validity expression; any hit fails
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'disabled[^=]*= *["{]?[$]?[{]?[^}"]*![[:space:]]*[[:alnum:]_.]*[Vv]alid' -e 'disabled=[{]![[:alnum:]_.]*(valid|Valid|complete)' --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-20 | Give every input, select, textarea and custom field element an accessible name from a visible `<label for>`, a wrapping `<label>` or `aria-labelledby`. Use `aria-label` only for search fields and icon-led controls. A placeholder is never the name. | [WCAG 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), A. 51% of home pages have unlabelled inputs (WebAIM Million 2026). UX-A11Y-03 cites this check and does not restate it. | See block UX-STATE-20, then read each listed element for a bound visible label. An `aria-only` element fails unless it is a search field or an icon-led control. A label hidden by a visually-hidden class is not visible, and a label beside the field with no binding is not bound: the listing cannot see either, so read the labels of each form once. On built pages axe `label` is a second check, never the only one. Never use a single-line lowercase `<input\b` grep: on six codebases it found 2 of 23 unnamed fields and none of 17 placeholder-only ones, where the listing found 21 of 23 with 1 false listing among 66 labelled fields (in-sample). | MUST |
| UX-STATE-21 | Never disable a submit control because the form is invalid or incomplete. Leave it enabled, validate on press and show the errors (UX-STATE-23, 24). | A disabled button cannot be focused, has low contrast and says nothing about what is wrong ([GOV.UK](https://design-system.service.gov.uk/components/button/)). It is the tutorial pattern agents copy. A measured case gave no feedback at all: Enter posted nothing, with no error. | See block UX-STATE-21: any hit fails. Pass: `?disabled="${saving}"`. A disabled-while-saving control is UX-STATE-09, not this row. | MUST |

## Validation and Focus

```sh
# UX-STATE-22: handlers on focus, keystroke or change that may set an error up to 30 lines later; read each hit
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -A30 -E -e "(addEventListener|(^|[^[:alnum:]_])on)\([[:space:]]*['\"](focus|focusin|keydown|keyup|input)['\"]" -e "^[[:space:]]*['\"](focus|focusin|keydown|keyup|input)['\"],[[:space:]]*$" -e 'oninput|onInput|onKeyUp|onFocus|onChange' -- \
  | grep -E -e 'setCustomValidity|aria-invalid|reportValidity|setError|error'
# UX-STATE-23: a static aria-invalid="true" is a finding; the hit must sit in a failure branch
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -F -e 'aria-invalid="true"' --
# UX-STATE-24: a form with two or more fields needs a summary; the focus test cannot see a missing one
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'error-summary' -e 'There is a problem' --
# UX-STATE-35: blur and change handlers; a focus() or select() reachable from one fails
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e "addEventListener\(['\"](blur|focusout|change)['\"]" -e 'onBlur|onChange|@blur|@change' --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-22 | Judge every field on submit. Never validate on focus, on the first keystroke of an empty field, or on a fixed-length value before it reaches full length. A non-empty field with a format rule MAY also validate on blur. Once a field shows an error, clear it on the keystroke that fixes it. Live validation is only for password strength, availability checks, character counts and input that cannot become valid (a letter in a digits-only field). | GOV.UK: wait for the submit and "avoid validating the information in a field before the user has finished entering it", because it "can cause problems - especially for users who type more slowly". The blur clause is a MAY: the four sources disagree on it. | See block UX-STATE-22, then read each hit. A handler on an empty field, or on the first keystroke, that sets a visible error or `aria-invalid="true"` fails, unless it is a listed live case. A handler that only calls `setCustomValidity` and shows nothing until submit passes, with a comment. Blur handlers skip empty values (`if (!value) return`). Expect noise: 10, 28 and 27 hits on three codebases, all read, 0 real violations. The rule stays SHOULD until a check catches a real premature error. Whether `setCustomValidity` paints during typing needs a browser run, which has not happened. | SHOULD |
| UX-STATE-23 | Render each field error as text next to its field, after the label and hint. Tie it to the input with `aria-describedby`, and set `aria-invalid="true"` only after validation has failed. Never carry an error by colour, icon, tooltip or `title` alone. | [WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), A. Do not set `aria-invalid` on load. | Every element with an error class or `role="alert"` near a field has an `id` that appears in some input's `aria-describedby`. Block UX-STATE-23 must not hit a static template, only a failure branch. | MUST |
| UX-STATE-24 | After a failed submit, move focus exactly once. A form with two or more fields first shows an error summary ("There is a problem") above the form. The summary lists each error as a link to its field and receives the focus. In a webview with no page reload, focus goes to the summary, the first invalid field, or a labelled `tabindex="-1"` anchor above the error. A blur error never moves focus (UX-STATE-35). | [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/). The summary supplements field errors and never replaces them ([NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)). Single-input surfaces (an input box, a one-row commit) are exempt. | Test (Playwright or a DOM test), in this order. Add a `focusin` listener on `document`. Focus the form's submit control. Clear the log. Activate the control with the keyboard (Enter), never a mouse click, which adds a focus event the application did not cause. Do not start the log after the activation: a focus move made inside the submit handler is then lost and correct forms fail. Wait for the application's settle signal (the saving state cleared, or the error element present), then one animation frame. A fixed wait fails a late but correct form. The failed submit comes from an invalid form, or, where the submit is disabled while invalid (a UX-STATE-21 failure), from a rejected host or server reply. Assert both clauses: exactly one `focusin` was recorded, and `document.activeElement` is the summary, the first invalid field in DOM order, or the `tabindex="-1"` anchor. A count-only check passes a form that returns focus to the pressed button. Never count `.focus()` calls in source. Block UX-STATE-24 must be non-empty for each form with two or more fields. As first worded, this protocol failed 11 of 12 test forms; as written it scored 12 forms and 4 mutations right, in Chromium only. | MUST |
| UX-STATE-35 | Never move focus from a blur or change handler. Show a field error found on blur beside the field, and leave focus where the user's next action put it. | A handler that refocuses the field it has just left traps a keyboard user. Measured on a built fixture: after Tab, a refocusing handler records 2 `focusin` events and ends on the invalid field, a correct one records 1, on the next field. No external source was fetched. | Test: type an invalid value into a field that has a blur rule, press Tab, and assert exactly one `focusin`, on the next focusable element in DOM order. Reading check: block UX-STATE-35, then read each hit. A `.focus()` or `.select()` call reachable from the handler fails. Untested on product code. | SHOULD |

## Input, Markers and Autofill

```sh
# UX-STATE-25: a reset on a path that can follow a failed submit; the hit must not sit on a failure or finally path
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e 'form[.]reset\(' -e '[.]reset\(\)' -e 'draft *= *(empty|default|initial|[{][}])' --
# UX-STATE-26: files with optional markers, files with required markers, then CSS asterisks
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -l -E -e '\(optional\)' --
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -l -E -e '\(required\)' -e '>[[:space:]]*[*][[:space:]]*<' -e '<abbr[^>]*>[*]</abbr>' --
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.css' ':(glob)**/*.scss' ':(glob)**/*.sass' \
  | xargs -0 -r grep -H -n -E -e "content: *[\"'][*][\"']" --
# UX-STATE-27 step 1: person-data fields with no autocomplete of their own
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' ':(exclude,glob)**/*spec*' ':(exclude,glob)**/*stories*' \
  | xargs -0 -r python3 -I "$CHECKS"/form_fields.py elem --
# UX-STATE-27 step 3: autocomplete values that are not an HTML autofill token
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' ':(exclude,glob)**/*spec*' ':(exclude,glob)**/*stories*' \
  | xargs -0 -r python3 -I "$CHECKS"/form_fields.py badtok --
# UX-STATE-27 step 4: every off; for each form-level off, run step 1 on that file
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' \
  | xargs -0 -r grep -H -n -E -e "autocomplete: 'off'" -e 'autocomplete="off"' -e 'autoComplete="off"' --
# UX-STATE-27 tag sources, one tag per line (plain HTML and server templates); read each hit
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.html' ':(glob)**/*.tmpl' ':(glob)**/*.erb' ':(glob)**/*.njk' ':(glob)**/*.hbs' \
  | xargs -0 -r grep -H -n -E -e '<input[^>]*(type="(email|tel|password)"|name="(user_?name|uname|username|login|email|full_?name|phone|tel|address|street|city|postal|zip|country|otp|passcode)")' -- | grep -v -e 'autocomplete='
# UX-STATE-27 helper sources: a count of 0 is not a pass; list files that render a person field, then those with no autocomplete, then every off
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.haml' ':(glob)**/*.erb' ':(glob)**/*.heex' ':(glob)**/*.ex' \
  | xargs -0 -r grep -l -E -e '(^|[^[:alnum:]_])(f|ff|form)[.]input :(username|email|display_name|current_password|password|password_confirmation|otp_attempt)([^[:alnum:]_]|$)' -e 'f\[:(email|name|full_name|username|password)\]' -- \
  | tr '\n' '\0' | xargs -0 -r grep -L -e 'autocomplete' --
# UX-STATE-36: every password element with its own literal token; resolve "none" to the wrapper default, then read the label
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/*.tsx' ':(glob)**/*.jsx' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*test*' ':(exclude,glob)**/*spec*' ':(exclude,glob)**/*stories*' \
  | xargs -0 -r python3 -I "$CHECKS"/form_fields.py pwtok --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-25 | Never discard what the user typed when a submit fails. Keep every value and every radio, checkbox and select state, except a secret field the owner has decided to clear. | GOV.UK, January 2024: "Do not clear any form fields when showing the Error message component. Keep both passing and failing answers". [WCAG 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) supports it and is not its origin. | See block UX-STATE-25: no hit on a failure or `finally` path. Where users type into a web component, bind the `.value` property (`.value=` in lit), not the attribute. | MUST |
| UX-STATE-26 | Mark the minority kind of field in the label text: "(optional)" by default. Set the native `required` attribute on required controls. Never use colour or a bare asterisk as the only marker, and use one convention per product. | GOV.UK bans asterisks, NN/g accepts them. The convention is the owner's choice, and the check is consistency. | See block UX-STATE-26 (four commands). Both file lists non-empty fails: two conventions. A form with both kinds of field and no hit in either list fails. Each field the convention marks required also carries `required` (read each hit). A CSS asterisk on a required-field selector fails unless the label also has a text marker. List every renderer of field labels (a component, a template helper, a CSS rule): two renderers that mark the optional kind differently fail. Both lists carry false hits (comments, wildcard documentation): read each one. | SHOULD |
| UX-STATE-27 | Set a standard `autocomplete` token on every field that collects data about the user: name, email, username, passwords, one-time and backup codes, address, phone, date of birth (`bday`). Use `autocomplete="off"` only for CAPTCHA and one-time-token fields, with a comment. Never invent a token to defeat autofill. | [WCAG 1.3.5](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html), AA. `off` does not stop password managers. A field with no `autocomplete` of its own takes its form owner's setting, so `<form autocomplete="off">` turns it off. | Run all five steps, then read each hit and keep those that collect data about the person using the form, not another service's credentials, a share password, a read-only value or another user an admin creates. 1. Elements: block step 1; add the project's own component and cue names with `--tag`. 2. Wrapper defaults: open the file that renders each listed component's `<input>` and read its default. `off`, no token, or a wrong default fails (UX-STATE-36 for passwords). 3. Token values: block step 3; each value outside the list on a person field fails (`autocomplete="password"` is not a token). 4. Off: block step 4; run step 1 on every file with a `<form ... autocomplete="off">`, whose elements inherit it and fail. 5. Schema: where fields are data (YAML, JSON, a seed), grep that file for person-data names, find the generic interface that renders them and read its default. Tag sources and helper sources use the two blocks of the same name. Measured on six codebases (89 fields, 25 real fails): the five steps found 25 of 25, in-sample because the scripts were written after reading those codebases. | MUST |
| UX-STATE-36 | Give a field that sets or confirms a new password `autocomplete="new-password"`, and a field that enters an existing password `current-password`. Never put `username` on a password field. | MDN: `new-password` is for "Enter your new password" or "Confirm new password", "as opposed to a general 'Enter your current password' field", and lets the browser avoid filling an existing password. A shared wrapper that defaults to `current-password` passes UX-STATE-27 on every new-password field. 4 instances in 3 codebases and no browser run: SHOULD. | See block UX-STATE-36. Resolve each "none" row to the wrapper's default (UX-STATE-27 step 2), then read the visible label of each row. A label that says new, confirm-new or repeat takes `new-password`. A label that asks for the existing password takes `current-password`. `username` on a password field always fails. Never decide from words in the id or file name: a keyword rule was right on 3 of 11 lines, because "confirm" and "reset" also mean "confirm your identity" and "reset the PIN". | SHOULD |

## Calibration Instances

Open-source code read 2026-11-27. Run a check on these before trusting its output on your code. `--tag` and cue lists were written after reading these codebases.

- UX-STATE-20 fail: Directus `app/src/routes/login/components/login-form/login-form.vue:113` at `4856582` (`<VInput>` with a placeholder only).
- UX-STATE-27 fail: Directus `app/src/routes/tfa-setup.vue:142` (wrapper default `off` at `app/src/components/v-input.vue:85`), `accept-invite.vue:73` (`autocomplete="password"`, step 3) and `packages/system-data/src/fields/users.yaml:4,10,16` (step 5); Immich `web/src/routes/(user)/user-settings/UserProfileSettings.svelte:31,35` at `a608f8f` (form-level `off`); Open WebUI `src/lib/components/chat/Settings/Account.svelte:268,332` at `926f826`. Pass: Vikunja `frontend/src/views/user/Register.vue:55,70,83` at `f8c5533`; Gitea `templates/user/auth/signup_inner.tmpl:32,36` at `e77c1c2`. Tag source fail: Gitea `signup_inner.tmpl:22,26`; helper source fail: Mastodon `app/views/auth/registrations/new.html.haml:24` at `e639273` (`off` on the sign-up username).
- UX-STATE-26: pass Plausible `ip_rules.ex:183` at `06efc5e`; fail Gitea `web_src/css/modules/form.css:216`; fail Mastodon, whose two label renderers mark the optional kind differently.
- UX-STATE-36 fail: Vikunja `PasswordReset.vue:33` and `PasswordUpdate.vue:13` (wrapper default `current-password`, `components/input/Password.vue:59`); Directus `reset-password/reset.vue:66` (`username` on a password field); Open WebUI `UpdatePassword.svelte:122` (`off` on the confirm field). Pass: the same file's line 105.
- Not run on product code: address, phone and payment tokens, labels bound inside a component library (`@immich/ui`, Base UI `Field`, shadcn `FormControl`), and any browser or password manager.

## Ask the Owner

- Which required or optional convention the product uses (UX-STATE-26).
- Whether a password, token or one-time-code field is cleared after a failed submit. This is a security call and the only exception to UX-STATE-25.
- Whether an `autocomplete="off"` has a real reason (CAPTCHA, a one-time token) that a comment can state.

## What Agents Get Wrong Here

Ranked by how often each appears.

1. **`autocomplete="off"` everywhere "to stop browser prompts"**, or on the form element, which turns off every field inside it (UX-STATE-27).
2. **A placeholder as the label** (UX-STATE-20), and a title `<span>` beside the control with no binding.
3. **Submit disabled until `isValid`** (UX-STATE-21), the tutorial pattern.
4. **A password wrapper whose default is `current-password` used for a new-password field**, or `username` on a password field (UX-STATE-36).
5. **A tag grep that returns 0 on component or helper markup, read as a pass** (UX-STATE-20, 27).
6. **Validation on every keystroke from the first character** (UX-STATE-22).
7. **`form.reset()` or a draft reset in `finally` after a failed submit** (UX-STATE-25).
8. **Error text with no `aria-describedby`, or `aria-invalid="true"` written into the template** (UX-STATE-23).
9. **One error line above the buttons for a form with several fields, with no summary and no field links** (UX-STATE-24), and a focus call that sends focus back to the pressed button.
10. **A blur handler that refocuses the field it left** (UX-STATE-35).
11. **An invented token such as `autocomplete="password"` or `new-pass`**, which browsers read as no purpose (UX-STATE-27).

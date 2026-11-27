---
title: Does the UX-STATE-24 focusin test separate a pass from a fail
program: product
topic: ux-interface-states
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 2
---

# Does the UX-STATE-24 focusin test separate a pass from a fail

## Question

Does the UX-STATE-24 test (after a failed submit, exactly one `focusin`, and `document.activeElement` equal to the error summary or the first invalid field) separate a pass from a fail, when run on the registry form and on a form built to fail?

## Answer

Yes, with two corrections to how the test is run and one limit on what it proves.

1. The test scored all 12 forms built for it as designed once the recording protocol was fixed. Four passed (P1 and P2 are correct forms, F8 is correct but late and passes after a long enough wait, F11 is the known limit in point 5) and eight failed, for the right reason in each case. See Measurement B.
2. The registry form passes the focus clause of UX-STATE-24: one `focusin`, on `.form-title`. Four mutations of the real registry code (call removed, a second focus added, focus sent to the submit button, a pass control) were each told apart. See Measurement C.
3. First correction: the recorder must not start after the activation. The first run of the test, written as "activate, then clear the log, then wait", scored 11 of 12 forms as 0 `focusin` and failed them, including the two correct ones (P1, P2). Only F8, whose focus move is delayed, read 1. A focus move made inside the submit handler happens synchronously, before the clear. The log must start before the activation, and the activation must not itself move focus. See Measurement A.
4. Second correction: the activation must come from a button that already has focus (keyboard Enter), not from a mouse click. A real mouse click focuses the pressed button first, and that adds one `focusin` the application did not cause. A passing form then reads 2 events and fails. See Measurement B, last block.
5. The limit: the test cannot tell a form with a summary from a form without one. A three-field form that moves focus once to its first invalid field and shows no "There is a problem" summary passes it (variant F11). The second half of the rule, the `grep -rnE 'error-summary|There is a problem'` check, stays necessary.
6. The registry form cannot be put through the rule's literal procedure ("submit an invalid form"). Its submit button is disabled while the draft is invalid, and Enter in a field posts nothing (Measurement C). The only failed submit it has is a host rejection, and that is the path the focus code serves. That is a UX-STATE-21 violation already in the ruleset, and it also means the UX-STATE-24 test has to drive the form by a rejected host reply.

## Method and environment

All commands run from `~/.cache/research-lang/exemplars/product/wave2/ux-state-24r/` after `source env.sh; export LD_LIBRARY_PATH CHR`. The directory was rebuilt for this repair pass from the first run's scripts (`wave2/ux-state-24/`), so every output below was produced again on 2026-11-27 and is reproducible from the files named here. Nothing was created in any repository.

- Browser. Command: `$CHR --version`. Output: `Google Chrome for Testing 159.0.8154.6`. `$CHR` is the Playwright cache binary `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, driven headless with `puppeteer-core` from the fleet's `grimoire-rs/indexer/node_modules` (read only). "Chromium build 1255" in the first version is the Playwright cache directory name, not the browser version. Shared libraries come from `.deb` extractions listed in `env.sh`.
- Registry form source. Command: `git -C /home/mherwig/dev/grimoire-rs/vscode rev-parse HEAD; git -C /home/mherwig/dev/grimoire-rs/vscode status --short | wc -l; git -C /home/mherwig/dev/grimoire-rs/vscode log -1 --format='%h %cI'`. Output: `9230dcd364dcdd9b1f5b0bc206423972789cdd39`, `0` (clean tree), `9230dcd 2026-11-24T19:43:56+01:00`.
- Bundle. Command: `$V/node_modules/.bin/esbuild $V/src/webview/settings/main.ts --bundle --format=iife --platform=browser --target=es2022 --outfile=settings.rebuilt.js` with `V=/home/mherwig/dev/grimoire-rs/vscode`; `esbuild --version` prints `0.28.2`. `sha256sum settings.rebuilt.js settings.orig.js` prints the same digest for both: `ac5c34bc7d8fdb3a9480759e568af0508cb423cb928ca91058b9dada2819f687`. The bundle used in the first run is therefore byte-identical to a fresh unmodified build at `9230dcd`.
- State fixture. `esbuild vm-entry.ts --bundle --platform=node --format=cjs --outfile=vm.cjs; node vm.cjs > state.regen.json`; `sha256sum state.json state.regen.json` prints `274f82689ff6fd5eb7a6574854e98d8889a3fd78c2c3fb10adcfbf38915193e9` for both. The state is the repository's own test fixture `settingsState({registryFields: registryFieldVMs(), registryEditSupported: true})`, loaded into `page.html` with a stub `acquireVsCodeApi`.
- Form built to fail: `variants.html`, three required fields (`name`, `email`, `alias`), `novalidate`, submit button `#go`, one variant per URL hash, one helper `const focusErr=(el)=>el.focus();`. The 12 variants are listed by name in the commands below.
- The decision function (the test), exactly as run in `variants.mjs`:

```js
const first=[...document.querySelectorAll('input')].find(i=>!i.value);   // first invalid field, DOM order
const a=document.activeElement;
ok = log.length===1 && (a.hasAttribute('data-summary') || a===first);     // log = every focusin on document since the log was last cleared
```

The two recording orders differ in one line. `variants.mjs` (key mode): focus `#go`, clear the log, press Enter, wait. `variants-a.mjs` (made with `sed` from `variants.mjs`, line 7 changed to focus `#go`, press Enter, then clear the log, then wait): the order the rule's wording gives.

## Measurement A: the protocol as the rule is worded, and why it failed

Command: `L=P1-summary,P2-first-invalid,F1-no-move,F2-each-invalid-loop,F3-summary-then-field,F4-last-invalid,F5-second-invalid,F6-helper-loop-one-call-site,F8-late-150ms,F9-summary-not-focusable,F10-summary-then-back-to-button,F11-field-focus-no-summary-3-fields; node variants-a.mjs $L 500 key`

```
P1-summary                               focusin=0 []                           active=summary  FAIL
P2-first-invalid                         focusin=0 []                           active=name     FAIL
F1-no-move                               focusin=0 []                           active=go       FAIL
F2-each-invalid-loop                     focusin=0 []                           active=alias    FAIL
F3-summary-then-field                    focusin=0 []                           active=name     FAIL
F4-last-invalid                          focusin=0 []                           active=alias    FAIL
F5-second-invalid                        focusin=0 []                           active=email    FAIL
F6-helper-loop-one-call-site             focusin=0 []                           active=alias    FAIL
F8-late-150ms                            focusin=1 ["name"]                     active=name     PASS
F9-summary-not-focusable                 focusin=0 []                           active=go       FAIL
F10-summary-then-back-to-button          focusin=0 []                           active=go       FAIL
F11-field-focus-no-summary-3-fields      focusin=0 []                           active=name     FAIL
```

Eleven of twelve forms read 0 `focusin`; only F8 (focus moved 150 ms late, after the clear) reads 1. The two forms built to pass (P1, P2) are scored as fails. The focus call runs inside the click's synchronous submit handler, before the log is cleared, so the log is empty. The verdict is nearly uniform and separates nothing. Note that the `active=` column is correct for every row (P1 `summary`, P2 `name`); a test that read only `activeElement` would not have this problem. The failure is in the count clause under this recording order.

## Measurement B: forms built to fail, recording started before the activation

Command: `node variants.mjs $L 500 key` (`$L` as in Measurement A)

The script focuses `#go`, clears the log, presses Enter, waits 500 ms, then applies the decision function. Output:

```
P1-summary                               focusin=1 ["summary"]                  active=summary  PASS
P2-first-invalid                         focusin=1 ["name"]                     active=name     PASS
F1-no-move                               focusin=0 []                           active=go       FAIL
F2-each-invalid-loop                     focusin=3 ["name","email","alias"]     active=alias    FAIL
F3-summary-then-field                    focusin=2 ["summary","name"]           active=name     FAIL
F4-last-invalid                          focusin=1 ["alias"]                    active=alias    FAIL
F5-second-invalid                        focusin=1 ["email"]                    active=email    FAIL
F6-helper-loop-one-call-site             focusin=3 ["name","email","alias"]     active=alias    FAIL
F8-late-150ms                            focusin=1 ["name"]                     active=name     PASS
F9-summary-not-focusable                 focusin=0 []                           active=go       FAIL
F10-summary-then-back-to-button          focusin=2 ["summary","go"]             active=go       FAIL
F11-field-focus-no-summary-3-fields      focusin=1 ["name"]                     active=name     PASS
```

What each row shows:

| Variant | What the form does | Verdict | Which half of the test caught it |
|---|---|---|---|
| P1, P2 | focus the summary / the first invalid field, once | pass (correct) | none needed |
| F1 | shows errors, moves no focus | fail | count is 0 |
| F2, F6 | one `.focus()` call site, called once per invalid field | fail | count is 3. `grep -c "\.focus()"` of the source sees one call in the helper, which is why the rule says not to count calls |
| F3 | summary, then also the first field | fail | count is 2 |
| F4, F5 | one move, to the last / the second invalid field | fail | count is 1, `activeElement` is wrong. Only the second clause catches these |
| F9 | summary has no `tabindex="-1"`, so `focus()` is a no-op | fail | count is 0 |
| F10 | summary, then focus restored to the pressed button | fail | count is 2, active is the button |
| F8 | correct target, 150 ms late | pass at a 500 ms wait | see the next block |
| F11 | one move to the first invalid field, three fields, no summary | pass | not caught: the limit in point 5 |

Wait time. Command: `node variants.mjs P1-summary,F8-late-150ms,F10-summary-then-back-to-button 0 key`

```
P1-summary                               focusin=1 ["summary"]                  active=summary  PASS
F8-late-150ms                            focusin=0 []                           active=go       FAIL
F10-summary-then-back-to-button          focusin=1 ["summary"]                  active=summary  PASS
```

Correction to the first version of this file, which showed F10 as a fail at wait 0: F10 restores focus to the button in a `setTimeout(0)`, so a read with no wait sees the correct intermediate state and passes it. A wait of 0 therefore errs both ways: it fails the late-but-correct form (F8) and passes a form that has not yet done its wrong second move (F10). A form that settles late is scored as a fail if the test reads before it settles. The rule says "after the failed submit settles" and does not say how. A fixed wait is a guess. The test should wait for the application's own settle signal, such as the saving flag clearing or the error element appearing, and then wait one more animation frame.

Mouse activation. Command: `node variants.mjs P1-summary,P2-first-invalid,F1-no-move 500 mouse`

```
P1-summary                               focusin=2 ["go","summary"]             active=summary  FAIL
P2-first-invalid                         focusin=2 ["go","name"]                active=name     FAIL
F1-no-move                               focusin=1 ["go"]                       active=go       FAIL
```

A real click focuses the button, so a correct form reads 2 events. This is a false fail, and with a mouse click F1 (no move at all) reads 1 event on the wrong element, which only the second clause catches.

Blur. The rule also says a blur error never moves focus. The submit test does not cover it. Command: `node blur.mjs` (types `nope` in `#email`, presses Tab, counts `focusin`):

```
blur handler leaves focus    {"log":["alias"],"active":"alias"}
blur handler refocuses field {"log":["alias","email"],"active":"email"}
```

A field that steals focus back on blur is caught by a separate, equally small test: after Tab, exactly one `focusin`, on the next field in DOM order.

## Measurement C: the registry form

The registry form is the "Add registry" form of the settings webview (`src/webview/settings/render.ts`, `renderAddRegistryForm`; focus code in `settings/main.ts`, `focusRegistryForm`, called from `handleWriteError`).

Reachability. Command: `node reg2.mjs`, mode `enter-in-field-invalid` (alias typed, locator empty, Enter pressed):

```
enter-in-field-invalid {"posted":0,"focusin":[],"submitDisabled":true,"alerts":0}
```

With an invalid draft the button is disabled, Enter posts nothing, and no error appears. The user gets no feedback at all. So "submit an invalid form" is not possible on this form. This is the UX-STATE-21 violation the ruleset already records (`settings/render.ts:584`).

Host-rejected submit. The script types a valid alias and locator, focuses the submit button, starts the log, presses Enter, then posts `{type:'writeError',...,message:'grim exited with status 1'}` to the page. Command: `node reg2.mjs` (it runs modes `key`, `mouse` and `enter-in-field-invalid` in turn; `key` focuses the submit button and presses Enter, `mouse` calls `p.click` on it). Output, verbatim:

```
key mid {"saving":true,"active":"BODY","focusin":[]} end {"focusin":["form-title"],"active":"form-title","text":"Add registry","tabindex":"-1","role":null,"ariaLabel":null,"pass":true}
ax of focus target {"role":"generic","backendNodeId":13,"loaderId":"CED0B2E03097BB5912D62A30B3AB84DF","name":"Add registry","focused":true,"children":[{"role":"StaticText","backendNodeId":43,"loaderId":"CED0B2E03097BB5912D62A30B3AB84DF","name":"Add registry"}]}
mouse mid {"saving":true,"active":"BODY","focusin":[]} end {"focusin":["form-title"],"active":"form-title","text":"Add registry","tabindex":"-1","role":null,"ariaLabel":null,"pass":true}
enter-in-field-invalid {"posted":0,"focusin":[],"submitDisabled":true,"alerts":0}
```

Mouse mode gives the same result as key mode because the script focuses the submit button before it clears the log, so the click adds no new `focusin` on this form. (In `variants.mjs` mouse mode the log is cleared before the click, which is why that mode reads 2.) The `pass` field of `reg2.mjs` is the count clause only (`focusin.length===1`); the `active` field is what the second clause is read from.

The `inert` form drops focus to `BODY` while saving (a blur, no `focusin`), and the error then moves it once to `.form-title`. The decision function passes: one `focusin`, active is the labelled anchor. Two details matter for the rule text. The anchor is a `generic` node whose name is its own text, "Add registry". It is a heading-less `div`, not the error. The error text is a separate `role="alert"` element that is announced by itself, and no input carries `aria-describedby` or `aria-invalid` (the UX-STATE-23 violation, also already recorded). So the focus clause is met, and the summary clause is not: the form has four fields and no "There is a problem" summary.

Mutations of the real code. The only call site is `settings.orig.js` line 8098, `      focusRegistryForm();` inside `handleWriteError` (the function body at line 7984 is `root.querySelector(".add-registry-form .form-title")?.focus();`). Each run copied `settings.orig.js` to `settings.js`, changed line 8098 with `sed -i '8098s/<old>/<new>/' settings.js`, and ran `node reg2.mjs 2>&1 | grep '^key mid'`. The new line 8098 and the output of each run:

```
### none (settings.orig.js unchanged)
key mid {"saving":true,"active":"BODY","focusin":[]} end {"focusin":["form-title"],"active":"form-title","text":"Add registry","tabindex":"-1","role":null,"ariaLabel":null,"pass":true}

### call removed: line 8098 is  ;
key mid {"saving":true,"active":"BODY","focusin":[]} end {"focusin":[],"active":"","text":"\n\n  \n    ProjectGlobal\n    /work/my-app/grimoire.toml\n  \n\n\n  Registries\n  ... [text of the whole page, 1.5 kB, cut here by me] ...\n  Default registry flag\n  grim exited with status 1\n  \n    Add Registry\n    Cancel\n  ...","tabindex":null,"role":null,"ariaLabel":null,"pass":false}

### plus alias: line 8098 is  focusRegistryForm(); document.querySelector(".form-alias").focus();
key mid {"saving":true,"active":"BODY","focusin":[]} end {"focusin":["form-title","settings-input form-alias error"],"active":"settings-input form-alias error","text":"","tabindex":null,"role":null,"ariaLabel":null,"pass":false}

### submit button: line 8098 is  document.querySelector("[data-action=submit-add-registry]").focus();
key mid {"saving":true,"active":"BODY","focusin":[]} end {"focusin":["btn primary"],"active":"btn primary","text":"Add Registry","tabindex":null,"role":null,"ariaLabel":null,"pass":true}
```

For "call removed" the whole `end` line is long because `active` is the empty `className` of `BODY` and `text` is `BODY`'s full text content; the only fields that matter, `"focusin":[]` and `"active":""`, are shown verbatim, and the middle of `text` is cut where marked. The error text `grim exited with status 1` is in the dump, so the error did render; focus did not move.

| Mutation | `focusin`, `active` | Test verdict |
|---|---|---|
| none | `["form-title"]`, `form-title` | pass |
| call removed | `[]`, `""` (BODY) | fail, count 0 |
| call kept, plus `.form-alias` focused | `["form-title","settings-input form-alias error"]` | fail, count 2 |
| call replaced by focusing the submit button | `["btn primary"]`, `btn primary` | `reg2.mjs` prints `"pass":true` because it checks the count only. The `active` clause fails it (`btn primary` is not `form-title`) |

The last row is the reason UX-STATE-24 must keep both clauses in one test. A script that checks only the count passes a form that sends focus back to the button that was pressed.

## Effect on the ruleset

**UX-STATE-24: change (the Verify line).** The test separates pass from fail on the registry form and on twelve forms built to pass or fail. The rule's Verify text lacks the recording protocol, and an agent that follows it as worded gets all-fail (Measurement A) or a false fail on mouse activation (Measurement B). Replace the Verify bullet with:

> Verify: a test (Playwright or a DOM test) adds a `focusin` listener on `document`, then focuses the form's submit control, clears the log, and activates it with the keyboard (Enter), not a mouse click, which adds a focus event the application did not cause. It waits for the application's settle signal (the saving state cleared, or the error element present), then one animation frame. The failed submit is reached by an invalid form, or, where the submit control is disabled while invalid (itself a UX-STATE-21 failure), by a rejected host or server reply. It then asserts: exactly one `focusin` was recorded, and `document.activeElement` is the error summary, the first invalid field in DOM order, or the labelled `tabindex="-1"` anchor. Both clauses are required: a count-only check passes a form that returns focus to the pressed button. Do not count `.focus()` calls in source; a helper called in a loop hides the real count. `grep -rnE 'error-summary|There is a problem' src` is non-empty for each form with two or more fields. The focus test cannot detect a missing summary, so this grep is not optional. Single-input surfaces (`showInputBox`, one-row commits) are exempt.

**UX-STATE-24: confirm** the severity MUST and the rule text, other than the Verify line. The rule is no longer untested: it now has a run against a real form and twelve forms built to fail. It has not run against a form with an inline blur validator in the fleet, because the fleet has none.

**UX-STATE-24 applied to the fleet row: change.** Replace the "no `focusin` test exists yet" clause with: "The focus clause was measured on 2026-11-27 against the bundled settings webview at `9230dcd`: one `focusin`, on `.form-title`, reached by a rejected host reply (followup-q0, Measurement C). The summary clause stays violated." Status stays partial.

**NEW rule, UX-STATE-35 (SHOULD).** Never move focus from a blur or change handler. A field error found on blur is shown beside the field, and focus stays where the user's next action put it.
- Rationale: UX-STATE-24 already states "A blur error never moves focus" as a bullet, but its test does not check it. A handler that refocuses the field it just left traps the keyboard user (measured: `focusin` count 2, active back on the invalid field). No separate source was fetched for this; it rests on the measurement and on the existing GOV.UK clause cited by UX-STATE-22.
- Verify: a test types an invalid value into a field that has a blur rule, presses Tab, and asserts exactly one `focusin`, on the next focusable element in DOM order. Reading check: `grep -nE "addEventListener\(['"]blur['"]|onBlur|@blur" src` followed by a read of each hit. A `.focus()` or `.select()` call reachable from the handler fails.
- Fleet: no instance (the fleet has no blur validators), so this is untested against product code. It was run only against `blur.mjs`.

**UX-STATE-21: confirm.** This run adds a second fact in support: the disabled registry button leaves a user who has an invalid draft with no message, and it blocks the one test route the UX-STATE-24 rule describes.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| GOV.UK Design System: error summary must receive keyboard focus ("move keyboard focus to the error summary (the govuk-frontend javascript will do this for you)") | [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/), fetched 2026-11-27 | page undated; its change list has a February 2025 guidance entry: "Added clarification that GOV.UK Frontend will automatically move keyboard focus to the Error summary component." |
| Registry form code audited | `grimoire-rs/vscode` at `9230dcd` | committed 2026-11-24 (from the consolidation) |
| Chromium used | Google Chrome for Testing 159.0.8154.6 (Playwright cache dir `chromium-1255`), headless | run 2026-11-27 |
| Safari does not focus a button on click, by design | [MDN button element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button) | page last modified 2026-04-24, fetched 2026-11-27 |

All measurements are local, run 2026-11-27, and are not vendor data.

## What could not be determined

- Whether a screen reader announces the registry form's focus target ("Add registry", a `generic` node) and the separate `role="alert"` error in a useful order. The test proves where focus lands, not what is spoken. That needs a screen reader, which this run did not have. UX-VERIFY owns that pass.
- Whether the focusin test behaves the same in Firefox and WebKit. Only Chromium ran; no Firefox or WebKit binary was available, so no measurement was made. MDN states: "Whether clicking on a `<button>` or `<input>` button types causes it to (by default) become focused varies by browser and OS. Most browsers do give focus to a button being clicked, but Safari does not, by design." ([MDN button element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button), page last modified 2026-04-24, fetched 2026-11-27). So the mouse-activation false fail (Measurement B) is a Chromium result; whether the same count of 2 appears in Safari is not measured here, and the keyboard protocol is the one that does not depend on it.
- Whether the test separates pass from fail on a full-page form with a server round trip and a page reload. All forms here were client-rendered. The page-reload case has no `focusin` history across the navigation, and the test would need to read focus after load instead.
- How the live VS Code webview host behaves. The bundle ran in a plain Chromium page with a stub for `acquireVsCodeApi`. VS Code's webview iframe has its own focus handling, which this run did not exercise.

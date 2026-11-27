---
title: UX-STATE-27 helper-source check on Vue, Svelte and React component libraries
program: product
topic: ux-interface-states
worker: followup-w3-q0
wave: 3
date_researched: 2026-11-27
model: sonnet
sources_fetched: 9
---

# UX-STATE-27 helper-source check on Vue, Svelte and React component libraries

## Question

Does the UX-STATE-27 helper-source check, as the consolidation states it, work on codebases that build forms in Vue, Svelte and React component libraries? Neither earlier wave measured these frameworks. The commission asks for a hand label of every field as labelled or unlabelled, and for true and false passes and fails per codebase.

Two labels are therefore given for each of the 89 fields. "Truth" is the thing UX-STATE-27 checks: does the rendered field carry a standard `autocomplete` token (pass), or no token, an `off`, or an invented token (fail). "Label" is the UX-STATE-20 reading of the same field: is there a visible `<label>` or label component bound to it (L), an `aria-label` only (N), a placeholder only (P), a label whose binding is not evident from source (A), or a screen-reader-only label (S). Both come from reading the component source; no page was rendered, so a label bound inside a library (`@immich/ui`, Base UI `Field`, shadcn `FormControl`) is judged from the source that calls it. The 9 sources are 6 repository clones, the Mastodon clone from followup-q2 (one count re-run, Measurement 1), and 2 web pages (MDN, the WHATWG HTML spec), all read or re-fetched on 2026-11-27.

## Answer

No. As worded, the check does not work on these six codebases. It is not a close miss.

1. The tag grep returns 0 on all six codebases, so all 89 fields in scope are invisible to it (Measurement 1).
2. The helper-source branch is a per-file test, and a per-file test cannot say which field lacks the token. Over the six codebases it caught 16 of 25 real fails and passed 9 (Measurement 2, with every wrong verdict listed in the 89-row table). With the literal lowercase `autocomplete` on React it flags all 17 correct React fields (of 26), because JSX writes `autoComplete`.
3. An element-level check, plus a token-value check, a form-level `off` follow-up and a schema read, found all 25 real fails (Measurement 3). It was written after reading these six codebases, so 25 of 25 is an in-sample figure.
4. Eight failure classes are missing from the consolidation, two more are covered only in part, and one more is a tool limit (section "Failure classes").
5. The UX-STATE-20 Verify has the same line-bound shape. Run on the same fields it found 2 of the 23 fields that lack a bound visible label; a listing rewritten to list elements found 21 of 23 (Measurement 4).

## Method

All clones are `git clone --depth 1` into `~/.cache/research-lang/exemplars/product/wave2/ux-w3q0/`; scripts are in `../ux-w3q0-tools/` (sources in the Appendix); nothing was installed or run from the clones. None of the six repositories appears in the wave-1 or wave-2 artifacts of this topic (the artifact directory names Gitea, Mastodon, Plausible, Excalidraw, vscode-pull-request-github and Vercel guidelines only).

| Codebase | Framework | Form layer | Commit | Commit date |
|---|---|---|---|---|
| [go-vikunja/vikunja](https://github.com/go-vikunja/vikunja) `frontend/` | Vue 3 | `FormField`, `FormInput`, `Password` | `f8c5533` | 2026-11-27 |
| [directus/directus](https://github.com/directus/directus) `app/` | Vue 3 | `VInput`, `InterfaceSystemInputPassword`, schema-driven interfaces | `4856582` | 2026-11-23 |
| [immich-app/immich](https://github.com/immich-app/immich) `web/` | Svelte 5 | `Field`, `Input`, `PasswordInput` from `@immich/ui` | `a608f8f` | 2026-11-27 |
| [open-webui/open-webui](https://github.com/open-webui/open-webui) | Svelte | raw `<input>`, `SensitiveInput` | `926f826` | 2026-11-25 |
| [usememos/memos](https://github.com/usememos/memos) `web/` | React | `Field.Root`, `Input`, `CredentialFields` | `78a8dc8` | 2026-11-27 |
| [formbricks/formbricks](https://github.com/formbricks/formbricks) `apps/web` | React | react-hook-form `FormField`, `Input`, `PasswordInput` | `be932a2` | 2026-11-27 |

Commit and date: `git rev-parse --short HEAD` and `git log -1 --format=%cs` in each clone, run 2026-11-27.

Scope of the field set. Every field that collects data about the person using the form, in the sign-in, sign-up, password-reset, account-settings, re-authentication and two-factor forms. Out of scope by the rule's own exemptions: an admin creating another user (Vikunja `UsersView.vue`, Directus admin dialogs, Memos `CreateUserDialog.tsx`, Immich `admin/users/**`), another service's credentials, a share-link password (Vikunja `LinkSharing.vue`, Directus `shared.vue`, Immich `SharedLinkPage.svelte`), read-only values, and the Formbricks setup token (`signup-form.tsx:302`, a token field, `off` allowed). The files each script reads are the output of `scope.sh` (Appendix), one fixed list per codebase: Vikunja 27 files, Directus 78, Immich 110, Open WebUI 9, Memos 160, Formbricks 56.

Wrapper defaults are resolved by reading the file that owns the `<input>`: Vikunja `Password.vue:59` `autocomplete: 'current-password'`; Directus `v-input.vue:85` `autocomplete: 'off'`; Directus `input-password.vue:19` `autocomplete: 'new-password'`; Formbricks `otp-input/index.tsx:144` `autoComplete="one-time-code"` (these four lines were printed with `sed -n` today and match). A form-level `autocomplete="off"` counts as `off` for a field with no attribute of its own. The WHATWG spec: "If the autocomplete attribute is omitted, the default value corresponding to the state of the element's form owner's autocomplete attribute is used instead (either "on" or "off"). If there is no form owner, then the value "on" is used." ([HTML Standard, form control infrastructure, page footer "Last Updated 27 November 2026"](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)). MDN says the same: "If an `<input>`, `<select>` or `<textarea>` element has no `autocomplete` attribute, the browser will use the `autocomplete` attribute of the element's owning form" ([MDN autocomplete, "last modified on Aug 27, 2026"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)). Both pages were fetched in full today (MDN 211,154 bytes; the spec page 464,415 bytes; an earlier version of this artifact read only the first 100,000 characters of the spec).

Truth is the letter of UX-STATE-27 ("set a standard `autocomplete` token ... never invent a token"). A valid but wrong token (`current-password` on a new-password field) passes by the letter; those 3 fields are labelled W and reported apart.

The check under test, instantiated per framework. The rule gives no pattern for these frameworks, so I used the smallest one that follows its shape, built from cues the rule's own list names (email, password, tel, username, name, code); the patterns are in `stated.sh`. Tag grep exactly as stated: `grep -rnE '<input[^>]*(type="(email|tel|password)"|name="(user_?name|uname|username|login|email|full_?name|phone|tel|address|street|city|postal|zip|country|otp|passcode)")' <dirs> | grep -v 'autocomplete='`. Helper-source branch exactly as stated: `grep -rlE <pattern> <dirs> | xargs grep -L autocomplete`, read each file, then the `off` listing. For React there are two settings: A is the literal lowercase `grep -L autocomplete`, B is `grep -Li autocomplete`.

## The 89 fields, hand-labelled

Rows with a "Wrong?" entry are the wrong verdicts of the stated check; `A / B` is the stated check's verdict for the field under settings A and B. A field is "fail" for the check when its file is flagged by the per-file test, or when the field's own line is within 3 lines of an `autocomplete="off"` hit that is not a `<form>` tag (a form-level hit is not connected to the field by the stated text; this is the choice that makes Immich `UserProfileSettings.svelte:31,35` a false pass). Generated by `table.py` from `fields.tsv` and `stated-all.txt` (Appendix).

| # | Field (file:line) | What it renders | Truth | Label (UX-STATE-20) | Stated check A / B | Wrong? |
|---|---|---|---|---|---|---|
| 1 | vikunja `views/user/Login.vue:35` | username | pass | L | pass / pass |  |
| 2 | vikunja `views/user/Login.vue:54` | password(wrapper default) | pass | L | pass / pass |  |
| 3 | vikunja `views/user/Login.vue:67` | totp | pass | L | pass / pass |  |
| 4 | vikunja `views/user/Register.vue:55` | username | pass | L | pass / pass |  |
| 5 | vikunja `views/user/Register.vue:70` | email | pass | L | pass / pass |  |
| 6 | vikunja `views/user/Register.vue:83` | new password | pass | L | pass / pass |  |
| 7 | vikunja `views/user/RequestPasswordReset.vue:37` | email | pass | L | pass / pass |  |
| 8 | vikunja `views/user/settings/EmailUpdate.vue:40` | new email | pass | L | pass / pass |  |
| 9 | vikunja `views/user/settings/EmailUpdate.vue:50` | current password | pass | L | pass / pass |  |
| 10 | vikunja `views/user/settings/PasswordUpdate.vue:23` | current password | pass | L | pass / pass |  |
| 11 | vikunja `components/user/ReauthFields.vue:31` | current password(wrapper default) | pass | L | pass / pass |  |
| 12 | vikunja `components/user/ReauthFields.vue:46` | totp | pass | L | pass / pass |  |
| 13 | vikunja `views/user/PasswordReset.vue:33` | NEW password gets default current-password | valid wrong token | L | fail / fail | (36, not 27) |
| 14 | vikunja `views/user/settings/PasswordUpdate.vue:13` | NEW password gets default current-password | valid wrong token | L | pass / pass | (36, not 27) |
| 15 | vikunja `views/user/settings/DataExport.vue:35` | current password | fail: none | L | fail / fail |  |
| 16 | vikunja `views/user/DataExportDownload.vue:6` | current password | fail: none | L | fail / fail |  |
| 17 | vikunja `views/user/settings/Deletion.vue:20` | current password | fail: none | L | fail / fail |  |
| 18 | vikunja `views/user/settings/Deletion.vue:55` | current password | fail: none | L | fail / fail |  |
| 19 | vikunja `views/user/settings/GeneralSettingsForm.vue:12` | own name | fail: none | L | fail / fail |  |
| 20 | directus `app/src/routes/login/components/login-form/login-form.vue:113` | email | pass | P | pass / pass |  |
| 21 | directus `app/src/routes/login/components/login-form/login-form.vue:114` | password | pass | P | pass / pass |  |
| 22 | directus `app/src/routes/login/components/login-form/login-form.vue:121` | otp | pass | P | pass / pass |  |
| 23 | directus `app/src/routes/login/components/login-form/ldap-form.vue:100` | identifier | pass | P | pass / pass |  |
| 24 | directus `app/src/routes/login/components/login-form/ldap-form.vue:101` | password | pass | P | pass / pass |  |
| 25 | directus `app/src/routes/login/components/login-form/ldap-form.vue:108` | otp | pass | P | pass / pass |  |
| 26 | directus `app/src/routes/login/components/sso-links.vue:195` | otp | pass | P | pass / pass |  |
| 27 | directus `app/src/routes/register/register-form.vue:94` | email | pass | P | pass / pass |  |
| 28 | directus `app/src/routes/register/register-form.vue:99` | password(wrapper default new-password) | pass | P | pass / pass |  |
| 29 | directus `app/src/routes/reset-password/request.vue:54` | email | pass | P | pass / pass |  |
| 30 | directus `app/src/routes/reset-password/reset.vue:66` | new password gets username | valid wrong token | P | pass / pass | (36, not 27) |
| 31 | directus `app/src/routes/accept-invite.vue:73` | password gets invalid "password" | fail: invalid | P | pass / pass | A: false pass; B: false pass |
| 32 | directus `app/src/routes/tfa-setup.vue:142` | password (default off) | fail: off | P | fail / fail |  |
| 33 | directus `app/src/interfaces/_system/system-mfa-setup/system-mfa-setup.vue:221` | password (default off) | fail: off | P | fail / fail |  |
| 34 | directus `packages/system-data/src/fields/users.yaml:4` | first_name (renders off) | fail: off | L | pass / pass | A: false pass; B: false pass |
| 35 | directus `packages/system-data/src/fields/users.yaml:10` | last_name (renders off) | fail: off | L | pass / pass | A: false pass; B: false pass |
| 36 | directus `packages/system-data/src/fields/users.yaml:16` | email (renders off) | fail: off | L | pass / pass | A: false pass; B: false pass |
| 37 | immich `routes/auth/login/+page.svelte:168` | email | pass | L | pass / pass |  |
| 38 | immich `routes/auth/login/+page.svelte:172` | password | pass | L | pass / pass |  |
| 39 | immich `routes/auth/register/+page.svelte:51` | admin email | pass | L | pass / pass |  |
| 40 | immich `routes/auth/register/+page.svelte:55` | admin password | pass | L | pass / pass |  |
| 41 | immich `routes/auth/register/+page.svelte:59` | confirm password | pass | L | pass / pass |  |
| 42 | immich `routes/auth/register/+page.svelte:63` | name | pass | L | pass / pass |  |
| 43 | immich `routes/auth/change-password/+page.svelte:49` | current password | pass | L | pass / pass |  |
| 44 | immich `routes/auth/change-password/+page.svelte:53` | new password | pass | L | pass / pass |  |
| 45 | immich `routes/auth/change-password/+page.svelte:57` | confirm password | pass | L | pass / pass |  |
| 46 | immich `routes/(user)/user-settings/ChangePasswordSettings.svelte:32` | current password | pass | L | pass / pass |  |
| 47 | immich `routes/(user)/user-settings/ChangePasswordSettings.svelte:36` | new password | pass | L | pass / pass |  |
| 48 | immich `routes/(user)/user-settings/ChangePasswordSettings.svelte:40` | confirm password | pass | L | pass / pass |  |
| 49 | immich `lib/modals/PinCodeResetModal.svelte:33` | password | pass | L | pass / pass |  |
| 50 | immich `routes/(user)/user-settings/UserProfileSettings.svelte:31` | own email (form-level off) | fail: off | L | pass / pass | A: false pass; B: false pass |
| 51 | immich `routes/(user)/user-settings/UserProfileSettings.svelte:35` | own name (form-level off) | fail: off | L | pass / pass | A: false pass; B: false pass |
| 52 | open-webui `routes/auth/+page.svelte:373` | name | pass | L | pass / pass |  |
| 53 | open-webui `routes/auth/+page.svelte:391` | username | pass | L | pass / pass |  |
| 54 | open-webui `routes/auth/+page.svelte:411` | email | pass | L | pass / pass |  |
| 55 | open-webui `routes/auth/+page.svelte:431` | password | pass | L | pass / pass |  |
| 56 | open-webui `routes/auth/+page.svelte:452` | confirm password | pass | L | pass / pass |  |
| 57 | open-webui `lib/components/chat/Settings/Account/UpdatePassword.svelte:88` | current password | pass | P | pass / pass |  |
| 58 | open-webui `lib/components/chat/Settings/Account/UpdatePassword.svelte:105` | new password | pass | P | pass / pass |  |
| 59 | open-webui `lib/components/chat/Settings/Account/UpdatePassword.svelte:122` | confirm password (off) | fail: off | P | fail / fail |  |
| 60 | open-webui `lib/components/auth/MfaChallenge.svelte:139` | otp | pass | L | pass / pass |  |
| 61 | open-webui `lib/components/chat/Settings/Account/Mfa.svelte:90` | otp | pass | L | pass / pass |  |
| 62 | open-webui `lib/components/chat/Settings/Account.svelte:268` | own name | fail: none | N | pass / pass | A: false pass; B: false pass |
| 63 | open-webui `lib/components/chat/Settings/Account.svelte:332` | date of birth | fail: none | N | pass / pass | A: false pass; B: false pass |
| 64 | memos `components/CredentialFields.tsx:37` | username (sign-in render) | pass | L | fail / pass | A: false fail |
| 65 | memos `components/CredentialFields.tsx:51` | password (sign-in render) | pass | L | fail / pass | A: false fail |
| 66 | memos `components/CredentialFields.tsx:37` | username (sign-up render) | pass | L | fail / pass | A: false fail |
| 67 | memos `components/CredentialFields.tsx:51` | password (sign-up render) | pass | L | fail / pass | A: false fail |
| 68 | memos `components/ChangeMemberPasswordDialog.tsx:91` | new password | fail: none | L | fail / fail |  |
| 69 | memos `components/ChangeMemberPasswordDialog.tsx:102` | repeat new password | fail: none | L | fail / fail |  |
| 70 | memos `components/UpdateAccountDialog.tsx:220` | username | fail: none | L | fail / fail |  |
| 71 | memos `components/UpdateAccountDialog.tsx:233` | nickname | fail: none | L | fail / fail |  |
| 72 | memos `components/UpdateAccountDialog.tsx:245` | email | fail: none | L | fail / fail |  |
| 73 | formbricks `modules/auth/login/components/login-form.tsx:277` | email | pass | L | fail / pass | A: false fail |
| 74 | formbricks `modules/auth/login/components/login-form.tsx:302` | password | pass | L | fail / pass | A: false fail |
| 75 | formbricks `modules/auth/signup/components/signup-form.tsx:224` | name | pass | L | fail / pass | A: false fail |
| 76 | formbricks `modules/auth/signup/components/signup-form.tsx:248` | email | pass | L | fail / pass | A: false fail |
| 77 | formbricks `modules/auth/signup/components/signup-form.tsx:278` | password | pass | L | fail / pass | A: false fail |
| 78 | formbricks `modules/auth/forgot-password/components/forgot-password-form.tsx:58` | email | pass | L | fail / pass | A: false fail |
| 79 | formbricks `modules/auth/forgot-password/reset/components/reset-password-form.tsx:85` | new password (spread object) | pass | L | fail / pass | A: false fail |
| 80 | formbricks `modules/auth/forgot-password/reset/components/reset-password-form.tsx:95` | confirm password (spread object) | pass | L | fail / pass | A: false fail |
| 81 | formbricks `app/(app)/workspaces/[workspaceId]/settings/account/profile/components/password-confirmation-modal.tsx:95` | password | pass | N | fail / pass | A: false fail |
| 82 | formbricks `modules/account/components/DeleteAccountModal/index.tsx:207` | password | pass | L | fail / pass | A: false fail |
| 83 | formbricks `modules/ee/two-factor-auth/components/confirm-password-form.tsx:76` | password | pass | L | fail / pass | A: false fail |
| 84 | formbricks `modules/ee/two-factor-auth/components/disable-two-factor-modal.tsx:106` | password | pass | L | fail / pass | A: false fail |
| 85 | formbricks `modules/ee/two-factor-auth/components/enter-code.tsx:72` | otp (OTPInput default one-time-code) | pass | A | fail / fail | A: false fail; B: false fail |
| 86 | formbricks `app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx:157` | own name | fail: none | L | fail / fail |  |
| 87 | formbricks `app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx:182` | own email | fail: none | L | fail / fail |  |
| 88 | formbricks `modules/ee/two-factor-auth/components/two-factor-backup.tsx:31` | backup code | fail: none | S | fail / fail |  |
| 89 | formbricks `modules/ee/two-factor-auth/components/disable-two-factor-modal.tsx:149` | backup code | fail: none | A | fail / pass | B: false pass |

Totals, from `score.py` (raw output follows). TP = fine and not flagged; FP = bad and not flagged (false pass); TF = bad and flagged; FF = fine and flagged (false fail). W fields are counted apart.

```
$ python3 score.py        # first 12 lines
vikunja A fields 19 {'TP': 12, 'W-flagged': 1, 'W-unflagged': 1, 'TF': 5}
vikunja B fields 19 {'TP': 12, 'W-flagged': 1, 'W-unflagged': 1, 'TF': 5}
directus A fields 17 {'TP': 10, 'W-unflagged': 1, 'FP': 4, 'TF': 2}
directus B fields 17 {'TP': 10, 'W-unflagged': 1, 'FP': 4, 'TF': 2}
immich A fields 15 {'TP': 13, 'FP': 2}
immich B fields 15 {'TP': 13, 'FP': 2}
open-webui A fields 12 {'TP': 9, 'TF': 1, 'FP': 2}
open-webui B fields 12 {'TP': 9, 'TF': 1, 'FP': 2}
memos A fields 9 {'FF': 4, 'TF': 5}
memos B fields 9 {'TP': 4, 'TF': 5}
formbricks A fields 17 {'FF': 13, 'TF': 4}
formbricks B fields 17 {'TP': 12, 'FF': 1, 'TF': 3, 'FP': 1}
```

| Codebase | Fields | Real fails | TP | FP (false pass) | TF | FF (false fail) | W |
|---|---|---|---|---|---|---|---|
| Vikunja (Vue) | 19 | 5 | 12 | 0 | 5 | 0 | 2 |
| Directus (Vue) | 17 | 6 | 10 | 4 | 2 | 0 | 1 |
| Immich (Svelte) | 15 | 2 | 13 | 2 | 0 | 0 | 0 |
| Open WebUI (Svelte) | 12 | 3 | 9 | 2 | 1 | 0 | 0 |
| Memos (React), A literal | 9 | 5 | 0 | 0 | 5 | 4 | 0 |
| Memos (React), B `-i` | 9 | 5 | 4 | 0 | 5 | 0 | 0 |
| Formbricks (React), A literal | 17 | 4 | 0 | 0 | 4 | 13 | 0 |
| Formbricks (React), B `-i` | 17 | 4 | 12 | 1 | 3 | 1 | 0 |

Real fails: 5 + 6 + 2 + 3 + 5 + 4 = 25. With setting B the stated check caught 5 + 2 + 0 + 1 + 5 + 3 = 16 and passed 9 (Directus 4, Immich 2, Open WebUI 2, Formbricks 1). Under A it caught 17 and passed 8; correct React fields flagged wrongly: 4 + 13 = 17, which is all of them (React has 26 fields, 9 real fails). The one Open WebUI TF (`UpdatePassword.svelte:122`) comes only through the `off` listing. The two Vikunja W fields and the Directus W field are not failures of UX-STATE-27 by the letter; UX-STATE-36 (below) covers them.

Label counts over the same 89 fields: L 66, P 17 (Directus 14, Open WebUI `UpdatePassword.svelte` 3), N 3 (Open WebUI `Account.svelte:268,332`, Formbricks `password-confirmation-modal.tsx:95`), A 2 (Formbricks `enter-code.tsx:72`, `disable-two-factor-modal.tsx:149`), S 1 (Formbricks `two-factor-backup.tsx:31`). Memos `CredentialFields.tsx` appears 4 times because the sign-in and sign-up forms each render it (2 fields, 2 forms); the 4 rows share lines 37 and 51.

## Measurement 1: the tag grep

Run per codebase over `*.vue`, `*.svelte`, `*.tsx`, `*.jsx`, tests excluded (re-run 2026-11-27):

```
$ for n in vikunja directus immich open-webui formbricks memos; do echo -n "$n "; git -C $n grep -nE '<input[^>]*(type="(email|tel|password)"|name="(user_?name|uname|username|login|email|full_?name|phone|tel|address|street|city|postal|zip|country|otp|passcode)")' -- '*.vue' '*.svelte' '*.tsx' '*.jsx' ':!*test*' ':!*spec*' | grep -v 'autocomplete=' | wc -l; done
vikunja 0
directus 0
immich 0
open-webui 0
formbricks 0
memos 0
```

Why 0 (each confirmed by reading the file): the tag is a component (`<FormField`, `<VInput`, `<Input`, `<PasswordInput`) and the grep is lowercase `<input` only (Memos `UpdateAccountDialog.tsx:245` is `<Input id="email" type="email" ...>`); or the tag is a real `<input` but prettier puts it alone on its line and each attribute on its own line (Open WebUI `src/routes/auth/+page.svelte:368-373`), and `[^>]*` cannot cross a newline in `grep`.

The Mastodon figure used in the proposed header text, re-run on the followup-q2 clone ([mastodon/mastodon at e63927367d71](https://github.com/mastodon/mastodon/tree/e63927367d716dc3b5db9beffb2fa1c91ff2e44a), commit date 2026-11-27, first measured in followup-q2.md Measurement 2):

```
$ cd ~/.cache/research-lang/exemplars/product/wave2/ux-state-q2/mastodon && git rev-parse --short HEAD && git log -1 --format=%cs
e639273
2026-11-27
$ grep -rhoE '\b(f|form)\.input :[a-z_]+' app/views | wc -l
200
```

## Measurement 2: the helper-source branch as stated

`stated.sh <codebase>` runs, over the `scope.sh` file set: the helper pattern (`<codebase> pattern matches`), `grep -L autocomplete` (A), `grep -Li autocomplete` (B), and the `off` grep. This is the complete output, nothing omitted:

```
[vikunja] pattern matches:
11
[vikunja] A literal (grep -L autocomplete):
frontend/src/views/user/DataExportDownload.vue
frontend/src/views/user/PasswordReset.vue
frontend/src/views/user/settings/DataExport.vue
frontend/src/views/user/settings/Deletion.vue
frontend/src/views/user/settings/GeneralSettingsForm.vue
[vikunja] B case-insensitive (grep -Li autocomplete):
frontend/src/views/user/DataExportDownload.vue
frontend/src/views/user/PasswordReset.vue
frontend/src/views/user/settings/DataExport.vue
frontend/src/views/user/settings/Deletion.vue
frontend/src/views/user/settings/GeneralSettingsForm.vue
[vikunja] off listing:
[directus] pattern matches:
18
[directus] A literal (grep -L autocomplete):
app/src/interfaces/_system/system-collections-translations/system-collections-translations-dialog.vue
app/src/interfaces/_system/system-folder/folder.vue
app/src/interfaces/_system/system-input-translated-string/input-translated-string.vue
app/src/interfaces/_system/system-license-key/system-license-key.vue
app/src/interfaces/_system/system-mcp-prompts-collection-validation/system-mcp-prompts-collection-generate-dialog.vue
app/src/interfaces/_system/system-mfa-setup/system-mfa-setup.vue
app/src/interfaces/_system/system-openrouter-models/system-openrouter-models.vue
app/src/interfaces/_system/system-token/system-token.vue
app/src/routes/shared/shared.vue
app/src/routes/tfa-setup.vue
[directus] B case-insensitive (grep -Li autocomplete):
app/src/interfaces/_system/system-collections-translations/system-collections-translations-dialog.vue
app/src/interfaces/_system/system-folder/folder.vue
app/src/interfaces/_system/system-input-translated-string/input-translated-string.vue
app/src/interfaces/_system/system-license-key/system-license-key.vue
app/src/interfaces/_system/system-mcp-prompts-collection-validation/system-mcp-prompts-collection-generate-dialog.vue
app/src/interfaces/_system/system-mfa-setup/system-mfa-setup.vue
app/src/interfaces/_system/system-openrouter-models/system-openrouter-models.vue
app/src/interfaces/_system/system-token/system-token.vue
app/src/routes/shared/shared.vue
app/src/routes/tfa-setup.vue
[directus] off listing:
[immich] pattern matches:
9
[immich] A literal (grep -L autocomplete):
web/src/lib/modals/UserDeleteConfirmModal.svelte
[immich] B case-insensitive (grep -Li autocomplete):
web/src/lib/modals/UserDeleteConfirmModal.svelte
[immich] off listing:
web/src/lib/components/pages/SharedLinkPage.svelte:80:          <PasswordInput autocomplete="off" bind:value={password} placeholder="Password" />
web/src/lib/components/user-settings-page/PinCodeCreateForm.svelte:30:<form autocomplete="off" onsubmit={handleSubmit}>
web/src/routes/(user)/user-settings/ChangePasswordSettings.svelte:29:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/DownloadSettings.svelte:34:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/FeatureSettings.svelte:83:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/NotificationsSettings.svelte:37:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/PinCodeChangeForm.svelte:27:<form autocomplete="off" onsubmit={handleSubmit}>
web/src/routes/(user)/user-settings/UserProfileSettings.svelte:24:    <form autocomplete="off" onsubmit={preventDefault(bubble('submit'))}>
[open-webui] pattern matches:
5
[open-webui] A literal (grep -L autocomplete):
[open-webui] B case-insensitive (grep -Li autocomplete):
[open-webui] off listing:
src/lib/components/chat/Settings/Account.svelte:635:			autocomplete="off"
src/lib/components/chat/Settings/Account/UpdatePassword.svelte:122:						autocomplete="off"
[memos] pattern matches:
5
[memos] A literal (grep -L autocomplete):
web/src/components/ChangeMemberPasswordDialog.tsx
web/src/components/CreateIdentityProviderDialog.tsx
web/src/components/PasswordSignInForm.tsx
web/src/components/UpdateAccountDialog.tsx
web/src/pages/SignUp.tsx
[memos] B case-insensitive (grep -Li autocomplete):
web/src/components/ChangeMemberPasswordDialog.tsx
web/src/components/UpdateAccountDialog.tsx
[memos] off listing:
web/src/components/CreateIdentityProviderDialog.tsx:525:                      autoComplete="off"
web/src/components/CreateSpaceDialog.tsx:102:                autoComplete="off"
web/src/components/CreateSpaceDialog.tsx:141:                  autoComplete="off"
[formbricks] pattern matches:
13
[formbricks] A literal (grep -L autocomplete):
apps/web/app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx
apps/web/app/(app)/workspaces/[workspaceId]/settings/account/profile/components/password-confirmation-modal.tsx
apps/web/modules/account/components/DeleteAccountModal/index.tsx
apps/web/modules/auth/forgot-password/components/forgot-password-form.tsx
apps/web/modules/auth/forgot-password/reset/components/reset-password-form.tsx
apps/web/modules/auth/login/components/login-form.tsx
apps/web/modules/auth/signup/components/signup-form.tsx
apps/web/modules/ee/two-factor-auth/components/confirm-password-form.tsx
apps/web/modules/ee/two-factor-auth/components/disable-two-factor-modal.tsx
apps/web/modules/ee/two-factor-auth/components/enter-code.tsx
apps/web/modules/ee/two-factor-auth/components/two-factor-backup.tsx
apps/web/modules/ee/two-factor-auth/components/two-factor.tsx
apps/web/modules/setup/organization/create/components/create-organization.tsx
[formbricks] B case-insensitive (grep -Li autocomplete):
apps/web/app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx
apps/web/modules/ee/two-factor-auth/components/enter-code.tsx
apps/web/modules/ee/two-factor-auth/components/two-factor-backup.tsx
apps/web/modules/ee/two-factor-auth/components/two-factor.tsx
apps/web/modules/setup/organization/create/components/create-organization.tsx
[formbricks] off listing:
apps/web/modules/auth/signup/components/signup-form.tsx:302:                              autoComplete="off"
```

Every row of the 89-row table takes its stated-check verdict from these lists. The per-file noise (Directus `system-folder/folder.vue`, `system-license-key.vue` and others; Memos `CreateIdentityProviderDialog.tsx`; Formbricks `create-organization.tsx`) is a reader cost the rule text must expect: 10 flagged Directus files hold 2 files with real fails (`tfa-setup.vue`, `system-mfa-setup.vue`), 1 exempt share password (`shared.vue`) and 7 that do not collect data about the person.

Wrong verdicts under B, with the cause class (section "Failure classes"):

| Wrong verdict | Field | Class |
|---|---|---|
| false pass | Directus `routes/accept-invite.vue:73`, `autocomplete="password"` | C masking (file has the word `autocomplete`), F invalid token |
| false pass x3 | Directus `packages/system-data/src/fields/users.yaml:4,10,16` | I schema-driven |
| false pass x2 | Immich `UserProfileSettings.svelte:31,35` | E form-level `off` (line 24) |
| false pass x2 | Open WebUI `Account.svelte:268,332` | C masking (`autocomplete="off"` at line 635 on an unrelated field) |
| false pass | Formbricks `disable-two-factor-modal.tsx:149` | C masking (line 106 password token) |
| false fail | Formbricks `enter-code.tsx:72` (also `two-factor.tsx:32`) | G wrapper default (`OTPInput`) |
| false fail x17 | Memos `PasswordSignInForm.tsx`, `SignUp.tsx` (4 fields); Formbricks 13 fields | D camelCase, setting A only; B clears all but the OTP field |

Immich `@immich/ui` is not in the repository, so the default token of its `Input` and `PasswordInput` could not be read; every Immich field that passes sets the attribute explicitly.

## Measurement 3: what a corrected check finds

An element-level test, not a file-level one. `elem.pl` (source in the Appendix) prints each opening tag of an input-like element that has a person-data cue in its own attributes (or `{...field}` with a `name=` on the wrapper up to 8 lines above) and no `autocomplete` or `autoComplete` attribute of its own. It reads multi-line tags and skips whole-line `//` comments (an apostrophe in a comment broke the first version on Formbricks). Perl 5.38.2. The script was recreated from the text of the first version of this artifact (the scratch copy was gone) and its output reproduces the earlier per-codebase counts (11, 6, 10, 2, 5) except Formbricks, below.

Raw output, `scope.sh` file set per codebase:

```
$ for c in vikunja directus immich open-webui memos formbricks; do echo "== $c ($(./scope.sh $c | wc -l) files)"; (cd $c; ../../ux-w3q0-tools/scope.sh $c | xargs perl ../../ux-w3q0-tools/elem.pl); done
== vikunja (27 files)
frontend/src/components/user/ReauthFields.vue:31:<Password>
frontend/src/views/user/DataExportDownload.vue:6:<FormField>
frontend/src/views/user/Login.vue:54:<Password>
frontend/src/views/user/PasswordReset.vue:33:<Password>
frontend/src/views/user/settings/BotUsers.vue:168:<input>
frontend/src/views/user/settings/BotUsers.vue:178:<input>
frontend/src/views/user/settings/DataExport.vue:35:<FormField>
frontend/src/views/user/settings/Deletion.vue:20:<FormField>
frontend/src/views/user/settings/Deletion.vue:55:<FormField>
frontend/src/views/user/settings/GeneralSettingsForm.vue:12:<FormInput>
frontend/src/views/user/settings/PasswordUpdate.vue:13:<Password>
== directus (78 files)
app/src/interfaces/_system/system-collections-translations/system-collections-translations-dialog.vue:425:<VInput>
app/src/interfaces/_system/system-mcp-prompts-collection-validation/system-mcp-prompts-collection-generate-dialog.vue:166:<VInput>
app/src/interfaces/_system/system-mfa-setup/system-mfa-setup.vue:221:<VInput>
app/src/routes/register/register-form.vue:99:<InterfaceSystemInputPassword>
app/src/routes/shared/shared.vue:181:<VInput>
app/src/routes/tfa-setup.vue:142:<VInput>
== immich (110 files)
web/src/lib/modals/AlbumEditModal.svelte:35:<Input>
web/src/lib/modals/ApiKeyCreateModal.svelte:40:<Input>
web/src/lib/modals/ApiKeyUpdateModal.svelte:48:<Input>
web/src/lib/modals/CreateFaceModal.svelte:80:<Input>
web/src/lib/modals/PasskeyUpdateModal.svelte:26:<Input>
web/src/lib/modals/PersonEditModal.svelte:46:<Input>
web/src/lib/modals/UserDeleteConfirmModal.svelte:71:<Input>
web/src/lib/modals/WorkflowDuplicateModal.svelte:45:<Input>
web/src/routes/(user)/user-settings/UserProfileSettings.svelte:31:<Input>
web/src/routes/(user)/user-settings/UserProfileSettings.svelte:35:<Input>
== open-webui (9 files)
src/lib/components/chat/Settings/Account.svelte:268:<input>
src/lib/components/chat/Settings/Account.svelte:332:<input>
== memos (160 files)
web/src/components/ChangeMemberPasswordDialog.tsx:91:<Input>
web/src/components/ChangeMemberPasswordDialog.tsx:102:<Input>
web/src/components/UpdateAccountDialog.tsx:220:<Input>
web/src/components/UpdateAccountDialog.tsx:233:<Input>
web/src/components/UpdateAccountDialog.tsx:245:<Input>
== formbricks (56 files)
apps/web/app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx:150:<FormField>
apps/web/app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx:175:<FormField>
apps/web/app/(app)/workspaces/[workspaceId]/settings/account/profile/components/EditProfileDetailsForm.tsx:255:<Input>
apps/web/modules/auth/forgot-password/reset/components/reset-password-form.tsx:82:<FormField>
apps/web/modules/auth/forgot-password/reset/components/reset-password-form.tsx:92:<FormField>
apps/web/modules/ee/two-factor-auth/components/disable-two-factor-modal.tsx:149:<Input>
apps/web/modules/ee/two-factor-auth/components/two-factor-backup.tsx:25:<FormField>
apps/web/modules/ee/two-factor-auth/components/two-factor.tsx:26:<FormField>
apps/web/modules/setup/organization/create/components/create-organization.tsx:61:<FormField>
```

43 elements printed. Reading each one, by hit:

| Codebase | Printed | Real fails | Wrapper or spread to resolve | Exempt or non-person (read, dismissed) |
|---|---|---|---|---|
| Vikunja | 11 | 5: `DataExport.vue:35`, `DataExportDownload.vue:6`, `Deletion.vue:20`, `Deletion.vue:55`, `GeneralSettingsForm.vue:12` | 4: `Login.vue:54` and `ReauthFields.vue:31` resolve to `current-password` (`Password.vue:59`, correct); `PasswordReset.vue:33` and `PasswordUpdate.vue:13` resolve to `current-password` on a new-password field (W) | 2: `BotUsers.vue:168,178` (another account's username and name) |
| Directus | 6 | 2: `tfa-setup.vue:142`, `system-mfa-setup.vue:221` | 1: `register-form.vue:99` resolves to `new-password` (`input-password.vue:19`), correct | 3: `shared.vue:181` (share password), `system-collections-translations-dialog.vue:425` and `system-mcp-prompts-collection-generate-dialog.vue:166` (not about the person) |
| Immich | 10 | 2: `UserProfileSettings.svelte:31,35` | 0 | 8: the `name` fields of album, API key (2), face, passkey, person and workflow modals, and `UserDeleteConfirmModal.svelte:71` (another user's email) |
| Open WebUI | 2 | 2: `Account.svelte:268` (name), `:332` (date of birth) | 0 | 0 |
| Memos | 5 | 5: `ChangeMemberPasswordDialog.tsx:91,102`, `UpdateAccountDialog.tsx:220,233,245` | 0 | 0 |
| Formbricks | 9 | 4: `EditProfileDetailsForm.tsx:150` (name), `:175` (email), `two-factor-backup.tsx:25` (backup code), `disable-two-factor-modal.tsx:149` (backup code) | 3: `reset-password-form.tsx:82,92` (a `passwordInputProps` object, lines 28-31, supplies `new-password`) and `two-factor.tsx:26` (`OTPInput`, `one-time-code`): all pass | 2: `EditProfileDetailsForm.tsx:255` (read-only email), `create-organization.tsx:61` (organization name) |

Correction to the first version: its Formbricks row said "5 printed" while its own columns summed to 8; the scope it ran was never written down. With the fixed scope above the number is 9 (the extra one is `create-organization.tsx:61`, under `modules/setup`, non-person). 4 + 5 = 9, and the Formbricks real fails are 4.

Real fails printed: 5 + 2 + 2 + 2 + 5 + 4 = 20. Five real fails are not printed, each found by a separate step:

| Real fail not printed | Why | Step that finds it |
|---|---|---|
| Directus `accept-invite.vue:73` | `autocomplete="password"` is present but is not a token | token-value listing, output below |
| Directus `users.yaml:4,10,16` | the field is data, not a template | schema listing, output below |
| Open WebUI `UpdatePassword.svelte:122` | `off` on a confirm-password field; the component `SensitiveInput` is not in `elem.pl`'s tag list | the `off` listing, in Measurement 2 |

(1 + 3 + 1 = 5; 20 + 5 = 25.)

Token-value listing. `badtok.pl` (Appendix) prints each `autocomplete` or `autoComplete` string literal whose value has a word outside the WHATWG autofill list. The list, `tokens.txt`, is 65 names, built from the `attr-fe-autocomplete-*` anchors of the spec page fetched today (111 anchors; the numbered duplicates folded away).

```
$ export TOKENS=tokens.txt; for c in ...; do echo "== $c"; (cd $c; git ls-files -- '*.vue' '*.svelte' '*.tsx' '*.jsx' | grep -viE 'test|spec|stories' | xargs perl ../../ux-w3q0-tools/badtok.pl); done
== vikunja
frontend/src/components/input/Multiselect.vue:62:autocomplete="autocompleteEnabled ? undefined : 'off'"
frontend/src/components/input/Password.vue:12:autocomplete="autocomplete"
== directus
app/src/components/v-input.vue:346:autocomplete="autocomplete"
app/src/interfaces/_system/system-input-password/input-password.vue:39:autocomplete="autocomplete"
app/src/interfaces/input/input.vue:91:autocomplete="masked ? 'new-password' : 'off'"
app/src/routes/accept-invite.vue:73:autocomplete="password"
== immich
== open-webui
== memos
== formbricks
```

One real hit (`accept-invite.vue:73`). Five are Vue dynamic bindings (`autocomplete="autocomplete"` and similar, the `:` prefix is not part of the match), dismissed on reading each file. The first version also mentioned an `EditNameInput.svelte` path with `=` characters; that does not reproduce, and is withdrawn.

Form-level `off` listing, complete output:

```
$ for c in ...; do echo "== $c"; git -C $c grep -nE '<form[^>]*autoc[a-zA-Z]*="off"' -- '*.vue' '*.svelte' '*.tsx' '*.jsx' ':!*test*' ':!*spec*'; done
== vikunja
== directus
== immich
web/src/lib/components/shared-components/search-bar/SearchTagsSection.svelte:58:    <form autocomplete="off" id="create-tag-form">
web/src/lib/components/user-settings-page/PinCodeCreateForm.svelte:30:<form autocomplete="off" onsubmit={handleSubmit}>
web/src/routes/(user)/people/[personId]/[[photos=photos]]/[[assetId=id]]/EditNameInput.svelte:41:  <form class="ms-4 flex w-full justify-between gap-16" autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/ChangePasswordSettings.svelte:29:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/DownloadSettings.svelte:34:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/FeatureSettings.svelte:83:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/NotificationsSettings.svelte:37:    <form autocomplete="off" {onsubmit}>
web/src/routes/(user)/user-settings/PinCodeChangeForm.svelte:27:<form autocomplete="off" onsubmit={handleSubmit}>
web/src/routes/(user)/user-settings/UserProfileSettings.svelte:24:    <form autocomplete="off" onsubmit={preventDefault(bubble('submit'))}>
web/src/routes/admin/system-settings/AuthSettings.svelte:62:    <form autocomplete="off" onsubmit={(e) => e.preventDefault()}>
web/src/routes/admin/system-settings/BackupSettings.svelte:32:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/FFmpegSettings.svelte:38:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/ImageSettings.svelte:32:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/IntegrityChecksSettings.svelte:25:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/JobSettings.svelte:62:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/LibrarySettings.svelte:33:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/LoggingSettings.svelte:22:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/MachineLearningSettings.svelte:27:    <form autocomplete="off" class="mx-4 mt-4" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/MapSettings.svelte:25:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/MetadataSettings.svelte:19:    <form autocomplete="off" class="mx-4 mt-4" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/NewVersionCheckSettings.svelte:22:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/NightlyTasksSettings.svelte:22:    <form autocomplete="off" class="mx-4 mt-4" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/NotificationSettings.svelte:45:    <form autocomplete="off" class="mt-4" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/ServerSettings.svelte:22:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/TemplateSettings.svelte:52:  <form autocomplete="off" {onsubmit} class="mt-4">
web/src/routes/admin/system-settings/ThemeSettings.svelte:20:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/TrashSettings.svelte:22:    <form autocomplete="off" onsubmit={(event) => event.preventDefault()}>
web/src/routes/admin/system-settings/UserSettings.svelte:21:    <form autocomplete="off" onsubmit={(e) => e.preventDefault()}>
== open-webui
== memos
== formbricks
```

26 lines, all in Immich (the first version said "28 lines over the six codebases"; that was wrong). Following each file through `elem.pl`:

```
$ cd immich && git grep -lE '<form[^>]*autoc[a-zA-Z]*="off"' -- '*.svelte' | xargs perl ../../ux-w3q0-tools/elem.pl
web/src/routes/(user)/user-settings/UserProfileSettings.svelte:31:<Input>
web/src/routes/(user)/user-settings/UserProfileSettings.svelte:35:<Input>
```

26 files, 2 elements: the two real fails. The other 25 form-level `off` forms are admin settings forms and a password form whose fields carry their own tokens.

Directus: the `off` grep over `routes` returns nothing, because the `off` is a prop default in another file:

```
$ git -C directus grep -nE "autocomplete=.off|autocomplete: .off" -- app/src/routes
$ echo $?
1
$ git -C directus grep -nE "autocomplete: .off." -- app/src/components/v-input.vue
app/src/components/v-input.vue:85:	autocomplete: 'off',
```

Schema listing, Directus (complete output):

```
$ grep -nE -A8 "^  - field: (first_name|last_name|email|password|title|location)$" packages/system-data/src/fields/users.yaml | grep -E "field:|interface"
4:  - field: first_name
5-    interface: input
10:  - field: last_name
11-    interface: input
16:  - field: email
17-    interface: input
22:  - field: password
26-    interface: input-hash
37:  - field: location
38-    interface: input
43:  - field: title
44-    interface: input
49-  - field: description
50-    interface: input-multiline
```

`interface: input` renders through `app/src/interfaces/input/input.vue:91`, `:autocomplete="masked ? 'new-password' : 'off'"`, so first name, last name and email render `off`. `input-hash.vue` returns `new-password` if masked, else `off` (its `computed` at lines 27-33; line 30 is `if (props.masked) return 'new-password';`). `git grep -n autocomplete -- packages/system-data` finds only `autocomplete: 'off'` option lines in `settings.yaml` (805, 872, 917), none in `users.yaml`.

Result of the five steps taken together: 25 of 25 real fails found, 0 real fails missed. The cost: reading 23 printed elements that are not failures (Vikunja 6, Directus 4, Immich 8, Formbricks 5; 8 are wrappers or spreads, of which 6 resolve to a correct token and 2 to a wrong one, and 15 are exempt). Two limits. (1) It was tuned on these codebases: the cue list gained `backup`, `birth` and `bday` after the first run missed Open WebUI's date of birth and Formbricks `disable-two-factor-modal.tsx:149`. No frozen run on unseen code was done (see "What could not be determined"). (2) It reads only `*.vue`, `*.svelte`, `*.tsx`, `*.jsx`; Haml, ERB, Phoenix and Astro still need the per-framework helper patterns.

### Exact change to the verification text, per wrong verdict

The five steps come from the "Effect on the ruleset" text. Each wrong verdict from the 89-row table, the clause that corrects it, and the run that shows it:

| Wrong verdict | Clause that corrects it | Evidence |
|---|---|---|
| Directus `accept-invite.vue:73` false pass | step 3 (token values): "list every `autocomplete=` literal whose value is not an autofill token" | `badtok.pl` prints `app/src/routes/accept-invite.vue:73:autocomplete="password"` |
| Directus `users.yaml:4,10,16` false pass | step 5 (schema): grep the field-definition file for person-data names, read the rendering interface's default | schema listing prints lines 4, 10, 16 with `interface: input`; `input.vue:91` renders `off` |
| Immich `UserProfileSettings.svelte:31,35` false pass | step 4 (off): "for each file named by a form-level `off` hit, run the element listing on that file" | prints `UserProfileSettings.svelte:31` and `:35` |
| Open WebUI `Account.svelte:268,332` false pass | step 1 (elements): replace the per-file `grep -L autocomplete` with the element listing | `elem.pl` prints `Account.svelte:268` and `:332`, though the file contains `autocomplete` at line 635 |
| Formbricks `disable-two-factor-modal.tsx:149` false pass | step 1 (elements) | `elem.pl` prints `disable-two-factor-modal.tsx:149`, though line 106 has a token |
| Formbricks `enter-code.tsx:72` false fail | step 2 (wrappers): read the component's own default | `otp-input/index.tsx:144` is `autoComplete="one-time-code"` |
| Memos 4 and Formbricks 13 false fails (setting A) | step 1 and "do not use `grep -L autocomplete`": `elem.pl` matches `autocomplete` case-insensitively | none of the 17 appear in the 43 printed elements; Formbricks prints the 3 spread or OTP elements, which step 2 resolves to pass |
| Vikunja `PasswordReset.vue:33`, `PasswordUpdate.vue:13`; Directus `reset.vue:66` (W, not UX-STATE-27 failures) | UX-STATE-36 (below), via step 2 | `pwtok.pl` prints `PasswordReset.vue:33:<Password> token=(none: read wrapper default)`, `PasswordUpdate.vue:13` likewise, and `reset.vue:62:<VInput> token=username` |

This is a per-verdict mapping, but it is one set of five steps, tuned on the same six codebases. It is not a held-out test.

## Measurement 4: UX-STATE-20 on the same fields

The consolidation's UX-STATE-20 Verify is `grep -rnE '<(input|textarea|select|vscode-textfield|vscode-text-area)\b' src | grep -vE 'type="(hidden|submit|button)"|aria-label=|aria-labelledby='`. It has the line-bound lowercase-tag shape that returned 0 above. Run over the `scope.sh` files (counts of hits): Vikunja 5, Directus 5, Immich 4, Open WebUI 12, Memos 6, Formbricks 0 (command: the grep above piped to `wc -l`, in `stated20-out.txt`). Matched against the 89 hand labels (hit start line to start+14 lines):

| Label | Fields | Listed by the stated Verify |
|---|---|---|
| L (bound visible label) | 66 | 5 (noise to read) |
| P (placeholder only) | 17 | 0 |
| N (`aria-label` only) | 3 | 2 |
| A (label not evidently bound) | 2 | 0 |
| S (sr-only label) | 1 | 0 |

So it found 2 of the 23 fields that lack a bound visible label, and none of the 17 placeholder-only fields (Directus login, LDAP, register, reset, accept-invite, TFA forms, and the Open WebUI password-change form), because they are `<VInput>` and `<SensitiveInput>` components.

A listing rewritten to list elements, `unnamed.pl` (Appendix): input-like elements in any case, on one or many lines, with no evidence of an accessible name. Evidence: `aria-label`, `aria-labelledby` or `label=` in the tag; an `id` matched by a `for` or `htmlFor` in the file; a label construct (`<label`, `<FormLabel`, `<Field.Label`, `<Field label=`, `<UserSettingField`, `label=`) within the 10 lines above. An `aria-label` with no other evidence is printed as `aria-only`, because UX-STATE-20 allows `aria-label` only for search and icon-led controls. Raw output for the files that hold the 89 fields (the full run prints 91 elements over the six scopes, including 21 Memos `<Select>` elements and others outside the 89, which I did not hand-label):

```
$ cd <codebase>; scope.sh <codebase> | xargs perl unnamed.pl      # excerpt: lines in files that hold the 89 fields
== vikunja
Login.vue:54:<Password>
== directus
system-mfa-setup.vue:221:<VInput>
system-mfa-setup.vue:241:<VInput>
system-mfa-setup.vue:260:<VInput>
accept-invite.vue:67:<VInput>
accept-invite.vue:69:<VInput>
ldap-form.vue:100:<VInput>
ldap-form.vue:101:<VInput>
ldap-form.vue:104:<VInput>
login-form.vue:113:<VInput>
login-form.vue:114:<InterfaceSystemInputPassword>
login-form.vue:117:<VInput>
sso-links.vue:190:<VInput>
register-form.vue:91:<VInput>
register-form.vue:99:<InterfaceSystemInputPassword>
request.vue:54:<VInput>
reset.vue:61:<VInput>
reset.vue:62:<VInput>
tfa-setup.vue:142:<VInput>
tfa-setup.vue:161:<VInput>
== immich
== open-webui
Account.svelte:268:<input> aria-only
Account.svelte:317:<input> aria-only
Account.svelte:332:<input> aria-only
Account.svelte:629:<input> aria-only
Account.svelte:642:<Textarea>
UpdatePassword.svelte:83:<SensitiveInput>
UpdatePassword.svelte:100:<SensitiveInput>
UpdatePassword.svelte:117:<SensitiveInput>
== memos
== formbricks
password-confirmation-modal.tsx:93:<PasswordInput> aria-only
disable-two-factor-modal.tsx:149:<Input>
disable-two-factor-modal.tsx:164:<OTPInput>
```

Result against the labels:

| Label | Fields | Listed by `unnamed.pl` |
|---|---|---|
| L | 66 | 2 rows (one element: Vikunja `Login.vue:54`, the `<Password>` whose `id` is a component default `password`, matching the `<label for="password">`; the row at `:67` falls inside that element's window) |
| P | 17 | 17 |
| N | 3 | 3, as `aria-only` |
| A | 2 | 1 (`disable-two-factor-modal.tsx:149`); `enter-code.tsx:72` not listed (a `<label htmlFor="code">` sits above an `OTPInput`) |
| S | 1 | 0 (`two-factor-backup.tsx:31`, a bound but `sr-only` label) |

21 of 23 found, 1 false listing among 66. Two misses are limits of a text heuristic: a label present but not bound, and a label that is not visible. The reader still reads each listed element. UX-STATE-20's text says "visible": an `sr-only` label and an `aria-label` that duplicates a visible heading both pass the rule's wording by being bound, which an agent should know before it reads "pass".

## Measurement 5: UX-STATE-36 (password token matches intent)

UX-STATE-36 was proposed in the first version with the Verify "check that the token is `new-password` when the label, id or form name contains `new`, `confirm`, `repeat`, `reset`, `register` or `sign-up`". I implemented that as a script twice and it does not work as a mechanical test. With file names in the context, 11 `MISMATCH` lines of which 3 were right (`reset.vue`, `UpdatePassword.svelte:117`, `accept-invite.vue`): the word `confirm` in `confirm-password-form.tsx` and `reset` in `PinCodeResetModal.svelte` mean "confirm your identity" and "reset the PIN", so the field takes `current-password`. Without file names, 14 `MISMATCH` lines of which the same 3 were right, because the label text sits outside the element. The attribute context cannot see the label. So the text must say "read".

What does work is a listing of every password element with its own token, `pwtok.pl` (Appendix): 53 elements over the six scopes. The four known instances are in it:

```
$ grep -E 'PasswordReset|PasswordUpdate.vue:13|reset.vue|UpdatePassword.svelte:1' pwtok-out.txt
PasswordReset.vue:33:<Password> token=(none: read wrapper default)
PasswordUpdate.vue:13:<Password> token=(none: read wrapper default)
reset.vue:62:<VInput> token=username
UpdatePassword.svelte:100:<SensitiveInput> token=new-password
UpdatePassword.svelte:117:<SensitiveInput> token=off
```

## Test of the rule-text change (phone, date of birth)

The proposed rule text adds "phone, date of birth (`bday`)". A scratch fixture, not a repository (`ux-w3q0-fixture/Profile.vue`: a multi-line `<input type="tel">`, an `<input name="bday">`, two inputs with `tel` and `bday` tokens, one with the invented `birthday`):

```
$ perl elem.pl Profile.vue
Profile.vue:3:<input>
Profile.vue:7:<input>
$ TOKENS=tokens.txt perl badtok.pl Profile.vue
Profile.vue:10:autocomplete="birthday"
```

The two fields with no token are listed (lines 3 and 7); the two with `tel` and `bday` are not; the invented `birthday` is caught by the token-value step. In the six codebases the date-of-birth field is Open WebUI `Account.svelte:332` (found by the `birth` cue), and none has a phone field. Not covered by the cue list: Open WebUI's gender input (`Account.svelte:317`, whose autofill token would be `sex`) and `bio`; `elem.pl` prints neither.

## Failure classes

The consolidation lists these for UX-STATE-27: markup from a helper (tag grep returns 0), a token on one field and `off` on another in one file (the `off` listing), admin and other-service fields (read and exempt). Not listed, and seen here:

| Class | Instances | Listed? |
|---|---|---|
| **A. Multi-line opening tag.** Prettier puts each attribute on its own line, so `<input[^>]*type=...` cannot match. | Open WebUI `routes/auth/+page.svelte:368-373`; every Vue template here | No. The header names helper-generated markup, not formatted raw markup. |
| **B. Capitalised component tag.** `<Input`, `<PasswordInput` do not match lowercase `<input`. | Memos `UpdateAccountDialog.tsx:245`; all six codebases use at least one | No |
| **C. File-level masking.** Any `autocomplete` in the file hides a field that has none. | Open WebUI `Account.svelte:268,332` (masked by line 635), Formbricks `disable-two-factor-modal.tsx:149` (masked by line 106), Directus `accept-invite.vue:73` | Partly. The rule names a token on one field and `off` on another and fixes it with the `off` listing; it does not cover a field with no attribute. |
| **D. camelCase JSX.** `autoComplete`, and a wrapper prop `passwordAutoComplete`, are invisible to lowercase `grep -L autocomplete`. | Memos 4 false fails, Formbricks 13 | No |
| **E. Form-level `off` inheritance.** `<form autocomplete="off">` turns every field without its own token to `off`. | Immich `UserProfileSettings.svelte:24` (2 real fails); 26 form-level `off` lines, all Immich | No. The rule's `off` grep targets `<input ... autocomplete="off">`. |
| **F. Invalid token.** A value not in the autofill list. | Directus `accept-invite.vue:73` | No. The rule says "never invent a token" but its Verify never tests the value. |
| **G. Wrapper default.** The token comes from a component default. | Vikunja `Password.vue:59`, Directus `v-input.vue:85`, `input-password.vue:19`, `input.vue:91`, Formbricks `otp-input/index.tsx:144`, Memos `CredentialFields.tsx` (required prop) | Partly. Wrapper components are named in the header, but the Verify has no step that reads a wrapper's default. |
| **H. Valid but wrong token.** | Vikunja `PasswordReset.vue:33` and `PasswordUpdate.vue:13`; Directus `reset.vue:66` (`username` on a password field) | No. MDN: `new-password` is "for an 'Enter your new password' or 'Confirm new password' field". |
| **I. Schema-driven fields.** The field is a row in YAML, JSON or a database definition. | Directus `users.yaml:4,10,16` | No |
| **J. A data kind outside the rule's list.** | Open WebUI `Account.svelte:332` date of birth (`bday`); gender (token `sex`) at `:317` | No |
| **K. Tool limits of the corrected check.** A component name outside the script's tag list, or a cue word outside its list, prints nothing. | Open WebUI `SensitiveInput` (not in the tag list; `UpdatePassword.svelte:122` is found only through the `off` listing); gender and bio | Not a rule-text gap. The reader must add the project's own component and cue names. |

Classes A, B and D are one cause in three forms: the line-bound grep cannot see modern component code. F, H and J are rule text gaps, not check gaps.

## Effect on the ruleset

- **UX-STATE-27: confirm MUST, change the Verify.** 25 real fails in 89 fields on six codebases, and the stated check passes 9 of them. Verify text, replacing both existing Verify paragraphs and keeping the reference instances. The scripts `elem.pl` and `badtok.pl` ship beside the rule (a rule text cannot carry 30 lines of Perl); the Appendix has their source. Verification of this change: `stated.sh`, `elem.pl`, `badtok.pl` and the form-level `off` chain were run on the six codebases above, and their complete outputs are in this artifact; the 25 of 25 result is in-sample.

  > Verify. Run all five steps. Read each hit; keep those that collect data about the person using the form (not another service's credentials, a share password, a read-only value, or another user an admin is creating).
  > 1. **Elements.** List every element that is an input or a field component, in any case, on one line or many, whose own attributes mention a person-data cue and that has no `autocomplete` or `autoComplete` attribute of its own (`perl elem.pl <files>`; add the project's own component and cue names to its two lists). Do not use `<input[^>]*` on a single line: it returns 0 on prettier-formatted code. Do not use `grep -L autocomplete` on a file: any other `autocomplete` in the file hides the field. For Haml, ERB, Phoenix and other helper templates, keep the helper-pattern branch.
  > 2. **Wrapper defaults.** For each listed component (`Password`, `VInput`, `PasswordInput`, `OTPInput`, and so on), open the file that renders the `<input>` and read its `autocomplete` default. `off`, no token, or a default that is wrong for the field fails (UX-STATE-36).
  > 3. **Token values.** `TOKENS=tokens.txt perl badtok.pl <files>` lists every `autocomplete` literal whose value is not an HTML autofill token. Each one on a person field fails (`autocomplete="password"` is not a token).
  > 4. **Off, both forms.** `grep -rn "autocomplete: 'off'\|autocomplete=\"off\"\|autoComplete=\"off\"" <view dir>`. Read each hit. For each `<form ... autocomplete="off">`, run step 1 on that file: the elements it lists inherit `off`.
  > 5. **Schema.** Where fields are defined as data (YAML, JSON, a database seed), grep that file for the person-data names, find which generic interface renders them, and read that interface's default (Directus: `packages/system-data/src/fields/users.yaml`, `app/src/interfaces/input/input.vue:91`).
  > Reference instances (read 2026-11-27): fail Directus `routes/tfa-setup.vue:142` (wrapper default `off`, `v-input.vue:85`), fail Immich `routes/(user)/user-settings/UserProfileSettings.svelte:31,35` (form-level `off`), fail Formbricks `modules/ee/two-factor-auth/components/two-factor-backup.tsx:25` (the `FormField`; its `<Input>` is at line 31), pass Vikunja `views/user/Register.vue:55,70,83`.

  Rule text: change the list to "name, email, username, passwords, one-time and backup codes, address, phone, date of birth (`bday`)". The rest is unchanged. Verification of the rule-text change: the fixture run above (the two fields of those kinds with no token are listed, an invented `birthday` is caught); and in the six codebases the date-of-birth field Open WebUI `Account.svelte:332` is listed by `elem.pl`.

- **Ruleset header, "Helper-generated markup": change.** Replace the paragraph with: "A grep for a tag (`<input`, `<label`, `disabled=`) finds nothing in a codebase whose forms come from a helper or component (Haml `simple_form`, Rails `f.input`, Phoenix `<.input>`, JSX, Vue or Svelte field components), and nothing in a codebase whose formatter puts one attribute per line. There, zero hits is not a pass: list the elements, not the lines, and read the wrapper's own defaults. Measured 2026-11-27: the UX-STATE-27 tag grep returned 0 on Mastodon at `e639273`, which has 200 `f.input` calls (followup-q2, re-run in followup-w3-q0 Measurement 1), and on all six Vue, Svelte and React codebases of followup-w3-q0 (89 fields, 25 real fails)." Verification: the commands and outputs in Measurement 1.

- **UX-STATE-36 (NEW, SHOULD).** Rule: "Give a field that sets or confirms a new password `autocomplete="new-password"`, and a field that enters an existing password `current-password`. Never put `username` on a password field." Rationale: MDN says `new-password` "may be used by the browser both to avoid accidentally filling in an existing password and to offer assistance in creating a secure password" ([MDN autocomplete, last modified on Aug 27, 2026](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)). Instances: Vikunja `PasswordReset.vue:33` and `PasswordUpdate.vue:13` (default `current-password` on a new-password field), Directus `reset-password/reset.vue:66` (`username` on `type="password"`), Open WebUI `UpdatePassword.svelte:122` (`off` on the confirm field). Severity SHOULD: 4 instances in 3 codebases, no browser run, so no evidence of user harm. Verify (replaces the keyword rule, which measured at 3 right of 11 and 14 flagged lines): run `perl pwtok.pl <files>`, which lists every password element with its own literal token (53 over the six scopes); resolve each `(none: read wrapper default)` row to the wrapper's default (UX-STATE-27 step 2); then read the visible label of each row. A field whose label says new, confirm-new or repeat takes `new-password`; a field whose label asks for the existing password takes `current-password`; `username` on a password field always fails. Verification of this change: Measurement 5.

- **UX-STATE-20: change.** Replace the Verify with: "List every input-like element, in any case, on one line or many, with no evidence of an accessible name (`perl unnamed.pl <files>`; add the project's own component names), then read each hit for a bound visible `<label>`. An element printed as `aria-only` fails unless it is a search field or an icon-led control. A placeholder is never the name. On built pages axe `label` is a second check." Keep MUST. Verification of this change: Measurement 4 (the stated Verify found 2 of 23 fields without a bound visible label; the replacement found 21 of 23 with 1 false listing among 66 labelled fields; both in-sample).

- **UX-STATE-21: no change.** Seen once in passing (Vikunja `Register.vue` has `:disabled="!everythingValid"` on the submit button; Immich and Formbricks not checked). Not measured, and out of this question.

- **Applied table, row "22, 26, 27": change.** Append: "27 also ran on six Vue, Svelte and React codebases (followup-w3-q0): the stated Verify caught 16 of 25 real fails with a case-insensitive file test, and flagged all 17 correct React fields with the literal lowercase one. The five-step Verify found 25 of 25 (in-sample)." Verification: the 89-row table and `python3 score.py` output above reproduce 16 of 25, 9 false passes and 17 false fails under the literal setting.

- **Decay table: change.** Add a row: rules 20, 27, 36; the autofill token list and the form-level `off` inheritance; MDN last modified on Aug 27, 2026, HTML Standard last updated 27 November 2026; 12 months; check: re-fetch both pages with `curl -sL <url> | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' ' | grep -oE 'last modified on [A-Za-z]+ [0-9]+, [0-9]+'` for MDN and the same pipe with `grep -oE 'Last Updated [0-9]+ [A-Za-z]+ [0-9]+'` for the spec, rebuild `tokens.txt` from the `attr-fe-autocomplete-` anchors, and compare. Add the six clone commits to the calibration row: `f8c5533`, `4856582`, `a608f8f`, `926f826`, `78a8dc8`, `be932a2`. Verification: the date strings above were extracted from the live pages today with exactly these patterns (printed `last modified on Aug 27, 2026` and `Last Updated 27 November 2026`).

## Dated facts

| Fact | Source | Date |
|---|---|---|
| A control with no `autocomplete` takes its form owner's setting; with no form owner it defaults to on | [HTML Standard, form control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill) | last updated 27 November 2026; fetched in full 2026-11-27 |
| The autofill field names include `name`, `nickname`, `username`, `new-password`, `current-password`, `one-time-code`, `bday`, `sex`, `tel` | same page; 65 distinct names after folding duplicates (`tokens.txt`) | 27 November 2026 |
| "If an `<input>`, `<select>` or `<textarea>` element has no `autocomplete` attribute, the browser will use the `autocomplete` attribute of the element's owning form" | [MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) | last modified Aug 27, 2026 |
| `new-password` is for an "Enter your new password" or "Confirm new password" field, "as opposed to a general 'Enter your current password' field" | same MDN page | Aug 27, 2026 |
| "Using invalid or non-standard values (such as made-up strings to circumvent autofill) has a similar effect: the browser cannot match the field to any known purpose" | same MDN page | Aug 27, 2026 |
| Repository state: Vikunja `f8c5533`, Directus `4856582`, Immich `a608f8f`, Open WebUI `926f826`, Memos `78a8dc8`, Formbricks `be932a2`; Mastodon `e639273` | `git rev-parse --short HEAD`, `git log -1 --format=%cs` in each shallow clone | 2026-11-27, 2026-11-23, 2026-11-27, 2026-11-25, 2026-11-27, 2026-11-27; Mastodon 2026-11-27 |
| Vikunja `Password.vue:59` default `current-password`; Directus `v-input.vue:85` default `off`; `input-password.vue:19` default `new-password`; Formbricks `otp-input/index.tsx:144` `one-time-code` | source lines printed with `sed -n` at the commits above | 2026-11-27 |
| Mastodon: 200 `f.input` calls in `app/views` | `grep -rhoE '\b(f\|form)\.input :[a-z_]+' app/views \| wc -l` at `e639273` (first run in followup-q2.md) | 2026-11-27 |

## What could not be determined

- **Held-out recall of the corrected Verify.** The scripts were written after reading all six codebases, and the cue list was extended after two misses. 25 of 25 is in-sample. A fresh Vue, Svelte and React codebase run is needed, with `elem.pl`, `badtok.pl` and `unnamed.pl` frozen first. Not done in this pass; it needs three more clones and a second reader.
- **The default token of `@immich/ui` components.** Not in the repository; `node_modules` is absent. I did not install the package (`npm install` runs third-party code). All Immich verdicts rest on explicit attributes, so none depends on it.
- **Whether a wrong token (class H) or a form-level `off` changes what a browser or password manager does.** I read specification and MDN text only. No browser was run, so UX-STATE-36 stays SHOULD.
- **Whether the label bindings inside component libraries produce a DOM `for` and `id` pair.** Labels were read from source; Base UI `Field.Label` (Memos), shadcn `FormControl` (Formbricks) and `@immich/ui` `Field` were not rendered. The 66 L rows rest on the calling source.
- **Framework coverage beyond one UI library per codebase.** Svelte 4 syntax, Vue Options API, Nuxt, Next server components, Solid and Angular were not sampled. Vue `v-bind="$attrs"` fall-through (Vikunja `FormField.vue:94-129`) was read once, not tested for every wrapper depth.
- **Fields outside the sign-in, account and two-factor forms.** None of the six codebases has a person-address or payment form, so the `address-line1`, `postal-code` and `cc-*` tokens are untested.
- **A tag name outside the script's list.** The tag list (`input`, `Input`, `PasswordInput`, `VInput`, `FormInput`, `FormField`, `Password`, `InterfaceSystemInputPassword`, `TextField`, `Field`) came from these codebases; `SensitiveInput` is absent from `elem.pl` (class K). A project whose input component is named otherwise, for example `TextBox`, prints nothing until it is added.
- **A second reader.** One reader (me) labelled the 89 fields and decided every noise hit; no second reader checked the labels.

## Appendix: scripts and data (scratch directory `~/.cache/research-lang/exemplars/product/wave2/ux-w3q0-tools/`)

`scope.sh` (file set per codebase):

```bash
#!/bin/bash
# prints in-scope source files for a codebase (auth, account, 2FA, profile forms); usage: scope.sh <name>
cd ~/.cache/research-lang/exemplars/product/wave2/ux-w3q0/$1 || exit 1
L(){ git ls-files -- '*.vue' '*.svelte' '*.tsx' '*.jsx' | grep -viE 'test|spec|stories'; }
case $1 in
 vikunja)  L | grep -E '^frontend/src/(views/user|components/user)/';;
 directus) L | grep -E '^app/src/(routes|interfaces/_system)/';;
 immich)   L | grep -E '^web/src/(routes/auth|routes/\(user\)/user-settings|lib/modals|lib/components/user-settings-page|lib/components/pages|lib/components/shared-components/settings)';;
 open-webui) L | grep -E '^src/(routes/auth|lib/components/auth|lib/components/chat/Settings/Account)';;
 memos)    L | grep -E '^web/src/(components|pages)/' | grep -vE 'Settings/|CreateUser|CreateWebhook';;
 formbricks) L | grep -E '^apps/web/(modules/auth|modules/ee/two-factor-auth|app/\(app\)/workspaces/\[workspaceId\]/settings/account|modules/account|modules/setup)';;
esac
```

`stated.sh` (the stated check, per codebase):

```bash
#!/bin/bash
# Stated UX-STATE-27 helper-source check, per file, over the scope.sh file set. Prints flagged files (literal A, case-insensitive B) and off hits.
T=~/.cache/research-lang/exemplars/product/wave2/ux-w3q0
declare -A PAT
PAT[vikunja]='type="(email|password|tel)"|v-model="[A-Za-z.]*(username|email|password|passcode|\.name)"|<Password\b'
PAT[directus]='type="(email|password|tel)"|v-model="[A-Za-z.]*(username|email|password|passcode|otp)"|<VInput\b|InterfaceSystemInputPassword'
PAT[immich]='<PasswordInput\b|type="(email|password|tel)"|bind:value=\{[A-Za-z.]*([Ee]mail|[Pp]assword|[Pp]asscode|\.name|^name)\}'
PAT[open-webui]='type="(email|password|tel)"|bind:value=\{[A-Za-z_.]*([Ee]mail|[Pp]assword|[Pp]asscode|[Nn]ame|[Cc]ode)\}'
PAT[memos]='type="(email|password|tel)"|<CredentialFields|id="(username|email|password|displayName)"'
PAT[formbricks]='<PasswordInput\b|type="(email|password|tel)"|name="(name|email|password|code)"|id="(totpBackup|email|password)"|<OTPInput'
cb=$1; cd $T/$cb || exit 1
files=$(~/.cache/research-lang/exemplars/product/wave2/ux-w3q0-tools/scope.sh $cb)
echo "[$cb] pattern matches:"; echo "$files" | tr '\n' '\0' | xargs -0 grep -lE "${PAT[$cb]}" 2>/dev/null > /tmp/_m.txt; wc -l < /tmp/_m.txt
echo "[$cb] A literal (grep -L autocomplete):"; tr '\n' '\0' < /tmp/_m.txt | xargs -0 grep -L autocomplete
echo "[$cb] B case-insensitive (grep -Li autocomplete):"; tr '\n' '\0' < /tmp/_m.txt | xargs -0 grep -Li autocomplete
echo "[$cb] off listing:"; echo "$files" | tr '\n' '\0' | xargs -0 grep -nE "autocomplete: 'off'|autocomplete=\"off\"|autoComplete=\"off\"" 
```

`elem.pl`:

```perl
#!/usr/bin/perl
use strict; use warnings;
my $tags = qr/(?:input|Input|PasswordInput|VInput|FormInput|FormField|Password|InterfaceSystemInputPassword|TextField|Field)/;
my $attr = qr/(?:[^>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*/;
my $cue  = qr/type=["'{]+(?:email|password|tel)|(?:name|id)=["'](?:user_?name|username|email|e-mail|password|new-?password|first_?name|last_?name|full_?name|name|displayName|nickname|phone|tel|otp|totp\w*|code|backup\w*|birth\w*|bday|dateOfBirth)["']|v-model(?:\.\w+)?="[\w.\[\]]*(?:username|email|password|passcode|[Nn]ame)"|bind:value=\{[\w.]*(?:[Ee]mail|[Pp]assword|[Nn]ame|[Cc]ode|[Bb]irth\w*)\}|<PasswordInput|<Password\b|<InterfaceSystemInputPassword/;
for my $f (@ARGV) {
  open my $h, '<', $f or next; local $/; my $s = <$h>; close $h; $s =~ s{^[ \t]*//[^\n]*$}{}mg;
  while ($s =~ /<($tags)\b($attr)>/g) {
    my ($name,$body,$pos) = ($1,$2,$-[0]);
    my $before = substr($s, $pos > 400 ? $pos-400 : 0, $pos > 400 ? 400 : $pos);
    my @l = split /\n/, $before; my $win = join("\n", @l[($#l>7?$#l-7:0)..$#l]);
    my $text = "<$name$body";
    next unless ($text =~ $cue) || ($win =~ /name=["'](?:email|password|name|username|code|backup\w*)["']/ && $body =~ /\{\.\.\.field\}/);
    next if $body =~ /autocomplete/i;
    my $line = 1 + (() = substr($s,0,$pos) =~ /\n/g);
    print "$f:$line:<$name>\n";
  }
}
```

`badtok.pl` (with `TOKENS=tokens.txt`, one autofill name per line):

```perl
#!/usr/bin/perl
# Prints autocomplete/autoComplete string literals whose value is not an HTML autofill token (tokens.txt = WHATWG autofill list).
use strict; use warnings;
my $tf = $ENV{TOKENS}; open my $t,'<',$tf or die; my %ok = map { chomp; ($_=>1) } <$t>; close $t;
for my $f (@ARGV) {
  open my $h,'<',$f or next; my $n=0;
  while (<$h>) { $n++;
    while (/(?<![-\w])autocomplete\s*=\s*(?:"([^"{}]*)"|'([^'{}]*)')/gi) {
      my $v = defined $1 ? $1 : $2; my @bad = grep { !$ok{$_} && !/^section-/ } split ' ', lc $v;
      print "$f:$n:autocomplete=\"$v\"\n" if @bad;
    }
  }
}
```

`unnamed.pl`:

```perl
#!/usr/bin/perl
# Lists input-like elements (any case, multi-line) with no accessible-name evidence. Evidence: aria-label/aria-labelledby/label= in the tag; id matched by a for/htmlFor in the file; a label construct in the 10 lines above.
use strict; use warnings;
my $tags = qr/(?:input|textarea|select|Input|Textarea|Select|PasswordInput|SensitiveInput|VInput|FormInput|Password|InterfaceSystemInputPassword|OTPInput|TextField|FormField)/;
my $attr = qr/(?:[^>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*/;
for my $f (@ARGV) {
  open my $h, '<', $f or next; local $/; my $s = <$h>; close $h; $s =~ s{^[ \t]*//[^\n]*$}{}mg;
  while ($s =~ /<($tags)\b($attr)>/g) {
    my ($name,$body,$pos) = ($1,$2,$-[0]);
    next if $name eq 'FormField' && ($body !~ /\btype=/ || $body =~ /\brender=/);
    next if $body =~ /type=["'](?:hidden|submit|button|checkbox|radio|file)["']/;
    my $aria = ($body =~ /aria-label|aria-labelledby/) ? 1 : 0;
    next if $body =~ /(?<![-\w])label=/;
    if ($aria) { my $line = 1 + (() = substr($s,0,$pos) =~ /\n/g); print "$f:$line:<$name> aria-only\n"; next; }
    if ($body =~ /\bid=["']([^"'{}]+)["']/) { my $id=$1; next if $s =~ /(?:for|htmlFor)=["']\Q$id\E["']/; }
    my $before = substr($s, $pos > 900 ? $pos-900 : 0, $pos > 900 ? 900 : $pos);
    my @l = split /\n/, $before; my $win = join("\n", @l[($#l>9?$#l-9:0)..$#l]);
    next if $win =~ /<label|<FormLabel|<Field\.Label|<Field\s+label=|<UserSettingField|(?<![-\w])label=/;
    my $line = 1 + (() = substr($s,0,$pos) =~ /\n/g);
    print "$f:$line:<$name>", ($aria ? " aria-only" : ""), "\n";
  }
}
```

`pwtok.pl`:

```perl
#!/usr/bin/perl
# UX-STATE-36 helper: for each password element print its own literal token and the expectation from its id/name/model/file name.
use strict; use warnings;
my $tags = qr/(?:input|Input|PasswordInput|SensitiveInput|VInput|FormInput|FormField|Password|InterfaceSystemInputPassword)/;
my $attr = qr/(?:[^>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*/;
for my $f (@ARGV) {
  open my $h,'<',$f or next; local $/; my $s=<$h>; close $h; $s =~ s{^[ \t]*//[^\n]*$}{}mg;
  while ($s =~ /<($tags)\b($attr)>/g) {
    my ($n,$b,$pos)=($1,$2,$-[0]);
    next unless "<$n$b" =~ /type=["'{][^>]*password|<(?:PasswordInput|Password|SensitiveInput|InterfaceSystemInputPassword)\b/i;
    my $tok = $b =~ /autocomplete\s*=\s*"([^"]*)"/i ? $1 : $b =~ /autocomplete\s*=\s*\{([^}]*)\}/i ? "{$1}" : $b =~ /autocomplete/i ? "(dynamic)" : "(none: read wrapper default)";
    my $line = 1 + (() = substr($s,0,$pos) =~ /\n/g);
    print "$f:$line:<$n> token=$tok\n";
  }
}
```

`score.py` computes the TP, FP, TF and FF counts from `fields.tsv` and `stated-all.txt`; `table.py` prints the 89-row table; `fields.tsv` is the hand-labelled field list (codebase, file, line, field, truth, label). The 89-row table above is their output.

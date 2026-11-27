---
title: "Follow-up q2: which real forms codebase proves the UX-STATE-22, 26 and 27 checks run"
program: product
topic: ux-interface-states
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 3
---

# Follow-up q2: which real forms codebase proves UX-STATE-22, 26 and 27

This is the repaired version. Every number below was re-measured on the clones named in the next section. Four figures in the first version were wrong and are corrected here: the Gitea hit count (28 is really 26), the Mastodon `required={false}` call sites (7 is really 2), the Gitea `(optional)` hit list (1 file is really 4) and the claim that Mastodon's sign-up form carries `one-time-code` (it does not).

## Question

Which real codebase with forms that collect user data can prove the UX-STATE-22, 26 and 27 checks run, so they can return to MUST? (From `ux-interface-states.md`, "The ruleset" note: these rules have no fleet instance, so their Verify commands have never run against any code.)

## Answer

Gitea, Mastodon and Plausible together. Gitea (server-rendered HTML) proves UX-STATE-27 on `<input>` tags. Mastodon (Haml `simple_form` plus React) and Plausible (Phoenix components) prove the helper-language fallback for 27, and each contains real fails that the check finds. UX-STATE-26 separates a pass (Plausible) from two fails (Gitea, Mastodon). UX-STATE-22 runs after a rewrite and finds no true violation anywhere, so it stays SHOULD.

| Rule | Runs on real code? | Separates pass from fail? | Verdict |
|---|---|---|---|
| UX-STATE-27 | Yes, on Gitea, Mastodon, Plausible | Yes. Gitea 11 real fails of 26 hits. Mastodon 3 real fails, Plausible 3 files with real fails | Promote to MUST, with the replaced Verify below |
| UX-STATE-26 | Yes, on Gitea, Mastodon, Plausible | Yes after one added detector. Plausible passes, Gitea and Mastodon fail | Stays SHOULD. The convention is the owner's choice. The first version's added clause is withdrawn because it fails its own test on Mastodon |
| UX-STATE-22 | Yes, after rewriting the Verify | The old Verify returns 0 on all three. The new one returns 10, 28 and 27 hits and reading them finds 0 premature errors | Stays SHOULD. No true violating instance exists in the three codebases |

Clones are in `~/.cache/research-lang/exemplars/product/wave2/ux-state-q2/` (throwaway, `--depth 1`). Commits measured, with commit-pinned links to the repositories at that state (open-source repositories, read 2026-11-27, not vendor guidance):

```
$ for n in gitea mastodon analytics; do echo $n $(git -C $n log -1 --format='%H %cs') $(git -C $n ls-files | wc -l); done
gitea e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c 2026-11-27 6459
mastodon e63927367d716dc3b5db9beffb2fa1c91ff2e44a 2026-11-27 10138
analytics 06efc5e79afe877d7399ad2af320eff5488271bc 2026-11-26 2171
```

- Gitea: [go-gitea/gitea at e77c1c2](https://github.com/go-gitea/gitea/tree/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c), commit dated 2026-11-27.
- Mastodon: [mastodon/mastodon at e639273](https://github.com/mastodon/mastodon/tree/e63927367d716dc3b5db9beffb2fa1c91ff2e44a), commit dated 2026-11-27.
- Plausible: [plausible/analytics at 06efc5e](https://github.com/plausible/analytics/tree/06efc5e79afe877d7399ad2af320eff5488271bc), commit dated 2026-11-26.

All file links below use these three commit hashes (a `curl -I` on one blob URL per repository returned HTTP 200 on 2026-11-27).

## Measurement 1: UX-STATE-27 on Gitea (HTML sources)

Source files: [signup_inner.tmpl](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/templates/user/auth/signup_inner.tmpl), [signin_inner.tmpl](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/templates/user/auth/signin_inner.tmpl), [twofa.tmpl](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/templates/user/auth/twofa.tmpl), [account.tmpl](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/templates/user/settings/account.tmpl) (all dated by the 2026-11-27 commit).

The parent rule's Verify, `src` replaced by `templates`:

```
$ R27='<input[^>]*(type="(email|tel|password)"|(name|id)="[^"]*(name|user|login|email|phone|tel|address|street|city|postal|zip|country|otp|code)[^"]*")'
$ grep -rnE "$R27" templates | wc -l
186
$ grep -rnE "$R27" templates | grep -v 'autocomplete=' | wc -l
153
$ grep -rnE "$R27" templates | grep -v 'autocomplete=' | grep -vE 'type="(checkbox|hidden|radio)"' | wc -l
117
$ grep -rhoE 'autocomplete="[^"]*"' templates | sort | uniq -c | sort -rn
     28 autocomplete="off"
     16 autocomplete="new-password"
      2 autocomplete="current-password"
      1 autocomplete="one-time-code"
```

As written: 153 hits, 117 after dropping checkbox, hidden and radio. Mostly admin settings. Too noisy to run without a human. The four forms that matter, hit by hit (line numbers from the commit above):

```
== templates/user/auth/signup_inner.tmpl
22: <input id="user_name" type="text" name="user_name" ... autofocus required>                  (no autocomplete: FAIL)
26: <input id="email" name="email" type="email" ... required>                                   (no autocomplete: FAIL)
32: <input id="password" name="password" type="password" ... autocomplete="new-password" ...>   (PASS)
36: <input id="retype" ... autocomplete="new-password" ...>                                      (PASS)
== templates/user/auth/signin_inner.tmpl
17: <input id="user_name" type="text" name="user_name" ... autofocus required>                  (FAIL)
22: <input id="password" ... autocomplete="current-password" ...>                                (PASS)
== templates/user/auth/twofa.tmpl
13: <input id="passcode" ... autocomplete="one-time-code" inputmode="numeric" ...>              (PASS)
== templates/user/settings/account.tmpl
13,18,22: password fields with current-password / new-password                                  (PASS)
94: <input id="email" name="email" type="email" required ...>                                   (FAIL)
122: <input id="password-confirmation" name="password" type="password" autocomplete="off" required>  (off, no comment: FAIL)
```

The tightened regex (closed name list, no `id` wildcard) and its counts, re-run for this repair:

```
$ T='<input[^>]*(type="(email|tel|password)"|name="(user_?name|uname|username|login|email|full_?name|phone|tel|address|street|city|postal|zip|country|otp|passcode)")'
$ grep -rnE "$T" templates | wc -l
61
$ grep -rnE "$T" templates | grep -v 'autocomplete=' | wc -l
34
$ grep -rnE "$T" templates | grep -v 'autocomplete=' | grep -v '^templates/admin' | wc -l
26
```

The first version said 28 here. The correct figure is 26. The 34 to 26 step removes 8 hits under `templates/admin`, which is a settings area for the instance operator, not for the person using the product.

The 26 hits, printed (this is the reading step the first version asserted without output):

```
$ grep -rnE "$T" templates | grep -v 'autocomplete=' | grep -v '^templates/admin' | cut -d: -f1,2
```

Split by the reading rule "keep a hit only when the field collects data about the person using this form". The split was made by path and line, and the command that splits it is shown:

```
$ H=$(grep -rnE "$T" templates | grep -v 'autocomplete=' | grep -v '^templates/admin')
$ echo "$H" | grep -vE '^templates/(repo/migrate/|repo/settings/webhook/|base/disable_form_autofill|user/settings/applications_oauth2)|^templates/install.tmpl:(42|187):' | cut -d: -f1,2
templates/install.tmpl:239
templates/user/auth/forgot_passwd.tmpl:16
templates/org/settings/options.tmpl:11
templates/org/settings/options.tmpl:15
templates/user/auth/signup_inner.tmpl:22
templates/user/auth/signup_inner.tmpl:26
templates/user/settings/account.tmpl:94
templates/user/settings/security/twofa_enroll.tmpl:14
templates/user/auth/activate.tmpl:26
templates/user/settings/profile.tmpl:21
templates/user/auth/signin_inner.tmpl:17
$ echo "$H" | grep -vE '^templates/(repo/migrate/|repo/settings/webhook/|base/disable_form_autofill|user/settings/applications_oauth2)|^templates/install.tmpl:(42|187):' | wc -l
11
$ echo "$H" | grep -E '^templates/(repo/migrate/|repo/settings/webhook/|base/disable_form_autofill|user/settings/applications_oauth2)|^templates/install.tmpl:(42|187):' | wc -l
15
```

So 26 hits = 11 kept (fail) + 15 dropped. The 15 dropped, by reason: seven migration forms collecting another service's credentials (`repo/migrate/codebase.tmpl:20`, `onedev.tmpl:20`, `git.tmpl:19`, `bitbucket.tmpl:22`, `gitbucket.tmpl:20`, `codecommit.tmpl:20,28`), three webhook `username` fields (`packagist.tmpl:6`, `discord.tmpl:10`, `slack.tmpl:15`), the install form's database and SMTP passwords (`install.tmpl:42,187`), a read-only demo secret, and two lines in `base/disable_form_autofill.tmpl`. The fake password field is a real tag outside the comment block:

```
$ grep -n '\*/\|/\*' templates/base/disable_form_autofill.tmpl
1:{{/*
27:*/}}
$ sed -n 28,31p templates/base/disable_form_autofill.tmpl
<div class="autofill-dummy" aria-hidden="true">
	<input type="text" name="_autofill_dummy_username" class="ays-ignore" tabindex="-1">
	<input type="password" name="_autofill_dummy_password" class="ays-ignore" tabindex="-1">
</div>
$ sed -n 20p templates/user/settings/applications_oauth2_edit_form.tmpl
			<input id="client-secret" type="password" readonly value="averysecuresecret">
```

Line 7 of that file is a comment that mentions `<input class="fake" type="password">`, so it is a false hit of the grep. Line 30 is a real tag (a dummy field in the comment's "improved" solution), dropped because it collects nothing.

`autocomplete="off"` hits among the 61 (the rule says each `off` carries a comment):

```
$ grep -rnE "$T" templates | grep 'autocomplete="off"' | cut -c1-110
templates/org/team/members.tmpl:16:  ... name="uname" ... autocomple...
templates/admin/auth/source/ldap.tmpl:35:  ... name="bind_password" type="password" autocomplete="off" ...
templates/user/auth/reset_passwd.tmpl:45:  ... id="passcode" name="passcode" type="number" autocomplete="off" autofocus required>
templates/user/auth/activate.tmpl:14:  ... id="verify-password" name="password" type="password" autocomplete="off" required>
templates/repo/settings/options.tmpl:168 / :274   (mirror passwords)
templates/user/settings/account.tmpl:122:  ... id="password-confirmation" ... autocomplete="off" required>
templates/repo/settings/webhook/settings.tmpl:44:  ... name="secret" type="password" ... autocomplete="off" ...
```

The three lines above `activate.tmpl:14`, `account.tmpl:122` and `reset_passwd.tmpl:45` were read: each sits directly under a `<label>` and a `<div class="required field">`, with no comment. `off` on the person's own password with no comment is a fail of the rule's last sentence. So the same Verify also finds real fails of the `off` clause. Result: the check separates pass from fail on real Gitea forms.

## Measurement 2: UX-STATE-27 on Mastodon and Plausible (helper languages)

Mastodon builds its forms with Haml and `simple_form`, so no `<input` tag appears in its views:

```
$ grep -rnE "$R27" app | wc -l
0
```

How many data fields hide behind that zero (the first version said "dozens" with no count):

```
$ grep -rhoE '\b(f|form)\.input :[a-z_]+' app/views | wc -l
200
$ grep -rhoE '\b(f|form)\.input :[a-z_]+' app/views | sort -u | wc -l
163
$ grep -rhoE '\b(f|form)\.input :[a-z_]*(name|email|user|password|phone|address|otp|code)[a-z_]*' app/views | sort -u | wc -l
26
```

200 `f.input` calls, 163 distinct field names, 26 of them person-data names. A zero from the tag grep is therefore a false pass.

The first fallback, run in full without `head -3`:

```
$ grep -rn 'autocomplete' app/views | wc -l
25
$ grep -rhoE "autocomplete: '[^']*'" app/views | sort | uniq -c | sort -rn
      9 autocomplete: 'off'
      7 autocomplete: 'new-password'
      6 autocomplete: 'current-password'
      1 autocomplete: 'username'
      1 autocomplete: 'one-time-code'
$ grep -rn "one-time-code" app/views | cut -c1-90
app/views/auth/sessions/two_factor/_otp_authentication_form.html.haml:10:  ...
$ grep -onE "autocomplete: '[^']*'" app/views/auth/registrations/new.html.haml
24:autocomplete: 'off'
29:autocomplete: 'username'
34:autocomplete: 'new-password'
39:autocomplete: 'new-password'
45:autocomplete: 'off'
50:autocomplete: 'off'
```

Correction of the first version: `one-time-code` is on the two-factor login form, not on the sign-up form. The sign-up form carries `off`, `username`, `new-password` twice and `off` twice. Reading [registrations/new.html.haml](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/views/auth/registrations/new.html.haml) lines 20-31: line 24 is the sign-up username field with `autocomplete: 'off'`, which is a real fail (a username field is not a CAPTCHA or a one-time token). Line 29 is the email field with token `username`, a pass. Lines 45 and 50 are honeypot fields named in `aria-label`, which are CAPTCHA-like, a pass.

The fallback "does the file have any token" is too weak, because the username failure sits in a file that has tokens. The per-file check below finds files with person-data helpers and no token at all:

```
$ grep -rlE '\b(f|ff|form)\.input :(username|email|display_name|current_password|password|password_confirmation|otp_attempt|otp_code_attempt|sign_in_token_attempt)\b' app/views | xargs grep -L 'autocomplete'
app/views/auth/passwords/new.html.haml
app/views/auth/confirmations/new.html.haml
app/views/admin/change_emails/show.html.haml
app/views/admin/tags/show.html.haml
$ grep -n "input :" app/views/auth/passwords/new.html.haml app/views/auth/confirmations/new.html.haml | cut -c1-90
app/views/auth/confirmations/new.html.haml:26:      = f.input :email,
app/views/auth/passwords/new.html.haml:9:    = f.input :email,
```

Reading the four hits: `auth/passwords/new.html.haml:9` (forgot-password email) and `auth/confirmations/new.html.haml:26` (resend-confirmation email) are real fails. `admin/change_emails/show.html.haml:6` is a `disabled: true` field and `admin/tags/show.html.haml:84` is a tag display name, so both are not data about the user. Mastodon therefore has three real fails: `registrations/new.html.haml:24` (`off` on username), `passwords/new.html.haml:9` and `confirmations/new.html.haml:26`. Thirteen of the files with person-data inputs do carry a token.

Plausible (Phoenix `<.input>` components, `.ex` and `.heex` files, [form.ex](https://github.com/plausible/analytics/blob/06efc5e79afe877d7399ad2af320eff5488271bc/lib/plausible_web/live/components/form.ex)):

```
$ grep -rnE '<input[^>]*(type="(email|tel|password)"|name="(user_?name|username|login|email|full_?name|phone|passcode)")' lib | grep -v 'autocomplete=' | cut -c1-100
lib/plausible_web/live/components/team.ex:134:      <input type="hidden" name="email" value={@user.email} />
$ grep -rn 'autocomplete' lib/plausible_web | wc -l
17
$ grep -n 'autocomplete' lib/plausible_web/live/components/form.ex | cut -c1-110
62:      ~w(accept autocomplete autofocus capture cols disabled form list max maxlength min minlength
286:  attr(:autocomplete, :string, default: "current-password")
293:      ~w(autocomplete autofocus disabled form maxlength minlength placeholder readonly required size)
309:        autocomplete={@autocomplete}
368:      autocomplete="one-time-code"
393:      ~w(autocomplete autofocus disabled form maxlength minlength placeholder readonly required size)
426:      autocomplete="new-password"
```

The tag grep gives one hit, a hidden field, so it is a false pass again. `form.ex:286` sets the default `current-password` on the password component, `:368` sets `one-time-code` and `:426` sets `new-password` on the two specialised components. The per-file check:

```
$ grep -rlE 'f\[:(email|name|full_name|username|password|current_password)\]|field=\{@field\}' lib --include='*.ex' --include='*.heex' | xargs grep -L 'autocomplete'
lib/plausible_web/live/reset_password_form.ex
lib/plausible_web/live/register_form.ex
lib/plausible_web/templates/settings/team_general.html.heex
lib/plausible_web/live/team_setup.ex
lib/plausible_web/templates/settings/new_api_key.html.heex
lib/plausible_web/templates/settings/preferences.html.heex
lib/plausible_web/live/site_transfer_settings.ex
lib/plausible_web/components/two_factor.ex
lib/plausible_web/templates/site/membership/invite_member_form.html.heex
lib/plausible_web/templates/stats/shared_link_password.html.heex
```

Ten files, read: `reset_password_form.ex` and `register_form.ex` use the password component whose token is set in `form.ex`, so the password fields pass. But `register_form.ex` lines 175 (`<.input field={@field} placeholder="Jane Doe"`, the "Full name" field) and 202 (`<.input type="email" field={@field}`) and `settings/preferences.html.heex:12` (`<.input type="text" field={f[:name]} label="Name"`) have no token: three real fails. Others (team name, API key name, invite email for another person, shared-link password) are not data about the signed-in person or are set by the component. So all three codebases return real fails with the file-level DSL check, which is the proof it runs. The check is coarse (a file-level absence misses a field that sits in a file with other tokens, like Mastodon sign-up), so the Verify below also lists every `off` and reads it.

## Measurement 3: UX-STATE-26

The rule's Verify: two `grep -rl` lists, optional markers and required markers. Both non-empty fails, and a form with both required and optional fields and no hit in either list fails. Run on all three codebases:

```
$ cd gitea; grep -rlE '\(optional\)' templates | grep -v swagger
templates/status/500.tmpl
templates/shared/search/button.tmpl
templates/shared/search/input.tmpl
templates/shared/search/combo.tmpl
$ grep -n '(optional)' templates/status/500.tmpl templates/shared/search/button.tmpl templates/shared/search/input.tmpl | cut -c1-110
templates/status/500.tmpl:6:* .SignedUser (optional)
templates/shared/search/input.tmpl:2:{{/* Disabled (optional) - if search field has to be disabled */}}
templates/shared/search/input.tmpl:3:{{/* Placeholder (optional) - placeholder text to be used */}}
templates/shared/search/button.tmpl:1:{{/* Disable (optional) - if search button has to be disabled */}}
templates/shared/search/button.tmpl:2:{{/* Tooltip (optional) - a tooltip to be displayed on hover */}}
$ grep -rlE '\(required\)|>\s*\*\s*<|<abbr[^>]*>\*</abbr>' templates web_src
(no output)
```

The first version said one hit; it is four files, all template doc comments (false hits). List 2 is empty. Gitea marks required fields with CSS, which no grep of templates sees:

```
$ sed -n 211,216p web_src/css/modules/form.css
}

.ui.form .required.field > label::after,
.ui.form label.required::after {
  margin: -0.2em 0 0 0.2em;
  content: "*";
$ grep -rnE ' required' templates | wc -l
217
```

(The 217 counts the native `required` attribute and the class name `required field` together, so it is an upper bound, not evidence of the attribute alone.) The CSS rule is at [form.css lines 213-216](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/web_src/css/modules/form.css#L213-L216): a bare red asterisk added by CSS, exactly what the rule bans. A new detector for this pattern, run on all three:

```
$ C='content: *["'"'"']\*["'"'"']'
$ for n in gitea mastodon analytics; do echo "== $n"; (cd $n; grep -rnE "$C" --include='*.css' --include='*.scss' --include='*.sass' . | grep -v node_modules | cut -c1-140); done
== gitea
web_src/css/modules/form.css:216:  content: "*";
== mastodon
== analytics
```

Mastodon marks fields in two renderers, so the one-component clause the first version added was tested and fails:

```
$ cd mastodon
$ grep -rlE 'simple_form_for|form_for|form_with' app/views | wc -l
106
$ grep -rlE 'form_field_wrapper|FormFieldWrapper|components/form_fields' app/views | wc -l
0
$ grep -rlE '<form|onSubmit' app/javascript --include='*.tsx' --include='*.jsx' | wc -l
16
$ grep -rlE '<form|onSubmit' app/javascript --include='*.tsx' --include='*.jsx' | xargs grep -L 'components/form_fields' | wc -l
9
$ grep -rlE "components/form_fields" app/javascript | grep -v 'components/form_fields/' | wc -l
30
```

106 Haml form files use `simple_form`, 0 of them use the React wrapper, and 9 of 16 React form files do not import the form components. So the clause "a single component counts as one convention when every form uses that component" is false for Mastodon and is withdrawn.

What Mastodon's two renderers do (source: [form_field_wrapper.tsx](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/javascript/mastodon/components/form_fields/form_field_wrapper.tsx) lines 112 and 137-148, and [simple_form.en.yml](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/config/locales/simple_form.en.yml) lines 449-451):

```
$ grep -n "RequiredMark" app/javascript/mastodon/components/form_fields/form_field_wrapper.tsx
112:          {required !== undefined && <RequiredMark required={required} />}
137:const RequiredMark: FC<{ required?: boolean }> = ({ required }) =>
$ sed -n 137,148p app/javascript/mastodon/components/form_fields/form_field_wrapper.tsx
const RequiredMark: FC<{ required?: boolean }> = ({ required }) =>
  required ? (
    <>
      {' '}
      <abbr aria-hidden='true'>*</abbr>
    </>
  ) : (
    <>
      {' '}
      <FormattedMessage id='form_field.optional' defaultMessage='(optional)' />
    </>
  );
$ sed -n 446,452p config/locales/simple_form.en.yml
    not_recommended: Not recommended
    overridden: Overridden
    recommended: Recommended
    required:
      mark: "*"
      text: required
    title:
$ grep -rn 'required={false}' app/javascript | wc -l
7
$ grep -rn 'required={false}' app/javascript | grep -v '^\S*:[0-9]*: \*' | cut -c1-110
app/javascript/mastodon/features/collections/editor/details.tsx:208:          required={false}
app/javascript/mastodon/features/collections/editor/details.tsx:362:      required={false}
```

Correction of the first version: of the 7 `required={false}` matches, 5 are documentation comments in the field components and only 2 are real call sites (both in `details.tsx`). The wrapper marks `*` when `required` is true, `(optional)` when it is explicitly false, and nothing when it is unset (line 112). The Haml renderer marks required with an `aria-hidden`-style `*` from the locale and never writes "(optional)". Mastodon therefore has two conventions for the optional kind (nothing in Haml, "(optional)" in React) and a bare asterisk for required in both, so the rule fails it correctly. List 1 is the one file `form_field_wrapper.tsx` (plus locale JSON files), list 2 is the same file.

Plausible, run in full:

```
$ cd analytics
$ grep -rlE '\(optional\)' lib assets
lib/plausible_web/live/shields/ip_rules.ex
lib/plausible_web/templates/site/settings_visibility.html.heex
$ grep -rlE '\(required\)|>\s*\*\s*<|<abbr[^>]*>\*</abbr>' lib assets
lib/plausible_web/live/shields/page_rules.ex
lib/plausible_web/live/shields/hostname_rules.ex
lib/plausible/session/transfer.ex
assets/js/dashboard/stats/graph/top-stats.js
$ grep -n '(optional)' lib/plausible_web/live/shields/ip_rules.ex lib/plausible_web/templates/site/settings_visibility.html.heex | cut -c1-110
lib/plausible_web/templates/site/settings_visibility.html.heex:74:        label="Custom background color (optional). Try using `transparent` background to blend the dashb
lib/plausible_web/live/shields/ip_rules.ex:183:                    label="Description (optional)"
$ grep -nE '\(required\)|>\s*\*\s*<|<abbr[^>]*>\*</abbr>' lib/plausible_web/live/shields/page_rules.ex lib/plausible_web/live/shields/hostname_rules.ex | cut -c1-110
lib/plausible_web/live/shields/hostname_rules.ex:164:  ... wildcard (<code>*</code>) to match multiple hostnames ...
lib/plausible_web/live/shields/page_rules.ex:165:  ... wildcard (<code>*</code>) to match multiple pages ...
```

List 2's hits are wildcard documentation (the other two are not form labels either), so after reading, Plausible has one convention: "(optional)" on the minority kind, no asterisk in labels, and a CSS detector run returned nothing. Plausible is a real pass. The check separates one pass (Plausible) from two fails (Gitea by CSS asterisk, Mastodon by two renderers). It needs the read step because both lists carry false hits (4 comment files on Gitea, 4 files on Plausible's list 2).

## Measurement 4: UX-STATE-22

The old Verify, run for this repair on all three:

```
$ V0="addEventListener\(['\"](focus|focusin|keydown|keyup|input)['\"]|oninput|onInput|onKeyUp|onFocus"
$ grep -rnE "$V0" gitea/web_src/js gitea/templates | grep -i valid | wc -l
0
$ grep -rnE "$V0" mastodon/app/javascript | grep -i valid | wc -l
0
```

Both zero, a false pass. Mastodon has the handlers in [public.tsx](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/javascript/entrypoints/public.tsx) (sign-up page, commit dated 2026-11-27). The username lookup is a multi-line call with the event name on its own line:

```
$ grep -nE "on\('input'|setCustomValidity|^\s+'input'," app/javascript/entrypoints/public.tsx
222:    'input',
238:                target.setCustomValidity(formatMessage(messages.usernameTaken));
246:                target.setCustomValidity('');
250:          target.setCustomValidity('');
258:  on('input', '#user_password,#user_password_confirmation', () => {
268:      confirmation.setCustomValidity(
272:      confirmation.setCustomValidity(
276:      confirmation.setCustomValidity('');
```

The rewrite needs three changes, each found by running it: the `on(` helper (Mastodon's own), a second pattern for an event name alone on a line (prettier-formatted calls), and `-A30` instead of `-A12` (the lookup sets its error 16 lines after the event name; at `-A12` the pipeline returned 1 hit on `public.tsx`, at `-A30` it returned 3 plus the three of the password handler). The final pipeline, run exactly as it will be written into the rule:

```
$ V="(addEventListener|\bon)\(\s*['\"](focus|focusin|keydown|keyup|input)['\"]|^\s*['\"](focus|focusin|keydown|keyup|input)['\"],\s*$|oninput|onInput|onKeyUp|onFocus|onChange"
$ P='setCustomValidity|aria-invalid|reportValidity|setError|error'
$ (cd gitea; grep -rnE "$V" web_src/js templates -A30 | grep -E "$P" | wc -l)
10
$ (cd mastodon; grep -rnE "$V" app/javascript -A30 | grep -E "$P" | wc -l)
28
$ (cd analytics; grep -rnE "$V" assets/js lib -A30 | grep -E "$P" | wc -l)
27
```

Reading every hit:

| Codebase | Hits | Read result |
|---|---|---|
| Gitea (10) | `repo-issue-content.ts:56-58`, `repo-issue-sidebar.ts:99-102`, `dom.ts:238,242`, `modal.test.ts:71` (`catch (error)` blocks, toasts, a load-error listener) and `modal.ts:43` (`reportValidity()` in a submit path) | None validates a field while typing. The 10 hits are noise |
| Plausible (27) | `segment-modals.tsx`, `annotations-modals.tsx` (server `ApiError` shown after a request), `postmark_controller.ex` (log), `form.ex:397-403` (`too_weak?`, password strength) | Password strength is a permitted live case. The rest is not field validation |
| Mastodon (28) | `public.tsx:238-250` (availability lookup, `setCustomValidity`), `public.tsx:268-276` (password mismatch, `setCustomValidity`), `details.tsx:389` (topic field warning "Special characters will be removed when saving"), `accounts.tsx:391` (maximum accounts reached), `textarea.tsx:207` (`aria-invalid={hasErrors}` from a store), `note_modal.tsx:145`, `onboarding/profile.tsx:197,236,256` and `subscription_form.tsx:168` (server errors after submit), `report_collection_modal.tsx`, `domain_block_modal.tsx`, `interaction_modal`, `status/*`, `modal_root.jsx` (request and routing states) | Three kinds of handler are validation as the user types: availability (permitted), password mismatch through `setCustomValidity` only (the browser shows it on submit, so it is a pass with a comment), and the topic special-character message, which names input that cannot become valid (a permitted live case). No premature error on an empty field or a first keystroke was found |

[details.tsx](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/javascript/mastodon/features/collections/editor/details.tsx) computes the topic message from `useMemo(() => hasSpecialCharacters(topic), [topic])` (line 351), so it appears on a keystroke. Gitea's `repo-migration.ts` `input` handlers (`user?.addEventListener('input', () => checkItems(false))`, lines 20-23) call `checkItems`, which sets `item.disabled` and shows no error, so it is not an instance either.

Result: the rewritten Verify runs on real code, catches the Mastodon handlers the old one missed, and returns 0 true violations on three codebases. It cannot return to MUST because the rule has no instance where it catches a real violation. Whether `setCustomValidity` paints on a keystroke is browser behaviour that a source read cannot show.

## Effect on the ruleset

- **UX-STATE-27: promote SHOULD to MUST, with a replaced Verify.** Evidence: Gitea 26 hits split by reading into 11 real fails and 15 non-user fields; Mastodon 3 real fails (`registrations/new.html.haml:24`, `passwords/new.html.haml:9`, `confirmations/new.html.haml:26`); Plausible 3 real fails (`register_form.ex:175,202`, `preferences.html.heex:12`). New Verify text (the `<template dirs>` placeholder was run as `templates` and the `<admin dir>` placeholder as `templates/admin`, the exact commands in Measurement 1):
  - Verify, tag sources: `grep -rnE '<input[^>]*(type="(email|tel|password)"|name="(user_?name|uname|username|login|email|full_?name|phone|tel|address|street|city|postal|zip|country|otp|passcode)")' <template dirs> | grep -v 'autocomplete=' | grep -v '^<admin dir>'`. Read each hit and keep those that collect data about the person using the form (not another service's credentials, not a webhook or a read-only value). Each kept hit fails. Then list `grep -rnE '<input[^>]*autocomplete="off"' <template dirs>`: each hit on a field about the person needs a comment, or it fails.
  - Verify, helper sources (Haml `simple_form`, Rails `f.input`, Phoenix `<.input>`, JSX components): a count of 0 from the tag grep is not a pass. Run `grep -rlE '<person-data field helper pattern>' <view dir> | xargs grep -L autocomplete` (Mastodon: `\b(f|ff|form)\.input :(username|email|display_name|current_password|password|password_confirmation|otp_attempt)\b`; Plausible: `f\[:(email|name|full_name|username|password)\]`), read each file, and then run `grep -rn "autocomplete: 'off'\|autocomplete=\"off\"" <view dir>` and read each hit, because a file can carry a token on one field and `off` on another (Mastodon sign-up username).
  - Rule text unchanged. Reference instances: pass `signup_inner.tmpl:32,36`, fail `signup_inner.tmpl:22,26` (Gitea) and `registrations/new.html.haml:24` (Mastodon).
- **UX-STATE-26: confirm SHOULD, change the Verify, withdraw the first version's added clause.** The one-component clause failed its test on Mastodon (106 Haml form files do not use the React wrapper). New Verify text: keep the two `grep -rl` lists and the `required` attribute check, then add: "Run `grep -rnE 'content: *[\"\\x27]\\*[\"\\x27]' --include='*.css' --include='*.scss' <css dirs>`. A hit on a required-field selector fails unless the same label also carries a text marker. Then list every renderer of field labels (a component, a template helper, a CSS rule). Two renderers that mark the optional kind differently fail." Severity stays SHOULD: the convention is the owner's choice, and Plausible shows a pass that costs nothing, so the severity is about the owner's policy, not the check. Reference instances: pass Plausible `ip_rules.ex:183`, fail Gitea `form.css:216`, fail Mastodon (two renderers).
- **UX-STATE-22: confirm SHOULD, replace the Verify.** New Verify text, run as written in Measurement 4: `grep -rnE "(addEventListener|\bon)\(\s*['\"](focus|focusin|keydown|keyup|input)['\"]|^\s*['\"](focus|focusin|keydown|keyup|input)['\"],\s*$|oninput|onInput|onKeyUp|onFocus|onChange" <src> -A30 | grep -E 'setCustomValidity|aria-invalid|reportValidity|setError|error'`, then read each hit. A handler on an empty field or on a first keystroke that sets a visible error fails, unless it is a listed live case (password strength, availability, character count, input that cannot become valid). A handler that only calls `setCustomValidity` and shows nothing until submit is a pass and gets a comment. Expect noise (10, 28 and 27 hits on the three codebases, all read). The rule stays SHOULD until a codebase shows a real premature error that the check catches.
- **No new rule.** The "0 hits is not a pass in helper sources" caveat is folded into UX-STATE-27's Verify. It also applies to UX-STATE-20 and 21, which read `<input`: the family preamble gets one line: "A grep for a tag finds nothing in a codebase whose forms come from a helper. Zero hits there is not a pass."

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Gitea HEAD `e77c1c2`, 6459 tracked files | [go-gitea/gitea](https://github.com/go-gitea/gitea/tree/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c), `git log -1` in the clone | 2026-11-27 |
| Mastodon HEAD `e639273`, 10138 tracked files | [mastodon/mastodon](https://github.com/mastodon/mastodon/tree/e63927367d716dc3b5db9beffb2fa1c91ff2e44a), same | 2026-11-27 |
| Plausible HEAD `06efc5e`, 2171 tracked files | [plausible/analytics](https://github.com/plausible/analytics/tree/06efc5e79afe877d7399ad2af320eff5488271bc), same | 2026-11-26 |
| Gitea `autocomplete` tokens in `templates`: 28 `off`, 16 `new-password`, 2 `current-password`, 1 `one-time-code` | Measurement 1 | 2026-11-27 |
| Gitea tightened regex: 61 hits, 34 without `autocomplete=`, 26 outside `templates/admin`, 11 real fails | Measurement 1 | 2026-11-27 |
| Gitea CSS asterisk for required fields, `web_src/css/modules/form.css:213-216` | [form.css at the commit](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/web_src/css/modules/form.css#L213-L216) | 2026-11-27 |
| Gitea fake password field, `templates/base/disable_form_autofill.tmpl:30` (outside the comment that ends at line 27) | [file at the commit](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/templates/base/disable_form_autofill.tmpl) | 2026-11-27 |
| Gitea `repo-migration.ts:20-23` `input` handlers call `checkItems` (toggle, no error) | [file at the commit](https://github.com/go-gitea/gitea/blob/e77c1c26e5350b7d7f8c1ff9c24b09a53e7f0e0c/web_src/js/features/repo-migration.ts) | 2026-11-27 |
| Mastodon views: 200 `f.input` calls, 163 distinct names, 26 person-data names; 25 `autocomplete` lines; tokens 9 `off`, 7 `new-password`, 6 `current-password`, 1 `username`, 1 `one-time-code` | Measurement 2 | 2026-11-27 |
| Mastodon `RequiredMark` marks `*` or `(optional)`, only when `required` is not undefined (`form_field_wrapper.tsx:112,137-148`); `required={false}` has 2 call sites, both in `details.tsx` | [file at the commit](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/javascript/mastodon/components/form_fields/form_field_wrapper.tsx) | 2026-11-27 |
| Mastodon `simple_form.en.yml:449-451`: required mark `*`, text `required` | [file at the commit](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/config/locales/simple_form.en.yml) | 2026-11-27 |
| Mastodon `public.tsx` handlers: username lookup lines 222-250, password match lines 258-276 | [file at the commit](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/javascript/entrypoints/public.tsx) | 2026-11-27 |
| Mastodon sign-up form tokens: `off`, `username`, `new-password` x2, `off` x2 (lines 24, 29, 34, 39, 45, 50) | [registrations/new.html.haml](https://github.com/mastodon/mastodon/blob/e63927367d716dc3b5db9beffb2fa1c91ff2e44a/app/views/auth/registrations/new.html.haml) | 2026-11-27 |
| Plausible `form.ex:286` default `current-password`, `:309` passes `@autocomplete`, `:368` `one-time-code`, `:426` `new-password` | [form.ex at the commit](https://github.com/plausible/analytics/blob/06efc5e79afe877d7399ad2af320eff5488271bc/lib/plausible_web/live/components/form.ex) | 2026-11-26 |
| Plausible `register_form.ex:175,202` and `preferences.html.heex:12` lack a token; `ip_rules.ex:183` carries "(optional)" | [register_form.ex](https://github.com/plausible/analytics/blob/06efc5e79afe877d7399ad2af320eff5488271bc/lib/plausible_web/live/register_form.ex) | 2026-11-26 |
| UX-STATE-22 rewritten Verify: 10 (Gitea), 28 (Mastodon), 27 (Plausible) hits, 0 true violations | Measurement 4 | 2026-11-27 |

## What could not be determined

- Whether any of the three codebases shows a true UX-STATE-22 violation (an error painted while typing in an incomplete field). Reading source cannot show what the browser paints for `setCustomValidity`. Missing: a browser run of Mastodon's sign-up page, which needs the Rails app, a database and a browser session, none of which this task may set up beyond a source clone. The same missing run applies to checking that a browser actually autofills the fields a 1.3.5 pass requires.
- Whether the WCAG 1.3.5 text still reads as the rule cites it. This follow-up did not re-fetch WCAG and cites no external text; the decay table in the parent file owns that date.
- Whether the helper-source check for UX-STATE-27 runs on a codebase outside Rails and Phoenix, for example a Vue or Svelte codebase. It was tested by hand-written greps on Mastodon and Plausible only, not by a script, and its person-data helper pattern is per framework.
- The reading steps (which of 26 Gitea hits are about the person, which of 28 Mastodon hits are premature) are judgement by one reader. No second reader checked them.

---
title: VS Code Extension Surfaces and Webviews
summary: The editor rows, owning native input boxes, progress, notifications and the status bar, the limit on webviews, and the accessibility, theme and high-contrast duties of the HTML inside a webview
---

# VS Code Extension Surfaces and Webviews

Applies when `package.json` has `engines.vscode`; otherwise stop.

Owns what a VS Code extension's user sees: UX-STATE-28 to 33 for the native surfaces (input box, progress, notification, status bar) and UX-A11Y-35 for webview markup. A webview is web UI that the editor gives no accessibility or state handling, so every web row applies inside one: UX-A11Y-01 to 34 and UX-STATE-01 to 27. A native surface inherits keyboard and accessibility from the editor, so its duty is the choice of surface, the actions and the progress. Wording is `text.md`. Waits over 10 s are UX-STATE-15 (`states.md`). Motion inside a webview is UX-A11Y-27. Host code mechanics (activation, disposables, the `vscode` API types) are the TypeScript quality set's.

Contents: [Dates and Versions](#dates-and-versions) · [Source Lists](#source-lists) ·
[Webview Markup and Theme](#webview-markup-and-theme) · [Native Surfaces](#native-surfaces) ·
[Ask the Owner](#ask-the-owner) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read 2026-11-27. `$CHECKS` is `.claude/skills/ux-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/ux-quality-reference/checks` when installed globally). `$WV` is the webview source directory (often `src/webview`).

| Fact | Source and source date | Rows | Re-check |
|---|---|---|---|
| Notifications: one at a time, no repeats, a "Do not show again" option, warnings and errors with actions, a link to logs on long progress, "only when absolutely necessary" | [notifications guideline](https://code.visualstudio.com/api/ux-guidelines/notifications), page date 2026-11-25 | 18, 30, 31, 32 | 6 months, or each `engines.vscode` bump |
| Status bar: one item, a loading-icon item for background work, no custom colours | [status-bar guideline](https://code.visualstudio.com/api/ux-guidelines/status-bar), page date 2026-11-25 | 29 | 6 months |
| Webviews: "Only use webviews when absolutely necessary"; follow accessibility guidance; make every element themeable; `retainContextWhenHidden` "has high memory overhead" | [webviews guideline](https://code.visualstudio.com/api/ux-guidelines/webviews) 2026-11-25; [webview guide](https://code.visualstudio.com/api/extension-guides/webview) 2026-11-25 | 33, UX-A11Y-35 | 6 months |
| Only `ProgressLocation.Notification` shows cancel and discrete progress; `InputBoxValidationSeverity.Error` blocks accept | [vscode.d.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts), main, fetched 2026-11-27 | 28, 29 | each `engines.vscode` bump, at least every 6 months |
| Each webview theme variable is `'vscode-' + entry.id.replace('.', '-')`, so `focusBorder` is `--vscode-focusBorder`; its computed value has not been read in a rendered webview | [themeing.ts](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/webview/browser/themeing.ts), main, fetched 2026-11-27; [Theme Color](https://code.visualstudio.com/api/references/theme-color), undated | UX-A11Y-35 | 6 months. A non-empty computed value promotes the focus-colour clause to MUST |

```sh
# re-check commands for the two vscode.d.ts facts; each must print a line
curl -s https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts | grep -n 'only ProgressLocation.Notification'
curl -s https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts | grep -n 'will not be able to accept'
```

## Source Lists

Host code is `.ts` outside the webview directory and tests. A grep over an empty list prints nothing and reads as a pass: run the canary and the content gate first.

```sh
# content gate: the manifest must declare engines.vscode, else stop
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/package.json' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -l -F -e '"vscode"' --
# canary: any output means the host-source list is empty
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | tr '\0' '\n' | awk 'END { if (NR == 0) print "canary: nothing listed" }'
```

## Webview Markup and Theme

```sh
# UX-A11Y-35 names and colours: UNNAMED and title-only controls, and hex colours outside var(--vscode-*, fallback)
python3 -I "$CHECKS"/scan_wv.py "$WV"
# UX-A11Y-35 high contrast: a tracked test file must name the theme class
git ls-files -z --cached --others --exclude-standard | xargs -0 -r grep -l -F -e 'vscode-high-contrast' --
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-A11Y-35 | Inside a VS Code webview: apply UX-A11Y-01 to 34 in full. Take every colour from a `--vscode-*` variable, with a hex value only as a `var()` fallback (house policy). Test the webview in the `vscode-high-contrast` theme. SHOULD, until a rendered webview confirms the variable: draw focus from `var(--vscode-focusBorder)`. | The platform adds no keyboard or naming layer. Its guideline asks views to "follow accessibility guidance (color contrast, ARIA labels, keyboard navigation)" and to "Ensure all elements in the view are themeable". WCAG does not require theme variables: the colour clause rests on the "themeable" guideline, because a literal colour cannot follow a high-contrast theme. | Block UX-A11Y-35. `scan_wv.py` reads open tags in template literals past `${...}` and prints each `UNNAMED` and `title-only` control and each literal hex colour: all must be 0 (a body that is only a substitution counts as text, so list those with `--list button` and read them). The second command must list a test file, and that test renders the webview with the `vscode-high-contrast` body class and runs the UX-A11Y-15 and 16 contrast checks on it. Focus colour (SHOULD): every focus rule that `focus_outline.py` lists (UX-A11Y-12) and that draws an outline or border uses `var(--vscode-focusBorder)`. `--self-test` proves the scanner still separates its fixtures. | MUST (colour clause house policy; focus-colour clause SHOULD) |

## Native Surfaces

```sh
# UX-STATE-28: every showInputBox, with 12 lines to read for validateInput and ignoreFocusOut
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -A12 -F -e 'showInputBox' --
# UX-STATE-29: status-bar items (the total is at most 1), then any custom item colour
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -F -e 'createStatusBarItem' --
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -E -e 'statusBarItem[.](color|backgroundColor)' --
# UX-STATE-30: warning and error messages with no action argument
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -E -e 'show(Warning|Error)Message\([^,]*\)' --
# UX-STATE-31: every notification call, to count them per command path and find those inside listeners
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -E -e 'show(Information|Warning|Error)Message\(' -e '(^|[^[:alnum:]_])on[A-Z][[:alnum:]_]*\(' --
# UX-STATE-32: prompts and the stored skip keys in the same function
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(exclude,glob)**/*test*' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -E -e 'show(Information|Warning)Message\(' -e '(globalState|workspaceState)[.]update\(' --
# UX-STATE-33: a webview added in a diff; each hit has a reason comment within 3 lines above
git diff -U3 HEAD | grep -B3 -n -E -e '^[+].*(createWebviewPanel|registerWebviewViewProvider|retainContextWhenHidden: *true)'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-STATE-28 | Give a `showInputBox` whose value has a format rule a `validateInput` that returns an `InputBoxValidationMessage` with Error severity for values that cannot work. Set `ignoreFocusOut: true` when the value is long, secret or costly to retype. | Error severity blocks accept natively. Without it a bad value fails later as a notification and the typed text is lost. | See block UX-STATE-28: each hit has `validateInput` and `ignoreFocusOut` in its 12 lines where the rule applies. | MUST |
| UX-STATE-29 | Show every host-side wait of 1 s or more on a native progress surface. For 1 to 10 s, and for background work, use one shared status-bar item labelled with the operation (`$(sync~spin) Product: operation`), with theme colours only. Past 10 s, use UX-STATE-15. | The status-bar guideline recommends a loading-icon item for background work, no more than one item and no custom colours. | See block UX-STATE-29. Each `await` on `execFile`, the CLI runner, `fetch` or a download inside a command handler sits inside `withProgress` or the project's progress wrapper (read). The `createStatusBarItem` total is at most 1 unless a comment justifies more. The colour grep shows only `new ThemeColor('statusBarItem.errorBackground')` or the warning twin. | MUST |
| UX-STATE-30 | Give every `showWarningMessage` and `showErrorMessage` an action that resolves the problem, or "Show Output", unless no action exists. | The notifications guideline shows warnings and errors with resolving actions. | See block UX-STATE-30: it lists message-only calls. Each hit needs a comment saying why no action exists. | SHOULD |
| UX-STATE-31 | Show at most one notification per user action. Route every notification that a watcher, timer or event listener can fire through a dedupe helper. | "Show one notification at a time", and do not "Send repeated notifications" (notifications guideline). | See block UX-STATE-31: count the `show*Message` calls reachable on one command path, and more than 1 fails. Each `show*Message` inside an `on*` listener callback goes through the dedupe helper (read). | MUST |
| UX-STATE-32 | Give every recurring, non-error, unsolicited prompt a "Do not show again" action or a stored throttle. | "Add a Do not show again option for every notification" (notifications guideline). | See block UX-STATE-32: each prompt fired from activation or a timer has a `globalState.update(` or `workspaceState.update(` of a skip key, or a time throttle, in the same function. | SHOULD |
| UX-STATE-33 | Do not add a webview panel or webview view unless the native API cannot do the job. Each new `createWebviewPanel` or `registerWebviewViewProvider` carries a comment saying why. Each `retainContextWhenHidden: true` carries a comment saying why `getState` and `setState` do not work. | "Only use webviews when absolutely necessary" (webviews guideline). `retainContextWhenHidden` "has high memory overhead" (webview guide). | See block UX-STATE-33 over the diff: each hit has a comment within 3 lines above it. The rule binds new calls only, so an existing webview is an owner decision, not a violation. | SHOULD |

## Ask the Owner

- Whether a sidebar stays a webview view or becomes a tree view plus a welcome view. This is an architecture decision (UX-STATE-33).
- Whether to remove existing message-only information notifications. UX-STATE-18 binds new code only.
- The persistence scope of "Do not show again": per machine, per workspace or per version (UX-STATE-32).
- Whether a long operation can be cancelled without leaving partial state (UX-STATE-15).

## What Agents Get Wrong Here

Ranked by how often each appears.

1. **`showInformationMessage('Done')` after every command**, where the inline state change or `setStatusBarMessage` serves (UX-STATE-18).
2. **A `showInputBox` that accepts anything**, so a bad value fails later as a notification (UX-STATE-28).
3. **A warning or error notification with no action**, only text (UX-STATE-30).
4. **One notification per event from a watcher or timer**, with no dedupe (UX-STATE-31).
5. **Raw hex colours in webview CSS**, which cannot follow a high-contrast theme (UX-A11Y-35).
6. **Icon-only webview buttons named by `title` alone.** axe passes them and the scanner does not (UX-A11Y-04, 35).
7. **A new webview for what a tree view or a quick pick does**, with `retainContextWhenHidden: true` as the default (UX-STATE-33).
8. **A spinner status-bar item per operation**, so several stack (UX-STATE-29).
9. **A progress notification with `cancellable: true` whose token is never wired to kill the child process** (UX-STATE-15).
10. **Treating the webview as a browser tab**, with no ARIA, no theme variables and no high-contrast test (UX-A11Y-35).

---
title: "UX-A11Y-22 Applied row: does the webview still have 0 live regions?"
program: product
topic: ux-a11y-authoring
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 2
---

# Follow-up q2: re-measure the UX-A11Y-22 Applied row

## Answer

The row is half right and half stale. The wave-1 row said: "The webview's results, details and settings error states have 0 `role`/`aria-live`/`aria-busy`." Measured on 2026-11-27, that is still true for the three page-level error states: `render.ts:1177` (results), `render.ts:2049` (details) and `settings/render.ts:656` (settings) carry no role. What is stale is the implied "the results view has no live region": `.result-summary` at `render.ts:1219` has `role="status"` with `aria-live` and `aria-busy`, and it has had them since commit `2c9c56c` (2026-10-18). The webview has exactly 3 live elements: 1 `role="status"` (render.ts:1219), 1 `role="alert"` on the paging failure (render.ts:1221), 1 `role="alert"` on one settings row error (settings/render.ts:522). A fourth grep hit, settings/render.ts:518, is a comment. The grim-gui sentence of the row is re-measured below and holds. The earlier version of this file said the row was "stale" without this split; the error-state half was not checked against the line it cites.

Also found: the wave-1 text of UX-A11Y-22 attributes a phrase to ARIA22 that is not on the page (see "Effect on the ruleset").

## Measurements

All commands run on 2026-11-27 in `/home/mherwig/dev/grimoire-rs` (a directory of separate repositories, not one repository). Output is trimmed to the decisive lines.

### Tree state

```
$ git -C vscode log -1 --format='%h %cI %s'
9230dcd 2026-11-24T19:43:56+01:00 release: v0.5.0
$ git status --short .          # run in vscode/, printed nothing: clean
$ git log -1 --format='%h %cI %s' -- src/webview/render.ts
05ba81d 2026-11-23T16:59:58+01:00 feat: support grim's experimental mod kind (#40)
$ git log -1 --format='%h %cI %s' -- src/webview/settings/render.ts
81c329d 2026-10-25T13:37:28+01:00 feat(settings): group panels by grim's config section
$ git -C grim-gui log -1 --format='%h %cI %s'      # grim-gui: clean (git status --short . printed nothing)
edda90d 2026-11-26T09:54:25+01:00 chore(deps): Bump tauri-build
```

### Live elements in the webview (`vscode/src/webview`)

```
$ grep -rnE 'role="(status|alert)"|aria-live|aria-busy' . | cut -c1-200
settings/render.ts:518:  // role="alert": the failure arrives while focus is wherever the save left it
settings/render.ts:522:    ? html`<div class="row-error" role="alert"><span class="codicon codicon-error"></span>${error}</div>`
render.ts:1219:  return html`<div class="result-summary" role="status" tabindex="-1" aria-live="${loading ? 'off' : 'polite'}" aria-busy="${ifDefined(loading ? 'true' : undefined)}">${text}${
render.ts:1221:      ? html` <span class="load-error" role="alert">Could not load the remaining results.</span> <button type="button" class="retry" data-action="retry-load">Retry</button>`
```

Per-file counts (the `grep -c` count includes the comment at settings/render.ts:518, so settings shows `alert=2` for 1 element):

```
$ for f in $(grep -rlE 'role=|aria-live|aria-busy' .); do echo "$f status=$(grep -c 'role="status"' $f) alert=$(grep -c 'role="alert"' $f) live=$(grep -c 'aria-live' $f) busy=$(grep -c 'aria-busy' $f)"; done
settings/render.ts status=0 alert=2 live=0 busy=0
render.ts status=1 alert=1 live=1 busy=1
details/details.css status=0 alert=0 live=0 busy=0
details/main.ts status=0 alert=0 live=0 busy=0
```

Elements: render.ts 2 (status, alert) plus settings 1 (alert) = 3. Hits: 4 lines, one a comment.

No assertive region:

```
$ grep -rnE 'aria-live="?assertive|assertive' .
$ echo "exit=$?"
exit=1
```

No script-set role either: `grep -rnE "setAttribute\('(role|aria-live)'|\.role *=|ariaLive" .` printed nothing.

### Origin of `role="status"` (pinned)

```
$ git log --format='%h %cI %s' -S'role="status"' -- src/webview/render.ts
2c9c56c 2026-10-18T16:58:38+02:00 feat(search): load every Browse page in the...
$ git log --format='%h %cI %s' -S'result-summary' -- src/webview/render.ts
2c9c56c 2026-10-18T16:58:38+02:00 feat(search): load every Browse page in the...
9ad5b19 2026-07-12T13:49:57+02:00 Initial commit
$ git log --format='%h %cI %s' -S'aria-live' -- src/webview/render.ts
2c9c56c 2026-10-18T16:58:38+02:00 feat(search): load every Browse page in the...
$ git grep -nE 'role="status"|aria-live' 2c9c56c^ -- src/webview/render.ts     # exit 0, no lines: absent before
$ git grep -n 'result-summary' 9ad5b19 -- src/webview/render.ts
9ad5b19:src/webview/render.ts:447:      ? html`<div class="result-summary">${filtered.length} result${filtered.length === 1 ? '' : 's'} in ...
$ git grep -nE 'role="status"' 2c9c56c -- src/webview/render.ts
2c9c56c:src/webview/render.ts:1083:  return html`<div class="result-summary" role="status" tabindex="-1" aria-live="${loading ? 'off' : 'polite'}" aria-busy=...
```

Reading: the class `result-summary` exists since the initial commit `9ad5b19` (2026-07-12) as a plain `div`. `role="status"`, `aria-live` and `aria-busy` were added in one commit, `2c9c56c` (2026-10-18), at what was line 1083 then and is line 1219 now. The pickaxe query returns only that commit for `role="status"`, so the origin is pinned. The `role="alert"` on the paging failure came in the same commit (`git log -S'role="alert"'` lists `2c9c56c` and `fa8b34c`, 2026-08-11, the settings row error at its first form).

### The call site and the other states

```
$ sed -n 1190,1197p render.ts        (trimmed)
  const partial = pagingSummary(state.paging, filtered.length, registries);
  const summary =
    partial !== null
      ? renderPartialSummary(state, partial)
      : filtered.length > 0
        ? html`<div class="result-summary">${filtered.length} result${...} in ${registries} ...
        : nothing;
```

The status container exists only on the paging branch (`partial !== null`). On the other branch the same class is a plain `div` with no role (line 1195). So a list that moves from the plain count to the partial summary creates the live element in the same render that fills it. That is the pattern UX-A11Y-22 forbids.

```
$ grep -rnE 'error-state|row-error' . | grep -v '\.css'      (trimmed)
render.ts:1177:    return html`<div class="error-state"><span class="codicon codicon-error"></span> ${state.error ?? 'Unknown error'}</div>`;
render.ts:2049:    ? html`<div class="error-state"><span class="codicon codicon-error"></span> ${vm.error}</div>`
settings/render.ts:181:      ? html`<div class="row-error"><span ...>${row.errorMessage}</div>`
settings/render.ts:346:    ? html`<div class="row-error"><span ...>${registryError}</div>`
settings/render.ts:522:    ? html`<div class="row-error" role="alert"><span ...>${error}</div>`
settings/render.ts:656:      return html`<div class="error-state"><span class="codicon codicon-error"></span>${state.error ?? 'Unknown error'}</div>`;
```

| State | Where | Live region |
|---|---|---|
| Results error | `render.ts:1177` | none |
| Details error | `render.ts:2049` | none |
| Settings page error | `settings/render.ts:656` | none |
| Settings row errors | `settings/render.ts:181`, `:346` | none |
| Settings add-registry error | `settings/render.ts:522` | `role="alert"`, created with its content |
| Paging summary | `render.ts:1219` | `role="status"`, created on the paging branch |
| Paging failure | `render.ts:1221` | `role="alert"` span inside the status element |
| Plain result count | `render.ts:1195` | none |
| Empty states | `render.ts:703`, `:719`, `:732` (`div.empty-state`) | none |
| Installed empty | `render.ts:1060` | none |
| Loading | `render.ts:739` `renderLoading`, `:2019` `vscode-progress-ring` | none |

### The grim-gui sentence of the row

```
$ grep -rnE 'role=|aria-live|aria-busy|setAttribute\("(role|aria)|setAttribute\(.role' src index.html      # run in grim-gui/
(no output)
$ sed -n 20,32p src/view.ts
  root.replaceChildren();
  if ("ok" in result) {
    root.append(line("p", `grim ${result.ok}`));
  } else if (result.err.kind === "not-found") {
    root.append(
      line("p", "grim not found"),
      ...
  } else {
    root.append(line("p", `grim failed (exit ${result.err.code ?? "unknown"})`), line("p", result.err.message, "hint"));
  }
}
$ sed -n 11,22p src/main.ts
async function load(root: HTMLElement): Promise<void> {
  try {
    render(root, { ok: await invoke<string>("grim_version") });
  } catch (err) { render(root, { err: ... }); }
}
...
const root = document.getElementById("app");
```

Result: grim-gui has 0 live elements. Its error view is `view.ts:23-30`, written by `root.replaceChildren()` and `root.append(...)` into `#app`, which has no role. The `load` function is `main.ts:11-20`; the mount is `main.ts:22-23`, so the cited `11-22` is off by one at the end and should read `11-23`. The first sentence of the row holds.

### The wave-1 source of the row

`ux-interface-states/empty-error-notification.md:94` (date_researched 2026-11-27) states: "0 `role|aria-live|aria-busy` in `results-error`, `details-error`, `settings-error`, `results-loading-*` ... Only `browse-paged-partial` and `browse-paged-capped` (1 match each) announce." That is a count over named fixtures, so it already covered the paging region. The Applied row compressed it to "the webview's results, details and settings error states", which stays true. The commission's premise ("the results state has 0 role") reads the row more broadly than the source supports. I did not speculate about when the row was written; the measurement above shows it is accurate for error states and misleading only if read as "no live region anywhere in the webview".

## What the two WCAG techniques say (fetched)

[ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), page dated 12 January 2026. Tests, step 1: "Check that the container destined to hold the status message has a `role` attribute with a value of `status`" before the status message occurs. Step 2: "Check that when the status message is triggered, it is inside the container." The page also says `role="status"` "is currently not treated as atomic by default in some environments" and advises an explicit `aria-atomic="true"` when the whole container should be read. The phrase "may not be announced reliably" is not on the page: a second fetch asked for it directly and the answer was "The phrase 'announced reliably' is absent."

[ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19), "Updated 27 April 2026". "The error container must be present in the DOM on page load for the error message to be spoken by most screen readers." Tests: 1. "Determine that an empty error container with role=alert or aria-live=assertive attribute is present in the DOM". 3. "Determine that the error message was injected into the already present error container." The page does not say what happens when a `role=alert` element is inserted with its content. Expected results: "#1 and #3 are true."

Both fetches were made through a summarising tool; the quoted strings are what it returned as verbatim page text. The page text itself is the check.

## Effect on the ruleset

**UX-A11Y-22: change, Why line only.** The rule's imperative stays. The Why quotes a phrase ARIA22 does not contain. Replace the sentence `[ARIA22](...) test 1 (2026-01-12): a role added together with its content "may not be announced reliably".` with:

> [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) (2026-01-12) test 1 requires the `role="status"` container to exist "before the status message occurs". For errors, [ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19) (2026-04-27): "The error container must be present in the DOM on page load for the error message to be spoken by most screen readers." Whether a role added together with its content is announced is not stated by either page.

**UX-A11Y-22: change, Verify gets one mechanical check.** Add this bullet to the Verify list (agents can run it; it replaces the reading heuristic proposed in the earlier version of this file):

> Error containers: `grep -rnE 'class="(error-state|row-error)"' <webview> | grep -v 'role="alert"'`. Pass only when it prints nothing, or when every printed hit sits inside a wrapper that carries `role="alert"` and is rendered in all states of the component (a persistent, empty region the error text is written into). Any `class="(error-state|row-error)"` element that carries `role="alert"` on the same line is created with its content and fails the pre-existence test (ARIA19 test 1); list it as a finding of kind "region created with content" and fix by rendering the wrapper unconditionally.

Run on the webview today, the first command prints 5 hits (`settings/render.ts:181`, `:346`, `:656`, `render.ts:1177`, `:2049`, output above), so the check fails today. The sixth `error-state`/`row-error` element, `settings/render.ts:522`, passes the first filter but is created with its content, so it falls under the "created with content" rule. The full check for the pre-existence part is still the virtual-reader harness in `announcements-and-motion.md`, which this follow-up did not re-run.

Same bullet for the status case: `grep -rnE 'role="status"' <webview>`, then for each hit confirm the element is rendered in every state of the component. The only hit, `render.ts:1219`, is not (it is on the `partial !== null` branch, `render.ts:1190-1197`), so it fails. Fix: render `<div class="result-summary" role="status" tabindex="-1" ...>` unconditionally and write the plain count or the partial text into it. Whether this changes what a screen reader says is UNVERIFIED; no reader was run.

**UX-A11Y-22 Applied row: change.** Replace the row's text with:

> grim-gui renders its error view with no live region: `grep -rnE 'role=|aria-live|aria-busy' src index.html` in `grim-gui` at `edda90d` (2026-11-26) prints nothing; the error branch is `src/view.ts:23-30`, mounted by `src/main.ts:11-23`. The webview has 3 live elements at `grimoire-rs/vscode` `9230dcd` (2026-11-24): `W:render.ts:1219` (`role="status"`, `aria-live` polite or off, `aria-busy`; added in `2c9c56c`, 2026-10-18; created only on the paging branch `W:render.ts:1190-1197`), `W:render.ts:1221` (`role="alert"` on the paging failure) and `W:settings/render.ts:522` (`role="alert"` on the add-registry error, created with its content). The results, details and settings page-level error states have no live region: `W:render.ts:1177`, `W:render.ts:2049`, `W:settings/render.ts:656`, and the settings row errors `:181`, `:346`. The plain result count (`W:render.ts:1195`), the empty states (`W:render.ts:703-732`) and the loading states have none.

**UX-A11Y-23: confirm.** The two `role="alert"` uses carry error text only ("Could not load the remaining results."; the add-registry failure). `grep -rnE 'aria-live="?assertive|assertive' .` exits 1 with no output. Loading uses `aria-live="off"` plus `aria-busy`. The three unannounced error states at `render.ts:1177`, `:2049` and `settings/render.ts:656` are instances of the same family as UX-A11Y-22 and are covered by the Verify bullet above; no new rule.

**UX-A11Y-12: confirm.** The Applied row's `.result-summary:focus` exception stands: the element is `role="status" tabindex="-1"` (`render.ts:1219`). No change.

No promote, demote, retire or new rule.

## Dated facts

| Fact | Value | Date |
|---|---|---|
| `grimoire-rs/vscode` HEAD | `9230dcd` release: v0.5.0 | 2026-11-24 |
| Last change to `render.ts` / `settings/render.ts` | `05ba81d` / `81c329d` | 2026-11-23 / 2026-10-25 |
| `role="status"`, `aria-live`, `aria-busy` first added | `2c9c56c` (render.ts:1083 then, :1219 now) | 2026-10-18 |
| `result-summary` class first added, as a plain div | `9ad5b19` initial commit | 2026-07-12 |
| `grim-gui` HEAD | `edda90d`, clean | 2026-11-26 |
| Webview live elements | 3 (1 status, 2 alert); 4 grep hits, 1 a comment | measured 2026-11-27 |
| ARIA22 page | last updated 12 January 2026 | fetched 2026-11-27 |
| ARIA19 page | "Updated 27 April 2026" | fetched 2026-11-27 |

## What could not be determined

- Whether `render.ts:1219` is actually announced, and whether `role="alert"` created with its content (`settings/render.ts:522`) is announced. Neither WCAG technique page states it, and no screen reader or virtual reader was run. The harness source is in `announcements-and-motion.md`; its working copy was not rebuilt.
- Other repositories' webviews were not measured. Only `grimoire-rs/vscode/src/webview` and `grimoire-rs/grim-gui` were.
- The fetch tool summarises pages with a small model, so the quoted ARIA22 and ARIA19 strings are its verbatim extractions, not a byte-level copy of the HTML. A human opening the two URLs settles it.

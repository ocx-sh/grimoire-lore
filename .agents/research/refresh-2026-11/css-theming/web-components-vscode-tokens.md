---
title: css-theming delta - web-component libraries, VS Code webview platform, token standards
pair: css-theming
date_researched: 2026-11-27
window_start: 2026-08-30
model: sonnet
sources_fetched: 22
---

# Delta: web components, VS Code webview, design-token standards (2026-08-30 to 2026-11-27)

This is an update of the existing css-theming corpus, not a re-creation. Only claims that upstream changed are marked changed. Method note: the GitHub REST API was rate-limited for this run, so release dates come from the npm registry `time` field, GitHub release pages, and raw source files at pinned git tags.

## Summary

- Lit: no release in the window. Latest on npm is still 3.3.3 (registry last modified 2026-05-14). Both Lit claims are unchanged.
- Stencil: pin bump only. 4.44.2 (2026-08-26) is superseded by 4.45.5 (2026-11-19). A 5.0.0 release candidate line is live (rc.14, 2026-11-27). Release notes show scope-css fixes for `@layer` and `@container` but no change to the emitted class naming.
- Web Awesome: 3.15.0 (2026-11-17) is latest. A manifest diff of 3.12.0 against 3.15.0 shows no removed CSS custom properties, parts or slots. Many `*__base` parts are newly deprecated.
- Web Awesome and Shoelace: one stated fact is WRONG in the corpus. The Shoelace repo was archived 2026-05-14, not 2026-08-28.
- VS Code: webview shell source is functionally unchanged between 1.104.0 and 1.148.0 (stable 2026-11-25) for every claim at risk. No release closed the `_defaultStyles` CSP question or changed how theme variables are injected.
- `@vscode-elements/elements`: 2.5.1 is still the latest; no release in the window.
- Style Dictionary: `outputReferences` still defaults to false in 5.8.0. Latest is 5.8.0 (2026-11-03).
- DTCG: Format Module stable remains 2025.10. The preview draft is now dated 08 September 2026, not 2026-07-30. No component-tier tokens in the draft.

## Findings, per claim

### web-components.md

| Claim | Class | Detail |
|---|---|---|
| "live Lit 3.3.3" | unchanged | `lit` latest on npm is 3.3.3; registry modified 2026-05-14. [npm](https://registry.npmjs.org/lit), [lit releases](https://github.com/lit/lit/releases) show nothing after 3.3.3. |
| Lit `static styles` adopted into `adoptedStyleSheets`, no `<style>` | unchanged | No Lit release in the window, so the measured behaviour cannot have moved. |
| "real Stencil 4.44.2 build" | pin bump only | 4.44.2 published 2026-08-26. Newer: 4.45.0 (2026-09-12), 4.45.1 (09-23), 4.45.2 (10-05), 4.45.3 (11-11), 4.45.4 (11-17), 4.45.5 (11-19) per [npm](https://registry.npmjs.org/@stencil%2fcore). Source: [Stencil releases](https://github.com/stenciljs/core/releases). |
| Stencil `scoped:true` emits `.name.sc-my-component` into one global `<style>` | unchanged, not re-measured | Release notes list "fix(scope-css): process layer selectors" (4.45.0), "scope rules inside @container" (4.45.2), "reuse SSR styles during hydration" (4.45.3). None renames the `sc-` class. The corpus measurement was made on 4.44.2; re-measure on 4.45.5 before claiming it for the new pin. Stencil 5.0.0-rc.x exists and may differ; not examined. |
| Web Awesome rebrand `--sl-*` to `--wa-*` | unchanged | No contrary evidence. |
| "repo archived 2026-08-28" | changed | Old: archived 2026-08-28. New fact: the shoelace-style/shoelace repo page states "archived by the owner on May 14, 2026". Source: [github.com/shoelace-style/shoelace](https://github.com/shoelace-style/shoelace), fetched 2026-11-27. Note the date is before the window, so the corpus was already wrong at baseline. |
| `--wa-accordion-divider-color` removed in 3.9.0 | unchanged | Not contradicted; not re-verified. |
| `label` part deprecated in 3.12.0 | changed (attribution only) | The release page text attributes the `label` to `form-control-label` replacement to the v3.11.0 notes, repeated in 3.12.0. Treat "3.11.0 or 3.12.0" as the safe wording. Source: [webawesome releases](https://github.com/shoelace-style/webawesome/releases). |
| More removed hooks/parts after 3.12.0? | none removed | Diff of `dist/custom-elements.json` in the npm tarballs [3.12.0](https://registry.npmjs.org/@awesome.me/webawesome/-/webawesome-3.12.0.tgz) vs [3.15.0](https://registry.npmjs.org/@awesome.me/webawesome/-/webawesome-3.15.0.tgz): zero removed cssProperties, parts or slots. Added: `--backdrop-color` on wa-dialog and wa-drawer; `--label-offset`, `--label-spacing`, part `label` on wa-divider; new component-named parts. Newly deprecated ("will be removed in a future major version"): color-picker `eyedropper-button__base`, `format-button__base`; dialog and drawer `close-button__base`; select `tag__remove-button__base`; slider `tooltip__base`; tab-group `scroll-button__base`; tag `remove-button__base`; toast-item `progress-ring__base`; tooltip `base__popup`, `base__arrow`; tree-item `spinner__base`, `checkbox__base`. Release dates: 3.13.0 2026-09-16, 3.14.0 2026-09-24, 3.15.0 2026-11-17 (release 3.15.0 commit titles: "Deprecate remaining base parts" #2976). The "live risk of pinning a hook name" sentence is strengthened: a batch of parts was deprecated in 3.15.0. |

### vscode-webview.md

Evidence base: raw `src/vs/workbench/contrib/webview/browser/pre/index.html` at tags 1.103.0, 1.104.0, 1.148.0 and `main`, plus `webviewElement.ts` at 1.148.0 ([source](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/webview/browser/pre/index.html)). VS Code 1.148 stable is dated 2026-11-25 ([updates page](https://code.visualstudio.com/updates)).

| Claim | Class | Detail |
|---|---|---|
| defaults in `@layer vscode-default` only from 1.104; advice against layering below 1.104 | unchanged | `@layer` count in index.html: 1.103.0 = 0, 1.104.0 = 1, 1.148.0 = 1. Layer name still `vscode-default`. |
| tokens set via `document.documentElement.style.setProperty()` | unchanged | `documentStyle.setProperty('--' + variable, value)` still present on main; stale sweep still only removes properties starting `--vscode-` from `documentElement.style`. Injection data now sent as `{styles, activeTheme, themeId, themeLabel, reduceMotion, screenReader}` from `webviewElement.ts` (1.148.0). |
| `_defaultStyles` CSP open question | unchanged, still open | The shell still builds `<style id="_defaultStyles">` with `createElement('style')` and prepends `defaultStyles.cloneNode(true)` to the content head. No release or source change resolves what happens under a content CSP without `unsafe-inline`. The shell page itself has `style-src 'unsafe-inline'`, which says nothing about the content document. Still needs devtools on a running webview. No VS Code release closed it. |
| high-contrast-light class pair | unchanged | `vscode-high-contrast-light` plus compat `vscode-high-contrast` added, "backwards compatibility" comment still present. |
| `vscode-reduce-motion`, `vscode-using-screen-reader` undocumented | unchanged (class presence); documentation status not re-checked | Both classes still applied in `applyStyles`. |
| `data-vscode-theme-name` deprecated | unchanged | Source comment: "@deprecated data-vscode-theme-name will be removed, use data-vscode-theme-id instead". Still not removed as of 1.148.0/main. Pin: "will be removed" is stated in source. |
| `@vscode/webview-ui-toolkit` archived (last push 2024-09-24) vs deprecation 2025-01-06 | unchanged, dates reconciled | The repo README says the toolkit "will be deprecated on January 1, 2025" and the repo was archived by its owner on January 6, 2025 ([repo](https://github.com/microsoft/vscode-webview-ui-toolkit)). So 2025-01-06 is the archive date; 2024-09-24 is the last code push in the old corpus, which is before it. Both consistent. The 2024-09-24 push date was not independently re-fetched (GitHub API refused). The npm registry shows a registry-metadata touch on 2026-06-26, which is not a code release. Suggested wording: "deprecated 2025-01-01, archived 2025-01-06, last push 2024-09-24". |
| `@vscode-elements/elements` successor, pinned 2.5.1 | unchanged | 2.5.1 is still latest; registry modified 2026-02-21; [releases page](https://github.com/vscode-elements/elements/releases) shows nothing after 2.5.1. |
| surface table "host: only >=1.104" | unchanged | Same evidence as the layer row. |
| Did any VS Code release change theme-variable injection? | no | Diff of index.html 1.104.0 vs 1.148.0 changes: CSP script hash, native-call capture and key-event token plumbing, service-worker registration, `a code` link rule, a transparent background for one rule, nested-frame edit-command guard. None touches the style-injection, class or deprecation lines. |

### rules.md

| Claim | Class | Detail |
|---|---|---|
| CSS-TOK-02 Style Dictionary `outputReferences: false` default | unchanged | `createPropertyFormatter.js` in style-dictionary 5.8.0: `outputReferences = false`. Changelog 5.5.1 to 5.8.0 has three bug fixes touching `outputReferences` (5.5.1, 5.6.0, 5.7.0), none changes the default ([CHANGELOG](https://raw.githubusercontent.com/style-dictionary/style-dictionary/main/CHANGELOG.md), [5.8.0 tarball](https://registry.npmjs.org/style-dictionary/-/style-dictionary-5.8.0.tgz)). Pin bump if the corpus names a version: latest is 5.8.0 (2026-11-03). |
| CSS-API-02 mainstream tooling declaring component-tier tokens | unchanged | Style Dictionary changelog 5.5.1 to 5.8.0 has no component-token entries. 5.7.0 adds DTCG v2025.10 `duration` token support. |
| DTCG Format Module stable 2025.10 | unchanged | [designtokens.org](https://www.designtokens.org/) still announces 2025.10 as first stable (W3C post 2025/10/28). |
| preview draft dated 2026-07-30 | pin bump only | The draft at [designtokens.org/tr/drafts/format](https://www.designtokens.org/tr/drafts/format/) is headed "08 September 2026", labelled a preview draft of in-progress changes. Only partially read for component tokens (the last 15k characters were not read), but grep of the full HTML found no "component token" text; "Component References" is a section heading and not a token tier. |

## Normative guidance candidates

1. Correct the Shoelace archive date to 2026-05-14 in web-components.md. Rationale: a dated fact that is wrong undermines the "dated evidence" argument. Verify: `grep -n "2026-08-28" skills/css-theming-reference/web-components.md` returns nothing.
2. Bump Stencil to 4.45.5 only after re-measuring `scoped:true` output on that version. Rationale: scope-css code changed in 4.45.0 and 4.45.2. Verify: build a `scoped:true` component and `grep -c "sc-my-component" dist/**/*.css`.
3. Add the 3.15.0 deprecations as a second dated example of Web Awesome part churn. Rationale: strengthens "pinning one hook name is a live risk". Verify: grep the manifest, `python3 -I` diff of `dist/custom-elements.json` between pinned versions.
4. Say "3.11.0 or 3.12.0" for the `label` part deprecation. Rationale: release text attributes it to 3.11.0. Verify: re-read the 3.11.0 release page.
5. Update the DTCG preview draft date to 2026-09-08. Rationale: the cited date is stale. Verify: header of designtokens.org/tr/drafts/format.
6. Add to vscode-webview.md that source was re-read at tag 1.148.0 (2026-11-25) with no relevant change. Rationale: moves the provenance from 1.104 era to current. Verify: `curl` the raw index.html at the tag and `grep -c "@layer"` equals 1.
7. Reword the deprecation line to "deprecated 2025-01-01, archived 2025-01-06". Rationale: removes the apparent date conflict.

## AI-agent angle

- An agent may state Lit or Stencil versions from memory. Check: `npm view lit version`, `npm view @stencil/core version`.
- An agent may assume `data-vscode-theme-name` is already removed. It is not as of 1.148.0; check by grepping index.html at the target tag.
- An agent may use removed `--sl-*` names. Check: `grep -rn "\-\-sl-"` in generated CSS.

## Contested / evolving

- Stencil 5.0.0 is in release-candidate (rc.14 on 2026-11-27); expect scoped-style behaviour to be re-examined at the next refresh.
- Web Awesome will remove the deprecated `*__base` parts in a future major version.
- DTCG Format Module preview draft keeps changing (08 September 2026); do not implement against it.
- `_defaultStyles` CSP behaviour: could not determine from source; needs a devtools run.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://registry.npmjs.org/lit | npm metadata | modified 2026-05-14 | Lit has no new release |
| https://github.com/lit/lit/releases | release page | 2026 | no entries in window |
| https://registry.npmjs.org/@stencil%2fcore | npm metadata | to 2026-11-27 | Stencil versions and dates |
| https://github.com/stenciljs/core/releases | release notes | 4.45.0 to 4.45.4 | scope-css fixes |
| https://registry.npmjs.org/@awesome.me/webawesome | npm metadata | 3.12.0 to 3.15.0 | dates |
| https://github.com/shoelace-style/webawesome/releases | release page | 3.13 to 3.15 | commit titles |
| https://github.com/shoelace-style/webawesome/releases/tag/v3.13.0 | tag page | 2026-09-16 | no breaking notes |
| https://github.com/shoelace-style/webawesome/releases/tag/v3.14.0 | tag page | 2026-09-24 | no breaking notes |
| https://github.com/shoelace-style/webawesome/releases/tag/v3.15.0 | tag page | 2026-11-17 | base-part deprecation |
| https://registry.npmjs.org/@awesome.me/webawesome/-/webawesome-3.12.0.tgz and -3.15.0.tgz | package manifests | 2026 | primary API diff |
| https://github.com/shoelace-style/shoelace | repo page | archived 2026-05-14 | archive date |
| https://code.visualstudio.com/updates | release notes index | 1.148 on 2026-11-25 | current release |
| https://raw.githubusercontent.com/microsoft/vscode/1.103.0, 1.104.0, 1.148.0, main /src/vs/workbench/contrib/webview/browser/pre/index.html | webview shell source | tags | all webview claims |
| https://raw.githubusercontent.com/microsoft/vscode/1.148.0/src/vs/workbench/contrib/webview/browser/webviewElement.ts | webview host | 1.148.0 | injected data |
| https://github.com/microsoft/vscode-webview-ui-toolkit | repo page | archived 2025-01-06 | deprecation dates |
| https://github.com/vscode-elements/elements/releases | releases | 2.5.1 latest | successor pin |
| https://registry.npmjs.org/@vscode-elements%2felements | npm | modified 2026-02-21 | no release in window |
| https://raw.githubusercontent.com/style-dictionary/style-dictionary/main/CHANGELOG.md | changelog | 5.5.1 to 5.8.0 | outputReferences, DTCG |
| https://registry.npmjs.org/style-dictionary/-/style-dictionary-5.8.0.tgz | package source | 2026-11-03 | default value |
| https://www.designtokens.org/ | spec home | 2025.10 stable | stable version |
| https://www.designtokens.org/tr/drafts/format/ | living draft | 08 September 2026 | draft date |

---
title: UI code posture of the fleet (accessibility and UX, measured)
program: product (ux sub-program)
worker: ui-code-posture (grounding)
date_researched: 2026-11-27
model: sonnet
sources_fetched: 5
method: static grep counts over git-tracked source (`git ls-files`), HTML parse of built dist/ directories, WCAG contrast computed with a script. Every number sits beside its command. The three helper scripts are reproduced in full in the Appendix; save them and run the quoted commands to redo every number. Repository state measured: 2026-11-27, working trees as found (git-tracked files via `git ls-files` / `git grep`).
---

# UI code posture of the fleet

All paths are relative to `/home/mherwig/dev`. Line cites: `T:` = `ocx-sh/website/packages/theme/src/`, `G:` = `grimoire-rs/grimoire/docs/`, `W:` = `ocx-sh/website/site/src/`.

## 0. Headline: what the fleet's UI code actually is

The frame lists seven Astro sites and one Vite GUI. Measured, the UI code is concentrated in one place and the GUI is almost empty.

| Corpus | Files | Lines | Command |
|---|---|---|---|
| Shared theme `@ocx-sh/theme` (102 `.astro`, 37 `.css`) | 139 | 16069 | `cd ocx-sh/website/packages/theme && git ls-files src \| grep -E '\.(astro\|css)$' \| xargs cat \| wc -l` |
| ocx.sh landing (`ocx-sh/website/site/src`) | 6 | 468 | same, in `ocx-sh/website/site` |
| Grimoire docs (`src` + `public/*.html`, minus asciinema vendor) | 12 | 2272 | `cd grimoire-rs/grimoire/docs && git ls-files src public \| grep -E '\.(astro\|css\|html)$' \| grep -v asciinema \| xargs cat \| wc -l` |
| `ocx/website` custom UI (only `src/styles/code.css`) and `www-setup/site` (only `Cast.astro`) | 2 | 24 | `git ls-files src \| grep -E '\.(astro\|css)$'` per site |
| `catalog/docs`, `devcontainer-features/site`, `rules_ocx/site` | 0 | 0 | same command returns nothing; they are Starlight config plus the theme |
| `grimoire-rs/grim-gui` front end (`index.html`, `src/styles.css`, `src/main.ts`, `src/view.ts`) | 4 | 74 | `cd grimoire-rs/grim-gui && git ls-files src index.html \| grep -v '^src-tauri' \| xargs wc -l` (165 incl. the 2 test files `src/main.test.ts`, `src/view.test.ts`) |

Five of seven Astro sites consume `@ocx-sh/theme` (`ocx-sh/ocx/website/package.json:14`, `ocx-sh/website/site/package.json:12`; each `astro.config.mjs` imports `@ocx-sh/theme/starlight`). Grimoire docs do not; they override Starlight directly (`G:astro.config.mjs:105-107`).

## 1. grim-gui: a skeleton, not a GUI

`grimoire-rs/grim-gui/README.md` says "Status: skeleton". Measured:

| Item | Count / state | Evidence |
|---|---|---|
| Views | 1 (renders `grim <version>` or an error) | `src/view.ts:19-32`, `src/main.ts:11-22` |
| Interactive elements (`button`, `a`, `input`, `select`, `textarea`, `label`) | 0 | `grep -cE '<(button\|a\|input\|select\|textarea\|label)\b' index.html src/*.ts` -> 0 |
| aria-* / role | 0 | `grep -c 'aria-\|role=' index.html src/*.ts` -> 0 |
| Images | 0 | |
| Keyboard shortcuts | 0 | no `keydown` handler in `src/` |
| Form validation | n/a, no form | |
| Destructive actions / confirmation | 0 / none | |
| `:focus-visible`, `prefers-reduced-motion`, `prefers-color-scheme`, media queries | 0 each | `src/styles.css` is 7 lines (`body {font-family; margin: 2rem}`, `.hint {color:#555}`) |
| `<html lang>` | present (`en`) | `index.html:2` |
| `<main>` landmark | present | `index.html:10` |
| Viewport meta | present | `index.html:5` |
| Window | fixed 800x600, title "grim-gui" | `src-tauri/tauri.conf.json:13-17` |
| CSP | strict (`default-src 'self'`, no inline script/style) | `src-tauri/tauri.conf.json:21` |

### State representation per view

| State | Present? | file:line |
|---|---|---|
| Loading | Absent. The root is empty until `invoke` resolves; no spinner, no text | `src/main.ts:11-13,21-22` |
| Empty | Not applicable (no list) | |
| Error, grim missing | Present | `src/view.ts:23-28` |
| Error, grim failed | Present | `src/view.ts:29-30` |
| Success | Present | `src/view.ts:21-22` |
| Error announced to assistive tech (`role=alert`/`aria-live`) | Absent | no `role` in `src/` |

### Every user-facing string

| String | file:line |
|---|---|
| `grim ${version}` | `src/view.ts:22` |
| `grim not found` | `src/view.ts:25` |
| `Install grim or set GRIM_BIN to an absolute path.` | `src/view.ts:26` |
| `grim failed (exit ${code ?? "unknown"})` | `src/view.ts:30` |
| `err.message` passed through verbatim (from the SDK: `src-tauri/src/bridge.rs:22,26`; or `grim call did not complete: {e}` at `bridge.rs:53`; or `String(err)` at `src/main.ts:16`) | |
| Window title `grim-gui`, page title `grim-gui` | `tauri.conf.json:15`, `index.html:7` |

Reading: the not-found error follows a good shape (names the problem, then the fix with the exact variable). The failed error shows an exit code and a raw message with no next step. The hint class is `#555` on the UA default canvas: 7.46:1 on white, 2.51:1 if the webview paints a dark canvas (no `color-scheme` is declared, `src/styles.css`). See contrast table.

## 2. Theme and sites: counts

Every cell below is printed by one script, `measure.sh` (Appendix A). Run `sh measure.sh` with no arguments; it builds each corpus from `git -C <repo> ls-files` exactly as section 0 (theme = `ocx-sh/website/packages/theme` `src` `.astro|.css`; landing = `ocx-sh/website/site` `src`; Grimoire = `grimoire-rs/grimoire/docs` `src` + `public` `.astro|.css|.html` minus asciinema; GUI = `grimoire-rs/grim-gui` `src` + `index.html` minus tests and `src-tauri`) and counts `grep -ohE '<pattern>'` matches. The Pattern column is the regex the script uses.

| Metric | Pattern (ERE) | Theme (139 files) | Landing (6) | Grimoire docs (12) | GUI (4) |
|---|---|---|---|---|---|
| `<img>` elements | `<img([[:space:]]|$)` | 3 | 0 | 0 | 0 |
| `<img>` elements without `alt` (multi-line aware, Python `re` with DOTALL) | `<img\s[^>]*>` lacking `\balt\b` | 0 | 0 | 0 | 0 |
| `<svg>` | `<svg\b` | 8 | 0 | 12 | 0 |
| `aria-*` attributes | `aria-[a-z]+` | 262 | 3 | 22 | 0 |
| `role=` | `role=` | 44 | 0 | 2 | 0 |
| `div`/`span` with `onclick`/`tabindex`/`role="button"` | `<(div|span)[^>]*(onclick|tabindex|role="button")` | 2 | 0 | 0 | 0 |
| `<button` | `<button` | 33 | 0 | 6 | 0 |
| `<a` | `<a[[:space:]>]` | 32 | 6 | 43 | 0 |
| `input`/`select`/`textarea` | `<(input|select|textarea)\b` | 17 | 0 | 10 | 0 |
| `<label` | `<label` | 11 | 0 | 16 | 0 |
| `:focus-visible` | `:focus-visible` | 82 | 0 | 6 | 0 |
| `outline: none` or `0` | `outline:[[:space:]]*(none|0)\b` | 16 | 0 | 1 | 0 |
| skip link mentions | `skip[- ]to|skip-link|Skip to` | 3 | 0 | 0 | 0 |
| `prefers-reduced-motion` | | 14 | 0 | 0 | 0 |
| `prefers-color-scheme` | | 0 | 0 | 2 (comments only) | 0 |
| width media queries (`min-width`/`max-width`) | `@media[^{]*(min|max)-width` | 6 | 0 | 11 | 0 |
| range-syntax media queries | `\(width *[<>]` | 7 | 1 | 0 | 0 |
| `animation:`/`transition:` declarations | `(animation|transition):` | 128 | 0 | 6 | 0 |
| min size 44 or 48 px set | `(min-)?(height|width):[[:space:]]*(44|48)px` | 0 | 0 | 0 | 0 |
| `pointer: coarse` or `hover: none` | | 1 | 0 | 0 | 0 |

Corrections against the first pass of this report: `<img>` in the theme is 3 real elements (the earlier 5 counted two code comments in `T:components/ui/Avatar.astro:6` and `T:components/ui/LogoTile.astro:3`); `<a` is 32 not 37; skip-link mentions are 3 not 2; range-syntax media queries are 7 not 6; Grimoire `<a` 43.

Findings behind the counts:

- **Images.** The 3 theme `<img>` elements all carry `alt`: `T:components/SiteHeader.astro:72` (`alt={brand.logoAlt ?? ''}`), `T:components/ui/Avatar.astro:44` and `T:components/ui/LogoTile.astro:46-50` (`alt=""`, decorative by design). Built output: 2 images on the ocx.sh landing, 2 with empty alt, 0 without alt; 0 images on the Grimoire dist (command in section 3).
- **Non-interactive tags made interactive.** Only 2, both justified by the pattern in the source: `T:components/ui/ActionMenu.astro:62` (`div tabindex=0` as a context-menu target) and `T:components/ui/DataTable.astro:94` (scrollable region, `role=region aria-label tabindex=0`, the standard scrollable-region fix). Grimoire's "Next" buttons in the install wizard are `<label class="cta cta-primary" for="s2">` driving a radio (`G:public/start.html:368`; the file header at line 23 says this is deliberate, no script). Keyboard focus goes to the radio and is ringed through `:has(> input:focus-visible)` (`start.html:166`).
- **Focus.** Theme has a global ring: `T:base.css:260` `:focus-visible { outline: var(--ocx-focus-ring) }` plus `--ocx-focus-ring: 2px solid` (`T:tokens.css:148`). All 16 `outline: none` sites checked by reading the neighbouring lines: each is paired with a border-colour change (`T:components/ui/field.css:54-58`, whose comment cites 1.4.11), a `:has(:focus-visible)` ring on a parent (`T:starlight/starlight.css:341-343`, `T:components/ui/choice.css:56-66`), or a forced-colors outline (`T:starlight/search-results.css:248-252`). `T:components/ui/command-bar.css:141-143` sets `outline:none` on the trigger's `:focus-visible`; I did not trace its replacement. Grimoire's static pages set `:focus { outline: none }` (`G:public/start.html:90`) then restore `:focus-visible` at line 91 with a 2px accent outline: correct order, 1 file.
- **Skip link.** Theme: `.ocx-skip` (`T:base.css:261-262`, rendered at `T:layouts/Shell.astro:94`). Starlight supplies its own on docs pages. Built-page check (`skiplink_in_first3` counter of `htmlaudit.py`, Appendix B, commands in section 3): first-3-links begin with `#` on 47 of 49 Grimoire pages and 5 of 13 ocx.sh landing files (the other 8 have no `<main>`, `no_main` = 8). WCAG 2.4.1 Bypass Blocks is Level A ([W3C Understanding 2.4.1](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html), fetched 2026-11-27).
- **Motion.** 14 `prefers-reduced-motion` blocks in the theme; tokens zero all durations (`T:tokens.css:353`); reveal and scroll components gate on `(scripting: enabled) and (prefers-reduced-motion: no-preference)` (`T:components/FeatureSection.astro:170,190`, `T:components/ScrollReveal.astro:19`); `T:components/ShellSessionPlayScript.astro:11` bails out in script. Grimoire docs: 0 reduced-motion blocks and 6 `transition/animation` declarations (`grep -noE '(animation|transition):' ...`), all hover-colour class.
- **Colour scheme.** `prefers-color-scheme` appears in zero executable lines of any corpus. The theme sets `data-theme` before paint from storage and, per its comment, follows the OS when the entry is `auto` (`T:starlight/ThemeProvider.astro:5`, logic in `head-scripts.mjs`, JS `matchMedia` not CSS). Grimoire docs is dark only by decision and ships no stored preference (`G:src/components/ThemeProvider.astro:1-18`, `G:src/styles/theme.css:17-19`); light mode on Grimoire's site does not exist, so a user whose OS or reading conditions prefer light has no choice.
- **Breakpoints.** Theme: `50rem` (x7, incl. `max-width: 50rem` at `T:starlight/Header.astro:53`), `46rem`, `40rem`, `20rem`, token `--ocx-bp-drawer: 640px` (`T:tokens.css:176`). Grimoire: `560px` (x4), `940px` (x3), `1100px`, `50rem`, `72rem` (`G:src/components/FooterNav.astro:74,81`, `G:src/pages/index.astro:247`, `G:src/components/SiteFooter.astro:70`). 5 distinct widths in Grimoire where 3 would do; two sets of units (px and rem) in one site.
- **Touch targets.** Control height tokens: 16 (choice), 18 (kbd), 20 (chip), 28, 30, 32, 38, 42 px (`T:tokens.css:187-194`). No token reaches 44. WCAG 2.2 SC 2.5.8 (AA) requires 24x24 CSS px unless the spacing, inline, equivalent, user-agent or essential exception applies ([W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), fetched 2026-11-27). Choice boxes (16), kbd (18) and chips (20) are below 24 and rely on the exceptions; I did not measure rendered hit areas. Only 1 `pointer: coarse|hover: none` query (row above) exists in the theme (`T:components/prose-code-copy.css:32`).
- **Keyboard.** Two global shortcuts: `/` opens the command palette (`T:components/ui/command-palette.mjs:85`) and Ctrl/Cmd+K opens search (`T:starlight/Search.astro:128`). Counts: `cd ocx-sh/website && git grep -nE "addEventListener\(\s*'keydown'" -- packages/theme/src | wc -l` -> 10 keydown listeners; `git grep -nE "'keydown'" -- packages/theme/src | wc -l` -> 18 lines naming the event (listeners plus trigger lists such as `T:components/ui/deferred-triggers.mjs:10`). The earlier "17" was not reproducible and is withdrawn.
- **Destructive confirmation.** Theme ships `AlertDialog` (`role=alertdialog`, `T:components/ui/AlertDialog.astro:3,26`) and `ConfirmDialog`. No site in the fleet has a destructive action to confirm.
- **Validation.** 10 `aria-invalid` lines (`cd ocx-sh/website && git grep -n aria-invalid -- packages/theme/src | wc -l` -> 10), all in the theme field styles/components (`T:components/ui/field.css:57-65`); invalid border is `--ocx-color-danger`; timing is not specified in code. The only real forms in the fleet are the docs search box and Grimoire's wizard radios.
- **Live regions.** 14 `aria-live`/`role=status|alert` lines in the theme (`cd ocx-sh/website && git grep -nE 'aria-live|role="(status|alert)"|role=.(status|alert)' -- packages/theme/src | wc -l` -> 14); loading/empty/error vocabulary exists as components: `Skeleton`, `Loader`, `ProgressCircle`, `Deferred` with default error text `Could not load this.` and a `Retry` button (`T:components/Deferred.astro:32`). `cd ocx-sh/website/packages/theme/src && grep -rlE 'data-empty|ocx-deferred|Skeleton|Loader' components | wc -l` -> 16 files.

## 3. Built-page HTML audit

Command (script in Appendix B, saved as `htmlaudit.py`; dists must be built, they are present on disk): `cd /home/mherwig/dev && python3 -I htmlaudit.py ocx-sh/website/site/dist grimoire-rs/grimoire/docs/dist ocx-sh/devcontainer-features/site/dist ocx-sh/website/examples/starlight/dist`. Raw counters per dist are printed as a dict; the table below transcribes them (`pages`, `pages_heading_skip`, `img_noalt`, `inputs_unlabelled` of `inputs`, `buttons_no_name`, `links_no_name`, `no_lang`, `dup_ids`). The script parses every `.html` with `html.parser` and counts, per page: h1 count, heading level jumps greater than 1, `img` without `alt`, form controls without label (wrapping `label`, `label[for]`, `aria-label`, `aria-labelledby` or `title`), `button`/`a` with no text, `aria-label`, `aria-labelledby` or `title`, missing `<html lang>`, `<title>`, viewport meta, `<main>`, duplicate ids, `onclick` or `tabindex>=0` on div/span.

| Dist | Pages | Heading skips | img no alt | Unlabelled inputs | Unnamed buttons / links | No lang | Dup ids |
|---|---|---|---|---|---|---|---|
| `ocx-sh/website/site/dist` | 13 (5 real, 8 fragment/nav) | 0 | 0 | 0 | 0 / 0 | 1 (nav fragment) | 0 |
| `grimoire-rs/grimoire/docs/dist` | 49 | 0 | 0 | 0 | 0 / 0 | 0 | 0 |
| `ocx-sh/devcontainer-features/site/dist` | 3 | 0 | 0 | 0 | 0 / 0 | 0 | 0 |
| `ocx-sh/website/examples/starlight/dist` (theme demo, not a fleet page) | 357 | 0 | 0 | 11 of 676 | 0 / 0 | 1 | 0 |

Caveats, read before citing:

- "First heading is not h1" (`pages_first_heading_not_h1` of the same command: 45 of 49 Grimoire pages; 4 of 13 ocx.sh files, which is 4 of the 5 with a `<main>`) is a parser artefact of Starlight's hidden "On this page" `h2` that precedes the page `h1` in DOM order. It is not a reading-order bug a user meets. Observed per-page outlines (`for f in <page>; do grep -oE '<h[1-6][ >]' $f | tr -d '< >' | tr '\n' ' '; done`, run from `/home/mherwig/dev`): `ocx.sh/index.html` h1 h2x6; `apps`, `team`, `integrations`: h2 h1 h2...; Grimoire `privacy.html` h1 h2x7; `start.html` h1 only.
- Grimoire's landing has two `h1` elements: Starlight's page title `Grimoire` and `G:src/pages/index.astro:77` `A lockfile for your AI-agent config.` Command: `grep -oE '<h[1-6][ >]' grimoire-rs/grimoire/docs/dist/index.html | tr -d '< >' | tr '\n' ' '` -> `h1 h1 h2 h2` (`h1_not_1` = 1 of 49 in the htmlaudit output). 1 of 49 pages.
- 833 `<svg>` (`svg_unnamed_not_hidden` for `grimoire-rs/grimoire/docs/dist`, same command; 1404 `<svg>` in total) look unnamed to the parser; all sampled instances are Starlight's heading-anchor icons inside `<span aria-hidden="true">`. Treat as 0 real issues. Only 2 of 12 Grimoire source SVGs were checked by hand: `G:src/components/Header.astro:45` has `aria-hidden="true"`.
- 11 of 676 inputs (`inputs_unlabelled` / `inputs`, `examples/starlight/dist` row of the same command) sit in the theme demo only (`examples/starlight/dist`); I did not identify them. They are outside the fleet's pages.
- Static `public/start.html` and `public/privacy.html` are not built by Astro and were audited by source and outline, not by the dist script.

## 4. Colour pairs used for text, contrast computed

Method: WCAG relative-luminance formula, `contrast.py` (Appendix C: full source, input pairs are literals inside it, and its complete 88-line output). Run: `python3 -I contrast.py`; the FAIL lines are `python3 -I contrast.py | grep FAIL`. Token hex values were read from `T:tokens.css:17-76,252-300`, `G:src/styles/theme.css:23-46`, `G:public/start.html:60-66`, `grim-gui/src/styles.css:6`. Alpha text (`color-mix(... N%, transparent)`) is blended onto the page ground. Thresholds, fetched 2026-11-27: [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) (4.5:1 normal text, 3:1 large text, large = 18pt or 14pt bold) and [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) (3:1 for UI components and graphical objects). [Focus Visible 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) is Level AA (fetched 2026-11-27).

88 pairs computed. The script flags 7 FAIL lines; they collapse to the 6 rows below because `gray-4` on bg is flagged twice (once as text, once as a 3:1 border).

| Pair | Ratio | Threshold | Where | Verdict |
|---|---|---|---|---|
| Grimoire body text at 45% alpha on `#161826` | 3.91 | 4.5 | `G:public/start.html:256` (11px uppercase label) | FAIL |
| Grimoire `gray-4` `#595d6c` on bg `#161826` | 2.69 | 3 (as border) | `G:src/pages/index.astro:198` button border, `G:src/components/PainRouter.astro:46` | FAIL as a control boundary; not used as text (checked: no `color: var(--sl-color-gray-4)` in `G:src`) |
| Grimoire `gray-4` on panel `#1b1d2c` | 2.55 | 3 | same | same |
| Grimoire `gray-5` `#3f424d` on bg | 1.76 | 3 | card and hairline borders (`G:src/pages/index.astro:208,218`) | decorative; fails only if borders are the sole cue |
| ocx light coral `#ff6047` on bg `#f6f7f9` | 2.79 | 3 | `T:tokens.css:34,39` comment | known; theme uses `accent-fg #ce1c00` (5.17) for text and focus in light |
| grim-gui `.hint #555` on `#121212` | 2.51 | 4.5 | `src/styles.css:6` | FAIL only if the webview paints dark; passes at 7.46 on white |

Lowest passing text pairs: Grimoire `gray-3` `#84858d` on panel 4.54, on bg 4.80 (used for muted captions, `G:src/pages/index.astro:233,241`); ocx light `accent-fg` on surface-subtle 4.93; ocx dark `accent-fg` on surface-subtle 5.28. All ocx theme text tokens (fg, fg-muted, fg-subtle, accent-fg, success, warning, danger, keyword, code-function) pass 4.5 on bg, surface and surface-subtle in both themes; the minimum is 4.93. Grimoire alpha text at 52% passes at 4.78, 55% at 5.19; the 45% label is the single sub-threshold text use.

Alpha-text values used in Grimoire's static pages: `cd grimoire-rs/grimoire/docs && grep -hoE '(^|[^-a-z])color: *color-mix\(in srgb, var\(--color-text\) [0-9]+%' public/start.html public/privacy.html | wc -l` -> 24 uses (45% x1, 52% x2, 55% x6, 58% x1, 62% x1, 68% x2, 78% x4, 80% x4, 85% x1, 88% x2; add `| grep -oE '[0-9]+%' | sort -u | wc -l` -> 10 distinct). The first pass said 21, which was wrong. A palette of 10 distinct opacities where Starlight tokens exist for the same job.

## 5. Automated checks and what runs in CI

Tool-presence counts come from one loop (run from `/home/mherwig/dev`); each cell is the number of git-tracked files (excluding lockfiles, `*.md`, `.agents`, `.claude`) that match case-insensitively:

```sh
for r in ocx-sh/website ocx-sh/ocx ocx-sh/www-setup ocx-sh/devcontainer-features ocx-sh/rules_ocx ocx-sh/catalog grimoire-rs/indexer grimoire-rs/grimoire grimoire-rs/grim-gui; do
  printf '%-34s' $r
  for pat in '@axe-core|axe-core|AxeBuilder' 'lighthouse' '@playwright/test|playwright test' 'pa11y' 'jsx-a11y'; do
    printf '%s=%s ' "$(echo $pat|cut -c1-8)" "$(git -C $r grep -lIiE -- "$pat" -- ':!*lock*' ':!*.md' ':!.agents' ':!.claude' | wc -l)"
  done; echo
done
```

| Repo | axe files | lighthouse files | playwright files | pa11y | jsx-a11y |
|---|---|---|---|---|---|
| `ocx-sh/website` | 48 | 65 | 99 | 0 | 0 |
| `ocx-sh/ocx` | 0 | 11 | 0 | 0 | 0 |
| `ocx-sh/www-setup` | 0 | 7 | 0 | 0 | 0 |
| `ocx-sh/devcontainer-features` | 0 | 7 | 0 | 0 | 0 |
| `ocx-sh/rules_ocx` | 0 | 7 | 0 | 0 | 0 |
| `ocx-sh/catalog` | 1 | 20 | 0 | 0 | 0 |
| `grimoire-rs/indexer` (MkDocs) | 0 | 10 | 0 | 0 | 0 |
| `grimoire-rs/grimoire` | 0 | 0 | 0 | 0 | 0 |
| `grimoire-rs/grim-gui` | 0 | 0 | 0 | 0 | 0 |

CI wiring, with the command that found each line (`git -C <repo> grep -nIiE 'lighthouse|axe|quality:web|ci:docs' -- .github/workflows taskfile.yml 'taskfiles/*'`; for `ocx-sh/website` `git grep -nE 'ci:deep|ci:docs|lighthouse' -- .github/workflows taskfile.yml`):

| Repo | Tool and threshold | Runs in CI? | Evidence |
|---|---|---|---|
| `ocx-sh/website` (theme + landing) | axe via `@axe-core/playwright`: `cd ocx-sh/website && git grep -c 'AxeBuilder(' -- tests \| awk -F: '{s+=$NF;n++}END{print s,n}'` -> 59 calls in 47 spec files (`git grep -l AxeBuilder -- tests \| wc -l` -> 47). Lighthouse CI, all four categories `minScore: 1` (`.lighthouserc.cjs:36`) | Lighthouse: yes, `verify-basic.yml:78` `task ci:docs`. Axe/Playwright: deep tier only, `verify-deep.yml:7` (cron `58 3 * * *`) and `verify-deep.yml:18` (dispatch or PR label `run-deep`), not every PR | files above |
| `ocx-sh/ocx` (website) | Lighthouse budgets, categories include accessibility (`website/lighthouse.budgets.mjs:20`); no axe, no Playwright | yes: `.github/workflows/verify-basic.yml:120` `task ci:docs` -> `taskfiles/ci.taskfile.yml:102` `:website:lighthouse` | `git -C ocx-sh/ocx grep -nIiE 'lighthouse' -- .github/workflows 'taskfiles/*'` |
| `ocx-sh/www-setup` | Lighthouse (`site/lighthouse.budgets.mjs:27`, accessibility category); no axe | yes: `.github/workflows/site.yml:55,72` `task site:lighthouse` | `git -C ocx-sh/www-setup grep -nIiE 'lighthouse' -- .github/workflows` |
| `ocx-sh/devcontainer-features` | Lighthouse (`site/lighthouse.budgets.mjs:27`) | yes: `.github/workflows/verify-basic.yml:78` and `deploy-site.yml:39` `task ci:docs`; `taskfile.yml:58` `site:lighthouse` | `git -C ocx-sh/devcontainer-features grep -nIiE 'ci:docs\|lighthouse' -- .github/workflows taskfile.yml` |
| `ocx-sh/rules_ocx` | Lighthouse 100x4 plus budgets (`taskfile.yml:283`) | yes: `.github/workflows/verify-basic.yml:97`, `deploy-site.yml:40` `task ci:docs` | same shape of command |
| `ocx-sh/catalog` | Lighthouse CI plus one axe script `scripts/quality-axe.mjs:3` over built fixture sites | yes: `.github/workflows/ci.yml:195` `task quality:web` | `git -C ocx-sh/catalog grep -nIiE 'quality:web' -- .github/workflows` |
| `grimoire-rs/indexer` (MkDocs, only its CI wiring traced) | Lighthouse CI, accessibility `minScore: 0.97` (`.lighthouserc.cjs:119`), plus interaction, cascade and CSP probes (`taskfile.yml:77-78`) | yes: `.github/workflows/ci.yml:57` `task quality:web` | `git -C grimoire-rs/indexer grep -nE 'quality:web' -- .github/workflows taskfile.yml` |
| `grimoire-rs/grimoire` docs | none of axe, Lighthouse, Playwright. Own checks `docs/theme_check.sh` and `docs/landing_check.py` (`taskfiles/docs.taskfile.yml:91-92`); `starlight-links-validator` plugin (`docs/astro.config.mjs:115`) | those checks run (`docs.yml:92`); no accessibility check | `git -C grimoire-rs/grimoire grep -nE 'theme_check\|landing_check' -- taskfiles .github` |
| `grimoire-rs/grim-gui` | none. 2 vitest files assert text only (`src/main.test.ts`, `src/view.test.ts`) | `verify-basic.yml` has jobs on ubuntu runners (lines 33, 50, 70); nothing on UI accessibility | `git -C grimoire-rs/grim-gui grep -nE 'a11y\|axe\|lighthouse' -- .` -> none |
| Any repo | pa11y: 0 files; `eslint-plugin-jsx-a11y`: 0 files (table above). `eslint-plugin-astro` only in `ocx-sh/website/eslint.config.js:30` (`astro.configs.recommended`, not the a11y subset) | | `git -C ocx-sh/website grep -nE 'astro.configs' -- eslint.config.js` |

Other contract tests in the theme: `cd ocx-sh/website && git grep -l forced-colors -- . ':!*.md' | wc -l` -> 28 files (19 of them under `packages/theme/src`: `git grep -l forced-colors -- packages/theme/src | wc -l`; 19 lines: `git grep -nE forced-colors -- packages/theme/src | wc -l`); dark/light parity script `scripts/css/dark-parity.mjs` (`taskfile.yml:121`).

## Appendix: scripts, saved verbatim to reproduce every number

Save A as `measure.sh`, B as `htmlaudit.py`, C as `contrast.py` (any directory outside the audited repos; run Python with `-I`).

### A. measure.sh (section 2 table; `sh measure.sh`)

```sh
#!/bin/sh
# usage: measure.sh  -> prints the section-2 table (metric, theme, landing, grimoire, gui). Run from anywhere.
R=/home/mherwig/dev
lists() { # name -> file list (absolute paths), one per line
  case $1 in
    theme)  D=$R/ocx-sh/website/packages/theme; F='\.(astro|css)$'; P=src ;;
    landing) D=$R/ocx-sh/website/site; F='\.(astro|css)$'; P=src ;;
    grimoire) D=$R/grimoire-rs/grimoire/docs; F='\.(astro|css|html)$'; P="src public" ;;
    gui) D=$R/grimoire-rs/grim-gui; F='\.(ts|css|html)$'; P="src index.html" ;;
  esac
  git -C $D ls-files $P | grep -E "$F" | grep -v -e asciinema -e '^src-tauri' -e '\.test\.' | sed "s|^|$D/|"
}
cnt() { # name pattern -> number of matches (grep -o) across the corpus
  lists $1 | xargs -r grep -ohE -- "$2" 2>/dev/null | wc -l
}
row() { printf '%s | %s | %s | %s | %s\n' "$1" "$(cnt theme "$2")" "$(cnt landing "$2")" "$(cnt grimoire "$2")" "$(cnt gui "$2")"; }
for c in theme landing grimoire gui; do printf 'files %s: %s\n' $c "$(lists $c | wc -l)"; done
row 'img element' '<img([[:space:]]|$)'
row 'svg'            '<svg\b'
row 'aria-*'         'aria-[a-z]+'
row 'role='          'role='
row 'div/span interactive' '<(div|span)[^>]*(onclick|tabindex|role="button")'
row 'button'         '<button'
row 'a' '<a[[:space:]>]'
row 'input/select/textarea' '<(input|select|textarea)\b'
row 'label'          '<label'
row 'focus-visible'  ':focus-visible'
row 'outline none/0' 'outline:[[:space:]]*(none|0)\b'
row 'skip link'      'skip[- ]to|skip-link|Skip to'
row 'reduced-motion' 'prefers-reduced-motion'
row 'color-scheme'   'prefers-color-scheme'
row 'width MQ'       '@media[^{]*(min|max)-width'
row 'range MQ'       '\(width *[<>]'
row 'anim/transition' '(animation|transition):'
row 'min 44/48px'    '(min-)?(height|width):[[:space:]]*(44|48)px'
row 'coarse/hover none' 'pointer: *coarse|hover: *none'
# img lacking alt: multi-line aware
for c in theme landing grimoire gui; do printf 'img-without-alt %s: ' $c; lists $c | xargs -r python3 -I -c '
import re,sys
n=0
for f in sys.argv[1:]:
    t=open(f,encoding="utf8").read()
    for m in re.finditer(r"<img\s[^>]*>",t,re.S):
        if not re.search(r"\balt\b",m.group(0)): n+=1
print(n)' ; done
```

### B. htmlaudit.py (section 3; `python3 -I htmlaudit.py <dist...>`)

```python
import sys,os,re,collections
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.h=[];s.imgs=0;s.noalt=0;s.emptyalt=0;s.inputs=[];s.labels_for=set();s.wrap_label=0;s.stack=[]
        s.btn=[];s.alinks=[];s.lang=False;s.main=0;s.ids=collections.Counter();s.title=False;s.viewport=False
        s.firstlinks=[];s.cur=None;s.text=''; s.in_label=0;s.tabindex_div=0;s.role_btn_div=0;s.onclick_div=0;s.svgs=0;s.svg_unnamed=0
        s.aria=0;s.roles=0;s.th_noscope=0
    def handle_starttag(s,t,a):
        d=dict(a)
        for k in d:
            if k.startswith('aria-'): s.aria+=1
        if 'role' in d: s.roles+=1
        if 'id' in d: s.ids[d['id']]+=1
        if t=='html' and d.get('lang'): s.lang=True
        if t=='title': s.title=True
        if t=='meta' and d.get('name')=='viewport': s.viewport=True
        if t=='main' or d.get('role')=='main': s.main+=1
        if re.fullmatch(r'h[1-6]',t): s.h.append(int(t[1])); 
        if t=='img':
            s.imgs+=1
            if 'alt' not in d: s.noalt+=1
            elif d['alt']=='' : s.emptyalt+=1
        if t=='svg':
            s.svgs+=1
            if d.get('aria-hidden')!='true' and 'aria-label' not in d and 'aria-labelledby' not in d and d.get('role') not in ('img','presentation','none'): s.svg_unnamed+=1
        if t=='label':
            s.in_label+=1
            if 'for' in d: s.labels_for.add(d['for'])
        if t in('input','select','textarea') and d.get('type')!='hidden':
            s.inputs.append((d,s.in_label>0))
        if t in('div','span'):
            if 'onclick' in d: s.onclick_div+=1
            if 'tabindex' in d and d['tabindex']!='-1': s.tabindex_div+=1
            if d.get('role')=='button': s.role_btn_div+=1
        if t in('button','a'):
            s.cur=(t,d);s.text=''
            if t=='a' and 'href' in d and len(s.firstlinks)<3: s.firstlinks.append(d['href'])
    def handle_endtag(s,t):
        if t=='label': s.in_label=max(0,s.in_label-1)
        if s.cur and t==s.cur[0]:
            tt,d=s.cur; name=s.text.strip() or d.get('aria-label') or d.get('aria-labelledby') or d.get('title')
            (s.btn if tt=='button' else s.alinks).append(bool(name) or None) if False else None
            lst=s.btn if tt=='button' else s.alinks
            lst.append(bool(name) or tt=='a' and 'href' not in d and True)
            s.cur=None
    def handle_data(s,x):
        if s.cur: s.text+=x
    def handle_startendtag(s,t,a): s.handle_starttag(t,a)
def audit(root):
    tot=collections.Counter(); skips=[]; per=[]
    n=0
    for dp,dn,fn in os.walk(root):
        for f in fn:
            if not f.endswith('.html'): continue
            p=os.path.join(dp,f); t=open(p,encoding='utf8',errors='ignore').read()
            if 'http-equiv="refresh"' in t[:2000] and len(t)<1500: tot['redirect_stub']+=1; continue
            q=P(); q.feed(t); n+=1
            tot['pages']+=1
            tot['h1_not_1']+= (q.h.count(1)!=1)
            sk=sum(1 for a,b in zip(q.h,q.h[1:]) if b>a+1)
            tot['pages_heading_skip']+= sk>0; tot['heading_skips']+=sk
            if sk: skips.append((os.path.relpath(p,root),sk))
            tot['pages_first_heading_not_h1']+= bool(q.h) and q.h[0]!=1
            tot['img']+=q.imgs; tot['img_noalt']+=q.noalt; tot['img_emptyalt']+=q.emptyalt
            tot['svg']+=q.svgs; tot['svg_unnamed_not_hidden']+=q.svg_unnamed
            unl=0
            for d,inl in q.inputs:
                ok=inl or d.get('id') in q.labels_for or 'aria-label' in d or 'aria-labelledby' in d or 'title' in d
                if not ok: unl+=1
            tot['inputs']+=len(q.inputs); tot['inputs_unlabelled']+=unl
            tot['buttons']+=len(q.btn); tot['buttons_no_name']+=sum(1 for x in q.btn if not x)
            tot['links']+=len(q.alinks); tot['links_no_name']+=sum(1 for x in q.alinks if not x)
            tot['no_lang']+= (not q.lang); tot['no_main']+= (q.main==0); tot['multi_main']+=(q.main>1)
            tot['no_title']+=(not q.title); tot['no_viewport']+=(not q.viewport)
            tot['skiplink_in_first3']+= any(h.startswith('#') for h in q.firstlinks)
            tot['dup_ids']+=sum(1 for v in q.ids.values() if v>1)
            tot['div_span_onclick']+=q.onclick_div; tot['div_span_tabindex>=0']+=q.tabindex_div; tot['div_span_role_button']+=q.role_btn_div
            tot['aria_attrs']+=q.aria; tot['role_attrs']+=q.roles
    return tot,skips
for r in sys.argv[1:]:
    t,s=audit(r); print('##',r); print(dict(t)); print('skips:',sorted(s,key=lambda x:-x[1])[:6])
```

### C. contrast.py (section 4; `python3 -I contrast.py`)

```python
def h(x): x=x.lstrip('#'); return tuple(int(x[i:i+2],16) for i in (0,2,4))
def lin(c): c/=255; return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(rgb): r,g,b=[lin(c) for c in rgb]; return .2126*r+.7152*g+.0722*b
def cr(a,b):
    la,lb=L(a),L(b); 
    if la<lb: la,lb=lb,la
    return (la+.05)/(lb+.05)
def mix(fg,bg,a): return tuple(fg[i]*a+bg[i]*(1-a) for i in range(3))
rows=[]
def p(name,fg,bg,need=4.5): 
    v=cr(h(fg),h(bg)); rows.append((name,fg,bg,round(v,2),'PASS' if v>=need else 'FAIL<%s'%need))
# OCX light
lb={'bg':'#f6f7f9','surface':'#ffffff','surface-subtle':'#eff2f5'}
lt={'fg':'#1b2129','fg-muted':'#4b5665','fg-subtle':'#5f6979','accent-fg':'#ce1c00','success':'#0a7652','warning':'#8b6011','danger':'#b42318','keyword':'#5f4ac6','code-function':'#1a5fc2'}
for t,tv in lt.items():
    for b,bv in lb.items(): p('ocx light %s on %s'%(t,b),tv,bv)
p('ocx light on-accent on accent','#1b2129','#ff6047')
p('ocx light coral accent on bg (non-text 3:1)','#ff6047','#f6f7f9',3)
p('ocx light border-control on bg (3:1)','#7f8998','#f6f7f9',3)
db={'bg':'#0e1116','surface':'#151a22','surface-subtle':'#1c232d'}
dt={'fg':'#e7ebf1','fg-muted':'#9aa5b3','fg-subtle':'#8b97a8','accent-fg':'#ff6047','success':'#3edea6','warning':'#fab833','danger':'#ff7b6e','keyword':'#c0b3ff','code-function':'#6cb6ff'}
for t,tv in dt.items():
    for b,bv in db.items(): p('ocx dark %s on %s'%(t,b),tv,bv)
p('ocx dark border-control on bg (3:1)','#636e80','#0e1116',3)
# grimoire
gb={'bg':'#161826','gray-6 panel':'#1b1d2c'}
gt={'text/white':'#e9e9ed','gray-1':'#d5d6dc','gray-2':'#babbc1','gray-3':'#84858d','gray-4':'#595d6c','accent':'#9184d9','accent-high':'#d2cefd'}
for t,tv in gt.items():
    for b,bv in gb.items(): p('grimoire dark %s on %s'%(t,b),tv,bv)
p('grimoire cta ink on accent','#14121f','#9184d9')
p('grimoire cta ink on accent-high','#14121f','#d2cefd')
p('grimoire gray-4 border on bg (3:1)','#595d6c','#161826',3)
p('grimoire gray-5 border on bg (3:1)','#3f424d','#161826',3)
# start.html alpha text
bg=h('#161826'); tx=h('#e9e9ed')
for a in (45,52,55,58,62,68,78,80,85,88):
    c=mix(tx,bg,a/100); v=cr(c,bg); rows.append(('grimoire start/privacy text @%d%% on bg'%a,'#e9e9ed','#161826',round(v,2),'PASS' if v>=4.5 else 'FAIL<4.5'))
# grim-gui
p('grim-gui .hint #555 on white (UA default canvas)','#555555','#ffffff')
p('grim-gui .hint #555 on dark canvas #121212 (if UA dark)','#555555','#121212')
for r in rows: print(' | '.join(map(str,r)))
```

Complete output of C (88 lines: name | foreground | background | ratio | verdict against the threshold given in the name or 4.5):

```
ocx light fg on bg | #1b2129 | #f6f7f9 | 15.11 | PASS
ocx light fg on surface | #1b2129 | #ffffff | 16.2 | PASS
ocx light fg on surface-subtle | #1b2129 | #eff2f5 | 14.42 | PASS
ocx light fg-muted on bg | #4b5665 | #f6f7f9 | 6.95 | PASS
ocx light fg-muted on surface | #4b5665 | #ffffff | 7.45 | PASS
ocx light fg-muted on surface-subtle | #4b5665 | #eff2f5 | 6.63 | PASS
ocx light fg-subtle on bg | #5f6979 | #f6f7f9 | 5.18 | PASS
ocx light fg-subtle on surface | #5f6979 | #ffffff | 5.55 | PASS
ocx light fg-subtle on surface-subtle | #5f6979 | #eff2f5 | 4.94 | PASS
ocx light accent-fg on bg | #ce1c00 | #f6f7f9 | 5.17 | PASS
ocx light accent-fg on surface | #ce1c00 | #ffffff | 5.54 | PASS
ocx light accent-fg on surface-subtle | #ce1c00 | #eff2f5 | 4.93 | PASS
ocx light success on bg | #0a7652 | #f6f7f9 | 5.26 | PASS
ocx light success on surface | #0a7652 | #ffffff | 5.64 | PASS
ocx light success on surface-subtle | #0a7652 | #eff2f5 | 5.02 | PASS
ocx light warning on bg | #8b6011 | #f6f7f9 | 5.18 | PASS
ocx light warning on surface | #8b6011 | #ffffff | 5.56 | PASS
ocx light warning on surface-subtle | #8b6011 | #eff2f5 | 4.95 | PASS
ocx light danger on bg | #b42318 | #f6f7f9 | 6.13 | PASS
ocx light danger on surface | #b42318 | #ffffff | 6.57 | PASS
ocx light danger on surface-subtle | #b42318 | #eff2f5 | 5.85 | PASS
ocx light keyword on bg | #5f4ac6 | #f6f7f9 | 5.97 | PASS
ocx light keyword on surface | #5f4ac6 | #ffffff | 6.4 | PASS
ocx light keyword on surface-subtle | #5f4ac6 | #eff2f5 | 5.7 | PASS
ocx light code-function on bg | #1a5fc2 | #f6f7f9 | 5.66 | PASS
ocx light code-function on surface | #1a5fc2 | #ffffff | 6.07 | PASS
ocx light code-function on surface-subtle | #1a5fc2 | #eff2f5 | 5.4 | PASS
ocx light on-accent on accent | #1b2129 | #ff6047 | 5.41 | PASS
ocx light coral accent on bg (non-text 3:1) | #ff6047 | #f6f7f9 | 2.79 | FAIL<3
ocx light border-control on bg (3:1) | #7f8998 | #f6f7f9 | 3.3 | PASS
ocx dark fg on bg | #e7ebf1 | #0e1116 | 15.81 | PASS
ocx dark fg on surface | #e7ebf1 | #151a22 | 14.59 | PASS
ocx dark fg on surface-subtle | #e7ebf1 | #1c232d | 13.22 | PASS
ocx dark fg-muted on bg | #9aa5b3 | #0e1116 | 7.57 | PASS
ocx dark fg-muted on surface | #9aa5b3 | #151a22 | 6.99 | PASS
ocx dark fg-muted on surface-subtle | #9aa5b3 | #1c232d | 6.33 | PASS
ocx dark fg-subtle on bg | #8b97a8 | #0e1116 | 6.38 | PASS
ocx dark fg-subtle on surface | #8b97a8 | #151a22 | 5.89 | PASS
ocx dark fg-subtle on surface-subtle | #8b97a8 | #1c232d | 5.34 | PASS
ocx dark accent-fg on bg | #ff6047 | #0e1116 | 6.32 | PASS
ocx dark accent-fg on surface | #ff6047 | #151a22 | 5.83 | PASS
ocx dark accent-fg on surface-subtle | #ff6047 | #1c232d | 5.28 | PASS
ocx dark success on bg | #3edea6 | #0e1116 | 10.99 | PASS
ocx dark success on surface | #3edea6 | #151a22 | 10.15 | PASS
ocx dark success on surface-subtle | #3edea6 | #1c232d | 9.19 | PASS
ocx dark warning on bg | #fab833 | #0e1116 | 10.78 | PASS
ocx dark warning on surface | #fab833 | #151a22 | 9.95 | PASS
ocx dark warning on surface-subtle | #fab833 | #1c232d | 9.01 | PASS
ocx dark danger on bg | #ff7b6e | #0e1116 | 7.48 | PASS
ocx dark danger on surface | #ff7b6e | #151a22 | 6.91 | PASS
ocx dark danger on surface-subtle | #ff7b6e | #1c232d | 6.26 | PASS
ocx dark keyword on bg | #c0b3ff | #0e1116 | 10.03 | PASS
ocx dark keyword on surface | #c0b3ff | #151a22 | 9.26 | PASS
ocx dark keyword on surface-subtle | #c0b3ff | #1c232d | 8.39 | PASS
ocx dark code-function on bg | #6cb6ff | #0e1116 | 8.8 | PASS
ocx dark code-function on surface | #6cb6ff | #151a22 | 8.13 | PASS
ocx dark code-function on surface-subtle | #6cb6ff | #1c232d | 7.36 | PASS
ocx dark border-control on bg (3:1) | #636e80 | #0e1116 | 3.67 | PASS
grimoire dark text/white on bg | #e9e9ed | #161826 | 14.54 | PASS
grimoire dark text/white on gray-6 panel | #e9e9ed | #1b1d2c | 13.78 | PASS
grimoire dark gray-1 on bg | #d5d6dc | #161826 | 12.14 | PASS
grimoire dark gray-1 on gray-6 panel | #d5d6dc | #1b1d2c | 11.5 | PASS
grimoire dark gray-2 on bg | #babbc1 | #161826 | 9.19 | PASS
grimoire dark gray-2 on gray-6 panel | #babbc1 | #1b1d2c | 8.71 | PASS
grimoire dark gray-3 on bg | #84858d | #161826 | 4.8 | PASS
grimoire dark gray-3 on gray-6 panel | #84858d | #1b1d2c | 4.54 | PASS
grimoire dark gray-4 on bg | #595d6c | #161826 | 2.69 | FAIL<4.5
grimoire dark gray-4 on gray-6 panel | #595d6c | #1b1d2c | 2.55 | FAIL<4.5
grimoire dark accent on bg | #9184d9 | #161826 | 5.45 | PASS
grimoire dark accent on gray-6 panel | #9184d9 | #1b1d2c | 5.17 | PASS
grimoire dark accent-high on bg | #d2cefd | #161826 | 11.73 | PASS
grimoire dark accent-high on gray-6 panel | #d2cefd | #1b1d2c | 11.11 | PASS
grimoire cta ink on accent | #14121f | #9184d9 | 5.73 | PASS
grimoire cta ink on accent-high | #14121f | #d2cefd | 12.31 | PASS
grimoire gray-4 border on bg (3:1) | #595d6c | #161826 | 2.69 | FAIL<3
grimoire gray-5 border on bg (3:1) | #3f424d | #161826 | 1.76 | FAIL<3
grimoire start/privacy text @45% on bg | #e9e9ed | #161826 | 3.91 | FAIL<4.5
grimoire start/privacy text @52% on bg | #e9e9ed | #161826 | 4.78 | PASS
grimoire start/privacy text @55% on bg | #e9e9ed | #161826 | 5.19 | PASS
grimoire start/privacy text @58% on bg | #e9e9ed | #161826 | 5.63 | PASS
grimoire start/privacy text @62% on bg | #e9e9ed | #161826 | 6.26 | PASS
grimoire start/privacy text @68% on bg | #e9e9ed | #161826 | 7.28 | PASS
grimoire start/privacy text @78% on bg | #e9e9ed | #161826 | 9.21 | PASS
grimoire start/privacy text @80% on bg | #e9e9ed | #161826 | 9.63 | PASS
grimoire start/privacy text @85% on bg | #e9e9ed | #161826 | 10.74 | PASS
grimoire start/privacy text @88% on bg | #e9e9ed | #161826 | 11.44 | PASS
grim-gui .hint #555 on white (UA default canvas) | #555555 | #ffffff | 7.46 | PASS
grim-gui .hint #555 on dark canvas #121212 (if UA dark) | #555555 | #121212 | 2.51 | FAIL<4.5
```

## Smells

Ranked by what an agent writing UI would reproduce or what a user hits.

1. **Grim-gui has no loading state and no live-region on its error view** (`src/main.ts:11-22`, `src/view.ts:23-30`). Cost now: one flash of blank window. Cost when screens land: every new view copies the pattern.
2. **Grimoire docs: dark only, no light option, no reduced-motion, no `prefers-color-scheme`** (`G:src/components/ThemeProvider.astro:1-18`; 0 reduced-motion blocks). Deliberate, documented, but a skill must not tell agents to "support the OS theme" for this site.
3. **Grimoire static pages use a 10-step ad-hoc opacity ramp for text** (24 uses, 45-88%), one of which fails 4.5:1 (`G:public/start.html:256`, 3.91). Token ramp exists and passes.
4. **Grimoire border tokens (`gray-4`, `gray-5`) fail 3:1 as control boundaries** (2.69, 1.76) while the secondary button uses `gray-4` (`G:src/pages/index.astro:198`).
5. **Two `h1` on Grimoire's landing** (Starlight title plus hero). 1 of 49 pages.
6. **Touch targets: no token reaches 44 px; three control sizes are below 24 px** (`T:tokens.css:187-189`); depends on spacing exemption; no coarse-pointer sizing (1 query).
7. **Accessibility gate is split by tier.** Lighthouse (accessibility 100) gates every PR; axe lives in the nightly/labelled deep tier of `ocx-sh/website` only; Grimoire's site and the GUI have neither.
8. **`outline: none` appears 16 times** in the theme; all but one traced replacement exist (`command-bar.css:141-143` untraced). A rule saying "never remove outline" would be false for this codebase; the true rule is "remove it only where a replacement indicator is drawn".
9. **Mixed units in breakpoints** (px and rem) and 5 widths on Grimoire; `--ocx-bp-*` tokens are "reference only" (`T:tokens.css:175`) so queries repeat literals.

## Patterns worth encoding

1. **Focus: one global `:focus-visible` ring from a token, local overrides only with a replacement indicator** (`T:base.css:260`, `T:tokens.css:148`, comment at `T:components/ui/field.css:54`). Checkable: grep `outline:\s*(none|0)` and require a `border-color`, `box-shadow` or `:has(` sibling in the same rule block.
2. **Text-colour tokens with the contrast ratio written beside the value** (`T:tokens.css:29-31,36`), verified by a script. Checkable: a contrast pass over token pairs (88 pairs here, 7 failures, all outside the ocx theme).
3. **Motion gated by `prefers-reduced-motion: no-preference` plus a token that zeroes durations** (`T:tokens.css:353`, `T:components/FeatureSection.astro:170`). Checkable: every `animation|transition` in a file requires a reduced-motion guard in the same file or a token-driven duration.
4. **Skeleton, loader and error-with-retry as shared components, with default wording `Could not load this.` / `Retry`** (`T:components/Deferred.astro:32`). Missing in grim-gui; an agent writing the GUI has no pattern to copy.
5. **Error text with the fix attached**: `Install grim or set GRIM_BIN to an absolute path.` (`grim-gui/src/view.ts:26`). The sibling `grim failed (exit N)` lacks the second half.
6. **Lighthouse `minScore: 1` in four categories as a PR gate plus page budgets** (`ocx-sh/website/.lighthouserc.cjs:36`), copied by four sibling sites. The one automated a11y check that already works as a fleet convention.
7. **Scrollable regions get `role=region`, `aria-label`, `tabindex=0`** (`T:components/ui/DataTable.astro:94`). Checkable with axe `scrollable-region-focusable`.
8. **Static pages built from radio inputs and labels instead of script** (`G:public/start.html:23,339-368`) is an accessible no-JS wizard but uses `<label>` as a button; a rule must say how to keep the focus ring on it (`start.html:166`).

## What this contradicts in the frame

- "Desktop or web GUI: `grimoire-rs/grim-gui` (Vite)" as a surface to audit. Measured: 74 lines of front end, one view, 0 interactive elements, 0 shortcuts, 0 forms, 0 destructive actions. There is no GUI UX posture to ground a GUI rule in. Rules for dialogs, validation timing, confirmation, empty states and shortcuts have no fleet exemplar in `grim-gui`; the closest code is the theme's `AlertDialog`/`Deferred` components, which serve websites. Either ground GUI rules in exemplars outside the fleet or mark them as forward-looking.
- "Astro sites ... custom components" as seven surfaces. Measured: custom UI code is 139 theme files (16069 lines) in one package, `ocx-sh/website/packages/theme`, consumed by five sites, plus 6 landing files and 12 Grimoire files. Three sites (`catalog/docs`, `devcontainer-features/site`, `rules_ocx/site`) contain zero custom UI files. The theme is not in the frame's surface table and is the most important target for a `ux-quality` rule.
- The frame says the UX-posture gap is open. The ocx.sh family already enforces Lighthouse accessibility 100 on every PR, axe across 47 e2e specs (deep tier), forced-colors handling, reduced-motion, and measured token contrast. The weak spots are Grimoire's site (no a11y tool at all, 7 colour issues) and the GUI. The guidance worth writing is therefore partly "extend this gate to the rest of the fleet", not "introduce accessibility".
- The frame's pairing of `css-theming` (already covered) with `ux-quality`: the theme already carries heavy accessibility policy inside tokens and comments (C-023, C-057 and others), so overlap with `css-theming` on focus, contrast and reduced-motion must be resolved when the rule is written.
- MkDocs sites (`ocx-mirror`, `indexbot`, `indexer`) were not measured here; this axis covered Astro and the GUI only.

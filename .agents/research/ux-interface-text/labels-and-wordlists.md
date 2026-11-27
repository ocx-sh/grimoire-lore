---
title: Interface text, labels and word lists (labels-and-wordlists)
program: product
sub_program: ux
topic: ux-interface-text
worker: labels-and-wordlists
date_researched: 2026-11-27
model: sonnet
sources_fetched: 16
---

# Interface text, labels and word lists

Scope: word-level rules for labels, buttons, links, toggles, settings, alt text and short strings in runtime UI and CLI text, and how precise a deny-list check can be. Out of scope: whether a control has an accessible name (UX-A11Y), error-message structure and string construction (sibling workers in ux-interface-text).

Scout rows named in the commission (CD2, CD4, CD8, CD10, CD19, CD26, CD29, CD38, CD40, CG32, CS37, PI23, PR45) carry no row text under those IDs in `ux-topic-map/*.md` (checked with `grep -n "CD2\b\|CD8\b\|PR45" ux-topic-map/*.md`, no match). I worked from the M090-M099 rows in `ux-topic-map.md:206-215` and the commission text, then went to primary sources.

## Table of contents

1. Summary
2. Findings (1 label grammar, 2 case, 3 words, 4 links, 5 emoji and exclamation, 6 alt text, 7 drift, 8 typography collision, 9 measurements)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Button and action labels are an imperative verb plus a noun, sentence case, no end punctuation (Primer, GOV.UK). One surface is the exception: VS Code command labels, buttons and menu items use Title Case.
- The VS Code Title Case rule has a primary source, the VS Code contributor wiki, not the extension API docs. The API docs say nothing on case.
- Never use "click" for an action on a UI element, and never use "here" or "click here" as link or button text. Three independent authorities agree (GOV.UK, Primer, Google).
- A bare "Learn more" or "Read more" link label is a defect. NN/g and WCAG 2.4.4 both say the label must make sense with at most its own sentence or paragraph as context.
- "please" is contested. GOV.UK says drop it, Microsoft allows it for an inconvenient request or when the product is at fault. The fleet has 0 hits, so a ban costs nothing and a SHOULD is enough.
- Exclamation marks: Primer says avoid in most cases and none in labels, headings and buttons; Microsoft says sparingly. Emoji: Primer says none in UI content, VS Code says none in command names. Fleet has 0 of each in 2,431 strings measured.
- Alt text follows the W3C decision tree: decorative gets `alt=""`, informative gets a short description, functional gets the action or destination, complex gets its content elsewhere on the page.
- The fleet has about 15 authored images (not 50): sampling is moot, so I classified the census. 2 READMEs ship an `<img>` with no `alt` attribute at all.
- A deny-list survives precision only as anchored, structural patterns. Measured: raw `\bhere\b` is 0 of 13 true, `\bclick\b` is 2 of 3, bare `invalid` is 6 of 10. The terms `please`, `oops`, `click here`, `learn more`, `sorry`, `successfully`, `something went wrong` and emoji had 0 hits in every corpus including the grim CLI, so precision is undefined and the cost of the rule is zero. In the grim CLI, `invalid` is 84 hits with 9 stating no expectation, and `e.g.` is 7 hits, all user-visible.
- Docs-to-UI drift is real in the fleet: `package.json:338` tells the user to run "Grimoire: Check for Artifact Updates", but the command is titled "Check for Updates".
- DOC-PLAIN-01 (no dashes, semicolons, curly quotes) is scoped to documentation prose. Applied to CLI strings it would flag 146 semicolon strings and 35 em-dash strings in `ocx`. Scope it out and give UI strings their own typography rule.
- A VS Code settings description of 708 characters (`grimoire.checkArtifactUpdates`) breaks the VS Code "Don't create long descriptions" rule. The other six are 83-223 characters.

## Findings

### 1. Label grammar

**Primer (GitHub), content foundations**, fetched 2026-11-27, undated page. "All labels and button text should be in sentence case, and not include punctuation." "Action labels should start with an imperative verb that clearly indicates what to expect." "Action labels can be shortened to only include an adjective and a noun." "Use 'sign in' rather than 'log in'." Source: [Primer content](https://primer.style/product/getting-started/foundations/content/). Authority: the platform owner's own design system. The deeper content and voice pages are staff-only, so only this page is verifiable.

**GOV.UK button component** (page shows releases up to v6.4.0, Jul 2026): "Write button text in sentence case, describing the action it performs." Examples: "Start now", "Sign in", "Continue", "Pay", "Sign out". "Save and continue" when the service saves; "Continue" when it does not. No length limit is stated. Disabled buttons: avoid; "Only use disabled buttons if research shows it makes the user interface easier to understand." Since v6.0.0 (Feb 2026) buttons default to `<button>`, and become `<a>` if `href` is set. Source: [GOV.UK button](https://design-system.service.gov.uk/components/button/). Authority: the UK government design system.

Consequence for an agent: a label states the action and its object ("Install skill", "Pin version"), not a state ("Installed") or an affirmation ("OK", "Yes", "Submit"). Verb plus object is Primer's shape. GOV.UK confirms the case and action framing but does not state "object required".

**Length.** No primary source fetched states a character limit for buttons. GOV.UK states none; VS Code settings states only "Don't create long descriptions" (no number). M091 asks for a budget; no sourced number exists, so none is proposed. The checkable form is relative: a label fits its container without truncation at 320 px width, an NN/g-style test the agent can run in a browser (not a numeric rule).

### 2. Case per surface

| Surface | Case | Source |
|---|---|---|
| Web UI labels, buttons, form fields, headings | Sentence case, no end punctuation | [Primer](https://primer.style/product/getting-started/foundations/content/) "Use sentence case for form titles, labels, and fields"; [GOV.UK](https://design-system.service.gov.uk/components/button/) |
| VS Code command labels, buttons, menu items | Title Case; prepositions of four or fewer letters stay lowercase unless first or last word | [VS Code Coding Guidelines wiki](https://github.com/microsoft/vscode/wiki/Coding-Guidelines): "Use title case (each major word is capitalized) for command labels, buttons, and menu items" |
| VS Code view titles and headings | Sentence case, no trailing period | same wiki page |
| Docs headings | Sentence case | GOV.UK A to Z: "Always use sentence case, even in page titles and service names" ([A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/)); catalog DOC-PLAIN-14 (unverified) |

The VS Code extension API pages for command palette, settings and notifications say nothing on capitalization (fetched 2026-11-27: [command palette](https://code.visualstudio.com/api/ux-guidelines/command-palette), [settings](https://code.visualstudio.com/api/ux-guidelines/settings), [contribution points](https://code.visualstudio.com/api/references/contribution-points), the last read to character 100,000 of 104,453). The Title Case rule is VS Code's contributor rule for its own UI; extensions follow it by convention. The Microsoft devblog post found by search says commands should lead with the extension name; that page was not fetched, so I do not rely on it. The palette shows `{category}: {title}`; the extension here sets `category` to `Grimoire` on all 22 commands.

Measured, extension `package.json`: 22 of 22 command titles are Title Case, and "Check for Updates" lowercases "for" per the preposition rule. Command: `python3 -c "import json;[print(c['title']) for c in json.load(open('package.json'))['contributes']['commands']]"` in `/home/mherwig/dev/grimoire-rs/vscode`. The theme's visible strings ("Search dependencies…", "Filter rows…", "Loading dependency data…") are sentence case, matching Primer.

Settings toggles: VS Code renders a boolean setting's `description` as the checkbox label ([contribution points](https://code.visualstudio.com/api/references/contribution-points)). The fleet's booleans are written as imperative clauses ("Refresh views when grimoire.toml / grimoire.lock change", "Once a day, check GitHub for a newer grim CLI release"). That reads correctly as a checkbox label only if it is a clause the checkbox "turns on". Category `title` must not contain "Extension", "Configuration" or "Settings" (same page).

### 3. Words an agent must not ship

| Term | What sources say | Measured in fleet (2,431 raw strings in the extension, theme, `ocx` and hooks, plus 2,079 grim CLI strings) |
|---|---|---|
| "click" as a verb | [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/): "Don't use 'click' when talking about user interfaces because not all users click. Use 'select'." [Google, UI elements](https://developers.google.com/style/ui-elements): "it's often best to use select and clear" for checkboxes. | 3 hits, 2 true in extension and `ocx` (see section 9); grim CLI 0 |
| "click here", "here" as link text | [Primer content](https://primer.style/product/getting-started/foundations/content/): "Never say 'here' or 'click here'." and "Do not use 'here' or 'click here' in calls to action." | 0 hits (grim CLI 0) |
| "please" | [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/): "There's usually no need to say 'please' or 'please note'." [Microsoft, please](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please) (ms.date 2018-01-19): avoid "except in situations where the customer is asked to do something inconvenient or the application or site is to blame". | 0 hits (grim CLI 0) |
| Exclamation mark | [Primer content](https://primer.style/product/getting-started/foundations/content/): "In most cases, exclamation marks are not appropriate" and "Headings, labels and buttons should not include punctuation." [Microsoft, exclamation points](https://learn.microsoft.com/en-us/style-guide/punctuation/exclamation-points) (ms.date 2018-01-19): "Use exclamation points sparingly. Save them for when they count." | 0 hits (grim CLI 0) |
| "easy", "quick", "just" | [Primer content](https://primer.style/product/getting-started/foundations/content/): "Do not say that something is 'easy', 'quick', or that the user 'just' needs to do something." | 6 raw hits in `ocx`, none are UI claims ("just now", "just written", internal); grim CLI 0 |
| Apology, humour in errors | [Primer content](https://primer.style/product/getting-started/foundations/content/): "In most cases, apologizing won't fix the problem." and "Do not try to be funny or humorous." (error messages section); "Humor isn't welcome in all situations, for example: in errors, when waiting, or when something fails." (voice and tone). | 0 "sorry", "oops", "whoops" (grim CLI 0) |
| "e.g.", "i.e.", "etc." | [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/): "'eg' can sometimes be read aloud as 'egg' by screen reading software." and "'etc' can usually be avoided." | 1 true in extension (`package.json:347`), 2 in `ocx` (`error.rs:473`, `:510`), 7 in grim CLI (section 9) |
| "&" for "and" | [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/): "Use 'and' rather than '&', unless it's a department's logo image or a company's name as it appears on the Companies House register." | 0 in extension and `ocx`; 1 in grim CLI (`tui/render.rs:1428` "Filter & sort") |
| Block capitals for text | [GOV.UK A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/): "DO NOT USE BLOCK CAPITALS FOR LARGE AMOUNTS OF TEXT AS IT'S QUITE HARD TO READ." (entry "Capitalisation"). | not measured |
| "invalid" with no expectation | No primary source bans the word. [Primer content](https://primer.style/product/getting-started/foundations/content/) says only "Be specific." (error messages). Measured below. | 21 hits, 10 without a stated expectation (`ocx`); grim CLI 84 hits, 9 with no expectation |

The Google page ([Google style, UI elements](https://developers.google.com/style/ui-elements)) confirms: "When referring to any UI element by name, put its name in bold", and "If a UI element name ends with an ellipsis (...), leave out the ellipsis" ([Google style, UI elements](https://developers.google.com/style/ui-elements)).

### 4. Links

NN/g (Katie Sherwin, 2015-12-13, independent research body): standalone "Learn More" links "create uncertainty, because users don't know what to expect"; identical labels pointing to different destinations confuse; screen-reader users hear lists of links out of context. Fix in order of preference: keywords that describe the destination, front-loaded; keep "Learn more" but append what the user learns ("Learn more about our services"); or make the preceding heading the link. Source: [NN/g](https://www.nngroup.com/articles/learn-more-links/). The article is eleven years old; its claims are consistent with WCAG 2.4.4 below, so I treat it as current.

WCAG 2.2 SC 2.4.4 Link Purpose (In Context), Level A, page "Updated 04 October 2026": purpose may come from link text plus programmatically determined context (same sentence, paragraph, list item, table cell, or ARIA-associated text). "Whenever possible, provide link text that identifies the purpose of the link without needing additional context." Source: [W3C Understanding 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html). Authority: the standard.

GOV.UK: "Front-load your link text with the relevant terms and make them active and specific" ([A to Z](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/)).

Consequence: "Read more" next to a heading can pass 2.4.4 through context but fails NN/g's standalone test. The agent rule is stricter than the standard: label every link so it passes out of context. The catalog's DOC-PLAIN-15 is about link syntax only (inline, never reference-style), so it does not collide: it constrains where the target sits, this rule constrains the visible words. No catalog rule governs link label wording today (`grep -rn -i "click here\|link text" skills/docs-quality-reference/*.md` returned nothing relevant).

### 5. Emoji and exclamation marks

VS Code UX guidelines, command palette (fetched 2026-11-27, undated): Don't "Use emojis in command names." ([source](https://code.visualstudio.com/api/ux-guidelines/command-palette)). [Primer content](https://primer.style/product/getting-started/foundations/content/): "Do not use emoji in UI content, or to replace words" and "Avoid using emojis, but when you do:" (the page then lists conditions for use outside UI content). On humour, the same page says "Humor isn't welcome in all situations, for example: in errors, when waiting, or when something fails." and, in the error-message section, "Do not try to be funny or humorous." On exclamation marks it says "In most cases, exclamation marks are not appropriate" and "Do not use exclamation marks to indicate excitement, most actions aren't." ([Microsoft](https://learn.microsoft.com/en-us/style-guide/punctuation/exclamation-points), ms.date 2018-01-19, is milder: "Use exclamation points sparingly. Save them for when they count.") There is no fetched source that bans emoji everywhere, so the safe rule is "none in UI strings, labels, command titles and error text". Codicons in `package.json` `icon` fields (`$(refresh)` and similar) are icons, not emoji, and are permitted.

Measured: 0 emoji and 0 `!` in 337 extension, 256 theme, 1,728 `ocx`, 110 grimoire-hook and 2,079 grim CLI strings. The rule is a guard for new text, not a cleanup. Agents add emoji and exclamation marks to success toasts, so this is where the rule earns its line.

### 6. Alt text

W3C alt decision tree (page "Updated 13 May 2024"): decorative or not intended for users: empty `alt`. Informative: "a brief description of the image in a way that conveys that meaning"; empty if the image repeats adjacent text. Functional (link or button): "communicate the destination of the link or action taken." Text in the image: if repeated as real text nearby, empty; otherwise include the text. Complex: "Include the information contained in the image elsewhere on the page." Groups: not covered. Source: [W3C alt decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/). The `decorative` case is the one an agent gets wrong most, so the rule below says to omit the attribute never.

**Census.** The commission asked for a 50-image sample. The authored population is smaller: `ocx` and Grimoire docs trees ship no committed raster or SVG image in their docs content, and the built `dist` directories contain 0 `<img` tags. Command (run in `/home/mherwig/dev`): `for r in ocx-sh/ocx ocx-sh/website ocx-sh/catalog grimoire-rs/grimoire grimoire-rs/vscode grimoire-rs/indexer; do git -C $r grep -nIE '!\[[^]]*\]\([^)]*\.(png|svg|jpe?g|gif|webp)|<img |<Image |<picture' -- '*.md' '*.mdx' '*.astro' '*.html' ':!*SKILL.md' ':!*CHANGELOG*' ':!*/.claude/*' ':!*/.agents/*' ':!*test*'; done`. After removing code comments and fixtures that merely mention `<img>`, 15 real image elements remain:

| Class | Count | Instances |
|---|---|---|
| Missing (`<img>` with no `alt` attribute) | 2 | `ocx/README.md:3` (logo.svg), `grimoire/README.md:3` (logo.png) |
| Empty, decorative, correct | 7 | `theme/.../Avatar.astro:44`, `LogoTile.astro`, `SiteHeader.astro:72` (falls back to `''` when `brand.logoAlt` unset), `vscode/src/webview/render.ts` card logo x3 (name printed beside it), `indexer` `PackageDetail.astro:319` and `SiteHeader.astro:46` |
| Redundant (contains the word "logo" or repeats adjacent text) | 5 | `vscode/README.md:2` "Grimoire logo", `website/examples/.../*.mdx` x4 "The ocx logo" |
| Informative, good | 1 | `www-setup/README.md:3` `alt="OCX"` (a brand logo functioning as the page heading: name only is correct) |

I am not certain the 5 "redundant" are defects: "logo" in alt text is a mild screen-reader redundancy (the role "image" is announced), not a WCAG failure. I classify them redundant and leave the call to the rule below at SHOULD. The theme's `SiteHeader` empty fallback is the risk: a header logo that is the only link text needs a name (UX-A11Y owns that case).

The extension's webview rewrites remote README images (`model.ts:2843`) and copies `alt` into `aria-label` on a broken image (`brokenImage.ts:36-38`): alt text is carried correctly through the placeholder.

### 7. Docs-to-UI drift check

The extension is the only fleet UI whose labels are quoted in docs. Measured in `/home/mherwig/dev/grimoire-rs/vscode`:

- README quotes 11 commands as `Grimoire: <title>`; all 11 match a `package.json` title exactly (python script: build `Grimoire: {title}` for each `contributes.commands[].title`, search `README.md`, `docs/*.md`, `CONTRIBUTING.md`).
- One drift: `package.json:338` (`grimoire.checkArtifactUpdates` description) says "The **Grimoire: Check for Artifact Updates** command always runs the check". No command has that title. The command `grimoire.checkArtifactUpdates` is titled "Check for Updates" (`package.json:89`), and "Check for Updates" is also the title the README uses. Another command, `grimoire.checkForUpdates`, is a setting, not a command, so two different things are called "update check" with near-identical names.
- `**Pin Version**` (`package.json:319`) is not a command title; it exists in `src/` (the webview), so it is a valid reference to a webview button, but no check connects it.
- 11 of 22 command titles (the view-toolbar toggles such as "Compact Rows", "Tree View") never appear in any doc. That is fine (toolbar actions, not documented flows) but means "every title is documented" is not a usable rule.
- The README table row for `grimoire.checkArtifactUpdates` (`README.md:182`) paraphrases the `package.json` description rather than reusing it, a second copy that can drift.

Checkable form: extract every `**Bold**` and `Grimoire: X` token from `package.json` `description` and `markdownDescription` fields and from README/docs; assert each equals a command `title`, a setting key, or a string literal in `src/`. The drift above is found by that check in one pass.

### 8. Typography in UI strings versus DOC-PLAIN-01

DOC-PLAIN-01 (`skills/docs-quality-reference/plain-english.md:47`): "Write documentation prose without em dashes, en dashes, semicolons or curly quotes." Rationale: machine translation and terminal rendering corrupt a copied command. It is pinned house style (`plain-english.md:159`). Its verification is a doc-prose scan (`strip_prose.py` plus `prose_marks.awk`), so it never runs over source strings. DOC-PLAIN-15 is link syntax and does not collide.

Measured over non-test UI strings: extension 10 em/en dashes (`package.json:4`, `:319`; `extension.ts:425`, `:459`, `:796`; `grim.ts:1105`, `:1108`; `installer.ts:93`; `scopes.ts:669`, `:789`); theme 3 (`Copied — <label>`) plus 1 curly quote (`CommandPalette.astro:54`, "No results for “{query}”"); `ocx` 35 em dashes in 1,580 strings and 146 strings holding a `; ` clause break. Command: `python3 extract.py` (my literal extractor, scratch only) then `re.search('[–—]', s)`; equivalent shell: `git grep -nP '"[^"]*[\x{2013}\x{2014}][^"]*"' -- 'crates/**/src/*.rs'` per repo. `ocx` CLI strings use `—` as a separator before the next step ("{text} — run `{command}`", `user_interface.rs:87`).

Resolution to decide: DOC-PLAIN-01 is scoped to documentation prose and stays so. Applying it to runtime strings would raise about 181 findings in `ocx` alone for a rationale (machine translation of docs) that does not apply to an English-only CLI. The terminal-rendering half of the rationale does apply to CLI strings (a non-UTF-8 console shows mojibake), so for CLI stderr the proposed string rule is ASCII punctuation only, and for GUI surfaces a looser rule. The existing fleet violates the CLI half 35 times, so it must land as a ratchet (changed lines only), the same pattern DOC-PLAIN-01 uses.

The Unicode ellipsis `…` versus `...`: the extension uses `…` in package.json titles (2) and in-progress notices (`installer.ts:300`, `:308`) and one ASCII `...` (`scopes.ts:911`, a diagnostic); `ocx` uses neither. No fetched source states a VS Code rule for `…` on commands that open an input. Google's rule only says to omit a trailing ellipsis when naming a menu item in prose. I do not propose a rule on `…` versus `...` beyond consistency per surface.

### 9. Deny-list precision measurements

Corpus: string literals of two or more words in non-test source. Extractor is a scratch script (`extract.py`, regex over `git ls-files`): extension `src/*.ts` plus `package.json` (337 strings); theme `packages/theme/src/**/*.astro|ts` text nodes plus `alt`, `title`, `aria-label`, `placeholder` (256); `ocx` `crates/ocx_{cli,console,package_manager,project,config}/src/**/*.rs` before `#[cfg(test)]` (1,728; 1,580 after dropping files named `*_tests.rs`, which the first filter missed); grimoire-rs crates (110). The grim CLI source is the root package of `/home/mherwig/dev/grimoire-rs/grimoire` (`src/`, binary `grim`, version 0.17.0, last commit 72d3fce1 on 2026-11-24), not `crates/`; the first pass looked only under `crates/` and so covered hook strings only. This repair pass measured `src/` directly: 306 non-test `.rs` files (excluding `*_test(s).rs`, `tests/` directories and everything after `#[cfg(test)]`), 2,079 literals of two or more words. Command: `python3 -I ext.py` (a scratch extractor kept outside the repository: it lists files with `git -C <repo> ls-files src`, matches string literals per line and skips comment lines), then counts each term. The extractor also takes log and panic strings, so "true positive" means a user-visible violation and "false positive" means test, comment, internal or correct usage. Term counts come from `re.search(term, s, re.I)`.

| Term (pattern) | Hits | True | False | Precision | Note |
|---|---|---|---|---|---|
| `please` | 0 | 0 | 0 | undefined | zero cost to ban |
| `\boops\b`, `whoops`, `uh-oh`, `yikes` | 0 | 0 | 0 | undefined | |
| `click here` | 0 | 0 | 0 | undefined | |
| `learn more`, `read more` (as lone label) | 0 | 0 | 0 | undefined | |
| `sorry`, `apolog*` | 0 | 0 | 0 | undefined | |
| `something went wrong`, `an error occurred` | 0 | 0 | 0 | undefined | |
| `successfully` | 0 | 0 | 0 | undefined | |
| emoji (U+1F300-1FAFF, U+2600-27BF) | 0 | 0 | 0 | undefined | |
| `\w!(\s\|$)` exclamation | 0 | 0 | 0 | undefined | |
| `^(OK\|Ok)$` lone label | 0 | 0 | 0 | undefined | |
| `\bclick(s\|ing)?\b` | 3 | 2 | 1 | 67% | true: `notify.ts:39` "Click to show Grimoire output", theme `CycleButton.astro:60` "(click for ...)"; false: "one-click update" (`package.json:334`) is a noun phrase, arguable |
| `\bhere\b` | 13 | 0 | 13 | 0% | all spatial ("run `ocx lock` here", "nothing is installed here") or code comments. Do not ban the bare word |
| `here` as link or button label (`^here$`, `>here<`, `\[here\]`) | 0 | 0 | 0 | undefined | the precise form of the rule |
| `\binvalid\b` | 22 (21 `ocx`, 1 theme) | 8 | 14 | 36% | raw word is a poor deny term |
| `invalid` with no `expected\|must\|allowed\|one of\|{\|: ` in the same string | 10 | 6 | 4 | 60% | true: `managed.rs:128`, `mirror.rs:126`, `patch.rs:75`, `error.rs:493`, `error.rs:11`, `error.rs:327`; false: `compose_tests.rs:913` (test), `hash.rs:44` (panic message), `types.rs:482` and `:490` (reason fragments appended by a caller, unverified). Strict 6 of 10, 8 of 10 if the fragments count |
| `failed to` | 54 (`ocx`) | not judged | | | Rust error-message convention ("failed to read the current directory"), usually followed by a cause chain. Not a deny term. Adjacent: the Rust API Guidelines lowercase convention, outside this worker |
| `[–—]` dash | 48 non-test (10 ext, 3 theme, 35 `ocx`) | rule-dependent | | | see section 8 |
| `; ` clause break | 154 non-test (3 ext, 5 theme, 146 `ocx`) | rule-dependent | | | see section 8 |
| `e.g.`, `i.e.`, `etc.` | 3 | 3 | 0 | 100% | user-visible: `package.json:347`, `error.rs:473`, `:510` |
| **grim CLI** (`grimoire-rs/grimoire/src`, 2,079 strings), zero-hit terms: `please`, `oops` family, `click here`, `learn more`/`read more`, `sorry`/`apolog*`, `something went wrong`/`an error occurred`, `successfully`, emoji, `\w!(\s\|$)`, lone `OK`, `\bclick`, `easy`/`quick`/`just` | 0 | 0 | 0 | undefined | the generic tells are absent from the grim CLI too |
| grim CLI `\bhere\b` | 8 | 0 | 8 | 0% | 5 spatial and user-visible ("has no settings file here", `settings_phase.rs:1020`; "Declared here:", `hook/trust.rs:563`; `tui/render.rs:2187`, `:2191`), 3 internal panic or test-seam text (`catalog_service.rs:304`, `resolve/graph.rs:563`, `resolve/members.rs:128`). Same verdict as `ocx`: do not ban the bare word |
| grim CLI `\binvalid\b` | 84 | not judged individually | | | raw word again a poor deny term; most carry a reason placeholder (`invalid value for {key}: {reason}`) or a list of valid values |
| grim CLI `invalid` with no `expected\|must\|allowed\|one of\|valid values\|{\|: ` in the string | 9 | 9 candidates | | not verified | static strings: `catalog_error.rs:62` "invalid catalog file", `config_error.rs:63` and `lock_error.rs:98` "invalid TOML", `oci/identifier/error.rs:45` "invalid digest format" and `:48` "invalid format", `resolve_error.rs:409` "invalid bundle" and `:526` "local source invalid", `skill_error.rs:74` "invalid YAML frontmatter" and `:84` "invalid tool metadata". Whether each is the whole message or a prefix that a wrapper extends with a cause was not traced, so true-positive precision is not stated; read each |
| grim CLI `e.g.`, `i.e.`, `etc.` | 7 | 7 | 0 | 100% | all inside user-visible error or help text: `command/publish.rs:1005`, `config/config_error.rs:76`, `config/plugin_meta.rs:449`, `export/export_error.rs:43`, `export/marketplace.rs:426`, `oci/digest.rs:248`, `oci/identifier/error.rs:51` |
| grim CLI ` & ` | 1 | 1 | 0 | 100% | `tui/render.rs:1428` "Filter & sort" |
| grim CLI `[–—]` | 52 non-test | rule-dependent | | | mostly in `catalog/forge.rs` error text (`set \`[announce] owner_id\``) and panic or comment-like strings; see section 8 |
| grim CLI `; ` | 385 non-test | rule-dependent | | | includes many internal and panic strings; not judged |

Reading: of the 14 deny candidates, 10 have zero hits, so the fleet's text is already clean on the generic tells; the high-value check is on the strings an agent adds, not on a legacy sweep. Terms that survive a 90% bar are the ones that are structural (anchored to a lone label, link label, or end of string) or zero-hit, plus `e.g./i.e./etc.` (3 of 3 in the first corpora, 7 of 7 more in the grim CLI). Terms that fail are bare `here` (0%), raw `invalid` (36%), `failed to` (not a defect). `click` (67%) sits in between and is a SHOULD with a human look at each hit.

Why precision is capped here: the corpus holds internal log and panic text next to user text, which no regex separates. A real check should run only over the string positions that reach a user (a `Display` impl, a notification call, a `title` or `aria-label` attribute), which needs per-language extraction the fleet has not built. This is the "Not studied" limit.

## Normative guidance candidates

Severity MUST, SHOULD, CONSIDER. IDs are placeholders (UXT-LBL-nn).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UXT-LBL-01 | Write every button and action label as an imperative verb plus noun ("Install skill", "Pin version"). | Tells the user what happens before they commit ([Primer](https://primer.style/product/getting-started/foundations/content/), [GOV.UK button](https://design-system.service.gov.uk/components/button/)). | Reading heuristic: the label completes "I want to ...". Pass "Save changes"; fail "OK", "Yes", "Submit", "Done". Grep: `grep -nE '>(OK\|Ok\|Yes\|No\|Submit)<\|label: *"(OK\|Yes\|No\|Submit)"'` returns nothing. | SHOULD |
| UXT-LBL-02 | Use sentence case with no end punctuation for web UI labels, buttons, field names and headings. | Primer and GOV.UK both state it. | Reading heuristic: only the first word and proper nouns are capitalized. Pass "Filter rows"; fail "Filter Rows." | SHOULD |
| UXT-LBL-03 | In a VS Code extension, write `contributes.commands[].title` in Title Case, with prepositions of four or fewer letters lowercase unless first or last. | VS Code's contributor wiki states it for command labels, buttons and menu items ([source](https://github.com/microsoft/vscode/wiki/Coding-Guidelines)). View titles and headings stay sentence case, no period. | `python3 -c "import json;[print(c['title']) for c in json.load(open('package.json'))['contributes']['commands']]"` then check each word longer than 4 letters starts uppercase. Measured 22 of 22 pass. | SHOULD |
| UXT-LBL-04 | Never use "click" as the verb for a UI action. Write "select", "choose", "press" or "open". | Not every user clicks ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/)). | `grep -rniE '\bclick(s\|ing)?\b' <ui-string-paths>`; judge each hit. Measured precision 67%, so a human reads the hits. | SHOULD |
| UXT-LBL-05 | Never use "here" or "click here" as link or button text, and never use a bare "Learn more" or "Read more" as the only visible label. | Links must make sense out of context ([NN/g](https://www.nngroup.com/articles/learn-more-links/), [WCAG 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html), Primer). | `grep -nEi '>(here\|click here\|learn more\|read more\|more)</a>\|\[(here\|click here\|learn more\|read more)\]\(' <paths>` returns nothing. Measured 0 hits, 0 false positives. Pass "Read the install guide"; fail "Learn more". | MUST |
| UXT-LBL-06 | Do not use emoji in UI strings, command titles, labels or error text. Codicon and icon-font references are allowed. | VS Code: no emoji in command names. Primer: none in UI content. | `grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' <ui-string-paths>` returns nothing. Measured 0 hits. | MUST |
| UXT-LBL-07 | Do not end a label, button, heading, notification title or error message with an exclamation mark. | Primer: "Headings, labels and buttons should not include punctuation"; Microsoft: sparingly. | `grep -nE '!["'\'']?\s*[,;)\]]?\s*$' <ui-string-paths>` filtered to string literals returns nothing. Measured 0 hits. | MUST |
| UXT-LBL-08 | Do not write "please", "oops", "whoops", "sorry" or "easy", "quick", "just" in system text, except "please" before a request that is inconvenient or when the product is at fault. | GOV.UK drops "please"; Microsoft keeps it for those two cases; Primer bans humour in errors and the "easy" claim. | `grep -rniE '\b(please\|oops\|whoops\|uh-oh\|sorry\|apologi[sz]e)\b' <ui-string-paths>` returns nothing, or each hit is justified in the change. Measured 0 hits. | SHOULD |
| UXT-LBL-09 | Where the word "invalid" appears, state the expected form in the same string ("invalid mode 'x' (expected 'env', 'bin' or 'none')"). | A string that says only "invalid" gives no repair step ([Primer](https://primer.style/product/getting-started/foundations/content/): "Be specific"). | `grep -rnE '"[^"]*\binvalid\b[^"]*"' <paths> \| grep -vE 'expected\|must\|allowed\|one of\|\{\|: '`. Measured 10 hits, 6 true (60%): read each, do not auto-fail. | SHOULD |
| UXT-LBL-10 | Write "for example" or "such as", not "e.g.", "i.e." or "etc.", in user-visible text. | Screen readers read "eg" as "egg" ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/)). | `grep -rnE '\b(e\.g\.\|i\.e\.\|etc\.)' <ui-string-paths>` returns nothing. Measured 3 hits, 3 true in the extension and `ocx`; 7 more, all user-visible, in the grim CLI (`src/`). | CONSIDER |
| UXT-LBL-11 | Use "and", not "&", in labels and prose. | GOV.UK. | `grep -rnE '" [^"]*[a-z] & [a-z]' <paths>`. Measured 0 hits. | CONSIDER |
| UXT-LBL-12 | Give every `<img>` an `alt` attribute: `alt=""` if decorative or if it repeats adjacent text, a short description of the meaning if informative, the destination or action if inside a link or button. Never omit the attribute. Put complex image content in the page text. | W3C decision tree (updated 2024-05-13). An `<img>` with no `alt` makes some screen readers read the file name. | `grep -rnE '<img\b' <paths> \| grep -v 'alt='` returns nothing (multi-line tags: `python3` with `re.S`, as measured). Measured 2 `<img>` with no `alt`: `ocx/README.md:3`, `grimoire/README.md:3`. For markdown, `grep -rnE '!\[\]\('` finds empty alt and each needs a decorative judgement. | MUST |
| UXT-LBL-13 | Do not start alt text with "image of", "picture of", "graphic of" or end it with "logo" when the image is a brand mark that is the link or heading text; use the brand name. | The role is announced already ([W3C tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)). | `grep -rniE 'alt="(image\|picture\|graphic\|photo) of\|alt="[^"]* logo"'`. Measured 5 "logo" instances (4 stories, 1 README). | CONSIDER |
| UXT-LBL-14 | Every `**Bold**` or `Grimoire: X` UI label quoted in a manifest description, README or docs must equal a real command title, setting name or a string in the UI source. | A stale label sends the reader to a control that does not exist (found: `package.json:338`). | Script: collect quoted tokens from `package.json` `description` and `markdownDescription` fields, README and docs; assert each is in the set {command titles, setting keys, string literals under `src/`}. Measured 1 failing token of 12 in the extension. | MUST |
| UXT-LBL-15 | Keep a VS Code setting description to one or two sentences, 200 characters or fewer, and link to documentation for the long form. | VS Code: "Don't create long descriptions", "Link to documentation for complicated settings" ([source](https://code.visualstudio.com/api/ux-guidelines/settings)). The 200 figure is mine, calibrated to the fleet (6 of 7 descriptions are 83-223 characters), not a platform limit. | `python3 -c "import json;[print(len(v.get('description') or v.get('markdownDescription')),k) for k,v in json.load(open('package.json'))['contributes']['configuration']['properties'].items()]"`. Measured one outlier at 708 (`grimoire.checkArtifactUpdates`). | SHOULD |
| UXT-LBL-16 | Do not apply DOC-PLAIN-01 to runtime strings. For CLI stderr and stdout text use ASCII punctuation only (hyphen or colon, never an em dash). GUI strings may use `…` and typographic quotes, and avoid em dashes and semicolons because a label is one clause. | DOC-PLAIN-01's rationale is machine translation and terminal rendering of docs; terminals also mangle UTF-8 on legacy Windows consoles. | `grep -rnP '[\x{2013}\x{2014}]' crates/*/src` over string literals, changed lines only. Measured 35 `ocx` strings today, so this is a ratchet, not a gate. | CONSIDER |

## Dated facts

| Fact | Source | Source date | Type |
|---|---|---|---|
| GOV.UK button labels use sentence case; start buttons use a link tag; buttons default to `<button>` since v6.0.0 (Feb 2026); latest release listed v6.4.0 (Jul 2026) | [GOV.UK button](https://design-system.service.gov.uk/components/button/) | page lists releases to Jul 2026 | authority itself |
| Disabled button parameter added v4.6.0 (Apr 2023); `govuk-button--disabled` class removed v5.0.0 (Dec 2023) | same | same | authority itself |
| VS Code: Title Case for command labels, buttons and menu items; sentence case for view titles and headings | [VS Code Coding Guidelines](https://github.com/microsoft/vscode/wiki/Coding-Guidelines) | undated wiki page, fetched 2026-11-27 | platform itself |
| VS Code: no emoji in command names; clear names; group by category | [command palette](https://code.visualstudio.com/api/ux-guidelines/command-palette) | undated, fetched 2026-11-27 | platform itself |
| VS Code settings: defaults, clear descriptions, no long descriptions (no numeric limit stated) | [settings](https://code.visualstudio.com/api/ux-guidelines/settings) | undated | platform itself |
| VS Code boolean setting description renders as the checkbox label; `markdownDescription` parses Markdown | [contribution points](https://code.visualstudio.com/api/references/contribution-points) | undated, read to char 100,000 of 104,453 | platform itself |
| VS Code notifications: "Add a Do not show again option for every notification" | [notifications](https://code.visualstudio.com/api/ux-guidelines/notifications) | undated | platform itself |
| NN/g standalone "Learn More" links create uncertainty | [NN/g](https://www.nngroup.com/articles/learn-more-links/) | 2015-12-13 | independent research body |
| WCAG 2.4.4 Link Purpose (In Context) is Level A | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html) | updated 2026-10-04 | standard itself |
| Alt decision tree: decorative `alt=""`, functional states the action | [W3C](https://www.w3.org/WAI/tutorials/images/decision-tree/) | updated 2024-05-13 | standard itself |
| Primer content rules (sentence case, imperative labels, no "here", no emoji in UI content, 7th-grade reading level) | [Primer](https://primer.style/product/getting-started/foundations/content/) | undated | platform owner design system |
| Microsoft: exclamation points sparingly; page `ms.date` 2018-01-19, `updated_at` 2026-10-15 | [Microsoft](https://learn.microsoft.com/en-us/style-guide/punctuation/exclamation-points) | 2018-01-19, touched 2026-10-15 | vendor style guide |
| Microsoft: avoid "please" unless inconvenient request or product at fault; same dates | [Microsoft](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please) | 2018-01-19, touched 2026-10-15 | vendor style guide |
| Google: bold UI element names, "select" over "check", drop trailing ellipsis from a named menu item | [Google](https://developers.google.com/style/ui-elements) | undated | vendor style guide |
| GOV.UK A to Z: no "click", no "please", "and" not "&", sentence case, no "eg" | [GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/) | undated, fetched 2026-11-27 | authority itself |
| Fleet repos last commit: extension 2026-11-24, `ocx` 2026-11-26, website 2026-11-16 | `git log -1 --format=%cd --date=short` | | measurement |

## What an agent must not decide alone

- Brand voice: whether the product allows humour, exclamation or emoji anywhere (a marketing or community surface may differ from product UI). The rules above are a default for product UI strings only.
- Whether to rename a shipped command or setting title to fix drift. Renaming is a user-visible change that breaks keybinding and documentation references; fix the doc text first and ask before renaming a command.
- Legal and compliance wording (consent, disclosure, privacy, regulated claims) in any string.
- Whether an `<img>` is decorative or informative when the surrounding text does not say. Ask rather than guess.
- Pronoun policy for system text ("you" versus "I"/"my", and "we"). GOV.UK says address the user as "you"; the extension currently has `may I install here?` (`scopes.ts:597`), a first-person prompt. The sourced default is "you", but the voice choice is the owner's. Scout row M096 (CD40) is low cost to fix once decided.
- Localization: whether strings will be translated. It changes the "no concatenated fragments" and the punctuation advice.

## AI-agent angle

| Typical agent mistake | Why | Smallest check |
|---|---|---|
| Ends a success toast with "!" and adds a check or party emoji | Chat-style tone leaks into product strings | UXT-LBL-06/07 grep |
| Writes "Click here to learn more" or "Learn more" for every link | Most common web copy in training data | UXT-LBL-05 grep over `>learn more<` |
| Writes "Oops! Something went wrong. Please try again." | A stock error template | UXT-LBL-08 grep, plus `something went wrong` |
| Title-cases every web heading and button ("Install Skill"), or sentence-cases a VS Code command title | Does not know the per-surface split | UXT-LBL-02/03 reading heuristic |
| Writes `<img src=...>` with no `alt` (2 in the fleet READMEs) or invents alt like "image of logo" | Treats alt as optional or as a caption | UXT-LBL-12 grep, `re.S` for multi-line tags |
| Marks an informative image `alt=""` to pass a lint | The lint is satisfied, the meaning is lost | Reading heuristic: delete the image; is meaning lost? If yes, alt must carry it |
| Quotes a UI label from memory in docs ("click Check for Artifact Updates") | Paraphrases the title | UXT-LBL-14 drift script |
| Adds an em dash or semicolon to a CLI error, then a docs rule flags the doc copy | Prose habit | UXT-LBL-16 grep on changed lines |
| Writes "invalid input" with no repair step | Default validation message | UXT-LBL-09 grep |
| Uses "OK" and "Cancel" as the only dialog buttons | GUI default | UXT-LBL-01 grep for lone labels |

## Contested / evolving

- **"please".** GOV.UK: "There's usually no need to say 'please'" ([GOV.UK](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/)). Microsoft: allowed for an inconvenient request or when the product is to blame ([Microsoft](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please)). Primer is silent. Trend: unclear, both pages are 2018 text touched in 2026. The rule above takes the narrower common ground.
- **Exclamation marks.** Primer "avoid in most cases", Microsoft "sparingly, save them for when they count" (the two do not differ in kind, only in tolerance). A marketing surface may use them; product UI should not.
- **Title Case versus sentence case in a VS Code extension.** Primer and GOV.UK say sentence case; VS Code's own UI says Title Case for commands. These are different surfaces, so both stand. The tension appears only when an extension's webview (sentence case, Primer-like) sits beside its command palette (Title Case): the fleet extension mixes both and is internally consistent per surface.
- **Whether "Learn more" can be acceptable.** NN/g says replace or extend it. WCAG 2.4.4 accepts it when the surrounding paragraph gives purpose. Both are cited; the rule picks the stricter reading because an agent cannot verify the surrounding context.
- **Alt text and "logo".** W3C says convey meaning; whether a brand mark needs the word "logo" is a style call with no sourced ruling. Treated as CONSIDER.
- **Emoji.** Primer allows narrow use outside UI content; VS Code bans it in command names. No source blesses it in UI strings, so the rule bans it there.
- **Em dashes as an AI tell.** DOC-PLAIN-01 is explicitly not an AI detector (`plain-english.md:159`); the rule here stays inside that framing.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://design-system.service.gov.uk/components/button/ | GOV.UK button component (primary) | releases to Jul 2026 | Case, verbs, disabled buttons, version history |
| https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/ | GOV.UK A to Z style guide (primary) | undated, fetched 2026-11-27 | please, click, ampersand, eg, sentence case, link text; confirms exclamation, emoji, ellipsis, "learn more" are not covered |
| https://primer.style/product/getting-started/foundations/content/ | Primer content foundations (primary) | undated | The most complete UI-string rule set found |
| https://primer.style/product/ui-patterns/ | Primer UI patterns index | undated | Confirms no separate label or microcopy page is public |
| https://www.nngroup.com/articles/learn-more-links/ | NN/g, K. Sherwin (independent) | 2015-12-13 | Standalone "Learn More" |
| https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html | WCAG 2.2 Understanding 2.4.4 (primary) | updated 2026-10-04 | Link purpose, context definition |
| https://www.w3.org/WAI/tutorials/images/decision-tree/ | W3C alt decision tree (primary) | updated 2024-05-13 | Decorative, informative, functional, complex |
| https://github.com/microsoft/vscode/wiki/Coding-Guidelines | VS Code contributor guidelines (primary) | undated | Title Case and sentence case split; quote and localization rules |
| https://code.visualstudio.com/api/ux-guidelines/command-palette | VS Code UX guidelines, command palette (primary) | undated | No emoji, clear names, category |
| https://code.visualstudio.com/api/ux-guidelines/settings | VS Code UX guidelines, settings (primary) | undated | Clear, short descriptions |
| https://code.visualstudio.com/api/ux-guidelines/notifications | VS Code UX guidelines, notifications (primary) | undated | Do not show again, actions |
| https://code.visualstudio.com/api/references/contribution-points | VS Code contribution points reference (primary) | undated | Boolean description as checkbox label, config title rules |
| https://code.visualstudio.com/api/references/extension-guidelines | VS Code UX overview (primary) | undated | Landing page for the three above; no label rules itself |
| https://learn.microsoft.com/en-us/style-guide/punctuation/exclamation-points | Microsoft Writing Style Guide (vendor style guide) | 2018-01-19, touched 2026-10-15 | Exclamation points |
| https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please | Microsoft Writing Style Guide (vendor) | 2018-01-19, touched 2026-10-15 | The counter-position on "please" |
| https://developers.google.com/style/ui-elements | Google developer documentation style guide (vendor) | undated | Bold UI names, select versus click, ellipsis in menu names |
| `skills/docs-quality-reference/plain-english.md` (catalog) | DOC-PLAIN-01 and DOC-PLAIN-15 text | worktree, 2026-11-27 | The collision to resolve |
| `.agents/research/product-audit/ui-code-posture.md` (catalog) | Fleet UI audit | 2026-11-27 | Corpus sizes, image counts |

Other findings (one line each, not in scope): empty or missing control names and the "visible label starts the aria-label" check (WCAG 2.5.3, M100) belong to UX-A11Y and `strings-that-survive`; the `grim-gui` error strings pass `err.message` through verbatim (`src/main.ts:16`) and are an error-text worker concern; marketing README logo alt on the `ocx` and Grimoire READMEs touches the marketing sub-program only through the README, and the fix is the same `alt` attribute.

Not fetched: the Microsoft devblog post on extension command naming (search result only), the Primer voice-and-tone pages (staff-only), and Material Design or Apple HIG label guidance. The central question was sourced from primary pages, so nothing here is blocked.

---
title: Strings that survive - building runtime interface text so it stays correct alone, plural, formatted and translated
program: product
sub_program: ux
topic: ux-interface-text
worker: strings-that-survive
date_researched: 2026-11-27
model: sonnet
sources_fetched: 26
scope: |
  Covered: whole-string construction, plural rules, which formatter serves each value type in TypeScript and Rust, label-in-name (WCAG 2.5.3), self-sufficient status strings, and a static measurement of the fleet's runtime strings.
  Not covered: the localisation workflow (deferred), live-region mechanics (UX-A11Y / announcements-and-motion), prose docs (docs-quality). No live-region runs were made; every measurement is a static grep.
---

# Strings that survive

## Contents

1. Summary
2. Findings (1 whole strings, 2 plurals, 3 formatters TypeScript, 4 formatters Rust, 5 label in name, 6 status strings, 7 fleet measurements)
3. Normative guidance candidates
4. What an agent must not decide alone
5. Dated facts
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- A user-visible sentence is one string with named placeholders. Splicing a count, a noun and a suffix across several expressions fails translation and fails pluralisation ([W3C composite messages](https://www.w3.org/International/articles/composite-messages/), [Microsoft Learn, 2024-03-26](https://learn.microsoft.com/en-us/globalization/internationalization/concatenation)).
- `(s)` and `count === 1 ? 'x' : 'xs'` are English-only. CLDR defines six categories (zero, one, two, few, many, other); English uses two ([CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules)). Pick whole sentences by plural category, never by suffix.
- `Intl.PluralRules.select()` returns the category. Measured on Node v26.13.1: `select(1)` is `one`, `select(21)` in `ru` is `one`, `select(5)` in `pl` is `many`.
- Formatting changes the category. A value shown as `1.0` is `other` in English when `minimumFractionDigits: 1` is set (measured). Fluent states the same ([Fluent guide](https://projectfluent.org/fluent/guide/selectors.html)).
- TypeScript formatters: `Intl.NumberFormat` (numbers, compact, units), `Intl.DateTimeFormat` (absolute dates), `Intl.RelativeTimeFormat` (ago / in), `Intl.ListFormat` (and / or lists), `Intl.DurationFormat` (Baseline 2025, newly available), `Intl.PluralRules` (categories). All but `DurationFormat` are "Widely available" per MDN.
- Rust formatters: the `icu` meta-crate 2.4.0 (`icu_plurals`, `icu_list`, `icu_datetime`, `icu_decimal`) is the locale-aware choice. `bytesize` 2.7.0 and `humantime` 2.4.0 document no localisation; they suit English-only output only.
- `Intl.NumberFormat` has a `kilobyte` unit but it prints SI `kB` (measured: `1,536 kB`); it has no binary unit. A 1024-based size must be labelled `KiB`, not `KB`.
- WCAG 2.5.3 (Level A): the accessible name must contain the visible label text. Starting with it is a best practice, not the requirement ([Understanding 2.5.3, updated 2026-10-04](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)). Failure F96: `<button aria-label="Find in this site">Go</button>` ([F96, updated 2026-05-18](https://www.w3.org/WAI/WCAG22/Techniques/failures/F96)).
- A status message must make sense without the surrounding UI: WCAG 4.1.3 examples are "5 results returned" and "Your form was successfully submitted" ([Understanding 4.1.3, updated 2026-10-04](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)). Subject plus outcome, never "Done".
- MessageFormat 2 is a stable Unicode document (UTS 35 Part 9, CLDR 49, tr35-79, dated 2026-10-21) ([UTS 35 MF2](https://unicode.org/reports/tr35/tr35-messageFormat.html)). `Intl.MessageFormat` is still TC39 Stage 1 ([proposal](https://github.com/tc39/proposal-intl-messageformat)), so a TypeScript UI cannot rely on a native MF2 runtime today.
- Fleet, measured: the VS Code extension has 8 noun-swap ternaries plus 2 other hand plurals; the theme has 0. `ocx` has 18 `(s)` strings and 8 noun swaps; `grim` has 5 and 15 (non-test code). Neither CLI depends on a plural or message crate.
- Fleet positive: `ocx` routes sizes and relative time through one helper module (`crates/ocx_console/src/human.rs`), and its tests pin `just now` and `in 3 hours`.
- Fleet defect: `vscode/src/webview/render.ts:1865` prints `KB` for a `/ 1024` value, while the doc comment says KiB.
- Fleet defect: the vote button (`render.ts:172-179`) has visible text that is only a count and an `aria-label` of "Upvote this artifact"; the name does not contain the visible text (F96 pattern).

## Findings

### 1. Whole-string rule

Sources agree on one mechanism: the translator sees one unit with named placeholders.

- ICU: "Don't build messages from fragments"; put complex arguments on the outside and use full sentences in sub-messages ([ICU user guide, no page date, ICU 79-era](https://unicode-org.github.io/icu/userguide/format_parse/messages/)).
- W3C: composite messages built from several strings fail on gender and number agreement, word order, and missing context. Its fix for `Retrieving last $requiredEntries of $totalEntries total log entries.` is one string with named variables ([W3C, undated](https://www.w3.org/International/articles/composite-messages/)).
- Microsoft: fragments `You have` / `item` / `in your shopping cart` break on fragment order, plural suffixes, punctuation, word separation and sentence structure. Pseudolocalisation exposes it: whole sentences wrap once, fragments wrap separately ([Microsoft Learn, 2024-03-26, vendor documentation](https://learn.microsoft.com/en-us/globalization/internationalization/concatenation)).

Wrong and right, from the fleet (`vscode/src/webview/render.ts:722`):

```ts
// wrong: a sentence closed by a spliced fragment and a spliced noun
html`<p>Nothing matches “${state.query}” across ${registries} ${registries === 1 ? 'registry' : 'registries'}.${synced}</p>`

// right: two whole sentences keyed by category; the sync note is its own element
const noMatch = { one: 'Nothing matches “{query}” in {n} registry.', other: 'Nothing matches “{query}” in {n} registries.' };
```

Two scope notes. English-only products still gain: whole strings are greppable, testable and survive a later translation without a rewrite. A string that never contains a count, a name or a value is already whole; the rule bites only on spliced values.

### 2. Plural rule

- CLDR: six categories, `other` required; the number 1 is `one` in English and every other number is `other`; in other languages `one` can cover 21 and 151 ([CLDR plural rules, footer 2026, no page date](https://cldr.unicode.org/index/cldr-spec/plural-rules)). The page encourages special messages for 0, e.g. "None of your friends are online" instead of "You have 0 friends online".
- gettext: `n == 1` plus an `s` "does not solve the problem"; Polish and Russian need three forms ([GNU gettext manual, undated](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html)).
- Microsoft shows Italian, Japanese and Russian counterexamples to "append s" ([Microsoft Learn, 2024-03-26](https://learn.microsoft.com/en-us/globalization/internationalization/concatenation)).
- `Intl.PluralRules` `select()` returns `zero|one|two|few|many|other`; English cardinal returns only `one` or `other`; ordinal `type: "ordinal"` returns `one|two|few|other` (1st, 2nd, 3rd, 4th) ([MDN, modified 2026-11-13](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules)).
- Measured with `node -e` (Node v26.13.1): `new Intl.PluralRules("en").select(1.0)` is `one`; `new Intl.PluralRules("en",{minimumFractionDigits:1}).select(1)` is `other`; `ru` `select(21)` is `one`, `select(2)` is `few`; `pl` `select(5)` is `many`.
- Fluent: "if the selector uses formatting options such as `NUMBER($score, minimumFractionDigits: 1)`, the formatted value determines the plural category" ([Fluent guide, undated](https://projectfluent.org/fluent/guide/selectors.html)). Select on the value as it is displayed.
- W3C offers a second escape: a topic-comment form ("Pages printed: 3") has no plural at all ([W3C](https://www.w3.org/International/articles/composite-messages/)). It suits table cells and badges, not sentences.

Correct TypeScript, English only, still whole strings:

```ts
const rules = new Intl.PluralRules('en');
const updates: Record<Intl.LDMLPluralRule, string> = {
  zero: 'No updates available', one: '1 update available', two: '{n} updates available',
  few: '{n} updates available', many: '{n} updates available', other: '{n} updates available',
};
const text = updates[rules.select(n)].replace('{n}', String(n));
```

A table with only `one` and `other` is the honest English form; the six-key table shows the shape a translator will fill. Handle zero explicitly (`n === 0 ? 'No updates available' : ...`) because English never returns `zero`.

### 3. Formatter per value type, TypeScript

All are the platform `Intl` objects. Dates of MDN pages are the "last modified" stamps.

| Value | Formatter | Notes and fallback | Source (date) |
|---|---|---|---|
| Plural category | `Intl.PluralRules` | Widely available since September 2019; `select()` | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules) (2026-11-13) |
| Number, percent, compact | `Intl.NumberFormat`, `notation: "compact"` | compact default is at most 2 significant digits; `useGrouping` defaults to `min2` | [MDN ctor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat) (2026-11-13) |
| Quantity with unit | `Intl.NumberFormat`, `style: "unit"` | unit list from `Intl.supportedValuesOf("unit")`; measured on Node v26.13.1 it includes `byte`, `kilobyte`, `megabyte`, `gigabyte`, `second`, `minute`, `hour`, `day`; no binary (KiB) unit | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) (2026-11-13), measured |
| Absolute date and time | `Intl.DateTimeFormat`, `dateStyle`/`timeStyle` | pass `timeZone` when the instant is evidence; omitted means the viewer's zone; same date renders `12/19/2012` (en-US), `19/12/2012` (en-GB), `2012. 12. 19.` (ko-KR) | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) (2025-07-10) |
| Relative time | `Intl.RelativeTimeFormat` | `numeric: "auto"` gives "yesterday"; default `always` gives "1 day ago"; Widely available since September 2020 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat) (2025-07-10) |
| List of items | `Intl.ListFormat`, `type: "conjunction" \| "disjunction" \| "unit"` | `en` gives "A, B, and C", `en-GB` gives "A, B and C"; Widely available since April 2021 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat) (2026-11-13) |
| Duration | `Intl.DurationFormat`, `style: long\|short\|narrow` | Baseline 2025, "Newly available" (March 2025); feature-detect `typeof Intl.DurationFormat` and fall back to a whole-string table | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DurationFormat) (2026-11-13) |
| Message with variables | ICU MessageFormat or MF2 via a library | no native runtime: `Intl.MessageFormat` is Stage 1 | [TC39](https://github.com/tc39/proposal-intl-messageformat) (last presentation 2024-02) |

Hand-written replacements that fail: `${(size / 1024).toFixed(1)} KB` (wrong unit label, no grouping, no locale), `${minutes} min ago` (no plural, no locale, no "yesterday"), `new Date().toISOString().slice(0, 10)` shown to a person (machine format), `a.join(', ') + ' and ' + b` (wrong in `en-GB`, wrong in every other language).

### 4. Formatter per value type, Rust

Crate versions are those shown on docs.rs on 2026-11-27.

| Value | Crate | Version and what the docs say | Use when |
|---|---|---|---|
| Plural category | [`icu_plurals`](https://docs.rs/icu_plurals/latest/icu_plurals/) | 2.4.0; `PluralRules::try_new(locale!("en").into(), Default::default())` then `category_for(5_usize)` returns `PluralCategory::Other`; Polish has one, few, many, other | any locale-aware count |
| Lists | [`icu_list`](https://docs.rs/icu_list/latest/icu_list/) | 2.4.0 (released 2026-10-22 per docs.rs); `try_new_and` / `try_new_or`; Spanish "España, Suiza e Italia" shows the conjunction changes with the word | "and" / "or" lists |
| Date and time | [`icu_datetime`](https://docs.rs/icu_datetime/latest/icu_datetime/) | 2.4.0; semantic skeleton field sets such as `fieldsets::YMD::medium().with_time_hm()`; the `provider` module is marked unstable | locale-aware human dates |
| Whole facade | [`icu`](https://docs.rs/icu/latest/icu/) | 2.4.0 meta-crate re-exporting `plurals`, `datetime`, `list`, `decimal`, `locale`; experimental code lives in a separate crate; MessageFormat not mentioned | one dependency instead of five |
| Message catalog | [`fluent-bundle`](https://docs.rs/fluent-bundle/latest/fluent_bundle/) | 0.16.0; builds on `fluent-syntax`; depends on `intl_pluralrules ^7.0`; its docs page shows no plural example, the plural selector syntax is in the [Fluent guide](https://projectfluent.org/fluent/guide/selectors.html) | translated CLI or TUI strings |
| Byte sizes | [`bytesize`](https://docs.rs/bytesize/latest/bytesize/) | 2.7.0; `display().iec()` prints `518.0 GiB`, `display().si()` prints `556.2 GB`; docs mention no locale | English-only sizes with explicit IEC or SI choice |
| Durations | [`humantime`](https://docs.rs/humantime/latest/humantime/) | 2.4.0; formats like `2years 2min 12us`; docs mention no localisation and no pluralisation | log-style durations, not prose |

Reading for an agent: for English-only output a shared helper module (the `ocx_console::human` pattern below) is sufficient; the moment a string must be translated or a count shown in prose to non-English readers, switch to `icu_*` plus a message catalog. `ocx` already uses `indicatif::HumanBytes` and `HumanDuration` behind `human.rs`; that crate's docs were not fetched, so this artifact makes no claim about its output beyond the fleet's own tests (`3 hours ago`, `in 3 hours`).

### 5. Label in name

- SC 2.5.3 text: "the name contains the text that is presented visually." Best practice: label text at the start of the name. Capitalisation and most punctuation are ignored. Symbols (a ">" arrow, a "B" icon) are not label text; name those by function ([Understanding 2.5.3, updated 2026-10-04](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)).
- Techniques: G208 (include the visible text in the name) and G211 (match them). Failure F96: test each control for (1) name identical to the visible label, (2) name contains it; if both are false the content fails. The failing example is `<button id="sitesearch" aria-label="Find in this site">Go</button>`, because speech users saying "Go" may not activate it ([F96, updated 2026-05-18](https://www.w3.org/WAI/WCAG22/Techniques/failures/F96)).

Passing and failing, checkable by string comparison:

```html
<!-- pass: name contains and starts with the visible text -->
<button aria-label="Install guide for ocx">Install guide</button>
<!-- fail (F96): name does not contain the visible text -->
<button aria-label="Find in this site">Go</button>
<!-- fail: visible text is only a count; the name omits it -->
<button aria-label="Upvote this artifact"><span class="codicon codicon-arrow-up"></span><span>12</span></button>
```

The third case is a judgement call under the spec (a bare number is arguably not "label text"); the safe fix is a name that contains the number: `aria-label="Upvote this artifact (12 upvotes)"`. Icon-only controls have no visible text, so any name passes 2.5.3 and the function name is the right one.

### 6. Self-sufficient status strings

- WCAG 4.1.3 (AA): a status message informs about "the results of an action, an application's waiting state, a process's progress, or errors" and must reach assistive technology without moving focus. Examples: "5 results returned", "No results returned", "Your form was successfully submitted", "5 errors on page", "Invalid entry" ([Understanding 4.1.3, updated 2026-10-04](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)). The announcement mechanism belongs to UX-A11Y; the string content belongs here.
- A screen reader user, a notification toast read later, a log line and a speech reader all see the string without its button, row or panel. So the string carries its own subject and its outcome, plus the count or target when one exists.
- Reading heuristic ("alone test"): paste the string into a blank page. If a reader cannot say what happened and to what, it fails. Pass: `Created grimoire.toml`, `grim installed at /home/u/.local/bin/grim`. Fail: `Done`, `Saved`, `Success`, `Error`, `Copied` followed by a bare identifier whose kind is unclear.

### 7. Fleet measurements

All counts were taken 2026-11-27 on the working trees as found. `D=/home/mherwig/dev`. File lists come from `git ls-files`, so untracked and generated files are out. Corpora: theme = `ocx-sh/website/packages/theme/src` `*.astro` and `*.ts` (102 files, 10604 lines); landing = `ocx-sh/website/site/src` `*.astro`, `*.ts` (11 files, 413 lines); extension = `grimoire-rs/vscode/src` `*.ts` minus `src/test` and `*.test.ts` (38 files, 21161 lines); GUI = `grimoire-rs/grim-gui` (6 files, 262 lines, one view); `ocx` = `ocx-sh/ocx/crates/*/src` `*.rs` minus tests directories (716 files); `grim` = `grimoire-rs/grimoire/{src,crates}` `*.rs` (325 files). Rust counts exclude everything after `#[cfg(test)]` in each file using `awk '/^#\[cfg\(test\)\]/{skip=1} !skip && $0!~/^[[:space:]]*\/\// && $0~pat{c++} END{print c+0}'`.

| # | Measurement | Command (run per corpus) | theme | landing | ext | GUI | `ocx` | `grim` |
|---|---|---|---|---|---|---|---|---|
| 1 | Noun-swap plural ternary in JS/TS | `git -C $D/grimoire-rs/vscode grep -cP "===?\s*1\s*\?\s*['\"\`][A-Za-z ]*['\"\`]\s*:\s*['\"\`][A-Za-z ]*['\"\`]" -- 'src/*.ts' ':!src/test' ':!*.test.ts'` then sum | 0 | 0 | 8 | 0 | n/a | n/a |
| 2 | Other hand plurals in ext (`result${n === 1 ? '' : 's'}`; `n === 1 ? '1 update available' : ...`) | `git grep -nE "=== 1 \?" -- 'src/*.ts'` then read | 0 | 0 | 2 (`render.ts:1195`, `sidebar.ts:1243`) | 0 | n/a | n/a |
| 3 | Rust noun swap `== 1 { "x" } else { "xs" }` | awk with pattern `(==\|!=) 1 [{] "[A-Za-z ]*" [}] else [{] "[A-Za-z ]*" [}]` | n/a | n/a | n/a | n/a | 8 | 15 |
| 4 | `(s)` inside a string literal, non-test | awk with pattern `"[^"]*[A-Za-z]\(s\)[^"]*"` | 0 | 0 | 0 | 0 | 18 | 5 |
| 5 | Message or plural crate in `Cargo.toml` | `grep -cE 'fluent\|icu_plurals\|pluralizer\|inflector\|rust-i18n' Cargo.toml` | n/a | n/a | n/a | n/a | 0 | 0 |
| 6 | Hard-coded `'en-US'` locale | `git grep -cE "'en-US'" -- 'src/*.ts' ':!src/test' ':!*.test.ts'` | 0 | 0 | 2 (`model.ts:1241`, `render.ts:1515`) | 0 | n/a | n/a |
| 7 | `Intl.*` and `toLocale*` uses | `grep -nE 'Intl\.\|toLocale'` over the corpus | 2 (type refs only) | 0 | 6 | 0 | n/a | n/a |
| 8 | Hand-written relative time (`min ago`, `h ago`, `d ago`) | read `model.ts:2578-2593` | 0 | 0 | 1 (`relativeTime`) | 0 | 0 (uses `indicatif::HumanDuration` via `human.rs`) | not measured |
| 9 | Hand-written size with wrong unit | `git grep -nE "KB\|/ 1024" -- src/webview/render.ts` | 0 | 0 | 1 (`render.ts:1865`: `/ 1024` printed as `KB`) | 0 | 0 (`human_bytes` prints binary units) | not measured |
| 10 | `aria-label=` occurrences | `grep -hoE 'aria-label=' ` over corpus | 52 | 2 | 14 | 0 | n/a | n/a |

Reading of rows 1 to 4: the plural defect is concentrated in the extension (10 hand plurals, 0 helper) and in both CLIs, whose strings are English-only by design. The theme has no count-bearing strings except `Breadcrumbs.astro:47` (`Show ${middle.length} more`), which is one whole string; "more" takes no plural form. Row 5: both CLIs would need a catalogue crate before any translation; no rule here forces one.

Label-in-name, 7 of the 68 `aria-label` sites chosen for a manual read of `aria-label` values against sibling text:

| Control | Visible text | Name | Verdict | Where |
|---|---|---|---|---|
| Header brand link | `brand.wordmark ?? brand.title` | `${brand.title} home` | contains the title only when `wordmark` is absent; fails if a wordmark differs from the title | `theme/src/components/SiteHeader.astro:69-75` |
| Header brand link (fallback) | `ocx.brand.wordmark` | `ocx home` | passes if the wordmark is `ocx`; not verified | `SiteHeader.astro:80-87` |
| Search trigger | `triggerLabel` | `triggerLabel` | identical | `theme/src/components/ui/CommandPalette.astro:85-90` |
| Vote button | the count only | `Upvote this artifact` | the name omits the visible number | `vscode/src/webview/render.ts:172-179` |
| Pattern chip button | pattern `${p}` | `Edit ${p}` | contains it, does not start with it | `vscode/src/webview/settings/render.ts:492` |
| Remove-pattern button | icon only | `Remove ${p}` | no visible text; passes | same line |
| Ecosystem hub link | icon only | label without trailing arrow | no visible text; passes | `theme/src/components/EcosystemMenu.astro:69` |

Only the first and fourth rows risk a 2.5.3 failure. Without a rendered DOM the first cannot be settled; the check script in rule SS-9 settles it.

Status strings in the extension (`git -C $D/grimoire-rs/vscode grep -nE 'show(Information|Warning|Error)Message\(' -- 'src/*.ts' ':!src/test' ':!*.test.ts'`, 30 call sites). Post-action notifications, 13; read each for subject and outcome:

| Result | Count | Strings |
|---|---|---|
| Names subject and outcome | 11 | `grim installed at ${target}`; `Created grimoire.toml` / `Created global grimoire.toml`; `Copied share link for ${name}` (twice); `Grimoire: rating token stored for ${target}.`; `Grimoire: rating token cleared for ${target}.`; `Grimoire: added registry ${alias}`; `Grimoire: update removed stale client output for ...; kept locally-modified client output for ...`; uninstall notices from `grim.ts:1102-1113` (e.g. `${name} is installed via a bundle — uninstall the bundle to remove it.`) |
| Outcome without the kind of subject | 2 | `Copied ${message.repo}` (`details.ts:730`, `sidebar.ts:518`): copied the name, the link, or the install command? |
| Fails on `Done`, `Saved`, `Success`, `Error`, `OK` | 0 | `git grep -nE "Message\(\s*['\"\`](Done\|Saved\|Success\|Error\|OK)" -- 'src/*.ts'` returns nothing |

The GUI (`grimoire-rs/grim-gui/src/view.ts:22-30`) has four strings: `grim ${version}`, `grim not found`, `Install grim or set GRIM_BIN to an absolute path.`, `grim failed (exit ${code ?? "unknown"})`. All four name subject and outcome. The last gives no next step; that is an error-message-content question for the sibling worker.

Positive fleet pattern to encode: `ocx_console/src/human.rs` states in its doc comment that JSON surfaces keep raw values; sizes and times go through two functions (`human_bytes`, `human_time`), and the test comment says "Sub-second is its own answer: `0 seconds ago` reads as a rounding bug." That is the CLDR zero-case guidance applied.

## Normative guidance candidates

Severity: MUST / SHOULD / CONSIDER. Every Detect line is a command run from the repository root of the project being checked.

**SS-1 (MUST). Build every user-visible sentence as one string with named placeholders.**
Rationale: fragments cannot be reordered, pluralised or punctuated by a translator, and cannot be read alone.
Verify: `git grep -nP "\\\$\{[^}]*\}\s*\\\$\{[^}]*===?\s*1" -- 'src/*.ts'` and `git grep -nP "\+\s*['\"\`]\s*(and|of|in|items?|results?)\b"` return no user-facing hit. Reading heuristic: delete the placeholders; if the surrounding words are not a complete sentence in one literal, it fails. Pass: `Showing {a} of {b} results`. Fail: `` `Showing ${a}` + ' of ' + b + noun ``.

**SS-2 (MUST). Never write `(s)` or a suffix ternary; choose a whole sentence by plural category.**
Rationale: CLDR has six categories; `(s)` and `n === 1 ? '' : 's'` are right only in English ([CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules), [gettext](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html)).
Verify (Detect): `git grep -nE '"[^"]*[A-Za-z]\(s\)[^"]*"' -- '*.rs' ':!tests'` and `git grep -nP "===?\s*1\s*\?\s*['\"\`][A-Za-z ]*['\"\`]\s*:\s*['\"\`][A-Za-z ]*['\"\`]" -- 'src/*.ts'` return zero outside tests. Fleet today: 8 and 2 in the extension, 18 `(s)` and 8 swaps in `ocx`, 5 and 15 in `grim`. Where English-only Rust keeps an `if n == 1` choice, both branches must be full sentences and live in one helper per crate.

**SS-3 (MUST). Select the category on the value as displayed, and give zero its own sentence.**
Rationale: `1.0` is `other` in English once fraction digits are forced; English never returns `zero`, so "0 items" needs an explicit branch ([MDN PluralRules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules), [Fluent](https://projectfluent.org/fluent/guide/selectors.html), [CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules)).
Verify: `git grep -nE "\b0 (results|items|updates|artifacts|packages|tags)\b" -- 'src' ':!*test*'` has no hit on a user-facing line; a unit test calls the plural helper with `0`, `1`, `2` and the display-formatted `1.0`.

**SS-4 (MUST). Use the platform formatter for each value type; no hand-rolled date, size, duration, list or relative-time strings in TypeScript.**
Rationale: `Intl.*` objects are Baseline "Widely available" (except `DurationFormat`, Baseline 2025) and handle locale, grouping and agreement. Map: plural `PluralRules`; number and compact `NumberFormat`; absolute date `DateTimeFormat`; relative `RelativeTimeFormat`; list `ListFormat`; duration `DurationFormat` with a feature-detect fallback.
Verify: `git grep -nE "toFixed\(|\bmin ago\b|\bh ago\b|\bd ago\b|\.join\(', '\)\s*\+" -- 'src/*.ts' ':!*.test.ts'` has no user-facing hit; fleet today: `render.ts:1865`, `model.ts:2584-2593`.

**SS-5 (MUST). In Rust, route sizes, times and counts through one helper module per workspace; use `icu_plurals`, `icu_list`, `icu_datetime` (version 2.4.0 on docs.rs) when any string must be locale-aware.**
Rationale: `bytesize` and `humantime` document no localisation; a single module makes the later swap one edit, and `ocx_console::human` proves the shape.
Verify: `git grep -nE "format!\(.*(1024|/ 60|/ 3600)" -- '*.rs' ':!*test*'` finds hits only inside the helper module; `grep -E '^(icu|fluent-bundle)' Cargo.toml` is required before any PR that adds a translation.

**SS-6 (MUST). Label byte sizes by the base actually used: 1024 means `KiB`/`MiB`; 1000 means `kB`/`MB`.**
Rationale: `Intl.NumberFormat` `kilobyte` is SI and has no binary unit (measured `1,536 kB`); `bytesize` offers `iec()` and `si()` explicitly ([docs.rs bytesize 2.7.0](https://docs.rs/bytesize/latest/bytesize/)).
Verify: `git grep -nE "/ ?1024.*(KB|MB|GB)\b" -- 'src'` returns nothing. Fleet violation: `vscode/src/webview/render.ts:1865`.

**SS-7 (SHOULD). Never hard-code a locale tag in UI formatting; pass the host language or `undefined`.**
Rationale: `'en-US'` in `new Intl.NumberFormat('en-US')` pins the display for every user, even when the host editor is set to another language. MDN shows `en-US`, `en-GB`, `ko-KR` producing three different date orders ([MDN DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)).
Verify: `git grep -nE "'en-US'|\"en-US\"" -- 'src/*.ts' ':!*test*'` finds hits only in a single `locale` constant. Fleet today: `model.ts:1241`, `render.ts:1515`. See Contested: English-only products.

**SS-8 (SHOULD). Join lists with `Intl.ListFormat` (TypeScript) or `icu_list` (Rust), and name the conjunction type.**
Rationale: the serial comma differs by locale (`en`: "A, B, and C"; `en-GB`: "A, B and C"), and Spanish changes "y" to "e" before an "i" word ([MDN ListFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat), [icu_list](https://docs.rs/icu_list/latest/icu_list/)).
Verify: `git grep -nE "\.join\(', '\)\s*\+\s*['\"\`] ?(and|or)\b|' and ' \+" -- 'src/*.ts'` returns nothing; in Rust `git grep -nE 'join\(", "\).*(and|or) '` returns nothing user-facing.

**SS-9 (MUST). A control's accessible name contains its visible label text; it SHOULD start with it.**
Rationale: speech-input users say the visible label (WCAG 2.5.3 Level A; failure F96) ([Understanding 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html), [F96](https://www.w3.org/WAI/WCAG22/Techniques/failures/F96)).
Verify (Detect), on the rendered DOM: for every element with `aria-label` and non-empty visible text, lowercase both, strip punctuation, and require `name.includes(visible)`; list those with `!name.startsWith(visible)` as warnings. Static pre-check: `git grep -nE "aria-label=.*>[A-Za-z0-9]" -- 'src'` lists candidates for a manual read. Pass: `aria-label="Install guide for ocx"` on "Install guide". Fail: `aria-label="Upvote this artifact"` on a button whose visible text is `12`. Icon-only controls are exempt: give them a function name ("Close", "Copy").

**SS-10 (MUST). Name the visible label before adding detail; build the name from the label, not around it.**
Rationale: a name like `Edit ${p}` on a button showing `${p}` contains the label but a name like `Go to home` on a link showing `Overview` does not.
Verify: grep each template that sets `aria-label` and read it against the sibling text node; reject a template whose literal part does not include the variable that renders as the visible text. Fleet candidate: `SiteHeader.astro:69-75` (title versus wordmark).

**SS-11 (MUST). A status string names its subject and its outcome without the surrounding UI.**
Rationale: toast, announcement, log and screen reader all deliver the string alone ([WCAG 4.1.3 Understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).
Verify (Detect): `git grep -nE "(showInformationMessage|showWarningMessage|setStatus|set_status|println!)\(\s*['\"\`]?(Done|Saved|Success|Error|OK|Failed)\.?['\"\`]?\s*[,)]" -- 'src'` returns nothing; reading heuristic "alone test" on every other status string: the reader can state what happened to what. Pass: `Created grimoire.toml`. Fail: `Done`, and borderline `Copied ${repo}` (copied what?).

**SS-12 (SHOULD). A status string for a count states the count and the thing counted, and a zero result says so in words.**
Rationale: the WCAG examples are "5 results returned" and "No results returned" ([WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)).
Verify: for each element with `role="status"` or `aria-live`, the string template contains a count placeholder and a noun inside one literal; unit test asserts the zero case is not `0 ...`. Fleet: `render.ts:1195-1219` has the structure; it fails SS-2 on the noun.

**SS-13 (SHOULD). Where a string would need gender, article or case agreement, restructure as topic-comment ("Disabled function: printer") rather than interpolating a noun into a sentence.**
Rationale: agreement of "has/have", "the" and adjectives breaks when the noun varies ([W3C composite messages](https://www.w3.org/International/articles/composite-messages/)).
Verify: reading heuristic. Fail: `The ${thing} has been disabled.` with a free `thing`. Pass: `Disabled: ${thing}`.

**SS-14 (CONSIDER). When a message catalogue is adopted, use MessageFormat 2 syntax for new catalogues and keep whole-sentence variants inside `.match`.**
Rationale: MF2 is a stable UTS 35 document (CLDR 49, tr35-79, 2026-10-21) and is "built directly into ICU4C, ICU4J" ([MF2 site](https://messageformat.unicode.org/), [UTS 35 MF2](https://unicode.org/reports/tr35/tr35-messageFormat.html)); ICU MessageFormat remains the most deployed.
Verify: a catalogue linter parses every message; no message exists as two keys that differ only by a number word.

**SS-15 (CONSIDER). Escape syntax characters when a string passes through ICU MessageFormat; prefer U+2019 for apostrophes in human text.**
Rationale: a pair of ASCII apostrophes yields one apostrophe; a lone one starts quoting ([ICU user guide](https://unicode-org.github.io/icu/userguide/format_parse/messages/)).
Verify: a unit test formats every catalogue message containing `'` and compares to the expected text.

## What an agent must not decide alone

- Which locales the product supports, and whether to adopt a catalogue (Fluent, ICU, MF2) at all. That is a roadmap and cost decision; the fleet is English-only today.
- Whether a user-visible byte size follows IEC (KiB) or SI (kB). Follow the product's existing convention; ask when a surface has none.
- The product's name or prefix in notifications ("Grimoire:" is a brand-voice choice), tone, and whether to use first person. Ask the owner.
- The legal or privacy wording in confirmation dialogs (for example "This posts publicly under your forge account."): preserve it, never reword it.
- Which time zone an instant is shown in when it is evidence (audit, publish time): this is a product decision between UTC and viewer-local.
- Whether to show a relative time, an absolute time, or both for a record ("Pair it with `human_instant` wherever the exact value is itself evidence", `human.rs`).

## Dated facts

| Fact | Value | Source | Source date | Type |
|---|---|---|---|---|
| WCAG 2.5.3 Label in Name, Level A; name contains visible text; starting with it is best practice | as stated | [Understanding 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html) | updated 2026-10-04 | authority (W3C) |
| F96 test: name identical or contains the visible label, else fail | as stated | [F96](https://www.w3.org/WAI/WCAG22/Techniques/failures/F96) | updated 2026-05-18 | authority (W3C) |
| WCAG 4.1.3 Status Messages, Level AA | as stated | [Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | updated 2026-10-04 | authority (W3C) |
| CLDR plural categories: zero, one, two, few, many, other; `other` required | six | [CLDR plural rules](https://cldr.unicode.org/index/cldr-spec/plural-rules) | undated, footer 2026 | authority (Unicode) |
| `Intl.PluralRules` Baseline | Widely available, since September 2019 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules) | modified 2026-11-13 | independent reference |
| `Intl.DateTimeFormat` Baseline | Widely available, since September 2017 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) | modified 2025-07-10 | independent reference |
| `Intl.RelativeTimeFormat` Baseline | Widely available, since September 2020 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat) | modified 2025-07-10 | independent reference |
| `Intl.ListFormat` Baseline | Widely available, since April 2021 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat) | modified 2026-11-13 | independent reference |
| `Intl.NumberFormat` Baseline | Widely available, since September 2017 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) | modified 2026-11-13 | independent reference |
| `Intl.DurationFormat` Baseline | Baseline 2025, Newly available, since March 2025 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DurationFormat) | modified 2026-11-13 | independent reference |
| MessageFormat 2 | stable Unicode document, UTS 35 Part 9, CLDR 49, tr35-79 | [UTS 35 MF2](https://unicode.org/reports/tr35/tr35-messageFormat.html) | 2026-10-21 | authority (Unicode) |
| `Intl.MessageFormat` proposal | TC39 Stage 1; presentations 2022-03, 2023-10, 2024-02 | [TC39](https://github.com/tc39/proposal-intl-messageformat) | undated page | authority (TC39) |
| `icu` / `icu_plurals` / `icu_list` / `icu_datetime` | 2.4.0; `icu_list` 2.4.0 released 2026-10-22 | [docs.rs icu](https://docs.rs/icu/latest/icu/), [icu_list](https://docs.rs/icu_list/latest/icu_list/) | fetched 2026-11-27 | crate docs |
| `bytesize` 2.7.0, `humantime` 2.4.0, `fluent-bundle` 0.16.0 | versions | [bytesize](https://docs.rs/bytesize/latest/bytesize/), [humantime](https://docs.rs/humantime/latest/humantime/), [fluent-bundle](https://docs.rs/fluent-bundle/latest/fluent_bundle/) | fetched 2026-11-27 | crate docs |
| Microsoft concatenation guidance | whole strings, multiple sentences in one string | [Microsoft Learn](https://learn.microsoft.com/en-us/globalization/internationalization/concatenation) | 2024-03-26 | vendor documentation |
| Node `Intl` measurements | `byte,day,gigabyte,hour,kilobyte,megabyte,minute,petabyte,second,terabyte` in `Intl.supportedValuesOf("unit")`; `1,536 kB` | command: `node -e 'console.log(Intl.supportedValuesOf("unit"))'` on Node v26.13.1 | 2026-11-27 | measurement |

## AI-agent angle

| Mistake an LLM characteristically makes | Smallest mechanical check |
|---|---|
| Writes `${n} item${n === 1 ? '' : 's'}` or `item(s)` because it is the shortest English | the SS-2 greps; fail the PR on any hit outside tests |
| Splits a sentence into three template pieces to "reuse" a noun | SS-1 grep plus the delete-the-placeholders reading test |
| Formats sizes as `(n / 1024).toFixed(1) + ' KB'`: wrong label and no grouping | SS-6 grep |
| Hand-writes "5 min ago" and "just now" ladders | SS-4 grep for `min ago`, `h ago`; require `Intl.RelativeTimeFormat` |
| Hard-codes `'en-US'` in `Intl.NumberFormat` or `toLocaleDateString` | SS-7 grep |
| Joins lists with `', '` and a literal `and` | SS-8 grep |
| Copies the visible text into an `aria-label` with a different wording ("Upvote this artifact" for a count) | the SS-9 DOM comparison |
| Invents an `Intl.MessageFormat` API that exists only as a Stage 1 proposal | grep for `Intl.MessageFormat`; it must not appear in shipped code |
| Writes `Done` or `Success` as a toast | SS-11 grep and the alone test |
| Uses `humantime` or `bytesize` output in a translated UI because it "formats durations" | docs say no localisation; the SS-5 helper-module check |
| Believes `Intl.NumberFormat` `kilobyte` is 1024-based | measured: it prints `kB`; no binary unit exists |

## Contested / evolving

- **Plural syntax.** ICU MessageFormat (`{n, plural, one {...} other {...}}`) is the deployed standard; MF2 (`.match`) is the stable successor, built into ICU4C and ICU4J and "soon" ECMA-402 per [messageformat.unicode.org](https://messageformat.unicode.org/); Fluent selectors are a third syntax ([Fluent guide](https://projectfluent.org/fluent/guide/selectors.html)); gettext `ngettext` is the fourth ([GNU gettext](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html)). Trend as of 2026-11-27: MF2 gaining, native `Intl.MessageFormat` still Stage 1 ([TC39](https://github.com/tc39/proposal-intl-messageformat)). This artifact does not pick a syntax; it picks the whole-string principle all four share.
- **Avoid plurals versus implement them.** W3C prefers a topic-comment form ("Pages printed: 3") to dodge number agreement ([W3C](https://www.w3.org/International/articles/composite-messages/)); CLDR and Microsoft prescribe proper plural handling and special zero messages ([CLDR](https://cldr.unicode.org/index/cldr-spec/plural-rules), [Microsoft](https://learn.microsoft.com/en-us/globalization/internationalization/concatenation)). Both are valid; use topic-comment for labels and cells, plural sentences for prose.
- **English-only products and localisation cost.** The commission defers the localisation workflow. For English-only CLIs a one-helper `if n == 1` with two whole strings is accepted here (SS-2); the opposing view is that any hand-written plural logic entrenches English assumptions. Decision rests on whether translation is on the roadmap: ask the owner.
- **Label start versus contains.** The normative text requires "contains"; "start with" is only a best practice ([Understanding 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)). SS-9 makes contains a MUST and start a SHOULD.
- **Numeric-only visible labels.** Whether a bare count counts as "text presented visually" is not settled on the Understanding page, which excludes symbols and mathematical expressions as special cases. The safe course (include the number in the name) costs nothing.
- **Byte units.** SI (`kB`, base 1000) versus IEC (`KiB`, base 1024). `bytesize` exposes both ([docs.rs](https://docs.rs/bytesize/latest/bytesize/)); `Intl.NumberFormat` only SI (measured). The fleet's CLI uses binary; the rule is only that the label matches the base.
- **Relative versus absolute time.** The fleet CLI pairs both where the exact value is evidence; there is no external standard to cite. Left to the owner.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html | WCAG 2.2 Understanding 2.5.3 (primary) | updated 2026-10-04 | normative text, exceptions, G208/G211/F96 |
| https://www.w3.org/WAI/WCAG22/Techniques/failures/F96 | WCAG failure technique F96 (primary) | updated 2026-05-18 | the test procedure and failing example |
| https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | WCAG 2.2 Understanding 4.1.3 (primary) | updated 2026-10-04 | definition and examples of status messages |
| https://cldr.unicode.org/index/cldr-spec/plural-rules | CLDR plural rules (primary) | undated, 2026 footer | six categories, zero-message guidance |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules | MDN PluralRules | modified 2026-11-13 | cardinal and ordinal examples, Baseline |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat | MDN DateTimeFormat | modified 2025-07-10 | locale-dependent date order, `timeZone` |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat | MDN RelativeTimeFormat | modified 2025-07-10 | `numeric: "auto"` |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat | MDN ListFormat | modified 2026-11-13 | Oxford comma by locale |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat | MDN NumberFormat | modified 2026-11-13 | unit style and Baseline |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat | MDN NumberFormat constructor | modified 2026-11-13 | `compact` defaults, `unitDisplay`, `supportedValuesOf` pointer |
| https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DurationFormat | MDN DurationFormat | modified 2026-11-13 | Baseline 2025 newly available |
| https://unicode-org.github.io/icu/userguide/format_parse/messages/ | ICU MessageFormat user guide (primary) | undated, ICU 79-era | no-fragments rule, plural and select syntax, apostrophes |
| https://messageformat.unicode.org/ | MessageFormat 2 site (primary) | 2026 footer | `.match` plural syntax, ECMA-402 "soon" |
| https://unicode.org/reports/tr35/tr35-messageFormat.html | UTS 35 Part 9 MF2 (primary) | tr35-79, 2026-10-21, CLDR 49 | stable status (first 100000 characters read) |
| https://github.com/tc39/proposal-intl-messageformat | TC39 `Intl.MessageFormat` proposal (primary) | Stage 1, last presentation 2024-02 | shows no native MF2 runtime yet |
| https://projectfluent.org/fluent/guide/selectors.html | Fluent selector guide | undated | formatted value decides the category |
| https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html | GNU gettext plural forms | undated | why `n == 1` fails; Polish, Russian |
| https://www.w3.org/International/articles/composite-messages/ | W3C composite messages article (primary) | undated | six failure modes, topic-comment fix |
| https://learn.microsoft.com/en-us/globalization/internationalization/concatenation | Microsoft Learn on concatenation (vendor documentation) | 2024-03-26 | worked example, pseudolocalisation test |
| https://docs.rs/icu/latest/icu/ | `icu` meta-crate (primary) | 2.4.0 | component list |
| https://docs.rs/icu_plurals/latest/icu_plurals/ | `icu_plurals` (primary) | 2.4.0 | Rust plural category API |
| https://docs.rs/icu_list/latest/icu_list/ | `icu_list` (primary) | 2.4.0, released 2026-10-22 | and/or lists |
| https://docs.rs/icu_datetime/latest/icu_datetime/ | `icu_datetime` (primary) | 2.4.0 | field sets, unstable provider module |
| https://docs.rs/bytesize/latest/bytesize/ | `bytesize` | 2.7.0 | IEC and SI output, no locale |
| https://docs.rs/humantime/latest/humantime/ | `humantime` | 2.4.0 | no localisation or plural docs |
| https://docs.rs/fluent-bundle/latest/fluent_bundle/ | `fluent-bundle` | 0.16.0 | Rust Fluent runtime, no plural example on the page |
| https://www.w3.org/International/quicktips/ | W3C i18n quick tips (search result only, not opened) | n/a | not used for any claim; listed as unfetched |

Fetch notes: `https://www.w3.org/International/questions/qa-plural-forms` returned HTTP 404 and is not used. The UTS 35 page is 222025 characters long; only the first 100000 were read, so the statement that it contains no sentence-assembly rule is limited to that range. `Intl.NumberFormat` unit identifiers were not listed on MDN, so the unit list comes from the Node command above, not from a specification page. The row for the quick-tips page counts as unfetched: 26 fetched sources, plus the Node measurements.

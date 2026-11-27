---
title: Delta research for docs-quality, MkDocs, Material, Zensical, Python-Markdown, pymdown-extensions, mdBook and linkcheck
pair: docs-quality
date_researched: 2026-11-27
window_start: 2026-09-05
model: sonnet
sources_fetched: 19
---

# Delta: docs-quality generators, 2026-09-05 to 2026-11-27

This is a delta update. Anything not listed as changed stays as the baseline research has it. Every fact below comes from a page fetched on 2026-11-27. Dates come from changelogs, GitHub release pages, the crates.io API and the PyPI JSON API. Where a source gave no year, that is stated.

## Contents

1. Summary
2. Findings per upstream
3. Claim table
4. Zensical parity answers
5. Rule-level answers (DOC-EX-20, DOC-EX-21, DOC-EX-24, DOC-TYPE-28, DOC-OBS-01)
6. Normative guidance candidates
7. AI-agent angle
8. Contested and evolving
9. Could not determine
10. Sources

## Summary

- Material for MkDocs is no longer at 9.7.7. 9.8.0 (2026-10-24), 9.8.1 (2026-11-07) and 9.8.2 (2026-11-19) exist. 9.8.0 is a security release that requires Python 3.11 or newer. It prints an end-of-life notice with the date 2027-05-05 and a Zensical migration link, and marks the package metadata inactive. The changelog entries for 9.8.x mention no change to search, `navigation.path`, `content.code.copy`, `strict` or `pymdownx` handling.
- The end-of-life date moved. Earlier Material material and the 9.7.6 notes said critical fixes run to November 2026. The 9.8.0 changelog states 2027-05-05. The pair must not repeat the November 2026 date.
- MkDocs core has not shipped a 1.x release since 1.6.1 (2024-08-30). MkDocs 2.0 exists only as pre-releases on PyPI, 2.0.dev0 on 2026-08-28 through 2.0.dev6 on 2026-09-15 (list may be truncated). Material's own blog says 2.0 drops YAML for TOML and drops plugins, so `mkdocs.yml` projects and Material do not work on it. Material 9.7.5 and later pin `mkdocs<2`.
- Zensical reached 0.1.0 (beta milestone) on 2026-11-05 and 0.1.3 on 2026-11-20. It reads `mkdocs.yml`, supports `--strict` and has its own validation checks for links and anchors. Its search engine is written from scratch and is not lunr. Material "default" is now a claim that needs a Zensical arm.
- mdBook is at 0.5.4 (crates.io, 2026-07-06). 0.5.3 was 2026-05-19. Both predate the window, but 0.5.4 is newer than the version the pair measured. Nothing in 0.5.3 or 0.5.4 touches front matter, the fake `<h2>`, `copyable`, `playground`, or search boost.
- `mdbook-linkcheck` (Michael-F-Bryan) is broken on mdBook 0.5. Its last crates.io release is 0.7.7 (2022-10-03) and issue 96 "fails on mdbook 0.5" is open. mdBook merged a PR on 2026-06-08 that recommends the `mdbook-linkcheck2` fork. The pair's observability row naming `mdbook-linkcheck` is therefore stale. This is the one confirmed breaking change that touches a pair claim.
- Python-Markdown shipped 3.11.0 to 3.11.4 (2026-09-25 to 2026-11-25). The `toc` slugify function itself is unchanged. Edge cases in heading ID generation changed (see claim table).
- pymdown-extensions shipped 12.0 to 13.1.2 (2026-09-15 to 2026-11-20, year assumed from page footer). No change to the fence info-string parser, `tabbed` syntax, or `snippets` `auto_append`.

## Findings

### 1. Material for MkDocs

- Release list after 9.7.0, from the [Material changelog](https://squidfunk.github.io/mkdocs-material/changelog/): 9.7.1 2025-12-18, 9.7.2 2026-02-18 (adds the MkDocs 2.0 warning), 9.7.3 2026-02-24, 9.7.4 2026-03-03, 9.7.5 2026-03-10 (limits mkdocs to `<2`), 9.7.6 2026-03-19, 9.7.7 2026-07-17 (DOM XSS fix in search suggestions), 9.8.0 2026-10-24, 9.8.1 2026-11-07 (Docker and Node build dependency updates), 9.8.2 2026-11-19 (privacy plugin security fix).
- 9.8.0 per the same changelog: Python 3.11 or newer, higher minimums for Jinja2, Pillow and GitPython, RSS and redirects removed from the `recommended` extra, CLI notice with the 2027-05-05 end-of-life date, package metadata marked inactive.
- The changelog text read (first 100000 of about 183000 characters) did not mention `navigation.path`, `content.code.copy` or search behaviour in anything after 9.7.0, apart from the 9.7.7 search XSS fix. `navigation.path` was added in 9.7.0 (2025-11-11), before the baseline, so it is not a new feature. The unread tail of the page is older history.
- The prior research's "maintenance mode since late 2025" claim is confirmed: 9.7.0 was the last release with new features.
- Impact on the pair's "Measured on real builds of MkDocs Material 9.7.7": the claim stays true as a statement of what was measured, but the current release is 9.8.2. Behaviour was not re-measured. Nothing fetched suggests the superfences or Pygments fallback changed, because those live in pymdown-extensions and Pygments, not in Material.

### 2. MkDocs core and MkDocs 2.0

- The [MkDocs release notes page](https://www.mkdocs.org/about/release-notes/) and the [GitHub releases page](https://github.com/mkdocs/mkdocs/releases) both show 1.6.1 (2024-08-30) as the latest release. No 1.7 exists.
- [PyPI JSON for mkdocs](https://pypi.org/pypi/mkdocs/json) lists 2.0.dev0 (2026-08-28) to 2.0.dev6 (2026-09-15), requiring Python 3.10 or newer. The fetch was truncated, so later dev releases may exist.
- [Material blog, "What MkDocs 2.0 means for your documentation projects"](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/) (published 2026-02-18, updated 2026-10-02): 2.0 uses TOML instead of YAML, so existing `mkdocs.yml` files do not work and there is no migration path. Plugin support is deliberately removed. The theme system is rewritten. Material builds stop working on 2.0.
- Strict mode and link validation as of 1.6.x stay as the baseline: `validation.links` and `validation.anchors` (1.6.0), `not_in_nav`, and `--strict` turns configured warnings into failures. The claim "`mkdocs build --strict` fails on a broken internal link or anchor" remains correct only when `validation.anchors: warn` is set, because the default for anchors is `info`. The release notes confirm this: 1.6.0 "recommended at `warn`". Check whether the pair's text already says so. This is baseline behaviour, not a change.
- Search on lunr: the 1.x release notes still describe lunr-languages (1.5.3) and the lunr-based index. No change.

### 3. Zensical

- [Zensical changelog](https://zensical.org/docs/changelog/), years not printed, read as 2026: 0.0.69 (Oct 8) adds `nav-weight` and `markdownextradata`; 0.0.70 (Oct 12) adds `exclude_docs`, `draft_docs`, `not_in_nav` and UI search accessibility fixes; 0.0.71 (Oct 16) adds `include-markdown` and rejects oversized search fields; 0.0.72 (Oct 23) adds the privacy plugin and preserves the SuperFences extension order; 0.0.73 (Oct 26); 0.0.74 (Oct 30) adds `optimize`; 0.1.0 (Nov 5) beta milestone with MkDocs compatibility fixes, beta planned for three months; 0.1.1 (Nov 10) adds `meta-descriptions` and fixes search and code-copy in the UI; 0.1.2 (Nov 17) adds `llmstxt`; 0.1.3 (Nov 20) adds `git-revision-date-localized`. No September releases on the page.
- [Zensical compatibility page](https://zensical.org/compatibility/): reads an existing `mkdocs.yml`, "almost all settings" work, Python Markdown and its extensions work unchanged, full Material settings surface supported, a `classic` theme preserves Material's look. Plugin replacements are partial. Unsupported settings sit in the migration guide, which I could not fetch (the URL I tried returned 404).
- [Zensical build page](https://zensical.org/docs/usage/build/): `zensical build --strict` or `-s`.
- [Zensical validation page](https://zensical.org/docs/setup/validation/): strict mode fails the build with exit code 1 after reporting all issues. `invalid_links` and `invalid_link_anchors` default on. Setting `strict: true` in `mkdocs.yml` works. `validation: false` turns it off. This differs from MkDocs: anchors are on by default here, `warn`-level opt-in there. Six other checks (`unresolved_references` and so on) are deprecated and off by default.
- [Zensical search page](https://zensical.org/docs/setup/search/): the engine is "written from scratch" and not lunr. Material's `pipeline` option has no equivalent. Language comes from `theme.language`, not the plugin's `lang`. The page says nothing about title and paragraph boost. `search.exclude` front matter and `data-search-exclude` exist.
- I did not fetch any Zensical page that says how superfences info strings with a space are handled. Zensical uses Python-Markdown and pymdownx, per the compatibility page, and 0.0.72 preserves SuperFences extension order, so the parser is the same library. The Pygments fallback is therefore expected to be the same, but this is inference, not a measurement.
- I did not fetch a Zensical page that confirms `content.code.copy` by name. The compatibility page says the full Material settings surface is supported and 0.1.1 fixed code-copy in the UI, which implies it exists. Unverified by name.

### 4. Python-Markdown

[Changelog](https://python-markdown.github.io/changelog/): 3.11.0 (2026-09-25, drops Python 3.10), 3.11.1 (2026-10-13), 3.11.2 (2026-10-19, attribute sanitisation in `fenced_code`), 3.11.3 (2026-11-05), 3.11.4 (2026-11-25).

- `toc` slugify: the function itself is unchanged. 3.11.3 fixes quadratic ID generation for many identical headings and strips complete HTML tags containing a quoted `>` from TOC labels and heading IDs. 3.11.4 stops a valueless `{id}` or `data-toc-label` from raising `TypeError`. The checks.md claim "Heading slugs follow the Python-Markdown toc slug" stays true. A heading containing an HTML tag with a quoted `>` would now slug differently, which is an edge case.
- `abbr`: 3.11.4 stops abbreviation definitions spanning lines, so a line starting `*[` no longer swallows following lines. 3.11.3 ignores glossary abbreviations with empty definitions after inline elements. Existing examples.md `abbr` text should be rechecked for any multi-line definition. Not verified against the pair text.
- `attr_list`: 3.11.3 renders valueless attributes as provided, not as `key="key"`. This could affect an example that relies on `{ data-x }`, if any.

### 5. pymdown-extensions

[Changelog](https://facelessuser.github.io/pymdown-extensions/about/changelog/) (no dates) and [GitHub releases](https://github.com/facelessuser/pymdown-extensions/releases) (day and month only, year assumed 2026): 12.0 (Sep 15), 12.1 (Sep 23, SuperFences optional `reset` for custom fences), 12.2 (Oct 10, SuperFences `title_mode` and Highlight `auto_title_map` dictionary), 12.3, 13.0 (Nov 8, Snippets escaped section markers fix), 13.1 (Nov 11, Snippets `Retry-After` and recursion-limit handling, legacy Tabbed recursion limit), 13.1.1, 13.1.2 (Nov 20).

- No change to the info-string parser. The changelog says header syntax changes were 10.11, 10.11.1 and `relaxed_headers` in 10.15, all before the window. The DOC-EX-20 mechanism is unchanged.
- `tabbed`: only the 13.1 recursion handling. The `=== "Title"` syntax is unchanged.
- `snippets`: 13.0 and 13.1 touch section markers, retry and recursion. `auto_append` is not mentioned anywhere in the fetched notes. Unchanged.
- The pair's measured "Material 9.7.7" bundles a pymdown-extensions version that I did not identify. The 12.x and 13.x releases are newer than that environment. Because 10.11 to 10.15 already defined the info-string behaviour, a regression is unlikely but not measured.

### 6. mdBook and linkcheck

- [crates.io mdbook](https://crates.io/api/v1/crates/mdbook): 0.5.0 2025-11-17, 0.5.1 2025-11-20, 0.5.2 2025-12-11, 0.5.3 2026-05-19, 0.5.4 2026-07-06. No 0.5.5 or 0.6 as of the fetch.
- [mdBook CHANGELOG.md](https://raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md) 0.5.3: sidebar spacing, current-page highlight with redirects, `?highlight=` removal, nested admonition colours, clearer Font Awesome errors. 0.5.4: zoomable images (3127), image-in-link layout, and the switch of the recommended linkcheck tool to the `linkcheck2` fork. Nothing on front matter, `copyable`, `playground.runnable`, `playground.editable`, the fake `<h2>` or search boost. In the changelog, `playground.editable` appears in 0.4.11 and `playground.runnable` in 0.4.16, so those keys are old and still current.
- [mdBook PR 3132](https://github.com/rust-lang/mdBook/pull/3132) "Recommend linkcheck2 fork": opened 2026-06-03, merged 2026-06-08. The author states "With the addition of admonitions in 0.5.0, linkcheck broke, and the PR to fix it has been open for a good while."
- [mdbook-linkcheck issues](https://github.com/Michael-F-Bryan/mdbook-linkcheck/issues): issue 96 "fails on mdbook 0.5" opened 2025-11-24, open; issue 92 "RenderContext parsing error: unknown variant 2024", open. [crates.io mdbook-linkcheck](https://crates.io/api/v1/crates/mdbook-linkcheck): newest is 0.7.7, 2022-10-03. The repository page shows 31 open issues and 7 open PRs and no archive notice.
- [crates.io mdbook-linkcheck2](https://crates.io/api/v1/crates/mdbook-linkcheck2), repository `marxin/mdbook-linkcheck2`: 0.11.0 2025-11-24, 0.12.0 2026-02-28, 0.12.1 and 0.12.2 2026-06-13, 0.13.0 2026-08-16. Search-result excerpt of the 0.12.0 manifest shows dependencies on `mdbook-driver` and `mdbook-renderer` 0.5.1, Rust 1.90, edition 2024, and a `passively-maintained` badge. That excerpt is a search snippet, not a fetched page, so treat the dependency detail as unconfirmed. The README (fetched) says configuration goes under `[output.linkcheck2]` and that the older `[output.linkcheck]` name still works.
- Answer to "does mdbook-linkcheck still build against the mdBook 0.5 renderer API": the original crate does not. The maintained path is `mdbook-linkcheck2`. Whether linkcheck2 0.13.0 builds against 0.5.4 specifically was not confirmed by a build; its release cadence tracks 0.5.

## Claim table

Statuses: unchanged, changed, obsolete, could not determine.

| # | Claim (file) | Status | New value or note | Source and date |
|---|---|---|---|---|
| 1 | "Measured on real builds of MkDocs Material 9.7.7, mdBook 0.5.3" (examples.md) | changed (versions only) | Latest are Material 9.8.2 (2026-11-19) and mdBook 0.5.4 (2026-07-06). The measurements were not repeated. Reword as "measured on" with the dates, or re-measure | [Material changelog](https://squidfunk.github.io/mkdocs-material/changelog/), [crates.io mdbook](https://crates.io/api/v1/crates/mdbook) |
| 2 | "Material 9.7.7 falls back to Pygments `text` lexer" for the space-form info string | unchanged | No fence-parser change in pymdown-extensions 12.0 to 13.1.2 or in Material 9.8.x. Not re-measured | [pymdown changelog](https://facelessuser.github.io/pymdown-extensions/about/changelog/) |
| 3 | "Only MkDocs Material breaks" on the space-form info string | changed (scope) | Zensical uses the same Python-Markdown and pymdownx stack and keeps SuperFences order, so it is expected to break the same way. Inference, not measured | [Zensical compatibility](https://zensical.org/compatibility/), [Zensical changelog](https://zensical.org/docs/changelog/) 0.0.72 (2026-10-23) |
| 4 | "Opt-in on MkDocs Material through `content.code.copy`" | unchanged for Material; Zensical not confirmed by name | Zensical claims the full Material settings surface; 0.1.1 (2026-11-10) fixes code-copy UI | [Zensical compatibility](https://zensical.org/compatibility/) |
| 5 | `pymdownx.tabbed` claim | unchanged | Only a recursion-limit change in legacy Tabbed (13.1, Nov 11) | pymdown changelog |
| 6 | `abbr` claim | could not determine | Python-Markdown 3.11.3 and 3.11.4 changed abbreviation parsing (multi-line definitions no longer span lines, empty glossary definitions ignored). Pair text not rechecked against it | [Python-Markdown changelog](https://python-markdown.github.io/changelog/) 2026-11-05 and 2026-11-25 |
| 7 | `pymdownx.snippets` and `auto_append` claims | unchanged | 13.0 and 13.1 changes concern section markers, 429 retry and recursion; `auto_append` unmentioned | pymdown changelog |
| 8 | "mdbook-core `config.rs` defaults `copyable` to true" | unchanged | `copyable` appears in the changelog only under 0.3.2; no 0.5.3 or 0.5.4 entry changes it. Source file `config.rs` not re-read | [mdBook CHANGELOG](https://raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md) |
| 9 | "mdBook 0.5.3 renders that block as a fake `<h2>`" (DOC-TYPE-28) | unchanged | No front-matter support added in 0.5.3 or 0.5.4; the word "front matter" does not appear anywhere in the changelog. Not re-rendered on 0.5.4 | mdBook CHANGELOG |
| 10 | "Front matter is unsupported" for mdBook | unchanged | Same evidence as row 9 | mdBook CHANGELOG |
| 11 | `navigation.path` as the breadcrumb (navigation.md) | unchanged | Introduced in 9.7.0 (2025-11-11); no later change. Zensical coverage not confirmed by name | Material changelog |
| 12 | MkDocs search on lunr | unchanged for MkDocs and Material; changed for Zensical | Zensical's engine is new, "not lunr", with no `pipeline` option | [Zensical search](https://zensical.org/docs/setup/search/) |
| 13 | mdBook on elasticlunr, "defaults are already 2 against 1" for `boost-title` and `boost-paragraph` | could not determine | No changelog entry mentions search boost in 0.5.3 or 0.5.4. Defaults not re-read from `book.toml` docs or source | mdBook CHANGELOG |
| 14 | `searcher.js` internal | unchanged | No mention in 0.5.3 or 0.5.4 | mdBook CHANGELOG |
| 15 | `!ENV` and `!!python/name:` tags in `mkdocs.yml` | unchanged for MkDocs 1.x; obsolete on MkDocs 2.0 | 2.0 replaces YAML with TOML. Zensical reading of these tags not confirmed | [Material 2.0 blog](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/) |
| 16 | "`mkdocs build --strict` fails on a broken internal link or anchor" | unchanged | Needs `validation.anchors: warn` for anchors; 1.6.1 is still the latest 1.x | [MkDocs release notes](https://www.mkdocs.org/about/release-notes/) |
| 17 | "The `mdbook-linkcheck` backend, enabled in `book.toml`" (observability.md) | changed | The original crate is broken on mdBook 0.5 (issue 96, open; last release 2022-10-03). mdBook now recommends `mdbook-linkcheck2`, configured as `[output.linkcheck2]` (old `[output.linkcheck]` still accepted) | [mdBook PR 3132](https://github.com/rust-lang/mdBook/pull/3132) merged 2026-06-08; [crates.io linkcheck2](https://crates.io/api/v1/crates/mdbook-linkcheck2) 0.13.0 2026-08-16 |
| 18 | "Heading slugs follow the Python-Markdown toc slug" (checks.md) | unchanged | Slugify unchanged; edge-case ID fixes in 3.11.3 and 3.11.4 | Python-Markdown changelog |
| 19 | DOC-EX-29 `[output.html.playground]` keys `runnable` and `editable` | unchanged | Both keys still documented as current in the changelog; no removal | mdBook CHANGELOG |
| 20 | "Material is the default" generator in the pair | changed | Material is in maintenance, end of life 2027-05-05, metadata inactive; Zensical is the successor at beta 0.1.x | Material changelog, Zensical changelog |

## Zensical parity answers

- `mkdocs.yml` parsing: mostly the same. Zensical reads `mkdocs.yml` and supports "almost all settings", with a list of unsupported ones in its migration guide that I could not fetch. It also reads `zensical.toml`. Custom YAML tags (`!ENV`, `!!python/name:`) were not confirmed.
- `--strict`: similar, not the same. `zensical build --strict` and `strict: true` exist, exit code 1, all issues listed first. Its link and anchor checks are on by default (`invalid_links`, `invalid_link_anchors`), while MkDocs needs `validation.anchors: warn`. Failures come from Zensical's own validators, not MkDocs's.
- superfences info strings: same library, expected same behaviour, not measured on Zensical.
- `content.code.copy`: claimed supported through "full Material settings surface"; not confirmed by name.
- Search engine: different. New engine, not lunr, no `pipeline`, language from `theme.language`.

## Rule-level answers

- DOC-EX-20 (hyphen-joined tier token): rationale unchanged for Material. Add a Zensical arm only after one measured build on Zensical 0.1.x; until then say "expected on Zensical, unmeasured".
- DOC-EX-21 (tool-native space-form only where MkDocs Material never renders): the gate "`mkdocs.yml` present" already covers Zensical, because Zensical consumes `mkdocs.yml`. Its text must not say "Material" only. Needs wording change, not a new rationale.
- DOC-EX-24 (`content.code.copy` and `content.code.annotate`): rationale unchanged for Material. Zensical arm needed once confirmed; settings live in `theme.features` in `mkdocs.yml` or `zensical.toml`.
- DOC-TYPE-28 (no YAML front matter in mdBook): rationale unchanged, no new rendering evidence. Re-run the render on 0.5.4 when convenient.
- DOC-OBS-01: needs a changed rationale. Row 17 names a tool that fails on mdBook 0.5. A Zensical arm is warranted: `zensical build --strict`, with anchor checking on by default.

## Normative guidance candidates

1. Name `mdbook-linkcheck2` as the mdBook link-check backend and show `[output.linkcheck2]`. Rationale: the original crate fails to parse the 0.5 render context, and mdBook itself recommends the fork. Verification: `grep -n 'output.linkcheck' book.toml` finds `linkcheck2` and `mdbook build` exits 0.
2. Say that DOC-OBS-01 accepts `zensical build --strict` as the generator's strict build. Rationale: Zensical validates links and anchors by default. Verification: `grep -rn -e 'zensical build --strict' -e 'mkdocs build --strict' .github`.
3. State the `validation.anchors: warn` requirement next to the MkDocs `--strict` claim. Rationale: anchors default to info in 1.6.x. Verification: `grep -n 'anchors' mkdocs.yml` returns `warn`.
4. Add a status line that Material is in maintenance until 2027-05-05 and that new sites should be checked against Zensical. Rationale: the fleet runs seven Material sites, and 9.8.0 prints an end-of-life notice. Verification: `pip index versions mkdocs-material` and the changelog date.
5. Do not teach `!ENV` or `!!python/name:` as durable; mark them MkDocs 1.x only. Rationale: 2.0 drops YAML. Verification: reading heuristic, any `mkdocs.yml` pin must keep `mkdocs<2`.

## AI-agent angle

- An agent trained before late 2025 treats Material as actively developed and MkDocs 2.0 as a drop-in upgrade. Catch: `grep -rn 'mkdocs' requirements*.txt pyproject.toml` must show `mkdocs<2` next to Material.
- An agent adds `[output.linkcheck]` with the `mdbook-linkcheck` crate to an mdBook 0.5 book. Catch: `mdbook build` fails with a render-context parse error, so run it once.
- An agent assumes Zensical needs `zensical.toml`. It does not; it reads `mkdocs.yml`.

## Contested and evolving

- Material's end-of-life date moved from November 2026 (9.7.6 notes, issue 8523, as relayed in a search summary) to 2027-05-05 (9.8.0 changelog). Trend: the changelog is the later and more direct source.
- Zensical is beta (0.1.0 on 2026-11-05, three months planned) and still adds plugin replacements weekly, so parity statements age fast.
- Which linkcheck fork becomes the lasting default is open; `linkcheck2` is labelled passively maintained in the manifest excerpt.
- MkDocs 2.0 stays at dev pre-releases; no stable date was found.

## Could not determine

- Whether `mdbook-linkcheck2` 0.13.0 builds against mdBook 0.5.4: no build was run, and the README states no supported mdBook range.
- Zensical behaviour for space-form fence info strings, `content.code.copy` by name, `navigation.path` by name and `!ENV` tags. The migration guide URL returned 404.
- mdBook search boost defaults and the `config.rs` `copyable` default: the changelog gives no change, but the source was not re-read.
- Whether pymdown-extensions 12.x and 13.x release years are 2026: the GitHub page printed only day and month.
- Python-Markdown `abbr` and `attr_list` impact on the pair's examples.

## Sources

| URL | What it is | Date or era | Why worth reading |
|---|---|---|---|
| https://squidfunk.github.io/mkdocs-material/changelog/ | Material changelog (primary) | to 2026-11-19 | 9.8.x, end of life |
| https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/ | Material blog on MkDocs 2.0 (primary) | 2026-02-18, updated 2026-10-02 | 2.0 impact |
| https://www.mkdocs.org/about/release-notes/ | MkDocs release notes (primary) | to 1.6.1 | strict and validation |
| https://github.com/mkdocs/mkdocs/releases | MkDocs releases (primary) | to 2024-08-30 | no 1.7 |
| https://pypi.org/pypi/mkdocs/json | PyPI release list (primary) | 2.0.dev0 to dev6 | 2.0 status |
| https://zensical.org/docs/changelog/ | Zensical changelog (primary) | Oct to Nov 2026 | beta state |
| https://zensical.org/compatibility/ | Zensical compatibility (primary) | 2026 | `mkdocs.yml` |
| https://zensical.org/docs/usage/build/ | Zensical build options (primary) | 2026 | `--strict` |
| https://zensical.org/docs/setup/validation/ | Zensical validation (primary) | 2026 | link and anchor checks |
| https://zensical.org/docs/setup/search/ | Zensical search (primary) | 2026 | non-lunr engine |
| https://python-markdown.github.io/changelog/ | Python-Markdown changelog (primary) | to 2026-11-25 | toc, abbr |
| https://facelessuser.github.io/pymdown-extensions/about/changelog/ | pymdown changelog (primary) | 12.x to 13.1 | fences, tabbed, snippets |
| https://github.com/facelessuser/pymdown-extensions/releases | pymdown releases (primary) | Sep to Nov 2026 | dates |
| https://raw.githubusercontent.com/rust-lang/mdBook/master/CHANGELOG.md | mdBook changelog (primary) | 0.5.3, 0.5.4 | front matter, linkcheck |
| https://github.com/rust-lang/mdBook/releases | mdBook releases (primary) | 0.5.4 latest | latest version |
| https://github.com/rust-lang/mdBook/pull/3132 | mdBook PR recommending linkcheck2 (primary) | 2026-06-08 | why linkcheck broke |
| https://crates.io/api/v1/crates/mdbook | crates.io metadata (primary) | to 2026-07-06 | exact dates |
| https://crates.io/api/v1/crates/mdbook-linkcheck2 | crates.io metadata (primary) | to 2026-08-16 | fork cadence |
| https://crates.io/api/v1/crates/mdbook-linkcheck | crates.io metadata (primary) | last 2022-10-03 | original is stale |
| https://github.com/Michael-F-Bryan/mdbook-linkcheck/issues | original crate issues (primary) | issue 96, 2025-11-24 | 0.5 breakage |
| https://github.com/marxin/mdbook-linkcheck2 | fork README (primary) | 2026 | config table |

---
title: Delta refresh decision for the docs-quality pair, 2026-09-05 to 2026-11-27
pair: docs-quality
date: 2026-11-27
window_start: 2026-09-05
model: opus
consolidates:
  - .agents/research/refresh-2026-11/docs-quality/python-side-generators-mkdocs-mdbook.md
  - .agents/research/refresh-2026-11/docs-quality/js-side-generators-vitepress-docusaurus-starlight-sphinx.md
  - .agents/research/refresh-2026-11/docs-quality/lint-and-link-checker-config-schemas.md
  - .agents/research/refresh-2026-11/docs-quality/tested-example-and-recording-tooling.md
  - .agents/research/refresh-2026-11/docs-quality/machine-readers-llms-txt-and-twins.md
  - .agents/research/refresh-2026-11/docs-quality/search-analytics-and-reader-signal-vendors.md
  - .agents/research/refresh-2026-11/docs-quality/style-standards-and-cited-references.md
  - .agents/research/refresh-2026-11/docs-quality/recent-shifts-uncovered-by-the-pair.md
revises:
  - .agents/research/docs-examples.md
  - .agents/research/docs-machine-readers-and-prior-art.md
  - .agents/research/docs-observability.md
  - .agents/research/docs-navigation-search.md
  - .agents/research/docs-plain-english.md
---

# Delta refresh decision for the docs-quality pair

This is a delta update of the pair as it stood on the 2026-09-05 baseline. It is not a re-creation. Every claim the eight delta artifacts found unchanged stays exactly as written. An edit is planned only where a fetched primary source shows that the pair's text is false on 2026-11-27, or where a primary source closes a gap the pair names.

## Contents

- [Verdict](#verdict)
- [Changed rules](#changed-rules)
- [New rules](#new-rules)
- [Confirmed unchanged](#confirmed-unchanged)
- [Open questions](#open-questions)
- [Revision log](#revision-log)
- [Edit list](#edit-list)

## Verdict

1. No new rule. No rule ID changes number or meaning, and no severity changes.
2. DOC-AGENT-01 stays at SHOULD. Its pinned condition needs one working twin configuration on all three generators. MkDocs Material (`mkdocs-llms-source` 1.2.0) and mdBook (`mdbook-llms` 0.4.1) now meet it. VitePress does not: `vitepress-plugin-llms` 1.15.0 regenerates each twin and emitted no twin for the root `index.md`. It also dropped the text inside a raw `<details>` block. That fails the rule's own diff and DOC-AGENT-03. The three configurations go into `machine-readers.md` as measured facts. The diff gains a `SUMMARY.md` exclusion, because mdBook correctly emits no twin of that file.
3. Fix the shipped `checks/lychee.toml`. It does not load on lychee 0.24.x: `base` is an unknown key under `deny_unknown_fields`, and `include_fragments` no longer accepts a boolean. Replace `base` with a `--root-dir` argument on the run command, because `root_dir` takes an absolute path only. Set `include_fragments = "anchor-only"`. The break predates the baseline. It is fixed here because the file is false today.
4. DOC-OBS-01's mdBook row names `mdbook-linkcheck`, which fails on mdBook 0.5. Name `mdbook-linkcheck2` and `[output.linkcheck2]` instead. Also correct the MkDocs row: `--strict` fails on a broken anchor only once `validation.anchors: warn` is set. Add one Zensical row, because Zensical validates links and anchors by default under `--strict`.
5. DOC-OBS-16 lists Fathom as carrying named events with properties. Fathom's own docs allow only a name and a numeric `_value`. Drop Fathom from the qualifying list. Plausible properties need its Business plan. The `traffic/views` call needs push access and returns 14 days only, so the verification needs a recorded sample at least every 14 days.
6. Bump stale version stamps in the DOC-EX mechanism table: Sybil 10.2.0, `@shikijs/vitepress-twoslash` 4.6.0, Deno 2.9.8. Correct the Node row, because type stripping was on by default from 23.6 and became stable in 24.12 and 25.2.
7. Smaller corrections: the Deno error-identifier row, the `vale.ini` rule count (134, not about 111) and the Google package org (`vale-cli`). Add Not studied lines for Zensical, for the IETF discovery draft, and for the Vercel file set, which has now been read. Reword the rule index's "no measured implementation" clause for the twin.
8. DOC-PLAIN-22's pinned note is not changed. The kernel's deprecation of `Assisted-by:` rests on press reports. The fetched kernel document still shows the pre-decision text, and the Fedora page was blocked. It goes to open questions.
9. Measurement statements such as "Measured on real builds of MkDocs Material 9.7.7, mdBook 0.5.3 and VitePress 2.0.0-alpha.16" stay. They record what was measured and are still true, even though newer releases exist.
10. Rule bump: patch, one corrected sentence. Reference skill bump: minor, because the twin configuration table and the Zensical row are new guidance.

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| DOC-AGENT-01 (verification) | `diff <(find docs -name '*.md' -printf '%P\n') ...` | Same diff with `! -name SUMMARY.md`, plus one sentence stating why | mdbook-llms 0.4.1 build on 2026-11-27 ([crates.io](https://crates.io/crates/mdbook-llms)), machine-readers delta Findings 1 |
| DOC-OBS-01 (verification) | `lychee --include-fragments --config checks/lychee.toml <build-dir>` | `lychee --root-dir "$PWD/<build-dir>" --include-fragments --config checks/lychee.toml <build-dir>` | [lychee.example.toml](https://raw.githubusercontent.com/lycheeverse/lychee/master/lychee.example.toml), [config/mod.rs](https://github.com/lycheeverse/lychee/blob/master/lychee-bin/src/config/mod.rs) |
| DOC-OBS-01 (generator table, mdBook) | The `mdbook-linkcheck` backend, enabled in `book.toml` | The `mdbook-linkcheck2` backend, enabled as `[output.linkcheck2]`. The original fails on mdBook 0.5. Output `book/html/` | [mdBook PR 3132](https://github.com/rust-lang/mdBook/pull/3132), [mdbook-linkcheck issues](https://github.com/Michael-F-Bryan/mdbook-linkcheck/issues), [mdbook-linkcheck2 README](https://github.com/marxin/mdbook-linkcheck2) |
| DOC-OBS-01 (generator table, MkDocs) | fails on a broken internal link or anchor | fails on a broken link, and on a broken anchor once `validation.anchors: warn` is set | [MkDocs release notes](https://www.mkdocs.org/about/release-notes/) |
| DOC-OBS-01 (generator table, new row) | none | Zensical: `zensical build --strict` exits 1, links and anchors checked by default | [Zensical validation](https://zensical.org/docs/setup/validation/), [Zensical build](https://zensical.org/docs/usage/build/) |
| DOC-OBS-01 (see block) | greps `mkdocs build --strict`, `mdbook-linkcheck`, `include-fragments` | adds `zensical build --strict` | as above |
| DOC-OBS-16 (verification) | Plausible, Umami and Fathom carry named events with properties | Umami on every plan and Plausible on its Business plan carry properties. Fathom carries a name and a numeric value only. `traffic/views` needs push access and returns 14 days, so sample at least every 14 days | [Fathom events](https://usefathom.com/docs/features/events), [Plausible custom props](https://plausible.io/docs/custom-props/introduction), [Umami pricing](https://umami.is/pricing), [GitHub REST traffic](https://docs.github.com/en/rest/metrics/traffic?apiVersion=2022-11-28) |
| DOC-OBS-18 (error table, Deno) | A page per class, so the class name and the page title are one fact | One section per class on the shared Errors page of the API docs | [Deno API docs](https://docs.deno.com/api/deno/~/Deno.errors.NotFound) |
| DOC-EX-03 (mechanism table) | Sybil 10.1.0; vitepress-twoslash 4.4.3 (2026-08-10); Deno 2.9.6 (2026-08-27); Node "stable since 23.6"; status as of September 2026 | Sybil 10.2.0; vitepress-twoslash 4.6.0 (2026-11-02); Deno 2.9.8 (2026-10-21); Node "on by default since 23.6 and stable since 24.12 and 25.2"; status as of November 2026 | [Sybil changes](https://sybil.readthedocs.io/en/latest/changes.html), [npm vitepress-twoslash](https://registry.npmjs.org/@shikijs%2fvitepress-twoslash), [Deno releases](https://github.com/denoland/deno/releases), [Node TypeScript docs](https://nodejs.org/docs/latest/api/typescript.html) |
| DOC-NAV-10 (sink table, Umami or Plausible row) | A named custom event with properties | Same, plus "Plausible carries properties on its Business plan only" | [Plausible custom props](https://plausible.io/docs/custom-props/introduction) |

Supporting files changed without a rule-row change: `checks/lychee.toml` (run line, `base` removed, `include_fragments` enum, validated-on header), `checks/vale.ini` (134 rules, `vale-cli` org), `checks.md` (lychee run command), `machine-readers.md` (twin configuration table, two Not studied bullets, the pinned paragraph), `examples.md` (Zensical Not studied bullet), `observability.md` (vendor Not studied bullet), and the rule index's Not studied clause.

Verification for each change:

- DOC-AGENT-01: on a built mdBook with `[output.llms]`, the amended diff prints nothing. Static check: `grep -c "! -name SUMMARY.md" skills/docs-quality-reference/machine-readers.md` returns 1.
- lychee config: `lychee --root-dir "$PWD/site" --config checks/lychee.toml --dump-inputs 'site/**/*.html'` raises no unknown-field or type error on lychee 0.24.2. Static checks: `grep -nE '^base =|^include_fragments = (true|false)' checks/lychee.toml` returns nothing.
- DOC-OBS-01 mdBook row: `grep -n 'output.linkcheck2' skills/docs-quality-reference/observability.md` returns 1 hit, and on a real book `mdbook build` exits 0 with that backend enabled.
- DOC-OBS-01 MkDocs row: `grep -n 'validation.anchors' skills/docs-quality-reference/observability.md` returns 1 hit.
- DOC-OBS-16: `grep -n 'Fathom' skills/docs-quality-reference/observability.md` shows Fathom only in the non-qualifying sentence.
- DOC-OBS-18: open the Deno URL above and confirm the title reads "Errors".
- DOC-EX-03 table: `grep -nE 'Sybil 10\.2\.0|twoslash` 4\.6\.0|Deno 2\.9\.8|24\.12' skills/docs-quality-reference/examples.md` returns 4 hits.
- vale.ini: `grep -n -e 'vale-cli/Google' -e '134 rules' skills/docs-quality-reference/checks/vale.ini` returns 2 hits.
- Dogfood: `python3 skills/docs-quality-reference/checks/prose.py rules/docs-quality.md skills/docs-quality-reference/*.md` still exits 0. This was run on a scratch copy with every edit below applied, and it exited 0.

## New rules

None. Three candidates were considered and rejected:

- A CONSIDER check for llms.txt v2 discovery links (`rel="alternate" type="text/markdown"`). It was rejected because the MkDocs plugin does not emit them, the v2 spec predates the window, and no consumer is shown to read them.
- Raising DOC-AGENT-03 to SHOULD for VitePress. One reproduced build is a real finding, but it is not a measured rate. The configuration table states the defect instead.
- The AsciiDoc verbatim-block caveat for the `//` opener. A competent author does not put the declaration inside a `----` block, and the first-12-lines rule already makes that unlikely.

## Confirmed unchanged

- **Generators.** VitePress stable is still 1.6.4, and `next` is 2.0.0-alpha.21. Sections open by default, depth past 6 is ignored, and `ignoreDeadLinks` defaults to false. The copy button stays unconditional in `preWrapper.ts`, and `::: code-group` syntax is unchanged. Docusaurus stable is still 3.10.2 with `markdown.format` defaulting to `'mdx'`, `onBrokenLinks: throw` and `onBrokenAnchors: warn`. `@mdx-js/mdx` is still 3.1.1. Starlight still uses `src/content/docs/` and Astro still writes `dist/`. Sphinx 9.1.1 and 9.2.0 changed nothing about `linkcheck`, `-n` or `-W`. The AsciiDoc `//` line comment never renders. mdBook 0.5.4 changed nothing about front matter, the fake `<h2>`, `copyable`, `runnable` or `editable`. pymdown-extensions 12.x and 13.x left the fence info-string parser, `tabbed` and `snippets` `auto_append` alone. The Python-Markdown `toc` slugify is unchanged.
- **Lint.** markdownlint 0.42.x and markdownlint-cli2 0.24.x changed no rule name, key or default the shipped config uses. MD025 `front_matter_title`, the MD054 booleans and MD040 `allowed_languages` are all unchanged. The Google package's four overridden rules are identical in v0.5.0 and v0.7.2. The `MinAlertLevel` default is still `suggestion`. Two separate packages still ship as vale-ai-tells.
- **Tested examples.** Twoslash is still 0.3.9. Sybil's `should_parse` still calls `Path.match`. `embedmd` last pushed 2026-04-11. Go has no Markdown runner. `cargo test --doc` and `mdbook test` (Rust only) are unchanged. `html_playground_url` is still required for Run buttons. The asciinema player still parses asciicast v1 to v3. The VHS `.tape` format is unchanged. WebContainers is still Chromium-only at full strength.
- **Machine readers.** The DOC-AGENT-04 awk still matches llms.txt v2 and all three plugins' output. The 97 percent and 1.1 percent figures still stand. Ahrefs (2026-06-15) is their origin, and mecanik.dev repeats them. The attribution is left as written, because the figures are correct. No major consumer has said it reads `llms.txt`. The passo.uno and Mintlify citations are unchanged. `AGENTS.md`, `SKILL.md` and MCP remain separate formats.
- **Search and signals.** lunr, minisearch and elasticlunr had no release, so DOC-NAV-11 holds. Pagefind 1.6.0 adds no zero-result hook, and `pagefind.search()` is still documented. Cloudflare Workers is still free up to 100,000 requests a day and $5 a month past that. GA4 `view_search_results` is still keyed to a URL parameter. GitHub Pages still exposes no visitor log. GoatCounter and Cloudflare Web Analytics still carry no properties. The giscus OAuth requirement and the `createDiscussion` schema are unchanged. The pair names DocSearch v4 nowhere, so the v5 change needs no edit.
- **Style and references.** The thresholds of 25 words, 5 sentences, 15 links and five troubleshooting topics are unchanged. So are Google's timeless-documentation list, Keep a Changelog 1.1.0 and the six categories. The Wikipedia 57 and 64 percent figures, Freeburg 2026, and DORA 2024 via Swimm are unchanged. The State of Docs 39 percent figure is already labelled 2025. Ably's bands, the ekline cost model, the Rust, Node, mypy and staticcheck error references, the WCAG 2.2 levels and NN/g's two levels are all unchanged. WCAG 3 is a Working Draft (2026-09-10), and no rule cites it. The GOV.UK move changes nothing in the pair, because the pair names the guidance and not a URL.

## Open questions

- **DOC-PLAIN-22 trailer ban.** Did the kernel merge the removal of the `Assisted-by:` requirement after the 2026-10-08 summit? Only The Register and Slashdot report it, and the live kernel document still shows the old text. Fedora's recommendation could not be read (the page was blocked). Re-check both primaries before rewording the pinned note.
- **Docusaurus 4.** Canary docs default `onBrokenAnchors` to `throw`. Recheck the Docusaurus row once `@docusaurus/core` `latest` reaches 4.0.0.
- **Zensical parity.** Is `content.code.copy` supported by name? Are `!ENV` tags read, and is the space-form info string handled? What is the output directory? The migration guide returned 404.
- **mdbook-linkcheck2 on mdBook 0.5.4.** No build was run, and the crate is labelled passively maintained in an unconfirmed manifest excerpt.
- **lychee bare flag against config.** Does a bare `--include-fragments` (anchor-only) override `include_fragments = "full"` in the config? Not documented, and not tested. The planned config uses `anchor-only`, so the two agree.
- **Python-Markdown 3.11.3 and 3.11.4 `abbr` and `attr_list` changes.** Whether any pair example depends on a multi-line abbreviation or a valueless attribute was not checked.
- **`go vet` and `Analyzer.URL`.** No fetched source confirms or refutes "does not print". Run a vet tool with a URL set before keeping the clause.
- **`rustc --explain`.** Not re-verified from a primary source.
- **DocSearch free-tier No Results Rate dashboard, and the GA4 DebugView last mile.** Both are still unconfirmed.
- **MyST-Parser 5.2.0.** Links to a third-or-later duplicate heading slug now warn with `myst.xref_missing`, which fails a `-W` build. This is an adopter upgrade hazard, not a rule defect. Decide at the next refresh whether the Sphinx row should name it.

## Revision log

- `rules/docs-quality.md`: the Not studied clause now says no study measures a twin's effect on agents, instead of claiming the twin has no implementation.
- `machine-readers.md`: the DOC-AGENT-01 diff excludes `SUMMARY.md`.
- `machine-readers.md`: a three-row twin configuration table replaces "no measured implementation", with two plugins to avoid.
- `machine-readers.md`: the twin-mechanics Not studied bullet is narrowed to VitePress.
- `machine-readers.md`: the discovery bullet records the Vercel five-file set as read and names the IETF individual draft of 2026-10-05.
- `machine-readers.md`: the pinned paragraph states which generators meet the return-to-MUST condition.
- `examples.md`: the mechanism table status date is November 2026.
- `examples.md`: Sybil 10.2.0.
- `examples.md`: `@shikijs/vitepress-twoslash` 4.6.0, published 2026-11-02.
- `examples.md`: Deno 2.9.8, released 2026-10-21.
- `examples.md`: the Node type-stripping stability versions are corrected.
- `examples.md`: a Zensical Not studied bullet is added.
- `observability.md`: the DOC-OBS-01 lychee command passes `--root-dir`.
- `observability.md`: the DOC-OBS-16 qualifying vendors and the `traffic/views` sampling are corrected.
- `observability.md`: the DOC-OBS-01 see block greps for `zensical build --strict`.
- `observability.md`: the Deno error row is corrected.
- `observability.md`: the MkDocs link row states the `validation.anchors: warn` requirement, and a Zensical row is added.
- `observability.md`: the mdBook link row names `mdbook-linkcheck2`.
- `observability.md`: the vendor Not studied bullet moves the gap from Umami to Plausible.
- `navigation.md`: the sink table states that Plausible carries properties on the Business plan only.
- `checks.md`: the lychee run command passes `--root-dir`.
- `checks/lychee.toml`: the run line passes `--root-dir`, and a validated-on header is added.
- `checks/lychee.toml`: `base` is removed.
- `checks/lychee.toml`: `include_fragments = "anchor-only"`.
- `checks/vale.ini`: the all-error package has 134 rules.
- `checks/vale.ini`: the Google package URL moves to the `vale-cli` org.

## Spillover

- `skills/docs-instrument/references/wiring-by-generator.md`, mdBook row: it names `mdbook-linkcheck`, which fails on mdBook 0.5. Name `mdbook-linkcheck2` with `[output.linkcheck2]`. Its VitePress row says "none shipped", but `vitepress build` fails on a dead link by default (`ignoreDeadLinks: false`). Its `lychee --include-fragments <dir>` fallbacks need `--root-dir` for root-relative links.
- `skills/docs-instrument/references/reader-signals.md`, vendor table: it says Plausible has named custom events "on every plan", but properties are Business-plan only. Umami's free tier is confirmed at the vendor's page ($0 Hobby, 100K events). Fathom carries events with a numeric value only and no properties.

## Edit list

Apply these entries in order. Each find string occurs exactly once in its file, and all 26 were applied and checked on a scratch copy. Text inside each fence is verbatim, with no added indentation. Paths are relative to the repository root.

### 1. `rules/docs-quality.md`, replace

Find:

````text
  page's age, and the Markdown twin has no measured implementation anywhere.
````

Replace with:

````text
  page's age, and no study measures a Markdown twin's effect on agents.
````

### 2. `skills/docs-quality-reference/machine-readers.md`, replace

Find:

````text
`diff <(find docs -name '*.md' -printf '%P\n') <(find "$OUT" -name '*.md' -printf '%P\n')` with `$OUT` set to the build output directory.
````

Replace with:

````text
`diff <(find docs -name '*.md' ! -name SUMMARY.md -printf '%P\n') <(find "$OUT" -name '*.md' -printf '%P\n')` with `$OUT` set to the build output directory. `SUMMARY.md` is excluded because mdBook correctly emits no twin of it.
````

### 3. `skills/docs-quality-reference/machine-readers.md`, replace

Find:

````text
The twin has no measured implementation anywhere. Before adopting
DOC-AGENT-01, build the site once. Then check whether a `.md` file placed beside
a page reaches the output directory at that page's own path.
````

Replace with:

````text
Three third-party plugins emit a per-page twin. Each was built once on a
two-page site on 2026-11-27.

| Generator | Plugin and config | Result |
|---|---|---|
| MkDocs Material | `mkdocs-llms-source` 1.2.0, as `- llms-source` under `plugins:`, with `site_url` set | Copies each source file verbatim, so the DOC-AGENT-01 diff passes |
| mdBook | `mdbook-llms` 0.4.1, as an empty `[output.llms]` table beside `site-url` under `[output.html]` | Writes from the preprocessed book. The second backend moves HTML output to `book/html/` |
| VitePress | `vitepress-plugin-llms` 1.15.0, in `vite.plugins` | Regenerates each twin, skipped the root `index.md`, and dropped the text of a raw `<details>` block |

Pin the plugin version, because each one has a single maintainer. Skip
`mkdocs-llmstxt`, which rebuilds Markdown from HTML and is in maintenance mode.
Skip `mdbook-llms-txt-tools`, which emits no per-page twin. Before adopting
DOC-AGENT-01, build the site once and run its diff. Without a plugin, check
whether a `.md` file placed beside a page reaches the output directory at that
page's own path.
````

### 4. `skills/docs-quality-reference/machine-readers.md`, replace

Find:

````text
- **Twin generation mechanics.** Whether MkDocs Material, VitePress or mdBook can
  emit a per-page twin with no custom plugin. Nobody has measured it, and this
  gap is why DOC-AGENT-01 ships at SHOULD.
````

Replace with:

````text
- **Twin generation on VitePress.** The one plugin built regenerates the twin
  instead of copying the source, and it lost collapsed text. This gap is why
  DOC-AGENT-01 ships at SHOULD.
````

### 5. `skills/docs-quality-reference/machine-readers.md`, replace

Find:

````text
- **Discovery files beyond `llms.txt`.** Vercel layers five files on top of
  per-page twins. That set has not been read or costed.
````

Replace with:

````text
- **Discovery files beyond `llms.txt`.** Vercel's agent-resources page, updated
  2026-11-14, lists five site-wide files on top of per-page twins. They have
  been read, not costed. An IETF individual draft of 2026-10-05,
  `draft-arsentev-llm-context-discovery-01`, proposes a `Link` header, a
  `/.well-known/llm-context` URI and a `robots.txt` record. It is not IETF
  consensus and cites no implementation.
````

### 6. `skills/docs-quality-reference/machine-readers.md`, replace

Find:

````text
DOC-AGENT-01 returns to MUST when one working twin configuration exists on
MkDocs Material, VitePress and mdBook.
````

Replace with:

````text
DOC-AGENT-01 returns to MUST when one working twin configuration exists on
MkDocs Material, VitePress and mdBook. On 2026-11-27 MkDocs Material and mdBook
have one. VitePress does not, because its plugin fails the DOC-AGENT-01 diff and
DOC-AGENT-03.
````

### 7. `skills/docs-quality-reference/examples.md`, replace

Find:

````text
language. Status is as of September 2026.
````

Replace with:

````text
language. Status is as of November 2026.
````

### 8. `skills/docs-quality-reference/examples.md`, replace

Find:

````text
| Python | Sybil 10.1.0, over
````

Replace with:

````text
| Python | Sybil 10.2.0, over
````

### 9. `skills/docs-quality-reference/examples.md`, replace

Find:

````text
`@shikijs/vitepress-twoslash` 4.4.3 for VitePress | Current, published 2026-06-22 and 2026-08-10 |
````

Replace with:

````text
`@shikijs/vitepress-twoslash` 4.6.0 for VitePress | Current, published 2026-06-22 and 2026-11-02 |
````

### 10. `skills/docs-quality-reference/examples.md`, replace

Find:

````text
Deno 2.9.6 | Current, released 2026-08-27 |
````

Replace with:

````text
Deno 2.9.8 | Current, released 2026-10-21 |
````

### 11. `skills/docs-quality-reference/examples.md`, replace

Find:

````text
type-stripping only, stable since Node 23.6 | Current |
````

Replace with:

````text
type-stripping only, on by default since Node 23.6 and stable since 24.12 and 25.2 | Current |
````

### 12. `skills/docs-quality-reference/examples.md`, insert after anchor

Anchor:

````text
- Sphinx and reStructuredText fence behaviour. The `..` and `%` carriers rest
  on primary documentation with no built fixture.
````

Insert directly after the anchor. The inserted text starts with a newline, so the new bullet begins on its own line with no blank line before it:

````text

- Zensical. Material for MkDocs takes critical fixes only, until 2027-05-05
  (its 9.8.0 changelog). MkDocs 2.0 exists only as pre-releases and does not
  read `mkdocs.yml`. Zensical reads `mkdocs.yml` on the same Python-Markdown
  and SuperFences stack, so DOC-EX-20, DOC-EX-21 and DOC-EX-24 are expected to
  hold there. None of them was measured on it, and it is at beta 0.1.x.
````

### 13. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
or run `lychee --include-fragments --config checks/lychee.toml <build-dir>` after the build.
````

Replace with:

````text
or run `lychee --root-dir "$PWD/<build-dir>" --include-fragments --config checks/lychee.toml <build-dir>` after the build.
````

### 14. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
Plausible, Umami and Fathom carry named events with properties. GoatCounter and Cloudflare Web Analytics do not, so they do not qualify. A repo with no generator and no site runs `gh api repos/<owner>/<repo>/traffic/views` instead, and that call must return 200.
````

Replace with:

````text
Umami on every plan and Plausible on its Business plan carry named events with properties. Fathom events carry only a name and a numeric value. GoatCounter and Cloudflare Web Analytics carry no properties. None of those three qualifies. A repo with no generator and no site runs `gh api repos/<owner>/<repo>/traffic/views` instead, with a token holding push access, and that call must return 200. It returns the last 14 days only, so the manifest records a sample at least every 14 days.
````

### 15. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
  | xargs -0 -r grep -H -n -e 'mkdocs build --strict' -e mdbook-linkcheck -e include-fragments --
````

Replace with:

````text
  | xargs -0 -r grep -H -n -e 'mkdocs build --strict' -e 'zensical build --strict' -e mdbook-linkcheck -e include-fragments --
````

### 16. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
| A page per class, so the class name and the page title are one fact |
````

Replace with:

````text
| One section per class on the shared Errors page of the API docs |
````

### 17. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
| MkDocs Material | `mkdocs build --strict` fails on a broken internal link or anchor. Measured on 7 of 9 sites (7 of 9, `wave2-calibration-a.md` §3) | `site/` |
````

Replace with:

````text
| MkDocs Material | `mkdocs build --strict` fails on a broken internal link, and on a broken anchor once `validation.anchors: warn` is set, because anchors default to `info`. Measured on 7 of 9 sites (7 of 9, `wave2-calibration-a.md` §3) | `site/` |
| Zensical | `zensical build --strict` exits 1 on a broken link or anchor, both checked by default. Beta 0.1.x in 2026-11 | not confirmed here |
````

### 18. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
| mdBook | The `mdbook-linkcheck` backend, enabled in `book.toml` | `book/` |
````

Replace with:

````text
| mdBook | The `mdbook-linkcheck2` backend, enabled as `[output.linkcheck2]` in `book.toml`. The original `mdbook-linkcheck` fails on mdBook 0.5 | `book/html/`, because a second backend moves HTML there |
````

### 19. `skills/docs-quality-reference/observability.md`, replace

Find:

````text
- **Vendor figures behind DOC-OBS-16 are second-hand for one vendor.** Umami's
  own pricing page did not render to a fetch, so its hosted-tier numbers come
  from third parties. The self-host cost and license are confirmed directly.
````

Replace with:

````text
- **Vendor figures behind DOC-OBS-16 are second-hand for one vendor.**
  Plausible's own pricing page returned 404 on 2026-11-27, so its tier prices
  come from its homepage listing. Umami's pricing page confirms a $0 tier and a
  $20 tier, read on the same day.
````

### 20. `skills/docs-quality-reference/navigation.md`, replace

Find:

````text
| A named custom event with properties, landing in the dashboard you already read. |
````

Replace with:

````text
| A named custom event with properties, landing in the dashboard you already read. Plausible carries properties on its Business plan only. |
````

### 21. `skills/docs-quality-reference/checks.md`, replace

Find:

````text
`lychee --include-fragments --config checks/lychee.toml 'site/**/*.html'`
````

Replace with:

````text
`lychee --root-dir "$PWD/site" --include-fragments --config checks/lychee.toml 'site/**/*.html'`
````

### 22. `skills/docs-quality-reference/checks/lychee.toml`, replace

Find:

````text
# Run with: lychee --config checks/lychee.toml 'site/**/*.html'
````

Replace with:

````text
# Run with: lychee --root-dir "$PWD/site" --config checks/lychee.toml 'site/**/*.html'
# Keys checked against lychee 0.24.2, whose config rejects any unknown key.
````

### 23. `skills/docs-quality-reference/checks/lychee.toml`, replace

Find:

````text
# root. Without this a raw pass reports every /docs/... link as dead.
base = "site"
````

Replace with:

````text
# root. Without this a raw pass reports every /docs/... link as dead.
# The root_dir key takes an absolute path only, so the run command passes it
# as --root-dir. The old base key aborts the run on lychee 0.24.
````

### 24. `skills/docs-quality-reference/checks/lychee.toml`, replace

Find:

````text
include_fragments = true
````

Replace with:

````text
# An enum since lychee 0.24.0: none, anchor-only, text-only or full.
include_fragments = "anchor-only"
````

### 25. `skills/docs-quality-reference/checks/vale.ini`, replace

Find:

````text
# rules and one with about 111 rules all at error. Resolving by display name
````

Replace with:

````text
# rules and one with 134 rules all at error. Resolving by display name
````

### 26. `skills/docs-quality-reference/checks/vale.ini`, replace

Find:

````text
Packages = https://github.com/errata-ai/Google/releases/download/v0.5.0/Google.zip
````

Replace with:

````text
# The org moved from errata-ai to vale-cli, and the old URL only redirects.
Packages = https://github.com/vale-cli/Google/releases/download/v0.5.0/Google.zip
````


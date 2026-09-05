---
title: Search contract and zero-result loop
topic: search-contract-and-zero-result-loop
group: docs-navigation-search
agent: docs-research-wave1
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 16
scope: >
  What a docs site owes a reader whose search finds nothing: whether the fleet's
  3 client-side search stacks can report a zero-result query at all, the cheapest
  capture mechanism per stack, the empty-state copy contract, and the review loop
  that turns a repeated query into a page or a reworded heading. Does not cover
  nav depth/IA (owned by nav-depth-and-information-architecture), general site
  analytics or feedback widgets beyond search (owned by minimum-instrumentation-set),
  or a full hosted-search vendor bake-off beyond Algolia DocSearch's cost/benefit
  as one named upgrade path.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The fleet's search stacks, and why none can see a zero result](#f1)
  2. [What the generators' own docs do and don't expose](#f2)
  3. [The capture layer: mechanism and a three-way cost comparison](#f3)
  4. [Algolia's remediation playbook vs. what actually transfers](#f4)
  5. [Query behavior numbers that should shape the design](#f5)
  6. [Baymard's query taxonomy mapped onto docs](#f6)
  7. [The empty-state contract](#f7)
  8. [The review loop and the overlap test](#f8)
  9. [Checkable from a repo checkout vs. needs a live site](#f9)
- [Normative guidance candidates](#normative)
- [AI-agent angle](#ai-angle)
- [Contested / evolving](#contested)
- [Sources](#sources)

## Summary

- All 9 of the fleet's real docs sites run client-side-only search (7 MkDocs Material/lunr, 1 VitePress/minisearch, 1 mdBook/elasticlunr) and 0 of 9 can report a zero-result query today — none of the three engines' documented configuration surfaces expose a search-analytics or zero-result hook.
- A zero-result query is the cheapest, already-computed content-gap signal a docs site can mine — capturing it needs no new instrumentation category, only reading what the search box already knows client-side.
- Require a capture layer, not a migration: wrap the existing search UI's rendered "no results" state in a small client-side script that fires one named event; treat Pagefind or Algolia DocSearch as optional upgrades, never a precondition.
- Standardize the capture contract on one name across all three generators — e.g. `CustomEvent('docs:zero-result-search', {detail:{query}})` — so one grep proves the capture layer exists regardless of which engine a repo runs.
- Material for MkDocs's own docs mention tracking "site search" via Google Analytics 4 Enhanced Measurement, but that auto-capture depends on the query showing up as a URL parameter, which Material's overlay-style client search does not reliably produce — treat this as unverified, not as a working substitute for the beacon.
- None of the fleet's 3 search engines (lunr, minisearch, elasticlunr) expose a documented synonyms configuration; Algolia's remediation playbook (`synonyms`, `removeWordsIfNoResults`, `optionalWords`, `ignorePlurals`) does not transfer to this fleet as a config change — the working fix is rewording a heading, not editing a search config file.
- NN/g measured first-query search success at 51%, falling to 32% on a second attempt and 18% on a third, with roughly half of failed searchers abandoning outright — design the empty state to give one productive next step inline, because there is usually no second try to correct it.
- Mean query length is ~2 words (NN/g) — boost titles and headings over body prose in the search config, because that's what a 2-word query actually matches.
- Baymard's worst-performing ecommerce query class, "non-product"/informational queries (66% of sites fail them), is the direct analogue of a docs "how do I…" conceptual query a keyword index structurally cannot resolve — route that class to a written page, not a smarter index.
- Use Atlassian's three-part empty-state template (title, one-or-two-sentence body, one imperative CTA) for both a zero-result search state and an empty/stub docs section; 0 of the fleet's 9 sites authored either, or a custom 404.
- Classify every recurring zero-result query (≥2 occurrences) with the overlap test: does existing content already cover it under different words (vocabulary problem, reword it) or does nothing answer it (real gap, file it)? Skipping this split turns the log into unmanaged noise.
- Trigger the log review by volume, not the calendar: review once ≥20 new zero-result events have accumulated since the last review, or at every tagged release, whichever comes first — a fixed monthly cadence assumes traffic this fleet doesn't have.
- A "gap" disposition becomes a `docs`-labeled issue quoting the literal query string, not a page written on the spot — issue-first keeps the log auditable.
- Algolia DocSearch is free for eligible open-source docs sites and its base Analytics ships a "No Results Rate" plus a "Searches without Results" drill-down with no paid add-on required, but it needs an application/approval cycle and a visible attribution link — a fit for a site that wants search analytics without writing the beacon, not a default.
- Pagefind ships no built-in analytics either, but `pagefind.search()` is a documented, stable public API — a beacon written against it survives generator upgrades in a way a beacon patched into an engine's internal search worker does not.
- Material for MkDocs's custom-search-worker override point was reported broken (issue #2973: a set `worker:` path was silently ignored) and the issue is now closed/resolved, unreleased at time of closure — treat "override the worker" as evolving, not as a settled, currently-reliable mechanism.
- No conflict-table row in the topic map names this topic as owner; the brief's open decisions (synonym maps, empty-state shape, review cadence) are resolved directly in this file rather than inherited from a named conflict.

## Findings

### 1. The fleet's search stacks, and why none can see a zero result {#f1}

The fleet's 9 real docs sites run exactly 3 client-side search implementations, confirmed against each generator's own config or docs:

| Site(s) | Engine | Confirmed by |
|---|---|---|
| 7 MkDocs Material sites (`ocx-catalog`, `ocx-mirror`, `ocx-mcp`, `ocx-mirror-sdk`, `ocx-sdk-python`, `ocx-indexbot`, `grimoire-indexer`) | lunr + lunr-languages, index built at `mkdocs build` time | [Material for MkDocs: Setting up site search](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) — "an excellent client-side search implementation, omitting the need for the integration of third-party services," built on `lunr`/`lunr-languages` |
| `ocx` (VitePress) | minisearch, index built at `vitepress build` time | [VitePress: Local Search](https://vitepress.dev/reference/default-theme-search) |
| `grimoire` (mdBook) | bundled `searcher.js`, index built at `mdbook build` time | [mdBook: Renderers — `[output.html.search]`](https://rust-lang.github.io/mdbook/format/configuration/renderers.html) — search `enable`d by default, config keys `limit-results`, `boost-title`, `boost-hierarchy`, `boost-paragraph`, `expand`, no engine name stated on this page, `copy-js` ships the plain JS into the output |

All three run entirely client-side with no server callback (confirmed on each fetched page). `ux-observability-posture.md` §2 independently measured the same 9/9 client-side split by config inspection and found **0/9 with any zero-result or search-analytics instrumentation** (`grep -rliE "zero.result|search.analytics"` across all 9 repos: no hits). That is the fleet's real blocker named in the brief: it isn't that nobody wired up a dashboard, it's that the compute happens entirely in the reader's browser and nothing ships it anywhere.

### 2. What the generators' own docs do and don't expose {#f2}

Checked directly against each engine's official configuration reference, none exposes a documented zero-result or search-analytics hook:

- **Material for MkDocs** — the site-search setup page documents feature flags (`search.suggest`, `search.highlight`, `search.share`) and a plugin toggle, nothing about tracking. A **separate** page, [Setting up site analytics](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-analytics/), does say: *"Besides page views and events, site search can be tracked to better understand how people use your documentation."* The instructions are to enable Google Analytics 4's **Enhanced Measurement → Site Search** toggle in the GA4 admin UI — no `mkdocs.yml` key of its own. GA4's site-search auto-capture works by watching for a configured query-string parameter (e.g. `?q=`) on a page view; Material's search is a JS overlay that filters an in-memory index without reloading the page or writing a query parameter into the URL bar in the way GA4 expects. Whether the GA4 event actually fires for Material's overlay search was not confirmed by any fetched source — flag it, don't ship it as verified.
- Material also has a documented **custom search worker** override point (`main.html` override setting `var __search = { worker: "./worker.js" }`), which is the one place a project could intercept results before rendering. [`squidfunk/mkdocs-material#2973`](https://github.com/squidfunk/mkdocs-material/issues/2973) reported this setting silently ignored (the built-in worker always ran instead); the issue is now closed and labeled resolved, unreleased at time of closure — the fix's landed version, and whether the fleet's pinned 9.7.7 has it, was not independently checked.
- **VitePress local search** — the reference page documents `options` (indexing/tokenization) and `searchOptions` (`{fuzzy: 0.2, prefix: true, boost: {title: 4, text: 2, titles: 1}}`), a custom `_render` preprocessing hook, and i18n labels. No hook or event for search analytics or zero-result queries anywhere on the page ([VitePress: Local Search](https://vitepress.dev/reference/default-theme-search)).
- **mdBook** — the `[output.html.search]` table documents ranking/limit knobs only (`limit-results`, `boost-title`, `boost-hierarchy`, `boost-paragraph`, `teaser-word-count`, `use-boolean-and`, `expand`, `heading-split-level`). No event/hook documented ([mdBook: Renderers](https://rust-lang.github.io/mdbook/format/configuration/renderers.html)). Because `copy-js: true` ships the search JS as a plain file in the book's own output, it is at least directly readable/patchable — unlike Material's compiled worker — but still fully unofficial.

### 3. The capture layer: mechanism and a three-way cost comparison {#f3}

Three ways to get a zero-result signal out of a static docs site, in cost order:

1. **DOM-level beacon on the existing engine (cheapest, no migration).** Every one of the 3 engines already renders a visible "no results" state in the page (that's how a human reader knows to stop typing). A small script — `extra_javascript` in MkDocs, a theme enhancement in VitePress, an extra `<script>` in mdBook's `additional-js` — watches that rendered state (a `MutationObserver` on the results container, or wrapping the input's existing change handler) and fires one event when it appears. Cost: ~20–30 lines of JS per site, zero build-pipeline change, works today. Ceiling: it's watching each theme's own DOM shape, which can change on a theme upgrade — mitigate by watching for the engine's own localized "no results" *string* rather than a specific CSS class, which is more stable across theme versions.
2. **Migrate to Pagefind, then beacon its public API.** [Pagefind](https://pagefind.app/) is "a fully static search library that aims to perform well on large sites... without hosting any infrastructure," splitting its index into chunks so a browser search "only ever needs to load a small subset" — measured at "a full-text search on a 10,000 page site with a total network payload under 300kB... for most sites, this will be closer to 100kB." It ships a JS search API (`pagefind.search(term)` → a promise of `.results`) that a project's own UI calls directly. The fetched page documents no built-in analytics or zero-result hook either — the beacon code is the same `results.length === 0` check as option 1 — but it's written against a **documented public contract**, not a monkey-patched internal file, so it doesn't share Material's worker-override fragility. Cost: a real migration (disable the generator's built-in search plugin, wire a custom Pagefind UI); worth it for sites that also want Pagefind's chunked-index scaling, not worth it for the zero-result signal alone.
3. **Switch to hosted search (Algolia DocSearch).** [DocSearch](https://docsearch.algolia.com/docs/what-is-docsearch/) is "free for eligible documentation sites," requires an application/approval and indexing phase, and requires keeping a visible "Search by Algolia" attribution link. DocSearch runs on Algolia's core search product, whose [base Analytics](https://www.algolia.com/doc/guides/search-analytics/concepts/metrics) includes a "No Results Rate" chart on the Overview tab plus a "Searches without Results" drill-down, confirmed as **base functionality, not a paid add-on** (no pricing callout on that metric, unlike revenue-related ones). Whether that same dashboard view is surfaced to a free DocSearch-program site specifically (vs. a paying Algolia Search customer) was not independently confirmed — the DocSearch page itself doesn't mention analytics at all. Cost: lowest engineering effort (no beacon to write), highest dependency cost (external service, approval lead time, attribution requirement).

Decision: require option 1 fleet-wide (cheap, no migration, works on all 3 current engines); name options 2 and 3 as legitimate upgrades a site may choose for other reasons, never as a substitute requirement.

### 4. Algolia's remediation playbook vs. what actually transfers {#f4}

Algolia's own guide to [empty or insufficient results](https://www.algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results/) gives five concrete levers, in a recommended rollout order:

1. `removeStopWords` — drop words like "the"/"a"/"it" from matching requirements.
2. `ignorePlurals` — treat singular/plural as equivalent ("spy" also matches "spies").
3. `synonyms` — an explicit vocabulary map for domain terminology and spelling variants.
4. `removeWordsIfNoResults` — on a multi-word query with zero hits, iteratively drop one word and rerun.
5. `optionalWords` — switch from AND-matching to OR-matching so partial-term records still surface, ranked below full matches.

None of these five is exposed as a documented configuration key in any of the fleet's 3 real engines (confirmed against the fetched Material, VitePress, and mdBook configuration references in Finding 2) — MkDocs Material's search config surface is feature flags, not a query-relaxation pipeline; VitePress's `searchOptions` covers fuzziness (`fuzzy: 0.2`, a typo-tolerance lever, not a synonym map) and field boosting only; mdBook's config is ranking-boost knobs only. This is a genuine, checkable finding, not an assumption: an agent reaching for "add a synonyms block to `mkdocs.yml`" will write a no-op. The working substitute available to all three engines is content-side: add the reader's literal phrase to a heading or an explicit "also called" line on the page that already covers the concept (see DOC-SEARCH-03).

### 5. Query behavior numbers that should shape the design {#f5}

[NN/g, "Search: Visible and Simple"](https://www.nngroup.com/articles/search-visible-and-simple/):

- Making search a visible type-in field (instead of a link to a search page) drove a **91% increase** in search use on the cited case (useit.com).
- Search success rate: **51%** on the first query, **32%** on the second, **18%** on the third — and roughly **half** of readers whose first search fails **abandon** rather than retry.
- Mean query length: **2.0 words**.
- "Users almost never look beyond the second page of search results" — first-result-screen quality dominates.

Implication for this fleet: the search box itself is already solved (all 3 engines ship one by default, per `ux-observability-posture.md` §1/§2's framework-default-affordances finding) — the gap is entirely on the empty-state and the review loop, and the design has to assume there is usually no second attempt to correct a bad first answer. It also means index/boost tuning should weight titles and headings, since a 2-word query is going to match a title-length string, not a paragraph.

### 6. Baymard's query taxonomy mapped onto docs {#f6}

[Baymard, "Ecommerce Search Query Types"](https://baymard.com/blog/ecommerce-search-query-types) classifies query intent into 8 categories with a measured site-failure rate for each (percentage of *sites* that fail to handle that query type adequately):

| Query type | Failure rate | Docs analogue |
|---|---|---|
| Exact (model number, product name) | 12% | Exact command/flag/class name |
| Product type (category) | 20% | A feature area name |
| Feature (attribute) | 39% | A config option or flag's behavior |
| Use case | 43% | "how do I get X to do Y" |
| Abbreviation/symbol | 54% | An acronym or a flag alias |
| Compatibility | 44% | "does X work with Y" |
| Symptom | 37% | An error message or failure symptom |
| Non-product (site content, policy) | **66%** (highest) | A conceptual "how do I…" / troubleshooting query with no single matching noun |

The **non-product** class is the worst-performing everywhere it's been measured, and it's structurally the same failure as a docs reader typing a task or symptom rather than a term the page actually uses. A keyword index (lunr/minisearch/elasticlunr — all 3 fleet engines) has no way to bridge that gap through relevance tuning, because there's no shared token to boost. The fix is content, not search config: route that query class straight to a new how-to or troubleshooting page (see DOC-SEARCH-08).

### 7. The empty-state contract {#f7}

[Atlassian Design: Empty states](https://atlassian.design/foundations/content/designing-messages/empty-state) specifies a three-part template:

1. **Title** — informative, scannable, sentence case, no punctuation (unless a question).
2. **Body** — one or two sentences: the reason the state exists, and where to go next. No jargon, don't repeat the title.
3. **CTA** — imperative verb, one or two words, one action.

**Bad** (typical undecorated engine default, what all 9 fleet sites currently ship — a bare title, no body, no CTA):

```
No results for "kubernetes deploy"
```

**Good** (three-part, applied to a docs zero-result state):

```
No results for "kubernetes deploy"
We don't have a page using that exact wording yet.
[ Browse all guides → ]
```

The same three-part shape applies to an empty/stub docs section (a page that exists in the nav but has no content yet):

**Bad:**

```
## Advanced configuration
TODO
```

**Good:**

```
## Advanced configuration
This section isn't written yet. If you need it now, check the CLI reference
or open an issue and we'll prioritize it.
[ Open an issue → ]
```

0 of the fleet's 9 sites authored a zero-result template or a custom 404 (`ux-observability-posture.md` §3); every site currently falls back to the engine's bare default, or (for 404s) a generic themed page nobody wrote page-specific content for.

### 8. The review loop and the overlap test {#f8}

Zero-result mining is a mature, named practice outside docs (ecommerce, support desks) that transfers directly, per `docs-topic-map/codified-practice.md` §8: a documented **"overlap test"** distinguishes a search/IA problem (missing synonyms, bad tagging — content exists, wrong words) from an actual content gap (no page exists for what's being searched) — the same source cites a B2B case with 23% zero-result queries concentrated in three topic clusters. Algolia's own guide reinforces the same loop: *"Review... which searches don't return any results... to make intelligent choices about your content, search, and Index settings."*

Applied here as a two-branch, checkable classifier for every query recurring ≥2 times in the capture log:

- **Vocabulary branch** — grep the built site's rendered text (or the source markdown) for the query's stemmed terms; if a near-match already exists on some page, the disposition is "reword" — add the reader's literal phrase to a heading or an "also called" line (DOC-SEARCH-03).
- **Gap branch** — if nothing matches, the disposition is "content gap" — file a `docs`-labeled issue quoting the literal query string; it becomes a candidate new page or FAQ entry, not a page written on the spot.

Neither branch is optional and neither substitutes for the other: rewording without checking for a real gap misses content the fleet actually needs; writing a page for every query without checking for an existing near-match inflates the page count for something a heading fix would have solved.

### 9. Checkable from a repo checkout vs. needs a live site {#f9}

What a lint/grep/build-time check can actually see, and what needs a rendered site or real traffic:

| Checkable from a checkout | Needs a live/rendered site or real traffic |
|---|---|
| The capture-layer script exists and names the standard event (`grep`) | Whether the GA4 site-search event actually fires for a given theme |
| The empty-state template has exactly one CTA link and no placeholder string | Whether readers actually see/use the CTA |
| A page's rendered text contains the literal phrase from a "reworded" zero-result query | The true zero-result rate or query volume (needs the capture layer running in production first) |
| An open `docs`-labeled issue exists quoting a given gap query | Whether Material's GA4 auto-capture depends on a URL query param for this specific theme build (a DebugView observation) |

This split matters because it sets what this rule can gate in CI (presence of the capture layer, the template shape) versus what only a review cadence over live data can catch (the actual overlap-test dispositions).

## Normative guidance candidates {#normative}

1. **DOC-SEARCH-01 — Require a zero-result capture layer, not a specific engine.** Every real docs site (identified by a generator config: `mkdocs.yml`, `.vitepress/config.*`, or `book.toml`) must fire one detectably-named signal when its client-side search returns 0 results — e.g. `window.dispatchEvent(new CustomEvent('docs:zero-result-search', {detail:{query}}))`.
   *Rationale:* prevents the single highest-leverage, already-computed content-gap signal from being silently dropped, as it is on all 9 fleet sites today.
   *Verify:* `grep -rl "docs:zero-result-search"` (or the chosen literal name) over the site's source finds at least one file; a build-time check can additionally confirm the string survives into the compiled JS bundle.
   *Evidence:* asserted — no prior art ships this exact contract; derived from the zero-result-mining practice (`codified-practice.md` §8) applied to this fleet's stack.

2. **DOC-SEARCH-02 — Don't trust GA4 site-search auto-capture until you've watched it fire.** If a Material for MkDocs site enables Google Analytics per its own site-analytics guide, don't count that as satisfying DOC-SEARCH-01 until a real zero-result search has been observed landing an event in GA4 DebugView.
   *Rationale:* Material's client search is a JS overlay, not a URL-navigating query — GA4's auto-capture assumption (a query-string parameter) may not hold; this closes the one false-confidence gap the fleet is likely to reach for because it's the only search-tracking mention in any fetched official doc.
   *Verify:* manual — perform a known-zero-result search on the deployed site, confirm the event in GA4 DebugView within the session. Mark unverifiable by static repo checkout.
   *Evidence:* argued — built on a fetched primary claim plus a documented mechanical limitation of client-router-less search; not independently observed firing either way.

3. **DOC-SEARCH-03 — Reword before you reconfigure.** Fix a "vocabulary" zero-result query by adding the reader's literal phrase to a heading, subheading, or an explicit "also called" line on the page that already covers it — not by looking for a `synonyms`/`removeWordsIfNoResults`-style config key, which none of lunr, minisearch, or elasticlunr expose in their fleet-facing configuration surface.
   *Rationale:* stops an agent from burning a cycle hunting for an Algolia-style config key that doesn't exist for any of this fleet's 3 real engines.
   *Verify:* the fix is a diff to the affected page's markdown; a script confirms the query's stemmed terms now appear in the page's rendered/built text.
   *Evidence:* measured — confirmed by fetching the official configuration reference for all 3 engines and finding no synonyms key on any of them.

4. **DOC-SEARCH-04 — Classify every repeated zero-result query with the overlap test.** A query recurring ≥2 times gets exactly one of two dispositions: "vocabulary" (existing content near-matches once stemmed → reword, DOC-SEARCH-03) or "gap" (nothing matches → file a `docs`-labeled issue quoting the literal query). No third bucket, no silent drop.
   *Rationale:* an unclassified zero-result log becomes noise nobody reads; the fleet's 0/9 docs-issue-template rate shows requests today have nowhere to land at all.
   *Verify:* a script flags any log entry older than 30 days with neither disposition tag recorded.
   *Evidence:* codified — the overlap test is a named practice (`codified-practice.md` §8), applied here as an explicit two-branch check.

5. **DOC-SEARCH-05 — Review the log on a volume trigger, not a calendar date.** Review the zero-result log when it has accumulated ≥20 new entries since the last review, or at every tagged release, whichever comes first.
   *Rationale:* a fixed monthly cadence assumes traffic this fleet doesn't have (0/9 sites run any analytics today); a volume trigger degrades gracefully to "at release" instead of silently never firing on a near-zero-traffic site.
   *Verify:* a script counts new capture-log entries since the last recorded review timestamp and flags it in release notes/CI once the threshold is crossed with no review recorded.
   *Evidence:* asserted — no source gives a docs-specific cadence at this traffic scale; the 20-event threshold is a reasoned default, not a measured one.

6. **DOC-SEARCH-06 — Ship one empty-state contract: title, body, exactly one CTA.** The zero-result search state and an empty/stub docs section must render a title naming the literal query or the missing section, one or two plain sentences (reason plus next step), and exactly one imperative CTA (1–3 words, one real link) — never zero links, never more than one.
   *Rationale:* Atlassian's template exists specifically to stop an empty state reading as a dead end; NN/g's numbers show a reader whose search already failed once has only even odds of trying again, so the one link offered has to go somewhere genuinely useful.
   *Verify:* grep the zero-result/empty-section template for exactly one `<a href` (or router-link) and the query-interpolation token; reject a template with 0 or 2+ links, or a literal placeholder string (a live "Lorem Ipsum" grep, precedented elsewhere in this program's audit).
   *Evidence:* normative (Atlassian's template) + measured (NN/g's success-rate numbers); the "exactly one CTA" cap is argued, adapted from the landing-page CTA-budget principle to this narrower surface.

7. **DOC-SEARCH-07 — Boost titles and headings, since a query is ~2 words.** Search boost/weight config must rank page titles and headings above body prose (VitePress's `searchOptions.boost: {title: 4, text: 2, titles: 1}` default already does this — keep it; mdBook's `boost-title`/`boost-hierarchy`/`boost-paragraph` keys must not be left at a flattened 1:1:1), and every page's title/H1 should contain the literal term a reader would type for it, not only a house-style paraphrase.
   *Rationale:* NN/g's measured mean query length is ~2 words, which matches a title-length string, not a paragraph buried in prose.
   *Verify:* for VitePress, confirm the boost config isn't overridden to equal weights; for mdBook, confirm `boost-title` > `boost-paragraph` in `book.toml`; for both, spot-check that a page's H1 contains its most-searched-for term.
   *Evidence:* measured (NN/g's query-length figure) applied as an argued design implication.

8. **DOC-SEARCH-08 — Route conceptual queries to a page, not a relevance-tuning pass.** When the overlap test's "gap" branch produces a query shaped like a task or symptom (a verb-plus-object phrase, or "why does X…") rather than a bare product/API noun — the docs analogue of Baymard's worst-performing "non-product"/"use case"/"symptom" query classes (37–66% site failure rates) — the fix is a new how-to or troubleshooting page, not a search-index tuning pass.
   *Rationale:* a keyword index (all 3 fleet engines) cannot infer intent across vocabulary it was never given; treating a conceptual miss as tunable burns effort that doesn't come back.
   *Verify:* a reading heuristic for whoever applies DOC-SEARCH-04 — verb-plus-object or "why does" shape → file as content, not synonym work.
   *Evidence:* argued — Baymard's numbers are ecommerce-measured, mapped by analogy; no docs-specific failure-rate measurement of this exact class was found.

9. **DOC-SEARCH-09 — Prefer a stable public search API over patching a generator's internals.** If a site's beacon needs more than watching the rendered DOM for the engine's own "no results" text, migrate that site's search to Pagefind (whose `pagefind.search()` return value is a documented public contract) rather than overriding MkDocs Material's internal search worker or mdBook's bundled `searcher.js`.
   *Rationale:* an internal-file patch silently breaks on the next generator upgrade with no compile-time signal (Material's own worker-override point was reported broken in `squidfunk/mkdocs-material#2973`); a public-API integration fails loudly instead — a changed function signature, not a silently-stale override.
   *Verify:* reviewer check — does the beacon call a function documented in the engine's own public API reference, or does it import/override a file under the engine's internal build output? The latter fails review.
   *Evidence:* measured (the cited GitHub issue) + normative (Pagefind's documented public API), combined as an asserted synthesis.

10. **DOC-SEARCH-10 — Don't require a search-vendor migration to satisfy this rule.** DOC-SEARCH-01's capture requirement is satisfied by a DOM-level beacon on whatever engine a site already runs; Pagefind and Algolia DocSearch are optional upgrades a site may adopt for other reasons (a stable API, free hosted analytics), never a precondition for compliance.
   *Rationale:* keeps the rule adoptable across all 12 repos in one pass instead of gating it behind a build-pipeline migration, matching this program's own portability constraint.
   *Verify:* a repo passes DOC-SEARCH-01 whenever the grep in that rule's verify step finds the named event, regardless of which search engine is configured.
   *Evidence:* normative — mirrors the frame's stated portability requirement directly.

## AI-agent angle {#ai-angle}

- **Invents a static "no-results.md" content page instead of a live empty-state template.** An LLM asked to "handle zero results" characteristically writes prose (a help article) rather than touching the theme/component that actually renders when search comes up empty. *Check:* the fix must be a diff to a template/component/override file, not a new page under `docs/`.
- **Writes marketing reassurance instead of Atlassian's terse three parts.** A default LLM empty-state reads like *"Oops! We couldn't find what you're looking for, but don't worry — we're always adding new content!"* — filler with no actual next step. *Check:* body copy over two sentences, or containing a banned-phrase ("don't worry," "oops," an exclamation point) fails review; must be title + reason/next-step + one CTA.
- **Assumes Algolia's `synonyms`/`removeWordsIfNoResults` keys exist for lunr/minisearch/elasticlunr and ships a config snippet that silently does nothing** (none of these engines validate unknown keys the way a strict schema would, so the mistake produces no build error). *Check:* before shipping any claimed search-config key in a rule or a PR, confirm it appears in that specific engine's own configuration reference, not just in Algolia's docs.
- **Proposes "add Google Analytics for search tracking" as if that alone captures zero-result queries**, missing that GA4's Enhanced Measurement auto-detection depends on a URL query parameter a client-side overlay search never sets. *Check:* has anyone actually observed the event fire in GA4 DebugView, or is this asserted from the setup page alone? If the latter, it's unverified, not implemented.
- **Skips the overlap test and treats every zero-result query as "write a new page," inflating page count.** *Check:* for every "gap" disposition, confirm a repo-wide grep for the query's stemmed terms across existing markdown genuinely found nothing — a disposition without that grep result attached is unverified.
- **Writes an empty state with 5+ suggested links** ("did you mean…" list, plus nav links, plus a support link, plus a search-again box) instead of one CTA — the over-stuffed instinct that also produced ocx's 7-CTA landing page (`ux-observability-posture.md` §7) recurs here at smaller scale. *Check:* count `<a href` (or router-link) tags in the template; more than one fails DOC-SEARCH-06.
- **States a cadence like "review daily" or "review regularly" with no basis**, producing an unenforceable rule nobody runs on a near-zero-traffic site. *Check:* any cited cadence must carry a stated numeric trigger (a count, a release boundary) — a bare adverb ("regularly," "frequently") fails review.
- **Applies a search rule to a repo with no search box at all.** `creeptd-ng/docs/`, `kate-middlechild/docs/`, and `grimoire-lore/docs/` are measured `docs/` trees with no generator, no build, and no search UI to attach a beacon to (`docs-shape.md` §0–§1). *Check:* the rule fires only when a generator config file (`mkdocs.yml`, `.vitepress/config.*`, `book.toml`) is present in the repo; its absence is a pass by non-applicability, not a violation.

## Contested / evolving {#contested}

No row in the topic map's Conflicts to resolve table lists `search-contract-and-zero-result-loop` as its owner topic — this topic has open **decisions**, not a named cross-source disagreement, and each is resolved above rather than inherited from that table:

- **Whether the rule says anything about synonym maps** (an open decision named directly in the brief) is resolved in Findings 4 and 6, and DOC-SEARCH-03: no, because none of the fleet's 3 engines expose the config surface Algolia's playbook assumes; the rule instead requires content rewording.
- **GA4 site-search auto-capture on a client-side overlay search** is genuinely unresolved as of this research (September 2026): Material for MkDocs' own docs describe the mechanism, but no fetched source confirms it actually fires for a non-navigating JS search, and the underlying limitation (GA4 watches a URL query parameter) is a real, checkable reason to doubt it. What would resolve it: a maintainer or a project deliberately performing a zero-result search on a live Material site and confirming the event in GA4 DebugView. Until then, DOC-SEARCH-02 keeps this labeled unverified rather than working.
- **Material for MkDocs's custom search-worker override** was reported broken (`#2973`) and the issue is now closed/resolved — trending toward being a usable override point, but the fix's release version and whether the fleet's pinned Material 9.7.7 carries it were not confirmed in this pass. Re-check against the fleet's actual pinned version before relying on it (this sits alongside the fleet's separately-flagged `mkdocs-material-exit-path`/Zensical question, owned elsewhere, not re-litigated here).
- **Whether DocSearch's free tier surfaces the same "No Results Rate" / "Searches without Results" dashboard views** confirmed as base Algolia product functionality was not independently verified for the DocSearch program specifically — the DocSearch overview page itself is silent on analytics, and the specific Algolia support article on the topic returned HTTP 403 to an unauthenticated fetch. Treat "DocSearch gives you zero-result reporting for free" as likely, not confirmed; a project actually accepted into the program should verify its own dashboard before this is cited as settled.

## Sources {#sources}

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [algolia.com/doc/.../empty-or-insufficient-results](https://www.algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results/) | Algolia's own guide to zero/insufficient search results | Current, Sept 2026 | The primary source for the five remediation levers (synonyms, removeWordsIfNoResults, optionalWords, ignorePlurals, removeStopWords) and their recommended rollout order |
| [algolia.com/doc/.../search-analytics/concepts/metrics](https://www.algolia.com/doc/guides/search-analytics/concepts/metrics) | Algolia's search-analytics metrics reference | Current, Sept 2026 | Confirms "No Results Rate" and "Searches without Results" are base analytics, not a paid add-on |
| [nngroup.com/articles/search-visible-and-simple](https://www.nngroup.com/articles/search-visible-and-simple/) | Nielsen Norman Group research article | NN/g, long-running/current | The measured numbers behind the empty-state urgency argument: 91% usage jump, 51%/32%/18% success decay, ~2-word mean query |
| [baymard.com/blog/ecommerce-search-query-types](https://baymard.com/blog/ecommerce-search-query-types) | Baymard Institute measured UX-research study | Baymard, current | The query-type taxonomy and per-type site-failure rates mapped onto docs conceptual queries |
| [pagefind.app](https://pagefind.app/) | Pagefind's own project site/docs | Current, actively maintained, 2026 | Confirms the chunked-index architecture, payload figures, and the public `pagefind.search()` API as the stable-hook upgrade path |
| [atlassian.design/foundations/.../empty-state](https://atlassian.design/foundations/content/designing-messages/empty-state) | Atlassian Design System content guidance | Current | The three-part (title/body/CTA) empty-state template applied to the zero-result and empty-section states |
| [docsearch.algolia.com/docs/what-is-docsearch](https://docsearch.algolia.com/docs/what-is-docsearch/) | Official DocSearch program docs | Current, v5 referenced | Confirms free eligibility, the application/approval flow, and the attribution requirement |
| [squidfunk.github.io/mkdocs-material/setup/setting-up-site-search](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) | Material for MkDocs official docs | Current (9.x era, matches fleet's pinned 9.7.7) | Confirms the lunr/lunr-languages engine, client-side-only architecture, and the feature-flag-only config surface |
| [squidfunk.github.io/mkdocs-material/setup/setting-up-site-analytics](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-analytics/) | Material for MkDocs official docs | Current | The one search-tracking mention in any fleet-relevant generator's official docs (GA4 Enhanced Measurement), and its caveats |
| [github.com/squidfunk/mkdocs-material/issues/2973](https://github.com/squidfunk/mkdocs-material/issues/2973) | Real GitHub issue against the fleet's actual generator | Filed and closed/resolved, dates not shown in fetch | Documents that Material's custom-search-worker override was broken, and its current (closed) status |
| [vitepress.dev/reference/default-theme-search](https://vitepress.dev/reference/default-theme-search) | VitePress official reference docs | Current, VitePress 1.6.x-era docs (fleet pins a 2.0 alpha) | Confirms minisearch engine, `searchOptions`/`options` config surface, no analytics hook |
| [rust-lang.github.io/mdBook/format/configuration/renderers.html](https://rust-lang.github.io/mdbook/format/configuration/renderers.html) | mdBook official configuration reference | Current | Confirms `[output.html.search]` keys, default-on search, no documented event/hook |
| `docs-audit/ux-observability-posture.md` §1–§3 | This program's own fleet measurement (internal) | 2026-09-05 | The 9/9 client-side, 0/9 zero-result-instrumented, 0/9 empty-state/404 measurements this whole topic is grounded against |
| `docs-topic-map/codified-practice.md` §8 | This program's own scout synthesis (internal) | 2026-09-05 | Source of the named "overlap test" classifier and the 23%-zero-result/three-cluster B2B data point |
| `docs-topic-map/failure-and-observability.md` §5 | This program's own scout synthesis (internal) | 2026-09-05 | Source of the Algolia-zero-result-mining framing as "the single highest-leverage, lowest-cost signal," and the survivorship-bias caveat on feedback-adjacent channels |
| `docs-audit/docs-shape.md` §0–§1 | This program's own fleet measurement (internal) | 2026-09-05 | Confirms which repos have a generator config (and therefore a search box) at all, vs. a `docs/` tree with none |


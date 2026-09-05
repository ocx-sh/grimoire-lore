---
title: Navigation, information architecture and search
topic: docs-navigation-search
family: DOC-NAV
model: claude-opus-5
consolidates:
  - docs-navigation-search/nav-depth-and-information-architecture.md
  - docs-navigation-search/search-contract-and-zero-result-loop.md
  - docs-observability/reader-signals-and-zero-result-sink.md
  - docs-topic-map/wave2-landing-check-portability.md
grounded_against:
  - docs-audit/config-inventory.md
  - docs-audit/docs-shape.md
  - docs-audit/tested-examples-mechanism.md
  - docs-audit/ux-observability-posture.md
  - docs-frame.md
  - docs-topic-map/wave1-critique.md
  - docs-topic-map/wave2-declaration-key.md
  - docs-topic-map/wave2-severity-ledger.md
  - docs-topic-map/wave2-calibration-a.md
  - docs-topic-map/wave2-calibration-b.md
date: 2026-09-05
revised: 2026-09-05
wave: 2
---

# Navigation, information architecture and search

## Verdict

Depth is not the number this program caps. Expanded depth is. NN/g's two-level
progressive-disclosure ceiling was measured on menus a reader holds open at once
([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)), while every deep
worked example Docusaurus and VitePress ship relies on collapse. This program caps
the sidebar at three levels with the third collapsed by default, and fails at four.
Wave 2 wrote the script that proves it. `checks/nav_depth.py` now parses all nine
real configs and reports 0 sites over depth 3, and it goes red on a planted depth-4
fixture (`wave2-calibration-b.md` §3).

Writing that script found two defects a desk reading could not. `yaml.safe_load`
hard-fails on 4 of 7 fleet `mkdocs.yml` files over the `!ENV` and `!!python/name:`
tags that mkdocs-material and pymdownx ship by default. A naive `^#` grep counts
mdBook's own mandatory `# Summary` line as a grouping divider, which silently
marked `grimoire`'s 20-item flat nav as grouped. Both fixes are now part of the
shipped script's contract.

A depth cap never ships alone. Fewer nav levels push the same content sideways into
longer files. Wave 1 named two outliers. Wave 2 measured 16 pages over 4000 prose
words, not two, so the split-or-exempt decision is a fleet programme rather than a
pair of exceptions.

Flat is the other failure, not the safe default. `grimoire`'s 20-item ungrouped
`SUMMARY.md` is the fleet's only zero-hierarchy nav, and the same repo puts 18 of 23
pages in the unclassifiable bucket. The grouping trigger at 8 pages is an argued
number, so the rule now ships at SHOULD, and the row says why.

On search, the fleet has no observation problem to fix because it has no observation
at all. All nine sites run client-side search, and none of lunr, minisearch or
elasticlunr documents a zero-result hook. Wave 2 settled the two things wave 1 could
not. The sink is priced: a Cloudflare Worker free tier, or an already-adopted Umami
or Plausible custom event, at zero to twenty dollars a month
(`reader-signals-and-zero-result-sink.md` §2). And a beacon alone no longer counts.
The same file must carry a `fetch` or `sendBeacon` call to a named endpoint, because
a grep for the event string passes on a dead beacon.

Ownership of the zero-result signal stays in DOC-NAV. The severity ledger routed it
to DOC-OBS, and the commission that was created to adjudicate it routed it back,
because DOC-NAV already owns the whole lifecycle: fire, fix, classify, review, bind.
DOC-OBS-12 keeps its deferral shape and swaps in agent-versus-human traffic share as
its worked example.

Two claims that wave 1 hedged are now settled by mechanism. GA4 Enhanced Measurement
cannot see an overlay search, because its trigger is one of five URL query parameters
at page view and Material's search box never writes one. And
`squidfunk/mkdocs-material#2973` was fixed in Material 7.2.6, long before the fleet's
pinned 9.7.7, so DOC-NAV-16's reason is now the maintainer's own refusal to support
custom search workers, not a live bug.

Two documented gaps, not answers. First, the sink endpoint is priced but not chosen,
and choosing it is a privacy decision on nine public sites. Second, DOC-NAV-05's
reference carve-out reads as verified and is not. No mechanical binding ties a
specific test file to a specific page, so the carve-out stays a reading heuristic
until DOC-EX-02's declared binding key is reused for it.

Every rule here fires only behind a generator config file, so the three repos with a
`docs/` tree and no site are reported not applicable rather than failed.

## Conflicts resolved

| Conflict | Sources | Resolution |
|---|---|---|
| NN/g's 2-level disclosure ceiling vs the 4-plus levels generators demonstrate | `design-systems.md` §2/§4 vs [Docusaurus sidebar](https://docusaurus.io/docs/sidebar), [VitePress sidebar](https://vitepress.dev/reference/default-theme-sidebar) | Not split down the middle. NN/g counts levels held **open**, the generators' deep examples are **collapsed**. Cap at three levels with the third collapsed (DOC-NAV-02). Confirmed by script in wave 2. |
| Nav candidate 4 (breadcrumb at depth 3) vs candidate 5 (cap VitePress at 2) | `nav-depth-and-information-architecture.md` candidates 4 and 5 | Merged into one generator-neutral rule, DOC-NAV-04. At depth 3 a site either has a real breadcrumb or comes back to depth 2. |
| DOM beacon (DOC-SEARCH-01) vs the ban on non-public-API integration (DOC-SEARCH-09) | `search-contract-and-zero-result-loop.md` §3 vs candidate 9 | Watching rendered no-results text is reading output. Importing the engine's worker or `searcher.js` is not. DOC-NAV-16 states the boundary. |
| A hard depth cap vs a 34k-word single page | `nav-depth-and-information-architecture.md` §5 vs `docs-shape.md` §4 | The cap is only valid paired with a length trigger. DOC-NAV-02 and DOC-NAV-06 ship together. |
| GA4 Enhanced Measurement as zero-result capture | [Material site analytics](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-analytics/) vs [GA4 `view_search_results`](https://support.google.com/analytics/answer/9216061) | Rejected, now on mechanism rather than reasoning. GA4 needs one of five URL query parameters at page view. Material's search never writes one. Named as a non-satisfier inside DOC-NAV-10. |
| `grimoire`'s flat nav read as evidence that shallow is safe | `ux-observability-posture.md` §1 vs `docs-shape.md` §2 | Rejected. Depth 1 at 20 items is the fleet's worst nav. DOC-NAV-03 sets a floor under DOC-NAV-02's ceiling. |
| DOC-NAV-10 requires zero-result capture, DOC-OBS-12 defers it (wave-1 critique contradiction 3) | `wave2-severity-ledger.md` overlap 3 vs `reader-signals-and-zero-result-sink.md` §9 | Resolved in DOC-NAV's favour. The ledger assigned ownership to DOC-OBS before the sink was priced. The adjudicating commission priced it and returned ownership to DOC-NAV. DOC-OBS-12 keeps its shape and changes its example. |
| DOC-NAV-12's "exactly one link" vs DOC-TYPE-12, DOC-TYPE-13 and DOC-DISC-10 (wave-1 critique contradiction 4) | `wave2-landing-check-portability.md` §2 | Mostly a measurement error. None of the three named pages is under DOC-NAV-12's 150-word gate. The critique quoted a words-to-first-command figure as if it were page length. The real collision is on five short section-index pages, and the fix is to drop `landing` from DOC-NAV-12 and drop the upper cap. |
| DOC-NAV-08 vs DOC-OBS-01 and DOC-OBS-02 on link checking (wave-1 critique contradiction 6) | `wave2-severity-ledger.md` overlap 1 | Resolved to DOC-OBS. DOC-NAV-08 is retired. DOC-NAV-07 keeps the authoring half only. |
| DOC-NAV-13's claimed fleet violation | `wave2-severity-ledger.md` drop list vs `wave2-calibration-b.md` §3 | The claimed violation is false. mdBook defaults to `boost-title: 2` against `boost-paragraph: 1`. The ledger says drop the rule. Calibration measured a reworded check that goes red on a planted flattened config, so the rule survives at CONSIDER with new text. |
| Which key declares a page's type | `wave2-declaration-key.md` §7 and §11 | One carrier, a comment line holding `doc_type` in the first 12 lines. Never frontmatter, never a path. Every DOC-NAV rule that reads a type now calls `checks/doc-declaration.sh`. |

## The ruleset

Seventeen IDs. Fifteen live rules, one retired, one new. Every one fires only when
DOC-NAV-01's precondition holds.

---

**DOC-NAV-01.** Apply every rule in this file only when the repo carries a docs-site
generator config file.

- *Rationale*: a `docs/` tree with no site cannot carry a sidebar, a breadcrumb or a search box.
- *Verification*: `ls mkdocs.yml .vitepress/config.* docs/.vitepress/config.* website/.vitepress/config.* book.toml docs/book.toml 2>/dev/null`. No hit means the check reports "not applicable" and exits 0, never "failed". The VitePress paths are mandatory. A discovery list of `mkdocs.yml` and `SUMMARY.md` alone silently skips the fleet's one VitePress site.
- *Severity*: MUST · *Evidence*: normative (`docs-frame.md` Corrections decision 5) + measured (3 of 249 fleet surfaces not applicable, `wave2-calibration-b.md` §6) + measured detector gap (`wave2-calibration-a.md` summary, a nav check that found no config for `ocx`)
- *Applies to*: all

**DOC-NAV-02.** Nest the sidebar no deeper than three levels, with the third level
collapsed by default.

- *Rationale*: two open levels is the tested ceiling, and an expanded third level loses readers between levels.
- *Verification*: `checks/nav_depth.py` parses `nav:` depth (MkDocs), the `sidebar` array's `items` nesting (VitePress) and `SUMMARY.md` indent depth (mdBook). It fails at depth 4, and at an expanded level-3 node. The MkDocs loader must pass unknown YAML tags through as raw scalars, because `yaml.safe_load` hard-fails on 4 of 7 fleet configs over `!ENV` and `!!python/name:`.
- *Severity*: MUST · *Evidence*: normative ([NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), 46 applications) + measured (0 of 9 sites over depth 3, red on a planted depth-4 config, `wave2-calibration-b.md` §3)
- *Threshold*: 3 levels (NN/g's two open levels, plus one collapsed)
- *Applies to*: all

**DOC-NAV-03.** Group the top-level navigation once a site reaches eight pages.

- *Rationale*: a flat list of every page hides the site's shape and leaves its pages untypeable.
- *Verification*: `checks/nav_depth.py` counts top-level nav entries with no children. mdBook's `# Part Title` divider adds a group without adding a level, per the [SUMMARY.md format](https://rust-lang.github.io/mdbook/format/summary.html). The mdBook arm must skip the file's own mandatory first `# ` line, which a naive grep counts as a divider.
- *Severity*: SHOULD · *Evidence*: measured for the obligation (`grimoire` 20 items flat, 0 real dividers, 18 of 23 pages untypeable) + argued for the number + measured hit rate (1 of 9 sites flat at 8 or more, red on a planted 9-item flat config)
- *Threshold*: 8 pages (argued). The measured failure is 20 items. MUST returns if the number moves to the measured one.
- *Applies to*: all

**DOC-NAV-04.** Give a site whose nav reaches three levels a real breadcrumb, or bring
the nav back to two.

- *Rationale*: a third level with no ancestor trail leaves a reader no way back up.
- *Verification*: run `checks/nav_depth.py` for measured depth. At depth 3 or more, grep `mkdocs.yml` `theme.features` for `navigation.path`. For VitePress and mdBook, `unverified: reading heuristic`. A reviewer confirms a breadcrumb component that derives ancestry from the route. Neither present at depth 3 is a failure, not a warning.
- *Severity*: MUST · *Evidence*: normative ([NN/g breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/): unnecessary only at 1 to 2 levels) + codified ([`navigation.path`](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/) since Material 9.7.0, fleet pins 9.7.7) + measured (1 of 9 sites at depth 3 with no breadcrumb)
- *Applies to*: all

**DOC-NAV-05.** Cap in-page headings at H4 unless the page is a reference page carrying
a structural drift test.

- *Rationale*: headings below H4 hide content that the on-page outline stops showing.
- *Verification*: `grep -cE '^#{5,6} ' <file>`. Any hit fails unless the page declares `doc_type: reference` through `checks/doc-declaration.sh` and a structural test file names that page. The carve-out arm is `unverified: reading heuristic`. A reviewer decides which test file binds to which page, because no mechanical binding exists yet. Reuse DOC-EX-02's declared binding key to close this.
- *Severity*: SHOULD · *Evidence*: measured (2 of 249 pages carry H5, not the one wave 1 claimed) + argued (the carve-out)
- *Applies to*: tutorial, how-to, reference, explanation, troubleshooting
- *Owns*: the H5 cap. DOC-TYPE-19 keeps only its item-count arm.

**DOC-NAV-06.** Split a non-reference page once it passes 4000 prose words.

- *Rationale*: an unsplit page grows until search, the outline and diff review all stop working on it.
- *Verification*: the prose word counter per page, with frontmatter, fenced code, tables and inline code stripped. Fail a page over 4000 words whose declared `doc_type` is not `reference`, read through `checks/doc-declaration.sh`.
- *Severity*: SHOULD · *Evidence*: measured (16 of 249 pages exceed 4000 words, `wave2-calibration-b.md` §3) + argued for the number
- *Threshold*: 4000 words (the fleet distribution, `docs-shape.md` §4)
- *Applies to*: landing, tutorial, how-to, explanation, troubleshooting

**DOC-NAV-07.** Give every heading that another file links to an explicit
`{#kebab-id}` anchor.

- *Rationale*: a heading reworded without its anchor breaks every inbound link and nothing reports it.
- *Verification*: grep each cross-file `#target` in the tree, then assert the target heading in the linked file carries an explicit `{#...}` id. This is the authoring half only. The resolver that decides whether a link is dead belongs to DOC-OBS-02.
- *Severity*: MUST · *Evidence*: measured (`docs-shape.md` §5, and one real case of a heading that moved out of `user-guide.md` leaving three inbound references behind)
- *Applies to*: all

**DOC-NAV-08.** RETIRED, merged into DOC-OBS-02.

- Wave 1 required a link checker to resolve explicit ids, root-relative paths and build-time anchors before calling a link dead. DOC-OBS-02 states the same obligation with the same measured evidence, the same lychee flags and a pinned action version.
- *Number not reused.* `wave2-severity-ledger.md` overlap 1.

**DOC-NAV-09.** Name nav entries and page titles after the reader's task, never after an
audience or an internal codename.

- *Rationale*: a label the reader does not recognise is a link the reader will not click.
- *Verification*: grep every H1 and every top-level nav label against `developer|admin|beginner|advanced|professional|workforce`. That arm runs as written. The project-maintained jargon denylist arm is `unverified: reading heuristic`, because an empty denylist is an unrun check and no source supplies the list.
- *Severity*: SHOULD for the role-noun grep, CONSIDER for the denylist arm · *Evidence*: normative ([NN/g information scent](https://www.nngroup.com/articles/information-scent/), [GOV.UK on audience-based navigation](https://insidegovuk.blog.gov.uk/2014/07/18/hey-you-there-the-trouble-with-audience-based-navigation/)) + measured (0 of 249 titles and 0 of 9 nav configs hit today)
- *Applies to*: all

**DOC-NAV-10.** Fire one named event when the site's own search returns zero results,
and send it to a named sink from the same file.

- *Rationale*: the zero-result query is already computed in the browser, and a beacon with nothing listening is a no-op that still passes a grep.
- *Verification*: `grep -rl "docs:zero-result-search"` over the site source finds at least one file, that same file also matches `fetch\(|sendBeacon\(` naming an endpoint the repo declares, and the string survives into the built bundle. Enabling GA4 Enhanced Measurement never satisfies this. Its `view_search_results` event triggers on one of five URL query parameters at page view, and an overlay search writes none.
- *Severity*: SHOULD · *Evidence*: codified (zero-result mining, `codified-practice.md` §8) + measured (0 of 9 sites carry the event or any search-analytics key, and the sink is priced at $0 to $20 a month across three shapes, `reader-signals-and-zero-result-sink.md` §2) + measured for the GA4 non-satisfier ([GA4 `view_search_results`](https://support.google.com/analytics/answer/9216061) read against [Material search setup](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/)) · the event name itself is asserted, which is why this is not a MUST
- *Applies to*: all
- *Owns*: the zero-result signal. DOC-OBS-12 no longer defers it.

**DOC-NAV-11.** Fix a zero-result query by rewording the page, not by adding a synonym or
query-relaxation key.

- *Rationale*: none of lunr, minisearch or elasticlunr reads those keys, so the config edit does nothing and raises no error.
- *Verification*: `grep -nE '(synonyms|removeWordsIfNoResults|optionalWords|ignorePlurals|removeStopWords)' mkdocs.yml .vitepress/config.* book.toml` must find nothing. The accepted fix shows the query's literal phrase in a heading or an "also called" line on the page that already covers it.
- *Severity*: MUST · *Evidence*: measured (the official config reference for all three engines was fetched and none documents any of these keys, and 0 of 9 fleet configs carry one today)
- *Applies to*: how-to, reference, explanation, troubleshooting

**DOC-NAV-12.** Write the rendered zero-result state and the 404 template as a title,
one or two sentences, and at least one link.

- *Rationale*: a bare "no results" line is a dead end for a reader who will probably not search again.
- *Verification*: read the template that renders when search comes up empty, and the 404 template. Assert a heading, at most two sentences of body copy, and at least one link or router link. There is no upper cap, because Atlassian states none. `unverified: reading heuristic` for the sentence-count arm on a template that builds its copy from parts.
- *Severity*: CONSIDER · *Evidence*: normative ([Atlassian empty states](https://atlassian.design/foundations/content/designing-messages/empty-state): scannable title, one to two sentences, a one-to-two-word CTA label) + measured ([NN/g](https://www.nngroup.com/articles/search-visible-and-simple/): 51 percent first-query success, half of failed searchers abandon) + measured absence (0 of 249 fleet pages is such a template, so this is a guideline for the first site that adds one)
- *Applies to*: the rendered empty-state and 404 templates only. Not `landing`. Not authored content pages.
- *Note*: the placeholder-text ban moved to DOC-TYPE-14, which owns it everywhere.

**DOC-NAV-13.** Never flatten a search engine's title and body boosts to equal weight.

- *Rationale*: the average query is two words long, which matches a title and not a paragraph.
- *Verification*: `grep -c 'output.html.search' book.toml` returning 0 passes, because mdBook's defaults are already `boost-title: 2` against `boost-paragraph: 1`. If the section exists, assert `boost-title` is above `boost-paragraph`. For VitePress, assert `searchOptions.boost` is absent or keeps title above text. A config setting both to 1 fails.
- *Severity*: CONSIDER · *Evidence*: measured ([NN/g](https://www.nngroup.com/articles/search-visible-and-simple/) mean query length 2.0 words) + measured (9 of 9 sites already comply on defaults, and a planted `boost-title = 1` config goes red, `wave2-calibration-b.md` §3)
- *Applies to*: all

**DOC-NAV-14.** Give every zero-result query seen twice one of two dispositions, reword
or gap.

- *Rationale*: an unclassified log becomes noise, and then every query reads as a missing page.
- *Verification*: a script flags any log entry older than 30 days carrying neither tag. A `gap` disposition must attach the repo-wide grep result that found nothing, and files a `docs`-labelled issue quoting the literal query.
- *Severity*: CONSIDER · *Evidence*: codified (the overlap test, `codified-practice.md` §8, with a B2B case at 23 percent zero-result concentrated in three clusters) + measured as vacuous today (0 of 9 sites log a query, so the check has nothing to act on until DOC-NAV-10 lands)
- *Threshold*: 30 days (asserted)
- *Applies to*: all

**DOC-NAV-15.** State the review trigger as a count or a release boundary, never as a
bare cadence word.

- *Rationale*: a rule that says "review regularly" never fires on a site with little traffic.
- *Verification*: grep the rule or runbook text for `regularly|frequently|periodically|often` within 60 characters of "review". A hit fails.
- *Severity*: CONSIDER · *Evidence*: asserted for the default + measured (0 of 249 pages hit today, so the rule ships red-capable and clean, `wave2-calibration-b.md` §3)
- *Threshold*: 20 new entries or the next tagged release, whichever comes first (asserted, reasoned default)
- *Applies to*: all
- *Owns*: the cadence-word ban. DOC-DISC-12, DOC-OBS-10 and DOC-OBS-11 restate their triggers as counts or release boundaries.

**DOC-NAV-16.** Bind the zero-result beacon to rendered output or a documented public
API, never to a generator's internal file.

- *Rationale*: the maintainer of the fleet's main generator states plainly that a custom search worker gets no support beyond the shipped documentation.
- *Verification*: `unverified: reading heuristic`. A reviewer confirms the beacon imports nothing from the engine's build output or vendored worker. Watching the engine's own localised no-results text, or calling `pagefind.search()`, passes. Overriding Material's search worker or patching mdBook's `searcher.js` fails. Upgradable to a grep on the beacon file's import paths.
- *Severity*: SHOULD · *Evidence*: measured ([`squidfunk/mkdocs-material#2973`](https://github.com/squidfunk/mkdocs-material/issues/2973), whose maintainer declines support for custom search workers) + normative ([Pagefind's public search API](https://pagefind.app/)) · the bug itself was fixed in Material 7.2.6 and is not a live risk on the fleet's pinned 9.7.7, so the declined-support statement carries this rule, not the bug
- *Applies to*: all

**DOC-NAV-17.** Give every authored page under 150 prose words at least one outbound
link.

- *Rationale*: a short page with no way onward is a dead end that a reader reaches and leaves.
- *Verification*: count internal and external links on each page whose stripped prose is under 150 words. Zero links fails. There is no upper limit, because no source supports one. Skip a page whose declared `doc_type` is `landing`, read through `checks/doc-declaration.sh`.
- *Severity*: SHOULD · *Evidence*: measured (58 of 238 pages sit under 150 words, 53 are non-landing, and 15 of those 53 carry zero links, `wave2-landing-check-portability.md` §2)
- *Threshold*: 150 words (`docs-shape.md` §4 stub threshold, already used by DOC-DISC-09 and DOC-DISC-16)
- *Applies to*: how-to, reference, explanation, troubleshooting, changelog

## Applied to the fleet

Every hit count below is a wave-2 measurement over the 249-file corpus or the 9 real
generator configs, unless the row says otherwise.

### Already satisfied

| Rule | Hits and evidence |
|---|---|
| DOC-NAV-01 | 3 of 249 surfaces not applicable, correctly reported as such (`creeptd-ng`, `kate-middlechild`, `grimoire-lore`). No false failure. |
| DOC-NAV-02 | 0 of 9 sites over depth 3. `ocx` at depth 3 with all three nested groups `collapsed: true`, `ocx-sdk-python` at depth 3, the other 7 at depth 2. Red on a planted depth-4 config. |
| DOC-NAV-09 | 0 of 249 titles and 0 of 9 nav configs use a role noun. Wave 1 recorded this as unmeasured. It is now measured and clean. |
| DOC-NAV-11 | 0 of 9 configs carry any of the five Algolia-only keys. |
| DOC-NAV-13 | 9 of 9 sites comply on defaults. `grimoire/docs/book.toml` has no `[output.html.search]` section at all, so mdBook's 2:1:1 defaults apply. `ocx` carries no `boost` key. A planted flattened config goes red. |
| DOC-NAV-15 | 0 of 249 pages put a cadence word within 60 characters of "review". |
| DOC-NAV-07, partially | `ocx` already mandates `{#anchor}` on headings (`ocx/.claude/rules/docs-style.md:35-40`). |

### Violated today

| Rule | Hits and evidence |
|---|---|
| DOC-NAV-03 | 1 of 9. `grimoire/docs/src/SUMMARY.md:5-24` is 20 chapters flat with 0 real `# Part Title` dividers, confirmed after the script stopped counting the file's own `# Summary` line. 18 of its 23 pages classify as `other`. One fix closes both. |
| DOC-NAV-04 | 1 of 9. `ocx` runs the fleet's deepest nav at 3 levels and has no breadcrumb, because VitePress ships none. The 5 MkDocs sites without `navigation.path` sit at depth 2 and are out of scope. |
| DOC-NAV-05 | 2 of 249 pages carry H5, not the one wave 1 claimed. `ocx/website/src/docs/reference/command-line.md` and `ocx/website/src/docs/reference/configuration.md`. Both are reference pages with real test coverage, and neither can be bound to its test mechanically. |
| DOC-NAV-06 | 16 of 249 pages exceed 4000 prose words, not the two wave 1 named. `command-line.md` at 32,790 (reference, exempt), `grimoire/docs/src/commands.md` at 12,504, `ocx/website/src/docs/user-guide.md` at 12,142, `ocx-mirror/docs/reference/mirror-yml.md` at 10,306, and 12 more. |
| DOC-NAV-07 | `ocx/website/src/docs/reference/command-line.md:361` links `../user-guide.md#path-resolution`, and that anchor lives at `command-line.md:349`. Two sibling anchors are equally orphaned. |
| DOC-NAV-10 | 0 of 9. No site carries the event string, a sink call, or any search-analytics key. |
| DOC-NAV-12 | 0 of 249 pages is a rendered empty-state or 404 template, because no site authors one. The rule has no retrofit target and ships as a template guideline. |
| DOC-NAV-14 | Vacuous today. 0 of 9 sites log a query, so the check has nothing to read. Gated behind DOC-NAV-10. |
| DOC-NAV-16 | Not applicable today. No site has a beacon to bind. |
| DOC-NAV-17 | 15 of 53 non-landing pages under 150 words carry zero links. Mostly auto-scaffolded changelog stubs at 2 to 4 words (`ocx-mcp`, `ocx-mirror`, `ocx-sdk-python`) plus 7 stubs in `ocx-mirror-sdk`'s 94-percent-stub tree. 38 of 53 already pass. |

### Calibration status

| Rule | Command as run | Hits | False positives | Red on a planted violation |
|---|---|---|---|---|
| DOC-NAV-01 | generator-config `ls` | 3 of 249 not applicable | none, structural | already correct |
| DOC-NAV-02 | `checks/nav_depth.py`, 9 sites | 0 over depth 3 | none, structural | yes, depth-4 fixture |
| DOC-NAV-03 | `checks/nav_depth.py`, 9 sites | 1 of 9 | none, structural | yes, flat-9 fixture |
| DOC-NAV-04 | `nav_depth.py` plus breadcrumb grep | 1 of 9 | none on the MkDocs arm | yes |
| DOC-NAV-05 | `grep -c '^#{5,6} '` | 2 of 249 | none on the grep, the carve-out is unverifiable | not attempted |
| DOC-NAV-06 | prose word counter | 16 of 249 | none, word count is unambiguous | not attempted |
| DOC-NAV-07 | anchor resolver | exhaustively measured by `docs-shape.md` §5 | not re-derived | not attempted |
| DOC-NAV-09 | role-noun grep | 0 of 249, 0 of 9 | none | not attempted |
| DOC-NAV-10 | event and sink grep, 9 configs | 0 of 9 | none | not attempted |
| DOC-NAV-11 | synonym-key grep, 9 configs | 0 of 9 | none | not attempted |
| DOC-NAV-12 | stub and placeholder script, pre-split shape | 22 of 249 | superseded by the three-way split | not attempted |
| DOC-NAV-13 | `grep -c output.html.search` plus fixture | 0 of 1 real, 1 of 1 planted | none | yes |
| DOC-NAV-14 | blocked behind DOC-NAV-10 | vacuous, 0 of 9 | none | not attempted |
| DOC-NAV-15 | cadence-word grep | 0 of 249 | none | not attempted |
| DOC-NAV-17 | link floor on pages under 150 words | 15 of 53 | none, link count is unambiguous | not attempted |

No DOC-NAV check measured an unacceptable false-positive rate. Two rules carry a
different defect, which is a check that cannot go red honestly. DOC-NAV-05's
reference carve-out and DOC-NAV-16's binding check are both reviewer judgement, and
both now carry the `unverified: reading heuristic` marker.

### New commitments

DOC-NAV-10, DOC-NAV-12, DOC-NAV-14, DOC-NAV-15, DOC-NAV-16 and DOC-NAV-17 have no
fleet precedent at all. `config-inventory.md` axis 4 records zero hits fleet-wide for
navigation-depth rules, docs search, zero-result mining, or any information-architecture
method. This group contributes 7 greppable checks plus `checks/nav_depth.py`, which
wave 2 wrote and fixed twice, into a family that had none.

## AI-agent failure modes

Ranked by how often each one bites.

1. **Appends a new `##` section to an existing page forever rather than splitting it**, because a split needs a page boundary and a cross-link sweep while an append needs neither. Sixteen fleet pages are already past the threshold. → DOC-NAV-06
2. **Slugs a heading from its visible text when writing a cross-file link**, because the slug is free to compute and the project's explicit-anchor convention is a fact it would have to look up. → DOC-NAV-07
3. **Ships the beacon and calls the signal done**, writing the `CustomEvent` dispatch, seeing the grep pass, and leaving the event firing into a void. → DOC-NAV-10
4. **Scaffolds a flat file list for a new docs tree**, because grouping requires deciding what belongs with what. This is how `grimoire`'s `SUMMARY.md` got to 20 items. → DOC-NAV-03
5. **Writes an Algolia-shaped `synonyms:` block into `mkdocs.yml`** and ships it, because none of these engines validate unknown keys and the mistake produces no build error. → DOC-NAV-11
6. **Writes a nav-config parser with `yaml.safe_load` and no tag handler**, then reports "cannot parse" on 4 of 7 real fleet configs and quietly skips them. → DOC-NAV-02
7. **Counts mdBook's own `# Summary` line as a grouping divider**, and so marks a 20-item flat nav as grouped. → DOC-NAV-03
8. **Looks for `mkdocs.yml` and `SUMMARY.md` only**, and silently skips the VitePress site instead of failing loudly. → DOC-NAV-01
9. **Nests the sidebar as deep as the framework allows**, because neither Docusaurus nor VitePress errors on it and VitePress silently drops past level 6. → DOC-NAV-02
10. **Proposes "add Google Analytics" as zero-result capture**, missing that GA4's auto-detection needs a URL query parameter an overlay search never sets. → DOC-NAV-10
11. **Writes an empty state as marketing reassurance** or stuffs it with five suggested links, both with no single next step. → DOC-NAV-12
12. **Invents a static `no-results.md` content page** instead of touching the template that actually renders when search comes up empty. → DOC-NAV-12
13. **Caps a stub page's links at one**, deleting useful context because it read a floor as a ceiling. → DOC-NAV-17
14. **Leaves an auto-scaffolded changelog stub at four words with no link**, because the scaffold ran and nothing failed. → DOC-NAV-17
15. **Fakes a breadcrumb in prose** with "as discussed in the previous section", because a sentence needs no config lookup and `navigation.path` does. → DOC-NAV-04
16. **Labels top-level nav by audience** ("For Developers", "For Admins"), because audience labels need no research. → DOC-NAV-09
17. **Treats every zero-result query as a new page**, inflating page count for something a heading fix would have solved. → DOC-NAV-14
18. **Writes "review regularly"**, producing a cadence that never fires. → DOC-NAV-15
19. **Fires nav and search rules on a bare `docs/` tree**, producing false findings on a repo that was never a docs site. → DOC-NAV-01
20. **Patches the engine's internal `searcher.js` or search worker** to get at the result count, which breaks silently on the next upgrade. → DOC-NAV-16
21. **Reads a page's type from its path or its frontmatter**, which a path classifier gets wrong 32 percent of the time and which mdBook renders as a visible fake heading. → DOC-NAV-05, DOC-NAV-06, DOC-NAV-17

## Open questions

### Needs a human decision

1. **Which sink, on which host?** The cost is settled at $0 to $20 a month across
   three shapes. The choice is not. Eight of nine sites deploy through GitHub Pages,
   which never exposes its logs to the owner, so a log-line sink does not exist for
   them. `ocx` already runs its own nginx reverse proxy and could log a beacon at
   close to zero marginal cost. The owner picks a Cloudflare Worker, an existing
   analytics vendor's custom event, or the `ocx` proxy. This is also a privacy
   decision on nine public sites.
2. **`ocx`: build a VitePress breadcrumb component, or cut the nav to two levels?**
   DOC-NAV-04 accepts either. The component is real engineering on the fleet's largest
   docs surface. Cutting to two levels reshapes a 14-leaf "In Depth" group.
3. **Does DOC-NAV-06 apply retroactively to 16 pages?** Wave 1 asked this about two
   pages. Wave 2 found 16. Enforcing on changed files only is a one-line change and
   leaves 15 standing exceptions.
4. **Is `command-line.md` at roughly 33,000 words genuinely exempt?** The reference
   carve-out was written to protect a page that carries a structural test. It is not
   obvious that the carve-out should have no ceiling of its own.
5. **Algolia DocSearch as a named upgrade path**: the program accepts an application
   cycle and a permanent visible attribution link, or it does not. DOC-NAV-10 does not
   require it either way.

### Deserves another research round

- **`nav-split-threshold-from-behaviour`**: the 4000-word split threshold rests on
  the fleet's own distribution and nothing else. Is there a per-page-type threshold
  derivable from search or scroll behaviour, or from a findability study, that would
  replace a number this program invented?
- **`agent-readable-navigation`**: the map carries an unresolved conflict that
  progressive disclosure helps a human reader and costs an agent roughly 31 times in
  bytes, owned by `agent-readable-surface`. Nobody has asked whether DOC-NAV-02's
  collapse-based resolution and DOC-NAV-06's page splitting help or hurt a
  retrieval-augmented agent reading the same site.
- **`page-to-test-binding`**: DOC-NAV-05's reference carve-out needs a mechanical
  binding between a page and the test that covers it. DOC-EX-02's declared binding key
  already exists with 66 uses and zero orphans. The question is what the key looks like
  on a page rather than on a fence.
- **`docsearch-free-tier-dashboard`**: Algolia's own metrics reference lists "No
  Results Rate" as a base-plan metric with no paid-tier callout, which raises
  confidence without confirming that the free DocSearch program ships the same
  dashboard. A project accepted into the program should check its own dashboard.

### Documented gaps, not open questions

- **The GA4 last mile.** The non-satisfier claim is settled by two primary sources
  read together. Nobody has watched DebugView while typing a nonsense query into a
  live Material site. That is a ten-minute check and the mechanism predicts its result.
- **The reference carve-out is unverifiable as written.** DOC-NAV-05 reads as verified
  and is not, because no mechanical binding ties a test file to a page. The row now
  says so.

## Revision log

- **Wave 2, 2026-09-05.** Revised in place against two dives and four cross-cutting artifacts. No ID renumbered, no number reused.
- **Frontmatter**: added the two wave-2 dives to `consolidates`, the four cross-cutting artifacts and the wave-1 critique to `grounded_against`, plus `revised` and `wave`.
- **DOC-NAV-01**: verification now names the VitePress config paths explicitly. `wave2-calibration-a.md` found a nav check that reported "no generator nav config" for `ocx` because it looked only for `mkdocs.yml` and `SUMMARY.md`, silently skipping the fleet's one VitePress site. Severity unchanged.
- **DOC-NAV-02**: threshold now names its source on the row, per DOC-AGENT-12. Verification gained the permissive-YAML-loader requirement, because `yaml.safe_load` hard-fails on 4 of 7 fleet configs. Measured 0 of 9 over depth 3, red on a planted depth-4 config. MUST held.
- **DOC-NAV-03**: MUST demoted to SHOULD per the severity ledger, because the 8-page threshold is argued while the measured failure is 20 items. The row states the demotion condition. Verification gained the mdBook `# Summary` fix, which had silently marked `grimoire`'s flat nav as grouped.
- **DOC-NAV-04**: MUST held. The VitePress and mdBook arm now carries `unverified: reading heuristic` per DOC-AGENT-16, which permits a mixed row when the marker names its clause. Hit count added.
- **DOC-NAV-05**: fleet claim corrected from "exactly one H5 page" to two. The carve-out now carries the marker, because no mechanical page-to-test binding exists. Row records that it owns the H5 cap, which DOC-TYPE-19 loses. Type read now goes through `checks/doc-declaration.sh`.
- **DOC-NAV-06**: framing corrected from "two outliers" to 16 pages over 4000 words. Threshold now names the fleet distribution on the row. Reference exemption now reads the declaration comment, never a path.
- **DOC-NAV-07**: narrowed to the authoring half only. The resolver moved to DOC-OBS-02 per severity-ledger overlap 1. MUST held.
- **DOC-NAV-08**: RETIRED, merged into DOC-OBS-02. Row kept, number not reused.
- **DOC-NAV-09**: split severity, SHOULD for the role-noun grep and CONSIDER for the denylist arm, per the ledger. Wave 1 recorded this rule as unmeasured. It is now 0 of 249 titles and 0 of 9 nav configs. The "not measured" line is gone from the fleet section.
- **DOC-NAV-10**: kept in DOC-NAV against the severity ledger's routing to DOC-OBS. The ledger routed ownership before the sink was priced and explicitly deferred the decision to the `zero-result-ownership-and-sink` commission. That commission priced the sink and returned ownership here, because DOC-NAV owns the whole lifecycle. Rule text now requires a `fetch` or `sendBeacon` call in the same file, closing the dead-beacon gap. GA4 non-satisfier evidence upgraded from argued to measured. Severity stays SHOULD.
- **DOC-NAV-11**: measured hit count added, 0 of 9 configs. MUST held.
- **DOC-NAV-12**: rewritten and demoted to CONSIDER per the ledger and the landing-check commission. Scope narrowed to the rendered empty-state and 404 templates. `landing` removed from applies-to. The "exactly one link, two or more fails" cap dropped, because the re-fetched Atlassian source gives no button count. The placeholder-text clause dropped, because DOC-TYPE-14 owns it.
- **DOC-NAV-13**: kept at CONSIDER against the ledger's instruction to drop it, and reworded from "rank titles above body text" to "never flatten the boosts". The ledger's reason to drop was that the claimed fleet violation is false, which is true and now corrected. Calibration then wrote a working check that passes on `grimoire`'s real config and goes red on a planted flattened config, so the rule has a red state and costs one grep. A rule with zero current violations and a plantable failure is exactly the shape DOC-PLAIN-18 asks for.
- **DOC-NAV-14**: SHOULD demoted to CONSIDER per the ledger, because it consumes a log that does not exist yet. Threshold labelled asserted. Measured as vacuous, 0 of 9.
- **DOC-NAV-15**: CONSIDER held. Measured 0 of 249 hits. Row records that it owns the cadence-word ban, so DOC-DISC-12, DOC-OBS-10 and DOC-OBS-11 restate their triggers.
- **DOC-NAV-16**: rationale re-cited. `squidfunk/mkdocs-material#2973` was fixed in Material 7.2.6 and is not a live risk on the pinned 9.7.7. The rule now rests on the maintainer's own refusal to support custom search workers. Marker added. SHOULD held.
- **DOC-NAV-17**: NEW. The stub-page link floor, split out of DOC-NAV-12. At least one outbound link on any authored page under 150 words, no upper cap. SHOULD, measured at 15 of 53 failing.
- **Declaration key applied** to DOC-NAV-05, DOC-NAV-06 and DOC-NAV-17, the three rules that read a page type. All three now call `checks/doc-declaration.sh`, which reads a `doc_type` comment in the first 12 lines and never reads a path or frontmatter.
- **Verdict** rewritten for what wave 2 settled: the script exists, the sink is priced, ownership is decided, GA4 and the worker bug are closed.
- **Open questions**: removed `search-sink-and-privacy`, `ga4-overlay-search-verification` and `mkdocs-material-worker-override-status`, all answered. Added a "Documented gaps" section for the GA4 last mile and the unverifiable reference carve-out. The sink question survives as a narrowed owner decision about which host and what privacy posture.
- **AI-agent failure modes**: 6 added from wave 2, covering the dead beacon, the YAML tag failure, the `# Summary` miscount, the VitePress discovery gap, the link floor read as a ceiling, and reading a type from a path.

## Sub-artifacts

- [nav-depth-and-information-architecture.md](docs-navigation-search/nav-depth-and-information-architecture.md)
  (wave 1) resolves the NN/g-versus-generators depth conflict through collapse, and
  sets the depth, heading-depth, page-length and anchor rules.
- [search-contract-and-zero-result-loop.md](docs-navigation-search/search-contract-and-zero-result-loop.md)
  (wave 1) establishes that none of the fleet's three search engines can report a zero
  result, costs three capture mechanisms, and kills the Algolia synonym playbook.
- [reader-signals-and-zero-result-sink.md](docs-observability/reader-signals-and-zero-result-sink.md)
  (wave 2) prices the sink at $0 to $20 a month across three shapes, returns ownership
  of the zero-result signal to DOC-NAV, settles GA4 by mechanism, and confirms that
  mkdocs-material#2973 was fixed in 7.2.6.
- [wave2-landing-check-portability.md](docs-topic-map/wave2-landing-check-portability.md)
  (wave 2) splits DOC-NAV-12 into an empty-state template contract and a stub-page link
  floor, shows the claimed conflict with the landing family was a measurement error,
  and finds the real collision on five short section-index pages.
- [wave2-calibration-b.md](docs-topic-map/wave2-calibration-b.md)
  (wave 2) writes `checks/nav_depth.py`, fixes it twice, and measures every runnable
  DOC-NAV check against the 249-file corpus.
- [wave2-severity-ledger.md](docs-topic-map/wave2-severity-ledger.md)
  (wave 2) sets the severity for every DOC-NAV row and assigns the family's overlaps.
- [wave2-declaration-key.md](docs-topic-map/wave2-declaration-key.md)
  (wave 2) fixes the one carrier every rule that reads a page type must use.

## Key sources

| URL | Why it is here |
|---|---|
| [nngroup.com/articles/progressive-disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | The 2-level ceiling and its 46-application basis, one half of the group's named conflict |
| [vitepress.dev/reference/default-theme-sidebar](https://vitepress.dev/reference/default-theme-sidebar) | Verified directly: 6-level silent cap, and sections open by default unless `collapsed: true` |
| [docusaurus.io/docs/sidebar](https://docusaurus.io/docs/sidebar) | The 4-plus-level worked example with no stated ceiling, the other half of the conflict |
| [nngroup.com/articles/breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/) | Verified directly: unnecessary only at 1 to 2 levels |
| [squidfunk.github.io/mkdocs-material/setup/setting-up-navigation](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/) | Verified directly: `navigation.path` renders a breadcrumb, added in 9.7.0 |
| [rust-lang.github.io/mdbook/format/summary.html](https://rust-lang.github.io/mdbook/format/summary.html) | Verified directly: a level-1 header is an unclickable part title, and the file's own first `# ` line is mandatory |
| [nngroup.com/articles/information-scent](https://www.nngroup.com/articles/information-scent/) | Verified directly: jargon and branded terms in link labels reduce click-through |
| [insidegovuk.blog.gov.uk/2014/07/18/hey-you-there-the-trouble-with-audience-based-navigation](https://insidegovuk.blog.gov.uk/2014/07/18/hey-you-there-the-trouble-with-audience-based-navigation/) | Verified directly: GOV.UK's four measured failures of audience labels |
| [nngroup.com/articles/search-visible-and-simple](https://www.nngroup.com/articles/search-visible-and-simple/) | 51/32/18 percent success decay, half of failed searchers abandon, 2.0-word mean query |
| [atlassian.design/foundations/content/designing-messages/empty-state](https://atlassian.design/foundations/content/designing-messages/empty-state) | Re-fetched twice in wave 2: a scannable title, one to two sentences, and a one-to-two-word CTA label. It states no button count. |
| [support.google.com/analytics/answer/9216061](https://support.google.com/analytics/answer/9216061) | GA4's own trigger description: five URL query parameters at page view. The mechanism half that settles the non-satisfier claim. |
| [squidfunk.github.io/mkdocs-material/setup/setting-up-site-search](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) | Confirms lunr, client-side only, and that `search.share` acts only on a manual click |
| [rust-lang.github.io/mdbook/format/configuration/renderers.html](https://rust-lang.github.io/mdbook/format/configuration/renderers.html) | `[output.html.search]` boost defaults of 2:1:1, and the absence of any event hook |
| [algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results](https://www.algolia.com/doc/guides/managing-results/optimize-search-results/empty-or-insufficient-results/) | The five remediation levers, none of which exists in this fleet's engines |
| [developers.cloudflare.com/workers/platform/pricing](https://developers.cloudflare.com/workers/platform/pricing/) | The free-tier request and storage figures behind the cheapest sink |
| [docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) | GitHub Pages logs visitor IPs and never exposes them to the owner, which kills the log-line sink for 8 of 9 sites |
| [pagefind.app](https://pagefind.app/) | The documented public `pagefind.search()` contract behind DOC-NAV-16's stricter branch |
| [github.com/squidfunk/mkdocs-material/issues/2973](https://github.com/squidfunk/mkdocs-material/issues/2973) | Fixed in 7.2.6, and the maintainer's refusal to support custom search workers, which is now DOC-NAV-16's real reason |
| [baymard.com/blog/ecommerce-search-query-types](https://baymard.com/blog/ecommerce-search-query-types) | The query taxonomy whose worst class maps onto a conceptual docs query |

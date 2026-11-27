---
title: Per-chart method records and the MKT-CLAIM-28 and 30 verifications, measured
program: product
topic: marketing-claims-evidence
worker: followup-w3-q1
wave: 3
date_researched: 2026-11-27
model: sonnet
sources_fetched: 103
---

# Per-chart method records and the MKT-CLAIM-28 and 30 verifications, measured

Question (from `product-resume/wave3/marketing-claims-evidence/q1.md`): (1) does a per-chart `performance` record, checked against the enclosing sectioning element, separate covered charts from uncovered ones, and should it replace the 300-character test of MKT-CLAIM-06 for charts; (2) do the verifications of MKT-CLAIM-28 and MKT-CLAIM-30, as written, separate a pass from a fail on real pages.

This file replaces the first version. The repair redid the work that version only counted, sampled or asserted: proposed MKT-CLAIM-30 (1) is now run end to end on all comparison pages, the word list of (3) has a measured confusion table, MKT-CLAIM-28 (c) is run on the full case table with real URLs, the MKT-CLAIM-05 fallback is run, every measurement shows its command and its complete output, and Part 2 now covers 17 pages (10 with a comparison table or figure, 8 with a customer quote beside a figure; dragonfly has both). All scripts, saved pages and outputs are in `~/.cache/research-lang/exemplars/product/wave2/mkt-claims-w3q1/` (`scripts/` for the first run, `r/` for the repair; outputs in `r/out/`). All pages are vendor pages (vendor data), fetched 2026-11-27. One reader (me) hand-labelled every chart, cell and line; there was no second rater.

## Answer

1. **Part 1: yes, with two guards.** On 39 charts from 10 pages, a per-chart record whose `claim` is the chart title and whose `method` URL must appear as a link inside the title's scope gave 19 true passes, 20 true fails, 0 false passes, 0 false fails against a hand label. The 300-character test found an anchor within 300 characters of 5 of 102 located values and passed 1 of 19 covered charts; for 5 charts it located no value at all. The check needs two guards, or a shortcut author gets 11 false passes: a heading-delimited fallback when the page has no `<section>`, `<article>` or `<aside>`, and a refusal of a `method` URL that is the page itself. It replaces the 300-character test for charts, not for sentences. It tests that the link is in the chart's block, not that the page behind it reproduces the chart (swapping the four bun.sh hero URLs passed 4 of 4).
2. **MKT-CLAIM-30 (1) as written fails every compliant page and cannot see a missing cell; the replacement works.** On 9 table pages (607 required cells, 512 text cells marked), old (1) returned FAIL on all 9 pages where a hand label says 7 should pass (7 false fails), and when one marker was dropped its uncovered count rose in 71 of 512 variants and its verdict flipped in 0. The replacement (per-cell markers in compared-party columns, marker bound to the cell text) passed 7 of 7 compliant pages, failed the 2 pages with icon-only cells (95 cells that have no text), and detected 512 of 512 single dropped markers and 27 of 27 tables stripped of all rows on the 4 pages that keep another row (the 5 single-table pages are vacuous, see limits). It costs one row per cell: 607 on these pages (113 to 243 on the big ones).
3. **MKT-CLAIM-30 (3), the evaluative word list, is not a pass/fail separator and cannot become one.** Against 36 hand-labelled evaluative texts (24 negative, 12 positive) in 815 units, the 8-word list as written found 2 (precision 2 of 2, recall 2 of 36, 0 hits on 412 own-product cells). A 14-word list fitted on 5 pages found 12 of 20 there and 3 of 16 on the 4 held-out pages. 27 of the 36 labelled texts are prose outside any table, so applying (3) to table cells only (the first draft of this follow-up) would have found 0 of 9 labelled cell texts and dropped the one real catch. (3) must run on every text node that names a compared party and on every block cell; the rest is a reading list.
4. **MKT-CLAIM-30 (4): drop the word `logo`.** On 9 pages the old text flagged 41 images and svgs, 37 of them wrong (35 the vendor's own or customers' logos, 2 hero images that print a name in type); names only flagged 6: 4 competitor logos or images carrying them, and 2 hero images that print the name in type. One banner (plausible.io) carries the Google Analytics logo and the lines "Complex interface", "Cookie banners needed", "Invasive data collection" and "Less accurate" inside the image, where no text check sees them.
5. **MKT-CLAIM-28 verification, three clauses plus a source form.** 72 cases on 8 real quote-and-figure pages with real URLs: (a) id/`original_ref`/`permission_ref` equality and (b) claim containment catch 32 of 56 bad cases; adding (c) (fetch the `source`, fail when it holds the first 25 characters of the endorsement) with normalised punctuation catches 48 of 56; 0 false fails on 16 compliant cases. The 8 left are a paraphrase whose source is a page that never printed the quote: a reading check. (c) without normalisation misses 2 of 8 (a curly apostrophe inside the first 25 characters).
6. **MKT-CLAIM-05 fallback behaves as the sentence says.** Real api.github.com answered HTTP 403 "API rate limit exceeded" with `x-ratelimit-remaining: 0`; a script that implements the fallback skipped the release arm with a WARN line on 2 of 2 GitHub rows and exited 0; on a local mock it also passed a matching tag, failed a drifted tag, treated a 404 as a skip, and with a token failed on a 403.

## Part 1: the per-chart record

### What was tested

A "chart" is the visible block that shows two or more benchmark values under one title: a `<figure>`, a `<table>`, a div-built bar chart, a screenshot under a heading. Each chart has one hand label: **1** if a link to a reproduction or method page sits in the chart's own block (its caption, footer line, header strip or note); **0** otherwise. A link in the site header, in a sidebar, or in another chart's block does not count. The same reader labelled all 39 charts before running any check.

The record under test, one per chart:

```toml
[[claim]]
id = "perf-<page>-<n>"
class = "performance"
claim = "<the chart title string>"      # figcaption, caption, aria-label, or the heading directly above
method = "<URL of the reproduction page>"
```

The check (`scripts/t1.py`, `scripts/t1c.py`, Python 3 standard library):

1. Find the text node that holds `claim`. Prefer one inside `h1` to `h6`, `caption`, `figcaption` or `legend`, and never one inside `<a>` or `<nav>` (on pnpm and Hono the first text match was a sidebar entry).
2. **Scope** (variant T1): the nearest ancestor that is `section`, `article`, `aside` or `nav`; if none, the `<main>`; if none, the page. **Scope** (variant T1c): the same, but when no sectioning ancestor exists, the heading-delimited range: from the nearest heading at or before the title to the next heading of the same or a higher rank.
3. Pass when the scope holds an `<a href>` that, resolved against the page URL and with its fragment removed, equals the record's `method`. T1c adds: and `method` is not the page's own URL.

The author model "compliant" writes the `method` URL of the page that really documents the chart (a chart whose page offers no method page cannot be filled and counts as a fail). The "shortcut" model takes the first method-like link in the scope, else the first one on the page.

### The 39 charts

| Page (fetched 2026-11-27) | Charts | Label 1 | Label 0 | Where the method link sits |
|---|---|---|---|---|
| [esbuild.github.io](https://esbuild.github.io/) | 1 | 1 | 0 | `<figcaption>`: "More info here" to `/faq/#benchmark-details`; the page has no sectioning element |
| [lightningcss.dev](https://lightningcss.dev/) | 2 | 2 | 0 | each `<figcaption>`: "See the readme for more benchmarks" |
| [pnpm.io/benchmarks](https://pnpm.io/benchmarks) | 3 | 0 | 3 | links sit in the page header and the sidebar; the `Methodology` section is a sibling `<section>`, not the charts' own |
| [rolldown.rs](https://rolldown.rs/) | 1 | 1 | 0 | "Benchmark" link beside the chart, same `<section>` |
| [rspack.dev](https://rspack.dev/) | 1 | 1 | 0 | "See benchmark details", same `<section>` |
| [oxc.rs](https://oxc.rs/) | 1 | 1 | 0 | "Source" link under the parser chart, same `<section>` |
| [hono.dev/docs/concepts/benchmarks](https://hono.dev/docs/concepts/benchmarks) | 5 | 3 | 2 | "Scripts:" links under Cloudflare Workers, Deno and Bun; the Node.js and Bun router screenshots have none; no `<section>` on the page |
| [fastify.dev/benchmarks](https://fastify.dev/benchmarks/) | 6 | 6 | 0 | one footer line under all six charts: "Reproduce them yourself with the official fastify/benchmarks suite" |
| [bun.sh](https://bun.sh/) (cached copy of wave 2) | 10 | 4 | 6 | four `reproduce` links, one per hero chart; the six charts in the "Six tools" articles have none |
| [deno.com](https://deno.com/) (cached copy of wave 2) | 9 | 0 | 9 | none: the block names hardware and tools and has no link |

8 fresh pages and 2 cached pages: 39 charts, 19 labelled 1, 20 labelled 0.

### Commands and complete output

```
$ cd ~/.cache/research-lang/exemplars/product/wave2/mkt-claims-w3q1
$ python3 -I scripts/t1.py                      # full output saved in r/out/t1_full.txt; last three lines:
T1 per-chart/section/URL TP 19 FN(false fail) 0 FP(false pass) 0 TN 20
300char any-anchor TP 1 FN(false fail) 18 FP(false pass) 0 TN 20
300char method-URL TP 0 FN(false fail) 19 FP(false pass) 0 TN 20
```

The 36 lines above those three are one tuple per chart `(page, title, scope, links in scope, T1 pass, 300-char any-anchor, 300-char method-URL, hand label)`; they are in `r/out/t1_full.txt`. Where the last two columns read `None`, the 300-character harness located no value in that chart (rolldown, oxc, hono "On Node.js", "On Bun", "=Bun"), and the confusion table counts `None` as a fail. Three of those five are covered charts, so part of the 300-character test's 18 false fails is "no located value", not "no anchor".

**The count "5 of 102 located values"** (`r/t1_vals.py`: for each chart the three located values nearest its title; window 300 characters either side on the same source line; the anchor test is `<a ` and `href=` inside the window):

```
$ python3 -I r/t1_vals.py | tail -2
charts with no located value (value regex None or no match): 5 of 39
located values: 102 | with an <a href within 300 chars: 5
```

The 5 are 2 values of lightningcss "Time to minify Bootstrap 4" and 3 of "Output size after minifying Bootstrap 4"; every other chart has 0.

**Confusion tables** against the hand label:

| Test | Author | Passes covered (TP) | Fails covered (false fail) | Passes uncovered (false pass) | Fails uncovered (TN) |
|---|---|---|---|---|---|
| 300 characters, any anchor | any | 1 | 18 | 0 | 20 |
| 300 characters, `method` URL | compliant | 0 | 19 | 0 | 20 |
| Per-chart record, T1 (`main` fallback) | compliant | 19 | 0 | 0 | 20 |
| Per-chart record, T1 (`main` fallback) | shortcut | 19 | 0 | 11 | 9 |
| Per-chart record, T1c (heading range, self-URL refused) | compliant | 19 | 0 | 0 | 20 |
| Per-chart record, T1c (heading range, self-URL refused) | shortcut | 19 | 0 | 0 | 20 |

**The 11 false passes of the wide scope, with the command that produced each line** (`scripts/t1b.py`, complete output):

```
$ python3 -I scripts/t1b.py
shortcut author: pass 30 of 39 | false passes 11 | true passes 19
  FALSE PASS ('hono', 'On Node.js', 0, True, '#benchmarks')
  FALSE PASS ('hono', 'On Bun', 0, True, '#benchmarks')
  FALSE PASS ('deno', 'Realworld: Requests / sec', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Realworld: p99 latency', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Realworld: Peak memory', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Hello world: Requests / sec', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Hello world: p99 latency', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Hello world: Peak memory', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'TypeScript startup', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Package install: Time', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
  FALSE PASS ('deno', 'Gzip DecompressionStream', 0, True, 'https://github.com/denoland/deno/blob/main/Releases.md')
```

What those links are, from the saved pages (`tree.py` walk over every `<a>`):

```
deno (51, 21743) https://github.com/denoland/deno/blob/main/Releases.md 'Release notes'      # in <main>, not in any chart block
hono (29, 41005) #benchmarks '​'                                                          # the page's own heading anchor, inside <main>
```

So the Deno false passes are the "Release notes" link and the Hono ones are the page's own `#benchmarks` heading anchor. The heading range removes all 11; the complete output of the T1c run (`scripts/t1c.py`):

```
$ python3 -I scripts/t1c.py
compliant TP 19 FN 0 FP 0 TN 20
   ('esbuild', 'Above: the time to do a prod', 'heading-range:h1', 19, True, 1)
   ('hono', 'Cloudflare Workers', 'heading-range:h2', 2, True, 1)
   ('hono', '=Deno', 'heading-range:h2', 3, True, 1)
   ('hono', 'On Node.js', 'heading-range:h3', 1, False, 0)
   ('hono', 'On Bun', 'heading-range:h3', 1, False, 0)
   ('hono', '=Bun', 'heading-range:h2', 5, True, 1)
   ('deno', 'Realworld: Requests / sec', 'heading-range:h3', 0, False, 0)
   ('deno', 'Realworld: p99 latency', 'heading-range:h3', 0, False, 0)
   ('deno', 'Realworld: Peak memory', 'heading-range:h3', 0, False, 0)
   ('deno', 'Hello world: Requests / sec', 'heading-range:h3', 0, False, 0)
   ('deno', 'Hello world: p99 latency', 'heading-range:h3', 0, False, 0)
   ('deno', 'Hello world: Peak memory', 'heading-range:h3', 0, False, 0)
   ('deno', 'TypeScript startup', 'heading-range:h3', 0, False, 0)
   ('deno', 'Package install: Time', 'heading-range:h3', 1, False, 0)
   ('deno', 'Gzip DecompressionStream', 'heading-range:h3', 0, False, 0)
shortcut TP 19 FN 0 FP 0 TN 20
```

Each Deno chart's heading range holds 0 links (1 for "Package install", a non-method link), and Hono's two screenshots' ranges hold only their own heading anchor, which the self-URL refusal rejects. One weakness the table shows: esbuild's heading range is 19 links, because its only heading is an `h1` and the range runs to the end of the page. The sample holds no uncovered chart on such a page, so a false pass there is not observed, not excluded.

**The bun.sh relevance test** (`r/t1_swap.py`: give each of the four hero charts the next chart's `method` URL, cyclically, and run the T1c check):

```
$ python3 -I r/t1_swap.py
Installing a Next.js app             own method in scope: True | NEXT chart method in scope: True  (https://github.com/oven-sh/bun/tree/main/bench/express)
Serving Express over HTTPS           own method in scope: True | NEXT chart method in scope: True  (https://github.com/oven-sh/bun/tree/main/bench/postgres)
Querying Postgres                    own method in scope: True | NEXT chart method in scope: True  (https://github.com/oven-sh/bun/tree/main/bench/websocket-server)
Running a WebSocket chat server      own method in scope: True | NEXT chart method in scope: True  (https://github.com/oven-sh/bun/tree/main/bench/install)
swapped URLs passed 4 of 4
```

The four charts share one `<section>` and four links, so the check proves "a link to that URL is nearby", not "this URL reproduces this chart". Fastify has the opposite shape: one footer link covers six charts, and the titles repeat in pairs ("Requests per second" under GET and under POST), so the title alone does not identify a chart; the harness needed occurrence index 0 or 1. A real lint needs a unique `claim` per chart, with the group heading written into the title ("GET /: Requests per second").

**One borderline label.** pnpm's charts link the benchmark repository from a header block above them and from the sidebar, and a `Methodology` section sits lower. I labelled the three charts 0 under the stated rule. If a page-level header link counts as covered, the three become label 1, the per-chart check then has 3 false fails, and the 300-character test has 3 more.

**Only charts with a row are checked.** The check finds charts through their records. A chart with no record is found only by check C (the MKT-CLAIM-02 unit arms), which this follow-up did not re-run on the 39 charts.

### Should it replace the 300-character test for charts

Yes, for charts. The 300-character rule would have failed 18 of 19 covered charts on this sample and found an anchor for 5 of 102 values, and wave 2 measured 105 of 124 values failing. The per-chart check failed none and passed none wrongly under T1c. Keep the 300-character rule for a figure in a sentence.

## Part 2: the pages

Seventeen distinct pages, none of them in a wave-1 or wave-2 artifact of this topic (checked with `grep -rl <host> marketing-claims-evidence.md marketing-claims-evidence/`; `nx.dev`, `questdb`, `sanity.io`, `singlestore`, `meilisearch.com`, `pnpm.io/feature-comparison` and `n8n.io` have no hit). All fetched 2026-11-27 with `curl -sL -A 'Mozilla/5.0'`; all HTTP 200 (`r/out/codes_all.txt`). The redpanda quote has no figure in it and is not counted as a quote-beside-figure page.

| Page | Comparison table or figure (MKT-CLAIM-30) | Customer quote beside a figure (MKT-CLAIM-28) |
|---|---|---|
| [typesense.org](https://typesense.org/typesense-vs-algolia-vs-elasticsearch-vs-meilisearch/) | 5 tables, 365 td/th | |
| [redpanda.com](https://www.redpanda.com/compare/redpanda-vs-kafka) | 1 table, 54 td/th | |
| [convex.dev](https://www.convex.dev/compare/firebase) | 1 table, 30 td/th | |
| [pulumi.com](https://www.pulumi.com/docs/iac/concepts/vs/terraform/) | 3 tables, 113 td/th | |
| [supabase.com](https://supabase.com/alternatives/supabase-vs-firebase) | 7 tables, 117 td/th | |
| [meilisearch.com](https://www.meilisearch.com/docs/learn/resources/comparison_to_alternatives) | 12 tables, 465 td/th | |
| [pnpm.io](https://pnpm.io/feature-comparison) | 1 table, 88 td/th | |
| [plausible.io](https://plausible.io/vs-google-analytics) | 1 table, 27 td/th, plus a banner image | |
| [posthog.com](https://posthog.com/blog/posthog-vs-amplitude) | 1 table, 21 td/th | |
| [dragonflydb.io](https://www.dragonflydb.io/) | a bar figure against Redis and Valkey (not a table) | Instacart quote with "70%" and "40-50%" in it |
| [motherduck.com](https://motherduck.com/) | | David AI quote with "30x" in it |
| [planetscale.com](https://planetscale.com/) | | Anysphere quote: "millions of queries per second" |
| [pola.rs](https://pola.rs/) | | Rabobank quote with "~30x faster" in it |
| [nx.dev](https://nx.dev/) | | Hetzner Cloud quote ("20 minutes") above a strip "6 days / 85% cache hit rate / 45 to 6 minutes / 116+ projects" |
| [questdb.com](https://questdb.com/) | | B3 quote above "$5B+ daily traded volume" and "99.9% uptime guarantee" |
| [sanity.io](https://www.sanity.io/) | | Yung Studio quote below a strip "300% faster release cycles, 90%, 5x, 144x, 80 hours" |
| [singlestore.com](https://www.singlestore.com/) | | Siemens quote beside "100K concurrent users" and the strip "10-20ms, 10s, 20M" |

Screened and not used (no table, no quote beside a figure, or the figure sat in a script): the other pages listed in `r/urls.txt` and `r/urls2.txt` (for example n8n.io, tinybird.co, turso.tech, vercel.com, cursor.com).

## MKT-CLAIM-30 on the comparison pages

### The first sample, complete output

Ten hand-written rows on six pages (`p2/<page>.claims.toml`, `scripts/p2lint.py`), kept because they show two defects the end-to-end run below does not: a claim split across elements, and a check that sees only named lines. Complete output:

```
$ cd p2; for p in typesense redpandakafka convexfirebase pulumiterra supafire dragonfly; do python3 -I ../scripts/p2lint.py $p; done
## typesense rows 2
 A ts-algolia-license missing: none
 B ts-algolia-license claim lines [73]
 (2) ts-algolia-license https://www.algolia.com/doc/ 200
 A ts-es-lang missing: none
 B ts-es-lang claim lines [86, 436, 566, 573]
 (2) ts-es-lang https://github.com/elastic/elasticsearch 200
 (1) lines naming a compared party: 33 covered by a marker on a claim cell: 0 uncovered: 33
 (3) denigration-word hits on party lines: []
## redpandakafka rows 2
 A rp-kafka-isr missing: none
 B rp-kafka-isr claim lines [79]
 (2) rp-kafka-isr https://kafka.apache.org/documentation/ 200
 A rp-kafka-deps missing: none
 B rp-kafka-deps claim lines [73]
 (2) rp-kafka-deps https://kafka.apache.org/documentation/ 200
 (1) lines naming a compared party: 42 covered by a marker on a claim cell: 0 uncovered: 42
 (3) denigration-word hits on party lines: [(230, 'Legacy Kafka is a collection of parts you have to assemble yourself. Redpanda is a unified')]
## convexfirebase rows 2
 A cx-fb-react missing: none
 B cx-fb-react claim lines [308, 319, 369, 373]
 (2) cx-fb-react https://firebase.google.com/docs 200
 A cx-fb-rel missing: none
 B cx-fb-rel claim lines [308, 319, 369, 373]
 (2) cx-fb-rel https://firebase.google.com/docs 200
 (1) lines naming a compared party: 11 covered by a marker on a claim cell: 0 uncovered: 11
 (3) denigration-word hits on party lines: []
## pulumiterra rows 1
 A pu-tf-lang missing: none
 B pu-tf-lang claim lines [3133]
 (2) pu-tf-lang https://developer.hashicorp.com/terraform/language 200
 (1) lines naming a compared party: 142 covered by a marker on a claim cell: 1 uncovered: 141
 (3) denigration-word hits on party lines: []
## supafire rows 2
 A sb-fb-model missing: none
 B sb-fb-model claim lines [134]
 (2) sb-fb-model https://firebase.google.com/docs/firestore/data-model 200
 A sb-fb-price missing: none
 B sb-fb-price claim lines [283]
 (2) sb-fb-price https://firebase.google.com/pricing 200
 (1) lines naming a compared party: 38 covered by a marker on a claim cell: 1 uncovered: 37
 (3) denigration-word hits on party lines: []
## dragonfly rows 1
 A df-redis-qps missing: none
 B df-redis-qps claim lines NOT BYTE-EQUAL ANYWHERE
 (2) df-redis-qps https://github.com/dragonflydb/dragonfly 200
 (1) lines naming a compared party: 16 covered by a marker on a claim cell: 0 uncovered: 16
 (3) denigration-word hits on party lines: []
```

Two things this shows. **B false fail:** dragonfly's "25x more QPS than Redis" is split across elements (`25x` / `more QPS` / `than Redis`), so no line holds it; the check B needs the claim byte-equal inside one element. **Check A:** the first run wrote `value = "text"` and `unit = "text"` for text cells, because the class table makes `value` and `unit` required for `comparison` while the field table says "for every number-bearing claim". The new run below did the same for 607 rows (all passed check A with that wording), which is the verification of the MKT-CLAIM-04 change.

### Proposed (1), run end to end on 9 table pages

`r/p30.py` does, per page: find every `<table>` and the columns whose header cell names a compared party; write one `comparison` row per non-empty body cell in those columns (`r/toml_<page>.toml`, parsed back with `tomllib`, check A run on all 607 rows); insert `<!--claim:<id>-->` before the closing tag of each such cell in the raw HTML (`r/inj_<page>.html`), re-parse the injected HTML, and run the lint on it. The source of each row is the documentation root of the compared party, HTTP 200 on 2026-11-27 (list under Dated facts); the rows test the checks, not whether the cells are true.

- **F0** (compliant): every text cell carries its marker. Hand label: pass, except that a cell with no text cannot state a fact and is a true fail.
- **F1**: drop the marker of one cell, once per cell (512 variants). Hand label: fail, naming that cell.
- **F3**: remove every row and marker of one table, once per table (27 tables on the 4 pages that keep another row; the other 5 pages have one table each). Hand label: fail.
- New (1): a block is a `table` whose first row names a compared party or that holds a marker of a comparison row; every body cell in a compared-party column must hold text, carry a marker whose row lists that party, and the marker's cell text must equal the row's `claim`.
- Old (1): every line of the source view that names a compared party carries a marker (the wording of MKT-CLAIM-30 (1) today; lines cut at cell, heading, paragraph, `<meta>` and `<img>`).

```
$ cd r; python3 p30.py        # complete output of the F0, F1 and reading-list lines; F3 lines are shown in the table below
## typesense  url=https://typesense.org/typesense-vs-algolia-vs-elasticsearch-vs-meilisearch/
   td/th=365 blocks=5 required text cells=113 icon-only/empty required cells=91 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=91, of which empty-text (icon-only) cells=91 -> FAIL
   new (1) F1, drop one marker at a time: 113 variants, uncovered set grew by exactly the dropped cell: 113, otherwise: 0
   old (1) on F0: party lines=46 uncovered=31 -> FAIL ; old (1) with one marker removed: party lines=46 uncovered=31 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 12
## redpandakafka  url=https://www.redpanda.com/compare/redpanda-vs-kafka
   td/th=54 blocks=1 required text cells=13 icon-only/empty required cells=4 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=4, of which empty-text (icon-only) cells=4 -> FAIL
   new (1) F1, drop one marker at a time: 13 variants, uncovered set grew by exactly the dropped cell: 13, otherwise: 0
   old (1) on F0: party lines=42 uncovered=40 -> FAIL ; old (1) with one marker removed: party lines=42 uncovered=40 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 27
## convexfirebase  url=https://www.convex.dev/compare/firebase
   td/th=30 blocks=1 required text cells=9 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 9 variants, uncovered set grew by exactly the dropped cell: 9, otherwise: 0
   old (1) on F0: party lines=11 uncovered=11 -> FAIL ; old (1) with one marker removed: party lines=11 uncovered=11 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 3
## pulumiterra  url=https://www.pulumi.com/docs/iac/concepts/vs/terraform/
   td/th=113 blocks=3 required text cells=46 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 46 variants, uncovered set grew by exactly the dropped cell: 46, otherwise: 0
   old (1) on F0: party lines=142 uncovered=96 -> FAIL ; old (1) with one marker removed: party lines=142 uncovered=97 (same verdict, cell invisible: False)
   text nodes naming a party outside any table (routed to the reading check): 95
## supafire  url=https://supabase.com/alternatives/supabase-vs-firebase
   td/th=117 blocks=7 required text cells=32 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 32 variants, uncovered set grew by exactly the dropped cell: 32, otherwise: 0
   old (1) on F0: party lines=38 uncovered=30 -> FAIL ; old (1) with one marker removed: party lines=38 uncovered=30 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 19
## meili-algolia  url=https://www.meilisearch.com/docs/learn/resources/comparison_to_alternatives
   td/th=465 blocks=12 required text cells=243 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 243 variants, uncovered set grew by exactly the dropped cell: 243, otherwise: 0
   old (1) on F0: party lines=324 uncovered=81 -> FAIL ; old (1) with one marker removed: party lines=323 uncovered=81 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 46
## pnpmfc  url=https://pnpm.io/feature-comparison
   td/th=88 blocks=1 required text cells=42 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 42 variants, uncovered set grew by exactly the dropped cell: 42, otherwise: 0
   old (1) on F0: party lines=3 uncovered=3 -> FAIL ; old (1) with one marker removed: party lines=3 uncovered=3 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 0
## plausible-ga  url=https://plausible.io/vs-google-analytics
   td/th=27 blocks=1 required text cells=8 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 8 variants, uncovered set grew by exactly the dropped cell: 8, otherwise: 0
   old (1) on F0: party lines=20 uncovered=20 -> FAIL ; old (1) with one marker removed: party lines=20 uncovered=20 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 16
## posthog-amp  url=https://posthog.com/blog/posthog-vs-amplitude
   td/th=21 blocks=1 required text cells=6 icon-only/empty required cells=0 rows-A-incomplete=0 markers-failing-B(bound)=0
   new (1) on F0 (every text cell marked): uncovered=0, of which empty-text (icon-only) cells=0 -> PASS
   new (1) F1, drop one marker at a time: 6 variants, uncovered set grew by exactly the dropped cell: 6, otherwise: 0
   old (1) on F0: party lines=87 uncovered=87 -> FAIL ; old (1) with one marker removed: party lines=87 uncovered=87 (same verdict, cell invisible: True)
   text nodes naming a party outside any table (routed to the reading check): 72
```

The F3 line of the same run (one table at a time loses all its rows): typesense, pulumi, supabase and meilisearch report "text cells uncovered N of N" for every one of their 5, 3, 7 and 12 tables (27 of 27 tables detected through the party names in the header row); redpanda, convex, pnpm, plausible and posthog (5 single-table pages) print "rows left 0: party list empty, check vacuous": with no row at all the lint has no `compared_party` to look for, which is the rule's own stated limit (check (1) sees only names already recorded).

The old (1) count of "uncovered count rose when one marker was dropped" (`r/old1_f1.py`, one raw-text replacement per variant):

```
$ python3 r/old1_f1.py
typesense       variants 113 | old (1) F0 uncovered  31 of  46 party lines | variants where the uncovered count rose: 15
redpandakafka   variants  13 | old (1) F0 uncovered  40 of  42 party lines | variants where the uncovered count rose: 2
convexfirebase  variants   9 | old (1) F0 uncovered  11 of  11 party lines | variants where the uncovered count rose: 0
pulumiterra     variants  46 | old (1) F0 uncovered  96 of 142 party lines | variants where the uncovered count rose: 46
supafire        variants  32 | old (1) F0 uncovered  30 of  38 party lines | variants where the uncovered count rose: 8
meili-algolia   variants 243 | old (1) F0 uncovered  81 of 324 party lines | variants where the uncovered count rose: 0
pnpmfc          variants  42 | old (1) F0 uncovered   3 of   3 party lines | variants where the uncovered count rose: 0
plausible-ga    variants   8 | old (1) F0 uncovered  20 of  20 party lines | variants where the uncovered count rose: 0
posthog-amp     variants   6 | old (1) F0 uncovered  87 of  87 party lines | variants where the uncovered count rose: 0
total variants 512 old (1) uncovered count rose in 71 ; verdict flipped pass->fail in 0
```

The count rose only where the cell text itself names the party (pulumi's cells say "Terraform"; a few typesense and supabase cells name a product).

| Verification | Compliant pages (7 hand-label pass, 2 fail for icon-only cells) | One dropped marker (512 variants) | A table with all rows removed (27 tables on the 4 pages that keep another row) |
|---|---|---|---|
| Old (1) | 9 FAIL: 7 false fails, 2 true fails (by accident: it fails everything) | 0 verdict changes; count rose in 71 (14%) | not tested separately; the verdict is FAIL before and after |
| New (1) | 7 PASS, 2 FAIL: 0 false passes, 0 false fails | 512 of 512 detected, exact cell named | 27 of 27 detected; 5 single-table pages vacuous |

**What the run found beyond the count:**

- **Icon-only cells.** typesense has 91 body cells in compared-party columns whose content is an `<svg>` with no text and no accessible name, redpanda has 4. They are true fails (the cell states no fact the lint can bind), and no row can have a byte-equal `claim`. The other pages show the fact as text (meilisearch and pnpm use an emoji character, which is text).
- **Marker bound to the wrong cell.** Old check B (the claim string occurs somewhere on the page) passes a marker that sits on the wrong cell. `r/bprime.py` rotated all markers by one cell:

```
$ python3 r/bprime.py
markers rotated by one cell (cell i carries the id of cell i+1); old B = claim string occurs somewhere on the page text; B-bound = the cell that holds the marker has text byte-equal to the row claim
typesense       markers 113 | old B fails: 0 | B-bound fails: 102 (markers that still land on an equal-text cell: 11)
redpandakafka   markers  13 | old B fails: 0 | B-bound fails: 13 (markers that still land on an equal-text cell: 0)
convexfirebase  markers   9 | old B fails: 0 | B-bound fails: 2 (markers that still land on an equal-text cell: 7)
pulumiterra     markers  46 | old B fails: 0 | B-bound fails: 46 (markers that still land on an equal-text cell: 0)
supafire        markers  32 | old B fails: 0 | B-bound fails: 32 (markers that still land on an equal-text cell: 0)
meili-algolia   markers 243 | old B fails: 0 | B-bound fails: 135 (markers that still land on an equal-text cell: 108)
pnpmfc          markers  42 | old B fails: 0 | B-bound fails: 24 (markers that still land on an equal-text cell: 18)
plausible-ga    markers   8 | old B fails: 0 | B-bound fails: 6 (markers that still land on an equal-text cell: 2)
posthog-amp     markers   6 | old B fails: 0 | B-bound fails: 6 (markers that still land on an equal-text cell: 0)
```

  Where many cells hold the same text ("Yes", the emoji) a rotated marker can still land on an equal cell; the bound check cannot see that, and a human cannot either.
- **Nested tables.** None of the 9 pages nests a table. A fixture does (`r/nested.py`, outer table whose third-party cell holds an inner table with one unmarked cell):

```
$ python3 r/nested.py
nested fixture: outer table 2 body rows, third-party column cell 2 holds an inner table with cells Build (marked n2) and Grow (no marker)
blocks found 2 | uncovered cells reported: [(0, 2, 2, 'Build Grow')]
the unmarked inner cell "Grow" is reported: False
the outer cell that holds the inner table is reported (its marker is on an inner cell only): True
```

  The lint reports the outer cell (false fail) and misses the unmarked inner cell (false pass). The new text therefore bans a table inside a block cell.
- **Cost.** One row and one marker per compared-party cell: 113, 13, 9, 46, 32, 243, 42, 8 and 6 text cells on the 9 pages (607 required cells with the 95 icon-only ones). Pulumi's two mapping tables (Terraform term to Pulumi term, 12 and 20 rows) are blocks too, and their first column is a compared-party column by header, so each term needs a row. Whether an owner tolerates that cost is not tested (see What could not be determined).
- **Reading-list volume.** Text nodes outside any table that name a compared party: 12, 27, 3, 95, 19, 46, 0, 16 and 72, in all 290 on the 9 pages. They are routed to the reading check, not failed: failing them would fail 137 of the 164 unique units of 25 characters or more that are not evaluative (84%).

### Check (3), the evaluative words, with a confusion table

Method (`r/eval3.py`, complete output below). Units: 815 unique texts: 239 unique cells of compared-party columns, 412 other block cells (own product and feature names), 164 unique text nodes of 25 characters or more outside any table that name a compared party (machine data such as a JSON text node removed). Hand label: a text is **evaluative** when it passes a judgement on the third party instead of stating a fact one can check against the cited source: **D** (negative) or **E+** (positive); the rule says "no evaluative word about the third party", so both polarities count. 36 units carry a label (24 D, 12 E+): 9 are cells, 27 are prose. One cell is borderline and unlabelled ("Instant Search-as-you-type Experiences for use cases that don't require a highly-available fault-tolerant setup", a Meilisearch cell on typesense.org). Two lists: HARD is MKT-CLAIM-30 (3) as written (8 words); SOFT is the reading list proposed in the first version of this follow-up, now with word boundaries (without them `lacks?` matched "Slack" in 3 cells). The Meilisearch cell "Has known limitations around fault tolerance, recovery and resilience" on typesense.org is labelled D (a verdict with no checkable content).

```
$ python3 r/eval3.py
units 815 Counter({'cell-own': 412, 'cell-party': 239, 'prose': 164})
hard list (8 words, MKT-CLAIM-30 (3) as written) | all units: TP 2 FP 0 FN 34 TN 367 | precision 2/2 recall 2/36
hard list (8 words, MKT-CLAIM-30 (3) as written) | held-out pages (meili-algolia, pnpmfc, plausible-ga, posthog-amp): TP 1 FP 0 FN 15 TN 121 | precision 1/1 recall 1/16
hard list (8 words, MKT-CLAIM-30 (3) as written) | first 5 pages: TP 1 FP 0 FN 19 TN 246 | precision 1/1 recall 1/20
soft list as proposed in wave 3 draft | all units: TP 4 FP 0 FN 32 TN 367 | precision 4/4 recall 4/36
soft list as proposed in wave 3 draft | held-out pages (meili-algolia, pnpmfc, plausible-ga, posthog-amp): TP 0 FP 0 FN 16 TN 121 | precision 0/0 recall 0/16
soft list as proposed in wave 3 draft | first 5 pages: TP 4 FP 0 FN 16 TN 246 | precision 4/4 recall 4/20
wave-2 candidate list (23 words) | all units: TP 9 FP 9 FN 27 TN 358 | precision 9/18 recall 9/36
wave-2 candidate list (23 words) | held-out pages (meili-algolia, pnpmfc, plausible-ga, posthog-amp): TP 2 FP 6 FN 14 TN 115 | precision 2/8 recall 2/16
wave-2 candidate list (23 words) | first 5 pages: TP 7 FP 3 FN 13 TN 243 | precision 7/10 recall 7/20
hard OR soft | all units: TP 6 FP 0 FN 30 TN 367 | precision 6/6 recall 6/36
hard OR soft | held-out pages (meili-algolia, pnpmfc, plausible-ga, posthog-amp): TP 1 FP 0 FN 15 TN 121 | precision 1/1 recall 1/16
hard OR soft | first 5 pages: TP 5 FP 0 FN 15 TN 246 | precision 5/5 recall 5/20
own-product / feature cells hit by hard list: 0 of 412 []
own-product / feature cells hit by soft list: 0 of 412 []
list fitted on the first 5 pages | first 5 pages (where the words were taken from) : TP 12 FP 0 FN 8 TN 246 | precision 12/12 recall 12/20 []
list fitted on the first 5 pages | held-out 4 pages : TP 3 FP 0 FN 13 TN 121 | precision 3/3 recall 3/16 []
borderline unlabelled: [('typesense', "Instant Search-as-you-type Experiences for use cases that don't requir")]
labelled evaluative units: D 24 E+ 12
```

"Wave-2 candidate list (23 words)" is the `unsafe|less flexible|...|costly` list of the first version of this follow-up before it was trimmed; the "fitted" list is `unsafe|less flexible|complexity|overhead|hard to predict|surprise|DIY|legacy|not recommended|tight coupling|unpredictable|data loss|not suited|too slow`, taken from the D-labelled texts of the first 5 pages (typesense, redpanda, convex, pulumi, supabase) and tested on the 4 pages it did not see. Per page (`r/out/eval3_pages.txt`: labelled D, labelled E+, hard-list hits, soft-list hits): typesense 2 0 0 1; redpanda 7 1 1 1; convex 0 0 0 0; pulumi 1 0 0 0; supabase 4 5 0 2; meilisearch 5 2 0 0; pnpm 0 0 0 0; plausible 3 0 0 0; posthog 2 4 1 0.

Where the labelled texts are: cells of compared-party columns 9, hard-list hits among them 0; prose 27, hard-list hits 2 ("Legacy Kafka is a collection of parts you have to assemble yourself" on redpanda.com, and "a legacy feature" on posthog.com). Examples the word lists cannot see: "DIY effort" (redpanda cell), "But not recommended" (typesense, an Algolia cell), "Tight coupling to Google Cloud products" (supabase cell), "Reads payload as JSON which can lead to document corruption" (meilisearch cell, a Typesense column), "without the Kafka complexity" and "without Kafka's operational overhead" (redpanda prose), "Firebase's usage-based pricing can surprise teams as their apps grow" (supabase prose; the soft list does see this one), "Complex interface" and "Invasive data collection" (inside the plausible.io banner image).

**Verdict on (3).** The hard list is a safe fail check (0 false positives in 815 units, 0 hits on 412 own-product cells) and a poor detector (2 of 36). The reading list of the first version, with word boundaries, has 0 false positives and finds 4 of 36 (0 of 16 on the 4 held-out pages). A fitted list reaches 12 of 20 on the pages it was fitted on and 3 of 16 elsewhere. No word list gives a pass/fail separation of "no evaluative language". What does separate: the work list. The lint prints every text node naming a compared party outside a block (290 nodes on these pages; of 164 unique units of 25 or more characters 27 are evaluative: 16%) and every block cell, and the reviewer must record for each prose line "fact with row" or "no claim". That is a reading check with a bounded list, not a pass/fail.

### Check (4), logos

`r/img4.py` counts `<img>` and `<svg>` elements per page whose `src`, `alt`, `title`, `data-src`, `srcset` or `aria-label` holds a compared party's name (spaces optional, case-insensitive) or the word `logo`. Hand label of competitor-logo images: I opened the three images that carry the compared party in a picture (`r/img/`). The redpanda guide cover shows the Apache Kafka mark; the plausible banner shows the Google Analytics logo; the posthog hero shows only the words "PostHog vs Amplitude" in type and a mascot, no Amplitude logo.

```
$ python3 r/img4.py
page            old rule (name or "logo") | new rule (name only) | hand-labelled competitor-logo images
typesense          4 |  0 | 0
redpandakafka     20 |  2 | 2
convexfirebase     2 |  1 | 1
pulumiterra        3 |  0 | 0
supafire           2 |  0 | 0
meili-algolia      4 |  0 | 0
pnpmfc             0 |  0 | 0
plausible-ga       4 |  1 | 1
posthog-amp        2 |  2 | 0
totals old 41 new 6 competitor logos 4
```

The hand-label column is the 4 competitor-logo images: redpanda 2 (the table header `logo_apache-kafka.svg` and the guide cover), convex 1, plausible 1 (the first run of this script had redpanda 1 until the guide cover was opened; the output above is the re-run). Confusion (hand-labelled, 9 pages): old rule 41 flagged, 4 competitor logos among them, 37 false fails (the product's own and customers' logos: typesense 4, redpanda 18, convex 1, pulumi 3, supabase 2, meilisearch 4, plausible 3; and the posthog hero image twice). New rule 6 flagged: 4 true (redpanda 2, convex 1, plausible 1), 2 false fails (the posthog hero image twice). Recall of the new rule: I listed every image file the new rule did not flag on the 9 pages (`r/out/img_unflagged.txt`; by file name): none is a competitor logo; 3 table-cell images on redpanda have opaque file names (`3aca7e03...`, `2d5d3f5d...`, `743941f5...`) and sit in the check and cross columns, which I did not open. Image text is outside every text check: the plausible banner prints "Complex interface", "Cookie banners needed", "Invasive data collection" and "Less accurate" under the Google Analytics logo, and its `alt` reads "Plausible vs Google Analytics 4 comparison".

### Check (2) and check (5)

(2), HTTP 200 for each `source`: 10 documentation roots, 10 of 10 returned 200 on 2026-11-27 (list under Dated facts); the check still cannot tell a page that supports a cell from one that does not.

(5) is the MKT-CLAIM-05 release arm; see the next section.

## MKT-CLAIM-28 on eight quote-and-figure pages, 72 cases

`r/p28b.py` takes the quote verbatim from each saved page, fetches every URL a row uses live (`curl -sL -m 40`), and runs three clause sets on 9 variants per page. The clauses: **(a)** `source` equals the endorsement `id`, `original_ref` or `permission_ref`; **(b)** the row's `claim` is contained in the endorsement's `claim`; **source form** (new): `source` must be an `https://` URL, a repository path or a decision reference; **(c)** `source` is a URL whose fetched page text (script and style removed, tags stripped, entities decoded, whitespace collapsed) holds the first 25 characters of the endorsement's `claim`. Mode `ab` = (a), (b) and source form. `abc` = plus (c) as written. `abcn` = plus (c) with normalised punctuation (NFKC, curly quotes to straight, lower case) on both sides.

| Variant | What the author did | Hand label |
|---|---|---|
| V0 | endorsement row only | pass |
| V0b | plus an own-measurement row for a figure that is not in the quote (the page's own number), `source` = the vendor's repository or docs page | pass |
| V1 | `source` = the endorsement id | fail |
| V2 | `source` = the endorsement's `original_ref` (the page URL) | fail |
| V3 | `claim` = a 40-character slice of the quote | fail |
| V4a | paraphrase of the quote; `source` = the same page under another URL spelling (`?utm_source=claims`, HTTP 200) | fail |
| V4c | paraphrase of the quote; `source` = the vendor's repository page, which does not print the quote | fail (the number is borrowed from the quote) |
| V5 | paraphrase; `source` = free text naming the quote ("customer statement e-...") | fail |
| V6 | the endorsement typed with ASCII punctuation; V4a objective row | fail |

The objective figure for V0b, per page: dragonfly "25x more QPS than Redis" (split across elements on the page), motherduck "100ms", planetscale "99.999%", pola "34.63 sec", nx "10.6× faster average CI time with 79% less compute.", questdb "32ms", sanity "98% faster translation cycles", singlestore "30x faster query responses". Complete output:

```
$ cd r; python3 p28b.py
page | HTTP page / alt spelling / repo | quote (first 60 chars) | page holds quote (spec flatten) | repo holds quote
dragonfly | 200/200/200 | "By migrating from managed Valkey to Dragonfly Cloud we've be" | page True (normalised True) alt True | repo False
motherduck | 200/200/200 | 'We’re scaling rapidly, but our Postgres cluster kept falling' | page True (normalised True) alt True | repo False
planetscale | 200/200/200 | 'We chose PlanetScale to host our most demanding Vitess and P' | page True (normalised True) alt True | repo False
pola | 200/200/200 | 'The resulting code was impressively fast (~30x faster) and .' | page True (normalised True) alt True | repo False
nx | 200/200/200 | 'Junior developers were amazed at how fast things became. The' | page True (normalised True) alt True | repo False
questdb | 200/200/200 | 'We chose QuestDB for its speed and straightforward deploymen' | page True (normalised True) alt True | repo False
sanity | 200/200/200 | 'Lady Gaga’s team had never used a CMS before. Now they are l' | page True (normalised True) alt True | repo False
singlestore | 200/200/200 | 'With SingleStore, we no longer look at the database as a lim' | page True (normalised True) alt True | repo False

mode ab (want,got): {('pass', 'pass'): 16, ('fail', 'fail'): 32, ('fail', 'pass'): 24}
  MISMATCH ('dragonfly', 'V4a', ...) ... (V4a, V4c and V6 on each of the 8 pages: 24 lines, all want fail, got pass)

mode abc (want,got): {('pass', 'pass'): 16, ('fail', 'fail'): 46, ('fail', 'pass'): 10}
  MISMATCH V4c on each of the 8 pages (8 lines), plus V6 on motherduck and sanity

mode abcn (want,got): {('pass', 'pass'): 16, ('fail', 'fail'): 48, ('fail', 'pass'): 8}
  MISMATCH ('dragonfly', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('motherduck', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('planetscale', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('pola', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('nx', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('questdb', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('sanity', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
  MISMATCH ('singlestore', 'V4c', 'paraphrase, source = repository page without the quote', 'fail', 'pass')
```

(The two modes with many mismatch lines are shortened in this file to their pattern; `r/out/p28b_full.txt` holds all 24 and 10 lines, each of the form `MISMATCH (page, variant, description, want, got)`. The harness counts (want, got) pairs, which are complete above.)

| Variant | Cases | `ab` | `abc` | `abcn` | Why |
|---|---|---|---|---|---|
| V0, V0b | 16 | 16 pass | 16 pass | 16 pass | 0 false fails in all modes. V0b's 8 repository or docs sources do not hold the quote ("repo False" in every row above), so (c) did not fire on a compliant source |
| V1, V2, V3 | 24 | 24 fail | 24 fail | 24 fail | (a) and (b) |
| V5 | 8 | 8 fail | 8 fail | 8 fail | source form (the old text accepted free text and the clause on `source_type = "endorsement"` was dead, see MKT-CLAIM-04's list) |
| V4a | 8 | 8 false pass | 8 fail | 8 fail | (c) |
| V6 | 8 | 8 false pass | 6 fail, 2 false pass | 8 fail | the 2 misses are motherduck ("We’re" with a curly apostrophe at character 3) and sanity ("Gaga’s" at character 10); the page text has the curly form, the author typed the straight one |
| V4c | 8 | 8 false pass | 8 false pass | 8 false pass | the source never prints the quote; only a reader sees that the number is borrowed |

**Own figures that share a token with the quote** (`r/ownfig.py`: tokens `number + unit` in text nodes outside the smallest ancestor that holds the quote and its attribution, compared with the quote's own tokens). This is the check behind "no natural false fail":

```
$ python3 r/ownfig.py | grep '^##'
## dragonfly: figures inside the quote ['70%', '50%']; own figures outside the quote card: 0; own figures whose token occurs in the quote: []
## motherduck: figures inside the quote ['30x']; own figures outside the quote card: 2; own figures whose token occurs in the quote: []
## planetscale: figures inside the quote []; own figures outside the quote card: 3; own figures whose token occurs in the quote: []
## pola: figures inside the quote ['30x']; own figures outside the quote card: 0; own figures whose token occurs in the quote: []
## nx: figures inside the quote ['20 minutes']; own figures outside the quote card: 27; own figures whose token occurs in the quote: [('20 minutes', "Junior developers were amazed at how fast things became. They'd run tests expecting them t"), ('20 minutes', "Junior developers were amazed at how fast things became. They'd run tests expecting them t")]
## questdb: figures inside the quote []; own figures outside the quote card: 22; own figures whose token occurs in the quote: []
## sanity: figures inside the quote []; own figures outside the quote card: 13; own figures whose token occurs in the quote: []
## singlestore: figures inside the quote []; own figures outside the quote card: 6; own figures whose token occurs in the quote: []
```

The two nx hits are the same quote printed a second time on the page (a carousel copy outside the card the script found), not an own figure. On dragonfly and pola the script found no own figure outside the quote card (dragonfly's "25x more QPS than Redis" is split across elements and pola's "34.63 sec" holds no unit the regex took, so the V0b figure came from reading the page). A false fail would need a row whose `source` is the page the quote was captured from and whose claim is not from the quote: none of the 8 pages has that shape, so it is not observed, not excluded. The first version's 28-case table (4 pages, invented URLs for V4 and V5) is superseded.

## MKT-CLAIM-05: the fallback, run

The sentence under test: a run without a token skips the release arm for a GitHub-hosted row and applies the 90-day limit. The rule today says only "a compared product with no GitHub releases falls back to the 90-day limit (not measured)". `r/c05/check05d.py` implements the arm: interval `refresh_by - observed` must be at most 90 days; for a `github.com/<owner>/<repo>` source it calls `GET <api>/releases/latest` and requires equal major.minor of `tag_name` and `third_party_version`; HTTP 403 or 429 with "rate limit" in the body, HTTP 404, or a non-GitHub source skips that arm with a WARN line; with `GITHUB_TOKEN` set, a 403 or 429 is a FAIL. `r/c05/mock.py` is a local HTTP server on 127.0.0.1 that returns the same JSON shape; no real credential was used (the one token value is the string `dummy-token-for-mock`, sent only to localhost).

The real service, unauthenticated, today:

```
$ curl -s -i https://api.github.com/rate_limit | head -9
HTTP/2 200
server: fasthttp
date: Fri, 27 Nov 2026 14:00:44 GMT
content-type: application/json; charset=utf-8
content-length: 424
x-ratelimit-limit: 60
x-ratelimit-remaining: 0
x-ratelimit-used: 60
x-ratelimit-resource: core
$ curl -s -w '\nHTTP %{http_code}\n' https://api.github.com/repos/dragonflydb/dragonfly/releases/latest
{"message":"API rate limit exceeded for 65.108.2.88. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)","documentation_url":"https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"}

HTTP 403
GITHUB_TOKEN set:
```

The script, on the mock and on the real API (complete output):

```
$ GH_API=http://127.0.0.1:18765 python3 check05d.py rows_mock.toml   # no token
ok release ok-match v0.41.0 == v0.41.0
FAIL expired: drifted minor v0.41.0 -> v0.42.1
WARN release arm skipped limited: HTTP 403 rate limit (no GITHUB_TOKEN); 90-day limit applies (90 days)
WARN release arm skipped no-release: HTTP 404 (no GitHub release); 90-day limit applies (90 days)
WARN release arm skipped saas: source is not GitHub-hosted; 90-day limit applies (90 days)
FAIL interval too-long 113 days >90
WARN release arm skipped too-long: source is not GitHub-hosted; 90-day limit applies (113 days)
exit 1
(process exit 1)

$ GITHUB_TOKEN=dummy-token-for-mock GH_API=http://127.0.0.1:18765 python3 check05d.py rows_mock.toml   # fake token, mock only
ok release ok-match v0.41.0 == v0.41.0
FAIL expired: drifted minor v0.41.0 -> v0.42.1
ok release limited v0.41.0 == v0.41.0
WARN release arm skipped no-release: HTTP 404 (no GitHub release); 90-day limit applies (90 days)
WARN release arm skipped saas: source is not GitHub-hosted; 90-day limit applies (90 days)
FAIL interval too-long 113 days >90
WARN release arm skipped too-long: source is not GitHub-hosted; 90-day limit applies (113 days)
exit 1
(process exit 1)

$ python3 check05d.py rows_real.toml   # real api.github.com, no token
WARN release arm skipped dragonfly: HTTP 403 rate limit (no GITHUB_TOKEN); 90-day limit applies (90 days)
WARN release arm skipped es: HTTP 403 rate limit (no GITHUB_TOKEN); 90-day limit applies (90 days)
WARN release arm skipped kafka-docs: source is not GitHub-hosted; 90-day limit applies (90 days)
exit 0
(process exit 0)

$ GITHUB_TOKEN=dummy-token-for-mock GH_API=http://127.0.0.1:18766 python3 check05d.py rows_mock2.toml
FAIL limited-even-with-token: HTTP 403 rate limit despite GITHUB_TOKEN; rerun the job
exit 1
(process exit 1)
$ GH_API=http://127.0.0.1:18766 python3 check05d.py rows_mock2.toml   # same row, no token
WARN release arm skipped limited-even-with-token: HTTP 403 rate limit (no GITHUB_TOKEN); 90-day limit applies (90 days)
exit 0
(process exit 0)
```

Eight scenarios, each as the sentence says: match passes, drift fails, rate limit skips without a token and fails with one, 404 skips, a non-GitHub source skips, an interval over 90 days fails whatever the arm does. The limit of the run: the "real" run proves the 403 body and the skip, not what a token changes on the real service (no token was used), and the mock returns the shape I wrote from the real 403 body and from GitHub's documented `tag_name`.

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| MKT-CLAIM-06 | **change** (verify only; severity stays MUST) | below |
| MKT-CLAIM-04 | **change** | below |
| MKT-CLAIM-28 | **change** (verify; `source` form clause) | below |
| MKT-CLAIM-30 | **change** (verify (1), (3), (4); sentence on icon cells) | below |
| MKT-CLAIM-05 | **change** (one sentence in the verify) | below |
| MKT-CLAIM-02, 29 | confirm (no result bears on them) | |

**MKT-CLAIM-06, replace the verify line.**

> *Verify:* the lint checks figures in two ways. (a) A figure in a sentence needs an `<a href>` to the record's `method` URL within 300 characters. (b) A figure in a chart is checked once per chart: the chart has one `performance` row whose `claim` is the chart's title string (the `figcaption`, `caption`, `aria-label` or the heading directly above it) and is unique on the page; when charts share a title, the author prefixes the group heading. The lint finds the text node that holds `claim` (preferring `h1` to `h6`, `caption`, `figcaption`, never one inside `<a>` or `<nav>`) and takes its scope: the nearest `section`, `article` or `aside` ancestor; if there is none, the range from the nearest heading at or before the title to the next heading of the same or a higher rank. The check passes when the scope holds an `<a href>` that, resolved against the page URL and with the fragment removed, equals the row's `method`, and `method` is not the page's own URL. The raw-data path passes `test -f`. Measured 2026-11-27 on 39 charts of 10 pages against a hand label of "this chart links a reproduction or method page": 19 true passes, 20 true fails, 0 false passes, 0 false fails with a correct `method`; the 300-character test found an anchor for 5 of 102 values and passed 1 of 19 covered charts. The check proves that the linked URL is in the chart's block, not that the page behind it reproduces the chart (swapping four method URLs among four charts in one section passed 4 of 4), and on a page whose only heading is an `h1` the fallback range is the whole page (esbuild: 19 links); the method-page fields in the rule text stay a reading check.

**MKT-CLAIM-04, class table and field table.** In the `performance` row, add "one row per chart, with the chart title as `claim`". In the field table, change the `value`, `unit` line to: "for every number-bearing claim; a `comparison` row whose claim is a text fact (no number) sets `value = "text"` and `unit = "text"`." Verify: check A on 607 generated `comparison` rows of that form passes (`rows-A-incomplete=0` on all 9 pages, run 2026-11-27, output above). Also delete `endorsement` from the `source_type` clause of MKT-CLAIM-28 (it is not in the `source_type` list).

**MKT-CLAIM-28, replace the verify line.**

> *Verify:* check E fails a row of the five classes when (a) its `source` equals the `id`, `original_ref` or `permission_ref` of an endorsement row; (b) its `claim` is contained in an endorsement row's `claim`; (c) its `source` is a URL whose fetched page text holds the first 25 characters of an endorsement row's `claim`. For (c) the page text is the HTML with `script` and `style` removed, tags stripped, entities decoded and whitespace collapsed, and both strings are normalised before the comparison (NFKC, curly quotes and apostrophes to straight, lower case); without the normalisation a curly apostrophe in the first 25 characters defeats it. A `source` that is not an `https://` URL, a repository path or a `decision:` reference fails check A. Delete the clause on `source_type = "endorsement"`: that value is not in the `source_type` list. Measured 2026-11-27 on 8 pages and 9 variants each (72 cases): 0 false fails on 16 compliant cases; (a), (b) and the source form catch 32 of 56 bad cases; with (c) and the normalisation, 48 of 56. The 8 left are a paraphrase of the quote whose `source` is a page that never printed it (V4c): a reading check, and the rule says so.

**MKT-CLAIM-30, replace verifications (1), (3) and (4), and add one sentence to the rule text.** Rule-text sentence: "A comparison cell holds its fact as text; a cell that shows only an icon states nothing the lint can bind, so give it a text name that states the fact."

> *Verify:* (1) A comparison block is a `table` whose first row has a cell naming a compared party, or that holds a `claim:<id>` marker of a comparison row. A block holds no nested `table`. Every body cell of a block in a column whose first-row cell names a compared party (a) has text, (b) carries a `claim:<id>` marker inside the cell, (c) whose id resolves to a comparison row that lists that party in `compared_party`, and (d) whose `claim` is byte-equal to the cell's text. A text node outside every block that names a compared party is printed, never failed, as the reading list (each line is read once and marked "fact with a row" or "not a claim"). (2) unchanged. (3) `grep -n -i -E '\b(outdated|broken|bad|legacy|clunky|obsolete|dead|worthless)\b'` prints nothing on any block cell and on any text node that names a compared party. This finds 2 of 36 evaluative texts on 9 pages and has no false positive; every other evaluative phrase ("DIY effort", "without the Kafka complexity", "unsafe", "can surprise teams") is found only by the reading list, so (3) proves the absence of those 8 words and nothing more. (4) No `<img>` or `<svg>` on the page has a `src`, `alt`, `title` or `aria-label` that holds a compared party's name; an `[[allow]]` entry with a reason covers a name set in plain type with no logo. The word `logo` is not a trigger. An image that names a party is also read for text inside the picture, which no lint reads. (5) unchanged.

Measured 2026-11-27 on 9 pages: (1) passed the 7 compliant pages and failed the 2 with icon-only cells (95 cells), detected 512 of 512 dropped markers and 27 of 27 table-wide omissions on pages that keep another row; old (1) failed all 9 pages, 7 of them wrongly, and its verdict never moved when a marker was dropped. (4) flagged 6 images, 4 of them competitor logos and 2 a hero image with the name in type; the old text flagged 41, 37 wrongly. Limits, stated in the rule: with no `comparison` row at all the party list is empty and (1) is vacuous; a marker on a cell with the same text as its neighbours ("Yes") cannot be told from a marker on the right one; (3) is a floor.

**MKT-CLAIM-05, add one sentence to the verify.** "The release arm calls the GitHub API; a run without `GITHUB_TOKEN` skips that arm for each GitHub-hosted row with a WARN line and applies the 90-day limit, a 404 (no release) is skipped the same way, and a run with `GITHUB_TOKEN` that still gets HTTP 403 or 429 fails and is rerun. Measured 2026-11-27: unauthenticated `api.github.com` answered HTTP 403 with `x-ratelimit-remaining: 0`; `check05d.py` skipped 2 of 2 GitHub rows and exited 0, and on a local mock it passed a matching tag, failed a drifted one, skipped a 404 and failed a 403 with a token."

## Dated facts

All pages fetched 2026-11-27; vendor pages are vendor data and their wording may have changed since.

| Fact | Source and date |
|---|---|
| Part 1 fresh chart pages, HTTP 200 | [esbuild.github.io](https://esbuild.github.io/), [lightningcss.dev](https://lightningcss.dev/), [pnpm.io/benchmarks](https://pnpm.io/benchmarks), [rolldown.rs](https://rolldown.rs/), [rspack.dev](https://rspack.dev/), [oxc.rs](https://oxc.rs/), [hono.dev/docs/concepts/benchmarks](https://hono.dev/docs/concepts/benchmarks), [fastify.dev/benchmarks](https://fastify.dev/benchmarks/); cached wave-2 copies of [bun.sh](https://bun.sh/) and [deno.com](https://deno.com/) (both also HTTP 200 on re-fetch) |
| Part 2 table and figure pages, HTTP 200 | the 10 URLs in the Part 2 table above |
| Part 2 quote pages, HTTP 200 | [dragonflydb.io](https://www.dragonflydb.io/), [motherduck.com](https://motherduck.com/), [planetscale.com](https://planetscale.com/), [pola.rs](https://pola.rs/), [nx.dev](https://nx.dev/), [questdb.com](https://questdb.com/), [sanity.io](https://www.sanity.io/), [singlestore.com](https://www.singlestore.com/); each also fetched with `?utm_source=claims`, HTTP 200 |
| Repository and docs sources of the V0b rows, HTTP 200, none holds the quote | [github.com/dragonflydb/dragonfly](https://github.com/dragonflydb/dragonfly), [github.com/duckdb/duckdb](https://github.com/duckdb/duckdb), [github.com/vitessio/vitess](https://github.com/vitessio/vitess), [github.com/pola-rs/polars](https://github.com/pola-rs/polars), [github.com/nrwl/nx](https://github.com/nrwl/nx), [github.com/questdb/questdb](https://github.com/questdb/questdb), [github.com/sanity-io/sanity](https://github.com/sanity-io/sanity), [docs.singlestore.com](https://docs.singlestore.com/) |
| Documentation roots used as `source` of the 607 generated rows, HTTP 200 (`curl -sL`, `r/out/codes_all.txt`) | [algolia.com/doc](https://www.algolia.com/doc/), [elastic.co/docs](https://www.elastic.co/docs), [meilisearch.com/docs](https://www.meilisearch.com/docs), [typesense.org/docs](https://typesense.org/docs/), [kafka.apache.org/documentation](https://kafka.apache.org/documentation/), [firebase.google.com/docs](https://firebase.google.com/docs), [developer.hashicorp.com/terraform/docs](https://developer.hashicorp.com/terraform/docs), [docs.npmjs.com](https://docs.npmjs.com/), [developers.google.com/analytics](https://developers.google.com/analytics), [amplitude.com/docs](https://amplitude.com/docs). `support.google.com/analytics` returned 404 and was replaced |
| Sources of the first 10 hand-written rows, HTTP 200 | [algolia.com/doc](https://www.algolia.com/doc/), [github.com/elastic/elasticsearch](https://github.com/elastic/elasticsearch), [kafka.apache.org/documentation](https://kafka.apache.org/documentation/), [firebase.google.com/docs](https://firebase.google.com/docs), [firebase.google.com/docs/firestore/data-model](https://firebase.google.com/docs/firestore/data-model), [firebase.google.com/pricing](https://firebase.google.com/pricing), [developer.hashicorp.com/terraform/language](https://developer.hashicorp.com/terraform/language), [github.com/dragonflydb/dragonfly](https://github.com/dragonflydb/dragonfly) (`p2lint` output above) |
| "Legacy Kafka is a collection of parts you have to assemble yourself" and "Less flexible, unsafe ISR replication strategy creates potential for data loss" (vendor copy) | [redpanda.com/compare/redpanda-vs-kafka](https://www.redpanda.com/compare/redpanda-vs-kafka), 2026-11-27 |
| "Has known limitations around fault tolerance, recovery and resilience" and "But not recommended" (vendor copy about competitors) | [typesense.org comparison page](https://typesense.org/typesense-vs-algolia-vs-elasticsearch-vs-meilisearch/), 2026-11-27 |
| "Firebase's usage-based pricing can surprise teams as their apps grow" and "Tight coupling to Google Cloud products" (vendor copy) | [supabase.com/alternatives/supabase-vs-firebase](https://supabase.com/alternatives/supabase-vs-firebase), 2026-11-27 |
| "Reads payload as JSON which can lead to document corruption" (vendor copy, cell about Typesense) | [meilisearch.com comparison page](https://www.meilisearch.com/docs/learn/resources/comparison_to_alternatives), 2026-11-27 |
| Banner with the Google Analytics logo and the lines "Complex interface", "Cookie banners needed", "Invasive data collection", "Less accurate" (image text, vendor copy) | [plausible.io/uploads/plausible-vs-ga.webp](https://plausible.io/uploads/plausible-vs-ga.webp), embedded in [plausible.io/vs-google-analytics](https://plausible.io/vs-google-analytics), 2026-11-27 |
| Guide cover showing the Apache Kafka mark | [redpanda guide image (cdn.prod.website-files.com)](https://cdn.prod.website-files.com/68ed36e99e31581dedf5dcb1/6a90fa74dda3f5c161035454_6a6fc115ca6398021cdc15b5_1200x628-guide-redpanda-vs-kafka%25203.jpeg), embedded in the redpanda page, 2026-11-27 |
| "is now a legacy feature" (vendor copy about Amplitude) | [posthog.com/blog/posthog-vs-amplitude](https://posthog.com/blog/posthog-vs-amplitude), 2026-11-27 |
| Unauthenticated GitHub API: limit 60 per hour, remaining 0, HTTP 403 "API rate limit exceeded" | [api.github.com/rate_limit](https://api.github.com/rate_limit) and [api.github.com/repos/dragonflydb/dragonfly/releases/latest](https://api.github.com/repos/dragonflydb/dragonfly/releases/latest), response header `date: Fri, 27 Nov 2026 14:00:44 GMT` |

## What could not be determined

- **A second rater.** One reader labelled all 39 charts, the 36 evaluative texts among 815 units, and the competitor-logo images. Missing: a second rater's labels on the same units; the pnpm label (3 charts) and the unlabelled Meilisearch cell are the known borderlines. The recall of (3) (2 of 36) would change with another reader's labels, but not by enough to make a word list a gate.
- **Whether a compliant author exists for every chart.** For the nine Deno charts and six Bun charts no reproduction page exists on the page; I did not check whether one exists in the vendors' repositories. Those rows fail check A either way.
- **Whether the page behind a `method` URL reproduces the chart.** Swapping the four hero URLs on bun.sh passed 4 of 4. A relevance check (fetch the method page, test for the chart's workload words) was not built.
- **Charts drawn by script.** benchmark.clickhouse.com's saved HTML holds no data; a rendered-page run (a browser) is missing and none was used.
- **Whether the cell facts are true.** The 607 generated rows prove that a documentation root answers 200, not that it supports the cell. Missing: a reader of each cell against a specific source page.
- **Per-cell source cost against an owner's tolerance.** Proposed (1) needs one row and one marker per compared-party cell (607 on 9 pages; 243 on the largest). Nobody has said whether that is acceptable; a cheaper design (one row per table row with several cells) was not built or measured.
- **Single-table pages with no rows.** The block rule needs one comparison row somewhere to know the party names; with none, (1) is vacuous. A repository-level list of compared parties that does not depend on rows was not designed or tested.
- **Image text.** No check reads text inside a picture (the plausible banner). An OCR step was not run.
- **Page-level false passes on single-heading pages.** esbuild's heading range spans the page; the sample has no uncovered chart on such a page.
- **A real GitHub token.** The release arm was run against the rate-limited real API and a mock, never with a real token (not used by instruction). What a token changes on the real service is documented, not measured here.
- **The legal question of which pages count as comparative advertising** was not examined; the follow-up tested whether the stated checks separate marked from unmarked text, not whether any of these vendors' tables is lawful.

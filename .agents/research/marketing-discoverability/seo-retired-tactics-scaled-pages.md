---
title: "Retired SEO and GEO tactics, structured data, and scaled generated pages"
program: product
sub_program: marketing
topic: marketing-discoverability
worker: seo-retired-tactics-scaled-pages
date_researched: 2026-11-27
model: sonnet
sources_fetched: 34
scope: "Which structured-data types to emit, which AI-era search tactics are retired or spam, and when generated catalog pages need a uniqueness floor or noindex. Not covered: robots.txt and sitemap mechanics, share cards, canonical rules (sibling workers); the live ocx.sh catalog could not be measured (see Finding 7)."
---

# Retired SEO and GEO tactics, structured data, and scaled generated pages

## Contents

1. Summary
2. Findings (1 Structured data, 2 Spam policies, 3 GEO evidence, 4 AI answers and clicks, 5 llms.txt and special files, 6 Cross-territory notes, 7 Measurement of generated pages)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Google ended the FAQ rich result on 2026-05-07 and removed its documentation on 2026-06-15. HowTo rich results were removed in 2023. Emitting `FAQPage` or `HowTo` for ranking gain is dead work.
- Google states "Structured data isn't required for generative AI search, and there's no special schema.org markup you need to add." Structured data earns only the features in the Search gallery.
- Emit `WebSite` on the home page (the one lever for the site name). Emit `BreadcrumbList` only when it matches a visible trail. Emit `Article` or `VideoObject` only for real dated posts and videos. Skip `SoftwareApplication` for free tools without genuine reviews: it needs `name`, `offers.price` and one of `aggregateRating` or `review`.
- Never write a self-authored rating or review into markup. Google bars self-serving reviews and, since the 2026-07-24 update, fake or undisclosed incentivized reviews.
- Google names "scaled content abuse" as many pages generated for the primary purpose of manipulating rankings, however made (AI, scraping, templates). It also says separate pages per fan-out query, made to manipulate generative answers, violate it.
- The back-button hijacking policy was announced 2026-04-13 and enforced from 2026-06-15. Third-party scripts do not excuse the site.
- GEO has one controlled paper (GPT-3.5-turbo, fixed top-5 context) and a July 2026 survey says its "up to 40%" claim does not transfer to organic discoverability. Keyword stuffing is null or negative in every source.
- Google says GEO/AEO is SEO, that chunking and new machine-readable files are unnecessary, and that Search ignores `llms.txt`. Independent log studies show AI bots almost never fetch it.
- AI-visibility tracking by rank position is unreliable: SparkToro found identical brand lists in under 1 in 100 runs. Use share across many runs or do not claim a number.
- Measured: `index.grimoire.rs` has 21 generated `/p/` pages, median 224 words, median 121 unique words. 10 of 21 have at least half their 5-word shingles in common with at least half of the other pages. 50 of 300 page pairs (all 25 URLs) exceed 0.5 shingle Jaccard.
- Decision proposed: generated catalog pages must pass a uniqueness floor (template share under 0.5 and at least 150 unique words of non-boilerplate text) or ship `noindex` and stay out of the sitemap.
- The live `ocx.sh/catalog` (170 pages) was unreachable on 2026-11-27 (401 and a certificate for `bazel-cache.ocx.sh`), so its uniqueness is unmeasured. The outage itself is a finding for the owner.

## Findings

### 1. Structured data: what still has a purpose

| Item | State on 2026-11-27 | Source |
|---|---|---|
| FAQ rich result | Deprecation notice added 2026-05-08, "will no longer appear in Google Search starting May 7, 2026"; documentation removed 2026-06-15: "The FAQ rich result feature is no longer shown in Google Search results." | [Search updates log](https://developers.google.com/search/updates); [FAQ page](https://developers.google.com/search/docs/appearance/structured-data/faqpage) (page updated 2026-11-24). FAQ is absent from the 25-feature [gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) (updated 2026-10-16). Google itself. |
| HowTo rich result | Removed on mobile 2023-08-08 and desktop 2023-09-14. Markup may stay: "unused structured data doesn't harm Search" (paraphrase), but it has no visible effect. FAQ was restricted then to well-known government and health sites. | [Google blog, 2023-08-08, updated 2023-09-14](https://developers.google.com/search/blog/2023/08/howto-faq-changes). Google itself. |
| Practice problem, dataset types | Phased out; docs removed 2026-01-06 (practice problem). | [Updates log](https://developers.google.com/search/updates). |
| Other retired types | Course info, estimated salary, learning video, special announcement, vehicle listing docs removed 2025-09-09. | [Updates log](https://developers.google.com/search/updates). |
| `WebSite` (site name) | Required `name` and `url`; must be on the home page of the domain or subdomain root; optional `alternateName`; "Site names aren't supported for subdirectories." | [Site names](https://developers.google.com/search/docs/appearance/site-names), updated 2025-12-10. |
| `SoftwareApplication` | Required: `name`, `offers.price`, plus `aggregateRating` or `review`. Recommended: `applicationCategory`, `operatingSystem`. Free apps use price `0`. | [Software app](https://developers.google.com/search/docs/appearance/structured-data/software-app), updated 2026-09-08. |
| Review rules | Reviews must be visible on the page; no self-serving reviews by the reviewed entity; fake or undisclosed incentivized reviews can bring a manual action. | [Review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), updated 2026-09-08; updates log entry 2026-07-24. |
| General policy | "Don't mark up content that is not visible to readers of the page." A structured-data manual action removes rich-result eligibility; JSON-LD is the recommended format. | [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), updated 2026-07-10. |
| Gallery types that remain | Article, Breadcrumb, Organization, Software app, Video, Profile page, Q&A, Discussion forum and others (25 listed). | [Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery). |

Consequence for a free open-source CLI landing page: `SoftwareApplication` is ineligible by construction (no genuine reviews, and writing them yourself is barred). `Organization` and `BreadcrumbList` are cheap and honest. Measured baseline: 0 JSON-LD on 413 pages ([distribution-posture audit, line 167](../product-audit/distribution-posture.md)). Last-updated dates for `organization`, `breadcrumb` and `article` pages were all read as 2026-09-08 (`curl -sL <url> | grep -o -E 'Last updated [0-9-]+'`).

### 2. Spam policies and generative-AI content

[Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (page shows "Last updated 2026-11-23"):

- Scaled content abuse: "many pages are generated for the primary purpose of manipulating search rankings." Examples include generative AI pages that add no user value, scraped feeds or search results transformed with little value, stitched content, and many pages that make little sense but carry keywords. Hosts are advised to exclude such content from Search.
- Site reputation policy: third-party content published on a host "mainly because of that host's already-established ranking signals." Updated 2026-08-28 for EEA enforcement ([updates log](https://developers.google.com/search/updates)). Affiliate links, user-generated areas and editorial columns are listed as not inconsistent.
- Back-button hijacking: added 2026-04-13 under malicious practices ([Google blog](https://developers.google.com/search/blog/2026/04/back-button-hijacking)); enforcement from 2026-06-15; sites "may face manual spam actions or automated demotions"; code from included libraries or ad platforms still counts. An FAQ was added 2026-11-23.
- 2026-05-15: Google clarified that spam policies also apply to generative AI responses.
- Expired domain abuse: buying an expired domain to host low-value content.

[AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (updated 2026-07-10): "optimizing for generative AI search is optimizing for the search experience, and thus still SEO"; no need for new machine-readable files, AI text files, markup or Markdown; "There's no requirement to break your content into tiny pieces"; creating separate content for fan-out queries "primarily to manipulate rankings or generative AI responses" violates the scaled-content policy; "a high quantity of pages doesn't make a website higher quality." Inauthentic mentions "isn't as helpful as it might seem."

[Using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) (updated 2026-10-01): AI is acceptable for research and structure; generating many pages without added value is scaled abuse; fact-check titles, meta descriptions, structured data and alt text before publishing; describe how automation was used.

[Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) (updated 2026-10-05): warning signs include extensive automation across many topics, summarizing others without added value, writing to a word count (Google has no preferred length), promising answers that do not exist, and changing page dates to look fresh without substantive change.

Google publishes no word-count or similarity threshold. Any floor below is a project heuristic, not a Google number.

### 3. GEO paper and follow-ups

- [Aggarwal et al., arXiv 2311.09735](https://arxiv.org/abs/2311.09735): v1 2023-11-16, v3 2024-06-28, KDD 2024. Read in [HTML v3](https://arxiv.org/html/2311.09735v3): main experiments use `gpt-3.5-turbo` over the top 5 Google results at temperature 0.7. Table 1 relative changes (my arithmetic from table values, as reported by the fetch): Quotation Addition +42.6% position-adjusted word count, Statistics Addition +32.8%, Cite Sources +27.7%, Keyword Stuffing -8.7%. Perplexity test: 200-sample subset, sources uploaded as files, statistics +37% on subjective impression. The authors state methods "may need to adapt over time as GEs evolve" and did not measure ranking effects. Author-reported results, not independent.
- [Chen et al., arXiv 2509.08919](https://arxiv.org/abs/2509.08919) (2025-09-10): AI search leans on earned third-party media over brand-owned and social content; engines differ in freshness and sensitivity to phrasing; recommends machine-scannable structure and earned media. Directional only; abstract gives no effect sizes.
- [arXiv 2505.24801](https://arxiv.org/abs/2505.24801) is "Simple contagion drives population-scale platform migration" (Twitter/X to Bluesky). It is unrelated to GEO; the scout's pointer is wrong and must be dropped.
- Replacement follow-ups found: [Martinez, critical survey, arXiv 2607.14035](https://www.alphaxiv.org/abs/2607.14035.md) (2026-07-15, preprint) rejects "GEO increases visibility by 40%" as a general claim, says GEO-bench puts the source in a fixed context and so shows no organic discoverability, and reports in C-SEO Bench only 3 of 54 method-domain combinations significantly positive, with gains shrinking as adoption rises. What survived: keyword stuffing does not transfer; extractable information (quotations, statistics) helps with moderate to strong support; effects depend on domain and initial rank. [Kumar, arXiv 2606.20065](https://arxiv.org/abs/2606.20065) (2026-06-18, author works at vendor Ranqo): over 100,000 prompt responses; niche brands appear in 11% of relevant answers versus 73% for global brands; about 78% of citations go to corporate sites; sentiment framing is far less stable than mention.
- Judgement: no source shows a stable, longitudinal, cross-engine causal gain. Quotations, statistics and cited sources are good writing that cost little, so they are allowed but must be true and are not a ranking promise.

### 4. AI answers, clicks and measurement

| Claim | Number | Date | Source type |
|---|---|---|---|
| Users click a result link in 8% of visits with an AI summary vs 15% without; sessions end after 26% vs 16% | 68,879 searches, 900 US adults, March 2025 | 2025-07-22 | [Pew](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/), independent, Google only, 18% of searches had a summary |
| Position-1 CTR is 58% lower when an AI Overview is present | 300,000 keywords, Dec 2023 vs Dec 2025, desktop | 2026-02-04 | [Ahrefs](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/), vendor data; correlational; unmatched samples |
| 37.9% of AI Overview cited URLs also sit in the first 10 SERP blocks (37.1% blue links only); the earlier study showed about 76% | 863K SERPs, 4M URLs | 2026-03-02 | [Ahrefs](https://ahrefs.com/blog/ai-overview-citations-top-10/), vendor data; the drop is confounded by method change and a model switch |
| Identical brand list in under 1 in 100 runs; identical order about 1 in 1,000 | 2,961 runs, 600 volunteers, Nov-Dec 2025 | 2026-01-28 (modified 2026-06-28) | [SparkToro](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/), not peer reviewed; co-author at an AI-tracking startup |

Reading: most citations come from outside the top 10, so classic rank is not the only lever, but the same data says position tracking inside AI answers is noise. Agents must not report "AI rank" figures.

### 5. llms.txt and special files

Google says Search ignores such files ([guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)). [Ahrefs, 137,210 domains, 2026-06-15](https://ahrefs.com/blog/llmstxt-study/) (vendor data): only about 3% of llms.txt files received any request; AI bots were 19.5% of those requests, "the most generous possible reading". [Otterly](https://otterly.ai/blog/the-llms-txt-experiment/) (vendor data; page shows only "last updated 2026-02-05", no publication date): a 90-day server-log test on one site with a correct file logged 84 llms.txt requests out of 62.1K AI-bot hits (about 0.1%); one site, not a population. [SE Ranking](https://seranking.com/blog/llms-txt/) (vendor data, 2026-10-15): nearly 300,000 domains, 10.13% had the file, "There's no correlation between AI citations and LLMs.txt"; correlational, not causal. A cheap static file is harmless; it is not a ranking tactic and must not be reported as one.

### 6. Cross-territory (one line each, left to siblings)

- `index.grimoire.rs/robots.txt` carries a Cloudflare managed block that disallows GPTBot, ClaudeBot, Google-Extended, CCBot and more with `Content-Signal: search=yes,ai-train=no` (read 2026-11-27 via `curl -s https://index.grimoire.rs/robots.txt`). Belongs to the robots and crawl sibling; it limits training crawlers, not search.
- The `index.grimoire.rs` canonical tag was 0 of 25 in the earlier audit; canonical is a sibling topic.

### 7. Measurement of generated pages

Commands (run 2026-11-27, Python stdlib only, `python3 -I`). The script fetches every `<loc>` of a sitemap, takes visible text of `<main>` (falling back to the body minus nav, header, footer, script, style), lowercases words, builds 5-word shingles, and reports words, unique words, template share (share of a page's shingles that occur on at least half of the pages), and pairwise Jaccard on shingle sets.

```
python3 -I m.py https://index.grimoire.rs/sitemap.xml '/p/'
python3 -I m.py https://index.grimoire.rs/sitemap.xml
python3 -I m.py https://ocx.sh/catalog/sitemap-index.xml
```

(`m.py` is a 52-line script kept in the session scratchpad at `/tmp/claude-1000/seo/m.py`; the algorithm above is complete enough to rewrite. The consolidator should store a copy in the rule's audit tooling.)

| Set | Pages | Words min / median / max | Unique words, median | Pages under 150 / under 300 words | Template share median / mean; pages at or above 0.5 | Pairs with Jaccard 0.5 or more |
|---|---|---|---|---|---|---|
| `index.grimoire.rs` `/p/` pages (package pages) | 21 | 122 / 224 / 425 | 121 | 2 / 17 | 0.38 / 0.53; 10 pages | 49 of 210 (median 0.156, p90 0.763, max 0.936) |
| all 25 URLs in the sitemap | 25 | 96 / 224 / 1,740 | 121 | 3 / 18 | n/a | 50 of 300 (median 0.140, p90 0.732) |
| `ocx.sh/catalog` | 170 per the earlier audit | not measured | | | | The command failed: `ssl.SSLCertVerificationError ... certificate is not valid for 'ocx.sh'`; `curl -sk https://ocx.sh/catalog/` returned 401 and the certificate subject was `CN=bazel-cache.ocx.sh`; `dig +short ocx.sh` gave 65.108.2.88. |

Observations: the three `hex-*` package pages share 0.80 template share (`hex-discuss` 219 words, `hex-finalize` 221, `hex-state` 222); the shortest, `command-guard` and `tool-call-logger`, have 122 words and 65 unique words each. These are real per-package data pages, not keyword pages, so they do not read as intent to manipulate; but thin, near-identical, template-heavy pages are what the warning signs describe and they are the pages to enrich or noindex. Measurement limits: five-word shingles over `<main>` text count the template's own sentences as shared; `/p/` pages include package metadata that is legitimately similar. The `ocx.sh` result is a hard gap and an availability problem for the owner.

## Normative guidance candidates

Severity key: MUST, SHOULD, CONSIDER. Thresholds marked (heuristic) are project values, not Google values.

1. MUST NOT emit `FAQPage` or `HowTo` JSON-LD to win a rich result. Rationale: both features are gone (HowTo 2023-09-14; FAQ 2026-05-07). Verify: `grep -rEl '"@type" *: *"(FAQPage|HowTo)"' dist/` returns nothing; an existing hit is reported as dead markup, not an error that blocks a build.
2. MUST put `WebSite` JSON-LD (`name`, `url`, optional `alternateName`) on the root URL of each domain or subdomain (other pages do not need it). Rationale: only strong site-name lever; subdirectory docs cannot have their own. Verify: parse `/` for `application/ld+json`, check `@type` is `WebSite` and `url` equals the canonical root; validate with the Schema Markup Validator (Google's [site names page](https://developers.google.com/search/docs/appearance/site-names) states: "Site names aren't supported in the Rich Results Test"; it points to the Schema Markup Validator for syntax and the URL Inspection tool for how Google sees the page; read 2026-11-27).
3. MUST NOT emit `aggregateRating`, `review` or `Review` markup unless the reviews are visible on the same page, come from real users, and are not about the site owner's own entity. Rationale: self-serving and fake reviews risk a manual action. Verify: `grep -rE 'aggregateRating|"@type" *: *"Review"' dist/`; for each hit the page text must contain the quoted rating and review text.
4. SHOULD NOT emit `SoftwareApplication` for a free tool without genuine third-party reviews. Rationale: Google requires `aggregateRating` or `review`; no rich result without it. Verify: if present, `offers.price` is set and rule 3 passes; otherwise absence is correct.
5. SHOULD emit `BreadcrumbList` with the visible breadcrumb trail, `schema.org` vocabulary only. Rationale: honest, cheap, supported. Verify: compare JSON-LD item names and order to the page's breadcrumb nav; `grep -r 'data-vocabulary.org' dist/` is empty.
6. CONSIDER `Article` or `BlogPosting` on dated posts and `VideoObject` on embedded videos, with real dates; `dateModified` never earlier than `datePublished` and never bumped without a content change. Rationale: Google warns against fake freshness. Verify: dates parse as ISO 8601 with timezone; compare `dateModified` to the git history of the file.
7. MUST: every value in structured data is visible on the page. Rationale: structured-data policy. Verify: reading heuristic. Pass: JSON-LD `name` equals the on-page H1 or site title. Fail: JSON-LD description of a feature or price absent from the rendered text.
8. MUST NOT add "answer-engine" mark-up, special AI files, or page splitting justified by "AI visibility". Rationale: Google states "You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search" and "There's no requirement to break your content into tiny pieces for AI to better understand it" ([AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), updated 2026-07-10). Verify: reviewer rejects any change whose stated reason is AI citation without a user-facing benefit.
9. MUST NOT create separate pages per paraphrased query or fan-out variant. Rationale: the same guide says creating separate content for every search variation "primarily to manipulate rankings or generative AI responses in Google Search violates" the scaled content abuse policy ([AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide); [spam policies](https://developers.google.com/search/docs/essentials/spam-policies), updated 2026-11-23). Verify: sitemap check, no two pages with the same primary entity and a title differing only by phrasing; reading heuristic.
10. MUST NOT stuff keywords, hide text for crawlers, change dates without change, or buy or seed "inauthentic mentions". Rationale: keyword stuffing, hidden text and link abuse are named spam practices ([spam policies](https://developers.google.com/search/docs/essentials/spam-policies), updated 2026-11-23); inauthentic mentions "isn't as helpful as it might seem" ([AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)); fake freshness is a warning sign ([helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), 2026-10-05); keyword stuffing scored -8.7% in the [GEO paper](https://arxiv.org/html/2311.09735v3) (2024-06-28, author-reported). Verify: `grep -rEi 'display: *none'` text blocks reviewed; term frequency of any non-brand keyword above 3% of words (heuristic) is reviewed.
11. MUST: every generated page set (catalog, per-version, per-package pages) has a recorded generator, a page-count cap per run, and a per-page value statement. Rationale: scaled-content policy judges purpose and value. Verify: the generator's README lists the cap and the user task each page serves; a run that exceeds the cap fails review.
12. MUST: a generated page has at least 150 unique words of non-boilerplate text (heuristic) and a template share below 0.5 (heuristic); otherwise it ships `<meta name="robots" content="noindex">` and is omitted from the sitemap. Rationale: Google advises excluding low-value mass content from Search; no Google number exists. Verify: run the shingle script from Finding 7; fail on any page with unique words under 150 or template share at or above 0.5 that lacks `noindex`. Today `index.grimoire.rs` fails this for 10 of 21 `/p/` pages.
13. SHOULD: a generated page adds data a reader cannot get from the source repo's README alone (version history, install command, verified digest, compatibility), shown as visible text. Rationale: the "added value" test. Verify: reading heuristic, pass "page lists the 6 most recent versions with dates", fail "page restates the package description in three sentences".
14. MUST NOT use AI to bulk-write page copy without human review of titles, meta descriptions, structured data and alt text. Rationale: Google's AI-content page. Verify: the commit or PR records who reviewed; the page discloses how automation was used where a reader would expect it.
15. MUST NOT touch `history` in a way that traps the back button. Rationale: spam policy, enforced from 2026-06-15; vendor scripts count, since hijacking "may originate from the site's included libraries or advertising platform" ([Google blog, 2026-04-13](https://developers.google.com/search/blog/2026/04/back-button-hijacking)). Verify: `grep -rEn 'history\.(pushState|replaceState)|popstate' dist/ --include='*.js' --include='*.html'` and manual review of each hit, including third-party scripts.
16. MUST NOT report AI-answer rank or position as a metric. Rationale: [SparkToro](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/) (2026-01-28, vendor-adjacent) found identical brand lists in under 1 in 100 runs. Verify: reports phrase AI visibility as share over a stated number of runs, or are labeled unmeasured.
17. MUST label vendor data (Ahrefs, SparkToro, Ranqo, Otterly, SE Ranking) as vendor data in any copy or rule that quotes it. Rationale: these firms sell SEO or AI-visibility products, so an unlabeled figure reads as neutral fact; Ahrefs, for example, sells the remedy for the click loss it measures ([Ahrefs study](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/), 2026-02-04). Verify: each statistic carries the source name and date.
18. MUST NOT cite the GEO "up to 40%" figure as a general effect. Rationale: single GPT-3.5, fixed-context benchmark ([paper](https://arxiv.org/html/2311.09735v3), 2024-06-28); a [2026-07-15 survey](https://www.alphaxiv.org/abs/2607.14035.md) says the figure does not transfer to organic discoverability. Verify: grep for `40%` near "GEO" in generated copy; any hit names the setting.
19. CONSIDER quotations, statistics and cited sources in prose, only when true and verifiable. Rationale: only tactic with moderate support, and it is ordinary good writing. Verify: each statistic has an inline link to its source.
20. SHOULD: record the date of the last audit and re-read the [Search updates log](https://developers.google.com/search/updates) before enforcing any rule here. Rationale: the log shows Google changed the policy pages this file relies on within the last six months (FAQ end 2026-05-07, spam-policy clarification 2026-05-15, review guideline 2026-07-24, spam policies page 2026-11-23), so a rule older than its source's "Last updated" line is stale. Verify: each rule carries a source and date; the audit date is later than the newest relevant log entry.

## Dated facts

| Fact | Date stated by source | Source | Type |
|---|---|---|---|
| FAQ rich result no longer shown from 2026-05-07; deprecation notice 2026-05-08; docs removed 2026-06-15 | 2026-05-07, 2026-05-08, 2026-06-15 | [Updates log](https://developers.google.com/search/updates), [FAQ page](https://developers.google.com/search/docs/appearance/structured-data/faqpage) | Platform |
| HowTo rich results removed on desktop; FAQ limited to government and health sites | 2023-08-08, updated 2023-09-14 | [Google blog](https://developers.google.com/search/blog/2023/08/howto-faq-changes) | Platform |
| Back-button hijacking policy announced; enforced from | 2026-04-13; 2026-06-15 | [Google blog](https://developers.google.com/search/blog/2026/04/back-button-hijacking) | Platform |
| Spam policies clarified to cover generative AI responses | 2026-05-15 | [Updates log](https://developers.google.com/search/updates) | Platform |
| Site reputation policy EEA change | 2026-08-28 | [Updates log](https://developers.google.com/search/updates) | Platform |
| Review snippet guideline on fake and incentivized reviews | 2026-07-24 | [Updates log](https://developers.google.com/search/updates) | Platform |
| Scaled content abuse, expired domain abuse, site reputation abuse introduced | 2024-03-05 | [Updates log](https://developers.google.com/search/updates) | Platform |
| Spam policies page, last updated | 2026-11-23 | [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) | Platform |
| Software app page last updated; SoftwareApplication needs name, offers.price and rating or review | 2026-09-08 | [Software app](https://developers.google.com/search/docs/appearance/structured-data/software-app) | Platform |
| AI optimization guide last updated | 2026-07-10 | [Guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | Platform |
| Using generative AI content last updated | 2026-10-01 | [Page](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) | Platform |
| Creating helpful content last updated | 2026-10-05 | [Page](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | Platform |
| Structured data policies last updated | 2026-07-10 | [Page](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | Platform |
| Site names page last updated | 2025-12-10 | [Page](https://developers.google.com/search/docs/appearance/site-names) | Platform |
| Search gallery last updated (25 features, no FAQ or HowTo) | 2026-10-16 | [Page](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) | Platform |
| GEO paper v3; engine GPT-3.5-turbo | 2024-06-28 | [arXiv](https://arxiv.org/abs/2311.09735) | Paper, author-reported |
| Pew: 8% vs 15% click rate with and without an AI summary | 2025-07-22 | [Pew](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/) | Independent |
| Ahrefs: position-1 CTR down 58%; sample 300,000 keywords | 2026-02-04 | [Ahrefs](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/) | Vendor |
| Ahrefs: 37.9% of AI Overview citations in the top 10 | 2026-03-02 | [Ahrefs](https://ahrefs.com/blog/ai-overview-citations-top-10/) | Vendor |
| Ahrefs: 97% of llms.txt files unrequested (about 3% received any request) | 2026-06-15 | [Ahrefs](https://ahrefs.com/blog/llmstxt-study/) | Vendor |
| SparkToro: identical lists under 1 in 100 runs | 2026-01-28 (modified 2026-06-28) | [SparkToro](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/) | Vendor-adjacent, not peer reviewed |
| GEO survey: no stable cross-platform effect | 2026-07-15 | [Martinez](https://www.alphaxiv.org/abs/2607.14035.md) | Preprint |
| Otterly: 84 llms.txt requests in 62.1K AI-bot visits over 90 days (one site) | page updated 2026-02-05 | [Otterly](https://otterly.ai/blog/the-llms-txt-experiment/) | Vendor |
| SE Ranking: no correlation of llms.txt with AI citations, nearly 300,000 domains, 10.13% with file | 2026-10-15 | [SE Ranking](https://seranking.com/blog/llms-txt/) | Vendor |
| Google: click volume stable, click quality up, no data published | 2025-08-06 | [Google blog](https://blog.google/products-and-platforms/products/search/ai-search-driving-more-queries-higher-quality-clicks/) | Platform |
| Site names not supported in the Rich Results Test | undated page, read 2026-11-27 | [Site names](https://developers.google.com/search/docs/appearance/site-names) | Platform |

## What an agent must not decide alone

- Whether to add `Organization`, `SoftwareApplication` or review markup claiming ratings: a brand and legal claim; ask.
- Whether to noindex or enrich the generated catalog pages: it trades traffic for risk. Ask with the measurement attached.
- Whether to change the `index.grimoire.rs` robots posture for AI training and answer crawlers: a business and copyright choice.
- Whether to buy mentions, reviews, backlinks or "AI visibility" tracking tools.
- Whether AI-generated copy may ship without disclosure; some jurisdictions and platforms add rules outside this file.
- The `ocx.sh` 401 and wrong certificate: an infrastructure matter for the owner.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Adds `FAQPage` or `HowTo` JSON-LD "for rich results" | Grep from rule 1 |
| Adds `SoftwareApplication` with an invented `aggregateRating` | Rule 3 grep plus visible-review check |
| Adds `llms.txt`, "AI-readable" duplicate pages, or splits docs into tiny chunks to help AI | Rule 8 review; diff touches no new crawlable page sets |
| Generates one page per keyword variant or per version without a cap | Rule 9 and 11; count `<loc>` in the sitemap before and after |
| Writes `dateModified` as today on every build | Compare to git history of the source file |
| Quotes "GEO gives 40%" or "AI Overviews cut clicks 58%" without scope or vendor label | Rule 17 and 18 greps |
| Reports "ranked #3 in ChatGPT" | Rule 16 |
| Trusts a PDF or training memory over the dated Google page | Rule 20: read the page's "Last updated" line and the Search updates log |

## Contested / evolving

- GEO effect: the paper reports gains; the 2026 survey says they do not transfer and C-SEO Bench found 3 of 54 combinations positive. Both sides cited in Finding 3. Trend as of 2026-11: skepticism rising, no replication on current engines found.
- llms.txt: Google says it is ignored; Ahrefs and others report almost no AI-bot fetches; [SE Ranking](https://seranking.com/blog/llms-txt/) (2026-10-15) frames the file as "not yet an established or widely adopted standard" and "At least not yet". A Search Engine Land 10-site before/after test ([article](https://searchengineland.com/does-llms-txt-matter-467740), January 2026 per a [secondary summary](https://dev.to/searchless_ai/llmstxt-adoption-in-2026-only-586-of-top-sites-use-it-but-early-data-reveals-a-clear-signal-39na); the original returned HTTP 403 to me, so its text is not read first-hand) reported two sites up 12.5% and 25%, eight flat, one down 19.7%, with the gaining sites also launching new content; that points away from the file as the cause. Treat as unproven.
- Do AI Overviews cut clicks: Pew and Ahrefs say yes; Google (Liz Reid, [blog post 2025-08-06](https://blog.google/products-and-platforms/products/search/ai-search-driving-more-queries-higher-quality-clicks/)) says total organic click volume is "relatively stable year-over-year" and "average click quality has increased"; the post gives no figures or method, so it claims stable volume and better quality, not more clicks. Ahrefs is a vendor selling the remedy.
- AI citations and rank: 37.9% overlap now versus about 76% earlier, but methods and model changed (Ahrefs's own caveat), so no trend can be claimed.
- Whether unused FAQ markup is harmful: Google said in 2023 it is harmless; current FAQ docs are gone and say nothing on markup. Leave existing markup alone; do not add new.
- Whether template catalog pages count as scaled content abuse: Google gives no threshold. The judgement turns on primary purpose and added value; the uniqueness floor in rule 12 is a conservative proxy.

## Sources

| URL | What it is | Date | Why worth reading |
|---|---|---|---|
| https://developers.google.com/search/docs/essentials/spam-policies | Google spam policies, primary | updated 2026-11-23 | Scaled content, site reputation, back-button hijacking |
| https://developers.google.com/search/updates | Search documentation updates log, primary | entries to 2026-11-23 | Exact dates of FAQ end, spam changes |
| https://developers.google.com/search/blog/2023/08/howto-faq-changes | Google blog, primary | 2023-08-08, upd. 2023-09-14 | HowTo and FAQ changes |
| https://developers.google.com/search/docs/appearance/structured-data/faqpage | FAQ documentation page, primary | updated 2026-11-24 | FAQ deprecation notes |
| https://developers.google.com/search/docs/appearance/structured-data/software-app | Software app structured data, primary | 2026-09-08 | Required properties |
| https://developers.google.com/search/docs/appearance/structured-data/review-snippet | Review snippet rules, primary | 2026-09-08 | Self-serving and fake reviews |
| https://developers.google.com/search/docs/appearance/structured-data/sd-policies | Structured data policies, primary | 2026-07-10 | Visible-content rule |
| https://developers.google.com/search/docs/appearance/structured-data/search-gallery | Search gallery, primary | 2026-10-16 | Supported feature list |
| https://developers.google.com/search/docs/appearance/site-names | Site names, primary | 2025-12-10 | WebSite markup |
| https://developers.google.com/search/docs/fundamentals/ai-optimization-guide | AI optimization guide, primary | 2026-07-10 | GEO equals SEO, no special files |
| https://developers.google.com/search/docs/fundamentals/using-gen-ai-content | Generative AI content, primary | 2026-10-01 | Review and disclosure |
| https://developers.google.com/search/docs/fundamentals/creating-helpful-content | Helpful content, primary | 2026-10-05 | Warning signs |
| https://developers.google.com/search/blog/2026/04/back-button-hijacking | Google blog, primary | 2026-04-13 | Enforcement date |
| https://arxiv.org/abs/2311.09735 and https://arxiv.org/html/2311.09735v3 | GEO paper | 2024-06-28 | Engines and effect sizes |
| https://arxiv.org/abs/2509.08919 | Chen et al. GEO comparison | 2025-09-10 | Earned-media bias |
| https://arxiv.org/abs/2505.24801 | Unrelated paper (scout mis-pointer) | 2026-02-26 | Documents the error |
| https://arxiv.org/abs/2606.20065 | Kumar brand visibility, vendor author | 2026-06-18 | Brand-tier effect |
| https://www.alphaxiv.org/abs/2607.14035.md | Martinez GEO survey | 2026-07-15 | Replication status |
| https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/ | Pew study, independent | 2025-07-22 | Click behavior |
| https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/ | Ahrefs, vendor | 2026-02-04 | CTR by position |
| https://ahrefs.com/blog/ai-overview-citations-top-10/ | Ahrefs, vendor | 2026-03-02 | Citation overlap |
| https://ahrefs.com/blog/llmstxt-study/ | Ahrefs, vendor | 2026-06-15 | llms.txt fetch rates |
| https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/ | SparkToro, vendor-adjacent | 2026-01-28 | Volatility |
| https://index.grimoire.rs/sitemap.xml and /robots.txt | Measured site | read 2026-11-27 | Page counts |
| https://otterly.ai/blog/the-llms-txt-experiment/ | Otterly llms.txt test, vendor | updated 2026-02-05 | Fetch rate |
| https://seranking.com/blog/llms-txt/ | SE Ranking study, vendor | 2026-10-15 | Citation correlation |
| https://blog.google/products-and-platforms/products/search/ai-search-driving-more-queries-higher-quality-clicks/ | Google blog, primary | 2025-08-06 | Click claim |
| https://searchengineland.com/does-llms-txt-matter-467740 | SEL 10-site test (403, read via secondary) | 2026-01 | Site test |
| ../product-audit/distribution-posture.md | Fleet audit | 2026-11-27 | 0 JSON-LD on 413 pages |

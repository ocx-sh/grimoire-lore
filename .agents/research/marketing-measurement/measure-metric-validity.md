---
title: Metric validity - what a report, dashboard or page may claim from stars, downloads, traffic, AI citations and A/B tests
program: product
sub_program: marketing
topic: marketing-measurement
worker: measure-metric-validity
date_researched: 2026-11-27
model: sonnet
sources_fetched: 30
---

Scope: metric semantics (definition and window per metric), which metrics never stand for adoption, the page form for a popularity count, and when an A/B test is not worth running. Not covered: fake-star markets and GitHub acceptable use (channels), cookieless tooling choice and UTM tagging (sibling dives). Method note: pages were opened with WebFetch, which summarises with a small model; figures below are from those summaries. Where a page could not be read the gap is named.

## Contents
1. Summary
2. Dated facts, Findings (1 Tests, 2 Downloads, 3 GitHub, 4 Traffic, 5 AI citations, 6 One metric and activation, 7 Measurements)
3. Metric record and decisions
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested
8. Sources

## Summary
- Every number an agent writes carries five fields: name, definition, source, window, as-of date. A number without them is a rumour.
- Registries define "download" differently and none defines "user". npm's own doc does not say what counts; PyPI counts requests and tells you mirrors, caches and inflation move the number; crates.io changed its method on 2024-03-11 and the series has a break.
- GitHub traffic data lives 14 days. Without a scheduled snapshot it is gone, and nothing can be claimed beyond the last 14 days.
- Measured: ocx repo clones are 7,990 in 14 days against 180 views (44 to 1). Clone counts are machine traffic and may never stand for people.
- Measured: of 119,372 lifetime GitHub release-asset downloads on ocx, 18,325 (15.4%) are `.sha256` files, i.e. verification fetches, not installs. Raw asset sums overstate installs.
- Stars (ocx 20, grimoire 17) are a popularity signal, not adoption; a [2024 study](https://arxiv.org/abs/2412.13459) found about six million suspected fake stars and a promotion effect under two months.
- The star listing is closed to non-collaborators since the 2026-06-30 announcement; only aggregate `stargazers/count` and `stargazers/history` remain public.
- A/B tests: a 10% relative lift at a 5% baseline needs about 31,000 visitors per arm. At the fleet's repo traffic that is 843 to 3,288 weeks. No A/B test is worth running on any fleet surface.
- Peeking is the second failure: Miller's worst case turns a 5% error rate into 26.1% ([Miller, 2010-04-18](https://www.evanmiller.org/how-not-to-run-an-ab-test.html)).
- AI citation counts are volatile: 50-83% of citations vanish by the next day and about 75% of dropped ones return within 20 days ([Ahrefs, vendor data, 2026-10-29](https://ahrefs.com/blog/how-stable-are-ai-citations/)). One run proves nothing; report 7-day rolling and 4+ weeks on a frozen prompt list.
- Mentions and links are different columns; only about 28% of AI brand mentions carry a link ([Ahrefs, vendor data, 2025-11-26](https://ahrefs.com/blog/ai-citations-vs-impressions-study)).
- Cookieless counting caps "unique visitors" at one day (Plausible: daily salt). Weekly or monthly uniques from such a tool are sums of daily uniques, not people.
- A count on a page is a dated number with a link to its record, never a live badge standing alone for a claim of adoption. No minimum count below which a number is hidden: no source sets one, and this record sets none.

## Findings

### 1. Tests and sample size
1.1 Peeking. Evan Miller (published 2010-04-18, independent practitioner): with a 50% baseline and a logo that changes nothing, stopping at the first 5% significance or at 150 observations gives a 26.1% false-positive rate, over five times the nominal 5%. He calls this a worst case (checked after every observation). Reported significance needed for a true 5%: 2.9% at one peek, 1.8% at three, 1.0% at ten. Advice: fix the sample size in advance; rule of thumb n = 16 sigma^2 / delta^2 per arm with sigma^2 = p(1-p). Source: [How Not To Run an A/B Test](https://www.evanmiller.org/how-not-to-run-an-ab-test.html).
1.2 His calculator takes baseline, minimum detectable effect, power and significance; the page states no defaults and gives one example of 2,545 subjects per variation for a 10.2% baseline ([sample-size](https://www.evanmiller.org/ab-testing/sample-size.html)).
1.3 Convert (vendor data): the calculator page states no fixed visitor figure; it says "halving MDE roughly quadruples sample size", that MDE should be the smallest lift that changes a decision (5-10% relative only as a starting point when none exists), that the frequentist sample is fixed before launch and the test is not stopped at the first significant result, and that sample-ratio-mismatch checks stay on ([Convert](https://www.convert.com/calculator/sample-size/)). The "Convert sample-size figure" the scout expected was not on the page; none is cited here.
1.4 Computed (section 7): the Miller rule of thumb and a two-sided 5%/80% power formula agree within 3 to 4%.

### 2. Download semantics, per registry
2.1 npm. The registry repo's own doc does not define a download; it points to a blog post (that URL returned 404 on 2026-11-27) and says nothing on mirrors, CI or bots. Daily job over S3 logs after UTC midnight; periods `last-day` (7 for week, 30 for month, 365 for year) or ranges; 18 months back for single queries, 128 packages and 365 days bulk, scoped packages not supported in bulk, per-version counts only for the previous 7 days ([npm/registry download-counts.md](https://github.com/npm/registry/blob/main/docs/download-counts.md)).
2.2 PyPI. pypistats says aggregates ignore known mirrors (bandersnatch) unless noted, retains 180 days, says nothing on bots or CI; source is the PSF BigQuery dataset `bigquery-public-data.pypi.file_downloads` ([pypistats about](https://pypistats.org/about)). The Python Packaging guide states internal or unofficial mirrors push counts up or down, pip's cache lowers them, scripts and inflation attempts raise them, and does not address CI ([PyPA guide](https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/)). Its worked example: pytest 26,190,085 downloads in 30 days, 24,334,215 from pip (92.9%), so installer is a real split.
2.3 CI split exists only on the pip side: pip puts `ci: true` into its user agent when any CI environment variable is set (`looks_like_ci()`), else `None`, and comments that tty checks fail because CI systems mimic a tty ([pip session.py](https://raw.githubusercontent.com/pypa/pip/main/src/pip/_internal/network/session.py), [pip misc.py](https://raw.githubusercontent.com/pypa/pip/main/src/pip/_internal/utils/misc.py)). Other installers (uv, poetry) carry no such flag in the pages read. The BigQuery docs page does not document `details.ci` ([docs.pypi.org](https://docs.pypi.org/api/bigquery/)); the field is visible only in the pip source and the Linehaul schema, and I could not query it (no `bq` on this machine). So "which share of downloads is CI" is not answerable from any public registry page; the nearest public split is mirror vs not and OS (section 7).
2.4 crates.io. Counting moved from API servers to CDN-log analysis; mirrors that previously hit the CDN directly are now counted, most crates' numbers rose, small crates most; the post says nothing on CI or bots ([crates.io blog, 2024-03-11](https://blog.rust-lang.org/2024/03/11/crates-io-download-changes/)). Any series spanning 2024-02/03 is broken. The crates.io data-access page and a CI-exclusion thread were not readable.
2.5 GitHub release assets: `download_count` per asset counts every fetch of that file, including checksum files, installer scripts and `dist-manifest.json`. The [GitHub REST releases-assets docs](https://docs.github.com/en/rest/releases/assets) (API version 2026-03-10, no page date, opened 2026-11-27) list `download_count` only as a required integer in the response schema and do not define what it counts. The inclusion of checksum and manifest files is therefore measured, not documented: ocx has 18,325 of 119,372 downloads on `.sha256` files and grimoire `dist-manifest.json` has 983 fetches against 2-3 per archive (section 7).

### 3. GitHub stars and the stargazer change
3.1 The stargazers listing is limited to admins and collaborators; the changelog post dated 2026-06-30 says "soon" and warns of empty responses or 403 ([GitHub changelog](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/)). The REST docs list `stargazers/count` (current count, unstarred users excluded) and `stargazers/history` (stars grouped by calendar week, weeks not guaranteed to align to UTC); `starred_at` needs the `application/vnd.github.star+json` media type ([REST docs](https://docs.github.com/en/rest/activity/starring)). A 2026-09-04 changelog introduced the history endpoint as the privacy-safe replacement (its body did not document the path; the docs page did). The scout date "2026-07" is the docs wording; the dated source is 2026-06-30 with no enforcement day stated.
3.2 Stars as signal: arXiv 2412.13459 ("Six Million (Suspected) Fake Stars", submitted 2024-12-18, revised 2025-09-06, GitHub data 2019-2024) says stars are the most used popularity signal, can be inflated, and fake stars give a short promotion effect under two months ([arXiv](https://arxiv.org/abs/2412.13459)).

### 4. Traffic
4.1 GitHub traffic API: `traffic/views`, `clones`, `popular/paths`, `popular/referrers`; last 14 days; write access; top 10 paths and referrers; `uniques` is used but not defined on the page; UTC midnight, weeks start Monday ([docs](https://docs.github.com/en/rest/metrics/traffic)).
4.2 Cookieless uniques: Plausible hashes daily salt + domain + IP + user agent, salt rotated and deleted every 24 hours, so a returning visitor on a later day is a new unique ([Plausible data policy](https://plausible.io/data-policy)). Consequence: a monthly "unique visitors" figure from such a tool is not people; say "daily-unique visits".
4.3 AI-referred traffic hides: Growth Unhinged (Kevin Indig, 2026-07-15) says 70.6% of AI-referred traffic lands as Direct in GA4, citing a Loamly post I did not open ([Growth Unhinged](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way)). Treat as an unverified third-hand vendor figure.

### 5. AI citations
5.1 Ahrefs (vendor data, own Brand Radar tool, 2026-10-29): 20 consecutive days, 7,831 questions, five engines, about 37,500 day-one citations. Gone by day two: 50% (AI Overviews), 58% (AI Mode), 59% (ChatGPT), 81% (Gemini), 83% (Copilot). About 75% of dropped citations returned within 20 days; 20-27% never returned; 96-99% of citations that lasted 8+ days returned. Implied method: rolling 7-day count, no reaction to one missing citation, review after two to three weeks ([Ahrefs](https://ahrefs.com/blog/how-stable-are-ai-citations/)). The article states no formal cadence; that is the page's implication.
5.2 Mentions vs links (Ahrefs vendor data about its own brand, 31,000 mentions, six platforms, 2025-11-26): share of mentions carrying a link is 10.7% (AI Overviews), 16.8% Gemini, 26.1% Copilot, 26.9% ChatGPT, 36.8% AI Mode, 51.6% Perplexity, average about 28% ([Ahrefs](https://ahrefs.com/blog/ai-citations-vs-impressions-study)).
5.3 Method (Growth Unhinged, 2026-07-15, a practitioner newsletter): freeze 20-50 prompts across personas and stages for at least four weeks; log prompt, model, location, answer, cited URLs, brands mentioned, shortlist position; weekly signal-quality check, monthly downstream check; report movement across a retrieved, cited, trusted ladder rather than one score ([source](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way)). One practitioner's method, not validated by an independent study.

### 6. One metric and activation
6.1 Lean Analytics (Croll and Yoskovitz, 2016-04-18): "The OMTM is the one number you're completely focused on above everything else for your current stage"; reasons: targets the riskiest question, forces a target, aligns the team, encourages experiments ([O'Reilly](https://oreilly.com/ideas/four-reasons-to-use-the-one-metric-that-matters)). A stage-bound number, not a permanent KPI.
6.2 PostHog: activation is a specific behaviour after which users likely keep coming back, not a sign-up ([PostHog docs](https://posthog.com/docs/new-to-posthog/activation)); the handbook says activation is per product, usually key events within a time period, recommends comparing 5-10 candidate definitions on activation and retention rates, checks activation within 30 days of showing intent and retention within 3 months, names no minimum sample, and calls a definition only 1% reach "too narrow" ([handbook](https://posthog.com/handbook/growth/growth-engineering/per-product-activation)). The PostHog blog article on finding their metric did not load.

### 7. Measurements (run 2026-11-27, UTC)
| What | Result | Command |
|---|---|---|
| ocx repo views, 14 days (2026-11-13..26) | 180 views, 38 uniques | `gh api repos/ocx-sh/ocx/traffic/views -q '{count,uniques}'` |
| ocx repo clones, 14 days | 7,990 clones, 426 uniques | `gh api repos/ocx-sh/ocx/traffic/clones` |
| grimoire views / clones, 14 days | 217 (70 uniques) / 3,847 (446 uniques) | same, `grimoire-rs/grimoire` |
| ocx referrers, 14 days | github.com 36, ocx.sh 3, Google 3, 2 others 1 each | `gh api repos/ocx-sh/ocx/traffic/popular/referrers` |
| grimoire referrers | github.com 13, grimoire.rs 7, Bing 6, rest <=3 | same |
| Stars | ocx 20, grimoire 17 | `gh api repos/<r> -q .stargazers_count` |
| ocx release assets, 38 releases | 119,372 downloads in total; 18,325 on `.sha256`; 100,992 on all other assets excluding manifest and installer scripts | `gh api repos/ocx-sh/ocx/releases --paginate -q '.[]\|.assets[]\|.download_count'` summed, with `select(.name\|test("sha256$"))` for checksums |
| grimoire latest release v0.17.0 | `dist-manifest.json` 983 fetches, archives 2-3 each | `gh api repos/grimoire-rs/grimoire/releases/latest` |
| npm `@ocx-sh/theme` | 5,353 (30 days to 2026-11-26), 1,017 (7 days) | `curl -s https://api.npmjs.org/downloads/point/last-month/@ocx-sh/theme` |
| npm `@grimoire-rs/indexer` | 1,127 (30 days), 340 (7 days) | same, `last-week` |
| PyPI `pip`, 180 days, mirror split | with mirrors 3,473,270,498 vs without 3,462,082,116: mirrors 0.32% | `curl -s -A research-script https://pypistats.org/api/packages/pip/overall` summed by category |
| PyPI `pip`, 180 days, OS | Linux 3,199,148,971 of 3,462,082,116 (92.4%); Windows 4.4%; Darwin 1.4%; null 1.8% | `.../packages/pip/system`. Linux share is a proxy for CI and containers, not a CI count |
| PyPI CI flag | not queryable; `bq` absent | `which bq` returns nothing |
| Sample size per arm, two-sided 5%, 80% power, 10% relative lift | baseline 2%: 80,681; 5%: 31,233; 10%: 14,751; 20%: 6,509 (Miller 16 p(1-p)/delta^2: 78,400 / 30,400 / 14,400 / 6,400) | `python3 -I` with `statistics.NormalDist`, pooled-variance formula |
| Weeks to fill both arms, using repo-page uniques per week as the traffic proxy (ocx 19, grimoire 35 per week) | baseline 5%: ocx 3,288 weeks, grimoire 1,785; baseline 10%: ocx 1,553, grimoire 843 | arms total 2n divided by weekly uniques |

Caveats: GitHub repo uniques are the only measured traffic. Neither landing page has analytics (audit: no social channel, no telemetry), so real site traffic is unmeasured and may differ; the proxy is generous because landing-page visitors are not repo visitors. Clones are 44 times views for ocx; the CI and mirror share of clones and downloads is unmeasurable from the public API. A registry that splits CI exists only in pip's own flag (2.3); it was not queried.

## Dated facts
Type: P = platform or authority itself, I = independent study, V = vendor data, N = practitioner. Stated date is the source's own; "undated" means the page shows none.

| Fact | Source | Stated date | Type |
|---|---|---|---|
| Peeking: stop at first 5% significance gives 26.1% false positives (worst case) | [Miller](https://www.evanmiller.org/how-not-to-run-an-ab-test.html) | 2010-04-18 | N (author) |
| GitHub traffic data kept 14 days | [GitHub traffic docs](https://docs.github.com/en/rest/metrics/traffic) | API version 2026-03-10 | P |
| Stargazers listing restricted to collaborators | [GitHub changelog](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/) | 2026-06-30 | P |
| `stargazers/count` and `stargazers/history` remain | [REST docs](https://docs.github.com/en/rest/activity/starring) | API version 2026-03-10 | P |
| Release-asset `download_count` has no definition in the docs | [REST docs](https://docs.github.com/en/rest/releases/assets) | API version 2026-03-10 | P |
| crates.io counting changed to CDN logs | [Rust blog](https://blog.rust-lang.org/2024/03/11/crates-io-download-changes/) | 2024-03-11 | P |
| pypistats keeps 180 days, ignores known mirrors | [pypistats](https://pypistats.org/about) | undated | P (community service) |
| npm counts: 18 months single, no CI statement | [npm docs](https://github.com/npm/registry/blob/main/docs/download-counts.md) | undated | P |
| About 6M suspected fake stars; promotion effect under 2 months | [arXiv 2412.13459](https://arxiv.org/abs/2412.13459) | 2024-12-18, rev. 2025-09-06 | I |
| 50-83% of AI citations gone by day two; about 75% of dropped return in 20 days | [Ahrefs](https://ahrefs.com/blog/how-stable-are-ai-citations/) | 2026-10-29 | V |
| About 28% of AI mentions carry a link (10.7% to 51.6% by engine) | [Ahrefs](https://ahrefs.com/blog/ai-citations-vs-impressions-study) | 2025-11-26 | V |
| AI search 0.5% of Ahrefs visits, 12.1% of signups, about 23x | [Ahrefs](https://ahrefs.com/blog/ai-search-traffic-conversions-ahrefs/) | 2025-06-16 | V, one site |
| Similarweb 7% vs 5% (secondary) | [ContentGrip](https://www.contentgrip.com/similarweb-2025-genai-report/) | 2026-02-11 | V via press |
| AI referrals deliver 3.2 conversions per 100 organic | [SE Roundtable on SEO Works](https://seroundtable.com/ai-search-studies-42359.html) | 2026-10-22 | V via press |
| Plausible salt rotated every 24 hours | [Plausible](https://plausible.io/data-policy) | undated | V (own method) |
| 70.6% of AI-referred traffic lands as Direct in GA4 (third-hand) | [Growth Unhinged](https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way) | 2026-07-15 | N |
| OMTM definition | [O'Reilly](https://oreilly.com/ideas/four-reasons-to-use-the-one-metric-that-matters) | 2016-04-18 | N (authors) |

## Metric record and decisions
Every metric entry carries these fields (extends the evidence record from claims-evidence-record; this dive owns definition and window).

| Metric | Definition to print | Window | May claim | May never claim |
|---|---|---|---|---|
| GitHub stars | `stargazers/count` at read time | as-of date | "N stars on <date>" (popularity) | adoption, users, trust; growth from a listing scrape |
| GitHub repo views/uniques | `traffic/views` count and `uniques`, per GitHub, 14-day window | 14 days, from the snapshot file | "N repo views in the 14 days to <date>" | site visitors; people |
| GitHub clones | `traffic/clones` | 14 days | nothing about people; only "clone requests" | adoption, users, installs (44:1 clones to views) |
| Release-asset downloads | sum of `download_count` of binaries only, per release, checksums and manifests excluded | per release or lifetime, stated | "N binary downloads of release X on <date>" | installs, active users (CI, retries, mirrors, scanners unquantified) |
| npm downloads | `api.npmjs.org/downloads/point/<period>` | the period named; max 18 months | "N npm downloads in the 30 days to <date>" | users; anything about CI exclusion |
| PyPI downloads | pypistats or BigQuery with mirrors flag and installer named | max 180 days via pypistats | same form, says mirrors excluded or not | users; CI exclusion unless the `ci` field was queried |
| crates.io downloads | crates.io total or db dump | any series crossing 2024-02/03 flagged | same form | users; cross-2024 trends |
| Daily-unique visits (cookieless tool) | tool's daily-salt unique | 1 day; sums for longer | "N daily-unique visits in <period>" | "unique visitors" or "people" for a week or month |
| AI citation | cited URL appears in an answer, per engine, frozen prompt list | 7-day rolling, run 4+ weeks | "cited on X of 7 days for Y prompts" | one-run counts; any uplift claim from one check |
| AI mention | brand named in an answer, no link needed | same | reported separate from links | merged with citations |
| A/B result | variant, n per arm, pre-registered n, baseline, MDE, alpha, power | fixed at start | winner only when n reached and pre-registered | peeked or sub-n results |
| Activation (CLI) | team-written definition: event(s), numerator, denominator, window; correlated with retention | e.g. 14 or 30 days (PostHog examples) | rate for that definition | any activation figure with no observable source (no telemetry) |

Metrics that may never be claimed as adoption: stars, clones, views, release-asset or registry downloads, AI citations, daily uniques. Adoption claims need a named adopter, a dependents link or a stated opt-in measurement (docs-quality DOC-TYPE-15 already requires a source link).

Page form for a count: a dated number with its record, in prose or a table: "20 GitHub stars (GitHub API, 2026-11-27)" with a link to the record file. A live badge may appear for stars and the registry version, but not as the sole support of an adoption or "trusted by" claim; a badge has no window and no definition. No hide threshold: no source sets one, so no rule hides a small number; a small true number stated with its date is the honest form.

A/B test not worth running when any of these holds: required n per arm at the pre-registered MDE exceeds what the surface collects in 8 weeks (the 8 weeks is a CONSIDER default, not sourced; the sourced part is "n = duration x traffic", Convert); there is no analytics on the surface; the change is reversible and cheap (ship and watch the one metric); the lift that would change a decision is under about 10% relative on a baseline under 20% (n above 6,500 per arm). Every fleet surface fails these today.

## Normative guidance candidates
Severity: the leading label of each rule (MUST, MUST NOT, SHOULD, CONSIDER) is its severity field.
1. Severity: MUST. Rule: print name, definition, source, window and as-of date next to every metric an agent writes into a report, README or page. Why: dropped denominators and windows are the main agent failure (scout #31). Verify: dashboard spec lint, each tile has the five fields; grep a report for a bare number next to "downloads", "users", "visitors" with no date in the same sentence or table row.
2. Severity: MUST NOT. Rule: claim stars, clones, views, downloads, citations or daily uniques as users, adoption or "trusted by". Why: none identifies a person (sections 2-4, 7). Verify: grep `(users|adopt|trusted by|installs)` within 80 characters of a metric figure; a hit needs a named-adopter or dependents link.
3. Severity: MUST. Rule: write "downloads" only with registry, period and as-of date, and add "includes CI, mirrors and bots; share unmeasured" unless a split was queried. Why: npm gives no definition; PyPI and crates.io disclaim or omit CI. Verify: regex `[\d,]+ (npm |PyPI |crates\.io )?downloads` requires a date and registry in the same sentence; reading heuristic. Pass: "5,353 npm downloads, 30 days to 2026-11-26". Fail: "5k+ users".
4. Severity: MUST. Rule: exclude `.sha256`, `dist-manifest.json` and installer-script assets when summing GitHub release downloads for a binary claim. Why: ocx has 15.4% on checksums; grimoire manifest shows 983 vs 2-3 per archive. Verify: the summing command filters on name; grep the script for `sha256`.
5. Severity: MUST. Rule: snapshot GitHub traffic at least every 14 days, ideally weekly, into a committed or archived file with the run date; report no figure for a span with no snapshot. Why: retention is 14 days (docs). Verify: a scheduled workflow calls `traffic/views`, `clones`, `popular/referrers`; absence is a finding (DOC-OBS-16 already uses the call).
6. Severity: MUST. Rule: read star counts from `GET /repos/{o}/{r}/stargazers/count` or `stargazers/history`; never scrape or list `/stargazers`. Why: listing restricted to collaborators from the 2026-06-30 announcement. Verify: grep scripts for `/stargazers` without `/count` or `/history`.
7. Severity: MUST. Rule: label any series crossing 2024-02 to 2024-03 for crates.io as discontinuous. Why: counting method changed. Verify: grep for crates.io trend wording; require the break note.
8. Severity: MUST. Rule: call cookieless daily uniques "daily-unique visits" for any window over one day. Why: daily salt makes weekly uniques a sum. Verify: reading heuristic. Pass: "420 daily-unique visits in 7 days". Fail: "420 unique visitors this week".
9. Severity: MUST. Rule: for an A/B test, write baseline, MDE, alpha, power, computed n per arm and stop rule before launch, and report no winner below n. Why: peeking raises a nominal 5% error to 26.1% in the worst case ([Miller, 2010-04-18](https://www.evanmiller.org/how-not-to-run-an-ab-test.html)). Verify: compare reported n with the pre-registered n; script `n = (z_a*sqrt(2*pb*(1-pb)) + z_b*sqrt(p1*(1-p1)+p2*(1-p2)))^2/(p2-p1)^2`; fail on a "winner" with n below it.
10. Severity: MUST. Rule: refuse to run or report an A/B test when n per arm exceeds the surface's traffic over the test window (decision rule above). Why: fleet needs 843 to 3,288 weeks at a 10% lift (section 7 measurement; formula per [Miller](https://www.evanmiller.org/ab-testing/sample-size.html), undated). Verify: the n above divided by measured weekly uniques per arm; if over 8 weeks (CONSIDER default), recommend ship-and-observe instead.
11. Severity: MUST. Rule: report AI citations per engine, as days cited out of 7, with prompt list, engine, location and run dates; separate mention and link columns; no conclusion from one run. Why: 50-83% of citations disappear next day ([Ahrefs, vendor data, 2026-10-29](https://ahrefs.com/blog/how-stable-are-ai-citations/)); links are about 28% of mentions ([Ahrefs, vendor data, 2025-11-26](https://ahrefs.com/blog/ai-citations-vs-impressions-study)). Verify: report schema has those columns; reject "visibility changed" with fewer than 7 daily runs.
12. Severity: SHOULD. Rule: freeze 20-50 prompts for at least four weeks before comparing periods. Why: avoids prompt drift (Growth Unhinged method, one practitioner). Verify: prompt list file hash unchanged across the compared runs.
13. Severity: SHOULD. Rule: label vendor-measured figures ("Ahrefs, vendor data, 2026-10-29") wherever quoted. Why: vendor sells the tool measured. Verify: grep quoted study figures for a vendor label.
14. Severity: SHOULD. Rule: choose one stage metric per quarter (OMTM) and state the stage; an agent-built report leads with that metric. Why: Croll and Yoskovitz. Verify: report's first line names the metric and the stage.
15. Severity: SHOULD. Rule: where no telemetry exists, write the activation proxy as definition + numerator + denominator + window, and mark it "proxy". Why: PostHog definitions are event windows validated by retention; a CLI without telemetry cannot be validated. Verify: a written definition with all four parts; absent = fail.
16. Severity: SHOULD. Rule: give a count on a page as a dated number with a link to its record; a live badge only beside, never in place of, the dated statement. Why: a badge has no window or definition. Verify: grep pages for `img.shields.io` near "adopt" or "trusted" wording; require a dated sentence.
17. Severity: CONSIDER. Rule: add `source`, `as_of` and `window` columns to any agent-produced metric table. Why: makes rules 1-3 checkable by script. Verify: column presence.

## What an agent must not decide alone
- Whether to add telemetry (opt-in or not): privacy, consent and legal call; ask. The fleet stance is "measure without cookies or do not measure".
- Which one metric is the OMTM for the quarter, and what lift would change a decision (the MDE): business choice.
- Whether to run a paid or third-party measurement tool, or share data with a vendor.
- Whether to publish a number the owner may find embarrassingly small, or to hide it; no source sets a threshold, so ask.
- Whether to claim adoption from private evidence (a customer conversation): needs the customer's consent.

## AI-agent angle
| Characteristic error | Smallest check |
|---|---|
| Quotes "5k downloads" as users | grep rule 2 and 3 |
| Sums all release assets including checksums | rule 4 filter present in script |
| Scrapes `/stargazers` for history | rule 6 grep; returns empty or 403 now |
| Calls a "winner" after a few days | rule 9 compares n with pre-registered n |
| Reports "unique visitors this month" from a cookieless tool | rule 8 wording check |
| Treats one AI-citation run as a result | rule 11 requires seven daily runs |
| Writes a training-memory star or download figure | every figure must trace to a command output with a date (records) |
| Merges mentions and links into one "citation rate" | rule 11 columns |

## Contested
- Are AI-referred visitors higher quality?
  - For: [Ahrefs, vendor data, 2025-06-16](https://ahrefs.com/blog/ai-search-traffic-conversions-ahrefs/): about 23x the organic conversion rate, 12.1% of signups from 0.5% of visits over 30 days, one site (Ahrefs itself); the author says it may be unusual and doubts it scales. [ContentGrip, 2026-02-11](https://www.contentgrip.com/similarweb-2025-genai-report/) relays Similarweb as 7% vs 5% for ChatGPT referrals vs Google; secondary summary, no period or method stated, "2 points" and "+2%" used interchangeably. Not checked against Similarweb's own report.
  - Against: [SEO Works study via Search Engine Roundtable, 2026-10-22](https://seroundtable.com/ai-search-studies-42359.html): organic delivered 39x the traffic of AI assistants; per 100 organic conversions AI referrals delivered 3.2; AI converts worse than paid search (0.67x), better than direct (2.48x). Site count and country not stated in the text; the earlier "23 of 63 sites" figure could not be found in any source and is withdrawn here.
  - Verdict: report AI traffic as its own row, make no quality claim.
- Is a citation count a goal? Ahrefs shows churn and recommends waiting; Growth Unhinged argues a ladder rather than one score; neither shows a link to revenue. Stance: citations are an indicator, not an outcome.
- Fixed-sample vs sequential testing: Miller says fix n and do not peek but links sequential and Bayesian designs; Convert offers a sequential calculator with always-valid evidence and gives no timing rules. For a rule an agent follows blind, fixed n is the checkable one; sequential needs a named method (ask).
- Stars: some treat as a social-proof asset; the 2024 study calls fake stars a long-term liability. Stance: show the dated number, never as adoption.

## Sources
| URL | What it is | Date | Type |
|---|---|---|---|
| https://www.evanmiller.org/how-not-to-run-an-ab-test.html | Peeking and fixed n | 2010-04-18 | primary (author) |
| https://www.evanmiller.org/ab-testing/sample-size.html | Sample-size calculator page | undated | primary |
| https://www.convert.com/calculator/sample-size/ | MDE and fixed-sample guidance | undated | vendor |
| https://github.com/npm/registry/blob/main/docs/download-counts.md | npm download API | undated | primary (registry) |
| https://pypistats.org/about | PyPI stats scope, 180 days | undated | primary-ish (community service on PSF data) |
| https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/ | BigQuery use and caveats | page dates 2013, 2016, 2018 | primary (PyPA) |
| https://docs.pypi.org/api/bigquery/ | Dataset name | undated | primary |
| https://raw.githubusercontent.com/pypa/pip/main/src/pip/_internal/network/session.py | pip CI flag in user agent | read 2026-11-27 | primary (source) |
| https://raw.githubusercontent.com/pypa/pip/main/src/pip/_internal/utils/misc.py | `looks_like_ci()` | read 2026-11-27 | primary (source) |
| https://blog.rust-lang.org/2024/03/11/crates-io-download-changes/ | crates.io counting change | 2024-03-11 | primary |
| https://docs.github.com/en/rest/metrics/traffic | GitHub traffic API, 14 days | API version 2026-03-10 | primary |
| https://docs.github.com/en/rest/activity/starring | Stargazer endpoints, restriction | API version 2026-03-10 | primary |
| https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/ | Restriction announcement | 2026-06-30 | primary |
| https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data | Star history endpoint | 2026-09-04 | primary |
| https://arxiv.org/abs/2412.13459 | Fake stars study | 2024-12-18, rev. 2025-09-06 | independent study |
| https://plausible.io/data-policy | Daily-salt unique visitors | undated | vendor (documents own method) |
| https://ahrefs.com/blog/how-stable-are-ai-citations/ | AI citation churn | 2026-10-29 | vendor data |
| https://ahrefs.com/blog/ai-citations-vs-impressions-study | Mentions vs links | 2025-11-26 | vendor data |
| https://www.growthunhinged.com/p/how-to-measure-the-impact-of-ai-search-the-right-way | Frozen-prompt method, 70.6% Direct | 2026-07-15 | practitioner newsletter |
| https://oreilly.com/ideas/four-reasons-to-use-the-one-metric-that-matters | OMTM | 2016-04-18 | primary (authors) |
| https://posthog.com/docs/new-to-posthog/activation | Activation definition | undated | vendor docs |
| https://posthog.com/handbook/growth/growth-engineering/per-product-activation | Per-product activation, 30-day window | undated | vendor handbook |
| https://github.com/pypi/linehaul-cloud-function/blob/main/README.md | Linehaul overview (no CI detail) | read 2026-11-27 | primary |

Not readable or not found: blog.npmjs.org download-count post (404), crates.io data-access page, the PostHog blog "How we found our activation metric", a Convert fixed sample-size figure, the Linehaul CI schema field. Measurement files: none kept; every figure above is reproducible from the commands in section 7.

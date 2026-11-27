---
title: Channel facts registry and channel inventory - measured decay, schemas and checks
program: product
sub_program: channels
topic: channel-agent-boundary
worker: core-facts-and-channel-inventory
date_researched: 2026-11-27
model: sonnet
sources_fetched: 100
scope: Covers (a) how fast platform channel facts change and the facts-file schema and refresh cadence that follow, and (b) the per-organisation channel inventory with its inbound-link check, measured on the OCX and Grimoire fleet. Does not cover which labels each platform requires (sibling workers), decay of the team's own posts (marketing SEO), or the content of any single platform's rules beyond the sampled facts.
---

# Channel facts registry and channel inventory

## Table of contents

1. Summary
2. Findings (1 Method and sample; 2 How fast channel facts change; 3 Do help pages show absolute dates; 4 Scout figures re-fetched; 5 Exemplars of fact versioning; 6 Channel inventory and the inbound-link check; 7 Decisions; Appendix A sample list and re-fetch result)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- The Wayback CDX digest count is not a lower bound on edits. On docs.github.com it overcounts real edits about 20 to 40 times, so a skill must not use CDX to set refresh cadence or to detect change.
- GitHub Docs pages (20 sampled) took 196 commits from 2024-01-01 to 2026-11-27, median 40.5 days between commits per page. Only about 11% of commits touch a numeric limit line (8 of 71 on 6 limit-bearing pages).
- A numeric limit on a limit-bearing GitHub Docs page changes about once per 25 page-months, so limits need a slow cadence (180 days) and policy or behaviour claims a fast one (90 days).
- LinkedIn help pages show only a relative age. 28 of 28 sampled show "Last updated: N ago"; median 165 days, 8 of 28 older than one year. A fact cannot be dated from the platform page, so the verified date must be the agent's own fetch date.
- 44 of 81 sampled pages show no machine-readable date at all in the served HTML (all 9 GitHub Docs pages, all 9 YouTube Help pages), 6 show an absolute date (dev.to, Slack, Zoom, two Google Search pages, Microsoft Learn), 28 LinkedIn pages plus 2 Product Hunt pages show a relative one, and 1 Product Hunt page plus the FTC page could not be read (Appendix A).
- Wayback captures of JS-rendered help pages are unusable for content diff: of 12 pages tried, 1 produced two non-empty captures. Staleness detection must re-fetch the live page and match an `expect` pattern.
- All 81 sampled pages were re-fetched on 2026-11-27 (Appendix A). Of the 46 pages whose scout fact carries a number, 32 matched every number mechanically and 14 matched most; each of the 14 misses was checked by hand and is a wording difference (`three` for `3`, `3000` for `3,000`) or a figure on a sibling page, not a changed value. No scout figure failed to reproduce. FTC (404) and Product Hunt (403 to curl) could not be read by curl; two Product Hunt pages were read with WebFetch. Two differences matter for verification: numerals are formatted `3000`, `100MB` on the live page, and two scout claims about the YouTube channel feed are swapped in view attribution.
- Cadence is per platform, not only per fact class (finding 2, table "Cadence per platform"): LinkedIn organic limits 180 days, LinkedIn ads 90, GitHub limits 180 and policy 90, YouTube Help 90, Google Search 90, X 90, communities and launch venues 90, event dates expire at the date.
- Facts-file schema decision: one row per fact with id, fact, value, URL, verified date, refresh days, provenance label and an `expect` regex; one shared registry per platform, not per skill.
- Inventory decision: one `channels.yml` per organisation in the repository that owns the main website, listing every account including planned, retired and squatted ones, with an ownership state (`proven` or `inferred`).
- Measured inbound-link state: the Discord invite sits on 4 owned surfaces for OCX (README, Astro config, nav.json, team page) and the live ocx.sh serves it on 4 of 4 sitemap pages; Grimoire links it on 0. The YouTube channel is linked from 0 of 17 repositories and 0 of 52 crawled pages.
- The inbound-link check must resolve reference-style Markdown links (`[discord]: https://...`) and exclude test fixtures, because 26 of 33 raw Discord hits in `ocx-sh/website` are `nav-invalid` test fixtures.
- Two LinkedIn personal profiles are linked from the team page; no company page exists in the fleet, and an unauthenticated probe cannot prove absence, so the inventory needs an `ownership` field and a `verified_by` method.

## Findings

### 1. Method and sample

All commands run 2026-11-27 from `/home/mherwig/dev`. Scratch under the session scratchpad.

- Sample: 81 distinct pages, each carrying at least one dated fact from the 13 channel scouts' "Dated facts" tables (323 distinct URLs there). Built with a per-domain cap so no single platform dominates: LinkedIn help 28 (12 ads pages, 16 organic pages), YouTube Help 9, GitHub Docs 9 (plus 11 more GitHub Docs content files used for commit counts only, 20 in total), GitHub trending and changelog 2, Google Search docs 2, X docs 3, Bluesky blog 2, Hacker News 2, Product Hunt 3, and singles (W3C, Linux Foundation, PyCon, FOSDEM, dev.to, Slack, FTC, RSS board, Brew, Cargo, Buffer, Zoom, TechSmith, Podnews, Meta Threads, YouTube blog, Microsoft Learn, BetaList, GA). The full list, with every page URL, is published in Appendix A of this file.
- Re-fetch (repair pass, 2026-11-27): the same 81 URLs were fetched again with `curl -sL --compressed -m 40 -A 'Mozilla/5.0 research' <url>`, tags and scripts stripped, and every numeral with a unit in the scout fact text (`\d[\d,.]* ?(KiB|MB|GB|characters|minutes|...)`) was searched in the live text with commas and spaces normalised. Result per page in Appendix A. The script is a 25-line Python 3 `-I` program run as `python3 -I rf.py sample.tsv`; its logic is the sentence above.
- CDX per page: `curl -s "https://web.archive.org/cdx/search/cdx?url=<page>&output=json&from=2024&collapse=digest&filter=statuscode:200"`. Parsed with Python 3 `-I`; per page capture count, first and last capture, median days between consecutive captures. The service did not state rate limits ([CDX server docs](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)); 10 of 81 requests errored or timed out and 3 returned 0 captures; these are excluded from medians.
- Live fetch per page: `curl -sL --compressed -m 40 -A 'Mozilla/5.0 research' <page>`, then regex for `Last updated|Updated ... N unit ago` (relative) and `Last updated|Updated|Published ... <Month D, YYYY | YYYY-MM-DD>` (absolute). Product Hunt pages returned 403 to curl and were read with WebFetch, which showed "Updated over 3 weeks ago".
- GitHub Docs: for each of 20 pages the content file was located (`gh api 'search/code?q=repo:github/docs+filename:about-readmes.md'` pattern, or the `content/<url path>.md` convention) and edits counted with `gh api -X GET repos/github/docs/commits -f path=content/<path> -f since=2024-01-01T00:00:00Z -f per_page=100 --paginate -q '.[]|.commit.committer.date'`. For 6 limit-bearing pages each commit's patch was fetched (`gh api repos/github/docs/commits/<sha>`) and counted when a changed line matched `\d[\d,.]*\s?(KiB|MB|GB|KB|characters|pixels|topics|px|minutes|seconds|days)`.
- Limits of the method, stated up front. CDX records captures, not edits: several edits between captures count once and a reverted edit is invisible. `collapse=digest` collapses only adjacent identical digests ([CDX docs](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)), and the digest is of the whole HTML including page chrome. The brief expected CDX counts to be lower bounds; measurement shows they are lower bounds only where HTML is static and an upper bound where chrome varies (finding 2). The GitHub Docs numeric-limit regex can miss a limit expressed without a unit and can match a non-limit number; the 11% is an estimate, not a count of fact edits.

### 2. How fast channel facts change

Real edit history (GitHub Docs, [github/docs commits API](https://docs.github.com/en/rest/commits/commits), 2024-01-01 to 2026-11-27, 20 pages):

| Measure | Value |
|---|---|
| Pages, commits | 20 pages, 196 commits (3 to 24 per page, mean 9.8) |
| Median days between commits, per page | 15 to 161; median of the 20 page-medians 40.5 |
| Commits touching a numeric-limit line, 6 limit pages | 8 of 71 (attaching-files 2 of 20, github-pages-limits 2 of 5, about-readmes 1 of 16, social-media-preview 1 of 7, topics 2 of 11, organizations-profile 0 of 12) |
| Implied limit change rate | 8 edits over about 204 page-months, one per about 25 page-months, estimate |

CDX digest counts on the same kind of page, collapsed to unique digests since 2024:

| Page set | Digest captures per page | Median days between captures | Real commits per page |
|---|---|---|---|
| docs.github.com, 6 pages with CDX | 15 to 361 (median about 250) | 1 to 7.5 | 4 to 24 |
| support.google.com, 8 pages | 41 to 7,435 | 0 to 17 | not available |
| linkedin.com/help, 25 pages with captures | median 9 (2 to 24) | median 54 | not available |
| other platform pages (X docs, HN, Bluesky, Product Hunt) | 3 to 364 | 0 to 122 | not available |

The result is that CDX counts on docs.github.com overcount real edits about 20 to 40 times (median 1 day between digests against 40.5 days between commits), because the HTML digest moves with navigation, banners and rendered timestamps. LinkedIn help HTML is small and stable, so its median of 9 digests over 35 months is plausibly near the real edit count, but there is no ground truth to confirm it. CDX is therefore a poor automatic change detector for server-rendered platform pages and no basis for a refresh cadence by itself.

Content-level diff failed where it mattered. For 12 pages (9 YouTube/Google/HN/X pages in a first try and 7 LinkedIn help pages in a second), only `linkedin.com/help/linkedin/answer/a525301` returned two non-empty captures, 2024-01-19 and 2026-11-10; its limits (3000 characters, 1.91:1, 1200 x 627) did not change, only the date tokens did. Later captures of other LinkedIn pages returned 0 bytes of text, which is the JS shell. So the measured result is: for this fact the value held for 34 months, and Wayback cannot confirm it for the rest.

Age of facts as the platform shows it. 28 of 28 sampled LinkedIn Help pages show `Last updated: N <unit> ago`, which parsed to days gives: 1, 21 (x3), 30, 60 (x4), 90 (x2), 120 (x3), 210, 330, 365 (x4), 730 (x5), 1095 (x3). Median 165 days, 8 of 28 older than 365 days, 3 are about three years old. A stable limit page that the platform has not touched for three years is not evidence it is current; it is evidence the platform did not edit it.

Cadence that follows (derived, not proven; the basis is the rates above):

| Fact class | Example | Refresh days | Basis |
|---|---|---|---|
| Hard limit (characters, bytes, duration, pixels, counts) | LinkedIn post 3,000 characters; GitHub topics 20 and 50 characters | 180 | One numeric-limit edit per about 25 page-months on GitHub Docs; below LinkedIn's median page age of 165 days |
| Policy, eligibility, feature availability | Product Hunt launch rules, YouTube monetisation, newsgroup guidelines | 90 | Policy pages edited at the page-median interval of 40.5 days; 90 days catches a change within two page edits |
| Behaviour and ranking claims, vendor and independent statistics | LinkedIn dwell-time claims, view counts | 90, and never promoted into a MUST rule | Source type is not the platform; vendor data carries a label |
| Time-bound events (CFP deadlines, launch calendars) | FOSDEM 2027 devroom proposals deadline 4 October 2026, stands 31 October 2026, weekend 30 and 31 January 2027 ([FOSDEM key dates](https://fosdem.org/2027/calendar/), a dated list on the page, read 2026-11-27; the 4 October deadline is already past) | expire at the date; recheck 30 days before | Dates are fixed once published; FOSDEM lists each deadline as an absolute date |
| Platform API fields and endpoints | X API post length | 90 | X docs captured at medians of 0 to 122 days; changelog page is itself a dated feed |

Cadence per platform (derived; the basis column states what was measured for that platform, and where nothing was measured the row says so):

| Platform | Refresh days: hard limits / policy and other facts | Basis, measured 2026-11-27 |
|---|---|---|
| LinkedIn organic (help `linkedin/answer`) | 180 / 90 | 16 organic help pages, median age 547 days, 8 of 16 older than 365 days (Appendix A rows 66 to 81): limits sit untouched for years, so 180 is generous; the weekly `expect` check carries the risk |
| LinkedIn ads (help `lms/answer`) | 90 / 90 | 12 ads pages, median age 105 days, oldest 365 days, 6 of 12 edited within 4 months (rows 36 to 47): ad specs are edited far more often than organic |
| GitHub (Docs, Releases, Topics) | 180 / 90 | 20 pages, median 40.5 days between commits, about 1 limit edit per 25 page-months (finding 2) |
| YouTube Help (`support.google.com/youtube`) | 180 for upload specs, 90 for policy and AI-label rules | No date and no edit history are served for any of 9 pages; nothing measured. Chosen from Google Search docs below because both run on the same help platform |
| Google Search docs | 90 / 90 | Absolute dates on page: `Last updated 2026-07-10 UTC` (consolidate duplicate URLs) and `Last updated 2025-12-10 UTC` (publication dates), so 4 to 11 months between edits |
| X (docs.x.com) | 90 / 90 | Reference pages carry no date; the changelog page carries dated entries (latest 2026-11-19 in the served text) and is the staleness feed for X |
| Hacker News, Reddit, Lobsters, Discord (community rules) | n/a / 90 | HN guidelines and Show HN pages carry no date (rows 14, 15); nothing measured |
| Product Hunt, BetaList (launch venues) | n/a / 90 | Help pages show `Updated over 3 weeks ago`; Product Hunt blocks curl with 403 (rows 32 to 34) |
| Event CFPs (FOSDEM, KubeCon, PyCon) | expire at the stated date | FOSDEM lists each deadline as an absolute date; KubeCon and PyCon pages state limits but no deadline in the fetched text |
| Bluesky, Threads (microblog) | 90 / 90 | Bluesky blog posts carry the date in the URL (`04-21-2025`); Threads docs carry no date |

### 3. Absolute date versus relative age on help pages

Counted on the live HTML of the 81 sampled pages (command in finding 1; per-page marker in Appendix A):

| Marker | Pages | Which |
|---|---|---|
| Relative age only ("Last updated: 2 years ago", "Updated over 3 weeks ago") | 30 | all 28 LinkedIn Help pages; 2 Product Hunt help pages (read with WebFetch) |
| Absolute date | 6 | [dev.to terms](https://dev.to/terms) (November 21, 2024), [Slack acceptable use policy](https://slack.com/acceptable-use-policy) ("Last Updated: July 8, 2025"), [Google Search consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) (Last updated 2026-07-10 UTC), [Google Search publication dates](https://developers.google.com/search/docs/appearance/publication-dates) (Last updated 2025-12-10 UTC; the page also contains example text "February 4, 2019", which is not its own date), [Microsoft Learn deduplication](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/conversions/deduplication) (2025-08-29), [Zoom webinar statistics](https://www.zoom.com/en/blog/webinar-statistics/) (October 16, 2025) |
| Could not be read | 2 | [FTC Disclosures 101](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers) (HTTP 404 today, 403 and 404 on earlier probes); one Product Hunt help page (403 to curl, not fetched with WebFetch) |
| No date in the served HTML | 43 | all 9 sampled GitHub Docs pages, all 9 YouTube Help pages, X docs, HN guidelines, Bluesky blog (its date is in the URL), and the rest |

Sum is 81. The first-pass regex gave 28 relative, 4 absolute, 49 none; the repair pass (full re-fetch, a regex for `Last updated`/`Updated`/`Published` plus a hand check of the Google, Zoom and Microsoft Learn strings and a WebFetch of two Product Hunt pages) moved 6 pages to absolute, 2 to relative and 2 to unreadable. The finding that matters: for the two priority platforms the page itself gives no absolute date (LinkedIn: relative; YouTube Help: none), so the registry's `verified` column must hold the agent's fetch date and cannot be copied from the page.

### 4. Scout figures re-fetched

Figures re-fetched live on 2026-11-27. The twelve rows below were read by hand; the other 69 sampled pages were re-fetched by script and are summarised after the table and listed in Appendix A.

| Scout figure | Live result | Status |
|---|---|---|
| LinkedIn post text up to 3,000 characters ([a528176](https://www.linkedin.com/help/linkedin/answer/a528176)) | "3,000 characters" | reproduces |
| Link post text up to 3,000 characters, preview 1.91:1 at 1200 x 627 ([a525301](https://www.linkedin.com/help/linkedin/answer/a525301)) | "up to 3000 characters", "1.91:1 ratio and 1200 (w) x 627 (h) pixels" | reproduces; numeral written `3000` |
| Document: 100 MB and 300 pages ([a518909](https://www.linkedin.com/help/linkedin/answer/a518909)) | "100MB and 300 pages" | reproduces; written `100MB` |
| Image post: 20 images, 5 MB ([a527229](https://www.linkedin.com/help/linkedin/answer/a527229)) | "20 images", "5 MB" | reproduces |
| Video 3 s to 15 min, 5 GB ([a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587)) | "15 minutes", "5 GB" | reproduces |
| Poll: question 140, option 30 characters ([a527270](https://www.linkedin.com/help/linkedin/answer/a527270)) | "140 characters", "30 characters"; page shows "Last updated: 1 year ago" | reproduces |
| GitHub topics: 20 topics, 50 characters ([docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)) | "20 topics", "50 characters" | reproduces |
| GitHub social preview 1280x640, under 1 MB | "1280", "640", "1 MB" | reproduces |
| Product Hunt launch live 12:01 AM Pacific, schedule up to 30 days ahead ([help](https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date)) | same, via WebFetch; curl gets 403 | reproduces; page shows relative age only |
| FTC "Disclosures 101" ([url](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)) | HTTP 403 to curl today, an earlier probe returned 404 | not re-verified; bot-blocked, not shown absent |
| YouTube channel `@ocx-sh`, 2 videos both 2026-11-17, 19 views total ([audit](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md)) | feed: both published 2026-11-17; "Pin Node.js in the repo" has 7 views, "Dino Edition" has 12 | total reproduces (19); the audit's per-video attribution (12 for the first, 7 for the second) is swapped against today's feed; views are live counters |
| Discord invite mT2UCF8CVe: name `ocx`, 5 members, `expires_at` null | `ocx`, 5, None | reproduces |

Script re-fetch of the remaining sampled pages (Appendix A). Selected results: Google Search "consolidate duplicate URLs" page date 2026-07-10 reproduces; dev.to terms still carry "November 21" (2 hits); Slack still reads "Last Updated: July 8, 2025"; FOSDEM key dates lists 4 October 2026 (devroom proposals), 31 October 2026 (stands), 30 and 31 January 2027; X create-post doc still says "At most 280 characters unless the account has X Premium" and poll "2-4 choices, 1-25 characters each"; X media: image 5 MB, animated GIF 15 MB; Threads: "Text posts are limited to 500 characters", "250 published posts within a rolling 24-hour period", carousel 2 to 20 items; Cargo: "maximum of 5 keywords", at most 20 characters; PyCon: "maximum of three proposals, of any type"; KubeCon: "maximum of three proposals ... regardless of the format"; BetaList: about 20 a day, 70,000+ subscribers, 12 months duplicate, 7 days expiry. Skipped, with reason: Product Hunt launch rules pages other than the two WebFetch reads (403 to curl); FTC (404); the X changelog and Buffer statistics (pure numbers, no limit; the Buffer figure is vendor data and is not re-derived).

Verification implication: the live page writes `3000` and `100MB` where the scouts wrote `3,000` and `100 MB`. An `expect` pattern in a facts file must be written as a regex that tolerates both (`3,?000 characters`, `100 ?MB`).

### 5. Exemplars of fact versioning

- endoflife.date: each product is a Markdown file with YAML frontmatter; releases are sorted newest first; dates are UTC and unquoted; approximate dates are allowed; an optional `auto` block refreshes `releaseDate`, `latest` and `latestReleaseDate` from git, Docker Hub, npm, DistroWatch or Maven ([CONTRIBUTING](https://github.com/endoflife-date/endoflife.date/blob/master/CONTRIBUTING.md)). `releasePolicyLink` must be the policy page, "NOT the product URL". The page names no scheduled staleness check and no per-date source link. Measured: `products/nodejs.md` has 134 commits since 2024-01-01 (`gh api 'repos/endoflife-date/endoflife.date/commits?path=products/nodejs.md&since=2024-01-01T00:00:00Z' --paginate`), so the volatile-fact dataset that automates the fetch changes about 4 times a month for a single popular product.
- mdn/browser-compat-data: records release lines, not patch versions ("BCD does not record absolute version numbers") and warns that "Notes are the least structured part of browser compat data and the most likely to become stale"; rule "Write timeless notes" and "Cite your sources" ([data guidelines](https://github.com/mdn/browser-compat-data/blob/main/docs/data-guidelines/README.md)). The schema has `mdn_url`, `spec_url`, `status` and `impl_url` per feature, and `npm test` runs lint plus format plus unit tests (`package.json` scripts `lint`, `test`). Measured: `api/Navigator.json` has 135 commits since 2024-01-01. The lesson for a facts file: separate the value (machine field) from the prose note, put the source on the row, and lint the schema in CI.
- This catalog's own convention. `rules/swift-quality.md` stamps a measured claim "(measured 2026-10-10)" next to the result and keeps the date on a translated form ("a 'measured 2026-10-10' date dates the original form", line 38). `rules/docs-quality.md:26,161` marks a row with no runnable check `unverified: reading heuristic`. On `refresh/2026-11`, 142 commits run 2026-08-13 to 2026-11-27, 14 of them titled "refresh <rules> against upstream changes through 2026-11-27", and one `chore: bump versions of the 63 artifacts the 2026-11 refresh changed` (`git log --oneline refresh/2026-11`, `git log refresh/2026-11 --grep='against upstream changes through' --format=%s | wc -l`). The convention is: the date of the evidence, not the date of the commit, is the stamp; a refresh commit names the evidence horizon; one bump commit versions the changed artifacts. A channel facts file adopts all three.

### 6. Channel inventory and the inbound-link check

Starting point: the posture audit smell 4 and pattern 8 ([distribution-posture.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md)) and the YouTube "Fleet evidence" paragraph ([exemplar-youtube-channels.md:125](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-youtube-channels.md)). Re-run on 2026-11-27.

Command A (all 17 clones, tracked files only; excludes `.agents`, `.claude/artifacts`, lock files, `node_modules`):
`cd /home/mherwig/dev && for r in <17 repos from repos.txt>; do git -C $r grep -nIiE -o 'discord\.(gg|com/invite)/[A-Za-z0-9_-]+|youtube\.com/[@A-Za-z0-9_/?=-]+|youtu\.be/[A-Za-z0-9_-]+|linkedin\.com/(in|company|showcase)/[A-Za-z0-9_%-]+|(x|twitter)\.com/[A-Za-z0-9_]+|bsky\.app/profile/[A-Za-z0-9._-]+|reddit\.com/(r|user)/[A-Za-z0-9_]+|producthunt\.com/[A-Za-z@/_-]+|lobste\.rs/[A-Za-z/_-]+|t\.me/[A-Za-z0-9_]+|matrix\.to/[#!A-Za-z0-9:._-]+' -- . ':!*.lock' ':!*node_modules*' ':!.agents' ':!.claude/artifacts'; done`

Command B (live built sites, standing in for built HTML; the repos hold no committed build output): fetch each URL in `https://ocx.sh/sitemap-0.xml` (with `--resolve ocx.sh:443:37.27.135.61`, because the local resolver holds a stale record, see audit section 5) and `https://grimoire.rs/sitemap-0.xml`, then `grep -l` for `discord.gg/`, `youtube.com/@|youtu.be`, `linkedin.com/company`, `linkedin.com/in/`.

| Handle (inventory candidate) | OCX owned surfaces that link it | Grimoire surfaces | Result |
|---|---|---|---|
| Discord `discord.gg/mT2UCF8CVe` | `ocx-sh/ocx/README.md:12,71,86` (badge, list item, reference definition), `ocx-sh/ocx/website/astro.config.mjs:47`, `ocx-sh/website/packages/theme/src/nav.json:227`, `ocx-sh/website/site/src/content/docs/team/index.mdx:40`; the live ocx.sh serves it on 4 of 4 sitemap-0 pages | `grimoire-rs/grimoire` has one file containing the word "discord", a research note (`.agents/research/research_promotion_positioning.md:371`), no link; live grimoire.rs 0 of 48 pages | OCX linked in 4 owned sources; Grimoire 0 |
| YouTube `@ocx-sh` (id `UCKuRD68HkNpla-vY6-YBTHg`) | 0 | 0 | 0 of 17 repositories (`git grep -lIiE 'youtube\.com/@\|youtu\.be\|UCKuRD68'` per repo prints nothing for any), 0 of 4 + 48 crawled pages |
| LinkedIn personal `/in/herwigm`, `/in/katherine-draheim` | `ocx-sh/website/.../team/index.mdx:27,33`; live ocx.sh 1 of 4 pages | 0 | personal profiles only; no `linkedin.com/company/` link anywhere (0 of 52 pages) |
| GitHub orgs `ocx-sh`, `grimoire-rs` | every README and site | | linked; org profile has 6 and 0 followers, no description, no profile README (audit section 4) |

Noise that a check must exclude: `ocx-sh/website` returns 33 raw Discord hits, of which 26 are `packages/theme/test/fixtures/nav-invalid/*.json` copies of the nav file; `ocx-sh/catalog` and `ocx-sh/grimoire-lore` each hit once in a test file and in `publish.toml`. Counting raw hits would report Discord as present on 41 sources for OCX. The honest count of owned surfaces is 4 repository sources plus the built site.

Note that the sitemap for ocx.sh lists only 4 URLs (`sitemap-0.xml` has 4 `<loc>`), against the audit's 298 section pages. The audit already records this (robots.txt reaches 4 of 298 URLs). Command B therefore sees 4 of 298 pages on ocx.sh; the 298 need the section sitemap indexes. This is a limit of the live check, and a reason the check should also read the repository sources.

Ownership problem the schema must carry. The audit infers the YouTube channel is the project's from three facts (handle equals org name, upload date equals release date, a private `marketing` repository) and calls it "inferred, not proven". LinkedIn and X cannot be probed unauthenticated (LinkedIn returns 403 or non-standard 999; the audit cites [LinkedIn Help, prohibited software](https://www.linkedin.com/help/linkedin/answer/a1341387)). A handle resolver also misled: "A naive scrape returned the wrong channel for 9 of the first 29 handles" (exemplar-youtube-channels.md smell 1). So an inventory row records how its ownership was established.

### 7. Decisions

**Facts-file schema.** One markdown table per platform in a shared reference, `channel-facts/<platform>.md`, referenced by id from every channel skill; not per skill. Reason: LinkedIn limits are used by organic, ads, company-page and short-video skills (the scouts list the same video and document limits in four files), and a per-skill copy gives four verified dates for one fact. Columns:

| Column | Content |
|---|---|
| `id` | `LI-F001` style, stable, never reused |
| `fact` | one sentence, no value |
| `value` | the machine-comparable value with unit (`3000 characters`) |
| `url` | the exact page read, no fragment unless the fact is under one |
| `source_date` | the date the page states, absolute, or `relative:2 years ago@2026-11-27`, or `none` |
| `verified` | the agent's fetch date, `YYYY-MM-DD` |
| `refresh_days` | integer from the cadence table above |
| `provenance` | `platform`, `authority`, `independent`, `vendor` |
| `expect` | regex that must match the live page text, tolerant of `3000` and `3,000` |

Location of ownership: facts live in the catalog, because facts are not organisation-specific; the inventory lives in the organisation.

**Refresh cadence.** 180 days for hard limits, 90 days for policy, behaviour, third-party statistics and API fields, expiry at the event date for time-bound facts (cadence table, finding 2).

**Staleness check that fails CI.** `verified + refresh_days < today` fails with exit 1 and prints id and days overdue; a second, non-blocking weekly job re-fetches `url` and fails an id whose `expect` no longer matches (opens an issue, does not block merges), because a page changed under a valid date is the real failure. A check on `source_date` alone is not possible for LinkedIn and YouTube (finding 3).

**Channel inventory schema and location.** `channels.yml` at the root of the organisation's website repository, path declared in that repository's agent-instructions file so a skill resolves it; one file per organisation. Per row:

| Field | Content |
|---|---|
| `id` | `yt-ocx` |
| `platform` | `discord`, `youtube`, `linkedin-company`, `linkedin-person`, `x`, `bluesky`, `github-org`, `npm`, ... |
| `handle` | exactly as the platform writes it (`@ocx-sh`) |
| `url` | canonical https URL (Discord invite includes the code) |
| `status` | `active`, `planned`, `retired`, `squatted` (a handle held by someone else) |
| `ownership` | `proven` (login or platform-verified link) or `inferred`, with `verified_by` text |
| `owner_role` | a role, not a person (`marketing-lead`) |
| `last_checked` | `YYYY-MM-DD`, the date the URL resolved to the right entity |
| `linked_from` | list of owned surfaces that must carry the link |

**Inbound-link check and pass condition.** Run on the organisation's checkout plus the built site.
1. Forward: for every row with `status: active` and a non-empty `linked_from`, each listed file contains the row's `url` after normalisation (lowercase host, strip trailing slash, resolve reference-style definitions `^\[[^]]+\]:\s*URL`). A missing link fails.
2. Reverse: every URL on a channel host (list in the facts registry: discord.gg, youtube.com/@, youtu.be, linkedin.com/(in|company), x.com, bsky.app, ...) found in owned sources must match a row (any status except `squatted`); an unmatched handle fails. Excluded paths: `.agents`, `.claude/artifacts`, `**/test/**`, `**/fixtures/**`, lock files, `node_modules`.
3. Staleness: `last_checked` older than 90 days warns, older than 180 days fails.
4. `status: retired` rows must have zero links; `planned` rows must have zero links (an invented handle on a site is the failure this prevents).
Pass: all four hold. On the fleet today the check fails twice: YouTube has a live channel and no row or link, and Grimoire has no Discord row but also links none, which passes only because the inventory would list it as `planned: none`.

## Normative guidance candidates

1. **Severity:** MUST. **Rule:** Do not write a platform limit, format spec or policy into a draft, post, README or skill from memory; read it from a row in `channel-facts/<platform>.md`. **Rationale:** platform figures moved in the last 24 months and training data predates some. **VERIFY:** `grep -En '[0-9][0-9,]* (characters|MB|GB|minutes|seconds|pixels|hashtags|topics)' <draft>`, and for each hit the matching number must appear in a facts row; no row means add a row first.
2. **Severity:** MUST. **Rule:** give every fact row the columns `id, fact, value, url, source_date, verified, refresh_days, provenance, expect`. **Rationale:** a fact without a date or label cannot be aged or weighed. **VERIFY:** `awk -F'|' '/^\| [A-Z]+-F[0-9]+/ && NF<10' references/*.md` prints nothing.
3. **Severity:** MUST. **Rule:** set `verified` to the date the agent fetched the page, not the page's own date. **Rationale:** 28 of 28 LinkedIn help pages and Product Hunt help show only a relative age and YouTube Help shows none (finding 3). **VERIFY:** `source_date` is `relative:...@YYYY-MM-DD` or `none` for those hosts; a row copying "2 years ago" into `verified` fails.
4. **Severity:** MUST. **Rule:** fail CI when `verified + refresh_days < today` for any row. **Rationale:** facts decay silently; a date nobody tests is a comment. **VERIFY:** `python3 -I scripts/facts-stale.py channel-facts/*.md` exits 1 and lists ids over due (script to be authored with the rule; a planted row with `verified: 2025-01-01` must exit 1, a fresh one 0).
5. **Severity:** MUST. **Rule:** use 180 refresh days for hard limits and 90 for policy, behaviour, statistics and API fields. **Rationale:** GitHub Docs limit lines changed once per about 25 page-months; non-limit edits come about every 40.5 days (finding 2). **VERIFY:** `refresh_days` in {90, 180} except time-bound rows, which carry an `expires` date instead.
6. **Severity:** MUST. **Rule:** write `expect` as a regex tolerant of numeral formatting and re-fetch the live page weekly, opening an issue on mismatch. **Rationale:** LinkedIn serves `3000` and `100MB` where scouts wrote `3,000` and `100 MB`; a failed match on a valid date is the real staleness signal. **VERIFY:** `curl -sL --compressed <url> | sed 's/<[^>]*>/ /g' | grep -Eq "<expect>"` exits 0 for every row.
7. **Severity:** MUST. **Rule:** Do not use Wayback CDX counts or capture dates as evidence that a fact is current or to set a cadence. **Rationale:** digest counts overcount edits 20 to 40 times on docs.github.com and later LinkedIn captures are empty JS shells (finding 2). **VERIFY:** grep the facts file and skill text for `web.archive.org` used as a `url` of a fact (allowed only in a `history` note).
8. **Severity:** MUST. **Rule:** label each fact `platform`, `authority`, `independent` or `vendor`, and MUST NOT turn a `vendor` or `independent` statistic into a MUST rule or a numeric threshold in a lint. **Rationale:** Sprout, Buffer and similar figures are not platform limits. **VERIFY:** every lint threshold in a channel skill cites an id with `provenance: platform|authority`.
9. **Severity:** SHOULD. **Rule:** stamp measured claims in skills "(measured YYYY-MM-DD)" and name the evidence horizon in refresh commits ("refresh <skills> against upstream changes through YYYY-MM-DD"). **Rationale:** the catalog's convention on `rules/swift-quality.md` and `refresh/2026-11` (finding 5). **VERIFY:** `git log --format=%s | grep -c 'against upstream changes through'`, and `grep -c 'measured 20' <rule>`.
10. **Severity:** MUST. **Rule:** keep one `channels.yml` per organisation with the fields listed in finding 7. **Rationale:** an agent writing a README or release note links channels that exist and never invents a handle (audit pattern 8). **VERIFY:** `python3 -I scripts/channels-lint.py channels.yml` validates required keys, `status` and `ownership` enums and absolute `last_checked`.
11. **Severity:** MUST. **Rule:** run the four-part inbound-link check (finding 7) before a README, site nav or footer that lists channels is merged, and treat the inventory, not the agent's memory or a search result, as the list of channels. **Rationale:** YouTube channel linked from 0 of 17 repositories; Discord on 4 OCX surfaces and 0 Grimoire (audit smell 4). **VERIFY:** `git grep -nIiE '<channel-host-regex>' -- . ':!.agents' ':!**/test/**' ':!**/fixtures/**'` against the rows; every hit maps to a row and every active row's `linked_from` file matches.
12. **Severity:** MUST. **Rule:** resolve reference-style Markdown links when checking for a channel link. **Rationale:** `ocx-sh/ocx/README.md:86` defines the Discord URL as `[discord]: https://discord.gg/...` and a grep for `](https://discord` misses it. **VERIFY:** `grep -En '^\[[^]]+\]: *https?://' README.md` is part of the same check.
13. **Severity:** MUST. **Rule:** Do not list a handle with `ownership: inferred` as active in a public link until a human has recorded `verified_by`. **Rationale:** a handle resolver returned the wrong channel for 9 of the first 29 handles, and a squatted `@flyio` exists. **VERIFY:** no row has `ownership: inferred` and a non-empty `linked_from`.
14. **Severity:** SHOULD. **Rule:** treat a 403, 999 or login wall from an unauthenticated probe as "not provable", never as absence. **Rationale:** LinkedIn returns 403 to curl for pages that exist, the FTC page returned 404 then 403, Product Hunt help returns 403 to curl. **VERIFY:** the row records `ownership: inferred` and `verified_by: not probed`; no `status: retired` solely from an HTTP code.

## Dated facts

| Fact | Source URL | Date the source states | Source type |
|---|---|---|---|
| LinkedIn post text up to 3000 characters (as written live) | https://www.linkedin.com/help/linkedin/answer/a528176 | "Last updated: 2 months ago" (read 2026-11-27) | platform |
| LinkedIn link-post preview 1.91:1, 1200 x 627 | https://www.linkedin.com/help/linkedin/answer/a525301 | "Last updated: 2 years ago" | platform |
| LinkedIn document post 100MB, 300 pages | https://www.linkedin.com/help/linkedin/answer/a518909 | "Last updated: 3 years ago" | platform |
| LinkedIn image post 20 images, 5 MB each | https://www.linkedin.com/help/linkedin/answer/a527229 | "Last updated: 1 day ago" | platform |
| LinkedIn video 15 minutes, 5 GB | https://www.linkedin.com/help/linkedin/answer/a7174587 | "Last updated: 2 years ago" | platform |
| LinkedIn poll question 140, option 30 characters | https://www.linkedin.com/help/linkedin/answer/a527270 | "Last updated: 1 year ago" (read 2026-11-27) | platform |
| GitHub topics: 20 per repository, 50 characters each | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | no date on page; 11 commits since 2024-01-01, last 2026-03-12 | platform |
| GitHub social preview 1280 x 640, under 1 MB | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview | no date on page; 7 commits, last 2026-03-12 | platform |
| GitHub Docs attaching-files: 20 commits since 2024-01-01, last 2026-11-04 | https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files | commit history (GitHub API) | platform |
| Product Hunt launch live 12:01 AM Pacific, schedule 1 to 30 days ahead | https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date | "Updated over 3 weeks ago" | platform |
| Google Search "consolidate duplicate URLs" | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | Last updated 2026-07-10 UTC | authority |
| dev.to terms | https://dev.to/terms | November 21, 2024 | platform |
| Slack acceptable use policy | https://slack.com/acceptable-use-policy | July 8, 2025 | platform |
| Wayback CDX: `collapse=digest` collapses adjacent equal digests only; `from`/`to` inclusive | https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server | undated README | authority |
| endoflife.date: dates UTC, `auto` block, `releasePolicyLink` | https://github.com/endoflife-date/endoflife.date/blob/master/CONTRIBUTING.md | undated; repo active 2026 | authority |
| BCD: notes "most likely to become stale"; write timeless notes; cite sources | https://github.com/mdn/browser-compat-data/blob/main/docs/data-guidelines/README.md | undated; repo active 2026 | authority |
| endoflife.date `nodejs.md` 134 commits since 2024-01-01; BCD `api/Navigator.json` 135 | `gh api repos/endoflife-date/endoflife.date/commits?path=products/nodejs.md`, `repos/mdn/browser-compat-data/commits?path=api/Navigator.json` | measured 2026-11-27 | independent (repo history) |
| LinkedIn Help page ages: median 165 days, 8 of 28 over 365 days | https://www.linkedin.com/help/linkedin/answer/a564109 and 27 others | relative markers read 2026-11-27 | platform |
| Discord invite `mT2UCF8CVe`: name `ocx`, 5 members, no expiry | https://discord.com/api/v9/invites/mT2UCF8CVe?with_counts=true | live 2026-11-27 | platform |
| YouTube `@ocx-sh` feed: 2 videos, 2026-11-17, 7 views for "Pin Node.js in the repo" and 12 for "Dino Edition" | https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg | live 2026-11-27 | platform |
| FOSDEM 2027: devroom proposals deadline 4 October 2026 (past), stands deadline 31 October 2026, event 30 and 31 January 2027 | https://fosdem.org/2027/calendar/ | absolute dates listed on the page, read 2026-11-27 | platform (event organiser) |
| Google Search publication dates | https://developers.google.com/search/docs/appearance/publication-dates | Last updated 2025-12-10 UTC | authority |
| X post text at most 280 characters unless X Premium; poll 2 to 4 options of 1 to 25 characters | https://docs.x.com/x-api/posts/create-or-edit-post | no date on page; read 2026-11-27 | platform |
| X media: image 5 MB, animated GIF 15 MB | https://docs.x.com/x-api/media/introduction | no date on page; read 2026-11-27 | platform |
| Threads text 500 characters; 250 published posts per rolling 24 hours; carousel 2 to 20 items | https://developers.facebook.com/docs/threads/posts | no date on page; read 2026-11-27 | platform |
| Cargo: at most 5 keywords of at most 20 characters | https://doc.rust-lang.org/cargo/reference/manifest.html | no date on page; read 2026-11-27 | platform |
| PyCon US 2026: at most three proposals of any type | https://us.pycon.org/2026/speaking/guidelines/ | no date on page; read 2026-11-27 | platform (event organiser) |
| KubeCon NA CFP: at most three proposals regardless of format | https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/cfp/ | no date on page; read 2026-11-27 | platform (event organiser) |
| Product Hunt: paying for upvotes can remove a launch and ban the account | https://help.producthunt.com/en/articles/17734306-1-how-product-hunt-works | "Updated over 3 weeks ago" (WebFetch 2026-11-27) | platform |
| Zoom webinar statistics (live attendance 49%) | https://www.zoom.com/en/blog/webinar-statistics/ | October 16, 2025 | vendor data |
| Buffer posting-frequency study | https://buffer.com/resources/how-often-to-post-on-linkedin/ | 28 Aug 2025 (scout); not re-derived | vendor data |
| TechSmith video statistics | https://www.techsmith.com/blog/video-statistics/ | December 2025 (scout); numerals matched on the live page | vendor data |
| Remaining 60 sampled pages: URL, HTTP status, date marker and numeric match per page | Appendix A | read 2026-11-27 | as labelled in the scout tables |
| Refresh branch: 142 commits, 14 "against upstream changes through 2026-11-27" | `git log refresh/2026-11` in the catalog | 2026-08-13 to 2026-11-27 | independent (this repo) |

## What an agent must not decide alone

- Which channels the organisation opens (a LinkedIn company page, a Bluesky account, a podcast). Opening an account is a brand, staffing and moderation commitment. Ask; record the answer as `planned` or `retired`.
- Who owns a channel (`owner_role`) and who holds its credentials. Ask.
- Whether an `inferred` handle is the organisation's. A human checks logged in and records `verified_by`.
- Whether to claim a squatted handle, report it, or choose another name. Brand and legal; ask.
- Changing a published vanity URL, Discord invite or channel handle on live surfaces. Links in published releases cannot be recalled; ask.
- Whether a fact class moves from 90 to 180 days or a vendor statistic is promoted to a rule. The catalog owner decides; an agent may propose it.
- Dropping a channel from the inventory because an unauthenticated probe failed (403, 999). Ask.

## AI-agent angle

| Characteristic mistake | Smallest mechanical check |
|---|---|
| Writes a platform limit from training data instead of the registry (the live LinkedIn post limit is 3,000 characters per [a528176](https://www.linkedin.com/help/linkedin/answer/a528176), read 2026-11-27, page dated "2 months ago"; an agent quoting any other figure is wrong or stale) | Candidate 1: every number with a platform unit in a draft must appear in a facts row |
| Treats a page's "Last updated: 2 years ago" as a verified date | Candidate 3: `verified` equals the fetch date; relative text goes only in `source_date` |
| Invents a handle by pattern (`@ocx`, `ocx.sh` on Bluesky) for a README link | Candidate 11 reverse check: every channel URL must match an inventory row |
| Reads an unauthenticated 403 as "account absent" and removes a link | Candidate 14: probe failure is `not provable` |
| Links the Discord invite from one repo and misses the sibling org (4 OCX, 0 Grimoire) | Forward check over `linked_from` per organisation |
| Writes a regex for a limit that fails on `3000` versus `3,000` | Candidate 6: `expect` accepts both; test it against the live page |
| Uses a Wayback capture date as the date a fact was true | Candidate 7 |
| Cites a vendor study (Buffer, Sprout, Socialinsider) as a limit | Candidate 8 |

## Contested / evolving

- Whether CDX is a usable proxy for page change. The brief and general practice treat capture counts as a lower bound. Measured here: it is an upper bound on server-rendered pages with changing chrome (docs.github.com) and unusable on JS-rendered pages, because later captures are empty. Position of this artifact: use live re-fetch with `expect`; CDX only for "when did we first see this value" on stable HTML. The CDX docs themselves do not claim a capture is a change ([docs](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)).
- One shared facts registry versus facts inside each skill. endoflife.date and BCD both centralise facts and let consumers read them, which supports a shared registry; the cost is that a skill cannot be read offline without the reference. Chosen: shared registry, and a skill lists the ids it depends on.
- Cadence length. The 90 and 180 day values are derived from one repository's edit history (GitHub Docs) and LinkedIn page ages; LinkedIn, YouTube and X may change faster than their help pages are edited, since a policy change can appear first in a blog or changelog (X keeps a [changelog](https://docs.x.com/changelog)). The cadence is a starting value to revise after two refresh cycles of the registry, not a settled figure.
- Whether the YouTube-per-video attribution in the posture audit (12 views for the first video, 7 for the second) or today's feed (7 for "Pin Node.js in the repo", 12 for "Dino Edition") is right. Views are live counters, and both sum to 19; the facts file should not store view counts.
- Where the inventory lives. A `.github` organisation repository is the platform-native place for organisation-wide files, but neither org has one (audit: `gh api repos/<org>/.github/contents/profile/README.md` returns 404 for both), so the file sits with the website repository for now.

## Appendix A. Sample list and re-fetch result

All 81 pages, fetched 2026-11-27 with `curl -sL --compressed -m 40 -A 'Mozilla/5.0 research' <url>`. "Date marker" is the page's own marker; "rel" is a relative age as shown. "Numeric tokens matched" counts numerals with units from the scout fact text found in the live text after normalising commas and spaces; a miss was checked by hand (see finding 4) and in every checked case is a wording difference, not a changed value.

| # | Scout | Page | HTTP | Date marker on the page | Numeric tokens matched |
|---|---|---|---|---|---|
| 1 | audio-events | https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/cfp/ | 200 | none | 1 of 2 |
| 2 | audio-events | https://us.pycon.org/2026/speaking/guidelines/ | 200 | none | 1 of 3 |
| 3 | audio-events | https://fosdem.org/2027/calendar/ | 200 | none | 4 of 5 |
| 4 | audio-events | https://events.linuxfoundation.org/about/code-of-conduct/ | 200 | none | no numeric fact |
| 5 | audio-events | https://www.w3.org/WAI/teach-advocate/accessible-presentations/ | 200 | none | no numeric fact |
| 6 | audio-events | https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | 404 | not read (404) | no numeric fact |
| 7 | audio-events | https://support.google.com/youtube/answer/9884579 | 200 | none | 3 of 3 |
| 8 | audio-events | https://support.google.com/youtube/answer/2734796 | 200 | none | no numeric fact |
| 9 | audio-events | https://support.google.com/youtube/answer/13525207 | 200 | none | no numeric fact |
| 10 | audio-events | https://support.google.com/youtube/answer/6013276 | 200 | none | 0 of 1 |
| 11 | audio-events | https://podnews.net/update/youtube-views-change | 200 | none | 2 of 2 |
| 12 | audio-events | https://www.zoom.com/en/blog/webinar-statistics/ | 200 | abs: October 16, 2025 | 5 of 5 |
| 13 | audio-events | https://support.google.com/analytics/answer/10917952 | 200 | none | no numeric fact |
| 14 | communities | https://news.ycombinator.com/newsguidelines.html | 200 | none | no numeric fact |
| 15 | communities | https://news.ycombinator.com/showhn.html | 200 | none | no numeric fact |
| 16 | communities | https://dev.to/terms | 200 | abs: November 21, 2024 | no numeric fact |
| 17 | communities | https://slack.com/acceptable-use-policy | 200 | abs: July 8, 2025 | no numeric fact |
| 18 | communities | https://github.com/orbit-love/orbit-model | 200 | none | no numeric fact |
| 19 | github-as-channel | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | 200 | none | 2 of 2 |
| 20 | github-as-channel | https://docs.github.com/en/rest/repos/repos | 200 | none | no numeric fact |
| 21 | github-as-channel | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview | 200 | none | 4 of 4 |
| 22 | github-as-channel | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes | 200 | none | 1 of 1 |
| 23 | github-as-channel | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme | 200 | none | no numeric fact |
| 24 | github-as-channel | https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile | 200 | none | no numeric fact |
| 25 | github-as-channel | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/pinning-items-to-your-profile | 200 | none | no numeric fact |
| 26 | github-as-channel | https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases | 200 | none | 2 of 2 |
| 27 | github-as-channel | https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases | 200 | none | no numeric fact |
| 28 | github-as-channel | https://github.com/trending | 200 | none | no numeric fact |
| 29 | github-as-channel | https://github.blog/changelog/ | 200 | none | 3 of 3 |
| 30 | github-as-channel | https://doc.rust-lang.org/cargo/reference/manifest.html | 200 | none | 2 of 4 |
| 31 | github-as-channel | https://docs.brew.sh/Package-Acceptance-Policy | 200 | none | 5 of 5 |
| 32 | launch-platforms | https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date | 403 | rel (WebFetch): "Updated over 3 weeks ago" | 0 of 2 |
| 33 | launch-platforms | https://help.producthunt.com/en/articles/17734306-1-how-product-hunt-works | 403 | rel (WebFetch): "Updated over 3 weeks ago" | no numeric fact |
| 34 | launch-platforms | https://help.producthunt.com/en/articles/17734341-2-what-kind-of-products-get-featured | 403 | not read | no numeric fact |
| 35 | launch-platforms | https://betalist.com/agent | 200 | none | 3 of 4 |
| 36 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a426534 | 200 | rel: 4 months ago | 7 of 7 |
| 37 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a424737 | 200 | rel: 4 months ago | 11 of 12 |
| 38 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a427022 | 200 | rel: 1 year ago | 4 of 6 |
| 39 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a493903 | 200 | rel: 1 year ago | 6 of 7 |
| 40 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a426057 | 200 | rel: 3 weeks ago | 4 of 4 |
| 41 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a425533 | 200 | rel: 3 weeks ago | 5 of 5 |
| 42 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a420236 | 200 | rel: 4 months ago | 4 of 6 |
| 43 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a459550 | 200 | rel: 3 weeks ago | 3 of 3 |
| 44 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a423364 | 200 | rel: 3 months ago | 7 of 8 |
| 45 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a421181 | 200 | rel: 3 months ago | no numeric fact |
| 46 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a420012 | 200 | rel: 11 months ago | 2 of 2 |
| 47 | linkedin-ads | https://www.linkedin.com/help/lms/answer/a6282198 | 200 | rel: 2 months ago | 11 of 11 |
| 48 | linkedin-ads | https://learn.microsoft.com/en-us/linkedin/marketing/integrations/conversions/deduplication | 200 | abs: 2025-08-29 | no numeric fact |
| 49 | linkedin-organic | https://members.linkedin.com/create-optimize | 200 | none | 1 of 1 |
| 50 | linkedin-organic | https://buffer.com/resources/how-often-to-post-on-linkedin/ | 200 | none | 6 of 6 |
| 51 | microblog | https://docs.x.com/changelog | 200 | none | no numeric fact |
| 52 | microblog | https://docs.x.com/x-api/media/introduction | 200 | none | 2 of 2 |
| 53 | microblog | https://docs.x.com/x-api/posts/create-or-edit-post | 200 | none | 2 of 4 |
| 54 | microblog | https://bsky.social/about/blog/06-26-2024-starter-packs | 200 | none | 1 of 1 |
| 55 | microblog | https://bsky.social/about/blog/04-21-2025-verification | 200 | none | 1 of 1 |
| 56 | microblog | https://developers.facebook.com/docs/threads/posts | 200 | none | 1 of 4 |
| 57 | owned-publishing | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | 200 | abs: 2026-07-10 | no numeric fact |
| 58 | owned-publishing | https://developers.google.com/search/docs/appearance/publication-dates | 200 | abs: 2025-12-10 | no numeric fact |
| 59 | owned-publishing | https://www.rssboard.org/rss-profile | 200 | none | 1 of 1 |
| 60 | video-production-software | https://support.google.com/youtube/answer/14328491 | 200 | none | no numeric fact |
| 61 | video-production-software | https://support.google.com/youtube/answer/2734698 | 200 | none | no numeric fact |
| 62 | video-production-software | https://support.google.com/youtube/answer/1722171 | 200 | none | 9 of 9 |
| 63 | video-production-software | https://support.google.com/youtube/answer/6375112 | 200 | none | 1 of 1 |
| 64 | video-production-software | https://www.techsmith.com/blog/video-statistics/ | 200 | none | 5 of 5 |
| 65 | youtube-packaging-retention | https://blog.youtube/creator-and-artist-stories/renes-top-five-june-14-2024/ | 200 | none | no numeric fact |
| 66 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a528176 | 200 | rel: 2 months ago | 1 of 1 |
| 67 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a525301 | 200 | rel: 2 years ago | 4 of 4 |
| 68 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a518909 | 200 | rel: 3 years ago | 2 of 2 |
| 69 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a523054 | 200 | rel: 3 years ago | no numeric fact |
| 70 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a564109 | 200 | rel: 2 months ago | 2 of 2 |
| 71 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a527229 | 200 | rel: 1 day ago | 5 of 5 |
| 72 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a7174587 | 200 | rel: 2 years ago | 13 of 13 |
| 73 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a554001 | 200 | rel: 2 years ago | no numeric fact |
| 74 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a10728043 | 200 | rel: 7 months ago | no numeric fact |
| 75 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a1327025 | 200 | rel: 2 years ago | no numeric fact |
| 76 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a519856 | 200 | rel: 3 years ago | no numeric fact |
| 77 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a527270 | 200 | rel: 1 year ago | 2 of 2 |
| 78 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a1347212 | 200 | rel: 2 months ago | 2 of 2 |
| 79 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a525082 | 200 | rel: 2 years ago | no numeric fact |
| 80 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a16666203 | 200 | rel: 1 month ago | no numeric fact |
| 81 | linkedin-organic | https://www.linkedin.com/help/linkedin/answer/a523384 | 200 | rel: 1 year ago | no numeric fact |

## Sources

Fetched or queried on 2026-11-27.

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server | Wayback CDX server API docs (primary) | undated, current | Defines `collapse=digest`, `from`, `filter`, `output=json`; does not equate captures with changes |
| https://github.com/endoflife-date/endoflife.date/blob/master/CONTRIBUTING.md | endoflife.date contribution rules (primary, fact-versioning exemplar) | current 2026 | `auto` refresh block, UTC dates, policy link vs product link |
| https://github.com/mdn/browser-compat-data/blob/main/docs/data-guidelines/README.md | BCD data guidelines (primary, exemplar) | current 2026 | Notes go stale; timeless notes; cite sources |
| https://github.com/mdn/browser-compat-data/blob/main/schemas/compat-data.schema.json | BCD schema (primary) | current 2026 | `mdn_url`, `spec_url`, `status` fields per entry |
| https://docs.github.com/en/rest/commits/commits | GitHub REST commits API (primary) | current | `path`, `since`, pagination used for edit counts |
| https://github.com/github/docs | github/docs repository; commit history of 20 content files via the API (primary, independent history) | 2024-01-01 to 2026-11-27 | Exact edit history for GitHub Docs pages |
| https://www.linkedin.com/help/linkedin/answer/a528176 | LinkedIn post length (primary) | "2 months ago" | Priority platform; relative-only date |
| https://www.linkedin.com/help/linkedin/answer/a525301 | LinkedIn link post and preview (primary) | "2 years ago" | Re-fetched; numeral formatting differs from scouts |
| https://www.linkedin.com/help/linkedin/answer/a518909 | LinkedIn document posts (primary) | "3 years ago" | Oldest-aged limit page sampled |
| https://www.linkedin.com/help/linkedin/answer/a527229 | LinkedIn image posts (primary) | "1 day ago" | Shows a fresh edit on the same limit family |
| https://www.linkedin.com/help/linkedin/answer/a7174587 | LinkedIn video limits (primary) | "2 years ago" | Priority platform video limits |
| https://www.linkedin.com/help/linkedin/answer/a527270 | LinkedIn polls (primary) | relative | Re-fetched |
| https://www.linkedin.com/help/linkedin/answer/a1341387 | LinkedIn prohibited software (primary) | current | Why unauthenticated probes cannot prove absence |
| https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date | Product Hunt launch scheduling (primary) | "Updated over 3 weeks ago" | Relative date; 403 to curl |
| https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | Google Search docs (primary) | Last updated 2026-07-10 UTC | Example of an absolute page date |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | GitHub topics limits (primary) | commits to 2026-03-12 | Re-fetched numeric facts |
| https://news.ycombinator.com/newsguidelines.html | Hacker News guidelines (primary) | undated | Page has no date |
| https://docs.x.com/changelog | X API changelog (primary) | 2025-02-14 to 2026-11-09 captures | A dated feed beside undated reference pages |
| https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg | YouTube channel feed (primary) | live | Re-fetched fleet channel |
| https://discord.com/api/v9/invites/mT2UCF8CVe?with_counts=true | Discord invite API (primary) | live | Re-fetched fleet invite |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/distribution-posture.md | Grounding audit of the fleet (this catalog) | 2026-11-27 | Smell 4, pattern 8, section 4 channel table |
| /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/exemplar-youtube-channels.md | YouTube exemplar audit with fleet evidence grep | 2026-11-27 | Handle-resolution smell, fleet greenfield |
| https://dev.to/terms and https://slack.com/acceptable-use-policy | Platform policies with absolute dates | 2024-11-21, 2025-07-08 | Counter-examples to relative-only dating |
| https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers | FTC guidance named by a scout | 403 today | Not re-verified; bot-blocked |
| https://fosdem.org/2027/calendar/ and https://fosdem.org/2027/news/ | FOSDEM key dates and news (primary, event organiser) | dated entries, read 2026-11-27 | Source for the time-bound deadline row |
| https://developers.google.com/search/docs/appearance/publication-dates | Google Search docs (primary) | Last updated 2025-12-10 UTC | Absolute-date example |
| Appendix A pages (81) | Every sampled page, re-fetched | 2026-11-27 | Full re-fetch record |
| https://web.archive.org/cdx/search/cdx | Wayback CDX endpoint (queried 81 times) | 2024 to 2026-11 captures | The measurement itself |
| `rules/swift-quality.md`, `rules/docs-quality.md`, `git log refresh/2026-11` in this catalog | Catalog conventions | 2026-08 to 2026-11 | "measured <date>", `unverified:` markers, refresh commit naming |

Cross-territory (one line each): which platform-native labels (AI disclosure, paid partnership) each channel requires belongs to the sibling label workers and marketing law; the per-skill list of facts a LinkedIn or YouTube skill must carry belongs to those skills' own workers.

---
title: Launch shape evidence - what changelogs and launch-week pages measure
program: product
sub_program: channels
topic: channel-launch
worker: launch-shape-evidence
date_researched: 2026-11-27
model: sonnet
sources_fetched: 42
scope: Launch week vs launch day vs rolling cadence for developer tools, and the order of venues across a launch, limited to what dated changelogs, feeds, release tags and launch-week pages can measure. Venue eligibility and link-target gates (HN, Reddit, Product Hunt rules) belong to sibling workers. First-user acquisition tactics are out of scope by commission. Scratch data lives in ~/.cache/research-lang/exemplars/product/launch/.
---

# Launch shape evidence

## Table of contents
1. Summary
2. Findings (1 scout re-run, 2 cadence, 3 clustering, 4 three launch weeks, 5 venue order, 6 opinion sources)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Measurement log (every command)
9. Sources

## Summary
- The scout figure reproduces: Linear's 10 changelog dates from 30 Jul to 12 Nov 2026 give gaps 14, 7, 14, 11, 10, 14, 14, 14, 7 days, mean 11.67. Over the full 24 months the same feed gives 64 gaps, mean 11.05, median 7.5, p90 16, max 36. The 11.67 figure is a 3.5-month subset; quote the 24-month numbers.
- Across six sources with complete 24-month data (Linear, Supabase changelog, Zed stable, Deno, uv, Bun) the median gap between dated entries is 2 to 12 days and p90 is 7 to 23 days. Largest single gap is 13 to 99 days, and only Bun exceeds 41.
- None of the four product changelog feeds (Linear, Raycast, Vercel, Supabase changelog) contains the phrase "launch week". Only Supabase runs announced launch weeks among the sources measured.
- Supabase launch weeks cluster in the blog, not the changelog. Blog posts per Monday-week: 10, 10, 13 in LW13/14/15 against a non-launch median of 1 (104-week window, permutation p = 0.0). Changelog entries per launch week: 1, 1, 2 against a non-launch mean 1.25 (permutation p = 0.44, no clustering).
- For all 15 main-stage daily headlines of Supabase LW13, LW14 and LW15, there is a dated written post and an embedded YouTube video on the post. None has a same-week changelog entry for the headline itself. The canonical record at Supabase is the blog post.
- Across 24 months only about 5 of 147 Supabase blog posts have a matching changelog entry within 14 days (title-token heuristic, noisy). Pairing every headline with a changelog entry is a cheap rule for a small team but is not what the benchmark company does.
- The launch-week format needs about 10 dated posts in one week at Supabase scale. A small fleet cannot sustain that, and no source measures that smaller weeks work.
- Supabase's own shape moved after LW15 (Jul 2025): an unnamed 8-post cluster 1-5 Dec 2025, then a conference day (Select, 2 Oct 2026) with follow-up posts through 30 Oct 2026. The launch-week page still shows LW15 as latest on 2026-11-27.
- No source gives conversion, pipeline or retention evidence that a launch week beats a rolling cadence. Every pro-launch-week source is anecdotal or from a vendor selling the approach.
- Default for a small fleet: rolling cadence, one dated changelog entry per user-visible release, a launch post only for items worth a headline. Do not plan a launch week unless at least five separately announceable items are ready and a post for each can ship the same week.
- Venue order that two public records support: own-domain canonical post (and changelog entry) first, then social posts that link back to it, then a recap. Order of community venues (HN, Product Hunt) is not measurable from changelogs and is left to the sibling workers.

## Findings

### 1. Scout re-run (Linear gap, mean 11.67)
The scout's figure reproduces exactly for its window. Source: [Linear changelog feed](https://linear.app/rss/changelog.xml) (RSS, last build 27 Nov 2026, 255 items back to 12 Apr 2019; fetched 2026-11-27). Dates 30 Jul, 13 Aug, 20 Aug, 3 Sep, 14 Sep, 24 Sep, 8 Oct, 22 Oct, 5 Nov, 12 Nov 2026. Gaps [14, 7, 14, 11, 10, 14, 14, 14, 7], mean 11.666. Command in section 8.

Two corrections to how the scout used it. The window covers 10 entries, so it says little about a stable cadence. Over 27 Nov 2024 to 27 Nov 2026 the distribution is wider (median 7.5, max 36), so "gaps of 7 to 14 days" holds only for the recent window. The feed's newest entry is 12 Nov 2026, so the current open gap is 15 days at fetch time.

### 2. Cadence over 24 months (window 2024-11-27 to 2026-11-27)
Gap = days between consecutive distinct entry dates. Data sources: feeds for Linear, Supabase, Raycast; GitHub releases API (stable, non-prerelease tags only) for Zed, Deno, uv, Bun; one Atom feed for Vercel. Source types are noted because a release tag is not a marketing changelog.

| Source | Type | Distinct dates | Gaps | Mean | Median | p90 | Max |
|---|---|---|---|---|---|---|---|
| [Linear](https://linear.app/changelog) | product changelog feed | 65 | 64 | 11.05 | 7.5 | 16 | 36 |
| [Supabase changelog](https://supabase.com/changelog) | product changelog feed | 118 | 117 | 6.16 | 4 | 13 | 40 |
| [Zed](https://github.com/zed-industries/zed/releases) stable | GitHub releases | 247 | 246 | 2.96 | 2 | 7 | 18 |
| [Deno](https://github.com/denoland/deno/releases) | GitHub releases | 84 | 83 | 8.34 | 7 | 15 | 41 |
| [uv](https://github.com/astral-sh/uv/releases) | GitHub releases | 190 | 189 | 3.85 | 3 | 7 | 13 |
| [Bun](https://github.com/oven-sh/bun/releases) | GitHub releases | 52 | 51 | 14.12 | 12 | 23 | 99 |
| [Raycast](https://www.raycast.com/changelog) (live feed plus 8 Wayback snapshots) | product changelog feed, incomplete | 38 | 37 | 19.49 | 7 | 31 | 199 |

Caveats. Raycast's live feed holds only 20 items (3 Jul to 25 Nov 2026) and Wayback snapshots hold 10 each, so the 199-day maximum is a coverage hole, not a real gap. Treat the Raycast row as unreliable for tail statistics; its median 7 is the only usable figure. The Deno feed's last stable tag is 21 Oct 2026 and Bun's is 19 Nov 2026 at fetch time. Zed ships a stable tag about every 2 days because patch releases are tagged; its product-level cadence is weekly-ish minor releases, which this method does not separate.

[Vercel's changelog Atom feed](https://vercel.com/atom) returns only the latest 100 entries: 100 entries on 20 distinct days between 2 and 25 Nov 2026 (mean 5 per active day, max 9). A 24-month series was not obtainable from the feed, the sitemap lastmod is a modification date, and the page is not paginated by query string. Vercel is cited for volume, not gaps.

Reading: public developer-tool changelogs in this sample publish a dated entry at a median of 2 to 12 days, with 90 percent of gaps under 23 days. That is the measurable base rate a small fleet is judged against by anyone who looks.

### 3. Do entries cluster around announced launch weeks?
Only Supabase announces launch weeks. `grep -ciE 'launch week'` over the Linear, Raycast, Vercel and Supabase-changelog feeds returns 0 for each, so the cluster test can run on Supabase only. Launch-week set (Monday-start weeks, 104 weeks from 2024-11-25): LW13 (2 Dec 2024), LW14 (31 Mar 2025), LW15 (14 Jul 2025), the unnamed 1 Dec 2025 cluster and the week of Select (28 Sep 2026). LW13 to LW15 dates come from the [Supabase blog feed](https://supabase.com/rss.xml) posts "Top 10 Launches of Launch Week 13/14/15" (6 Dec 2024, 4 Apr 2025, 18 Jul 2025).

| Series | Per launch week (5 weeks) | Non-launch weeks mean (median) | Top non-launch week | Permutation p (20,000 draws) |
|---|---|---|---|---|
| Supabase blog posts | 10, 10, 13, 8, 5 (mean 9.2) | 1.01 (1) | 7 | 0.0 |
| Supabase changelog entries | 1, 1, 2, 0, 3 (mean 1.4) | 1.25 (1) | 6 | 0.44 |

Reading: launch week is a blog event. The changelog shows no launch-week effect. The Select week is lower (5) because the posts spread over the following month: blog posts also peak in the weeks of 12 Oct 2026 and 26 Oct 2026 (7 each).

### 4. Three launch weeks, day by day
Headline = the post Supabase lists or dates for that day. LW15's day headlines are read from [supabase.com/launch-week](https://supabase.com/launch-week) ("Launch Week 15 | 14 - 18 Jul / 8am PT", Main Stage Monday to Friday). LW13 and LW14 pages are not served any more (the page shows LW15), so their headlines are the main posts dated each day in the [blog feed](https://supabase.com/rss.xml); that is an inference, flagged as such. Video = a `youtube-nocookie.com/embed/` iframe in the post HTML (a demo asset), checked by fetching each post. Changelog = an entry in the [Supabase changelog feed](https://supabase.com/changelog-rss.xml) dated in the same week that covers the headline.

LW13, 2-6 Dec 2024 (Mon to Fri; OrioleDB Public Alpha was posted Sun 1 Dec)

| Day | Headline | Written post | Video | Changelog |
|---|---|---|---|---|
| Mon 2 Dec | [AI Assistant v2](https://supabase.com/blog/supabase-ai-assistant-v2) | yes | yes | no |
| Tue 3 Dec | [Edge Functions: Background Tasks, Ephemeral Storage, WebSockets](https://supabase.com/blog/edge-functions-background-tasks-websockets) | yes | yes | no |
| Wed 4 Dec | [Supabase Cron](https://supabase.com/blog/supabase-cron) (and [CLI v2](https://supabase.com/blog/cli-v2-config-as-code), no embed) | yes | yes (Cron) | no |
| Thu 5 Dec | [Supabase Queues](https://supabase.com/blog/supabase-queues) (and [High Performance Disk](https://supabase.com/blog/high-performance-disks), no embed) | yes | yes (Queues) | no |
| Fri 6 Dec | [database.build v2](https://supabase.com/blog/database-build-v2) (and Restore to a New Project, no embed; recap [Top 10](https://supabase.com/blog/launch-week-13-top-10)) | yes | yes (plus an mp4) | no |

The only changelog entry that week (2 Dec, "Slack V1 OAuth Provider Deprecated") is unrelated to any headline.

LW14, 31 Mar - 4 Apr 2025

| Day | Headline | Written post | Video | Changelog |
|---|---|---|---|---|
| Mon 31 Mar | [Supabase UI Library](https://supabase.com/blog/supabase-ui-library) | yes | yes | no |
| Tue 1 Apr | [Edge Functions: Deploy from the Dashboard + Deno 2.1](https://supabase.com/blog/supabase-edge-functions-deploy-dashboard-deno-2-1) | yes | yes | no |
| Wed 2 Apr | [Realtime: Broadcast from Database](https://supabase.com/blog/realtime-broadcast-from-database) | yes | yes | no |
| Thu 3 Apr | [Declarative Schemas](https://supabase.com/blog/declarative-schemas) | yes | yes | no |
| Fri 4 Apr | [Supabase MCP Server](https://supabase.com/blog/mcp-server) (recap [Top 10](https://supabase.com/blog/launch-week-14-top-10)) | yes | yes (plus an mp4) | no |

The week's changelog entry (1 Apr, "Management API GET Logs Restrictions") is unrelated. A related advance-notice entry ("Upcoming Change: Improved Experimental Routing for Read Replica Load Balancers") is dated 27 Mar 2025, before the week.

LW15, 14-18 Jul 2025 (Main Stage per the page; "Build Stage" lists six surprise releases)

| Day | Headline | Written post | Video | Changelog |
|---|---|---|---|---|
| Mon 14 Jul | [JWT Signing Keys](https://supabase.com/blog/jwt-signing-keys) | yes | yes | no |
| Tue 15 Jul | [Analytics Buckets with Iceberg](https://supabase.com/blog/analytics-buckets) | yes | yes | no |
| Wed 16 Jul | [Branching 2.0](https://supabase.com/blog/branching-2-0) | yes | yes | no |
| Thu 17 Jul | [New Observability Features](https://supabase.com/blog/new-observability-features-in-supabase) | yes | yes | tangential ("Coming Soon: Combined View for Logs", 17 Jul) |
| Fri 18 Jul | [Persistent Storage for Edge Functions](https://supabase.com/blog/persistent-storage-for-faster-edge-functions) (recap [Top 10](https://supabase.com/blog/launch-week-15-top-10), [Hackathon](https://supabase.com/blog/lw15-hackathon)) | yes | yes | no |

Totals: 15 of 15 main headlines have a dated written post and a YouTube embed; 0 of 15 have a same-week changelog entry for the headline (1 tangential). Secondary Build Stage items are weaker: 14 of the 15 non-headline posts in the three weeks (recaps and hackathon excluded) carry no YouTube embed (counted from the 30 posts fetched; one has an mp4 instead). Measured pattern: each headline gets a post, a video and the recap; the changelog is used for deprecations and notices.

Across 24 months, a title-token match (at least 2 shared non-stop tokens, within 14 days) pairs only 8 of 147 Supabase blog posts with a changelog entry, and 1 of 33 posts inside the three launch weeks; manual review shows about 5 of the 8 are true pairs. The heuristic is noisy and is a lower-bound estimate, not a finding about intent.

After LW15: [Supabase Select 2026 Recap](https://supabase.com/blog/supabase-select-2026-recap) (2 Oct 2026) shows a conference-day launch with three themed posts the same day (Build anything, Operate with confidence, Scale without limits), then follow-ups on 13-30 Oct. A cluster of 8 posts on 1-5 Dec 2025 (Vector Buckets 1 Dec, Analytics Buckets and Pipelines 2 Dec, to Supabase for Platforms 5 Dec) has the shape of a launch week, but none of the fetched pages names it, so it is recorded as unlabelled.

### 5. Venue order evidence
What the public record shows, no more:
- Supabase LW15: the launch-week page promises an 8am PT drop each day with daily posts, followed by a Friday "Top 10" recap, then a hackathon and worldwide meetups ([page](https://supabase.com/launch-week), [recap post](https://supabase.com/blog/launch-week-15-top-10)). The first launch week used the blog post (updated each day) plus Twitter and a hashtag ([Supabase, 25 Mar 2021](https://supabase.com/blog/launch-week)).
- Bucket's first launch week: changelog or engineering post, then social posts on LinkedIn, Bluesky and X, then quote posts in a meta thread; Product Hunt only "when it makes sense"; Hacker News not mentioned ([Bucket, posted 12 Mar 2025, edited 17 Jun 2025](https://dev.to/bucketdotco/how-we-launch-5d6h)).
- Both place the canonical post on the owner's own domain first and social after. No source in this sample measures the order of Hacker News, Product Hunt or Reddit relative to the post. That is not measurable from changelogs.
- Supabase's CTO, quoted in the launchweek.dev FAQ: "no longer ship to prod on the day of the launch itself", with major integrations done a week early ([FAQ, posted 27 Dec 2024, edited 28 Mar 2025](https://dev.to/launchweekdev/frequently-asked-questions-on-launch-weeks-21mm)). So the ship date and the announce date are decoupled by design.

### 6. What the opinion sources actually support
- [Lago (Feb 2025, updated 13 Oct 2026)](https://www.getlago.com/blog/launch-week-product-marketing), vendor: launch weeks bundle five features for "boring" bought-not-discovered products; the author's company runs them; the only number is a social engagement comparison unrelated to launch weeks; no conversion data.
- [launchweek.dev FAQ](https://dev.to/launchweekdev/frequently-asked-questions-on-launch-weeks-21mm), community tracker: 185 launch weeks tracked since 2021; in 2024 they ran 3 to 6 days; no quantitative results, testimonials only.
- [Bucket](https://dev.to/bucketdotco/how-we-launch-5d6h), practitioner: only seven companies ran three or more launch weeks in 2024 (per launchweek.dev); 38 product updates in the prior 12 months; "at least one product update per week" kept going during the launch period; no post-launch metrics.
- [daily.dev business page](https://business.daily.dev/resources/developer-tool-launch-week-run-lessons-resend-linear-supabase/) (vendor, undated, lastUpdated 2026-10-29) states that developers need 7 to 12 touchpoints and 30-40 percent of launch revenue arrives in the last 48 hours. It cites no primary source, sells ad placements, and calls Linear a launch-week operator that no Linear feed item supports. Not used for any rule here.

## Dated facts

| Fact | URL | Source date | Source type |
|---|---|---|---|
| Linear feed: 255 items, 12 Apr 2019 to 12 Nov 2026; 24-month gaps mean 11.05, median 7.5, max 36 (measured) | https://linear.app/rss/changelog.xml | last build 27 Nov 2026 | platform feed, own measurement |
| Supabase changelog feed: 241 items to 23 Nov 2026; 24-month gaps mean 6.16, median 4, max 40 (measured) | https://supabase.com/changelog-rss.xml | last build 23 Nov 2026 | platform feed, own measurement |
| Raycast feed holds 20 items, 3 Jul to 25 Nov 2026 | https://www.raycast.com/changelog/feed.xml | last build 25 Nov 2026 | platform feed |
| Vercel Atom feed holds 100 entries, 2 to 25 Nov 2026 | https://vercel.com/atom | updated 25 Nov 2026 | platform feed |
| Zed 1,332, Deno 391, uv 333, Bun 220 releases via API; stable-only 24-month gaps in section 2 | https://github.com/zed-industries/zed/releases and the three sibling repos | fetched 27 Nov 2026 | platform API, own measurement |
| Supabase LW15 ran 14-18 Jul 2025, 8am PT daily; Main Stage 5 headlines; Build Stage 6 surprise releases; hackathon; worldwide meetups | https://supabase.com/launch-week | page shows LW15; no page date | platform |
| Supabase LW13 Top 10 posted 6 Dec 2024; LW14 Top 10 4 Apr 2025; LW15 Top 10 18 Jul 2025 | https://supabase.com/blog/launch-week-15-top-10 (and the 13, 14 equivalents) | dates above | platform |
| Supabase Select 2026 recap posted 2 Oct 2026 | https://supabase.com/blog/supabase-select-2026-recap | 2 Oct 2026 | platform |
| First Supabase launch week ran 29 Mar to 2 Apr 2021, blog post plus Twitter | https://supabase.com/blog/launch-week | 25 Mar 2021 | platform |
| Launch weeks in 2024 ranged from 3 to 6 days; 185 tracked since 2021; Supabase CTO quote on not shipping to prod on launch day | https://dev.to/launchweekdev/frequently-asked-questions-on-launch-weeks-21mm | 27 Dec 2024, edited 28 Mar 2025 | community tracker, not independent of participants |
| Bucket: 38 updates in 12 months, 5 features, at least one update per week, order changelog then social then thread | https://dev.to/bucketdotco/how-we-launch-5d6h | 12 Mar 2025, edited 17 Jun 2025 | practitioner |
| Lago: third launch week, 5 features each; no conversion data | https://www.getlago.com/blog/launch-week-product-marketing | 17 Feb 2025, updated 13 Oct 2026 | vendor |
| 7-12 touchpoints; 30-40 percent of launch revenue in last 48 hours; 60 percent ad blockers | https://business.daily.dev/resources/developer-tool-launch-week-run-lessons-resend-linear-supabase/ | lastUpdated 29 Oct 2026, undated | vendor data, secondary, uncorroborated |

## Normative guidance candidates

1. SHOULD publish a dated, linkable changelog entry for every user-visible release; the measured base rate for developer tools is a median gap of 2 to 12 days. Verify: extract entry dates from CHANGELOG.md or the feed, run the gap script (section 8); pass when median gap is at most 14 days and p90 at most 23 days over the trailing 12 months; report the largest gap. Fail example: a 99-day gap (Bun's max). A fleet with few releases may fall short; then state the real figure rather than padding.
2. MUST NOT cite the scout's 11.67-day Linear mean as a cadence benchmark. Rationale: it is a 10-entry window; 24-month values are mean 11.05, median 7.5. Verify: grep the new rule or skill text for `11.67`; the number must appear only with the label "10-entry window".
3. SHOULD default to a rolling cadence for a small fleet and MUST NOT plan a launch week unless at least five announceable items are code-complete. Rationale: Supabase's launch weeks carry 8 to 13 blog posts per week against a median of 1; no source shows a small-team week works. Verify: the launch plan lists the items with merge status; count of items marked complete is at least 5 or the plan is rejected.
4. MUST give every launch headline a dated written post on an owned domain with a stable URL. Rationale: 15 of 15 Supabase headlines have one; it is the canonical record that social posts link to. Verify: for each headline in the plan, `curl -sIL -o /dev/null -w '%{http_code}' <url>` returns 200 and the page contains a date.
5. SHOULD give every launch headline a changelog entry that links the post. Rationale: this is cheap for a small team and it keeps the changelog authoritative; but the benchmark company does not do it (0 of 15), so the rule is a house choice, not industry practice. Verify: for each headline, a dated entry exists in the changelog or feed within 3 days that contains the post URL (grep the URL in the feed).
6. CONSIDER a demo video per headline; video is optional. Rationale: Supabase embeds one in every main headline, but secondary items almost never have one (14 of 15 non-headline posts). Verify: record `has_video: yes|no` per headline; absence is not a failure.
7. MUST sequence a launch as: owned post live and verified, then changelog entry, then social posts that link the post, then (separately gated) community venues, then a recap. Rationale: both public records place the owned post first and social after; the ordering of community venues is unmeasured. Verify: timestamps of the post, changelog entry and first social post are in that non-decreasing order; the social copy contains the post URL.
8. MUST decouple ship from announce: the release is in production before the announce day. Rationale: Supabase's CTO reports it stopped shipping to prod on launch day (launchweek.dev FAQ, 2024-12-27). Verify: the release tag date or deploy date is earlier than the announce date in the plan.
9. SHOULD publish a recap post at the end of any multi-day launch that lists every headline with links. Rationale: all three measured weeks end with a "Top 10" recap on the Friday. Verify: the recap links each headline URL (count of links equals count of headlines).
10. MUST NOT claim a launch format "works" or "drives growth" without an own metric. Rationale: no source gives controlled or conversion evidence; Lago's own text admits anecdote. Verify: grep drafts for `proven|drives growth|gets \d+x` near "launch week"; each hit needs an attached measurement.
11. SHOULD give the changelog entry for deprecations and breaking changes its own dated entry. Rationale: Supabase's changelog is mostly notices (35 of 241 titles match deprecation, breaking or restriction terms by regex). Verify: grep titles for `deprecat|breaking|sunset`; each has a date.
12. SHOULD recompute the gap table on a schedule (quarterly) before reusing any figure here. Rationale: feeds change and Raycast's holds only 20 items. Verify: the section 8 script runs and prints the same schema.

## What an agent must not decide alone
- Whether to run a launch week, and when. This is a budget and team-capacity decision; ask.
- Which feature is the headline, and what claims the headline makes (brand and legal: performance, security, compliance statements).
- Posting to any account, scheduling any post, paying for any promotion, or contacting a partner for joint amplification.
- Embargoes, partner approvals, and dates tied to a deploy freeze.
- Whether a demo video shows customer data or a named customer.
- Whether to retire a changelog entry or correct a published figure after the fact.

## AI-agent angle
| Failure | Mechanical check |
|---|---|
| Treats "launch week" as the default for any product launch because blog advice repeats it. | The plan must cite the item count (rule 3); a launch week with fewer than five completed items fails. |
| Quotes Linear "mean 11.67 days" or "ships every two weeks" as a norm. | Grep for `11.67`; require the 24-month figures with their window. |
| Assumes launch announcements also appear in the changelog because the changelog "feels" like the record. | Measure it: 0 of 15 Supabase headlines have one. Require the changelog URL in the plan or flag it as missing. |
| Invents launch venue timing ("post at 9am ET on Tuesday") with no source. | Any time of day or weekday in a plan needs a cited source or an own-data basis; the only dated datum here is Supabase's 8am PT. |
| Reads GitHub release tags as launch announcements. | Distinguish tags from posts: a plan item needs a prose URL, not a tag. |
| Fills the Raycast gap with a real-looking cadence from a partial feed. | Require stated coverage window per feed before computing gaps. |
| Treats daily.dev or Lago numbers (7-12 touchpoints, 30-40 percent) as research. | Label `vendor` and require a primary source before quoting. |

## Contested / evolving
- Launch week vs rolling releases. For: Lago (bundle five features; momentum) and the launchweek.dev FAQ (testimonials; 185 weeks tracked). Against or tempering: Bucket keeps a weekly update cadence alongside launch weeks and says launch weeks should not hold back releases; Pendo's blog argues a fixed release schedule should not itself be marketed ([Pendo](https://pendo.io/pendo-blog/?p=651), found in search, not fetched, so not relied on). No controlled data on either side, so the choice is judgement. Supabase itself moved from named weeks to a conference day plus a rolling follow-up in 2026.
- Whether the changelog or the blog is the record of a launch. Supabase uses the blog for headlines and the changelog for notices; Linear and Raycast use the changelog as the primary record (feed items are product updates, not posts). Pick one canonical URL per headline and link the other.
- Daily drops vs a shorter week. The launchweek.dev FAQ says weeks ran 3 to 6 days in 2024 and daily features are the definition, not a requirement.
- Whether a Supabase-scale launch week is applicable at all. Supabase's blog volume in launch weeks (8 to 13 posts) is a company with large teams; applying it to a two-person fleet is an extrapolation no source tests.

## Measurement log (every command)
Scratch directory `~/.cache/research-lang/exemplars/product/launch/` (fetched 2026-11-27). Python run as `python3 -I`.

```
# feeds and pages
curl -sL -A 'Mozilla/5.0' https://linear.app/rss/changelog.xml
curl -sL -A 'Mozilla/5.0' https://www.raycast.com/changelog/feed.xml
curl -sL -A 'Mozilla/5.0' https://vercel.com/atom
curl -sL -A 'Mozilla/5.0' https://supabase.com/changelog-rss.xml
curl -sL -A 'Mozilla/5.0' https://supabase.com/rss.xml
curl -sL -A 'Mozilla/5.0' https://supabase.com/launch-week
# Wayback snapshots of the Raycast feed (closest to 2025-02-15, -04-01, -06-01, -08-01, -10-01, 2026-02-01, -04-01, -06-01)
curl -s "https://archive.org/wayback/available?url=raycast.com/changelog/feed.xml&timestamp=<YYYYMMDD>"
# release tags
gh api --paginate "repos/<owner>/<repo>/releases?per_page=100" --jq '.[]|[.published_at,.tag_name,.prerelease,.draft]|@tsv'
#   repos: zed-industries/zed, denoland/deno, astral-sh/uv, oven-sh/bun   (prerelease=true rows dropped)
# launch-week posts (each fetched, then grepped for an embed)
curl -sL https://supabase.com/blog/<slug> | grep -oE 'youtube-nocookie\.com/embed/[A-Za-z0-9_-]+'
# launch-week phrase check
grep -ciE 'launch week' linear_app_rss_changelog_xml.feed raycast_com_changelog_feed_xml.feed vercel_com_atom.feed supabase_changelog.rss
```

Gap script (extract dates by regex, window 2024-11-27 to 2026-11-27, distinct sorted dates, consecutive difference in days, then mean, median, p90 = sorted value at index int(0.9*(n-1)), max):

```
python3 -I gaps.py   # regex <pubDate>(...)</pubDate> parsed with email.utils.parsedate_to_datetime; GitHub rows by published_at[:10]
```

Linear scout re-run: same extraction, window starting 2026-07-30; output `[14, 7, 14, 11, 10, 14, 14, 14, 7]`, mean 11.666666666666666.

Cluster script: weeks keyed by Monday, `week = d - timedelta(days=d.weekday())`; launch weeks 2024-12-02, 2025-03-31, 2025-07-14, 2025-12-01, 2026-09-28; permutation test draws 5 random weeks from the 104, 20,000 draws with `random.seed(1)`, counts draws whose mean count is at least the launch-week mean; p = count / 20000. Outputs: blog p = 0.0, changelog p = 0.4420.

Blog-to-changelog pairing: tokens of 3+ letters minus a stop list; pair if at least 2 shared tokens and dates within 14 days; 8 of 147 posts matched, 1 of 33 in launch weeks.

Not reproduced or not obtainable: Vercel and Raycast 24-month series (feed depth); LW13 and LW14 launch-week pages (no longer served); a Supabase page naming the 1 Dec 2025 cluster; the scout's page-fetched Linear entry list was reproduced from the feed, not from the HTML page.

## Sources
| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://linear.app/rss/changelog.xml | Linear changelog feed (primary) | to 12 Nov 2026 | Gap data and scout re-run |
| https://supabase.com/changelog-rss.xml | Supabase changelog feed (primary) | to 23 Nov 2026 | Gap data, cluster test |
| https://www.raycast.com/changelog/feed.xml | Raycast changelog feed (primary) | to 25 Nov 2026 | Coverage-limited data point |
| https://vercel.com/atom | Vercel changelog feed (primary) | 2 to 25 Nov 2026 | Volume figure |
| https://github.com/zed-industries/zed/releases | Zed releases via API (primary) | 2021 to 25 Nov 2026 | Release cadence |
| https://github.com/denoland/deno/releases | Deno releases via API (primary) | to 21 Oct 2026 | Release cadence |
| https://github.com/astral-sh/uv/releases | uv releases via API (primary) | to 24 Nov 2026 | Release cadence |
| https://github.com/oven-sh/bun/releases | Bun releases via API (primary) | to 19 Nov 2026 | Release cadence, long-gap case |
| https://supabase.com/launch-week | Supabase launch-week page (primary) | shows LW15, Jul 2025 | Day headlines, 8am PT, stages |
| https://supabase.com/rss.xml | Supabase blog feed (primary) | to 23 Nov 2026 | Dated launch posts |
| https://supabase.com/blog/launch-week-13-top-10 | LW13 recap (primary) | 6 Dec 2024 | Recap shape |
| https://supabase.com/blog/launch-week-14-top-10 | LW14 recap (primary) | 4 Apr 2025 | Recap shape |
| https://supabase.com/blog/launch-week-15-top-10 | LW15 recap (primary) | 18 Jul 2025 | Recap shape |
| https://supabase.com/blog/supabase-select-2026-recap | Select 2026 recap (primary) | 2 Oct 2026 | Post-LW15 shape |
| https://supabase.com/blog/launch-week | First Supabase launch week post (primary) | 25 Mar 2021 | Original rationale and venues |
| https://supabase.com/blog/vector-buckets | Dec 2025 cluster post (primary) | 1 Dec 2025 | Unlabelled cluster |
| https://www.getlago.com/blog/launch-week-product-marketing | Lago argument (vendor) | 17 Feb 2025, upd. 13 Oct 2026 | Pro case, no data |
| https://dev.to/launchweekdev/frequently-asked-questions-on-launch-weeks-21mm | launchweek.dev FAQ (community tracker) | 27 Dec 2024, ed. 28 Mar 2025 | 185 weeks, 3-6 days, CTO quote |
| https://dev.to/bucketdotco/how-we-launch-5d6h | Bucket launch process (practitioner) | 12 Mar 2025, ed. 17 Jun 2025 | Small-team venue order and cadence |
| https://business.daily.dev/resources/developer-tool-launch-week-run-lessons-resend-linear-supabase/ | daily.dev page (vendor, secondary) | lastUpdated 29 Oct 2026 | Example of unverified numbers |
| https://launchweek.dev | Launch-week tracker home | undated | Could not yield counts; noted |

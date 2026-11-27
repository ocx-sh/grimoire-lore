---
title: "GitHub and registry signal validity: which numbers a team may report as distribution results"
program: product
sub_program: channels
topic: channel-github
worker: gh-signal-validity
date_researched: 2026-11-27
model: sonnet
sources_fetched: 31
scope: "Covers GitHub stars, the traffic API and its archive job, referrers, fake-star exposure, star calls to action, Trending, OSS Insight, release-asset downloads, and the download counters of npm, PyPI, crates.io, Homebrew and the VS Code Marketplace, plus Product Hunt and Hacker News read-only counters. Does not cover site analytics, UTM parameters or attribution models (marketing analytics). Fleet measurements were taken on 2026-11-27 with the commands shown."
---

# GitHub and registry signal validity

## Table of contents

1. Summary
2. Findings (1 Measurements on the fleet; 2 Traffic API; 3 Stars; 4 Fake stars and the AUP; 5 Trending; 6 OSS Insight; 7 Release-asset downloads; 8 Registries; 9 Launch-venue counters)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Scout figures that failed to reproduce
9. Sources

## Summary

- GitHub traffic data covers only the past 14 days, so any repo without a scheduled archive loses all history older than two weeks; the fleet has no archive job (measured below).
- A traffic archive is MUST for the two flagship repos and for any repo a launch plan names as its goal counter; it is SHOULD elsewhere. Run it weekly, not daily.
- The traffic endpoints need the Administration read permission on a fine-grained token; the docs do not say `GITHUB_TOKEN` can do it, so the job needs an owner-created secret.
- Since July 2026 the stargazer listing (`/stargazers`) is limited to admins and collaborators; on someone else's repo it returns 404 (measured on `torvalds/linux`). Do not write rules that scan a third party's stargazers.
- The replacement endpoints are public: `GET /repos/{o}/{r}/stargazers/count` and `GET /repos/{o}/{r}/stargazers/history` (weekly buckets with a daily array, 30 weeks per page). Both reflect current stars only, so unstars vanish from history.
- Unique-visitor counts in the traffic API are undefined in the docs; report them only as "GitHub-reported uniques".
- The referrer docs say search engines are excluded, yet the API returned Google and Bing on both flagship repos (measured); treat the referrer list as indicative, not complete.
- Stars may be reported only as a raw current count with the date, never as a launch result, because they include fake stars (3.81 million after postprocessing in one study) and cannot show removals.
- A star call to action may be a plain, unconditional ask; it must never offer, imply or exchange a reward (GitHub AUP, rank abuse and incentivised inauthentic engagement).
- Release-asset `download_count` has no documented definition; on the fleet, `.sha256` sidecar files are fetched nearly half as often as the tarballs, which points to installer-script and CI traffic.
- npm counts every HTTP 200 tarball response, including build servers and mirrors (npm's own 2014 post); report as "registry downloads (includes automated)".
- pypistats keeps 180 days and excludes known mirrors only; the PyPI Packaging guide calls download counts "highly inaccurate". The fleet publishes nothing under its own name on PyPI or crates.io, so these two registries are out of the fleet's current signal set.
- Homebrew install counts are operations, not users, and cover upgrades and reinstalls; the fleet has no Homebrew formula (404 on formulae.brew.sh for `ocx` and `grim`).
- The VS Code Marketplace publisher page exposes "Acquisition" trend and totals; no source fetched defines install versus update, so cite it as "Marketplace acquisitions".
- Product Hunt moved its leaderboard from upvotes to points; HN guidelines forbid soliciting upvotes. Both are read-only outcomes of a launch, never a goal.
- A launch plan carries exactly one goal, one counter from the allowed list, a baseline window and the caveat id for that counter.
- Two dated facts to re-verify: OSS Insight shuts down on 2026-12-04; the stargazer restriction phases are undated by GitHub.

## Findings

### 1. Measurements on the fleet

Every command was run on 2026-11-27 from `/home/mherwig/dev` as the repo owner (`gh` logged in as the owner).

| Measurement | Result | Command |
|---|---|---|
| Stars, ocx-sh/ocx | 20 (created 2026-03-03); first star 2026-03-19; at most 3 in any 7-day window | `gh api repos/ocx-sh/ocx --jq '[.stargazers_count,.created_at]'`; `gh api -H 'Accept: application/vnd.github.star+json' repos/ocx-sh/ocx/stargazers --paginate --jq '.[].starred_at'` |
| Stars, grimoire-rs/grimoire | 17 (created 2026-05-15); first star 2026-06-14; at most 4 in any 7-day window; 3 stars on 2026-09-30, 2 on 2026-09-08 | same, repo `grimoire-rs/grimoire` |
| Stars versus releases | ocx: 38 releases, 3 of 20 stars within 48 h after a release; grimoire: 34 releases, 6 of 17. But 56 of 269 days (ocx) and 52 of 196 days (grimoire) fall inside a 48 h post-release window, so the overlap of 15% and 35% is not evidence of release-driven starring (n is 20 and 17) | `gh api repos/<o>/<r>/releases --paginate --jq '.[]\|.published_at'` compared with the star timestamps in a script |
| Traffic window actually returned | 14 daily rows, 2026-11-13 to 2026-11-26 (today, 2026-11-27, is absent); views and clones both | `gh api repos/ocx-sh/ocx/traffic/views`; `.../traffic/clones`; same for `grimoire-rs/grimoire` |
| ocx views / clones, 14 days | views 180 (uniques 38); clones 7,990 (uniques 426) | same |
| grimoire views / clones, 14 days | views 217 (uniques 70); clones 3,847 (uniques 446) | same |
| Referrers, ocx | github.com 36, ocx.sh 3, Google 3, teams.public.onecdn.static.microsoft 1, ya.ru 1 | `gh api repos/ocx-sh/ocx/traffic/popular/referrers` |
| Referrers, grimoire | github.com 13, grimoire.rs 7, Bing 6, teams.public.onecdn.static.microsoft 3, jira.vi.vector.int 2, Google 1, login.microsoftonline.com 1 | `gh api repos/grimoire-rs/grimoire/traffic/popular/referrers` |
| Traffic-archive job in the fleet | none: the only repo files containing the string `traffic/` are rule texts describing the idea, none in `.github/workflows` of ocx or grimoire | `grep -rIl "traffic/" ocx-sh grimoire-rs --exclude-dir=node_modules --exclude-dir=.git`; `ls ocx-sh/ocx/.github/workflows grimoire-rs/grimoire/.github/workflows` (no archive workflow among 25 and 9 files) |
| Star call to action in READMEs | none in ocx or grimoire README | `grep -n -i -E "star(s\| (this\|the\|us\|our)\| on github)\|giveaway" ocx-sh/ocx/README.md grimoire-rs/grimoire/README.md` returned nothing |
| npm 90 days, `@ocx-sh/theme` | 7,109 total over 2026-08-29..2026-11-26; 41 of 90 days zero; peak 579 on 2026-10-23; last 30 days 5,353 | `curl -s https://api.npmjs.org/downloads/range/2026-08-29:2026-11-26/@ocx-sh/theme`; `.../point/last-month/@ocx-sh/theme` |
| npm 90 days, `@grimoire-rs/indexer` | 5,201 total; 4 of 90 days zero; peak 535 on 2026-10-23; last 30 days 1,127 | same with `@grimoire-rs/indexer` |
| crates.io | `ocx`, `ocx_lib`, `ocx-mirror` do not exist (API error "crate ... does not exist"); crate `grim` exists but its repository is `github.com/Vaishnav-Sabari-Girish/grimoire`, not the fleet's | `curl -s -A "research-client" https://crates.io/api/v1/crates/<name>` |
| PyPI | `ocx` and `grim` names exist (HTTP 200) with unverified ownership; `grimoire-rs` and `ocx-sh` return 404 | `curl -s -o /dev/null -w "%{http_code}" https://pypi.org/pypi/<name>/json` |
| Homebrew | `ocx` and `grim` formula JSON return 404 | `curl -s -o /dev/null -w "%{http_code}" https://formulae.brew.sh/api/formula/ocx.json` |
| Latest-release asset downloads, ocx v0.6.8 | linux x86_64 gnu tarball 883, its `.sha256` 422; aarch64 linux gnu tarball 509, `.sha256` 105; whole release total 3,485 | `gh api repos/ocx-sh/ocx/releases/latest --jq '.assets[]\|[.name,.download_count]\|@tsv'` |
| Release totals | ocx v0.6.2 alone shows 22,977; the median of the ten most recent ocx releases is about 3,500 | `gh api repos/ocx-sh/ocx/releases --paginate --jq '.[]\|[.tag_name,.published_at,([.assets[].download_count]\|add)]\|@tsv'` |

What the measurements show: the fleet has no traffic history beyond 14 days; star counts are 20 and 17 and move by at most 4 per week, so one star changes the number by 5 to 6%; release downloads are in the thousands while views are in the hundreds, so they come mostly from machines.

### 2. The traffic API and the archive decision

- The user-facing page says anyone with push access can view traffic, the data covers "the past 14 days", clones are "full clones (not fetches)", referrers exclude "search engines and GitHub itself", and "All data in the traffic graph uses the UTC+0 timezone" ([GitHub Docs, Viewing traffic to a repository](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository), undated).
- The REST page says write access, `per` is `day` (default) or `week`, referrers and paths return the top 10, and timestamps align to UTC midnight with weeks starting Monday ([GitHub Docs, REST traffic](https://docs.github.com/en/rest/metrics/traffic), undated).
- The fine-grained token page lists the permission as repository Administration with read access and lists only PATs as the token type ([GitHub Docs, permissions for fine-grained PATs](https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens), undated). The three pages name three different permission levels (push, write, Administration read). I could only test as owner, so the minimum level is unverified; the archive job must be tested with the token it will really use.
- "Unique" is not defined anywhere on the pages read.
- Scheduled workflows: minimum 5 minutes; run from the default branch; delayed under load, especially at the top of the hour; public-repo schedules are disabled after 60 days without repository activity ([GitHub Docs, events that trigger workflows](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows), undated).
- Consequence for the schedule: weekly with `per=day` gives a 14-day window read every 7 days, so one missed run (a delay, a dropped job, a 60-day pause) loses nothing. Daily adds no information. Run on an off-minute such as `17 4 * * 1`.

Archive job, correct shape (the secret name is a placeholder the owner must create):

```yaml
on:
  schedule: [{ cron: "17 4 * * 1" }]   # weekly, off the top of the hour, UTC
  workflow_dispatch:
jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - run: |
          for k in views clones; do
            gh api repos/${{ github.repository }}/traffic/$k > $k.json
          done
          gh api repos/${{ github.repository }}/traffic/popular/referrers > referrers.json
        env: { GH_TOKEN: "${{ secrets.TRAFFIC_READ_TOKEN }}" }
```

Incorrect: relying on `${{ github.token }}` (the docs do not list it for these endpoints) or on a daily cron (7 redundant reads per window).

Merge rule: key rows by `timestamp`; a later read overwrites an earlier one for the same day. The archive must store the raw JSON next to the date it was read.

### 3. Stars

- The events feed returns only events from the last 30 days, up to 300 events, with latency 30 s to 6 h, and "is not built to serve real-time use cases" ([GitHub Docs, events](https://docs.github.com/en/rest/activity/events), undated). The WatchEvent has one field, `action`; nothing documents an unstar event.
- OSS Insight lists the reasons its star counts differ from GitHub's: no UnWatchEvent exists, GitHub loses data when services are down, repos switch private and public, repo data is manually fixed, and logins or repo names change ([OSS Insight FAQ](https://ossinsight.io/docs/faq), fetched 2026-11-27).
- `GET /repos/{o}/{r}/stargazers/count` returns the current count, "users who removed their star are excluded"; `GET /repos/{o}/{r}/stargazers/history` returns calendar weeks, most recent first, `per_page` max 30, `page` max 100, each with `week`, `total` and a 7-entry `days` array starting Sunday ([GitHub Docs, starring](https://docs.github.com/en/rest/activity/starring), API version 2026-03-10).
- Measured: `gh api repos/ocx-sh/ocx/stargazers/count` returned `{"count":20}`; `.../stargazers/history` returned 30 weekly rows; `gh api repos/torvalds/linux/stargazers/count` returned `{"count":256962}` while `gh api -H 'Accept: application/vnd.github.star+json' repos/torvalds/linux/stargazers --jq length` returned HTTP 404. The history rows include weeks starting 2026-11-22, the current week.
- GitHub restricted the list-stargazers and list-watchers endpoints to admins and collaborators ([GitHub changelog 2026-06-30](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/)) and added the history endpoint on [2026-09-04](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data). The engineering post states the star model keeps only current stars ("when someone removes a star, that record is removed"), so removals drop out of the counts ([GitHub engineering post](https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/), undated in the text read).
- Stars are used by readers: 75% of 791 surveyed developers check the star count before using or contributing ([Borges and Valente 2018, arXiv:1811.07643](https://arxiv.org/abs/1811.07643), submitted 2018-11-19). The 2016 study clustered 2,279 popular repositories into four growth patterns ([Borges et al. 2016, arXiv:1606.04984](https://arxiv.org/abs/1606.04984)). Both predate agentic coding and are correlational.
- GitHub itself says "Many of GitHub's repository rankings depend on the number of stars" and Explore shows popular repositories by stars ([GitHub Docs, saving repositories with stars](https://docs.github.com/en/get-started/exploring-projects-on-github/saving-repositories-with-stars), undated). Stars matter as a ranking input, which is why the fake-star rules below are strict.

### 4. Fake stars and the Acceptable Use Policy

- StarScout study: about 6.0 million suspected fake stars before postprocessing across 26,254 repositories; after postprocessing 18,617 repositories, 301k accounts, 3.81 million fake stars; in July 2024, 16.66% (3,499) of repositories with at least 50 stars had campaigns; flagged repositories were deleted at 90.42% versus a 5.03% baseline; recall on a known ghost-network dataset 81.23% of repositories; fake stars give a short-term boost (under about two months) about five times smaller than real stars, and later correlate with fewer real stars ([He et al., arXiv:2412.13459](https://arxiv.org/abs/2412.13459) v1 2024-12-18, v2 2025-09-06; numbers from the [HTML v2](https://arxiv.org/html/2412.13459v2), of which the last 35k characters were not read). Independent academic study. The abstract carries no counts, so cite the HTML body.
- The authors say star counts "should not be used for high-stakes decisions by themselves" and recommend building real communities (same source).
- The GitHub AUP bans "inauthentic interactions, such as fake accounts and automated inauthentic activity", "rank abuse, such as automated starring or following", and activity "incentivized by (or incentivizes inauthentic engagement with) rewards such as cryptocurrency airdrops, tokens, credits, gifts or other give-aways" ([GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), no visible date). The text names rewards for inauthentic engagement; it does not name a plain "please star" ask, so the boundary is by inference: a plain, unconditional ask has no reward and is not an inauthentic interaction; a reward, exchange (star-for-star) or giveaway is.
- Detection by anomaly is possible only on a repo you administer, because the stargazer list is restricted. Test: a day whose star count exceeds 5 times the median of the previous 30 daily counts, from the history endpoint. This threshold is my proposal, not a published one; flag it for the owner to calibrate.

### 5. Trending

- The Trending page offers Today, This week, This month and "stars today", and does not say how ranking works ([GitHub Trending](https://github.com/trending), fetched 2026-11-27). No decay rate is published, so no rule may promise or schedule for a Trending placement.

### 6. OSS Insight

- "OSSInsight shuts down on December 4, 2026. The site becomes a read-only archive, the API stops, and the dataset will be available to download." ([OSS Insight FAQ](https://ossinsight.io/docs/faq), fetched 2026-11-27). Reproduces the scout date. From 2026-12-04 any rule, skill or doc that links the API or its widgets fails.
- Verification: `grep -rIn "ossinsight" <repo> --exclude-dir=.git --exclude-dir=node_modules`.

### 7. Release-asset downloads

- The REST release-asset page lists `download_count` as a required integer with no description of what it counts ([GitHub Docs, release assets](https://docs.github.com/en/rest/releases/assets), undated). Measured: the sidecar `.sha256` files are downloaded at 48% of the tarball rate (422 of 883, linux x86_64 gnu, ocx v0.6.8); a human downloading from the releases page rarely fetches the checksum, so installers and CI dominate. v0.6.2 at 22,977 is 6 to 7 times the recent median.
- Report release downloads only as "release-asset downloads (include installer scripts and CI)", per release, never summed across releases as "users".

### 8. Registries

| Registry | What it counts | Limits and window | Source and date |
|---|---|---|---|
| npm | "the number of HTTP 200 responses we served that were tarball files"; includes automated build servers and downloads by mirrors | `point` and `range` endpoints; standard queries up to 18 months; bulk up to 365 days and 128 packages, scoped packages not supported in bulk; per-version only previous 7 days; raw logs processed once per day after UTC midnight; periods `last-day`, `last-week`, `last-month`, `last-year` | [npm blog 2014-07-22](https://blog.npmjs.org/post/92574016600/numeric-precision-matters-how-npm-download-counts-work.html) (platform); [npm registry docs](https://raw.githubusercontent.com/npm/registry/main/docs/download-counts.md) (platform, undated) |
| PyPI via pypistats | downloads of known non-mirror sources; "All download stats exclude known mirrors"; CI not mentioned; download not defined | 180 days retained; IP rate limit unspecified; endpoints `recent`, `overall` (`mirrors=true/false`), `python_major`, `python_minor`, `system`; updated once daily | [pypistats API](https://pypistats.org/api/) (third-party service by the community, undated); [pypistats about](https://pypistats.org/about) |
| PyPI via BigQuery | table `bigquery-public-data.pypi.file_downloads` (fed by Linehaul), metadata table `bigquery-public-data.pypi.distribution_metadata`, CC BY 4.0 | free tier up to 1 TB queries per month; one example query processes over 500 GB; `details.installer.name` distinguishes pip from bandersnatch; the guide calls counts "Highly inaccurate" (pip cache lowers them, mirrors raise or lower them); Linehaul under-reported before 2018-07-26 | [PyPI BigQuery docs](https://docs.pypi.org/api/bigquery/) (platform, undated); [Packaging guide](https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/) (platform, undated). A `ci` field is described by third-party tools, not by the pages fetched |
| crates.io | CDN access logs are read by a background job and added to per-version totals in batches "some time after the downloads themselves"; no definition of a download page fetched | `GET /api/v1/crates/<name>/downloads` returned 22 per-day-per-version rows for 2026-09-01..2026-11-21 (measured, `grim`, a crate that is not the fleet's); the crawler-policy page `https://crates.io/data-access` returned only its title, so the rate limit and retention are unsourced | [crates.io architecture doc](https://github.com/rust-lang/crates.io/blob/main/docs/ARCHITECTURE.md) (platform, undated) |
| Homebrew | "aggregate, anonymous usage analytics"; install counts "include upgrades and reinstalls, not unique users or machines"; a CI flag is collected but whether CI is excluded from public counts is not stated | events retained 365 days; public JSON for 30d, 90d, 365d under `/api/analytics/install/homebrew-core/`; reports may cover shorter periods | [Homebrew Analytics](https://docs.brew.sh/Analytics) (platform, undated); [formulae.brew.sh/analytics](https://formulae.brew.sh/analytics/) (platform, undated) |
| VS Code Marketplace | publisher management page shows "Acquisition Trend", "Total Acquisition counts", ratings; install versus update not defined in any page read; unpublishing preserves statistics, removing deletes them | per-publisher login required; no public API documented in the page | [VS Code publishing docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) (platform, undated) |

Independent and vendor evidence on inflation: a Tenable researcher inflated a test package to 17,000 npm downloads in about an hour; a separate case reported by ReversingLabs counted roughly 50,000 downloads in three days with no real users (both security vendors, vendor data; read through search results, not opened pages: [Tenable blog](https://tenable.com/blog/how-cyberattackers-inflate-malicious-package-npm-download-counts)). Treat as vendor data and as an upper-bound illustration only.

Fleet reading: `@ocx-sh/theme` has 41 zero days in 90 and a 579-download peak on 2026-10-23, a pattern of bursts (consistent with CI or a mirror, not with steady human adoption); `@grimoire-rs/indexer` has 4 zero days but shares the 2026-10-23 peak (535). The same-day peak on two unrelated packages is a machine signature. This is an inference from the daily series, not a source-confirmed fact.

### 9. Launch-venue counters

- Product Hunt: the help page says "Pick one or two, and make them measurable" with the examples "200 signups from Product Hunt" and "30 pieces of feedback"; a launch runs from 12:01 AM Pacific to midnight Pacific; the page mentions no dashboard, upvotes or UTM ([Product Hunt help, goals and launch date](https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date), shows "Updated over 3 weeks ago" only). The changelog says the leaderboard "now displays points", "Points determine the ranking", and adds a "launch-day dashboard for makers with social link tracking"; the entry is dated December 11 with no year in the fetched text ([Product Hunt changelog](https://www.producthunt.com/changes)). I could not find a help article for dashboard fields; read the Dashboard button on the launch page.
- Hacker News: guidelines say "Don't solicit upvotes, comments, or submissions" and the Show HN page says "Please don't ask friends to upvote or comment" ([HN guidelines](https://news.ycombinator.com/newsguidelines.html), [Show HN rules](https://news.ycombinator.com/showhn.html), both undated). The official item API exposes `score` and `descendants`, "There is currently no rate limit", and does not state whether score is live ([HN API](https://github.com/HackerNews/API), undated). The Algolia search page returned no documentation, so the `points` field of that API is unsourced.
- Both are read-only outcomes. The agent may read and report them; it may never set one as the launch goal, because the venue's rules forbid soliciting the count and the leaderboard formula is unpublished.

## Normative guidance candidates

Severity per rule; "Verification" is what a reviewer or agent runs.

1. **GHSV-01 (MUST).** A channel skill may report a GitHub or registry number only with its signal name, the exact measurement window, the date read, and the caveat id from the table in rule 2. Rationale: every counter here has a documented or measured distortion. Verification: reading heuristic; pass "ocx stars 20 (current count, read 2026-11-27)", fail "ocx got 20 stars from the launch".
2. **GHSV-02 (MUST).** Use only these signals and these caveats:
   - C1 current stars: "current count, excludes removed stars, includes any fake stars; not a launch result".
   - C2 star growth: "weekly buckets from the history endpoint; removals are invisible".
   - C3 views and clones: "14-day window, GitHub-reported uniques (undefined), clones are full clones only, automation included".
   - C4 referrers: "top 10 only, indicative; documented to exclude search yet shows Google and Bing".
   - C5 release-asset downloads: "includes installer scripts and CI; no documented definition".
   - C6 npm downloads: "HTTP 200 tarball responses including CI and mirrors".
   - C7 PyPI (pypistats): "known mirrors excluded, CI not, 180-day retention".
   - C8 crates.io: "CDN-log counts, batched, definition undocumented".
   - C9 Homebrew: "install operations incl. upgrades and reinstalls".
   - C10 Marketplace: "acquisitions as defined by the publisher page".
   - C11 Product Hunt / HN: "read-only venue outcome".
   Verification: the report cites a caveat id; a grep for `C[0-9]+` next to every number in the report. Rationale: the smallest set that is honest.
3. **GHSV-03 (MUST).** Never report star counts, Trending placement, Product Hunt points or HN score as the goal or the success measure of a launch. Rationale: unremovable fake stars, unpublished ranking formulas, venue rules against soliciting votes. Verification: the `goal.counter` field of the launch plan is not in {stars, trending, ph_points, hn_score}.
4. **GHSV-04 (MUST).** The two flagship repos (`ocx-sh/ocx`, `grimoire-rs/grimoire`) and any repo named by a launch plan's `counter` of C3 or C4 carry a traffic-archive workflow; the other fleet repos SHOULD. Rationale: the API holds 14 days only and the fleet has no archive. Verification: `ls .github/workflows` shows a workflow whose body contains `traffic/views` and `traffic/clones`; `gh workflow list` shows it enabled.
5. **GHSV-05 (MUST).** The archive workflow runs weekly on an off-minute cron, also has `workflow_dispatch`, writes raw JSON keyed by `timestamp`, and reads the API with a token whose permission has been tested on that repo. Rationale: 14-day window read every 7 days survives one miss; 60-day inactivity disables schedules. Verification: `grep -E "cron: .(([0-9]|[1-5][0-9]) )" workflow` is not `0 *`/`*/` hourly patterns; `gh run list --workflow <name> --limit 3` shows a success within the last 8 days.
6. **GHSV-06 (MUST).** Never create the archive secret; ask the owner. Rationale: a token with Administration read is a credential decision. Verification: the diff adds no secret value; the workflow references `secrets.<NAME>` only.
7. **GHSV-07 (MUST).** Do not call `/stargazers` for repos the actor does not administer, and do not write rules that depend on it. Rationale: restricted since 2026-06-30 notice; 404 measured. Verification: `grep -rn "repos/.*/stargazers\b" skills rules` shows only repos in the owned set, or use `/stargazers/count` and `/stargazers/history`.
8. **GHSV-08 (SHOULD).** Compute a star-anomaly flag from the history endpoint: a day above 5 times the median of the previous 30 daily values, and at least 10 stars that day. Rationale: cheap early warning for purchased or bursty stars on an owned repo. Verification: `gh api repos/<o>/<r>/stargazers/history --jq '[.[].days[]]'` then compare; owner calibrates the 5 and 10 (my proposal, not sourced).
9. **GHSV-09 (MUST).** A star call to action is plain, unconditional and reward-free. Allowed: "If this is useful to you, a star helps others find it." Banned: any ask conditional on a reward, discount, giveaway, access or a return star ("star to unlock", "star for a chance to win", "star-for-star", "star and I will star yours"). Rationale: AUP rank abuse and incentivised inauthentic engagement. Verification: `grep -rniE "(star|⭐).{0,40}(win|giveaway|raffle|unlock|discount|free|reward|airdrop|in return|for star|follow back)" README.md docs` returns nothing; reading heuristic: remove the star and the offer still stands.
10. **GHSV-10 (SHOULD).** Place at most one star ask per repo, in README or a release note, never in an issue reply, a PR comment or a social DM. Rationale: asks in threaded replies read as solicitation; keep it on owned surfaces. Verification: `grep -c -i "star" README.md` and a scan of issue/PR comments authored by the bot account.
11. **GHSV-11 (MUST).** Do not buy, trade, script or request stars, upvotes or Product Hunt support from a list of friends. Rationale: AUP, HN guidelines, 90.42% deletion rate of flagged repos in the study. Verification: any workflow, script or copy that calls `PUT /user/starred` for a repo it does not own, or any launch plan step "ask contacts to upvote", fails review.
12. **GHSV-12 (MUST).** Remove or replace any reference to ossinsight.io before 2026-12-04. Rationale: API stops, site read-only. Verification: `grep -rIn "ossinsight" . --exclude-dir=.git --exclude-dir=node_modules` returns nothing after that date.
13. **GHSV-13 (MUST).** No guidance may promise or schedule Trending, Explore or leaderboard placement. Rationale: ranking method unpublished. Verification: grep for `trending` in skill outputs yields only the sentence "GitHub does not publish the ranking method".
14. **GHSV-14 (MUST).** Report registry downloads as a 90-day daily series plus the count of zero days and the largest single day's share; flag any day above 5 times the median as a burst. Rationale: bursts on the fleet (579 and 535 on the same day) are machines. Verification: `curl -s https://api.npmjs.org/downloads/range/<start>:<end>/<pkg>` summarised with those three numbers.
15. **GHSV-15 (MUST).** Use a pre-launch baseline of 28 days of the same counter, read with the same command, before launch; compare launch-window values only to it. Rationale: with stars at 20 and 17 and 3 to 6 per week, no absolute number means anything without a baseline. Verification: the launch plan has `baseline_window` and `baseline_value` filled and a command.
16. **GHSV-16 (MUST).** The launch-plan field is exactly: `goal: <one sentence>`, `counter: <one id from GHSV-02 C1..C11>`, `read_command: <exact command>`, `baseline_window: 28 days ending the day before launch`, `target: <number>`, `read_on: <date>`. Product Hunt's own advice allows "one or two" goals; this catalog narrows it to one so the result is checkable. Verification: schema check of the front matter; exactly one `counter`.
17. **GHSV-17 (SHOULD).** Prefer the counters in this order for a developer tool: release-asset downloads for a specific version (C5), registry downloads (C6), unique clones and referrers (C3, C4), then stars (C1). Rationale: nearer to use, still imperfect. Verification: the plan's `counter` is C5 or C6 unless the owner approved otherwise.
18. **GHSV-18 (SHOULD).** Store each dated fact with `verified: <date>` and fail a staleness check above 90 days. Rationale: GitHub changed this surface twice in 2026 (restriction, history endpoint). Verification: grep of the facts file for `verified:` and a date diff.

## Dated facts

| Fact | Source URL | Date the source states | Source type |
|---|---|---|---|
| Traffic: 14 days, push access, full clones only, search engines and GitHub excluded from referrers, UTC+0 | [viewing traffic](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository) | none; fetched 2026-11-27 | platform |
| Traffic REST: views, clones, top-10 paths and referrers, per day or week, UTC midnight | [REST traffic](https://docs.github.com/en/rest/metrics/traffic) | none; fetched 2026-11-27 | platform |
| Traffic needs Administration read for PATs | [token permissions](https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens) | none; fetched 2026-11-27 | platform |
| Scheduled workflows: 5-minute minimum, default branch, disabled after 60 days of inactivity in public repos | [events that trigger workflows](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows) | none | platform |
| Events API: 30 days, 300 events, latency 30 s to 6 h | [events](https://docs.github.com/en/rest/activity/events) | none | platform |
| Stargazers listing limited to admins and collaborators | [changelog](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/) | 2026-06-30 (phases undated) | platform |
| Star history endpoint added; API version 2026-03-10 | [changelog](https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data) | 2026-09-04 | platform |
| History: 30 weeks per page, max page 100; count excludes removed stars | [starring REST](https://docs.github.com/en/rest/activity/starring) | none | platform |
| Fake stars: 3.81 million after postprocessing, 18,617 repositories, 301k accounts; 16.66% of 3,499 popular repos in July 2024; boost under two months | [arXiv 2412.13459](https://arxiv.org/html/2412.13459v2) | v1 2024-12-18, v2 2025-09-06 | independent study |
| AUP: automated starring is rank abuse; rewards that incentivise inauthentic engagement banned | [AUP](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) | no visible date | platform |
| OSS Insight shuts down | [FAQ](https://ossinsight.io/docs/faq) | 2026-12-04 (fetched 2026-11-27) | the service itself |
| npm download = HTTP 200 tarball response, includes CI and mirrors | [npm blog](https://blog.npmjs.org/post/92574016600/numeric-precision-matters-how-npm-download-counts-work.html) | 2014-07-22 | platform (historical; the current docs defer to it) |
| npm API: 18 months, bulk 365 days, 128 packages | [docs](https://raw.githubusercontent.com/npm/registry/main/docs/download-counts.md) | none | platform |
| pypistats: 180-day retention, known mirrors excluded | [pypistats](https://pypistats.org/about) | none | community service |
| PyPI BigQuery tables; 1 TB free monthly; counts "Highly inaccurate" | [guide](https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/) | none | platform |
| Homebrew: 365-day retention, operations not users | [Analytics](https://docs.brew.sh/Analytics) | none | platform |
| Product Hunt: goals "Pick one or two, and make them measurable" | [help](https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date) | "Updated over 3 weeks ago" | platform |
| Product Hunt leaderboard now shows points | [changelog](https://www.producthunt.com/changes) | December 11, year not in fetched text | platform |
| 75% of 791 developers check stars | [arXiv 1811.07643](https://arxiv.org/abs/1811.07643) | 2018-11-19 | independent study |
| Trending ranking method unpublished | [trending](https://github.com/trending) | fetched 2026-11-27 | platform |

## What an agent must not decide alone

- Creating the token or secret for the traffic archive, or choosing which account owns it (credential and security decision).
- Where archived data lives (a data branch, a separate repo, a bucket), because it may be made public.
- Whether to publish any traffic, clone or download number on a landing page or social post (brand and disclosure choice).
- The numeric launch target and the choice of counter for a launch plan.
- Whether to run any paid promotion, star campaign, giveaway or contact-list outreach (legal and brand risk).
- Whether to keep a Marketplace extension published or remove it, since removal deletes its statistics.
- Which owners calibrate the anomaly threshold in GHSV-08.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Calling `repos/<o>/<r>/stargazers` on a third-party repo to "audit stars" and treating the 404 or empty list as zero stars | Use `/stargazers/count` for any repo; list stargazers only on owned repos; fail the step on non-200 |
| Reporting the 14-day traffic numbers as "monthly" or "all time" | Print the first and last `timestamp` next to every figure |
| Summing release-asset `download_count` across releases and calling it "users" | Name the signal C5 and report per release |
| Presenting npm last-month as active users | Require C6 caveat and the zero-day count |
| Quoting OSS Insight or star-history widgets as sources after 2026-12-04 | `grep -rIn ossinsight` |
| Writing "star us to get featured" or "star to unlock" | GHSV-09 grep |
| Citing trending-hacking tactics (star bursts at midnight UTC) from memory | GHSV-13: no ranking promises; needs a source URL |
| Treating `uniques` as people | Replace with "GitHub-reported uniques" |
| Assuming `${{ github.token }}` reads traffic | Test with the real token on the real repo (`gh api .../traffic/views` must be 200) |
| Using the 2016-2018 star studies as causal evidence | Evidence grade "correlational, pre-agent era" |

## Contested / evolving

- Whether stars are a valid adoption proxy. For: 75% of surveyed developers check stars before use (Borges and Valente, 2018, survey of 791 developers); GitHub's own docs say rankings depend on stars. Against: the 2024 StarScout study shows 16.66% of popular repos in July 2024 had fake-star campaigns, and the authors say stars should not drive high-stakes decisions. Trend: GitHub restricted the listing (2026) and added an aggregate endpoint, so third-party verification is getting harder as of 2026-11-27.
- Whether CI and mirrors should be filtered out of download counts. npm says it counts them on purpose; PyPI tools expose installer and CI fields in BigQuery per third-party descriptions that I could not confirm on a platform page (the Packaging guide page fetched has no `details.ci` field). Both positions are visible; this catalog sides with reporting raw counts with caveats.
- The permission that traffic endpoints need: push access (user page), write access (REST page), Administration read (token page). Unresolved; test before relying.
- The referrer exclusion: the docs say search engines are excluded; measured referrers include Google and Bing. Either the docs are stale or the filter is partial.
- Stargazer restriction phases and the deprecation of `/users/{u}/subscriptions` have no dates (changelog 2026-06-30). Re-verify each quarter.

## Scout figures that failed to reproduce

- GH#22 states referrers exclude search; the API returned Google (ocx 3, grimoire 1) and Bing (grimoire 6). Fails to reproduce.
- GH#24 proposes a stargazer anomaly check with `gh api` stargazers and `starred_at`; this works only for admins and collaborators since the 2026 restriction, and the REST page documents no `starred_at` field in the stargazers section. Replaced by the history endpoint (GHSV-08).
- GH#23 and the audit date for OSS Insight (2026-12-04) reproduce. npm 5,353 and 1,127 reproduce exactly with the last-month window 2026-10-28..2026-11-26.
- GH#25 "boundary undocumented" holds: the AUP names rewards for inauthentic engagement, not a star ask.
- LP#36 (the 2020 postmortem with 3,000 visitors and 0 paying customers) was not fetched; not verified.
- AE#25 (UTM rules) is outside this territory and was not read.
- Sources I could not obtain: the crates.io data-access page body (only the title returned), the HN Algolia API documentation, a Product Hunt maker-dashboard help article, any VS Code Marketplace page that defines "install" versus "update".

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository | GitHub traffic user docs (primary) | undated, 2026-11-27 | the 14-day and referrer rules |
| https://docs.github.com/en/rest/metrics/traffic | traffic REST (primary) | undated | endpoints and limits |
| https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens | token permissions (primary) | undated | Administration read |
| https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows | Actions schedule (primary) | undated | cron limits and 60-day disable |
| https://docs.github.com/en/rest/activity/events | events API (primary) | undated | 30 days, 300 events |
| https://docs.github.com/en/rest/activity/starring | stargazers, count, history (primary) | API 2026-03-10 | new endpoints |
| https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/ | GitHub changelog (primary) | 2026-06-30 | stargazer restriction |
| https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data | GitHub changelog (primary) | 2026-09-04 | history endpoint |
| https://github.blog/engineering/architecture-optimization/from-2500-requests-to-24-rebuilding-star-history-without-the-stargazers/ | GitHub engineering post (primary) | 2026 | unstars drop out |
| https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies | AUP (primary) | undated | rank abuse, rewards |
| https://docs.github.com/en/get-started/exploring-projects-on-github/saving-repositories-with-stars | stars doc (primary) | undated | stars drive rankings |
| https://docs.github.com/en/rest/releases/assets | release assets REST (primary) | undated | download_count undefined |
| https://github.com/trending | Trending page (primary) | 2026-11-27 | no ranking method |
| https://arxiv.org/abs/2412.13459 and https://arxiv.org/html/2412.13459v2 | StarScout fake-stars paper | 2024-12-18, v2 2025-09-06 | numbers on fake stars |
| https://arxiv.org/abs/1811.07643 | stars survey | 2018-11-19 | 75% of developers check stars |
| https://arxiv.org/abs/1606.04984 | star popularity factors | 2016 | growth patterns (dated) |
| https://ossinsight.io/docs/faq | OSS Insight shutdown notice (primary) | 2026-12-04 | shutdown and star differences |
| https://raw.githubusercontent.com/npm/registry/main/docs/download-counts.md | npm download API (primary) | undated | limits |
| https://blog.npmjs.org/post/92574016600/numeric-precision-matters-how-npm-download-counts-work.html | npm blog (primary) | 2014-07-22 | definition of a download |
| https://pypistats.org/api/ and https://pypistats.org/about | pypistats | undated | 180 days, mirrors |
| https://docs.pypi.org/api/bigquery/ | PyPI BigQuery (primary) | undated | tables |
| https://packaging.python.org/en/latest/guides/analyzing-pypi-package-downloads/ | Packaging guide (primary) | undated | "Highly inaccurate" |
| https://github.com/rust-lang/crates.io/blob/main/docs/ARCHITECTURE.md | crates.io architecture (primary) | undated | how downloads are counted |
| https://docs.brew.sh/Analytics | Homebrew analytics (primary) | undated | operations not users |
| https://formulae.brew.sh/analytics/ | Homebrew analytics data (primary) | undated | JSON windows |
| https://code.visualstudio.com/api/working-with-extensions/publishing-extension | VS Code publishing (primary) | undated | acquisition trend |
| https://help.producthunt.com/en/articles/17734355-3-set-your-goals-and-pick-your-launch-date | Product Hunt help (primary) | undated | one or two goals |
| https://www.producthunt.com/changes | Product Hunt changelog (primary) | December 11, year not shown | points replace upvotes |
| https://news.ycombinator.com/newsguidelines.html and https://news.ycombinator.com/showhn.html | HN rules (primary) | undated | no soliciting upvotes |
| https://github.com/HackerNews/API | HN item API (primary) | undated | score, descendants |
| https://tenable.com/blog/how-cyberattackers-inflate-malicious-package-npm-download-counts | vendor security blog (vendor data; seen in search result only) | undated | download pumping |

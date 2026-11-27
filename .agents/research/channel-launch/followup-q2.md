---
title: Measured launch outcomes beyond stars, Show HN versus Product Hunt versus DevHunt
program: product
topic: channel-launch
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
---

# Measured launch outcomes beyond stars, Show HN versus Product Hunt versus DevHunt

## Question

Is there any measured outcome beyond stars (installs, retained users, contributors) for a developer CLI launched on Show HN versus Product Hunt (PH) versus DevHunt?

## Answer

**Partly, and only for Show HN, and not for a CLI and not as a venue comparison.** No source compares two or more of the three venues on installs, retained users or contributors for a developer CLI. One peer-posted study measures a non-star outcome for one venue:

- [arXiv 2506.12643](https://arxiv.org/abs/2506.12643) (Meakpaiboonwattana et al., v1 submitted 14 June 2025, no later version listed). It studied 2,195 HN stories and the 1,814 associated GitHub repositories of AI projects. Operative result, fetched from the HTML full text on 2026-11-27: the paper compares "the values of each metric one month before (control group) and one month after HN submission (treatment group)", keeps 163 GitHub AI projects older than six months, and reports "statistically significant increases" with p = 0.001 for stars, p = 0.004 for forks and p = 0.021 for contributors, using a Wilcoxon signed-rank test. Contributors are defined as "The project's new contributors." The paper gives no median or mean change for these three metrics. It does not cover downloads, installs, CLIs, PH or DevHunt. It names its own limit: "The findings may not be generalized to other social news aggregators such as Reddit." This replaces the earlier version of this file, which said no contributor measurement existed. The earlier statement was wrong.
- [arXiv 2511.04453](https://arxiv.org/html/2511.04453v1) (v1 dated 06 Nov 2025 in the arXiv header; the page body also shows "August 24, 2026", which conflicts and was not resolved) measures stars only, 138 HN-to-repository pairs, 137 valid time series. Limits quoted: "our observational design does not allow us to establish causation" and stars "represent only one aspect of project success". On PH: "The event study framework applies equally well to Product Hunt launches, arXiv paper releases, or Twitter viral moments." That is an untested claim.
- [arXiv 2603.07919](https://arxiv.org/abs/2603.07919) (Shen and Sood, 9 March 2026) is the one controlled experiment on installs. Two field experiments (bought GitHub stars; manipulated human downloads) on new Python packages. Result quoted: "We find no discernible impact on downloads". It tests whether social proof moves downloads, not whether a launch venue does. It is a reason to doubt that a star spike turns into installs, and nothing more.

For DevHunt, the only quantified outcome claim is the venue's own, and its source page could not be fetched (see "DevHunt" below). No independent measured DevHunt outcome exists in anything fetched.

## Search log (the negative result, re-runnable)

All run with the WebSearch tool, standard mode, on 2026-11-27. "Links" is the number of result links the tool returned. A search result is not a source; every claim below rests on a fetched page.

| # | Query string | Links | Outcome |
|---|---|---|---|
| S1 | `DevHunt launch results developer tool installs users after launch` | 16 | no independent install or user numbers; DevHunt's own pages only |
| S2 | `devhunt.org blog "2-5x" more stars downloads launching on DevHunt` | 16 | vendor claim located; its page returned HTTP 410 on fetch |
| S3 | `DevHunt vs Product Hunt vs Hacker News launch results developer CLI npm downloads GitHub stars comparison` | 17 | no head-to-head numbers |
| S4 | `launched on Show HN and Product Hunt open source CLI weekly downloads contributors retained users after launch` | 17 | anecdotes only (CodeYam, others unfetched) |
| S5 | `DevHunt launch case study stars downloads before after` | 16 | vendor claim only; no independent before and after |
| S6 | `Hacker News front page effect on package downloads study npm PyPI after Show HN` | 18 | led to arXiv 2506.12643, 2511.04453, 2603.07919 |
| S7 | `npm download counts inflated by bots mirrors CI not real installs open source` | 15 | led to the npm blog and Tenable pages fetched below |

Auditing step: re-run S1 to S5 and open the first non-DevHunt, non-vendor result for each; the conclusion fails if any shows a dated, same-metric comparison of two of the three venues.

## DevHunt: what the primary pages say

| Page (fetched 2026-11-27) | Date on page | What it says |
|---|---|---|
| [DevHunt blog index](https://devhunt.org/blog) | 15 of 95 posts listed, newest Nov 15, 2026 | No post title in the listed 15 is a launch outcome or case study. Posts 16 to 95 were not read. |
| [DevHunt, open-source web tools post](https://devhunt.org/blog/open-source-web-tools-propel-devhunts-developer-launch-platform) | Sep 16, 2025 | Qualitative only. Names Chart.js ("received great feedback and promotion to React developers") and others. No stars, downloads, installs or "2-5x". |
| [DevHunt launch guide](https://devhunt.org/blog/tools-developers-guide-launches-on-devhunt) | Published Dec 24, 2025, updated Oct 11, 2026 | No outcome numbers. Launch is $49 one time, a free listing carries a nofollow link, launch weeks start Tuesday, voting closes end of Monday UTC. The page labels its price table "as of October 2026" and its FAQ "as of November 2026"; the two disagree. |
| [DevHunt about page](https://devhunt.org/the-story) | footer "2026" only | Vendor counters: "200K+ Visits from developers", "10K+ Upvotes casted", "1000+ Dev Tools launched", "10k+ Registered users visit weekly". No outcome per launched tool. |
| `devhunt.org/blog/dev-tools-launch-on-breakthrough-devhunt-platform` (search lists "Published Oct 21, 2023") | not readable | `curl -sL -A "Mozilla/5.0" -o dh.html -w "%{http_code} %{size_download}\n" <url>` printed `410 175`. The Wayback availability API printed `"archived_snapshots": {}`; a direct Wayback fetch printed `429 1867`; the fetch tool refuses web.archive.org. |

The search-result summaries for S2 and S5 say that this 2023 post claims "2-5x more stars and downloads versus launching solo", cites React-Charts, and says React-Charts had "a 5x increase in GitHub stars within a month". I could not read the page, so this is the vendor's claim as relayed by a search summary. It is labelled vendor data, unfetched, and no rule rests on it. Even as relayed, it names no sample, no period and no method.

Independent DevHunt writing fetched here carries no outcome numbers: [Radchenko, "Roast: Launching on DevHunt Doesn't Work?"](https://dev.to/radchenko/roast-launching-on-devhunt-doesnt-work-heres-what-i-found-hli) (published Nov 19, 2024) reports no visits, upvotes, stars or installs, and calls DevHunt's engagement minimal; [Radchenko, "DevHunt Weekly: Unfair Rankings"](https://dev.to/radchenko/devhunt-weekly-unfair-rankings-or-just-a-glitch-m5o) (Nov 26, 2024, edited Apr 23, 2025) reports only vote placement and a platform metric of 2,896 versus 1,362 impressions on the voting page, not product outcomes.

### The Livecycle interview, corrected

The earlier version of this file said the "years versus three days" comparison came from the DevHunt founder. The fetch shows otherwise. [Livecycle, "Under the Hood at DevHunt"](https://dev.to/livecycle/under-the-hood-at-devhunt-94j) (published 2023-12-26 per the DEV API, `"published_at": "2023-12-26T07:36:33Z"`, author Zevi Reinitz for Livecycle) says in its body: "Beyond the initial launch, winning on DevHunt means you stay on the home page for years." The "3 days" line is a reader comment by John Rush dated January 10, 2024: "when you get #1 on PH, you just get 3 days of traffic." The page prints no visitor, install, signup or star figure for DevHunt. Neither statement is a measurement.

## Reports found (all self-reports or vendor data)

Publication dates below were checked this pass against the DEV public API (`curl -s "https://dev.to/api/articles/<user>/<slug>"` or `?username=<user>`), which returns a machine-readable `published_at`. This closes the earlier "year inferred" and "year not shown" gaps.

| Source (published) | Venue | Product | Outcome reported | Not reported |
|---|---|---|---|---|
| [ddltodata](https://dev.to/ddltodata/how-my-first-hacker-news-launch-went-and-what-i-did-about-it-40k9) (2026-01-11, API) | Show HN, #8 | Web app that makes test data from SQL schemas, not a CLI | About 1,000 visitors in 24 h, 425 demo tries, 382 completions, 3 signups, 0 purchases | stars, retention |
| [cmux blog](https://cmux.com/blog/show-hn-launch) (2026-02-21, as fetched in the first pass) | Show HN, peak #2 | macOS terminal app for coding agents, not a CLI | Star chart "near 0 to 900+ stars after the Show HN launch" | downloads, users, contributors, window |
| [agmsg](https://dev.to/fujibee/lessons-from-open-sourcing-a-cli-agent-messaging-layer-320-stars-in-a-week-1b75) (2026-06-04, API) | Show HN attempted and killed by the spam filter; stars from other channels | CLI agent messaging layer | Stars 5 to 320 in a week, forks 0 to 15, 3 derivative projects, first English post "~3.6K impressions" and "basically no conversion" | installs, retention, PR count |
| [krit83](https://dev.to/krit83/i-launched-an-open-source-cli-tool-with-zero-audience-heres-what-happened-in-10-days-1d6g) (2026-04-11, API) | LinkedIn, dev.to, a Show HN, r/python, mixed | Open-source CLI | After 10 days: 557 clones from 202 unique cloners, 100 unique repo visitors | stars, downloads, contributors; no split by venue |
| [CodeYam, PH forum post](https://www.producthunt.com/p/general/what-i-learned-launching-codeyam-cli-memory-on-show-hn-and-product-hunt) and [author blog](https://blog.nseldeib.com/p/what-i-learned-launching-codeyam) (2026-03-13, first pass) | Show HN and PH | CLI and memory tool, the only both-venue case | PH about 80 upvotes, #13 (blog) or #17 (forum post) | no installs, retention or contributor count for either venue |
| [Corbado](https://www.corbado.com/blog/launch-developer-tool-product-hunt) (2024-02-26; launch 2024-01-25, first pass) | PH, #4 of the day | Authentication product, vendor post | "2x the traffic", "4x the amount of usual daily signups" | retention, installs, stars |
| [dlt on HN, dev.to](https://dev.to/dlt-library/what-can-you-expect-from-a-hackernews-launch-967) (2023-10-27, page) | Show HN | Python library, vendor post, not a CLI | Stars 520 to "670+" in 48 h; GitHub traffic about 20x a normal day; site traffic about 3x; about 10 new Slack members | downloads, installs, contributors, retention |
| [Gary Sieling](https://dev.to/garysieling/what-the-hacker-news-front-page-did-for-my-app) (2017-06-06, page) | HN front page | Web app | About 50 concurrent users while on the front page; about 75 recommendations and 15 issues from readers; half of email signups completed a feedback form | totals, installs, retention |
| [PH forum thread](https://www.producthunt.com/p/general/what-actually-happened-after-your-launch) (page shows "1yr ago"; see gap) | PH | Unspecified | Two replies: "The Product Hunt launch effect lasted for 24-48 hours."; "The spike just lasted 24-48hrs. Then nothing."; one reports no sales | counts; no CLI |
| [Davidb31](https://dev.to/davidb31/beyond-github-stars-tracking-real-adoption-of-my-open-source-projects-g29) (2026-03-25, API) | None | Own open-source projects | No launch. "Unexplained spike in December 2025 / January 2026. No new release. No announcement" for one project, "Nearly zero downloads even after new releases" for another | everything launch-related |

What the rows show, without ranking venues:

- Only CodeYam spans two of the three venues and prints no outcome count for either. DevHunt appears in no outcome report.
- The non-star counters that CLI-class sources print are clones and unique cloners (krit83) and forks (agmsg). These match GHSV counters C3 and C4 and the fork count.
- Reports that measure conversion (ddltodata, agmsg) find large reach and almost no conversion. Each is one case.

## The Cambridge paper, read this time

The earlier version held only a search snippet ("about 2.43% lower fundraising probability per rank step") and called the PDF unreadable. The snippet was wrong. Route that worked: `curl -sL -o cao.pdf <url>` returned `200 3595797 application/pdf`, then `uv run --no-project --with pypdf python -I -c "import pypdf; r=pypdf.PdfReader('cao.pdf'); ..."` printed `58` pages and `135506` characters of text. `grep -n -E "2\.43|9\.5%" cao.txt` located the passages.

The paper is Ruiqing Cao, "Information Frictions in New Venture Finance: Evidence from Product Hunt Rankings", dated June 22, 2019 on its title page, Department of Economics, Harvard, hosted on the [Cambridge Judge Business School site](https://www.jbs.cam.ac.uk/wp-content/uploads/2020/08/paper-cao-informationfrictions.pdf). Operative passage (lines 95 to 98 of the extracted text): "each downward shift in rankings induced by the instruments leads to a decline in the probability of raising seed (including convertible note) and series A rounds by 0.23 percentage points within 6 months, or a 9.5% decline upon the average fundraising probability of 2.43%." So 2.43% is the baseline fundraising probability, not a per-rank-step effect. The outcome is venture funding within 6 months. The paper has no installs, retention or contributor measure (its only GitHub mention is as an example of a non-startup site). It does not answer the question and no rule uses it.

## Download counts are not installs

Both claims were fetched this pass.

- [npm blog, "numeric precision matters: how npm download counts work"](https://blog.npmjs.org/post/92574016600/numeric-precision-matters-how-npm-download-counts-work.html), published July 22, 2014 (vendor, old, blog since discontinued): the figures are "simply a count of the number of HTTP 200 responses we served that were tarball files" and include automated build servers and mirrors.
- [Tenable, download pumping](https://tenable.com/blog/how-cyberattackers-inflate-malicious-package-npm-download-counts) (page shows May 28, 2026; security vendor): "each version uploaded to the npm public registry typically receives between 100 and 150 downloads from automated systems", and one malicious package "reached more than 50,000 downloads in three days" after more than 700 uploaded versions. This is about malicious packages; it shows that mirrors and bots inflate raw counts, not that launches do.

Consequence: a raw npm or PyPI download count is a weak stand-in for installs, and the only non-star counters in CLI launch reports remain clones, unique cloners and forks.

## Effect on the ruleset

| Rule | Effect | Text or reason |
|---|---|---|
| CH-LAUNCH-08 (venue order, SHOULD) | confirm | No source here ranks venues on any outcome. The order stays practice-based. |
| CH-LAUNCH-04 (venue admission) | confirm | No outcome data separates DevHunt from Show HN or PH, so admission stays driven by the scope-sentence check. |
| CH-LAUNCH-11 (one numeric goal) | change | Append to the rationale: "Only one study measures a non-star outcome for a launch venue (arXiv 2506.12643, Show HN, AI repositories, one month before versus after: forks and new contributors rose significantly, no effect sizes printed). For a CLI, the only non-star counters printed in launch reports are unique cloners or clones (GHSV C3/C4) and forks. A controlled experiment found no effect of stars on downloads (arXiv 2603.07919)." Append to the verification: "A goal or forecast that attributes an expected number to a venue cites a source dated within 12 months that measures it, or carries the label `forecast, no source`." Severity stays SHOULD. |
| CH-LAUNCH-16 (NEW) | new | Below. |

### CH-LAUNCH-16 (new)

- **Rule:** Never write into a launch plan, venue ranking or launch draft that one venue produces more installs, retained users, contributors, signups or stars than another, and never attach an expected number to a venue, unless the same line carries an `https://` link to a source that measures it, the word `measured`, and a `YYYY-MM` date within 12 months. Otherwise rank venues only by entry gate, scope match and staffing cost, and label every expected-outcome number `forecast, no source`.
- **Rationale:** On 2026-11-27 no fetched source compares Show HN, PH and DevHunt on any outcome (this file). The only venue-effect study is HN-only and AI-repository-only. The fleet's own grim 1.0 plan forecasts "roughly **200-800 stars**" with no source (`research_promotion_positioning.md:389`) and ranks ten venues with "Highest leverage" and no source (line 367, `| 2 | **Show HN** | launch day | Highest leverage, effectively one-shot.`). Agents that recall advice will state venue effects as fact.
- **Severity:** SHOULD.
- **Verification:** run the filter below on the plan file; the rule passes only when it prints nothing.

```sh
R1='(more|higher|better|best|outperform)[^.]{0,40}(installs|signups|conversion|retention|contributors|downloads)'
R2='(roughly|expect|about|~)[^.|]{0,20}[0-9]+([–-][0-9]+)?[^.|]{0,12}(stars|installs|signups|downloads|contributors)'
grep -niE "$R1|$R2" PLAN.md | grep -vE 'forecast, no source|https://[^ ]*.*measured.*20[0-9]{2}-[0-9]{2}|measured.*https://[^ ]*.*20[0-9]{2}-[0-9]{2}'
```

Measured run of this filter (scratch directory `~/.cache/research-lang/exemplars/product/wave2/q2/`, three inputs):

| Input | Output |
|---|---|
| the real plan `grimoire-rs/grimoire/.agents/research/research_promotion_positioning.md` | `389:roughly **200–800 stars**, a handful of external issues, and one or two people` (fires) |
| `sample_fail.md`: three rows ("Gets more installs than Product Hunt for CLIs"; "Higher retention among contributors, expect 500 downloads"; "Expect roughly 200-800 installs") | all three lines printed (fires) |
| `sample_pass.md`: a row with `measured: https://arxiv.org/abs/0000.00000 (2026-05-01)` and a row labelled `(forecast, no source)` | no output, exit status 1 (passes) |

Two defects found while running it, both fixed in the text above. First, my earlier grep (R1 alone, without the stars pattern) printed nothing on the real plan (`exit=1`), so it would have missed the very line the rule cites. R2 adds the forecast-number pattern. Second, R1 alone also printed the passing sample line, because the exemption was described in prose and not implemented; the trailing `grep -vE` implements it. The "Highest leverage" line at 367 is not caught by either pattern; it is a ranking claim without a number, so the rule's prose covers it and the grep does not. A reviewer applies the prose for that case.

## Dated facts

- 2014-07-22: npm blog explains that download counts include automated build servers and mirrors.
- 2019-06-22: Cao working paper date (title page); funding outcome, 9.5% relative, baseline 2.43%.
- 2023-12-26: Livecycle interview with DevHunt published; comment dated 2024-01-10.
- 2024-11-19 and 2024-11-26: Radchenko DevHunt posts.
- 2025-06-14: arXiv 2506.12643 v1 (HN, forks/stars/contributors).
- 2025-09-16, 2025-12-24 (updated 2026-10-11): DevHunt blog posts; no outcome numbers.
- 2025-11-06: arXiv 2511.04453 v1 (header; page body also shows 2026-08-24).
- 2026-03-09: arXiv 2603.07919 v1 (no effect of stars on downloads).
- 2026-01-11, 2026-04-11, 2026-06-04, 2026-03-25: ddltodata, krit83, agmsg, Davidb31 (DEV API `published_at`).
- 2026-05-28: date shown on the Tenable page.
- 2026-11-27: every fetch in this file.

## What could not be determined

- **A venue-to-venue comparison on installs, retained users or contributors for a developer CLI.** Missing: a dataset joining launch events to package-registry download series and GitHub contributor history for a sample of CLIs. PH data needs an authenticated API token; no DevHunt launch list was found. Not built here: it exceeds a bounded follow-up and needs a credential.
- **Effect sizes in arXiv 2506.12643.** The HTML text gives p-values only; whether the tested values are levels or monthly changes is unclear in the paper itself. Missing: the paper's tables or data package.
- **The DevHunt 2023 post** (`devhunt.org/blog/dev-tools-launch-on-breakthrough-devhunt-platform`): HTTP 410 live, no Wayback snapshot (`archived_snapshots` empty), Wayback fetch blocked. The "2-5x" and React-Charts claims remain unread vendor claims. Missing: an archived copy.
- **DevHunt blog posts 16 to 95.** Only the first page of 15 was read.
- **The exact date of the PH forum thread.** The page shows only "1yr ago" and a direct `curl` returned HTTP 403, so the date resolves to about late 2025 and no better. Missing: the thread's creation timestamp.
- **CodeYam's install counts.** The author's blog names npm installs as an indicator and prints no figure.
- **The cmux, CodeYam and Corbado pages** were fetched in the first pass and not re-fetched in this repair pass; their dates are carried from that pass.

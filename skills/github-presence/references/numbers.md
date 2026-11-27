---
title: Numbers a team may report
summary: The CH-GH rows for stars, traffic, downloads and launch counters, the signal table, the traffic archive and the rules against inflating a count
---

# Numbers a team may report

Owns which GitHub and registry numbers a report may quote, in what form, and what an agent never does to move them. Rows CH-GH-23 to CH-GH-28, CH-GH-31 and CH-GH-32. The launch plan's own schema belongs to the `launch-plan` skill, which takes its counter list from the signal table here.

Contents: [Dates and versions](#dates-and-versions) · [Signal table](#signal-table) ·
[Rows](#rows) · [Check commands](#check-commands) · [The traffic archive](#the-traffic-archive) ·
[Ask the owner](#ask-the-owner) · [What agents get wrong](#what-agents-get-wrong)

## Dates and versions

Facts live in `facts.md`, fetched 2026-11-27: the 14-day traffic window [GH-F07], the schedule pause and hourly load [GH-F08], [GH-F09], the stargazer list restriction and the history endpoint [GH-F10], [GH-F11], the acceptable use clauses [GH-F12], [GH-F13], the asset counter [GH-F19], the npm download definition [NP-F04], fake-star measurements [ST-F01], [ST-F02], and the OSS Insight shutdown [OI-F01].

- **CH-GH-28 expires on 2026-12-05.** OSS Insight shuts down on 2026-12-04 [OI-F01]. On 2026-12-05 retire the row and keep one permanent line: never cite OSS Insight or star-history widgets from memory.
- **Catalog norms, not platform facts:** the report form of CH-GH-23, the 90-day series of CH-GH-31, the counter order and 28-day baseline of CH-GH-32.
- **Documented gap.** GitHub's pages name three different permission levels for the traffic endpoints (push access, write access, and Administration read). Only a test with the real token settles which one works.
- The Trending ranking method is unpublished, and the Hacker News guidelines forbid soliciting votes. Re-read both before a launch plan names either.
- Re-check this file at every refresh, and whenever GitHub changes an API version.

Placeholders in commands: `R` is `OWNER/REPO`, `PKG` an npm package name, `REPORT` and `PLAN` files, `W` the archive workflow file.

## Signal table

A report cites the id. The caveat travels with every figure.

| Id | Signal | Caveat that travels with every figure | Read command |
|---|---|---|---|
| C1 | Current stars | Current count only; removals excluded; fake stars included [ST-F01]; never a launch result | `gh api repos/"$R"/stargazers/count` |
| C2 | Star growth | Weekly buckets from the history endpoint [GH-F11]; removed stars are invisible | `gh api repos/"$R"/stargazers/history` |
| C3 | Views and clones | 14-day window [GH-F07]; "GitHub-reported uniques", which are undefined; clones are full clones only; automation included | `gh api repos/"$R"/traffic/views` and `gh api repos/"$R"/traffic/clones` |
| C4 | Referrers | Top 10 only, and indicative only: the docs say search engines are excluded, yet two measured flagships showed Google and Bing | `gh api repos/"$R"/traffic/popular/referrers` |
| C5 | Release-asset downloads | Per release; includes installer scripts and CI; no documented definition [GH-F19]; checksum sidecar files were fetched at 48% of their tarball's rate on one measured project, which points to machines | `gh api repos/"$R"/releases/tags/TAG --jq '.assets[].download_count'` |
| C6 | npm downloads | HTTP 200 tarball responses, including CI and mirrors [NP-F04] | `curl -s https://api.npmjs.org/downloads/range/START:END/"$PKG"` |
| C7 | PyPI downloads (pypistats) | Known mirrors excluded, CI not; 180-day retention; the PyPA guide calls the counts highly inaccurate. Unverified: no source page recorded | `https://pypistats.org/api/packages/NAME/overall` |
| C8 | crates.io downloads | CDN-log counts added in batches; definition undocumented. Unverified: no source page recorded | `https://crates.io/api/v1/crates/NAME/downloads` |
| C9 | Homebrew installs | Install operations, including upgrades and reinstalls. Unverified: no source page recorded | `https://formulae.brew.sh/api/analytics/install/homebrew-core/30d.json` |
| C10 | Marketplace acquisitions | As the publisher page defines them; install versus update not documented. Unverified: no source page recorded | publisher management page |
| C11 | Product Hunt points, Hacker News score | A venue outcome to read, never a goal | venue page or the Hacker News item API |

Read each of C7 to C10's own documentation before quoting one of them.

## Rows

When a Verification cell names several checks, the row passes only when every one passes. "Catalog norm" marks a value this catalog chose.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-GH-23 | Report a GitHub or registry number only in the form `NUMBER (ID, WINDOW, read YYYY-MM-DD)`, where ID is one of C1 to C11, and put the read command in the report's method list. Never call such a number users, adopters, people or active users. Call it installs only for C9. The 90-day series for C6 to C8 is CH-GH-31. | Catalog norm, not platform fact. It rests on the documented counter definitions: npm counts every HTTP 200 tarball response [NP-F04], asset `download_count` has no definition [GH-F19], and traffic is a 14-day window [GH-F07]. | See block CH-GH-23: both greps print nothing. Pass: "mytool v1.2.0 release-asset downloads 3,485 (C5, all time, read 2026-11-27)". Fail: "3,485 users run mytool". | MUST |
| CH-GH-24 | Never set stars, Trending placement, Product Hunt points or Hacker News score as a launch goal or success measure. Every launch plan carries front matter with at least `counter`, `read_command` and `baseline_window`. Until the `launch-plan` skill publishes its schema, these three keys are the minimum it may add to and not drop. | Fake stars cannot be removed from a count [ST-F01], [ST-F02]. The Trending method is unpublished, and Hacker News forbids soliciting votes. | See block CH-GH-24. The first grep prints 3. The second prints nothing unless the plan sets `owner_approved_counter: true`. | MUST |
| CH-GH-25 | Give each flagship repository, and any repository whose C3 or C4 a launch plan names, a traffic-archive workflow. It reads `traffic/views` and `traffic/clones`, runs weekly on a cron whose minute is not 0 (for example `17 4 * * 1`), has `workflow_dispatch`, stores the raw JSON next to the read date, and reads its token only from `secrets.NAME`. The agent never creates the secret. Creating and testing it is an owner action. | The API holds 14 days [GH-F07]. A weekly read of a 14-day window survives one missed run. High load times include the start of every hour [GH-F09], and a public repository's schedule is disabled after 60 days with no activity [GH-F08]. | See block CH-GH-25 for the workflow lint. After the owner says the secret exists, run `gh workflow run` on it and report the conclusion of its latest run. Until then report "archive: awaiting owner secret", which is not a failure of this rule. | MUST |
| CH-GH-26 | Call the stargazers list endpoint only on a repository the actor administers. For any other repository use the count and history endpoints. Treat a 404 as "not permitted", never as zero. | GitHub restricted the list to admins and collaborators [GH-F10] and added the history endpoint [GH-F11]. The list returned 404 on a large public repository on 2026-11-27. | See block CH-GH-26: every hit is an owned repository. The step fails on any non-200 response. | MUST |
| CH-GH-27 | Make a star ask plain and unconditional, with no reward, exchange or giveaway. Never buy, trade, script or coordinate stars, upvotes or Product Hunt support. | The acceptable use policy bans rank abuse and rewarded engagement [GH-F12], [GH-F13]. In the StarScout study 90.42% of repositories flagged for fake stars were deleted, against a 5.03% baseline [ST-F02]. | See block CH-GH-27: all three print nothing. The boundaries keep `start` out, and `free` is not in the list, so "free and open-source, star the repo" passes. | MUST |
| CH-GH-28 | Remove every link to ossinsight.io, its API and its widgets. This row expires on 2026-12-05: retire it then, and keep failure mode 4 below as a permanent "do not cite" line. | OSS Insight shuts down on 2026-12-04 and its API stops [OI-F01]. | See block CH-GH-28: it prints nothing. | MUST until 2026-12-05 |
| CH-GH-31 | For C6 to C8, report a 90-day daily series, the count of zero days and the largest single day's share of the 90-day total. | Catalog norm. Its only support is one measurement: two unrelated npm packages peaked on the same day. No external source sets the 90-day window. A burst threshold of 5 times the median stays out, because it is unsourced. | The report has the three figures, each in the CH-GH-23 form. See block CH-GH-31 for the npm series. | SHOULD |
| CH-GH-32 | Choose a launch counter in this order: C5, then C6, then C3 or C4. Use C1 only with owner approval. Read the baseline over 28 days ending the day before launch, with the same command as the launch-window read. | Catalog norm. The order puts the counter nearest to actual use first, and every counter is still imperfect. 28 days is a catalog choice, not a sourced figure. | See block CH-GH-32: the counter line matches, or `owner_approved_counter: true` is set, and the baseline line matches. | SHOULD |

Overlaps, each resolved in favour of the row that owns the surface. CH-GH-23 owns the reporting form of a number. The `marketing-quality` rule owns a count on a copy surface (MKT-CLAIM-24) and the ban on calling a count users in copy (MKT-MEAS-14). CH-GH-25 owns the traffic archive, so a second archive row elsewhere is merged into it. CH-GH-27 covers star asks in a repository's README, docs and workflows; each venue keeps its own solicitation row in `community-post`, `launch-plan` and `linkedin-post`.

## Check commands

```sh
# CH-GH-23, check 1: lines that carry a number and a counter word but not the report form
grep -niE '(star|download|view|clone|install|acquisition|referrer|upvote|point|score)' REPORT | grep -E '[0-9]' | grep -vE '[0-9][0-9,.]*[kKmM]? \(C([1-9]|1[01]), [^)]+, read [0-9]{4}-[0-9]{2}-[0-9]{2}\)'
# CH-GH-23, check 2: a count called people
grep -niwE '[0-9][0-9,.]*[kKmM]? (users|adopters|people|active users)' REPORT
# CH-GH-24
grep -cE '^(counter|read_command|baseline_window): .+' PLAN
grep -iE '^counter: *(C1|C11|trending|stars)([^A-Za-z0-9]|$)' PLAN
grep -E '^owner_approved_counter: true' PLAN
# CH-GH-25: find the workflow W, then each line must exit 0 except the last, which must exit 1
git ls-files -z -- ':(glob).github/workflows/*.yml' | xargs -0 -r grep -l -e 'traffic/views' --
grep -q -e 'traffic/clones' -- "$W"
grep -qE "cron: *['\"]?([1-9]|[1-5][0-9]) [0-9]{1,2} \* \* [0-6]['\"]?" -- "$W"
grep -q -e 'workflow_dispatch' -- "$W"
grep -qE 'secrets\.[A-Z_]+' -- "$W"
grep -qE 'ghp_|github_pat_|gho_' -- "$W"
# CH-GH-26: any hit must be a repository the actor administers
git ls-files -z -- ':(glob)skills/**' ':(glob)rules/**' ':(glob).github/**' | xargs -0 -r grep -H -n -E -e 'repos/[^ ]+/stargazers([^/]|$)' --
# CH-GH-27: three checks, all print nothing
git ls-files -z -- ':(glob)README.md' ':(glob)docs/**/*.md' | xargs -0 -r grep -H -n -i -E -e '(^|[^[:alnum:]_])star(s|red|ring)?[^[:alnum:]_](.{0,40}[^[:alnum:]_])?(win|giveaway|raffle|unlock|discount|reward|airdrop|in return|for a star|follow back)([^[:alnum:]_]|$)' --
git ls-files -z -- ':(glob)README.md' ':(glob)docs/**/*.md' | xargs -0 -r grep -H -n -E -e '⭐(.{0,40}[^[:alnum:]_])?(win|giveaway|raffle|unlock|discount|reward|airdrop|in return|follow back)([^[:alnum:]_]|$)' --
git ls-files -z -- ':(glob).github/workflows/*.yml' | xargs -0 -r grep -H -n -e 'user/starred' --
# CH-GH-28: this skill names the service on purpose, so skip its own files
git ls-files -z -- ':(exclude,glob).agents/**' ':(exclude,glob)**/github-presence/**' | xargs -0 -r grep -H -n -i -e 'ossinsight' --
# CH-GH-31: the two dates for a 90-day npm series, then the read
python3 -I -c "import datetime as d;t=d.date.today();print(t-d.timedelta(89),t)"
curl -s https://api.npmjs.org/downloads/range/START:END/"$PKG"
# CH-GH-32
grep -E '^counter: *(C5|C6|C3|C4)([^A-Za-z0-9]|$)' PLAN
grep -E '^baseline_window: 28 days' PLAN
```

Plan front matter, as the minimum CH-GH-24 reads:

```yaml
goal: one sentence
counter: C5
read_command: gh api repos/example/mytool/releases/tags/v1.2.0 --jq '.assets[].download_count'
baseline_window: 28 days ending 2026-12-01
owner_approved_counter: false
```

## The traffic archive

Traffic data lives 14 days [GH-F07], so a weekly archive is the only way to answer a question about a month. A docs-quality row that asks for a nonzero traffic number for 30 consecutive days can meet that clause only from this archive.

The workflow below is a skeleton the CH-GH-25 lint accepts. It reads the two endpoints and leaves storage open, because where the archive lives (a branch, a private repository, an artifact store) and whether it may become public is the owner's decision. `TRAFFIC_TOKEN` is a secret the owner creates and tests. The agent names it and never creates it.

```yaml
name: traffic-archive
on:
  schedule:
    - cron: '17 4 * * 1'
  workflow_dispatch:
jobs:
  read:
    runs-on: ubuntu-latest
    steps:
      - name: Read the 14-day window
        env:
          GH_TOKEN: ${{ secrets.TRAFFIC_TOKEN }}
        run: |
          day=$(date -u +%F)
          gh api repos/${{ github.repository }}/traffic/views > "views-$day.json"
          gh api repos/${{ github.repository }}/traffic/clones > "clones-$day.json"
      # Storage step: the owner decides where the files go.
```

## Ask the owner

- Whether any GitHub or registry number appears in public copy, and the launch counter and target.
- The traffic-archive token: which account owns it, its permission, and where the archive lives, because it may become public.
- Whether a repository's stargazer list may be read: only repositories the actor administers.

## What agents get wrong

1. Calls download or install counts "users" or "adopters", or sums release-asset downloads across releases (CH-GH-23).
2. Reports 14-day traffic as monthly or all time, or treats `uniques` as people (CH-GH-23, CH-GH-25).
3. Sets stars or a Trending spot as the launch goal, or proposes "ask friends to upvote" (CH-GH-24, CH-GH-27).
4. Quotes OSS Insight or star-history widgets from training data (CH-GH-28).
5. Creates the traffic token or secret itself (CH-GH-25).
6. Scans a third party's stargazer list and reads the 404 as zero stars (CH-GH-26).

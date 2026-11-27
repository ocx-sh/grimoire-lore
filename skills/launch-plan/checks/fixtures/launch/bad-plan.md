---
plan_date: 2026-12-01
product: mytool
org: example-org
launch_reason: major-version
launched_tag: v1.2.3
launch_date: 2026-12-03
launch_shape: launch-week
link_target: https://example.com/
canonical_record: https://example.com/news/mytool-1-2
docs_host: example.com
ph_account: example-org
goal: Reach 100 stars
counter: C1
read_command: gh api repos/example-org/mytool/stargazers/count
baseline_window: 7 days ending 2026-12-02
target: 100
read_on: 2026-12-04, 2026-12-05
owner_approved_counter: false
---

# Launch plan

## Venue admission

| venue | url | lane | scope_quote | fetched | verdict |
|---|---|---|---|---|---|
| show-hn | https://news.ycombinator.com/showhn.html | | | 2026-11-20 | fit |
| console-dev | https://console.dev/selection-criteria | | pre-1.0 tools only | 2026-12-01 | fit |

## Items

| item | release_tag | record_draft | released |
|---|---|---|---|
| one | v1.2.3 | | yes |
| two | | | no |

## Schedule

| date | step | venue | venue_class | launch_day | publish_date | url_field | title | actor | action |
|---|---|---|---|---|---|---|---|---|---|
| 2026-12-03 | release | github-release | owned | false | | | | human | tag v1.2.3 is published |
| 2026-12-03 | social | social-post | owned | false | | | | agent | draft: please upvote us |
| 2026-12-04 | record | canonical-record | owned | false | | | | human | publish the record |
| 2026-12-03 | venue | show-hn | community | true | | https://example.com/news/mytool-1-2 | Show HN: mytool 1.2.3 is out | human | maker submits |
| 2026-12-03 | venue | product-hunt | community | true | | https://example.com/ | mytool | human | maker submits |
| 2026-12-05 | directory | console-dev | editorial | false | 2026-12-05 | | | agent | agent runs gh pr create on awesome-rust |
| 2026-12-06 | venue | forum | web | false | | | | human | post |

## Shifts

| venue | start_utc | end_utc | owner |
|---|---|---|---|
| product-hunt | 2026-12-03T12:00Z | 2026-12-03T20:00Z | Alice Example |
| product-hunt | 2026-12-03T22:00Z | 2026-12-04T02:00Z | Bob Example |

## Venue facts

- Pitch limit: 75 characters

## Open asks

- none

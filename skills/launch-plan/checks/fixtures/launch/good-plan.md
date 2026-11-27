---
plan_date: 2026-12-01
product: mytool
org: example-org
launch_reason: major-version
launched_tag: v1.0.0
launch_date: 2026-12-03
launch_shape: single-day
link_target: https://example.com/
canonical_record: https://example.com/news/mytool-1-0
docs_host: example.com
hn_duty_hours: 6
goal: Reach 500 release-asset downloads in the 7 days after launch
counter: C5
read_command: gh api repos/example-org/mytool/releases/tags/v1.0.0 --jq '.assets[].download_count'
baseline_window: 28 days ending 2026-12-02
target: 500 downloads
read_on: 2026-12-04, 2026-12-05, 2026-12-10
owner_approved_counter: false
---

# Launch plan

## Venue admission

| venue | url | lane | scope_quote | fetched | verdict |
|---|---|---|---|---|---|
| show-hn | https://news.ycombinator.com/showhn.html | | something you've made that other people can play with | 2026-12-01 | fit |
| console-dev | https://console.dev/selection-criteria | Tools | Each week we feature and review 2-3 interesting developer tools | 2026-12-01 | fit |
| awesome-shell | https://github.com/alebcay/awesome-shell | | no merged PR in 90 days | 2026-12-01 | excluded-by-default |

## Items

| item | release_tag | record_draft | released |
|---|---|---|---|
| mytool 1.0 | v1.0.0 | https://example.com/news/mytool-1-0 | yes |

## Schedule

| date | step | venue | venue_class | launch_day | publish_date | url_field | title | actor | action |
|---|---|---|---|---|---|---|---|---|---|
| 2026-12-01 | release | github-release | owned | false | | | | human | tag v1.0.0 is published |
| 2026-12-02 | record | canonical-record | owned | false | | | | human | publish the record |
| 2026-12-03 | venue | show-hn | community | true | | https://example.com/ | Show HN: mytool, a tool for X | human | maker submits |
| 2026-12-03 | social | social-post | owned | false | | | | agent | draft only, human posts |
| 2026-12-04 | directory | console-dev | editorial | false | not-scheduled | | | human | human submits by email |
| 2026-12-10 | directory | awesome-rust | editorial | false | not-scheduled | | | human | human submits |

## Shifts

| venue | start_utc | end_utc | owner |
|---|---|---|---|
| show-hn | 2026-12-03T14:00Z | 2026-12-03T17:00Z | Alice Example |
| show-hn | 2026-12-03T17:00Z | 2026-12-03T20:00Z | Bob Example |

## Venue facts

- Show HN duty: 6 hours, set by the owner (https://news.ycombinator.com/showhn.html)
- Console.dev lane: Tools, 2-3 tools a week (https://console.dev/selection-criteria)

## Open asks

- none

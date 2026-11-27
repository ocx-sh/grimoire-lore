---
plan_date: 2026-12-01
product: mytool
org: example-org
launch_reason: owner-major:PENDING-owner-decision
launched_tag: v0.7.0
launch_date: 2026-12-03
launch_shape: single-day
link_target: https://example.com/
canonical_record: https://example.com/news/mytool-0-7
docs_host: example.com
hn_duty_hours: 6
ph_account: example-org
goal: Reach 500 release-asset downloads in the 7 days after launch
counter: C5
read_command: gh api repos/example-org/mytool/releases/tags/v0.7.0 --jq '.assets[].download_count'
baseline_window: 28 days ending 2026-12-02
target: 500 downloads
read_on: 2026-12-04, 2026-12-05, 2026-12-10
owner_approved_counter: false
---

# Launch plan

## Schedule

| date | step | venue | venue_class | launch_day | publish_date | url_field | title | actor | action |
|---|---|---|---|---|---|---|---|---|---|
| 2026-12-02 | release | github-release | owned | false | | | | human | tag v0.7.0 is published |
| 2026-12-03 | venue | producthunt.com | community | true | | https://example.com/ | mytool | human | maker submits |

## Shifts

| venue | start_utc | end_utc | owner |
|---|---|---|---|
| Product Hunt | 2026-12-03T12:00Z | 2026-12-03T20:00Z | Alice Example |

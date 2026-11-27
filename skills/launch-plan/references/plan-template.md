# Launch plan template

Copy the skeleton below to the path the human names (default `launch-plan.md`). Fill every field or write `ask: <the question>` in its place. `plan_check.py` treats an `ask:` value as missing. Contents: [Dates and versions](#dates-and-versions) · [Skeleton](#skeleton) · [Field notes](#field-notes)

## Dates and versions

- The format is this skill's own and carries no platform date. The counter ids (C1 to C11) and the front-matter keys `counter`, `read_command` and `baseline_window` come from `github-presence` (CH-GH-23, CH-GH-24, CH-GH-32). If that list changes, change `counter` here too.
- The scripts parse front matter as `key: value` lines and tables by their header names. Keep the header names exactly as written.
- Re-check event: a change to CH-LAUNCH-11 or to the counter list.

## Skeleton

```markdown
---
plan_date: YYYY-MM-DD
product: mytool
org: example-org
launch_reason: first-launch
first_launch_evidence: ask: the venue search that shows no earlier launch, with its output
launched_tag: v1.0.0
launch_date: YYYY-MM-DD
launch_shape: single-day
link_target: https://example.com/
canonical_record: https://example.com/news/mytool-1-0
docs_host: example.com
hn_duty_hours: ask: whole hours the maker stays on Show HN
ph_account: ask: the maker's personal Product Hunt handle
goal: one sentence, one counter, no stars, points or rank
counter: C5
read_command: gh api repos/example-org/mytool/releases/tags/v1.0.0 --jq '.assets[].download_count'
baseline_window: 28 days ending YYYY-MM-DD
target: ask: the number the owner accepts
read_on: YYYY-MM-DD, YYYY-MM-DD, YYYY-MM-DD
owner_approved_counter: false
---

# Launch plan

## Venue admission

| venue | url | lane | scope_quote | fetched | verdict |
|---|---|---|---|---|---|

## Items

| item | release_tag | record_draft | released |
|---|---|---|---|

## Schedule

| date | step | venue | venue_class | launch_day | publish_date | url_field | title | actor | action |
|---|---|---|---|---|---|---|---|---|---|

## Shifts

| venue | start_utc | end_utc | owner |
|---|---|---|---|

## Venue facts

- figure: value (https://fetched.url)

## Open asks

- ask: the question only the owner answers
```

## Field notes

- `launch_reason` is `first-launch`, `major-version` or `owner-major:REF` (CH-LAUNCH-07). `major-version` needs `launched_tag` to match `^v?[1-9][0-9]*\.0\.0$`. Leave `last_ph_launch` and `relaunch_request` out unless the product launched on Product Hunt before.
- `read_on` holds three dates: `launch_date` plus 1 day, plus 2 days and plus 7 days (CH-LAUNCH-11). `baseline_window` ends the day before `launch_date`.
- `counter` is C5, C6, C3 or C4. A C3 or C4 counter needs a `traffic_archive` key that names the archive workflow. C1 or C11 needs `owner_approved_counter: true` (CH-GH-32).
- `launch_shape` is `single-day` or `launch-week`. A launch week adds `week_min_items` when the owner sets N, and lists every item in `## Items` (CH-LAUNCH-10).
- Admission `verdict` is `fit`, `mismatch`, `excluded-by-default`, `unverified`, `deferred` or `owner-override`. An `unverified` row has the scope quote `page states no scope; human decides`. A Console.dev row holds `lane` Tools or Betas.
- Schedule `step` is `release`, `record`, `venue`, `social`, `directory` or `recap` (CH-LAUNCH-08). `venue` marks the launch-day community venue. An editorial listing and an awesome-list entry are `directory` rows with `venue_class` `editorial` and `publish_date: not-scheduled`. `venue_class` is `community`, `editorial` or `owned` (CH-LAUNCH-06). `launch_day` is `true` or `false`.
- Schedule `actor` is `agent` or `human`. A directory or list row says `human submits` or `human pays` in `action` (CH-LAUNCH-12). `title` holds the maker's own Show HN or Product Hunt title when the maker has written one. The agent never writes it (CH-CORE-03).
- `## Shifts` holds one row per coverage block, with UTC times such as `2026-12-03T14:00Z`, one owner per row, and no gap between blocks.
- `## Venue facts` holds one fetched figure per line, each with its `https://` URL on the same line (CH-LAUNCH-13).

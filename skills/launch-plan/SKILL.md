---
name: launch-plan
description: "Launch planning across venues for a software product: the readiness gate (a published release and a link target that resolves), venue admission from each venue's own scope sentence, at most one community venue per day with a named human on duty, a launch reason versus a routine release, the order of tag, canonical record and venues, Product Hunt maker rules, one numeric launch goal, and the human steps no agent may take. Use when someone plans a launch, a launch week, a 1.0 announcement, a Product Hunt or Show HN day, a directory or awesome-list push, or a newsletter push, or asks when and where to announce a release. Not for routine release notes, which is release-notes, and not for writing the individual posts, which the platform skills cover."
license: Apache-2.0
metadata:
  summary: Writes a checked launch plan file for a software product, with venue admission, one community venue per day, staffing, a canonical record, one counter goal and every human step marked
  keywords: launch,launch-plan,launch-week,product-hunt,show-hn,hacker-news,console-dev,awesome-list,directory,canonical-record,release,1.0,announcement,venues,readiness
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# launch-plan

Contents: [The boundary](#the-boundary) · [Facts and their dates](#facts-and-their-dates) · [What to ask the human](#what-to-ask-the-human) · [Steps](#steps) · [Who writes each venue's package](#who-writes-each-venues-package) · [Checks](#checks) · [Siblings](#siblings)

This skill writes one file: the launch plan. It never posts, uploads, submits, pays, claims or schedules anything. A launch is a gate check, not a campaign. No source shows that a launch shape, a venue order or a venue outperforms another for a small developer tool. The plan checks what can be checked: each venue's stated entry gate, the link target, who staffs the comment window, and the order in which URLs go live.

## Stop condition

Stop when the plan file exists, `plan_check.py` and `link_target_check.py` print no finding on it, and every `ask:` marker is in the reply as a question to the human. If a gate in step 2 fails, stop there and report the gate. Never plan around a failed gate.

## The boundary

These five rules come from `channel-publishing`. They bind every step below.

- CH-CORE-01: end every task at a publish package. Never call a write endpoint or drive a web UI on Hacker News, Product Hunt, Lobsters, Reddit, dev.to, BetaList or any social or video platform. Leave `approved_by` and `approved_at` empty.
- CH-CORE-03: for Hacker News posts and comments, Product Hunt comments, Lobsters, Reddit and dev.to promotion, output only a fact sheet. Never write the title, the first comment or any reply.
- CH-CORE-04: write nothing for Stack Overflow. Say so and name the venue's clause.
- CH-CORE-05: before drafting for a venue whose rules are set per community, fetch that community's rules in the same session and record the URL and one verbatim rule.
- CH-CORE-11: take every platform limit, window and clause from a facts row (cited as `[LP-Fnn]`) or from a page you fetched today. State no figure from memory.

## Facts and their dates

Every dated venue fact is in [references/facts.md](references/facts.md), in the registry format of `channel-publishing`. This file never repeats a limit. Cite a row as `[LP-Fnn]`.

Every row carries `refresh_days`: 180 for hard limits, 90 for policy, API fields and label triggers, 30 for prices. `facts_check.py` fails on the first overdue row; re-fetch it, never extend the date. Every row here carries 30, the floor for this skill, and every venue rule is re-read on plan day (CH-LAUNCH-13). Product Hunt rows are manual rows: a human re-reads the page.

The rules are in [references/rules.md](references/rules.md): CH-LAUNCH-01 to CH-LAUNCH-18, each with its verification and severity. The plan file shape is in [references/plan-template.md](references/plan-template.md). Read the rules file before step 2. Cite a finding as `path:line: CH-LAUNCH-nn: message`.

## What to ask the human

Ask these in one message at step 1. Write each answer into the plan, or write `ask: <the question>` in its place. Never guess an answer.

- Whether to launch at all, which product, which venues and which day.
- Who staffs each block of each comment window, in which time zone, and for how many hours on Show HN (`hn_duty_hours`, CH-LAUNCH-06).
- Whether this release counts as major (`owner-major:REF`, CH-LAUNCH-07).
- Any spending, any override of a default exclusion, and the verdict on an `unverified` venue (CH-LAUNCH-04).
- Every submission, claim, third-party pull request and attestation (CH-LAUNCH-12). Which personal account launches on Product Hunt (CH-LAUNCH-14).
- Whether the canonical record is a new owned-domain page or the release page (CH-LAUNCH-09).
- The item count N for a launch week, if it is not the default (CH-LAUNCH-10).
- Which Console.dev lane to use, and who sends the email (CH-LAUNCH-04).
- Whether a list's attestation applies to the product, such as a tool-specific list (CH-LAUNCH-18). Whether to argue popularity to a list before its numeric gate is met.
- The day of any forum announcement, which is a community venue, and who owns it (CH-LAUNCH-06).
- Weekday or weekend on Product Hunt. The venue states no data on it [LP-F07].

## Steps

Set `CHECKS=.claude/skills/launch-plan/checks` (`$CLAUDE_CONFIG_DIR/skills/launch-plan/checks` when installed globally). `PLAN` is the plan file.

### 1. Open the plan

- Input: the human's launch request and the product repository.
- Do: copy the skeleton from `references/plan-template.md` to the path the human names (default `launch-plan.md`). Fill `plan_date` with today's date, `product`, `org`, `link_target`, `canonical_record`, `docs_host`. Send the questions above.
- Done when: the file exists, and every front-matter key holds a value or an `ask:` marker.

### 2. Run the readiness gate (CH-LAUNCH-01, 02, 03)

- Input: the repository, the tag to launch, `link_target`.
- Do: run the CH-LAUNCH-01 block from `references/rules.md`. It prints 1 or more when a non-prerelease release exists. Then run the link-target check, with the product's install host and package name:

```sh
python3 -I "$CHECKS"/link_target_check.py --install-host "$HOST" --package "$PKG" "$URL"
```

- Done when: the release count is 1 or more and the script exits 0. On a failure, stop and report the line. A failure of CH-LAUNCH-03 is a SHOULD: report it and ask the human whether the install page leads with the product's own command by design.
- Never use the local resolver for this check. The script uses a public one.

### 3. Set the launch reason and shape (CH-LAUNCH-07, 10)

- Input: the release tag, the human's answer on "major".
- Do: set `launch_reason` to `first-launch`, `major-version` or `owner-major:REF`. For `first-launch`, run the venue's own search for the product's domain and write the search and its zero-result output into `first_launch_evidence`. Never plan a Show HN or a Product Hunt launch for a routine release, and never hook a launch step to release automation. Set `launch_shape` to `single-day`. Choose `launch-week` only when the owner asks and `## Items` lists enough released items for CH-LAUNCH-10.
- Done when: `plan_check.py` prints no CH-LAUNCH-07 or CH-LAUNCH-10 line.

### 4. Admit venues from their own pages (CH-LAUNCH-04, 13, 17, 18)

- Input: the candidate venues. Start from the facts file: it names the venues, their pages and the default exclusions.
- Do, for each venue:
  1. Fetch the venue's rules page today. Where a fetch is refused, make one request, record the status and ask the human to paste the rules (CH-COM-02). Never route around a block.
  2. Copy the scope sentence of the right lane word for word into `## Venue admission`, with the URL, today's date and a verdict. A venue with lanes gets its lane named and that lane's sentence quoted, never the headline gist.
  3. Check the quote is on the live page (the CH-LAUNCH-04 block). Compare the fetched figure with its facts row. When they differ, write the fetched figure in the plan and tell the human the row is stale.
  4. Write every venue figure into `## Venue facts`, one per line, with its URL on the same line.
- Do, for each awesome list: run the CH-LAUNCH-17 block (alive or `excluded-by-default`), then record the list's own numeric gate next to the product's measured value (CH-LAUNCH-18). Mark `deferred` when the product fails the gate.
- Apply the default exclusions of CH-LAUNCH-04 unless the human overrides one in writing. Never admit a venue by its name alone.
- Done when: `plan_check.py` prints no CH-LAUNCH-04 or CH-LAUNCH-13 line, and the CH-LAUNCH-04 check 4 block prints nothing.

### 5. Classify, schedule and staff (CH-LAUNCH-06, 08, 14)

- Input: the admitted venues, the human's days and staff.
- Do:
  1. Give every row of `## Schedule` a `venue_class`: `community`, `editorial` or `owned`. Mark the launch-day community venue `launch_day: true`. Put at most one such venue on any day.
  2. Give every editorial row `publish_date: not-scheduled`. An editor sets that day, not the team.
  3. Order the rows: release, canonical record, launch-day venue, social posts, directory entries, recap (CH-LAUNCH-08). The release date is strictly earlier than the venue date.
  4. Fill `## Shifts` with one owner per block, in UTC, with no gap. Use `hn_duty_hours` for Show HN. For Product Hunt, cover the whole Pacific day [LP-F04, LP-F09] and keep the date inside the scheduling window [LP-F05].
  5. Name the maker's personal Product Hunt account in `ph_account`. Never the org or product name (CH-LAUNCH-14).
  6. Write no posting-time advice. Name no best hour or day (CH-COM-10).
- Done when: `plan_check.py` prints no CH-LAUNCH-06, 08 or 14 line.

### 6. Name the canonical record and any mirror (CH-LAUNCH-09, 16)

- Input: the headline the launch announces.
- Do: set `canonical_record` to one dated page at a stable URL the team controls. A release page qualifies when its first non-blank line is a prose summary sentence and its body links the docs page. Run the CH-LAUNCH-09 block. For a mirror on another platform, put the record URL in the platform's canonical field and write a body of its own prose (CH-LAUNCH-16). Never hand-edit a generated changelog to link back.
- Done when: the record answers HTTP 200 with a date, and the mirror row (if any) holds `canonical_url`.

### 7. Set the venue URL fields (CH-LAUNCH-15)

- Input: `link_target`, `canonical_record`.
- Do: put the link target in the launch-day community venue's `url_field`. Never put the canonical record or the announcement post there. Social posts link the record. Run:

```sh
python3 -I "$CHECKS"/link_target_check.py --plan "$PLAN"
```

- Done when: the script exits 0.

### 8. Set one numeric goal (CH-LAUNCH-11)

- Input: the human's target, the counter list of `github-presence`.
- Do: choose one counter in the CH-GH-32 order. Write `goal`, `counter`, `read_command`, `baseline_window` (28 days ending the day before launch), `target` and `read_on` (launch date plus 1, 2 and 7 days). Run the read command once now and write the baseline figure in the CH-GH-23 report form. Never set stars, Product Hunt points, Hacker News score or a rank as the goal. For a traffic counter (C3, C4), the CH-GH-25 archive workflow must run before the baseline window starts: set `traffic_archive` to its path.
- Done when: `plan_check.py` prints no CH-LAUNCH-11 line.

### 9. Mark every human step (CH-LAUNCH-05, 12)

- Input: the finished `## Schedule`.
- Do: set `actor: human` on every submit, claim, payment, attestation and third-party pull request. Write `human submits` or `human pays` in `action` for each directory and list row. Run the CH-LAUNCH-12 blocks. Write no vote ask in any launch artifact: ask for a trial and for feedback. For community venues, CH-COM-08 owns the ban and the grep. Run `plan_check.py` with `--artifacts` over the drafts and the README.
- Never open a pull request or issue on a third-party list, prepare a batch of them, or tick a human-attestation box. Check each command against this list before you run it.
- Done when: the CH-LAUNCH-12 blocks print nothing except rows in the team's own organisations, and `plan_check.py` prints no CH-LAUNCH-05 line.

### 10. Check and hand over

- Run both scripts on the plan:

```sh
python3 -I "$CHECKS"/plan_check.py "$PLAN" --artifacts FILE...
python3 -I "$CHECKS"/link_target_check.py --plan "$PLAN"
```

- Done when: both exit 0. Report in this order: the plan path, the findings you could not clear, the `ask:` questions, and the list of human steps with their owners. Hand each venue's package to the skill in the next section.

## Who writes each venue's package

| Venue or step | Package | Skill |
|---|---|---|
| Show HN, Lobsters, Reddit, Stack Overflow, dev.to, Hashnode, chat servers | Fact sheet or checklist for the human who posts | `community-post` |
| X, Bluesky, Threads, Mastodon | Post draft | `microblog-post` |
| LinkedIn | Post draft | `linkedin-post` |
| Demo video | Recording package | `terminal-demo`, `youtube-video` |
| GitHub release page as the canonical record | Release body | `release-notes` |
| Repository card, Discussions, traffic archive | Repository edits | `github-presence` |
| Product Hunt listing | A publish package with every field marked human (CH-CORE-01). Comments are a fact sheet (CH-CORE-03). No platform skill covers it | none |
| Directories and awesome lists | A row in the plan, marked `human submits` | none |

## Checks

| Script | Rules | Reads |
|---|---|---|
| `checks/plan_check.py` | CH-LAUNCH-04, 05, 06, 07, 08, 10, 11, 13, 14 | The plan file, and with `--artifacts` any launch draft |
| `checks/link_target_check.py` | CH-LAUNCH-02, 03, 15 | One or more URLs, or the plan's link target and venue URL fields |

Both exit 0 clean, 1 on a finding, 2 on bad usage. Both take `--help` and `--self-test`. The rules that no script reads carry a command block or a named reading heuristic in `references/rules.md`.

## Siblings

- `channel-publishing` owns the boundary, the registry format and `facts_check.py`. This skill requires it.
- `community-post` owns Show HN eligibility and titles, Lobsters gates, and the maker comment. It also owns CH-COM-08.
- `github-presence` owns the counter list, the traffic archive and the report form that CH-LAUNCH-11 uses.
- `release-notes` owns the release body that can serve as the canonical record.
- `marketing-quality`, when installed, governs claims in a draft. Otherwise carry a `source:` line for every number.

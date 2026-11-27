---
title: Do users.rust-lang.org, Changelog News and a DEV.to mirror count as launch-day venues (CH-LAUNCH-06)
program: product
topic: channel-launch
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 10
---

# Do users.rust-lang.org, Changelog News and a DEV.to mirror count as launch-day venues

## Question

CH-LAUNCH-06 allows at most one launch-day community venue per calendar day and requires a named human owner for each block of that venue's comment window. The grim 1.0 plan puts Show HN, "Changelog News + DEV.to mirror" and users.rust-lang.org on launch day or "day 0/+1" (`grimoire-rs/grimoire/.agents/research/research_promotion_positioning.md:367-369`, read 2026-11-27). Do the three extra items count as venues under CH-LAUNCH-06?

## Answer

CH-LAUNCH-06 never defines "community venue", so the three items cannot be classified by the rule as written. The fetched evidence separates them by one observable property: whether strangers can reply in public and the venue expects the maker to answer.

| Channel | Public reply surface found | Duty to answer stated | Publication date controlled by team | Verdict under CH-LAUNCH-06 |
|---|---|---|---|---|
| Show HN | yes | yes ("around to discuss") | yes | community venue (already named in the rule) |
| users.rust-lang.org announcements | yes (a forum topic with replies) | none stated, none found | yes, immediate | counts as a community venue: it is a reply-bearing forum, and the plan should staff it. Not on the same day as Show HN. |
| Changelog News | none found | none | no, editors decide | does not count. It is an editorial submission, a human step under CH-LAUNCH-12. |
| DEV.to mirror | not fetched; DEV's own terms forbid a post that merely points elsewhere | none found | yes | does not count as a venue. It is owned or syndicated publishing, a record-class item under CH-LAUNCH-08 step 2 or 4. |

The classification rests on the evidence below. The "counts" verdict for users.rust-lang.org is an inference from the venue type, because no page states a reply duty. The inference is the safe direction: counting it only costs one day of calendar spacing.

## Findings

### 1. users.rust-lang.org announcements

- The category's own description is one line: "Announcements of any sort, project updates, meetups, etc." ([About the announcements category, fetched 2026-11-27](https://users.rust-lang.org/t/about-the-announcements-category/)). The page lists no rules and links to the forum Guidelines page, which a second fetch returned (see the measurements below).
- The grim plan's claim "Zero gatekeeping, category literally exists for this" (`research_promotion_positioning.md:369`) is stale. On 2026-09-10 the moderators muted the category for everyone because volume rose and quality fell: "I have now muted this category for everyone, but you can manually resubscribe to it" (oli_obk, [thread 142378](https://users.rust-lang.org/t/announcement-topic-category/142378), dated 2026-09-10, fetched 2026-11-27). No formal rule against self-promotion exists in that thread. Proposals in it (limit third-party promotion, an AI-generated tag, a minimum star or download threshold) were raised by members and not adopted as policy.
- The category is active today. The listing showed nine topics created between 2026-11-24 and 2026-11-27 (first pass said eight, wrong; the JSON count below is authoritative), several in the `[ANN]` style and one tagged `[AI]` ([category listing, fetched 2026-11-27](https://users.rust-lang.org/c/announcements/6)). Of the 20 newest topics, 19 have 0 replies and one has 1, so the reply surface exists and is rarely used. A grim post therefore lands among other launches in a category that most users no longer follow by default.
- Replies are possible on any forum topic. The pages fetched do not say that the maker must answer, and the plan's own wording ("day 0/+1") puts it next to Show HN's comment window.

### 2. Changelog News

- The submission page states the scope and the process ([changelog.com/news/submit](https://changelog.com/news/submit), undated, fetched 2026-11-27). Not accepted: "How-to's and tutorials", "Commercial products/services", "Reader-hostile websites", podcast suggestions. "Submitting your own work is also encouraged." Submitters must "sign in / up". Publication: the submitter is told by email "if and when your submission gets published".
- The news page calls itself editorial: "Every word is 100% crafted by humans" and "We feature the best community submissions" ([changelog.com/news](https://changelog.com/news), undated, fetched 2026-11-27). It mentions no comment section. Its only stated feedback channel is email.
- Consequence: the team does not control the publication day, and the page shows no public thread whose replies the team must staff. It is a submission. An agent must not sign up or submit (CH-LAUNCH-12). The plan's "launch day" for it is a hope, not a schedulable event. The scope text fits a free OSS CLI ("Commercial products/services" is the only exclusion that could apply, and grim is unmonetized per the plan).

### 3. DEV.to mirror

- DEV's terms say a post must not be "designed primarily for the purposes of promotion or creating backlinks", must have substantial content and "cannot simply point to an external link" ([dev.to/terms](https://dev.to/terms), undated, fetched 2026-11-27). DEV's Code of Conduct has no promotion rule ([dev.to/code-of-conduct](https://dev.to/code-of-conduct), fetched 2026-11-27).
- The editor guide lists `canonical_url` as a front-matter field: "link for the canonical version of the content" ([dev.to/p/editor_guide](https://dev.to/p/editor_guide), fetched 2026-11-27). It says nothing about cross-posting policy. `dev.to/guidelines` returned HTTP 404 (measured below). Whether comments are enabled by default and how DEV ranks a mirror were not fetched.
- Consequence: a mirror is a syndicated copy of the canonical record (CH-LAUNCH-09). It is not a launch venue with a duty window. Two checkable risks follow from DEV's terms: a bare "see our release" stub violates the terms, and a mirror without `canonical_url` competes with the owned record.
- The fleet has no blog (`product-audit/distribution-posture.md:39,238`, cited by the topic file). A DEV.to "mirror" of a post that does not exist is not possible until CH-LAUNCH-09's record exists. Under the topic's decision the record may be a GitHub Release page, and mirroring a release body to DEV is then a different, thinner artifact.

## Effect on the ruleset

### CH-LAUNCH-06: change

Replace the first sentence with this text, keeping the rest:

> Classify every channel in the plan with `venue_class:` set to exactly one of `community` (a public reply surface where strangers respond to the team's post), `editorial` (a human editor decides whether and when it publishes) or `owned` (a copy or page the team publishes on a platform or domain it chooses). Put at most one `community` channel with `launch_day: true` on any calendar day, and name a human owner for each block of that channel's comment window.

Add to the rationale: users.rust-lang.org announcements is `community`; Changelog News is `editorial`; a DEV.to mirror is `owned`.

Add to the verification: every channel row holds `venue_class` and, for `community`, a fetched URL of the page that shows the reply surface; a row with `editorial` carries `publish_date: not-scheduled` unless the venue confirmed a date in writing; two `community` rows with `launch_day: true` on the same date fail.

Severity unchanged (MUST).

### CH-LAUNCH-12: confirm

Changelog News submission needs a login and an editorial decision, so it is a `human` row. No change to the text; add it as a named example of an editorial submission.

### NEW CH-LAUNCH-16

- Rule: A mirror of the canonical record to another publishing platform carries the canonical record URL in the platform's canonical field (on DEV.to, `canonical_url`), is published on or after the record's date, and has a body of its own prose, not a link-only stub.
- Rationale: DEV's terms require substantial content and bar posts that only point to an external link ([dev.to/terms](https://dev.to/terms), fetched 2026-11-27); the record is the canonical page under CH-LAUNCH-09. The canonical field is documented in the editor guide ([dev.to/p/editor_guide](https://dev.to/p/editor_guide), fetched 2026-11-27). No source measures whether a mirror helps.
- Severity: SHOULD.
- Verification: the published mirror's canonical equals the record URL (`curl -s <mirror URL> | grep -o '<link rel="canonical"[^>]*>'` prints `href` equal to the record URL; or `curl -s https://dev.to/api/articles/<id> | jq -r .canonical_url`). A `canonical_url:` line in the Markdown source is NOT required: measured below, real mirrors set it outside the body; the mirror's date is not earlier than the record's date (CH-LAUNCH-08 check 1 order); the mirror body has at least 150 words outside links (`curl -s https://dev.to/api/articles/<id> | jq -r .body_markdown | sed 's/\[[^]]*\]([^)]*)//g' | wc -w` prints at least 150; the 150 has no source. Both sampled real mirrors measured 1380 and 1581 words, so 150 is a loose floor against link-only stubs, owner-adjustable).

### CH-LAUNCH-13: confirm, with one addition to the fleet row

The grim plan's statement about the forum category being open and "literally for this" is a venue fact carried without a fetched URL and is out of date (muted 2026-09-10). This confirms CH-LAUNCH-13's premise and needs no rule change.

## Applied to the grim 1.0 plan

- Show HN, "Changelog News + DEV.to mirror" and users.rust-lang.org on "day 0/+1": under the changed CH-LAUNCH-06, Show HN and users.rust-lang.org are both `community`. If the forum post goes on launch day, the plan has two community venues on one date and fails. Move the forum post to day +1 or later, or have an owner staff both and record an override. The plan does not state `hn_duty_hours`.
- Changelog News is `editorial` and unschedulable. Replace "launch day" with "submit by a human before the 1.0 tag, outcome unscheduled" (the plan's own deadline text gives the Console.dev pre-1.0 limit, which this follow-up did not verify).
- DEV.to mirror depends on a canonical record that does not exist yet (CH-LAUNCH-09 status in the topic file: not met).

## Measurements (run 2026-11-27 13:11 UTC)

Scratch dir `~/.cache/research-lang/exemplars/product/wave2/channel-launch-q1/`. Read-only GETs with `curl -sL -A 'Mozilla/5.0 (research-lang follow-up)'`; no login, no post. Raw files kept there.

Fetch statuses (`curl -sL -A "$UA" -o <file> -w '%{http_code} %{url_effective} %{size_download}' <url>`):

```
200 https://users.rust-lang.org/c/announcements/6.json 35683
200 https://users.rust-lang.org/guidelines 20165
200 https://users.rust-lang.org/t/about-the-announcements-category/1185 23608
404 https://dev.to/guidelines 5077
200 https://dev.to/p/editor_guide 62319
```

Category listing, newest 20, `jq -r '.topic_list.topics[] | "\(.created_at[0:10]) \(.reply_count)r \(.title)"'` (first lines): `2026-11-27 0r [ANN] Curvine ...`, `2026-11-27 0r [ANN] FashionCraft 0.2.1 ...`, `2026-11-27 0r Ordet ...`, `2026-11-26 0r ... rvoip 0.5`, `2026-11-25 1r Rolling upgrades in tellus ...`, `2026-11-24 0r [AI] Cargo prune ...`. Count in window:

```
$ jq '[.topic_list.topics[]|select(.created_at>="2026-11-24" and .created_at<"2026-11-28")]|length' ...6.json
9
```

users.rust-lang.org Guidelines (`<title>Guidelines - The Rust Programming Language Forum`), the only matching passage for promotion/spam: "Respect our forum. Don't post spam or otherwise vandalize the forum. These are not concrete terms with precise definitions" (undated page, fetched 2026-11-27). No self-promotion or announcement rule.

Changelog News reply surface (`grep -ioc comment` on the HTML): `/news` 0 matches, item `/news/66` 0 matches. Absence of a comment surface is now measured on two pages, not only read.

CH-LAUNCH-16 verification run against two real DEV.to mirrors (selected as `jq '.[]|select(.canonical_url != .url)'` from `https://dev.to/api/articles?tag=rust&per_page=30`; ids 5132235, published 2026-11-27T11:17:21Z; 5130261, published 2026-11-27T06:37:18Z):

| Command | 5132235 | 5130261 |
|---|---|---|
| `grep -c '^canonical_url: https://' m<id>.md` (original rule) | 0 | 0 |
| `jq -r .canonical_url a<id>.json` | `https://terraphim.ai/posts/facts-style-and-named-concepts/` | `https://opengeocoding.com/blog/what-is-geocoding` |
| `curl -s <url> \| grep -o '<link rel="canonical"[^>]*>'` | `href="https://terraphim.ai/posts/facts-style-and-named-concepts/"` | `href="https://opengeocoding.com/blog/what-is-geocoding"` |
| `sed 's/\[[^]]*\]([^)]*)//g' m<id>.md \| wc -w` | 1580 | 1381 |
| `comments_count` | 0 | 0 |

The original front-matter grep returned 0 on both genuine mirrors, so it was a wrong check and is replaced above by the rendered-page canonical link and the API field. The second mirror's body opens with "Originally published on [the OpenGeocoding blog](...)": a disclosure line a mirror may carry, not required here.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| users.rust-lang.org announcements muted for everyone by moderators | [thread 142378](https://users.rust-lang.org/t/announcement-topic-category/142378) | 2026-09-10 |
| Category description: "Announcements of any sort, project updates, meetups, etc." | [about page](https://users.rust-lang.org/t/about-the-announcements-category/) | fetched 2026-11-27, undated |
| Nine topics created in the category between 2026-11-24 and 2026-11-27; 19 of 20 newest have 0 replies | [category 6](https://users.rust-lang.org/c/announcements/6) | fetched 2026-11-27 |
| Changelog News scope, own work encouraged, publication by email "if and when" | [submit](https://changelog.com/news/submit) | fetched 2026-11-27, undated |
| Changelog News: "Every word is 100% crafted by humans" | [news](https://changelog.com/news) | fetched 2026-11-27, undated |
| DEV terms: not primarily promotion; no link-only posts | [terms](https://dev.to/terms) | fetched 2026-11-27, undated |
| DEV `canonical_url` front-matter field | [editor guide](https://dev.to/p/editor_guide) | fetched 2026-11-27, undated |

## What could not be determined

- Whether the users.rust-lang.org moderators enforce any self-promotion limit beyond the Guidelines line "Don't post spam or otherwise vandalize the forum": the Guidelines text has no promotion rule, but enforcement practice is not in a document.
- Whether Changelog News has any comment or discussion surface on an individual item: the fetched pages mention none. Not proven absent.
- Whether DEV.to enables comments by default and how it ranks a mirror: the two sampled mirrors both show `comments_count` 0, which is not a default; the guidelines URL returned 404. If DEV comments are enabled, an owner may choose to staff them; this follow-up has no source that sets a duty.
- Whether any of the three channels measurably adds installs or retained users: no source found and none searched beyond the pages above. This stays the first open question of the topic file.
- Console.dev's pre-1.0 claim in the grim plan: not in scope here and still unverified.

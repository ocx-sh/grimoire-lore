# Boundary clauses and their dates

Read this when you must justify a CH-CORE-01 to CH-CORE-10 rule to a person, when a
platform changes its policy, or when you refresh the clauses on their 90-day cycle.
SKILL.md states the rules and no clause text. This file holds the clauses behind them,
each with its source URL and date. A platform's limit or field value lives in the
platform skill's `references/facts.md`, and a row there wins over this file.

Contents: [Dates and versions](#dates-and-versions) · [Venue clauses](#venue-clauses) ·
[Automation gates](#automation-gates) · [Labels](#labels) ·
[Disclosure and media](#disclosure-and-media) · [Credentials](#credentials) ·
[Documented gaps](#documented-gaps) · [What decays](#what-decays)

## Dates and versions

Every clause below was read on 2026-11-27 unless its row says otherwise. Re-fetch each
row every 90 days, and every 30 days for X prices. A source date of "none" means the
page shows no date. Law (whether an AI or sponsor label is required) belongs to the
marketing rules, not to this file.

| Item | Value | Source | Re-check |
|---|---|---|---|
| gitleaks default ruleset | v8.30.1 has no Discord webhook rule and no Google refresh-token rule | https://raw.githubusercontent.com/gitleaks/gitleaks/v8.30.1/config/gitleaks.toml, 2026-11-27 | At each gitleaks version bump |
| c2patool | 0.27.23 | https://github.com/contentauth/c2pa-rs/releases/tag/c2patool-v0.27.23 | At each version bump |
| exiftool | 13.64 | Measured 2026-11-27 | At each version bump |
| Archive copies | Reddit policy read from a capture of 2026-08-28, Discord Developer Policy from a capture of 2026-11-18 | web.archive.org | A human reads both pages in a browser; capture dates show which text was read, never that a page changed |

## Venue clauses

CH-CORE-01 (no automated public action), CH-CORE-03 (fact sheet only) and CH-CORE-04 (nothing for Stack Overflow).

| Venue | Clause | Source | Source date |
|---|---|---|---|
| YouTube | Each automated upload or comment needs "prior specific and express consent" | https://developers.google.com/youtube/terms/developer-policies | Last updated 2026-11-06 |
| LinkedIn | The User Agreement bans "bots or other unauthorized automated methods" (8.2) | https://www.linkedin.com/legal/user-agreement | Effective 2025-11-03 |
| LinkedIn | The API terms list "automate posting" as prohibited | https://www.linkedin.com/legal/l/api-terms-of-use | Revised 2022-12-13 |
| Hacker News | "please don't automate posting". "Don't post generated text or AI-edited text." | https://news.ycombinator.com/newsguidelines.html | none |
| GitHub | The Acceptable Use Policies bar "automated excessive bulk activity" and "automated starring or following", not automation as such. This is why GitHub and registries are out of scope | https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies, section 4 | Source last changed 2026-07-09 |
| Reddit | The Responsible Builder Policy requires "explicit approval before accessing any Reddit data through our API" for apps "including bots, AI agents, or non-human operated accounts" [RD-F01, RD-F02], and bans "spamming activity through automated posts, comments, or direct messages" [RD-F03] | https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy | Updated 2026-06-05, read from the capture of 2026-08-28 |
| Reddit | Self-service API access closed on 2025-11-11 [RD-F06]. The policy sets no rule for human posts, so the subreddit's own rules decide (CH-CORE-05) | https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/ | 2025-11-11, read from a capture |
| Product Hunt | The terms bar any process "activated while you are not logged into the Services" [PH-F03]. The terms have no AI clause | https://www.producthunt.com/legal | Effective 2014-08-17 |
| Product Hunt | The API "must not be used for commercial purposes" by default [PH-F04] | https://api.producthunt.com/v2/docs | none |
| Product Hunt | "No LLMs or Chrome extensions please!" in comments [PH-F05]. Always cite the LLM ban to the commenting guidelines, never to the terms | https://help.producthunt.com/en/articles/10030102-commenting-guidelines | 2025-07-28 |
| dev.to | AI-assisted articles must not promote "any business, program, or course (including your own)". A newer revision is reported but not read, so re-fetch before every dev.to draft | https://dev.to/devteam/guidelines-for-ai-assisted-articles-on-dev-17n6 | Edited 2023-01-09 |
| Lobsters | Self-promotion is barred in an account's first 70 days | https://lobste.rs/about | none |
| Stack Overflow | "Please do not draft content for Stack Overflow using large language model (LLM) services". The ban covers drafting, not only posting | https://stackoverflow.com/help/gen-ai-policy | none |

The Product Hunt API has a write scope. Any LLM rewrite counts as AI-edited text, so the
skill does not try to find the line between a fact sheet and an edited post. The
20-word cap in CH-CORE-03 is a starting value, chosen so that a value holds a fact and
not a pitch.

## Automation gates

CH-CORE-02. Bots are legal only where the platform documents a labelled bot path.

| Platform | Clause | Source | Source date |
|---|---|---|---|
| X | "All automated accounts using the X API must meet these requirements: 1. Enable the 'Automated' profile label" [X-F01] | https://docs.x.com/developer-guidelines.md | none (the page's last-modified header tracks deploys, not edits) |
| X | Programmatic replies only when the post's author summoned the account [X-F02]. Per-post pricing effective 2026-04-20 [X-F03] | https://docs.x.com/changelog | 2026-02-23 (replies), 2026-04-16 (price entry) |
| X | "Never post identical or substantially similar content across multiple accounts" covers several X accounts run by one developer. It says nothing about cross-platform posts | https://docs.x.com/developer-terms/policy | none |
| Bluesky | The `bot` self-label is "a best practice" [BS-F01]. Bots interact only with users who tagged them [BS-F02]. No Bluesky terms or guideline text requires the label (0 matches, 2026-11-27), so the requirement is this skill's choice | https://atproto.com/guides/bot-tutorial | none (source text added 2026-03-19, last changed 2026-04-13) |
| Bluesky | The app writes the `bot` self-label from a settings toggle since release 1.119.0 [BS-F03]. `bot` is a known global label value [BS-F04]. The app ships no viewer filter for it (checked in the app source at commit bdeb25e, 2026-11-26), so never claim readers can filter or hide bots | https://github.com/bluesky-social/social-app/pull/10008, https://atproto.com/guides/labels | 2026-03-10 (merge), 2026-03-17 (release) |
| Threads | `is_made_with_ai` is set on the container-creation call only [TH-F01]. 250 posts per rolling 24 hours [TH-F02] | https://developers.facebook.com/docs/threads/posts | 2026-10-30 |
| Mastodon | The bot flag is "a visual indication only" [MA-F01] | https://docs.joinmastodon.org/user/profile/ | Updated 2026-04-15 |
| Mastodon | The mastodon.social and mastodon.online rule 6 requires disclosure of generative AI use [MA-F02] | https://mastodon.social/api/v1/instance/rules | Terms effective 2026-08-31 |
| Discord | Community Guidelines item 14: "Do not use self-bots or user-bots" [DC-F07]. The Developer Policy has no self-bot clause | https://discord.com/guidelines | Effective 2025-09-29 |
| Discord | Developer Policy rule 6 (no advertisements or marketing) [DC-F02], rule 13 (no automated messages to maintain activity) [DC-F03] | https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy | Effective 2024-07-08, read from the capture of 2026-11-18 |

## Labels

CH-CORE-06 and CH-CORE-07.

| Platform | Fact | Source | Source date |
|---|---|---|---|
| YouTube | `hasPaidProductPlacement` stopped defaulting to false, so an omitted field means "undeclared" [YT-F02]. `status.containsSyntheticMedia` is settable through the API [YT-F01] | https://developers.google.com/youtube/v3/revision_history | 2026-11-16 (default), 2024-10-30 (field) |
| YouTube | The AI-use triggers and exemptions that the registry rows `trigger:` and `exemption:` copy [YT-F03 to YT-F09] | https://support.google.com/youtube/answer/14328491 | none |
| LinkedIn | The Brand partnership toggle resets to Off for every post. There is no AI field | https://www.linkedin.com/help/linkedin/answer/a1627083 | "3 years ago" at 2026-11-27 |
| X | `made_with_ai` and `paid_partnership` (`paid_partnership` added 2026-06-03) | https://docs.x.com/changelog | 2026-06-03 |
| TikTok | `is_aigc`, and `brand_content_toggle` or `brand_organic_toggle`. A label is required on realistic or significantly edited content from 2026-09-24 | https://developers.tiktok.com/doc/content-posting-api-reference-direct-post, https://www.tiktok.com/community-guidelines/en/integrity-authenticity | 2026-11-25 (API), 2026-09-24 (guidelines) |
| Bluesky | The label values are exactly `!hide`, `!warn`, `!no-unauthenticated`, `porn`, `sexual`, `nudity`, `graphic-media` and `bot` (`knownValues` of `com.atproto.label.defs#labelValue`, atproto commit dce608b). The 2026 `bot` value labels the account, so Bluesky still has no AI-content label | https://atproto.com/guides/labels | 2026-11-27 |

## Disclosure and media

CH-CORE-08 and CH-CORE-09. Whether the law requires a disclosure is decided by the
marketing rules. This skill decides where it sits.

| Item | Fact | Source | Source date |
|---|---|---|---|
| FTC | A disclosure is clearest "in the video itself" and must be visible without clicking "more" | https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking | none |
| EU Code of Practice | Video labels sit at the start and at intervals. The marketing rules hold the source URL | The marketing rules | 2026-06-10 |
| LinkedIn | Reads C2PA Content Credentials | https://www.linkedin.com/help/linkedin/answer/a6282984 | none |
| Instagram | Read IPTC but not C2PA in one March 2026 study (independent, one study, so the rule is SHOULD) | https://iptc.org/news/ai-disclosure-on-social-media-a-work-in-progress/ | 2026-03-18 |
| YouTube | Carries forward disclosures from tools with C2PA 2.1 or higher that mark the whole video as AI-made [YT-F10] | https://support.google.com/youtube/answer/15447836?hl=en | none |
| Measurement | A C2PA test image with `digitalSourceType` inside its manifest had no XMP `DigitalSourceType`, so write the two separately. Write the XMP tag first and sign last, because an edit after signing breaks the manifest | c2patool 0.27.23, exiftool 13.64 | 2026-11-27 |

## Credentials

CH-CORE-10. A Discord webhook URL embeds "the secure token"
(https://discord.com/developers/docs/resources/webhook), so it is a bearer credential.
The gitleaks v8.30.1 defaults list only `discord-api-token`, `discord-client-id` and
`discord-client-secret`. A plain Bluesky app password has no rule, by design: a
four-group pattern gives false positives on arbitrary strings. Workflows reference
secrets only as `${{ secrets.NAME }}` or an environment variable.

## Documented gaps

Findings, not open questions, as of 2026-11-27.

- Reddit's Responsible Builder Policy and Discord's Developer Policy answer scripts
  with 403. Their rows were read from archive copies. Only a human in a browser can
  confirm today's text. Discord's header ("Last updated: June 6, 2024") was unchanged
  in three captures from 2026-01-09 to 2026-11-18.
- The Product Hunt terms limit use to "internal, personal, non-commercial use", while
  its help centre tells makers to post their own product from a personal account. No
  page reconciles the two, so cite the terms neither as allowing nor as banning a launch.
- No Bluesky policy requires or enforces the `bot` self-label, and the official app has
  no viewer filter for it.
- Discord's Terms of Service revision takes effect 2026-12-15 and was not compared with
  the version in force. Re-check it every 30 days until 2027-02-13.
- LinkedIn Marketing API version 202601 sunsets on 2027-01-15. It affects no rule,
  because the agent never calls it.

## What decays

| Moving facts | Rules | Interval |
|---|---|---|
| The platform policies in "Venue clauses" | CH-CORE-01 | 90 days |
| X rules and prices, atproto guidance, the Mastodon flag and rule 6, the Threads limit, Discord guidelines and policy | CH-CORE-02 | 90 days; 30 for X prices |
| HN, Stack Overflow, Product Hunt, Lobsters and dev.to clauses | CH-CORE-03, 04 | 90 days; re-fetch dev.to before every dev.to draft |
| A community's own rules | CH-CORE-05 | Every session (no registry row) |
| YouTube, X, Threads and TikTok label fields and triggers | CH-CORE-06, 07 | 90 days; 30 days until 2027-01-15 for the YouTube paid-placement default |
| FTC placement guidance, EU Code of Practice | CH-CORE-08 | 90 days, owned by the marketing rules |
| Which platforms read C2PA or IPTC, tool behaviour | CH-CORE-09 | 90 days; re-run the media check at each tool version bump |
| The gitleaks default ruleset | CH-CORE-10 | At each gitleaks version bump |
| The intervals themselves | CH-CORE-13 | After two registry refresh cycles |
| Which hosts block scripts | CH-CORE-14 | When a re-fetch run reports `UNREACHABLE` |
| Which document holds each clause, and whether Bluesky ships a filter | CH-CORE-20 | 90 days; drop the Bluesky pattern when a release adds a filter |
| The organisation's own accounts | CH-CORE-17 to 19 | `last_checked` per row |

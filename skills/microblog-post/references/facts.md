# Microblog platform facts

Dated facts for `microblog-post`. `SKILL.md` and the checks read limits from this file and keep no copy. Cite a row as `[X-F04]`.

Contents: [Dates and versions](#dates-and-versions) · [Refresh](#refresh) · [Registry](#registry) · [Notes](#notes)

## Dates and versions

- Every row was fetched on 2026-11-27 and its `expect` pattern matched the fetched text, after tags were stripped with `sed 's/<[^>]*>/ /g'`.
- Library pins the counters use: `twitter-text` 3.1.0 (last published 2022-06-28) and `@atproto/api` 0.32.7.
- Mastodon release 4.6.0 (2026-06-17) raised the alt-text limit to 10,000 and added `missing_attribution`. Release 4.7.6 (2026-11-19) carries the same counting code.
- Bluesky raised the image cap to 2,000,000 bytes during 2026, and Mastodon raised its alt-text limit twice in 2026. Re-check a limit before any release that depends on it, whatever its `refresh_days`.
- Re-check early on these events: a `twitter-text` or `@atproto/api` release, a Mastodon minor release, a Threads API version bump, a change to X pricing.
- The Threads pages carry no date or version, so the Threads rows record `none` and rely on the `expect` pattern.

## Refresh

Every row carries `refresh_days`. Every row is 90 except X-F03 at 30 (price) and WC-F01 at 180 (the one authority row). Limits, policy, API fields and label triggers use 90, because microblog limits changed faster than a 180-day interval in 2026. `checks/facts_check.py` in `channel-publishing` fails on the first overdue row. Re-fetch the row and update `verified`. Never extend the date without fetching.

Weekly re-fetch job: run each row's `url` and match `expect`, as `channel-publishing` documents. None of these hosts blocks scripts. A 403 or 429 is `UNREACHABLE`, never a change.

## Registry

Columns: `id, platform, fact, value, url, source_date, verified, refresh_days, provenance, expect`. The counters read `value` as the first integer in the cell (commas removed) for rows X-F04, X-F05, X-F07, BS-F05, BS-F06, BS-F07, BS-F08, MA-F03, MA-F04, MA-F06, TH-F03, TH-F05 and TH-F07.

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| X-F01 | x | automated accounts must enable the Automated profile label | required | https://docs.x.com/developer-guidelines.md | none | 2026-11-27 | 90 | platform | Enable the 'Automated' profile label |
| X-F02 | x | programmatic replies only when the author summoned the account | since 2026-02-23 | https://docs.x.com/changelog | 2026-02-23 | 2026-11-27 | 90 | platform | summoned |
| X-F03 | x | per-post API price | $0.015 per post, $0.20 with a URL | https://docs.x.com/changelog | 2026-04-16 | 2026-11-27 | 30 | platform | 0\.015[^0-9]{0,6}per post |
| X-F04 | x | maximum weighted post length | 280 | https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json | none | 2026-11-27 | 90 | platform | "maxWeightedTweetLength": 280 |
| X-F05 | x | weighted length of every URL | 23 | https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json | none | 2026-11-27 | 90 | platform | "transformedURLLength": 23 |
| X-F06 | x | the counting page states 280 characters, URLs wrapped and counted as 23 | prose | https://docs.x.com/fundamentals/counting-characters | none | 2026-11-27 | 90 | platform | count as +23 characters |
| X-F07 | x | maximum alt text length on a media upload | 1000 | https://docs.x.com/x-api/media/metadata-create | none | 2026-11-27 | 90 | platform | "text":\{"type":"string","maxLength":1000 |
| X-F08 | x | identical or substantially similar content across multiple accounts is banned | prohibited | https://docs.x.com/developer-terms/policy | none | 2026-11-27 | 90 | platform | Never post identical or substantially similar content |
| X-F09 | x | a reply is a second create call that carries the parent id | in_reply_to_tweet_id | https://docs.x.com/x-api/posts/create-post | none | 2026-11-27 | 90 | platform | in_reply_to_tweet_id |
| BS-F01 | bluesky | bot accounts should self-label on the profile | best practice | https://atproto.com/guides/bot-tutorial | none | 2026-11-27 | 90 | platform | self-label to their profile |
| BS-F02 | bluesky | bots interact only with users who tagged them | opt-in | https://atproto.com/guides/bot-tutorial | none | 2026-11-27 | 90 | platform | tagged the bot account |
| BS-F03 | bluesky | official app has an Automation label toggle that writes the `bot` self-label | app 1.119.0, 2026-03-17 | https://github.com/bluesky-social/social-app/pull/10008 | 2026-03-10 | 2026-11-27 | 90 | platform | add bot/automated account badge and self-labeling settings |
| BS-F04 | bluesky | `bot` is a known global label value; only global values can be self-labels | knownValues includes bot | https://atproto.com/guides/labels | none | 2026-11-27 | 90 | platform | bot +which indicates th[a-z]+ an account is automated |
| BS-F05 | bluesky | maximum post length in graphemes | 300 | https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/feed/post.json | none | 2026-11-27 | 90 | platform | "maxGraphemes": 300 |
| BS-F06 | bluesky | maximum post length in UTF-8 bytes | 3000 | https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/feed/post.json | none | 2026-11-27 | 90 | platform | "maxLength": 3000 |
| BS-F07 | bluesky | maximum image size in bytes, the lexicon wins over the docs prose | 2000000 | https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/embed/images.json | none | 2026-11-27 | 90 | platform | "maxSize": 2000000 |
| BS-F08 | bluesky | maximum link-card thumb size in bytes | 1000000 | https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/embed/external.json | none | 2026-11-27 | 90 | platform | "maxSize": 1000000 |
| BS-F09 | bluesky | facet indices count UTF-8 bytes, not UTF-16 units | UTF-8 bytes | https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/richtext/facet.json | none | 2026-11-27 | 90 | platform | counting bytes of the UTF-8 encoded text |
| BS-F10 | bluesky | image alt is a required field that may be an empty string | alt required | https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/embed/images.json | none | 2026-11-27 | 90 | platform | "required": \["image", "alt"\] |
| BS-F11 | bluesky | the client builds the link card and uploads its thumb | app.bsky.embed.external | https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md | none | 2026-11-27 | 90 | platform | app\.bsky\.embed\.external |
| BS-F12 | bluesky | a reply carries both the parent and the root reference | root and parent with uri and cid | https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md | none | 2026-11-27 | 90 | platform | the immediate parent post and the original root post |
| BS-F13 | bluesky | a domain handle is free identity proof and is not the blue check | 270,000 accounts as of 2025-04-21 | https://bsky.social/about/blog/04-21-2025-verification | 2025-04-21 | 2026-11-27 | 90 | platform | set their domain as their username |
| BR-F01 | bridgy-fed | bridged text is truncated at 300 characters | 300 | https://fed.brid.gy/docs | none | 2026-11-27 | 90 | platform | limited to 300 characters |
| BR-F02 | bridgy-fed | bridged video limit | 60 seconds, 100MB | https://fed.brid.gy/docs | none | 2026-11-27 | 90 | platform | 60 seconds, 100MB |
| BR-F03 | bridgy-fed | a post over two weeks old is not bridged | two weeks | https://fed.brid.gy/docs | none | 2026-11-27 | 90 | platform | over two weeks |
| MA-F01 | mastodon | the bot flag is a visual indication only | visual only | https://docs.joinmastodon.org/user/profile/ | 2026-04-15 | 2026-11-27 | 90 | platform | visual indication only |
| MA-F02 | mastodon | mastodon.social and mastodon.online rule 6 | generative AI use must be disclosed | https://mastodon.social/api/v1/instance/rules | none | 2026-11-27 | 90 | platform | generative AI must be disclosed |
| MA-F03 | mastodon | default maximum post length in grapheme clusters, the instance API gives the live value | 500 | https://raw.githubusercontent.com/mastodon/mastodon/main/app/validators/status_length_validator.rb | 2025-03-03 | 2026-11-27 | 90 | platform | MAX_CHARS = 500 |
| MA-F04 | mastodon | characters reserved for every URL | 23 | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/user/posting.md | 2026-07-08 | 2026-11-27 | 90 | platform | counted as 23 characters |
| MA-F05 | mastodon | a link must begin with http:// or https:// to be a link | scheme required | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/user/posting.md | 2026-07-08 | 2026-11-27 | 90 | platform | must begin with .http:// |
| MA-F06 | mastodon | alt text limit for media attachments since 4.6.0, set per instance | 10000 | https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md | 2026-06-17 | 2026-11-27 | 90 | platform | alt text limit for media attachments to 10,000 characters |
| MA-F07 | mastodon | a preview card reports missing_attribution when the domain is not on the account's list | since 4.6.0 | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/entities/PreviewCard.md | 2026-10-08 | 2026-11-27 | 90 | platform | missing_attribution |
| MA-F08 | mastodon | credit needs a fediverse:creator meta tag and the domain in Websites allowed to credit you | both required | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/user/profile.md | 2026-04-15 | 2026-11-27 | 90 | platform | Websites allowed to credit you |
| MA-F09 | mastodon | link verification needs HTTPS, a page under 1 MB, and rel=me in the raw HTML | rel=me | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/user/profile.md | 2026-04-15 | 2026-11-27 | 90 | platform | accessible without executing JavaScript |
| MA-F10 | mastodon | a reply carries in_reply_to_id, and an Idempotency-Key is kept for up to 1 hour | 1 hour | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/methods/statuses.md | none | 2026-11-27 | 90 | platform | stored for up to 1 hour |
| MA-F11 | mastodon | a reply reaches a follower's Home only if they follow both parties | self-reply reaches all followers | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/user/posting.md | 2026-07-08 | 2026-11-27 | 90 | platform | follow both you and the person you are replying to |
| TH-F01 | threads | AI label set on the container-creation call only | is_made_with_ai=true | https://developers.facebook.com/docs/threads/posts | 2026-10-30 | 2026-11-27 | 90 | platform | is_made_with_ai |
| TH-F02 | threads | publishing limit | 250 posts per rolling 24 hours | https://developers.facebook.com/docs/threads/posts | 2026-10-30 | 2026-11-27 | 90 | platform | 250 published posts |
| TH-F03 | threads | maximum text post length | 500 | https://developers.facebook.com/documentation/threads/posts | none | 2026-11-27 | 90 | platform | Text posts are limited to 500 characters |
| TH-F04 | threads | emoji count as their UTF-8 byte length in the post limit | UTF-8 bytes | https://developers.facebook.com/documentation/threads/reference/publishing | none | 2026-11-27 | 90 | platform | emojis are counted as the number of UTF-8 bytes |
| TH-F05 | threads | maximum unique links in one post, counting link_attachment, enforced since 2025-12-22 | 5 | https://developers.facebook.com/documentation/threads/posts | 2025-12-22 | 2026-11-27 | 90 | platform | restricted to 5 or fewer |
| TH-F06 | threads | link_attachment works for text-only posts, not image, video or carousel | text only | https://developers.facebook.com/documentation/threads/posts | none | 2026-11-27 | 90 | platform | only available for text-only posts |
| TH-F07 | threads | maximum alt_text length | 1000 | https://developers.facebook.com/documentation/threads/reference/publishing | none | 2026-11-27 | 90 | platform | maximum length of .alt_text. is 1,?000 characters |
| WC-F01 | w3c | when the text in an image is not elsewhere on the page, put it in alt | text of the image | https://www.w3.org/WAI/tutorials/images/decision-tree/ | 2024-05-13 | 2026-11-27 | 180 | authority | Use the +alt +attribute to include the text of the image |

## Notes

- X-F03: the source date is the changelog entry date. X states the price took effect 2026-04-20.
- MA-F03: the validator constant is the default. Read `configuration.statuses.max_characters` from the target instance on every run (CH-MB-05).
- BS-F07: the Bluesky docs prose says 1,000,000 bytes for images and the lexicon says 2,000,000. The lexicon wins (CH-MB-14).
- Not in this registry on purpose: any statement that a platform penalises or favours links, threads or replies. Executive statements on X reversed between 2024-11-24 and 2026-07-29 (CH-MB-15).
- Hosts `raw.githubusercontent.com`, `github.com`, `bsky.social` and `fed.brid.gy` are tagged `platform` or `authority` here and need an entry in the human-kept host allowlist of `channel-publishing` (CH-CORE-15).

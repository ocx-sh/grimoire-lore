# community-post

Fact sheets and checklists for developer-community posts. The human who posts
gets facts, not paste-ready text, because several venues ban generated content.

```sh
grim add ghcr.io/ocx-sh/lore/community-post
```

Reach for it when someone wants to post a Show HN or submit to Lobsters. It also
fits sharing on a subreddit, answering on Stack Overflow, and cross-posting to
dev.to or Hashnode. Also use it to announce in a Discord or Matrix server.

## The agent reports facts and the human writes

For Hacker News, Lobsters, Reddit, Stack Overflow, dev.to, Hashnode and chat
venues, the skill writes a fact sheet and runs checks. When a check fails, it
reports the failure. It does not offer a corrected title, because that is
AI-edited text.

Venue contracts are read on the day. The skill covers account gates, Show HN
eligibility and title checks, and one submission per URL. It forbids vote
requests. It treats Stack Overflow as support only and chat as a secondary
channel. The venue facts live in a dated registry.

## What agents get wrong here

The skill ranks ten failures. Writing the words for the human to paste is first.
Then polishing instead of reporting, and a marketing register in a community
venue. Next are platform facts from memory, soliciting votes inside a growth
checklist, and a fresh account the week of launch. Points as the goal and retry
by repost follow.

20 rows hold the rationale and verification. 15 of them are MUST. One script,
`venue_check.py`, checks a fact sheet and carries `--self-test`.

## What it does not cover

Planning a multi-venue launch belongs to `launch-plan`. GitHub Discussions and
`SUPPORT.md` belong to `github-presence`.

## Siblings

It requires `channel-publishing`, which installs with it. Bundled as
`product-essentials`.

# linkedin-post

Drafts and reviews a person-led LinkedIn post about a software tool. It ends in
a draft file for a human to post.

```sh
grim add ghcr.io/ocx-sh/lore/linkedin-post
```

Reach for it when someone asks for a LinkedIn post or a LinkedIn announcement
of a release or launch. Also use it for a carousel or document post, a company
Page update, or a review of a LinkedIn draft.

## An agent drafts, a named human posts

The skill turns a brief into a draft file, checks it, and hands it over with the
questions only the human can answer. It never posts, schedules, comments,
reposts or uploads. It never opens linkedin.com in a browser.

## What the draft carries

A goal and metric header comes first. The rules then cover the first three
lines, the length limit and link placement. They cover link cards and their Open
Graph tags, document posts, image alt text and polls.

They also name the engagement-bait patterns to avoid. A sponsorship or AI-use
disclosure goes in the first line or two, before the "see more" cut. LinkedIn
has no AI label field. So the draft states the AI line as an explicit true or
false. It lists the Brand partnership toggle as a manual step.

Every limit, policy clause and reach figure comes from a dated row in
`references/facts.md`. With no row, the draft states no number.

22 rows hold the rationale and verification. 15 of them are MUST. One script,
`li_draft_check.py`, checks the draft file and carries `--self-test`.

## What it does not cover

Posting, scheduling and automation. LinkedIn bans them and `channel-publishing`
forbids them. Posts on X, Bluesky, Mastodon and Threads belong to
`microblog-post`.

## Siblings

It requires `channel-publishing`, which installs with it. `youtube-video`,
`community-post` and `launch-plan` cover the other venues. Bundled as
`product-essentials`.

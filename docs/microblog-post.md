# microblog-post

Drafts and checks release and announcement posts for X, Bluesky, Mastodon and
Threads. Each platform has its own length counter, link-card behaviour and
alt-text rule.

```sh
grim add ghcr.io/ocx-sh/lore/microblog-post
```

Reach for it when someone asks for a tweet or X post, a Bluesky post, a toot or
Mastodon post, or a Threads post. Also use it for a thread announcing a
release, or a check of a post's length.

## One post, four counters

The skill never treats the X and Bluesky limits as one limit. It counts with
each platform's own counter, not with `len()`. URLs are written in full, since a
bare `example.com/docs` links on X and Bluesky and is plain text on Mastodon.

The draft states link cards and facets, alt text, and whether the update is one
post or a thread. A patch release is not an eight-post thread. It states the
Mastodon verification links and the fediverse creator tag. It never sends one
body to two accounts.

An agent drafts. A named human posts, unless the owner has commissioned an
automation row in `channel-publishing`.

## What agents get wrong here

The skill lists the failure modes and the rule that catches each. Counting with
the wrong counter is first. Then comes moving the link to the first reply
because advice from an earlier year says so. Then comes quoting from memory how
much a platform penalises links.

The rest are a text URL on Bluesky with no card, empty or lazy alt text, and a
`fediverse:creator` tag without its attribution domain.

24 rows hold the rationale and verification. 15 of them are MUST. The
`mb_check.py` script checks a draft. The `mb_count.mjs` script counts with each
platform's own library and needs Node and two pinned packages.

## What it does not cover

LinkedIn belongs to `linkedin-post`. Bot or scheduled posting needs an
owner-commissioned automation row in `channel-publishing`.

## Siblings

It requires `channel-publishing`, which installs with it. Bundled as
`product-essentials`.

# channel-publishing

The boundary every public-channel skill shares. An agent ends public-channel
work at a publish package. A named human posts.

It holds what the agent may produce for each venue, which label fields to fill
and where a disclosure goes. It holds the dated platform-facts registry format
and the `channels.yml` inventory of accounts a project may link.

```sh
grim add ghcr.io/ocx-sh/lore/product-essentials
```

Installed by the `product-essentials` bundle. The `github-presence`,
`linkedin-post`, `youtube-video`, `microblog-post`, `terminal-demo`,
`community-post` and `launch-plan` skills each require it, so grim pulls it in
with any of them. The skill is not user-invocable. The agent loads it when it
drafts or reviews a public post, upload, listing or announcement. It also loads
when the agent adds a social link or badge, wires a bot that posts, or edits
`channels.yml`.

## Find the venue first

A venue decides the output. LinkedIn, YouTube, X and similar platforms get a
publish package, never a post or an upload. Hacker News, Lobsters and dev.to
promotion get a fact sheet and nothing else.

Reddit gets a fact sheet until the subreddit's rules are fetched and quoted.
Stack Overflow gets nothing. An unknown venue gets the strictest output, and the
gap goes into `open_asks`.

The package is a draft file with ten header keys. A human fills `approved_by`
and `approved_at`. The agent leaves them empty.

## Platform facts go stale on a date

Every limit, window and policy clause comes from a row in a registry file, cited
by its ID. Each row carries a source URL, a verified date and a refresh
interval. The `facts_check.py` script fails when a row is past its interval.
The fix is to re-fetch the row. Moving the date is never the fix.

The skill states 19 rows. 15 of them are MUST. Five scripts check the boundary,
the channel inventory, a draft, the registry and a fact sheet. A sixth file
holds the publishing-credential scan rules. Each script carries `--self-test`.

## What it does not cover

GitHub, npm, PyPI, crates.io, the VS Code Marketplace and GHCR are out of
scope. Use `github-presence` and `release-notes` for those. This skill does not
write a post. The platform skills own the content rules for each venue.

## Siblings

Each platform skill keeps its own dated `references/facts.md`. Bundled as
`product-essentials`.

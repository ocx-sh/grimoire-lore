---
title: Does any scheduler, bridge or GitHub Action in use drop or delay a self-reply? (CH-MB-07 follow-up)
program: product
topic: channel-microblog
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
---

# Does any scheduler, bridge or GitHub Action drop or delay a self-reply?

## Answer

Partly yes, for one bridge. Bridgy Fed delivers self-replies on purpose and only delays them by a rate limit. But its maintainer reported, on 2025-08-16, a bug that dropped replies when the post they depend on "hadn't finished bridging yet", and said he "hopefully fixed" it and was "still keeping an eye on it". A self-reply sent seconds after post 1 is exactly that case. No fetched Buffer or Publer page states that a thread sub-post is dropped. Of five inspected GitHub Actions, four have no reply input at all. CH-MB-07 therefore regains a narrow mechanical argument (Mastodon to Bluesky bridge only), and stays SHOULD.

| Tool | Drops a self-reply? | Delays it? | Evidence |
|---|---|---|---|
| Bridgy Fed (Mastodon to Bluesky bridge) | Not by design. A reply whose parent is not yet bridged was dropped before the 2025-08-16 fix, which the maintainer calls "hopefully" fixed. | Yes: one activity per 5 s per user, queued, not dropped. | Code, docs, maintainer post below. |
| Buffer | No statement found. | No statement found. | Help pages below carry no failure or delay statement for threads. |
| Publer | No statement found. | Delay is user-set ("Is older than" condition); replies publish in sequence. | Publer help page below. |
| GitHub Actions for posting | Not applicable: 4 of 5 inspected actions have no reply input. | n/a | Input lists below. |

## Bridgy Fed

Source: https://github.com/snarfed/bridgy-fed, shallow clone (`git clone --depth 1`, fetched 2026-11-27) at `~/.cache/research-lang/exemplars/product/wave2/mb-q1/bridgy-fed`. Command and output:

```
$ git -C bridgy-fed log -1 --format='%H %cs'
96187d6825e8433da138d97b9686c4e4120c7eb9 2026-11-25
```

1. Self-replies are a designed case ([protocol.py](https://github.com/snarfed/bridgy-fed/blob/96187d6/protocol.py), HEAD 2026-11-25):
   ```
   $ grep -n "deliver self-replies" -A4 protocol.py
   2251:            # deliver self-replies to followers
   2252-            # https://github.com/snarfed/bridgy-fed/issues/639
   2253-            if target_id in in_reply_tos and owner == as1.get_owner(orig_obj.as1):
   2254-                is_self_reply = True
   2255-                logger.info(f'self reply!')
   ```
2. A reply is bridged only if its parent was bridged. [templates/docs.html](https://github.com/snarfed/bridgy-fed/blob/96187d6/templates/docs.html) line 577, rendered at https://fed.brid.gy/docs (page shows no date; fetched 2026-11-27):
   ```
   $ grep -n "only bridged if" templates/docs.html
   577:<li>Replies, reposts, and quote posts are only bridged if the original post being replied to, reposted, or quote posted was also bridged.
   ```
3. Delay, not drop. Same file, same page:
   ```
   $ sed -n 416p templates/docs.html
   <li>We rate limit bridging activities (posts, replies, likes, reposts, follows, unfollows, deletes, etc) to one every 5 seconds per user. If you do things faster than that, we'll still bridge them all, they just get delayed.
   ```
4. Age gate. Same repository, `protocol.py` at `96187d6`:
   ```
   $ grep -n "CREATE_MAX_AGE" protocol.py
   71:CREATE_MAX_AGE = timedelta(weeks=2)
   72:CREATE_MAX_AGE_EXEMPT_DOMAINS = (
   1489:                    if (age > CREATE_MAX_AGE
   1492:                                from_user.key.id(), CREATE_MAX_AGE_EXEMPT_DOMAINS)):
   1493:                        error(f'Ignoring, too old, {age} is over {CREATE_MAX_AGE}',
   $ sed -n 410p templates/docs.html | cut -c1-120
   <li>Bridgy Fed currently doesn't bridge posts if they're over two weeks old. This is largely
   ```
   A correction to the first pass: the `Ignoring, too old` message is on line 1493, not 1489 (1489 is the age comparison). A self-reply published minutes after post 1 never meets this gate.
5. The dependency race, the one documented drop mode. Primary source: Bridgy Fed status post by the maintainer, https://snarfed.org/2025-08-16_55391 (published 2025-08-16, fetched 2026-11-27). Command and output:
   ```
   $ curl -sL https://snarfed.org/2025-08-16_55391 -o p.html
   $ grep -o "Hopefully fixed a persistent issue[^<]*" p.html
   Hopefully fixed a persistent issue where replies, likes, reposts, and quotes sometimes wouldn&#8217;t get bridged to Bluesky if they post they depended on hadn&#8217;t finished bridging yet.
   $ grep -o "Another complicated one[^<]*" p.html
   Another complicated one, still keeping an eye on it for now.
   $ grep -oE '<time class="dt-published"[^>]*>[^<]*' p.html
   <time class="dt-published" datetime="2025-08-16T12:50:52-07:00">August 16, 2025
   ```
   A later status post, https://snarfed.org/2025-10-01_55855 (2025-10-01, fetched 2026-11-27), lists "Handle dependent activities that arrive in the wrong order, eg delete before create" (`grep -oiE "[^.>]*(dependen|wrong order)[^.<]*"`). Neither post confirms the reply race is closed. The clone has one commit (depth 1), so the fix cannot be dated from history; `grep -nE "dependen|still bridging|not bridged yet|bridging yet" protocol.py` prints only unrelated lines (746, 997, 1059, 2331). Vendor-neutral caveat: this is the bridge maintainer's own statement; no third-party report was found. Search run: `WebSearch "Bridgy Fed self reply not bridged thread missing Bluesky"` (2026-11-27) returned the same snarfed.org post and no user report of a dropped self-reply.

Reading: a self-reply is the first activity that depends on a post bridged seconds before. Whether the 2025-08-16 fix holds in 2026-11 is not determinable without the operator's logs.

## Buffer

Neither page shows a publication date; both fetched 2026-11-27.

- https://support.buffer.com/articles/scheduling-posts-4Qdld7giAZ (no date shown, fetched 2026-11-27, vendor documentation): "Threaded posts are available on X/Twitter, Threads, Mastodon, and Bluesky." Threaded Posts is flagged Beta ("Learn more in How to test Buffer's Beta features here."). "Each paragraph (separated by a blank line) becomes its own post in the thread." A first comment is schedulable on "LinkedIn, Instagram professional accounts, and Facebook Page posts" only. So a "link in the first reply" on X, Bluesky, Mastodon or Threads is a thread of 2 posts.
- Same page, the one concrete limit near this topic: "Link previews aren't currently available for posts over 280 characters on X/Twitter due to API limitations."
- https://support.buffer.com/articles/using-bluesky-with-buffer-7f6OcRnzIO.md (no date shown, fetched 2026-11-27, vendor documentation): "You can include up to 25 threaded sub-posts within one post." "The Free plan allows for one Bluesky thread scheduled at a time in each queue." "We don't currently have an error library for Bluesky". The page does not mention link previews or 280 characters.
- Neither page states that a sub-post is dropped or delayed. Absence of a statement is not proof.

## Publer

Query run: `WebSearch "Publer schedule thread X Bluesky Mastodon replies thread posts failed"` (2026-11-27). It returned Publer marketing and help pages only, and no failure report. Vendor page fetched: https://publer.com/help/en/article/how-to-create-and-schedule-bluesky-threads-4x8m1l.md (no date shown, fetched 2026-11-27, vendor documentation): "Each follow-up reply will get shared after the previous one." "use the Is older than condition to specify the delay for the next comment." "You can add up to 25 posts in a Bluesky thread." The page says nothing on retries or failed thread posts. Metricool was not fetched: the search returned no Metricool page, so the first pass's mention of Metricool is withdrawn.

## GitHub Actions that post

Five repositories cloned with `--depth 1` into `~/.cache/research-lang/exemplars/product/wave2/mb-q1/` (fetched 2026-11-27). Commands and output, run in that directory:

```
$ grep -nE "^  [a-z-]+:|^inputs" mastodon-github-action/action.yml | head -12
5:inputs:
6:  url:  9:  access-token:  12:  message:  15:  visibility:  19:  sensitive:
23:  spoiler-text:  26:  language:  29:  scheduled-at:  32:  media-paths:  35:  media-descriptions:
$ grep -nE "^  [a-z_-]+:|^inputs" post-to-mastodon/action.yml
7:inputs:  8:  message  11:  base_blog_url  17:  base_directory  23:  access_token  26:  host  29:  port  32:  api
$ grep -nE "reply" -B1 -A2 bluesky-post/action.yaml
20-    description: URL for link preview.
21:  reply-to:
22-    description: >
23-      AT-URI of the post to reply to.
24-      For example, "at://did:plc:xxxx/app.bsky.feed.post/yyyy".
$ grep -rniE "reply" bluesky-post-action/src bluesky-post-action/action.yml bluesky-post-action/README.md; echo "exit $?"
exit 1
$ grep -nE "^  [a-z_-]+:|^inputs" broadcast-action/action.yml
8:inputs:  9:  platforms:  12:  config-path:  16:  dry-run:  20:  posts-index-url:  24:  posts-index-secret:
$ grep -rniE "\breply\b|in_reply|\bthread" broadcast-action --exclude-dir=.git --exclude-dir=dist
broadcast-action/README.md:166:| `platforms` | yes | ... `slack, threads, reddit, ...` (platform id list; "Threads" the network, not reply threads)
broadcast-action/.github/workflows/broadcast-reusable.yml:77:        description: "Job-level ceiling in minutes. ... Threads once those ship ..."
```

(Whitespace in the first two outputs is condensed to one line; the key names are exact. `dist/index.js` of the sizls action matched only bundled-library words such as `worker_threads` and `createReplyError`, which are not inputs, so `dist` is excluded.)

| Action | Repository | HEAD date | Reply input |
|---|---|---|---|
| myConsciousness/bluesky-post | https://github.com/myConsciousness/bluesky-post | 2026-08-03 (`2d13286`) | Yes: `reply-to`, an AT-URI. |
| zentered/bluesky-post-action | https://github.com/zentered/bluesky-post-action | 2026-11-08 (`bd81a02`) | None (grep exit 1, no output). |
| cbrgm/mastodon-github-action | https://github.com/cbrgm/mastodon-github-action | 2026-11-20 (`7fa0c62`) | None (inputs listed above). |
| sumit4613/post-to-mastodon | https://github.com/sumit4613/post-to-mastodon | 2022-12-28 (`12fc6b0`) | None; unmaintained. |
| sizls/broadcast-action | https://github.com/sizls/broadcast-action | 2026-07-27 (`dd8ee22`) | None (inputs listed above). |

Consequence: except on Bluesky with `myConsciousness/bluesky-post`, an agent that posts a reply from a workflow must call the platform API itself. That is a second publish step that can fail while step 1 succeeded. It is an implementation cost, not a platform drop. Reply API facts, fetched earlier in this follow-up on 2026-11-27: X needs `in_reply_to_tweet_id` ([docs.x.com](https://docs.x.com/x-api/posts/create-post), no date shown); Mastodon needs `in_reply_to_id` and keeps an `Idempotency-Key` "for up to 1 hour" ([statuses.md](https://raw.githubusercontent.com/mastodon/documentation/main/content/en/methods/statuses.md)); Bluesky needs `root` and `parent` refs with `uri` and `cid` ([bsky-docs posts.md](https://github.com/bluesky-social/bsky-docs/blob/main/docs/advanced-guides/posts.md), clone HEAD `fd3d7f8`, 2026-08-18, lines 251 to 297).

## Effect on the ruleset

- **CH-MB-07: confirm at SHOULD; change the rationale.** Replace the last sentence of the rationale with: "Bridgy Fed delivers self-replies on purpose and delays them one activity per 5 s per user ([fed.brid.gy/docs](https://fed.brid.gy/docs), `protocol.py` at `96187d6`, 2026-11-25). Its maintainer reported replies being dropped when the post they depend on had not finished bridging and fixed it 'hopefully' on 2025-08-16 ([snarfed.org](https://snarfed.org/2025-08-16_55391)). No fetched scheduler drops a reply. The rule rests on post 1 carrying the claim (CH-MB-08) and on a reply being a second publish step that can fail alone." Do not promote to MUST: the race is fixed or fixed-in-part, and it covers one bridge. Verification (stated in full, unchanged): "Draft check: post 1 has 1 URL or a Bluesky `embed.external`. Posts 2 and later contain no URL that post 1 lacks. Fail: `ocx 0.14.0 is out, thread below`, with the URL only in reply 1."
- **CH-MB-08: confirm, no text change.** Verification (stated in full, unchanged): the draft check on the text before the first URL: (1) it contains the product name, (2) it contains the tag with a leading `v` removed, verbatim, (3) it shares at least one word of 4 or more letters, case-insensitively, with the MKT-REL-14 summary line, stop words excluded. Pass: `ocx 0.14.0 adds lock v4: pins resolve offline. Notes: https://…`. Fail: `ocx 0.14.0 is out, a great update! https://…`. Post 1 standing alone is now the main basis of CH-MB-07, so this check carries more weight.
- **CH-MB-21 (Bridgy Fed limits): change, add text.** Append: "Bridgy Fed does not bridge a post whose `published` is over 2 weeks old and rate limits to one activity per 5 s per user (delay, not drop)." Verification addition: `grep -n 'CREATE_MAX_AGE = ' protocol.py` in a fresh clone of https://github.com/snarfed/bridgy-fed prints `71:CREATE_MAX_AGE = timedelta(weeks=2)`. Severity stays CONSIDER.
- **NEW CH-MB-24 (SHOULD), reply step failure and bridge ordering.** Rule: "If a release uses a thread, publish post 2 only after post 1 returned its id. When the bridge flag is set, also wait at least 60 s after post 1 before posting post 2 (a project default, not a platform fact; the 2025-08-16 dependency race and the 5 s rate limit are the reason). If post 2 fails, keep post 1 and report the failure; do not delete or re-post post 1. Pass an idempotency key on retries where the platform has one (Mastodon `Idempotency-Key`)." Rationale: the reply is a separate API call (4 of 5 actions have no reply input), Mastodon keeps an idempotency key for 1 hour, and Bridgy Fed once dropped replies whose parent was still bridging. Verification: a fixture where the reply call returns an error makes the release step exit non-zero, and the log shows post 1's id and no second create call for post 1; with the bridge flag set, the log timestamp of the post 2 call is at least 60 s after the post 1 call. Concerns thread posts only, which CH-MB-09 limits to at most 3.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Bridgy Fed delivers self-replies; 5 s per user queue; 2-week cap | https://github.com/snarfed/bridgy-fed `protocol.py`, `templates/docs.html`; https://fed.brid.gy/docs | HEAD 2026-11-25 (`96187d6`); docs page shows no date |
| Replies, likes, reposts, quotes sometimes not bridged when the dependency had not finished bridging; "hopefully fixed", still monitored | https://snarfed.org/2025-08-16_55391 (maintainer, vendor-side statement) | 2025-08-16 |
| Bridgy Fed handles dependent activities arriving in the wrong order | https://snarfed.org/2025-10-01_55855 | 2025-10-01 |
| Buffer threads on X, Threads, Mastodon, Bluesky (Beta); first comment only LinkedIn, Instagram, Facebook; no link previews over 280 characters on X | https://support.buffer.com/articles/scheduling-posts-4Qdld7giAZ (vendor) | no date shown; fetched 2026-11-27 |
| Buffer Bluesky threads up to 25 sub-posts; no Bluesky error library | https://support.buffer.com/articles/using-bluesky-with-buffer-7f6OcRnzIO.md (vendor) | no date shown; fetched 2026-11-27 |
| Publer follow-up replies publish in sequence, delay set by "Is older than", 25 posts | https://publer.com/help/en/article/how-to-create-and-schedule-bluesky-threads-4x8m1l.md (vendor) | no date shown; fetched 2026-11-27 |
| Action reply inputs | the five repository URLs above | HEADs 2022-12-28 to 2026-11-20 |
| Mastodon idempotency key 1 hour | https://raw.githubusercontent.com/mastodon/documentation/main/content/en/methods/statuses.md | fetched 2026-11-27 |
| X `in_reply_to_tweet_id` | https://docs.x.com/x-api/posts/create-post | no date shown; fetched 2026-11-27 |

## What could not be determined

- Whether the 2025-08-16 Bridgy Fed fix closed the reply-before-parent race in 2026-11: only the operator's logs or a live bridged account show it. A test needs a Mastodon account and a bridged Bluesky account, which this run may not create or use.
- Buffer, Publer and Metricool behaviour on a failed sub-post: no public statement fetched; testing needs a paid logged-in account and a posting credential. Metricool pages were not fetched.
- Whether any scheduler delays a reply relative to post 1 by minutes in practice (needs a live account on each platform).
- Whether Bridgy Fed's queue exceeds 5 s spacing under load.
- Whether any third party reported a dropped self-reply: two searches were run, none found, which is not an exhaustive negative.
- The 60 s wait in CH-MB-24 is a project default with no measured basis.

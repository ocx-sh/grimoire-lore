---
title: Microblog link placement and single-post-versus-thread defaults for software release posts (X, Bluesky, Mastodon, Threads)
program: product
sub_program: channels
topic: channel-microblog
worker: mb-link-and-thread-defaults
date_researched: 2026-11-27
model: sonnet
sources_fetched: 30
scope: Two checkable draft properties of a release post: where its link sits (body, first reply, none) and whether it is one post or a thread (count, link position). Covers X, Bluesky, Mastodon, Threads. Does not cover which platform to be on, automation (core-agent-action-boundary) or account voice (marketing). X engagement is not measured (no paid API tier used, no scraping).
---

# Microblog link placement and thread defaults

## Contents

1. Summary
2. Findings
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

Evidence grades used below: **A** platform or authority states it in its own docs or code; **B** independent or reproducible measurement with n and window stated; **C** conflicting or vendor-only evidence, or platform statement relayed second-hand; **D** no evidence found.

## 1. Summary

- Default for a release post on all four platforms: put the link in the body of post 1. Do not default to link-in-first-reply. Evidence grade C on X, C on Bluesky, A on Mastodon (no ranking), C on Threads.
- X: the platform's head of product said "Just post the link in the body" (2026-04-13) and "you do not need to put the links in replies anymore" (2026-07-28), and Musk said X has not throttled link posts "for over a year" (2026-07-29). Both are quoted by secondary outlets; the X posts themselves were not fetched. Observational outside data contradict them (Buffer 18.8M posts, Nieman Lab 18 accounts). The open ranking code has no link penalty in the files read but sends `has_url` to a closed service.
- X link-in-reply is not cheaper or safer on cost: the X API charges $0.20 for any post containing a URL, so a reply holding the link is still a $0.20 post, plus the $0.015 lead post.
- Bluesky: no platform statement ties link presence to ranking. Measured on 11 exemplar accounts (n=469 top-level posts), within-account reposts plus replies for link versus no-link posts: link lower in 1 of 6 testable accounts, higher in 2, equal in 3. Grade B for "no consistent penalty", small n.
- Bluesky and Mastodon do not render a link card from a bare URL when posting by API: Bluesky needs a client-built `app.bsky.embed.external`. Mastodon builds the card server-side from the first link (4.7.0 uses the first `Link` attachment).
- Mastodon: API responses are "generally" reverse chronological (official API guidelines), and the home timeline is not ranked by link presence. Link placement has no ranking effect to optimise; optimise for the reader. Grade A for the ordering statement, with the caveat that the docs state it for API responses, not for the home timeline specifically.
- Threads: the first URL in text becomes the card; `link_attachment` works only on text-only posts; more than 5 links fails since 2025-12-22. Mosseri said Threads does not intentionally downrank links (reported via Social Media Today, 2025-06-08, undated quote).
- Single post versus thread: no study found on any platform (D). Default one self-contained post carrying the claim, the version and the link. Use a thread only when there are two or more distinct items, cap at 3 posts, and keep the link in post 1.
- Measured thread versus single on Bluesky, 6 accounts with at least 5 of each: root post reposts plus replies were higher for threads in 5 accounts and equal in 1. This is confounded: accounts choose threads for bigger announcements. Do not cite it as an effect.
- X mechanics favour a standalone post 1: the open code keeps one best-scoring post per conversation in a feed response (`DedupConversationFilter`), so thread posts compete against each other for a viewer's timeline.
- Microblog variants deserve their own small skill with a dated-facts file and a validator script, with launch-plan pointing to it, because the limits and policies decay faster than launch sequencing.

## 2. Findings

### 2.1 X: link placement

**What the platform has said.** Two second-hand reports, quoted verbatim by the outlet; the X posts were not opened.
- [roboin.io, 2026-04-13](https://roboin.io/article/en/2026/04/13/x-denies-link-deboost-recommends-in-post-links/): Nikita Bier replied "Fake news" to a claim that links are penalised and wrote "Just post the link in the body of the post and provide sufficient context about what the user will see before they click it". The article paraphrases (not quotes) an October 2025 Bier statement that X is not directly suppressing link posts but they may spread less because people forget to like or reply after clicking.
- [PPC Land, July 2026](https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/): Bier on 2026-07-28, "Hello Mark, you do not need to put the links in replies anymore". Musk on 2026-07-29, answering Paul Graham's "You no longer penalize tweets with links in them?": "We haven't for over a year." The same article reports a "94% fewer views" figure from its own analysis of the Phoenix model and states it describes an outcome, not a stated penalty.

Grade for "no deliberate link penalty": C. The statements are from the platform's own executives, but they come through trade press, they contradict earlier executive statements the same press records (Musk on 2024-11-24 told Paul Graham "Just write a description in the main post and put the link in the reply. This just stops lazy linking.", quoted by [Business Insider Japan](https://www.businessinsider.jp/post-297498), fetched 2026-11-27; the Washington Times and other copies listed in search returned 403 or were not opened), and outside measurements disagree.

**What the open code shows.** Cloned `xai-org/x-algorithm`, HEAD `52d4598` dated 2026-11-25. Commands in section 2.5.
- Link-related weights exist only as predicted-action weights: `OpenLinkWeight` 0.2 and `ClickWeight` 0.274 (`home-mixer/params/param.rs`, lines 498-499). No "penalty", "downrank" or "demot" string in `README.md`.
- `has_url` is computed (`home-mixer/models/content_features.rs`, `text.external_urls > 0`) and copied into the payload sent to the value-model ranker debias service (`home-mixer/scorers/vm_ranker_debias_payload.rs`, line 83). That service is not in the repository, so the code neither shows nor excludes a link effect. Grade A for "the open code contains no link penalty"; grade D for what the closed service does with `has_url`.
- The README states the weights multiply predicted probabilities and "do not scale the raw engagement counts", so ratios between weights are not count equivalences.
- `DedupConversationFilter` (`home-mixer/filters/dedup_conversation_filter.rs`) groups candidates by conversation id and keeps only the highest-scoring one per conversation, so several posts of one thread do not all appear in a viewer's batch. Grade A.

**Outside measurements, vendor and press.**
- [Buffer, 2025-10-14](https://buffer.com/resources/links-on-x/), vendor data: 18.8 million posts from 71,000 accounts; "As of August 2025" engagement for regular accounts: link 0%, image about 0.20%, video about 0.25%, text about 0.40%; Premium: link about 0.28%, text about 0.90%. The 0% is a median stuck at zero since March 2025. The article does not define engagement rate, states no collection window, and calls the "platform incentives" explanation the most likely one. It recommends link in a reply as "not foolproof" and reports no test of reply placement. Treat link-in-reply as untested.
- [Nieman Lab, 2026-04-08](https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/), independent: 200 latest tweets from each of 18 accounts (15 publishers, 3 engagement accounts), window not stated. Link-heavy publishers cluster at low engagement; Fox News linked in 9% of tweets and had the third-highest median. The author notes other factors matter; Bier replied that the NYT's low engagement came from its paywall and caption quality. This measures news publishers, not developer tools.

**Cost.** [X pricing page](https://docs.x.com/x-api/getting-started/pricing) (undated): "Post: Create" $0.015, "Post: Create (with URL)" $0.200. The [changelog](https://docs.x.com/changelog) dates the change to 2026-04-16: "Posts containing a URL are $0.20 per Post". Both the scout's figures reproduce. Any placement of a link, body or reply, costs the same $0.20 once.

**Decision for X.** Default link in body of post 1, written so the post makes sense without the click (Bier's own advice). Do not assert in any artifact that links are penalised or that they are not; both are contested. CONSIDER testing on the project's own account (section 3, rule MB-LT-4).

### 2.2 Bluesky: link placement and card mechanics

- Platform ranking statements: the [Bluesky feeds blog, 2023-07-27](https://bsky.social/about/blog/7-27-2023-custom-feeds) describes an open marketplace of feeds and a default Discover feed that "blends a network-wide view of trending posts with posts from followed accounts"; it says nothing about links. The following feed being strictly chronological comes only from third-party guides in search results (not fetched). No platform statement on link reach: grade D.
- Card mechanics, [bsky-docs posts.md](https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md): a card is an `app.bsky.embed.external` object with `uri`, `title`, `description` and optional `thumb` blob; the example script reads `og:title`, `og:description`, `og:image` and uploads the image with `com.atproto.repo.uploadBlob`. The doc states no thumb size limit. Its prose says images are limited to 1,000,000 bytes while its own upload code rejects files over 2,000,000; the scout's flagged conflict reproduces. Prefer the lexicon over prose.
- Thread mechanics: a thread is a chain of replies; each reply record carries `root` (first post) and `parent` strong references (`uri` and `cid`); if the parent is top-level it is also the root. A thread cannot be a single atomic post.
- Counting: the `app.bsky.feed.post` lexicon sets `text` to `maxLength` 3000 (UTF-8 bytes) and `maxGraphemes` 300, and the `app.bsky.richtext.facet#byteSlice` description says indices are "counting bytes of the UTF-8 encoded text", start inclusive, end exclusive, with a note to convert from UTF-16 or code points in languages like JavaScript. Source: [atproto lexicons](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/post.json) (cloned 2026-11-27, HEAD `dce608b` dated 2026-11-27; platform; files read at `packages/pds/lexicons/app/bsky/feed/post.json` lines 19-21 and `richtext/facet.json` line 43; the GitHub raw path `lexicons/app/bsky/feed/post.json` returned 404 so the path in this link may have moved, the clone is authoritative). Command: `grep -n -E 'maxGraphemes|maxLength' packages/pds/lexicons/app/bsky/feed/post.json`.

**Measurement.** Public AppView, no authentication, run 2026-11-27. Script `bsky.py` stored in `~/.cache/research-lang/exemplars/product/mb/`.

```
python3 -I bsky.py vite.dev svelte.dev astro.build zed.dev bun.sh nodejs.org github.com vercel.com rust-lang.org python.org docker.com deno.com tailwindcss.com
```

Method: `app.bsky.feed.getAuthorFeed?filter=posts_and_author_threads&limit=100`, drop reposts, take the latest up to 50 top-level posts per account. A post "has a link" when it has a link facet or an external embed (incl. record-with-media). A post is a "thread root" when the account itself posted a reply whose `reply.root` is that post. 11 of 13 accounts returned data (`deno.com` HTTP 400; `tailwindcss.com` returned nothing, not in output). Convenience sample of verified-domain handles, not random. Windows differ per account (earliest post: svelte.dev 2023-04-27, bun.sh 2024-11-02, others 2025 to 2026-10).

| slice | n | median reposts | median replies | median likes |
|---|---|---|---|---|
| all top-level posts | 469 | 2 | 1 | 21 |
| link | 351 | 3 | 0 | 20 |
| no link | 118 | 1 | 1 | 23 |
| thread root | 64 | 2 | 1 | 25.5 |
| single | 405 | 2 | 0 | 21 |
| thread root with link in root | 25 | 4 | 1 | 17 |
| thread root without link in root | 39 | 2 | 2 | 32 |
| thread root without link in root, link in a later self-reply | 35 | 2 | 1 | 30 |

Within-account link versus no-link, accounts with at least 5 posts of each, metric reposts plus replies, median link / median no-link: astro.build (36 / 14 posts) 5.0 / 0.5; bun.sh (21 / 15) 5 / 5; docker.com (38 / 12) 0 / 0; github.com (33 / 17) 2 / 3; svelte.dev (14 / 12) 18 / 4; zed.dev (16 / 34) 2 / 2. Link lower in 1 account, higher in 2, equal in 3. Accounts rust-lang.org and python.org have only 2 no-link posts each and are excluded from the within-account test (the pooled no-link repost median of 1 is driven by this imbalance; do not read the pooled row as an effect).

Within-account thread-root versus single, at least 5 of each, reposts plus replies: bun.sh (8 / 28) 7.0 / 5.0; github.com (6 / 44) 5.0 / 3.0; python.org (6 / 44) 5.0 / 3.0; svelte.dev (5 / 21) 12 / 5; vercel.com (8 / 42) 1.5 / 1.5; zed.dev (24 / 26) 2.5 / 2.0. Thread higher in 5, equal in 1. Confounded by announcement size and by only counting the root post; grade D for causal effect.

**Reproduction note on the scout.** The scout's MB#22 pooled median likes (15 with link / 32 without) does not reproduce here: this run gives 20 / 23 on a different sample (latest 50 top-level posts per account via `posts_and_author_threads`, the scout used up to 300 via `posts_no_replies`). The scout's own conclusion (no large within-account penalty) is consistent with this run. Single-account zed.dev numbers also differ because zed.dev's thread-heavy posting is counted as roots here. Treat pooled medians as non-reproducible across sampling choices; only the within-account direction is stable.

**Decision for Bluesky.** Default link in body of post 1 with a built card (grade C: no platform statement, small measurement). Do not use a link-in-reply pattern.

### 2.3 Mastodon

- Ordering: [Mastodon API guidelines](https://docs.joinmastodon.org/api/guidelines/): "Mastodon will generally sort API responses in reverse chronological order by time of insertion into its database", with search and trends as relevance exceptions. [Network docs](https://docs.joinmastodon.org/user/network/) do not state the home ordering; the claim that the home timeline is chronological rests on this guideline and third-party pages. No ranking signal for links exists in the docs read. Grade A for API ordering, C for the home-timeline reading.
- Counting: [posting docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md): default 500 characters, links must start with `http://` or `https://` and each counts 23 characters regardless of length; only the username part of a mention counts. The doc says nothing on preview cards or self-reply threads.
- Preview card: [Mastodon CHANGELOG](https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md): 4.7.0 (2026-08-20) "Mastodon will use the first `Link` attachment, if any, as preview card" (FEP-8967) and outgoing posts with a preview card get a `Link` attachment; 4.6.0 (2026-06-17) added `missing_attribution` to preview cards. Scout rows reproduce. The server builds the card from the link; the client does not.
- Threads: Mastodon docs read give no self-reply guidance. Reply visibility: replies appear in followers' Home only for followers who follow both parties ([posting docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md)), so a self-reply thread reaches followers' Home fully (they follow the poster, who is both parties) but is invisible to others' Home except via the profile or the first post. Inference from the stated rule; not tested.
- Measurement, public API, 2026-11-27; script `masto.py`:

```
python3 -I masto.py Mastodon@mastodon.social thunderbird@mastodon.online rust_lang@fosstodon.org gitlab@mastodon.social jetbrains@mastodon.social python@fosstodon.org linuxfoundation@mastodon.social
```

Three of seven handles returned data (`rust_lang@fosstodon.org`, `jetbrains@mastodon.social`, `linuxfoundation@mastodon.social` 404; `gitlab@mastodon.social` had 0 statuses). Probes of eight other handles found only `deno_land@fosstodon.org` (749 statuses, last 2026-01-29), `golang@hachyderm.io` (87, last 2026-11-10), `godotengine@mastodon.gamedev.place` (1,104, last 2026-11-24) and `nodejs@social.lfx.dev` (32, last 2026-08-17) alive but not measured. Ten exemplar accounts therefore could not be reached on Mastodon; the ten-account requirement is met on Bluesky (11 accounts) only.

Result, n=81 top-level posts from 3 accounts ("link" means the status has a preview card): card n=33 medians reblogs 124, replies 10, favourites 190; no card n=48 medians 23.5, 1.5, 37.5; thread root n=14 medians 253.5, 18.5, 436.5; single n=67 medians 38, 2, 56. Per account: Mastodon project (43 posts, 24 card) reblogs 147.5 card vs 99 no card; Thunderbird (23 posts, 5 card) 1 vs 14; python@fosstodon.org (15 posts, 4 card, 0 reblogs in both). The two accounts with enough data disagree in direction, and 11 of the 14 thread roots come from one account (Mastodon project). Unusable for a default; recorded as grade D.

**Decision for Mastodon.** Link in body of post 1; the card is automatic. No ranking reason for a reply link. Add `<meta name="fediverse:creator">` on the linked page (scout row 18; not re-fetched here).

### 2.4 Threads

- [Meta Threads posts docs](https://developers.facebook.com/docs/threads/posts), page undated except the 2025-12-22 limit: `link_attachment` (optional URL) works only with `media_type=TEXT`; if omitted on a text-only post, the first link in the post becomes the preview card; the `text` parameter description also says the first URL in text is used as the preview for single and carousel posts, which the page does not reconcile with the text-only restriction. Maximum 5 links; as of 2025-12-22 more fails with `THREADS_API__LINK_LIMIT_EXCEEDED`; each unique URL in `text` counts once; a `link_attachment` that differs from every URL in `text` counts as an additional link. Text 500 characters; emoji counted by UTF-8 byte length. The page does not mention `reply_to_id` or reply chains; thread mechanics are therefore undocumented in the page read (grade D).
- Platform statements on link ranking, via [Social Media Today, 2025-06-08](https://www.socialmediatoday.com/news/meta-says-link-posts-ranked-properly-threads-reach/750126/) and [Engadget, 2025-07-14](https://www.engadget.com/social-media/threads-users-still-barely-click-links-170139103.html): Mosseri, "We've been working on making sure links are ranked properly. Links have been working much better for more than a month now" (June 2025), and earlier that Threads does not intentionally downrank links but "we don't place much value on [link clicks] and people don't like and comment on links much" (quote date given only as "back in November"). Engadget cites Similarweb: Threads sent 28.4 million outbound referral visits in June 2025, and Chartbeat: under 0.1% of publisher referral traffic over the past year and a half. Meta's help-centre page on links was not found in the search; no first-party Meta statement from 2026 on link ranking was found. Grade C.
- No fetched source gives a thread versus single effect for Threads (D).

**Decision for Threads.** Link in body of the text-only post; one link; do not attach media to a post that needs a card. If an image is wanted, put the link in the text anyway and verify rendering before committing to the pattern (documentation conflict above).

### 2.5 Commands run

```
git clone --depth 1 https://github.com/xai-org/x-algorithm        # in ~/.cache/research-lang/exemplars/product/mb
git log -1 --format='%H %cI'                                       # 52d45989090e63992ba04e4f6cfccd73bf8cc05c 2026-11-25T06:24:59+00:00
grep -rn "has_url" .                                                # content_features.rs:18,34 ; vm_ranker_debias_payload.rs:83
grep -n "link\|open_link\|click" home-mixer/params/param.rs         # OpenLinkWeight 0.2 (line 499), ClickWeight 0.274 (line 498)
grep -n -i "penal\|downrank\|demot" README.md                       # no matches
head -40 home-mixer/filters/dedup_conversation_filter.rs           # keeps best-scoring candidate per conversation id
curl -s "https://<instance>/api/v1/accounts/lookup?acct=<user>"     # handle liveness probe
```

## 3. Normative guidance candidates

1. **MB-LT-1 (SHOULD)** Put the release link in the body of post 1 on every platform. Rationale: platform statements (X, Threads), the absence of any ranking statement (Bluesky) and an unranked timeline (Mastodon) give no tested reason to hide it, and a link in a reply is an untested workaround. Verify: in the draft, the URL string occurs in the first post's text or card; fail if the first post has no URL and a later post does. Reading heuristic: pass "ocx 0.14 adds lock v4: pins resolve offline. Notes: https://example.org/r/0.14"; fail "ocx 0.14 is out, thread below" with the URL only in reply 1.
2. **MB-LT-2 (MUST)** Post 1 must stand on its own: it names the product, the version and one concrete change without requiring a click. Rationale: Bier's advice to give "sufficient context about what the user will see before they click it", and `DedupConversationFilter` showing one post per conversation per viewer batch. Verify: post 1 text contains the product name, a version-like token matching `\d+\.\d+` or a stated change, and is at least 40 characters before the URL.
3. **MB-LT-3 (MUST NOT)** Do not write "links are penalised" or "links are not penalised" on X as fact in any guidance, post or skill text. Rationale: platform statements and outside data conflict (section 7). Verify: grep artifact for `penali[sz]|downrank|suppress` near `link`; a hit requires a cited, dated source in the same paragraph.
4. **MB-LT-4 (CONSIDER)** For a project account with at least 20 posts per platform, test link placement on its own account and record n, window and the within-account baseline before changing the default. Rationale: all cross-account figures here are confounded. Verify: a test plan names both arms, a metric (reposts plus replies, not likes), minimum 10 posts per arm and a decision date; absent plan means the default stands.
5. **MB-LT-5 (MUST)** Count one link per post by default, and never more than 5 on Threads. Rationale: Threads API errors above 5 since 2025-12-22; preview uses the first URL. Verify: regex count of `https?://\S+` per post against 5 on Threads; the first URL in the text is the one the card should show.
6. **MB-LT-6 (MUST)** On Bluesky, publishing by API requires a built card: fetch `og:title`, `og:description`, `og:image`, upload the thumb, write `embed.external`; a URL written only as text yields no card. Rationale: [bsky-docs posts.md](https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md). Verify: fetch the created record with `com.atproto.repo.getRecord` and assert `record.embed["$type"] == "app.bsky.embed.external"` and `thumb` present.
7. **MB-LT-7 (MUST)** On Threads, do not attach images, video or a carousel to a post that relies on a link card. Rationale: `link_attachment` is text-only; the docs conflict on text-field previews for media posts. Verify: draft containing media and a `link_attachment` field is rejected; for media plus plain URL, preview after publish before reuse.
8. **MB-LT-8 (SHOULD)** Default a release to a single post. Rationale: no source shows a thread effect on any platform (D); a single post cannot lose its link or claim to dedup, split reach or a missing `root`. Verify: release draft has 1 post unless it lists at least two distinct items, each with its own sentence of content.
9. **MB-LT-9 (SHOULD)** If a thread is used, cap it at 3 posts, keep claim and link in post 1, and do not repeat the link in later posts. Rationale: the cap is a project default, not a platform fact; post 1 is the only one most viewers see (X keeps one post per conversation per batch; Mastodon Home shows replies only to mutual-follow viewers). Verify: post count at most 3; URL count in posts 2 and 3 equals 0 or the URL differs from post 1.
10. **MB-LT-10 (MUST)** Any measured claim about link or thread effect states n, window, accounts and whether comparison is within-account. Rationale: pooled medians did not reproduce between two samples of the same accounts (scout 15 / 32 likes versus 20 / 23 here). Verify: reading heuristic; a pass reads "6 accounts, 50 posts each, latest 2026-11-27, within-account medians"; a fail reads "link posts get 2x more reach".
11. **MB-LT-11 (SHOULD)** Pin dated facts. Any platform fact in the skill carries "as of" date and source URL, and the skill re-fetches facts older than 90 days. Rationale: the X repo changed on six dates between 2026-08-13 and 2026-10-26 (scout); X executives' link statements changed between April and July 2026. Verify: lint on the facts file for a date column; fail when any row is older than 90 days.
12. **MB-LT-12 (MUST)** Do not budget a retry loop around an X post containing a URL without a spend cap. Rationale: $0.20 per URL post (changelog 2026-04-16). Verify: workflow lint that any X create-post step with a URL has an idempotency key and a cap.
13. **MB-LT-13 (SHOULD)** Count Mastodon links as 23 characters, Bluesky by graphemes and Threads emoji by UTF-8 bytes in the pre-publish check. Rationale: [Mastodon posting docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md) and [Threads posts docs](https://developers.facebook.com/docs/threads/posts). Verify: unit-test vectors (URL of 80 characters on Mastodon counts 23; one emoji on Threads counts by UTF-8 bytes).
14. **MB-LT-14 (SHOULD) Skill placement (decision).** Create one small skill, `microblog-variants`, holding the per-platform dated-facts file and a validator script for MB-LT-5, -6, -7, -9, -13; `launch-plan` references it by name for the release-day step. Rationale: counting, link, alt-text, card and account-proof rules change on a platform schedule and are checkable by script, while launch-plan is sequencing judgement. Verify: skill dir contains `facts.md` with dated rows and a validator; launch-plan contains no platform limit numbers.

## 4. Dated facts

| fact | URL | source date | source type |
|---|---|---|---|
| Post: Create $0.015; Post: Create (with URL) $0.200 | https://docs.x.com/x-api/getting-started/pricing | page undated, fetched 2026-11-27 | platform |
| "Posts containing a URL are $0.20 per Post" | https://docs.x.com/changelog | 2026-04-16 | platform |
| Open ranking repo HEAD `52d4598`; `OpenLinkWeight` 0.2, `ClickWeight` 0.274; `has_url` passed to ranker debias payload; `DedupConversationFilter` keeps best per conversation | https://github.com/xai-org/x-algorithm | commit 2026-11-25 | platform |
| Repo README dates updates 2026-08-13, 08-14, 10-08, 10-13, 10-26 (and 09-18 per scout) | https://github.com/xai-org/x-algorithm/blob/main/README.md | up to 2026-10-26 | platform |
| Bier: "Just post the link in the body of the post..." | https://roboin.io/article/en/2026/04/13/x-denies-link-deboost-recommends-in-post-links/ | 2026-04-13 | secondary report of platform exec |
| Bier 2026-07-28 "you do not need to put the links in replies anymore"; Musk 2026-07-29 "We haven't for over a year." | https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/ | 2026-07-28 and 07-29 | secondary report of platform exec |
| Buffer: 18.8M posts, 71,000 accounts, link engagement 0% for regular accounts after March 2025, window unstated | https://buffer.com/resources/links-on-x/ | 2025-10-14 | vendor data |
| Nieman Lab: 200 latest tweets per account, 18 accounts, window unstated | https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/ | 2026-04-08 | independent study (small) |
| Threads: link limit 5 from 2025-12-22; first URL becomes card; `link_attachment` text-only; 500 chars; 250 posts per 24h | https://developers.facebook.com/docs/threads/posts | 2025-12-22 for limit | platform |
| Mosseri: links "working much better for more than a month now"; no intentional downrank | https://www.socialmediatoday.com/news/meta-says-link-posts-ranked-properly-threads-reach/750126/ ; https://www.engadget.com/social-media/threads-users-still-barely-click-links-170139103.html | 2025-06-08 ; 2025-07-14 | secondary report of platform exec |
| Threads outbound referrals 28.4M in June 2025 (Similarweb); under 0.1% of publisher referral traffic (Chartbeat) | https://www.engadget.com/social-media/threads-users-still-barely-click-links-170139103.html | 2025-07-14 | independent analytics reported by press |
| Mastodon: default 500 chars; each link 23; `http(s)://` required | https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md | fetched 2026-11-27, page undated | platform |
| Mastodon: API responses generally reverse chronological; search and trends relevance-sorted | https://docs.joinmastodon.org/api/guidelines/ | page undated | platform |
| Mastodon 4.7.0: first `Link` attachment used as preview card; 4.6.0 `missing_attribution`; 4.5.0 quotes | https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md | 2026-08-20; 2026-06-17; 2025-11-06 | platform |
| Bluesky: card is `app.bsky.embed.external` with client-uploaded thumb; reply record `root` and `parent`; docs state images 1,000,000 bytes while their upload code allows 2,000,000 | https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md | fetched 2026-11-27, page undated | platform |
| Bluesky default Discover feed blends trending posts and followed accounts; feeds are an open marketplace | https://bsky.social/about/blog/7-27-2023-custom-feeds | 2023-07-27 (updated 2023-08-17) | platform |
| Buffer: 1.7M posts, 56,000 users on X, Threads and Bluesky; medians Feb 2025 X 4, Threads 5, Bluesky 3; no link or thread breakdown | https://buffer.com/resources/x-threads-bluesky-data/ | 2025-03-10 | vendor data |
| X posts: "up to 280 characters"; URLs wrapped by t.co count 23 characters (the page also describes weighted counting; weight table not read) | https://docs.x.com/fundamentals/counting-characters.md | page undated, fetched 2026-11-27 | platform |
| X media metadata alt text `maxLength: 1000` (OpenAPI schema `CreateMediaMetadataMetadataAltText`; page shows only `version: '2.175'`) | https://docs.x.com/x-api/media/create-media-metadata | page undated, fetched 2026-11-27 | platform |
| Bluesky post `text`: `maxLength` 3000 (UTF-8 bytes), `maxGraphemes` 300; facet `byteSlice` indices count UTF-8 bytes, start inclusive, end exclusive | https://github.com/bluesky-social/atproto (file `lexicons/app/bsky/feed/post.json`, read in clone under `packages/pds/lexicons/`) | HEAD `dce608b` 2026-11-27 | platform |
| Mastodon alt text limit 10,000 characters since 4.6.0 ("Change alt text limit for media attachments to 10,000 characters"); `configuration.media_attachments.description_limit` added to Instance in 4.4.0, docs example still shows 1500; limit is per server, read it from the instance API | https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md ; https://docs.joinmastodon.org/entities/Instance/ | 4.6.0 2026-06-17 ; Instance page undated | platform |
| Musk 2024-11-24: "Just write a description in the main post and put the link in the reply. This just stops lazy linking." | https://www.businessinsider.jp/post-297498 | 2024-11-24 | secondary report of platform exec |
| Fowler: 19 announcement posts 2026-06-16 to 2026-09-06 across LinkedIn, X, Mastodon, Bluesky; X retweets dropped since early 2025, Bluesky "dramatically" | https://martinfowler.com/articles/2026-social-traffic.html | 2026-09 | independent, single publisher, n=19 |

Not re-fetched in this run (scout figures taken as stated, unverified here): Threads `clicks` insight; Mastodon `fediverse:creator`; X ranking weights other than the two link weights above; the X weighted-character table. Fetch before use. The Bluesky 300/3000 and facet figures, X 280 and alt 1,000, and Mastodon alt 10,000 are now fetched and in the table above. The Washington Times copy of the Musk 2024 exchange and the Business Insider original were not readable (403 / not opened).

Scout figures that reproduced: X $0.015 / $0.20 and 2026-04-16 date; Threads 5-link limit and 2025-12-22; Buffer 18.8M, 71,000 accounts, 0.28% Premium link; Mastodon 4.7.0 first `Link` and 4.6.0 `missing_attribution`; Bluesky docs image-limit conflict; Mastodon 23-character links. Did not reproduce: pooled Bluesky median likes 15 / 32 (this run 20 / 23, different sampling). Scout's statement that Buffer "advises moving links to replies" is partly accurate: Buffer recommends reply placement as "not foolproof" and reports no test.

## 5. What an agent must not decide alone

- Whether to run a link-placement test, and the tolerance for a lower-reach post on the project's own account.
- Whether to change the X link default if the project's own data disagree with the platform statements.
- Whether to pay for X Premium or for the URL-post API cost; any spend cap value.
- Which platform to publish on (audience judgement, deferred by commission).
- Whether a release warrants a thread (editorial importance) beyond the mechanical rule that two or more distinct items allow one.
- Whether a post that mentions a sponsor, partner or funded maintainer needs a disclosure label (law and brand).

## 6. AI-agent angle

| characteristic mistake | smallest mechanical check |
|---|---|
| Moves the link to a first reply on X because older advice and Buffer say so | MB-LT-1: URL must be in post 1; flag URL present only in posts 2+ |
| States "X penalises links by N%" as fact, quoting the 94% figure or Buffer 0% | MB-LT-3 grep near the claim, requires dated source |
| Writes a thread of 8 to 10 posts with "1/" numbering for a patch release | MB-LT-8 and -9: single post default, max 3 posts |
| Posts the URL as plain text on Bluesky and expects a card | MB-LT-6: `getRecord` asserts `embed.external` |
| Attaches a screenshot and a link on Threads, expects a card | MB-LT-7 reject rule |
| Counts all four platforms with `len(text)` | MB-LT-13 vectors |
| Retries a failed X publish in a loop | MB-LT-12 idempotency key and spend cap |
| Copies a pooled median from one run into guidance | MB-LT-10 demands n, window, within-account |
| Quotes OpenTweet-style reply multipliers (27x, 150x) | README says weights scale probabilities, not counts; reject ratios |

## 7. Contested / evolving

1. **Do external links reduce reach on X?** No: Bier, "Fake news" and "Just post the link in the body" (2026-04-13, [roboin.io](https://roboin.io/article/en/2026/04/13/x-denies-link-deboost-recommends-in-post-links/)); Bier and Musk on 2026-07-28 and 07-29 ([PPC Land](https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/)); the open code has no link penalty ([x-algorithm](https://github.com/xai-org/x-algorithm)). Yes or possibly: [Buffer 2025-10-14](https://buffer.com/resources/links-on-x/) (vendor, 18.8M posts, 0% median for non-Premium), [Nieman Lab 2026-04-08](https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/) (18 news accounts), and PPC Land's own "94% fewer views" outcome analysis. Musk's earlier position (2024-11-24, [Business Insider Japan](https://www.businessinsider.jp/post-297498), secondary report of a platform exec, quote as shown on the page fetched 2026-11-27): "Just write a description in the main post and put the link in the reply. This just stops lazy linking." That is the origin of the link-in-reply habit and was reversed by the 2026-07-29 statement above. Bier's own October 2025 explanation (users do not like or reply after clicking, so posts spread less) is paraphrased by roboin.io and concedes a lower-reach outcome without a penalty; both sides can be true. Trend: platform side moved from "myth" to "do not use replies" within 2026; the outside datasets predate July 2026 or lack a window, so none tests the post-July state. Open.
2. **Link in first reply.** Advice persisted (Buffer: "not foolproof", untested); Bier says it is no longer needed (2026-07-28). No measurement of reply placement was found. Do not claim it works or fails.
3. **Threads link ranking.** Mosseri: improved ranking (2025-06) versus Engadget (2025-07-14): publishers see little traffic (under 0.1% of referrals, Chartbeat). Reach versus click-through are different questions; no 2026 first-party statement found.
4. **Thread versus single post.** No source anywhere. The Bluesky measurement in 2.2 favours thread roots in 5 of 6 accounts but is confounded by selection (bigger announcements get threads). Fowler (2026-09) measured only announcement posts, 19, with no format split.
5. **Mastodon ordering wording.** Official text covers API responses, not the home timeline by name.
6. **Documentation versus schema on Bluesky image size** (1,000,000 prose versus 2,000,000 in the doc's own upload code); Threads docs on whether the first URL in `text` produces a card for media posts versus the text-only restriction.

## 8. Sources

| URL | what it is | date or era | why worth reading |
|---|---|---|---|
| https://github.com/xai-org/x-algorithm | X open ranking repository (primary) | HEAD 2026-11-25 | link weights, `has_url`, conversation dedup |
| https://github.com/xai-org/x-algorithm/blob/main/README.md | repo README (primary) | updated to 2026-10-26 | weights scale probabilities; filters |
| https://docs.x.com/x-api/getting-started/pricing | X API pricing (primary) | undated, fetched 2026-11-27 | $0.015 vs $0.20 |
| https://docs.x.com/changelog | X API changelog (primary) | 2026-04-16 entry | dates URL pricing |
| https://developers.facebook.com/docs/threads/posts | Threads API posting docs (primary) | 2025-12-22 limit | link attachment, 5 links, 500 chars |
| https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md | Bluesky posting guide (primary) | undated, fetched 2026-11-27 | card embed, reply refs |
| https://bsky.social/about/blog/7-27-2023-custom-feeds | Bluesky feeds announcement (primary) | 2023-07-27 | feed model, Discover |
| https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md | Mastodon posting docs (primary) | undated | 500 chars, 23 per link, reply visibility |
| https://docs.joinmastodon.org/api/guidelines/ | Mastodon API guidelines (primary) | undated | chronological ordering statement |
| https://docs.joinmastodon.org/user/network/ | Mastodon network docs (primary) | undated | discovery; no home ordering stated |
| https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md | Mastodon changelog (primary) | to 2026-08-20 | first-link card, `missing_attribution` |
| https://roboin.io/article/en/2026/04/13/x-denies-link-deboost-recommends-in-post-links/ | report of Bier statement | 2026-04-13 | X exec position |
| https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/ | report of Bier and Musk statements | 2026-07-29 | most recent X exec position |
| https://buffer.com/resources/links-on-x/ | vendor study | 2025-10-14 | link engagement medians |
| https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/ | independent small study | 2026-04-08 | news-account counter-evidence |
| https://www.socialmediatoday.com/news/meta-says-link-posts-ranked-properly-threads-reach/750126/ | trade report of Mosseri | 2025-06-08 | Threads link ranking |
| https://www.engadget.com/social-media/threads-users-still-barely-click-links-170139103.html | press with Similarweb and Chartbeat data | 2025-07-14 | Threads link traffic reality |
| https://buffer.com/resources/x-threads-bluesky-data/ | vendor study (no link or thread breakdown) | 2025-03-10 | negative result |
| https://martinfowler.com/articles/2026-social-traffic.html | independent practitioner measurement, 19 announcement posts | 2026-09 | developer-audience announcement data |
| https://docs.x.com/fundamentals/counting-characters.md | X character counting (primary) | undated | 280, URL 23 |
| https://docs.x.com/x-api/media/create-media-metadata | X media metadata (primary) | undated | alt text 1000 |
| https://docs.joinmastodon.org/entities/Instance/ | Mastodon Instance entity (primary) | undated | description_limit, max_characters |
| https://www.businessinsider.jp/post-297498 | report of Musk 2024 statement | 2024-11-24 | lazy linking origin |
| https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed | Bluesky public AppView endpoint (primary data) | queried 2026-11-27 | measurement source |
| `https://<instance>/api/v1/accounts/:id/statuses` (mastodon.social, mastodon.online, fosstodon.org) | Mastodon public API (primary data) | queried 2026-11-27 | measurement source |

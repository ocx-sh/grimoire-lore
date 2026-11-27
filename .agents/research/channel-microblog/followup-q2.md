---
title: Re-measurement of the 308 of 541 Bluesky missing-alt-text figure
program: product
topic: channel-microblog
worker: followup-q2
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 7
---

# Re-measurement of the Bluesky missing-alt-text figure

## Question

Can the "308 of 541 Bluesky alt-text figure" (scout data, cited in CH-MB-13 of `channel-microblog.md`) be re-measured in a dive, with its command recorded?

## Answer

Yes. It reproduces with a one-image drift: **308 of 542** images without alt text (57%) against the scout's 308 of 541. The scout script, the eleven handles and the command are unchanged (script hashes below). The drift is probably a post made after the scout ran; that was not checked (see the last section). The figure is a convenience-sample number, not a platform rate, because two accounts supply most of it.

## Sources and baseline

- Scout baseline (local file, written by the scout earlier in this program, not an external page): `.agents/research/marketing-topic-map/channel-microblog.md` in this worktree. Lines 81 to 87 state: posts measured 1,641; link-card embeds 783 (48%); "image embeds / video / quote / text only" 454 / 255 / 71 / 78; "images missing alt text | 308 of 541 (57%)"; "pooled median likes, with link / without link | 15 / 32 (confounded by account)". Line 49 gives the same pooled 15 / 32 and line 51 records the scout's own re-run of 2026-11-27 with "same totals: 1,641 posts, 783 link cards". This is the source of every baseline number below, quoted from the file, not recalled.
- Data source, platform data read directly (not vendor data): Bluesky public AppView `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`, unauthenticated GET, fetched 2026-11-27 13:12 UTC (11 handles, 3 requests each at most).
- Endpoint parameters, from the lexicon in the Bluesky reference repository `https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/feed/getAuthorFeed.json` (fetched 2026-11-27, `main` branch, file has no date field; sha256 `c03f654b61e4d05dcaaa3bafe601295f17635e9dacfb8acd36bbb0d2c845d2dd`): `limit` is an integer with `"minimum": 1, "maximum": 100, "default": 50`, so 3 pages of 100 gives at most 300 posts. `filter` has `knownValues` including `posts_no_replies`, `default: posts_with_replies`; description: "Combinations of post/repost types to include in response."
- Image alt field, `https://raw.githubusercontent.com/bluesky-social/atproto/main/packages/api/lexicons/app/bsky/embed/images.json` (fetched 2026-11-27, sha256 `06491ead4a1bec37271a517d3c8ff2baa47ab5996d25819df471a6f68dd5d912`): the image def has `"required": ["image", "alt"]` and `alt` is `{"type": "string", "description": "Alt text description of the image, for accessibility."}`. So `alt` is always present in the record but may be an empty string; the scripts count `not im.get("alt")`, which counts an empty string as missing. A string of only spaces would count as present (neither script strips); none was checked for.
- `https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed` redirects (308) to `https://endpoints.bsky.app/`, and `https://docs.bsky.app/docs/advanced-guides/posts` redirects to `https://bsky.network/docs/advanced-guides/posts`, which returned empty content when fetched. Neither is used as evidence; the lexicon files above are the primary text.

## Reproducibility record

Working directory: `~/.cache/research-lang/exemplars/product/wave2/mb-q2/` (`/home/mherwig/.cache/research-lang/exemplars/product/wave2/mb-q2`). Run window: 2026-11-27T13:12:21Z to 13:12:38Z (UTC, `date -u`), Python 3.14 with `-I`.

```
$ sha256sum bsky_measure.py alt2.py fixture_audit.py
7f04a9683e0b16cf4679dec12cf6d0025e52279539e7570ab3bd3636f79d8e2e  bsky_measure.py
3ec807943fd7a7f3aa93543b98bd9881eba5f0550ca69586ed0a40cb453d8c2a  alt2.py
5e73b52dd5700daa3d06db713ef03f4522f4d2cf4086c7cdba115fae3e1f28f9  fixture_audit.py
```

`bsky_measure.py` is the scout's script, copied byte for byte (the scout's own run is recorded at marketing-topic-map/channel-microblog.md line 51). What it does, from its source: 3 pages of `limit=100&filter=posts_no_replies`, skips any item with a `reason` (reposts), classifies each post by `embed.$type` (`external` = link, `images` = img, `video` = vid, `record` without `media` = quote, `recordWithMedia` = quote), and counts alt only for kind `img` via `not im.get("alt")`. Because `recordWithMedia` is classed as quote, images inside it are never counted by this script. `alt2.py` recurses through `media` and so counts them. The "same pagination" claim rests on both scripts using the identical `get()` loop, visible in those hashed files.

## Measurement 1: the scout's script, re-run

Command (run through bash so the handle list splits; an unquoted zsh variable passes it as one argument and fails with `URL can't contain control characters`, which happened on my first attempt and is not part of the result):

```
cd ~/.cache/research-lang/exemplars/product/wave2/mb-q2/
H="vite.dev svelte.dev astro.build zed.dev nodejs.org github.com vercel.com bun.sh rust-lang.org python.org docker.com"
python3 -I bsky_measure.py $H > run1.txt 2>&1
```

Complete output (`run1.txt`, sha256 `c3e6f957f4d46cf8e4b38cd5d97ed4bdcdae5ab818f44887c43c9f244b5b33e0`):

```
  WITHIN vite.dev url n 11 med 69 | nourl n 6 med 40.0
vite.dev: n=17 span=2026-03-03..2026-11-26 link=9 img=2 vid=0 quote=3 text=3 hasurl=11 imgs_noalt=0/2 medlen=257
  WITHIN svelte.dev url n 14 med 75.0 | nourl n 12 med 29.0
svelte.dev: n=26 span=2023-04-27..2026-11-25 link=11 img=2 vid=0 quote=10 text=3 hasurl=14 imgs_noalt=0/3 medlen=131.0
  WITHIN astro.build url n 123 med 26 | nourl n 59 med 29
astro.build: n=182 span=2025-03-10..2026-11-13 link=86 img=50 vid=13 quote=32 text=1 hasurl=123 imgs_noalt=3/51 medlen=133.5
  WITHIN zed.dev url n 128 med 39.0 | nourl n 172 med 50.5
zed.dev: n=300 span=2025-06-17..2026-11-26 link=98 img=107 vid=62 quote=10 text=23 hasurl=128 imgs_noalt=115/115 medlen=186.0
  WITHIN nodejs.org url n 67 med 35 | nourl n 8 med 36.0
nodejs.org: n=75 span=2024-11-10..2026-11-26 link=51 img=13 vid=0 quote=3 text=8 hasurl=67 imgs_noalt=12/13 medlen=214
  WITHIN github.com url n 198 med 17.0 | nourl n 80 med 23.0
github.com: n=278 span=2025-08-22..2026-11-25 link=103 img=69 vid=88 quote=0 text=18 hasurl=198 imgs_noalt=20/113 medlen=221.0
  WITHIN vercel.com url n 134 med 15.0 | nourl n 17 med 14
vercel.com: n=151 span=2023-04-28..2026-08-25 link=122 img=8 vid=16 quote=0 text=5 hasurl=134 imgs_noalt=5/8 medlen=212
  WITHIN bun.sh url n 21 med 49 | nourl n 15 med 58
bun.sh: n=36 span=2024-11-02..2025-08-29 link=21 img=13 vid=1 quote=1 text=0 hasurl=21 imgs_noalt=5/13 medlen=257.5
rust-lang.org: n=47 span=2025-04-05..2026-11-16 link=42 img=1 vid=0 quote=1 text=3 hasurl=45 imgs_noalt=0/1 medlen=265
  WITHIN python.org url n 202 med 9.0 | nourl n 31 med 10
python.org: n=233 span=2025-10-30..2026-11-27 link=146 img=59 vid=3 quote=11 text=14 hasurl=202 imgs_noalt=8/60 medlen=268
  WITHIN docker.com url n 271 med 1 | nourl n 26 med 1.0
docker.com: n=297 span=2026-04-07..2026-11-26 link=94 img=131 vid=72 quote=0 text=0 hasurl=271 imgs_noalt=140/163 medlen=284
ALL n= 1642
link 783 median likes 17 median reposts 2 median replies 0
img 455 median likes 17 median reposts 1 median replies 1
vid 255 median likes 20 median reposts 1 median replies 1
text 78 median likes 23.5 median reposts 2.0 median replies 1.0
quote 71 median likes 16 median reposts 1 median replies 0
hasurl 1214 median likes 15.0 | nourl 428 median likes 32.0
noalt images total 308 of 542
```

The earlier claims are now visible in this output: svelte.dev `span=2023-04-27..2026-11-25`, docker.com `span=2026-04-07..2026-11-26`, python.org `span=2025-10-30..2026-11-27` (the latest post date of any account). The earliest start of any account is svelte.dev 2023-04-27 and vercel.com 2023-04-28.

Comparison with the scout baseline (marketing-topic-map/channel-microblog.md lines 81 to 87):

| Quantity | Scout | This run | Same? |
|---|---|---|---|
| posts | 1,641 | 1,642 | +1 |
| link cards | 783 | 783 | yes |
| images / video / quote / text | 454 / 255 / 71 / 78 | 455 / 255 / 71 / 78 | +1 image post |
| images without alt | 308 of 541 | 308 of 542 | +1 image, with alt |
| pooled median likes, link / no link | 15 / 32 | 15.0 / 32.0 | yes |

The one extra post is an image post whose images all have alt text (the no-alt count is unchanged at 308). Which handle it came from cannot be told from the scout's records; the scout's per-handle lines were not kept.

## Measurement 2: a wider count that includes quote-with-media images

`alt2.py` recurses into `recordWithMedia.media`, so images attached to a quote post are counted, and it counts posts with at least one image lacking alt text.

```
cd ~/.cache/research-lang/exemplars/product/wave2/mb-q2/
python3 -I alt2.py $H > run2.txt 2>&1     # same $H as above; run window 13:12:21Z-13:12:38Z
```

Complete output (`run2.txt`, sha256 `03dc0ac99780716bb0515ffd3ed543b453967b41cf083f7a4cfb22981b0604ce`):

```
vite.dev images 2 noalt 0 posts_with_img 2 posts_with_any_noalt 0
svelte.dev images 3 noalt 0 posts_with_img 2 posts_with_any_noalt 0
astro.build images 51 noalt 3 posts_with_img 50 posts_with_any_noalt 3
zed.dev images 119 noalt 119 posts_with_img 111 posts_with_any_noalt 111
nodejs.org images 13 noalt 12 posts_with_img 13 posts_with_any_noalt 12
github.com images 113 noalt 20 posts_with_img 69 posts_with_any_noalt 10
vercel.com images 8 noalt 5 posts_with_img 8 posts_with_any_noalt 5
bun.sh images 13 noalt 5 posts_with_img 13 posts_with_any_noalt 5
rust-lang.org images 1 noalt 0 posts_with_img 1 posts_with_any_noalt 0
python.org images 60 noalt 8 posts_with_img 59 posts_with_any_noalt 7
docker.com images 163 noalt 140 posts_with_img 131 posts_with_any_noalt 119
TOTAL images 546 noalt 312 posts 459 posts_any_noalt 272
```

Counting quote-with-media images adds 4 images (546 against 542), all without alt text, all on zed.dev (119 against 115): 312 of 546 (57%). Per post, 272 of 459 image posts (59%) carry at least one image with no alt text. These 4 images are why the weekly audit must recurse (CH-MB-20 below).

## What the figure means

| Slice | Images | Without alt | Share |
|---|---|---|---|
| All 11 accounts (Measurement 1) | 542 | 308 | 57% |
| zed.dev + docker.com only | 278 | 255 | 92% |
| The other 9 accounts | 264 | 53 | 20% |

zed.dev (115 of 115) and docker.com (140 of 163) supply 255 of the 308 (83%). Treat the figure as "in this sample, two of eleven accounts almost never write alt text", not as "57% of brand images on Bluesky". Per account (Measurement 1): astro.build 6% (3/51), github.com 18% (20/113), python.org 13% (8/60), bun.sh 38% (5/13), vercel.com 63% (5/8), nodejs.org 92% (12/13); vite.dev 0/2, svelte.dev 0/3 and rust-lang.org 0/1 are too small to read. Accounts with fewer than 20 images are noise.

## Verification of the audit logic (fixture run)

The CH-MB-20 clarification needs a check that fails when an empty `alt` hides inside `recordWithMedia.media`. `fixture_audit.py` (hash above) applies the `alt2.py` recursion plus `.strip()` to three synthetic feed items.

```
$ python3 -I fixture_audit.py        # run 2026-11-27T13:13:00Z
ok empty= 0 exit 0
empty_alt_top_level empty= 1 exit 1
empty_alt_in_recordWithMedia empty= 1 exit 1
```

(The script prints the exit code it would return and itself always exits 0; a real audit would `sys.exit(1 if n else 0)`.) For contrast, by reading `bsky_measure.py`, a `recordWithMedia` embed is classed `quote`, so its images never reach the `kind=="img"` alt loop: that script would report 0 for the third fixture. This is the measured gap (4 images in the live sample).

## Effect on the ruleset

The current CH-MB-13 row (`channel-microblog.md` line 69) carries this verification, quoted: "Script, pre-publish: assert `0 < len(alt.strip()) <= 1000`; fail on `^(IMG_\|screenshot\|image)\b` (case-insensitive) or `\.(png\|jpe?g\|gif)$`; assert the alt string is identical in every variant of one post. A weekly audit (Bluesky `getAuthorFeed` image `alt`, Mastodon `media_attachments[].description`) reports zero empty values. Fail: `IMG_2031.png`, `Screenshot of terminal`." That check is unchanged by this work; only the audit sentence gains a recursion requirement (see CH-MB-20).

- **CH-MB-13: change the rationale text only; MUST stays; verification as quoted above, plus one clause.** Replace "Scout data, not re-measured in either dive: 308 of 541 Bluesky brand-account images had no alt text (marketing-topic-map/channel-microblog.md:85)." with: "Re-measured 2026-11-27 (Bluesky public AppView `getAuthorFeed`, 11 verified-domain developer-tool accounts, convenience sample): 308 of 542 images had no alt text (57%); zed.dev and docker.com supply 255 of the 308, the other 9 accounts 53 of 264 (20%) (followup-q2.md)." Verification: append to the audit sentence "counting images inside `recordWithMedia.media` as well". The check: run the audit script on the fixture feed in `fixture_audit.py`; the third fixture must make it exit 1.
- **Agent failure modes, D12: change.** Replace "The scout counted 308 of 541 Bluesky brand images with no alt text (scout data, not re-measured)." with "Re-measured at 308 of 542 Bluesky brand-account images with no alt text, 255 of them from two of eleven accounts (followup-q2.md)." Verification: the entry still ends "Caught by CH-MB-13", so it is verified by CH-MB-13's script. Mechanical check of the text change: `grep -c "scout data, not re-measured" channel-microblog.md` returns 0 after the edit, and `grep -c "308 of 542" channel-microblog.md` returns at least 2 (CH-MB-13 and D12).
- **CH-MB-20 (weekly audit): change, clarification of the audit branch.** In the sentence "On `schedule:` (weekly), audit alt text, ..." insert after "audit alt text": "(count images inside `recordWithMedia.media` as well as top-level `images` embeds, and count an `alt` that is empty after `.strip()` as missing)". Severity stays SHOULD. Verification (replaces nothing; extends the existing "An audit fixture with one empty `alt` exits non-zero"): add two fixtures, one with an empty `alt` in a top-level `images` embed and one with an empty `alt` inside `recordWithMedia.media`; the audit must exit non-zero on each. The recursion logic passes both in the fixture run above (`empty= 1 exit 1` twice) and the `bsky_measure.py` logic would pass only the first.
- No new rule. The measurement shows the failure exists in practice but does not change what an agent must do before a post.

## Dated facts

- Bluesky public AppView `getAuthorFeed`, unauthenticated, read 2026-11-27 13:12 UTC for 11 handles: vite.dev, svelte.dev, astro.build, zed.dev, nodejs.org, github.com, vercel.com, bun.sh, rust-lang.org, python.org, docker.com. Per-account post-time spans are in the Measurement 1 output (earliest 2023-04-27 svelte.dev, latest 2026-11-27 python.org).
- The count is a snapshot of the latest up to 300 top-level posts per account (3 pages of 100, `filter=posts_no_replies`, reposts dropped). Only zed.dev reached 300; the others returned fewer. It will move as accounts post.
- Lexicon facts (atproto `main`, fetched 2026-11-27): `limit` maximum 100; `alt` required in the image def, so a missing alt shows as an empty string.

## What could not be determined

- Whether the figure holds outside this sample. The eleven handles are a convenience sample of verified-domain developer-tool accounts; no platform-wide rate follows. A platform rate needs a random sample of accounts, which the public API does not offer without a crawl.
- Whether a missing `alt` is a deliberate choice or an oversight. The API shows only the field. zed.dev's 119 of 119 suggests a posting tool that cannot set alt text, but no source says so.
- Why the scout read 541 and this run 542, and which handle holds the extra image post. The scout's per-handle rows were not kept, and this run's per-account output was not diffed against any scout per-account output because none exists. Missing: the scout's raw run output.
- The `docs.bsky.app` reference pages could not be read (redirect, then empty page), so the lexicon JSON files are the only primary text for endpoint behaviour.

---
title: Microblog variant validator - counting, link, alt-text, card and account-proof rules per platform
program: product
sub_program: channels
topic: channel-microblog
worker: mb-variant-validator
date_researched: 2026-11-27
model: sonnet
sources_fetched: 27
scope: |
  Covers the exact counting rule, link rule, alt-text limit, link-card mechanics, fediverse:creator, oEmbed and account proof for X, Bluesky, Mastodon and Threads, plus where a release post puts its link. Re-fetches every scout limit and measures counting with the official libraries.
  Does not cover og:image and site metadata design or account voice (marketing sub-program), and does not cover LinkedIn, YouTube or other channels.
---

# Microblog variant validator

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Four counting rules, four answers: X counts weighted characters (CJK and emoji = 2, URL = 23), Bluesky counts graphemes with URLs counted at full text length, Mastodon counts grapheme clusters with URLs fixed at 23 and `@user@host` counted as `@user`, Threads counts 500 characters with emoji counted as UTF-8 bytes.
- A naive `len()` (UTF-16 in JS) disagreed with the Bluesky grapheme count on 14 of 33 test strings, with the X weighted count on 18, with the Mastodon count on 19. Never validate with `len()`.
- Use `twitter-text` `parseTweet().weightedLength` for X and `RichText.graphemeLength` from `@atproto/api` for Bluesky. For Mastodon, grapheme clusters plus 23 per URL. For Threads, a conservative model (emoji = UTF-8 bytes) because no official counter exists.
- `twitter-text` 3.1.0 was last published 2022-06-28, yet X's counting page still names it as the reference. Pin it and test against the config (v3, 280, URL 23, default weight 2).
- Bluesky facet offsets are UTF-8 byte offsets. In a test, a post with a ZWJ emoji before a URL put the URL at byte 26 but JS index 12. Hand-built facets with `indexOf` are wrong.
- Bluesky link cards are built by the client. The lexicon `embed.external` needs `uri`, `title`, `description`, and an optional `thumb` blob of at most 1,000,000 bytes. A script that only writes the URL as text gets a bare link.
- Bluesky image limit differs inside one file: docs prose says 1,000,000 bytes, the docs sample code and lexicon say 2,000,000. The lexicon is authoritative. The card thumb stays at 1,000,000.
- Alt text limits: X 1,000 characters, Threads 1,000 characters (a scout claim that Threads has no alt field FAILED to reproduce), Mastodon 10,000 since 4.6.0 (instance default exposed as `description_limit`, docs sample shows 1,500), Bluesky no lexicon limit (app constant 2,000).
- Mastodon `fediverse:creator` needs two halves: the meta tag on the page and the page's domain in the account's "Websites allowed to credit you" (`attribution_domains`). Since 4.6.0 a preview card carries `missing_attribution`.
- Account proof: Bluesky domain handle (resolve the handle to a DID; separate from the blue check), Mastodon `rel="me"` on a page that is served as HTML without JavaScript, under 1 MB, outside iframes, over HTTPS.
- Fleet measurement: grimoire.rs and index.grimoire.rs have 0 `fediverse:creator`, 0 `rel=me`, and 0 links to any microblog. No `bsky`/`mastodon` string exists in the ocx website source. Neither `ocx.sh` nor `grimoire.rs` resolves as a Bluesky handle. ocx.sh was unreachable from this machine (curl code 000).
- Release post link: put it in the post itself on all four platforms, not in a reply. X's product head said on 2026-07-28 that replies are no longer needed; independent analysis (2026-04-08) disagrees on reach, so this is contested (see below).
- The link on Bluesky should be a card embed plus, optionally, short link text. On Threads put one URL in `text` and the same URL as `link_attachment` (counted once). On X and Mastodon the URL in text is the card trigger.
- Never post identical text through several accounts on X (policy). Bridges truncate: Bridgy Fed cuts Atmosphere posts at 300 characters and limits video to 60 s / 100 MB.
- Run three checks in three places: a pre-publish script (counting, alt, card, link count), a site build check (`fediverse:creator`, `rel=me`), and a scheduled public-API audit (handle resolution, `verified_at`).

## Findings

### 1. Counting rule per platform (re-fetched and measured)

**X.** The counting page ([docs.x.com/fundamentals/counting-characters](https://docs.x.com/fundamentals/counting-characters), no date on page, fetched 2026-11-27, platform) states: 280 weighted characters; Latin letters, punctuation and common symbols weigh 1; emoji, CJK and other Unicode weigh 2 by default; "All emojis count as 2 characters, regardless of complexity"; ZWJ adds nothing; any valid URL counts 23 because of `t.co` wrapping; text is normalized to NFC; manually typed mentions count; media counts 0. It recommends the open-source `twitter-text` library. The configuration, [config/v3.json](https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json) (no date, platform), reads `maxWeightedTweetLength 280, scale 100, defaultWeight 200, transformedURLLength 23, emojiParsingEnabled true` and four weight-100 ranges (0-4351, 8192-8205, 8208-8223, 8242-8247). The npm package `twitter-text@3.1.0` has `time.modified = 2022-06-28` (`npm view twitter-text time.modified version`, 2026-11-27). Scout claim reproduces. Staleness is a finding: the reference implementation has not moved in four years.

**Bluesky.** The record lexicon [app.bsky.feed.post](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/feed/post.json) (clone of `bluesky-social/atproto` at commit dce608b, 2026-11-27T12:44:13+01:00, platform) sets `text.maxLength 3000` and `maxGraphemes 300`, `langs maxLength 3`, `tags maxLength 8`, each tag `maxGraphemes 64`. Both constraints apply: a post passes only if it is under 300 graphemes and under 3,000 bytes (a 300-emoji ZWJ post can fail the byte rule). Scout claim reproduces. The `embed` union now also lists `app.bsky.embed.gallery`, newer than the scout recorded.

**Mastodon.** [Posting docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md) (docs master, fetched 2026-11-27, platform): default 500 characters; links must start with `http://` or `https://` and "are counted as 23 characters regardless of length"; shorteners are "actively discouraged". The authoritative implementation, [status_length_validator.rb](https://raw.githubusercontent.com/mastodon/mastodon/main/app/validators/status_length_validator.rb) (main, fetched 2026-11-27, platform), shows: `MAX_CHARS = 500`, `URL_PLACEHOLDER_CHARS = 23`, length measured by `each_grapheme_cluster.size`, content-warning text is added to the body before counting, URLs are found by the twitter-text `Extractor` with `extract_url_without_protocol: false`, and a mention `@user@host` counts as `@user`. Instances can set another max: read `configuration.statuses.max_characters` and `characters_reserved_per_url` from [`/api/v2/instance`](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/entities/Instance.md) (docs sample 500 / 4 attachments / 23; version history 4.0.0). Scout claim reproduces, with two details the scout missed: CW text counts, and bare domains (`ocx.sh/docs`) are not URLs on Mastodon.

**Threads.** [Threads posts docs](https://developers.facebook.com/documentation/threads/posts) (no page date; only the link-limit change dated 2025-12-22, platform): "Text posts are limited to 500 characters"; "The number of links is restricted to 5 or fewer", failing since 2025-12-22 with `THREADS_API__LINK_LIMIT_EXCEEDED`; `link_attachment` only for `media_type=TEXT`. [Publishing reference](https://developers.facebook.com/documentation/threads/reference/publishing) (platform): "For the post character limit, emojis are counted as the number of UTF-8 bytes." That page does not itself repeat 500 or 5, so the two limits come from the posts page. Daily cap 250 published posts per rolling 24 hours (posts page). Scout claims reproduce. [Text attachments](https://developers.facebook.com/documentation/threads/create-posts/text-attachments.md) (platform) allow 10,000 characters of extra text; each unique URL in `text` counts as one link, `link_attachment_url` counts only if it differs from every URL in `text`, and a link attachment cannot also sit in the text attachment.

### 2. Measurement: 33 strings, five counters

Commands (scratch dir outside the repo; `npm i twitter-text @atproto/api` gave `twitter-text 3.1.0`, `@atproto/api 0.32.7`, Node 26.13.1):

```
node count.js     # prints console.table of: naive16 (s.length), cp ([...s].length), b8 (Buffer.byteLength),
                  # graph (Intl.Segmenter), x (twitter-text parseTweet(s).weightedLength),
                  # bsky (new RichText({text}).graphemeLength),
                  # mast (EMULATION: twitter-text extractUrlsWithIndices w/o protocol -> 23 x, @u@h -> @u, grapheme clusters),
                  # thr  (MODEL: grapheme counts 1; emoji/regional-indicator graphemes count UTF-8 bytes)
node facets.js    # RichText.detectFacets vs JS indexOf vs UTF-8 offset
```

Selected rows (full run had 33 strings: emoji, skin tone, ZWJ, flags, keycap, combining marks, Hangul jamo, Devanagari, Thai, Arabic, CJK, URLs of several shapes, mentions, hashtags, boundary strings of 280 and 300):

| string | naive UTF-16 | codepoints | UTF-8 bytes | X weighted | Bluesky graphemes | Mastodon (emulated) | Threads (model) |
|---|---|---|---|---|---|---|---|
| `Hello, world!` | 13 | 13 | 13 | 13 | 13 | 13 | 13 |
| `Team 👨‍👩‍👧‍👦 ships` (ZWJ family) | 22 | 18 | 36 | 13 | 12 | 12 | 36 |
| `🇩🇪🇺🇸` | 8 | 4 | 16 | 4 | 2 | 2 | 16 |
| `a` + 3 combining marks stacked | 5 | 5 | 9 | 4 | 1 | 1 | 5 |
| `日本語のテスト` | 7 | 7 | 21 | 14 | 7 | 7 | 7 |
| `Docs https://ocx.sh/` | 20 | 20 | 20 | 28 | 20 | 28 | 20 |
| 119-char URL line | 119 | 119 | 119 | 28 | 119 | 28 | 119 |
| `See ocx.sh/docs now` (no scheme) | 19 | 19 | 19 | 31 | 19 | 19 | 19 |
| `cc @user@mastodon.social please` | 31 | 31 | 31 | 31 | 31 | 15 | 31 |
| `🚀` x 300 | 600 | 300 | 1200 | 600 | 300 | 300 | 1200 |

Disagreement counts over the 33 strings: naive UTF-16 vs Bluesky 14; vs X 18; vs Mastodon 19; Bluesky vs X 22; Bluesky vs Mastodon 5; X vs Mastodon 20; Bluesky vs Threads model 13. Consequences: (a) one text cannot be length-checked once; (b) a URL-heavy release line is cheap on X and Mastodon (23) and expensive on Bluesky (full text, unless the text carries a shortened display form with the full URL only in the facet, which the facet description allows) ; (c) a 300-emoji post is legal on Bluesky and Mastodon, 600 on X (over), 1,200 on the Threads model (over).

Caveats on the measurement: the Mastodon column is an emulation in Node, not Ruby; Ruby and ICU grapheme tables can differ on newly added sequences (not tested). The Threads column is a model of the documented sentence; no official counter exists and no API call was made. The `https://a.example/1` TLD was not recognised as a URL by twitter-text (known-TLD list), so URL test vectors must use real TLDs (`a.com`). Scheme-less `ocx.sh/docs` is a link on X (23) and on Bluesky (facet `https://ocx.sh/docs`, bytes 4-15) but plain text on Mastodon, so identical text links on two platforms and not the third.

### 3. Bluesky facet offsets

The facet lexicon [app.bsky.richtext.facet](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/richtext/facet.json) (same commit) says indices are "counting bytes of the UTF-8 encoded text" and warns JavaScript users to convert. Measured with `facets.js`: for `Docs 🚀 https://ocx.sh/docs` the URL starts at JS index 8, facet `byteStart` is 10; for a ZWJ-family prefix, JS index 12 vs `byteStart` 26. Use `RichText.detectFacets`, never string indices. The link facet description: "The text URL may have been simplified or truncated, but the facet reference should be a complete URL."

### 4. Link cards on Bluesky

[app.bsky.embed.external](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/external.json) (same commit): `external` requires `uri`, `title`, `description`; `thumb` is a blob, `image/*`, `maxSize 1000000`. The posting guide ([bsky-docs posts.md](https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md), fetched 2026-11-27, platform) shows the client fetching the page, reading `og:title`, `og:description`, `og:image`, uploading the image through `com.atproto.repo.uploadBlob`, and placing the blob in the record. No server-side unfurl is documented, so an API poster that omits the embed produces a bare link. The new lexicon fields (`view` with `data`, article, publication, livestream variants, `associatedRefs`) are view-side and not needed for posting.

Measured: `grimoire.rs/og-card.png` is 105,570 bytes (`curl -sL https://grimoire.rs/og-card.png -w '%{size_download}'`, type `image/png`), so it fits the 1,000,000-byte thumb limit. The page has `og:title`, `og:description`, `og:image` (one each).

### 5. Documentation versus schema conflicts (scout MB#34)

- Bluesky images: the docs prose says "Individual images are limited to 1,000,000 bytes", the sample code in the same file checks `> 2000000`, the lexicon `app.bsky.embed.images` says `maxSize 2000000` with "May be up to 2 MB, formerly limited to 1 MB". Authoritative: the lexicon. The scout said the docs-era number was 1,000,000; this reproduces for prose only and the same file contradicts itself.
- Bluesky video: lexicon `app.bsky.embed.video` says "up to 300mb, formerly limited to 100mb", captions max 20 VTT files of at most 20,000 bytes. [Bridgy Fed docs](https://fed.brid.gy/docs) (platform, no date) still say Bluesky limits video to "60 seconds, 100MB" and note an "undocumented limit of 10MB for images" on the CDN. The bridge claims are older than the lexicon.
- Bluesky app alt text: the lexicon has no `maxLength` on `alt`; [social-app constants.ts](https://raw.githubusercontent.com/bluesky-social/social-app/main/src/lib/constants.ts) has `MAX_ALT_TEXT = 2000` and `MAX_GRAPHEME_LENGTH = 300` (undated, platform). The 2,000 is an app limit, not a protocol limit.
- Threads: the posts page lists "Alt text: no limits given" while the changelog dates alt text support to 2024-08-21 and the publishing reference gives 1,000 characters. The scout's "Threads docs state no alt text field" FAILED to reproduce.
- Mastodon: Instance docs sample shows `description_limit: 1500` (attribute added 4.4.0); the [CHANGELOG](https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md) says 4.5.8 (2026-03-24) raised the limit for remote attachments from 1,500 to 10,000 and 4.6.0 (2026-06-17) "Change alt text limit for media attachments to 10,000 characters". Latest release in the file is 4.7.6 (2026-11-19); 5.0.0 is unreleased. Read `description_limit` per instance.

### 6. Alt text

X: `POST /2/media/metadata`, field `metadata.alt_text.text`, `maxLength 1000` ([docs.x.com media metadata](https://docs.x.com/x-api/media/metadata-create), API version 2.175, no date, platform). Threads: `alt_text` on the media container, max 1,000 characters, "image or video", "not available for text-only posts" ([publishing reference](https://developers.facebook.com/documentation/threads/reference/publishing); [accessibility page](https://developers.facebook.com/documentation/threads/posts/accessibility.md), which states no maximum). Mastodon: media description edited in the attachment modal, "Although optional, it is a good idea" ([posting docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md)). Bluesky: `alt` is a required string in `app.bsky.embed.images#image` (may be empty) and optional in video.

Terminal screenshots: W3C's [images decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/) (W3C WAI, platform-independent authority) says text in an image carries that text in the alternative text and complex images need the information elsewhere. For a terminal screenshot, the alt text is the command and its decisive output lines, verbatim, within the platform limit (X/Threads 1,000). Anything longer goes in the linked page, and the post says so. Fidelity (does the alt equal the pixels) cannot be checked by script; presence, length and a non-filename check can.

### 7. fediverse:creator and rel=me

[Mastodon profile docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/profile.md) (platform): profile metadata has 4 rows; a verified link must be HTTPS, host must not change under IDN normalization (since 4.0), the page must contain an `a` or `link` with `rel="me"` whose `href` equals the profile URL (or the first link redirects to the profile), response under 1 MB, link in the HTML response without JavaScript and not inside an `iframe`. Verification runs when the profile is saved. Author attribution: `<meta name="fediverse:creator" content="@username@social.example.com">` in the page head, plus the publication domain in "Websites allowed to credit you". The [PreviewCard entity](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/entities/PreviewCard.md) documents `missing_attribution` (true when the article claims the user without the domain in `attribution_domains`); the CHANGELOG dates it to 4.6.0 (2026-06-17). Verified state is readable from the API: the [Account entity](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/entities/Account.md) `fields[].verified_at` (null when unverified).

Fleet check (commands recorded):

```
curl -sL -m 25 https://grimoire.rs/ | grep -ciE 'name=.fediverse:creator'        # 0
curl -sL -m 25 https://grimoire.rs/ | grep -oiE '<(a|link)[^>]*rel=.[^>]*\bme\b[^>]*>' | wc -l   # 0
curl -sL -m 25 https://index.grimoire.rs/ | (same two greps)                      # 0 and 0
grep -oiE 'href="https?://[^"]*(mastodon|bsky|threads|x\.com|fosstodon)[^"]*"'    # no social links on either page
grep -rniE "fediverse:creator|rel=.me|mastodon|bsky|bluesky" -l /home/mherwig/dev/ocx-sh/ocx/website --exclude-dir=node_modules   # no file
curl -s -m 15 https://ocx.sh/   # exit 000 from this machine (IPv4 and IPv6 both failed); ocx.sh page not measured, source grep used instead
curl -s "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=ocx.sh"      # {"error":"InvalidRequest","message":"Unable to resolve handle"}
curl -s "...resolveHandle?handle=grimoire.rs"   # same error; control: handle=bsky.app returns a DID
curl -s -o /dev/null -w '%{http_code}' https://grimoire.rs/.well-known/atproto-did   # 404
```

Result: the fleet has no microblog presence declared on any measured surface, which matches the commission note that no social channel exists yet. Any new account must add the proof on both sides at once.

### 8. Account proof

Bluesky: a domain as handle links the account to the site; the [verification post](https://bsky.social/about/blog/04-21-2025-verification) (2025-04-21, platform) says "over 270,000 accounts have linked their Bluesky username to their website" and states this is separate from the blue check, which Bluesky or "trusted verifiers" grant. Check: `com.atproto.identity.resolveHandle?handle=<domain>` must return the account's DID. Handle setup is DNS TXT `_atproto.<domain>` or HTTPS `/.well-known/atproto-did` (standard handle method; setup instructions not fetched here, so treat the mechanism as to confirm before writing a rule on it). Mastodon: section 7. X: paid verification, no domain proof; not checkable by script. The scout's profile-links claim reproduces: [Profile Links](https://bsky.social/about/blog/10-22-2026-introducing-profile-links) (2026-10-22) shows links under the bio with custom title and order, and the page states no maximum.

### 9. oEmbed survival

Bluesky: [oEmbed docs](https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/oembed.md) (platform): endpoint `https://embed.bsky.app/oembed`, `url` required (bsky.app URL or AT-URI), `maxwidth` 220-600 (default 600), `height` always null, snippets carry a `<blockquote>` plus a `<script>`; the script replaces the blockquote with an iframe. Measured: `curl -sL "https://embed.bsky.app/oembed?url=https://bsky.app/profile/bsky.app/post/3l6oveex3ii2l"` returned type `rich`, `cache_age 86400`, HTML containing both `blockquote` and `script`; the AT-URI form returned HTTP 200. Adult, deleted and "no unauthenticated viewers" content is redacted in embeds. So an embedded post degrades to the blockquote text when scripts are blocked. Threads: [changelog](https://developers.facebook.com/docs/threads/changelog) (platform): 2026-03-03 "You can now call Threads oEmbed API without an access token". Not measured live (no Threads oEmbed call made).

### 10. Where does a release post put its link

Platform mechanics:

| platform | link in the post | what the link costs | card/preview |
|---|---|---|---|
| X | URL in text | 23 weighted | X builds it from the page; no client work |
| Bluesky | card embed (client builds), URL in text optional | text URL costs its full grapheme length; card costs 0 text | `embed.external` with thumb at most 1,000,000 bytes |
| Mastodon | URL in text (`http(s)://` required) | 23 | server builds a preview card; page needs `fediverse:creator` for attribution |
| Threads | URL in `text` and/or `link_attachment`, same URL counts once; max 5 unique | UTF-8 emoji bytes apply to the rest | `link_attachment` only with `media_type=TEXT` |

Evidence on reach, as of 2026-11-27: X's product chief wrote on 2026-07-28 "you do not need to put the links in replies anymore" and Musk answered on 2026-07-29 "We haven't for over a year" ([ppc.land report](https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/), secondary report of platform statements). An independent descriptive analysis of 18 accounts, up to 200 tweets each, dated 2026-04-08 found links "hurt engagement", with no statistical test and inconsistent figures ([Nieman Lab](https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/), independent, confounded by account type). Threads: Meta says link posts are not penalised; the only direct comparison found is a single 24-hour anecdote that favoured a link in a second post (secondary, not controlled). No rigorous cross-platform study of link placement for developer-tool release posts was found.

Decision: the link goes in the post that announces the release, on all four platforms. Reasons: replies add a second publish step that bridges (Bridgy Fed) and schedulers may drop; the X statement removes the stated reason for reply links; the claim that a reply link wins is anecdote. Bluesky gets a card, not a bare URL. The release post gets exactly one URL (the release notes page), which also keeps Threads at 1 of 5 links.

## Normative guidance candidates

Severity key: MUST / SHOULD / CONSIDER. Each rule lists VERIFY.

1. **MUST**: Validate each platform variant with its own counter, never `len()`. Rationale: 14 to 19 of 33 test strings disagree with naive length. VERIFY: `grep -nE "\.length|len\(" <validator>` finds no length check on post text; the script imports `twitter-text` and `@atproto/api` (`RichText`).
2. **MUST**: X variant passes `twitter-text` `parseTweet(text).weightedLength <= 280` and `.valid === true`. Rationale: platform counting page, config v3. VERIFY: run `node -e "console.log(require('twitter-text').parseTweet(process.argv[1]))" "<text>"`; pass example `Hello, world! 👋` = 16, fail example 141 CJK characters = 282.
3. **MUST**: Bluesky variant passes `new RichText({text}).graphemeLength <= 300` and `Buffer.byteLength(text) <= 3000`. Rationale: lexicon `maxGraphemes 300` plus `maxLength 3000`. VERIFY: the two assertions; fail example `🚀` x 300 with ZWJ forms exceeding 3,000 bytes.
4. **MUST**: Mastodon variant counts grapheme clusters with each URL as 23, `@user@host` as `@user`, and content-warning text included, against `configuration.statuses.max_characters` read from the target instance. Rationale: `status_length_validator.rb`. VERIFY: `curl -s https://<instance>/api/v2/instance | jq '.configuration.statuses'` supplies the limit; the script's count for `cc @user@mastodon.social please` is 15.
5. **MUST**: Threads variant stays at or under 500 with every emoji grapheme counted as its UTF-8 byte length, and contains at most 5 unique URLs including `link_attachment`. Rationale: publishing reference and posts page; over 5 links fails with `THREADS_API__LINK_LIMIT_EXCEEDED`. VERIFY: count script (model) plus a dry run on a test account that the container creation returns no error; the model is conservative, not official.
6. **MUST**: Build Bluesky facets with `RichText.detectFacets`, not string indices. Rationale: facet indices are UTF-8 bytes; JS indices were 8 vs 10 and 12 vs 26 in tests. VERIFY: `grep -nE "byteStart.*(indexOf|\.index)"` has no hit; a unit test with `Docs 🚀 https://ocx.sh/docs` expects `byteStart 10`.
7. **MUST**: A Bluesky post that carries a link also carries an `app.bsky.embed.external` embed with non-empty `title` and `description`. Rationale: no server-side unfurl is documented, a text URL gives a bare link. VERIFY: after publish, `curl -s "https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=<at-uri>" | jq '.posts[0].embed.external.uri'` is non-null.
8. **MUST**: The card thumb is under 1,000,000 bytes and images under 2,000,000 bytes (lexicon), max 4 images. Rationale: lexicon `maxSize` values; docs prose still says 1,000,000. VERIFY: `stat -c %s thumb` and `jq` over the lexicon; if lexicon and docs disagree, the lexicon wins.
9. **MUST**: Every image or video attachment on every platform has non-empty alt text no longer than 1,000 characters (X, Threads), 2,000 (Bluesky app), or the instance `description_limit` (Mastodon). Rationale: the platform limits and W3C. VERIFY: publish script asserts `alt.trim().length > 0` and below the platform limit; public-API audit over recent posts (Bluesky `getAuthorFeed` image `alt`, Mastodon `media_attachments[].description`) reports zero empty values.
10. **MUST**: A screenshot of terminal output has alt text that carries the command and its decisive output lines as text, and is not a file name or "screenshot". Rationale: W3C text-in-image rule. VERIFY: reading heuristic. Pass: `Terminal: ocx install node@22 prints "Installed node 22.11.0 in 1.2 s"`. Fail: `Screenshot of terminal` or `IMG_2031.png`.
11. **SHOULD**: Put the release link in the announcing post, one URL, no reply link. Rationale: section 10. VERIFY: variant has exactly one URL; the publish plan contains no reply post for a link.
12. **MUST**: Never pass the same text to several variants without running each counter; never post identical or substantially similar content from multiple accounts on X. Rationale: X developer policy ("Never post identical or substantially similar content across multiple accounts"). VERIFY: the script emits one verdict row per platform; a repo check that no workflow posts one body to two X accounts.
13. **SHOULD**: Where Bridgy Fed carries a post, keep the Bluesky-bound text at or under 300, video at or under 60 s and 100 MB, and no poll. Rationale: bridge docs, undated. VERIFY: the same counters; `ffprobe -v error -show_entries format=duration` under 60.
14. **MUST**: Every release or blog page that gets shared on Mastodon carries `<meta name="fediverse:creator" content="@user@instance">` and the domain is in the account's attribution domains. Rationale: attribution only works with both halves, and `missing_attribution` flags a mismatch. VERIFY: `curl -sL <url> | grep -ciE 'name=.fediverse:creator'` returns 1 or more; `curl -s https://<instance>/api/v1/accounts/lookup?acct=<user> | jq '.source // .'` read against the settings page (the `attribution_domains` field is only visible to the owner via credentials).
15. **MUST**: The project site home page carries an HTML `a` or `link` with `rel="me"` to the Mastodon profile, outside any iframe, in the served HTML. Rationale: verification rules. VERIFY: `curl -sL <home> | grep -oiE '<(a|link)[^>]*rel=.[^>]*\bme\b[^>]*>'` returns the profile URL; then `curl -s https://<instance>/api/v1/accounts/lookup?acct=<user> | jq '.fields[] | {name,verified_at}'` has a non-null `verified_at` on the website row.
16. **SHOULD**: The Bluesky handle is the project domain or a subdomain of it. Rationale: the strongest free proof of identity on Bluesky; separate from the blue check. VERIFY: `curl -s "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=<domain>"` returns the expected DID.
17. **SHOULD**: Run the pre-publish validator in the release workflow before the post step; run the account-proof and attribution checks at site build time; run the public-API audit on a schedule (weekly). Rationale: three failure classes appear at three different times. VERIFY: the workflow file lists three jobs by these names; the build fails when step two fails.
18. **MUST**: Source every limit in the validator config from a named authority with a date, and prefer the schema over prose when they disagree. Rationale: Bluesky image prose vs lexicon. VERIFY: each constant in the config carries a comment `# source: <url> (<date>)`; `grep -nE "^[A-Z_]+ *=" config | grep -v source` is empty.
19. **SHOULD**: Pin `twitter-text` and `@atproto/api` versions, and refresh the config JSON quarterly. Rationale: `twitter-text` is stale (2022-06-28) while X rules may change unannounced. VERIFY: `package.json` has exact versions; a scheduled job compares `https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json` to a stored copy.
20. **CONSIDER**: For a release launched on a channel with a video, check duration and alt/caption before publish (Bluesky caption VTT up to 20 files, 20,000 bytes each). Rationale: lexicon limits. VERIFY: the video lexicon constants.

## Dated facts

| fact | value | source | date the source states | source type |
|---|---|---|---|---|
| X post limit | 280 weighted; emoji and CJK 2; URL 23; ZWJ free; NFC | [counting page](https://docs.x.com/fundamentals/counting-characters) | none | platform |
| twitter-text config | v3, defaultWeight 200 of scale 100, URL 23 | [config/v3.json](https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json) | none | platform |
| twitter-text npm | 3.1.0, last modified | `npm view twitter-text time.modified` | 2022-06-28 | registry |
| X alt text | 1,000 characters | [media metadata](https://docs.x.com/x-api/media/metadata-create) | none (API 2.175) | platform |
| X duplicate content | banned across accounts | [developer policy](https://docs.x.com/developer-terms/policy) | none | platform |
| Bluesky post | maxGraphemes 300, maxLength 3000 bytes, 8 tags, 64 graphemes per tag | [post.json](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/feed/post.json) | commit 2026-11-27 | platform |
| Bluesky facets | UTF-8 byte offsets | [facet.json](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/richtext/facet.json) | commit 2026-11-27 | platform |
| Bluesky images | 4 per post, 2,000,000 bytes each (formerly 1 MB) | [images.json](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/images.json) | commit 2026-11-27 | platform |
| Bluesky card thumb | 1,000,000 bytes, `image/*` | [external.json](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/external.json) | commit 2026-11-27 | platform |
| Bluesky video | 300 MB mp4 (formerly 100 MB), captions 20 x 20,000 bytes | [video.json](https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/video.json) | commit 2026-11-27 | platform |
| Bluesky app alt text | 2,000 | [constants.ts](https://raw.githubusercontent.com/bluesky-social/social-app/main/src/lib/constants.ts) | none | platform |
| Bluesky handle linkage | over 270,000 accounts | [verification post](https://bsky.social/about/blog/04-21-2025-verification) | 2025-04-21 | platform |
| Bluesky profile links | shipped, no stated maximum | [profile links](https://bsky.social/about/blog/10-22-2026-introducing-profile-links) | 2026-10-22 | platform |
| Mastodon post | 500 default; URL 23; grapheme clusters; CW counted | [validator](https://raw.githubusercontent.com/mastodon/mastodon/main/app/validators/status_length_validator.rb) | none (main, 2026-11-27) | platform |
| Mastodon alt text | 10,000 | [CHANGELOG](https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md) | 4.6.0, 2026-06-17 | platform |
| Mastodon preview-card attribution | `missing_attribution` | CHANGELOG | 4.6.0, 2026-06-17 | platform |
| Mastodon latest release in file | 4.7.6 | CHANGELOG | 2026-11-19 | platform |
| Mastodon profile verification | 4 rows, HTTPS, `rel=me`, under 1 MB, no JS, no iframe | [profile docs](https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/profile.md) | none | platform |
| Threads text | 500 characters; emoji = UTF-8 bytes | [posts](https://developers.facebook.com/documentation/threads/posts), [reference](https://developers.facebook.com/documentation/threads/reference/publishing) | none | platform |
| Threads links | at most 5 unique; failure code since | posts page | 2025-12-22 | platform |
| Threads alt text | `alt_text`, 1,000, image/video, not text-only | publishing reference | feature 2024-08-21 (changelog) | platform |
| Threads oEmbed | no token needed | [changelog](https://developers.facebook.com/docs/threads/changelog) | 2026-03-03 | platform |
| Threads text attachment | 10,000 characters | [text attachments](https://developers.facebook.com/documentation/threads/create-posts/text-attachments.md) | none | platform |
| Bridgy Fed limits | 300 chars, video 60 s / 100 MB, posts older than 2 weeks skipped, 1 action per 5 s | [docs](https://fed.brid.gy/docs) | none | bridge project |
| X link statements | no penalty "for over a year" | [ppc.land](https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/) | 2026-07-28 / 2026-07-29 | secondary report of platform statements |
| X link analysis | links lower engagement, 18 accounts | [Nieman Lab](https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/) | 2026-04-08 | independent, descriptive |

Scout claims that failed to reproduce or changed: (1) Threads has no alt field (it does, 1,000); (2) Bluesky doc image limit "1,000,000" is true only of the prose, the sample code in the same file uses 2,000,000; (3) Mastodon alt 10,000 reproduces, but the docs sample still shows 1,500 and "reminder since 4.4.0" was not re-checked; (4) scout "bluesky docs path" `docs.bsky.app` now redirects (308) to `bsky.network`, and the oEmbed docs page was readable only from the raw repo. Not re-fetched: Mastodon preview-card refetch after 2 weeks (MB#17), Buffer cross-posting behaviour, X Premium longer limits (the counting page states only 280).

## What an agent must not decide alone

- Whether to open accounts on a platform, and which handle or domain to claim. This is a brand and ownership decision.
- Whether to link to a Mastodon instance as the canonical identity, and which instance to trust with attribution domains.
- Whether to buy X verification or request a Bluesky blue check.
- Whether to put the link in a reply to test reach, or to run a link-placement experiment. This trades reach against measurement and needs an owner.
- Whether to accept bridging (Bridgy Fed opt-in) for the project accounts.
- Any claim in alt text about product behaviour that is not in the screenshot's text.
- Whether a variant "reads native". The validator can only check counts and structure.

## AI-agent angle

| mistake an LLM makes | smallest mechanical check |
|---|---|
| Counts length with `len()` or `.length` and calls 280 and 300 "the same limit" | grep the validator for raw length; test `🇩🇪🇺🇸` (8 vs 2 vs 4) |
| Remembers "X counts URLs as 23" and applies it to Bluesky | test the 119-char URL line: Bluesky 119, X 28 |
| Builds Bluesky facets with `text.index(url)` or JS `indexOf` | unit test with an emoji before the URL expects byte offsets |
| Posts the URL as text to Bluesky and assumes a card appears | assert `embed.external` in the record or `getPosts` |
| Copies the docs image limit (1,000,000) into the validator | rule 18: constants cite the lexicon |
| Believes Threads has no alt text or no link limit | assert `alt_text` is sent; count unique URLs |
| Treats Mastodon length as 500 everywhere | read `max_characters` from `/api/v2/instance` |
| Counts `@user@host` as full length on Mastodon | test string returns 15 |
| Writes `fediverse:creator` only, forgetting the attribution domain | API check on `missing_attribution` for a shared card |
| Puts `rel="me"` inside a JS-rendered or iframe block | `curl` grep on raw HTML, not browser DOM |
| Says "blue check" when it means domain handle | rule 16 checks `resolveHandle` |
| Writes alt as "Screenshot of terminal" | reading heuristic in rule 10 |

## Contested / evolving

- **Link penalty on X.** For no penalty: [X product chief and owner statements, 2026-07-28/29](https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/). Against: [Nieman Lab 2026-04-08](https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/), a descriptive study of 18 accounts, which also differ by account type, so cause is unproven. Trend: platform statements moved from "links in replies" to "links anywhere" within 2026. Position taken: link in the post, measure on own account.
- **Link placement on Threads.** Meta says link posts are not penalised; a single anecdotal 24-hour test favoured a link in a follow-up post. No controlled data. Treat as unknown; use first-party insights.
- **Bluesky documentation drift.** Prose, sample code and lexicon of the same docs repo disagree (1,000,000 vs 2,000,000 bytes); video limits differ across lexicon (300 MB) and bridge docs (100 MB). Trend: the lexicon moves first.
- **Mastodon alt limit.** Default 1,500 in docs samples against 10,000 in 4.6.0 release notes; instance-specific, so read it per instance.
- **Bluesky text length.** 300 graphemes plus 3,000 bytes in the lexicon; the app also has `MAX_GRAPHEME_LENGTH = 300`. The newer `gallery` embed in the union may change image rules; not yet studied.
- **twitter-text maintenance.** Reference library untouched since 2022-06-28 while the platform changed twice (premium limits, link wrapping); a mismatch can appear with no notice.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://docs.x.com/fundamentals/counting-characters | X counting rules (platform) | undated, fetched 2026-11-27 | exact weights and the 23 rule |
| https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json | twitter-text config v3 (platform) | undated | machine-readable weights |
| https://docs.x.com/x-api/media/metadata-create | X alt text API (platform) | API 2.175 | 1,000-character limit |
| https://docs.x.com/developer-terms/policy | X developer policy (platform) | undated | duplicate-content and automation rules |
| https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/feed/post.json | post lexicon (platform) | commit 2026-11-27 | 300 graphemes and 3,000 bytes |
| https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/external.json | link-card lexicon (platform) | commit 2026-11-27 | card fields, thumb 1,000,000 bytes |
| https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/images.json | images lexicon (platform) | commit 2026-11-27 | 2,000,000 bytes, 4 images |
| https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/video.json | video lexicon (platform) | commit 2026-11-27 | 300 MB, captions |
| https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/richtext/facet.json | facet lexicon (platform) | commit 2026-11-27 | UTF-8 byte offsets |
| https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/posts.md | posting guide (platform) | docs main, 2026-11-27 | card building, doc/lexicon conflict |
| https://raw.githubusercontent.com/bluesky-social/bsky-docs/main/docs/advanced-guides/oembed.md | oEmbed guide (platform) | docs main | endpoint, blockquote fallback |
| https://raw.githubusercontent.com/bluesky-social/social-app/main/src/lib/constants.ts | Bluesky app constants (platform) | undated | app alt-text limit 2,000 |
| https://bsky.social/about/blog/04-21-2025-verification | verification post (platform) | 2025-04-21 | domain handle vs blue check |
| https://bsky.social/about/blog/10-22-2026-introducing-profile-links | profile links post (platform) | 2026-10-22 | profile link area |
| https://raw.githubusercontent.com/mastodon/mastodon/main/app/validators/status_length_validator.rb | Mastodon counting code (platform) | main, 2026-11-27 | exact counting algorithm |
| https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/posting.md | Mastodon posting docs (platform) | master | 500 / 23 / alt text |
| https://raw.githubusercontent.com/mastodon/documentation/master/content/en/user/profile.md | Mastodon profile docs (platform) | master | rel=me and fediverse:creator rules |
| https://raw.githubusercontent.com/mastodon/documentation/master/content/en/entities/Instance.md | Instance entity (platform) | master | per-instance limits |
| https://raw.githubusercontent.com/mastodon/documentation/master/content/en/entities/PreviewCard.md | PreviewCard entity (platform) | master | `missing_attribution` |
| https://raw.githubusercontent.com/mastodon/documentation/master/content/en/entities/Account.md | Account entity (platform) | master | `verified_at` |
| https://raw.githubusercontent.com/mastodon/mastodon/main/CHANGELOG.md | Mastodon changelog (platform) | through 2026-11-19 | alt 10,000, 4.6.0 dates |
| https://developers.facebook.com/documentation/threads/posts | Threads posts docs (platform) | undated; link change 2025-12-22 | 500, 5 links, media limits |
| https://developers.facebook.com/documentation/threads/reference/publishing | Threads publishing reference (platform) | undated | emoji bytes, alt 1,000 |
| https://developers.facebook.com/documentation/threads/create-posts/text-attachments.md | Threads text attachments (platform) | undated | link counting rules |
| https://developers.facebook.com/docs/threads/changelog | Threads changelog (platform) | entries 2024-2026 | oEmbed 2026-03-03, alt 2024-08-21 |
| https://fed.brid.gy/docs | Bridgy Fed docs (bridge project) | undated | truncation, bridge limits |
| https://www.w3.org/WAI/tutorials/images/decision-tree/ | W3C images tutorial (authority) | cited from scout, not re-fetched | text-in-image rule |
| https://www.niemanlab.org/2026/04/do-links-hurt-news-publishers-on-twitter-our-analysis-suggests-yes/ | independent link analysis | 2026-04-08 | counter-evidence on X links |
| https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/ | secondary report of X statements | 2026-07-28/29 | link-in-reply claim |

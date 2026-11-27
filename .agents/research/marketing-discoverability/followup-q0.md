---
title: "X summary_large_image with no image, and the card image formats on docs.x.com"
program: product
topic: marketing-discoverability
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 10
---

# Follow-up q0: what X renders for a large card with no image, and where the format list lives now

## Answer

1. **No current X page states what renders for `summary_large_image` with no image.** docs.x.com has no cards reference at all. The only primary text is the archived developer.x.com reference. That text does not say what renders either. MKT-SEO-07 stays SHOULD.
2. **No current docs.x.com page lists the card image formats.** The format list (JPG, PNG, WEBP, GIF; SVG not supported) exists only in archived copies. MKT-SEO-06's SVG source stays on the archive.
3. **One new fact helps both rules.** The archived large-image card page marks `twitter:image` as not required (`Required: No`), so X's own reference never promised an image-less large card works, and never forbade it. This supports keeping 07 as a house rule, not a platform rule.
4. **The render question needs a logged-in X account and a live post.** The hard limits forbid that. It is a documented gap, below.

## Evidence

All commands ran 2026-11-27 in the scratch directory `~/.cache/research-lang/exemplars/product/wave2/q0-repair` (referred to as `$D`).

### A. The old reference URLs land on the docs.x.com overview

```
$ for p in markup abouts-cards summary-card-with-large-image; do u=https://developer.x.com/en/docs/x-for-websites/cards/overview/$p; echo $p; curl -s -D - -o /dev/null $u | grep -iE '^(HTTP|location)'; curl -sL -o /dev/null -w '%{http_code} %{url_effective}\n' $u; done
markup
HTTP/2 307 
location: https://docs.x.com
200 https://docs.x.com/overview
abouts-cards
HTTP/2 307 
location: https://docs.x.com
200 https://docs.x.com/overview
summary-card-with-large-image
HTTP/2 307 
location: https://docs.x.com
200 https://docs.x.com/overview
```

### B. docs.x.com has no cards page

Guessed paths on docs.x.com:

```
$ for u in https://docs.x.com/x-for-websites/cards/overview/markup https://docs.x.com/x-for-websites/cards/overview/summary-card-with-large-image https://docs.x.com/x-for-websites/cards; do curl -sL -o /dev/null -w "%{http_code} $u\n" "$u"; done
404 https://docs.x.com/x-for-websites/cards/overview/markup
404 https://docs.x.com/x-for-websites/cards/overview/summary-card-with-large-image
404 https://docs.x.com/x-for-websites/cards
```

Sitemap ([docs.x.com/sitemap.xml](https://docs.x.com/sitemap.xml), fetched 2026-11-27):

```
$ curl -sL -o sitemap.xml -w '%{http_code} %{size_download} bytes\n' https://docs.x.com/sitemap.xml; grep -o '<loc>' sitemap.xml | wc -l; grep -c cards sitemap.xml
200 130402 bytes
943
0
$ grep -o '<loc>[^<]*x-for-websites[^<]*' sitemap.xml | head -20
<loc>https://docs.x.com/x-for-websites/direct-message-button
<loc>https://docs.x.com/x-for-websites/embedded-posts/faq
<loc>https://docs.x.com/x-for-websites/embedded-posts/guides/cms-best-practices
<loc>https://docs.x.com/x-for-websites/embedded-posts/guides/css-for-embedded-posts
<loc>https://docs.x.com/x-for-websites/embedded-posts/guides/embedded-post-javascript-factory-function
<loc>https://docs.x.com/x-for-websites/embedded-posts/guides/embedded-tweet-parameter-reference
<loc>https://docs.x.com/x-for-websites/embedded-posts/overview
<loc>https://docs.x.com/x-for-websites/follow-button/faqs-follow-button
<loc>https://docs.x.com/x-for-websites/follow-button/guides/javascript-factory-function-follow-button
<loc>https://docs.x.com/x-for-websites/follow-button/guides/parameter-reference-follow-button
<loc>https://docs.x.com/x-for-websites/follow-button/guides/web-intent-follow-button
<loc>https://docs.x.com/x-for-websites/follow-button/overview
<loc>https://docs.x.com/x-for-websites/javascript-api/guides/javascript-api
<loc>https://docs.x.com/x-for-websites/javascript-api/guides/scripting-factory-functions
<loc>https://docs.x.com/x-for-websites/javascript-api/guides/scripting-loading-and-initialization
<loc>https://docs.x.com/x-for-websites/javascript-api/guides/set-up-x-for-websites
<loc>https://docs.x.com/x-for-websites/javascript-api/overview
<loc>https://docs.x.com/x-for-websites/log-in-with-x/guides/browser-sign-in-flow
<loc>https://docs.x.com/x-for-websites/log-in-with-x/guides/implementing-sign-in-with-x
<loc>https://docs.x.com/x-for-websites/log-in-with-x/overview
```

The full docs dump [docs.x.com/llms-full.txt](https://docs.x.com/llms-full.txt) (docs.x.com publishes it; vendor data):

```
$ curl -sL -o xfull.txt -w '%{http_code} %{size_download} bytes\n' https://docs.x.com/llms-full.txt; wc -c xfull.txt; grep -ciE 'summary_large_image|twitter:card|twitter:image|og:image' xfull.txt
200 5360965 bytes
5360965 xfull.txt
0
```

So the card markup is not on the current docs site under any URL I could find. X still crawls pages for cards. The large-image reference page (snapshot 2026-02-04, text extracted in section C) says: "Our system recognizes when URLs are included in a Tweet, and crawls your site to fetch the Card type and content." Source: [Wayback snapshot of 2026-02-04](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image), line 16 of the extracted text. The sentence sits under an embedded post dated 2015-04-30, so it is old wording; it is the only statement of crawling on the page.

### C. What the archived primary text says (vendor documentation, archived)

Fetch and extraction. The extractor `h2t.py` drops script, style and noscript blocks, replaces tags with newlines, unescapes entities and removes blank lines:

```
$ cat h2t.py
import sys,re,html
t=open(sys.argv[1],encoding='utf-8',errors='replace').read()
t=re.sub(r'(?is)<(script|style|noscript)\b.*?</\1>','',t)
t=re.sub(r'(?s)<[^>]+>','\n',t); t=html.unescape(t)
print('\n'.join(l.strip() for l in t.splitlines() if l.strip()))
$ curl -sL -o markup.html -w '%{http_code} %{size_download}\n' https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
200 78236
$ curl -sL -o large.html -w '%{http_code} %{size_download}\n' https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image
200 80940
$ python3 -I h2t.py markup.html > markup.txt; python3 -I h2t.py large.html > large.txt
$ grep -nE 'fallback behavior|og:type, og:title|SVG|5MB|420 char|crawls' markup.txt
8:The table in this section explains the OpenGraph fallback behavior for each Twitter tag.
17:If an og:type, og:title and og:description exist in the markup but twitter:card is absent, then a summary card may be rendered.
43:URL of image to use in the card. Images must be less than 5MB in size. JPG, PNG, WEBP and GIF formats are supported. Only the first frame of an animated GIF will be used. SVG is not supported.
47:A text description of the image conveying the essential nature of an image to users who are visually impaired. Maximum 420 characters.
$ grep -nE 'Must be set|SVG|aspect ratio|suggested minimum' large.txt
82:Below are the suggested minimum properties for the Summary Card with Large Image including title, description, and image.
86:Must be set to a value of “summary_large_image”
103:A URL to a unique image representing the content of the page. You should not use a generic image such as your website logo, author photo, or other image that spans multiple pages. Images for this Card support an aspect ratio of 2:1 with minimum dimensions of 300x157 or maximum of 4096x4096 pixels. Images must be less than 5MB in size. JPG, PNG, WEBP and GIF formats are supported. Only the first frame of an animated GIF will be used. SVG is not supported.
```

The Required column, printed with `sed -n 82,112p large.txt | cut -c1-120` (each Required value follows its description line): `twitter:card` Yes, `twitter:site` No, `twitter:title` Yes, `twitter:description` No, `twitter:image` No, `twitter:image:alt` No.

[Cards markup, Wayback snapshot of 2026-01-16](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) (vendor documentation) says: "The table in this section explains the OpenGraph fallback behavior for each Twitter tag." `twitter:card` falls back to `og:type` ("a summary card may be rendered" when `twitter:card` is absent). `twitter:image`: "Images must be less than 5MB in size. JPG, PNG, WEBP and GIF formats are supported. ... SVG is not supported." `twitter:image:alt`: "Maximum 420 characters."

[Summary Card with Large Image, Wayback snapshot of 2026-02-04](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) (vendor documentation): `twitter:card` must be "summary_large_image" (Required Yes); `twitter:image` has an aspect ratio of 2:1, minimum 300x157, maximum 4096x4096, under 5MB, and is Required No. The page calls title, description and image "the suggested minimum properties".

Neither snapshot says what X shows when a `summary_large_image` page has no image. The "No" in the image row is the only statement about image absence.

### D. Third-party claims were not used; the validator

Blogs say X "downgrades summary_large_image to summary" below 300x157, or give 1200x628 or 1200x675 sizes. They conflict and cite no primary text, so they are not evidence.

The Card Validator point, corrected. The primary notice is [X Developers community, "Card Validator - preview removal", 2022-08-02](https://devcommunity.x.com/t/card-validator-preview-removal/175006) (vendor), fetched with `curl -sL` (HTTP 200): "We've recently removed the preview functionality from the Card Validator. Previews are still available in the Tweet Composer and the Card Validator remains accessible for other debugging purposes." So the validator was not retired in 2022; its preview was removed, and the Tweet Composer is X's stated way to see a card. This earlier draft said "retired"; that was wrong. Whether the validator still works in 2026 was not tested.

## Effect on the ruleset

| Rule | Effect | Text |
|---|---|---|
| MKT-SEO-07 | confirm (stay SHOULD, house rule); amend its Fact line | Add to the Fact line: "The large-image card reference, [Wayback 2026-02-04](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image), lists `twitter:image` as Required: No and says nothing about a missing image. As of 2026-11-27 docs.x.com has no cards page (sitemap, 943 URLs, 0 matches; llms-full.txt, 0 matches). The render behavior cannot be read from any X page, so this rule cannot be promoted by reading. Promote only on a measured result (see What could not be determined)." |
| MKT-SEO-06 | confirm; amend its Fact line | Replace "look for a republished X cards reference on docs.x.com" with: "As of 2026-11-27 docs.x.com holds no cards reference; the SVG sentence ('SVG is not supported') and the format list exist only in the archived [markup reference](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) and the archived [large-image card page](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image). Re-check with `curl -s https://docs.x.com/sitemap.xml \| grep -c cards`; a non-zero count means a cards page is back." |
| MKT-SEO-06 (new SHOULD clause) | none | Not added. The 2:1 ratio and 300x157 floor come from the same archived page but are image dimensions, which belong to channels. Hand them to the channels owner. |
| Other MKT-SEO rules | no effect | |

### Optional new check (re-check command for the above, NEW rule not needed)

No new rule. The re-check is a one-line command in the Fact lines above, run each time the topic is refreshed:

`curl -s https://docs.x.com/sitemap.xml | grep -c 'cards'` prints `0` today. If it prints a number above 0, read that page for the missing-image behavior and the format list.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| `developer.x.com/.../cards/overview/*` redirects to `docs.x.com/overview` (direct request: 307 to `https://docs.x.com`) | curl, section A | 2026-11-27 |
| Card Validator preview removed; Tweet Composer shows previews | [X Developers community](https://devcommunity.x.com/t/card-validator-preview-removal/175006) (vendor) | 2022-08-02 |
| docs.x.com sitemap: 943 URLs, 0 contain "cards" | https://docs.x.com/sitemap.xml | 2026-11-27 |
| docs.x.com llms-full.txt: 0 mentions of `summary_large_image`, `twitter:card`, `twitter:image`, `og:image` | https://docs.x.com/llms-full.txt | 2026-11-27 |
| `twitter:image` formats JPG, PNG, WEBP, GIF; under 5MB; "SVG is not supported"; falls back to `og:image` | [Wayback markup reference](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) (vendor documentation) | snapshot 2026-01-16 |
| Large-image card: image Required: No; 2:1 ratio; min 300x157, max 4096x4096; 5MB | [Wayback large-image page](https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) (vendor documentation) | snapshot 2026-02-04 |

## What could not be determined

- **What X renders today for `summary_large_image` with no `twitter:image` and no `og:image`.** Missing: a logged-in X account (or a signed-in browser) that can compose a post with a link to a test page and view the resulting card. Posting is forbidden by this task's limits, and no X page documents the result. Nothing in the old reference or on docs.x.com settles it. Third-party blog claims were not accepted.
- **Whether X's crawler still follows the OpenGraph fallback rows as archived.** The same missing account blocks a measurement. A test needs three throwaway pages (card tag only; card plus `og:image` only; card plus SVG `og:image`) at a public https URL and one logged-in view of each.
- **Whether X will republish a cards reference.** Unknown. The re-check command above covers it.

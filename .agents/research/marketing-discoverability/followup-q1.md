---
title: "Does LinkedIn's sharing module state which og:image file types it accepts?"
program: product
topic: marketing-discoverability
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# Does LinkedIn's sharing module state which og:image file types it accepts?

## Answer

No. The "sharing module" section of LinkedIn's own page lists three image requirements and none of them is a file type: a 5 MB maximum file size, a 1200 x 627 pixel minimum, and a 1.91:1 recommended ratio. The only file-type list on that page ("JPG, PNG, or GIF") sits in the next block, headed "The image specifications for single image ads". No LinkedIn page that I could open says which types the link-preview scraper accepts for an `og:image`. That means wave 1's wording was correct, and it can now be stated as a checked fact instead of an absence in one read.

Two other LinkedIn pages do list types. Neither is about `og:image` scraping:

| Page | Context | Image types listed | Date on page |
|---|---|---|---|
| [Make your website shareable on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a521928), sharing-module block | `og:` tags a website must emit | none (size, minimum dimensions, ratio only) | "Last updated: 3 years ago" (relative; no absolute date) |
| Same page, single-image-ad block | ad creative | JPG, PNG, or GIF | same |
| [Media file types supported on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a564109) | media a person uploads to a post | GIF, HEIF/HEIC, JPEG, PNG, WEBP | "Last updated: 2 months ago" (relative, so about September 2026) |
| [Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api) | images an API partner uploads | "JPG, GIF, and PNG formats" | `ms.date` 2026-06-19 |

SVG appears on none of the four lists. WebP appears only on the upload page, where it is a format a member may upload, not a statement about link previews.

## Evidence

### 1. The sharing-module section, quoted

Command, run 2026-11-27 from a scratch directory under `~/.cache/research-lang/exemplars/product/wave2/q1/`: `curl -sL -A 'Mozilla/5.0' -o a521928.html https://www.linkedin.com/help/linkedin/answer/a521928` (HTTP 200), then the HTML was reduced to text with a short `python3 -I` script. Operative passage, verbatim:

```
Below are the og: tags that must exist and their correct format:
<meta property='og:title' content='Title of the article'/>
<meta property='og:image' content='//media.example.com/ 1234567.jpg'/>
<meta property='og:description' content='Description that will show in the preview'/>
<meta property='og:url' content='//www.example.com/URL of the article'/>
Here are the image requirements specific to the LinkedIn sharing module:
Max file size: 5 MB
Minimum image dimensions: 1200 (w) x 627 (h) pixels
Recommended ratio: 1.91:1
The image specifications for single image ads are:
File types: JPG, PNG, or GIF
Animated GIF images must be 300 frames or shorter
Maximum file size: 5 MB
Maximum image size: 7680 x 4320 pixels
```

Further lines on the same page: "Images less than 401 pixels wide display as a thumbnail image." and "Note: If the image meets the requirements, but it still does not appear in updates on LinkedIn, your website may be blocking us from pulling the image or the image may be located on a protected directory or website."

Checks on the raw HTML, run 2026-11-27 in the same scratch directory:

```
$ curl -sL -A 'Mozilla/5.0' -o a521928.html -w '%{http_code} %{url_effective}\n' https://www.linkedin.com/help/linkedin/answer/a521928
200 https://www.linkedin.com/help/linkedin/answer/a521928
$ curl -sL -A 'Mozilla/5.0' -o /dev/null -w '%{http_code} %{url_effective}\n' https://www.linkedin.com/help/linkedin/answer/46687
200 https://www.linkedin.com/help/linkedin/answer/a521928/
$ grep -oiE '.{40}(webp|svg).{40}' a521928.html
et-url" id="artdeco/static/images/icons.svg" content="https://static.licdn.com/sc/h
$ sed -n '/image requirements specific to the LinkedIn sharing module/,/image specifications for single image ads/p' a521928.html.txt | grep -ciE 'file type|jpg|png|gif|webp|svg'
0
$ grep -n -B1 -A1 'File types' a521928.html.txt
35-The image specifications for single image ads are:
36:File types: JPG, PNG, or GIF
37-Animated GIF images must be 300 frames or shorter
```

(`a521928.html.txt` is the page reduced to text with `python3 -I`: script and style blocks removed, tags replaced by newlines.) The sharing-module block, from its heading line to the ad-spec heading, contains zero file-type words. The only `svg` hit in the raw HTML is LinkedIn's own icon asset URL. The `answer/46687` URL that a search returned redirects to the same `a521928` page, so there is no second sharing-module page.

The single JPG in the example tag is a sample value, not a stated rule.

### 2. The API route is a different mechanism

Run 2026-11-27:

```
$ curl -sL -o images-api.html -w 'images-api %{http_code}\n' https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api
images-api 200
$ grep -oE 'name="ms.date" content="[^"]*"' images-api.html
name="ms.date" content="2026-06-19T00:00:00Z"
$ grep -iE 'JPG|36,152,320' images-api.html.txt
Images with less than 36,152,320 pixels.
JPG, GIF, and PNG formats
$ curl -sL -o posts-api.html -w 'posts-api %{http_code}\n' https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
posts-api 200
$ grep -oE 'name="ms.date" content="[^"]*"' posts-api.html
name="ms.date" content="2026-05-07T00:00:00Z"
$ grep -iE 'does not support URL scraping' posts-api.html.txt
The Posts API does not support URL scraping for article post creation, as it introduces unpredictability in how a post will appear when created by API partners. Instead, API partners must set article fields such as thumbnail, title, and description within the post when creating an article post. To create an article post with thumbnail image, please use
```

So the Images API list ([page](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api), `ms.date` 2026-06-19) governs API-created posts. The [Posts API page](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) (`ms.date` 2026-05-07) says article thumbnails are set by the partner, not scraped. Neither describes what the scraper does with a site's `og:image`.

### 3. The upload page and Post Inspector

```
$ curl -sL -A 'Mozilla/5.0' -o a564109.html -w '%{http_code} %{url_effective}\n' https://www.linkedin.com/help/linkedin/answer/a564109
200 https://www.linkedin.com/help/linkedin/answer/a564109
$ grep -iE 'GIF|HEIF|JPEG|PNG|WEBP|mega pixel|Last updated' a564109.html.txt
Last updated: 2 months ago
GIF
HEIF/HEIC
JPEG
PNG
WEBP
The maximum resolution for images is 36 mega pixels.
The limit for a GIF is 500 frames or 36,152,320 pixels.
GIFs are not supported on profile or background photos
$ curl -sL -A 'Mozilla/5.0' -o pi.html -w '%{http_code} %{url_effective}\n' https://www.linkedin.com/post-inspector/
200 https://www.linkedin.com/post-inspector/
$ grep -oiE '<title>[^<]*</title>' pi.html
<title>Post Inspector</title>
```

The upload page ([a564109](https://www.linkedin.com/help/linkedin/answer/a564109), "Last updated: 2 months ago") lists WebP for member uploads, not link previews. Post Inspector answers HTTP 200 with the shell title only. Whether it renders results for a signed-out visitor was not tested, since using it means entering a URL into LinkedIn's service. Whether LinkedIn's scraper renders a WebP or an SVG `og:image` is therefore not testable here. See "What could not be determined".

### 4. X's list, fetched here (this is what the SVG MUST rests on)

The current docs.x.com no longer serves a cards page, so the only readable copy of X's list is an archive snapshot. Run 2026-11-27:

```
$ curl -sL -A 'Mozilla/5.0' -o /dev/null -w '%{http_code}\n' https://docs.x.com/x-for-websites/cards/overview/summary-card-with-large-image
404
$ curl -sL -A 'Mozilla/5.0' -o x-markup.html -w '%{http_code} %{url_effective}\n' https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
200 https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
$ grep -n 'SVG is not supported' x-markup.txt
43:URL of image to use in the card. Images must be less than 5MB in size. JPG, PNG, WEBP and GIF formats are supported. Only the first frame of an animated GIF will be used. SVG is not supported.
```

Source: [X Cards markup reference, Wayback snapshot of 2026-01-16](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup) (vendor documentation, archived; no current live copy found: the docs.x.com URL above returns 404 and docs.x.com/llms-full.txt, 5.4 MB, contains no `twitter:image` card text). Wave 2 `followup-q0.md` reached the same snapshot.

### 5. Measurement of the proposed size check

The proposed SHOULD (below) reuses the 5 MB figure. Run 2026-11-27 against the two images already used as examples in MKT-SEO-06:

```
$ curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' https://grimoire.rs/og-card.png
200 image/png 105570
$ curl -s -o /dev/null -w '%{size_download}\n' https://grimoire.rs/og-card.png | awk '$1>5000000{exit 1}'; echo exit=$?
exit=0
$ curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' https://index.grimoire.rs/logo.svg
200 image/svg+xml 2404
```

## Effect on the ruleset

**MKT-SEO-06: change (rationale and one added SHOULD check; the MUST text is unchanged).**

1. Replace the rationale bullet that begins "PNG or JPEG is a house heuristic" with this text:

   > PNG or JPEG is a house heuristic, not a platform rule. X's Cards markup reference ([Wayback snapshot of 2026-01-16](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup); no current live copy) says for `twitter:image`: "JPG, PNG, WEBP and GIF formats are supported ... SVG is not supported." LinkedIn states no file type for the `og:image` of a shared link: its sharing-module requirements ([LinkedIn Help a521928](https://www.linkedin.com/help/linkedin/answer/a521928), "Last updated: 3 years ago", checked 2026-11-27) are a 5 MB maximum, a 1200 x 627 pixel minimum and a 1.91:1 ratio, and its only "JPG, PNG, or GIF" list is for single-image ads. LinkedIn's upload page ([a564109](https://www.linkedin.com/help/linkedin/answer/a564109), "Last updated: 2 months ago") lists WebP for member uploads, and no LinkedIn page lists SVG. No platform page the dives could open says that WebP is accepted or refused for a LinkedIn link preview, so PNG and JPEG stay the safe common subset.
   >
   > Verification (rationale, SHOULD re-run at each refresh): `sed -n '/image requirements specific to the LinkedIn sharing module/,/image specifications for single image ads/p' <a521928 page reduced to text> | grep -ciE 'file type|jpg|png|gif|webp|svg'` prints 0 (the block still names no type); and `curl -sL https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup | grep -c 'SVG is not supported'` prints 1 or more. Either result changing means the rationale needs a rewrite. Run 2026-11-27: 0, and the X line matched at line 43 of the text-reduced copy (Evidence 1 and 4).

2. Add under Verification, after "Image type (SHOULD)":

   > - Image size (SHOULD): `curl -s -o /dev/null -w '%{size_download}\n' "$u" | awk '$1>5000000{exit 1}'` exits 0. The limit is LinkedIn's "Max file size: 5 MB" for the sharing module, taken here as 5,000,000 bytes because the page does not say which megabyte it means. Reviser measurement, 2026-11-27: exit 0 for `https://grimoire.rs/og-card.png` (105,570 bytes).

3. Extend the Fact line: add [LinkedIn Help a521928](https://www.linkedin.com/help/linkedin/answer/a521928) (relative date "3 years ago"; checked 2026-11-27) and [LinkedIn Help a564109](https://www.linkedin.com/help/linkedin/answer/a564109) ("2 months ago"). Re-check: when LinkedIn lists a type for the sharing module, replace the heuristic with that list.

   > Verification (Fact line): each added URL answers `curl -sL -o /dev/null -w '%{http_code}' <url>` with 200, and `curl -sL -A 'Mozilla/5.0' <a521928> | grep -c 'Max file size: 5 MB'` prints 1 or more (the quoted figure is still on the page). Run 2026-11-27: 200 for both URLs; the 5 MB line present (Evidence 1).

Severity stays MUST for the no-SVG form check and SHOULD for PNG or JPEG. The no-SVG MUST rests on X's archived statement "SVG is not supported" (snapshot 2026-01-16, Evidence 4) and is not strengthened or weakened by this result. LinkedIn says nothing about SVG, so the rule must not cite LinkedIn for it.

**MKT-SEO-16: confirm, with one added note.** LinkedIn's page says a missing preview image may mean "your website may be blocking us from pulling the image". That supports checking the live status for social-preview bots. The token is not in the nine-token list in MKT-SEO-15, and the live check cannot be run for it here (no verified bot test). Recommendation: keep the nine-token list as is, because LinkedIn's page does not name a user-agent token. Do not add `LinkedInBot` to the policy file from memory. See "What could not be determined".

**No new rule.** The finding is a correction of the evidence behind an existing rule, not a new checkable behaviour.

## Dated facts

- [LinkedIn Help a521928, "Make your website shareable on LinkedIn"](https://www.linkedin.com/help/linkedin/answer/a521928): fetched 2026-11-27; page date is the relative "Last updated: 3 years ago"; footer reads "LinkedIn Corporation © 2026". Sharing-module block: 5 MB, 1200 x 627, 1.91:1. Ad block: JPG, PNG, GIF.
- [LinkedIn Help a564109, "Media file types supported on LinkedIn"](https://www.linkedin.com/help/linkedin/answer/a564109): fetched 2026-11-27; "Last updated: 2 months ago". Image types GIF, HEIF/HEIC, JPEG, PNG, WEBP; "The maximum resolution for images is 36 mega pixels."
- [LinkedIn Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api): `ms.date` 2026-06-19; "JPG, GIF, and PNG formats".
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api): `ms.date` 2026-05-07; no URL scraping for API-created article posts.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/): HTTP 200, title "Post Inspector" (read 2026-11-27); running an inspection sends a URL to LinkedIn and was not attempted.
- [X Cards markup reference, Wayback snapshot 2026-01-16](https://web.archive.org/web/20260116124848/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup): fetched 2026-11-27; "JPG, PNG, WEBP and GIF formats are supported ... SVG is not supported." Vendor documentation, archived; the live docs.x.com cards URL returns 404.

The LinkedIn items are LinkedIn's own publications and the X item is X's own (vendor documentation, not independent testing).

## What could not be determined

- Whether LinkedIn's link-preview scraper accepts a WebP, an SVG or an animated GIF `og:image`. Missing: a logged-in LinkedIn session to run Post Inspector against a scratch page with each type (a human step; no credential was used or sought). The measurement, if the owner runs it: serve one page per type (PNG, JPEG, WebP, SVG, GIF) over public https, inspect each in Post Inspector, and record which render a preview image.
- The exact date of the sharing-module text. LinkedIn shows only "3 years ago", and no absolute date or dateModified field is in the HTML.
- Whether "5 MB" means 5,000,000 or 5,242,880 bytes. The check uses the smaller number.
- LinkedIn's scraper user-agent token. The help page does not name one, and it was not taken from memory.

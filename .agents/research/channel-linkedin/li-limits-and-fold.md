---
title: LinkedIn post limits, the see-more fold, and attachment accessibility for person-led developer-tool posts
program: product
sub_program: channels
topic: channel-linkedin
worker: li-limits-and-fold
date_researched: 2026-11-27
model: sonnet
sources_fetched: 31
scope: >
  Covers hard limits per post format (text, link post and preview card, image, document, poll, video file),
  the "see more" fold on desktop and mobile, image alt text, document title and PDF accessibility, and the
  terms that govern automated measurement. Does not cover video caption delivery (vid-accessibility), format
  choice by goal (li-format-and-reach-evidence), or disclosure and AI-content policy (li-policy-and-ai-content).
---

# LinkedIn post limits, the fold, and attachment accessibility

## Contents

1. [Summary](#summary)
2. [Findings](#findings): terms verdict; limits; fold evidence; attachments and accessibility; measurements; scout reproduction
3. [Dated facts](#dated-facts)
4. [Decisions asked for by the commission](#decisions)
5. [Manual fold protocol (pending human run)](#manual-fold-protocol-pending-human-run)
6. [Normative guidance candidates](#normative-guidance-candidates)
7. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
8. [AI-agent angle](#ai-agent-angle)
9. [Contested / evolving](#contested--evolving)
10. [Sources](#sources)
11. [Appendix: check script](#appendix-check-script)

Labels used throughout: **LI** = LinkedIn's own page; **LI-API** = LinkedIn developer documentation hosted on Microsoft Learn; **STD** = standards body; **3P** = third party (vendor blog or tool, not independent research unless stated). LinkedIn Help pages show only a relative marker ("Last updated: N ago", measured at the fetch date 2026-11-27), never an absolute date. Where a row says "N ago" the true date is unknown and is earlier than 2026-11-27 minus N.

## Summary

- Terms verdict: reading LinkedIn Help and Legal pages is permitted; any automated fetching, rendering or scraping of LinkedIn member content (posts, profiles, embeds, the live feed) is barred by User Agreement section 8.2 (effective 3 Nov 2025). No fold measurement in this artifact scraped anything; the live-client measurement is a manual human protocol.
- A post body is limited to 3,000 characters (LI, a528176, "2 months ago"). The help centre does not state a fold, a hashtag cap or a mention cap.
- LinkedIn publishes no "see more" figure on any page fetched (a528176, a518996, a525301 are silent). Every fold figure is 3P.
- Eight 3P sources dated Mar to Nov 2026 agree on roughly 210 characters (desktop) and 140 characters (mobile) with about 3 lines. Outliers: 250 desktop, 210 mobile, a 5-line desktop text-only clamp, and a 2-line mobile clamp. No source discloses a reproducible method; several cite each other.
- Derived fold budget (derived, third-party, grade C minus): put the claim in the first 90 graphemes and the first 2 lines; keep lines 1 to 3 within 140 graphemes in total; never use a blank line inside the first 3 lines.
- Short-line hooks lose most of the fold: fixture F04 (five one-sentence lines) shows all of its first three lines hold 38 graphemes, and F13 (three leading newlines) leaves 2 visible lines of text.
- A post carries a link or an image, not both (LI, a527229). A document, video, poll or multi-image post has no link preview card.
- Image: up to 20 images, 5 MB each, at least 552x276, aspect 3:1 to 4:5, under 36 megapixels (LI, a527229, a564109).
- Document: PDF, PPT, PPTX, DOC, DOCX; 100 MB; 300 pages; one million words; flatten layers; uniform page size; add a title (LI, a518909, a564109, a517910).
- Alt text: LinkedIn supports it on feed images and article images only. The help page states no limit; the Images API states a maximum of 4,086 characters and a recommended length under 120 (LI-API, 19 Jun 2026). No help page or API field offers alt text for documents.
- Document accessibility is unverifiable inside LinkedIn: the Documents API has a `title` field and no alt-text or tagging field. The only safe pattern is to repeat the document's substance as text in the post.
- Link preview needs og:title, og:image, og:description, og:url; image at least 1200x627, 1.91:1, at most 5 MB (LI, a521928). Post Inspector refreshes a cached preview for new posts only; no cache duration is published.
- Poll: 140-character question, 30-character options, 4 options on desktop and Android, 5 on iOS, no editing after creation (LI, a527270).
- Video file: 3 s to 15 min, 75 KB to 5 GB, 256x144 to 4096x2304, aspect 1:2.4 to 2.4:1, 10 to 60 fps, 192 Kbps to 30 Mbps (LI, a7174587, "2 years ago").
- Three scout figures fail to reproduce on the page they cite: the "under 401 px thumbnail" rule and the Post Inspector mention are not on a521928 (Post Inspector is a6233775; the 401 px figure is on no page fetched), and the video minimum duration is 3 s on desktop but 2 s on mobile.
- Counting unit is unmeasured: on emoji-heavy hooks UTF-16 length overstates grapheme length by up to 24 units (fixture F03: 98 vs 74). Which unit LinkedIn enforces for the 3,000 limit and the fold is a pending human test (F08).

## Findings

### 1. Terms verdict (done before any measurement)

Read: [User Agreement](https://www.linkedin.com/legal/user-agreement) ("Effective on November 3, 2025", LI) and [Help a1341387 "Prohibited software and extensions"](https://www.linkedin.com/help/linkedin/answer/a1341387) ("Last updated: 2 years ago", LI). The fetch tool returned summaries of the pages; the clause wording below is the tool's quotation and should be re-read verbatim by a human before it is copied into a published rule.

| Clause | Text as returned | Consequence here |
|---|---|---|
| UA 8.2 item 2 | Do not "Develop, support or use software, devices, scripts, robots or any other means or processes" (crawlers and browser add-ons named) "to scrape or copy the Services, including profiles and other data from the Services." | No script may fetch or copy posts, profiles, or the feed to measure the fold. |
| UA 8.2 item 3 | Do not "Override any security feature or bypass or circumvent any access controls or use limits of the Services." | No logged-in session automation. |
| UA 8.2 item 13 | Do not "Use bots or other unauthorized automated methods to access the Services"; the item covers automated adding, messaging and engagement. | No auto-comment, auto-connect, auto-like. |
| UA 8.2 item 15 | Do not "Overlay or otherwise modify the Services or their appearance." | Browser extensions that rewrite the feed or composer (including fold-preview overlays injected into linkedin.com) are barred. |
| UA 8.2 item 16 | Do not "Interfere with the operation of, or place an unreasonable load on, the Services." | Rate argument against bulk fetches. |
| Help a1341387 | LinkedIn does not allow third-party tools that "scrape, modify the appearance of, or automate activity on LinkedIn's website"; members "risk having their accounts restricted or shut down." | Account-level penalty. |

Verdict, recorded: reading Help and Legal pages is in scope and was done. Automated rendering or fetching of member content is out of scope: neither page gives permission, and 8.2 forbids it. No such fetch was performed. Fetching `linkedin.com/help/...` pages through the fetch tool is reading public documentation, not member content, and is treated as allowed; the help pages returned HTTP 200 summaries throughout.

One reading to flag for a human: the Medium article that gives the 210-character fold returned HTTP 403 to the fetch tool (blocked, not retried). Publishing tools that render "previews" outside LinkedIn (Supergrow, Taplio, Typefully, Hootsuite) are not covered by 8.2 because they do not load LinkedIn; they are 3P estimators, not measurements.

### 2. Limits per format (LinkedIn's own pages, re-fetched 2026-11-27)

| Format | Limit | Source (marker) |
|---|---|---|
| Text post | "Posts can contain up to 3,000 characters." Over 3,000: "write an article". LinkedIn "may limit how many posts a member or a LinkedIn Page can make in a certain time period." Hashtag, mention and fold limits: not stated. | [a528176](https://www.linkedin.com/help/linkedin/answer/a528176) ("Post and share updates", 2 months ago) |
| Link post | Text "up to 3000 characters"; preview image frame 1.91:1, 1200x627; "Allow a few seconds for a preview image to display." | [a525301](https://www.linkedin.com/help/linkedin/answer/a525301) ("Share articles or links", 2 years ago) |
| Link preview source | Four tags required: `og:title`, `og:image`, `og:description`, `og:url`. Image at least 1200x627, at most 5 MB, recommended ratio 1.91:1. If the image still fails: "your website may be blocking us from pulling the image." | [a521928](https://www.linkedin.com/help/linkedin/answer/a521928) ("Make your website shareable on LinkedIn", 3 years ago) |
| Preview refresh | Post Inspector refreshes a URL's preview; the change applies to new posts only; existing posts keep the old preview; cache duration not stated. | [a6233775](https://www.linkedin.com/help/linkedin/answer/a6233775) ("Use Post Inspector to refresh URL", 3 years ago) |
| Image | Up to 20 images per post; 5 MB per upload; at least 552x276; recommended width 1080; aspect 3:1 to 4:5 (width:height); multi-photo renders at max 4:5; "You can share either a URL link or an image in a post, but not both at the same time." | [a527229](https://www.linkedin.com/help/linkedin/answer/a527229) ("Share photos on LinkedIn", 1 day ago) |
| Image formats and ceiling | GIF, JPEG, PNG, WEBP everywhere; HEIF/HEIC iOS only; max 36 megapixels; GIF limit 500 frames or 36,152,320 pixels. | [a564109](https://www.linkedin.com/help/linkedin/answer/a564109) ("Media file types supported on LinkedIn", 2 months ago) |
| Document | PPT, PPTX, DOC, DOCX, PDF; 100 MB; 300 pages; one million words; flatten multi-layer PDFs; same page size on every page; "Videos and other animations in documents aren't supported and will display as static images." | [a518909](https://www.linkedin.com/help/linkedin/answer/a518909) (3 years ago); a564109 |
| Document title | "Your document's title should be clear, concise, and accurately describe the content." No length limit stated. | [a517910](https://www.linkedin.com/help/linkedin/answer/a517910) ("Add a title to your uploaded documents", 3 years ago) |
| Poll | Question max 140 characters; option max 30; 4 options on desktop and Android, 5 on iOS; "a poll can't be edited once it's created"; duration options not listed. | [a527270](https://www.linkedin.com/help/linkedin/answer/a527270) ("LinkedIn Polls - FAQ", 1 year ago) |
| Video file | 75 KB to 5 GB; 3 s to 15 min (desktop minimum 3 s, mobile app 2 s); 256x144 to 4096x2304; aspect 1:2.4 to 2.4:1; 10 to 60 fps; 192 Kbps to 30 Mbps; formats MP4, MOV (all clients), WEBM (desktop, Android), MKV (desktop) per a564109; captions: auto in 10 languages, review before adding, or upload a caption file. | [a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587) ("Share videos on LinkedIn", 2 years ago); a564109 |

All eight Help IDs in the commission resolved to the topic claimed: a528176 post and share updates; a518909 documents; a527229 photos; a564109 media file types; a527270 polls; a7174587 videos; a519856 alt text; a521928 website shareability.

API-side limits (LI-API, Microsoft Learn, moniker li-lms-2026-11): Images API `altText` "Maximum length is 4,086 characters, recommended length is less than 120 characters"; images "less than 36,152,320 pixels", "JPG, GIF, and PNG formats", "GIF format supports up to 250 frames" ([Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api), ms.date 2026-06-19). Documents API: "The file size can't exceed 100MB and 300 pages"; the post content carries `media.title` and no alt-text field ([Documents API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api), ms.date 2026-06-19). Posts API: error `FIELD_LENGTH_TOO_LONG` on `commentary`, no number given; article posts must set thumbnail, title and description explicitly because "The Posts API does not support URL scraping for article post creation" ([Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), ms.date 2026-05-07). Marketing API version 202601 sunsets 15 Jan 2027 (same pages).

Two cross-source disagreements, both LinkedIn's own: GIF frame cap 500 (Help a564109) vs 250 (Images API); image formats WEBP/HEIC accepted in the UI vs JPG/GIF/PNG in the API. Treat the API figure as the floor for any agent that posts by API; treat the Help figure as the UI limit.

### 3. The fold

LinkedIn states no fold. Pages read and silent: [a528176](https://www.linkedin.com/help/linkedin/answer/a528176), [a518996 "Get started with posting on LinkedIn"](https://www.linkedin.com/help/linkedin/answer/a518996) (1 month ago), [a525301](https://www.linkedin.com/help/linkedin/answer/a525301).

Third-party fold measurements collected (none run by LinkedIn; none discloses a reproducible method; read 2026-11-27):

| # | Source | Date stated | Desktop | Mobile | Method disclosed | Independence |
|---|---|---|---|---|---|---|
| 1 | [AuthoredUp](https://authoredup.com/blog/linkedin-character-limit) (vendor) | Published 2 Apr 2026, updated 5 Nov 2026 | ~210 chars | ~140 chars | None for the fold; footnote cites "analysis of 372,126 LinkedIn posts, Sep 2025 - Feb 2026" for the page's length data | Primary origin cited by others |
| 2 | [Post Formatter](https://postformatter.com/blog/linkedin-see-more-cutoff/) (vendor of a preview tool) | 29 Jul 2026 | ~210 chars, ~3 lines | ~140 chars, ~3 lines | Author says he "re-measured the cutoff against the live feed"; describes a ~3-line column clamp; blank lines count as lines | Claims own measurement; not reproducible from the page |
| 3 | [TickTrack](https://www.ticktrack.in/guides/linkedin-character-limits) (vendor) | Updated 30 Oct 2026 | ~210 chars or 3 lines | ~140 chars, 2 to 3 lines | None; "commonly observed values" | Unknown |
| 4 | [OneStopLinkedIn](https://www.onestoplinkedin.com/blog/linkedin-character-limits-guide-2026) (vendor) | 21 Jul 2026 | ~210 | ~140 | None | Unknown |
| 5 | [Eden](https://eden.so/blog/linkedin-character-limits/) (vendor) | 21 Aug 2026 (structured data) | ~210 | ~140 | None; notes LinkedIn does not publish it | Unknown |
| 6 | [Pollen](https://www.justpollen.com/blog/linkedin-character-limit) (vendor) | 12 Mar 2026 | ~250 | ~210 | None | Outlier |
| 7 | [Supergrow preview tool](https://www.supergrow.ai/tools/linkedin-post-preview) (vendor) | Undated (footer 2026) | 5 lines (~480 chars) text-only; 3 lines (~210) with media | 2 lines (~90-140 chars) | Says it "replicates LinkedIn's feed rendering"; no test shown | Outlier on lines |
| 8 | [Ordinal](https://www.tryordinal.com/blog/linkedin-post-character-limit) (vendor) | Undated (related posts Oct-Nov 2026) | ~210 (cites AuthoredUp) | ~140 (cites AuthoredUp) | Not its own | Derivative of #1 |

Read of the evidence. Rows 1, 4, 5, 8 agree on one number pair and row 8 states it copied row 1; the pair may be one measurement repeated. Only row 2 claims an own live-feed measurement; it is vendor data from a company that sells formatting tools. Three sources (2, 3, 7) say the clamp is line-based, and two say a blank line costs a full line; that is a mechanism consistent with a CSS line-clamp, which would make a character budget unsafe for short-line hooks. The 3P sources split on text-only desktop (3 lines vs 5 lines): unresolved. The Medium article behind a "210 characters" headline returned HTTP 403 and was not read.

Derived fold budget (**derived, third-party; evidence grade C minus: eight vendor pages, one claimed own measurement, no disclosed method, circular citation; not LinkedIn data**):

| Surface | Minimum across the sources | Use in rules |
|---|---|---|
| Mobile | ~140 chars; 2 lines (row 7); ~90 chars (row 7 lower bound) | Claim inside the first 90 graphemes and the first 2 lines |
| Desktop | ~210 chars; 3 lines (rows 2, 3, 7-with-media) | First 3 lines together at most 140 graphemes (the mobile figure binds) |
| Blank lines | Count as full lines (rows 2, 3, 7, Ordinal) | No blank line in lines 1 to 3 |

What lines 1 to 3 must carry (checkable, from the budget plus LinkedIn's creator advice of "an engaging hook at the beginning" at [members.linkedin.com/create-start](https://members.linkedin.com/create-start), cited in the scout, not re-fetched here):

1. Line 1: the claim, as a complete sentence, with the subject (the tool or the measured thing) and one concrete specific (a number, a version, a command, a measured result). Not a teaser, not a question that withholds the answer.
2. Line 2: the reader's reason to care or the first proof point, still without a blank line before it.
3. Line 3: relationship disclosure if the author makes, maintains, sells or is paid for the tool ("I maintain X"), because it must be visible without expanding (FTC reasoning is the li-policy-and-ai-content worker's; this file only fixes the position). If no disclosure applies, line 3 carries the next fact.
4. No URL in lines 1 to 3 (link placement evidence is li-format-and-reach-evidence's; this rule only protects the fold budget, because a URL spends 25 to 100 graphemes with no reading value).

Cross-territory, one line each: whether to put the link in the body or a comment is a reach question (li-format-and-reach-evidence); disclosure wording and AI-content disclosure belong to li-policy-and-ai-content.

### 4. Attachments and accessibility

**Image alt text.** LI: "You can add alternative text (Alt.text) to the images you share on your feed or embed in articles"; desktop uses the Alt.text label under the upload, mobile the ALT label; no character limit stated; "LinkedIn may automatically add alt-text to images that don't have it", with an alert on desktop and none on mobile ([a519856](https://www.linkedin.com/help/linkedin/answer/a519856), 3 years ago). LI-API: `altText` max 4,086 characters, recommended under 120 ([Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api), 19 Jun 2026). The auto alt text is LinkedIn's guess and is not an author-written alternative; a rule must require the author's own text.

WCAG 2.2 [SC 1.1.1 Non-text Content, Understanding page](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) (marked "Updated 06 September 2026", STD): a text alternative must "serve the equivalent purpose"; pure decoration should be ignorable; filenames and placeholder text are a failure (F30). Applied to a developer-tool post: a terminal screenshot's alt text states the command and the result the screenshot proves ("`grim install` output: 3 skills pinned, exit 0"); "screenshot" or "image1.png" fails.

**Images of text.** WCAG 2.2 [SC 1.4.5 Images of Text](https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html) (AA, STD): use real text where the technology can produce the look; exceptions: customizable, and essential (logotypes). Images of text "alongside real text that conveys the same information" still meet it. A code screenshot on LinkedIn is an image of text that the platform cannot make customizable, so the compliant route is to give the code as real text in the post body or the alt text. This is a standards reading applied to a platform; whether LinkedIn counts as "content" within the author's WCAG obligation is a legal question (see must-not-decide list).

**Documents (PDF carousels).** LinkedIn gives no alt-text field for documents (a519856 covers images only; the Documents API has `media.title` and nothing else) and no statement that it reads PDF tags. LinkedIn renders pages to images for the feed, so a screen-reader user depends on the post commentary. [PDF/UA-1 (ISO 14289-1)](https://www.loc.gov/preservation/digital/formats/fdd/fdd000350.shtml) (Library of Congress format description, last updated 2024-06-09, STD-adjacent): all real content tagged in logical reading order; real-content images get a Figure tag "that includes alternative or replacement text"; language declared; fonts embedded. That page does not state a document-title requirement. The PDF Association pages (pdfa.org/resource/pdfua-in-a-nutshell, pdfa.org/iso-14289-2-pdfua-2) returned HTTP 403, so the overview requested by the commission was not read; a search summary (not a fetched source) says ISO 14289-2:2024 exists beside 14289-1:2014 and that tagged PDF is the mechanism. Not verified further.

Consequence: a tagged PDF helps whoever downloads the file; it does not make the in-feed carousel accessible. MUST checks per attachment type are in the next section.

### 5. Measurements (run 2026-11-27, commands recorded)

Tooling: `python3 -I` (CPython 3.14.10, stdlib only; no Pillow, no `regex`, no pdfinfo, no qpdf on this machine, so dimensions and page counts are fixture values, not read from files). Grapheme clustering is an approximation written with `unicodedata` (ZWJ sequences, variation selectors, skin tones, keycaps, regional-indicator pairs, combining marks); it is not full UAX #29 and was not validated against a reference implementation.

Commands (full script in the [appendix](#appendix-check-script)):

```
python3 -I build_fixtures.py          # writes fixtures.json: 20 drafts F01..F20 (inline in the session)
python3 -I check.py fixtures.json     # length, fold and attachment checks
```

Output, verbatim (`cp` code points, `u16` UTF-16 code units, `graph` grapheme clusters; `hook_gr` graphemes in line 1; `first3_gr` graphemes in the first three lines; `blank3` blank lines in the first three; `hook<=140` line 1 within the mobile fold figure):

```
id|cp|u16|graph|hook_gr|first3_gr|blank3|hook<=140|>3000(gr)|>3000(u16)|link|attach
F01|98|98|98|69|98|1|True|False|False|False|ok
F02|110|121|106|79|106|1|True|False|False|False|ok
F03|87|98|74|74|74|0|True|False|False|False|ok
F04|90|90|90|17|38|1|True|False|False|False|ok
F05|80|145|80|80|80|0|True|False|False|False|ok
F06|123|123|123|123|123|0|True|False|False|True|ok
F07|3000|3000|3000|3000|3000|0|False|False|False|False|ok
F08|3000|3001|3000|3000|3000|0|False|False|True|False|ok
F09|80|80|80|80|80|0|True|False|False|False|ok
F10|90|90|80|80|80|0|True|False|False|False|ok
F11|103|103|103|33|103|0|True|False|False|False|ok
F12|103|103|103|54|103|0|True|False|False|False|ok
F13|72|72|72|0|2|3|True|False|False|False|ok
F14|217|217|217|217|217|0|False|False|False|False|ok
F15|101|101|95|95|95|0|True|False|False|False|ok
F16|69|69|69|69|69|0|True|False|False|False|ok
F17|69|69|69|69|69|0|True|False|False|False|min 552x276;>5MB;alt missing
F18|69|69|69|69|69|0|True|False|False|False|untagged and text not repeated in post
F19|69|69|69|69|69|0|True|False|False|False|missing og:description
F20|18|18|18|18|18|0|True|False|False|False|opts not 2..4 (5 iOS only)
```

What the run shows:

| Finding | Evidence |
|---|---|
| Code units overstate length on emoji | F03: 98 UTF-16 units vs 74 graphemes (family, profession, flag and rainbow-flag sequences); F02: 121 vs 106; F15 keycap emoji: 101 vs 95. |
| Mathematical-bold "styled" text doubles under UTF-16 | F05: 80 code points, 145 UTF-16 units, 80 graphemes. Also unreadable by screen readers and not searchable (general accessibility fact; not sourced here). |
| A post at exactly 3,000 code points exceeds 3,000 in UTF-16 when it ends in an astral character | F08: 3000 cp, 3001 u16. Which unit LinkedIn enforces is unmeasured; the safe rule counts the larger of the units and stays at or below 2,900. |
| Combining marks are counted differently | F10: 90 cp vs 80 graphemes (decomposed "é"). |
| One-sentence-per-line hooks waste the fold | F04: three visible lines hold 38 graphemes, far under 140, so a fold measured in lines hides 52 of 90 characters; F13: leading newlines leave 2 text lines in the first 3. |
| A 140-grapheme hook is easy to break with emoji decoration | F14: hook 217 graphemes. |
| Attachment checks catch the planted faults | F17 (500x250, 7 MB, no alt), F18 (untagged, text not repeated), F19 (missing og:description), F20 (five options; valid only on iOS). |

Limits of the measurement: the fixtures are synthetic; the check proves the script's logic against the limits table, not LinkedIn's behaviour. The fold column in the output is a budget compared with a 3P figure, not an observed fold. Grapheme counts come from an approximation. Attachment dimensions were typed into fixtures.

### 6. Scout reproduction (re-fetched; every figure in the brief and scout rows)

| Scout row | Claim | Result |
|---|---|---|
| LO#1 | 3,000 post limit (a528176) | Reproduces. Fold: confirmed absent. Link-post 3,000 (a525301): reproduces. |
| LO#2 | Fold not on a518996 | Reproduces (silent). |
| LO#3 limits half, LC#5 | Documents 100 MB, 300 pages, one million words, PDF/PPT/PPTX/DOC/DOCX, flatten, uniform size | Reproduces (a518909, a564109). |
| LO#21 | Video 3 s to 15 min, 75 KB to 5 GB, 256x144 to 4096x2304, 1:2.4 to 2.4:1, 10-60 fps, 192 Kbps-30 Mbps | Reproduces; refinement: minimum is 3 s on desktop and 2 s on the mobile app. |
| LO#22, LC#6 | Alt text on feed and article images; limit unspecified; no document mention; document title | Help reproduces. New: LI-API gives 4,086 max and 120 recommended. Auto alt text exists. |
| LO#23, LC#27 | Poll 140/30, 2-4 options (iOS 5), no edit | Reproduces. Scout LO#23 says "2-4 options"; the page states "up to four", with no minimum stated. The minimum of two is not on the page fetched. |
| LO#30 | og tags, 1200x627, 1.91:1, 5 MB; "under 401 px wide shows as thumbnail"; Post Inspector refreshes | **Fails in part.** Tags, sizes and ratio reproduce on a521928. "Under 401 px" is on neither a521928 nor a525301. Post Inspector is on a6233775, not a521928. |
| LO#31 | 20 images, 5 MB, 552x276, 1080 recommended, 3:1 to 4:5, link or image not both, 36 MP | Reproduces (a527229, a564109). |
| LC#7 | Third-party limit tables stale (2021) | Not re-checked; this file uses 2026 3P pages. |
| LC#28 | Video 15 min, 5 GB, captions 10 languages, MP4/MOV | Reproduces; a564109 adds WEBM and MKV on some clients. |
| Brief | Post Inspector documentation | Help article a6233775 read; the tool page itself (linkedin.com/post-inspector/) renders only a title to the fetch tool. No cache duration is published; the "7 days" figure in search snippets is not LinkedIn-sourced. |
| Commission | PDF Association PDF/UA overview | Not fetched (HTTP 403 on both pdfa.org URLs). |

## Dated facts

| Fact | Value | URL | Date stated by source | Source type |
|---|---|---|---|---|
| User Agreement effective date | 3 Nov 2025 | https://www.linkedin.com/legal/user-agreement | "Effective on November 3, 2025" | Platform (LI) |
| Post text limit | 3,000 characters | https://www.linkedin.com/help/linkedin/answer/a528176 | "Last updated: 2 months ago" | Platform |
| Link-post text limit | 3,000 | https://www.linkedin.com/help/linkedin/answer/a525301 | 2 years ago | Platform |
| Link preview tags and image | 4 og tags; 1200x627 min; 1.91:1; 5 MB | https://www.linkedin.com/help/linkedin/answer/a521928 | 3 years ago | Platform |
| Post Inspector semantics | Refreshes preview for new posts only; cache duration unstated | https://www.linkedin.com/help/linkedin/answer/a6233775 | 3 years ago | Platform |
| Image limits | 20 images; 5 MB; 552x276 min; 1080 rec.; 3:1 to 4:5; link xor image | https://www.linkedin.com/help/linkedin/answer/a527229 | 1 day ago | Platform |
| Image ceiling and formats | 36 MP; GIF 500 frames or 36,152,320 px; GIF/JPEG/PNG/WEBP, HEIC iOS | https://www.linkedin.com/help/linkedin/answer/a564109 | 2 months ago | Platform |
| Document limits | 100 MB; 300 pages; 1,000,000 words; PDF/PPT/PPTX/DOC/DOCX; flatten; uniform page size | https://www.linkedin.com/help/linkedin/answer/a518909 and a564109 | 3 years ago; 2 months ago | Platform |
| Document title advice | clear, concise, accurate; no length stated | https://www.linkedin.com/help/linkedin/answer/a517910 | 3 years ago | Platform |
| Poll limits | 140 / 30 chars; 4 options (5 iOS); no edit | https://www.linkedin.com/help/linkedin/answer/a527270 | 1 year ago | Platform |
| Video file limits | 75 KB-5 GB; 3 s (desktop) / 2 s (mobile) to 15 min; 256x144-4096x2304; 1:2.4-2.4:1; 10-60 fps; 192 Kbps-30 Mbps | https://www.linkedin.com/help/linkedin/answer/a7174587 | 2 years ago | Platform |
| Auto captions | 10 languages; review or upload file | https://www.linkedin.com/help/linkedin/answer/a7174587 and a1327025 | 2 years ago | Platform |
| Alt text on images | Supported on feed and article images; auto alt text may be added; no limit stated | https://www.linkedin.com/help/linkedin/answer/a519856 | 3 years ago | Platform |
| API alt text | max 4,086; recommended under 120 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api | ms.date 2026-06-19 | Platform developer docs |
| API image limits | under 36,152,320 px; JPG/GIF/PNG; GIF 250 frames | same | 2026-06-19 | Platform developer docs |
| API document limits and title field | 100 MB; 300 pages; `media.title`; no alt field | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api | 2026-06-19 | Platform developer docs |
| API article posts | No URL scraping; set thumbnail, title, description | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | 2026-05-07 | Platform developer docs |
| Marketing API 202601 sunset | 15 Jan 2027 | same pages | 2026 | Platform developer docs |
| Fold, desktop | ~210 chars (most); 250 (Pollen); 5 lines text-only (Supergrow) | see fold table | Mar-Nov 2026 | 3P vendor, no disclosed method |
| Fold, mobile | ~140 chars (most); 210 (Pollen); 2 lines, ~90-140 (Supergrow) | see fold table | Mar-Nov 2026 | 3P vendor, no disclosed method |
| Comment limit | 1,250 (AuthoredUp, Pollen); LinkedIn silent | https://authoredup.com/blog/linkedin-character-limit | Updated 5 Nov 2026 | 3P vendor |
| Headline limit | 220 (AuthoredUp, Pollen); LinkedIn silent | same | same | 3P vendor |
| WCAG SC 1.1.1 / 1.4.5 | Understanding pages, WCAG 2.2 | https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html ; .../images-of-text.html | "Updated 06 September 2026" (1.1.1) | Standards body |
| PDF/UA-1 | ISO 14289-1 published Jul 2012, 14289-1:2014 minor update Dec 2014; tagging, Figure alt text, language | https://www.loc.gov/preservation/digital/formats/fdd/fdd000350.shtml | Updated 2024-06-09 | Authority (Library of Congress) |
| Professional Community Policies | No link-specific policy; undisclosed personal-benefit endorsement barred unless "clear and conspicuous notice"; reciprocal-like agreements barred | https://www.linkedin.com/legal/professional-community-policies | No effective date on fetched text (footer 2026) | Platform |

## Decisions

### D1. Limits table for the skill's facts file

Use the Dated facts rows above that are tagged Platform; carry the source marker verbatim as `verified_on: 2026-11-27, source_age: "<N ago>"`. Use API figures only for agents that post through the API. Keep fold and comment/headline rows in a separate section labelled "third-party, unverified".

### D2. Fold budget, grade, and lines 1 to 3

Budget: 90 graphemes for the claim, 140 graphemes for lines 1 to 3, 2 lines for the claim, no blank line in the first 3 lines. Grade: derived, third-party, C minus. Rationale for conservatism: a failure costs the whole hook; a too-short hook costs little. The skill must say "re-measure in the live client" and expire the budget 180 days after `verified_on` (a recommendation; no source sets the interval).

### D3. MUST checks per attachment type

| Attachment | MUST |
|---|---|
| Image | Alt text present, written by the author, describing what the image proves; under 120 characters unless a chart or code needs more (API cap 4,086); size, count, aspect, pixel limits met; if the image shows text or code, the text is also in the post body or alt text. |
| Document | Title set (a517910); at most 100 MB and 300 pages; layers flattened; uniform page size; PDF tagged (reading order, Figure alt text, language set) OR the full text of every slide repeated in the post commentary or the first comment; because LinkedIn exposes no document alt field, repeating the text is the reliable path and tagging is the additional one. |
| Link post | Four og tags present on the target; og:image at least 1200x627, 1.91:1, at most 5 MB; preview checked in Post Inspector before posting; no image attached (link or image, not both). |
| Poll | Question at most 140, each option at most 30, 2 to 4 options (a 5th only if the author's client is iOS); final wording reviewed because it cannot be edited. |
| Video file | Within the video table; captions present or reviewed auto captions (delivery owned by vid-accessibility). |
| Text only | At most 3,000 under the larger of cp, UTF-16, grapheme counts; target at most 2,900; no Unicode "bold" letters. |

## Manual fold protocol (pending human run)

Status: **pending human run.** No LinkedIn page was loaded by any tool in this work. The human works in their own logged-in browser, does not use extensions, scripts or auto-scroll (UA 8.2), and uses a throwaway personal profile or posts set to "Connections only" then deletes them (visibility cannot be changed after posting, a523384 in the scout; verify before relying on it).

Setup: Chrome, zoom 100%, window width 1280 px (desktop run) then Chrome DevTools device toolbar at 360 px wide only as a viewport (this is the browser's own feature, not automation), plus one run on a real phone in the LinkedIn app. Language English. Record browser version, app version, date.

For each of the 10 posts, post privately (or preview if the composer previews), view in the feed as a reader (a second account), and record: the last visible word before "...see more", the number of rendered lines, and graphemes visible (count by pasting the visible text into `check.py`).

| # | Post | Purpose |
|---|---|---|
| 1 | 400 characters of single-line prose, no line breaks | Baseline character clamp |
| 2 | Same prose in 5 one-sentence lines, no blank lines | Line vs character clamp |
| 3 | Same prose, one blank line between every sentence | Blank-line cost |
| 4 | 30 short words per line, 3 lines, then long text | Line-clamp isolation |
| 5 | Line 1 is 40 emoji, then text | Emoji width and grapheme counting |
| 6 | Line 1 of Latin text, line 2 of CJK, then text | Width vs count |
| 7 | Text with a URL in line 1 (full URL, then shortened) | URL cost |
| 8 | Text only vs same text with a single image | Text-only vs media (Supergrow 5 vs 3 lines) |
| 9 | Same text with a document attached | Document vs image |
| 10 | F08 (3,000 code points ending in an astral emoji) | Which unit the 3,000 limit counts |

Repeat at 1280 px and 360 px. Pass: three or more runs of the same case give the same cut. Output: a table in this file's next revision, graded A (own measurement, dated, with browser and app versions). Until then the budget stays at grade C minus.

## Normative guidance candidates

IDs are provisional (`LI-LIM-*`); the consolidator assigns final IDs.

| ID | Rule | Rationale | Severity | Verification |
|---|---|---|---|---|
| LI-LIM-01 | Do not fetch, scrape, render, or script LinkedIn pages that show member content; read only Help and Legal pages. Do not recommend extensions that modify linkedin.com. | UA 8.2 items 2, 13, 15; account restriction (a1341387). | MUST | `grep -rEi "playwright|puppeteer|selenium|linkedin\.com/(feed|in/|posts)" <agent scripts>` finds no fetch of member content; review any browser-extension recommendation against UA 8.2 item 15. |
| LI-LIM-02 | Keep the post body at or below 2,900 under the larger of code points, UTF-16 units and graphemes; never exceed 3,000. | Hard limit 3,000 (a528176); the enforcing unit is unmeasured. | MUST | `python3 -I check.py` column `>3000(gr)`/`>3000(u16)` false and `max(cp,u16,graph) <= 2900`. |
| LI-LIM-03 | The first line is a complete sentence that names the tool or subject and one concrete specific, in at most 90 graphemes. | Fold budget, derived third-party grade C minus. | MUST | `hook_gr <= 90` in the check; named heuristic "cover test": hide everything after line 1; pass "Cut our CI cache restore from 41s to 6s." fail "Big news in CI land. 🚀". |
| LI-LIM-04 | Lines 1 to 3 total at most 140 graphemes and contain no blank line. | Blank lines count as lines (3P rows 2, 3, 7); mobile minimum. | SHOULD | `first3_gr <= 140` and `blank3 == 0` (fixture F04, F13 fail the spirit; F13 fails the blank check). |
| LI-LIM-05 | Put a relationship disclosure ("I maintain X", "my employer ships X") inside lines 1 to 3 when the author makes, sells, or is paid for the tool. | A disclosure behind the fold is invisible; policy basis a "clear and conspicuous notice" (Professional Community Policies); whether and how is not this file's call. | MUST | Reading heuristic: the first three lines, read alone, name the author's tie; pass F11 "Disclosure: I maintain this tool." fail disclosure only in the last line. |
| LI-LIM-06 | Do not put a URL in lines 1 to 3. | Spends fold budget (F06: URL pushes hook to 123 graphemes). | SHOULD | Regex on the first three lines: `https?://` has no match. |
| LI-LIM-07 | Do not style text with Unicode mathematical letters or emoji strings in the hook. | Inflates UTF-16 length (F05 145 vs 80), harms screen readers. | SHOULD | `python3 -I -c` check: any char in U+1D400-U+1D7FF in the post body fails. |
| LI-LIM-08 | A post carries a link or an image, never both; use a document, video or poll for rich media and put the link in a different place. | "either a URL link or an image... not both" (a527229). | MUST | Draft has `link_in_body` true and an image attachment: fail. |
| LI-LIM-09 | Every image has author-written alt text that states what the image proves, under 120 characters unless a chart needs more, never above 4,086. | Auto alt text is LinkedIn's guess (a519856); WCAG 1.1.1; API limit. | MUST | Alt present, not a filename, not "image" or "screenshot"; length check; heuristic: pass "Terminal: grim install pins 3 skills, exit 0" fail "screenshot.png". |
| LI-LIM-10 | If an image contains code or text, put the same text in the post body or alt text. | WCAG 1.4.5, 1.1.1; LinkedIn has no customizable text rendering. | SHOULD | Compare OCR-free: the draft has a `code_text` field equal to the image's text. |
| LI-LIM-11 | Set a document title and meet size, page, layer and page-size limits; do not exceed 100 MB or 300 pages. | a518909, a517910, a564109. | MUST | `title` non-empty; file size; page count; one distinct MediaBox size (any PDF tool, e.g. `qpdf --show-npages`). |
| LI-LIM-12 | A PDF document post either is a tagged PDF with Figure alt text and language, or repeats every slide's text in the commentary. Never rely on the PDF alone. | No document alt field exists in the UI or Documents API; the feed shows page images. | MUST | PDF tag check (any PDF/UA validator, for example veraPDF with the PDF/UA profile, tool not run here) or commentary contains each slide's heading and number; fixture F18 fails. |
| LI-LIM-13 | A link post's target page has og:title, og:image, og:description, og:url, an image of at least 1200x627, 1.91:1, at most 5 MB; run Post Inspector before posting. | a521928, a6233775. | MUST | `curl -s <url> | grep -oE 'property=.og:(title|image|description|url).'` returns four tags; image check; Post Inspector shows the expected card. |
| LI-LIM-14 | After changing a page's OG tags, refresh in Post Inspector and post only afterwards; existing posts keep old previews. | a6233775. | SHOULD | Dated note in the plan: Post Inspector run time precedes the post time. |
| LI-LIM-15 | Polls obey 140/30 characters and 2 to 4 options, and their wording is reviewed before creation. | a527270; no edit afterwards. | MUST | `attach()` poll check. |
| LI-LIM-16 | Video files meet the dated table; captions are present (delivery rules in vid-accessibility). | a7174587. | SHOULD | `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate <file>` against the table. |
| LI-LIM-17 | Every limit in a skill's facts file carries `verified_on` and the source's own age marker; the fold budget is labelled "derived, third-party" with a re-measure date. | Help pages carry only relative markers; 3P figures decay. | MUST | `grep -L "verified_on" facts.md` empty; CI fails when `verified_on` older than 180 days (interval is a recommendation). |
| LI-LIM-18 | Count a hook in graphemes, not UTF-16 units or `len()` in JavaScript. | F03: 98 vs 74. | SHOULD | The check script, or `Intl.Segmenter` in JavaScript (not run here). |

## What an agent must not decide alone

| Decision | Why | Ask |
|---|---|---|
| Whether the author must disclose a tie to the tool, and the wording | Legal and brand, depends on employment, equity, sponsorship | "Does the author have a financial or employment tie to this tool? Which line?" |
| Whether a screenshot or PDF must meet WCAG or PDF/UA for the organisation | Accessibility law (for example EU accessibility rules) applicability is legal; not researched here | "Is a conformance claim required?" |
| Whether to run the manual fold protocol on a real profile | Account risk; terms | Human runs it with a throwaway or private-visibility post |
| Whether to use a third-party scheduler, preview extension or browser tool | UA 8.2 risk to the owner's account | Owner approves tool by tool |
| Whether a number in a post (benchmark, percentage) is publishable | Truth and brand | Brief must give the source |
| Posting at all, and under which profile (person vs company) | Brand and people decision | Owner |

## AI-agent angle

| Typical mistake | Cheapest check |
|---|---|
| Quoting "210 characters desktop / 140 mobile" as a LinkedIn rule | A fact row without a `3P` label fails the facts-file lint (LI-LIM-17). |
| Counting length with `len(s)` or JavaScript `.length` on emoji hooks | LI-LIM-18; run `check.py` on the draft. |
| Writing a 1,300-character limit from older training data (AuthoredUp states the limit rose from 1,300 to 3,000 in June 2023, a 3P statement) | Compare with a528176. |
| Adding the link and an image to one post | LI-LIM-08 draft check. |
| Alt text left empty because "LinkedIn adds it automatically" | LI-LIM-09; auto alt text is a LinkedIn guess (a519856). |
| Treating the PDF carousel as accessible because it is a PDF | LI-LIM-12; no document alt field. |
| One-sentence-per-line "LinkedIn style" with blank lines between | LI-LIM-04, F04, F13. |
| Fetching a post with a scraper to "check how it looks" | LI-LIM-01. |
| Post body containing `(`, `)`, `[`, `]`, `#` or `@` through the Posts API (commentary uses the "little" text format, mentions look like `@[Name](urn:li:organization:123)`) | Not tested here; read [little-text-format](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format) before API posting. This format page was not fetched in this work. |

## Contested / evolving

| Question | Position A | Position B | Status as of 2026-11-27 |
|---|---|---|---|
| Fold unit: characters or lines | Character budget 210 / 140 (AuthoredUp, TickTrack, OneStopLinkedIn, Eden) | Line clamp, text-only desktop 5 lines, mobile 2 lines (Supergrow); ~3 lines with blank lines costing (Post Formatter, Ordinal) | Unresolved; budget uses the minimum of both. |
| Desktop value | ~210 (most) | ~250 (Pollen), ~480 text-only (Supergrow) | Unresolved. |
| Mobile value | ~140 (most) | ~210 (Pollen), 90 to 140 (Supergrow) | Unresolved. |
| Emoji counting | One character each (Eden: "one keystroke, one character") | Composite emoji count as two or more (Ordinal) | Unmeasured; F08 and the protocol decide. |
| GIF frame cap | 500 frames (Help a564109) | 250 frames (Images API) | LinkedIn's own sources disagree. |
| Whether any of this stays stable | Limits were stable since 3,000-char change in 2023 per AuthoredUp (3P) | LinkedIn "tests variations" (Post Formatter, 3P) | Treat as changing; re-measure. |

Trend: LinkedIn has moved to explicit creator guidance pages (members.linkedin.com) but still publishes no fold; vendors keep selling previews built on it. A reliable number can come only from LinkedIn or from a dated, method-disclosed measurement; the manual protocol is the route.

## Sources

| URL | What | Date or era | Why worth reading |
|---|---|---|---|
| https://www.linkedin.com/legal/user-agreement | User Agreement, section 8.2 | Effective 3 Nov 2025 | Terms verdict (primary) |
| https://www.linkedin.com/help/linkedin/answer/a1341387 | Prohibited software and extensions | 2 years ago | Penalty for tools (primary) |
| https://www.linkedin.com/legal/professional-community-policies | Professional Community Policies | No date on text | Disclosure and manipulation clauses (primary) |
| https://www.linkedin.com/help/linkedin/answer/a528176 | Post and share updates | 2 months ago | 3,000 limit (primary) |
| https://www.linkedin.com/help/linkedin/answer/a518996 | Get started with posting | 1 month ago | Silent on fold (primary) |
| https://www.linkedin.com/help/linkedin/answer/a525301 | Share articles or links | 2 years ago | Link post (primary) |
| https://www.linkedin.com/help/linkedin/answer/a521928 | Make your website shareable | 3 years ago | OG tags (primary) |
| https://www.linkedin.com/help/linkedin/answer/a6233775 | Use Post Inspector to refresh URL | 3 years ago | Preview refresh (primary) |
| https://www.linkedin.com/help/linkedin/answer/a527229 | Share photos | 1 day ago | Image limits (primary) |
| https://www.linkedin.com/help/linkedin/answer/a564109 | Media file types | 2 months ago | Formats, 36 MP (primary) |
| https://www.linkedin.com/help/linkedin/answer/a518909 | Upload and share documents | 3 years ago | Document limits (primary) |
| https://www.linkedin.com/help/linkedin/answer/a517910 | Add a title to uploaded documents | 3 years ago | Document title (primary) |
| https://www.linkedin.com/help/linkedin/answer/a527270 | LinkedIn Polls FAQ | 1 year ago | Poll limits (primary) |
| https://www.linkedin.com/help/linkedin/answer/a7174587 | Share videos | 2 years ago | Video file limits (primary) |
| https://www.linkedin.com/help/linkedin/answer/a1327025 | Auto captions for videos | 2 years ago | Captions (primary) |
| https://www.linkedin.com/help/linkedin/answer/a519856 | Add alternative text to images | 3 years ago | Alt text (primary) |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api | Images API | 2026-06-19 | altText 4,086 / 120 (primary) |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api | Documents API | 2026-06-19 | No alt field (primary) |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | Posts API | 2026-05-07 | Article posts, mentions (primary) |
| https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html | WCAG 2.2 SC 1.1.1 Understanding | Updated 06 Sep 2026 | Alt text standard (STD) |
| https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html | WCAG 2.2 SC 1.4.5 Understanding | WCAG 2.2 | Images of text (STD) |
| https://www.loc.gov/preservation/digital/formats/fdd/fdd000350.shtml | PDF/UA-1 format description | Updated 2024-06-09 | Tagged PDF requirements (authority) |
| https://authoredup.com/blog/linkedin-character-limit | AuthoredUp limits | 2 Apr 2026, upd. 5 Nov 2026 | Fold figure origin (3P vendor) |
| https://postformatter.com/blog/linkedin-see-more-cutoff/ | Post Formatter cutoff | 29 Jul 2026 | Claims own measurement (3P vendor) |
| https://www.ticktrack.in/guides/linkedin-character-limits | TickTrack | Upd. 30 Oct 2026 | Line-based note (3P) |
| https://www.onestoplinkedin.com/blog/linkedin-character-limits-guide-2026 | OneStopLinkedIn | 21 Jul 2026 | Agreement (3P) |
| https://eden.so/blog/linkedin-character-limits/ | Eden | 21 Aug 2026 | Counting claims (3P) |
| https://www.justpollen.com/blog/linkedin-character-limit | Pollen | 12 Mar 2026 | Outlier values (3P) |
| https://www.supergrow.ai/tools/linkedin-post-preview | Supergrow preview | 2026, undated | Line-clamp claim (3P) |
| https://www.tryordinal.com/blog/linkedin-post-character-limit | Ordinal | Undated, 2026 | Emoji and blank-line notes (3P) |

Not read: Medium fold article (HTTP 403), pdfa.org PDF/UA pages (403), Hootsuite and Sprout limit pages (404), linkedin.com/post-inspector tool page (title only). 8 of 31 fetched sources are 3P vendors; 21 are primary or standards.

## Appendix: check script

`check.py`, run as `python3 -I check.py fixtures.json`. Fixtures F01 to F20 are inline drafts built in the session (developer-tool hooks, emoji-heavy, short-line, 3,000-boundary, and attachment-fault cases F16 to F20).

```python
import sys, json, unicodedata
FOLD_CHARS_MOBILE=140; FOLD_CHARS_DESKTOP=210; FOLD_LINES=3; MAX=3000
def graphemes(s):
    """approx extended grapheme clusters (stdlib only)"""
    out=[];i=0;n=len(s)
    def ri(c): return 0x1F1E6<=ord(c)<=0x1F1FF
    def ext(c): o=ord(c); return unicodedata.category(c) in('Mn','Me','Mc') or 0x1F3FB<=o<=0x1F3FF or o in(0xFE0F,0x20E3) or 0xE0020<=o<=0xE007F
    while i<n:
        j=i+1
        if ri(s[i]) and j<n and ri(s[j]): j+=1
        while j<n:
            if ext(s[j]): j+=1
            elif s[j]=='‍' and j+1<n: j+=2
            else: break
        out.append(s[i:j]); i=j
    return out
def utf16(s): return len(s.encode('utf-16-le'))//2
def fold(text):
    lines=text.split('\n'); first=lines[:FOLD_LINES]; vis='\n'.join(first)
    g=len(graphemes(text))
    return dict(cp=len(text),u16=utf16(text),gr=g,first3_gr=len(graphemes(vis)),
      blank_in_first3=sum(1 for l in first if not l.strip()),hook_gr=len(graphemes(lines[0])),
      hook_ok_mobile=len(graphemes(lines[0]))<=FOLD_CHARS_MOBILE,
      over_limit=g>MAX, over_limit_u16=utf16(text)>MAX, link_in_body='http' in text)
def attach(a):
    k=a['kind'];e=[]
    if k=='image':
        w,h,mb=a['w'],a['h'],a['mb']
        if w<552 or h<276:e.append('min 552x276')
        if mb>5:e.append('>5MB')
        if not (4/5<=w/h<=3):e.append('aspect outside 4:5..3:1')
        if w*h>=36152320:e.append('>=36,152,320 px')
        if not a.get('alt'):e.append('alt missing')
        elif len(a['alt'])>4086:e.append('alt >4086')
        elif len(a['alt'])>=120:e.append('alt >=120 (recommended <120)')
    if k=='document':
        if a['mb']>100:e.append('>100MB')
        if a['pages']>300:e.append('>300 pages')
        if a['ext'] not in('pdf','ppt','pptx','doc','docx'):e.append('type')
        if not a.get('title'):e.append('title missing')
        if not a.get('tagged') and not a.get('text_repeated'):e.append('untagged and text not repeated in post')
        if not a.get('uniform'):e.append('mixed page sizes')
    if k=='linkcard':
        if a['w']<1200 or a['h']<627:e.append('og:image <1200x627')
        if a['mb']>5:e.append('>5MB')
        if abs(a['w']/a['h']-1.91)>0.05:e.append('ratio != 1.91')
        for t in('og:title','og:image','og:description','og:url'):
            if t not in a['og']:e.append('missing '+t)
    if k=='poll':
        if len(a['q'])>140:e.append('q>140')
        if not 2<=len(a['opts'])<=4:e.append('opts not 2..4 (5 iOS only)')
        if any(len(o)>30 for o in a['opts']):e.append('opt>30')
    if k=='video':
        if a['sec']>900 or a['sec']<3:e.append('duration 3s..15min')
        if a['mb']>5120:e.append('>5GB')
        if not a.get('captions'):e.append('captions missing')
    return e
```

(The `__main__` block prints one pipe-separated row per fixture with the columns shown in the output above.)

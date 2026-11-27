---
title: YouTube upload-metadata contract (fields, limits, defaults, gates) for a small developer-tool channel
program: product
sub_program: channels
topic: channel-youtube
worker: yt-upload-metadata-contract
date_researched: 2026-11-27
model: sonnet
sources_fetched: 57
scope: Every field and channel default an upload sets (title, description, tags, hashtags, chapters, thumbnails, audience, language, captions, auto-dubbing, AI disclosure, end screens, cards, channel profile, upload defaults, feature gates) and the Data API path that sets them. Measures chapter validity on the 450 audited videos and the two ocx videos. Not covered - which formats to publish, measurement and A/B testing, content policy; those belong to sibling workers (yt-format-portfolio, yt-measurement-and-testing, yt-content-policy-and-series-risk).
---

# YouTube upload-metadata contract

Method note. 26 YouTube Help, Google Search, Data API and Terms pages were opened with WebFetch on 2026-11-27, plus 31 public channel RSS feeds (30 audited channels plus the ocx channel). The page text came through a small extraction model, so every quote below is the extractor's quote of the page, not a byte-exact copy. Two Help URLs returned 404 (answer 9890843, 6172584) and are not used. Almost every YouTube Help page states no publication date: its only date is the footer "(c) 2026 Google". The Dated facts table says "undated (footer 2026)" rather than inventing one. Search snippets were used only to find URLs.

## Table of contents

1. Summary
2. Findings
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Channel-defaults checklist for the ocx channel
9. Measurements and commands
10. Sources

## Summary

- Title: at most 100 characters; `<` and `>` are invalid (Help 57407; API `snippet.title`). Measured: 0 of 450 audited titles exceed 100; the longest is exactly 100.
- Description: the Help page says 5,000 characters; the API reference says 5,000 bytes. Treat 5,000 UTF-8 bytes as the binding limit for anything set through the API. Measured: longest of 450 is 4,529 characters; 234 of 450 contain non-ASCII, so bytes exceed characters often.
- Description shows only its first few lines before "more"; put the one destination link there. The page gives no line or character count for the fold.
- Tags: Help calls them "minimal role"; the API caps the list at 500 characters, commas count, and a tag containing a space counts as if quote-wrapped. Use tags only for common misspellings and name variants.
- Hashtags: more than 60 on one video and all are ignored; at most three show by the title; no spaces. Measured: 45 of 450 audited videos carry more than 3; none carry more than 60.
- Chapters: first stamp `00:00`, at least three stamps in ascending order, each chapter at least 10 seconds. Measured: of 114 videos with timestamp lines, 104 satisfy the rules and 10 fail (8 do not start at 0:00).
- Thumbnails: JPG or PNG, 3840x2160 recommended for video (min width 640), 2160x3840 for Shorts (min height 640), 50 MB on desktop. API `thumbnails.set` limit rose from 2 MB to 50 MB on 2026-09-14 and takes Shorts from 2026-11-03.
- Audience (made for kids) must be set for every video; the API field is `status.selfDeclaredMadeForKids`. A wrong value is an FTC exposure per YouTube.
- Auto-dubbing is on by default for eligible channels, dubs cannot be edited, and jargon and proper nouns translate badly. Use "Publish manually" and set the original language.
- End screens: at least 25 s video, last 5-20 s, up to four elements on 16:9, unavailable on made-for-kids. Cards: up to five. Link elements and link cards need YouTube Partner Program membership.
- Feature gates: custom thumbnails need phone verification (Intermediate); clickable links in descriptions, A/B testing, chapters and multi-language features sit in the Advanced group (column placement flagged ambiguous, see Contested).
- Since 2026-11-02 a `videos.insert` from an unverified API project is no longer forced private and defaults to public; an agent must send `privacyStatus` explicitly.
- Quota: `videos.list` 1 unit, `videos.insert` 1 unit in its own bucket (100 per day), `videos.update`, `thumbnails.set`, `channels.update`, `captions.list` 50 each, default 10,000 per day.
- The ocx channel (two Shorts, 2026-11-17) has a 683-character description on each video with the install link on line 2, no chapters (Shorts), and, per the prior posture audit, an empty channel description and zero inbound links from 17 repositories.
- YouTube Terms bar automated access "such as robots, botnets or scrapers" except search engines per robots.txt or with written permission. Agents read via the Data API or the channel RSS feed, never by fetching watch pages.

## Findings

### 1. Title and description

The upload page states "Video titles have a character limit of 100 characters" and "Video descriptions have a character limit of 5,000 characters" ([Help 57407](https://support.google.com/youtube/answer/57407), undated, footer 2026; platform). The description tips page repeats "maximum of 5000 characters", says viewers see the first few lines before "Show more", each video needs a unique description, and bullet lists start with `*`, `+` or `-` plus a space ([Help 12948449](https://support.google.com/youtube/answer/12948449), undated, platform). The API reference says `snippet.title` has "a maximum length of 100 characters" and `snippet.description` "a maximum length of 5000 bytes", both excluding `<` and `>` ([videos resource](https://developers.google.com/youtube/v3/docs/videos), platform). Scout claim "5,000 characters or bytes" reproduces as a real unit discrepancy between two platform pages, not an extraction error. No source states the visible fold length; the scout flagged this gap and it stays open.

Correct and incorrect, API path:

```text
description: 4,900 ASCII characters            -> 4,900 bytes, accepted
description: 2,600 characters, 2,500 of them
             curly quotes or CJK (3 bytes each) -> ~7,500 bytes, rejected by the API
             even though the Studio UI would count 2,600 characters
```

(The 3-byte figure is UTF-8 arithmetic, not a platform statement. The rejection is inferred from the documented unit, not observed; no upload was made.)

### 2. Tags and hashtags

Tags "play a minimal role"; they matter mainly when the subject is commonly misspelled, and "excessive tags" in the description violate the spam policy ([Help 146402](https://support.google.com/youtube/answer/146402), undated, platform). The API caps `snippet.tags[]` at 500 characters in total, commas count, and a tag with a space is counted as if wrapped in quotation marks, so `Foo-Baz` is 7 and `Foo Baz` is 9 ([videos resource](https://developers.google.com/youtube/v3/docs/videos)).

Hashtags: "up to three hashtags that are considered most engaging will appear by your video title"; "If a video or playlist has more than 60 hashtags, we'll ignore each hashtag on that content"; "Hashtags don't contain any spaces"; "ordinary descriptive tags or repetitive sentences in the description is (still) prohibited"; unrelated hashtags may lead to removal ([Help 6390658](https://support.google.com/youtube/answer/6390658), undated, platform). Scout claim "more than 60 ignores all" reproduces. The page does not say which three are chosen.

### 3. Chapters

"Make sure that the first timestamp you list starts with 00:00"; "at least three timestamps listed in ascending order"; "The minimum length for video chapters is 10 seconds"; manual chapters "override automatic video chapters"; automatic chapters are on by default for new uploads and unavailable on channels with active strikes ([Help 9884579](https://support.google.com/youtube/answer/9884579), undated, platform). Google Search "prioritizes key moments you set yourself" and accepts "exact timestamps and labels in the video description on YouTube" ([Search video docs](https://developers.google.com/search/docs/appearance/video), undated, platform). Scout claim reproduces. The Help page defines no timestamp grammar beyond the `00:00` example and the API reference only says chapters come from "timestamps such as `00:00`". Whether `0:00` (one digit) qualifies is not stated; 104 audited videos with one-digit or two-digit forms are not distinguishable from the feed alone. The linter should require the two-digit form `00:00` for the first stamp, which is the form every source writes.

Chapters apply to long-form; the Shorts help page does not mention them.

### 4. Thumbnails

"Be uploaded in image formats such as JPG or PNG"; "resolution of 3840 x 2160 pixels for videos and 2160 x 3840 for Shorts"; "minimum width of 640 pixels for videos and a minimum height of 640 pixels for Shorts"; aspect 16:9 for videos and 9:16 for Shorts; "50 MB for video, Shorts, and podcast thumbnails" on desktop; vertical videos with a 16:9 thumbnail get an auto-generated 4:5 thumbnail on home, explore and subscriptions; custom thumbnails need a verified account; a daily custom-thumbnail limit exists and strikes reduce it ([Help 72431](https://support.google.com/youtube/answer/72431), undated, platform). The scout's "640 px high minimum" for Shorts reproduces; its "1280x720 for tests" belongs to Help 13861714, which this worker did not fetch, and is flagged not reproduced here (owned by yt-measurement-and-testing).

API: `thumbnails.set` "Uploads a custom video thumbnail to YouTube and sets it for a video, including YouTube Shorts", accepts `image/jpeg`, `image/png`, `application/octet-stream`, max 50 MB, about 50 quota units, and for Shorts only "when processingDetails.processingStatus is succeeded" ([thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set), platform). The revision history dates the changes: 2026-09-14 "maximum file size for uploaded thumbnails has increased from 2MB to 50MB"; 2026-11-03 `thumbnails.set` "supports uploading custom thumbnails for YouTube Shorts after video processing is complete" and the `thumbnails` resource gains `shortsAspectRatio` ([revision history](https://developers.google.com/youtube/v3/revision_history), platform). Scout claim "Shorts custom thumbnails reach the API from 2026-11-03" reproduces. Any rule or tool written before 2026-11-03 that says "Shorts thumbnails are not settable via API" is stale.

### 5. Audience: made for kids

"As a YouTube creator, you are required to set future and existing videos as made for kids or not." The channel setting applies to existing and future videos; "Settings for individual videos will override the channel setting"; a wrong setting risks "compliance issues with the FTC"; YouTube may override "in cases of error or abuse"; made-for-kids videos lose comments, cards, end screens, notification bell and more; the page cites COPPA and a settlement with the FTC and NY Attorney General ([Help 9527654](https://support.google.com/youtube/answer/9527654), undated, platform). API: `status.selfDeclaredMadeForKids` is a boolean settable on `videos.insert` and `videos.update`, and returned by `videos.list` only to the authorised owner ([videos resource](https://developers.google.com/youtube/v3/docs/videos)). Revision 2026-10-15: `selfDeclaredMadeForKids` and `madeForKids` are "only updated if specified in the request and are not overridden if omitted" ([revision history](https://developers.google.com/youtube/v3/revision_history)). Implication: a `videos.update` that omits the field leaves it unchanged, so an agent must read it back after upload, not assume.

### 6. Language, captions, auto-dubbing

`snippet.defaultLanguage` is the language of the title and description; `snippet.defaultAudioLanguage` is the language spoken in the default audio track ([videos resource](https://developers.google.com/youtube/v3/docs/videos)). Automatic captions "may not be ready at the time that you upload"; they are not produced when the audio is complex, the language is unsupported, or "The video is too long"; with several audio tracks they follow the default language ([Help 6373554](https://support.google.com/youtube/answer/6373554), undated, platform). The captions page does not describe a channel default language.

Auto-dubbing: "enabled by default for eligible creators"; can be switched off in Studio under Settings, Automatic dubbing; "Publish manually" lets the creator review dubs first; ineligible when video exceeds 120 minutes, has little speech, unsupported language, fast speech or copyrighted content; "If your video's default language is set incorrectly, its automatic dubs may be mistranslated"; "You cannot edit automatic dubs"; "We may also have challenges translating proper nouns, idioms, and jargon" ([Help 15569972](https://support.google.com/youtube/answer/15569972), undated, platform). For a CLI tool, command names, flags and the product name are exactly the content that translates badly.

### 7. AI-use disclosure

Realistic altered or synthetic content must be disclosed in Studio ("AI use", Attributes section, Yes or No); not required for non-realistic content, "primarily aesthetic" edits, or AI used for scripts, titles or thumbnails ([Help 14328491](https://support.google.com/youtube/answer/14328491), undated, platform). The API field `status.containsSyntheticMedia` exists on `videos.insert` and `videos.update` ([videos resource](https://developers.google.com/youtube/v3/docs/videos)); the Help page itself mentions no API field. A synthetic voice-over reading a script is not on the page's disclose list; a cloned real person's voice or a generated realistic scene is. Decision stays with a human (section 5).

### 8. End screens and cards

End screens: last "5-20 seconds", video "at least 25 seconds long", up to four elements on 16:9, element types video or playlist, subscribe, channel, link; link elements need YouTube Partner Program membership; unavailable on made-for-kids videos; viewers can hide them ([Help 6388789](https://support.google.com/youtube/answer/6388789), undated, platform). Cards: "up to 5 cards to one video"; video, playlist, channel and link types; link cards need the Partner Program; not on made-for-kids; computer-only for viewers ([Help 6140493](https://support.google.com/youtube/answer/6140493), undated, platform). A small channel without the Partner Program can still use video, playlist and subscribe end-screen elements. Shorts are mostly under the 25 s floor or short enough that end screens are moot; the Help pages do not say whether Shorts take end screens, so no rule is written for them.

### 9. Channel profile and upload defaults

The channel Home tab shows "up to 14 links", the first near the subscribe button; handle and name each change at most twice per 14 days (a name change removes a verification badge); contact email lives under Customization, Profile; no maximum description length is stated ([Help 2657964](https://support.google.com/youtube/answer/2657964), undated, platform). A 1,000-character channel description limit appears only in a third-party guide (search result for dummies.com, not fetched) and is unverified. `channels.update` accepts `brandingSettings.channel.description`, `.keywords`, `.defaultLanguage`, `.country`; updates only one of `brandingSettings`, `invideoPromotion`, `localizations` per call; an omitted property is cleared; costs 50 units ([channels.update](https://developers.google.com/youtube/v3/docs/channels/update), platform). Revision history records a 500-character limit for channel keywords (2020-10-08 entry as relayed by the extractor, not re-read in the raw page). The Help pages describe no field for channel links in the API: `channels.update` documents none, so links are a manual Studio step.

Upload defaults (Studio, Settings, Upload defaults) cover privacy, category, title, tags, language and more, but "Default upload settings only affect videos uploaded through your browser on youtube.com/upload"; mobile and video-editor uploads ignore them; the page does not say whether API uploads honour them; made-for-kids is set separately ([Help 2660027](https://support.google.com/youtube/answer/2660027), undated, platform). Consequence: an agent uploading through the API must send every field explicitly and cannot rely on channel defaults.

Default privacy: creators 13-17 default private, 18 and over default public ([Help 57407](https://support.google.com/youtube/answer/57407)). API: `status.privacyStatus` "If omitted in `videos.insert`, it defaults to `public`" ([videos resource](https://developers.google.com/youtube/v3/docs/videos)); since 2026-11-02 videos from unverified API projects "are no longer restricted to private viewing mode" and default to public, "Some uploads may default to private based on account settings" ([revision history](https://developers.google.com/youtube/v3/revision_history)). This reverses the 2020-07-28 lock. Before 2026-11-02 an agent got a locked-private video; now it gets a public one. Scout claim "API default privacy changed" reproduces.

### 10. Feature gates

Standard tier (no verification): upload videos and Shorts with a limited daily limit. Intermediate (verify a phone number): videos over 15 minutes, live streaming on a computer, custom thumbnails (daily limit), podcast. Advanced (channel history or ID or video verification): clickable links in long-form descriptions and posts, clickable links on channel details, Add chapters, A/B testing, multi-language features, pinning comments, Related Video on a Short, embedding live streams. Check in Studio: Settings, Channel, Feature eligibility; enabled features show "Enabled" ([Help 9890437](https://support.google.com/youtube/answer/9890437), undated, platform). The extractor warned the flattened table loses column positions, so tier assignment above comes from the group headings. Verification path: [Help 9891124](https://support.google.com/youtube/answer/9891124) was found in search results but not fetched; the phone-verification steps are from a search summary only and marked so.

A silent failure follows: a URL in a description of a channel without the Advanced tier is plain text, not a link. The API reference says URLs become clickable "only if the channel meets platform requirements, such as verification or Advanced Features" ([videos resource](https://developers.google.com/youtube/v3/docs/videos)).

### 11. Access method and quota

The Terms say a user may not "access the Service using any automated means (such as robots, botnets or scrapers)" except "(a) in the case of public search engines, in accordance with YouTube's robots.txt file" or "(b) with YouTube's prior written permission"; the English page is dated 15 December 2023 ([YouTube Terms](https://www.youtube.com/static?template=terms&gl=US&hl=en), platform). The Finnish rendering carries the date 5 January 2022 and the same clause ([YouTube Terms, fi](https://www.youtube.com/t/terms), platform), so the document version is ambiguous by locale; use the English date. The Data API is the sanctioned automated route. Quota costs ([quota page](https://developers.google.com/youtube/v3/determine_quota_cost), undated, platform): `videos.list` 1, `videos.insert` 1 in the Video Uploads bucket with 100 calls per day, `videos.update` 50, `thumbnails.set` 50, `channels.list` 1, `channels.update` 50, `captions.list` 50, default 10,000 units per day, reset at midnight Pacific. The revision history shows the quota model moved: 2025-12-04 upload cost documented as about 100 units instead of about 1,600; 2026-06-01 move to granular quotas with their own buckets. Quote costs with their date or refresh them; they changed twice in twelve months.

Tension to surface: the prior audit's Shorts probe (`curl https://www.youtube.com/shorts/<id>`, 450 requests, [exemplar-youtube-channels.md](../product-audit/exemplar-youtube-channels.md)) fetched watch URLs, which the Terms clause restricts. This commission forbids that, so this worker did not repeat it. No YouTube Data API key exists in this environment, so no `videos.list` call was made and zero quota was spent.

## Normative guidance candidates

Severity key: MUST = platform rejects or silently drops it, or legal exposure; SHOULD = documented best practice; CONSIDER = judgement. Each VERIFICATION is runnable against a metadata file (title, description, tags, chapters) before upload.

| # | Rule | Rationale | Sev | VERIFICATION |
|---|---|---|---|---|
| 1 | Keep every title at 100 characters or fewer and free of `<` and `>`. | Hard limit in Help 57407 and API `snippet.title`; the API rejects it. | MUST | `python3 -I -c "import sys;t=sys.argv[1];assert len(t)<=100 and '<' not in t and '>' not in t" "$TITLE"` |
| 2 | Keep every description at 5,000 UTF-8 bytes or fewer, and free of `<` and `>`. | API unit is bytes; Help says characters; bytes is the stricter. | MUST | `printf '%s' "$DESC" \| wc -c` is at most 5000 (`wc -c` counts bytes; `wc -m` counts characters); `grep -c '[<>]'` is 0 |
| 3 | Put the destination URL in the first three non-empty description lines. | Only the first few lines show before "more"; exemplar data: 76% of educator but 35% of company videos do (audit, measured). | SHOULD | `printf '%s' "$DESC" \| grep -v '^[[:space:]]*$' \| head -3 \| grep -c 'https\?://'` is at least 1 |
| 4 | Write a unique first paragraph per video; do not reuse the title as the description or repeat sentences. | Help 12948449 "unique description"; Help 6390658 prohibits "repetitive sentences". | SHOULD | `sort <(printf '%s\n' "$DESC" \| grep -v '^$') \| uniq -d` prints nothing; and the description differs from every earlier description (`diff`) in its first 200 characters |
| 5 | Use at most 3 hashtags per video, placed in the description's last line; never more than 60. | Only 3 show by the title; over 60 voids all; irrelevant hashtags risk removal. | MUST (cap 60), SHOULD (cap 3) | `printf '%s\n%s' "$TITLE" "$DESC" \| grep -oE '(^\|[^[:alnum:]#])#[[:alnum:]_]+' \| wc -l` is at most 3 |
| 6 | Set `tags` empty, or list only misspellings and name variants (for example `ocx`, `o c x`); keep the JSON list within 500 characters counting commas and quote-wrapping of tags with spaces. | Help calls tags "minimal role"; API cap 500. | SHOULD (use), MUST (cap) | `python3 -I -c "import json,sys;t=json.loads(sys.argv[1]);n=sum(len(x)+(2 if ' ' in x else 0) for x in t)+max(len(t)-1,0);assert n<=500"` |
| 7 | When adding chapters, make line 1 of the list exactly `00:00 <label>`, use at least three lines in ascending order, each gap at least 10 seconds. | Rules in Help 9884579; invalid lists silently do not render. | MUST (if any timestamp line is present) | Run `work/ytmeta.py` function `chap()` (appendix), expected `valid`; or: first match of `^[[:space:]]*(\[|\()?[0-9:]+` equals `00:00`, count of such lines at least 3, no non-increasing pair, no pair closer than 10 s |
| 8 | Add chapters to any long-form video of about ten minutes or more that has distinct sections; add none to a Shorts. | Chapters feed Google key moments; no measured view lift (measured 1.04, 11 of 20 channels), so the case is findability only. | SHOULD | Duration from `videos.list part=contentDetails` (1 unit) is 600 s or more and the description has a valid chapter list; Shorts duration at most 180 s has none |
| 9 | Make the last chapter at least 10 seconds before the video end. | The 10-second minimum applies to every chapter. | MUST | `last_stamp_seconds + 10 <= contentDetails.duration` |
| 10 | Upload thumbnails as JPG or PNG, at most 50 MB, 16:9 and at least 1280 px wide for long-form (3840x2160 target); 9:16 and at least 640 px high for Shorts (2160x3840 target). | Help 72431; a 16:9 thumbnail on a vertical video is replaced by an auto 4:5 one. The 1280 figure is a common floor, not stated on Help 72431 (min width 640 is stated); mark it SHOULD. | MUST (format, size, 640 floor), SHOULD (ratio, 1280) | `file -b --mime-type thumb.png` is `image/png` or `image/jpeg`; `stat -c %s` at most 52428800; `python3 -I -c "from PIL import Image;..."` width/height ratio within 1% of 16/9 or 9/16 |
| 11 | Call `thumbnails.set` for a Short only after `processingDetails.processingStatus` is `succeeded`, and only against a build of the client dated on or after 2026-11-03 behaviour. | API page requires it; support began 2026-11-03. | MUST | The upload script polls `videos.list part=processingDetails` (1 unit) before `thumbnails.set` (50 units); `grep -n processingStatus` in the script |
| 12 | Set `status.selfDeclaredMadeForKids` explicitly on every `videos.insert`; for a developer tool the expected value is `false`, set by a human decision once. | Required for every video; omission leaves the channel default; wrong value is an FTC exposure per YouTube. | MUST | Post-upload `videos.list part=status` (1 unit) returns `selfDeclaredMadeForKids: false`; request body contains the key (`jq 'has("status") and .status \| has("selfDeclaredMadeForKids")'`) |
| 13 | Set `snippet.defaultLanguage` and `snippet.defaultAudioLanguage` to the spoken and written language (for example `en`) on every upload. | Dubs and auto-captions follow them; wrong language yields mistranslated dubs (Help 15569972). | MUST | `videos.list part=snippet` returns both fields equal to the intended code |
| 14 | Set auto-dubbing to "Publish manually" or off for command-line content, and review any dub before publishing. | Dubs cannot be edited and jargon and proper nouns translate badly. | SHOULD | Studio, Settings, Automatic dubbing shows "Publish manually" or off (human check recorded in the channel checklist); not exposed in the API |
| 15 | Supply captions in the video language: upload a reviewed SRT or VTT, or confirm automatic captions exist and were read. | Automatic captions are skipped for long video, poor audio, unsupported language; accessibility duty (see ux sibling). | SHOULD | `captions.list part=snippet` (50 units) returns a track with `language` equal to `defaultAudioLanguage`; one reading pass of the track recorded |
| 16 | Send `status.privacyStatus` explicitly (`private` first, `public` after human approval). | Since 2026-11-02 an omitted value publishes publicly even from an unverified project. | MUST | The insert body contains `privacyStatus`; `grep -c '"privacyStatus": *"private"'` is 1 in the first call |
| 17 | Send `status.containsSyntheticMedia` as the human decided, never inferred by the agent. | Disclosure is a policy duty; the agent cannot judge realism. | MUST (ask) | Field present in the request; the decision is cited in the upload ticket |
| 18 | Before using a gated feature, check Studio Settings, Channel, Feature eligibility shows it "Enabled": custom thumbnails (Intermediate), clickable description links, chapters, A/B testing (Advanced group). | Gated features fail silently: links render as plain text; custom thumbnail upload is refused. | MUST (preflight) | Human-recorded screenshot or checklist line with date; link check: after upload open the public page through the API `videos.list` and compare - not possible in the API, so the check is the checklist |
| 19 | Use end-screen video, playlist and subscribe elements on long-form of 25 s or more, at most four, in the last 5-20 s; do not add end screens or cards to made-for-kids videos. | Help 6388789 and 6140493 limits; link elements and link cards need the Partner Program. | SHOULD | Count at most 4 end-screen and at most 5 card elements in the upload plan; `duration >= 25` |
| 20 | Never fetch youtube.com watch or shorts pages by script; read via the Data API (`videos.list`, 1 unit) or the channel RSS feed (`https://www.youtube.com/feeds/videos.xml?channel_id=<id>`, 15 newest videos). | YouTube Terms bar automated access except by permission or robots.txt. | MUST | `grep -rnE "youtube\.com/(watch\|shorts)" scripts/` outside link strings returns no `curl`, `requests.get` or `fetch` call |
| 21 | Record the quota cost of every API call in the run log and refuse a batch whose total exceeds 10% of the daily 10,000 units without approval. | Costs changed in 2025-12 and 2026-06; `thumbnails.set` and `videos.update` cost 50 each. | SHOULD | Run log lists method and units; sum at most 1,000 |
| 22 | Date every platform figure in the rule files with the page's own date, or "undated (footer 2026)" plus the fetch date. | Most Help pages carry no date; a reader cannot judge staleness otherwise. | SHOULD | `grep -L 'fetched 20' <fact file>` is empty |

## Dated facts

Source type key: P = platform or authority itself; I = independent study; V = vendor data. Help pages say "undated" when only the footer copyright "2026 Google" appears.

| Fact | Value | URL | Source date | Type |
|---|---|---|---|---|
| Title limit | 100 characters | https://support.google.com/youtube/answer/57407 | undated (footer 2026) | P |
| Description limit, Help | 5,000 characters | https://support.google.com/youtube/answer/57407 and /12948449 | undated | P |
| Description limit, API | 5000 bytes | https://developers.google.com/youtube/v3/docs/videos | undated | P |
| Tag list limit, API | 500 characters, commas count, spaced tag counted as quote-wrapped | https://developers.google.com/youtube/v3/docs/videos | undated | P |
| Hashtags shown by title | up to 3 | https://support.google.com/youtube/answer/6390658 | undated | P |
| Hashtag void threshold | more than 60 on a video or playlist, all ignored | https://support.google.com/youtube/answer/6390658 | undated | P |
| Chapter rules | first stamp 00:00, at least 3, ascending, each at least 10 s | https://support.google.com/youtube/answer/9884579 | undated | P |
| Auto chapters default | on for new uploads; unavailable with active strikes | https://support.google.com/youtube/answer/9884579 | undated | P |
| Thumbnail spec | JPG or PNG; 3840x2160 video, 2160x3840 Short; min width 640 (video), min height 640 (Short); 50 MB desktop | https://support.google.com/youtube/answer/72431 | undated | P |
| Thumbnail API size | 2 MB raised to 50 MB | https://developers.google.com/youtube/v3/revision_history | 2026-09-14 | P |
| Shorts thumbnails via API | supported after processing completes; `shortsAspectRatio` added | https://developers.google.com/youtube/v3/revision_history | 2026-11-03 | P |
| `thumbnails.set` cost and MIME | about 50 units; image/jpeg, image/png, application/octet-stream | https://developers.google.com/youtube/v3/docs/thumbnails/set | undated | P |
| Unverified API project privacy | no longer forced private; default public | https://developers.google.com/youtube/v3/revision_history | 2026-11-02 (reverses 2020-07-28) | P |
| `selfDeclaredMadeForKids` semantics | not overridden if omitted | https://developers.google.com/youtube/v3/revision_history | 2026-10-15 | P |
| `paidProductPlacementDetails.hasPaidProductPlacement` | no longer defaults to false | https://developers.google.com/youtube/v3/revision_history | 2026-11-16 | P |
| Public view counting | views count on play start for long-form, Live, Shorts | https://developers.google.com/youtube/v3/revision_history | 2026-08-27 | P |
| Co-views | included in public view counts from 2026-11-16 | https://developers.google.com/youtube/v3/revision_history | 2026-11-16 | P |
| Shorts length and resolution | up to 3 minutes; max 1080p | https://support.google.com/youtube/answer/10059070 | undated; mentions 2025-03-31 view change | P |
| Shorts view definition | starts to play or replay, no minimum watch time | https://support.google.com/youtube/answer/10059070 | 2025-03-31 | P |
| Made-for-kids requirement | every video must be set; channel default, per-video override | https://support.google.com/youtube/answer/9527654 | undated | P |
| Auto-dubbing | on by default for eligible; manual publish option; cannot edit; 120 min cap | https://support.google.com/youtube/answer/15569972 | undated | P |
| AI-use disclosure | required for realistic altered or synthetic content | https://support.google.com/youtube/answer/14328491 | undated | P |
| End screens | last 5-20 s; at least 25 s video; up to 4 elements on 16:9 | https://support.google.com/youtube/answer/6388789 | undated | P |
| Cards | up to 5 per video | https://support.google.com/youtube/answer/6140493 | undated | P |
| Channel links | up to 14 on Home tab | https://support.google.com/youtube/answer/2657964 | undated | P |
| Handle and name changes | twice per 14 days | https://support.google.com/youtube/answer/2657964 | undated | P |
| Upload defaults scope | web upload only; mobile and editor ignore; API not stated | https://support.google.com/youtube/answer/2660027 | undated | P |
| Feature tiers | custom thumbnails Intermediate; links in descriptions, chapters, A/B, multi-language in Advanced group | https://support.google.com/youtube/answer/9890437 | undated | P |
| Quota costs | videos.list 1; insert 1 (100/day); update 50; thumbnails.set 50; channels.update 50; captions.list 50; default 10,000/day | https://developers.google.com/youtube/v3/determine_quota_cost | undated | P |
| Upload cost changes | about 1,600 to about 100 units; granular buckets | https://developers.google.com/youtube/v3/revision_history | 2025-12-04; 2026-06-01 | P |
| Terms, automated access | prohibited except robots.txt search engines or written permission | https://www.youtube.com/static?template=terms&gl=US&hl=en | 2023-12-15 (fi version 2022-01-05) | P |
| Google video indexing | dedicated watch page; thumbnail min 60x30; description timestamps used for key moments | https://developers.google.com/search/docs/appearance/video | undated | P |
| Median description length | company 754, educator 631, oss 151 characters (prior audit, 450 videos) | product-audit/exemplar-youtube-channels.md | 2026-11-27 | I (this program's measurement) |

## What an agent must not decide alone

- The made-for-kids value. Brief Help 9527654 ties a wrong value to FTC exposure. Ask the owner once; record the answer in the channel checklist.
- AI-use disclosure (`containsSyntheticMedia`) for any video with a synthetic voice, a generated scene or a generated likeness. Ask.
- Whether a channel switches on or off auto-dubbing, and whether the product name or command names may be dubbed. Brand decision. Ask.
- Whether to publish (`private` to `public`), and any change of channel name or handle (limited to twice per 14 days; a name change removes a verification badge).
- Phone or ID verification for Intermediate or Advanced access: a person with the account must do it.
- Channel description wording, contact email, banner and the choice of the first-listed link. Brand and legal copy. Ask.
- Paid-promotion declarations (`paidProductPlacementDetails.hasPaidProductPlacement` no longer defaults to false since 2026-11-16): ask; marketing law belongs to the marketing sub-program.
- Requesting written permission from YouTube for any scraping. Not an agent act.

## AI-agent angle

| Typical agent mistake | Cause | Smallest mechanical check |
|---|---|---|
| Counts the description in characters, ships 7,500 bytes of curly-quote text | Help says characters; API says bytes | Rule 2: `wc -c` at most 5000 |
| Writes chapters starting at `0:00` or at the first topic, or only two stamps | Looks like a chapter list to a human, silently ignored | Rule 7: parser from the appendix |
| Pads description and tags with 30 keywords or a 70-hashtag list | Old SEO habit | Rules 5 and 6: count of `#` tokens; tag-length sum |
| Believes Shorts thumbnails cannot be set by API, or sets a 16:9 image on a Short | Pre-2026-11-03 knowledge | Rule 10 aspect check; rule 11 |
| Omits `privacyStatus`, expecting private | Pre-2026-11-02 behaviour for unverified projects | Rule 16: field present |
| Omits `selfDeclaredMadeForKids` and assumes `false` | Since 2026-10-15 an omitted value is not overridden; a channel default may apply | Rule 12: read-back |
| Relies on channel upload defaults when uploading through the API | Defaults apply to browser uploads only; API not stated | Rule 12-13: every field in the request |
| Links the channel from a description or uses the wrong handle | Handles invented; inventory missing | The channel-inventory sibling's inbound-link check |
| Pastes a bare URL and assumes it is clickable | Links need the Advanced tier | Rule 18 checklist line |
| Fetches `youtube.com/watch?v=` with curl to read the title | Convenient; prohibited by Terms | Rule 20 grep |
| Quotes the 1,600-unit upload cost or 2 MB thumbnail cap | Old figures | Rule 22: dated facts file |

## Contested / evolving

- 5,000 characters versus 5,000 bytes: two platform pages disagree on the unit. Resolution used here: bytes for API uploads. Evidence: [Help 57407](https://support.google.com/youtube/answer/57407) versus [API videos resource](https://developers.google.com/youtube/v3/docs/videos). Unresolved without an upload test; a test would cost one `videos.insert` unit and a real video.
- Chapters and Advanced tier: [Help 9890437](https://support.google.com/youtube/answer/9890437) lists "Add chapters" in the Advanced group, while [Help 9884579](https://support.google.com/youtube/answer/9884579) states no gate and 104 of 450 audited videos from channels of all sizes carry valid chapters. The extractor said column positions were lost. Treat "Advanced" as probable for manual chapters, unconfirmed; re-read the live Feature eligibility screen. The small-channel claim "chapters need Advanced" is not proven.
- Hashtag selection: Help says the three "considered most engaging" show; it does not say whether the first three typed show. Common advice "put the three you want first" is unsupported by the page.
- Whether tags still help: [Help 146402](https://support.google.com/youtube/answer/146402) says minimal role; third-party tools sell tag tuning. No independent study was fetched. Platform view wins for this rule set.
- Terms version: English page dated 2023-12-15, Finnish rendering dated 2022-01-05, same clause. Locale lag, not a contradiction of substance.
- Co-views and view counting changes (2026-08-27 and 2026-11-16) mean view counts before and after these dates are not comparable; the 29x gap in the topic question mixes feed snapshots from 2026-11-27 and is unaffected by the 2026-11-16 change only in direction, not magnitude (not tested).
- Upload defaults and the API: [Help 2660027](https://support.google.com/youtube/answer/2660027) is silent; direction unknown.

## Channel-defaults checklist for the ocx channel

Channel: `@ocx-sh`, id `UCKuRD68HkNpla-vY6-YBTHg`, two Shorts dated 2026-11-17 (feed, re-measured today), channel description empty and linked from 0 of 17 repositories (prior audit, [distribution-posture.md](../product-audit/distribution-posture.md) section 4; not re-measured, since reading the channel page needs `channels.list` and no API key was available). The channel inventory file named in the brief (`core-facts-and-channel-inventory`) is still a brief, not an artifact, so no inventory exists; the links below come from the posture audit. Each item is a one-time human step in Studio unless marked API.

| # | Item | Value or source | Gate |
|---|---|---|---|
| 1 | Channel description | Two plain sentences stating what ocx is and the install link; no stated length limit, so keep under 1,000 characters (third-party figure, unverified) | human copy |
| 2 | Links, first position | `https://ocx.sh` (website, org blog field per posture audit) | Advanced tier for clickable |
| 3 | Links, further | `https://github.com/ocx-sh/ocx` (repository), `https://discord.gg/mT2UCF8CVe` (Discord, 5 members, linked from `ocx-sh/ocx/README.md`), up to 14 allowed | same |
| 4 | Contact email | Channel contact email field; the org public email `contact@michael-herwig.de` is the personal one in the GitHub org, so a role address is a human decision | ask owner |
| 5 | Audience (made for kids) | Channel setting "No, set this channel as not made for kids" once approved | ask owner, rule 12 |
| 6 | Upload defaults | Visibility private; category Science and Technology or Education per owner; language `en`; license standard; description footer with install link and the three chosen hashtags; automatic chapters off or on per owner | Studio browser uploads only |
| 7 | Auto-dubbing | Settings, Automatic dubbing: "Publish manually" | rule 14 |
| 8 | Verification | Verify phone number (Intermediate: custom thumbnails, videos over 15 minutes); check Feature eligibility for Advanced (links, chapters, A/B) | human |
| 9 | Channel default language | `brandingSettings.channel.defaultLanguage` = `en` (API `channels.update`, 50 units, one part per call) or Studio | API or Studio |
| 10 | Keywords | At most 500 characters of channel keywords (2020 API note); `ocx`, `OCX package manager` | low value |
| 11 | Inbound links | Add `https://www.youtube.com/@ocx-sh` to the README and website team or footer pages; the inventory sibling owns the check | closes smell 4 |
| 12 | Second channel | None found for Grimoire: `@grimoire-rs` and `@grimoirers` return 404 (posture audit); do not link a handle that does not exist | inventory |
| 13 | The two live Shorts | Descriptions run 683 characters, install link on line 2, at most 3 hashtags, no chapters (Shorts); both titles within 100 characters. Set `defaultLanguage`, audience and a 9:16 thumbnail now that 2026-11-03 allows it | rules 1-5, 10, 12-13 |
| 14 | Re-check cadence | Re-read this file's Dated facts at the next catalog refresh; Help pages are undated so cadence is by fetch date | rule 22 |

## Measurements and commands

Working directory `~/.cache/research-lang/exemplars/product/yt-meta` (feeds and ids), script `yt-meta/work/ytmeta.py`. The earlier `scripts/yt_analyze.py` is not on disk; its code is in the audit appendix and the cached feeds are gone, so feeds were re-fetched.

```bash
# fetch: 31 public RSS feeds, no key, no watch page
while IFS=$'\t' read n id g; do curl -s -m 20 "https://www.youtube.com/feeds/videos.xml?channel_id=$id" -o feeds/$n.xml; done < ids.tsv
grep -c '<entry>' feeds/*.xml | awk -F: '{s+=$2} END{print s}'      # 452 = 450 audited + 2 ocx
cat feeds/*.xml | grep -o "<yt:videoId>[^<]*" | sort -u | wc -l       # 452
python3 -I work/ytmeta.py
```

No YouTube Data API call was made, so quota spent: 0 units (no key). Feeds return the 15 newest videos per channel, same-day snapshot 2026-11-27.

Rules applied by `chap()` (from Help 9884579): a line starts a stamp if it matches `^\s*[\(\[]?(?:H:)?M:SS`; valid = at least 3 stamps, first equals 0 seconds, strictly ascending, every consecutive gap 10 s or more. The last chapter's length needs video duration (`videos.list part=contentDetails`, 1 unit), which was not available, so rule 9 is unmeasured.

Results (450 audited videos, 210 company, 150 educator, 90 open-source):

| Measure | All 450 | Company 210 | Educator 150 | Open-source 90 |
|---|---|---|---|---|
| No timestamp lines | 336 | 144 | 103 | 89 |
| Valid chapter list | 104 | 63 | 40 | 1 |
| Invalid: first stamp not 00:00 | 8 | 3 | 5 | 0 |
| Invalid: not ascending | 1 | 0 | 1 | 0 |
| Invalid: fewer than 3 stamps | 1 | 0 | 1 | 0 |
| Invalid: a gap under 10 s | 0 | 0 | 0 | 0 |
| Titles over 100 characters | 0 | 0 | 0 | 0 |
| Longest title (characters) | 100 | 100 | 93 | 99 |
| Descriptions over 5,000 characters or bytes | 0 | 0 | 0 | 0 |
| Longest description (characters) | 4,529 | 3,704 | 4,529 | 2,389 |
| Videos with more than 3 hashtags | 45 | 32 | 11 | 2 |
| Videos with more than 60 hashtags | 0 | 0 | 0 | 0 |
| Descriptions with `<` or `>` | 0 | 0 | 0 | 0 |
| Empty descriptions | 34 | 21 | 0 | 13 |

Reading it. Of 114 videos that attempt timestamps, 91% (104) are valid and 9% (10) are not; the invalid ones are Deno x3, DreamsOfCode x2, LetsGetRusty x3 (first stamp not 0:00), TechWorldwithNana x1 (not ascending), NoBoilerplate x1 (two stamps). The prior audit's looser definition (at least 3 stamp lines, first `0:00`) gave 105 for the same corpus except ocx; strict gives 104, a 1-video difference caused by the ascending-order test. Chapter use is minority practice (104 of 450, 23%; 28% among long-form per the audit). 234 of 450 descriptions contain non-ASCII characters, but none approaches 5,000 bytes, so the byte-versus-character question is untested in practice here. Descriptions over 3 hashtags are common (45 of 450, 10%): the 3-hashtag display cap is routinely not applied by established channels, so the rule is SHOULD. The regex counts `#word` tokens not preceded by a word character and may count a `#` heading or an issue number; a manual look was not done, so 45 is an upper bound. No audited description exceeded any hard limit: hard limits are an upload-time guard, not a corpus defect.

The ocx feed (2 videos): titles 53 characters or fewer; descriptions 683 characters; at most 3 hashtags; no timestamps (Shorts). Command: `python3 -I work/ytmeta.py` lines starting `OCX`.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://support.google.com/youtube/answer/57407 | Upload YouTube videos (Help) | undated, footer 2026; P | Title and description limits, end-screen floor, default privacy |
| https://support.google.com/youtube/answer/12948449 | Tips for video descriptions (Help) | undated, 2026; P | Description length, fold, unique descriptions |
| https://support.google.com/youtube/answer/72431 | Custom thumbnails (Help) | undated, 2026; P | Thumbnail spec, Shorts 9:16, verification, daily cap |
| https://support.google.com/youtube/answer/9884579 | Video chapters (Help) | undated, 2026; P | Chapter rules |
| https://support.google.com/youtube/answer/6388789 | End screens (Help) | undated, 2026; P | End-screen limits |
| https://support.google.com/youtube/answer/6140493 | Info cards (Help) | undated, 2026; P | Card limits |
| https://support.google.com/youtube/answer/6390658 | Hashtags (Help) | undated, 2026; P | 3 shown, 60 cap |
| https://support.google.com/youtube/answer/146402 | Tags (Help) | undated, 2026; P | Tags minimal role |
| https://support.google.com/youtube/answer/15569972 | Automatic dubbing (Help) | undated, 2026; P | Defaults, manual publish, jargon |
| https://support.google.com/youtube/answer/9527654 | Made for kids (Help) | undated, 2026; P | Audience duty, FTC |
| https://support.google.com/youtube/answer/6373554 | Automatic captions (Help) | undated, 2026; P | When captions are skipped |
| https://support.google.com/youtube/answer/14328491 | Altered or synthetic content (Help) | undated, 2026; P | AI-use disclosure |
| https://support.google.com/youtube/answer/9890437 | Feature access tiers (Help) | undated, 2026; P | Verification gates |
| https://support.google.com/youtube/answer/2657964 | Channel profile (Help) | undated, 2026; P | 14 links, handle limits |
| https://support.google.com/youtube/answer/3027950 | Channel customization (Help) | undated, 2026; P | Tabs; no numeric specs found |
| https://support.google.com/youtube/answer/2660027 | Upload defaults (Help) | undated, 2026; P | Defaults apply to browser uploads only |
| https://support.google.com/youtube/answer/10059070 | Shorts (Help) | undated; mentions 2025-03-31; P | Length, resolution |
| https://developers.google.com/youtube/v3/docs/videos | videos resource | undated; P | Byte limit, tags, language, kids and synthetic fields |
| https://developers.google.com/youtube/v3/docs/videos/insert | videos.insert | undated; P | 256 GB, 1 unit, privacy statement |
| https://developers.google.com/youtube/v3/docs/thumbnails/set | thumbnails.set | undated; P | 50 MB, Shorts, 50 units |
| https://developers.google.com/youtube/v3/docs/channels/update | channels.update | undated; P | Branding parts, 50 units |
| https://developers.google.com/youtube/v3/revision_history | API revision history | entries to 2026-11-16 (first 100,000 of 225,372 characters read); P | Dated changes to privacy, thumbnails, kids, quota |
| https://developers.google.com/youtube/v3/determine_quota_cost | Quota costs | undated; P | Per-method cost |
| https://www.youtube.com/static?template=terms&gl=US&hl=en | YouTube Terms (English) | 2023-12-15; P | Automated-access clause |
| https://www.youtube.com/t/terms | YouTube Terms (Finnish rendering) | 2022-01-05; P | Same clause, older date |
| https://developers.google.com/search/docs/appearance/video | Google Search video guidance | undated; P | Key moments, watch page, thumbnail 60x30 |
| https://www.youtube.com/feeds/videos.xml?channel_id=UCKuRD68HkNpla-vY6-YBTHg | ocx channel RSS feed | fetched 2026-11-27; P | Two videos, dates, descriptions |
| product-audit/exemplar-youtube-channels.md and distribution-posture.md (this program) | Prior audits | 2026-11-27; this program's measurements | 29x gap, 450-video corpus, ocx channel state |

Not fetched and therefore not relied on: Help 13861714 (A/B tests, the scout's 1280x720 claim), Help 9891124 (verification steps), Help 7628154 and 9314486 (CTR; measurement worker), the YouTube Help spam policy page; failed with 404: Help 9890843 and 6172584.

# YouTube dated facts

Every platform limit, field, policy clause and definition this skill uses sits in
one row below. Rules cite a row as `[YT-F11]`. Never quote a number or a clause
from memory, and never copy one into another file.

Contents: [Dates and versions](#dates-and-versions) · [Registry](#registry) ·
[Refresh](#refresh) · [Facts not in the registry](#facts-not-in-the-registry)

## Dates and versions

- Every row was read from its live page on 2026-11-27 and matched its `expect`
  pattern with the weekly re-fetch method (strip tags, then `grep -E`) in both a
  byte locale and a UTF-8 locale. YouTube Help pages show no date, so their
  `source_date` is `none`. Compare such a page by its content, never by a date.
- The YouTube Data API revision history dates every API change. Six entries that
  touch these rules landed between 2026-08-27 and 2026-11-16, about one every 14
  days. That is why the API rows refresh every 30 days.
- Event that forces an early re-check: any new revision-history entry that names
  `videos`, `thumbnails`, `captions` or a view definition, and any change to the
  Feature eligibility screen of the channel.
- One change is reported but unverified: a lift of the global block on claimed
  Shorts of one to three minutes, dated 2026-09-24, seen only in a search snippet.
  Row YT-F23 states the unverified status. Never rely on it.
- Columns follow the shared registry grammar: `id, platform, fact, value, url,
  source_date, verified, refresh_days, provenance, expect`. `refresh_days` is 180
  for hard limits, 90 for policy, label triggers and feature screens, and 30 for
  API behaviour and view definitions. `facts_check.py` fails on the first overdue
  row. Re-fetch the row. Never extend the date.

## Registry

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| YT-F01 | youtube | AI-use field is settable by API | status.containsSyntheticMedia | https://developers.google.com/youtube/v3/revision_history | 2024-10-30 | 2026-11-27 | 90 | platform | containsSyntheticMedia |
| YT-F02 | youtube | paid placement has no default; omission is undeclared | paidProductPlacementDetails.hasPaidProductPlacement | https://developers.google.com/youtube/v3/revision_history | 2026-11-16 | 2026-11-27 | 30 | platform | hasPaidProductPlacement |
| YT-F03 | youtube | trigger: a real person shown saying or doing something they did not | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Makes a real person appear to say or do something they didn.{1,3}t do |
| YT-F04 | youtube | trigger: altered footage of a real event or place | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Alters footage of a real event or place |
| YT-F05 | youtube | trigger: a generated realistic scene that did not occur | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Generates a realistic scene that didn.{1,3}t actually occur |
| YT-F06 | youtube | trigger: generated music that is the main focus | ai_use yes | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Creates music that.{1,3}s the main focus |
| YT-F07 | youtube | exemption: AI help with an outline, script, thumbnail, title or infographic | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | video outline, script, thumbnail, title, or infographic |
| YT-F08 | youtube | exemption: caption creation | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Caption creation |
| YT-F09 | youtube | exemption: the creator's own cloned voice for voice-over or dubs | ai_use no | https://support.google.com/youtube/answer/14328491 | none | 2026-11-27 | 90 | platform | Cloning one.{1,3}s own voice |
| YT-F10 | youtube | C2PA disclosures carried forward when the whole video is AI-made | C2PA 2.1 or higher | https://support.google.com/youtube/answer/15447836?hl=en | none | 2026-11-27 | 90 | platform | \(C2PA\) 2\.1 or higher |
| YT-F11 | youtube | video title limit | 100 characters | https://support.google.com/youtube/answer/57407 | none | 2026-11-27 | 180 | platform | character limit of 100 characters |
| YT-F12 | youtube | description limit in Help | 5,000 characters | https://support.google.com/youtube/answer/57407 | none | 2026-11-27 | 180 | platform | character limit of 5,000 characters |
| YT-F13 | youtube | description limit in the API, which binds API uploads | 5000 bytes, no angle brackets | https://developers.google.com/youtube/v3/docs/videos | none | 2026-11-27 | 180 | platform | maximum length of 5000 bytes |
| YT-F14 | youtube | tags limit in the API, counted with commas and quotes for tags that hold a space | 500 characters | https://developers.google.com/youtube/v3/docs/videos | none | 2026-11-27 | 180 | platform | maximum length of 500 characters |
| YT-F15 | youtube | hashtags shown above the title | up to three | https://support.google.com/youtube/answer/6390658 | none | 2026-11-27 | 180 | platform | up to three hashtags |
| YT-F16 | youtube | hashtags on one video or playlist, above which all are ignored | 60 | https://support.google.com/youtube/answer/6390658 | none | 2026-11-27 | 180 | platform | more than 60 hashtags |
| YT-F17 | youtube | chapters: first timestamp starts at 00:00, three or more in ascending order | 00:00, 3 stamps | https://support.google.com/youtube/answer/9884579 | none | 2026-11-27 | 180 | platform | first timestamp you list starts with 00:00 |
| YT-F18 | youtube | chapters: minimum chapter length | 10 seconds | https://support.google.com/youtube/answer/9884579 | none | 2026-11-27 | 180 | platform | minimum length for video chapters is 10 seconds |
| YT-F19 | youtube | thumbnail target and minimum size, by format | 3840x2160 and 640 px wide for video, 2160x3840 and 640 px tall for Shorts | https://support.google.com/youtube/answer/72431 | none | 2026-11-27 | 180 | platform | minimum width of 640 pixels |
| YT-F20 | youtube | thumbnail file size on desktop | 50 MB | https://support.google.com/youtube/answer/72431 | none | 2026-11-27 | 180 | platform | 50.{0,8}MB for video, Shorts |
| YT-F21 | youtube | a 16:9 thumbnail on a vertical video is replaced by an automatic 4:5 one | replaced | https://support.google.com/youtube/answer/72431 | none | 2026-11-27 | 180 | platform | replaced by an auto-generated 4:5 thumbnail |
| YT-F22 | youtube | a Short is square or vertical and up to three minutes, for uploads from 2024-10-15 | 180 seconds | https://support.google.com/youtube/answer/15424877 | 2024-10-15 | 2026-11-27 | 180 | platform | up to three minutes in length |
| YT-F23 | youtube | a claimed Short over one minute is blocked globally; a change reported for 2026-09-24 is unverified | blocked | https://support.google.com/youtube/answer/15424877 | none | 2026-11-27 | 90 | platform | blocked globally on YouTube |
| YT-F24 | youtube | an end screen needs a video at least 25 seconds long | 25 seconds | https://support.google.com/youtube/answer/6388789 | none | 2026-11-27 | 180 | platform | at least 25 seconds long to have an end screen |
| YT-F25 | youtube | end screens go in the last 5 to 20 seconds, up to four elements on 16:9 | 5 to 20 seconds, 4 elements | https://support.google.com/youtube/answer/6388789 | none | 2026-11-27 | 180 | platform | up to four elements |
| YT-F26 | youtube | end screen Link element needs the Partner Program | Partner Program | https://support.google.com/youtube/answer/6388789 | none | 2026-11-27 | 180 | platform | If you.{1,3}re in the +YouTube Partner Program |
| YT-F27 | youtube | omitted privacyStatus on videos.insert defaults to public, including unverified projects | public from 2026-11-02 | https://developers.google.com/youtube/v3/revision_history | 2026-11-02 | 2026-11-27 | 30 | platform | defaults to +public |
| YT-F28 | youtube | omitted selfDeclaredMadeForKids is not overridden | left as it was from 2026-10-15 | https://developers.google.com/youtube/v3/revision_history | 2026-10-15 | 2026-11-27 | 30 | platform | not overridden |
| YT-F29 | youtube | thumbnails.set accepts Shorts thumbnails after video processing | from 2026-11-03 | https://developers.google.com/youtube/v3/revision_history | 2026-11-03 | 2026-11-27 | 30 | platform | custom thumbnails for YouTube Shorts after video |
| YT-F30 | youtube | API thumbnail file size cap | 50 MB since 2026-09-14, was 2 MB | https://developers.google.com/youtube/v3/revision_history | 2026-09-14 | 2026-11-27 | 30 | platform | increased from 2MB to 50MB |
| YT-F31 | youtube | public view counts include TV co-views in every format | from 2026-11-16 | https://developers.google.com/youtube/v3/revision_history | 2026-11-16 | 2026-11-27 | 30 | platform | include co-views |
| YT-F32 | youtube | views in every format count from the first frame | from 2026-08-24 | https://blog.youtube/inside-youtube/engaged-views-youtube-explained/ | 2026-08-19 | 2026-11-27 | 30 | platform | counted from the first frame |
| YT-F33 | youtube | Shorts views count every start or replay | from 2025-03-31 | https://support.google.com/youtube/answer/10059070 | none | 2026-11-27 | 30 | platform | Starting 3/31/2025 |
| YT-F34 | youtube | automated uploads and other actions need the user's prior specific and express consent | required | https://developers.google.com/youtube/terms/developer-policies | 2026-11-06 | 2026-11-27 | 90 | platform | prior specific and express consent |
| YT-F35 | youtube | terms bar automated access except for public search engines | robots, botnets, scrapers | https://www.youtube.com/static?template=terms&gl=US&hl=en | 2023-12-15 | 2026-11-27 | 180 | platform | access the Service using any automated means |
| YT-F36 | youtube | automatic dubbing is on by default for eligible creators | on by default | https://support.google.com/youtube/answer/15569972 | none | 2026-11-27 | 90 | platform | enabled by default for eligible creators |
| YT-F37 | youtube | every video needs a made-for-kids setting and a wrong one risks FTC action | required | https://support.google.com/youtube/answer/9527654 | none | 2026-11-27 | 90 | platform | compliance issues with the FTC |
| YT-F38 | youtube | the channel's Feature eligibility screen sets Intermediate and Advanced features | per channel | https://support.google.com/youtube/answer/9890437 | none | 2026-11-27 | 90 | platform | Advanced features |
| YT-F39 | youtube | Test and Compare: one variant under 1280 x 720 drops every variant to 854 x 480 | 1280 x 720 | https://support.google.com/youtube/answer/16391400 | none | 2026-11-27 | 90 | platform | downscaled to 480p |
| YT-F40 | youtube | Test and Compare picks by watch time, and with no clear winner shows the first upload | watch time | https://support.google.com/youtube/answer/16391400 | none | 2026-11-27 | 90 | platform | highest watch time |
| YT-F41 | youtube | half of all channels and videos have an impressions CTR between 2% and 10% | 2% to 10% | https://support.google.com/youtube/answer/7628154 | none | 2026-11-27 | 90 | platform | between 2% and 10% |
| YT-F42 | youtube | audience retention data takes one to two days to process | 1 to 2 days | https://support.google.com/youtube/answer/9314415 | none | 2026-11-27 | 90 | platform | typically takes 1.{1,3}2 days |
| YT-F43 | youtube | spam policy: three strikes within 90 days can end a channel | 3 strikes, 90 days | https://support.google.com/youtube/answer/2801973 | none | 2026-11-27 | 90 | platform | 3 strikes within 90 days |
| YT-F44 | youtube | spam policy names maliciously misleading titles, thumbnails and descriptions | prohibited | https://support.google.com/youtube/answer/2801973 | none | 2026-11-27 | 90 | platform | maliciously misleading titles, thumbnails, descriptions |
| YT-F45 | youtube | thumbnails policy bars a thumbnail that misleads viewers about the video | prohibited | https://support.google.com/youtube/answer/9229980 | none | 2026-11-27 | 90 | platform | A thumbnail that misleads viewers |
| YT-F46 | youtube | inauthentic content: a series needs a distinct storyline, focus or concept per video | per video | https://support.google.com/youtube/answer/1311392 | 2025-07-15 | 2026-11-27 | 90 | platform | distinct storyline, focus, or concept |
| YT-F47 | youtube | only Audio Library music and effects are known to be copyright-safe | Audio Library | https://support.google.com/youtube/answer/3376882 | none | 2026-11-27 | 90 | platform | known to YouTube to be copyright-safe |
| YT-F48 | youtube | a Creative Commons Audio Library track needs the artist credited in the description | credit required | https://support.google.com/youtube/answer/3376882 | none | 2026-11-27 | 90 | platform | credit the artist in your video.{1,3}s description |
| YT-F49 | youtube | a copyright removal of a live stream brings a strike and a 7-day live restriction | 7 days | https://support.google.com/youtube/answer/2814000 | none | 2026-11-27 | 90 | platform | restricted for 7 days |
| YT-F50 | youtube | channel name and handle each allow two changes in 14 days; a name change removes a verification badge | 2 per 14 days | https://support.google.com/youtube/answer/2657964 | none | 2026-11-27 | 180 | platform | twice within a 14-day period |
| YT-F51 | youtube | channels.update writes one part per call and overrides every mutable property in that part | one part per call | https://developers.google.com/youtube/v3/docs/channels/update | none | 2026-11-27 | 180 | platform | overrides +the +existing +values +for +all +of +the +mutable +properties |

## Refresh

1. List the overdue rows: run the facts check named in `SKILL.md`. Each overdue id
   prints with its days overdue.
2. Open the row's `url`. Confirm the `value` and the `expect` phrase against the
   page text. A Help page has no date, so read the sentence, not the footer.
3. On a match, set `verified` to today. On a change, edit `fact`, `value` and
   `expect`, set `source_date` to the page's absolute date or `none`, and set
   `verified` to today.
4. Re-read every rule that cites the row. A changed limit changes
   `checks/yt_manifest_check.py`, which hard-codes the limits that YT-F11, YT-F13,
   YT-F14, YT-F15, YT-F17 to YT-F20, YT-F22, YT-F24, YT-F25 and YT-F30 state.
5. Never move `verified` without opening the page.

## Facts not in the registry

These are measurements, not platform facts. They carry no `YT-F` id and never
become a threshold in a check.

| Figure | Value | Sample and date |
|---|---|---|
| Median views, company video against educator video | 2,506 against 72,825, about 29 times | Median of channel medians over 15-video windows, 30 feeds, measured twice on 2026-11-27 (29.06 and 29.07) |
| Company announcement titles against the channel median | 4.94 times | n=18, 8 channels, driven by four outliers, so no finding |
| Company Shorts against the channel median | 0.88 pooled, 5 channels higher and 4 lower | n=54, 9 channels. A null result |
| Live, meeting and talk titles against the channel median | 0.50 | n=24, 10 channels, no finding |
| Description similarity inside a series | Medians 0.37 and 0.12 for two exemplar series in good standing, 0.94 for meeting boilerplate, 1.00 for a duplicate pair | Six exemplar series, 2026-11-27. Title similarity of good series runs 0.5 to 0.95, so it cannot gate. The 0.6 limit in the linter is a house threshold from these, not a platform number |
| Video length bands | 10 to 19 minutes most popular at 25 percent, two thirds call over 20 minutes too long | Vendor survey, TechSmith, fielded 2024-05, about 1,000 respondents |
| Short against long video | Short videos win on engagement rate, long ones on total watch time | Vendor report, Wistia, 2024-04-15, no sample size stated |

Re-run the exemplar measurements every 180 days on the same 30 channel ids. The
two vendor figures expire after 365 days and stay advice only.

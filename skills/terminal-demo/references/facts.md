---
title: Dated Facts for Terminal Demos
summary: Platform video specs, tool behaviour, accessibility standards and the player version that the CH-VID rules cite, one dated row each
---

# Dated Facts for Terminal Demos

The registry behind the `terminal-demo` skill. Cite a row by id (`[VID-F01]`) and
never quote a platform limit, tool default or standard from memory.

## Dates and Versions

- Every row was read on its `verified` date, 2026-11-27, and its `expect` pattern was matched
  against the live page text on that day, except VID-F10, whose page LinkedIn
  restricts to a human reader. A human re-reads that row by hand.
- Column grammar: `id, platform, fact, value, url, source_date, verified,
  refresh_days, provenance, expect`. `source_date` is the page's own date, or
  `relative:<text>@<fetch date>` where the page prints only an age, or `none`.
  `verified` is the date an agent read the page. `refresh_days` is a number or
  `expires:<date>`. No cell holds a literal pipe, so `expect` uses no alternation.
- Cadence: 180 days for hard limits, 90 for policy, API fields and tool behaviour,
  30 for metered costs. The skill's floor is 180 days, and 90 for the player
  version. `checks/` has no checker of its own for this file: the catalog's
  `facts_check.py` in the `channel-publishing` skill fails on the first overdue row.
  Re-fetch the page and move `verified` only after the `expect` pattern matches.
  Never extend a date without reading the page.
- Re-check events beyond the date: an asciinema-player release, a VHS or agg major
  release, the LinkedIn Marketing version sunset on 2027-01-15 (VID-F09), and any
  change of a Google or LinkedIn help page text.
- The asciinema, VHS and gitleaks rows describe tools whose versions move. Their
  pins are in the pipeline reference's "Dates and Versions" section.

## Rows

| id | platform | fact | value | url | source_date | verified | refresh_days | provenance | expect |
|---|---|---|---|---|---|---|---|---|---|
| VID-F01 | youtube | upload encode container, codecs and audio | MP4, H.264 video, 4:2:0 chroma, AAC-LC or Opus audio, 48 kHz sample rate | https://support.google.com/youtube/answer/1722171 | none | 2026-11-27 | 180 | platform | Video codec: H\.264 |
| VID-F02 | youtube | recommended bit rate at 1080p | 8 Mbps | https://support.google.com/youtube/answer/1722171 | none | 2026-11-27 | 180 | platform | 1080p 8 Mbps |
| VID-F03 | youtube | a Short is square or vertical and at most three minutes, for uploads from 2024-10-15 | 3 minutes | https://support.google.com/youtube/answer/15424877 | none | 2026-11-27 | 180 | platform | square or vertical aspect ratio up to three minutes |
| VID-F04 | youtube | caption track kinds, where ASR is an unreviewed automatic track | ASR, forced, standard | https://developers.google.com/youtube/v3/docs/captions | none | 2026-11-27 | 90 | platform | generated using automatic speech recognition |
| VID-F05 | youtube | quota cost of one captions.list call | 50 units | https://developers.google.com/youtube/v3/docs/captions/list | none | 2026-11-27 | 30 | platform | quota cost of 50 units |
| VID-F06 | linkedin | video length through the Videos API | 3 seconds to 30 minutes | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | 2026-02-12 | 2026-11-27 | 180 | platform | Three seconds to 30 minutes |
| VID-F07 | linkedin | video file size and format through the Videos API | 75 KB to 500 MB, MP4 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | 2026-02-12 | 2026-11-27 | 180 | platform | Between 75 ?kb and 500 ?MB |
| VID-F08 | linkedin | a video takes one caption file, English only | 1 file, English | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | 2026-02-12 | 2026-11-27 | 90 | platform | only English-language captions are supported |
| VID-F09 | linkedin | Marketing Version 202601 sunset, so send a supported Linkedin-Version header | 2027-01-15 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | 2026-02-12 | 2026-11-27 | expires:2027-01-15 | platform | sunset on January 15, 2027 |
| VID-F10 | linkedin | video upload limit on the help page, the stricter of two LinkedIn pages | up to 15 minutes, 5 GB | https://www.linkedin.com/help/linkedin/answer/a7174587 | relative:2 years ago@2026-11-27 | 2026-11-27 | 180 | platform | 15 minutes |
| VID-F11 | github | animated images in a README follow the viewer's reduced-motion preference by default | default syncs with the system setting | https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings | none | 2026-11-27 | 90 | platform | syncs with your system-level preference for reduced motion |
| VID-F12 | github | README HTML is sanitised and script tags are removed | script tags removed | https://github.com/github/markup | none | 2026-11-27 | 90 | platform | script +tags, inline-styles |
| VID-F13 | asciinema | agg loops a GIF by default and --no-loop plays it once | loop by default | https://docs.asciinema.org/manual/agg/usage/ | none | 2026-11-27 | 90 | vendor | --no-loop plays the GIF once |
| VID-F14 | asciinema | agg idle time limit default | 5 seconds | https://docs.asciinema.org/manual/agg/usage/ | none | 2026-11-27 | 90 | vendor | --idle-time-limit \(default 5 |
| VID-F15 | asciinema | asciicast v3 is not backward compatible with v1 or v2, and the recorder captures only SHELL by default | v3 header schema and relative time | https://docs.asciinema.org/manual/asciicast/v3/ | 2025-10-20 | 2026-11-27 | 90 | vendor | not backward compatible with asciicast v1/v2 |
| VID-F16 | asciinema | player controls default to auto, which hides the bar while the pointer is still | auto | https://docs.asciinema.org/manual/player/options/ | none | 2026-11-27 | 90 | vendor | Defaults to .auto. |
| VID-F17 | asciinema | the player uses the theme embedded in the recording by default | embedded theme first | https://docs.asciinema.org/manual/player/options/ | none | 2026-11-27 | 90 | vendor | embeds it in a recording file |
| VID-F18 | asciinema | current asciinema-player release, whose npm bundle sha256 is 808731d0463da04f6426972a5f929f1030988e0a003444a83741d64a17a7f128 | 3.19.0, published 2026-11-22 | https://github.com/asciinema/asciinema-player/releases/tag/v3.19.0 | 2026-11-22 | 2026-11-27 | 90 | vendor | v3\.19\.0 |
| VID-F19 | asciinema | the player draws dim (SGR 2) text at CSS opacity 0.5 | opacity 0.5 | https://cdn.jsdelivr.net/npm/asciinema-player@3.19.0/dist/bundle/asciinema-player.css | none | 2026-11-27 | 90 | vendor | ap-faint \{ opacity: 0\.5 |
| VID-F20 | vhs | Require commands must sit at the top of a tape | top of the tape | https://github.com/charmbracelet/vhs | none | 2026-11-27 | 90 | vendor | Require commands must be defined at the top of a tape file |
| VID-F21 | vhs | Hide stops frame capture, and the hidden commands still run | capture only | https://github.com/charmbracelet/vhs | none | 2026-11-27 | 90 | vendor | command instructs VHS to stop |
| VID-F22 | gitleaks | gitleaks is feature complete, and its author moved to a successor project | v8.30.1 line | https://github.com/gitleaks/gitleaks | none | 2026-11-27 | 180 | vendor | Gitleaks is feature complete |
| VID-F23 | gitleaks | detect and protect are deprecated since v8.19.0, so scan with gitleaks dir | v8.19.0 | https://github.com/gitleaks/gitleaks | none | 2026-11-27 | 180 | vendor | introduced a change that deprecated detect and protect |
| VID-F24 | remotion | free licence covers individuals and companies of up to 3 people | up to 3 people | https://www.remotion.dev/docs/license/pricing.md | none | 2026-11-27 | 180 | vendor | individuals and companies of up to 3 people |
| VID-F25 | w3c | SC 2.2.2: moving content that starts by itself and lasts over five seconds needs a pause control | 5 seconds | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | 2026-10-04 | 2026-11-27 | 180 | authority | lasts more than five seconds |
| VID-F26 | w3c | SC 1.4.2: audio that plays by itself for more than 3 seconds needs a pause or volume control | 3 seconds | https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html | 2026-10-04 | 2026-11-27 | 180 | authority | for more than 3 seconds |
| VID-F27 | w3c | SC 1.2.1: prerecorded video-only content needs a text or audio alternative | Level A | https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html | 2026-09-06 | 2026-11-27 | 180 | authority | prerecorded video-only content |
| VID-F28 | w3c | SC 1.2.2: prerecorded synchronized media needs captions | Level A | https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html | 2026-08-10 | 2026-11-27 | 180 | authority | captions are provided for the synchronized media |
| VID-F29 | w3c | SC 1.2.3: prerecorded video needs audio description or a media alternative | Level A | https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html | 2026-08-10 | 2026-11-27 | 180 | authority | audio description of the prerecorded video content |
| VID-F30 | w3c | SC 1.4.3: text contrast of at least 4.5 to 1 | 4.5:1 | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | 2026-10-04 | 2026-11-27 | 180 | authority | at least 4\.5:1 |
| VID-F31 | w3c | SC 2.3.1: no more than three flashes in any one second | 3 flashes | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html | 2025-09-17 | 2026-11-27 | 180 | authority | Three Flashes or Below Threshold |
| VID-F32 | tella | third-party margins for vertical video, an input to the derived safe rectangle of CH-VID-10 (no platform publishes one) | Instagram Reels top 14%, bottom 35%, sides 6% | https://www.tella.com/help/editing/social-safe-zones | none | 2026-11-27 | 90 | independent | keep the top 14%, the bottom 35%, and 6% on each side clear |
| VID-F33 | manypixels | third-party measured TikTok safe zone, the second input to the derived safe rectangle of CH-VID-10 | about 38% of the frame is fully safe | https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs | 2026-11-11 | 2026-11-27 | 90 | independent | only about 38% of the frame is fully safe |

---
title: Terminal and product demo recordings - legibility thresholds, idle and speed defaults, vertical safe rectangle
program: product
sub_program: channels
topic: channel-terminal-video
worker: vid-legibility-thresholds
date_researched: 2026-11-27
model: sonnet
sources_fetched: 12
scope: Covers the minimum rendered text size for terminal recordings per surface, the column cap that follows from it, idle-limit and speed defaults, and one vertical safe rectangle for Shorts, Reels and TikTok. Does not cover pipeline choice per surface, captions and audio description, secret scrubbing, or contrast research (the contrast threshold is borrowed, see 1.6). No numeric floor for terminal text in video is published anywhere I could fetch; every floor below is DERIVED from my own measurement and labelled so.
---

# Terminal and product demo recordings: legibility thresholds

## Table of contents

1. Summary
2. Findings (1.1 method, 1.2 geometry law, 1.3 OCR floor, 1.4 column caps per surface, 1.5 idle and speed, 1.6 contrast, 1.7 safe rectangle, 1.8 scout figures that failed to reproduce)
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- No platform or standard publishes a minimum text size for terminal or code in video. Every floor here is DERIVED from a measurement made 2026-11-27 and must be labelled "derived" in any rule.
- Measured law (VHS v0.12.1, default font): rendered x-height in CSS px at display width W for a terminal of C columns is about 0.98 x W / C. Font size drops out: it only changes the source resolution, not the on-screen text size once the frame is fitted to a width.
- Derived floor: rendered x-height of at least 6 px (OCR knee, 0.72 to 0.85 similarity between 5 and 6 px); derived target of at least 8 px for human reading margin. The 8 px target is a project choice, not measured on humans.
- Column cap at the 6 px floor (8 px target): 360 px phone 58 (44); 720 px docs column 117 (88); 896 px README column 146 (109); 1080 px 176 (132); 1920 px 1080p 313 (235). The widths 720 and 896 are assumed, not fetched.
- The fleet's 180-column casts fail the floor at any display width under 1102 px (x-height 5.9 px at 1080); at an assumed 720 px docs column x-height is 3.9 px. Measured by arithmetic from the law, not by rendering the docs site.
- A 16:9 recording shown full width on a 360 px phone passes the floor only up to 58 columns. The usual 80-column recording gives 4.4 px and fails.
- Vertical masters (Shorts, Reels, TikTok): text inside the 768 px wide safe rectangle is about 0.71 of frame width, so the cap is about 41 columns at the floor (31 at the target). Re-record at those columns instead of cropping a landscape take.
- The scout safe rectangle (top 288, bottom 672, left 120, right 192 at 1080x1920) reproduces by arithmetic. No platform publishes it: inputs are third-party (Tella, ManyPixels) and an unverified Meta percentage. Label DERIVED.
- Idle limit: asciinema agg defaults to 5 s, the web player has no limit unless the header sets one. Fleet casts carry no `idle_time_limit` at all; the scout claim of "16 to 66 s limits" is wrong (those are durations and row counts).
- Autoplay or looping motion over 5 s needs a pause control (WCAG 2.2.2, Level A); the asciinema player defaults to no autoplay, no loop, which is the compliant default. A GIF in a README cannot be paused.
- Speed: VHS PlaybackSpeed defaults to 1.0. No source gives a legible maximum; this dive proposes a cap of 1.5 as a project choice, to be tested.
- Contrast in the recording theme: the css-theming rule file in this catalog carries no contrast threshold (grep found none). The only contrast threshold used is WCAG 1.4.3, 4.5:1. VHS's default render measures 16.4 to 18.9:1 from sampled pixels.
- LinkedIn's Videos API page does not state a 360x640 floor; it states length 3 s to 30 min, 75 KB to 500 MB, MP4.

## Findings

### 1.1 Method (every command)

All renders on this machine, 2026-11-27, VHS image `ghcr.io/charmbracelet/vhs:latest`, `vhs --version` printed `vhs version v0.12.1 (24fa225)`, digest sha256:ea49a6a1c529be83153e88321892b5585964418f0b9055e8c1e0d732194234a3. Scratch directory `~/.cache/research-lang/exemplars/product/vid-legib2/`.

```
docker pull ghcr.io/charmbracelet/vhs:latest
# 16 tapes r{80,100,120,180}_{14,18,22,28}.tape: Set Shell bash; Set FontSize N; Set Columns C; Set Rows 20; Set Padding 0
# session: printf 'HHHHHHHH\n'; printf 'xxxxxxxx\n'; printf '%*s\n' C '' | tr ' ' '='
docker run --rm --entrypoint sh -v $D:/vhs ghcr.io/charmbracelet/vhs:latest -c \
  'cd /vhs; for t in r*.tape; do vhs $t; done; for f in r*.mp4; do ffmpeg -y -sseof -0.2 -i $f -frames:v 1 ${f%.mp4}.png; done'
python3 -m venv v; v/bin/pip install pillow numpy rapidocr-onnxruntime opencv-python-headless
v/bin/python measure.py   # ink bounding boxes of the H line (cap height), x line (x-height), ruler line (cell width), pixel contrast
v/bin/python ocr.py       # OCR sweep, section 1.3
```

All 16 renders completed. `Set Columns` with `Set Rows 12` failed for three tapes ("could not resolve a viewport for 80 columns x 12 rows: closest match was 80 columns x 11 rows"); `Set Rows 20` fixed it. The VHS README confirms Columns and Rows exist and cannot be combined with Width and Height ([VHS README](https://github.com/charmbracelet/vhs/blob/main/README.md), fetched 2026-11-27, no page date; the README gives no default for FontSize, Width, Height or Padding). `Output name/` (directory form) wrote no frames in my run and the tape fell back to a GIF; `Output name.mp4` plus an ffmpeg last-frame grab worked.

### 1.2 Geometry law (measured)

Pixel measurements of the last frame (mp4, so lossy; n=16 renders, glyph sizes within plus or minus 1 px):

| FontSize | Frame W at 80 / 120 / 180 cols (px) | Cell width (px) | Cap height H (px) | x-height (px) |
|---|---|---|---|---|
| 14 | 748 / 1108 / 1652 | 9.2 to 9.3 | 10 to 11 | 8 to 9 |
| 18 | 906 / 1352 / 2010 | 11.2 to 11.3 | 13 to 14 | 10 to 11 |
| 22 | 1158 / 1718 / 2548 | 14.1 to 14.4 | 16 to 17 | 13 |
| 28 | 1398 / 2072 / 3086 | 16.6 to 17.2 | 22 | 17 |

Fits: cell width = about 0.61 to 0.66 x FontSize; cap height = about 0.78 x FontSize; x-height = about 0.61 x FontSize; row pitch = about 1.36 x FontSize (750 px for 20 rows at 28). Frame width = columns x cell width.

Consequence: when the frame is scaled to display width W, scale = W / (C x cell). Rendered x-height = 0.61 x FS x W / (C x 0.62 x FS), which is about 0.98 x W / C. FontSize cancels. Rendered cap height is about 1.27 times the x-height (0.78 / 0.61). Raising FontSize only raises source resolution; the only lever on on-screen size is columns (or crop and zoom, which discards columns). A rule that says "set FontSize 28" without a column cap gives no guarantee.

The fleet player is HTML text, not a raster, but `fit` defaults to "width" ([player options](https://docs.asciinema.org/manual/player/options/), fetched 2026-11-27, no page date, copyright 2023), so the same law holds with the player's cell width. The fleet's bundled player maps terminalFontSize "small" to 12 px, "medium" 18 px, "big" 24 px (read from the minified bundle under `grimoire-rs/grimoire/docs`; measured by grep, no external source).

### 1.3 OCR floor (derived, single engine, proxy for humans)

A 120-column session of realistic CLI output (8 lines, 310 non-space characters) rendered at FontSize 28 (2072 x 750), then Lanczos-downscaled to widths giving a target x-height, OCR'd with RapidOCR 1.2.3 (ONNX runtime), scored by `difflib.SequenceMatcher` ratio against the known text:

| Rendered x-height (px) | Frame width (px) | OCR similarity |
|---|---|---|
| 3 | 367 | 0.30 |
| 4 | 490 | 0.45 |
| 5 | 612 | 0.72 |
| 6 | 735 | 0.85 |
| 7 | 857 | 0.88 |
| 8 | 980 | 0.82 |
| 9 | 1102 | 0.82 |
| 10 | 1224 | 0.76 |
| 12 | 1469 | 0.83 |

Reading: a sharp knee between 4 and 6 px; above 6 px the score plateaus at 0.82 to 0.88 (the ceiling is the OCR engine plus the echoed command line, not legibility). Derived floor: 6 px x-height. This is a machine-reading proxy from one engine and one font; it is not a human legibility study. The 8 px target adds a margin for human reading and for video compression; it is a project choice. Do not cite interface type-scale guidelines for either number.

### 1.4 Column caps per surface (derived from 1.2 and 1.3)

Cap = floor(0.98 x W / x-height). Widths 720 (docs column) and 896 (README column) are ASSUMED, not fetched; replace with the measured content width of the adopter's site.

| Surface and display width W | Cap at 6 px floor | Cap at 8 px target | Common 80-col x-height | Fleet 180-col x-height |
|---|---|---|---|---|
| Phone, 16:9 video full width, 360 px | 58 | 44 | 4.4 (fail) | 2.0 (fail) |
| Docs column, 720 px (assumed) | 117 | 88 | 8.8 | 3.9 (fail) |
| README column, 896 px (assumed) | 146 | 109 | 11.0 | 4.9 (fail) |
| 1080 px wide | 176 | 132 | 13.2 | 5.9 (fail by 0.1) |
| 1080p full screen, 1920 px | 313 | 235 | 23.5 | 10.5 |
| Vertical safe rectangle, 768 px of a 1080 frame on a 360 px phone: usable width 0.711 x 360 = 256 px | 41 | 31 | 3.1 for 80 cols | n/a |

Rows: the row pitch is about 2.2 times the cell width, so a 1080 x 1920 vertical master with 41 columns inside 768 px has cell width 18.7 px, row pitch about 41 px, and fits about 23 rows inside the 960 px tall safe height. Derived: cap rows at 20.

Computation: `python3 -I -c "[print(W,[int(.98*W/x) for x in (6,8)]) for W in (360,720,896,1080,1920)]"`.

### 1.5 Idle limit and speed

- agg (asciinema GIF renderer): `--idle-time-limit` default 5 s, `--speed` default 1, `--fps-cap` default 30, `--last-frame-duration` default 3 s ([agg usage](https://docs.asciinema.org/manual/agg/usage/), fetched 2026-11-27, no page date, copyright 2023, platform authority).
- Web player: `idleTimeLimit` default "no limit" unless the cast header sets it; `speed` default 1; `autoplay`, `loop` and `preload` default false ([player options](https://docs.asciinema.org/manual/player/options/)).
- asciicast v2 header: `idle_time_limit` is a float set by `asciinema rec -i`; players should cap pauses at it ([asciicast v2](https://docs.asciinema.org/manual/asciicast/v2/), fetched 2026-11-27).
- VHS: `PlaybackSpeed` default 1.0 (examples 0.5, 1.0, 2.0); `TypingSpeed` is seconds per key press with no listed default; `Wait` defaults to regex `/>$/`, timeout 15 s, scope Line ([VHS README](https://github.com/charmbracelet/vhs/blob/main/README.md)).
- Fleet measurement: `cd /home/mherwig/dev; python3 -I` over `grimoire-rs/grimoire/docs/public/casts/*.cast`, v2 absolute timestamps differenced: 11 casts, no `idle_time_limit` key in any header (keys are only version, width, height, title, theme), durations 16 to 56 s, maximum gap between events 3.0 to 4.0 s. The recordings are already edited so no idle limit is needed to reach the fleet's gaps; the header-less state means a re-recorded cast with a long pause would play as recorded.
- Motion control: WCAG 2.2.2 (Level A) requires a pause, stop or hide mechanism for moving content that starts automatically and lasts more than 5 seconds ([SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), page updated 04 October 2026). Looping autoplay GIFs cannot be paused; the player's default no-autoplay passes.
- No source states a legible playback speed ceiling. The defaults below are project choices.

### 1.6 Contrast

- The catalog rule `rules/css-theming.md` and the `skills/css-theming-reference/` pages contain no contrast threshold (`grep -rn -i -E 'contrast|ratio|luminance'` found only unrelated lines). The commission's premise that css-theming carries one does not hold; this is reported, not worked around by research. The threshold applied below is WCAG SC 1.4.3: 4.5:1 for text and images of text, 3:1 for large-scale text (18 pt or 14 pt bold) ([SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), page updated 04 October 2026). The page does not say whether text in video is covered; it does cover images of text.
- Measured: VHS default render, pixel sampling of the last frame, ratio computed with the WCAG relative-luminance formula: background #171717 to #181818, brightest foreground 246 to 255, contrast 16.4 to 18.9:1 over 16 renders. Mp4 compression inflates the peak foreground slightly; treat as at least 15:1.
- `vhs themes --json` is not supported in v0.12.1 (output was not JSON), so the theme-wide scan of ANSI colours against background was not done. Gap.
- The ANSI colour that most often fails is dim black or bright-black text on a dark background. That is a hypothesis; I did not measure it. The gate is a script that computes the ratio for foreground and each of the 16 palette entries against the theme background and fails any palette entry used in the session under 4.5:1.

### 1.7 Vertical safe rectangle (re-derived)

What the platforms publish, fetched 2026-11-27:

- YouTube Shorts help page: up to 3 minutes with the multi-segment camera, "maximum resolution of 1080p", no aspect ratio, no safe-zone text ([support.google.com/youtube/answer/10059070](https://support.google.com/youtube/answer/10059070), no last-updated date, footer 2026).
- TikTok ads help: 9:16 at least 540x960 px, up to 10 minutes, 500 MB, 516 kbps or more; safe zone "depends on" dimension, caption length and extra formats, downloadable templates only, no pixel numbers ([TikTok In-Feed ads](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads), no page date).
- Instagram Reels: the creators URL I tried returned 404. A web search found no Meta page printing 14% / 35% / 6%; third-party tools repeat it and some report a 40% bottom figure for ads. NOT verified from Meta.
- LinkedIn Videos API page (platform, Microsoft Learn, `ms.date` 2026-02-12, `updated_at` 2026-03-02): length 3 seconds to 30 minutes, 75 KB to 500 MB, MP4; captions SRT, one file, English only. No 360x640 floor and no safe zone ([Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api)).

Third-party derived figures:

| Platform | Top | Bottom | Left | Right | Source and date |
|---|---|---|---|---|---|
| YouTube Shorts | 288 | 672 | 48 | 192 | [Tella](https://www.tella.com/help/editing/social-safe-zones), cites "Google's vertical video guidelines", no page date, third party; Google's own page not fetched |
| Instagram Reels | 14% (269) | 35% (672) | 6% (65) each | 6% (65) | Tella, cites "Meta's Reels guidelines", unverified at Meta |
| TikTok | 240 | 660 | 120 | 120, plus a 180 px column in the lower right for like, comment, share (up to 1,080 px from the bottom) | [ManyPixels](https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs), measured from TikTok's 720x1280 In-Feed template times 1.5, dated 11 November 2026, third party |

Union (maximum margin per edge): top max(288, 240, 269) = 288; bottom max(672, 660, 672) = 672; left max(48, 120, 65) = 120; right max(192, 180 or 120, 65) = 192. The scout's rectangle reproduces exactly: top 288, bottom 672, left 120, right 192, giving x 120 to 888 (768 wide) and y 288 to 1248 (960 tall) at 1080x1920. Check: `python3 -I -c "print(max(288,240,round(.14*1920)),max(672,660,round(.35*1920)),max(48,120,round(.06*1080)),max(192,180,round(.06*1080)))"` prints `288 672 120 192`. Status: DERIVED, third-party inputs, no platform publishes it for organic posts. A TikTok 4-line caption or anchor raises the bottom margin (scout: down to y 906), and the 40% bottom figure reported for Meta ads would put the line at y 1152. These are not in the enforced rectangle (see Contested).

### 1.8 Scout figures that failed to reproduce or were corrected

| Scout figure | Result |
|---|---|
| Fleet casts have `idle_time_limit` 16 to 66 s | Fails. No header has `idle_time_limit`; 16 to 56 s are durations, 16 to 66 are row counts. Max event gap 3 to 4 s |
| LinkedIn minimum 9:16 is 360x640, "the only platform-stated floor" | Fails. The cited Videos API page states no resolution or aspect ratio |
| Shorts left margin 48 | Reproduces from Tella (third party); the union uses TikTok's 120 |
| Combined rectangle 288 / 672 / 120 / 192 | Reproduces |
| TikTok 240 / 660 / 120 / 180 | Reproduces from ManyPixels, but 180 is the lower-right button column; the plain right margin is 120 |
| 1080x1920 capture of 1920x1080 scaled to 1080 wide halves each glyph | Reproduces (scale 0.5625; glyphs shrink to 56%, not 50%) |
| VHS gives no default FontSize | Reproduces; PlaybackSpeed default 1.0 is stated |

## Dated facts

Every external limit, specification or policy used above, one row each. Source type: platform or authority itself, independent study, or vendor data. "No page date" means the fetched page printed none; the fetch date is 2026-11-27. No independent study was used. Measurements of mine (VHS v0.12.1, RapidOCR 1.2.3) are in 1.1 to 1.3 and are not external facts.

| Fact | Source URL | Date the source states | Source type |
|---|---|---|---|
| agg `--idle-time-limit` default 5 s; `--speed` default 1; `--fps-cap` default 30; `--last-frame-duration` default 3 s | https://docs.asciinema.org/manual/agg/usage/ | no page date, copyright 2023 | authority (asciinema docs) |
| Web player `idleTimeLimit` default no limit unless header sets it; `speed` 1; `autoplay`, `loop`, `preload` default false | https://docs.asciinema.org/manual/player/options/ | no page date, copyright 2023 | authority (asciinema docs) |
| asciicast v2 header `idle_time_limit` is a float; players cap pauses at it | https://docs.asciinema.org/manual/asciicast/v2/ | no page date | authority (asciinema spec) |
| VHS `PlaybackSpeed` default 1.0; `Wait` default regex `/>$/`, timeout 15 s, scope Line; `Columns` and `Width` cannot be combined | https://github.com/charmbracelet/vhs/blob/main/README.md | no page date | authority (tool README) |
| WCAG 2.2.2 (Level A): pause, stop or hide for auto-starting moving content lasting over 5 s | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | updated 04 October 2026 | authority (W3C) |
| WCAG 1.4.3: 4.5:1 for text and images of text; 3:1 for large-scale text (18 pt, or 14 pt bold) | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | updated 04 October 2026 | authority (W3C) |
| WCAG 1.4.4 resize 200%: excludes captions and images of text | https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html | updated 06 September 2026 | authority (W3C) |
| WCAG 1.4.10 reflow at 320 CSS px: video is a two-dimensional exception | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | updated 04 October 2026 | authority (W3C) |
| LinkedIn video: 3 s to 30 min, 75 KB to 500 MB, MP4; captions SRT, one file, English only; no resolution or safe-zone rule stated | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | `ms.date` 2026-02-12, `updated_at` 2026-03-02 | platform |
| YouTube Shorts: up to 3 min with multi-segment camera, maximum resolution 1080p; no aspect ratio or safe-zone text | https://support.google.com/youtube/answer/10059070 | no page date, footer 2026 | platform |
| TikTok In-Feed ads: 9:16, at least 540x960 px, up to 10 min, 500 MB, 516 kbps or more; safe zone only as downloadable templates | https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads | no page date | platform |
| Shorts safe margins top 288, bottom 672, left 48, right 192 (1080x1920); Reels 14% / 35% / 6% / 6% | https://www.tella.com/help/editing/social-safe-zones | no page date | vendor data; Meta figures unverified at Meta |
| TikTok safe margins 240 / 660 / 120 / 120, plus 180 px lower-right button column | https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs | 11 November 2026 | vendor data (agency blog, scaled from TikTok's 720x1280 template) |

Not fetchable: the Meta Reels creators page returned 404, so no Meta-stated safe zone is a dated fact here.

## Normative guidance candidates

Labels: every numeric floor is DERIVED (measured 2026-11-27, VHS v0.12.1, RapidOCR 1.2.3).

1. MUST set the recording geometry by columns, never by FontSize alone. Rationale: rendered x-height is about 0.98 x W / C; FontSize cancels out. Verify: tape or cast header contains `Set Columns` (or `width` in the cast header); `grep -n -E '^Set (Columns|Width)' *.tape`; fail a tape that sets FontSize with neither.
2. MUST keep rendered x-height at least 6 px at the surface's display width (DERIVED floor). Rationale: OCR similarity drops from 0.85 at 6 px to 0.72 at 5 and 0.45 at 4. Verify: compute cap = floor(0.98 x W / 6) and require columns at or under it (table 1.4); or downscale a frame to W and run OCR with similarity at least 0.8 against the known session text.
3. SHOULD target 8 px or more (DERIVED target; human margin is a project choice, untested on people). Verify: columns at or under floor(0.98 x W / 8).
4. MUST NOT embed a recording above 58 columns on a phone-first surface (LinkedIn feed, YouTube watched on a phone at 16:9) without a zoomed re-record. Rationale: 360 px phone width at 80 columns gives 4.4 px. Verify: columns from the cast header or tape against 58.
5. MUST record the vertical master (Shorts, Reels, TikTok) as a dedicated 9:16 session at no more than 41 columns and 20 rows with text inside the safe rectangle; MUST NOT crop a landscape take. Rationale: text width is limited to 768 of 1080 px. Verify: `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 x.mp4` prints `1080,1920`; run OCR on sampled frames and fail any text bounding box outside x 120 to 888 and y 288 to 1248; or draw the mask with ffmpeg `drawbox` and inspect.
6. MUST label the safe rectangle and every floor in the reference file as "derived" with the date, and MUST NOT write them as platform specs. Rationale: no platform publishes either. Verify: lint rejects a pixel number in the reference file without an official, derived or third-party label and date.
7. MUST set an idle limit when recording with asciinema (`asciinema rec -i 2`) or cut gaps over 3 s in the edit; SHOULD cap at 2 s (project choice, fleet max gap is 3 to 4 s). Rationale: the player has no default limit; agg's default is 5 s; long pauses read as a broken demo. Verify: header `idle_time_limit` present and at most 3 (`python3 -I -c "import json,sys;print(json.loads(open(sys.argv[1]).readline()).get('idle_time_limit'))" x.cast`), or maximum event gap at most 3 s.
8. SHOULD keep PlaybackSpeed at 1.0 for narrated or YouTube content and at most 1.5 otherwise (project choice, untested). Rationale: VHS default 1.0; no source states a speed ceiling. Verify: `grep -n PlaybackSpeed *.tape` shows at most 1.5.
9. MUST keep autoplay and loop off for any recording longer than 5 s on a docs page or README, or provide a pause control. Rationale: WCAG 2.2.2 Level A. Verify: asciinema player options have no `autoPlay: true` and no `loop: true`; no `<img src="*.gif">` over 5 s in a README (`ffprobe -show_entries format=duration`).
10. MUST compute the recording theme's contrast and fail under 4.5:1 for any palette colour the session prints (3:1 only for text of 24 px or 18.5 px bold on the final surface). Rationale: WCAG SC 1.4.3 covers images of text. Verify: relative-luminance script from the SC 1.4.3 page formula over the theme `fg`, `bg` and 16 palette entries (cast header `theme` object or VHS theme).
11. SHOULD disclose in the reference file that the catalog's css-theming rule carries no contrast threshold, and either add one there or cite SC 1.4.3 directly. Rationale: this dive could not reuse it. Verify: `grep -n -i contrast rules/css-theming.md` is non-empty after the fix.
12. SHOULD render to mp4 and grab a frame for any check (`ffmpeg -sseof -0.2 -i x.mp4 -frames:v 1 f.png`) rather than rely on VHS `Output dir/`. Rationale: the directory form wrote no frames in v0.12.1. Verify: output file exists after the render step.
13. SHOULD re-record the fleet's 180-column casts at or under 100 columns, or pin them to a column width that keeps 6 px. Rationale: 3.9 px at an assumed 720 px column. Verify: header `width` at most the cap for the measured content width.

## What an agent must not decide alone

- Whether to change the fleet's existing 180-column casts (a brand and content decision; the 720 px column width must be measured on the live site first).
- Whether the 8 px target becomes MUST: the human-reading margin is untested; the owner decides how strict the gate is.
- Whether to design to the stricter Meta-ads bottom margin (40%, y 1152) for paid placements.
- Whether any recording shown to the public contains real hostnames, tokens, usernames or customer data (scrub is a separate dive; the decision to publish is the owner's).
- Whether a vendor-supplied or third-party voice, music or screen element can be used (license).

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Sets `Set FontSize 28` or "zoom in" and believes the text is large | Columns at or under the cap (rule 1 and 2); OCR a downscaled frame |
| Trusts `Output frames/` and finds no PNGs, or a GIF | File-exists check on the final artifact |
| Cites a Tella or ManyPixels number as a platform spec | Reference-file lint on provenance labels |
| Copies "Instagram 14% / 35% / 6%" as official | Source label "third-party, unverified at Meta" |
| Reads the css-theming file for a contrast rule and invents one | grep of the rule file; fall back to WCAG SC 1.4.3 |
| Sets `idle_time_limit` but records 16 to 66 s of content and calls the limit "the duration" | Header key check plus event-gap script |
| Combines `Set Columns` and `Set Width` in one tape | VHS README says they cannot be combined; grep both in one tape |
| Assumes a 360x640 LinkedIn floor | Fetch the spec; the Videos API page has no resolution rule |

## Contested / evolving

- Safe-zone sources disagree on the bottom margin for ads: 35% (Tella, repeating Meta) versus 40% for ads with disclaimers (third-party tools reported by search, unverified) versus roughly 250 px top and 340 px bottom (community heuristics). The enforced rectangle uses the 35% organic figure; owners of paid campaigns choose the stricter line.
- Shorts left margin: Tella lists 48 px; TikTok's template implies 120. Treated by union; if a platform publishes official figures, replace.
- Burned-in text versus separate caption files: scout cites WCAG 1.2.2 for open captions and Instagram ranking commentary against majority-text Reels. Not re-fetched here; outside this dive.
- OCR score is a proxy. A human legibility test (phone, real viewers) could move the floor either way; I did not run one.
- The WCAG 1.4.4 resize criterion (200% without assistive technology, [SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), updated 06 September 2026) excludes captions and images of text, and 1.4.10 reflow (320 CSS px wide, [SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), updated 04 October 2026) lists video among the two-dimensional exceptions. Neither sets a text size for video; they only mean a recording is not forced to reflow. Use them only for that context, which is why the floor above does not rest on them.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/charmbracelet/vhs/blob/main/README.md | VHS settings reference (primary) | fetched 2026-11-27, no page date | Columns, Rows, FontSize, Padding, PlaybackSpeed, no defaults for size |
| https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html | WCAG SC 1.4.4 Understanding (primary) | updated 06 Sep 2026 | Resize and image-of-text exclusion |
| https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | WCAG SC 1.4.10 Understanding (primary) | updated 04 Oct 2026 | 320 CSS px, video exception |
| https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | WCAG SC 1.4.3 Understanding (primary) | updated 04 Oct 2026 | 4.5:1 and 3:1, luminance formula |
| https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | WCAG SC 2.2.2 Understanding (primary) | updated 04 Oct 2026 | 5 s autoplay rule |
| https://support.google.com/youtube/answer/10059070 | YouTube Shorts help (platform) | no date, footer 2026 | 3 min, 1080p; no safe zone |
| https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads | TikTok In-Feed ad specs (platform) | no date | 9:16, 540x960, templates only |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | LinkedIn Videos API (platform) | ms.date 2026-02-12, updated 2026-03-02 | Length, size, MP4, captions; no 360x640 |
| https://docs.asciinema.org/manual/agg/usage/ | agg usage (primary) | no date, copyright 2023 | idle 5 s, speed 1 |
| https://docs.asciinema.org/manual/player/options/ | asciinema player options (primary) | no date, copyright 2023 | idleTimeLimit, fit, autoplay, loop defaults |
| https://docs.asciinema.org/manual/asciicast/v2/ | asciicast v2 spec (primary) | no date | header idle_time_limit |
| https://www.tella.com/help/editing/social-safe-zones | Safe-zone numbers, vendor data | no date | Shorts and Reels figures, third party |
| https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs | TikTok safe zone, third-party measurement | 11 Nov 2026 | Scaling derivation from 720x1280 template |
| local: `~/.cache/research-lang/exemplars/product/vid-legib2/` and `/home/mherwig/dev/grimoire-rs/grimoire/docs/public/casts/` | Own measurements (renders, OCR sweep, fleet cast scan) | 2026-11-27 | Source of all derived numbers |

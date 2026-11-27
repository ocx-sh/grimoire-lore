---
title: Accessibility gates for published terminal and product demo recordings
program: product
sub_program: channels
topic: channel-terminal-video
worker: vid-accessibility
date_researched: 2026-11-27
model: sonnet
sources_fetched: 26
scope: WCAG 2.2 criteria 1.2.1, 1.2.2, 1.2.3, 1.2.5, 1.2.4 (pointer only), 1.4.2, 2.2.2, 2.3.1 applied to terminal casts and screen-recorded demos; caption delivery on YouTube and LinkedIn; asciinema player accessibility; measurements on the Grimoire docs cast pages. Not covered - recording pipeline choice, secret scrubbing, legibility (sibling dives), legal deadlines (marketing law; one line below).
---

# Accessibility gates for published recordings

## Table of contents
1. Summary
2. Findings (F1 criteria map, F2 captions, F3 silent screencasts and asciicast, F4 transcripts, F5 flashing, F6 pause and audio, F7 platform delivery, F8 measurements, F9 scout figures re-fetched)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Appendices A to C (axe.mjs, flash.mjs, remaining commands)
9. Sources

## Summary
- A silent screencast is "video-only" under WCAG, so SC 1.2.1 (Level A) governs it, not 1.2.2, 1.2.3 or 1.2.5. The scout rows that route silent demos to 1.2.3/1.2.5 are wrong; those apply to synchronized media (audio plus video).
- Silent demo MUST ship a text alternative that describes the visual information in sequence (W3C technique G159) or an audio track (G166). A text-only `.cast` file is not that alternative on its own: it holds keystroke-timed escape sequences, not a described sequence.
- Narrated demo MUST have captions (1.2.2, A) and MUST have audio description or a media alternative (1.2.3, A); 1.2.5 (AA) then requires audio description itself. Narration that speaks every on-screen command and result needs no extra description (W3C: nothing in the video track that the audio track lacks).
- A descriptive transcript (speech plus visuals) is the one artifact that serves 1.2.1, 1.2.3 and deaf-blind users at once; W3C calls it required for Deaf-blind users.
- Open (burned-in) captions satisfy 1.2.2 (technique G93) but cannot be turned off, can cover terminal output, and are not machine-readable. Ship a caption file everywhere the platform takes one.
- Captions are delivered as a file on YouTube (.srt, .sbv and .vtt among the accepted types; SRT and SBV must be UTF-8; [file types](<https://support.google.com/youtube/answer/2734698>), page undated, latest Internet Archive capture 2026-11-04 of the sibling page 2734796, text re-read live 2026-11-27) and on LinkedIn (one English SRT per video via the API, [Videos API](<https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11>), ms.date 2026-02-12; SRT attach in the desktop UI, [help 93997](https://www.linkedin.com/help/linkedin/answer/93997), last updated about 2021, derived from "5 years ago"). Auto captions exist on both ([YouTube](<https://support.google.com/youtube/answer/2734796>): default language only; [LinkedIn help a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587): 10 languages, last updated about April 2025, derived) but are unreviewed.
- Flashing (2.3.1, A): limit is more than three flashes per second, unless below general/red thresholds. A general flash needs a luminance swing of at least 10 percent of max (relative luminance) with the darker state below 0.80, over an area above 25 percent of a 10-degree field (341x256 px at 1024x768).
- Measured: the Grimoire quickstart cast, rendered, had a maximum frame-to-frame mean relative-luminance change of 0.0039 (threshold 0.10), so it passes by a wide margin; the dark terminal theme is the reason. Light-theme full-screen clears are the real risk.
- Auto-playing animation longer than 5 s next to other content needs pause/stop/hide (2.2.2, A). The Grimoire embed never autoplays, which sidesteps the criterion.
- Auto-playing audio longer than 3 s needs a control (1.4.2, A). Browsers block audible autoplay already ([MDN Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), last modified 2026-09-10), so the rule is mostly: autoplay only muted, with `controls`.
- asciinema-player 3.17.0 (fleet-vendored) publishes no accessibility guidance; the [shortcuts page](https://docs.asciinema.org/manual/player/shortcuts/) lists shortcuts that act on the focused player (HTTP Last-Modified 2026-08-14 is the docs-site build time, not a page edit date; the latest player release is 3.19.0 on 2026-11-22 per [GitHub releases](https://github.com/asciinema/asciinema-player/releases), 3.17.0 was 2026-06-30), and the [options page](https://docs.asciinema.org/manual/player/options/) documents `autoPlay`, `loop`, `controls` and `idleTimeLimit`. Measured: the `.ap-player` node carries no role, tabindex or aria-label. axe-core 4.14.1 found 0 violations on both cast pages and 1 incomplete check (color-contrast) that needs manual review.
- Raw-cast `<noscript>` link (measured, F8) is a download, not a transcript. Fleet currently has no transcript for any of 11 casts.

## Findings

### F1. Criteria map for demo recordings
| Recording type | Criteria that bite | Level | Source |
|---|---|---|---|
| Silent terminal cast or silent screen video (no audio track) | 1.2.1 text alternative or audio track; 2.2.2 if autoplays over 5 s; 2.3.1 | A | [1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html) (page updated 06 September 2026) |
| Narrated demo (audio plus video) | 1.2.2 captions; 1.2.3 audio description or media alternative; 1.2.5 audio description; 1.4.2 if audio autoplays over 3 s | A / A / AA / A | [1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html) (10 August 2026), [1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html) (10 August 2026), [1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html) (09 March 2026), [1.4.2](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html) (04 October 2026) |
| Live webinar or stream | 1.2.4 live captions (AA); not researched here | AA | scout row only |

All pages are W3C WCAG 2.2 Understanding documents (authority itself). Each carries its own update date; they differ, so any rule that cites WCAG text needs the per-page date.

### F2. Captions for narrated demos (1.2.2)
- Requirement: captions for all prerecorded audio in synchronized media, except a labeled media alternative for text ([1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)).
- Captions cover speech and meaningful non-speech sound, speaker identity; they must not block relevant visual information. For a terminal demo that means a bottom caption band must not cover the prompt line.
- Sufficient techniques listed: G93 open captions; G87 closed captions (H95 `<track>` element is the HTML way).
- The page does not address video with no audio and says nothing about screencasts. It is silent, not permissive. Silent video falls to 1.2.1.

### F3. Silent screencasts and text asciicast
- 1.2.1: for prerecorded video-only media, provide either an alternative for time-based media or an audio track presenting equivalent information ([1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)). Situation B techniques: G159 (text document describing visual information in sequence), G166 (audio track describing the video, labeled as audio description). H96 (`<track>` descriptions) is advisory only.
- 1.2.3 and 1.2.5 are scoped to synchronized media. For narrated demos W3C says audio description is unnecessary when all important video information is already in the audio ([1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html), [1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html)). Practical test: remove the picture; could a listener reproduce the commands?
- Does a text asciicast plus transcript satisfy it? Judgment, not a W3C statement. The WCAG pages never mention screencasts or terminal recordings. Reading: the cast player renders a timed visual presentation, so treat it as video-only and require a G159-style transcript. The cast file being text helps copy/paste ([asciinema player manual](https://docs.asciinema.org/manual/player/): recordings are "just text", so content can be selected and copied), but the file is an event stream with escape sequences and delays, which is not an in-sequence description. The conservative gate is: cast plus a prose or code-block transcript on the same page. No source found that tests this reading in a court or audit; see Contested.

### F4. Descriptive transcripts
[W3C WAI media guide](https://www.w3.org/WAI/media/av/) (updated 17 September 2024): a transcript is the text of speech and non-speech audio; a descriptive transcript also describes visuals and is "required to provide video content to people who are both Deaf and blind". Description covers on-screen text such as titles and email addresses. It adds that description is easier when planned into the script. For terminal demos, a descriptive transcript is a command-and-output listing with a one-line prose lead per step.

### F5. Flashing (2.3.1)
From [2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) (page updated 17 September 2025; Level A): content passes with three or fewer flashes in any one-second period, or when flashes are below both thresholds. General flash: opposing relative-luminance changes of 10 percent or more of max (1.0), darker image below 0.80. Red flash: saturated red transitions (R/(R+G+B) at least 0.8, chromaticity difference above 0.2 in CIE 1976 UCS). Area threshold: concurrent flashes covering more than 25 percent of any 10-degree field (0.006 sr), approximated by a 341x256 px block at 1024x768 (87,296 CSS px). Analyze at the largest scale users may view (full-screen) and loop GIFs while looping. Fine balanced patterns (squares under 0.1 degree) are exempt. PEAT-class tools analyze captures.
Terminal-specific sources of flashing: `clear`/alternate-screen switches on a light theme, `watch` redraws, progress bars with inverse video, and auto-zoom (Screen Studio-type) cross-fades. A dark theme (mean relative luminance about 0.01 to 0.02 in the fleet) cannot reach a 0.10 swing from full-frame clears.

### F6. Pause, stop, hide; audio control
- 2.2.2: moving, blinking or scrolling content that starts automatically, lasts over 5 s and sits beside other content needs pause/stop/hide; content that starts on focus, hover or scroll-into-view counts as automatic ([2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), page updated 04 October 2026).
- 1.4.2: automatic audio over 3 s needs pause/stop or independent volume; muting system volume does not count; failure F93 is an autoplay HTML5 media element with no way to pause ([1.4.2](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html), 04 October 2026).
- Browser behavior: muted autoplay allowed, audible blocked; muted autoplay should still carry `controls`; show a visible play button if blocked ([MDN Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), last modified 10 September 2026).
- asciinema player options: `autoplay` false by default, `loop` false by default, `controls` default `"auto"` (bar appears on mouse move and hides when still), `idleTimeLimit` caps pauses, and the docs warn that `audioUrl` with `autoplay: true` will not start audio ([options](https://docs.asciinema.org/manual/player/options/), no page date; HTTP Last-Modified 2026-08-14 is the site build; read 2026-11-27). `controls: "auto"` hides the controls from sighted mouse-idle users; set `controls: true` when the cast can loop.
- Keyboard: Space pause/resume, arrows seek 5 s, `f` fullscreen, `m` mute, `?` help; these work only when the player has focus ([shortcuts](https://docs.asciinema.org/manual/player/shortcuts/), no page date; HTTP Last-Modified 2026-08-14 is the site build; read 2026-11-27; the guess `/keyboard-shortcuts/` was a 404).

### F7. Caption delivery per platform
| Surface | Delivery | Format and limits | Date and kind |
|---|---|---|---|
| Own site `<video>` | Closed captions via `<track kind="captions" src=... srclang=...>` (H95 under G87); open captions G93 also sufficient | WebVTT is the `<track>` format | [1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html), 10 August 2026, authority |
| Own site asciicast | No caption concept (no audio). Provide descriptive transcript adjacent (F3) | n/a | judgment |
| YouTube | Studio, Subtitles, Add language: upload file (with or without timing), auto-sync a pasted transcript, or type manually; auto captions only in the video's default language; auto-sync not recommended for videos over an hour or poor audio | Basic .srt, .sbv, .sub, .mpsub, .lrc, .cap; advanced .vtt, .ttml, .dfxp, .smi, .rt; broadcast .scc, .stl and others; SRT and SBV must be plain UTF-8; no size limit listed | [add subtitles](https://support.google.com/youtube/answer/2734796) and [file types](https://support.google.com/youtube/answer/2734698); neither page states an update date (WebFetch of 2734796 on 2026-11-27 found only the footer "2026 Google"); latest Internet Archive captures 2026-11-04 ([2734796](http://web.archive.org/web/20261104140515/https://support.google.com/youtube/answer/2734796)) and 2026-10-13 ([2734698](http://web.archive.org/web/20261013213330/https://support.google.com/youtube/answer/2734698)); platform |
| LinkedIn desktop UI | Edit video preview, Select Caption, attach SRT, Post; captions appear after processing | SRT only named; help says the video "can't be posted without one" for this flow, which conflicts with the auto-caption help below | [help 93997](https://www.linkedin.com/help/linkedin/answer/93997), "Last updated: 5 years ago" read live 2026-11-27, so about 2021 (derived; the Internet Archive shows no content change after its 2022-06-17 capture); platform |
| LinkedIn help, video specs | Auto-captions in 10 languages (not named); a "Video Caption File" can replace them; caption file format not stated; mobile auto-captions only above a confidence score | 3 s (desktop) or 2 s (mobile) to 15 min; 75 KB to 5 GB; 256x144 to 4096x2304; 10 to 60 fps | [help a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587), "Last updated: 2 years ago" read live 2026-11-27; the 2025-11-16 [Internet Archive capture](http://web.archive.org/web/20251116010654/https://www.linkedin.com/help/linkedin/answer/a7174587) read "7 months ago", so last edited about April 2025 (derived, plus or minus a month); platform |
| LinkedIn Videos API | `initializeUploadRequest.uploadCaptions: true`, then POST a multipart file to `captionsUploadUrl` with metadata `{"format":"SRT","source":"USER_PROVIDED","transcriptType":"CLOSED_CAPTION","locale":{"language":"EN","country":"US"},...}`; one caption file per video; English only; for ads, caption processing must succeed for the video to serve; for feed, the video still serves if captions fail | 3 s to 30 min; 75 KB to 500 MB; MP4; 5 GB max per initialize | [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11), ms.date 2026-02-12, platform; Marketing version 202601 sunsets 2027-01-15 |
| Shorts / short-form | Same YouTube Studio path for Shorts; burned-in captions are the only reliable choice where no file slot exists, but collide with platform UI zones (scout rows 7 to 9, not re-fetched) | n/a | scout |
Burned-in versus file: burned-in satisfies 1.2.2 (G93) and survives every re-upload; file captions are toggleable, translatable and indexable, and the LinkedIn API explicitly tolerates a failed caption on feed video, so a feed video can go live captionless. Rule: file where a slot exists, burned-in only as the Shorts and autoplay-muted-feed fallback, and verify the caption actually attached after processing (API `captions` field present on GET video).

### F8. Measurements (commands and results)
Target: Grimoire docs build `/home/mherwig/dev/grimoire-rs/grimoire/docs/dist`, served on localhost with `python3 -m http.server 8765`. Date 2026-11-27.
- Fleet inventory: 11 casts in `dist/casts/` (`ls dist/casts | wc -l` printed 11); players load from `public/casts.js` with `autoPlay: false`, `idleTimeLimit: 2`, `fit: 'width'`; a `<noscript>` anchor links the raw cast: `<a href="/casts/quickstart.cast">Download the recording</a>`. OCX site (`ocx-sh/www-setup/site/src/components/Cast.astro`) renders a `Terminal` component only when the cast file exists; no autoplay or loop string found by `grep -rniE "autoplay|loop:|AsciinemaPlayer|data-cast|\.cast" src`.
- axe-core. The commanded `npx @axe-core/cli http://localhost:8765/quickstart.html` failed: "Server terminated early with status 127" (no chromedriver on the host). Replacement, same engine: Playwright 1.x headless Chromium with `axe-core` 4.14.1 injected, tags wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice, after scrolling the embed into view and waiting 2.5 s (script `axe.mjs`, reproduced in full in Appendix A; run `cd <scratch>/axe && npm i axe-core@4.14.1 playwright@1.65.1 pngjs@7 && npx playwright install chromium && python3 -m http.server 8765 --directory /home/mherwig/dev/grimoire-rs/grimoire/docs/dist & node axe.mjs http://localhost:8765/quickstart.html http://localhost:8765/index.html`). Results: `/quickstart.html` 0 violations, 40 passes, 1 incomplete (color-contrast, 17 nodes); `/index.html` 0 violations, 37 passes, 1 incomplete (color-contrast, 85 nodes). Incomplete means axe could not decide; manual contrast review of terminal theme colors is still needed (sibling dive owns contrast).
- Player DOM probe: `.ap-player` attributes dumped were only `class` and `style`; no `role`, `tabindex` or `aria-label` on that node; 3 buttons inside it; 0 `<video>`/`<audio>` elements. The player is not an HTML media element, so `<track>` captions and native controls do not apply.
- Flash. Script `flash.mjs` (full source in Appendix B; run `node flash.mjs` with the server above up): Playwright clicks the player, screenshots the `.ap-player` element in a loop for 9 s (100 frames, about 11 fps achieved), computes mean WCAG relative luminance per frame. Result: min 0.010, max 0.020, largest frame-to-frame mean change 0.0039 against the 0.10 general-flash threshold. Caveat: 11 fps undersamples flicker above 5 Hz, and mean luminance dilutes small bright regions; this is a screening check, not the PEAT-class analysis 2.3.1 names.
- Cast-level screen-clear scan: Python over each `dist/casts/*.cast` counting `ESC[2J`, `ESC[3J` and `ESC[?1049h` output events. 10 of 11 casts: 0 clears; `browse-tui.cast` (15.9 s): 2 clears, both within a 1 s window (max 2 per second, below the 3 per second limit). Durations 15.8 s to 56.2 s, so every cast exceeds the 5 s 2.2.2 threshold if it were ever to autoplay; today it does not.

### F9. Scout figures re-fetched
| Scout claim | Re-fetch result |
|---|---|
| VP#18/AE: 1.2.2 page 10 Aug 2026; 1.2.3/1.2.5 both 9 Mar 2026 | [1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html) reproduces (10 Aug 2026). [1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html) page is 10 Aug 2026; only [1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html) is 9 Mar 2026. Scout date for 1.2.3 FAILS |
| 2.3.1, 2.2.2, 1.4.2 dates "not stated" | [2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html): 17 Sep 2025; [2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) and [1.4.2](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html): 04 Oct 2026; [1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html): 06 Sep 2026 |
| VP#16: silent demo needs 1.2.3/1.2.5 description | FAILS: those apply to synchronized media; silent video is 1.2.1 ([1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html), 06 Sep 2026) |
| VP#15: "a demo with no speech may still need text" under 1.2.2 | Right outcome, wrong criterion: [1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html) |
| VP#12/LC#28 LinkedIn: 3 s to 30 min, 75 KB to 500 MB, MP4 (API) | Reproduces for the [API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11) (ms.date 2026-02-12). The [help page](https://www.linkedin.com/help/linkedin/answer/a7174587) (about April 2025, derived) states 15 min and 5 GB; the two disagree (Contested). A third help page ([a564109](https://www.linkedin.com/help/linkedin/answer/a564109), "Last updated" not re-read) states "cannot exceed 100 MB" in general media notes, not a video section |
| SF#14 one English-only SRT | Reproduces from the [API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11) (2026-02-12; one file, English only). The help pages ([a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587), [93997](https://www.linkedin.com/help/linkedin/answer/93997)) do not say English only |
| LC#28 auto captions in 10 languages | Reproduces ([a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587), live 2026-11-27, last updated about April 2025 derived); languages not named |
| YS#18 / YP#30 auto captions default language only; .srt beginner | Reproduces: [2734796](https://support.google.com/youtube/answer/2734796) says "Automatic captions will be in the video's default language only" (page undated; Internet Archive capture 2026-11-04); [2734698](https://support.google.com/youtube/answer/2734698) lists .srt among "Basic" and .scc preferred for CEA-608 (undated; capture 2026-10-13) |
| SF#16 3 flashes, 0.006 sr, 341x256 | Reproduces ([2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), 17 Sep 2025) |
| VP#19 browsers block audible autoplay; `playsinline` for Safari | [MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) last modified 2026-09-10: muted autoplay allowed; the fetched summary did not mention Safari or `playsinline` beyond the example; re-verify |
| VP#31 Screen Studio `.srt` export | Not re-fetched (vendor claim, belongs to the pipeline sibling dive); no rule here depends on it |
| Legal: ADA Title II and the EAA | Named only: marketing law owns them |

## Normative guidance candidates
1. MUST give every published silent demo (cast or silent video) a text alternative describing the visuals in sequence, on the same page, before or after the player. Why: SC 1.2.1 (A). Verify: grep the page for a transcript container adjacent to the embed (`<details>` or `section` containing a code block) and for a link; fail example, a page with only `<div data-cast>` and a `<noscript>` download link; pass example, the same embed followed by "Transcript" with each command and its output.
2. MUST NOT count the raw `.cast` download as the text alternative. Why: it is an event stream, not a described sequence. Verify: the transcript link target is not `*.cast`.
3. MUST give narrated video a caption file (SRT or VTT, UTF-8) that matches the narration. Why: 1.2.2 (A). Verify: `ffprobe -v error -show_streams video | grep -c codec_type=audio` non-zero implies a sibling `.srt` or `.vtt` exists; `iconv -f UTF-8 -t UTF-8 file.srt >/dev/null`; cue start times strictly ordered; sample ten cues against the audio.
4. MUST name on-screen commands in narration or in the descriptive transcript. Why: 1.2.3 (A) and 1.2.5 (AA). Verify heuristic: every command shown in frame appears verbatim in narration or transcript; fail example, "now run this" while the command sits on screen; pass example, "run `ocx install node`".
5. SHOULD ship a descriptive transcript (speech plus bracketed visual events) for every narrated video longer than 60 s. Why: Deaf-blind users; also search indexing. Verify: transcript present and contains at least one bracketed visual description per scene.
6. MUST keep burned-in captions off the terminal's active region: bottom 15 percent safe band or a letterboxed strip. Why: 1.2.2 forbids captions that block relevant visual information. Verify: frame-grab at three cue times; caption bbox does not intersect the prompt row.
7. MUST NOT autoplay a recording with an audio track unmuted. Why: 1.4.2 (A) and browser blocking. Verify: `grep -E "<video[^>]*autoplay" | grep -v muted` returns nothing; `autoplay` always with `muted playsinline controls`.
8. MUST give any recording that autoplays or loops for over 5 s a visible pause control; SHOULD NOT autoplay at all. Why: 2.2.2 (A). Verify: asciinema embed options show `autoPlay: false` or `controls: true`; `<video autoplay>` has `controls`; loop only when stoppable.
9. MUST keep flashing at or below three per second and keep any flash below the thresholds (10 percent relative luminance swing, 25 percent of a 10-degree field). Why: 2.3.1 (A), seizure risk. Verify: run a frame-difference screen (script F8) over the render at full-frame; fail if max frame-to-frame mean relative-luminance change is 0.10 or more or more than three sign reversals in any 1 s window; run PEAT-class analysis when the theme is light or when a clip uses crossfade, shake or auto-zoom.
10. MUST NOT use `clear`, alternate-screen entry or inverse-video flicker more than three times per second in a demo script. Why: three flashes per second is the SC 2.3.1 (Level A) ceiling ([2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), page 17 Sep 2025), and full-screen clears are the terminal events that produce a full-frame luminance swing, most of all on a light theme. Verify: cast scan counting `\x1b\[2J`, `\x1b\[3J`, `\x1b\[?1049h` per second (script F8).
11. SHOULD record demos on a dark theme or cap luminance steps; CONSIDER a reduced-motion variant (no auto-zoom) for marketing cuts. Why: the 2.3.1 general-flash test needs a relative-luminance swing of 10 percent or more with the darker state below 0.80 ([2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), 17 Sep 2025); measured on the fleet's dark cast the largest frame-to-frame mean change was 0.0039 (F8), far below the 0.10 swing. A light theme has a darker state above 0.80 for a full-frame clear to a white background, which sits outside the general-flash definition only while the darker state stays above 0.80, so rule 9 still requires the numeric screen for light themes instead of assuming. Verify: theme background relative luminance; export settings show zoom disabled.
12. MUST upload a caption file to YouTube for every narrated video and check the language setting; MUST NOT rely on auto captions alone. Why: YouTube states "Automatic captions will be in the video's default language only" ([add subtitles](https://support.google.com/youtube/answer/2734796), page undated, Internet Archive capture 2026-11-04, text re-read 2026-11-27) and they are unreviewed, so 1.2.2 accuracy is unproven ([1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html), 10 Aug 2026). Accepted upload types and the UTF-8 requirement for SRT and SBV are on [file types](https://support.google.com/youtube/answer/2734698) (undated; capture 2026-10-13). Verify: YouTube Data API [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) returns a track in the video language whose `snippet.trackKind` is not `ASR` (the [captions resource](https://developers.google.com/youtube/v3/docs/captions) defines `snippet.trackKind` values `ASR`, `forced`, `standard` and `snippet.language` as a BCP-47 tag; both Google API pages state no revision date, were read 2026-11-27, and `captions.list` costs 50 quota units per call).
13. MUST, for LinkedIn native video via API, set `uploadCaptions: true` and upload SRT metadata `{"format":"SRT","source":"USER_PROVIDED","transcriptType":"CLOSED_CAPTION"}` with English locale; MUST then GET the video and confirm `captions` is present, because a feed video serves even when caption processing failed. Why: the [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11) (ms.date 2026-02-12, platform; Marketing version 202601 sunsets 2027-01-15) documents one English caption file per video and says feed videos still serve on caption failure, so success is not implied by a 2xx. Verify: GET `/rest/videos/{urn}` returns non-empty `captions`.
14. MUST burn in captions when the video is non-English or no file slot exists (LinkedIn API non-English, an autoplay-muted feed with no caption slot). Why: the [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11) (2026-02-12) takes English only, and open captions satisfy 1.2.2 via G93 ([1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html), 10 Aug 2026); the desktop UI and Shorts path are unverified for other languages (the scout's Shorts rows were not re-fetched here). Verify: the language of the audio versus the caption-file language field; burned-in cue text present in a frame grab.
15. SHOULD set `controls: true`, `fit: 'width'` and never `loop` on asciinema embeds, and SHOULD add a visible text hint of the keyboard shortcuts (focus the player, Space to pause). Why: the [options page](https://docs.asciinema.org/manual/player/options/) documents `controls: "auto"` (bar hides when the pointer is still) and `loop` default false, and the [shortcuts page](https://docs.asciinema.org/manual/player/shortcuts/) lists the keys that drive the player; both pages carry no edit date (HTTP Last-Modified 2026-08-14 is the site build; read 2026-11-27) and describe the current player (3.19.0, 2026-11-22; the fleet vendors 3.17.0), so re-check option names after a player upgrade. 2.2.2 still requires a pause control for anything that autoplays over 5 s ([2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), 04 Oct 2026). Verify: `grep -nE "controls|loop|autoPlay|autoplay" public/casts.js` shows `controls: true` and no `loop: true`.
16. MUST run axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa) on the rendered page with the player mounted and fail on any violation; treat `color-contrast` "incomplete" as a manual review item. Why: an automated engine catches name, role, contrast and landmark defects that the video-specific criteria do not cover, and it only sees the player if the player has mounted before the scan; measured here, axe 4.14.1 found 0 violations on both fleet pages but could not decide color-contrast (17 and 85 nodes), so a clean exit alone proves little (F8, Appendix A). Automated tools reach only part of WCAG, so this rule does not replace rules 1 to 9. Verify: `node axe.mjs <url>` equivalent; `npx @axe-core/cli <url> --exit` where a chromedriver exists.
17. SHOULD label the player region (`role="group"` plus `aria-label="Terminal recording: <title>"`) in the wrapper because the player node carries none. Why: measured absent. Verify: DOM probe for the label on the embed container.

## Dated facts
| Fact | URL | Source date | Kind |
|---|---|---|---|
| 1.2.2 Level A, captions for prerecorded synchronized media; open and closed captions both listed | https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html | 10 Aug 2026 | authority |
| 1.2.3 Level A, audio description or media alternative | https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html | 10 Aug 2026 | authority |
| 1.2.5 Level AA, audio description; skip when audio carries all important visual information | https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html | 09 Mar 2026 | authority |
| 1.2.1 Level A, video-only needs alternative (G159) or audio track (G166) | https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html | 06 Sep 2026 | authority |
| 2.2.2 Level A, 5 s threshold, starts-on-scroll counts as automatic | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | 04 Oct 2026 | authority |
| 1.4.2 Level A, 3 s threshold, F93 failure | https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html | 04 Oct 2026 | authority |
| 2.3.1 Level A, three flashes, 10 percent luminance, below 0.80, 25 percent of 10-degree field, 341x256 at 1024x768 | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html | 17 Sep 2025 | authority |
| Descriptive transcript required for Deaf-blind users | https://www.w3.org/WAI/media/av/ | 17 Sep 2024 | authority |
| LinkedIn Videos API: 3 s to 30 min, 75 KB to 500 MB, MP4, 5 GB per init, one English caption file, feed serves on caption failure | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11 | ms.date 2026-02-12 | platform |
| LinkedIn help: 15 min, 75 KB to 5 GB, auto captions in 10 languages, caption file optional | https://www.linkedin.com/help/linkedin/answer/a7174587 | live 2026-11-27 reads "Last updated: 2 years ago"; 2025-11-16 capture ([archive](http://web.archive.org/web/20251116010654/https://www.linkedin.com/help/linkedin/answer/a7174587)) read "7 months ago", so last edited about April 2025 (derived) | platform |
| LinkedIn help: attach SRT in desktop edit view | https://www.linkedin.com/help/linkedin/answer/93997 | live 2026-11-27 reads "Last updated: 5 years ago", so about 2021 (derived); latest content change in Internet Archive 2022-06-17 | platform |
| YouTube: upload with or without timing, auto captions default language only | https://support.google.com/youtube/answer/2734796 | page states no date; latest [Internet Archive capture 2026-11-04](http://web.archive.org/web/20261104140515/https://support.google.com/youtube/answer/2734796); text read 2026-11-27 | platform |
| YouTube: SRT/SBV plain UTF-8, WebVTT positioning, SCC preferred for CEA-608 | https://support.google.com/youtube/answer/2734698 | page states no date; latest [Internet Archive capture 2026-10-13](http://web.archive.org/web/20261013213330/https://support.google.com/youtube/answer/2734698); text read 2026-11-27 | platform |
| asciinema options: autoplay false, loop false, controls auto | https://docs.asciinema.org/manual/player/options/ | page states no date; HTTP Last-Modified 2026-08-14 (site build, `curl -sIL`); player release 3.19.0 on 2026-11-22 ([releases](https://github.com/asciinema/asciinema-player/releases)) | platform (project docs) |
| asciinema shortcuts: Space pause/resume, arrows seek, f fullscreen; act on the focused player | https://docs.asciinema.org/manual/player/shortcuts/ | page states no date; HTTP Last-Modified 2026-08-14 (site build) | platform (project docs) |
| MDN: muted autoplay allowed, audible blocked | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay | 10 Sep 2026 | independent docs |
| LinkedIn 15 min / 5 GB / 10 languages figures: see the a7174587 row above (derived date about April 2025; the "2 years ago" wording is the page's own rounding) | https://www.linkedin.com/help/linkedin/answer/a7174587 | as above | platform |
| ADA Title II and EAA deadlines | marketing law dive | n/a | not researched here |

## What an agent must not decide alone
- Whether to claim WCAG conformance (A or AA) on a page; that is a legal and brand statement.
- Whether a text asciicast counts as a media alternative for text for the organization's compliance posture; ask the owner or counsel.
- Whether to pay for human caption review or audio description vendors, and which.
- Whether to use AI voices or AI-generated captions in a recording and how to disclose them (platform and EU labeling are other dives).
- Whether to burn in captions on brand-controlled marketing cuts, since that changes layout and brand.
- Legal deadlines (ADA Title II, EAA): name them, route to marketing law.

## AI-agent angle
| Mistake | Smallest check |
|---|---|
| Treating silent casts as needing "captions" or "audio description" (1.2.3/1.2.5) and shipping a `.vtt` of nothing | rule 1: a transcript container exists; do not generate empty VTT |
| Cite one WCAG date for all pages; cite 2.3.1 as "3 flashes per frame" | per-page dates from the table; rule 9 numbers |
| Believe `<noscript>` download link satisfies the text alternative | rule 2 |
| Assume the player is a `<video>` and add `<track>` | DOM probe: no `video` element |
| Use `autoplay` on `<video>` without `muted`, assuming the browser handles it | rule 7 grep |
| Upload captions on LinkedIn once and assume success | rule 13 GET check |
| Offer SRT in Chinese or German to LinkedIn API | API is English only; burn in |
| Make a flash judgment by eye from a dark cast and extend it to a light theme | rule 9 numeric screen |
| Report `npx @axe-core/cli` passed when chromedriver was missing | require non-empty results block, not exit code alone |

## Contested / evolving
- Does a terminal recording need 1.2.1 at all? W3C pages never mention screencasts; the asciinema player is script-rendered text, not a media file. Reading A (this dive): it is video-only presentation, so yes. Reading B: it is text content with scripted animation, so only 2.2.2 and 2.3.1 apply and the text is already in the DOM-rendered canvas. No authority resolves it; the conservative gate is the transcript.
- LinkedIn limits: API doc (30 min, 500 MB; [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11)) versus help (15 min, 5 GB; [a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587), last edited about April 2025, derived) versus help a564109 (100 MB note). Use the stricter value for planning and verify in the live UI.
- LinkedIn caption path: old help says an SRT is required to post, newer help says auto-captions in 10 languages and an optional file. Treat the older page as stale until a dated source says otherwise; Videos API says captions are optional.
- Burned-in versus file captions: W3C accepts both (G93, G87); platform ranking claims against text-heavy short video appear in scout rows (Instagram), not re-fetched here.
- Audio description scope: W3C says narration that covers the visuals suffices; Microsoft's style guide, cited in the scout, says video needs both captions and audio descriptions. Not re-fetched; do not rely on it.
- Trend: WCAG 2.2 pages are being edited in 2026 (August and October dates); re-fetch dates before citing.

## Appendix A. axe.mjs (verbatim, as run)
Run from a directory with `npm i axe-core@4.14.1 playwright@1.65.1 pngjs@7` and `npx playwright install chromium` done. The commanded `npx @axe-core/cli` failed on this host ("Server terminated early with status 127", no chromedriver); this script is the substitute and uses the same engine. It prints a non-empty result block per URL, so a missing browser fails loudly instead of passing silently.

```js
import { chromium } from 'playwright';
import fs from 'fs';
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js','utf8');
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1280,height:900}});
for (const u of process.argv.slice(2)) {
  await p.goto(u); await p.evaluate(()=>document.querySelector('[data-cast]')?.scrollIntoView()); await p.waitForTimeout(2500);
  console.log(u, 'player mounted:', await p.evaluate(()=>!!document.querySelector('.ap-player')),
   'player tabindex:', await p.evaluate(()=>document.querySelector('.ap-player')?.getAttribute('tabindex')),
   'role/aria:', await p.evaluate(()=>{const e=document.querySelector('.ap-player');return e&&[e.getAttribute('role'),e.getAttribute('aria-label')]}),
   'noscript:', await p.evaluate(()=>!!document.querySelector('noscript')),
   'media-attrs:', await p.evaluate(()=>document.querySelectorAll('video,audio').length));
  await p.evaluate(axeSrc);
  const r = await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']}}));
  console.log(' violations:', r.violations.length, 'passes:', r.passes.length, 'incomplete:', r.incomplete.length);
  for (const v of r.violations) console.log('  -', v.id, v.impact, v.nodes.length, v.nodes[0].target.join(' '));
  for (const v of r.incomplete) console.log('  ? ', v.id, v.nodes.length);
}
await b.close();
```

## Appendix B. flash.mjs (verbatim, as run)
Needs the same install and the server from F8 (`python3 -m http.server 8765 --directory <docs dist>`). Screening check only, see the F8 caveat.

```js
import { chromium } from 'playwright'; import { PNG } from 'pngjs';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://localhost:8765/quickstart.html');
await p.evaluate(()=>document.querySelector('[data-cast]').scrollIntoView()); await p.waitForTimeout(2000);
console.log(await p.evaluate(()=>{const w=document.querySelector('.ap-wrapper'),pl=document.querySelector('.ap-player');return {wrapper:w&&[...w.attributes].map(a=>a.name+'='+a.value), player:pl&&[...pl.attributes].map(a=>a.name+'='+a.value).slice(0,8), btn:[...document.querySelectorAll('.ap-player button,.ap-player [role=button]')].length, noscript:document.querySelector('noscript')?.textContent.trim().slice(0,160)}}));
const incomplete = await p.evaluate(async()=>{});
const el = await p.$('.ap-player');
await p.click('.ap-player'); // starts playback
const t0=Date.now(); const lum=[]; 
while(Date.now()-t0<9000){const t=Date.now()-t0; const png=PNG.sync.read(await el.screenshot({type:'png'}));
 let s=0;const n=png.width*png.height;for(let i=0;i<png.data.length;i+=4){const f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};s+=.2126*f(png.data[i])+.7152*f(png.data[i+1])+.0722*f(png.data[i+2])}
 lum.push([t,s/n]);}
let maxd=0,flashes=0,prevDir=0;for(let i=1;i<lum.length;i++){const d=lum[i][1]-lum[i-1][1];maxd=Math.max(maxd,Math.abs(d));}
console.log('frames',lum.length,'achieved fps',(lum.length/9).toFixed(1),'min lum',Math.min(...lum.map(x=>x[1])).toFixed(3),'max lum',Math.max(...lum.map(x=>x[1])).toFixed(3),'max frame-to-frame mean-luminance delta',maxd.toFixed(4));
await b.close();
```

## Appendix C. Remaining F8 commands
- Inventory: `ls dist/casts | wc -l` printed 11.
- Embed options: `grep -nE "autoPlay|idleTimeLimit|fit" public/casts.js` in the grimoire docs tree.
- OCX embed: `grep -rniE "autoplay|loop:|AsciinemaPlayer|data-cast|\.cast" src` in `ocx-sh/www-setup/site`.
- Screen-clear scan: Python 3 over `dist/casts/*.cast`, parsing each JSON event line and counting output events whose data contains `\x1b[2J`, `\x1b[3J` or `\x1b[?1049h`, grouped by whole second of the event time.
- Date proxies for undated pages: `curl -sIL <url>` for HTTP Last-Modified; `curl -s "https://archive.org/wayback/available?url=<url>&timestamp=20261127"` for the latest capture; `curl -s "https://web.archive.org/cdx/search/cdx?url=<url>&output=txt&fl=timestamp,digest&collapse=digest"` for content-change history.

## Sources
| URL | What | Date | Why |
|---|---|---|---|
| https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html | SC 1.2.2 Understanding | 10 Aug 2026 | caption rule, G93 and G87 |
| https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html | SC 1.2.3 | 10 Aug 2026 | media alternative definition |
| https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html | SC 1.2.5 | 09 Mar 2026 | audio description, narration exemption |
| https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html | SC 1.2.1 | 06 Sep 2026 | silent video rule, G159, G166 |
| https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | SC 2.2.2 | 04 Oct 2026 | 5 s rule |
| https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html | SC 2.3.1 | 17 Sep 2025 | flash thresholds |
| https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html | SC 1.4.2 | 04 Oct 2026 | 3 s audio rule |
| https://www.w3.org/WAI/media/av/ | WAI media guide | 17 Sep 2024 | descriptive transcript |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2025-11 | LinkedIn Videos API | 2026-02-12 | caption upload flow |
| https://www.linkedin.com/help/linkedin/answer/a7174587 | LinkedIn video specs help | about April 2025 (derived) | limits, auto captions |
| https://www.linkedin.com/help/linkedin/answer/93997 | LinkedIn caption help | about 2021 (derived) | SRT attach steps |
| https://www.linkedin.com/help/linkedin/answer/a564109 | LinkedIn media help | undated | 100 MB note, formats |
| https://support.google.com/youtube/answer/2734796 | YouTube add subtitles | undated; archive capture 2026-11-04 | upload paths |
| https://support.google.com/youtube/answer/2734698 | YouTube file formats | undated; archive capture 2026-10-13 | formats, UTF-8 |
| https://docs.asciinema.org/manual/player/ | asciinema player manual | undated | text selection, features |
| https://github.com/asciinema/asciinema-player/releases | player releases | 3.19.0 on 2026-11-22 | version currency |
| https://web.archive.org/cdx/search/cdx?url=www.linkedin.com/help/linkedin/answer/93997 | Internet Archive index | queried 2026-11-27 | date proxy for undated help pages |
| https://docs.asciinema.org/manual/player/options/ | player options | undated | autoplay, loop, controls |
| https://docs.asciinema.org/manual/player/shortcuts/ | shortcuts  | undated | focus requirement |
| https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay | MDN autoplay | 10 Sep 2026 | autoplay policy |

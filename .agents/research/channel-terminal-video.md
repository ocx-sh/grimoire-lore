---
title: Terminal and product demo recordings
topic: channel-terminal-video
program: product
sub_program: channels
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: CH-VID
consolidates:
  - channel-terminal-video/vid-pipeline-choice.md
  - channel-terminal-video/vid-legibility-thresholds.md
  - channel-terminal-video/vid-accessibility.md
  - channel-terminal-video/vid-scrub-and-reproducibility.md
grounding:
  - product-audit/exemplar-readmes.md
  - product-audit/distribution-posture.md
  - product-audit/exemplar-landing-pages.md
  - product-audit/site-shape.md
  - product-audit/ui-code-posture.md
  - product-audit/config-inventory.md
reconciles_with:
  - skills/docs-quality-reference/examples.md (DOC-EX-11 to DOC-EX-18)
---

# Terminal and product demo recordings

Question: Which recording pipeline should a software team use for product demos on each surface (docs site, README, YouTube, LinkedIn, Shorts), and which legibility, accessibility and secret-scrub gates must every recording pass?

Placement: the procedure (scenario or tape, render, flatten, scan, diff, legibility and caption checks) goes in a `terminal-demo` skill, because it is a multi-step workflow with scripts. The channel-publishing rule carries one line: CH-VID-26, "no recording is committed or uploaded without a passing terminal-demo gate report". That line is read on every publish task. The skill is loaded only when a recording is made.

## Verdict

1. **One source, many renders.** Every demo comes from a committed script that drives the real binary and asserts its output. The fleet's YAML scenarios (`grimoire-rs/grimoire/test/recordings/casts/*.yaml`, run by `test_record_casts.py`, which rejects a step with no `expect`) are the reference shape. A VHS `.tape` is the second accepted source; in a repository that already has a page-bound scenario tree, add a tape only with a recorded reason (DOC-EX-18, SHOULD). A hand recording is never committed. Screen recording is allowed only for GUI demos (the VS Code extension, `grim-gui`), and it still needs a written shot script. Whether the recording file itself is committed is decided by docs-quality DOC-EX-13, not by this ruleset (see the first conflict below).
2. **Form per surface, decided.**
   - Docs sites (Astro and MkDocs): an asciicast played by a vendored, lazily loaded asciinema-player with `autoPlay: false`.
   - README: a still screenshot that links to the docs page with the player. An animated GIF is allowed only when it plays for 5 seconds or less and does not loop.
   - YouTube and LinkedIn: an H.264 MP4 rendered from the same scenario or tape.
   - Shorts and other vertical video: a separate narrow tape. Never crop a landscape recording.
   - Remotion: only for produced explainer or launch video, and only after the owner signs off on the licence.
   The measured sizes for one 16 s session support this choice: cast 4,653 B, VHS MP4 38,181 B, VHS GIF 68,110 B, agg GIF 121,514 B ([vid-pipeline-choice §3](channel-terminal-video/vid-pipeline-choice.md)).
3. **Legibility is set by columns, not by font size.** The measured law is rendered x-height ≈ 0.98 × display width ÷ columns, and FontSize cancels out ([vid-legibility §1.2](channel-terminal-video/vid-legibility-thresholds.md)). The floor is 6 px x-height and the target is 8 px. Both are DERIVED from one OCR engine on 2026-11-27, not from a platform or a human study, and must stay labelled that way.
4. **A silent recording is video-only content under WCAG SC 1.2.1.** It needs an in-page text alternative that lists every command in order. A downloadable `.cast` file does not count. Captions (1.2.2) and audio description (1.2.3, 1.2.5) apply only to narrated video.
5. **Scrub at the source, then scan the flattened text.** Record in an isolated environment and re-record to fix a leak. Never edit the finished media. A secret scan of the raw `.cast` file is not a gate: raw `gitleaks dir` caught 1 of 4 synthetic casts holding the same fake token, and the flattened text caught 4 of 4 ([vid-scrub §4](channel-terminal-video/vid-scrub-and-reproducibility.md)).
6. **Regeneration is checked as normalised text, never as bytes.** VHS GIF, MP4 and WebM output differed between two identical runs. agg output and VHS `golden.txt` were stable. The fleet's casts also embed a random temp directory and a random port.
7. **Platform numbers are fetched and dated, never remembered.** When two first-party pages disagree, plan to the stricter value. The vertical safe rectangle is a DERIVED union of third-party figures, because no platform publishes one.
8. **Documented gap: recording-theme contrast is only partly checkable.** The palette script (Appendix A) checks the theme foreground and the 16 ANSI entries a cast uses. It cannot check SGR 2 (dim), whose colour the renderer computes, or 256-colour and truecolour output. Three fleet casts use dim and one uses extended colour, so those stay a manual check (CH-VID-12).

Conflicts between the dives, and with the catalog, resolved:

- **Committed recordings and CI regeneration against docs-quality DOC-EX-13 and DOC-EX-11.** DOC-EX-13 (MUST pinned, [examples.md](../../skills/docs-quality-reference/examples.md) "The recording layer") says "Commit a recording only when no build step regenerates it". DOC-EX-11 (MUST pinned, same table) keeps the recorder out of the required gate. Earlier text of CH-VID-01, CH-VID-24 and CH-VID-26 read as requiring committed casts, a failing CI regeneration job, and a gate that is a `needs:` dependency. **Decision:** the pinned docs-quality rules win, because they are pinned and docs-quality owns where recordings live. This ruleset is rewritten to fit them: CH-VID-01 requires a scenario that can regenerate a recording on demand, and leaves the commit decision to DOC-EX-13. CH-VID-24 is a non-required drift check that writes into a scratch directory and never replaces the committed file, so it is not a build step that regenerates the recording. Where a build does regenerate the recording, DOC-EX-13 forbids committing it and CH-VID-24 does not apply. CH-VID-26 gates only upload and publish jobs, never the required status checks of the example suite, so the DOC-EX-11 check ("disable the recording step and re-run the required gate; the result must not change") still passes. The grimoire fleet already fits: casts are tracked (`git -C grimoire-rs/grimoire ls-files docs/public/casts`), and the only regenerator is the manual `task test:demo` (`grimoire-rs/grimoire/test/taskfile.yml:234`), not the docs `build` script (`docs/package.json:10`, `astro build`). If the owner reads DOC-EX-13 as also covering a scratch-directory drift check, CH-VID-24 is retired for that repository.
- **Other docs-quality overlaps, no conflict.** DOC-EX-12 (real commands, no fabricated transcript) and CH-VID-01 say the same thing; DOC-EX-12 is the cited authority for docs sites. DOC-EX-15 (no autoplay) and CH-VID-02 agree. DOC-EX-16 accepts the player's default `controls: "auto"`; CH-VID-18 asks for `controls: true` at SHOULD, which is stricter and does not contradict it. DOC-EX-14 (state the cast and player versions) overlaps CH-VID-06 and CH-VID-07.
- **Temp paths and ports: leak or noise?** vid-pipeline rule 10 treats `/tmp/grim-cast-3vgxhmm4`, `/home/runner` and `localhost:53703` as scrub failures. vid-scrub counts them and finds nothing identifying. **Decision:** random temp directories, loopback ports and a generic CI home (`/home/runner`) do not block publication. They are determinism defects, handled by CH-VID-23. Publication is blocked only by identity data: a real user, a real host, an email address, a private domain or a non-generic home segment (CH-VID-21). Reason: a block only helps if it guards something sensitive, and the fleet recorder deliberately allocates the port per run (`grimoire-rs/grimoire/test/recordings/casts/quickstart.yaml:17`, comment on the `grim add` step).
- **Is a raw secret scan enough?** vid-pipeline counted a clean raw `gitleaks` run as a pass. vid-scrub's synthetic test shows the raw scan misses tokens that are typed one character per event, split across events, or broken up by ANSI colour codes. **Decision:** the flattened scan plus a canary test is the gate (CH-VID-20). The raw scan alone is not.
- **README GIF limits.** vid-pipeline proposed "MUST stay under 10 MB" from GitHub's attachment page. That page covers issues, pull requests and comments, and says nothing about committed README files. vid-legibility and vid-accessibility proposed no GIF over 5 s. **Decision:** drop the 10 MB MUST as mis-scoped. The README rule is a still image first. A GIF must play for 5 s or less with no loop, and SHOULD be 1 MB or less (the exemplar nushell GIF is 1.26 MB). Reason: SC 2.2.2 ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), updated 2026-10-04) needs a pause control for motion over 5 s. GitHub shows a play/pause button only when the viewer has turned autoplay off or has a reduced-motion preference. The setting "syncs with your system-level preference for reduced motion" by default ([GitHub Docs](https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings), undated, fetched 2026-11-27; [changelog 2022-05-19](https://github.blog/changelog/2022-05-19-option-to-prevent-animated-images-from-playing-automatically/)). So a looping GIF gives most viewers no pause control.
- **Shorts column cap.** vid-pipeline proposed CONSIDER at 60 columns or fewer. vid-legibility derived 41 columns and 20 rows inside the safe rectangle. **Decision:** 41 and 20, at MUST, labelled derived. Reason: 60 columns gives 0.98 × 256 ÷ 60 = 4.2 px inside the safe width on a 360 px phone, which is under the floor.
- **Idle limit.** vid-legibility said "MUST set it in the header". vid-pipeline and vid-scrub said SHOULD. The fleet's v2 casts have no header field, but the player sets `idleTimeLimit: 2` (`grimoire-rs/grimoire/docs/public/casts.js:42`). **Decision:** SHOULD, satisfied by the cast header, the player option or agg's flag (CH-VID-11). Reason: the cap only has to reach the viewer. Two dives quoted the scout's "idle_time_limit 16 to 66 s" without checking it, and that figure is wrong: the values are row counts and durations.
- **Does a cast need a text alternative at all?** vid-accessibility gives two readings. Reading A: it is a video-only presentation. Reading B: it is text with scripted animation. vid-pipeline said "commands and key output as page text". **Decision:** use Reading A, and accept the page's own numbered steps as the alternative when they contain every typed command in order (CH-VID-14). Reason: this costs one script check against the scenario YAML, and no authority settles the question.
- **LinkedIn video limits.** The Videos API says "Length: Three seconds to 30 minutes" and "File size: Between 75kb and 500MB" ([Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api), ms.date 2026-02-12, updated_at 2026-03-02, re-fetched 2026-11-27). Help page a7174587 says "Maximum file size: 5 GB", "Minimum file size: 75 KB", "Maximum video duration: 15 minutes". That text is present in the Internet Archive capture of 2025-11-16 (`curl -sL 'http://web.archive.org/web/20251116010654id_/https://www.linkedin.com/help/linkedin/answer/a7174587'`, run 2026-11-27) and on the live page read 2026-11-27 (vid-accessibility F7). The page's own edit date cannot be verified: it prints only a relative "Last updated" phrase. **Decision:** plan to the intersection, 3 s to 15 min and 75 KB to 500 MB, MP4. The intersection is safe whichever page is newer.
- **Sanitise map or isolation?** The OCX recorder rewrites output through a map built from `display_map()`. The grimoire port dropped that rewriting because it broke padded table columns. **Decision:** isolation is mandatory (CH-VID-19). A single-source mapping is allowed only for output that has no padded tables. Ad-hoc `sed` over a recording is never allowed.

## The ruleset

Severity: **MUST** blocks commit or upload. **SHOULD** warns, and passing it needs a recorded reason. **CONSIDER** is advice. "The scenario" means the committed YAML scenario or `.tape` file. "Flattened text" means every `o` event's data joined in order, with `\x1b[...` sequences removed (script in [vid-scrub §4](channel-terminal-video/vid-scrub-and-reproducibility.md)). "W" means the narrowest display width, in CSS px, at which the surface shows the recording.

### Source and form

**CH-VID-01 (MUST).** Generate every demo that is committed or uploaded from a committed scenario that runs the real product binary, asserts its output, and names its output path. The scenario must be able to regenerate the recording on demand. Whether the recording file is also committed follows docs-quality DOC-EX-13: commit it only when no build step regenerates it. Never commit a hand recording or scripted fake output.
- *Rationale:* a hand recording cannot be rebuilt when the CLI changes, and a faked frame misrepresents the product. DOC-EX-12 states the same requirement for docs sites.
- *Verify:* for each `*.cast`, `*.gif`, `*.mp4` and `*.webm` under docs, assets or public directories, `grep -rlF "<basename>" test/recordings tapes/ docs/tapes/` returns at least one file. Each scenario step has an `expect`, or each typed command in the tape is followed by a `Wait`. Example of a fail: `demo.gif` with no tape or scenario that writes it. The DOC-EX-13 check (`git ls-files <recordings dir>` read against the build task graph) runs beside this one.

**CH-VID-02 (MUST).** On a docs site, embed a terminal demo as an asciicast played by a self-hosted asciinema-player. Load the player when the embed scrolls into view, set `autoPlay: false`, and never set `loop: true`. Use an MP4 in `<video controls>` only for GUI content.
- *Rationale:* the cast is 8 to 26 times smaller than a video or GIF of the same session, its text can be selected, and it can be paused (SC 2.2.2). Lazy loading is not autoplay: the player mounts on scroll, but playback starts only when the reader starts it.
- *Verify:* `grep -nE "autoPlay|loop" <embed js>` shows `autoPlay: false` and no `loop: true`. `grep -rnE '<img[^>]+\.gif' <docs src>` finds no terminal session.

**CH-VID-03 (MUST).** In a README, place a still screenshot (PNG or SVG) that links to the docs page with the player. Add an animated GIF only when motion shows something the still cannot. Such a GIF plays for 5 s or less and does not loop (render it with `agg --no-loop`), and SHOULD be 1 MB or less. Never put a `<script>` or player in a README.
- *Rationale:* GitHub's rendering pipeline sanitizes markup HTML, "aggressively removing things that could harm you and your kin", such as "`script` tags, inline-styles, and `class` or `id` attributes" ([github/markup README](https://github.com/github/markup), undated, fetched 2026-11-27; the same README notes that the `markup` library itself does no sanitization, so the sanitizer is a later stage of GitHub's pipeline). agg loops by default, and "`--no-loop` plays the GIF once" ([agg usage](https://docs.asciinema.org/manual/agg/usage/), undated, fetched 2026-11-27). A looping GIF has no pause control for viewers who have not opted out of autoplay (GitHub setting above), and SC 2.2.2 sets the limit at 5 s. 9 of the 16 exemplar README "demos" are still screenshots ([vid-pipeline §4](channel-terminal-video/vid-pipeline-choice.md)).
- *Verify:* `grep -n '<script' README.md` is empty. For each GIF, `ffprobe -v error -show_entries format=duration -of csv=p=0 x.gif` prints 5.0 or less. The loop count is checked with `python3 -I -c "from PIL import Image;print(Image.open('x.gif').info.get('loop'))"`: `None` means play once, and `0` means loop forever, which fails. `stat -c %s x.gif` is 1,048,576 or less.

**CH-VID-04 (MUST).** Render platform video from the scenario to the platform's dated spec:
- YouTube: MP4, H.264, yuv420p, AAC-LC or Opus at 48 kHz, 8 Mbps at 1080p and 24 to 30 fps ([YouTube Help 1722171](https://support.google.com/youtube/answer/1722171), undated, footer 2026).
- LinkedIn: MP4, 3 s to 15 min, 75 KB to 500 MB. This is the intersection of the [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api) (ms.date 2026-02-12, re-fetched 2026-11-27) and [help a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587) (text confirmed in the Internet Archive capture of 2025-11-16 and live on 2026-11-27; edit date unverifiable).
- Shorts: height at least width, and 180 s or less ([YouTube Help 15424877](https://support.google.com/youtube/answer/15424877), undated; applies to uploads from 2024-10-15).
- *Rationale:* these are the published upload specs. An agent's remembered values (a 60 s Short, a 360x640 LinkedIn floor) are stale or invented.
- *Verify:* `ffprobe -v error -show_entries stream=codec_name,pix_fmt,width,height:format=duration,size -of json out.mp4` is checked against the table. Re-check: re-fetch the three pages, and if a page's text changed, update this rule's table and its date.

**CH-VID-05 (MUST NOT).** Do not add Remotion to a repository without the owner's written approval of the licence.
- *Rationale:* Remotion's free licence covers only individuals and companies of up to 3 people, non-profits and evaluation, and a 5.0 licence change has been announced ([pricing](https://www.remotion.dev/docs/license/pricing.md), [FAQ](https://www.remotion.dev/docs/license/faq.md), vendor data, undated, fetched 2026-11-27). Which tool renders a terminal demo is already fixed by CH-VID-01 and the Verdict.
- *Verify:* `grep -rn '"remotion"\|"@remotion/' --include=package.json .` is empty, or the repository records the approval in a decision record.

**CH-VID-06 (MUST).** Pin every render tool and record its provenance:
- the VHS image by tag or digest, never `latest`, and `version:` on every use of `charmbracelet/vhs-action`, whose default is `latest`;
- the agg version, plus the font file passed with `--font-dir` and `--font-family`;
- the asciinema-player version and its sha256, in a comment next to the vendored file.
Use one player version per site family.
- *Rationale:* the fleet runs three player versions (3.15.1, 3.17.0, and 3.19.0 upstream). agg exits 1 with `no faces matching font family options` on a runner that has no fonts.
- *Verify:* `grep -rnE 'vhs:latest|vhs-action@' .github` shows no `latest`, and every `vhs-action` use has a `version:` line. `sha256sum asciinema-player.min.js` equals the recorded sha256.

**CH-VID-07 (SHOULD).** Record new casts as asciicast v3. Leave existing v2 casts until they are re-recorded, and never mix the two formats' fields.
- *Rationale:* v3 is the current spec (initial 2025-09-10, revised 2025-10-20, [asciicast v3](https://docs.asciinema.org/manual/asciicast/v3/)), and it is not backward compatible with v2. DOC-EX-14 separately requires stating the version and checking that the pinned player parses it.
- *Verify:* line 1 has `"version": 3` and `term.cols`. A v2 header has `width` and timestamps that never decrease.

### Legibility

**CH-VID-08 (MUST).** Set the recording geometry by columns, and keep the column count at or below floor(0.98 × W ÷ 6). This keeps x-height at 6 px or more, a DERIVED floor. Measure W on the live surface. Do not assume it.
- *Rationale:* FontSize cancels out of the on-screen size. OCR similarity is 0.85 at 6 px, 0.72 at 5 px and 0.45 at 4 px (VHS v0.12.1, RapidOCR 1.2.3, measured 2026-11-27).
- Caps at the 6 px floor: 360 px phone, 58 columns; 720 px column, 117; 896 px, 146; 1080 px, 176; 1920 px, 313. The 720 and 896 px widths are assumptions.
- Target (CONSIDER, formerly CH-VID-09): an x-height of 8 px, which is at most floor(0.98 × W ÷ 8) columns: 44 at 360 px and 88 at 720 px. This is a project choice for human readers and video compression, and it has not been tested on people.
- *Verify:* compare the cast header `width`, `term.cols` or the tape's `Set Columns` with the cap. Measure W with Playwright as `document.querySelector('[data-cast]').getBoundingClientRect().width` at a 360 px viewport and at desktop width. A tape that sets `FontSize` without `Columns` fails, and so does one that combines `Columns` with `Width`.

**CH-VID-09 (retired 2026-11-27).** The 8 px target is folded into CH-VID-08 as a CONSIDER line. It had no evidence beyond a project choice and the same check as CH-VID-08. The number is not reused.

**CH-VID-10 (MUST).** Record the vertical master (Shorts, Reels, TikTok) as a dedicated 1080x1920 session of at most 41 columns and 20 rows. Keep all text inside x 120 to 888 and y 288 to 1248. Never crop or scale a landscape recording into a vertical frame.
- *Rationale:* the safe width is 0.711 of the frame, and 80 columns there gives 3.1 px x-height. The rectangle is the DERIVED union of third-party margins ([Tella](https://www.tella.com/help/editing/social-safe-zones), undated; [ManyPixels](https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs), 2026-11-11). No platform publishes it.
- *Verify:* `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 x.mp4` prints `1080,1920`. OCR boxes on frames sampled once per second all fall inside the rectangle. The reference file labels the rectangle "derived, third-party inputs, 2026-11-27". Re-check: re-fetch the two pages and the platforms' own help pages every 6 months, and replace the union if any platform publishes its own figures.

**CH-VID-11 (SHOULD).** Cap idle gaps at 2 s, using the cast header `idle_time_limit`, the player's `idleTimeLimit`, or `agg --idle-time-limit 2`. agg defaults to 5 s, and the player has no limit unless the cast or the embed sets one.
- *Rationale:* long pauses read as a broken demo ([agg usage](https://docs.asciinema.org/manual/agg/usage/), [player options](https://docs.asciinema.org/manual/player/options/), both undated).
- *Verify:* the header field, the embed option or the agg flag is 2 or less. Otherwise, the largest gap between events, computed from the timestamps, is 2 s or less.

**CH-VID-12 (SHOULD).** The theme foreground and every ANSI palette colour the session prints reach 4.5:1 contrast against the recording theme's background.
- *Rationale:* WCAG SC 1.4.3 sets 4.5:1 for text and images of text ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), updated 2026-10-04). The asciinema player renders HTML text, not a raster ([vid-legibility §1.2](channel-terminal-video/vid-legibility-thresholds.md)), and since v3.8 it uses the theme embedded in the recording by default ("auto/asciinema", [player options](https://docs.asciinema.org/manual/player/options/), undated, fetched 2026-11-27). So on a docs embed the cast theme is page text, and SC 1.4.3 applies as it does to any text. For GIF and MP4 renders the Understanding page does not mention video, so applying it to video frames is a reading. The rule is SHOULD, not MUST, because the script cannot check dim (SGR 2) or 256-colour and truecolour output, and those need a manual look. The catalog's css-theming rule has no contrast threshold to reuse.
- Measured 2026-11-27 with Appendix A over the 11 grimoire docs casts: all 11 share one theme. The foreground is 14.54:1 and every used palette entry passes (4.86 to 7.79:1). Palette entry 8 (bright black, `#595d6c`) is 2.69:1 and would fail, but no fleet cast prints SGR 90. A synthetic cast that prints SGR 90 makes the script exit 1.
- *Verify:* `python3 -I castcontrast.py f.cast` (Appendix A) exits 0. It prints a manual-check line when the cast uses dim or extended colour. A cast with no theme in its header is checked against the player or VHS theme instead.

### Accessibility

**CH-VID-13 (MUST).** On every surface, motion that starts by itself and lasts over 5 s needs a visible pause control. Never autoplay audio unmuted.
- Players: `autoPlay: false`, or a looping cast with `controls: true`.
- Video: `<video>` without `autoplay`, or `autoplay muted playsinline controls`.
- README GIFs: CH-VID-03.
- *Rationale:* SC 2.2.2 and SC 1.4.2 are Level A ([2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) and [1.4.2](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html), both updated 2026-10-04). Under SC 2.2.2, content that starts playing on scroll-into-view counts as starting automatically. That applies only to content that plays on scroll. A player that mounts on scroll with `autoPlay: false` (CH-VID-02) does not play until the reader starts it, so it does not start automatically.
- *Verify:* `grep -rnE '<video[^>]*autoplay' src | grep -v -E 'muted.*controls|controls.*muted'` is empty. The CH-VID-02 grep passes. Any code that calls `play()` from a scroll or intersection handler fails unless that element has a visible pause control.

**CH-VID-14 (MUST).** Give every silent recording an in-page text alternative next to the embed. It is either a "Transcript" block, or the page's own steps, and it contains every typed command of the scenario in order plus the result of each command. A link to the `.cast` file does not count.
- *Rationale:* SC 1.2.1 (Level A, [W3C](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html), updated 2026-09-06; technique G159). A cast is an event stream with escape codes, not a described sequence.
- *Verify:* a script reads each scenario's `type:` values (or the tape's `Type` lines), with the `{registry}`-style placeholders replaced by `\S+`. It checks that the page source containing the matching `data-cast` holds each command, in order. It fails when the only link next to the embed points at `*.cast`.

**CH-VID-15 (MUST).** Give narrated video a UTF-8 caption file (SRT or WebVTT) that matches the narration. Narration must say every on-screen command; otherwise add a descriptive transcript.
- Burn captions in only where no caption-file slot exists, or where the LinkedIn API cannot take the language. Burned-in captions stay off the prompt row and the active output region.
- *Rationale:* SC 1.2.2 and SC 1.2.3 (Level A, [1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html) and [1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html), both updated 2026-08-10). W3C does not require audio description when the audio already carries all the visual information.
- *Verify:* if `ffprobe -v error -show_streams x.mp4 | grep -c codec_type=audio` is not 0, a sibling `.srt` or `.vtt` exists, and `iconv -f UTF-8 -t UTF-8 x.srt >/dev/null` succeeds. Every command in the scenario appears in the caption text. For burned-in captions, frame grabs at three cue times show no caption box over the prompt row.

**CH-VID-16 (MUST).** After processing, confirm that the caption is attached on the platform. A 2xx response from the upload call is not proof.
- YouTube: [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) with `part` and `videoId` returns a track in the video's language whose `snippet.trackKind` is not `ASR`. The [captions resource](https://developers.google.com/youtube/v3/docs/captions) defines `trackKind` as `ASR` ("generated using automatic speech recognition"), `forced` or `standard`, and `snippet.language` as a BCP-47 tag. A `captions.list` call costs 50 quota units. Both Google pages are undated and were fetched 2026-11-27.
- LinkedIn API: `GET /rest/videos/{urn}` returns a non-empty `captions` field. The Videos API schema defines `captions` as "Present if initializeUploadRequest.uploadCaptions was true and a caption was successfully uploaded and processed" ([Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api), ms.date 2026-02-12, updated_at 2026-03-02, fetched 2026-11-27).
- *Rationale:* YouTube auto captions are unreviewed and cover only the default language ([YouTube Help 2734796](https://support.google.com/youtube/answer/2734796), undated, archive capture 2026-11-04). On LinkedIn, "For a feed video, the video can still be served even if caption processing fails", and "Each video can include only one caption file, and only English-language captions are supported" (Videos API, as above). The same page carries the notice "The Marketing Version 202601 (Marketing January 2026) will be sunset on January 15, 2027" (fetched 2026-11-27; the page's version selector lists 202601 to 202611). These facts also appear in [vid-accessibility](channel-terminal-video/vid-accessibility.md) F7 and candidates 12 and 13.
- *Verify:* the two API responses are stored in the gate report. Re-check: re-read the Videos API page before 2027-01-15 and send the `Linkedin-Version` header of a supported version. The upload mechanics belong to [channel-youtube](channel-youtube/) and [channel-linkedin](channel-linkedin/). This rule owns only the check that the caption attached.

**CH-VID-17 (MUST).** Keep full-screen clears (`ESC[2J`, `ESC[3J`, `ESC[?1049h`) to 3 or fewer in any 1 s window. Run a numeric flash screen when the theme is light or the edit uses crossfades, shake or auto-zoom.
- *Rationale:* SC 2.3.1, Level A, three flashes ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), updated 2025-09-17). A dark theme cannot reach the 0.10 luminance swing: the measured maximum was 0.0039.
- *Verify:* the cast scan from [vid-accessibility F8](channel-terminal-video/vid-accessibility.md) (method in its Appendix C) counts clears per second. `grep -cE '\\u001b\[(2J|3J|\?1049h)' x.cast` gives the total as a quick screen: 3 or fewer in the whole cast passes without the per-second scan. The `flash.mjs` screen (Appendix B there) fails at a mean frame-to-frame change of 0.10 or more.

**CH-VID-18 (SHOULD).** Set `controls: true` on asciinema embeds. Wrap the player in `role="group"` with `aria-label="Terminal recording: <title>"`, and add a visible hint: "Focus the player; Space pauses."
- *Rationale:* `controls: "auto"` hides the bar while the pointer is still ([player options](https://docs.asciinema.org/manual/player/options/), default "auto"). The `.ap-player` node carried no role, tabindex or label when probed on player 3.17.0, the fleet's vendored version, on 2026-11-27 ([vid-accessibility F8](channel-terminal-video/vid-accessibility.md)). Player 3.19.0 was not probed. DOC-EX-16 accepts `"auto"`; this rule is a stricter SHOULD.
- *Verify:* `grep -nE 'controls|aria-label' <embed js>` shows `controls: true` and the label. A DOM probe (vid-accessibility Appendix A) finds the label on the container. Re-run the probe after any player upgrade; if the upgraded `.ap-player` carries its own role and label, drop the wrapper part of this rule.

### Scrub and reproducibility

**CH-VID-19 (MUST).** Record in an isolated environment, and fix any leak by re-recording, never by editing the media. The environment has:
- an allowlisted env dict (never `os.environ.copy()`);
- an isolated `HOME` and `XDG_CONFIG_HOME`, and an empty product config directory;
- every credential variable of the recorded product cleared (for `gh`: `GH_TOKEN`, `GITHUB_TOKEN`, `GH_ENTERPRISE_TOKEN`, `GITHUB_ENTERPRISE_TOKEN`, `GH_HOST`, `GH_REPO`);
- a synthetic registry and synthetic hosts;
- a sentinel prompt.
- *Rationale:* an inherited login is the most likely source of a real token. Editing broke table alignment in the fleet, and cli/cli's skill says "Never redact the GIF after capture" ([SKILL.md](https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md), commit 2026-09-04).
- *Verify:* `grep -nE 'os\.environ\.copy\(\)|\*\*os\.environ' <recorder>` is empty on the recording path. A tape has `Env HOME` and `Env XDG_CONFIG_HOME`. A test asserts that the child env lacks the product's token variables. `grep -rnE "sed .*\.cast|\.cast.*sed" scripts taskfiles` is empty.

**CH-VID-20 (MUST).** Scan the flattened text of every cast, and the raw file too, with `gitleaks dir --no-banner --redact`. Never use the deprecated `gitleaks detect`. A canary cast must be caught: a fake `ghp_` token typed one character per event, with ANSI codes inside it.
- *Rationale:* the raw scan caught 1 of 4 synthetic casts and the flattened scan caught 4 of 4 (gitleaks v8.30.1). `detect` has been deprecated since v8.19.0 ([gitleaks](https://github.com/gitleaks/gitleaks)).
- *Verify:* `gitleaks dir "$FLAT" --no-banner --redact; echo $?` prints 0 for the real casts and 1 for the canary. `grep -rn 'gitleaks detect' .github scripts taskfiles` is empty.

**CH-VID-21 (MUST).** Reduce identity data in the flattened text to zero: the recorder's user name and host name, email addresses, `/Users/`, `C:\Users`, `/root/`, private domain suffixes (`.internal`, `.local`, `.lan`, `.corp` and the organisation's own), and any `/home/<segment>` not on the repository's documented allowlist (for example `runner`).
- *Rationale:* secret scanners do not flag these values. The fleet had 67 `/home/` lines and 0 scanner findings.
- *Verify:* `grep -rEc '/Users/|C:\\\\Users|/root/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|\.(internal|local|lan|corp)\b' $FLAT` is 0. `grep -rEo '/home/[^/ ]+' $FLAT | sort -u` lists only allowlisted segments. `grep -rFc "$(id -un)" $FLAT` and `grep -rFc "$(hostname)" $FLAT` are 0. CONSIDER a `.gitleaks.toml` with `[extend] useDefault = true` and one `[[rules]]` entry per private domain.

**CH-VID-22 (MUST).** A published cast holds no input (`"i"`) events, and its header `env` holds only `SHELL`, or `SHELL` and `TERM` in v2.
- *Rationale:* typed input and extra variables can carry tokens that never appear in output ([asciicast v3](https://docs.asciinema.org/manual/asciicast/v3/); `capture_input` defaults to false, [config v3](https://docs.asciinema.org/manual/cli/configuration/v3/)).
- *Verify:* `python3 -I -c 'import json,sys;L=open(sys.argv[1]).read().splitlines();h=json.loads(L[0]);assert set(h.get("env",{}))<={"SHELL","TERM"};assert not any(json.loads(l)[1]=="i" for l in L[1:] if l.strip())' f.cast`.

**CH-VID-23 (MUST).** Compare a regenerated demo with the committed one as normalised text, never as bytes. Normalise temp paths, ports and timestamps, then diff the flattened cast or a VHS `Output golden.txt`. SHOULD remove the nondeterminism at the source: a fixed port and a fixed short cwd.
- *Rationale:* two identical VHS runs gave different GIF, MP4 and WebM bytes, while agg and `golden.txt` were stable (n=2). Fleet casts embed `/tmp/grim-cast-<random>` and a random port.
- *Verify:* the check script contains no `cmp`, `sha256sum` or `git diff --exit-code` on media files. `diff <(normalise run1) <(normalise run2)` is empty for two back-to-back runs.

**CH-VID-24 (SHOULD).** Where docs-quality DOC-EX-13 allows a recording to be committed (no build step regenerates it), run a drift check in CI on every pull request that changes a scenario, a tape, or the product's output formatting. The check regenerates the recording into a scratch directory, applies the CH-VID-23 diff against the committed file, and reports drift. It never writes or replaces the committed file. It is a non-required job: it is never a required status check and never a `needs:` dependency of the example suite (DOC-EX-11). Where a build step regenerates the recording, the recording is not committed (DOC-EX-13), and this rule does not apply.
- *Rationale:* a demo that no longer matches the CLI misleads readers, and nobody re-runs a manual task. Keeping the job out of the required gate means a recorder or fixture failure cannot fail a correctness check (DOC-EX-11 rationale).
- *Verify:* a workflow under `.github/workflows/` invokes the recorder (`grep -rlE 'test:demo|record_casts|vhs' .github/workflows` is non-empty) with a `paths:` filter that covers the scenarios. The job's output path is outside the tracked recordings directory. The job's name is absent from the branch protection's required checks (`gh api repos/<owner>/<repo>/branches/main/protection --jq '.required_status_checks.contexts'`). Disabling the job leaves the required gate's result unchanged (the DOC-EX-11 check).

**CH-VID-25 (MUST).** In a tape:
- add `Require` for every program the tape types, before any other non-`Set` command;
- set `Set Shell` explicitly;
- use `Hide` ... `Show` only for setup (fixtures, `cd`, prompt, `clear`). Nothing inside a hidden block prints or fakes product output, and no secret is set in `Env` or `export`;
- follow each asserted command with `Wait`. Use `Sleep` only for pacing.
- *Rationale:* `Hide` stops frame capture only, and the hidden commands still run ([VHS README](https://github.com/charmbracelet/vhs), v0.12.1, 2026-09-24). Runner timing varies 15 to 42 s for the same tape.
- *Verify:* `grep -c '^Require' x.tape` is at least 1 for each typed program, and every `Require` comes before the first `Type`. `grep -nE '^(Env|Type) .*(TOKEN|KEY|SECRET|PASSWORD)' x.tape` is empty. Read each `Hide` block: `mkdir`, `export PATH` and `clear` pass; `echo` or `cat` of product-like output fails.

**CH-VID-26 (MUST).** Commit or upload a recording only with a passing gate report from CH-VID-14 and CH-VID-20 to CH-VID-23, and, for platform video, CH-VID-04, CH-VID-10, CH-VID-15 and CH-VID-16. In CI, every job that uploads or publishes a recording lists the gate job in `needs:`. The gate guards only upload and publish jobs. It is never a required status check of the example suite (DOC-EX-11).
- Separately, and without a mechanical check: ask the owner before each `asciinema upload`, `vhs publish`, YouTube or LinkedIn upload (see "What an agent must ask a human").
- *Rationale:* uploading publishes content off-site, and an asciinema "secret link" is private only by obscurity ([quick start](https://docs.asciinema.org/manual/cli/quick-start/), undated).
- *Verify:* for a commit, the gate report is attached to the pull request. For CI, this check exits 1 and names each ungated job (tested 2026-11-27 on a gated and an ungated fixture; needs PyYAML, for example `uv run --with pyyaml python -I`):
  ```python
  import re,sys,yaml
  bad=0
  for f in sys.argv[1:]:
      for n,j in ((yaml.safe_load(open(f)) or {}).get("jobs") or {}).items():
          text=" ".join(str(s.get("run",""))+" "+str(s.get("uses","")) for s in j.get("steps",[]))
          if re.search(r"asciinema upload|vhs publish|youtube|linkedin",text,re.I):
              needs=j.get("needs",[]); needs=[needs] if isinstance(needs,str) else needs
              if "terminal-demo-gate" not in needs: print("ungated:",f,n); bad=1
  sys.exit(bad)
  ```
  Run it as `python3 -I needs.py .github/workflows/*.yml`. `terminal-demo-gate` is the gate job name the `terminal-demo` skill defines. An upload from a script outside `.github/workflows` is not covered by this check, and the ask-the-owner line covers it.

## Applied to the fleet

Paths are relative to `/home/mherwig/dev`. Each row's evidence carries one of three marks. **re-check** means I ran the command shown for this revision, on 2026-11-27, read-only. **audit** cites a `product-audit/` file and line. **dive only** means the fact comes from a dive artifact and was not re-run here.

| Rule | Status | Evidence |
|---|---|---|
| 01 | **Satisfied** (grimoire) | re-check: `grimoire-rs/grimoire/test/recordings/casts/quickstart.yaml:8` names `output: docs/public/casts/quickstart.cast`, and `test_record_casts.py:14` states that a step without `expect` cannot ship. The landing labels the demo "real grim, real registry" (`grimoire-rs/grimoire/docs/src/pages/index.astro:93`). DOC-EX-13: casts are tracked and regenerated only by the manual `task test:demo` (`test/taskfile.yml:234`), not by the docs build (`docs/package.json:10`) |
| 01 | **Violated or unknown** (ocx) | audit: the YouTube channel `@ocx-sh` has two Shorts dated 2026-11-17 ([distribution-posture.md:228](product-audit/distribution-posture.md)), and `git grep` over the 17 clones finds no link to or source for them. They may live in the private `marketing` repo. Ask the owner |
| 02 | **Satisfied** | re-check: `grep -nE "autoPlay\|idleTimeLimit\|fit:\|rootMargin" grimoire-rs/grimoire/docs/public/casts.js` prints `:42` `idleTimeLimit: 2`, `:43` `fit: 'width'`, `:45` `autoPlay: false`, `:59` `rootMargin: '200px'`. The ocx theme checks `prefers-reduced-motion` (`ocx-sh/website/packages/theme/src/components/terminal.mjs:95`). The grimoire.rs landing hero does not autoplay (`index.astro:21-23`, comment; audit: [exemplar-landing-pages.md:212](product-audit/exemplar-landing-pages.md), "click to play, not autoplay") |
| 03 | **New commitment** | audit: 0 of 17 fleet READMEs carry a screenshot or recording, including `grim-gui` ([distribution-posture.md:252](product-audit/distribution-posture.md)); 0 of 18 have a demo in the first screen ([exemplar-readmes.md:164](product-audit/exemplar-readmes.md)). Add a still image and a link to the docs player. Do not add a looping GIF |
| 04, 10, 15, 16 | **New commitment** | dive only: the fleet repositories hold no rendered video, and 0 `.tape` files (`find . -name '*.tape' -not -path '*/node_modules/*' -not -path '*/.git/*'`, [vid-pipeline §1](channel-terminal-video/vid-pipeline-choice.md)). The existing Shorts must meet CH-VID-10 when they are re-rendered |
| 05 | Satisfied | dive only: 0 Remotion dependencies in the fleet ([vid-pipeline §1](channel-terminal-video/vid-pipeline-choice.md)) |
| 06 | **Violated** | re-check: the ocx theme pins npm `"asciinema-player": "3.15.1"` (`ocx-sh/website/packages/theme/package.json:158`). The grimoire provenance comment says "181 KB" (`grimoire-rs/grimoire/docs/public/casts.js:7`). dive only: the vendored file is 3.17.0 and 185,010 B (`stat -c %s docs/public/asciinema-player.min.js`), no sha256 is recorded, and upstream is 3.19.0 (2026-11-22) ([vid-pipeline §1](channel-terminal-video/vid-pipeline-choice.md)) |
| 07 | New commitment | re-check: `head -qn1 grimoire-rs/grimoire/docs/public/casts/*.cast grimoire-rs/grimoire/docs/public/demo.cast` shows 12 v2 headers, and `head -qn1 ocx-sh/www-setup/site/public/casts/examples/*.cast` shows 8 v3 headers. Convert each grimoire cast when it is next re-recorded |
| 08 | **Violated (pending a width measurement)** | re-check: `grep -c '"width": 180'` is 1 in 11 of the 12 grimoire casts (line 1 of each, for example `quickstart.cast:1`); `browse-tui.cast:1` is 120. At an assumed 720 px column that is 3.9 px and 5.9 px x-height, both under the 6 px floor ([vid-legibility §1.4](channel-terminal-video/vid-legibility-thresholds.md)). The 8 ocx v3 casts are 100 columns: 7.1 px at 720 px, but 3.5 px on a 360 px phone. Measure W per site before re-recording. The decision to re-record belongs to the owner |
| 11 | Satisfied | re-check (timestamp scan of each cast, the method of [vid-legibility §1.5](channel-terminal-video/vid-legibility-thresholds.md)): the 12 grimoire v2 headers lack `idle_time_limit` and their largest gaps are 3.0 to 4.0 s, but the player caps idle gaps at 2 s (`casts.js:42`). The 8 ocx v3 headers carry `idle_time_limit: 2`, and their largest gaps are 1.35 to 2.00 s |
| 12 | Satisfied for the used colours, with manual items | re-check: `python3 -I castcontrast.py` (Appendix A) over the 11 `grimoire-rs/grimoire/docs/public/casts/*.cast`: one shared theme, foreground 14.54:1, used palette entries 4.86 to 7.79:1, exit 0 for all 11. Bright black is 2.69:1 but unused. `browse-tui`, `inspect` and `lifecycle` print dim (SGR 2), and `browse-tui` prints extended colour; both need a manual check. The ocx v3 casts carry no theme, so their check runs against the ocx player theme, not done. Separately, audit: `G:public/start.html:256` measures 3.91:1 ([ui-code-posture.md:145](product-audit/ui-code-posture.md)) |
| 13 | Satisfied | re-check: the CH-VID-02 row above (`casts.js:45` `autoPlay: false`, no `loop`). dive only: the ocx `Cast.astro` has no autoplay or loop string (`grep -rniE "autoplay\|loop:" ocx-sh/www-setup/site/src`, [vid-accessibility F8](channel-terminal-video/vid-accessibility.md)) |
| 14 | **Violated** | The landing demo's only alternative is "The recording is plain text: demo.cast" (`grimoire-rs/grimoire/docs/src/pages/index.astro:98-99`). Every docs embed falls back to `<noscript><a href="/casts/….cast">Download the recording</a>` (for example `docs/src/content/docs/quickstart.md:24-25`, `guides/lifecycle.md:180-181`), and none of the 11 casts has a transcript (dive only, [vid-accessibility F8](channel-terminal-video/vid-accessibility.md)). `quickstart.md` may pass through its numbered steps after the embed. `lifecycle.md` puts the embed at the end of the page, under "See it run". Run the CH-VID-14 script per page |
| 17 | Satisfied | re-check: `grep -cE '\\u001b\[(2J\|3J\|\?1049h)' grimoire-rs/grimoire/docs/public/casts/*.cast` prints 2 for `browse-tui.cast` and 0 for the other 10, and the per-second scan puts both `browse-tui` clears in one 1 s window (2 per second, under 3). dive only: the largest frame-to-frame luminance change was 0.0039 ([vid-accessibility F8](channel-terminal-video/vid-accessibility.md)) |
| 18 | **Violated** (grimoire), satisfied (ocx) | re-check: the player options at `casts.js:41-46` pass no `controls` (`grep -c controls casts.js` is 0), so it defaults to `"auto"`. dive only: `.ap-player` had no role or label on player 3.17.0 ([vid-accessibility F8](channel-terminal-video/vid-accessibility.md)). re-check: the ocx `terminal.mjs` brings its own controls with `aria-label` (`terminal.mjs:171`, `:310`) |
| 19 | Satisfied (grimoire) | re-check: `GrimRunner` (`grimoire-rs/grimoire/test/src/runner.py:43`) builds `env` as a dict at `:66-76` with an isolated `HOME` (`:68`) and `XDG_CONFIG_HOME` (`:76`), and copies only named host keys at `:81-82`. The sentinel prompt is set at `test/recordings/cast_recorder.py:160`. dive only: the docstring at `cast_recorder.py:13-25` records why post-hoc rewriting was removed ([vid-scrub §3](channel-terminal-video/vid-scrub-and-reproducibility.md)) |
| 20 | **New commitment** | dive only: raw and flattened gitleaks both found nothing across 20 casts ([vid-scrub §3](channel-terminal-video/vid-scrub-and-reproducibility.md)), but no repository runs the scan or a canary. The gate does not exist yet |
| 21 | Satisfied (with allowlist) | dive only: 0 emails, 0 `/Users/`, 0 private domain suffixes, 0 real user or host names ([vid-scrub §3](channel-terminal-video/vid-scrub-and-reproducibility.md)). `/home/runner` appears in 6 of 8 ocx casts (`grep -c '/home/runner' ocx-sh/www-setup/site/public/casts/examples/*.cast`), and goes on the allowlist |
| 22 | Satisfied | re-check: `grep -c '"i",' grimoire-rs/grimoire/docs/public/casts/*.cast` is 0 for every file, and the header scan finds no `env` key in any of the 20 fleet headers. dive only: 0 `i` events in 7,212 across all 20 ([vid-scrub §3](channel-terminal-video/vid-scrub-and-reproducibility.md)) |
| 23 | **Violated** | `grimoire-rs/grimoire/docs/public/casts/quickstart.cast:13,148` holds `/tmp/grim-cast-3vgxhmm4`, and `:63` holds `localhost:53703` (`grep -n -o -E '/tmp/grim-cast-[a-z0-9]+\|localhost:[0-9]{5}' …/quickstart.cast`). A rerun changes these values, and no normalised diff exists |
| 24 | **Violated** | Casts are regenerated only by hand, with `task test:demo` (`grimoire-rs/grimoire/test/taskfile.yml:234`). `grep -ln -E 'demo\|record_casts\|casts' grimoire-rs/grimoire/.github/workflows/*` exits 1, so no workflow runs a drift check. The scenario directory is also outside `testpaths = ["tests"]` (`test/pyproject.toml:7`). The fix is a non-required drift job, not a required one |
| 25 | New commitment | 0 tapes today. The rule applies to the first tape |
| 26 | **New commitment** | No gate report exists. The Shorts were uploaded without one (audit: [distribution-posture.md:228](product-audit/distribution-posture.md)) |

Two findings outside this topic, one line each:
- css-theming carries no contrast threshold (`grep -n -i contrast rules/css-theming.md` finds no threshold). The ux sub-program should add one, or cite SC 1.4.3.
- The OCX docs-style rule "Never record a cast whose output is a `--help` dump" ([config-inventory.md](product-audit/config-inventory.md), docs-style `:160-168`) is content guidance for docs-quality and is not restated here.

## AI-agent failure modes

Ranked by how often each one bites. "Check" names the rule that catches it.

**1. Treating a tool's default or surface check as the gate (most frequent).**
- The agent scans the committed `.cast`, sees "no leaks found" and reports it clean. Check: 20.
- It treats VHS `Hide` as scrubbing, so secrets get exported inside a hidden block, or fake output gets printed there. Check: 25.
- It reports axe as passing when the player never mounted, or when chromedriver was missing and the run printed nothing. Check: the results block must be non-empty and must say "player mounted: true" ([vid-accessibility Appendix A](channel-terminal-video/vid-accessibility.md)).
- It counts GitHub push protection as the secret gate. It is off by default for repositories and is not documented to flatten casts. Check: 20.
- It assumes a caption upload that returned 2xx is attached. Check: 16.

**2. Recording in the live environment, then patching.**
- It runs `asciinema rec` in its own shell, with the real `HOME` and a logged-in CLI, then runs `sed` over the cast or redacts frames. Check: 19, 01.
- It commits a hand recording with no scenario. Check: 01.

**3. Sizing by font instead of columns.**
- It writes `Set FontSize 28` or "zoom in" and believes the text is now large. Check: 08.
- It crops a 16:9 recording into 9:16 for Shorts. Check: 10.

**4. Platform facts from memory or from vendors.**
- "Shorts are 60 s", "LinkedIn minimum 360x640", "GitHub allows 100 MB README video". Check: 04, and the dated table.
- It cites the Tella or ManyPixels margins, or "Instagram 14 / 35 / 6 %", as official. Check: 10's label requirement.
- It copies scout figures without opening the file ("idle_time_limit 16 to 66 s"). Check: print the header.

**5. Stale tool idioms.**
- `gitleaks detect --no-git`. Check: 20.
- `vhs:latest`, or `vhs-action` without `version:`. Check: 06.
- v2 header fields in a v3 cast. Check: 07.
- A byte comparison of a regenerated GIF. Check: 23.
- Running agg on a runner with no fonts. Check: 06.

**6. Misrouting accessibility.**
- It ships an empty `.vtt` "caption" for a silent cast, or adds `<track>` to the asciinema player, which is not a media element. Check: 14.
- It counts the `<noscript>` download link as the text alternative. Check: 14.
- It adds a looping autoplay GIF to a README, or `<video autoplay loop>` without `muted` and `controls`. Check: 03, 13.
- It judges flashing by eye on a dark cast and extends that verdict to a light theme. Check: 17.

**7. Wiring the recorder into the required gate.** It makes the regeneration job a required check, or commits a recording that the build also regenerates. Check: 24, 26, and docs-quality DOC-EX-11 and DOC-EX-13.

**8. Reaching for heavy tooling.** It proposes Remotion or a paid screen recorder for a terminal demo. Check: 01 fixes the source, and 05 stops a Remotion dependency without licence approval.

## What an agent must ask a human

- Whether to re-record the fleet's 180-column casts, and at which measured column width. This is a content and brand call (CH-VID-08).
- Whether the 8 px target (the CONSIDER line in CH-VID-08, formerly CH-VID-09) becomes MUST.
- Every upload or publication: `asciinema upload`, `vhs publish`, YouTube, LinkedIn, Shorts. Ask before each one. No check replaces this (CH-VID-26).
- Whether any real customer, account, registry, host name or person may appear on screen, even a public one.
- Whether a demo may show simulated output instead of the real binary. If yes, the demo must say so.
- Adding Remotion, Screen Studio, Descript or any paid tool. Font, music and voice licences in a render.
- Synthetic voice or an AI avatar in a demo, and how to disclose it. Disclosure belongs to the marketing sub-program.
- Burning captions into brand-controlled marketing cuts.
- Whether to claim WCAG conformance on a page, and whether the transcript reading of CH-VID-14 is enough for the organisation's compliance posture.
- Whether paid placements use the stricter 40 % bottom margin reported for Meta ads (unverified).
- Turning on GitHub push protection per repository. It is a repository setting and a backstop only.
- Where the source of the published `@ocx-sh` Shorts lives.

## Decay

| Rule | Moving fact | Source, date | Refresh |
|---|---|---|---|
| 04 | YouTube upload encode spec | [1722171](https://support.google.com/youtube/answer/1722171), undated, footer 2026 | 6 months; next 2027-05-27 |
| 04, 10 | Shorts length and ratio (up to 3 min, square or vertical) | [15424877](https://support.google.com/youtube/answer/15424877), [10059070](https://support.google.com/youtube/answer/10059070), both undated | 6 months |
| 04, 16 | LinkedIn Videos API limits, `captions` field, Marketing version 202601 sunset notice | [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api), ms.date 2026-02-12, updated_at 2026-03-02, re-fetched 2026-11-27 | Before 2027-01-15 (version sunset), then every 6 months |
| 04 | LinkedIn help limits (15 min, 5 GB) | [a7174587](https://www.linkedin.com/help/linkedin/answer/a7174587): text present in the Internet Archive capture of 2025-11-16 and live on 2026-11-27; edit date unverifiable | 6 months |
| 03 | GitHub animated-image autoplay setting | [GitHub Docs](https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings), undated | 12 months |
| 03 | GitHub README sanitization removes `script` tags | [github/markup README](https://github.com/github/markup), undated, fetched 2026-11-27 | 12 months |
| 03, 11 | agg `--no-loop` and `--idle-time-limit` (default 5) | [agg usage](https://docs.asciinema.org/manual/agg/usage/), undated, fetched 2026-11-27 | On an agg major release |
| 10 | Third-party safe-zone margins | [Tella](https://www.tella.com/help/editing/social-safe-zones) undated; [ManyPixels](https://www.manypixels.co/blog/social-media-design/tiktok-ad-specs) 2026-11-11 | 6 months, or when a platform publishes its own figures |
| 12 | Player default theme "auto/asciinema" (embedded theme first) | [player options](https://docs.asciinema.org/manual/player/options/), undated, fetched 2026-11-27 | On a player upgrade |
| 13 to 17 | WCAG 2.2 Understanding pages (edited in 2026: March, August, September, October) | W3C pages linked in the rules | 12 months; re-read the per-page dates before citing |
| 16 | YouTube captions API `trackKind` values; auto-caption scope | [captions resource](https://developers.google.com/youtube/v3/docs/captions), [captions.list](https://developers.google.com/youtube/v3/docs/captions/list), both undated, fetched 2026-11-27; [2734796](https://support.google.com/youtube/answer/2734796), undated | 12 months |
| 18 | `.ap-player` attributes | DOM probe on player 3.17.0, 2026-11-27 | On every player upgrade |
| 06, 25 | VHS 0.12.1, vhs-action 2.1.1, agg 1.9.0, player 3.19.0, asciinema CLI 3.2.1 | GitHub releases API, read 2026-11-27 | The gate prints pinned versus latest on every run; review quarterly |
| 20 | gitleaks is feature complete and its author is moving to Betterleaks; trufflehog 3.100.1 | [gitleaks](https://github.com/gitleaks/gitleaks), v8.30.1 2026-03-21 | 6 months; re-run the canary on any scanner change |
| 05 | Remotion licence; 5.0 terms change | [pricing](https://www.remotion.dev/docs/license/pricing.md), [FAQ](https://www.remotion.dev/docs/license/faq.md), vendor, undated | 6 months, or at the Remotion 5.0 release |
| 08, 10 | The derived 6 px floor, the 8 px target and the 0.98 × W ÷ C law | own measurement, VHS v0.12.1, RapidOCR 1.2.3, 2026-11-27 | Re-measure on a VHS or player major release, a font change, or a human legibility test |
| 01, 24, 26 | docs-quality DOC-EX-11 and DOC-EX-13 (pinned) | `skills/docs-quality-reference/examples.md`, "The recording layer" | Re-read whenever docs-quality is revised |

## Open questions

Subareas that deserve another round:
- Does a human legibility test on a 360 px phone and a 720 px docs column confirm, raise or lower the 6 px floor that one OCR engine produced?
- What is the measured content width of each fleet surface (Starlight docs, the grimoire docs pages, the ocx `/install/` page, a MkDocs site) at phone and desktop sizes? At what column count does each existing cast pass?
- How should a GUI screen recording (VS Code extension, `grim-gui`) be scrubbed and checked for legibility, given that the text scan sees no pixels? Can OCR over one frame per second plus the CH-VID-21 patterns replace visual inspection?
- Do GitHub secret scanning and trufflehog `filesystem` catch the CH-VID-20 canary in a raw `.cast`? Their behaviour on casts is undocumented.
- What do encode loudness (EBU R128 or the YouTube target) and background-audio rules need for narrated demos? This was deferred in the map as M-VID-9.
- Which PEAT-class flash analyser runs headless in CI for light-theme or auto-zoom cuts?
- Does LinkedIn's member upload UI, as opposed to the API, accept non-English SRT, and what limits does it state today? This may belong to channel-linkedin.
- Does player 3.19.0 add a role, tabindex or label to `.ap-player`, and how does it render SGR 2 (dim) against the fleet theme? Both decide whether CH-VID-12 and CH-VID-18 can tighten.

Owner decisions:
1. Re-record the 180-column grimoire casts, or accept them until the next CLI change.
2. Whether docs-quality DOC-EX-13 also covers a CI drift check that regenerates into a scratch directory. If it does, CH-VID-24 is retired for that repository. (CH-VID-24 is non-required in either case, per DOC-EX-11.)
3. Where the `terminal-demo` skill's flatten, scan, contrast and transcript-check scripts live: a new `terminal-demo-reference` skill, or the grimoire recorder exported as a reusable tool.
4. Whether fleet READMEs get a still screenshot now (CH-VID-03), product by product.
5. Where the source of the `@ocx-sh` Shorts lives, and whether they are re-rendered under CH-VID-10.
6. One asciinema-player version for both site families, and who owns its update.
7. Whether CH-VID-12 returns to MUST for player embeds, where the cast theme is page text under SC 1.4.3.

## Sub-artifacts

- [vid-pipeline-choice.md](channel-terminal-video/vid-pipeline-choice.md): the five forms, measured sizes and determinism (agg against VHS, n=2), the forms in the exemplar READMEs, the fleet pipeline, and the per-surface table.
- [vid-legibility-thresholds.md](channel-terminal-video/vid-legibility-thresholds.md): the geometry law, the OCR sweep, column caps per surface, idle and speed defaults, contrast, and the derived vertical safe rectangle.
- [vid-accessibility.md](channel-terminal-video/vid-accessibility.md): the WCAG 1.2.x, 1.4.2, 2.2.2 and 2.3.1 map for demos, caption delivery on YouTube and LinkedIn, and axe and flash measurements on the grimoire docs, with scripts.
- [vid-scrub-and-reproducibility.md](channel-terminal-video/vid-scrub-and-reproducibility.md): leak paths, scanner documentation, the fleet scan, the synthetic evasion test (raw 1 of 4, flattened 4 of 4), and reproducibility requirements and exemplars.

## Key sources

1. https://docs.asciinema.org/manual/asciicast/v3/ (spec, revised 2025-10-20): event format, `env` and input-capture defaults, `idle_time_limit`.
2. https://docs.asciinema.org/manual/player/options/ (undated): `autoPlay`, `loop`, `controls`, `fit`, `theme` and `idleTimeLimit` defaults.
3. https://github.com/charmbracelet/vhs (v0.12.1, 2026-09-24): `Set Columns`, `Hide`, `Require`, `Wait`, golden text output.
4. https://github.com/gitleaks/gitleaks (v8.30.1, 2026-03-21): `dir` mode, the `detect` deprecation, custom rules.
5. https://github.com/cli/cli/blob/trunk/.github/skills/vhs-demo/SKILL.md (2026-09-04): the isolation recipe and "never redact after capture".
6. https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html (2026-09-06): SC 1.2.1 for silent demos.
7. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html (2026-10-04): the 5 s motion rule.
8. https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html (2026-08-10): SC 1.2.2 and the open and closed caption techniques.
9. https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html (2025-09-17): flash thresholds.
10. https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api (ms.date 2026-02-12, re-fetched 2026-11-27): LinkedIn limits, the caption upload, the `captions` field and the 202601 sunset notice.
11. https://support.google.com/youtube/answer/1722171 (undated): the YouTube encode spec.
12. https://support.google.com/youtube/answer/15424877 (undated): Shorts length and ratio.
13. https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings (undated, fetched 2026-11-27): GitHub GIF autoplay follows reduced motion.
14. https://web.dev/articles/replace-gifs-with-videos (undated): GIF against MP4 and WebM sizes.
15. https://www.remotion.dev/docs/license/pricing.md (vendor, undated): free-tier eligibility.
16. https://github.com/github/markup (undated, fetched 2026-11-27): README HTML sanitization removes `script` tags.
17. https://developers.google.com/youtube/v3/docs/captions and https://developers.google.com/youtube/v3/docs/captions/list (undated, fetched 2026-11-27): `trackKind` values and the list call.
18. https://docs.asciinema.org/manual/agg/usage/ (undated, fetched 2026-11-27): `--no-loop`, `--idle-time-limit`.

## Appendix A. castcontrast.py (CH-VID-12)

Written and run for this revision on 2026-11-27. It reads the theme from the cast header (v2 `theme`, or v3 `term.theme`), finds the ANSI colours that `o` events select with SGR 30 to 37 and 90 to 97, and prints each ratio with the WCAG relative-luminance formula ([SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). Self-check: black on white must give 21:1. Negative test: a synthetic cast printing SGR 90 on the fleet theme exits 1 (bright black, 2.69:1). Run it as `python3 -I castcontrast.py f.cast`.

```python
# Usage: python3 -I castcontrast.py f.cast  -- exit 1 if fg or a used ANSI colour is under 4.5:1 against bg
import json,re,sys
L=open(sys.argv[1],encoding='utf-8').read().splitlines()
h=json.loads(L[0]); th=h.get('theme') or h.get('term',{}).get('theme')
if not th: sys.exit('no theme in header: check the player or VHS theme instead')
def lum(c):
    r,g,b=(int(c.lstrip('#')[i:i+2],16)/255 for i in (0,2,4))
    f=lambda v:v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def ratio(a,b):
    x,y=sorted((lum(a),lum(b)),reverse=True); return (x+0.05)/(y+0.05)
pal=th['palette'].split(':')
txt=''.join(json.loads(l)[2] for l in L[1:] if l.strip() and json.loads(l)[1]=='o')
used=set()
for params in re.findall(r'\x1b\[([0-9;]*)m',txt):
    ps=[int(x or 0) for x in (params or '0').split(';')]
    i=0
    while i<len(ps):
        p=ps[i]; i+=1
        if p in (38,48):  # shortcut: 256-colour and truecolour skipped, add them if a cast uses them
            used.add('ext'); i+=2 if ps[i:i+1]==[5] else 4; continue
        if 30<=p<=37: used.add(p-30)
        if 90<=p<=97: used.add(p-90+8)
        if p==2: used.add('dim')
assert abs(ratio('#000000','#ffffff')-21)<1e-9
bad=0
for name,c in [('fg',th['fg'])]+[(i,pal[i]) for i in sorted(u for u in used if isinstance(u,int))]:
    r=ratio(c,th['bg']); bad|=r<4.5; print(name,c,'%.2f'%r,'FAIL' if r<4.5 else 'ok')
if 'dim' in used: print('dim (SGR 2) used: renderer-dependent, check the rendered colour by hand')
if 'ext' in used: print('256-colour or truecolour SGR used: not checked')
sys.exit(bad)
```

## Revision log

2026-11-27, after an adversarial check of the first consolidation. IDs are unchanged; one is retired.

- CH-VID-01, CH-VID-24, CH-VID-26 and Verdict 1: reconciled with docs-quality DOC-EX-13 (MUST pinned, commit a recording only when no build step regenerates it). The pinned rule wins. CH-VID-01 now requires on-demand regeneration and defers the commit decision to DOC-EX-13. CH-VID-24 is scoped to recordings DOC-EX-13 lets you commit, and writes only to a scratch directory. A conflict entry records the decision and the owner's override.
- CH-VID-24 and CH-VID-26: reconciled with DOC-EX-11 (MUST pinned, recorder out of the required gate). CH-VID-24 is a non-required job with a branch-protection check. CH-VID-26 gates only upload and publish jobs. Owner decision 2 is rewritten, because DOC-EX-11 settles "blocks or warns".
- Verdict 1: added DOC-EX-18 (no VHS beside a scenario tree without a reason). A conflict entry lists the DOC-EX-12, 14, 15 and 16 overlaps, which do not conflict.
- CH-VID-16: kept at MUST. The skeptic's grep was wrong: vid-accessibility F7 and candidates 12 and 13 already held `trackKind`, the `captions` field and the 202601 sunset. All three were re-fetched on 2026-11-27 and are now quoted in the rule with their dates.
- CH-VID-12: demoted from MUST to SHOULD. Added the contrast script as Appendix A, with a self-check and a negative test, and ran it on the 11 grimoire casts. The applicability argument is now explicit: player text falls under SC 1.4.3, and video frames are a reading. The dim and extended-colour gap moved to Verdict 8. Owner decision 7 added.
- CH-VID-02 and CH-VID-13: removed the contradiction. Lazy loading is fine because playback is user-started. The scroll-into-view clause now applies only to content that plays on scroll, and a `play()`-on-scroll check was added.
- CH-VID-03: "GitHub runs no scripts in a README" is now cited to the github/markup README. `agg --no-loop` is cited to agg usage (also in vid-pipeline §2.2). Both were fetched 2026-11-27.
- CH-VID-26: split into a mechanical CI `needs:` assertion (a script tested on a gated and an ungated fixture) and a plain ask-the-owner line with no check. The workflow-parser problem in the old grep is gone.
- CH-VID-05: cut to the licence-approval clause. The tool-preference half is covered by CH-VID-01 and the Verdict. Failure mode 8 (formerly 7) now points at both rules.
- CH-VID-18: names the probed player version (3.17.0) and records 3.19.0 as unprobed. Re-probe on upgrade. The DOC-EX-16 relation is stated.
- Applied to the fleet: every row is marked re-check, audit or dive only. File:line or a command was added for rows 01, 02, 06, 07, 08, 11, 12, 13, 17, 18, 19, 22 and 26. Row 12 changed from "Not measured" to a measured result. Row 02's landing evidence now cites `index.astro:21-23` and exemplar-landing-pages.md:212. Row 14's line citation is corrected to `:98-99`.
- CH-VID-04, the LinkedIn conflict entry and Decay: the help-page date is no longer inferred as "about April 2025". The 15 min and 5 GB text is confirmed in the Internet Archive capture of 2025-11-16 (command given), and the edit date is labelled unverifiable.
- CH-VID-11: the check threshold now matches the 2 s rule (was 3 s). Row 11 is re-measured.
- CH-VID-09: retired. Its 8 px target is folded into CH-VID-08 as a CONSIDER line. The ask-human list and Decay are updated.
- CH-VID-07: kept unchanged apart from a DOC-EX-14 cross-reference. It has a mechanical check and catches a listed agent failure (mixed v2 and v3 fields).
- New failure mode 7 (recorder wired into the required gate) and a new open question (player 3.19.0 attributes and dim rendering).

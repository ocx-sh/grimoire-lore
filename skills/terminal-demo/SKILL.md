---
name: terminal-demo
description: 'Terminal demos and screencasts that are reproducible, legible and safe to publish: asciinema casts, VHS tapes, GIFs, SVG or PNG stills and platform video rendered from a committed scenario that runs the real product, column geometry for phones and docs columns, idle gaps, palette contrast, pause controls, captions and transcripts, flashing limits, secret and identity scrubbing, and text-normalised drift checks. Use when recording, re-recording, embedding or reviewing a terminal demo, a .cast or .tape file, a README GIF or CLI screenshot, or a video built from terminal footage. Not for the docs-page player and tooltip rules, which docs-quality owns, and not for uploading or posting a recording, which only a named human does.'
license: Apache-2.0
metadata:
  summary: Procedure and gate for terminal demos, from a committed scenario to a scrubbed, legible, accessible recording and a gate report, with dated platform facts and two checks scripts
  keywords: terminal,demo,screencast,asciinema,cast,vhs,tape,gif,agg,video,recording,screenshot,readme,accessibility,captions,transcript,wcag,gitleaks,scrub,contrast,legibility,reproducible
  grim.requires.skills.channel-publishing: "./channel-publishing:0"
---

# terminal-demo

A terminal demo is a recording of the real product, made from a committed
scenario, that a stranger can read on a phone, pause, search as text, and trust
not to leak the recorder's identity or a token. This skill runs the CH-VID rules
as one gate over a recording, from the scenario to the report. It ships two
checks scripts and two reference files, and it never uploads anything.

Contents: [Stop condition](#stop-condition) · [Boundary](#boundary) ·
[Facts and dates](#facts-and-dates) · [Before you start](#before-you-start) ·
[The procedure](#the-procedure) · [The gate report](#the-gate-report) ·
[The rules](#the-rules) · [Verification blocks](#verification-blocks) ·
[What to ask a human](#what-to-ask-a-human) ·
[What agents get wrong](#what-agents-get-wrong) · [Where the depth is](#where-the-depth-is)

## Stop condition

Stop when all four hold. Do not upload, publish or schedule anything.

1. Every CH-VID rule that applies has a line in the gate report: `pass`, `n/a`
   with the reason, or `manual` with what a human must read. No rule is silent.
2. Every MUST finding is fixed at the source, by changing the scenario or the
   environment and re-recording. A finished recording is never edited.
3. The report names each owner decision still open (see
   [What to ask a human](#what-to-ask-a-human)).
4. The files are written: the scenario or tape, the recording, the gate report.

## Boundary

This skill requires `channel-publishing`. Five of its rules bind a demo:

- **CH-CORE-01.** End at a package: the scenario, the recording and the gate
  report. Never run `asciinema upload`, `vhs publish`, a YouTube or LinkedIn
  upload, or any write call, and never drive a web upload form. A named human
  uploads.
- **CH-CORE-06.** For platform video, put every label field the platform has into
  the package as an explicit `true` or `false`. Omission means undeclared.
- **CH-CORE-08.** Place a sponsor, material-connection or AI disclosure before the
  fold: spoken and on screen at or before the first mention in a long video,
  as burned-in text in the first seconds of a Short.
- **CH-CORE-10.** In a repository that holds or may hold a publishing credential,
  merge `channel-publishing`'s `checks/gitleaks-channels.toml` (the
  `discord-webhook-url` and `google-oauth-refresh-token` rules) into the
  repository's gitleaks configuration, and run the gitleaks commands of its block
  CH-CORE-10. The Step 5 scans do not replace that. That a recorder holds no
  credential is CH-VID-19 alone: the recording environment clears every one.
- **CH-CORE-11.** Take a platform limit from a `facts.md` row and cite its id
  (`[VID-F01]`). Write no limit from memory or from a search snippet. A figure
  you measured carries its command. A number a demo shows or states carries a
  `source:` line, or follows MKT-CLAIM where `marketing-quality` is installed.

## Facts and dates

Dated facts live only in [references/facts.md](references/facts.md): platform
video specs, WCAG pages, tool behaviour and the player version. Each row carries
its source URL, source date, verified date and `refresh_days`: 180 for hard
limits, 90 for policy, API fields and tool behaviour, 30 for metered costs.
`facts_check.py` in `channel-publishing` fails on the first overdue row. Re-fetch
that page and move `verified` only after its `expect` pattern matches. Never
extend a date without reading the page. This file never repeats a platform
limit. It cites the row.

## Before you start

- `CHECKS` is `.claude/skills/terminal-demo/checks` (`~/.claude/skills/terminal-demo/checks` when
  installed globally). It holds `cast_check.py` and `cast_contrast.py`. Both take
  `--help` and `--self-test`, need only Python 3.11, and run as `python3 -I`. Exit
  0 is clean, 1 is a finding, 2 is a usage error. Run both self-tests first.
- Set these once and `export` them: `SCENARIOS` (the scenario or tape files),
  `RECORDER` (the recorder code), `CASTS` (the recordings directory), `SCRATCH`
  (an empty temporary directory) and `FLAT` (`$SCRATCH/flat`).
- Required tools: `asciinema` (the recorder), `gitleaks` (Step 5), `ffprobe` (video
  and GIF checks), `vhs` (tapes and MP4), `agg` (README GIF) and Playwright (only
  to measure W and to screenshot a player). Versions and install commands are in
  the pipeline reference, "Install". Check each with `command -v`. A required tool
  that is absent means the report line of every rule that needs it is `manual: TOOL
  absent`, never `pass`, and the install is the owner's call when it needs
  privileges. Do not substitute a different scanner.
- Read [references/pipeline.md](references/pipeline.md) for the form per surface,
  the tape and render commands, the measured column caps and the tool pins.
- Do not answer a platform question from memory. Read the row in `facts.md`.

## The procedure

### Step 1. Choose the surface and the form

Input: where the demo will be shown. Check: the form table in the pipeline
reference decides the form (CH-VID-02, 03, 04, 10). Measure W on each docs
surface with the probe there. Compute the cap, `floor(0.98 * W / 6)` columns
(CH-VID-08). Done: the report header names each surface, its form, its W and its
column cap.

### Step 2. Write the scenario or tape

Input: the commands the viewer must see. Check: the scenario runs the real
binary, asserts each step and names its output path (CH-VID-01). A tape follows
CH-VID-25. Done: the file exists, and the CH-VID-01 and CH-VID-25 blocks print
nothing.

### Step 3. Fix the recording environment

Input: the recorder. Check: it builds a fresh environment dict, never a copy of
`os.environ`, with an isolated `HOME` and `XDG_CONFIG_HOME`, an empty product
config, every credential variable of the product cleared, a synthetic registry
and synthetic hosts, and a sentinel prompt (CH-VID-19). A test asserts that the
child environment lacks the product's token variables. Done: the CH-VID-19 block
prints nothing and that test passes.

### Step 4. Render and pin

Input: the scenario and the form. Check: render per the pipeline reference. Pin
VHS, vhs-action, agg and the player (CH-VID-06). Record new casts as v3
(CH-VID-07). For a README, also make the still (the pipeline reference, "Render
Commands"). Done: the CH-VID-06 block shows no `latest`, the cast header reads
`"version": 3`, and for a README the CH-VID-03 block prints no README with a demo and no linked still.

### Step 5. Flatten, scrub and scan

Input: each cast. Check, in this order:

1. `python3 -I "$CHECKS"/cast_check.py --must-only --identity ORG_NAME --private-domain DOMAIN --allow-home runner FILE`
   and read the CH-VID-21 and CH-VID-22 lines. It withholds the matched value.
   `ORG_NAME` is the organisation's name as it would appear in a path or host
   (the repository owner), `DOMAIN` its private domain suffix (repeat the flag for
   each), and `--allow-home SEG` repeats once per `/home/SEG` that the repository
   documents as allowed. Without them the scan is incomplete: ask the owner for
   the values and never guess them.
2. Flatten each cast and scan the flattened text and the raw file with
   `gitleaks dir`, then run the canary (block CH-VID-20).

Done: both gitleaks runs exit 0 on the real casts, the canary exits 1, and
`cast_check.py` prints no CH-VID-21 or CH-VID-22 line. A leak means re-record.
Never run `sed` over a cast or redact media.

### Step 6. Geometry, idle gaps and flashes

Input: each cast, and the caps from step 1. Check:
`python3 -I "$CHECKS"/cast_check.py --width-px W FILE`, with one `--width-px` per
surface, `--idle-limit 2` when the player or agg applies that cap, and `--vertical`
for a vertical master (CH-VID-08, 10, 11, 17). For video with a light theme,
crossfades, shake or auto-zoom, also screen for flashes by hand (CH-VID-17).
Done: exit 0, or each remaining SHOULD finding has a recorded reason.

### Step 7. Contrast and dim text

Input: each cast. Check: `python3 -I "$CHECKS"/cast_contrast.py --theme theme.json FILE`,
once per colour scheme (CH-VID-12, 27). A cast from `asciinema rec` has no theme
in its header, and without `--theme` the script exits 2 with `no theme in the cast
header`. Exit 2 is not a pass: write the report line as `manual` or supply the
theme. `theme.json` is `{"fg": "#rrggbb", "bg": "#rrggbb", "palette":
"#rrggbb:...(16 entries)"}` holding the colours the viewer sees: the forced theme
of the embed, or, when the page names a built-in player theme, that theme's
`--term-color-foreground`, `--term-color-background` and `--term-color-0` to `15`
values from the player's CSS. Read them from the vendored player, never from
memory. Plain `cast_contrast.py FILE` is valid only for a cast whose header
embeds its theme and whose embed does not force another. Done: exit 0. Every
`manual:` line is copied into the report. Dim text that fails passes only with a
named exception.

### Step 8. Make the embed accessible

Input: the page that embeds the recording. Check: autoplay and loop (CH-VID-02,
13), the text alternative (CH-VID-14), captions for narrated video (CH-VID-15),
player controls and the group label (CH-VID-18). For CH-VID-14 run
`python3 -I "$CHECKS"/cast_check.py --scenario FILE --page PAGE`. Done: the
CH-VID-02 and CH-VID-13 blocks show only `autoPlay: false`, the transcript check
exits 0, and a caption file exists for every narrated video.

### Step 9. Check drift

Input: the committed recording and a regeneration of it. Check: regenerate into
`$SCRATCH`, then
`python3 -I "$CHECKS"/cast_check.py --diff COMMITTED REGENERATED` (CH-VID-23).
Never compare media bytes. A drift job in CI follows CH-VID-24. Done: the diff is
empty, or the scenario or the product output changed and the recording is
re-recorded.

### Step 10. Platform video, the gate and the stop

Input: a rendered MP4 for YouTube, LinkedIn or Shorts. Check: `ffprobe` against
the `facts.md` rows (CH-VID-04, 10), and the caption file (CH-VID-15). Write the
gate report. In CI, name the job that runs the checks of CH-VID-26 `terminal-demo-gate`, and
list it in `needs:` of every job that uploads or publishes a recording
(CH-VID-26). Hand the package to the owner and stop. After a human uploads, the
read-only caption check of CH-VID-16 confirms the caption attached. Run it only
with a credential the owner supplied, and otherwise mark it `manual`. Done: the
gate report is complete and nothing was uploaded.

## The gate report

One file next to the scenario, named `<demo>.gate.md`. A header line names the
demo, the date, the tool versions, and each surface with its W and cap. Then one
line per rule that applies:

```text
CH-VID-20: pass: gitleaks dir on flat text exit 0; canary exit 1
CH-VID-14: manual: transcript on the quickstart page, a human confirms it reads in order
CH-VID-15: n/a: silent recording
```

Evidence is a command and its exit code, or the named exception. The report
guards only upload and publish jobs. It is never a required status check of the
example suite (DOC-EX-11).

## The rules

Severity: MUST blocks commit or upload. SHOULD warns, and passing it needs a
recorded reason in the report. CONSIDER is advice. "The scenario" is the committed
scenario or `.tape` file. "Flattened text" is every `o` event's data joined in
order with the escape sequences removed (`cast_check.py --flatten`). "W" is the
width in CSS px of the drawn terminal text line (the player's `.ap-line`, not its
container) at the narrowest viewport where the surface shows the recording.
CH-VID-09 is retired and not reused. Its 8 px target is a CONSIDER line under
CH-VID-08. Depth, tool pins and measured caps: the pipeline reference.

### Source and form

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-VID-01 | Generate every committed or uploaded demo from a committed scenario that runs the real product binary, asserts its output, names its output path and can regenerate the recording on demand. Commit the recording file only when no build step regenerates it (DOC-EX-13). Never commit a hand recording or scripted fake output. | A hand recording cannot be rebuilt when the CLI changes, and a faked frame misrepresents the product (DOC-EX-12). | See block CH-VID-01. Each scenario step has an `expect`, and each typed tape command is followed by `Wait`. | MUST |
| CH-VID-02 | On a docs site, embed a terminal demo as an asciicast played by a self-hosted asciinema-player. Mount it when the embed scrolls into view, set autoplay off (`autoPlay: false`), and never set `loop: true`. Use an MP4 in `<video controls>` only for GUI content. | A cast is far smaller than a GIF or video, its text can be selected, and it can be paused (SC 2.2.2, VID-F25). Mounting on scroll is not autoplay when the reader starts playback. | See block CH-VID-02. It shows `autoPlay: false` and no `loop: true`, and finds no GIF of a terminal session. | MUST |
| CH-VID-03 | In a README, place a still screenshot (PNG or SVG) that links to the docs page with the player. Add an animated GIF only when motion shows something the still cannot. Such a GIF plays for 5 s or less, plays once (`agg --no-loop`), and SHOULD be 1 MB or less. Never put a script or player in a README. | GitHub removes `script` tags (VID-F12). agg loops by default (VID-F13). A looping GIF has no pause control for viewers who kept autoplay on (VID-F11), and SC 2.2.2 sets 5 s (VID-F25). | See block CH-VID-03. It prints each README with no image link to a PNG or SVG still that points at a page. `GIF` is the file. Duration is 5.0 or less, the loop value is `None`, and the size is 1,048,576 bytes or less. | MUST |
| CH-VID-04 | Render platform video from the scenario to the platform's dated spec: YouTube [VID-F01], [VID-F02]; LinkedIn, the stricter of the Videos API [VID-F06], [VID-F07] and the help page [VID-F10]; Shorts [VID-F03]. Read each limit from its row, never from memory. | An agent's remembered values for a Short or a LinkedIn floor are stale or invented. | See block CH-VID-04. Check each printed field against the rows. Re-fetch a page when its row is overdue, and update the row, not this file. | MUST |
| CH-VID-05 | Do not add Remotion to a repository without the owner's written approval of its licence. | Its free licence is limited by company size, and a licence change is announced (VID-F24). | See block CH-VID-05. It is empty, or a decision record holds the approval. | MUST |
| CH-VID-06 | Pin every render tool and record its provenance. VHS image by tag or digest, never `latest`. `version:` on every use of `charmbracelet/vhs-action`, whose default is `latest`. The agg version, plus the font passed with `--font-dir` and `--font-family`. The asciinema-player version and its sha256 in a comment beside the vendored file. One player version per site family. | One measured set of sites ran three player versions. agg exits 1 on a runner with no fonts. | See block CH-VID-06. No `latest`, every `vhs-action` use has a `version:` line, and the file digest equals the recorded one. | MUST |
| CH-VID-07 | Record new casts as asciicast v3. Leave existing v2 casts until they are re-recorded, and never mix the two formats' header fields. | v3 is the current spec and is not backward compatible with v2 (VID-F15). DOC-EX-14 asks for the version and a parse check. | `cast_check.py FILE` prints no CH-VID-07 line. A v3 header has `term.cols`. A v2 header has `width`. | SHOULD |

### Legibility

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-VID-08 | Set the recording geometry by columns. Keep the column count at or below `floor(0.98 * W / 6)`, with W measured on the surface at its narrowest viewport. This holds the x-height at 6 px or more, a DERIVED floor. Measure W, never assume it. CONSIDER 8 px, which is `floor(0.98 * W / 8)` columns. | Font size cancels out of the on-screen size. The cell width is W divided by the columns whatever font the source sets. The constants come from one OCR engine, not from people. | `cast_check.py --width-px W FILE`, and the `.ap-line` probe in the pipeline reference. See block CH-VID-08 for tapes: `FontSize` without `Columns` fails, and `Columns` with `Width` fails. | MUST |
| CH-VID-10 | Record the vertical master (Shorts, Reels, TikTok) as a dedicated 1080x1920 session of at most 41 columns and 20 rows. Keep all text inside x 120 to 888 and y 288 to 1248. Never crop or scale a landscape recording into a vertical frame. | The safe width is 0.711 of the frame, and 80 columns there gives a 3.1 px x-height. The rectangle is DERIVED from two third-party pages ([VID-F32], [VID-F33]). No platform publishes one. | `cast_check.py --vertical FILE`, and block CH-VID-10 for the frame size. OCR boxes of one frame per second inside the rectangle: unverified: reading heuristic. Label the rectangle "derived, third-party inputs" wherever it is cited. | MUST |
| CH-VID-11 | Cap idle gaps at 2 s with the cast header `idle_time_limit`, the player's `idleTimeLimit`, or `agg --idle-time-limit 2`. | Long pauses read as a broken demo. agg defaults to 5 s (VID-F14), and the player has no limit unless set. | `cast_check.py FILE`, adding `--idle-limit 2` when the embed or agg sets the cap. Otherwise the largest gap between events is 2 s or less. | SHOULD |
| CH-VID-12 | The theme foreground and every ANSI palette colour the session prints reach 4.5:1 against the background of the theme the viewer sees: the cast header theme, or, when the embed forces a theme, that theme in every colour scheme the site offers. | SC 1.4.3 sets 4.5:1 for text (VID-F30). The player draws HTML text, and uses the embedded theme by default (VID-F17). Applying it to GIF and MP4 frames is a reading, so this is SHOULD. 256-colour indices 16 to 255 and truecolour are manual. | `cast_contrast.py --theme theme.json FILE` once per scheme (plain `cast_contrast.py FILE` only when the header embeds a theme and no other is forced). Exit 2 is not a pass. Exit 0. Each `manual:` line is read by hand. | SHOULD |
| CH-VID-27 | Do not print dim (SGR 2) text in a colour whose 50/50 blend with the viewer's theme background is under 4.5:1. Two exceptions need a recorded reason: the same text is in the page's text alternative (CH-VID-14), or it labels an inactive control. Score the blend, not the palette entry. To set secondary text apart, print it in a palette colour that passes alone. | The player draws dim at opacity 0.5 (VID-F19), so no theme can repair it. SC 1.4.3 exempts inactive controls. | `cast_contrast.py --theme theme.json FILE` once per scheme (see Step 7; exit 2 is not a pass). Exit 1 names each failing dim colour and ratio. Dim text on a set background is a `manual:` line. | SHOULD |

### Accessibility

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-VID-13 | On every surface, motion that starts by itself and lasts over 5 s needs a visible pause control. Never autoplay audio unmuted. Players: autoplay off, or a looping cast with `controls: true`. Video: no `autoplay`, or `autoplay muted playsinline controls`. README GIFs follow CH-VID-03. Pages also follow UX-A11Y-25. | SC 2.2.2 and SC 1.4.2 are Level A (VID-F25, VID-F26). A player that mounts on scroll with autoplay off does not start by itself. | See block CH-VID-13. Any `play()` call from a scroll or intersection handler fails unless that element has a visible pause control. | MUST |
| CH-VID-14 | Give every silent recording an in-page text alternative next to the embed: a "Transcript" block, or the page's own steps. It holds every typed command of the scenario in order, and the result of each. A link to the `.cast` file does not count. | SC 1.2.1 is Level A (VID-F27). A cast is an event stream with escape codes, not a described sequence. A `<noscript>` download link is not a text alternative. | `cast_check.py --scenario SCENARIO --page PAGE` exits 0. It does not read the results, so read those: unverified: reading heuristic. | MUST |
| CH-VID-15 | Give narrated video a UTF-8 caption file (SRT or WebVTT) that matches the narration. Narration says every on-screen command, or a descriptive transcript is added. Burn captions in only where no caption slot exists, and keep them off the prompt row. | SC 1.2.2 and 1.2.3 are Level A (VID-F28, VID-F29). Audio description is not required when the audio carries all the visual information. | See block CH-VID-15. A sibling `.srt` or `.vtt` exists and is valid UTF-8, and every scenario command is in the caption text. Burned-in: frame grabs at three cue times show no caption box over the prompt row. | MUST |
| CH-VID-16 | After processing, confirm on the platform that the caption is attached. A 2xx response from the upload call is not proof. YouTube: a captions list call returns a track in the video's language whose kind is not `ASR` [VID-F04], at a quota cost of [VID-F05]. LinkedIn: the video read returns a non-empty `captions` field [VID-F08]. Send a supported `Linkedin-Version` [VID-F09]. | YouTube auto captions are unreviewed. On LinkedIn a video can be served even when caption processing fails. | See block CH-VID-16. Store both responses in the gate report. Needs an owner-supplied credential, otherwise `manual`. Upload mechanics belong to `youtube-video` and `linkedin-post`. | MUST |
| CH-VID-17 | Keep full-screen clears (`ESC[2J`, `ESC[3J`, `ESC[?1049h`) to 3 or fewer in any 1 s window. Run a numeric flash screen when the theme is light or the edit uses crossfades, shake or auto-zoom. | SC 2.3.1 is Level A (VID-F31). A dark theme cannot reach the luminance swing: the measured maximum was 0.0039. | `cast_check.py FILE`, and the total in block CH-VID-17. Flash screen: a mean frame-to-frame luminance change of 0.10 or more fails. unverified: reading heuristic, no script ships. | MUST |
| CH-VID-18 | Set `controls: true` on asciinema embeds. Wrap the player in `role="group"` with `aria-label="Terminal recording: TITLE"`, and add a visible hint: "Focus the player; Space pauses." | `controls: "auto"` hides the bar while the pointer is still (VID-F16). The `.ap-player` node carries only `class` and `style`, and the first Tab stop, `pre.ap-term-text`, has no accessible name (probed on 3.17.0 and 3.19.0, 2026-11-27). DOC-EX-16 accepts `"auto"`, so this is stricter. | See block CH-VID-18. After each player upgrade, probe `.ap-player` for a role, label or tabindex in a browser. If it names itself, the wrapper may be dropped. unverified: reading heuristic, no screen reader was run. | SHOULD |

### Scrub and reproducibility

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-VID-19 | Record in an isolated environment, and fix a leak by re-recording, never by editing the media. The environment has an allowlisted env dict (never `os.environ.copy()`), an isolated `HOME` and `XDG_CONFIG_HOME`, an empty product config directory, every credential variable of the recorded product cleared (for `gh`: `GH_TOKEN`, `GITHUB_TOKEN`, `GH_ENTERPRISE_TOKEN`, `GITHUB_ENTERPRISE_TOKEN`, `GH_HOST`, `GH_REPO`), a synthetic registry and synthetic hosts, and a sentinel prompt. | An inherited login is the likeliest source of a real token. Editing a finished recording broke table alignment in practice, and a mature CLI project's own demo skill says never to redact the GIF after capture. | See block CH-VID-19. A tape has `Env HOME` and `Env XDG_CONFIG_HOME`. A test asserts the child environment lacks the product's token variables. No script runs `sed` on a cast. | MUST |
| CH-VID-20 | Scan the flattened text of every cast, and the raw file too, with `gitleaks dir --no-banner --redact`. Never use the deprecated `gitleaks detect` (VID-F23). A canary cast must be caught: a fake `ghp_` token typed one character per event, with ANSI codes inside it. | A raw scan caught 1 of 4 synthetic casts and the flattened scan caught 4 of 4 (gitleaks v8.30.1). Tokens typed one character at a time, split across events or broken by colour codes evade a raw scan. | See block CH-VID-20. The real casts exit 0 and the canary exits 1. The canary is `checks/fixtures/cast/canary.cast`. | MUST |
| CH-VID-21 | Reduce identity data in the flattened text to zero: the recorder's user name and host name, email addresses, `/Users/`, `C:\Users`, `/root/`, private domain suffixes (`.internal`, `.local`, `.lan`, `.corp` and the organisation's own) and any `/home/SEGMENT` not on the repository's documented allowlist (for example `runner`). | Secret scanners do not flag these values. One measured set of casts held 67 `/home/` lines and 0 scanner findings. | `cast_check.py --identity ORG_NAME --private-domain DOMAIN --allow-home runner FILE` prints no CH-VID-21 line. It adds the current user and host name itself. CONSIDER a gitleaks config with one rule per private domain. | MUST |
| CH-VID-22 | A published cast holds no input (`i`) events, and its header `env` holds only `SHELL` (v3), or `SHELL` and `TERM` (v2). | Typed input and extra variables can carry tokens that never appear in output (VID-F15). | `cast_check.py FILE` prints no CH-VID-22 line. | MUST |
| CH-VID-23 | Compare a regenerated demo with the committed one as normalised text, never as bytes. Normalise temp paths, ports and timestamps, then diff the flattened cast, or a VHS `Output golden.txt`. SHOULD remove the nondeterminism at the source: a fixed port and a short fixed working directory. | Two identical VHS runs gave different GIF, MP4 and WebM bytes, while agg and `golden.txt` were stable (n=2). Casts embed a random temp directory and port. | `cast_check.py --diff COMMITTED REGENERATED` exits 0 on two back-to-back runs. See block CH-VID-23: no check compares media bytes. | MUST |
| CH-VID-24 | Where DOC-EX-13 allows a recording to be committed, run a drift check in CI on every pull request that changes a scenario, a tape or the product's output formatting. It regenerates into a scratch directory, applies the CH-VID-23 diff and reports drift. It never replaces the committed file. It is never a required status check and never a `needs:` dependency of the example suite (DOC-EX-11). Where a build step regenerates the recording, it is not committed, and this rule does not apply. | A demo that no longer matches the CLI misleads readers, and nobody re-runs a manual task. Keeping the job out of the required gate means a recorder failure cannot fail a correctness check. | See block CH-VID-24. Disabling the job leaves the required gate's result unchanged. | SHOULD |
| CH-VID-25 | In a tape: add `Require` for every program it types, before any other non-`Set` command. Set `Set Shell` explicitly. Use `Hide` and `Show` only for setup (fixtures, `cd`, prompt, `clear`). Nothing inside a hidden block prints or fakes product output, and no secret is set in `Env` or `export`. Follow each asserted command with `Wait`, and use `Sleep` only for pacing. | `Hide` stops frame capture only, and the hidden commands still run (VID-F21). `Require` fails early on a missing program (VID-F20). Runner timing varies from 15 to 42 s for one tape. | See block CH-VID-25. Read each `Hide` block: `mkdir`, `export PATH` and `clear` pass, `echo` or `cat` of product-like output fails. | MUST |

### The gate

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CH-VID-26 | Commit or upload a recording only with a passing gate report from CH-VID-14 and CH-VID-20 to CH-VID-23, and, for platform video, CH-VID-04, CH-VID-10, CH-VID-15 and CH-VID-16. In CI, every job that uploads or publishes a recording lists `terminal-demo-gate` in `needs:`. The gate guards only upload and publish jobs, never a required status check of the example suite (DOC-EX-11). | Uploading publishes content off-site, and a secret link is private only by obscurity. | See block CH-VID-26. An upload from a script outside the workflows is not covered, so ask the owner before each one (below). | MUST |

## Verification blocks

Run from the repository root. `git ls-files` feeds every list. Empty output is
the pass unless a block says otherwise.

```sh
# CH-VID-01: every printed name is a recording that no scenario, tape or script names (whole-name match: data.cast never sources a.cast)
git ls-files -z -- ':(glob)**/*.cast' ':(glob)**/*.gif' ':(glob)**/*.mp4' ':(glob)**/*.webm' \
  | xargs -0 -r -n1 sh -c 'b=${1##*/}; found=$(git ls-files -z -- ":(glob)**/*.yaml" ":(glob)**/*.yml" ":(glob)**/*.tape" ":(glob)**/*.py" ":(glob)**/*.toml" | xargs -0 -r grep -l -E -e "(^|[^A-Za-z0-9_.-])$(printf %s "$b" | sed "s/[.]/[.]/g")([^A-Za-z0-9_-]|\$)" --); [ -n "$found" ] || echo "unsourced: $1"' sh
```

```sh
# CH-VID-02: autoplay must be false and loop must not be true. Read every line.
git ls-files -z -- ':(glob)**/*.js' ':(glob)**/*.mjs' ':(glob)**/*.ts' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*.min.js' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -i -E -e 'autoplay' -e 'loop *: *true' --
# any hit is an animated image standing in for a terminal session
git ls-files -z -- ':(glob)**/*.md' ':(glob)**/*.mdx' ':(glob)**/*.astro' ':(glob)**/*.html' \
  | xargs -0 -r grep -H -n -E -e '<img[^>]+[.]gif' --
```

```sh
# CH-VID-03: a script in a README is the finding
git ls-files -z -- ':(glob)**/README.md' | xargs -0 -r grep -H -n -F -e '<script' --
# the still: a README that shows a demo needs [![alt](still.png)](https://docs-page). A README with no demo is exempt.
git ls-files -z -- ':(glob)**/README.md' \
  | xargs -0 -r -n1 sh -c 'grep -q -E -e "\[!\[[^]]*\]\([^)]*[.](png|svg)\)\]\(https?://" -- "$1" || echo "no linked still: $1"' sh
# GIF: set GIF to the file. Duration 5.0 or less, loop None, size 1048576 or less. The loop check needs Pillow.
ffprobe -v error -show_entries format=duration -of csv=p=0 "$GIF"
python3 -I -c "import sys;from PIL import Image;print(Image.open(sys.argv[1]).info.get('loop'))" "$GIF"
wc -c < "$GIF"
```

```sh
# CH-VID-04: set VIDEO to the rendered MP4 and read each field against the facts rows
ffprobe -v error -show_entries stream=codec_name,pix_fmt,width,height,sample_rate:format=duration,size -of json "$VIDEO"
```

```sh
# CH-VID-05: any hit needs an owner-approved decision record
git ls-files -z -- ':(glob)**/package.json' | xargs -0 -r grep -H -n -E -e '"remotion"' -e '"@remotion/' --
```

```sh
# CH-VID-06: no latest, and every vhs-action use has a version line. Read every line.
git ls-files -z -- ':(glob).github/workflows/*.yml' ':(glob).github/workflows/*.yaml' ':(glob)**/Dockerfile' ':(glob)**/*.tape' \
  | xargs -0 -r grep -H -n -E -e 'vhs:latest' -e 'vhs-action@' -e 'version: *latest' --
# digest of the vendored player, to compare with the comment beside it
python3 -I -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "$PLAYER_JS"
```

```sh
# CH-VID-08: a tape that sets FontSize without Columns, or Columns with Width, is printed
git ls-files -z -- ':(glob)**/*.tape' \
  | xargs -0 -r -n1 sh -c 'grep -q -E -e "^Set FontSize" -- "$1" && ! grep -q -E -e "^Set Columns" -- "$1" && echo "FontSize without Columns: $1"; grep -q -E -e "^Set Columns" -- "$1" && grep -q -E -e "^Set Width" -- "$1" && echo "Columns with Width: $1"' sh
```

```sh
# CH-VID-10: expect 1080,1920
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$VIDEO"
```

```sh
# CH-VID-13: an autoplay video must be muted with controls. Hits are findings.
git ls-files -z -- ':(glob)**/*.html' ':(glob)**/*.astro' ':(glob)**/*.md' ':(glob)**/*.mdx' ':(glob)**/*.js' ':(exclude,glob)**/*.min.js' ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/vendor/**' \
  | xargs -0 -r grep -H -n -E -e '<video[^>]*autoplay' -- | grep -v -e 'muted.*controls' -e 'controls.*muted' | cut -c1-200
# play() from a scroll or intersection handler: read each hit for a visible pause control
git ls-files -z -- ':(glob)**/*.js' ':(glob)**/*.mjs' ':(glob)**/*.ts' ':(glob)**/*.astro' ':(exclude,glob)**/*.min.js' ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/vendor/**' \
  | xargs -0 -r grep -H -n -E -e 'IntersectionObserver' -e '[.]play[(]' -- | cut -c1-200
```

```sh
# CH-VID-15: audio stream count, then caption file encoding. Set SRT to the sibling caption file.
ffprobe -v error -show_streams "$VIDEO" | grep -c -F -e 'codec_type=audio'
iconv -f UTF-8 -t UTF-8 "$SRT" > /dev/null
```

```sh
# CH-VID-16: read-only, with a credential the owner supplied for this task. Store both responses.
curl -s -H "Authorization: Bearer $YT_TOKEN" "https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=$VIDEO_ID"
curl -s -H "Authorization: Bearer $LI_TOKEN" -H "Linkedin-Version: $LI_VERSION" "https://api.linkedin.com/rest/videos/$VIDEO_URN"
```

```sh
# CH-VID-17: quick screen. A total of 3 or fewer clears passes without the per-second scan.
grep -c -E -e '\\u001b\[(2J|3J|\?1049h)' -- "$CAST"
```

```sh
# CH-VID-18: the embed sets controls and the group label. Read every line.
git ls-files -z -- ':(glob)**/*.js' ':(glob)**/*.mjs' ':(glob)**/*.ts' ':(glob)**/*.astro' ':(glob)**/*.html' ':(exclude,glob)**/*.min.js' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r grep -H -n -E -e 'controls' -e 'aria-label' --
```

```sh
# CH-VID-19: any hit on the recording path is a finding
git ls-files -z -- "$RECORDER" | xargs -0 -r grep -H -n -E -e 'os[.]environ[.]copy[(][)]' -e '[*][*]os[.]environ' --
git ls-files -z -- ':(glob)**/*.sh' ':(glob)**/*.py' ':(glob)**/Makefile' ':(glob)**/Taskfile.yml' ':(glob)**/taskfile.yml' \
  | xargs -0 -r grep -H -n -E -e 'sed .*[.]cast' -e '[.]cast.*sed ' --
```

```sh
# CH-VID-20: export CHECKS and FLAT first. Flatten every cast, then scan the text and the raw files.
mkdir -p "$FLAT"
git ls-files -z -- ':(glob)**/*.cast' ':(exclude,glob)**/fixtures/**' \
  | xargs -0 -r -n1 sh -c 'python3 -I "$CHECKS"/cast_check.py --flatten "$1" > "$FLAT/${1##*/}.txt"' sh
gitleaks dir "$FLAT" --no-banner --redact; echo "flat exit $?"
gitleaks dir "$CASTS" --no-banner --redact; echo "raw exit $?"
# canary: the flattened fixture must be caught (exit 1), and the raw fixture usually is not
mkdir -p "$SCRATCH/canary"
python3 -I "$CHECKS"/cast_check.py --flatten "$CHECKS"/fixtures/cast/canary.cast > "$SCRATCH/canary/canary.txt"
gitleaks dir "$SCRATCH/canary" --no-banner --redact; echo "canary exit $?"
# a deprecated command in a script is the finding
git ls-files -z -- ':(glob)**/*.sh' ':(glob)**/*.yml' ':(glob)**/*.yaml' ':(glob)**/Makefile' \
  | xargs -0 -r grep -H -n -F -e 'gitleaks detect' --
```

```sh
# CH-VID-23: a media byte comparison in a check script is the finding
git ls-files -z -- ':(glob)**/*.sh' ':(glob)**/*.py' ':(glob)**/*.yml' ':(glob)**/*.yaml' ':(glob)**/Makefile' \
  | xargs -0 -r grep -H -n -E -e '(cmp|sha256sum|md5sum|git diff --exit-code)[^|]*[.](gif|mp4|webm|cast)' --
```

```sh
# CH-VID-24: the workflow runs the recorder on scenario changes. REPO is owner/name.
git ls-files -z -- ':(glob).github/workflows/*.yml' ':(glob).github/workflows/*.yaml' \
  | xargs -0 -r grep -l -E -e 'test:demo' -e 'record_casts' -e 'vhs' --
# the job name must be absent from the required checks
gh api "repos/$REPO/branches/main/protection" --jq '.required_status_checks.contexts'
```

```sh
# CH-VID-25: Type before any Require, no Set Shell, or a secret-like name in Env or Type
git ls-files -z -- ':(glob)**/*.tape' | xargs -0 -r -n1 awk '
/^Require/ { if (typ) print FILENAME ":" FNR ": Require after Type"; req = 1 }
/^Set Shell/ { sh = 1 }
/^Type/ { if (!req) print FILENAME ":" FNR ": Type before any Require"; typ = 1 }
/^(Env|Type) .*(TOKEN|KEY|SECRET|PASSWORD)/ { print FILENAME ":" FNR ": secret-like name in " $1 }
END { if (!sh) print FILENAME ": no Set Shell" }'
```

```python
# CH-VID-26: needs PyYAML, so run it as: uv run --with pyyaml python -I needs.py .github/workflows/*.yml
import re, sys, yaml

bad = 0
for f in sys.argv[1:]:
    for n, j in ((yaml.safe_load(open(f)) or {}).get("jobs") or {}).items():
        text = " ".join(
            str(s.get("run", "")) + " " + str(s.get("uses", "")) for s in j.get("steps", [])
        )
        if re.search(r"asciinema upload|vhs publish|youtube|linkedin", text, re.I):
            needs = j.get("needs", [])
            needs = [needs] if isinstance(needs, str) else needs
            if "terminal-demo-gate" not in needs:
                print("ungated:", f, n)
                bad = 1
sys.exit(bad)
```

## What to ask a human

Ask before acting, and put each answer in the gate report.

- Every upload or publication: `asciinema upload`, `vhs publish`, YouTube,
  LinkedIn, Shorts. No check replaces this question (CH-VID-26).
- Whether to re-record casts over the column cap, and at which column count. As
  written, CH-VID-08 requires the phone cap. Whether the CH-VID-14 text
  alternative may serve as the phone reading path is the owner's call.
- Whether dim text of an inactive control is exempt (CH-VID-27).
- Whether the 8 px target becomes MUST, and whether CH-VID-12 and CH-VID-27
  return to MUST for player embeds.
- Whether DOC-EX-13 also covers a scratch-directory drift check. If it does,
  CH-VID-24 is retired for that repository.
- Whether any real customer, account, registry, host or person may appear on
  screen, even a public one. Whether a demo may show simulated output (it must
  then say so).
- Adding Remotion, Screen Studio, Descript or any paid tool, and any font, music
  or voice licence. A synthetic voice or an AI avatar, and its disclosure.
- Burning captions into brand-controlled cuts, and whether to claim WCAG
  conformance on a page.
- Whether paid placements use a stricter margin than the derived rectangle
  (unverified).
- Turning on GitHub push protection for a repository. It is a backstop only.

## What agents get wrong

1. Treating one tool's surface check as the gate: scanning the raw `.cast` and
   calling it clean, counting `Hide` as scrubbing, reporting an accessibility run
   as passing when the player never mounted, or calling a 2xx upload a caption
   proof.
2. Recording in the live shell with a real `HOME`, then patching the cast with
   `sed`. Re-record instead.
3. Sizing by font instead of columns, measuring the container instead of the drawn
   text line, and cropping a landscape recording into a vertical frame.
4. Writing platform limits from memory, and citing third-party margins as official.
5. Stale tool idioms: `gitleaks detect`, `vhs:latest`, v2 header fields in a v3
   cast, a byte comparison of a regenerated GIF, agg on a runner with no fonts.
6. Misrouting accessibility: an empty `.vtt` for a silent cast, a `<track>` on the
   cast player, a `<noscript>` download link as the text alternative, a looping
   autoplay GIF in a README, judging flashes by eye on a dark cast and extending
   that to a light theme, scoring dim text by its palette entry, checking the
   header theme when the embed forces another.
7. Wiring the recorder into the required gate, or committing a recording that the
   build also regenerates (DOC-EX-11, DOC-EX-13).
8. Reaching for Remotion or a paid recorder for a terminal demo.

## Where the depth is

| Read | When |
|---|---|
| [references/pipeline.md](references/pipeline.md) | Choosing a form, writing a tape or scenario, rendering, measuring W, reading column caps, pinning tools |
| [references/facts.md](references/facts.md) | Citing a platform limit, a WCAG page, a tool default or the player version |
| `checks/cast_check.py` | Steps 5, 6, 8 and 9: scrub, geometry, idle, flashes, transcript, drift |
| `checks/cast_contrast.py` | Step 7: palette and dim contrast |

Siblings. `docs-quality` owns where a recording lives, the player's autoplay,
controls and reduced-motion checks, and the tooltip (DOC-EX-11 to 18 and 34). This
skill cites them and never restates them. `youtube-video` and `linkedin-post` own
upload mechanics, titles and labels. `ux-quality` owns page-level accessibility
(UX-A11Y-25). Page-embed wiring is yours only through CH-VID-02, 13, 14 and 18.

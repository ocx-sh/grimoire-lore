---
title: Render Pipeline and Tool Pins for Terminal Demos
summary: The form each surface takes, the scenario every demo comes from, how to render each form, the measured column caps, and the pinned tools (CH-VID-01 to CH-VID-07)
---

# Render Pipeline and Tool Pins for Terminal Demos

Owns the choice of form per surface, the committed scenario, the render commands
and the tool pins. The rows themselves (CH-VID-01 to CH-VID-07) are in the
skill's `SKILL.md`. Dated platform limits are in `facts.md`, cited by id.

Contents: [Dates and Versions](#dates-and-versions) ·
[Form per Surface](#form-per-surface) · [The Scenario](#the-scenario) ·
[Render Commands](#render-commands) · [Column Caps](#column-caps) ·
[Pins](#pins) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Read or measured on 2026-11-27, and moved only by re-reading.

| Tool or measure | Pin | Re-check when |
|---|---|---|
| VHS | v0.12.1 (2026-09-24) | a VHS release; re-run the legibility law |
| vhs-action | 2.1.1, with `version:` set on every use | a release, because its default is `latest` |
| agg | 1.9.0 | an agg major release; its `--idle-time-limit` default is 5 (VID-F14) |
| asciinema CLI | 3.2.1 | a release |
| asciinema-player | 3.19.0, published 2026-11-22 (VID-F18) | every player upgrade: re-run the dim, attribute and parse checks |
| gitleaks | v8.30.1 (2026-03-21), `dir` mode (VID-F23) | a scanner change: re-run the canary |
| OCR engine of the legibility law | RapidOCR 1.2.3 on VHS v0.12.1 | a VHS or player major release, a font change, or a human legibility test |

Tool versions come from the projects' release pages, read 2026-11-27. The npm
bundle sha256 of player 3.19.0 is in VID-F18. Record the digest of whichever
player version the site vendors, in a comment next to the file.

## Form per Surface

One scenario, many renders. Choose the form from the surface.

| Surface | Form | Rule |
|---|---|---|
| Docs site (Astro, MkDocs or similar) | asciicast played by a vendored, lazily loaded asciinema-player with autoplay off | CH-VID-02 |
| README | a still screenshot (PNG or SVG) that links to the docs page with the player. An animated GIF only when motion shows something the still cannot: 5 s or less, played once, 1 MB or less | CH-VID-03 |
| YouTube and LinkedIn | H.264 MP4 rendered from the same scenario or tape | CH-VID-04 |
| Shorts and other vertical video | a separate narrow tape in a 1080x1920 frame, never a cropped landscape recording | CH-VID-10 |
| GUI demo (editor extension, desktop app) | screen recording, with a written shot script | CH-VID-01 |
| Produced explainer or launch video | Remotion, only after the owner approves its licence | CH-VID-05 |

Measured sizes for one 16 s session (2026-11-27): cast 4,653 B, VHS MP4 38,181 B,
VHS GIF 68,110 B, agg GIF 121,514 B. A cast is 8 to 26 times smaller than the
other forms, and its text can be selected and paused. In a sample of 16 exemplar
READMEs, 9 "demos" were still screenshots. A README cannot run a player,
because GitHub's sanitiser removes `script` tags (VID-F12).

A repository that already holds a page-bound scenario tree adds a VHS tape only
with a recorded reason (DOC-EX-18).

## The Scenario

A scenario is the committed source of a demo. It is either the repository's own
scenario format or a VHS `.tape`. It must:

- run the real product binary, never print or fake output;
- assert the output of each step: an `expect` per step in a scenario file, or a
  `Wait` after each typed command in a tape;
- name its output path, so a recording traces back to its source (CH-VID-01);
- start from the isolated environment of CH-VID-19, never from the recorder's shell;
- be able to regenerate the recording on demand, whether or not the recording
  file is committed (DOC-EX-13 decides that).

A tape that meets CH-VID-25:

```tape
Output demo.gif
Require mytool
Set Shell "bash"
Set Columns 52
Env HOME "/tmp/demo-home"
Hide
Type "cd /tmp/demo-work && clear"
Enter
Show
Type "mytool init demo"
Enter
Wait /ready/
Sleep 1s
```

`Hide` stops frame capture only. The commands inside still run, so a hidden
block holds setup and nothing that prints or fakes product output. `Sleep` paces
the demo and asserts nothing. Add `Output golden.txt` to get a text file that
CH-VID-23 can diff between runs.

## Render Commands

| Goal | Command or option |
|---|---|
| Play a cast on a docs page | player options `autoPlay: false` (spelled `autoplay` on the options page, so match both), `idleTimeLimit: 2`, `fit: 'width'`, `controls: true`. Mount the player when the embed scrolls into view. Never `loop: true` |
| README GIF from a cast | `agg --no-loop --idle-time-limit 2 --font-dir DIR --font-family NAME demo.cast demo.gif` |
| MP4 for YouTube or LinkedIn | tape `Output demo.mp4`, then check with `ffprobe` against `facts.md` |
| Cast of the scenario | record the scenario with `asciinema rec` inside the isolated environment, never in your own shell, and never with input capture |
| Vertical master | a dedicated tape of at most 41 columns and 20 rows in a 1080x1920 frame. The rule fixes the target, not a recipe: adjust the tape until `ffprobe` prints `1080,1920` and every text box sits inside x 120 to 888 and y 288 to 1248 |

agg exits 1 with `no faces matching font family options` on a runner with no
fonts, so pass `--font-dir` and `--font-family` and commit the font file's name in
the pin comment. The rectangle of the vertical master is derived from two
third-party pages (VID-F32, VID-F33). No platform publishes one.

## Column Caps

Legibility is set by columns, not font size. The measured law is rendered x-height
about 0.98 times the drawn text width W divided by the column count, and the font
size cancels out. The floor is 6 px and the target is 8 px. Both are DERIVED from
one OCR engine (OCR similarity 0.85 at 6 px, 0.72 at 5 px, 0.45 at 4 px), not
from a platform or a human study, and carry that label wherever you cite them.

W is the width of the drawn text line (the player's `.ap-line`), not its
container, at the narrowest viewport where the surface shows the recording. Read
it with a probe after the player mounts:

```js
const l = document.querySelector('.ap-line');
l.getBoundingClientRect().width / l.textContent.length // px per column
```

Fail when 0.98 times that cell width is under 6. A wrong geometry shows as a cell
of 1.7 to 2.7 px on a 360 px phone with 120 to 180 columns.

Caps at the 6 px floor, measured in headless Chromium build 1255 on 2026-11-27,
for these layouts as built then:

| Surface | Viewport | Drawn text line W | Cap (columns) |
|---|---|---|---|
| Starlight and MkDocs Material docs page | 360 px | 322 px | 52 |
| same | 390 px | not recorded | 57 |
| docs column fixed at 720 px | 768 to 1920 px | 708 px | 115 |
| themed player that snaps its font | 360 and 390 px | 300 px, 3.000 px per column | 49 |
| same | desktop | 700 px, 7.000 px per column | 114 |

The 8 px target (CONSIDER, a project choice) allows 39 columns on a 360 px phone and 86 on the 720 px
column, and has not been tested on people. Measure any other layout yourself.
No 80-column CLI session passes the phone cap, so on a phone the CH-VID-14 text
alternative may be the only legible reading path. Whether it may stand in for
phone legibility is the owner's call.

## Pins

CH-VID-06 in practice:

- Pull the VHS container image by tag or digest, never `latest`. Set `version:`
  on every use of `charmbracelet/vhs-action`.
- Record the agg version and the font file given to `--font-dir`.
- Vendor the player, and write its version and sha256 in a comment beside the
  file. Check it with `python3 -I -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" FILE`.
  Use one player version per site family.
- Cast version: record new casts as asciicast v3. v3 is not backward compatible
  with v2: the header schema and the timestamp base differ (VID-F15). Never mix
  fields of the two. DOC-EX-14 asks you to state the cast version and check that
  the pinned player parses it.

## What Agents Get Wrong Here

- Writing `Set FontSize 28` or "zoom in" and believing the text is now large.
- Measuring the embed container, or the viewport, instead of the drawn text line.
- Cropping a 16:9 recording into 9:16 for Shorts.
- Proposing Remotion or a paid recorder for a terminal demo.
- Putting a looping GIF or a `<script>` in a README.
- Running `vhs` from `latest`, or `vhs-action` without `version:`.
- Treating a hand recording as a demo. It cannot be rebuilt when the CLI changes.

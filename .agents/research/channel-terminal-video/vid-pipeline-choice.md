---
title: Terminal and product demo recording pipelines - which form per surface, and the gates every recording passes
program: product
sub_program: channels
topic: channel-terminal-video
worker: vid-pipeline-choice
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
scope: >
  Covers the choice of demo form (asciicast plus asciinema-player, VHS tape to GIF/MP4/WebM, agg GIF,
  screen-recorded MP4, Remotion) for the Astro docs site, MkDocs site, GitHub README, YouTube, LinkedIn and
  Shorts; embedding, size, reproducibility and regeneration tests; and the file-level gates (motion,
  alternatives, secret and path scrub). Does not cover studio video, scripting, captions authoring, loudness,
  or the full legibility and scrub methods (sibling workers vid-legibility and vid-scrub own those).
---

# Terminal and product demo recording pipelines

## Table of contents

1. Summary
2. Findings
   1. Scout figures re-checked
   2. The five forms, per fact
   3. Measurements (agg and VHS, two runs each)
   4. Exemplar READMEs: what the 16 "demos" actually are
   5. Fleet pipeline as found
   6. Per-surface decision table
   7. Gates every recording passes
3. Dated facts
4. Normative guidance candidates
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Default form on the Astro and MkDocs docs sites: an asciicast file (v3 for new casts) played by a vendored asciinema-player, lazy-loaded, never autoplayed. The same 16-second session is 4,653 bytes as a cast (1,280 gzipped), 38,181 bytes as VHS MP4, 53,962 as WebM, 68,110 as VHS GIF and 121,514 as agg GIF (measured below).
- Default form in a GitHub README: an animated GIF (agg from a cast, or VHS) or a still screenshot, committed in the repo. GitHub does not run the player script, so a cast cannot be the README form. GitHub's attachment limits (10 MB images and GIFs, [GitHub Docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files), undated) apply to files dragged into issues, PRs and comments, and the page does not mention READMEs.
- Default form on YouTube: an H.264 MP4 rendered from a VHS tape at 1920x1080 (terminal-only demos) or a screen recording (GUI demos). LinkedIn: MP4, 3 s to 30 min, 75 KB to 500 MB per the [LinkedIn Videos API page](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api) (ms.date 2026-02-12, platform). YouTube's upload page gives [8 Mbps for 1080p SDR at 24 to 30 fps](https://support.google.com/youtube/answer/1722171) (undated, footer 2026).
- Shorts: square or vertical, up to three minutes, only for uploads on or after 2024-10-15 ([YouTube Help](https://support.google.com/youtube/answer/15424877), platform, undated page). A 180-column terminal does not survive a vertical crop; record a purpose-built narrow tape (not measured here).
- Remotion is a composition tool for produced video, not a terminal recorder. It has no role on docs or README surfaces. Free use is limited to individuals and organisations of up to 3 people, plus non-profits and evaluation ([Remotion pricing](https://www.remotion.dev/docs/license/pricing.md), [FAQ](https://www.remotion.dev/docs/license/faq.md), vendor, undated); anything larger needs a paid licence, a business decision to ask about.
- Demos must be generated from a committed script (tape or YAML scenario), not hand-recorded. The fleet already does this for casts: `test/recordings/test_record_casts.py` asserts command output while recording, and the fleet has 0 `.tape` files.
- Regeneration is not byte-reproducible for VHS: two identical runs gave different GIF, MP4 and WebM bytes (measured). agg is byte-reproducible given the same cast, font and options (measured). VHS text output (`Output golden.txt`) was identical across two runs. So a regeneration check compares normalised text, not bytes.
- The fleet's own casts leak environment detail: temp directory names such as `/tmp/grim-cast-3vgxhmm4/...` and a random registry port appear in `quickstart.cast`. Gitleaks found no secrets in 19 casts; path and port leakage is a separate gate.
- Scout figure that fails: "10 casts with a height and `idle_time_limit` set to 16 to 66 s". No v2 cast has `idle_time_limit`; 16 to 66 are `height` values in rows. The 8 v3 casts have `idle_time_limit: 2`.
- Scout figure that reproduces with a caveat: GitHub video limit 10 MB free and 100 MB paid, but the page adds a membership condition and a 25 MB limit for other files.
- Fleet README demo gap reproduces (0 of 18), but the upstream "16 of 40" is mostly static screenshots and charts: only 4 of the 16 are animated or recorded (nushell GIF, fd SVG, devbox SVG, pixi link to asciinema.org). All 16 are now recorded with form and size in section 4.
- A GIF that autoplays for more than 5 seconds needs a pause mechanism under [WCAG 2.2 SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) (Level A, page updated 2026-10-04), and a GIF has none. That makes the player (autoPlay false, pause control) or a `<video controls>` the safer docs form.

## Findings

### 1. Scout figures re-checked

Scout: [channel-video-production-software.md](.agents/research/marketing-topic-map/channel-video-production-software.md); audit: product-audit/exemplar-readmes.md.

| Scout or brief claim | Result | Command or source |
|---|---|---|
| 11 v2 casts in the grimoire docs site | Reproduces (11 files in `casts/`, all version 2, width 180 except browse-tui 120). A twelfth, `docs/public/demo.cast` (v2, 180x30), sits beside them | `ls grimoire-rs/grimoire/docs/public/casts/*.cast \| wc -l`; python3 -I reading line 1 of each |
| "10 casts with height and `idle_time_limit` 16 to 66 s" | Fails. Heights are 16, 19, 30, 33, 35, 50, 54, 57, 58, 63, 66 rows. `idle_time_limit` is absent in all 11 v2 casts | same header read: field `idle_time_limit` printed `None` for all 11 |
| 8 v3 casts in ocx www-setup | Reproduces (8 files, all `version: 3`, 100 cols, `idle_time_limit: 2`, rows 5 to 40) | `ls ocx-sh/www-setup/site/public/casts/examples \| wc -l` |
| 0 VHS tapes | Reproduces | `find . -name '*.tape' -not -path '*/node_modules/*' -not -path '*/.git/*' \| wc -l` printed 0 |
| `cast_recorder.py` PTY recorder | Reproduces; the runner is `test_record_casts.py`, which reads `test/recordings/casts/*.yaml` and refuses a step with no `expect` | `ls grimoire-rs/grimoire/test/recordings/` |
| Demos in 0 of 18 fleet READMEs | Reproduces: 18 fleet rows, demo position `-` in every row | `awk` over the "### Fleet" table of exemplar-readmes.md |
| 16 of 40 upstream READMEs carry a demo | Reproduces as a count, but it is a screenshot/GIF/video/chart count; see 4 | exemplar-readmes.md line 108 |
| GitHub attachments 10 MB free, 100 MB paid | Reproduces with conditions, see 2.3 | [GitHub Docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) |
| Casts are 180 columns | Reproduces; legibility at page width was not measured by the scout (sibling worker vid-legibility owns it) | header read |
| The vendored player bundle is "181 KB" (code comment in `casts.js`) | Real file is 185,010 bytes (3.17.0); upstream 3.19.0 asset is 228,480 bytes, so the vendored copy is two minors behind | `stat -c %s docs/public/asciinema-player.min.js`; [GitHub API releases/latest](https://api.github.com/repos/asciinema/asciinema-player/releases/latest) |

### 2. The five forms

#### 2.1 Asciicast plus asciinema-player

- Format: newline-delimited JSON. v2 events use time since recording start ([asciicast v2](https://docs.asciinema.org/manual/asciicast/v2/), page footer 2023). v3 events use the interval from the previous event, add `term.cols/rows`, optional `tags`, and an `x` exit event; the spec's initial version is dated 2025-09-10 and was revised 2025-10-20 ([asciicast v3](https://docs.asciinema.org/manual/asciicast/v3/)). v3 is not backward compatible with v2. Player support for v3 arrived in 3.10.0.
- Privacy defaults: v2 header `env` captures only `SHELL` and `TERM`; v3 captures only `SHELL`. Input events (`i`) are not captured by default. The 19 fleet casts hold 0 input events (python3 -I count, run for this report).
- Embedding: `AsciinemaPlayer.create('demo.cast', element)` with the npm package `asciinema-player` or the release files `asciinema-player.min.js` and `.css` ([player repo](https://github.com/asciinema/asciinema-player)). Options that matter: `autoPlay` default false, `loop` false, `controls` "auto", `fit` "width", `idleTimeLimit`, `poster`, `preload` false ([player options](https://docs.asciinema.org/manual/player/options/)). Latest release v3.19.0, 2026-11-22 ([GitHub API](https://api.github.com/repos/asciinema/asciinema-player/releases/latest)); assets 228,480 bytes JS and 19,631 bytes CSS.
- Fleet embedding already follows the right shape: `casts.js` constructs the player on first intersection (`rootMargin 200px`), `autoPlay: false`, `idleTimeLimit: 2`, `fit: 'width'`, with a `<noscript>` link to the raw cast (read from `grimoire-rs/grimoire/docs/public/casts.js`). The ocx theme adds a `prefers-reduced-motion` check and `aria-label` on the controls (`ocx-sh/website/packages/theme/src/components/terminal.mjs`, lines 95, 171, 310).
- Version drift in the fleet: grimoire vendors 3.17.0 outside the lockfile; ocx packages pin npm 3.15.1; upstream is 3.19.0. A rule needs a recorded provenance line and an update check.
- Size: this session as a cast is 4,653 bytes (1,280 gzipped; command in 3). The player script costs 185 to 228 KB once per page that has an embed, which the fleet avoids on pages without casts by lazy injection.
- Text stays text: copy-paste works ([player repo](https://github.com/asciinema/asciinema-player)), search engines and screen readers can reach the content if it is also in the page. Alternatives for the 'video-only' content under WCAG 1.2.1 are still needed (see 7).

#### 2.2 agg GIF

- agg 1.9.0, released 2026-05-29 ([GitHub API](https://api.github.com/repos/asciinema/agg/releases/latest)). Reads asciicast v1, v2 and v3, writes GIF using gifski ([agg manual](https://docs.asciinema.org/manual/agg/)). Defaults: `--theme dracula`, `--font-size 16`, `--idle-time-limit 5`, `--fps-cap 30`, `--last-frame-duration 3`, loops unless `--no-loop` ([agg usage](https://docs.asciinema.org/manual/agg/usage/)).
- It needs a monospace font. On a host without fonts, `agg quickstart.cast out.gif` exits 1 with `Error: no faces matching font family options` (measured). The cast's own theme is used automatically only if the recording embeds one.
- Reproducibility: same cast, same font file, same flags gave identical bytes in two runs (3).

#### 2.3 GitHub attachment limits

[GitHub Docs: Attaching files](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) (page carries no date): 10 MB for images and GIFs; 10 MB for videos in a repository owned by a user or organisation on a free plan; 100 MB for videos on a paid plan; 25 MB for all other files. Videos over 10 MB in a paid-plan repository also need the uploader to be an organisation member, an outside collaborator, or on a paid plan. Types: PNG, GIF, JPEG, SVG and video (MP4, MOV, WebM); the page recommends H.264. The page describes attachments to issues, pull requests and comments, and says nothing about README files, so "README video limit" is an inference, not a documented limit. Committed repository files are a separate matter this page does not cover.

#### 2.4 VHS

- Release v0.12.1, 2026-09-24 ([GitHub API](https://api.github.com/repos/charmbracelet/vhs/releases/latest)); GitHub Action `charmbracelet/vhs-action` v2.1.1, 2026-08-11. Requires `ttyd` and `ffmpeg` on PATH (ttyd's latest release is 1.7.7, 2024-03-30); the Docker image `ghcr.io/charmbracelet/vhs` bundles both and is 3.06 GB locally ([VHS README](https://github.com/charmbracelet/vhs)).
- Outputs: `Output out.gif`, `out.mp4`, `out.webm`, a PNG directory, and `golden.txt` or `.ascii` text. Commands: `Set` (FontSize, Width/Height or Columns/Rows, Theme, TypingSpeed, Framerate, PlaybackSpeed, Shell), `Type`, `Enter`, `Sleep`, `Wait /regex/` (default timeout 15 s), `Hide`/`Show`, `Require`, `Env`, `Screenshot`, `Source`. The README suggests `.txt` golden files committed to git to detect diffs between runs, and does not claim byte-identical media.
- `Hide`/`Show` is how setup lines (PATH, prompt) stay out of frames; anything typed outside a `Hide` block is recorded.

#### 2.5 Screen-recorded MP4

Required for GUI and editor demos (VS Code extension). YouTube upload spec: MP4, H.264 High Profile, 4:2:0, AAC-LC or Opus audio 48 kHz, 8 Mbps at 1080p 24 to 30 fps, 12 Mbps at 48 to 60 fps, 35 to 45 Mbps at 4K ([YouTube Help](https://support.google.com/youtube/answer/1722171), no date; footer 2026). Not reproducible from source; a human or an automation driver must redo it per release.

#### 2.6 Remotion

Render syntax `npx remotion render <entry> <composition-id> <output>`; default codec H.264; `--codec gif` exists; Chrome Headless Shell is downloaded by default; the page does not state determinism ([Remotion render CLI](https://www.remotion.dev/docs/cli/render)). Latest release v4.0.547, 2026-11-24 ([GitHub API](https://api.github.com/repos/remotion-dev/remotion/releases/latest)). Licence, fetched 2026-11-27 (vendor, both pages undated): the [pricing page](https://www.remotion.dev/docs/license/pricing.md) says the Free License is for "individuals and companies of up to 3 people" and a Company License is "Required if you do not qualify"; the [FAQ](https://www.remotion.dev/docs/license/faq.md) adds non-profits "regardless of your headcount" (government bodies and educational institutions need written permission) and evaluation use, and says Remotion 5.0 changes the licence and terms (mandatory telemetry for Remotion for Automators server-side rendering; no 5.0 date given). Paid tiers on the pricing page: Automators $0.01 per render ($100 monthly minimum), Creators $25 per month per seat, Enterprise from $500 per month. The scout's claim reproduces, with "for-profit" not in the text: the team limit is 3 people for any company. A React composition of a terminal is possible but pays a headless-browser cost for something VHS does directly. Use only for produced explainer or launch video.

#### 2.7 GIF versus video for web embeds

[web.dev "Replace animated GIFs with video"](https://web.dev/articles/replace-gifs-with-videos) (undated in the fetched text): one example animation is 3.7 MB as GIF, 551 KB MP4, 341 KB WebM; recommends `<video autoplay loop muted playsinline>`; browsers use the first supported `<source>`, so list WebM before MP4 if WebM is preferred. Our measurement agrees on direction: the VHS MP4 is 56 percent of the VHS GIF and 31 percent of the agg GIF for the same short session.

### 3. Measurements

Working directory `~/.cache/research-lang/exemplars/product/vid-pipeline-choice/`. Source cast: copy of `grimoire-rs/grimoire/docs/public/casts/quickstart.cast` (v2, 180x16, 200 events, 15.8 s). Host: WSL2, Linux 6.8, no system monospace fonts, no ffmpeg or ttyd installed; agg ran as the release binary, VHS ran in Docker.

Commands:

```bash
# agg 1.9.0 (binary from the GitHub release), fonts copied out of the vhs image
agg --font-dir fonts --font-family "DejaVu Sans Mono" --quiet quickstart.cast agg1.gif   # and agg2.gif
sha256sum agg1.gif agg2.gif
# VHS 0.12.1, tape quickstart.tape (Output .gif .mp4 .webm; Width 1280, Height 360, FontSize 16, Theme Dracula)
docker run --rm -v $PWD/v1:/vhs ghcr.io/charmbracelet/vhs:v0.12.1 quickstart.tape        # and v2
# text golden: tape with only `Output golden.txt`, two runs, diff
```

The VHS tape types `grim init`, `grim add ...`, `grim install --client claude` against a stub `grim` script that prints the same three tables as the cast (the real `grim` was not used, so the sessions are equivalent in shape, not in bytes of output).

| Form | Bytes | Wall time | Second run |
|---|---|---|---|
| Cast v2 (source) | 4,653 (1,280 gzip) | n/a | n/a |
| agg GIF | 121,514 | 5.40 s, 5.13 s | byte-identical (same sha256 `6d86f96d...`) |
| VHS GIF | 68,110 and 68,335 | 25.8 s (includes container start) | differs |
| VHS MP4 | 38,181 and 38,440 | same run | differs |
| VHS WebM | 53,962 and 53,405 | same run | differs |
| VHS `golden.txt` (text) | 6,857 | 15.1 s, 33.7 s | identical (`diff` empty) |

Reading: n is 2 per cell; run-to-run wall time varied from 15 to 42 s for the same tape, so no CI time budget should be set from one run. The VHS golden file is a frame-by-frame dump (it begins with several `>` prompt frames before `Hide` ends), so it is identical only while frame timing yields the same frame count; two runs is weak evidence, a CI check should normalise (drop duplicate frames, keep the last frame).

Other measurements for this report:

```bash
# gitleaks across both cast directories (docker image zricethezav/gitleaks:latest)
docker run --rm -v $PWD/grimoire-rs/grimoire/docs/public/casts:/c:ro zricethezav/gitleaks:latest dir /c --no-banner --redact   # no leaks found, 164,284 bytes
docker run --rm -v $PWD/ocx-sh/www-setup/site/public/casts/examples:/d:ro zricethezav/gitleaks:latest dir /d --no-banner --redact   # no leaks found, 67,406 bytes
grep -c '/tmp/' grimoire-rs/grimoire/docs/public/casts/*.cast      # every cast has >=1 line with /tmp/ (quickstart: 2, scopes: 3)
grep -o '/home/[a-z]*' -r ocx-sh/www-setup/site/public/casts | sort | uniq -c   # /home/runner in 5 of 8 v3 casts (13 lines each in dev-box-*)
```

### 4. Exemplar READMEs: forms and sizes

Method: `gh api repos/<r>/readme -H 'Accept: application/vnd.github.raw' | head -60`, then a grep for media that is not a badge. The audit's 16 repos with a demo position are below; sizes by `curl -sIL` where the file is a hosted asset.

| Repo | What the "demo" is | Form | Size |
|---|---|---|---|
| nushell/nushell | `assets/nushell-autocomplete6.gif` | animated GIF | 1,260,827 B |
| sharkdp/fd | `doc/screencast.svg` | animated SVG (CSS `@keyframes`, svg-term style) | 127,453 B |
| jetify-com/devbox | `assets/devbox_demo.svg` | animated SVG screencast | 106,054 B |
| prefix-dev/pixi | image linked to `asciinema.org/a/636482` | still image link-out to a cast | asset returned no length |
| BurntSushi/ripgrep | `burntsushi.net/stuff/ripgrep1.png` | static PNG | 50,940 B |
| casey/just | `etc/screenshot.png` | static PNG | 361,348 B |
| cli/cli | `gh pr status` screenshot (user-images) | static PNG | 204,602 B |
| dandavison/delta | four `<img>` screenshots; first measured | static PNG | 175,943 B (first) |
| derailed/k9s | `assets/k9s.png` and three more | static PNG | 130,038 B (first) |
| eza-community/eza | `docs/images/screenshots.png` (alt text says "demo gif", file is a PNG) | static PNG | 1,062,311 B |
| helix-editor/helix | `screenshot.png` | static PNG | 367,553 B |
| junegunn/fzf | `fzf-preview.png` and three more | static PNG | 491,880 B (first) |
| sharkdp/bat | three imgur PNG screenshots | static PNG | not measurable: imgur returned HTTP 429 |
| astral-sh/ruff | benchmark bar chart | static SVG | 9,227 B |
| astral-sh/uv | benchmark bar chart (GitHub user-attachment) | static image | not measurable: HTTP 403 |
| evanw/esbuild | `images/benchmark-light.svg` | static SVG | 2,050 B |
| prefix-dev/pixi | image (user-attachment, HTTP 403 on HEAD) linking to `asciinema.org/a/636482` | still image link-out; the linked cast file is `application/x-asciicast` | cast 57,694 B; the image asset size not measurable |

Sizes: `curl -sIL -A x <url>` and the `content-length` header, 2026-11-27; README sources fetched with `gh api repos/<r>/readme -H 'Accept: application/vnd.github.raw'` and media extracted with `grep -oE`, files kept under `~/.cache/research-lang/exemplars/product/vid-pipeline-choice/readmes/`. Only the first image per README is measured where several exist.

So the animated forms in the exemplars are GIF (1), animated SVG (2) and a link-out to an asciinema.org page (1). No exemplar README embeds a `<video>` or a player. An agent adding a demo to a fleet README is on safe ground with a screenshot first and an animated asset second. The README sample is the first 60 lines only; a demo placed lower was not looked for.

### 5. Fleet pipeline as found

- grimoire: `test/recordings/test_record_casts.py` runs every `test/recordings/casts/*.yaml` scenario; it is outside `testpaths = ["tests"]` and run by `task test:demo`. A step without an `expect` fails collection, so a cast exists only if the commands succeeded and matched. That is stronger than anything in VHS's own docs.
- Regeneration is not byte-stable: `quickstart.cast` embeds `/tmp/grim-cast-3vgxhmm4/myproject/...` and a random registry port (`localhost:53703`). A rerun produces a different file. A regeneration test must compare normalised text, with the temp path and port replaced, not file bytes.
- ocx: v3 casts, `idle_time_limit: 2`, themed player with a motion preference check.
- None of the fleet READMEs embeds any of these: demo position `-` in all 18.

### 6. Per-surface decision

| Surface | Default form | Why | Fallback or exception |
|---|---|---|---|
| Astro docs (ocx) | asciicast v3 + vendored asciinema-player, lazy, no autoplay, poster, `<noscript>` link | smallest, text, pausable, themed | GUI content: MP4 in `<video controls>` |
| MkDocs docs | same; copy player JS and CSS into `docs/` and add via `extra_javascript` / `extra_css` (mkdocs config keys; not fetched from the MkDocs docs, so confirm before relying) | same | none |
| GitHub README | still screenshot first; animated GIF from agg if motion adds information; keep under 10 MB ([GitHub's image and GIF limit](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)) | player scripts do not run in a README; GIF is the portable animation | link out to the docs page with the player; an asciinema.org link image (pixi's pattern) |
| YouTube | MP4 H.264 from a VHS tape at 1920x1080, or screen recording | [YouTube recommends H.264 MP4 at 8 Mbps for 1080p SDR 24 to 30 fps](https://support.google.com/youtube/answer/1722171); tape makes it repeatable | GUI: screen recording |
| LinkedIn | MP4 from the same render, 3 s to 30 min, 75 KB to 500 MB ([LinkedIn Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api), ms.date 2026-02-12); upload an SRT caption (one file, English only, same page) | platform limits | LinkedIn's own help pages for native uploads were not fetched |
| Shorts | purpose-built vertical tape (Width 1080, Height 1920, large font, narrow columns), up to 3 min | [classification is by square or vertical ratio and length up to 3 minutes](https://support.google.com/youtube/answer/15424877) | not measured; CONSIDER |

### 7. Gates every recording passes

File-level gates only; legibility measurement and scrub method are owned by sibling workers.

- Motion (WCAG 2.2 SC 2.2.2 Pause, Stop, Hide, Level A, [page updated 04 October 2026](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)): auto-starting motion that lasts over 5 seconds and sits beside other content needs a pause, stop or hide control ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). An agg or VHS GIF has no control; the player with `autoPlay: false`, or a `<video controls>` without autoplay, passes.
- Alternative for video-only content (SC 1.2.1 Level A, page updated 06 September 2026): a text alternative or audio track must present equivalent information ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)). Put the commands and key output in page text beside the demo.
- Scrub: gitleaks passes on the fleet casts, but they still carry temp paths, a runner home and a random port. Environment capture is small by default (v2: SHELL, TERM; v3: SHELL); anything typed is recorded unless inside `Hide` (VHS) or not echoed.
- Size: GIF at most 10 MB (GitHub image limit); web embeds prefer video over GIF (web.dev); YouTube bitrate table above.

## Dated facts

| Fact | Source URL | Date the source states | Source kind |
|---|---|---|---|
| LinkedIn video: 3 s to 30 min, 75 KB to 500 MB, MP4; one English caption file | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | ms.date 2026-02-12, updated 2026-03-02 | platform |
| YouTube Shorts: square or vertical, up to 3 min, for uploads from 2024-10-15 | https://support.google.com/youtube/answer/15424877 | page undated (footer 2026); cutoff 2024-10-15 stated in text | platform |
| YouTube upload: MP4, H.264, AAC-LC or Opus, 1080p SDR 8 Mbps at 24 to 30 fps | https://support.google.com/youtube/answer/1722171 | undated (footer 2026) | platform |
| GitHub attachments: 10 MB images and GIFs; videos 10 MB free, 100 MB paid; 25 MB other files; scope is issues, PRs, comments | https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files | undated | platform |
| WCAG 2.2 SC 2.2.2: auto-start motion over 5 s beside other content needs pause, stop or hide | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | updated 2026-10-04 | standard |
| WCAG 2.2 SC 1.2.1: alternative for pre-recorded video-only | https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html | updated 2026-09-06 | standard |
| Remotion free tier: individuals and up to 3 people, non-profits, evaluation; paid tiers from $25 per seat per month; licence change in 5.0 | https://www.remotion.dev/docs/license/pricing.md and https://www.remotion.dev/docs/license/faq.md | both undated | vendor |
| asciicast v3 spec | https://docs.asciinema.org/manual/asciicast/v3/ | initial 2025-09-10, revised 2025-10-20 | authority |
| asciinema-player 3.19.0 (228,480 B JS) | https://api.github.com/repos/asciinema/asciinema-player/releases/latest | 2026-11-22 | authority |
| agg 1.9.0 | https://api.github.com/repos/asciinema/agg/releases/latest | 2026-05-29 | authority |
| VHS 0.12.1 | https://api.github.com/repos/charmbracelet/vhs/releases/latest | 2026-09-24 | authority |
| Remotion 4.0.547 | https://api.github.com/repos/remotion-dev/remotion/releases/latest | 2026-11-24 | vendor |
| GIF 3.7 MB vs MP4 551 KB vs WebM 341 KB (one example) | https://web.dev/articles/replace-gifs-with-videos | undated in fetched text | authority (Google guidance) |
| Measured sizes and determinism (section 3) | local commands in section 3 | run 2026-11-27 | own measurement, n=2 |

## Normative guidance candidates

1. **MUST generate every demo from a committed source** (a `.tape` file or a YAML scenario with asserted output), stored beside the generated asset. Rationale: a hand recording goes stale and cannot be rebuilt on release. Verify: for each `*.cast`, `*.gif`, `*.mp4` and `*.webm` committed under docs, assets or media directories, a source file with the same stem exists; `find . -name '*.tape'` plus the scenario directory list it. Fail: `demo.gif` with no `demo.tape`.
2. **MUST NOT compare regenerated demos by bytes.** Rationale: measured VHS GIF, MP4 and WebM differ between two identical runs; the fleet casts embed random temp paths. Verify: the regeneration test normalises (replace `/tmp/<random>`, ports and timestamps) and compares text, e.g. VHS `Output golden.txt` or the `o` events of a cast joined; grep the check for `cmp`, `sha256sum` or `git diff --exit-code` on media files as a failure.
3. **MUST keep a docs-site terminal demo as an asciicast file played by a lazily loaded asciinema-player with `autoPlay: false`.** Rationale: 4.6 KB against 38 to 121 KB for the same session, text is selectable, pausable (SC 2.2.2). Verify: `grep -n "autoPlay" <embed js>` is false; no `<img src="*.gif">` for a terminal session in docs sources.
4. **MUST NOT embed a cast player script in a README.** Rationale: README rendering does not run scripts (inferred; GitHub's README rendering docs were not fetched). Verify: `grep -n "<script" README.md` returns nothing.
5. **MUST keep GIFs under 10 MB, SHOULD keep them under 1 MB.** Rationale: GitHub's image and GIF limit is 10 MB; the exemplar GIF is 1.26 MB; the measured agg GIF is 119 KB. Verify: `stat -c %s <file>`; thresholds as stated, source [GitHub Docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).
6. **SHOULD use MP4 or WebM, not GIF, for any web embed over 5 seconds that is not a cast,** with `<video muted playsinline controls>` and no autoplay unless a pause control exists. Rationale: size (web.dev) and SC 2.2.2. Verify: grep for `<video` with `autoplay` and no `controls`.
7. **MUST pin and record the tool versions used to render:** VHS image tag (not `latest`), agg version and the font file, player version with sha256. Rationale: fleet already drifts (3.15.1, 3.17.0, 3.19.0). Verify: the `Dockerfile` or CI step names `ghcr.io/charmbracelet/vhs:v<semver>`; `grep -r "vhs:latest"` is empty; the provenance comment's version equals the file's sha256.
8. **MUST pass `--font-dir` and `--font-family` to agg in CI.** Rationale: a fontless runner exits 1 with `no faces matching font family options`. Verify: the CI log of a regeneration job exits 0 on a clean runner image.
9. **MUST wrap setup and cleanup in `Hide` ... `Show` in every tape,** and set `Require <binary>` for every program the tape types. Rationale: setup lines (PATH, prompt, secrets in env) otherwise appear in frames; a missing binary otherwise records an error screen. Verify: the first non-`Set` line is `Hide` or `Require`; `grep -n "export .*\(TOKEN\|KEY\|SECRET\)" *.tape` is empty.
10. **MUST scrub paths, ports and hostnames, in addition to running a secret scanner.** Rationale: gitleaks reported no leaks on casts that still contain `/tmp/grim-cast-3vgxhmm4`, `/home/runner` and `localhost:53703`. Verify: `gitleaks dir <casts> --no-banner --redact` exits 0 and `grep -E '/tmp/[a-z-]+-[a-z0-9]{6,}|/home/[a-z]+|localhost:[0-9]{5}' <casts>` is empty (detailed method: vid-scrub).
11. **MUST NOT capture input events or extra environment variables** into a published cast. Rationale: typed input and extra env vars can carry tokens that never appear in output, and the capture defaults are the spec's, not a guarantee of the tool in use ([asciicast v3](https://docs.asciinema.org/manual/asciicast/v3/)). Verify: a python3 -I check that no event has code `i`, and header `env` has only `SHELL` (and `TERM` for v2). Measured: 0 input events in the 19 fleet casts.
12. **MUST give every demo a text alternative on the page** (commands and the meaningful output as page text or a caption file). Rationale: SC 1.2.1. Verify: the page section containing the embed also contains the typed command string; for video, a `<track kind="captions">` or a separate caption file exists.
13. **SHOULD use `idle_time_limit` (casts) or `--idle-time-limit` (agg) of 2 seconds or less for docs demos.** Rationale: the fleet's v3 casts use 2; agg's default is 5. Verify: header field or flag present; `jq` or python3 -I read of line 1.
14. **SHOULD use v3 for new casts and leave existing v2 casts until re-recorded.** Rationale: both play in the current player; v3 is the current format (spec dated 2025-09-10). Verify: line 1 `"version": 3`.
15. **SHOULD place a still screenshot, not an animation, first in a README,** and add an animation only if motion carries information the still cannot. Rationale: of the 16 exemplar "demos", 9 are screenshots, 3 are charts and only 4 are animated (section 4; [exemplar-readmes audit](.agents/research/product-audit/exemplar-readmes.md)). Verify: first non-badge image in the first 40 lines has extension png, jpg or svg.
16. **MUST use H.264 MP4, 4:2:0, AAC-LC/Opus 48 kHz for YouTube and LinkedIn renders.** Rationale: [YouTube lists MP4, H.264 and AAC-LC or Opus as its upload spec](https://support.google.com/youtube/answer/1722171) and [LinkedIn's Videos API accepts MP4 only](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api). Verify: `ffprobe -v error -show_entries stream=codec_name,pix_fmt -of csv=p=0 out.mp4` prints `h264`, `yuv420p`; the file size is within 75 KB to 500 MB ([LinkedIn Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api)) and duration within 3 s to 30 min.
17. **CONSIDER a purpose-built narrow tape for Shorts** (`Set Width 1080`, `Set Height 1920`, columns at or below 60). Rationale: a 180-column terminal scales to unreadable in a vertical frame. Verify: `ffprobe` shows height greater than width and duration at most 180 s; legibility checked by vid-legibility's rule.
18. **MUST NOT use Remotion for plain terminal or screen demos, and MUST NOT add it to a repository without owner sign-off on the licence.** Rationale: VHS renders the same without a headless browser, and Remotion's free tier is limited to individuals and organisations of up to 3 people, non-profits and evaluation ([Remotion pricing](https://www.remotion.dev/docs/license/pricing.md), [FAQ](https://www.remotion.dev/docs/license/faq.md), vendor, undated). Verify: a `remotion` dependency in a package that has no produced-video composition is flagged for review.
19. **MUST run this regeneration step in the skill that rebuilds demos:** (a) run the scenario runner or `docker run ... vhs <tape>` with pinned tags; (b) normalise output; (c) diff the text against the committed golden; (d) check size limits (rule 5); (e) run gitleaks and the path grep (rule 10). Exit non-zero on any step. Rationale: bytes are not stable (measured, section 3) and a demo that no longer matches the CLI's real output misleads readers, so only a text comparison plus the size and scrub gates catches drift. Verify: the skill step lists all five and CI runs it on a branch that touches the CLI's output format.

## AI-agent angle

| Typical agent error | Smallest check |
|---|---|
| Recommends `asciinema rec` by hand and commits the file with no script | Rule 1: stem match between asset and source file |
| Writes `autoplay` and `loop` on a GIF-like `<video>` without `muted` or `controls` | grep `<video` for `controls` or `muted` |
| Uses v2 header fields (`width`, `height`) in a v3 cast, or v3's relative intervals in v2 | python3 -I: version 3 headers have `term.cols`; version 2 timestamps are non-decreasing |
| Treats `asciinema upload` as private; it publishes to a server | grep CI and docs for `asciinema upload`; require human sign-off (not verified: the CLI usage page returned 404 and the repo README does not document the upload visibility) |
| Pastes `vhs:latest` and `ffmpeg` flags from memory | Rule 7 grep; check the Output extension list against the VHS README |
| Claims "GitHub allows 100 MB for README video" | The attachments page names issues, PRs and comments, not READMEs; require a cited source |
| Runs agg on a fontless runner and ships an empty or failed step | Rule 8: non-zero exit is caught |
| Asserts a regenerated GIF equals the old one | Rule 2: flag byte comparison on media |
| Sets `Set Width` and `Set Columns` together; `Set` after a command (silently ignored) | VHS README: `Set` must precede commands; lint the tape order |
| Records a real session and leaves a temp path or token in frames | Rule 10 grep and gitleaks |

## Contested / evolving

- Cast player versus GIF in READMEs. For the player: tiny files, selectable text. For GIF: works wherever markdown renders images. The exemplars favour static screenshots (9 of 16) and the four animated ones use GIF, SVG or an external link, so there is no consensus for animation. Trend: not established from this sample.
- Byte-identical regeneration. VHS's README suggests golden `.txt` files to detect diffs and makes no determinism claim; this report measured GIF, MP4 and WebM differing across two runs (n=2). A reader who needs byte stability has no documented route.
- v2 versus v3 casts. v3 is current; the fleet is split 11 v2 to 8 v3. No source says v2 is deprecated; the player plays both (v3 support from 3.10.0).
- GIF versus video. web.dev (undated in the fetched text) argues for video; GitHub README rendering favours images. Both are sound for their surface; the choice depends on the surface, not on a preference.
- LinkedIn upload specs. The Videos API page lists 3 s to 30 min and 75 KB to 500 MB (ms.date 2026-02-12); LinkedIn's help pages for member uploads were not fetched, so those limits may differ.

## What an agent must not decide alone

- Remotion licence: free for individuals and organisations of up to 3 people, non-profits and evaluation, with licence changes announced for Remotion 5.0 ([pricing](https://www.remotion.dev/docs/license/pricing.md), [FAQ](https://www.remotion.dev/docs/license/faq.md), fetched 2026-11-27). Ask the owner before adding it to a company repository.
- Publishing a recording to a third-party host (`asciinema upload`, YouTube, LinkedIn, `vhs publish`, which uploads to `vhs.charm.sh`). It makes content public off-site.
- Which real customer, host name, token, repository or person appears on screen. Ask.
- Voice-over, synthetic voice or avatar in a demo video: AI-disclosure duties are covered by sibling topics; do not decide.
- Whether to include a video in a README where the owner has not asked for a demo: the fleet has none.
- Using a paid screen recorder (Screen Studio, Descript) or paying for GitHub plan features.

## Sources

| URL | What it is | Date or era | Why worth reading |
|---|---|---|---|
| https://docs.asciinema.org/manual/asciicast/v3/ | asciicast v3 spec (authority) | initial version 2025-09-10, revised 2025-10-20 | header, intervals, event codes |
| https://docs.asciinema.org/manual/asciicast/v2/ | asciicast v2 spec (authority) | footer 2023 | absolute timestamps, env capture |
| https://docs.asciinema.org/manual/player/ | player overview (authority) | undated | embed call, options list |
| https://docs.asciinema.org/manual/player/options/ | player options (authority) | undated | autoPlay, fit, idleTimeLimit defaults |
| https://github.com/asciinema/asciinema-player | player repo (authority) | v3.19.0, 2026-11-22 (GitHub API) | install, bundle files |
| https://docs.asciinema.org/manual/agg/ | agg manual (authority) | footer 2023; agg v1.9.0 2026-05-29 (GitHub API) | formats, fonts, backends |
| https://docs.asciinema.org/manual/agg/usage/ | agg option table (authority) | undated | defaults used in measurement |
| https://docs.asciinema.org/manual/cli/ | CLI intro (authority) | undated | privacy and flags not documented here; `cli/usage/` returned 404 |
| https://github.com/asciinema/asciinema | CLI repo (authority) | v3.2.1, 2026-06-16 (GitHub API) | version only; no rec flags on the page |
| https://github.com/charmbracelet/vhs | VHS README (authority) | v0.12.1, 2026-09-24 (GitHub API) | commands, outputs, Docker, golden files |
| https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files | GitHub attachments limits (platform) | undated | 10 MB, 100 MB, 25 MB; scope is issues, PRs, comments |
| https://web.dev/articles/replace-gifs-with-videos | Google guidance (authority) | undated in fetched text | GIF vs MP4 vs WebM sizes, video attributes |
| https://www.remotion.dev/docs/cli/render | Remotion CLI docs (vendor docs) | v4.0.547, 2026-11-24 (GitHub API) | codecs, Chrome requirement |
| https://support.google.com/youtube/answer/1722171 | YouTube encoding spec (platform) | undated, footer 2026 | 1080p 8 Mbps, H.264 |
| https://support.google.com/youtube/answer/15424877 | YouTube Shorts length and ratio (platform) | undated, footer 2026 | up to 3 min, square or vertical, 2024-10-15 cutoff |
| https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api | LinkedIn Videos API (platform) | ms.date 2026-02-12, updated 2026-03-02 | length, size, caption rules |
| https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | WCAG 2.2 SC 2.2.2 (standard) | updated 2026-10-04 | 5-second rule |
| https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html | WCAG 2.2 SC 1.2.1 (standard) | updated 2026-09-06 | alternative for video-only |
| https://api.github.com/repos/asciinema/agg/releases/latest (and the player, CLI, vhs, vhs-action, ttyd, remotion repos) | release metadata (platform) | read 2026-11-27 | release dates cited above |
| https://raw.githubusercontent.com/nushell/nushell/main/assets/nushell-autocomplete6.gif and the fd and devbox SVGs | exemplar assets (measured by `curl -sIL`) | read 2026-11-27 | demo sizes |
| https://github.com/zricethezav/gitleaks (docker image `zricethezav/gitleaks:latest`) | secret scanner run on the casts | local run 2026-11-27 | scrub result |

| https://www.remotion.dev/docs/license/pricing.md | Remotion licence and prices (vendor) | undated, read 2026-11-27 | free-tier eligibility |
| https://www.remotion.dev/docs/license/faq.md | Remotion licence FAQ (vendor) | undated, read 2026-11-27 | non-profit, evaluation, 5.0 change |

Not reached: asciinema CLI `rec` flag page (404), GitHub's README-rendering documentation, MkDocs `extra_javascript` documentation, LinkedIn help pages for member uploads, imgur and two GitHub user-attachment images (HTTP 429, 403).

---
title: Measured content width W of the fleet docs surfaces
program: product
topic: channel-terminal-video
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 0
---

# Measured content width W of the fleet docs surfaces

Question (q3): What is the measured content width W of each fleet docs surface at phone and desktop sizes?

Wave-1 context: CH-VID-08 caps columns at floor(0.98 x W / 6) and tells the agent to "measure W on the live surface". Its numbers for 720 px and 896 px were assumptions, and fleet row 08 was "Violated (pending a width measurement)". This file supplies the measurement. No external web source was needed: every fact is a measurement of fleet code in a scratch directory (0 pages fetched).

## Answer

W is a function of the surface, not of the cast. Every cast embed in the fleet scales its terminal to the container ("fit: width"), so the on-screen cell width is the container width divided by columns. Measured 2026-11-27 with headless Chromium:

| Surface (embed) | Phone 360 px viewport | Phone 390 px | 768 px and up (desktop) |
|---|---|---|---|
| Grimoire docs, Starlight, prose pages (`[data-cast]`) | container 328 px, drawn text line 322.2 px | 358 / 351.9 | container 720 px (a fixed column from 768 px to 1920 px), text line 708.3 px |
| Grimoire landing hero (`/`, `demo.cast`) | 318 / 312.3 | 348 / 342.0 | 689 / 677.7 at 768; 415 / 407.7 at 1024; 462 / 454.5 at 1280; 458 / 450.0 at 1920. The hero is a two-column layout, so the demo gets narrower above 768 px |
| OCX examples (`ocx-sh/www-setup`, `.ocx-terminal`) | wrapper 328, player 326, text line 300.0 | wrapper 358, player 356, text line 300.0 | player 734 at 768, 730 at 1024, 710 at 1280, 758 at 1920 (wrapper is 2 px wider each time); text line 700.0 at every size |
| MkDocs Material article (grimoire indexer, no casts) | content 328 px | 358 | 736 at 768, 750 at 1024, 688 at 1280, 756.8 at 1920 |

Reading the table:

1. At a 360 px phone every Starlight-based surface gives 328 px: the 360 px viewport minus a 16 px gutter on each side. MkDocs Material gives the same 328 px.
2. The desktop docs column is 720 px for the grimoire docs. CH-VID-08's assumption of "720 px column" is confirmed. Its "896 px" assumption matches no measured surface and should go.
3. Two ocx widths, one cause: the `.ocx-terminal` wrapper is 2 px wider than its `.ap-player` because the wrapper has a 1 px border on each side (probe `gap.mjs`, output in Raw output). Anywhere this file says "player" for ocx it means `.ap-player` (326 / 356 / 734 / 730 / 710 / 758); "wrapper" means `.ocx-terminal` (328 / 358 / 736 / 732 / 712 / 760). "W" in CH-VID-08 is ambiguous. The container is wider than the text the player draws: 322.2 of 328 px (grimoire phone), 708.3 of 720 px (grimoire desktop). The ocx player draws exactly 100 columns at a fixed 7.000 px per column on desktop, and 3.000 px per column on both phone widths, inside a wider player box (ocx font-size snaps, so the text does not fill the box). For the legibility law the drawn text-line width is the right W.
5. No measured surface overflows horizontally (scrollWidth equals clientWidth in every row, see Raw output).

## Legibility result per existing cast (CH-VID-08 law, DERIVED)

The law is x-height = 0.98 x text width / columns, with a 6 px floor and an 8 px target. It was fitted on VHS with one OCR engine on 2026-11-27 and stays DERIVED. Cells below use the drawn text-line width above. "Cap 6" and "cap 8" are floor(0.98 x width / 6) and floor(0.98 x width / 8).

| Cast set | Columns | Viewport | Cell width (px per column) | x-height (law) | Cap at 6 px | Cap at 8 px | Verdict at the 6 px floor |
|---|---|---|---|---|---|---|---|
| grimoire docs casts (10 of 11) | 180 | 360 | 1.790 | 1.75 | 52 | 39 | fail |
| | | 390 | 1.955 | 1.92 | 57 | 43 | fail |
| | | 768 to 1920 | 3.935 | 3.86 | 115 | 86 | fail |
| grimoire `browse-tui` | 120 | 360 | 2.665 | 2.61 | 52 | 39 | fail |
| | | 390 | 2.910 | 2.85 | 57 | 42 | fail |
| | | 768 to 1920 | 5.855 | 5.74 | 114 | 86 | fail by 0.26 px |
| grimoire landing `demo.cast` | 180 | 360 | 1.735 | 1.70 | 51 | 38 | fail |
| | | 768 | 3.765 | 3.69 | 110 | 83 | fail |
| | | 1024 | 2.265 | 2.22 | 66 | 49 | fail |
| | | 1280 | 2.525 | 2.47 | 74 | 55 | fail |
| | | 1920 | 2.500 | 2.45 | 73 | 55 | fail |
| ocx examples casts (8) | 100 | 360 and 390 | 3.000 | 2.94 | 49 | 36 | fail |
| | | 768 to 1920 | 7.000 | 6.86 | 114 | 85 | pass at 6 px, fail at the 8 px target |

Font caveat. The 0.98 constant belongs to the VHS font. The ocx site loads IBM Plex Mono (loaded font faces were listed by `document.fonts`), and a canvas probe (`ratio.mjs`: font set to `1000px` in a canvas, so the numbers are per 1000 px of font size, read in a 1280 px wide viewport) gave x-height 0.532 em on an advance of 0.600 em, a ratio of 0.887. That puts the real ocx desktop x-height at 0.887 x 7.000 = 6.2 px (the law says 6.86) and the phone at 2.7 px. The law therefore over-reads Plex Mono by about 10 percent. The grimoire player font stack starts with Cascadia Code, then Source Code Pro, Menlo, Consolas and DejaVu Sans Mono. None of these loaded in this headless browser (`document.fonts` listed no loaded face), so the x-height of the grimoire embeds depends on the viewer's own fonts and could not be measured. The cell width is font-independent, because the player picks its font size to fit the width. So the column cap is solid and the x-height column is the law's estimate.

## How it was measured

Scratch directory: `~/.cache/research-lang/exemplars/product/wave2/channel-terminal-video-q3/`. Nothing in an existing repository was written. Servers ran on 127.0.0.1 and were stopped afterwards.

Surfaces and how each was obtained:

- Grimoire docs: the fleet's own built site `grimoire-rs/grimoire/docs/dist` (Astro 7.4.13, Starlight 0.43.1 per `docs/package.json`; dist files dated 2026-11-24 16:03; repository HEAD `72d3fce1`, 2026-11-24, `git status --short docs` clean). Copied with `cp -r` and served with `python3 -m http.server 8741 --bind 127.0.0.1 -d <copy>`. The embed code is `docs/public/casts.js` (`fit: 'width'`, `autoPlay: false`, `idleTimeLimit: 2`).
- OCX examples site: `ocx-sh/www-setup/site` (HEAD `acd5211`) copied with rsync, with `@ocx-sh/theme` replaced by the pinned commit `e86b83014538975c186912e5038567c69b2f2f2c` extracted by `git -C ocx-sh/website archive e86b83014538975c186912e5038567c69b2f2f2c packages/theme | tar -x` (a read-only git command). Built with `npm install --install-links --no-audit --no-fund --ignore-scripts` then `npx astro build` (8 pages, Astro 7.3.5, Starlight 0.42.4). Served under `/install/` because the site base is `/install`. Only `/examples/` and `/examples/dev-box/` carry casts.
- MkDocs: `grimoire-rs/indexer` (mkdocs.yml plus docs copied), built with `uv run --with mkdocs-material==9.7.7 mkdocs build -d site` (version from the repository's taskfile, `MKDOCS_MATERIAL: 9.7.7`). These MkDocs sites carry no casts (`grep -rlE "\.cast|asciinema"` over the three MkDocs repositories finds only a `docs-quality.md` rule), so only the article width is relevant.
- Browser: Playwright 1.65.1 (`playwright-core`), Chromium build 1255 at `~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`, headless, with the flags Playwright adds (including `--hide-scrollbars`), viewport height 900, six widths (360, 390, 768, 1024, 1280, 1920).

The decisive probe is `cell.mjs`, shown in full (the six widths are looped; the ocx player mounts on first hover, so the script hovers it):

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome', args: ['--no-sandbox'] });
const S = [['grim /','http://127.0.0.1:8741/index.html','[data-cast]',false],['grim /quickstart','http://127.0.0.1:8741/quickstart.html','[data-cast]',false],['grim /browse','http://127.0.0.1:8741/browse.html','[data-cast]',false],['ocx /examples','http://127.0.0.1:8742/install/examples/index.html','.ocx-terminal',true]];
for (const [name,url,sel,hover] of S) for (const w of [360,390,768,1024,1280,1920]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
  await page.goto(url); const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); if (hover) await el.hover();
  await page.waitForSelector('.ap-player'); await page.waitForTimeout(700);
  const r = await page.evaluate(() => { const l = document.querySelector('.ap-line'); const c = l.textContent.length; const lw = l.getBoundingClientRect().width;
    return { container: document.querySelector('.ap-player').getBoundingClientRect().width, lineW: lw, cols: c, cell: lw / c, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
  console.log([name, w, r.cols, r.container, r.lineW.toFixed(2), r.cell.toFixed(3), 'ovf=' + (r.sw > r.vw)].join('\t'));
  await ctx.close();
}
await browser.close();
```

Command: `. ./env.sh; node cell.mjs` (`env.sh` only sets `LD_LIBRARY_PATH` to unpacked Chromium system libraries from earlier wave-2 scratch directories). `cell = lineW / cols` and `x-height (law) = 0.98 * cell`.

### Raw output (`cell.mjs`)

Columns: surface, viewport, columns, player container px, text line px, cell px, overflow.

```
grim /	360	180	318	312.30	1.735	ovf=false
grim /	390	180	348	342.00	1.900	ovf=false
grim /	768	180	689	677.69	3.765	ovf=false
grim /	1024	180	415	407.69	2.265	ovf=false
grim /	1280	180	461.84375	454.50	2.525	ovf=false
grim /	1920	180	458	450.00	2.500	ovf=false
grim /quickstart	360	180	328	322.19	1.790	ovf=false
grim /quickstart	390	180	358	351.89	1.955	ovf=false
grim /quickstart	768	180	720	708.30	3.935	ovf=false
grim /quickstart	1024	180	720	708.30	3.935	ovf=false
grim /quickstart	1280	180	720	708.30	3.935	ovf=false
grim /quickstart	1920	180	720	708.30	3.935	ovf=false
grim /browse	360	120	328	319.80	2.665	ovf=false
grim /browse	390	120	358	349.19	2.910	ovf=false
grim /browse	768	120	720	702.59	5.855	ovf=false
grim /browse	1024	120	720	702.59	5.855	ovf=false
grim /browse	1280	120	720	702.59	5.855	ovf=false
grim /browse	1920	120	720	702.59	5.855	ovf=false
ocx /examples	360	100	326	300.00	3.000	ovf=false
ocx /examples	390	100	356	300.00	3.000	ovf=false
ocx /examples	768	100	734	700.00	7.000	ovf=false
ocx /examples	1024	100	730	700.00	7.000	ovf=false
ocx /examples	1280	100	710	700.00	7.000	ovf=false
ocx /examples	1920	100	758	700.00	7.000	ovf=false
```

### Raw output (`measure-grim.mjs`, all 12 grimoire pages with a cast)

Command: `. ./env.sh; node measure-grim.mjs` against `python3 -m http.server 8741 --bind 127.0.0.1 -d grim-dist`. Columns: page, viewport, cast, `[data-cast]` width, `.ap-player` width, `.ap-term` width, `clientWidth`, `scrollWidth`. The script is
`for p of pages, for w of [360,390,768,1024,1280,1920]: goto, scroll [data-cast] into view, wait for [data-cast] .ap-player, 400 ms, read getBoundingClientRect().width` of the three elements and the document. The list is the landing page plus the 11 pages that embed a cast (the earlier text said 11 pages; the landing page makes 12 rows of six). `scrollWidth == clientWidth` in every row, so no overflow. `.ap-term` is the player's inner box (the drawn text line is `.ap-line`, narrower again, see `cell.mjs`).

```
index.html	360	/demo.cast	318	318	316.3	360	360
index.html	390	/demo.cast	348	348	346	390	390
index.html	768	/demo.cast	689.22	689	687.69	768	768
index.html	1024	/demo.cast	415.08	415	413.69	1024	1024
index.html	1280	/demo.cast	461.84	461.84	460.5	1280	1280
index.html	1920	/demo.cast	458	458	456	1920	1920
quickstart.html	360	/casts/quickstart.cast	328	328	326.19	360	360
quickstart.html	390	/casts/quickstart.cast	358	358	355.89	390	390
quickstart.html	768	/casts/quickstart.cast	720	720	718.3	768	768
quickstart.html	1024	/casts/quickstart.cast	720	720	718.3	1024	1024
quickstart.html	1280	/casts/quickstart.cast	720	720	718.3	1280	1280
quickstart.html	1920	/casts/quickstart.cast	720	720	718.3	1920	1920
browse.html	360	/casts/browse-tui.cast	328	328	327.8	360	360
browse.html	390	/casts/browse-tui.cast	358	358	357.19	390	390
browse.html	768	/casts/browse-tui.cast	720	720	718.59	768	768
browse.html	1024	/casts/browse-tui.cast	720	720	718.59	1024	1024
browse.html	1280	/casts/browse-tui.cast	720	720	718.59	1280	1280
browse.html	1920	/casts/browse-tui.cast	720	720	718.59	1920	1920
first-skill.html	360	/casts/first-skill.cast	328	328	326.19	360	360
first-skill.html	390	/casts/first-skill.cast	358	358	355.89	390	390
first-skill.html	768	/casts/first-skill.cast	720	720	718.3	768	768
first-skill.html	1024	/casts/first-skill.cast	720	720	718.3	1024	1024
first-skill.html	1280	/casts/first-skill.cast	720	720	718.3	1280	1280
first-skill.html	1920	/casts/first-skill.cast	720	720	718.3	1920	1920
guides/versioning.html	360	/casts/versioning.cast	328	328	326.19	360	360
guides/versioning.html	390	/casts/versioning.cast	358	358	355.89	390	390
guides/versioning.html	768	/casts/versioning.cast	720	720	718.3	768	768
guides/versioning.html	1024	/casts/versioning.cast	720	720	718.3	1024	1024
guides/versioning.html	1280	/casts/versioning.cast	720	720	718.3	1280	1280
guides/versioning.html	1920	/casts/versioning.cast	720	720	718.3	1920	1920
tutorials/own-index.html	360	/casts/own-index.cast	328	328	326.19	360	360
tutorials/own-index.html	390	/casts/own-index.cast	358	358	355.89	390	390
tutorials/own-index.html	768	/casts/own-index.cast	720	720	718.3	768	768
tutorials/own-index.html	1024	/casts/own-index.cast	720	720	718.3	1024	1024
tutorials/own-index.html	1280	/casts/own-index.cast	720	720	718.3	1280	1280
tutorials/own-index.html	1920	/casts/own-index.cast	720	720	718.3	1920	1920
guides/lifecycle.html	360	/casts/lifecycle.cast	328	328	326.19	360	360
guides/lifecycle.html	390	/casts/lifecycle.cast	358	358	355.89	390	390
guides/lifecycle.html	768	/casts/lifecycle.cast	720	720	718.3	768	768
guides/lifecycle.html	1024	/casts/lifecycle.cast	720	720	718.3	1024	1024
guides/lifecycle.html	1280	/casts/lifecycle.cast	720	720	718.3	1280	1280
guides/lifecycle.html	1920	/casts/lifecycle.cast	720	720	718.3	1920	1920
guides/team-ci.html	360	/casts/team-ci.cast	328	328	326.19	360	360
guides/team-ci.html	390	/casts/team-ci.cast	358	358	355.89	390	390
guides/team-ci.html	768	/casts/team-ci.cast	720	720	718.3	768	768
guides/team-ci.html	1024	/casts/team-ci.cast	720	720	718.3	1024	1024
guides/team-ci.html	1280	/casts/team-ci.cast	720	720	718.3	1280	1280
guides/team-ci.html	1920	/casts/team-ci.cast	720	720	718.3	1920	1920
guides/inspect.html	360	/casts/inspect.cast	328	328	326.19	360	360
guides/inspect.html	390	/casts/inspect.cast	358	358	355.89	390	390
guides/inspect.html	768	/casts/inspect.cast	720	720	718.3	768	768
guides/inspect.html	1024	/casts/inspect.cast	720	720	718.3	1024	1024
guides/inspect.html	1280	/casts/inspect.cast	720	720	718.3	1280	1280
guides/inspect.html	1920	/casts/inspect.cast	720	720	718.3	1920	1920
guides/registries.html	360	/casts/registries.cast	328	328	326.19	360	360
guides/registries.html	390	/casts/registries.cast	358	358	355.89	390	390
guides/registries.html	768	/casts/registries.cast	720	720	718.3	768	768
guides/registries.html	1024	/casts/registries.cast	720	720	718.3	1024	1024
guides/registries.html	1280	/casts/registries.cast	720	720	718.3	1280	1280
guides/registries.html	1920	/casts/registries.cast	720	720	718.3	1920	1920
guides/shared-skills.html	360	/casts/shared-skills.cast	328	328	326.19	360	360
guides/shared-skills.html	390	/casts/shared-skills.cast	358	358	355.89	390	390
guides/shared-skills.html	768	/casts/shared-skills.cast	720	720	718.3	768	768
guides/shared-skills.html	1024	/casts/shared-skills.cast	720	720	718.3	1024	1024
guides/shared-skills.html	1280	/casts/shared-skills.cast	720	720	718.3	1280	1280
guides/shared-skills.html	1920	/casts/shared-skills.cast	720	720	718.3	1920	1920
guides/scopes-and-clients.html	360	/casts/scopes.cast	328	328	326.19	360	360
guides/scopes-and-clients.html	390	/casts/scopes.cast	358	358	355.89	390	390
guides/scopes-and-clients.html	768	/casts/scopes.cast	720	720	718.3	768	768
guides/scopes-and-clients.html	1024	/casts/scopes.cast	720	720	718.3	1024	1024
guides/scopes-and-clients.html	1280	/casts/scopes.cast	720	720	718.3	1280	1280
guides/scopes-and-clients.html	1920	/casts/scopes.cast	720	720	718.3	1920	1920
```

Reading: `[data-cast]` and `.ap-player` are 328 / 358 / 720 / 720 / 720 / 720 on all 11 docs pages at the six viewports. The landing page differs (318 / 348 / 689 / 415 / 462 / 458). Only the cast name differs between the docs pages.

### Raw output (`measure-ocx.mjs`, 8 ocx embeds)

Command: `. ./env.sh; node measure-ocx.mjs` against `python3 -m http.server 8742 --bind 127.0.0.1 -d ocx-root` (site served under `/install/`). Columns: page, viewport, cast, `cols` from `data-options`, `.ocx-terminal` wrapper width, `.ap-player` width, `.ap-term` width, `clientWidth`, `scrollWidth`. Wrapper minus player is 2 px in every row (see the gap probe below), which reconciles the 328 / 358 / 736 / 732 / 712 / 760 wrapper numbers with the 326 / 356 / 734 / 730 / 710 / 758 player numbers in the table. `scrollWidth == clientWidth` in all rows.

```
examples/index.html	360	dockerfile.cast	100	328	326	306	360	360
examples/index.html	360	air-gapped.cast	100	328	326	306	360	360
examples/index.html	360	ci-wrapper.cast	100	328	326	306	360	360
examples/index.html	390	dockerfile.cast	100	358	356	308	390	390
examples/index.html	390	air-gapped.cast	100	358	356	308	390	390
examples/index.html	390	ci-wrapper.cast	100	358	356	308	390	390
examples/index.html	768	dockerfile.cast	100	736	734	716	768	768
examples/index.html	768	air-gapped.cast	100	736	734	716	768	768
examples/index.html	768	ci-wrapper.cast	100	736	734	716	768	768
examples/index.html	1024	dockerfile.cast	100	732	730	716	1024	1024
examples/index.html	1024	air-gapped.cast	100	732	730	716	1024	1024
examples/index.html	1024	ci-wrapper.cast	100	732	730	716	1024	1024
examples/index.html	1280	dockerfile.cast	100	712	710	716	1280	1280
examples/index.html	1280	air-gapped.cast	100	712	710	716	1280	1280
examples/index.html	1280	ci-wrapper.cast	100	712	710	716	1280	1280
examples/index.html	1920	dockerfile.cast	100	760	758	718	1920	1920
examples/index.html	1920	air-gapped.cast	100	760	758	718	1920	1920
examples/index.html	1920	ci-wrapper.cast	100	760	758	718	1920	1920
examples/dev-box/index.html	360	dev-box-sh.cast	100	328	326	306	360	360
examples/dev-box/index.html	360	dev-box-pwsh.cast	100	328	326	306	360	360
examples/dev-box/index.html	360	dev-box-nu.cast	100	328	326	306	360	360
examples/dev-box/index.html	360	dev-box-fish.cast	100	328	326	306	360	360
examples/dev-box/index.html	360	dev-box-elvish.cast	100	328	326	306	360	360
examples/dev-box/index.html	390	dev-box-sh.cast	100	358	356	308	390	390
examples/dev-box/index.html	390	dev-box-pwsh.cast	100	358	356	308	390	390
examples/dev-box/index.html	390	dev-box-nu.cast	100	358	356	308	390	390
examples/dev-box/index.html	390	dev-box-fish.cast	100	358	356	308	390	390
examples/dev-box/index.html	390	dev-box-elvish.cast	100	358	356	308	390	390
examples/dev-box/index.html	768	dev-box-sh.cast	100	736	734	716	768	768
examples/dev-box/index.html	768	dev-box-pwsh.cast	100	736	734	716	768	768
examples/dev-box/index.html	768	dev-box-nu.cast	100	736	734	716	768	768
examples/dev-box/index.html	768	dev-box-fish.cast	100	736	734	716	768	768
examples/dev-box/index.html	768	dev-box-elvish.cast	100	736	734	716	768	768
examples/dev-box/index.html	1024	dev-box-sh.cast	100	732	730	716	1024	1024
examples/dev-box/index.html	1024	dev-box-pwsh.cast	100	732	730	716	1024	1024
examples/dev-box/index.html	1024	dev-box-nu.cast	100	732	730	716	1024	1024
examples/dev-box/index.html	1024	dev-box-fish.cast	100	732	730	716	1024	1024
examples/dev-box/index.html	1024	dev-box-elvish.cast	100	732	730	716	1024	1024
examples/dev-box/index.html	1280	dev-box-sh.cast	100	712	710	716	1280	1280
examples/dev-box/index.html	1280	dev-box-pwsh.cast	100	712	710	716	1280	1280
examples/dev-box/index.html	1280	dev-box-nu.cast	100	712	710	716	1280	1280
examples/dev-box/index.html	1280	dev-box-fish.cast	100	712	710	716	1280	1280
examples/dev-box/index.html	1280	dev-box-elvish.cast	100	712	710	716	1280	1280
examples/dev-box/index.html	1920	dev-box-sh.cast	100	760	758	718	1920	1920
examples/dev-box/index.html	1920	dev-box-pwsh.cast	100	760	758	718	1920	1920
examples/dev-box/index.html	1920	dev-box-nu.cast	100	760	758	718	1920	1920
examples/dev-box/index.html	1920	dev-box-fish.cast	100	760	758	718	1920	1920
examples/dev-box/index.html	1920	dev-box-elvish.cast	100	760	758	718	1920	1920
```

Gap probe (`gap.mjs`, 360 px viewport, first ocx embed, after hover):

```
{"wrapper":328,"wrapBorderL":"1px","wrapBorderR":"1px","wrapPadL":"0px","player":326,"line":300}
```

Wrapper 328 minus 2 x 1 px border = player 326. The drawn text line is 300 px (100 columns x 3.000).

MkDocs article width (`mkm.mjs`, `.md-content__inner` content box, padding removed):

```
mkdocs-material indexer /how-to/quickstart/	360	328	360	ovf=false
mkdocs-material indexer /how-to/quickstart/	390	358	390	ovf=false
mkdocs-material indexer /how-to/quickstart/	768	736	736	ovf=false
mkdocs-material indexer /how-to/quickstart/	1024	750	750	ovf=false
mkdocs-material indexer /how-to/quickstart/	1280	688	688	ovf=false
mkdocs-material indexer /how-to/quickstart/	1920	756.84	756.84	ovf=false
```

(The third column, `pre`, was a poor probe: at 360 and 390 it reports the page width because the selector matched a different `pre`. Ignore it. Only the article column is used above.)

Font probe (`ratio.mjs`, 1280 px viewport; command `. ./env.sh; node ratio.mjs`, re-run 2026-11-27 with identical output):

```
grim {"xHeightEm":0.86,"advanceEm":0.5,"ratio":1.72,"loadedFonts":[],"cellPx":3.934982638888889}
ocx {"xHeightEm":0.532,"advanceEm":0.6,"ratio":0.8866666666666667,"loadedFonts":["IBM Plex Sans-6ee89aef3feeeba2 400","IBM Plex Sans-6ee89aef3feeeba2 600","IBM Plex Mono-3937deb96f58274c 400","IBM Plex Mono-3937deb96f58274c 600"],"cellPx":7}
```

The grim line is a fallback-font artefact of this machine (no listed font loaded; ratio 1.72 is not a real monospace ratio) and is not used for any conclusion. The ocx line is a real loaded font and is used for the 0.887 ratio.

## Effect on the ruleset

**CH-VID-08: change.** Replace the "Caps at the 6 px floor" bullet and the W definition with this exact text:

> "W" means the width in CSS px of the drawn terminal text line at the narrowest viewport the surface supports, read as `.ap-line` width, not the container width. Measure it at a 360 px viewport and at desktop width (768 px and up). Caps at the 6 px floor, measured 2026-11-27: Starlight and MkDocs docs at a 360 px phone, 52 columns (text 322 px); at a 390 px phone, 57; on a desktop 720 px docs column, 115 (text 708 px). The ocx examples player at a phone is capped by its own font snap at 3.0 px per column, so 49 columns; on desktop 114. A landing hero is narrower than the docs column from 1024 px up (text 408 to 455 px, cap 66 to 74).

Also delete "The 720 and 896 px widths are assumptions" (720 is confirmed, 896 matches no surface) and remove the 1080 px and 1920 px docs caps. Those two are video-frame widths and belong with CH-VID-10 and CH-VID-04, not docs surfaces. Keep the 8 px target line, and add the measured caps at 8 px: 39 columns at a 360 px phone, 86 on the 720 px column.

Verification (replace the Playwright part of the existing check with this tested form; run after the player mounts):
`document.querySelector('.ap-line').getBoundingClientRect().width / document.querySelector('.ap-line').textContent.length` gives the cell width in px; the check fails when `0.98 * cell < 6`. A wrong-surface failure shows as a cell of 1.7 to 2.7 px on a 360 px phone with 120 to 180 columns.

**CH-VID-08 fleet row (Applied to the fleet): change** (verification: re-run `node cell.mjs`-style probe, `.ap-line` width / `.ap-line` text length at 360 and 768 px, on each listed page; the row's per-set numbers must equal the probe's cell column within 0.01 px per column, and the verdict is `fail` exactly when `0.98 * cell < 6`) from "Violated (pending a width measurement)" to "Violated, measured". Exact text: grimoire docs casts are 180 columns: 3.86 px on desktop and 1.75 px on a 360 px phone, both under 6 px. `browse-tui` is 120 columns: 5.74 px on desktop (0.26 px under the floor) and 2.61 px on a phone. The grimoire landing `demo.cast` is 180 columns: 2.2 to 3.7 px at 768 px and up and 1.7 px on a phone. The ocx casts are 100 columns: they pass the floor on desktop (law 6.86 px, real Plex Mono 6.2 px) and fail on a phone (2.94 px by the law, about 2.7 px real). The owner decision "re-record the 180-column casts" now has numbers: to pass the floor on a 360 px phone a Starlight or MkDocs docs embed needs 52 columns or fewer (49 or fewer on the ocx player). To pass only on desktop, 114 columns. To reach the 8 px target, 86 columns (desktop) and 39 (phone).

**CH-VID-08: add a NEW CONSIDER line (new rule, no new ID needed; CH-VID-09 is retired and not reused, so number it CH-VID-27 if it is split out).** CH-VID-27 (CONSIDER): "A docs recording that must be readable on a 360 px phone is recorded at 52 columns or fewer, or the page offers the CH-VID-14 text alternative as the phone reading path." Rationale: 80-column CLI output cannot reach 6 px on a phone (0.98 x 322 / 80 = 3.9 px), and no cast in the fleet does. Severity: CONSIDER, because the 6 px floor is DERIVED from one OCR engine and a phone viewer can zoom or rotate (not tested). Verification: the CH-VID-08 probe at a 360 px viewport, `0.98 * cell >= 6`, or the transcript check of CH-VID-14 passes for that page.

**CH-VID-14: confirm.** Verification (unchanged, restated so it stands alone): every page that embeds a cast also contains, outside the player element, the commands and output as text (a `<pre>` or a transcript link), checked by reading the page HTML. The phone result strengthens the case for the page text alternative: today no existing cast is legible at a phone width, so the transcript is the only reading path there.

**CH-VID-02: confirm.** Verification: in the page source the embed options contain `fit: 'width'` or `"fit":"width"` (`grep -E "fit.{0,6}width" <served page or casts.js>`), and the `scrollWidth == clientWidth` check of the cell probe passes at 360 px. All three player embeds measured use `fit: width` and none overflowed horizontally at any width.

**CH-VID-10, CH-VID-04, CH-VID-12, CH-VID-18 and the others: no change.** This question did not touch them.

## Cast column evidence

Command (grimoire; `head -n1` is the asciicast v2 header line, cut to the first 120 characters, run in the scratch directory):
`for f in grim-dist/casts/*.cast grim-dist/demo.cast; do echo "$f: $(head -n1 $f | head -c 120)"; done`

Output, trimmed to the path, version, width and height (the rest of each line is the title and theme):

```
grim-dist/casts/browse-tui.cast: {"version": 2, "width": 120, "height": 30
grim-dist/casts/first-skill.cast: {"version": 2, "width": 180, "height": 19
grim-dist/casts/inspect.cast: {"version": 2, "width": 180, "height": 58
grim-dist/casts/lifecycle.cast: {"version": 2, "width": 180, "height": 54
grim-dist/casts/own-index.cast: {"version": 2, "width": 180, "height": 33
grim-dist/casts/quickstart.cast: {"version": 2, "width": 180, "height": 16
grim-dist/casts/registries.cast: {"version": 2, "width": 180, "height": 50
grim-dist/casts/scopes.cast: {"version": 2, "width": 180, "height": 63
grim-dist/casts/shared-skills.cast: {"version": 2, "width": 180, "height": 57
grim-dist/casts/team-ci.cast: {"version": 2, "width": 180, "height": 66
grim-dist/casts/versioning.cast: {"version": 2, "width": 180, "height": 35
grim-dist/demo.cast: {"version": 2, "width": 180, "height": 30
```

Ocx (asciicast v3 headers in the source tree), command `cd ocx-sh/www-setup/site; for f in $(find . -name '*.cast' -not -path './node_modules/*'); do echo "$f: $(head -n1 $f | head -c 45)"; done`:

```
./public/casts/examples/dev-box-fish.cast: {"version":3,"term":{"cols":100,"rows":39}
./public/casts/examples/dev-box-sh.cast: {"version":3,"term":{"cols":100,"rows":40}
./public/casts/examples/dev-box-nu.cast: {"version":3,"term":{"cols":100,"rows":38}
./public/casts/examples/dev-box-elvish.cast: {"version":3,"term":{"cols":100,"rows":39}
./public/casts/examples/ci-wrapper.cast: {"version":3,"term":{"cols":100,"rows":16}
./public/casts/examples/air-gapped.cast: {"version":3,"term":{"cols":100,"rows":5}
./public/casts/examples/dev-box-pwsh.cast: {"version":3,"term":{"cols":100,"rows":40}
./public/casts/examples/dockerfile.cast: {"version":3,"term":{"cols":100,"rows":5}
```

The rendered pages carry the same value in `data-options`. Command `grep -o 'data-options="[^"]*"' ocx-root/install/examples/index.html ocx-root/install/examples/dev-box/index.html | sort | uniq -c`:

```
      5 ocx-root/install/examples/dev-box/index.html:data-options="{&quot;cols&quot;:100,&quot;rows&quot;:24,&quot;autoPlay&quot;:false,&quot;speed&quot;:1,&quot;idleTimeLimit&quot;:2,&quot;loop&quot;:false,&quot;fit&quot;:&quot;width&quot;}"
      1 ocx-root/install/examples/index.html:data-options="{&quot;cols&quot;:100,&quot;rows&quot;:16,&quot;autoPlay&quot;:false,&quot;speed&quot;:1,&quot;idleTimeLimit&quot;:2,&quot;loop&quot;:false,&quot;fit&quot;:&quot;width&quot;}"
      2 ocx-root/install/examples/index.html:data-options="{&quot;cols&quot;:100,&quot;rows&quot;:5,&quot;autoPlay&quot;:false,&quot;speed&quot;:1,&quot;idleTimeLimit&quot;:2,&quot;loop&quot;:false,&quot;fit&quot;:&quot;width&quot;}"
```

All 8 embeds are 100 columns with `fit: width`. The three lines count 5 + 1 + 2 = 8 embeds. The `rows` option is the player's fixed height and differs from the cast header rows for the dev-box page; only columns matter for W.

Repository state and the MkDocs cast search (commands run from `/home/mherwig/dev`):

```
$ git -C grimoire-rs/grimoire rev-parse --short HEAD
72d3fce1
$ git -C grimoire-rs/grimoire status --short docs | wc -l
0
$ grep -rlE "\.cast|asciinema" grimoire-rs/indexer ocx-sh/indexbot ocx-sh/ocx-mirror 2>/dev/null | grep -v node_modules
ocx-sh/ocx-mirror/.claude/rules/docs-quality.md
```

`status --short docs` printed nothing (0 lines): the docs tree is clean. The only cast or asciinema mention in the three MkDocs repositories is a rule file, so none of them embeds a cast.

## Dated facts

| Fact | Value | Source | Date |
|---|---|---|---|
| Grimoire docs embed options | `fit: 'width'`, `autoPlay: false`, `idleTimeLimit: 2` | `grimoire-rs/grimoire/docs/public/casts.js:41-46` (read in the wave-1 revision and again in the served copy) | repository HEAD 2026-11-24 |
| Grimoire docs stack | Astro 7.4.13, Starlight 0.43.1 | `grimoire-rs/grimoire/docs/package.json` | 2026-11-24 |
| OCX examples stack | Astro 7.3.5, Starlight 0.42.4, theme commit `e86b83014538975c186912e5038567c69b2f2f2c` | `ocx-sh/www-setup/site/package.json`, built 2026-11-27 | 2026-11-27 |
| MkDocs Material version | 9.7.7 | `grimoire-rs/indexer/taskfile.yml` | 2026-11-27 |
| Browser | Playwright 1.65.1, Chromium build 1255, headless (`--hide-scrollbars`) | local install | 2026-11-27 |
| Cast headers | grimoire 180 columns (10 of 11) and 120 (`browse-tui`); landing `demo.cast` 180; ocx 100 | see "Cast column evidence" below | 2026-11-27 |

All of these are my own measurement or the fleet's own files. No vendor or platform data is used.

## What could not be determined

- **Real-browser fonts for the grimoire embeds.** The headless Chromium here has none of the player's listed fonts loaded, so the true x-height of the grimoire embeds on a viewer's machine (Cascadia Code, Source Code Pro, Menlo, Consolas) is not measured. The column caps and the cell width are font-independent and measured. The x-height column uses the law. Missing: a headless run on a machine with those fonts, or a human check.
- **Desktop scrollbar.** Headless runs with `--hide-scrollbars`, so desktop W has no scrollbar loss. A classic 15 px scrollbar on Windows or Linux desktops would take about 15 px from W at viewports under about 768 px where the content is not fixed-width. Not measured. At 768 px and above the grimoire column is a fixed 720 px, so it is unaffected.
- **Real phones.** Measured in a desktop Chromium with a narrow viewport and no mobile emulation (no device pixel ratio, no iOS Safari, no text-size adjustment). A real phone's browser chrome and font boosting could change the numbers.
- **Surfaces not measured.** The `indexbot` and `ocx-mirror` MkDocs sites were not built (only `grimoire-rs/indexer`, same Material theme and similar features). The `ocx-sh/website` marketing site and the grimoire landing were not measured beyond the pages named. The ocx `/install/` page named in the wave-1 open question is not in the built 8-page site (`ls dist` shows `configuration`, `examples`, `mirrors`, `reference`, `versions`); it was not found. The `www-setup/site` working tree was built as it stands on disk, whose uncommitted state was not checked. The grimoire `dist` was copied, not rebuilt.
- **Horizontal scroll as an alternative.** An embed with `fit: false` (fixed font, horizontal scroll) would not shrink the text and is not used anywhere in the fleet, so it was not measured. It could be a way to keep 6 px at 180 columns on a phone, at the cost of scrolling.
- **Whether 6 px is the right floor on a phone.** That is the first open question and needs a human test. This file only shows how far each cast sits from the floor.

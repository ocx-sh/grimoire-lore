---
title: Contrast of the ocx v3 casts under the ocx player theme
program: product
topic: channel-terminal-video
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 0
---

# Contrast of the ocx v3 casts under the ocx player theme

Question: what contrast do the ocx v3 casts get from the ocx player theme in `terminal.mjs`, since those casts carry no theme in their headers? (Wave-1 row 12 left this "not done".) The question is about files on this machine, so no web page was fetched and `sources_fetched` is 0. This revision repairs the first pass: tokens are now read at the commit the site pins, the embed path is read, every script is shown in full, and dim text is measured in a rendered browser, not only computed.

## Answer

Under the theme the www-setup site actually ships (website commit `e86b83014538975c186912e5038567c69b2f2f2c`, read with `git show`), all 16 ANSI entries and the default foreground reach 4.5:1 in both the light and the dark scheme; the lowest is 5.20 (light) and 5.94 (dark). The casts print only SGR 32 (green, 5.29 light and 10.34 dark), plus bold, dim, italic and underline. The token values at the pin are identical to the current website checkout for every colour the theme uses; only fonts and display sizes differ.

Dim (SGR 2) is the one weak point, and it is now measured in a rendered Chromium: the player draws it at `opacity: 0.5`, and the darkest or lightest glyph pixel gives 3.18:1 (light) and 3.77:1 (dark) for the default foreground, below 4.5. Five of the eight casts use it. The www-setup site adds no CSS of its own and embeds the casts through the theme's `Terminal.astro`, so nothing overrides this.

Caveat that stays: this is the ocx player theme in `packages/theme`, rendered by me in a scratch page with the pinned tokens and the pinned player version, not a screenshot of the deployed site (no network and no deployed build were used).

## Findings

1. The casts carry no theme. Each header is `{"version":3,"term":{"cols":100,"rows":N},"idle_time_limit":2,"title":...}`. `castscan.py` (below) prints `False` for "theme key present" on all 8.
2. The embed path, read in full. `ocx-sh/www-setup/site/src/components/Cast.astro` imports `@ocx-sh/theme/components/Terminal.astro` and renders `<Terminal src={`/casts/${name}.cast`} title={title} />`; it sets no theme or token. Eight `<Cast name=... />` uses sit in `src/content/docs/examples.mdx` and `examples/dev-box.mdx`. `grep -n "customCss\|\.css" site/astro.config.mjs` printed nothing and `find site/src site/public -name '*.css'` printed nothing, so the site has no stylesheet that could override a token. The theme is pinned in `site/package.json:15` to `github:ocx-sh/website#e86b83014538975c186912e5038567c69b2f2f2c&path:/packages/theme`; that commit is dated 2026-10-26 (`git log -1 --format='%H %cs'`).
3. The player is forced to the ocx theme, so a cast theme would not apply anyway. At the pin, `packages/theme/src/components/terminal.mjs:283` passes `theme: 'ocx'` to `create(...)`. (Wave-1 CH-VID-12 says the player takes the cast's own theme by default since 3.8; that is true only where the embed does not force one, and this one does.) `terminal-player.css` at the pin has no `faint` rule, so the player's own rule stands.
4. The pinned theme maps ANSI 0 to 15 onto site tokens in `Terminal.astro` (`.asciinema-player-theme-ocx`): foreground = `code-fg`, background = `code-bg`, 0 = `code-comment`, 1 = `danger`, 2 = `code-string`, 3 = `code-number`, 4 = `code-keyword`, 5 = `code-variable`, 6 = `success`, 7 = `fg-muted`, 8 = `fg-subtle`, 9 = `danger`, 10 = `success`, 11 = `warning`, 12 = `keyword`, 13 = `accent-fg`, 14 = `success`, 15 = `fg`. The next script reads this mapping and the token values from the pin and prints the result.
5. Pinned versus current tokens. `git -C website diff e86b830... HEAD -- packages/theme/src/tokens.css` changes three lines of fonts and two display sizes and no colour. `contrast.py` was run on both revisions and the outputs (without the first line) are identical: `diff <(... e86b830 | sed 1d) <(... HEAD | sed 1d)` printed nothing and `echo IDENTICAL` ran. `Terminal.astro` and `terminal.mjs` also differ between the revisions, but the theme block and `theme: 'ocx'` read the same.

### Measurement A: palette contrast at the pinned commit

Script `contrast.py` (scratch copy: `~/.cache/research-lang/exemplars/product/wave2/channel-terminal-video-q1/contrast.py`). It reads `tokens.css` and `Terminal.astro` with `git show`, takes the light block (`:root,`) and applies the dark block (`.dark,`) over it, resolves `var()`, and prints the WCAG 2.2 relative-luminance ratio against `code-bg` for each entry.

```python
# usage: python3 -I contrast.py <website-repo> <rev>
# Reads tokens.css and Terminal.astro at <rev> via `git show` (read only), resolves var(), prints WCAG contrast of each
# ANSI entry (theme 'ocx') against the code background, per scheme, and the 0.5 dim blend of default fg.
import re, subprocess, sys
repo, rev = sys.argv[1:3]
def show(p): return subprocess.run(['git','-C',repo,'show',f'{rev}:{p}'],check=True,capture_output=True,text=True).stdout
css = show('packages/theme/src/tokens.css').splitlines()
def block(start_pat):
    i = next(n for n,l in enumerate(css) if l.startswith(start_pat)); d = {}
    for l in css[i:]:
        if l.startswith('}'): break
        m = re.match(r'\s*(--ocx-color-[\w-]+):\s*([^;]+);', l)
        if m: d[m.group(1)] = m.group(2).strip()
    return d
light = block(':root,'); dark = dict(light); dark.update(block('.dark,'))
def res(d, v, depth=0):
    m = re.fullmatch(r'var\((--[\w-]+)\)', v)
    return res(d, d[m.group(1)], depth+1) if m else v
astro = show('packages/theme/src/components/Terminal.astro')
body = astro[astro.index('.asciinema-player-theme-ocx'):]
body = body[:body.index('}')]
mp = dict(re.findall(r'--term-color-(\w+):\s*var\((--[\w-]+)\)', body))
def lum(h):
    h = h.lstrip('#'); r = [int(h[i:i+2],16)/255 for i in (0,2,4)]
    r = [c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4 for c in r]
    return .2126*r[0]+.7152*r[1]+.0722*r[2]
def cr(a,b):
    x,y = sorted((lum(a),lum(b)),reverse=True); return (x+.05)/(y+.05)
def blend(f,b,a=.5):
    f,b = f.lstrip('#'),b.lstrip('#')
    return '#'+''.join('%02x'%round(int(f[i:i+2],16)*a+int(b[i:i+2],16)*(1-a)) for i in (0,2,4))
print('rev', rev)
for name, d in (('light',light),('dark',dark)):
    bg = res(d,'var(--ocx-color-code-bg)'); fg = res(d,'var(--ocx-color-code-fg)')
    print(f'{name} bg {bg} fg {fg} contrast {cr(fg,bg):.2f}')
    for k in ['foreground']+[str(i) for i in range(16)]:
        if k == 'foreground': continue
        t = mp[k]; c = res(d,f'var({t})'); r = cr(c,bg)
        print(f'  {k:>2} {t:<28} {c} {r:.2f}' + ('  FAIL' if r < 4.5 else ''))
    for nm, c in (('default fg', fg), ('green(2)', res(d,f'var({mp["2"]})'))):
        b = blend(c,bg); print(f'  dim 0.5 {nm:<10} {c} -> {b} {cr(b,bg):.2f}')
```

Command and output:

```
$ python3 -I contrast.py /home/mherwig/dev/ocx-sh/website e86b83014538975c186912e5038567c69b2f2f2c
rev e86b83014538975c186912e5038567c69b2f2f2c
light bg #f6f8fa fg #1b2129 contrast 15.22
   0 --ocx-color-code-comment     #5f6979 5.21
   1 --ocx-color-danger           #b42318 6.18
   2 --ocx-color-code-string      #0a7652 5.29
   3 --ocx-color-code-number      #8b6011 5.22
   4 --ocx-color-code-keyword     #5f4ac6 6.01
   5 --ocx-color-code-variable    #ce1c00 5.20
   6 --ocx-color-success          #0a7652 5.29
   7 --ocx-color-fg-muted         #4b5665 7.00
   8 --ocx-color-fg-subtle        #5f6979 5.21
   9 --ocx-color-danger           #b42318 6.18
  10 --ocx-color-success          #0a7652 5.29
  11 --ocx-color-warning          #8b6011 5.22
  12 --ocx-color-keyword          #5f4ac6 6.01
  13 --ocx-color-accent-fg        #ce1c00 5.20
  14 --ocx-color-success          #0a7652 5.29
  15 --ocx-color-fg               #1b2129 15.22
  dim 0.5 default fg #1b2129 -> #888c92 3.17
  dim 0.5 green(2)   #0a7652 -> #80b7a6 2.13
dark bg #14181f fg #c8d0da contrast 11.43
   0 --ocx-color-code-comment     #8b97a8 6.01
   1 --ocx-color-danger           #ff7b6e 7.04
   2 --ocx-color-code-string      #3edea6 10.34
   3 --ocx-color-code-number      #fab833 10.14
   4 --ocx-color-code-keyword     #c0b3ff 9.43
   5 --ocx-color-code-variable    #ff6047 5.94
   6 --ocx-color-success          #3edea6 10.34
   7 --ocx-color-fg-muted         #9aa5b3 7.12
   8 --ocx-color-fg-subtle        #8b97a8 6.01
   9 --ocx-color-danger           #ff7b6e 7.04
  10 --ocx-color-success          #3edea6 10.34
  11 --ocx-color-warning          #fab833 10.14
  12 --ocx-color-keyword          #c0b3ff 9.43
  13 --ocx-color-accent-fg        #ff6047 5.94
  14 --ocx-color-success          #3edea6 10.34
  15 --ocx-color-fg               #e7ebf1 14.87
  dim 0.5 default fg #c8d0da -> #6e747c 3.77
  dim 0.5 green(2)   #3edea6 -> #297b62 3.48
```

Reading: every entry is 5.20 or higher in light and 5.94 or higher in dark; none is marked FAIL. Bright black (0 and 8) is 5.21 and 6.01, against 2.69:1 for the grimoire theme (CH-VID-12 measurement).

### Measurement B: which colours the casts print

Script `castscan.py` counts every SGR parameter in `o` events (v3 events are `[interval, code, data]`); 38 and 48 count as extended colour.

```python
# usage: python3 -I castscan.py cast...   (asciicast v3: header line, then [interval,code,data] events)
import json, re, sys, collections
for f in sys.argv[1:]:
    ls = open(f).read().splitlines(); h = json.loads(ls[0]); c = collections.Counter()
    for l in ls[1:]:
        try: e = json.loads(l)
        except ValueError: continue
        if e[1] != 'o': continue
        for m in re.finditer(r'\x1b\[([0-9;:]*)m', e[2]):
            p = m.group(1).split(';'); i = 0
            while i < len(p):
                v = p[i]
                if v in ('38','48'): c['ext'+v] += 1; i += 2 if (i+1 < len(p) and p[i+1] == '5') else 4; continue
                if v not in ('','0'): c[v] += 1
                i += 1
    print(f.split('/')[-1], 'theme' in h['term'], sorted(c.items()))
```

```
$ python3 -I castscan.py /home/mherwig/dev/ocx-sh/www-setup/site/public/casts/examples/*.cast
air-gapped.cast False [('1', 1), ('32', 1)]
ci-wrapper.cast False [('1', 1), ('2', 1), ('3', 1), ('32', 1)]
dev-box-elvish.cast False [('1', 6), ('2', 22), ('3', 1), ('32', 3), ('4', 5)]
dev-box-fish.cast False [('1', 6), ('2', 22), ('3', 1), ('32', 3), ('4', 5)]
dev-box-nu.cast False [('1', 1), ('32', 1)]
dev-box-pwsh.cast False [('1', 6), ('2', 22), ('3', 1), ('32', 3), ('4', 5)]
dev-box-sh.cast False [('1', 7), ('2', 22), ('3', 1), ('32', 3), ('4', 5)]
dockerfile.cast False [('1', 1), ('32', 1)]
```

The only palette colour printed is SGR 32 (entry 2). No extended colour, no SGR 90 to 97. Dim (2) appears in 5 of 8 casts: ci-wrapper (1), dev-box-elvish, -fish, -pwsh and -sh (22 each); 89 occurrences in all.

### Measurement C: the CH-VID-12a one-liner, run

The one-liner counts `ESC[2m` per cast. The cast file stores the escape as the JSON text `\u001b`, so the one-liner replaces that text with the real character first. Run on the same 8 casts:

```
$ for f in /home/mherwig/dev/ocx-sh/www-setup/site/public/casts/examples/*.cast; do printf '%s ' $(basename $f); python3 -I -c "import re,sys;print(len(re.findall(r'\x1b\[2m',open(sys.argv[1]).read().replace('\\\\u001b','\x1b'))))" $f; done
air-gapped.cast 0
ci-wrapper.cast 1
dev-box-elvish.cast 22
dev-box-fish.cast 22
dev-box-nu.cast 0
dev-box-pwsh.cast 22
dev-box-sh.cast 22
dockerfile.cast 0
```

It agrees with Measurement B on all 8 casts: 22 in each of dev-box-elvish, -fish, -pwsh and -sh, 1 in ci-wrapper, 0 in the other three. Limits: it matches only the literal `ESC[2m`, not a combined parameter such as `ESC[1;2m`, and it does not read the cast as JSON. The scan in Measurement B finds none of those in these casts. `castcontrast.py` exists only as Appendix A of `channel-terminal-video.md`, a script printed in the topic file, not a file in any repository; it reads a theme from the header and exits on a cast without one, so it cannot check these casts as it stands.

### Measurement D: dim text rendered in Chromium

Setup in the scratch directory: the player bundle `asciinema-player.min.js` and `asciinema-player.css` copied from `website/node_modules/.pnpm/asciinema-player@3.15.1/.../dist/bundle` (3.15.1 is the version the pin's `packages/theme/package.json:149` names, and `www-setup/site/pnpm-lock.yaml:1123` resolves), `tokens.css` and the `.asciinema-player-theme-ocx` block cut from the pinned files with `git show`, and the real `dev-box-sh.cast`. The page creates the player with `theme: 'ocx'`, as `terminal.mjs` does, and `render.cjs` serves it on localhost, sets `data-theme` to light and dark in turn, reads the computed style of a dim span (`Bootstrap     pulled 0.6.5`), takes a screenshot of that span, and reads the glyph pixel furthest from the background. Browser: Playwright 1.63.0 core with Chromium build 1255, headless; its shared libraries came from an earlier session's scratch folder through `LD_LIBRARY_PATH` (read only). The page is `index.html`:

```html
<!doctype html><meta charset=utf-8>
<link rel=stylesheet href=asciinema-player.css><link rel=stylesheet href=tokens.css><link rel=stylesheet href=theme-ocx.css>
<style>body{margin:0;background:var(--ocx-color-code-bg)}</style>
<div id=p></div><script src=asciinema-player.min.js></script>
<script>window.pl=AsciinemaPlayer.create('dev-box-sh.cast',document.getElementById('p'),{theme:'ocx',poster:'npt:0:08',fit:false,controls:false});</script>
```

```js
// usage: node render.cjs <playwright-core dir>  ; serves cwd on localhost, renders the player in light and dark
const { chromium } = require(process.argv[2]); const http = require('http'), fs = require('fs'), path = require('path');
const srv = http.createServer((q, r) => { const f = path.join(process.cwd(), q.url.split('?')[0].replace(/^\//,'')||'index.html');
  fs.readFile(f, (e, b) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, {'content-type': f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':'text/html'}), r.end(b))); }).listen(0, async () => {
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const b = await chromium.launch({executablePath: process.env.HOME+'/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome'}); 
  for (const scheme of ['light','dark']) {
    const pg = await b.newPage(); await pg.goto(url); await pg.evaluate(s => document.documentElement.setAttribute('data-theme', s), scheme);
    await pg.waitForSelector('pre.ap-term-text span', {timeout: 10000}); await pg.waitForTimeout(500);
    const info = await pg.evaluate(() => {
      const pre = document.querySelector('pre.ap-term-text'), cs = e => getComputedStyle(e);
      const f = [...pre.querySelectorAll('.ap-faint')]; const g = pre.querySelector('.ap-fg-2, [class*=ap-fg-2]');
      return { bg: cs(document.querySelector('.ap-term')||pre).backgroundColor, preColor: cs(pre).color, faint: f.length,
        faintOpacity: cs(f[1]).opacity, faintColor: cs(f[1]).color, faintText: f.slice(0,3).map(e=>e.textContent),
        rect: (r => ({x:r.x,y:r.y,width:r.width,height:r.height}))(f[1].getBoundingClientRect()),
        bgRect: (r => ({x:r.x,y:r.y,width:r.width,height:r.height}))(pre.getBoundingClientRect()) };
    });
    console.log(scheme, JSON.stringify(info));
    if (info.rect) {
      const buf = await pg.screenshot({ clip: info.rect }); fs.writeFileSync(`dim-${scheme}.png`, buf);
      // pixel with the largest distance from the background, read through a canvas in a second page
      const p2 = await b.newPage(); await p2.goto('about:blank');
      const px = await p2.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im,0,0);
        const d = x.getImageData(0,0,c.width,c.height).data; const bg = [d[0],d[1],d[2]]; let best = bg, bd = 0;
        for (let i = 0; i < d.length; i += 4) { const dist = Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2]); if (dist > bd) { bd = dist; best = [d[i],d[i+1],d[i+2]]; } }
        return { bg, best }; }, buf.toString('base64'));
      console.log(scheme, 'pixel bg', px.bg.join(','), 'furthest-from-bg pixel', px.best.join(','));
    }
    await pg.close();
  }
  await b.close(); srv.close(); });
```

Command and output (the `faintText` and `rect` fields are cut from the printout for width; they are in the full JSON):

```
$ LD_LIBRARY_PATH=<chromelibs>/usr/lib/x86_64-linux-gnu node render.cjs <website>/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core
light {"bg":"rgba(0, 0, 0, 0)","preColor":"rgb(27, 33, 41)","faint":8,"faintOpacity":"0.5","faintColor":"rgb(27, 33, 41)",
light pixel bg 246,248,250 furthest-from-bg pixel 136,140,145
dark {"bg":"rgba(0, 0, 0, 0)","preColor":"rgb(200, 208, 218)","faint":8,"faintOpacity":"0.5","faintColor":"rgb(200, 208, 218)",
dark pixel bg 20,24,31 furthest-from-bg pixel 110,116,124
```

The player sets `opacity: 0.5` on the dim span (computed style `0.5`), the span colour is the default foreground (`rgb(27, 33, 41)` light, `rgb(200, 208, 218)` dark), and the strongest glyph pixel is `136,140,145` on `246,248,250` (light) and `110,116,124` on `20,24,31` (dark). The arithmetic prediction is `#888c92` (136,140,146) and `#6e747c` (110,116,124): the dark pixel is exact and the light one is one unit off in blue. Contrast of the rendered pixels, same formula:

| Scheme | Strongest rendered pixel on background | Ratio | Computed blend (contrast.py) |
|---|---|---|---|
| light | 136,140,145 on 246,248,250 | 3.18 | 3.17 |
| dark | 110,116,124 on 20,24,31 | 3.77 | 3.77 |

Because anti-aliased thin strokes rarely reach the full blend colour, the strongest pixel is an upper bound on what a reader sees: the true text is no better than 3.18 and 3.77. Both are under 4.5. Dim in the casts sets no colour, so the default-foreground row applies. A dim green (not printed in these casts) would be 2.13 light and 3.48 dark.

## Effect on the ruleset

- **CH-VID-12: confirm (SHOULD), with a changed last Verify sentence and one added measured line.** Replace "A cast with no theme in its header is checked against the player or VHS theme instead." with: "A cast with no theme in its header is checked against the palette of the theme the embed forces (for the ocx site, `theme: 'ocx'` in `packages/theme/src/components/terminal.mjs`, mapped to site tokens in `Terminal.astro`), read at the commit the site pins, once per colour scheme; the check passes only if it passes in both light and dark." Add to the measured lines: "ocx v3 casts (www-setup, theme pinned at website `e86b830`), measured 2026-11-27 from the pinned tokens: all 16 palette entries 5.20 to 15.22 (light) and 5.94 to 14.87 (dark); the casts print only SGR 32; the www-setup site has no stylesheet of its own that overrides tokens. Not a screenshot of the deployed site." Verify for this line: `python3 -I contrast.py <website-repo> <pinned-commit>` (Measurement A) prints no `FAIL`; its script is in this artifact and should move into Appendix A as a second mode.
- **CH-VID-12 manual item, dim: keep it a manual item and add the measurement; do not call it a known failure of the player.** New wording for the dim sentence: "Dim (SGR 2) is renderer-dependent. In asciinema-player 3.15.1 it is drawn at `opacity: 0.5` over the theme background, which gave 3.18:1 (light) and 3.77:1 (dark) for the default foreground on the ocx theme, measured in headless Chromium 2026-11-27 (follow-up q1, Measurement D). Check it per player and theme: render the cast at a frame that uses dim and compare the glyph colour with the background, or compute the 0.5 blend. A result under 4.5 is reported; it fails the gate only when the dim text carries information the page does not repeat in text (CH-VID-14)." Reason for the softer wording: one player version, one theme and one browser were measured; another player version or browser may draw dim differently. In this player a theme cannot repair it, because the opacity is fixed in the player CSS.
- **Row 12 of the wave-1 audit table: update.** Replace "The ocx v3 casts carry no theme, so their check runs against the ocx player theme, not done" with: "ocx v3 casts, checked against the ocx player theme at the pinned website commit: all palette entries pass in both schemes (5.20 or more); dim text (5 of 8 casts) renders at 3.18 light and 3.77 dark in headless Chromium, a manual item".
- **NEW CH-VID-12a (SHOULD).** Do not use SGR 2 (dim) for text a viewer needs to read, and when a cast must set secondary text apart, print it in a palette colour that passes 4.5:1 (on the ocx theme, entry 8 passes in both schemes). Rationale: asciinema-player 3.15.1 renders dim as 50% opacity, so the text is the foreground blended into the background (3.18:1 and 3.77:1 on the ocx theme, rendered). Severity: SHOULD. Verification: the one-liner below prints a count per cast; the count is 0, or every dim string also appears in the page's text alternative. Run (shown run above, Measurement C, over the 8 ocx casts: 0, 1, 22, 22, 0, 22, 22, 0):

  ```
  python3 -I -c "import re,sys;print(len(re.findall(r'\x1b\[2m',open(sys.argv[1]).read().replace('\\\\u001b','\x1b'))))" f.cast
  ```

  The one-liner counts only the literal `ESC[2m`; a cast that combines parameters (`ESC[1;2m`) needs the Measurement B scan, which counts `2` in any position. Do not cite `castcontrast.py` for this rule: it only notes that dim is used, does not count it, and exits on a cast without a header theme.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| www-setup pins the theme at website commit `e86b83014538975c186912e5038567c69b2f2f2c` | `ocx-sh/www-setup/site/package.json:15` (local file) | pin commit dated 2026-10-26; www-setup HEAD `acd5211` dated 2026-11-25 |
| Pinned theme maps ANSI 0 to 15 to site tokens; pinned `terminal.mjs:283` sets `theme: 'ocx'` | `git show e86b830:packages/theme/src/components/Terminal.astro` and `.../terminal.mjs` | 2026-10-26 |
| Color tokens at the pin equal those at website HEAD `a9dd6af515bb6244063c8ddab0ce5508b6d7e5a2`; only fonts and display sizes differ | `git diff e86b830 HEAD -- packages/theme/src/tokens.css`, and the `IDENTICAL` diff of the two `contrast.py` outputs | measured 2026-11-27 |
| The www-setup site embeds the casts only through `Cast.astro` to the theme's `Terminal.astro`; no `.css` file or `customCss` in the site | `ocx-sh/www-setup/site/src/components/Cast.astro`, `astro.config.mjs` | www-setup HEAD 2026-11-25 |
| asciinema-player 3.15.1 draws SGR 2 as `.ap-faint` with `opacity: 0.5` | `node_modules/.pnpm/asciinema-player@3.15.1/.../asciinema-player.css:156-157`; computed style `0.5` in Measurement D | measured 2026-11-27 |
| Dim default foreground renders at 3.18:1 (light) and 3.77:1 (dark) | Measurement D, headless Chromium 1255 | measured 2026-11-27 |
| The 8 v3 casts print only SGR 1, 2, 3, 4, 32; dim in 5 of 8 | Measurement B and C | measured 2026-11-27 |

## What could not be determined

- The deployed site. Everything above renders the pinned theme and player in a scratch page. A screenshot of `setup.ocx.sh` itself needs a network fetch of the live page, which this follow-up did not do; if the deployed build uses a different lockfile resolution than `pnpm-lock.yaml`, the player version could differ. The lockfile line (`asciinema-player@3.15.1`) makes that unlikely, but it is not observed.
- Other browsers and other player versions. Chromium 1255 and player 3.15.1 only. Whether player 3.19.0 changes the dim rule (the topic's open question) is not measured here.
- Whether SC 1.4.3 applies to dim text that is purely decorative. That is a reading; no authority settles it, so the rule is SHOULD and report-only by default.

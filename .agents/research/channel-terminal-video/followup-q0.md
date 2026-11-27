---
title: asciinema-player 3.19.0 accessibility attributes and dim rendering
program: product
topic: channel-terminal-video
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 5
---

# asciinema-player 3.19.0: accessibility attributes and SGR 2 rendering

Question (from `product-resume/wave2/channel-terminal-video/q0.md`): does asciinema-player 3.19.0 add a role, tabindex or aria-label to `.ap-player`, and how does it render SGR 2 (dim) against the fleet theme (background `#161826`)? The answer decides whether CH-VID-12 and CH-VID-18 can tighten.

## Answer

1. **No.** In 3.19.0 the `.ap-player` node carries only `class` and `style`: no `role`, no `tabindex`, no `aria-label`. Player 3.17.0 (the fleet's vendored version, proven in F0) gives an identical result, so the upgrade changes nothing here. The 3.19.0 release notes list only rendering and sizing changes ([release v3.19.0](https://github.com/asciinema/asciinema-player/releases/tag/v3.19.0), published 2026-11-22; raw API output in F0).
2. **The player does expose one keyboard stop, and it has no name.** The inner `pre.ap-term-text` has `tabindex=0` and `aria-live=off`; `.ap-wrapper` has `tabindex=-1`. It is the first Tab stop. Three buttons carry aria-labels ("Play", "Show keyboard shortcuts", "Toggle fullscreen mode"). No element in the player has a `role` attribute. With the pre focused, Space starts and pauses playback, so the "Focus the player; Space pauses" hint in CH-VID-18 is true.
3. **Dim is drawn at CSS `opacity: 0.5`, not as a computed palette colour.** The effective colour is the half-and-half blend of the text colour and the theme background. Against `#161826`, dim text on the theme foreground is 4.52:1 (passes, with 0.02 of margin). Of the 16 palette entries, dim text passes 4.5:1 on three (theme foreground and palette 7, both 4.52:1; palette 15, 5.22:1) and fails on the other 14 (1.00 to 3.86:1; measured one by one in F3). One fleet cast, `browse-tui`, prints dim text on palette entry 8 at 1.57:1. (An earlier draft of this file said "1.57 to 2.89:1 for any palette entry". That was wrong: it omitted palettes 0, 7 and 9 to 15.)
4. **Dim is now checkable by script.** The renderer's rule is simple enough to compute, so the Verdict 8 gap "SGR 2 cannot be checked" is closed for dim over the 16 palette entries and the theme foreground. 256-colour indices 16 to 255 and truecolour stay manual.

## Method

All work ran in `~/.cache/research-lang/exemplars/product/wave2/channel-terminal-video-q0/`. No fleet repository was changed. The three fleet casts that use SGR 2 were copied read-only from `/home/mherwig/dev/grimoire-rs/grimoire/docs/public/casts/`.

Setup commands and outputs:

```
npm i asciinema-player@3.19.0 playwright@1.65.1      # added 7 packages
grep '"version"' node_modules/asciinema-player/package.json   # "version": "3.19.0"
sha256sum node_modules/asciinema-player/dist/bundle/asciinema-player.min.js
808731d0463da04f6426972a5f929f1030988e0a003444a83741d64a17a7f128  ...asciinema-player.min.js
npm i asciinema-player@3.17.0   (in v317/)            # comparison build
```

The cached Playwright headless Chromium (build 1255) would not start because the host lacks system libraries (`error while loading shared libraries: libnspr4.so`). I fetched the missing packages with `apt-get download` (no root), unpacked them with `dpkg -x` into `root/` inside the scratch directory, and ran with `LD_LIBRARY_PATH` pointing there. After that `ldd` listed nothing missing. This changed nothing on the system.

Test page `index.html`: stylesheet and `asciinema-player.min.js` from the scratch `node_modules`, served by `python3 -m http.server 8766` on localhost, player created with `AsciinemaPlayer.create(cast, el, {autoPlay:false, idleTimeLimit:2, fit:'width', controls:'auto'})`, which is how `grimoire-rs/grimoire/docs/public/casts.js:41-46` configures it (default `controls`). No theme option is passed, so the player uses the theme embedded in the cast.

All scripts named below live in that scratch directory and were re-run on 2026-11-27 for this repair; every output block is the verbatim output of that re-run. Commands that need Chromium were run with `export LD_LIBRARY_PATH=$PWD/root/usr/lib/x86_64-linux-gnu:$PWD/root/lib/x86_64-linux-gnu` and the page server `python3 -m http.server 8766` running in the scratch directory.

## Findings

### F0. Release notes and the fleet's vendored version

Command and output (`curl -s https://api.github.com/repos/asciinema/asciinema-player/releases/tags/v3.19.0 | jq '{tag_name,name,published_at,html_url,body}'`):

```
{
  "tag_name": "v3.19.0",
  "name": "3.19.0",
  "published_at": "2026-11-22T16:26:21Z",
  "html_url": "https://github.com/asciinema/asciinema-player/releases/tag/v3.19.0",
  "body": "This release improves terminal rendering and player sizing:\n\n- Terminal edge colors now extend into the surrounding padding.\n- Fixed cursor rendering inside wide characters.\n- Fixed underline and strikethrough rendering on spaces.\n- Improved fitting with custom typography, hidden containers, and fullscreen playback.\n- Container resizing now follows animation frames instead of using a debounce timer.\n- Upgraded to avt 0.21.0 for more accurate terminal emulation.\n"
}
```

Fleet vendored version. Command: `grep -n 'asciinema-player' /home/mherwig/dev/grimoire-rs/grimoire/docs/public/casts.js | sed -n 2,5p`, output:

```
16: *   asciinema-player 3.17.0, Apache-2.0
17: *   https://github.com/asciinema/asciinema-player/releases/tag/v3.17.0
18: *   asciinema-player.min.js  sha256 a13c37632e1b5c49fe9128417b9319a9b5bc64cb457dd5ae52cbba8a3aceb880
19: *   asciinema-player.css     sha256 f619fe17597043564f03b2c6918b3daf890ee8b912fb408542fba11afade4fdb
```

The header is a claim, so I hashed the files. Command: `sha256sum /home/mherwig/dev/grimoire-rs/grimoire/docs/public/asciinema-player.{min.js,css} v317/node_modules/asciinema-player/dist/bundle/asciinema-player.{min.js,css}`, output:

```
a13c37632e1b5c49fe9128417b9319a9b5bc64cb457dd5ae52cbba8a3aceb880  .../docs/public/asciinema-player.min.js
f619fe17597043564f03b2c6918b3daf890ee8b912fb408542fba11afade4fdb  .../docs/public/asciinema-player.css
a13c37632e1b5c49fe9128417b9319a9b5bc64cb457dd5ae52cbba8a3aceb880  v317/node_modules/asciinema-player/dist/bundle/asciinema-player.min.js
f619fe17597043564f03b2c6918b3daf890ee8b912fb408542fba11afade4fdb  v317/node_modules/asciinema-player/dist/bundle/asciinema-player.css
```

The vendored files are byte-identical to the npm 3.17.0 package, so the 3.17.0 browser probe below tests the fleet's actual bundle. The notes list no accessibility change; F1 confirms it by measurement.

### F1. Attributes on 3.19.0 and 3.17.0 (viewport 1280x900, after the player mounted)

Source of `cmp.mjs` (the script that produced the two attribute lines, the Space test and the Tab sequence):

```js
import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
for (const [v,f] of [['3.17.0','index317.html'],['3.19.0','index.html']]){
 await p.goto('http://localhost:8766/'+f+'?cast=inspect.cast'); await p.waitForSelector('.ap-term-text'); await p.waitForTimeout(800);
 console.log(v,await p.evaluate(()=>{const a=n=>n?[...n.attributes].filter(x=>x.name!=='style'&&x.name!=='class').map(x=>x.name+'='+x.value).join(' ')||'(none)':'absent';
  return ['.ap-player','.ap-wrapper','pre.ap-term-text'].map(s=>s+': '+a(document.querySelector(s))).join(' | ')+' | role attrs in player: '+document.querySelectorAll('.ap-player [role]').length+' | aria-label attrs: '+[...document.querySelectorAll('.ap-player [aria-label]')].map(n=>n.getAttribute('aria-label')).join(',')}));
}
// Space test on 3.19.0
await p.goto('http://localhost:8766/index.html?cast=inspect.cast'); await p.waitForSelector('.ap-term-text'); await p.waitForTimeout(800);
const t0=await p.evaluate(()=>pl.getCurrentTime());
await p.focus('pre.ap-term-text'); console.log('active after focus():',await p.evaluate(()=>document.activeElement.className));
await p.keyboard.press('Space'); await p.waitForTimeout(1500);
const t1=await p.evaluate(()=>pl.getCurrentTime()); await p.keyboard.press('Space'); await p.waitForTimeout(1000);
const t2=await p.evaluate(()=>pl.getCurrentTime()); await p.waitForTimeout(1000); const t3=await p.evaluate(()=>pl.getCurrentTime());
console.log('time before',t0,'after Space+1.5s',t1,'after 2nd Space+1s',t2,'1s later',t3);
// Tab order from page start
await p.goto('http://localhost:8766/index.html?cast=inspect.cast'); await p.waitForSelector('.ap-term-text'); await p.waitForTimeout(800);
const seq=[];for(let i=0;i<4;i++){await p.keyboard.press('Tab');seq.push(await p.evaluate(()=>{const e=document.activeElement;return e.tagName+'.'+e.className.split(' ')[0]+(e.getAttribute('aria-label')?'['+e.getAttribute('aria-label')+']':'')}));}
console.log('Tab sequence:',seq.join(' -> '));
await b.close();
```

The test page `index.html` is the three-line page of the Method section (`index317.html` is the same page pointing at `v317/node_modules`). Invocation: `node cmp.mjs`. Output, verbatim (this is the re-run; timings differ by a few milliseconds from the first run, the attribute lines are identical):

```
3.17.0 .ap-player: (none) | .ap-wrapper: tabindex=-1 | pre.ap-term-text: aria-live=off tabindex=0 | role attrs in player: 0 | aria-label attrs: Play,Show keyboard shortcuts,Toggle fullscreen mode
3.19.0 .ap-player: (none) | .ap-wrapper: tabindex=-1 | pre.ap-term-text: aria-live=off tabindex=0 | role attrs in player: 0 | aria-label attrs: Play,Show keyboard shortcuts,Toggle fullscreen mode
```

"(none)" means no attribute other than `class` and `style`. The two builds are identical on every attribute that matters here. The bundle source agrees. In `node_modules/asciinema-player/dist/bundle/asciinema-player.min.js` (3.19.0), `grep -c '<pre class=ap-term-text aria-live=off tabindex=0>'` prints `1`, and `grep -o 'role=[^ >]*' | sort | uniq -c` prints nothing: no `role=` string exists in the bundle.

Keyboard behaviour, 3.19.0 (same script):

```
active after focus(): ap-term-text ap-blink
time before 0 after Space+1.5s 1.4967999999523163 after 2nd Space+1s 1.4980999999046325 1s later 1.4980999999046325
Tab sequence: PRE.ap-term-text -> BUTTON.ap-button[Play] -> BUTTON.ap-button[Show keyboard shortcuts] -> BUTTON.ap-button[Toggle fullscreen mode]
```

Reading: the first Space advanced playback time from 0 to 1.50 s; the second Space froze it (1.4981 s, then still 1.4981 s one second later). Tab reaches the unnamed pre first, then the three named buttons.

Consequence for CH-VID-18: the wrapper `role="group"` plus `aria-label` is still needed, because a screen reader announces the first Tab stop as an unlabelled, non-interactive-looking text block (reading of the accessibility tree; no screen reader was run, see "What could not be determined"). The player's own markup gives a group no name.

### F2. How dim is drawn

The 3.19.0 stylesheet: `sed -n 160,162p node_modules/asciinema-player/dist/bundle/asciinema-player.css` prints

```
pre.ap-term-text .ap-faint {
  opacity: 0.5;
}
```

The bundle maps the SGR 2 attribute bit to the class `ap-faint` (`2&A&&(g+="ap-faint ")`). The span keeps its own colour (theme foreground, palette colour or 256-colour), and the browser blends it 50/50 with what is behind it, which is the terminal background `--term-color-background`. After a cast loads, that variable is the cast's own theme background. Before the cast loads, the default theme (`#000000` in the 3.19.0 stylesheet, line 62) shows, so a probe taken too early measures the wrong background; my first pass did this and was discarded.

Source of `bg.mjs` (it starts each cast, plays 0.4 s, pauses, then reads the computed values):

```js
import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
for (const c of ['inspect.cast','lifecycle.cast','browse-tui.cast']){
await p.goto('http://localhost:8766/index.html?cast='+c); await p.waitForTimeout(800);
await p.evaluate(async()=>{await pl.play();await new Promise(r=>setTimeout(r,400));await pl.pause()});await p.waitForTimeout(300);
console.log(c,await p.evaluate(()=>{const g=s=>getComputedStyle(document.querySelector(s));return 'player bg='+g('.ap-player').backgroundColor+' term-bg-var='+g('.ap-term').getPropertyValue('--term-color-background')+' fg-var='+g('.ap-term').getPropertyValue('--term-color-foreground')+' term width='+document.querySelector('.ap-term').style.width+' faint-count@now='+document.querySelectorAll('.ap-faint').length}));}
await b.close();
```

Command `node bg.mjs`, output, verbatim:

```
inspect.cast player bg=rgb(22, 24, 38) term-bg-var=#161826 fg-var=#e9e9ed term width=180ch faint-count@now=0
lifecycle.cast player bg=rgb(22, 24, 38) term-bg-var=#161826 fg-var=#e9e9ed term width=180ch faint-count@now=0
browse-tui.cast player bg=rgb(22, 24, 38) term-bg-var=#161826 fg-var=#e9e9ed term width=120ch faint-count@now=0
```

(`faint-count@now=0` only means no dim span was on screen at the 0.4 s pause; F3 seeks through the whole cast.)

### F3. Measured dim text in the fleet casts

The browser probe `probe.mjs` loads each cast in the player, dumps the player's attributes, seeks through the cast (a step of `max(0.5, duration/80)` seconds), collects every `.ap-faint` span and reads its computed `color` and `opacity`. Source, verbatim:

```js
import { chromium } from 'playwright';
const lum=c=>{const f=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
for (const cast of ['inspect.cast','lifecycle.cast','browse-tui.cast']) {
  await p.goto('http://localhost:8766/index.html?cast='+cast);
  await p.waitForSelector('.ap-player'); await p.waitForTimeout(1500);
  const attrs=await p.evaluate(()=>{const e=document.querySelector('.ap-player');
    const a=n=>[...n.attributes].map(x=>x.name+'='+x.value.slice(0,40));
    const out={player:a(e)};
    for(const s of ['.ap-wrapper','.ap-term','.ap-term-text','.ap-control-bar','.ap-playback-button','.ap-overlay-start']){const n=document.querySelector(s);out[s]=n?a(n):null}
    out.buttons=[...document.querySelectorAll('.ap-player button, .ap-player [role=button]')].map(n=>n.tagName+':'+(n.getAttribute('aria-label')||'')+':'+(n.getAttribute('tabindex')));
    out.roles=[...document.querySelectorAll('.ap-player [role]')].map(n=>n.className+':'+n.getAttribute('role'));
    out.tabbable=[...document.querySelectorAll('.ap-player [tabindex]')].map(n=>n.className+':'+n.getAttribute('tabindex'));
    return out});
  console.log(cast,JSON.stringify(attrs,null,1));
  // render every 0.5s and collect faint spans
  await p.evaluate(async()=>{await pl.play();await new Promise(r=>setTimeout(r,300));await pl.pause()}); await p.waitForTimeout(300); const dur=await p.evaluate(async()=>await pl.getDuration());
  const seen=new Map();
  for(let t=0;t<dur;t+=Math.max(0.5,dur/80)){
    await p.evaluate(async t=>{await pl.seek(t)},t); await p.waitForTimeout(40);
    const r=await p.evaluate(()=>[...document.querySelectorAll('.ap-faint')].map(n=>{const cs=getComputedStyle(n);const term=getComputedStyle(document.querySelector('pre.ap-term-text'));return {txt:n.textContent.trim().slice(0,30),color:cs.color,opacity:cs.opacity,bg:cs.backgroundColor,termBg:getComputedStyle(document.querySelector('.ap-term')).backgroundColor,cls:n.className}}));
    for(const x of r) seen.set(x.txt+'|'+x.color+'|'+x.cls,x);
  }
  console.log(cast,'duration',dur,'distinct faint spans',seen.size);
  for(const x of seen.values()){
    const fg=rgb(x.color), bg=rgb(x.termBg), o=parseFloat(x.opacity);
    const mix=fg.map((v,i)=>v*o+bg[i]*(1-o));
    console.log(JSON.stringify(x),'blended',mix.map(Math.round).join(','),'ratio',ratio(mix,bg).toFixed(2),'(undimmed',ratio(fg,bg).toFixed(2)+')');
  }
}
await b.close();
```

Command `node probe.mjs > probe.out`. Output, verbatim and complete (126 lines; the per-cast attribute dumps repeat F1):

```
inspect.cast {
 "player": [
  "class=ap-player ap-default-term-ff asciinema-p",
  "style=width: 1264px; height: 1060.22px;"
 ],
 ".ap-wrapper": [
  "class=ap-wrapper",
  "tabindex=-1"
 ],
 ".ap-term": [
  "class=ap-term",
  "style=width: 80ch; height: 32em; font-size: 20"
 ],
 ".ap-term-text": [
  "class=ap-term-text ap-blink",
  "aria-live=off",
  "tabindex=0"
 ],
 ".ap-control-bar": [
  "class=ap-control-bar ap-seekable"
 ],
 ".ap-playback-button": [
  "class=ap-button ap-playback-button",
  "type=button",
  "aria-label=Play"
 ],
 ".ap-overlay-start": [
  "class=ap-overlay ap-overlay-start"
 ],
 "buttons": [
  "BUTTON:Play:null",
  "BUTTON:Show keyboard shortcuts:null",
  "BUTTON:Toggle fullscreen mode:null"
 ],
 "roles": [],
 "tabbable": [
  "ap-term-text ap-blink:0"
 ]
}
inspect.cast duration 30.773 distinct faint spans 2
{"txt":"2026-09-07T01:04:47.666460Z","color":"rgb(233, 233, 237)","opacity":"0.5","bg":"rgba(0, 0, 0, 0)","termBg":"rgba(0, 0, 0, 0)","cls":"ap-faint "} blended 117,117,119 ratio 4.53 (undimmed 17.34)
{"txt":"grim::command::add:","color":"rgb(233, 233, 237)","opacity":"0.5","bg":"rgba(0, 0, 0, 0)","termBg":"rgba(0, 0, 0, 0)","cls":"ap-faint "} blended 117,117,119 ratio 4.53 (undimmed 17.34)
lifecycle.cast {
 "player": [
  "class=ap-player ap-default-term-ff asciinema-p",
  "style=width: 1264px; height: 1060.22px;"
 ],
 ".ap-wrapper": [
  "class=ap-wrapper",
  "tabindex=-1"
 ],
 ".ap-term": [
  "class=ap-term",
  "style=width: 80ch; height: 32em; font-size: 20"
 ],
 ".ap-term-text": [
  "class=ap-term-text ap-blink",
  "aria-live=off",
  "tabindex=0"
 ],
 ".ap-control-bar": [
  "class=ap-control-bar ap-seekable"
 ],
 ".ap-playback-button": [
  "class=ap-button ap-playback-button",
  "type=button",
  "aria-label=Play"
 ],
 ".ap-overlay-start": [
  "class=ap-overlay ap-overlay-start"
 ],
 "buttons": [
  "BUTTON:Play:null",
  "BUTTON:Show keyboard shortcuts:null",
  "BUTTON:Toggle fullscreen mode:null"
 ],
 "roles": [],
 "tabbable": [
  "ap-term-text ap-blink:0"
 ]
}
lifecycle.cast duration 55.247 distinct faint spans 2
{"txt":"2026-11-04T13:27:38.189785Z","color":"rgb(233, 233, 237)","opacity":"0.5","bg":"rgba(0, 0, 0, 0)","termBg":"rgba(0, 0, 0, 0)","cls":"ap-faint "} blended 117,117,119 ratio 4.53 (undimmed 17.34)
{"txt":"grim::command::update:","color":"rgb(233, 233, 237)","opacity":"0.5","bg":"rgba(0, 0, 0, 0)","termBg":"rgba(0, 0, 0, 0)","cls":"ap-faint "} blended 117,117,119 ratio 4.53 (undimmed 17.34)
browse-tui.cast {
 "player": [
  "class=ap-player ap-default-term-ff asciinema-p",
  "style=width: 1264px; height: 1060.22px;"
 ],
 ".ap-wrapper": [
  "class=ap-wrapper",
  "tabindex=-1"
 ],
 ".ap-term": [
  "class=ap-term",
  "style=width: 80ch; height: 32em; font-size: 20"
 ],
 ".ap-term-text": [
  "class=ap-term-text ap-blink",
  "aria-live=off",
  "tabindex=0"
 ],
 ".ap-control-bar": [
  "class=ap-control-bar ap-seekable"
 ],
 ".ap-playback-button": [
  "class=ap-button ap-playback-button",
  "type=button",
  "aria-label=Play"
 ],
 ".ap-overlay-start": [
  "class=ap-overlay ap-overlay-start"
 ],
 "buttons": [
  "BUTTON:Play:null",
  "BUTTON:Show keyboard shortcuts:null",
  "BUTTON:Toggle fullscreen mode:null"
 ],
 "roles": [],
 "tabbable": [
  "ap-term-text ap-blink:0"
 ]
}
browse-tui.cast duration 11.953 distinct faint spans 2
{"txt":"Readme","color":"rgb(89, 93, 108)","opacity":"0.5","bg":"rgba(0, 0, 0, 0)","termBg":"rgba(0, 0, 0, 0)","cls":"ap-faint "} blended 45,47,54 ratio 1.56 (undimmed 3.21)
{"txt":"Changelog","color":"rgb(89, 93, 108)","opacity":"0.5","bg":"rgba(0, 0, 0, 0)","termBg":"rgba(0, 0, 0, 0)","cls":"ap-faint "} blended 45,47,54 ratio 1.56 (undimmed 3.21)
```

Defect in the probe, disclosed: its own `blended ... ratio ...` column is wrong. It reads `.ap-term` `backgroundColor`, which is `rgba(0, 0, 0, 0)` (transparent; the theme background lives in the `--term-color-background` variable, see F2), so it blended against black and printed 4.53 and 1.56 instead of 4.52 and 1.57. Ignore that column. What the probe establishes is the other columns: which spans are dim, their computed `color` and `opacity: 0.5`. The ratios come from the two scripts below, which blend against the true theme background.

| Cast | Dim text (probe output above) | Computed colour | Opacity |
|---|---|---|---|
| inspect | a timestamp, `grim::command::add:` | `rgb(233, 233, 237)` (theme foreground `#e9e9ed`) | 0.5 |
| lifecycle | a timestamp, `grim::command::update:` | `rgb(233, 233, 237)` | 0.5 |
| browse-tui | `Readme`, `Changelog` | `rgb(89, 93, 108)` (palette entry 8, `#595d6c`) | 0.5 |

**All 16 palette entries.** Contrast is the WCAG relative-luminance formula ([SC 1.4.3 Understanding page](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), updated 2026-10-04: "The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for the following") against the theme background, with the dim blend `0.5 * fg + 0.5 * bg` per channel. `palette.py` computes it for the theme foreground and every palette entry in a cast header. Source:

```python
# Usage: python3 -I palette.py f.cast -- dim contrast of theme fg and each of the 16 palette entries, blended 50/50 over theme bg
import json,sys
h=json.loads(open(sys.argv[1],encoding='utf-8').readline()); th=h.get('theme') or h['term']['theme']
rgb=lambda c:[int(c.lstrip('#')[i:i+2],16) for i in (0,2,4)]
def lum(c):
    f=lambda v:(v/255/12.92) if v/255<=0.04045 else ((v/255+0.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def ratio(a,b):
    x,y=sorted((lum(a),lum(b)),reverse=True); return (x+.05)/(y+.05)
bg=rgb(th['bg']); ents=[('theme fg',th['fg'])]+[('palette %d'%i,c) for i,c in enumerate(th['palette'].split(':'))]
print('bg',th['bg'])
for n,c in ents:
    v=rgb(c); m=[x*.5+b*.5 for x,b in zip(v,bg)]
    print('%-10s %s undimmed %.2f effective #%02x%02x%02x dimmed %.2f %s'%(n,c,ratio(v,bg),*[round(x) for x in m],ratio(m,bg),'ok' if ratio(m,bg)>=4.5 else 'FAIL'))
```

Command `python3 -I palette.py inspect.cast`, output, verbatim:

```
bg #161826
theme fg   #e9e9ed undimmed 14.54 effective #80808a dimmed 4.52 ok
palette 0  #161826 undimmed 1.00 effective #161826 dimmed 1.00 FAIL
palette 1  #c96b6b undimmed 4.86 effective #704248 dimmed 2.13 FAIL
palette 2  #7fae6f undimmed 6.86 effective #4a634a dimmed 2.67 FAIL
palette 3  #c9a86b undimmed 7.79 effective #706048 dimmed 2.89 FAIL
palette 4  #6f97c9 undimmed 5.82 effective #425878 dimmed 2.42 FAIL
palette 5  #9184d9 undimmed 5.45 effective #544e80 dimmed 2.32 FAIL
palette 6  #6fb3ae undimmed 7.32 effective #42666a dimmed 2.79 FAIL
palette 7  #e9e9ed undimmed 14.54 effective #80808a dimmed 4.52 ok
palette 8  #595d6c undimmed 2.69 effective #383a49 dimmed 1.57 FAIL
palette 9  #dba0a0 undimmed 8.00 effective #785c63 dimmed 2.95 FAIL
palette 10 #a8cf9c undimmed 10.12 effective #5f7461 dimmed 3.47 FAIL
palette 11 #dbc79c undimmed 10.62 effective #787061 dimmed 3.58 FAIL
palette 12 #9cbcdb undimmed 8.91 effective #596a80 dimmed 3.19 FAIL
palette 13 #d2cefd undimmed 11.73 effective #747392 dimmed 3.86 FAIL
palette 14 #9cd4cf undimmed 10.67 effective #59767a dimmed 3.60 FAIL
palette 15 #ffffff undimmed 17.61 effective #8a8c92 dimmed 5.22 ok
```

The three casts share one theme: `for c in inspect lifecycle browse-tui; do python3 -I palette.py $c.cast | md5sum; done` prints the same digest (`3d8bdc1007246403276c8ab19dd85957`) three times, so the table holds for all three. The table is the measurement; do not extrapolate it to another theme.

Reading, fleet theme: dim passes 4.5:1 on the theme foreground (4.52, margin 0.02), palette 7 (the same `#e9e9ed`, 4.52) and palette 15 (`#ffffff`, 5.22). It fails on palette 0 (the background colour itself, 1.00), palettes 1 to 6 (2.13 to 2.89), palette 8 (1.57) and palettes 9 to 14 (2.95 to 3.86). That is 3 of 17 colours passing (14 of the 16 palette entries fail).

Two caveats on the browse-tui result. First, `Readme` and `Changelog` read as inactive tab labels; SC 1.4.3 exempts text of inactive user interface components, so whether this is a defect depends on the owner's reading, and the SHOULD level of CH-VID-12 already allows a recorded reason. Second, the cast writes it as `\u001b[2m\u001b[38;5;8;49m Readme` (`grep -a -o '.\{40\}Readme.\{0,10\}' browse-tui.cast`), i.e. 256-colour index 8 plus dim. Index 8 is palette entry 8 in this player, by two independent readings: (1) the bundle's colour lookup `if(3===B)return I.palette[A.getUint8(g+1)]` indexes a 16-entry theme array that the player fills from the cast header palette (`for(let A=0;A<16;A++){...e[A]=t(g.getPropertyValue(\`--term-color-${A}\`),I)}` in `asciinema-player.min.js`); (2) the browser read `rgb(89, 93, 108)` on the `Readme` span, which is `#595d6c`, palette entry 8 in the header. The player's table for indices 16 to 255 was not read (see "What could not be determined").

### F4. A script that checks it (`dimcheck.py`)

Written and run 2026-11-27. It reads the theme from the cast header, walks the `o` events with a small SGR state machine (0, 2, 22, 30 to 37, 90 to 97, 39, `38;5;n`), records the colour of every printable character drawn while dim is on, and scores each (colour, dim) pair with the blend above. Self-check: black on white must give 21:1. Colours it cannot score (256-colour 16 to 255, truecolour) are printed as "not checked".

```python
# Usage: python3 -I dimcheck.py f.cast -- exit 1 if printed SGR 2 (dim) text is under 4.5:1 once drawn at opacity 0.5 (asciinema-player CSS)
import json,re,sys
L=open(sys.argv[1],encoding='utf-8').read().splitlines()
h=json.loads(L[0]); th=h.get('theme') or h.get('term',{}).get('theme')
if not th: sys.exit('no theme in header')
pal=th['palette'].split(':')
def rgb(c): c=c.lstrip('#'); return [int(c[i:i+2],16) for i in (0,2,4)]
def lum(c):
    f=lambda v:(v/255/12.92) if v/255<=0.04045 else ((v/255+0.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def ratio(a,b):
    x,y=sorted((lum(a),lum(b)),reverse=True); return (x+.05)/(y+.05)
assert abs(ratio([0,0,0],[255,255,255])-21)<1e-9
bg=rgb(th['bg']); txt=''.join(json.loads(l)[2] for l in L[1:] if l.strip() and json.loads(l)[1]=='o')
fg=None; dim=False; used=set(); skipped=set()
for m in re.finditer(r'\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[A-Za-z]|([^\x1b])',txt):
    if m.group(2) is not None:
        if dim and m.group(2).strip() and ord(m.group(2))>=32: used.add(fg)
        continue
    if m.group(1) is None: continue
    ps=[int(x or 0) for x in m.group(1).split(';')] or [0]; i=0
    while i<len(ps):
        p=ps[i]; i+=1
        if p==0: fg=None; dim=False
        elif p==2: dim=True
        elif p in (22,): dim=False
        elif p==39: fg=None
        elif 30<=p<=37: fg=p-30
        elif 90<=p<=97: fg=p-82
        elif p==38 and ps[i:i+1]==[5]: n=ps[i+1]; i+=2; fg=n if n<16 else 'x%d'%n
        elif p==38: fg='truecolour'; i+=4
bad=0
for f in sorted(used,key=str):
    if isinstance(f,str): print('dim over',f,'not checked'); skipped.add(f); continue
    c=rgb(th['fg'] if f is None else pal[f]); mix=[v*.5+b*.5 for v,b in zip(c,bg)]
    r=ratio(mix,bg); bad|=r<4.5; print('dim over','theme fg' if f is None else 'palette %d'%f,'#%02x%02x%02x'%tuple(c),'effective #%02x%02x%02x'%tuple(round(x) for x in mix),'%.2f'%r,'FAIL' if r<4.5 else 'ok')
if not used: print('no dim text printed')
sys.exit(bad)
```

`syn.cast` is the negative test, a synthetic cast on the fleet theme that prints green text under dim. Its full content, verbatim (`cat syn.cast`):

```
{"version": 2, "width": 180, "height": 58, "title": "grim: read an artifact before you install it", "theme": {"fg": "#e9e9ed", "bg": "#161826", "palette": "#161826:#c96b6b:#7fae6f:#c9a86b:#6f97c9:#9184d9:#6fb3ae:#e9e9ed:#595d6c:#dba0a0:#a8cf9c:#dbc79c:#9cbcdb:#d2cefd:#9cd4cf:#ffffff"}}
[0.1, "o", "\u001b[2m\u001b[32mdim green\u001b[0m"]
```

Runs, verbatim (the four commands were run in the scratch directory on 2026-11-27):

```
$ python3 -I dimcheck.py inspect.cast
dim over theme fg #e9e9ed effective #80808a 4.52 ok
exit 0
$ python3 -I dimcheck.py lifecycle.cast
dim over theme fg #e9e9ed effective #80808a 4.52 ok
exit 0
$ python3 -I dimcheck.py browse-tui.cast
dim over palette 8 #595d6c effective #383a49 1.57 FAIL
exit 1
$ python3 -I dimcheck.py syn.cast
dim over palette 2 #7fae6f effective #4a634a 2.67 FAIL
exit 1
```

`dimcheck.py` and `palette.py` agree: for the same colours (theme foreground 4.52, palette 8 1.57, palette 2 2.67) both print the same ratio.

The script's colours match the browser: the browser read `rgb(233, 233, 237)` and `rgb(89, 93, 108)` on the dim spans, the same two entries the script found. The browser did not measure the blended pixel itself; the blend is the CSS opacity definition applied by hand. A screenshot pixel check would confirm it and was not run.

## Effect on the ruleset

**CH-VID-18 (SHOULD): change.** The probe is now done on 3.19.0 and the result is the same, so the wrapper stays and the "Player 3.19.0 was not probed" sentence goes. Exact new rationale text for the second sentence: "The `.ap-player` node carries only `class` and `style` on player 3.17.0 and on 3.19.0 (probed 2026-11-27); the first Tab stop is the inner `pre.ap-term-text` with `tabindex=0` and no accessible name, and Space on it toggles playback." Exact new verify line: "`grep -nE 'controls|aria-label' <embed js>` shows `controls: true` and the label. After every player upgrade, serve a page that mounts the new player and run `node ap-a11y.mjs <page-url>` (Appendix B of this follow-up; needs `playwright`); exit 0 means `.ap-player` itself still carries no role, aria-label or tabindex and the wrapper part of this rule stays, exit 1 means the player now names itself and the wrapper part may be dropped." The script is `ap-a11y.mjs`, full source in Appendix B, run on 2026-11-27 against both builds: `node ap-a11y.mjs http://localhost:8766/index317.html?cast=inspect.cast` and `node ap-a11y.mjs http://localhost:8766/index.html?cast=inspect.cast` each print `{"role":null,"label":null,"tabindex":null,"anyRole":0,"firstStop":"ap-term-text ap-blink","firstStopLabel":null}` and exit 0. Severity unchanged: SHOULD. Reason it does not rise to MUST: no accessibility tree or screen reader was run, and DOC-EX-16 accepts the default.

**CH-VID-12 (SHOULD): change.** Add a third bullet to the rule, exact text: "SGR 2 (dim) text: the asciinema player draws it at `opacity: 0.5`, so its effective colour is the 50/50 blend of the text colour and the theme background. Score that blend, not the palette entry. `python3 -I dimcheck.py f.cast` (new Appendix) exits 1 when any printed dim text is under 4.5:1. On the fleet theme dim passes only over the theme foreground, palette 7 and palette 15 (4.52, 4.52 and 5.22:1)." Replace the rationale sentence "the script cannot check dim (SGR 2) or 256-colour and truecolour output" with "the scripts cannot check 256-colour indices 16 to 255 or truecolour output; dim over the 16 palette entries and the theme foreground is covered by `dimcheck.py`". Replace the Verify line with: "`python3 -I castcontrast.py f.cast` and `python3 -I dimcheck.py f.cast` both exit 0. Each prints a manual-check line for colours it cannot score." Severity stays SHOULD: owner decision 7 (return to MUST for player embeds) is still open and this finding does not settle it, though it strengthens the case for dim, because the check is now mechanical. Fleet status for the Applied-to-the-fleet row 12: `inspect` and `lifecycle` pass dim (4.52:1, marginal); `browse-tui` fails dim on `Readme` and `Changelog` (1.57:1), subject to the inactive-component reading above.

**Verdict 8 (documented gap): change.** New text: "Recording-theme contrast is mostly checkable. The scripts check the theme foreground, the 16 ANSI entries a cast uses, and dim text (drawn by the player at half opacity). They cannot check 256-colour indices 16 to 255 or truecolour output, which stay a manual check (CH-VID-12)." Verification line to add (the gap is a statement about the checkers, so the check finds the casts the gap still covers): "`grep -c -E '[34]8;(5;(1[6-9]|[2-9][0-9]|[12][0-9]{2})|2;)' <casts>` prints a non-zero count for each cast that still needs the manual check; a cast printing 0 is fully covered by `castcontrast.py` plus `dimcheck.py`. Re-run when a new cast lands." Run on the 11 fleet casts on 2026-11-27 (`cd grimoire-rs/grimoire/docs/public/casts && grep -c -E '[34]8;(5;(1[6-9]|[2-9][0-9]|[12][0-9]{2})|2;)' *.cast`): `browse-tui.cast:7`, every other cast `:0`. So one of 11 casts needs the manual check, and the gap statement "Three fleet casts use dim and one uses extended colour" can read "three use dim (now scripted) and one, `browse-tui`, uses 256-colour 236 (manual)".

**CH-VID-06 (MUST): confirm, with one addition.** Record the measured 3.19.0 digest next to the vendored file when the fleet upgrades: `sha256sum asciinema-player.min.js` of the npm package prints `808731d0463da04f6426972a5f929f1030988e0a003444a83741d64a17a7f128` for `asciinema-player@3.19.0` (`dist/bundle/asciinema-player.min.js`, installed 2026-11-27). This is the file an upgrade would vendor, and the check in CH-VID-06 ("`sha256sum` equals the recorded sha256") is satisfied against this value. No text change to the rule.

**NEW rule CH-VID-27 (SHOULD).** Imperative: "Do not print SGR 2 (dim) text in any colour whose 50/50 blend with the recording theme's background is under 4.5:1." Rationale: the player renders dim as 50% opacity, which on the fleet theme gives 1.00 to 3.86:1 for 14 of the 16 palette entries (F3); only dim over the theme foreground (4.52), palette 7 (4.52) and palette 15 (5.22) passes. Severity: SHOULD, for the same reason as CH-VID-12 (SC 1.4.3 applies to player text as a reading; dim text on inactive controls may fall under the inactive-component exemption). Verification an agent can run: `python3 -I dimcheck.py <cast>`; exit 0 passes, exit 1 names the failing colour and ratio. Negative test: `syn.cast`, a synthetic cast printing `\x1b[2m\x1b[32m` on the fleet theme, exits 1 (2.67:1; run shown in F4). If the owner prefers not to add a rule, CH-VID-12's third bullet carries the same check, and CH-VID-27 can be folded in.

**CH-VID-02, CH-VID-13: confirm.** The probe page used `autoPlay: false` and playback started only after `play()` or Space (time stayed 0 until the key press, "time before 0").

## Dated facts

| Fact | URL | Source date | Kind |
|---|---|---|---|
| asciinema-player v3.19.0 release: "improves terminal rendering and player sizing", avt 0.21.0, no accessibility changes listed | https://github.com/asciinema/asciinema-player/releases/tag/v3.19.0 | published 2026-11-22 (`published_at 2026-11-22T16:26:21Z`; curl output in F0), read 2026-11-27 | vendor release notes |
| Fleet vendors asciinema-player 3.17.0; `.min.js` and `.css` sha256 equal the npm 3.17.0 package | `grimoire-rs/grimoire/docs/public/casts.js` lines 16-19 and the `sha256sum` output in F0 | read 2026-11-27 | fleet file plus own measurement |
| WCAG SC 1.4.3 Understanding page: 4.5:1 for text and images of text | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | updated 2026-10-04 | authority |
| `.ap-player` has only `class` and `style`; `pre.ap-term-text` has `tabindex=0` and `aria-live=off`; three labelled buttons; no `role` anywhere in the player, in 3.17.0 and 3.19.0 | own DOM probe of npm packages `asciinema-player@3.17.0` and `@3.19.0` | measured 2026-11-27 | own measurement |
| Dim is `pre.ap-term-text .ap-faint { opacity: 0.5; }` | `node_modules/asciinema-player/dist/bundle/asciinema-player.css` lines 160-162, package 3.19.0 | package as published 2026-11-22, read 2026-11-27 | own reading of vendor code |
| Dimmed contrast on `#161826`: theme foreground 4.52, palette 7 4.52, palette 15 5.22, the other 14 entries 1.00 to 3.86 | `palette.py` and `dimcheck.py` (this file) and `probe.mjs` in the scratch directory | computed 2026-11-27 | own measurement |
| Fleet theme: `fg #e9e9ed`, `bg #161826`, palette 8 `#595d6c` | `grimoire-rs/grimoire/docs/public/casts/inspect.cast` line 1 | read 2026-11-27 | fleet file |

## What could not be determined

- **Screen-reader behaviour.** No screen reader or accessibility-tree dump was run (no NVDA, JAWS or VoiceOver on this host, and no logged-in browser). The claim that the unnamed `pre.ap-term-text` is announced without a name rests on its attributes (`tabindex=0`, no `aria-label`, no `role`), not on a speech-output test. Missing: a browser accessibility-tree export (Chromium `page.accessibility` or `getFullAXTree` via CDP) or a screen-reader run. I did not run the CDP export.
- **The blended pixel colour.** The 4.52:1 and 1.57:1 values apply the CSS opacity blend by hand to computed styles. A screenshot of a dim span and a pixel read were not taken, so rounding in Chromium's compositing (a margin of 0.02 on the 4.52 value) is unverified. Missing: a screenshot sample of the theme-foreground dim text.
- **256-colour indices 16 to 255 and truecolour.** The script cannot score them. `browse-tui` uses `38;5;236` and `48;5;236` (7 matching lines, see the Verdict 8 grep in "Effect on the ruleset"); the rendered colour of indices 16 to 255 presumably comes from the avt terminal emulator that the 3.19.0 release notes name (F0), whose table I did not read. For indices 0 to 15 the mapping is read and measured (F3). Whether undimmed `38;5;8` text in `browse-tui` (index 8 is 2.69:1 on this theme) is printed was not measured.
- **Whether `Readme` and `Changelog` are inactive components** under the SC 1.4.3 exemption. That is a reading of the recorded TUI, and the owner decides it.
- **The ocx v3 casts.** They carry no theme, so their dim rendering depends on the ocx player theme (`ocx-sh/website/packages/theme/src/components/terminal.mjs`), which is a custom player, not asciinema-player. Not measured.

## Appendix B. ap-a11y.mjs (CH-VID-18 verification)

Written and run 2026-11-27 in the scratch directory `~/.cache/research-lang/exemplars/product/wave2/channel-terminal-video-q0/`. Needs `npm i playwright` and a page that mounts the player (the three-line test page in Method). Source, verbatim:

```js
// Usage: node ap-a11y.mjs <page-url-with-a-mounted-asciinema-player>
// Exit 1 if .ap-player itself carries role/aria-label/tabindex (then the wrapper part of CH-VID-18 may be dropped); exit 0 if it carries none.
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(process.argv[2]); await p.waitForSelector('.ap-player .ap-term-text'); await p.waitForTimeout(800);
const r = await p.evaluate(() => { const e = document.querySelector('.ap-player');
  return { role: e.getAttribute('role'), label: e.getAttribute('aria-label'), tabindex: e.getAttribute('tabindex'),
    anyRole: document.querySelectorAll('.ap-player [role]').length,
    firstStop: document.querySelector('.ap-player [tabindex="0"]')?.className, firstStopLabel: document.querySelector('.ap-player [tabindex="0"]')?.getAttribute('aria-label') }; });
console.log(JSON.stringify(r)); await b.close();
process.exit(r.role === null && r.label === null && r.tabindex === null && r.anyRole === 0 ? 0 : 1);
```

Runs, verbatim:

```
$ node ap-a11y.mjs http://localhost:8766/index317.html?cast=inspect.cast
{"role":null,"label":null,"tabindex":null,"anyRole":0,"firstStop":"ap-term-text ap-blink","firstStopLabel":null}
exit 0
$ node ap-a11y.mjs http://localhost:8766/index.html?cast=inspect.cast
{"role":null,"label":null,"tabindex":null,"anyRole":0,"firstStop":"ap-term-text ap-blink","firstStopLabel":null}
exit 0
```

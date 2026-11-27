---
title: "Follow-up q0: the 0-pixel cmdbar trigger is a real invisible-focus defect, not a harness artefact"
program: product
topic: ux-a11y-authoring
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 2
---

# Follow-up q0: why does the second `ocx-cmdbar__trigger` show 0 changed pixels?

## Answer

The 0 is real, and the harness is not at fault. The second trigger ("$ocx add ocx.sh/nodejs...") sits inside `.ocx-stage__finale`. Its opacity is driven by scroll position through the CSS variable `--ocx-f`. When Tab focuses the trigger the page is at scroll y=1002 (1280 px) or y=1136 (390 px), and the finale is still at `opacity: 0`. The ring is drawn, but the whole control, ring included, is invisible. A keyboard user lands on a focused control they cannot see. The ring rule itself is correct: it is identical on all stops, and once the finale is visible the same trigger changes 1878 pixels on focus.

The result is the same in light and dark theme and at 1280 px and 390 px (all measured below). Under `prefers-reduced-motion: reduce` the defect disappears (finale opacity 1, 1878 / 1430 changed pixels).

Two earlier loose ends from the first pass are now closed. (1) The unexplained "identical = true" clipped screenshot at sy=1600 was a harness mistake of that probe, not a product effect: it passed a viewport-relative `clip` to Puppeteer, whose `clip` is in page coordinates (section 7). (2) A fix is verified: `:focus-within` on the finale works and survives scrolling; writing `--ocx-f` on `focusin` does not survive scrolling (section 8).

## Sources fetched

- WCAG 2.2, W3C Recommendation dated 12 December 2024, fetched 2026-11-27: https://www.w3.org/TR/WCAG22/#focus-visible . Operative text of SC 2.4.7 Focus Visible (Level AA), verbatim: "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible."
- Understanding SC 2.4.7, W3C WAI, page states "Updated 04 October 2026", fetched 2026-11-27: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html . Intent, verbatim: "The purpose of this success criterion is to help a person know which element has the keyboard focus." and "Authors are responsible for providing at least one mode of operation where the focus is visible."

## Method

Scratch directory `~/.cache/research-lang/exemplars/product/wave2/q0-a11y/`. It holds a copy of the built ocx.sh site (`/home/mherwig/dev/ocx-sh/website/site/dist`, read only, copied) served with `python3 -m http.server 8731 --directory site`, and the scripts reproduced in the appendix. Browser: Google Chrome for Testing 159.0.8154.6, headless shell (`$CHR --version`), driven by puppeteer-core. `source env.sh` sets `CHR` and `LD_LIBRARY_PATH` (the system lacks `libnspr4`). No pixel library is installed (`import PIL` and `import numpy` both fail), so changed pixels are counted in the page: both PNGs are drawn to a canvas and pixels whose summed RGB difference exceeds 30 are counted, the same rule as `focus_diff.mjs`. Nothing was changed in any repository and nothing was sent anywhere.

## Measurements

### 1. Reproduction of the commission's number

Command: `PAD=40 node focus_diff.mjs http://localhost:8731/index.html light 1280 'ocx-cmdbar__trigger'`

```
light 1280 index.html button.ocx-cmdbar__trigger|curl -fsSL https://s {"changed":2124,"total":66700,...
light 1280 index.html button.ocx-cmdbar__trigger|$ocx add ocx.sh/node {"changed":0,"total":62756,"top":[]}
light 1280 index.html button.ocx-cmdbar__trigger|$ocx add ghcr.io/ocx {"changed":1858,"total":62176,...
```

### 2. The ring exists in computed style on the "0" stop

Command: `node probe2.mjs` (source in appendix). Output, trimmed to the fields that matter:

```
{"txt":"curl -fsSL https://setup.","sy":0,   "fvis":true,"fieldMatchesHas":true,"outline":"solid 2px rgb(206, 28, 0) off -2px","ownOutline":"none"}
{"txt":"$ocx add ocx.sh/nodejs/no","sy":1002,"fvis":true,"fieldMatchesHas":true,"outline":"solid 2px rgb(206, 28, 0) off -2px","ownOutline":"none"}
{"txt":"$ocx add ghcr.io/ocx-cont","sy":3079,"fvis":true,"fieldMatchesHas":true,"outline":"solid 2px rgb(206, 28, 0) off -2px","ownOutline":"none"}
{"txt":"curl -fsSL https://setup.","sy":4572,"fvis":true,"fieldMatchesHas":true,"outline":"solid 2px rgb(206, 28, 0) off -2px","ownOutline":"none"}
```

The second stop matches `:focus-visible`, the `:has()` rule on the field matches, and the 2px ring is set. The ring rule is identical on every stop.

### 3. An ancestor is at opacity 0

Command: `node probe3.mjs` (source in appendix). Ancestors of the second stop with a non-default value:

```
DIV.ocx-cmdbar__field   ov=auto hidden op=1
DIV.ocx-stage__finale   ov=visible      op=0  tr=matrix(1, 0, 0, 1, 0, 24)
DIV.ocx-stage__pin      ov=clip         op=1
```

`.ocx-stage__finale` is at `opacity: 0` with a 24 px translate. Opacity multiplies down the tree, so the control and its ring are at 0.

### 4. Source of the opacity (read only)

`/home/mherwig/dev/ocx-sh/website/packages/theme/src/components/ScrollStage.astro` lines 111-118: `.ocx-stage__finale { --ocx-f: 1; ... opacity: var(--ocx-f); transform: translateY(calc((1 - var(--ocx-f)) * var(--ocx-space-6))); }`. The header comment (lines 6-7) says that without JS or under reduced motion "nothing is pinned ... and the finale shows". `packages/theme/src/components/ui/scroll.mjs` line 43 defines `finalAt = (p) => ease((p - 0.68) / 0.18)` and line 170 writes `put(finale, '--ocx-f', finalAt(p))` per scroll frame. The stage is a sticky pin, so focus on a child does not scroll far enough to advance `p`: `--ocx-f` stays 0. Working tree of the sibling checkout, not a published release.

### 5. Effective opacity at each trigger stop: default motion, reduced motion

`eff` is the product of `opacity` over the element and all ancestors, read 150 ms after each Tab. Command: `node probe4.mjs` and `node probe4.mjs reduce`.

```
default                                                    reduce
curl -fsSL..   sy=0     inFinale=false eff=1               sy=0    eff=1
$ocx add ocx.. sy=1002  inFinale=true  finOpacity=0 eff=0  sy=999  finOpacity=1 eff=1
$ocx add ghcr. sy=3079  inFinale=false eff=1               sy=2139 eff=1
curl -fsSL..   sy=4572  inFinale=false eff=1               sy=3638 eff=1
docH 5372                                                  docH 4464
```

### 6. Full matrix: theme, width, motion (changed-pixel counts, `probeM.mjs`)

For each trigger stop: Tab, wait 300 ms, read `eff`, screenshot the field plus 40 px padding in page coordinates, blur, screenshot again, count changed pixels. Commands are `node probeM.mjs <theme> <width> <default|reduce> none`. Dark theme was confirmed applied by `node themecheck.mjs`: `dark { bg: 'rgb(14, 17, 22)', fg: 'rgb(154, 165, 179)', ring: 'rgb(231, 235, 241)' }` against `light { bg: 'rgb(246, 247, 249)' ... }`.

| Theme | Width | Motion | Stop 1 (sy / eff / px) | Stop 2, finale (sy / eff / px) | Stop 3 (sy / eff / px) | Stop 4 (sy / eff / px) |
|---|---|---|---|---|---|---|
| light | 1280 | default | 0 / 1 / 2014 | 1002 / 0 / **0** | 3079 / 1 / 1858 | 4572 / 1 / 2118 |
| dark | 1280 | default | 0 / 1 / 2014 | 1002 / 0 / **0** | 3079 / 1 / 1858 | 4572 / 1 / 2118 |
| light | 390 | default | 0 / 1 / 1282 | 1136 / 0 / **0** | 3783 / 1 / 1294 | 5311 / 1 / 1282 |
| dark | 390 | default | 0 / 1 / 1282 | 1136 / 0 / **0** | 3783 / 1 / 1294 | 5311 / 1 / 1282 |
| light | 1280 | reduce | 0 / 1 / 2014 | 999 / 1 / 1878 | 2139 / 1 / 1858 | 3638 / 1 / 2118 |
| light | 390 | reduce | 0 / 1 / 1282 | 1078 / 1 / 1430 | 2733 / 1 / 1294 | 4253 / 1 / 1282 |
| dark | 390 | reduce | 0 / 1 / 1282 | 1078 / 1 / 1430 | 2733 / 1 / 1294 | 4253 / 1 / 1282 |

Counts are the same in light and dark because the same ring geometry changes in both; I did not read the focused ring colour in dark theme (`themecheck.mjs` read only the unfocused outline colour, `rgb(231, 235, 241)` dark versus `rgb(27, 33, 41)` light). The 390 px layout (the `width < 46rem` branch of `ScrollStage.astro`) shows the same defect, at sy=1136.

### 7. Why the first pass saw "identical" at sy=1600

Command: `node probeC.mjs`. It scrolls to 1600 (finale at opacity 1), focuses the trigger, and compares unfocused versus focused screenshots of the same region taken three ways:

```
box {"vx":370,"vy":613,"sx":0,"sy":1600,"w":541,"h":116}
focus-visible true
viewportCoords identical = true changed px = 0
pageCoords identical = false changed px = 1878
full identical = false changed px = 1878
```

Puppeteer's `screenshot({clip})` takes page coordinates. The first-pass probe passed viewport coordinates (y=613) while scrolled to 1600, so it photographed an unrelated region 1600 px higher. Passing page coordinates gives 1878 changed pixels, the same as the reduced-motion stop. `focus_diff.mjs` already adds `scrollX/scrollY` (`r.y+scrollY`) and is correct, so the 0 in section 1 is not caused by this effect. This explains the contradiction between the clipped "true" and the full-viewport "false": the full-viewport shot (1878 px) is the valid one.

### 8. Verifying the fix, and real scroll behaviour

Candidate fixes, injected into the page at test time: `css` = `.ocx-stage__finale:focus-within{opacity:1;transform:none}`; `js` = on `focusin` of `[data-stage-finale]`, `style.setProperty('--ocx-f','1')`. Commands: `node probeM.mjs <theme> <width> default css|js`.

| Fix | Theme / width | Stop 2 (sy / eff / px) |
|---|---|---|
| none | light 1280 | 1002 / 0 / 0 |
| css | light 1280 | 978 / 1 / 4790 |
| css | light 390 | 1112 / 1 / 3785 |
| css | dark 390 | 1112 / 1 / 3902 |
| js | light 1280 | 1002 / 1 / 1878 |
| js | light 390 | 1136 / 1 / 1430 |

With the `css` fix the pixel count is larger than 1878 because the whole control appears on focus (and is absent when blurred), not only the ring. Stops 1, 3 and 4 are unchanged in every row.

Stability under scrolling (`node probeS2.mjs none|css|js`: Tab to the finale trigger, read `eff` at 50, 150, 500, 1500 and 3000 ms, then wheel +600 px, then wheel -600 px; `html` and `body` `scroll-behavior` are `auto`):

```
none: t=50..3000ms eff=0 (sy 1002) | after wheel +600 eff=1 (sy 1602) | after wheel -600 eff=0 (sy 1002)
css:  t=50..3000ms eff=1 (sy 978)  | after wheel +600 eff=1 (sy 1578) | after wheel -600 eff=1 (sy 978)
js:   t=50..3000ms eff=1 (sy 1002) | after wheel +600 eff=1 (sy 1602) | after wheel -600 eff=0 (sy 1002)
```

The opacity does not change during 3 s after Tab (no timing effect, no smooth scroll). The `js` fix is undone as soon as the user scrolls back, because `scroll.mjs` rewrites `--ocx-f`: focus stays on the trigger and it vanishes again. The `css` fix holds. So the rule recommends the CSS form.

## Classification

| Hypothesis from the question | Verdict |
|---|---|
| Harness clip | No. Page-coordinate clips are correct in `focus_diff.mjs`; the 0 persists at 390 px and in dark theme; the cause is upstream of the screenshot (section 3, 6). The only clip error found was in the first-pass `probe5.mjs` (section 7) and does not affect `focus_diff.mjs`. |
| Harness scroll | No. The scroll at the stop is correct and the control is on screen (section 2, 3). |
| Harness timing | No. `eff` is 0 from 50 ms to 3000 ms after Tab (section 8). |
| Real missing ring | Not the ring rule: identical and present on all stops (section 2). |
| Real defect | Yes. A control is reachable by Tab while its container is at `opacity: 0`, so the focus indicator cannot be seen at default motion, in both themes and at both widths. |

Reading against WCAG: SC 2.4.7 requires "a mode of operation where the keyboard focus indicator is visible" (W3C, 12 December 2024, URL above), and its Understanding text states the purpose as helping "a person know which element has the keyboard focus" (W3C WAI, updated 04 October 2026). A focus indicator on an invisible control cannot do that. Judgement call: a keyboard user could scroll further (Page Down) until the finale fades in, which one could argue is a "mode of operation"; I classify it as a failure because the indicator is invisible at the moment of focus and the user has no cue that scrolling would reveal it. That is my reading, not a W3C statement.

## Effect on the ruleset

**UX-A11Y-13: change.** Replace the sentence "A stop that changes 0 pixels is a lead to inspect, not a verdict: the harness can miss a ring, and the cause of one 0-pixel stop is still unknown (Open question 6)." with:

> A stop that changes 0 pixels is a lead, not a verdict. Resolve it with two reads. (1) Computed style of the element and its ring owner: `outline-style: none`, no `box-shadow` and no border change is a missing ring (fail). (2) Effective opacity of the element and all its ancestors at the moment of focus (rule UX-A11Y-36): any value below 1 makes the stop invisible (fail). Pass `clip` to the screenshot in page coordinates (`rect + scrollX/scrollY`), never viewport coordinates. Only a stop that passes both reads and still shows 0 pixels is a harness artefact.

Also replace "Not cited: the second `ocx-cmdbar__trigger`" in the fleet table (line 734 of the consolidation) with: "The second `ocx-cmdbar__trigger` (0 pixels) is confirmed as a defect by rule UX-A11Y-36: its container `.ocx-stage__finale` is at `opacity: 0` when focus arrives at default motion, in light and dark, at 1280 and 390 px."

**NEW UX-A11Y-36 (MUST).** A control that can receive keyboard focus must be visible whenever it has focus. A container that is faded, translated or revealed by scroll position must show its focused descendants at full opacity: add `:focus-within { opacity: 1; transform: none; }` to that container (or make the visible state the default and let motion enhance it, or make the hidden controls `inert` until revealed). Do not fix it by writing the scroll variable on `focusin`: scroll code overwrites it.
*Why:* WCAG 2.2 SC 2.4.7 (AA, W3C Recommendation 12 December 2024, https://www.w3.org/TR/WCAG22/#focus-visible). Measured on ocx.sh, 2026-11-27: the finale trigger is Tab-reachable at effective opacity 0 at default motion, in light and dark, at 1280 and 390 px (section 6). The `:focus-within` fix gives `eff = 1` and survives a scroll away and back; the `focusin` + variable fix reverts to `eff = 0` after scrolling back (section 8).
*Severity:* MUST. Plain AA failure with a fleet measurement behind it. (Interpretive point in "Classification" above.)
*Verify (built site, in a browser):* run `node probeM.mjs <theme> <width> default none` for light and dark at 1280 and 390 (probe source in the appendix; adapt the selector regex `cmdbar__trigger` to the project's focusable class or use `a, button, input, [tabindex]`). Every printed stop must have `"eff":1`; any `"eff"` below 0.99 after the 300 ms wait fails. Also run with `reduce`, which must pass. For a candidate fix, inject it with `addStyleTag` as `probeM.mjs ... css` does, then run `node probeS2.mjs css` and require `eff = 1` at all five time points and after the +600 / -600 wheel. Static pre-check for candidates: `grep -rnE 'opacity:\s*var\(|data-stage|scroll-timeline|animation-timeline' src`, then check each container for focusable descendants.

**UX-A11Y-27: confirm, with a note.** The reduced-motion branch is correct on ocx.sh (reduce: eff 1, 1878 / 1430 px). The failure is in the default-motion branch, which UX-A11Y-27 does not cover; UX-A11Y-36 closes it. No change to UX-A11Y-27's text.

**Open question 6: close.** Replace it with: "Answered in wave 2 (`followup-q0`): the 0-pixel stop is a real invisible-focus defect (UX-A11Y-36), at both widths and both themes."

**Appendix A5: change.** Replace "That reproduces the unexplained 0 of Open question 6." with "That reproduces the 0, which `followup-q0` explains: the ancestor `.ocx-stage__finale` is at opacity 0."

## Owner and fleet follow-up (not ruleset)

The defect is in `ScrollStage.astro` of the ocx.sh website. The smallest fix verified here is one CSS rule on `.ocx-stage__finale`: `&:focus-within { opacity: 1; transform: none; }`. This follow-up changed nothing in that repository.

## Dated facts

- 2026-11-27: WCAG 2.2 W3C Recommendation, 12 December 2024; SC 2.4.7 text as quoted above (https://www.w3.org/TR/WCAG22/#focus-visible).
- 2026-11-27: Understanding SC 2.4.7 carries "Updated 04 October 2026" (https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).
- 2026-11-27: reproduction 2124 / 0 / 1858 on the built ocx.sh `index.html`, light, 1280 px, Chrome for Testing 159.0.8154.6 headless shell.
- 2026-11-27: finale opacity 0 for scroll y 800..1300, 0.134 at 1400, 0.950 at 1500, 1 from 1600 (default motion, 1280x800 viewport; `probe5.mjs`).
- 2026-11-27: `ScrollStage.astro` and `scroll.mjs` read from the working tree of the sibling `ocx-sh/website` checkout, not a published release.

## What could not be determined

- Real assistive technology and a headed browser. I measured rendered opacity in headless Chrome. Smooth-scroll was ruled out only as far as the computed `scroll-behavior: auto` and the 50-3000 ms reads in section 8; a user's OS-level or extension-level smooth scrolling was not exercised.
- Real phone hardware. 390 px is a viewport emulation at 800 px height, not a device.
- Browsers other than Chrome (Firefox, Safari): not run, no browser binary other than the Chrome headless shell was used.
- Whether other pages of the site contain a second scroll-revealed container with focusable content: only `index.html` was probed.
- Whether the sticky pin plus `:focus-within` fix causes a layout shift (the `css` fix shifted the focus-scroll position from 1002 to 978); not evaluated for visual quality.

## Appendix: scripts (all run from the scratch directory after `source env.sh`; the server was `python3 -m http.server 8731 --directory site`)

### focus_diff.mjs

```js
import puppeteer from 'puppeteer-core';
const [,,url,theme,vw,pred]=process.argv;
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:+vw,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}]);
await p.evaluateOnNewDocument((t)=>{try{localStorage.setItem('starlight-theme',t);localStorage.setItem('theme',t)}catch(e){}},theme);
await p.goto(url,{waitUntil:'networkidle0'});
await p.evaluate((t)=>{document.documentElement.dataset.theme=t},theme);
await p.mouse.click(1,1);
const seen=new Set();
for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');
  const info=await p.evaluate((pred)=>{const e=document.activeElement;if(!e||e===document.body)return null;const k=e.tagName.toLowerCase()+'.'+(e.className||'').toString()+'|'+e.textContent.trim().slice(0,20);const m=new RegExp(pred).test(k);const r=e.getBoundingClientRect();return {k,m,r:[r.x+scrollX,r.y+scrollY,r.width,r.height]}},pred);
  if(!info)break; if(!info.m||seen.has(info.k))continue; seen.add(info.k);
  let [x,y,w,h]=info.r;
  const clip={x:Math.max(0,x-(+process.env.PAD||10)),y:Math.max(0,y-(+process.env.PAD||10)),width:Math.min(w+2*(+process.env.PAD||10),1250),height:Math.min(h+2*(+process.env.PAD||10),700)};
  const f=await p.screenshot({clip,encoding:'base64',captureBeyondViewport:true});
  await p.evaluate(()=>document.activeElement.blur());
  const u=await p.screenshot({clip,encoding:'base64',captureBeyondViewport:true});
  const res=await p.evaluate(async(a,b)=>{const ld=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data};const A=await ld(a),B=await ld(b);let n=0;const cols={};for(let i=0;i<A.length;i+=4){if(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2])>30){n++;const k=A[i]+','+A[i+1]+','+A[i+2]+'<-'+B[i]+','+B[i+1]+','+B[i+2];cols[k]=(cols[k]||0)+1}}return {changed:n,total:A.length/4,top:Object.entries(cols).sort((a,b)=>b[1]-a[1]).slice(0,3)}},f,u);
  console.log(theme,vw,url.split('/').slice(3).join('/'),info.k.slice(0,60),JSON.stringify(res));
  // refocus for next tab progression
  await p.evaluate(()=>{});
}
await b.close();

```

### probe2.mjs

```js
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
await p.mouse.click(1,1);
for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');
  const o=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;
   if(!e.className.toString().includes('cmdbar__trigger'))return {skip:e.tagName};
   const f=e.closest('.ocx-cmdbar__field');const r=e.getBoundingClientRect();const fr=f.getBoundingClientRect();
   const cs=getComputedStyle(f);
   return {txt:e.textContent.trim().slice(0,25),sy:scrollY,rect:[r.x,r.y,r.width,r.height],field:[fr.x,fr.y,fr.width,fr.height],
    fvis:e.matches(':focus-visible'),fieldMatchesHas:f.matches(':has(.ocx-cmdbar__trigger:focus-visible)'),
    outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor+' off '+cs.outlineOffset,
    ownOutline:getComputedStyle(e).outlineStyle, innerH:innerHeight, fieldClass:f.className, anim:document.getAnimations().length}});
  if(!o)break; if(!o.skip)console.log(JSON.stringify(o));
}
await b.close();

```

### probe3.mjs

```js
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
await p.mouse.click(1,1);
let n=0;
for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');
  const t=await p.evaluate(()=>document.activeElement?.textContent.trim().slice(0,12)+'|'+document.activeElement?.className);
  if(!/cmdbar__trigger/.test(t))continue; n++; if(n!==2)continue;
  const info=await p.evaluate(()=>{const e=document.activeElement;const r=e.getBoundingClientRect();
    const chain=[];for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);if(s.overflow!=='visible'||s.opacity!=='1'||s.transform!=='none'||s.contentVisibility!=='visible'||s.visibility!=='visible'||s.clipPath!=='none')chain.push([a.tagName+'.'+a.className.toString().slice(0,40),'ov='+s.overflow,'op='+s.opacity,'tr='+s.transform,'cv='+s.contentVisibility,'vis='+s.visibility,'clip='+s.clipPath])}
    return {sy:scrollY,sx:scrollX,rect:[r.x,r.y,r.width,r.height],chain}});
  console.log(JSON.stringify(info,null,1));
  const pad=40;
  // (a) harness style: page coords, captureBeyondViewport
  const hc={x:info.rect[0]+info.sx-pad,y:info.rect[1]+info.sy-pad,width:info.rect[2]+2*pad,height:info.rect[3]+2*pad};
  const fa=await p.screenshot({clip:hc,captureBeyondViewport:true});
  // (b) viewport-relative, no beyond
  const vc={x:info.rect[0]-pad,y:info.rect[1]-pad,width:info.rect[2]+2*pad,height:info.rect[3]+2*pad};
  const fb=await p.screenshot({clip:{...vc,x:vc.x+info.sx,y:vc.y+info.sy},captureBeyondViewport:false});
  fs.writeFileSync('f_a.png',fa);fs.writeFileSync('f_b.png',fb);
  await p.evaluate(()=>document.activeElement.blur());
  const ua=await p.screenshot({clip:hc,captureBeyondViewport:true});
  const ub=await p.screenshot({clip:{...vc,x:vc.x+info.sx,y:vc.y+info.sy},captureBeyondViewport:false});
  fs.writeFileSync('u_a.png',ua);fs.writeFileSync('u_b.png',ub);
  console.log('a identical',Buffer.compare(fa,ua)===0,'b identical',Buffer.compare(fb,ub)===0,'sy after',await p.evaluate(()=>scrollY));
  break;
}
await b.close();

```

### probe4.mjs

```js
import puppeteer from 'puppeteer-core';
const reduce=process.argv[2]==='reduce';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'},{name:'prefers-reduced-motion',value:reduce?'reduce':'no-preference'}]);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
await p.mouse.click(1,1);
for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');
  await new Promise(r=>setTimeout(r,150));
  const o=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;
   const fin=e.closest('[data-stage-finale]');
   return {t:e.textContent.trim().slice(0,22),sy:Math.round(scrollY),inFinale:!!fin,
    finOpacity:fin?getComputedStyle(fin).opacity:null,finVar:fin?getComputedStyle(fin.closest('[data-ocx-stage]')).getPropertyValue('--ocx-f')||fin.style.getPropertyValue('--ocx-f'):null,
    pinVars:(()=>{const s=e.closest('[data-ocx-stage]');return s?s.getAttribute('style')||'':''})(),
    eff:(()=>{let o=1;for(let a=e;a;a=a.parentElement)o*=parseFloat(getComputedStyle(a).opacity);return +o.toFixed(3)})()}});
  if(!o)break; if(/cmdbar|ocx add|curl/.test(o.t)||o.inFinale)console.log(JSON.stringify(o));
}
console.log('docH',await p.evaluate(()=>document.documentElement.scrollHeight));
await b.close();

```

### probe5.mjs

```js
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
const rows=[];
for(let y=800;y<=1800;y+=100){await p.evaluate(y=>scrollTo(0,y),y);await new Promise(r=>setTimeout(r,200));
 rows.push(await p.evaluate(()=>{const f=document.querySelector('[data-stage-finale]');const r=f.getBoundingClientRect();return {sy:Math.round(scrollY),op:getComputedStyle(f).opacity,top:Math.round(r.top)}}));}
console.log(rows.map(r=>`sy=${r.sy} opacity=${r.op} finaleTop=${r.top}`).join('\n'));
// pick first scroll with opacity 1, focus trigger there, diff viewport-relative
const ok=rows.find(r=>r.op==='1');
if(ok){await p.evaluate(y=>scrollTo(0,y),ok.sy);await new Promise(r=>setTimeout(r,300));
 const box=await p.evaluate(()=>{const e=document.querySelector('[data-stage-finale] .ocx-cmdbar__trigger');const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
 const clip={x:box[0]-40,y:box[1]-40,width:box[2]+80,height:box[3]+80};
 const u=await p.screenshot({clip});
 await p.focus('[data-stage-finale] .ocx-cmdbar__trigger');await p.keyboard.press('Shift');await new Promise(r=>setTimeout(r,400));
 const f=await p.screenshot({clip});
 fs.writeFileSync('vis_u.png',u);fs.writeFileSync('vis_f.png',f);
 console.log('visible-state, same element: screenshots identical =',Buffer.compare(u,f)===0,'focus-visible =',await p.evaluate(()=>document.activeElement.matches(':focus-visible')),'sy',await p.evaluate(()=>scrollY));}
await b.close();

```

### probe6.mjs

```js
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
const S='[data-stage-finale] .ocx-cmdbar__trigger';
await p.evaluate(()=>scrollTo(0,1600));await new Promise(r=>setTimeout(r,500));
const st=()=>p.evaluate((S)=>{const e=document.querySelector(S);const f=e.closest('.ocx-cmdbar__field');const c=getComputedStyle(f);const r=e.getBoundingClientRect();return {sy:Math.round(scrollY),active:document.activeElement===e,fv:e.matches(':focus-visible'),ring:c.outlineStyle+' '+c.outlineWidth+' '+c.outlineColor,rect:[r.x,r.y,r.width,r.height].map(Math.round),finOp:getComputedStyle(e.closest('[data-stage-finale]')).opacity}},S);
console.log('before',JSON.stringify(await st()));
const u=await p.screenshot();
await p.focus(S);await new Promise(r=>setTimeout(r,500));
console.log('after focus()',JSON.stringify(await st()));
const f=await p.screenshot();
fs.writeFileSync('v_u.png',u);fs.writeFileSync('v_f.png',f);
console.log('full-viewport identical',Buffer.compare(u,f)===0);
await b.close();

```

### probeM.mjs

```js
// usage: node probeM.mjs <theme> <vw> <motion:default|reduce> <fix:none|css|js>
import puppeteer from 'puppeteer-core';
const [,,theme,vw,motion,fix]=process.argv;
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:+vw,height:800});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme},{name:'prefers-reduced-motion',value:motion==='reduce'?'reduce':'no-preference'}]);
await p.evaluateOnNewDocument((t)=>{try{localStorage.setItem('starlight-theme',t);localStorage.setItem('theme',t)}catch(e){}},theme);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
await p.evaluate((t)=>{document.documentElement.dataset.theme=t},theme);
if(fix==='css')await p.addStyleTag({content:'.ocx-stage__finale:focus-within{opacity:1;transform:none}'});
if(fix==='js')await p.evaluate(()=>{document.querySelectorAll('[data-stage-finale]').forEach(f=>f.addEventListener('focusin',()=>f.style.setProperty('--ocx-f','1')))});
await p.mouse.click(1,1);
const diff=async(a,c)=>p.evaluate(async(a,c)=>{const ld=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const k=document.createElement('canvas');k.width=i.width;k.height=i.height;const x=k.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,k.width,k.height).data};const A=await ld(a),B=await ld(c);let n=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2])>30)n++;return n},a,c);
for(let i=0;i<80;i++){
  await p.keyboard.press('Tab');
  await new Promise(r=>setTimeout(r,300));
  const o=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;
    if(!/cmdbar__trigger/.test(e.className))return {skip:1};
    let eff=1;for(let a=e;a;a=a.parentElement)eff*=parseFloat(getComputedStyle(a).opacity);
    const f=e.closest('.ocx-cmdbar__field').getBoundingClientRect();
    return {t:e.textContent.trim().slice(0,14),sy:Math.round(scrollY),eff:+eff.toFixed(3),r:[f.x+scrollX,f.y+scrollY,f.width,f.height]}});
  if(!o)break;if(o.skip)continue;
  const pad=40,R=Math.round,clip={x:Math.max(0,R(o.r[0]-pad)),y:Math.max(0,R(o.r[1]-pad)),width:R(Math.min(o.r[2]+2*pad,+vw-1)),height:R(o.r[3]+2*pad)};
  const f=await p.screenshot({clip,encoding:'base64',captureBeyondViewport:true});
  await p.evaluate(()=>document.activeElement.blur());
  const u=await p.screenshot({clip,encoding:'base64',captureBeyondViewport:true});
  console.log(JSON.stringify({theme,vw,motion,fix,t:o.t,sy:o.sy,eff:o.eff,changed:await diff(f,u)}));
  // restore focus for next Tab: Tab from body would restart; use Shift-free refocus
  await p.keyboard.down('Shift');await p.keyboard.press('Tab');await p.keyboard.up('Shift');await p.keyboard.press('Tab');
}
await b.close();

```

### probeC.mjs

```js
// sy=1600 discrepancy: same focus state, clip given in viewport coords (wrong) vs page coords (right); changed-pixel counts
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
const S='[data-stage-finale] .ocx-cmdbar__trigger';
await p.evaluate(()=>scrollTo(0,1600));await new Promise(r=>setTimeout(r,500));
const box=await p.evaluate((S)=>{const r=document.querySelector(S).getBoundingClientRect();return {vx:Math.round(r.x)-40,vy:Math.round(r.y)-40,sx:scrollX,sy:scrollY,w:Math.round(r.width)+80,h:Math.round(r.height)+80}},S);
console.log('box',JSON.stringify(box));
const cnt=(a,c)=>p.evaluate(async(a,c)=>{const ld=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const k=document.createElement('canvas');k.width=i.width;k.height=i.height;const x=k.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,k.width,k.height).data};const A=await ld(a),B=await ld(c);let n=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2])>30)n++;return n},a,c);
const shots=async()=>({
 viewportCoords:await p.screenshot({encoding:'base64',clip:{x:box.vx,y:box.vy,width:box.w,height:box.h}}),
 pageCoords:await p.screenshot({encoding:'base64',clip:{x:box.vx+box.sx,y:box.vy+box.sy,width:box.w,height:box.h},captureBeyondViewport:true}),
 full:await p.screenshot({encoding:'base64'})});
const u=await shots();
await p.focus(S);await p.keyboard.press('Shift');await new Promise(r=>setTimeout(r,400));
console.log('focus-visible',await p.evaluate(()=>document.activeElement.matches(':focus-visible')));
const f=await shots();
for(const k of Object.keys(u))console.log(k,'identical =',u[k]===f[k],'changed px =',await cnt(u[k],f[k]));
await b.close();

```

### probeS2.mjs

```js
// usage: node probeS.mjs <fix:none|css|js>  -- timing + stability after a scroll nudge, 1280 light default motion
import puppeteer from 'puppeteer-core';
const fix=process.argv[2];
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1280,height:800});
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
if(fix==='css')await p.addStyleTag({content:'.ocx-stage__finale:focus-within{opacity:1;transform:none}'});
if(fix==='js')await p.evaluate(()=>document.querySelectorAll('[data-stage-finale]').forEach(f=>f.addEventListener('focusin',()=>f.style.setProperty('--ocx-f','1'))));
console.log('scroll-behavior html/body:',await p.evaluate(()=>[getComputedStyle(document.documentElement).scrollBehavior,getComputedStyle(document.body).scrollBehavior]));
await p.mouse.click(1,1);
const eff=()=>p.evaluate(()=>{const e=document.activeElement;let o=1;for(let a=e;a;a=a.parentElement)o*=parseFloat(getComputedStyle(a).opacity);return {t:e.textContent.trim().slice(0,12),sy:Math.round(scrollY),eff:+o.toFixed(3)}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<80;i++){await p.keyboard.press('Tab');if(await p.evaluate(()=>!!document.activeElement.closest('[data-stage-finale]')))break;}
let prev=0;for(const ms of [50,150,500,1500,3000]){await wait(ms-prev);prev=ms;console.log('t~'+ms+'ms after Tab',JSON.stringify(await eff()));}
await p.mouse.wheel({deltaY:600});await wait(300);console.log('after wheel +600px',JSON.stringify(await eff()));
await p.mouse.wheel({deltaY:-600});await wait(300);console.log('after wheel -600px',JSON.stringify(await eff()));
await b.close();

```

### themecheck.mjs

```js
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:process.env.CHR,headless:true,args:['--no-sandbox']});
for(const t of ['light','dark']){const p=await b.newPage();
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:t}]);
await p.evaluateOnNewDocument((t)=>{try{localStorage.setItem('starlight-theme',t);localStorage.setItem('theme',t)}catch(e){}},t);
await p.goto('http://localhost:8731/index.html',{waitUntil:'networkidle0'});
await p.evaluate((t)=>{document.documentElement.dataset.theme=t},t);
console.log(t,await p.evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,fg:getComputedStyle(document.body).color,ring:getComputedStyle(document.querySelector('.ocx-cmdbar__field')).outlineColor})));
}
await b.close();

```

Note: `probeS2.mjs` is `probeS.mjs` with the wheel deltas changed to +/-600; `probeS.mjs` (+/-60) gave the same time series.

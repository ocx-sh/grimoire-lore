---
title: "UX-A11Y-36 held-out check: Chromium, Firefox and WebKit on ten public pages"
program: product
topic: ux-a11y-authoring
worker: followup-w3-q0
wave: 3
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
---

# Does the UX-A11Y-36 check separate a pass from a fail outside headless Chrome?

## Answer

No. The check as the consolidation states it (`focus_opacity.mjs`, Appendix A8: FAIL when the product of
`opacity` over the element and its ancestors is below 0.99, or `visibility` or `content-visibility` is
hidden on the chain) did not separate a pass from a fail on ten held-out pages in any of the three engines.

- Chromium 159.0.8154.6: 14 FAIL rows, all 14 hand-labelled visible; 2 invisible controls reported as pass. 0 true positives.
- Firefox 144.0.2: 14 FAIL rows, all 14 visible; 1 invisible control reported as pass. 0 true positives.
- WebKit 26.0 (Playwright WPE build): 13 FAIL rows, all 13 visible; 2 invisible controls reported as pass. 0 true positives.

Two things drive this. (1) The 0.99 threshold flags every design-time dimming (opacity 0.8, 0.85, 0.94) of a control that is plainly
visible. (2) The invisible controls that exist on these pages are zero-size boxes, which an opacity read cannot see. The script's own
scope-limit sentence names "a zero-size clip" as unseen, but the rule text does not list the class. No held-out page showed the
failure the rule was written for (a focused control at effective opacity near 0 inside a scroll-revealed container). So this round
shows the checker is a lead generator, and it neither confirms nor refutes the rule's claim about opacity-0 containers. The
engines agree with each other: the same rows fail, and the same rows pass, in all three.

Repair pass: the replacement check proposed in the first version (settle loop, 0.5 threshold, `LEAD`, `PROXY`) was built
(`focus_opacity2.mjs`) and run live in the three engines. On the same ten pages it flags 3 stops per engine instead of 13 to 14,
finds every hand-labelled invisible stop (true positives 2, 1, 2; false negatives 0, 0, 0) and raises 1, 2 and 1 false positives.
On a longer Chromium walk it raised one false `FAIL` on a visible control (`linear.app`, 0.2). It is a regression check on
pages it was tuned on, not independent validation; see "Live run of the proposed A8".

The W3C text does not name the case. Success criterion 2.4.7 (Focus Visible, AA) is the criterion this catalog's reading rests on,
and 2.4.11 (Focus Not Obscured Minimum, AA) is the second candidate; see "What the W3C text says".

## Method

Everything ran in `~/.cache/research-lang/exemplars/product/wave3/a11y-q0/`. Nothing was changed in any repository. No account,
login, form or post was used. Only the public home page of each host was loaded.

### Excluded hosts

Hosts that appear in the wave-1 or wave-2 artifacts of this topic, and so were not used as test pages: `ocx.sh` (the built site, wave 2),
`grimoire.rs`, `index.grimoire.rs`, the VS Code webview (`code.visualstudio.com` docs), `primer.style` with the Primer CSS and Primer
React Storybooks, `radix-ui.com` with the Radix Themes and Radix website corpora, `starlight.astro.build`, `squidfunk.github.io` (Material),
`design-system.service.gov.uk`, `carbondesignsystem.com`. A grep of the topic artifacts for the ten test hosts returns hits only for `astro.build`, and every hit is `starlight.astro.build`, a different host from the test page `https://astro.build/`. Command and output (run in the research directory, before this artifact existed in the grep set; lines cut at 160 characters):

```
$ for h in astro.build linear.app zed.dev deno.com bun.sh htmx.org go.dev sqlite.org vite.dev tauri.app; do echo "grep -c $h:"; grep -c "$h" ux-a11y-authoring.md ux-a11y-authoring/*.md | grep -v ":0" | grep -v followup-w3-q0; done
grep -c astro.build:
ux-a11y-authoring/page-structure-and-consistency.md:4
ux-a11y-authoring.md:2
grep -c linear.app:   (and zed.dev, deno.com, bun.sh, htmx.org, go.dev, sqlite.org, vite.dev, tauri.app: no file with a non-zero count)
$ grep -n "astro.build" ux-a11y-authoring.md ux-a11y-authoring/*.md | grep -v followup-w3-q0
ux-a11y-authoring.md:691:*Why:* see C10. [Starlight overrides](https://starlight.astro.build/reference/overrides/) says
ux-a11y-authoring.md:991:| Starlight `PageTitle` `id="_top"`; Material skip link only with a table of contents | 31, 32 | [Starlight overrides](https://starligh
ux-a11y-authoring/page-structure-and-consistency.md:164:- Starlight: override through `components` in `starlight()`. `SkipLink` is "hidden until keyboard focus"
ux-a11y-authoring/page-structure-and-consistency.md:228:| Starlight `SkipLink` hidden until focus; `PageTitle` must keep `id="_top"` | https://starlight.astro.b
ux-a11y-authoring/page-structure-and-consistency.md:287:| 11 | https://starlight.astro.build/reference/overrides/ | Starlight overrides reference | undated | `S
ux-a11y-authoring/page-structure-and-consistency.md:288:| 12 | https://starlight.astro.build/guides/overriding-components/ | Starlight override guide | undated
```

All six hits are `starlight.astro.build`. (The first version said `astro.build 6`; the six are the 2 plus 4 above.)

### Engines, and what started

Playwright 1.57.0 was installed with `npm i playwright@1.57.0` in the scratch directory ([npm registry entry, HTTP 200, 2026-11-27](https://registry.npmjs.org/playwright/1.57.0); its browser pins are in [browsers.json at v1.57.0](https://raw.githubusercontent.com/microsoft/playwright/v1.57.0/packages/playwright-core/browsers.json), fetched 2026-11-27: Firefox 1497 = 144.0.2, WebKit 2227, Chromium 1200 = 143.0.7499.4). No system package was installed. Provenance of the Chromium 159 binary: it is not the Chromium that Playwright 1.57.0 pins. It is the `chromium_headless_shell-1255` build in the Playwright cache of an earlier wave (installed 2026-11-27 13:19 local); [browsers.json at v1.65.1](https://raw.githubusercontent.com/microsoft/playwright/v1.65.1/packages/playwright-core/browsers.json), fetched 2026-11-27, maps revision 1255 to 159.0.8154.6. The archives for Firefox and WebKit came from the Playwright CDN, `https://cdn.playwright.dev/dbazure/download/playwright/builds/<firefox/1497/firefox|webkit/2227/webkit>-ubuntu-24.04.zip` (the URL pattern in `install.log`; each answered HTTP 307 on 2026-11-27). Setup reference: [Playwright browsers](https://playwright.dev/docs/browsers), fetched 2026-11-27.

| Engine | Binary | Started? | What it took |
|---|---|---|---|
| Chromium | Chrome for Testing 159.0.8154.6 headless shell, taken from the existing Playwright cache of an earlier wave | yes | `LD_LIBRARY_PATH` pointing at a scratch copy of `libnspr4` and friends (the system lacks `libnspr4`) |
| Firefox | `firefox-ubuntu-24.04` build 1497, version 144.0.2 | yes | The bundled build needs GTK3 and X11 libraries the system lacks. I ran `apt-get download` for 86 `.deb` files and unpacked them with `dpkg -x` into `root/`, with no `dpkg -i` and no root. It also needs `MOZ_DISABLE_CONTENT_SANDBOX=1` and three sibling sandbox variables, because `unshare(CLONE_NEWPID)` fails with EPERM in this sandbox (`Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM`) |
| WebKit | `webkit-ubuntu-24.04` build 2227, version 26.0, headless WPE MiniBrowser | yes, after four fixes | (a) Playwright's own installer hung at "100%" while extracting (`playwright install` under Node 26.13.1), so I downloaded the zips with `curl -L` and unpacked them with Python `zipfile`; that loses executable bits and symlinks, which I restored (`chmod -R u+x`, 16 symlinks recreated from the zip's `external_attr`). (b) A scratch wrapper `wk.sh` sets `LD_LIBRARY_PATH`, because the bundled `MiniBrowser` wrapper overwrites it. (c) 59 more `.deb` files unpacked for wayland, gstreamer, flite, mesa, libglvnd. (d) `EGL_PLATFORM=surfaceless LIBGL_ALWAYS_SOFTWARE=1`, `libgles2`, a scratch `GIO_EXTRA_MODULES` holding only `libgiognutls.so` (the libproxy and gnome-proxy modules made every load hang), and a scratch fontconfig file |

Commands that proved each engine started (output as printed):

```
$ node launch.mjs        # chromium: example.com
chromium OK 159.0.8154.6 Example Domain
$ node t2.mjs            # firefox, with the library path and the four MOZ_DISABLE_*_SANDBOX variables
ff 144.0.2 Example Domain
$ node t4.mjs            # webkit, http and https
launched 26.0
BUTTONok
http Example Domain
https Example Domain
```

Two known harness limits. The machine has no text fonts (`fc-list` prints 0 lines; `/usr/share/fonts` holds only Font Awesome).
Chromium and Firefox screenshots therefore show missing-glyph boxes for system-font text; web-font text renders. The visible-or-invisible
label depends on the control, not on the glyphs, so I kept those runs. WebKit rendered no system text at all in its first run, which
made nav links look empty, so I downloaded `fonts-liberation` and `fonts-dejavu-core`, unpacked them into `root/`, re-ran WebKit,
and used only the second run (the first is kept in `out_notext_webkit/`). Also: WebKit's page process crashed on `https://deno.com/`
in both runs (`ERR webkit deno.com page.goto: Page crashed`), so WebKit has 9 pages, not 10. A WebKit crash on `htmx.org` in the
first run did not repeat in the second. Playwright's own headless Chromium 143 build downloaded to 18 MB and hung while extracting,
so Chromium 143 was not used.

### Pages

Ten public home pages, none excluded. Five were chosen before the run as likely scroll-reveal or hover-faded
(`astro.build`, `linear.app`, `zed.dev`, `deno.com`, `bun.sh`) and five as likely plain
(`htmx.org`, `go.dev`, `sqlite.org`, `vite.dev`, `tauri.app`). The measured outcome differs from my guess and is stated in
"Pages and what actually faded".

### Protocol (identical in every engine)

`run.mjs`: viewport 1280×800, `colorScheme: light`, `reducedMotion: no-preference`, `waitUntil: load` plus 2.5 s. Blur the active element, then
press Tab up to 24 times. After each Tab wait 300 ms, then read the same quantity as A8: the product of `opacity` over the element and
its ancestors, and the first ancestor with `visibility: hidden` or `content-visibility: hidden`. Verdict `FAIL` when the product is below 0.99
or a hidden ancestor exists, else `pass`. This is A8's rule unchanged. The script also records the bounding rectangle, any `clip-path` on
the chain, and the scroll position, and saves a 300×188 viewport screenshot centred on the control (`shots/<engine>__<host>__<i>.png`).
`sheet.mjs` tiles the screenshots into `sheets/<engine>__<host>.png` with a caption that holds only the stop index, plus two magenta
tick marks on the tile edges that mark the control's centre. The sheet does not show the verdict. I labelled every tile from the sheet
before reading the verdicts, then enlarged the ambiguous tiles with `zoom.mjs` (2× tiles).

Labelling rule. Invisible: in the screenshot taken 300 ms after focus arrived, the focused control cannot be seen at the marked place
and no focus indicator is visible there. Visible: the control, or its visible proxy carrying the focus ring, can be seen. A visible
control with no ring is labelled visible; that is a UX-A11Y-13 failure, and UX-A11Y-36 does not cover it.

Command output (the run logs, `log_chromium.txt`, `log_firefox.txt`, `log_webkit2.txt`):

```
chromium 159.0.8154.6
chromium astro.build stops 24 FAIL 0     chromium linear.app stops 24 FAIL 10    chromium zed.dev stops 24 FAIL 0
chromium deno.com stops 24 FAIL 1        chromium bun.sh stops 24 FAIL 0         chromium htmx.org stops 8 FAIL 0
chromium go.dev stops 24 FAIL 0          chromium sqlite.org stops 24 FAIL 0     chromium vite.dev stops 24 FAIL 3
chromium tauri.app stops 24 FAIL 0
firefox 144.0.2        (the same ten lines; FAIL counts 0, 10, 0, 1, 0, 0, 0, 0, 3, 0)
webkit 26.0
webkit astro.build stops 24 FAIL 0       webkit linear.app stops 24 FAIL 10      webkit zed.dev stops 24 FAIL 0
ERR webkit deno.com page.goto: Page crashed
webkit bun.sh stops 24 FAIL 0            webkit htmx.org stops 8 FAIL 0          webkit go.dev stops 24 FAIL 0
webkit sqlite.org stops 24 FAIL 0        webkit vite.dev stops 24 FAIL 3         webkit tauri.app stops 24 FAIL 0
```

## Result: confusion table per engine

Positive means FAIL (invisible). The table is built by `confusion.mjs` from the per-stop JSON and my labels (`node confusion.mjs`):

```
chromium: sites=10 stops=224  TP=0 FP=14 FN=2 TN=208
firefox:  sites=10 stops=224  TP=0 FP=14 FN=1 TN=209
webkit:   sites=9  stops=200  TP=0 FP=13 FN=2 TN=185
```

| Engine | Stops labelled | Invisible (hand) | Script FAIL | True positive | False fail | False pass | True pass |
|---|---|---|---|---|---|---|---|
| Chromium 159.0.8154.6 | 224 | 2 | 14 | 0 | 14 | 2 | 208 |
| Firefox 144.0.2 | 224 | 1 | 14 | 0 | 14 | 1 | 209 |
| WebKit 26.0 | 200 | 2 | 13 | 0 | 13 | 2 | 185 |

Precision on the FAIL class is 0 of 14, 0 of 14 and 0 of 13. Recall is 0 of 2, 0 of 1 and 0 of 2. The pass class is 99% correct only because
nearly every stop is a pass.

The label differs by engine on one stop, `sqlite.org#14` (the second zero-width anchor): Firefox draws a blue bar for it, so I labelled it
visible there; Chromium and WebKit draw nothing.

### Every false fail, with its selector

| Page | Stops (all three engines unless noted) | Selector | Effective opacity | Hand label | Why it is dimmed |
|---|---|---|---|---|---|
| `linear.app` | 12 to 21 | `button.Mmx1Wq_navItem` (the Pulse, Inbox, My issues, Reviews, Initiatives, Projects, Faster app launch, Agent tasks, Agent Insights, UI Refresh rows of the product mock-up) | 0.8 | visible, ring drawn | an ancestor `div` at `opacity: 0.8` (the "unfocused window" look of the mock-up) |
| `deno.com` | 13 (Chromium 0.955, Firefox 0.984; not run in WebKit) | `a.group.relative` inside `nav.fixed` (the section dot nav) | 0.955 / 0.984 | visible, ring drawn | the nav is mid-fade; the value moves between runs (0.972 in the 90-stop run) |
| `vite.dev` | 18 | `input#tab-<id>-0` (the visually hidden radio behind the `npm / Yarn / pnpm / Bun` tabs) | 0 | visible: the visible tab label carries the focus (an underline on "npm") | the input is `opacity: 0` on purpose; its label is the control |
| `vite.dev` | 22, 23 | `a.spsr-link.flex` (sponsor logos: Cloudflare, Bolt) | 0.85 | visible | the logos are drawn at 0.85 until hover |

In the first WebKit run (no fonts) `astro.build#20`, `button` "Copy to clipboard", read eff 0.553 and failed. The second WebKit run read 1 on
the same control. It was a mid-animation read at 300 ms, so one fixed 300 ms wait is not a settled measure.

### Every false pass, with its selector

| Page, engine | Stop | Selector and box | What the screenshot shows |
|---|---|---|---|
| `sqlite.org`, all three engines | 13 | `a[href="https://sqlite.org/fiddle"]` with no text, box 0×0 (Chromium 999,274; Firefox 807,285; WebKit 1005,278) | the nav list is on screen; nothing at the focus point; no ring |
| `sqlite.org`, Chromium and WebKit | 14 | the same anchor, box 0×16 or 0×17 | nothing visible; Firefox draws a bar (visible there) |

Both are an empty, zero-width link (a hidden skip or fiddle anchor). The opacity read is 1 because nothing fades; the element is simply
not painted.

## Held-out pages with fading: nothing to find in the first 24 stops, and a longer walk

Because the 24-stop walk reaches only the top of each page, the first version also ran Chromium alone for 90 stops on seven pages with the unchanged 0.99 check
(`STOPS=90 node run80.mjs chromium …`, output `out80/`). Its printed result is in "The 90-stop Chromium extension, with the script" below, with the command that
reads `out80/` (40 rows below 0.99; lowest 0, then 0.737; none between 0.01 and 0.5), and the later re-run with the new script, which found a 0.2 reading on a
visible control and so corrects the "none between 0.01 and 0.5" statement. The extension is a search for positives, not a confusion table: the stops between 25 and 90 were not hand-labelled beyond the flagged ones.

### Pages and what actually faded

| Page | Chosen as | Any chain opacity below 0.99 on a focused stop (24 or 90 walk, Chromium) |
|---|---|---|
| `astro.build` | reveal or hover | no (WebKit run 1: one transient 0.553) |
| `linear.app` | reveal or hover | yes, 0.8 and 0.737 |
| `zed.dev` | reveal or hover | no |
| `deno.com` | reveal or hover | yes, 0.94 to 0.98 |
| `bun.sh` | reveal or hover | yes, 0.94 |
| `htmx.org` | plain | no |
| `go.dev` | plain | no |
| `sqlite.org` | plain | no |
| `vite.dev` | plain | yes, 0.85 sponsor links and a 0-opacity radio |
| `tauri.app` | plain | no |

Four of the five pages chosen as reveal or hover-faded dim at least one focused control; two of five (astro, zed) showed no fade in 90
stops, so "half the pages have scroll-reveal or hover-faded containers" holds by choice but not by measurement for those two. I did not
find a page where a scroll position, not a hover, hides a focusable container. That is the ocx.sh failure from wave 2 and it did not
reproduce on any of these pages, so the opacity-0 positive class has no held-out example.

## Does any miss belong to a class the consolidation does not list?

Yes, one class, and a second near-class.

1. A focused element with a zero-width or zero-height box (sqlite anchors; zed file-tree inputs): present in all three engines, and
   the only invisible controls that occurred. UX-A11Y-36's text lists three causes (a container that a scroll position, a hover or an animation
   fades, translates or reveals). It lists neither a zero-size box nor a visually hidden control whose proxy lacks the ring.
   A8's code comment names "a zero-size clip", but only as a scope limit, and the rule's check line does not say so.
2. A visually hidden control that is correctly visible through a proxy (the vite tab radio, eff 0). It is a false fail, not a miss, and it
   means "eff 0" alone cannot be the failure condition: the proxy has to be inspected. The consolidation does not list this exemption.

A zero-size box is close to the "zero-size clip" that A8's comment lists as a scope limit, but the rule never turned it into a check.
No `clip-path` stop (the bun polygon buttons, stops 10, 14, 18, 19) was invisible, and no off-screen stop occurred, so those two
A8 scope-limit classes remain unobserved.

## What the W3C text says: which success criterion an invisible focused control fails

Fetched 2026-11-27 with `curl -sSL`, then stripped of tags. Quotes are verbatim.

- WCAG 2.2, W3C Recommendation 12 December 2024, [2.4.7 Focus Visible (Level AA)](https://www.w3.org/TR/WCAG22/#focus-visible): "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible."
- [Understanding 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), "Updated 04 October 2026": "The purpose of this success criterion is to help a person know which element has the keyboard focus." and "Authors are responsible for providing at least one mode of operation where the focus is visible." Its key term: "focus indicator: pixels that are changed to visually indicate when a user interface component is in a focused state". Its listed failures are F55 (script removes focus) and F78 (outlines and borders styled so the indicator is removed or non-visible); neither names opacity, `visibility`, a zero-size box or a scroll-revealed container.
- WCAG 2.2, [2.4.11 Focus Not Obscured (Minimum) (Level AA)](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum): "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content."
- [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), "Updated 15 June 2026": "The intent of this success criterion is to ensure that the item receiving keyboard focus is always partially visible in the user's viewport." Its examples are overlays: "Typical types of content that can overlap focused items are sticky footers, sticky headers, and non-modal dialogs." and "A notification implemented as sticky content, such as a cookie banner, will fail this success criterion if it entirely obscures a component receiving focus." It adds that a semi-transparent or dimming overlay "may separately fail 1.4.11 Non-text Contrast".

Reading. The criterion that matches the plain wording of an invisible focused control is **2.4.7**, because a ring that is not painted is not
"visible" and the user cannot "know which element has the keyboard focus". The second candidate is **2.4.11**, because the control is
"entirely hidden", but its text and examples concern content that overlaps the control, not the control's own opacity or size, and
"due to author-created content" is satisfied only by a reading that treats the control's own CSS as author-created content that hides
it. I found no W3C sentence that names a fading, an `opacity: 0` ancestor or a zero-size control as a failure of either criterion.
Calling it a 2.4.7 failure remains this catalog's reading. The wave-2 text in UX-A11Y-36 ("Calling this a 2.4.7 failure is the
reading of this catalog and of followup-q0, not W3C text") is accurate and needs one addition: 2.4.11 is the alternative
the W3C text could support, and it is weaker for opacity (not overlap).

No screen reader and no human reviewer was simulated. All "visible" and "invisible" labels are mine from screenshots.

## Live run of the proposed A8 (repair pass)

The first version of this artifact only replayed the saved JSON with thresholds chosen after seeing the data. This pass built the
script and ran it. Everything below ran on 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave3/a11y-q0/v3/`, with the same
three engines as above. The script, `focus_opacity2.mjs`, is the proposed Appendix A8 in Playwright form (the A8 on file is
puppeteer-core and Chromium only; Playwright is what starts Firefox and WebKit). It implements: the settle loop (opacity product
unchanged across two reads 150 ms apart, at most 2 s), `FAIL` below 0.5 or `visibility`/`content-visibility` hidden on the chain,
`LEAD` for a zero-width or zero-height box, `PROXY` for a radio or checkbox whose `label` has a box above 0 and a product at or above
0.99, and `INFO` for 0.5 to 0.99. Exit 1 if a `FAIL` or `LEAD` row remains. The in-page core, verbatim (the three `launch` blocks that
point at this machine's library paths are left out; they are in the scratch file):

```js
const read = () => {
  const e = document.activeElement; if (!e || e === document.body || e === document.documentElement) return null;
  const prod = (n) => { let p = 1, hid = null; for (let a = n; a; a = a.parentElement) { const s = getComputedStyle(a); p *= parseFloat(s.opacity);
    if (!hid && (s.visibility === 'hidden' || s.contentVisibility === 'hidden')) hid = a.tagName + '.' + String(a.className).slice(0, 30); } return { p, hid }; };
  const m = prod(e); const r = e.getBoundingClientRect();
  const sel = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  let proxy = false;
  if (e.tagName === 'INPUT' && /^(radio|checkbox)$/.test(e.type)) {
    const ls = [...(e.labels || [])]; for (const l of ls) { const lr = l.getBoundingClientRect(), lm = prod(l); if (lr.width > 0 && lr.height > 0 && lm.p >= 0.99 && !lm.hid) proxy = true; } }
  return { sel, txt: (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24), p: +m.p.toFixed(3), hid: m.hid,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], proxy };
};
// per stop, after page.keyboard.press('Tab'):
let o = await p.evaluate(read), t = 0;
for (t = 0; o && t < 2000; t += 150) { await p.waitForTimeout(150); const o2 = await p.evaluate(read); if (!o2) break; const same = o2.p === o.p; o = o2; if (same) break; }
const fail = o.p < 0.5 || o.hid, lead = o.rect[2] === 0 || o.rect[3] === 0;
if (fail || lead) v = o.proxy ? 'PROXY' : fail ? 'FAIL' : 'LEAD'; else if (o.p < 0.99) v = 'INFO'; else v = 'pass';
```

### Fixture run (the two new fixture lines, plus a scroll-linked and a transition fixture)

`opacity.html` is the A8 fixture O1 to O5 plus: O6 an empty `<a href="#"></a>` (expect `LEAD`); O7 `<label><input type="radio" class="rd">…</label>`
with `.rd{opacity:0;position:absolute}` (expect `PROXY`); O8 a button under `opacity:.8` (expect `INFO`); O9 a checkbox at `width:0;height:0;opacity:0`
inside a visible label (expect `PROXY`); O10 the same radio inside an `opacity:0` container, so the label is faded too (expect `FAIL`). Command and
output, `ENGINE=<e> node focus_opacity2.mjs file://$PWD/v3/opacity.html` (printed as written; stop index is the Tab stop, O4 is inert and not a stop):

```
chromium 159.0.8154.6:  FAIL #1 button "O2 in opacity-0 containe" p=0 | LEAD #4 a "" p=1 rect=94x84x0x16 | PROXY #5 input.rd p=0 rect=99x87x13x13
                        INFO #6 button "O8 dimmed to 0.8" p=0.8 | PROXY #7 input.z p=0 rect=12x125x0x0 | FAIL #8 input.rd p=0 rect=13x141x13x13
                        summary stops 9 {"FAIL":2,"LEAD":1,"PROXY":2,"INFO":1}   exit 1
firefox 144.0.2:        the same six rows, same summary, exit 1 (LEAD rect=144x89x0x17)
webkit 26.0:            the same six rows, same summary, exit 1 (LEAD rect=99x120x0x17)
```

All six expected rows appeared in all three engines. O1, O3 (`:focus-within` fix) and O5 passed. One fixture slip, kept on record: the first
run gave O10 the radio group name of O7, and Chromium and Firefox skip the second radio of a group in the Tab order, so O10 was not a stop there
(WebKit did stop on it). Renaming the group fixed it. The fixture needs distinct radio names.

`scroll.html` (synthetic, labelled as such): S2 is a container whose opacity a `scroll` listener sets from `scrollY` (0 until 2000 px), the
mechanism of the wave-2 ocx.sh finale; S3 is the same container with `:focus-within{opacity:1}`; S4 fades 0.2 to 1 over 1 s on focus; S5 fades 0 to 1
over 0.15 s on focus. Output, all three engines identical in verdict (`settle_run.txt`):

```
$ ENGINE=chromium node focus_opacity2.mjs file://$PWD/v3/scroll.html        (firefox, webkit: same rows)
FAIL chromium file #1 button "S2 scroll-linked opacity" p=0 rect=0x319x286x19 settle_ms=0
summary chromium file stops 5 {"FAIL":1,"LEAD":0,"PROXY":0,"INFO":0}        exit 1   (S3, S4, S5 pass)
$ NOSETTLE=1 ENGINE=chromium node focus_opacity2.mjs file://$PWD/v3/scroll.html   (a single 300 ms read, the old behaviour)
FAIL chromium file #3 button "S4 fades from 0.2 to 1 o" p=0.44 rect=0x390x370x19 settle_ms=300     (firefox 0.441, webkit 0.446)
```

So the settle loop does what it was proposed for: with one 300 ms read, S4 is a false FAIL at 0.44 in all three engines; with the loop it
passes. The scroll-linked opacity-0 container is found by the 0.5 threshold in all three engines. This is a synthetic positive, not a held-out page.

### Live run on the ten held-out pages, 24 stops, three engines

Command: `ALL=1 ENGINE=<e> W3=$PWD STOPS=24 SHOTS=$PWD/v3/shots2 node v3/focus_opacity2.mjs <the ten urls>` (`v3/run_all.sh all 24`, logs
`all_<engine>.txt`). Every non-pass row of the first live run (`live_<engine>.txt`) and of the second (`all_<engine>.txt`) is identical, so the
script is repeatable on these pages. Non-pass rows, as printed (Chromium; Firefox and WebKit show the same rows with their own rects):

```
INFO linear.app #12..#21 button.Mmx1Wq_navItem "Pulse" … "UI Refresh" p=0.8 settle_ms=0   (10 rows)
LEAD sqlite.org #0  a "" p=1 rect=210x0x0x0          LEAD sqlite.org #13 a "" p=1 rect=999x274x0x0       LEAD sqlite.org #14 a "" p=1 rect=999x274x0x16
PROXY vite.dev #18 input#tab-92kc4-0 "" p=0 rect=69x594x13x13        INFO vite.dev #22 a.spsr-link.flex "Cloudflare" p=0.85   INFO vite.dev #23 "Bolt" p=0.85
rows needing triage (FAIL+LEAD): 3          exit=1       (deno.com #13 did not print: with the settle loop it read at or above 0.99)
```

Confusion table. Labels are the hand labels of the first run (invisible: `sqlite.org#13` and `#14` in Chromium and WebKit, `#13` only in Firefox,
which draws a bar for `#14`). A live stop inherits a label only when host, index and selector equal the labelled run's stop; all but one did (`node v3/confusion2.mjs`):

```
chromium matched_stops=223 {"nofl_vis":220,"flag_vis":1,"flag_inv":2} unmatched=1 vite.dev#18 input#tab-nsk1wr-0   flagged-but-visible: LEAD sqlite.org#0   missed-invisible: -
firefox  matched_stops=223 {"nofl_vis":220,"flag_vis":2,"flag_inv":1} unmatched=1 vite.dev#18 input#tab-hlqnq-0   flagged-but-visible: LEAD sqlite.org#0; LEAD sqlite.org#14   missed-invisible: -
webkit   matched_stops=199 {"nofl_vis":196,"flag_vis":1,"flag_inv":2} unmatched=1 vite.dev#18 input#tab-mt72jp-0   flagged-but-visible: LEAD sqlite.org#0   missed-invisible: -
```

The unmatched stop in each engine is the vite tab radio, whose `id` is random per load; it printed `PROXY`, was hand-labelled visible (the label carries
the focus underline), and counts as a true pass. Totals, with flagged meaning `FAIL` or `LEAD`:

| Engine | Stops | Invisible (hand) | Flagged | True positive | False positive | False negative | True negative |
|---|---|---|---|---|---|---|---|
| Chromium 159.0.8154.6 | 224 | 2 | 3 | 2 | 1 (`sqlite.org#0`, a logo anchor with a ring, box 0×0) | 0 | 221 |
| Firefox 144.0.2 | 224 | 1 | 3 | 1 | 2 (`sqlite.org#0`; `#14`, the bar) | 0 | 221 |
| WebKit 26.0 | 200 | 2 | 3 | 2 | 1 (`sqlite.org#0`) | 0 | 197 |

Against the unchanged 0.99 check (14, 14 and 13 false fails, 0 true positives) this is 3 flagged stops per engine, every invisible stop found.
What this does and does not show: it is the same ten pages and the same hand labels as the finding that motivated the change, and the 0.5 and
zero-size choices were made after seeing those pages, so this is a regression check of the script, not an independent validation. The one
`FAIL` that a different page produced is in the next section, and it is a false positive.

### The 90-stop Chromium extension, with the script

Command: `ALL=1 ENGINE=chromium STOPS=90 node v3/focus_opacity2.mjs https://astro.build/ https://linear.app/ https://zed.dev/ https://deno.com/ https://bun.sh/ https://tauri.app/ https://vite.dev/`
(`ext_chromium.txt`). Summary lines as printed:

```
summary chromium astro.build stops 90 {"FAIL":0,"LEAD":0,"PROXY":0,"INFO":0}
summary chromium linear.app stops 90 {"FAIL":1,"LEAD":0,"PROXY":0,"INFO":10}
summary chromium zed.dev stops 90 {"FAIL":0,"LEAD":9,"PROXY":0,"INFO":0}
summary chromium deno.com stops 90 {"FAIL":0,"LEAD":0,"PROXY":0,"INFO":5}
summary chromium bun.sh stops 90 {"FAIL":0,"LEAD":0,"PROXY":0,"INFO":0}
summary chromium tauri.app stops 90 {"FAIL":0,"LEAD":0,"PROXY":0,"INFO":0}
summary chromium vite.dev stops 59 {"FAIL":0,"LEAD":0,"PROXY":1,"INFO":19}      rows needing triage (FAIL+LEAD): 10
```

The one `FAIL`: `FAIL chromium linear.app #24 button.qM9FAa_sendButton "Send message" p=0.2 rect=401x424x32x28 settle_ms=0`. I looked at the crop
(`shots2/chromium__linear.app__24__FAIL.png`): the button and its focus ring are drawn and readable, so it is **visible**, a false `FAIL` at 0.2, and it
corrects the first version's statement that no visible control sat between 0.01 and 0.5. The product moves with the page's scripted demo: a probe
(`v3/probe_linear.mjs`) that Tabbed to the same button read an ancestor `div.qM9FAa_sendButtonGroup` at `op=0.905556` at focus, `0.999998` 500 ms later and none after
1.5 s; the old run read 0.737; this run held 0.2 across two reads 150 ms apart. A settle loop does not defeat a demo animation that holds a plateau, and a 0.5
threshold cannot either. The crop review is therefore not optional in the rule (UX-A11Y-36 text below says so).

The old 90-stop run's figures, which the first version stated without output, with the command and what it printed (`out80/*.json`, the 300 ms single read of the first version):

```
$ node -e '…reads out80/*.json, collects stops with eff<0.99 or hidden, sorts by eff…'
rows with eff<0.99 in out80 (old run, 300 ms single read): 40
lowest 6:
0       vite.dev        18      input#tab-yg1cib-0
0.737   linear.app      24      button.qM9FAa_sendButton
0.8     linear.app      12      button.Mmx1Wq_navItem  (… 13, 14, 15 the same)
count with 0.01<eff<0.5: 0
{"vite.dev":20,"linear.app":11,"deno.com":6,"bun.sh":3}
```

The `deno.com` values 0.94 to 0.98 are in the new log: `INFO deno.com #85 … p=0.977`, `#86 0.978`, `#87 0.977`, `#88 0.939`, `#89 0.939`
(list items `a.block.py-1`). The `bun.sh` 0.94 values of the old run did not recur (0 rows now).

### The nine `zed.dev` file-tree inputs in all three engines

The first version said these were measured "in all three engines" while the text elsewhere said Chromium only. They are now measured in all three,
by the same script, `STOPS=90` in Chromium and `STOPS=60` in Firefox and WebKit on `https://zed.dev/` (`ext_chromium.txt`, `ext_firefox_zed.txt`, `ext_webkit_zed.txt`):

```
chromium: LEAD #29 #31 #33 #35 #37 #39 #41 #43 #45  input.size-3!.[all:unset] "" p=1 rect=591x293x0x0 … 591x427x0x0      (9 rows, no other LEAD)
webkit:   LEAD #29 #31 #33 #35 #37 #39 #41 #43 #45  input.size-3!.[all:unset] "" p=1 rect=588x292x0x0 … 588x421x0x0      (9 rows)
firefox:  LEAD #25 div.size-full.outline-none rect=80x241x360x0 ; #28 div.flex.min-w-0 rect=441x241x158x0 ; #30 #32 … #46 input.size-3!.[all:unset] rect=591x241x0x0   (11 rows: 9 inputs plus 2 zero-height divs)
```

Hand labels, after the flag (not blind this time): the three Chromium crops I opened one at a time (`#29`, `#31`, `#45`, 300×188) show the file list with square
checkboxes on the right and no ring or change at the focus point: invisible. The other six Chromium, all nine WebKit and the nine Firefox input crops I looked at
on one contact sheet (`v3/sheet_zed.png`, 290 px tiles, no caption legible because the machine has no fonts, tile order = sorted file name) and none shows a ring at the
marked point; that is a weaker look and is labelled so. The two Firefox zero-height divs (`#25` the code editor with `outline-none`, `#28`) show no ring either; they are a Firefox-only
layout result (the same elements have height in Chromium and WebKit). Firefox also lays the inputs out at a constant `591,241` while the page scrolls, so its crops show an
unrelated part of the page, which is itself a symptom: the focus target is not where the control appears. Axe corroborates the class on Chromium
(`node v3/axe_zed.mjs`, axe-core 4.14.1): its `label` rule lists 9 `input[type=checkbox].size-3!` nodes and `button-name` lists 10 buttons.

## Effect on the ruleset

Every edit below carries the check that an agent runs, and the output it printed on 2026-11-27.

**UX-A11Y-36: confirm the MUST, change the verification.** The rule text (never leave a focused control faded, translated or revealed) stays: the held-out round has no
opacity-0 page against it, the wave-2 ocx.sh measurement stands, and the synthetic scroll fixture is caught in three engines. Replace the paragraph that starts
`*Verify (built, in a browser):*` with:

> *Verify (built, in a browser):* run the Appendix A8 script (`ENGINE=<chromium|firefox|webkit> node focus_opacity2.mjs <url> …`, Playwright form) at 1280 and 390 px, light and dark, and again with `MOTION=reduce`. After each Tab it waits for the opacity product to be unchanged across two reads 150 ms apart, up to 2 s. It prints `FAIL` when the product is below 0.5 or `visibility: hidden` or `content-visibility: hidden` is on the chain, `LEAD` when the box is zero-width or zero-height, `PROXY` for a radio or checkbox that would fail but whose `label` has a box and a product at or above 0.99, and `INFO` for 0.5 to 0.99. It is a lead generator, not a gate: on ten held-out pages the old 0.99 check flagged 13 to 14 visible controls per engine and missed the invisible ones, and the current check still raises one false `FAIL` (a visible control inside a scripted demo animation, `linear.app` at 0.2). The pass condition is the triaged end state: every `FAIL` and `LEAD` row has a screenshot crop taken at the moment of focus (`SHOTS=<dir>`) that the author has looked at, and each is fixed or recorded visible with the reason. A `PROXY` row needs no action; an `INFO` row needs a look only if the crop shows no ring.

Verification of this edit: the fixture `opacity.html` (A8 O1 to O5 plus O6 to O10) prints the six rows above in Chromium, Firefox and WebKit and exits 1; `scroll.html` prints one `FAIL` (S2) and passes S3 to S5;
`NOSETTLE=1` on the same file prints a false `FAIL` at p=0.44 for S4, which the settle loop removes. All run on 2026-11-27, outputs above.

**Appendix A8: replace.** Replace the script with `focus_opacity2.mjs` (core above; the Playwright launch blocks are environment glue), replace the fixture with `opacity.html`, and add `scroll.html`. Expected
fixture result, run in this pass: `FAIL` O2, O10; `LEAD` O6; `PROXY` O7, O9; `INFO` O8; O1, O3, O5 pass; O4 not a stop; exit 1. The A8 line in the check-script table (O1 to O5) becomes O1 to O10.
Note: the A8 on file is puppeteer-core; the Playwright form is what ran in Firefox and WebKit, and the Chromium result in this pass came from Playwright's Chromium launch with the same Chrome for Testing 159 binary.

**UX-A11Y-13: confirm, add a pointer.** Its "Resolve it with two reads" step already says a zero-pixel stop is a lead. Add to the end of the second read: "A box of zero width or height on a focused element is a third cause of a 0-pixel diff. Read the crop (sqlite.org#13, zed.dev#29)."
Verification: `ENGINE=chromium node focus_opacity2.mjs https://sqlite.org/` prints `LEAD chromium sqlite.org #13 a "" p=1 rect=999x274x0x0` and `LEAD … #14`; on `https://zed.dev/` with `STOPS=90` it prints nine `LEAD … input.size-3!.[all:unset]` rows (outputs above).

**UX-A11Y-04 (icon-only control names): a note, not a change, now with a check.** The sqlite miss, `a[href=…/fiddle]` with empty text and a zero box, is also an empty link that axe flags. Verification of the overlap, run in this pass
(`node v3/axe_sqlite.mjs <axe-core 4.14.1 dir>`, `runOnly: ['link-name','button-name','label']`): axe prints one violation, `link-name`, on exactly two nodes, `a[href$="fiddle"]` with text `\n` and `a[href$="fiddle"]` with text ` `, which are the two anchors the script raised as `LEAD #13` and `#14`. On `zed.dev` axe's `label` rule lists the nine unlabelled `input[type=checkbox].size-3!` nodes that the script raised as `LEAD`. So the naming rule UX-A11Y-04 and the box rule UX-A11Y-37 see the same elements for these cases; fixing the name does not fix the missing ring, and fixing the box does not name the control. No text change.

**NEW rule: UX-A11Y-37 (SHOULD).** *A focusable element has a non-zero box, or a visible proxy that shows focus.* Never leave a focusable `a`, `button`, `input` or `div[tabindex]` at zero width or zero height (an empty hidden anchor, a hidden checkbox whose custom box draws no ring).
Remove it from the Tab order with `hidden`, `inert` or `tabindex="-1"` plus `aria-hidden`, or give its proxy a focus ring through `:has(input:focus-visible)` or a sibling selector.
*Why:* 2.4.7 (AA): a focus indicator that cannot be seen is not visible (reading of this catalog; see "What the W3C text says").
*Evidence (corrected):* the empty `a[href=…/fiddle]` on `sqlite.org` (999×274, 0×0 and 0×16) appeared as `LEAD` in Chromium, Firefox and WebKit, hand-labelled invisible in all three for `#13` and in Chromium and WebKit for `#14` (Firefox draws a bar for `#14`), in the 24-stop live run and the first run. The nine `zed.dev` file-tree inputs (`input.size-3!.[all:unset]`, 0×0) appeared as `LEAD` in all three engines in this pass (Chromium and WebKit 9 each, Firefox 9 plus 2 zero-height divs); the first version had them from Chromium only. Labelling: three Chromium crops opened one by one, the rest on a low-resolution sheet, none showing a ring; the first version labelled 2 of the 9 Chromium rows. All 24-stop hand labels except `sqlite.org#0` agree with the flags; `sqlite.org#0` (a logo anchor with a ring and a 0×0 box) is a visible `LEAD`, so the box check carries false positives.
*Severity:* SHOULD, not MUST, because the W3C text does not name the case and the box check has that false positive.
*Verify:* `ENGINE=<e> SHOTS=<dir> node focus_opacity2.mjs <url>` prints no `LEAD` row, or every `LEAD` row has a looked-at crop and is fixed or recorded visible. Run on `https://sqlite.org/`: three `LEAD` rows in each engine, exit 1 (output above). The fixture `opacity.html` prints `LEAD` for `O6` and `PROXY` for `O9` in all three engines.

**Verdict item 14 (wave-2 gaps on record): change one bullet.** Replace "Visibility of focus (UX-A11Y-36). It was measured in headless Chrome only, with no Firefox, no Safari, no real device and no real assistive technology." with: "Visibility of focus (UX-A11Y-36). The 0.99 opacity check was run in Chromium 159.0.8154.6, Firefox 144.0.2 and WebKit 26.0 (Playwright WPE build, not Safari) on ten held-out pages (followup-w3-q0): 0 true positives, 13 to 14 false fails per engine, and the invisible controls found were zero-size boxes. The replacement check (0.5 threshold, settle loop, `LEAD`, `PROXY`) was then built and run on the same pages and on three fixtures: 3 flagged stops per engine, every invisible stop found, one false positive per engine and two in Firefox, and one false `FAIL` on a different page (`linear.app`, 0.2, a demo animation). It has not been validated on pages it was not tuned on. No real device, no Safari, no real assistive technology."
Question 9 in "Open questions" (hold outside headless Chrome) is answered for the three engines and for ten pages, not for every page of ocx.sh; the ocx.sh pages other than `index.html` and the OS-level smooth-scroll part of question 9 stay open.
Verification of the replacement text: every number in it is a line above; an agent checks it with `grep -E "^(summary|rows needing)" v3/all_chromium.txt v3/ext_chromium.txt` (FAIL 0 and LEAD 3 on the first, FAIL 1 on `linear.app` in the second) and `node v3/confusion2.mjs` (the three confusion lines above). After the edit, `grep -n "headless Chrome only" ux-a11y-authoring.md` must print nothing.

**UX-A11Y-27 (reduced motion): confirm.** Not touched. No held-out page was run with `MOTION=reduce`.

## Dated facts

- 2026-11-27: engines and versions, measured by `b.version()`: Chromium 159.0.8154.6, Firefox 144.0.2, WebKit 26.0.
- 2026-11-27: Playwright 1.57.0 from the npm registry, `https://registry.npmjs.org/playwright/1.57.0` (HTTP 200, `date: Fri, 27 Nov 2026 14:58:19 GMT`). Its browser pins, `https://raw.githubusercontent.com/microsoft/playwright/v1.57.0/packages/playwright-core/browsers.json` (fetched 2026-11-27): `chromium-headless-shell` revision 1200 = 143.0.7499.4, `firefox` 1497 = 144.0.2, `webkit` 2227. Vendor tooling, not a platform fact. Setup guide: `https://playwright.dev/docs/browsers` (HTTP 200, 2026-11-27).
- 2026-11-27: Chromium 159.0.8154.6 does not come from Playwright 1.57.0. It is `chrome-headless-shell` from the Playwright cache of an earlier wave (`~/.cache/ms-playwright/chromium_headless_shell-1255`, `INSTALLATION_COMPLETE` written 2026-11-27 13:19 local). The mapping revision 1255 = 159.0.8154.6 is in `https://raw.githubusercontent.com/microsoft/playwright/v1.65.1/packages/playwright-core/browsers.json` (fetched 2026-11-27; v1.65.0 maps 1254 to 158.0.8127.18); npm `latest` for `playwright` was 1.65.1 that day (`https://registry.npmjs.org/playwright`).
- 2026-11-27: download host. `install.log` records `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1200/chromium-linux.zip` (164.7 MiB; the download finished and extraction failed, so Chromium 143 was not used). Firefox 1497 and WebKit 2227 were taken from the same host under `…/builds/firefox/1497/firefox-ubuntu-24.04.zip` and `…/builds/webkit/2227/webkit-ubuntu-24.04.zip`, which each still answer HTTP 307 on 2026-11-27 14:58 GMT. The zips are in `dl/`.
- 2026-11-27: WCAG 2.2, W3C Recommendation 12 December 2024 (https://www.w3.org/TR/WCAG22/), SC 2.4.7 and 2.4.11 text quoted above.
- 2026-11-27: Understanding 2.4.7 "Updated 04 October 2026" (https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html). Understanding 2.4.11 "Updated 15 June 2026" (https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html). Understanding 2.4.3 "Updated 04 October 2026" was fetched and read: it says nothing about an invisible focused control.
- 2026-11-27: page loads. `https://astro.build/`, `https://linear.app/`, `https://zed.dev/`, `https://deno.com/`, `https://bun.sh/`, `https://htmx.org/`, `https://go.dev/`, `https://sqlite.org/`, `https://vite.dev/`, `https://tauri.app/` each loaded in each engine, in the first run, in the live run, in the second live run and, for seven, in the 90-stop run. Pages change daily; the selectors and opacities are of that day. `deno.com#13` read 0.955, 0.984 and 0.972 in three single-read runs and did not appear with the settle loop; `linear.app` "Send message" read 0.737, 0.2 and 0.9 to 1.0 in three runs.
- 2026-11-27: axe-core 4.14.1 (a local copy in a previous wave's scratch tree) run on `https://sqlite.org/` and `https://zed.dev/`.

## What could not be determined

- Whether the replacement check separates pass from fail on pages it was not tuned on. The 0.5 threshold, the `LEAD` class and `PROXY` were chosen after seeing these ten pages, and the live run reuses them and the same hand labels. A second held-out set of at least eight new pages, labelled before the script's verdicts are read, is missing.
- A held-out page with a scroll-revealed opacity-0 container (the ocx.sh class). None of the ten pages produced one. The only positive for the 0.5 threshold is the wave-2 ocx.sh reading (not re-run here, because the built site was not kept and rebuilding it needs the read-only fleet) and the synthetic `scroll.html`. The built ocx.sh `index.html` is excluded as a wave-2 page anyway.
- Visible controls inside scripted demo animations (`linear.app` "Send message", 0.2). The settle loop does not defeat a plateau. Whether any rule can separate them from a true opacity-0 reveal without a screenshot is not known; the crop review is the answer in the rule.
- WebKit on `deno.com`: the page process crashed on load in both first-run attempts and in the live run (`ERROR webkit deno.com page.goto: Page crashed`). The cause could be the page, the software-rendering setup or the missing libraries. This is a gap, not a result.
- Safari itself and real devices. Playwright's WebKit is a Linux WPE port. Real Safari behaviour needs macOS or iOS, which this machine lacks.
- Labels. All labels are one person's reading of 300×188 crops, with missing-glyph boxes in Chromium and Firefox. No second reader. Six of nine Chromium `zed.dev` crops, all nine WebKit and the nine Firefox input crops were read on a low-resolution contact sheet whose captions cannot be read. A visible-by-small-shape control without a ring (`zed.dev#15`, a 10×10 `outline-none` button) was labelled visible; a stricter reader could change some true passes into false passes.
- The stops between 25 and 90 in the extended run are not hand-labelled, except the flagged ones. The confusion table covers the first 24 stops per page (8 on `htmx.org`).
- Not run: `MOTION=reduce`, 390 px width, dark theme on the held-out pages. Only 1280×800 light, default motion. The rule text asks for them; this pass did not test them.
- Missing at the source: the W3C pages do not say whether an opacity-0 or zero-size focused control fails 2.4.7 or 2.4.11. Only a Working Group interpretation or a failure technique would settle it, and none was found in the pages fetched.

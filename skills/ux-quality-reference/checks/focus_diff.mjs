// UX-A11Y-13 lead generator: does the focus indicator change pixels, and does its ring reach 3:1?
// Pinned versions: Node >= 20, playwright 1.57.0 (npm i -D --save-exact playwright@1.57.0, then
// npx playwright install <engine>). The script prints the Playwright and engine versions it ran with.
// Usage: [ENGINE=chromium|firefox|webkit] [BROWSER=<executable>] [PAD=40] [MAXSTOPS=80]
//        node focus_diff.mjs <url> <light|dark> <width> ['<regex on tag.class|text>']
// Tabs through the page. For each stop whose "tag.class|text" key matches the regex (default: all), it screenshots a
// PAD-pixel frame around the focused element, blurs it, screenshots again, and prints the number of changed pixels
// (summed channel difference over 30), the computed outline, and the ring contrast against the surface the ring sits on:
// the element's own background when outline-offset is negative, the parent background otherwise (WCAG 1.4.11).
// Rows: ZERO  0 pixels changed. A lead, not a verdict. Read the computed style (outline none, no box-shadow, no border
//             change means a missing ring), then run focus_opacity.mjs (a faded or zero-size stop also diffs to 0).
//       LOW   a drawn ring under 3.0 against its surface, compared unrounded
//       ok    pixels changed and the ring, if drawn, reaches 3.0
// Exit 0 = no ZERO or LOW row, 1 = at least one, 2 = the page failed to load.
// The clip is in page coordinates (rect + scroll), never viewport coordinates, which photograph the wrong region.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}
const { chromium, firefox, webkit } = await import('playwright');
const [, , url, theme, vw, pred = '.'] = process.argv;
const eng = process.env.ENGINE || 'chromium';
if (!url || !['light', 'dark'].includes(theme) || !+vw || !{ chromium, firefox, webkit }[eng]) {
  console.error("usage: node focus_diff.mjs <url> <light|dark> <width> ['<regex>']   (ENGINE=chromium|firefox|webkit)"); process.exit(2);
}
const PAD = +(process.env.PAD || 10), MAXSTOPS = +(process.env.MAXSTOPS || 80);
let pwVersion = 'unknown'; try { pwVersion = createRequire(import.meta.url)('playwright/package.json').version; } catch (e) {}
const b = await ({ chromium, firefox, webkit })[eng].launch(process.env.BROWSER ? { executablePath: process.env.BROWSER } : {});
console.log('playwright', pwVersion, 'engine', eng, b.version());
const ctx = await b.newContext({ viewport: { width: +vw, height: 800 }, colorScheme: theme });
await ctx.addInitScript((t) => { try { localStorage.setItem('starlight-theme', t); localStorage.setItem('theme', t); } catch (e) {} }, theme);
const p = await ctx.newPage();
try { await p.goto(url, { waitUntil: 'load', timeout: 45000 }); await p.waitForTimeout(1500); }
catch (e) { console.log('ERROR', theme, vw, url, String(e.message).split('\n')[0]); await b.close(); process.exit(2); }
await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
await p.mouse.click(1, 1);
const probe = (pred) => {
  const e = document.activeElement; if (!e || e === document.body) return null;
  const key = e.tagName.toLowerCase() + '.' + (e.className || '').toString() + '|' + e.textContent.trim().slice(0, 20);
  const r = e.getBoundingClientRect();
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = ([x, y, z]) => 0.2126 * lin(x) + 0.7152 * lin(y) + 0.0722 * lin(z);
  const ratio = (a, c) => { const x = L(a), y = L(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (f, g) => [0, 1, 2].map((i) => f[i] * f[3] + g[i] * (1 - f[3]));
  const bgOf = (el) => { const st = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) st.push(c); if (c[3] >= 1) break; }
    let g = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? [0, 0, 0] : [255, 255, 255];
    for (let i = st.length - 1; i >= 0; i--) g = over(st[i], g); return g; };
  const s = getComputedStyle(e), ow = parseFloat(s.outlineWidth), oo = parseFloat(s.outlineOffset), drawn = s.outlineStyle !== 'none' && ow > 0;
  let ring = null, against = null;
  if (drawn) { const oc = rgba(s.outlineColor), ground = oo < 0 ? bgOf(e) : bgOf(e.parentElement || e); against = oo < 0 ? 'own' : 'parent'; ring = +ratio(over(oc, ground), ground).toFixed(3); }
  return { key, match: new RegExp(pred).test(key), rect: [r.x + scrollX, r.y + scrollY, r.width, r.height],
    outline: drawn ? `${ow}px ${s.outlineStyle} offset ${oo}` : 'none', boxShadow: s.boxShadow === 'none' ? null : s.boxShadow.slice(0, 60), ring, against };
};
const diff = async ([a, c]) => {
  const ld = async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, cv.width, cv.height).data; };
  const A = await ld(a), B = await ld(c); let n = 0;
  for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 30) n++;
  return { changed: n, total: A.length / 4 };
};
const seen = new Set(); let bad = 0;
for (let i = 0; i < MAXSTOPS; i++) {
  await p.keyboard.press('Tab');
  const info = await p.evaluate(probe, pred);
  if (!info) break;
  if (seen.has(info.key + info.rect.join())) break;
  seen.add(info.key + info.rect.join());
  if (!info.match) continue;
  const [x, y, w, h] = info.rect;
  const clip = { x: Math.max(0, x - PAD), y: Math.max(0, y - PAD), width: Math.max(1, Math.min(w + 2 * PAD, 1250)), height: Math.max(1, Math.min(h + 2 * PAD, 700)) };
  const shot = async () => (await p.screenshot({ clip, fullPage: true })).toString('base64');
  const f = await shot();
  const handle = await p.evaluateHandle(() => document.activeElement);
  await p.evaluate(() => document.activeElement.blur());
  const u = await shot();
  await handle.evaluate((e) => e.focus({ preventScroll: true }));
  const res = await p.evaluate(diff, [f, u]);
  const low = info.ring !== null && info.ring < 3;
  const verdict = res.changed === 0 ? 'ZERO' : low ? 'LOW' : 'ok';
  if (verdict !== 'ok') bad++;
  console.log(verdict, theme, vw, '#' + i, info.key.slice(0, 60), JSON.stringify({ changed: res.changed, outline: info.outline, ring: info.ring, against: info.against, boxShadow: info.boxShadow }));
}
await b.close();
console.log('rows needing a read (ZERO+LOW):', bad);
process.exit(bad ? 1 : 0);

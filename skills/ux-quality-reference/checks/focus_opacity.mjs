// UX-A11Y-36 and UX-A11Y-37 lead generator: is the focused control visible when focus arrives?
// Pinned versions: Node >= 20, playwright 1.57.0 (npm i -D --save-exact playwright@1.57.0, then
// npx playwright install <engine>). The script prints the Playwright and engine versions it ran with.
// Usage: ENGINE=chromium|firefox|webkit [BROWSER=<executable>] [THEMES=light,dark] [WIDTHS=1280,390]
//        [MOTION=reduce] [STOPS=120] [SHOTS=<dir>] node focus_opacity.mjs <url> [<url> ...]
// Rows: FAIL  effective opacity (product over the element and its ancestors) < 0.5, or visibility/content-visibility hidden on the chain
//       LEAD  the focused box is zero-width or zero-height (UX-A11Y-37)
//       PROXY a radio or checkbox that would be FAIL or LEAD, but one of its labels has a box > 0 and a product >= 0.99
//       INFO  0.5 <= product < 0.99 (a design-time dim; open the crop only if it shows no ring)
// After each Tab the product is read until two reads 150 ms apart agree, at most 2 s (NOSETTLE=1: one 300 ms read).
// Exit 0 = no FAIL or LEAD row, 1 = at least one, 2 = a page failed to load. The rows are leads, not a verdict:
// open the crop of every FAIL and LEAD row (SHOTS) and fix the stop or record it as visible.
// shortcut: clip-path and off-screen positions are not read, and a scripted demo that holds a low plateau prints a false FAIL;
// the crop review in UX-A11Y-36 is the answer until a pixel check replaces it.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}
const { chromium, firefox, webkit } = await import('playwright');
const eng = process.env.ENGINE || 'chromium';
const list = (k, d) => (process.env[k] || d).split(',');
const STOPS = +(process.env.STOPS || 120), SHOTS = process.env.SHOTS;
if (!{ chromium, firefox, webkit }[eng]) { console.error('ENGINE must be chromium, firefox or webkit'); process.exit(2); }
let pwVersion = 'unknown'; try { pwVersion = createRequire(import.meta.url)('playwright/package.json').version; } catch (e) {}
const b = await ({ chromium, firefox, webkit })[eng].launch(process.env.BROWSER ? { executablePath: process.env.BROWSER } : {});
console.log('playwright', pwVersion, 'engine', eng, b.version());
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
let bad = 0, errs = 0;
if (!process.argv[2]) { console.error('usage: node focus_opacity.mjs <url> [<url> ...]'); process.exit(2); }
for (const url of process.argv.slice(2)) for (const theme of list('THEMES', 'light,dark')) for (const vw of list('WIDTHS', '1280,390').map(Number)) {
  const host = new URL(url).host || 'file', vh = 800, tag = `${eng} ${theme} ${vw} ${host}`;
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, colorScheme: theme, reducedMotion: process.env.MOTION === 'reduce' ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('starlight-theme', t); localStorage.setItem('theme', t); } catch (e) {} }, theme);
  const p = await ctx.newPage();
  try { await p.goto(url, { waitUntil: 'load', timeout: 45000 }); await p.waitForTimeout(2500); }
  catch (e) { errs++; console.log('ERROR', tag, String(e.message).split('\n')[0]); await ctx.close(); continue; }
  await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  let n = 0; const counts = { FAIL: 0, LEAD: 0, PROXY: 0, INFO: 0 };
  for (let i = 0; i < STOPS; i++) {
    await p.keyboard.press('Tab');
    let o = await p.evaluate(read), t = 0;
    for (t = 0; o && t < (process.env.NOSETTLE ? 300 : 2000); t += 150) { await p.waitForTimeout(150); const o2 = await p.evaluate(read); if (!o2) break; const same = o2.p === o.p; o = o2; if (same && !process.env.NOSETTLE) break; }
    if (!o) break;
    const seen = await p.evaluate(() => { const e = document.activeElement; if (e.__fo) return true; e.__fo = 1; return false; });
    if (seen) break; n++; // back at a stop already seen: the Tab order wrapped
    let v = 'pass';
    const fail = o.p < 0.5 || o.hid, lead = o.rect[2] === 0 || o.rect[3] === 0;
    if (fail || lead) v = o.proxy ? 'PROXY' : fail ? 'FAIL' : 'LEAD'; else if (o.p < 0.99) v = 'INFO';
    if (v === 'pass') continue;
    counts[v]++; if (v === 'FAIL' || v === 'LEAD') bad++;
    console.log(v, tag, '#' + i, o.sel.slice(0, 40), JSON.stringify(o.txt), 'p=' + o.p, 'rect=' + o.rect.join('x'), 'settle_ms=' + t, o.hid ? 'hidden=' + o.hid : '');
    if (SHOTS) { const [x, y, w, h] = o.rect; const cx = Math.max(150, Math.min(vw - 150, Math.round(x + w / 2))), cy = Math.max(94, Math.min(vh - 94, Math.round(y + h / 2)));
      try { await p.screenshot({ path: `${SHOTS}/${eng}__${theme}__${vw}__${host}__${i}__${v}.png`, clip: { x: cx - 150, y: cy - 94, width: 300, height: 188 } }); } catch (e) {} }
  }
  console.log('summary', tag, 'stops', n, JSON.stringify(counts));
  await ctx.close();
}
await b.close();
console.log('rows needing triage (FAIL+LEAD):', bad);
process.exit(errs ? 2 : bad ? 1 : 0);

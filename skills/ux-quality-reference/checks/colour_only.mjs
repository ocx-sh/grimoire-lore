// UX-A11Y-19 lead generator: a state that differs from its stateless peer in colour and in nothing else.
// Pinned versions: Node >= 20, playwright 1.57.0 (npm i -D --save-exact playwright@1.57.0, then
// npx playwright install <engine>). The script prints the Playwright and engine versions it ran with.
// Usage: [ENGINE=chromium|firefox|webkit] [BROWSER=<executable>] [WAIT=load|networkidle] node colour_only.mjs <url> [<url> ...]
// A state is a class token such as active, selected, current, error, danger, success, warning, invalid, planned,
// checked or disabled, or aria-current, or aria-pressed, aria-selected or aria-invalid set to true. The script pairs
// each state element with a peer of the same tag and classes without the state, and reports:
//   FAIL  the pair differs in colour and in nothing else (no font, decoration, border, outline, background image,
//         child element, or pseudo-element content, background-color, width or height), and no colour pair blended
//         onto its backdrop reaches 3:1 (the lightness cue of WCAG 1.4.1)
//   INFO  no visible difference on the element itself: read the parent, because a cue drawn on the parent is not seen
// Runs in light and dark. Exit 0 = no FAIL, 1 = at least one FAIL, 2 = a page failed to load (that run proves nothing).
// shortcut: states that script sets after load, and a state set by a data-* attribute on a wrapper, are not seen.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}
const { chromium, firefox, webkit } = await import('playwright');
const eng = process.env.ENGINE || 'chromium';
if (!{ chromium, firefox, webkit }[eng]) { console.error('ENGINE must be chromium, firefox or webkit'); process.exit(2); }
const urls = process.argv.slice(2);
if (!urls.length) { console.error('usage: node colour_only.mjs <url> [<url> ...]'); process.exit(2); }
let pwVersion = 'unknown'; try { pwVersion = createRequire(import.meta.url)('playwright/package.json').version; } catch (e) {}
const b = await ({ chromium, firefox, webkit })[eng].launch(process.env.BROWSER ? { executablePath: process.env.BROWSER } : {});
console.log('playwright', pwVersion, 'engine', eng, b.version());
let fails = 0, navErr = 0;
for (const url of urls) for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
  const p = await ctx.newPage();
  const W = process.env.WAIT || 'load';
  try { await p.goto(url, { waitUntil: W, timeout: 30000 }); if (W === 'load') await p.waitForTimeout(1500); }
  catch (e) { navErr++; console.log('ERROR', scheme, url, String(e.message).split('\n')[0]); await ctx.close(); continue; }
  const rows = await p.evaluate(() => {
    const TOK = /(^|[-_])(active|selected|current|error|danger|success|warning|invalid|planned|checked|disabled)($|[-_])/;
    const isState = (e) => [...e.classList].some((c) => TOK.test(c)) ||
      e.getAttribute('aria-current') || ['aria-pressed', 'aria-selected', 'aria-invalid'].some((a) => e.getAttribute(a) === 'true');
    const key = (e) => e.tagName + '|' + [...e.classList].filter((c) => !TOK.test(c)).sort().join(' ');
    const CUE = ['font-weight', 'font-style', 'text-decoration-line', 'text-decoration-style', 'border-top-style',
      'border-top-width', 'border-bottom-style', 'border-bottom-width', 'border-left-width', 'outline-style',
      'outline-width', 'background-image', 'list-style-type', 'text-transform'];
    const PS = ['content', 'background-color', 'width', 'height'];
    const sig = (e) => {
      const s = getComputedStyle(e);
      const pseudo = ['::before', '::after'].map((x) => { const q = getComputedStyle(e, x); return PS.map((k) => q.getPropertyValue(k)).join('/'); }).join('|');
      return { css: CUE.map((k) => s.getPropertyValue(k)), pseudo, kids: [...e.children].map((c) => c.tagName + (c.getAttribute('aria-hidden') ? '-h' : '')).join(',') };
    };
    const rgba = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const a = m.length > 3 ? +m[3] : 1; return [+m[0], +m[1], +m[2], a]; };
    const backdrop = (e) => { let acc = [255, 255, 255]; const chain = []; for (let n = e; n; n = n.parentElement) chain.push(n);
      for (const n of chain.reverse()) { const c = rgba(getComputedStyle(n).backgroundColor); if (c) acc = acc.map((v, i) => c[i] * c[3] + v * (1 - c[3])); } return acc; };
    const blend = (c, under) => { const q = rgba(c); if (!q) return null; return under.map((v, i) => q[i] * q[3] + v * (1 - q[3])); };
    const lum = (rgb) => { const [r, g, bl] = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
    const ratio = (x, y) => { if (!x || !y) return 1; const a = lum(x), z = lum(y); return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05); };
    const lightCue = (e, q) => ['color', 'background-color', 'border-bottom-color'].some((k) =>
      ratio(blend(getComputedStyle(e).getPropertyValue(k), backdrop(e)), blend(getComputedStyle(q).getPropertyValue(k), backdrop(q))) >= 3);
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const all = [...document.body.querySelectorAll('*')].filter(vis);
    const peers = new Map();
    for (const e of all) if (!isState(e)) { const k = key(e); if (!peers.has(k)) peers.set(k, e); }
    const out = [];
    for (const e of all.filter(isState)) {
      const peer = peers.get(key(e));
      if (!peer) continue;
      const a = sig(e), z = sig(peer);
      const differs = a.pseudo !== z.pseudo || a.kids !== z.kids || a.css.some((v, i) => v !== z.css[i]);
      const colourDiff = ['color', 'background-color', 'border-bottom-color', 'outline-color'].some((k) => getComputedStyle(e).getPropertyValue(k) !== getComputedStyle(peer).getPropertyValue(k));
      if (!differs && !lightCue(e, peer)) out.push({ kind: colourDiff ? 'FAIL' : 'INFO', el: key(e), text: (e.textContent || '').trim().slice(0, 30), peer: (peer.textContent || '').trim().slice(0, 30) });
    }
    return out;
  });
  for (const r of rows) { fails += r.kind === 'FAIL'; console.log(r.kind, scheme, url, r.el, JSON.stringify(r.text), 'vs', JSON.stringify(r.peer)); }
  await ctx.close();
}
await b.close();
console.log('colour-only state pairs:', fails);
process.exit(navErr ? 2 : fails ? 1 : 0);

#!/usr/bin/env node
// Rendered-interaction matrix (UX-VERIFY-13 to 16): ten rows per route, one JSON report.
// Pinned: playwright-core 1.63.0 (tested with Chromium 159, 2026-11-27). Install: npm i --save-exact playwright-core@1.63.0
// Set PW_CHROMIUM to a Chromium or headless-shell binary when Playwright's own download is absent.
//
// usage: ui-matrix.mjs <baseUrl> <out.json> <route>... [--schemes light,dark] [--motion advisory|block]
//   Run it against a served production build, never a dev server (a dev server takes 9 to 10 s per Tab walk).
//   --schemes  the colour schemes the site ships; a dark-only site passes --schemes dark (default light,dark)
//   --motion   `block` where the codebase has a duration-token layer, else `advisory` (default advisory)
// Rows: reflow-320, zoom-200, zoom-400, scheme-light, scheme-dark, forced-colors, reduced-motion,
//       tabwalk-desktop, tabwalk-zoom400, tabwalk-forced.
// BLOCKING (fail the row and the exit code): hscroll, a zoom-blocking viewport meta, scheme luminance,
//   forced-colours invisible text, unnamed stops, a walk that does not wrap (capped), lost focus more than once.
// ADVISORY (listed as needs-human-review lines, never fail the exit code until humans have labelled their
//   firings, UX-VERIFY-13): newClipped, noRing, fullyObscured, and reduced motion unless --motion block.
// Each walk row writes noRingSelf, ancestorCleared and noRing (UX-VERIFY-16): noRingSelf = ancestorCleared + noRing.
// Exit 0 when every blocking check passes, 1 otherwise, 2 on bad usage.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const raw = process.argv.slice(2);
if (raw.includes('--help') || raw.length === 0) {
  console.log(`usage: ui-matrix.mjs <baseUrl> <out.json> <route>... [--schemes light,dark] [--motion advisory|block]`);
  process.exit(raw.length === 0 ? 2 : 0);
}
const opt = { schemes: 'light,dark', motion: 'advisory' };
const pos = [];
for (let i = 0; i < raw.length; i++) {
  if (raw[i] === '--schemes' || raw[i] === '--motion') opt[raw[i].slice(2)] = raw[++i];
  else pos.push(raw[i]);
}
const [base, out, ...paths] = pos;
if (!base || !out || paths.length === 0 || !['advisory', 'block'].includes(opt.motion)) {
  console.error('usage: ui-matrix.mjs <baseUrl> <out.json> <route>... [--schemes light,dark] [--motion advisory|block]');
  process.exit(2);
}
const SCHEMES = opt.schemes.split(',');
const MAX_STOPS = 120;
const INTERACTIVE = new Set(['link', 'button', 'textbox', 'checkbox', 'radio', 'combobox', 'switch', 'tab', 'menuitem', 'searchbox', 'slider', 'spinbutton', 'option']);
const t0 = Date.now();
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });

// Browser zoom Z% on a 1280x720 window equals a (1280/Z*100) x (720/Z*100) CSS px viewport (WCAG 1.4.10 note 1).
// Playwright has no zoom option, so the viewport shrinks instead.
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  zoom200: { width: 640, height: 360 },
  zoom400: { width: 320, height: 180 },
  reflow320: { width: 320, height: 1024 },
};

async function ctxPage(vp, media = {}) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'no-preference', ...media });
  return { ctx, page: await ctx.newPage() };
}

const overflowProbe = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const name = (el) => `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''}`;
  const wide = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 && !el.closest('pre, table, [data-allow-2d], .expressive-code, svg')) wide.push(name(el));
  }
  const clipped = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (!/(hidden|clip)/.test(cs.overflowX + cs.overflowY) || !el.textContent.trim()) continue;
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
      if (el.clientHeight > 1 && el.clientWidth > 1 && !/sr-only/.test(el.className) && cs.textOverflow !== 'ellipsis') clipped.push(name(el));
    }
  }
  return { scrollW: de.scrollWidth, clientW: vw, hscroll: de.scrollWidth > vw + 1, wide: [...new Set(wide)].slice(0, 6), clippedList: [...new Set(clipped)] };
};

async function baselineClipped(url) {
  const { ctx, page } = await ctxPage(VIEWPORTS.desktop);
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(overflowProbe);
  await ctx.close();
  return new Set(r.clippedList);
}

async function layoutCondition(url, name, vp, base0) {
  const { ctx, page } = await ctxPage(vp);
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(overflowProbe);
  const meta = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.content ?? null);
  await ctx.close();
  const { clippedList, ...rest } = r;
  const viewportZoomBlocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(meta ?? '');
  const newClipped = clippedList.filter((c) => !base0.has(c)); // clipped here, not clipped at 1280
  return { cond: name, pass: !r.hscroll && !viewportZoomBlocked, advisory: newClipped.length ? ['newClipped'] : [], ms: Date.now() - s, viewport: meta, viewportZoomBlocked, newClipped, ...rest };
}

const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

async function schemeCondition(url, scheme) {
  const { ctx, page } = await ctxPage(VIEWPORTS.desktop, { colorScheme: scheme });
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    return { bg, rgb: bg.match(/[\d.]+/g).map(Number).slice(0, 3), dataTheme: document.documentElement.dataset.theme ?? null };
  });
  await ctx.close();
  const L = lum(r.rgb);
  return { cond: `scheme-${scheme}`, pass: scheme === 'dark' ? L < 0.2 : L > 0.5, advisory: [], ms: Date.now() - s, bg: r.bg, bgLuminance: +L.toFixed(3), dataTheme: r.dataTheme };
}

async function forcedCondition(url) {
  const { ctx, page } = await ctxPage(VIEWPORTS.desktop, { forcedColors: 'active' });
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const matches = matchMedia('(forced-colors: active)').matches;
    const optOut = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).forcedColorAdjust === 'none').length;
    const eff = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba?\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
    let invisibleText = 0;
    for (const el of document.querySelectorAll('body a, body button, body p, body h1, body h2, body h3, body li, body span')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (getComputedStyle(el).color === eff(el)) invisibleText++;
    }
    return { matches, optOut, invisibleText };
  });
  await ctx.close();
  return { cond: 'forced-colors', pass: r.matches && r.invisibleText === 0, advisory: [], ms: Date.now() - s, ...r };
}

async function motionCondition(url) {
  const probe = () => document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.effect?.getComputedTiming().iterations === Infinity);
  const res = {};
  for (const mode of ['no-preference', 'reduce']) {
    const { ctx, page } = await ctxPage(VIEWPORTS.desktop, { reducedMotion: mode });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const a = await page.evaluate(probe);
    res[mode] = { running: a.length, infinite: a.filter(Boolean).length };
    res.scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    await ctx.close();
  }
  const ok = res.reduce.infinite === 0 && res.scrollBehavior !== 'smooth';
  const blocking = opt.motion === 'block';
  return { cond: 'reduced-motion', pass: blocking ? ok : true, advisory: !blocking && !ok ? ['reducedMotion'] : [], ms: 0, ...res };
}

// In the page: the focused element's stop info, with the hit test run on every line box (UX-VERIFY-15).
const stopProbe = () => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { body: true };
  const vw = innerWidth, vh = innerHeight;
  const describe = (h) => {
    let p = h;
    while (p && !['fixed', 'sticky'].includes(getComputedStyle(p).position)) p = p.parentElement;
    return `${h.tagName.toLowerCase()}${typeof h.className === 'string' && h.className ? '.' + h.className.split(' ')[0] : ''} position=${p ? getComputedStyle(p).position : getComputedStyle(h).position}`;
  };
  let hit = 0, total = 0;
  const covers = new Set();
  // getClientRects() gives one rectangle per line box; the bounding box of a wrapped inline link spans the gap between lines.
  for (const r of el.getClientRects()) {
    const x0 = Math.max(r.left, 0), x1 = Math.min(r.right, vw), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, vh);
    if (x1 <= x0 || y1 <= y0) continue;
    for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) {
      total++;
      const h = document.elementFromPoint(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy);
      if (h && (h === el || el.contains(h))) hit++;
      else if (h) covers.add(describe(h));
    }
  }
  const clipOf = (e) => {
    if (!e || e === document.body || e === document.documentElement) return null;
    const r = e.getBoundingClientRect();
    const x = Math.max(r.left - 6, 0), y = Math.max(r.top - 6, 0);
    const w = Math.min(r.width + 12, vw - x), h = Math.min(r.height + 12, vh - y);
    return r.width > 0 && r.height > 0 && w > 0 && h > 0 ? { x, y, width: w, height: h } : null;
  };
  window.__ids ??= new WeakMap(); window.__n ??= 0;
  if (!window.__ids.has(el)) window.__ids.set(el, ++window.__n);
  window.__ae = el;
  const cs = getComputedStyle(el);
  return {
    key: window.__ids.get(el), tag: el.tagName.toLowerCase(), hit, total, covers: [...covers], y: Math.round(scrollY),
    cls: typeof el.className === 'string' ? el.className.split(' ')[0] : '',
    outline: `${cs.outlineStyle} ${cs.outlineWidth} off=${cs.outlineOffset}`,
    clips: [clipOf(el), clipOf(el.parentElement), clipOf(el.parentElement?.parentElement)],
  };
};

// Focused versus blurred pixels of one clip. The script's refocus keeps :focus-visible after keyboard use in Chromium,
// but this is the open question of UX-VERIFY-16: a ring drawn through :has(:focus-visible) may not survive it.
async function ringChanges(page, clip) {
  const on = await page.screenshot({ clip, animations: 'disabled' });
  await page.evaluate(() => window.__ae.blur());
  const off = await page.screenshot({ clip, animations: 'disabled' });
  await page.evaluate(() => window.__ae.focus());
  return !on.equals(off);
}

async function tabWalk(url, label, vp, media) {
  const { ctx, page } = await ctxPage(vp, media);
  const s = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(page);
  const stops = [];
  let first = null;
  for (let i = 0; i < MAX_STOPS; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(stopProbe);
    if (info.body) { stops.push({ i, lost: true }); continue; }
    if (first === null) first = info.key; else if (info.key === first) break;
    // The accessible name comes from the browser's accessibility tree, never from textContent.
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window.__ae' });
    const n = (await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false })).nodes[0];
    const name = (n?.name?.value ?? '').trim();
    const role = n?.role?.value ?? '';
    const obscured = info.total > 0 && info.hit === 0;
    let ring = null, via = 'self';
    if (!obscured && info.clips[0]) {
      ring = await ringChanges(page, info.clips[0]);
      // UX-VERIFY-16: before reporting no indicator, repeat the diff on the nearest two ancestors.
      for (const [k, clip] of [[1, info.clips[1]], [2, info.clips[2]]]) {
        if (ring || !clip) continue;
        if (await ringChanges(page, clip)) { ring = true; via = `anc${k}`; }
      }
      if (ring === false) via = 'none';
    }
    stops.push({ i, tag: info.tag, cls: info.cls, name, role, outline: info.outline, y: info.y, obscured, covers: info.covers, ring, via, ownNoChange: ring === false || via !== 'self' });
  }
  await ctx.close();
  const real = stops.filter((x) => !x.lost);
  const tag = (x) => `${x.tag}${x.cls ? '.' + x.cls : ''}#${x.i}:${x.name.slice(0, 24)}`;
  const own = real.filter((x) => x.ownNoChange);
  const res = {
    cond: `tabwalk-${label}`, ms: Date.now() - s, stops: real.length,
    lost: stops.filter((x) => x.lost).length,
    unnamed: real.filter((x) => x.name === '' && INTERACTIVE.has(x.role)).map((x) => `${x.tag}#${x.i}`),
    capped: real.length >= MAX_STOPS,
    noRingSelf: own.length,
    ancestorCleared: own.filter((x) => x.via.startsWith('anc')).map((x) => `${tag(x)} ${x.via}`),
    noRing: own.filter((x) => x.ring === false).map((x) => `${tag(x)} [${x.outline}] y=${x.y}`),
    fullyObscured: real.filter((x) => x.obscured).map((x) => `${tag(x)} y=${x.y} covered-by=${x.covers.join('|')}`),
  };
  res.pass = res.unnamed.length === 0 && res.lost <= 1 && !res.capped;
  res.advisory = [res.noRing.length && 'noRing', res.fullyObscured.length && 'fullyObscured'].filter(Boolean);
  return res;
}

const report = [];
for (const p of paths) {
  const url = new URL(p, base).href;
  const ps = Date.now();
  const base0 = await baselineClipped(url);
  const rows = [
    await layoutCondition(url, 'reflow-320', VIEWPORTS.reflow320, base0),
    await layoutCondition(url, 'zoom-200', VIEWPORTS.zoom200, base0),
    await layoutCondition(url, 'zoom-400', VIEWPORTS.zoom400, base0),
  ];
  for (const sc of SCHEMES) rows.push(await schemeCondition(url, sc));
  rows.push(await forcedCondition(url), await motionCondition(url));
  rows.push(await tabWalk(url, 'desktop', VIEWPORTS.desktop, {}));
  rows.push(await tabWalk(url, 'zoom400', VIEWPORTS.zoom400, {}));
  rows.push(await tabWalk(url, 'forced', VIEWPORTS.desktop, { forcedColors: 'active' }));
  report.push({ path: p, totalMs: Date.now() - ps, rows });
}
const browserVersion = browser.version();
await browser.close();
const summary = { base, versions: { 'playwright-core': '1.63.0', browser: browserVersion }, schemes: SCHEMES, motion: opt.motion, totalMs: Date.now() - t0, pages: report };
writeFileSync(out, JSON.stringify(summary, null, 2));

let fail = 0;
const review = [];
for (const pg of report) for (const r of pg.rows) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${pg.path.padEnd(16)} ${r.cond.padEnd(18)} ${r.ms}ms${r.advisory.length ? `  advisory: ${r.advisory.join(',')}` : ''}`);
  if (!r.pass) fail++;
  for (const k of ['newClipped', 'noRing', 'fullyObscured']) if (r[k]?.length) review.push(`needs-human-review ${pg.path} ${r.cond} ${k}: ${r[k].join(' ; ')}`);
  if (r.advisory.includes('reducedMotion')) review.push(`needs-human-review ${pg.path} ${r.cond} reducedMotion: ${r.reduce.infinite} infinite animations or smooth scroll under reduce`);
}
for (const l of review) console.log(l);
console.log(`matrix-facts: playwright-core 1.63.0, browser ${browserVersion}, ${report.length} routes, schemes ${SCHEMES.join(',')}, total ${summary.totalMs}ms, ${fail} failing blocking checks, ${review.length} needs-human-review items`);
process.exit(fail ? 1 : 0);

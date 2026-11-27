#!/usr/bin/env node
// Per-platform counters for microblog drafts (CH-MB-01 to CH-MB-06, CH-MB-14, CH-MB-22).
//
// Pinned dependencies (exact, no ^ or ~): twitter-text 3.1.0, @atproto/api 0.32.7.
//   npm install --prefix "$MB_DEPS" --save-exact twitter-text@3.1.0 @atproto/api@0.32.7
// Then run with MB_DEPS set, or from a directory whose node_modules holds both.
// Every limit comes from references/facts.md. This file holds no limit literal.
//
// Usage:
//   python3 -I mb_check.py --parse DRAFT.md | node mb_count.mjs [--facts FILE] [--instance HOST] [--facets] -
//   node mb_count.mjs [--facts FILE] [--instance HOST] --platform x|bluesky|mastodon|threads --text TEXT
//   node mb_count.mjs --self-test
// Exit 0 every count passes, 1 a count fails, 2 usage or missing dependency.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16);
  console.log(head.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const PINS = { 'twitter-text': '3.1.0', '@atproto/api': '0.32.7' };
const die = (msg) => { console.error(`mb_count: ${msg}`); process.exit(2); };

function load(name) {
  const roots = [process.env.MB_DEPS, process.cwd(), HERE].filter(Boolean);
  for (const root of roots) {
    try {
      const mod = createRequire(path.join(root, 'x.js'))(name);
      const pj = path.join(root, 'node_modules', name, 'package.json');
      const version = fs.existsSync(pj) ? JSON.parse(fs.readFileSync(pj, 'utf8')).version : 'unknown';
      return { mod, version };
    } catch { /* try the next root */ }
  }
  return die(`cannot load ${name}; install the pinned versions (see the header of this file)`);
}

const tt = load('twitter-text');
const atp = load('@atproto/api');
for (const [n, got] of [['twitter-text', tt.version], ['@atproto/api', atp.version]]) {
  if (got !== PINS[n]) die(`${n} is ${got}, the pin is ${PINS[n]} (CH-MB-14)`);
}
const { RichText } = atp.mod;
const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
const tally = (it) => { let n = 0; for (const _ of it) n += 1; return n; };
const graphemes = (s) => tally(seg.segment(s));
const bytes = (s) => Buffer.byteLength(s, 'utf8');

// ---- registry (CH-MB-14) ----
function readFacts(file) {
  const rows = {};
  for (const ln of fs.readFileSync(file, 'utf8').split('\n')) {
    const c = ln.split('|').map((x) => x.trim());
    if (/^[A-Z]+-F[0-9]+$/.test(c[1] ?? '')) rows[c[1]] = c[4];
  }
  return (id) => {
    const m = /\d[\d,]*/.exec(rows[id] ?? '');
    if (!m) die(`registry row ${id} missing or has no number in ${file}`);
    return Number(m[0].replace(/,/g, ''));
  };
}

// ---- counters ----
const countX = (s) => { const p = tt.mod.parseTweet(s); return { n: p.weightedLength, ok: p.valid }; };
const countBsky = (s) => { const rt = new RichText({ text: s }); return { g: rt.graphemeLength, b: bytes(s) }; };
function countMastodon(s, cw, reserved) {
  let out = '', last = 0;
  for (const e of tt.mod.extractUrlsWithIndices(s, { extractUrlsWithoutProtocol: false })) {
    out += s.slice(last, e.indices[0]) + 'x'.repeat(reserved);
    last = e.indices[1];
  }
  out += s.slice(last);
  out = out.replace(/@([A-Za-z0-9_]+)@[A-Za-z0-9.-]+/g, '@$1');
  return graphemes(cw + out);
}
function countThreads(s) { // model: emoji count as UTF-8 bytes. Untested against the API (CH-MB-06 is SHOULD).
  let n = 0;
  for (const { segment } of seg.segment(s)) n += /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment) ? bytes(segment) : tally(segment);
  return n;
}
const uniqueUrls = (s, extra) => new Set([...(s.match(/https?:\/\/[^\s<>"')\]]+/g) ?? []).map((u) => u.replace(/[.,;:!?]+$/, '')), ...(extra ? [extra] : [])]);

async function mastodonLimits(host, lim) {
  if (!host) return { max: lim('MA-F03'), reserved: lim('MA-F04'), src: 'registry default (no --instance)' };
  const r = await fetch(`https://${host}/api/v2/instance`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) die(`instance ${host} answered HTTP ${r.status}`);
  const st = (await r.json()).configuration.statuses;
  return { max: st.max_characters, reserved: st.characters_reserved_per_url, src: `${host} /api/v2/instance` };
}

// One verdict row per platform per post (CH-MB-01).
async function verdicts(text, platform, ctx) {
  const rows = [];
  const { lim, mast } = ctx;
  if (platform === 'x') {
    const c = countX(text);
    rows.push({ platform, test: 'weighted', n: c.n, max: lim('X-F04'), ok: c.ok && c.n <= lim('X-F04') });
  } else if (platform === 'bluesky') {
    const c = countBsky(text);
    rows.push({ platform, test: 'graphemes', n: c.g, max: lim('BS-F05'), ok: c.g <= lim('BS-F05') });
    rows.push({ platform, test: 'utf8-bytes', n: c.b, max: lim('BS-F06'), ok: c.b <= lim('BS-F06') });
  } else if (platform === 'mastodon') {
    const n = countMastodon(text, ctx.cw ?? '', mast.reserved);
    rows.push({ platform, test: `clusters (${mast.src})`, n, max: mast.max, ok: n <= mast.max });
  } else if (platform === 'threads') {
    const n = countThreads(text);
    const links = tally(uniqueUrls(text, ctx.linkAttachment));
    rows.push({ platform, test: 'emoji-bytes', n, max: lim('TH-F03'), ok: n <= lim('TH-F03') });
    rows.push({ platform, test: 'unique-links', n: links, max: lim('TH-F05'), ok: links <= lim('TH-F05') });
  } else die(`unknown platform ${platform}`);
  const bad = tt.mod.extractUrls(text).filter((u) => !u.startsWith('https://'));
  rows.push({ platform, test: 'urls-in-full (CH-MB-22)', n: tally(bad), max: 0, ok: tally(bad) === 0, detail: bad.join(' ') });
  return rows;
}

async function facetsOf(text) {
  const rt = new RichText({ text });
  const noNet = { com: { atproto: { identity: { resolveHandle: async () => { throw new Error('offline'); } } } } };
  await rt.detectFacets(noNet);
  return rt.facets ?? [];
}

function print(rows) {
  let bad = 0;
  for (const r of rows) {
    if (!r.ok) bad += 1;
    console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.platform.padEnd(9)} ${String(r.post ?? '-').padEnd(5)} ${r.test}: ${r.n}/${r.max}${r.detail ? ' ' + r.detail : ''}`);
  }
  return bad;
}

async function selfTest(lim) {
  const mast = { max: lim('MA-F03'), reserved: lim('MA-F04'), src: 'registry' };
  let bad = 0;
  const eq = (got, want, what) => { if (got !== want) { bad += 1; console.error(`self-test FAIL ${what}: got ${got}, want ${want}`); } };
  const flags = '🇩🇪🇺🇸';
  eq(countX(flags).n, 4, 'flags x'); eq(countBsky(flags).g, 2, 'flags bluesky');
  eq(countMastodon(flags, '', mast.reserved), 2, 'flags mastodon'); eq(countThreads(flags), 16, 'flags threads');
  eq(countX('Hello, world! 👋').n, 16, 'hello x');
  const cjk = '日'.repeat(Math.floor(lim('X-F04') / 2) + 1);
  eq(countX(cjk).ok, false, 'cjk over the weighted limit');
  const longUrl = 'Read https://example.com/docs/guides/very/long/path/to/page?utm_source=x&utm_medium=social&utm_campaign=release#section';
  eq(countBsky(longUrl).g, bytes(longUrl), 'bluesky counts a url in full');
  eq(countX(longUrl).n < countBsky(longUrl).g, true, 'x counts a url short');
  eq(countMastodon('cc @user@mastodon.social please', '', mast.reserved), 15, 'mastodon mention');
  eq(countThreads('🚀'.repeat(lim('TH-F03'))) > lim('TH-F03'), true, 'threads emoji bytes');
  const f = await facetsOf('Docs 🚀 https://example.com/docs');
  eq(f[0]?.index?.byteStart, 10, 'facet byteStart');
  eq(tally(tt.mod.extractUrls('See example.com/docs now')) > 0, true, 'x links a bare domain');
  const ctx = { lim, mast };
  eq((await verdicts('See example.com/docs now', 'x', ctx)).some((r) => !r.ok), true, 'bare domain fails');
  eq((await verdicts('See https://example.com/docs now', 'x', ctx)).every((r) => r.ok), true, 'full url passes');
  console.log(`self-test ${bad ? 'FAILED' : 'ok'} (twitter-text ${tt.version}, @atproto/api ${atp.version})`);
  return bad ? 1 : 0;
}

async function main() {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(k); return i < 0 ? undefined : a[i + 1]; };
  const lim = readFacts(opt('--facts') ?? path.join(HERE, '..', 'references', 'facts.md'));
  if (a.includes('--self-test')) return selfTest(lim);
  const mast = await mastodonLimits(opt('--instance'), lim);
  console.log(`# twitter-text ${tt.version}, @atproto/api ${atp.version}; mastodon limits from ${mast.src}`);
  const rows = [];
  if (opt('--text') !== undefined) {
    rows.push(...await verdicts(opt('--text'), opt('--platform') ?? die('--platform needed with --text'), { lim, mast }));
  } else if (a.includes('-')) {
    const d = JSON.parse(fs.readFileSync(0, 'utf8'));
    for (const v of d.variants) {
      let k = 0;
      for (const p of v.posts) {
        k += 1;
        const out = await verdicts(p.text, v.platform, { lim, mast, cw: p.cw, linkAttachment: p.link_attachment });
        rows.push(...out.map((r) => ({ ...r, post: k })));
        if (a.includes('--facets') && v.platform === 'bluesky') console.log(`facets post ${k}: ${JSON.stringify(await facetsOf(p.text))}`);
      }
    }
  } else die('give - (JSON on stdin from mb_check.py --parse) or --text with --platform');
  return print(rows) ? 1 : 0;
}

process.exit(await main());

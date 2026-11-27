#!/usr/bin/env node
// The one shared axe fixture (UX-VERIFY-02, 03, 05, 06, 08, 09, 11).
// Pinned, never a range: axe-core 4.14.1, @axe-core/playwright 4.14.1, playwright-core 1.63.0
// (npm registry, re-checked 2026-11-27). Install: npm i --save-exact axe-core@4.14.1 @axe-core/playwright@4.14.1 playwright-core@1.63.0
// Set PW_CHROMIUM to a Chromium or headless-shell binary when Playwright's own download is absent.
// Bump the pins and the baseline in the same commit (UX-VERIFY-06).
//
// usage:
//   axe-fixture.mjs <baseUrl> --routes FILE [--schemes light,dark] [--states FILE]
//                   --baseline FILE | --update-baseline FILE [--out report.json] [--block-best-practice]
//   axe-fixture.mjs --html-dir DIR [--css FILE --vars FILE]   scan static HTML fixtures (webview goldens)
//   axe-fixture.mjs --red-demo                                  plant a defect; exit 0 only if the gate fails it
//   axe-fixture.mjs --print-tags | --help
// FILE of --routes: one route per line, taken from the sitemap or the router, never from a walk of dist/.
// FILE of --states: JSON [{"route":"/","name":"palette","steps":[{"press":"Control+k"},{"click":"button.open"}],"visible":"role=dialog"}].
// Exit 0 clean, 1 violations or needs-review above the baseline, 2 usage or version drift.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const require = createRequire(import.meta.url);
export const PINS = { 'axe-core': '4.14.1', '@axe-core/playwright': '4.14.1', 'playwright-core': '1.63.0' };
// Exactly these five tags. Playwright's own guide lists four and drops wcag22aa, which turns target-size off.
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
export const makeAxeBuilder = (page) => new AxeBuilder({ page }).withTags(WCAG_TAGS);

// best-practice rules are a house policy and stay in their own result set, never in a WCAG statement (UX-VERIFY-09).
const bestPracticeBuilder = (page) => new AxeBuilder({ page }).withTags(['best-practice']);

export async function scan(page, label) {
  const wcag = await makeAxeBuilder(page).analyze();
  const bp = await bestPracticeBuilder(page).analyze();
  const slim = (r) => ({ id: r.id, impact: r.impact ?? null, nodes: r.nodes.length, targets: r.nodes.map((n) => n.target.join(' ')) });
  return { label, violations: wcag.violations.map(slim), incomplete: wcag.incomplete.map(slim), bestPractice: bp.violations.map(slim) };
}

function installedVersions() {
  // package.json is not an exported subpath of these packages: walk up from the entry file to find it.
  const read = (name) => {
    let d = dirname(require.resolve(name));
    while (!(existsSync(join(d, 'package.json')) && JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).name === name)) d = dirname(d);
    return JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).version;
  };
  return Object.fromEntries(Object.keys(PINS).map((n) => [n, read(n)]));
}

function fail(msg, code = 2) { console.error(`axe-fixture: ${msg}`); process.exit(code); }

function parseArgs(argv) {
  const o = { positional: [], flags: new Set() };
  const valued = new Set(['--routes', '--schemes', '--states', '--baseline', '--update-baseline', '--out', '--html-dir', '--css', '--vars']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (valued.has(a)) { if (i + 1 >= argv.length) fail(`${a} needs a value`); o[a.slice(2)] = argv[++i]; }
    else if (a.startsWith('--')) o.flags.add(a.slice(2));
    else o.positional.push(a);
  }
  return o;
}

const tally = (scans, key) => {
  const t = {};
  for (const s of scans) for (const r of s[key]) t[r.id] = (t[r.id] ?? 0) + r.nodes;
  return t;
};

async function openBrowser() {
  return chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
}

async function runState(page, base, st) {
  await page.goto(new URL(st.route, base).href, { waitUntil: 'load' });
  for (const step of st.steps ?? []) {
    if (step.click) await page.locator(step.click).first().click();
    else if (step.press) await page.keyboard.press(step.press);
  }
  // The state must be on screen before analyze(); a closed dialog is not in the accessibility tree (UX-VERIFY-05).
  await page.locator(st.visible).first().waitFor({ state: 'visible', timeout: 5000 });
}

async function gate(o) {
  const base = o.positional[0];
  if (!base || !o.routes) fail('usage: axe-fixture.mjs <baseUrl> --routes FILE (see --help)');
  const routes = readFileSync(o.routes, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const schemes = (o.schemes ?? 'light,dark').split(',');
  const states = o.states ? JSON.parse(readFileSync(o.states, 'utf8')) : [];
  const browser = await openBrowser();
  const scans = [];
  for (const colorScheme of schemes) {
    const ctx = await browser.newContext({ colorScheme });
    const page = await ctx.newPage();
    for (const route of routes) {
      await page.goto(new URL(route, base).href, { waitUntil: 'load' });
      scans.push({ scheme: colorScheme, ...(await scan(page, route)) });
    }
    for (const st of states) {
      try { await runState(page, base, st); }
      catch (e) { scans.push({ scheme: colorScheme, label: `${st.route}#${st.name}`, stateError: String(e.message).split('\n')[0], violations: [], incomplete: [], bestPractice: [] }); continue; }
      scans.push({ scheme: colorScheme, ...(await scan(page, `${st.route}#${st.name}`)) });
    }
    await ctx.close();
  }
  await browser.close();

  const violations = tally(scans, 'violations');
  const incomplete = tally(scans, 'incomplete');
  const bestPractice = tally(scans, 'bestPractice');
  let baseline = {};
  if (o['update-baseline']) { writeFileSync(o['update-baseline'], JSON.stringify(incomplete, null, 2) + '\n'); console.log(`baseline written: ${o['update-baseline']}`); baseline = incomplete; }
  else if (o.baseline) { try { baseline = JSON.parse(readFileSync(o.baseline, 'utf8')); } catch { fail(`cannot read baseline ${o.baseline}; create it with --update-baseline FILE and commit it`); } }
  else fail('a baseline is required (UX-VERIFY-03): pass --baseline FILE, or --update-baseline FILE once');

  const risen = Object.entries(incomplete).filter(([id, n]) => n > (baseline[id] ?? 0));
  const stateErrors = scans.filter((s) => s.stateError);
  for (const s of scans) {
    for (const v of s.violations) console.log(`VIOLATION ${v.id} (${v.impact}) ${s.scheme} ${s.label}: ${v.targets.join(' | ')}`);
    for (const v of s.incomplete) console.log(`needs-review ${v.id} ${s.scheme} ${s.label}: ${v.targets.join(' | ')}`);
    for (const v of s.bestPractice) console.log(`best-practice (house policy, not WCAG) ${v.id} ${s.scheme} ${s.label}: ${v.nodes} nodes`);
    if (s.stateError) console.log(`STATE NOT VISIBLE ${s.scheme} ${s.label}: ${s.stateError}`);
  }
  for (const [id, n] of risen) console.log(`RISEN needs-review ${id}: ${n} > baseline ${baseline[id] ?? 0}`);
  const versions = installedVersions();
  console.log(`gate-facts: axe-core ${versions['axe-core']} tags=${WCAG_TAGS.join(',')} routes=${routes.length} states=${states.length} schemes=${schemes.join(',')} ` +
    `violations=${JSON.stringify(violations)} needs-review=${JSON.stringify(incomplete)} best-practice=${JSON.stringify(bestPractice)}`);
  if (o.out) writeFileSync(o.out, JSON.stringify({ versions, tags: WCAG_TAGS, scans, violations, incomplete, bestPractice }, null, 2));
  const bad = Object.keys(violations).length > 0 || risen.length > 0 || stateErrors.length > 0 || (o.flags.has('block-best-practice') && Object.keys(bestPractice).length > 0);
  return bad ? 1 : 0;
}

async function htmlDir(o) {
  const dir = o['html-dir'];
  const read = (f) => (f ? readFileSync(f, 'utf8') : '');
  const styled = Boolean(o.css && o.vars);
  const css = read(o.css), vars = read(o.vars);
  const browser = await openBrowser();
  const page = await (await browser.newContext()).newPage();
  let bad = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.html')).sort()) {
    // A shell gives the fragment the <html lang>, <title> and <main> a webview host supplies.
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>fixture</title><style>${css}</style><style>:root{${vars}}</style></head><body><main>${read(`${dir}/${f}`)}</main></body></html>`);
    const b = makeAxeBuilder(page);
    if (!styled) b.disableRules(['color-contrast', 'target-size']);
    const r = await b.analyze();
    for (const v of r.violations) { bad++; console.log(`VIOLATION ${v.id} ${f}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`); }
  }
  await browser.close();
  console.log(`gate-facts: axe-core ${installedVersions()['axe-core']} tags=${WCAG_TAGS.join(',')} fragments scanned in a shell` +
    (styled ? '' : '; did not run: color-contrast, target-size (the extension stylesheet and --vscode-* variables are not both loaded)'));
  return bad ? 1 : 0;
}

async function redDemo() {
  const browser = await openBrowser();
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<!doctype html><html lang="en"><head><title>red demo</title></head><body><main><img src="x.png"><button></button></main></body></html>');
  const ids = (await makeAxeBuilder(page).analyze()).violations.map((v) => v.id);
  await browser.close();
  const ok = ids.includes('image-alt') && ids.includes('button-name');
  console.log(ok ? `red-demo: gate failed as expected (${ids.join(', ')})` : `red-demo: the gate passed a page with a missing alt and an unlabelled button (${ids.join(', ') || 'no violations'})`);
  return ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = parseArgs(process.argv.slice(2));
  if (o.flags.has('help') || process.argv.length < 3) { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); process.exit(process.argv.length < 3 ? 2 : 0); }
  if (o.flags.has('print-tags')) { console.log(WCAG_TAGS.join('\n')); process.exit(0); }
  const have = installedVersions();
  const drift = Object.entries(PINS).filter(([n, v]) => have[n] !== v);
  if (drift.length) fail(`installed versions differ from the pins: ${drift.map(([n, v]) => `${n} ${have[n]} != ${v}`).join(', ')}. Edit PINS and the baseline together.`);
  console.log(`axe-core ${have['axe-core']}, @axe-core/playwright ${have['@axe-core/playwright']}, playwright-core ${have['playwright-core']}`);
  process.exit(o.flags.has('red-demo') ? await redDemo() : o['html-dir'] ? await htmlDir(o) : await gate(o));
}

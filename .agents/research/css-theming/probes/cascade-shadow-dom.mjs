// Cascade / layers / Shadow DOM probe. One case = one setContent + one computed read.
// Run: node probe.mjs   (needs ../../browser/node_modules/playwright)
import { chromium } from '/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/02df8e5f-0fb1-4b65-a7c7-c9e23829614b/scratchpad/browser/node_modules/playwright/index.mjs';

// colour vocabulary: rgb triplet -> label, so observed values are readable
const C = { A: 'rgb(1, 0, 0)', B: 'rgb(2, 0, 0)', D: 'rgb(3, 0, 0)', E: 'rgb(4, 0, 0)', INHERIT: 'rgb(9, 0, 0)' };
const label = v => Object.entries(C).find(([, x]) => x === v)?.[0] ?? v;

const cases = [];
const K = (id, expected, html, evalFn) => cases.push({ id, expected, html, evalFn });

// ---- 1. unlayered beats layered at any specificity
K('1-unlayered-beats-layered', 'A',
  `<style>@layer base { #i.a.b { color: ${C.B} } } .a { color: ${C.A} }</style><p id=i class="a b">x`,
  `getComputedStyle(document.getElementById('i')).color`);

// ---- 2. importance reverses layer order (layered !important beats unlayered !important)
K('2-important-reverses', 'B',
  `<style>@layer base { .a { color: ${C.B} !important } } .a { color: ${C.A} !important }</style><p id=i class=a>x`,
  `getComputedStyle(document.getElementById('i')).color`);

// ---- 3a. layer order (from @layer statement) beats block/source order
K('3a-layer-statement-order', 'B',
  `<style>@layer first, second; @layer second { .a { color: ${C.B} } } @layer first { .a { color: ${C.A} } }</style><p id=i class=a>x`,
  `getComputedStyle(document.getElementById('i')).color`);
// ---- 3b. re-opening an earlier layer keeps its earlier position
K('3b-reopen-keeps-position', 'B',
  `<style>@layer first { .a { color: ${C.D} } } @layer second { .a { color: ${C.B} } } @layer first { .a { color: ${C.A} } }</style><p id=i class=a>x`,
  `getComputedStyle(document.getElementById('i')).color`);
// ---- 3c. first appearance of a layer name sets its order even via a nested/implicit block
K('3c-first-appearance-sets-order', 'A',
  `<style>@layer first { .a { color: ${C.D} } } @layer second { .a { color: ${C.B} } } .a { color: ${C.A} }</style><p id=i class=a>x`,
  `getComputedStyle(document.getElementById('i')).color`);

// ---- 4. inline styles vs layered / unlayered !important
K('4a-inline-normal-vs-unlayered-normal', 'A',
  `<style>#i { color: ${C.B} }</style><p id=i style="color:${C.A}">x`,
  `getComputedStyle(document.getElementById('i')).color`);
K('4b-inline-normal-vs-layered-important', 'B',
  `<style>@layer base { .a { color: ${C.B} !important } }</style><p id=i class=a style="color:${C.A}">x`,
  `getComputedStyle(document.getElementById('i')).color`);
K('4c-inline-normal-vs-unlayered-important', 'B',
  `<style>.a { color: ${C.B} !important }</style><p id=i class=a style="color:${C.A}">x`,
  `getComputedStyle(document.getElementById('i')).color`);
K('4d-inline-important-vs-unlayered-important', 'A',
  `<style>.a { color: ${C.B} !important }</style><p id=i class=a style="color:${C.A} !important">x`,
  `getComputedStyle(document.getElementById('i')).color`);
K('4e-inline-important-vs-layered-important', 'A',
  `<style>@layer base { .a { color: ${C.B} !important } }</style><p id=i class=a style="color:${C.A} !important">x`,
  `getComputedStyle(document.getElementById('i')).color`);

// ---- shadow DOM fixture ------------------------------------------------
// <x-el> open root: inner <p part="p" class="p" id="inner">, and a <slot>.
const SHADOW = (innerCSS, hostAttrs = '', light = '') => `
<style id=outer></style>
<x-el id=h ${hostAttrs}>${light}</x-el>
<script>
customElements.define('x-el', class extends HTMLElement {
  constructor(){ super();
    const r = this.attachShadow({mode:'open'});
    r.innerHTML = \`<style>${innerCSS}</style><p part="p" class="p" id="inner">inner</p><slot></slot>\`;
  }
});
<\/script>`;
const READ_INNER = `getComputedStyle(document.getElementById('h').shadowRoot.getElementById('inner')).color`;
const READ_HOST = `getComputedStyle(document.getElementById('h')).color`;

// ---- 5a. host-page class selector does NOT reach into shadow
K('5a-outer-class-does-not-pierce', 'A',
  `<style>.p { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.A} }`),
  READ_INNER);
// ---- 5b. inherited custom property crosses the boundary
K('5b-custom-prop-inherits-in', 'B',
  `<style>x-el { --brand: ${C.B} }</style>` + SHADOW(`.p { color: var(--brand, ${C.A}) }`),
  READ_INNER);
// ---- 5c. ::part() reaches in, and beats a HIGHER-specificity internal rule (Context step)
K('5c-part-beats-higher-specificity-inner', 'B',
  `<style>x-el::part(p) { color: ${C.B} }</style>` + SHADOW(`#inner.p.p2, #inner.p { color: ${C.A} }`),
  READ_INNER);
// ---- 5d. ::part() with a structural pseudo-class appended: valid or dropped?
K('5d-part-nth-child-invalid', 'A',
  `<style>x-el::part(p):nth-child(1) { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.A} }`),
  READ_INNER);
// ---- 5e. ::part() chained to ::part() -> invalid
K('5e-part-part-invalid', 'A',
  `<style>x-el::part(p)::part(p) { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.A} }`),
  READ_INNER);
// ---- 5f. ::slotted() styles projected light DOM; outer normal rule beats it (Context)
K('5f-slotted-loses-to-outer-normal', 'B',
  `<style>.s { color: ${C.B} }</style>` + SHADOW(`::slotted(.s) { color: ${C.A} }`, '', '<span class=s id=sl>slotted</span>'),
  `getComputedStyle(document.getElementById('sl')).color`);
// ---- 5g. ::slotted() DOES apply when nothing outer competes
K('5g-slotted-applies', 'A',
  SHADOW(`::slotted(.s) { color: ${C.A} }`, '', '<span class=s id=sl>slotted</span>'),
  `getComputedStyle(document.getElementById('sl')).color`);
// ---- 5h. ::slotted() cannot reach a descendant of the slotted element
K('5h-slotted-no-descendants', 'rgb(0, 0, 0)',
  SHADOW(`::slotted(.s) span { color: ${C.A} }`, '', '<span class=s><span id=deep>deep</span></span>'),
  `getComputedStyle(document.getElementById('deep')).color`);
// ---- 5i. :host (0,1,0) vs outer type selector (0,0,1) -> Context beats specificity
K('5i-host-loses-to-outer-type', 'B',
  `<style>x-el { color: ${C.B} }</style>` + SHADOW(`:host { color: ${C.A} }`),
  READ_HOST);
// ---- 5j. :host(.c) (0,2,0) vs outer type selector (0,0,1)
K('5j-host-fn-loses-to-outer-type', 'B',
  `<style>x-el { color: ${C.B} }</style>` + SHADOW(`:host(.c) { color: ${C.A} }`, 'class=c'),
  READ_HOST);
// ---- 5k. :host(.c) beats :host inside the SAME context (specificity 0,2,0 > 0,1,0)
K('5k-host-fn-beats-host-same-context', 'A',
  SHADOW(`:host(.c) { color: ${C.A} } :host { color: ${C.B} }`, 'class=c'),
  READ_HOST);
// ---- 5l. :host-context() supported at all?
K('5l-host-context-supported', 'A',
  `<div class=dark>` + SHADOW(`:host-context(.dark) { color: ${C.A} } :host { color: ${C.B} }`) + `</div>`,
  READ_HOST);
// ---- 5m. :root inside a shadow root matches nothing
K('5m-root-in-shadow-matches-nothing', 'rgb(0, 0, 0)',
  SHADOW(`:root { color: ${C.A} }`),
  READ_INNER);
// ---- 5n. bare descendant selector from inside shadow cannot reach light DOM
K('5n-inner-cannot-reach-out', 'rgb(0, 0, 0)',
  `<p id=lt>light</p>` + SHADOW(`p { color: ${C.A} }`),
  `getComputedStyle(document.getElementById('lt')).color`);

// ---- 6. importance ACROSS the shadow boundary (both directions)
K('6a-inner-important-beats-outer-important-part', 'A',
  `<style>x-el::part(p) { color: ${C.B} !important }</style>` + SHADOW(`.p { color: ${C.A} !important }`),
  READ_INNER);
K('6b-outer-important-beats-inner-normal', 'B',
  `<style>x-el::part(p) { color: ${C.B} !important }</style>` + SHADOW(`.p { color: ${C.A} }`),
  READ_INNER);
K('6c-inner-important-beats-outer-normal', 'A',
  `<style>x-el::part(p) { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.A} !important }`),
  READ_INNER);
K('6d-host-inner-important-beats-outer-important', 'A',
  `<style>x-el { color: ${C.B} !important }</style>` + SHADOW(`:host { color: ${C.A} !important }`),
  READ_HOST);

// ---- 7. @layer inside a shadow root
K('7a-layer-works-inside-shadow', 'A',
  SHADOW(`@layer base { #inner.p { color: ${C.B} } } .p { color: ${C.A} }`),
  READ_INNER);
K('7b-outer-layered-beats-inner-unlayered', 'B',
  `<style>@layer base { x-el::part(p) { color: ${C.B} } }</style>` + SHADOW(`.p { color: ${C.A} }`),
  READ_INNER);
K('7c-same-layer-name-does-not-merge', 'B',
  `<style>@layer app { x-el::part(p) { color: ${C.B} } }</style>` + SHADOW(`@layer app { .p { color: ${C.A} } }`),
  READ_INNER);

// ---- 8. adoptedStyleSheets as an override channel
K('8a-adopted-unlayered-beats-inner-layered', 'B',
  SHADOW(`@layer base { #inner.p { color: ${C.A} } }`) + `
<script>
  const s = new CSSStyleSheet(); s.replaceSync('.p { color: ${C.B} }');
  const r = document.getElementById('h').shadowRoot;
  r.adoptedStyleSheets = [...r.adoptedStyleSheets, s];
<\/script>`,
  READ_INNER);
K('8b-adopted-ordered-after-style-element', 'B',
  SHADOW(`.p { color: ${C.A} }`) + `
<script>
  const s = new CSSStyleSheet(); s.replaceSync('.p { color: ${C.B} }');
  const r = document.getElementById('h').shadowRoot;
  r.adoptedStyleSheets = [...r.adoptedStyleSheets, s];
<\/script>`,
  READ_INNER);
K('8c-adopted-loses-to-inner-important', 'A',
  SHADOW(`.p { color: ${C.A} !important }`) + `
<script>
  const s = new CSSStyleSheet(); s.replaceSync('.p { color: ${C.B} }');
  const r = document.getElementById('h').shadowRoot;
  r.adoptedStyleSheets = [...r.adoptedStyleSheets, s];
<\/script>`,
  READ_INNER);
K('8d-closed-root-blocks-adoption', 'null',
  `<x-cl id=c></x-cl><script>
   customElements.define('x-cl', class extends HTMLElement { constructor(){ super(); this.attachShadow({mode:'closed'}); } });
   <\/script>`,
  `String(document.getElementById('c').shadowRoot)`);

// ---- 9. @scope vs cascade layers
K('9a-scope-proximity-beats-source-order', 'A',
  `<style>@scope (.outer) { .t { color: ${C.B} } } @scope (.inner) { .t { color: ${C.A} } }</style>
   <div class=outer><div class=inner><p id=i class=t>x</p></div></div>`,
  `getComputedStyle(document.getElementById('i')).color`);
K('9b-scope-proximity-beats-later-source-order', 'A',
  `<style>@scope (.inner) { .t { color: ${C.A} } } @scope (.outer) { .t { color: ${C.B} } }</style>
   <div class=outer><div class=inner><p id=i class=t>x</p></div></div>`,
  `getComputedStyle(document.getElementById('i')).color`);
K('9c-layer-outranks-scope-proximity', 'B',
  `<style>@layer base { @scope (.inner) { .t { color: ${C.A} } } } @scope (.outer) { .t { color: ${C.B} } }</style>
   <div class=outer><div class=inner><p id=i class=t>x</p></div></div>`,
  `getComputedStyle(document.getElementById('i')).color`);
K('9d-scope-does-not-lower-specificity', 'A',
  `<style>@scope (.outer) { #i { color: ${C.A} } } .t { color: ${C.B} }</style>
   <div class=outer><p id=i class=t>x</p></div>`,
  `getComputedStyle(document.getElementById('i')).color`);

// ---- 10. var() fallback semantics
K('10a-missing-prop-uses-fallback', 'B',
  `<style>#p { color: ${C.A} } #i { color: var(--nope, ${C.B}) }</style><div id=p><p id=i>x</p></div>`,
  `getComputedStyle(document.getElementById('i')).color`);
K('10b-invalid-value-is-IACVT-not-fallback', 'A',
  `<style>#p { color: ${C.A} } #i { --bad: 10px; color: var(--bad, ${C.B}) }</style><div id=p><p id=i>x</p></div>`,
  `getComputedStyle(document.getElementById('i')).color`);
K('10c-empty-prop-is-valid-not-fallback', 'A',
  `<style>#p { color: ${C.A} } #i { --e: ; color: var(--e, ${C.B}) }</style><div id=p><p id=i>x</p></div>`,
  `getComputedStyle(document.getElementById('i')).color`);
K('10d-IACVT-on-non-inherited-prop-uses-initial', 'rgba(0, 0, 0, 0)',
  `<style>#p { background-color: ${C.A} } #i { --bad: 10px; background-color: var(--bad, ${C.B}) }</style><div id=p><p id=i>x</p></div>`,
  `getComputedStyle(document.getElementById('i')).backgroundColor`);

// ---- 5o/5p. does a prefix's specificity accumulate in front of ::part()?
K('5o-part-prefix-specificity-accumulates', 'A',
  `<style>#h::part(p) { color: ${C.A} } x-el::part(p) { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.D} }`),
  READ_INNER);
K('5p-equal-part-selectors-source-order', 'B',
  `<style>x-el::part(p) { color: ${C.A} } x-el::part(p) { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.D} }`),
  READ_INNER);

// ---- 11. forced-colors sits above the whole author contract (run in a forced-colors context)
const forced = [];
forced.push({ id: '11a-forced-colors-overrides-author-important', expected: 'not-A',
  html: `<style>#i { color: ${C.A} !important }</style><p id=i>x`,
  evalFn: `getComputedStyle(document.getElementById('i')).color === '${C.A}' ? 'A' : 'not-A'` });
forced.push({ id: '11b-forced-color-adjust-none-restores-author', expected: 'A',
  html: `<style>#i { color: ${C.A} !important; forced-color-adjust: none }</style><p id=i>x`,
  evalFn: `getComputedStyle(document.getElementById('i')).color === '${C.A}' ? 'A' : 'not-A'` });
forced.push({ id: '11c-forced-colors-media-query-matches', expected: 'true',
  html: `<p id=i>x`, evalFn: `String(matchMedia('(forced-colors: active)').matches)` });

// ---- RED CONTROLS: deliberately wrong expectations / deliberately dead CSS ----
const red = [];
red.push({ id: 'RED-1-wrong-expectation', expected: 'B', ...cases.find(c => c.id === '1-unlayered-beats-layered') , note: 'case 1 asserted with the INVERTED expectation' });
red[0].expected = 'B';
red.push({ id: 'RED-2-typo-selector-never-applies', expected: 'A', note: 'selector typo: rule cannot match, so a "pass" would prove the harness reads nothing',
  html: `<style>.aTYPO { color: ${C.A} }</style><p id=i class=a>x`,
  evalFn: `getComputedStyle(document.getElementById('i')).color` });
red.push({ id: 'RED-3-shadow-read-of-wrong-node', expected: 'B', note: 'reads the HOST while the rule targets the inner part; must not report the part colour',
  html: `<style>x-el::part(p) { color: ${C.B} }</style>` + SHADOW(`.p { color: ${C.A} }`),
  evalFn: READ_HOST });

const run = async (ctx, list) => {
  const out = [];
  for (const c of list) {
    // fresh page per case: setContent reuses the window, so a shared page would
    // keep the first customElements.define() and silently reuse its shadow CSS.
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    let observed;
    try {
      await page.setContent(`<!doctype html><meta charset=utf-8>${c.html}`, { waitUntil: 'load' });
      observed = label(String(await page.evaluate(c.evalFn)));
    } catch (e) { observed = 'ERROR: ' + e.message; }
    await page.close();
    out.push({ id: c.id, expected: c.expected, observed, verdict: observed === c.expected ? 'PASS' : 'FAIL', pageErrors: errs.length ? errs : undefined, note: c.note });
  }
  return out;
};

const browser = await chromium.launch();
const engine = `Chromium ${browser.version()} (playwright 1.62.1)`;
const main = await run(browser, cases);
const redOut = await run(browser, red);
const fctx = await browser.newContext({ forcedColors: 'active' });
const forcedOut = await run(fctx, forced);
await fctx.close();
await browser.close();

console.log(JSON.stringify({ engine, main, forced: forcedOut, red: redOut }, null, 1));
console.error(`\nengine: ${engine}`);
console.error(`main: ${main.filter(r => r.verdict === 'PASS').length}/${main.length} pass`);
console.error(`forced-colors: ${forcedOut.filter(r => r.verdict === 'PASS').length}/${forcedOut.length} pass`);
console.error(`red controls (all must FAIL): ${redOut.filter(r => r.verdict === 'FAIL').length}/${redOut.length} failed as designed`);

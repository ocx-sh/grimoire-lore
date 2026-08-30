// Probe: forced-colors, color-scheme, light-dark(), @property
// Chromium via Playwright (browser install at ../../browser/node_modules/playwright)
// Run: node probe.js
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', 'browser', 'node_modules', 'playwright'));

const results = [];
function record(section, assertion, expected, observed, verdict, note) {
  results.push({ section, assertion, expected, observed, verdict, note: note || '' });
  console.log(`[${verdict.toUpperCase()}] ${section} :: ${assertion}\n    expected: ${expected}\n    observed: ${observed}${note ? '\n    note: ' + note : ''}`);
}

async function getComputed(page, selector, props) {
  return page.evaluate(({ selector, props }) => {
    const el = document.querySelector(selector);
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    return out;
  }, { selector, props });
}

(async () => {
  const browser = await chromium.launch();
  console.log('Engine: Chromium', await browser.version(), '(Playwright 1.62.1)');

  // ===================================================================
  // SECTION 1: which properties does forced-colors:active override?
  // ===================================================================
  {
    const ctx = await browser.newContext({ forcedColors: 'active', colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.setContent(`
      <style>
        #box {
          color: rgb(1, 2, 3);
          background-color: rgb(4, 5, 6);
          border: 2px solid rgb(7, 8, 9);
          outline: 2px solid rgb(10, 11, 12);
          box-shadow: 0 0 5px rgb(13, 14, 15);
          background-image: linear-gradient(rgb(16,17,18), rgb(19,20,21));
        }
        svg path { fill: rgb(22, 23, 24); }
      </style>
      <div id="box">text</div>
      <svg width="10" height="10"><path d="M0 0 L10 10" id="svgpath"/></svg>
    `);
    const box = await getComputed(page, '#box', ['color', 'background-color', 'border-top-color', 'outline-color', 'box-shadow', 'background-image']);
    const svg = await getComputed(page, '#svgpath', ['fill']);
    record('1-forced-colors-overrides', 'color under forced-colors', 'overridden to a system color (not rgb(1,2,3))', box.color, box.color !== 'rgb(1, 2, 3)' ? 'confirmed' : 'refuted');
    record('1-forced-colors-overrides', 'background-color under forced-colors', 'overridden to a system color', box['background-color'], box['background-color'] !== 'rgb(4, 5, 6)' ? 'confirmed' : 'refuted');
    record('1-forced-colors-overrides', 'border-color under forced-colors', 'overridden to a system color', box['border-top-color'], box['border-top-color'] !== 'rgb(7, 8, 9)' ? 'confirmed' : 'refuted');
    record('1-forced-colors-overrides', 'outline-color under forced-colors', 'overridden to a system color', box['outline-color'], box['outline-color'] !== 'rgb(10, 11, 12)' ? 'confirmed' : 'refuted');
    record('1-forced-colors-overrides', 'box-shadow under forced-colors', 'suppressed to none per spec unless forced-color-adjust:none', box['box-shadow'], box['box-shadow'] === 'none' ? 'confirmed' : 'refuted');
    record('1-forced-colors-overrides', 'background-image under forced-colors', 'gradient/background-image suppressed to none (removed for non-widget elements)', box['background-image'], box['background-image'] === 'none' ? 'confirmed' : 'refuted');
    record('1-forced-colors-overrides', 'SVG fill under forced-colors', 'overridden to a system color (CanvasText typically)', svg.fill, svg.fill !== 'rgb(22, 23, 24)' ? 'confirmed' : 'refuted');
    await ctx.close();
  }

  // ===================================================================
  // SECTION 2: does forced-colors override !important / cascade layer / custom-property-sourced values?
  // ===================================================================
  {
    const ctx = await browser.newContext({ forcedColors: 'active', colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.setContent(`
      <style>
        #important { color: rgb(100, 0, 0) !important; }

        @layer base {
          #layered { color: rgb(0, 100, 0) !important; }
        }

        :root { --my-color: rgb(0, 0, 100); }
        #viaVar { color: var(--my-color); }
      </style>
      <div id="important">a</div>
      <div id="layered">b</div>
      <div id="viaVar">c</div>
    `);
    const imp = await getComputed(page, '#important', ['color']);
    const layered = await getComputed(page, '#layered', ['color']);
    const viaVar = await getComputed(page, '#viaVar', ['color']);
    record('2-important-layer-var', '!important color under forced-colors', 'still overridden (UA forced-colors defeats author !important)', imp.color, imp.color !== 'rgb(100, 0, 0)' ? 'confirmed' : 'refuted');
    record('2-important-layer-var', '@layer + !important color under forced-colors', 'still overridden', layered.color, layered.color !== 'rgb(0, 100, 0)' ? 'confirmed' : 'refuted');
    record('2-important-layer-var', 'custom-property-sourced color under forced-colors', 'still overridden (forced-colors overrides used value regardless of origin)', viaVar.color, viaVar.color !== 'rgb(0, 0, 100)' ? 'confirmed' : 'refuted');
    await ctx.close();
  }

  // ===================================================================
  // SECTION 3: forced-color-adjust: none
  // ===================================================================
  {
    const ctx = await browser.newContext({ forcedColors: 'active', colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.setContent(`
      <style>
        #restored {
          color: rgb(1, 2, 3);
          background-color: rgb(4, 5, 6);
          forced-color-adjust: none;
        }
        #normal {
          color: rgb(1, 2, 3);
          background-color: rgb(4, 5, 6);
        }
      </style>
      <div id="restored">restored</div>
      <div id="normal">normal</div>
    `);
    const restored = await getComputed(page, '#restored', ['color', 'background-color']);
    const normal = await getComputed(page, '#normal', ['color', 'background-color']);
    record('3-forced-color-adjust-none', 'color with forced-color-adjust:none', 'author color rgb(1,2,3) restored', restored.color, restored.color === 'rgb(1, 2, 3)' ? 'confirmed' : 'refuted');
    record('3-forced-color-adjust-none', 'background-color with forced-color-adjust:none', 'author bg rgb(4,5,6) restored', restored['background-color'], restored['background-color'] === 'rgb(4, 5, 6)' ? 'confirmed' : 'refuted');
    record('3-forced-color-adjust-none', 'control: sibling without forced-color-adjust:none stays overridden', 'differs from restored element (proves the property is the cause)', `normal.color=${normal.color} vs restored.color=${restored.color}`, normal.color !== restored.color ? 'confirmed' : 'refuted');
    await ctx.close();
  }

  // ===================================================================
  // SECTION 4: system-color keywords usable as token values
  // ===================================================================
  {
    // Outside forced-colors: do these keywords resolve to *something* sane (not invalid)?
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.setContent(`
      <style>
        #canvastext { color: CanvasText; }
        #canvas { background-color: Canvas; }
        #linktext { color: LinkText; }
        #buttonface { background-color: ButtonFace; }
        #highlight { background-color: Highlight; }
      </style>
      <div id="canvastext">a</div>
      <div id="canvas">b</div>
      <div id="linktext">c</div>
      <div id="buttonface">d</div>
      <div id="highlight">e</div>
    `);
    const vals = {};
    for (const [id, prop] of [['canvastext', 'color'], ['canvas', 'background-color'], ['linktext', 'color'], ['buttonface', 'background-color'], ['highlight', 'background-color']]) {
      const r = await getComputed(page, '#' + id, [prop]);
      vals[id] = r[prop];
    }
    record('4-system-color-keywords', 'CanvasText resolves (not "invalid"/empty) outside forced-colors', 'a valid rgb() value', vals.canvastext, /^rgb/.test(vals.canvastext) ? 'confirmed' : 'refuted');
    record('4-system-color-keywords', 'Canvas resolves outside forced-colors', 'a valid rgb() value', vals.canvas, /^rgb/.test(vals.canvas) ? 'confirmed' : 'refuted');
    record('4-system-color-keywords', 'LinkText resolves outside forced-colors', 'a valid rgb() value', vals.linktext, /^rgb/.test(vals.linktext) ? 'confirmed' : 'refuted');
    record('4-system-color-keywords', 'ButtonFace resolves outside forced-colors', 'a valid rgb() value', vals.buttonface, /^rgb/.test(vals.buttonface) ? 'confirmed' : 'refuted');
    record('4-system-color-keywords', 'Highlight resolves outside forced-colors', 'a valid rgb() value', vals.highlight, /^rgb/.test(vals.highlight) ? 'confirmed' : 'refuted');
    await ctx.close();

    // Also check they actually change value under forced-colors (dark) vs light-mode forced-colors, proving they track the forced palette
    const ctxFC = await browser.newContext({ forcedColors: 'active', colorScheme: 'dark' });
    const pageFC = await ctxFC.newPage();
    await pageFC.setContent(`<style>#c{color:CanvasText;background-color:Canvas;}</style><div id="c">x</div>`);
    const fcVals = await getComputed(pageFC, '#c', ['color', 'background-color']);
    record('4-system-color-keywords', 'CanvasText/Canvas under forced-colors dark scheme differ from light-mode values captured above', `dark forced-colors CanvasText != light non-forced CanvasText (${vals.canvastext})`, `color=${fcVals.color} bg=${fcVals['background-color']}`, fcVals.color !== vals.canvastext ? 'confirmed' : 'refuted');
    await ctxFC.close();
  }

  // ===================================================================
  // SECTION 5: light-dark() resolves against color-scheme; single declaration
  // ===================================================================
  {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await page.setContent(`
        <style>
          :root { color-scheme: light dark; }
          #tok { color: light-dark(rgb(10,10,10), rgb(240,240,240)); }
        </style>
        <div id="tok">x</div>
      `);
      const r = await getComputed(page, '#tok', ['color']);
      const expected = scheme === 'light' ? 'rgb(10, 10, 10)' : 'rgb(240, 240, 240)';
      record('5-light-dark', `light-dark() resolves correctly under prefers colorScheme=${scheme}`, expected, r.color, r.color === expected ? 'confirmed' : 'refuted');
      await ctx.close();
    }

    // single declaration, no duplicate light/dark blocks needed -> a naive
    // "every token must appear in both a light and dark block" linter would
    // false-positive on this file since there is exactly ONE declaration of #tok color.
    const cssSource = `:root { color-scheme: light dark; } #tok { color: light-dark(rgb(10,10,10), rgb(240,240,240)); }`;
    const declCount = (cssSource.match(/#tok\s*{[^}]*color:/g) || []).length;
    record('5-light-dark', 'token declared exactly once in source (naive dual-block linter would flag this as missing a dark declaration)', '1 declaration site', `${declCount} declaration site(s) of #tok color, both light and dark values live inside light-dark() on ONE line`, declCount === 1 ? 'confirmed' : 'refuted');

    // explicit data-theme override interacting with color-scheme: does light-dark
    // follow prefers-color-scheme (colorScheme context) or an explicit color-scheme
    // property set via attribute-driven CSS? Test element-level color-scheme override.
    const ctx2 = await browser.newContext({ colorScheme: 'dark' });
    const page2 = await ctx2.newPage();
    await page2.setContent(`
      <style>
        html { color-scheme: light dark; }
        [data-theme="light"] { color-scheme: light; }
        #tok { color: light-dark(rgb(10,10,10), rgb(240,240,240)); }
      </style>
      <div id="tok">x</div>
    `);
    const beforeAttr = await getComputed(page2, '#tok', ['color']);
    await page2.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const afterAttr = await getComputed(page2, '#tok', ['color']);
    record('5-light-dark', 'OS prefers dark, but [data-theme=light] sets color-scheme:light on html -> light-dark() follows the CSS color-scheme property, not the OS', `before=rgb(240,240,240) (OS dark), after=rgb(10,10,10) (forced light via attribute)`, `before=${beforeAttr.color}, after=${afterAttr.color}`, (beforeAttr.color === 'rgb(240, 240, 240)' && afterAttr.color === 'rgb(10, 10, 10)') ? 'confirmed' : 'refuted');
    await ctx2.close();
  }

  // ===================================================================
  // SECTION 6: @property - type checking, inherits, animatability, invalid fallback
  // ===================================================================
  {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();

    // 6a: type checking - invalid value for a typed custom property falls back to initial-value, NOT inherited/ignored
    await page.setContent(`
      <style>
        @property --my-color {
          syntax: '<color>';
          inherits: false;
          initial-value: rgb(255, 0, 0);
        }
        #parent { --my-color: rgb(0, 255, 0); }
        #child {
          --my-color: not-a-color;  /* invalid per registered syntax */
          background-color: var(--my-color);
        }
      </style>
      <div id="parent"><div id="child">x</div></div>
    `);
    const child = await getComputed(page, '#child', ['background-color']);
    record('6-at-property', 'invalid value against registered <color> syntax falls back to initial-value (not inherited from parent, not ignored/transparent)', 'rgb(255, 0, 0) (the initial-value, NOT parent green rgb(0,255,0))', child['background-color'], child['background-color'] === 'rgb(255, 0, 0)' ? 'confirmed' : 'refuted');

    // 6b: inherits:false vs inherits:true - does child see parent's value when its own is valid-but-unset?
    await page.setContent(`
      <style>
        @property --inh-false {
          syntax: '<color>';
          inherits: false;
          initial-value: rgb(1, 1, 1);
        }
        @property --inh-true {
          syntax: '<color>';
          inherits: true;
          initial-value: rgb(2, 2, 2);
        }
        #parent2 { --inh-false: rgb(9, 9, 9); --inh-true: rgb(8, 8, 8); }
        #child2a { background-color: var(--inh-false); }
        #child2b { background-color: var(--inh-true); }
      </style>
      <div id="parent2"><div id="child2a">a</div><div id="child2b">b</div></div>
    `);
    const c2a = await getComputed(page, '#child2a', ['background-color']);
    const c2b = await getComputed(page, '#child2b', ['background-color']);
    record('6-at-property', 'inherits:false property: child does NOT see parent value, falls back to initial-value', 'rgb(1, 1, 1) (initial-value, not parent rgb(9,9,9))', c2a['background-color'], c2a['background-color'] === 'rgb(1, 1, 1)' ? 'confirmed' : 'refuted');
    record('6-at-property', 'inherits:true property: child DOES see parent value', 'rgb(8, 8, 8) (inherited from parent)', c2b['background-color'], c2b['background-color'] === 'rgb(8, 8, 8)' ? 'confirmed' : 'refuted');

    // 6c: animatability. Transition ONLY the custom property itself (not a derived
    // native property, which would confound the result since e.g. plain `width`
    // transitions are native regardless of what feeds --custom-prop). Read the
    // custom property's own computed value via getPropertyValue at each sample.
    // NOTE: an earlier version of this probe transitioned `width` (fed by the
    // custom prop) and got contaminated readings (width interpolated for BOTH
    // registered and unregistered cases, because `width` itself is natively
    // animatable independent of --custom-prop registration). Fixed by isolating
    // the transition to the custom property declaration itself, per
    // debug_anim2.js in this directory.
    await page.setContent(`
      <style>
        @property --w {
          syntax: '<length>';
          inherits: false;
          initial-value: 0px;
        }
        #anim {
          width: var(--w);
          transition: --w 3s linear;
          background: red;
          height: 10px;
        }
        #anim2 {
          --w2: 0px;
          width: var(--w2);
          transition: --w2 3s linear;
          background: blue;
          height: 10px;
        }
      </style>
      <div id="anim"></div>
      <div id="anim2"></div>
    `);
    // force initial style/layout to flush before mutating, so the change is a
    // genuine second recalculation (a transition trigger), not coalesced into
    // the first style resolution.
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => {
      document.getElementById('anim').style.setProperty('--w', '900px');
      document.getElementById('anim2').style.setProperty('--w2', '900px');
    });
    await page.waitForTimeout(1000); // 1s into a 3s linear transition -> ~300px expected if interpolating
    const midSample = await page.evaluate(() => {
      const a = document.getElementById('anim');
      const b = document.getElementById('anim2');
      return {
        registeredProp: getComputedStyle(a).getPropertyValue('--w').trim(),
        unregisteredProp: getComputedStyle(b).getPropertyValue('--w2').trim(),
      };
    });
    const regNum = parseFloat(midSample.registeredProp);
    record('6-at-property', 'registered <length> custom property (@property, transition on the custom prop itself) interpolates smoothly (mid-sample strictly between 0 and 900px)', '0 < --w < 900px at ~1s into a 3s linear transition (~300px)', midSample.registeredProp, (regNum > 0 && regNum < 900) ? 'confirmed' : 'refuted', 'see debug_anim2.js for full time-series (55px@200ms -> 900px@3.2s, matches linear interpolation)');
    record('6-at-property', 'CONTROL: unregistered custom property does NOT interpolate (discrete flip: jumps straight to end value, no smooth transition even though `transition: --w2 3s linear` is declared)', '--w2 == 900px at 1s (already at end value, not ~300px)', midSample.unregisteredProp, midSample.unregisteredProp === '900px' ? 'confirmed' : 'refuted', 'unregistered custom properties are <token-stream>/*, which the transition spec treats as discrete-animatable only, i.e. an instant flip at some point in [0,duration], not interpolation');

    await ctx.close();
  }

  // ===================================================================
  // SECTION 7: prefers-color-scheme vs data-theme; color-scheme effect on form controls/scrollbar
  // ===================================================================
  {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.setContent(`
      <style>
        :root { background: white; }
        @media (prefers-color-scheme: dark) {
          :root { background: black; }
        }
        [data-theme="light"] { background: yellow !important; }
      </style>
    `);
    const rootBg1 = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    const rootBg2 = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    record('7-prefers-vs-attr', 'prefers-color-scheme:dark media query applies when OS/context is dark', 'rgb(0, 0, 0)', rootBg1, rootBg1 === 'rgb(0, 0, 0)' ? 'confirmed' : 'refuted');
    record('7-prefers-vs-attr', 'explicit [data-theme=light] selector (author-controlled attribute) overrides the media query result once matched', 'rgb(255, 255, 0)', rootBg2, rootBg2 === 'rgb(255, 255, 0)' ? 'confirmed' : 'refuted', 'proves data-theme is a normal selector that competes on specificity/source order, NOT a media feature; media query does not react to the attribute at all - it stays governed by OS colorScheme');

    // color-scheme property effect on UA-styled form control (color input / native widget) background
    await page.setContent(`
      <style>
        #noscheme { color-scheme: light; background: Field; color: FieldText; }
        #darkscheme { color-scheme: dark; background: Field; color: FieldText; }
      </style>
      <div id="noscheme">a</div>
      <div id="darkscheme">b</div>
    `);
    const a = await getComputed(page, '#noscheme', ['background-color', 'color']);
    const b = await getComputed(page, '#darkscheme', ['background-color', 'color']);
    record('7-prefers-vs-attr', 'color-scheme:light vs color-scheme:dark changes resolved value of Field/FieldText system colors on the SAME element (no forced-colors active)', 'differing background-color between the two elements', `light: bg=${a['background-color']} color=${a.color} | dark: bg=${b['background-color']} color=${b.color}`, a['background-color'] !== b['background-color'] ? 'confirmed' : 'refuted', 'demonstrates color-scheme drives system-color/native-widget resolution independent of forced-colors');
    await ctx.close();
  }

  // ===================================================================
  // RED CONTROLS: deliberately-wrong assertions that MUST report refuted,
  // proving the harness can go red.
  // ===================================================================
  const redControls = [];
  {
    const ctx = await browser.newContext({ forcedColors: 'active', colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.setContent(`<style>#x{color:rgb(1,2,3);}</style><div id="x">t</div>`);
    const r = await getComputed(page, '#x', ['color']);
    // deliberately WRONG expectation: claim forced-colors does NOT change color (it does)
    const v1 = r.color === 'rgb(1, 2, 3)' ? 'confirmed' : 'refuted';
    record('RED-CONTROL', 'deliberately false claim: forced-colors leaves author color rgb(1,2,3) untouched', 'rgb(1, 2, 3) [intentionally wrong expectation]', r.color, v1);
    redControls.push(`forced-colors-untouched-color claim -> ${v1} (expected refuted to prove harness detects failure)`);
    await ctx.close();
  }
  {
    // deliberately WRONG: claim light-dark() ignores color-scheme and always picks the light value
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.setContent(`<style>:root{color-scheme:light dark;} #x{color:light-dark(rgb(10,10,10),rgb(240,240,240));}</style><div id="x">t</div>`);
    const r = await getComputed(page, '#x', ['color']);
    const v2 = r.color === 'rgb(10, 10, 10)' ? 'confirmed' : 'refuted';
    record('RED-CONTROL', 'deliberately false claim: light-dark() always resolves to the light value regardless of color-scheme', 'rgb(10, 10, 10) [intentionally wrong expectation, OS is dark]', r.color, v2);
    redControls.push(`light-dark-always-light claim -> ${v2} (expected refuted to prove harness detects failure)`);
    await ctx.close();
  }

  await browser.close();

  console.log('\n\n=== RED CONTROL SUMMARY ===');
  redControls.forEach(c => console.log(' - ' + c));

  console.log('\n\n=== JSON RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
})();

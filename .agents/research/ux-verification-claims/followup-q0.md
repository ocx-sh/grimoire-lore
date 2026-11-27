---
title: "UX-VERIFY follow-up q0: matrix error rate of newClipped, noRing and fullyObscured"
program: product
topic: ux-verification-claims
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 1
---

# Follow-up q0: matrix error rate

## Question

On 20 or more routes, how often do `newClipped`, `noRing` (after the ancestor pass) and `fullyObscured` disagree with a human viewing the same page, and which of these checks may then block?

## Answer

**The human-agreement rate was not measured: no human was available.** What was measured on 33 routes: how often each check fires, whether the ancestor pass (UX-VERIFY-16) removes `noRing` firings, and, for 7 firings, whether the page supports them. The "supports" label was set by this agent (screenshot viewed, or DOM state measured), not by a human. It is a proxy and gives no error rate.

1. Firing rates, 33 routes. `newClipped` 2 routes (6 %). `noRing` before the ancestor pass 3 routes (9 %), after it 2 routes (6 %): 25 flagged stops fall to 14. `fullyObscured` 4 routes (12 %), 6 flagged stops.
2. Agent labels on 7 distinct firings (one per route, check and element, counting repeats across rows once): 3 true, 4 false. Exact 95 % interval on the true share is 10 % to 82 % (command below), so the sample cannot rank the checks.
   - `newClipped`: 2 examined (`/` false, `/catalog/` true).
   - `noRing`: 1 examined (`/team/`, false, cleared by the ancestor pass). The 14 stops left after the pass were not viewed.
   - `fullyObscured`: 4 examined (2 false, 2 true).
3. **The `fullyObscured` false positives have an isolated cause, and the fix was tested.** Two of the four firings are inline links that wrap onto two lines. The 9 sample points sit on the bounding box of the whole link, so they land in the gap between the line boxes and hit the parent. Sampling 9 points inside each `getClientRects()` rectangle removes both and keeps both true firings (a fixed "Contents" pill that covers the focused link at 400 % zoom). Evidence below.
4. `noRing` after the ancestor pass: measured as asked. The pass clears the `/team/` cards (9 stops, all cleared at the second ancestor) and 2 stops on `/`. It does not clear the command-bar "Copy Add command" stop on `/` (1 stop in each of the desktop and forced rows), the 11 stops on `/` at 400 % zoom, or one `pre` on `/catalog/docs/how-to/announce-a-package/`. I did not view these 14 stops, so their error rate is unknown.
5. **No check may block on this evidence.** All three stay advisory. `fullyObscured` with line-box sampling is the best candidate for a later promotion: 0 false firings in the 4 routes where it was re-run. That is 4 routes and agent labels, not a basis for blocking.

## Measurements

Throwaway directory: `~/.cache/research-lang/exemplars/product/wave2/uxv-q0/`. All commands run on 2026-11-27.

Versions (commands and output):

```
$ node -e "console.log(require('./node_modules/playwright-core/package.json').version)"
1.63.0
$ chrome --version
Google Chrome for Testing 159.0.8154.6
$ node --version
v26.13.1
```

`node_modules` is a symlink to the fleet's `ocx-sh/website/node_modules`, read only.

Pages, 33 routes. The ocx.sh site build (`ocx-sh/website/site/dist`, 4 routes) was served with `python3 -m http.server 4401`. The catalog build (`ocx-sh/index/dist`, 29 routes, under a symlink `/catalog/`) was served on port 4402. The catalog is Astro with the OCX theme, not Starlight proper, and no MkDocs indexer build exists on this machine, so the commission's Starlight and indexer scope is only partly covered. Routes:

```
/  /apps/  /integrations/  /team/
/catalog/ /catalog/astral-sh/uv/ /catalog/docs/ /catalog/docs/explanation/ /catalog/docs/explanation/architecture/ /catalog/docs/how-to/ /catalog/docs/how-to/announce-a-package/ /catalog/docs/how-to/claim-a-namespace/ /catalog/docs/how-to/yank-a-version/ /catalog/docs/ops/ /catalog/docs/ops/m1-flip/ /catalog/docs/ops/run-reconcile-dry-run/ /catalog/docs/privacy/ /catalog/docs/reference/ /catalog/docs/reference/changelog/ /catalog/docs/reference/entry-schema/ /catalog/docs/reference/governance-contracts/ /catalog/docs/reference/namespace-policy/ /catalog/docs/reference/wire-format/ /catalog/gitlab-org/glab/ /catalog/hashicorp/terraform/ /catalog/kitware/cmake/ /catalog/mitchellh/packer/ /catalog/mvdan/shfmt/ /catalog/nginxinc/nginx/ /catalog/oven-sh/bun/ /catalog/regclient/regsync/ /catalog/sigstore/cosign/ /catalog/ziglang/zig/
```

### A. Original matrix run (unchanged appendix script, no ancestor pass)

The script is the appendix of [rendered-interaction-matrix.md](rendered-interaction-matrix.md), copied unchanged to `ui-matrix.mjs`. Commands, with the 29 routes taken from `find dist -name index.html` exactly as in `run.sh`:

```
node ui-matrix.mjs http://127.0.0.1:4401 out1.json / /apps/ /integrations/ /team/
node ui-matrix.mjs http://127.0.0.1:4402 out2.json /catalog/ /catalog/astral-sh/uv/ ... /catalog/ziglang/zig/   (the 29 routes listed above)
```

Run totals: `total 36722ms, 9 failing conditions` and `total 362783ms, 40 failing conditions`. Raw output of the summary script `sum.mjs` (verbatim):

```
$ node sum.mjs
routes 33 keys cond pass ms viewport newClipped scrollW clientW hscroll wide clippedText clippedList bg bgLuminance dataTheme matches optOut invisibleText iconOnlyNoBorder no-preference scrollBehavior reduce stops lost unnamed noRing fullyObscured partlyObscured capped first
newClipped routes flagged: 2 
  / reflow-320,zoom-200,zoom-400
  /catalog/ reflow-320,zoom-200,zoom-400
noRing routes flagged: 3 
  / tabwalk-desktop:1,tabwalk-zoom400:13,tabwalk-forced:1
  /team/ tabwalk-desktop:3,tabwalk-zoom400:3,tabwalk-forced:3
  /catalog/docs/how-to/announce-a-package/ tabwalk-zoom400:1
fullyObscured routes flagged: 4 
  /catalog/docs/how-to/claim-a-namespace/ tabwalk-desktop:1,tabwalk-forced:1
  /catalog/docs/ops/m1-flip/ tabwalk-zoom400:1
  /catalog/docs/ops/run-reconcile-dry-run/ tabwalk-zoom400:1
  /catalog/docs/reference/wire-format/ tabwalk-desktop:1,tabwalk-forced:1
hscroll routes flagged: 11 
  /catalog/ reflow-320,zoom-400
  /catalog/docs/explanation/architecture/ reflow-320,zoom-200,zoom-400
  /catalog/docs/how-to/announce-a-package/ reflow-320,zoom-200,zoom-400
  /catalog/docs/how-to/yank-a-version/ reflow-320,zoom-200,zoom-400
  /catalog/docs/ops/m1-flip/ reflow-320,zoom-200,zoom-400
  /catalog/docs/ops/run-reconcile-dry-run/ reflow-320,zoom-200,zoom-400
  /catalog/docs/reference/changelog/ reflow-320,zoom-200,zoom-400
  /catalog/docs/reference/entry-schema/ reflow-320,zoom-200,zoom-400
  /catalog/docs/reference/governance-contracts/ reflow-320,zoom-200,zoom-400
  /catalog/docs/reference/namespace-policy/ reflow-320,zoom-200,zoom-400
  /catalog/docs/reference/wire-format/ reflow-320,zoom-200,zoom-400
unnamed routes flagged: 0 
  
capped routes flagged: 0 
  
lost routes flagged: 0 
```

One correction to the first version of this file: `/catalog/` hscroll fires at `reflow-320` and `zoom-400` only, not at `zoom-200` (at 640 px the page does not scroll).

### B. Ancestor pass run (UX-VERIFY-16 implemented, tab walks only)

`ui-matrix-anc.mjs` is `ui-matrix.mjs` with two additions in `tabWalk`. (1) When the focused-versus-blurred diff of the element's own clip shows no change, the same diff is taken on the clips of the nearest two ancestors (`parentElement` and its parent, stopping at `body`, each rectangle grown by 6 px and clamped to the viewport). A change on either ancestor clears the stop and records `anc1` or `anc2`. (2) For every fully obscured stop it records the stop's rectangle, its scroll `y` and the tag and class of each element that the sample points hit. The layout, scheme, forced-colours and motion rows are removed, so this run covers `noRing` and `fullyObscured` only. Command and result:

```
$ bash run-anc.sh        # = node ui-matrix-anc.mjs <base> anc1.json|anc2.json <routes above>
total 25096ms, 3 failing conditions      (4 routes, anclog1.txt)
total 247540ms, 7 failing conditions     (29 routes, anclog2.txt)
```

Summary (script `sum-anc.mjs`, verbatim output):

```
$ node sum-anc.mjs
NORING / tabwalk-desktop ["button.ocx-cmdbar__trigger#18:Copy Add command [none 3px off=2px] y=970"]
NORING / tabwalk-zoom400 ["button.ocx-ui-select__control#6:Shell: Shell [none 3px off=2px] y=476","button.ocx-cmdbar__trigger#7:Copy Shell install comma [none 3px off=2px] y=595","a.#8:get started → [solid 2px off=2px] y=606","a.#9:catalog [solid 2px off=2px] y=606","a.#10:learn [solid 2px off=2px] y=606","a.#11:github [solid 2px off=2px] y=675","button.#12:Copy to clipboard [solid 2px off=2px] y=696","pre.#13: [solid 2px off=2px] y=780","button.#14:Copy to clipboard [solid 2px off=2px] y=780","pre.#15: [solid 2px off=2px] y=786","button.#16:Copy to clipboard [solid 2px off=2px] y=810"]
CLEARED / tabwalk-zoom400 a#19:all integrations → anc1
CLEARED / tabwalk-zoom400 a#24:how verification wor anc1
NORING / tabwalk-forced ["button.ocx-cmdbar__trigger#18:Copy Add command [none 3px off=2px] y=970"]
CLEARED /team/ tabwalk-desktop a#20:Discord anc2
CLEARED /team/ tabwalk-desktop a#21:GitHub anc2
CLEARED /team/ tabwalk-desktop a#22:Security anc2
CLEARED /team/ tabwalk-zoom400 a#13:Discord anc2
CLEARED /team/ tabwalk-zoom400 a#14:GitHub anc2
CLEARED /team/ tabwalk-zoom400 a#15:Security anc2
CLEARED /team/ tabwalk-forced a#20:Discord anc2
CLEARED /team/ tabwalk-forced a#21:GitHub anc2
CLEARED /team/ tabwalk-forced a#22:Security anc2
NORING /catalog/docs/how-to/announce-a-package/ tabwalk-zoom400 ["pre.astro-code#17:# At job level, alongsid [solid 2px off=2px] y=2717"]
OBSCURED /catalog/docs/how-to/claim-a-namespace/ tabwalk-desktop a#35:Entry Schema rect={"x":302,"y":523,"w":645,"h":46} y=0 hits=code|p(ancestor)
OBSCURED /catalog/docs/how-to/claim-a-namespace/ tabwalk-forced a#35:Entry Schema rect={"x":302,"y":523,"w":645,"h":46} y=0 hits=code|p(ancestor)
OBSCURED /catalog/docs/ops/m1-flip/ tabwalk-zoom400 a#13:Run a Reconcile Dry Run rect={"x":-148,"y":134,"w":461,"h":46} y=559 hits=p(ancestor)|button.ocx-ui-button
OBSCURED /catalog/docs/ops/run-reconcile-dry-run/ tabwalk-zoom400 a#10:M-1 Flip rect={"x":237,"y":139,"w":59,"h":20} y=957 hits=button.ocx-ui-button
OBSCURED /catalog/docs/reference/wire-format/ tabwalk-desktop a#52:Entry Schema rect={"x":330,"y":370,"w":685,"h":46} y=2521 hits=li(ancestor)
OBSCURED /catalog/docs/reference/wire-format/ tabwalk-forced a#52:Entry Schema rect={"x":330,"y":370,"w":685,"h":46} y=2521 hits=li(ancestor)
routes 33 noRing stops before ancestor pass 25 cleared by ancestor 11 remaining 14 | routes with noRing before 3 after 2 | fullyObscured stops 6 routes 4
```

Reading the 14 remaining `noRing` stops: the `/` desktop and forced stop is the command-bar "Copy Add command" button, whose own outline is `none`. The theme draws the ring on the field with `.ocx-cmdbar__field:has(.ocx-cmdbar__trigger:focus-visible)` (`ocx-sh/website/packages/theme/src/components/ui/command-bar.css:124-126`, read 2026-11-27). My two-ancestor pass did not detect it. Whether that is a defect or a limit of my pass (the ring is an inset outline, and `:focus-visible` may not hold after the script's blur and refocus) was not isolated. The 11 stops at 400 % zoom on `/` have `solid 2px` outlines and show no pixel change: this is the wave-1 unresolved "blank stops at 400 %" family, not resolved here.

### C. Why `fullyObscured` fired: isolation and a tested fix

Commands `node dbg.mjs` and `node dbg2.mjs` (Playwright, same Chromium) pressed Tab to the flagged stop and printed the link's line rectangles and what `elementFromPoint` returns at the centre of each (output verbatim):

```
$ node dbg2.mjs
wire-format desktop #52 {"el":"a","text":"Entry Schema","display":"inline","lineRects":[[977,370,38,20],[330,396,58,20]],"hitAtCentreOfEachLineRect":["a(self) pos=static rect=330,370,685,46","a(self) pos=static rect=330,370,685,46"]}
claim-a-namespace desktop #35 {"el":"a","text":"Entry Schema","display":"inline","lineRects":[[909,523,38,20],[302,549,58,20]],"hitAtCentreOfEachLineRect":["a(self) pos=static rect=302,523,645,46","a(self) pos=static rect=302,523,645,46"]}
run-reconcile zoom400 #10 {"el":"a","text":"M-1 Flip","display":"inline","lineRects":[[237,139,59,20]],"hitAtCentreOfEachLineRect":["button.ocx-ui-button pos=fixed rect=202,130,106,38"]}
m1-flip zoom400 #13 {"el":"a","text":"Run a Reconcile Dry Run","display":"inline","lineRects":[[198,134,115,20],[-148,160,57,20]],"hitAtCentreOfEachLineRect":["button.ocx-ui-button pos=fixed rect=202,130,106,38","null"]}
```

Reading: on `wire-format` and `claim-a-namespace` the link wraps onto two lines (two line rectangles, 38 by 20 and 58 by 20). Its bounding box is 685 by 46, much larger than the text. Both line rectangles hit the link itself. The old nine sample points on the bounding box all fell in the gap and hit `li` or `p`, so they were reported as hidden. On `run-reconcile-dry-run` the link (237..296 by 139..159) lies entirely inside a `position: fixed` `button.ocx-ui-button` (202..308 by 130..168). `m1-flip` has the same pill over line 1 and line 2 off-screen at x=-148.

Tested fix: `ui-matrix-anc3.mjs` samples 9 points (3 by 3) inside each `getClientRects()` rectangle that intersects the viewport, instead of the bounding box. Command and result (verbatim, `fullyObscured` per walk row):

```
$ node ui-matrix-anc3.mjs http://127.0.0.1:4402 lb9.json /catalog/docs/how-to/claim-a-namespace/ /catalog/docs/ops/m1-flip/ /catalog/docs/ops/run-reconcile-dry-run/ /catalog/docs/reference/wire-format/
total 43383ms, 2 failing conditions
claim-a-namespace  desktop []   zoom400 []   forced []
m1-flip            desktop []   zoom400 ["a#13:Run a Reconcile Dry Run rect={x:-148,y:134,w:461,h:46} y=559 hits=button"]   forced []
run-reconcile      desktop []   zoom400 ["a#10:M-1 Flip rect={x:237,y:139,w:59,h:20} y=957 hits=button"]   forced []
wire-format        desktop []   zoom400 []   forced []
```

(The per-row lines were produced by `node -e` over `lb9.json` and are condensed here; the same JSON is in the directory.) A variant that took only the centre point of each line rectangle was also run (`ui-matrix-anc2.mjs`). It cleared the same desktop false positives but added zoom-400 firings on a 28 by 28 "Copy code" button and a permalink link that a single point cannot show to be entirely hidden. That is why the rule text below demands nine points per line rectangle.

### D. Agent-viewed evidence (not human)

`node shot.mjs` produced `s1.png`, `s2.png`, `s3.png` (no stdout). `node shot2.mjs` printed `s4.png {"active":"M-1 Flip","fixedBtn":{"label":null,"txt":"Contents","cls":"ocx-ui-button"}}` and produced `s4.png`, `s5.png`, `s6.png`; `node shot3.mjs` printed the two element lines below and produced `s7.png`. Verdicts:

| Firing | What the screenshot or state shows | Agent label |
|---|---|---|
| `hscroll`, `/catalog/docs/ops/m1-flip/` at 320 px (`scrollW 484, clientW 320`), objective check | prose and code run off the right edge, text cut mid-word (`s1.png`) | true positive. Not one of the 7 heuristic firings |
| `noRing`, `/team/` Discord, desktop | the card draws a clear 2 px red border while focused (`s2.png`); cleared by the ancestor pass at `anc2` | false positive of the raw script, resolved by UX-VERIFY-16 |
| `fullyObscured`, `wire-format` `Entry Schema` | link fully visible with a red ring (`s3.png`); cause is the two-line wrap (section C) | false positive |
| `fullyObscured`, `claim-a-namespace` `Entry Schema` | same two-line wrap, measured in section C, screenshot not taken | false positive (DOM measurement) |
| `fullyObscured`, `run-reconcile-dry-run` `M-1 Flip` at 320 by 180 | the link's place is under the fixed "Contents" pill, the text of the link is not visible (`s4.png`) | true positive |
| `fullyObscured`, `m1-flip` `Run a Reconcile Dry Run` at 320 by 180 | measured only (section C): line 1 under the same pill, line 2 at x=-148. Screenshot not taken | true positive (DOM measurement) |
| `newClipped`, `/catalog/` at 320 px (`div.chip-group`, `span.pkg-keywords`, `scrollW 345`) | filter chips and the view-toggle buttons run past the right edge, the "windows" chip is cut (`s6.png`) | true positive (the page also has hscroll) |
| `newClipped`, `/` at 320 px (`section.lp-hero`, `div.ocx-cmdbar__field`) | `section.lp-hero` has `overflow: clip`, `scrollW 590 / clientW 320`, but the headline, copy and buttons are intact (`s7.png`). The command bar has `overflow: auto`, `scrollW 374 / clientW 249`: the `curl` line is cut but scrollable | false positive (decorative clip plus a scroll container) |

```
$ node shot3.mjs
section.lp-hero overflow=clip/clip scrollW=590 clientW=320 scrollH=1029 clientH=1029
div.ocx-cmdbar__field overflow=auto/hidden scrollW=374 clientW=249 scrollH=36 clientH=36
```

Count: `newClipped` 1 true, 1 false; `noRing` 0 true, 1 false (the 14 post-pass stops unlabelled); `fullyObscured` 2 true, 2 false. Total 3 true, 4 false out of 7 firings.

Interval for the true share (script `cp.mjs`, exact binomial, 95 %):

```
$ node cp.mjs
true positives 3 of 7: exact 95% interval 10% to 82%
true positives 2 of 4: exact 95% interval 7% to 93%
true positives 1 of 2: exact 95% interval 1% to 99%
```

Correction of the first version of this file: it said "3 advisory firings examined, 3 false" and gave a "rule of three" bound without a source. The viewed `hscroll` is an objective check, not an advisory firing, and the first version never viewed `newClipped`. The rule of three applies to zero events only. For reference, [Wikipedia, Rule of three (statistics)](https://en.wikipedia.org/wiki/Rule_of_three_(statistics)) (page last modified 2025-11-16, secondary source; it cites Hanley and Lippman-Hand, JAMA 249(13):1743-5, 1983) says: "if a certain event did not occur in a sample with n subjects, the interval from 0 to 3/n is a 95% confidence interval". No firing counts here are zero, so it is not used.

## What could not be determined

- The disagreement rate with a human. Missing: at least one human reviewer to label every firing as defect or not on saved screenshots, for the 9 flagged routes plus a random sample of unflagged routes (misses need a human too). My labels are not a substitute.
- Why the "Copy Add command" stop on `/` is not cleared by the ancestor pass, and the cause of the 11 blank stops at 400 % zoom. Missing: a debug run that logs the outline of each of the nearest five ancestors and whether `:focus-visible` still matches after the script's blur and refocus.
- Post-pass `noRing` firings were not viewed (14 stops on 2 routes), so no `noRing` error rate exists after the pass.
- Starlight docs proper and the MkDocs indexer. Missing: built sites. Only the ocx.sh site and the catalog build were available.
- False negatives of all three checks (defects none flagged): not measurable without a human.

## Effect on the ruleset

| Rule | Effect |
|---|---|
| UX-VERIFY-13 | confirm: `newClipped` stays advisory. Decay row: change (below) |
| UX-VERIFY-14 | confirm: clipped text advisory, `hscroll` blocking. Measured block rate of `hscroll`: 11 of 33 routes |
| UX-VERIFY-15 | confirm `noRing` advisory; change the hit-test line; objective checks `unnamed`, `capped`, `lost` fired on 0 of 33 routes |
| UX-VERIFY-16 | confirm; add a Verify line (below) |
| UX-VERIFY-33 | new |

**UX-VERIFY-15, hit-test line: change.** Replace "a stop is entirely hidden: all nine sample points hit another element." with: "a stop is entirely hidden: for every rectangle in the stop's `getClientRects()` that intersects the viewport, all nine sample points (3 by 3 inside that rectangle) hit an element that is neither the stop nor its descendant. Sampling the bounding box of an inline link that wraps is not allowed. A Needs human review item names the covering element and its `position`." The cause is now isolated (section C), so this is no longer a hypothesis. Verification (an agent can run it): run the matrix with this sampling on the four routes `claim-a-namespace`, `m1-flip`, `run-reconcile-dry-run`, `wire-format`; the rule is implemented when the `fullyObscured` field is empty in the desktop and forced rows of all four routes and is non-empty in the `zoom400` row of `run-reconcile-dry-run` and `m1-flip` (the fixed "Contents" pill). Command: `node checks/ui-matrix.mjs <base> out.json <the four routes>` then `node -e` over `out.json` printing `route, cond, fullyObscured` (the run above gives exactly this result for `ui-matrix-anc3.mjs`). This run is against ocx.sh's catalog build; on another site the same four-way split need not exist, so the check is a regression check for the script, not for the site.

**UX-VERIFY-16, Verify line: add.** Append: "The script writes `noRingSelf` (stops whose own clip shows no change), `ancestorCleared` (entries tagged `anc1` or `anc2`) and `noRing` (the rest) for every walk row. The ancestor pass is implemented when, for every walk row, `noRingSelf = len(noRing) + len(ancestorCleared)` and every `ancestorCleared` entry ends in `anc1` or `anc2`. Run: `node chk16.mjs out.json` (script in the review skill), which prints `violations 0` and exits 0." Measured: on the 99 walk rows of this study the command prints `walk rows 99 violations 0` and exits 0 (output in section B's directory run: `node chk16.mjs anc1.json anc2.json`). The pass is a necessary but not a sufficient fix: it did not clear the command-bar stop on `/` (see "What could not be determined"), so a remaining `noRing` entry stays in Needs human review.

**UX-VERIFY-13, Decay row: change.** Add: "Study partly done 2026-11-27 on 33 routes (4 ocx.sh site, 29 catalog): firing rates `newClipped` 6 %, `noRing` 9 % before and 6 % after the ancestor pass, `fullyObscured` 12 %; 7 firings labelled by an agent, 3 true and 4 false (exact 95 % interval on the true share 10 % to 82 %); no human labels. Still open: human labels, the 14 post-pass `noRing` stops, and a second site type. Re-run when the script, the theme or the Chromium major changes." Verification: the row exists and quotes counts that a re-run reproduces. Run `node sum-anc.mjs` (from section B) and `node chk16.mjs anc1.json anc2.json` on the same build; the counts `25`, `11`, `14`, `6` and `4 routes` in the line must match the summary line `noRing stops before ancestor pass 25 cleared by ancestor 11 remaining 14 ... fullyObscured stops 6 routes 4`. A mismatch means the row is stale.

**New: UX-VERIFY-33 (CONSIDER).** Imperative: "Before the first blocking use of any matrix heuristic (`newClipped`, `noRing`, `fullyObscured`), have a human label every firing on at least 20 routes as defect or not-defect, and publish the counts of true and false positives with the route list." Rationale: no human-labelled rate exists; the agent-labelled sample is 3 true and 4 false of 7 firings and its interval spans 10 % to 82 %. Severity CONSIDER. Verification: `matrix-labels.csv` exists with the header `route,row,check,stop,label,labeller`; `awk -F, 'NR>1{r[$1]=1} END{print length(r)}' matrix-labels.csv` prints 20 or more; `awk -F, 'NR>1 && $5!="defect" && $5!="not-defect"' matrix-labels.csv` prints nothing; and `awk -F, 'NR>1 && $6 !~ /^human:/' matrix-labels.csv` prints nothing (an agent label does not count as human). The report states `n` and the count of `label=defect`.

Which check may block, one line: none. Promotion of `fullyObscured` needs UX-VERIFY-33 labels on the line-box sampling version first. I found no source that sets a false-positive threshold and I did not invent one: the owner sets it.

Site finding (not a rule): at 320 by 180 (400 % zoom) the fixed "Contents" button covers the focused links "M-1 Flip" and "Run a Reconcile Dry Run" on two docs pages, which is the case WCAG 2.4.11 (focus not obscured, minimum) fails when the component is entirely hidden, per the consolidation's citation of [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) (updated 2026-06-15; not re-fetched in this pass).

## Dated facts

- All measurements: 2026-11-27, Chrome for Testing 159.0.8154.6 (Playwright chromium build 1255), `playwright-core` 1.63.0, Node v26.13.1, local static servers, no CI.
- Run cost: 36.7 s for the 4-route original run, 362.8 s for the 29-route original run (about 12.5 s per route); the tab-walk-only ancestor run took 25.1 s and 247.5 s.
- Rule of three source: Wikipedia, page last modified 2025-11-16 (secondary source, fetched 2026-11-27).
- `command-bar.css:124-126` read 2026-11-27 from the local checkout of `ocx-sh/website`.

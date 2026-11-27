---
title: "UX-A11Y follow-up q1: false positives and negatives of focus_outline.py and colour_only.mjs on Primer and Radix"
program: product
topic: ux-a11y-authoring
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 24
---

# Follow-up q1: do the two check scripts hold on Primer and Radix?

## Question

How many false positives and false negatives do `focus_outline.py` (BEM ancestor heuristic) and
`colour_only.mjs` (class-list peers) give on Primer and Radix, before they ship as published
checks? (Open question 7 of `ux-a11y-authoring.md`; rules UX-A11Y-12 and UX-A11Y-19.)

This is the repaired version. Every number below now has its command and its output in the file.
Where the first version had an estimate, this version has a measurement or says plainly that it is
still an estimate.

## Answer in short

Neither script is ready to ship as a blocking check as written.

- `focus_outline.py` gave 30 FAIL and 5 PASS on the four corpora. 11 of the 30 FAIL are real and
  19 are false positives (precision 37%). It misses 41 real violations (3 in `.scss` files and 38
  `all: unset` rules whose only focus style is a `box-shadow`). Recall on the 52 known violations is
  11/52 = 21%.
- A prototype with fixes (a) to (d) is now measured (`focus_v2.mjs`, Node and PostCSS). On the
  outline-removal class it gives 27 FAIL: 14 real (recall 14 of 14) and 13 false positives
  (precision 52%). Two further fixes found during the measurement (skip vendor `::-webkit-*`
  sub-parts; accept a ring drawn on `::before`/`::after`) give 17 FAIL: 14 real and 3 false
  positives (precision 82%). That last figure is tuned on the same corpora, so it is an upper
  bound. The 3 remaining false positives are replacements in another file, which a selector-based
  check cannot find.
- `colour_only.mjs` raised 0 FAIL on 81 state elements (8 distinct computed-style signatures) on
  Primer and Radix documentation pages. It silently misses 1 real violation, the Radix docs side
  nav current item (tint only, measured 1.34:1, scored 3.27 by the script). A prototype with
  alpha blending (`colour_only_v2.mjs`) flags that item on all 10 Radix pages and raises 0 false
  FAIL on 10 Primer pages. The shipped script also crashes on a navigation timeout (3 of 10 and 5
  of 10 Radix pages loaded in two runs) and uses exit code 1 for both a crash and a finding.
  `networkidle2` does not cure the timeouts. `waitUntil: 'load'` plus a 1.5 s wait loaded 20 of 20
  pages.

## Method and what is ground truth

Everything ran in `~/.cache/research-lang/exemplars/product/wave2/a11y-q1/`. Nothing was installed
in, or changed in, any repository of the fleet. The raw logs quoted below are in `log/` of that
directory.

Corpora (shallow clones, 2026-11-27), commit and date from `git log -1 --format='%H %cs'`:

| Repo | Commit (date) |
|---|---|
| [primer/react](https://github.com/primer/react) | `7cf064cd860065c0614d575d78fe1632a0634e5d` (2026-11-25) |
| [primer/css](https://github.com/primer/css) | `36b09a05b75b46fd39364a52d1ad8995840c411a` (2026-11-25) |
| [radix-ui/themes](https://github.com/radix-ui/themes) | `1faff10ac26ae17f09944d418c6949b93fc6b566` (2026-04-11) |
| [radix-ui/website](https://github.com/radix-ui/website) | `402e749613ab2e7ab7139c65b0029842b0360f07` (2026-10-07) |

Setup commands:

```
git clone -q --depth 1 https://github.com/primer/react.git primer-react      # and primer/css, radix-ui/themes, radix-ui/website
awk '/^### A1\./{f=1} f&&/^```python/{p=1;next} p&&/^```$/{exit} p' ux-a11y-authoring.md > tools/focus_outline.py
awk '/^### A6\./{f=1} f&&/^```js/{p=1;next} p&&/^```$/{exit} p' ux-a11y-authoring.md > tools/colour_only.mjs
cmp gt/colour_only.mjs tools/colour_only.mjs && echo same-script      # prints: same-script
python3 -I tools/focus_outline.py --selftest                           # prints: selftest ok
```

The two shipped scripts are used verbatim from Appendix A1 and A6 of the consolidation.

Ground truth, stated precisely, because there is no oracle:

- Focus (UX-A11Y-12): a label is my reading of the CSS source against the rule text as written. A
  `box-shadow` alone is not a replacement; `:focus:not(:focus-visible)` removal is not a removal on
  keyboard focus; a rule on an element whose ring is drawn by a wrapper in another file is
  labelled "cross-file". The denominator is an independent enumerator (`gt/cand.mjs`, below), not
  the script under test.
- Colour (UX-A11Y-19): a label is the computed-style arithmetic printed by `gt/debug.mjs`,
  `gt/pseudo.mjs`, `gt/navbg.mjs` and `gt/parentcue.mjs` (quoted below), judged against the rule
  text. The greyscale screenshots from the first version are not used as evidence in this version;
  nothing here depends on a picture. A measured oracle (Tab through a built Storybook, diff the
  focused and blurred states) was not done; see "What could not be determined".

## Result 1: focus_outline.py

### The denominator (independent enumerator)

`gt/cand.mjs` parses every `.css` and `.scss` file with `postcss`, `postcss-scss` and
`postcss-nested` (nesting resolved) and prints every rule whose selector contains a focus
pseudo-class and which removes an outline (`outline: none|0|transparent`, `outline-style: none`,
`outline-width: 0`, `outline-color: transparent`, `all: unset`). It does not read the script
under test.

```
$ node cand.mjs ../primer-css/src          > cand-primer-css_src.jsonl        exit 0, 3 lines
$ node cand.mjs ../primer-react/packages   > cand-primer-react_packages.jsonl exit 0, 20 lines
$ node cand.mjs ../radix-themes/packages   > cand-radix-themes_packages.jsonl exit 0, 11 lines
$ node cand.mjs ../radix-website           > cand-radix-website.jsonl         exit 0, 13 lines
```

The 47 lines, abbreviated to file:line, selector and the removal (`log/cand-list.txt`):

```
primer-css/src/markdown/markdown-body.scss:61         .markdown-body .anchor:focus                      outline:none
primer-css/src/select-menu/select-menu.scss:398       .SelectMenu-tab:focus                             outline:0
primer-css/src/select-menu/select-menu.scss:398       .SelectMenu-item:focus                            outline:0
primer-react/packages/react/src/BaseStyles.module.css:40   [role='button'|tabpanel][tabindex='0']|button|summary|a:focus:not(:focus-visible):not(:global(.focus-visible))   outline:none   (5 selectors)
primer-react/packages/react/src/BaseStyles.module.css:49   [tabindex='0'] and details-dialog :focus:not(:focus-visible)...                 outline:none   (2 selectors)
primer-react/packages/react/config/vitest/browser/global.css:60,70   the same 7 selectors (a test-config copy)                            outline:none
primer-react/packages/react/src/Card/Card.module.css:191        .CardPrimaryAction[data-full-card-hit-area='true']:focus-visible   outline:none
primer-react/packages/react/src/Overlay/Overlay.module.css:46   .Overlay:focus                                  outline:none
primer-react/packages/react/src/Pagination/Pagination.module.css:43  .Page:focus                              outline:0   (same rule: background-color)
primer-react/packages/react/src/Textarea/TextArea.module.css:12      .TextArea:focus                          outline:0
primer-react/packages/react/src/deprecated/ActionList/Item.module.css:114  .Item:focus                       outline:none   (same rule: background)
primer-react/packages/react/src/internal/components/UnstyledTextInput.module.css:10  .Input:focus            outline:0
radix-themes/.../components/link.css:46               .rt-Link:where(:any-link, button):where(:active:not(:focus-visible...  outline: 0.75em solid ...   (dropped: matched my regex "0", not a removal)
radix-themes/.../components/reset.css:102             .rt-reset:where(:focus)                           outline:none
radix-themes/.../components/text-field.css:99         .rt-TextFieldInput::-webkit-datetime-edit-{ampm,day,hour,millisecond,minute,month,second,week,year}-field:where(:focus)   outline:none   (9 selectors)
radix-website/components/demos/alert-dialog/css/styles.css:32          .AlertDialogContent:focus   outline:none
radix-website/components/demos/alert-dialog/css/styles.css:62          .Button:focus:not(:focus-visible)   outline:0
radix-website/components/demos/alert-dialog/css-modules/styles.module.css:21  .Content:focus       outline:none
radix-website/components/demos/alert-dialog/css-modules/styles.module.css:52  .Button:focus:not(:focus-visible)   outline:0
radix-website/components/demos/dialog/css/styles.css:34                .DialogContent:focus        outline:none
radix-website/components/demos/dialog/css/styles.css:64                .Button:focus:not(:focus-visible)   outline:0
radix-website/components/demos/dialog/css-modules/styles.module.css:21 .Content:focus              outline:none
radix-website/components/demos/dialog/css-modules/styles.module.css:52 .Button:focus:not(:focus-visible)   outline:0
radix-website/components/demos/getting-started/css/styles.css:43       .PopoverContent:focus       outline:none   (same rule: box-shadow)
radix-website/components/demos/getting-started/css-modules/styles.module.css:34  .Content:focus     outline:none   (same rule: box-shadow)
radix-website/components/demos/slider/css/styles.css:40                .SliderThumb:focus          outline:none   (same rule: box-shadow)
radix-website/components/demos/slider/css-modules/styles.module.css:36 .Thumb:focus               outline:none   (same rule: box-shadow)
radix-website/components/docs-nav.module.css:17                        .DocsNavItem:focus          outline:none   (`:focus-visible` rule below draws only a box-shadow)
```

Minus the dropped `link.css` row, that is 46 real candidates. By my reading against the rule text:

| Label | Count | Which |
|---|---|---|
| Violation of UX-A11Y-12 as worded | 14 | the 3 primer/css SCSS rules; primer/react `Overlay` (container) and deprecated `ActionList/Item`; radix-ui/website: 4 Dialog/AlertDialog containers, 2 Popover containers, 2 SliderThumb, `DocsNavItem` |
| Not a violation: `:focus:not(:focus-visible)` mouse-focus idiom | 18 | 14 in primer/react (7 in `BaseStyles.module.css`, the same 7 in the vitest config copy), 4 radix-ui/website `.Button` |
| Not a violation: ring is drawn elsewhere in the same file | 2 | `Pagination` `.Page:focus` (ring on `.Page:focus-visible`), `Card` (ring on `&:focus-visible::after`, `Card.module.css:196-199`) |
| Not a violation: ring is drawn in another file | 3 | `TextArea`, `UnstyledTextInput` (ring on the wrapper, `TextInputWrapper.module.css:35-40`, `outline: var(--borderWidth-thick) solid var(--borderColor-accent-emphasis)` under `:focus-within`); radix `reset.css:102` (compensated in `text-area.css:14-17`) |
| Not a violation: sub-field of an input whose root draws the ring | 9 | radix `text-field.css:99` datetime sub-fields |

14 + 18 + 2 + 3 + 9 = 46. The label "container" (6 of the 14) means the rule is violated as written but
the element is a programmatically focused dialog or popover content node; UX-A11Y-12's
`/* focus-ok: <reason> */` exemption exists for that case.

### The script under test

```
$ python3 -I tools/focus_outline.py --selftest
selftest ok
$ python3 -I tools/focus_outline.py primer-react/packages     -> exit 1   (18 FAIL, 2 PASS)
$ python3 -I tools/focus_outline.py primer-css/src            -> exit 0   (no output; 113 .scss files not read)
$ python3 -I tools/focus_outline.py radix-themes/packages     -> exit 1   (1 FAIL, 1 PASS)
$ python3 -I tools/focus_outline.py radix-website             -> exit 1   (11 FAIL, 2 PASS)
```

Raw output, lines trimmed to verdict, file and selector (full text in `log/focus-orig.txt`; the
garbled selectors are shown cut at 60 characters):

```
primer-react: FAIL BaseStyles.module.css x7 (the 7 :focus:not(:focus-visible) selectors)   no replacement in file
              FAIL Overlay/Overlay.module.css           &:focus
              PASS Pagination/Pagination.module.css     .Page:focus  -> .Page:focus-visible
              PASS Card/Card.module.css                 &:focus-visible -> &:focus-visible
              FAIL Textarea/TextArea.module.css         .TextArea:focus
              FAIL internal/components/UnstyledTextInput.module.css   "width: 100%;\n  font-family: inherit;...  &:focus"
              FAIL deprecated/ActionList/Item.module.css  .Item:focus
              FAIL config/vitest/browser/global.css x7  (same 7 selectors)
radix-themes: PASS text-field.css  &:where(:focus) -> &:where(:focus-within)
              FAIL reset.css       &:where(:focus)
radix-website: FAIL docs-nav.module.css                      .DocsNavItem:focus
               FAIL alert-dialog/css-modules/styles.module.css  "background-color: var(--gray-1); border-radius: 6px; ... &:focus"
               FAIL alert-dialog/css-modules/styles.module.css  "all: unset; display: inline-flex; ... &:focus:not(:focus-visible)"
               FAIL alert-dialog/css/styles.css                 .AlertDialogContent:focus
               PASS alert-dialog/css/styles.css                 .Button:focus:not(:focus-visible) -> .Button:focus-visible
               FAIL getting-started/css-modules/styles.module.css  "hsl(206 22% 7% / 20%) 0px 10px 20px -15px; &:focus"
               FAIL getting-started/css/styles.css              .PopoverContent:focus
               FAIL slider/css-modules/styles.module.css        &:focus
               FAIL slider/css/styles.css                       .SliderThumb:focus
               FAIL dialog/css-modules/styles.module.css  (two rows, same two shapes as alert-dialog css-modules)
               FAIL dialog/css/styles.css                       .DialogContent:focus
               PASS dialog/css/styles.css                       .Button:focus:not(:focus-visible) -> .Button:focus-visible
```

Counts: FAIL 18 + 0 + 1 + 11 = 30, PASS 2 + 0 + 1 + 2 = 5.

Per-corpus table, labelled with the 46-row list above:

| Corpus | FAIL | PASS | TP | FP | Notes |
|---|---|---|---|---|---|
| primer/react `packages` | 18 | 2 | 2 | 16 | 14 FP are the `:focus:not(:focus-visible)` idiom (7 of them in the vitest config copy); `TextArea` and `UnstyledTextInput` are cross-file. The 2 TP are `Overlay` (container) and deprecated `Item` |
| primer/css `src` | 0 | 0 | 0 | 0 | 3 candidates, all violations, all missed: the script does not read `.scss` |
| radix-ui/themes `packages` | 1 | 1 | 0 | 1 | FAIL is `reset.css`, cross-file. The PASS covers 9 sub-field selectors collapsed into one result |
| radix-ui/website | 11 | 2 | 9 | 2 | 6 of the 9 TP are dialog or popover containers. The 2 FP are `.Button` pairs in `css-modules` (correct code, garbled by nesting) |
| **Sum** | **30** | **5** | **11** | **19** | precision 11/30 = 37%; 11/23 = 48% without the 7 vitest copies |

### False positives (19), by cause

1. Nesting (2 FP, plus 4 garbled selectors that are TP or FP by row). The script splits on `{` and
   `}` only, so a nested rule's selector includes the declarations before it (see the garbled
   rows above). The two radix-ui/website `.Button` rows in `css-modules` are correct code: the
   pair `&:focus:not(:focus-visible) {outline:0}` and `&:focus-visible {outline: 2px solid ...}`
   (`dialog/css-modules/styles.module.css:52-59`). The plain-CSS version of the same demo PASSes.
2. `:focus:not(:focus-visible)` (14 FP). Standard mouse-focus idiom; keyboard focus keeps its ring.
3. Replacement in another file (3 FP): `TextArea`, `UnstyledTextInput`, radix `reset.css`.
   UX-A11Y-12 says "in the same file", so the script does what the rule says; the rule fails on a
   codebase that splits a component over files.

### Misses (41), with the command

SCSS (3). The 3 primer/css candidates above (`markdown-body.scss:61`, `select-menu.scss:398` x2)
have no replacement: `select-menu.scss:457-459` only tints the background under
`body:not(.intent-mouse)`, which is not an outline or border.

`all: unset` (38). `gt/unset.mjs` resolves nesting with `postcss-nested`, takes every rule
with `all: unset` on a plain (no pseudo-class) selector, and looks for a focus rule on the same
selector. Command and output (`log/unset.txt`):

```
$ node unset.mjs ../radix-website/components        (prints one row per rule, then a JSON tally)
{"no-focus-rule":59,"ring":5,"box-shadow-only":38}
```

59 + 5 + 38 = 102 rules with `all: unset`. The 38 `box-shadow-only` rows are the misses counted. Their
selectors (file, class), from the same log, are all controls by name and by the Radix primitive
they style: `IconButton` (x8 across demos), `Input` (x8), `Trigger` (x7), `Button`, `Link`,
`ListItemLink`, `Item`, `Toggle`, `Root` (checkbox, switch), `Thumb`, `Radio`, `Switch`,
`Textarea`, `Close`, `ImageTrigger`, `OTPInput`, `ToggleItem`, `AccessibilitySectionButton`,
`PrimitivesHeroButton`. I did not open the markup for each one; a `box-shadow` alone is not a
replacement under the rule text, which is the label used. The 59 `no-focus-rule` rows are not
counted as violations (see "the 59" below).

Recall with the counted numbers: 11 found of 11 + 41 = 52 known violations = 21%. On the
outline-removal class alone (14 violations in the 46-row list) it is 11 of 14 = 79%.

The 59 rows. `gt/tags.mjs` finds, for each, the JSX element that uses the class in the sibling
`.tsx` files (`log/tags.txt`):

```
$ node tags.mjs | cut -f2,3 | sort | uniq -c | sort -rn      (grouped; "(not found)" = bare element selector)
 20 button   5 input   3 fieldset   3 .Fieldset->fieldset   2 .Button->button   2 a   2 .Input->PasswordToggleField.Input
  3 .Trigger->(Menubar|Accordion|AccordionPrimitive).Trigger   1 textarea   1 .Thumb   1 .BaseButton->button
  8 Menubar item classes (.SubTrigger .RadioItem .MenubarSubTrigger .MenubarRadioItem .MenubarItem .MenubarCheckboxItem .Item .CheckboxItem)
  3 p / .ListItemText / .CalloutText ->p   1 h3   2 .Header->Accordion(Primitive).Header   1 .Fieldset->(not found)   1 .CodeBlockPre code
```

So 14 of the 59 sit on elements that are not focusable (`fieldset`, `p`, `h3`, accordion header,
`pre code`), 8 are Menubar items that show focus by `[data-highlighted]` (not tested), and the other 37
are focusable controls with no focus rule on the same selector. Whether those 37 get their ring
from another selector was not checked, so they are neither counted as misses nor as non-misses.

### Prototype with fixes (a) to (d): measured

`gt/focus_v2.mjs` implements the four fixes in the Python verification text on PostCSS
(Node, so nesting resolves):

- (a) skip selectors containing `:not(:focus-visible)` or `:not(:focus)`;
- (b) nesting resolved by `postcss-nested`;
- (c) the replacement is searched in every file under the scanned root (by equal base selector,
  `:has()` ancestor, or `:focus-within` ancestor);
- (d) `.scss` scanned; `outline: transparent`, `outline-color: transparent`, `all: unset|initial` count
  as removals, and `all: unset` on a plain class selector is checked for a ring.

It is not the shipped script (the shipped one is Python). Environment variable `V3=1` adds two fixes
found during this measurement: (e) skip rules on vendor `::-webkit-*` sub-part selectors, (f) a ring
drawn on the focus rule's `::before`/`::after` counts as the replacement.

```
$ node focus_v2.mjs ../primer-react/packages        {"FAIL":5,"PASS":1}
$ node focus_v2.mjs ../primer-css/src               {"FAIL":3}
$ node focus_v2.mjs ../radix-themes/packages        {"FAIL":10}
$ node focus_v2.mjs ../radix-website                {"FAIL":97,"PASS":9}
$ V3=1 node focus_v2.mjs ../primer-react/packages   {"PASS":2,"FAIL":4}
$ V3=1 node focus_v2.mjs ../primer-css/src          {"FAIL":3}
$ V3=1 node focus_v2.mjs ../radix-themes/packages   {"FAIL":1}
$ V3=1 node focus_v2.mjs ../radix-website           {"FAIL":97,"PASS":9}
```

Outline-removal class (rows whose kind is `outline:...`, not `all:unset`), labelled by the same 46-row
table. Counted with `cut -f1,2 out-*.tsv | sort | uniq -c`: 4 `outline:0` FAIL + 23 `outline:none` FAIL = 27 for (a)-(d).

| Version | FAIL | TP | FP | Precision | Recall on the 14 |
|---|---|---|---|---|---|
| shipped Python (reference) | 30 | 11 | 19 | 37% | 11/14 = 79% |
| (a) to (d) | 27 | 14 | 13 | 52% | 14/14 |
| (a) to (f), tuned on these corpora | 17 | 14 | 3 | 82% | 14/14 |

The 13 FP of (a)-(d): 9 datetime sub-fields (the Python PASSed them by accident, see below),
`reset.css`, `TextArea`, `UnstyledTextInput` (cross-file), and `Card` (ring on `::after`). (e) removes
the 9, (f) removes `Card`. The 3 left are cross-file wrapper rings. Fix (c) does not remove
them: the wrapper `TextInputWrapper.module.css` shares no selector with `.TextArea`, so a
selector-based search cannot connect them. That connection is in the markup. UX-A11Y-12's "same
file" wording is not what makes these fail; the check cannot relate a ring on a parent to its
child by selector text.

`all: unset` class (v2, `radix-website` only; none in the other corpora):

```
$ cut -f1,2 v2/out-radix-website.tsv | grep all:unset | sort | uniq -c
     88 FAIL   all:unset          (37 "box-shadow only", 51 "no replacement")
      9 PASS   all:unset
```

Labelling the 88: 37 are box-shadow-only controls (violations by the rule text; this matches 37 of the 38
that `unset.mjs` found: the two methods disagree on 7 of 44 rows because they look for the focus rule
differently, so 37 and 38 are both honest). Of the 51 `no replacement` rows (`gt/tags2.mjs`,
`log/tags2.txt`): 14 are on non-focusable elements (`fieldset` x7, `p` x3, `h3`, accordion header x2,
`pre code`): false positives; 7 are Menubar items (focus shown by `[data-highlighted]`, probable FP);
30 are focusable controls (20 bare `button`, 5 `input`, 2 `a`, `textarea`, `.BaseButton`, `.Radio`)
whose ring source was not checked. So for this class: 37 real, 14 known FP, 7 probable FP, 30 unknown.
The precision floor is 37/88 = 42% and the ceiling is 67/88 = 76%.

Recall of v2 on the 52 known violations: 14 of 14 on the outline class and 37 of 38 on the
`all: unset` class, 51/52 = 98%. That figure is not independent: the 38 were found by a method that
shares its logic with v2. Treat it as "the same logic, now in the check".

### Fixture for the focus fixes

A fixture with one expected outcome per fix, run on the shipped script and on the prototype
(`ffix/a.css`, `ffix/b.scss`; logs `log/ffix-orig.txt`, `log/ffix-v2.txt`, `log/ffix.txt`):

```
.mouse { &:focus:not(:focus-visible) { outline: 0; } }   F1 expect: no row
.bare:focus { outline: none; }                           F2 expect: FAIL
.ring:focus-visible { outline: none; }  .ring:focus-visible::after { outline: 2px solid blue; }   F3 expect: PASS
.nest { padding: 0; &:focus { outline: none; } }         F4 expect: FAIL with selector .nest:focus
.bs { all: unset; }  .bs:focus-visible { box-shadow: 0 0 0 2px red; }   F5 expect: FAIL
.ok { all: unset; }  .ok:focus-visible { outline: 2px solid blue; }     F6 expect: PASS
/* focus-ok: container focused by script */ .dlg:focus { outline: none; }   F7 expect: EXEMPT
.in::-webkit-datetime-edit-day-field:focus { outline: none; }   F8 expect: no row
b.scss: .scss-bare { &:focus { outline: 0; } }           F9 expect: FAIL
```

```
$ python3 -I tools/focus_outline.py ffix        (shipped)   exit 1
FAIL a.css  &:focus:not(:focus-visible)      <- F1 false positive
FAIL a.css  .bare:focus
FAIL a.css  .ring:focus-visible              <- F3 false positive
FAIL a.css  padding: 0; &:focus              <- F4 garbled selector
EXEMPT a.css .dlg:focus
FAIL a.css  .in::-webkit-datetime-edit-day-field:focus   <- F8 false positive
(no row for F5 and F9: all:unset and .scss are not read)

$ node focus_v2.mjs ../ffix                     (fixes a to d)
FAIL  a.css:2 .bare:focus   | FAIL a.css:3 .ring:focus-visible (F3 not fixed)   | FAIL a.css:5 .nest:focus
FAIL  a.css:6 .bs (all:unset, box-shadow only) | PASS a.css:8 .ok   | EXEMPT a.css:11 .dlg:focus
FAIL  a.css:12 .in::-webkit-datetime-edit-day-field:focus (F8 not fixed)   | FAIL b.scss:1 .scss-bare:focus
{"FAIL":6,"PASS":1,"EXEMPT":1}

$ V3=1 node focus_v2.mjs ../ffix                (fixes a to f)
FAIL a.css:2 .bare:focus | PASS a.css:3 .ring:focus-visible (replacement a.css:4 ::after) | FAIL a.css:5 .nest:focus
FAIL a.css:6 .bs (all:unset, box-shadow only) | PASS a.css:8 .ok | EXEMPT a.css:11 .dlg:focus | FAIL b.scss:1 .scss-bare:focus
{"FAIL":4,"PASS":2,"EXEMPT":1}
```

All nine expectations are met with (a) to (f) and only with them.

### Two PASS that were right by accident

`Card.module.css:191` and radix `text-field.css` datetime fields PASSed in the shipped script by
matching another rule with the same unresolved `&:...` text. Both verdicts are right (ring on `::after`;
ring on the input root), the evidence printed is wrong. No PASS in these corpora came from the BEM
`block__element` branch, so the BEM ancestor heuristic named in the question was never exercised on a
real case.

## Result 2: colour_only.mjs

### Robustness: commands and output

Setup: Chromium headless shell from the local Playwright cache (`chromium_headless_shell-1255`),
`puppeteer-core` 25.x, shared libraries in `libs/`. All pages are read-only GETs; nothing was posted.

First run (saved log `gt/co-radix.txt`, one invocation per page, the shipped script):

```
## https://www.radix-ui.com/themes/docs/components/tabs              TimeoutError: Navigation timeout of 30000 ms exceeded
## https://www.radix-ui.com/themes/docs/components/tab-nav           TimeoutError: Navigation timeout of 30000 ms exceeded
## https://www.radix-ui.com/themes/docs/components/segmented-control colour-only state pairs: 0
## https://www.radix-ui.com/themes/docs/components/badge             TimeoutError: Navigation timeout of 30000 ms exceeded
## https://www.radix-ui.com/themes/docs/components/callout           colour-only state pairs: 0
## https://www.radix-ui.com/themes/docs/components/checkbox          colour-only state pairs: 0
## https://www.radix-ui.com/themes/docs/components/switch            TimeoutError: Navigation timeout of 30000 ms exceeded
## https://www.radix-ui.com/themes/docs/components/radio-group       colour-only state pairs: 0
## https://www.radix-ui.com/themes/docs/components/text-field        colour-only state pairs: 0
## https://www.radix-ui.com/themes/docs/components/select            TimeoutError: Navigation timeout of 30000 ms exceeded
```

5 timeouts, 5 pages printing `colour-only state pairs: 0`. Re-run on 2026-11-27, 5 in parallel, one
process per page, exit code taken with `echo $?` (`log/co-radix-rerun.txt`):

```
$ ../log/runco.sh <url>     # = CHR=... node colour_only.mjs <url> > out; echo $? > exit
exit 0  .../tabs           colour-only state pairs: 0
exit 0  .../tab-nav        colour-only state pairs: 0
exit 1  .../segmented-control   TimeoutError: Navigation timeout of 30000 ms exceeded
exit 1  .../badge               TimeoutError
exit 1  .../callout             TimeoutError
exit 0  .../checkbox       colour-only state pairs: 0
exit 1  .../switch              TimeoutError
exit 1  .../radio-group         TimeoutError
exit 1  .../text-field          TimeoutError
exit 1  .../select              TimeoutError
```

3 of 10 loaded this time (5 of 10 the first time), and the set that loads changes between runs.
`segmented-control`, `callout`, `radio-group` and `text-field` loaded in run 1 and timed out in
run 2. This is a property of third-party pages under `networkidle0`; a local static build is not
affected the same way.

Primer pages: `gt/co-primer.txt` shows, for `underline-nav`, the light pass printing 4 `INFO` lines and then
`TimeoutError: Navigation timeout of 30000 ms exceeded` from `colour_only.mjs:12` (the dark pass).

Exit code. The script ends with `process.exit(fails ? 1 : 0)` and has no `try` around `goto`
(source above). Measured (`log/fixture2.txt`):

```
$ node colour_only.mjs http://127.0.0.1:59999/        (connection refused)
Error: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:59999/
exit 1
$ node colour_only.mjs file://.../fixture.html        (a FAIL is present)     exit 1
```

A crash and a finding both exit 1. (Port 1 is refused by Chromium itself with `ERR_UNSAFE_PORT`;
that also exits 1 on the shipped script.)

### Accuracy on pages that loaded: commands and output

`gt/debug.mjs <url> <tag>` evaluates the same `isState` and peer-key logic as the script for every
state element, and prints per element: which cue properties differ (`cueDiff`), whether the
pseudo-element `content` differs (`pseudo`), whether child tags differ (`kids`), and the lightness ratio to
the peer for `color`, `background-color` and `border-bottom-color`. Run over the 20 pages in
`gt/primer-urls.txt` and `gt/radix-urls.txt` (default `networkidle2`, 60 s; light scheme only):

```
$ cat primer-urls.txt radix-urls.txt | xargs -P4 -I{} ../log/runaud.sh debug.mjs {} <outdir>
exit codes: 17 pages exit 0, 3 exit 1 (Radix select, switch, text-field: TimeoutError 60000 ms)
Primer tab-nav: exit 0, 0 state elements
$ node log/sig.mjs      (groups every printed element by its (cueDiff, pseudo, kids, ratios) signature)
elements 81 distinct signatures 8
S1  n=9   cueDiff=font-weight  pseudo=false kids=false ratios(c,bg,bd)=2.58/1/1       pages=9  text=Product UI
S2  n=28  cueDiff=-            pseudo=false kids=false ratios=1/1/1                   pages=9  text=ActionList|Overview|Banner
S3  n=9   cueDiff=-            pseudo=false kids=false ratios=3.04/1/3.04             pages=9  text=ActionList|Banner|FormControl
S4  n=2   cueDiff=-            pseudo=false kids=true  ratios=1/1/1                   pages=2  text=Repos|Code
S5  n=4   cueDiff=-            pseudo=false kids=true  ratios=5.19/4.04/4.04          pages=1  text=2|9
S6  n=4   cueDiff=font-weight  pseudo=false kids=false ratios=1/1/1                   pages=1  text=Preview|
S7  n=7   cueDiff=-            pseudo=false kids=false ratios=1/3.27/1                pages=7  text=Badge|Callout|Checkbox
S8  n=18  cueDiff=-            pseudo=true  kids=false ratios=1.23/1/1.23             pages=2  text=AccountAccount
```

This replaces the first version's hand count of "14 distinct cases, about 40 elements": the mechanical
count is 81 elements in 8 signatures (the first version's dedupe was by eye and is not
reproducible). Reading of each signature, and the script's verdict (it prints a line only for
`FAIL`/`INFO`; the other signatures are silent):

| Signature | Script | Reading, with the evidence | Right? |
|---|---|---|---|
| S1 Primer header link (`aria-current`) | silent | `font-weight` differs (600 against 400, `log/parentcue.txt`) | yes |
| S3 Primer breadcrumb-style current item | silent | colour ratio 3.04 and border ratio 3.04, at or over the 3:1 test in the rule text | yes by the rule text |
| S5 Primer pagination current page | silent | colour 5.19, background 4.04 | yes by the rule text |
| S6 Primer SegmentedControl selected | silent | `font-weight` differs | yes |
| S8 Radix Tabs trigger and TabNav link | silent | `pseudo=true`; the bar is real, see below | yes |
| **S7 Radix docs side nav current item** | silent | tint only. Output of `navbg.mjs` below. Real ratio 1.34, script scored 3.27 | **no: false negative (7 elements, one distinct item, the same on 7 pages)** |
| S2 (28 elements) | INFO | no tested property differs. Resolved by measurement for the elements run through `pseudo.mjs` and `parentcue.mjs` (the "Overview" and "Code" tabs on the underline-nav and nav-list pages draw a 2px `::after` bar `rgb(253, 140, 115)` with `content: ""`; the first current NavList item puts the cue on the parent `li`: bg tint `rgba(129, 139, 152, 0.15)` and a 4 x 28 px `::after` bar `rgb(9, 105, 218)`, `log/parentcue.txt`). The other S2 elements of the same components (18 in all counted as resolved) share the markup but were not each run through those two scripts, so 18 is an extrapolation from the measured ones. Not resolved for 10 (9 site-chrome links named after the page title, 1 form wrapper) | INFO is harmless to a gate; its text ("colour carries nothing") is wrong for the measured ones and probably for the 18 |
| S4 (2 elements, `kids=true`) | silent | an extra child element differs ("Repos", "Code"); I did not check that the child is a cue | unresolved |

Raw output behind S7 (`log/navbg.txt`, the second of three tries; the first two timed out at
60000 ms, which is again the page flakiness):

```
$ node navbg.mjs
{ "cur": [ "rgba(0, 68, 255, 0.176)", "rgb(28, 32, 36)", "400", "0px" ], "peer": [ "rgba(0, 0, 0, 0)", "rgb(28, 32, 36)", "400", "0px" ],
  "body": "rgba(0, 0, 0, 0)", "html": "rgba(0, 0, 0, 0)",
  "cls": "docs-nav-module__Df4XUG__DocsNavItem docs-nav-module__Df4XUG__active"}
```

Fields are `[backgroundColor, color, fontWeight, border-top-width]`. Current and peer have the same text
colour, the same weight and no border; only the background differs. The arithmetic
(`log/ratio.txt`):

```
$ node -e '...'    # blend rgba(0,68,255,0.176) over white, WCAG relative luminance
blended 210,222,255 ratio vs white 1.34
transparent parsed as black vs blue-tint-as-opaque? ratio black/white 21.00
```

So the cue is 1.34:1 against 3:1. The script reads `rgba(0, 0, 0, 0)` as black (its `lum` takes the first
three numbers and ignores alpha) and scores 3.27 for the pair, which is over 3. That is the cause
of the miss, and `debug.mjs` shows the `3.27` in S7 above. The header of the script already says "alpha is
ignored"; this measurement shows the shortcut hides the most common real violation.

Raw output behind S2 (`log/pseudo.txt`, `gt/pseudo.mjs`, columns: `background-color ; width ; height ; content ; display ; opacity`):

```
$ node pseudo.mjs https://primer.style/product/components/underline-nav/
"Overview": after = rgb(253, 140, 115) ; 72px ; 2px ; "" ; block ; 1     peerAfter = rgba(0, 0, 0, 0) ; 86px ; 2px ; "" ; block ; 1
"Code":     after = rgb(253, 140, 115) ; 44px ; 2px ; "" ; block ; 1     peerAfter = rgba(0, 0, 0, 0) ; 104px ; 2px ; "" ; block ; 1
$ node pseudo.mjs https://primer.style/product/components/nav-list/
"Item 1", "Profile": after = rgba(0, 0, 0, 0) ; auto ; auto ; none ...   (identical to the peer: the cue is not on the link)
$ node parentcue.mjs https://primer.style/product/components/nav-list/
"NavList" (current): liBg = rgba(129, 139, 152, 0.15)   liAfter = rgb(9, 105, 218) ; ... ; "" ; 4px ; 28px   sibling li: rgba(255, 255, 255, 0), no ::after
```

The first version said that the 2px bar sits on "NavList items" too; this output shows it sits on UnderlineNav tabs, and
that NavList's cue is on the parent `li`. The script tests the link element only, so NavList items print INFO although a bar and a tint exist.

Counts, on 81 elements: script FAIL 0; real violations 1 (S7, one distinct item); false positives 0;
false negatives 1 distinct (7 elements). The sample is documentation chrome and live demo components,
not application UI; 0 false positives means "not yet seen", not a rate.

Other defects seen, unchanged from the first version: `isState` reads class tokens and four ARIA
attributes, and Primer marks input validation on a wrapper with a `data-*` attribute, so a possible
miss that I did not measure; peer choice by tag and class list pairs items of different roles that share a
class list (S2 pairs "NavList" with "Component status", seen in the INFO lines).

### Prototype with the UX-A11Y-19 changes, run on a fixture and on the pages

`gt/colour_only_v2.mjs` makes five changes: (1) `rgba` colours are blended onto the backdrop (the
page background walked up the ancestors, white if none) before the 3:1 test; (2) pseudo-element
`background-color`, `width` and `height` join `content` in the pseudo signature; (3) navigation errors are caught,
printed as `ERROR` and counted; (4) exit code 2 on any navigation error, 1 on any FAIL, 0 otherwise; (5) the wait is
`networkidle2` with a 30 s timeout by default, or `WAIT=load` for `load` plus 1.5 s.

Fixture `fixture.html`, four rows (light page background `#fff`):

| Row | Markup | Expected |
|---|---|---|
| R1 tint-only current row | `li.row.is-current { background: rgba(0,68,255,.176) }`, same text | FAIL |
| R2 bar in a pseudo-element, `content: ""` on both | `a.tab::after { content:""; background: transparent }`, `a.tab.is-selected::after { background:#c33 }` | silent |
| R3 hue-only text change | `a.nav { color:#0b4f9c }` `a.nav.is-active { color:#8a2d1f }` | FAIL (positive control) |
| R4 weight change | `b.k.is-current { font-weight: 700 }` | silent |

```
$ node colour_only.mjs fixture.html            (shipped)
INFO light ... A|tab "Issues" vs "Code"            <- R2 reported as INFO ("colour carries nothing"), wrong
FAIL light ... A|nav "Blog" vs "Docs"              <- R3
INFO dark  ... A|tab "Issues" vs "Code"
FAIL dark  ... A|nav "Blog" vs "Docs"
colour-only state pairs: 2                          exit 1        (R1 silent: false negative, reproduced)
$ node colour_only_v2.mjs fixture.html         (prototype)
FAIL light ... LI|row "Tabs" vs "Overview"         <- R1
FAIL light ... A|nav "Blog" vs "Docs"              <- R3
FAIL dark  ... LI|row "Tabs" vs "Overview"
FAIL dark  ... A|nav "Blog" vs "Docs"
colour-only state pairs: 4                          exit 1        (R2 silent, R4 silent)
$ node colour_only_v2.mjs http://127.0.0.1:59999/
ERROR light http://127.0.0.1:59999/ net::ERR_CONNECTION_REFUSED at http://127.0.0.1:59999/
ERROR dark  http://127.0.0.1:59999/ net::ERR_CONNECTION_REFUSED at http://127.0.0.1:59999/
colour-only state pairs: 0                          exit 2
```

Both changes have their own row: alpha blending is R1 (the shipped script misses it, the prototype flags
it), and pseudo-element `background-color` is R2 (the shipped script prints a misleading INFO, the
prototype is silent). The fixture was run; the expectations are met. The first version wrote
"prints exactly one FAIL" for the fixture; the measured count is 2 FAIL per colour scheme (R1 and
R3), because R3 is a deliberate positive control.

On the real pages (`log/v2-load.txt`, `WAIT=load`, 20 pages, one process per page):

```
$ cat radix-urls.txt primer-urls.txt | xargs -P3 -I{} ../log/runv2.sh {}      # WAIT=load node colour_only_v2.mjs <url>
Primer, 10 pages: exit 0 on all; 0 FAIL, 0 ERROR; INFO 2 per page (16 on nav-list), tab-nav 0 elements
Radix, 10 pages: exit 1 on all; 2 FAIL per page (light and dark), 0 ERROR
FAIL light https://www.radix-ui.com/themes/docs/components/tab-nav A|docs-nav-module__Df4XUG__DocsNavItem "Tab Nav" vs "Getting started"
FAIL light https://www.radix-ui.com/themes/docs/components/tabs    A|docs-nav-module__Df4XUG__DocsNavItem "Tabs" vs "Getting started"
```

All 10 Radix FAIL are the one real item in S7 (the docs side nav current entry, "Tab Nav", "Tabs",
"Badge", and so on, one per page). Radix Tabs and TabNav triggers (S8) stay silent. No FAIL on any
Primer page (0 false positives on 10 pages). The default `networkidle2` did not cure the load problem:

```
$ node colour_only_v2.mjs https://www.radix-ui.com/themes/docs/components/tab-nav       (networkidle2, 30 s)
ERROR light ... Navigation timeout of 30000 ms exceeded      ERROR dark ... Navigation timeout of 30000 ms exceeded     exit 2
$ node colour_only_v2.mjs https://primer.style/product/components/pagination/
INFO light ...      ERROR dark ... Navigation timeout of 30000 ms exceeded                                                  exit 2
```

With `WAIT=load` 20 of 20 pages loaded. The first version's change request ("networkidle2 with a timeout") would
therefore turn crashes into exit 2 without making the check usable on those pages.

## Effect on the ruleset

**UX-A11Y-12: change (verification and one added sentence).** The rule text stays. Replace the
first sentence of *Verify* with:

> `python3 -I focus_outline.py <source dirs>` is a lead generator, not a gate, until it (a) skips
> selectors containing `:not(:focus-visible)` or `:not(:focus)`, (b) resolves CSS nesting, (c) scans
> `.scss`, (d) treats `outline: transparent`, `outline-color: transparent` and `all: unset|initial`
> as outline removals, (e) skips vendor `::-webkit-*` sub-part selectors, (f) accepts a replacement
> drawn on the focus rule's `::before` or `::after`, and (g) passes the nine-case fixture below. Until
> then, triage every FAIL by hand and record each as fixed, `focus-ok`, or false positive.

Fix (c) of the first version ("look for the replacement in every file") is dropped: measured,
it does not remove any of the 3 cross-file false positives, because the ring's selector shares nothing with the
focused element's selector. Add instead: "A ring drawn by a wrapper in another file needs a
`/* focus-ok: ring drawn by <selector> in <file> */` comment on the removing rule." Verification: the
`focus-ok` comment names a file and selector that exist (`grep -rn '<selector>' <file>`).

Add one sentence to the rule: "`all: unset` and `all: initial` on a focusable element remove its
outline, so they need the same replacement." Verification: `grep -rnE 'all:\s*(unset|initial)' src`;
for each hit, the selector is a focusable element (`button`, `a[href]`, `input`, `select`,
`textarea`, `summary`, an element with `tabindex`) and a focus rule on the same selector sets an
`outline` or a `border`. Evidence: 37 of the 88 `all: unset` FAIL in radix-ui/website are
`box-shadow`-only controls; 14 are on non-focusable elements (`fieldset`, `p`, headings), so this
class stays a human triage step, not a blocking check. Severity of the rule stays MUST.

Fixture verification for the fix list (run it, expect these rows): the nine cases above.
`V3=1 node focus_v2.mjs ffix` must print exactly `{"FAIL":4,"PASS":2,"EXEMPT":1}` and no row for F1 and F8.

**UX-A11Y-19: change (verification only; two changes, each with its own fixture row).**

1. Replace "A colour pair at 3:1 or more counts as a cue" with: "A colour pair counts as a cue only when
   both colours are first blended onto the page background (alpha applied) and the ratio is at least
   3." *Verify:* fixture row R1 (`li.row.is-current { background: rgba(0,68,255,.176) }`): the
   script prints a `FAIL` line for it. Measured: shipped script silent, prototype FAIL.
2. Add: "A change in a pseudo-element's `background-color`, `width` or `height` counts as a cue."
   *Verify:* fixture row R2: the script prints neither FAIL nor INFO for it. Measured: shipped script
   INFO, prototype silent.
3. Replace "networkidle2 with a timeout" (first version) with: "The script waits for `load` plus 1.5 s,
   catches a navigation error, prints `ERROR`, and exits 2; exit 1 means at least one FAIL." *Verify:*
   `node colour_only.mjs http://127.0.0.1:59999/` exits 2 and prints `ERROR`. Evidence: 20 of 20
   pages loaded with `load`; 3 to 5 of 10 Radix pages loaded with `networkidle0`; the `networkidle2`
   prototype still timed out on Radix `tab-nav`.
4. Fixture requirement, before the script is published. The fixture holds R1 to R4 as above.
   *Verify:* `node colour_only.mjs fixture.html` prints exactly two `FAIL` lines per colour scheme
   (R1 and R3), no `INFO` line, no line for R2 or R4, and exits 1. Measured for the prototype: this
   output, exit 1 (shown above).

The script text itself is not edited here (this follow-up writes only its own file); the prototypes
are in the scratch directory named above.

**UX-A11Y-17, -13, -20: confirm.** Not touched by this question.

**Open question 7: answer and close.** "Do the checks hold beyond the fleet?" As shipped, no (numbers
above). Reopen as: "re-run both checks, once their fixes are in the published scripts, on the same
four corpora, and compare with this file's tables", plus the missing oracle below.

## Dated facts

- Repository states: the table in Method (commits dated 2026-11-25, 2026-11-25, 2026-04-11,
  2026-10-07). Source: `git log -1 --format='%H %cs'` in each clone, run 2026-11-27.
- Live pages read on 2026-11-27 (none carries a date), vendor sites for their own products, the
  results are measurements: `https://primer.style/product/components/` with `underline-nav`, `tab-nav`,
  `pagination`, `segmented-control`, `nav-list`, `toggle-switch`, `form-control`, `label`, `banner`,
  `action-list`; `https://www.radix-ui.com/themes/docs/components/` with `tabs`, `tab-nav`,
  `segmented-control`, `badge`, `callout`, `checkbox`, `switch`, `radio-group`, `text-field`,
  `select`.
- UX-A11Y-12 and -19 wording quoted from `ux-a11y-authoring.md` as of revision 1.

## What could not be determined

- A true oracle for focus visibility. Ground truth for rule 12 is a source reading against the rule
  text, with an independent candidate list as denominator. A browser pass that Tabs through the Primer
  and Radix storybooks and diffs focused against blurred states would measure it; neither
  Storybook was built here.
- Whether 30 of the 51 `all: unset` "no replacement" rows (bare `button`, `input`, `a`, `textarea` and
  a few classes) get their ring from a selector the check does not relate to. Missing: a rendered page
  per demo (the radix-ui/website demos need a Next.js build) with a Tab-and-diff pass.
- Whether the 10 unresolved S2 elements (site-chrome links named after the page title, and the Primer
  form wrapper) and the 2 S4 elements (`kids=true`) carry a non-colour cue. Missing: the
  parent and sibling computed styles for those elements (`parentcue.mjs` covered NavList only).
- Whether Primer's wrapper-level validation cue (`data-validation`) is colour-only. Missing:
  a capture of the invalid state on the wrapper.
- The greyscale screenshots from the first version are not used and not reproduced here. A
  headless font-loading problem made the Primer captures unreadable, so no visual reading of Primer
  exists; every colour finding here is a computed-style value.
- The dark scheme on the shipped script on Primer: the dark pass timed out on the Primer page tried.
  The prototype with `WAIT=load` ran both schemes on all 10 Primer pages without a FAIL.
- Rates beyond these corpora. 81 elements in 8 signatures, 46 candidate focus rules and 88 `all: unset`
  rules are samples, and (e) and (f) were tuned on the same corpora they were measured on, so the
  82% is an upper bound, not an expected precision.

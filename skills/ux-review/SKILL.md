---
name: ux-review
description: On-demand UX and accessibility review of a web page, docs site, app view, editor webview or CLI against the ux-quality, ux-cli and ux-agent-interfaces rule sets, with every finding tagged by evidence class and a separate needs-human-review list. Use when someone asks to review, audit, test or check accessibility, a11y, WCAG, keyboard or screen-reader behaviour, contrast, focus, zoom and reflow, loading and error states, or a CLI's help and first run, or asks whether a page or a change is accessible. Not for fixing findings unless asked, and not for marketing copy or claims, which is marketing-review.
license: Apache-2.0
metadata:
  summary: Runs the UX gate by hand over named pages, built routes, a CLI or a branch diff, tags each finding with an evidence class, and never writes a conformance verdict
  keywords: ux,accessibility,a11y,wcag,review,audit,axe,playwright,keyboard,screen-reader,contrast,focus,reflow,zoom,loading,error-state,cli,help,first-run,ux-review,ux-quality
  grim.requires.skills.ux-quality-reference: "./ux-quality-reference:0"
  grim.requires.skills.ux-cli: "./ux-cli:0"
  grim.requires.skills.ux-agent-interfaces: "./ux-agent-interfaces:0"
---

# ux-review

Contents: [Stop condition](#stop-condition) · [Before you start](#before-you-start) ·
[1 Targets](#1-pick-the-targets) · [2 Load](#2-load-the-rules) ·
[3 Static scans](#3-run-the-static-scans) · [4 Rendered checks](#4-run-the-rendered-checks) ·
[5 CLI](#5-review-a-cli) · [6 Code read](#6-read-the-code) ·
[7 Human pass](#7-the-human-pass) · [8 Refute](#8-try-to-refute-each-finding) ·
[9 Report](#9-report) · [Rules this skill owns](#rules-this-skill-owns) ·
[MUST list](#the-must-list) · [Ask the owner](#ask-the-owner) ·
[What agents get wrong here](#what-agents-get-wrong-here) · [Dates and versions](#dates-and-versions) ·
[Siblings](#siblings)

The `ux-quality` rule loads when an agent edits markup or a stylesheet. This skill is the
explicit trigger: grade a page nobody is editing, a built route, a CLI or a whole branch. It
reports. It never fixes unless asked, never silences a check, and never writes a conformance
verdict.

## Stop condition

Stop when every target has findings or `clean`, and the report has the three parts of
[step 9](#9-report): Findings, Needs human review and gate facts. A run that did not execute a
step says so under `did not run:` with the reason. Never write "accessible", "compliant" or
"passes accessibility". Write what ran, on what, with which result and what was not covered.

## Before you start

- `CHECKS` is the `checks/` directory of the `ux-quality-reference` skill. Use
  `.claude/skills/ux-quality-reference/checks`, or find it:
  `find . -path '*ux-quality-reference/checks' -type d -not -path '*/node_modules/*'`. Under a
  global install it is `$CLAUDE_CONFIG_DIR/skills/ux-quality-reference/checks`.
- Tools: `python3` 3.11 or newer (standard library only) for the scans. `node` and a Playwright
  browser for the `.mjs` checks. Each `.mjs` header names the exact Playwright and axe-core
  versions it was written for and the run prints them. If a package is missing, install those
  exact versions into a scratch directory, never into the project, and say so under `ran:`. The `.mjs`
  files import those packages by bare name, and Node resolves them from the script's own directory,
  not the working directory: copy `$CHECKS` into the scratch directory, set `CHECKS` to the copy and run
  every script from there.
- A rendered check runs against a **served production build** in a real browser, never against
  jsdom and never against a dev server (a dev server changes timing and output). Serve the build
  directory: `python3 -m http.server 4402 --directory dist &`, then `BASE=http://127.0.0.1:4402`.
  Stop the server at the end.
- No build, no browser or no Node means the rendered steps go under `did not run:`. A browser that is
  present but fails to launch (for example a missing shared library) counts as no browser: record the
  launch error under `did not run:` and report no rendered result. Never report a static pass as a
  rendered pass.
- The pinned house defaults: the report field labels in [step 9](#9-report) and the
  `matrix-labels.csv` promotion rule (UX-VERIFY-13). An adopter overrides each once.

## 1. Pick the targets

Input: the request. Output: a typed list of targets (page, route, template, webview, CLI,
MCP server, JSON mode) and the base to compare against.

- Named paths, URLs or binaries: use them as given.
- Built routes: take the list from the router output or the sitemap, never from a walk of
  `dist/**/*.html`, because fragments and partials give false `document-title` and
  `html-has-lang` violations (UX-VERIFY-04).

```sh
cat dist/sitemap-[0-9]*.xml | grep -oE '<loc>[^<]+' | sed 's/<loc>//; s#https\{0,1\}://[^/]*##' | sort -u > routes.txt
```

  `sitemap-[0-9]*.xml` skips `sitemap-index.xml`. Step 4c reads `routes.txt`.

- Nothing named: the branch diff of interface source.

```sh
git diff --name-only --diff-filter=d --merge-base origin/HEAD -- '*.astro' '*.tsx' '*.jsx' '*.vue' '*.svelte' '*.html' '*.css' '*.scss' ':(glob)**/webview/**/*.ts'
git diff --numstat --merge-base origin/HEAD -- '*.astro' '*.tsx' '*.jsx' '*.vue' '*.svelte' '*.html' '*.css' '*.scss' | awk '{n+=$1+$2} END{print n+0}'
```

Drop agent config (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.claude/`), vendored copies and build
output. **Refuse a diff of more than 2,000 changed lines** and ask for a smaller set: scrutiny per
line falls with size. Done: every target has a type, and each touched route is listed.

## 2. Load the rules

Read the installed `ux-quality` rule, then only the depth files its routing table names for the
target types. They sit in the `ux-quality-reference` skill: `widgets.md`, `focus-and-colour.md`,
`motion-and-announcements.md`, `page-structure.md`, `editor-extensions.md`, `states.md`,
`forms.md`, `text.md`, `actions.md`, `ai-features.md` and `verification.md`. A CLI also needs
the `ux-cli` skill; an MCP server, a JSON mode or an agent approval file needs
`ux-agent-interfaces` (its own two checks, `json_output_check.py` and `mcp_tools_check.py`).
A missing rule means it is not installed: say `grim add ghcr.io/ocx-sh/lore/ux-quality` (or
`ux-cli`, `ux-agent-interfaces`) and stop. Done: you hold the rule IDs that apply to each target.

## 3. Run the static scans

Run from the repository root. Each script takes explicit paths, exits 0 clean, 1 on findings and 2
on a bad call, and prints `--help`. A script whose input is absent goes under `did not run:`.

```sh
python3 -I "$CHECKS"/focus_outline.py SRC_DIR...           # UX-A11Y-12, lead generator; pass the theme, package and page source dirs
python3 -I "$CHECKS"/wcag_contrast.py 4.5 < pairs.txt      # UX-A11Y-15, 16; 3 for large text and boundaries
python3 -I "$CHECKS"/scan_wv.py WEBVIEW_DIR...             # UX-A11Y-03, 04, 35; VS Code webview targets only
for a in link-text emoji interjection img-alt plural-s bytes; do python3 -I "$CHECKS"/text_scan.py --arm $a PATH...; done   # UX-TEXT-16, 17, 20, 25, 28
python3 -I "$CHECKS"/actions_scan.py PATH...               # UX-ACT-04 to 06, UX-AI-06
for c in unnamed elem badtok pwtok; do python3 -I "$CHECKS"/form_fields.py $c FILE...; done   # UX-STATE-20, 27, 36
```

`scan_wv.py` with no directory scans the whole working directory, which on a non-webview repository
flags site tokens and tests: run it only when the target is a VS Code webview, and name the webview
template directories. Otherwise list it under `did not run:` with the reason `not a webview`.
The `plural-s` arm reads string literals only. For `(s)` in markup text, such as `<p>3 file(s)</p>`,
also run `grep -nE '[A-Za-z]\((s|es)\)' FILE...`.

How to file each result:

| Output | Goes to | Evidence class |
|---|---|---|
| `wcag_contrast.py`, `text_scan.py`, `actions_scan.py`, `form_fields.py`, `scan_wv.py` hit | Findings | measured |
| `focus_outline.py` FAIL row | Needs human review unless the replacement is confirmed missing in the browser (UX-A11Y-13 read) | measured lead |

`wcag_contrast.py` reads `foreground background label` lines from stdin: build the pair list from the
colour tokens yourself, one line per token pair and scheme. A pair missing from the list is not
checked. `form_fields.py` lists candidates: read each element before you report it. `focus_outline.py` is a lead generator: a wrapper in another file can draw the ring, so triage
each row. A row stops being a lead only when a rendered check or a read of the ring owner shows
no replacement. A row with a `/* focus-ok: reason */` marker is not a finding. Run the project's own
lint too when it exists (`jsx-a11y` for JSX, `eslint-plugin-astro`'s `jsx-a11y-recommended` for
Astro). List it under `ran:` or `did not run:`. Lint never replaces the rendered run.

Done: each script has an exit code under `ran:` or a reason under `did not run:`.

## 4. Run the rendered checks

Input: `BASE` and the route list from step 1. Run the steps in this order. Fix nothing between
them; the report holds every result.

**4a. The axe fixture** (UX-VERIFY-02 to 06, 09). Run the project's accessibility spec through its
shared fixture. When it has none, write a throwaway spec in a scratch directory that imports
`"$CHECKS"/axe-fixture.mjs` (read its header for its exports). The fixture sets exactly the tags
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`. Scan each route once per colour scheme the site
ships, and each open dialog, menu, popover and error or empty fixture in its own call after you
assert it is visible (UX-VERIFY-04, 05). Keep `best-practice` results in their own set (UX-VERIFY-09).
Done when the output lists violations and needs-review counts per rule.

- Each violation is a Finding, class measured, naming `axe-core <version>` and the state.
- Each `incomplete` node is a Needs human review item. The count per rule goes into the gate
  facts (UX-VERIFY-03).
- Never write the call yourself with `new AxeBuilder({ page }).analyze()` alone, and never copy a
  four-tag example. `target-size` (2.5.8) is off without `wcag22aa`.

**4b. The matrix** (UX-VERIFY-13 to 16).

```sh
node "$CHECKS"/ui-matrix.mjs "$BASE" matrix.json ROUTE...
node -e 'let b=0;for(const f of process.argv.slice(1))for(const p of JSON.parse(require("fs").readFileSync(f)).pages)for(const r of p.rows){if(!r.cond.startsWith("tabwalk"))continue;if(!("noRingSelf" in r)||r.noRingSelf!==r.noRing.length+r.ancestorCleared.length||r.ancestorCleared.some(x=>!/ anc[12]$/.test(x)))b++}console.log("violations",b);process.exit(b?1:0)' matrix.json
```

The second command proves the report carries the ancestor pass (UX-VERIFY-16). Run it before you
read the first. Exit 1 means the script is the wrong version: report that and stop the matrix.

Read the JSON, not the exit code, because the script exits non-zero on any failed check:

| Rows | Blocks (Findings) | Advisory (Needs human review) |
|---|---|---|
| reflow and zoom | `hscroll`, a viewport meta with `user-scalable=no` or `maximum-scale=1` | `newClipped`, with its screenshot path |
| scheme rows | background luminance does not match the scheme | none |
| forced colours | text colour equals its background | none |
| reduced motion | an infinite animation under `reduce`, where a duration-token layer exists | the same check elsewhere |
| three Tab walks | `unnamed`, `capped`, `lost` above 1 | `noRing` after the ancestor pass, `fullyObscured` |

Only the scheme rows for schemes the site ships apply. Screenshot a `newClipped` hit and open
it: report it under Findings only when the screenshot shows lost text (class rendered-checked).
A heuristic check never blocks until a human has labelled its firings on at least 20 routes in
`matrix-labels.csv` and the owner has set the false-positive share (UX-VERIFY-13). An agent's own
label never counts. Done: every row has pass, a Finding or a Needs human review item.

**4c. Page structure** (UX-A11Y-28 to 33, UX-VERIFY-04).

```sh
python3 -I "$CHECKS"/page_structure.py --sitemap "$DIST"/sitemap-0.xml --page-list routes.txt "$DIST"
```

`DIST` is the built directory and `routes.txt` is the route list from step 1. Never run it on the bare
directory: fragments and partials give false `h1`, `lang` and title findings (UX-VERIFY-04).

Each hit is a Finding, class measured. The checks cover `lang`, a non-empty title, one `main`, one
`h1`, a skip link, and identical repeated header and navigation across pages.

**4d. Rendered leads.** `focus_diff.mjs` (UX-A11Y-13), `colour_only.mjs` (UX-A11Y-19) and
`focus_opacity.mjs` (UX-A11Y-36, 37) generate leads and decide nothing. Each header names its
options. For the last, `ENGINE=chromium SHOTS=shots node "$CHECKS"/focus_opacity.mjs "$BASE"/ROUTE`,
then again with `MOTION=reduce`. Every `FAIL` and `LEAD` row, and every `colour_only.mjs` `INFO` row after you read the parent
element, goes to Needs human review with its crop path. Open each crop before you write the item. A control at 0.8 opacity with a plain ring is
not a failure, and a zero-size anchor can still show a ring.

Done: each rendered step has its output saved and an entry under `ran:` or `did not run:`.

## 5. Review a CLI

Input: the binary, its headline command, and its action inventory when one exists (UX-ACT-01).
Run `cli_matrix.py` from the `ux-cli` skill's `checks/` directory (`.claude/skills/ux-cli/checks`)
with the options its `--help` lists, and read the `ux-cli` Procedure for the arguments. File each
result as that skill says. A CLI has no rendered surface: list the axe fixture and the matrix under `did not run:` with the reason `no rendered
surface`, and never apply WCAG wording to it (UX-VERIFY-31). A CLI finding has `sc: n/a (CLI)`
and a `rule:` line with its UX-CLI, UX-TEXT or UX-ACT ID.

## 6. Read the code

Evidence class code-read. Read the touched source for the rows no script reaches: the
[MUST list](#the-must-list) below. Write what the source shows, never what a user will hear.
Contrast guessed from a variable name is a guess: compute it or leave it out. Done when every
MUST row you touched has a result.

## 7. The human pass

Add Needs human review items; never record the pass yourself.

- **Screen reader** (UX-VERIFY-18): when the diff adds or changes a dialog, menu, tabs, combobox,
  live region, custom widget or multi-step flow, or a release is being prepared, add an item that
  names NVDA with Chrome, JAWS with Chrome and VoiceOver with Safari on iOS, plus NVDA with Firefox
  for a release. Any "works with NVDA, JAWS or VoiceOver" sentence names the tester, product version
  and date.
- **New in WCAG 2.2** (UX-VERIFY-19): for each row below, run the pattern over the added lines.
  Each hit gets an item with that criterion.

```sh
git diff -U0 --merge-base origin/HEAD | grep -E '^\+' > added.txt
grep -nE 'draggable|dragstart|ondrag|pointermove' added.txt                                  # 2.5.7 Dragging Movements
grep -nE 'href="(mailto:|tel:|[^"]*(help|support|contact))' added.txt                        # 3.2.6 Consistent Help
grep -nE 'aria-current="step"|[Ss]tep [0-9]+ of [0-9]+' added.txt                           # 3.3.7 Redundant Entry
grep -nE 'type="password"|autocomplete="(current-password|new-password|one-time-code)"' added.txt  # 3.3.8 Accessible Authentication (Minimum)
```

The patterns find the common markup only. A multi-step flow with no step markers is missed: add
the item when you see one.

## 8. Try to refute each finding

Before you report, try to disprove it. This is where false positives die.

1. Quote check: `grep -qF -- "QUOTE" FILE` succeeds, or the finding is invented.
2. Criterion check: the `sc:` value is in `"$CHECKS"/wcag22-ids.txt` (86 IDs, 4.1.1 excluded).
3. One defect, one finding: deduplicate by `file:line` and quote. Put a second criterion in `also:`.
4. Hedged wording ("may", "might", "potentially", "could", "possibly") means the finding is not
   established: move it to Needs human review.
5. A finding with no failure scenario (the input, the state, the wrong outcome) is a style opinion:
   drop it.

## 9. Report

Report shape, one document. Every field label below is exact, because the checks under [Rules this skill owns](#rules-this-skill-owns) read them.

```
# UX review: TARGET
single evaluator
ran: axe fixture (axe-core X, five tags), matrix (Chromium N), page_structure.py
did not run: webview colour checks (extension stylesheet not loaded)

## Findings
- file: src/pages/index.astro:42
  quote: <img src="hero.png">
  rule: UX-TEXT-20
  sc: 1.1.1
  also: 4.1.2
  evidence: measured
  severity: MUST
  fix: add an alt attribute that states the image's meaning, or alt="" if decorative

## Needs human review
- sc: 4.1.3
  locator: `#st` at `settings.html:94`
  observed: text injected without a live region (code-read)
  not tested: announcement; no screen reader in the sandbox
  steps: 1. NVDA with Firefox on Windows, activate Save
  expected: "Saved" is spoken and focus does not move
  decides: accessibility owner
  blocking: yes

## Gate facts
axe-core X, wcag2a to wcag22aa, N pages light and dark: 0 violations; needs review: color-contrast 28 nodes; ui-matrix 10/10 on /apps/, Chromium 1255, DATE; not covered: ...
not decided by this run: 34 criteria, including focus order, captions and error suggestion; 13 criteria checked only in part
```

The `rule:` line is this skill's addition: a finding that cannot name a rule ID is a style opinion.
A heuristic finding that no rule backs carries `severity: N (predicted)` with N from 0 to 4 and
the header says `single evaluator` (UX-VERIFY-28).

Order Findings by severity, then by file. Put every untestable or hedged item under Needs human
review. List a Needs human review item only with all eight labels. End with a count per target.

Run the checks on your own report before you hand it over (the fenced blocks under
[Rules this skill owns](#rules-this-skill-owns)), then run the claim scan:

```sh
grep -nEi 'wcag ?(2\.[0-9])? ?(level )?(aa?)? ?(compliant|conformant)|(^|[^A-Za-z])(fully|is|are) accessible([^A-Za-z]|$)|conforms? to wcag|meets (wcag|aa)([^A-Za-z]|$)|passes accessibility|no accessibility (issues|problems)|screen[- ]reader friendly|(ada|508|eaa)[- ](compliant|ready)' report.md
grep -nEi 'users (found|struggle[ds]?|prefer(red|s)?|expect(ed|s)?|abandon(ed|s)?|drop(ped|s)? off|love[ds]?|hate[ds]?)|users will (find|prefer|love|like|enjoy|understand|appreciate|struggle|expect|abandon)' report.md
```

Both print nothing on a pass. A hit in the second needs `session`, `query`, `run` or `n=` on the same
line, or the sentence starts with `hypothesis:` or `predicted:`.

## Rules this skill owns

Each row keeps its ID, severity and verification. Rationale is one line; the reference skill holds
the long form.

| ID | Rule | Why | Verification | Severity |
|---|---|---|---|---|
| UX-VERIFY-18 | Add a Needs human review item for a screen-reader pass when a diff adds or changes a dialog, menu, tabs, combobox, live region, custom widget or multi-step flow, or a release is being prepared. Name NVDA with Chrome, JAWS with Chrome and VoiceOver with Safari on iOS, plus NVDA with Firefox for a release. Never record that pass yourself. | Reading the accessibility tree is not a screen-reader run, and axe passed every loading and error fixture that had no live region. | fence UX-VERIFY-18 | MUST |
| UX-VERIFY-19 | When a diff touches dragging, a help or contact link, a multi-step form or sign-in, add a Needs human review item for the matching WCAG 2.2 criterion (step 7 table). | No axe rule covers these four criteria in the pinned axe-core, and much training data predates WCAG 2.2. | fence UX-VERIFY-19 (step 7) | SHOULD |
| UX-VERIFY-20 | Tag every finding with one evidence class and use only the verbs that class allows (table below). | Without the class the reader cannot tell a tool result from a guess. | fence UX-VERIFY-20 | MUST |
| UX-VERIFY-21 | Give every finding `file:line`, a verbatim quote of at most 120 characters, one primary criterion in `sc:` (a WCAG 2.2 ID from `wcag22-ids.txt`, or a heuristic number), the evidence class, a severity and a one-line fix. Deduplicate by quote. | An unaided code read invented findings and filed one defect under two or three criteria. | fence UX-VERIFY-21 | MUST |
| UX-VERIFY-22 | Split the report into Findings and Needs human review. Hedged or untestable items go to Needs human review with eight labelled fields: `sc:`, `locator:`, `observed:`, `not tested:`, `steps:`, `expected:`, `decides:`, `blocking:`. | A stranger cannot execute "check screen reader compatibility". | fence UX-VERIFY-22 | MUST |
| UX-VERIFY-23 | End every report with a gate-facts block (axe-core version and tags; pages, states and schemes scanned; violation and needs-review counts by rule; matrix rows passed per route with browser build and date; a `not decided by this run:` line). A "none found" sentence takes the form `<tool> found no <rule set> violations in <scope>; not covered: <list>`. | A green gate covers at most 21 of 55 A and AA criteria and none completely. | fence UX-VERIFY-23 | MUST |

Evidence classes (UX-VERIFY-20):

| Class | Allowed verbs and required detail |
|---|---|
| measured | "reported" or "measured", naming the tool, its version and the state |
| rendered-checked | "observed in BROWSER BUILD at VIEWPORT" |
| code-read | "the source shows" |
| inferred | "likely" or "predicted" |
| simulated | carries the banner `SIMULATED (synthetic user), hypothesis only, not user evidence` |

A code-read or inferred finding that says "fails", "violates" or "cannot" without a hedge is a
review defect: move the finding to Needs human review or reword it as likely.

```sh
# UX-VERIFY-18: a screen-reader item names the three pairs (prints nothing on a pass; run only when the diff needs the item)
grep -qE 'NVDA' report.md && grep -qE 'JAWS' report.md && grep -qE 'VoiceOver' report.md || echo "no screen-reader item naming the three pairs"
# UX-VERIFY-19: compare the step 7 hit count with this count of items carrying those criterion IDs
grep -cE 'sc: *(2\.5\.7|3\.2\.6|3\.3\.7|3\.3\.8)' report.md
```

```sh
# UX-VERIFY-20: evidence class count equals finding count (prints nothing on a pass)
sed -n '/^## Findings/,/^## /p' report.md | awk '/^- file:/{f++} /^ *evidence: *(measured|rendered-checked|code-read|inferred|simulated)/{e++} END{if(f!=e){print "findings " f ", evidence lines " e; exit 1}}'
```

```sh
# UX-VERIFY-21: every sc: or also: ID is in the whitelist (prints nothing on a pass)
grep -oE '^ *(sc|also): *[0-9. ,]+' report.md | grep -oE '[0-9]+\.[0-9]{1,2}\.[0-9]{1,2}' | sort -u | awk 'NR==FNR{ok[$1]=1; next} !($1 in ok){print "not a WCAG 2.2 ID: " $1}' "$CHECKS"/wcag22-ids.txt -
# every quote is a verbatim substring of its file: for each finding run
grep -qF -- "QUOTE" FILE
```

```sh
# UX-VERIFY-22: hedges outside quotes and code spans (prints nothing on a pass)
sed -n '/^## Findings/,/^## /p' report.md | grep -vE '^ *quote:' | sed 's/`[^`]*`//g' | grep -nEiw '(may|might|potentially|could|possibly)'
# eight labels per Needs human review item (prints nothing on a pass)
sed -n '/^## Needs human review/,/^## /p' report.md | awk 'BEGIN{n=split("sc:|locator:|observed:|not tested:|steps:|expected:|decides:|blocking:", L, "|")} /^- sc:/{i++} {for(k=1;k<=n;k++) if ($0 ~ "^ *-? *" L[k]) c[k]++} END{for(k=1;k<=n;k++) if (c[k]!=i) print "label " L[k] " " c[k]+0 " of " i+0}'
```

```sh
# UX-VERIFY-23: every negative result has a scope within 3 lines (prints nothing on a pass)
awk '{l[NR]=$0} END{for(i=1;i<=NR;i++) if (tolower(l[i]) ~ /(found no|no (accessibility )?(issues|violations|problems))/) {ok=0; for(j=i;j<=i+3&&j<=NR;j++) if (l[j] ~ /not covered:/) ok=1; if(!ok) print "unscoped negative at line " i}}' report.md
```

Run these from the directory that holds `report.md`.

## The MUST list

A hedge against the scoped rule not having fired: the merge-blocking rows in one line each. The
rule files hold rationale and verification. Review a row only for the target types it applies to.

- **Native and named** (UX-A11Y-01 to 05): native `<button>` and `<a href>`, never `href="#"`;
  every form control labelled; icon-only controls named; the name starts with the visible text. A
  control named only by `title` is a finding.
- **State, widgets, ARIA** (UX-A11Y-07, 08, 10, 11): every visual state in markup; modals through
  `<dialog>` and `showModal()`; no forbidden ARIA; a custom widget only to the full APG contract.
- **Focus** (UX-A11Y-12, 13, 14, 36): never remove a focus indicator without a replacement; 3:1
  indicator; `scroll-padding` under sticky bars; a focused control is visible.
- **Colour, size** (UX-A11Y-15, 16, 19, 20): 4.5:1 text, 3:1 large text and boundaries; never
  colour alone; 24 by 24 CSS px on the rendered box.
- **Announce, motion** (UX-A11Y-22, 23, 25, 26): results go into a status container present and
  empty in the first markup; `role="alert"` for errors only; a pause control past 5 s of motion;
  no flashing over three times a second.
- **Page, webview** (UX-A11Y-28, 32, 33, 35): `lang` and a non-empty title per template; identical
  repeated chrome; in a webview high contrast is tested. A colour outside a `--vscode-*` variable is a SHOULD finding, reported, not blocking.
- **States** (UX-STATE-01 to 05, 08, 14, 15, 17, 18): loading, empty and error branch per async
  view; empty only after the fetch settles; a failure never looks empty; the error names its class
  and one recovery; a pending flag before the first `await`; a deadline on every wait; progress
  and cancel past 10 s; no error only in a toast.
- **Forms, editor** (UX-STATE-20, 21, 23, 24, 25, 27, 28, 29, 31): visible label; submit never
  disabled for invalidity; error text by the field with `aria-describedby`; one focus move after a
  failed submit; input kept; a standard `autocomplete` token; validated input boxes; native
  progress for a host wait of 1 s or more; one notification per action.
- **Text** (UX-TEXT-01 to 04, 08, 10, 17, 20, 21, 25, 28, 30): an error names what failed, quotes the
  input, offers an available next step and states only checked causes; one event, one message;
  no emoji; every `<img>` has `alt`; no `(s)` plurals; byte units match the divisor.
- **Actions** (UX-ACT-01 to 09): an inventory with tiers T0 to T3; `Consequence:` lines on T2 and
  T3; no confirmation on T0; a confirmation awaits its result and tests the confirm label; never
  `OK`, `Yes`, `Confirm`, `Continue` or "Are you sure"; the destructive control never takes first
  focus; a T2 confirmation shows exact content and destination.
- **AI features** (UX-AI-01, 02, 06, 07, 09, 10, 12; UX-AI-05 and 24 are conditional): a visible
  real-text disclosure in `data-ai-disclosure`; no invented machine-readable mark; model output
  never loads a network image or renders raw HTML; a renderer regression test. Legal rows go to
  the owner: never state what a law requires.
- **CLI** (UX-CLI-01, 02, 08, 09, 11, 12, 14, 15, 16, 20 to 22, 24, 26; UX-TEXT-05, 07, 12;
  UX-ACT-12 to 17): the `ux-cli` skill's Non-negotiables and `cli_matrix.py`.
- **Agent interfaces** (UX-AGENT, UX-ACT-18 to 28): the `ux-agent-interfaces` skill's
  Non-Negotiables and its two checks.
- **Verification, claims** (UX-VERIFY-01 to 11, 24 to 31): real browser, five tags, `incomplete`
  baselined; silencing the gate is the owner's; no conformance, Lighthouse-score or percentage
  claim; lab or field named; user outcomes need a record; the simulated banner; the target string
  is "WCAG 2.2 Level AA", used only to select tests; no statement, VPAT or legal sentence.

SHOULD and CONSIDER rows never block. List them apart, and never re-raise one the owner declined.

## Ask the owner

Do not decide these. Put each in Needs human review with `decides:` set, and state the safe default.

- Any conformance claim, accessibility statement, VPAT or "compliant" sentence: product owner and
  legal. Which WCAG version and regime apply: owner and counsel.
- Accepting an exception (disabling a rule, excluding a component, raising a baseline, accepting a
  failing matrix row), and clearing a needs-review item: design or accessibility owner. List the
  item; never clear it.
- The assistive-technology baseline the product commits to, and who the human testers are: owner.
- Removing a brand-defining animation or hero to pass reflow or reduced motion: design owner.
- Accepting synthetic output for a decision, or rating a heuristic finding release-blocking:
  research or design lead.
- An accessibility overlay a customer asks for (default no, UX-VERIFY-32), and quoting a vendor
  statistic in user-facing copy: owner and marketing owner.

## What agents get wrong here

1. **Over-claiming from a green check**: "accessible" after a clean axe or Lighthouse run,
   "responsive" after one resize, "works with screen readers" from an accessibility-tree read,
   "meets Core Web Vitals" from a lab run.
2. **A checker that gives a false green**: a bare `analyze()` that drops `target-size`, asserting
   `violations` and never `incomplete`, jsdom (skips `color-contrast`), one scheme, page-load state
   only, a caret range on axe.
3. **Review noise**: hedged findings written as defects, one defect under three criteria, contrast
   guessed from a variable name, a missed `lang` followed by "none found", 4.1.1 cited from old
   training data.
4. **An advisory matrix hit reported as a defect.** `newClipped`, `noRing` and `fullyObscured` are
   leads. Hit-testing the bounding box of a wrapped link reports a visible link as hidden. An
   agent's label of its own screenshot is no human label.
5. **A stale standard**: defaulting to "WCAG 2.1 AA", WCAG wording on a CLI, "ADA compliant",
   "EAA-ready", WCAG 3 called final.
6. **Invented evidence about people**: "users found X hard" from a screenshot; a synthetic
   persona's agreement as validation; a one-rater severity stated as fact.
7. **Silencing the gate**: `disableRules`, `exclude` or a raised baseline to get green; a
   not-decided criterion dropped because it "looks fine".

## Dates and versions

Measured 2026-11-27. Re-check a row on the event named.

| Fact | Value | Source and date | Re-check when |
|---|---|---|---|
| axe-core coverage | gate rule for 21 of 55 A and AA criteria: 8 DETECT, 13 PARTIAL, 34 none (axe-core 4.14.1) | [axe releases](https://github.com/dequelabs/axe-core/releases), 4.14.1 on 2026-11-16 | each axe release: `gh api 'repos/dequelabs/axe-core/releases?per_page=3' --jq '.[].tag_name'`, then recount |
| Screen-reader pairs | JAWS with Chrome 31.2 %, NVDA with Chrome 17.3 %, JAWS with Edge 17.0 %; VoiceOver 72.2 % on mobile | [WebAIM survey 11](https://webaim.org/projects/screenreadersurvey11/), Jul-Aug 2026, 1,780 responses | a newer survey: `curl -s https://webaim.org/projects/ \| grep -o 'screenreadersurvey[0-9]*' \| sort -u` |
| WCAG 2.2 IDs | 86 IDs, 4.1.1 removed | [WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2024-12-12; [wcag.json](https://www.w3.org/WAI/WCAG22/wcag.json) fetched 2026-11-27 | yearly: rebuild `wcag22-ids.txt` |
| Matrix error rate | no human label exists; an agent labelled 7 firings, 3 true and 4 false | 33-route study, 2026-11-27 | when a human labels the firings |

Core Web Vitals thresholds, the law table and the Playwright tag example are in `verification.md`
of `ux-quality-reference`, each with its own date.

## Siblings

- `ux-quality` (rule) and `ux-quality-reference` own the rules and every script this skill runs.
  `ux-cli` owns the CLI matrix. `ux-agent-interfaces` owns JSON output, MCP tools and approvals.
- `marketing-review` grades marketing copy and claims. `docs-review` grades documentation pages.
- `css-theming` (rule) and `css-theming-reference` (skill) own the cascade that delivers a focus ring or a contrast pair. This skill grades
  the outcome.

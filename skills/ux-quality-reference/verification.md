---
title: What to Run on an Interface Change, and What to Claim Afterwards
summary: The UX-VERIFY family, owning the accessibility gate, the rendered matrix, the shipped check scripts and the claims an agent may and may not write about accessibility, performance and users
---

# What to Run on an Interface Change, and What to Claim Afterwards

Owns the run order, the axe-core gate, the rendered matrix and the wording of every
claim an agent writes after a run. Authoring defaults are `UX-A11Y`, states are
`UX-STATE`, copy is `UX-TEXT`. The report shape (evidence classes, Findings and
Needs human review, the gate-facts block, the screen-reader pass and the new-in-2.2
prompts) is the UX-VERIFY rules 18 to 23, which the `ux-review` skill owns. Tokens,
the cascade and forced-colours mechanics are `css-theming`.

Contents: [Dates and Versions](#dates-and-versions) · [Setup](#setup) ·
[What Runs and in What Order](#what-runs-and-in-what-order) ·
[The Rendered Matrix](#the-rendered-matrix) · [Claims](#claims) ·
[Target and Law](#target-and-law) · [Ask the Owner](#ask-the-owner) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Measured and fetched 2026-11-27. Every row names the event that forces a re-check.
Re-run the commands in block `dates` at publish time and on each event.

| Fact | Source and date | Refresh | Re-check |
|---|---|---|---|
| axe-core 4.14.1 (2026-11-16); 4.14.0 (2026-10-05) turned `label-content-name-mismatch` on by default; 4.13.0 (2026-08-05). The gate has a rule for 21 of 55 A and AA criteria, 8 classed DETECT, 13 PARTIAL, 34 with no rule | [axe releases](https://github.com/dequelabs/axe-core/releases) | each axe bump, about every two months | block `dates`, first command |
| Playwright's accessibility guide shows four tags and drops `wcag22aa`; the page shows no date; 1.65 was the latest listed | [Playwright](https://playwright.dev/docs/accessibility-testing), fetched 2026-11-27 | publish time, then each Playwright minor | block `dates`, second command |
| `@axe-core/playwright` 4.14.1 and `playwright-core` 1.63.0 exist on the npm registry. The matrix and the fixture were run on playwright-core 1.63.0 with Chrome for Testing 159.0.8154.6 | npm registry, checked 2026-11-27 | each axe or Playwright bump | `npm view @axe-core/playwright version` |
| axe keeps WCAG 2.2 rules off by default "until WCAG 2.2 is more widely adopted" | [rule-descriptions.md](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md), fetched 2026-11-27 | each axe minor | block `dates`, third command |
| Lighthouse 13.6.0 scored a page 100 that had 2 confirmed axe failures; the score is a weighted subset that excludes manual and best-practice audits | [scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring), source updated 2023-08-03 | each Lighthouse major | the scoring page, and `npm ls axe-core` in a Lighthouse install |
| 86 WCAG 2.2 success-criterion IDs, 4.1.1 removed | [wcag.json](https://www.w3.org/WAI/WCAG22/wcag.json), fetched 2026-11-27; WCAG 2.2 Recommendation 2024-12-12 | yearly | rebuild `checks/wcag22-ids.txt` (block `dates`) |
| WCAG 3 is an incomplete Working Draft | [W3C](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/), updated 2026-11-16 | yearly | read the status line |
| WCAG-EM 2: a sampled evaluation alone usually does not allow a claim | [WCAG-EM 2](https://www.w3.org/TR/wcag-em-2/), 2026-07-23 | yearly | read the page date |
| ADA Title II names WCAG 2.1 AA; compliance dates 2027-04-26 and 2028-04-26; comment period closed 2026-06-22 | [FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm), 2026-04-20 | 2026-12-31, then quarterly until 2027-04-26 | search govinfo for DOJ Title II web-rule amendments |
| EN 301 549 V4.1.1 (published 2026-09-02) aligns with WCAG 2.2. Its Official Journal citation under Directive 2019/882 is **unverified**; the Commission page (updated 2026-11-23) still lists V3.2.1 | [ETSI](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf), [Commission](https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation) | 2026-12-31 | the Commission page and an EUR-Lex search for the implementing decision |
| Section 508 names WCAG 2.0 (rule of 2017) | [Access Board](https://www.access-board.gov/ict/) | yearly, next 2027-06-01 | search for an ICT refresh proposal |
| The European Accessibility Act applies from 2025-06-28; Germany's BFSG implements it | [Directive 2019/882](https://publications.europa.eu/resource/celex/32019L0882), [BFSG § 1](https://www.gesetze-im-internet.de/bfsg/__1.html) | yearly | national guidance updates |
| FTC order against accessiBe: an automated product cannot be called compliant without evidence | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million), 2025-04-22 | yearly | FTC press search for "accessibility" orders |
| Core Web Vitals "good": LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.1, at the 75th percentile of field loads. Page updated 2024-10-31; thresholds unchanged on 2026-11-27 | [web.dev](https://web.dev/articles/vitals) | publish time, then yearly | block `dates`, fourth command |
| Matrix error-rate study on 33 routes: `newClipped` 6 %, `noRing` 9 % before and 6 % after the ancestor pass, `fullyObscured` 12 %; an agent labelled 7 firings, 3 true and 4 false (95 % interval on the true share 10 % to 82 %); no human labelled any | measured 2026-11-27, playwright-core 1.63.0, Chrome for Testing 159.0.8154.6 | when a human labels the firings, and whenever the script, the theme or the Chromium major changes | re-run the matrix on the same build; a different count means this row is stale |
| NN/g on heuristic evaluation (2023-06-25), synthetic users (2024-06-21), synthetic versus human respondents (2026-10-16) | nngroup.com articles | yearly | the article dates |

```sh
# dates: run at publish time. Read each output against the table row.
gh api 'repos/dequelabs/axe-core/releases?per_page=3' --jq '.[].tag_name'
curl -s https://playwright.dev/docs/accessibility-testing | grep -o -E 'wcag2[0-9a-z]*' | sort -u
curl -s https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md | grep -n target-size
curl -s https://web.dev/articles/vitals | grep -o -E 'Last updated: [A-Za-z]+ [0-9]+, [0-9]{4}|2\.5 seconds|200 milliseconds' | sort -u
curl -s https://www.w3.org/WAI/WCAG22/wcag.json | jq -r '.principles[].guidelines[].successcriteria[].num' | grep -v -x '4.1.1' > wcag22-ids.txt
```

On 2026-11-27 the second command printed `wcag21a wcag21aa wcag2a wcag2aa`; if `wcag22aa` appears, drop the "never copy" clause of UX-VERIFY-02. The fourth printed `200 milliseconds`, `2.5 seconds` and `Last updated: October 31, 2024`; a new date means read the thresholds again. The fifth wrote 86 lines.

## Setup

Run the Node scripts from a project that has the pins installed, so Node resolves them from the project's own `node_modules`: copy `axe-fixture.mjs` and `ui-matrix.mjs` into the repository's test directory, or run them in place from a project root.

```sh
npm i --save-exact axe-core@4.14.1 @axe-core/playwright@4.14.1 playwright-core@1.63.0
CHECKS=.claude/skills/ux-quality-reference/checks   # $CLAUDE_CONFIG_DIR/skills/ux-quality-reference/checks when installed globally
DIST=dist                    # the production build's output directory (astro, vite and next export default to dist or out)
BASE=http://127.0.0.1:4321   # that build served over HTTP, never a dev server
REPORT=report.md             # the run report this review writes
```

Set `PW_CHROMIUM` to a Chromium or headless-shell binary when Playwright's own browser download is absent. A downloaded browser also needs system libraries: if it exits 127 (`error while loading shared libraries: libnspr4.so`), run `npx playwright install-deps chromium`, install the distro packages, or point `LD_LIBRARY_PATH` at a directory that holds them. When the browser cannot start, list steps 3 and 4 under `did not run:` with that reason. Every script prints its own version line. An empty route list or an unreachable `BASE` is a failure, not a pass.

Create the three input files of the gate once, before the first run:

```sh
grep -o '<loc>[^<]*' "$DIST"/sitemap-0.xml | sed -e 's/<loc>//' -e 's|^https\{0,1\}://[^/]*||' > routes.txt   # one route per line
node "$CHECKS"/axe-fixture.mjs "$BASE" --routes routes.txt --update-baseline a11y-baseline.json   # the needs-review baseline (UX-VERIFY-06): read it, then commit it
```

`states.json` is written by hand, one entry per open, error and loading state (UX-VERIFY-05), in the format `node "$CHECKS"/axe-fixture.mjs --help` prints. A step is `click`, `press` or `fill`. `press` takes one key name per step, never text: `{"press":".c"}` aborts the state. Type text with `{"fill":"input[name=email]","text":"a.c"}`. The fixture cannot hold a request open, so reach a loading state through a fixture route or a query flag in the app that renders the state without a response.

## What Runs and in What Order

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-VERIFY-01 | Before reporting an interface change finished, run these in order and list each under `ran:` or `did not run:` with a reason: (1) the gate (UX-VERIFY-02 to 06) on a served build in a real browser, never jsdom; (2) the matrix (UX-VERIFY-13) on every touched route; (3) a code-read review; (4) the Needs human review list. Fix what the first run reports, then run it again. An accessibility instruction in the prompt never replaces the run. A CLI or TUI change lists steps 1 and 2 under `did not run:` with the reason "no rendered surface". | A jsdom run skipped `color-contrast` silently and looked clean (measured 2026-11-27 on a seeded set of 20 defects). One independent study ([arXiv 2503.15885](https://arxiv.org/html/2503.15885v1), March 2025, two models, ten projects) is suggestive only: a checker loop lowered the AChecker inaccessibility rate from 0.347 to 0.292, few-shot instructions raised it to 0.449, and on QualWeb the loop did not help (0.105 to 0.112). So the loop is necessary and not sufficient, which is why step 3 exists. | `grep -n -e '^ran:' -e '^did not run:' "$REPORT"` prints both lines. The PR carries the second run's output and no violation ID from the first run remains. An axe run under jsdom lists `color-contrast` under `did not run:`. | MUST |
| UX-VERIFY-02 | Run axe-core through one shared fixture (`checks/axe-fixture.mjs`, `makeAxeBuilder`) with exactly the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Never call `new AxeBuilder({ page }).analyze()` outside the fixture and never copy Playwright's four-tag example. | Measured on axe-core 4.14.1: the five tags turn on `target-size` (2.5.8), which a default run skips (3 nodes on one measured site appear only with the tags), and a default run also mixes in best-practice rules. Playwright's example drops `wcag22aa`. One measured repository called axe bare in 59 places. | see block UX-VERIFY-02. Re-check the Playwright example on each Playwright minor (block `dates`). | MUST |
| UX-VERIFY-03 | Assert on `incomplete` as well as `violations`: commit a per-rule baseline of needs-review counts, fail the run when any rule's count rises above it, and copy each needs-review node into the Needs human review list. | On one measured docs site 1,141 `color-contrast` nodes on 48 of 49 pages were needs-review while `violations` held none, and `expect(violations).toEqual([])` passes over all of them. | `git grep -n -e '\.incomplete' -- ':(glob)**/*.mjs' ':(glob)**/*.ts'` hits the fixture, and a baseline file is committed. A token change that adds one contrast needs-review node turns `axe-fixture.mjs --baseline FILE` red (exit 1, a `RISEN needs-review` line). | MUST |
| UX-VERIFY-04 | Scan every routable page or template, in every colour scheme the site ships. Take the page list from the router output, the sitemap or an explicit list, never from a walk of `dist/**/*.html`. | On a MkDocs site the dark scheme raised gate violations from 189 to 296 nodes (`link-in-text-block`, 109 nodes). On an Astro site the `_shell/` and `frag/` fragments produced false `document-title` and `html-has-lang` violations. One docs site ships dark only, so a light scan tests a page nobody sees. | see block UX-VERIFY-04 | MUST |
| UX-VERIFY-05 | Scan each interactive state in its own call. Open the state and assert it is visible before `analyze()`. This covers every dialog, menu, popover and command palette, every form error state and each loading, empty and error fixture. | `analyze()` scans only the current state ([Playwright](https://playwright.dev/docs/accessibility-testing)), and a closed dialog is not in the accessibility tree. On one measured site the loop below printed 5 of 10 component files that declare an open state. | see block UX-VERIFY-05. The match is by file basename: a spec that scans a component under another name passes once a comment names it. | MUST |
| UX-VERIFY-06 | Pin `axe-core`, `@axe-core/playwright` and `playwright-core` to exact versions, print the version in the run log, and re-baseline in the same commit as any version bump. The gate imports the pinned copy, never a copy another package bundles. | axe-core 4.14.0 (2026-10-05) turned `label-content-name-mismatch` on by default. The 4.14.1 notes (2026-11-16) say its fixes "can change color-contrast and target-size results in either direction" ([releases](https://github.com/dequelabs/axe-core/releases)). One measured script loaded the axe-core copy that a Lighthouse CLI pulls in. | see block UX-VERIFY-06 | MUST |
| UX-VERIFY-07 | On every pull request that touches interface code of a site or webview with built output, make the gate and the matrix blocking checks. Keep the all-pages, all-states sweep in the scheduled deep tier. | A check that does not block a merge does not stop an agent's change. Measured: axe ran only in the nightly or labelled deep tier of one repository, and two other repositories had no accessibility check at all. The matrix takes about 13 s per page on a production build. | `git grep -n -E -e 'axe' -e 'a11y' -e 'ui-matrix' -- ':(glob).github/workflows/**' 'taskfile.yml' ':(glob)taskfiles/**'` shows a job on `pull_request` with no label condition (reading). | MUST |
| UX-VERIFY-08 | Keep a red-demo run: plant an image without `alt` and an unlabelled button and require the gate to fail. Run it when the gate config changes and in the deep tier. | It proves that a green run can go red. | `node "$CHECKS"/axe-fixture.mjs --red-demo` exits 0 and prints `red-demo: gate failed as expected`. CI expects that exit. | MUST |
| UX-VERIFY-09 | Keep `best-practice` results in a separate result set labelled house policy. A team may block on them, but they never count toward or against a WCAG statement. | `region`, `landmark-one-main`, `landmark-unique`, `page-has-heading-one` and `aria-dialog-name` fired on all three measured builds and are not WCAG failures. Mixing the tags makes a WCAG statement false in both directions. | `git grep -n -E -e "wcag2[0-9a-z]*['\"].*best-practice" -- ':(glob)**/*.mjs' ':(glob)**/*.ts'` prints nothing. The fixture prints best-practice hits as `best-practice (house policy, not WCAG)` lines and blocks on them only with `--block-best-practice`. | MUST |
| UX-VERIFY-10 | Silencing the gate is an owner decision, not an agent fix (Ask the Owner, "Accepting an exception"). Disabling an axe rule, excluding an element, raising a baseline or skipping a matrix row needs the owner's approval in the pull request and a written reason at the call site. Link the issue when the reason is a deferred defect. | `disableRules` and `exclude` silence every rule on the element ([Playwright](https://playwright.dev/docs/accessibility-testing), fetched 2026-11-27), so the call site does not show what was given up. Only the owner can accept that. | see block UX-VERIFY-10. A diff that adds a hit carries an approval note. | MUST |
| UX-VERIFY-11 | Scan VS Code webview markup with the same gate: render each golden HTML fixture in a shell with `<html lang>`, `<title>` and `<main>`, load the extension's stylesheet, stub the `--vscode-*` variables, and list `color-contrast` and `target-size` under `did not run:` until both load. | Webview HTML is built in template strings that no lint reads (271 markup lines in one measured extension). Its 122 goldens are a versioned corpus axe can scan without starting VS Code. Unstyled, 63 of 122 showed violations and 274 of 347 nodes were `target-size` on unstyled fragments, an upper bound and not a finding. | `node "$CHECKS"/axe-fixture.mjs --html-dir DIR --css FILE --vars FILE` over the goldens exits 0. Adding `<button></button>` to one golden turns it red. Without both files the script prints the `did not run:` list itself. | MUST |
| UX-VERIFY-12 | In each Astro repository, add `eslint-plugin-astro`'s `jsx-a11y-recommended` config and install `eslint-plugin-jsx-a11y` beside it (ESLint 10 or newer). | `astro.configs.recommended` does not enable the 36 `astro/jsx-a11y/*` rules ([user guide](https://github.com/ota-meshi/eslint-plugin-astro/blob/main/docs/user-guide.md), plugin 3.2.2, commit 2026-11-26). TS-WEB-06 covers JSX, not `.astro`. SHOULD because nobody has run the config over a large component set. Lint cannot see rendered output, so it never replaces UX-VERIFY-02. | see block UX-VERIFY-12 | SHOULD |

```sh
# UX-VERIFY-02: files that build axe without the five tags. Every printed line is the finding.
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.js' ':(glob)**/*.mjs' ':(exclude,glob)**/node_modules/**' \
  | xargs -0 -r awk '/new AxeBuilder\(/ { use[FILENAME] = 1 } /wcag22aa/ { tag[FILENAME] = 1 } END { for (f in use) if (!(f in tag)) print f }'
node "$CHECKS"/axe-fixture.mjs --print-tags   # prints the five tags
```

```sh
# UX-VERIFY-04: the gate's route list equals the sitemap, and no fragment is scanned. Print nothing on a pass.
python3 -I "$CHECKS"/page_structure.py --sitemap "$DIST"/sitemap-0.xml --page-list routes.txt "$DIST" | grep -e 'UX-VERIFY-04'
# one --schemes entry per scheme the theme offers; the gate-facts line must list the same schemes
node "$CHECKS"/axe-fixture.mjs "$BASE" --routes routes.txt --schemes light,dark --baseline a11y-baseline.json
# a directory walk must not feed the route list
git grep -n -E -e 'readdir' -e 'glob' -- ':(glob)**/tests/**'
```

```sh
# UX-VERIFY-05: open-state components that no scanning spec names. Every printed line is the finding.
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.astro' ':(glob)**/*.tsx' ':(glob)**/*.vue' ':(glob)**/*.svelte' ':(glob)**/tests/**/*.ts' ':(glob)**/tests/**/*.js' ':(glob)**/tests/**/*.mjs' \
  | xargs -0 -r awk '
      /<dialog|role=.?(dialog|alertdialog|menu|listbox)|aria-haspopup|popover/ { if (FILENAME !~ /tests\//) open[FILENAME] = 1 }
      /toBeVisible/ { vis[FILENAME] = 1 }
      /analyze\(/ { scan[FILENAME] = 1 }
      { if (FILENAME ~ /tests\//) text[FILENAME] = text[FILENAME] "\n" $0 }
      END {
        for (c in open) {
          n = c; sub(/.*\//, "", n); sub(/\.[^.]*$/, "", n); hit = 0
          for (s in text) if (vis[s] && scan[s] && index(text[s], n)) hit = 1
          if (!hit) print "no open-state scan: " c
        }
      }'
# the fixture's --states file drives each open state: click or press, then wait until visible, then analyze
node "$CHECKS"/axe-fixture.mjs "$BASE" --routes routes.txt --states states.json --baseline a11y-baseline.json
```

```sh
# UX-VERIFY-06: prints nothing when every pin is exact. The run log must also show "axe-core 4." and npm ls lists one version.
grep -n -E -e '"axe-core": "[\^~]' -e '"@axe-core/playwright": "[\^~]' -e '"playwright-core": "[\^~]' package.json
npm ls axe-core
```

```sh
# UX-VERIFY-10: a disable or exclude with no comment on the line above is the finding. Every printed line is read.
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/tests/**' ':(glob)**/*.spec.*' ':(glob)**/*.test.*' \
  | xargs -0 -r awk 'FNR == 1 { prev = "" } /disableRules|\.exclude\(/ && prev !~ /(\/\/|\/\*|\*|#)/ { print FILENAME ":" FNR ": " $0 } { prev = $0 }'
```

```sh
# UX-VERIFY-12: prints a number above 0, and a seeded <img src="x"> in an .astro file fails lint.
npx eslint --print-config src/pages/index.astro | grep -c 'astro/jsx-a11y'
```

## The Rendered Matrix

The matrix is `checks/ui-matrix.mjs`. It reports ten rows per route. Only the objective checks block. The heuristic checks are advisory because no human has labelled a firing: the matrix's error rate against a human viewer is unmeasured (Dates and Versions, study row). **Without a human label, no heuristic check may block.**

| Row | Condition |
|---|---|
| 1 to 3 | reflow at 320x1024, zoom 200 % (640x360), zoom 400 % (320x180) |
| 4, 5 | light scheme, dark scheme (only the schemes the site ships) |
| 6, 7 | forced colours, reduced motion |
| 8 to 10 | Tab walk at 1280x720, at 320x180, and under forced colours |

| Rows | Blocking (objective) | Advisory (heuristic, error rate unmeasured) |
|---|---|---|
| 1 to 3 | `hscroll` (`scrollWidth > clientWidth + 1`); a viewport meta with `user-scalable=no` or `maximum-scale=1` | `newClipped` |
| 4, 5 | background luminance matches the scheme | none |
| 6 | `forced-colors` matches and no visible text has a colour equal to its background | none |
| 7 | zero infinite animations and no smooth scroll under `reduce`, where the codebase has a duration-token layer (`--motion block`) | the same check, where it has none |
| 8 to 10 | `unnamed`, `capped`, `lost` above 1 | `noRing`, `fullyObscured` |

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-VERIFY-13 | After any change to the markup, CSS or script of a rendered page, run `node "$CHECKS"/ui-matrix.mjs "$BASE" out.json ROUTE...` against a served production build, for every touched route plus `/`, and read every `FAIL` line. The shipped script exits 1 only when a blocking check fails; for any other matrix script, read the blocking fields of the JSON report, never its exit code. Put each advisory hit in Needs human review with its screenshot path. A heuristic check becomes blocking only after a human labels every firing on at least 20 routes as `defect` or `not-defect` in `matrix-labels.csv` (header `route,row,check,stop,label,labeller`; an agent's label, including one from a screenshot it viewed, does not count), the owner sets the false-positive share that may block, and this rule is revised. | Axe and static checks cannot see reflow, zoom clipping, hidden focus or motion. The heuristics are unvalidated: the clipped-text check first counted `.sr-only` spans as clipped, 11 blank stops at 400 % zoom on one measured page are unexplained, and the one desktop focus failure was a probable false positive. WCAG equates 320 CSS px with a 1280 px window at 400 % zoom ([Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), updated 2026-10-04). Playwright has no zoom option, so the script shrinks the viewport. Against a dev server a Tab walk took 9 to 10 s per page, against 1.5 to 5.5 s on a production build. | see block UX-VERIFY-13. A CI change that makes `newClipped`, `noRing` or `fullyObscured` block needs a `matrix-labels.csv` that passes both `awk` checks in the block. | MUST |
| UX-VERIFY-14 | Fail a reflow or zoom row when the document scrolls horizontally (`scrollWidth > clientWidth + 1`). When text is clipped by `overflow` in an element that was not clipped at 1280 px, file a Needs human review item with a screenshot path, and report it under Findings only after a screenshot shows the lost text (evidence class rendered-checked). | WCAG 1.4.10 and 1.4.4 (AA). Horizontal scroll is a direct measurement of the 1.4.10 failure, and it fired on 11 of 33 measured routes, all on one catalog build. The clipped-text test is a heuristic with no measured error rate. | see block UX-VERIFY-14 | MUST for horizontal scroll; the clipped-text check is advisory |
| UX-VERIFY-15 | In each Tab walk, fail when a stop has an empty accessible name read from the browser accessibility tree (never `textContent`), when the walk does not wrap within 120 stops, or when focus lands on `body` more than once. File a Needs human review item, not a failure, when a stop shows no pixel change between its focused and blurred screenshots after the UX-VERIFY-16 ancestor pass, or when a stop is entirely hidden. A stop is entirely hidden when, for each rectangle of its `getClientRects()` that intersects the viewport, all nine sample points (3 by 3 inside that rectangle) hit an element that is neither the stop nor a descendant. Never sample the bounding box of an inline element that wraps. The item names the covering element and its `position`. Partial overlap is a review hint. | WCAG 4.1.2 (A), 2.4.7 (AA), 2.4.11 (AA), 2.1.2 (A). Under 2.4.11 only an entirely hidden component fails ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), updated 2026-06-15). The computed `outline` value misled in both directions, so the name, wrap and lost-focus checks read browser state. The old bounding-box hit test caused 2 of 4 false obscured firings: a link that wraps has a box spanning the gap between its lines, and the points hit the parent. Nine points per line box removed both and kept both true firings (a fixed "Contents" button over the focused link at 400 % zoom). One centre point per line box added new false firings on small buttons. `unnamed`, `capped` and `lost` fired on 0 of 33 routes. | see block UX-VERIFY-15 | MUST for the objective checks; the pixel and hit-test checks are advisory |
| UX-VERIFY-16 | Before reporting a stop with no focus indicator as a defect, repeat the screenshot diff on the focused element's nearest two ancestors. If an ancestor changes, the stop passes. If nothing changes, file the stop under Needs human review, never Findings. File it there as well when `elementFromPoint` finds the element in view but the screenshot shows it blank. | A ring may sit on a parent (`:has(:focus-visible)` or `:focus-within`): one measured control had `outline: none` while its parent drew the ring. The pass ran on 33 routes and 99 walk rows: 25 stops had no visible indicator, 11 were cleared (9 at the second ancestor), 14 remained, including that control and 11 stops with `solid 2px` outlines that were blank at 400 % zoom. The cause of those 14 was not isolated: an inset outline, or `:focus-visible` no longer matching after the script's blur and refocus. So the pass is necessary and not sufficient. | see block UX-VERIFY-16 | MUST |
| UX-VERIFY-17 | Once per codebase, extend the matrix with the scriptable checks no axe rule covers: a text-spacing override causes no clipping (1.4.12); hover or focus content is dismissible with Escape (1.4.13); orientation is not locked (1.3.4); each modal exits on Escape and returns focus to its trigger (2.1.2); text-only 200 % resize, by setting the root font size, causes no loss (1.4.4); the 256 CSS px-high case passes for horizontally scrolling layouts (1.4.10). | No axe rule exists for these criteria, but a deterministic assertion can check each. Viewport shrink does not cover text-only scaling. SHOULD because none of these checks is implemented or measured yet. | `git grep -n -E -e '1\.4\.12' -e '1\.4\.13' -e '1\.3\.4' -e '[Ee]scape' -- ':(glob)**/tests/**'` shows one named test per criterion. For each widget with a dialog role a test presses Escape and asserts focus on the trigger. | SHOULD |

```sh
# UX-VERIFY-13: the report has ten rows per route (fewer scheme rows when --schemes names one scheme).
node "$CHECKS"/ui-matrix.mjs "$BASE" out.json / /docs/
node -e 'for (const p of JSON.parse(require("fs").readFileSync(process.argv[1])).pages) console.log(p.path, p.rows.length, "rows")' out.json
# labels: the first prints 20 or more, the second prints nothing
awk -F, 'NR>1{r[$1]=1} END{print length(r)}' matrix-labels.csv
awk -F, 'NR>1 && ($5!="defect" && $5!="not-defect" || $6 !~ /^human:/)' matrix-labels.csv
```

```sh
# UX-VERIFY-14: prints nothing when no row scrolls horizontally. Each non-empty newClipped needs a review item.
node -e 'for(const p of JSON.parse(require("fs").readFileSync(process.argv[1])).pages)for(const r of p.rows)if(r.hscroll)console.log(p.path,r.cond)' out.json
```

```sh
# UX-VERIFY-15: every FAIL line is read; the blocking fields of every walk row. Prints nothing on a pass.
node -e 'for(const p of JSON.parse(require("fs").readFileSync(process.argv[1])).pages)for(const r of p.rows)if(r.cond.startsWith("tabwalk")&&(r.unnamed.length||r.capped||r.lost>1))console.log(p.path,r.cond,r.unnamed.join(","),r.capped,r.lost)' out.json
# script regression check: serve the shipped fixtures and run the matrix on them
(cd "$CHECKS"/fixtures/verify/matrix && python3 -m http.server 4411) &   # stop the server afterwards
node "$CHECKS"/ui-matrix.mjs http://127.0.0.1:4411 fx.json /clean.html /wrapped-link.html /fixed-pill.html /ancestor-ring.html
# pass: fullyObscured is empty on clean.html and wrapped-link.html in every walk row, and holds exactly one
# entry (covered-by button.pill position=fixed) on fixed-pill.html in every walk row.
```

```sh
# UX-VERIFY-16: the pass is implemented when this prints "violations 0" and exits 0. A report from a script without the pass prints violations N.
node -e 'let b=0;for(const f of process.argv.slice(1))for(const p of JSON.parse(require("fs").readFileSync(f)).pages)for(const r of p.rows){if(!r.cond.startsWith("tabwalk"))continue;if(!("noRingSelf" in r)||r.noRingSelf!==r.noRing.length+r.ancestorCleared.length||r.ancestorCleared.some(x=>!/ anc[12]$/.test(x)))b++}console.log("violations",b);process.exit(b?1:0)' out.json
# regression: ancestor-ring.html reports one ancestorCleared entry ending in anc1 and an empty noRing in every walk row.
```

Each walk row writes `noRingSelf` (stops whose own clip shows no change), `ancestorCleared` (entries ending in ` anc1` or ` anc2`) and `noRing` (the stops that remain), so `noRingSelf` equals `ancestorCleared` plus `noRing`. The fixtures under `checks/fixtures/verify/matrix/` are the script's regression set: `clean.html` passes, `wrapped-link.html` must not report the wrapped link as obscured, `fixed-pill.html` must report exactly the covered link, `ancestor-ring.html` must clear by `anc1`, and `no-ring.html` must fail `unnamed` and list `noRing`.

## Claims

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-VERIFY-24 | Never write a predicate claim of accessibility or conformance, in findings, summaries, commits, PR text, docs or release notes. Banned: "is accessible", "fully accessible"; "WCAG (2.x) (AA) compliant" or "conformant", "conforms to WCAG", "meets WCAG", "meets AA"; "passes accessibility", "no accessibility issues", "screen-reader friendly"; "ADA compliant", "Section 508 compliant", "EAA compliant", "EAA-ready". Technical nouns ("accessible name", "accessibility tree") stay allowed, and so does quoting a human's signed decision or a cited source. Write what ran instead: "ui-matrix passed 10 of 10 rows on /apps/ in Chromium 1255 on 2026-11-27". | A WCAG claim needs a date, the version, the level, the page scope and the technologies relied upon ([WCAG 2.2 §5.3](https://www.w3.org/TR/WCAG22/), 2024-12-12). A sampled evaluation alone usually does not allow a claim ([WCAG-EM 2](https://www.w3.org/TR/wcag-em-2/), 2026-07-23). The FTC order of 2025-04-22 bars claiming, without evidence, that an automated product makes a site WCAG compliant. These sources cover conformance claims only, so the ban covers only that wording; "intuitive" and "user-friendly" are not banned here. | see block UX-VERIFY-24 | MUST |
| UX-VERIFY-25 | Never cite a Lighthouse accessibility score as accessibility evidence. Keep the score as a CI regression gate. In a report it appears only inside the gate-facts block as "Lighthouse accessibility audits (weighted automated subset): N", and never on a public surface (README, docs, release notes, landing page) or as a pass verdict. | Lighthouse 13.6.0 scored 100 on a page with 2 confirmed `label-content-name-mismatch` nodes, and 100 on another with 85 contrast nodes needing review. The score is a weighted average of pass-or-fail axe audits and counts needs-review as a pass. | see block UX-VERIFY-25. A threshold in `.lighthouserc.*` is a gate, not a claim. | MUST |
| UX-VERIFY-26 | Quote no coverage or conformance percentage. Any other statistic in a UX finding carries the figure, the sample (n and who), the date the source states, the URL, a label (platform, independent study or vendor data) and the metric's definition. Compute any report score from the recorded findings and show the weights table beside it. The only coverage figure allowed is a count with its command: "axe-core 4.14.1 has a gate rule for 21 of 55 A and AA criteria, 8 classed DETECT". | The circulating figures (57 %, 40 %, "20 to 30 %") count different units: issue volume, seeded barriers, criteria. None describes a given page. | see block UX-VERIFY-26. Every other `%` in a finding has `n=`, a four-digit year, a URL and a label nearby (reading). | MUST |
| UX-VERIFY-27 | Say whether every performance statement is lab or field data. Write "meets Core Web Vitals" only with a named field source (CrUX or real-user monitoring). Report a Lighthouse or local-trace number as, for example, "lab LCP 1.9 s on MACHINE, PROFILE". | "Good" is LCP at most 2.5 s, INP at most 200 ms and CLS at most 0.1 at the 75th percentile of field loads. Lab data "is not a substitute for field measurement" ([web.dev](https://web.dev/articles/vitals), page updated 2024-10-31, thresholds unchanged on 2026-11-27). | see block UX-VERIFY-27 | MUST |
| UX-VERIFY-28 | A sentence about what users did, felt or will do needs a record in the same sentence: a session, log query or test-run ID, and n. Without one, start it with "hypothesis:" or "predicted:". This covers "users found", "users prefer", "users struggle", "users expect", "users will find" and "users will love". It does not cover a description of interface behaviour ("users will be prompted", "users will see a dialog"). Mark each heuristic finding with the heuristic's name, a 0 to 4 severity labelled "predicted", and "single evaluator" in the report header. | NN/g asks for three to five independent evaluators, says a violation "does not necessarily mean it's a problem" and that heuristic evaluation "cannot replace user research" ([NN/g](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/), 2023-06-25). Two 2025 studies of LLM heuristic evaluation disagree: 21.2 % overlap with experts ([arXiv 2506.16345](https://arxiv.org/abs/2506.16345)) against 73 to 77 % on a benchmark built partly from the model's own output ([arXiv 2507.02306](https://arxiv.org/html/2507.02306v1)). | see block UX-VERIFY-28. Heuristic findings carry `severity: N (predicted)`, and the report header says `single evaluator`. | MUST |
| UX-VERIFY-29 | Put the banner `SIMULATED (synthetic user), hypothesis only, not user evidence` on any output from a synthetic user, a persona prompt or an LLM "user test". Never let such output set a status of validated, tested, passed or approved, and never use it to choose between designs. | NN/g limits synthetic users to desk research, hypotheses and piloting a study guide ([NN/g](https://www.nngroup.com/articles/synthetic-users/), 2024-06-21). In one comparison more than 50 distinct labels from 604 humans collapsed to about a dozen from 120 synthetic respondents ([NN/g](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/), 2026-10-16; one platform, one topic). | see block UX-VERIFY-29 | MUST |

```sh
# UX-VERIFY-24: any hit is the finding. Run it on the report, the PR text, and on `git diff -U0 "$BASE"` output.
grep -n -E -i -e 'wcag ?(2\.[0-9])? ?(level )?(aa?)? ?(compliant|conformant)' -e '(fully|is|are) accessible([^[:alnum:]_]|$)' -e 'conforms? to wcag' -e 'meets (wcag|aa)([^[:alnum:]_]|$)' -e 'passes accessibility' -e 'no accessibility (issues|problems)' -e 'screen[- ]reader friendly' -e '(ada|508|eaa)[- ](compliant|ready)' "$REPORT"
```

```sh
# UX-VERIFY-25: any hit is a claim line to remove.
git grep -n -i -E -e 'lighthouse[^.]{0,30}100' -e 'lighthouse[^.]{0,30}score' -- ':(glob)**/README*' ':(glob)docs/**' ':(glob)**/CHANGELOG*' ':(glob)**/*.mdx'
```

```sh
# UX-VERIFY-26: any hit in agent output is the finding.
grep -n -E -i -e '[0-9]+ ?% ?(of )?(wcag|accessib|compliant|covered|conform|issues)' "$REPORT"
```

```sh
# UX-VERIFY-27: a line naming a metric with neither "lab" nor "field", and "meets Core Web Vitals" with no CrUX or RUM. Every printed line is the finding.
awk '/LCP|INP|CLS|Core Web Vitals/ && !/[Ll]ab|[Ff]ield/ { print FILENAME ":" FNR ": " $0 } tolower($0) ~ /meets core web vitals/ && !/CrUX|RUM/ { print FILENAME ":" FNR ": " $0 }' "$REPORT"
```

```sh
# UX-VERIFY-28: an outcome claim with no record and no hypothesis marker. Every printed line is the finding.
awk 'tolower($0) ~ /users (found|struggle[ds]?|prefer(red|s)?|expect(ed|s)?|abandon(ed|s)?|drop(ped|s)? off|love[ds]?|hate[ds]?)|users will (find|prefer|love|like|enjoy|understand|appreciate|struggle|expect|abandon)/ && tolower($0) !~ /session|query|run|n=|^ *(hypothesis|predicted):/ { print FILENAME ":" FNR ": " $0 }' "$REPORT"
```

```sh
# UX-VERIFY-29: the two counts are equal, and the second command prints nothing near a simulated block.
grep -c -E -e '^ *evidence: *simulated' "$REPORT"
grep -c -F -e 'SIMULATED (synthetic user), hypothesis only, not user evidence' "$REPORT"
grep -n -E -i -e 'validated' -e 'confirmed by users' -e 'user-tested' "$REPORT"
```

## Target and Law

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-VERIFY-30 | Wherever a target is named, write "WCAG 2.2 Level AA" and use it only to select the test set, never as a claim. Use WCAG 2.1 AA, or 2.0 AA with a 4.1.1 Parsing check, only in a deliverable the owner documents as bound by ADA Title II or Section 508. Never state a WCAG 3 target. | WCAG 2.2 has been the current Recommendation since 2024-12-12 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)), and a 2.2 AA run covers the 2.1 AA criteria except 4.1.1. EN 301 549 V4.1.1 aligns with 2.2, but its Official Journal citation is **unverified** and the Commission still lists V3.2.1, so V4.1.1 is no legal basis for 2.2 today. ADA Title II names WCAG 2.1 AA ([FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm), 2026-04-20). Section 508 names WCAG 2.0 ([Access Board](https://www.access-board.gov/ict/), rule of 2017). WCAG 3 is an incomplete Working Draft. | see block UX-VERIFY-30 | MUST |
| UX-VERIFY-31 | Never draft or publish a conformance claim, an accessibility statement, a VPAT or an ACR, or a sentence about a legal regime (ADA, Section 508, the EAA, BFSG, EN 301 549). Never apply WCAG conformance wording to a CLI, a TUI or native VS Code UI. When the owner makes a claim, check it against the five components of WCAG 2.2 §5.3.1 and report the gaps: the date; the guideline title, version and URI; the level; the page scope, including subdomains; the technologies relied upon. | WCAG conformance is "defined only for web pages" ([WCAG 2.2 §5](https://www.w3.org/TR/WCAG22/)). Scope, dates and exemptions depend on facts the agent cannot know, and the ADA Title II dates moved on 2026-04-20. | see block UX-VERIFY-31. A published claim passes the five-item checklist. | MUST |
| UX-VERIFY-32 | Do not add, recommend or configure an accessibility overlay or auto-fix widget. When a request asks for one, put it to the owner. | Conformance rates the page's own content (WCAG §5.2.5 Non-Interference, §5.3). The FTC order of 2025-04-22 binds one vendor, not overlays as such, so this is catalog policy and not law. A competent model already avoids overlays, which is why it is SHOULD. | see block UX-VERIFY-32 | SHOULD |

```sh
# UX-VERIFY-30: each hit is allowed only in an owner-documented legal deliverable.
git grep -n -i -E -e 'wcag ?2\.[01][^.]{0,20}(aa|target|required|compliance)' -e 'wcag ?3[^.]{0,20}(aa|target|required|compliance)'
```

```sh
# UX-VERIFY-31: any hit in an agent diff goes to Needs human review. Every printed line is read.
git diff -U0 "$BASE" | grep -E -i -e '^\+.*(conformance statement|accessibility statement|vpat|section 508|european accessibility act|bfsg|en 301 549)'
```

```sh
# UX-VERIFY-32: a hit is allowed only in text that warns against overlays.
git grep -n -i -E -e 'accessibe' -e 'userway' -e 'equalweb' -e 'audioeye' -e 'accessibility (overlay|widget)' -- package.json ':(glob)src/**' ':(glob)docs/**'
```

## Ask the Owner

An agent lists these and never decides them.

| Decision | Who decides |
|---|---|
| Publishing or changing any conformance claim, accessibility statement, VPAT, ACR or "compliant" sentence on a page, README, release note or store listing | product owner and legal |
| Which target applies (level, WCAG version), and whether the product is in scope of ADA Title II, Section 508, the EAA or BFSG | owner and counsel |
| Accepting an exception: disabling a rule, excluding a component, raising a needs-review baseline, or accepting a failing matrix row | design or accessibility owner |
| Clearing a needs-review item (contrast over images or gradients, name versus label). The agent lists the item and does not clear it | accessibility owner |
| Naming the human who labels matrix firings in `matrix-labels.csv`, and setting the false-positive share at which a heuristic check may block. No source sets one | owner |
| Removing a brand-defining animation or hero to pass reflow or reduced motion | design owner |
| Whether synthetic output is acceptable for a decision, and choosing between designs when the only evidence is simulated or heuristic | research or design lead |
| Rating a heuristic finding as release-blocking | design lead |
| Adding an overlay at a customer's request. The default answer under UX-VERIFY-32 is no | owner |
| Quoting a vendor statistic in user-facing copy | marketing owner |

## What Agents Get Wrong Here

Ranked by how often each bites. The first group is the most frequent.

1. **Writes "accessible", "WCAG AA compliant" or "passes accessibility" after a green axe or Lighthouse run** (UX-VERIFY-24, UX-VERIFY-25). Write what ran, on what, with which result, and what was not covered.
2. **Copies Playwright's four-tag snippet or calls `analyze()` bare**, and loses `target-size` (UX-VERIFY-02). 59 bare calls were measured in one repository.
3. **Asserts only `violations`** and never reads `incomplete` (UX-VERIFY-03). A contrast problem sits in needs-review while the run is green.
4. **Runs axe under jsdom**, where `color-contrast` does not run (UX-VERIFY-01).
5. **Scans the page-load state in one scheme**, walks `dist/` including fragments, or scans a closed dialog (UX-VERIFY-04, UX-VERIFY-05).
6. **Reports an advisory matrix hit as a confirmed defect**, fails a pull request on it, or labels the firings from its own screenshots and treats that as the error-rate study (UX-VERIFY-13 to UX-VERIFY-16). Three false positives were found before the script was fixed.
7. **Hit-tests the bounding box of a focused inline link.** A wrapped link spans the gap between its lines, so a visible link reads as hidden (UX-VERIFY-15).
8. **Reads focus from computed `outline` alone**, or trusts a pixel diff that ignores an ancestor's ring (UX-VERIFY-15, UX-VERIFY-16).
9. **Bumps axe with a caret range**, so counts move with no baseline change (UX-VERIFY-06).
10. **Adds `disableRules`, `exclude` or a raised baseline to reach green** (UX-VERIFY-10).
11. **Writes "users found X hard" from a screenshot or a code read**, or treats a persona's agreement as validation (UX-VERIFY-28, UX-VERIFY-29).
12. **Says "meets Core Web Vitals" from a lab run**, or quotes "automation catches 57 %" with no sample or unit (UX-VERIFY-27, UX-VERIFY-26).
13. **Defaults to "WCAG 2.1 AA"**, writes "ADA compliant" or "EAA-ready", or applies WCAG wording to a CLI or a native VS Code UI (UX-VERIFY-30, UX-VERIFY-31).
14. **Suggests an overlay for quick compliance** (UX-VERIFY-32).

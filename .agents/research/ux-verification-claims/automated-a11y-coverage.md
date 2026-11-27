---
title: "Automated accessibility coverage: what an axe gate decides on WCAG 2.2 A and AA, and what stays human"
program: product
sub_program: ux
topic: ux-verification-claims
worker: automated-a11y-coverage
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
scope: "Which of the 55 WCAG 2.2 A and AA success criteria an automated engine can decide; the exact axe-core tag set, rule set and CI tier for the OCX and Grimoire fleet; whether a Lighthouse score may appear in a claim; which coverage figure may be quoted; lint coverage for .astro files and VS Code webview HTML. Not covered: authoring defaults (UX-A11Y) and the wording of claims (the evidence-and-claims dive). Measured on built output on 2026-11-27 with axe-core 4.14.1 and Lighthouse 13.6.0; the date of each external fact is stated beside it."
---

# Automated accessibility coverage

## Table of contents

1. Summary
2. Findings (1 what axe decides; 2 what the fleet's gates run today; 3 measured runs; 4 Lighthouse; 5 the 55-row table; 6 WebAIM categories mapped to axe rules; 7 lint layers; 8 coverage figures; 9 checker loops for agents)
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Cross-territory findings
9. Sources

## Summary

- No automated engine decides any of the 55 WCAG 2.2 A and AA criteria completely. A green axe run means "no failure found by these rules", never "the criterion is met".
- Measured: axe-core 4.14.1 has an enabled-by-default rule tagged to 20 of the 55 criteria; the gate tag set below adds `target-size` (2.5.8) for 21 (command in 1.1). W3C ACT rules map as primary to 23 of 55 (86 atomic rules, clone dated 2026-10-26).
- Classified in the table: 8 criteria DETECT (a gate rule reports a definite failure for the common case), 13 PARTIAL (only a slice, or needs-review output), 34 HUMAN (no axe rule in the gate). 8 of the 34 can be scripted in Playwright by the fleet itself (plus one PARTIAL, 1.4.12).
- Gate tags, exact: `runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] }`. Measured: in 4.14.1 this tag set runs `target-size` although the rule is disabled by default; a bare `axe.run()` or `new AxeBuilder({ page }).analyze()` does not run it (ocx.sh: 3 `target-size` nodes seen only with the tags).
- A bare default run is also wrong the other way: it mixes in `best-practice` rules (`region`, `landmark-one-main`, `landmark-unique`, `page-has-heading-one`, `aria-dialog-name`) that are not WCAG failures, so one number cannot back a WCAG statement.
- `incomplete` (needs review) is where much of the unresolved risk sits: on the grimoire.rs build, 1,141 `color-contrast` nodes on 48 of 49 pages are `incomplete` while `violations` holds none for contrast. `expect(violations).toEqual([])` passes over all of it.
- The fleet's ocx.sh gate runs axe only in the deep tier, with no tags (`git grep -n withTags -- tests` returns no line in `ocx-sh/website`), and Lighthouse on every PR. Decision: move axe with the tags above, both colour schemes, into the PR tier; keep the all-pages and all-states sweep in the deep tier.
- Lighthouse score: do not put it in any claim. Measured with Lighthouse 13.6.0: ocx.sh home scored 100 while axe reports 2 `label-content-name-mismatch` nodes (weight 0 in the score); grimoire.rs home scored 100 with 85 `color-contrast` nodes needing review that Lighthouse counts as passed.
- Coverage figure: quote no percentage as a conformance share. The one figure the skill may print is a count with its command, "axe-core 4.14.1 has a rule for N of 55 criteria, of which M are marked DETECT". Deque's 57.38 percent is vendor data about the share of issues found in first audits (2,000+ audits; the page states no date), a different unit from criteria, and must not be applied to the fleet.
- The six WebAIM Million 2026 categories (96 percent of detected errors, February 2026) each map to an enabled axe rule: `color-contrast`, `image-alt` family, `label` family, `link-name`, `button-name`, `html-has-lang` (section 6).
- Lint: `eslint-plugin-jsx-a11y` reads JSX only. `eslint-plugin-astro` 3.2.2 ships `jsx-a11y-recommended` and `jsx-a11y-strict` configs with 36 documented Astro-aware rule extensions, but needs the jsx-a11y plugin installed beside it and ESLint 10 or newer. No fleet repo installs jsx-a11y. The VS Code webview HTML is built in TypeScript template strings with no a11y lint; the 122 golden HTML fixtures can be scanned by axe (63 contain at least one violation without CSS applied).
- Scan routable pages, not fragments: the ocx.sh `dist/_shell/` and `dist/frag/` HTML files are partial documents and produce false `document-title` and `html-has-lang` violations.
- Dark mode is a separate scan: on the MkDocs site the dark scheme added `link-in-text-block` (109 nodes) and raised gate violations from 189 to 296 nodes.
- A checker feedback loop is the only agent-side intervention with evidence of improving accessibility: on one study (2 models, 10 projects, March 2025) it cut the AChecker inaccessibility rate from 0.347 to 0.292 while few-shot accessibility instructions made it worse (0.449). The second checker in that study did not improve (0.105 to 0.112), so run the checker and also read the diff.

## Findings

### 1. What axe-core decides

**1.1 Measured rule-to-criterion map.** Command, run in the scratch directory `~/.cache/research-lang/exemplars/product/uxv-a11y-cov-7f3k/run` after `npm i axe-core@4.14.1`: `node rules.mjs`, which reads `axe.getRules()` and maps each `wcagNNN` tag (for example `wcag1410` is 1.4.10) onto the 55 criteria taken from the W3C [WCAG 2.2 JSON](https://www.w3.org/WAI/WCAG22/wcag.json) (87 criteria in total; 55 at level A or AA; 4.1.1 is absent in 2.2). Output: `4.14.1 on 20 incl-off 23`. So 20 criteria have an enabled rule; 23 if rules that are off by default are counted (`audio-caption` for 1.2.1, `css-orientation-lock` for 1.3.4, `target-size` for 2.5.8). With the gate tag set, `target-size` runs, giving 21. The scout figure was 21 of 55 for the enabled set; this run printed 20, and the table in section 5 uses this run. The axe API says `enabled` is true for rules that run by default and false for rules disabled by default ([API.md](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md), line 141 of the file as fetched 2026-11-27).

Axe-core 4.14.1 has 105 rule files; 15 are disabled by default (`aria-roledescription`, `audio-caption`, `color-contrast-enhanced`, `css-orientation-lock`, `duplicate-id-active`, `duplicate-id`, `focus-order-semantics`, `hidden-content`, `identical-links-same-purpose`, `landmark-complementary-is-top-level`, `meta-refresh-no-exceptions`, `p-as-heading`, `table-fake-caption`, `target-size`, `td-has-header`); 5 are deprecated. Source: same command. The rule-descriptions page states that the WCAG 2.2 rules "are disabled by default, until WCAG 2.2 is more widely adopted and required" ([rule-descriptions.md](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md), line 90).

**1.2 Current release.** [axe-core v4.14.1](https://github.com/dequelabs/axe-core/releases) was published 2026-11-16 (patch: false-positive fixes in `empty-table-header`, `link-in-text-block`, `target-size`, `aria-valid-attr-value`; `meta-viewport-scale` now reports invalid `user-scalable` and `maximum-scale`; absolute and fixed elements are placed correctly, which "can change color-contrast and target-size results in either direction"). v4.14.0 (2026-10-05) enabled `label-content-name-mismatch` by default and added EN 301 549 v4 tags to `target-size`. v4.13.0 (2026-08-05) added Element Internals support and said "likely issue numbers are going to change in adopting this version". Command: `gh api 'repos/dequelabs/axe-core/releases?per_page=3' --jq '.[]|[.tag_name,.published_at,.body[0:1800]]|@tsv'`. Consequence: every axe bump moves counts, so a gate must pin the version and carry a baseline.

**1.3 Tags and `runOnly`.** The API documents `runOnly` by tag and the `rules` option to enable or disable single rules ([API.md](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md), lines 425 to 580). Playwright's guide uses `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` and says the tags match Accessibility Insights for Web's automated checks, so the Playwright example omits `wcag22aa` ([Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)). Measured on the built ocx.sh: with `runOnly` on the five tags and no `rules` option, `target-size` returned 3 violation nodes on 2 pages; the explicit `rules: {'target-size': {enabled: true}}` run returned identical results. Measured with default options: 0 `target-size` results. Command: `SITES=... node measure.mjs` (script in the scratch directory; configs `default`, `tagsOnly`, `wcag22aa_ts`).

**1.4 Needs-review (`incomplete`) is a first-class result.** Axe returns four result types: violations, passes, incomplete and inapplicable ([API.md](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md), `resultTypes` at line 428). The rule table marks `target-size` as "failure, needs review" ([rule-descriptions.md](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md), line 94). Playwright's example asserts only `accessibilityScanResults.violations` equal `[]` ([Playwright](https://playwright.dev/docs/accessibility-testing)); it also warns that `analyze()` scans only the page's current state, so open dialogs and error states need their own scan, and not to snapshot the whole `violations` array.

**1.5 W3C ACT rules.** The ACT rule repository (clone `https://github.com/act-rules/act-rules.github.io.git`, commit `50d2bed`, dated 2026-10-26) holds 86 atomic rules. Command: `python3 -I act_map.py` (parses `accessibility_requirements` in `_rules/*.md`; a mapping with a `secondary` key counts as secondary). Result: 23 of 55 criteria have a primary mapping, 25 with secondary ones (scout figure was 19; the scout counted a smaller, published subset). The [W3C ACT rules page](https://www.w3.org/WAI/standards-guidelines/act/rules/) has no last-updated date, states that "The ACT Rules are proposed by the ACT Rules Community Group", and lists about 89 unique rules (the fetch tool's own manual count, unreliable). ACT rules are not an axe result: they are the W3C-community test definitions that engines implement; 26 axe rules carry the `ACT` tag (command in 1.1 output).

### 2. What the fleet's gates run today

From the grounding audit ([ui-code-posture.md](/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/ui-code-posture.md), lines 181 to 194, measured 2026-11-27): `ocx-sh/website` runs Lighthouse with all four categories at `minScore: 1` on each PR and axe through `@axe-core/playwright` in 47 spec files (59 `AxeBuilder(` calls) in the deep tier only; `ocx-sh/ocx`, `www-setup`, `devcontainer-features`, `rules_ocx` run Lighthouse only; `ocx-sh/catalog` runs Lighthouse CI plus `scripts/quality-axe.mjs`; `grimoire-rs/indexer` runs Lighthouse accessibility at `minScore: 0.97`; `grimoire-rs/grimoire` docs and `grim-gui` have no accessibility tool. This run re-checked two facts: `git -C /home/mherwig/dev/ocx-sh/website grep -nE 'withTags|runOnly|wcag2' -- tests` returns no line (the deep-tier axe calls are default-option calls, so they skip `target-size` and mix in best-practice rules); `ocx-sh/catalog/scripts/quality-axe.mjs` uses the tag list `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice` and a `--red-demo` flag that plants an unlabelled button and an image without `alt` and requires axe to report both. The red-demo canary is the fleet's own proof that a green run can go red; it should be copied.

### 3. Measured runs on built output

Method. Built output served with `python3 -m http.server`; Playwright 1.65.1 with Chromium headless shell 159 loads each `.html` file (waiting for `networkidle`, viewport 1280 by 900); `axe.run(document, opts)` with `resultTypes` for all four types. Three configurations: `default` (no options), `tagsOnly` (the five tags), `wcag22aa_ts` (five tags plus `target-size` enabled). Tag configurations run in light and dark `colorScheme`. Script `measure.mjs`; results in `results.json` (copies in the scratchpad). Builds measured: `ocx-sh/website/site/dist` (ocx.sh, 13 pages, build dated 2026-11-16), `grimoire-rs/grimoire/docs/dist` (grimoire.rs, 49 pages, 2026-11-24), `grimoire-rs/indexer/site` (a MkDocs Material site, 24 pages, 2026-11-06). The MkDocs build is the only MkDocs site with a built output on this machine; `ocx-mirror` and `indexbot` have none, so they were not scanned. The builds may lag source.

| Site (pages) | Config | Violation rules / nodes | Needs-review rules / nodes | Inapplicable rules (on at least one page) |
|---|---|---|---|---|
| ocx.sh (13) | default | 7 / 34 | 3 / 34 | 85 |
| ocx.sh (13) | five tags + target-size, light | 5 / 12 | 3 / 34 | 61 |
| ocx.sh (13) | same, dark | 5 / 12 | 3 / 34 | 61 |
| grimoire.rs (49) | default | 5 / 104 | 2 / 1142 | 63 |
| grimoire.rs (49) | five tags + target-size, light | 1 / 49 | 2 / 1142 | 47 |
| grimoire.rs (49) | same, dark | 1 / 49 | 2 / 1142 | 47 |
| MkDocs indexer (24) | default | 5 / 204 | 3 / 74 | 49 |
| MkDocs indexer (24) | five tags + target-size, light | 3 / 189 | 3 / 74 | 39 |
| MkDocs indexer (24) | same, dark | 4 / 296 | 3 / 80 | 39 |

What the violations are (gate configuration, light unless said):
- ocx.sh: `label-content-name-mismatch` 6 nodes on 5 pages (the search button on `404.html`: visible text not in the accessible name); `target-size` 3 nodes on 2 pages (a 32 by 16 px link in `frag/sidebar/_all/`); `color-contrast` 1 node (`#bbbbbb` on `#ffffff`, 1.91:1, in `frag/landing-supply/`); `document-title` and `html-has-lang` 1 node each, both on `_shell/v1/.../nav.html`, a fragment and not a page.
- grimoire.rs: only `label-content-name-mismatch`, 49 nodes on 49 of 49 pages (the header search button, `aria-label="Search"`, again on `404.html`). Needs review: `color-contrast` 1,141 nodes on 48 pages, `form-field-multiple-labels` 1 node. In the default run, best-practice rules add `landmark-unique` 12 nodes, `region` 40, `landmark-one-main` 2, `empty-table-header` 1.
- MkDocs indexer: `color-contrast` 158 nodes on 23 pages (light), `target-size` 30 nodes on 1 page, `label` 1 node on 1 page (the `__search` checkbox on `404.html`); dark adds `link-in-text-block` 109 nodes on 22 pages. In the default run, `aria-dialog-name` is a violation on 24 of 24 pages (best-practice tag only).
- The ocx.sh fragments show that scanning every `.html` in `dist/` includes non-pages; the gate must list routable pages (sitemap or router output), not walk the directory.

All three sites have zero violations for the top WebAIM categories of missing alt, empty links, empty buttons and missing language on real pages, except the one contrast failure on ocx.sh (a fragment) and 158 contrast nodes on the MkDocs build.

Single-page check (home pages, `node idx.mjs`): ocx.sh home 2 `label-content-name-mismatch` nodes and 17 contrast nodes needing review; grimoire.rs home 1 `label-content-name-mismatch` node and 85 contrast nodes needing review; MkDocs home 6 `color-contrast` violations (and 1 `aria-dialog-name` in the default run only).

VS Code webviews. The extension builds HTML in TypeScript (`git -C /home/mherwig/dev/grimoire-rs/vscode grep -nIE '`<(button|input|a|img|select|label|div)\b|html`|innerHTML' -- 'src/webview/*.ts' ':!*.test.ts' | wc -l` gave 271) and keeps 122 golden HTML fixtures in `src/test/fixtures/goldens/`. Scanning each fixture inside a minimal shell (`<html lang="en"><title>`, `<main>`) with the five tags, `target-size` on, `color-contrast` off (no CSS loaded), via `node goldens.mjs`: 63 of 122 files have a violation, 347 nodes: `target-size` 274 nodes in 62 files, `label` 25 in 12, `select-name` 36 in 12, `button-name` 12 in 12. Caveat: no stylesheet and fragments out of context, so `target-size` and the label results are an upper bound and a feasibility proof, not findings. The point is that the goldens are an existing, already-versioned corpus an axe gate can scan without launching VS Code.

### 4. Lighthouse and the score

[Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) (page undated; its rule links point at axe-core 4.11): the score is "a weighted average of all accessibility audits", weights follow "axe user impact assessments" (3, 7 or 10), each audit is pass or fail with no partial credit, and "Manual audits and low-impact / best-practices audits aren't included in the table because they don't affect your score." The page does not warn that 100 is not full accessibility; this conclusion is drawn from the measurements below, not quoted.

Measured with `npx lighthouse http://127.0.0.1:<port>/index.html --port=<cdp port> --only-categories=accessibility --output=json` (Lighthouse 13.6.0; `npm ls` shows it bundles `axe-core@4.14.0`, one patch behind the 4.14.1 used above):

| Home page | LH score | What the score hides (axe 4.14.1 on the same page) |
|---|---|---|
| ocx.sh | 100 | `label-content-name-mismatch` 2 nodes: Lighthouse lists it as failed with weight 0, so it costs no points; `table-fake-caption` also failed at weight 0; 17 contrast nodes needing review counted as passed |
| grimoire.rs | 100 | 1 `label-content-name-mismatch` node (Lighthouse marks the audit not applicable); 85 contrast nodes needing review counted as passed |
| MkDocs indexer | 93 | 2 failed audits at weight 7: `color-contrast` and `aria-dialog-name` |

Further, Lighthouse output has 76 accessibility audit refs of which 10 are `manual` (not scored) and 50 have weight 0 (`python3 -I lhsum.py`). Of axe's 105 rules, 39 have no Lighthouse audit id (command: `node -e` comparing `axe.getRules()` ids with `lh-ocx.json` `auditRefs`), including `region`, `landmark-unique`, `page-has-heading-one`, `scrollable-region-focusable`, `nested-interactive` and `no-autoplay-audio`. Lighthouse 13.6.0 does run `target-size` at weight 7. Decision on the score: a score of 100 coexisted with a confirmed axe failure on two of three sites, and treats needs-review as pass. It may be a CI log line; it may not appear in a claim.

### 5. The 55 criteria: what the gate decides

Class meaning. DETECT: an enabled gate rule reports a definite failure for the criterion's common failure; a pass is still not proof. PARTIAL: only a slice is checked, or results are mostly needs-review, or the rule is outside the default set. HUMAN: no axe rule in the gate. Scriptable `S`: my judgement that the fleet can write a Playwright assertion for it (not measured here). Columns: "rules / exercised" is rules tagged to that criterion that appeared in the gate run, and how many returned a pass, violation or needs-review on at least one of the 86 scanned pages (the difference was inapplicable everywhere). Violation and needs-review nodes are for ocx.sh / grimoire.rs / MkDocs, gate configuration, light scheme. ACT is `primary+secondary` count of atomic ACT rules mapped to the criterion in the clone of 2026-10-26.

| SC | Name | Lv | Gate | axe 4.14.1 rules | rules / exercised | violation nodes ocx / grim / idx | needs-review nodes | ACT rules (primary+secondary) | Scriptable |
|---|---|---|---|---|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | DETECT | aria-meter-name, aria-progressbar-name, image-alt +4 | 7 / 3 | 0 / 0 / 0 | 0 / 0 / 0 | 7+2 | - |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | HUMAN | none enabled (off: audio-caption) | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+3 | - |
| 1.2.2 | Captions (Prerecorded) | A | PARTIAL | video-caption | 1 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 1.2.4 | Captions (Live) | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 1.2.5 | Audio Description (Prerecorded) | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 1.3.1 | Info and Relationships | A | PARTIAL | aria-hidden-body, aria-required-children, aria-required-parent +6 (off: p-as-heading, table-fake-caption, td-has-header) | 9 / 7 | 0 / 0 / 0 | 0 / 0 / 0 | 4+10 | - |
| 1.3.2 | Meaningful Sequence | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 1.3.3 | Sensory Characteristics | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | - |
| 1.3.4 | Orientation | AA | HUMAN | none enabled (off: css-orientation-lock) | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | S |
| 1.3.5 | Identify Input Purpose | AA | PARTIAL | autocomplete-valid | 1 / 1 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | - |
| 1.4.1 | Use of Color | A | PARTIAL | link-in-text-block | 1 / 1 | 0 / 0 / 0 | 0 / 0 / 17 | 0+0 | - |
| 1.4.2 | Audio Control | A | PARTIAL | no-autoplay-audio | 1 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 1.4.3 | Contrast (Minimum) | AA | DETECT | color-contrast | 1 / 1 | 1 / 0 / 158 | 28 / 1141 / 51 | 1+1 | - |
| 1.4.4 | Resize Text | AA | PARTIAL | meta-viewport | 1 / 1 | 0 / 0 / 0 | 0 / 0 / 0 | 2+0 | - |
| 1.4.5 | Images of Text | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | - |
| 1.4.10 | Reflow | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+1 | S |
| 1.4.11 | Non-text Contrast | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | S |
| 1.4.12 | Text Spacing | AA | PARTIAL | avoid-inline-spacing | 1 / 1 | 0 / 0 / 0 | 0 / 0 / 0 | 3+0 | S |
| 1.4.13 | Content on Hover or Focus | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | S |
| 2.1.1 | Keyboard | A | PARTIAL | frame-focusable-content, scrollable-region-focusable, server-side-image-map | 3 / 1 | 0 / 0 / 0 | 0 / 0 / 0 | 2+0 | - |
| 2.1.2 | No Keyboard Trap | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | S |
| 2.1.4 | Character Key Shortcuts | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | - |
| 2.2.1 | Timing Adjustable | A | PARTIAL | meta-refresh | 1 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+1 | - |
| 2.2.2 | Pause, Stop, Hide | A | PARTIAL | blink, marquee | 2 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | - |
| 2.3.1 | Three Flashes or Below Threshold | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 2.4.1 | Bypass Blocks | A | PARTIAL | bypass | 1 / 1 | 0 / 0 / 0 | 4 / 0 / 0 | 0+0 | - |
| 2.4.2 | Page Titled | A | DETECT | document-title | 1 / 1 | 1 / 0 / 0 | 0 / 0 / 0 | 2+0 | - |
| 2.4.3 | Focus Order | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 2.4.4 | Link Purpose (In Context) | A | DETECT | area-alt, link-name | 2 / 1 | 0 / 0 / 0 | 0 / 0 / 0 | 3+0 | - |
| 2.4.5 | Multiple Ways | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 2.4.6 | Headings and Labels | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 2+0 | - |
| 2.4.7 | Focus Visible | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | S |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | S |
| 2.5.1 | Pointer Gestures | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 2.5.2 | Pointer Cancellation | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 2.5.3 | Label in Name | A | DETECT | label-content-name-mismatch | 1 / 1 | 6 / 49 / 0 | 0 / 0 / 0 | 1+1 | - |
| 2.5.4 | Motion Actuation | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 2+0 | - |
| 2.5.7 | Dragging Movements | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 2.5.8 | Target Size (Minimum) | AA | DETECT | target-size (off by default; on via the wcag22aa tag) | 1 / 1 | 3 / 0 / 30 | 0 / 0 / 0 | 0+0 | - |
| 3.1.1 | Language of Page | A | DETECT | html-has-lang, html-lang-valid, html-xml-lang-mismatch | 3 / 2 | 1 / 0 / 0 | 0 / 0 / 0 | 4+0 | - |
| 3.1.2 | Language of Parts | AA | PARTIAL | valid-lang | 1 / 1 | 0 / 0 / 0 | 0 / 0 / 0 | 2+0 | - |
| 3.2.1 | On Focus | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.2.2 | On Input | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.2.3 | Consistent Navigation | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.2.4 | Consistent Identification | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.2.6 | Consistent Help | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.3.1 | Error Identification | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1+0 | - |
| 3.3.2 | Labels or Instructions | A | PARTIAL | form-field-multiple-labels | 1 / 1 | 0 / 0 / 0 | 0 / 1 / 6 | 0+0 | - |
| 3.3.3 | Error Suggestion | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.3.7 | Redundant Entry | A | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 3.3.8 | Accessible Authentication (Minimum) | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | - |
| 4.1.2 | Name, Role, Value | A | DETECT | area-alt, aria-allowed-attr, aria-braille-equivalent +25 (off: aria-roledescription) | 28 / 16 | 0 / 0 / 1 | 2 / 0 / 0 | 10+6 | - |
| 4.1.3 | Status Messages | AA | HUMAN | none | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0+0 | S |

Totals: 8 DETECT, 13 PARTIAL, 34 HUMAN. Reproduce with `python3 -I mktable.py` (reads `results.json`, `sc55.json`, `act_map.json`, `axe_map.json`). The class assignment is my judgement from the rule list; the counts beside it are measured.

Reading notes. The criteria new in WCAG 2.2 are 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7 and 3.3.8; only 2.5.8 has an engine rule and it is off by default. Rules tagged to several criteria count under each (4.1.2 has 28 rules). Rule tags are what axe states, not a proof of what the rule decides: `image-alt` checks that an alternative exists, not that it is good; `color-contrast` returns needs-review wherever it cannot resolve a background (1,142 nodes at grimoire.rs).

### 6. WebAIM Million 2026: six categories mapped to axe rules

[WebAIM Million](https://webaim.org/projects/million/) (results February 2026, WAVE engine, top 1,000,000 home pages, an independent study): 95.9 percent of home pages had detected WCAG 2 failures, 56.1 errors per page, and "96% of all errors detected fall into these six categories". WebAIM notes that "Absence of detected errors does not indicate that a page is accessible or conformant." Its definitions: alt counts as missing "(not counting `alt=""`)"; an input is labelled via `<label>`, `aria-label`, `aria-labelledby` or `title`; empty links, empty buttons and missing language are not defined on the page. The mapping below is by rule description in [rule-descriptions.md](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) and the measured tags; WAVE and axe do not count identically, so equivalence of counts is not claimed.

| WebAIM category (share of home pages) | axe rule that detects it | Tags (4.14.1) | Gate? | Residue axe leaves |
|---|---|---|---|---|
| Low contrast text (83.9%) | `color-contrast` | wcag2aa, wcag143 | yes | needs-review where the background is an image, gradient or overlap; 1,141 nodes at grimoire.rs |
| Missing alternative text (53.1%) | `image-alt`; also `input-image-alt`, `role-img-alt`, `svg-img-alt`, `object-alt` | wcag2a, wcag111 | yes | accepts `alt=""` (as WebAIM does); quality of text is human |
| Missing form input labels (51.0%) | `label`; also `select-name`, `aria-input-field-name`, `aria-toggle-field-name` | wcag2a, wcag412 | yes | `label-title-only` (best-practice, outside the tags) flags title-only labelling; visible versus accessible name is `label-content-name-mismatch` |
| Empty links (46.3%) | `link-name`; also `area-alt` | wcag2a, wcag244, wcag412 | yes | name present but meaningless ("click here") is human |
| Empty buttons (30.6%) | `button-name`; also `input-button-name` | wcag2a, wcag412 | yes | same |
| Missing document language (13.5%) | `html-has-lang`; also `html-lang-valid` | wcag2a, wcag311 | yes | correct language is human |

All six rules exist and are enabled in 4.14.1 (`node rules.mjs`, `axe_map.json`), so the UX-A11Y preempt list has a check per item, and the six are in the gate tag set.

### 7. Lint layers: `.astro`, TSX, webview strings, MkDocs

- `eslint-plugin-jsx-a11y` lints JSX syntax; the scout counted 39 rule files (6.10.2). No fleet repo installs it (audit: 0 files).
- `eslint-plugin-astro` 3.2.2 (clone commit `969bc4e`, dated 2026-11-26; README prerequisites: ESLint v10.0.0 and above, Node.js v22.22.3, v24.16.0, v26.3.0 and above): the user guide says "If you want to use the rules for checking accessibility (A11Y), you also need to install eslint-plugin-jsx-a11y or eslint-plugin-jsx-a11y-x additionally", and offers the configs `jsx-a11y-recommended` and `jsx-a11y-strict` ([user-guide.md](https://github.com/ota-meshi/eslint-plugin-astro/blob/main/docs/user-guide.md)). The repo documents 36 `astro/jsx-a11y/*` rules (command: `ls docs/rules/jsx-a11y | wc -l`). The fleet's `ocx-sh/website/eslint.config.js` spreads `...astro.configs.recommended` (ESLint `^10.9.0`, plugin `^3.2.1`), which does not enable them; the lint layer therefore does not cover accessibility on `.astro` today. Not run by me: whether enabling `jsx-a11y-recommended` is clean on the 102 theme components.
- Static lint cannot see component output: an `<Button>` without a `<button>` visible in the template is invisible to it. Axe on built output is the layer that sees rendered DOM.
- [Astro Dev Toolbar](https://docs.astro.build/en/guides/dev-toolbar/): the Audit app runs "a series of audits on the current page", highlights failures in the page, and "will not appear on your published site". Source: `packages/astro/src/runtime/client/dev-toolbar/apps/audit/rules/a11y.ts` (commit `3e3e70f`, 2026-11-26) defines 24 accessibility rules. It is a developer-session tool; the docs do not describe a CI mode.
- VS Code webviews: `eslint.config.mjs` (ESLint `^10.13.0`) uses `js` and `typescript-eslint` recommended plus prettier; nothing reads HTML inside template strings. The tool that sees the output is axe on the golden fixtures (section 3).
- MkDocs: no lint layer exists for Material templates; axe on `site/` is the only automated layer.

### 8. Coverage figures: which may be quoted

| Figure | Unit | Source and date | Status |
|---|---|---|---|
| 57.38% (169,242 of 294,958 issues) | share of issues in first-time customer audits found by axe-core rules | [Deque](https://www.deque.com/automated-accessibility-coverage-report/); no date on the page (footer 2026; image path 2025/11); vendor data; sample "13,000+ pages/page states", "over 2,000 audits"; template issues counted once; best-practice and needs-review issues excluded; WCAG 2.0 and 2.1 A and AA, HTML only | vendor data, different unit, do not generalise ("Each data set will have a unique coverage percentage" in the report) |
| 16 of 50 WCAG 2.1 AA criteria | criteria with at least one automated issue found | same Deque page | vendor data |
| 21 of 55 (this run: 20 enabled plus `target-size`) | criteria with at least one axe rule in the gate | measured, axe-core 4.14.1, 2026-11-27, section 1.1 | quotable with the command |
| 8 DETECT / 13 PARTIAL / 34 HUMAN | this artifact's classification | section 5 | quotable as the fleet's own classification |
| 23 of 55 primary, 25 with secondary | criteria mapped by ACT rules | clone commit `50d2bed`, 2026-10-26 | quotable, but it counts rule definitions, not engine coverage |
| about 17 percent (one sixth) of 78 WCAG 2.1 criteria | criteria covered by the tools in a study of 550 Swedish public-sector pages | Springer, Universal Access in the Information Society, published 2025-09-18; tool versions 2021 to 2024; read by the scout, not re-fetched here (the publisher redirected to a cookie check) | independent, older tools; not verified in this pass |
| 20 to 30 percent | older expert claim | quoted by Deque as the belief it disputes | do not quote |

Decision: the skill may quote only the measured counts with their command and axe version and date; it may name Deque's 57.38 percent only as "vendor data on share of issues in first-time audits", never as a coverage of the fleet or of conformance.

### 9. Checker loops for agent-written UI

[Suh et al., arXiv 2503.15885](https://arxiv.org/html/2503.15885v1) (March 2025; independent study): GPT-4o and Qwen2.5-Coder-32B regenerated UI files from 10 real projects (473 files analysed). Inaccessibility rate (average): human-written 0.425 (AChecker) and 0.125 (QualWeb); naive generation 0.347 and 0.105 (GPT-4o); few-shot accessibility prompting 0.449 and 0.118; the feedback loop (FeedA11y, up to 3 rounds, 2.4 rounds on average) 0.292 and 0.112. Contrast was 80 percent of AChecker violations. The authors list limits: the rate "treats all violations equally", no users with disabilities were studied, findings may not generalise beyond the two models and ten projects. Reading: a loop that runs a checker and fixes before finishing helped on the checker it optimised against, instructions alone hurt, and the second metric did not improve; so the loop is necessary and not sufficient.

## Normative guidance candidates

1. MUST run axe-core on built output with exactly these tags: `runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] }` (Playwright: `.withTags([...])` with all five).
   Rationale: the five tags decide the WCAG A and AA claim set and, measured in 4.14.1, include `target-size`.
   Verify: `git grep -nE "withTags|runOnly" -- '*.ts' '*.mjs'` shows all five strings in the shared fixture; `git grep -n 'AxeBuilder(' | grep -v makeAxeBuilder` returns no direct call without tags. Fail example: `new AxeBuilder({ page }).analyze()` (the form in `ocx-sh/website/tests/e2e/a11y.spec.ts:16`). Pass example: a fixture `makeAxeBuilder` applying the five tags.

2. MUST NOT use `violations: []` as the only assertion; MUST also record `incomplete` per rule and fail when a rule's needs-review count rises above a committed baseline file.
   Rationale: 1,141 contrast nodes were needs-review at grimoire.rs while violations was empty.
   Verify: the spec reads `.incomplete` (`git grep -n 'incomplete' -- tests`) and a baseline file exists; changing a colour token so a contrast nodes appears in `incomplete` turns the run red.

3. MUST scan every routable template or route, in both `prefers-color-scheme` states, and MUST list pages from the router, sitemap or an explicit list, never `find dist -name '*.html'`.
   Rationale: dark scheme added 107 gate violation nodes at the MkDocs site; ocx.sh `_shell/` and `frag/` files give false violations.
   Verify: `colorScheme: 'dark'` appears in the spec config; the page list is not a directory walk (`git grep -n "readdir\|glob" -- tests` shows none for the axe pages).

4. MUST scan interactive states with their own call: each dialog, menu, popover, and form error state open and visible before `analyze()`.
   Rationale: axe sees only the current state ([Playwright](https://playwright.dev/docs/accessibility-testing)); a closed dialog is not in the accessibility tree.
   Verify: each spec that opens a component asserts visibility, then calls `analyze()`; reading heuristic: a modal component with no open-state scan fails review.

5. MUST pin `axe-core` (and `@axe-core/playwright`) to an exact version, print it in the run output, and re-baseline in the same commit as any bump.
   Rationale: patch releases move counts (4.14.0 enabled a rule and added violations; 4.14.1 changed contrast and target-size results).
   Verify: `grep -n '"axe-core"' package.json` has no `^` or `~`; the run log contains `axe-core 4.14.1` style text.

6. MUST run the accessibility gate on pull requests for every site with built output, as the blocking tier; the all-pages and all-states sweep stays in the deep tier.
   Rationale: the fleet's axe today runs only in the deep tier of one repo, while Lighthouse is the PR gate everywhere; a gate that does not block merges does not stop an agent's change.
   Verify: the PR workflow file contains the axe task (`git grep -nE 'axe|a11y' -- .github/workflows taskfile.yml 'taskfiles/*'`).

7. MUST include a red demo: a run that plants an image without `alt` and an unlabelled button and requires the gate to fail.
   Rationale: proves the gate can go red; the fleet already has this in `ocx-sh/catalog/scripts/quality-axe.mjs --red-demo`.
   Verify: the red-demo task exists and exits non-zero in CI on a schedule or on gate-config changes.

8. MUST run `best-practice` rules as a separate report-only pass, never merged into the WCAG result.
   Rationale: `region`, `landmark-one-main`, `landmark-unique`, `page-has-heading-one` and `aria-dialog-name` fired on all three builds but are not WCAG failures; mixing them breaks any WCAG statement.
   Verify: two result files or two named steps; the WCAG step's tag list contains no `best-practice`.

9. MUST NOT disable a rule, exclude an element, or lower a baseline without a written reason, a link to the issue, and the owner's approval (see "What an agent must not decide alone").
   Rationale: `disableRules` and `exclude` silence all rules on the element, per Playwright's guide.
   Verify: `git grep -nE "disableRules|\.exclude\(" -- tests` shows each use preceded by a comment with an issue link; example today: `components-glossary.spec.ts:260` disables `landmark-unique` with no tag set.

10. MUST NOT put a Lighthouse accessibility score, or "Lighthouse 100", in a claim, PR description, README or release note; MAY keep it as a CI regression line.
    Rationale: measured: 100 with a confirmed axe failure (ocx.sh) and with 85 unresolved contrast nodes (grimoire.rs); the score excludes manual audits and best-practice rules.
    Verify: `git grep -niE "lighthouse.{0,20}(100|score)|score of 100" -- README.md 'docs/**' CHANGELOG.md` returns no claim line; a threshold in `.lighthouserc` is not a claim.

11. MUST end any report of a green run with the gate facts: axe-core version, tag set, number of pages and states scanned, violations, needs-review count by rule, and the list of criteria not decided (the 34 HUMAN and 13 PARTIAL rows).
    Rationale: a green run covers 21 of 55 criteria at most, none completely; the FTC order of 2025-04-22 bars claiming an automated tool makes a site WCAG-compliant without evidence ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million)).
    Verify: reading heuristic. Pass: "axe-core 4.14.1, wcag2a to wcag22aa tags, 13 pages light and dark: 0 violations, 3 rules with needs-review (color-contrast 28 nodes); not decided by this run: 34 criteria incl. keyboard operation, focus order, captions". Fail: "accessibility checks passed" or "WCAG 2.2 AA compliant". Grep: `git grep -niE "(wcag|a11y|accessib)[^.]{0,40}(compliant|conform|passes|passed|clean)"` on PR text and docs returns none without the facts line.

12. MUST NOT write that a criterion is "met", "passes" or "verified" on the strength of an axe rule; the words are "no violation found by <rule ids>".
    Rationale: even DETECT criteria need human judgement for the pass condition (`image-alt` accepts `alt="x"`).
    Verify: grep claim text for `meets|satisfies|verified` near an SC number.

13. SHOULD script the HUMAN criteria marked `S` as Playwright assertions: reflow at 320 CSS px width (no horizontal scroll, 1.4.10), focus indicator present on every tab stop (2.4.7), focus not covered by sticky regions (2.4.11), tab loop does not trap (2.1.2), text-spacing override causes no clipping (1.4.12), hover and focus content dismissible (1.4.13), orientation not locked (1.3.4), non-text contrast by token pair (1.4.11), a status region exists and receives updates (4.1.3).
    Rationale: these are the criteria where no engine rule exists but a deterministic assertion can; they are my judgement, not measured.
    Verify: a named test per criterion (`git grep -n "1.4.10\|reflow" -- tests`).

14. MUST enable Astro-aware accessibility lint in every Astro repo: install `eslint-plugin-jsx-a11y` beside `eslint-plugin-astro` and add `eslintPluginAstro.configs['jsx-a11y-recommended']` to the flat config; ESLint 10 or newer.
    Rationale: `astro.configs.recommended` does not enable the 36 `astro/jsx-a11y/*` rules; the fleet has none today.
    Verify: `npx eslint --print-config src/pages/index.astro | grep -c 'jsx-a11y'` is greater than 0 (not run by me); a seeded `<img src="x">` in a `.astro` file fails lint.

15. MUST scan VS Code webview markup with axe: render each golden HTML fixture inside a `<html lang><title><main>` shell with the extension's stylesheet loaded, and assert the gate tags with zero violations.
    Rationale: webview HTML is TypeScript template strings with no lint; 122 goldens already exist.
    Verify: a test imports the goldens directory and calls axe; an `<button></button>` seeded into a golden fixture fails it.

16. SHOULD, before reporting an interface change finished, run the project's axe task, read its violation and needs-review lists, fix violations, and rerun; MUST NOT rely on an accessibility instruction in the prompt alone.
    Rationale: in the one study found, the checker loop lowered the rate (0.347 to 0.292) and few-shot instructions raised it (0.449).
    Verify: the PR contains the second run's output; the first run's violation ids no longer appear.

17. MUST pair each automated check with the six preempt rules: no `<img>` without `alt`, no `<a>` or `<button>` without an accessible name, no form control without a label, `<html lang>` set, text and background pairs from tokens meeting 4.5:1.
    Rationale: these are 96 percent of detected errors in WebAIM Million 2026.
    Verify: axe rules `image-alt`, `link-name`, `button-name`, `label`, `select-name`, `html-has-lang`, `color-contrast` all in the gate output with zero violations.

## Dated facts

| Fact | Value | Source (URL) | Source date | Kind |
|---|---|---|---|---|
| axe-core current version | 4.14.1, published 2026-11-16 | [releases](https://github.com/dequelabs/axe-core/releases) | 2026-11-16 | authority (vendor open-source project) |
| `label-content-name-mismatch` enabled by default | in 4.14.0 | same | 2026-10-05 | authority |
| axe rule counts | 105 rule files, 15 off by default, 5 deprecated | measured via `axe.getRules()` | 2026-11-27 | measurement |
| axe API: `enabled` true for rules that run by default | text | [API.md](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) | develop branch fetched 2026-11-27 | authority |
| WCAG 2.2 A and AA count | 55 (87 criteria in all) | [wcag.json](https://www.w3.org/WAI/WCAG22/wcag.json) | fetched 2026-11-27 | authority |
| WCAG Understanding, conformance | "Testing the success criteria would involve a combination of automated testing and human evaluation" | [conformance](https://www.w3.org/WAI/WCAG22/Understanding/conformance) | updated 2026-09-20 | authority |
| ACT atomic rules | 86 in repo clone | [act-rules](https://github.com/act-rules/act-rules.github.io) | commit dated 2026-10-26 | authority (W3C community group) |
| ACT rules page | about 89 unique rules; status "proposed" | [ACT rules](https://www.w3.org/WAI/standards-guidelines/act/rules/) | undated | authority |
| Playwright guide | uses `withTags` of 4 tags; `analyze()` scans current state | [Playwright](https://playwright.dev/docs/accessibility-testing) | undated | platform docs |
| Lighthouse score method | weighted average of axe audits; weights 3, 7, 10; manual and best-practice audits excluded | [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) | undated | platform docs |
| Lighthouse 13.6.0 bundles | `axe-core@4.14.0` | `npm ls` in scratch directory | 2026-11-27 | measurement |
| Deque coverage | 57.38% of 294,958 issues; 16 of 50 WCAG 2.1 AA criteria; 2,000+ audits | [Deque](https://www.deque.com/automated-accessibility-coverage-report/) | undated page | vendor data |
| WebAIM Million 2026 | 95.9% of home pages with failures; 56.1 errors per page; six categories 96%: low contrast 83.9, missing alt 53.1, missing labels 51.0, empty links 46.3, empty buttons 30.6, missing language 13.5 | [WebAIM](https://webaim.org/projects/million/) | February 2026 | independent study |
| WebAIM: ARIA and errors | pages with ARIA 59.1 errors, without 42 | same | February 2026 | independent study (correlation, not causation, per the report) |
| FTC v accessiBe | $1 million; bars claiming automated tools make a site WCAG-compliant without proof | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million) | 2025-04-22 | authority |
| Checker loop study | inaccessibility 0.347, 0.449, 0.292 (AChecker, GPT-4o) | [arXiv 2503.15885](https://arxiv.org/html/2503.15885v1) | March 2025 | independent study, small |
| eslint-plugin-astro | 3.2.2; ESLint 10 or newer; Node 22.22.3, 24.16.0 or 26.3.0 and up | [repo](https://github.com/ota-meshi/eslint-plugin-astro) | commit 2026-11-26 | authority |
| Astro dev toolbar audit | 24 accessibility rules; dev only | [Astro docs](https://docs.astro.build/en/guides/dev-toolbar/), [source](https://github.com/withastro/astro) | commit 2026-11-26 | platform |

## What an agent must not decide alone

- Whether to publish an accessibility statement, a conformance level, or any "compliant" or "conforms to WCAG 2.2 AA" sentence. These carry legal weight; the FTC order shows automated-compliance claims are enforced. Ask the owner.
- Whether to accept an exception: disabling a rule, excluding a component, raising a needs-review baseline, or leaving a violation in. Ask, with the rule id, the node, the count and the user impact.
- Whether a needs-review item passes. Contrast on images, gradients and overlays and name-versus-label questions need a human look; the agent lists them, does not clear them.
- Which standard the product answers to (WCAG 2.1 versus 2.2, EN 301 549 version, a jurisdiction's law). That is a business and legal choice.
- Whether to buy or add an overlay or widget as a fix; never as a compliance claim.
- Whether to drop a criterion from the HUMAN list because "it looks fine".

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Reports "accessible" or "WCAG AA compliant" after a green axe or Lighthouse run | grep final report for `compliant|conforms|accessible` without the gate-facts line (rule 11) |
| Copies the Playwright docs snippet with four tags, dropping `wcag22aa`, or runs bare `analyze()` | `git grep -n 'AxeBuilder(' ` and require `withTags` with five tags (rule 1) |
| Asserts only `violations` and ignores `incomplete` | grep for `.incomplete` in the spec; baseline file (rule 2) |
| Scans only the page-load state; ignores dialogs, menus, error states | each stateful component has an open-state scan (rule 4) |
| Scans the light theme only | `colorScheme: 'dark'` in the config (rule 3) |
| Silences a failing rule with `disableRules` or `exclude` to get green | grep `disableRules|\.exclude\(` in the diff and require owner approval (rule 9) |
| Quotes "automated testing catches 57 percent" or "30 percent" as the fleet's coverage | grep claim text for the figures; allowed only with "vendor data" and unit (section 8) |
| Quotes a Lighthouse 100 as evidence | grep (rule 10) |
| Assumes `eslint-plugin-jsx-a11y` lints `.astro` and HTML strings | `eslint --print-config x.astro` shows `astro/jsx-a11y` rules (rule 14) |
| Adds ARIA to silence a name error rather than using the native element | WebAIM 2026: pages with ARIA averaged 59.1 errors versus 42; check `role=` diff against native-first list (UX-A11Y) |
| Treats best-practice rules as WCAG failures, or ignores them | two separate passes (rule 8) |
| Gives the gate a directory walk of `dist/`, including fragments | page list from sitemap (rule 3) |

## Contested / evolving

- Coverage planning figure. Deque (vendor): 57.38 percent of issues, in a report that disputes "20 to 30 percent" ([Deque](https://www.deque.com/automated-accessibility-coverage-report/)). A 2025 Springer study of Swedish public pages: one sixth of 78 criteria covered by the tools it ran, 31 criteria (44.8 percent) covered by no engine (second-hand via the scout; not re-fetched). Units differ: issues weighted by occurrence versus criteria with a rule. Decision in section 8; trend: the criteria-based count is stable, the issue-based one depends on the sample.
- Default `axe.run()` versus tag-restricted. Playwright's guide shows four tags and no `best-practice`; the fleet's `catalog` script uses five WCAG tags plus `best-practice` and fails on any violation. This artifact separates them (rule 8): WCAG claims from tags only; best-practice as a report. Deque's report excluded best-practice items from its coverage.
- Whether `incomplete` should block. Strict teams treat any needs-review as failing; measured here, grimoire.rs would fail on 1,141 contrast nodes. Chosen: ratchet on a baseline and a human review list, as a middle path; trend: axe is reducing needs-review with each release (4.14.1 fixed `aria-controls` review cases).
- Lighthouse as the PR gate. The fleet's convention (`minScore: 1` on four sites, 0.97 on one) is deliberate, and Lighthouse is cheap. Evidence here says it is not enough; both stay, but the score is not claim material.
- Checker loops versus prompt guidance. One study (two models, ten projects) favours loops and finds few-shot prompts harmful; the second checker did not improve and no user outcome was measured; a larger replication was not found in this pass.
- Axe tag drift. WCAG 2.2 rules are off by default "until WCAG 2.2 is more widely adopted"; EN 301 549 v4 tags were added in 4.14.0; a future release may enable `target-size` by default, at which time the explicit tag would be redundant but harmless.

## Cross-territory findings

- Marketing and docs: a published accessibility or compliance statement and the claims wording belong to the evidence-and-claims dive and the marketing law topics.
- Channels: none.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md | axe rule table with tags, default state, result types (primary) | develop, 4.14 links; fetched 2026-11-27 | defines what each rule checks and which are off |
| https://github.com/dequelabs/axe-core/blob/develop/doc/API.md | axe API: `runOnly`, `rules`, `resultTypes`, `getRules` (primary) | develop; fetched 2026-11-27 | exact option semantics |
| https://github.com/dequelabs/axe-core/releases | axe release notes (primary) | 4.14.1 2026-11-16; 4.14.0 2026-10-05; 4.13.0 2026-08-05 | why counts move between versions |
| https://www.w3.org/WAI/standards-guidelines/act/rules/ | W3C ACT rules list (primary) | undated, 2026 footer | status "proposed", ~89 rules |
| https://github.com/act-rules/act-rules.github.io | ACT rule sources (primary) | commit 2026-10-26 | rule-to-criterion mapping measured |
| https://playwright.dev/docs/accessibility-testing | Playwright accessibility guide (primary for Playwright) | undated | `withTags`, fixtures, state warning |
| https://www.w3.org/WAI/WCAG22/wcag.json | WCAG 2.2 machine-readable list (primary) | fetched 2026-11-27 | the 55 A and AA criteria |
| https://www.w3.org/WAI/WCAG22/Understanding/conformance | WCAG conformance explainer (primary) | updated 2026-09-20 | automated plus human evaluation; claim components |
| https://developer.chrome.com/docs/lighthouse/accessibility/scoring | Lighthouse accessibility scoring (primary) | undated, axe 4.11 links | weights, exclusions |
| https://www.deque.com/automated-accessibility-coverage-report/ | Deque coverage report (vendor data) | undated | the 57.38 percent figure and its method |
| https://webaim.org/projects/million/ | WebAIM Million 2026 (independent) | February 2026 | six categories, 96 percent |
| https://arxiv.org/html/2503.15885v1 | Suh et al., LLM-generated UI accessibility (independent, small) | March 2025 | checker loop versus few-shot |
| https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million | FTC final order (authority) | 2025-04-22 | limits on automated-compliance claims |
| https://github.com/ota-meshi/eslint-plugin-astro | Astro ESLint plugin (primary) | 3.2.2, commit 2026-11-26 | jsx-a11y configs, ESLint 10 floor |
| https://docs.astro.build/en/guides/dev-toolbar/ | Astro dev toolbar docs (primary) | undated | audit app is dev-only |
| https://github.com/withastro/astro | Astro source, audit rules file (primary) | commit 2026-11-26 | 24 a11y audit rules |
| https://github.com/jsx-eslint/eslint-plugin-jsx-a11y | jsx-a11y plugin (scout-read, not re-fetched) | 6.10.2 per scout | JSX-only rules |
| https://link.springer.com/article/10.1007/s10209-025-01263-x | Springer study of Swedish public sites (independent; not fetched here, cookie redirect) | 2025-09-18 per scout | the one-sixth figure |

Not fetched or failed: the Springer page (redirected to a cookie check twice; figures taken from the scout, marked unverified); `https://github.com/ota-meshi/eslint-plugin-astro/blob/main/docs/rules/README.md` returned 404, so the repo clone was read instead. Local measurements used the fleet repositories read-only and scratch files under `~/.cache/research-lang/exemplars/product/uxv-a11y-cov-7f3k/` (a first scratch directory was deleted mid-run by something outside this task and rebuilt; results above are from the rebuilt run).

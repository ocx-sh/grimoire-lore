---
title: "UX-VERIFY: what an agent runs on an interface change, and what it may claim afterwards"
topic: ux-verification-claims
program: product
sub_program: ux
date: 2026-11-27
revised: 2026-11-27
model: opus
id_family: UX-VERIFY
consolidates:
  - ux-verification-claims/automated-a11y-coverage.md
  - ux-verification-claims/rendered-interaction-matrix.md
  - ux-verification-claims/evidence-and-claims.md
  - ux-verification-claims/conformance-targets-law.md
  - ux-verification-claims/followup-q0.md
grounding:
  - product-audit/ui-code-posture.md
  - product-audit/config-inventory.md
  - product-audit/exemplar-design-systems.md
  - product-audit/exemplar-landing-pages.md
---

# UX-VERIFY: verification and claims

The question: what must an agent run on an interface change, and what may it claim afterwards about accessibility, performance and usability?

Contents: [Verdict](#verdict) · [Conflicts resolved](#conflicts-resolved) · [The ruleset](#the-ruleset) · [Applied to the fleet](#applied-to-the-fleet) · [AI-agent failure modes](#ai-agent-failure-modes) · [What an agent must ask a human](#what-an-agent-must-ask-a-human) · [Decay](#decay) · [Open questions](#open-questions) · [Sub-artifacts](#sub-artifacts) · [Key sources](#key-sources) · [Revision log](#revision-log)

## Verdict

1. **The accessibility gate is axe-core plus a rendered matrix, not Lighthouse.** axe runs on a served build in a real browser, with exactly the five tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`, on every routable page, in every colour scheme the site ships, and once per open interactive state (UX-VERIFY-02 to -05). The matrix is ten rows per route: reflow, two zoom levels, both schemes, forced colours, reduced motion and three Tab walks (UX-VERIFY-13). The gate blocks pull requests. In the matrix, only the objective checks block: horizontal scroll, a zoom-blocking viewport meta, the scheme and forced-colours checks, unnamed stops, a walk that does not wrap, and lost focus. The two heuristic checks (clipped text and the focus pixel diff) and the obscured-stop check are advisory and go to Needs human review (UX-VERIFY-13 to -16). The all-pages sweep stays in the deep tier (UX-VERIFY-07).

   **Documented gap: the matrix's error rate against a human viewer is still unmeasured, because no human labelled a firing.** The wave-2 study ran on 33 routes (4 ocx.sh site, 29 catalog) on 2026-11-27 ([followup-q0.md](ux-verification-claims/followup-q0.md)). It measured these firing rates:
   - `newClipped` on 2 routes (6 %);
   - `noRing` on 3 routes before the ancestor pass and 2 after it, 25 stops down to 14;
   - `fullyObscured` on 4 routes (12 %), 6 stops.

   An agent labelled 7 firings: 3 true and 4 false. The exact 95 % interval on the true share is 10 % to 82 %, so the labels rank no check. Agent labels are not human labels. Without a human, no check may block. What is missing is one human who labels every firing on saved screenshots, plus a random sample of unflagged routes for misses. The study did settle one cause. The obscured-stop false positives came from sampling the bounding box of a wrapped inline link, and UX-VERIFY-15 now samples each line box. The objective checks `unnamed`, `capped` and `lost` fired on 0 of 33 routes. `hscroll` fired on 11, all on the catalog build.
2. **Lighthouse stays as a regression gate and leaves every claim.** Measured on 2026-11-27 with Lighthouse 13.6.0: ocx.sh home scored 100 with 2 confirmed `label-content-name-mismatch` nodes, and grimoire.rs home scored 100 with 85 contrast nodes needing review ([automated-a11y-coverage.md §4](ux-verification-claims/automated-a11y-coverage.md#4-lighthouse-and-the-score)). The fleet's "Lighthouse 100 is the bar" wording is therefore demoted (UX-VERIFY-25).
3. **`incomplete` (needs review) is a result, not noise.** The gate ratchets each rule's needs-review count against a committed baseline and lists the nodes for a human (UX-VERIFY-03). On grimoire.rs, 1,141 contrast nodes on 48 of 49 pages sit there while `violations` is empty.
4. **No automated run decides any WCAG criterion completely.** In axe-core 4.14.1 the gate has a rule for 21 of the 55 A and AA criteria. 8 of those are classed DETECT, 13 PARTIAL, and 34 criteria have no rule (HUMAN) ([§5](ux-verification-claims/automated-a11y-coverage.md#5-the-55-criteria-what-the-gate-decides)). Every report therefore ends with a "not decided by this run" list (UX-VERIFY-23).
5. **Every finding carries an evidence class, a verbatim quote and one whitelisted criterion ID.** The classes are measured, rendered-checked, code-read, inferred and simulated. Speculation goes to a separate Needs human review list (UX-VERIFY-20 to -22). The rationale is measured: an unaided LLM code-read found 30 of 30 judgement-class defects that axe missed. In 5 of 6 runs it also emitted 5 to 7 unsupported findings ([evidence-and-claims.md §1](ux-verification-claims/evidence-and-claims.md#1-measurement-seeded-answer-key-n20-defects-in-2-files)).
6. **The agent never writes a conformance, legal or user-behaviour claim.** It writes what ran, on what, with which result, and what was not covered. Accessibility and conformance wording is UX-VERIFY-24, user-outcome wording is UX-VERIFY-28, and legal wording is UX-VERIFY-31. "Intuitive" and "user-friendly" are not banned here: no source was found for such a ban (revision log). Statements, VPATs and regime sentences are the owner's.
7. **The target string is "WCAG 2.2 Level AA", used to select tests, never as a claim.** The choice rests on the W3C Recommendation alone. EN 301 549 V4.1.1 aligns with WCAG 2.2, but its Official Journal citation is unverified. 2.1 or 2.0 applies only in a deliverable the owner documents as legally bound. WCAG 3 is never a target (UX-VERIFY-30).
8. **Screen-reader behaviour is a human pass that the agent requests and never records.** The pairs are NVDA + Chrome, JAWS + Chrome and VoiceOver + Safari on iOS. The pass is triggered by new widget patterns and by releases (UX-VERIFY-18).
9. **Performance statements name lab or field.** "Meets Core Web Vitals" needs a named field source (UX-VERIFY-27).
10. **Two measured matrix failures on ocx.sh `/` are unresolved, not confirmed.** The desktop focus failure on `button.ocx-cmdbar__trigger` is likely a script limit: the parent draws the ring (`command-bar.css:124-126`). The script must check ancestors before it reports a missing focus indicator (UX-VERIFY-16). The two-ancestor pass was implemented and run on 2026-11-27. It cleared 11 of 25 stops, including all 9 `/team/` card stops. It did not clear this stop, and it did not clear the 11 blank stops at 400 % zoom. So the pass is necessary but not sufficient, and these stops stay in Needs human review. Two causes are possible, and neither was isolated: the inset outline, or `:focus-visible` no longer matching after the script's blur and refocus ([followup-q0.md §B](ux-verification-claims/followup-q0.md#b-ancestor-pass-run-ux-verify-16-implemented-tab-walks-only)).
11. **Several Verify lines depend on files that are not shipped yet.** These are the matrix script, with its ancestor pass, and the WCAG 2.2 ID list. Until the UX review skill ships them, the affected Verify lines are review only. This ruleset publishes only with those skill files, and with the docs-quality cross-reference edit (see [Publication preconditions](#publication-preconditions)).

### Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| K1 | The fleet makes Lighthouse 100 "the bar" (`ocx-sh/website/skills/ocx-theme-quality/SKILL.md:12-13`, `ocx-sh/website/AGENTS.md:37`, `ocx-sh/ocx/.claude/rules/subsystem-website.md:83`). automated-a11y-coverage says the score has no claim value | Lighthouse stays as a PR regression gate. axe plus the matrix are the accessibility gate. The score never appears as evidence (UX-VERIFY-25) | 100 coexisted with a confirmed axe failure on 2 of 3 sites, and Lighthouse counts needs-review as a pass |
| K2 | automated-a11y-coverage bans Lighthouse from PR text. evidence-and-claims allows "Lighthouse accessibility audits: score X" | The score may appear only inside the gate-facts block, labelled as a weighted automated subset. It never appears on a public surface or as a pass verdict | The labelled form misleads no one. A public "Lighthouse 100" reads as a quality claim |
| K3 | Coverage figures: Deque 57.38 % (undated report page), Deque 57 % (2021-03-10 blog), GDS 40 % (2018-04-13), one sixth (Springer 2025, not re-fetched), and "20 to 30 %" | No percentage appears in agent output. The only coverage figure allowed is a count with its command: "21 of 55, 8 DETECT, axe-core 4.14.1" (UX-VERIFY-26) | The figures count different units: issue volume, seeded barriers, criteria. None of them describes a given page |
| K4 | The scout counted 21 criteria with an enabled rule and 19 with an ACT mapping. The dive measured 20 enabled (21 with the gate tags) and 23 ACT primary | Use the measured counts | The measurement is the later, reproducible one (`node rules.mjs`, ACT clone `50d2bed`) |
| K5 | Tag set. The catalog script mixes `best-practice` into its WCAG tags (`ocx-sh/catalog/scripts/quality-axe.mjs:34`), and so did the seeded run. Playwright's example uses four tags | The five WCAG tags go in one result set. best-practice goes in a separate set, which may still block as house policy (UX-VERIFY-02, -09) | Mixing them makes a WCAG statement false in both directions. The four-tag example drops `target-size` |
| K6 | `incomplete`: block on any node, ignore it (`violations: []`), or ratchet | Ratchet against a committed baseline and list the nodes for a human (UX-VERIFY-03) | Blocking would fail grimoire.rs outright on 1,141 nodes. Ignoring hides them |
| K7 | conformance-targets-law allows "tested against WCAG 2.2 AA with tool X". automated-a11y-coverage allows only "no violation found by <rule ids>", and evidence-and-claims bans "meets AA" | Name the rule set and its tool, never the standard, as the thing that passed. "WCAG 2.2 AA" names only the test target (UX-VERIFY-23, -30) | axe touches 21 of 55 criteria, so "tested against WCAG 2.2 AA" overstates the scope |
| K8 | evidence-and-claims bans the bare word `accessible` | Ban predicate forms only ("is accessible", "fully accessible"). Technical nouns ("accessible name", "accessibility tree") stay allowed (UX-VERIFY-24) | The bare ban would block correct technical text, and a grep for it would drown in false positives |
| K9 | rendered-interaction-matrix reports a desktop focus failure on `/` (`button.ocx-cmdbar__trigger`, byte-identical screenshots). The audit says the replacement is "untraced" (`ui-code-posture.md`, §6 item 8) | The failure is unresolved, not a violation. The source draws the ring on the parent: `.ocx-cmdbar__field:has(.ocx-cmdbar__trigger:focus-visible) { outline: var(--ocx-focus-ring) }` at `ocx-sh/website/packages/theme/src/components/ui/command-bar.css:124-126`, outside the script's 6 px clip. UX-VERIFY-16 adds an ancestor pass. A two-ancestor pass, run on 2026-11-27, did not clear this stop, so it stays in Needs human review ([followup-q0.md §B](ux-verification-claims/followup-q0.md#b-ancestor-pass-run-ux-verify-16-implemented-tab-walks-only)) | Read 2026-11-27. A rule built on the raw script output would report a false defect |
| K10 | Screen-reader pairs. GOV.UK lists six combinations, including TalkBack, Dragon and a magnifier, on 2016 survey data (page updated 2022-05-24). The matrix dive picks from WebAIM survey 11 (Jul-Aug 2026) | Minimum: NVDA + Chrome, JAWS + Chrome, VoiceOver + Safari on iOS, plus NVDA + Firefox at release. Other pairs are added only if the owner names those users as the audience | Newest data. The fleet's audience is desktop developers. The owner sets the public support baseline |
| K11 | "Scan both colour schemes" versus Grimoire docs, which is dark only by decision (`grimoire-rs/grimoire/docs/src/components/ThemeProvider.astro:1-18`) | Scan every scheme the site ships (UX-VERIFY-04) | A light-scheme scan of a dark-only site tests a page nobody sees |
| K12 | The target version: 2.2 AA (W3C; EN 301 549 V4.1.1, whose Official Journal citation is unverified) versus 2.1 AA (ADA Title II, USWDS skill, `grimoire-rs/grimoire/.claude/templates/artifacts/design_spec.template.md:12`) | 2.2 AA, on the W3C Recommendation alone. 2.1 or 2.0 (with 4.1.1) only in an owner-documented legally bound deliverable (UX-VERIFY-30) | A 2.2 AA run covers the 2.1 AA criteria except 4.1.1 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2024-12-12). The Commission page (updated 2026-11-23) still lists V3.2.1 as the harmonised version ([conformance-targets-law.md §2](ux-verification-claims/conformance-targets-law.md#2-regime-table)) |
| K13 | Reduced motion. The matrix dive makes it SHOULD (2.3.3 is AAA). UX-A11Y C5 makes it MUST where a duration-token layer exists | The matrix row blocks where a duration-token layer exists (`ocx-sh/website/packages/theme/src/tokens.css:353`) and is advisory elsewhere (UX-VERIFY-13) | This keeps the catalog consistent with [ux-a11y-authoring.md](ux-a11y-authoring.md) C5 |
| K14 | Webview goldens. Without CSS, 63 of 122 show violations | Scan them with the extension stylesheet and stubbed `--vscode-*` variables. Until both load, `color-contrast` and `target-size` are listed under "did not run" (UX-VERIFY-11) | 274 of the 347 nodes are `target-size` on unstyled fragments, which is an upper bound and not a finding |
| K15 | WCAG 2.2 criterion count: 87 (automated-a11y-coverage, which counted 4.1.1 in `wcag.json`) versus 86 (evidence-and-claims) | The whitelist holds 86 IDs. 4.1.1 is rejected in 2.2 work and kept only in Section 508 deliverables | WCAG 2.2 removes 4.1.1 as "obsolete and removed" |
| K16 | conformance-targets-law requires "a keyboard pass on every change". The matrix runs three scripted Tab walks | The three Tab walks are the keyboard pass. Escape exit from a modal is a per-widget test (UX-VERIFY-17) | One check, not two that differ |
| K17 | rendered-interaction-matrix makes all matrix pass conditions MUST (RIM-3, RIM-6). An adversarial check found the heuristic checks unvalidated | Objective checks block (`hscroll`, viewport meta, scheme luminance, forced-colours text, `unnamed`, `capped`, `lost`). `newClipped`, `noRing` and `fullyObscured` are advisory and go to Needs human review until humans have labelled the firings (UX-VERIFY-13 to -16) | The dive's own false-positive history (`.sr-only` counted as clipped, a `pre` counted as a control, a wrap counted as lost focus), 11 unresolved blank stops at 400 % zoom, and K9 ([rendered-interaction-matrix.md §3](ux-verification-claims/rendered-interaction-matrix.md#3-measurement-on-three-real-pages)). The wave-2 study confirmed the split. An agent labelled 7 heuristic firings on 33 routes: 4 were false, with a 95 % interval on the true share of 10 % to 82 %. There were no human labels ([followup-q0.md](ux-verification-claims/followup-q0.md)) |
| K18 | evidence-and-claims bans "intuitive", "user-friendly" and "users will". Its rationale cites only conformance-claim sources | Accessibility claims stay banned (UX-VERIFY-24). User-outcome claims move to UX-VERIFY-28, and "users will" is matched only before an outcome verb. "Intuitive" and "user-friendly" are dropped | WCAG §5.3, WCAG-EM 2 and the FTC order cover conformance claims only. A search on 2026-11-27 found no style guide that bans "intuitive"; the [WordPress docs word list](https://make.wordpress.org/docs/style-guide/word-list/a/) (modified 2026-10-14) recommends it: "Don't use accessible as a synonym for simple. Instead, use easy to use or intuitive." A bare "users will" regex flags UI descriptions such as "users will be prompted" |

## The ruleset

Severity: MUST, SHOULD, CONSIDER. "Gate" means the axe configuration of UX-VERIFY-02 to -05. "Matrix" means `checks/ui-matrix.mjs` (full source in [rendered-interaction-matrix.md, Appendix](ux-verification-claims/rendered-interaction-matrix.md#appendix-commands-and-script)). The lead commits the script with the change in UX-VERIFY-16. Surfaces without a browser (CLI, TUI) are covered only by UX-VERIFY-01, -20 to -24, -28 and -31. Their stream and exit-code contracts are already in the language sets.

Report field labels, used by the Verify lines of UX-VERIFY-20 to -22: a report has a `## Findings` section and a `## Needs human review` section. Each finding starts with a `- file:` line and carries `quote:`, `sc:`, `also:` (optional), `evidence:`, `severity:` and `fix:` lines. Each Needs human review item starts with a `- sc:` line and carries the eight labels listed in UX-VERIFY-22.

#### Publication preconditions

This ruleset is not published to the catalog until three things ship:
1. The UX review skill ships `checks/ui-matrix.mjs`. It is the dive's appendix script with two changes: the line-box sampling of UX-VERIFY-15 and the ancestor pass of UX-VERIFY-16. It writes these fields to its JSON report:
   - the blocking and advisory fields of UX-VERIFY-13 to -15;
   - the `noRingSelf` and `ancestorCleared` fields of UX-VERIFY-16.

   `ui-matrix-anc3.mjs` in [followup-q0.md](ux-verification-claims/followup-q0.md) has both changes. It is a measured draft, not the shipped script.
2. The same skill ships `wcag22-ids.txt`, built by the command in UX-VERIFY-21.
3. The `rules/docs-quality.md:184-186` cross-reference to UX-VERIFY lands, so that the two catalog rules agree (see Applied to the fleet, Catalog hole).

Until item 1 ships, the Verify lines of UX-VERIFY-13 to -16 are **review only**: a reviewer reads the run's JSON by hand. The Verify lines of UX-VERIFY-20 to -22 are shell commands over the report and run without any skill file. The publisher re-runs every `Re-check` command in this file on the publish date and updates the dates it prints.

### A. What runs, and in what order

**UX-VERIFY-01 (MUST).** Before reporting an interface change finished, run these steps in order and list each under `ran:` or `did not run:` with a reason:
1. the gate, on a served build in a real browser, never jsdom;
2. the matrix, on every touched route;
3. a code-read review;
4. the Needs human review list.

Fix what the first run reports, then run it again. An accessibility instruction in the prompt never replaces the run.
- Rationale: the main reason is measured in this program. A jsdom run silently skipped `color-contrast` and looked clean ([evidence-and-claims.md §1](ux-verification-claims/evidence-and-claims.md#1-measurement-seeded-answer-key-n20-defects-in-2-files), observation b). Without a real-browser run, no later claim in the report has a basis. One external study is suggestive only ([arXiv 2503.15885](https://arxiv.org/html/2503.15885v1), March 2025, independent; two models, ten projects). There, a checker loop lowered the AChecker inaccessibility rate from 0.347 to 0.292, while few-shot instructions raised it to 0.449. On the second checker, QualWeb, the loop did not improve the rate (0.105 to 0.112). The authors note that the metric "treats all violations equally" ([automated-a11y-coverage.md §9](ux-verification-claims/automated-a11y-coverage.md#9-checker-loops-for-agent-written-ui)). So the loop is necessary but not sufficient, which is why the steps include a code-read.
- Verify: the report header has `ran:` and `did not run:` lines. The PR carries the second run's output, and no violation ID from the first run remains. An axe run under jsdom lists `color-contrast` under `did not run:`.

**UX-VERIFY-02 (MUST).** Run axe-core through one shared fixture with exactly the tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` (Playwright: `.withTags([...])` with all five). Never call `new AxeBuilder({ page }).analyze()` without the fixture, and never copy Playwright's four-tag example.
- Rationale: measured on axe-core 4.14.1 on 2026-11-27. The five tags turn on `target-size` (2.5.8), which a default run skips (ocx.sh: 3 nodes appear only with the tags). A default run also mixes in best-practice rules. Playwright's guide omits `wcag22aa`: its example is `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` ([Playwright](https://playwright.dev/docs/accessibility-testing); the page shows no date, fetched 2026-11-27).
- Re-check at publish time and on each Playwright minor: `curl -s https://playwright.dev/docs/accessibility-testing | grep -oE 'wcag2[0-9a-z]*' | sort -u`. On 2026-11-27 it printed `wcag21a wcag21aa wcag2a wcag2aa`. If `wcag22aa` appears, drop the "never copy" clause.
- Verify: `git grep -n 'AxeBuilder(' -- tests | grep -v makeAxeBuilder` returns no line, and the fixture contains all five strings. Fail example: `ocx-sh/website/tests/e2e/a11y.spec.ts:16`.
- Platform fact: axe's [rule-descriptions.md](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) (fetched 2026-11-27) keeps WCAG 2.2 rules off by default "until WCAG 2.2 is more widely adopted". Re-check on each axe minor release: `curl -s https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md | grep -n target-size`. If the rule becomes default-on, the tag stays harmless.

**UX-VERIFY-03 (MUST).** Assert on `incomplete` as well as `violations`:
- commit a per-rule baseline of needs-review counts;
- fail the run when any rule's count rises above its baseline;
- copy each needs-review node into the Needs human review list.
- Rationale: on grimoire.rs, 1,141 `color-contrast` nodes on 48 of 49 pages are needs-review while `violations` holds none, and `expect(violations).toEqual([])` passes over all of them (K6).
- Verify: `git grep -n '\.incomplete' -- tests` hits the shared fixture, and a baseline file exists. A token change that adds one contrast needs-review node turns the run red.

**UX-VERIFY-04 (MUST).** Scan every routable page or template, in every colour scheme the site ships. Take the page list from the router output, the sitemap or an explicit list, never from a walk of `dist/**/*.html`.
- Rationale: on the MkDocs indexer, the dark scheme raised gate violations from 189 to 296 nodes (`link-in-text-block`, 109 nodes). On ocx.sh, the `dist/_shell/` and `dist/frag/` fragments produced false `document-title` and `html-has-lang` violations. Grimoire docs ships dark only (K11).
- Verify:
  - the gate's page list matches the sitemap. For an Astro build: `diff <(grep -ohE '<loc>[^<]+' dist/sitemap-[0-9]*.xml | sed 's/<loc>//;s#https\?://[^/]*##' | sort -u) <(sort -u <page-list-file>)` prints nothing. For MkDocs, read `site/sitemap.xml` instead. On the ocx.sh build, the sitemap half printed 4 paths on 2026-11-27;
  - the gate config sets `colorScheme` once for each scheme the theme offers, and the gate-facts block of UX-VERIFY-23 lists the same schemes;
  - `git grep -nE 'readdir|glob' -- tests` shows no directory walk feeding the axe page list.

**UX-VERIFY-05 (MUST).** Scan each interactive state in its own call. Open the state and assert it is visible before `analyze()`. This covers every dialog, menu, popover and command palette, every form error state, and each loading, empty and error fixture.
- Rationale: `analyze()` scans only the current state ([Playwright](https://playwright.dev/docs/accessibility-testing)), and a closed dialog is not in the accessibility tree. The fleet's catalog script already scans the Mod+K palette open (`ocx-sh/catalog/scripts/quality-axe.mjs:3-9`).
- Verify: list the component files that declare an open state, and check that a spec names each one and both asserts `toBeVisible()` and calls `analyze()`. This loop prints nothing on a pass:
  ```sh
  P='role=\{?["'"'"'](dialog|alertdialog|menu|listbox)|<dialog\b|aria-haspopup|\bpopover\b'
  for c in $(git grep -lE "$P" -- '*.astro' '*.tsx' '*.vue' '*.svelte'); do
    n=$(basename "${c%.*}")
    git grep -lF "$n" -- tests | xargs -r grep -l 'toBeVisible' | xargs -r grep -l 'analyze()' | grep -q . || echo "no open-state scan: $c"
  done
  ```
  The match is by file basename. A hit for a component that a spec scans under another name passes once the spec names it in a comment. On `ocx-sh/website` on 2026-11-27, the loop printed 5 of 10 files (see Applied to the fleet).

**UX-VERIFY-06 (MUST).** Pin `axe-core` and `@axe-core/playwright` to exact versions, print the version in the run log, and re-baseline in the same commit as any version bump.
- Rationale: v4.14.0 (2026-10-05) enabled `label-content-name-mismatch` by default. The v4.14.1 notes (2026-11-16) say its fixes "can change color-contrast and target-size results in either direction" ([releases](https://github.com/dequelabs/axe-core/releases)).
- Verify: `grep -nE '"(axe-core|@axe-core/playwright)": "[\^~]' package.json` returns nothing, and the run log contains `axe-core 4.`. Fail examples: `ocx-sh/website/package.json:12` (`"^4.13.0"`), and `ocx-sh/catalog/scripts/quality-axe.mjs:45-48`, which loads the copy of axe-core that `@lhci/cli` pulls in.

**UX-VERIFY-07 (MUST).** On every pull request that touches interface code of a site or webview with built output, make the gate and the matrix blocking checks. Keep the all-pages, all-states sweep in the scheduled deep tier.
- Rationale: a check that does not block a merge does not stop an agent's change. Today axe runs only in the nightly or labelled deep tier of one repository (`ocx-sh/website/.github/workflows/verify-deep.yml:7,18`). Grimoire's docs and grim-gui have no accessibility check at all ([ui-code-posture.md](product-audit/ui-code-posture.md), CI table). The matrix takes about 13 s per page on a production build (measured).
- Verify: `git grep -nE 'axe|a11y|ui-matrix' -- .github/workflows taskfile.yml 'taskfiles/*'` shows a job that runs on `pull_request` without a label condition.

**UX-VERIFY-08 (MUST).** Keep a red-demo run: plant an image without `alt` and an unlabelled button, and require the gate to fail. Run it when the gate config changes and in the deep tier.
- Rationale: it proves that a green run can go red. The fleet already has one (`ocx-sh/catalog/scripts/quality-axe.mjs`, `--red-demo`).
- Verify: the red-demo task exists, and CI expects its non-zero exit.

**UX-VERIFY-09 (MUST).** Keep `best-practice` results in a separate result set labelled as house policy. A team may block on them, but they never count toward or against a WCAG statement.
- Rationale: `region`, `landmark-one-main`, `landmark-unique`, `page-has-heading-one` and `aria-dialog-name` fired on all three measured builds and are not WCAG failures (K5).
- Verify: the WCAG step's tag list contains no `best-practice`, and best-practice output goes to its own named step or file. Fail example: `ocx-sh/catalog/scripts/quality-axe.mjs:34`, where the WCAG and best-practice tags share one result.

**UX-VERIFY-10 (MUST).** Silencing the gate is an owner decision, not an agent fix: it goes through the approval gate in [What an agent must ask a human](#what-an-agent-must-ask-a-human), row "Accepting an exception". Disabling an axe rule, excluding an element, raising a baseline or skipping a matrix row needs the owner's approval in the pull request, plus a written reason at the call site. When the reason is a real defect being deferred, link its issue.
- Rationale: that a silenced check proves nothing is common knowledge. The non-obvious part is who may accept the exception. `disableRules` and `exclude` silence every rule on the element ([Playwright](https://playwright.dev/docs/accessibility-testing), fetched 2026-11-27), so the call site does not show what was given up, and only the owner can accept that.
- Verify: `git grep -nE -B2 'disableRules|\.exclude\(' -- tests` shows a comment line above each hit, and a diff that adds one carries an approval note. Satisfied example: `ocx-sh/website/tests/e2e/components-glossary.spec.ts:259-260` (the reason is that story iframes each hold a `<main>`).

**UX-VERIFY-11 (MUST).** Scan VS Code webview markup with the same gate:
- render each golden HTML fixture in a shell with `<html lang>`, `<title>` and `<main>`;
- load the extension's stylesheet and stub the `--vscode-*` theme variables;
- until both load, list `color-contrast` and `target-size` under `did not run:`.
- Rationale: webview HTML is built in TypeScript template strings that no lint reads (271 markup lines in `grimoire-rs/vscode/src/webview/*.ts`). The 122 goldens are a versioned corpus that axe can scan without starting VS Code (K14).
- Verify: a test reads `src/test/fixtures/goldens/` and calls axe on each file. Adding `<button></button>` to one golden fails the test.

**UX-VERIFY-12 (SHOULD).** In each Astro repository, add `eslint-plugin-astro`'s `jsx-a11y-recommended` config and install `eslint-plugin-jsx-a11y` beside it (ESLint 10 or newer).
- Rationale: `astro.configs.recommended` does not enable the 36 `astro/jsx-a11y/*` rules ([user guide](https://github.com/ota-meshi/eslint-plugin-astro/blob/main/docs/user-guide.md), plugin 3.2.2, commit 2026-11-26). TS-WEB-06 covers JSX, not `.astro`. This is SHOULD because nobody has yet run the config over the 102 theme components. Lint cannot see rendered component output, so it never replaces UX-VERIFY-02.
- Verify: `npx eslint --print-config src/pages/index.astro | grep -c 'astro/jsx-a11y'` prints a number above 0, and a seeded `<img src="x">` in an `.astro` file fails lint. Fail example: `ocx-sh/website/eslint.config.js:30`.

### B. The rendered matrix

**UX-VERIFY-13 (MUST).** After any change to the markup, CSS or script of a rendered page, run the matrix: `node checks/ui-matrix.mjs <base> <out.json> <route>...`, with the script from the UX review skill (Publication preconditions, item 1). Run it against a served production build, for every touched route plus `/`, and read every FAIL line. The script reports ten rows per route:

| Row | Condition |
|---|---|
| 1 | reflow at 320x1024 |
| 2 | zoom 200 % (640x360) |
| 3 | zoom 400 % (320x180) |
| 4 | light scheme |
| 5 | dark scheme |
| 6 | forced colours |
| 7 | reduced motion |
| 8 | Tab walk at 1280x720 |
| 9 | Tab walk at 320x180 |
| 10 | Tab walk under forced colours |

Each row blocks only on its objective checks. Its heuristic checks are advisory: each hit goes to Needs human review with a screenshot path and does not fail the pull request (K17).

| Rows | Blocking (objective) | Advisory (heuristic, error rate unmeasured) |
|---|---|---|
| 1 to 3 | `hscroll` (`scrollWidth > clientWidth + 1`); a viewport meta with `user-scalable=no` or `maximum-scale=1` | `newClipped` (UX-VERIFY-14) |
| 4, 5 | background luminance matches the scheme | none |
| 6 | `forced-colors` matches, and no visible text has a computed colour equal to its background | none |
| 7 | zero infinite animations and no smooth scroll under `reduce`, where the codebase has a duration-token layer (K13) | the same check, where it has none |
| 8 to 10 | `unnamed`, `capped`, `lost` > 1 (UX-VERIFY-15) | `noRing`, `fullyObscured` (UX-VERIFY-15, -16) |

The dive's script exits non-zero on any failed check, heuristic or not. A CI job therefore reads the blocking fields from the JSON report and never uses the exit code alone, until the shipped script reports the two groups apart. A heuristic check becomes blocking only after three things happen:
- a human labels every firing on at least 20 routes as `defect` or `not-defect`, in `matrix-labels.csv` with the header `route,row,check,stop,label,labeller`. An agent's label, including one taken from a screenshot it viewed, does not count;
- the owner sets the false-positive share that may block. No source sets one;
- this rule is revised.

On 2026-11-27 no human label existed (Verdict 1, documented gap).
- Rationale: axe and static checks cannot see reflow, zoom clipping, hidden focus or motion. The heuristics are not validated: the clipped-text check first counted `.sr-only` spans as clipped, 11 blank stops at 400 % zoom on `/` are unexplained, and the one desktop focus failure is a probable false positive (K9) ([rendered-interaction-matrix.md §3](ux-verification-claims/rendered-interaction-matrix.md#3-measurement-on-three-real-pages)). WCAG equates 320 CSS px with a 1280 px window at 400 % zoom ([Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), updated 2026-10-04). Playwright has no zoom option, so the script shrinks the viewport ([BrowserContext options](https://playwright.dev/docs/api/class-browser#browser-new-context); the page shows no date, read for the dive on 2026-11-27). Run against a dev server, Tab walks took 9 to 10 s per page, against 1.5 to 5.5 s on a production build.
- Verify (review only until the script ships): the JSON report has 10 rows per route, and every blocking field in the table above passes. Every advisory hit appears in Needs human review. Only the scheme rows for schemes the site ships apply (K11). A CI change that makes `newClipped`, `noRing` or `fullyObscured` block needs a `matrix-labels.csv` that passes these checks:
  - `awk -F, 'NR>1{r[$1]=1} END{print length(r)}' matrix-labels.csv` prints 20 or more;
  - `awk -F, 'NR>1 && ($5!="defect" && $5!="not-defect" || $6 !~ /^human:/)' matrix-labels.csv` prints nothing.

**UX-VERIFY-14 (MUST for horizontal scroll; the clipped-text check is advisory).** Fail a reflow or zoom row when the document scrolls horizontally (`scrollWidth > clientWidth + 1`). When text is clipped by `overflow` in an element that was not clipped at 1280 px, file a Needs human review item with a screenshot path. Report it under Findings only after a screenshot shows the lost text, with evidence class rendered-checked.
- Rationale: these rows test WCAG 1.4.10 and 1.4.4 at Level AA. Horizontal scroll is a direct measurement of the 1.4.10 failure. The clipped-text test is a heuristic: its first version counted `.sr-only` spans as clipped, and no error rate has been measured (K17).
- Verify (review only until the script ships): each row has `hscroll: false`. Each non-empty `newClipped` has a Needs human review item, or a finding, that carries a screenshot path.

**UX-VERIFY-15 (MUST for the objective checks; the pixel and hit-test checks are advisory).** In each Tab walk, fail when any of these holds:
- an interactive stop has an empty accessible name, read from the browser accessibility tree (CDP or `ariaSnapshot`), never from `textContent`;
- the walk does not wrap within 120 stops;
- focus lands on `body` more than once.

File a Needs human review item, not a failure, when either of these holds:
- a stop shows no pixel change between its focused and blurred screenshots, after the UX-VERIFY-16 ancestor pass;
- a stop is entirely hidden. For each rectangle in the stop's `getClientRects()` that intersects the viewport, take nine sample points, 3 by 3 inside that rectangle. The stop is hidden when every sample point hits an element that is neither the stop nor one of its descendants. Never sample the bounding box of an inline element that wraps. The item names the covering element and its `position`.

Partial overlap is a review hint, not a failure.
- Rationale: these conditions test 4.1.2 A, 2.4.7 AA (failures F55, F78), 2.4.11 AA and 2.1.2 A. Under 2.4.11 only an "entirely hidden" component fails ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), updated 2026-06-15). The computed `outline` value misled in both directions on `/`. The name, wrap and lost-focus checks read browser state directly. The pixel diff produced the unresolved results on `/` (K9, 11 blank stops at 400 % zoom). The hit test produced false positives, and their cause is now known. The old rule took nine points on the bounding box. On an inline link that wraps onto two lines, that box is 685 by 46 px for two line boxes of 38 by 20 and 58 by 20. The points fell in the gap between the lines and hit the parent. That caused 2 of the 4 obscured firings on the catalog build. Sampling inside each line box removed both and kept both true firings: a fixed "Contents" button that covers the focused link at 400 % zoom. A variant that took one centre point per line box added new false firings, on a 28 by 28 px button and a permalink. That is why each line box gets nine points ([followup-q0.md §C](ux-verification-claims/followup-q0.md#c-why-fullyobscured-fired-isolation-and-a-tested-fix), measured 2026-11-27). Both checks stay advisory until humans have labelled their firings (UX-VERIFY-13, K17). The new hit test was re-run on 4 routes only, and only an agent labelled them.
- Verify (review only until the script ships): in each walk row, `unnamed` is empty, `capped` is false and `lost` is at most 1. Each entry in `noRing` or `fullyObscured` has a Needs human review item that names the covering element. Script regression check, valid only for the `ocx-sh/index` build of 2026-11-27: run `node checks/ui-matrix.mjs <base> out.json` on `/catalog/docs/how-to/claim-a-namespace/`, `/catalog/docs/ops/m1-flip/`, `/catalog/docs/ops/run-reconcile-dry-run/` and `/catalog/docs/reference/wire-format/`. The check passes when:
  - `fullyObscured` is empty in every desktop and forced-colours walk row;
  - `fullyObscured` holds exactly one entry in the `tabwalk-zoom400` row of `m1-flip` and of `run-reconcile-dry-run`.

  The draft script `ui-matrix-anc3.mjs` gives exactly this result. On a later build or another site, this split need not hold.

**UX-VERIFY-16 (MUST).** Before reporting a stop with no focus indicator as a defect, repeat the screenshot diff on the focused element's nearest two ancestors:
- if an ancestor changes, the stop passes;
- if nothing changes, file the stop under Needs human review, not under Findings;
- also file it there when `elementFromPoint` finds the element in view but the screenshot shows it blank.
- Rationale: the only measured desktop failure has `outline: none` on the element itself (`command-bar.css:141-143`), while its parent draws the ring through `:has(... :focus-visible)` (`command-bar.css:124-126`, K9). At 400 % zoom, 11 stops with `solid 2px` outlines were blank in screenshots, and the cause was not isolated. The pass was run on 2026-11-27 over 33 routes and 99 walk rows. Before the pass, 25 stops had no visible indicator. The pass cleared 11 of them: 9 `/team/` card stops at the second ancestor and 2 stops on `/` at the first. An agent viewed the screenshot of the `/team/` Discord card: the card draws a 2 px border while focused. The pass did not clear the command-bar stop on `/` or the 11 blank stops at 400 % zoom. So the pass is necessary but not sufficient, and every remaining `noRing` entry stays in Needs human review ([followup-q0.md §B](ux-verification-claims/followup-q0.md#b-ancestor-pass-run-ux-verify-16-implemented-tab-walks-only)).
- Verify (review only until the script ships): each walk row records the clip it used. The dive's appendix script lacks this pass, so it is not the script this rule names. The shipped script differs from the appendix by this pass and by the line-box sampling of UX-VERIFY-15. In every walk row, the script writes three fields:
  - `noRingSelf`, the number of stops whose own clip shows no change;
  - `ancestorCleared`, the list of stops that an ancestor clears, each entry ending in ` anc1` or ` anc2`;
  - `noRing`, the stops that remain.

  The pass is implemented when this command prints `violations 0` and exits 0:
  ```sh
  node -e 'let b=0;for(const f of process.argv.slice(1))for(const p of JSON.parse(require("fs").readFileSync(f)).pages)for(const r of p.rows){if(!r.cond.startsWith("tabwalk"))continue;if(!("noRingSelf" in r)||r.noRingSelf!==r.noRing.length+r.ancestorCleared.length||r.ancestorCleared.some(x=>!/ anc[12]$/.test(x)))b++}console.log("violations",b);process.exit(b?1:0)' out.json
  ```
  Tested on 2026-11-27 in the follow-up's directory. On the ancestor-pass reports (`anc1.json anc2.json`, 99 walk rows), it printed `violations 0` and exited 0. On the appendix script's reports (`out1.json out2.json`), which have no ancestor pass, it printed `violations 99` and exited 1.

**UX-VERIFY-17 (SHOULD).** Once per codebase, extend the matrix with these scriptable checks:
- a text-spacing override causes no clipping (1.4.12);
- hover or focus content is dismissible with Escape (1.4.13);
- orientation is not locked (1.3.4);
- each modal exits on Escape and returns focus to its trigger (2.1.2);
- text-only 200 % resize, by setting the root font size, causes no loss (1.4.4);
- the 256 CSS px-high case passes for horizontally scrolling layouts (1.4.10).
- Rationale: no axe rule exists for these criteria, but a deterministic assertion can check each one ([automated-a11y-coverage.md §5](ux-verification-claims/automated-a11y-coverage.md#5-the-55-criteria-what-the-gate-decides), column S). Viewport shrink does not cover text-only scaling. This is SHOULD because none of these checks is implemented or measured yet.
- Verify: one named test per criterion (`git grep -nE '1\.4\.12|1\.4\.13|1\.3\.4|escape' -- tests`). For each widget with a dialog role, a test presses Escape and asserts focus on the trigger.

### C. The human pass

**UX-VERIFY-18 (MUST).** Add a Needs human review item for a screen-reader pass in two cases: a diff adds or changes a dialog, menu, tabs, combobox, live region, custom widget or multi-step flow, or a release is being prepared. The pairs are NVDA + Chrome, JAWS + Chrome and VoiceOver + Safari on iOS, plus NVDA + Firefox for a release. Never record that pass yourself.
- Rationale: reading the accessibility tree is not a screen-reader run. In WebAIM survey 11 (Jul-Aug 2026, 1,780 responses, uncontrolled sample, independent), the top desktop pairs are JAWS + Chrome 31.2 %, NVDA + Chrome 17.3 % and JAWS + Edge 17.0 %. VoiceOver is the primary mobile reader at 72.2 % ([survey 11](https://webaim.org/projects/screenreadersurvey11/)). axe passed every loading and error fixture that had no live region ([ux-interface-states.md](ux-interface-states.md), Verdict 2).
- Verify: the review output for such a diff contains an item that names the three pairs. Any "works with NVDA, JAWS or VoiceOver" sentence names the tester, the product version and the date.
- Re-check the pairs when a newer survey exists: `curl -s https://webaim.org/projects/ | grep -o 'screenreadersurvey[0-9]*' | sort -u` shows no number above 11.

**UX-VERIFY-19 (SHOULD).** When a diff touches one of these interactions, add a Needs human review item for the matching criterion that is new in WCAG 2.2:

| The diff touches | Criterion | Pattern on the added lines of the diff |
|---|---|---|
| dragging | 2.5.7 Dragging Movements | `draggable\|dragstart\|ondrag\|pointermove` |
| a help or contact link | 3.2.6 Consistent Help | `href="(mailto:\|tel:\|[^"]*(help\|support\|contact))` |
| a multi-step form | 3.3.7 Redundant Entry | `aria-current="step"\|[Ss]tep [0-9]+ of [0-9]+` |
| sign-in | 3.3.8 Accessible Authentication (Minimum) | `type="password"\|autocomplete="(current-password\|new-password\|one-time-code)"` |

- Rationale: no axe rule covers these four criteria in 4.14.1, and much training data predates WCAG 2.2 (2024-12-12). Of the other two new A and AA criteria, the matrix checks 2.4.11 and the gate checks 2.5.8.
- Verify: for each row, `git diff -U0 <base> | grep -E '^\+' | grep -nE '<pattern>'` (with the `\|` written as `|`). Each hit has a Needs human review item with that row's criterion ID. The patterns find only the common markup. A multi-step flow without step markers is missed; a reviewer who sees one adds the item.

### D. Report shape

**UX-VERIFY-20 (MUST).** Tag every finding with one evidence class, and use only the verbs that class allows:

| Class | Allowed verbs and required detail |
|---|---|
| measured | "reported" or "measured", naming the tool, its version and the state |
| rendered-checked | "observed in <browser build> at <viewport>" |
| code-read | "the source shows" |
| inferred | "likely" or "predicted" |
| simulated | carries the UX-VERIFY-29 banner |

- Rationale: without the class, the reader cannot tell a tool result from a guess. An agent in a sandbox cannot run a screen reader, so a claim about spoken output is at best code-read ([evidence-and-claims.md §2](ux-verification-claims/evidence-and-claims.md#2-evidence-classes-and-what-each-permits)).
- Verify: with `F=$(sed -n '/^## Findings/,/^## /p' report.md)`, `echo "$F" | grep -cE '^ *evidence: *(measured|rendered-checked|code-read|inferred|simulated)'` equals `echo "$F" | grep -c '^- file:'`. A code-read or inferred finding that says "fails", "violates" or "cannot" without a hedge is a review defect (review only).

**UX-VERIFY-21 (MUST).** Give every finding these fields:
- `file:line`;
- a verbatim quote of at most 120 characters;
- one primary criterion in an `sc:` field, either a WCAG 2.2 ID or a heuristic number, with any others in `also:`;
- the evidence class;
- a severity;
- a one-line fix.

Deduplicate findings by quote.
- Rationale: in 6 LLM runs, all 128 quotes were verbatim substrings of the file, so `grep -F` catches an invented finding. One defect was reported under 2 to 3 criteria, which inflated the counts. WCAG 2.2 has 86 criteria and removes 4.1.1 (K15).
- Verify:
  - per finding, `grep -qF -- "$quote" "$file"` succeeds;
  - `grep -oE '^ *(sc|also): *[0-9. ,]+' report.md | grep -oE '[1-4]\.[0-9]{1,2}\.[0-9]{1,2}' | sort -u | comm -23 - <(sort wcag22-ids.txt)` prints nothing, where `wcag22-ids.txt` holds the 86 IDs from [wcag.json](https://www.w3.org/WAI/WCAG22/wcag.json) without 4.1.1. Build it with `curl -s https://www.w3.org/WAI/WCAG22/wcag.json | jq -r '.principles[].guidelines[].successcriteria[].num' | grep -vx '4.1.1' > wcag22-ids.txt`. On 2026-11-27 that wrote 86 lines;
  - read IDs only from the `sc:` and `also:` fields, because version strings such as `axe-core 4.14.1` match the bare pattern;
  - no two findings share a `file:line` and a quote.

**UX-VERIFY-22 (MUST).** Split the report into Findings and Needs human review. Anything hedged ("may", "might", "potentially", "could", "possibly") or untestable in the sandbox goes to Needs human review. Each item there carries eight labelled fields:
1. `sc:` the criterion ID;
2. `locator:` an element locator;
3. `observed:` what was observed, with its evidence class;
4. `not tested:` what could not be tested, and why;
5. `steps:` numbered manual steps, each naming the tool and platform;
6. `expected:` the expected result, in one sentence;
7. `decides:` who decides;
8. `blocking:` yes or no.
- Rationale: in 5 of 6 runs, 5 to 7 of the 8 to 9 findings outside the answer key were unsupported ([evidence-and-claims.md §1](ux-verification-claims/evidence-and-claims.md#1-measurement-seeded-answer-key-n20-defects-in-2-files)). A stranger cannot execute "check screen reader compatibility".
- Verify:
  - hedges, with quoted text excluded (UX-VERIFY-21 requires verbatim quotes, and source code says "could"): `sed -n '/^## Findings/,/^## /p' report.md | grep -vE '^ *quote:' | sed 's/`[^`]*`//g' | grep -nEi '\b(may|might|potentially|could|possibly)\b'` returns nothing;
  - labels: with `N=$(sed -n '/^## Needs human review/,/^## /p' report.md)`, for each label in `sc: locator: observed: 'not tested:' steps: expected: decides: blocking:`, `echo "$N" | grep -c "^ *-\? *$label"` equals `echo "$N" | grep -c '^- sc:'`.
  - Pass example:
    ```
    - sc: 4.1.3
      locator: `#st` at `settings.html:94`
      observed: text injected without a live region (code-read)
      not tested: announcement; no screen reader in the sandbox
      steps: 1. NVDA + Firefox on Windows, activate Save
      expected: "Saved" is spoken and focus does not move
      decides: accessibility owner
      blocking: yes
    ```

**UX-VERIFY-23 (MUST).** End every run report with a gate-facts block, and scope every negative result. The block names:
- the axe-core version and tags;
- the pages, states and schemes scanned;
- violations and needs-review counts, by rule;
- the matrix rows passed per route, with the browser build and the date;
- a "not decided by this run:" line naming the criteria the gate has no rule for (34 of the 55 A and AA criteria in axe-core 4.14.1) and the 13 it checks only in part.

"None found" appears only in the form "<tool> found no <rule set> violations in <scope>; not covered: <list>".
- Rationale: a green gate covers at most 21 of 55 criteria, none completely. WebAIM writes that "Absence of detected errors does not indicate that a page is accessible or conformant" ([WebAIM Million](https://webaim.org/projects/million/), February 2026 data, independent). In the seeded test, a reviewer missed the missing `<html lang>` in 2 of 3 runs.
- Verify: every `no (issues|violations|problems)` line has `not covered:` within 3 lines, and the block's fields are present. Pass example: "axe-core 4.14.1, wcag2a to wcag22aa, 13 pages light and dark: 0 violations; needs review: color-contrast 28 nodes; ui-matrix 10/10 on /apps/, Chromium 1255, 2026-11-27; not decided: 34 criteria including focus order, captions and error suggestion".

### E. Claims

**UX-VERIFY-24 (MUST).** Never write a predicate claim of accessibility or conformance. This applies in findings, summaries, commits, PR text, docs and release notes. Banned forms:
- "is accessible", "fully accessible";
- "WCAG (2.x) (AA) compliant" or "conformant", "conforms to WCAG", "meets WCAG", "meets AA";
- "passes accessibility", "no accessibility issues", "screen-reader friendly";
- "ADA compliant", "Section 508 compliant", "EAA compliant", "EAA-ready".

Claims about what users found, prefer or will do are governed by UX-VERIFY-28. Technical nouns ("accessible name", "accessibility tree") are allowed. So is quoting a human's signed decision or a cited source.
- Rationale: a WCAG claim needs a date, the version, the level, the page scope and the technologies relied upon ([WCAG 2.2 §5.3](https://www.w3.org/TR/WCAG22/), 2024-12-12). WCAG-EM 2 says a sampled evaluation alone usually does not allow a claim ([WCAG-EM 2](https://www.w3.org/TR/wcag-em-2/), 2026-07-23). USWDS's own agent skill says "Do not claim "508 compliant" or "WCAG conformant" for a whole product based only on using USWDS or passing Axe in this repo" ([SKILL.md](https://raw.githubusercontent.com/uswds/uswds/develop/.agents/skills/uswds-accessibility/SKILL.md), file at `develop` with no date, fetched 2026-11-27, cited in [evidence-and-claims.md](ux-verification-claims/evidence-and-claims.md)). The FTC order against accessiBe bars claiming, without evidence, that an automated product makes a site WCAG compliant ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million), 2025-04-22). These sources cover conformance claims only, so the ban covers only that wording (K18).
- Verify: `grep -nEi "wcag ?(2\.[0-9])? ?(level )?(aa?)? ?(compliant|conformant)|\b(fully|is|are) accessible\b|conforms? to wcag|meets (wcag|aa)\b|passes accessibility|no accessibility (issues|problems)|screen[- ]reader friendly|(ada|508|eaa)[- ](compliant|ready)" <report-or-diff>` returns nothing. Allowed form: "ui-matrix passed 10 of 10 rows on /apps/ in Chromium 1255 on 2026-11-27".

**UX-VERIFY-25 (MUST).** Never cite a Lighthouse accessibility score as accessibility evidence. Keep the score as a CI regression gate. In a report, it appears only inside the gate-facts block, as "Lighthouse accessibility audits (weighted automated subset): N". It never appears on a public surface (README, docs, release notes, landing page) or as a pass verdict.
- Rationale: see K1 for the measurements. The score is a weighted average of pass-or-fail axe audits, and it excludes manual and best-practice audits ([Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring); the source file's front matter says updated 2023-08-03).
- Verify: `git grep -niE "lighthouse[^.]{0,30}(100|score)" -- 'README*' docs 'CHANGELOG*' '*.mdx'` returns no claim line. A threshold in `.lighthouserc.*` is a gate, not a claim. Re-check the weighting at each Lighthouse major release.

**UX-VERIFY-26 (MUST).** Quote no coverage or conformance percentage. Any other statistic in a UX finding carries six things:
- the figure;
- the sample (n, and who);
- the date the source states;
- the URL;
- a label: platform, independent study or vendor data;
- the metric's definition.

Compute any report score from the recorded findings, and show the weights table beside it.
- Rationale: the circulating figures count different units (K3). The only coverage figure allowed is a count with its command: "axe-core 4.14.1 has a gate rule for 21 of 55 A and AA criteria, 8 classed DETECT". For deterministic scoring, Spectrum's audit skill uses weights 10/5/2/1 ([rubric](https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/skills/spectrum-audit/scoring-rubric.md), fetched 2026-11-27, platform source).
- Verify: `grep -nEi "[0-9]+ ?% ?(of )?(wcag|accessib|compliant|covered|conform|issues)"` returns nothing in agent output. Every other `%` in a finding has `n=`, a four-digit year, a URL and a label nearby.

**UX-VERIFY-27 (MUST).** Say whether every performance statement is lab or field data. Write "meets Core Web Vitals" only with a named field source (CrUX or real-user monitoring). Report a Lighthouse or local-trace number as, for example, "lab LCP 1.9 s on <machine, profile>".
- Rationale: "good" means LCP at most 2.5 s, INP at most 200 ms and CLS at most 0.1, at the 75th percentile of field page loads. Lab data "is not a substitute for field measurement" ([web.dev](https://web.dev/articles/vitals), platform). The page says "Last updated: October 31, 2024". It was re-fetched on 2026-11-27, and the three thresholds and the percentile were unchanged. The fleet's budgets are lab budgets (`ocx-sh/website/tests/budgets.mjs:83-87`).
- Verify: every line naming `LCP`, `INP`, `CLS` or `Core Web Vitals` contains `lab` or `field`. Every "meets Core Web Vitals" sentence names `CrUX` or `RUM`.
- Re-check at publish time, then yearly: `curl -s https://web.dev/articles/vitals | grep -oE 'Last updated: [A-Za-z]+ [0-9]+, [0-9]{4}|2\.5 seconds|200 milliseconds' | sort -u`. On 2026-11-27 it printed `200 milliseconds`, `2.5 seconds` and `Last updated: October 31, 2024`. A new date means the thresholds must be read again before publishing.

**UX-VERIFY-28 (MUST).** A sentence about what users did, felt or will do needs a record in the same sentence: a session, log query or test-run ID, and n. Without one, start the sentence with "hypothesis:" or "predicted:". This covers outcome claims such as "users found", "users prefer", "users struggle", "users expect" and "users will find" or "users will love". It does not cover a description of interface behaviour, such as "users will be prompted" or "users will see a dialog": that describes the product, not the people. Mark each heuristic finding with:
- the heuristic's name;
- a 0 to 4 severity labelled "predicted";
- "single evaluator" in the report header.
- Rationale: NN/g asks for three to five independent evaluators. It says a violation "does not necessarily mean it's a problem" and that heuristic evaluation "cannot replace user research" ([NN/g](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/), 2023-06-25). Two 2025 studies of LLM heuristic evaluation disagree. One found 21.2 % overlap with experts ([arXiv 2506.16345](https://arxiv.org/abs/2506.16345)). The other found 73 to 77 %, against a benchmark built partly from the model's own output ([arXiv 2507.02306](https://arxiv.org/html/2507.02306v1)).
- Verify: every line matching `grep -nEi "users (found|struggle[ds]?|prefer(red|s)?|expect(ed|s)?|abandon(ed|s)?|drop(ped|s)? off|love[ds]?|hate[ds]?)|users will (find|prefer|love|like|enjoy|understand|appreciate|struggle|expect|abandon)"` contains `session|query|run|n=` or starts with `hypothesis:` or `predicted:`. The pattern does not match "users will be" or "users will see", which describe interface behaviour. Heuristic findings carry `severity: [0-4] (predicted)`, and the report header says `single evaluator`.

**UX-VERIFY-29 (MUST).** Put the banner `SIMULATED (synthetic user), hypothesis only, not user evidence` on any output from a synthetic user, a persona prompt or an LLM "user test". Never let such output set a status of validated, tested, passed or approved, and never use it to choose between designs.
- Rationale: NN/g limits synthetic users to desk research, hypotheses and piloting a study guide ([NN/g](https://www.nngroup.com/articles/synthetic-users/), 2024-06-21). In one comparison, more than 50 distinct labels from 604 humans collapsed to about a dozen from 120 synthetic respondents ([NN/g](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/), 2026-10-16; one platform, one topic).
- Verify: every `evidence: simulated` block has the banner. `grep -nEi 'validated|confirmed by users|user-tested'` near such a block returns nothing.

### F. Target and law

**UX-VERIFY-30 (MUST).** Wherever a target is named, name it "WCAG 2.2 Level AA", and use it only to select the test set, never as a claim. Use WCAG 2.1 AA, or 2.0 AA with a 4.1.1 Parsing check, only in a deliverable that the owner documents as bound by ADA Title II or Section 508. Never state a WCAG 3 target.
- Rationale:
  - The 2.2 choice rests on the W3C alone: WCAG 2.2 has been the current Recommendation since 2024-12-12 ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
  - EN 301 549 V4.1.1 (published 2026-09-02) aligns its web, document and software clauses with WCAG 2.2 ([ETSI](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf)). It is not yet cited in the Official Journal: that citation is UNVERIFIED, and the Commission page (updated 2026-11-23) still lists V3.2.1 as the harmonised version ([conformance-targets-law.md §2](ux-verification-claims/conformance-targets-law.md#2-regime-table)). V4.1.1 is therefore no legal basis for 2.2 today.
  - ADA Title II names WCAG 2.1 AA ([FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm), 2026-04-20).
  - Section 508 names WCAG 2.0 ([Access Board](https://www.access-board.gov/ict/), rule of 2017).
  - WCAG 3 is an incomplete Working Draft ([W3C](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/), updated 2026-11-16).
- Verify: `git grep -nEi "wcag ?(2\.[01]|3)[^.]{0,20}(aa|target|required|compliance)"` returns only lines in an owner-documented legal deliverable. Fail example: `grimoire-rs/grimoire/.claude/templates/artifacts/design_spec.template.md:12` ("WCAG 2.1 AA compliance required").

**UX-VERIFY-31 (MUST).** Never draft or publish any of these:
- a conformance claim, an accessibility statement, a VPAT or an ACR;
- a sentence about a legal regime (ADA, Section 508, the EAA, BFSG, EN 301 549).

Never apply WCAG conformance wording to a CLI, a TUI or native VS Code UI. When the owner makes a claim, check it against the five components of WCAG 2.2 §5.3.1 and report the gaps:
1. the date;
2. the guideline title, version and URI;
3. the level;
4. the page scope, including subdomains;
5. the technologies relied upon.
- Rationale: WCAG conformance is "defined only for web pages" ([WCAG 2.2 §5](https://www.w3.org/TR/WCAG22/)). Scope, dates and exemptions depend on facts the agent cannot know, and the ADA Title II dates moved on 2026-04-20 ([conformance-targets-law.md §2](ux-verification-claims/conformance-targets-law.md#2-regime-table)).
- Verify: any hit of `git grep -nEi "conformance statement|accessibility statement|vpat|section 508|european accessibility act|bfsg|en 301 549"` in an agent diff goes to Needs human review. A published claim passes the five-item checklist.

**UX-VERIFY-32 (SHOULD).** Do not add, recommend or configure an accessibility overlay or auto-fix widget. When a request asks for one, put it to the owner (What an agent must ask a human).
- Rationale: conformance rates the page's own content (WCAG §5.2.5 Non-Interference, §5.3), and the FTC order (2025-04-22) treats "an automated product makes you compliant" as a claim that needs evidence. The order binds one vendor, not overlays as such, so this rule is catalog policy, not law. A competent model already avoids overlays, so the rule is SHOULD.
- Verify: `git grep -nEi "accessibe|userway|equalweb|audioeye|accessibility (overlay|widget)" -- package.json src docs` returns only text that warns against them.

### Dropped, with reason

| Candidate | Why dropped |
|---|---|
| The six preempt items (alt text, names, labels, `lang`, contrast; automated-a11y-coverage rule 17) | Authoring belongs to UX-A11Y. The gate's `image-alt`, `link-name`, `button-name`, `label`, `html-has-lang` and `color-contrast` rules check them |
| A ban on `user-scalable=no` (rendered-interaction-matrix RIM-4) | axe `meta-viewport` is in the gate tags and caught the seeded case (W5), and the matrix also checks it |
| Reduced-motion and forced-colours rules (RIM-9, RIM-10) | These are matrix rows 6 and 7 (UX-VERIFY-13). css-theming CSS-A11Y-01 owns the forced-colours mechanism |
| Re-picking screen-reader pairs (RIM-15) | Moved to Decay and to the re-check under UX-VERIFY-18 |
| A per-class recall note in the header (evidence-and-claims UXV-EV-18) | Replaced by the "not decided" line of UX-VERIFY-23 |
| "Run the cheapest class first" (UXV-EV-16) | Merged into UX-VERIFY-01 |
| "Publish an accessibility statement" (conformance-targets-law item 12, CONSIDER) | This is an owner decision, not agent behaviour. Listed under What an agent must ask a human |
| "Give a regime date only with source" (conformance-targets-law item 9) | Folded into UX-VERIFY-31 (no regime sentences at all) and into Decay |
| A ban on "intuitive" and "user-friendly" (evidence-and-claims forbidden list; was in UX-VERIFY-24 until the 2026-11-27 revision) | No source supports the ban (K18). Vague praise in product copy is marketing's territory |

## Applied to the fleet

Evidence is from the dives' measurements (2026-11-27), the grounding audits, and greps re-run read-only for this consolidation on 2026-11-27. The grep commands are given where this file adds evidence.

### Violated

| Rule | Evidence |
|---|---|
| 02 | `ocx-sh/website/tests/e2e/a11y.spec.ts:16` calls `new AxeBuilder({ page }).analyze()` with no tags. The repository has 59 such calls in 47 specs ([ui-code-posture.md](product-audit/ui-code-posture.md), CI table). `git -C ocx-sh/website grep -nE 'withTags\|runOnly' -- tests` returns no line |
| 03 | `git -C ocx-sh/website grep -n incomplete -- tests` returns no line. On grimoire.rs, 1,141 needs-review contrast nodes go unrecorded |
| 06 | `ocx-sh/website/package.json:12` has `"@axe-core/playwright": "^4.13.0"`. `ocx-sh/catalog/scripts/quality-axe.mjs:45-48` loads the copy of axe-core that `@lhci/cli` pulls in |
| 05 | On `ocx-sh/website`, the UX-VERIFY-05 loop printed 5 of 10 component files that declare an open state: `packages/theme/src/components/EcosystemMenu.astro`, `packages/theme/src/components/SiteHeader.astro`, `packages/theme/src/components/ui/Breadcrumbs.astro`, `packages/theme/src/starlight/Header.astro` and `packages/theme/src/starlight/PageFrame.astro` (run 2026-11-27 from the repository root). These are candidates: the match is by basename, so a spec may scan one of them under another name |
| 07 | axe runs only in the deep tier (`ocx-sh/website/.github/workflows/verify-deep.yml:7` cron, `:18` label `run-deep`). `grimoire-rs/grimoire` docs: the only docs check is `grimoire-rs/grimoire/.github/workflows/docs.yml:92` (`task docs:check`), and `git -C grimoire-rs/grimoire grep -nIiE 'axe\|lighthouse\|playwright\|a11y' -- .github/workflows taskfiles` returns no line. `grimoire-rs/grim-gui`: `git -C grimoire-rs/grim-gui grep -nIiwE 'axe\|axe-core\|a11y\|lighthouse' -- src src-tauri .github package.json index.html` returns no line (both run 2026-11-27) |
| 02, 07: defects a blocking gate would stop today | SC 2.5.3 `label-content-name-mismatch`: 49 nodes on 49 of 49 grimoire.rs pages (header search button, `aria-label="Search"`) and 6 nodes on 5 ocx.sh pages. MkDocs indexer: `color-contrast` 158 nodes on 23 pages, `target-size` 30 nodes, and in dark mode `link-in-text-block` 109 nodes ([automated-a11y-coverage.md §3](ux-verification-claims/automated-a11y-coverage.md#3-measured-runs-on-built-output)). The indexer's Lighthouse gate is `minScore: 0.97` (`grimoire-rs/indexer/.lighthouserc.cjs:119`) |
| 14 (`hscroll`, blocking) | The `ocx-sh/index` build (`dist/`, served under `/catalog/`) scrolls horizontally on 11 of its 29 routes. On 10 docs pages that happens at `reflow-320`, `zoom-200` and `zoom-400`: `docs/explanation/architecture/`, `docs/how-to/announce-a-package/`, `docs/how-to/yank-a-version/`, `docs/ops/m1-flip/`, `docs/ops/run-reconcile-dry-run/`, `docs/reference/changelog/`, `docs/reference/entry-schema/`, `docs/reference/governance-contracts/`, `docs/reference/namespace-policy/` and `docs/reference/wire-format/`. The catalog root scrolls at `reflow-320` and `zoom-400`. On `m1-flip` at 320 px, `scrollW` is 484 against `clientW` 320, and an agent-viewed screenshot shows prose and code cut mid-word. The command was `node ui-matrix.mjs http://127.0.0.1:4402 out2.json <29 routes>`, with the appendix script and `python3 -m http.server 4402`, run 2026-11-27 ([followup-q0.md §A, §D](ux-verification-claims/followup-q0.md#a-original-matrix-run-unchanged-appendix-script-no-ancestor-pass)). The 4 ocx.sh site routes do not scroll |
| 09 | `ocx-sh/catalog/scripts/quality-axe.mjs:34` puts `best-practice` in the same tag list and result as the WCAG tags |
| 11 | `grimoire-rs/vscode`: `git -C grimoire-rs/vscode grep -lE axe -- src/test \| wc -l` prints 0, so the 122 goldens in `src/test/fixtures/goldens/` are not scanned by axe. `` git -C grimoire-rs/vscode grep -nIE '`<(button\|input\|a\|img\|select\|label\|div)\b\|html`\|innerHTML' -- 'src/webview/*.ts' ':!*.test.ts' \| wc -l `` prints 271 markup lines with no lint (run 2026-11-27). Example: `grimoire-rs/vscode/src/webview/render.ts:173` (`` html`<button ``). Unstyled, 63 of 122 goldens show violations, an upper bound ([automated-a11y-coverage.md:90](ux-verification-claims/automated-a11y-coverage.md), `node goldens.mjs`) |
| 12 | `ocx-sh/website/eslint.config.js:30` spreads `astro.configs.recommended`, not the a11y config. No fleet repo installs `eslint-plugin-jsx-a11y` |
| 25 | `ocx-sh/website/skills/ocx-theme-quality/SKILL.md:12-13` makes "Lighthouse 100 in performance, accessibility, best practices and SEO" "the bar for every page". `ocx-sh/website/AGENTS.md:37` says the same, and `ocx-sh/ocx/.claude/rules/subsystem-website.md:83` gates on it. The gate is allowed. Calling it the accessibility bar is not: an agent that meets the bar reports the work done |
| 30, 24 | `grimoire-rs/grimoire/.claude/templates/artifacts/design_spec.template.md:12` reads "WCAG 2.1 AA compliance required". That is the wrong version, and the line uses compliance wording (found with `git grep -nIiE "WCAG ?2\.[0-2]"`) |
| Catalog hole | `rules/docs-quality.md:184-186` in this catalog says "Page-level accessibility is governed nowhere here", while Lighthouse accessibility 100 is a fleet gate ([config-inventory.md](product-audit/config-inventory.md), item 10). UX-VERIFY owns page-level accessibility from now on. The edit to docs-quality is not part of this file, so it is on the change list below (New commitments) and is Publication precondition 3. Until it lands, the two catalog rules disagree. No contradiction with css-theming was found: K13 and the forced-colours row defer to CSS-A11Y-01 |

### Unresolved (advisory matrix checks, a human must look)

| Rule | Evidence |
|---|---|
| 14 | ocx.sh `/` has `newClipped` hits on `reflow-320`, `zoom-200` and `zoom-400`, in `section.lp-hero` (`ocx-sh/website/site/src/components/Landing.astro:34`) and `div.ocx-cmdbar__field` (`ocx-sh/website/packages/theme/src/components/ui/CommandBar.astro:141`). Measured with `node ui-matrix.mjs http://127.0.0.1:4399 out.json / /integrations/ /apps/` against `site/dist` served by `python3 -m http.server 4399`, and repeated on the dev server (command at [rendered-interaction-matrix.md:235](ux-verification-claims/rendered-interaction-matrix.md#appendix-commands-and-script), results at :70-74). The dive reports these rows as new clipping only, not as horizontal scroll. On 2026-11-27 an agent viewed the 320 px screenshot (`s7.png`) and labelled the hit false. `section.lp-hero` has `overflow: clip` (`scrollW` 590, `clientW` 320), but its headline, copy and buttons are intact. The command bar has `overflow: auto`, so its `curl` line is cut but scrollable ([followup-q0.md §D](ux-verification-claims/followup-q0.md#d-agent-viewed-evidence-not-human)). That label is not a human's, so the item stays here and is no finding |
| 14 | `ocx-sh/index` catalog root at 320 px: `newClipped` on `div.chip-group` and `span.pkg-keywords` (`scrollW` 345). An agent-viewed screenshot (`s6.png`) shows the filter chips and the view toggle running past the right edge. The page also fails `hscroll` (Violated, row 14). Agent label: true ([followup-q0.md §D](ux-verification-claims/followup-q0.md#d-agent-viewed-evidence-not-human)) |
| 15, 16 | ocx.sh `/`: one desktop `noRing` stop, `button.ocx-cmdbar__trigger`, whose parent draws the ring (K9). At 400 % zoom, 11 `noRing` stops whose screenshots are blank although `elementFromPoint` finds them ([rendered-interaction-matrix.md:82-83](ux-verification-claims/rendered-interaction-matrix.md#3-measurement-on-three-real-pages)). Same command as above. The two-ancestor pass of UX-VERIFY-16 cleared none of these 12 stops, and it did not clear one `pre.astro-code` stop at 400 % zoom on `/catalog/docs/how-to/announce-a-package/`. Together these are the 14 stops left after the pass, in the desktop, zoom and forced rows. Nobody viewed them ([followup-q0.md §B](ux-verification-claims/followup-q0.md#b-ancestor-pass-run-ux-verify-16-implemented-tab-walks-only)) |
| 15 (2.4.11) | `ocx-sh/index` at 320x180 (400 % zoom): the fixed "Contents" button (`button.ocx-ui-button`, `position: fixed`) covers the focused links "M-1 Flip" on `docs/ops/run-reconcile-dry-run/` and "Run a Reconcile Dry Run" on `docs/ops/m1-flip/`. The line-box hit test flags both. An agent-viewed screenshot (`s4.png`) shows the first link's text hidden, and the second was measured from the DOM only. Agent label: true. If a human confirms it, this is the case that 2.4.11 fails: a component "entirely hidden" ([followup-q0.md §C, §D](ux-verification-claims/followup-q0.md#c-why-fullyobscured-fired-isolation-and-a-tested-fix)) |

### Satisfied

| Rule | Evidence |
|---|---|
| 04, 05, 08 | `ocx-sh/catalog/scripts/quality-axe.mjs:3-17` scans both colour schemes, scans the Mod+K palette open on the dialog alone, and has `--red-demo`. It is the fleet's exemplar |
| 05 (policy) | `ocx-sh/website/skills/ocx-theme-quality/SKILL.md` gates table: "axe on each page, with menus and dialogs open, blocks on any violation". The implementation still uses default options (see 02) |
| 10 | `ocx-sh/website/tests/e2e/components-glossary.spec.ts:259-260` gives a reason comment for `disableRules(['landmark-unique'])` |
| 13, 15 | `/integrations/` and `/apps/` pass 10 of 10 rows. All three measured pages have 0 unnamed interactive stops and at most 1 lost stop per lap. Command: `time node ui-matrix.mjs http://127.0.0.1:4399 out.json / /integrations/ /apps/` ([rendered-interaction-matrix.md:235](ux-verification-claims/rendered-interaction-matrix.md#appendix-commands-and-script)); results at rendered-interaction-matrix.md:74-76 and :84. The wave-2 run covered 33 routes: the 4 ocx.sh site routes and the 29 `ocx-sh/index` catalog routes. `unnamed`, `capped` and `lost` fired on none of them ([followup-q0.md §A](ux-verification-claims/followup-q0.md#a-original-matrix-run-unchanged-appendix-script-no-ancestor-pass), 2026-11-27) |
| 13, row 6 | Forced colours passes on all three pages (same command and table). `cd ocx-sh/website && git grep -l forced-colors -- . ':!*.md' \| wc -l` prints 28 files ([ui-code-posture.md](product-audit/ui-code-posture.md), after the CI table) |
| 13, row 7 | `/` runs 22 infinite animations under `no-preference` and 0 under `reduce` (rendered-interaction-matrix.md:74). Tokens zero all durations (`ocx-sh/website/packages/theme/src/tokens.css:353`), so the row blocks for this theme (K13) |
| Gate preempt set | Built dists have 0 `<img>` without `alt` and 0 unnamed buttons or links across ocx.sh, grimoire.rs and devcontainer-features ([ui-code-posture.md §3](product-audit/ui-code-posture.md)) |
| 24 | No "compliant", "conformant" or "fully accessible" sentence on the README and docs surfaces of `ocx-sh/ocx`, `ocx-sh/website`, `grimoire-rs/grimoire`, `grimoire-rs/vscode`, `grimoire-rs/indexer` or `ocx-sh/catalog` (`git grep -nIiE "(wcag\|a11y\|accessib)[^.]{0,40}(compliant\|conform\|passes\|passed)\|fully accessible" -- '*.md' '*.mdx'`). The only hits are the Lighthouse 100 lines listed under 25 |
| 32 | `git grep -lIiE "accessibe\|userway\|equalweb\|audioeye"` returns 0 files in six repositories |
| 28 | The UX-VERIFY-28 outcome pattern returns 0 lines in the `*.md` and `*.mdx` files of the same six repositories, excluding `.agents` and `.claude` (`git -C <repo> grep -nIiE '<UX-VERIFY-28 pattern>' -- '*.md' '*.mdx' ':!.agents' ':!.claude' \| wc -l`, run 2026-11-27) |

### New commitments (the rule binds from now on; no instance has been measured)

| Rule | Commitment |
|---|---|
| 13 to 16 | Ship `checks/ui-matrix.mjs` in the UX review skill (Publication precondition 1). It is the [dive's appendix](ux-verification-claims/rendered-interaction-matrix.md#appendix-commands-and-script) plus the line-box sampling of UX-VERIFY-15 and the ancestor pass of UX-VERIFY-16. It reports the blocking fields, the advisory fields and the `noRingSelf`/`ancestorCleared` fields apart. The follow-up's `ui-matrix-anc3.mjs` is the measured starting point |
| 21 | Ship `wcag22-ids.txt` in the same skill, built by the UX-VERIFY-21 command (Publication precondition 2) |
| Catalog change list | Edit `rules/docs-quality.md:184-186`: replace "Page-level accessibility is governed nowhere here" with a pointer to UX-VERIFY (Publication precondition 3) |
| 02 to 06 | Add one shared fixture to `ocx-sh/website` (`makeAxeBuilder`, five tags, `incomplete` baseline, exact pin), and route the 59 calls through it |
| 07 | Grimoire docs adopts the gate and the matrix, dark scheme only. grim-gui has 74 front-end lines and no interactive element, so the rule binds when its first view with controls lands |
| 18 | No fleet artifact names a screen-reader pair today (topic-map row M009). The UX review skill's template carries the three pairs |
| 20 to 23 | The UX review skill ships a report template with the evidence-class field, the Findings and Needs human review split, the gate-facts block, and a `wcag22-ids.txt` file of 86 IDs |
| 01, 31 | `ocx` and `grim` (CLI, TUI): reports list the gate and the matrix under `did not run:` with the reason "no rendered surface". WCAG wording is never applied to them |

## AI-agent failure modes

The groups are ranked by how often each bites. The ranking rests on the dives' measurements where they exist (cited) and on the topic map's priority otherwise.

**Mechanism 1: over-claiming from a green check.** This is the most frequent group. Topic-map row M011 calls it "the overclaim agents are most likely to make".
1. Writes "accessible", "WCAG AA compliant" or "passes accessibility" after a green axe or Lighthouse run (UX-VERIFY-24, -23).
2. Cites "Lighthouse 100" as evidence, inheriting the fleet's own "the bar" wording (UX-VERIFY-25).
3. Says "responsive" or "works at 400 % zoom" after one resize to 375 px (UX-VERIFY-13, -14).
4. Says "works with screen readers" from an accessibility-tree read (UX-VERIFY-18).
5. Says "meets Core Web Vitals" from a lab Lighthouse run (UX-VERIFY-27).

**Mechanism 2: a misconfigured checker gives a false green.** Measured in the fleet: 59 untagged calls.
6. Copies Playwright's four-tag snippet, or calls `analyze()` bare, and loses `target-size` (UX-VERIFY-02).
7. Asserts only `violations` and never reads `incomplete` (UX-VERIFY-03).
8. Runs axe under jsdom, where `color-contrast` silently does not run (UX-VERIFY-01).
9. Scans only the page-load state, in the light scheme only, and walks `dist/` including fragments (UX-VERIFY-04, -05).
10. Bumps axe with a caret range, so counts move without a baseline change (UX-VERIFY-06).
11. Reads focus from computed `outline` only, or trusts a pixel diff that ignores the ancestor ring (UX-VERIFY-15, -16).

**Mechanism 3: LLM review noise.** Measured: 5 to 7 unsupported findings per run in 5 of 6 runs.
12. Phrases speculative findings ("may be inadequate") as defects (UX-VERIFY-22).
13. Reports one defect under 2 to 3 criteria (UX-VERIFY-21).
14. Guesses contrast from a variable name: "may fail" for `#9d9d9d` on `#1f1f1f`, which is 6.08:1 (UX-VERIFY-20, inferred class).
15. Misses an isolated defect (`<html lang>`, 2 of 3 runs), then writes "none found" (UX-VERIFY-23).
16. Cites a removed or wrong criterion (4.1.1) from pre-2.2 training data. No case occurred in 6 runs, so the whitelist is cheap insurance (UX-VERIFY-21).
27. Reports an advisory matrix hit (`newClipped`, `noRing`, `fullyObscured`) as a confirmed defect, or fails a pull request on one, before a human or a screenshot confirms it (UX-VERIFY-13 to -16). The dive's own runs produced three such false positives before they were fixed. A related failure: the agent labels the firings from its own screenshots, then treats that as the error-rate study that would let a check block. The wave-2 study labelled 7 firings this way and stated that the labels do not count (UX-VERIFY-13).
28. Hit-tests the bounding box of a focused inline link. When the link wraps, the box spans the gap between its lines, so the agent reports a visible link as entirely hidden. This produced 2 of 4 obscured firings on the catalog build (UX-VERIFY-15).

**Mechanism 4: a stale standard or law.**
17. Defaults to "WCAG 2.1 AA", as the Grimoire template does (UX-VERIFY-30).
18. Writes "ADA compliant" or "EAA-ready", or applies WCAG wording to a CLI or a native VS Code UI (UX-VERIFY-31).
19. Suggests an overlay for quick compliance (UX-VERIFY-32).
20. Calls WCAG 3 final, or dates the EAA inconsistently (UX-VERIFY-30, Decay).

**Mechanism 5: invented evidence about people.**
21. Writes "users found X hard" from a screenshot or a code read (UX-VERIFY-28).
22. Treats a synthetic persona's agreement as validation (UX-VERIFY-29).
23. States a heuristic severity as fact from one rater (UX-VERIFY-28).
24. Quotes "automation catches 57 %", or a vendor benchmark, without sample or unit (UX-VERIFY-26).

**Mechanism 6: silencing the gate.** This group is rarer, but each case does the most damage.
25. Adds `disableRules`, `exclude` or a raised baseline to get green (UX-VERIFY-10).
26. Drops a HUMAN criterion from the "not decided" list because "it looks fine" (UX-VERIFY-23).

## What an agent must ask a human

| Decision | Who decides |
|---|---|
| Publishing or changing any conformance claim, accessibility statement, VPAT, ACR, or "compliant" sentence on a page, README, release note or store listing | product owner and legal |
| Which target applies (level, WCAG version), and whether a product is in scope of ADA Title II, Section 508, the EAA or BFSG. The dive's reading that a free developer tool is not named in the EAA scope list is an inference, not a legal opinion | owner and counsel |
| Accepting an exception: disabling a rule, excluding a component, raising a needs-review baseline, or accepting a failing matrix row (for example, the `ScrollStage` pinning on `/`) | design or accessibility owner |
| Clearing a needs-review item (contrast over images or gradients, name versus label) | accessibility owner. The agent lists the item and does not clear it |
| The assistive-technology support baseline the product commits to publicly, who the human testers are, and whether to buy JAWS licences | owner |
| Removing a brand-defining animation or hero to pass reflow or reduced motion | design owner |
| Whether synthetic output is acceptable for a particular decision, and choosing between designs when the only evidence is simulated or heuristic | research or design lead |
| Rating a heuristic finding as release-blocking | design lead |
| Adding an overlay at a customer's request | owner. The default answer under UX-VERIFY-32 is no |
| Quoting a vendor statistic in user-facing copy | marketing owner (cross-territory) |

## Decay

| Rule(s) | Fact that moves | Source and date | Refresh | Re-check |
|---|---|---|---|---|
| 02, 06, 23, 26 | axe-core version, rule count, `target-size` off by default, 21 of 55 criteria with a rule, 8 DETECT | [axe releases](https://github.com/dequelabs/axe-core/releases): 4.14.1 on 2026-11-16, 4.14.0 on 2026-10-05, 4.13.0 on 2026-08-05 | each axe bump (about every two months) | `gh api 'repos/dequelabs/axe-core/releases?per_page=3' --jq '.[].tag_name'`, then rerun `node rules.mjs` (automated-a11y-coverage §1.1) |
| 02 | Playwright's example tag list and `emulateMedia` options | [Playwright](https://playwright.dev/docs/accessibility-testing); the page shows no date; fetched 2026-11-27 (example still four tags); 1.65 latest listed | publish time, then each Playwright minor | the UX-VERIFY-02 `curl ... \| grep -oE 'wcag2[0-9a-z]*'` command |
| 25 | Lighthouse weighting and excluded audits; the bundled axe version | [scoring page](https://developer.chrome.com/docs/lighthouse/accessibility/scoring), source updated 2023-08-03; Lighthouse 13.6.0 bundles axe-core 4.14.0 (measured) | each Lighthouse major | `npm ls axe-core` in a Lighthouse install, and the scoring page |
| 18 | Screen-reader pair shares | [WebAIM survey 11](https://webaim.org/projects/screenreadersurvey11/), Jul-Aug 2026 | when a new survey appears (about every 2 to 3 years); check yearly | `curl -s https://webaim.org/projects/ \| grep -o 'screenreadersurvey[0-9]*' \| sort -u` |
| 21, 30 | WCAG 2.2 criterion list (86 IDs); WCAG 3 status | [wcag.json](https://www.w3.org/WAI/WCAG22/wcag.json), fetched 2026-11-27; [WCAG 3 intro](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/), updated 2026-11-16 | yearly | rebuild `wcag22-ids.txt` from `wcag.json`, and read the WCAG 3 status line |
| 30, 31 | ADA Title II compliance dates (2027-04-26, 2028-04-26) | [FR 2026-07663](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm), 2026-04-20; comment period closed 2026-06-22 | 2026-12-31, then quarterly until 2027-04-26 | govinfo search for DOJ Title II web-rule amendments |
| 30 | EN 301 549 V4.1.1 Official Journal citation under Directive 2019/882 | UNVERIFIED (conformance-targets-law §3, failed route) | 2026-12-31 | Commission [harmonisation page](https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation) and an EUR-Lex search for the implementing decision |
| 30 | Section 508 still at WCAG 2.0 | [Access Board](https://www.access-board.gov/ict/), rule of 2017 | yearly (next 2027-06-01) | search the Access Board for an ICT refresh proposal |
| 31 | EAA scope (applies from 2025-06-28) and BFSG | [Directive](https://publications.europa.eu/resource/celex/32019L0882), 2019; [BFSG § 1](https://www.gesetze-im-internet.de/bfsg/__1.html) | yearly | national guidance updates |
| 24, 32 (32 is SHOULD) | FTC order against accessiBe | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million), 2025-04-22 | yearly | FTC press search for "accessibility" orders |
| 27 | Core Web Vitals thresholds | [web.dev](https://web.dev/articles/vitals), page last updated 2024-10-31; re-fetched 2026-11-27, thresholds unchanged | publish time, then yearly | the UX-VERIFY-27 `curl` command; a new "Last updated" date means read the thresholds again |
| 13 to 16 | Which matrix checks may block; firing rates; the ancestor-pass and line-box results | K17. Study partly done 2026-11-27 on 33 routes, 4 ocx.sh site and 29 `ocx-sh/index` catalog ([followup-q0.md](ux-verification-claims/followup-q0.md)), with Chrome for Testing 159.0.8154.6 and `playwright-core` 1.63.0. Firing rates: `newClipped` on 6 % of routes; `noRing` on 9 % before the ancestor pass and 6 % after it (25 stops before, 11 cleared, 14 left); `fullyObscured` on 12 % (6 stops). An agent labelled 7 firings, 3 true and 4 false. No human labelled any | when a human labels the firings (UX-VERIFY-13), and whenever the script, the theme or the Chromium major version changes | `node sum-anc.mjs` in the follow-up's directory prints `noRing stops before ancestor pass 25 cleared by ancestor 11 remaining 14 ... fullyObscured stops 6 routes 4` (re-run 2026-11-27). A mismatch on a re-run against the same build means this row is stale. Revise UX-VERIFY-13 to -15 from the human-labelled counts |
| 28, 29 | NN/g guidance on heuristics and synthetic users | 2023-06-25, 2024-06-21, 2026-10-16 | yearly | NN/g article dates |
| Applied tables | Fleet counts and matrix verdicts | measured 2026-11-27 | each theme release | rerun the commands in each dive's measurement section |

## Open questions

**Deserves another research round** (as questions):
- **Spoken output.** Can a scripted screen-reader driver run in CI with NVDA on Windows and VoiceOver on macOS, and give a reproducible check of live-region announcements, dialog names and the Pagefind search dialog? If so, what may an agent claim from it? UX-STATE asks for this harness for its loading and error states ([ux-interface-states.md](ux-interface-states.md), Open questions).
- **Matrix residuals.** The human-agreement rate is a documented gap (Verdict 1). It needs a human, not more research. Two questions can still be researched without one:
  - Why does the two-ancestor pass miss the command-bar ring on `/`, and why are 11 outlined stops blank at 400 % zoom? The study is a debug run that logs the outline of each of the nearest five ancestors and whether `:focus-visible` still matches after the script's blur and refocus.
  - Do the firing rates hold on a Starlight docs build and on the MkDocs indexer? Neither build existed on the machine on 2026-11-27.
- **Real webviews.** Can the extension's webviews be scanned with real VS Code theme variables and the `vscode-*` web components (through `@vscode/test-web` or a webview harness)? Which of the 347 unstyled golden nodes survive?
- **Cross-engine.** Do the matrix verdicts and Tab-walk order hold in WebKit and Firefox under Playwright? No source fetched in this round covers browser differences.
- **Performance without field data.** What may the gate say about the fleet's lab budgets (`tests/budgets.mjs`) for sites too small to have CrUX data? Which in-test measure stands in for INP? UX-STATE asks the same question for webviews.

**Needs an owner decision:**
- Move the five-tag axe gate and the matrix into the PR tier of `ocx-sh/website`. This costs about 13 s per touched page. It replaces nothing: Lighthouse stays.
- Reword "the bar" in `ocx-theme-quality/SKILL.md:12-13` and `AGENTS.md:37`, so that axe plus the matrix are named as the accessibility gate.
- Give Grimoire's docs site an accessibility gate. Today it has none.
- Pick the public assistive-technology support baseline, and name the human testers.
- Decide whether to publish an accessibility statement per site, naming known gaps and a contact route (conformance-targets-law item 12).
- Get counsel to confirm the reading that the fleet is probably outside EAA scope.
- Replace the line "WCAG 2.1 AA compliance required" in Grimoire's design-spec template.
- Name a human who labels the matrix firings in `matrix-labels.csv` (UX-VERIFY-13). Then set the false-positive share at which a heuristic check may block. No source sets one.
- Fix or accept the horizontal scroll on the 11 `ocx-sh/index` routes (Applied, Violated row 14) before the matrix blocks pull requests there.

**Needs a human look, not research:**
- ocx.sh `/` at 320x180 with Tab: 11 stops are blank in screenshots.
- The desktop command-bar focus ring (K9).
- The fixed "Contents" button over focused links at 400 % zoom on two `ocx-sh/index` docs pages (Applied, Unresolved row 15).
- The 14 `noRing` stops that the ancestor pass did not clear.

**Cross-territory, named and left:** statistics, "accessible" claims and vague praise such as "intuitive" or "user-friendly" in landing and README copy belong to marketing's claim policy. The docs-quality hole at `rules/docs-quality.md:184-186` is on this file's change list (Publication precondition 3).

## Sub-artifacts

- [ux-verification-claims/automated-a11y-coverage.md](ux-verification-claims/automated-a11y-coverage.md): the 55-row table of what axe-core 4.14.1 decides, measured gate runs on three fleet builds in both schemes, Lighthouse versus axe, lint layers, and which coverage figures may be quoted.
- [ux-verification-claims/rendered-interaction-matrix.md](ux-verification-claims/rendered-interaction-matrix.md): the 10-row rendered matrix and its full script, measured on three ocx.sh pages; the CI versus review split; screen-reader pairs from WebAIM survey 11; the claims ladder.
- [ux-verification-claims/evidence-and-claims.md](ux-verification-claims/evidence-and-claims.md): evidence classes, the forbidden-phrase list, the findings and needs-review report shape, a seeded measurement (20 defects, axe against an LLM code-read), heuristic and synthetic-user limits, and lab versus field performance.
- [ux-verification-claims/followup-q0.md](ux-verification-claims/followup-q0.md): the wave-2 matrix error-rate study, answered partly. It has firing rates on 33 routes, the implemented ancestor pass, the cause of and the fix for the false `fullyObscured` firings, and 7 agent-labelled firings. No human labels exist.
- [ux-verification-claims/conformance-targets-law.md](ux-verification-claims/conformance-targets-law.md): the target string, a regime table (ADA Title II, EAA and BFSG, EN 301 549, Section 508), a measured EN 301 549 V3.2.1 against V4.1.1 diff, conformance-claim components, and the overlay policy.

## Key sources

| URL | What | Date |
|---|---|---|
| https://www.w3.org/TR/WCAG22/ | WCAG 2.2 Recommendation: criteria, 4.1.1 removed, §5.3 claim components | 2024-12-12 |
| https://www.w3.org/WAI/WCAG22/wcag.json | Machine-readable criteria; source of the ID whitelist | fetched 2026-11-27 |
| https://www.w3.org/TR/wcag-em-2/ | WCAG-EM 2: sampling, report contents, claim limits | 2026-07-23 |
| https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md | axe rules, tags, default-off WCAG 2.2 rules | fetched 2026-11-27 |
| https://github.com/dequelabs/axe-core/releases | Why counts move between versions | 4.14.1 on 2026-11-16 |
| https://playwright.dev/docs/accessibility-testing | Playwright axe integration, current-state warning, four-tag example | no date on page; fetched 2026-11-27 |
| https://developer.chrome.com/docs/lighthouse/accessibility/scoring | What the Lighthouse score is and excludes | source updated 2023-08-03 |
| https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | 320 CSS px equals 400 % zoom | updated 2026-10-04 |
| https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | "Entirely hidden" definition for 2.4.11 | updated 2026-06-15 |
| https://webaim.org/projects/screenreadersurvey11/ | Current screen-reader and browser shares | Jul-Aug 2026 |
| https://webaim.org/projects/million/ | "Absence of detected errors" caveat; six error categories | February 2026 |
| https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million | FTC order on automated-compliance claims | 2025-04-22 |
| https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm | ADA Title II interim final rule, current dates | 2026-04-20 |
| https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf | EN 301 549 V4.1.1, aligned with WCAG 2.2 | 2026-09 |
| https://www.nngroup.com/articles/synthetic-users/ | Allowed and forbidden uses of synthetic users | 2024-06-21 |
| https://web.dev/articles/vitals | Core Web Vitals thresholds, field versus lab | updated 2024-10-31; re-fetched 2026-11-27 |
| https://make.wordpress.org/docs/style-guide/word-list/a/ | A style guide that recommends "intuitive"; evidence that no ban source was found | modified 2026-10-14 |

## Revision log

2026-11-27, after an adversarial check. No rule was renumbered or retired, and no new rule ID was added.

- UX-VERIFY-13, -14, -15 (with Verdict 1, K17, Decay, Open questions): the heuristic matrix checks (`newClipped`, `noRing`, `fullyObscured`) are now advisory and go to Needs human review. The objective checks (`hscroll`, viewport meta, scheme and forced-colours checks, `unnamed`, `capped`, `lost`) still block. Why: the matrix error rate is unmeasured, the clipped-text check first counted `.sr-only` as clipped, 11 blank stops at 400 % zoom are unresolved, and the one desktop focus failure is a probable false positive (K9).
- UX-VERIFY-13 to -16, -21 (with a new Publication preconditions block, Verdict 11 and New commitments): the matrix script and `wcag22-ids.txt` are publication preconditions in the UX review skill. Until the script ships, the Verify lines of -13 to -16 are review only. -21 now gives the command that builds the ID list. Why: the script existed only as a dive appendix without the -16 ancestor pass, so an agent could not run it from the rule.
- UX-VERIFY-20, -22 (with the new report field labels): the Verify lines are now runnable shell commands over named report sections. The hedge grep in -22 excludes the `quote:` field and code spans. The eight Needs human review fields have labels, and the pass example uses them. Why: "a script checks the eight field labels" named no script, and verbatim quotes required by -21 made the hedge grep false-positive.
- UX-VERIFY-24, -28 (with Verdict 6, K18, the Dropped table and Cross-territory): -24 now covers accessibility and conformance claims only, with the USWDS skill quote added to its rationale. The user-outcome forms moved to -28, where "users will" matches only before an outcome verb, so "users will be prompted" passes. "Intuitive" and "user-friendly" are dropped. Why: the cited sources cover conformance claims only, and no source for the word ban was found on 2026-11-27.
- UX-VERIFY-01: the rationale now leads with the measured jsdom result. It labels arXiv 2503.15885 suggestive and states its QualWeb non-improvement (0.105 to 0.112) and its equal-weight metric. Why: the old rationale cited only the favourable half of a small, mixed study.
- UX-VERIFY-30 (with Verdict 7 and K12): the 2.2 choice now rests on the W3C Recommendation alone. The rationale says that EN 301 549 V4.1.1 is not yet cited in the Official Journal, and that the Commission page still lists V3.2.1. Why: the dive marks that citation UNVERIFIED.
- UX-VERIFY-02, -27 (with Decay and Key sources): fetch dates are recorded (Playwright page has no date, fetched 2026-11-27; web.dev last updated 2024-10-31, re-fetched 2026-11-27 with thresholds unchanged). Each rule now has a re-check command, tested on 2026-11-27, to run at publish time. Why: "undated" is not a date, and two-year-old thresholds need a recorded re-check.
- UX-VERIFY-04, -05: Verify lines are now commands with pass and fail. -04 diffs the page list against the sitemap. -05 maps open-state components to specs. Why: a glob grep and a "review heuristic" did not separate pass from fail. The -05 loop was run on `ocx-sh/website` and found 5 candidates (new Applied row 05).
- UX-VERIFY-19: each of the four rows now has a grep pattern for the added diff lines, and "step markers" is defined. Why: two rows had no pattern.
- UX-VERIFY-32: demoted from MUST to SHOULD. Why: it is catalog policy, not law, backed by an order against one vendor, and a competent model already avoids overlays.
- UX-VERIFY-10: restated as a pointer to the owner-approval gate in What an agent must ask a human. Why: the owner approval is the non-obvious part.
- Applied to the fleet: rows 07, 11, 13/15, 13 row 6 and 13 row 7 now carry file:line or the exact command with its result, re-run read-only on 2026-11-27. Row 14 moved to a new Unresolved table with source paths (`Landing.astro:34`, `CommandBar.astro:141`), because its rule is now advisory. A new row 28 records a 0-line outcome-claim grep. Why: these rows had globs, selectors or table names without a path or command.
- K11, K13, Applied row 13 row 7: the `T:` and `G:` prefixes are expanded to full repository paths (`ocx-sh/website/packages/theme/src/`, `grimoire-rs/grimoire/docs/`). Why: the ruleset never defined them.
- Catalog consistency (Catalog hole row, Publication precondition 3, New commitments): the `rules/docs-quality.md:184-186` cross-reference is on this file's change list. Until it lands, docs-quality and UX-VERIFY disagree. No contradiction with css-theming was found.
- AI-agent failure modes: added item 27 (treating an advisory matrix hit as a defect).

2026-11-27, wave 2, folding in [followup-q0.md](ux-verification-claims/followup-q0.md) (matrix error rate, answered partly). No rule was renumbered, retired, promoted or demoted, and no new rule ID was added.

- UX-VERIFY-15: the hit-test text changed in place. Each `getClientRects()` line box now gets 9 sample points, and sampling the bounding box of a wrapping inline element is banned. The Needs human review item names the covering element. The Verify line gained a script regression check on four `ocx-sh/index` routes. Why: the follow-up isolated the cause of 2 of 4 false `fullyObscured` firings (bounding-box points landed between the line boxes), and the line-box version removed both while keeping both true firings. The check stays advisory.
- UX-VERIFY-16: the rationale now records the measured pass (25 stops, 11 cleared, 14 left) and says the pass is necessary but not sufficient. The Verify line now names the `noRingSelf`, `ancestorCleared` and `noRing` fields and gives a tested `node -e` check: `violations 0` on the ancestor-pass reports, `violations 99` on the appendix reports. Why: the old Verify line ("no `noRing` entry exists without the ancestor pass") could not be checked from the JSON report.
- UX-VERIFY-13 (with K17 and Verdict 1): the promotion condition is now concrete. A human labels every firing on at least 20 routes in `matrix-labels.csv`, agent labels excluded, and the owner sets the false-positive share. Two `awk` checks were added. `newClipped`, `noRing` and `fullyObscured` stay advisory. Why: the follow-up produced only agent labels (3 true, 4 false, interval 10 % to 82 %). The follow-up proposed a separate CONSIDER rule (its "UX-VERIFY-33"), but it was folded into -13 instead of taking a new ID, because it only defines the promotion condition that -13 already names.
- Verdict 1 and 10, K9: the human error rate moved from Open questions into Verdict 1 as a documented gap. The gap names what is missing (a human labeller) and records the firing rates. Verdict 10 and K9 now say that the two-ancestor pass did not clear the command-bar stop on `/` or the 11 blank stops at 400 % zoom.
- Publication precondition 1 and New commitments 13 to 16: the shipped script must carry the line-box sampling and the UX-VERIFY-16 fields. `ui-matrix-anc3.mjs` is named as the measured draft.
- Applied to the fleet: a new Violated row 14 records `hscroll` on 11 of 29 `ocx-sh/index` routes (an objective check, so it blocks). Unresolved rows 14 and 15/16 carry the agent labels and the post-pass counts. A new Unresolved row records the fixed "Contents" button that covers focused links at 400 % zoom (2.4.11, agent label only). Satisfied row 13/15 now covers 0 `unnamed`/`capped`/`lost` on 33 routes.
- Decay, row 13 to 16: the dated study facts, the browser and Playwright versions, and a re-check command.
- Open questions: "Matrix error rate" was replaced by "Matrix residuals": the ancestor-miss debug run and a second site type. Owner decisions gained a human labeller and threshold, and the `ocx-sh/index` horizontal scroll. The human-look list gained the "Contents" button and the 14 post-pass stops.
- AI-agent failure modes: item 27 extended (an agent treats its own labels as the error-rate study), and item 28 added (bounding-box hit test on a wrapped link).
- Frontmatter and Sub-artifacts: `followup-q0.md` added.

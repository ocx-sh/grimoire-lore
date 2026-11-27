---
title: UX topic map — accessibility as an engineering contract (landscape scout)
program: product (sub-program ux)
worker: ux-accessibility scout
date_researched: 2026-11-27
model: sonnet
sources_fetched: 62
---

# Accessibility as an engineering contract: landscape scout

Scope: discover the questions an agent must be expert in, not answer them. Fetch budget notes: the shared web-search quota ran out mid-run, and the fetch safety check rate-limited four domains (link.springer.com, www.ada.gov, europa.eu, inclusive-components.design). Anything resting on a search snippet or a vendor blog is marked UNVERIFIED in the text. Measurements were taken from shallow clones under `~/.cache/research-lang/exemplars/product/ux-accessibility/` (axe-core 4.14.1 at commit 32d9bd5, 2026-11-23; w3c/wcag at 2026-11-16; eslint-plugin-jsx-a11y 6.10.2; astro at 2026-11-26).

## Headline findings

1. WCAG 2.2 has 55 criteria at levels A and AA (31 A, 24 AA), after 4.1.1 Parsing was removed and six were added; the two new A and four new AA criteria are listed below. Measured with `grep -o 'conformance-level">[A]*'` over `w3c/wcag/guidelines/sc/{20,21,22}/*.html`.
2. The share of criteria a tool can detect is small and depends on the counting unit. By criteria: axe-core 4.14.1 has an enabled rule tagged to 21 of the 55 A/AA criteria (38%), 22 (40%) if the off-by-default `target-size` rule is counted, and the W3C ACT rule set (37 atomic rules) maps to 19 of the 55. By issue volume: Deque reports 57.38% of audited issues were found by axe-core rules. A rule existing for a criterion does not mean the criterion is verified: `image-alt` checks that alt exists, not that it is right.
3. A 2025 peer-reviewed study (Springer, Universal Access in the Information Society) is reported by search snippet to say tools cover about one sixth of success criteria. UNVERIFIED: the page was not opened.
4. Legal clocks moved: the US Title II web rule dates moved a year in April 2026, the EAA has applied since 28 June 2025, and EN 301 549 V4.1.1 (WCAG 2.2) appeared on the ETSI server in September 2026.
5. Real-world failure is concentrated: 95.9% of one million home pages had detected failures in WebAIM's February 2026 run, and contrast, alt text, labels, empty links and empty buttons dominate. These are the cheap, automatable failures.

## Success criteria map, A and AA (WCAG 2.2)

Automation column: A = at least one enabled axe-core rule is tagged to the criterion (rule checks a necessary condition only); P = no enabled axe rule but a W3C ACT rule exists or a rule is off by default; H = needs a human. Source for levels and "new": [W3C new-in-22](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) and the criterion files in [w3c/wcag](https://github.com/w3c/wcag). Measured with the node script over `axe-core/lib/rules/*.json` (read `tags`, `enabled`) and `wcag/guidelines/act-mapping.json`.

| SC | Name | Level | New in 2.2 | Automation |
|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | | A (presence only) |
| 1.2.1 / 1.2.3 | Audio-only, video-only; audio description or alternative | A | | H |
| 1.2.2 | Captions (Prerecorded) | A | | A (track present only) |
| 1.2.4 / 1.2.5 | Captions (Live); Audio Description | AA | | H |
| 1.3.1 | Info and Relationships | A | | A (structure only) |
| 1.3.2 / 1.3.3 | Meaningful Sequence; Sensory Characteristics | A | | H |
| 1.3.4 | Orientation | AA | | A (CSS lock rule) |
| 1.3.5 | Identify Input Purpose | AA | | A (`autocomplete-valid`) |
| 1.4.1 | Use of Color | A | | A (inline links only) |
| 1.4.2 | Audio Control | A | | A |
| 1.4.3 | Contrast (Minimum) | AA | | A (many incomplete results) |
| 1.4.4 | Resize Text | AA | | A (`meta-viewport` only) |
| 1.4.5 | Images of Text | AA | | P |
| 1.4.10 | Reflow | AA | | P |
| 1.4.11 | Non-text Contrast | AA | | H |
| 1.4.12 | Text Spacing | AA | | A (inline styles only) |
| 1.4.13 | Content on Hover or Focus | AA | | H |
| 2.1.1 | Keyboard | A | | A (scroll regions only) |
| 2.1.2 / 2.1.4 | No Keyboard Trap; Character Key Shortcuts | A | | H |
| 2.2.1 / 2.2.2 | Timing Adjustable; Pause, Stop, Hide | A | | A (meta-refresh, blink, marquee) |
| 2.3.1 | Three Flashes | A | | H |
| 2.4.1 | Bypass Blocks | A | | A |
| 2.4.2 | Page Titled | A | | A |
| 2.4.3 | Focus Order | A | | H |
| 2.4.4 | Link Purpose (In Context) | A | | A (name exists only) |
| 2.4.5 / 2.4.6 | Multiple Ways; Headings and Labels | AA | | H |
| 2.4.7 | Focus Visible | AA | | P |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | yes | H |
| 2.5.1 / 2.5.2 / 2.5.4 | Pointer Gestures; Pointer Cancellation; Motion Actuation | A | | H |
| 2.5.3 | Label in Name | A | | A |
| 2.5.7 | Dragging Movements | AA | yes | H |
| 2.5.8 | Target Size (Minimum) | AA | yes | P (`target-size`, disabled by default) |
| 3.1.1 / 3.1.2 | Language of Page; Language of Parts | A / AA | | A |
| 3.2.1 / 3.2.2 | On Focus; On Input | A | | H |
| 3.2.3 / 3.2.4 | Consistent Navigation; Consistent Identification | AA | | H |
| 3.2.6 | Consistent Help | A | yes | H |
| 3.3.1 / 3.3.3 / 3.3.4 | Error Identification; Error Suggestion; Error Prevention | A / AA | | H |
| 3.3.2 | Labels or Instructions | A | | A (labels exist only) |
| 3.3.7 | Redundant Entry | A | yes | H |
| 3.3.8 | Accessible Authentication (Minimum) | AA | yes | H |
| 4.1.2 | Name, Role, Value | A | | A (strongest coverage) |
| 4.1.3 | Status Messages | AA | | H |

Removed in 2.2: 4.1.1 Parsing ([W3C](https://www.w3.org/TR/WCAG22/), Recommendation 12 December 2024). Axe still carries `duplicate-id` tagged `wcag2a-obsolete`.

## Measurements

| What | Command | Result |
|---|---|---|
| Rule files in axe-core | `ls lib/rules/*.json \| wc -l` in axe-core clone | 105 (9 disabled, 5 deprecated) |
| Rules tagged `best-practice` | node script over `tags` | 30 |
| Rules tagged `wcag22aa` | same | 1 (`target-size`, `enabled: false`) |
| Rules with `EN-301-549` tag | same | 69 |
| A/AA criteria with an enabled axe rule | same, regex `^wcag\d{3,4}$` over rules tagged wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa | 21 of 55 |
| ACT atomic rules, non-deprecated | node over `guidelines/act-mapping.json` | 37; map to 19 distinct A/AA criteria (24 including AAA) |
| jsx-a11y rule files | `ls src/rules \| grep -v __ \| wc -l` | 39 |
| Astro dev-toolbar a11y audit rules | `grep -ho "code: '[a-z-]*'"` on `audit/rules/a11y.ts` | 24 (the dev toolbar audit is runtime-only, in the browser, not a CI gate) |
| Astro tool coverage of 2.2 criteria | read of the rule codes | none of the 24 names target-size, focus-not-obscured, dragging, redundant-entry or authentication |

## APG keyboard contract per pattern

Source for every row: the pattern page under https://www.w3.org/WAI/ARIA/apg/patterns/ (30 patterns listed at [the index](https://www.w3.org/WAI/ARIA/apg/patterns/), fetched 2026-11-27, pages carry no per-pattern date). Patterns with no keyboard script beyond native behaviour: Alert, Breadcrumb, Landmarks, Link, Meter, Table, Feed (not opened), Button (Enter/Space, not opened), Spinbutton and Slider (Multi-Thumb) (not opened; follow the slider arrows). "Check" is what a Playwright test asserts.

| Pattern | Keys (required unless marked optional) | Check |
|---|---|---|
| [Dialog (modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Focus moves inside on open; Tab and Shift+Tab cycle inside and wrap; Escape closes | open, Tab past last stop wraps, Escape closes, focus on opener |
| [Alert and message dialog](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) | Same as modal dialog | as dialog |
| [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Tab enters active tab, next Tab goes to panel; Left/Right (Up/Down if vertical) move and wrap; Space/Enter activate if not automatic; Home/End optional; Delete optional | arrow moves focus, panel `aria-selected` follows rule |
| [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | Down opens popup and enters it; Escape closes; Enter accepts; Alt+Down/Up optional; in listbox popup Down/Up move, Enter accepts, Escape returns focus to the combobox; editing keys must not be blocked | type, Down, Enter, assert value; Escape returns focus |
| [Menu and menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) | Enter opens submenu or activates; Down/Up/Left/Right per orientation; Escape closes and returns focus to opener; Tab leaves and closes all; Home/End when no wrap; Space and type-ahead optional | Escape returns focus to trigger |
| [Menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) | Enter and Space open and focus first item; Down optional same; Up optional focuses last | Enter focuses first item |
| [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | Down/Up; Home/End optional; type-ahead recommended; Space toggles selection (multi); Shift+Down/Up, Shift+Space, Ctrl+Shift+Home/End, Ctrl+A optional | focus on selected option at entry |
| [Tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) | Right opens or enters child; Left closes or goes to parent; Down/Up; Home/End; Enter activates; Space selects; type-ahead recommended; `*` optional | Right/Left expand and collapse |
| [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) | Enter/Space toggle header; Tab moves through all focusables | Enter toggles `aria-expanded` |
| [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | Enter and Space toggle | native `<details>` preferred |
| [Radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) | Tab enters at checked (else first); Space checks; Right/Down next and check, wrap; Left/Up previous | arrow checks and moves |
| [Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) | Space toggles | native input |
| [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) | Space toggles; Enter optional | Space flips `aria-checked` |
| [Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) | Right/Up increase, Left/Down decrease one step; Home/End; PageUp/PageDown optional | arrow changes `aria-valuenow` |
| [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | Tab enters at first enabled control; Left/Right move, wrap optional; Home/End optional | single tab stop |
| [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) | Escape dismisses; focus stays on trigger | Escape hides without moving focus |
| [Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) | Arrows move one cell and stop at edges; PageUp/Down; Home/End; Ctrl+Home/End; Enter or F2 enters cell widget, Escape returns; selection keys Ctrl+Space, Shift+Space, Ctrl+A | arrows then F2/Escape |
| [Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) | Tab order only; rotation control is first stop; auto-rotation stops on any focus and resumes only on user action | rotation stops on focus |
| [Window splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) | Arrows move splitter; Enter collapses or restores; Home/End and F6 optional | arrow changes `aria-valuenow` |

## Candidate topics

Priority is for this project shape: Astro and MkDocs sites, a Vite GUI, two CLIs, READMEs and release notes, agents writing without a human.

| # | topic (question) | why it matters | source | covered? | priority | could a rule or skill check it, and how |
|---|---|---|---|---|---|---|
| 1 | Which of the 55 A/AA criteria can a CI gate actually verify, and which must the agent report as "needs human review"? | Agents otherwise claim "WCAG AA compliant" from a green axe run that touches 21 of 55 criteria | [axe rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md), [W3C ACT](https://www.w3.org/WAI/standards-guidelines/act/rules/) | no | high | Yes: ban the phrase "compliant" in output unless paired with the human-review list; grep PR text and report templates |
| 2 | What is the right axe run configuration: which tags, which rules off, what to do with `incomplete`? | `runOnly` with `wcag2a` alone skips AA; 2.2's `target-size` is off by default; `incomplete` is silently ignored by `expect(violations).toEqual([])` | [axe API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md), [Playwright docs](https://playwright.dev/docs/accessibility-testing) | no | high | Yes: grep test config for `withTags([...])` containing `wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa`; assert `incomplete` is logged |
| 3 | Is the "57%" or the "20 to 30%" or the "one sixth" figure the right planning number? | Decides how much manual testing a rule demands; the figures measure different units | [Deque report](https://www.deque.com/automated-accessibility-coverage-report/), [GDS tool test 2017](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/) | no | medium | Reading heuristic: require a rule to state which unit (criteria, issues, barriers) any coverage claim uses |
| 4 | Does the Lighthouse accessibility score of 100 mean anything? | Score is a weighted pass/fail average of axe audits, manual audits excluded; teams treat 100 as done | [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) | no | medium | Yes: rule forbids a score as a gate on its own; check CI config for score threshold without axe `violations` assertion |
| 5 | Which WCAG 2.2 criteria does an agent routinely miss because no lint covers them (2.4.11, 2.5.7, 2.5.8, 3.3.7, 3.3.8, 3.2.6)? | New in 2.2 and zero Astro audit coverage; sticky headers, drag-only UI and paste-blocked login are common | [new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), Astro rules measured above | no | high | Partly: grep for `scroll-padding` beside `position: sticky`; grep `onpaste` preventDefault; enable axe `target-size` |
| 6 | When does `position: sticky` or `fixed` chrome break focus visibility, and what is the CSS fix? | Docs sites with sticky headers fail 2.4.11 unless `scroll-padding-top` is set | [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | no | high | Yes: stylesheet grep for sticky/fixed header without `scroll-padding` |
| 7 | What is the minimum pointer target and spacing exception, and how does it apply to dense developer UIs (icon toolbars, table row actions)? | 24 by 24 CSS px with five exceptions; dense GUIs breach it | [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | no | medium | Yes: axe `target-size` in the browser test; static check on icon-button CSS sizes |
| 8 | Is a multi-box one-time-code input or a paste-blocked login field a WCAG failure? | Fails 3.3.8 unless an alternative exists; common in device-flow and token UIs | [Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) | no | medium | Yes: grep for `paste` handlers that call `preventDefault`, `autocomplete="off"` on password and OTP fields |
| 9 | Which APG widget patterns must never be hand-built where a native element exists (dialog, details, select, tabs)? | "No ARIA is better than bad ARIA"; a role promises keyboard behaviour the author must supply | [APG read-me-first](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), [ARIA in HTML](https://www.w3.org/TR/html-aria/) | no | high | Yes: lint `role="button"` on div, `role="dialog"` where `<dialog>` is available; jsx-a11y `prefer-tag-over-role`, `no-static-element-interactions` |
| 10 | What is the exact keyboard contract per APG pattern, and which ones does the fleet GUI use (dialog, tabs, combobox, menu, tree, listbox)? | Agents ship the roles without Arrow, Home, End, Escape and focus return | [dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) | no | high | Yes: a keyboard test per pattern in Playwright (press keys, assert `document.activeElement`); table of keys as the checklist |
| 11 | Dialog focus rules: initial focus target, trap, Escape, focus return, `aria-modal` | APG: focus least destructive action for irreversible dialogs; return focus to opener | [APG dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | no | high | Yes: Playwright test opens, tabs, presses Escape, asserts focus is back on the trigger |
| 12 | Tabs: automatic or manual activation, and when is a tab widget wrong (page navigation, long content)? | APG limits automatic activation to no-latency panels; Inclusive Components argues for headings in many cases | [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [Inclusive Components](https://inclusive-components.design/) | no | medium | Reading heuristic plus key test |
| 13 | What do the ARIA-in-HTML conformance rules forbid that agents write anyway (`<button role=heading>`, redundant roles, `role=link aria-disabled`)? | Conformance checkers flag them; AT behaviour is undefined | [ARIA in HTML, Rec 2026-08-11](https://www.w3.org/TR/html-aria/) | no | medium | Yes: jsx-a11y `no-redundant-roles`, `no-interactive-element-to-noninteractive-role`; Astro `a11y-no-redundant-roles` |
| 14 | Do the lint layers cover the fleet's file types: `.astro`, `.tsx` in grim-gui, Markdown/MkDocs templates? | jsx-a11y reads JSX only; eslint-plugin-astro adds `astro/jsx-a11y/*` extension rules but needs ESLint 10 and a new Node; MkDocs has no lint | [eslint-plugin-astro](https://github.com/ota-meshi/eslint-plugin-astro), [jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | no | high | Yes: check each repo's eslint config for the right preset; for MkDocs run axe against the built HTML |
| 15 | Which jsx-a11y rules are disabled in recommended (`label-has-for`, `anchor-ambiguous-text`, `control-has-associated-label`) and should a rule turn them on? | 3 of 39 rules are off in both presets; two catch real failures | [jsx-a11y README](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | no | low | Yes: config grep |
| 16 | What is the screen-reader test matrix for a developer-tool site: which AT and browser pairs and how often? | GOV.UK lists JAWS, NVDA, VoiceOver iOS, TalkBack, magnifier, Dragon; WebAIM shows JAWS 40.5% and NVDA 37.7% primary; the GOV.UK page dates from 2022 | [GOV.UK](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies), [WebAIM survey 10](https://webaim.org/projects/screenreadersurvey10/) | no | medium | Reading heuristic: release checklist names pairs and a date; a skill cannot run AT itself |
| 17 | How does an agent announce state changes (4.1.3): `role=status`, `alert`, `aria-live`, when not to? | Over-use of assertive regions is a listed failure; install progress, copy-to-clipboard and toast UIs all need it | [Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | no | high | Partly: grep `aria-live="assertive"` and `role="alert"` for review; test that a status node exists in DOM before update |
| 18 | Does a copy button, toggle or theme switch expose its state (`aria-pressed`, label change) without moving focus? | Docs sites ship copy buttons and theme toggles; wrong pattern gives double announce or none | [Inclusive Components](https://inclusive-components.design/), [APG](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | no | medium | Yes: component test asserts accessible name and pressed state |
| 19 | Does the CLI honour `NO_COLOR`, `TERM=dumb`, non-TTY and `--no-color`, and in which order? | NO_COLOR: any non-empty value; empty string does not count; config and flags may override; bold and underline are not covered | [no-color.org (updated 2026-11-25)](https://no-color.org/), [clig.dev](https://clig.dev/) | partial (stream contracts exist in language sets; colour rules not confirmed) | high | Yes: run the binary with `NO_COLOR=1`, `TERM=dumb`, piped stdout and assert no `\x1b[` bytes |
| 20 | When is a spinner or progress bar harmful to screen readers, and what replaces it? | GitHub CLI replaced braille-redraw spinners with static text ("Working...") because screen readers read the redraws | [GitHub blog, 2025-05-02](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/), [clig.dev](https://clig.dev/) | no | high | Yes: with non-TTY or an accessibility env var, assert no carriage-return or cursor-move escapes in output; ship an opt-out env var |
| 21 | Is colour the only carrier of status in CLI and GUI output (red/green pass/fail, diff colours)? | 1.4.1 failure; terminals also ignore the background, so contrast is not under your control | [Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [GitHub blog](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/) | no | high | Yes: strip ANSI from sample output and assert each status still carries a word or symbol |
| 22 | Which palette does a CLI emit: 16 ANSI colours the user can theme, or fixed 256/truecolour? | GitHub aligned to the 4-bit palette so users control contrast through the terminal | [GitHub blog](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/) | no | medium | Yes: grep escape codes `38;5;` and `38;2;` in source |
| 23 | Does WCAG apply to a CLI at all, and which criteria drop out for non-web software? | WCAG2ICT Note (2025-12-11) covers text and terminal apps; Section 508 and EN 301 549 treat 2.4.1, 2.4.5, 3.2.3, 3.2.4 as not applying to non-web software; EN 301 549 also excludes 2.4.2, 3.1.2 | [WCAG2ICT 2.2](https://www.w3.org/TR/wcag2ict-22/) | no | medium | Reading heuristic: rule lists the applicable subset for CLI |
| 24 | What does the ADA Title II web rule require, from when, and does it reach a vendor selling to US public bodies? | Interim final rule (2026-04-20) moved dates to 2027-04-26 (population 50,000 or more) and 2028-04-26 (smaller); WCAG 2.1 AA unchanged; a customer's procurement clause is the real pressure | [Federal Register text via govinfo](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm) | no | medium | Reading heuristic: dated fact in the reference file with a refresh date |
| 25 | Does the European Accessibility Act reach an open-source dev tool or a SaaS, and who is exempt? | Applies from 2025-06-28 to listed consumer products and services; the microenterprise exemption covers services, not products (UNVERIFIED, from adviser blogs); a developer-only tool is likely outside consumer scope | [Commission EAA page](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en), [Taylor Wessing](https://www.taylorwessing.com/en/interface/2025/accessibility/key-eu-accessibility-act-exemptions-and-the-challenges-they-pose) | no | medium | No: a legal-scope question; the rule can only point to counsel and cite the Directive text |
| 26 | Which EN 301 549 version is the compliance target, V3.2.1 (WCAG 2.1) or V4.1.1 (WCAG 2.2)? | V4.1.1 files appear on the ETSI server on 2026-09-02, whether it is cited in the Official Journal is UNVERIFIED | [ETSI listing](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/) | no | medium | Reading heuristic: target WCAG 2.2 AA, which satisfies both |
| 27 | Does Section 508 need an update to WCAG 2.2? | Section 508 refresh (final rule 2017-01-18, in force 2018-01-18) cites WCAG 2.0; US contracts therefore still say 2.0 or 2.1 | [section508.gov](https://www.section508.gov/manage/laws-and-policies/) | no | low | Reading heuristic |
| 28 | Is WCAG 3 something to build against today? | W3C says it will not supersede WCAG 2 and recommends meeting 2.2; still a working draft (page updated 2026-11-16) | [WCAG 3 intro](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/) | no | low | Yes: rule states "target WCAG 2.2 AA" so no agent chases drafts |
| 29 | Accessibility of the artifact itself: is the generated landing page, README, release note, and chart accessible (heading order, alt text, link text, captions, contrast)? | Marketing output is also an interface; WebAIM 2026: 95.9% of home pages fail, top failures low contrast 83.9%, missing alt 53.1%, empty links 46.3% | [WebAIM Million 2026](https://webaim.org/projects/million/) | partial (docs-quality covers plain English and structure; CSS theming covers contrast mechanics) | high | Yes: axe on built pages; markdown lint for `![](` without alt and "click here" link text; check video has captions |
| 30 | Does ARIA presence correlate with worse pages, and what does an agent do about it? | Pages with ARIA averaged 59.1 detected errors vs 42 without (correlation, not proven cause) | [WebAIM Million 2026](https://webaim.org/projects/million/) | no | medium | Yes: count `aria-*` and `role=` additions in a diff and require justification when the native element exists |
| 31 | Dark mode and theme tokens: do both themes pass 4.5:1 text and 3:1 non-text contrast? | Boundary with css-theming: theming mechanics are covered, the contrast pass-fail on each theme is not confirmed | [css-theming rule](rules/css-theming.md), [axe `color-contrast`](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) | partial | medium | Yes: run axe in both `prefers-color-scheme` states; axe cannot see 1.4.11 so add a token-pair script |
| 32 | How fast does this guidance decay: axe rule set, APG patterns, laws, AT market share? | axe-core 4.14.1 on 2026-11-23, Lighthouse links axe 4.11, GOV.UK AT table dated 2022, WebAIM survey 10 dates from 2023-24 | [axe-core releases](https://github.com/dequelabs/axe-core/releases), [GOV.UK AT page, last updated 2022-05-24](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies), [WebAIM survey 10](https://webaim.org/projects/screenreadersurvey10/), axe version from the clone measurement above (`git -C axe-core log -1 --format=%cs` gave 2026-11-23) | no | medium | Yes: reference file carries a refresh date per fact; script compares `axe-core` version in lockfile to the version a rule names |
| 33 | Does an automated suite give false assurance on iframes, shadow DOM and dynamic states? | axe options: iframes true by default, `frameWaitTime` 60 s default, cross-origin needs `allowedOrigins`; scans see only the loaded state | [axe API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) | no | medium | Yes: test scans each modal, menu and error state, not only page load |
| 34 | What must a "needs review" report contain so a human can do the manual 34 of 55 criteria? | The agent cannot run a screen reader; it can emit a precise human checklist | [GOV.UK AT combinations](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies), [WCAG2ICT 2.2](https://www.w3.org/TR/wcag2ict-22/) | no | high | Yes: skill emits checklist per changed component; reviewer verifies it exists |

## Dated facts

| Fact | Source | Date the source states |
|---|---|---|
| WCAG 2.2 is a W3C Recommendation | [W3C](https://www.w3.org/TR/WCAG22/) | 12 December 2024 |
| WCAG 2.2 adds 9 criteria: 2.4.11 AA, 2.4.12 AAA, 2.4.13 AAA, 2.5.7 AA, 2.5.8 AA, 3.2.6 A, 3.3.7 A, 3.3.8 AA, 3.3.9 AAA; removes 4.1.1 | [W3C new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) | undated page |
| 2.5.8 minimum target is 24 by 24 CSS px, five exceptions | [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | undated |
| WCAG 3 will not supersede WCAG 2; draft; September 2026 drafts | [W3C](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/) | page updated 16 November 2026 |
| WCAG2ICT Group Note for 2.0, 2.1, 2.2 and non-web software | [W3C](https://www.w3.org/TR/wcag2ict-22/) | 11 December 2025 |
| ARIA in HTML is a Recommendation | [W3C](https://www.w3.org/TR/html-aria/) | 11 August 2026 |
| APG has 30 patterns and targets ARIA 1.2, with no per-pattern date on the page | [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) | undated (copyright 2026) |
| ADA Title II web rule: dates 2027-04-26 (population 50,000 or more) and 2028-04-26 (smaller entities and special districts); technical standard WCAG 2.1 AA; effective immediately; comments to 2026-06-22 | [govinfo FR 2026-04-20](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm) | 20 April 2026 |
| Section 508 refresh: final rule 2017-01-18, effective 2018-01-18, WCAG 2.0 | [section508.gov](https://www.section508.gov/manage/laws-and-policies/) | undated |
| EAA transposition deadline was June 2022; the page lists covered products and services but not the application date | [Commission](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en) | undated |
| EAA applies from 28 June 2025, transition to 2030 for products in use | adviser blogs only; UNVERIFIED against Directive (EU) 2019/882 (the EUR-Lex fetches returned no text) | 2025 |
| EN 301 549 versions on ETSI server: V3.2.1 (2021-03), V4.1.0 (2025-11, 2026-06), V4.1.1 folder timestamp 2026-09-02 (a server modification date, not a printed publication date) | [ETSI](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/) | as listed |
| axe-core 4.14.1; 105 rule files; 1 WCAG 2.2 rule off by default | clone, commit 32d9bd5 | 2026-11-23 |
| Lighthouse score: weighted (3, 7, 10) pass/fail audits; manual audits excluded; page cites axe-core 4.11 | [Chrome docs](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) | undated |
| Deque: 13,000 plus pages, 294,958 issues, 57.38% found automatically, 16 of 50 WCAG 2.1 AA criteria produced automated issues; contrast 30.08% of all issues; vendor data | [Deque](https://www.deque.com/automated-accessibility-coverage-report/) | undated (copyright 2026) |
| GDS 2017 tool test: best tool 41% of 143 barriers, all tools combined 71%, 29% found by none | [GDS blog](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/) | 24 February 2017 |
| WebAIM Million: 95.9% of 1,000,000 home pages with failures; 56.1 errors per page; contrast 83.9%, alt 53.1%, labels 51%, empty links 46.3%, empty buttons 30.6%, missing language 13.5%; ARIA on 82.7% | [WebAIM](https://webaim.org/projects/million/) | tested February 2026, updated 30 March 2026 |
| WebAIM screen reader survey 10: JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7% primary desktop; iOS 70.6% primary mobile; n = 1,539 | [WebAIM](https://webaim.org/projects/screenreadersurvey10/) | December 2023 to January 2024 |
| GOV.UK page first published 2017-10-26, combinations list updated 2020-09-21, page updated 2022-05-24; the page gives no usage percentages. Minimum AT combinations (with browser): JAWS 2019+ with Chrome/Edge, NVDA with Chrome/Firefox/Edge, VoiceOver iOS with Safari, TalkBack with Chrome, magnifier, Dragon 15+ with Chrome; Firefox with JAWS/NVDA/Dragon is a priority extra. Earlier row: JAWS 2019 or later, NVDA, VoiceOver iOS, TalkBack, magnifier, Dragon 15 or later | [GOV.UK](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) | last updated 24 May 2022 |
| NO_COLOR: respect when set and non-empty; any value; does not govern bold or underline; ripgrep 12.0.0, npm 5.8.0, Python 3.13 honour it | [no-color.org](https://no-color.org/) | page updated 2026-11-25 |
| clig.dev: disable colour when not a TTY, NO_COLOR set, TERM=dumb or `--no-color`; no animation when stdout is not a TTY | [clig.dev](https://clig.dev/) | undated |
| GitHub CLI replaced spinner with static progress text, new prompter on charmbracelet/huh, 4-bit palette; `gh a11y`, v2.72.0 public preview | [GitHub blog](https://github.blog/engineering/user-experience/building-a-more-accessible-github-cli/) | 2 May 2025 (updated 12 May 2025) |
| eslint-plugin-jsx-a11y: 39 rules, 6.10.2; eslint-plugin-astro `astro/jsx-a11y/*` needs ESLint 10 or above | clone; [eslint-plugin-astro](https://github.com/ota-meshi/eslint-plugin-astro) | last commit 2026-01-03 (jsx-a11y) |
| Springer study: 550 Swedish public-sector pages, tools cover one sixth of 78 WCAG 2.1 criteria | [Springer](https://link.springer.com/article/10.1007/s10209-025-01263-x) | 18 September 2025 |
| Inclusive Components tabbed interfaces article | [Inclusive Components](https://inclusive-components.design/tabbed-interfaces/) | 5 October 2017 |
| Inclusive Components articles date from 2017 and 2018 (latest: Cards, 4 June 2018) | [Inclusive Components](https://inclusive-components.design/) | 2017 to 2018 |

## Contested

| Question | Position A | Position B |
|---|---|---|
| How much can automation detect? | 57.38% of issues found in first audits (Deque, a vendor selling axe tooling): [Deque](https://www.deque.com/automated-accessibility-coverage-report/) | About 20 to 30% of criteria is the older expert claim, and a 2025 academic study of Swedish public sites reports one sixth (about 17%) of 78 WCAG 2.1 criteria covered by the tools; at least one engine reported a violation for about 30%; 31 criteria (44.8%) covered by no engine; 550 Swedish public-sector landing pages; published 2025-09-18 (opened and read this repair pass; tool versions date from 2021 to 2024): [Springer](https://link.springer.com/article/10.1007/s10209-025-01263-x). Deque states the units differ. |
| Do tabs need automatic activation? | APG allows automatic activation only without noticeable latency and treats manual as safe: [APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | Inclusive Components argues tab widgets are often the wrong pattern versus headings and sections (article opened in repair pass, published 2017-10-05: tabs are wrong for simple sections, site navigation and SPA views; accordions suit many or unknown tab counts; it describes only the arrow-key automatic model): [tabbed interfaces](https://inclusive-components.design/tabbed-interfaces/): [Inclusive Components](https://inclusive-components.design/) |
| Is ARIA beneficial? | APG and ARIA in HTML supply patterns and tables to use it correctly: [APG](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) | WebAIM: pages with ARIA had 59.1 detected errors vs 42 without; the report itself cautions the correlation is not causation: [WebAIM](https://webaim.org/projects/million/) |
| Should ADA Title II obligations be treated as delayed? | DOJ says no new obligations, delay only, and anticipates enforcing the new dates: [govinfo](https://www.govinfo.gov/content/pkg/FR-2026-04-20/html/2026-07663.htm) | Law-firm commentary notes the underlying nondiscrimination duty persists and the rule may still be modified or challenged (search result summaries, UNVERIFIED) |
| Which EN 301 549 version is the legal harmonised target? | Adviser blogs: V3.2.1 (WCAG 2.1) is the harmonised reference | Other advisers: V4.1.1 (WCAG 2.2) will replace it once cited; the ETSI listing shows V4.1.1 exists, Official Journal citation not verified |
| Is the Lighthouse accessibility score a quality signal? | It is a weighted average of axe audits: [Chrome docs](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) | Manual audits and best-practice audits are excluded, so 100 only reflects what axe can test (consistent with Deque's 16 of 50 criteria) |

## What is not covered by this scout

Not opened: the Springer paper beyond its first 100,000 characters, all Inclusive Components articles except tabbed interfaces, the EAA Directive text (EUR-Lex fetch returned no text), ada.gov, Deque's screen-reader guidance (domain safety check rate-limited, one retry also failed; web search budget exhausted). Not surveyed: Windows High Contrast and forced-colours handling, PDF accessibility (PDF/UA), accessible video (captions, transcripts, audio description) for the marketing sub-program, reduced-motion handling, and mobile accessibility (Android and iOS) beyond the AT survey. These are candidate rounds if the map selects accessibility topics for a dive.

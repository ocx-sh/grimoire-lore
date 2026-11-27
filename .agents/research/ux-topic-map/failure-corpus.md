---
title: UX failure corpus - landscape scout
program: product (ux sub-program)
worker: scout / ux-failure-corpus
date_researched: 2026-11-27
model: sonnet
sources_fetched: 53
---

# UX failure corpus: what goes wrong, how often, what it cost

Scope: the failure side of interface work. Method: fetch the primary page where it opened, otherwise a dated law-firm or press summary, and say which. A claim marked (secondary) was not confirmed on the primary page. Nothing here is from memory.

## Ranking of failure classes

Frequency = how often it appears in measured samples. Cost = fines, settlements, lawsuits, lost revenue, harm.

| Rank | Failure class | Frequency evidence | Cost evidence |
|---|---|---|---|
| 1 | Low-contrast text | 83.9% of 1,000,000 home pages, Feb 2026 ([WebAIM](https://webaim.org/projects/million/)) | Detected-failure class behind most ADA web suits (suit counts below) |
| 2 | Unlabelled controls (form inputs 51.0%, empty links 46.3%, empty buttons 30.6%) and missing alt text (53.1%) | same WebAIM page | same |
| 3 | Hard-to-cancel flows, hidden subscriptions, asymmetric accept/decline | Hall of Shame entries dated through Jun 2026 ([deceptive.design](https://www.deceptive.design/hall-of-shame)) | Amazon $2.5B (Sep 2025), Chegg $7.5M, Uber and LA Fitness pending ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-secures-historic-25-billion-settlement-against-amazon), [Goodwin](https://www.goodwinlaw.com/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life)) |
| 4 | Consent banners where refusal is harder than acceptance, or refusal is ignored | repeated CNIL decisions 2025 | Google EUR 325M, Shein EUR 150M, Conde Nast EUR 750k ([CNIL](https://www.cnil.fr/en/cookies-and-advertisements-inserted-between-emails-google-fined-325-million-euros-cnil), [Lewis Silkin](https://www.lewissilkin.com/insights/2025/09/19/when-the-cookie-crumbles-lessons-from-the-cnil-102l64c)) |
| 5 | Checkout friction: surprise costs, forced account, long flow, errors | Baymard: 59% of desktop checkouts rate "mediocre" or worse; 70.22% mean cart abandonment ([Baymard checkout](https://baymard.com/blog/current-state-of-checkout-ux), [Baymard abandonment](https://baymard.com/lists/cart-abandonment-rate)) | 40% of abandoners cite extra costs; 17% site errors; 17% checkout too long |
| 6 | Dangerous-action design: destructive or live action next to a safe one, weak confirmation, no undo | Case evidence only (Hawaii 2018) | Statewide false missile alert, 38 minutes to retract ([Wikipedia, secondary](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert)) |
| 7 | Third-party widgets and libraries that add errors | WebAIM: ReCAPTCHA +7.7 errors, YouTube embed +9.4, ads strongest harbinger | none quantified |
| 8 | AI-generated UI: inaccessible custom controls, ARIA misuse, sameness | Mixed evidence, see AI section | Not measured |

## Findings by source

### Regulation and enforcement

- FTC Click-to-Cancel: the Eighth Circuit vacated the 2024 amendments in July 2025 on procedural grounds (no preliminary regulatory analysis). The FTC sent an ANPRM to OIRA on 30 Jan 2026, announced it on 11 Mar 2026, comments closed 13 Apr 2026 ([Gibson Dunn](https://gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/), [Jones Day, May 2026](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses)). I found no NPRM or final rule after May 2026; the status as of today is unconfirmed past that date.
- Enforcement did not pause: it runs on ROSCA and FTC Act section 5, and the NextMed complaint pleads the vacated rule's three requirements (disclose material terms, express informed consent, easy cancellation) as section 5 violations (Jones Day above).
- Amazon Prime settlement, 25 Sep 2025: $1B civil penalty plus $1.5B refunds to about 35 million consumers; alleged "No, I don't want Free Shipping" decline button and a convoluted cancel path ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-secures-historic-25-billion-settlement-against-amazon)).
- Uber One: filed 21 Apr 2025, amended 15 Dec 2025, alleges 28 million enrolled without consent; the complaint cites up to 23 screens and 32 actions to cancel (Goodwin above; Fortune summary via search, secondary).
- EU DSA article 25: first DSA fine, X EUR 120M, reported December 2025; the Commission found the blue-check design deceptive and misleading ([Tech Policy Press](https://techpolicy.press/what-the-eus-x-decision-reveals-about-how-the-dsa-is-enforced)). Earlier claims here of TikTok preliminary findings (6 Feb 2026) and Shein proceedings (17 Feb 2026) were removed: re-checking found no primary or fetchable source, and a Wikipedia summary ([Digital Services Act](https://en.wikipedia.org/wiki/Digital_Services_Act)) gives a TikTok preliminary finding dated 6 Nov 2026 about its recommender system, so the dates conflict. Treat both as unverified. The article text itself I could not retrieve (EUR-Lex fetch returned a stub).
- EU Digital Fairness Act proposal unveiled 11 Nov 2026: dark-pattern ban, easier cancellation, free-trial reminders, fines up to 6% of global turnover under a revised CPC regulation; not yet law ([Euronews](https://www.euronews.com/2026/11/11/eu-targets-subscription-traps-addictive-design-and-hidden-fees-with-new-digital-rules)). The "ten blacklisted practices" figure comes from a leak; do not use it.
- CPPA Enforcement Advisory 2024-02: judges dark patterns by effect, requires symmetry in choice ([CPPA PDF](https://www.cppa.ca.gov/pdf/enfadvisory202402.pdf), unreadable to my fetcher; content from [Carlton Fields](https://www.carltonfields.com/insights/publications/california-privacy-protection-agency-issues-dark-pattern-enforcement-advisory), secondary).
- ADA Title II web rule: WCAG 2.1 AA; an interim final rule of 20 Apr 2026 moved dates; the fact sheet states 26 Apr 2027 (population 50,000+) and 26 Apr 2028 (smaller) ([ADA.gov](https://www.ada.gov/resources/2024-03-08-web-rule/)). This binds US state and local government, so it matters to adopters selling to them.
- EU Accessibility Act: enforcement started 28 Jun 2025; microenterprise exemption (under 10 staff, turnover or balance sheet up to EUR 2M) covers services only, not products; EN 301 549 v3.2.1 is the cited version (WCAG 2.1 AA); v4.1.1 (WCAG 2.2 AA) was published 2 Sep 2026 and is expected to be cited in the Official Journal in Nov 2026, whereupon it becomes the presumed standard ([Level Access](https://www.levelaccess.com/blog/european-accessibility-act/), vendor page, undated, secondary; confirm in the Official Journal; no primary EUR-Lex text retrieved).
- FTC v accessiBe: final order 22 Apr 2025, $1M; bars claiming an automated product makes any site WCAG compliant without evidence, and bars disguised endorsements ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million)).

### Accessibility measurement and litigation

- WebAIM Million 2026 (data Feb 2026): 95.9% of home pages have detected WCAG 2 failures (94.8% in 2025); 56.1 errors per page (51 in 2025); six categories cover 96% of errors; ARIA present on 82.7% of pages and pages with ARIA average 59.1 errors versus 42 without; Astro averages 9.0 errors per page, Next.js 40.9, React 43.5, Vue 64.6; 17.1% have a skip link ([WebAIM](https://webaim.org/projects/million/)). Automated checks only: a page with zero detected errors may still be inaccessible.
- UsableNet 2025 year-end: 5,114 ADA digital lawsuits (1 Jan to 15 Dec 2025); 62% federal, 38% NY and CA state; 64% against companies under $25M revenue; about 28% against sites already using an accessibility widget (my arithmetic on the report's 1,416); eCommerce 70% ([UsableNet](https://info.usablenet.com/2025-year-end-digital-accessibility-lawsuit-report-plain-text)). A Seyfarth count of 8,667 federal filings in 2025 from the earlier draft could not be re-fetched (adatitleiii.com returned 403) and is dropped as unverified.

### Checkout and forms (Baymard)

- Cart abandonment: 70.22% mean over 50 studies; reasons: extra costs 40%, slow delivery 20%, distrust 19%, forced account 18%, long checkout 17%, errors 17%, cannot see total 12% ([Baymard](https://baymard.com/lists/cart-abandonment-rate), updated 28 Oct 2026).
- Checkout benchmark: 59% desktop and 59% mobile mediocre or worse; 15% of desktop poor or very poor; 2% desktop good ([Baymard](https://baymard.com/blog/current-state-of-checkout-ux), updated 3 Nov 2026).
- Inline validation: 31% of sites have none; common mistakes are validating too early, not clearing errors, no positive confirmation ([Baymard](https://baymard.com/blog/inline-form-validation), 9 Jan 2024; old).

### Postmortems

- Hawaii false alert (13 Jan 2018): live and test options sat in one dropdown among unrelated alert types; drill status was spoken, not in the interface; confirmation screen was clicked through; no quick retract so the correction took 38 minutes; fix added a cancel command and two-person send ([Wikipedia, secondary; the FCC report is the primary and I did not open it](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert)).
- Citibank/Revlon: the Second Circuit reversed on 8 Sep 2022; about $900M of Citibank's own money was paid to lenders by mistake ([Torys](https://www.torys.com/en/our-latest-thinking/publications/2022/09/revlon-erroneous-payment-decision-reversed-on-appeal)). The commonly told interface cause (confusing checkboxes in the loan software) was NOT confirmed by any source I opened; treat as unverified.
- Software postmortems naming UI as cause beyond these: I found none verified. Therac-25 and CrowdStrike searches returned mechanism, not interface, material.

### AI-generated interfaces

- Suh et al., arXiv 2503.15885 (March 2025): GPT-4o and Qwen2.5-Coder regenerating real UI files: contrast is about 80% of AChecker violations; LLMs beat humans on alt text and form labels but add ARIA errors (frames, graphics); few-shot accessibility prompts made things worse than naive generation (0.449 vs 0.347 inaccessibility rate); an accessibility-checker feedback loop gave the best result (0.292) ([arXiv](https://arxiv.org/html/2503.15885v1)). Two models, ten projects: small, and models are two generations old.
- PACE (ASSETS 2026) and CHI EA 2026 semantic-accessibility work exist but I did not open them (search summary, secondary).
- Missing loading, error and empty states: no benchmark found that scores them. Only practitioner advice ([O'Reilly Radar](https://www.oreilly.com/radar/?p=19843), unopened).
- Generic layout ("purple gradient, Inter, three-card grid"): practitioner blogs only, no controlled study found. GIGAZINE reports 3.8% of sites with emoji nav icons from a design-slop study, methodology unconfirmed.
- Vendor-sponsored claim "all 15 AI-built sites failed" (AudioEye via VentureBeat) is a seller's claim; not used.

### Review objections in public threads

Guidance posts name the clickable div as the recurring objection: clickable div as button (no focus, no Enter/Space, no role) is the recurring objection, with lint rules `click-events-have-key-events` as the check.

Measured this pass: the newest 300 inline review comments on each of six large front-end repos (primer/react, mui/material-ui, shadcn-ui/ui, adobe/react-spectrum, carbon-design-system/carbon, grafana/grafana), fetched with `for p in 1 2 3; do gh api "repos/$r/pulls/comments?sort=created&direction=desc&per_page=100&page=$p" --jq '.[]|{c:.created_at,b:.body}'; done`, then classified with case-insensitive regexes in Python (one comment can match several classes; keywords, not reading). Window: roughly 1 to 8 weeks per repo ending 2026-11-27 (shadcn-ui/ui reaches back to 2025-11-17). Comments matching keyboard/focus/tab/Enter/Escape: react-spectrum 44, carbon 29, grafana 4, material-ui 52, primer 56, shadcn 5 (190 of 1,800, 10.6%). Matching aria-/role/accessible name/screen reader: 9, 16, 2, 11, 24, 7 (69). Matching loading/empty state/error state/skeleton/spinner/fallback: 5, 7, 26, 8, 12, 20 (78). Matching overflow/truncate/ellipsis/responsive/mobile/wrap: 12, 32, 14, 16, 33, 12 (119). Matching reduced-motion/animation/transition: 3, 3, 2, 5, 7, 0 (20). Reading: keyboard and focus is the largest accessibility objection in component libraries; state and overflow handling each outrank motion; design-token words dominate grafana and material-ui (73, 107) but that class is broad. These are keyword counts on recent comments of component-library repos, not a rate of defects, and not representative of application code.

### Fleet measurement (read-only)

Commands run from `/home/mherwig/dev`, excluding node_modules, target, dist, .git, worktrees.

| Check | Command (pattern) | Result |
|---|---|---|
| clickable div or span in component files | `grep -rEl --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.svelte' --include='*.astro' '<(div\|span)[^>]*onClick' grimoire-rs ocx-sh <excludes> \| wc -l` | 0 files |
| `outline: none` or `0` in styles | `grep -rE --include='*.css' --include='*.scss' --include='*.astro' 'outline:[ ]*(none\|0)' ocx-sh grimoire-rs <excludes> \| wc -l` | 58 lines (not checked whether each has a focus-visible replacement) |
| files using `:focus-visible` | same includes, `':focus-visible'`, `grep -rlE ... \| wc -l` | 103 files |
| files with motion (`@keyframes` or `transition:`) | `grep -rlE ... '@keyframes\|transition:' ... \| wc -l` | 151 files |
| files honouring `prefers-reduced-motion` | `grep -rlE ... 'prefers-reduced-motion' ... \| wc -l` | 38 files |

Reading: motion in 151 files against reduced-motion in 38 is a visible gap; the 58 `outline: none` lines need a per-line check. These are file counts, not a rate of failing pages.

## Candidate topics

Columns: topic | why it matters | source | covered? | priority | check.

| # | Topic (question) | Why it matters | Source | Covered | Priority | Could a rule or skill check it, and how |
|---|---|---|---|---|---|---|
| 1 | What are the three or four contrast checks and thresholds an agent must run on every colour pair, and for text over images and in both themes? | 83.9% of home pages fail; top-ranked failure | [WebAIM](https://webaim.org/projects/million/) | partial (css-theming covers tokens, not ratios) | high | Yes: compute ratio from token values in CI; 4.5:1 text, 3:1 large text and UI parts; script over both theme maps |
| 2 | Which controls ship without an accessible name (inputs, icon buttons, links)? | 51.0%, 30.6%, 46.3% of pages | [WebAIM Million](https://webaim.org/projects/million/) | no | high | Yes: axe-core or eslint-plugin-jsx-a11y in CI; grep for `<button>` with no text or aria-label |
| 3 | When is a clickable non-button element acceptable (almost never) and what is the replacement? | Top review objection; no focus or keys | [guidance](https://gomakethings.com/just-use-a-button/) | no | high | Yes: lint `click-events-have-key-events`, `no-static-element-interactions` |
| 4 | When does ARIA make a page worse, and what is the no-ARIA-first rule? | Pages with ARIA: 59.1 errors vs 42 without; 22% ARIA menus broken | [WebAIM Million](https://webaim.org/projects/million/) | no | high | Partial: lint plus axe; rule is "native element first, ARIA only for a named gap" |
| 5 | What must a destructive or irreversible action require (confirmation naming the object, undo window, two-person)? | Hawaii alert, 38 minutes to retract | [Wikipedia](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert) | no | high | Partial: reading heuristic; a test that the destructive path has a confirm naming the target and an undo or cancel path |
| 6 | How must live and test modes be shown so they cannot be mistaken (persistent mode banner, not spoken or colour-only)? | Hawaii: drill status was not in the interface | [Wikipedia: 2018 Hawaii alert](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert) | no | medium | Partial: check a mode indicator is present in the DOM on every screen of the dangerous flow |
| 7 | Must cancelling be as easy as signing up, and what counts as parity (screens, clicks, channel)? | Amazon $2.5B, Uber 23 screens | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-secures-historic-25-billion-settlement-against-amazon) | no | high (any team with billing) | Yes: count steps cancel vs signup in an e2e script; fail if cancel > signup |
| 8 | What is the legal status of click-to-cancel today, and which duties survive vacatur (ROSCA, section 5, state laws)? | Rule vacated, rulemaking restarted, enforcement continues | [Gibson Dunn](https://gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/) | no | high | No (dated fact); pin in a reference file with refresh date |
| 9 | Must decline and accept buttons be symmetric in prominence, wording and steps (consent, upsell)? | CNIL, CPPA, FTC "No, I don't want free shipping" | [CNIL](https://www.cnil.fr/en/cookies-and-advertisements-inserted-between-emails-google-fined-325-million-euros-cnil) | no | high | Partial: compare computed size and contrast of the two buttons; click count to refuse vs accept |
| 10 | Does "Refuse all" actually stop the trackers (withdrawal and refusal honoured)? | Shein EUR 150M, Conde Nast EUR 750k, cookies still set after refusal | [Lewis Silkin](https://www.lewissilkin.com/insights/2025/09/19/when-the-cookie-crumbles-lessons-from-the-cnil-102l64c) | no | medium | Yes: headless run, click refuse, assert no tracking cookies or requests |
| 11 | What does DSA article 25 and the DFA proposal forbid for interface design, and who is in scope? | First DSA fine X EUR 120M; DFA proposed 11 Nov 2026 | [Euronews](https://www.euronews.com/2026/11/11/eu-targets-subscription-traps-addictive-design-and-hidden-fees-with-new-digital-rules) | no | medium | No; pin dated facts, note proposal vs law |
| 12 | Which dark patterns of the 18 named are checkable in code (preselected boxes, countdown timers, hidden costs, fake stock)? | Common vocabulary for review | [deceptive.design](https://www.deceptive.design/types) | no | high | Partial: grep for pre-checked inputs, hard-coded countdowns, "only N left" strings |
| 13 | Is price shown in full before the last step (fees, tax, shipping)? | 40% abandon for extra costs; 12% cannot see total | [Baymard](https://baymard.com/lists/cart-abandonment-rate) | no | medium | Partial: e2e compares first displayed price with final charge |
| 14 | Should checkout allow guest purchase and how long may it be? | 18% forced account; 17% too long | [Baymard abandonment](https://baymard.com/lists/cart-abandonment-rate), [Baymard form fields](https://baymard.com/blog/checkout-flow-average-form-fields) | no | medium | Yes: e2e step count and presence of guest path |
| 15 | What inline-validation timing prevents premature errors and stale messages? | 31% of sites lack it; common mistakes listed | [Baymard](https://baymard.com/blog/inline-form-validation) | no | medium | Yes: component test: error clears on fix, no error on first focus |
| 16 | Must every state (loading, empty, error, partial, offline) exist for each data view? | Not benchmarked for AI code; practitioner consensus | [O'Reilly](https://www.oreilly.com/radar/?p=19843) | no | high | Yes: story or test per state; fail a view with no error branch on its fetch |
| 17 | How does an accessibility-checker feedback loop change agent output versus prompt instructions? | Few-shot instructions made output worse; loop best | [arXiv](https://arxiv.org/html/2503.15885v1) | no | high | Yes: rule requires running axe and fixing before finishing |
| 18 | What are the repeated generic-layout defaults in agent output and how are they overridden (named font, tokens, layout brief)? | Sameness damages positioning; evidence anecdotal | [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website) | no | medium | Partial: grep for default Tailwind indigo, three-card grid, emoji icons; low confidence |
| 19 | When is a first-party accessibility overlay or widget acceptable (never as the compliance claim)? | FTC accessiBe $1M; 28% of suits hit widget users | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million) | no | medium | Yes: grep for overlay script domains; check copy for "fully compliant" claims |
| 20 | Which WCAG version and level must a product meet by jurisdiction and customer (ADA Title II, EAA, contracts)? | 2.1 AA in law; EN 301 549 v4.1.1 (WCAG 2.2 AA) published 2 Sep 2026, expected cited Nov 2026 | [ADA.gov](https://www.ada.gov/resources/2024-03-08-web-rule/) | no | high | Partial: rule pins target 2.2 AA (superset); dated facts in a reference file |
| 21 | Does keyboard use reach every action, with visible focus and no trap? | 58 `outline: none` lines in fleet; skip link on only 17.1% of pages | [WebAIM Million](https://webaim.org/projects/million/), [WCAG 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), fleet table above | partial | high | Yes: grep `outline: none` without `:focus-visible` replacement; Playwright tab-through |
| 22 | Does motion respect `prefers-reduced-motion`? | Fleet: 151 files with motion, 38 with the media query | [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), fleet table above | partial | medium | Yes: grep per file; fail motion files lacking the guard |
| 23 | Which framework defaults cut errors (Astro 9.0, Next.js 40.9, Vue 64.6 per page) and is that causal? | Choice of stack; correlational data | [WebAIM](https://webaim.org/projects/million/) | no | low | No: correlation, do not turn into a rule |
| 24 | What third-party embeds (captcha, video, ads, consent tools) cost in accessibility, and what is the wrapper pattern? | +7.7 and +9.4 errors per page | [WebAIM Million](https://webaim.org/projects/million/) | no | medium | Partial: audit scripts list; axe run on the embed page |
| 25 | Does the page pass automated checks and still fail (what must be manually tested)? | Automated tools find only part; WebAIM says so | [WebAIM Million](https://webaim.org/projects/million/) | no | high | Yes: rule demands a manual keyboard and screen-reader pass list in the PR template |
| 26 | What heading, landmark and skip-link structure is the minimum? | 41.8% skip heading levels; 7.5% no headings | [WebAIM Million](https://webaim.org/projects/million/) | partial (docs-quality has navigation) | medium | Yes: axe rules `heading-order`, `landmark-one-main`, `skip-link` |
| 27 | What is the plain-language limit for errors and confirmations that explain what went wrong and the next step? | Review objection; error-state guidance | [O'Reilly](https://www.oreilly.com/radar/?p=19843) | partial | medium | Partial: heuristic; reject messages with only a code or "Something went wrong" |
| 28 | When does CLI output count as an interface needing the same destructive-action and state rules (dry-run, confirm, exit codes)? | Hawaii-style failure transfers to CLI | [Wikipedia: 2018 Hawaii alert](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert) | partial (stream and exit-code contracts exist) | medium | Yes: test `--yes` gate and `--dry-run` on destructive commands |
| 29 | How old is the evidence and when must each dated fact be rechecked (decay rate)? | Click-to-cancel moved in 8 months; Baymard form stat from 2024 | [Gibson Dunn](https://gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/), [Baymard inline validation](https://baymard.com/blog/inline-form-validation), [Level Access EAA](https://www.levelaccess.com/blog/european-accessibility-act/) | no | high | Yes: every dated fact carries a date and a refresh interval; lint for missing dates |
| 30 | Do accessibility lawsuit counts say anything about which failures cost most? | Counts differ by method (5,114 vs 8,667) | [UsableNet](https://info.usablenet.com/2025-year-end-digital-accessibility-lawsuit-report-plain-text) | no | low | No: do not encode counts as rule thresholds |
| 31 | Which mistakes do review threads actually repeat on large front ends? | Sampled 1,800 review comments (6 repos): keyboard/focus is the top accessibility theme, 10.6% of comments; keyword counts only | review-comment sample, see "Review objections" ([primer/react](https://github.com/primer/react/pulls), [mui/material-ui](https://github.com/mui/material-ui/pulls)) | no | medium | Partial: sample exists (below); a deeper mining task should read comments, not keyword-match |
| 32 | How is a design-time review (no code) checked: which dark patterns and states appear in a flow screenshot? | Agents review flows, not only code | [deceptive.design types](https://www.deceptive.design/types) | no | low | Partial: checklist against 18 types |

## Dated facts

| Fact | Source | Source date |
|---|---|---|
| 95.9% home pages with detected failures; 56.1 errors per page; low contrast 83.9%, alt 53.1%, labels 51.0%, empty links 46.3%, empty buttons 30.6%, no lang 13.5% | [WebAIM](https://webaim.org/projects/million/) | data Feb 2026, page updated 30 Mar 2026 |
| 5,114 ADA digital lawsuits; 64% under $25M revenue | [UsableNet](https://info.usablenet.com/2025-year-end-digital-accessibility-lawsuit-report-plain-text) | data to 15 Dec 2025 |
| Click-to-cancel vacated July 2025; ANPRM announced 11 Mar 2026; comments due 13 Apr 2026 | [Gibson Dunn](https://gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/) | Feb 2026 with March update |
| NextMed pleads rule duties as section 5 | [Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses) | May 2026 |
| Amazon $2.5B: $1B penalty + $1.5B refunds | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-secures-historic-25-billion-settlement-against-amazon) | 25 Sep 2025 |
| Chegg $7.5M; Uber suit 21 Apr 2025, amended 15 Dec 2025; LA Fitness 20 Aug 2025 | [Goodwin](https://www.goodwinlaw.com/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life) | Feb 2026 |
| accessiBe $1M final order | [FTC](https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million) | 22 Apr 2025 |
| Google fined EUR 325M by CNIL (EUR 200M + EUR 125M), decision 1 Sep 2025 | [CNIL](https://www.cnil.fr/en/cookies-and-advertisements-inserted-between-emails-google-fined-325-million-euros-cnil) | 3 Sep 2025 |
| Shein EUR 150M, Conde Nast EUR 750k | [Lewis Silkin](https://www.lewissilkin.com/insights/2025/09/19/when-the-cookie-crumbles-lessons-from-the-cnil-102l64c) | Sep 2025 (Shein; Conde Nast Nov 2025 per search summary) |
| X fined EUR 120M under DSA | [Tech Policy Press](https://techpolicy.press/what-the-eus-x-decision-reveals-about-how-the-dsa-is-enforced) | Dec 2025 headline, decision text released Jan 2026 |
| DFA proposed 11 Nov 2026, fines up to 6% | [Euronews](https://www.euronews.com/2026/11/11/eu-targets-subscription-traps-addictive-design-and-hidden-fees-with-new-digital-rules) | 11 Nov 2026 |
| ADA Title II: WCAG 2.1 AA; 26 Apr 2027 (50,000+) and 26 Apr 2028 (smaller); interim final rule published in the Federal Register 20 Apr 2026 | [ADA.gov](https://www.ada.gov/resources/2024-03-08-web-rule/) | page header dated 8 Apr 2024 (original posting, later edited to describe the IFR); IFR 20 Apr 2026; final rule 24 Apr 2024 |
| EAA enforcement started 28 Jun 2025; EN 301 549 v4.1.1 (WCAG 2.2 AA) published 2 Sep 2026, expected cited Nov 2026 | [Level Access](https://www.levelaccess.com/blog/european-accessibility-act/) | undated page, copyright 2026, mentions 2 Sep 2026 |
| 41.8% pages skip heading levels; 7.5% no headings; 17.1% skip link (one in ten broken); 22% of ARIA menus (5.7% of pages) add barriers; ReCAPTCHA +7.7 and YouTube +9.4 errors | [WebAIM](https://webaim.org/projects/million/) | updated 30 Mar 2026 |
| Average checkout has 11.3 form fields (12.7 in 2019); 8 recommended; 84% of sites do not offer account creation at confirmation | [Baymard](https://baymard.com/blog/checkout-flow-average-form-fields) | 26 Jun 2024 |
| WCAG 2.4.7 Focus Visible is Level AA; 2.3.3 Animation from Interactions is Level AAA | [2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | WCAG 2.2 Understanding docs, accessed 27 Nov 2026 |
| Hawaii alert: sent 8:08, cancel 8:13 reached only phones not yet alerted, correction 8:45; live/test choice in one menu, second screen clicked through | [Wikipedia](https://en.wikipedia.org/wiki/2018_Hawaii_false_missile_alert) | event 13 Jan 2018; FCC report 30 Jan 2018 (secondary) |
| 70.22% mean cart abandonment (50 studies); extra costs 40% | [Baymard](https://baymard.com/lists/cart-abandonment-rate) | updated 28 Oct 2026 |
| 59% desktop checkouts mediocre or worse | [Baymard](https://baymard.com/blog/current-state-of-checkout-ux) | updated 3 Nov 2026 |
| 31% lack inline validation | [Baymard](https://baymard.com/blog/inline-form-validation) | 9 Jan 2024 |
| Revlon: Second Circuit reversal | [Torys](https://www.torys.com/en/our-latest-thinking/publications/2022/09/revlon-erroneous-payment-decision-reversed-on-appeal) | 8 Sep 2022 |
| deceptive.design names 18 pattern types; Hall of Shame newest entry 30 Jun 2026 | [types](https://www.deceptive.design/types), [hall](https://www.deceptive.design/hall-of-shame) | accessed 27 Nov 2026 |

## Contested

| Question | Side A | Side B |
|---|---|---|
| Does a click-to-cancel duty exist today? | No federal rule: vacated July 2025 ([Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses)) | Yes in effect: FTC enforces the same duties through ROSCA and section 5 ([Goodwin](https://www.goodwinlaw.com/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life)). Both are true; advise on the enforced duty, not the vacated rule |
| How many accessibility suits were filed in 2025? | 5,114 (UsableNet, [source](https://info.usablenet.com/2025-year-end-digital-accessibility-lawsuit-report-plain-text)) | Other counters publish higher federal totals (a Seyfarth figure of 8,667 could not be verified this pass); methods differ, so no single count is safe |
| Do accessibility instructions to an AI model help? | Few-shot instructions made output worse than naive; checker feedback helped ([arXiv](https://arxiv.org/html/2503.15885v1)) | AudioEye-sponsored piece says models fail even when told ([VentureBeat](https://venturebeat.com/ai/we-asked-five-ai-tools-to-build-accessible-websites-all-15-sites-failed)); seller bias, unopened |
| Does Article 25 DSA coordinate with consumer law? | Commission applied it to X in 2025 | Academic critique that it does not coordinate with the UCPD (search summary of a Cambridge paper, unopened) |
| Is a framework causal for fewer accessibility errors? | Astro 9.0 vs Vue 64.6 per page (WebAIM) | WebAIM itself warns library correlation is not cause; site mix differs |

## Limits of this scout

- DSA article 25 text, FCC Hawaii report, CPPA advisory text, PACE and CHI EA papers, and the Citibank interface cause were not read in primary form.
- Pull-request comments were sampled by keyword only (six repos, 1,800 comments); no design-review threads (Figma, forums) were mined.
- This pass could not run further web searches (session budget exhausted), so TikTok, Shein and Seyfarth claims were dropped; the FCC Hawaii report, the Citibank interface cause and EUR-Lex texts remain unread in primary form.
- No statistic here covers loading, error or empty states in agent code.

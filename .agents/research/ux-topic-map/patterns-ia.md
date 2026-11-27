---
title: UX patterns and information architecture - landscape scout
program: product (ux sub-program)
worker: scout ux-patterns-ia
date_researched: 2026-11-27
model: sonnet
sources_fetched: 30
---

# UX patterns and IA - landscape scout

## Method and limits

I fetched 30 pages and read them. Each claim below carries its URL. I ran no shell measurements, so there are no commands to list. Gaps, stated plainly:

- WebSearch budget was exhausted during the run, and WebFetch's domain safety check rate-limited baymard.com (filtering and sorting article), so Baymard filtering and sorting is NOT verified; only its inline-validation article is.
- Not read, so not cited as fact: Rosenfeld/Morville/Arango book, Adam Silver's book and site (his URLs 404), Tufte, Cleveland, Stephen Few (PDF unreadable), UI-patterns.com, Mobbin, the Material snackbar page (headings only), NN/g command-palette, autosave, offline, keyboard-shortcut pages (404). Candidates drawing on them are marked "unverified" and need a dive worker.
- European Accessibility Act: the Commission page I fetched gives no application date or exemptions. Not stated here.
- Most NN/g pages carry original publication dates from 2006 to 2024. Several were "last reviewed" in 2026, which shows upkeep but not re-measurement. Treat the underlying studies as dated.

## Candidate topics

Priority is for this project shape: developer-tool sites (Astro, MkDocs), a Vite GUI, CLIs, READMEs; agents edit code with no human in the loop.

| # | topic (question and flip condition) | why it matters | source (URL) | already-covered? | priority | could a rule or skill check it, and how |
|---|---|---|---|---|---|---|
| 1 | Skeleton, spinner or progress bar: which, given expected wait? Flips at 1 s, 2-10 s, 10 s, and for process tasks (upload/convert) | Agents default to spinners everywhere; wrong indicator reads as broken | https://www.nngroup.com/articles/skeleton-screens/ ; https://www.nngroup.com/articles/response-times-3-important-limits/ | no | high | Yes: grep for loading components; require a declared expected-wait class per async call and the matching indicator type. Frame-only skeletons flagged by review |
| 2 | Is the 0.1 / 1 / 10 s model still the budget, and what are modern equivalents (INP 200/500 ms)? | Gives numeric budgets an agent can test | https://www.nngroup.com/articles/response-times-3-important-limits/ ; https://web.dev/articles/inp | no | high | Yes: INP in Lighthouse/CrUX; the 1993 limits are a heuristic, not a CI gate |
| 3 | Validate on blur, on submit, or live? Flips on field type (password, character count) and on research | Most contested form default; sets every form an agent writes | https://design-system.service.gov.uk/patterns/validation/ ; https://baymard.com/blog/inline-form-validation ; https://www.nngroup.com/articles/errors-forms-design-guidelines/ | no | high | Partial: lint for `onChange` validators on non-meter fields and for premature errors on pristine fields; test that error clears on correction |
| 4 | Error summary plus inline error: what exactly must exist, and where does focus go? | Accessibility and recovery; precise, checkable spec | https://design-system.service.gov.uk/components/error-summary/ | no | high | Yes: DOM test: summary at top of main, focus moved, links target first field, text identical to inline, "Error:" title prefix |
| 5 | One question per page or grouped? Flips for expert repeat-use internal tools | Wizard vs single form decision | https://design-system.service.gov.uk/patterns/question-pages/ | no | medium | Partial: review heuristic: grouped forms need a stated research or repeat-use reason |
| 6 | Wizard or not? Flips on novice/infrequent vs expert/repeat, and need to move between steps | Setup flows in GUI and installers | https://www.nngroup.com/articles/wizards/ | no | medium | Partial: checklist: step map, resume, named buttons, back; presence checkable |
| 7 | Ask once: do not make users re-enter data (WCAG Redundant Entry) | Legal-level criterion that bites multi-step forms | https://www.w3.org/TR/WCAG22/ | no | medium | Partial: flag repeated input names across steps without prefill; manual review |
| 8 | Minimum target size 24x24 CSS px: where does an agent break it (icon buttons, dense tables, breadcrumbs)? | Boring, checkable, AA | https://www.w3.org/TR/WCAG22/ | no | high | Yes: axe / Playwright computed-size check of interactive elements |
| 9 | Status messages: role=status vs role=alert vs live regions for toasts, counts, progress | Toasts and async results are silent to screen readers if wrong | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | no | high | Yes: lint toast/result components for role; test that `alert` is not used for non-urgent content |
| 10 | Focus not obscured: sticky headers, cookie bars and toasts hiding focused controls | Sticky table headers and docs headers commonly hide focus | https://www.w3.org/TR/WCAG22/ | no | medium | Yes: keyboard-tab Playwright pass with element-from-point check |
| 11 | Confirm dialog or undo? Flips on reversibility and frequency of the action | Destructive actions in GUI and CLI `--yes` flows | https://www.nngroup.com/articles/confirmation-dialog/ | no | high | Partial: rule: destructive action has undo or a dialog with outcome-named buttons and no default Yes; grep for "Are you sure" and Yes/No |
| 12 | Empty state: what must it contain, and how not to show "no records" while still loading | Distinguishes loading, empty, error; agents conflate | https://www.nngroup.com/articles/empty-state-interface-design/ | no | high | Yes: component test: empty state only after settled fetch; has explanation and a primary action |
| 13 | Error state taxonomy: toast vs inline vs banner vs modal, by severity and who must act | A toast for an error is missed | https://www.nngroup.com/articles/indicators-validations-notifications/ ; https://www.nngroup.com/articles/error-message-guidelines/ | no | high | Partial: lint toast used for errors; message must state cause plus next step |
| 14 | Pagination, load more or infinite scroll? Flips on goal-directed vs browsing and on footer need | Lists, logs, package registries | https://www.nngroup.com/articles/infinite-scrolling-tips/ | no | medium | Partial: rule: lists users search or compare must paginate; check footer reachable |
| 15 | Table alignment and numerics: right-align quantities, tabular digits, never centre | Dense, checkable table spec | https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables | no | high | Yes: CSS lint for numeric columns: `text-align:right` and `font-variant-numeric: tabular-nums` |
| 16 | Table density, sticky header, frozen first column, default sort | Registry/catalog tables in the fleet | same Pencil and Paper URL | no | medium | Partial: check for declared default sort and sticky header; row heights 40/48/56 are one vendor's convention, not a standard |
| 17 | Tables on mobile: scroll with frozen label, accordion, or reduced columns? | Responsive tables break on narrow screens | https://www.nngroup.com/articles/mobile-tables/ | no | medium | Yes: viewport screenshot at 360 px: no horizontal page scroll; scroll hint present |
| 18 | Which chart types and colour use for dashboards? Avoid pie, gauge, 3D; colour not for magnitude | Agents generate pies and gauges by default | https://www.nngroup.com/articles/dashboards-preattentive/ | no | medium | Partial: lint chart type; colour contrast and non-colour cue test. Overlaps the `dataviz` skill |
| 19 | Operational vs analytical dashboard: which question per dashboard | Scope of a dashboard changes what it shows | https://www.nngroup.com/articles/dashboards-preattentive/ | no | low | No: review heuristic |
| 20 | Hamburger or visible navigation? Flips at four top-level links on mobile and on desktop | Docs and site shells | https://www.nngroup.com/articles/hamburger-menus/ | partial (docs-quality covers navigation) | medium | Yes: viewport test: desktop has visible top-level links; mobile count threshold |
| 21 | Menu depth: one tier dropdown, mega menu for 2-3 tiers, never multilevel cascades | Docs sidebar and site menus | https://www.nngroup.com/articles/menu-design/ ; https://www.nngroup.com/articles/mega-menus-work-well/ | partial | medium | Partial: count nav depth from config; hover delays (0.5 s open, 0.5 s close) are from a 2017 article |
| 22 | Breadcrumbs: when to skip (flat sites), canonical path, current page unlinked | Docs sites | https://www.nngroup.com/articles/breadcrumbs/ | partial | low | Yes: structural check; skip when depth under 3 |
| 23 | Information scent: link labels and "Learn more" | Label quality drives clicks; checkable by text | https://www.nngroup.com/articles/information-scent/ | partial | medium | Yes: grep for "click here", "more", "learn more" as sole link text |
| 24 | Search vs navigation: when does search replace browsing, and how should facets work? | Docs search, registry search | https://www.nngroup.com/articles/search-not-enough/ ; https://www.nngroup.com/articles/filter-categories-values/ | no | medium | No: needs search-log review; zero-results behaviour is testable |
| 25 | Combobox and autocomplete: required keyboard and ARIA contract | Command palettes, pickers, search boxes | https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ | no | high | Yes: axe plus keyboard tests per APG key table |
| 26 | Progressive disclosure: how many levels (two) and what goes first? | Settings pages, advanced options in GUI | https://www.nngroup.com/articles/progressive-disclosure/ | no | low | Partial: depth count; what is "important" needs usage data |
| 27 | Command palette and keyboard shortcuts: when to add, discoverability, conflicts | Dev-tool GUIs expect them | unverified: NN/g and other pages 404 or not fetched | no | medium | Partial: shortcut registry has conflicts and a visible list; needs dive worker |
| 28 | Autosave, optimistic update, offline and partial-failure states | Highest-risk state handling; rollback on failure | unverified: NN/g autosave and offline pages 404 | no | high | Partial: test that an optimistic UI reverts and tells the user on failure; needs dive worker |
| 29 | Notification design: badge, toast, banner, modal; persistence and timeout | Timed toasts can violate WCAG 2.2.1 | https://www.nngroup.com/articles/indicators-validations-notifications/ ; https://www.w3.org/TR/WCAG22/ | no | medium | Partial: toast with action must not auto-dismiss quickly; Material duration rules unverified |
| 30 | Does the interface obey the ten heuristics, and how often are they themselves re-measured? | Basis for any `ux-review` skill; heuristics date from 1994 | https://www.nngroup.com/articles/ten-usability-heuristics/ | no | medium | No: review rubric only, not machine-checkable |
| 31 | Accessible authentication: no cognitive-function test (password recall, puzzles) at AA | Login flows, CAPTCHA in tools | https://www.w3.org/TR/WCAG22/ | no | medium | Partial: flag CAPTCHA and paste-blocked password fields |
| 32 | Accessibility of the pattern itself: does the legal duty apply (EAA, dates, scope)? | Legal exposure of sites selling services | https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en | no | medium | No: source gave no application date; fetch the Directive text in a dive |
| 33 | Decay: which of these numbers and findings are older than ten years and unreplicated? | Agents obey stale numbers as law | pages above: 1993 response limits, 2006 progressive disclosure, 2014 search, 2016 hamburger | no | high | Yes: each rule carries source date; a refresh lint can flag entries older than a threshold |
| 34 | Which CLI patterns map (progress, confirm, empty, error) and which need their own set? | Fleet is CLI-first; guidance above is GUI-first | none fetched | partial (CLI stream/exit-code covered in language sets) | medium | Partial: needs dive |

## Dated facts

| Fact | Source | Date the source states |
|---|---|---|
| Response limits 0.1 s instant, 1 s keeps flow, 10 s attention limit; progress bar beyond 10 s | https://www.nngroup.com/articles/response-times-3-important-limits/ | 1993 original, 2014 update |
| Skeleton screens: under 10 s page loads; none under 1 s; progress bar over 10 s with time estimate; avoid frame-only skeletons | https://www.nngroup.com/articles/skeleton-screens/ | published 2023-06-04, reviewed 2026-09-02 |
| INP good at most 200 ms, poor over 500 ms (75th percentile) | https://web.dev/articles/inp | updated 2025-09-02 |
| WCAG 2.2 is a W3C Recommendation; 2.5.8 target at least 24x24 CSS px (AA); 3.3.7 Redundant Entry (A); 3.3.8 Accessible Authentication (AA); 2.4.11 Focus Not Obscured (AA); 4.1.3 Status Messages (AA) | https://www.w3.org/TR/WCAG22/ | 2024-12-12 |
| Status messages: role=status for results and progress; role=alert only when focus does not move | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | updated 2026-10-04 |
| GOV.UK: error summary above h1, focus moved (JS auto, clarified Feb 2025), heading "There is a problem", "Error:" in title | https://design-system.service.gov.uk/components/error-summary/ | page cites February 2025 |
| GOV.UK: validate on submit by default; not on leaving a field; server-side always | https://design-system.service.gov.uk/patterns/validation/ | no date stated |
| Baymard: 31% of benchmark sites lack inline validation; validate on blur, clear errors on correction, show positive validation | https://baymard.com/blog/inline-form-validation | 2024-01-09 |
| Hidden navigation: desktop use 27% vs 48% visible; 39% longer tasks on desktop; show links when four or fewer on mobile (179 participants, 6 sites) | https://www.nngroup.com/articles/hamburger-menus/ | 2016-06-26 |
| Mega menu hover: 0.5 s open delay, 0.5 s close | https://www.nngroup.com/articles/mega-menus-work-well/ | 2017-03-26 |
| Menu tiers: one tier dropdown, mega menu 2-3 tiers | https://www.nngroup.com/articles/menu-design/ | 2024-06-07 |
| Table row heights 40/48/56 px; right-align quantities | https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables | 2026-02-23 |
| Infinite scroll suits flat browsing; avoid for find/compare | https://www.nngroup.com/articles/infinite-scrolling-tips/ | 2022-09-04 |
| Breadcrumbs: skip on one-two level sites; one canonical path | https://www.nngroup.com/articles/breadcrumbs/ | 2018-12-23, reviewed 2026-09-01 |
| Confirmation: use for serious or irreversible; prefer undo; name outcomes on buttons | https://www.nngroup.com/articles/confirmation-dialog/ | 2018-02-18, reviewed 2026-08-07 |
| Empty states: do not show "no records" while loading | https://www.nngroup.com/articles/empty-state-interface-design/ | 2021-09-19 |
| Progressive disclosure: two levels work well | https://www.nngroup.com/articles/progressive-disclosure/ | 2006-12-03 |
| Mobile tables: headers sticky, left column locked, signal horizontal scroll | https://www.nngroup.com/articles/mobile-tables/ | 2017-09-17 |

## Contested

| Question | Side A | Side B |
|---|---|---|
| Inline validation | GOV.UK: validate on submit; do not validate when leaving a field; inline only if research proves it helps. https://design-system.service.gov.uk/patterns/validation/ | Baymard: inline validation on blur with positive confirmation improves forms; 31% of sites lack it. https://baymard.com/blog/inline-form-validation . NN/g validates on field exit, live for passwords. https://www.nngroup.com/articles/errors-forms-design-guidelines/ |
| Validation summary | GOV.UK: always show summary plus inline errors. https://design-system.service.gov.uk/components/error-summary/ | NN/g: do not rely on a summary alone, use inline. https://www.nngroup.com/articles/errors-forms-design-guidelines/ (compatible if both present; contested only for summary-only designs) |
| One question per page | GOV.UK: start with one; group only on research evidence for repeat-use experts. https://design-system.service.gov.uk/patterns/question-pages/ | NN/g: wizards cost clicks and block comparison; unsuited if steps interdepend. https://www.nngroup.com/articles/wizards/ |
| Hidden navigation on mobile | NN/g 2016: hidden nav hurts metrics, show links when four or fewer. https://www.nngroup.com/articles/hamburger-menus/ | Not contradicted by a fetched source. The article itself says hiding more than four is a reasonable tradeoff. Study is 2016; recheck needed |
| Infinite scroll vs pagination | NN/g: infinite for browsing. https://www.nngroup.com/articles/infinite-scrolling-tips/ | Same article: avoid for finding and comparing; says no option is best for all sites |
| Confirm vs undo | NN/g: prefer undo, confirm only for serious. https://www.nngroup.com/articles/confirmation-dialog/ | Not contradicted by a fetched source. Open for CLI, where undo is rarely possible |

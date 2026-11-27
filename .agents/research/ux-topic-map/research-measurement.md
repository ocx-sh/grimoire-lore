---
title: UX research and measurement — landscape scout
program: product (sub-program ux)
worker: ux-research-measurement scout
date_researched: 2026-11-27
model: sonnet
sources_fetched: 33
---

# UX research and measurement: what an agent can plan, run, and interpret

Scope: how a team knows whether an interface works. This is a landscape scout.
It lists the questions an expert must be able to answer, not the answers. 33
pages were opened and read. Claims that rest only on a search result (not an
opened page) are marked "search-only" and must be re-fetched before any rule
cites them. Books (Sauro and Lewis, Kohavi, Torres, Portigal, Hall, Moesta,
Ulwick) were reached through the authors' own web pages, not the books.

## Summary

- An agent can do five things without users: heuristic review, automated
  accessibility and performance audits, log and funnel analysis, test-plan
  writing, and interview-guide review. It must not claim a usability finding, a
  preference, or a "users want" statement from any of them.
- The five-user rule is a discovery rule for one qualitative round, not a
  measurement rule. The author's own pages say so.
- Core Web Vitals field data (CrUX) and lab data (Lighthouse) answer different
  questions. A lab score never states what real users experience.
- Synthetic users and AI interviewers are, on the published evidence,
  hypothesis generators. NN/g's own tests found them shallow and over-agreeable.
- Session replay and analytics carry consent and masking obligations that
  differ by jurisdiction. A rule can check for the tool and for the masking
  setting; it cannot decide the legal basis.
- Small sites cannot run A/B tests that detect small effects. Advice for them is
  different advice.

## Method and measurements

Every external claim below has an inline URL. One local measurement was made.

Command (run from `/home/mherwig/dev`, bash):

```
for p in 'googletagmanager|gtag\(|google-analytics' 'plausible|umami|matomo|posthog|goatcounter|cloudflareinsights' 'clarity\.ms|hotjar|fullstory|logrocket|mouseflow' 'cookie.?consent|cookie-banner|cookiebanner'; do grep -rEli -e "$p" --include='*.astro' --include='*.html' --include='*.yml' --include='*.mjs' --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target --exclude-dir=dist --exclude-dir=.agents --exclude-dir=worktrees . ; done
```

Result: zero hits for Google Analytics, session replay vendors, and cookie
consent banners. The privacy-analytics pattern matched five files
(`grimoire-rs/vscode/src/test/extension.test.ts`,
`ocx-sh/ocx-mirror/tests/fixtures/mirror-push-retry-one.yml`,
`ocx-sh/catalog/test/config/load.test.ts`, `ocx-sh/catalog/src/config/load.ts`,
`ocx-sh/catalog/src/config/types.ts`); these are in test, fixture and config
code, not site templates, and were not opened, so they are probably false
positives. Reading: the fleet has no measured interface-feedback loop today.
Guidance on what to install is therefore more valuable than guidance on how to
tune an existing install. The grep covers only the listed extensions and
directory exclusions; it does not prove absence in other file types.

## Candidate topics

Priority is for this project shape: open-source developer tools, Astro and
MkDocs sites, one Vite GUI, CLIs, READMEs; agents working without a human in
the loop; low traffic.

| # | topic | why it matters | source (URL) | already-covered? | priority | could a rule or skill check it, and how |
|---|---|---|---|---|---|---|
| 1 | When may an agent write "users found X hard"? | Agents invent user findings from a screenshot or a code read. A finding needs observed behaviour. | https://www.nngroup.com/articles/synthetic-users/ (do not present synthetic findings as real-user findings) | no | high | Yes. Lint on report text: a finding sentence must cite a session, log query or test run id, else carry the label "hypothesis". |
| 2 | Is five users enough, and for what? | Teams stop after one round of five and claim coverage. Nielsen's formula assumes a 31% per-user detection rate; Sauro says released products are nearer 10% and need 18 users for 85%. | https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ ; https://measuringu.com/five-users/ | no | high | Partly. A plan checker can require: one round is not a coverage claim, report states the assumed problem frequency, planned rounds >= 2 or 3. |
| 3 | How many participants per method (usability, card sort, tree test, quantitative)? | Wrong n invalidates the method. NN/g: card sort 15+ qualitative, 30-50 quantitative; quantitative usability 20+; eyetracking 39. | https://www.nngroup.com/articles/how-many-test-users/ ; https://www.nngroup.com/articles/card-sorting-definition/ | no | high | Yes. Table of method to minimum n in the skill; plan lint compares n to the table. |
| 4 | Which method answers which question (generative vs evaluative)? | Card sort is generative; tree test is evaluative. Using card sort to validate navigation is a named error. | https://www.nngroup.com/articles/tree-testing/ ; https://www.nngroup.com/articles/ux-research-cheat-sheet/ | no | medium | Partly. Decision table keyed on research question; checker flags method/question mismatch in a plan. |
| 5 | How to write a task a participant can do without priming? | Task wording changes behaviour; naming the UI label gives away the answer. | https://www.nngroup.com/articles/usability-testing-101/ | no | high | Yes. Lint task text for UI labels from the product's own string table. |
| 6 | Which interview questions are leading, and what is the neutral form? | Leading questions produce false agreement. NN/g lists four traps with neutral rewrites. | https://www.nngroup.com/articles/leading-questions/ ; https://alistapart.com/article/interviewing-humans | no | high | Partly. Pattern checks (restates observation, names an element, assumes a feeling, yes/no opener) on an interview guide; an LLM judge is a second pass and needs a labelled sample. |
| 7 | Past behaviour or opinion: which question style yields usable evidence? | "Tell me about the last time" yields behaviour; "would you use" yields speculation. | https://www.producttalk.org/glossary-discovery-story-based-interviewing/ | no | high | Yes. Guide lint: flag "would you", "do you like", "how likely"; require a past-event stem. |
| 8 | What can a heuristic evaluation claim, and with how many evaluators? | Three to five independent evaluators; a violation is not always a problem; it cannot replace user research. An agent review is one evaluator. | https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ | no | high | Yes. Review template must label severity as predicted, name the heuristic, and state "single evaluator". |
| 9 | Which of the 10 heuristics apply to a CLI or terminal tool? | Heuristics were written for graphical UI; the fleet is mostly CLI. Stream and exit-code contracts are covered elsewhere; discoverability, error recovery and help text are not. | https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ (scope: interface heuristics) | partial | medium | Partly. Check `--help` for each subcommand, error messages for a next step; run against the binary. Needs a follow-up dive for CLI-specific sources. |
| 10 | Which questionnaire for which question (SUS, SEQ, UX-Lite, UMUX-Lite)? | Wrong instrument, or a wrong benchmark, gives a false grade. Historical SUS average 68; SEQ average 5.5; UX-Lite reference median 78.8 but general average near 71. | https://measuringu.com/get-comfortable-with-four-ux-metrics/ ; https://measuringu.com/sus/ | no | medium | Yes. Skill holds the instrument table; checker rejects a benchmark claim that omits the instrument and the sample size. |
| 11 | Is a SUS or SEQ number from n < 10 reportable? | Small samples give wide intervals. Sauro: SUS works with two users but needs a confidence interval. | https://measuringu.com/sus/ | no | medium | Yes. Report lint: any questionnaire mean must carry n and an interval. |
| 12 | Which HEART categories does this product need, and what are the signals? | HEART says not every category fits. Goals, signals and metrics must be written in that order, not metrics first. | https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/ (not opened; PDF unreadable); secondary: https://www.productplan.com/glossary/heart-framework (search-only) | no | medium | Partly. Template check: each metric traces to a signal and a goal. Source must be re-fetched in a dive. |
| 13 | Lab or field: which Core Web Vitals number may an agent cite? | Lighthouse output is one device and one network; field data is the distribution. Prioritise by field data. | https://web.dev/articles/lab-and-field-data-differences | no | high | Yes. CI step: fail a report that gives a CWV pass/fail from lab data only; label source as lab or field. |
| 14 | What are the current CWV thresholds and the pass rule? | LCP 2.5 s, INP 200 ms, CLS 0.1, judged at the 75th percentile, mobile and desktop separately. Decay risk: unsourced blogs claim 2.0 s and 150 ms. | https://web.dev/articles/vitals (updated 2024-10-31) ; https://web.dev/articles/inp (updated 2025-09-02) | no | high | Yes. Reference file pins thresholds with source and date; a test fetches the page and diffs the numbers. |
| 15 | Does the site have field data at all (CrUX eligibility)? | Small developer sites are often below the undisclosed popularity cutoff, so CrUX returns nothing and agents then guess. | https://developer.chrome.com/docs/crux/methodology | no | high | Yes. Query the CrUX API; "no data" must produce "unmeasured", not "passing". |
| 16 | What does CrUX exclude (iOS Chrome, other Chromium browsers, users without sync)? | Field data is a Chrome-desktop and Android sample, not all users. | https://developer.chrome.com/docs/crux/methodology | no | medium | Partly. Report template must state the coverage caveat. |
| 17 | Do Core Web Vitals pass guarantee search ranking? | Google says good vitals align with what ranking systems reward, not a guaranteed lift. Over-claiming drives wasted work. | https://developers.google.com/search/docs/appearance/core-web-vitals | no | medium | Yes. Lint "ranking boost" claims that lack a controlled before/after. |
| 18 | Can the site run an A/B test at all? | At a few hundred visits a day only large effects are detectable; halving the detectable effect roughly quadruples the sample. | https://www.kameleoon.com/blog/a-b-testing-traffic-volumes-for-reliable-results (search-only) ; https://portent.com/blog/cro/how-you-can-run-a-b-tests-on-low-traffic-sites.htm (search-only) | no | high | Yes. Power calculation from daily traffic and baseline rate; refuse to start a test whose minimum detectable effect exceeds a stated bound. |
| 19 | Is a sample ratio mismatch present? | SRM invalidates the result; Kohavi's book makes the check a mandatory guardrail. | https://www.cambridge.org/core/books/trustworthy-online-controlled-experiments/sample-ratio-mismatch-and-other-trustrelated-guardrail-metrics/8DBB0F59AC7729D7BC6B94690DB9CCD5 (search-only; page fetch failed) ; https://www.lukasvermeer.nl/publications/papers/2019/07/25/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments.html | no | medium | Yes. Chi-squared check on assignment counts before any result is read. Threshold must come from a dive. |
| 20 | Is a surprising win to be believed (Twyman's law, peeking)? | Kohavi material reports experiment success rates of roughly 8 to 33%; stopping at first significance raises false positives. | https://docs.google.com/document/d/1Web5OpU3Dh67ojFpbR6JF8xHRfgi3MYb/export?format=pdf (search-only) | no | medium | Partly. Plan must fix sample size and end date up front; flag a result report whose stop time differs from the plan. |
| 21 | Which analytics setup needs no consent banner? | UK ICO final guidance (2026-04-29): statistical-purposes exception is narrow, processor-only, aggregate, with a simple free way to object. EU position is stricter and unsettled for "cookieless" tools. | https://www.hunton.com/privacy-and-cybersecurity-law-blog/uk-ico-publishes-guidance-on-storage-and-access-technologies ; EDPB guidelines 2/2023 (search-only) | no | high | Partly. Checker can detect cookies, local storage, third-party transfer in the built site; the legal conclusion stays with a human. |
| 22 | How does cookieless analytics identify a visitor, and is it still tracking? | Plausible hashes IP, user agent, domain and a salt rotated every 24 hours; no cookies, no storage, no cross-site link. Whether that avoids consent depends on jurisdiction. | https://plausible.io/data-policy | no | medium | Yes. Reference file states the mechanism; site scan confirms no client storage is written. |
| 23 | When is session replay a legal exposure, and what masking is the default? | 1,853 US wiretap and pen-register cases from 2022-02-05 to 2025-03-25, 83% in California. Clarity masks inputs always and defaults to "Balanced". | https://www.loeb.com/en/insights/publications/2025/07/understanding-session-replay-legal-risks-and-how-to-mitigate-them ; https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking | no | high | Yes. Scan templates for replay vendors; require masking attributes on forms and consent gating before the script loads. |
| 24 | Is consent obtained before recording starts? | Consent given after recording began was held too late in one reported case; banners that gate scripts defeat claims. | https://www.loeb.com/en/insights/publications/2025/07/understanding-session-replay-legal-risks-and-how-to-mitigate-them ; Javier case via https://www.termly.io/resources/articles/california-wiretapping-claims-against-website-tracking/ (search-only) | no | medium | Yes. Static check: replay script tag is not in the initial HTML; it loads only after a consent event. |
| 25 | May an agent use synthetic users, and for what? | NN/g (2024-06-21): hypotheses and desk research only; synthetic users claimed to finish courses real users abandoned. Concept validation is "incredibly risky". | https://www.nngroup.com/articles/synthetic-users/ | no | high | Yes. Output labelling rule: any synthetic-persona output carries a banner and cannot feed a "validated" status. |
| 26 | Does synthetic output keep the long tail? | NN/g (2026-10-16): 604 humans produced 50+ labels, 120 synthetic respondents collapsed to about a dozen; 93% of synthetic product managers used UX terms against 44% of human ones. | https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/ | no | medium | Partly. Diversity check (distinct answers per respondent count) flags mode collapse; it cannot prove validity. |
| 27 | Do interview-grounded simulations beat persona prompts? | Summary of studies: interview-based twins scored 0.85 on General Social Survey items vs lower for demographic personas; magnitudes still differ from humans. | https://www.nngroup.com/articles/ai-simulations-studies/ | no | low | No. Informational; pin as a dated fact with the contested note. |
| 28 | May an AI interviewer run discovery interviews? | NN/g (2026-01-30): not for discovery or semistructured interviews; only 3 of 10 found the talk natural; sessions began without a consent introduction. | https://nngroup.com/articles/ai-interviewers/ | no | medium | Yes. Plan lint: AI-moderated sessions need a scripted consent intro and may not be the sole method for discovery. |
| 29 | How does an opportunity solution tree stay honest? | One outcome per tree; opportunities from interviews; assumption tests, not whole-solution tests. Trees invented without interviews are fiction. | https://www.producttalk.org/opportunity-solution-tree-origin/ | no | medium | Yes. Tree schema check: every opportunity cites at least one interview snapshot id. |
| 30 | What does a switch interview collect, and how many are enough? | Recruit people who switched in the last 30 to 90 days; walk the timeline; forces are inferred, not asked; patterns often appear within 5 to 8 interviews. | https://jobstobedone.org/switch-interview/ | no | medium | Partly. Guide lint for recruit window and timeline structure; the forces claim needs interview notes. |
| 31 | What can automated accessibility testing prove? | Deque's audit data: axe-core found 57.38% of issues by volume over 13,000+ pages; the common "20 to 30%" counts criteria, not issues. The rest needs manual and assistive-technology testing. | https://www.deque.com/automated-accessibility-coverage-report/ | partial (docs rules cover alt text only in passing) | high | Yes. Rule: an axe pass is reported as "automated checks pass", never "accessible"; a manual checklist gate remains. |
| 32 | Can an LLM audit replace manual WCAG checks? | 2024 to 2026 studies: LLM scripts catch issues rule engines miss, but with false positives, wrong criterion mapping and invented criteria. | https://link.springer.com/10.1007/s10209-024-01108-z (search-only) ; https://arxiv.org/html/2504.02110v1 (search-only) | no | medium | Partly. Verify each cited WCAG criterion id against the spec list; reject unknown ids. |
| 33 | Is the research artifact itself accessible (reports, prototypes, consent forms)? | Sounds boring, bites: a recruiting form or survey that fails WCAG excludes the participants most likely to find problems. | https://www.nngroup.com/articles/usability-testing-101/ (recruit realistic users) | no | low | Yes. Run axe on the survey and form pages before launch. |
| 34 | How fast does this advice decay? | NN/g pages carry "last reviewed" dates (usability testing 101: reviewed 2026-07-15; tree testing: 2026-08-19); platform thresholds change at most yearly for stable CWV metrics; synthetic-user evidence is two months old. | https://web.dev/articles/vitals ; https://www.nngroup.com/articles/usability-testing-101/ | no | medium | Yes. Each reference file carries a "verified on" date and a refresh interval; a check fails the file when the date is older than the interval. |
| 35 | When should a small team not research at all, and just observe the logs? | Analytics shows "what", usability shows "why"; for a tool with a handful of users, issue trackers and support threads are the cheapest evidence. | https://www.nngroup.com/articles/ux-research-cheat-sheet/ (Listen stage: analytics, search logs, usability-bug review) | no | medium | Yes. Agent task: mine the issue tracker and docs search logs; output cites issue numbers, not impressions. |
| 36 | How should an agent report confidence in a UX finding? | Without a scale the reader cannot tell a log fact from a guess. | https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ (violation vs problem) | no | high | Yes. Required field: evidence class (observed, logged, measured, predicted, simulated). |

## Dated facts

Only facts read on the cited page. The date is the one the source states.

| fact | source | date the source states |
|---|---|---|
| Nielsen: L = 31% average per-user problem share; 5 users find about 85%; recommended three rounds of 5; test more for distinct user groups (3 to 4 per group for two, 3 per group for three or more) | https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ | 2000-03-18 |
| Nielsen update: quantitative studies 20+ users; card sorting 15+ per group; eyetracking 39; 2 per study can fit agile work | https://www.nngroup.com/articles/how-many-test-users/ | 2012-06-03 |
| Sauro: for released products frequency is probably below 10%; 18 users to catch a 10% problem at 85%; 189 for a 1% problem | https://measuringu.com/five-users/ | 2010-03-08 |
| NN/g: qualitative usability study uses five participants; have participants read tasks aloud | https://www.nngroup.com/articles/usability-testing-101/ | published 2019-12-01, last reviewed 2026-07-15 |
| NN/g: heuristic evaluation by three to five independent evaluators; cannot replace user research | https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ | 2023-06-25 |
| NN/g: tree testing is evaluative, card sorting generative; metrics success, time, directness | https://www.nngroup.com/articles/tree-testing/ | published 2023-08-06, last reviewed 2026-08-19 |
| NN/g: qualitative card sort 15+, quantitative 30 to 50+; 30 to 50 cards; hybrid sorts generally not recommended | https://www.nngroup.com/articles/card-sorting-definition/ | 2024-02-02 |
| Core Web Vitals: LCP 2.5 s, INP 200 ms, CLS 0.1, at the 75th percentile, mobile and desktop segmented; INP replaced FID in 2024; stable metrics change at most once per year | https://web.dev/articles/vitals | updated 2024-10-31 |
| INP: good up to 200 ms, needs improvement up to 500 ms, poor above 500 ms; clicks, taps and key presses count, scroll and hover do not | https://web.dev/articles/inp | updated 2025-09-02 |
| CrUX eligibility: publicly discoverable and sufficiently popular (threshold undisclosed); Chrome on iOS, WebView apps and other Chromium browsers excluded; users need usage reporting and history sync | https://developer.chrome.com/docs/crux/methodology | no date stated |
| Lab vs field: field data reflects the full distribution; CrUX scores use 28 days of Chrome data; prioritise by field data | https://web.dev/articles/lab-and-field-data-differences | no date stated (author Philip Walton) |
| Google Search: good vitals are recommended and align with ranking systems; not stated as a guarantee | https://developers.google.com/search/docs/appearance/core-web-vitals | no date stated |
| SUS historical average 68 (about 500 studies); A above 80.3 | https://measuringu.com/sus/ | 2011-02-03 |
| Four recommended metrics: task completion, SEQ, task time, UX-Lite; SEQ historical mean 5.5; UX-Lite reference median 78.8, general average near 71; SUS average 68 | https://measuringu.com/get-comfortable-with-four-ux-metrics/ | 2025-05-06 |
| Synthetic users: use for hypotheses and desk research only; do not present as real-user findings | https://www.nngroup.com/articles/synthetic-users/ | 2024-06-21 |
| Synthetic vs human: 604 humans vs 120 synthetic respondents; 84% vs about 70% used UX terms; 50+ human labels vs about a dozen synthetic | https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/ | 2026-10-16 (synthetic data collected 2026-02) |
| Simulation studies: interview-based twins 0.85 on General Social Survey items; synthetic dog-food survey trends matched but magnitudes differed | https://www.nngroup.com/articles/ai-simulations-studies/ | 2025-08-15 |
| AI interviewers: 10 participants, two voice tools; 3 of 10 found it natural; recommended as a supplement, not for discovery | https://nngroup.com/articles/ai-interviewers/ | 2026-01-30 |
| Session replay: 1,853 wiretap and pen-register cases, 2022-02-05 to 2025-03-25, 83% in California; courts split on vendor-as-third-party | https://www.loeb.com/en/insights/publications/2025/07/understanding-session-replay-legal-risks-and-how-to-mitigate-them | 2025-07-17 |
| Clarity: default masking mode Balanced; inputs and dropdowns masked in every mode; masking changes are not retroactive | https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking | page updated 2025-12-05 |
| UK ICO final storage-and-access guidance published 2026-04-29; statistical-purposes exception is sole-purpose, aggregate, processor-only, needs a simple free objection route | https://www.hunton.com/privacy-and-cybersecurity-law-blog/uk-ico-publishes-guidance-on-storage-and-access-technologies | blog post 2026-05-05 |
| Plausible: daily-rotating salt hash of IP, user agent and domain; no cookies or local storage | https://plausible.io/data-policy | no date stated |
| Deque: axe-core found 57.38% of 294,958 issues across 13,000+ pages (WCAG 2.0/2.1 A and AA, first audits only) | https://www.deque.com/automated-accessibility-coverage-report/ | no date stated; copyright 2026 |
| NN/g interview facilitation mistakes: weak rapport, too few probes, note-taking while interviewing, observers interfering, leading | https://www.nngroup.com/articles/interview-facilitation-mistakes/ | 2021-06-06 |
| Leading questions: four traps with neutral rewrites | https://www.nngroup.com/articles/leading-questions/ | 2017-12-17 |
| Story-based interviews collect specific accounts of past behaviour | https://www.producttalk.org/glossary-discovery-story-based-interviewing/ | last updated 2026-10-11 |
| Opportunity solution tree: one outcome, opportunities from research, solutions, assumption tests | https://www.producttalk.org/opportunity-solution-tree-origin/ | 2016-08-10 |
| Switch interview: recruit switchers from the last 30 to 90 days; 45 to 90 minutes; patterns often within 5 to 8 interviews; four forces push, pull, anxiety, habit | https://jobstobedone.org/switch-interview/ | no date stated (copyright 2026) |
| NN/g method landscape: Discover, Explore, Test, Listen; analytics says what, testing says why | https://www.nngroup.com/articles/ux-research-cheat-sheet/ | 2017-02-12 |
| SRM taxonomy paper (four software companies) | https://www.lukasvermeer.nl/publications/papers/2019/07/25/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments.html | 2019-07-25 |

## Contested

1. How many users? Nielsen says five per round, iterated
   ([NN/g 2000](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)).
   Sauro says the 31% frequency overstates released products and recommends 15
   to 20 in total ([MeasuringU 2010](https://measuringu.com/five-users/)).
   Spool and Schroeder and Faulkner reported that five users found far fewer
   problems than a larger set (35% in Spool's study); both are search-only,
   via https://www.humanfactors.com/newsletters/enough_is_enough.html. The
   dispute is about assumed problem frequency, not the arithmetic. A rule should
   state the assumption, not pick a side.
2. Synthetic users. NN/g finds them shallow, over-agreeable, and collapsing to
   the mode ([2024](https://www.nngroup.com/articles/synthetic-users/),
   [2026](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/)).
   The same site's roundup reports interview-grounded twins matching human
   survey answers at the population level (r = 0.98) while individual accuracy
   stays at 0.66 to 0.85
   ([NN/g 2025](https://www.nngroup.com/articles/ai-simulations-studies/)). Both
   can be true: aggregate fidelity on survey items, poor fidelity on behaviour
   and the long tail. Vendors of synthetic users are not neutral sources.
3. AI moderation. NN/g advises against it for discovery
   ([2026](https://nngroup.com/articles/ai-interviewers/)). Search-only
   preprints report AI-led chat interviews as on-topic and specific as human
   ones (arXiv 2610.23149, not opened). Ipsos reports weaker rapport and
   improvisation but sells AI moderation. Evidence is small-sample and the
   preprint claim must be fetched before use.
4. Cookieless analytics and consent. The UK exception is narrow and
   purpose-limited
   ([Hunton on the ICO](https://www.hunton.com/privacy-and-cybersecurity-law-blog/uk-ico-publishes-guidance-on-storage-and-access-technologies)).
   Plausible argues its design stores nothing on the device
   ([policy](https://plausible.io/data-policy)). The EDPB's 2024 guidelines read
   Article 5(3) broadly to cover fingerprinting-like access, and a consultation
   reply asked the EDPB to say whether cookieless analytics needs a banner; no
   final position was found (search-only, EDPB 2/2023). Open question; a rule
   must not assert "no banner needed".
5. Session replay liability. Courts split on whether the vendor is a
   third-party eavesdropper or an extension of the site
   ([Loeb 2025](https://www.loeb.com/en/insights/publications/2025/07/understanding-session-replay-legal-risks-and-how-to-mitigate-them)).
   Law-firm summaries also report defendants gaining ground in some courts
   (Hogan Lovells, search-only). Treat as live litigation, not settled law.
6. CWV thresholds. Google's pages say LCP 2.5 s and INP 200 ms
   ([vitals](https://web.dev/articles/vitals), [INP](https://web.dev/articles/inp)).
   Several third-party blogs claim 2.0 s and 150 ms from a March 2026 update;
   a DEV Community guide disputes it; none was a Google page (search-only).
   Not adopted. This is the main decay trap: the pin file must name the Google
   page and the date.
7. How much automation finds. Deque: 57.38% of issues by volume (vendor
   data, [report](https://www.deque.com/automated-accessibility-coverage-report/));
   the older "20 to 30%" counts success criteria. Different denominators, not a
   disagreement about quality. Vendors on both sides (AudioEye, Deque) sell
   tools.
8. Question: is "Jobs to be done" one method? Moesta's switch interviews are
   qualitative and timeline-based
   ([jobstobedone.org](https://jobstobedone.org/switch-interview/)); Ulwick's
   Outcome-Driven Innovation is a quantitative scoring process (search-only,
   Intercom podcast pages). Attribution of the switch interview is itself
   disputed. A rule should name which one it means.

## Not reached

Sources named in the brief and not opened: the HEART paper (PDF text unreadable
to the fetch tool), the Cambridge Kohavi chapter (fetch failed), the CNIL
audience-measurement page (404), the ICO page itself (403), EDPB guidelines
2/2023 (PDF unreadable), Portigal's and Hall's books, Christensen and Ulwick
primary pages. Page-level confirmation of the Kohavi success-rate figures and
the SRM threshold is owed by a follow-up dive.

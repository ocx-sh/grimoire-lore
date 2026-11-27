# Commission: marketing-measurement / measure-metric-validity

Topic question: Given the fleet's stance of "measure without cookies or do not measure", what may a project measure, how is attribution tagged, and what may a report or a page claim from the numbers?

Question: What may a report, dashboard or page claim from stars, downloads, traffic, AI citations and A/B tests, which definition and window must travel with each number, and in what form may a count appear on a page?
This dive owns metric semantics and the page display rule for popularity counts. Fake stars and GitHub acceptable use belong to channels.
Starts from: analytics-attribution.md #18, #23-28 and #31; recent-shifts.md (citation windows; metric definition dates); practitioner.md #4-8; codified-law-policy.md #6; distribution-posture.md (ocx 20 stars, grimoire 17); docs-quality DOC-TYPE-15 (adoption claims need a source link) and DOC-OBS-08.
Investigate:
1. Evan Miller on sample size and peeking (5% becomes 26.1%); the Convert sample-size figure, labelled vendor data.
2. Download semantics from each registry's own docs: npm downloads API, PyPI (pypistats and the BigQuery dataset), crates.io. GitHub traffic API retention (14 days) and the stargazer API change the scout dates 2026-07.
3. AI-citation measurement: Ahrefs volatility and the Growth Unhinged method. Label vendor data.
4. Lean Analytics OMTM; how the PostHog handbook defines activation.
Measure, not cite:
- For ocx and grimoire: pull 14 days of GitHub traffic and the registry download counts.
- Show which share of downloads a CI-heavy package would see, from a registry that splits it, if any.
- Compute the sample size per variation for a 10% relative lift at the fleet's measured traffic.
- Record every command.
Use the evidence record from claims-evidence-record; you own the definition and window fields per metric. Do not invent a minimum count below which a number is hidden: no named source sets one.
The deliverable must decide: the definition and window per metric; which metrics may never be claimed as adoption; the page form for a count (live badge, or a dated number with its record); and when an A/B test is not worth running.

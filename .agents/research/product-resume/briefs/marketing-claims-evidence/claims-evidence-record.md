# Commission: marketing-claims-evidence / claims-evidence-record

Topic question: Which claims may product copy make, and what evidence record must exist on disk before each class of claim ships?

Question: Which words make a claim objective, and what evidence record must back a performance claim, a statistic, a count, a price or a limit before it ships?
Starts from: codified-law-policy.md #3 and #29; canonical-guides.md #17-18 and #33; practitioner.md #29, #33, #35; pricing-plg.md #1 (never invent prices, DECISION); messaging-inventory.md §2 and smell 2 (12 unquantified ocx claims, 0 with proof); exemplar-landing-pages.md pattern 6 (2 of 25 link a method: bun, uv); failure-corpus.md "unreproducible benchmark".
Start from this record schema and change a field only with a stated reason: claim, surface, class (performance | statistic | count | price-or-limit | comparison | licence | security | ai-capability | endorsement | maturity), value, unit, source, source_type (own-measurement | vendor-data | third-party-study | primary-law | platform-doc), method, observed, refresh_by, definition, window, subject_version. Other dives reuse it, so you own its storage and lint.
Investigate:
1. FTC Policy Statement Regarding Advertising Substantiation (1984), https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation, and the FTC Policy Statement on Deception (1983), https://www.ftc.gov/legal-library/browse/ftc-policy-statement-deception. Extract the reasonable-basis and establishment-claim tests, and the puffery line.
2. EU Directive 2005/29/EC Art. 6-7 on EUR-Lex, for the misleading-action test in the EU.
3. Benchmark method fields on the bun and uv benchmark pages, and the SPEC run and reporting rules (https://www.spec.org/). Record hardware, version, command, date and raw-data fields.
4. The fleet's only dated record: ocx-sh/website/site/src/components/landing-content.ts:3-18 and its test landing.test.ts. Decide whether that data-file pattern generalises.
Law protocol: fetch each provision from its primary URL; record fetch date, in-force date and provision number. Anything unconfirmed is written "unverified, omitted" and gets no rule row; every law row carries refresh_by = fetch + 6 months.
Measure, not cite:
- Re-run the messaging-inventory.md adjective grep and the codified-law-policy.md claim grep over ocx-sh/ and grimoire-rs/. Split product-surface lines from rule-text lines.
- Classify each product hit as objective, puffery or mechanism, by a rubric written before scoring. Record the command and the counts.
- Count number-bearing claims on headline surfaces that carry a source and a date beside them.
Ownership: DOC-PLAIN-12 keeps word choice, DOC-TYPE-15 keeps adoption-claim links, DOC-OBS-08 keeps docs metrics. Reference them; do not restate them.
The deliverable must decide: the objective-claim test as a word and pattern list; where the record lives (a data file beside the copy, or an inline comment); the required fields per class; the default refresh_by per class; that an agent never writes a price, limit, plan name or count with no record (block, not warn); and the grep the rule runs.

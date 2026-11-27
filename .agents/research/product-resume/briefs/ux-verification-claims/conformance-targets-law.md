# Commission: ux-verification-claims / conformance-targets-law

Topic question: What must an agent run on an interface change, and what may it claim afterwards about accessibility, performance and usability?

Investigate which conformance target the fleet and a typical software team must state, and which legal regimes bind them, from primary texts only.
Primary sources to fetch:
- WCAG 2.2 (https://www.w3.org/TR/WCAG22/) and the WCAG 3 status page (https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/);
- the ADA Title II rule (https://www.ada.gov/resources/2024-03-08-web-rule/);
- Directive (EU) 2019/882 through the Publications Office Cellar, which serves the Official Journal text without the EUR-Lex bot challenge: `curl -sL -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" https://publications.europa.eu/resource/celex/32019L0882` (HTTP 200 with Article 32 present when tested for this map on 2026-11-27; `Accept: application/pdf` returns the PDF). Read Articles 2, 4(5), 14 and 32 and Annex I;
- EN 301 549 on ETSI (https://www.etsi.org/deliver/etsi_en/301500_301599/301549/), and its harmonised-standard reference in the Official Journal, fetched by the same Cellar route once its CELEX number is found on the Commission's harmonised-standards pages;
- one national transposition in its official gazette, for example the German BFSG (locate the current path on gesetze-im-internet.de);
- the Section 508 standards (https://www.access-board.gov/ict/) and the W3C policy listings (https://www.w3.org/WAI/policies/).
Measure, do not cite: diff the EN 301 549 v3.2.1 and v4.1.1 clause lists for web, software and documentation, and count the added and changed clauses.
Start from M019 to M025 and scout rows RS1 to RS3, RS32, RS33, AX24 to AX28, CS25, CS26, PR34, FC19 and FC20.
The deliverable must decide:
- the target string the rule states (version and level);
- for each regime (ADA Title II, EAA, EN 301 549, Section 508): the date, who it binds, whether a free open-source developer tool is reached, and a re-check date;
- what a conformance statement may say;
- the overlay ban.
Hard limit: a legal date or scope not read in a primary text this session must not become a rule row. It goes only into the dated-facts table, marked UNVERIFIED, with the failed route and a re-check date.
